"""
notifications.py
----------------
Router for notification-related endpoints.

POST /notifications/send-email
  - Receives a list of user_ids, a subject (title) and HTML content
  - Fetches each user's email from profiles table
  - Sends plain-text email to each recipient via packages.my_email.send_email
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from packages.my_email import send_html_email
from packages.utils import logger, supabase_client

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/user-notifications/{user_id}")
async def get_user_notifications(user_id: int):
    try:
        res = supabase_client.table("user_notifications") \
            .select("id, notification_id, is_read, read_at, dynamic_title, dynamic_content, notifications(notification_id, title, content, type, created_at, conf_id, attachments, target_criteria)") \
            .eq("user_id", user_id) \
            .order("id", desc=True) \
            .limit(30) \
            .execute()
        return res.data
    except Exception as e:
        logger.error(f"[Notifications] Error fetching user notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


class SendEmailPayload(BaseModel):
    user_ids: List[int]
    subject: str
    html_content: str          # HTML string — sent as-is to preserve formatting


@router.post("/send-email")
async def send_notification_emails(payload: SendEmailPayload):
    """
    Send an email to each user in `user_ids`.
    Fetches the email address from `profiles` table.
    Returns a summary of sent / failed counts.
    """
    if not payload.user_ids:
        raise HTTPException(status_code=400, detail="user_ids must not be empty.")
    if not payload.subject.strip():
        raise HTTPException(status_code=400, detail="subject must not be empty.")
    if not payload.html_content.strip():
        raise HTTPException(status_code=400, detail="html_content must not be empty.")

    # Fetch emails in bulk
    profiles_res = supabase_client.table("profiles") \
        .select("user_id, email, full_name") \
        .in_("user_id", payload.user_ids) \
        .execute()

    profiles = {
        p["user_id"]: p
        for p in (profiles_res.data or [])
        if p.get("email")
    }

    if not profiles:
        raise HTTPException(status_code=404, detail="No valid email addresses found for the given user_ids.")

    sent, failed = 0, 0

    for uid in payload.user_ids:
        profile = profiles.get(uid)
        if not profile:
            logger.warning(f"[NotifEmail] No profile/email for user_id={uid}, skipping.")
            failed += 1
            continue

        email = profile["email"]
        try:
            send_html_email(email, payload.subject, payload.html_content)
            sent += 1
        except Exception as e:
            logger.warning(f"[NotifEmail] Failed to send to {email}: {e}")
            failed += 1

    logger.info(f"[NotifEmail] Done — sent={sent}, failed={failed}, subject='{payload.subject}'")
    return {"sent": sent, "failed": failed, "total": len(payload.user_ids)}
