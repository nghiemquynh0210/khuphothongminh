const DEFAULT_SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co";
const BOOTSTRAP_ADMIN_EMAIL = "bdhkhupho3.ap@gmail.com";

export interface StaffProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  approval_status: string;
  position: string | null;
  avatar_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  resident_id?: string | null;
  resident_cccd?: string | null;
  association_id?: string | null;
  linked_resident_id?: string | null;
  linked_resident_cccd?: string | null;
  linked_resident_name?: string | null;
  linked_resident_address?: string | null;
  linked_resident_status?: string | null;
  linked_association_id?: string | null;
  linked_association_name?: string | null;
  linked_official_role?: string | null;
}

interface StaffResidentLinkMeta {
  residentId: string;
  residentCccd: string;
  residentName: string;
  residentAddress?: string;
  residentStatus?: string;
  associationId?: string;
  associationName?: string;
  officialRole?: string;
  linkedAt: string;
}

const STAFF_LINKS_SETTING_KEY = "staff_resident_links_v1";

function normalizePersonNameKey(name?: string | null): string {
  return String(name || "")
    .replace(/^(?:Bí thư|Phó Bí thư|Trưởng Khu phố|Phó Trưởng Khu phố|Đ\/c|Đồng chí)\s+/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function readStaffLinksMap(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, StaffResidentLinkMeta>> {
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.${STAFF_LINKS_SETTING_KEY}&select=value`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );
    if (!r.ok) return {};
    const rows = await r.json();
    const val = rows?.[0]?.value;
    return val && typeof val === "object" && !Array.isArray(val) ? val : {};
  } catch {
    return {};
  }
}

async function saveStaffLinksMap(
  supabaseUrl: string,
  serviceRoleKey: string,
  map: Record<string, StaffResidentLinkMeta>
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      key: STAFF_LINKS_SETTING_KEY,
      value: map,
      is_public: false,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function lookupCadreAndResidentIdentity(
  supabaseUrl: string,
  serviceRoleKey: string,
  params: { cccd?: string; phone?: string; fullName?: string; allowTrustedProfileName?: boolean }
): Promise<StaffResidentLinkMeta | null> {
  const cccdDigits = String(params.cccd || "").replace(/\D/g, "");
  const phoneDigits = String(params.phone || "").replace(/\D/g, "");
  const nameKey = normalizePersonNameKey(params.fullName);

  // 1. Nạp danh sách nhân sự Chi bộ / Ban điều hành / Chi hội từ associations_records (key = 'associations', payload = Association[])
  const assocRes = await fetch(
    `${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    }
  );
  const assocRows = assocRes.ok ? await assocRes.json() : [];
  const rawAssocList: any[] = Array.isArray(assocRows?.[0]?.payload)
    ? assocRows[0].payload
    : [];
  const priorityOrder: Record<string, number> = {
    ASC_DANG: 1,
    ASC_BDH: 2,
    ASC_MT: 3,
  };
  const assocList = [...rawAssocList].sort(
    (a, b) => (priorityOrder[a?.id] || 99) - (priorityOrder[b?.id] || 99)
  );

  let matchedAssocInfo: {
    associationId: string;
    associationName: string;
    officialRole: string;
    memberName: string;
    memberCccd?: string;
  } | null = null;

  for (const p of assocList) {
    if (!p || !Array.isArray(p.members)) continue;
    for (const m of p.members) {
      const mCccd = String(m?.cccd || "").replace(/\D/g, "");
      const mPhone = String(m?.phone || "").replace(/\D/g, "");
      const mNameKey = normalizePersonNameKey(m?.fullName || m?.name);

      const matchByCccd = cccdDigits.length === 12 && mCccd === cccdDigits;
      const matchByName =
        nameKey.length >= 4 &&
        mNameKey === nameKey &&
        (Boolean(params.allowTrustedProfileName) ||
          phoneDigits.length < 9 ||
          !mPhone ||
          mPhone === phoneDigits);

      if (matchByCccd || matchByName) {
        matchedAssocInfo = {
          associationId: p.id || "ASC_KP3",
          associationName: p.name || "Chi hội KP3",
          officialRole: m.role || "Cán bộ Khu phố 3",
          memberName: m.fullName || m.name,
          memberCccd: mCccd.length === 12 ? mCccd : undefined,
        };
        if (p.id === "ASC_DANG" || p.id === "ASC_BDH" || p.id === "ASC_MT") {
          break;
        }
      }
    }
    if (
      matchedAssocInfo &&
      (matchedAssocInfo.associationId === "ASC_DANG" ||
        matchedAssocInfo.associationId === "ASC_BDH")
    ) {
      break;
    }
  }

  // 2. Đối khớp sang bảng `residents` theo CCCD 12 số hoặc Họ tên chính xác của Cán bộ Chi hội
  let residentRow: any = null;
  const searchCccd =
    cccdDigits.length === 12 ? cccdDigits : matchedAssocInfo?.memberCccd || "";

  if (searchCccd) {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/residents?cccd=eq.${encodeURIComponent(
        searchCccd
      )}&select=id,full_name,cccd,address,status&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );
    const arr = r.ok ? await r.json() : [];
    if (arr?.[0]) residentRow = arr[0];
  }

  const targetFullName = matchedAssocInfo?.memberName || params.fullName || "";
  if (!residentRow && targetFullName.trim().length >= 5) {
    const cleanTarget = targetFullName
      .replace(/^(?:Bí thư|Phó Bí thư|Trưởng Khu phố|Đ\/c)\s+/i, "")
      .trim();
    const r = await fetch(
      `${supabaseUrl}/rest/v1/residents?full_name=ilike.${encodeURIComponent(
        cleanTarget
      )}&select=id,full_name,cccd,address,status&limit=5`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );
    const arr = r.ok ? await r.json() : [];
    residentRow =
      (arr || []).find(
        (x: any) => normalizePersonNameKey(x.full_name) === normalizePersonNameKey(cleanTarget)
      ) || arr?.[0];
  }

  // Để chống dò quét công khai: nếu gọi từ form công khai mà không có CCCD 12 số thì bắt buộc phải khớp Cán bộ trong Chi hội
  if (!residentRow && !matchedAssocInfo) {
    return null;
  }
  if (cccdDigits.length !== 12 && !matchedAssocInfo && !params.allowTrustedProfileName) {
    return null;
  }

  // Nếu tìm được cư dân theo CCCD nhưng chưa khớp Chi hội ở bước 1 -> thử đối khớp lại theo họ tên cư dân
  if (residentRow && !matchedAssocInfo) {
    const rNameKey = normalizePersonNameKey(residentRow.full_name);
    for (const p of assocList) {
      if (!p || !Array.isArray(p.members)) continue;
      const m = p.members.find(
        (mem: any) => normalizePersonNameKey(mem?.fullName || mem?.name) === rNameKey
      );
      if (m) {
        matchedAssocInfo = {
          associationId: p.id || "ASC_KP3",
          associationName: p.name || "Chi hội KP3",
          officialRole: m.role || "Cán bộ Khu phố 3",
          memberName: m.fullName || m.name,
        };
        break;
      }
    }
  }

  return {
    residentId: residentRow?.id || "",
    residentCccd: residentRow?.cccd || searchCccd || "",
    residentName: residentRow?.full_name || matchedAssocInfo?.memberName || "",
    residentAddress: residentRow?.address || undefined,
    residentStatus: residentRow?.status || undefined,
    associationId: matchedAssocInfo?.associationId,
    associationName: matchedAssocInfo?.associationName,
    officialRole: matchedAssocInfo?.officialRole,
    linkedAt: new Date().toISOString(),
  };
}

function getEnvConfig() {
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/+$/, "");

  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  return { supabaseUrl, anonKey, serviceRoleKey };
}

