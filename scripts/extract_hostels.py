import pandas as pd
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

df_tam = pd.read_excel('D:/Download/KP3tamtru.ods', engine='odf')
col_g = 'ĐỊA CHỈ TẠM TRÚ'

def parse_hostel(s):
    if not isinstance(s, str):
        return None
    s = s.strip()
    if not any(k in s.lower() for k in ['nhà trọ', 'nha tro', 'trọ:', 'trọ ']):
        return None
    
    # Phone
    phone = ''
    m_p = re.search(r'\((?:sđt:?|sdt:?|đt:?)?\s*([0-9\.\s\-]{8,15})\)', s, re.IGNORECASE)
    if not m_p:
        m_p = re.search(r'(?:sđt|sdt|đt)\s*[:.]?\s*([0-9\.\s\-]{8,15})', s, re.IGNORECASE)
    if m_p:
        phone = re.sub(r'[^\d]', '', m_p.group(1))

    # Clean prefix
    core = re.sub(r'^(?:nhà\s+trọ|phòng\s+trọ|trọ)\s*:?\s*', '', s, flags=re.IGNORECASE).strip()
    if m_p:
        core = core.replace(m_p.group(0), '').strip()
    
    # Check address pattern like 17/A3, 39A/A11, 14/B1, Ô 30, Lô B...
    addr_match = re.search(r'(?:,\s*|\s+at\s+|\s+tại\s+địa\s+chỉ\s+|\s+tại\s+|\s+)((?:\d+[A-Za-z0-9\/\-]*|Ô\s*\d+|Lô\s*[A-Za-z0-9]+)\s+.*)$', core, flags=re.IGNORECASE)
    owner = ''
    address = ''
    if addr_match:
        owner = core[:addr_match.start()].strip().strip(':, -')
        address = addr_match.group(1).strip()
    else:
        parts = core.split(',')
        owner = parts[0].strip().strip(':, -')
        address = ', '.join(parts[1:]).strip() if len(parts) > 1 else ''

    clean_owner = re.sub(r'^(?:ông|bà)\s+', '', owner, flags=re.IGNORECASE).strip()
    # Normalize address
    clean_addr = address if address else s
    
    return {
        'owner': clean_owner,
        'phone': phone,
        'address': clean_addr,
        'raw': s
    }

hostels = {}
for val in df_tam[col_g].dropna():
    p = parse_hostel(str(val))
    if not p:
        continue
    # Key by address house number or owner
    num_m = re.search(r'\b\d+[a-zA-Z0-9]*\/[a-zA-Z0-9]+\b', p['address'])
    key = num_m.group(0).upper() if num_m else (p['owner'].title() if p['owner'] else p['address'][:25])
    if key not in hostels:
        hostels[key] = {
            'key': key,
            'owner': p['owner'],
            'phone': p['phone'],
            'address': p['address'],
            'sample_raw': p['raw'],
            'count': 0
        }
    hostels[key]['count'] += 1
    if not hostels[key]['phone'] and p['phone']:
        hostels[key]['phone'] = p['phone']
    if (not hostels[key]['owner'] or len(hostels[key]['owner']) < len(p['owner'])) and p['owner']:
        hostels[key]['owner'] = p['owner']

sorted_h = sorted(hostels.values(), key=lambda x: x['count'], reverse=True)
print(f"Tổng số cơ sở trọ nhận diện: {len(sorted_h)}")
for h in sorted_h[:30]:
    print(f"[{h['count']} người] Key: {h['key']} | Chủ: {h['owner']} | SĐT: {h['phone']} | Đ/c: {h['address'][:45]}")
