from fastapi import APIRouter, HTTPException, Query, Path
from typing import List
from datetime import datetime

from schema import QuestionCreate, QuestionStatusUpdate, QuestionResponse, QuestionAnswer
from utils import logger, supabase_client

router = APIRouter(tags=["qa"])

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
        is_approved=q_record.get("is_approved", False),
        answer_type=q_record.get("answer_type"),
        answer_content=q_record.get("answer_content"),
        answered_at=q_record.get("answered_at"),
        upvotes_count=q_record.get("upvotes_count", 0),
        created_at=q_record["created_at"],
        is_upvoted=is_upvoted
    )

@router.post("/questions", response_model=QuestionResponse)
async def create_question(request: QuestionCreate):
    logger.info(f"User {request.author_id} creates a question for paper {request.paper_id}")
    
    if request.attendee_type not in ["in-person", "virtual"]:
        raise HTTPException(status_code=400, detail="attendee_type must be 'in-person' or 'virtual'")

    try:
        # Check if paper and session link exist
        session_paper_res = supabase_client.table("session_papers").select("session_id").eq("paper_id", request.paper_id).execute()
        if not session_paper_res.data:
            raise HTTPException(status_code=400, detail="Paper is not assigned to any session")
        
        session_id = session_paper_res.data[0]["session_id"]
        
        # Check authorization: user must be chair OR have paid ticket for the session
        # 1. Check if chair
        session_res = supabase_client.table("sessions").select("chair_person_id").eq("session_id", session_id).single().execute()
        is_chair = session_res.data and session_res.data.get("chair_person_id") == request.author_id
        
        is_authorized = is_chair
        
        # 2. If not chair, check if the user has an attendance record for this session
        if not is_authorized:
            # First get all registration IDs for the user
            regs_res = supabase_client.table("registrations").select("registration_id").eq("user_id", request.author_id).execute()
            reg_ids = [r["registration_id"] for r in (regs_res.data or [])]
            
            if reg_ids:
                # Check if any of these registration IDs are linked to the session in attendences table
                # Attendance records are only created upon successful payment confirmation.
                attendance_check = supabase_client.table("attendences") \
                    .select("at_id") \
                    .eq("session_id", session_id) \
                    .in_("registration_id", reg_ids) \
                    .execute()
                if attendance_check.data:
                    is_authorized = True

        if not is_authorized:
            raise HTTPException(status_code=403, detail="Forbidden: You haven't purchased a ticket for this session or are not the chair.")
            
        new_question_data = {
            "session_id": session_id,
            "paper_id": request.paper_id,
            "author_id": request.author_id,
            "content": request.content.strip(),
            "attendee_type": request.attendee_type,
            "status": "asking",
            "is_approved": False,
            "upvotes_count": 0
        }
        
        create_res = supabase_client.table("questions").insert(new_question_data).execute()
        
        if not create_res.data:
            raise HTTPException(status_code=500, detail="Failed to create question")
            
        inserted_q = create_res.data[0]
        
        # Fetch author name
        profile_res = supabase_client.table("profiles").select("full_name").eq("user_id", request.author_id).single().execute()
        author_name = profile_res.data["full_name"] if profile_res.data else None
        
        return format_question_response(inserted_q, author_name)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating question: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/sessions/{session_id}/questions", response_model=List[QuestionResponse])
