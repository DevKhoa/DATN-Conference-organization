from fastapi import APIRouter, HTTPException, Query, Path
from qr_service import QRService    
from utils import logger, supabase_client
from datetime import datetime
from schema import CheckinRequest

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
        logger.info(f"Processing checkin for registration_id: {payload.registration_id}")

        response = supabase_client.table("attendences") \
            .select("*") \
            .eq("registration_id", payload.registration_id) \
            .eq("auth_token", payload.auth_token) \
            .execute()
        
        records = response.data
        
        if not records:
            logger.warning(f"Checkin failed: Invalid checkin code for registration_id {payload.registration_id}")
            raise HTTPException(status_code=400, detail="Invalid checkin code")
        
        all_checked_in = all(record.get("is_checkin") is True for record in records)
        if all_checked_in:
            logger.warning(f"Checkin failed: Already checked in for registration_id {payload.registration_id}")
            raise HTTPException(status_code=400, detail="Already checked in")
            
        current_time = datetime.now().isoformat()
        
        update_response = supabase_client.table("attendences").update({
            "is_checkin": True,
            "checkin_time": current_time
        }).eq("registration_id", payload.registration_id).eq("auth_token", payload.auth_token).execute()
        
        updated_count = len(update_response.data) if update_response.data else 0
        logger.info(f"Checkin successful: Updated {updated_count} attendance record(s) for registration_id {payload.registration_id}")
        
        return {
            "status": "success",
            "message": "Checkin successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal server error during checkin for registration_id {payload.registration_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during checkin")