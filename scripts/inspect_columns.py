import pandas as pd
import string
import sys

sys.stdout.reconfigure(encoding='utf-8')

def inspect(path):
    print('=== ' + path + ' ===')
    df = pd.read_excel(path, engine='odf')
    cols = list(df.columns)
    for idx, col in enumerate(cols):
        # Calculate Excel column letter (A, B, ..., Z, AA, AB...)
        n = idx
        letter = ""
        while n >= 0:
            letter = chr(ord('A') + (n % 26)) + letter
            n = n // 26 - 1
            if n < 0:
                break
        samples = [str(x)[:40] for x in df[col].dropna().unique()[:3]]
        print(f"Cột {letter} (idx {idx}): '{col}' -> Mẫu: {samples}")

inspect('D:/Download/KP3thuongtru.ods')
print()
inspect('D:/Download/KP3tamtru.ods')
