# HỆ THỐNG QUẢN LÝ THÔNG MINH KHU PHỐ 3 AN PHÚ - BỘ NHỚ & QUY TẮC DỰ ÁN

Tài liệu này đóng vai trò là **Bộ nhớ làm việc (Agent Memory)** và **Quy tắc dự án (Project Rules)** dành cho AI Assistant (Antigravity) trong tất cả các phiên làm việc hiện tại và tiếp theo.

---

## 1. TỔNG QUAN DỰ ÁN & ĐỊA BÀN
- **Tên dự án:** Remix Khu phố 3 An Phú - Quản lý thông minh & Cổng Dịch vụ Cư dân số.
- **Địa bàn hành chính:** Khu phố 3, Phường An Phú, TP. Thủ Đức, TP. Hồ Chí Minh.
- **Quy mô dân cư thực tế trong Database:** 
  - **488 hộ gia đình**
  - **11.632 nhân khẩu** (2.076 Thường trú + 9.556 Tạm trú đã khử trùng CCCD)
  - **3 cơ sở kinh doanh/doanh nghiệp**
- **Thường trực Ban điều hành:**
  - Bí thư Chi bộ: Ông Nguyễn Văn Hùng
  - Trưởng Khu phố: Bà Lê Thị Mai
  - Công an khu vực: Đại úy Trần Quốc Hải
- **Tài khoản quản trị viên tối cao (Admin Bootstrap):**
  - Email: `bdhkhupho3.ap@gmail.com`
  - Mật khẩu: `Trunghuy741`
  - Role: `admin` | Trạng thái: `approved` | Email Confirmed: `true`

---

## 2. KIẾN TRÚC CÔNG NGHỆ & MÃ NGUỒN
- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts, Motion.
- **Bản đồ số GIS:** Leaflet (WGS-84 CRS), đa giác ranh giới hành chính Khu phố 3 khép kín theo các trục đường Song Hành, Lương Định Của, Mai Chí Thọ. Tọa độ trung tâm: `[10.7935, 106.7445]`.
- **Backend & Serverless:**
  - Local Dev Server: Express + Vite middleware (`server.ts`).
  - Cloud Production Serverless: `api/chat.ts` (xử lý hội thoại Trợ lý AI Gemini 2.5 Flash).
  - Cấu hình điều hướng Vercel: `vercel.json` (SPA rewrites và API routing).

---

## 3. CƠ SỞ DỮ LIỆU SUPABASE & BẢO MẬT RLS
- **Project URL:** `https://wjdgaobhipkgzveidtra.supabase.co`
- **Project ID:** `wjdgaobhipkgzveidtra`
- **Access Token:** `sbp_fc2b41fc33b4edc43b40e83dec70d6f54502c03e`
- **Public Anon Key:** Được lưu trong `.env` và Vercel Environment Variables (`VITE_SUPABASE_ANON_KEY`).
- **Client SDK:** `src/lib/supabase.ts`.
- **Row Level Security (RLS) & Phân quyền:**
  - Bật RLS 100% trên cả 8 bảng: `user_profiles`, `households`, `residents`, `businesses`, `field_reports`, `neighborhood_funds`, `community_news`, `tasks`.
  - Hàm phân quyền: `is_approved_staff(uid)`, `is_admin(uid)`.
  - Cư dân/Khách (Anon): Chỉ được đọc tin tức, tra cứu quỹ, gửi phản ánh 1022. Tuyệt đối bị chặn đọc/ghi bảng `residents` và `households`.
  - Cán bộ đã duyệt (`is_approved_staff`): Đọc và quản lý đầy đủ nhân khẩu, hộ khẩu, nhiệm vụ, quỹ.
  - Quản trị viên (`is_admin`): Quyền duyệt/thu hồi tài khoản cán bộ công tác trong `user_profiles`.

---

