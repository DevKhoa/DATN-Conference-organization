from fastapi import APIRouter, HTTPException, Query, Path
from typing import List

from schema import QuestionCreate, QuestionStatusUpdate, QuestionResponse
from utils import logger, supabase_client

router = APIRouter(tags=["qa"])

@router.post("/questions", response_model=QuestionResponse)
async def create_question(request: QuestionCreate):
    logger.info(f"Creating a new question for session {request.session_id} by user {request.author_id}")
    
    if request.attendee_type not in ["in-person", "virtual"]:
        raise HTTPException(status_code=400, detail="attendee_type must be 'in-person' or 'virtual'")

    try:
        # Check if session exists
        session_res = supabase_client.table("sessions").select("session_id").eq("session_id", request.session_id).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if user exists
        user_res = supabase_client.table("profiles").select("user_id").eq("user_id", request.author_id).single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        new_question_data = {
            "session_id": request.session_id,
            "author_id": request.author_id,
            "content": request.content.strip(),
            "attendee_type": request.attendee_type,
            "status": "asking",
            "upvotes_count": 0
        }
        
        create_res = supabase_client.table("questions").insert(new_question_data).execute()
        
        if not create_res.data:
            raise HTTPException(status_code=500, detail="Failed to create question")
            
        inserted_q = create_res.data[0]
        
        # Fetch author name for response
        profile_res = supabase_client.table("profiles").select("full_name").eq("user_id", request.author_id).single().execute()
        author_name = profile_res.data["full_name"] if profile_res.data else None
        
        return QuestionResponse(
            question_id=inserted_q["question_id"],
            session_id=inserted_q["session_id"],
            author_id=inserted_q["author_id"],
            author_name=author_name,
            content=inserted_q["content"],
            attendee_type=inserted_q["attendee_type"],
            status=inserted_q["status"],
            upvotes_count=inserted_q["upvotes_count"],
            created_at=inserted_q["created_at"]
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating question: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/sessions/{session_id}/questions", response_model=List[QuestionResponse])
async def get_session_questions(session_id: int):
    logger.info(f"Retrieving questions for session {session_id}")
    try:
        # Check if session exists
        session_res = supabase_client.table("sessions").select("session_id").eq("session_id", session_id).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Get questions
        # Note: Supabase supports embedding/joining like this:
        # questions(..., profiles:author_id(full_name))
        query = supabase_client.table("questions").select(
            "*, author:author_id(full_name)"
        ).eq("session_id", session_id).order("upvotes_count", desc=True).order("created_at", desc=False)
        
        res = query.execute()
        
        questions_list = []
        for q in res.data:
            author_name = None
            if q.get("author"):
                if isinstance(q["author"], dict):
                    author_name = q["author"].get("full_name")
                elif isinstance(q["author"], list) and len(q["author"]) > 0:
                    author_name = q["author"][0].get("full_name")
                    
            questions_list.append(QuestionResponse(
                question_id=q["question_id"],
                session_id=q["session_id"],
                author_id=q["author_id"],
                author_name=author_name,
                content=q["content"],
                attendee_type=q["attendee_type"],
                status=q["status"],
                upvotes_count=q["upvotes_count"],
                created_at=q["created_at"]
            ))
            
        return questions_list
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/questions/{id}/upvote")
async def upvote_question(
    id: int = Path(..., description="ID of the question"),
    user_id: int = Query(..., description="ID of the user upvoting")
):
    logger.info(f"User {user_id} upvoting question {id}")
    try:
        # Check if question exists
        q_res = supabase_client.table("questions").select("question_id, upvotes_count").eq("question_id", id).single().execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        # Insert into question_upvotes and catch conflict
        try:
            upvote_res = supabase_client.table("question_upvotes").insert({
                "question_id": id,
                "user_id": user_id
            }).execute()
        except Exception as e:
            err_msg = str(e)
            if "duplicate key value violates unique constraint" in err_msg or "23505" in err_msg or "UniqueViolation" in err_msg:
                raise HTTPException(status_code=409, detail="User already upvoted this question")
            # Supabase python client sometimes wraps error in response.data or res.error, let's also check structure
            raise Exception(f"Database error: {err_msg}")
        
        if hasattr(upvote_res, 'error') and upvote_res.error:
            if upvote_res.error.code == '23505':
                raise HTTPException(status_code=409, detail="User already upvoted this question")
            raise Exception(upvote_res.error.message)
            
        # Update upvote count in questions
        new_count = q_res.data["upvotes_count"] + 1
        update_res = supabase_client.table("questions").update({"upvotes_count": new_count}).eq("question_id", id).execute()
        
        if not update_res.data:
            # Revert the upvote insertion just in case
            supabase_client.table("question_upvotes").delete().eq("question_id", id).eq("user_id", user_id).execute()
            raise HTTPException(status_code=500, detail="Failed to update upvote count")
            
        return {"status": "success", "message": "Upvote added", "upvotes_count": new_count}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        # The python supabase client might return a dict with an 'code' field for errors when duplicate insert happens
        err_str = str(e).lower()
        if "duplicate key" in err_str or "unique constraint" in err_str or "uniqueness violation" in err_str:
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
        # Check if question exists
        q_res = supabase_client.table("questions").select("question_id, upvotes_count").eq("question_id", id).single().execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        # Delete upvote
        del_res = supabase_client.table("question_upvotes").delete().eq("question_id", id).eq("user_id", user_id).execute()
        
        # If no row deleted, maybe user hadn't upvoted
        if not del_res.data:
            raise HTTPException(status_code=404, detail="Upvote not found for this user and question")
            
        # Update count
        current_count = q_res.data["upvotes_count"]
        new_count = max(0, current_count - 1)
        
        update_res = supabase_client.table("questions").update({"upvotes_count": new_count}).eq("question_id", id).execute()
        
        return {"status": "success", "message": "Upvote removed", "upvotes_count": new_count}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error removing upvote: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/questions/{id}/status", response_model=QuestionResponse)
async def update_question_status(
    id: int = Path(..., description="ID of the question"),
    status_update: QuestionStatusUpdate = ...
):
    logger.info(f"Updating status for question {id} to {status_update.status}")
    
    if status_update.status not in ["asking", "answering", "done"]:
        raise HTTPException(status_code=400, detail="Invalid status value. Must be 'asking', 'answering', or 'done'.")
        
    try:
        # Since auth is handled on client/frontend side for chair privileges, 
        # we assume this endpoint is authorized correctly or would pass an auth token 
        # in a complete implementation.
        
        update_res = supabase_client.table("questions").update({"status": status_update.status}).eq("question_id", id).execute()
        
        if not update_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        q = update_res.data[0]
        
        # Fetch author name for full response
        profile_res = supabase_client.table("profiles").select("full_name").eq("user_id", q["author_id"]).single().execute()
        author_name = profile_res.data["full_name"] if profile_res.data else None
        
        return QuestionResponse(
            question_id=q["question_id"],
            session_id=q["session_id"],
            author_id=q["author_id"],
            author_name=author_name,
            content=q["content"],
            attendee_type=q["attendee_type"],
            status=q["status"],
            upvotes_count=q["upvotes_count"],
            created_at=q["created_at"]
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating question status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
