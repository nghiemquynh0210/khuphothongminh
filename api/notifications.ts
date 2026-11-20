export const ZALO_OA_KP3_DEFAULTS = {
  oaId: "3124278810088361494",
  oaName: "Ban Điều Hành Khu Phố 3 phường An Phú",
  oaCategory: "Cơ Quan Nhà Nước (Đã xác thực tích vàng Zalo)",
  oaUrl: "https://zalo.me/bdhkhupho3",
  linkedAppId: "432932322782886593",
  linkedAppName: "Điều hành Đô thị Số KP3 An Phú",
  headquartersAddress: "01 Đường D2, Khu Phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
  verifiedFollowersBaseline: 347,
};

interface ZaloOaSavedConfig {
  oaId: string;
  oaName: string;
  oaUrl: string;
  appId: string;
  appSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  znsTemplateId?: string;
  resendApiKey?: string;
  senderEmail?: string;
  notifyBdhEmail?: string;
  autoRemind15dEnabled: boolean;
  remindDaysThreshold: number;
  includeExpiredWithin7d: boolean;
  autoRemindMeeting60mEnabled?: boolean;
  meetingRemindMinutesBefore?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export function parseMeetingStartVnInfo(
  dateIso?: string,
  timeStr?: string,
  remindLeadMinutes = 60,
  nowMs = Date.now()
): {
  startUtcMs: number | null;
  minutesUntilStart: number | null;
  remindAtHHmm: string;
  inRemindWindow: boolean;
} {
  const cleanDate = String(dateIso || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return {
      startUtcMs: null,
      minutesUntilStart: null,
      remindAtHHmm: "",
      inRemindWindow: false,
    };
  }
  const m = String(timeStr || "").match(/(\d{1,2})\s*[:hg]\s*(\d{2})/i);
  const hh = m ? Math.min(23, Math.max(0, Number(m[1]))) : 8;
  const mm = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const startUtcMs = Date.parse(`${cleanDate}T${pad(hh)}:${pad(mm)}:00+07:00`);
  if (Number.isNaN(startUtcMs)) {
    return {
      startUtcMs: null,
      minutesUntilStart: null,
      remindAtHHmm: "",
      inRemindWindow: false,
    };
  }
  const minutesUntilStart = Math.round((startUtcMs - nowMs) / 60_000);
  const remindTriggerVnMs = startUtcMs - remindLeadMinutes * 60_000 + 7 * 3_600_000;
  const rd = new Date(remindTriggerVnMs);
  const remindAtHHmm = `${pad(rd.getUTCHours())}:${pad(rd.getUTCMinutes())}`;
  const inRemindWindow =
    minutesUntilStart > 0 && minutesUntilStart <= Math.max(5, remindLeadMinutes);
  return {
    startUtcMs,
    minutesUntilStart,
    remindAtHHmm,
    inRemindWindow,
  };
}

interface ZaloFollowerRecord {
  zaloUserId: string;
  displayName?: string;
  phone?: string;
  cccd?: string;
  followedAt?: string;
  lastMessage?: string;
}

interface NotificationLogEntry {
  id: string;
  timestamp: string;
  channel: "zalo_oa" | "zalo_zns" | "email" | "outbox_ready";
  notificationType:
    | "temp_expiry_15d_landlord"
    | "temp_expiry_15d_resident"
    | "cadre_meeting_reminder"
    | "recurring_report_reminder"
    | "community_broadcast"
    | "zalo_article_sync";
  recipientName: string;
  recipientRole: "landlord" | "resident" | "cadre" | "community" | "system";
  recipientPhone?: string;
  recipientEmail?: string;
  hostelName?: string;
  subject: string;
  messagePreview: string;
  status: "sent" | "queued_manual_zalo" | "skipped_duplicate" | "failed";
  detail?: string;
  dedupeKey?: string;
  actorName: string;
}

function normalizeCadreKey(raw?: string | null): string {
  return String(raw || "")
    .replace(/^(?:Bí thư|Phó Bí thư|Trưởng Khu phố|Phó Trưởng Khu phố|Đ\/c|Đồng chí|Đại úy)\s+/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const CONFIG_KEY = "zalo_oa_config_v1";
const FOLLOWERS_KEY = "zalo_oa_followers_v1";
const LOGS_KEY = "notification_dispatch_logs_v1";
const CADRE_ZALO_MAPPING_KEY = "cadre_zalo_mapping_v1";

export interface CadreZaloMappingEntry {
  cadreKey: string;
  fullName: string;
  role?: string;
  phone?: string;
  email?: string;
  org?: string;
  zaloUserId: string;
  zaloDisplayName: string;
  avatar?: string;
  linkedAt: string;
  linkedBy?: string;
}

function maskSecret(val?: string): string {
  const s = String(val || "").trim();
  if (!s) return "";
  if (s.length <= 8) return "••••••••";
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
}

function normalizeVnPhoneTo84(phone?: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("84") && digits.length >= 10) return digits;
  if (digits.startsWith("0") && digits.length >= 9) return `84${digits.slice(1)}`;
  return digits;
}

function parseExpDateDaysLeft(rawDate?: string): {
  daysLeft: number | null;
  formatted: string;
} {
  if (!rawDate) return { daysLeft: null, formatted: "" };
  const s = String(rawDate).trim();
  let parsed: Date | null = null;
  let formatted = s;

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    parsed = new Date(y, m - 1, d);
    formatted = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    parsed = new Date(y, m - 1, d);
    formatted = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  if (!parsed || isNaN(parsed.getTime())) {
    return { daysLeft: null, formatted: s };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  const diffDays = Math.round((parsed.getTime() - today.getTime()) / 86_400_000);
  return { daysLeft: diffDays, formatted };
}

function parseHostelFromAddress(addr?: string): {
  isHostel: boolean;
  hostelName: string;
  landlordName: string;
  landlordPhone: string;
  shortAddress: string;
} {
  const raw = String(addr || "").trim();
  if (!raw) {
    return {
      isHostel: false,
      hostelName: "",
      landlordName: "",
      landlordPhone: "",
      shortAddress: "",
    };
  }
  const phoneMatch = raw.match(/(?:SĐT|SDT|ĐT|Tel)?[:\s]*(0\d{8,10})/i);
  const landlordPhone = phoneMatch ? phoneMatch[1] : "";
  const cleaned = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const hostelMatch = cleaned.match(
    /^((?:Nhà trọ|Nhà nghỉ|Khu trọ|Phòng trọ|Căn hộ)\s+([^,—0-9-]+))/i
  );
  if (hostelMatch) {
    const hostelName = hostelMatch[1].trim();
    const landlordName = hostelMatch[2].trim();
    const rest = cleaned.slice(hostelMatch[0].length).replace(/^[\s,—-]+/, "").trim();
    return {
      isHostel: true,
      hostelName,
      landlordName,
      landlordPhone,
      shortAddress: rest || cleaned,
    };
  }
  return {
    isHostel: /nhà trọ|phòng trọ|khu trọ/i.test(raw),
    hostelName: "",
    landlordName: "",
    landlordPhone,
    shortAddress: cleaned,
  };
}

async function verifyApprovedCallerOrCron(
  req: any,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): Promise<{ ok: boolean; actorName: string; isAdmin: boolean; status?: number; error?: string }> {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const authHeader = String(
    req?.headers?.authorization || req?.headers?.Authorization || ""
  ).trim();

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true, actorName: "Tác vụ Tự động Hàng ngày (Cron KP3)", isAdmin: true };
  }

  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return { ok: true, actorName: "Bí thư Chi bộ Nghiêm Xuân Quỳnh (Hệ thống)", isAdmin: true };
  }

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      actorName: "",
      isAdmin: false,
      status: 401,
      error: "Yêu cầu đăng nhập tài khoản Cán bộ để cấu hình hoặc gửi thông báo Zalo OA / Email.",
    };
  }

  const accessToken = authHeader.slice(7).trim();
  let userRes: Response | null = null;
  try {
    userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: anonKey || serviceRoleKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return {
      ok: false,
      actorName: "",
      isAdmin: false,
      status: 503,
      error: "Không thể kết nối máy chủ xác thực tài khoản. Vui lòng thử lại sau.",
    };
  }

  if (!userRes || !userRes.ok) {
    return {
      ok: false,
      actorName: "",
      isAdmin: false,
      status: 401,
      error: "Phiên đăng nhập Cán bộ đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  const authUser = await userRes.json().catch(() => null);
  if (!authUser?.id) {
    return { ok: false, actorName: "", isAdmin: false, status: 401, error: "Không xác định được tài khoản." };
  }

  const profRes = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,full_name,role,approval_status`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    }
  );

  const rows = profRes.ok ? await profRes.json() : [];
  const profile = rows?.[0];
  if (
    !profile ||
    profile.approval_status !== "approved" ||
    (profile.role !== "admin" && profile.role !== "cadre")
  ) {
    return {
      ok: false,
      actorName: "",
      isAdmin: false,
      status: 403,
      error: "Tài khoản chưa được phê duyệt quyền Cán bộ Khu phố 3.",
    };
  }

  return {
    ok: true,
    actorName: profile.full_name || "Cán bộ Ban Điều hành KP3",
    isAdmin: profile.role === "admin",
  };
}

async function readPrivateSetting<T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  key: string
): Promise<T | null> {
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.${encodeURIComponent(key)}&select=value`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return (rows?.[0]?.value as T) ?? null;
  } catch {
    return null;
  }
}

async function writePrivateSetting(
  supabaseUrl: string,
  serviceRoleKey: string,
  key: string,
  value: unknown
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
      key,
      value,
      is_public: false,
      updated_at: new Date().toISOString(),
    }),
  });
}

export const CADRE_BUILTIN_ALIASES: Record<string, { zaloUserId: string; displayName: string }> = {
  "pham ngoc ha": { zaloUserId: "2742691693568338378", displayName: "Sò" },
  "84908579479": { zaloUserId: "2742691693568338378", displayName: "Sò" },
  "0908579479": { zaloUserId: "2742691693568338378", displayName: "Sò" },
  "nghiem xuan quynh": { zaloUserId: "8204901768555080728", displayName: "Nghiêm Quỳnh" },
  "0825681868": { zaloUserId: "8204901768555080728", displayName: "Nghiêm Quỳnh" },
  "84825681868": { zaloUserId: "8204901768555080728", displayName: "Nghiêm Quỳnh" },
  "nguyen trung huy": { zaloUserId: "6920129842444200396", displayName: "Nguyễn Trung Huy" },
  "tran thi my dung": { zaloUserId: "4080370657469274213", displayName: "My Dung" },
  "nguyen thu phuong": { zaloUserId: "104103935947927732", displayName: "Nguyễn Thu Phương" },
  "dinh thi thanh phuong": { zaloUserId: "5842864785250600915", displayName: "Thanh Phương" },
};

export function findMatchingZaloFollower(
  fullName: string,
  phone: string | undefined,
  followerList: ZaloFollowerRecord[]
): ZaloFollowerRecord | undefined {
  if (!Array.isArray(followerList) || followerList.length === 0) return undefined;
  const normPhone = phone ? normalizeVnPhoneTo84(phone) : "";
  if (normPhone && CADRE_BUILTIN_ALIASES[normPhone]) {
    const alias = CADRE_BUILTIN_ALIASES[normPhone];
    return { zaloUserId: alias.zaloUserId, displayName: alias.displayName };
  }
  if (normPhone) {
    const byPhone = followerList.find(
      (f) => f.phone && normalizeVnPhoneTo84(f.phone) === normPhone
    );
    if (byPhone) return byPhone;
  }

  const targetKey = normalizeCadreKey(fullName);
  if (!targetKey || targetKey.length < 4) return undefined;

  if (CADRE_BUILTIN_ALIASES[targetKey]) {
    const alias = CADRE_BUILTIN_ALIASES[targetKey];
    return { zaloUserId: alias.zaloUserId, displayName: alias.displayName };
  }

  const exact = followerList.find((f) => normalizeCadreKey(f.displayName) === targetKey);
  if (exact) return exact;

  const parts = targetKey.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
    const lastTwo = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;

    const byFirstLast = followerList.find(
      (f) => normalizeCadreKey(f.displayName) === firstLast
    );
    if (byFirstLast) return byFirstLast;

    const byLastTwo = followerList.find(
      (f) => normalizeCadreKey(f.displayName) === lastTwo
    );
    if (byLastTwo) return byLastTwo;
  }

  return undefined;
}

async function refreshZaloAccessTokenIfNeeded(
  cfg: ZaloOaSavedConfig,
  supabaseUrl: string,
  serviceRoleKey: string,
  forceRefresh = false
): Promise<string> {
  const direct = (cfg.accessToken || process.env.ZALO_OA_ACCESS_TOKEN || "").trim();
  const refresh = (cfg.refreshToken || process.env.ZALO_OA_REFRESH_TOKEN || "").trim();
  const appId = (cfg.appId || process.env.ZALO_APP_ID || ZALO_OA_KP3_DEFAULTS.linkedAppId).trim();
  const appSecret = (cfg.appSecret || process.env.ZALO_APP_SECRET || "").trim();

  if (direct && !forceRefresh) return direct;
  if (!refresh || !appId || !appSecret) return direct || "";

  try {
    const params = new URLSearchParams({
      refresh_token: refresh,
      app_id: appId,
      grant_type: "refresh_token",
    });
    const r = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: appSecret,
      },
      body: params.toString(),
    });
    const j = await r.json().catch(() => ({}));
    if (j?.access_token) {
      const nextCfg: ZaloOaSavedConfig = {
        ...cfg,
        accessToken: j.access_token,
        refreshToken: j.refresh_token || cfg.refreshToken,
        updatedAt: new Date().toISOString(),
      };
      await writePrivateSetting(supabaseUrl, serviceRoleKey, CONFIG_KEY, nextCfg);
      return String(j.access_token);
    }
  } catch {
    // ignore refresh failure
  }
  return direct || "";
}

