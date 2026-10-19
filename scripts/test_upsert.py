import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co"
SERVICE_ROLE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZGdhb2JoaXBrZ3p2ZWlkdHJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1OTQzNCwiZXhwIjoyMTA3NDM1NDM0fQ."
    "qlheohPPyspOM0ezFa-wr_D6vIQNrAFrmaPpSD_v_zo"
)

headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation'
}

test_payload = [{
    'cccd': '091200006098',
    'full_name': 'NGUYỄN QUỐC KHẢI',
    'address': '16/A6 Khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh',
    'permanent_address': 'TỔ 7, ẤP TRUNG QUÍ, Xã Đông Thái, Tỉnh An Giang',
    'current_address': '16/A6 Khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh',
    'workplace': None,
    'status': 'Tạm trú'
}]

endpoint = f"{SUPABASE_URL}/rest/v1/residents?on_conflict=cccd"
req = urllib.request.Request(endpoint, data=json.dumps(test_payload).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode('utf-8'))
        print("Success! Result:", result)
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode('utf-8'))
