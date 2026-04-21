from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Optional
from datetime import datetime

from schema import QuestionCreate, QuestionStatusUpdate, QuestionResponse, QuestionAnswer
from utils import logger, supabase_client

router = APIRouter(tags=["qa"])

# --- HELPERS ---

def format_question_response(q_record, author_name=None, is_upvoted=False):
    return QuestionResponse(
        question_id=q_record["question_id"],
        session_id=q_record["session_id"],
        paper_id=q_record["paper_id"],
        author_id=q_record["author_id"],
        author_name=author_name,
        content=q_record["content"],
        attendee_type=q_record["attendee_type"],
        status=q_record["status"],
        answer_type=q_record.get("answer_type"),
        answer_content=q_record.get("answer_content"),
        answered_at=q_record.get("answered_at"),
        upvotes_count=q_record.get("upvotes_count", 0),
        created_at=q_record["created_at"],
        is_upvoted=is_upvoted
    )

async def _is_moderator(user_id: Optional[int]) -> bool:
    """Checks if the user has ADMIN or SECRETARIAT roles."""
    if not user_id:
        return False
    try:
        roles_res = supabase_client.table("roles").select("role_id, role_name").execute()
        admin_role_ids = [r["role_id"] for r in (roles_res.data or []) if r["role_name"].upper() in ["ADMIN", "SECRETARIAT"]]
        
        if admin_role_ids:
            user_roles_res = supabase_client.table("user_roles").select("role_id").eq("user_id", user_id).in_("role_id", admin_role_ids).execute()
            return bool(user_roles_res.data)
    except Exception as e:
        logger.error(f"Error checking moderator status: {e}")
    return False

def _can_view_question(q: dict, user_id: Optional[int], is_mod: bool, user_authored_paper_ids: set = None) -> bool:
    """Centralized visibility logic for questions."""
    status = q.get("status")
    author_id = q.get("author_id")
    paper_id = q.get("paper_id")
    
    # 1. Moderators see everything
    if is_mod:
        return True
    
    # 2. Original author of the QUESTION sees their own question regardless of status
    if user_id and author_id == user_id:
        return True
    
    # 3. Approved/Done questions are visible to everyone with access
    if status in ["approved", "done"]:
        return True
    
    # Paper authors used to see pending questions, but user explicitly asked to hide them.
    # So even if user_authored_paper_ids matches, we return False for pending/denied if not question author/mod.

    return False

# --- ROUTES ---

@router.post("/questions", response_model=QuestionResponse)
async def create_question(request: QuestionCreate):
    logger.info(f"User {request.author_id} creates a question for paper {request.paper_id}")
    
    if request.attendee_type not in ["in-person", "virtual"]:
        raise HTTPException(status_code=400, detail="Invalid attendance type. Please select either 'in-person' or 'virtual'.")

    try:
        session_paper_res = supabase_client.table("session_papers").select("session_id").eq("paper_id", request.paper_id).execute()
        if not session_paper_res.data:
            raise HTTPException(status_code=400, detail="This paper has not been assigned to any session yet.")
        
        session_id = session_paper_res.data[0]["session_id"]
        
        session_res = supabase_client.table("sessions").select("chair_person_id").eq("session_id", session_id).single().execute()
        is_chair = session_res.data and session_res.data.get("chair_person_id") == request.author_id
        
        is_authorized = is_chair
        
        if not is_authorized:
            regs_res = supabase_client.table("registrations").select("registration_id").eq("user_id", request.author_id).execute()
            reg_ids = [r["registration_id"] for r in (regs_res.data or [])]
            
            if reg_ids:
                attendance_check = supabase_client.table("attendences") \
                    .select("at_id") \
                    .eq("session_id", session_id) \
                    .in_("registration_id", reg_ids) \
                    .execute()
                if attendance_check.data:
                    is_authorized = True

        if not is_authorized:
            raise HTTPException(status_code=403, detail="Access denied. You must have a ticket for this session to ask questions.")
            
        new_question_data = {
            "session_id": session_id,
            "paper_id": request.paper_id,
            "author_id": request.author_id,
            "content": request.content.strip(),
            "attendee_type": request.attendee_type,
            "status": "pending",
            "upvotes_count": 0
        }
        
        create_res = supabase_client.table("questions").insert(new_question_data).execute()
        
        if not create_res.data:
            raise HTTPException(status_code=500, detail="We couldn't post your question. Please try again later.")
            
        inserted_q = create_res.data[0]
        
        profile_res = supabase_client.table("profiles").select("full_name").eq("user_id", request.author_id).single().execute()
        author_name = profile_res.data["full_name"] if profile_res.data else None
        
        return format_question_response(inserted_q, author_name)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating question: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again later.")