## 4. HẠ TẦNG CLOUD & DEPLOYMENT VERCEL
- **Tổ chức Vercel:** `khupho3-s-projects`
- **Tên dự án Vercel:** `bdhkp3`
- **Personal Access Token:** `vcp_2E4YuC4RETScN01BRUIPtrVSTijX4JyB2EehKF8BMXqtuTWfFh2sIBhQ`
- **Domain Production chính thức:**
  👉 **[https://bdhkp3.vercel.app](https://bdhkp3.vercel.app)**
- **Git Commit Author chuẩn:** `Khupho3 <bdhkhupho3.ap@gmail.com>` (Bắt buộc giữ author này để Vercel không chặn deployment).
- **Lệnh Deploy nhanh:**
  ```bash
  npx vercel --prod --yes --token vcp_2E4YuC4RETScN01BRUIPtrVSTijX4JyB2EehKF8BMXqtuTWfFh2sIBhQ
  ```

---

## 5. CẤU HÌNH MCP SERVERS (.agents/mcp_config.json)
Dự án đã thiết lập 2 MCP Servers hoạt động:
1. **Supabase MCP:** `@supabase/mcp-server-supabase@latest` kết nối trực tiếp database `wjdgaobhipkgzveidtra`.
2. **Vercel MCP:** `@modelcontextprotocol/server-vercel` kết nối quản trị và theo dõi triển khai Vercel.

---

## 6. DANH MỤC TÍNH NĂNG ĐÃ HOÀN THIỆN & CHUYỂN ĐỔI DATABASE THẬT
1. **Nạp & Đồng bộ Dữ liệu Cư dân Quy mô lớn:**
   - Đã nạp thành công **11.632 nhân khẩu** (Thường trú & Tạm trú) và **488 hộ gia đình** từ file Excel vào Supabase PostgreSQL.
   - Cơ chế tải dữ liệu khách hàng theo batch cursor/range tối ưu trong `App.tsx` giúp load 11.632 dòng mượt mà, không nghẽn mạng.
2. **Quản lý Hộ khẩu & Tự nhận diện Hộ vĩnh viễn (`HouseholdAutoRecognition.tsx`):**
   - Thuật toán phân tích cấu trúc gia đình, tự nhận diện Chủ hộ và thành viên.
   - Nút **"Đồng bộ Toàn bộ vào Sổ Hộ Khẩu"** và **"Đồng bộ từng hộ"** đã được kết nối trực tiếp lệnh `UPSERT` vào bảng `households` và cập nhật `residents` trong PostgreSQL -> Lưu vĩnh viễn, không bị mất sau khi đăng xuất/tải lại trang.
3. **Quản lý Dân cư & Dán văn bản thô / Excel (`CitizenManagement.tsx`):**
   - Modal phân tích thông minh cho phép copy/paste dữ liệu thô hoặc nạp Excel, tự động chuẩn hóa và batch upsert trực tiếp vào database.
4. **Hệ thống Supabase Auth & Luồng Phê duyệt Cán bộ:**
   - Đăng ký cán bộ mới chuyển vào trạng thái `pending`.
   - Phân hệ **Cài đặt & Phân quyền (`SettingsAndPermissions.tsx`)** cho phép Bí thư Chi bộ xem danh sách và duyệt 1-chạm (`approved`).
   - Đăng nhập thật qua `supabase.auth.signInWithPassword()`, khôi phục mật khẩu qua email.
   - Tài khoản Admin chính thức: `bdhkhupho3.ap@gmail.com` / `Trunghuy741`.
5. **Cổng Dịch vụ Cư Dân Số (`CitizenLandingPage.tsx`):**
   - Tiếp nhận phản ánh 1022 lưu thẳng vào `field_reports`.
   - Hiển thị tin tức cộng đồng và quỹ khu phố minh bạch từ database thật.

---

## 7. TRẠNG THÁI HỆ THỐNG & ĐỊNH HƯỚNG PHIÊN TIẾP THEO
- **Trạng thái Build:** ✅ TypeScript không lỗi (`npx tsc --noEmit` exit 0), Vite build thành công sạch sẽ.
- **Trạng thái Console DevTools:** ✅ Đã kiểm tra qua Chrome DevTools MCP, 0 lỗi console/runtime.
- **Trạng thái Deployment:**
  - Production Vercel: 👉 **[https://bdhkp3.vercel.app](https://bdhkp3.vercel.app)**
  - Local Dev Server: `http://localhost:3000`
- **Kế hoạch phiên tiếp theo:**
  - Kết nối tính năng xuất báo cáo thống kê dân cư (Thường trú/Tạm trú/Người cao tuổi) ra file Excel/PDF chuẩn biểu mẫu Bộ Công an.
  - Tích hợp thêm gửi thông báo email/webhook khi có phản ánh hiện trường 1022 mới gửi lên từ cư dân.
