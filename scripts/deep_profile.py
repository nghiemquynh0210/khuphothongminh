import sys
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

print("="*60)
print("PHÂN TÍCH CHI TIẾT DỮ LIỆU CƯ DÂN KHU PHỐ 3")
print("="*60)

# 1. Đọc dữ liệu
df_tt = pd.read_excel('D:/Download/KP3thuongtru.ods', engine='odf')
df_tam = pd.read_excel('D:/Download/KP3tamtru.ods', engine='odf')

print(f"1. Thường trú: {len(df_tt)} dòng")
print(f"2. Tạm trú: {len(df_tam)} dòng")

# Hàm chuẩn hóa CCCD
def clean_cccd(val):
    if pd.isna(val):
        return None
    s = str(val).strip().replace(".0", "").replace(" ", "")
    # Nếu là số khoa học hoặc float
    if "e+" in s.lower():
        try:
            s = str(int(float(s)))
        except:
            pass
    # Nếu có 9-11 số, kiểm tra pad 0
    if len(s) == 11 and s.isdigit():
        s = "0" + s
    elif len(s) == 8 and s.isdigit():
        s = "0" + s
    return s

df_tt['cccd_clean'] = df_tt['CCCD'].apply(clean_cccd)
df_tam['cccd_clean'] = df_tam['CCCD'].apply(clean_cccd)

print("\n--- THỐNG KÊ CCCD ---")
print(f"Thường trú: null={df_tt['cccd_clean'].isna().sum()}, unique={df_tt['cccd_clean'].nunique()}/{len(df_tt)}")
print(f"Tạm trú: null={df_tam['cccd_clean'].isna().sum()}, unique={df_tam['cccd_clean'].nunique()}/{len(df_tam)}")

# Trùng lặp nội bộ thường trú
dup_tt = df_tt[df_tt['cccd_clean'].duplicated(keep=False)]
print(f"Thường trú có trùng CCCD nội bộ: {len(dup_tt)} dòng ({dup_tt['cccd_clean'].nunique()} CCCD)")

# Trùng lặp nội bộ tạm trú
dup_tam = df_tam[df_tam['cccd_clean'].duplicated(keep=False)]
print(f"Tạm trú có trùng CCCD nội bộ: {len(dup_tam)} dòng ({dup_tam['cccd_clean'].nunique()} CCCD)")

# Giao thoa giữa Thường trú và Tạm trú
overlap = set(df_tt['cccd_clean'].dropna()).intersection(set(df_tam['cccd_clean'].dropna()))
print(f"Số CCCD xuất hiện ở CẢ 2 file: {len(overlap)}")

# Thống kê hộ khẩu Thường trú
print("\n--- THỐNG KÊ HỘ KHẨU THƯỜNG TRÚ ---")
print(f"Số mã hộ khẩu duy nhất: {df_tt['MÃ HỘ KHẨU'].nunique()}")
print(f"Top 5 hộ đông nhân khẩu nhất:")
hk_counts = df_tt.groupby(['MÃ HỘ KHẨU', 'HỌ TÊN CHỦ HỘ', 'ĐỊA CHỈ THƯỜNG TRÚ']).size().reset_index(name='so_nhan_khau')
print(hk_counts.sort_values(by='so_nhan_khau', ascending=False).head(5).to_string(index=False))

# Thống kê Giới tính
print("\n--- GIỚI TÍNH ---")
print("Thường trú:", df_tt['GIỚI TÍNH'].value_counts(dropna=False).to_dict())
print("Tạm trú:", df_tam['GIỚI TÍNH'].value_counts(dropna=False).to_dict())

# Độ dài CCCD
print("\n--- ĐỘ DÀI CCCD ---")
print("Thường trú lengths:", df_tt['cccd_clean'].str.len().value_counts(dropna=False).to_dict())
print("Tạm trú lengths:", df_tam['cccd_clean'].str.len().value_counts(dropna=False).to_dict())