async def get_session_questions(
    session_id: int, 
    user_id: int = Query(None, description="Current user ID for permission check")
):
    logger.info(f"Retrieving questions for session {session_id} by user {user_id}")
    try:
        # Check permissions: Admin/Secretariat/Chair vs Normal User
        is_admin_or_chair = False
        if user_id:
            # Check Chair
            sess = supabase_client.table("sessions").select("chair_person_id").eq("session_id", session_id).execute()
            if sess.data and sess.data[0].get("chair_person_id") == user_id:
                is_admin_or_chair = True
            else:
                # Check Admin / Secretariat
                # Get role ids case-insensitively
                roles_res = supabase_client.table("roles").select("role_id, role_name").execute()
                role_ids = [r["role_id"] for r in (roles_res.data or []) if r["role_name"].upper() in ["ADMIN", "SECRETARIAT"]]
                if role_ids:
                    user_roles_res = supabase_client.table("user_roles").select("role_id").eq("user_id", user_id).in_("role_id", role_ids).execute()
                    if user_roles_res.data:
                        is_admin_or_chair = True
        
        query = supabase_client.table("questions").select("*, author:author_id(full_name)").eq("session_id", session_id)
        
        # Only show approved questions for normal users
        if not is_admin_or_chair:
            query = query.eq("is_approved", True)
            
        res = query.order("upvotes_count", desc=True).order("created_at", desc=False).execute()
        
        # Get upvoted question IDs for this user
        upvoted_ids = set()
        if user_id:
            upvotes_res = supabase_client.table("question_upvotes").select("question_id").eq("user_id", user_id).execute()
            upvoted_ids = {u["question_id"] for u in (upvotes_res.data or [])}
        
        questions_list = []
        for q in res.data:
            author_name = None
            if q.get("author"):
                if isinstance(q["author"], dict):
                    author_name = q["author"].get("full_name")
                elif isinstance(q["author"], list) and len(q["author"]) > 0:
                    author_name = q["author"][0].get("full_name")
            
            is_upvoted = q["question_id"] in upvoted_ids
            questions_list.append(format_question_response(q, author_name, is_upvoted))
            
        return questions_list
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/conferences/{conf_id}/questions", response_model=List[QuestionResponse])
async def get_conference_questions(
    conf_id: int,
    user_id: int = Query(None, description="Current user ID for upvote status")
):
    logger.info(f"Retrieving all questions for conference {conf_id}")
    try:
        # Get all paper IDs for this conference to filter questions
        papers_res = supabase_client.table("papers").select("paper_id").eq("submitted_conf", conf_id).execute()
        paper_ids = [p["paper_id"] for p in (papers_res.data or [])]
        
        if not paper_ids:
            return []
            
        query = supabase_client.table("questions").select("*, author:author_id(full_name)").in_("paper_id", paper_ids)
        res = query.order("created_at", desc=True).execute()
        
        # Get upvoted question IDs for this user
        upvoted_ids = set()
        if user_id:
            upvotes_res = supabase_client.table("question_upvotes").select("question_id").eq("user_id", user_id).execute()
            upvoted_ids = {u["question_id"] for u in (upvotes_res.data or [])}
        
        questions_list = []
        for q in res.data:
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
        logger.error(f"Error retrieving conf questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
        
@router.get("/papers/{paper_id}/questions", response_model=List[QuestionResponse])
async def get_paper_questions(
    paper_id: int,
    user_id: int = Query(None, description="Current user ID for upvote status")
):
    logger.info(f"Retrieving all questions for paper {paper_id}")
    try:
        query = supabase_client.table("questions").select("*, author:author_id(full_name)").eq("paper_id", paper_id)
        res = query.order("upvotes_count", desc=True).execute()
        
        # Get upvoted question IDs for this user
        upvoted_ids = set()
        if user_id:
            upvotes_res = supabase_client.table("question_upvotes").select("question_id").eq("user_id", user_id).execute()
            upvoted_ids = {u["question_id"] for u in (upvotes_res.data or [])}
        
        questions_list = []
        for q in res.data:
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
        logger.error(f"Error retrieving paper questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/questions/{id}/upvote")
async def upvote_question(
    id: int = Path(..., description="ID of the question"),
    user_id: int = Query(..., description="ID of the user upvoting")
):
    logger.info(f"User {user_id} upvoting question {id}")
    try:
        q_res = supabase_client.table("questions").select("question_id, upvotes_count").eq("question_id", id).single().execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        try:
            upvote_res = supabase_client.table("question_upvotes").insert({
                "question_id": id,
                "user_id": user_id
            }).execute()
        except Exception as e:
            err_msg = str(e).lower()
            if "duplicate key" in err_msg or "23505" in err_msg or "unique" in err_msg:
                raise HTTPException(status_code=409, detail="User already upvoted this question")
            raise Exception(f"Database error: {err_msg}")
            
        if hasattr(upvote_res, 'error') and upvote_res.error:
            if upvote_res.error.code == '23505':
                raise HTTPException(status_code=409, detail="User already upvoted this question")
            raise Exception(upvote_res.error.message)
            
        new_count = q_res.data.get("upvotes_count", 0) + 1
        supabase_client.table("questions").update({"upvotes_count": new_count}).eq("question_id", id).execute()
        
        return {"status": "success", "message": "Upvote added", "upvotes_count": new_count}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        err_str = str(e).lower()
        if "duplicate key" in err_str or "unique" in err_str:
             raise HTTPException(status_code=409, detail="User already upvoted this question")
        logger.error(f"Error upvoting question: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/questions/{id}/upvote")
async def remove_upvote_question(
    id: int = Path(..., description="ID of the question"),
    user_id: int = Query(..., description="ID of the user removing their upvote")
):
    logger.info(f"User {user_id} removing upvote from question {id}")
    try:
        q_res = supabase_client.table("questions").select("question_id, upvotes_count").eq("question_id", id).single().execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        del_res = supabase_client.table("question_upvotes").delete().eq("question_id", id).eq("user_id", user_id).execute()
        
        if not del_res.data:
            raise HTTPException(status_code=404, detail="Upvote not found for this user/question")
            
        current_count = q_res.data.get("upvotes_count", 0)
        new_count = max(0, current_count - 1)
        
        supabase_client.table("questions").update({"upvotes_count": new_count}).eq("question_id", id).execute()
        
        return {"status": "success", "message": "Upvote removed", "upvotes_count": new_count}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error removing upvote: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/questions/{id}/status", response_model=QuestionResponse)
async def update_question_status(
    id: int = Path(...),
    status_update: QuestionStatusUpdate = ...
):
    if status_update.status not in ["asking", "answering", "done"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    try:
        update_res = supabase_client.table("questions").update({"status": status_update.status}).eq("question_id", id).execute()
        if not update_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
        q = update_res.data[0]
        return format_question_response(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/questions/{id}/approve", response_model=QuestionResponse)
async def approve_question(
    id: int = Path(..., description="Question ID"),
    user_id: int = Query(..., description="User ID of the updater")
):
    logger.info(f"User {user_id} approving question {id}")
    try:
        # Check permissions case-insensitively
        roles_res = supabase_client.table("roles").select("role_id, role_name").execute()
        all_roles = roles_res.data or []
        role_ids = [r["role_id"] for r in all_roles if r["role_name"].upper() in ["ADMIN", "SECRETARIAT"]]
        
        logger.info(f"All roles in DB: {all_roles}")
        logger.info(f"Target role_ids: {role_ids}")
        
        user_roles_res = []
        if role_ids:
            user_roles_res = supabase_client.table("user_roles").select("role_id").eq("user_id", user_id).in_("role_id", role_ids).execute()
        
        logger.info(f"User {user_id} roles found: {user_roles_res.data if user_roles_res else 'None'}")
        
        if not role_ids or not (user_roles_res and user_roles_res.data):
             raise HTTPException(status_code=403, detail="Forbidden: Only Admin or Secretariat can approve questions")
            
        update_res = supabase_client.table("questions").update({"is_approved": True}).eq("question_id", id).execute()
        if not update_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return format_question_response(update_res.data[0])
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/questions/{id}/answer", response_model=QuestionResponse)
async def answer_question(
    id: int = Path(..., description="Question ID"),
    payload: QuestionAnswer = ...
):
    logger.info(f"User {payload.user_id} answering question {id}")
    try:
        # Get question info
        q_res = supabase_client.table("questions").select("session_id, paper_id").eq("question_id", id).single().execute()
        if not q_res.data:
             raise HTTPException(status_code=404, detail="Question not found")
             
        paper_id = q_res.data["paper_id"]
        session_id = q_res.data["session_id"]
        
        # Check authorization (Must be primary author)
        paper_res = supabase_client.table("papers").select("primary_author_id, submitted_conf").eq("paper_id", paper_id).single().execute()
        if not paper_res.data or paper_res.data["primary_author_id"] != payload.user_id:
            raise HTTPException(status_code=403, detail="Forbidden: Only the primary author of the paper can answer")
        
        conf_id = paper_res.data.get("submitted_conf")
            
        # Check timeframe constraint
        # Get session start time
        sess_res = supabase_client.table("sessions").select("start_time").eq("session_id", session_id).single().execute()
        if not sess_res.data:
             raise HTTPException(status_code=404, detail="Session not found")
             
        start_time_str = sess_res.data.get("start_time")
        
        conf_res = supabase_client.table("conferences").select("end_date").eq("conf_id", conf_id).single().execute()
        end_date_str = conf_res.data.get("end_date") if conf_res.data else None
        
        # Datetime logic check
        now = datetime.now()
        # Note: timezone adjustments may be needed based on system config, keeping it simple
        # Assuming UTC strings from DB
        try:
            # We allow answering before session starts for convenience
            # if start_time_str:
            #     tz_start = datetime.fromisoformat(start_time_str.replace("Z", "+00:00")).replace(tzinfo=None)
            #     if now < tz_start:
            #        raise HTTPException(status_code=400, detail="Cannot answer before the session starts")
            
            if end_date_str:
                # end_date is just DATE format "YYYY-MM-DD"
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
                # the day closes at 23:59:59
                if now.date() > end_date.date():
                   raise HTTPException(status_code=400, detail="Cannot answer after the conference ends")
        except ValueError as ve:
             logger.warning(f"Time parsing error ignored: {ve}")
             # Or pass timeframe validation if times are not set
             pass

        if payload.answer_type not in ["direct", "written"]:
            raise HTTPException(status_code=400, detail="Invalid answer_type")
            
        update_data = {
            "answer_type": payload.answer_type,
            "answer_content": payload.answer_content if payload.answer_type == "written" else None,
            "status": "done" if payload.answer_type == "written" else "answering",
            "answered_at": datetime.now().isoformat()
        }
        
        update_res = supabase_client.table("questions").update(update_data).eq("question_id", id).execute()
        
        return format_question_response(update_res.data[0])
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
