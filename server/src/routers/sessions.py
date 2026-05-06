import os
import uuid
from datetime import datetime, timezone

import pandas as pd
import numpy as np
from k_means_constrained import KMeansConstrained

from fastapi import APIRouter, HTTPException, Query, Path, BackgroundTasks
from fastapi.responses import RedirectResponse
from google.genai import types

from packages.my_email import normalize_email, send_email
from packages.schema import (
    AutoSessionRequest,
    AuthorProfileAnalysis,
    ChairInvitationCreateRequest,
    ChairInvitationDecisionRequest,
    ChairInvitationResponse,
    MatchReviewRequest,
    MatchReviewResponse,
    SessionChairResponse,
    ChairRecommendation,
)
from packages.utils import logger, supabase_client, genai_client, MODEL, EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, CHAIR_ROLE_ID, PAPER_MATCH_REVIEWER
from packages.auto_session import get_batch_embeddings, generate_session_title


router = APIRouter(tags=["sessions"])

def _build_invite_link(token: str) -> str:
    base_url = (
        os.environ.get("CLIENT_URL")
        or "http://localhost:3000"
    ).rstrip("/")
    return f"{base_url}/chair-invitations/{token}"


def _fetch_session_and_conference(session_id: int) -> tuple[dict, dict]:
    session_res = supabase_client.table("sessions") \
        .select("session_id, session_name, conf_id, start_time, end_time, room_location") \
        .eq("session_id", session_id) \
        .single() \
        .execute()

    session_data = session_res.data
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    conf_id = session_data.get("conf_id")
    if not conf_id:
        raise HTTPException(status_code=400, detail="This session is not linked to a conference.")

    conf_res = supabase_client.table("conferences") \
        .select("conf_id, conf_name, end_date, max_chairs_per_session") \
        .eq("conf_id", conf_id) \
        .single() \
        .execute()

    conference_data = conf_res.data
    if not conference_data:
        raise HTTPException(status_code=404, detail="Conference not found")

    return session_data, conference_data


def _select_profile_by_email(email: str):
    return supabase_client.table("profiles") \
        .select("user_id, full_name, email, organization") \
        .eq("email", email) \
        .single() \
        .execute()


def _select_profile_by_user_id(user_id: int):
    return supabase_client.table("profiles") \
        .select("user_id, full_name, email, organization") \
        .eq("user_id", user_id) \
        .single() \
        .execute()


def _get_session_capacity(session_id: int) -> dict:
    chairs_res = supabase_client.table("session_chairs") \
        .select("session_id") \
        .eq("session_id", session_id) \
        .execute()

    invitations_res = supabase_client.table("chair_invitations") \
        .select("invitation_id") \
        .eq("session_id", session_id) \
        .in_("status", ["PENDING"]) \
        .execute()

    return {
        "current_chairs": len(chairs_res.data or []),
        "active_invitations": len(invitations_res.data or []),
    }


def _serialize_invitation(
    invitation: dict,
    session_data: dict,
    conference_data: dict,
    invitee_user_id: int | None = None,
) -> dict:
    token = invitation.get("token")
    return {
        "invitation_id": invitation.get("invitation_id"),
        "conf_id": invitation.get("conf_id"),
        "conf_name": conference_data.get("conf_name"),
        "session_id": invitation.get("session_id"),
        "session_name": session_data.get("session_name"),
        "email": invitation.get("email"),
        "status": invitation.get("status"),
        "token": token,
        "invited_by": invitation.get("invited_by"),
        "created_at": invitation.get("created_at"),
        "responded_at": invitation.get("responded_at"),
        "invitee_user_id": invitee_user_id,
        "invite_link": _build_invite_link(token) if token else None,
    }


def _resolve_invitee_user_id(invitation: dict, request: ChairInvitationDecisionRequest) -> tuple[int, str]:
    invitation_email = normalize_email(invitation.get("email") or "")
    request_email = normalize_email(request.email) if request.email else None

    if request_email and request_email != invitation_email:
        raise HTTPException(status_code=403, detail="Invitation email does not match the authenticated invitee.")

    if request.user_id is not None:
        profile_res = _select_profile_by_user_id(request.user_id)
    else:
        profile_res = _select_profile_by_email(request_email or invitation_email)

    profile = profile_res.data
    if not profile:
        raise HTTPException(status_code=404, detail="Invitee profile not found.")

    profile_email = normalize_email(profile.get("email") or "")
    if profile_email != invitation_email:
        raise HTTPException(status_code=403, detail="The profile email does not match the invitation email.")

    return profile["user_id"], profile_email


