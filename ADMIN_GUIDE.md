# HƯỚNG DẪN QUẢN TRỊ & VẬN HÀNH (ADMIN GUIDE)
**Dành cho Bí thư Chi bộ, Thường trực Ban Điều hành, Ban CTMT & CSKV Khu phố 3 – Phường An Phú**

---

## 1. ĐĂNG NHẬP HỆ THỐNG
- **Web Dashboard:** Truy cập https://bdhkp3.vercel.app/login → Đăng nhập bằng Email & Mật khẩu Cán bộ đã được phê duyệt.
- **Zalo Mini App (Tác nghiệp di động):** Mở Mini App KP3 → Bấm nút **`Cán bộ`** (góc trên bên phải hoặc tab dưới cùng) → Đăng nhập bằng cùng tài khoản Cán bộ.
- **Quên mật khẩu:** Nhập Email công vụ và bấm **Quên mật khẩu?** để nhận liên kết đặt lại qua email.

## 2. QUY TRÌNH QUẢN TRỊ CỐT LÕI (WEB DASHBOARD)
1. **Phê duyệt Tài khoản Cán bộ (`/dashboard/settings`):**
   - Bí thư Chi bộ xem danh sách tài khoản chờ duyệt, đối khớp CCCD cư dân & Chi hội, bấm **Duyệt 1-chạm**. Hệ thống tự động liên kết Zalo OA nếu trùng SĐT/Họ tên trong 347 followers.
2. **Ghép nối Zalo OA & Nhắc lịch họp tự động (`/dashboard/settings` → Tab Zalo OA):**
   - Bấm **Quét & Khớp Tự Động (1-Chạm)** để ghép hàng loạt cán bộ.
   - Với cán bộ dùng nickname Zalo khác tên thật (ví dụ Phó Bí thư Phạm Ngọc Hà – nick `Sò`), bấm **Ghép Zalo OA**, gõ SĐT để tìm và lưu liên kết.
   - Hệ thống tự động nhắc lịch họp trước **60 phút** qua GitHub Actions (`supabase-keepalive.yml`, mỗi 15 phút từ 06:00–21:45 ICT).
3. **Quản lý Dân cư, Hộ khẩu & Nhà trọ (`/dashboard/residents`, `/dashboard/households`, `/dashboard/businesses`):**
   - Che mờ CCCD mặc định; bấm biểu tượng con mắt để xem toàn văn khi tác nghiệp.
   - Theo dõi cảnh báo tạm trú sắp hết hạn ≤ 30 ngày / quá hạn và xuất Excel danh sách lưu trú từng nhà trọ 1 chạm.
4. **Tác nghiệp nhanh trên Zalo Mini App (Tab Điều hành):**
   - **1022:** Xử lý & ghi phản hồi đóng hồ sơ phản ánh ngay tại hiện trường.
   - **Lịch họp:** Xem nhanh lịch công tác tuần.
   - **Dân cư:** Tra cứu theo Tên/CCCD/SĐT hoặc bấm lọc nhanh **Tạm trú sắp hết hạn ≤ 30 ngày**.
   - **Đăng tin:** Phát hành thông báo khẩn tức thì lên cả Web và Zalo Mini App.

## 3. QUY TẮC BẢO MẬT & SAO LƯU
- **Tuyệt đối không** chia sẻ `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, `ZMP_TOKEN` hay `App Secret` Zalo OA.
- Mọi thao tác trên bảng `residents` và `households` được bảo vệ bởi **PostgreSQL RLS** (`is_approved_staff`).
- Khôi phục phiên bản deploy: có thể rollback tức thì về bất kỳ Deployment ID nào trong lịch sử Vercel (`khupho3-s-projects/bdhkp3`).
