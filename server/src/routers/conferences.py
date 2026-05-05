import os
import shutil
import tempfile
import uuid

from fastapi import APIRouter, HTTPException, File, UploadFile, Body, Form
import csv
import io
from packages.utils import Logger, supabase_client, storage_client, BUCKET_NAME
from packages.file_storage import StorageClient

logger = Logger()
router = APIRouter(tags=["conferences"])
storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)

@router.post("/conferences/{conf_id}/banners")
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

@router.delete("/conferences/{conf_id}/banners")
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


@router.get("/conferences/{conf_id}/import-history")
async def get_import_history(conf_id: int):
    try:
        res = (
            supabase_client.table("paper_imports")
            .select("*, person:profiles!person_in_charge(full_name)")
            .eq("conf_id", conf_id)
            .order("import_date", desc=True)
            .execute()
        )
        return {
            "status": "success",
            "data": res.data
        }
    except Exception as e:
        logger.error(f"Get Import History Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conferences/{conf_id}/import-logs")
async def get_import_logs(conf_id: int):
    try:
        res = (
            supabase_client.table("paper_import_logs")
            .select("*, person:profiles!person_in_charge(full_name)")
            .eq("conf_id", conf_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return {
            "status": "success",
            "data": res.data
        }
    except Exception as e:
        logger.error(f"Get Import Logs Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conferences/{conf_id}/import-papers")
async def import_papers_csv(
    conf_id: int,
    uploader_id: int = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only accept .csv files")
    
    try:
        content = await file.read()
        try:
            text_content = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            text_content = content.decode('latin-1')
        
        csv_reader = csv.DictReader(io.StringIO(text_content))
        
        required_columns = ["title", "abstract", "primary_author_email", "co_author_emails"]
        if not csv_reader.fieldnames or not all(col in csv_reader.fieldnames for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must contain the following headers: {', '.join(required_columns)}"
            )

        rows = list(csv_reader)
        
        # Phase 1: Validation
        # Collect all emails to fetch
        all_emails = set()
        for i, row in enumerate(rows):
            if row.get("primary_author_email"):
                all_emails.add(row["primary_author_email"].strip())
            
            co_authors_str = row.get("co_author_emails", "")
            if co_authors_str:
                co_emails = [e.strip() for e in co_authors_str.split(";") if e.strip()]
                for ce in co_emails:
                    all_emails.add(ce)
                    
        # Fetch existing users
        profiles_res = supabase_client.table("profiles").select("user_id, email").in_("email", list(all_emails)).execute()
        existing_users = {p["email"]: p["user_id"] for p in profiles_res.data}
        
        # Fetch existing papers in this conference for duplicate check
        existing_papers_res = supabase_client.table("papers").select("title").eq("submitted_conf", conf_id).execute()
        existing_titles = {p["title"].strip().lower() for p in existing_papers_res.data} if existing_papers_res.data else set()
        
        # Check for missing users + duplicates
        errors = []
        for i, row in enumerate(rows):
            row_num = i + 2 # +1 for 0-index, +1 for header
            
            # Check duplicate title
            title = row.get("title", "").strip()
            if title and title.lower() in existing_titles:
                errors.append(f"Row {row_num}: Paper '{title}' already exists in this conference.")
            
            primary_email = row.get("primary_author_email", "").strip()
            
            if not primary_email:
                errors.append(f"Row {row_num}: Missing primary_author_email")
                continue
                
            if primary_email not in existing_users:
                errors.append(f"Row {row_num}: Primary author email '{primary_email}' does not exist in the system.")
            
            co_authors_str = row.get("co_author_emails", "")
            if co_authors_str:
                co_emails = [e.strip() for e in co_authors_str.split(";") if e.strip()]
                for ce in co_emails:
                    if ce not in existing_users:
                        errors.append(f"Row {row_num}: Co-author email '{ce}' does not exist in the system.")
                        
        if errors:
            # Log failed import
            error_text = " | ".join(errors)
            supabase_client.table("paper_import_logs").insert({
                "conf_id": conf_id,
                "status": "ERROR",
                "file_name": file.filename,
                "num_papers": 0,
                "error_details": error_text,
                "person_in_charge": uploader_id
            }).execute()
            raise HTTPException(status_code=400, detail=error_text)

        # Phase 2: Insertion
        imported_count = 0
        for row in rows:
            title = row.get("title", "").strip()
            abstract = row.get("abstract", "").strip()
            primary_email = row.get("primary_author_email", "").strip()
            primary_id = existing_users[primary_email]
            
            # Map optional table fields
            status = row.get("status", "").strip() or "ACCEPTED"
            final_decision_date = row.get("final_decision_date", "").strip() or None
            created_at = row.get("created_at", "").strip() or None
            
            insert_data = {
                "title": title,
                "abstract": abstract,
                "primary_author_id": primary_id,
                "submitted_conf": conf_id,
                "status": status
            }
            if final_decision_date:
                insert_data["final_decision_date"] = final_decision_date
            if created_at:
                insert_data["created_at"] = created_at
                
            # Insert paper
            paper_res = supabase_client.table("papers").insert(insert_data).execute()
            
            if not paper_res.data:
                continue
                
            paper_id = paper_res.data[0]["paper_id"]
            
            # Insert co-authors
            co_authors_str = row.get("co_author_emails", "")
            if co_authors_str:
                co_emails = [e.strip() for e in co_authors_str.split(";") if e.strip()]
                coauthor_records = []
                for idx, ce in enumerate(co_emails):
                    coauthor_records.append({
                        "paper_id": paper_id,
                        "user_id": existing_users[ce],
                        "author_order": idx + 1
                    })
                
                if coauthor_records:
                    supabase_client.table("paper_coauthors").insert(coauthor_records).execute()
                    
            imported_count += 1
            
        # Log successful import
        supabase_client.table("paper_imports").insert({
            "conf_id": conf_id,
            "num_papers": imported_count,
            "file_name": file.filename,
            "person_in_charge": uploader_id
        }).execute()
        
        supabase_client.table("paper_import_logs").insert({
            "conf_id": conf_id,
            "status": "SUCCESS",
            "file_name": file.filename,
            "num_papers": imported_count,
            "error_details": None,
            "person_in_charge": uploader_id
        }).execute()

        return {
            "status": "success",
            "message": f"Successfully imported {imported_count} papers",
            "count": imported_count
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Import Papers Error: {e}")
        # Log unexpected errors
        try:
            supabase_client.table("paper_import_logs").insert({
                "conf_id": conf_id,
                "status": "ERROR",
                "file_name": file.filename,
                "num_papers": 0,
                "error_details": str(e),
                "person_in_charge": uploader_id
            }).execute()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))

