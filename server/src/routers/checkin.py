from fastapi import APIRouter, HTTPException, Query, Path
from packages.qr_service import QRService    
from packages.utils import Logger, supabase_client
from datetime import datetime
from packages.schema import CheckinRequest

logger = Logger()
qr_service = QRService()


router = APIRouter(tags=["checkin"])

@router.post("/qr/registration-id/{registration_id}")
async def generate_qr(registration_id: int):
    try:
        reg_res = supabase_client.table("registrations").select("ticket_id").eq("registration_id", registration_id).single().execute()
        if not reg_res.data:
            raise HTTPException(status_code=404, detail="Registration not found")
        ticket_id = reg_res.data.get("ticket_id")

        ts_res = supabase_client.table("ticket_session").select("session_id").eq("ticket_id", ticket_id).limit(1).single().execute()
        if not ts_res.data:
            raise HTTPException(status_code=404, detail="Ticket not linked to any session")
        session_id = ts_res.data.get("session_id")

        sess_res = supabase_client.table("sessions").select("conf_id").eq("session_id", session_id).single().execute()
        conf_id = sess_res.data.get("conf_id")

        conf_res = supabase_client.table("conferences").select("conf_name").eq("conf_id", conf_id).single().execute()
        conference_name = conf_res.data.get("conf_name")

        message = f"Thank you for registering to attend the {conference_name} conference. Your check-in code is {registration_id}"

        qr_service.generate_qr(registration_id, message=message)

        logger.info(f"QR generated successfully for registration ID: {registration_id}")

        return {
            "status": "success", 
            "message": "QR generated successfully",
            "qr_content": message
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QR Generation Failed: {e}")
        raise HTTPException(status_code=500, detail="Error generating QR code")
    
@router.post("/checkin")
async def process_checkin(payload: CheckinRequest):
    try:
        logger.info(f"Processing checkin for registration_id: {payload.registration_id}, session_ids: {payload.session_ids}")

        if not payload.session_ids:
            raise HTTPException(status_code=400, detail="The session_ids list cannot be empty")

        response = supabase_client.table("attendences") \
            .select("*") \
            .eq("registration_id", payload.registration_id) \
            .in_("session_id", payload.session_ids) \
            .execute()
        
        records = response.data
        
        found_session_ids = [record["session_id"] for record in records]
        missing_sessions = set(payload.session_ids) - set(found_session_ids)
        
        if missing_sessions:
            logger.warning(f"Checkin failed: Records not found for registration_id {payload.registration_id} and missing session_ids: {list(missing_sessions)}")
            raise HTTPException(
                status_code=404, 
                detail=f"Attendance records not found for sessions: {list(missing_sessions)}"
            )
        
        already_checked_in = [record["session_id"] for record in records if record.get("is_checkin") is True]
        
        if already_checked_in:
            logger.warning(f"Checkin failed: Already checked in for registration_id {payload.registration_id}, session_ids: {already_checked_in}")
            raise HTTPException(
                status_code=400, 
                detail=f"Already checked in for sessions: {already_checked_in}"
            )
            
        current_time = datetime.now().isoformat()
        
        update_response = supabase_client.table("attendences").update({
            "is_checkin": True,
            "checkin_time": current_time
        }).eq("registration_id", payload.registration_id) \
          .in_("session_id", payload.session_ids) \
          .execute()
        
        updated_count = len(update_response.data) if update_response.data else 0
        
        # Fetch attendee name
        attendee_name = "Unknown Attendee"
        try:
            reg_res = supabase_client.table("registrations").select("profiles(full_name)").eq("registration_id", payload.registration_id).single().execute()
            if reg_res.data and reg_res.data.get("profiles") and reg_res.data["profiles"].get("full_name"):
                attendee_name = reg_res.data["profiles"]["full_name"]
        except Exception as e:
            logger.error(f"Failed to fetch attendee name for registration {payload.registration_id}: {e}")

        logger.info(f"Checkin successful: Updated {updated_count} attendance record(s) for registration_id {payload.registration_id}")
        
        return {
            "status": "success",
            "message": f"Successfully checked in for {updated_count} session(s)",
            "checked_in_sessions": payload.session_ids,
            "attendee_name": attendee_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal server error during checkin for registration_id {payload.registration_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during checkin")