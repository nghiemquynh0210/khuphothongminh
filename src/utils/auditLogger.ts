import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { loadPortalSetting, savePortalSetting } from "./supabaseSync";

export type AuditActionCategory =
  | "DATA_EXPORT"
  | "PII_ACCESS"
  | "RESIDENT_CRUD"
  | "HOUSEHOLD_CRUD"
  | "BUSINESS_CRUD"
  | "LEADERSHIP_CHANGE"
  | "STAFF_APPROVAL"
  | "AUTH_LOGIN";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  category: AuditActionCategory;
  actionTitle: string;
  targetSummary: string;
}

const AUDIT_LOGS_STORAGE_KEY = "kp3_audit_logs_v1";
const AUDIT_LOGS_DB_KEY = "audit_logs_v1";
const MAX_AUDIT_ENTRIES = 250;

export function getCachedAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadAuditLogsFromCloud(): Promise<AuditLogEntry[]> {
  let tableRows: AuditLogEntry[] = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("id, created_at, actor_name, actor_role, category, action_title, target_summary")
        .order("created_at", { ascending: false })
        .limit(MAX_AUDIT_ENTRIES);
      if (!error && Array.isArray(data)) {
        tableRows = data.map((r: any) => ({
          id: String(r.id),
          timestamp: String(r.created_at || new Date().toISOString()),
          actorName: String(r.actor_name || "Cán bộ Khu phố 3"),
          actorRole: String(r.actor_role || "Cán bộ"),
          category: (r.category as AuditActionCategory) || "AUTH_LOGIN",
          actionTitle: String(r.action_title || ""),
          targetSummary: String(r.target_summary || ""),
        }));
      }
    } catch {
      // Fallback sang portal_settings bên dưới nếu bảng chưa tạo
    }
  }

  const cloud = await loadPortalSetting<AuditLogEntry[]>(AUDIT_LOGS_DB_KEY);
  const local = getCachedAuditLogs();

  const seen = new Set<string>();
  const merged: AuditLogEntry[] = [];
  for (const item of [...tableRows, ...(Array.isArray(cloud) ? cloud : []), ...local]) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const trimmed = merged.slice(0, MAX_AUDIT_ENTRIES);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage/network fallback errors
    }
  }
  return trimmed;
}

export async function recordAuditLog(params: {
  actorName: string;
  actorRole?: string;
  category: AuditActionCategory;
  actionTitle: string;
  targetSummary: string;
}): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName || "Cán bộ Khu phố 3",
    actorRole: params.actorRole || "Cán bộ",
    category: params.category,
    actionTitle: params.actionTitle,
    targetSummary: params.targetSummary,
  };

  const current = getCachedAuditLogs();
  const nextLocal = [entry, ...current].slice(0, MAX_AUDIT_ENTRIES);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(nextLocal));
      window.dispatchEvent(new CustomEvent("kp3-audit-log-updated", { detail: nextLocal }));
    } catch {
      // ignore storage/network fallback errors
    }
  }

  void (async () => {
    // 1. Ưu tiên ghi append-only vào bảng public.audit_logs (không bao giờ ghi đè lịch sử cũ)
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await (supabase as any).from("audit_logs").insert({
          actor_name: entry.actorName,
          actor_role: entry.actorRole,
          category: entry.category,
          action_title: entry.actionTitle,
          target_summary: entry.targetSummary,
        });
        if (!error) return;
      } catch {
        // Fallback sang gộp an toàn với portal_settings bên dưới
      }
    }

    // 2. Fallback gộp an toàn: luôn đọc dữ liệu Cloud hiện có trước khi ghi để không mất log khi đăng nhập trình duyệt mới
    try {
      const existingCloud = await loadPortalSetting<AuditLogEntry[]>(AUDIT_LOGS_DB_KEY);
      const seen = new Set<string>();
      const merged: AuditLogEntry[] = [];
      for (const item of [entry, ...(Array.isArray(existingCloud) ? existingCloud : []), ...current]) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
      merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      await savePortalSetting(AUDIT_LOGS_DB_KEY, merged.slice(0, MAX_AUDIT_ENTRIES), false);
    } catch {
      // ignore storage/network fallback errors
    }
  })();

  return entry;
}
