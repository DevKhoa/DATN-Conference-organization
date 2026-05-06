import os
import shutil
import tempfile

from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Form
from packages.schema import EmailSchema
from packages.my_email import send_email
from packages.utils import Logger, storage_client, BUCKET_NAME
from packages.file_storage import StorageClient

logger = Logger()
router = APIRouter(tags=["common"])
storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)

@router.post("/send-email")
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

@router.post("/storage/upload-generic")
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


@router.get("/proxy-image")
async def proxy_image(url: str):
    """Fetch an external image URL server-side (bypass CORS) and return as base64 data URL."""
    import requests
    import base64

    try:
        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "image/png").split(";")[0].strip()
        b64 = base64.b64encode(resp.content).decode("utf-8")
        return {"data_url": f"data:{content_type};base64,{b64}"}
    except Exception as e:
        logger.error(f"Proxy image error for {url}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {str(e)}")
