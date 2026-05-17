import requests
import json
url = "https://qcwihjxqmxkwqpezkukz.supabase.co/rest/v1/"
headers = {
    "apikey": "sb_secret_WPKAYZWcOsejlSgHcrS0oQ_zVZRZpaK",
    "Authorization": "Bearer sb_secret_WPKAYZWcOsejlSgHcrS0oQ_zVZRZpaK"
}
response = requests.get(url, headers=headers)
d = response.json()
print("attendences nullable keys:", [k for k, v in d['definitions']['attendences']['properties'].items() if getattr(v, "default", None) is None]) # not entirely accurate but close enough
print("actually, let me print the properties:")
for k, v in d['definitions']['attendences']['properties'].items():
    print(k, v)
