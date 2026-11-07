# Thiết kế giao diện (Design System) — Khu Phố Thông Minh KP3

Skill evon:ui-ux đọc file này trước khi dựng. Sửa tay được; file trái với code thì code thắng.

## 1. Sản phẩm
- **Sản phẩm:** Cổng Thông tin & Hệ thống Quản trị Điều hành Khu phố Thông minh KP3 (Phường An Phú, TP. Thủ Đức).
- **Người dùng:** Cán bộ Ban Điều Hành Khu phố 3, Cảnh sát khu vực, Tổ trưởng dân phố, Cán bộ Chi hội/Đoàn thể và Cư dân trên địa bàn (11.632 nhân khẩu, 488 hộ, 119 cơ sở kinh doanh).
- **Việc chính:**
  1. Quản lý, tra cứu, biến động cư dân & hộ khẩu & cơ sở kinh doanh theo thời gian thực.
  2. Tiếp nhận, điều phối, cập nhật tiến độ giải quyết phản ánh hiện trường & biểu mẫu hành chính.
  3. Giám sát không gian an ninh, PCCC, hạ tầng camera qua bản đồ số GIS.
- **Nền tảng:** Máy tính (Desktop/Laptop) cho Cán bộ quản trị (80% nghiệp vụ); Điện thoại (Mobile Web) cho Cư dân & Cán bộ khảo sát thực địa.
- **Điểm khác biệt:** Tích hợp trực tiếp CSDL Dân cư số với Bản đồ GIS không gian địa lý, Trợ lý AI pháp lý & Cổng số tương tác công dân hai chiều.

## 2. Giao diện & Tokens
- **Bộ mặt:** Clean / Dark Sidebar (P13): Điều hướng thanh bên màu tối Slate-900, vùng nội dung nền xám phẳng Slate-50, tiêu đề rõ ràng, không bóng thô.
- **Màu chủ đạo & Màu nhấn:**
  - Government Navy: `#073B72` (Token: `--color-gov-navy`, định danh thương hiệu chính quyền số)
  - Government Blue: `#005BAC` (Token: `--color-gov-blue`, liên kết và tương tác thứ cấp)
  - Civic Emerald: `#059669` (Token: `--color-primary`, hoàn thành, xác nhận, an toàn, nhãn hành động)
  - Cảnh báo / Khẩn cấp: `#B4232D` / Rose-600 (Token: `--color-gov-danger`, PCCC, phản ánh khẩn)
- **Typography Scale:**
  - Font chính: `Inter`, sans-serif (tối ưu tiếng Việt có dấu, rõ nét ở mọi kích thước màn hình).
  - Font số/mã: `JetBrains Mono` (dùng cho CCCD, Mã định danh hộ, Mã số thuế, Tọa độ GIS).
  - Thang chữ:
    - Heading 1: 20px / 24px (desktop), font-bold / extrabold, tracking -0.025em.
    - Heading 2: 16px / 18px (desktop), font-semibold, tracking -0.02em.
    - Body: 13px / 14px, font-normal, line-height 1.5.
    - Caption / Meta: 11px / 12px, font-medium, text-slate-500.
    - Pill / Badge: 10.5px / 11px, font-bold, uppercase / tracking-wide.
- **Phong cách:** Flat Hairline (Đường tóc phẳng): Nền Slate-50, thẻ màu trắng Surface `#ffffff`, viền 1px siêu mảnh `border-slate-200`, bo góc `rounded-xl` (12px), hoàn toàn không bóng thô (`shadow-none` hoặc `shadow-xs`).
- **Nền tối:** Dark Sidebar (`bg-slate-900`), Content nền sáng tương phản cao đạt chuẩn trợ năng WCAG AAA.

## 3. Hợp đồng 7 Nguyên tố (D1 Primitives)
1. **Nút (Button):** Chiều cao `h-9` (36px) desktop / `h-10` (40px) mobile. 4 dạng: `primary` (Navy/Emerald), `secondary` (Slate-100), `outline` (viền mảnh Slate-300), `destructive` (Rose-600).
2. **Badge Trạng thái (Status Badge):** Dạng pill bo tròn `rounded-full`, padding `px-2.5 py-0.5`, chữ 11px semi-bold. Gồm 4 trạng thái duy nhất (`pending`, `in_progress`, `completed`, `danger`).
3. **Ô nhập (Input):** Chiều cao cố định `h-9` (36px), nền trắng, viền `border-slate-300`, focus viền Emerald-600 + ring 2px Emerald-500/20. Mặc định trơn không có icon trái.
4. **Thẻ Card:** Nền trắng, viền `border-slate-200`, bo góc 12px (`rounded-xl`), padding chuẩn 20px (`p-5`).
5. **Dòng bảng (Table Row):** Chiều cao chuẩn 48px (`h-12`), viền ngăn dưới `border-b border-slate-100`, hover `hover:bg-slate-50/80`.
6. **Hộp thoại (Modal):** Rộng chuẩn `max-w-xl` hoặc `max-w-3xl`, góc bo 16px (`rounded-2xl`), phím Esc đóng, nút xác nhận góc dưới phải.
7. **Trạng thái rỗng (Empty State):** Icon 40px trong vòng tròn xám `w-12 h-12 bg-slate-100`, tiêu đề 14px bold, câu phụ 12px, nút hành động chính bên dưới.

## 4. Bảng ánh xạ trạng thái duy nhất (D2 Status Mapping)
- `pending` (Chờ duyệt / Mới gửi): Nhãn "Chờ duyệt", màu Amber-700, nền Amber-50, viền Amber-200, icon `clock`.
- `in_progress` (Đang giải quyết): Nhãn "Đang xử lý", màu Blue-700, nền Blue-50, viền Blue-200, icon `loader-2`.
- `completed` (Đã hoàn thành / Đạt chuẩn): Nhãn "Đã xử lý", màu Emerald-700, nền Emerald-50, viền Emerald-200, icon `check-circle-2`.
- `danger` (Từ chối / Quá hạn / Cảnh báo): Nhãn "Cảnh báo / Quá hạn", màu Rose-700, nền Rose-50, viền Rose-200, icon `alert-triangle`.

## 5. Màn hình đã áp dụng chuẩn Design System
- `/dashboard`: Bảng điều khiển Tổng quan Cán bộ & Cổng Cư dân số
- `/residents`: Quản lý Dân cư 11.632 nhân khẩu
- `/households`: Quản lý Sổ Hộ khẩu 488 hộ
- `/enterprises`: Quản lý Doanh nghiệp & Pháp nhân
- `/businesses`: Cơ sở Kinh doanh & Tiêu chuẩn PCCC
- `/gis`: Bản đồ GIS Không gian địa lý & Điểm nóng
- `/reports`: Phản ánh hiện trường 2 chiều
- `/tasks`: Lịch & Nhiệm vụ cán bộ
- `/design-system`: Trang Showcase duyệt toàn bộ Design System