@router.get("/sessions/{session_id}/questions", response_model=List[QuestionResponse])
async def get_session_questions(
    session_id: int, 
    user_id: int = Query(..., description="Current user ID for permission check")
):
    logger.info(f"Retrieving questions for session {session_id} by user {user_id}")
    try:
        is_mod = await _is_moderator(user_id)
        
        # Paper authored check
        query_all = supabase_client.table("questions").select("paper_id").eq("session_id", session_id).execute()
        paper_ids = list(set([q["paper_id"] for q in (query_all.data or [])]))
        authored_paper_ids = set()
        if paper_ids:
            papers_res = supabase_client.table("papers").select("paper_id, primary_author_id").in_("paper_id", paper_ids).execute()
            authored_paper_ids = {p["paper_id"] for p in (papers_res.data or []) if p.get("primary_author_id") == user_id}
        
        # Get questions
        res = supabase_client.table("questions").select("*, author:author_id(full_name)").eq("session_id", session_id) \
            .order("upvotes_count", desc=True).order("created_at", desc=False).execute()
        
        upvoted_ids = set()
        if user_id:
            u_res = supabase_client.table("question_upvotes").select("question_id").eq("user_id", user_id).eq("is_upvoted", True).execute()
            upvoted_ids = {u["question_id"] for u in (u_res.data or [])}

        questions_list = []
        for q in (res.data or []):
            if _can_view_question(q, user_id, is_mod, authored_paper_ids):
                author_name = None
                if q.get("author"):
                    if isinstance(q["author"], dict):
                        author_name = q["author"].get("full_name")
                    elif isinstance(q["author"], list) and len(q["author"]) > 0:
                        author_name = q["author"][0].get("full_name")
                
                is_upvoted = q["question_id"] in upvoted_ids
                questions_list.append(format_question_response(q, author_name, is_upvoted))
            
        return questions_list
    except Exception as e:
        logger.error(f"Error in get_session_questions: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again later.")

@router.get("/conferences/{conf_id}/questions", response_model=List[QuestionResponse])
async def get_conference_questions(
    conf_id: int,
    user_id: int = Query(None, description="Current user ID for upvote status")
):
    try:
        is_mod = await _is_moderator(user_id)
        
        papers_res = supabase_client.table("papers").select("paper_id, primary_author_id").eq("submitted_conf", conf_id).execute()
        paper_ids = [p["paper_id"] for p in (papers_res.data or [])]
        authored_paper_ids = {p["paper_id"] for p in (papers_res.data or []) if p.get("primary_author_id") == user_id}
        
        if not paper_ids:
            return []
            
        res = supabase_client.table("questions").select("*, author:author_id(full_name)").in_("paper_id", paper_ids) \
            .order("created_at", desc=True).execute()
        
        upvoted_ids = set()
        if user_id:
            u_res = supabase_client.table("question_upvotes").select("question_id").eq("user_id", user_id).eq("is_upvoted", True).execute()
            upvoted_ids = {u["question_id"] for u in (u_res.data or [])}

        questions_list = []
        for q in (res.data or []):
            if _can_view_question(q, user_id, is_mod, authored_paper_ids):
                author_name = None
                if q.get("author"):
                    if isinstance(q["author"], dict):
                        author_name = q["author"].get("full_name")
                    elif isinstance(q["author"], list) and len(q["author"]) > 0:
                        author_name = q["author"][0].get("full_name")
                
                is_upvoted = q["question_id"] in upvoted_ids
                questions_list.append(format_question_response(q, author_name, is_upvoted))
            
        return questions_list
    except Exception as e:
        logger.error(f"Error in get_conference_questions: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again later.")

