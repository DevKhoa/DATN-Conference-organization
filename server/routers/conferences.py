import os
import shutil
import tempfile
import uuid

from fastapi import APIRouter, HTTPException, File, UploadFile, Body
from utils import logger, supabase_client, storage_client, BUCKET_NAME
from file_storage import StorageClient

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
             raise HTTPException(status_code=400, detail="Only image files (png, jpg, jpeg, webp) are allowed.")

        file_ext = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        gcs_path = f"conferences/{conf_id}/assets/{unique_filename}"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, unique_filename)
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            public_url = storage_service.upload_blob(temp_file_path, gcs_path)
            
            if not public_url:
                raise HTTPException(status_code=500, detail="Failed to upload banner to storage.")

      
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
            "message": "Banner added successfully",
            "url": public_url,

            "all_banners": current_banners
        }

    except Exception as e:
        logger.error(f"Add Banner Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add banner: {str(e)}")

@router.delete("/conferences/{conf_id}/banners")
async def remove_conference_banner(
    conf_id: int,
    url_to_remove: str = Body(..., embed=True, description="Full URL of image to delete")
):
    
    try:
        res = supabase_client.table("conferences").select("banner_urls").eq("conf_id", conf_id).single().execute()
        current_banners = res.data.get("banner_urls")

        if not current_banners or url_to_remove not in current_banners:
            raise HTTPException(status_code=404, detail="Banner URL not found in this conference.")

        deleted = storage_service.delete_file(url_to_remove)
        
        if not deleted:
            logger.warning(f"File {url_to_remove} not found in GCS")

        new_banners = [url for url in current_banners if url != url_to_remove]

        supabase_client.table("conferences").update({
            "banner_urls": new_banners
        }).eq("conf_id", conf_id).execute()

        return {
            "status": "success",
            "message": "Banner removed successfully",
            "remaining_banners": new_banners
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Remove Banner Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove banner: {str(e)}")
