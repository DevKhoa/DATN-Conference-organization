import os
import shutil
import tempfile
import pathlib
import uuid
from typing import Optional, List

from fastapi import APIRouter, File, Query, Form, HTTPException, UploadFile, Body
from pydantic import BaseModel
from packages.schema import PaperDetailResponse, PaperSummary, PaperFormatReview
from packages.file_storage import StorageClient
from packages.embeddings import EmbeddingPipeline
from packages.utils import Logger, supabase_client, storage_client, genai_client, BUCKET_NAME, FORMAT_REVIEWER, REVIEWER_ROLE_ID

logger = Logger()
router = APIRouter(tags=["papers"])

storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)
embedding_service = EmbeddingPipeline()

MODEL ="gemini-3-flash-preview"


@router.get("/papers/{paper_id}", response_model=PaperDetailResponse)
async def get_paper_details(paper_id: int):
    logger.info(f"Received request for paper_id: {paper_id}")
    
    try:
        
        query = supabase_client.table("papers").select(
            "paper_id, title, abstract, status, created_at, "
            "author:profiles!primary_author_id(full_name, email, organization), "
            "coauthors:paper_coauthors(author_order, profile:profiles(full_name, email, organization)), "
            "conference:conferences(conf_name, is_active, format_type, timezone), "
            "versions:paper_versions(version_id, version_number, file_path, is_final, plagiarism_safe, format_ok, upload_date), "
            "reviews:reviews(review_id, score, recommendation, status), "
            "session_links:session_papers(presentation_order, session:sessions(session_name, start_time, room_location, format_type, timezone))"
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
    
    
@router.get("/papers", response_model=List[PaperSummary])
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
    
@router.post("/papers/{paper_id}/{version_id}/upload")
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

class UploadLinkRequest(BaseModel):
    link: str

@router.post("/papers/{paper_id}/{version_id}/upload-link")
async def upload_paper_link(
    paper_id: str,
    version_id: str,
    payload: UploadLinkRequest
):
    try:
        from packages.pdf_service import fetch_and_upload_pdf
        
        logger.info(f"Processing drive link upload for paper {paper_id}, version {version_id}")
        
        public_url = await fetch_and_upload_pdf(payload.link, paper_id, version_id)

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
            "url": public_url
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/storage/{paper_id}/files")
async def get_files_by_paper(paper_id: str):
    
    if not storage_service:
        raise HTTPException(status_code=500, detail="Storage service not initialized")
    files = storage_service.get_paper_files(paper_id=paper_id)
    if not files:
        return {"paper_id": paper_id, "files": [], "message": "No files found"}
    return {"paper_id": paper_id, "count": len(files), "files": files}


@router.get("/storage/{paper_id}/versions/{version_id}/files")
async def get_files_by_version(paper_id: str, version_id: str):
   
    if not storage_service:
        raise HTTPException(status_code=500, detail="Storage service not initialized")
    files = storage_service.get_paper_files(paper_id=paper_id, version_id=version_id)
    if not files:
         return {"paper_id": paper_id, "version_id": version_id, "files": [], "message": "No files found for this version"}
    return {"paper_id": paper_id, "version_id": version_id, "count": len(files), "files": files}

@router.post("/papers/{paper_id}/{version_id}/embed")
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
    

@router.post("/papers/{paper_id}/{version_id}/check-plagiarism")
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

@router.post("/papers/{paper_id}/{version_id}/review-format")
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
            response = await genai_client.aio.models.generate_content(
                model=MODEL,
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

@router.post("/papers/{paper_id}/recommend-reviewers")
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

@router.get("/papers/{paper_id}/reviews")
async def get_paper_reviews(paper_id: int, user_id: Optional[int] = Query(None)):
    try:
        can_view_all = False
        if user_id:
            profile_res = supabase_client.table("profiles").select("id").eq("user_id", user_id).execute()
            uuid = profile_res.data[0].get("id") if profile_res.data else None
            
            is_admin = False
            if uuid:
                role_res = supabase_client.table("user_roles").select("roles(role_name)").eq("user_id", uuid).execute()
                is_admin = any(
                    isinstance(r.get("roles"), dict) and r.get("roles", {}).get("role_name", "").upper() == "ADMIN"
                    for r in role_res.data or []
                )
            
            paper_res = supabase_client.table("papers").select("primary_author_id").eq("paper_id", paper_id).execute()
            is_author = False
            if paper_res.data and len(paper_res.data) > 0:
                is_author = paper_res.data[0].get("primary_author_id") == user_id
                
            coauthor_res = supabase_client.table("paper_coauthors").select("user_id").eq("paper_id", paper_id).eq("user_id", user_id).execute()
            is_coauthor = coauthor_res.data and len(coauthor_res.data) > 0

            can_view_all = is_admin or is_author or is_coauthor

        query = supabase_client.table("reviews").select(
            "review_id, score, recommendation, comments, review_date, "
            "reviewer:profiles!reviewer_id (full_name), reviewer_id"
        ).eq("paper_id", paper_id)

        if not can_view_all:
            if user_id:
                query = query.eq("reviewer_id", user_id)
            else:
                return {"status": "success", "data": []}

        res = query.order("review_date", desc=True).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Get Paper Reviews Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/papers/{paper_id}/markings")
async def get_paper_markings(paper_id: int, user_id: Optional[int] = Query(None)):
    try:
        can_view_all = False
        if user_id:
            profile_res = supabase_client.table("profiles").select("id").eq("user_id", user_id).execute()
            uuid = profile_res.data[0].get("id") if profile_res.data else None
            
            is_admin = False
            if uuid:
                role_res = supabase_client.table("user_roles").select("roles(role_name)").eq("user_id", uuid).execute()
                is_admin = any(
                    isinstance(r.get("roles"), dict) and r.get("roles", {}).get("role_name", "").upper() == "ADMIN"
                    for r in role_res.data or []
                )
            
            paper_res = supabase_client.table("papers").select("primary_author_id").eq("paper_id", paper_id).execute()
            is_author = False
            if paper_res.data and len(paper_res.data) > 0:
                is_author = paper_res.data[0].get("primary_author_id") == user_id
                
            coauthor_res = supabase_client.table("paper_coauthors").select("user_id").eq("paper_id", paper_id).eq("user_id", user_id).execute()
            is_coauthor = coauthor_res.data and len(coauthor_res.data) > 0

            can_view_all = is_admin or is_author or is_coauthor

        query = supabase_client.table("marking_records").select(
            "mark_id, total_score, comments, marked_at, marked_by, "
            "award:awards(name), "
            "marker:profiles!marked_by(user_id, id, full_name)"
        ).eq("paper_id", paper_id)

        if not can_view_all:
            if user_id:
                query = query.eq("marked_by", user_id)
            else:
                return {"status": "success", "data": []}

        records_res = query.order("marked_at", desc=True).execute()

        records_data = records_res.data
        if not records_data:
            return {"status": "success", "data": []}

        mark_ids = [r["mark_id"] for r in records_data]
        
        marker_ids = []
        for r in records_data:
            marker = r.get("marker")
            if isinstance(marker, list):
                marker = marker[0] if marker else None
            if marker and marker.get("id"):
                marker_ids.append(marker["id"])
        
        marker_ids = list(set(marker_ids))

        details_data = []
        if mark_ids:
            details_res = supabase_client.table("marking_details").select(
                "mark_id, score, criteria:award_criteria(criteria_name, weight_pct)"
            ).in_("mark_id", mark_ids).execute()
            details_data = details_res.data

        user_roles_map = {}
        if marker_ids:
            roles_res = supabase_client.table("user_roles").select(
                "user_id, role:roles(role_name)"
            ).in_("user_id", marker_ids).execute()
            
            for row in roles_res.data:
                role = row.get("role")
                if isinstance(role, list):
                    role = role[0] if role else None
                if role:
                    user_roles_map[row["user_id"]] = role["role_name"]

        results = []
        for record in records_data:
            award = record.get("award")
            if isinstance(award, list):
                award = award[0] if award else None
                
            marker = record.get("marker")
            if isinstance(marker, list):
                marker = marker[0] if marker else None
                
            role_name = user_roles_map.get(marker["id"]) if marker and "id" in marker else None

            record_details = []
            for d in details_data:
                if d["mark_id"] == record["mark_id"]:
                    criteria = d.get("criteria")
                    if isinstance(criteria, list):
                        criteria = criteria[0] if criteria else None
                    record_details.append({
                        "criteria_name": criteria.get("criteria_name", "Unknown Criteria") if criteria else "Unknown Criteria",
                        "weight_pct": criteria.get("weight_pct", 0) if criteria else 0,
                        "score": d.get("score")
                    })

            results.append({
                "mark_id": record["mark_id"],
                "total_score": record["total_score"],
                "comments": record["comments"],
                "marked_at": record["marked_at"],
                "award": {
                    "name": award.get("name", "Unknown Award") if award else "Unknown Award",
                },
                "marker": {
                    "full_name": marker.get("full_name", "Unknown User") if marker else "Unknown User",
                    "role": role_name,
                },
                "details": record_details,
            })

        return {"status": "success", "data": results}

    except Exception as e:
        logger.error(f"Get Paper Markings Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

