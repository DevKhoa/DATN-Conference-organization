import os
import shutil
import pandas as pd 
import numpy as np 
import tempfile
import pathlib
import uuid
import re
import json

from k_means_constrained import KMeansConstrained

from utils import BUCKET_NAME, FORMAT_REVIEWER, MAX_CV_SIZE_MB, EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, REVIEWER_ROLE_ID, CHAIR_ROLE_ID, ALLOWED_IMAGE_EXTENSIONS, SERP_API_KEY, SCHOLAR_PROMPT, MODEL
from utils import logger, language_client, supabase_client, storage_client, genai_client

from utils import valid_check, clean_text, extract_text_from_pdf, is_image_file

from google.genai import types

import uvicorn
from fastapi import File, Query, Form, FastAPI, HTTPException, UploadFile, BackgroundTasks, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import serpapi

from schema import PaperDetailResponse, PaperSummary, AutoSessionRequest, NLPAnalysisResult, PaperFormatReview, UserDescriptionRequest, EmailSchema, ChairRecommendation, SessionChairResponse, ScholarAuthor, ScholarImportRequest
from file_storage import StorageClient
from embeddings import EmbeddingPipeline
from auto_session import get_batch_embeddings, generate_session_title
from reviews_analysis import analyze_entities, analyze_sentiment, calculate_depth_score
from my_email import send_email

// HOST = '0.0.0.0'
HOST = 'localhost'
PORT = 8080

