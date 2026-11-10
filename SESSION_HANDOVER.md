# BÁO CÁO NÂNG CẤP HỆ THỐNG KHU PHỐ 3 AN PHÚ
**Thời gian cập nhật:** 10/11/2026 (13:50 UTC+7)  
**Trang Production:** [https://bdhkp3.vercel.app](https://bdhkp3.vercel.app)  
**GitHub Repository:** [https://github.com/nghiemquynh0210/khuphothongminh.git](https://github.com/nghiemquynh0210/khuphothongminh.git)  
**Tác giả commit:** Khupho3 <bdhkhupho3.ap@gmail.com>

---

## 1. Nâng cấp Modal "Thêm sự kiện / Lịch họp mới" & Quản lý Sự kiện
1. **Bổ sung ô nhập nội dung cuộc họp / chương trình chi tiết:**
   - Trường textarea lớn `Nội dung cuộc họp / Chương trình chi tiết *` có hướng dẫn chi tiết về nội dung thảo luận, nghị quyết, phân công.
2. **Chủ trì thông minh liên kết 23 Chi hội / Tổ chức & Lãnh đạo cấp trên:**
   - Bộ chọn phân nhóm 33 vị trí chủ trì: Lãnh đạo cấp trên & Ban Quản trị, Lãnh đạo Cấp ủy & Ban Điều hành KP3, Trưởng & Phó 23 Chi hội / Tổ chức đoàn thể cơ sở, kèm tùy chọn nhập tên khác.
3. **Loại sự kiện tùy chọn:**
   - Danh mục sự kiện chuẩn kèm tùy chọn `+ Loại sự kiện khác (Nhập tùy chọn)` cho phép nhập loại sự kiện tùy ý.
4. **Tệp đính kèm đa định dạng:**
   - Đính kèm tệp tin hình ảnh (JPG, PNG, WEBP), Word (.doc, .docx), PDF (.pdf) với mã hóa Base64 và dung lượng tối đa 20MB.
   - Thẻ xem trước trực quan với nút xem ảnh và tải về máy.
5. **Hiển thị trên Thẻ Lịch họp (Timeline Card) & Modal Chi tiết Sự kiện (`selectedSchedule`):**
   - Thẻ lịch họp hiển thị tóm tắt nội dung và các tệp đính kèm.
   - Nhấp vào thẻ để mở Modal Chi tiết với 4 thẻ metric, nội dung chi tiết, trạng thái và quản lý tệp đính kèm.

## 2. Hoàn thiện Form "Phân công nhiệm vụ mới"
1. **Đơn vị nhận việc:** Liên kết toàn bộ 23 Chi hội & Đoàn thể từ `associationsData.ts`.
2. **Người nhận việc chính:** Tự động lọc thành viên thuộc chi hội được chọn, hiển thị rõ họ tên, chức vụ, SĐT.
3. **Đính kèm tài liệu:** Cho phép đính kèm tệp tin hình ảnh, Word, PDF ngay khi tạo việc mới.

## 3. Kiểm thử & Triển khai
- `npm run lint:ts`: 0 lỗi.
- `npm run build`: 0 lỗi.
- Kiểm thử Chrome DevTools MCP: 0 lỗi console.
- Git Commit `2928254` pushed to GitHub `origin main`.
- Vercel Deploy `dpl_4JNva6FL5VWooKiM3bdPxKePJYj4` live at [https://bdhkp3.vercel.app](https://bdhkp3.vercel.app).
