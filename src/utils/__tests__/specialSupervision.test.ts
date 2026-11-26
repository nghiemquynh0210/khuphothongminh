import { describe, expect, it } from "vitest";
import {
  SUPERVISION_CATEGORIES,
  canAccessSpecialSupervision,
  computeDaysUntilEnd,
  maskCccdNumber,
  maskPersonName,
} from "../specialSupervisionUtils";

describe("specialSupervisionUtils (10 diện pháp lý & bảo mật NĐ 13/2023)", () => {
  it("cung cấp đủ 10 diện quản lý chuẩn pháp lý Việt Nam", () => {
    expect(SUPERVISION_CATEGORIES.length).toBe(10);
    const ids = SUPERVISION_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("an_treo");
    expect(ids).toContain("cam_di_khoi_noi_cu_tru");
    expect(ids).toContain("sau_cai_nghien");
    expect(ids).toContain("su_dung_ma_tuy");
    expect(ids).toContain("tha_tu_co_dieu_kien");
    expect(ids).toContain("dac_xa");
  });

  it("phân quyền RBAC chặt chẽ: chỉ Admin / Bí thư / CSKV / ANTT được truy cập", () => {
    expect(canAccessSpecialSupervision({ role: "admin" })).toBe(true);
    expect(
      canAccessSpecialSupervision({ role: "canbo", title: "Công an khu vực (CSKV)" })
    ).toBe(true);
    expect(
      canAccessSpecialSupervision({ role: "canbo", title: "Bí thư Chi bộ" })
    ).toBe(true);
    expect(
      canAccessSpecialSupervision({ role: "canbo", title: "Tổ trưởng Tổ ANTT cơ sở" })
    ).toBe(true);
    expect(
      canAccessSpecialSupervision({ role: "canbo", title: "Chi hội Phụ nữ" })
    ).toBe(false);
    expect(canAccessSpecialSupervision({ role: "citizen" })).toBe(false);
    expect(canAccessSpecialSupervision(null)).toBe(false);
  });

  it("tính chính xác số ngày còn lại đến hạn quản lý", () => {
    const ref = new Date(2026, 10, 26); // 26/11/2026
    expect(computeDaysUntilEnd("2026-12-10", ref)).toBe(14);
    expect(computeDaysUntilEnd("2026-11-20", ref)).toBe(-6);
    expect(computeDaysUntilEnd("", ref)).toBeNull();
  });

  it("che danh tính & CCCD an toàn khi trình chiếu họp chung", () => {
    expect(maskPersonName("Nguyễn Văn Minh")).toBe("Nguyễn V*** M***");
    expect(maskCccdNumber("079095012345")).toBe("079*****2345");
    expect(maskCccdNumber("")).toBe("Chưa cập nhật");
  });
});
