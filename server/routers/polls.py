from fastapi import APIRouter, HTTPException, Path
from typing import List

from schema import PollCreate, PollResponse, PollOptionResponse, PollVoteRequest
from utils import logger, supabase_client

router = APIRouter(tags=["polls"])

@router.post("/polls", response_model=PollResponse)
async def create_poll(request: PollCreate):
    logger.info(f"Creating a new poll for session {request.session_id}")
    
    try:
        # Check if session exists
        session_res = supabase_client.table("sessions").select("session_id").eq("session_id", request.session_id).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Create poll
        poll_res = supabase_client.table("polls").insert({
            "session_id": request.session_id,
            "question": request.question,
            "is_active": True
        }).execute()
        
        if not poll_res.data:
            raise HTTPException(status_code=500, detail="Failed to create poll")
            
        poll_id = poll_res.data[0]["poll_id"]
        created_at = poll_res.data[0]["created_at"]
        
        # Insert options
        options_data = [{"poll_id": poll_id, "option_text": opt} for opt in request.options]
        options_res = supabase_client.table("poll_options").insert(options_data).execute()
        
        if not options_res.data:
            # Fallback text if options failed
            logger.error(f"Failed to create options for poll {poll_id}")
            raise HTTPException(status_code=500, detail="Failed to create poll options")
        
        mapped_options = [
            PollOptionResponse(
                option_id=opt["option_id"],
                option_text=opt["option_text"],
                votes_count=0
            ) for opt in options_res.data
        ]
        
        return PollResponse(
            poll_id=poll_id,
            session_id=request.session_id,
            question=request.question,
            is_active=True,
            created_at=created_at,
            options=mapped_options
        )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/sessions/{session_id}/polls", response_model=List[PollResponse])