async function sendZaloOaCsMessage(
  accessToken: string,
  zaloUserId: string,
  text: string,
  refreshCtx?: { cfg: ZaloOaSavedConfig; supabaseUrl: string; serviceRoleKey: string }
): Promise<{ ok: boolean; detail: string; newToken?: string }> {
  if (!accessToken || !zaloUserId) {
    return { ok: false, detail: "missing_token_or_uid" };
  }
  const postOnce = async (token: string, url: string) => {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: token,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: { text },
      }),
    });
    return await r.json().catch(() => ({}));
  };

  try {
    // OA Cơ quan Nhà nước (oa_type = 4) sử dụng endpoint chính thức /v2.0/oa/message (không bị chặn cửa sổ 48h CS)
    let j = await postOnce(accessToken, "https://openapi.zalo.me/v2.0/oa/message");

    // Tự động làm mới Access Token nếu mã lỗi -216 (Access token has expired)
    if (j?.error === -216 && refreshCtx) {
      const refreshed = await refreshZaloAccessTokenIfNeeded(
        refreshCtx.cfg,
        refreshCtx.supabaseUrl,
        refreshCtx.serviceRoleKey,
        true
      );
      if (refreshed && refreshed !== accessToken) {
        j = await postOnce(refreshed, "https://openapi.zalo.me/v2.0/oa/message");
        if (j?.error === 0) {
          return {
            ok: true,
            detail: `msg_id:${j?.data?.message_id || "ok"}`,
            newToken: refreshed,
          };
        }
      }
    }

    if (j?.error === 0) {
      return { ok: true, detail: `msg_id:${j?.data?.message_id || "ok"}` };
    }

    // Fallback sang v3.0/oa/message/cs nếu là OA doanh nghiệp thông thường
    const jCs = await postOnce(accessToken, "https://openapi.zalo.me/v3.0/oa/message/cs");
    if (jCs?.error === 0) {
      return { ok: true, detail: `msg_id:${jCs?.data?.message_id || "ok"}` };
    }

    return { ok: false, detail: String(j?.message || `zalo_error_${j?.error}`) };
  } catch (err: any) {
    return { ok: false, detail: err?.message || "network_error" };
  }
}

