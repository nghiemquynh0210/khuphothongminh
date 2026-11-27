import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  AdministrativeForm,
  Association,
  Business,
  CommunityEvent,
  EmergencySupportRecord,
  FundCategory,
  Household,
  LandingConfig,
  LocalNews,
  RecurringReminder,
  Resident,
  ScheduleEvent,
  TaskItem,
  WelfareCampaign,
  WelfareRecipient,
  WelfareSubCategory,
} from "../types";
import { PartyResolution } from "../components/PartyBranch";

export interface VerifiedStaffSession {
  userId: string;
  email: string;
  username: string;
  fullName: string;
  role: "admin" | "cadre";
  phone: string;
}

/**
 * Kiểm tra phiên Supabase Auth hiện tại và xác nhận tài khoản đã được duyệt công tác trong user_profiles.
 */
export async function getVerifiedStaffSession(): Promise<VerifiedStaffSession | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: sessionRes, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      try {
        localStorage.removeItem("kp3_auth_user");
      } catch {}
      return null;
    }
    const authUser = sessionRes?.session?.user;
    if (!authUser) return null;

    const { data: profile } = await (supabase as any)
      .from("user_profiles")
      .select("id, email, full_name, phone, role, approval_status")
      .eq("id", authUser.id)
      .maybeSingle();

    if (
      profile &&
      (profile.role === "admin" || profile.role === "cadre") &&
      profile.approval_status === "approved"
    ) {
      return {
        userId: profile.id,
        email: profile.email,
        username: profile.email?.split("@")[0] || "canbo",
        fullName: profile.full_name || "Cán bộ Khu phố 3",
        role: profile.role,
        phone: profile.phone || "",
      };
    }
  } catch {
    // Ignore transient auth read errors
  }
  return null;
}

// ============================================================================
// 1. PORTAL SETTINGS (KV JSONB): landing_config, gis_config, area_scopes, fund_categories
// ============================================================================

export async function loadPortalSetting<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("portal_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (!error && data && data.value !== undefined) {
      return data.value as T;
    }
  } catch {}
  return null;
}

export async function savePortalSetting<T>(
  key: string,
  value: T,
  isPublic: boolean = false
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await (supabase as any)
      .from("portal_settings")
      .upsert(
        {
          key,
          value,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    return !error;
  } catch {
    return false;
  }
}

export interface GisPersistedConfig {
  boundaryCoords?: { lat: number; lng: number }[];
  boundaryStyle?: {
    color: string;
    weight: number;
    dashArray: string;
    fillColor: string;
    fillOpacity: number;
  };
  customPins?: any[];
}

export const DEFAULT_LANDING_CONFIG_KEY = "landing_config";
export const GIS_CONFIG_KEY = "gis_config";
export const AREA_SCOPES_KEY = "area_permission_scopes";
export const FUND_CATEGORIES_KEY = "fund_categories";

export async function saveLandingConfigToDb(config: LandingConfig): Promise<void> {
  // Bảo vệ dữ liệu cá nhân (NĐ 13/2023/NĐ-CP): Tuyệt đối không ghi số CCCD 12 chữ số ra cấu hình công khai is_public = true
  const sanitized: LandingConfig = {
    ...config,
    leadership: Array.isArray(config.leadership)
      ? config.leadership.map(({ cccd: _ignoredCccd, ...rest }) => rest)
      : config.leadership,
  };
  await savePortalSetting(DEFAULT_LANDING_CONFIG_KEY, sanitized, true);
}

export async function loadFundCategoriesFromDb(): Promise<FundCategory[] | null> {
  const data = await loadPortalSetting<FundCategory[]>(FUND_CATEGORIES_KEY);
  return Array.isArray(data) && data.length > 0 ? data : null;
}

export async function saveFundCategoriesToDb(categories: FundCategory[]): Promise<void> {
  await savePortalSetting(FUND_CATEGORIES_KEY, categories, true);
}

// ============================================================================
// 2. COMMUNITY NEWS (FULL RICH FIELDS & LINKS)
// ============================================================================

export function mapDbNewsToLocal(n: any): LocalNews {
  const meta = (n.metadata && typeof n.metadata === "object" ? n.metadata : {}) as Record<string, any>;
  const isFromZalo = Boolean(meta.is_from_zalo || meta.zalo_article_id);
  const zaloLink = meta.zalo_link_view || n.external_url || undefined;

  let links = Array.isArray(meta.links) && meta.links.length > 0
    ? meta.links
    : n.external_url
      ? [{ id: "EXT-1", label: isFromZalo ? "Xem bài gốc trên Zalo OA" : "Liên kết đính kèm", url: n.external_url }]
      : undefined;

  if (isFromZalo && zaloLink && (!links || !links.some((l: any) => l.url === zaloLink))) {
    links = [
      ...(links || []),
      { id: "ZALO-OA-1", label: "Xem bài gốc trên Zalo OA", url: zaloLink },
    ];
  }

  return {
    id: n.id,
    title: n.title,
    category: n.category || "Thông báo",
    content: n.content || "",
    summary: n.summary || meta.summary || undefined,
    author: n.author_name || (isFromZalo ? "Zalo OA Ban Điều Hành" : "Ban Điều hành KP3"),
    date: n.created_at
      ? new Date(n.created_at).toLocaleDateString("vi-VN")
      : new Date().toLocaleDateString("vi-VN"),
    isPinned: Boolean(n.is_pinned),
    imageUrl: n.image_url || undefined,
    image: n.image_url || undefined,
    imageGallery: Array.isArray(n.attachments)
      ? n.attachments
      : Array.isArray(meta.imageGallery)
        ? meta.imageGallery
        : undefined,
    links,
    attachedFile: meta.attachedFile || undefined,
    readTime: meta.readTime || undefined,
    views: typeof meta.views === "number" ? meta.views : undefined,
    zaloArticleId: meta.zalo_article_id || undefined,
    zaloLinkView: zaloLink,
    isFromZalo,
  };
}

export function serializeLocalNewsToDb(news: LocalNews) {
  return {
    title: news.title,
    category: news.category,
    content: news.content,
    summary: news.summary || null,
    author_name: news.author,
    is_pinned: news.isPinned ?? false,
    is_urgent: news.category === "Thông báo khẩn",
    image_url: news.imageUrl || news.image || null,
    external_url: news.zaloLinkView || news.links?.[0]?.url || null,
    attachments: news.imageGallery || [],
    metadata: {
      links: news.links || [],
      attachedFile: news.attachedFile || null,
      readTime: news.readTime || null,
      views: news.views ?? 0,
      zalo_article_id: news.zaloArticleId || null,
      zalo_link_view: news.zaloLinkView || null,
      is_from_zalo: news.isFromZalo ?? false,
    },
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// 3. COMMUNITY EVENTS & ADMINISTRATIVE FORMS
// ============================================================================

export async function loadCommunityEventsFromDb(): Promise<CommunityEvent[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("community_events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      organizer: row.organizer,
      dateTime: row.date_time,
      location: row.location,
      status: row.status || "Sắp diễn ra",
      expectedAttendees: Number(row.expected_attendees) || 0,
      description: row.description || "",
      imageUrl: row.image_url || undefined,
    }));
  } catch {
    return null;
  }
}

