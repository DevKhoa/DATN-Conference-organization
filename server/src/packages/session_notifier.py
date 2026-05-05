"""
session_notifier.py
-------------------
Core logic to send session-start notifications to chairs and authors.

Channels:
  1. In-app  -> notifications + user_notifications (picked up by NotificationBell)
  2. Email   -> via packages/my_email.send_email

DB constraints:
  - notifications.type CHECK: only 'manual' or 'template' allowed
  - Deduplication: stored in notifications.target_criteria as
    {"notification_type": "session_start", "session_id": <id>}
    Scheduler queries this to avoid re-sending.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from packages.my_email import send_email
from packages.utils import logger, supabase_client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_session_time(ts: Optional[str], conf_timezone: str = "UTC") -> str:
    """Return a readable time string from an ISO timestamp."""
    if not ts:
        return "TBD"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%A, %B %d %Y  %H:%M UTC")
    except Exception:
        return ts


def _build_html_content(
    session_name: str,
    conf_name: str,
    start_time_str: str,
    end_time_str: str,
    room_location: Optional[str],
    meet_link: Optional[str],
    role: str,
) -> str:
    """Return an HTML notification/email body."""
    role_label = "Chair" if role == "chair" else "Author"
    location_line = ""
    if room_location and room_location.upper() not in ("TBD", ""):
        location_line = f"<li><strong>Room:</strong> {room_location}</li>"
    meet_line = ""
    if meet_link:
        meet_line = (
            f'<li><strong>Online Link:</strong> '
            f'<a href="{meet_link}">{meet_link}</a></li>'
        )

    return (
        f"<p>Dear {role_label},</p>"
        f"<p>Your session is <strong>starting soon</strong>. Please prepare accordingly.</p>"
        f"<ul>"
        f"<li><strong>Session:</strong> {session_name}</li>"
        f"<li><strong>Conference:</strong> {conf_name}</li>"
        f"<li><strong>Start:</strong> {start_time_str}</li>"
        f"<li><strong>End:</strong> {end_time_str}</li>"
        f"{location_line}"
        f"{meet_line}"
        f"</ul>"
        f"<p>We look forward to seeing you!</p>"
    )


# ---------------------------------------------------------------------------
# Recipient resolution
# ---------------------------------------------------------------------------

def get_session_recipients(session_id: int) -> list[dict]:
    """
    Returns a deduplicated list of recipients for a session.
    Each item: {user_id, email, full_name, role}
      role = "chair" | "author"
    """
    recipients: dict[int, dict] = {}   # keyed by user_id

    # --- Chairs ---
    chairs_res = supabase_client.table("session_chairs") \
        .select("user_id, profiles(user_id, email, full_name)") \
        .eq("session_id", session_id) \
        .execute()

    for row in chairs_res.data or []:
        profile = row.get("profiles") or {}
        uid = profile.get("user_id")
        email = profile.get("email")
        if uid and email:
            recipients[uid] = {
                "user_id": uid,
                "email": email,
                "full_name": profile.get("full_name") or email,
                "role": "chair",
            }

    # --- Primary authors of papers in the session ---
    papers_res = supabase_client.table("session_papers") \
        .select("paper_id, papers(paper_id, primary_author_id, profiles!papers_primary_author_id_fkey(user_id, email, full_name))") \
        .eq("session_id", session_id) \
        .execute()

    for row in papers_res.data or []:
        paper = row.get("papers") or {}
        profile = paper.get("profiles") or {}
        uid = profile.get("user_id")
        email = profile.get("email")
        if uid and email and uid not in recipients:
            recipients[uid] = {
                "user_id": uid,
                "email": email,
                "full_name": profile.get("full_name") or email,
                "role": "author",
            }

    return list(recipients.values())


# ---------------------------------------------------------------------------
# Main send function
# ---------------------------------------------------------------------------

def send_session_start_notifications(session_id: int) -> None:
    """
    Send session-start notifications (in-app + email) to chairs and authors.
    Safe to call — scheduler is responsible for dedup before calling this.
    """
    logger.info(f"[Notifier] Sending session-start notifications for session {session_id}")

    # --- Fetch session ---
    session_res = supabase_client.table("sessions") \
        .select("session_id, session_name, conf_id, start_time, end_time, room_location, meet_link") \
        .eq("session_id", session_id) \
        .single() \
        .execute()

    session = session_res.data
    if not session:
        logger.warning(f"[Notifier] Session {session_id} not found, skipping.")
        return

    conf_id = session.get("conf_id")

    # --- Fetch conference ---
    conf_res = supabase_client.table("conferences") \
        .select("conf_id, conf_name, timezone") \
        .eq("conf_id", conf_id) \
        .single() \
        .execute()

    conference = conf_res.data or {}
    conf_name = conference.get("conf_name") or f"Conference #{conf_id}"
    conf_tz = conference.get("timezone") or "UTC"

    session_name = session.get("session_name") or f"Session #{session_id}"
    start_time_str = _format_session_time(session.get("start_time"), conf_tz)
    end_time_str = _format_session_time(session.get("end_time"), conf_tz)
    room_location = session.get("room_location")
    meet_link = session.get("meet_link")

    # --- Resolve recipients ---
    recipients = get_session_recipients(session_id)
    if not recipients:
        logger.info(f"[Notifier] No recipients for session {session_id}, skipping.")
        return

    logger.info(f"[Notifier] {len(recipients)} recipients for session {session_id}")

    # --- Build master notification record ---
    # notification_type in target_criteria is used for:
    #   1. Deduplication check in scheduler
    #   2. Icon differentiation in frontend (CalendarClock vs Megaphone)
    notif_title = f"Session Starting Soon: {session_name}"
    target_criteria = {
        "notification_type": "session_start",
        "session_id": session_id,
        "recipient_ids": [r["user_id"] for r in recipients],
    }

    notif_res = supabase_client.table("notifications").insert({
        "conf_id": conf_id,
        "sender_id": None,               # system-generated, no human sender
        "title": notif_title,
        "content": _build_html_content(
            session_name, conf_name, start_time_str, end_time_str,
            room_location, meet_link, "author"
        ),
        "attachments": [],
        "type": "manual",                # DB CHECK only allows 'manual' or 'template'
        "target_type": "specific_users",
        "target_criteria": target_criteria,
    }).execute()

    if not notif_res.data:
        logger.error(f"[Notifier] Failed to create notification record for session {session_id}")
        return

    notification_id = notif_res.data[0]["notification_id"]

    # --- Fan-out: one user_notifications row per recipient ---
    user_notif_rows = []
    for r in recipients:
        role_label = "Chair" if r["role"] == "chair" else "Author"
        html_body = _build_html_content(
            session_name, conf_name, start_time_str, end_time_str,
            room_location, meet_link, r["role"]
        )
        user_notif_rows.append({
            "notification_id": notification_id,
            "user_id": r["user_id"],
            "dynamic_title": f"[{role_label}] Session Starting Soon: {session_name}",
            "dynamic_content": html_body,
            "is_read": False,
        })

    supabase_client.table("user_notifications").insert(user_notif_rows).execute()
    logger.info(f"[Notifier] Inserted {len(user_notif_rows)} user_notification rows for session {session_id}")

    # --- Send emails (fire-and-forget) ---
    # Tạm tắt gửi mail theo yêu cầu
    # for r in recipients:
    #     role_label = "Chair" if r["role"] == "chair" else "Author"
    #     subject = f"[{conf_name}] Session Starting Soon: {session_name}"
    #     plain_body = (
    #         f"Dear {role_label} {r['full_name']},\n\n"
    #         f"Your session '{session_name}' is starting soon.\n\n"
    #         f"Start : {start_time_str}\n"
    #         f"End   : {end_time_str}\n"
    #         + (f"Room  : {room_location}\n" if room_location else "")
    #         + (f"Link  : {meet_link}\n" if meet_link else "")
    #         + f"\nConference: {conf_name}\n"
    #     )
    #     try:
    #         send_email(r["email"], subject, plain_body)
    #     except Exception as email_err:
    #         logger.warning(f"[Notifier] Email to {r['email']} failed: {email_err}")

    logger.info(f"[Notifier] Done - session {session_id} notifications dispatched.")
