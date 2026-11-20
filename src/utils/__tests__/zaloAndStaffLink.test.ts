import { describe, it, expect, vi, beforeEach } from "vitest";
import notificationsHandler, {
  ZALO_OA_KP3_DEFAULTS,
  findMatchingZaloFollower,
  parseMeetingStartVnInfo,
} from "../../../api/notifications";
import staffAdminHandler from "../../../api/staff-admin";

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("Zalo OA Notifications & Staff-Resident Linkage APIs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.VITE_SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("GET /api/notifications returns official verified KP3 Zalo OA metadata", async () => {
    const req = { method: "GET", headers: {} };
    const res = createMockRes();
    await notificationsHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.ok).toBe(true);
    expect(res.body?.oa?.oaId).toBe("3124278810088361494");
    expect(res.body?.oa?.oaUrl).toBe("https://zalo.me/bdhkhupho3");
    expect(res.body?.oa?.linkedAppId).toBe(ZALO_OA_KP3_DEFAULTS.linkedAppId);
  });

  it("POST /api/notifications rejects unauthenticated admin action (save_config) with 401", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "save_config", remindDaysThreshold: 15 },
    };
    const res = createMockRes();
    await notificationsHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body?.ok).toBe(false);
  });

  it("POST /api/notifications accepts Zalo OA Webhook follow event with 200 OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );
    const req = {
      method: "POST",
      headers: {},
      body: {
        event_name: "follow",
        follower: { id: "zalo_user_12345" },
      },
    };
    const res = createMockRes();
    await notificationsHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.ok).toBe(true);
    expect(res.body?.received).toBe(true);
  });

  it("POST /api/staff-admin verify_cadre_resident validates 12-digit CCCD input", async () => {
    const req = {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.99" },
      body: { action: "verify_cadre_resident", cccd: "123" },
    };
    const res = createMockRes();
    await staffAdminHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body?.ok).toBe(false);
  });

  it("POST /api/notifications scan_or_send_cadre_meeting_reminders requires staff or cron auth", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "scan_or_send_cadre_meeting_reminders", dryRun: true },
    };
    const res = createMockRes();
    await notificationsHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body?.ok).toBe(false);
  });

  it("parseMeetingStartVnInfo calculates exact 60-minute pre-meeting reminder window in Vietnam Time (UTC+7)", () => {
    const nowAt1315Vn = Date.parse("2026-11-18T13:15:00+07:00");
    const infoInWindow = parseMeetingStartVnInfo("2026-11-18", "14:00 - 16:30", 60, nowAt1315Vn);
    expect(infoInWindow.remindAtHHmm).toBe("13:00");
    expect(infoInWindow.minutesUntilStart).toBe(45);
    expect(infoInWindow.inRemindWindow).toBe(true);

    const nowAt1230Vn = Date.parse("2026-11-18T12:30:00+07:00");
    const infoTooEarly = parseMeetingStartVnInfo("2026-11-18", "14:00 - 16:30", 60, nowAt1230Vn);
    expect(infoTooEarly.remindAtHHmm).toBe("13:00");
    expect(infoTooEarly.minutesUntilStart).toBe(90);
    expect(infoTooEarly.inRemindWindow).toBe(false);
  });

  it("findMatchingZaloFollower matches KP3 cadres against real Zalo display names", () => {
    const followers = [
      { zaloUserId: "8204901768555080728", displayName: "Nghiêm Quỳnh", followedAt: "" },
      { zaloUserId: "6920129842444200396", displayName: "Nguyễn Trung Huy", followedAt: "" },
      { zaloUserId: "4080370657469274213", displayName: "My Dung", followedAt: "" },
    ];
    expect(findMatchingZaloFollower("NGHIÊM XUÂN QUỲNH", "0825681868", followers)?.zaloUserId).toBe(
      "8204901768555080728"
    );
    expect(findMatchingZaloFollower("Nguyễn Trung Huy", "", followers)?.zaloUserId).toBe(
      "6920129842444200396"
    );
    expect(findMatchingZaloFollower("TRẦN THỊ MỸ DUNG", "", followers)?.zaloUserId).toBe(
      "4080370657469274213"
    );
  });
});
