import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  AdministrativeForm,
  Association,
  CommunityEvent,
  EmergencySupportRecord,
  FundCategory,
  LandingConfig,
  LocalNews,
  RecurringReminder,
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
    const { data: sessionRes } = await supabase.auth.getSession();
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
  isPublic: boolean = true
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
  await savePortalSetting(DEFAULT_LANDING_CONFIG_KEY, config, true);
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
  return {
    id: n.id,
    title: n.title,
    category: n.category || "Thông báo",
    content: n.content || "",
    summary: n.summary || meta.summary || undefined,
    author: n.author_name || "Ban Điều hành KP3",
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
    links: Array.isArray(meta.links)
      ? meta.links
      : n.external_url
        ? [{ id: "EXT-1", label: "Liên kết đính kèm", url: n.external_url }]
        : undefined,
    attachedFile: meta.attachedFile || undefined,
    readTime: meta.readTime || undefined,
    views: typeof meta.views === "number" ? meta.views : undefined,
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
    external_url: news.links?.[0]?.url || null,
    attachments: news.imageGallery || [],
    metadata: {
      links: news.links || [],
      attachedFile: news.attachedFile || null,
      readTime: news.readTime || null,
      views: news.views ?? 0,
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

export async function loadAdministrativeFormsFromDb(): Promise<AdministrativeForm[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("administrative_forms")
      .select("*")
      .order("code", { ascending: true });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => ({
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
      templateContent: row.template_content || "",
    }));
  } catch {
    return null;
  }
}

export async function upsertAdministrativeFormToDb(form: AdministrativeForm): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
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
      template_content: form.templateContent || "",
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

export async function loadSchedulesFromDb(): Promise<ScheduleEvent[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("work_schedules")
      .select("*")
      .order("schedule_date", { ascending: false });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.event_type,
      date: row.schedule_date,
      time: row.schedule_time,
      location: row.location || "",
      host: row.host || "",
      attendees: row.attendees || "",
      status: row.status || "Sắp diễn ra",
      notes: row.notes || undefined,
      description: row.description || undefined,
      content: row.content || undefined,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
    }));
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
    const rows = nextList.map((s) => ({
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
      attachments: s.attachments || [],
    }));
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

