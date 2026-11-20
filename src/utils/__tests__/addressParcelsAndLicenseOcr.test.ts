import { describe, expect, it } from "vitest";
import { Business, Household } from "../../types";
import {
  extractKp3AddressKeys,
  getNormalizedLinkedHouseholdCodes,
  hasIntersectingAddressKeys,
  resolveCoLocatedEntities,
} from "../addressCoLocationUtils";
import {
  inheritParcelsFromHouseholds,
  normalizeEntityLandParcels,
  summarizeLandParcels,
} from "../landParcelsUtils";
import {
  inferBusinessTypeFromName,
  inferIndustryGroupFromText,
  parseBusinessLicenseText,
} from "../businessLicenseOcr";

describe("Address Co-Location & Merged Address Engine", () => {
  it("matches exact KP3 house numbers and rejects false substring matches like 142 or 42/15", () => {
    expect(
      hasIntersectingAddressKeys(
        "42 Lương Định Của, Khu phố 3, Phường An Phú",
        "Tầng 2, 42 Lương Định Của, KP3, An Phú"
      )
    ).toBe(true);

    expect(
      hasIntersectingAddressKeys(
        "42 Lương Định Của, Khu phố 3",
        "142 Lương Định Của, Khu phố 3"
      )
    ).toBe(false);

    expect(
      hasIntersectingAddressKeys(
        "42 Lương Định Của, Khu phố 3",
        "42/15 Lương Định Của, Khu phố 3"
      )
    ).toBe(false);
  });

  it("expands merged addresses (42-44 and 42 & 44) to match both adjacent households", () => {
    const mergedKeys = extractKp3AddressKeys("42-44 Lương Định Của, KP3, An Phú");
    const keys42 = extractKp3AddressKeys("42 Lương Định Của, KP3");
    const keys44 = extractKp3AddressKeys("44 Lương Định Của, KP3");

    expect(keys42.some((k) => mergedKeys.includes(k))).toBe(true);
    expect(keys44.some((k) => mergedKeys.includes(k))).toBe(true);
    expect(
      hasIntersectingAddressKeys(
        "42 & 44 Lương Định Của, KP3",
        "Số 44 Lương Định Của, Phường An Phú"
      )
    ).toBe(true);
  });

  it("normalizes linkedHouseholdCodes from both array and comma/plus-delimited string", () => {
    const codes = getNormalizedLinkedHouseholdCodes({
      linkedHouseholdCode: "hk-010, HK-011",
      linkedHouseholdCodes: ["HK-011", "hk-012"],
    });
    expect(codes).toEqual(["HK-011", "HK-012", "HK-010"]);
  });

  it("resolves 3-way co-located Households, Enterprises, and Hostels while ignoring unverified mock 272/55 defaults", () => {
    const households: Household[] = [
      {
        id: "hh-42",
        code: "HK-042",
        ownerName: "Nguyễn Văn A",
        address: "42 Lương Định Của, KP3, An Phú",
        memberCount: 4,
        members: [],
        toBanDo: "272",
        soThua: "101",
        dienTich: 120,
        soGcn: "CS08801",
      },
      {
        id: "hh-44",
        code: "HK-044",
        ownerName: "Trần Thị B",
        address: "44 Lương Định Của, KP3, An Phú",
        memberCount: 3,
        members: [],
        toBanDo: "272",
        soThua: "102",
        dienTich: 150,
        soGcn: "CS08802",
      },
      {
        id: "hh-142",
        code: "HK-142",
        ownerName: "Lê Văn Khác",
        address: "142 Lương Định Của, KP3, An Phú",
        memberCount: 5,
        members: [],
        toBanDo: "272",
        soThua: "55", // unverified default without real soGcn
      },
    ];

    const businesses: Business[] = [
      {
        id: "ent-1",
        name: "CÔNG TY TNHH THƯƠNG MẠI AN PHÚ THỊNH",
        businessType: "Công ty TNHH",
        type: "Thương mại tổng hợp",
        owner: "Nguyễn Văn A",
        taxCode: "0316889900",
        licenseNumber: "0316889900",
        address: "42-44 Lương Định Của, KP3, An Phú",
        phone: "0901000042",
        employeeCount: 18,
        status: "Đang hoạt động",
        safetyCertified: true,
        linkedHouseholdCodes: ["HK-042", "HK-044"],
      },
      {
        id: "hostel-1",
        name: "Nhà trọ Minh Tâm",
        type: "Nhà trọ cho thuê",
        isAccommodation: true,
        soPhong: 12,
        owner: "Nguyễn Văn A",
        licenseNumber: "HKD-41B8001",
        address: "Tầng 3, 42 Lương Định Của, KP3, An Phú",
        phone: "0901000042",
        employeeCount: 2,
        status: "Đang hoạt động",
        safetyCertified: true,
      },
      {
        id: "shop-142",
        name: "Tạp hóa 142",
        type: "Bán lẻ tạp hóa",
        owner: "Lê Văn Khác",
        licenseNumber: "HKD-142",
        address: "142 Lương Định Của, KP3, An Phú",
        phone: "0901000142",
        employeeCount: 1,
        status: "Đang hoạt động",
        safetyCertified: false,
        toBanDo: "272",
        soThua: "55", // unverified default should NOT link to 42/44
      },
    ];

    const bundleFromEnt = resolveCoLocatedEntities({
      focusBusiness: businesses[0],
      households,
      businesses,
    });

    expect(bundleFromEnt.households.map((h) => h.code)).toEqual(["HK-042", "HK-044"]);
    expect(bundleFromEnt.businesses.map((b) => b.id)).toEqual(["hostel-1"]);
    expect(bundleFromEnt.hostels.map((b) => b.id)).toEqual(["hostel-1"]);
    expect(bundleFromEnt.isMultiFunctional).toBe(true);
    expect(bundleFromEnt.allBusinessEntities.some((b) => b.id === "shop-142")).toBe(false);
  });
});

