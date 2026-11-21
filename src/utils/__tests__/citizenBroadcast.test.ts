import { describe, expect, it } from "vitest";
import { inferTargetAudiencesFromText } from "../../components/tasks/CitizenBroadcastTab";

describe("Citizen & Association Targeted Broadcast Helpers", () => {
  it("infers Chi bộ Đảng (ASC_DANG) and Đảng viên 213 (ASC_DANG213) accurately", () => {
    expect(inferTargetAudiencesFromText("Họp lệ Chi bộ Khu phố 3 định kỳ tháng 11")).toEqual([
      "ASC_DANG",
    ]);
    expect(
      inferTargetAudiencesFromText("Họp mặt Đảng viên 213 sinh hoạt nơi cư trú cuối năm")
    ).toEqual(["ASC_DANG213"]);
  });

  it("infers Chi hội Cựu chiến binh (ASC_CCB) and other mass organizations", () => {
    expect(
      inferTargetAudiencesFromText("Mời họp Chi hội Cựu chiến binh Khu phố 3 kỷ niệm 22/12")
    ).toEqual(["ASC_CCB"]);
    expect(
      inferTargetAudiencesFromText("Phát động phong trào Chi hội Phụ nữ và Đoàn Thanh niên")
    ).toEqual(["ASC_PN", "ASC_TN"]);
  });

  it("infers Hộ nghèo, Hộ cận nghèo and Gia đình chính sách for social welfare notices", () => {
    expect(
      inferTargetAudiencesFromText("Trao quà hỗ trợ hộ nghèo và hộ cận nghèo dịp Tết")
    ).toEqual(["ASC_CS_NGHEO", "ASC_CS_CANNGHEO"]);
    expect(
      inferTargetAudiencesFromText("Thăm hỏi gia đình chính sách, người có công ngày 27/7")
    ).toEqual(["ASC_CS_NCC", "ASC_CS_GDCS"]);
  });

  it("infers HOSTEL_OWNERS for accommodation / temporary residence notices and ALL_CITIZENS by default", () => {
    expect(
      inferTargetAudiencesFromText("Kiểm tra PCCC và đăng ký tạm trú các cơ sở nhà trọ")
    ).toEqual(["HOSTEL_OWNERS"]);
    expect(
      inferTargetAudiencesFromText("Thông báo lịch tổng vệ sinh môi trường toàn Khu phố 3")
    ).toEqual(["ALL_CITIZENS"]);
  });
});
