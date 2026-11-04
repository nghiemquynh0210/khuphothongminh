import os
import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

print("Đang tạo bản sao chuẩn Microsoft Excel (.xlsx)...")

def convert(ods_path, xlsx_path):
    if os.path.exists(ods_path):
        print(f"Đang đọc: {ods_path}...")
        df = pd.read_excel(ods_path, engine='odf')
        print(f"Đang ghi ra: {xlsx_path} ({len(df)} dòng)...")
        df.to_excel(xlsx_path, index=False)
        print(f"-> Hoàn tất: {xlsx_path}")
    else:
        print(f"Không tìm thấy {ods_path}")

convert('D:/Download/KP3thuongtru.ods', 'D:/Download/KP3thuongtru.xlsx')
convert('D:/Download/KP3tamtru.ods', 'D:/Download/KP3tamtru.xlsx')
