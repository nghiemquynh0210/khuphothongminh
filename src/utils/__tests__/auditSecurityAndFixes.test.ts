import { describe, expect, it, vi, afterEach } from "vitest";
import uploadStorageHandler from "../../../api/upload-storage";
import { extractTimemarkFromImage, parseTimemarkText } from "../timemarkParser";
import { parseHouseholdFormRoute, parseResidentFormRoute } from "../../routes";

function createMockRes() {
  const state: { statusCode: number; body: any } = { statusCode: 200, body: null };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.body = payload;
      return res;
    },
  };
  return { res, state };
}

describe("Security & Audit Root-Cause Regression Suite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks Stored XSS uploads (text/html and image/svg+xml) on /api/upload-storage", async () => {
    const htmlBase64 = Buffer.from("<script>alert(1)</script>", "utf8").toString("base64");
    const { res, state } = createMockRes();

    await uploadStorageHandler(
      {
        method: "POST",
        headers: { "x-real-ip": "127.0.0.10" },
        body: {
          bucket: "field-reports",
          path: "2026-11/xss.html",
          contentType: "text/html",
          fileBase64: htmlBase64,
        },
      },
      res
    );

    expect(state.statusCode).toBe(415);
    expect(state.body?.ok).toBe(false);
  });

  it("blocks MIME spoofing when fileBase64 magic bytes are HTML disguised as image/jpeg", async () => {
    const spoofedBase64 = Buffer.from("<html><body>spoof</body></html>", "utf8").toString("base64");
    const { res, state } = createMockRes();

    await uploadStorageHandler(
      {
        method: "POST",
        headers: { "x-real-ip": "127.0.0.11" },
        body: {
          bucket: "field-reports",
          path: "2026-11/spoof.jpg",
          contentType: "image/jpeg",
          fileBase64: spoofedBase64,
        },
      },
      res
    );

    expect(state.statusCode).toBe(415);
    expect(state.body?.ok).toBe(false);
  });

  it("enforces staff authentication (401/500) on internal bucket cadastral-docs", async () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64");
    const { res, state } = createMockRes();

    await uploadStorageHandler(
      {
        method: "POST",
        headers: { "x-real-ip": "127.0.0.12" },
        body: {
          bucket: "cadastral-docs",
          path: "2026-11/sodo.png",
          contentType: "image/png",
          fileBase64: validPng,
        },
      },
      res
    );

    expect([401, 500]).toContain(state.statusCode);
    expect(state.body?.ok).toBe(false);
  });

  it("never fabricates hardcoded coordinates when an image lacks Timemark & EXIF GPS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ available: false, data: null }),
      })
    );

    const plainPngDataUrl =
      "data:image/png;base64," +
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64");
    const result = await extractTimemarkFromImage(plainPngDataUrl, "random-screenshot.png");

    expect(result).toBeNull();
  });

  it("parses genuine Timemark watermark text accurately", () => {
    const parsed = parseTimemarkText(
      "10.935188°N, 106.743917°E\nThứ Bảy, 11 Tháng 4, 2026 14:43\nĐường Lương Định Của, P. An Phú\nTMK9876543210 Timemark Verified"
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.lat).toBeCloseTo(10.935188, 5);
    expect(parsed?.lng).toBeCloseTo(106.743917, 5);
    expect(parsed?.isVerified).toBe(true);
  });

  it("guards route parsers against malformed percent-encoding without throwing URIError", () => {
    expect(() => parseResidentFormRoute("/dashboard/residents/detail/%E0%A4%A")).not.toThrow();
    expect(() => parseHouseholdFormRoute("/dashboard/households/edit/%ZZ%99")).not.toThrow();
    const resRoute = parseResidentFormRoute("/dashboard/residents/detail/%E0%A4%A");
    expect(resRoute).toEqual({ mode: "detail", residentId: "%E0%A4%A" });
  });
});
