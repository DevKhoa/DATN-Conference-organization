import os
import json
from fastapi import HTTPException
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow, Flow
from googleapiclient.discovery import build
from utils import logger

# Để test dưới dạng web (Callback)
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
]

CREDENTIALS_FILE = "client_secret.json"

class GoogleMeetService:
    def __init__(self):
        self._temp_flow = None
        # Kiểm tra file thông tin của Google Cloud
        if not os.path.exists(CREDENTIALS_FILE):
             logger.warning("Google Cloud credentials file not found. Create client_secret.json from GCP Console.")

    def get_auth_url(self, redirect_uri: str, email: str):
        """
        Sinh ra URL để BTC bấm vào đăng nhập Google và cấp quyền (Option 2).
        Nhúng email vào tham số `state` để lúc callback hệ thống đối chiếu và lưu token.
        """
        if not os.path.exists(CREDENTIALS_FILE):
             raise HTTPException(status_code=500, detail="Missing Google credentials file (client_secret.json).")
             
        with open(CREDENTIALS_FILE, 'r') as f:
            data = json.load(f)
            client_id = data.get('web', {}).get('client_id')
            
        import urllib.parse
        scope = " ".join(SCOPES)
        state_str = f"email_{email}"
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri)}&response_type=code&scope={urllib.parse.quote(scope)}&access_type=offline&prompt=consent&state={urllib.parse.quote(state_str)}"
        
        return {"auth_url": auth_url, "state": state_str}

    def fetch_token(self, redirect_uri: str, code: str):
        """
        Gửi thẳng HTTP request để lấy Token, vượt rào PKCE.
        """
        with open(CREDENTIALS_FILE, 'r') as f:
            data = json.load(f)
            client_id = data.get('web', {}).get('client_id')
            client_secret = data.get('web', {}).get('client_secret')
            
        import requests
        res = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        })
        
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Google Error: {res.text}")
            
        token_data = res.json()
        if "refresh_token" not in token_data:
            raise HTTPException(status_code=400, detail="Thành công nhưng không có refresh_token. Hãy chắc chắn bạn đã chạy lại Get Auth URL và đồng ý quyền.")
            
        # Dùng access_token để lấy thông tin Email của tài khoản Google vừa đăng nhập
        access_token = token_data.get("access_token")
        userinfo_res = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo", 
            headers={"Authorization": f"Bearer {access_token}"}
        )
        google_email = None
        if userinfo_res.status_code == 200:
            google_email = userinfo_res.json().get("email")
            
        return {
            "refresh_token": token_data["refresh_token"],
            "google_email": google_email
        }

    def get_system_credentials(self):
        """
        Lấy Token uỷ quyền của Hệ thống từ file .env (Để web tự động tạo phòng Meet)
        """
        refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")
        if not refresh_token:
            raise HTTPException(status_code=500, detail="Missing GOOGLE_REFRESH_TOKEN in .env file.")
            
        if not os.path.exists(CREDENTIALS_FILE):
             raise HTTPException(status_code=500, detail="Missing client_secret.json.")
             
        with open(CREDENTIALS_FILE, 'r') as f:
            data = json.load(f)
            web = data.get('web', {})
            client_id = web.get('client_id')
            client_secret = web.get('client_secret')
            token_uri = web.get('token_uri', "https://oauth2.googleapis.com/token")
            
        return Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri=token_uri,
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )

    def create_meet_event(self, summary: str, description: str, start_time: str, end_time: str, user_refresh_token: str, timezone: str = 'UTC'):
        """
        Sử dụng user_refresh_token lấy từ Supabase DB để tạo phòng họp trên tài khoản cua user.
        """
        with open(CREDENTIALS_FILE, 'r') as f:
            data = json.load(f)
            web = data.get('web', {})
            client_id = web.get('client_id')
            client_secret = web.get('client_secret')
            token_uri = web.get('token_uri', "https://oauth2.googleapis.com/token")

        if not user_refresh_token:
            raise HTTPException(status_code=400, detail="Tài khoản của bạn chưa liên kết với Google. Hãy thực hiện liên kết trước.")

        creds = Credentials(
            token=None,
            refresh_token=user_refresh_token,
            token_uri=token_uri,
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )
            
        service = build('calendar', 'v3', credentials=creds)

        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time,
                'timeZone': timezone,
            },
            'end': {
                'dateTime': end_time,
                'timeZone': timezone,
            },
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meet-{start_time}-{summary}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        }

        try:
            event = service.events().insert(
                calendarId='primary', 
                body=event, 
                conferenceDataVersion=1
            ).execute()

            # Lấy link Google Meet ra
            meet_link = event.get('hangoutLink')
            if not meet_link:
                raise HTTPException(status_code=500, detail="Could not generate Meet link from Google")
                
            return {
                "event_id": event.get('id'),
                "meet_link": meet_link,
                "html_link": event.get('htmlLink')
            }
        except Exception as e:
            logger.error(f"Error creating Google Meet Calendar Event: {e}")
            raise HTTPException(status_code=500, detail=str(e))

meet_service = GoogleMeetService()
