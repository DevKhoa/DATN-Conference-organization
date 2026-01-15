import os
import shutil
import pandas as pd 
import numpy as np 
import tempfile
import pathlib

from k_means_constrained import KMeansConstrained

from utils import BUCKET_NAME, FORMAT_REVIEWER
from utils import logger, language_client, supabase_client, storage_client, genai_client

import uvicorn
from fastapi import File, Query, Form, FastAPI, HTTPException, UploadFile
from typing import Optional, List

from schema import PaperDetailResponse, PaperSummary, AutoSessionRequest, NLPAnalysisResult
from file_storage import StorageClient
from embeddings import EmbeddingPipeline
from auto_session import get_batch_embeddings, generate_session_title
from reviews_analysis import analyze_entities, analyze_sentiment, calculate_depth_score

app = FastAPI(title="Conference Paper API")
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
            
            # link_data = []
            # for idx, pid in enumerate(paper_ids):
            #     link_data.append({
            #         "session_id": new_session_id,
            #         "paper_id": int(pid),
            #         "presentation_order": idx + 1
            #     })

            # supabase_client.table("session_papers").insert(link_data).execute()
            
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
async def trigger_embedding_sync(
    paper_id: int,
    version_id: int,
    file: UploadFile = File(...)
):
    temp_file_path = None

    try:
        suffix = os.path.splitext(file.filename)[1]
        if not suffix: suffix = ".pdf"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file_path = tmp.name

        status = embedding_service.run_pipeline(paper_id, version_id, temp_file_path)
        if status:
            logger.info(f"Embedding finished for Paper {paper_id}")
            return {
                "status": "success",
                "message": "Document embedded successfully.",
                "paper_id": paper_id,
                "version_id": version_id
            }
        else:
            logger.error(f"Error while embedding")
            return {
                "status": "failed",
                "message": "Failed to embed document",
                "paper_id": paper_id,
                "version_id": version_id
            }
        

    except Exception as e:
        logger.error(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/papers/check-plagiarism")
async def check_plagiarism_api(
    threshold: float = Form(0.8), 
    file: UploadFile = File(...)
):
       
    try:
        original_name = os.path.basename(file.filename)
        clean_filename = original_name.lower().replace(" ", "_")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, clean_filename)

            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"Checking plagiarism for: {clean_filename} (Threshold: {threshold})")

            result = embedding_service.check_plagiarism(temp_file_path, threshold=threshold)

            if "error" in result:
                logger.error(f"Plagiarism Check Failed: {result['error']}")
                raise HTTPException(status_code=400, detail=result['error'])

            return {
                "message": "Check completed",
                "filename": clean_filename,
                "input_threshold": threshold,
                "analysis_result": result 
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/papers/review-quality")
async def review_paper_quality(file: UploadFile = File(...)):
   
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_path = None
    google_file = None

    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_path = tmp.name
        
        logger.info(f"Saved temp file: {temp_path}")

        logger.info("Uploading to Google GenAI...")

        file_path = pathlib.Path(temp_path)


        google_file = genai_client.files.upload(
            file=file_path,
        )

        logger.info(f"File uploaded to Google: {google_file.name}")

        logger.info("Analyzing document...")
        response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[google_file, FORMAT_REVIEWER]
        )

        return {
            "status": "success",
            "filename": file.filename,
            "review_result": response.text
        }

    except Exception as e:
        logger.error(f"Review Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
            logger.info("Local temp file deleted.")
            
        if google_file:
            try:
                genai_client.files.delete(name=google_file.name)
                logger.info(f"Remote Google file deleted: {google_file.name}")
            except Exception as e:
                logger.warning(f"Failed to delete remote file: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)