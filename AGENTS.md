# HỆ THỐNG QUẢN LÝ THÔNG MINH KHU PHỐ 3 AN PHÚ - BỘ NHỚ & QUY TẮC DỰ ÁN

Tài liệu này đóng vai trò là **Bộ nhớ làm việc (Agent Memory)** và **Quy tắc dự án (Project Rules)** dành cho AI Assistant (Antigravity) trong tất cả các phiên làm việc hiện tại và tiếp theo.

---

## 1. TỔNG QUAN DỰ ÁN & ĐỊA BÀN
- **Tên dự án:** Remix Khu phố 3 An Phú - Quản lý thông minh & Cổng Dịch vụ Cư dân số.
- **Địa bàn hành chính:** Khu phố 3, Phường An Phú, TP. Thủ Đức, TP. Hồ Chí Minh.
- **Quy mô dân cư:** 350 hộ gia đình, 1.420 nhân khẩu, 45 cơ sở kinh doanh/doanh nghiệp.
- **Thường trực Ban điều hành:**
  - Bí thư Chi bộ: Ông Nguyễn Văn Hùng
  - Trưởng Khu phố: Bà Lê Thị Mai
  - Công an khu vực: Đại úy Trần Quốc Hải
- **Tài khoản quản trị viên / đại diện:**
  - Email: `bdhkhupho3.ap@gmail.com`

---

## 2. KIẾN TRÚC CÔNG NGHỆ & MÃ NGUỒN
- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts, Motion.
- **Bản đồ số GIS:** Leaflet (WGS-84 CRS), đa giác ranh giới hành chính Khu phố 3 khép kín theo các trục đường Song Hành, Lương Định Của, Mai Chí Thọ. Tọa độ trung tâm: `[10.7935, 106.7445]`.
- **Backend & Serverless:**
  - Local Dev Server: Express + Vite middleware (`server.ts`).
  - Cloud Production Serverless: `api/chat.ts` (xử lý hội thoại Trợ lý AI Gemini 2.5 Flash).
  - Cấu hình điều hướng Vercel: `vercel.json` (SPA rewrites và API routing).

---

## 3. CƠ SỞ DỮ LIỆU SUPABASE
- **Project URL:** `https://wjdgaobhipkgzveidtra.supabase.co`
- **Project ID:** `wjdgaobhipkgzveidtra`
- **Access Token:** `sbp_fc2b41fc33b4edc43b40e83dec70d6f54502c03e`
- **Public Anon Key:** Được lưu trong `.env` và Vercel Environment Variables (`VITE_SUPABASE_ANON_KEY`).
- **Client SDK:** `src/lib/supabase.ts` (kèm fallback in-memory nếu mất mạng hoặc offline).
- **Các bảng dữ liệu chính (`supabase/schema.sql`):**
  - `citizens`: Danh sách công dân, CCCD, ngày sinh, quan hệ chủ hộ, nhóm đối tượng.
  - `households`: Danh sách hộ gia đình, số nhà, tổ dân phố, số nhân khẩu, trạng thái đóng quỹ.
  - `businesses`: Cơ sở kinh doanh dịch vụ, ngành nghề, người đại diện, trạng thái PCCC.
  - `field_reflections`: Phản ánh hiện trường 1022 (rác, tiếng ồn, hạ tầng) kèm hình ảnh, tọa độ.
  - `fund_transactions`: Sổ quỹ khu phố (thu/chi, chứng từ, loại quỹ).
  - `party_members`: Chi bộ Đảng, chức vụ, ngày vào Đảng.
  - `social_welfare`: Danh sách an sinh xã hội, người cao tuổi, hộ nghèo, quà Tết, BHYT.
  - `tasks`: Lịch công tác, phân công nhiệm vụ cán bộ khu phố.
  - `community_events`: Tin tức, thông báo, sự kiện cộng đồng.

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

## 6. DANH MỤC TÍNH NĂNG ĐẶC TRÙNG ĐÃ HOÀN THIỆN
1. **Bản đồ số không gian GIS (`src/components/gis/LeafletGisMap.tsx`):**
   - Ranh giới địa giới hành chính Khu phố 3 An Phú cố định trên bản đồ Leaflet.
   - Các lớp ghim: Nhà ở dân cư, Điểm phản ánh hiện trường 1022, Cơ sở kinh doanh.
2. **Lịch công tác & Phân công nhiệm vụ (`src/components/TaskAndSchedule.tsx`):**
   - Quản lý lịch họp Chi bộ, lịch tuần tra an ninh, ra quân Ngày Chủ Nhật Xanh.
   - Phân công nhiệm vụ cụ thể cho từng thành viên Ban điều hành, theo dõi tiến độ hoàn thành.
