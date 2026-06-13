import os
import uuid
from datetime import datetime, timezone
from typing import Optional
import pandas as pd
import numpy as np
from k_means_constrained import KMeansConstrained

from fastapi import APIRouter, HTTPException, Query, Path, BackgroundTasks, File, UploadFile, Form
from fastapi.responses import RedirectResponse, HTMLResponse
from google.genai import types

from packages.my_email import normalize_email, send_email, send_html_email
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
    SessionAuthResponse,
    GoogleMeetCallbackRequest,
    MeetCreationRequest,
    MeetCreationResponse,
)
from packages.utils import logger, supabase_client, genai_client, MODEL, EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, CHAIR_ROLE_ID, PAPER_MATCH_REVIEWER, BUCKET_NAME, storage_client
from packages.file_storage import StorageClient
from packages.auto_session import get_batch_embeddings, generate_session_title

storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)
from packages.session_notifier import send_session_start_notifications, get_session_recipients
from packages.google_oauth import google_meet_service


router = APIRouter(tags=["sessions"])

def _build_invite_link(token: str, client_url: str = None) -> str:
    base_url = (
        client_url
        or os.environ.get("CLIENT_URL")
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


class SupabaseSingleResponse:
    def __init__(self, data):
        self.data = data


def _select_profile_by_email(email: str):
    res = supabase_client.table("profiles") \
        .select("id, user_id, full_name, email, organization") \
        .eq("email", email) \
        .execute()
    data = res.data[0] if res.data else None
    return SupabaseSingleResponse(data)


def _select_profile_by_user_id(user_id: int):
    res = supabase_client.table("profiles") \
        .select("id, user_id, full_name, email, organization") \
        .eq("user_id", user_id) \
        .execute()
    data = res.data[0] if res.data else None
    return SupabaseSingleResponse(data)


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
    invite_link = _build_invite_link(token, request.client_url)
    session_name = session_data.get("session_name") or "Session"
    conference_name = conference_data.get("conf_name") or "Conference"

    base_url = (
        request.client_url
        or os.environ.get("CLIENT_URL")
        or "http://localhost:3000"
    ).rstrip("/")
    register_link = f"{base_url}/register?redirect=%2Fchair-invitations%2F{token}"

    email_subject = f"Invitation to Chair: {session_name}"

    email_plain_body = (
        f"Dear Colleague,\n\n"
        f"You are cordially invited to serve as the Session Chair for the session '{session_name}' "
        f"at the upcoming conference '{conference_name}'.\n\n"
        f"If you do not have an account yet, please click this link to create one first:\n"
        f"{register_link}\n\n"
        f"Please view details and respond using this link:\n"
        f"{invite_link}\n\n"
        f"Thank you for your time and support.\n\n"
        f"Best regards,\n"
        f"Conference Organizing Committee"
    )

    email_html_body = (
        f"<p>Dear Colleague,</p>"
        f"<p>You are cordially invited to serve as the Session Chair for the session '{session_name}' at the upcoming conference '{conference_name}'.</p>"
        f"<p>If you do not have an account yet, please <a href='{register_link}' style='color: #4f46e5; font-weight: bold; text-decoration: underline;'>click here to create an account first</a>.</p>"
        f"<p>Please review details and respond using the following link:</p>"
        f"<p><a href='{invite_link}' style='color: #4f46e5; font-weight: bold; text-decoration: underline;'>"
        f"Enter this invitation link</a></p>"
        f"<p>Thank you for your time and support.</p>"
        f"<p>Best regards,</p>"
        f"<p>Conference Organizing Committee</p>"
    )

    notif_content = (
        f"You are cordially invited to serve as the Session Chair for the session "
        f"<strong>{session_name}</strong> at the conference <strong>{conference_name}</strong>.<br/><br/>"
        f"Please <a href='{invite_link}' target='_blank' style='color: #4f46e5; font-weight: 600; text-decoration: underline;'>"
        f"click here to view and respond to the invitation</a>."
    )

    background_tasks.add_task(send_html_email, normalized_email, email_subject, email_html_body, email_plain_body)

    if invitee_profile:
        try:
            notification_res = supabase_client.table("notifications").insert({
                "conf_id": conference_data["conf_id"],
                "sender_id": request.invited_by,
                "title": email_subject,
                "content": notif_content,
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
                    "dynamic_content": notif_content,
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

    invitee_profile_res = _select_profile_by_email(invitee_email)
    invitee_profile = invitee_profile_res.data if invitee_profile_res.data else None

    try:
        user_uuid = invitee_profile.get("id") if invitee_profile else None
        target_user_id = user_uuid if user_uuid else invitee_user_id
        
        # 1. Fetch current roles of the user
        current_roles_res = supabase_client.table("user_roles") \
            .select("role_id") \
            .eq("user_id", target_user_id) \
            .execute()
            
        current_role_ids = {r["role_id"] for r in (current_roles_res.data or [])}
        
        # 2. Check and delete Attendee (5) roles
        roles_to_delete = []
        if 5 in current_role_ids:
            roles_to_delete.append(5)
            
        if roles_to_delete:
            supabase_client.table("user_roles") \
                .delete() \
                .eq("user_id", target_user_id) \
                .in_("role_id", roles_to_delete) \
                .execute()
                
        # 3. Check and insert Chair role (6)
        if CHAIR_ROLE_ID not in current_role_ids:
            supabase_client.table("user_roles").insert({
                "user_id": target_user_id,
                "role_id": CHAIR_ROLE_ID,
            }).execute()
    except Exception as role_error:
        logger.warning(f"Unable to ensure chair role for user {invitee_user_id}: {role_error}")

    try:
        existing_att = supabase_client.table("attendences").select("at_id") \
            .eq("session_id", invitation["session_id"]) \
            .eq("user_id", invitee_user_id) \
            .execute()
        
        if not existing_att.data:
            supabase_client.table("attendences").insert({
                "session_id": invitation["session_id"],
                "user_id": invitee_user_id,
                "is_checkin": False
            }).execute()
    except Exception as att_error:
        logger.warning(f"Unable to add attendences for chair {invitee_user_id}: {att_error}")

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


@router.post("/sessions/{session_id}/notify-start")
async def notify_session_start(
    background_tasks: BackgroundTasks,
    session_id: int = Path(..., description="ID of the session to notify"),
):
    """
    Manually trigger session-start notifications for a given session.
    Useful for admins and for testing the notification flow.
    The notification is sent even if it was previously sent (no dedup check here).
    """
    # Validate session exists
    session_data, conference_data = _fetch_session_and_conference(session_id)

    # Preview recipients before sending
    recipients = get_session_recipients(session_id)
    if not recipients:
        raise HTTPException(
            status_code=400,
            detail="No chairs or authors found for this session. Notification not sent."
        )

    # Run in background so the API returns immediately
    background_tasks.add_task(send_session_start_notifications, session_id)

    return {
        "status": "dispatched",
        "session_id": session_id,
        "session_name": session_data.get("session_name"),
        "recipient_count": len(recipients),
        "recipients": [
            {"user_id": r["user_id"], "email": r["email"], "role": r["role"]}
            for r in recipients
        ],
    }


@router.get("/sessions/google-auth-url", response_model=SessionAuthResponse)
async def get_google_auth_url(email: str = Query(...)):
    try:
        auth_url, state = google_meet_service.get_authorization_url(email)
        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        logger.error(f"Failed to get Google Auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/google-oauth-callback")
async def google_oauth_callback(state: str, code: str):
    try:
        # Trao đổi mã code lấy token
        token_data = google_meet_service.get_refresh_token(code)
        refresh_token = token_data.get("refresh_token")
        
        # Lưu refresh_token vào profile người dùng
        email = state.split("::")[0] if "::" in state else None
        if email and refresh_token:
            supabase_client.table("profiles").update({"google_refresh_token": refresh_token}).eq("email", email).execute()
            
        # Trả về HTML để đóng popup
        
        return HTMLResponse(content="""
            <html>
                <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5;">
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
                        <h2 style="color: #1a73e8;">Authentication Successful!</h2>
                        <p>You can close this window now and return to the management page.</p>
                        <script>
                            if (window.opener) {
                                window.opener.postMessage({ type: "google-auth-success" }, "*");
                            }
                            setTimeout(() => window.close(), 3000);
                        </script>
                    </div>
                </body>
            </html>
        """)
    except Exception as e:
        logger.error(f"Google OAuth Callback Error: {e}")
        return HTMLResponse(content=f"<html><body><p>Authentication Error: {str(e)}</p></body></html>", status_code=500)


@router.post("/sessions/{session_id}/create-meet", response_model=MeetCreationResponse)
async def create_session_meet(
    session_id: int,
    request: MeetCreationRequest
):
    try:
        session_res = supabase_client.table("sessions") \
            .select("session_name, start_time, end_time, conferences(timezone)") \
            .eq("session_id", session_id) \
            .single().execute()
            
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        s = session_res.data
        conf_timezone = s.get('conferences', {}).get('timezone', 'UTC')
        
        if not s['start_time'] or not s['end_time']:
            raise HTTPException(status_code=400, detail="Session must have start and end times to create a Meet link.")

        result = google_meet_service.create_meeting(
            email=request.email,
            summary=f"Session: {s['session_name']}",
            start_time=s['start_time'],
            end_time=s['end_time'],
            timezone=conf_timezone
        )
        
        # Cập nhật session với meet link và event_id
        supabase_client.table("sessions").update({
            "meet_link": result['meet_link'],
            "google_event_id": result['event_id']
        }).eq("session_id", session_id).execute()
        
        return result
    except Exception as e:
        logger.error(f"Failed to create Meet link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/sessions/{session_id}/update-meet", response_model=MeetCreationResponse)
async def update_session_meet(
    session_id: int,
    request: MeetCreationRequest
):
    try:
        session_res = supabase_client.table("sessions") \
            .select("session_name, start_time, end_time, google_event_id, conferences(timezone)") \
            .eq("session_id", session_id) \
            .single().execute()
            
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        s = session_res.data
        conf_timezone = s.get('conferences', {}).get('timezone', 'UTC')
        event_id = s.get('google_event_id')
        
        if not event_id:
            raise HTTPException(status_code=400, detail="Session does not have an associated Google Calendar event.")
            
        if not s['start_time'] or not s['end_time']:
            raise HTTPException(status_code=400, detail="Session must have start and end times to update the Meet event.")

        result = google_meet_service.update_meeting(
            email=request.email,
            event_id=event_id,
            summary=f"Session: {s['session_name']}",
            start_time=s['start_time'],
            end_time=s['end_time'],
            timezone=conf_timezone
        )
        
        # Cập nhật session với meet link
        supabase_client.table("sessions").update({
            "meet_link": result['meet_link']
        }).eq("session_id", session_id).execute()
        
        return result
    except Exception as e:
        logger.error(f"Failed to update Meet event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}/meet")
async def delete_session_meet(
    session_id: int,
    email: str = Query(...)
):
    try:
        session_res = supabase_client.table("sessions").select("google_event_id").eq("session_id", session_id).single().execute()
        if not session_res.data or not session_res.data.get('google_event_id'):
            supabase_client.table("sessions").update({"meet_link": None}).eq("session_id", session_id).execute()
            return {"status": "cleared local link"}
            
        event_id = session_res.data['google_event_id']
        google_meet_service.delete_meeting(email, event_id)
        
        supabase_client.table("sessions").update({
            "meet_link": None,
            "google_event_id": None
        }).eq("session_id", session_id).execute()
        
        return {"status": "deleted"}
    except Exception as e:
        logger.error(f"Failed to delete Meet link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/sessions/{session_id}/toggle-meet")
async def toggle_session_meet(
    session_id: int,
    is_active: bool = Query(...)
):
    try:
        supabase_client.table("sessions").update({
            "is_meet_active": is_active
        }).eq("session_id", session_id).execute()
        return {"status": "success", "is_meet_active": is_active}
    except Exception as e:
        logger.error(f"Failed to toggle session meet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/google-disconnect")
async def disconnect_google(email: str = Query(...)):
    try:
        supabase_client.table("profiles").update({"google_refresh_token": None}).eq("email", email).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to disconnect Google: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/chair-conflict-check")
async def check_chair_schedule_conflict(
    session_id: int = Path(..., description="ID of the session to invite the chair to"),
    email: str = Query(..., description="Email of the chair candidate to check"),
):
    """
    Check whether a chair candidate (by email) has a schedule conflict with the given session.
    - If the email is not registered in the system, returns has_conflict=False (cannot check).
    - If the user IS registered, fetches all sessions they are already chairing and checks
      for time overlap with the target session.

    Overlap condition: A.start < B.end AND B.start < A.end
    """
    try:
        # 1. Fetch the target session's time window
        session_res = supabase_client.table("sessions") \
            .select("session_id, session_name, start_time, end_time, conf_id") \
            .eq("session_id", session_id) \
            .single() \
            .execute()

        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found.")

        target = session_res.data
        target_start = target.get("start_time")
        target_end = target.get("end_time")

        if not target_start or not target_end:
            # No time set yet → cannot detect conflict
            return {"has_conflict": False, "user_found": False, "conflicting_sessions": []}

        target_start_dt = datetime.fromisoformat(target_start)
        target_end_dt = datetime.fromisoformat(target_end)

        # 2. Look up the profile by email
        normalized_email = normalize_email(email)
        profile_res = _select_profile_by_email(normalized_email)
        profile = profile_res.data if profile_res.data else None

        if not profile:
            # User not found → no conflict possible (external invite)
            return {"has_conflict": False, "user_found": False, "conflicting_sessions": []}

        user_id = profile["user_id"]

        # 3. Fetch all sessions where this user is already a chair (excluding the target session)
        sc_res = supabase_client.table("session_chairs") \
            .select("session_id") \
            .eq("user_id", user_id) \
            .neq("session_id", session_id) \
            .execute()

        existing_session_ids = [row["session_id"] for row in (sc_res.data or [])]

        if not existing_session_ids:
            return {"has_conflict": False, "user_found": True, "conflicting_sessions": []}

        # 4. Fetch time info for all those sessions (join conference name for display)
        sessions_res = supabase_client.table("sessions") \
            .select("session_id, session_name, start_time, end_time, conferences!inner(conf_name)") \
            .in_("session_id", existing_session_ids) \
            .execute()

        # 5. Detect overlaps
        conflicting: list[dict] = []
        for s in (sessions_res.data or []):
            s_start = s.get("start_time")
            s_end = s.get("end_time")
            if not s_start or not s_end:
                continue

            s_start_dt = datetime.fromisoformat(s_start)
            s_end_dt = datetime.fromisoformat(s_end)

            # Classic overlap check: A.start < B.end AND B.start < A.end
            if target_start_dt < s_end_dt and s_start_dt < target_end_dt:
                conf_info = s.get("conferences") or {}
                if isinstance(conf_info, list):
                    conf_info = conf_info[0] if conf_info else {}
                conflicting.append({
                    "session_id": s["session_id"],
                    "session_name": s.get("session_name") or "Unnamed Session",
                    "start_time": s_start,
                    "end_time": s_end,
                    "conf_name": conf_info.get("conf_name") or "",
                })

        return {
            "has_conflict": len(conflicting) > 0,
            "user_found": True,
            "conflicting_sessions": conflicting,
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Chair conflict check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _is_admin_or_btc(user_id: int) -> bool:
    try:
        profile_res = supabase_client.table("profiles").select("id").eq("user_id", user_id).execute()
        if not profile_res.data:
            return False
        user_uuid = profile_res.data[0]["id"]
        roles_res = supabase_client.table("user_roles").select("role_id").eq("user_id", user_uuid).execute()
        role_ids = {r["role_id"] for r in roles_res.data or []}
        return 1 in role_ids or 2 in role_ids
    except Exception as e:
        logger.error(f"Error checking admin/btc status: {e}")
        return False


def _is_author_or_coauthor(paper_id: int, user_id: int) -> bool:
    try:
        paper_res = supabase_client.table("papers").select("primary_author_id").eq("paper_id", paper_id).single().execute()
        if paper_res.data and paper_res.data.get("primary_author_id") == user_id:
            return True
        coauthor_res = supabase_client.table("paper_coauthors").select("user_id").eq("paper_id", paper_id).eq("user_id", user_id).execute()
        if coauthor_res.data:
            return True
        return False
    except Exception as e:
        logger.error(f"Error checking author status: {e}")
        return False


def _is_paper_assigned_to_session(session_id: int, paper_id: int) -> bool:
    try:
        res = supabase_client.table("session_papers").select("session_id").eq("session_id", session_id).eq("paper_id", paper_id).execute()
        return bool(res.data)
    except Exception as e:
        logger.error(f"Error checking paper session link: {e}")
        return False


@router.get("/sessions/{session_id}/papers/{paper_id}/files")
async def get_session_paper_files(
    session_id: int,
    paper_id: int,
    user_id: int = Query(..., description="Currently logged in user ID")
):
    if not _is_paper_assigned_to_session(session_id, paper_id):
        raise HTTPException(status_code=400, detail="Paper is not assigned to this session.")
        
    is_admin = _is_admin_or_btc(user_id)
    is_author = _is_author_or_coauthor(paper_id, user_id)
    
    if not is_admin and not is_author:
        raise HTTPException(status_code=403, detail="Access denied. You do not have permission to view these files.")
        
    res = supabase_client.table("session_paper_files").select("*").eq("session_id", session_id).eq("paper_id", paper_id).execute()
    if res.data:
        return res.data[0]
    return {
        "session_id": session_id,
        "paper_id": paper_id,
        "pdf_url": None,
        "slide_url": None,
        "text_url": None,
        "uploaded_by": None,
        "uploaded_at": None
    }


@router.post("/sessions/{session_id}/papers/{paper_id}/files")
async def save_session_paper_files(
    session_id: int,
    paper_id: int,
    file_type: str = Form(...),
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user_id: int = Form(...)
):
    if file_type not in ["pdf", "slide", "text"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Must be pdf, slide, or text.")
        
    if not _is_paper_assigned_to_session(session_id, paper_id):
        raise HTTPException(status_code=400, detail="Paper is not assigned to this session.")
        
    is_author = _is_author_or_coauthor(paper_id, user_id)
    if not is_author:
        raise HTTPException(status_code=403, detail="Access denied. Only authors/co-authors can upload or edit files.")
        
    final_url = url
    if file:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds the 20MB limit.")

        import tempfile
        import shutil
        original_name = os.path.basename(file.filename)
        clean_filename = original_name.lower().replace(" ", "_")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, clean_filename)
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            destination_path = f"sessions/{session_id}/papers/{paper_id}/{file_type}_{clean_filename}"
            public_url = storage_service.upload_blob(temp_file_path, destination_path)
            
            if not public_url:
                raise HTTPException(status_code=500, detail="Failed to upload file to storage.")
            final_url = public_url

    existing = supabase_client.table("session_paper_files").select("file_id").eq("session_id", session_id).eq("paper_id", paper_id).execute()
    
    update_data = {
        "session_id": session_id,
        "paper_id": paper_id,
        "uploaded_by": user_id,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    if file_type == "pdf":
        update_data["pdf_url"] = final_url
    elif file_type == "slide":
        update_data["slide_url"] = final_url
    elif file_type == "text":
        update_data["text_url"] = final_url

    if existing.data:
        res = supabase_client.table("session_paper_files").update(update_data).eq("session_id", session_id).eq("paper_id", paper_id).execute()
    else:
        res = supabase_client.table("session_paper_files").insert(update_data).execute()
        
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update database record.")
        
    return res.data[0]


@router.delete("/sessions/{session_id}/papers/{paper_id}/files/{file_type}")
async def delete_session_paper_file(
    session_id: int,
    paper_id: int,
    file_type: str,
    user_id: int = Query(...)
):
    if file_type not in ["pdf", "slide", "text"]:
        raise HTTPException(status_code=400, detail="Invalid file type.")
        
    if not _is_paper_assigned_to_session(session_id, paper_id):
        raise HTTPException(status_code=400, detail="Paper is not assigned to this session.")
        
    is_author = _is_author_or_coauthor(paper_id, user_id)
    if not is_author:
        raise HTTPException(status_code=403, detail="Access denied. Only authors/co-authors can delete files.")
        
    existing = supabase_client.table("session_paper_files").select("*").eq("session_id", session_id).eq("paper_id", paper_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="No files found for this paper in the session.")
        
    current_data = existing.data[0]
    file_url = current_data.get(f"{file_type}_url")
    if file_url:
        storage_service.delete_file(file_url)
        
    update_data = {
        f"{file_type}_url": None,
        "uploaded_by": user_id,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    res = supabase_client.table("session_paper_files").update(update_data).eq("session_id", session_id).eq("paper_id", paper_id).execute()
    return res.data[0]