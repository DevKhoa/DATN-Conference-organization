import time
from datetime import datetime, timezone

from payos.types import CreatePaymentLinkRequest
from packages.utils import Logger, supabase_client, payos_client

from fastapi import APIRouter, BackgroundTasks, HTTPException
from packages.schema import RegistrationBeforePaymentRequest, RegistrationPaymentRequest

logger = Logger()
router = APIRouter(tags=["registrations"])

@router.post("/registrations")
async def create_registration_before_payment(
    request: RegistrationBeforePaymentRequest,
    background_tasks: BackgroundTasks,
):
    if request.provider.upper() != "PAYOS":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported payment provider '{request.provider}'. Only 'PAYOS' is accepted."
        )

    try:
        # 1. Fetch ticket config — validates ticket exists and gets price
        ticket_res = supabase_client.table("ticket_configs") \
            .select("ticket_id, ticket_name, currency, description, price, is_active, quantity_limit, sold_quantity, open_time, close_time") \
            .eq("ticket_id", request.ticket_id) \
            .single() \
            .execute()

        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")

        ticket_info = ticket_res.data

        if not ticket_info.get("is_active"):
            raise HTTPException(status_code=400, detail="This ticket is no longer available.")
            
        now = datetime.now(timezone.utc)
        open_time_str = ticket_info.get("open_time")
        close_time_str = ticket_info.get("close_time")
        
        if open_time_str and close_time_str:
            open_time = datetime.fromisoformat(open_time_str.replace("Z", "+00:00"))
            close_time = datetime.fromisoformat(close_time_str.replace("Z", "+00:00"))
            # Ensure both are timezone-aware (Supabase may return naive timestamps)
            if open_time.tzinfo is None:
                open_time = open_time.replace(tzinfo=timezone.utc)
            if close_time.tzinfo is None:
                close_time = close_time.replace(tzinfo=timezone.utc)
            if not (open_time <= now <= close_time):
                raise HTTPException(status_code=400, detail="This ticket is not currently available for purchase (outside of sale window).")

        quantity_limit = ticket_info.get("quantity_limit")
        sold_quantity = ticket_info.get("sold_quantity", 0) or 0
        if quantity_limit is not None and sold_quantity >= quantity_limit:
            raise HTTPException(status_code=400, detail="This ticket is sold out.")

        total_amount = int(ticket_info.get("price") or 0)

        # Guard: for FREE tickets, only allow 1 registration per user per ticket
        if total_amount <= 0:
            existing_res = supabase_client.table("registrations") \
                .select("registration_id") \
                .eq("user_id", request.user_id) \
                .eq("ticket_id", request.ticket_id) \
                .execute()
            if existing_res.data:
                raise HTTPException(
                    status_code=400,
                    detail="You have already registered for this free ticket. Only one registration per free ticket is allowed."
                )

        # 2. Cleanup abandoned unpaid registrations for this user and ticket
        existing_regs = supabase_client.table("registrations") \
            .select("registration_id, transactions(status)") \
            .eq("user_id", request.user_id) \
            .eq("ticket_id", request.ticket_id) \
            .execute()
            
        for reg in (existing_regs.data or []):
            txs = reg.get("transactions") or []
            # If there are no COMPLETED transactions, it's an abandoned unpaid registration
            if not any(tx.get("status") == "COMPLETED" for tx in txs):
                reg_id = reg["registration_id"]
                try:
                    supabase_client.table("transactions").delete().eq("registration_id", reg_id).execute()
                    supabase_client.table("attendences").delete().eq("registration_id", reg_id).execute()
                    supabase_client.table("registrations").delete().eq("registration_id", reg_id).execute()
                    logger.info(f"Cleaned up abandoned unpaid registration {reg_id}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup abandoned registration {reg_id}: {e}")

        # 3. Create the registration record
        now = datetime.now(timezone.utc).isoformat()
        reg_res = supabase_client.table("registrations").insert({
            "user_id": request.user_id,
            "ticket_id": request.ticket_id,
            "created_at": now,
        }).execute()

        if not reg_res.data:
            raise HTTPException(status_code=500, detail="Failed to create registration.")

        registration_id = reg_res.data[0]["registration_id"]
        logger.info(f"Registration {registration_id} created for user {request.user_id}, ticket {request.ticket_id}")

        # 4a. FREE ticket — complete immediately without PayOS
        if total_amount <= 0:
            return await _complete_free_registration(
                registration_id=registration_id,
                ticket_info=ticket_info,
                user_id=request.user_id,
                background_tasks=background_tasks,
                return_url=request.returnUrl,
            )

        # 4b. Paid ticket — chain into PayOS payment creation
        # IMPORTANT: Since trigger auto-creates attendences upon registration insert, 
        # but payment is not yet completed, we must delete them. They will be recreated on success.
        try:
            supabase_client.table("attendences").delete().eq("registration_id", registration_id).execute()
        except Exception as e:
            logger.warning(f"Failed to delete initial attendences for {registration_id}: {e}")

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
        raise HTTPException(status_code=500, detail=str(e))