async def get_session_polls(session_id: int):
    logger.info(f"Retrieving polls for session {session_id}")
    try:
        # Check if session exists (optional but good for 404 vs empty list)
        session_res = supabase_client.table("sessions").select("session_id").eq("session_id", session_id).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Fetch polls for the session
        polls_query = supabase_client.table("polls").select(
            "poll_id, session_id, question, is_active, created_at"
        ).eq("session_id", session_id).order("created_at", desc=False)
        polls_res = polls_query.execute()
        
        if not polls_res.data:
            return []
            
        poll_ids = [p["poll_id"] for p in polls_res.data]
        
        # Fetch options for all returned polls
        options_query = supabase_client.table("poll_options").select("*").in_("poll_id", poll_ids)
        options_res = options_query.execute()
        options = options_res.data or []
        
        # Fetch vote counts for all returned polls by grouping from poll_votes manually
        # OR count in python
        # Better: get all poll_votes for these options and count them
        option_ids = [opt["option_id"] for opt in options]
        
        votes = []
        if len(option_ids) > 0:
            votes_query = supabase_client.table("poll_votes").select("option_id").in_("option_id", option_ids)
            votes_res = votes_query.execute()
            votes = votes_res.data or []
            
        # Count votes per option
        vote_counts = {}
        for v in votes:
            oid = v["option_id"]
            vote_counts[oid] = vote_counts.get(oid, 0) + 1
            
        # Group options by poll_id
        options_by_poll = {}
        for opt in options:
            pid = opt["poll_id"]
            if pid not in options_by_poll:
                options_by_poll[pid] = []
            options_by_poll[pid].append(
                PollOptionResponse(
                    option_id=opt["option_id"],
                    option_text=opt["option_text"],
                    votes_count=vote_counts.get(opt["option_id"], 0)
                )
            )
            
        # Construct final responses
        response_list = []
        for p in polls_res.data:
            response_list.append(PollResponse(
                poll_id=p["poll_id"],
                session_id=p["session_id"],
                question=p["question"],
                is_active=p["is_active"],
                created_at=p["created_at"],
                options=options_by_poll.get(p["poll_id"], [])
            ))
            
        return response_list

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving polls: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/polls/{poll_id}/vote")
async def vote_on_poll(
    poll_id: int = Path(..., description="ID of the poll"),
    request: PollVoteRequest = ...
):
    logger.info(f"User {request.user_id} voting for option {request.option_id} on poll {poll_id}")
    try:
        # Check if the poll is active
        poll_res = supabase_client.table("polls").select("is_active").eq("poll_id", poll_id).single().execute()
        if not poll_res.data:
            raise HTTPException(status_code=404, detail="Poll not found")
        if not poll_res.data["is_active"]:
            raise HTTPException(status_code=400, detail="Poll is closed")
            
        # Check if the option belongs to the poll
        opt_res = supabase_client.table("poll_options").select("option_id").eq("option_id", request.option_id).eq("poll_id", poll_id).single().execute()
        if not opt_res.data:
            raise HTTPException(status_code=400, detail="Option does not belong to this poll")
            
        # Insert vote and handle unique violation
        try:
            vote_res = supabase_client.table("poll_votes").insert({
                "poll_id": poll_id,
                "option_id": request.option_id,
                "user_id": request.user_id
            }).execute()
        except Exception as e:
            err_msg = str(e).lower()
            if "duplicate key" in err_msg or "unique constraint" in err_msg or "uniqueviolation" in err_msg:
                raise HTTPException(status_code=409, detail="User already voted in this poll")
            raise Exception(f"Database error: {err_msg}")
            
        if hasattr(vote_res, 'error') and vote_res.error:
            if vote_res.error.code == '23505':
                raise HTTPException(status_code=409, detail="User already voted in this poll")
            raise Exception(vote_res.error.message)
            
        return {"status": "success", "message": "Vote recorded"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        # Supabase client may return raw errors
        err_str = str(e).lower()
        if "duplicate key" in err_str or "unique constraint" in err_str:
             raise HTTPException(status_code=409, detail="User already voted in this poll")
        logger.error(f"Error voting on poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/polls/{poll_id}/toggle", response_model=PollResponse)
async def toggle_poll_status(poll_id: int):
    logger.info(f"Toggling status for poll {poll_id}")
    try:
        # Fetch current status
        poll_res = supabase_client.table("polls").select("is_active, session_id, question, created_at").eq("poll_id", poll_id).single().execute()
        if not poll_res.data:
            raise HTTPException(status_code=404, detail="Poll not found")
            
        current_status = poll_res.data["is_active"]
        new_status = not current_status
        
        # Update
        update_res = supabase_client.table("polls").update({"is_active": new_status}).eq("poll_id", poll_id).execute()
        
        if not update_res.data:
             raise HTTPException(status_code=500, detail="Failed to update poll status")
             
        p = update_res.data[0]
        
        # We need to return PollResponse, so lets fetch options to complete the response
        options_query = supabase_client.table("poll_options").select("*").eq("poll_id", poll_id)
        options_res = options_query.execute()
        options = options_res.data or []
        
        option_ids = [opt["option_id"] for opt in options]
        votes = []
        if len(option_ids) > 0:
            votes_query = supabase_client.table("poll_votes").select("option_id").in_("option_id", option_ids)
            votes_res = votes_query.execute()
            votes = votes_res.data or []
            
        vote_counts = {}
        for v in votes:
            oid = v["option_id"]
            vote_counts[oid] = vote_counts.get(oid, 0) + 1
            
        mapped_options = [
            PollOptionResponse(
                option_id=opt["option_id"],
                option_text=opt["option_text"],
                votes_count=vote_counts.get(opt["option_id"], 0)
            ) for opt in options
        ]
        
        return PollResponse(
            poll_id=p["poll_id"],
            session_id=p["session_id"],
            question=p["question"],
            is_active=p["is_active"],
            created_at=p["created_at"],
            options=mapped_options
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error toggling poll status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
