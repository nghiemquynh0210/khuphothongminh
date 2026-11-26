import { describe, expect, it } from "vitest";
import {
  SUPERVISION_CATEGORIES,
  canAccessSpecialSupervision,
  computeDaysUntilEnd,
  maskCccdNumber,
  maskPersonName,
  matchesSmartResidentSearch,
  normalizeSearchVietnamese,
  resolveLiveSupervisionRecord,
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
      canAccessSpecialSupervision({ role: "canbo", fullName: "Bí thư Nghiêm Xuân Quỳnh" })
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

  it("tìm kiếm tiếng Việt thông minh (không dấu, NFD/NFC, SĐT/CCCD có dấu cách)", () => {
    expect(normalizeSearchVietnamese("Nguyễn Đắc Dũng")).toBe("nguyen dac dung");
    // Khớp không dấu
    expect(matchesSmartResidentSearch("nghiem xuan", ["NGHIÊM XUÂN QUỲNH"])).toBe(true);
    // Khớp Unicode tổ hợp (NFD) vs dựng sẵn (NFC)
    const nfdName = "Nguyễn Văn An".normalize("NFD");
    expect(matchesSmartResidentSearch("Nguyễn Văn An".normalize("NFC"), [nfdName])).toBe(true);
    // Khớp SĐT / CCCD có khoảng trắng hoặc dấu chấm
    expect(matchesSmartResidentSearch("090 123 4567", ["0901234567"])).toBe(true);
    expect(matchesSmartResidentSearch("0790 9501", ["079095012345"])).toBe(true);
  });

  it("trích xuất động (Live Join) thông tin mới nhất từ CSDL Dân cư theo residentId", () => {
    const map = new Map([
      [
        "RES-1",
        {
          id: "RES-1",
          fullName: "TRẦN VĂN MỚI",
          birthDate: "12/05/1994",
          cccd: "079094001122",
          phone: "0909888777",
          currentAddress: "Nhà trọ 17/A3 Khu phố 3",
          status: "Tạm trú",
        },
      ],
    ]);
    const resolved = resolveLiveSupervisionRecord(
      {
        id: "ANTT-1",
        residentId: "RES-1",
        fullName: "Tên cũ",
        address: "Địa chỉ cũ",
        categories: ["an_treo"],
        startDateIso: "2026-01-01",
        assignedOfficer: "CSKV",
        status: "active",
        reintegration: {
          cccdAndResidency: false,
          jobReferral: false,
          policyLoan: false,
          legalCounseling: false,
        },
        checkins: [],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        updatedBy: "Admin",
      },
      map
    );
    expect(resolved.isLinkedToResidentDb).toBe(true);
    expect(resolved.fullName).toBe("TRẦN VĂN MỚI");
    expect(resolved.birthYear).toBe("1994");
    expect(resolved.address).toBe("Nhà trọ 17/A3 Khu phố 3");
    expect(resolved.phone).toBe("0909888777");
  });
});
