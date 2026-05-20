import tempfile
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from packages.my_email import send_email_with_attachment
from packages.qr_service import QRService
from packages.utils import Logger, payos_client, supabase_client

logger = Logger()
router = APIRouter(tags=["payments"])


@router.post("/payments/payos/complete-registration")
async def complete_registration_after_payment(
	order_code: str,
	background_tasks: BackgroundTasks,
):
	"""
	Fallback endpoint called by the frontend after a successful PayOS redirect.
	Completes the registration, creates attendance records, and sends the QR email.
	Used when the PayOS webhook cannot reach the server (e.g., localhost dev).
	"""
	try:
		trans_res = supabase_client.table("transactions") \
			.select("trans_id, status, order_type, registration_id, metadata") \
			.eq("order_code", str(order_code)) \
			.single() \
			.execute()

		if not trans_res.data:
			raise HTTPException(status_code=404, detail="Transaction not found.")

		trans = trans_res.data

		if trans["status"] == "COMPLETED":
			# Already processed (webhook arrived first)
			return {"message": "Already completed."}

		if trans["status"] != "PENDING":
			raise HTTPException(status_code=400, detail=f"Transaction is in status '{trans['status']}', cannot complete.")

		# Verify payment with PayOS
		payment_info = await payos_client.payment_requests.getPaymentLinkInformation(int(order_code))
		if not payment_info or payment_info.status != "PAID":
			raise HTTPException(status_code=400, detail="Payment has not been confirmed by PayOS yet.")

		now = datetime.now(timezone.utc).isoformat()
		supabase_client.table("transactions").update({
			"status": "COMPLETED",
			"updated_at": now,
		}).eq("trans_id", trans["trans_id"]).execute()

		registration_id = trans.get("registration_id")
		metadata = trans.get("metadata") or {}
		ticket_data = metadata.get("ticket_data") or metadata
		sessions = ticket_data.get("sessions") or []

		if registration_id:
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
				logger.info(f"Fallback: QR email queued for registration {registration_id} → {user_email}")
			else:
				logger.warning(f"Fallback: no email found for registration {registration_id}.")

		return {"message": "Registration completed successfully."}

	except HTTPException as he:
		raise he
	except Exception as e:
		logger.error(f"complete_registration_after_payment failed: {e}")
		raise HTTPException(status_code=500, detail=str(e))



def _calculate_expires_at(subscription_type: str, started_at: datetime) -> datetime:
	if subscription_type == "1_MONTH":
		return started_at + timedelta(days=30)
	if subscription_type == "3_MONTH":
		return started_at + timedelta(days=90)
	if subscription_type == "1_YEAR":
		return started_at + timedelta(days=365)
	raise HTTPException(status_code=400, detail=f"Unsupported subscription type: {subscription_type}")


def _send_registration_qr_email(
	registration_id: int,
	user_email: str,
	user_name: str,
	ticket_data: dict,
):
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



@router.post("/payments/payos/confirm-webhook")
async def confirm_payment_webhook(request: Request, background_tasks: BackgroundTasks):
	try:
		body = await request.body()
		webhook_data = await payos_client.webhooks.verify(body)

		order_code = webhook_data.order_code
		logger.info(f"Webhook received for order code: {order_code}")

		trans_res = supabase_client.table("transactions") \
			.select("trans_id, status, order_type, registration_id, subscription_id, metadata") \
			.eq("order_code", str(order_code)) \
			.eq("status", "PENDING") \
			.execute()

		if not trans_res.data:
			logger.warning(f"Webhook: no transaction found for order_code={order_code}")
			return {"message": "OK"}

		trans = trans_res.data[0]
		if trans["status"] != "PENDING":
			logger.info(f"Transaction {trans['trans_id']} already in status '{trans['status']}', skipping update.")
			return {"message": "OK"}

		metadata = trans.get("metadata") or {}

		now_dt = datetime.now(timezone.utc)
		now = now_dt.isoformat()
		supabase_client.table("transactions").update({
			"status": "COMPLETED",
			"provider_tx_ref": str(getattr(webhook_data, "reference", "")),
			"updated_at": now,
		}).eq("trans_id", trans["trans_id"]).execute()

		logger.info(f"Transaction {trans['trans_id']} marked COMPLETED for order_code={order_code}")

		order_type = trans.get("order_type")
		if order_type == "REGISTRATION":
			registration_id = trans.get("registration_id")
			ticket_data = metadata.get("ticket_data") or metadata
			sessions = ticket_data.get("sessions") or []

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
						.upsert(
							attendance_records,
							on_conflict="registration_id,session_id",
							ignore_duplicates=True,
						) \
						.execute()

			if registration_id:
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
				else:
					logger.warning(f"No user email found for registration {registration_id}; skipping QR email.")

		elif order_type == "SUBSCRIPTION":
			subscription_id = trans.get("subscription_id")
			if subscription_id:
				sub_res = supabase_client.table("subscriptions") \
					.select("subscription_id, subscription_type, monthly_tokens, expires_at") \
					.eq("subscription_id", subscription_id) \
					.single() \
					.execute()

				if sub_res.data:
					action = metadata.get("action")
					is_upgrade = action in ["upgrade", "admin_upgrade"]

					if is_upgrade:
						supabase_client.table("subscriptions").update({
							"status": "ACTIVE",
							"tokens_remaining": sub_res.data["monthly_tokens"],
							"updated_at": now,
						}).eq("subscription_id", subscription_id).execute()

						# For admin upgrade flow, cancel the previous subscription after payment succeeds.
						admin_notes = metadata.get("admin_notes") or {}
						previous_subscription_id = admin_notes.get("previous_subscription_id")
						if action == "admin_upgrade" and previous_subscription_id:
							supabase_client.table("subscriptions").update({
								"status": "CANCELED",
								"canceled_at": now,
								"updated_at": now,
							}).eq("subscription_id", previous_subscription_id).execute()

						logger.info(
							f"Subscription {subscription_id} upgrade payment completed; keeping existing expiry {sub_res.data.get('expires_at')}.")
					else:
						expires_at = _calculate_expires_at(sub_res.data["subscription_type"], now_dt).isoformat()
						supabase_client.table("subscriptions").update({
							"status": "ACTIVE",
							"started_at": now,
							"last_reset_at": now,
							"expires_at": expires_at,
							"tokens_remaining": sub_res.data["monthly_tokens"],
							"updated_at": now,
						}).eq("subscription_id", subscription_id).execute()

						logger.info(f"Subscription {subscription_id} activated.")
				else:
					logger.warning(f"Subscription {subscription_id} not found during webhook processing.")

		return {"message": "OK"}

	except Exception as e:
		logger.error(f"Webhook verification failed: {str(e)}")
		raise HTTPException(status_code=400, detail="Invalid webhook")
