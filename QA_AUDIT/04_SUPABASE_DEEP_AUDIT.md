# PHASE 4: SUPABASE DEEP AUDIT & POSTGRESQL SECURITY
**Dự án:** Chuyển đổi số Quản lý Khu phố 3, Phường An Phú, TP. Hồ Chí Minh  
**Thời gian thực hiện:** 11/11/2026  
**Chuyên gia:** Senior Supabase Engineer & PostgreSQL Database Specialist  
**Phạm vi:** Toàn bộ CSDL PostgreSQL, Supabase Auth, Row Level Security, Storage & REST API  

---

## 1. KIỂM TOÁN CƠ SỞ DỮ LIỆU POSTGRESQL (DATABASE AUDIT)

### A. Mô Hình Thực Thể & Quan Hệ (Entity-Relationship)
* **Khóa chính (Primary Keys):** 100% các bảng đều sử dụng khóa chính dạng `UUID` với hàm `gen_random_uuid()` hoặc chuỗi mã định danh duy nhất (`code UNIQUE`), tránh nguy cơ đoán ID tuần tự (Insecure Direct Object Reference - IDOR).
* **Ràng buộc toàn vẹn (Foreign Key Constraints):**
  * `residents.household_id` tham chiếu `households.id` với hành vi an toàn `ON DELETE SET NULL` (không xóa nhầm nhân khẩu khi chỉnh sửa sổ hộ khẩu).
  * `businesses.tax_code` và `internal_code` được đánh chỉ mục đảm bảo tính duy nhất.
  * `field_reports` có trường `priority` và `status` kiểm soát bằng enum logic.

### B. Hiệu Năng & Chỉ Mục (Indexing & Query Optimization)
* Các cột thường xuyên tìm kiếm và lọc: `cccd`, `code`, `household_code`, `status`, `category` cần được tạo `B-Tree INDEX` để đáp ứng tốc độ truy vấn tức thì cho 11.632 cư dân và 488 hộ.

---

## 2. PHÂN TÍCH CHUYÊN SÂU ROW LEVEL SECURITY (RLS POLICIES)

### A. Hiện Trạng RLS
* Toàn bộ 5 bảng cốt lõi trong `schema.sql` đã bật RLS (`ENABLE ROW LEVEL SECURITY`).
* **Phát hiện rủi ro bảo mật (P1 - Security Finding):**
  * Trong tệp `schema.sql`, chính sách hiện tại cho `households` và `residents` đang sử dụng `USING (true)` cho `SELECT` và `ALL`.
  * Khi triển khai kết nối Supabase Cloud thực tế với Anon Key, thiết lập này cho phép đọc thông tin nhân thân (CCCD, địa chỉ) mà không qua xác thực người dùng.

### B. Phương Án Khắc Phục Chuẩn Bảo Mật (Đề án 06/CP Security Hardening)
Đề xuất bản vá Migration nâng cấp RLS chuẩn hóa theo 3 cấp độ:

```sql
-- 1. BẢO VỆ DỮ LIỆU CƯ DÂN & HỘ KHẨU (Chỉ cán bộ xác thực hoặc chủ hộ mới đọc được)
DROP POLICY IF EXISTS "Cho phép đọc dữ liệu cư dân" ON residents;
DROP POLICY IF EXISTS "Cho phép cán bộ quản lý đầy đủ dân cư" ON residents;

-- Cán bộ có quyền đọc/ghi toàn bộ
CREATE POLICY "canbo_manage_all_residents" ON residents
  FOR ALL
  TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', '') = 'canbo' 
    OR auth.jwt() ->> 'email' LIKE '%@gov.vn'
    OR auth.jwt() ->> 'email' = 'bdhkhupho3.ap@gmail.com'
  );

-- Cư dân chỉ được đọc thông tin của chính mình qua CCCD đã xác thực
CREATE POLICY "citizen_view_own_record" ON residents
  FOR SELECT
  TO authenticated
  USING (
    cccd = auth.jwt() ->> 'cccd'
  );

-- 2. PHẢN ÁNH HIỆN TRƯỜNG (Cư dân được gửi, chỉ Cán bộ được duyệt xử lý)
DROP POLICY IF EXISTS "Cho phép cư dân gửi phản ánh" ON field_reports;
CREATE POLICY "public_citizen_submit_report" ON field_reports
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "canbo_update_report_status" ON field_reports
  FOR UPDATE
  TO authenticated
  USING (coalesce(auth.jwt() ->> 'role', '') = 'canbo');
```

---

## 3. KIỂM TOÁN SUPABASE AUTH & QUẢN LÝ PHIÊN (AUTHENTICATION & SESSION)

1. **Cơ chế Xác thực Kép (Dual Auth):**
   * Hệ thống hỗ trợ đăng nhập qua Supabase Auth (`supabase.auth.signInWithPassword`) với tài khoản công vụ `bdhkhupho3.ap@gmail.com`.
   * Hỗ trợ lưu trữ phiên cục bộ có mã hóa để cán bộ tiếp tục làm việc ngoại tuyến khi mất sóng Internet cơ sở.
2. **Bảo Vệ Khóa Bí Mật (Secret Protection):**
   * Khóa dịch vụ tối cao `SUPABASE_SERVICE_ROLE_KEY` **HOÀN TOÀN KHÔNG TỒN TẠI** trong mã nguồn Frontend (`src/`), không bị lưu trong `.env` công khai hoặc commit lên GitHub.
   * Chỉ sử dụng `VITE_SUPABASE_ANON_KEY` an toàn theo đúng kiến trúc của Supabase.

---

## 4. KẾT LUẬN PHASE 4
CSDL có cấu trúc chuẩn hóa cao, thiết kế quan hệ bảng chặt chẽ. Đã thiết lập phương án nâng cấp RLS Policy nhằm đảm bảo tính bảo mật tuyệt đối cho thông tin nhân khẩu theo Luật An ninh mạng và Đề án 06/CP.
