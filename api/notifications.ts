import { GoogleGenAI } from "@google/genai";

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
const ZALO_CHAT_INDEX_KEY = "zalo_oa_chat_inbox_index_v1";
const ZALO_CHAT_THREAD_PREFIX = "zalo_oa_chat_thread_";
const ZALO_CHAT_AI_SETTINGS_KEY = "zalo_oa_chat_ai_settings_v1";
const HOSTEL_CHECKINS_KEY = "kp3_hostel_qr_checkins_v1";

export interface ZaloChatAiSettings {
  aiAutoReplyEnabled: boolean;
  aiSuggestReplyEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_ZALO_CHAT_AI_SETTINGS: ZaloChatAiSettings = {
  aiAutoReplyEnabled: false,
  aiSuggestReplyEnabled: true,
};

export interface ZaloChatConversation {
  zaloUserId: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  cccd?: string;
  residentName?: string;
  residentAddress?: string;
  residentType?: string;
  lastMessage: string;
  lastMessageType: "text" | "image" | "location" | "file" | "sticker";
  lastDirection: "inbound" | "outbound";
  lastMessageAt: string;
  unreadCount: number;
  linkedReportId?: string;
  linkedReportTitle?: string;
  aiCategory?: string;
  aiPriority?: "Khẩn cấp" | "Cao" | "Bình thường";
  urgentAlertSentAt?: string;
  aiAutoReplySentAt?: string;
  status: "open" | "resolved";
}

export interface ZaloChatMessage {
  id: string;
  zaloUserId: string;
  direction: "inbound" | "outbound";
  msgType: "text" | "image" | "location" | "file" | "sticker";
  content: string;
  attachmentUrl?: string;
  lat?: number;
  lng?: number;
  senderName: string;
  reportId?: string;
  zaloMsgId?: string;
  createdAt: string;
}

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

async function sendZaloOaImageMessage(
  accessToken: string,
  zaloUserId: string,
  imageUrl: string,
  caption?: string,
  refreshCtx?: { cfg: ZaloOaSavedConfig; supabaseUrl: string; serviceRoleKey: string }
): Promise<{ ok: boolean; detail: string }> {
  if (!accessToken || !zaloUserId || !imageUrl) {
    return { ok: false, detail: "missing_params" };
  }
  const postImg = async (token: string) => {
    const r = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: token,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: {
          text: caption || "Hình ảnh từ Ban Điều hành Khu phố 3 Phường An Phú",
          attachment: {
            type: "template",
            payload: {
              template_type: "media",
              elements: [
                {
                  media_type: "image",
                  url: imageUrl,
                },
              ],
            },
          },
        },
      }),
    });
    return await r.json().catch(() => ({}));
  };
  try {
    let j = await postImg(accessToken);
    if (j?.error === -216 && refreshCtx) {
      const refreshed = await refreshZaloAccessTokenIfNeeded(
        refreshCtx.cfg,
        refreshCtx.supabaseUrl,
        refreshCtx.serviceRoleKey,
        true
      );
      if (refreshed && refreshed !== accessToken) {
        j = await postImg(refreshed);
      }
    }
    if (j?.error === 0) {
      return { ok: true, detail: `msg_id:${j?.data?.message_id || "ok"}` };
    }
    // Fallback: send text with image link if media template fails
    const fallbackText = caption ? `${caption}\n📷 Ảnh minh chứng: ${imageUrl}` : `📷 Ảnh minh chứng: ${imageUrl}`;
    const fb = await sendZaloOaCsMessage(accessToken, zaloUserId, fallbackText, refreshCtx);
    return fb;
  } catch (err: any) {
    return { ok: false, detail: err?.message || "network_error" };
  }
}

async function uploadRemoteImageToFieldReportsStorage(
  supabaseUrl: string,
  serviceRoleKey: string,
  remoteUrl: string,
  zaloUserId: string
): Promise<string> {
  if (!remoteUrl || !supabaseUrl || !serviceRoleKey) return remoteUrl;
  try {
    const imgRes = await fetch(remoteUrl);
    if (!imgRes.ok) return remoteUrl;
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return remoteUrl;
    const safeUid = zaloUserId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-16) || "user";
    const filePath = `zalo-chat/${safeUid}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/field-reports/${filePath}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buf,
    });
    if (!uploadRes.ok) return remoteUrl;
    return `${supabaseUrl}/storage/v1/object/public/field-reports/${filePath}`;
  } catch {
    return remoteUrl;
  }
}

function classifyZaloCitizenMessage(text: string): {
  category: string | null;
  priority: "Khẩn cấp" | "Cao" | "Bình thường";
} {
  const s = String(text || "").toLowerCase();
  let category: string | null = null;
  if (/ngập|cống|thoát nước|ứ đọng|triều cường/.test(s)) {
    category = "Ngập nước";
  } else if (/rác|vệ sinh|mùi hôi|ô nhiễm|xà bần/.test(s)) {
    category = "Rác thải";
  } else if (/lấn chiếm|vỉa hè|lòng đường|bán hàng rong|đậu xe/.test(s)) {
    category = "Lấn chiếm lòng đường";
  } else if (/ồn|karaoke|loa kẹo kéo|tiếng ồn|quá giờ/.test(s)) {
    category = "Tiếng ồn";
  } else if (/trộm|cướp|đánh nhau|an ninh|tụ tập|cờ bạc|ma túy|gây rối/.test(s)) {
    category = "An ninh trật tự";
  } else if (/đèn|điện|chập điện|đường|ổ gà|nắp cống|hạ tầng|chiếu sáng|cây đổ|cây ngã/.test(s)) {
    category = "Hạ tầng đô thị";
  } else if (/tạm trú|thường trú|cccd|giấy tờ|biểu mẫu|xác nhận|hộ khẩu|hỏi|thủ tục/.test(s)) {
    category = "Hỏi đáp hành chính";
  }

  let priority: "Khẩn cấp" | "Cao" | "Bình thường" = "Bình thường";
  if (
    /cháy|nổ|chập điện|đánh nhau|cướp|tai nạn|cấp cứu|nguy hiểm|khẩn cấp|ngập sâu|cây đổ|cây ngã|rò rỉ gas|điện giật/.test(
      s
    )
  ) {
    priority = "Khẩn cấp";
  } else if (
    /mất điện|hư đèn|ngập|cống nghẹt|rác tồn|karaoke|ồn quá|lấn chiếm|báo gấp|xử lý gấp/.test(s)
  ) {
    priority = "Cao";
  }

  return { category, priority };
}

async function pushUrgentZaloAlertToCadres(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  activeToken: string;
  savedCfg: ZaloOaSavedConfig;
  citizenName: string;
  citizenPhone?: string;
  category: string;
  messageSnippet: string;
}): Promise<number> {
  const {
    supabaseUrl,
    serviceRoleKey,
    activeToken,
    savedCfg,
    citizenName,
    citizenPhone,
    category,
    messageSnippet,
  } = params;
  if (!activeToken) return 0;

  const mappings =
    (await readPrivateSetting<CadreZaloMappingEntry[]>(
      supabaseUrl,
      serviceRoleKey,
      CADRE_ZALO_MAPPING_KEY
    )) || [];
  if (mappings.length === 0) return 0;

  // Ưu tiên Bí thư, Trưởng Khu phố, Công an khu vực (tối đa 3 cán bộ trực tiếp phụ trách)
  const prioritized = [...mappings]
    .filter((m) => m.zaloUserId)
    .sort((a, b) => {
      const score = (r?: string) => {
        const s = String(r || "").toLowerCase();
        if (s.includes("bí thư")) return 1;
        if (s.includes("trưởng khu phố") || s.includes("trưởng bđh")) return 2;
        if (s.includes("công an")) return 3;
        return 4;
      };
      return score(a.role) - score(b.role);
    })
    .slice(0, 3);

  const alertText = [
    `🚨 [CẢNH BÁO PHẢN ÁNH KHẨN CẤP — ZALO OA KP3 AN PHÚ]`,
    `• Người gửi: ${citizenName}${citizenPhone ? ` (${citizenPhone})` : ""}`,
    `• Phân loại AI: ${category} • Mức: KHẨN CẤP`,
    `• Nội dung: "${messageSnippet.slice(0, 220)}"`,
    `Đề nghị đồng chí kiểm tra và phản hồi ngay tại Hộp thư Zalo OA:`,
    `👉 https://bdhkp3.vercel.app/dashboard/reports`,
  ].join("\n");

  let sent = 0;
  for (const cadre of prioritized) {
    const res = await sendZaloOaCsMessage(activeToken, cadre.zaloUserId, alertText, {
      cfg: savedCfg,
      supabaseUrl,
      serviceRoleKey,
    });
    if (res.ok) sent++;
  }
  return sent;
}

