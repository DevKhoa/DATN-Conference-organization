"""
scheduler.py
------------
APScheduler-based background job that periodically checks for upcoming
sessions and dispatches start notifications.

Job frequency : every 1 minute  (configurable via SESSION_NOTIFY_INTERVAL_SECONDS)
Notify window : sessions starting within the next 15 minutes
                (configurable via SESSION_NOTIFY_MINUTES_BEFORE)

Deduplication strategy (no extra table needed):
  Query notifications WHERE target_criteria @> {"notification_type": "session_start", "session_id": X}
  If a row already exists, the session has already been notified.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from packages.utils import logger, supabase_client
from packages.session_notifier import send_session_start_notifications


# ---------------------------------------------------------------------------
# Configuration (env-var overrideable)
# ---------------------------------------------------------------------------

NOTIFY_MINUTES_BEFORE: int = int(os.environ.get("SESSION_NOTIFY_MINUTES_BEFORE", "15"))
INTERVAL_SECONDS: int = int(os.environ.get("SESSION_NOTIFY_INTERVAL_SECONDS", "60"))


# ---------------------------------------------------------------------------
# Scheduler instance (module-level singleton)
# ---------------------------------------------------------------------------

_scheduler: AsyncIOScheduler | None = None


# ---------------------------------------------------------------------------
# Deduplication helper
# ---------------------------------------------------------------------------

def _already_notified(session_id: int) -> bool:
    """
    Check if a session-start notification has already been sent
    by querying the notifications table for a matching target_criteria.
    Uses Supabase's jsonb @> (contains) operator.
    """
    try:
        res = supabase_client.table("notifications") \
            .select("notification_id") \
            .contains("target_criteria", {"notification_type": "session_start", "session_id": session_id}) \
            .limit(1) \
            .execute()
        return bool(res.data)
    except Exception as e:
        logger.warning(f"[Scheduler] Dedup check failed for session {session_id}: {e}")
        return False   # if we can't check, allow sending (better than silently skipping)


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------

def _check_and_notify_sessions() -> None:
    """
    Query sessions whose start_time falls within [now, now + NOTIFY_MINUTES_BEFORE].

    sessions.start_time is stored as `timestamp without time zone` in local time (GMT+7).
    We compare using local time (UTC+7) with tzinfo stripped to match naive DB timestamps.
    """
    # Build naive local time range (GMT+7) to match `timestamp without time zone` in DB
    UTC7 = timezone(timedelta(hours=7))
    now_local = datetime.now(UTC7).replace(tzinfo=None)          # e.g. 2026-05-04 20:35:00
    window_end_local = now_local + timedelta(minutes=NOTIFY_MINUTES_BEFORE)

    logger.info(
        f"[Scheduler] Checking sessions in window "
        f"{now_local.strftime('%H:%M:%S')} - {window_end_local.strftime('%H:%M:%S')} (GMT+7)"
    )

    try:
        sessions_res = supabase_client.table("sessions") \
            .select("session_id, session_name, start_time") \
            .gte("start_time", now_local.isoformat()) \
            .lte("start_time", window_end_local.isoformat()) \
            .execute()

        candidate_sessions = sessions_res.data or []

        if not candidate_sessions:
            logger.info("[Scheduler] No upcoming sessions in window.")
            return

        logger.info(f"[Scheduler] Candidates: {[s['session_id'] for s in candidate_sessions]}")

        for session in candidate_sessions:
            session_id = session["session_id"]
            session_name = session.get("session_name") or f"Session #{session_id}"

            if _already_notified(session_id):
                logger.info(f"[Scheduler] Session {session_id} ({session_name}) already notified, skipping.")
                continue

            logger.info(f"[Scheduler] Notifying session {session_id}: {session_name}")
            try:
                send_session_start_notifications(session_id)
            except Exception as session_err:
                logger.error(f"[Scheduler] Failed to notify session {session_id}: {session_err}")

    except Exception as e:
        logger.error(f"[Scheduler] Job error: {e}")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("[Scheduler] Already running, skipping start.")
        return

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _check_and_notify_sessions,
        trigger=IntervalTrigger(seconds=INTERVAL_SECONDS),
        id="session_start_notifier",
        name="Session Start Notifier",
        replace_existing=True,
        max_instances=1,           # prevent overlap if job takes longer than interval
        misfire_grace_time=30,     # allow up-to-30s late execution
    )
    _scheduler.start()
    logger.info(
        f"[Scheduler] Started - interval={INTERVAL_SECONDS}s, "
        f"notify_window={NOTIFY_MINUTES_BEFORE}min"
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped.")
    _scheduler = None