async function sendZaloZnsTemplate(
  accessToken: string,
  phone: string,
  templateId: string,
  templateData: Record<string, string>
): Promise<{ ok: boolean; detail: string }> {
  const phone84 = normalizeVnPhoneTo84(phone);
  if (!accessToken || !phone84 || !templateId) {
    return { ok: false, detail: "missing_zns_params" };
  }
  try {
    const r = await fetch("https://business.openapi.zalo.me/message/template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: accessToken,
      },
      body: JSON.stringify({
        phone: phone84,
        template_id: templateId,
        template_data: templateData,
        tracking_id: `kp3-${Date.now()}`,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (j?.error === 0) {
      return { ok: true, detail: `zns_msg_id:${j?.data?.msg_id || "ok"}` };
    }
    return { ok: false, detail: String(j?.message || `zns_error_${j?.error}`) };
  } catch (err: any) {
    return { ok: false, detail: err?.message || "zns_network_error" };
  }
}

async function sendResendEmail(
  apiKey: string,
  senderEmail: string,
  toEmail: string,
  subject: string,
  textBody: string
): Promise<{ ok: boolean; detail: string }> {
  if (!apiKey || !toEmail) return { ok: false, detail: "missing_email_config" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail || "Ban Điều Hành Khu Phố 3 An Phú <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        text: textBody,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.id) {
      return { ok: true, detail: `email_id:${j.id}` };
    }
    return { ok: false, detail: String(j?.message || `http_${r.status}`) };
  } catch (err: any) {
    return { ok: false, detail: err?.message || "email_network_error" };
  }
}

function parseZaloBodyToContent(body: any[]): { content: string; imageUrls: string[] } {
  const imageUrls: string[] = [];
  const parts: string[] = [];

  if (Array.isArray(body)) {
    for (const block of body) {
      if (block.type === "text") {
        const clean = (block.content || "")
          .replace(/<p>\s*(&nbsp;)?\s*<\/p>/gi, "")
          .trim();
        if (clean) parts.push(clean);
      } else if (block.type === "image" && block.url) {
        imageUrls.push(block.url);
        const cap = block.caption ? `*${block.caption}*` : "";
        parts.push(
          `\n<div class="my-4 text-center"><img src="${block.url}" alt="${
            block.caption || "Hình ảnh bài viết"
          }" class="rounded-xl shadow-md mx-auto max-h-[500px] object-cover" />${
            cap ? `<p class="text-xs text-slate-500 mt-1 italic">${block.caption}</p>` : ""
          }</div>\n`
        );
      }
    }
  }

  return {
    content: parts.join("\n\n"),
    imageUrls,
  };
}

function detectNewsCategory(
  title: string,
  content: string = ""
): "Thông báo khẩn" | "Hành chính" | "Y tế & Đời sống" | "Phong trào" | "An sinh xã hội" {
  const text = (title + " " + content).toUpperCase();
  if (/KHẨN|KHẨN CẤP|CẢNH BÁO|PCCC|CHÁY NỔ|TRIỀU CƯỜNG/.test(text)) return "Thông báo khẩn";
  if (
    /SỨC KHỎE|Y TẾ|TIÊM CHỦNG|DỊCH BỆNH|DIỆT MUỖI|SỐT XUẤT HUYẾT|BỆNH VIỆN|TRẠM Y TẾ|KHÁM SỨC KHỎE/.test(
      text
    )
  )
    return "Y tế & Đời sống";
  if (
    /TRĂNG RẰM|TRUNG THU|THIẾU NHI|THỂ THAO|VĂN NGHỆ|HỘI DIỄN|PHONG TRÀO|TÌNH NGUYỆN|NGÀY HỘI|TỔ DÂN PHỐ|ĐẠI ĐOÀN KẾT/.test(
      text
    )
  )
    return "Phong trào";
  if (
    /AN SINH|HỖ TRỢ|QUÀ TẶNG|NGHÈO|KHUYẾN HỌC|HOÀN LƯƠNG|BẢO TRỢ|CHÍNH SÁCH|THƯƠNG BINH|ĐỀ ÁN 06/.test(
      text
    )
  )
    return "An sinh xã hội";
  return "Hành chính";
}

export default async function notificationsHandler(req: any, res: any) {
  // Hỗ trợ CORS cho Zalo Mini App WebView (https://h5.zdn.vn) và Cổng Cư dân
  const origin = String(req.headers?.origin || "*");
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-kp3-cron-secret");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(
    /\/+$/,
    ""
  );
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  // 1. Hỗ trợ GET xác minh trạng thái Zalo OA Webhook & thông tin OA công khai cho Cổng Cư dân
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      oa: ZALO_OA_KP3_DEFAULTS,
      webhookReady: true,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body =
    typeof req.body === "string"
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch {
            return {};
          }
        })()
      : req.body || {};

  // 2. Xử lý Webhook sự kiện thật gửi từ Zalo Official Account (event_name: follow, user_send_text...)
  if (body.event_name && (body.oa_id || body.sender?.id || body.follower?.id)) {
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(200).json({ ok: true, received: true });
    }
    try {
      const eventName = String(body.event_name);
      const zaloUid = String(body.sender?.id || body.follower?.id || "").trim();
      if (zaloUid) {
        const existing =
          (await readPrivateSetting<ZaloFollowerRecord[]>(
            supabaseUrl,
            serviceRoleKey,
            FOLLOWERS_KEY
          )) || [];

        if (eventName === "unfollow") {
          const filtered = existing.filter((f) => f.zaloUserId !== zaloUid);
          await writePrivateSetting(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY, filtered);
        } else {
          const msgText = String(body.message?.text || "").trim();
          const phoneHit = msgText.match(/\b(0\d{8,10})\b/);
          const cccdHit = msgText.match(/\b(\d{12})\b/);
          const prev = existing.find((f) => f.zaloUserId === zaloUid);
          const updatedItem: ZaloFollowerRecord = {
            zaloUserId: zaloUid,
            displayName: prev?.displayName || `Cư dân Zalo #${zaloUid.slice(-5)}`,
            phone: phoneHit ? phoneHit[1] : prev?.phone,
            cccd: cccdHit ? cccdHit[1] : prev?.cccd,
            followedAt: prev?.followedAt || new Date().toISOString(),
            lastMessage: msgText || prev?.lastMessage,
          };
          const merged = [
            updatedItem,
            ...existing.filter((f) => f.zaloUserId !== zaloUid),
          ].slice(0, 2000);
          await writePrivateSetting(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY, merged);

          // Phản hồi tự động qua Zalo OA CS nếu cư dân nhắn SĐT/CCCD đăng ký nhận nhắc hạn tạm trú
          if ((phoneHit || cccdHit) && eventName === "user_send_text") {
            const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
              supabaseUrl,
              serviceRoleKey,
              CONFIG_KEY
            );
            if (savedCfg) {
              const token = await refreshZaloAccessTokenIfNeeded(
                savedCfg,
                supabaseUrl,
                serviceRoleKey
              );
              if (token) {
                await sendZaloOaCsMessage(
                  token,
                  zaloUid,
                  `Ban Điều hành Khu phố 3 Phường An Phú đã ghi nhận liên kết thông báo tự động cho ${
                    phoneHit ? `SĐT ${phoneHit[1]}` : ""
                  }${cccdHit ? ` (CCCD ***${cccdHit[1].slice(-4)})` : ""}. Hệ thống sẽ tự động nhắc gia hạn tạm trú trước 15 ngày và gửi thông báo khu phố kịp thời. Cổng cư dân: https://bdhkp3.vercel.app`
                );
              }
            }
          }
        }
      }
      return res.status(200).json({ ok: true, received: true });
    } catch {
      return res.status(200).json({ ok: true, received: true });
    }
  }

  try {
    // 3. Các hành động công khai từ Zalo Mini App cho Cư dân (không yêu cầu quyền Cán bộ)
    const action = String(body.action || "get_config");

    // --- 3.1. ZALO MINI APP: TIẾP NHẬN PHẢN ÁNH 1022 TỪ CƯ DÂN ---
    if (action === "mini_app_submit_report") {
      const { title, category, location, description, reporter_name, reporter_phone } = body;
      if (!title || !location || !description) {
        return res.status(400).json({
          ok: false,
          error: "Vui lòng nhập đầy đủ tiêu đề, địa điểm và mô tả phản ánh.",
        });
      }

      const insertPayload = {
        title: String(title).trim(),
        category: String(category || "Môi trường").trim(),
        location: String(location).trim(),
        description: String(description).trim(),
        reporter_name: String(reporter_name || "Cư dân KP3 (Zalo Mini App)").trim(),
        reporter_phone: reporter_phone ? String(reporter_phone).trim() : null,
        status: "Đang xử lý",
        priority: "Bình thường",
        created_at: new Date().toISOString(),
      };

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/field_reports`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(insertPayload),
      });

      if (!insertRes.ok) {
        const errTxt = await insertRes.text();
        console.error("Insert field_report via mini app error:", errTxt);
        return res.status(500).json({ ok: false, error: "Không thể lưu phản ánh vào cơ sở dữ liệu." });
      }

      const insertedData = await insertRes.json();
      const createdReport = Array.isArray(insertedData) ? insertedData[0] : insertedData;

      return res.status(200).json({
        ok: true,
        report: createdReport,
        message: "Gửi phản ánh 1022 thành công.",
      });
    }

    // --- 3.2. ZALO MINI APP: TRA CỨU HỒ SƠ CƯ TRÚ AN TOÀN CHO CƯ DÂN ---
    if (action === "mini_app_lookup_resident") {
      const rawQuery = String(body.query || body.cccd || "").trim();
      const digits = rawQuery.replace(/\D/g, "");

      if (digits.length < 9 && rawQuery.length < 3) {
        return res.status(400).json({
          ok: false,
          error: "Vui lòng nhập Số CCCD (12 chữ số) hoặc Mã hộ gia đình hợp lệ.",
        });
      }

      let queryUrl = "";
      if (digits.length === 12) {
        queryUrl = `${supabaseUrl}/rest/v1/residents?cccd=eq.${encodeURIComponent(
          digits
        )}&select=id,full_name,cccd,status,birth_date,address,permanent_address,current_address,temporary_reg_date,temporary_exp_date,household_code,management_status&limit=1`;
      } else {
        queryUrl = `${supabaseUrl}/rest/v1/residents?or=(household_code.eq.${encodeURIComponent(
          rawQuery
        )},phone.eq.${encodeURIComponent(
          digits
        )})&select=id,full_name,cccd,status,birth_date,address,permanent_address,current_address,temporary_reg_date,temporary_exp_date,household_code,management_status&limit=1`;
      }

      const fetchRes = await fetch(queryUrl, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (!fetchRes.ok) {
        const errTxt = await fetchRes.text();
        console.error("Lookup resident via mini app error:", errTxt);
        return res.status(500).json({ ok: false, error: "Lỗi kết nối CSDL dân cư." });
      }

      const rows = await fetchRes.json();
      if (!rows || rows.length === 0) {
        return res.status(200).json({
          ok: true,
          found: false,
          message: "Không tìm thấy hồ sơ cư trú tương ứng tại Khu phố 3, Phường An Phú.",
        });
      }

      const item = rows[0];
      const isTamTru = item.status === "Tạm trú" || Boolean(item.temporary_exp_date);

      // Tính hạn tạm trú
      let expiryStatus: "valid" | "warning_30d" | "expired" = "valid";
      let daysLeft = 0;
      if (item.temporary_exp_date) {
        let expTime = 0;
        if (item.temporary_exp_date.includes("/")) {
          const [d, m, y] = item.temporary_exp_date.split("/").map(Number);
          expTime = new Date(y, m - 1, d).getTime();
        } else {
          expTime = new Date(item.temporary_exp_date).getTime();
        }
        const now = Date.now();
        daysLeft = Math.ceil((expTime - now) / (1000 * 3600 * 24));
        if (daysLeft < 0) {
          expiryStatus = "expired";
        } else if (daysLeft <= 30) {
          expiryStatus = "warning_30d";
        }
      }

      // Khử trùng danh tính PII: "CAO PHẠM KIM NGỌC" -> "CAO PHẠM KIM N***"
      const nameParts = (item.full_name || "").trim().split(" ");
      const maskedName =
        nameParts.length > 1
          ? nameParts.slice(0, -1).join(" ") + " " + nameParts[nameParts.length - 1][0] + "***"
          : item.full_name;

      // Ẩn số CCCD: 042310008883 -> 042*****8883
      const cccdStr = String(item.cccd || "");
      const maskedCccd =
        cccdStr.length >= 8 ? `${cccdStr.slice(0, 3)}*****${cccdStr.slice(-4)}` : cccdStr;

      return res.status(200).json({
        ok: true,
        found: true,
        data: {
          fullName: maskedName,
          idCardMasked: maskedCccd,
          residenceType: isTamTru ? "Tạm trú" : "Thường trú",
          address:
            item.current_address ||
            item.permanent_address ||
            item.address ||
            "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
          temporaryRegDate: item.temporary_reg_date || null,
          temporaryExpDate: item.temporary_exp_date || null,
          daysLeft,
          expiryStatus,
          householdCode: item.household_code || null,
          managementStatus: item.management_status || "Đang quản lý",
        },
      });
    }

    // 4. Các hành động quản trị bên dưới BẮT BUỘC xác thực Cán bộ đã duyệt hoặc Cron Secret
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ ok: false, error: "Chưa cấu hình biến môi trường Supabase." });
    }

  const caller = await verifyApprovedCallerOrCron(req, supabaseUrl, anonKey, serviceRoleKey);
  if (!caller.ok) {
    return res.status(caller.status || 401).json({ ok: false, error: caller.error });
  }

  const savedCfg: ZaloOaSavedConfig = {
    oaId: ZALO_OA_KP3_DEFAULTS.oaId,
    oaName: ZALO_OA_KP3_DEFAULTS.oaName,
    oaUrl: ZALO_OA_KP3_DEFAULTS.oaUrl,
    appId: ZALO_OA_KP3_DEFAULTS.linkedAppId,
    autoRemind15dEnabled: true,
    remindDaysThreshold: 15,
    includeExpiredWithin7d: false,
    autoRemindMeeting60mEnabled: true,
    meetingRemindMinutesBefore: 60,
    ...((await readPrivateSetting<Partial<ZaloOaSavedConfig>>(
      supabaseUrl,
      serviceRoleKey,
      CONFIG_KEY
    )) || {}),
  };

  if (action === "get_config") {
    let followers: ZaloFollowerRecord[] | null = null;
    let logs: NotificationLogEntry[] | null = null;
    [followers, logs] = await Promise.all([
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
    ]);
    const hasAccessToken = Boolean(
      (savedCfg.accessToken || process.env.ZALO_OA_ACCESS_TOKEN || "").trim()
    );
    const hasRefreshToken = Boolean(
      (savedCfg.refreshToken || process.env.ZALO_OA_REFRESH_TOKEN || "").trim()
    );
    const hasEmailKey = Boolean(
      (savedCfg.resendApiKey || process.env.RESEND_API_KEY || "").trim()
    );

    // Tự động đồng bộ danh sách người dùng đang quan tâm OA Cơ quan Nhà nước từ /v2.0/oa/getfollowers nếu danh sách đang rỗng
    if (hasAccessToken && (!Array.isArray(followers) || followers.length < 5)) {
      try {
        const activeToken = await refreshZaloAccessTokenIfNeeded(
          savedCfg,
          supabaseUrl,
          serviceRoleKey
        );
        if (activeToken) {
          const allIds: string[] = [];
          for (let offset = 0; offset < 400; offset += 50) {
            const listRes = await fetch(
              `https://openapi.zalo.me/v2.0/oa/getfollowers?data=${encodeURIComponent(
                JSON.stringify({ offset, count: 50 })
              )}`,
              { headers: { access_token: activeToken } }
            );
            const listJson = listRes.ok ? await listRes.json() : null;
            const page: any[] = Array.isArray(listJson?.data?.followers)
              ? listJson.data.followers
              : [];
            for (const u of page) {
              if (u?.user_id) allIds.push(String(u.user_id));
            }
            if (page.length < 50) break;
          }
          if (allIds.length > 0) {
            const synced: ZaloFollowerRecord[] = [];
            for (let i = 0; i < allIds.length; i += 30) {
              const batch = allIds.slice(i, i + 30);
              const profs = await Promise.all(
                batch.map((uid) =>
                  fetch(
                    `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(
                      JSON.stringify({ user_id: uid })
                    )}`,
                    { headers: { access_token: activeToken } }
                  )
                    .then((r) => r.json())
                    .catch(() => null)
                )
              );
              for (let j = 0; j < batch.length; j++) {
                const d = profs[j]?.data;
                synced.push({
                  zaloUserId: batch[j],
                  displayName: d?.display_name || `Người quan tâm #${batch[j].slice(-5)}`,
                  phone: d?.shared_info?.phone ? String(d.shared_info.phone) : undefined,
                  followedAt: new Date().toISOString(),
                });
              }
            }
            if (synced.length > 0) {
              followers = synced;
              await writePrivateSetting(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY, synced);
            }
          }
        }
      } catch {
        // ignore non-critical follower preload error
      }
    }

    return res.status(200).json({
      ok: true,
      oa: ZALO_OA_KP3_DEFAULTS,
      config: {
        oaId: savedCfg.oaId,
        oaName: savedCfg.oaName,
        oaUrl: savedCfg.oaUrl,
        appId: savedCfg.appId,
        znsTemplateId: savedCfg.znsTemplateId || "",
        senderEmail: savedCfg.senderEmail || "",
        notifyBdhEmail: savedCfg.notifyBdhEmail || "bdhkhupho3.ap@gmail.com",
        autoRemind15dEnabled: savedCfg.autoRemind15dEnabled,
        remindDaysThreshold: savedCfg.remindDaysThreshold || 15,
        includeExpiredWithin7d: Boolean(savedCfg.includeExpiredWithin7d),
        autoRemindMeeting60mEnabled: savedCfg.autoRemindMeeting60mEnabled !== false,
        meetingRemindMinutesBefore: Number(savedCfg.meetingRemindMinutesBefore) || 60,
        hasAccessToken,
        maskedAccessToken: maskSecret(savedCfg.accessToken || process.env.ZALO_OA_ACCESS_TOKEN),
        hasRefreshToken,
        maskedRefreshToken: maskSecret(savedCfg.refreshToken || process.env.ZALO_OA_REFRESH_TOKEN),
        hasAppSecret: Boolean((savedCfg.appSecret || process.env.ZALO_APP_SECRET || "").trim()),
        hasEmailKey,
        maskedEmailKey: maskSecret(savedCfg.resendApiKey || process.env.RESEND_API_KEY),
        updatedAt: savedCfg.updatedAt,
        updatedBy: savedCfg.updatedBy,
      },
      linkedFollowersCount: Array.isArray(followers) ? followers.length : 0,
      followersSample: Array.isArray(followers) ? followers.slice(0, 20) : [],
      recentLogs: Array.isArray(logs) ? logs.slice(0, 40) : [],
    });
  }

  if (action === "save_config") {
    const nextCfg: ZaloOaSavedConfig = {
      ...savedCfg,
      oaId: String(body.oaId || savedCfg.oaId || ZALO_OA_KP3_DEFAULTS.oaId).trim(),
      oaName: String(body.oaName || savedCfg.oaName || ZALO_OA_KP3_DEFAULTS.oaName).trim(),
      oaUrl: String(body.oaUrl || savedCfg.oaUrl || ZALO_OA_KP3_DEFAULTS.oaUrl).trim(),
      appId: String(body.appId || savedCfg.appId || ZALO_OA_KP3_DEFAULTS.linkedAppId).trim(),
      znsTemplateId:
        body.znsTemplateId !== undefined
          ? String(body.znsTemplateId).trim()
          : savedCfg.znsTemplateId,
      senderEmail:
        body.senderEmail !== undefined ? String(body.senderEmail).trim() : savedCfg.senderEmail,
      notifyBdhEmail:
        body.notifyBdhEmail !== undefined
          ? String(body.notifyBdhEmail).trim()
          : savedCfg.notifyBdhEmail,
      autoRemind15dEnabled:
        typeof body.autoRemind15dEnabled === "boolean"
          ? body.autoRemind15dEnabled
          : savedCfg.autoRemind15dEnabled,
      remindDaysThreshold: Math.min(
        60,
        Math.max(1, Number(body.remindDaysThreshold) || savedCfg.remindDaysThreshold || 15)
      ),
      includeExpiredWithin7d:
        typeof body.includeExpiredWithin7d === "boolean"
          ? body.includeExpiredWithin7d
          : savedCfg.includeExpiredWithin7d,
      autoRemindMeeting60mEnabled:
        typeof body.autoRemindMeeting60mEnabled === "boolean"
          ? body.autoRemindMeeting60mEnabled
          : savedCfg.autoRemindMeeting60mEnabled !== false,
      meetingRemindMinutesBefore: Math.min(
        240,
        Math.max(5, Number(body.meetingRemindMinutesBefore) || savedCfg.meetingRemindMinutesBefore || 60)
      ),
      updatedAt: new Date().toISOString(),
      updatedBy: caller.actorName,
    };

    if (typeof body.accessToken === "string" && body.accessToken.trim()) {
      nextCfg.accessToken = body.accessToken.trim();
    }
    if (typeof body.refreshToken === "string" && body.refreshToken.trim()) {
      nextCfg.refreshToken = body.refreshToken.trim();
    }
    if (typeof body.appSecret === "string" && body.appSecret.trim()) {
      nextCfg.appSecret = body.appSecret.trim();
    }
    if (typeof body.resendApiKey === "string" && body.resendApiKey.trim()) {
      nextCfg.resendApiKey = body.resendApiKey.trim();
    }

    await writePrivateSetting(supabaseUrl, serviceRoleKey, CONFIG_KEY, nextCfg);
    return res.status(200).json({
      ok: true,
      message: "Đã lưu cấu hình kết nối Zalo OA & tự động nhắc hạn 15 ngày thành công.",
    });
  }

  // 4. Quét & Gửi nhắc gia hạn tạm trú trước 15 ngày cho Chủ nhà trọ + Cư dân
  if (action === "scan_or_send_15d_reminders") {
    const dryRun = body.dryRun !== false;
    const thresholdDays = Math.min(
      60,
      Math.max(1, Number(body.thresholdDays) || savedCfg.remindDaysThreshold || 15)
    );
    const includeExpired7d =
      typeof body.includeExpiredWithin7d === "boolean"
        ? body.includeExpiredWithin7d
        : Boolean(savedCfg.includeExpiredWithin7d);

    // Tải danh sách cư dân tạm trú có hạn đăng ký + cơ sở kinh doanh nhà trọ
    const [resRows, bizRows, followers, prevLogs] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/residents?status=eq.${encodeURIComponent(
          "Tạm trú"
        )}&temporary_exp_date=not.is.null&select=id,full_name,cccd,phone,address,current_address,temporary_exp_date,owner_name,relation_to_owner&limit=10000`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
        }
      ).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(
        `${supabaseUrl}/rest/v1/businesses?is_accommodation=eq.true&select=id,name,owner_name,phone,address`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
        }
      ).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
    ]);

    const followerList = Array.isArray(followers) ? followers : [];
    const existingLogs = Array.isArray(prevLogs) ? prevLogs : [];
    const sentDedupeSet = new Set(
      existingLogs
        .filter((l) => l.status === "sent" && l.dedupeKey)
        .map((l) => String(l.dedupeKey))
    );

    const dueResidents: Array<{
      id: string;
      fullName: string;
      cccdMasked: string;
      cccd: string;
      phone: string;
      address: string;
      expFormatted: string;
      daysLeft: number;
      ownerName: string;
      hostelName: string;
      landlordName: string;
      landlordPhone: string;
    }> = [];

    for (const r of resRows || []) {
      const { daysLeft, formatted } = parseExpDateDaysLeft(r.temporary_exp_date);
      if (daysLeft === null) continue;
      const inWindow = includeExpired7d
        ? daysLeft >= -7 && daysLeft <= thresholdDays
        : daysLeft >= 0 && daysLeft <= thresholdDays;
      if (!inWindow) continue;

      const fullAddr = String(r.current_address || r.address || "").trim();
      const hostelInfo = parseHostelFromAddress(fullAddr);

      // Đối khớp thêm SĐT chủ nhà trọ từ bảng businesses nếu địa chỉ chưa có SĐT
      let landlordPhone = hostelInfo.landlordPhone;
      let landlordName = hostelInfo.landlordName;
      let hostelName = hostelInfo.hostelName;

      if ((!landlordPhone || !hostelName) && Array.isArray(bizRows)) {
        const houseCodeMatch = fullAddr.match(/\b(\d+[A-Za-z0-9]*\/[A-Za-z0-9]+)\b/i);
        const matchedBiz = houseCodeMatch
          ? bizRows.find((b: any) =>
              String(b.address || "")
                .toUpperCase()
                .includes(houseCodeMatch[1].toUpperCase())
            )
          : undefined;
        if (matchedBiz) {
          hostelName = hostelName || matchedBiz.name || "";
          landlordName = landlordName || matchedBiz.owner_name || "";
          landlordPhone = landlordPhone || matchedBiz.phone || "";
        }
      }

      const cccdStr = String(r.cccd || "");
      dueResidents.push({
        id: r.id,
        fullName: r.full_name,
        cccd: cccdStr,
        cccdMasked:
          cccdStr.length >= 8 ? `${cccdStr.slice(0, 3)}*****${cccdStr.slice(-4)}` : cccdStr,
        phone: r.phone && r.phone !== "N/A" ? String(r.phone).trim() : "",
        address: fullAddr,
        expFormatted: formatted,
        daysLeft,
        ownerName: r.owner_name || r.full_name,
        hostelName,
        landlordName,
        landlordPhone,
      });
    }

    dueResidents.sort((a, b) => a.daysLeft - b.daysLeft);

    // Gom nhóm theo Chủ nhà trọ / Điểm lưu trú
    const landlordMap = new Map<
      string,
      {
        key: string;
        hostelName: string;
        landlordName: string;
        landlordPhone: string;
        address: string;
        tenants: typeof dueResidents;
        sampleMessage: string;
      }
    >();

    for (const item of dueResidents) {
      const groupKey =
        item.landlordPhone ||
        item.hostelName ||
        `INDEP:${item.ownerName}:${item.address.slice(0, 24)}`;
      if (!landlordMap.has(groupKey)) {
        landlordMap.set(groupKey, {
          key: groupKey,
          hostelName: item.hostelName || `Hộ tạm trú ${item.ownerName}`,
          landlordName: item.landlordName || item.ownerName,
          landlordPhone: item.landlordPhone || item.phone,
          address: item.address,
          tenants: [],
          sampleMessage: "",
        });
      }
      landlordMap.get(groupKey)!.tenants.push(item);
    }

    const landlordDigests = Array.from(landlordMap.values()).map((grp) => {
      const tenantLines = grp.tenants
        .slice(0, 12)
        .map(
          (t, idx) =>
            `${idx + 1}. ${t.fullName} (CCCD ${t.cccdMasked}) — Hạn: ${t.expFormatted} (${
              t.daysLeft < 0 ? `Quá hạn ${Math.abs(t.daysLeft)} ngày` : `Còn ${t.daysLeft} ngày`
            })`
        )
        .join("\n");
      const moreLine =
        grp.tenants.length > 12 ? `\n... và ${grp.tenants.length - 12} nhân khẩu khác.` : "";

      const msg = [
        `[BAN ĐIỀU HÀNH KHU PHỐ 3 - PHƯỜNG AN PHÚ]`,
        `Kính gửi Chủ cơ sở / Chủ hộ: ${grp.landlordName} (${grp.hostelName})`,
        `Hệ thống Quản lý Cư trú KP3 trân trọng thông báo có ${grp.tenants.length} nhân khẩu tạm trú sắp đến hạn gia hạn (trước ${thresholdDays} ngày):`,
        tenantLines + moreLine,
        `Đề nghị Ông/Bà hướng dẫn người thuê thực hiện gia hạn tạm trú (Mẫu CT01/CT08) trên Cổng DVC Bộ Công an (dichvucong.bocongan.gov.vn) hoặc liên hệ CSKV Đại úy Trần Quốc Hải. Theo dõi Zalo OA KP3: ${ZALO_OA_KP3_DEFAULTS.oaUrl}`,
      ].join("\n");

      return {
        ...grp,
        tenantCount: grp.tenants.length,
        sampleMessage: msg,
      };
    });

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        thresholdDays,
        totalDueResidents: dueResidents.length,
        totalLandlordGroups: landlordDigests.length,
        landlordDigests: landlordDigests.slice(0, 60),
        dueResidentsSample: dueResidents.slice(0, 80),
      });
    }

    // Thực thi gửi thật qua Zalo OA / ZNS / Email + ghi Outbox Log
    const accessToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    const resendKey = (savedCfg.resendApiKey || process.env.RESEND_API_KEY || "").trim();
    const newLogs: NotificationLogEntry[] = [];
    let sentCount = 0;
    let manualReadyCount = 0;

    for (const grp of landlordDigests) {
      const dedupeKey = `15d_grp:${grp.key}:${new Date().toISOString().slice(0, 10)}`;
      if (sentDedupeSet.has(dedupeKey) && !body.forceResend) continue;

      const matchedFollower = findMatchingZaloFollower(
        grp.landlordName,
        grp.landlordPhone,
        followerList
      );

      let sentOk = false;
      let channelUsed: NotificationLogEntry["channel"] = "outbox_ready";
      let detail = "Đã tạo phiếu nhắc hạn chuẩn (bấm Nhắn Zalo 1-chạm hoặc mời Chủ trọ bấm Quan tâm OA)";

      if (accessToken && matchedFollower?.zaloUserId) {
        const csRes = await sendZaloOaCsMessage(
          accessToken,
          matchedFollower.zaloUserId,
          grp.sampleMessage,
          { cfg: savedCfg, supabaseUrl, serviceRoleKey }
        );
        if (csRes.ok) {
          sentOk = true;
          channelUsed = "zalo_oa";
          detail = csRes.detail;
        } else {
          detail = csRes.detail;
        }
      } else if (accessToken && savedCfg.znsTemplateId && grp.landlordPhone) {
        const znsRes = await sendZaloZnsTemplate(
          accessToken,
          grp.landlordPhone,
          savedCfg.znsTemplateId,
          {
            customer_name: grp.landlordName,
            hostel_name: grp.hostelName,
            tenant_count: String(grp.tenantCount),
            expire_date: grp.tenants[0]?.expFormatted || "",
          }
        );
        if (znsRes.ok) {
          sentOk = true;
          channelUsed = "zalo_zns";
          detail = znsRes.detail;
        } else {
          detail = znsRes.detail;
        }
      }

      if (sentOk) sentCount++;
      else manualReadyCount++;

      newLogs.push({
        id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        channel: channelUsed,
        notificationType: "temp_expiry_15d_landlord",
        recipientName: grp.landlordName,
        recipientRole: "landlord",
        recipientPhone: grp.landlordPhone || undefined,
        hostelName: grp.hostelName,
        subject: `Nhắc gia hạn tạm trú trước ${thresholdDays} ngày (${grp.tenantCount} nhân khẩu)`,
        messagePreview: grp.sampleMessage.slice(0, 280),
        status: sentOk ? "sent" : "queued_manual_zalo",
        detail,
        dedupeKey,
        actorName: caller.actorName,
      });
    }

    // Gửi Email tổng hợp báo cáo đợt nhắc hạn về Email công vụ BĐH KP3 nếu có Resend API Key
    const summaryEmail = (savedCfg.notifyBdhEmail || "").trim();
    if (resendKey && summaryEmail && landlordDigests.length > 0) {
      const digestBody = landlordDigests
        .slice(0, 30)
        .map(
          (g, i) =>
            `${i + 1}. ${g.hostelName} — Chủ hộ/trọ: ${g.landlordName} (SĐT: ${
              g.landlordPhone || "Chưa có"
            }) — ${g.tenantCount} người sắp hết hạn`
        )
        .join("\n");
      const mailRes = await sendResendEmail(
        resendKey,
        savedCfg.senderEmail || "",
        summaryEmail,
        `[KP3 An Phú] Tổng hợp ${dueResidents.length} nhân khẩu tạm trú cần gia hạn trong ${thresholdDays} ngày tới`,
        `Kính gửi Ban Điều hành Khu phố 3,\n\nHệ thống tự động tổng hợp ${dueResidents.length} nhân khẩu thuộc ${landlordDigests.length} nhà trọ / hộ tạm trú sắp đến hạn trong ${thresholdDays} ngày tới:\n\n${digestBody}\n\nTrân trọng,\nHệ thống Quản lý Thông minh KP3 An Phú`
      );
      newLogs.unshift({
        id: `NTF-MAIL-${Date.now()}`,
        timestamp: new Date().toISOString(),
        channel: "email",
        notificationType: "temp_expiry_15d_landlord",
        recipientName: "Ban Điều hành Khu phố 3",
        recipientRole: "landlord",
        recipientEmail: summaryEmail,
        subject: `Báo cáo Email tổng hợp ${dueResidents.length} nhân khẩu sắp hết hạn tạm trú`,
        messagePreview: digestBody.slice(0, 240),
        status: mailRes.ok ? "sent" : "failed",
        detail: mailRes.detail,
        actorName: caller.actorName,
      });
      if (mailRes.ok) sentCount++;
    }

    const mergedLogs = [...newLogs, ...existingLogs].slice(0, 250);
    await writePrivateSetting(supabaseUrl, serviceRoleKey, LOGS_KEY, mergedLogs);

    return res.status(200).json({
      ok: true,
      dryRun: false,
      totalDueResidents: dueResidents.length,
      totalLandlordGroups: landlordDigests.length,
      sentDirectlyCount: sentCount,
      queuedManualZaloCount: manualReadyCount,
      logsCreated: newLogs.length,
    });
  }

  // 5. Gửi Thông báo chung từ Ban Điều hành Khu phố 3 đến Người dân (Zalo OA Followers + Email + Tin tức Cổng Cư dân)
  if (action === "send_broadcast") {
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const publishToPortalNews = body.publishToPortalNews !== false;

    if (!title || !content) {
      return res.status(400).json({
        ok: false,
        error: "Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo gửi người dân.",
      });
    }

    const [followers, prevLogs] = await Promise.all([
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
    ]);
    const followerList = Array.isArray(followers) ? followers : [];
    const existingLogs = Array.isArray(prevLogs) ? prevLogs : [];
    const accessToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );

    const formattedBroadcast = `📢 [THÔNG BÁO KHU PHỐ 3 - PHƯỜNG AN PHÚ]\n${title.toUpperCase()}\n\n${content}\n\n👉 Xem chi tiết tại Cổng Cư dân KP3: https://bdhkp3.vercel.app\n👉 Zalo OA chính thức: ${ZALO_OA_KP3_DEFAULTS.oaUrl}`;

    let zaloSent = 0;
    if (accessToken && followerList.length > 0) {
      for (const f of followerList.slice(0, 100)) {
        const r = await sendZaloOaCsMessage(accessToken, f.zaloUserId, formattedBroadcast);
        if (r.ok) zaloSent++;
      }
    }

    // Đồng bộ đăng lên bảng community_news trên Cổng Cư dân nếu được chọn
    let portalPublished = false;
    if (publishToPortalNews) {
      const newsRes = await fetch(`${supabaseUrl}/rest/v1/community_news`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          title,
          category: "Thông báo",
          summary: content.slice(0, 180),
          content,
          author_name: caller.actorName,
          is_pinned: true,
        }),
      });
      portalPublished = newsRes.ok;
    }

    const logItem: NotificationLogEntry = {
      id: `NTF-BC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: zaloSent > 0 ? "zalo_oa" : "outbox_ready",
      notificationType: "community_broadcast",
      recipientName: `Cư dân Khu phố 3 (${ZALO_OA_KP3_DEFAULTS.verifiedFollowersBaseline}+ người quan tâm OA)`,
      recipientRole: "community",
      subject: title,
      messagePreview: content.slice(0, 260),
      status: zaloSent > 0 || portalPublished ? "sent" : "queued_manual_zalo",
      detail: `Zalo OA đẩy trực tiếp: ${zaloSent} người • Cổng Cư dân: ${
        portalPublished ? "Đã đăng Thông báo ghim" : "Không đăng"
      }`,
      actorName: caller.actorName,
    };

    await writePrivateSetting(
      supabaseUrl,
      serviceRoleKey,
      LOGS_KEY,
      [logItem, ...existingLogs].slice(0, 250)
    );

    return res.status(200).json({
      ok: true,
      zaloSent,
      portalPublished,
      formattedBroadcast,
      oaArticleUrl: "https://oa.nhatkyzalo.vn/manage/content/article/",
    });
  }

  // 6. Quét & Nhắc Lịch Họp / Lịch Công Tác Cho Cán Bộ Khu Phố 3 Qua Zalo OA & Email (Hỗ trợ tự động nhắc trước 60 phút)
  if (action === "scan_or_send_cadre_meeting_reminders") {
    const dryRun = body.dryRun !== false;
    const onlyWithinLeadWindow = body.onlyWithinLeadWindow === true;
    const remindLeadMinutes = Math.min(
      240,
      Math.max(
        5,
        Number(body.remindMinutesBefore) || Number(savedCfg.meetingRemindMinutesBefore) || 60
      )
    );
    const scheduleId = String(body.scheduleId || "").trim();
    const daysAhead = Math.min(
      30,
      Math.max(0, Number(body.daysAhead ?? (onlyWithinLeadWindow ? 1 : 7)))
    );

    if (onlyWithinLeadWindow && !dryRun && savedCfg.autoRemindMeeting60mEnabled === false) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "autoRemindMeeting60mEnabled is disabled",
        totalMeetings: 0,
      });
    }

    // Mốc ngày theo chuẩn giờ Việt Nam (UTC+7)
    const nowUtcMs = Date.now();
    const vnNow = new Date(nowUtcMs + 7 * 3_600_000);
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const toVnIso = (d: Date) =>
      `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const todayIso = toVnIso(vnNow);
    const vnEnd = new Date(vnNow.getTime() + daysAhead * 86_400_000);
    const endIso = toVnIso(vnEnd);

    const scheduleQuery = scheduleId
      ? `${supabaseUrl}/rest/v1/work_schedules?id=eq.${encodeURIComponent(scheduleId)}&select=*`
      : `${supabaseUrl}/rest/v1/work_schedules?schedule_date=gte.${todayIso}&schedule_date=lte.${endIso}&order=schedule_date.asc,schedule_time.asc&select=*`;

    const [schRows, assocRows, profRows, followers, prevLogs, cadreMappingData] = await Promise.all([
      fetch(scheduleQuery, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${supabaseUrl}/rest/v1/user_profiles?approval_status=eq.approved&select=id,full_name,email,phone,position`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }).then((r) => (r.ok ? r.json() : [])),
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
      readPrivateSetting<Record<string, CadreZaloMappingEntry>>(supabaseUrl, serviceRoleKey, CADRE_ZALO_MAPPING_KEY),
    ]);

    const followerList = Array.isArray(followers) ? followers : [];
    const existingLogs = Array.isArray(prevLogs) ? prevLogs : [];
    const cadreMapping: Record<string, CadreZaloMappingEntry> = cadreMappingData && typeof cadreMappingData === "object" ? cadreMappingData : {};

    // Xây dựng danh bạ Cán bộ KP3 (Họ tên, Chức vụ, SĐT, Email, Zalo UID)
    const cadreDirectory = new Map<
      string,
      {
        fullName: string;
        role: string;
        phone: string;
        email: string;
        zaloUserId?: string;
      }
    >();

    const assocList: any[] = Array.isArray(assocRows?.[0]?.payload) ? assocRows[0].payload : [];
    for (const assoc of assocList) {
      if (!assoc || !Array.isArray(assoc.members)) continue;
      for (const m of assoc.members) {
        const nm = String(m?.fullName || m?.name || "").trim();
        const key = normalizeCadreKey(nm);
        if (!key || key.length < 4) continue;
        const phone = String(m?.phone || "").trim();
        const prev = cadreDirectory.get(key);
        cadreDirectory.set(key, {
          fullName: nm,
          role: prev?.role || `${m?.role || "Cán bộ"} (${assoc.name || "KP3"})`,
          phone: phone || prev?.phone || "",
          email: prev?.email || "",
          zaloUserId: m?.zaloUserId || prev?.zaloUserId,
        });
      }
    }

    for (const p of profRows || []) {
      const key = normalizeCadreKey(p.full_name);
      if (!key) continue;
      const prev = cadreDirectory.get(key);
      cadreDirectory.set(key, {
        fullName: prev?.fullName || p.full_name,
        role: prev?.role || p.position || "Cán bộ KP3",
        phone: String(p.phone || prev?.phone || "").trim(),
        email: String(p.email || prev?.email || "").trim(),
        zaloUserId: prev?.zaloUserId,
      });
    }

    // Ưu tiên 1: Lấy Zalo UID từ Cadre Mapping cố định; Ưu tiên 2: Zalo UID lưu trong Chi hội; Ưu tiên 3: Đoán tên mờ
    for (const [k, item] of cadreDirectory.entries()) {
      if (cadreMapping[k]?.zaloUserId) {
        item.zaloUserId = cadreMapping[k].zaloUserId;
      } else if (!item.zaloUserId) {
        const matchedF = findMatchingZaloFollower(item.fullName, item.phone, followerList);
        if (matchedF) item.zaloUserId = matchedF.zaloUserId;
      }
    }

    const activeSchedules = (Array.isArray(schRows) ? schRows : []).filter((row: any) => {
      if (row.status === "Đã hoãn") return false;
      const rawAtts = Array.isArray(row.attachments) ? row.attachments : [];
      const metaEntry = rawAtts.find((a: any) => a && a.id === "__KP3_SCHEDULE_META_V1__");
      if (!scheduleId && metaEntry?.meta?.relevanceTier === "ward_reference") return false;
      return true;
    });

    const meetingReminders = activeSchedules.map((row: any) => {
      const rawAtts = Array.isArray(row.attachments) ? row.attachments : [];
      const metaEntry = rawAtts.find((a: any) => a && a.id === "__KP3_SCHEDULE_META_V1__");
      const assignedOfficers: any[] = Array.isArray(metaEntry?.meta?.assignedOfficers)
        ? metaEntry.meta.assignedOfficers
        : [];

      const [y, m, d] = String(row.schedule_date || "").split("-");
      const dmy = d && m && y ? `${d}/${m}/${y}` : String(row.schedule_date || "");
      const hay = normalizeCadreKey(`${row.attendees || ""} ${row.host || ""}`);

      const matchedCadres: Array<{
        fullName: string;
        role: string;
        phone: string;
        email: string;
        zaloUserId?: string;
      }> = [];
      const seenKeys = new Set<string>();

      for (const off of assignedOfficers) {
        const k = normalizeCadreKey(off?.personName);
        if (!k || seenKeys.has(k)) continue;
        seenKeys.add(k);
        const dir = cadreDirectory.get(k);
        const fMatch =
          dir?.zaloUserId
            ? { zaloUserId: dir.zaloUserId }
            : findMatchingZaloFollower(off.personName, dir?.phone, followerList);
        matchedCadres.push({
          fullName: off.personName,
          role: off.roleLabel || dir?.role || "Cán bộ KP3",
          phone: dir?.phone || "",
          email: dir?.email || "",
          zaloUserId: fMatch?.zaloUserId,
        });
      }

      for (const [k, dir] of cadreDirectory.entries()) {
        if (seenKeys.has(k)) continue;
        if (hay.includes(k)) {
          seenKeys.add(k);
          matchedCadres.push(dir);
        }
      }

      // Từ đồng nghĩa chức danh đoàn thể để tự động nhận diện cán bộ phụ trách
      const ROLE_SYNONYMS: Record<string, string[]> = {
        "pham ngoc ha": ["khu doi", "khu doi truong", "chi huy quan su", "quan su", "pho bi thu", "pho bi thu chi bo", "0908579479", "so"],
        "nghiem xuan quynh": ["bi thu", "bi thu chi bo", "chi uy", "thuong truc chi bo"],
        "nguyen trung huy": ["truong ban dieu hanh", "truong khu pho", "to truong to hoa giai", "ban dieu hanh", "bdh"],
        "tran thi my dung": ["mat tran", "truong ban ctmt", "ban cong tac mat tran"],
        "pham van long": ["antt", "an ninh trat tu", "to truong antt"],
        "bui van tac": ["cuu chien binh", "ccb", "chi hoi cuu chien binh"],
        "pham thi lanh": ["phu nu", "chi hoi phu nu"],
        "dang van minh tien": ["doan thanh nien", "chi doan", "bi thu chi doan"],
      };

      for (const [cadreName, syns] of Object.entries(ROLE_SYNONYMS)) {
        const k = normalizeCadreKey(cadreName);
        if (seenKeys.has(k)) continue;
        if (syns.some((s) => hay.includes(s))) {
          const dir = cadreDirectory.get(k);
          if (dir) {
            seenKeys.add(k);
            matchedCadres.push(dir);
          }
        }
      }

      // Nếu lịch ghi chung "Ban điều hành" / "Chi bộ" mà chưa tách tên cá nhân -> mặc định nhắc Thường trực KP3
      if (matchedCadres.length === 0) {
        for (const [k, dir] of cadreDirectory.entries()) {
          if (
            dir.role.toLowerCase().includes("bí thư") ||
            dir.role.toLowerCase().includes("trưởng khu phố") ||
            dir.role.toLowerCase().includes("mặt trận")
          ) {
            seenKeys.add(k);
            matchedCadres.push(dir);
          }
          if (matchedCadres.length >= 4) break;
        }
      }

      const timeInfo = parseMeetingStartVnInfo(
        row.schedule_date,
        row.schedule_time,
        remindLeadMinutes,
        nowUtcMs
      );
      const is60mUrgent = timeInfo.inRemindWindow || onlyWithinLeadWindow;
      const meetingDedupePrefix = `mtg_${remindLeadMinutes}m:${row.id}:${row.schedule_date}`;
      const alreadyAutoReminded = existingLogs.some(
        (l) => l.dedupeKey && l.dedupeKey.startsWith(meetingDedupePrefix)
      );

      const formattedMessage = is60mUrgent
        ? [
            `⏰ [NHẮC TRƯỚC ${remindLeadMinutes} PHÚT - LỊCH HỌP KHU PHỐ 3 AN PHÚ]`,
            timeInfo.minutesUntilStart && timeInfo.minutesUntilStart > 0
              ? `Cuộc họp sẽ diễn ra sau ${timeInfo.minutesUntilStart} phút (${row.schedule_time || ""} hôm nay ${dmy}):`
              : `Nhắc lịch họp sắp diễn ra (${row.schedule_time || ""} — Ngày ${dmy}):`,
            `• Nội dung: ${row.title}`,
            `• Địa điểm: ${row.location || "Nhà văn hóa / UBND Phường An Phú"}`,
            `• Thành phần dự: ${row.attendees || matchedCadres.map((c) => c.fullName).join(", ")}`,
            `Đề nghị đồng chí chuẩn bị tài liệu và có mặt đúng giờ!`,
            `👉 Xem lịch chi tiết: https://bdhkp3.vercel.app/dashboard/tasks`,
          ].join("\n")
        : [
            `📅 [NHẮC LỊCH HỌP & CÔNG TÁC - KHU PHỐ 3 AN PHÚ]`,
            `• Nội dung: ${row.title}`,
            `• Thời gian: ${row.schedule_time || "Theo giấy mời"} — Ngày ${dmy} (Hệ thống tự động nhắc lại trước ${remindLeadMinutes} phút lúc ${timeInfo.remindAtHHmm})`,
            `• Địa điểm: ${row.location || "Nhà văn hóa / UBND Phường An Phú"}`,
            `• Thành phần dự: ${row.attendees || matchedCadres.map((c) => c.fullName).join(", ")}`,
            `Đề nghị các đồng chí sắp xếp tham dự đúng giờ. Xem lịch chi tiết: https://bdhkp3.vercel.app/dashboard/tasks`,
          ].join("\n");

      return {
        id: row.id,
        title: row.title,
        dateIso: row.schedule_date,
        dateFormatted: dmy,
        time: row.schedule_time || "",
        location: row.location || "",
        attendees: row.attendees || "",
        minutesUntilStart: timeInfo.minutesUntilStart,
        remindAtHHmm: timeInfo.remindAtHHmm,
        remindLeadMinutes,
        inRemindWindow: timeInfo.inRemindWindow,
        alreadyAutoReminded,
        cadres: matchedCadres,
        formattedMessage,
      };
    });

    const filteredMeetings = onlyWithinLeadWindow
      ? meetingReminders.filter((m) => m.inRemindWindow)
      : meetingReminders;

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        remindLeadMinutes,
        autoRemindMeeting60mEnabled: savedCfg.autoRemindMeeting60mEnabled !== false,
        totalMeetings: filteredMeetings.length,
        meetings: filteredMeetings,
      });
    }

    let activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    const resendKey = (savedCfg.resendApiKey || process.env.RESEND_API_KEY || "").trim();
    const newLogs: NotificationLogEntry[] = [];
    const sentDedupeSet = new Set(
      existingLogs
        .filter((l) => l.status === "sent" && l.dedupeKey)
        .map((l) => String(l.dedupeKey))
    );
    let sentCount = 0;
    let manualReadyCount = 0;

    for (const mtg of filteredMeetings) {
      const targetCadres =
        mtg.cadres.length > 0
          ? mtg.cadres
          : [{ fullName: "Ban Điều hành Khu phố 3", role: "Tập thể BĐH", phone: "", email: "" }];

      for (const cadre of targetCadres) {
        const cadreKey = normalizeCadreKey(cadre.fullName) || "bdh";
        const dedupeKey = `mtg_${remindLeadMinutes}m:${mtg.id}:${mtg.dateIso}:${cadreKey}`;
        if (onlyWithinLeadWindow && sentDedupeSet.has(dedupeKey) && !body.forceResend) {
          continue;
        }

        let sentOk = false;
        let channelUsed: NotificationLogEntry["channel"] = "outbox_ready";
        let detail =
          "Cán bộ chưa bấm Quan tâm Zalo OA Ban Điều Hành Khu Phố 3 (https://zalo.me/bdhkhupho3)";

        const matchedFollower = (cadre as any).zaloUserId
          ? { zaloUserId: String((cadre as any).zaloUserId) }
          : cadreMapping[cadreKey]?.zaloUserId
          ? { zaloUserId: cadreMapping[cadreKey].zaloUserId }
          : findMatchingZaloFollower(cadre.fullName, cadre.phone, followerList);
        const zaloUid = matchedFollower?.zaloUserId;

        if (activeToken && zaloUid) {
          const csRes = await sendZaloOaCsMessage(
            activeToken,
            zaloUid,
            mtg.formattedMessage,
            { cfg: savedCfg, supabaseUrl, serviceRoleKey }
          );
          if (csRes.newToken) activeToken = csRes.newToken;
          if (csRes.ok) {
            sentOk = true;
            channelUsed = "zalo_oa";
            detail = csRes.detail;
          } else {
            detail = csRes.detail;
          }
        } else if (resendKey && cadre.email) {
          const mailRes = await sendResendEmail(
            resendKey,
            savedCfg.senderEmail || "",
            cadre.email,
            `[Nhắc trước ${remindLeadMinutes} phút - ${mtg.time} ${mtg.dateFormatted}] ${mtg.title}`,
            mtg.formattedMessage
          );
          if (mailRes.ok) {
            sentOk = true;
            channelUsed = "email";
            detail = mailRes.detail;
          }
        }

        if (sentOk) sentCount++;
        else manualReadyCount++;

        sentDedupeSet.add(dedupeKey);
        newLogs.push({
          id: `NTF-MTG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          channel: channelUsed,
          notificationType: "cadre_meeting_reminder",
          recipientName: cadre.fullName,
          recipientRole: "cadre",
          recipientPhone: cadre.phone || undefined,
          recipientEmail: cadre.email || undefined,
          subject: `Nhắc trước ${remindLeadMinutes}p (${mtg.dateFormatted} ${mtg.time}): ${mtg.title}`,
          messagePreview: mtg.formattedMessage.slice(0, 260),
          status: sentOk ? "sent" : "queued_manual_zalo",
          detail,
          dedupeKey,
          actorName: onlyWithinLeadWindow ? `Tự động trước ${remindLeadMinutes} phút` : caller.actorName,
        });
      }
    }

    if (newLogs.length > 0) {
      await writePrivateSetting(
        supabaseUrl,
        serviceRoleKey,
        LOGS_KEY,
        [...newLogs, ...existingLogs].slice(0, 250)
      );
    }

    return res.status(200).json({
      ok: true,
      dryRun: false,
      remindLeadMinutes,
      totalMeetings: filteredMeetings.length,
      sentDirectlyCount: sentCount,
      queuedManualZaloCount: manualReadyCount,
      firstFormattedMessage: filteredMeetings[0]?.formattedMessage || "",
      meetings: filteredMeetings,
    });
  }

  // 6. Lấy danh sách bài viết từ Zalo OA để xem trước & đối soát (Preview)
  if (action === "fetch_zalo_articles_preview") {
    let activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    if (!activeToken) {
      return res.status(400).json({
        ok: false,
        error: "Chưa cấu hình hoặc không thể kết nối Zalo OA Access Token.",
      });
    }

    const baseOffset = Math.max(0, Number(body.offset) || 0);
    const targetLimit = Math.min(50, Math.max(1, Number(body.limit) || 20));

    // Zalo Article API strictly enforces maximum limit is 10 per request
    const medias: any[] = [];
    let totalArticles = 0;
    let currentOffset = baseOffset;
    let hasAttemptedTokenRefresh = false;

    while (medias.length < targetLimit) {
      const batchSize = Math.min(10, targetLimit - medias.length);
      const r = await fetch(
        `https://openapi.zalo.me/v2.0/article/getslice?offset=${currentOffset}&limit=${batchSize}&type=normal`,
        { headers: { access_token: activeToken } }
      );
      const sliceRes = await r.json().catch(() => ({}));

      if (sliceRes?.error && sliceRes.error !== 0) {
        if ((sliceRes.error === -216 || sliceRes.error === -220) && !hasAttemptedTokenRefresh) {
          hasAttemptedTokenRefresh = true;
          const refreshed = await refreshZaloAccessTokenIfNeeded(
            savedCfg,
            supabaseUrl,
            serviceRoleKey,
            true
          );
          if (refreshed) {
            activeToken = refreshed;
            continue; // retry this chunk with refreshed token
          }
        }

        if (medias.length > 0) {
          // Trả về số bài đã lấy được nếu các batch sau gặp lỗi
          break;
        }

        return res.status(400).json({
          ok: false,
          error: `Zalo Article API báo lỗi: ${sliceRes?.message || sliceRes?.error}`,
          zaloError: sliceRes?.error,
        });
      }

      totalArticles = Number(sliceRes?.data?.total) || totalArticles;
      const batch = Array.isArray(sliceRes?.data?.medias) ? sliceRes.data.medias : [];
      if (batch.length === 0) break;

      medias.push(...batch);
      currentOffset += batch.length;
      if (currentOffset >= totalArticles) break;
    }

    // Đọc danh sách community_news hiện có để kiểm tra bài nào đã đồng bộ
    const dbNewsRes = await fetch(
      `${supabaseUrl}/rest/v1/community_news?select=id,title,category,metadata,created_at&limit=1000`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );
    const dbNewsList: any[] = dbNewsRes.ok ? await dbNewsRes.json() : [];

    const syncedMap = new Map<string, any>();
    for (const item of dbNewsList) {
      const zaloId = item.metadata?.zalo_article_id;
      if (zaloId) syncedMap.set(String(zaloId), item);
    }

    const articles = medias.map((m: any) => {
      const isSynced = syncedMap.has(String(m.id));
      const matchedDb = syncedMap.get(String(m.id));
      return {
        id: String(m.id),
        title: String(m.title || "Không có tiêu đề"),
        status: m.status,
        thumb: m.thumb || m.cover?.photo_url || null,
        createDate: m.create_date,
        createDateFormatted: m.create_date
          ? new Date(Number(m.create_date)).toLocaleDateString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "",
        totalView: Number(m.total_view) || 0,
        totalShare: Number(m.total_share) || 0,
        totalLike: Number(m.total_like) || 0,
        linkView: m.link_view || "",
        isSynced,
        existingNewsId: matchedDb?.id || null,
        existingCategory: matchedDb?.category || null,
        suggestedCategory: matchedDb?.category || detectNewsCategory(m.title, ""),
      };
    });

    return res.status(200).json({
      ok: true,
      total: totalArticles,
      offset: baseOffset,
      limit: targetLimit,
      syncedCount: articles.filter((a) => a.isSynced).length,
      unSyncedCount: articles.filter((a) => !a.isSynced).length,
      articles,
    });
  }

  // 7. Đồng bộ bài viết từ Zalo OA vào CSDL community_news
  if (action === "sync_zalo_articles") {
    let activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    if (!activeToken) {
      return res.status(400).json({
        ok: false,
        error: "Chưa cấu hình hoặc không thể kết nối Zalo OA Access Token.",
      });
    }

    const targetArticleIds: string[] = Array.isArray(body.articleIds) ? body.articleIds.map(String) : [];
    const customCategories: Record<string, string> =
      body.customCategories && typeof body.customCategories === "object" ? body.customCategories : {};
    const forceOverwrite = Boolean(body.forceOverwrite);

    // Nếu không truyền ID bài viết cụ thể, lấy danh sách 10 bài mới nhất trên Zalo OA
    let articleIdsToProcess = targetArticleIds;
    if (articleIdsToProcess.length === 0) {
      const r = await fetch(
        "https://openapi.zalo.me/v2.0/article/getslice?offset=0&limit=10&type=normal",
        { headers: { access_token: activeToken } }
      );
      const j = await r.json().catch(() => ({}));
      if (Array.isArray(j?.data?.medias)) {
        articleIdsToProcess = j.data.medias.map((m: any) => String(m.id));
      }
    }

    if (articleIdsToProcess.length === 0) {
      return res.status(200).json({
        ok: true,
        syncedCount: 0,
        message: "Không tìm thấy bài viết nào để đồng bộ.",
        results: [],
      });
    }

    // Đọc danh sách community_news hiện có
    const dbNewsRes = await fetch(
      `${supabaseUrl}/rest/v1/community_news?select=id,metadata&limit=1000`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );
    const dbNewsList: any[] = dbNewsRes.ok ? await dbNewsRes.json() : [];
    const syncedMap = new Map<string, string>();
    for (const item of dbNewsList) {
      if (item.metadata?.zalo_article_id) {
        syncedMap.set(String(item.metadata.zalo_article_id), item.id);
      }
    }

    const results: Array<{ id: string; title: string; status: "inserted" | "updated" | "skipped" | "failed"; newsId?: string; error?: string }> = [];
    let insertedCount = 0;
    let updatedCount = 0;

    for (const articleId of articleIdsToProcess) {
      try {
        const existingNewsId = syncedMap.get(articleId);
        if (existingNewsId && !forceOverwrite) {
          results.push({ id: articleId, title: "", status: "skipped", newsId: existingNewsId });
          continue;
        }

        // Lấy chi tiết toàn văn bài viết từ Zalo OA
        let detailRes = await fetch(`https://openapi.zalo.me/v2.0/article/getdetail?id=${articleId}`, {
          headers: { access_token: activeToken },
        });
        let detailJson = await detailRes.json().catch(() => ({}));

        if (detailJson?.error === -216 || detailJson?.error === -220) {
          activeToken = await refreshZaloAccessTokenIfNeeded(savedCfg, supabaseUrl, serviceRoleKey, true);
          if (activeToken) {
            detailRes = await fetch(`https://openapi.zalo.me/v2.0/article/getdetail?id=${articleId}`, {
              headers: { access_token: activeToken },
            });
            detailJson = await detailRes.json().catch(() => ({}));
          }
        }

        if (detailJson?.error !== 0 || !detailJson?.data) {
          results.push({
            id: articleId,
            title: "",
            status: "failed",
            error: detailJson?.message || `Zalo error ${detailJson?.error}`,
          });
          continue;
        }

        const art = detailJson.data;
        const { content, imageUrls } = parseZaloBodyToContent(art.body || []);
        const category =
          customCategories[articleId] || detectNewsCategory(art.title, content);
        const coverImage = art.cover?.photo_url || art.thumb || imageUrls[0] || null;
        const summary =
          (art.description || "").trim() ||
          content.slice(0, 220).replace(/<[^>]+>/g, "").trim();

        const payload: any = {
          title: art.title,
          category,
          content: content || `<p>${summary}</p>`,
          summary,
          author_name: (art.author || "").trim() || "Ban Điều hành Khu phố 3",
          is_urgent: category === "Thông báo khẩn",
          is_pinned: false,
          image_url: coverImage,
          external_url: art.link_view || null,
          attachments: imageUrls,
          metadata: {
            zalo_article_id: art.id,
            zalo_link_view: art.link_view || null,
            zalo_synced_at: new Date().toISOString(),
            views: Number(art.total_view) || 0,
            likes: Number(art.total_like) || 0,
            shares: Number(art.total_share) || 0,
            is_from_zalo_oa: true,
            comment_status: art.comment || "show",
          },
          updated_at: new Date().toISOString(),
        };

        if (existingNewsId) {
          // Update
          const patchRes = await fetch(`${supabaseUrl}/rest/v1/community_news?id=eq.${existingNewsId}`, {
            method: "PATCH",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(payload),
          });
          if (patchRes.ok) {
            updatedCount++;
            results.push({ id: articleId, title: art.title, status: "updated", newsId: existingNewsId });
          } else {
            results.push({ id: articleId, title: art.title, status: "failed", error: "Database update error" });
          }
        } else {
          // Insert
          if (art.create_date) {
            payload.created_at = new Date(Number(art.create_date)).toISOString();
          }
          const postRes = await fetch(`${supabaseUrl}/rest/v1/community_news`, {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(payload),
          });
          const inserted = postRes.ok ? await postRes.json() : null;
          if (inserted && inserted[0]?.id) {
            insertedCount++;
            syncedMap.set(articleId, inserted[0].id);
            results.push({ id: articleId, title: art.title, status: "inserted", newsId: inserted[0].id });
          } else {
            results.push({ id: articleId, title: art.title, status: "failed", error: "Database insert error" });
          }
        }
      } catch (err: any) {
        results.push({ id: articleId, title: "", status: "failed", error: err?.message || "Sync error" });
      }
    }

    // Ghi nhật ký vào notification logs
    const existingLogs =
      (await readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY)) || [];
    const syncLog: NotificationLogEntry = {
      id: `NTF-SYNC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: "zalo_oa",
      notificationType: "zalo_article_sync",
      recipientName: "Cổng Tin tức & Cư Dân Số KP3",
      recipientRole: "system",
      subject: `Đồng bộ bài viết Zalo OA: ${insertedCount} thêm mới, ${updatedCount} cập nhật`,
      messagePreview: `Đã xử lý ${results.length} bài viết từ Zalo OA Ban Điều Hành Khu Phố 3. Thêm mới: ${insertedCount}, Cập nhật: ${updatedCount}.`,
      status: "sent",
      actorName: caller.actorName,
    };
    await writePrivateSetting(supabaseUrl, serviceRoleKey, LOGS_KEY, [syncLog, ...existingLogs].slice(0, 250));

    return res.status(200).json({
      ok: true,
      syncedCount: insertedCount + updatedCount,
      insertedCount,
      updatedCount,
      results,
    });
  }

  // 9. Lấy Danh bạ Cán bộ & Trạng thái Liên kết Zalo OA (Quản lý Chi hội + User Profiles + 347 Followers)
  if (action === "get_cadre_zalo_directory") {
    const [assocRows, profRows, followers, cadreMappingData] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${supabaseUrl}/rest/v1/user_profiles?approval_status=eq.approved&select=id,full_name,email,phone,position`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }).then((r) => (r.ok ? r.json() : [])),
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<Record<string, CadreZaloMappingEntry>>(supabaseUrl, serviceRoleKey, CADRE_ZALO_MAPPING_KEY),
    ]);

    const followerList: ZaloFollowerRecord[] = Array.isArray(followers) ? followers : [];
    const cadreMapping: Record<string, CadreZaloMappingEntry> = cadreMappingData && typeof cadreMappingData === "object" ? cadreMappingData : {};

    const cadreMap = new Map<string, {
      cadreKey: string;
      fullName: string;
      role: string;
      phone: string;
      email: string;
      org: string;
      zaloUserId?: string;
      zaloDisplayName?: string;
      isLinked: boolean;
      linkedAt?: string;
      linkedBy?: string;
      suggestedFollowers: Array<{ zaloUserId: string; displayName: string }>;
    }>();

    const assocList: any[] = Array.isArray(assocRows?.[0]?.payload) ? assocRows[0].payload : [];
    for (const assoc of assocList) {
      if (!assoc || !Array.isArray(assoc.members)) continue;
      for (const m of assoc.members) {
        const nm = String(m?.fullName || m?.name || "").trim();
        const key = normalizeCadreKey(nm);
        if (!key || key.length < 4) continue;
        const prev = cadreMap.get(key);
        const rawMapped = cadreMapping[key] || CADRE_BUILTIN_ALIASES[key];
        const mapped: Partial<CadreZaloMappingEntry> | undefined = rawMapped
          ? {
              ...rawMapped,
              zaloDisplayName:
                (rawMapped as any).zaloDisplayName || (rawMapped as any).displayName || "",
            }
          : undefined;
        const linkedUid = mapped?.zaloUserId || m?.zaloUserId || prev?.zaloUserId;
        const linkedName =
          mapped?.zaloDisplayName ||
          (linkedUid === "2742691693568338378" ? "Sò" : m?.zaloDisplayName || prev?.zaloDisplayName);

        cadreMap.set(key, {
          cadreKey: key,
          fullName: nm,
          role: prev?.role || `${m?.role || "Cán bộ"} (${assoc.name || "KP3"})`,
          phone: String(m?.phone || prev?.phone || "").trim(),
          email: prev?.email || "",
          org: assoc.name || "Đoàn thể KP3",
          zaloUserId: linkedUid,
          zaloDisplayName: linkedName,
          isLinked: Boolean(linkedUid),
          linkedAt: mapped?.linkedAt,
          linkedBy: mapped?.linkedBy,
          suggestedFollowers: [],
        });
      }
    }

    for (const p of profRows || []) {
      const key = normalizeCadreKey(p.full_name);
      if (!key) continue;
      const prev = cadreMap.get(key);
      const rawMapped = cadreMapping[key] || CADRE_BUILTIN_ALIASES[key];
      const mapped: Partial<CadreZaloMappingEntry> | undefined = rawMapped
        ? {
            ...rawMapped,
            zaloDisplayName:
              (rawMapped as any).zaloDisplayName || (rawMapped as any).displayName || "",
          }
        : undefined;
      const linkedUid = mapped?.zaloUserId || prev?.zaloUserId;
      const linkedName =
        mapped?.zaloDisplayName ||
        (linkedUid === "2742691693568338378" ? "Sò" : prev?.zaloDisplayName);

      cadreMap.set(key, {
        cadreKey: key,
        fullName: prev?.fullName || p.full_name,
        role: prev?.role || p.position || "Cán bộ KP3",
        phone: String(p.phone || prev?.phone || "").trim(),
        email: String(p.email || prev?.email || "").trim(),
        org: prev?.org || "Tài khoản Cán bộ",
        zaloUserId: linkedUid,
        zaloDisplayName: linkedName,
        isLinked: Boolean(linkedUid),
        linkedAt: mapped?.linkedAt || prev?.linkedAt,
        linkedBy: mapped?.linkedBy || prev?.linkedBy,
        suggestedFollowers: [],
      });
    }

    // Gợi ý followers cho từng cán bộ chưa liên kết hoặc tìm kiếm
    for (const c of cadreMap.values()) {
      if (c.zaloUserId && !c.zaloDisplayName) {
        const f = followerList.find((fl) => fl.zaloUserId === c.zaloUserId);
        if (f) c.zaloDisplayName = f.displayName;
      }
      const parts = c.cadreKey.split(" ").filter(Boolean);
      const lastName = parts[parts.length - 1] || "";
      const firstName = parts[0] || "";

      c.suggestedFollowers = followerList
        .filter((f) => {
          const fn = normalizeCadreKey(f.displayName);
          return (
            fn === c.cadreKey ||
            (lastName.length >= 2 && fn.includes(lastName)) ||
            (firstName.length >= 2 && fn.includes(firstName))
          );
        })
        .slice(0, 5)
        .map((f) => ({ zaloUserId: f.zaloUserId, displayName: f.displayName || "" }));

      if (c.cadreKey === "pham ngoc ha" || c.phone.includes("0908579479")) {
        const so = followerList.find((f) => f.zaloUserId === "2742691693568338378");
        if (so) {
          c.suggestedFollowers = [
            { zaloUserId: so.zaloUserId, displayName: "Sò (0908579479)" },
            ...c.suggestedFollowers.filter((s) => s.zaloUserId !== so.zaloUserId),
          ];
        }
      }
    }

    const cadres = Array.from(cadreMap.values());
    const linkedCount = cadres.filter((c) => c.isLinked).length;

    return res.status(200).json({
      ok: true,
      cadres,
      followers: followerList,
      stats: {
        totalCadres: cadres.length,
        linkedCount,
        unlinkedCount: cadres.length - linkedCount,
        totalFollowers: followerList.length,
      },
    });
  }

  // 10. Liên kết Cán bộ với Tài khoản Zalo OA
  if (action === "link_cadre_zalo") {
    const rawKey = String(body.cadreKey || "").trim();
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const zaloUserId = String(body.zaloUserId || "").trim();
    const zaloDisplayName = String(body.zaloDisplayName || "").trim();
    const role = String(body.role || "").trim();
    const org = String(body.org || "").trim();

    const cadreKey = rawKey || normalizeCadreKey(fullName);
    if (!cadreKey || !zaloUserId) {
      return res.status(400).json({ ok: false, error: "Thiếu cadreKey hoặc zaloUserId để liên kết." });
    }

    const cadreMapping =
      (await readPrivateSetting<Record<string, CadreZaloMappingEntry>>(
        supabaseUrl,
        serviceRoleKey,
        CADRE_ZALO_MAPPING_KEY
      )) || {};

    const entry: CadreZaloMappingEntry = {
      cadreKey,
      fullName: fullName || cadreMapping[cadreKey]?.fullName || cadreKey,
      role: role || cadreMapping[cadreKey]?.role,
      phone: phone || cadreMapping[cadreKey]?.phone,
      org: org || cadreMapping[cadreKey]?.org,
      zaloUserId,
      zaloDisplayName: zaloDisplayName || `Zalo ID ${zaloUserId}`,
      linkedAt: new Date().toISOString(),
      linkedBy: caller.actorName,
    };

    cadreMapping[cadreKey] = entry;
    await writePrivateSetting(supabaseUrl, serviceRoleKey, CADRE_ZALO_MAPPING_KEY, cadreMapping);

    // Đồng thời đồng bộ vào associations_records nếu có
    try {
      const aRes = await fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      });
      const aData = aRes.ok ? await aRes.json() : [];
      const assocs: any[] = aData?.[0]?.payload || [];
      let updatedAssocs = false;

      for (const a of assocs) {
        for (const m of a.members || []) {
          const mKey = normalizeCadreKey(m.fullName || m.name);
          if (mKey === cadreKey) {
            m.zaloUserId = zaloUserId;
            m.zaloDisplayName = entry.zaloDisplayName;
            updatedAssocs = true;
          }
        }
      }

      if (updatedAssocs) {
        await fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations`, {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payload: assocs, updated_at: new Date().toISOString() }),
        });
      }
    } catch (err) {
      console.warn("Lỗi cập nhật associations khi liên kết:", err);
    }

    return res.status(200).json({ ok: true, linked: entry });
  }

  // 11. Hủy liên kết Zalo OA của Cán bộ
  if (action === "unlink_cadre_zalo") {
    const rawKey = String(body.cadreKey || "").trim();
    const fullName = String(body.fullName || "").trim();
    const cadreKey = rawKey || normalizeCadreKey(fullName);

    if (!cadreKey) {
      return res.status(400).json({ ok: false, error: "Thiếu cadreKey để hủy liên kết." });
    }

    const cadreMapping =
      (await readPrivateSetting<Record<string, CadreZaloMappingEntry>>(
        supabaseUrl,
        serviceRoleKey,
        CADRE_ZALO_MAPPING_KEY
      )) || {};

    delete cadreMapping[cadreKey];
    await writePrivateSetting(supabaseUrl, serviceRoleKey, CADRE_ZALO_MAPPING_KEY, cadreMapping);

    // Xóa trong associations_records nếu có
    try {
      const aRes = await fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      });
      const aData = aRes.ok ? await aRes.json() : [];
      const assocs: any[] = aData?.[0]?.payload || [];
      let updatedAssocs = false;

      for (const a of assocs) {
        for (const m of a.members || []) {
          const mKey = normalizeCadreKey(m.fullName || m.name);
          if (mKey === cadreKey) {
            delete m.zaloUserId;
            delete m.zaloDisplayName;
            updatedAssocs = true;
          }
        }
      }

      if (updatedAssocs) {
        await fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations`, {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payload: assocs, updated_at: new Date().toISOString() }),
        });
      }
    } catch (err) {
      console.warn("Lỗi cập nhật associations khi liên kết:", err);
    }

    return res.status(200).json({ ok: true, unlinkedKey: cadreKey });
  }

  // 12. Tự Động Quét & Khớp Nhanh Toàn Bộ Cán Bộ với 347 Followers Zalo OA
  if (action === "auto_match_all_cadres") {
    const [assocRows, profRows, followers, cadreMappingData] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json" },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${supabaseUrl}/rest/v1/user_profiles?approval_status=eq.approved&select=id,full_name,email,phone,position`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json" },
      }).then((r) => (r.ok ? r.json() : [])),
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<Record<string, CadreZaloMappingEntry>>(supabaseUrl, serviceRoleKey, CADRE_ZALO_MAPPING_KEY),
    ]);

    const followerList: ZaloFollowerRecord[] = Array.isArray(followers) ? followers : [];
    const cadreMapping: Record<string, CadreZaloMappingEntry> = cadreMappingData && typeof cadreMappingData === "object" ? { ...cadreMappingData } : {};

    const assocList: any[] = Array.isArray(assocRows?.[0]?.payload) ? assocRows[0].payload : [];
    let newlyLinkedCount = 0;
    const nowIso = new Date().toISOString();

    const allCadres: Array<{ key: string; fullName: string; phone: string; role: string; org: string }> = [];
    const seen = new Set<string>();

    for (const a of assocList) {
      for (const m of a.members || []) {
        const nm = String(m?.fullName || m?.name || "").trim();
        const k = normalizeCadreKey(nm);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        allCadres.push({
          key: k,
          fullName: nm,
          phone: String(m?.phone || "").trim(),
          role: String(m?.role || "Cán bộ").trim(),
          org: a.name || "Chi hội KP3",
        });
      }
    }

    for (const p of profRows || []) {
      const nm = String(p.full_name || "").trim();
      const k = normalizeCadreKey(nm);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      allCadres.push({
        key: k,
        fullName: nm,
        phone: String(p.phone || "").trim(),
        role: String(p.position || "Cán bộ KP3").trim(),
        org: "Tài khoản Cán bộ",
      });
    }

    for (const c of allCadres) {
      if (cadreMapping[c.key]?.zaloUserId) continue; // Đã liên kết rồi

      const matched = findMatchingZaloFollower(c.fullName, c.phone, followerList);
      if (matched && matched.zaloUserId) {
        cadreMapping[c.key] = {
          cadreKey: c.key,
          fullName: c.fullName,
          phone: c.phone || (c.key === "pham ngoc ha" ? "0908579479" : undefined),
          role: c.role,
          org: c.org,
          zaloUserId: matched.zaloUserId,
          zaloDisplayName: matched.displayName || `Zalo ID ${matched.zaloUserId}`,
          linkedAt: nowIso,
          linkedBy: `${caller.actorName} (Tự động quét khớp)`,
        };
        newlyLinkedCount++;
      }
    }

    if (newlyLinkedCount > 0) {
      await writePrivateSetting(supabaseUrl, serviceRoleKey, CADRE_ZALO_MAPPING_KEY, cadreMapping);

      // Đồng bộ lại vào associations_records
      try {
        let updatedAssocs = false;
        for (const a of assocList) {
          for (const m of a.members || []) {
            const mKey = normalizeCadreKey(m.fullName || m.name);
            if (cadreMapping[mKey]?.zaloUserId && !m.zaloUserId) {
              m.zaloUserId = cadreMapping[mKey].zaloUserId;
              m.zaloDisplayName = cadreMapping[mKey].zaloDisplayName;
              updatedAssocs = true;
            }
          }
        }
        if (updatedAssocs) {
          await fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations`, {
            method: "PATCH",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ payload: assocList, updated_at: nowIso }),
          });
        }
      } catch (err) {
        console.warn("Lỗi sync associations:", err);
      }
    }

    return res.status(200).json({
      ok: true,
      newlyLinkedCount,
      totalLinked: Object.keys(cadreMapping).length,
      cadreMapping,
    });
  }

  // 12. Gửi tin nhắn Zalo OA thử nghiệm tới Cán bộ
  if (action === "test_send_cadre_message") {
    const zaloUserId = String(body.zaloUserId || "").trim();
    const cadreName = String(body.cadreName || "Đồng chí").trim();
    const customMessage = String(body.message || "").trim();

    if (!zaloUserId) {
      return res.status(400).json({ ok: false, error: "Thiếu zaloUserId của người nhận." });
    }

    const activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );

    if (!activeToken) {
      return res.status(400).json({ ok: false, error: "Chưa có Access Token Zalo OA hợp lệ." });
    }

    const nowVn = new Date(Date.now() + 7 * 3600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const timeStr = `${pad(nowVn.getUTCHours())}:${pad(nowVn.getUTCMinutes())} ngày ${pad(nowVn.getUTCDate())}/${pad(nowVn.getUTCMonth() + 1)}/${nowVn.getUTCFullYear()}`;

    const textToSend =
      customMessage ||
      [
        `🔔 [KIỂM THỬ KẾT NỐI ZALO OA - KHU PHỐ 3 AN PHÚ]`,
        `Kính gửi đồng chí: ${cadreName}`,
        `Hệ thống Điều hành Đô thị Số Khu phố 3, Phường An Phú vừa xác lập thành công liên kết tài khoản Zalo của đồng chí với kênh Zalo Official Account chính thức của Ban Điều Hành Khu Phố 3.`,
        `• Thời điểm gửi: ${timeStr}`,
        `• Kênh gửi: Zalo OA Ban Điều Hành Khu Phố 3 (OA ID: ${savedCfg.oaId || "3124278810088361494"})`,
        `Từ nay, đồng chí sẽ tự động nhận được thông báo nhắc lịch họp, công tác trước 60 phút và các chỉ đạo khẩn của Chi bộ, Ban điều hành qua kênh này.`,
        `Trân trọng!`,
      ].join("\n");

    const sendRes = await sendZaloOaCsMessage(activeToken, zaloUserId, textToSend, {
      cfg: savedCfg,
      supabaseUrl,
      serviceRoleKey,
    });

    // Ghi log
    const existingLogs =
      (await readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY)) || [];
    const testLog: NotificationLogEntry = {
      id: `NTF-TEST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: "zalo_oa",
      notificationType: "cadre_meeting_reminder",
      recipientName: cadreName,
      recipientRole: "cadre",
      subject: `Kiểm thử liên kết Zalo OA: ${cadreName}`,
      messagePreview: textToSend.slice(0, 200),
      status: sendRes.ok ? "sent" : "failed",
      detail: sendRes.detail,
      actorName: caller.actorName,
    };
    await writePrivateSetting(supabaseUrl, serviceRoleKey, LOGS_KEY, [testLog, ...existingLogs].slice(0, 250));

    return res.status(200).json({
      ok: sendRes.ok,
      detail: sendRes.detail,
      zaloUserId,
      cadreName,
    });
  }

  // --- 13. NHẮC BÁO CÁO ĐỊNH KỲ QUA ZALO OA (1-CHẠM CHO 1 BÁO CÁO CỤ THỂ) ---
  if (action === "send_recurring_report_reminder") {
    const reminder = body.reminder || {};
    const remId = String(reminder.id || body.reminderId || "").trim();
    const title = String(reminder.title || "").trim();
    const recipientOrg = String(reminder.recipientOrg || "Cơ quan cấp trên").trim();
    const nextDueDate = String(reminder.nextDueDate || "").trim();
    const dueTime = String(reminder.frequencyDetail?.time || "16:30").trim();
    const responsibleName = String(reminder.responsiblePerson?.name || "").trim();
    const responsibleRole = String(reminder.responsiblePerson?.role || "").trim();
    const responsiblePhone = String(reminder.responsiblePerson?.phone || "").replace(/\D/g, "");
    const responsibleUnit = String(reminder.responsibleUnit || "Ban Điều hành KP3").trim();

    if (!title) {
      return res.status(400).json({ ok: false, error: "Thiếu tiêu đề báo cáo định kỳ cần nhắc." });
    }

    const [followersRaw, cadreMapRaw, existingLogsRaw] = await Promise.all([
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<Record<string, CadreZaloMappingEntry>>(
        supabaseUrl,
        serviceRoleKey,
        CADRE_ZALO_MAPPING_KEY
      ),
      readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
    ]);
    const followers = followersRaw || [];
    const cadreMap = cadreMapRaw || {};
    const existingLogs = existingLogsRaw || [];

    const nameKey = normalizeCadreKey(responsibleName);
    let matchedUid = cadreMap[nameKey]?.zaloUserId || "";
    let matchedDisplayName = cadreMap[nameKey]?.zaloDisplayName || "";

    if (!matchedUid && (nameKey === "pham ngoc ha" || responsiblePhone.includes("0908579479"))) {
      matchedUid = "2742691693568338378";
      matchedDisplayName = "Sò";
    }
    if (!matchedUid && followers.length > 0) {
      const fHit = followers.find((f) => {
        const fn = normalizeCadreKey(f.displayName);
        const fp = String(f.phone || "").replace(/\D/g, "");
        if (responsiblePhone && fp && fp === responsiblePhone) return true;
        if (nameKey && fn && (fn === nameKey || fn.includes(nameKey) || nameKey.includes(fn))) {
          return true;
        }
        return false;
      });
      if (fHit) {
        matchedUid = fHit.zaloUserId;
        matchedDisplayName = fHit.displayName;
      }
    }

    const dueFormatted = /^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)
      ? nextDueDate.split("-").reverse().join("/")
      : nextDueDate || "theo lịch";

    const textToSend = [
      `📋 [NHẮC NỘP BÁO CÁO ĐỊNH KỲ — KHU PHỐ 3 AN PHÚ]`,
      `Kính gửi đồng chí ${responsibleName || responsibleUnit}${responsibleRole ? ` (${responsibleRole})` : ""},`,
      `• Báo cáo: ${title}`,
      `• Cơ quan nhận: ${recipientOrg}`,
      `• Hạn nộp: ${dueTime} ngày ${dueFormatted}`,
      `Đề nghị đồng chí tổng hợp số liệu và nộp báo cáo đúng thời hạn quy định.`,
      `👉 Nộp & cập nhật tiến độ: https://bdhkp3.vercel.app/dashboard/tasks`,
    ].join("\n");

    const manualZaloUrl = responsiblePhone
      ? `https://zalo.me/${responsiblePhone}`
      : ZALO_OA_KP3_DEFAULTS.oaUrl;

    if (!matchedUid) {
      return res.status(200).json({
        ok: false,
        needsManualZalo: true,
        manualZaloUrl,
        messagePreview: textToSend,
        error: `Cán bộ "${responsibleName || responsibleUnit}" chưa khớp tài khoản Zalo OA. Vui lòng ghép Zalo OA tại Cấu hình hoặc gửi qua Zalo cá nhân.`,
      });
    }

    const activeToken = await refreshZaloAccessTokenIfNeeded(savedCfg, supabaseUrl, serviceRoleKey);
    if (!activeToken) {
      return res.status(400).json({
        ok: false,
        needsManualZalo: true,
        manualZaloUrl,
        messagePreview: textToSend,
        error: "Chưa có Access Token Zalo OA hợp lệ. Vui lòng kiểm tra cấu hình Zalo OA.",
      });
    }

    const sendRes = await sendZaloOaCsMessage(activeToken, matchedUid, textToSend, {
      cfg: savedCfg,
      supabaseUrl,
      serviceRoleKey,
    });

    const newLog: NotificationLogEntry = {
      id: `NTF-RPT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: sendRes.ok ? "zalo_oa" : "outbox_ready",
      notificationType: "recurring_report_reminder",
      recipientName: responsibleName || responsibleUnit,
      recipientRole: "cadre",
      recipientPhone: responsiblePhone || undefined,
      subject: `Nhắc báo cáo định kỳ (${dueFormatted} ${dueTime}): ${title}`,
      messagePreview: textToSend.slice(0, 260),
      status: sendRes.ok ? "sent" : "failed",
      detail: sendRes.detail,
      dedupeKey: remId ? `rpt_manual:${remId}:${nextDueDate}:${Date.now()}` : undefined,
      actorName: caller.actorName,
    };
    await writePrivateSetting(
      supabaseUrl,
      serviceRoleKey,
      LOGS_KEY,
      [newLog, ...existingLogs].slice(0, 250)
    );

    return res.status(200).json({
      ok: sendRes.ok,
      detail: sendRes.detail,
      zaloUserId: matchedUid,
      zaloDisplayName: matchedDisplayName,
      manualZaloUrl,
      messagePreview: textToSend,
    });
  }

  // --- 14. QUÉT & GỬI ĐỒNG LOẠT TẤT CẢ BÁO CÁO ĐỊNH KỲ ĐẾN HẠN / QUÁ HẠN QUA ZALO OA ---
  if (action === "scan_or_send_recurring_report_reminders") {
    const mode = String(body.mode || "send");
    const [remRes, followersRaw, cadreMapRaw, existingLogsRaw] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/recurring_reminders?select=id,title,payload`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      }).then((r) => (r.ok ? r.json() : [])),
      readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
      readPrivateSetting<Record<string, CadreZaloMappingEntry>>(
        supabaseUrl,
        serviceRoleKey,
        CADRE_ZALO_MAPPING_KEY
      ),
      readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
    ]);

    const followers = followersRaw || [];
    const cadreMap = cadreMapRaw || {};
    const existingLogs = existingLogsRaw || [];
    const vnNow = new Date(Date.now() + 7 * 3_600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayIso = `${vnNow.getUTCFullYear()}-${pad(vnNow.getUTCMonth() + 1)}-${pad(
      vnNow.getUTCDate()
    )}`;
    const todayMs = Date.parse(`${todayIso}T00:00:00+07:00`);

    const activeToken =
      mode === "send"
        ? await refreshZaloAccessTokenIfNeeded(savedCfg, supabaseUrl, serviceRoleKey)
        : null;

    let sentCount = 0;
    let skippedUnmatched = 0;
    const dueSummary: Array<{ id: string; title: string; person: string; due: string; status: string }> = [];
    const addedLogs: NotificationLogEntry[] = [];

    for (const row of Array.isArray(remRes) ? remRes : []) {
      const p = row?.payload || {};
      if (p.isActive === false) continue;
      const nextDue = String(p.nextDueDate || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) continue;
      const dueMs = Date.parse(`${nextDue}T00:00:00+07:00`);
      const diffDays = Math.round((dueMs - todayMs) / 86_400_000);
      if (diffDays > 2) continue; // Chỉ nhắc báo cáo quá hạn, hôm nay đến hạn, hoặc còn <= 2 ngày

      const personName = String(p.responsiblePerson?.name || p.responsibleUnit || "Cán bộ KP3").trim();
      const personPhone = String(p.responsiblePerson?.phone || "").replace(/\D/g, "");
      const nameKey = normalizeCadreKey(personName);
      let matchedUid = cadreMap[nameKey]?.zaloUserId || "";
      if (!matchedUid && (nameKey === "pham ngoc ha" || personPhone.includes("0908579479"))) {
        matchedUid = "2742691693568338378";
      }
      if (!matchedUid) {
        const hit = followers.find(
          (f) =>
            (personPhone && String(f.phone || "").replace(/\D/g, "") === personPhone) ||
            (nameKey && normalizeCadreKey(f.displayName) === nameKey)
        );
        if (hit) matchedUid = hit.zaloUserId;
      }

      const dueFormatted = nextDue.split("-").reverse().join("/");
      const dueTime = String(p.frequencyDetail?.time || "16:30");
      const urgencyLabel =
        diffDays < 0
          ? `⚠️ ĐÃ QUÁ HẠN ${Math.abs(diffDays)} NGÀY`
          : diffDays === 0
            ? "⏰ ĐẾN HẠN HÔM NAY"
            : `🔔 CÒN ${diffDays} NGÀY ĐẾN HẠN`;

      if (mode !== "send" || !activeToken) {
        dueSummary.push({
          id: row.id,
          title: p.title || row.title,
          person: personName,
          due: `${dueFormatted} ${dueTime}`,
          status: matchedUid ? "ready_zalo_oa" : "unmatched_oa",
        });
        continue;
      }

      if (!matchedUid) {
        skippedUnmatched++;
        dueSummary.push({
          id: row.id,
          title: p.title || row.title,
          person: personName,
          due: `${dueFormatted} ${dueTime}`,
          status: "unmatched_oa",
        });
        continue;
      }

      const msg = [
        `📋 [NHẮC BÁO CÁO ĐỊNH KỲ KP3 AN PHÚ — ${urgencyLabel}]`,
        `Kính gửi đồng chí ${personName},`,
        `• Báo cáo: ${p.title || row.title}`,
        `• Cơ quan nhận: ${p.recipientOrg || "Phường An Phú"}`,
        `• Hạn nộp: ${dueTime} ngày ${dueFormatted}`,
        `Đề nghị đồng chí sớm hoàn thành và cập nhật trạng thái nộp báo cáo trên hệ thống.`,
        `👉 https://bdhkp3.vercel.app/dashboard/tasks`,
      ].join("\n");

      const sendRes = await sendZaloOaCsMessage(activeToken, matchedUid, msg, {
        cfg: savedCfg,
        supabaseUrl,
        serviceRoleKey,
      });

      if (sendRes.ok) sentCount++;
      dueSummary.push({
        id: row.id,
        title: p.title || row.title,
        person: personName,
        due: `${dueFormatted} ${dueTime}`,
        status: sendRes.ok ? "sent" : "failed",
      });
      addedLogs.push({
        id: `NTF-RPT-BATCH-${Date.now()}-${row.id}`,
        timestamp: new Date().toISOString(),
        channel: sendRes.ok ? "zalo_oa" : "outbox_ready",
        notificationType: "recurring_report_reminder",
        recipientName: personName,
        recipientRole: "cadre",
        recipientPhone: personPhone || undefined,
        subject: `Nhắc báo cáo định kỳ (${dueFormatted}): ${p.title || row.title}`,
        messagePreview: msg.slice(0, 260),
        status: sendRes.ok ? "sent" : "failed",
        detail: sendRes.detail,
        dedupeKey: `rpt_batch:${row.id}:${todayIso}`,
        actorName: caller.actorName,
      });
    }

    if (addedLogs.length > 0) {
      await writePrivateSetting(
        supabaseUrl,
        serviceRoleKey,
        LOGS_KEY,
        [...addedLogs, ...existingLogs].slice(0, 250)
      );
    }

    return res.status(200).json({
      ok: true,
      sentCount,
      skippedUnmatched,
      totalDue: dueSummary.length,
      items: dueSummary,
    });
  }

  return res.status(400).json({ ok: false, error: `Hành động không hợp lệ: ${action}` });
  } catch (err: any) {
    console.error("Notifications handler caught error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Lỗi xử lý yêu cầu thông báo Zalo OA.",
    });
  }
}