@router.get("/papers/{paper_id}/questions", response_model=List[QuestionResponse])
async def get_paper_questions(
    paper_id: int,
    user_id: int = Query(None, description="Current user ID for upvote status")
):
    try:
        is_mod = await _is_moderator(user_id)
        
        paper_res = supabase_client.table("papers").select("primary_author_id").eq("paper_id", paper_id).single().execute()
        is_paper_author = paper_res.data and paper_res.data.get("primary_author_id") == user_id
        authored_paper_ids = {paper_id} if is_paper_author else set()
        
        res = supabase_client.table("questions").select("*, author:author_id(full_name)").eq("paper_id", paper_id) \
            .order("upvotes_count", desc=True).execute()
        
        upvoted_ids = set()
        if user_id:
            u_res = supabase_client.table("question_upvotes").select("question_id").eq("user_id", user_id).eq("is_upvoted", True).execute()
            upvoted_ids = {u["question_id"] for u in (u_res.data or [])}

        questions_list = []
        for q in (res.data or []):
            if _can_view_question(q, user_id, is_mod, authored_paper_ids):
                author_name = None
                if q.get("author"):
                    if isinstance(q["author"], dict):
                        author_name = q["author"].get("full_name")
                    elif isinstance(q["author"], list) and len(q["author"]) > 0:
                        author_name = q["author"][0].get("full_name")
                
                is_upvoted = q["question_id"] in upvoted_ids
                questions_list.append(format_question_response(q, author_name, is_upvoted))
            
        return questions_list
    except Exception as e:
        logger.error(f"Error in get_paper_questions: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again later.")

@router.post("/questions/{id}/upvote")
async def upvote_question(
    id: int = Path(..., description="ID of the question"),
    user_id: int = Query(..., description="ID of the user upvoting")
):
    try:
        q_res = supabase_client.table("questions").select("question_id, upvotes_count, status").eq("question_id", id).single().execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="The requested question could not be found.")
            
        if q_res.data.get("status") not in ["approved", "done"]:
            raise HTTPException(status_code=400, detail="You can only upvote questions that have been approved or answered.")
            
        upvote_check = supabase_client.table("question_upvotes").select("upvote_id, is_upvoted").eq("question_id", id).eq("user_id", user_id).execute()
        
        if upvote_check.data:
            upvote_record = upvote_check.data[0]
            if upvote_record.get("is_upvoted"):
                raise HTTPException(status_code=409, detail="You have already upvoted this question.")
            else:
                supabase_client.table("question_upvotes").update({"is_upvoted": True}).eq("upvote_id", upvote_record["upvote_id"]).execute()
        else:
            supabase_client.table("question_upvotes").insert({
                "question_id": id,
                "user_id": user_id,
                "is_upvoted": True
            }).execute()

        count_res = supabase_client.table("question_upvotes").select("upvote_id").eq("question_id", id).eq("is_upvoted", True).execute()
        new_count = len(count_res.data) if count_res.data else 0
        
        supabase_client.table("questions").update({"upvotes_count": new_count}).eq("question_id", id).execute()
        return {"status": "success", "message": "Upvote added", "upvotes_count": new_count}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error upvoting: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again later.")

