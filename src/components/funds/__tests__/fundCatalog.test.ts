import { describe, it, expect } from "vitest";
import {
  DEFAULT_FUND_CATEGORIES,
  docSoTiengViet,
  doesRecordMatchCategory,
  findCategoryByFundName,
  formatReceiptCode,
  inferPayerMeta,
  mergeDiscoveredFundCategories,
} from "../fundCatalog";
import { FundCategory, FundContribution } from "../../../types";

describe("fundCatalog helpers", () => {
  it("matches canonical and alias fund names accurately", () => {
    const matched = findCategoryByFundName(
      DEFAULT_FUND_CATEGORIES,
      "Quỹ An ninh Quốc phòng"
    );
    expect(matched?.code).toBe("ANQP");
    expect(matched?.name).toBe("Quỹ Quốc phòng an ninh");

    expect(
      doesRecordMatchCategory(
        "Quỹ An ninh Quốc phòng",
        matched as FundCategory,
        DEFAULT_FUND_CATEGORIES
      )
    ).toBe(true);
  });

  it("discovers unknown fund names from live records without duplicating known aliases", () => {
    const contributions: FundContribution[] = [
      {
        id: "uuid-1",
        householdCode: "HK-301",
        ownerName: "Nguyễn Văn Hùng",
        fundName: "Quỹ An ninh Quốc phòng",
        amount: 120000,
        status: "Đã nộp",
      },
      {
        id: "uuid-2",
        householdCode: "HK-302",
        ownerName: "Lê Thị Hồng Sâm",
        fundName: "Quỹ Camera Hẻm 42",
        amount: 300000,
        status: "Đã nộp",
      },
    ];

    const merged = mergeDiscoveredFundCategories(
      DEFAULT_FUND_CATEGORIES,
      contributions,
      []
    );
    expect(merged.length).toBe(DEFAULT_FUND_CATEGORIES.length + 1);
    expect(merged.some((c) => c.name === "Quỹ Camera Hẻm 42")).toBe(true);
  });

  it("shortens raw UUIDs into readable voucher codes and preserves custom codes", () => {
    expect(
      formatReceiptCode("8726d2c5-4b5c-40e7-8a06-8f828cbb787a", undefined, "BL")
    ).toBe("BL-8726D2C5");
    expect(
      formatReceiptCode("8726d2c5-4b5c-40e7-8a06-8f828cbb787a", "PT-2026-01", "BL")
    ).toBe("PT-2026-01");
    expect(formatReceiptCode("FD001", undefined, "BL")).toBe("FD001");
  });

  it("distinguishes households from enterprises and organizations cleanly", () => {
    const company = inferPayerMeta({
      id: "1",
      householdCode: "N/A",
      ownerName: "Công ty Môi trường Đô thị",
      fundName: "Quỹ Hoạt động Khu phố",
      amount: 1500000,
      status: "Đã nộp",
    });
    expect(company.isHousehold).toBe(false);
    expect(company.label).toContain("Doanh nghiệp");

    const household = inferPayerMeta({
      id: "2",
      householdCode: "HK-301",
      ownerName: "Nguyễn Văn Hùng",
      fundName: "Quỹ Khuyến học",
      amount: 500000,
      status: "Đã nộp",
    });
    expect(household.isHousehold).toBe(true);
    expect(household.codeLabel).toBe("Mã HK: HK-301");
  });

  it("reads negative and positive Vietnamese currency text correctly", () => {
    expect(docSoTiengViet(0)).toBe("Không đồng");
    expect(docSoTiengViet(150000)).toBe("Một trăm năm mươi nghìn đồng chẵn");
    expect(docSoTiengViet(-500000)).toBe("Âm Năm trăm nghìn đồng chẵn");
  });
});

