# DANH MỤC KHOẢNG TRỐNG & PHÁT TRIỂN TÍNH NĂNG (FEATURE BACKLOG)
**Hệ thống Quản lý Thông minh & Cổng Dịch vụ Cư dân số KP3 An Phú**

| ID | Tính năng | Mục đích & Giá trị thực tế | Ưu tiên | Độ phức tạp | Trạng thái |
|---|---|---|---|---|---|
| **F01** | **Form Accessibility chuẩn WCAG trên Zalo Mini App (`StaffTab.tsx`)** | Gắn `id`, `name`, `htmlFor` đầy đủ cho toàn bộ trường nhập liệu để loại bỏ hoàn toàn cảnh báo Chrome DevTools & hỗ trợ Screen Reader | **P0** | Thấp | ✅ **Đã hoàn thành (v6)** |
| **F02** | **Cổng Đăng Nhập, Quên Mật Khẩu & Đăng Thông Báo Nhanh cho Cán bộ trên Zalo Mini App** | Cho phép Cán bộ dùng tài khoản Supabase Auth đăng nhập trên Zalo, khôi phục mật khẩu qua email và phát hành thông báo khẩn trực tiếp từ hiện trường lên Web + Mini App | **P0** | Trung bình | ✅ **Đã hoàn thành (v6)** |
| **F03** | **Lọc 1-chạm Cư dân Tạm trú sắp hết hạn ≤ 30 ngày / quá hạn trên Zalo Mini App** | Giúp CSKV & BĐH kiểm tra nhanh các trường hợp cần nhắc gia hạn tạm trú ngay khi đi kiểm tra nhà trọ bằng điện thoại | **P1** | Trung bình | ✅ **Đã hoàn thành (v6)** |
| **F04** | **Đồng bộ Banner Zalo Mini App v6 trên Trang chủ Cổng Cư dân Web** | Hiển thị đúng phiên bản mới nhất có Cổng Cán bộ và liên kết sâu `https://zalo.me/s/30172911027069915/` | **P1** | Thấp | ✅ **Đã hoàn thành** |
| **F05** | **Đính kèm ảnh chụp hiện trường khi gửi Phản ánh 1022 trên Zalo Mini App** | Cho phép cư dân tải ảnh sự cố trực tiếp từ camera điện thoại lên bucket `field-reports` (cần cấp quyền Camera `zmp-sdk` khi duyệt Public) | **P2** | Trung bình | 📋 Kế hoạch sau khi Zalo duyệt Public |
| **F06** | **Đăng nhập nhanh bằng Zalo OAuth (`getPhoneNumber`) cho Cư dân trên Mini App** | Tự động điền SĐT cư dân khi gửi phản ánh 1022 & tra cứu nhanh không cần gõ tay (yêu cầu Zalo duyệt quyền `scope.userPhonenumber`) | **P2** | Cao | 📋 Kế hoạch sau khi Zalo duyệt quyền |
| **F07** | **Nâng cấp chuỗi dependency major (`xlsx` → `exceljs`, Express 5, Vite 7)** | Xử lý triệt để 7 cảnh báo transitive từ `npm audit` | **P2** | Cao | 📋 Lộ trình bảo trì quý tiếp theo |
| **F08** | **Tự động sao lưu định kỳ dữ liệu Supabase sang kho lưu trữ lạnh** | Tăng cường khả năng khôi phục thảm họa (DR) ngoài Point-in-Time Recovery của Supabase | **P3** | Trung bình | 📋 Đề xuất giai đoạn mở rộng |
