---
name: public-admin-data-management
description: >-
  Standards for managing sensitive citizen identity, public registry data, household registries (Đề án 06 / VNeID / Luật Căn cước 2023),
  GIS civic infrastructure, and data auditing logs. Use when designing data grids, export tools, citizen detail views, and audit logging.
---

# Public Administration Data Management & Citizen Registry Skill

This skill provides guidelines and patterns for handling sensitive civil registry data, household structures, and geospatial administrative data within Vietnamese municipal systems.

---

## 1. Compliance & Data Privacy (Nghị định 13/2023/NĐ-CP & Đề án 06)

1. **Citizen PII Masking:**
   - Display format for CCCD/Định danh cá nhân: `0790 ••• ••• 456` with a toggle eye button (`Eye` / `EyeOff`) to reveal the full 12 digits only when authenticated.
   - Phone numbers in public or semi-public views: `090 ••• 9112`.
2. **Audit Trail Logging (Nhật ký biến động):**
   - Every modification to a citizen or household profile must record:
     - `timestamp`: ISO 8601 string.
     - `actor`: Full name and ID of the operating official.
     - `action`: E.g., `Đăng ký thường trú mới`, `Tách hộ khẩu`, `Chuyển khẩu đi`, `Gia hạn tạm trú`.
     - `legalBasis`: Legal document or circular (e.g., `Căn cứ Luật Cư trú 2020`).

---

## 2. Electronic Household Ledger (Sổ hộ khẩu điện tử HK) Architecture

A standardized municipal household record is composed of:
1. **Ledger Code:** Prefix `HK-` followed by the 3-4 digit index (e.g. `HK-301`).
2. **Head of Household (Chủ hộ):** The central citizen node of the record.
3. **Relationships to Head of Household:**
   - Standard relationship tags: `Chủ hộ` (Head), `Vợ` (Wife), `Chồng` (Husband), `Con trai` (Son), `Con gái` (Daughter), `Cha` (Father), `Mẹ` (Mother), `Cháu` (Grandchild).
4. **Residency Status:**
   - `Thường trú` (Permanent resident - HK01)
   - `Tạm trú` (Temporary resident - KT3/KT4)
   - `Lưu trú` (Short-term guest / Worker lodging)

---

## 3. Temporary Residence Expiry & Alert Tracking

Civil security requires precise tracking of temporary residence expiration:
- **Active / Safe (> 30 days):** Green indicator `bg-emerald-50 text-emerald-800`.
- **Expiring Soon (≤ 30 days):** Amber pulse badge `bg-amber-50 text-amber-900 border-amber-300 animate-pulse` with remaining day count.
- **Overdue / Expired (≤ 0 days):** Red alert badge `bg-rose-50 text-rose-800 border-rose-300 font-bold`.
- Provide one-click action: `Gia hạn tạm trú` or `Gửi thông báo nhắc nhở`.

---

## 4. GIS & Geospatial Land Registry Integration

1. **Coordinate Format:** Standard WGS-84 decimal degrees (`lat, lng`), e.g., `10.7935, 106.7445`.
2. **Cadastral Link:** `Tờ bản đồ` (Map Sheet) and `Thửa đất` (Parcel Number) alongside total area (`m²`).
3. **Routing Actions:** Direct one-click GIS navigation on the local Leaflet map and external fallback to Google Maps.

