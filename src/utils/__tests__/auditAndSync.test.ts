// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  applyBusinessExtendedMeta,
  applyResidentExtendedMeta,
  extractBusinessMeta,
  extractHouseholdMeta,
  extractResidentExtendedMeta,
  hydrateHouseholdFromDbRow,
} from "../supabaseSync";
import { getCachedAuditLogs, recordAuditLog } from "../auditLogger";
import {
  buildTemporaryHouseholdsFromResidents,
  calculateResidentAge,
  formatCompactKp3Address,
} from "../householdRecognitionUtils";
import {
  matchAssociationFromText,
  matchResidentByAppointee,
} from "../decisionDocumentOcr";
import { Association, Business, Household, Resident } from "../../types";

describe("Audit Logger & Extended Cloud Metadata Persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("records and retrieves Nghị định 13/2023/NĐ-CP audit logs cleanly", async () => {
    await recordAuditLog({
      actorName: "Bí thư Nghiêm Xuân Quỳnh",
      actorRole: "Quản trị viên KP3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất danh sách cư dân sắp hết hạn tạm trú",
      targetSummary: "253 nhân khẩu tạm trú (≤ 30 ngày)",
    });

    const logs = getCachedAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].actorName).toBe("Bí thư Nghiêm Xuân Quỳnh");
    expect(logs[0].category).toBe("DATA_EXPORT");
    expect(logs[0].targetSummary).toContain("253 nhân khẩu");
  });

  it("extracts and rehydrates extended resident fields (education, BHYT, foreigner TRC) without fabricating defaults", () => {
    const sampleResident: Resident = {
      id: "res-001",
      fullName: "Kim Min Jun",
      gender: "Nam",
      birthDate: "15/04/1988",
      cccd: "B98123456",
      phone: "0909112233",
      status: "Tạm trú",
      occupation: "Kỹ sư",
      address: "17/A3 Khu phố 3, Phường An Phú",
      householdId: "HK-102",
      relationToOwner: "Khách thuê",
      education: "Đại học",
      healthInsuranceNumber: "DN47900112233",
      isForeigner: true,
      nationality: "Hàn Quốc",
      passportNumber: "M12345678",
      visaOrCardType: "Thẻ tạm trú (TRC)",
      visaValidUntil: "2027-12-31",
    };

    const ext = extractResidentExtendedMeta(sampleResident);
    expect(ext.education).toBe("Đại học");
    expect(ext.isForeigner).toBe(true);
    expect(ext.passportNumber).toBe("M12345678");
    expect(ext.maritalStatus).toBeUndefined(); // Không tự bịa "Đã kết hôn"

    const hydrated = applyResidentExtendedMeta(
      { ...sampleResident, education: undefined, isForeigner: undefined, passportNumber: undefined },
      { B98123456: ext }
    );
    expect(hydrated.education).toBe("Đại học");
    expect(hydrated.isForeigner).toBe(true);
    expect(hydrated.passportNumber).toBe("M12345678");
  });

  it("preserves household auditHistory across DB notes serialization", () => {
    const hh: Household = {
      id: "hh-1",
      code: "HK-001",
      ownerName: "Nguyễn Văn An",
      address: "12 Lương Định Của, Khu phố 3",
      memberCount: 4,
      type: "Thường trú",
      members: [],
      toBanDo: "272",
      soThua: "55",
    };
    (hh as any).auditHistory = [
      { id: "AUD-1", action: "Nhập thêm thành viên", date: "17/11/2026" },
    ];

    const meta = extractHouseholdMeta(hh);
    expect(meta.cadastral_meta.auditHistory).toHaveLength(1);

    const hydrated = hydrateHouseholdFromDbRow({
      id: "hh-1",
      code: "HK-001",
      owner_name: "Nguyễn Văn An",
      address: "12 Lương Định Của, Khu phố 3",
      member_count: 4,
      notes: `__kp3_meta__:${JSON.stringify(meta)}`,
    });
    expect((hydrated as any).auditHistory).toHaveLength(1);
    expect((hydrated as any).auditHistory[0].action).toBe("Nhập thêm thành viên");
  });

  it("preserves business PCCC inspections, enterprise legal rep, and supportNeeds", () => {
    const biz: Business = {
      id: "biz-1",
      internalCode: "DN-KP3-009",
      name: "Công ty TNHH Công Nghệ An Phú",
      type: "Công ty TNHH",
      businessType: "Công ty TNHH",
      owner: "Trần Quốc Bảo",
      phone: "0918001122",
      address: "28 Song Hành, Khu phố 3",
      licenseNumber: "0316889900",
      taxCode: "0316889900",
      safetyCertified: true,
      status: "Đang hoạt động",
      employeeCount: 25,
      legalRepresentative: "Trần Quốc Bảo",
      legalRepPhone: "0918001122",
      supportNeeds: ["Hỗ trợ thuế điện tử", "PCCC cơ sở"],
      inspections: [
        {
          id: "INSP-01",
          date: "2026-11-10",
          inspector: "Đội Cảnh sát PCCC KV30",
          type: "PCCC",
          result: "Đạt",
          notes: "Trang bị đủ bình chữa cháy xách tay và đèn sự cố",
        } as any,
      ],
    };

    const meta = extractBusinessMeta(biz);
    expect(meta.cadastral_meta.inspections).toHaveLength(1);
    expect(meta.cadastral_meta.legalRepresentative).toBe("Trần Quốc Bảo");
    expect(meta.cadastral_meta.supportNeeds).toContain("PCCC cơ sở");

    const rehydrated = applyBusinessExtendedMeta(
      { ...biz, inspections: undefined, legalRepresentative: undefined, supportNeeds: undefined },
      { internal_code: "DN-KP3-009" },
      { "DN-KP3-009": meta }
    );
    expect(rehydrated.inspections).toHaveLength(1);
    expect(rehydrated.legalRepresentative).toBe("Trần Quốc Bảo");
    expect(rehydrated.supportNeeds).toHaveLength(2);
  });

  it("builds temporary households (CT08) cleanly from temporary residents and separates independent vs hostel clusters", () => {
    const permanentHh: Household = {
      id: "hh-perm-1",
      code: "25975-006539",
      ownerName: "Lê Văn Tuyền",
      address: "14A/C1, khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
      memberCount: 2,
      type: "Thường trú",
      members: [],
    };

    const residentsSample: Resident[] = [
      {
        id: "r-tt-1",
        fullName: "Nguyễn Quốc Dĩ",
        gender: "Nam",
        birthDate: "10/05/1991",
        cccd: "091206005609",
        phone: "0909123456",
        status: "Tạm trú",
        occupation: "",
        address: "21A/A9 khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
        currentAddress: "21A/A9 khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
        permanentAddress: "Xã Giồng Riềng, Tỉnh An Giang",
        householdId: "Tạm trú",
        relationToOwner: "Người đứng tên tạm trú",
        temporaryExpDate: "01/01/2020", // expired
      },
      {
        id: "r-tt-2",
        fullName: "Phan Văn Hậu",
        gender: "Nam",
        birthDate: "12/08/2018",
        cccd: "089205008524",
        phone: "",
        status: "Tạm trú",
        occupation: "",
        address: "21A/A9, khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
        currentAddress: "21A/A9, khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
        householdId: "Tạm trú",
        relationToOwner: "Thành viên tạm trú",
        temporaryExpDate: "25/12/2028",
      },
      {
        id: "r-hostel-1",
        fullName: "Phạm Thị Phương Thảo",
        gender: "Nữ",
        birthDate: "20/03/2001",
        cccd: "042304004760",
        phone: "0913771642",
        status: "Tạm trú",
        occupation: "",
        address: "Nhà trọ Dương Văn Năng (sđt 0913771642), địa chỉ 8/C6, khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
        currentAddress: "Nhà trọ Dương Văn Năng (sđt 0913771642), địa chỉ 8/C6, khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
        householdId: "Tạm trú",
        relationToOwner: "Người đứng tên tạm trú",
        temporaryExpDate: "18/08/2028",
      },
    ];

    const built = buildTemporaryHouseholdsFromResidents(residentsSample, [permanentHh]);
    expect(built.mergedHouseholds).toHaveLength(3); // 1 Thường trú + 2 Tạm trú
    expect(built.tempStats.totalTempHouseholds).toBe(2);
    expect(built.tempStats.independentTempHouseholds).toBe(1);
    expect(built.tempStats.hostelTempHouseholds).toBe(1);
    expect(built.tempStats.expiredTempHouseholds).toBe(1);

    const indepHh = built.mergedHouseholds.find(
      (h) => h.type === "Tạm trú" && h.tempSubType === "independent"
    );
    expect(indepHh?.ownerName).toBe("Nguyễn Quốc Dĩ");
    expect(indepHh?.memberCount).toBe(2);
    expect(indepHh?.code).toMatch(/^TT-\d{4}$/);
    expect(built.updatedResidents[0].householdId).toBe(indepHh?.code);

    const hostelHh = built.mergedHouseholds.find(
      (h) => h.type === "Tạm trú" && h.tempSubType === "hostel"
    );
    expect(hostelHh?.hostelName).toContain("Dương Văn Năng");
    expect(hostelHh?.hostelPhone).toBe("0913771642");
  });

  it("formats compact KP3 addresses, calculates real age, and matches Decision OCR targets", () => {
    expect(
      formatCompactKp3Address("20/A6, Đường X3, Khu Phố 3, Phường An Phú, Thành phố Hồ Chí Minh")
    ).toBe("20/A6, Đường X3, KP3");
    expect(calculateResidentAge("06/11/2022")).toBeGreaterThanOrEqual(3);
    expect(calculateResidentAge("Chưa cập nhật")).toBeNull();

    const mockAssocs: Association[] = [
      {
        id: "ASC_BDH",
        name: "Ban Điều hành Khu phố 3",
        category: "Chính quyền cơ sở",
        description: "",
        leaderName: "Nguyễn Trung Huy",
        leaderCccd: "079088001122",
        members: [],
      },
      {
        id: "ASC_PN",
        name: "Chi hội Phụ nữ",
        category: "Đoàn thể nhân dân",
        description: "",
        leaderName: "Trần Thị Mai",
        leaderCccd: "079185002233",
        members: [],
      },
    ];

    expect(
      matchAssociationFromText("Về việc công nhận Trưởng Khu phố 3 nhiệm kỳ 2025-2030", mockAssocs)
    ).toBe("ASC_BDH");
    expect(
      matchAssociationFromText("Kiện toàn Ban chấp hành Chi hội Phụ nữ Khu phố 3", mockAssocs)
    ).toBe("ASC_PN");

    const resMatch = matchResidentByAppointee(
      { fullName: "NGUYEN TRUNG HUY" },
      [
        {
          id: "r1",
          fullName: "Nguyễn Trung Huy",
          gender: "Nam",
          birthDate: "15/06/1988",
          cccd: "079088001122",
          phone: "0962037937",
          status: "Thường trú",
          occupation: "",
          address: "KP3",
          householdId: "25975-001",
          relationToOwner: "Chủ hộ",
        },
      ]
    );
    expect(resMatch?.cccd).toBe("079088001122");
  });
});
