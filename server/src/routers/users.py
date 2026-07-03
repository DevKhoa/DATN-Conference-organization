import os
import shutil
import tempfile
import pathlib
import re
import json
import asyncio
import uuid


from fastapi import APIRouter, HTTPException, File, UploadFile, Query as QueryParam, BackgroundTasks
from google.genai import types
import serpapi

from packages.schema import UserDescriptionRequest, ScholarImportRequest, ScholarAuthor, CVBaseModel
from packages.utils import Logger, supabase_client, genai_client, storage_client, EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, MAX_CV_SIZE_MB, ALLOWED_IMAGE_EXTENSIONS, SERP_API_KEY, SCHOLAR_PROMPT, BUCKET_NAME, CV_RETRIEVER
from packages.utils import valid_check, clean_text, extract_text_from_pdf, is_image_file, format_cv_profile
from packages.file_storage import StorageClient
from packages.my_email import send_html_email
from pydantic import BaseModel
from typing import List, Optional

MODEL = "gemini-3-flash-preview"

logger = Logger()
router = APIRouter(tags=["users"])
storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)

class ForgotPasswordRequest(BaseModel):
    email: str
    origin: str

@router.post("/users/forgot-password")
async def forgot_password_endpoint(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"Generating reset link for: {request.email}")
        
        link_response = supabase_client.auth.admin.generate_link({
            "type": "recovery",
            "email": request.email,
            "redirect_to": f"{request.origin}/reset-password"
        })
        
        hashed_token = link_response.properties.hashed_token
        action_link = f"{request.origin}/reset-password?token_hash={hashed_token}"
        
        # HTML Email content
        html_body = f"""
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <p>
            <a href="{action_link}" style="display:inline-block;padding:10px 20px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:5px;">
                Reset Password
            </a>
        </p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Alternatively, copy and paste this link into your browser:</p>
        <p>{action_link}</p>
        """
        
        background_tasks.add_task(
            send_html_email,
            recipient_email=request.email,
            subject="Reset Your Password",
            html_body=html_body
        )
        
        return {"status": "success", "message": "Password reset email sent."}
    except Exception as e:
        logger.error(f"Failed to generate forgot password link: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset password email.")


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

        response = supabase_client.table("profiles").update({
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
                AI_response = await genai_client.aio.models.generate_content(
                    model=MODEL, 
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

            response = supabase_client.table("profiles").update({
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
                update_res = supabase_client.table("profiles").update({
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
        AI_response = await genai_client.aio.models.generate_content(
            model=MODEL,
            contents=[SCHOLAR_PROMPT, articles_str],
            config={
                "response_mime_type": "application/json",
                "response_json_schema": ScholarAuthor.model_json_schema(),
            },
        )
        
        research_bio = json.loads(AI_response.text)

        articles_md = '\n'.join([
            f"- [{article.get('title', 'No title')}]({article.get('link', '#')}) — {article.get('publication', 'Unknown venue')}"
            for article in articles_list
        ])

        author_profile = f"""
            ## {author_name.upper()}

            **Affiliations:** {author_affiliations}

            ### Research Interests
            {', '.join(interests).title()}

            ### Research Fields
            {chr(10).join([f"- {field}" for field in research_bio.get('research_fields', [])])}

            ### Research Directions
            {chr(10).join([f"- {direction}" for direction in research_bio.get('research_directions', [])])}

            ### Research Themes
            {chr(10).join([f"- {theme}" for theme in research_bio.get('research_themes', [])])}

            ### Articles
            {articles_md}
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
        update_res = supabase_client.table("profiles").update({
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


# ─── Admin: User Management ──────────────────────────────────────────────────

class RoleUpdateRequest(BaseModel):
    role_ids: List[int]


# Build an admin client using the service role key for Auth metadata sync
supabase_admin_client = None
try:
    from supabase import create_client as _create_admin_client
    _admin_url = os.environ.get("SUPABASE_URL")
    _service_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    if _admin_url and _service_key:
        supabase_admin_client = _create_admin_client(_admin_url, _service_key)
except Exception as _init_err:
    logger.warning(f"Could not initialize admin Supabase client: {_init_err}")


@router.get("/admin/users")
async def list_users(
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    search: Optional[str] = QueryParam(None),
    role_id: Optional[int] = QueryParam(None),
):
    """List all users with their roles. Admin-only."""
    try:
        offset = (page - 1) * page_size

        if role_id is not None:
            # ── Path A: Filter by role ─────────────────────────────────────────
            # Start from user_roles to get the correct set BEFORE paginating.

            # 1a. Get ALL UUIDs that have this role
            role_uuids_res = (
                supabase_client.table("user_roles")
                .select("user_id")
                .eq("role_id", role_id)
                .execute()
            )
            all_role_uuids = [r["user_id"] for r in (role_uuids_res.data or [])]

            if not all_role_uuids:
                return {"status": "success", "total": 0, "page": page, "page_size": page_size, "data": []}

            # 1b. Fetch profiles for those UUIDs (with optional search)
            prof_query = supabase_client.table("profiles").select(
                "user_id, id, full_name, email, organization, avatar_url, created_at"
            ).in_("id", all_role_uuids)

            if search:
                sl = search.strip()
                prof_query = prof_query.or_(
                    f"full_name.ilike.%{sl}%,email.ilike.%{sl}%,organization.ilike.%{sl}%"
                )

            # Count total in this filtered set
            count_res = (
                supabase_client.table("profiles")
                .select("user_id", count="exact")
                .in_("id", all_role_uuids)
            )
            if search:
                sl = search.strip()
                count_res = count_res.or_(
                    f"full_name.ilike.%{sl}%,email.ilike.%{sl}%,organization.ilike.%{sl}%"
                )
            total = (count_res.execute().count or 0)

            profiles_res = (
                prof_query.order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            profiles = profiles_res.data or []

        else:
            # ── Path B: No role filter — paginate all profiles ─────────────────
            base_query = supabase_client.table("profiles").select(
                "user_id, id, full_name, email, organization, avatar_url, created_at"
            )
            count_query = supabase_client.table("profiles").select("user_id", count="exact")

            if search:
                sl = search.strip()
                filter_expr = f"full_name.ilike.%{sl}%,email.ilike.%{sl}%,organization.ilike.%{sl}%"
                base_query = base_query.or_(filter_expr)
                count_query = count_query.or_(filter_expr)

            total = (count_query.execute().count or 0)
            profiles_res = (
                base_query.order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            profiles = profiles_res.data or []

        # ── Step 2: Fetch all roles for this page's profiles ──────────────────
        uuids = [p["id"] for p in profiles if p.get("id")]
        roles_map: dict = {uid: [] for uid in uuids}

        if uuids:
            roles_res = (
                supabase_client.table("user_roles")
                .select("user_id, role_id, roles(role_name)")
                .in_("user_id", uuids)
                .execute()
            )
            for row in (roles_res.data or []):
                uid = row["user_id"]
                if uid in roles_map:
                    roles_map[uid].append({
                        "role_id": row["role_id"],
                        "roles": row.get("roles"),
                    })

        # ── Step 3: Merge ──────────────────────────────────────────────────────
        for p in profiles:
            p["user_roles"] = roles_map.get(p.get("id"), [])

        return {
            "status": "success",
            "total": total,
            "page": page,
            "page_size": page_size,
            "data": profiles,
        }

    except Exception as e:
        logger.error(f"Admin List Users Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.put("/admin/users/{user_uuid}/roles")
async def update_user_roles(user_uuid: str, request: RoleUpdateRequest):
    """
    Atomically update a user's roles.
    1. Deletes all existing user_roles rows for this user.
    2. Inserts the new role rows.
    3. (Best-effort) Syncs Supabase Auth app_metadata so the JWT reflects
       the change after the next token refresh.
    """
    try:
        # Verify user exists
        profile_res = (
            supabase_client.table("profiles")
            .select("user_id")
            .eq("id", user_uuid)
            .single()
            .execute()
        )
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="User not found.")

        # Resolve role names for metadata sync
        role_names: List[str] = []
        if request.role_ids:
            roles_res = (
                supabase_client.table("roles")
                .select("role_id, role_name")
                .in_("role_id", request.role_ids)
                .execute()
            )
            role_names = [r["role_name"].upper() for r in (roles_res.data or [])]

        # Atomic swap: delete then insert
        supabase_client.table("user_roles").delete().eq("user_id", user_uuid).execute()
        if request.role_ids:
            new_rows = [{"user_id": user_uuid, "role_id": rid} for rid in request.role_ids]
            supabase_client.table("user_roles").insert(new_rows).execute()

        # Sync Supabase Auth metadata (best-effort — non-fatal if it fails)
        if supabase_admin_client:
            try:
                # 1. Update app_metadata so new JWT carries correct roles
                supabase_admin_client.auth.admin.update_user_by_id(
                    user_uuid,
                    {"app_metadata": {"roles": role_names}},
                )
            except Exception as auth_err:
                logger.warning(f"Auth metadata/session sync failed (non-fatal): {auth_err}")

        logger.info(f"Updated roles for user {user_uuid}: {role_names}")
        return {
            "status": "success",
            "message": f"Roles updated to: {', '.join(role_names) if role_names else 'none'}",
            "user_uuid": user_uuid,
            "role_ids": request.role_ids,
            "role_names": role_names,
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Admin Update Roles Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
