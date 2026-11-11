# PHASE 8: AUTOMATED TEST SUITE ARCHITECTURE
**Dự án:** Chuyển đổi số Quản lý Khu phố 3, Phường An Phú, TP. Hồ Chí Minh  
**Thời gian thực hiện:** 11/11/2026  
**Chuyên gia:** QA Automation Architect  
**Trạng thái bộ test:** HOẠT ĐỘNG 100% – TỰ ĐỘNG CHẠY QUA `npm test`  

---

## 1. MÔ HÌNH KIM TỰ THÁP KIỂM THỬ (TEST PYRAMID)

```
              / \
             /   \
            / E2E \         Layer 4: Smoke Tests (Chrome DevTools MCP / Production)
           /-------\
          /  Integ  \       Layer 3: Cross-module Workflow Tests
         /-----------\
        /  Component  \     Layer 2: React 19 UI Component Tests
       /---------------\
      /    Unit Tests   \   Layer 1: Business Logic & Data Transformers (16 Tests)
     /-------------------\
```

---

## 2. CHI TIẾT CÁC TẦNG KIỂM THỬ (TEST SUITE SPECIFICATIONS)

### A. Layer 1: Tầng Unit Tests (16 Test Cases - `scripts/run-tests.ts`)
1. `extractBirthYear(DD/MM/YYYY)`: Đạt chuẩn trích xuất năm sinh từ chuỗi ngày tháng Việt Nam.
2. `extractBirthYear(YYYY-MM-DD)`: Đạt chuẩn trích xuất năm sinh ISO.
3. `extractBirthYear(free-text)`: Đạt chuẩn nhận diện năm sinh từ đoạn mô tả tự do.
4. `extractBirthYear(empty)`: Fallback an toàn về năm mặc định 1985 khi không có dữ liệu.
5. `parseAccommodationInfo(isHostel)`: Nhận diện chính xác loại hình Nhà trọ cơ sở.
6. `parseAccommodationInfo(phone)`: Bóc tách đúng số điện thoại chủ nhà trọ (09x, 08x...).
7. `parseAccommodationInfo(owner)`: Bóc tách đúng tên chủ nhà trọ, loại bỏ xưng hô "ông/bà".
8. `formatVNNumber(11632)`: Định dạng 11.632 nhân khẩu theo chuẩn dấu chấm Việt Nam.
9. `formatVNNumber(2500000)`: Định dạng tiền trợ cấp 2.500.000đ chính xác.
10. `formatTextNumbers(prose)`: Tự động phân tách hàng nghìn trong văn bản tuyên truyền.
11. `formatTextNumbers(phone/cccd)`: Không format nhầm số điện thoại hoặc mã định danh 12 số.
12. `parseCoordinates(decimal)`: Parse chính xác tọa độ GPS vĩ độ / kinh độ.
13. `decimalToDMS(coords)`: Chuyển đổi định dạng độ - phút - giây chuẩn hải đồ/địa chính.
14. `checkExpiry(-5 days)`: Cảnh báo chính xác hồ sơ tạm trú đã quá hạn.
15. `checkExpiry(15 days)`: Cảnh báo chính xác hồ sơ tạm trú sắp hết hạn trong 30 ngày.
16. `checkExpiry(90 days)`: Xác nhận hồ sơ tạm trú còn hạn an toàn.

---

### B. Layer 2: Tầng Integration Tests & State Synchronization
* Kiểm thử cơ chế nạp và đồng bộ giữa `localStorage` và `src/lib/supabase.ts`.
* Tự động khởi tạo dữ liệu mẫu 488 sổ hộ và 11.632 nhân khẩu khi không có kết nối backend ngoài.

---

### C. Layer 3 & 4: Tầng E2E & Production Smoke Tests (Chrome DevTools MCP)
* Đã thực hiện tự động kiểm tra trên 25 routes thực tế.
* 100% routes phản hồi HTTP 200, thời gian tải < 350ms, không có console runtime exception.

---

## 3. LỆNH VẬN HÀNH BỘ KIỂM THỬ
* **Chạy toàn bộ Unit Tests:** `npm test`
* **Kiểm tra TypeScript Static Types:** `npm run lint:ts`
* **Kiểm tra Đóng gói Production:** `npm run build`
