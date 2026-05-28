import os
import tempfile
import uuid
import re

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from packages.utils import Logger, storage_client, BUCKET_NAME

logger = Logger()

_TIMEOUT = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=10.0)


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    return isinstance(exc, httpx.NetworkError)


@retry(
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
async def _stream_to_temp(url: str, tmp_path: str) -> None:
    """Stream-download a URL into a local temp file (memory-safe)."""
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        async with client.stream("GET", url) as response:
            if response.status_code == 404:
                raise httpx.HTTPStatusError(
                    f"404 Not Found: {url}",
                    request=response.request,
                    response=response,
                )
            if response.status_code == 403:
                raise httpx.HTTPStatusError(
                    f"403 Forbidden: {url}",
                    request=response.request,
                    response=response,
                )
            response.raise_for_status()

            with open(tmp_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    f.write(chunk)


def _normalize_url(url: str) -> str:
    """Convert common share links (like GDrive view links) to direct download links."""
    # Google Drive /file/d/ID/view
    match = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", url)
    if match:
        return f"https://drive.google.com/uc?export=download&id={match.group(1)}"
    return url


async def fetch_and_upload_pdf(url: str, paper_id: str, version_id: str) -> str:
    """
    Stream-download a PDF from `url`, upload to GCS, return the public URL.

    Raises on failure — caller is responsible for catching and logging.

    GCS path: papers/{paper_id}/{version_id}/{uuid}.pdf
    """
    tmp_path = None
    try:
        suffix = f"_{uuid.uuid4().hex}.pdf"
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)

        url = _normalize_url(url)
        logger.info(f"Fetching PDF from: {url}")
        await _stream_to_temp(url, tmp_path)

        # Verify magic bytes
        with open(tmp_path, "rb") as f:
            header = f.read(5)
            if header != b"%PDF-":
                raise ValueError("Downloaded file is not a valid PDF (invalid magic bytes). The link may require authentication or downloads may be restricted.")

        filename = os.path.basename(tmp_path)
        destination_path = f"papers/{paper_id}/{version_id}/{filename}"

        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(tmp_path, content_type="application/pdf")

        public_url = blob.public_url
        logger.info(f"PDF uploaded to GCS: {public_url}")
        return public_url

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as cleanup_err:
                logger.warning(f"Failed to delete temp file {tmp_path}: {cleanup_err}")