function parseJsonBody(req: any): Record<string, any> {
  if (!req?.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.body === "object") return req.body;
  return {};
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function translateAuthErrorMessage(rawMessage: string): string {
  const lower = (rawMessage || "").toLowerCase();
  if (
    lower.includes("already been registered") ||
    lower.includes("already registered") ||
    lower.includes("user already exists") ||
    lower.includes("duplicate")
  ) {
    return "Email công vụ này đã được đăng ký trên hệ thống. Vui lòng kiểm tra trạng thái phê duyệt hoặc đăng nhập.";
  }
  if (lower.includes("password") && lower.includes("6")) {
    return "Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.";
  }
  if (lower.includes("rate limit")) {
    return "Hệ thống đang giới hạn tần suất yêu cầu tạm thời. Vui lòng thử lại sau ít phút.";
  }
  if (lower.includes("invalid") && lower.includes("email")) {
    return "Địa chỉ Email công vụ không đúng định dạng hợp lệ.";
  }
  return rawMessage || "Không thể xử lý yêu cầu tài khoản cán bộ.";
}

const registerRateMap = new Map<string, { count: number; resetAt: number }>();

function extractClientIp(req: any): string {
  const realIp = String(req?.headers?.["x-real-ip"] || "").trim();
  if (realIp) return realIp;
  const xff = String(req?.headers?.["x-forwarded-for"] || "").trim();
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || "local";
  }
  return String(req?.socket?.remoteAddress || "local");
}