describe("Multi-Parcel & Multi-Certificate (02+ Sổ đỏ) Engine", () => {
  it("summarizes 2 merged parcels accurately with summed area and combined parcel numbers", () => {
    const hh1: Household = {
      id: "hh-1",
      code: "HK-010",
      ownerName: "Phạm Văn Bình",
      address: "17/A3 Khu phố 3",
      memberCount: 4,
      members: [],
      toBanDo: "272",
      soThua: "55",
      dienTich: 120,
      loaiDat: "ODT",
      soGcn: "CS09001",
      soDoFile: { name: "sodo1.jpg", type: "image", url: "data:image/jpeg;base64,AA==" },
    };

    const hh2: Household = {
      id: "hh-2",
      code: "HK-011",
      ownerName: "Phạm Thị Hoa",
      address: "17/A4 Khu phố 3",
      memberCount: 3,
      members: [],
      toBanDo: "272",
      soThua: "56",
      dienTich: 150.5,
      loaiDat: "ODT",
      soGcn: "CS09002",
      soDoFile: { name: "sodo2.pdf", type: "pdf", url: "data:application/pdf;base64,BB==" },
    };

    const { nextParcels, addedCount } = inheritParcelsFromHouseholds([hh1, hh2], []);
    expect(addedCount).toBe(2);
    expect(nextParcels).toHaveLength(2);

    // Re-inheriting the same households must not duplicate existing parcels
    const secondPass = inheritParcelsFromHouseholds([hh1, hh2], nextParcels);
    expect(secondPass.addedCount).toBe(0);
    expect(secondPass.nextParcels).toHaveLength(2);

    const summary = summarizeLandParcels(nextParcels);
    expect(summary.totalCount).toBe(2);
    expect(summary.isMergedParcels).toBe(true);
    expect(summary.totalArea).toBe(270.5);
    expect(summary.toBanDoSummary).toBe("272");
    expect(summary.soThuaSummary).toContain("55 + 56");
    expect(summary.soGcnSummary).toBe("CS09001; CS09002");
    expect(summary.primarySoDoFile?.name).toBe("sodo1.jpg");

    // Backward compatibility normalization from legacy single-parcel entity
    const legacyNormalized = normalizeEntityLandParcels(hh1);
    expect(legacyNormalized).toHaveLength(1);
    expect(legacyNormalized[0].soGcn).toBe("CS09001");
  });
});