3. **Quỹ Khu phố & VietQR Động (`src/components/NeighborhoodFunds.tsx`, `VietQrModal.tsx`, `HouseholdFundLookup.tsx`):**
   - Tạo mã QR thanh toán chuẩn VietQR (ngân hàng, số tài khoản, số tiền và cú pháp đóng nộp theo hộ).
   - Tra cứu đóng nộp minh bạch theo từng tổ và từng hộ dân.
4. **Cổng Dịch vụ Cư Dân Số & Trang chủ Công cộng (`src/components/CitizenLandingPage.tsx`):**
   - Đóng vai trò là Cổng thông tin & Trang chủ mặc định cho người dân và du khách khi truy cập ứng dụng.
   - Tiện ích trực tuyến: Gửi phản ánh hiện trường 1022 (kèm tọa độ GPS, ảnh thực tế, cơ chế chống spam/rate limit), tra cứu và tải về 11 biểu mẫu hành chính chuẩn (CT01, cấp số nhà, tạm trú người nước ngoài, PCCC...).
   - Hiển thị danh sách thông báo khẩn cấp (Ưu tiên đỏ), tin tức đời sống cộng đồng, lịch sự kiện sắp diễn ra và danh bạ thường trực Ban Điều hành KP3.
   - Điều hướng mượt mà 1-chạm giữa Cổng Cư dân và Trung tâm Nghiệp vụ Cán bộ.
5. **Phân hệ Biên tập & Quản lý Tin tức, Thông báo Khu phố (`src/components/SettingsAndPermissions.tsx`, `CommunityEvents.tsx`):**
   - Quản trị viên và Cán bộ có thể trực tiếp soạn thảo bản tin/thông báo mới, chọn chuyên mục (*Thông báo khẩn*, *Hành chính*, *Y tế & Đời sống*, *Phong trào*, *An sinh xã hội*).
   - Tùy chọn ghim tin nổi bật (`isPinned`) lên đầu Cổng Cư Dân.
   - Hỗ trợ đầy đủ thao tác: Chỉnh sửa nội dung, ghim/bỏ ghim nhanh, xem trước bài viết (Live Preview theo giao diện cư dân), xóa bài viết và tìm kiếm/lọc chuyên mục.
   - Tự động đồng bộ dữ liệu thời gian thực giữa Cổng Cán bộ và Cổng Người dân.
6. **Cơ chế Xác thực & Đăng nhập 1-Chạm (`src/components/LoginAndRegister.tsx`, `App.tsx`):**
   - Nút "Cổng dành cho cán bộ" tại Header/Menu/Footer tự động cấp quyền và đăng nhập trực tiếp tài khoản Cán bộ Quản trị (`CANBO_USER` - Bí thư Nguyễn Văn Hùng).
   - Màn hình đăng nhập tích hợp sẵn 2 nút truy cập nhanh 1-chạm cho Cán bộ và Cư dân, không lo quên mật khẩu khi giám sát hay nghiệm thu.
7. **Trợ lý AI Thông minh & Cơ sở dữ liệu Cư dân:**
   - Trả lời 24/7 thắc mắc thủ tục hành chính, quy định pháp luật và hướng dẫn gửi phản ánh.
   - Quản lý chi tiết danh sách cư dân, hộ gia đình, doanh nghiệp, cơ sở kinh doanh, an sinh xã hội, chi bộ Đảng và sổ thu/chi quỹ khu phố.

---

## 7. TRẠNG THÁI HỆ THỐNG & ĐỊNH HƯỚNG PHIÊN TIẾP THEO
- **Trạng thái Build:** ✅ TypeScript không lỗi (`npx tsc --noEmit` pass 100%), Vite build thành công sạch sẽ.
- **Trạng thái Console DevTools:** ✅ Đã kiểm tra qua Chrome DevTools MCP, 0 lỗi runtime/console error.
- **Trạng thái Deployment:**
  - Production Vercel: 👉 **[https://bdhkp3.vercel.app](https://bdhkp3.vercel.app)**
  - Local Dev Server: `http://localhost:3000`
- **Tài liệu & Kế hoạch phiên tiếp theo:**
  - Tích hợp thêm kênh gửi phản ánh kèm gửi email / webhook thông báo tức thì đến cán bộ phụ trách.
  - Kết nối Supabase Database bảng `community_news` để đồng bộ tin tức đa thiết bị khi có kết nối mạng.