function checkRegisterRateLimit(ip: string): boolean {
  const now = Date.now();
  if (registerRateMap.size > 2000) {
    for (const [k, v] of registerRateMap.entries()) {
      if (now > v.resetAt) registerRateMap.delete(k);
    }
  }
  const entry = registerRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    registerRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

export async function verifyApprovedCaller(
  req: any,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): Promise<{
  ok: boolean;
  profile?: StaffProfileRow;
  status?: number;
  error?: string;
}> {
  const authHeader = String(
    req?.headers?.authorization || req?.headers?.Authorization || ""
  ).trim();

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Phiên đăng nhập hết hạn hoặc thiếu mã xác thực. Vui lòng đăng nhập lại.",
    };
  }

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      error: "Không tìm thấy mã xác thực phiên làm việc.",
    };
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey || serviceRoleKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) {
    return {
      ok: false,
      status: 401,
      error: "Phiên đăng nhập Cán bộ không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  const authUser = await userRes.json();
  if (!authUser?.id) {
    return {
      ok: false,
      status: 401,
      error: "Không xác định được danh tính tài khoản đăng nhập.",
    };
  }

  const profRes = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(authUser.id)}&select=*`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    }
  );

  if (!profRes.ok) {
    return {
      ok: false,
      status: 500,
      error: "Không thể truy xuất hồ sơ phân quyền của người dùng.",
    };
  }

  const rows: StaffProfileRow[] = await profRes.json();
  const profile = rows?.[0];

  if (
    !profile ||
    profile.approval_status !== "approved" ||
    (profile.role !== "admin" && profile.role !== "cadre")
  ) {
    return {
      ok: false,
      status: 403,
      error: "Tài khoản chưa được phê duyệt quyền Cán bộ quản lý.",
    };
  }

  return { ok: true, profile };
}

async function handlePublicCadreRegister(
  body: Record<string, any>,
  supabaseUrl: string,
  serviceRoleKey: string,
  res: any
) {
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const position =
    String(body.position || "").trim() || "Cán bộ Ban Điều hành KP3";
  const password = String(body.password || "");

  if (!fullName || fullName.length < 2) {
    return res.status(400).json({
      ok: false,
      error: "Vui lòng nhập đầy đủ Họ và tên Cán bộ (tối thiểu 2 ký tự).",
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: "Vui lòng nhập địa chỉ Email công vụ hợp lệ (ví dụ: canbo@gmail.com).",
    });
  }

  const normalizedPhoneDigits = phone.replace(/\D/g, "");
  if (!normalizedPhoneDigits || normalizedPhoneDigits.length < 9 || normalizedPhoneDigits.length > 12) {
    return res.status(400).json({
      ok: false,
      error: "Vui lòng nhập Số điện thoại liên hệ hợp lệ (9–11 chữ số).",
    });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({
      ok: false,
      error: "Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.",
    });
  }

  // 1. Kiểm tra hồ sơ đã tồn tại trong bảng user_profiles chưa
  const existingProfRes = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?email=ilike.${encodeURIComponent(email)}&select=*`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    }
  );

  if (existingProfRes.ok) {
    const existingRows: StaffProfileRow[] = await existingProfRes.json();
    const existing = existingRows?.find(
      (r) => (r.email || "").trim().toLowerCase() === email
    );
    if (existing) {
      if (existing.approval_status === "pending") {
        return res.status(409).json({
          ok: false,
          code: "ALREADY_PENDING",
          error:
            "Email công vụ này đã gửi hồ sơ đăng ký trước đó và hiện đang chờ Ban Điều hành Khu phố 3 phê duyệt.",
        });
      }
      if (existing.approval_status === "approved") {
        return res.status(409).json({
          ok: false,
          code: "ALREADY_APPROVED",
          error:
            "Email công vụ này đã được phê duyệt cấp quyền. Vui lòng quay lại màn hình Đăng nhập để truy cập hệ thống.",
        });
      }
      return res.status(409).json({
        ok: false,
        code: "ALREADY_REJECTED",
        error:
          "Hồ sơ gắn với Email công vụ này đang ở trạng thái tạm khóa/từ chối. Vui lòng liên hệ Thường trực Ban Điều hành KP3 để được cấp lại quyền.",
      });
    }
  }

  // 2. Tạo tài khoản Auth trên GoTrue Admin API (email_confirm: true để tránh kẹt xác thực email & tránh tạo session rác trên trình duyệt)
  const createAuthRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        position,
        role: "cadre",
      },
    }),
  });

  const createAuthJson = await createAuthRes.json().catch(() => ({}));
  const targetUserId: string | undefined = createAuthJson?.id || createAuthJson?.user?.id;

  if (!createAuthRes.ok || !targetUserId) {
    const rawMsg =
      createAuthJson?.msg ||
      createAuthJson?.message ||
      createAuthJson?.error_description ||
      createAuthJson?.error ||
      "";
    return res.status(400).json({
      ok: false,
      error: translateAuthErrorMessage(String(rawMsg)),
    });
  }

  // 3. Đồng bộ đầy đủ thông tin vào bảng public.user_profiles (trạng thái pending)
  const nowIso = new Date().toISOString();
  const upsertProfRes = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?on_conflict=id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        id: targetUserId,
        email,
        full_name: fullName,
        phone,
        role: "cadre",
        approval_status: "pending",
        position,
        updated_at: nowIso,
      }),
    }
  );

  if (!upsertProfRes.ok) {
    const errText = await upsertProfRes.text();
    return res.status(500).json({
      ok: false,
      error: `Không thể khởi tạo hồ sơ công tác Cán bộ: ${errText}`,
    });
  }

  const savedRows: StaffProfileRow[] = await upsertProfRes.json();

  // 4. Tự động đối khớp & lưu liên kết Hồ sơ Cư dân / Chi hội KP3 cho tài khoản vừa đăng ký
  const residentCccd = String(body.residentCccd || "").replace(/\D/g, "");
  let matchedIdentity: StaffResidentLinkMeta | null = null;
  try {
    matchedIdentity = await lookupCadreAndResidentIdentity(
      supabaseUrl,
      serviceRoleKey,
      {
        cccd: residentCccd,
        phone,
        fullName,
      }
    );
    if (matchedIdentity) {
      const linksMap = await readStaffLinksMap(supabaseUrl, serviceRoleKey);
      linksMap[targetUserId] = matchedIdentity;
      await saveStaffLinksMap(supabaseUrl, serviceRoleKey, linksMap);
    }
  } catch {
    // ignore non-critical linkage failure
  }

  return res.status(201).json({
    ok: true,
    linkedResident: matchedIdentity,
    profile: savedRows?.[0] || {
      id: targetUserId,
      email,
      full_name: fullName,
      phone,
      role: "cadre",
      approval_status: "pending",
      position,
    },
  });
}

