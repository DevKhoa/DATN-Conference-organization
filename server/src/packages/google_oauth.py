import os
import json
import requests
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from packages.utils import logger, supabase_client

class GoogleMeetService:
    def __init__(self):
        self.scopes = [
            'https://www.googleapis.com/auth/calendar.events',
            'openid',
            'email'
        ]
        
        # Lấy đường dẫn file từ biến môi trường
        credentials_file_path = os.environ.get("GOOGLE_MEET_CREDENTIALS")

        # Đọc nội dung file JSON và gán vào client_config
        if credentials_file_path and os.path.exists(credentials_file_path):
            with open(credentials_file_path, 'r', encoding='utf-8') as f:
                self.client_config = json.load(f)
        else:
            logger.warning("GOOGLE_MEET_CREDENTIALS not set or file not found. Google Meet integration will be disabled.")
            self.client_config = None

    def get_authorization_url(self, email: str):
        # Manually construct URL to avoid PKCE enforcement from google-auth-oauthlib
        params = {
            'client_id': self.client_config['web']['client_id'],
            'redirect_uri': self.client_config['web']['redirect_uris'][0],
            'response_type': 'code',
            'scope': ' '.join(self.scopes),
            'access_type': 'offline',
            'prompt': 'consent',
            'login_hint': email,
            'state': f"{email}::{os.urandom(4).hex()}"
        }
        from urllib.parse import urlencode
        auth_url = f"{self.client_config['web']['auth_uri']}?{urlencode(params)}"
        return auth_url, params['state']

    def get_refresh_token(self, code: str):
        token_url = self.client_config['web']['token_uri']
        payload = {
            'client_id': self.client_config['web']['client_id'],
            'client_secret': self.client_config['web']['client_secret'],
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': self.client_config['web']['redirect_uris'][0]
        }
        
        response = requests.post(token_url, data=payload)
        if response.status_code != 200:
            logger.error(f"Failed to exchange code: {response.text}")
            raise Exception(f"Failed to exchange authorization code: {response.text}")
            
        return response.json()

    def get_user_info(self, access_token: str):
        response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        if response.status_code != 200:
            return None
        return response.json()

    def _get_credentials_for_user(self, email: str):
        res = supabase_client.table("profiles").select("google_refresh_token").eq("email", email).single().execute()
        if not res.data or not res.data.get('google_refresh_token'):
            return None
        
        refresh_token = res.data['google_refresh_token']
        creds = Credentials(
            None, # access_token is None, will be refreshed
            refresh_token=refresh_token,
            token_uri=self.client_config['web']['token_uri'],
            client_id=self.client_config['web']['client_id'],
            client_secret=self.client_config['web']['client_secret'],
            scopes=self.scopes
        )
        
        if not creds.valid:
            creds.refresh(Request())
            
        return creds

    def create_meeting(self, email: str, summary: str, start_time: str, end_time: str, timezone: str = 'UTC'):
        creds = self._get_credentials_for_user(email)
        if not creds:
            raise Exception("User has not linked their Google account or refresh token is missing.")

        service = build('calendar', 'v3', credentials=creds)
        
        event = {
            'summary': summary,
            'description': 'Conference Session Meeting',
            'start': {'dateTime': start_time},
            'end': {'dateTime': end_time},
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meet-{os.urandom(8).hex()}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        }

        # If no timezone offset is present in the string, Google API requires timeZone field.
        if '+' not in start_time and 'Z' not in start_time:
            event['start']['timeZone'] = timezone
            event['end']['timeZone'] = timezone

        created_event = service.events().insert(
            calendarId='primary',
            body=event,
            conferenceDataVersion=1
        ).execute()

        return {
            'event_id': created_event.get('id'),
            'meet_link': created_event.get('hangoutLink'),
            'html_link': created_event.get('htmlLink')
        }

    def delete_meeting(self, email: str, event_id: str):
        creds = self._get_credentials_for_user(email)
        if not creds:
            raise Exception("User has not linked their Google account.")

        service = build('calendar', 'v3', credentials=creds)
        service.events().delete(calendarId='primary', eventId=event_id).execute()

    def update_meeting(self, email: str, event_id: str, summary: str, start_time: str, end_time: str, timezone: str = 'UTC'):
        creds = self._get_credentials_for_user(email)
        if not creds:
            raise Exception("User has not linked their Google account or refresh token is missing.")

        service = build('calendar', 'v3', credentials=creds)
        
        event = {
            'summary': summary,
            'start': {'dateTime': start_time},
            'end': {'dateTime': end_time},
        }

        # If no timezone offset is present in the string, Google API requires timeZone field.
        if '+' not in start_time and 'Z' not in start_time:
            event['start']['timeZone'] = timezone
            event['end']['timeZone'] = timezone

        updated_event = service.events().patch(
            calendarId='primary',
            eventId=event_id,
            body=event
        ).execute()

        return {
            'event_id': updated_event.get('id'),
            'meet_link': updated_event.get('hangoutLink'),
            'html_link': updated_event.get('htmlLink')
        }

google_meet_service = GoogleMeetService()
