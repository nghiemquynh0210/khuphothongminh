import sys, os, re
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

def infer_relation(person, owner, all_members):
    p_name = person['name'].strip().upper()
    o_name = owner['name'].strip().upper()
    if p_name == o_name:
        return 'Chủ hộ'
    
    father = str(person.get('father', '')).strip().upper()
    mother = str(person.get('mother', '')).strip().upper()
    o_father = str(owner.get('father', '')).strip().upper()
    o_mother = str(owner.get('mother', '')).strip().upper()
    gender = person.get('gender', 'Nam')

    # Case 1: Person has father or mother == Owner
    if father == o_name or mother == o_name:
        return 'Con trai' if gender == 'Nam' else 'Con gái'

    # Case 2: Owner has father or mother == Person
    if o_father == p_name:
        return 'Bố (Cha)'
    if o_mother == p_name:
        return 'Mẹ'

    # Case 3: Person shares same parents with Owner (Anh / Chị / Em)
    if (father and father == o_father) or (mother and mother == o_mother):
        p_birth = person.get('birth_year', 1990)
        o_birth = owner.get('birth_year', 1980)
        if p_birth < o_birth:
            return 'Anh trai' if gender == 'Nam' else 'Chị gái'
        else:
            return 'Em trai' if gender == 'Nam' else 'Em gái'

    # Case 4: Person is spouse of Owner (They have a mutual child in all_members)
    for m in all_members:
        m_f = str(m.get('father', '')).strip().upper()
        m_m = str(m.get('mother', '')).strip().upper()
        if (m_f == o_name and m_m == p_name) or (m_f == p_name and m_m == o_name):
            return 'Vợ' if gender == 'Nữ' else 'Chồng'

    # Case 5: Person is grandchild of owner (Person father/mother is child of owner)
    for m in all_members:
        m_name = m['name'].strip().upper()
        if (father == m_name or mother == m_name):
            m_f = str(m.get('father', '')).strip().upper()
            m_m = str(m.get('mother', '')).strip().upper()
            if m_f == o_name or m_m == o_name:
                return 'Cháu nội' if father == m_name else 'Cháu ngoại'

    # Case 6: Person is daughter-in-law or son-in-law (married to a child of owner)
    for m in all_members:
        m_name = m['name'].strip().upper()
        m_f = str(m.get('father', '')).strip().upper()
        m_m = str(m.get('mother', '')).strip().upper()
        if m_f == o_name or m_m == o_name: # m is child of owner
            for child in all_members:
                cf = str(child.get('father', '')).strip().upper()
                cm = str(child.get('mother', '')).strip().upper()
                if (cf == m_name and cm == p_name) or (cf == p_name and cm == m_name):
                    return 'Con dâu' if gender == 'Nữ' else 'Con rể'

    # Default fallback by age
    p_birth = person.get('birth_year', 1990)
    o_birth = owner.get('birth_year', 1980)
    if p_birth > o_birth + 18:
        return 'Con'
    elif p_birth < o_birth - 18:
        return 'Bác/Cô/Chú'
    return 'Thành viên gia đình'

df_tt = pd.read_excel('../KP3thuongtru.xlsx')
g = df_tt[df_tt['MÃ HỘ KHẨU'] == '25975-011506']
members = []
for _, r in g.iterrows():
    by = 1990
    try:
        by = int(str(r['NGÀY THÁNG NĂM SINH']).split('/')[2][:4])
    except:
        try:
            by = int(str(r['NGÀY THÁNG NĂM SINH'])[:4])
        except:
            pass
    members.append({
        'name': r['HỌ VÀ TÊN'],
        'gender': r['GIỚI TÍNH'],
        'birth_year': by,
        'father': r['HỌ TÊN CHA'],
        'mother': r['HỌ TÊN MẸ']
    })
owner = next(m for m in members if m['name'].strip().upper() == 'PHAN NGỌC NỔI')
print('=== Test infer_relation on Household 25975-011506 ===')
print('Owner:', owner['name'], owner['gender'], owner['birth_year'])
for m in members:
    rel = infer_relation(m, owner, members)
    print(f" - {m['name']} ({m['gender']}, {m['birth_year']}) -> {rel}")
