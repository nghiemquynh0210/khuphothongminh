import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("--- PHÂN TÍCH FILE THƯỜNG TRÚ ---")
df_tt = pd.read_excel('D:/Download/KP3thuongtru.ods', engine='odf')
print(f"Tổng số dòng: {len(df_tt)}")
print("Các cột:", list(df_tt.columns))

# So sánh Cột H (ĐỊA CHỈ THƯỜNG TRÚ) và Cột J (CHỔ Ở HIỆN TẠI)
col_h = 'ĐỊA CHỈ THƯỜNG TRÚ'
col_j = 'CHỔ Ở HIỆN TẠI'

diff_count = 0
same_count = 0
for idx, row in df_tt.iterrows():
    h = str(row[col_h]).strip() if pd.notna(row[col_h]) else ""
    j = str(row[col_j]).strip() if pd.notna(row[col_j]) else ""
    if h != j:
        diff_count += 1
        if diff_count <= 5:
            print(f"  [Khác nhau #{diff_count}] Cột H: '{h}' | Cột J: '{j}'")
    else:
        same_count += 1

print(f"-> Giống nhau: {same_count}, Khác nhau: {diff_count}")

# Kiểm tra các cột khác: HỌ TÊN CHA, HỌ TÊN MẸ, TÌNH TRẠNG, TÌNH TRẠNG QUẢN LÝ
print("Số người có Họ tên cha:", df_tt['HỌ TÊN CHA'].dropna().count())
print("Số người có Họ tên mẹ:", df_tt['HỌ TÊN MẸ'].dropna().count())
print("Tình trạng quản lý:", df_tt['TÌNH TRẠNG QUẢN LÝ'].value_counts().to_dict())

print("\n--- PHÂN TÍCH FILE TẠM TRÚ ---")
df_tam = pd.read_excel('D:/Download/KP3tamtru.ods', engine='odf')
print(f"Tổng số dòng: {len(df_tam)}")
print("Các cột:", list(df_tam.columns))

col_g = 'ĐỊA CHỈ TẠM TRÚ'
col_j_tam = 'ĐỊA CHỈ THƯỜNG TRÚ'

for idx in range(min(5, len(df_tam))):
    row = df_tam.iloc[idx]
    print(f"  Dòng {idx+1}:")
    print(f"    - Họ tên: {row['HỌ VÀ TÊN']}, CCCD: {row['CCCD']}")
    print(f"    - Cột G (Địa chỉ tạm trú / Nơi ở hiện tại KP3): {row[col_g]}")
    print(f"    - Cột J (Địa chỉ thường trú gốc): {row[col_j_tam]}")
    print(f"    - Cột H (Ngày đăng ký): {row.get('NGÀY ĐĂNG KÝ')}")
    print(f"    - Cột I (Ngày hết hạn): {row.get('NGÀY HẾT HẠN')}")