export async function upsertCommunityEventToDb(ev: CommunityEvent): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any).from("community_events").upsert({
      id: ev.id,
      title: ev.title,
      organizer: ev.organizer,
      date_time: ev.dateTime,
      location: ev.location,
      status: ev.status,
      expected_attendees: ev.expectedAttendees || 0,
      description: ev.description || "",
      image_url: ev.imageUrl || null,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function deleteCommunityEventFromDb(eventId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any).from("community_events").delete().eq("id", eventId);
  } catch {}
}

const KP3_FORM_FILE_META_REGEX = /^<!--KP3_FILE_META:(.*?)-->\n?/;

export async function loadAdministrativeFormsFromDb(): Promise<AdministrativeForm[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("administrative_forms")
      .select("*")
      .order("code", { ascending: true });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => {
      let rawTemplate = String(row.template_content || "");
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      const metaMatch = rawTemplate.match(KP3_FORM_FILE_META_REGEX);
      if (metaMatch) {
        try {
          const parsed = JSON.parse(metaMatch[1]);
          fileUrl = parsed.fileUrl || undefined;
          fileName = parsed.fileName || undefined;
        } catch {}
        rawTemplate = rawTemplate.replace(KP3_FORM_FILE_META_REGEX, "");
      }
      return {
        id: row.id,
        code: row.code,
        title: row.title,
        category: row.category,
        issuingBody: row.issuing_body,
        description: row.description || "",
        requiredDocuments: Array.isArray(row.required_documents) ? row.required_documents : [],
        processingTime: row.processing_time || "",
        fee: row.fee || "Miễn phí",
        fileFormat: row.file_format || "DOCX",
        fileSize: row.file_size || "120 KB",
        downloadCount: Number(row.download_count) || 0,
        templateContent: rawTemplate,
        fileUrl,
        fileName,
      };
    });
  } catch {
    return null;
  }
}

export async function upsertAdministrativeFormToDb(form: AdministrativeForm): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const cleanTemplate = String(form.templateContent || "").replace(KP3_FORM_FILE_META_REGEX, "");
    const encodedTemplate =
      form.fileUrl || form.fileName
        ? `<!--KP3_FILE_META:${JSON.stringify({
            fileUrl: form.fileUrl,
            fileName: form.fileName,
          })}-->\n${cleanTemplate}`
        : cleanTemplate;

    await (supabase as any).from("administrative_forms").upsert({
      id: form.id,
      code: form.code,
      title: form.title,
      category: form.category,
      issuing_body: form.issuingBody,
      description: form.description || "",
      required_documents: form.requiredDocuments || [],
      processing_time: form.processingTime || "",
      fee: form.fee || "Miễn phí",
      file_format: form.fileFormat || "DOCX",
      file_size: form.fileSize || "120 KB",
      download_count: form.downloadCount || 0,
      template_content: encodedTemplate,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function deleteAdministrativeFormFromDb(formId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any).from("administrative_forms").delete().eq("id", formId);
  } catch {}
}

// ============================================================================
// 4. TASKS, WORK SCHEDULES & RECURRING REMINDERS (STAFF ONLY)
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadTasksFromDb(): Promise<TaskItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || "",
      unit: row.unit || row.role || "Ban Điều hành Khu phố 3",
      associationId: row.association_id || undefined,
      assignee: {
        name: row.assignee || "Ban Điều hành KP3",
        role: row.assignee_role || row.role || "Cán bộ phụ trách",
        unit: row.unit || "Ban Điều hành Khu phố 3",
      },
      creator: row.creator || "Ban Điều hành KP3",
      priority: row.priority || "Trung bình",
      status:
        row.status === "Chưa bắt đầu" ? "Chờ xử lý" : row.status || "Chờ xử lý",
      progressPercent: Number(row.progress_percent) || 0,
      startDate: row.start_date || (row.created_at ? String(row.created_at).slice(0, 10) : "2026-10-15"),
      deadline: row.due_date || "2026-11-30",
      notes: row.notes || undefined,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      proofImages: Array.isArray(row.proof_images) ? row.proof_images : [],
    }));
  } catch {
    return null;
  }
}

