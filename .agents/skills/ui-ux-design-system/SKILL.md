---
name: ui-ux-design-system
description: >-
  Comprehensive design system and UI/UX standards skill for KP3 Smart City and executive government administrative portals.
  Use when designing, redesigning, or refining UI components, modals, forms, color harmony, typography, and accessibility.
---

# UI/UX Design System Skill — KP3 Smart City & Executive Admin Portals

This skill equips the agent with industry-leading UI/UX design standards specifically tuned for government administrative software, civic portals, and high-density data dashboards.

## Core Design Principles

### 1. Visual Hierarchy & Contrast (WCAG 2.1 AA Compliant)
- **Primary Color:** Deep Executive Navy (`#1E40AF` / `bg-blue-800` or `bg-slate-900`) for headers, active indicators, and high-importance badges.
- **Service Accent:** Civic Green (`#16A34A` / `emerald-600`) for positive statuses, primary call-to-actions, and verified credentials.
- **Surface & Backgrounds:** Crisp off-white (`bg-slate-50/70` to `bg-white`) with subtle borders (`border-slate-200/80`). Avoid pitch-black backgrounds for admin content.
- **Contrast Rule:** Text must always achieve at least 4.5:1 contrast against its background. Labels must use `text-slate-500` or `text-slate-600`, never faint gray (`text-slate-300`).

### 2. Elimination of Visual Clutter (Anti-Bento Fatigue)
- **Problem:** Boxing every individual field into a rounded gray container ("bento box") causes ocular exhaustion and slows down data skimming.
- **Solution:** Use structured **Key-Value Matrix Tables**:
  - Top or Left Label: `text-[11px] font-medium text-slate-500 uppercase tracking-wide`
  - Value: `text-sm font-semibold text-slate-900`
  - Group related fields together within one cohesive card separated by subtle dividers (`border-slate-100`).

### 3. Progressive Disclosure (Tabbed & Modal Architecture)
- Do not force users to scroll through endless vertical cards.
- Organize complex entities into 3-5 logical sub-tabs:
  1. **Thông tin chung & Pháp lý** (Core identity, legal registrations, status)
  2. **Mặt bằng & Địa bàn** (Premises, street area, linked households, GIS coordinates)
  3. **Nhân sự & Lực lượng** (Representatives, staff, foreign experts)
  4. **Nhật ký & Biến động** (History, audits, state transitions)
- Keep modal headers sticky or compact so the core subject and context are never lost.

### 4. Iconography & Badges
- **Strict Rule:** Never use decorative emojis as system icons in administrative software.
- Use vector SVG icons from `lucide-react` (size `13px` to `16px`).
- Badge tokens must use semantic tinting:
  - Active / Normal: `bg-emerald-50 text-emerald-800 border-emerald-200`
  - Pending / Warning: `bg-amber-50 text-amber-800 border-amber-200`
  - Suspended / Danger: `bg-rose-50 text-rose-800 border-rose-200`
  - Information / System ID: `bg-blue-50 text-blue-800 border-blue-200`

### 5. Action Footer Standardization
Every detail modal must provide a standardized footer:
- **Left:** Status selector or contextual workflow state badge.
- **Right:** Primary action group with clear visual weight:
  - Secondary/Utility: `bg-slate-100 hover:bg-slate-200 text-slate-700`
  - Edit: `bg-white border border-slate-300 hover:bg-slate-50 text-slate-700`
  - Delete/Archive: `bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700`
  - Primary / Confirm: `bg-blue-600 hover:bg-blue-700 text-white shadow-xs`

