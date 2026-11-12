/**
 * Unit Tests — reportConfig (Phản ánh Hiện trường 1022 - KP3)
 */
import { describe, it, expect } from "vitest";
import {
  getAfterImages,
  getBeforeImages,
  getSlaStatus,
  maskPhoneForCitizen,
  normalizeReport,
  parseReportMetadataFromResponse,
  reportToTargetGisItem,
  serializeReportMetadata,
} from "../../data/reportConfig";
import type { FieldReport } from "../../types";

const baseReport: FieldReport = {
  id: "REP901",
  title: "Nắp hố ga hẻm 42 bị hở",
  category: "Hạ tầng đô thị",
  priority: "Khẩn cấp",
  slaHours: 4,
  reporterName: "Nguyễn Văn A",
  reporterPhone: "0918765432",
  reportedAt: "12/11/2026 08:00",
  location: "Trước số 42/8 Lương Định Của",
  coordinates: { x: 48, y: 38 },
  description: "Nắp cống kênh gây nguy hiểm xe qua lại.",
  status: "Đang xử lý",
  timeline: [
    {
      time: "12/11/2026 08:00",
      title: "Gửi phản ánh",
      description: "Gửi kèm ảnh",
      actor: "Nguyễn Văn A",
    },
  ],
  beforeImage: "https://example.com/before-1.jpg",
  beforeImages: [
    "https://example.com/before-1.jpg",
    "https://example.com/before-2.jpg",
  ],
  images: ["https://example.com/before-1.jpg", "https://example.com/before-3.jpg"],
  afterImages: ["https://example.com/after-1.jpg"],
  messages: [
    {
      id: "M1",
      senderRole: "canbo",
      senderName: "Lê Văn Sơn",
      content: "Tổ tự quản đã rào cảnh báo.",
      createdAt: "12/11/2026 08:20",
      isInternal: false,
    },
  ],
};

describe("reportConfig utilities", () => {
  it("deduplicates before and after images cleanly across legacy and new fields", () => {
    expect(getBeforeImages(baseReport)).toEqual([
      "https://example.com/before-1.jpg",
      "https://example.com/before-2.jpg",
      "https://example.com/before-3.jpg",
    ]);
    expect(getAfterImages(baseReport)).toEqual(["https://example.com/after-1.jpg"]);
  });

  it("computes SLA status accurately for on_track, warning, overdue, and completed", () => {
    const start = new Date(2026, 10, 12, 8, 0, 0).getTime();
    const deadlineIso = new Date(start + 4 * 3600 * 1000).toISOString();
    const rep = normalizeReport({ ...baseReport, slaDeadline: deadlineIso });

    expect(getSlaStatus(rep, start + 1 * 3600 * 1000).state).toBe("on_track");
    expect(getSlaStatus(rep, start + 3 * 3600 * 1000).state).toBe("warning");
    expect(getSlaStatus(rep, start + 6 * 3600 * 1000).state).toBe("overdue");
    expect(
      getSlaStatus({ ...rep, status: "Đã giải quyết" }, start + 10 * 3600 * 1000).state
    ).toBe("completed");
  });

  it("masks reporter phone number only when readOnly citizen mode is active", () => {
    expect(maskPhoneForCitizen("0918765432", true)).toBe("0918***432");
    expect(maskPhoneForCitizen("0918765432", false)).toBe("0918765432");
    expect(maskPhoneForCitizen("", true)).toBe("Ẩn danh");
  });

  it("converts report location into valid GIS TargetGisItem", () => {
    const target = reportToTargetGisItem(baseReport);
    expect(target.id).toBe("REP901");
    expect(target.name).toContain("Nắp hố ga");
    expect(typeof target.lat).toBe("number");
    expect(typeof target.lng).toBe("number");
    expect(target.navigateRoute).toBe(true);
  });

  it("serializes and parses metadata payload inside response_content with plain-text fallback", () => {
    const rawJson = serializeReportMetadata(baseReport, "Đã hoàn tất");
    const parsed = parseReportMetadataFromResponse(rawJson);
    expect(parsed.note).toBe("Đã hoàn tất");
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.afterImages).toEqual(["https://example.com/after-1.jpg"]);

    const plainParsed = parseReportMetadataFromResponse("Đã dọn rác lúc 14h.");
    expect(plainParsed.note).toBe("Đã dọn rác lúc 14h.");
  });
});

