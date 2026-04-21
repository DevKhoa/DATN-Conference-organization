import tempfile
import time
from datetime import datetime, timezone

from payos.types import CreatePaymentLinkRequest
from utils import logger, supabase_client, payos_client, get_exchange_rate_to_vnd
from qr_service import QRService
from my_email import send_email_with_attachment

from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from schema import RegistrationBeforePaymentRequest, RegistrationPaymentRequest

router = APIRouter(tags=["registrations"])

@router.post("/registrations")
async def create_registration_before_payment(
    request: RegistrationBeforePaymentRequest
):
    if request.provider.upper() != "PAYOS":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported payment provider '{request.provider}'. Only 'PAYOS' is accepted."
        )

    try:
        # 1. Fetch ticket config — validates ticket exists and gets price
        ticket_res = supabase_client.table("ticket_configs") \
            .select("ticket_id, ticket_name, currency, description, price, is_active, quantity_limit, sold_quantity") \
            .eq("ticket_id", request.ticket_id) \
            .single() \
            .execute()

        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")

        ticket_info = ticket_res.data

        if not ticket_info.get("is_active"):
            raise HTTPException(status_code=400, detail="This ticket is no longer available.")

        quantity_limit = ticket_info.get("quantity_limit")
        sold_quantity = ticket_info.get("sold_quantity", 0) or 0
        if quantity_limit is not None and sold_quantity >= quantity_limit:
            raise HTTPException(status_code=400, detail="This ticket is sold out.")

        # 2. Create the registration record
        now = datetime.now(timezone.utc).isoformat()
        reg_res = supabase_client.table("registrations").insert({
            "user_id": request.user_id,
            "ticket_id": request.ticket_id,
            "created_at": now,
        }).execute()

        if not reg_res.data:
            raise HTTPException(status_code=500, detail="Failed to create registration record.")

        registration_id = reg_res.data[0]["registration_id"]
        logger.info(f"Registration {registration_id} created for user {request.user_id}, ticket {request.ticket_id}")

        # 3. Chain directly into payment creation
        return await _create_payment_for_registration(
            registration_id=registration_id,
            ticket_info=ticket_info,
            provider=request.provider,
            return_url=request.returnUrl,
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Create registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process registration: {str(e)}")


async def _create_payment_for_registration(
    registration_id: int,
    ticket_info: dict,
    provider: str,
    return_url: str,
):
    """Shared payment creation logic used by both registration endpoints."""
    ticket_id = ticket_info["ticket_id"]
    original_price = float(ticket_info.get("price") or 0)
    currency = (ticket_info.get("currency") or "VND").upper()

    if original_price <= 0:
        raise HTTPException(status_code=400, detail="Ticket price must be greater than 0.")

    # Real-time currency conversion to VND
    rate = get_exchange_rate_to_vnd(currency)
    total_amount = int(original_price * rate)

    MIN_AMOUNT = 2_000
    MAX_AMOUNT = 2_000_000_000
    if not (MIN_AMOUNT <= total_amount <= MAX_AMOUNT):
        raise HTTPException(
            status_code=400,
            detail=f"Ticket price after conversion ({total_amount:,} VND) is outside the allowed range ({MIN_AMOUNT:,} – {MAX_AMOUNT:,} VND)."
        )

    # Fetch sessions for the ticket_data snapshot
    sessions_res = supabase_client.table("ticket_session") \
        .select("session:sessions(session_id, session_name, start_time, end_time, room_location)") \
        .eq("ticket_id", ticket_id) \
        .execute()

    ticket_data = {
        "ticket_id": ticket_id,
        "ticket_name": ticket_info.get("ticket_name"),
        "currency": ticket_info.get("currency", "VND"),
        "description": ticket_info.get("description"),
        "price": total_amount,
        "sessions": [
            {
                "session_id": row["session"]["session_id"],
                "session_name": row["session"]["session_name"],
                "start_time": row["session"]["start_time"],
                "end_time": row["session"]["end_time"],
                "room_location": row["session"]["room_location"],
            }
            for row in (sessions_res.data or []) if row.get("session")
        ],
    }

    order_code = int(time.time())

    payment_data = CreatePaymentLinkRequest(
        order_code=order_code,
        amount=total_amount,
        description=f"Conference Ticket {ticket_id} Fee",
        return_url=return_url,
        cancel_url=return_url,
    )

    payment_link = await payos_client.payment_requests.create(payment_data)

    now = datetime.now(timezone.utc).isoformat()
    supabase_client.table("transactions").insert({
        "registration_id": registration_id,
        "payment_gateway": "PAYOS",
        "amount": total_amount,
        "order_code": str(order_code),
        "status": "PENDING",
        "ticket_data": ticket_data,
        "created_at": now,
        "updated_at": now,
    }).execute()

    logger.info(f"Payment created for registration {registration_id}: order_code={order_code}, amount={total_amount}")

    return {
        "status": "success",
        "registration_id": registration_id,
        "order_code": order_code,
        "checkout_url": payment_link.checkout_url,
        "amount": total_amount,
        "provider": provider.upper(),
    }


@router.post("/registrations/{registration_id}/payments")
async def create_registration_payment(
    registration_id: int,
    request: RegistrationPaymentRequest
):
    if request.provider.upper() != "PAYOS":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported payment provider '{request.provider}'. Only 'PAYOS' is accepted."
        )

    try:
        # 1. Verify registration exists and retrieve ticket_id
        reg_res = supabase_client.table("registrations") \
            .select("registration_id, ticket_id") \
            .eq("registration_id", registration_id) \
            .single() \
            .execute()

        if not reg_res.data:
            raise HTTPException(status_code=404, detail="Registration record not found.")

        ticket_id = reg_res.data.get("ticket_id")
        if not ticket_id:
            raise HTTPException(status_code=400, detail="No valid ticket associated with this registration.")

        # 2. Check if this registration has already been paid
        trans_res = supabase_client.table("transactions") \
            .select("trans_id, status") \
            .eq("registration_id", registration_id) \
            .execute()

        non_pending_statuses = {"COMPLETED"}
        if any(t.get("status") in non_pending_statuses for t in (trans_res.data or [])):
            raise HTTPException(status_code=400, detail="This registration has already been paid successfully.")

        # 3. Fetch ticket config (price is the source of truth)
        ticket_res = supabase_client.table("ticket_configs") \
            .select("ticket_id, ticket_name, currency, description, price") \
            .eq("ticket_id", ticket_id) \
            .single() \
            .execute()

        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")

        return await _create_payment_for_registration(
            registration_id=registration_id,
            ticket_info=ticket_res.data,
            provider=request.provider,
            return_url=request.returnUrl,
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Payment creation for registration {registration_id} failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize payment: {str(e)}")

def _send_registration_qr_email(
    registration_id: int,
    user_email: str,
    user_name: str,
    ticket_data: dict,
):
    """Background task: generate a QR code and email it to the attendee."""
    try:
        qr_service = QRService()
        with tempfile.TemporaryDirectory() as tmp_dir:
            qr_path = qr_service.generate_qr(
                registration_id=registration_id,
                message=str(registration_id),
                output_dir=tmp_dir,
            )

            ticket_name = ticket_data.get("ticket_name", "Conference Ticket")
            sessions = ticket_data.get("sessions") or []
            session_lines = "\n".join(
                f"  • {s.get('session_name', 'Session')}  |  "
                f"{s.get('room_location', '')}  |  "
                f"{s.get('start_time', '')}"
                for s in sessions
            )

            body = (
                f"Dear {user_name},\n\n"
                f"Your registration is confirmed! "
                f"Please find your personal QR code attached.\n"
                f"Present it at each session entrance for check-in.\n\n"
                f"Ticket : {ticket_name}\n"
                f"Sessions:\n{session_lines}\n\n"
                f"Best regards,\nConf-Org Team"
            )

            send_email_with_attachment(
                recipient_email=user_email,
                subject=f"Your Conference QR Code — {ticket_name}",
                body=body,
                attachment_path=qr_path,
                attachment_name=f"checkin_qr_{registration_id}.png",
            )
            logger.info(f"QR email sent to {user_email} for registration {registration_id}")
    except Exception as e:
        logger.error(f"Failed to send QR email for registration {registration_id}: {e}")


@router.post("/registrations/payments/payos/confirm-webhook")
async def confirm_registration_payment_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.body()
        webhook_data = await payos_client.webhooks.verify(body)

        order_code = webhook_data.order_code
        logger.info(f"Webhook received for order code: {order_code}")

        # Find the matching transaction
        trans_res = supabase_client.table("transactions") \
            .select("trans_id, status, registration_id, ticket_data") \
            .eq("order_code", order_code) \
            .execute()

        if not trans_res.data:
            logger.warning(f"Webhook: no transaction found for order_code={order_code}")
            return {"message": "OK"}

        trans = trans_res.data[0]

        if trans["status"] != "PENDING":
            logger.info(f"Transaction {trans['trans_id']} already in status '{trans['status']}', skipping update.")
            return {"message": "OK"}

        now = datetime.now(timezone.utc).isoformat()
        supabase_client.table("transactions").update({
            "status": "COMPLETED",
            "provider_tx_ref": str(getattr(webhook_data, 'reference', '')),
            "updated_at": now,
        }).eq("trans_id", trans["trans_id"]).execute()

        logger.info(f"Transaction {trans['trans_id']} marked COMPLETED for order_code={order_code}")

        # Create attendance records for each session in the ticket snapshot
        registration_id = trans.get("registration_id")
        sessions = (trans.get("ticket_data") or {}).get("sessions") or []

        if registration_id and sessions:
            attendance_records = [
                {
                    "registration_id": registration_id,
                    "session_id": s["session_id"],
                    "is_checkin": False,
                }
                for s in sessions if s.get("session_id")
            ]
            if attendance_records:
                supabase_client.table("attendences") \
                    .upsert(attendance_records, ignore_duplicates=True) \
                    .execute()
                logger.info(
                    f"Created {len(attendance_records)} attendance record(s) "
                    f"for registration {registration_id}"
                )

                # Fetch user details for QR email
                user_res = supabase_client.table("registrations") \
                    .select("user:profiles(email, full_name)") \
                    .eq("registration_id", registration_id) \
                    .single() \
                    .execute()

                user = (user_res.data or {}).get("user") or {}
                user_email = user.get("email")
                if user_email:
                    background_tasks.add_task(
                        _send_registration_qr_email,
                        registration_id=registration_id,
                        user_email=user_email,
                        user_name=user.get("full_name") or "Attendee",
                        ticket_data=trans.get("ticket_data") or {},
                    )

        return {"message": "OK"}

    except Exception as e:
        logger.error(f"Webhook verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid webhook")
