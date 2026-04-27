import smtplib
from email.message import EmailMessage
import os
from packages.utils import logger

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


def send_email_with_attachment(
    recipient_email: str,
    subject: str,
    body: str,
    attachment_path: str,
    attachment_name: str = "qrcode.png",
):
    import os
    msg = EmailMessage()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.set_content(body)

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            img_data = f.read()
        msg.add_attachment(img_data, maintype='image', subtype='png', filename=attachment_name)

    logger.info(f"Sending email with attachment to: {recipient_email} | Subject: {subject}")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SENDER_EMAIL, APP_PASSWORD)
            smtp.send_message(msg)

    except Exception as e:
        logger.error(f"Failed to send email with attachment: {e}")
