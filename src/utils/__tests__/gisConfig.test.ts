/**
 * Unit Tests — gisConfig (Bản đồ GIS & 14 Tổ Dân Phố KP3)
 */
import { describe, it, expect } from "vitest";
import {
  KP3_14_ZONES,
  detectToDanPhoFromCoord,
  extractToDanPhoNumber,
  formatLatLngVN,
  generateToAwareCoordinates,
  mapFieldReportToGisPin,
  sanitizePinForCitizen,
} from "../../data/gisConfig";
import { KP3_CENTER } from "../gisUtils";
import type { FieldReport } from "../../types";
import type { GisPin } from "../../components/gis/gisTypes";

describe("gisConfig KP3 14 Tổ Dân Phố & helpers", () => {
  it("contains all 14 Tổ Dân Phố zones numbered 1..14", () => {
    expect(KP3_14_ZONES).toHaveLength(14);
    expect(KP3_14_ZONES.map((z) => z.toNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
  });

  it("extracts Tổ number from KP3 addresses and ignores external localities", () => {
    expect(extractToDanPhoNumber("Số 18 Đường X1, Tổ 8, Khu phố 3")).toBe(8);
    expect(extractToDanPhoNumber("TDP 12 Phường An Phú")).toBe(12);
    expect(extractToDanPhoNumber("Ấp 2, Xã Vĩnh Tân, Tổ 4")).toBeNull();
    expect(
      extractToDanPhoNumber("Không ghi tổ", KP3_CENTER.lat, KP3_CENTER.lng)
    ).toBeGreaterThanOrEqual(1);
  });

  it("detects matching Tổ zone from WGS-84 coordinate and returns null outside KP3", () => {
    const zone12 = KP3_14_ZONES.find((z) => z.toNumber === 12)!;
    const detected = detectToDanPhoFromCoord(zone12.center.lat, zone12.center.lng);
    expect(detected?.toNumber).toBe(12);
    expect(detectToDanPhoFromCoord(11.15, 106.5)).toBeNull();
  });

  it("generates deterministic Tổ-aware coordinates inside target zone", () => {
    const coordA = generateToAwareCoordinates("Hẻm Tổ 5, Khu phố 3", "HH-101");
    const coordB = generateToAwareCoordinates("Hẻm Tổ 5, Khu phố 3", "HH-101");
    expect(coordA).toEqual(coordB);
    const detected = detectToDanPhoFromCoord(coordA.lat, coordA.lng);
    expect(detected?.toNumber).toBe(5);
  });

  it("maps FieldReport to GisPin with explicit or Tổ-aware coordinates", () => {
    const report: FieldReport = {
      id: "REP-GIS-1",
      title: "Đèn đường tắt hẻm Tổ 14",
      category: "Hạ tầng đô thị",
      priority: "Khẩn cấp",
      slaHours: 4,
      reporterName: "Trần Văn B",
      reporterPhone: "0909123456",
      reportedAt: "12/11/2026 09:00",
      location: "Đường PKV AP28, Tổ 14, Khu phố 3",
      alleyGroup: "Nhóm PKV AP28",
      coordinates: { x: 40, y: 60 },
      description: "Bóng đèn LED bị nhấp nháy tắt hoàn toàn.",
      status: "Đang xử lý",
      timeline: [],
    };
    const pin = mapFieldReportToGisPin(report);
    expect(pin.type).toBe("report");
    expect(pin.toNumber).toBe(14);
    expect(pin.status).toBe("Khẩn cấp");
    expect(pin.lat).toBeGreaterThan(10.9);
    expect(pin.lng).toBeGreaterThan(106.7);
  });

  it("sanitizes household and report PII when readOnly citizen mode is active", () => {
    const hhPin: GisPin = {
      id: "HH_1",
      type: "household",
      name: "HK-301 · Nguyễn Văn Hùng",
      location: "42/5 Đường X1, Tổ 8, Khu phố 3",
      status: "Hoạt động",
      lat: 10.9365,
      lng: 106.745,
      toNumber: 8,
      details: "4 nhân khẩu",
    };
    const safeHh = sanitizePinForCitizen(hhPin);
    expect(safeHh.name).not.toContain("Nguyễn Văn Hùng");
    expect(safeHh.location).not.toContain("42/5");

    const camPin: GisPin = {
      id: "CAM_1",
      type: "camera",
      name: "Camera Tổ 12",
      location: "Giao lộ ĐT.743B",
      status: "Hoạt động",
      lat: 10.937,
      lng: 106.7435,
      details: "Camera 4MP",
    };
    expect(sanitizePinForCitizen(camPin)).toEqual(camPin);
  });

  it("formats coordinates using Vietnamese comma decimal style", () => {
    expect(formatLatLngVN(10.937012, 106.744734)).toBe("10,9370° B · 106,7447° Đ");
  });
});

