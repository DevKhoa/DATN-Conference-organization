import os
import shutil
import tempfile
import pathlib
import uuid
import re
import json

from fastapi import APIRouter, HTTPException, File, UploadFile
from google.genai import types
import serpapi

from schema import UserDescriptionRequest, ScholarImportRequest, ScholarAuthor, CVBaseModel
from utils import logger, supabase_client, genai_client, storage_client, EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, MAX_CV_SIZE_MB, ALLOWED_IMAGE_EXTENSIONS, SERP_API_KEY, SCHOLAR_PROMPT, BUCKET_NAME, CV_RETRIEVER
from utils import valid_check, clean_text, extract_text_from_pdf, is_image_file, format_cv_profile
from file_storage import StorageClient

router = APIRouter(tags=["users"])
storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)

@router.post("/users/{user_id}/description")
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

@router.post("/users/{user_id}/upload-cv")
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
                raise HTTPException(status_code=400, detail=f"File validation failed: {validation['code']}")

            raw_text = extract_text_from_pdf(temp_file_path)
            
            if not raw_text.strip():
                raise HTTPException(status_code=400, detail="Could not extract text from PDF. The file might be an image-only PDF.")
                
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
                raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")
            
            final_description = description_text 
            
            logger.info("Attempting to reformat CV description with AI...")
            try:
                AI_response = genai_client.models.generate_content(
                    model='gemini-2.5-flash', 
                    contents=[CV_RETRIEVER, description_text],
                    config={
                        "response_mime_type": "application/json",
                        "response_json_schema": CVBaseModel.model_json_schema(),
                    },
                )

                response_json = json.loads(AI_response.text)
                cv_reformat = format_cv_profile(response_json)
                
                if cv_reformat: 
                    final_description = cv_reformat
                    logger.info("Successfully reformatted CV with AI.")
                
            except Exception as e:
                logger.warning(f"GenAI Reformat Failed, falling back to raw text. Error: {e}")

            response = supabase_client.table("users").update({
                "description": final_description, 
                "description_embed": embedding_vector 
            }).eq("user_id", user_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail=f"User ID {user_id} not found.")

            logger.info(f"Updated description and embedding for User {user_id}")

            return {
                "status": "success",
                "message": "CV uploaded and processed successfully.",
                "ai_reformatted": final_description != description_text, 
                "extracted_length": len(description_text),
                "final_length": len(final_description)
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error Upload CV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/users/{user_id}/upload-avatar")
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


@router.post("/users/{user_id}/import-scholar")
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
            ## {author_name.upper()}

            **Affiliations:** {author_affiliations}

            ### Research Interests
            {', '.join(interests).title()}

            ### Research Fields
            {'\n'.join([f"- {field}" for field in research_bio.get('research_fields', [])])}

            ### Research Directions
            {'\n'.join([f"- {direction}" for direction in research_bio.get('research_directions', [])])}

            ### Research Themes
            {'\n'.join([f"- {theme}" for theme in research_bio.get('research_themes', [])])}
            """.strip()

        cleaned_text = '\n'.join([line.strip() for line in author_profile.strip().split('\n')])

        logger.info("Generating embedding for the cleaned profile...")
        embed_response = genai_client.models.embed_content(
            model=EMBEDDING_MODEL_NAME, 
            contents=cleaned_text,
            config=types.EmbedContentConfig(
                task_type="SEMANTIC_SIMILARITY",
                output_dimensionality=VECTOR_DIMENSION 
            )
        )
        embedding_vector = embed_response.embeddings[0].values

        logger.info(f"Updating Supabase for User {user_id}...")
        update_res = supabase_client.table("users").update({
            "description": cleaned_text.strip(),
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
            "profile_length": len(cleaned_text.strip())
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API Error Import Scholar Profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error while importing Scholar profile")