app = FastAPI(title="Conference Paper API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)
embedding_service = EmbeddingPipeline()

@app.get("/papers/{paper_id}", response_model=PaperDetailResponse)
async def get_paper_details(paper_id: int):
    logger.info(f"Received request for paper_id: {paper_id}")
    
    try:
        
        query = supabase_client.table("papers").select(
            "paper_id, title, abstract, status, created_at, "
            "author:users!primary_author_id(full_name, email, organization), "
            "conference:conferences(conf_name, is_active), "
            "versions:paper_versions(version_id, version_number, file_path, is_final, plagiarism_safe, format_ok, upload_date), "
            "reviews:reviews(review_id, score, recommendation, status), "
            "session_links:session_papers(presentation_order, session:sessions(session_name, start_time, room_location))"
        ).eq("paper_id", paper_id).limit(1)

        response = query.execute()

        if not response.data:
            logger.warning(f"Paper ID {paper_id} not found in database.")
            raise HTTPException(status_code=404, detail="Paper not found")

        paper_data = response.data[0]
        
        logger.debug(f"Retrieved data for paper {paper_id}: {paper_data.get('title')}")
        
        return paper_data

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Internal Server Error processing paper {paper_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.get("/papers", response_model=List[PaperSummary])
async def list_papers(
    n: Optional[int] = Query(None, description="Limit number of paper, default get all")
):
    if n:
        logger.info(f"Received request to list TOP {n} papers.")
    else:
        logger.info("Received request to list ALL papers.")

    try:
        query = supabase_client.table("papers").select("paper_id, title, abstract")

        if n is not None:
            query = query.limit(n)
        
        response = query.execute()
        
        data = response.data
        count = len(data)
        
        logger.info(f"Successfully retrieved {count} papers.")
        
        if count > 0:
            logger.debug(f"Sample data: {data[0]['title']}")
            
        return data

    except Exception as e:
        logger.error(f"Error listing papers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/sessions/auto-generate")
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

@app.post("/reviews/{review_id}/analyze-nlp", response_model=NLPAnalysisResult)
async def analyze_review_nlp(review_id: int):
    if not language_client:
        raise HTTPException(status_code=500, detail="Google Language Client not configured.")

    try:
        res = supabase_client.table("reviews").select("comments").eq("review_id", review_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Review ID not found")
        
        text_content = res.data[0].get("comments", "")
        
        if not text_content or len(text_content.strip()) < 5:
             raise HTTPException(status_code=400, detail="Comment content is too short or empty.")
        
        sentiments = analyze_sentiment(text_content)
        entities = analyze_entities(text_content)        
        depth_score = calculate_depth_score(text_content, sentiments, entities)

        sentiment_data = {
            "score": round(sentiments.score, 3),       
            "magnitude": round(sentiments.magnitude,3),
            "entity_count": len(entities)     
        }

        upsert_data = {
            "review_id": review_id,
            "ai_depth_score": depth_score,
            "ai_sentiment": sentiment_data, 
        }

        existing = supabase_client.table("review_ai_metrics").select("metric_id").eq("review_id", review_id).execute()
        
        if existing.data:
            metric_id = existing.data[0]['metric_id']
            supabase_client.table("review_ai_metrics").update(upsert_data).eq("metric_id", metric_id).execute()
        else:
            supabase_client.table("review_ai_metrics").insert(upsert_data).execute()


        return {
            "review_id": review_id,
            "depth_score": depth_score,
            "sentiment_score": sentiments.score,
            "sentiment_magnitude": sentiments.magnitude,
            "entity_count": len(entities),
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"NLP Analysis Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/papers/{paper_id}/{version_id}/upload")
async def upload_paper(
    paper_id: str,
    version_id: str,
    file: UploadFile = File(...)
):
    try:
        original_name = os.path.basename(file.filename)
        clean_filename = original_name.lower().replace(" ", "_")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, clean_filename)

            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            logger.info(f"Saved temp file at: {temp_file_path}")

            public_url = storage_service.upload_paper_storage(
                paper_id=paper_id,
                version_id=version_id,
                file_path=temp_file_path
            )

            if not public_url:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to upload file to storage"
                )
            
            try:
                update_res = supabase_client.table("paper_versions").update({
                    "file_path": public_url,
                }).eq("version_id", int(version_id)).eq("paper_id", int(paper_id)).execute()

                if not update_res.data:
                    logger.warning(f"File uploaded to GCS but Version ID {version_id} not found in DB to update.")
                    raise HTTPException(status_code=404, detail="Version ID not found in database")
                logger.info(f"Database updated for Version {version_id}")

            except Exception as db_e:
                logger.error(f"Database Update Error: {db_e}")
                raise HTTPException(status_code=500, detail="Uploaded to Storage but failed to update Database.")

            return {
                "message": "Upload successful",
                "paper_id": paper_id,
                "version_id": version_id,
                "filename": clean_filename,
                "url": public_url
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.get("/storage/{paper_id}/files")
async def get_files_by_paper(paper_id: str):
    
    if not storage_service:
        raise HTTPException(status_code=500, detail="Storage service not initialized")
    files = storage_service.get_paper_files(paper_id=paper_id)
    if not files:
        return {"paper_id": paper_id, "files": [], "message": "No files found"}
    return {"paper_id": paper_id, "count": len(files), "files": files}


@app.get("/storage/{paper_id}/versions/{version_id}/files")
async def get_files_by_version(paper_id: str, version_id: str):
   
    if not storage_service:
        raise HTTPException(status_code=500, detail="Storage service not initialized")
    files = storage_service.get_paper_files(paper_id=paper_id, version_id=version_id)
    if not files:
         return {"paper_id": paper_id, "version_id": version_id, "files": [], "message": "No files found for this version"}
    return {"paper_id": paper_id, "version_id": version_id, "count": len(files), "files": files}

@app.post("/papers/{paper_id}/{version_id}/embed")
async def trigger_embedding_from_gcs(
    paper_id: int,
    version_id: int
):
    temp_file_path = None
    
    paper_id = str(paper_id)
    version_id = str(version_id)

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            
            temp_file_path = storage_service.download_paper_local(
                paper_id=paper_id, 
                version_id=version_id, 
                destination_dir=temp_dir
            )

            if not temp_file_path:
                raise HTTPException(status_code=404, detail="No PDF file found in Storage for this version.")

            status = embedding_service.run_pipeline(paper_id, version_id, temp_file_path)
            
            if status:
                logger.info(f"Embedding finished for Paper {paper_id}")
                return {
                    "status": "success",
                    "message": "Document embedded successfully from GCS.",
                    "paper_id": paper_id,
                    "version_id": version_id
                }
            else:
                logger.error(f"Error while embedding")
                raise HTTPException(status_code=500, detail="Failed to embed document")

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/papers/{paper_id}/{version_id}/check-plagiarism")
async def check_plagiarism_api(
    paper_id: int, 
    version_id: int,
    threshold: float = Form(0.8) 
):
    
    try:
        logger.info(f"Request Check Plagiarism (DB) for Paper {paper_id} - Ver {version_id}")

        result = embedding_service.check_plagiarism_db(
            paper_id=paper_id, 
            version_id=version_id, 
            threshold=threshold
        )

        if "error" in result:
            if "No embeddings found" in result["error"]:
                 raise HTTPException(status_code=404, detail=result['error'])
            
            logger.error(f"Plagiarism Check Failed: {result['error']}")
            raise HTTPException(status_code=500, detail=result['error'])

        return {
            "message": "Check completed using existing embeddings",
            "paper_id": paper_id,
            "version_id": version_id,
            "input_threshold": threshold,
            "analysis_result": result 
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/papers/{paper_id}/{version_id}/review-format")
async def review_paper_quality(
    paper_id: int, 
    version_id: int
):
   
    google_file = None
    
    paper_id = str(paper_id)
    version_id = str(version_id)

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            
            logger.info(f"Downloading paper {paper_id} (ver {version_id}) from GCS...")
            local_file_path = storage_service.download_paper_local(
                paper_id=paper_id, 
                version_id=version_id, 
                destination_dir=temp_dir
            )

            if not local_file_path:
                raise HTTPException(status_code=404, detail="No PDF file found in Storage for this version.")
            
            logger.info(f"File downloaded to: {local_file_path}")

            logger.info("Uploading to Google GenAI...")
            file_path_obj = pathlib.Path(local_file_path)
            
            google_file = genai_client.files.upload(
                file=file_path_obj,
            )

            logger.info(f"File uploaded to Google GenAI: {google_file.name}")

            logger.info("Analyzing document with Gemini...")
            response = genai_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[google_file, FORMAT_REVIEWER],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": PaperFormatReview.model_json_schema(),
                },
            )
            return {
                "status": "success",
                "paper_id": paper_id,
                "version_id": version_id,
                "review_result": response.text
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Review Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if google_file:
            try:
                genai_client.files.delete(name=google_file.name)
                logger.info(f"Remote Google file deleted: {google_file.name}")
            except Exception as e:
                logger.warning(f"Failed to delete remote file: {e}")

@app.post("/users/{user_id}/description")
async def update_user_description_text(
    user_id: int,
    request: UserDescriptionRequest
):
    
    try:
        text_content = request.description.strip()
        
        if not text_content:
            raise HTTPException(status_code=400, detail="Description text cannot be empty.")
        
        if len(text_content) > 10000:
             raise HTTPException(status_code=400, detail="Description is too long (max 10000 chars).")

        logger.info(f"Generating embedding for User {user_id} based on text input...")

        try:
            embed_response = genai_client.models.embed_content(
                model=EMBEDDING_MODEL_NAME, 
                contents=text_content,
                config=types.EmbedContentConfig(
                    task_type="SEMANTIC_SIMILARITY",
                    output_dimensionality=VECTOR_DIMENSION 
                )
            )
            embedding_vector = embed_response.embeddings[0].values

        except Exception as e:
            logger.error(f"GenAI Embedding Failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

        response = supabase_client.table("users").update({
            "description": text_content,
            "description_embed": embedding_vector
        }).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail=f"User ID {user_id} not found.")

        logger.info(f"Successfully updated description for User {user_id}")

        return {
            "status": "success",
            "message": "User description updated successfully.",
            "user_id": user_id,
            "text_length": len(text_content)
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error Update Description: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/upload-cv")
async def upload_user_cv(
    user_id: int,
    file: UploadFile = File(...)
):
    try:
        original_name = os.path.basename(file.filename)
        clean_filename = original_name.lower().replace(" ", "_")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = pathlib.Path(temp_dir) / clean_filename

            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"Processing CV for User {user_id}: {temp_file_path}")

            validation = valid_check(temp_file_path, MAX_CV_SIZE_MB, ['.pdf'])
            if not validation['valid']:
                logger.warning(f"Invalid file: {validation['code']}")
                return {
                    "status": "error",
                    "message": f"File validation failed: {validation['code']}"
                }

            raw_text = extract_text_from_pdf(temp_file_path)
            
            if not raw_text.strip():
                return {
                    "status": "error", 
                    "message": "Could not extract text from PDF. The file might be an image-only PDF."
                }
                
            description_text = clean_text(raw_text)

            logger.info("Generating embedding for CV description...")
            try:
                embed_response = genai_client.models.embed_content(
                    model=EMBEDDING_MODEL_NAME,
                    contents=description_text,
                    config=types.EmbedContentConfig(
                        task_type="SEMANTIC_SIMILARITY", 
                        output_dimensionality=VECTOR_DIMENSION
                    )
                )
                embedding_vector = embed_response.embeddings[0].values

            except Exception as e:
                logger.error(f"GenAI Embedding Failed: {e}")
                return {
                    "status": "error",
                    "message": f"Failed to generate embedding: {str(e)}"
                }

            response = supabase_client.table("users").update({
                "description": description_text,
                "description_embed": embedding_vector 
            }).eq("user_id", user_id).execute()

            if not response.data:
                return {
                    "status": "error",
                    "message": f"User ID {user_id} not found."
                }

            logger.info(f"Updated description and embedding for User {user_id}")

            return {
                "status": "success",
                "message": "CV uploaded, text extracted, and embedding updated successfully.",
                "extracted_length": len(description_text)
            }

    except Exception as e:
        logger.error(f"API Error Upload CV: {str(e)}")
        return {
            "status": "error", 
            "message": f"Internal Server Error: {str(e)}"
        }

@app.post("/papers/{paper_id}/recommend-reviewers")
async def recommend_reviewers_avg_method(
    paper_id: int,
    limit: int = Query(5, description="Number of reivewers"),
   
):
    logger.info(f"Finding reviewers for Paper ID: {paper_id} using Avg Chunk Similarity")

    try:

        chunks_check = supabase_client.table("paper_chunks").select("id", count="exact").eq("paper_id", paper_id).limit(1).execute()
        if chunks_check.count == 0:
             raise HTTPException(status_code=404, detail="Paper has no chunks. Please run embedding first.")

        rpc_params = {
            'target_paper_id': paper_id,
            'match_count': limit,
            'required_role_id': REVIEWER_ROLE_ID
        }

        result = supabase_client.rpc('match_reviewers_avg_chunk', rpc_params).execute()

        if hasattr(result, 'error') and result.error:
             raise HTTPException(status_code=500, detail=str(result.error))

        reviewers = result.data

        return {
            "status": "success",
            "method": "average_chunk_similarity",
            "paper_id": paper_id,
            "count": len(reviewers),
            "recommendations": reviewers
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Recommend Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sessions/{session_id}/recommend-chair", response_model=SessionChairResponse)
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

@app.post("/users/{user_id}/upload-avatar")
async def upload_user_avatar_api(
    user_id: int,
    file: UploadFile = File(...)
):
    temp_file_path = None
    try:
        if not is_image_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {ALLOWED_IMAGE_EXTENSIONS}"
            )

        original_name = file.filename
        
        import uuid
        random_name = f"{uuid.uuid4()}_{original_name}"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, random_name)
            
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"Processing avatar for User {user_id}")

            public_url = storage_service.upload_user_avatar(
                user_id=user_id, 
                file_path=temp_file_path,
                original_filename=original_name
            )

            if not public_url:
                raise HTTPException(status_code=500, detail="Failed to upload avatar to storage")

            try:
                update_res = supabase_client.table("users").update({
                    "avatar_url": public_url,
                }).eq("user_id", user_id).execute()

                if not update_res.data:
                    logger.warning(f"Avatar uploaded but User ID {user_id} not found to update.")
                    raise HTTPException(status_code=404, detail="User not found")
                
                logger.info(f"Database updated avatar for User {user_id}")

            except Exception as db_e:
                logger.error(f"Database Update Error: {db_e}")
                raise HTTPException(status_code=500, detail="Uploaded image but failed to update User profile.")

            return {
                "status": "success",
                "user_id": user_id,
                "message": "Avatar updated successfully",
                "avatar_url": public_url
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Avatar Upload API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/send-email")
async def send_email_endpoint(email_data: EmailSchema, background_tasks: BackgroundTasks):
  
    try:
        logger.info(f"API Request received for: {email_data.recipient_email}")

        background_tasks.add_task(
            send_email, 
            recipient_email=email_data.recipient_email, 
            subject=email_data.subject, 
            body=email_data.body
        )

        return {
            "status": "success", 
            "message": "Email has been queued for sending.",
            "recipient": email_data.recipient_email
        }

    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/storage/upload-generic")
async def upload_generic_file_api(
    gcs_path: str = Form(..., description="Destination path on GCS"),
    file: UploadFile = File(...)
):
    temp_file_path = None
    try:
      
        original_name = file.filename
        clean_name = original_name.replace(" ", "_")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, clean_name)
            
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"📂 Saved temp file: {temp_file_path}")
            logger.info(f"🚀 Uploading to GCS path: {gcs_path}")

            public_url = storage_service.upload_generic_file(
                local_file_path=temp_file_path,
                gcs_destination_path=gcs_path
            )

            if not public_url:
                raise HTTPException(status_code=500, detail="Failed to upload file to GCS")

            return {
                "status": "success",
                "message": "File uploaded successfully",
                "original_filename": original_name,
                "gcs_path": gcs_path,
                "public_url": public_url
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Generic Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conferences/{conf_id}/banners")
async def add_conference_banner(
    conf_id: int,
    file: UploadFile = File(...)
):
    temp_file_path = None
    try:
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
             raise HTTPException(status_code=400, detail="Only accept images extension (png, jpg, jpeg, webp)")

        file_ext = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        gcs_path = f"conferences/{conf_id}/assets/{unique_filename}"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, unique_filename)
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            public_url = storage_service.upload_blob(temp_file_path, gcs_path)
            
            if not public_url:
                raise HTTPException(status_code=500, detail="Error uploading GCS Storage")

      
        res = supabase_client.table("conferences").select("banner_urls").eq("conf_id", conf_id).single().execute()
        
        current_banners = res.data.get("banner_urls")
        
        if current_banners is None:
            current_banners = []
        
        current_banners.append(public_url)

        update_res = supabase_client.table("conferences").update({
            "banner_urls": current_banners
        }).eq("conf_id", conf_id).execute()

        return {
            "status": "success",
            "message": "banner added",
            "url": public_url,
            "all_banners": current_banners
        }

    except Exception as e:
        logger.error(f"Add Banner Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conferences/{conf_id}/banners")
