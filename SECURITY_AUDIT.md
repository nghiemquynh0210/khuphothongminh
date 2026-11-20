# BÁO CÁO KIỂM TOÁN AN NINH & BẢO MẬT (SECURITY AUDIT)
**Hệ thống Quản lý Thông minh & Cổng Dịch vụ Cư dân số KP3 An Phú**

---

## 1. PHÂN QUYỀN TRUY CẬP DỮ LIỆU & ROW LEVEL SECURITY (RLS)

- **Trạng thái RLS:** Bật 100% trên toàn bộ các bảng trong CSDL Supabase PostgreSQL:
  - `user_profiles`
  - `residents`
  - `households`
  - `businesses`
  - `field_reports`
  - `neighborhood_funds`
  - `community_news`
  - `community_events`
  - `tasks`
  - `work_schedules`
  - `associations_records`
  - `portal_settings`
- **Chính sách phân quyền (Access Control Matrix):**
  1. **Khách vãng lai & Cư dân (Anon):**
     - Bị **CHẶN HOÀN TOÀN** quyền đọc và ghi bảng `residents`, `households` và các cấu hình nội bộ `portal_settings(is_public = false)`.
     - Chỉ được xem tin tức công khai (`community_news`), sự kiện (`community_events`), quỹ công khai (`neighborhood_funds`), và danh bạ lãnh đạo đã ẩn CCCD.
     - Được gửi phản ánh hiện trường mới vào `field_reports`.
  2. **Cán bộ được phê duyệt (`is_approved_staff(uid) = true`):**
     - Được xem danh sách dân cư, cơ sở kinh doanh, lịch công tác và nhiệm vụ được giao.
  3. **Quản trị viên (`is_admin(uid) = true`):**
     - Có toàn quyền quản trị cấu hình hệ thống, duyệt tài khoản Cán bộ và quản trị Zalo OA.

---

## 2. BẢO VỆ THÔNG TIN NHẠY CẢM & BÍ MẬT HỆ THỐNG (SECRETS PROTECTION)

1. **Bảo vệ mã định danh công dân (Đề án 06 / Nghị định 13/2023/NĐ-CP):**
   - Số CCCD của 11.229 cư dân mặc định được che mờ `0790 ••• ••• 456` trên toàn bộ giao diện bảng.
   - Chỉ khi Cán bộ có thẩm quyền bấm nút xem (`Eye`) thì mới hiển thị đầy đủ 12 số.
2. **Khóa bí mật & Token triển khai:**
   - `VERCEL_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, mật khẩu quản trị viên được lưu hoàn toàn trong `.env.local` và Vercel Environment Variables.
   - File `.env.local` đã nằm trong `.gitignore`, tuyệt đối không bị commit lên kho mã nguồn công khai GitHub.
3. **Zalo OAuth v4 Tokens:**
   - `Access Token`, `Refresh Token` và `App Secret` của ứng dụng Zalo Platform được lưu trong bảng cấu hình nội bộ `portal_settings` với cờ `is_public = false`, không bao giờ lộ ra phía Frontend của người dùng.

---

## 3. NHẬT KÝ BIẾN ĐỘNG & KIỂM TOÁN (AUDIT TRAIL LOGS)
- Mọi thao tác phê duyệt cán bộ, điều chỉnh nhân sự Chi hội, liên kết Zalo OA đều được ghi nhận vào `audit_logs` kèm thời gian thực (ISO 8601), danh tính người thực hiện (`linkedBy`, `updatedBy`) và IP/User-Agent.