describe("Business License & Enterprise ERC OCR Parser", () => {
  it("parses Enterprise Registration Certificate (ERC) fields accurately", () => {
    const sampleErcText = `
      SỞ KẾ HOẠCH VÀ ĐẦU TƯ THÀNH PHỐ HỒ CHÍ MINH
      PHÒNG ĐĂNG KÝ KINH DOANH
      GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP
      CÔNG TY TRÁCH NHIỆM HỮU HẠN HAI THÀNH VIÊN TRỞ LÊN
      Mã số doanh nghiệp: 0317998877
      Đăng ký lần đầu: ngày 15 tháng 08 năm 2023
      1. Tên công ty viết bằng tiếng Việt: CÔNG TY TNHH CÔNG NGHỆ SỐ AN PHÚ
      2. Địa chỉ trụ sở chính: 42-44 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
      Điện thoại: 0909123456   Email: contact@anphudigital.vn
      3. Vốn điều lệ: 5.000.000.000 đồng
      4. Người đại diện theo pháp luật: NGUYỄN MINH TUẤN
      Số căn cước công dân: 079088012345
      Ngành, nghề kinh doanh chính: Lập trình máy vi tính và tư vấn công nghệ thông tin
    `;

    const parsed = parseBusinessLicenseText(sampleErcText, "enterprise");
    expect(parsed.isOcrSuccess).toBe(true);
    expect(parsed.businessName).toBe("CÔNG TY TNHH CÔNG NGHỆ SỐ AN PHÚ");
    expect(parsed.licenseNumber).toBe("0317998877");
    expect(parsed.taxCode).toBe("0317998877");
    expect(parsed.issueDate).toBe("15/08/2023");
    expect(parsed.headquartersAddress).toContain("42-44 Lương Định Của");
    expect(parsed.legalRepresentative).toBe("NGUYỄN MINH TUẤN");
    expect(parsed.legalRepCccd).toBe("079088012345");
    expect(parsed.legalRepPhone).toBe("0909123456");
    expect(parsed.legalRepEmail).toBe("contact@anphudigital.vn");
    expect(inferBusinessTypeFromName(parsed.businessName, "enterprise")).toBe(
      "Công ty TNHH"
    );
  });

  it("parses Household Business License (GCN Đăng ký Hộ kinh doanh) and infers hostel industry group", () => {
    const sampleHkdText = `
      ỦY BAN NHÂN DÂN PHƯỜNG AN PHÚ
      PHÒNG KINH TẾ - HẠ TẦNG VÀ ĐÔ THỊ
      GIẤY CHỨNG NHẬN ĐĂNG KÝ HỘ KINH DOANH
      Số GCN: 41B8034567
      Đăng ký lần đầu, ngày 02 tháng 04 năm 2024
      1. Tên hộ kinh doanh: HỘ KINH DOANH NHÀ TRỌ AN PHÚ KHANG
      2. Địa điểm kinh doanh: 17/A3 Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
      Điện thoại: 0913137155
      3. Ngành, nghề kinh doanh: Dịch vụ lưu trú ngắn ngày, cho thuê phòng trọ
      4. Vốn kinh doanh: 800.000.000 đồng
      5. Chủ hộ kinh doanh: PHẠM VĂN BÌNH
      Số CCCD: 079075009988
    `;

    const parsed = parseBusinessLicenseText(sampleHkdText, "business");
    expect(parsed.isOcrSuccess).toBe(true);
    expect(parsed.businessName).toBe("HỘ KINH DOANH NHÀ TRỌ AN PHÚ KHANG");
    expect(parsed.licenseNumber).toBe("41B8034567");
    expect(parsed.issueDate).toBe("02/04/2024");
    expect(parsed.legalRepresentative).toBe("PHẠM VĂN BÌNH");
    expect(parsed.legalRepCccd).toBe("079075009988");
    expect(
      inferIndustryGroupFromText(`${parsed.businessName} ${parsed.businessLine || ""}`)
    ).toBe("Lưu trú & Cho thuê");
  });
});
