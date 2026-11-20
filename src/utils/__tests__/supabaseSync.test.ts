import { describe, expect, it } from "vitest";
import {
  applyBusinessExtendedMeta,
  extractBusinessMeta,
  extractHouseholdMeta,
  hydrateHouseholdFromDbRow,
} from "../supabaseSync";
import type { Business, Household } from "../../types";

describe("supabaseSync Cadastral OCR & Timemark GPS persistence helpers", () => {
  it("round-trips household cadastral & timemark metadata via native JSONB columns", () => {
    const sampleHousehold: Household = {
      id: "d2f78819-2468-4029-a5dd-f1489cb0f2e8",
      code: "HK-302",
      ownerName: "Nguyễn Văn Hùng",
      address: "17/A3 Khu phố 3, Phường An Phú",
      memberCount: 4,
      type: "Thường trú",
      coordinates: "10.7935, 106.7445",
      members: [],
      toBanDo: "272",
      soThua: "55",
      dienTich: 150,
      loaiDat: "ODT",
      soGcn: "CH-098234",
      timemarkHash: "N9ULW4DEHPT33Y",
      timemarkVerified: true,
      photoDirection: "71° E",
      photoElevation: "37.1m",
      photoTakenAt: "15/11/2026 09:30",
    };

    const { cadastral_meta, timemark_meta } = extractHouseholdMeta(sampleHousehold);
    const hydrated = hydrateHouseholdFromDbRow({
      id: sampleHousehold.id,
      code: sampleHousehold.code,
      owner_name: sampleHousehold.ownerName,
      address: sampleHousehold.address,
      member_count: sampleHousehold.memberCount,
      coordinates: sampleHousehold.coordinates,
      notes: null,
      cadastral_meta,
      timemark_meta,
    });

    expect(hydrated.toBanDo).toBe("272");
    expect(hydrated.soThua).toBe("55");
    expect(hydrated.dienTich).toBe(150);
    expect(hydrated.loaiDat).toBe("ODT");
    expect(hydrated.soGcn).toBe("CH-098234");
    expect(hydrated.timemarkVerified).toBe(true);
    expect(hydrated.timemarkHash).toBe("N9ULW4DEHPT33Y");
    expect(hydrated.photoDirection).toBe("71° E");
  });

  it("hydrates household cadastral & timemark metadata from notes envelope fallback", () => {
    const envelope =
      "__kp3_meta__:" +
      JSON.stringify({
        cadastral_meta: { toBanDo: "18", soThua: "102", dienTich: 92, type: "Tạm trú" },
        timemark_meta: { timemarkVerified: true, timemarkHash: "TMK999" },
      });

    const hydrated = hydrateHouseholdFromDbRow({
      id: "49872208-f88d-4b7a-a270-d4802253a3a7",
      code: "HK-303",
      owner_name: "Trần Thị Lan",
      address: "Hẻm 42 Lương Định Của",
      member_count: 3,
      coordinates: null,
      notes: envelope,
    });

    expect(hydrated.type).toBe("Tạm trú");
    expect(hydrated.toBanDo).toBe("18");
    expect(hydrated.soThua).toBe("102");
    expect(hydrated.dienTich).toBe(92);
    expect(hydrated.timemarkVerified).toBe(true);
    expect(hydrated.timemarkHash).toBe("TMK999");
  });

  it("extracts and applies business cadastral & timemark metadata cleanly", () => {
    const baseBiz: Business = {
      id: "a0000000-0000-0000-0000-000000000001",
      internalCode: "HKD-KP3-001",
      name: "Nhà trọ Phạm Văn Bình",
      type: "Hộ kinh doanh",
      owner: "Phạm Văn Bình",
      phone: "0913137155",
      address: "17/A3 Khu phố 3",
      licenseNumber: "GPKD-41B801",
      status: "Đang hoạt động",
      employeeCount: 2,
      safetyCertified: true,
      toBanDo: "272",
      soThua: "55",
      dienTich: 210,
      loaiDat: "ODT",
      linkedHouseholdCode: "HK-302",
      timemarkVerified: true,
      timemarkHash: "BIZTMK01",
      photoDirection: "120° SE",
    };

    const { cadastral_meta, timemark_meta } = extractBusinessMeta(baseBiz);
    const stripped: Business = {
      ...baseBiz,
      toBanDo: undefined,
      soThua: undefined,
      dienTich: undefined,
      loaiDat: undefined,
      linkedHouseholdCode: undefined,
      timemarkVerified: undefined,
      timemarkHash: undefined,
      photoDirection: undefined,
    };

    const hydrated = applyBusinessExtendedMeta(
      stripped,
      { internal_code: "HKD-KP3-001" },
      { "HKD-KP3-001": { cadastral_meta, timemark_meta } }
    );

    expect(hydrated.toBanDo).toBe("272");
    expect(hydrated.soThua).toBe("55");
    expect(hydrated.dienTich).toBe(210);
    expect(hydrated.linkedHouseholdCode).toBe("HK-302");
    expect(hydrated.timemarkVerified).toBe(true);
    expect(hydrated.timemarkHash).toBe("BIZTMK01");
    expect(hydrated.photoDirection).toBe("120° SE");
  });
});