async def _complete_free_registration(
    registration_id: int,
    ticket_info: dict,
    user_id: int,
    background_tasks: BackgroundTasks,
    return_url: str,
):
    """Handle free (price=0) tickets: skip PayOS, complete registration & send QR email immediately."""
    from routers.payments import _send_registration_qr_email

    ticket_id = ticket_info["ticket_id"]
    now = datetime.now(timezone.utc).isoformat()

    # Fetch sessions linked to this ticket
    sessions_res = supabase_client.table("ticket_session") \
        .select("session:sessions(session_id, session_name, start_time, end_time, room_location)") \
        .eq("ticket_id", ticket_id) \
        .execute()

    sessions = [
        {
            "session_id": row["session"]["session_id"],
            "session_name": row["session"]["session_name"],
            "start_time": row["session"]["start_time"],
            "end_time": row["session"]["end_time"],
            "room_location": row["session"]["room_location"],
        }
        for row in (sessions_res.data or []) if row.get("session")
    ]

    ticket_data = {
        "ticket_id": ticket_id,
        "ticket_name": ticket_info.get("ticket_name"),
        "currency": ticket_info.get("currency", "VND"),
        "description": ticket_info.get("description"),
        "price": 0,
        "sessions": sessions,
    }

    # Record a COMPLETED transaction for audit trail
    supabase_client.table("transactions").insert({
        "order_type": "REGISTRATION",
        "registration_id": registration_id,
        "payment_gateway": "PAYOS",
        "amount": 0,
        "order_code": str(int(time.time())),
        "status": "COMPLETED",
        "metadata": {"ticket_data": ticket_data},
        "created_at": now,
        "updated_at": now,
    }).execute()

    # Update sold_quantity for free ticket
    try:
        t_res = supabase_client.table("ticket_configs").select("sold_quantity").eq("ticket_id", ticket_id).single().execute()
        current_sold = (t_res.data or {}).get("sold_quantity") or 0
        supabase_client.table("ticket_configs").update({"sold_quantity": current_sold + 1}).eq("ticket_id", ticket_id).execute()
    except Exception as e:
        logger.error(f"Failed to increment sold_quantity for free ticket {ticket_id}: {e}")

    # Fetch user email for QR email
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
            ticket_data=ticket_data,
        )
        logger.info(f"Free registration {registration_id} completed; QR email queued for {user_email}.")
    else:
        logger.warning(f"Free registration {registration_id}: no user email found, skipping QR email.")

    return {
        "status": "success",
        "registration_id": registration_id,
        "order_code": None,
        "checkout_url": return_url,  # redirect back to conference page directly
        "amount": 0,
        "provider": "FREE",
    }


async def _create_payment_for_registration(
    registration_id: int,
    ticket_info: dict,
    provider: str,
    return_url: str,
):
    """Shared payment creation logic used by both registration endpoints."""
    ticket_id = ticket_info["ticket_id"]
    total_amount = int(ticket_info.get("price") or 0)

    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Ticket price must be greater than 0.")

    MIN_AMOUNT = 2_000
    MAX_AMOUNT = 2_000_000_000
    if not (MIN_AMOUNT <= total_amount <= MAX_AMOUNT):
        raise HTTPException(
            status_code=400,
            detail=f"Ticket price ({total_amount:,} VND) is outside the allowed range ({MIN_AMOUNT:,} – {MAX_AMOUNT:,} VND)."
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
        description=f"Conference Ticket {ticket_id}",
        return_url=return_url,
        cancel_url=return_url,
    )

    payment_link = await payos_client.payment_requests.create(payment_data)

    now = datetime.now(timezone.utc).isoformat()
    supabase_client.table("transactions").insert({
        "order_type": "REGISTRATION",
        "registration_id": registration_id,
        "payment_gateway": "PAYOS",
        "amount": total_amount,
        "order_code": str(order_code),
        "status": "PENDING",
        "metadata": {"ticket_data": ticket_data},
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

