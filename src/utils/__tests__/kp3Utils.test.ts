import { describe, it, expect } from "vitest";
import {
  KP3_TO_LIST,
  extractToDanPho,
  formatDecimalVN,
  maskCccd,
  maskPhone,
  computeKp3PopulationMetrics,
  isEnterpriseRecord,
  isSmallBusinessOrHostel,
  generateKp3AssistantReply,
} from "../kp3Utils";
import type { Resident, Household, Business } from "../../types";

describe("kp3Utils", () => {
  it("exposes all 14 KP3 residential groups", () => {
    expect(KP3_TO_LIST).toHaveLength(14);
    expect(KP3_TO_LIST[0]).toBe("Tổ 1");
    expect(KP3_TO_LIST[13]).toBe("Tổ 14");
  });

  it("extracts To Dan Pho cleanly from address variants", () => {
    expect(extractToDanPho("09/B3, TỔ 3, KHU PHỐ 3")).toBe("Tổ 3");
    expect(extractToDanPho("Hẻm 124 đường KV AP12 TDP 12")).toBe("Tổ 12");
    expect(extractToDanPho("42/3 Lương Định Của")).toBe("Tổ 1");
  });

  it("formats Vietnamese decimal comma and masks PII by default", () => {
    expect(formatDecimalVN(66.7, 1)).toBe("66,7");
    expect(maskCccd("079068001234", false)).toBe("0790****1234");
    expect(maskCccd("079068001234", true)).toBe("079068001234");
    expect(maskPhone("0903829112", false)).toBe("0903***112");
  });

  it("reconciles official KP3 population without producing 0.0 avg/household", () => {
    const sampleResidents: Resident[] = [
      {
        id: "1",
        fullName: "Nguyễn Văn A",
        gender: "Nam",
        birthDate: "1980",
        cccd: "079080",
        phone: "0901",
        status: "Thường trú",
        occupation: "NV",
        address: "42/3 Lương Định Của",
        householdId: "HK-301",
        relationToOwner: "Chủ hộ",
      },
      {
        id: "2",
        fullName: "Trần Thị B",
        gender: "Nữ",
        birthDate: "1985",
        cccd: "079085",
        phone: "0902",
        status: "Thường trú",
        occupation: "NV",
        address: "42/3 Lương Định Của",
        householdId: "HK-301",
        relationToOwner: "Vợ",
      },
    ];
    const households: Household[] = [
      {
        id: "H1",
        code: "HK-301",
        ownerName: "Nguyễn Văn A",
        address: "42/3 Lương Định Của",
        memberCount: 2,
        members: [
          { name: "Nguyễn Văn A", relation: "Chủ hộ", cccd: "079080", birthYear: 1980 },
          { name: "Trần Thị B", relation: "Vợ", cccd: "079085", birthYear: 1985 },
        ],
      },
      {
        id: "H2",
        code: "HK-302",
        ownerName: "Lê Văn C",
        address: "56 Lương Định Của",
        memberCount: 4,
        members: [],
      },
    ];
    const metrics = computeKp3PopulationMetrics(sampleResidents, households);
    expect(metrics.officialPopulation).toBe(11632);
    expect(metrics.matchedHouseholdsCount).toBe(1);
    expect(metrics.avgPerDigitizedHouseholdLabel).toBe("2,0");
  });

  it("separates corporate DNNVV enterprises from household businesses & hostels", () => {
    const corp: Business = {
      id: "E1",
      name: "Công ty TNHH Giải pháp Phần mềm",
      type: "Công nghệ thông tin",
      businessType: "Công ty TNHH",
      owner: "Nguyễn Hoàng Nam",
      phone: "0932",
      address: "42/12 LĐC",
      licenseNumber: "0317892211",
      status: "Đang hoạt động",
      employeeCount: 25,
      safetyCertified: true,
    };
    const hostel: Business = {
      id: "B1",
      name: "Nhà trọ An Phú Khang",
      type: "Nhà trọ & Lưu trú",
      businessType: "Hộ kinh doanh",
      owner: "Nguyễn Văn X",
      phone: "0901",
      address: "42/5 LĐC",
      licenseNumber: "GP-1",
      status: "Đang hoạt động",
      employeeCount: 2,
      safetyCertified: true,
      isAccommodation: true,
    };
    expect(isEnterpriseRecord(corp)).toBe(true);
    expect(isSmallBusinessOrHostel(hostel)).toBe(true);
  });

  it("generates live KP3 assistant replies grounded in shared context", () => {
    const reply = generateKp3AssistantReply(
      "Tình hình quỹ VietQR hiện tại?",
      {
        residents: [],
        households: [],
        businesses: [],
        reports: [],
        welfareRecipients: [],
        fundContributions: [
          {
            id: "F1",
            householdCode: "HK-301",
            ownerName: "Hùng",
            fundName: "Quỹ Khuyến học",
            amount: 500000,
            status: "Đã nộp",
          },
        ],
        fundExpenditures: [],
        communityEvents: [],
        tasks: [],
      },
      "canbo"
    );
    expect(reply).toContain("500.000");
  });
});