export async function loadTaskByIdFromDb(taskId: string): Promise<TaskItem | null> {
  if (!isSupabaseConfigured || !supabase || !taskId) return null;
  try {
    const cleanId = taskId.trim();
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select("*")
      .eq("id", cleanId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      unit: data.unit || data.role || "Ban Điều hành Khu phố 3",
      associationId: data.association_id || undefined,
      assignee: {
        name: data.assignee || "Ban Điều hành KP3",
        role: data.assignee_role || data.role || "Cán bộ phụ trách",
        unit: data.unit || "Ban Điều hành Khu phố 3",
        phone: data.assignee_phone || undefined,
      },
      creator: data.creator || "Ban Điều hành KP3",
      priority: data.priority || "Trung bình",
      status:
        data.status === "Chưa bắt đầu" ? "Chờ xử lý" : data.status || "Chờ xử lý",
      progressPercent: Number(data.progress_percent) || 0,
      startDate: data.start_date || (data.created_at ? String(data.created_at).slice(0, 10) : "2026-10-15"),
      deadline: data.due_date || "2026-11-30",
      notes: data.notes || undefined,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      proofImages: Array.isArray(data.proof_images) ? data.proof_images : [],
    };
  } catch {
    return null;
  }
}

export async function syncTasksDiffToDb(prevTasks: TaskItem[], nextTasks: TaskItem[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const nextIds = new Set(nextTasks.map((t) => t.id));
    for (const prev of prevTasks) {
      if (!nextIds.has(prev.id) && UUID_REGEX.test(prev.id)) {
        await (supabase as any).from("tasks").delete().eq("id", prev.id);
      }
    }
    const prevMap = new Map(prevTasks.map((t) => [t.id, t]));
    for (const task of nextTasks) {
      const old = prevMap.get(task.id);
      if (old && JSON.stringify(old) === JSON.stringify(task)) continue;
      const payload = {
        title: task.title,
        assignee: task.assignee?.name || "Ban Điều hành KP3",
        role: task.unit || task.assignee?.role || "Ban Điều hành KP3",
        assignee_role: task.assignee?.role || task.unit,
        unit: task.unit,
        association_id: task.associationId || null,
        due_date: task.deadline,
        start_date: task.startDate,
        priority: task.priority,
        status: task.status,
        progress_percent: task.progressPercent ?? 0,
        description: task.description || "",
        creator: task.creator || "Ban Điều hành KP3",
        notes: task.notes || null,
        attachments: task.attachments || [],
        proof_images: task.proofImages || [],
        updated_at: new Date().toISOString(),
      };
      if (UUID_REGEX.test(task.id)) {
        await (supabase as any).from("tasks").upsert({ id: task.id, ...payload });
      } else {
        await (supabase as any).from("tasks").insert(payload);
      }
    }
  } catch {}
}

const SCHEDULE_META_SENTINEL_ID = "__KP3_SCHEDULE_META_V1__";

export async function loadSchedulesFromDb(): Promise<ScheduleEvent[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("work_schedules")
      .select("*")
      .order("schedule_date", { ascending: false });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => {
      const rawAtts = Array.isArray(row.attachments) ? row.attachments : [];
      const metaEntry = rawAtts.find((a: any) => a && a.id === SCHEDULE_META_SENTINEL_ID);
      const pureAtts = rawAtts.filter((a: any) => !a || a.id !== SCHEDULE_META_SENTINEL_ID);
      const ext = metaEntry?.meta && typeof metaEntry.meta === "object" ? metaEntry.meta : {};

      return {
        id: row.id,
        title: row.title,
        type: row.event_type,
        date: row.schedule_date,
        time: row.schedule_time,
        sessionPeriod: ext.sessionPeriod,
        location: row.location || "",
        host: row.host || "",
        attendees: row.attendees || "",
        status: row.status || "Sắp diễn ra",
        notes: row.notes || undefined,
        description: row.description || undefined,
        content: row.content || undefined,
        attachments: pureAtts,
        sourceLevel: ext.sourceLevel,
        sourceDocNumber: ext.sourceDocNumber,
        relevanceTier: ext.relevanceTier,
        assignedOfficers: Array.isArray(ext.assignedOfficers) ? ext.assignedOfficers : undefined,
        originalDate: ext.originalDate,
        originalTime: ext.originalTime,
        originalLocation: ext.originalLocation,
        rescheduleCount: typeof ext.rescheduleCount === "number" ? ext.rescheduleCount : undefined,
        lastRescheduleReason: ext.lastRescheduleReason,
        adjustmentLogs: Array.isArray(ext.adjustmentLogs) ? ext.adjustmentLogs : undefined,
        linkedTaskIds: Array.isArray(ext.linkedTaskIds) ? ext.linkedTaskIds : undefined,
        isPublicCitizenVisible: ext.isPublicCitizenVisible,
      } as ScheduleEvent;
    });
  } catch {
    return null;
  }
}

