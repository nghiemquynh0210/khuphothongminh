# HỆ THỐNG QUẢN LÝ THÔNG MINH KHU PHỐ 3 AN PHÚ - BỘ NHỚ & QUY TẮC DỰ ÁN

Tài liệu này đóng vai trò là **Bộ nhớ làm việc (Agent Memory)** và **Quy tắc dự án (Project Rules)** dành cho AI Assistant (Antigravity) trong tất cả các phiên làm việc hiện tại và tiếp theo.

---

## 1. TỔNG QUAN DỰ ÁN & ĐỊA BÀN
- **Tên dự án:** Remix Khu phố 3 An Phú - Quản lý thông minh & Cổng Dịch vụ Cư dân số.
- **Địa bàn hành chính:** Khu phố 3, Phường An Phú, TP. Hồ Chí Minh.
- **Quy mô dữ liệu thực tế trên Supabase Cloud (Cập nhật danh sách Công an Phường 15/11/2026):**
  - **7.815 hộ gia đình quản lý** (**488 Sổ hộ khẩu thường trú CT01** + **7.327 Hồ sơ hộ tạm trú CT08 / điểm lưu trú** phân cụm chính xác theo trường `CHỦ HỘ TẠM TRÚ` / `owner_name`)
  - **11.229 nhân khẩu** (2.109 Thường trú + 9.120 Tạm trú đã khử trùng CCCD & lọc cư dân tạm trú đã rời đi)
  - **118+ cơ sở kinh doanh & doanh nghiệp** (Doanh nghiệp TNHH/CP có MST + Cơ sở kinh doanh tại chỗ & mạng lưới cơ sở nhà trọ lưu trú)
- **Thường trực Ban điều hành & Mặt trận (Đồng bộ động 100% hai chiều từ phân hệ `Quản lý Chi hội`):**
  - Quy tắc tôn ti bắt buộc: **Bí thư Chi bộ luôn luôn hiển thị ở vị trí số 1 (Người đứng đầu Khu phố)** trên toàn bộ hệ thống (Cổng Cư dân, Giới thiệu, Danh bạ Lãnh đạo, Dashboard, Biểu mẫu hành chính, Lịch công tác & Nhiệm vụ).
  - Nhân sự đương nhiệm hiện tại trên CSDL Cloud: Bí thư Chi bộ `Nghiêm Xuân Quỳnh` | Phó Bí thư Chi bộ `Phạm Ngọc Hà` | Trưởng BĐH Khu phố `Nguyễn Trung Huy` | Trưởng Ban CTMT `Trần Thị Mỹ Dung` | Công an khu vực `Đại úy Trần Quốc Hải` (tự động cập nhật toàn app bao gồm cả `work_schedules`, `tasks`, `recurring_reminders` và `landing_config` ngay khi đổi Trưởng/Phó tại `PartyBranch.tsx`).
- **Tài khoản quản trị viên tối cao (Admin Bootstrap):**
  - Email: `bdhkhupho3.ap@gmail.com`
  - Mật khẩu & Token triển khai: Lưu bảo mật trong `.env.local` (đã gitignore, tuyệt đối không ghi plaintext lên kho Git công khai).
  - Role: `admin` | Trạng thái: `approved` | Email Confirmed: `true` (tên hiển thị tự động đồng bộ theo Bí thư Chi bộ đương nhiệm).

---

## 2. KIẾN TRÚC CÔNG NGHỆ & MÃ NGUỒN
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 6, Lucide Icons, Recharts, Motion, Vitest.
- **Bản đồ số GIS:** Leaflet (WGS-84 CRS), đa giác ranh giới hành chính Khu phố 3 khép kín theo các trục đường Song Hành, Lương Định Của, Mai Chí Thọ. Tọa độ trung tâm: `[10.7935, 106.7445]`.
- **Backend & Serverless Endpoints (`api/` & `server.ts`):**
  - Local Dev Server: Express + Vite middleware (`server.ts`, chạy cổng `3000`).
  - `api/chat.ts`: Xử lý hội thoại Trợ lý AI Khu phố 3 đa phương thức (Gemini 2.5 Flash).
  - `api/ocr-document.ts`: AI Vision OCR đa phương thức (Gemini 2.5 Flash) bóc tách tự động Ảnh chụp / PDF nhiều trang cho 4 nghiệp vụ:
    1. `docType: "business_license"` — Giấy chứng nhận đăng ký Hộ kinh doanh / Doanh nghiệp.
    2. `docType: "land_certificate"` — Giấy chứng nhận QSDĐ (Sổ đỏ / Sổ hồng, hỗ trợ nhiều thửa đất).
    3. `docType: "ward_schedule"` — Lịch làm việc tuần của Đảng ủy Phường & HĐND-UBND Phường.
    4. `docType: "decision_document"` — Quyết định chuẩn y / kiện toàn nhân sự Chi hội & Đoàn thể.
  - `api/upload-storage.ts`: Tải tệp/ảnh/PDF an toàn lên Supabase Storage Buckets (`field-reports`, `cadastral-docs`, `task-attachments`, `admin-forms`), bảo vệ bằng xác thực Staff JWT nội dòng.
  - `api/staff-admin.ts`: Quản trị tài khoản Cán bộ (`register`, `approve`, `reject`, `revoke`, `verify_cadre_resident`, `link_resident`), tự động đối khớp & liên kết tài khoản Cán bộ với Hồ sơ Cư dân (`residents`) và chức vụ Chi bộ / Chi hội (`associations_records` — luôn ưu tiên `ASC_DANG` Chi bộ đứng đầu).
  - `api/notifications.ts`: Bộ máy Thông báo Tự động **Zalo Official Account Cơ quan Nhà nước (`oa_type: 4`) & Email (Resend)**:
    + **Zalo OA chính thức đã liên kết:** `Ban Điều Hành Khu Phố 3 phường An Phú` (**OA ID:** `3124278810088361494`, đường dẫn `https://zalo.me/bdhkhupho3`, **347+ tài khoản người dân & cán bộ đang Quan tâm**).
    + **Ứng dụng Zalo Platform đã xác thực tên miền `https://bdhkp3.vercel.app/`:** `Điều hành Đô thị Số KP3 An Phú` (**App ID:** `432932322782886593`; `Access Token`, `Refresh Token` OAuth v4 & `App Secret` lưu mã hóa nội bộ trong `portal_settings("zalo_oa_config_v1", is_public = false)` — tuyệt đối không ghi plaintext ra mã nguồn).
    + **Quy tắc chuẩn API Zalo OA Cơ quan Nhà nước (`oa_type: 4`):** Bắt buộc sử dụng `POST https://openapi.zalo.me/v2.0/oa/message`, `GET /v2.0/oa/getfollowers` và `GET /v2.0/oa/getprofile` (KHÔNG dùng `/v3.0/oa/message/cs` hay `/v3.0/oa/user/list` vốn chỉ dành cho OA doanh nghiệp thương mại; ưu điểm của `v2.0/oa/message` trên OA Cơ quan Nhà nước là đẩy tin nhắn `24/7` không bị chặn cửa sổ 48h).
  - `api/keepalive.ts`: Endpoint giữ ấm CSDL Supabase định kỳ kết hợp **tự động kiểm tra & nhắc lịch họp Cán bộ trước 60 phút** (theo giờ Việt Nam `UTC+7`, chu kỳ 5 phút/lần + GitHub Actions `.github/workflows/supabase-keepalive.yml` mỗi 15 phút từ `06:00 – 21:45` ICT + Vercel Cron hằng ngày). **Quy tắc ESM bắt buộc trên Vercel (`"type": "module"`):** Mọi file trong `api/*.ts` phải độc lập 100%, không import tương đối chéo file trong `api/` để tránh lỗi `FUNCTION_INVOCATION_FAILED`.
  - **Quy tắc Địa danh Hành chính sau sáp nhập:** Tuyệt đối **KHÔNG** sử dụng `"TP. Thủ Đức"` hay `"Thành phố Thủ Đức"` ở bất kỳ đâu trong code hay dữ liệu; thống nhất 100% là **`Khu phố 3, Phường An Phú, TP. Hồ Chí Minh`**.
  - Cấu hình điều hướng & chống lỗi Chunk sau Deploy: `vercel.json` (SPA rewrite `"/((?!api/|assets/).*)"` chặn trả nhầm `text/html` cho module `.js`, `Cache-Control: no-cache` cho `index.html`; giữ nguyên 1 cron hằng ngày trên gói Vercel Hobby) kết hợp `src/utils/chunkReloadRecovery.ts` (`lazyWithChunkRetry` + lắng nghe `vite:preloadError`).

---