@router.delete("/questions/{id}/upvote")
async def remove_upvote_question(
    id: int = Path(...),
    user_id: int = Query(...)
):
    try:
        q_res = supabase_client.table("questions").select("question_id, status").eq("question_id", id).single().execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="The requested question could not be found.")
            
        if q_res.data.get("status") not in ["approved", "done"]:
            raise HTTPException(status_code=400, detail="You can only interact with questions that have been approved or answered.")
            
        upvote_check = supabase_client.table("question_upvotes").select("upvote_id, is_upvoted").eq("question_id", id).eq("user_id", user_id).execute()
        
        if not upvote_check.data or not upvote_check.data[0].get("is_upvoted"):
            raise HTTPException(status_code=404, detail="You haven't upvoted this question yet.")
            
        supabase_client.table("question_upvotes").update({"is_upvoted": False}).eq("upvote_id", upvote_check.data[0]["upvote_id"]).execute()
        
        count_res = supabase_client.table("question_upvotes").select("upvote_id").eq("question_id", id).eq("is_upvoted", True).execute()
        new_count = len(count_res.data) if count_res.data else 0
        
        supabase_client.table("questions").update({"upvotes_count": new_count}).eq("question_id", id).execute()
        return {"status": "success", "message": "Upvote removed", "upvotes_count": new_count}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error removing upvote: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong on our end. Please try again later.")

@router.patch("/questions/{id}/status", response_model=QuestionResponse)
async def update_question_status(
    id: int = Path(...),
    status_update: QuestionStatusUpdate = ...
):
    if status_update.status not in ["pending", "approved", "denied", "done"]:
        raise HTTPException(status_code=400, detail="The provided status is invalid.")
    try:
        update_res = supabase_client.table("questions").update({"status": status_update.status}).eq("question_id", id).execute()
        if not update_res.data:
            raise HTTPException(status_code=404, detail="The requested question could not be found.")
        return format_question_response(update_res.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update question status. Please try again later.")

@router.patch("/questions/{id}/approve", response_model=QuestionResponse)
async def approve_question(
    id: int = Path(...),
    user_id: int = Query(...)
):
    if not await _is_moderator(user_id):
         raise HTTPException(status_code=403, detail="Access denied. Only administrators or secretariat members can approve questions.")
            
    update_res = supabase_client.table("questions").update({"status": "approved"}).eq("question_id", id).execute()
    if not update_res.data:
        raise HTTPException(status_code=404, detail="The requested question could not be found.")
    return format_question_response(update_res.data[0])

@router.patch("/questions/{id}/reject", response_model=QuestionResponse)
async def reject_question(
    id: int = Path(...),
    user_id: int = Query(...)
):
    if not await _is_moderator(user_id):
         raise HTTPException(status_code=403, detail="Access denied. Only administrators or secretariat members can reject questions.")
            
    update_res = supabase_client.table("questions").update({"status": "denied"}).eq("question_id", id).execute()
    if not update_res.data:
        raise HTTPException(status_code=404, detail="The requested question could not be found.")
    return format_question_response(update_res.data[0])

@router.patch("/questions/{id}/answer", response_model=QuestionResponse)
async def answer_question(
    id: int = Path(...),
    payload: QuestionAnswer = ...
):
    try:
        q_res = supabase_client.table("questions").select("paper_id").eq("question_id", id).single().execute()
        if not q_res.data:
             raise HTTPException(status_code=404, detail="The requested question could not be found.")
             
        paper_id = q_res.data["paper_id"]
        paper_res = supabase_client.table("papers").select("primary_author_id").eq("paper_id", paper_id).single().execute()
        if not paper_res.data or paper_res.data["primary_author_id"] != payload.user_id:
            raise HTTPException(status_code=403, detail="Access denied. Only the primary author of the paper can provide an answer.")
        
        update_data = {
            "answer_type": payload.answer_type,
            "answer_content": payload.answer_content if payload.answer_type == "written" else None,
            "status": "done",
            "answered_at": datetime.now().isoformat()
        }
        update_res = supabase_client.table("questions").update(update_data).eq("question_id", id).execute()
        return format_question_response(update_res.data[0])
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error answering: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong while processing your answer. Please try again later.")