export async function syncSchedulesToDb(prevList: ScheduleEvent[], nextList: ScheduleEvent[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const nextIds = new Set(nextList.map((s) => s.id));
    for (const old of prevList) {
      if (!nextIds.has(old.id)) {
        await (supabase as any).from("work_schedules").delete().eq("id", old.id);
      }
    }
    const rows = nextList.map((s) => {
      const pureAtts = (s.attachments || []).filter((a: any) => !a || a.id !== SCHEDULE_META_SENTINEL_ID);
      const metaPayload = {
        sessionPeriod: s.sessionPeriod,
        sourceLevel: s.sourceLevel,
        sourceDocNumber: s.sourceDocNumber,
        relevanceTier: s.relevanceTier,
        assignedOfficers: s.assignedOfficers,
        originalDate: s.originalDate,
        originalTime: s.originalTime,
        originalLocation: s.originalLocation,
        rescheduleCount: s.rescheduleCount,
        lastRescheduleReason: s.lastRescheduleReason,
        adjustmentLogs: s.adjustmentLogs,
        linkedTaskIds: s.linkedTaskIds,
        isPublicCitizenVisible: s.isPublicCitizenVisible,
      };
      const hasMeta = Object.values(metaPayload).some((v) => v !== undefined);
      const serializedAtts = hasMeta
        ? [
            ...pureAtts,
            {
              id: SCHEDULE_META_SENTINEL_ID,
              name: "__schedule_meta__",
              size: "0 B",
              type: "other",
              url: "",
              uploadedAt: new Date().toISOString(),
              meta: metaPayload,
            },
          ]
        : pureAtts;

      return {
        id: s.id,
        title: s.title,
        event_type: s.type,
        schedule_date: s.date,
        schedule_time: s.time,
        location: s.location || "",
        host: s.host || "",
        attendees: s.attendees || "",
        status: s.status,
        notes: s.notes || null,
        description: s.description || null,
        content: s.content || null,
        attachments: serializedAtts,
      };
    });
    if (rows.length > 0) {
      await (supabase as any).from("work_schedules").upsert(rows, { onConflict: "id" });
    }
  } catch {}
}

export async function loadRemindersFromDb(): Promise<RecurringReminder[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("recurring_reminders")
      .select("payload")
      .order("updated_at", { ascending: false });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => row.payload as RecurringReminder);
  } catch {
    return null;
  }
}

export async function syncRemindersToDb(prevList: RecurringReminder[], nextList: RecurringReminder[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const nextIds = new Set(nextList.map((r) => r.id));
    for (const old of prevList) {
      if (!nextIds.has(old.id)) {
        await (supabase as any).from("recurring_reminders").delete().eq("id", old.id);
      }
    }
    const rows = nextList.map((r) => ({
      id: r.id,
      title: r.title,
      payload: r,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      await (supabase as any).from("recurring_reminders").upsert(rows, { onConflict: "id" });
    }
  } catch {}
}

// ============================================================================
// 5. WELFARE & ASSOCIATIONS BUNDLES (STAFF ONLY)
// ============================================================================

export async function loadWelfareRecord<T>(key: "recipients" | "subcategories" | "campaigns" | "emergency"): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("welfare_records")
      .select("payload")
      .eq("key", key)
      .maybeSingle();
    if (!error && data?.payload !== undefined) return data.payload as T;
  } catch {}
  return null;
}

export async function saveWelfareRecord<T>(
  key: "recipients" | "subcategories" | "campaigns" | "emergency",
  payload: T
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any).from("welfare_records").upsert(
      { key, payload, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {}
}

export type WelfareBundle = {
  recipients?: WelfareRecipient[];
  subcategories?: WelfareSubCategory[];
  campaigns?: WelfareCampaign[];
  emergency?: EmergencySupportRecord[];
};

export async function loadAssociationRecord<T>(key: "associations" | "party_resolutions" | "association_roles"): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("associations_records")
      .select("payload")
      .eq("key", key)
      .maybeSingle();
    if (!error && data?.payload !== undefined) return data.payload as T;
  } catch {}
  return null;
}

export async function saveAssociationRecord<T>(
  key: "associations" | "party_resolutions" | "association_roles",
  payload: T
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any).from("associations_records").upsert(
      { key, payload, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {}
}

export type AssociationBundle = {
  associations?: Association[];
  resolutions?: PartyResolution[];
};

// ============================================================================
// 6. PUBLIC AGGREGATE STATS & CADASTRAL / TIMEMARK CLOUD PERSISTENCE (GÓI 01 & 02)
// ============================================================================

export const PUBLIC_KP3_STATS_KEY = "public_kp3_stats";
export const BUSINESS_EXTENDED_META_KEY = "business_extended_meta";
export const RESIDENT_EXTENDED_META_KEY = "resident_extended_meta";
const KP3_HOUSEHOLD_META_PREFIX = "__kp3_meta__:";

export interface PublicKp3Stats {
  households_count: number;
  residents_count: number;
  permanent_count: number;
  temporary_count: number;
  businesses_count: number;
  updated_at?: string;
}

export async function loadPublicKp3StatsFromDb(): Promise<PublicKp3Stats | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any).rpc("get_public_kp3_stats");
    if (!error && data && typeof data === "object" && typeof data.residents_count === "number") {
      return data as PublicKp3Stats;
    }
  } catch {}
  return loadPortalSetting<PublicKp3Stats>(PUBLIC_KP3_STATS_KEY);
}

export async function savePublicKp3StatsToDb(stats: PublicKp3Stats): Promise<void> {
  await savePortalSetting(
    PUBLIC_KP3_STATS_KEY,
    { ...stats, updated_at: new Date().toISOString() },
    true
  );
}

// ============================================================================
// 6A. RESIDENTS 2-WAY CLOUD CRUD SYNC + EXTENDED DEMOGRAPHIC/FOREIGNER META
// ============================================================================

