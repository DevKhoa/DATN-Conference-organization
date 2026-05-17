import requests
import json
url = "https://qcwihjxqmxkwqpezkukz.supabase.co/rest/v1/attendences?select=at_id,is_checkin,checkin_time,session_id,registration_id,user_id,registrations(user:user_id(user_id,full_name,email,organization),ticket_configs(ticket_name)),user:user_id(user_id,full_name,email,organization)&limit=1"
headers = {
    "apikey": "sb_secret_WPKAYZWcOsejlSgHcrS0oQ_zVZRZpaK",
    "Authorization": "Bearer sb_secret_WPKAYZWcOsejlSgHcrS0oQ_zVZRZpaK"
}
response = requests.get(url, headers=headers)
print(response.status_code)
print(response.text)
