import pandas as pd
import numpy as np
from k_means_constrained import KMeansConstrained

from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import RedirectResponse
from google.genai import types

from schema import AutoSessionRequest, SessionChairResponse, ChairRecommendation, SessionAuthResponse, GoogleMeetCallbackRequest, MeetCreationRequest, MeetCreationResponse
from utils import logger, supabase_client, genai_client, EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, CHAIR_ROLE_ID
from auto_session import get_batch_embeddings, generate_session_title
from google_meet_service import meet_service


router = APIRouter(tags=["sessions"])


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
            raise HTTPException(status_code=404, detail="Could not find relevance paper from given id")

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
            raise HTTPException(status_code=400, detail="All selected papers already have sessions")

        df = pd.DataFrame(valid_papers)
        logger.info(f"Proceeding with {len(df)} valid papers.")

        total_papers = len(df)
        
        if total_papers < request.n_session:
             raise HTTPException(status_code=400, detail=f"Insufficient papers! Available: {total_papers}, but requested {request.n_session} sessions.")

        if request.max_paper * request.n_session < total_papers:
            raise HTTPException(status_code=400, detail=f"Capacity overflow! The current configuration cannot accommodate all papers. Please increase 'n_session' or 'max_paper'.")
        
        if request.min_paper * request.n_session > total_papers:
             raise HTTPException(status_code=400, detail=f"Minimum requirement not met! Not enough papers to fill {request.n_session} sessions with at least {request.min_paper} papers each. Please decrease 'n_session' or 'min_paper'.")

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
            
            session_name = generate_session_title(paper_titles)
            
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
        raise HTTPException(status_code=500, detail=str(e))


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
            raise HTTPException(status_code=400, detail="Session has no papers. Cannot analyze context.")

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
            raise HTTPException(status_code=500, detail="Failed to generate AI embedding.")

        rpc_params = {
            "query_embedding": session_vector,
            "match_threshold": threshold,
            "match_count": limit,
            "excluded_user_ids": list(set(excluded_author_ids)) 
        }

        search_result = supabase_client.rpc("match_chair_candidates", rpc_params).execute()

        if hasattr(search_result, 'error') and search_result.error:
            logger.error(f"Supabase RPC Error: {search_result.error}")
            raise HTTPException(status_code=500, detail="Database search failed.")

        recommendations = [
            ChairRecommendation(
                user_id=r['user_id'],
                full_name=r['full_name'],
                email=r['email'],
                organization=r.get('organization'),
                similarity_score=round(r['similarity'], 3)
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/google-auth-url", response_model=SessionAuthResponse)
async def get_google_auth_url(email: str = Query(..., description="Email of the user to link with Google Meet"), redirect_uri: str = Query("http://localhost:8080/sessions/google-oauth-callback")):
    try:
        res = meet_service.get_auth_url(redirect_uri, email)
        return res
    except Exception as e:
        logger.error(f"Generate Google Auth URL failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate authorization URL: {str(e)}")

@router.get("/sessions/google-oauth-callback")
async def google_oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="State containing the user email"),
    redirect_uri: str = Query("http://localhost:8080/sessions/google-oauth-callback")
):
    try:
        # 1. Decode email from state
        if not state.startswith("email_"):
            raise HTTPException(status_code=400, detail="Invalid session ID or missing email.")
        registered_email = state.split("_", 1)[1]
        
        # 2. Exchange code for token
        token_data = meet_service.fetch_token(redirect_uri, code)
        refresh_token = token_data.get("refresh_token")
        google_email = token_data.get("google_email")
        
        if not refresh_token:
             logger.warning("Could not retrieve refresh_token (user may have already granted access).")

        # 3. Check User in DB
        user_res = supabase_client.table("users").select("user_id").eq("email", registered_email).single().execute()
        
        if not user_res.data:
             raise HTTPException(status_code=404, detail="User account not found in the system.")
             
        # 4. Save refresh_token to DB
        if refresh_token:
            res = supabase_client.table("profiles").update({
                "google_refresh_token": refresh_token
            }).eq("user_id", user_res.data["user_id"]).execute()

            if hasattr(res, 'error') and res.error:
                raise HTTPException(status_code=500, detail=f"Database Update Error: {res.error}")


        # 5. Return success page
        html_content = """
        <html>
        <head>
            <title>Authentication Successful</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b; }
                .card { background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); text-align: center; max-width: 450px; }
                h1 { color: #10b981; margin-bottom: 1rem; }
                p { margin-bottom: 2rem; color: #475569; }
                button, .btn { display: inline-block; text-decoration: none; background: #4f46e5; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s;}
                button:hover, .btn:hover { background: #4338ca; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✓ Success!</h1>
                <p>You have successfully authorized Google.</p>
                <div id="action-container">
                    <button onclick="handleReturn()">Return to application</button>
                </div>
            </div>
            <script>
                function handleReturn() {
                    localStorage.setItem('google-auth-status', 'success_' + Date.now());

                    if (window.opener) {
                        try {
                            window.opener.postMessage({ type: 'google-auth-success' }, '*');
                        } catch (e) {}
                        window.close();
                    } else {
                        window.location.href = "http://192.168.20.12:3000/profile";
                    }
                }

                setTimeout(() => handleReturn(), 1000);
            </script>
        </body>
        </html>
        """
        
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content)

    except Exception as e:
        logger.error(f"Google OAuth Callback error: {e}")
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")

