import json
import os
import shutil
from dotenv import set_key
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def main():
    # 1. Chuyển tạm thời client_secret từ "web" sang "installed" để dùng được Local Server
    with open('client_secret.json', 'r') as f:
        original = f.read()
    
    data = json.loads(original)
    if 'web' in data:
        data['installed'] = data.pop('web')
        with open('client_secret_temp.json', 'w') as f:
            json.dump(data, f)
            
    try:
        print("Đang mở trình duyệt để tiến hành đăng nhập Google...")
        flow = InstalledAppFlow.from_client_secrets_file('client_secret_temp.json', SCOPES)
        creds = flow.run_local_server(port=0)
        
        refresh_token = creds.refresh_token
        
        if refresh_token:
            print("\n" + "="*50)
            print("THÀNH CÔNG! Đã lấy được Refresh Token ổn định nhất:")
            print(refresh_token)
            print("="*50 + "\n")
            
            # Ghi đè vào .env
            set_key('.env', 'GOOGLE_REFRESH_TOKEN', refresh_token)
            print("=> Đã ghi tự động vào file .env!")
        else:
            print("LỖI: Không lấy được refresh_token. Bạn phải BỎ KẾT NỐI quyền ứng dụng trong tài khoản Google để nó hỏi lại từ đầu.")
            
    except Exception as e:
        print(f"Lỗi: {e}")
    finally:
        if os.path.exists('client_secret_temp.json'):
            os.remove('client_secret_temp.json')

if __name__ == "__main__":
    main()