async function syncOrphanAuthUsers(
  supabaseUrl: string,
  serviceRoleKey: string,
  existingProfiles: StaffProfileRow[]
): Promise<StaffProfileRow[]> {
  try {
    const usersRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    if (!usersRes.ok) return existingProfiles;

    const usersJson = await usersRes.json();
    const authUsers: any[] = usersJson?.users || [];
    const existingIds = new Set(existingProfiles.map((p) => p.id));

    const missingPayloads = authUsers
      .filter((u) => u?.id && u?.email && !existingIds.has(u.id))
      .map((u) => ({
        id: u.id,
        email: String(u.email).trim().toLowerCase(),
        full_name:
          u.user_metadata?.full_name ||
          String(u.email).split("@")[0] ||
          "Cán bộ Khu phố 3",
        phone: u.user_metadata?.phone || null,
        role:
          String(u.email).trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
            ? "admin"
            : "cadre",
        approval_status: "pending",
        position: u.user_metadata?.position || "Cán bộ Ban Điều hành KP3",
        created_at: u.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    if (missingPayloads.length === 0) return existingProfiles;

    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?on_conflict=id`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(missingPayloads),
      }
    );

    if (insertRes.ok) {
      const inserted: StaffProfileRow[] = await insertRes.json();
      return [...inserted, ...existingProfiles];
    }
  } catch {
    // Ignore optional sync errors
  }
  return existingProfiles;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  const method = String(req?.method || "GET").toUpperCase();
  const { supabaseUrl, anonKey, serviceRoleKey } = getEnvConfig();

  if (!serviceRoleKey) {
    return res.status(503).json({
      ok: false,
      error:
        "Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY để xử lý quản trị tài khoản Cán bộ.",
    });
  }

  try {
    // 1. Đăng ký tài khoản Cán bộ mới hoặc đối khớp CCCD Cán bộ - Cư dân KP3
    if (method === "POST") {
      const body = parseJsonBody(req);
      const clientIp = extractClientIp(req);
      if (!checkRegisterRateLimit(clientIp)) {
        return res.status(429).json({
          ok: false,
          error: "Tần suất gửi yêu cầu quá nhanh. Vui lòng thử lại sau 1 phút.",
        });
      }

      if (body.action === "verify_cadre_resident") {
        const cccd = String(body.cccd || "").replace(/\D/g, "");
        const phone = String(body.phone || "").trim();
        const fullName = String(body.fullName || "").trim();
        if (cccd.length !== 12 && (!fullName || fullName.length < 4)) {
          return res.status(400).json({
            ok: false,
            error:
              "Vui lòng nhập chính xác Số CCCD 12 chữ số (hoặc Họ tên + SĐT cán bộ trong danh sách Chi hội KP3) để đối khớp.",
          });
        }

        const matched = await lookupCadreAndResidentIdentity(
          supabaseUrl,
          serviceRoleKey,
          { cccd, phone, fullName }
        );

        if (!matched) {
          return res.status(200).json({
            ok: true,
            matched: false,
            message:
              "Chưa tìm thấy hồ sơ khớp trong CSDL Dân cư & Chi hội Khu phố 3. Anh/chị vẫn có thể điền thủ công để gửi Ban Điều hành xét duyệt.",
          });
        }

        const maskedCccd =
          matched.residentCccd && matched.residentCccd.length >= 8
            ? `${matched.residentCccd.slice(0, 3)}*****${matched.residentCccd.slice(-4)}`
            : "";

        return res.status(200).json({
          ok: true,
          matched: true,
          identity: {
            residentId: matched.residentId,
            cccdMasked: maskedCccd,
            fullName: matched.residentName,
            residencyStatus: matched.residentStatus || "Cư dân KP3",
            associationId: matched.associationId || null,
            associationName: matched.associationName || null,
            suggestedPosition: matched.officialRole
              ? `${matched.officialRole}${
                  matched.associationName ? ` (${matched.associationName})` : ""
                }`
              : null,
          },
        });
      }

      if (body.action === "register") {
        return await handlePublicCadreRegister(
          body,
          supabaseUrl,
          serviceRoleKey,
          res
        );
      }
      return res.status(400).json({
        ok: false,
        error: "Hành động POST không hợp lệ.",
      });
    }

    // Các phương thức GET / PATCH yêu cầu phiên đăng nhập của Cán bộ đã duyệt
    const callerCheck = await verifyApprovedCaller(
      req,
      supabaseUrl,
      anonKey,
      serviceRoleKey
    );
    if (!callerCheck.ok || !callerCheck.profile) {
      return res.status(callerCheck.status || 401).json({
        ok: false,
        error: callerCheck.error || "Không có quyền truy cập.",
      });
    }

    const caller = callerCheck.profile;

    // 2. Lấy danh sách toàn bộ tài khoản Cán bộ (chờ duyệt, đã duyệt, từ chối)
    if (method === "GET") {
      const listRes = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?select=*&order=created_at.desc`,
        {
          method: "GET",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
        }
      );

      if (!listRes.ok) {
        return res.status(500).json({
          ok: false,
          error: "Không thể tải danh sách hồ sơ tài khoản Cán bộ.",
        });
      }

      const rawProfiles: StaffProfileRow[] = await listRes.json();
      const syncedProfiles = await syncOrphanAuthUsers(
        supabaseUrl,
        serviceRoleKey,
        rawProfiles
      );

      // Bổ sung thông tin liên kết Cư dân & Chi hội cho từng tài khoản Cán bộ (tự động đối khớp cho các tài khoản hiện hữu như Bí thư Nghiêm Xuân Quỳnh)
      const linksMap = await readStaffLinksMap(supabaseUrl, serviceRoleKey);
      let linksChanged = false;
      const enrichedProfiles: StaffProfileRow[] = [];

      for (const prof of syncedProfiles) {
        let link = linksMap[prof.id];
        if (!link) {
          const autoMatched = await lookupCadreAndResidentIdentity(
            supabaseUrl,
            serviceRoleKey,
            {
              cccd: prof.resident_cccd || undefined,
              phone: prof.phone || undefined,
              fullName: prof.full_name,
              allowTrustedProfileName: true,
            }
          );
          if (autoMatched) {
            link = autoMatched;
            linksMap[prof.id] = autoMatched;
            linksChanged = true;
          }
        }
        enrichedProfiles.push({
          ...prof,
          linked_resident_id: link?.residentId || prof.resident_id || null,
          linked_resident_cccd: link?.residentCccd || prof.resident_cccd || null,
          linked_resident_name: link?.residentName || null,
          linked_resident_address: link?.residentAddress || null,
          linked_resident_status: link?.residentStatus || null,
          linked_association_id: link?.associationId || prof.association_id || null,
          linked_association_name: link?.associationName || null,
          linked_official_role: link?.officialRole || null,
        });
      }

      if (linksChanged) {
        await saveStaffLinksMap(supabaseUrl, serviceRoleKey, linksMap).catch(() => {});
      }

      return res.status(200).json({
        ok: true,
        canManage: caller.role === "admin",
        callerRole: caller.role,
        callerId: caller.id,
        profiles: enrichedProfiles,
      });
    }

    // 3. Phê duyệt / Từ chối / Thu hồi / Liên kết Cư dân
    if (method === "PATCH") {
      const body = parseJsonBody(req);
      const cadreId = String(body.cadreId || "").trim();
      const action = String(body.action || "").trim();

      // Cho phép Cán bộ tự liên kết hồ sơ của chính mình hoặc Admin liên kết cho bất kỳ cán bộ nào
      if (action === "link_resident") {
        if (!cadreId || (caller.role !== "admin" && caller.id !== cadreId)) {
          return res.status(403).json({
            ok: false,
            error: "Không có quyền cập nhật liên kết hồ sơ Cư dân cho tài khoản này.",
          });
        }
        const cccd = String(body.residentCccd || "").replace(/\D/g, "");
        if (cccd.length !== 12) {
          return res.status(400).json({
            ok: false,
            error: "Vui lòng nhập Số CCCD hợp lệ gồm đủ 12 chữ số của cư dân/cán bộ.",
          });
        }
        const matched = await lookupCadreAndResidentIdentity(
          supabaseUrl,
          serviceRoleKey,
          { cccd }
        );
        if (!matched || !matched.residentId) {
          return res.status(404).json({
            ok: false,
            error: `Không tìm thấy cư dân có CCCD ${cccd} trong CSDL Dân cư Khu phố 3.`,
          });
        }
        const linksMap = await readStaffLinksMap(supabaseUrl, serviceRoleKey);
        linksMap[cadreId] = matched;
        await saveStaffLinksMap(supabaseUrl, serviceRoleKey, linksMap);

        // Thử cập nhật thêm cột trên user_profiles nếu migration 2026111801 đã chạy (bỏ qua nếu cột chưa có)
        await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(cadreId)}`,
          {
            method: "PATCH",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              resident_id: matched.residentId,
              resident_cccd: matched.residentCccd,
              association_id: matched.associationId || null,
            }),
          }
        ).catch(() => {});

        return res.status(200).json({
          ok: true,
          linked: matched,
        });
      }

      if (caller.role !== "admin") {
        return res.status(403).json({
          ok: false,
          error:
            "Chỉ tài khoản Quản trị viên (Bí thư Chi bộ / Thường trực BĐH có quyền Admin) mới được phép phê duyệt hoặc thu hồi quyền Cán bộ.",
        });
      }

      if (!cadreId || !["approve", "reject", "revoke", "update_role"].includes(action)) {
        return res.status(400).json({
          ok: false,
          error: "Thiếu mã định danh Cán bộ hoặc thao tác xử lý không hợp lệ.",
        });
      }

      // Đọc hồ sơ mục tiêu để kiểm tra bảo vệ tài khoản Admin gốc
      const targetRes = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(cadreId)}&select=*`,
        {
          method: "GET",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
        }
      );
      const targetRows: StaffProfileRow[] = targetRes.ok
        ? await targetRes.json()
        : [];
      const targetProfile = targetRows?.[0];

      if (!targetProfile) {
        return res.status(404).json({
          ok: false,
          error: "Không tìm thấy hồ sơ tài khoản Cán bộ cần xử lý.",
        });
      }

      const isBootstrapAdmin =
        (targetProfile.email || "").trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;

      if (
        (action === "reject" || action === "revoke") &&
        (cadreId === caller.id || isBootstrapAdmin)
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Không thể thu hồi hoặc khóa tài khoản Quản trị viên tối cao / tài khoản đang đăng nhập!",
        });
      }

      const nowIso = new Date().toISOString();
      let patchPayload: Record<string, any> = {};

      if (action === "approve") {
        // Đảm bảo tài khoản trên auth.users đã xác nhận email & gỡ trạng thái ban (nếu trước đó từng thu hồi)
        await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(cadreId)}`,
          {
            method: "PUT",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email_confirm: true, ban_duration: "none" }),
          }
        ).catch(() => {});

        patchPayload = {
          approval_status: "approved",
          // Không bao giờ tự động nâng lên 'admin' từ user_metadata khi duyệt hồ sơ pending (chỉ Bootstrap Admin hoặc grantAdmin tường minh)
          role: isBootstrapAdmin
            ? "admin"
            : body.grantAdmin === true
            ? "admin"
            : "cadre",
          approved_by: caller.id,
          approved_at: nowIso,
          updated_at: nowIso,
        };
      } else if (action === "reject" || action === "revoke") {
        // Khóa phiên GoTrue ngay lập tức để vô hiệu hóa refresh token đang mở
        await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(cadreId)}`,
          {
            method: "PUT",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ban_duration: "876000h" }),
          }
        ).catch(() => {});

        patchPayload = {
          approval_status: "rejected",
          updated_at: nowIso,
        };
      } else if (action === "update_role") {
        const nextRole = body.role === "admin" ? "admin" : "cadre";
        if ((cadreId === caller.id || isBootstrapAdmin) && nextRole !== "admin") {
          return res.status(400).json({
            ok: false,
            error: "Không thể hạ quyền của tài khoản Quản trị viên tối cao!",
          });
        }
        patchPayload = {
          role: nextRole,
          ...(typeof body.position === "string" && body.position.trim()
            ? { position: body.position.trim() }
            : {}),
          updated_at: nowIso,
        };
      }

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(cadreId)}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(patchPayload),
        }
      );

      if (!updateRes.ok) {
        const errBody = await updateRes.text();
        return res.status(500).json({
          ok: false,
          error: `Lỗi cập nhật trạng thái phân quyền Cán bộ: ${errBody}`,
        });
      }

      const updatedRows: StaffProfileRow[] = await updateRes.json();
      if (!updatedRows || updatedRows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: "Không có bản ghi nào được cập nhật trong cơ sở dữ liệu.",
        });
      }

      // Tự động đối soát và liên kết Zalo OA cho Cán bộ vừa được phê duyệt nếu có tài khoản Zalo tương ứng
      if (action === "approve" && updatedRows[0]) {
        try {
          const prof = updatedRows[0];
          const profKey = normalizePersonNameKey(prof.full_name);
          const profPhone = prof.phone ? prof.phone.replace(/\D/g, "") : "";

          const p1 = fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_followers_v1&select=value`, {
            headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json" },
          });
          const p2 = fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.cadre_zalo_mapping_v1&select=value`, {
            headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json" },
          });

          if (p1 && typeof p1.then === "function" && p2 && typeof p2.then === "function") {
            const [fRes, mapRes] = await Promise.all([
              p1.then((r) => (r && typeof r.json === "function" ? r.json() : [])).catch(() => []),
              p2.then((r) => (r && typeof r.json === "function" ? r.json() : [])).catch(() => []),
            ]);
            const followers: any[] = fRes?.[0]?.value || [];
            const mapping: Record<string, any> = mapRes?.[0]?.value || {};

            if (!mapping[profKey]?.zaloUserId) {
              let matchUid: string | undefined;
              let matchName: string | undefined;

              if (profKey === "pham ngoc ha" || profPhone.includes("0908579479")) {
                matchUid = "2742691693568338378";
                matchName = "Sò";
              } else {
                const found = followers.find((fl) => {
                  const flName = normalizePersonNameKey(fl?.displayName);
                  return flName === profKey;
                });
                if (found) {
                  matchUid = found.zaloUserId;
                  matchName = found.displayName;
                }
              }

              if (matchUid) {
                mapping[profKey] = {
                  cadreKey: profKey,
                  fullName: prof.full_name,
                  phone: prof.phone || undefined,
                  role: prof.position || "Cán bộ KP3",
                  zaloUserId: matchUid,
                  zaloDisplayName: matchName || `Zalo ID ${matchUid}`,
                  linkedAt: nowIso,
                  linkedBy: `Duyệt tài khoản Cán bộ (${caller.full_name || "Admin"})`,
                };

                await fetch(`${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`, {
                  method: "POST",
                  headers: {
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`,
                    "Content-Type": "application/json",
                    Prefer: "resolution=merge-duplicates,return=minimal",
                  },
                  body: JSON.stringify({
                    key: "cadre_zalo_mapping_v1",
                    value: mapping,
                    is_public: false,
                    updated_at: nowIso,
                  }),
                }).catch(() => {});
              }
            }
          }
        } catch (e) {
          console.warn("Auto link staff to Zalo warning:", e);
        }
      }

      return res.status(200).json({
        ok: true,
        profile: updatedRows[0],
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Lỗi máy chủ khi xử lý tài khoản Cán bộ.",
    });
  }
}
