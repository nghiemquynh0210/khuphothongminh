const DEFAULT_SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co";

const BUILTIN_CADRE_ZALO_ALIASES: Record<string, { zaloUserId: string; fullName: string }> = {
  "nghiem xuan quynh": { zaloUserId: "8204901768555080728", fullName: "Nghiêm Xuân Quỳnh" },
  "pham ngoc ha": { zaloUserId: "2742691693568338378", fullName: "Phạm Ngọc Hà" },
  "nguyen trung huy": { zaloUserId: "6920129842444200396", fullName: "Nguyễn Trung Huy" },
  "tran thi my dung": { zaloUserId: "4080370657469274213", fullName: "Trần Thị Mỹ Dung" },
  "nguyen thu phuong": { zaloUserId: "104103935947927732", fullName: "Nguyễn Thu Phương" },
  "dinh thi thanh phuong": { zaloUserId: "5842864785250600915", fullName: "Đinh Thị Thanh Phương" },
  "pham van long": { zaloUserId: "5395605764479658788", fullName: "Phạm Văn Long" },
  "duong tan dat": { zaloUserId: "575440132125981497", fullName: "Dương Tấn Đạt" },
};

function normalizeSimpleName(raw?: string): string {
  return String(raw || "")
    .replace(/^(?:Bí thư|Phó Bí thư|Trưởng Khu phố|Phó Trưởng Khu phố|Đ\/c|Đồng chí|Đại úy)\s+/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchedCadreTarget {
  cadreKey: string;
  fullName: string;
  zaloUserId: string;
}

export function matchCadreTargets(
  assignedOfficers: Array<{ name?: string; personName?: string; fullName?: string; phone?: string }>,
  attendeesRaw: string,
  followers: any[],
  cadreMapping: Record<string, any> = {},
  assocMembersMap: Map<string, { fullName: string; zaloUserId?: string }> = new Map()
): MatchedCadreTarget[] {
  const targetsByKey = new Map<string, MatchedCadreTarget>();
  const hay = normalizeSimpleName(attendeesRaw);

  const resolveZaloUid = (key: string, fullName: string): string | undefined => {
    if (cadreMapping && cadreMapping[key]?.zaloUserId) {
      return String(cadreMapping[key].zaloUserId);
    }
    const assocHit = assocMembersMap.get(key);
    if (assocHit?.zaloUserId) {
      return String(assocHit.zaloUserId);
    }
    if (BUILTIN_CADRE_ZALO_ALIASES[key]?.zaloUserId) {
      return BUILTIN_CADRE_ZALO_ALIASES[key].zaloUserId;
    }
    if (key.includes("0908579479")) {
      return "2742691693568338378";
    }
    const parts = key.split(" ").filter(Boolean);
    const firstLast = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : "";
    const lastTwo = parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : "";
    for (const f of followers) {
      const fn = normalizeSimpleName(f?.displayName);
      if (!fn || !f?.zaloUserId) continue;
      if (fn === key || (firstLast && fn === firstLast) || (lastTwo && fn === lastTwo)) {
        return String(f.zaloUserId);
      }
    }
    return undefined;
  };

  const tryAddCadre = (rawName: string) => {
    const key = normalizeSimpleName(rawName);
    if (!key || key.length < 4 || targetsByKey.has(key)) return;
    const uid = resolveZaloUid(key, rawName);
    if (uid) {
      const displayFull =
        String(rawName || "").trim() ||
        cadreMapping?.[key]?.fullName ||
        BUILTIN_CADRE_ZALO_ALIASES[key]?.fullName ||
        key;
      targetsByKey.set(key, {
        cadreKey: key,
        fullName: displayFull,
        zaloUserId: uid,
      });
    }
  };

  // 1. Ưu tiên tuyệt đối danh sách cán bộ được phân công trực tiếp (hỗ trợ cả .name và .personName)
  for (const off of Array.isArray(assignedOfficers) ? assignedOfficers : []) {
    const nm = String(off?.name || off?.personName || off?.fullName || "").trim();
    if (nm) tryAddCadre(nm);
  }

  // 2. Quét đối khớp toàn bộ các cán bộ đã ghép Zalo trong cadre_zalo_mapping_v1 & danh bạ chi hội
  if (hay) {
    for (const [mappedKey, entry] of Object.entries(cadreMapping || {})) {
      if (mappedKey && mappedKey.length >= 4 && hay.includes(mappedKey) && entry?.zaloUserId) {
        if (!targetsByKey.has(mappedKey)) {
          targetsByKey.set(mappedKey, {
            cadreKey: mappedKey,
            fullName: String(entry.fullName || mappedKey),
            zaloUserId: String(entry.zaloUserId),
          });
        }
      }
    }
    for (const [assocKey, info] of assocMembersMap.entries()) {
      if (assocKey.length >= 4 && hay.includes(assocKey)) {
        tryAddCadre(info.fullName);
      }
    }
    for (const [aliasKey, info] of Object.entries(BUILTIN_CADRE_ZALO_ALIASES)) {
      if (hay.includes(aliasKey)) {
        tryAddCadre(info.fullName);
      }
    }
  }

  // 3. Từ đồng nghĩa chức danh đoàn thể để tự động nhận diện cán bộ phụ trách
  const ROLE_SYNONYMS: Record<string, string[]> = {
    "Phạm Ngọc Hà": ["khu doi", "khu doi truong", "chi huy quan su", "quan su", "pho bi thu", "pho bi thu chi bo", "0908579479"],
    "Nghiêm Xuân Quỳnh": ["bi thu", "bi thu chi bo", "chi uy", "thuong truc chi bo"],
    "Nguyễn Trung Huy": ["truong ban dieu hanh", "truong khu pho", "to truong to hoa giai", "ban dieu hanh", "bdh"],
    "Trần Thị Mỹ Dung": ["mat tran", "truong ban ctmt", "ban cong tac mat tran"],
    "Phạm Văn Long": ["antt", "an ninh trat tu", "to truong antt"],
    "Dương Tấn Đạt": ["duong tan dat"],
  };

  for (const [cadreName, syns] of Object.entries(ROLE_SYNONYMS)) {
    if (syns.some((s) => hay.includes(s))) {
      tryAddCadre(cadreName);
    }
  }

  // 4. Mặc định nhắc Bí thư Chi bộ nếu lịch chung toàn khu phố mà chưa tách tên cá nhân
  if (targetsByKey.size === 0) {
    tryAddCadre("Nghiêm Xuân Quỳnh");
  }

  return Array.from(targetsByKey.values());
}

const MIN_DB_QUERY_INTERVAL_MS = 60_000;
const MIN_HEARTBEAT_WRITE_INTERVAL_MS = 60_000;
const MIN_MEETING_60M_CHECK_MS = 5 * 60_000;

let lastVerifiedAtMs = 0;
let lastHeartbeatWriteAtMs = 0;
let lastMeeting60mCheckAtMs = 0;
let lastCachedResult: Record<string, any> | null = null;

export function resetKeepAliveThrottleForTests() {
  lastVerifiedAtMs = 0;
  lastHeartbeatWriteAtMs = 0;
  lastMeeting60mCheckAtMs = 0;
  lastCachedResult = null;
}

const TOTAL_KEEPALIVE_BUDGET_MS = 8500;

async function fetchWithDeadline(
  url: string,
  init: RequestInit | undefined,
  deadlineMs: number,
  maxPerCallMs = 4500
): Promise<Response> {
  const remaining = deadlineMs - Date.now();
  if (remaining <= 200) {
    const err = new Error("Keepalive timeout budget exceeded");
    (err as any).name = "AbortError";
    throw err;
  }
  const timeoutMs = Math.min(maxPerCallMs, remaining);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...(init || {}), signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyKeepAliveStaffJwt(
  authHeader: string,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
  deadlineMs: number
): Promise<boolean> {
  if (!authHeader.toLowerCase().startsWith("bearer ") || !serviceRoleKey) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;
  try {
    const userRes = await fetchWithDeadline(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          apikey: anonKey || serviceRoleKey,
          Authorization: `Bearer ${token}`,
        },
      },
      deadlineMs,
      2500
    );
    if (!userRes.ok) return false;
    const authUser = await userRes.json().catch(() => null);
    if (!authUser?.id) return false;
    const profRes = await fetchWithDeadline(
      `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(authUser.id)}&select=role,approval_status`,
      {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      },
      deadlineMs,
      2500
    );
    if (!profRes.ok) return false;
    const rows = await profRes.json().catch(() => []);
    const profile = rows?.[0];
    return Boolean(
      profile &&
        profile.approval_status === "approved" &&
        (profile.role === "admin" || profile.role === "cadre")
    );
  } catch {
    return false;
  }
}

interface SharedZaloRunCtx {
  cfg?: Record<string, any>;
  accessToken?: string;
  tokenChecked?: boolean;
}

async function refreshZaloToken(
  cfg: Record<string, any>,
  supabaseUrl: string,
  headers: Record<string, string>,
  deadlineMs: number
): Promise<string> {
  const refreshToken = String(cfg.refreshToken || process.env.ZALO_OA_REFRESH_TOKEN || "").trim();
  const appSecret = String(cfg.appSecret || process.env.ZALO_APP_SECRET || "").trim();
  const appId = String(cfg.appId || "432932322782886593").trim();
  if (!refreshToken || !appSecret || !appId) return "";

  try {
    const form = new URLSearchParams();
    form.set("app_id", appId);
    form.set("grant_type", "refresh_token");
    form.set("refresh_token", refreshToken);
    const refRes = await fetchWithDeadline(
      "https://oauth.zaloapp.com/v4/oa/access_token",
      {
        method: "POST",
        headers: {
          secret_key: appSecret,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
      deadlineMs,
      3000
    );
    const refJson = await refRes.json().catch(() => ({}));
    if (refJson?.access_token) {
      const nextAccess = String(refJson.access_token).trim();
      await fetchWithDeadline(
        `${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            key: "zalo_oa_config_v1",
            value: {
              ...cfg,
              accessToken: nextAccess,
              ...(refJson.refresh_token ? { refreshToken: String(refJson.refresh_token).trim() } : {}),
              updatedAt: new Date().toISOString(),
            },
            is_public: false,
            updated_at: new Date().toISOString(),
          }),
        },
        deadlineMs,
        2500
      );
      return nextAccess;
    }
  } catch {
    // ignore refresh error
  }
  return "";
}

async function ensureValidZaloAccessToken(
  cfg: Record<string, any>,
  supabaseUrl: string,
  headers: Record<string, string>,
  deadlineMs: number,
  sharedCtx?: SharedZaloRunCtx
): Promise<string> {
  if (sharedCtx?.tokenChecked) {
    return sharedCtx.accessToken || "";
  }
  let accessToken = String(cfg.accessToken || process.env.ZALO_OA_ACCESS_TOKEN || "").trim();
  if (!accessToken) {
    accessToken = await refreshZaloToken(cfg, supabaseUrl, headers, deadlineMs);
    if (sharedCtx) {
      sharedCtx.tokenChecked = true;
      sharedCtx.accessToken = accessToken;
    }
    return accessToken;
  }
  try {
    const ping = await fetchWithDeadline(
      "https://openapi.zalo.me/v2.0/oa/getoa",
      {
        headers: { access_token: accessToken },
      },
      deadlineMs,
      2500
    );
    const pingJson = await ping.json().catch(() => ({}));
    if (pingJson?.error && pingJson.error !== 0) {
      const refreshed = await refreshZaloToken(cfg, supabaseUrl, headers, deadlineMs);
      if (refreshed) accessToken = refreshed;
    }
  } catch {
    // keep current token on transient ping timeout
  }
  if (sharedCtx) {
    sharedCtx.tokenChecked = true;
    sharedCtx.accessToken = accessToken;
  }
  return accessToken;
}

async function postZaloOaMessageWithRetry(
  accessToken: string,
  zaloUid: string,
  textMsg: string,
  cfg: Record<string, any>,
  supabaseUrl: string,
  headers: Record<string, string>,
  deadlineMs: number
): Promise<{ ok: boolean; detail: string; updatedToken?: string }> {
  const sendOnce = async (token: string) => {
    const r = await fetchWithDeadline(
      "https://openapi.zalo.me/v2.0/oa/message",
      {
        method: "POST",
        headers: {
          access_token: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { user_id: zaloUid },
          message: { text: textMsg },
        }),
      },
      deadlineMs,
      2500
    );
    const j = await r.json().catch(() => ({}));
    return { httpOk: r.ok, json: j };
  };

  try {
    let { httpOk, json } = await sendOnce(accessToken);
    if ((json?.error === -216 || json?.error === -220) && cfg) {
      const refreshed = await refreshZaloToken(cfg, supabaseUrl, headers, deadlineMs);
      if (refreshed && refreshed !== accessToken) {
        const retry = await sendOnce(refreshed);
        if (retry.httpOk && retry.json?.error === 0) {
          return {
            ok: true,
            detail: `msg_id:${retry.json?.data?.message_id || "ok"}`,
            updatedToken: refreshed,
          };
        }
        return {
          ok: false,
          detail: String(retry.json?.message || `zalo_err_${retry.json?.error}`),
          updatedToken: refreshed,
        };
      }
    }
    if (httpOk && json?.error === 0) {
      return { ok: true, detail: `msg_id:${json?.data?.message_id || "ok"}` };
    }
    return { ok: false, detail: String(json?.message || `zalo_err_${json?.error}`) };
  } catch (err: any) {
    return { ok: false, detail: err?.message || "network_error" };
  }
}

async function checkAndDispatchDue60mMeetings(
  supabaseUrl: string,
  serviceRoleKey: string,
  deadlineMs: number,
  sharedCtx: SharedZaloRunCtx
): Promise<{ sent: number; checkedToday: number; dueInWindow: number }> {
  const nowMs = Date.now();
  const vnNow = new Date(nowMs + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayVnIso = `${vnNow.getUTCFullYear()}-${pad(vnNow.getUTCMonth() + 1)}-${pad(
    vnNow.getUTCDate()
  )}`;
  const dmy = `${pad(vnNow.getUTCDate())}/${pad(vnNow.getUTCMonth() + 1)}/${vnNow.getUTCFullYear()}`;

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };

  const [cfgRows, followerRows, logRows, schRows, mapRows, assocRows] = await Promise.all([
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_config_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_followers_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.notification_dispatch_logs_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/work_schedules?schedule_date=eq.${todayVnIso}&select=id,title,schedule_date,schedule_time,location,attendees,status,attachments`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.cadre_zalo_mapping_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/associations_records?key=eq.associations&select=payload`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
  ]);

  const scheduleList: any[] = Array.isArray(schRows) ? schRows : [];
  const cfg = cfgRows?.[0]?.value || {};
  sharedCtx.cfg = cfg;
  if (cfg.autoRemindMeeting60mEnabled === false) {
    return { sent: 0, checkedToday: scheduleList.length, dueInWindow: 0 };
  }

  const leadMinutes = Math.min(240, Math.max(5, Number(cfg.meetingRemindMinutesBefore) || 60));
  let accessToken = await ensureValidZaloAccessToken(
    cfg,
    supabaseUrl,
    headers,
    deadlineMs,
    sharedCtx
  );
  if (!accessToken) {
    return { sent: 0, checkedToday: scheduleList.length, dueInWindow: 0 };
  }

  const cadreMapping: Record<string, any> = mapRows?.[0]?.value || {};
  const followers: any[] = Array.isArray(followerRows?.[0]?.value) ? followerRows[0].value : [];
  const assocMembersMap = new Map<string, { fullName: string; zaloUserId?: string }>();
  const assocPayload = assocRows?.[0]?.payload;
  if (Array.isArray(assocPayload)) {
    for (const assoc of assocPayload) {
      for (const m of Array.isArray(assoc?.members) ? assoc.members : []) {
        const nm = String(m?.fullName || m?.name || "").trim();
        const k = normalizeSimpleName(nm);
        if (k && k.length >= 4) {
          const prev = assocMembersMap.get(k);
          assocMembersMap.set(k, {
            fullName: nm,
            zaloUserId: m?.zaloUserId ? String(m.zaloUserId) : prev?.zaloUserId,
          });
        }
      }
    }
  }

  const logs: any[] = Array.isArray(logRows?.[0]?.value) ? logRows[0].value : [];
  // Chỉ coi các bản ghi tự động 60 phút có status === "sent" (mtg_auto_...) là đã gửi thành công;
  // KHÔNG bị chặn bởi tin nhắc lịch tuần thủ công (mtg_manual:...) gửi từ hôm trước!
  const sentAutoDedupeSet = new Set(
    logs
      .filter((l) => l?.status === "sent" && l?.dedupeKey)
      .map((l) => String(l.dedupeKey))
  );

  const newLogs: any[] = [];
  let sent = 0;
  let dueInWindow = 0;

  for (const row of scheduleList) {
    if (row.status === "Đã hoãn") continue;
    const rawAtts = Array.isArray(row.attachments) ? row.attachments : [];
    const meta = rawAtts.find((a: any) => a && a.id === "__KP3_SCHEDULE_META_V1__")?.meta;
    if (meta?.relevanceTier === "ward_reference") continue;

    const m = String(row.schedule_time || "").match(/(\d{1,2})\s*[:hg]\s*(\d{2})/i);
    if (!m) continue;
    const hh = Math.min(23, Math.max(0, Number(m[1])));
    const mm = Math.min(59, Math.max(0, Number(m[2])));
    const startUtcMs = Date.parse(`${todayVnIso}T${pad(hh)}:${pad(mm)}:00+07:00`);
    const minsLeft = Math.round((startUtcMs - nowMs) / 60_000);
    // Cho phép biên dung sai +5 phút (ví dụ cron điểm đúng 05:59:40 cho lịch 07:00 -> 60..61 phút vẫn bắt kịp ngay)
    if (minsLeft <= 0 || minsLeft > leadMinutes + 5) continue;

    dueInWindow++;

    const assignedOfficers = Array.isArray(meta?.assignedOfficers) ? meta.assignedOfficers : [];
    const targets = matchCadreTargets(
      assignedOfficers,
      String(row.attendees || ""),
      followers,
      cadreMapping,
      assocMembersMap
    );

    const textMsg = [
      `⏰ [NHẮC TRƯỚC ${leadMinutes} PHÚT - LỊCH HỌP KHU PHỐ 3 AN PHÚ]`,
      `Cuộc họp sẽ diễn ra sau ${minsLeft} phút (${row.schedule_time} hôm nay ${dmy}):`,
      `• Nội dung: ${row.title}`,
      `• Địa điểm: ${row.location || "Phường An Phú, TP. Hồ Chí Minh"}`,
      `• Thành phần dự: ${row.attendees || targets.map((t) => t.fullName).join(", ") || "Ban Điều hành Khu phố 3"}`,
      `Đề nghị đồng chí chuẩn bị tài liệu và có mặt đúng giờ!`,
      `👉 Xem lịch: https://bdhkp3.vercel.app/dashboard/tasks`,
    ].join("\n");

    for (const target of targets) {
      const dedupeKey = `mtg_auto_${leadMinutes}m:${row.id}:${todayVnIso}:${target.cadreKey}`;
      const legacyAutoAllKey = `mtg_${leadMinutes}m:${row.id}:${todayVnIso}:auto`;
      const legacyCadreKey = `mtg_${leadMinutes}m:${row.id}:${todayVnIso}:${target.cadreKey}`;
      const sentLegacyAuto = logs.some(
        (l) =>
          l?.status === "sent" &&
          (l?.dedupeKey === legacyAutoAllKey ||
            (l?.dedupeKey === legacyCadreKey && String(l?.actorName || "").includes("Tự động")))
      );
      if (sentAutoDedupeSet.has(dedupeKey) || sentLegacyAuto) continue;

      if (deadlineMs - Date.now() <= 900) break;

      const sendRes = await postZaloOaMessageWithRetry(
        accessToken,
        target.zaloUserId,
        textMsg,
        cfg,
        supabaseUrl,
        headers,
        deadlineMs
      );
      if (sendRes.updatedToken) {
        accessToken = sendRes.updatedToken;
        sharedCtx.accessToken = sendRes.updatedToken;
      }

      if (sendRes.ok) {
        sent++;
        sentAutoDedupeSet.add(dedupeKey);
      }

      newLogs.push({
        id: `NTF-AUTO60M-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        channel: sendRes.ok ? "zalo_oa" : "outbox_ready",
        notificationType: "cadre_meeting_reminder",
        recipientName: target.fullName,
        recipientRole: "cadre",
        subject: `Tự động nhắc trước ${leadMinutes}p (${dmy} ${row.schedule_time}): ${row.title}`,
        messagePreview: textMsg.slice(0, 260),
        status: sendRes.ok ? "sent" : "failed",
        detail: sendRes.detail,
        ...(sendRes.ok ? { dedupeKey } : {}),
        actorName: `Tự động trước ${leadMinutes} phút`,
      });
    }
  }

  if (newLogs.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        key: "notification_dispatch_logs_v1",
        value: [...newLogs, ...logs].slice(0, 250),
        is_public: false,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  return { sent, checkedToday: scheduleList.length, dueInWindow };
}

async function checkAndDispatchDueRecurringReports(
  supabaseUrl: string,
  serviceRoleKey: string,
  deadlineMs: number,
  sharedCtx: SharedZaloRunCtx
): Promise<number> {
  if (deadlineMs - Date.now() <= 1200) return 0;
  const nowMs = Date.now();
  const vnNow = new Date(nowMs + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayVnIso = `${vnNow.getUTCFullYear()}-${pad(vnNow.getUTCMonth() + 1)}-${pad(
    vnNow.getUTCDate()
  )}`;
  const vnHour = vnNow.getUTCHours();

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };

  const [cfgRows, followerRows, logRows, remRows, mapRows] = await Promise.all([
    sharedCtx.cfg
      ? Promise.resolve([{ value: sharedCtx.cfg }])
      : fetchWithDeadline(
          `${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_config_v1&select=value`,
          { headers },
          deadlineMs,
          2500
        ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_followers_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.notification_dispatch_logs_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/recurring_reminders?select=id,title,payload`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
    fetchWithDeadline(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.cadre_zalo_mapping_v1&select=value`,
      { headers },
      deadlineMs,
      2500
    ).then((r) => (r.ok ? r.json() : [])),
  ]);

  const cfg = cfgRows?.[0]?.value || {};
  let accessToken = await ensureValidZaloAccessToken(
    cfg,
    supabaseUrl,
    headers,
    deadlineMs,
    sharedCtx
  );
  if (!accessToken) return 0;

  const followers: any[] = Array.isArray(followerRows?.[0]?.value) ? followerRows[0].value : [];
  const cadreMapping: Record<string, any> = mapRows?.[0]?.value || {};
  const logs: any[] = Array.isArray(logRows?.[0]?.value) ? logRows[0].value : [];
  const dedupeSet = new Set(
    logs.filter((l) => l?.status === "sent" && l?.dedupeKey).map((l) => String(l.dedupeKey))
  );
  const newLogs: any[] = [];
  let sent = 0;

  const todayStartMs = Date.parse(`${todayVnIso}T00:00:00+07:00`);

  for (const row of Array.isArray(remRows) ? remRows : []) {
    const p = row?.payload || {};
    if (!p.isActive) continue;
    const channels: string[] = Array.isArray(p.notifyChannels) ? p.notifyChannels : [];
    if (!channels.includes("zalo_sms") && !channels.includes("zalo_oa")) continue;

    const nextDue = String(p.nextDueDate || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) continue;
    const dueStartMs = Date.parse(`${nextDue}T00:00:00+07:00`);
    const diffDays = Math.round((dueStartMs - todayStartMs) / 86_400_000);
    const timeStr = String(p.frequencyDetail?.time || "16:30");

    let stage = "";
    let urgencyLabel = "";

    if (diffDays === 1 && p.frequency !== "daily" && vnHour >= 8) {
      stage = "pre_1d";
      urgencyLabel = "🔔 SẮP ĐẾN HẠN NGÀY MAI";
    } else if (diffDays === 0) {
      const m = timeStr.match(/(\d{1,2})\s*[:hg]\s*(\d{2})/i);
      const hh = m ? Math.min(23, Math.max(0, Number(m[1]))) : 16;
      const mm = m ? Math.min(59, Math.max(0, Number(m[2]))) : 30;
      const dueUtcMs = Date.parse(`${todayVnIso}T${pad(hh)}:${pad(mm)}:00+07:00`);
      const minsLeft = Math.round((dueUtcMs - nowMs) / 60_000);
      if (minsLeft > 0 && minsLeft <= 65) {
        stage = "due_60m";
        urgencyLabel = `⏰ CÒN ${minsLeft} PHÚT ĐẾN HẠN NỘP`;
      }
    }

    if (!stage) continue;

    const personName = String(p.responsiblePerson?.name || "").trim();
    const targets = matchCadreTargets(
      personName ? [{ name: personName }] : [],
      `${personName} ${p.responsiblePerson?.role || ""} ${p.responsibleUnit || ""}`,
      followers,
      cadreMapping
    );

    const dueFormatted = nextDue.split("-").reverse().join("/");
    const textMsg = [
      `📋 [TỰ ĐỘNG NHẮC BÁO CÁO ĐỊNH KỲ KP3 — ${urgencyLabel}]`,
      `Kính gửi đồng chí ${personName || p.responsibleUnit || "Cán bộ KP3"},`,
      `• Báo cáo: ${p.title || row.title}`,
      `• Cơ quan nhận: ${p.recipientOrg || "Phường An Phú, TP. Hồ Chí Minh"}`,
      `• Hạn nộp: ${timeStr} ngày ${dueFormatted}`,
      `Đề nghị đồng chí hoàn thành và cập nhật trạng thái nộp trên hệ thống.`,
      `👉 https://bdhkp3.vercel.app/dashboard/tasks`,
    ].join("\n");

    for (const target of targets) {
      const dedupeKey = `rpt_auto:${row.id}:${nextDue}:${stage}:${target.cadreKey}`;
      if (dedupeSet.has(dedupeKey)) continue;

      if (deadlineMs - Date.now() <= 900) break;

      const sendRes = await postZaloOaMessageWithRetry(
        accessToken,
        target.zaloUserId,
        textMsg,
        cfg,
        supabaseUrl,
        headers,
        deadlineMs
      );
      if (sendRes.updatedToken) {
        accessToken = sendRes.updatedToken;
        sharedCtx.accessToken = sendRes.updatedToken;
      }

      if (sendRes.ok) {
        sent++;
        dedupeSet.add(dedupeKey);
      }

      newLogs.push({
        id: `NTF-RPT-AUTO-${Date.now()}-${row.id}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: new Date().toISOString(),
        channel: sendRes.ok ? "zalo_oa" : "outbox_ready",
        notificationType: "recurring_report_reminder",
        recipientName: target.fullName,
        recipientRole: "cadre",
        subject: `Tự động nhắc báo cáo định kỳ (${dueFormatted} ${timeStr}): ${p.title || row.title}`,
        messagePreview: textMsg.slice(0, 260),
        status: sendRes.ok ? "sent" : "failed",
        detail: sendRes.detail,
        ...(sendRes.ok ? { dedupeKey } : {}),
        actorName: "Tự động nhắc báo cáo định kỳ",
      });
    }
  }

  if (newLogs.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        key: "notification_dispatch_logs_v1",
        value: [...newLogs, ...logs].slice(0, 250),
        is_public: false,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  return sent;
}

export default async function handler(req: any, res: any) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const method = String(req?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const startedAt = Date.now();
  const overallDeadlineMs = startedAt + TOTAL_KEEPALIVE_BUDGET_MS;

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

  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const authHeader = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const cronHeaderSecret = String(req?.headers?.["x-kp3-cron-secret"] || "").trim();
  const hasCronHeader = Boolean(req?.headers?.["x-vercel-cron"]);
  const isVercelCron = cronSecret
    ? hasCronHeader && authHeader === `Bearer ${cronSecret}`
    : hasCronHeader;
  const hasValidCronSecret = Boolean(
    cronSecret && (authHeader === `Bearer ${cronSecret}` || cronHeaderSecret === cronSecret)
  );
  const wantsMeetingProbe =
    String(req?.url || "").includes("check_meetings=1") ||
    String(req?.query?.check_meetings || "") === "1";

  let isAuthorizedMeetingProbe = false;
  if (wantsMeetingProbe) {
    if (isVercelCron || hasValidCronSecret) {
      isAuthorizedMeetingProbe = true;
    } else if (!cronSecret && !serviceRoleKey) {
      // Môi trường local/unit test không có secret -> giữ nguyên hành vi kiểm thử ping DB
      isAuthorizedMeetingProbe = true;
    } else if (serviceRoleKey && authHeader.toLowerCase().startsWith("bearer ")) {
      isAuthorizedMeetingProbe = await verifyKeepAliveStaffJwt(
        authHeader,
        supabaseUrl,
        anonKey,
        serviceRoleKey,
        overallDeadlineMs
      );
    }
  }

  const isScheduledProbe = isVercelCron || hasValidCronSecret || isAuthorizedMeetingProbe;
  const nowMs = Date.now();

  // Chống spam liên tục trên cùng một warm instance cho HTTP ping thường,
  // NHƯNG LUÔN chạy thật 100% khi nhận tín hiệu hợp lệ từ Vercel Cron hoặc Cron Secret / Staff JWT!
  if (
    !isVercelCron &&
    !isScheduledProbe &&
    lastCachedResult &&
    nowMs - lastVerifiedAtMs < MIN_DB_QUERY_INTERVAL_MS
  ) {
    return res.status(200).json({
      ...lastCachedResult,
      throttled: true,
      checkedAt: new Date(nowMs).toISOString(),
    });
  }

  if (!anonKey) {
    return res.status(503).json({
      ok: false,
      service: "kp3-an-phu-keepalive",
      error: "Missing VITE_SUPABASE_ANON_KEY environment variable",
      checkedAt: new Date(nowMs).toISOString(),
    });
  }

  try {
    const queryUrl = `${supabaseUrl}/rest/v1/portal_settings?select=key,updated_at&limit=2`;
    const dbRes = await fetchWithDeadline(
      queryUrl,
      {
        method: "GET",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      },
      overallDeadlineMs,
      4500
    );

    const latencyMs = Date.now() - startedAt;

    if (!dbRes.ok) {
      return res.status(503).json({
        ok: false,
        service: "kp3-an-phu-keepalive",
        supabaseStatus: dbRes.status,
        latencyMs,
        checkedAt: new Date().toISOString(),
      });
    }

    const rows = await dbRes.json();
    let mode = "postgrest-select";

    let meetingsSent = 0;
    let meetingsCheckedToday = 0;
    let meetingsDueInWindow = 0;
    let reportsSent = 0;

    const sharedZaloCtx: SharedZaloRunCtx = {};

    if (
      serviceRoleKey &&
      overallDeadlineMs - Date.now() > 1500 &&
      (isScheduledProbe || Date.now() - lastMeeting60mCheckAtMs >= MIN_MEETING_60M_CHECK_MS)
    ) {
      lastMeeting60mCheckAtMs = Date.now();
      try {
        const mtgResult = await checkAndDispatchDue60mMeetings(
          supabaseUrl,
          serviceRoleKey,
          overallDeadlineMs,
          sharedZaloCtx
        );
        meetingsSent = mtgResult.sent;
        meetingsCheckedToday = mtgResult.checkedToday;
        meetingsDueInWindow = mtgResult.dueInWindow;
        if (meetingsSent > 0) {
          mode += `+zalo-60m-sent(${meetingsSent})`;
        }
      } catch {
        // Không làm gián đoạn keepalive chính
      }
      if (overallDeadlineMs - Date.now() > 1200) {
        try {
          reportsSent = await checkAndDispatchDueRecurringReports(
            supabaseUrl,
            serviceRoleKey,
            overallDeadlineMs,
            sharedZaloCtx
          );
          if (reportsSent > 0) {
            mode += `+zalo-report-sent(${reportsSent})`;
          }
        } catch {
          // Không làm gián đoạn keepalive chính
        }
      }
    }

    if (
      serviceRoleKey &&
      isScheduledProbe &&
      (meetingsSent > 0 ||
        reportsSent > 0 ||
        Date.now() - lastHeartbeatWriteAtMs >= MIN_HEARTBEAT_WRITE_INTERVAL_MS)
    ) {
      lastHeartbeatWriteAtMs = Date.now();
      const hbRes = await fetch(
        `${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            key: "system_heartbeat",
            value: {
              source: isVercelCron ? "vercel-cron" : "scheduled-probe-15m",
              latency_ms: latencyMs,
              meetings_checked_today: meetingsCheckedToday,
              meetings_due_in_window: meetingsDueInWindow,
              meetings_sent: meetingsSent,
              reports_sent: reportsSent,
              pinged_at: new Date().toISOString(),
            },
            is_public: false,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      if (hbRes.ok) {
        mode += "+heartbeat-upsert";
      }

      try {
        const todayIso = new Date().toISOString().slice(0, 10);
        const cfgRes = await fetch(
          `${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_config_v1&select=value`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              Accept: "application/json",
            },
          }
        );
        if (cfgRes.ok) {
          const cfgRows = await cfgRes.json();
          const cfgVal = cfgRows?.[0]?.value || {};
          if (
            cfgVal.autoRemind15dEnabled !== false &&
            cfgVal.lastAutoRemindDate !== todayIso
          ) {
            await fetch(`${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`, {
              method: "POST",
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
                Prefer: "resolution=merge-duplicates,return=minimal",
              },
              body: JSON.stringify({
                key: "zalo_oa_config_v1",
                value: {
                  ...cfgVal,
                  oaId: cfgVal.oaId || "3124278810088361494",
                  oaName: cfgVal.oaName || "Ban Điều Hành Khu Phố 3 phường An Phú",
                  oaUrl: cfgVal.oaUrl || "https://zalo.me/bdhkhupho3",
                  appId: cfgVal.appId || "432932322782886593",
                  autoRemind15dEnabled: cfgVal.autoRemind15dEnabled !== false,
                  remindDaysThreshold: cfgVal.remindDaysThreshold || 15,
                  lastAutoRemindDate: todayIso,
                },
                is_public: false,
                updated_at: new Date().toISOString(),
              }),
            });
            mode += "+zalo-15d-scheduled";
          }
        }
      } catch {
        // Không để nhánh phụ làm gián đoạn keepalive chính
      }
    }

    const payload = {
      ok: true,
      service: "kp3-an-phu-keepalive",
      trigger: isVercelCron ? "vercel-cron" : isScheduledProbe ? "scheduled-probe" : "http-probe",
      mode,
      hasServiceRole: Boolean(serviceRoleKey),
      meetingsCheckedToday,
      meetingsDueInWindow,
      meetingsSent,
      reportsSent,
      supabaseStatus: dbRes.status,
      rowsChecked: Array.isArray(rows) ? rows.length : 0,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };

    lastVerifiedAtMs = Date.now();
    lastCachedResult = payload;

    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(503).json({
      ok: false,
      service: "kp3-an-phu-keepalive",
      error: err?.name === "AbortError" ? "Supabase request timed out" : "Supabase unreachable",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  }
}