@router.post("/sessions/{session_id}/create-meet", response_model=MeetCreationResponse)
async def create_google_meet_for_session(session_id: int, request: MeetCreationRequest):
    try:
        # 1. Query Database for user refresh_token
        user_res = supabase_client.table("users").select("user_id").eq("email", request.email).single().execute()
        if not user_res.data:
            raise HTTPException(status_code=400, detail="User not found.")

        profile_res = supabase_client.table("profiles").select("google_refresh_token").eq("user_id", user_res.data["user_id"]).single().execute()
        
        if not profile_res.data or not profile_res.data.get("google_refresh_token"):
             raise HTTPException(status_code=400, detail="Account not linked with Google. Please authorize first.")
             
        user_refresh_token = profile_res.data.get("google_refresh_token")

        
        # 2. Query Session info
        sess_res = supabase_client.table("sessions").select("session_name, start_time, end_time").eq("session_id", session_id).single().execute()
        
        if not sess_res.data:
            raise HTTPException(status_code=404, detail="Session not found.")
            
        sess_data = sess_res.data
        if not sess_data.get("start_time") or not sess_data.get("end_time"):
            raise HTTPException(status_code=400, detail="Session start or end time is missing. Please update session time.")
        
        summary = f"[{sess_data.get('session_name', 'Conference')}] - Virtual Room"
        description = f"Virtual Session hosted via DATN Conference System."
        
        event_res = meet_service.create_meet_event(
            summary=summary,
            description=description,
            start_time=sess_data.get("start_time"),
            end_time=sess_data.get("end_time"),
            user_refresh_token=user_refresh_token
        )
        
        # Try to save both link and event_id. If column google_event_id is missing, fallback to just meet_link.
        try:
            supabase_client.table("sessions").update({
                "meet_link": event_res["meet_link"],
                "google_event_id": event_res.get("event_id") or event_res.get("id"),
                "is_meet_active": True
            }).eq("session_id", session_id).execute()
        except Exception as e:
            logger.warning(f"Database update with google_event_id or is_meet_active failed, falling back to meet_link only: {e}")
            try:
                supabase_client.table("sessions").update({
                    "meet_link": event_res["meet_link"]
                }).eq("session_id", session_id).execute()
            except Exception as e2:
                logger.error(f"Critical Database error saving meet_link: {e2}")

        return MeetCreationResponse(
            event_id=event_res.get("event_id") or event_res.get("id") or "",
            meet_link=event_res["meet_link"],
            html_link=event_res.get("html_link") or ""
        )
    except Exception as e:
        logger.error(f"Error creating Meet event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}/meet")
async def delete_google_meet_for_session(session_id: int, email: str = None):
    try:
        # 1. Fetch Google account info via email (more reliable than joining tables with missing columns)
        user_refresh_token = None
        if email:
            user_res = supabase_client.table("users").select("user_id").eq("email", email).single().execute()
            if user_res.data:
                profile_res = supabase_client.table("profiles").select("google_refresh_token").eq("user_id", user_res.data["user_id"]).single().execute()
                if profile_res.data:
                    user_refresh_token = profile_res.data.get("google_refresh_token")

        # 2. Get google_event_id from session (handle missing column gracefully)
        google_event_id = None
        try:
            sess_res = supabase_client.table("sessions").select("google_event_id").eq("session_id", session_id).single().execute()
            if sess_res.data:
                google_event_id = sess_res.data.get("google_event_id")
        except:
            logger.warning("google_event_id column missing in sessions table.")

        # 3. Call Google API if we have both
        if google_event_id and user_refresh_token:
            try:
                meet_service.delete_meet_event(google_event_id, user_refresh_token)
            except Exception as e:
                logger.error(f"Google Calendar API deletion failed: {e}")

        # 4. Clear data from DB (handle missing column gracefully)
        try:
             supabase_client.table("sessions").update({
                 "meet_link": None,
                 "google_event_id": None
             }).eq("session_id", session_id).execute()
        except:
             # Fallback to only clearing meet_link
             supabase_client.table("sessions").update({
                 "meet_link": None
             }).eq("session_id", session_id).execute()

        return {"status": "success", "message": "Google Meet link removed successfully."}

    except Exception as e:
        logger.error(f"Error removing Meet event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/sessions/{session_id}/toggle-meet")
async def toggle_meet_active(session_id: int, is_active: bool = Query(..., description="Active status of the room")):
    try:
        res = supabase_client.table("sessions").update({
            "is_meet_active": is_active
        }).eq("session_id", session_id).execute()
        
        if hasattr(res, 'error') and res.error:
             # Just in case the column doesn't exist yet
             raise HTTPException(status_code=400, detail="Could not update status. Check database schema.")
             
        return {"status": "success", "is_meet_active": is_active}
    except Exception as e:
        logger.error(f"Error toggling meet status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
