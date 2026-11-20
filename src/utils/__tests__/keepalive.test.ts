import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import keepAliveHandler, { resetKeepAliveThrottleForTests } from "../../../api/keepalive";

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = null;
  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get jsonBody() {
      return jsonBody;
    },
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      jsonBody = payload;
      return this;
    },
  };
}

describe("api/keepalive serverless anti-pause endpoint", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    resetKeepAliveThrottleForTests();
    process.env.VITE_SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "test-anon-jwt";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  it("rejects POST requests with 405 and sets strict no-store headers", async () => {
    const res = createMockRes();
    await keepAliveHandler({ method: "POST", headers: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers["cache-control"]).toContain("no-store");
  });

  it("queries Supabase PostgREST portal_settings and throttles rapid non-cron calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ key: "public_kp3_stats", updated_at: "2026-11-15T00:00:00Z" }],
    } as any);

    const res1 = createMockRes();
    await keepAliveHandler({ method: "GET", headers: {} }, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.jsonBody.ok).toBe(true);
    expect(res1.jsonBody.supabaseStatus).toBe(200);
    expect(res1.jsonBody.rowsChecked).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Rapid second HTTP call within 60s returns cached health without spamming DB
    const res2 = createMockRes();
    await keepAliveHandler({ method: "GET", headers: {} }, res2);
    expect(res2.statusCode).toBe(200);
    expect(res2.jsonBody.throttled).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Vercel Cron call always bypasses throttle and hits PostgreSQL directly
    const resCron = createMockRes();
    await keepAliveHandler(
      { method: "GET", headers: { "x-vercel-cron": "1" } },
      resCron
    );
    expect(resCron.statusCode).toBe(200);
    expect(resCron.jsonBody.trigger).toBe("vercel-cron");
    expect(resCron.jsonBody.throttled).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns 503 when Supabase responds with an error status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({}),
    } as any);

    const res = createMockRes();
    await keepAliveHandler({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody.ok).toBe(false);
    expect(res.jsonBody.supabaseStatus).toBe(502);
  });
});