export function extractResidentExtendedMeta(r: Resident): Record<string, any> {
  const ext: Record<string, any> = {};
  const keys: (keyof Resident)[] = [
    "avatar",
    "ethnicity",
    "religion",
    "hometown",
    "education",
    "maritalStatus",
    "idIssueDate",
    "idIssuePlace",
    "healthInsuranceNumber",
    "militaryServiceStatus",
    "policyGroup",
    "emergencyContact",
    "notes",
    "isForeigner",
    "passportNumber",
    "passportExpiryDate",
    "visaOrCardType",
    "visaOrCardNumber",
    "visaValidFrom",
    "visaValidUntil",
    "temporaryRegistrationCode",
    "temporaryRegistrationDate",
    "temporaryRegistrationStatus",
    "workPermitNumber",
    "sponsoringOrganization",
    "landlordContact",
  ];
  for (const k of keys) {
    const val = r[k];
    if (val !== undefined && val !== "" && val !== "Chưa cập nhật") {
      ext[k] = val;
    }
  }
  return ext;
}

export function applyResidentExtendedMeta(
  base: Resident,
  registry?: Record<string, Record<string, any>> | null
): Resident {
  if (!registry) return base;
  const meta = registry[base.id] || (base.cccd ? registry[base.cccd] : undefined);
  if (!meta || typeof meta !== "object") return base;
  return { ...base, ...meta };
}

function toIsoBirthDateOrNull(raw?: string | null): string | null {
  const s = String(raw || "").trim();
  if (!s || s === "Chưa cập nhật") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    return isNaN(Date.parse(iso)) ? null : iso;
  }
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      const [d, m, yRaw] = parts;
      let y = (yRaw || "").trim();
      if (y.length === 2) y = (parseInt(y, 10) <= 30 ? "20" : "19") + y;
      const iso = `${y}-${m.trim().padStart(2, "0")}-${d.trim().padStart(2, "0")}`;
      const [yy, mm, dd] = iso.split("-").map(Number);
      const dt = new Date(Date.UTC(yy, mm - 1, dd));
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(iso) &&
        dt.getUTCFullYear() === yy &&
        dt.getUTCMonth() + 1 === mm &&
        dt.getUTCDate() === dd
      ) {
        return iso;
      }
    }
  }
  if (/^\d{4}$/.test(s)) {
    return `${s}-01-01`;
  }
  return null;
}

function buildResidentDbRow(r: Resident): Record<string, any> {
  const birthYearMatch = String(r.birthDate || "").match(/(\d{4})/);
  const birthYear = birthYearMatch ? Number(birthYearMatch[1]) : 0;
  const age = birthYear > 1900 ? new Date().getFullYear() - birthYear : 0;
  const pgLower = String(r.policyGroup || "").toLowerCase();

  const row: Record<string, any> = {
    household_code: r.householdId || null,
    full_name: r.fullName,
    cccd: r.cccd,
    gender: r.gender || "Nam",
    birth_date: toIsoBirthDateOrNull(r.birthDate),
    phone: r.phone && r.phone !== "N/A" ? r.phone : null,
    address: r.address || r.currentAddress || r.permanentAddress || "",
    relation_to_owner: r.relationToOwner || "Thành viên",
    owner_name: r.ownerName || null,
    status: r.status || "Thường trú",
    occupation: r.occupation && r.occupation !== "Chưa cập nhật" ? r.occupation : null,
    workplace: r.workplace && r.workplace !== "Chưa cập nhật" ? r.workplace : null,
    nationality: r.nationality || "Việt Nam",
    permanent_address: r.permanentAddress || null,
    current_address: r.currentAddress || r.temporaryAddress || r.address || null,
    father_name: r.fatherName && r.fatherName !== "Chưa cập nhật" ? r.fatherName : null,
    mother_name: r.motherName && r.motherName !== "Chưa cập nhật" ? r.motherName : null,
    temporary_reg_date: r.temporaryRegDate || null,
    temporary_exp_date: r.temporaryExpDate || null,
    management_status: r.managementStatus || "Bình thường",
    is_elderly: age >= 60 || pgLower.includes("cao tuổi"),
    is_party_member: pgLower.includes("đảng viên"),
    is_policy_household: pgLower.includes("chính sách") || pgLower.includes("thương binh") || pgLower.includes("người có công"),
    is_poor_household: pgLower.includes("hộ nghèo") || pgLower.includes("cận nghèo"),
    updated_at: new Date().toISOString(),
  };

  if (UUID_REGEX.test(r.id)) {
    row.id = r.id;
  }
  return row;
}

export async function upsertResidentToDb(r: Resident): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const row = buildResidentDbRow(r);
    const conflictTarget = UUID_REGEX.test(r.id) ? "id" : "cccd";
    const { error } = await (supabase as any)
      .from("residents")
      .upsert(row, { onConflict: conflictTarget });

    const ext = extractResidentExtendedMeta(r);
    if (Object.keys(ext).length > 0) {
      const existing =
        (await loadPortalSetting<Record<string, any>>(RESIDENT_EXTENDED_META_KEY)) || {};
      const key = r.cccd || r.id;
      await savePortalSetting(
        RESIDENT_EXTENDED_META_KEY,
        { ...existing, [key]: ext },
        false
      );
    }
    return !error;
  } catch {
    return false;
  }
}

