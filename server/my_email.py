import smtplib
from email.message import EmailMessage
import os
from utils import logger

SENDER_EMAIL = os.environ['GMAIL']
APP_PASSWORD =  os.environ['GMAIL_APP_PASSWORD']

def send_email(recipient_email : str, subject : str, body : str):
    msg = EmailMessage()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.set_content(body)

    logger.info(f"Sending email to: {recipient_email}\n Subject: {subject}\n Content: {body}")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SENDER_EMAIL, APP_PASSWORD)
            smtp.send_message(msg)

    except Exception as e:
        logger.error(f"Failed to send email: {e}")
