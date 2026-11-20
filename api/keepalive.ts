const DEFAULT_SUPABASE_URL = "https://wjdgaobhipkgzveidtra.supabase.co";

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

function matchCadreFollowers(
  officerNames: string[],
  attendeesRaw: string,
  followers: any[],
  cadreMapping: Record<string, any> = {}
): string[] {
  const uids = new Set<string>();
  const hay = normalizeSimpleName(attendeesRaw);

  const tryMatchOne = (fullName: string) => {
    const key = normalizeSimpleName(fullName);
    if (!key || key.length < 4) return;
    if (cadreMapping && cadreMapping[key]?.zaloUserId) {
      uids.add(String(cadreMapping[key].zaloUserId));
      return;
    }
    // Built-in alias cho cán bộ chủ chốt KP3
    if (key === "pham ngoc ha" || key.includes("0908579479")) {
      uids.add("2742691693568338378"); // Sò (Phó Bí thư Phạm Ngọc Hà - SĐT 0908579479)
      return;
    }
    const parts = key.split(" ").filter(Boolean);
    const firstLast = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : "";
    const lastTwo = parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : "";
    for (const f of followers) {
      const fn = normalizeSimpleName(f?.displayName);
      if (!fn || !f?.zaloUserId) continue;
      if (fn === key || (firstLast && fn === firstLast) || (lastTwo && fn === lastTwo)) {
        uids.add(String(f.zaloUserId));
      }
    }
  };

  for (const nm of officerNames) tryMatchOne(nm);

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
    if (syns.some((s) => hay.includes(s))) {
      tryMatchOne(cadreName);
    }
  }

  for (const known of [
    "Nghiêm Xuân Quỳnh",
    "Phạm Ngọc Hà",
    "Nguyễn Trung Huy",
    "Trần Thị Mỹ Dung",
    "Nguyễn Thu Phương",
    "Đinh Thị Thanh Phương",
    "Trần Thị Kim Loan",
  ]) {
    if (hay.includes(normalizeSimpleName(known))) {
      tryMatchOne(known);
    }
  }
  if (uids.size === 0) {
    // Mặc định nhắc Bí thư Chi bộ nếu lịch chung toàn khu phố
    tryMatchOne("Nghiêm Xuân Quỳnh");
  }
  return Array.from(uids);
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

