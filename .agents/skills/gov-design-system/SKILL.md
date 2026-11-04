---
name: gov-design-system
description: >-
  Public administration & civic portal design system based on GOV.UK, USWDS, and Ireland GOV.IE Tailwind.
  Use when designing or reviewing citizen-facing portals, administrative control panels, summary lists,
  official verification banners, form validation, and accessible civic workflows.
---

# Public Administration & E-Government Design System Skill

This skill incorporates internationally recognized design systems for public sector digital services—specifically drawn from **GOV.UK Frontend** (`alphagov/govuk-frontend`), **USWDS** (`uswds/uswds`), and **GOV.IE Tailwind** (`ogcio/govie-ds`)—adapted for Vietnamese municipal e-governance (Khu phố thông minh / Đề án 06).

---

## 1. Core Principles of Public Sector UI/UX

1. **Clarity Over Novelty:** Public administration portals are used by citizens of all ages, education levels, and physical abilities. Avoid experimental animations, abstract iconography, or complex gesture controls.
2. **Citizen Trust & Authority:** Official portals must look authoritative and calm. Use trustworthy executive colors (Deep Navy `#1E40AF`, Slate `#0F172A`, Service Green `#16A34A`), clean badges, and clear official seals/stamps.
3. **High Density Without Bento Clutter:** Government records have numerous fields (CCCD, Họ tên, Ngày sinh, Quê quán, Loại cư trú, Địa chỉ thửa đất). Instead of creating dozens of separate tiny boxes, group them into structured **Summary Lists**.

---

## 2. Key UI Patterns from Gold-Standard Government Repositories

### Pattern A: The Summary List (`govuk-summary-list` / `govie-summary-list`)
The world's most accessible and space-efficient pattern for presenting record details.

```html
<!-- Clean Key-Value Row in Tailwind CSS -->
<div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors">
    <dt className="text-xs font-semibold text-slate-500 sm:w-1/3">Số định danh cá nhân / CCCD</dt>
    <dd className="text-xs sm:text-sm font-bold text-slate-900 font-mono sm:w-1/2 mt-0.5 sm:mt-0">079085001234</dd>
    <div className="sm:w-1/6 flex justify-end mt-1 sm:mt-0">
      <button className="text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer">Sao chép</button>
    </div>
  </div>
</div>
```

### Pattern B: Official Verification Masthead & Phase Banner (USWDS & SGDS)
Instills trust by displaying the legal authority and digital registry status:

```tsx
<div className="bg-slate-900 text-white px-4 py-1.5 text-[11px] flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="font-bold text-emerald-400 flex items-center gap-1">
      <ShieldCheck size={13} /> CỔNG DỊCH VỤ CÔNG CƠ SỞ
    </span>
    <span className="text-slate-400">• Dữ liệu số hóa Ban Điều Hành Khu phố 3, P. An Phú</span>
  </div>
  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
    Chuẩn Đề án 06/CP
  </span>
</div>
```

### Pattern C: Administrative Status Tag Matrix
Status tags must follow uniform color tokens to avoid cognitive confusion:

| Status Type | Meaning | Tailwind Class |
| :--- | :--- | :--- |
| **Thường trú / Hoạt động** | Verified & Good standing | `bg-emerald-50 text-emerald-800 border-emerald-200` |
| **Tạm trú / Chờ duyệt** | Temporary or Pending verification | `bg-amber-50 text-amber-800 border-amber-200` |
| **Hết hạn / Đình chỉ** | Expired or Suspended license | `bg-rose-50 text-rose-800 border-rose-200` |
| **Hồ sơ lưu trữ / Chuyển đi** | Archived or Transferred record | `bg-slate-100 text-slate-700 border-slate-200` |
| **Chỉ số hệ thống / Mã định danh**| Technical code or HK number | `bg-blue-50 text-blue-800 border-blue-200 font-mono` |

---

## 3. Form Validation & Citizen Error Announcement (GOV.UK Standard)
When an admin or citizen submits an incomplete form:
1. Display an **Error Summary Box** at the top of the form with clear bullet points linking to each invalid field.
2. Highlight the affected input with a high-contrast red border (`border-rose-500 focus:ring-rose-500/20`).
3. Provide an explicit error explanation in plain language (e.g., "Vui lòng nhập chính xác 12 chữ số Căn cước công dân").

---

## 4. Accessibility (WCAG 2.1 AA Checklist)
- Text contrast must exceed `4.5:1` for regular text and `3:1` for large text (18px bold+).
- Every interactive element (buttons, links, inputs) must have a visible `focus-visible:ring-2` outline.
- All iconography must either have an adjacent text label or an `aria-label` / `title` attribute.

