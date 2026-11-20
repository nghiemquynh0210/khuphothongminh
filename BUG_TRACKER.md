# NHẬT KÝ THEO DÕI VÀ XỬ LÝ LỖI (BUG TRACKER)
**Hệ thống Quản lý Thông minh & Cổng Dịch vụ Cư dân số KP3 An Phú**

---

## 1. BẢNG THỐNG KÊ LỖI ĐÃ XỬ LÝ

| ID | Phân hệ | Mô tả lỗi | Mức độ | Nguyên nhân gốc | Giải pháp đã xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| **BUG-01** | Zalo OA / Thông báo | Đồng chí Phó Bí thư Phạm Ngọc Hà không nhận được nhắc lịch qua Zalo OA | **P0 (Critical)** | Cán bộ dùng nickname Zalo là "Sò" (khác họ tên khai sinh), API Zalo không trả SĐT công khai | Xây dựng cơ chế Cadre Zalo Mapping; Nạp built-in alias "pham ngoc ha" ➔ "Sò" (UID `2742691693568338378`); Đã test gửi tin nhắn thành công qua Zalo OA API | ✅ Đã khắc phục & Kiểm thử thực tế |
| **BUG-02** | Quản lý Chi hội | Thẻ cán bộ Phó Bí thư Phạm Ngọc Hà hiển thị "Ghép Zalo" dù đã có dữ liệu trong DB | **P1 (High)** | Component `PartyBranch.tsx` chỉ đọc `member.zaloUserId` nội bộ mà chưa nạp `cadreZaloMapping` từ CSDL | Bổ sung nạp danh bạ Zalo khi khởi động; Tích hợp hàm `getMemberZaloInfo(member)`; Hiển thị badge xanh `💬 Zalo: Sò` | ✅ Đã khắc phục & Kiểm thử thực tế |
| **BUG-03** | Tin tức Zalo OA | Bài viết Thông báo nghỉ lễ 02/9 (`e196b89c...`) bị trống nội dung | **P1 (High)** | Bài viết trên Zalo OA là dạng ảnh Infographic Scan Công văn, API không trả văn bản body | Số hóa 100% nội dung 5 điều khoản vào CSDL; Nâng cấp `NewsDetailPage.tsx` với Lightbox xem ảnh scan full màn hình | ✅ Đã khắc phục & Kiểm thử thực tế |
| **BUG-04** | Kiểm thử Vitest | Lỗi `ReferenceError: getStaffAuthHeaders is not defined` trong `PartyBranch.tsx` | **P2 (Medium)** | Thiếu lệnh import `getStaffAuthHeaders` từ `../utils/imageUpload` | Bổ sung import `getStaffAuthHeaders`; Toàn bộ 125 tests đều passed | ✅ Đã khắc phục & Kiểm thử thực tế |
| **BUG-05** | Chunk Recovery | Người dùng gặp lỗi tải chunk JS khi deploy phiên bản mới lên Vercel | **P2 (Medium)** | Trình duyệt giữ cache file HTML trỏ tới hash chunk JS cũ | Cấu hình `vercel.json` SPA rewrite không cache `index.html` kết hợp `lazyWithChunkRetry` và `vite:preloadError` | ✅ Đã khắc phục & Hoạt động ổn định |
| **BUG-06** | `api/staff-admin.ts` | Lỗi TypeScript `TS2339`: `Property 'profile' does not exist on type 'StaffProfileRow'` tại dòng 1155 | **P1 (High)** | Biến `caller` đã là `StaffProfileRow`, truy cập `caller.profile?.full_name` làm lỗi biên dịch TS và luôn rơi vào fallback `"Admin"` | Sửa thành `caller.full_name \|\| "Admin"`; xác nhận `npx tsc --noEmit` đạt 0 lỗi | ✅ Đã khắc phục & Xác minh |
| **BUG-07** | `src/components/PartyBranch.tsx` | Lỗi TypeScript `TS2304`: `Cannot find name 'normalizeCadreKey'` tại dòng 1869 trong `handleAddMemberFromResidents` | **P1 (High)** | Gọi nhầm tên hàm `normalizeCadreKey` (chưa khai báo trong file) thay vì helper `getMemberCadreKey` — có nguy cơ gây crash `ReferenceError` khi thêm hội viên từ CSDL cư dân | Sửa sang dùng đúng helper `getMemberCadreKey(residentObj.fullName)` | ✅ Đã khắc phục & Xác minh |
| **BUG-08** | `zalo-mini-app/src/supabase.ts` | Lỗi TypeScript `TS2339`: `Property 'env' does not exist on type 'ImportMeta'` | **P2 (Medium)** | Thư mục `zalo-mini-app/src/` thiếu khai báo kiểu `vite/client` | Bổ sung `zalo-mini-app/src/vite-env.d.ts` (`/// <reference types="vite/client" />`); `tsc --noEmit` đạt 0 lỗi | ✅ Đã khắc phục & Xác minh |
| **BUG-09** | `zalo-mini-app/src/App.tsx` | Lỗi React Hooks ESLint `react-hooks/immutability`: `fetchNews` được gọi trong `useEffect` trước khi khai báo | **P2 (Medium)** | Khai báo `const fetchNews` nằm sau `useEffect` gọi nó | Di chuyển khai báo `fetchNews` lên trước `useEffect` | ✅ Đã khắc phục & Xác minh |

---

## 2. KẾT QUẢ TỔNG HỢP:
- **Tổng số lỗi phát hiện:** 9 lỗi (5 lỗi đợt trước + 4 lỗi phát hiện mới ở đợt kiểm toán 20/11/2026 13:30).
- **Tổng số lỗi đã khắc phục:** 9 / 9 lỗi (100%).
- **Lỗi tồn đọng nghiêm trọng (P0/P1):** **0 lỗi**.
- **Lưu ý bảo trì dài hạn (P3 / Dependency):** `npm audit --omit=dev` ghi nhận 7 lỗ hổng transitive (`proxy-addr`, `body-parser`, `vite`, `browserslist`, `qs`, `baseline-browser-mapping`, `xlsx` — trong đó `xlsx` chưa có bản vá trên npm registry). Cần theo dõi lộ trình nâng cấp major dependency ở chu kỳ bảo trì tiếp theo.
- **Hệ thống đạt trạng thái sẵn sàng kiểm duyệt Preview & triển khai Production.**
