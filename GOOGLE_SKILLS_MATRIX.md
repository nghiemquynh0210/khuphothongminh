# GOOGLE AGENT SKILLS EXECUTION MATRIX
**Dự án: Remix Khu phố 3 An Phú - Quản lý thông minh & Cổng Dịch vụ Cư dân số**
*Nguồn repository: https://github.com/google/skills & Antigravity Ecosystem*

---

## 1. BẢNG MA TRẬN KỸ NĂNG GOOGLE AGENT SKILLS

| STT | Tên Skill | Nhóm Chuyên Môn | Nguồn / Đường dẫn | Phạm vi Áp dụng vào Dự án | Trạng thái |
|---|---|---|---|---|---|
| 1 | `ui-ux-design-system` | UI/UX & Design System | `.agents/skills/ui-ux-design-system` | Chuẩn hóa bảng ma trận Key-Value, WCAG 2.1 AA, cấu trúc tab, badge token, chống bento fatigue | ✅ Đã đọc & Đang áp dụng |
| 2 | `gov-design-system` | Civic & Portal Standards | `.agents/skills/gov-design-system` | Banner định danh cơ quan nhà nước, cổng dịch vụ công trực tuyến, bảo mật thông tin công dân | ✅ Đã đọc & Đang áp dụng |
| 3 | `tailwind-component-crafting` | Frontend Engineering | `.agents/skills/tailwind-component-crafting` | React 19 + Tailwind v4, responsive layout, micro-interactions, modal accessibility | ✅ Đã đọc & Đang áp dụng |
| 4 | `public-admin-data-management` | Civic Data & Privacy | `.agents/skills/public-admin-data-management` | Quản lý 11.229 nhân khẩu, 7.815 hộ, Đề án 06, che mờ CCCD, cảnh báo hết hạn tạm trú | ✅ Đã đọc & Đang áp dụng |
| 5 | `gemini-api` / `agent-platform-*` | AI Multimodal Vision & OCR | `C:\Users\Admin\.gemini\config\skills\` | OCR giấy phép KD, sổ đỏ, lịch phường qua Gemini 2.5 Flash, trợ lý AI khu phố | ✅ Đã kích hoạt trong `api/` |
| 6 | `google-cloud-recipe-auth` | Security & IAM | `C:\Users\Admin\.gemini\config\plugins\...` | RLS PostgreSQL, Staff JWT authentication, bảo vệ Service Role Key & API Endpoints | ✅ Đã đọc & Đang áp dụng |
| 7 | `cloud-logging-query-generation` | Observability & Auditing | `C:\Users\Admin\.gemini\config\skills\` | Audit logger hệ thống, lưu vết thay đổi dữ liệu công dân vào `portal_settings` | ✅ Đã đọc & Đang áp dụng |
| 8 | `ui-ux-pro-max` | Advanced UI/UX | `C:\Users\Admin\.gemini\config\skills\ui-ux-pro-max` | Tối ưu trải nghiệm hiển thị bảng dữ liệu lớn, pagination mượt mà, typography hierarchy | ✅ Đã đọc & Đang áp dụng |

---

## 2. QUY TẮC BẮT BUỘC KHI ÁP DỤNG GOOGLE SKILLS VÀO KHU PHỐ 3 AN PHÚ
1. **Tuân thủ phân cấp chính quyền cơ sở:** Bí thư Chi bộ luôn ở vị trí số 1 trên toàn hệ thống (Cổng Cư dân, Danh bạ, Dashboard, Lịch công tác).
2. **Chuẩn hóa địa danh hành chính:** Thống nhất 100% là **`Khu phố 3, Phường An Phú, TP. Hồ Chí Minh`** (tuyệt đối không dùng `"TP. Thủ Đức"`).
3. **Bảo vệ dữ liệu công dân (Đề án 06 / Nghị định 13/2023/NĐ-CP):** CCCD hiển thị mặc định dạng mặt nạ `0790 ••• ••• 456`, chỉ Cán bộ đã đăng nhập mới được bấm nút `Eye` để xem toàn văn.
4. **Không dùng emoji trang trí thay cho icon chức năng:** Sử dụng thống nhất vector SVG từ thư viện `lucide-react`.