async function appendZaloChatMessageToStore(
  supabaseUrl: string,
  serviceRoleKey: string,
  msg: ZaloChatMessage,
  profileMeta?: {
    displayName?: string;
    avatar?: string;
    phone?: string;
    cccd?: string;
    linkedReportId?: string;
    linkedReportTitle?: string;
    aiCategory?: string;
    aiPriority?: "Khẩn cấp" | "Cao" | "Bình thường";
    urgentAlertSentAt?: string;
    aiAutoReplySentAt?: string;
  }
): Promise<ZaloChatConversation> {
  const threadKey = `${ZALO_CHAT_THREAD_PREFIX}${msg.zaloUserId}`;
  const existingThread =
    (await readPrivateSetting<ZaloChatMessage[]>(supabaseUrl, serviceRoleKey, threadKey)) || [];

  const isDup = msg.zaloMsgId
    ? existingThread.some((m) => m.zaloMsgId && m.zaloMsgId === msg.zaloMsgId)
    : false;

  if (!isDup) {
    const nextThread = [...existingThread, msg]
      .sort((a, b) => Date.parse(a.createdAt || "0") - Date.parse(b.createdAt || "0"))
      .slice(-200);
    await writePrivateSetting(supabaseUrl, serviceRoleKey, threadKey, nextThread);
  }

  const indexList =
    (await readPrivateSetting<ZaloChatConversation[]>(
      supabaseUrl,
      serviceRoleKey,
      ZALO_CHAT_INDEX_KEY
    )) || [];

  const prev = indexList.find((c) => c.zaloUserId === msg.zaloUserId);
  const previewText =
    msg.content ||
    (msg.msgType === "image"
      ? "[Đã gửi hình ảnh hiện trường]"
      : msg.msgType === "location"
        ? "[Đã chia sẻ vị trí GPS]"
        : msg.msgType === "file"
          ? "[Đã gửi tệp đính kèm]"
          : "[Tin nhắn mới]");

  const classified =
    msg.direction === "inbound" && msg.content
      ? classifyZaloCitizenMessage(msg.content)
      : null;

  const nextPriority: "Khẩn cấp" | "Cao" | "Bình thường" =
    profileMeta?.aiPriority ||
    (classified?.priority === "Khẩn cấp"
      ? "Khẩn cấp"
      : prev?.aiPriority === "Khẩn cấp"
        ? "Khẩn cấp"
        : classified?.priority || prev?.aiPriority || "Bình thường");

  const updatedConv: ZaloChatConversation = {
    zaloUserId: msg.zaloUserId,
    displayName:
      profileMeta?.displayName ||
      prev?.displayName ||
      `Cư dân Zalo #${msg.zaloUserId.slice(-5)}`,
    avatar: profileMeta?.avatar || prev?.avatar,
    phone: profileMeta?.phone || prev?.phone,
    cccd: profileMeta?.cccd || prev?.cccd,
    residentName: prev?.residentName,
    residentAddress: prev?.residentAddress,
    residentType: prev?.residentType,
    lastMessage: previewText.slice(0, 180),
    lastMessageType: msg.msgType,
    lastDirection: msg.direction,
    lastMessageAt:
      prev?.lastMessageAt && Date.parse(prev.lastMessageAt) > Date.parse(msg.createdAt)
        ? prev.lastMessageAt
        : msg.createdAt,
    unreadCount:
      msg.direction === "inbound" && !isDup
        ? (prev?.unreadCount || 0) + 1
        : msg.direction === "outbound"
          ? 0
          : prev?.unreadCount || 0,
    linkedReportId: profileMeta?.linkedReportId || msg.reportId || prev?.linkedReportId,
    linkedReportTitle: profileMeta?.linkedReportTitle || prev?.linkedReportTitle,
    aiCategory: profileMeta?.aiCategory || classified?.category || prev?.aiCategory,
    aiPriority: nextPriority,
    urgentAlertSentAt: profileMeta?.urgentAlertSentAt || prev?.urgentAlertSentAt,
    aiAutoReplySentAt: profileMeta?.aiAutoReplySentAt || prev?.aiAutoReplySentAt,
    status: prev?.status || "open",
  };

  const mergedIndex = [
    updatedConv,
    ...indexList.filter((c) => c.zaloUserId !== msg.zaloUserId),
  ]
    .sort((a, b) => Date.parse(b.lastMessageAt || "0") - Date.parse(a.lastMessageAt || "0"))
    .slice(0, 400);

  await writePrivateSetting(supabaseUrl, serviceRoleKey, ZALO_CHAT_INDEX_KEY, mergedIndex);
  return updatedConv;
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
  res.setHeader?.("Access-Control-Allow-Origin", origin || "*");
  res.setHeader?.("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader?.("Access-Control-Allow-Headers", "Content-Type, Authorization, x-kp3-cron-secret");
  res.setHeader?.("Vary", "Origin");

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
          const isOutboundEvent = eventName.startsWith("oa_send_");
          const targetUid = isOutboundEvent
            ? String(body.recipient?.id || zaloUid).trim()
            : zaloUid;

          // Lấy tên hiển thị & avatar thực tế từ Zalo OA Profile nếu chưa có
          let resolvedDisplayName = prev?.displayName || "";
          let resolvedAvatar = "";
          const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
            supabaseUrl,
            serviceRoleKey,
            CONFIG_KEY
          );
          let activeToken = "";
          if (savedCfg) {
            activeToken = await refreshZaloAccessTokenIfNeeded(
              savedCfg,
              supabaseUrl,
              serviceRoleKey
            );
          }

          if (
            activeToken &&
            (!resolvedDisplayName || resolvedDisplayName.startsWith("Cư dân Zalo #"))
          ) {
            try {
              const pRes = await fetch(
                `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(
                  JSON.stringify({ user_id: targetUid })
                )}`,
                { headers: { access_token: activeToken } }
              );
              const pJson = await pRes.json().catch(() => ({}));
              if (pJson?.error === 0 && pJson?.data) {
                resolvedDisplayName = String(pJson.data.display_name || resolvedDisplayName).trim();
                resolvedAvatar = String(pJson.data.avatar || "").trim();
              }
            } catch {
              // fallback to placeholder
            }
          }

          const finalDisplayName =
            resolvedDisplayName || `Cư dân Zalo #${targetUid.slice(-5)}`;

          const updatedItem: ZaloFollowerRecord = {
            zaloUserId: targetUid,
            displayName: finalDisplayName,
            phone: phoneHit ? phoneHit[1] : prev?.phone,
            cccd: cccdHit ? cccdHit[1] : prev?.cccd,
            followedAt: prev?.followedAt || new Date().toISOString(),
            lastMessage: msgText || prev?.lastMessage,
          };
          const merged = [
            updatedItem,
            ...existing.filter((f) => f.zaloUserId !== targetUid),
          ].slice(0, 2000);
          await writePrivateSetting(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY, merged);

          // Lưu hội thoại 2 chiều vào Hộp thư Zalo OA (Phản ánh hiện trường)
          const isMessageEvent =
            eventName.startsWith("user_send_") || eventName.startsWith("oa_send_");
          if (isMessageEvent && targetUid) {
            const attachments = Array.isArray(body.message?.attachments)
              ? body.message.attachments
              : [];
            const firstAtt = attachments[0] || null;
            let msgType: ZaloChatMessage["msgType"] = "text";
            let attachmentUrl = "";
            let lat: number | undefined;
            let lng: number | undefined;
            let contentText = msgText;

            if (eventName.includes("image") || firstAtt?.type === "image") {
              msgType = "image";
              const rawImgUrl = String(firstAtt?.payload?.url || "").trim();
              attachmentUrl = rawImgUrl
                ? await uploadRemoteImageToFieldReportsStorage(
                    supabaseUrl,
                    serviceRoleKey,
                    rawImgUrl,
                    targetUid
                  )
                : "";
              if (!contentText) contentText = "Đã gửi hình ảnh hiện trường";
            } else if (eventName.includes("location") || firstAtt?.type === "location") {
              msgType = "location";
              const coords = firstAtt?.payload?.coordinates || {};
              lat = Number(coords.latitude) || undefined;
              lng = Number(coords.longitude) || undefined;
              if (!contentText) {
                contentText =
                  lat && lng
                    ? `Đã chia sẻ vị trí hiện trường (${lat.toFixed(5)}, ${lng.toFixed(5)})`
                    : "Đã chia sẻ vị trí GPS";
              }
            } else if (eventName.includes("file") || firstAtt?.type === "file") {
              msgType = "file";
              attachmentUrl = String(firstAtt?.payload?.url || "").trim();
              if (!contentText) {
                contentText = String(firstAtt?.payload?.name || "Đã gửi tệp đính kèm");
              }
            } else if (eventName.includes("sticker") || firstAtt?.type === "sticker") {
              msgType = "sticker";
              attachmentUrl = String(firstAtt?.payload?.url || "").trim();
              if (!contentText) contentText = "[Biểu cảm Zalo]";
            }

            const tsNum = Number(body.timestamp);
            const createdAtIso =
              Number.isFinite(tsNum) && tsNum > 1_000_000_000_000
                ? new Date(tsNum).toISOString()
                : new Date().toISOString();

            const chatMsg: ZaloChatMessage = {
              id: `ZM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              zaloUserId: targetUid,
              direction: isOutboundEvent ? "outbound" : "inbound",
              msgType,
              content: contentText,
              attachmentUrl: attachmentUrl || undefined,
              lat,
              lng,
              senderName: isOutboundEvent ? "Zalo OA Khu phố 3" : finalDisplayName,
              zaloMsgId: String(body.message?.msg_id || "").trim() || undefined,
              createdAt: createdAtIso,
            };

            const savedConv = await appendZaloChatMessageToStore(supabaseUrl, serviceRoleKey, chatMsg, {
              displayName: finalDisplayName,
              avatar: resolvedAvatar || undefined,
              phone: phoneHit ? phoneHit[1] : prev?.phone,
              cccd: cccdHit ? cccdHit[1] : prev?.cccd,
            });

            // Cảnh báo đẩy tự động qua Zalo OA cho Cán bộ phụ trách nếu AI phân loại là KHẨN CẤP (chống spam 30 phút)
            if (!isOutboundEvent && savedConv.aiPriority === "Khẩn cấp" && activeToken && savedCfg) {
              const lastAlertMs = savedConv.urgentAlertSentAt
                ? Date.parse(savedConv.urgentAlertSentAt)
                : 0;
              const elapsedMin = (Date.now() - lastAlertMs) / 60_000;
              if (!lastAlertMs || elapsedMin >= 30) {
                const alertCount = await pushUrgentZaloAlertToCadres({
                  supabaseUrl,
                  serviceRoleKey,
                  activeToken,
                  savedCfg,
                  citizenName: finalDisplayName,
                  citizenPhone: savedConv.phone,
                  category: savedConv.aiCategory || "Khẩn cấp",
                  messageSnippet: contentText,
                });
                if (alertCount > 0) {
                  await appendZaloChatMessageToStore(supabaseUrl, serviceRoleKey, chatMsg, {
                    urgentAlertSentAt: new Date().toISOString(),
                  });
                }
              }
            }

            // AI Tự động trả lời 24/7 nếu cán bộ đang BẬT chế độ aiAutoReplyEnabled (chống lặp 45 giây/cư dân)
            if (
              !isOutboundEvent &&
              !(phoneHit || cccdHit) &&
              activeToken &&
              savedCfg &&
              (eventName === "user_send_text" ||
                eventName === "user_send_image" ||
                eventName === "user_send_location")
            ) {
              const aiSettings =
                (await readPrivateSetting<ZaloChatAiSettings>(
                  supabaseUrl,
                  serviceRoleKey,
                  ZALO_CHAT_AI_SETTINGS_KEY
                )) || DEFAULT_ZALO_CHAT_AI_SETTINGS;

              if (aiSettings.aiAutoReplyEnabled) {
                const lastAutoMs = savedConv.aiAutoReplySentAt
                  ? Date.parse(savedConv.aiAutoReplySentAt)
                  : 0;
                const elapsedSec = (Date.now() - lastAutoMs) / 1000;
                if (!lastAutoMs || elapsedSec >= 45) {
                  const fallbackAutoText = `Kính chào ${finalDisplayName}, Ban Điều hành Khu phố 3, Phường An Phú đã tiếp nhận thông tin của ông/bà${
                    savedConv.aiCategory ? ` (${savedConv.aiCategory})` : ""
                  }. Cán bộ phụ trách sẽ nhanh chóng kiểm tra hiện trường và phản hồi cụ thể đến ông/bà trong thời gian sớm nhất. Trân trọng!\n(Phản hồi tự động từ Trợ lý AI Khu phố 3)`;

                  let replyBody = fallbackAutoText;
                  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
                  if (geminiKey) {
                    try {
                      const threadMsgs = (
                        (await readPrivateSetting<ZaloChatMessage[]>(
                          supabaseUrl,
                          serviceRoleKey,
                          `${ZALO_CHAT_THREAD_PREFIX}${targetUid}`
                        )) || []
                      ).slice(-6);
                      const transcript = threadMsgs
                        .map((m) => `${m.direction === "inbound" ? "Cư dân" : "Cán bộ KP3"}: ${m.content}`)
                        .join("\n");
                      const ai = new GoogleGenAI({ apiKey: geminiKey });
                      const aiRes = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: `Bạn là Trợ lý AI của Ban Điều hành Khu phố 3, Phường An Phú, TP. Hồ Chí Minh (tuyệt đối KHÔNG nhắc TP. Thủ Đức).
Hãy soạn 01 tin nhắn tự động trả lời ngắn gọn (2-3 câu), lịch sự, chân thành gửi tới cư dân "${finalDisplayName}" trên Zalo OA xác nhận đã tiếp nhận thông tin và cán bộ sẽ kiểm tra xử lý.
Lịch sử tin nhắn gần nhất:
${transcript}

Chỉ trả về đúng nội dung tin nhắn thuần văn bản (không markdown).`,
                      });
                      const generated = String(aiRes.text || "").trim();
                      if (generated) {
                        replyBody = `${generated}\n(Phản hồi tự động từ Trợ lý AI Khu phố 3)`;
                      }
                    } catch {
                      // fallback cleanly
                    }
                  }

                  const sendAutoRes = await sendZaloOaCsMessage(
                    activeToken,
                    targetUid,
                    replyBody,
                    { cfg: savedCfg, supabaseUrl, serviceRoleKey }
                  );
                  if (sendAutoRes.ok) {
                    const outAutoMsg: ZaloChatMessage = {
                      id: `ZM-AI-AUTO-${Date.now()}`,
                      zaloUserId: targetUid,
                      direction: "outbound",
                      msgType: "text",
                      content: replyBody,
                      senderName: "Trợ lý AI Zalo OA KP3",
                      createdAt: new Date().toISOString(),
                    };
                    await appendZaloChatMessageToStore(supabaseUrl, serviceRoleKey, outAutoMsg, {
                      aiAutoReplySentAt: new Date().toISOString(),
                    });
                  }
                }
              }
            }
          }

          // Phản hồi tự động qua Zalo OA CS nếu cư dân nhắn SĐT/CCCD đăng ký nhận nhắc hạn tạm trú
          if ((phoneHit || cccdHit) && eventName === "user_send_text" && activeToken) {
            const autoReplyText = `Ban Điều hành Khu phố 3 Phường An Phú đã ghi nhận liên kết thông báo tự động cho ${
              phoneHit ? `SĐT ${phoneHit[1]}` : ""
            }${cccdHit ? ` (CCCD ***${cccdHit[1].slice(-4)})` : ""}. Hệ thống sẽ tự động nhắc gia hạn tạm trú trước 15 ngày và gửi thông báo khu phố kịp thời. Cổng cư dân: https://bdhkp3.vercel.app`;
            await sendZaloOaCsMessage(
              activeToken,
              targetUid,
              autoReplyText,
              savedCfg ? { cfg: savedCfg, supabaseUrl, serviceRoleKey } : undefined
            );
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
    if (action === "public_submit_hostel_checkin") {
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ ok: false, error: "Chưa cấu hình máy chủ dữ liệu." });
      }
      const fullName = String(body.fullName || "").trim();
      const cccd = String(body.cccd || "").replace(/\D/g, "").trim();
      const phone = String(body.phone || "").trim();
      const hostelName = String(body.hostelName || "").trim();
      if (!fullName || cccd.length < 9 || !hostelName) {
        return res.status(400).json({
          ok: false,
          error: "Vui lòng điền đầy đủ Họ tên, Số CCCD hợp lệ và Tên nhà trọ.",
        });
      }
      const existing =
        (await readPrivateSetting<any[]>(supabaseUrl, serviceRoleKey, HOSTEL_CHECKINS_KEY)) || [];
      const newEntry = {
        id: `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        hostelId: String(body.hostelId || "").trim(),
        hostelName,
        hostelAddress: String(body.hostelAddress || "").trim(),
        roomNumber: String(body.roomNumber || "").trim(),
        fullName,
        gender: body.gender === "Nữ" ? "Nữ" : "Nam",
        birthDate: String(body.birthDate || "").trim(),
        cccd,
        phone,
        permanentAddress: String(body.permanentAddress || "").trim(),
        moveInDate: String(body.moveInDate || new Date().toLocaleDateString("vi-VN")).trim(),
        status: "pending",
        submittedAt: new Date().toISOString(),
      };
      await writePrivateSetting(
        supabaseUrl,
        serviceRoleKey,
        HOSTEL_CHECKINS_KEY,
        [newEntry, ...existing].slice(0, 300)
      );
      return res.status(200).json({ ok: true, id: newEntry.id });
    }
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

  // 5. Danh bạ Đối tượng nhận tin, AI Soạn thảo & Phát Thông báo từ Khu phố 3 (Zalo OA + Email + Cổng Cư dân)
  if (
    action === "preview_broadcast_audience" ||
    action === "ai_draft_broadcast" ||
    action === "send_broadcast"
  ) {
    type NewsCategoryLabel =
      | "Thông báo khẩn"
      | "Hành chính"
      | "Y tế & Đời sống"
      | "Phong trào"
      | "An sinh xã hội";

    const VALID_NEWS_CATEGORIES = new Set<NewsCategoryLabel>([
      "Thông báo khẩn",
      "Hành chính",
      "Y tế & Đời sống",
      "Phong trào",
      "An sinh xã hội",
    ]);

    const sanitizeAdminGeography = (raw: string): string => {
      const legacyDistrictPattern = new RegExp(
        ",\\s*(?:TP\\.?\\s*|Th\\u00e0nh ph\\u1ed1\\s*)Th\\u1ee7\\s*\\u0110\\u1ee9c\\s*,\\s*(?:TP\\.?\\s*|Th\\u00e0nh ph\\u1ed1\\s*)H\\u1ed3 Ch\\u00ed Minh",
        "gi"
      );
      const legacyShortPattern = new RegExp(
        "(?:TP\\.?\\s*|Th\\u00e0nh ph\\u1ed1\\s*)Th\\u1ee7\\s*\\u0110\\u1ee9c",
        "gi"
      );
      return String(raw || "")
        .replace(legacyDistrictPattern, ", TP. Hồ Chí Minh")
        .replace(legacyShortPattern, "TP. Hồ Chí Minh")
        .trim();
    };

    const buildRoundedSummary = (rawSummary: string, fallbackContent: string, maxLen = 175): string => {
      const candidate = sanitizeAdminGeography(rawSummary || "")
        .replace(/\s+/g, " ")
        .trim();
      if (candidate.length >= 20 && candidate.length <= maxLen) return candidate;
      const base = (candidate || sanitizeAdminGeography(fallbackContent).replace(/\s+/g, " ").trim());
      if (base.length <= maxLen) return base;
      const sliced = base.slice(0, maxLen);
      const lastSpace = sliced.lastIndexOf(" ");
      return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,;:\-–]+$/, "")}...`;
    };

    const WELFARE_ASSOC_KEYWORDS: Record<string, string[]> = {
      ASC_CS_NGHEO: ["hộ nghèo", "ngheo"],
      ASC_CS_CANNGHEO: ["hộ cận nghèo", "can ngheo"],
      ASC_CS_NCC: ["người có công", "nguoi co cong", "thương binh", "liệt sĩ"],
      ASC_CS_GDCS: ["gia đình chính sách", "chinh sach"],
      ASC_CS_MVNAH: ["mẹ việt nam anh hùng", "me viet nam anh hung"],
      ASC_CS_NKT: ["khuyết tật", "khuyet tat", "bảo trợ"],
      ASC_CS_TE: ["trẻ em", "tre em", "mồ côi", "khuyến học"],
    };

    interface AudienceRecipientPerson {
      key: string;
      fullName: string;
      roleOrCategory: string;
      groupId: string;
      groupName: string;
      phone?: string;
      email?: string;
      cccd?: string;
      zaloUserId?: string;
      zaloDisplayName?: string;
    }

    interface AudienceGroupSummary {
      id: string;
      name: string;
      groupType: "all_citizens" | "party_gov" | "mass_org" | "welfare" | "hostel_owners";
      categoryLabel: string;
      leaderName?: string;
      leaderPhone?: string;
      totalMembers: number;
      zaloLinkedCount: number;
      defaultPublishPortal: boolean;
      recipients: AudienceRecipientPerson[];
    }

    const loadBroadcastDirectory = async () => {
      const [
        followersRaw,
        cadreMapRaw,
        prevLogsRaw,
        assocRes,
        welfareRes,
        hostelsRes,
      ] = await Promise.all([
        readPrivateSetting<ZaloFollowerRecord[]>(supabaseUrl, serviceRoleKey, FOLLOWERS_KEY),
        readPrivateSetting<Record<string, CadreZaloMappingEntry>>(
          supabaseUrl,
          serviceRoleKey,
          CADRE_ZALO_MAPPING_KEY
        ),
        readPrivateSetting<NotificationLogEntry[]>(supabaseUrl, serviceRoleKey, LOGS_KEY),
        fetch(`${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
        }).catch(() => null),
        fetch(`${supabaseUrl}/rest/v1/welfare_records?key=eq.recipients&select=payload`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: "application/json",
          },
        }).catch(() => null),
        fetch(
          `${supabaseUrl}/rest/v1/businesses?is_accommodation=eq.true&select=id,name,owner_name,phone,address&limit=500`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              Accept: "application/json",
            },
          }
        ).catch(() => null),
      ]);

      const followerList: ZaloFollowerRecord[] = Array.isArray(followersRaw) ? followersRaw : [];
      const cadreMap: Record<string, CadreZaloMappingEntry> =
        cadreMapRaw && typeof cadreMapRaw === "object" ? cadreMapRaw : {};
      const existingLogs: NotificationLogEntry[] = Array.isArray(prevLogsRaw) ? prevLogsRaw : [];

      let assocList: any[] = [];
      if (assocRes && assocRes.ok) {
        const rows = await assocRes.json().catch(() => []);
        if (Array.isArray(rows?.[0]?.payload)) assocList = rows[0].payload;
      }

      let welfareRecipients: any[] = [];
      if (welfareRes && welfareRes.ok) {
        const rows = await welfareRes.json().catch(() => []);
        if (Array.isArray(rows?.[0]?.payload)) welfareRecipients = rows[0].payload;
      }

      let hostelRows: any[] = [];
      if (hostelsRes && hostelsRes.ok) {
        const rows = await hostelsRes.json().catch(() => []);
        if (Array.isArray(rows)) hostelRows = rows;
      }

      const resolvePersonZalo = (
        fullName: string,
        phone?: string,
        cccd?: string,
        directZaloId?: string,
        directZaloName?: string
      ): { zaloUserId?: string; zaloDisplayName?: string } => {
        if (directZaloId && String(directZaloId).trim()) {
          return {
            zaloUserId: String(directZaloId).trim(),
            zaloDisplayName: directZaloName || fullName,
          };
        }
        const normKey = normalizeCadreKey(fullName);
        const normPhone = phone ? normalizeVnPhoneTo84(phone) : "";
        const cleanCccd = String(cccd || "").replace(/\D/g, "");

        for (const entry of Object.values(cadreMap)) {
          if (!entry?.zaloUserId) continue;
          if (normKey && entry.cadreKey === normKey) {
            return { zaloUserId: entry.zaloUserId, zaloDisplayName: entry.zaloDisplayName };
          }
          if (normKey && normalizeCadreKey(entry.fullName) === normKey) {
            return { zaloUserId: entry.zaloUserId, zaloDisplayName: entry.zaloDisplayName };
          }
          if (normPhone && entry.phone && normalizeVnPhoneTo84(entry.phone) === normPhone) {
            return { zaloUserId: entry.zaloUserId, zaloDisplayName: entry.zaloDisplayName };
          }
        }

        if (cleanCccd.length === 12) {
          const byCccd = followerList.find(
            (f) => String(f.cccd || "").replace(/\D/g, "") === cleanCccd
          );
          if (byCccd?.zaloUserId) {
            return { zaloUserId: byCccd.zaloUserId, zaloDisplayName: byCccd.displayName };
          }
        }

        const matchedFollower = findMatchingZaloFollower(fullName, phone, followerList);
        if (matchedFollower?.zaloUserId) {
          return {
            zaloUserId: matchedFollower.zaloUserId,
            zaloDisplayName: matchedFollower.displayName,
          };
        }
        return {};
      };

      // Tóm tắt lãnh đạo chủ chốt KP3 (Bí thư Chi bộ luôn số 1)
      let partySecName = "Nghiêm Xuân Quỳnh";
      let partySecPhone = "0825681868";
      let partyDepName = "Phạm Ngọc Hà";
      let partyDepPhone = "0908579479";
      let headKpName = "Nguyễn Trung Huy";
      let headKpPhone = "0962037937";
      let frontHeadName = "Trần Thị Mỹ Dung";
      let frontHeadPhone = "";
      let policeName = "Đại úy Trần Quốc Hải";
      let policePhone = "";

      for (const a of assocList) {
        const aid = String(a?.id || "");
        const members = Array.isArray(a?.members) ? a.members : [];
        if (aid === "ASC_DANG" || aid === "ASC_CHIBO") {
          const sec = members.find(
            (m: any) =>
              String(m?.role || "").toLowerCase().includes("bí thư") &&
              !String(m?.role || "").toLowerCase().includes("phó")
          );
          const dep = members.find((m: any) =>
            String(m?.role || "").toLowerCase().includes("phó bí thư")
          );
          if (sec?.fullName) {
            partySecName = sec.fullName;
            if (sec.phone) partySecPhone = sec.phone;
          }
          if (dep?.fullName) {
            partyDepName = dep.fullName;
            if (dep.phone) partyDepPhone = dep.phone;
          }
        } else if (aid === "ASC_BDH") {
          const head = members.find(
            (m: any) =>
              String(m?.role || "").toLowerCase().includes("trưởng") &&
              !String(m?.role || "").toLowerCase().includes("phó")
          );
          if (head?.fullName) {
            headKpName = head.fullName;
            if (head.phone) headKpPhone = head.phone;
          }
        } else if (aid === "ASC_MT" || aid === "ASC_MATTRAN") {
          const fh = members.find(
            (m: any) =>
              String(m?.role || "").toLowerCase().includes("trưởng") &&
              !String(m?.role || "").toLowerCase().includes("phó")
          );
          if (fh?.fullName) {
            frontHeadName = fh.fullName;
            if (fh.phone) frontHeadPhone = fh.phone;
          }
        } else if (aid === "ASC_ANTT") {
          const pol = members.find((m: any) =>
            String(m?.role || "").toLowerCase().includes("công an")
          );
          if (pol?.fullName) {
            policeName = pol.fullName;
            if (pol.phone) policePhone = pol.phone;
          }
        }
      }

      const groups: AudienceGroupSummary[] = [];

      // 1. Nhóm mặc định: Toàn thể Người dân Khu phố 3
      groups.push({
        id: "ALL_CITIZENS",
        name: "Toàn thể Người dân Khu phố 3",
        groupType: "all_citizens",
        categoryLabel: "Cộng đồng dân cư",
        leaderName: `${partySecName} (Bí thư Chi bộ) • ${headKpName} (Trưởng BĐH KP3)`,
        leaderPhone: headKpPhone || partySecPhone,
        totalMembers: Math.max(ZALO_OA_KP3_DEFAULTS.verifiedFollowersBaseline, followerList.length),
        zaloLinkedCount: followerList.length,
        defaultPublishPortal: true,
        recipients: followerList.map((f) => ({
          key: `oa:${f.zaloUserId}`,
          fullName: f.displayName || `Cư dân Zalo #${String(f.zaloUserId).slice(-5)}`,
          roleOrCategory: "Người dân quan tâm Zalo OA",
          groupId: "ALL_CITIZENS",
          groupName: "Toàn thể Người dân Khu phố 3",
          phone: f.phone,
          cccd: f.cccd,
          zaloUserId: f.zaloUserId,
          zaloDisplayName: f.displayName,
        })),
      });

      // 2. Các tổ chức Đảng, Chính quyền, Đoàn thể & Nhóm Chính sách trong associations_records + welfare_records
      for (const assoc of assocList) {
        const aid = String(assoc?.id || "").trim();
        const aname = String(assoc?.name || "").trim();
        if (!aid || !aname) continue;

        const isPartyGov =
          aid === "ASC_DANG" ||
          aid === "ASC_CHIBO" ||
          aid === "ASC_DANG213" ||
          aid === "ASC_CTDANG" ||
          aid === "ASC_BDH" ||
          aid === "ASC_MT" ||
          aid === "ASC_MATTRAN" ||
          aid === "ASC_TOTRUONG";
        const isWelfare =
          aid.startsWith("ASC_CS_") ||
          String(assoc?.category || "").toLowerCase().includes("chính sách");

        const personMap = new Map<string, AudienceRecipientPerson>();
        const members = Array.isArray(assoc?.members) ? assoc.members : [];
        let leaderPhone = "";

        for (const m of members) {
          const fullName = String(m?.fullName || m?.name || "").trim();
          if (!fullName) continue;
          const cccd = String(m?.cccd || "").replace(/\D/g, "");
          const phone = String(m?.phone || "").trim();
          if (
            !leaderPhone &&
            phone &&
            (fullName === assoc?.leaderName ||
              /bí thư|trưởng|chi hội trưởng|tổ trưởng|chỉ huy/i.test(String(m?.role || "")))
          ) {
            leaderPhone = phone;
          }
          const dedupeKey =
            cccd.length === 12
              ? `cccd:${cccd}`
              : `np:${normalizeCadreKey(fullName)}|${normalizeVnPhoneTo84(phone)}`;
          const zMatch = resolvePersonZalo(
            fullName,
            phone,
            cccd,
            m?.zaloUserId,
            m?.zaloDisplayName
          );
          personMap.set(dedupeKey, {
            key: dedupeKey,
            fullName,
            roleOrCategory: String(m?.role || aname).trim(),
            groupId: aid,
            groupName: aname,
            phone: phone || undefined,
            email: m?.email ? String(m.email).trim() : undefined,
            cccd: cccd || undefined,
            zaloUserId: zMatch.zaloUserId,
            zaloDisplayName: zMatch.zaloDisplayName,
          });
        }

        // Gộp thêm danh sách đối tượng an sinh thực tế từ bảng welfare_records cho các nhóm ASC_CS_*
        if (isWelfare && welfareRecipients.length > 0) {
          const kwList = WELFARE_ASSOC_KEYWORDS[aid] || [normalizeCadreKey(aname)];
          for (const wr of welfareRecipients) {
            if (wr?.status === "Đã tạm ngưng") continue;
            const catRaw = `${wr?.category || ""} ${wr?.subCategoryId || ""} ${wr?.supportLevel || ""}`;
            const catNorm = catRaw.toLowerCase();
            const catAscii = normalizeCadreKey(catRaw);
            const matchedKw = kwList.some(
              (kw) => catNorm.includes(kw.toLowerCase()) || catAscii.includes(normalizeCadreKey(kw))
            );
            if (!matchedKw) continue;
            const fullName = String(wr?.fullName || "").trim();
            if (!fullName) continue;
            const cccd = String(wr?.cccd || "").replace(/\D/g, "");
            const phone = String(wr?.phone || "").trim();
            const dedupeKey =
              cccd.length === 12
                ? `cccd:${cccd}`
                : `np:${normalizeCadreKey(fullName)}|${normalizeVnPhoneTo84(phone)}`;
            if (personMap.has(dedupeKey)) continue;
            const zMatch = resolvePersonZalo(fullName, phone, cccd);
            personMap.set(dedupeKey, {
              key: dedupeKey,
              fullName,
              roleOrCategory: String(wr?.category || aname).trim(),
              groupId: aid,
              groupName: aname,
              phone: phone || undefined,
              cccd: cccd || undefined,
              zaloUserId: zMatch.zaloUserId,
              zaloDisplayName: zMatch.zaloDisplayName,
            });
          }
        }

        const recipients = Array.from(personMap.values());
        groups.push({
          id: aid,
          name: aname,
          groupType: isWelfare ? "welfare" : isPartyGov ? "party_gov" : "mass_org",
          categoryLabel: String(assoc?.category || (isWelfare ? "Chính sách xã hội" : "Đoàn thể")),
          leaderName: assoc?.leaderName ? String(assoc.leaderName) : undefined,
          leaderPhone: leaderPhone || undefined,
          totalMembers: recipients.length,
          zaloLinkedCount: recipients.filter((r) => Boolean(r.zaloUserId)).length,
          defaultPublishPortal: false,
          recipients,
        });
      }

      // 3. Nhóm Chủ cơ sở nhà trọ / Lưu trú từ bảng businesses
      const hostelOwnerMap = new Map<string, AudienceRecipientPerson>();
      for (const h of hostelRows) {
        const ownerName = String(h?.owner_name || "").trim();
        const bizName = String(h?.name || "Nhà trọ KP3").trim();
        const phone = String(h?.phone || "").trim();
        const labelName = ownerName || bizName;
        if (!labelName) continue;
        const normPhone = normalizeVnPhoneTo84(phone);
        const key = normPhone ? `ph:${normPhone}` : `hn:${normalizeCadreKey(labelName)}`;
        if (hostelOwnerMap.has(key)) continue;
        const zMatch = resolvePersonZalo(ownerName || bizName, phone);
        hostelOwnerMap.set(key, {
          key,
          fullName: ownerName ? `${ownerName} (${bizName})` : bizName,
          roleOrCategory: "Chủ cơ sở nhà trọ / lưu trú",
          groupId: "HOSTEL_OWNERS",
          groupName: "Chủ nhà trọ & Cơ sở lưu trú",
          phone: phone || undefined,
          zaloUserId: zMatch.zaloUserId,
          zaloDisplayName: zMatch.zaloDisplayName,
        });
      }
      const hostelRecipients = Array.from(hostelOwnerMap.values());
      groups.push({
        id: "HOSTEL_OWNERS",
        name: "Chủ nhà trọ & Cơ sở lưu trú",
        groupType: "hostel_owners",
        categoryLabel: "Quản lý lưu trú - PCCC",
        leaderName: `${policeName} (Công an KV) • ${headKpName} (Trưởng BĐH KP3)`,
        leaderPhone: policePhone || headKpPhone,
        totalMembers: hostelRecipients.length,
        zaloLinkedCount: hostelRecipients.filter((r) => Boolean(r.zaloUserId)).length,
        defaultPublishPortal: false,
        recipients: hostelRecipients,
      });

      return {
        followerList,
        existingLogs,
        groups,
        leaders: {
          partySecName,
          partySecPhone,
          partyDepName,
          partyDepPhone,
          headKpName,
          headKpPhone,
          frontHeadName,
          frontHeadPhone,
          policeName,
          policePhone,
        },
      };
    };

    // 5A. Trả về danh mục đối tượng nhận thông báo & thống kê thực tế cho giao diện Lịch & Nhiệm vụ
    if (action === "preview_broadcast_audience") {
      const dir = await loadBroadcastDirectory();
      return res.status(200).json({
        ok: true,
        oa: {
          ...ZALO_OA_KP3_DEFAULTS,
          followersSyncedCount: dir.followerList.length,
        },
        leaders: dir.leaders,
        audiences: dir.groups.map((g) => ({
          id: g.id,
          name: g.name,
          groupType: g.groupType,
          categoryLabel: g.categoryLabel,
          leaderName: g.leaderName,
          leaderPhone: g.leaderPhone,
          totalMembers: g.totalMembers,
          zaloLinkedCount: g.zaloLinkedCount,
          defaultPublishPortal: g.defaultPublishPortal,
        })),
        recentBroadcastLogs: dir.existingLogs
          .filter((l) => l.notificationType === "community_broadcast")
          .slice(0, 10),
      });
    }

    // 5B. Trợ lý AI Soạn thảo Thông báo theo Đối tượng chọn lọc (Prompt / Ảnh-PDF Công văn / Chuốt văn phong / Lịch-Nhiệm vụ)
    if (action === "ai_draft_broadcast") {
      const mode = String(body.mode || "prompt").trim();
      const userPrompt = String(body.prompt || "").trim();
      const tone = String(body.tone || "formal").trim();
      const currentTitle = String(body.currentTitle || "").trim();
      const currentContent = String(body.currentContent || "").trim();
      const fileBase64 = typeof body.fileBase64 === "string" ? body.fileBase64 : "";
      const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
      const fileName = typeof body.fileName === "string" ? body.fileName : "";
      const sourceItem = body.sourceItem && typeof body.sourceItem === "object" ? body.sourceItem : null;

      const rawAudienceIds: string[] = Array.isArray(body.targetAudienceIds)
        ? body.targetAudienceIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : ["ALL_CITIZENS"];
      const targetIds = rawAudienceIds.length > 0 ? rawAudienceIds : ["ALL_CITIZENS"];

      if (fileBase64 && fileBase64.length > 6_000_000) {
        return res.status(413).json({
          ok: false,
          error: "Tệp công văn đính kèm vượt quá 4.2 MB, vui lòng chọn tệp nhẹ hơn.",
        });
      }

      if (
        !userPrompt &&
        !fileBase64 &&
        !currentContent &&
        !sourceItem?.title
      ) {
        return res.status(400).json({
          ok: false,
          error: "Vui lòng nhập ý chính, chọn một lịch/nhiệm vụ hoặc đính kèm công văn để AI soạn thông báo.",
        });
      }

      const dir = await loadBroadcastDirectory();
      const selectedGroups = dir.groups.filter((g) => targetIds.includes(g.id));
      const effectiveGroups =
        selectedGroups.length > 0 ? selectedGroups : [dir.groups[0]];
      const isAllCitizens = effectiveGroups.some((g) => g.id === "ALL_CITIZENS");
      const hasPartyGroup = effectiveGroups.some(
        (g) => g.id === "ASC_DANG" || g.id === "ASC_CHIBO" || g.id === "ASC_DANG213" || g.id === "ASC_CTDANG"
      );
      const hasWelfareGroup = effectiveGroups.some((g) => g.groupType === "welfare");
      const hasHostelGroup = effectiveGroups.some((g) => g.id === "HOSTEL_OWNERS");

      const audienceNamesJoined = isAllCitizens
        ? "Toàn thể Nhân dân, các hộ gia đình trên địa bàn Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"
        : effectiveGroups.map((g) => g.name).join(", ");

      // Xác định người ký / đầu mối liên hệ phù hợp nhất với đối tượng nhận tin
      const contactLines: string[] = [];
      if (hasPartyGroup) {
        contactLines.push(
          `Đ/c ${dir.leaders.partySecName} - Bí thư Chi bộ Khu phố 3${
            dir.leaders.partySecPhone ? ` (SĐT: ${dir.leaders.partySecPhone})` : ""
          }`,
          `Đ/c ${dir.leaders.partyDepName} - Phó Bí thư Chi bộ${
            dir.leaders.partyDepPhone ? ` (SĐT: ${dir.leaders.partyDepPhone})` : ""
          }`
        );
      } else if (hasWelfareGroup) {
        contactLines.push(
          `Đ/c ${dir.leaders.frontHeadName} - Trưởng Ban Công tác Mặt trận Khu phố 3${
            dir.leaders.frontHeadPhone ? ` (SĐT: ${dir.leaders.frontHeadPhone})` : ""
          }`,
          `Ông ${dir.leaders.headKpName} - Trưởng Ban Điều hành Khu phố 3${
            dir.leaders.headKpPhone ? ` (SĐT: ${dir.leaders.headKpPhone})` : ""
          }`
        );
      } else if (hasHostelGroup) {
        contactLines.push(
          `${dir.leaders.policeName} - Công an khu vực Khu phố 3${
            dir.leaders.policePhone ? ` (SĐT: ${dir.leaders.policePhone})` : ""
          }`,
          `Ông ${dir.leaders.headKpName} - Trưởng Ban Điều hành Khu phố 3${
            dir.leaders.headKpPhone ? ` (SĐT: ${dir.leaders.headKpPhone})` : ""
          }`
        );
      } else {
        for (const g of effectiveGroups) {
          if (g.id !== "ALL_CITIZENS" && g.leaderName) {
            contactLines.push(
              `${g.leaderName} - Phụ trách ${g.name}${g.leaderPhone ? ` (SĐT: ${g.leaderPhone})` : ""}`
            );
          }
        }
        contactLines.push(
          `Ông ${dir.leaders.headKpName} - Trưởng Ban Điều hành Khu phố 3${
            dir.leaders.headKpPhone ? ` (SĐT: ${dir.leaders.headKpPhone})` : ""
          }`
        );
      }

      const salutationHint = isAllCitizens
        ? "Kính gửi: Toàn thể Nhân dân và các hộ gia đình tại Khu phố 3, Phường An Phú"
        : hasPartyGroup
        ? `Kính gửi: Các đồng chí Đảng viên thuộc ${effectiveGroups.map((g) => g.name).join(", ")} Khu phố 3`
        : hasWelfareGroup
        ? `Trân trọng kính mời: Đại diện các hộ gia đình thuộc diện quan tâm chăm lo (${effectiveGroups
            .map((g) => g.name)
            .join(", ")}) tại Khu phố 3`
        : hasHostelGroup
        ? "Kính gửi: Quý Chủ cơ sở kinh doanh nhà trọ, cơ sở lưu trú trên địa bàn Khu phố 3"
        : `Kính gửi: Các đồng chí, quý hội viên ${effectiveGroups.map((g) => g.name).join(", ")} Khu phố 3`;

      const suggestedPublishPortal = isAllCitizens;

      const buildFallbackDraft = () => {
        const rawTopic =
          sourceItem?.title ||
          currentTitle ||
          userPrompt.slice(0, 100) ||
          "Thông báo công tác tại Khu phố 3, Phường An Phú";
        const cleanTitle = sanitizeAdminGeography(
          rawTopic.toLowerCase().startsWith("thông báo")
            ? rawTopic
            : `Thông báo: ${rawTopic}`
        );
        const bodyParts = [
          `${salutationHint},`,
          "",
          sourceItem
            ? `${
                hasPartyGroup ? "Chi ủy Chi bộ" : "Ban Điều hành"
              } Khu phố 3, Phường An Phú, TP. Hồ Chí Minh trân trọng thông báo và kính mời tham dự/phối hợp nội dung sau:`
            : `${
                hasPartyGroup ? "Chi ủy Chi bộ" : "Ban Điều hành"
              } Khu phố 3, Phường An Phú, TP. Hồ Chí Minh trân trọng thông báo:`,
          "",
          sourceItem?.date || sourceItem?.time
            ? `- Thời gian: ${sourceItem.time ? `${sourceItem.time}, ` : ""}ngày ${sourceItem.date || "theo lịch thông báo"}`
            : "",
          sourceItem?.location
            ? `- Địa điểm: ${sanitizeAdminGeography(sourceItem.location)}`
            : `- Địa điểm: Văn phòng Khu phố 3 (01 Đường D2, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh)`,
          `- Nội dung chi tiết: ${sanitizeAdminGeography(
            currentContent || sourceItem?.description || userPrompt || "Theo kế hoạch triển khai của Khu phố 3."
          )}`,
          "",
          `- Đầu mối liên hệ: ${contactLines[0] || `Ông ${dir.leaders.headKpName} - Trưởng BĐH Khu phố 3`}.`,
          hasPartyGroup
            ? "Đề nghị các đồng chí sắp xếp thời gian tham dự đầy đủ, đúng giờ."
            : "Rất mong quý đại biểu, hội viên và bà con quan tâm phối hợp thực hiện.",
        ].filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""));

        const finalContent = bodyParts.join("\n");
        const detectedCat: NewsCategoryLabel = hasWelfareGroup
          ? "An sinh xã hội"
          : tone === "urgent"
          ? "Thông báo khẩn"
          : detectNewsCategory(cleanTitle, finalContent);

        return {
          title: cleanTitle,
          content: finalContent,
          portalSummary: buildRoundedSummary("", finalContent),
          category: detectedCat,
          suggestedPublishPortal,
          usedFallback: true,
        };
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        const fb = buildFallbackDraft();
        const hasPiiWarning = /\b\d{12}\b/.test(`${fb.title} ${fb.content}`);
        return res.status(200).json({ ok: true, ...fb, hasPiiWarning });
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });

        const toneInstruction =
          tone === "urgent"
            ? "Giọng văn KHẨN TRƯƠNG, CẢNH BÁO RÕ RÀNG, nhấn mạnh thời hạn và biện pháp an toàn ngay đầu bản tin."
            : tone === "friendly"
            ? "Giọng văn GẦN GŨI, ẤM ÁP, VẬN ĐỘNG ĐỒNG THUẬN nhưng vẫn giữ chuẩn mực của Ban Điều hành Khu phố."
            : "Giọng văn HÀNH CHÍNH CÔNG TRANG TRỌNG, CHUẨN MỰC, RÕ RÀNG, MẠCH LẠC.";

        const welfareSensitivityNote = hasWelfareGroup
          ? "LƯU Ý NHẠY CẢM AN SINH: Khi gửi tới Hộ nghèo, Hộ cận nghèo, Người khuyết tật hoặc Gia đình chính sách, sử dụng từ ngữ trân trọng, nhân văn (ví dụ: 'các hộ gia đình thuộc diện quan tâm chăm lo an sinh', 'gia đình chính sách'), tuyệt đối không dùng lời lẽ gây mặc cảm."
          : "";

        const systemInstruction = `Bạn là Thư ký Hành chính chuyên trách của Chi bộ & Ban Điều hành Khu phố 3, Phường An Phú, TP. Hồ Chí Minh.
Nhiệm vụ: Soạn thảo "Thông báo chính thức" để gửi đồng bộ qua kênh Zalo Official Account (Zalo OA Ban Điều hành Khu phố 3) và/hoặc đăng lên Cổng Dịch vụ Cư dân số.

NGỮ CẢNH THỰC TẾ TẠI KHU PHỐ 3 (TUYỆT ĐỐI KHÔNG BỊA ĐẶT TÊN/SĐT KHÁC):
- Địa danh hành chính bắt buộc sau sáp nhập: "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh" (TUYỆT ĐỐI KHÔNG viết bất kỳ tên quận/thành phố cấp huyện cũ nào trước sáp nhập).
- Trụ sở Văn phòng Khu phố 3: 01 Đường D2, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh.
- Thường trực Khu phố 3 (Bí thư Chi bộ đứng đầu Khu phố):
  + Bí thư Chi bộ: ${dir.leaders.partySecName} (${dir.leaders.partySecPhone})
  + Phó Bí thư Chi bộ: ${dir.leaders.partyDepName} (${dir.leaders.partyDepPhone})
  + Trưởng Ban Điều hành Khu phố 3: ${dir.leaders.headKpName} (${dir.leaders.headKpPhone})
  + Trưởng Ban Công tác Mặt trận: ${dir.leaders.frontHeadName}${dir.leaders.frontHeadPhone ? ` (${dir.leaders.frontHeadPhone})` : ""}
  + Công an khu vực: ${dir.leaders.policeName}${dir.leaders.policePhone ? ` (${dir.leaders.policePhone})` : ""}
- ĐỐI TƯỢNG NHẬN THÔNG BÁO ĐANG CHỌN: ${audienceNamesJoined}
- Lời chào mở đầu phù hợp: "${salutationHint}"
- Đầu mối liên hệ ưu tiên đưa vào cuối thông báo: ${contactLines.join(" | ")}

QUY TẮC TRÌNH BÀY:
1. ${toneInstruction}
2. ${welfareSensitivityNote}
3. Nội dung "content" tối ưu cho cả màn hình điện thoại Zalo OA (tổng độ dài DƯỚI 1.550 ký tự để cộng thêm phần khung Zalo OA không vượt giới hạn 2.000 ký tự của Zalo):
   - Mở đầu bằng lời kính gửi đúng đối tượng đã chọn.
   - Trình bày tách dòng thoáng mắt, dùng gạch đầu dòng rõ ràng cho: Thời gian, Địa điểm, Thành phần / Đối tượng, Nội dung thực hiện / Giấy tờ cần mang theo (nếu có), và Đầu mối liên hệ.
   - Không bọc markdown \`\`\` và không tự thêm dòng tiêu đề "[THÔNG BÁO KHU PHỐ 3]" ở dòng 1 vì hệ thống Zalo OA sẽ tự gắn khung tiêu đề chuẩn ở ngoài.
   - Tuyệt đối KHÔNG đưa số CCCD 12 chữ số của cá nhân cư dân vào nội dung thông báo chung.
4. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc:
{
  "title": "Tiêu đề thông báo ngắn gọn, chuẩn hành chính (tối đa 120 ký tự)",
  "content": "Nội dung chi tiết thông báo hoàn chỉnh",
  "portalSummary": "Đoạn tóm tắt tròn câu 130 - 170 ký tự để hiển thị ngoài thẻ tin Cổng Cư dân",
  "category": "Chọn đúng 1 trong 5 giá trị: 'Thông báo khẩn' | 'Hành chính' | 'Y tế & Đời sống' | 'Phong trào' | 'An sinh xã hội'"
}`;

        let taskPrompt = "";
        if (mode === "polish") {
          taskPrompt = `Hãy biên tập, chuẩn hóa câu chữ hành chính và trình bày lại bản nháp thông báo sau cho đúng đối tượng "${audienceNamesJoined}"${
            body.shortenForZalo ? " (đồng thời rút gọn súc tích dưới 900 ký tự cho dễ đọc nhanh trên Zalo)" : ""
          }:\nTiêu đề hiện tại: ${currentTitle}\nNội dung hiện tại:\n${currentContent}\n${
            userPrompt ? `\nYêu cầu bổ sung của cán bộ: ${userPrompt}` : ""
          }`;
        } else if (sourceItem) {
          taskPrompt = `Hãy chuyển đổi mục ${
            sourceItem.kind === "task" ? "Nhiệm vụ công tác" : "Lịch công tác"
          } sau đây thành Thông báo chính thức gửi tới "${audienceNamesJoined}":
- Tiêu đề gốc: ${sourceItem.title || ""}
- Ngày: ${sourceItem.date || ""}
- Giờ: ${sourceItem.time || ""}
- Địa điểm: ${sourceItem.location || ""}
- Chủ trì / Phụ trách: ${sourceItem.hostOrAssignee || ""}
- Nội dung gốc: ${sourceItem.description || ""}
${userPrompt ? `- Ghi chú thêm của cán bộ: ${userPrompt}` : ""}`;
        } else if (fileBase64) {
          taskPrompt = `Hãy đọc toàn bộ hình ảnh hoặc tệp PDF công văn/kế hoạch đính kèm, chắt lọc chính xác các thông tin thiết thực nhất liên quan đến đối tượng "${audienceNamesJoined}" tại Khu phố 3 (bỏ các căn cứ pháp lý dài dòng) để soạn thành Thông báo rõ ràng, dễ thực hiện.${
            userPrompt ? `\nChỉ đạo/ghi chú thêm của cán bộ Khu phố 3: ${userPrompt}` : ""
          }`;
        } else {
          taskPrompt = `Dựa trên ý chính sau đây của cán bộ, hãy soạn hoàn chỉnh Thông báo gửi tới "${audienceNamesJoined}":\n"${userPrompt}"`;
        }

        const parts: any[] = [{ text: taskPrompt }];
        if (fileBase64) {
          const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
          const resolvedMime =
            mimeType === "image/jpg"
              ? "image/jpeg"
              : mimeType || (fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
          parts.push({
            inlineData: {
              mimeType: resolvedMime,
              data: cleanedBase64,
            },
          });
        }

        const aiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          },
        });

        const rawText = String(aiRes.text || "")
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        const parsed = JSON.parse(rawText);

        const finalTitle = sanitizeAdminGeography(String(parsed?.title || "").trim());
        const finalContent = sanitizeAdminGeography(String(parsed?.content || "").trim()).slice(0, 1750);
        if (!finalTitle || !finalContent) {
          const fb = buildFallbackDraft();
          return res.status(200).json({
            ok: true,
            ...fb,
            hasPiiWarning: /\b\d{12}\b/.test(`${fb.title} ${fb.content}`),
          });
        }

        const rawCat = String(parsed?.category || "").trim() as NewsCategoryLabel;
        const finalCategory: NewsCategoryLabel = VALID_NEWS_CATEGORIES.has(rawCat)
          ? rawCat
          : hasWelfareGroup
          ? "An sinh xã hội"
          : detectNewsCategory(finalTitle, finalContent);

        const finalSummary = buildRoundedSummary(String(parsed?.portalSummary || ""), finalContent);
        const hasPiiWarning = /\b\d{12}\b/.test(`${finalTitle} ${finalContent}`);

        return res.status(200).json({
          ok: true,
          title: finalTitle,
          content: finalContent,
          portalSummary: finalSummary,
          category: finalCategory,
          suggestedPublishPortal,
          usedFallback: false,
          hasPiiWarning,
        });
      } catch (aiErr: any) {
        console.warn("[ai_draft_broadcast] Fallback do lỗi AI:", aiErr?.message || aiErr);
        const fb = buildFallbackDraft();
        return res.status(200).json({
          ok: true,
          ...fb,
          hasPiiWarning: /\b\d{12}\b/.test(`${fb.title} ${fb.content}`),
        });
      }
    }

    // 5C. Phát Thông báo Chính thức theo Đối tượng đã chọn (Zalo OA + Email + Tin tức Cổng Cư dân)
    const title = sanitizeAdminGeography(String(body.title || "").trim());
    const content = sanitizeAdminGeography(String(body.content || "").trim());
    const rawAudienceIds: string[] = Array.isArray(body.targetAudienceIds)
      ? body.targetAudienceIds.map((x: any) => String(x || "").trim()).filter(Boolean)
      : ["ALL_CITIZENS"];
    const targetIds = rawAudienceIds.length > 0 ? rawAudienceIds : ["ALL_CITIZENS"];
    const isAllCitizens = targetIds.includes("ALL_CITIZENS");
    const publishToPortalNews =
      typeof body.publishToPortalNews === "boolean" ? body.publishToPortalNews : isAllCitizens;

    if (!title || !content) {
      return res.status(400).json({
        ok: false,
        error: "Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo.",
      });
    }

    const dir = await loadBroadcastDirectory();
    let accessToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    const resendKey = (savedCfg.resendApiKey || process.env.RESEND_API_KEY || "").trim();
    const senderEmail = (
      savedCfg.senderEmail ||
      "Ban Điều Hành Khu Phố 3 An Phú <onboarding@resend.dev>"
    ).trim();

    const selectedGroups = isAllCitizens
      ? [dir.groups[0]]
      : dir.groups.filter((g) => targetIds.includes(g.id));
    const effectiveGroups = selectedGroups.length > 0 ? selectedGroups : [dir.groups[0]];
    const audienceLabel = isAllCitizens
      ? `Toàn thể Người dân Khu phố 3 (${Math.max(
          ZALO_OA_KP3_DEFAULTS.verifiedFollowersBaseline,
          dir.followerList.length
        )}+ người quan tâm OA)`
      : effectiveGroups.map((g) => g.name).join(", ");

    const audienceHeaderLine = isAllCitizens
      ? ""
      : `🎯 Đối tượng: ${effectiveGroups.map((g) => g.name).join(" • ")}\n`;

    const formattedBroadcast = `📢 [THÔNG BÁO KHU PHỐ 3 - PHƯỜNG AN PHÚ]\n${audienceHeaderLine}${title.toUpperCase()}\n\n${content}\n\n👉 Cổng Cư dân KP3: https://bdhkp3.vercel.app\n👉 Zalo OA chính thức: ${ZALO_OA_KP3_DEFAULTS.oaUrl}`;
    const safeZaloText =
      formattedBroadcast.length > 1980
        ? `${formattedBroadcast.slice(0, 1900)}\n...\n👉 Xem trọn vẹn tại: https://bdhkp3.vercel.app`
        : formattedBroadcast;

    // Tổng hợp danh sách người nhận duy nhất theo Zalo UID / Email / SĐT
    const uniqueZaloTargets = new Map<string, string>();
    const uniqueEmailTargets = new Map<string, string>();
    const unmatchedManualContacts: Array<{
      fullName: string;
      groupName: string;
      roleOrCategory: string;
      phone?: string;
    }> = [];
    const seenPersonKeys = new Set<string>();

    if (isAllCitizens) {
      for (const f of dir.followerList) {
        if (f?.zaloUserId) {
          uniqueZaloTargets.set(
            String(f.zaloUserId),
            f.displayName || `Cư dân #${String(f.zaloUserId).slice(-5)}`
          );
        }
      }
    } else {
      for (const grp of effectiveGroups) {
        for (const p of grp.recipients) {
          if (seenPersonKeys.has(p.key)) continue;
          seenPersonKeys.add(p.key);
          if (p.zaloUserId) {
            uniqueZaloTargets.set(p.zaloUserId, p.fullName);
          } else {
            unmatchedManualContacts.push({
              fullName: p.fullName,
              groupName: grp.name,
              roleOrCategory: p.roleOrCategory,
              phone: p.phone,
            });
          }
          if (p.email && p.email.includes("@")) {
            uniqueEmailTargets.set(p.email.toLowerCase(), p.fullName);
          }
        }
      }
    }

    let zaloSent = 0;
    let zaloFailed = 0;
    const refreshCtx = { cfg: savedCfg, supabaseUrl, serviceRoleKey };
    const zaloEntries = Array.from(uniqueZaloTargets.entries());

    if (accessToken && zaloEntries.length > 0) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < zaloEntries.length; i += BATCH_SIZE) {
        const chunk = zaloEntries.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          chunk.map(([uid]) => sendZaloOaCsMessage(accessToken, uid, safeZaloText, refreshCtx))
        );
        for (const r of results) {
          if (r.newToken) accessToken = r.newToken;
          if (r.ok) zaloSent++;
          else zaloFailed++;
        }
      }
    }

    let emailSent = 0;
    if (!isAllCitizens && resendKey && uniqueEmailTargets.size > 0) {
      for (const [emailAddr] of Array.from(uniqueEmailTargets.entries()).slice(0, 50)) {
        const er = await sendResendEmail(
          resendKey,
          senderEmail,
          emailAddr,
          `[KP3 An Phú - ${effectiveGroups.map((g) => g.name).join(", ")}] ${title}`,
          formattedBroadcast
        );
        if (er.ok) emailSent++;
      }
    }

    // Đồng bộ đăng lên bảng community_news trên Cổng Cư dân nếu được chọn
    let portalPublished = false;
    const requestedCat = String(body.category || "").trim() as NewsCategoryLabel;
    const resolvedCategory: NewsCategoryLabel = VALID_NEWS_CATEGORIES.has(requestedCat)
      ? requestedCat
      : detectNewsCategory(title, content);
    const resolvedSummary = buildRoundedSummary(String(body.portalSummary || ""), content);

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
          category: resolvedCategory,
          summary: resolvedSummary,
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
      channel: zaloSent > 0 ? "zalo_oa" : emailSent > 0 ? "email" : "outbox_ready",
      notificationType: "community_broadcast",
      recipientName: audienceLabel,
      recipientRole: isAllCitizens ? "community" : "cadre",
      subject: title,
      messagePreview: content.slice(0, 260),
      status: zaloSent > 0 || emailSent > 0 || portalPublished ? "sent" : "queued_manual_zalo",
      detail: `Đối tượng: ${
        isAllCitizens ? "Toàn Khu phố 3" : effectiveGroups.map((g) => g.name).join(", ")
      } • Zalo OA đẩy trực tiếp: ${zaloSent}/${zaloEntries.length} người${
        emailSent > 0 ? ` • Email: ${emailSent}` : ""
      } • Cổng Cư dân: ${portalPublished ? `Đã ghim (${resolvedCategory})` : "Không đăng công khai"}`,
      actorName: caller.actorName,
    };

    await writePrivateSetting(
      supabaseUrl,
      serviceRoleKey,
      LOGS_KEY,
      [logItem, ...dir.existingLogs].slice(0, 250)
    );

    return res.status(200).json({
      ok: true,
      zaloSent,
      zaloTargeted: zaloEntries.length,
      zaloFailed,
      emailSent,
      portalPublished,
      resolvedCategory,
      audienceLabel,
      isAllCitizens,
      unmatchedManualContacts: unmatchedManualContacts.slice(0, 80),
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
        const officerName = String(off?.name || off?.personName || off?.fullName || "").trim();
        const k = normalizeCadreKey(officerName);
        if (!k || seenKeys.has(k)) continue;
        seenKeys.add(k);
        const dir = cadreDirectory.get(k);
        const offPhone = String(off?.phone || dir?.phone || "").trim();
        const fMatch =
          dir?.zaloUserId
            ? { zaloUserId: dir.zaloUserId }
            : cadreMapping[k]?.zaloUserId
            ? { zaloUserId: cadreMapping[k].zaloUserId }
            : findMatchingZaloFollower(officerName, offPhone, followerList);
        matchedCadres.push({
          fullName: officerName,
          role: String(off?.role || off?.roleLabel || dir?.role || "Cán bộ KP3").trim(),
          phone: offPhone,
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
      const autoMeetingDedupePrefix = `mtg_auto_${remindLeadMinutes}m:${row.id}:${row.schedule_date}`;
      const legacyAutoAllKey = `mtg_${remindLeadMinutes}m:${row.id}:${row.schedule_date}:auto`;
      const alreadyAutoReminded = existingLogs.some(
        (l) =>
          l.status === "sent" &&
          l.dedupeKey &&
          (l.dedupeKey.startsWith(autoMeetingDedupePrefix) || l.dedupeKey === legacyAutoAllKey)
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
        const isAutoWindowDispatch = onlyWithinLeadWindow || mtg.inRemindWindow;
        const dedupeKey = isAutoWindowDispatch
          ? `mtg_auto_${remindLeadMinutes}m:${mtg.id}:${mtg.dateIso}:${cadreKey}`
          : `mtg_manual:${mtg.id}:${mtg.dateIso}:${cadreKey}:${Date.now()}`;
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

        if (sentOk) {
          sentCount++;
          sentDedupeSet.add(dedupeKey);
        } else {
          manualReadyCount++;
        }

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

  // =========================================================================
  // HỘP THƯ CHAT ZALO OA 2 CHIỀU TRONG PHÂN HỆ PHẢN ÁNH HIỆN TRƯỜNG
  // =========================================================================
  if (action === "list_zalo_conversations") {
    const indexList =
      (await readPrivateSetting<ZaloChatConversation[]>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_INDEX_KEY
      )) || [];
    const followers =
      (await readPrivateSetting<ZaloFollowerRecord[]>(
        supabaseUrl,
        serviceRoleKey,
        FOLLOWERS_KEY
      )) || [];

    // Hợp nhất các follower đã từng nhắn tin (lastMessage) nhưng chưa có trong index
    const byUid = new Map<string, ZaloChatConversation>();
    for (const c of indexList) {
      byUid.set(c.zaloUserId, c);
    }
    for (const f of followers) {
      if (!byUid.has(f.zaloUserId) && f.lastMessage) {
        byUid.set(f.zaloUserId, {
          zaloUserId: f.zaloUserId,
          displayName: f.displayName || `Cư dân Zalo #${f.zaloUserId.slice(-5)}`,
          phone: f.phone,
          cccd: f.cccd,
          lastMessage: f.lastMessage,
          lastMessageType: "text",
          lastDirection: "inbound",
          lastMessageAt: f.followedAt || new Date().toISOString(),
          unreadCount: 0,
          status: "open",
        });
      }
    }

    const conversations = Array.from(byUid.values()).sort(
      (a, b) => Date.parse(b.lastMessageAt || "0") - Date.parse(a.lastMessageAt || "0")
    );

    // Tự động định danh cư dân KP3 từ bảng residents theo SĐT / CCCD
    const phonesToLookup = Array.from(
      new Set(conversations.map((c) => c.phone).filter(Boolean) as string[])
    ).slice(0, 60);
    if (phonesToLookup.length > 0) {
      try {
        const inClause = phonesToLookup.map((p) => `"${p.replace(/"/g, "")}"`).join(",");
        const rRes = await fetch(
          `${supabaseUrl}/rest/v1/residents?select=full_name,phone,cccd,current_address,permanent_address,residence_type&phone=in.(${encodeURIComponent(
            inClause
          )})&limit=100`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );
        const rRows = await rRes.json().catch(() => []);
        if (Array.isArray(rRows) && rRows.length > 0) {
          const byPhone = new Map<string, any>();
          for (const row of rRows) {
            if (row.phone) byPhone.set(String(row.phone).trim(), row);
          }
          for (const conv of conversations) {
            if (conv.phone && byPhone.has(conv.phone)) {
              const hit = byPhone.get(conv.phone);
              conv.residentName = hit.full_name || conv.residentName;
              conv.residentAddress =
                hit.current_address || hit.permanent_address || conv.residentAddress;
              conv.residentType = hit.residence_type || conv.residentType;
            }
          }
        }
      } catch {
        // non-blocking enrichment
      }
    }

    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
    const urgentCount = conversations.filter((c) => c.aiPriority === "Khẩn cấp").length;
    const aiSettings =
      (await readPrivateSetting<ZaloChatAiSettings>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_AI_SETTINGS_KEY
      )) || DEFAULT_ZALO_CHAT_AI_SETTINGS;

    return res.status(200).json({
      ok: true,
      conversations,
      totalUnread,
      urgentCount,
      aiSettings,
      followers: followers.slice(0, 2000).map((f) => ({
        zaloUserId: f.zaloUserId,
        displayName: f.displayName || `Cư dân Zalo #${f.zaloUserId.slice(-5)}`,
        phone: f.phone,
      })),
      webhookUrl: "https://bdhkp3.vercel.app/api/notifications",
    });
  }

  if (action === "save_zalo_chat_ai_settings") {
    const prev =
      (await readPrivateSetting<ZaloChatAiSettings>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_AI_SETTINGS_KEY
      )) || DEFAULT_ZALO_CHAT_AI_SETTINGS;

    const nextSettings: ZaloChatAiSettings = {
      aiAutoReplyEnabled:
        typeof body.aiAutoReplyEnabled === "boolean"
          ? body.aiAutoReplyEnabled
          : prev.aiAutoReplyEnabled,
      aiSuggestReplyEnabled:
        typeof body.aiSuggestReplyEnabled === "boolean"
          ? body.aiSuggestReplyEnabled
          : prev.aiSuggestReplyEnabled,
      updatedAt: new Date().toISOString(),
      updatedBy: caller.actorName,
    };

    await writePrivateSetting(
      supabaseUrl,
      serviceRoleKey,
      ZALO_CHAT_AI_SETTINGS_KEY,
      nextSettings
    );

    return res.status(200).json({
      ok: true,
      aiSettings: nextSettings,
    });
  }

  if (action === "get_zalo_browser_sync_token") {
    const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
      supabaseUrl,
      serviceRoleKey,
      CONFIG_KEY
    );
    if (!savedCfg) {
      return res.status(400).json({ ok: false, error: "Chưa cấu hình Zalo OA trong hệ thống." });
    }
    const forceRefresh = Boolean(body.forceRefresh);
    const activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey,
      forceRefresh
    );
    if (!activeToken) {
      return res.status(400).json({ ok: false, error: "Chưa có Access Token Zalo OA hợp lệ." });
    }
    return res.status(200).json({
      ok: true,
      accessToken: activeToken,
      oaId: savedCfg.oaId || ZALO_OA_KP3_DEFAULTS.oaId,
    });
  }

  if (action === "ingest_zalo_browser_messages") {
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 120) : [];
    const oaId = String(body.oaId || ZALO_OA_KP3_DEFAULTS.oaId).trim();
    let syncedMessages = 0;

    for (const item of rawItems) {
      const src = Number(item.src); // 1 = user sent, 0 = OA sent
      const uid = String(
        item.zaloUserId || (src === 1 ? item.from_id : item.to_id || item.from_id) || ""
      ).trim();
      if (!uid || uid === oaId) continue;

      const msgTypeRaw = String(item.type || "text").toLowerCase();
      const msgType: ZaloChatMessage["msgType"] =
        msgTypeRaw === "photo" || msgTypeRaw === "image"
          ? "image"
          : msgTypeRaw === "location"
            ? "location"
            : msgTypeRaw === "file"
              ? "file"
              : msgTypeRaw === "sticker"
                ? "sticker"
                : "text";

      const displayName = String(
        item.peerDisplayName ||
          (src === 1 ? item.from_display_name : item.to_display_name) ||
          `Cư dân Zalo #${uid.slice(-5)}`
      ).trim();
      const avatar = String(
        item.peerAvatar || (src === 1 ? item.from_avatar : item.to_avatar) || ""
      ).trim();

      const tsNum = Number(item.time);
      const createdAt =
        Number.isFinite(tsNum) && tsNum > 1_000_000_000_000
          ? new Date(tsNum).toISOString()
          : new Date().toISOString();

      let attachmentUrl = String(item.url || item.thumb || "").trim();
      if (msgType === "image" && attachmentUrl && !attachmentUrl.includes(supabaseUrl)) {
        attachmentUrl = await uploadRemoteImageToFieldReportsStorage(
          supabaseUrl,
          serviceRoleKey,
          attachmentUrl,
          uid
        );
      }

      await appendZaloChatMessageToStore(
        supabaseUrl,
        serviceRoleKey,
        {
          id: `ZM-BRW-${item.message_id || Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          zaloUserId: uid,
          direction: src === 1 ? "inbound" : "outbound",
          msgType,
          content:
            String(item.message || "").trim() ||
            (msgType === "image"
              ? "[Đã gửi hình ảnh hiện trường]"
              : msgType === "location"
                ? "[Đã chia sẻ vị trí GPS]"
                : "[Tin nhắn Zalo]"),
          attachmentUrl: attachmentUrl || undefined,
          senderName: src === 1 ? displayName : "Zalo OA Khu phố 3",
          zaloMsgId: String(item.message_id || "").trim() || undefined,
          createdAt,
        },
        {
          displayName: !displayName.startsWith("Cư dân Zalo #") ? displayName : undefined,
          avatar: avatar || undefined,
        }
      );
      syncedMessages++;
    }

    const updatedIndex =
      (await readPrivateSetting<ZaloChatConversation[]>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_INDEX_KEY
      )) || [];

    return res.status(200).json({
      ok: true,
      syncedMessages,
      conversations: updatedIndex,
    });
  }

  if (action === "sync_zalo_recent_chats") {
    const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
      supabaseUrl,
      serviceRoleKey,
      CONFIG_KEY
    );
    if (!savedCfg) {
      return res.status(400).json({ ok: false, error: "Chưa cấu hình Zalo OA trong hệ thống." });
    }
    let activeToken = await refreshZaloAccessTokenIfNeeded(savedCfg, supabaseUrl, serviceRoleKey);
    if (!activeToken) {
      return res.status(400).json({ ok: false, error: "Chưa có Access Token Zalo OA hợp lệ." });
    }

    const fetchRecent = async (token: string) => {
      const url = `https://openapi.zalo.me/v2.0/oa/listrecentchat?data=${encodeURIComponent(
        JSON.stringify({ offset: 0, count: 10 })
      )}`;
      const r = await fetch(url, { headers: { access_token: token } });
      return await r.json().catch(() => ({}));
    };

    let recentJson = await fetchRecent(activeToken);
    if (recentJson?.error === -216) {
      const refreshed = await refreshZaloAccessTokenIfNeeded(
        savedCfg,
        supabaseUrl,
        serviceRoleKey,
        true
      );
      if (refreshed && refreshed !== activeToken) {
        activeToken = refreshed;
        recentJson = await fetchRecent(activeToken);
      }
    }

    let syncedMessages = 0;
    const rawItems = Array.isArray(recentJson?.data) ? recentJson.data : [];
    const seenUsers = new Map<string, { displayName: string; avatar?: string }>();

    for (const item of rawItems) {
      const src = Number(item.src); // 1 = user sent, 0 = OA sent
      const uid = String(src === 1 ? item.from_id : item.to_id || item.from_id || "").trim();
      if (!uid || uid === savedCfg.oaId) continue;
      const msgTypeRaw = String(item.type || "text").toLowerCase();
      const msgType: ZaloChatMessage["msgType"] =
        msgTypeRaw === "photo" || msgTypeRaw === "image"
          ? "image"
          : msgTypeRaw === "location"
            ? "location"
            : msgTypeRaw === "file"
              ? "file"
              : msgTypeRaw === "sticker"
                ? "sticker"
                : "text";

      const displayName =
        String(
          (src === 1 ? item.from_display_name : item.to_display_name) ||
            `Cư dân Zalo #${uid.slice(-5)}`
        ).trim();
      const avatar = String(
        (src === 1 ? item.from_avatar : item.to_avatar) || ""
      ).trim();

      seenUsers.set(uid, { displayName, avatar: avatar || undefined });

      const tsNum = Number(item.time);
      const createdAt =
        Number.isFinite(tsNum) && tsNum > 1_000_000_000_000
          ? new Date(tsNum).toISOString()
          : new Date().toISOString();

      await appendZaloChatMessageToStore(
        supabaseUrl,
        serviceRoleKey,
        {
          id: `ZM-SYNC-${item.message_id || Date.now()}`,
          zaloUserId: uid,
          direction: src === 1 ? "inbound" : "outbound",
          msgType,
          content: String(item.message || "").trim() || (msgType === "image" ? "[Hình ảnh]" : "[Tin nhắn]"),
          attachmentUrl: String(item.url || "").trim() || undefined,
          senderName: src === 1 ? displayName : "Zalo OA Khu phố 3",
          zaloMsgId: String(item.message_id || "").trim() || undefined,
          createdAt,
        },
        { displayName, avatar: avatar || undefined }
      );
      syncedMessages++;
    }

    // Giai đoạn 2: Kéo sâu lịch sử từng hội thoại (tối đa 8 cư dân gần nhất, 10 tin/người) qua /v2.0/oa/conversation
    for (const [uid, meta] of Array.from(seenUsers.entries()).slice(0, 8)) {
      try {
        const convUrl = `https://openapi.zalo.me/v2.0/oa/conversation?data=${encodeURIComponent(
          JSON.stringify({ user_id: uid, offset: 0, count: 10 })
        )}`;
        const cRes = await fetch(convUrl, { headers: { access_token: activeToken } });
        const cJson = await cRes.json().catch(() => ({}));
        const cItems = Array.isArray(cJson?.data) ? cJson.data : [];
        for (const it of cItems.reverse()) {
          const src = Number(it.src);
          const mTypeRaw = String(it.type || "text").toLowerCase();
          const mType: ZaloChatMessage["msgType"] =
            mTypeRaw === "photo" || mTypeRaw === "image"
              ? "image"
              : mTypeRaw === "location"
                ? "location"
                : mTypeRaw === "file"
                  ? "file"
                  : mTypeRaw === "sticker"
                    ? "sticker"
                    : "text";
          const tsNum = Number(it.time);
          const createdAt =
            Number.isFinite(tsNum) && tsNum > 1_000_000_000_000
              ? new Date(tsNum).toISOString()
              : new Date().toISOString();
          await appendZaloChatMessageToStore(
            supabaseUrl,
            serviceRoleKey,
            {
              id: `ZM-HIST-${it.message_id || Date.now()}`,
              zaloUserId: uid,
              direction: src === 1 ? "inbound" : "outbound",
              msgType: mType,
              content: String(it.message || "").trim() || (mType === "image" ? "[Hình ảnh]" : "[Tin nhắn]"),
              attachmentUrl: String(it.url || "").trim() || undefined,
              senderName: src === 1 ? meta.displayName : "Zalo OA Khu phố 3",
              zaloMsgId: String(it.message_id || "").trim() || undefined,
              createdAt,
            },
            meta
          );
          syncedMessages++;
        }
      } catch {
        // continue other users
      }
    }

    const updatedIndex =
      (await readPrivateSetting<ZaloChatConversation[]>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_INDEX_KEY
      )) || [];

    return res.status(200).json({
      ok: true,
      syncedMessages,
      zaloApiError: recentJson?.error !== 0 ? recentJson?.message || `code_${recentJson?.error}` : null,
      conversations: updatedIndex,
    });
  }

  if (action === "get_zalo_conversation_messages") {
    const zaloUserId = String(body.zaloUserId || "").trim();
    const pullFromZalo = Boolean(body.pullFromZalo);
    if (!zaloUserId) {
      return res.status(400).json({ ok: false, error: "Thiếu mã zaloUserId." });
    }
    const threadKey = `${ZALO_CHAT_THREAD_PREFIX}${zaloUserId}`;

    // Nếu cán bộ bấm "Tải lịch sử Zalo" -> kéo 10 tin nhắn gần nhất trực tiếp từ Zalo OA API
    if (pullFromZalo) {
      const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
        supabaseUrl,
        serviceRoleKey,
        CONFIG_KEY
      );
      if (savedCfg) {
        const activeToken = await refreshZaloAccessTokenIfNeeded(
          savedCfg,
          supabaseUrl,
          serviceRoleKey
        );
        if (activeToken) {
          try {
            const convUrl = `https://openapi.zalo.me/v2.0/oa/conversation?data=${encodeURIComponent(
              JSON.stringify({ user_id: zaloUserId, offset: 0, count: 10 })
            )}`;
            const cRes = await fetch(convUrl, { headers: { access_token: activeToken } });
            const cJson = await cRes.json().catch(() => ({}));
            const cItems = Array.isArray(cJson?.data) ? cJson.data : [];
            for (const it of cItems.reverse()) {
              const src = Number(it.src);
              const mTypeRaw = String(it.type || "text").toLowerCase();
              const mType: ZaloChatMessage["msgType"] =
                mTypeRaw === "photo" || mTypeRaw === "image"
                  ? "image"
                  : mTypeRaw === "location"
                    ? "location"
                    : mTypeRaw === "file"
                      ? "file"
                      : mTypeRaw === "sticker"
                        ? "sticker"
                        : "text";
              const tsNum = Number(it.time);
              const createdAt =
                Number.isFinite(tsNum) && tsNum > 1_000_000_000_000
                  ? new Date(tsNum).toISOString()
                  : new Date().toISOString();
              await appendZaloChatMessageToStore(supabaseUrl, serviceRoleKey, {
                id: `ZM-PULL-${it.message_id || Date.now()}`,
                zaloUserId,
                direction: src === 1 ? "inbound" : "outbound",
                msgType: mType,
                content: String(it.message || "").trim() || (mType === "image" ? "[Hình ảnh]" : "[Tin nhắn]"),
                attachmentUrl: String(it.url || "").trim() || undefined,
                senderName:
                  src === 1
                    ? String(it.from_display_name || `Cư dân Zalo #${zaloUserId.slice(-5)}`)
                    : "Zalo OA Khu phố 3",
                zaloMsgId: String(it.message_id || "").trim() || undefined,
                createdAt,
              });
            }
          } catch {
            // fallback to cached thread
          }
        }
      }
    }

    const messages =
      (await readPrivateSetting<ZaloChatMessage[]>(supabaseUrl, serviceRoleKey, threadKey)) || [];

    // Đánh dấu đã đọc trên index
    const indexList =
      (await readPrivateSetting<ZaloChatConversation[]>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_INDEX_KEY
      )) || [];
    const targetIdx = indexList.findIndex((c) => c.zaloUserId === zaloUserId);
    if (targetIdx >= 0 && indexList[targetIdx].unreadCount > 0) {
      indexList[targetIdx] = { ...indexList[targetIdx], unreadCount: 0 };
      await writePrivateSetting(supabaseUrl, serviceRoleKey, ZALO_CHAT_INDEX_KEY, indexList);
    }

    return res.status(200).json({
      ok: true,
      zaloUserId,
      messages,
      conversation: targetIdx >= 0 ? indexList[targetIdx] : null,
    });
  }

  if (action === "reply_zalo_chat") {
    const zaloUserId = String(body.zaloUserId || "").trim();
    const text = String(body.text || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const displayName = String(body.displayName || "").trim();
    const reportId = String(body.reportId || "").trim() || undefined;
    const reportTitle = String(body.reportTitle || "").trim() || undefined;

    if (!zaloUserId) {
      return res.status(400).json({ ok: false, error: "Thiếu mã cư dân Zalo (zaloUserId)." });
    }
    if (!text && !imageUrl) {
      return res.status(400).json({ ok: false, error: "Vui lòng nhập nội dung hoặc đính kèm ảnh." });
    }

    const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
      supabaseUrl,
      serviceRoleKey,
      CONFIG_KEY
    );
    if (!savedCfg) {
      return res.status(400).json({ ok: false, error: "Chưa cấu hình Zalo OA." });
    }
    const activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    if (!activeToken) {
      return res.status(400).json({ ok: false, error: "Chưa có Access Token Zalo OA hợp lệ." });
    }

    const sendRes = imageUrl
      ? await sendZaloOaImageMessage(activeToken, zaloUserId, imageUrl, text || undefined, {
          cfg: savedCfg,
          supabaseUrl,
          serviceRoleKey,
        })
      : await sendZaloOaCsMessage(activeToken, zaloUserId, text, {
          cfg: savedCfg,
          supabaseUrl,
          serviceRoleKey,
        });

    if (!sendRes.ok) {
      return res.status(502).json({
        ok: false,
        error: `Zalo OA không gửi được tin nhắn: ${sendRes.detail}`,
      });
    }

    const msgIdMatch = sendRes.detail.match(/msg_id:(.+)/);
    const outMsg: ZaloChatMessage = {
      id: `ZM-OUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      zaloUserId,
      direction: "outbound",
      msgType: imageUrl ? "image" : "text",
      content: text || "Đã gửi hình ảnh minh chứng từ Ban Điều hành Khu phố 3",
      attachmentUrl: imageUrl || undefined,
      senderName: caller.actorName || "Cán bộ BĐH KP3",
      reportId,
      zaloMsgId: msgIdMatch ? msgIdMatch[1] : undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedConv = await appendZaloChatMessageToStore(supabaseUrl, serviceRoleKey, outMsg, {
      displayName: displayName || undefined,
      linkedReportId: reportId,
      linkedReportTitle: reportTitle,
    });

    return res.status(200).json({
      ok: true,
      message: outMsg,
      conversation: updatedConv,
      detail: sendRes.detail,
    });
  }

  if (action === "link_zalo_conversation_report") {
    const zaloUserId = String(body.zaloUserId || "").trim();
    const reportId = String(body.reportId || "").trim();
    const reportTitle = String(body.reportTitle || "").trim();
    const notifyResident = Boolean(body.notifyResident);

    if (!zaloUserId || !reportId) {
      return res.status(400).json({ ok: false, error: "Thiếu zaloUserId hoặc reportId." });
    }

    const indexList =
      (await readPrivateSetting<ZaloChatConversation[]>(
        supabaseUrl,
        serviceRoleKey,
        ZALO_CHAT_INDEX_KEY
      )) || [];
    const idx = indexList.findIndex((c) => c.zaloUserId === zaloUserId);
    if (idx >= 0) {
      indexList[idx] = {
        ...indexList[idx],
        linkedReportId: reportId,
        linkedReportTitle: reportTitle || indexList[idx].linkedReportTitle,
      };
      await writePrivateSetting(supabaseUrl, serviceRoleKey, ZALO_CHAT_INDEX_KEY, indexList);
    }

    let notifySent = false;
    if (notifyResident) {
      const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
        supabaseUrl,
        serviceRoleKey,
        CONFIG_KEY
      );
      if (savedCfg) {
        const token = await refreshZaloAccessTokenIfNeeded(savedCfg, supabaseUrl, serviceRoleKey);
        if (token) {
          const confirmText = [
            `📋 [TIẾP NHẬN PHẢN ÁNH 1022 — KHU PHỐ 3 PHƯỜNG AN PHÚ]`,
            `Ban Điều hành Khu phố 3 đã tiếp nhận và lập hồ sơ phản ánh của ông/bà:`,
            `• Mã hồ sơ: ${reportId}`,
            `• Nội dung: ${reportTitle || "Phản ánh hiện trường"}`,
            `Tổ công tác đang kiểm tra hiện trường và sẽ phản hồi kết quả xử lý trực tiếp qua Zalo OA này.`,
          ].join("\n");
          const r = await sendZaloOaCsMessage(token, zaloUserId, confirmText, {
            cfg: savedCfg,
            supabaseUrl,
            serviceRoleKey,
          });
          notifySent = r.ok;
          if (r.ok) {
            await appendZaloChatMessageToStore(supabaseUrl, serviceRoleKey, {
              id: `ZM-LINK-${Date.now()}`,
              zaloUserId,
              direction: "outbound",
              msgType: "text",
              content: confirmText,
              senderName: caller.actorName || "Ban Điều hành KP3",
              reportId,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return res.status(200).json({
      ok: true,
      linkedReportId: reportId,
      notifySent,
    });
  }

  if (action === "ai_suggest_zalo_reply") {
    const zaloUserId = String(body.zaloUserId || "").trim();
    const displayName = String(body.displayName || "ông/bà").trim();
    const linkedReportId = String(body.linkedReportId || "").trim();
    const linkedReportTitle = String(body.linkedReportTitle || "").trim();
    const geminiKey = (process.env.GEMINI_API_KEY || "").trim();

    const threadKey = `${ZALO_CHAT_THREAD_PREFIX}${zaloUserId}`;
    const recentMsgs = (
      (await readPrivateSetting<ZaloChatMessage[]>(supabaseUrl, serviceRoleKey, threadKey)) || []
    ).slice(-6);

    const fallbackDraft = linkedReportId
      ? `Kính chào ${displayName}, Ban Điều hành Khu phố 3 Phường An Phú đã ghi nhận nội dung trao đổi liên quan đến hồ sơ ${linkedReportId} (${linkedReportTitle || "Phản ánh hiện trường"}). Tổ công tác đang trực tiếp kiểm tra, xử lý và sẽ thông báo kết quả đến ông/bà trong thời gian sớm nhất. Trân trọng!`
      : `Kính chào ${displayName}, Ban Điều hành Khu phố 3 Phường An Phú đã tiếp nhận thông tin của ông/bà. Cán bộ khu phố sẽ nhanh chóng kiểm tra hiện trường và phản hồi kết quả cụ thể qua Zalo OA này. Nếu có thể, ông/bà vui lòng cung cấp thêm địa chỉ cụ thể hoặc ảnh hiện trường để tổ công tác xử lý kịp thời. Trân trọng!`;

    if (!geminiKey || recentMsgs.length === 0) {
      return res.status(200).json({ ok: true, suggestion: fallbackDraft, source: "template" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const transcript = recentMsgs
        .map((m) => `${m.direction === "inbound" ? "Cư dân" : "Cán bộ KP3"}: ${m.content}`)
        .join("\n");
      const prompt = `Bạn là Cán bộ Ban Điều hành Khu phố 3, Phường An Phú, TP. Hồ Chí Minh (tuyệt đối KHÔNG nhắc đến TP. Thủ Đức).
Hãy soạn 01 tin nhắn trả lời ngắn gọn (3-4 câu), lịch sự, chuẩn mực hành chính, gần gũi với cư dân tên "${displayName}" trên Zalo OA.
${linkedReportId ? `Hồ sơ phản ánh đang gắn: ${linkedReportId} — ${linkedReportTitle}.` : ""}
Lịch sử trao đổi gần nhất:
${transcript}

Chỉ trả về đúng nội dung tin nhắn thuần văn bản (không dùng markdown ** hay tiêu đề thừa).`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const textOut = String(aiRes.text || "").trim();
      return res.status(200).json({
        ok: true,
        suggestion: textOut || fallbackDraft,
        source: textOut ? "gemini" : "template",
      });
    } catch {
      return res.status(200).json({ ok: true, suggestion: fallbackDraft, source: "template" });
    }
  }

  if (action === "list_hostel_checkins") {
    const items =
      (await readPrivateSetting<any[]>(supabaseUrl, serviceRoleKey, HOSTEL_CHECKINS_KEY)) || [];
    return res.status(200).json({ ok: true, items });
  }

  if (action === "update_hostel_checkin_status") {
    const id = String(body.id || "").trim();
    const status = body.status === "approved" ? "approved" : "rejected";
    const items =
      (await readPrivateSetting<any[]>(supabaseUrl, serviceRoleKey, HOSTEL_CHECKINS_KEY)) || [];
    const next = items.map((c) =>
      c.id === id ? { ...c, status, reviewedBy: caller.actorName } : c
    );
    await writePrivateSetting(supabaseUrl, serviceRoleKey, HOSTEL_CHECKINS_KEY, next);
    return res.status(200).json({ ok: true });
  }

  if (action === "send_patrol_urgent_alert") {
    const savedCfg = await readPrivateSetting<ZaloOaSavedConfig>(
      supabaseUrl,
      serviceRoleKey,
      CONFIG_KEY
    );
    if (!savedCfg) {
      return res.status(200).json({ ok: true, sentCount: 0 });
    }
    const activeToken = await refreshZaloAccessTokenIfNeeded(
      savedCfg,
      supabaseUrl,
      serviceRoleKey
    );
    const sentCount = activeToken
      ? await pushUrgentZaloAlertToCadres({
          supabaseUrl,
          serviceRoleKey,
          activeToken,
          savedCfg,
          citizenName: String(body.teamMembers || "Tổ ANTT Cơ sở KP3"),
          category: `Tuần tra ANTT (${body.result || "Báo cáo"})`,
          messageSnippet: `[${body.shiftLabel || "Ca tuần tra"}] Tại ${body.routeArea}: ${body.note}`,
        })
      : 0;
    return res.status(200).json({ ok: true, sentCount });
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