export async function deleteResidentFromDb(id: string, cccd?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    if (UUID_REGEX.test(id)) {
      const { error } = await (supabase as any).from("residents").delete().eq("id", id);
      return !error;
    }
    if (cccd) {
      const { error } = await (supabase as any).from("residents").delete().eq("cccd", cccd);
      return !error;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Đồng bộ khác biệt danh sách cư dân theo O(N) tham chiếu bộ nhớ (`old !== item`),
 * tránh gọi JSON.stringify trên 11.632 bản ghi không thay đổi.
 */
export async function syncResidentsDiffToDb(
  prevList: Resident[],
  nextList: Resident[]
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (prevList === nextList) return;
  try {
    const nextIds = new Set(nextList.map((r) => r.id));
    for (const old of prevList) {
      if (!nextIds.has(old.id)) {
        await deleteResidentFromDb(old.id, old.cccd);
      }
    }

    const prevMap = new Map(prevList.map((r) => [r.id, r]));
    const changed = nextList.filter((item) => {
      const old = prevMap.get(item.id);
      return !old || old !== item;
    });

    if (changed.length === 0 || changed.length > 500) return;

    const batchWithUuid = changed.filter((r) => UUID_REGEX.test(r.id)).map(buildResidentDbRow);
    const byCccdMap = new Map<string, Record<string, any>>();
    for (const r of changed) {
      if (!UUID_REGEX.test(r.id) && r.cccd) {
        byCccdMap.set(r.cccd.trim(), buildResidentDbRow(r));
      }
    }
    const batchByCccd = Array.from(byCccdMap.values());

    if (batchWithUuid.length > 0) {
      await (supabase as any).from("residents").upsert(batchWithUuid, { onConflict: "id" });
    }
    if (batchByCccd.length > 0) {
      await (supabase as any).from("residents").upsert(batchByCccd, { onConflict: "cccd" });
    }

    const extPatch: Record<string, any> = {};
    for (const r of changed) {
      const ext = extractResidentExtendedMeta(r);
      if (Object.keys(ext).length > 0) {
        extPatch[r.cccd || r.id] = ext;
      }
    }
    if (Object.keys(extPatch).length > 0) {
      const existing =
        (await loadPortalSetting<Record<string, any>>(RESIDENT_EXTENDED_META_KEY)) || {};
      await savePortalSetting(
        RESIDENT_EXTENDED_META_KEY,
        { ...existing, ...extPatch },
        false
      );
    }
  } catch {}
}

// ============================================================================
// 6B. HOUSEHOLDS & BUSINESSES 2-WAY CLOUD PERSISTENCE
// ============================================================================

export function extractHouseholdMeta(h: Household) {
  const cadastral_meta: Record<string, any> = {};
  if (h.toBanDo !== undefined) cadastral_meta.toBanDo = h.toBanDo;
  if (h.soThua !== undefined) cadastral_meta.soThua = h.soThua;
  if (h.dienTich !== undefined) cadastral_meta.dienTich = h.dienTich;
  if (h.loaiDat !== undefined) cadastral_meta.loaiDat = h.loaiDat;
  if (h.tenChuSuDung !== undefined) cadastral_meta.tenChuSuDung = h.tenChuSuDung;
  if (h.soGcn !== undefined) cadastral_meta.soGcn = h.soGcn;
  if (h.soVaoSo !== undefined) cadastral_meta.soVaoSo = h.soVaoSo;
  if (h.ngayCapGcn !== undefined) cadastral_meta.ngayCapGcn = h.ngayCapGcn;
  if (h.soDoFile !== undefined) cadastral_meta.soDoFile = h.soDoFile;
  if (h.soDoOcrData !== undefined) cadastral_meta.soDoOcrData = h.soDoOcrData;
  if (h.landParcels !== undefined) cadastral_meta.landParcels = h.landParcels;
  if (h.type !== undefined) cadastral_meta.type = h.type;
  if (h.tempSubType !== undefined) cadastral_meta.tempSubType = h.tempSubType;
  if (h.hostelName !== undefined) cadastral_meta.hostelName = h.hostelName;
  if (h.hostelPhone !== undefined) cadastral_meta.hostelPhone = h.hostelPhone;
  if (h.ownerPermanentAddress !== undefined) cadastral_meta.ownerPermanentAddress = h.ownerPermanentAddress;
  if ((h as any).auditHistory !== undefined) cadastral_meta.auditHistory = (h as any).auditHistory;
  if ((h as any).deletedAt !== undefined) cadastral_meta.deletedAt = (h as any).deletedAt;

  const timemark_meta: Record<string, any> = {};
  if (h.houseImage !== undefined) timemark_meta.houseImage = h.houseImage;
  if (h.timemarkHash !== undefined) timemark_meta.timemarkHash = timemark_meta.timemarkHash ?? h.timemarkHash;
  if (h.timemarkVerified !== undefined) timemark_meta.timemarkVerified = h.timemarkVerified;
  if (h.photoElevation !== undefined) timemark_meta.photoElevation = h.photoElevation;
  if (h.photoDirection !== undefined) timemark_meta.photoDirection = h.photoDirection;
  if (h.photoTakenAt !== undefined) timemark_meta.photoTakenAt = h.photoTakenAt;

  return { cadastral_meta, timemark_meta };
}

export function hydrateHouseholdFromDbRow(row: any): Household {
  let noteEnvelope: { cadastral_meta?: any; timemark_meta?: any } = {};
  if (typeof row.notes === "string" && row.notes.startsWith(KP3_HOUSEHOLD_META_PREFIX)) {
    try {
      noteEnvelope = JSON.parse(row.notes.slice(KP3_HOUSEHOLD_META_PREFIX.length));
    } catch {}
  }

  const cad = {
    ...(noteEnvelope.cadastral_meta || {}),
    ...(row.cadastral_meta && typeof row.cadastral_meta === "object" ? row.cadastral_meta : {}),
  };
  const tm = {
    ...(noteEnvelope.timemark_meta || {}),
    ...(row.timemark_meta && typeof row.timemark_meta === "object" ? row.timemark_meta : {}),
  };

  const base: Household = {
    id: row.id,
    code: row.code,
    ownerName: row.owner_name,
    address: row.address,
    memberCount: row.member_count || 1,
    coordinates: row.coordinates || undefined,
    type: cad.type === "Tạm trú" ? "Tạm trú" : "Thường trú",
    members: [],
    toBanDo: cad.toBanDo,
    soThua: cad.soThua,
    dienTich: cad.dienTich,
    loaiDat: cad.loaiDat,
    tenChuSuDung: cad.tenChuSuDung,
    soGcn: cad.soGcn,
    soVaoSo: cad.soVaoSo,
    ngayCapGcn: cad.ngayCapGcn,
    soDoFile: cad.soDoFile,
    soDoOcrData: cad.soDoOcrData,
    landParcels: Array.isArray(cad.landParcels) ? cad.landParcels : undefined,
    houseImage: tm.houseImage,
    timemarkHash: tm.timemarkHash,
    timemarkVerified: tm.timemarkVerified,
    photoElevation: tm.photoElevation,
    photoDirection: tm.photoDirection,
    photoTakenAt: tm.photoTakenAt,
    tempSubType: cad.tempSubType,
    hostelName: cad.hostelName,
    hostelPhone: cad.hostelPhone,
    ownerPermanentAddress: cad.ownerPermanentAddress,
  };

  if (Array.isArray(cad.auditHistory)) {
    (base as any).auditHistory = cad.auditHistory;
  }
  if (cad.deletedAt) {
    (base as any).deletedAt = cad.deletedAt;
  }
  return base;
}

export async function syncHouseholdsDiffToDb(
  prevList: Household[],
  nextList: Household[]
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (prevList === nextList) return;
  try {
    const nextIds = new Set(nextList.map((h) => h.id));
    for (const old of prevList) {
      if (!nextIds.has(old.id) && UUID_REGEX.test(old.id)) {
        await (supabase as any).from("households").delete().eq("id", old.id);
      }
    }

    const prevMap = new Map(prevList.map((h) => [h.id || h.code, h]));
    const changed = nextList.filter((h) => {
      const old = prevMap.get(h.id || h.code);
      return !old || old !== h;
    });
    if (changed.length === 0 || changed.length > 500) return;

    for (const h of changed) {
      const { cadastral_meta, timemark_meta } = extractHouseholdMeta(h);
      const hasMeta =
        Object.keys(cadastral_meta).length > 0 || Object.keys(timemark_meta).length > 0;
      const ownerMember =
        h.members?.find((m) => m.relation === "Chủ hộ") || h.members?.[0];
      const corePayload: Record<string, any> = {
        code: h.code,
        owner_name: h.ownerName,
        owner_cccd: ownerMember?.cccd || "Chưa cập nhật",
        phone: ownerMember?.phone || null,
        address: h.address,
        member_count: h.memberCount || h.members?.length || 1,
        coordinates: h.coordinates || null,
        notes: hasMeta
          ? `${KP3_HOUSEHOLD_META_PREFIX}${JSON.stringify({ cadastral_meta, timemark_meta })}`
          : null,
        updated_at: new Date().toISOString(),
      };
      if (UUID_REGEX.test(h.id)) {
        corePayload.id = h.id;
      }

      const conflictTarget = UUID_REGEX.test(h.id) ? "id" : "code";
      await (supabase as any)
        .from("households")
        .upsert(corePayload, { onConflict: conflictTarget });
    }
  } catch {}
}

export function extractBusinessMeta(b: Business) {
  const cadastral_meta: Record<string, any> = {};
  const cadKeys: (keyof Business)[] = [
    "toBanDo",
    "soThua",
    "dienTich",
    "loaiDat",
    "mapUrl",
    "tenChuSuDung",
    "soGcn",
    "soVaoSo",
    "ngayCapGcn",
    "soDoFile",
    "giayPhepFile",
    "pcccFile",
    "soDoOcrData",
    "giayPhepOcrData",
    "issuingAuthority",
    "charterCapital",
    "licenseIssueDate",
    "landParcels",
    "linkedHouseholdCode",
    "linkedHouseholdCodes",
    "linkedHouseholdOwner",
    "premisesType",
    "premisesOwner",
    "streetArea",
    "enterpriseScale",
    "soTang",
    "giaThueTrungBinh",
    "startDate",
    "legalRepresentative",
    "legalRepPhone",
    "legalRepCccd",
    "legalRepEmail",
    "siteManager",
    "focalPointName",
    "focalPointPhone",
    "localWorkersCount",
    "temporaryWorkersCount",
    "foreignWorkersCount",
    "foreignWorkers",
    "supportNeeds",
    "supportNotes",
    "inspections",
    "changeHistory",
  ];

  for (const k of cadKeys) {
    if (b[k] !== undefined) {
      cadastral_meta[k] = b[k];
    }
  }

  const timemark_meta: Record<string, any> = {};
  if (b.images !== undefined) timemark_meta.images = b.images;
  if (b.timemarkHash !== undefined) timemark_meta.timemarkHash = b.timemarkHash;
  if (b.timemarkVerified !== undefined) timemark_meta.timemarkVerified = b.timemarkVerified;
  if (b.photoElevation !== undefined) timemark_meta.photoElevation = b.photoElevation;
  if (b.photoDirection !== undefined) timemark_meta.photoDirection = b.photoDirection;
  if (b.photoTakenAt !== undefined) timemark_meta.photoTakenAt = b.photoTakenAt;

  return { cadastral_meta, timemark_meta };
}

export function applyBusinessExtendedMeta(
  base: Business,
  row: any,
  fallbackRegistry?: Record<string, any> | null
): Business {
  const key = row?.internal_code || base.internalCode || base.id;
  const fallbackEntry = (key && fallbackRegistry?.[key]) || {};
  const cad = {
    ...(fallbackEntry.cadastral_meta || {}),
    ...(row?.cadastral_meta && typeof row.cadastral_meta === "object" ? row.cadastral_meta : {}),
  };
  const tm = {
    ...(fallbackEntry.timemark_meta || {}),
    ...(row?.timemark_meta && typeof row.timemark_meta === "object" ? row.timemark_meta : {}),
  };

  return {
    ...base,
    ...cad,
    landParcels: Array.isArray(cad.landParcels) ? cad.landParcels : base.landParcels,
    linkedHouseholdCodes: Array.isArray(cad.linkedHouseholdCodes)
      ? cad.linkedHouseholdCodes
      : base.linkedHouseholdCodes,
    inspections: Array.isArray(cad.inspections) ? cad.inspections : base.inspections,
    changeHistory: Array.isArray(cad.changeHistory) ? cad.changeHistory : base.changeHistory,
    foreignWorkers: Array.isArray(cad.foreignWorkers) ? cad.foreignWorkers : base.foreignWorkers,
    supportNeeds: Array.isArray(cad.supportNeeds) ? cad.supportNeeds : base.supportNeeds,
    enterpriseScale: cad.enterpriseScale ?? (row?.scale as any) ?? base.enterpriseScale,
    images: tm.images ?? base.images,
    timemarkHash: tm.timemarkHash ?? base.timemarkHash,
    timemarkVerified: tm.timemarkVerified ?? base.timemarkVerified,
    photoElevation: tm.photoElevation ?? base.photoElevation,
    photoDirection: tm.photoDirection ?? base.photoDirection,
    photoTakenAt: tm.photoTakenAt ?? base.photoTakenAt,
  };
}

export async function syncBusinessesDiffToDb(
  prevList: Business[],
  nextList: Business[],
  _households?: Household[]
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (prevList === nextList) return;
  try {
    const nextIds = new Set(nextList.map((b) => b.id));
    const newlyDeletedIdentifiers: string[] = [];

    for (const old of prevList) {
      if (!nextIds.has(old.id)) {
        newlyDeletedIdentifiers.push(old.id);
        if (old.internalCode) newlyDeletedIdentifiers.push(old.internalCode);
        if (old.name) newlyDeletedIdentifiers.push(`NAME:${old.name.trim().toLowerCase()}`);

        if (UUID_REGEX.test(old.id)) {
          await (supabase as any).from("businesses").delete().eq("id", old.id);
        } else if (old.internalCode) {
          await (supabase as any).from("businesses").delete().eq("internal_code", old.internalCode);
        } else {
          await (supabase as any).from("businesses").delete().eq("name", old.name);
        }
      }
    }

    const prevMap = new Map(prevList.map((b) => [b.id, b]));
    const changed = nextList.filter((b) => {
      const old = prevMap.get(b.id);
      return !old || old !== b;
    });

    if (changed.length === 0 && newlyDeletedIdentifiers.length === 0) return;

    const fallbackPatch: Record<string, { cadastral_meta: any; timemark_meta: any }> = {};

    for (const b of changed) {
      const internalCode =
        b.internalCode ||
        `HKD-KP3-${b.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || Date.now()}`;
      const { cadastral_meta, timemark_meta } = extractBusinessMeta(b);

      const corePayload: Record<string, any> = {
        internal_code: internalCode,
        name: b.name,
        tax_code: b.taxCode || "",
        business_type: b.businessType || b.type || "Hộ kinh doanh",
        industry_group: b.industryGroup || "Khác",
        owner_name: b.owner || "",
        phone: b.phone || "",
        address: b.address,
        license_number: b.licenseNumber || "",
        status: b.status || "Đang hoạt động",
        safety_certified: b.safetyCertified ?? true,
        employee_count: b.employeeCount || 1,
        image_url: b.image || null,
        coordinates: b.coordinates || null,
        is_accommodation: Boolean(b.isAccommodation),
        room_count: b.soPhong || 0,
        guest_count: b.soNguoiLuuTru || 0,
        pccc_passed: b.safetyCertified ?? true,
        scale: b.enterpriseScale || null,
        updated_at: new Date().toISOString(),
      };
      if (UUID_REGEX.test(b.id)) {
        corePayload.id = b.id;
      }

      await (supabase as any)
        .from("businesses")
        .upsert(corePayload, { onConflict: "internal_code" });

      if (
        Object.keys(cadastral_meta).length > 0 ||
        Object.keys(timemark_meta).length > 0
      ) {
        fallbackPatch[internalCode] = { cadastral_meta, timemark_meta };
      }
    }

    if (Object.keys(fallbackPatch).length > 0 || newlyDeletedIdentifiers.length > 0) {
      const existing =
        (await loadPortalSetting<Record<string, any>>(BUSINESS_EXTENDED_META_KEY)) || {};
      const prevDeleted: string[] = Array.isArray(existing.__deleted_ids__)
        ? existing.__deleted_ids__
        : [];
      const mergedDeleted = Array.from(new Set([...prevDeleted, ...newlyDeletedIdentifiers]));

      await savePortalSetting(
        BUSINESS_EXTENDED_META_KEY,
        {
          ...existing,
          ...fallbackPatch,
          __deleted_ids__: mergedDeleted,
        },
        false
      );
    }
  } catch {}
}

