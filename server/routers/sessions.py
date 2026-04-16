import pandas as pd
import numpy as np
from k_means_constrained import KMeansConstrained

from fastapi import APIRouter, HTTPException, Query, Path
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
async def get_google_auth_url(email: str = Query(..., description="Email của người dùng cần liên kết Google Meet"), redirect_uri: str = Query("http://localhost:8080/sessions/google-oauth-callback")):
    try:
        res = meet_service.get_auth_url(redirect_uri, email)
        return res
    except Exception as e:
        logger.error(f"Error getting Google Auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/google-oauth-callback")
async def google_oauth_callback(request: GoogleMeetCallbackRequest, redirect_uri: str = Query("http://localhost:8080/sessions/google-oauth-callback")):
    try:
        # Giải mã email từ state
        state_str = request.state
        if not state_str.startswith("email_"):
            raise HTTPException(status_code=400, detail="Trạng thái state không hợp lệ. Không tìm thấy Email người dùng.")
        registered_email = state_str.split("_", 1)[1]
        
        token_data = meet_service.fetch_token(redirect_uri, request.code)
        refresh_token = token_data.get("refresh_token")
        google_email = token_data.get("google_email")
        
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Không lấy được refresh_token từ Google.")

        # Truy vấn Database xem user có tồn tại không (Đảm bảo an toàn)
        user_res = supabase_client.table("users").select("user_id").eq("email", registered_email).single().execute()
        
        if not user_res.data:
             raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng tương ứng với email này trong hệ thống DATN.")
             
        # So sánh Email Google Meet và Email đăng ký DATN System
        if google_email and google_email.lower() != registered_email.lower():
            raise HTTPException(status_code=400, detail=f"Tài khoản không khớp! Vui lòng uỷ quyền đúng bằng Google Account đã đăng ký ({registered_email}). Bạn đang dùng: {google_email}")

        # Lưu refresh_token vào DB cho user đó bằng Email
        res = supabase_client.table("users").update({
            "google_refresh_token": refresh_token
        }).eq("email", registered_email).execute()

        # Update Supabase Python SDK đôi khi fail im lặng nếu user ID không tồn tại
        if hasattr(res, 'error') and res.error:
            raise HTTPException(status_code=500, detail=f"Database Update Error: {res.error}")

        return {
            "status": "success",
            "message": "Token fetched successfully. LƯU Ý: Khung lưu trữ Token đã được tự động cấp vào Database của tài khoản.",
            "token_data": token_data
        }
    except Exception as e:
        logger.error(f"Error in Google OAuth Callback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/create-meet", response_model=MeetCreationResponse)
async def create_google_meet_for_session(session_id: int, request: MeetCreationRequest):
    try:
        # 1. Truy vấn Database để lấy refresh_token của User này
        user_res = supabase_client.table("users").select("google_refresh_token").eq("email", request.email).single().execute()
        
        if not user_res.data or not user_res.data.get("google_refresh_token"):
             raise HTTPException(status_code=400, detail="Tài khoản chưa được liên kết với Google. Yêu cầu frontend gọi API Authorize.")
             
        user_refresh_token = user_res.data.get("google_refresh_token")
        
        # 2. Truy vấn Thông tin Session từ Database (để lấy start_time, end_time thực tế)
        sess_res = supabase_client.table("sessions").select("session_name, start_time, end_time").eq("session_id", session_id).single().execute()
        
        if not sess_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy Session này trong hệ thống.")
            
        sess_data = sess_res.data
        if not sess_data.get("start_time") or not sess_data.get("end_time"):
            raise HTTPException(status_code=400, detail="Session chưa được gán thời gian Bắt đầu và Kết thúc! Vui lòng cập nhật thời gian cho Session trước khi sinh phòng Meet.")
        
        # summary tên event
        summary = f"[{sess_data.get('session_name', 'Hội nghị')}] - Virtual Room"
        description = f"Virtual Session hosted via DATN Conference System."
        
        event_res = meet_service.create_meet_event(
            summary=summary,
            description=description,
            start_time=sess_data.get("start_time"),
            end_time=sess_data.get("end_time"),
            user_refresh_token=user_refresh_token
        )
        
        # Lấy được link -> Lưu vào Supabase Database
        try:
            update_db = supabase_client.table("sessions").update({
                "meet_link": event_res["meet_link"]
            }).eq("session_id", session_id).execute()
        except:
            pass # Bỏ qua lỗi DB nếu CSDL chưa có cột meet_link
            
        return MeetCreationResponse(
            event_id=event_res["event_id"],
            meet_link=event_res["meet_link"],
            html_link=event_res["html_link"]
        )
    except Exception as e:
        logger.error(f"Error creating Meet event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

