import os
import sys
import pandas as pd
import json

# Set standard output to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def inspect_file(path, label):
    print(f"\n{'='*25} {label}: {path} {'='*25}")
    if not os.path.exists(path):
        print(f"Lỗi: Không tìm thấy file {path}")
        return
    
    xl = pd.ExcelFile(path, engine='odf')
    print(f"Danh sách Sheets: {xl.sheet_names}")
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f"\n--- Sheet [{sheet}] ---")
        print(f"Tổng số dòng: {df.shape[0]}, Tổng số cột: {df.shape[1]}")
        print("Danh sách các cột:")
        for i, col in enumerate(df.columns):
            non_null = df[col].dropna().count()
            sample_val = df[col].dropna().iloc[0] if non_null > 0 else 'N/A'
            print(f"  [{i:02d}] {col} | Non-null: {non_null}/{df.shape[0]} | Mẫu: {sample_val}")
        
        print("\n3 dòng đầu tiên:")
        for idx, row in df.head(3).iterrows():
            clean_row = {k: v for k, v in row.items() if pd.notna(v)}
            print(f"  Dòng {idx+1}: {json.dumps(clean_row, default=str, ensure_ascii=False)}")

if __name__ == '__main__':
    inspect_file('D:/Download/KP3thuongtru.ods', 'DỮ LIỆU THƯỜNG TRÚ')
    inspect_file('D:/Download/KP3tamtru.ods', 'DỮ LIỆU TẠM TRÚ')