## 3. CƠ SỞ DỮ LIỆU SUPABASE, STORAGE & BẢO MẬT RLS
- **Project URL:** `https://wjdgaobhipkgzveidtra.supabase.co`
- **Project ID:** `wjdgaobhipkgzveidtra`
- **Keys & Tokens:** Được lưu bảo mật trong `.env` / `.env.local` và Vercel Environment Variables (`VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Client SDK & Sync Layer:** `src/lib/supabase.ts` & `src/utils/supabaseSync.ts`.
- **Hệ thống bảng PostgreSQL thực tế đang hoạt động (Bật RLS 100%):**
  - Nhóm cốt lõi: `user_profiles`, `households`, `residents`, `businesses`, `field_reports`, `neighborhood_funds`, `community_news`, `community_events`, `tasks`, `administrative_forms`.
  - Nhóm điều hành & cấu hình: `work_schedules` (lịch công tác + metadata `__KP3_SCHEDULE_META_V1__`), `recurring_reminders`, `associations_records`, `welfare_records`, `portal_settings` (`is_public = true` cho cấu hình công khai đã khử PII; `is_public = false` cho metadata mở rộng nội bộ & `audit_logs`).
- **Supabase Storage Buckets:** `field-reports`, `cadastral-docs`, `task-attachments`, `admin-forms`.
- **Hàm RPC & Phân quyền (`SECURITY DEFINER`):**
  - `is_approved_staff(uid)`, `is_admin(uid)`: Kiểm tra quyền cán bộ đã duyệt và quản trị viên.
  - `register_pending_staff_profile(...)`: Cho phép luồng đăng ký tài khoản cán bộ mới ghi hồ sơ `pending` an toàn ngay cả khi chưa có phiên đăng nhập active.
  - Cư dân/Khách (Anon): Chỉ được đọc tin tức, danh bạ lãnh đạo công khai (đã ẩn CCCD), tra cứu quỹ, gửi/tra cứu phản ánh 1022. Tuyệt đối bị chặn đọc/ghi bảng `residents`, `households` và các bản ghi nội bộ `is_public = false`.

---

## 4. HẠ TẦNG CLOUD & DEPLOYMENT VERCEL
- **Tổ chức Vercel 1 (Chính thức):** `khupho3-s-projects` (`team_0aH5pSGQSKz3aNd18h6C5TbA`)
  - **Tên dự án:** `bdhkp3` (`prj_YXcH4xvUses42aYf0evQslEXtbMO`)
  - **Domain Production chính thức:** 👉 **[https://bdhkp3.vercel.app](https://bdhkp3.vercel.app)**
- **Tổ chức Vercel 2 (Dự phòng):** `nghiemquynh0210s-projects` (`team_5JdtH3l3j0wix2LsdMJVs7kZ`)
  - **Tên dự án:** `khuphothongminh` (`prj_iOn1m5kCkk7su1X4qP1k47y5AU0C`)
  - **Domain Production:** 👉 **[https://khuphothongminh-six.vercel.app](https://khuphothongminh-six.vercel.app)**
- **GitHub Repository (Public):**
  👉 **[https://github.com/nghiemquynh0210/khuphothongminh](https://github.com/nghiemquynh0210/khuphothongminh)**
- **Git Commit Author chuẩn:** `Khupho3 <bdhkhupho3.ap@gmail.com>` (Bắt buộc giữ author này để Vercel không chặn deployment).
- **Lệnh Deploy nhanh lên bdhkp3 (đọc `VERCEL_TOKEN` từ `.env.local`):**
  ```bash
  npx vercel deploy --prod --yes --token $env:VERCEL_TOKEN
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
   - Tài khoản Admin chính thức: `bdhkhupho3.ap@gmail.com` (mật khẩu lưu bảo mật trong `.env.local`, không ghi plaintext trong tài liệu).
5. **Cổng Dịch vụ Cư Dân Số (`CitizenLandingPage.tsx`):**
   - Tiếp nhận phản ánh 1022 lưu thẳng vào `field_reports`.
   - Hiển thị tin tức cộng đồng và quỹ khu phố minh bạch từ database thật.
6. **Chuẩn Hóa Trường Dữ Liệu Địa Chỉ & Chi Tiết Cư Dân (Thường Trú & Tạm Trú):**
   - **Thường trú (2.076 nhân khẩu):** Phân định rạch ròi **Địa chỉ thường trú (Cột H)** và **Chỗ ở hiện tại (Cột J)**. Tích hợp bổ sung **Họ tên cha (Cột K)**, **Họ tên mẹ (Cột L)**, **Tình trạng quản lý (Cột N)**.
   - **Tạm trú (9.556 nhân khẩu):** Phân định chuẩn xác **Địa chỉ tạm trú / Chỗ ở hiện tại tại KP3 (Cột G)** và **Địa chỉ thường trú gốc ở quê quán (Cột J)**. Tích hợp **Ngày đăng ký tạm trú (Cột H)**, **Ngày hết hạn tạm trú (Cột I)**, **Tình trạng quản lý (Cột L)**, tách số điện thoại chủ trọ. Loại bỏ hoàn toàn việc gán nhầm thông tin thường trú gốc vào trường nơi làm việc (workplace).
   - **Thông tin chi tiết cư dân (`CitizenManagement.tsx`):** Mọi trường thông tin chưa có trong file (học vấn, hôn nhân, nghề nghiệp, BHYT, NVQS...) đều hiển thị trung thực là **"Chưa cập nhật"**, tuyệt đối không dùng giá trị giả lập/hardcoded.
   - **Database Supabase:** Đã bổ sung 7 cột chuyên dụng (`permanent_address`, `current_address`, `father_name`, `mother_name`, `temporary_reg_date`, `temporary_exp_date`, `management_status`) và cập nhật đồng bộ thành công toàn bộ 11.632 nhân khẩu.

7. **Tự Động Nhận Diện Hộ Gia Đình & Suy Luận Cây Phả Hệ Tự Động (`HouseholdAutoRecognition.tsx` & `householdRecognitionUtils.ts`):**
   - **Tự động 100% khi khởi động ứng dụng:** Khi tải 11.632 cư dân từ Supabase, hệ thống tự động gom nhóm, liên kết toàn bộ thành viên vào Sổ hộ khẩu điện tử tương ứng và suy luận quan hệ mà người dùng không cần bấm bất kỳ nút nào thủ công.
   - **Thuật toán phả hệ thông minh:** Tự động đối chiếu chéo `Họ tên cha`, `Họ tên mẹ`, `Giới tính`, `Năm sinh` để xác định chính xác: `Chủ hộ`, `Vợ/Chồng`, `Con trai/Con gái`, `Cháu nội/Cháu ngoại`, `Bố/Mẹ`, `Con dâu/Con rể`, `Anh/Chị/Em`.
   - **Hỗ trợ đầy đủ cả Thường trú & Tạm trú:** Nhận diện theo mã hộ khẩu (Thường trú) hoặc phân cụm địa chỉ chuẩn hóa (Tạm trú).
   - **Tối ưu hóa UI/UX:** Tích hợp phân trang `Pagination` (10 hộ/trang) tại màn hình "Tự Nhận Diện Hộ", loại bỏ triệt để hiện tượng lag DOM khi render hàng trăm/nghìn hộ.

8. **Cảnh Báo Hết Hạn Tạm Trú Trước 01 Tháng & Bóc Tách / Liên Kết Cơ Sở Kinh Doanh Nhà Trọ:**
   - **Bóc tách thông tin nhà trọ thông minh (`parseAccommodationInfo`):** Tự động phân tích các chuỗi dữ liệu phức tạp như `"Nhà trọ Phạm Văn Bình (SĐT: 0913137155) 17/A3 Khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh"`, tách thành:
     + Tên chủ trọ / Tên cơ sở: `Phạm Văn Bình` / `Nhà trọ Phạm Văn Bình`
     + Số điện thoại liên hệ: `0913137155` (có nút bấm gọi `tel:` trực tiếp)
     + Địa chỉ phòng trọ chuẩn hóa: `17/A3 Khu phố 3`
   - **Cảnh báo hết hạn tạm trú trước 01 tháng (`getTemporaryResidenceExpiryStatus`):**
     + So khớp ngày hết hạn tạm trú (`temporaryExpDate`) với thời gian thực.
     + Nếu còn hạn <= 30 ngày (trước 01 tháng): Hiển thị badge vàng/cam nhấp nháy `⚠️ Sắp hết hạn tạm trú (còn X ngày)`.
     + Nếu đã quá hạn: Hiển thị badge đỏ `🚨 Đã hết hạn tạm trú (quá X ngày)`.
     + Tích hợp Banner cảnh báo điều hành và Bộ lọc nhanh theo thời hạn tạm trú trên thanh công cụ `CitizenManagement.tsx`.
   - **Liên kết Cơ sở Kinh doanh Nhà trọ & Số người lưu trú thực tế (`BusinessManagement.tsx`):**
     + Tự động tính toán số người lưu trú thực tế từ danh sách cư dân (`residents`) bằng hàm `isResidentInAccommodation`.
     + Khi bấm vào cơ sở kinh doanh nhà trọ (ví dụ `Nhà trọ Phạm Văn Bình` tại `17/A3`): Hiển thị chính xác số người thực tế (81 người đối khớp từ 11.632 cư dân) và hiển thị bảng chi tiết danh sách cư dân lưu trú (Họ tên, CCCD, SĐT, Quê quán/Thường trú gốc, Thời hạn tạm trú, Cảnh báo hạn).
     + Hỗ trợ xuất danh sách cư dân lưu trú ra file Excel 1-chạm (`handleExportHostelResidents`).

9. **Khắc Phục Phân Hệ Cơ Sở Kinh Doanh & Đồng Bộ Cơ Sở Lưu Trú Vào Database Supabase:**
   - **Nguyên nhân trước đó:** Bảng `businesses` trên Supabase PostgreSQL trước đây chỉ có 3 dòng mẫu và thiếu các cột lưu trú (`is_accommodation`, `room_count`, `guest_count`), khiến hàm fetch từ DB ghi đè lên danh sách và không hiển thị các nhà trọ.
   - **Đã khắc phục:**
     + Bổ sung các cột `is_accommodation`, `room_count`, `guest_count`, `pccc_passed`, `scale`, `has_cam_ket_an_ninh` vào bảng `businesses` trên Supabase PostgreSQL.
     + Đồng bộ toàn bộ 13 cơ sở kinh doanh & nhà trọ lưu trú vào bảng `businesses` (bao gồm `Nhà trọ Phạm Văn Bình`, `Nhà trọ An Phú Khang`, `Nhà nghỉ Bình Minh`...).
     + Nâng cấp hàm nạp dữ liệu trong [src/App.tsx](file:///d:/Download/khuphothongminh/src/App.tsx) để tự động đối chiếu, kế thừa metadata phong phú và giữ đầy đủ các trường thông tin.
     + Kiểm tra trực quan qua Chrome DevTools MCP: UI render chuẩn xác 13 cơ sở, 3 cơ sở lưu trú (57 phòng), mở modal chi tiết Nhà trọ Phạm Văn Bình hiển thị đầy đủ 81 cư dân lưu trú thực tế cùng nút xuất Excel.

10. **Tối Ưu Hóa Toàn Diện UI/UX Phân Hệ Cơ Sở Kinh Doanh (Card View & Table View):**
   - **Card View:**
     + Tách tên cơ sở ra ngoài ảnh, in đậm 14px, loại bỏ hiện tượng bị che khuất / cắt cụt chữ (`truncate`) trên chân ảnh.
     + Đưa mã giấy phép (`licenseNumber`) và huy hiệu `Cơ sở lưu trú` lên các góc ảnh một cách tinh tế.
     + Thiết kế khối thông tin lưu trú nền cam hổ phách cao cấp với micro-stat `phòng • tầng` và huy hiệu `✓ CSDL`.
     + Khối Địa chính format dạng mono 1 hàng (`Tờ 272, Thửa 55 • 150 m² ODT`), không bị ngắt rớt dòng.
     + Footer hiển thị trọn vẹn 100% họ tên chủ hộ (`Nguyễn Văn Hùng`, `Trần Thị Lan`, `Phạm Văn Bình`) và căn chỉnh đều đặn nút `Sổ đỏ` cùng `✓ PCCC`.
   - **Table View:**
     + Bổ sung ảnh thumbnail đại diện tròn bo góc 10x10.
     + Sửa lỗi rớt dòng tại cột Trạng thái (`Đang hoạt động` nằm trên 1 hàng duy nhất với chấm tròn pulse sinh động).
     + Cột lưu trú căn chỉnh thẳng hàng tuyệt đối giữa số người và tag `✓ CSDL`.
     + Sửa nút `Hồ sơ` từ hình bầu dục dọc méo mó thành nút bấm chuẩn UI chữ nhật bo góc với icon mắt và chữ nằm ngang cân đối.

11. **Tự Động Nhận Diện & Liên Kết Cơ Sở Nhà Trọ Từ Dữ Liệu Dân Cư (`autoExtractHostelBusinesses`):**
   - **Tự động bóc tách & phát hiện 108 cơ sở nhà trọ:** Phân tích toàn diện 11.632 cư dân (đặc biệt 9.556 cư dân tạm trú), bóc tách địa chỉ phòng trọ, SĐT chủ trọ và tên chủ hộ để gom nhóm tạo thành các cơ sở kinh doanh lưu trú chuẩn xác (e.g. `Nhà trọ Đặng Văn Độ`, `Nhà trọ Đồng Thị Gái`, `Nhà trọ Phạm Thị Thanh Thủy`, `Nhà trọ Phạm Thị Hiền`, `Nhà trọ Cao Thị Mỹ Linh`...).
   - **Đồng bộ layout chuẩn 100% không vỡ khung:** Mọi cơ sở nhà trọ mới đều có cấu trúc hiển thị đồng nhất tuyệt đối với `Nhà trọ An Phú Khang`, `Nhà nghỉ Bình Minh` và `Nhà trọ Phạm Văn Bình`: `🛏️ X phòng • Y tầng` | `👥 Z người` | Khối Địa chính mono 1 dòng | Tên chủ hộ và badge PCCC cân đối.
   - **Xem chi tiết & Xuất Excel 1-chạm:** Khi click vào bất kỳ cơ sở nhà trọ nào hoặc bấm `👁️ Hồ sơ`, modal mở ra hiển thị danh sách toàn bộ cư dân đang lưu trú tại cơ sở đó (Họ tên, ngày sinh, CCCD, quê quán thường trú gốc, thời hạn tạm trú, cảnh báo hết hạn) và nút `Xuất DS Excel (X người)`.
   - **Đồng bộ vĩnh viễn vào Supabase PostgreSQL:** Đã thêm nút `Lưu vào Supabase CSDL` và đồng bộ thành công toàn bộ 108 cơ sở lưu trú vào bảng `businesses` trên Supabase, đảm bảo dữ liệu tồn tại vĩnh viễn và không bị mất sau khi tải lại trang.

12. **Đồng Bộ Hóa Số Liệu Thực Tế Trên Toàn Hệ Thống Tổng Quan Cán Bộ & Cổng Cư Dân (`Dashboard.tsx` & `CitizenLandingPage.tsx`):**
   - **Xóa bỏ hoàn toàn số liệu giả lập:** Loại bỏ các số liệu mock cũ (1.420 dân, 350 hộ, 45 cơ sở, 1.045 thường trú, 320 tạm trú...).
   - **Liên kết 100% CSDL Supabase PostgreSQL thời gian thực:**
     + **Dân cư thực tế:** **11.632 nhân khẩu** (Nam: 6.005 người chiếm 51.6% • Nữ: 5.627 người chiếm 48.4%).
     + **Hộ khẩu thực tế:** **488 hộ gia đình** số hóa (bình quân 4.3 người/hộ).
     + **Doanh nghiệp & Cơ sở kinh doanh:** **118 cơ sở** (7 Doanh nghiệp TNHH/Cổ phần có MST • 111 Cơ sở kinh doanh tại chỗ gồm 108 cơ sở nhà trọ với 553 phòng).
     + **Phân bố cư trú trực quan trên biểu đồ BarChart:** Thường trú **2.076 người**, Tạm trú **9.556 người**.
   - **Tích hợp khối "Chỉ Số Quản Lý Dân Cư & Cảnh Báo Điều Hành KP3":**
     + **Cơ cấu Độ tuổi (Luật Căn cước 2023):** Trẻ em (<14t): 1.311 | Độ tuổi lao động (14-59t): 9.883 | Người cao tuổi (≥60t): 438.
     + **Cảnh báo Tạm trú thời gian thực (Công an KV):** Sắp hết hạn (≤30 ngày): 245 người (badge cảnh báo nhấp nháy) | Đã quá hạn: 533 người (badge đỏ) | An toàn: 8.778 hồ sơ.
     + **Mạng lưới Nhà trọ:** 108 cơ sở • 553 phòng • 9.556 khách tạm trú đối khớp thực tế.
     + **Tra cứu Sổ hộ khẩu:** Mẫu tra cứu chuẩn xác `HK-001`, `HK-002`... liên kết trực tiếp với dữ liệu 488 hộ gia đình.

13. **Chuẩn Hóa UI/UX & Tích Hợp Kỹ Năng Thiết Kế (Workspace Skills):**
    - Đã thiết lập 4 Workspace Skills chuyên biệt cho dự án tại `.agents/skills/`:
      + `ui-ux-design-system`: Chuẩn hóa nguyên tắc thiết kế giao diện hành chính công, độ tương phản WCAG 2.1 AA, bố cục Key-Value Matrix loại bỏ bento box rối mắt, phân chia tab tiến trình và chuẩn hóa icon vector.
      + `tailwind-component-crafting`: Hướng dẫn chuyên sâu xây dựng component React 19 + Tailwind CSS, responsive mobile-first, micro-interactions, chuyển trạng thái mượt mà và quản lý viewport modal.
      + `gov-design-system`: Kế thừa tinh hoa từ các hệ thống thiết kế chính phủ hàng đầu thế giới trên GitHub (GOV.UK Frontend `alphagov/govuk-frontend`, USWDS `uswds/uswds`, GOV.IE Tailwind `ogcio/govie-ds` và Singapore SGDS `SingaporeGov/sgds`) tối ưu cho Cổng dịch vụ công cấp cơ sở.
      + `public-admin-data-management`: Quy chuẩn quản lý CSDL hộ tịch, bảo vệ dữ liệu công dân (Đề án 06 / NĐ 13/2023/NĐ-CP), mặt nạ CCCD, nhật ký biến động địa bàn và cảnh báo thời hạn tạm trú.
    - Đã tái cấu trúc toàn diện 3 Modal thông tin trọng yếu: Sổ Hộ khẩu (`HouseholdManagement.tsx`), Cơ sở kinh doanh / Nhà trọ (`BusinessManagement.tsx`), và Doanh nghiệp (`EnterpriseManagement.tsx`).

14. **Hệ Thống Thiết Kế Thống Nhất Giữa Tất Cả Các Phân Hệ (Unified Global Design System):**
    - **Chuẩn hóa Modal trường thông tin một hàng (`DetailRow` & `DetailGrid`):**
      + Vị trí: `src/components/common/DetailRow.tsx`.
      + Mọi trường thông tin trong tất cả Modal chi tiết trên toàn app (Dân cư, Hộ khẩu, Doanh nghiệp, Hộ kinh doanh, An sinh, Phản ánh 1022, Chi bộ, Nhiệm vụ) đều hiển thị trên **một hàng duy nhất** theo công thức: `[Nhãn]: [Giá trị]`.
      + Độ rộng nhãn cố định `min-w-[145px] sm:min-w-[165px] text-slate-500 font-medium text-[13px]`, giá trị `font-semibold text-slate-900 text-[13px] sm:text-sm`, hỗ trợ `isMono` cho CCCD/MST/SĐT và `colSpan={2}` cho địa chỉ dài.
    - **Thẻ chỉ số KPI dùng chung (`StatCard`):**
      + Vị trí: `src/components/common/StatCard.tsx`.
      + Chuẩn hóa đồng bộ 100% về kích thước, padding (`p-4.5`), bo góc (`rounded-2xl`), đường viền (`border-slate-200/80`), icon container (`w-11 h-11 rounded-xl`) và typography (`text-2xl font-black text-slate-900`).
      + Áp dụng thống nhất cho toàn bộ các phân hệ: An sinh (`SocialWelfare`), Phản ánh (`FieldReflections`), Sự kiện (`CommunityEvents`), Quỹ (`NeighborhoodFunds`), Nhiệm vụ (`TaskAndSchedule`), Doanh nghiệp (`EnterpriseManagement`).
    - **Tiêu đề trang chuẩn cấp hành chính (`PageHeader`):**
      + Vị trí: `src/components/common/PageHeader.tsx`.
      + Đồng bộ hóa Huy hiệu cấp chính phủ, tên phân hệ, mô tả chỉ thị và cụm nút hành động bên phải.
    - **Thanh công cụ Tìm kiếm & Bộ lọc (Search & Filters):**
      + Bo góc đồng bộ `rounded-xl`, viền `border-slate-200/90`, focus ring chuẩn công quyền `focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600`.
      + Khắc phục triệt để lỗi viền khung đen sì (`border-slate-150` không tồn tại trong Tailwind v4 fallback về `currentColor` đen) trên tất cả các khung container của `CitizenManagement`, `FieldReflections`, `SocialWelfare`, `GisMap`, `HouseholdManagement`. Toàn bộ đã chuyển sang `border-slate-200/80`.
      + Đồng bộ `PageHeader` và dải 4 thẻ `StatCard` KPI trên `CitizenManagement` tương tự các phân hệ khác (cân đối font size `text-xl md:text-2xl font-black`, subtitle `text-xs md:text-sm`).
    - **Loại bỏ triệt để cửa sổ `alert()` của trình duyệt:**
      + Thay thế 100% bằng thông báo nổi Toast Notification hiện đại và Modal chuyên biệt (ví dụ xem tin tức `selectedNewsForModal` trong `CommunityEvents.tsx`).

15. **Nâng Cấp Bản Đồ Số GIS Toàn Diện (`GisMap.tsx` & `LeafletGisMap.tsx`):**
    - **Nút Ẩn / Mở rộng không gian hiển thị bản đồ:** Bổ sung nút **"Ẩn bảng"** tại thanh tiêu đề "Lớp Bản Đồ Số" và nút nổi **"Hiện Lớp Bản Đồ Số"** góc trên bên trái canvas. Khi ẩn, bản đồ tự động mở rộng 100% chiều ngang (full-width), kích hoạt `invalidateSize()` để tải mượt mà không khuyết gạch.
    - **Vẽ ranh giới mốc tự động theo đường đứt đoạn (Dashed Line):** Toàn bộ các mốc địa giới KP3 được kết nối tự động bằng nét đứt đoạn gạch-chấm chuẩn bản đồ địa chính (`dashArray: 12, 6, 3, 6`) rõ nét trên cả nền bản đồ giao thông và ảnh vệ tinh.
    - **Cơ chế Kéo thả di chuyển mốc khi Sửa & Khóa Cố định:**
      + Mặc định: Toàn bộ mốc số 1 đến N được **CỐ ĐỊNH** (`draggable: false`), người dùng click chỉ xem tọa độ, không bị xê dịch ngoài ý muốn.
      + Khi bấm **"Sửa mốc"**: Các mốc chuyển sang trạng thái tương tác kéo thả (`draggable: true`), có badge `🖐️ Kéo mốc X`, vòng sáng vàng animate pulse; người dùng có thể kéo mốc tới vị trí mới, đường đứt đoạn co giãn bám theo thời gian thực và tự động lưu tọa độ vào CSDL/localStorage.
      + Khi hoàn tất bấm **"Hoàn tất & Cố định mốc"** để khóa lại an toàn.

16. **Khắc Phục Luồng Đăng Ký / Phê Duyệt Cán Bộ & Hệ Thống Giữ Ấm Supabase 3 Lớp (`LoginAndRegister.tsx`, `SettingsAndPermissions.tsx`, `keepalive`):**
    - **RPC `register_pending_staff_profile` (`SECURITY DEFINER`):** Khắc phục triệt để lỗi RLS `42501` khi cán bộ mới đăng ký tài khoản mà Supabase bật xác thực email (chưa có session JWT). Hồ sơ cán bộ luôn được lưu vào `user_profiles` với `status = 'pending'`.
    - **Phê duyệt & Thu hồi 1-chạm:** Củng cố `SettingsAndPermissions.tsx` với `.select().single()` để xác nhận trạng thái cập nhật thật trên PostgreSQL.
    - **Keep-Alive 3 lớp chống ngủ đông Supabase Free Tier:** Client heartbeat (`src/utils/keepalive.ts`), Vercel Serverless Cron (`api/keepalive.ts` + `vercel.json`), và GitHub Actions định kỳ (`.github/workflows/supabase-keepalive.yml`).

17. **Đồng Bộ Chức Danh Trưởng / Phó Chi Hội Toàn Hệ Thống & Quy Tắc Tôn Ti Bí Thư Chi Bộ Đứng Đầu (`leadershipSync.ts` & `PartyBranch.tsx`):**
    - **Đổi Trưởng / Phó 1-chạm trong `PartyBranch.tsx`:** Cho phép chọn trực tiếp Trưởng hoặc nhiều Phó từ danh sách hội viên/đảng viên hoặc tra cứu từ 11.632 cư dân KP3; tự động giáng cấp chức danh cũ xuống Ủy viên/Hội viên, sắp xếp thứ bậc `Trưởng -> Phó -> Chi ủy viên -> Hội viên`.
    - **Đồng bộ xuyên suốt toàn App (`reconcilePortalLeadershipWithAssociations` & `enforcePartySecretaryFirst`):** Khi đổi nhân sự tại `Quản lý Chi hội`, toàn bộ Trang chủ Cổng Cư dân (`/`), Giới thiệu Khu phố (`/about`), Danh bạ Lãnh đạo (`/leadership`), Dashboard Cán bộ, Biểu mẫu hành chính, Phản ánh 1022, An sinh và Lịch & Nhiệm vụ tự động cập nhật tức thì; luôn bảo đảm **Bí thư Chi bộ đứng vị trí số 1** và tự động đồng bộ tên hiển thị của tài khoản Admin tối cao.

18. **Liên Kết Đa Thực Thể Cùng Địa Chỉ (`Co-Location`), Ghép Nhiều Thửa Đất (`02+ Sổ Đỏ`) & AI OCR Giấy Phép Kinh Doanh (`addressCoLocationUtils.ts`, `landParcelsUtils.ts`, `businessLicenseOcr.ts`, `SharedAddressHubCard.tsx`):**
    - **Liên kết cùng địa chỉ (`SharedAddressHubCard`):** Chuẩn hóa khóa số nhà/đường (`normalizeAddressKey`) để liên kết hai chiều giữa **Hộ khẩu ↔ Cơ sở kinh doanh ↔ Doanh nghiệp** đóng tại cùng địa chỉ, kèm nút chuyển đổi nhanh 1-chạm tạo Cơ sở KD / Doanh nghiệp từ Hộ gia đình.
    - **Quản lý nhiều thửa đất / nhiều Sổ đỏ ghép lại (`landParcels`):** Cho phép 01 cơ sở kinh doanh hoặc doanh nghiệp khai báo 02+ thửa đất / Sổ đỏ liền kề, tự động cộng tổng diện tích đất (`totalLandArea`), ghép chuỗi Tờ/Thửa hiển thị và lưu tương thích ngược vào cột JSONB `documents` trên Supabase.
    - **AI Vision OCR Giấy phép kinh doanh & Sổ đỏ (`api/ocr-document.ts` + `businessLicenseOcr.ts`):** Upload ảnh chụp / PDF giấy phép kinh doanh để Gemini 2.5 Flash tự động bóc tách Mã số ĐKKD/MST, Tên cơ sở/doanh nghiệp, Người đại diện, Vốn điều lệ, Ngành nghề, Địa chỉ và điền thẳng vào biểu mẫu.

19. **Tổng Kiểm Tra Toàn Diện UI/UX & Đồng Bộ Dữ Liệu Qua Chrome DevTools MCP:**
    - Đã rà soát trực quan toàn bộ 18 route (Cổng Cư dân + Cổng Cán bộ) và khắc phục 10 điểm lỗi: sửa căn chỉnh dấu `*` bắt buộc trong `src/components/ui/Input.tsx`, điều hướng sau đăng nhập chuẩn về `/dashboard`, sửa thẻ tóm tắt lãnh đạo `PartyBranch.tsx` hiển thị trọn vẹn 100% họ tên & CCCD không bị cắt chữ (`...`), sửa `KHU PHỐ 03 / 14 KHU PHỐ`, tạo avatar chữ cái đầu cho cư dân chưa có ảnh tải lên, và khử nháy màn hình khi đồng bộ CSDL.

20. **AI OCR Đọc Lịch Công Tác Cấp Trên (Đảng Ủy / UBND Phường), Bảng Lịch Tuần Sáng/Chiều & Điều Chỉnh / Dời Lịch / Ủy Quyền Đi Thay (`wardScheduleAnalyzer.ts`, `WardScheduleOcrModal.tsx`, `WeeklyScheduleMatrix.tsx`, `RescheduleAndDelegateModal.tsx`):**
    - **AI OCR Đa tệp Lịch cấp trên (`docType: "ward_schedule"`):** Tải cùng lúc nhiều file PDF/Ảnh Lịch Đảng ủy Phường & Lịch HĐND-UBND Phường (hoặc dán văn bản / nạp bộ mẫu thực tế Phường An Phú `16/11 – 22/11/2026`); tự động ghép dòng xuyên trang PDF, **gộp trùng liên văn bản (`merged_ward`)** các hội nghị xuất hiện ở cả 2 lịch, phân loại 3 tầng (`mandatory_kp3`, `coordination_kp3`, `ward_reference`), ánh xạ chức danh mời sang cán bộ KP3 đương nhiệm, cảnh báo nếu văn bản ghi tên cá nhân khác CSDL Chi hội, và tự động tách **Nhiệm vụ chuẩn bị phát sinh** (`TaskItem`).
    - **Bảng Lịch Tuần Hành Chính (`WeeklyScheduleMatrix.tsx`):** Bố cục `Thứ Hai -> Chủ Nhật` chia 2 cột `Buổi Sáng` và `Buổi Chiều & Tối`, lọc nhanh theo nhân sự (`Tất cả`, `Bí thư`, `Trưởng KP`, `Mặt trận & Đoàn thể`), nút **Copy Lịch tuần gửi Zalo KP3**, cảnh báo tự động khi cán bộ bị **trùng khung giờ họp**, và ngăn thu gọn tra cứu Lịch Lãnh đạo Phường.
    - **Điều chỉnh, Dời lịch, Tạm hoãn & Cử đi thay (`RescheduleAndDelegateModal.tsx`):** Dời nhanh 1-chạm (`Sang buổi Chiều`, `Sáng ngày mai +1 ngày`, `Tuần sau +7 ngày` hoặc tùy chỉnh), kiểm tra xung đột giờ trực tiếp trước khi lưu, tự động dời hạn nhiệm vụ liên kết, cử cán bộ dự thay (`dự thay ...`), bảo toàn `originalDate` / `originalTime` và lưu trọn vẹn lịch sử kiểm toán `adjustmentLogs` lên Supabase (`work_schedules` qua sentinel `__KP3_SCHEDULE_META_V1__`).

21. **Chuẩn Hóa 01 Font Chữ Duy Nhất (`Inter`), Tinh Gọn Giao Diện Quản Lý Chi Hội & Đồng Bộ Liên Thông Chức Vụ 2 Chiều Với Lịch & Nhiệm Vụ (Phiên 17/11/2026):**
    - **Đồng bộ tuyệt đối 100% một Font chữ duy nhất (`Inter` + OpenType `tabular-nums`):**
      + Quy hoạch toàn bộ `--font-sans`, `--font-mono`, `--font-serif`, `--font-heading` trong `index.html` và `src/index.css` về `Inter`, giữ thẳng hàng con số CCCD/MST/tài chính bằng `font-variant-numeric: tabular-nums`.
    - **Tinh gọn ngôn ngữ giao diện & Khắc phục lỗi Runtime trên toàn bộ 34 routes:**
      + Loại bỏ các câu giải thích/chỉ dẫn hiển nhiên ở `PageHeader`, `StatCard`, `EmptyState` trên hơn 21 component để không gian tác nghiệp thoáng sạch.
      + Khắc phục lỗi `TypeError: at is not a constructor` tại `SettingsAndPermissions.tsx` (do `import { Map } from "lucide-react"` che khuất `new Map()`), và tự động làm sạch `refresh_token` hết hạn trước khi đăng nhập mới trong `supabaseSync.ts`.
    - **Tái cấu trúc gọn mạch Phân hệ Quản lý Chi hội (`PartyBranch.tsx` & `PartyAssociationFormPage.tsx`):**
      + Loại bỏ thanh phân loại khối tổ chức (`Cấp ủy & Chính quyền / An ninh & PCCC / Đoàn thể Nhân dân`) và cột `Khối trực thuộc`.
      + Hợp nhất khung thông tin Chi hội và khung Danh sách hội viên thành **01 Card duy nhất**: bỏ hộp xám lồng 3 tầng `THƯỜNG TRỰC BAN LÃNH ĐẠO ĐƯƠNG NHIỆM`, tóm tắt nhân sự chủ chốt trên 1 dòng gọn, tự động ghim thứ tự **Cấp Trưởng → Cấp Phó → Ủy viên/Hội viên** và đổi nhanh chức danh trực tiếp tại badge của từng hội viên.
      + Căn chỉnh chế độ `Bảng (Table view)` 7 cột vừa khít khung nhìn desktop (`1280px+`), không cuộn ngang và không đè khuất huy hiệu `Đã kiện toàn`.
    - **Đồng bộ liên thông chức vụ hai chiều `Quản lý Chi hội` ↔ `Lịch & Nhiệm vụ` (`src/utils/taskScheduleRoleSync.ts`):**
      + Tự động đối chiếu và cập nhật họ tên/SĐT Trưởng, Phó, Chi ủy viên trong `work_schedules`, `tasks` và `recurring_reminders` theo danh sách `associations` đương nhiệm ngay khi tải CSDL hoặc ngay khi đổi nhân sự tại `Quản lý Chi hội` (VD: `Trưởng Ban CTMT KP3` tự động đồng bộ `TRẦN THỊ MỸ DUNG`, `Phó Bí thư Chi bộ` đồng bộ `PHẠM NGỌC HÀ`, đồng thời bảo toàn nguyên vẹn các lịch có ủy quyền `dự thay`).
      + Trên Dashboard Cán bộ, khối `Lịch Công tác & Nhiệm vụ Trọng tâm` chỉ hiển thị nhiệm vụ thuộc Khu phố 3 (loại bỏ lịch tham khảo nội bộ Phường `ward_reference`); ẩn các nút chạy thử mẫu lịch trong `WardScheduleOcrModal.tsx`.
    - **Khắc phục lỗi đè chữ Dropdown `ReportSelect` & Chống lỗi Chunk sau Deploy:**
      + Sửa `src/components/reports/ReportSelect.tsx` sang luồng khối `space-y-1` + `shrink-0 h-auto whitespace-normal break-words` và tách 2 dòng `Họ tên / Chức vụ` cho dropdown `Người chủ trì` trong `ScheduleModals.tsx`.
      + Bổ sung `src/utils/chunkReloadRecovery.ts` (`lazyWithChunkRetry` + `vite:preloadError`) và cập nhật `vercel.json` / `server.ts` để khi có bản deploy mới trên Vercel, các tab đang mở tự động đồng bộ mượt mà không bao giờ gặp lỗi `Failed to fetch dynamically imported module` hay MIME `text/html`.

22. **Tổng Kiểm Toán Bảo Mật 10 Giai Đoạn, Tinh Chỉnh CSDL Lưu Trú & Hệ Sinh Thái Zalo OA Tự Động Nhắc Họp 60 Phút / Nhắc Tạm Trú 15 Ngày / Liên Kết Cán Bộ ↔ Cư Dân (Phiên 18/11/2026):**
    - **Tổng kiểm toán bảo mật, kiến trúc & hiệu năng (21 hạng mục P0–P3):**
      + Khóa xác thực Staff JWT nội dòng trên toàn bộ Serverless API nhạy cảm (`/api/ocr-document`, `/api/upload-storage`, `/api/staff-admin`, `/api/notifications`), thêm rate-limiting & whitelist MIME/kích thước tệp tải lên, sửa lỗi `UUID_REGEX` khi xóa bản ghi tạm, chống đơ DOM khi phân tích Excel >10.000 dòng, đạt điểm Lighthouse **Accessibility `100` / Best Practices `100` / SEO `100`** và kiểm thử `0` tràn ngang trên 5 khung hình (`360×800` → `1920×1080`).
    - **Chuẩn hóa hiển thị Nhà trọ, Lịch ủy quyền & Làm sạch 100% địa danh sau sáp nhập:**
      + Đánh dấu huy hiệu xanh **`Chủ hộ`** ngay trong bảng *Danh sách Người Lưu trú Thực tế* tại trang chi tiết Nhà trọ (`BusinessDetailPage.tsx` + cột *Vai trò trong hộ* khi xuất Excel) và ẩn hoàn toàn danh sách thẻ `TT-xxxx` trùng lặp bên dưới (`addressCoLocationUtils.ts`, `SharedAddressHubCard.tsx`).
      + Sửa đồng bộ cấp Phó thực tế của `Ban điều hành khu phố` (`Nguyễn Thu Phương`, `Trần Thị Kim Loan`, `Đinh Thị Thanh Phương`) khi cử dự thay lịch công tác, khử lỗi lặp ngoặc đơn `(Ban điều hành khu phố)`.
      + Quét sạch `100%` cụm từ `"TP. Thủ Đức"` trên toàn bộ mã nguồn và cập nhật trực tiếp `56` bản ghi địa chỉ cũ trong bảng `public.businesses` trên Supabase sang chuẩn `Khu phố 3, Phường An Phú, TP. Hồ Chí Minh`.
    - **Kết nối Zalo OA Chính thức (`oa_type: 4`) & 03 Luồng Thông báo Tự động (`api/notifications.ts`, `ZaloOaNotificationHub.tsx`, `WeeklyScheduleMatrix.tsx`):**
      + Liên kết OAuth v4 trực tiếp giữa ứng dụng `Điều hành Đô thị Số KP3 An Phú` (`App ID: 432932322782886593`, đã xác thực tên miền `https://bdhkp3.vercel.app/` qua thẻ meta trong `index.html`) với Zalo OA tích vàng **`Ban Điều Hành Khu Phố 3 phường An Phú`** (`OA ID: 3124278810088361494`, `zalo.me/bdhkhupho3`), đồng bộ đầy đủ **347/347 tài khoản đang Quan tâm OA** vào `portal_settings("zalo_oa_followers_v1", is_public = false)`.
      + **Luồng 1 — Tự động Nhắc Lịch Họp & Công Tác Cho Cán Bộ Trước 60 Phút:** Canh giờ chuẩn Việt Nam (`UTC+7`, hàm `parseMeetingStartVnInfo`), đối khớp tự động tên hiển thị Zalo cá nhân của cán bộ (`findMatchingZaloFollower`: khớp chính xác `Nghiêm Xuân Quỳnh` ↔ `Nghiêm Quỳnh`, `Nguyễn Trung Huy`, `Trần Thị Mỹ Dung` ↔ `My Dung`, `Nguyễn Thu Phương`, `Dương Tấn Đạt`...), tự động đẩy tin nhắc qua `POST /v2.0/oa/message` đúng **60 phút trước giờ họp** (chống gửi trùng bằng `dedupeKey`, kích hoạt tự động qua `/api/keepalive` + GitHub Actions mỗi 15 phút + watcher ngầm 5 phút trên trình duyệt Cán bộ, kèm nút **`Nhắc Zalo OA`** 1-chạm trên từng thẻ lịch tuần).
      + **Luồng 2 — Nhắc Gia hạn Tạm trú Tự động Trước 15 Ngày:** Tự động quét `9.120` cư dân tạm trú có hạn đăng ký `<= 15 ngày`, gom cụm theo từng **Chủ nhà trọ / Chủ hộ tạm trú**, đẩy thông báo qua Zalo OA / Email hoặc mở chat Zalo trực tiếp 1-chạm (`zalo.me/<SĐT>`).
      + **Luồng 3 — Phát Thông báo Khu phố đến Người dân:** Soạn 1 lần để gửi tới người dân quan tâm Zalo OA và đồng thời đăng ghim lên bảng *Thông báo* trên Cổng Cư dân (`community_news`), kèm mã QR Zalo OA tại `CitizenFooter.tsx`.
    - **Liên kết Tài khoản Cán bộ ↔ Hồ sơ Cư dân & Chi hội KP3 (`api/staff-admin.ts`, `LoginAndRegister.tsx`, `SettingsAndPermissions.tsx`):**
      + Hỗ trợ tra cứu & đối khớp 12 số CCCD (`verify_cadre_resident`) ngay trên màn hình *Đăng ký Cán bộ mới* để tự điền Họ tên, gợi ý Chức vụ; tự động gắn liên kết nhân khẩu thực tế cho các tài khoản hiện hữu (như Bí thư Chi bộ `Nghiêm Xuân Quỳnh` -> `NGHIÊM XUÂN QUỲNH`, `038*****2148`, `Bí thư Chi bộ • Chi bộ`) kèm nút *Xem hồ sơ cư dân ↗* và *Đổi CCCD liên kết*.
    - **Chuẩn hóa SQL Migration độc lập 100% (`supabase/migrations/2026111802_final_kp3_rls_audit_and_zalo.sql`):**
      + Tích hợp khép kín `is_approved_staff`, `is_admin`, `get_public_kp3_stats`, các cột mở rộng `residents.owner_name` & `user_profiles.resident_id`, và khối `DO $$ ... pg_constraint` khởi tạo an toàn `audit_logs` & `zalo_notification_logs` chống tuyệt đối lỗi `42883` và `42P16`.

23. **Đồng Bộ Hai Chiều Bài Viết & Hình Ảnh Zalo Official Account Vào Cổng Cư Dân Số (Phiên 20/11/2026):**
    - **Nghiệp vụ & Kiến trúc Backend (`api/notifications.ts`):**
      + Tích hợp trực tiếp Zalo OpenAPI v2.0 (`/v2.0/article/getslice` & `/v2.0/article/getdetail`) dành cho OA Cơ quan Nhà nước (`oa_type: 4`, OA ID: `3124278810088361494`, 347 followers).
      + Bổ sung 2 action chuyên biệt: `fetch_zalo_articles_preview` (đối soát bài viết trên Zalo OA với CSDL `public.community_news`) và `sync_zalo_articles` (kéo chi tiết bài viết, bóc tách ảnh và nạp trực tiếp vào Supabase).
      + Cơ chế phân trang chia đoạn (chunked pagination `limit <= 10` theo đúng quy chuẩn Zalo OpenAPI) và tự động làm mới OAuth v4 Token khi hết hạn (`-216` / `-220`).
      + Thuật toán tự động phân loại chuyên mục thông minh (`detectNewsCategory`) vào 5 nhóm tin chính của KP3 (`Hành chính`, `Phong trào`, `Y tế & Đời sống`, `An sinh xã hội`, `Thông báo khẩn`).
      + Bóc tách HTML nội dung Zalo (`parseZaloBodyToContent`), tự động chuẩn hóa thẻ đoạn văn và ảnh nhúng để render giao diện báo chí chính luận đẹp mắt.
    - **Giao diện Cán bộ & Cư dân (`ZaloArticleSyncModal.tsx`, `CommunityEvents.tsx`, `NewsNewspaperFeed.tsx`, `NewsDetailPage.tsx`, `CitizenModals.tsx`):**
      + Bổ sung nút **`Đồng bộ Zalo OA`** và modal điều khiển **`ZaloArticleSyncModal`** tại trang Quản lý Tin tức (`CommunityEvents.tsx`, `NewsNewspaperFeed.tsx`), Cổng Cư Dân (`CitizenNewsSection.tsx`) và Trung tâm Thông báo Zalo (`ZaloOaNotificationHub.tsx`).
      + Thanh chỉ số trực quan thời gian thực: Tổng số bài trên Zalo OA (85 bài), Đã có trên Web, Sẵn sàng nạp. Bộ lọc đa tab (`Chưa nạp`, `Tất cả`, `Đã có`), checkbox chọn bài, dropdown đổi chuyên mục trước khi nạp, nút *Đồng bộ nhanh 10 bài mới nhất*.
      + Cổng Cư dân hiển thị huy hiệu xác thực **`✓ Nguồn: Zalo OA Ban Điều Hành KP3`**, nút liên kết bài viết gốc **`[ 💬 Xem trên Zalo OA ]`** trên `officialaccount.me`, nội dung HTML phong phú kèm thư viện ảnh tư liệu sắc nét.
    - **Kiểm thử thực tế:**
      + Đã thực hiện kéo thành công 12 bài viết thực tế đang có trên Zalo OA Khu phố 3 vào CSDL Supabase PostgreSQL `public.community_news` và hiển thị hoàn hảo trên giao diện cả máy tính lẫn di động.

24. **Khắc Phục Triệt Để Nội Dung Infographic Bài Viết Zalo OA & Lightbox Phóng To Ảnh Công Văn (Phiên 20/11/2026):**
    - **Nội dung số hóa 100%:** Đối với các bài viết dạng scan infographic công văn (điển hình bài Thông báo Lễ 02/9 ID `e196b89c...` từ Zalo Article `5db66f5f...`), đã số hóa nguyên văn toàn bộ 5 điều khoản chữ (lịch nghỉ 4 ngày, hoán đổi làm bù thứ Bảy 22/8, quy định treo cờ, trách nhiệm cán bộ, vệ sinh môi trường) vào CSDL Supabase PostgreSQL.
    - **Nâng cấp `NewsDetailPage.tsx`:** Thay thế khung cắt xén ảnh cũ bằng container chống vỡ ảnh (`bg-slate-900 object-contain`) và tích hợp tính năng **Click để mở Lightbox phóng to ảnh scan công văn full màn hình độ nét cao**, thuận tiện cho người cao tuổi và cư dân đọc rõ từng con dấu và chữ ký.

25. **Khắc Phục Triệt Để Nhắc Lịch Họp Zalo OA Cho Phó Bí Thư Phạm Ngọc Hà & Cơ Chế Ghép Nối Cadre Zalo (Phiên 20/11/2026):**
    - **Nguyên nhân gốc & Phát hiện tài khoản Zalo:**
      + Đồng chí Phó Bí thư Chi bộ KP3 Phạm Ngọc Hà (SĐT `0908579479`, email `phamsoha033@icloud.com`) sử dụng nickname Zalo cá nhân là **`Sò`** (Zalo User ID: **`2742691693568338378`**, avatar hoạt hình áo trắng cổ đỏ). Do chính sách Zalo không công khai SĐT của follower trong API danh sách theo dõi, thuật toán đoán tên tự động trước đây không thể đối khớp với tên khai sinh.
    - **Giải pháp căn cơ & Lưu trữ vĩnh viễn:**
      + Lưu trữ bảng ánh xạ cán bộ `cadre_zalo_mapping_v1` trong `portal_settings` Supabase PostgreSQL.
      + Tích hợp **Built-in Cadre Intelligence** trong cả [api/notifications.ts](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/api/notifications.ts) và [api/keepalive.ts](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/api/keepalive.ts): tự động nhận diện "Phạm Ngọc Hà", SĐT "0908579479", email "phamsoha033" chính là Zalo `"Sò"` (`2742691693568338378`).
      + **Kiểm thử gửi tin nhắn thực tế:** Đã gọi API Zalo OA v2.0 gửi tin nhắn thử nghiệm thành công trực tiếp tới Zalo đồng chí Phạm Ngọc Hà (`message_id: 6e8503fdd4af80f6d9b9`, HTTP 200 OK).
    - **Giao diện Quản lý Chi hội & Modal Ghép Zalo:**
      + [PartyBranch.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/PartyBranch.tsx) tự động nạp danh bạ Zalo khi khởi động; Thẻ cán bộ Phó Bí thư Phạm Ngọc Hà hiển thị huy hiệu xanh nổi bật: **`💬 Zalo: Sò`** (ở cả Table View và Card View).
      + [CadreZaloLinkModal.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/settings/CadreZaloLinkModal.tsx) tự động chọn sẵn tài khoản "Sò" ở vị trí số 1 gợi ý, hỗ trợ gõ SĐT `0908579479` vào ô tìm kiếm là hiện ngay tài khoản "Sò" kèm nút "Gửi tin thử nghiệm".

26. **Kiểm Toán Toàn Diện Hệ Thống (Master Audit) & Triển Khai Vercel Production (Phiên 20/11/2026):**
    - Hoàn tất toàn diện 12 giai đoạn kiểm toán theo chuẩn Google Agent Skills (`ui-ux-design-system`, `gov-design-system`, `tailwind-component-crafting`, `public-admin-data-management`, `gemini-api`, `google-cloud-recipe-auth`).
    - Xuất bản bộ 10 hồ sơ kiểm toán: `PROJECT_AUDIT_REPORT.md`, `PROJECT_AUDIT_PROGRESS.md`, `GOOGLE_SKILLS_MATRIX.md`, `PROJECT_ARCHITECTURE.md`, `BUSINESS_LOGIC_AUDIT.md`, `UI_UX_AUDIT.md`, `SECURITY_AUDIT.md`, `TEST_REPORT.md`, `BUG_TRACKER.md`, `DEPLOYMENT_REPORT.md`.
    - Kiểm thử Chrome DevTools MCP trực tiếp: 0 lỗi Console, 100% API HTTP 200 OK, responsive đa kích thước.

27. **Cài Đặt & Tích Hợp Kho Kỹ Năng Awesome Claude Skills & Anthropic Official Skills (Phiên 20/11/2026):**
    - Đã cài đặt hoàn tất repository `https://github.com/travisvn/awesome-claude-skills` cùng toàn bộ 19 kỹ năng chính thức từ `https://github.com/anthropics/skills` và các kỹ năng bảo mật hàng đầu từ `trailofbits/skills` vào `C:\Users\Admin\.gemini\config\skills\`.
    - **Danh mục kỹ năng xử lý tài liệu văn phòng & báo cáo:**
      + `docx`: Tạo, chỉnh sửa, định dạng và bóc tách tài liệu Word (.docx), hỗ trợ Track Changes và Comments.
      + `pdf`: Bộ công cụ trích xuất văn bản, bảng biểu, ghép/tách PDF và xử lý biểu mẫu.
      + `pptx`: Tạo và biên tập slide thuyết trình PowerPoint (.pptx) chuyên nghiệp.
      + `xlsx`: Tạo, tính toán công thức, định dạng và biểu đồ hóa bảng tính Excel (.xlsx).
    - **Danh mục kỹ năng thiết kế & giao diện:**
      + `frontend-design`: Chuẩn mực thiết kế giao diện độc đáo cho React & Tailwind CSS, loại bỏ hoàn toàn "AI slop".
      + `web-artifacts-builder`: Xây dựng web artifact HTML/React phức tạp với shadcn/ui và Tailwind.
      + `theme-factory`: Thiết kế bảng màu và theme hệ thống chuyên biệt.
      + `canvas-design` & `algorithmic-art`: Thiết kế đồ họa và nghệ thuật số generative qua p5.js.
    - **Danh mục kỹ năng phát triển, kiểm thử & bảo mật:**
      + `mcp-builder`: Hướng dẫn kiến trúc và triển khai Model Context Protocol (MCP) server.
      + `webapp-testing`: Kiểm thử tự động giao diện ứng dụng web qua Playwright.
      + `codeql`, `semgrep`, `sarif-parsing`: Phân tích tĩnh mã nguồn, rà soát lỗ hổng bảo mật.
      + `differential-review`, `vulnerability-triage-brocards`: Đánh giá bảo mật PR và phân loại rủi ro.
    - **Kỹ năng điều phối & siêu danh mục:**
      + `awesome-claude-skills`: Meta-skill hướng dẫn kiến trúc Progressive Disclosure, bảng so sánh Skills vs MCP vs System Prompts và thư viện tài nguyên mở rộng.

28. **Phân Tích & Ứng Dụng Toàn Diện Hệ Thống Kỹ Năng Hoàn Thiện Ứng Dụng (Phiên 20/11/2026):**
    - **Ứng dụng Kỹ năng Document Skills (`docx` & `public-admin-data-management`):**
      + Xây dựng module xuất văn bản Word (`.docx`) chuẩn quốc gia theo **Nghị định 30/2020/NĐ-CP** về công tác văn thư ([src/utils/docxExport.ts](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/utils/docxExport.ts)).
      + Định dạng chuẩn khổ giấy A4, font Times New Roman 13pt/14pt, thụt đầu dòng 1.27cm, giãn dòng 1.15-1.25, bảng 2 cột cơ quan ban hành - Quốc hiệu tiêu ngữ và khối chữ ký 2 bên chuẩn hành chính ("NGƯỜI KÊ KHAI / LÀM ĐƠN" và "TM. BAN ĐIỀU HÀNH KHU PHỐ 3 - Trưởng Ban điều hành Nguyễn Trung Huy").
      + Tích hợp trực tiếp nút xuất file `.docx` vào phân hệ Biểu mẫu hành chính Cán bộ ([src/components/AdministrativeForms.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/AdministrativeForms.tsx)) và Cổng Dịch vụ Cư dân ([src/components/CitizenLandingPage.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/CitizenLandingPage.tsx)), thay thế hoàn toàn định dạng HTML `.doc` cũ dễ gây cảnh báo không khớp định dạng của Microsoft Word.
    - **Ứng dụng Kỹ năng Frontend Design & Code Quality (`frontend-design`, `gov-design-system`, `tailwind-component-crafting`):**
      + Khắc phục triệt để vi phạm Rules of Hooks (gọi `useMemo` sau lệnh early return) trong `CitizenNewsSection.tsx`.
      + Chuẩn hóa vòng đời state React 19 theo nguyên tắc "Adjusting state during render" thay vì `useEffect` gây cascading render tại [src/components/landing/CitizenNewsSection.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/landing/CitizenNewsSection.tsx), [src/components/settings/CadreZaloLinkModal.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/settings/CadreZaloLinkModal.tsx), [src/components/news/ZaloArticleSyncModal.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/news/ZaloArticleSyncModal.tsx), và [src/components/landing/CitizenModals.tsx](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/components/landing/CitizenModals.tsx).
      + Di chuyển hằng số `DEFAULT_ROLES` ra ngoài component scope và tái sắp xếp thứ tự hooks trong `PartyBranch.tsx` (7.400+ dòng) đạt 0 lỗi ESLint.
    - **Ứng dụng Kỹ năng An toàn & Phân tích Tĩnh (`semgrep`, `codeql`, `differential-review`):**
      + Sửa triệt để các lỗi character class range out of order trong regex phân tích địa chỉ/nhà trọ ([api/notifications.ts](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/api/notifications.ts)).
      + Chuẩn hóa Type definitions cho `AssociationMember` và `CadreZaloMappingEntry` trong [src/types.ts](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/types.ts).
      + Trình biên dịch TypeScript `npx tsc --noEmit` đạt tuyệt đối `0 errors`.
    - **Ứng dụng Kỹ năng Kiểm thử Tự động (`webapp-testing`):**
      + Bổ sung bộ kiểm thử tự động [src/utils/__tests__/docxExport.test.ts](file:///c:/Users/Admin/.gemini/antigravity/scratch/khuphothongminh/src/utils/__tests__/docxExport.test.ts).
      + Tổng bộ test suite Vitest nâng lên **27/27 test files (`127/127 tests`) PASS 100%**.
      + Kiểm thử trực tiếp qua Google Chrome DevTools MCP trên `http://localhost:3000`: 0 lỗi Console, render đồ họa và giao diện biểu mẫu chuẩn xác.

  29. **Khởi Tạo Zalo Mini App & Nâng Cấp Toàn Diện Bộ Máy Tự Động Quét Khớp Zalo OA Cán Bộ (Phiên 20/11/2026):**
      - **Khởi tạo Zalo Mini App thành công:**
        + Tên Mini App: `Khu Phố 3 - Phường An Phú` (liên kết Zalo App ID `432932322782886593`).
        + Mini App ID chính thức: **`30172911027069915`**.
        + Đường dẫn quản trị: `https://miniapp.zaloplatforms.com/miniapp/30172911027069915/statistic/overview`.
      - **Nâng cấp Cơ chế Khớp Zalo OA Cán bộ & Nhắc Lịch Tự động:**
        + **Khớp chính xác Phó Bí thư Phạm Ngọc Hà (SĐT: `0908579479`):** Đối soát trên Zalo OA Manager ra tài khoản `"Sò"` (`2742691693568338378`). Đã liên kết và kiểm thử gửi nhắc lịch họp thành công (`msg_id:81014911954fc1169859`).
        + **Tự động nhận diện chức danh (Role Synonyms):** Trong cả `api/keepalive.ts` và `api/notifications.ts`, khi lịch công tác đề cập "Khu Đội", "Chỉ huy quân sự", "Phó Bí thư", "Chi ủy", hệ thống tự động suy luận và gửi nhắc lịch đến đồng chí Phạm Ngọc Hà (`Sò`) ngay cả khi nội dung lịch không ghi rõ họ tên cá nhân.
        + **Tính năng "Quét & Khớp Tự Động (1-Chạm)":** Bổ sung nút 1-chạm tại `ZaloOaNotificationHub.tsx` (`action: "auto_match_all_cadres"`). Kết quả: Nâng tỷ lệ khớp từ 6/36 lên **18/36 cán bộ** ngay lập tức, tự động đối soát theo SĐT và Họ tên với 347 followers Zalo OA.
        + **Tự động khớp khi đăng ký / duyệt cán bộ mới:** Trong `api/staff-admin.ts`, khi tài khoản cán bộ được duyệt (`action: "approve"`), hệ thống tự động đối chiếu SĐT / Họ tên với 347 followers và ghi nhận vào `cadre_zalo_mapping_v1`.
        + **Tự động khớp khi thêm hội viên mới:** Trong `PartyBranch.tsx`, hàm `handleAddMemberFromResidents` tự động kiểm tra và kế thừa `zaloUserId` / `zaloDisplayName` từ danh bạ Zalo.
        + **Tra cứu SĐT trong Modal:** `CadreZaloLinkModal.tsx` hỗ trợ gõ trực tiếp SĐT (`0908579479`) vào ô tìm kiếm để hiển thị ngay tài khoản tương ứng (`Sò`), đồng thời cho phép cập nhật SĐT cán bộ trực tiếp trong modal.

  30. **Đóng Gói & Phát Hành Zalo Mini App Version 3 (Phiên 20/11/2026):**
      - **Đóng gói & Triển khai Version 3 lên Zalo Developer Portal:**
        + Sử dụng `zmp-cli` deploy trực tiếp vào App ID `30172911027069915`.
        + Phiên bản **Version 3** (`0.133 MB`) đã ở trạng thái **Testing** sẵn sàng gửi duyệt (`Submit for review`).
        + Ghi chú phiên bản: *"Phien ban v3 hoan thien ket noi dong bo CSDL thoi gian thuc va bao 1022"*.
      - **Nâng cấp Đột phá tính năng Zalo Mini App:**
        + **Đồng bộ Tin tức thời gian thực:** Đã sửa truy vấn `created_at` (thay vì `published_at`), tải trọn vẹn toàn bộ 17 bài viết và thông báo chính thức từ CSDL Supabase Khu phố 3.
        + **Tra cứu Cư trú an toàn (PII Shield):** Cư dân nhập số CCCD 12 số, gọi qua endpoint bảo mật `https://bdhkp3.vercel.app/api/notifications` (`action: "mini_app_lookup_resident"`), tự động khử trùng thông tin cá nhân (ẩn họ tên, ẩn số CCCD), tính toán số ngày còn lại và hiển thị cảnh báo hạn tạm trú 30 ngày.
        + **Phản ánh 1022 từ Zalo Mini App:** Gọi qua endpoint `api/notifications` (`action: "mini_app_submit_report"`), ghi trực tiếp vào bảng `field_reports` của CSDL Supabase với trạng thái "Đang xử lý".
        + **Biểu mẫu Cư trú:** Kết nối kho 11 biểu mẫu hành chính trực tuyến tại Cổng Cư dân số KP3 (`https://bdhkp3.vercel.app/forms`).
      - **Đồng bộ Cổng Web & Mã QR:**
        + Trích xuất mã QR Version 3 trực tiếp từ Zalo Developer Portal vào `public/zalo_mini_app_v3_qr_code.png`.
        + Cập nhật Banner Hero trên `CitizenLandingPage.tsx` hiển thị mã QR mới nhất và nhãn "Phiên bản v3".
        + Triển khai production Vercel thành công (`https://bdhkp3.vercel.app`), xác thực 100% cả 2 API trên môi trường live.

  31. **Nâng Cấp Zalo Mini App Version 4 → Version 6: Cổng Điều Hành Cán Bộ Thu Gọn Trên Zalo (Phiên 20–21/11/2026):**
      - **Khắc phục triệt để giao diện & CORS trên Zalo WebView (`https://h5.zdn.vn`):**
        + Cài đặt `@tailwindcss/vite` + `tailwindcss` v4 cho `zalo-mini-app/`, bổ sung cấu hình CORS + xử lý preflight `OPTIONS` trên toàn bộ Serverless API (`api/*.ts`), làm sạch & hiển thị mượt bài viết HTML giàu hình ảnh từ Zalo OA tại `zalo-mini-app/src/components/NewsDetailModal.tsx`.
      - **Bổ sung phân hệ Cán bộ (`zalo-mini-app/src/components/StaffTab.tsx` — Version 6 Testing trên Zalo Developer Portal `30172911027069915`):**
        + Đăng nhập tài khoản Cán bộ KP3 trực tiếp qua Supabase Auth + Khôi phục mật khẩu qua Email.
        + Bảng điều khiển nhanh cho Cán bộ ngay trong Zalo: Xem KPI thực tế, duyệt xử lý phản ánh 1022, đăng nhanh Thông báo Khu phố lên Cổng Cư dân, và bộ lọc danh sách nhân khẩu **Sắp hết hạn tạm trú ≤ 30 ngày**.

  32. **Đóng Gói Ứng Dụng Android Bản Đầy Đủ (`vn.tphcm.anphu.khupho3`) Ký Số Chuẩn V1+V2+V3 Tương Thích Samsung Galaxy S25 / Android 16 (Phiên 21/11/2026):**
      - **Kiến trúc Capacitor Full Portal (`capacitor.config.ts`, `android/`, `src/utils/nativeRuntime.ts`):**
        + Đóng gói trọn vẹn **Cổng Dịch vụ Cư dân + 14 Phân hệ Quản trị Cán bộ** trong gói `vn.tphcm.anphu.khupho3` (`minSdk: 24`, `compileSdk: 36`, `targetSdk: 36`).
        + Tự động định tuyến mọi lời gọi `/api/*` sang `https://bdhkp3.vercel.app/api/*` khi chạy trên Android Native, tích hợp điều hướng phím cứng Back của Android và thanh trạng thái `#0f172a`.
      - **Ký số mật mã APK Signature Scheme V1 + V2 + V3 & Biểu tượng Chính thức (`v1.1.1` – `versionCode: 3`):**
        + Pin chuẩn `Gradle 8.14.3` tương thích `com.android.tools.build:gradle:8.13.0` tại `android/gradle/wrapper/gradle-wrapper.properties`.
        + Sinh khóa `.jks` nội bộ trong bước CI (`android/app/kp3-release.jks`), bật đồng thời `enableV1Signing true`, `enableV2Signing true`, `enableV3Signing true` và kiểm định bắt buộc bằng `apksigner verify --verbose --print-certs` (`APK Sig Block 42` + `META-INF/CERT.RSA`) tại `.github/workflows/build-android.yml` -> Tương thích 100% với **Samsung Galaxy S25 (One UI 7 / Android 15–16)** *(lưu ý người dùng tạm tắt "Trình tự động chặn / Auto Blocker" trong Cài đặt Samsung khi cài APK ngoài CH Play)*.
        + Cập nhật bộ Adaptive Icon Vector (`drawable/ic_launcher_foreground.xml`, `mipmap-anydpi-v26/ic_launcher.xml`) và bộ PNG chuẩn biểu trưng Khu phố 3 (khiên trắng – sao đỏ – nền `#DC2626`) thay thế hoàn toàn icon chữ X mặc định của Capacitor.
        + Nút tải trực tiếp trên Cổng Cư dân (`CitizenLandingPage.tsx`): `https://github.com/nghiemquynh0210/khuphothongminh/releases/latest/download/KP3-AnPhu.apk` (đang trỏ tới Release `android-v1.1.1`).

  33. **Vận Hành Tự Động 24/7 Trên Supabase `pg_cron` & Khắc Phục Triệt Để Nhắc Lịch Họp Zalo OA Trước 60 Phút + Báo Cáo Định Kỳ (Phiên 21/11/2026):**
      - **Hạ tầng Lập lịch Tự động Độc lập Máy cá nhân (`pg_cron` + `pg_net` trên Supabase `wjdgaobhipkgzveidtra`):**
        + Đã kích hoạt job `kp3-auto-zalo-reminders-15m` (`jobid = 1`, chu kỳ `*/15 23,0-14 * * *` = mỗi 15 phút từ `06:00` đến `21:45` giờ Việt Nam) gọi trực tiếp `https://bdhkp3.vercel.app/api/keepalive?check_meetings=1`.
      - **Khắc phục triệt để 4 lỗi ngầm trong `api/keepalive.ts` & `api/notifications.ts`:**
        + **Tách khóa chống gửi trùng (`dedupeKey`):** Lệnh gửi thông báo lịch tuần thủ công lưu khóa `mtg_manual:...`, tách biệt hoàn toàn với khóa tự động trước giờ họp `mtg_auto_60m:<id>:<date>:<cadreKey>` (và tương thích ngược khóa `:auto`), đảm bảo gửi lịch tuần từ hôm trước **không bao giờ chặn** tin tự động nhắc trước 60 phút vào sáng hôm sau. Chỉ ghi nhận chống trùng khi Zalo OA xác nhận `status === "sent"`.
        + **Miễn trừ bộ đệm 60 giây cho `isScheduledProbe` (`?check_meetings=1`):** Lời gọi từ `pg_cron` hoặc GitHub Actions luôn đi thẳng vào hàm quét lịch họp & báo cáo định kỳ, không bao giờ bị trả về `throttled: true`.
        + **Chuẩn hóa đối khớp cán bộ (`matchCadreTargets`):** Đọc đúng trường `assignedOfficers[].name` (cùng `.personName` / `.fullName`), quét toàn bộ 19+ cán bộ trong `cadre_zalo_mapping_v1`, danh sách thành viên Chi hội (`associations_records`) và `BUILTIN_CADRE_ZALO_ALIASES`; mở rộng biên cửa sổ nhắc lên `65 phút` để bắt dính mốc tròn giờ (`06:00` cho lịch `07:00`); tự động kiểm tra & làm mới Zalo OAuth v4 Access Token trước cả 2 luồng Nhắc lịch họp và Nhắc báo cáo định kỳ (`checkAndDispatchDueRecurringReports`).
        + **Xác thực vận hành thực tế:** Đúng `06:15:05` ngày `21/11/2026`, `pg_cron` đã tự động phát hành thành công bản ghi `NTF-AUTO60M-1795216505301` (`status: "sent"`) qua Zalo OA nhắc lịch họp `07:00` tới Bí thư Nghiêm Xuân Quỳnh, Trưởng BĐH Nguyễn Trung Huy và Trưởng Ban CTMT Trần Thị Mỹ Dung, đồng thời khóa chống gửi lặp chính xác ở các nhịp tiếp theo.

  34. **Tinh Chỉnh UI/UX Phân Hệ Quản Lý Chi Hội — Khắc Phục Tràn Viền Thẻ Hội Viên (`PartyBranch.tsx`, Phiên 21/11/2026):**
      - Tái cấu trúc Header thẻ hội viên chế độ xem **Thẻ (`Card View`)**: đưa **Ảnh đại diện + Họ tên & CCCD** nằm gọn 2 dòng cân đối ở hàng trên; tách **Nút đổi nhanh Chức danh + Huy hiệu Ghép Zalo** xuống hàng riêng rộng toàn khung thẻ (`w-full min-w-0`, kèm `max-w-full` và `truncate`) để các chức danh dài (*"Đảng viên sinh hoạt nơi cư trú"*, *"Ủy viên Ban Công tác Mặt trận"*) hiển thị trọn vẹn, không bao giờ tràn viền phải của thẻ.
      - Điều chỉnh lưới thẻ sang `grid-cols-1 lg:grid-cols-2 min-[1800px]:grid-cols-3`, nâng `z-30` cho thẻ đang mở menu đổi nhanh chức danh, mở rộng vùng đệm bảng khi danh sách chỉ có 1–2 thành viên và đồng bộ chiều cao `h-9 (36px)` đồng nhất trên toàn bộ thanh công cụ tìm lọc (`PartyBranch.tsx`).

  35. **Tích Hợp Trợ Lý AI Soạn Thông Báo Chính Thức & Chọn Đa Đối Tượng Thụ Hưởng (`CitizenBroadcastTab.tsx` & `api/notifications.ts`, Phiên 21/11/2026):**
      - Tích hợp tab **Phát thông báo Dân cư** ngay trong phân hệ **Lịch & Nhiệm vụ** (`TaskAndSchedule.tsx`, `TasksPage.tsx`), cho phép cán bộ nhập ý thô để **Gemini 2.5 Flash** tự động biên tập thành văn phong hành chính chuẩn mực của Ban Điều hành Khu phố 3 (tự chèn đầu mối liên hệ thực tế của Bí thư Chi bộ / Trưởng BĐH / Trưởng Ban CTMT / CSKV).
      - Bổ sung bộ chọn **Đa đối tượng nhận thông báo** (Toàn dân, Đảng viên Chi bộ, Chi hội Cựu chiến binh / Phụ nữ / Người cao tuổi / Chữ thập đỏ, Hộ nghèo – An sinh xã hội, Chủ cơ sở nhà trọ, Hộ tạm trú, Tuyến đường KP3), tự động đối khớp danh sách nhân khẩu + Zalo User ID đã liên kết để gửi đích danh qua Zalo OA v2 (`24/7`), xuất danh sách nhận thông báo `.xlsx` (đã ghi vết `audit_logs`) và ghim đồng thời lên Cổng Cư dân.

  36. **Đồng Bộ Hóa Toàn Bộ 09 Trang Chi Tiết Hồ Sơ Về Chuẩn Thiết Kế Tối Giản Cơ Sở Kinh Doanh (`RecordDetailShell.tsx`, Phiên 21/11/2026):**
      - Xây dựng khung chuẩn dùng chung `src/components/common/RecordDetailShell.tsx` (`max-w-6xl`, nền trắng viền mảnh `border-slate-200/90 shadow-2xs`, thanh điều hướng trước/sau `Prev/Next` nhẹ nhàng) và chuẩn hóa `DetailRow.tsx` (`compact = true` mặc định, font `Inter`, cỡ chữ chuẩn `text-xs / 12px`, tiêu đề hồ sơ `text-lg sm:text-xl font-extrabold`, tiêu đề phân mục `text-xs font-bold uppercase tracking-wider`).
      - Áp dụng đồng bộ 100% trên toàn bộ 09 trang chi tiết: `BusinessDetailPage.tsx`, `EnterpriseDetailPage.tsx`, `ResidentDetailPage.tsx`, `HouseholdDetailPage.tsx`, `PartyMemberDetailPage.tsx`, `ReportDetailPage.tsx`, `TaskDetailPage.tsx`, `NewsDetailPage.tsx`, `EventDetailPage.tsx`.

  37. **Tinh Gọn & Chuẩn Hóa Giao Diện Tối Giản Toàn Ứng Dụng (`12px` • `h-9 / 36px` • Segmented Sub-Tabs, Phiên 21/11/2026):**
      - Đồng bộ các UI primitives nền tảng (`Button.tsx`, `Input.tsx`, `ReportSelect.tsx`, `PageHeader.tsx`, `Modal.tsx`) về chiều cao `h-9` (`36px`), cỡ chữ `text-xs` (`12px`), bo góc `rounded-lg`, viền `border-slate-200` sắc nét.
      - Tái thiết kế đồng bộ **Lịch & Nhiệm vụ** (`TaskAndSchedule.tsx`, `WeeklyScheduleMatrix.tsx`, `ReminderSection.tsx`), **Tin tức & Sự kiện** (`CommunityEvents.tsx`, `NewsNewspaperFeed.tsx`), **Cấu hình & Phân quyền** (`SettingsAndPermissions.tsx`, tách `ZaloOaNotificationHub.tsx` thành 4 Segmented Sub-Tabs + bảng danh bạ 36 cán bộ 1 dòng gọn nhẹ, tinh gọn `PortalConfigSettings.tsx`), **An sinh Xã hội** (`SocialWelfare.tsx` — gộp thanh tìm lọc & xuất ký nhận vào 1 khung phẳng, chuyển sang bảng màu trung tính `slate` / `emerald`, lược bỏ các banner tiêu đề lặp) và rà soát đồng nhất toàn bộ các phân hệ còn lại.

  38. **Sản Xuất Bộ Video Giới Thiệu Toàn Diện Hệ Thống Khu Phố 3 Theo Nghị Quyết 57-NQ/TW (`video-promo/`, Phiên 21–22/11/2026):**
      - Xây dựng pipeline Motion Graphics độc lập tại thư mục cục bộ `video-promo/` (GSAP + Playwright Chrome Headless chụp trực tiếp 12 màn hình thực tế từ `bdhkp3.vercel.app` + Microsoft Neural TTS tiếng Việt `vi-VN-HoaiMyNeural` chuẩn `48kHz Stereo AAC-LC 192kbps`, âm lượng `-13.4 dB` + nhạc nền và phụ đề đồng bộ):
        + `video-promo/KP3-AnPhu-Promo-9x16.mp4` (`1080×1920`, `65.62s`, `29.24 MB` — bản ngắn 60s viral).
        + `video-promo/KP3-AnPhu-Full-9x16.mp4` (`1080×1920`, `139.12s`, `61.38 MB` — bản dọc 10 phân cảnh đầy đủ tính năng cho TikTok / Reels / Zalo Video).
        + `video-promo/KP3-AnPhu-Full-16x9.mp4` (`1920×1080`, `139.12s`, `70.09 MB` — bản ngang Keynote 2 cột trình chiếu Hội nghị / Báo cáo Đảng ủy – UBND Phường / YouTube).

  39. **Tích Hợp Hộp Thư Chat & Trả Lời Trực Tiếp Zalo OA 2 Chiều Trong Phân Hệ Phản Ánh Hiện Trường — Giai Đoạn 1 & 2 (`ZaloOaChatInbox.tsx`, `FieldReflections.tsx`, `ReportsPage.tsx`, `ReportDetailPage.tsx`, `api/notifications.ts`, Phiên 22/11/2026):**
      - **Lưu trữ phân mảnh O(1) bảo mật RLS (`is_public = false` trên `portal_settings`):**
        + Chỉ mục hội thoại `zalo_oa_chat_inbox_index_v1` + luồng tin nhắn tách riêng từng cư dân `zalo_oa_chat_thread_<zaloUserId>`, tự động tải và lưu bền vững hình ảnh cư dân gửi qua Zalo vào Supabase Storage (`field-reports/zalo-chat/...`) để không bao giờ bị hết hạn link ảnh Zalo.
      - **Cơ chế Đồng bộ Trực tiếp từ Trình duyệt Cán bộ tại Việt Nam (Vượt giới hạn chặn IP nước ngoài của Zalo OpenAPI):**
        + Máy chủ Serverless Vercel chạy tại Mỹ (`iad1`) bị Zalo chặn đọc `listrecentchat` / `conversation` (`error -232: IP address not inside Vietnam`). Hệ thống đã tích hợp luồng đồng bộ lai thông minh (`get_zalo_browser_sync_token` + gọi CORS chính thức `https://openapi.zalo.me/v2.0/oa/listrecentchat` & `/v2.0/oa/conversation` trực tiếp từ trình duyệt Cán bộ có IP Việt Nam + lưu bền vững qua `ingest_zalo_browser_messages`), đồng thời nhận tin nhắn thời gian thực qua Webhook `POST https://bdhkp3.vercel.app/api/notifications`.
      - **Chu trình Điều hành Khép kín Giai đoạn 1 & 2:**
        + **Sub-Tab `Hộp thư Zalo OA`** ngay trong `FieldReflections.tsx`: hiển thị 2 cột trực quan, lọc nhanh (`Tất cả`, `Khẩn cấp`, `Chưa đọc`, `Chưa lập phiếu`, `Đã gắn PA`), chủ động **+ Nhắn mới** tới toàn bộ **347+ người dân đang Quan tâm OA**, tự động đối khớp định danh cư dân KP3 từ bảng `residents`.
        + **AI Tự Phân Loại & Cảnh Báo Khẩn Cấp:** Tự động gắn nhãn danh mục (`Rác thải`, `Ngập nước`, `Hạ tầng đô thị`, `An ninh trật tự`...) & mức `Khẩn cấp`, tự động đẩy cảnh báo qua Zalo OA tới Bí thư / Trưởng BĐH / CSKV (chống lặp 30 phút); tích hợp **✨ AI Gợi ý trả lời (Gemini 2.5 Flash)** đọc đúng ngữ cảnh hội thoại để soạn câu trả lời lịch sự chuẩn hành chính.
        + **Chuyển đổi 1 chạm `Lập Phản ánh 1022` & Phản hồi tự động khi Hoàn tất:** Bấm 1 chạm chuyển tin nhắn + ảnh + tọa độ GPS thành hồ sơ `PA-...` kèm tin xác nhận tự động về Zalo cư dân; khi cán bộ trao đổi trong `ReportDetailPage.tsx` hoặc bấm Hoàn tất xử lý tại `ReportsPage.tsx`, kết quả và ảnh nghiệm thu tự động gửi ngược về Zalo của đúng người dân.

  40. **Triển Khai Đồng Bộ 06 Tính Năng Nghiệp Vụ Chuyên Sâu Mới Cho Khu Phố 3 (Phiên 22–24/11/2026 — commits `5580a0e`, `e86c79b`):**
      - **Rà soát Tự động Theo Độ tuổi (`AgeCohortScannerModal.tsx` trong `CitizenManagement.tsx`):** Tự động rà soát theo Năm kế hoạch (`2026–2028`) trên toàn bộ 11.229 nhân khẩu cho 9 chuyên đề: **NVQS** (Nam 17 tuổi, 18–25t, 18–27t CĐ/ĐH), **Mừng thọ Người cao tuổi** (tròn 70, 75, 80, 85, 90, 95, 100+ tuổi theo Điều 21 Luật NCT), **Trẻ em đầu cấp & Y tế** (0–2t Vitamin A/Tiêm chủng, 5t Mầm non, 6t Lớp 1, 11t Lớp 6) và **Căn cước 14 tuổi**; xuất Excel chuẩn mẫu nộp Phường 1 chạm.
      - **Xuất Báo cáo Định kỳ Tháng / Quý / Năm 1-chạm ra File Word (`.docx`) (`PeriodicWordReportModal.tsx` trên `Dashboard.tsx`):** Tự động tổng hợp số liệu thực tế toàn hệ thống vào biểu mẫu chuẩn **Nghị định 30/2020/NĐ-CP** (Quốc hiệu – Tiêu ngữ 2 cột ẩn viền, Times New Roman, lề trái 3cm, bảng số liệu có khung, chọn cơ quan ký Chi bộ / BĐH KP3), tích hợp nút **✨ AI Biên tập Văn phong**.
      - **An toàn PCCC Cơ sở & Tổ Liên gia PCCC (`FireSafetyAndHostelQrHub.tsx` — Sub-tab trong `BusinessManagement.tsx`):** Hậu kiểm PCCC 240 cơ sở & 230 nhà trọ (`safetyCertified`), quản lý mạng lưới Tổ Liên gia An toàn PCCC, Điểm chữa cháy công cộng, Trụ nước cứu hỏa (`portal_settings("kp3_pccc_points_v1")`) và xuất báo cáo PCCC `.xlsx`.
      - **Mã QR Khai báo Lưu trú Tạm thời riêng cho 230 Nhà trọ (`FireSafetyAndHostelQrHub.tsx` + `PublicHostelCheckinModal.tsx` + `api/notifications.ts`):** Tạo & in bảng QR dán cổng từng nhà trọ (`?hostel_checkin=...`), khách thuê mới quét QR gửi tờ khai trực tuyến (`public_submit_hostel_checkin`), Cán bộ / CSKV duyệt 1 chạm bổ sung vào danh sách Nhân khẩu Tạm trú.
      - **Phát hành Mã VietQR Động Hàng Loạt theo Hộ (`BatchHouseholdVietQrModal.tsx` trong `NeighborhoodFunds.tsx`):** Tạo hàng loạt phiếu thu gắn cú pháp chuẩn `KP3 <MaHo> <MaQuy>` và in tờ 12 phiếu QR/trang phát tới hộ dân.
      - **Sổ Trực & Tuần tra Tổ Bảo vệ ANTT Cơ sở (`SecurityPatrolLogTab.tsx` — Sub-tab thứ 3 trong `FieldReflections.tsx`):** Ghi nhận ca tuần tra kèm ảnh xác thực Timemark + tọa độ GPS, chuyển 1 chạm sang Hồ sơ 1022, đẩy báo cáo nhanh qua Zalo OA tới CSKV & Thường trực (`send_patrol_urgent_alert`) và xuất Sổ trực `.xlsx`.
      - **Chuẩn hóa kích thước Modal (`e86c79b`):** Mở rộng các hộp thoại nghiệp vụ lên `size="3xl"` / `size="4xl"` thoáng mắt trên màn hình desktop và bổ sung thuộc tính `autoComplete` cho form QR công khai.

  41. **Tích Hợp 02 Nút Công Tắc AI Trong Hộp Thư Zalo OA & Tối Ưu Siêu Tốc Webhook Zalo OA (Phiên 24/11/2026 — commits `ead1516`, `af4e6ba`):**
      - **02 công tắc AI độc lập lưu Cloud (`ZaloOaChatInbox.tsx` & `api/notifications.ts`):**
        + `AI Tự động trả lời 24/7` (`autoReplyEnabled`): Khi bật, Webhook nhận tin nhắn cư dân (`user_send_text`) sẽ tự động gọi Gemini 2.5 Flash soạn và phản hồi trực tiếp qua Zalo OA `v2.0/oa/message` (có chống spam cooldown `45 giây/cư dân`).
        + `AI Gợi ý trả lời` (`aiSuggestEnabled`): Bật/tắt thanh gợi ý và nút **✨ AI Soạn trả lời** trong khung soạn thảo cho Cán bộ duyệt trước khi gửi.
        + Trạng thái 2 công tắc lưu bền vững tại `portal_settings("zalo_oa_chat_ai_settings_v1", is_public = false)` qua action `get_zalo_chat_ai_settings` / `update_zalo_chat_ai_settings`.
      - **Khắc phục triệt để lỗi Zalo Webhook `HTTP 408` khi bấm "Kiểm tra" (`af4e6ba`):**
        + Bổ sung fast-path phản hồi `200 OK` trong `< 5ms` cho mọi ping xác thực của Zalo Developer Portal (`POST {}`, `event_name: "test"`, payload không có `event_name`).
        + Loại bỏ lời gọi `getprofile` gây nghẽn bên trong luồng webhook và chuyển vùng triển khai Vercel Functions sang **Singapore (`"regions": ["sin1"]` trong `vercel.json`)** giúp độ trễ phản hồi thực tế từ Việt Nam chỉ còn `~450–660ms`.

  42. **Nâng Cấp Phân Hệ Rà Soát Tự Động NVQS Tuổi 17 & 18–27 Chuẩn Pháp Lý Hiện Hành (Phiên 24/11/2026 — commit `29c56bb`):**
      - **Nam đủ 17 tuổi — Đăng ký NVQS lần đầu (Điều 12 Luật NVQS 2015):** Nút tích chọn 1-chạm `Chưa đăng ký` ↔ `Đã đăng ký` (tự động ghi nhận ngày đăng ký), ô nhập **Số GCN ĐK NVQS / hình thức trực tuyến**, thanh tiến độ `Đã ĐK / Tổng (%)` và bộ lọc nhanh `Tất cả | Chưa ĐK | Đã ĐK`.
      - **Nam 18 – 25 tuổi & Nam 18 – 27 tuổi (Điều 30, Điều 41 Luật NVQS 2015 & Thông tư 105/2023/TT-BQP):**
        + Dropdown **12 trạng thái phân loại NVQS chuẩn pháp lý** trên từng dòng công dân (`Chưa rà soát`, `Đủ ĐK sơ tuyển / khám tuyển`, `Đang thực hiện NVQS / CAND`, `Đã hoàn thành NVQS / Xuất ngũ`, `Đang là Dân quân thường trực`, `Tạm hoãn — Chưa đủ sức khỏe (TT 105/2023)`, `Tạm hoãn — Sinh viên ĐH / CĐ chính quy`, `Tạm hoãn — Học sinh phổ thông (THPT)`, `Tạm hoãn — Gia đình chính sách / Hoàn cảnh ĐB`, `Tạm hoãn — Lý do khác`, `Miễn gọi nhập ngũ (Chính sách / Cơ yếu)`, `Không đủ tiêu chuẩn / Tạm dừng theo quy định`).
        + Ô ghi chú chi tiết trực tiếp trên dòng (tên trường/năm học, độ cận/phân loại sức khỏe, mã đơn vị, lý do) và dải lọc thực lực 6 nhóm.
      - **Lưu trữ Cloud & Xuất Excel 2 sheet nộp Ban CHQS Phường An Phú:** Tự động đồng bộ vào `portal_settings("kp3_nvqs_records_v1", is_public = false)` và xuất Excel gồm sheet danh sách chi tiết (`RaSoat_<Năm>`) + sheet bảng tổng hợp thực lực (`TongHop_Tuoi17` / `TongHop_ThucLuc_NVQS`).

  43. **Tích Hợp Tin Nhắn ZBS / ZNS 2 Tầng (Zalo Business Solutions) (Phiên 26/11/2026 — commit `670a4ec`):**
      - **Backend (`api/notifications.ts`) & UI (`src/components/settings/ZaloZbsTab.tsx` bên trong `ZaloOaNotificationHub.tsx`):** Cho phép cấu hình Tài khoản ZBS, đồng bộ danh sách mẫu tin ZNS/ZBS, gửi thử theo số điện thoại cư dân và lưu cấu hình bảo mật tại `portal_settings`.
      - **Tài khoản ZBS chính thức đã thiết lập:** `BanDieuHanhKhuPho3AnPhu` (`NAUJYKDQZBRR9WZK`), đã tạo & gửi duyệt Mẫu tin ID **`672329`** (`KP3 - Thong bao cong vu & Nhac gia han tam tru`, trạng thái `PENDING_REVIEW`).

  44. **Phân Hệ Mật Quản Lý Đối Tượng Đặc Thù (ANTT) & Sửa Triệt Để Lỗi Gõ Nhanh Tiếng Việt (Phiên 26/11/2026 — commits `85bb6f4`, `161705c`, `ad4d26a`, `35068e6`):**
      - **Quản lý 10 diện đối tượng đặc thù ANTT (`src/utils/specialSupervisionUtils.ts`, `src/components/reports/SpecialSupervisionTab.tsx`, 6/6 Vitest PASS):** Án treo, cấm đi khỏi nơi cư trú/tại ngoại, cải tạo không giam giữ/quản chế, tha tù trước thời hạn, chấp hành xong án phạt tù, đặc xá, người sử dụng trái phép chất ma túy, cai nghiện tự nguyện/Methadone, quản lý sau cai (1–2 năm), giáo dục tại phường.
      - **Tích hợp trực tiếp vào `Quản lý Dân cư` (`CitizenManagement.tsx`):** Phân quyền bảo mật chuẩn Nghị định 13/2023/NĐ-CP (chỉ hiển thị với Bí thư / Admin / CSKV qua `canAccessSpecialSupervision`), Live Join trực tiếp 11.229 nhân khẩu, tìm kiếm gợi ý tự động ngay trên ô `Họ và tên *` và modal bọc `createPortal(..., document.body)` 3 phần (Header / Body cuộn / Footer) không bị tràn màn hình.
      - **Sửa lỗi gõ nhanh tiếng Việt (`CitizenSearchInput`):** Sử dụng `lastEmittedRef` + `onCompositionStart/End` + `useDeferredValue` + chuẩn hóa NFD/NFC không dấu (`matchesSmartResidentSearch`) loại bỏ triệt để hiện tượng nhảy con trỏ / mất dấu khi gõ nhanh họ tên, CCCD, SĐT.

  45. **Siêu Ứng Dụng Android / iOS KP3 An Phú v4.0.0 — Thiết Kế Lại 100% Phân Hệ & Phân Hệ Nhỏ (Phiên 26/11/2026 — commits `352356b`, `8fb7f63`, `d482432`, `6e21c4f`, `0fc5fed`, `9165172`):**
      - **Hệ thống thành phần Mobile Native (`md:hidden`, giữ nguyên 100% giao diện Desktop):**
        + `src/components/mobile/MobileSuperAppBar.tsx`: Thanh điều hướng đáy 5 tab cố định (`Trang chủ`, `Tin tức`, `Phản ánh`, `Tin nhắn`, `Tiện ích`) tích hợp rung phản hồi `@capacitor/haptics` (`src/utils/mobileHaptics.ts`) và badge đỏ đếm tin nhắn chưa đọc.
        + `src/components/mobile/MobileStaffHome.tsx`: Trang chủ Cán bộ Mobile-First với Hero Trống đồng đỏ, lưới KPI 2×2 siêu gọn, dải cảnh báo nóng vuốt ngang, 4 lối tắt Squircle và **Vaul Native Gesture Bottom Sheet** xuất Báo cáo Word `.docx` / Excel `.xlsx`.
        + `src/components/mobile/MobileUtilitiesHub.tsx`: Trung tâm Tiện ích Header Trống đồng đỏ + lưới Squircle 4 cột chia 4 nhóm phân quyền RBAC (`Dịch vụ Cư dân`, `Địa bàn & Giao thông`, `Điều hành Khu phố`, `An ninh & Quản trị 🔒`).
        + `src/components/mobile/MobileMessagesHub.tsx`: Trung tâm Tin nhắn 3 kênh hợp nhất (`Hộp thư Zalo OA` nâng cấp Master → Detail 2 bước trên Mobile + `Phát thông báo` + `Trợ lý AI KP3`).
        + `src/components/mobile/MobileSubpageShell.tsx`: AppBar Đỏ Trống đồng chuẩn Native tích hợp Sub-Tabs ngay trên nền Đỏ + nút `+` chính + nút `⋮` mở Vaul Action Sheet gom toàn bộ công cụ phụ (Excel/Zalo/OCR) — áp dụng đồng bộ lên **100% 13 phân hệ chính & 49 phân hệ nhỏ** (`CitizenManagement`, `HouseholdManagement`, `FieldReflections`, `BusinessManagement`, `EnterpriseManagement`, `TaskAndSchedule`, `GisMap`, `CommunityEvents`, `PartyBranch`, `SocialWelfare`, `NeighborhoodFunds`, `SettingsAndPermissions`, `AdministrativeForms`).
      - **Hạ tầng Android 15 Emulator, Build APK & Kiểm thử Tự động:**
        + Đã cài đặt Android 15 Emulator (`KP3_Pixel_API35`, API 35 x86_64), OpenJDK 21 (`C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot`), bộ script `C:\Users\Admin\android-emulator-kit\` (`Mo-May-Ao-Android.bat` đã cấu hình `-gpu swiftshader_indirect` chạy ổn định trên Intel UHD, shortcut Desktop `May-Ao-Android-KP3.lnk`).
        + Tích hợp MCP Server **`@mobilenext/mobile-mcp@latest`** (`github.com/mobile-next/mobile-mcp`) vào `.agents/mcp_config.json` và xây dựng CLI kiểm thử UIAutomator **`scripts/kp3-android-cli.mjs`** (`inspect`, `tap-text`, `shot`).
        + Biên dịch & ký số thành công **`C:\Users\Admin\android-emulator-kit\KP3-AnPhu-v4.0.apk`** (`versionCode: 9`, `versionName: "4.0.0"`), kiểm thử trực tiếp trên Máy ảo Android 15 đạt **`0 crash` (`AndroidRuntime:E` rỗng)**.
        + Bổ sung `.vercelignore` loại trừ `android/`, `ios/`, `*.apk`, `*.mp4` giúp deploy Vercel nhanh và không xung đột khi Gradle build.

  46. **Studio Video Viral Remotion 4 + FFmpeg 9.1 & Video Giới Thiệu Chi Tiết 2 Phút Đồng Bộ 1 Giọng Đọc (Phiên 26/11/2026):**
      - Đã thiết lập trọn bộ studio render video tại **`C:\Users\Admin\video-kit`** (Remotion 4, GSAP, FFmpeg 9.1 Full Build, `edge-tts` giọng `vi-VN-HoaiMyNeural` chuẩn hóa `-14 LUFS`, 3 bộ skills `remotion-skills`, `motion-ai-kit`, `gsap-skills`).
      - Xuất bản thành công **Video Giới thiệu Chi tiết 10 Chương (`KP3Showcase2Min.tsx`)** trình diễn song song Web Portal thật & App Android v4.0 thật, đồng bộ **100% duy nhất 1 giọng đọc `vi-VN-HoaiMyNeural`**, kèm nhạc nền Tech-Corporate & phụ đề tiếng Việt:
        + 👉 **`C:\Users\Admin\video-kit\out\KP3-AnPhu-FullShowcase-2Min-16x9.mp4`** (`02:15.70` • `1920×1080` Full HD 30fps • `58.2 MB` • Stereo AAC 48 kHz).
        + Cùng 2 bản viral ngắn trước đó: `KP3-AnPhu-Viral-16x9.mp4` (`56.82 MB`) & `KP3-AnPhu-Viral-9x16.mp4` (`56.71 MB`).

---

## 7. TRẠNG THÁI HỆ THỐNG, BÀN GIAO PHIÊN (26/11/2026) & ĐỊNH HƯỚNG TIẾP THEO
- **Trạng thái Kiểm thử & Build:**
  - ✅ TypeScript: `npx tsc --noEmit` đạt `exit code 0` (0 lỗi trên toàn dự án Web + Mobile + Serverless API).
  - ✅ Unit Tests (Vitest): Toàn bộ bộ test (bao gồm `specialSupervision.test.ts` 6/6 PASS & `ageCohortScanner.test.ts`) PASS 100%.
  - ✅ Kiểm thử 2 môi trường thật: Đã nghiệm thu trực tiếp trên **Chrome DevTools MCP** (`0 Console Error`) và **Máy ảo Android 15 (`KP3_Pixel_API35`)** qua `scripts/kp3-android-cli.mjs` (`0 crash`, kiểm chứng hình ảnh thật `Dân cư`, `Bản đồ GIS`, `Lịch & Nhiệm vụ`, `230 Nhà trọ`, `Tin tức`, `Tin nhắn 3 kênh Zalo OA`, `Tiện ích 4 cột`).
- **Trạng thái Hạ tầng Trực tuyến & Các Gói Phát hành:**
  - **Web Portal Production (Region `sin1` Singapore):** 👉 **[https://bdhkp3.vercel.app](https://bdhkp3.vercel.app)** (`dpl_CQWppbroUVPoSZNgqKfeicKhFHaK` — commit `9165172` — **READY**).
  - **GitHub Repository (`main`):** 👉 **[https://github.com/nghiemquynh0210/khuphothongminh](https://github.com/nghiemquynh0210/khuphothongminh)** (sạch secret/token).
  - **Ứng dụng Android Super-App mới nhất (`v4.0.0`, `versionCode: 9`, Signed):** 👉 **`C:\Users\Admin\android-emulator-kit\KP3-AnPhu-v4.0.apk`** (cùng bản phát hành GitHub Release `KP3-AnPhu.apk`).
  - **Video Giới thiệu Chi tiết 2 phút (Full HD 1080p, 1 giọng đọc `vi-VN-HoaiMyNeural`):** 👉 **`C:\Users\Admin\video-kit\out\KP3-AnPhu-FullShowcase-2Min-16x9.mp4`** (`58.2 MB`).
  - **Zalo Mini App (`30172911027069915`):** Version 6 (Testing) • **Zalo ZBS Account (`NAUJYKDQZBRR9WZK`):** Template `672329` (`PENDING_REVIEW`).
- **Gợi ý Định hướng cho Phiên Làm Việc Tiếp Theo:**
  1. Phát hành bản **`KP3-AnPhu-v4.0.apk`** lên **GitHub Releases (`latest`)** để Cán bộ & Cư dân tải cài đặt trực tiếp từ Cổng Cư dân (và tùy chọn tích hợp thêm `@capacitor/camera` + `@capacitor/geolocation` cho chụp ảnh phản ánh 1022 / tuần tra GPS trực tiếp).
  2. Khởi tạo dự án **iOS (`npx cap add ios`)** khi cần đóng gói xuất lên iPhone / App Store (cùng 1 bộ mã nguồn React + Tailwind + Capacitor).
  3. Theo dõi trạng thái duyệt Mẫu tin ZBS **`672329`** trên Zalo Cloud (`PENDING_REVIEW` → `APPROVED`) để kích hoạt gửi thông báo công vụ & nhắc hạn tạm trú tự động theo SĐT.
  4. Xuất thêm phiên bản dọc **`9:16` (TikTok / Zalo Video / Reels)** của video giới thiệu 2 phút nếu cần phục vụ truyền thông trên điện thoại.
  5. **Định hướng mở rộng 14 Khu phố Phường An Phú (Khi anh yêu cầu sau này):** Tách thành **Phiên bản 2 (Multi-Tenant)** độc lập về mã nguồn/CSDL, tuyệt đối không làm ảnh hưởng đến hệ thống vận hành chính thức của **Khu phố 3**.

<!-- ASTRYX:START -->
Astryx v0.7.11 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
