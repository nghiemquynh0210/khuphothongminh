import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import staffAdminHandler from "../../../api/staff-admin";

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any = null;
  return {
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
    getStatus: () => statusCode,
    getBody: () => body,
    getHeaders: () => headers,
  };
}

describe("api/staff-admin serverless handler", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("validates required fields and phone digits on POST action=register", async () => {
    const res = createMockRes();
    await staffAdminHandler(
      {
        method: "POST",
        body: {
          action: "register",
          fullName: "Nguyễn Văn A",
          email: "canbo@kp3.vn",
          phone: "123",
          password: "password123",
        },
      },
      res
    );

    expect(res.getStatus()).toBe(400);
    expect(res.getBody().ok).toBe(false);
    expect(res.getBody().error).toContain("Số điện thoại");
  });

  it("returns 409 ALREADY_PENDING when registering an email already pending approval", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "u-1",
          email: "pending@kp3.vn",
          full_name: "Cán Bộ Chờ Duyệt",
          role: "cadre",
          approval_status: "pending",
        },
      ],
    }) as any;

    const res = createMockRes();
    await staffAdminHandler(
      {
        method: "POST",
        body: {
          action: "register",
          fullName: "Cán Bộ Chờ Duyệt",
          email: "pending@kp3.vn",
          phone: "0909123456",
          position: "Chi ủy viên / Đảng viên",
          password: "password123",
        },
      },
      res
    );

    expect(res.getStatus()).toBe(409);
    expect(res.getBody().code).toBe("ALREADY_PENDING");
  });

  it("blocks non-admin cadre from approving or revoking staff accounts on PATCH", async () => {
    global.fetch = vi
      .fn()
      // 1. /auth/v1/user
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "cadre-1", email: "cadre@kp3.vn" }),
      })
      // 2. /rest/v1/user_profiles?id=eq.cadre-1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "cadre-1",
            email: "cadre@kp3.vn",
            full_name: "Cán bộ Thường",
            role: "cadre",
            approval_status: "approved",
          },
        ],
      }) as any;

    const res = createMockRes();
    await staffAdminHandler(
      {
        method: "PATCH",
        headers: { authorization: "Bearer valid-cadre-token" },
        body: { cadreId: "target-2", action: "approve" },
      },
      res
    );

    expect(res.getStatus()).toBe(403);
    expect(res.getBody().ok).toBe(false);
  });

  it("allows verified admin to approve pending cadre and protects bootstrap admin from revoke", async () => {
    global.fetch = vi
      .fn()
      // 1. /auth/v1/user
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "admin-1", email: "bdhkhupho3.ap@gmail.com" }),
      })
      // 2. caller profile
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "admin-1",
            email: "bdhkhupho3.ap@gmail.com",
            full_name: "Bí thư Nguyễn Văn Hùng",
            role: "admin",
            approval_status: "approved",
          },
        ],
      })
      // 3. target profile lookup
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "pending-99",
            email: "newcadre@kp3.vn",
            full_name: "Cán Bộ Mới",
            role: "cadre",
            approval_status: "pending",
          },
        ],
      })
      // 4. PUT /auth/v1/admin/users/pending-99 (email_confirm: true)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "pending-99" }),
      })
      // 5. PATCH /rest/v1/user_profiles
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "pending-99",
            email: "newcadre@kp3.vn",
            full_name: "Cán Bộ Mới",
            role: "cadre",
            approval_status: "approved",
            approved_by: "admin-1",
          },
        ],
      }) as any;

    const res = createMockRes();
    await staffAdminHandler(
      {
        method: "PATCH",
        headers: { authorization: "Bearer valid-admin-token" },
        body: { cadreId: "pending-99", action: "approve" },
      },
      res
    );

    expect(res.getStatus()).toBe(200);
    expect(res.getBody().ok).toBe(true);
    expect(res.getBody().profile.approval_status).toBe("approved");
  });
});
