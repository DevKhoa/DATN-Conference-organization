import time
from datetime import datetime, timezone

from payos.types import CreatePaymentLinkRequest
from packages.utils import Logger, supabase_client, payos_client

from fastapi import APIRouter, HTTPException
from packages.schema import RegistrationBeforePaymentRequest, RegistrationPaymentRequest

logger = Logger()
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
            raise HTTPException(status_code=500, detail="Failed to create registration.")

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
        raise HTTPException(status_code=500, detail=str(e))


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

