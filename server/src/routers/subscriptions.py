import time
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException
from payos.types import CreatePaymentLinkRequest

from packages.schema import SubscriptionCreateRequest, SubscriptionUpgradeRequest
from packages.utils import Logger, payos_client, supabase_client

logger = Logger()
router = APIRouter(tags=["subscriptions"])


def _calculate_expires_at(subscription_type: str, started_at: datetime) -> datetime:
	if subscription_type == "1_MONTH":
		return started_at + timedelta(days=30)
	if subscription_type == "3_MONTH":
		return started_at + timedelta(days=90)
	if subscription_type == "1_YEAR":
		return started_at + timedelta(days=365)

	raise HTTPException(status_code=400, detail=f"Unsupported subscription type: {subscription_type}")


@router.post("/subscriptions")
async def create_subscription(request: SubscriptionCreateRequest):
	if request.provider.upper() != "PAYOS":
		raise HTTPException(
			status_code=400,
			detail=f"Unsupported payment provider '{request.provider}'. Only 'PAYOS' is accepted.",
		)

	try:
		current_subscription_res = supabase_client.rpc(
			"admin_get_user_subscription",
			{"p_user_id": request.user_id},
		).execute()
		current_subscription = (current_subscription_res.data or [None])[0]
		if current_subscription and current_subscription.get("is_valid") and current_subscription.get("status") in ["ACTIVE", "CANCELED"]:
			raise HTTPException(
				status_code=400,
				detail="You already have a valid subscription period.",
			)

		plan_res = supabase_client.table("subscription_plans") \
			.select("plan_id, plan_code, name, description, price, monthly_tokens, max_chats_per_day, subscription_type, is_active") \
			.eq("plan_id", request.plan_id) \
			.single() \
			.execute()

		if not plan_res.data:
			raise HTTPException(status_code=404, detail="Subscription plan not found.")

		plan = plan_res.data
		if not plan.get("is_active"):
			raise HTTPException(status_code=400, detail="This subscription plan is no longer available.")

		amount = int(plan.get("price") or 0)
		if amount <= 0:
			raise HTTPException(status_code=400, detail="Subscription price must be greater than 0.")

		min_amount = 2_000
		max_amount = 2_000_000_000
		if not (min_amount <= amount <= max_amount):
			raise HTTPException(
				status_code=400,
				detail=f"Subscription price ({amount:,} VND) is outside the allowed range ({min_amount:,} – {max_amount:,} VND).",
			)

		now_dt = datetime.now(timezone.utc)
		started_at = now_dt.isoformat()
		expires_at = _calculate_expires_at(plan["subscription_type"], now_dt).isoformat()

		subscription_res = supabase_client.table("subscriptions").insert({
			"user_id": request.user_id,
			"subscription_type": plan["subscription_type"],
			"monthly_tokens": plan["monthly_tokens"],
			"tokens_remaining": plan["monthly_tokens"],
			"status": "PENDING",
			"price_paid": amount,
			"started_at": started_at,
			"last_reset_at": started_at,
			"expires_at": expires_at,
			"created_at": started_at,
			"updated_at": started_at,
		}).execute()

		if not subscription_res.data:
			raise HTTPException(status_code=500, detail="Failed to create subscription record.")

		subscription_id = subscription_res.data[0]["subscription_id"]
		order_code = int(time.time())

		payment_data = CreatePaymentLinkRequest(
			order_code=order_code,
			amount=amount,
			description=f"Sub {plan['plan_code']}",
			return_url=request.returnUrl,
			cancel_url=request.returnUrl,
		)

		payment_link = await payos_client.payment_requests.create(payment_data)

		supabase_client.table("transactions").insert({
			"order_type": "SUBSCRIPTION",
			"subscription_id": subscription_id,
			"payment_gateway": "PAYOS",
			"amount": amount,
			"order_code": str(order_code),
			"status": "PENDING",
			"metadata": {
				"plan_data": {
					"plan_id": plan["plan_id"],
					"plan_code": plan["plan_code"],
					"name": plan["name"],
					"description": plan.get("description"),
					"subscription_type": plan["subscription_type"],
					"monthly_tokens": plan["monthly_tokens"],
					"max_chats_per_day": plan.get("max_chats_per_day"),
				}
			},
			"created_at": started_at,
			"updated_at": started_at,
		}).execute()

		logger.info(
			f"Subscription payment created: subscription_id={subscription_id}, order_code={order_code}, amount={amount}"
		)

		return {
			"status": "success",
			"subscription_id": subscription_id,
			"order_code": order_code,
			"checkout_url": payment_link.checkout_url,
			"amount": amount,
			"provider": request.provider.upper(),
		}

	except HTTPException as he:
		raise he
	except Exception as e:
		logger.error(f"Create subscription failed: {str(e)}")
		raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscriptions/upgrade")
