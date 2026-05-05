import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'server', 'src'))
from packages.utils import supabase_client

res = supabase_client.table("profiles").select("user_id, email").in_("email", ["abdelhamidmellouk@gmail.com", "admin@test.com", "author@test.com"]).execute()
print(res.data)
