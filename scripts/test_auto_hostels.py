import sys
sys.stdout.reconfigure(encoding='utf-8')
from scripts import extract_hostels as eh

valid = [h for h in eh.sorted_h if h['count'] >= 3]
print(f"Tổng số cơ sở trọ có >= 3 cư dân: {len(valid)}")
for idx, h in enumerate(valid[:25], 1):
    owner = h['owner'] if h['owner'] else "Chủ hộ"
    print(f"{idx}. Nhà trọ {owner} ({h['key']}): {h['count']} người | SĐT: {h['phone']} | Đ/c: {h['address'][:45]}")
