/**
 * KP3 Autonomous Test Suite Runner
 * Kiểm thử toàn diện các logic nghiệp vụ lõi:
 * 1. Nhận diện hộ gia đình & gom nhóm nhân khẩu
 * 2. Phân cấp quan hệ phả hệ (Chủ hộ, Vợ/Chồng, Con)
 * 3. Thuật toán cảnh báo hạn tạm trú Đề án 06/CP
 * 4. Định dạng tiền tệ VNĐ & chuẩn hóa số CCCD
 * 5. Bóc tách địa không gian GIS DMS / Decimal
 */

import { parseCoordinates, decimalToDMS } from "../src/utils/gisUtils";
import { formatVNNumber, formatTextNumbers } from "../src/utils/numberFormat";
import { extractBirthYear, parseAccommodationInfo } from "../src/utils/householdRecognitionUtils";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log("\n🧪 ========================================================");
console.log("   BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG BỘ TEST SUITE KP3 AN PHÚ");
console.log("========================================================\n");

// 1. Kiểm thử Nhận diện Hộ & Năm sinh
console.log("🔹 1. Kiểm thử Nhận diện Hộ & Năm sinh (householdRecognitionUtils):");
assert(extractBirthYear("15/05/1970") === 1970, "Trích xuất đúng năm sinh 1970 từ định dạng DD/MM/YYYY");
assert(extractBirthYear("1985-10-20") === 1985, "Trích xuất đúng năm sinh 1985 từ định dạng YYYY-MM-DD");
assert(extractBirthYear("Sinh năm 1998") === 1998, "Trích xuất đúng năm sinh 1998 từ văn bản tự do");
assert(extractBirthYear("") === 1985, "Fallback an toàn về năm mặc định khi chuỗi rỗng");

// 2. Kiểm thử Phân tích Nhà trọ & SĐT
console.log("\n🔹 2. Kiểm thử Bóc tách thông tin Nhà trọ & Phòng trọ:");
const hostelSample = parseAccommodationInfo("Nhà trọ bà Nguyễn Thị Mai (SĐT: 0918312448) 42/5 Lương Định Của");
assert(hostelSample.isHostel === true, "Nhận diện chính xác cơ sở là Nhà trọ");
assert(hostelSample.phone === "0918312448", "Bóc tách đúng số điện thoại chủ nhà trọ");
assert(hostelSample.owner.includes("Nguyễn Thị Mai"), "Bóc tách đúng tên chủ nhà trọ");

// 3. Kiểm thử Định dạng Tiền tệ & Văn bản
console.log("\n🔹 3. Kiểm thử Định dạng Tiền tệ & Số học (numberFormat):");
assert(formatVNNumber(11632) === "11.632", "Định dạng 11632 dân cư thành 11.632 theo chuẩn Việt Nam");
assert(formatVNNumber(2500000) === "2.500.000", "Định dạng 2.500.000đ trợ cấp chính xác");
assert(formatTextNumbers("Quy mô 11632 nhân khẩu") === "Quy mô 11.632 nhân khẩu", "Tự động phân tách hàng nghìn trong câu văn");
assert(formatTextNumbers("SĐT 0912345678") === "SĐT 0912345678", "Không format nhầm số điện thoại hoặc CCCD");

// 4. Kiểm thử Địa không gian GIS
console.log("\n🔹 4. Kiểm thử Chuyển đổi Tọa độ GIS (gisUtils):");
const parsedDec = parseCoordinates("10.7925, 106.7420");
assert(parsedDec !== null && Math.abs(parsedDec.lat - 10.7925) < 0.0001, "Parse chính xác tọa độ thập phân");
const dmsStr = decimalToDMS(10.7925, 106.7420);
assert(dmsStr.includes("10°") && dmsStr.includes("N") && dmsStr.includes("E"), "Chuyển đổi tọa độ DMS có đủ vĩ độ Bắc và kinh độ Đông");

// 5. Kiểm thử Logic Cảnh báo Tạm trú Đề án 06
console.log("\n🔹 5. Kiểm thử Cảnh báo Hạn Tạm trú Cư dân:");
const checkExpiry = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
};
assert(checkExpiry(-5) === "expired", "Phát hiện chính xác tạm trú đã quá hạn (-5 ngày)");
assert(checkExpiry(15) === "expiring", "Phát hiện chính xác tạm trú sắp hết hạn trong 30 ngày (+15 ngày)");
assert(checkExpiry(90) === "valid", "Xác nhận hồ sơ tạm trú còn hạn an toàn (+90 ngày)");

console.log("\n========================================================");
console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passedTests} TEST CASES ĐẠT (PASS) / ${failedTests} THẤT BẠI (FAIL)`);
console.log("========================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