async def upgrade_subscription(request: SubscriptionUpgradeRequest):
	if request.provider.upper() != "PAYOS":
		raise HTTPException(
			status_code=400,
			detail=f"Unsupported payment provider '{request.provider}'. Only 'PAYOS' is accepted.",
		)

	try:
		# Get current user's valid subscription (ACTIVE or CANCELED but not expired)
		current_subscription_res = supabase_client.rpc(
			"admin_get_user_subscription",
			{"p_user_id": request.user_id},
		).execute()
		current_subscription = (current_subscription_res.data or [None])[0]
		if not current_subscription or not current_subscription.get("is_valid") or current_subscription.get("status") not in ["ACTIVE", "CANCELED"]:
			raise HTTPException(
				status_code=400,
				detail="You do not have a valid subscription to upgrade.",
			)

		current_subscription_id = current_subscription.get("subscription_id")

		# Validate new plan exists and is active
		plan_res = supabase_client.table("subscription_plans") \
			.select("plan_id, plan_code, name, subscription_type, monthly_tokens") \
			.eq("plan_code", request.new_plan_code) \
			.eq("is_active", True) \
			.single() \
			.execute()

		if not plan_res.data:
			raise HTTPException(status_code=404, detail="New subscription plan not found or inactive.")

		new_plan = plan_res.data

		# Check if it's actually an upgrade
		current_tokens = current_subscription.get("monthly_tokens", 0)
		if new_plan["monthly_tokens"] <= current_tokens:
			raise HTTPException(
				status_code=400,
				detail=f"This plan ({new_plan['monthly_tokens']} tokens) is not an upgrade from your current plan ({current_tokens} tokens).",
			)

		# Call admin_upgrade_subscription RPC
		order_code = str(int(time.time()))
		upgrade_res = supabase_client.rpc(
			"admin_upgrade_subscription",
			{
				"p_current_subscription_id": current_subscription_id,
				"p_new_plan_code": request.new_plan_code,
				"p_payment_gateway": "PAYOS",
				"p_order_code": order_code,
				"p_notes": {
					"source": "user_upgrade_api",
					"previous_subscription_id": current_subscription_id,
					"requested_by_user_id": request.user_id,
				},
			}
		).execute()

		if not upgrade_res.data or not upgrade_res.data[0]:
			raise HTTPException(status_code=500, detail="Failed to upgrade subscription.")

		upgrade_result = upgrade_res.data[0]
		new_subscription_id = upgrade_result["subscription_id"]
		amount_to_pay = float(upgrade_result["amount_to_pay"])

		checkout_url = None

		# Only create PayOS payment if there's an amount to pay
		if amount_to_pay > 0:
			min_amount = 2_000
			max_amount = 2_000_000_000
			if not (min_amount <= amount_to_pay <= max_amount):
				raise HTTPException(
					status_code=400,
					detail=f"Amount to pay ({amount_to_pay:,.0f} VND) is outside allowed range ({min_amount:,} – {max_amount:,} VND).",
				)

			payment_data = CreatePaymentLinkRequest(
				order_code=int(float(order_code)),
				amount=int(amount_to_pay),
				description=f"Upgrade to {request.new_plan_code}",
				return_url=request.returnUrl,
				cancel_url=request.returnUrl,
			)

			payment_link = await payos_client.payment_requests.create(payment_data)
			checkout_url = payment_link.checkout_url

		logger.info(
			f"Subscription upgrade initiated: old_subscription_id={current_subscription_id}, new_subscription_id={new_subscription_id}, amount={amount_to_pay}"
		)

		return {
			"status": "success",
			"subscription_id": new_subscription_id,
			"order_code": order_code,
			"checkout_url": checkout_url,
			"amount_to_pay": amount_to_pay,
			"provider": request.provider.upper(),
		}

	except HTTPException as he:
		raise he
	except Exception as e:
		logger.error(f"Upgrade subscription failed: {str(e)}")
		raise HTTPException(status_code=500, detail=str(e))