def _mark_expired_if_needed(invitation: dict, conference_data: dict) -> dict:
    if invitation.get("status") != "PENDING":
        return invitation

    end_date = conference_data.get("end_date")
    if not end_date:
        return invitation

    if isinstance(end_date, str):
        end_date_value = datetime.fromisoformat(end_date).date()
    else:
        end_date_value = end_date

    if datetime.now(timezone.utc).date() > end_date_value:
        update_res = supabase_client.table("chair_invitations") \
            .update({"status": "EXPIRED", "responded_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("invitation_id", invitation["invitation_id"]) \
            .execute()

        if update_res.data:
            invitation = update_res.data[0]

    return invitation


@router.post("/sessions/auto-generate")
async def auto_generate_sessions(request: AutoSessionRequest):
    logger.info(f"Received request to schedule {len(request.paper_ids)} papers into {request.n_session} sessions.")

    try:
       
        papers_res = supabase_client.table("papers")\
            .select("paper_id, title, abstract")\
            .in_("paper_id", request.paper_ids)\
            .execute()
            
        selected_papers = papers_res.data
        if not selected_papers:
            raise HTTPException(status_code=404, detail="Could not find the specified papers.")

        assigned_res = supabase_client.table("session_papers")\
            .select("paper_id")\
            .in_("paper_id", request.paper_ids)\
            .execute()
            
        assigned_ids = {item['paper_id'] for item in assigned_res.data}
        
        valid_papers = [p for p in selected_papers if p['paper_id'] not in assigned_ids]
        
        skipped_count = len(selected_papers) - len(valid_papers)
        if skipped_count > 0:
            logger.warning(f"Skipping {skipped_count} papers because they are already assigned to a session.")
            
        if not valid_papers:
            raise HTTPException(status_code=400, detail="All selected papers are already assigned to a session.")

        df = pd.DataFrame(valid_papers)
        logger.info(f"Proceeding with {len(df)} valid papers.")

        total_papers = len(df)
        
        if total_papers < request.n_session:
             raise HTTPException(status_code=400, detail=f"Not enough papers to create the requested number of sessions. (Available: {total_papers}, Required: {request.n_session})")

        if request.max_paper * request.n_session < total_papers:
            raise HTTPException(status_code=400, detail="The current configuration cannot accommodate all papers. Please increase the number of sessions or maximum papers per session.")
        
        if request.min_paper * request.n_session > total_papers:
             raise HTTPException(status_code=400, detail=f"Minimum requirement not met. Not enough papers to fill {request.n_session} sessions with at least {request.min_paper} papers each.")

        if request.min_paper > total_papers:
            raise HTTPException(status_code=400, detail="The minium number of papers per session should not exeed the number of papers in total")

        if request.max_paper > total_papers:
            raise HTTPException(status_code=400, detail="The maximum number of papers per session should not exeed the number of papers in total")


        logger.info("Generating embeddings...")
        df['abstract'] = df['abstract'].fillna('')
        df['text_for_embed'] = df['title'] + " " + df['abstract']
        
        embeddings = get_batch_embeddings(df['text_for_embed'].tolist())
        X = np.array(embeddings)
        
        logger.info("Running KMeans Constrained...")
        clf = KMeansConstrained(
            n_clusters=request.n_session,
            size_min=request.min_paper,
            size_max=request.max_paper,
            random_state=42
        )
        clf.fit(X)
        df['cluster_id'] = clf.labels_
        
        logger.info("Generating Session...")
        result_summary = []
        
        for cluster_idx in range(request.n_session):
            cluster_papers = df[df['cluster_id'] == cluster_idx]
            paper_titles = cluster_papers['title'].tolist()
            paper_ids = cluster_papers['paper_id'].tolist()
            
            session_name = await generate_session_title(paper_titles)
            
            session_data = {
                "session_name": session_name,
                "is_ai_generated": True,
                "room_location": "TBD"
            }
            sess_res = supabase_client.table("sessions").insert(session_data).execute()
            new_session_id = sess_res.data[0]['session_id']
            
            result_summary.append({
                "id": new_session_id,
                "name": session_name,
                "paper_count": len(paper_ids),
                "papers": paper_titles
            })
            
        return {
            "status": "success", 
            "message": f"Successfully created {request.n_session} sessions from {len(df)} papers.",
            "skipped_papers_count": skipped_count,
            "sessions": result_summary
        }

    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        logger.error(f"Auto-schedule failed: {str(e)}")
        raise HTTPException(status_code=500, detail="The auto-scheduling process failed. Please try again later.")


@router.post("/sessions/{session_id}/recommend-chair", response_model=SessionChairResponse)
async def recommend_chair_for_session(
    session_id: int = Path(..., description="ID of the session"),
    limit: int = Query(5, description="Number of recommendations"),
    threshold: float = Query(0.5, description="Minimum similarity score")
):
    logger.info(f"Recommending Chair (Role {CHAIR_ROLE_ID}) for Session {session_id}")

    try:
        query = supabase_client.table("sessions")\
            .select(
                "session_name, "
                "session_papers(paper:papers(paper_id, title, abstract, primary_author_id))"
            )\
            .eq("session_id", session_id)\
            .single()
        
        response = query.execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Session not found")

        session_data = response.data
        papers = [item['paper'] for item in session_data.get('session_papers', []) if item.get('paper')]

        if not papers:
            raise HTTPException(status_code=400, detail="This session has no papers to analyze.")

        combined_text_parts = [f"Session Context: {session_data['session_name']}"]
        excluded_author_ids = []

        for p in papers:
            combined_text_parts.append(f"Paper Title: {p['title']}. Abstract: {p.get('abstract', '')}")
            
            if p.get('primary_author_id'):
                excluded_author_ids.append(p['primary_author_id'])

        session_context_text = "\n".join(combined_text_parts)
        
        if len(session_context_text) > 8000:
            session_context_text = session_context_text[:8000]

        try:
            embed_response = genai_client.models.embed_content(
                model=EMBEDDING_MODEL_NAME,
                contents=session_context_text,
                config=types.EmbedContentConfig(
                    task_type="SEMANTIC_SIMILARITY",
                    output_dimensionality=VECTOR_DIMENSION
                ),
                
            )
            session_vector = embed_response.embeddings[0].values
        except Exception as e:
            logger.error(f"GenAI Embedding Error: {e}")
            raise HTTPException(status_code=500, detail="AI analysis is temporarily unavailable. Please try again later.")

        rpc_params = {
            "query_embedding": session_vector,
            "match_threshold": threshold,
            "match_count": limit,
            "excluded_user_ids": list(set(excluded_author_ids)) 
        }

        search_result = supabase_client.rpc("match_chair_candidates", rpc_params).execute()

        if hasattr(search_result, 'error') and search_result.error:
            logger.error(f"Supabase RPC Error: {search_result.error}")
            raise HTTPException(status_code=500, detail="An error occurred while searching for chair candidates.")

        recommendations = [
            ChairRecommendation(
                user_id=r['user_id'],
                full_name=r['full_name'],
                email=r['email'],
                organization=r.get('organization'),
                similarity=r.get('similarity'),
                match_score=round(r.get('match_score'), 3)
            ) for r in search_result.data
        ]

        return {
            "session_id": session_id,
            "session_name": session_data['session_name'],
            "recommended_chairs": recommendations
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Internal Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")


@router.post("/sessions/{session_id}/match-review", response_model=MatchReviewResponse)
async def match_review_for_session(
    request: MatchReviewRequest,
    session_id: int = Path(..., description="ID of the session"),
):
    logger.info(f"Running match-review for user {request.user_id} against session {session_id}")

    try:
        # Step 1: Fetch the candidate's profile description
        profile_res = supabase_client.table("profiles") \
            .select("description") \
            .eq("user_id", request.user_id) \
            .single() \
            .execute()

        profile_data = profile_res.data
        if not profile_data:
            raise HTTPException(status_code=404, detail="User profile not found.")

        profile_description = profile_data.get("description")
        if not profile_description:
            raise HTTPException(
                status_code=400,
                detail="This user has no profile description to evaluate. Please ask them to complete their profile first."
            )

        # Step 2: Fetch session name and its papers
        session_res = supabase_client.table("sessions") \
            .select(
                "session_name, "
                "session_papers(paper:papers(title, abstract))"
            ) \
            .eq("session_id", session_id) \
            .single() \
            .execute()

        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found.")

        session_data = session_res.data
        papers = [
            item["paper"]
            for item in session_data.get("session_papers", [])
            if item.get("paper")
        ]

        if not papers:
            raise HTTPException(status_code=400, detail="This session has no papers to analyze.")

        # Step 3: Call Gemini to evaluate match
        try:
            ai_response = await genai_client.aio.models.generate_content(
                model=MODEL,
                contents=[
                    PAPER_MATCH_REVIEWER,
                    f"Profile:\n{profile_description}",
                    f"Papers:\n{papers}",
                ],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": AuthorProfileAnalysis.model_json_schema(),
                },
            )
        except Exception as e:
            logger.error(f"Gemini API Error in match-review: {e}")
            raise HTTPException(status_code=500, detail="AI analysis is temporarily unavailable. Please try again later.")

        analysis = AuthorProfileAnalysis.model_validate_json(ai_response.text)

        return MatchReviewResponse(
            session_id=session_id,
            session_name=session_data["session_name"],
            user_id=request.user_id,
            analysis=analysis,
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"match-review internal error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")


@router.get("/sessions/{session_id}/chair-invitations")
async def list_chair_invitations(session_id: int = Path(..., description="ID of the session")):
    session_data, conference_data = _fetch_session_and_conference(session_id)
    invitation_rows = supabase_client.table("chair_invitations") \
        .select("invitation_id, conf_id, session_id, email, status, token, invited_by, created_at, responded_at") \
        .eq("session_id", session_id) \
        .order("created_at", desc=True) \
        .execute()

    profile_map = {}
    for row in invitation_rows.data or []:
        profile_res = _select_profile_by_email(normalize_email(row.get("email") or ""))
        if profile_res.data:
            profile_map[row["invitation_id"]] = profile_res.data["user_id"]

    capacity = _get_session_capacity(session_id)
    max_chairs = conference_data.get("max_chairs_per_session") or 1

    return {
        "session_id": session_id,
        "session_name": session_data.get("session_name"),
        "conf_id": conference_data.get("conf_id"),
        "conf_name": conference_data.get("conf_name"),
        "max_chairs_per_session": max_chairs,
        "current_chairs": capacity["current_chairs"],
        "active_invitations": capacity["active_invitations"],
        "invitations": [
            _serialize_invitation(row, session_data, conference_data, profile_map.get(row["invitation_id"]))
            for row in (invitation_rows.data or [])
        ],
    }


@router.post("/sessions/{session_id}/chair-invitations", response_model=ChairInvitationResponse)
async def create_chair_invitation(
    request: ChairInvitationCreateRequest,
    background_tasks: BackgroundTasks,
    session_id: int = Path(..., description="ID of the session"),
):
    session_data, conference_data = _fetch_session_and_conference(session_id)
    normalized_email = normalize_email(request.email)
    capacity = _get_session_capacity(session_id)
    max_chairs = conference_data.get("max_chairs_per_session") or 1

    if capacity["current_chairs"] >= max_chairs:
        raise HTTPException(status_code=400, detail="This session has already reached the chair limit.")

    if capacity["current_chairs"] + capacity["active_invitations"] >= max_chairs:
        raise HTTPException(status_code=400, detail="This session already has enough chairs and pending invitations.")

    existing_invitation_res = supabase_client.table("chair_invitations") \
        .select("invitation_id, status") \
        .eq("session_id", session_id) \
        .eq("email", normalized_email) \
        .in_("status", ["PENDING", "ACCEPTED"]) \
        .execute()

    if existing_invitation_res.data:
        raise HTTPException(status_code=409, detail="An active invitation already exists for this email.")

    invitee_profile_res = _select_profile_by_email(normalized_email)
    invitee_profile = invitee_profile_res.data if invitee_profile_res.data else None

    if invitee_profile:
        chair_res = supabase_client.table("session_chairs") \
            .select("session_id, user_id") \
            .eq("session_id", session_id) \
            .eq("user_id", invitee_profile["user_id"]) \
            .execute()

        if chair_res.data:
            raise HTTPException(status_code=409, detail="This user is already assigned as a chair for the session.")

    if request.invited_by is not None:
        inviter_res = _select_profile_by_user_id(request.invited_by)
        if not inviter_res.data:
            raise HTTPException(status_code=404, detail="Inviter profile not found.")

    token = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    invitation_payload = {
        "conf_id": conference_data["conf_id"],
        "session_id": session_id,
        "email": normalized_email,
        "status": "PENDING",
        "token": token,
        "invited_by": request.invited_by,
        "created_at": now,
    }

    create_res = supabase_client.table("chair_invitations").insert(invitation_payload).execute()
    if not create_res.data:
        raise HTTPException(status_code=500, detail="Failed to create chair invitation.")

    invitation = create_res.data[0]
    invite_link = _build_invite_link(token)
    email_subject = f"Chair invitation for {session_data.get('session_name') or 'session'}"
    email_body = (
        f"You have been invited to chair the session '{session_data.get('session_name') or session_id}'\n\n"
        f"Conference: {conference_data.get('conf_name') or conference_data.get('conf_id')}\n"
        f"Invitation link: {invite_link}\n"
    )

    background_tasks.add_task(send_email, normalized_email, email_subject, email_body)

    if invitee_profile:
        try:
            notification_res = supabase_client.table("notifications").insert({
                "conf_id": conference_data["conf_id"],
                "sender_id": request.invited_by,
                "title": email_subject,
                "content": email_body,
                "attachments": [],
                "type": "manual",
                "target_type": "user",
                "target_criteria": {"email": normalized_email},
            }).execute()

            if notification_res.data:
                notification_id = notification_res.data[0]["notification_id"]
                supabase_client.table("user_notifications").insert({
                    "notification_id": notification_id,
                    "user_id": invitee_profile["user_id"],
                    "dynamic_title": email_subject,
                    "dynamic_content": email_body,
                }).execute()
        except Exception as notification_error:
            logger.warning(f"Failed to create invitation notification: {notification_error}")

    return _serialize_invitation(invitation, session_data, conference_data, invitee_profile["user_id"] if invitee_profile else None)


@router.get("/chair-invitations/{token}")
async def get_chair_invitation(token: str):
    invitation_res = supabase_client.table("chair_invitations") \
        .select("invitation_id, conf_id, session_id, email, status, token, invited_by, created_at, responded_at") \
        .eq("token", token) \
        .single() \
        .execute()

    invitation = invitation_res.data
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    session_data, conference_data = _fetch_session_and_conference(invitation["session_id"])
    invitation = _mark_expired_if_needed(invitation, conference_data)
    invitee_profile_res = _select_profile_by_email(normalize_email(invitation.get("email") or ""))
    invitee_profile = invitee_profile_res.data if invitee_profile_res.data else None

    return _serialize_invitation(invitation, session_data, conference_data, invitee_profile["user_id"] if invitee_profile else None)


@router.post("/chair-invitations/{token}/reject", response_model=ChairInvitationResponse)
async def reject_chair_invitation(token: str, request: ChairInvitationDecisionRequest):

    invitation_res = supabase_client.table("chair_invitations") \
        .select("invitation_id, conf_id, session_id, email, status, token, invited_by, created_at, responded_at") \
        .eq("token", token) \
        .single() \
        .execute()

    invitation = invitation_res.data
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    session_data, conference_data = _fetch_session_and_conference(invitation["session_id"])
    invitation = _mark_expired_if_needed(invitation, conference_data)
    if invitation.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail="This invitation is no longer pending.")

    if request.user_id is not None or request.email is not None:
        _resolve_invitee_user_id(invitation, request)

    now = datetime.now(timezone.utc).isoformat()
    update_res = supabase_client.table("chair_invitations") \
        .update({"status": "REJECTED", "responded_at": now}) \
        .eq("invitation_id", invitation["invitation_id"]) \
        .execute()

    if not update_res.data:
        raise HTTPException(status_code=500, detail="Failed to reject chair invitation.")

    updated_invitation = update_res.data[0]
    invitee_profile_res = _select_profile_by_email(normalize_email(updated_invitation.get("email") or ""))
    invitee_profile = invitee_profile_res.data if invitee_profile_res.data else None
    return _serialize_invitation(updated_invitation, session_data, conference_data, invitee_profile["user_id"] if invitee_profile else None)


@router.post("/chair-invitations/{token}/accept", response_model=ChairInvitationResponse)
async def accept_chair_invitation(token: str, request: ChairInvitationDecisionRequest):

    invitation_res = supabase_client.table("chair_invitations") \
        .select("invitation_id, conf_id, session_id, email, status, token, invited_by, created_at, responded_at") \
        .eq("token", token) \
        .single() \
        .execute()

    invitation = invitation_res.data
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    session_data, conference_data = _fetch_session_and_conference(invitation["session_id"])
    invitation = _mark_expired_if_needed(invitation, conference_data)
    if invitation.get("status") == "EXPIRED":
        raise HTTPException(status_code=410, detail="This invitation has expired.")

    if invitation.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail="This invitation is no longer pending.")

    invitee_user_id, invitee_email = _resolve_invitee_user_id(invitation, request)

    capacity = _get_session_capacity(invitation["session_id"])
    max_chairs = conference_data.get("max_chairs_per_session") or 1
    if capacity["current_chairs"] >= max_chairs:
        raise HTTPException(status_code=409, detail="This session has already reached the chair limit.")

    chair_insert_res = supabase_client.table("session_chairs").insert({
        "session_id": invitation["session_id"],
        "user_id": invitee_user_id,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    if not chair_insert_res.data:
        raise HTTPException(status_code=409, detail="This chair assignment already exists or could not be created.")

    now = datetime.now(timezone.utc).isoformat()
    update_res = supabase_client.table("chair_invitations") \
        .update({"status": "ACCEPTED", "responded_at": now}) \
        .eq("invitation_id", invitation["invitation_id"]) \
        .execute()

    if not update_res.data:
        supabase_client.table("session_chairs") \
            .delete() \
            .eq("session_id", invitation["session_id"]) \
            .eq("user_id", invitee_user_id) \
            .execute()
        raise HTTPException(status_code=500, detail="Failed to accept chair invitation.")

    updated_invitation = update_res.data[0]

    try:
        supabase_client.table("user_roles").insert({
            "user_id": invitee_user_id,
            "role_id": CHAIR_ROLE_ID,
        }).execute()
    except Exception as role_error:
        logger.warning(f"Unable to ensure chair role for user {invitee_user_id}: {role_error}")

    invitee_profile_res = _select_profile_by_email(invitee_email)
    invitee_profile = invitee_profile_res.data if invitee_profile_res.data else None

    return _serialize_invitation(updated_invitation, session_data, conference_data, invitee_profile["user_id"] if invitee_profile else invitee_user_id)


@router.delete("/sessions/{session_id}/chair-invitations/{invitation_id}", response_model=ChairInvitationResponse)
async def cancel_chair_invitation(session_id: int = Path(..., description="ID of the session"), invitation_id: str = Path(..., description="ID of the invitation")):
    # Ensure session exists
    session_data, conference_data = _fetch_session_and_conference(session_id)

    invitation_res = supabase_client.table("chair_invitations") \
        .select("invitation_id, conf_id, session_id, email, status, token, invited_by, created_at, responded_at") \
        .eq("invitation_id", invitation_id) \
        .single() \
        .execute()

    invitation = invitation_res.data
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if invitation.get("session_id") != session_id:
        raise HTTPException(status_code=400, detail="Invitation does not belong to the specified session.")

    invitation = _mark_expired_if_needed(invitation, conference_data)
    if invitation.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail="Only pending invitations can be canceled.")

    now = datetime.now(timezone.utc).isoformat()
    update_res = supabase_client.table("chair_invitations") \
        .update({"status": "EXPIRED", "responded_at": now}) \
        .eq("invitation_id", invitation_id) \
        .execute()

    if not update_res.data:
        raise HTTPException(status_code=500, detail="Failed to cancel chair invitation.")

    updated_invitation = update_res.data[0]
    invitee_profile_res = _select_profile_by_email(normalize_email(updated_invitation.get("email") or ""))
    invitee_profile = invitee_profile_res.data if invitee_profile_res.data else None
    return _serialize_invitation(updated_invitation, session_data, conference_data, invitee_profile["user_id"] if invitee_profile else None)