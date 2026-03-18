import os
import re
import tempfile
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from file_storage import StorageClient
from utils import BUCKET_NAME, logger, storage_client, supabase_client

router = APIRouter(tags=["proceedings"])
storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)


def _first_obj(value: Any) -> Optional[Dict[str, Any]]:
    if isinstance(value, list):
        return value[0] if value else None
    if isinstance(value, dict):
        return value
    return None


@router.get("/proceedings/{conf_id}/papers")
async def list_proceedings_papers(
    conf_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    include_abstract: bool = Query(True),
):
    try:
        columns = "paper_id, title, primary_author_id, author:users!primary_author_id(full_name, organization)"
        if include_abstract:
            columns = "paper_id, title, abstract, primary_author_id, author:users!primary_author_id(full_name, organization)"

        res = (
            supabase_client.table("papers")
            .select(columns, count="exact")
            .eq("submitted_conf", conf_id)
            .eq("status", "ACCEPTED")
            .order("paper_id", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )

        papers = res.data or []
        total = res.count or 0

        paper_ids = [p.get("paper_id") for p in papers if p.get("paper_id") is not None]
        session_map: Dict[int, Dict[str, Any]] = {}
        if paper_ids:
            sp_res = (
                supabase_client.table("session_papers")
                .select("paper_id, session_id, start_time, end_time")
                .in_("paper_id", paper_ids)
                .execute()
            )
            for sp in sp_res.data or []:
                pid = sp.get("paper_id")
                if pid is not None:
                    session_map[pid] = sp

        for p in papers:
            pid = p.get("paper_id")
            p["session"] = session_map.get(pid)

        return {
            "papers": papers,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        logger.error(f"Proceedings papers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proceedings/{conf_id}/reviewers")
async def list_proceedings_reviewers(conf_id: int):
    try:
        res = (
            supabase_client.table("reviewer_assignments")
            .select(
                "reviewer:users!reviewer_id(full_name, organization), "
                "paper:papers!inner(submitted_conf)"
            )
            .eq("paper.submitted_conf", conf_id)
            .execute()
        )

        reviewers: List[Dict[str, Any]] = []
        seen = set()
        for item in res.data or []:
            rv = _first_obj(item.get("reviewer"))
            if not rv:
                continue
            name = rv.get("full_name")
            if not name or name in seen:
                continue
            seen.add(name)
            reviewers.append(
                {
                    "id": str(uuid.uuid4()),
                    "full_name": name,
                    "organization": rv.get("organization") or "",
                }
            )

        return {"reviewers": reviewers, "count": len(reviewers)}

    except Exception as e:
        logger.error(f"Proceedings reviewers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proceedings/{conf_id}/pdf-cache")
async def get_cached_proceedings_pdf(conf_id: int, key: str = Query(...)):
    try:
        if not re.fullmatch(r"[a-f0-9]{32,64}", key):
            raise HTTPException(status_code=400, detail="Invalid cache key")

        blob_path = f"proceedings/{conf_id}/cache/{key}.pdf"
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_path)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="Cache not found")

        return {"url": blob.public_url, "key": key}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Proceedings cache lookup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/proceedings/{conf_id}/pdf-cache")
async def upload_cached_proceedings_pdf(
    conf_id: int,
    key: str = Form(...),
    file: UploadFile = File(...),
):
    temp_file_path = None
    try:
        if not re.fullmatch(r"[a-f0-9]{32,64}", key):
            raise HTTPException(status_code=400, detail="Invalid cache key")
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, file.filename)
            with open(temp_file_path, "wb") as buffer:
                buffer.write(await file.read())

            gcs_path = f"proceedings/{conf_id}/cache/{key}.pdf"
            public_url = storage_service.upload_generic_file(
                local_file_path=temp_file_path,
                gcs_destination_path=gcs_path,
            )

            if not public_url:
                raise HTTPException(status_code=500, detail="Failed to upload cached PDF")

            return {"url": public_url, "key": key}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Proceedings cache upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