async def remove_conference_banner(
    conf_id: int,
    url_to_remove: str = Body(..., embed=True, description="Full URL of image to delete")
):
    
    try:
        res = supabase_client.table("conferences").select("banner_urls").eq("conf_id", conf_id).single().execute()
        current_banners = res.data.get("banner_urls")

        if not current_banners or url_to_remove not in current_banners:
            raise HTTPException(status_code=404, detail="URL not found or banner not in this conference")

        deleted = storage_service.delete_file(url_to_remove)
        
        if not deleted:
            logger.warning(f"File {url_to_remove} not found in GCS")

        new_banners = [url for url in current_banners if url != url_to_remove]

        supabase_client.table("conferences").update({
            "banner_urls": new_banners
        }).eq("conf_id", conf_id).execute()

        return {
            "status": "success",
            "message": "Banner removed sucessfully",
            "remaining_banners": new_banners
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Remove Banner Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/import-scholar")
async def import_scholar_profile(user_id: int, request: ScholarImportRequest):
    logger.info(f"Received Google Scholar import request for User {user_id}")
    
    m = re.search(r"user=([^&]+)", request.scholar_url)
    author_id = m.group(1) if m else None
    
    if not author_id:
        logger.warning(f"Invalid Scholar URL provided for User {user_id}: {request.scholar_url}")
        raise HTTPException(status_code=400, detail="Invalid Google Scholar URL. Could not extract author ID.")

    try:
        logger.info(f"Fetching data from SerpApi for Author ID: {author_id}")
        params = {
            "engine": "google_scholar_author",
            "author_id": author_id,
            "api_key": SERP_API_KEY
        }
        
        api_response = serpapi.search(params)
        
        if 'error' in api_response:
             logger.error(f"SerpApi Error: {api_response['error']}")
             raise HTTPException(status_code=500, detail=f"Failed to fetch data from Scholar: {api_response['error']}")

        author_info = api_response.get('author', {})
        articles_list = api_response.get('articles', [])
        
        if not author_info:
            raise HTTPException(status_code=404, detail="Author not found on Google Scholar")

        author_name = author_info.get('name', 'Unknown')
        author_affiliations = author_info.get('affiliations', 'None')
        interests = [interest['title'] for interest in author_info.get('interests', [])]
        
        articles = [{'title': article.get('title'), 'venues': article.get('publication')} for article in articles_list] 
        articles_str = json.dumps(articles, indent=2)

        logger.info("Analyzing articles...")
        AI_response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[SCHOLAR_PROMPT, articles_str],
            config={
                "response_mime_type": "application/json",
                "response_json_schema": ScholarAuthor.model_json_schema(),
            },
        )
        
        research_bio = json.loads(AI_response.text)

        author_profile = f"""
        {author_name.upper()}
        Affiliations: {author_affiliations}

        Research Interests
        {', '.join(interests).title()}

        Research Fields:
        {'\n'.join([f"- {field}" for field in research_bio.get('research_fields', [])])}

        Research Directions
        {'\n'.join([f"- {direction}" for direction in research_bio.get('research_directions', [])])}

        Research Themes
        {'\n'.join([f"- {theme}" for theme in research_bio.get('research_themes', [])])}
        """
        cleaned_profile = author_profile.replace('-', '').replace('\n', ' ').strip()
        
        cleaned_profile = re.sub(r'\s+', ' ', cleaned_profile)

        logger.info("Generating embedding for the cleaned profile...")
        embed_response = genai_client.models.embed_content(
            model=EMBEDDING_MODEL_NAME, 
            contents=cleaned_profile,
            config=types.EmbedContentConfig(
                task_type="SEMANTIC_SIMILARITY",
                output_dimensionality=VECTOR_DIMENSION 
            )
        )
        embedding_vector = embed_response.embeddings[0].values

        logger.info(f"Updating Supabase for User {user_id}...")
        update_res = supabase_client.table("users").update({
            "description": author_profile.strip(),
            "description_embed": embedding_vector
        }).eq("user_id", user_id).execute()

        if not update_res.data:
            logger.warning(f"User ID {user_id} not found in database to update.")
            raise HTTPException(status_code=404, detail=f"User ID {user_id} not found.")

        logger.info(f"Successfully processed and updated Scholar profile for User {user_id}")

        return {
            "status": "success",
            "message": "Google Scholar profile analyzed and saved successfully.",
            "user_id": user_id,
            "author_name": author_name,
            "profile_length": len(author_profile.strip())
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error Import Scholar Profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error while importing Scholar profile")

if __name__ == "__main__":
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