async function checkAndDispatchDue60mMeetings(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<number> {
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

  const [cfgRows, followerRows, logRows, schRows, mapRows] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_config_v1&select=value`, {
      headers,
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_followers_v1&select=value`, {
      headers,
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.notification_dispatch_logs_v1&select=value`,
      { headers }
    ).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `${supabaseUrl}/rest/v1/work_schedules?schedule_date=eq.${todayVnIso}&select=id,title,schedule_date,schedule_time,location,attendees,status,attachments`,
      { headers }
    ).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.cadre_zalo_mapping_v1&select=value`,
      { headers }
    ).then((r) => (r.ok ? r.json() : [])),
  ]);

  const cadreMapping: Record<string, any> = mapRows?.[0]?.value || {};

  const cfg = cfgRows?.[0]?.value || {};
  if (cfg.autoRemindMeeting60mEnabled === false) return 0;
  const leadMinutes = Math.min(240, Math.max(5, Number(cfg.meetingRemindMinutesBefore) || 60));

  let accessToken = String(cfg.accessToken || process.env.ZALO_OA_ACCESS_TOKEN || "").trim();
  const refreshToken = String(cfg.refreshToken || process.env.ZALO_OA_REFRESH_TOKEN || "").trim();
  const appSecret = String(cfg.appSecret || process.env.ZALO_APP_SECRET || "").trim();
  const appId = String(cfg.appId || "432932322782886593").trim();
  if (!accessToken) return 0;

  // Kiểm tra nhanh hiệu lực Access Token & tự gia hạn OAuth v4 nếu cần
  try {
    const ping = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", {
      headers: { access_token: accessToken },
    });
    const pingJson = await ping.json().catch(() => ({}));
    if (pingJson?.error && pingJson.error !== 0 && refreshToken && appSecret) {
      const form = new URLSearchParams();
      form.set("app_id", appId);
      form.set("grant_type", "refresh_token");
      form.set("refresh_token", refreshToken);
      const refRes = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
        method: "POST",
        headers: {
          secret_key: appSecret,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      const refJson = await refRes.json().catch(() => ({}));
      if (refJson?.access_token) {
        accessToken = String(refJson.access_token).trim();
        await fetch(`${supabaseUrl}/rest/v1/portal_settings?on_conflict=key`, {
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
              accessToken,
              ...(refJson.refresh_token ? { refreshToken: String(refJson.refresh_token).trim() } : {}),
            },
            is_public: false,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    }
  } catch {}

  const followers: any[] = Array.isArray(followerRows?.[0]?.value) ? followerRows[0].value : [];
  if (followers.length === 0) return 0;

  const logs: any[] = Array.isArray(logRows?.[0]?.value) ? logRows[0].value : [];
  const dedupeSet = new Set(logs.filter((l) => l?.dedupeKey).map((l) => String(l.dedupeKey)));
  const newLogs: any[] = [];
  let sent = 0;

  for (const row of Array.isArray(schRows) ? schRows : []) {
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
    if (minsLeft <= 0 || minsLeft > leadMinutes) continue;

    const dedupePrefix = `mtg_${leadMinutes}m:${row.id}:${todayVnIso}`;
    if (Array.from(dedupeSet).some((k) => k.startsWith(dedupePrefix))) continue;

    const textMsg = [
      `⏰ [NHẮC TRƯỚC ${leadMinutes} PHÚT - LỊCH HỌP KHU PHỐ 3 AN PHÚ]`,
      `Cuộc họp sẽ diễn ra sau ${minsLeft} phút (${row.schedule_time} hôm nay ${dmy}):`,
      `• Nội dung: ${row.title}`,
      `• Địa điểm: ${row.location || "Phường An Phú"}`,
      `• Thành phần dự: ${row.attendees || "Ban Điều hành Khu phố 3"}`,
      `Đề nghị đồng chí chuẩn bị tài liệu và có mặt đúng giờ!`,
      `👉 Xem lịch: https://bdhkp3.vercel.app/dashboard/tasks`,
    ].join("\n");

    const assignedNames = Array.isArray(meta?.assignedOfficers)
      ? meta.assignedOfficers.map((o: any) => String(o?.personName || "")).filter(Boolean)
      : [];
    const targetZaloUids = matchCadreFollowers(
      assignedNames,
      String(row.attendees || ""),
      followers,
      cadreMapping
    );

    let anyOk = false;
    for (const zaloUid of targetZaloUids) {
      const r = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
        method: "POST",
        headers: {
          access_token: accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { user_id: zaloUid },
          message: { text: textMsg },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.error === 0) {
        anyOk = true;
        sent++;
      }
    }

    const dedupeKey = `${dedupePrefix}:auto`;
    dedupeSet.add(dedupeKey);
    newLogs.push({
      id: `NTF-AUTO60M-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: anyOk ? "zalo_oa" : "outbox_ready",
      notificationType: "cadre_meeting_reminder",
      recipientName: row.attendees || "Cán bộ Khu phố 3",
      recipientRole: "cadre",
      subject: `Tự động nhắc trước ${leadMinutes}p (${dmy} ${row.schedule_time}): ${row.title}`,
      messagePreview: textMsg.slice(0, 260),
      status: anyOk ? "sent" : "queued_manual_zalo",
      dedupeKey,
      actorName: `Tự động trước ${leadMinutes} phút`,
    });
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

async function checkAndDispatchDueRecurringReports(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<number> {
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
    fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_config_v1&select=value`, {
      headers,
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.zalo_oa_followers_v1&select=value`, {
      headers,
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(
      `${supabaseUrl}/rest/v1/portal_settings?key=eq.notification_dispatch_logs_v1&select=value`,
      { headers }
    ).then((r) => (r.ok ? r.json() : [])),
    fetch(`${supabaseUrl}/rest/v1/recurring_reminders?select=id,title,payload`, {
      headers,
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(`${supabaseUrl}/rest/v1/portal_settings?key=eq.cadre_zalo_mapping_v1&select=value`, {
      headers,
    }).then((r) => (r.ok ? r.json() : [])),
  ]);

  const cfg = cfgRows?.[0]?.value || {};
  const accessToken = String(cfg.accessToken || process.env.ZALO_OA_ACCESS_TOKEN || "").trim();
  if (!accessToken) return 0;

  const followers: any[] = Array.isArray(followerRows?.[0]?.value) ? followerRows[0].value : [];
  const cadreMapping: Record<string, any> = mapRows?.[0]?.value || {};
  const logs: any[] = Array.isArray(logRows?.[0]?.value) ? logRows[0].value : [];
  const dedupeSet = new Set(logs.filter((l) => l?.dedupeKey).map((l) => String(l.dedupeKey)));
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
      if (minsLeft > 0 && minsLeft <= 60) {
        stage = "due_60m";
        urgencyLabel = `⏰ CÒN ${minsLeft} PHÚT ĐẾN HẠN NỘP`;
      }
    }

    if (!stage) continue;

    const dedupeKey = `rpt_auto:${row.id}:${nextDue}:${stage}`;
    if (dedupeSet.has(dedupeKey)) continue;

    const personName = String(p.responsiblePerson?.name || "").trim();
    const targetUids = matchCadreFollowers(
      personName ? [personName] : [],
      `${personName} ${p.responsiblePerson?.role || ""} ${p.responsibleUnit || ""}`,
      followers,
      cadreMapping
    );

    const dueFormatted = nextDue.split("-").reverse().join("/");
    const textMsg = [
      `📋 [TỰ ĐỘNG NHẮC BÁO CÁO ĐỊNH KỲ KP3 — ${urgencyLabel}]`,
      `Kính gửi đồng chí ${personName || p.responsibleUnit || "Cán bộ KP3"},`,
      `• Báo cáo: ${p.title || row.title}`,
      `• Cơ quan nhận: ${p.recipientOrg || "Phường An Phú"}`,
      `• Hạn nộp: ${timeStr} ngày ${dueFormatted}`,
      `Đề nghị đồng chí hoàn thành và cập nhật trạng thái nộp trên hệ thống.`,
      `👉 https://bdhkp3.vercel.app/dashboard/tasks`,
    ].join("\n");

    let anyOk = false;
    for (const zaloUid of targetUids) {
      const r = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
        method: "POST",
        headers: {
          access_token: accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { user_id: zaloUid },
          message: { text: textMsg },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.error === 0) {
        anyOk = true;
        sent++;
      }
    }

    dedupeSet.add(dedupeKey);
    newLogs.push({
      id: `NTF-RPT-AUTO-${Date.now()}-${row.id}`,
      timestamp: new Date().toISOString(),
      channel: anyOk ? "zalo_oa" : "outbox_ready",
      notificationType: "recurring_report_reminder",
      recipientName: personName || p.responsibleUnit || "Cán bộ KP3",
      recipientRole: "cadre",
      subject: `Tự động nhắc báo cáo định kỳ (${dueFormatted} ${timeStr}): ${p.title || row.title}`,
      messagePreview: textMsg.slice(0, 260),
      status: anyOk ? "sent" : "queued_manual_zalo",
      dedupeKey,
      actorName: "Tự động nhắc báo cáo định kỳ",
    });
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

  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const authHeader = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const hasCronHeader = Boolean(req?.headers?.["x-vercel-cron"]);
  const isVercelCron = cronSecret
    ? hasCronHeader && authHeader === `Bearer ${cronSecret}`
    : hasCronHeader;
  const nowMs = Date.now();

  // Chống spam liên tục trên cùng một warm instance (nhưng luôn chạy thật với Vercel Cron)
  if (
    !isVercelCron &&
    lastCachedResult &&
    nowMs - lastVerifiedAtMs < MIN_DB_QUERY_INTERVAL_MS
  ) {
    return res.status(200).json({
      ...lastCachedResult,
      throttled: true,
      checkedAt: new Date(nowMs).toISOString(),
    });
  }

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

  if (!anonKey) {
    return res.status(503).json({
      ok: false,
      service: "kp3-an-phu-keepalive",
      error: "Missing VITE_SUPABASE_ANON_KEY environment variable",
      checkedAt: new Date(nowMs).toISOString(),
    });
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const queryUrl = `${supabaseUrl}/rest/v1/portal_settings?select=key,updated_at&limit=2`;
    const dbRes = await fetch(queryUrl, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

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

    // Kiểm tra tự động nhắc lịch họp Cán bộ trước 60 phút & Báo cáo định kỳ (tối đa 5 phút/lần, chống trùng nhờ dedupeKey)
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const isScheduledProbe =
      isVercelCron ||
      String(req?.url || "").includes("check_meetings=1") ||
      String(req?.query?.check_meetings || "") === "1";
    let meetingsSent = 0;
    let reportsSent = 0;

    if (
      serviceRoleKey &&
      (isScheduledProbe || Date.now() - lastMeeting60mCheckAtMs >= MIN_MEETING_60M_CHECK_MS)
    ) {
      lastMeeting60mCheckAtMs = Date.now();
      try {
        meetingsSent = await checkAndDispatchDue60mMeetings(supabaseUrl, serviceRoleKey);
        if (meetingsSent > 0) {
          mode += `+zalo-60m-sent(${meetingsSent})`;
        }
      } catch {
        // Không làm gián đoạn keepalive chính
      }
      try {
        reportsSent = await checkAndDispatchDueRecurringReports(supabaseUrl, serviceRoleKey);
        if (reportsSent > 0) {
          mode += `+zalo-report-sent(${reportsSent})`;
        }
      } catch {
        // Không làm gián đoạn keepalive chính
      }
    }

    // Ghi mốc thời gian heartbeat khi nhận trigger từ Vercel Cron hoặc GitHub Actions (?check_meetings=1)
    if (
      serviceRoleKey &&
      isScheduledProbe &&
      Date.now() - lastHeartbeatWriteAtMs >= MIN_HEARTBEAT_WRITE_INTERVAL_MS
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
              source: isVercelCron ? "vercel-cron" : "github-actions-15m",
              latency_ms: latencyMs,
              meetings_sent: meetingsSent,
              reports_sent: reportsSent,
              pinged_at: new Date().toISOString(),
            },
            is_public: false,
            updated_at: new Date().toISOString(),
          }),
          signal: controller.signal,
        }
      );
      if (hbRes.ok) {
        mode += "+heartbeat-upsert";
      }

      // Kiểm tra và kích hoạt lịch nhắc gia hạn tạm trú tự động trước 15 ngày (mỗi ngày 1 lần khi Vercel Cron chạy)
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
            signal: controller.signal,
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
                  appId: cfgVal.appId || "4453251256582720991",
                  autoRemind15dEnabled: cfgVal.autoRemind15dEnabled !== false,
                  remindDaysThreshold: cfgVal.remindDaysThreshold || 15,
                  lastAutoRemindDate: todayIso,
                },
                is_public: false,
                updated_at: new Date().toISOString(),
              }),
              signal: controller.signal,
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
  } finally {
    clearTimeout(timeoutId);
  }
}
