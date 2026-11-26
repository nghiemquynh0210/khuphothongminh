import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  UserCheck, 
  UserX, 
  Check, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  BookOpen, 
  Calendar, 
  Lock, 
  Unlock, 
  Users, 
  Home, 
  Briefcase, 
  Map as MapIcon, 
  Bot, 
  MessageSquare, 
  Heart, 
  CalendarDays, 
  Coins, 
  FileText,
  User,
  Fingerprint,
  Building2,
  Store,
  Newspaper,
  Pin,
  Edit3,
  Trash2,
  Plus,
  Search,
  Eye,
  Filter,
  Tag,
  Megaphone,
  Send,
  Sparkles,
  RefreshCw,
  Loader2,
  BellRing,
  Link2,
  ExternalLink
} from "lucide-react";
import { Resident, ActiveTab, AdministrativeForm, LandingConfig, LocalNews } from "../types";
import { getNewsDetailPath, getNewsEditPath, getResidentDetailPath, navigate } from "../routes";
import AdministrativeForms from "./AdministrativeForms";
import { PageHeader } from "./common/PageHeader";
import { ReportSelect } from "./reports/ReportSelect";
import { InlineNotice } from "./ui/ConfirmModal";
import { EmptyState } from "./ui/EmptyState";
import { initialAdministrativeForms } from "../mockForms";
import { initialNewsList } from "../mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { AREA_SCOPES_KEY, loadPortalSetting, savePortalSetting } from "../utils/supabaseSync";
import { loadAuditLogsFromCloud } from "../utils/auditLogger";
import { DEFAULT_LANDING_CONFIG } from "./landing/landingConstants";
import { PortalConfigSettings } from "./settings/PortalConfigSettings";
import { ZaloOaNotificationHub } from "./settings/ZaloOaNotificationHub";

const AREA_SCOPES_STORAGE_KEY = "kp3_area_permission_scopes_v1";
const RESIDENT_PERMS_STORAGE_KEY = "kp3_resident_permissions_v1";

export type SettingsSubTab =
  | "approvals"
  | "zalo_oa"
  | "portal"
  | "forms"
  | "news"
  | "permissions"
  | "audit"
  | "plan";

function maskStaffCccd(cccd?: string | null): string {
  const s = String(cccd || "").trim();
  if (s.length >= 8) {
    return `${s.slice(0, 3)}*****${s.slice(-4)}`;
  }
  return s;
}

type AuditActionCategory =
  | "Xuất Excel"
  | "Truy cập CCCD"
  | "Đổi nhân sự"
  | "CRUD hồ sơ";

function classifyAuditCategory(rawAction: string, rawTarget: string): AuditActionCategory {
  const hay = `${rawAction} ${rawTarget}`.toLowerCase();
  if (
    hay.includes("excel") ||
    hay.includes("xlsx") ||
    hay.includes("csv") ||
    hay.includes("export") ||
    hay.includes("xuất") ||
    hay.includes("in danh sách")
  ) {
    return "Xuất Excel";
  }
  if (
    hay.includes("cccd") ||
    hay.includes("căn cước") ||
    hay.includes("reveal") ||
    hay.includes("unmask") ||
    hay.includes("định danh") ||
    hay.includes("pii")
  ) {
    return "Truy cập CCCD";
  }
  if (
    hay.includes("nhân sự") ||
    hay.includes("leader") ||
    hay.includes("party") ||
    hay.includes("chi bộ") ||
    hay.includes("bí thư") ||
    hay.includes("trưởng khu phố") ||
    hay.includes("cán bộ") ||
    hay.includes("cadre") ||
    hay.includes("staff") ||
    hay.includes("phân quyền") ||
    hay.includes("permission") ||
    hay.includes("role")
  ) {
    return "Đổi nhân sự";
  }
  return "CRUD hồ sơ";
}

function isMockDemoRegistration(reg: PendingRegistration): boolean {
  if (!reg) return true;
  if (String(reg.id || "").startsWith("REG-00")) return true;
  if (
    reg.fullName === "Trần Minh Tâm" ||
    reg.fullName === "Lê Thị Hồng Sâm"
  ) {
    return true;
  }
  return false;
}

const KP3_OPERATIONAL_ZONES = [
  { id: "all_kp3", name: "Toàn địa bàn KP3" },
  { id: "luong_dinh_cua", name: "Trục Lương Định Của" },
  { id: "song_hanh", name: "Trục Song Hành" },
  { id: "mai_chi_tho", name: "Trục Mai Chí Thọ" },
  { id: "hem_tu_quan", name: "Các cụm hẻm nội khu" },
  { id: "nha_van_hoa", name: "Nhà Văn hóa KP3" },
];

export interface PendingRegistration {
  id: string;
  fullName: string;
  gender: "Nam" | "Nữ";
  birthDate: string;
  cccd: string;
  phone: string;
  status: "Thường trú" | "Tạm trú";
  occupation: string;
  address: string;
  householdId: string;
  relationToOwner: string;
  coordinates?: string;
  avatar?: string;
}

interface SettingsAndPermissionsProps {
  pendingRegistrations: PendingRegistration[];
  onApproveRegistration: (reg: PendingRegistration) => void;
  onRejectRegistration: (id: string) => void;
  residentPermissions: Record<string, boolean>;
  onTogglePermission: (tabKey: string) => void;
  // Administrative Forms Integration
  forms?: AdministrativeForm[];
  onAddForm?: (newForm: AdministrativeForm) => void;
  onUpdateForm?: (updatedForm: AdministrativeForm) => void;
  onDeleteForm?: (formId: string) => void;
  // News & Announcement Management
  newsList?: LocalNews[];
  onAddNews?: (newNews: LocalNews) => void;
  onUpdateNews?: (updatedNews: LocalNews) => void;
  onDeleteNews?: (newsId: string) => void;
  currentUser?: {
    role: "canbo" | "nguoidan";
    fullName?: string;
    phone?: string;
  } | null;
  landingConfig?: LandingConfig;
  onUpdateLandingConfig?: (next: LandingConfig) => void;
  onResyncLeadership?: () => void;
  defaultSubTab?: SettingsSubTab;
  onNavigate?: (tab: ActiveTab) => void;
}

export default function SettingsAndPermissions({
  pendingRegistrations,
  onApproveRegistration,
  onRejectRegistration,
  residentPermissions,
  onTogglePermission,
  forms = initialAdministrativeForms,
  onAddForm,
  onUpdateForm,
  onDeleteForm,
  newsList = initialNewsList,
  onAddNews: _onAddNews,
  onUpdateNews: _onUpdateNews,
  onDeleteNews: _onDeleteNews,
  currentUser,
  landingConfig,
  onUpdateLandingConfig,
  onResyncLeadership,
  defaultSubTab = "approvals",
  onNavigate
}: SettingsAndPermissionsProps) {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("subtab");
      if (
        q === "zalo_oa" ||
        q === "approvals" ||
        q === "portal" ||
        q === "forms" ||
        q === "permissions" ||
        q === "audit"
      ) {
        return q;
      }
    }
    return defaultSubTab;
  });
  const [localLandingConfig, setLocalLandingConfig] = useState<LandingConfig>(
    landingConfig || DEFAULT_LANDING_CONFIG
  );

  // Persistent Resident Permissions (synced to Supabase portal_settings)
  const [persistedPermissions, setPersistedPermissions] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem(RESIDENT_PERMS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          return { ...residentPermissions, ...parsed };
        }
      }
    } catch {
      // ignore
    }
    return { ...residentPermissions };
  });
  const syncedPermsToParentRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadPortalSetting<Record<string, boolean>>("resident_permissions").then((cloudPerms) => {
      if (!active || !cloudPerms || typeof cloudPerms !== "object") return;
      const mergedPerms = { ...residentPermissions, ...cloudPerms };
      setPersistedPermissions(mergedPerms);
      try {
        localStorage.setItem(RESIDENT_PERMS_STORAGE_KEY, JSON.stringify(mergedPerms));
      } catch {
        // ignore
      }
      if (!syncedPermsToParentRef.current) {
        syncedPermsToParentRef.current = true;
        Object.keys(cloudPerms).forEach((k) => {
          if (Boolean(cloudPerms[k]) !== Boolean(residentPermissions[k])) {
            onTogglePermission(k);
          }
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleTogglePersistentPermission = (key: string) => {
    const currentAllowed = persistedPermissions[key] ?? residentPermissions[key] ?? false;
    const nextAllowed = !currentAllowed;
    const nextMap = {
      ...residentPermissions,
      ...persistedPermissions,
      [key]: nextAllowed,
    };
    setPersistedPermissions(nextMap);
    try {
      localStorage.setItem(RESIDENT_PERMS_STORAGE_KEY, JSON.stringify(nextMap));
    } catch {
      // ignore
    }
    savePortalSetting("resident_permissions", nextMap, true);
    onTogglePermission(key);
    showNewsToast(
      `Đã ${nextAllowed ? "mở quyền xem" : "khóa quyền xem"} cho Cổng Cư dân và lưu bền vững lên Supabase.`,
      "success"
    );
  };

  // Real online resident registrations from Supabase (replacing fake Unsplash mock items)
  const [cloudPendingRegistrations, setCloudPendingRegistrations] = useState<PendingRegistration[]>([]);

  useEffect(() => {
    let active = true;
    loadPortalSetting<PendingRegistration[]>("pending_resident_registrations").then((rows) => {
      if (active && Array.isArray(rows)) {
        setCloudPendingRegistrations(rows.filter((r) => r && !isMockDemoRegistration(r)));
      }
    });
    return () => {
      active = false;
    };
  }, [activeSubTab]);

  const realPendingRegistrations = useMemo(() => {
    const map = new Map<string, PendingRegistration>();
    (pendingRegistrations || []).forEach((r) => {
      if (r && !isMockDemoRegistration(r)) {
        map.set(r.id, r);
      }
    });
    cloudPendingRegistrations.forEach((r) => {
      if (r && !isMockDemoRegistration(r)) {
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  }, [pendingRegistrations, cloudPendingRegistrations]);

  const handleApproveRealRegistration = (reg: PendingRegistration) => {
    const nextCloud = cloudPendingRegistrations.filter((r) => r.id !== reg.id);
    setCloudPendingRegistrations(nextCloud);
    savePortalSetting("pending_resident_registrations", nextCloud, false);
    onApproveRegistration(reg);
  };

  const handleRejectRealRegistration = (id: string) => {
    const nextCloud = cloudPendingRegistrations.filter((r) => r.id !== id);
    setCloudPendingRegistrations(nextCloud);
    savePortalSetting("pending_resident_registrations", nextCloud, false);
    onRejectRegistration(id);
  };

  // Audit Logs (NĐ 13/2023/NĐ-CP) state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("Tất cả");
  const [auditSearchTerm, setAuditSearchTerm] = useState("");

  const fetchAuditLogs = async (showSpinner = true) => {
    try {
      if (showSpinner) setAuditLoading(true);
      const rows = await Promise.resolve(loadAuditLogsFromCloud());
      if (Array.isArray(rows)) {
        setAuditLogs(rows);
      }
    } catch (err) {
      console.warn("Load audit logs warning:", err);
    } finally {
      if (showSpinner) setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "audit") {
      fetchAuditLogs(true);
    }
  }, [activeSubTab]);

  const normalizedAuditLogs = useMemo(() => {
    return (auditLogs || []).map((raw: any, index: number) => {
      const actionLabel = String(
        raw?.actionLabel || raw?.action || raw?.actionType || raw?.type || "Thao tác hệ thống"
      );
      const targetLabel = String(
        raw?.target || raw?.targetName || raw?.resource || raw?.entity || raw?.module || "Hồ sơ Khu phố 3"
      );
      const detailsLabel = String(
        raw?.details || raw?.description || raw?.note || raw?.summary || ""
      );
      const actorLabel = String(
        raw?.actorName || raw?.actor || raw?.userName || raw?.performedBy || raw?.email || "Cán bộ Ban Điều hành KP3"
      );
      const actorRole = String(raw?.actorRole || raw?.role || "");
      const rawTime = raw?.timestamp || raw?.createdAt || raw?.created_at || raw?.time || "";
      let formattedTime = rawTime ? String(rawTime) : "Vừa xong";
      if (rawTime) {
        const parsedDate = new Date(rawTime);
        if (!Number.isNaN(parsedDate.getTime())) {
          formattedTime = parsedDate.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
      }
      const category = classifyAuditCategory(
        `${actionLabel} ${raw?.category || ""}`,
        `${targetLabel} ${detailsLabel}`
      );
      return {
        id: String(raw?.id || `AUDIT-${index}`),
        formattedTime,
        actorLabel,
        actorRole,
        actionLabel,
        category,
        targetLabel,
        detailsLabel,
      };
    });
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    return normalizedAuditLogs.filter((item) => {
      if (auditCategoryFilter !== "Tất cả" && item.category !== auditCategoryFilter) {
        return false;
      }
      if (auditSearchTerm.trim()) {
        const q = auditSearchTerm.toLowerCase();
        const hay = `${item.actorLabel} ${item.actionLabel} ${item.targetLabel} ${item.detailsLabel} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [normalizedAuditLogs, auditCategoryFilter, auditSearchTerm]);

  useEffect(() => {
    if (landingConfig) {
      setLocalLandingConfig(landingConfig);
    }
  }, [landingConfig]);

  const handleSaveLandingConfig = (next: LandingConfig) => {
    setLocalLandingConfig(next);
    onUpdateLandingConfig?.(next);
  };

  // Supabase Cadre Approval & Staff Directory state
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);
  const [cadreLoading, setCadreLoading] = useState(false);
  const [processingCadreId, setProcessingCadreId] = useState<string | null>(null);
  const [canManageStaff, setCanManageStaff] = useState(true);
  const [callerStaffId, setCallerStaffId] = useState<string | null>(null);
  const [newsActionToast, setNewsActionToast] = useState<string | null>(null);
  const [newsActionType, setNewsActionType] = useState<"success" | "error" | "info" | "warning">("success");

  const showNewsToast = (
    msg: string,
    type: "success" | "error" | "info" | "warning" = "success"
  ) => {
    setNewsActionType(type);
    setNewsActionToast(msg);
  };

  const pendingCadres = useMemo(
    () => staffProfiles.filter((c) => c.approval_status === "pending"),
    [staffProfiles]
  );

  const reviewedCadres = useMemo(
    () => staffProfiles.filter((c) => c.approval_status !== "pending"),
    [staffProfiles]
  );

  const fetchStaffProfiles = async (showSpinner = true) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      if (showSpinner) setCadreLoading(true);

      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token;

      if (accessToken) {
        try {
          const apiRes = await fetch("/api/staff-admin", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          });
          const contentType = apiRes.headers.get("content-type") || "";
          if (apiRes.ok && contentType.includes("application/json")) {
            const json = await apiRes.json();
            if (json?.ok && Array.isArray(json.profiles)) {
              setStaffProfiles(json.profiles);
              setCanManageStaff(Boolean(json.canManage));
              setCallerStaffId(json.callerId || sessionRes?.session?.user?.id || null);
              return;
            }
          }
        } catch {
          // Fallback to direct PostgREST read if serverless API unavailable
        }
      }

      const { data, error } = await (supabase as any)
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        setStaffProfiles(data);
        const me = data.find((r: any) => r.id === sessionRes?.session?.user?.id);
        if (me) {
          setCanManageStaff(me.role === "admin");
          setCallerStaffId(me.id);
        }
      }
    } catch (e) {
      console.warn("Fetch staff profiles error:", e);
    } finally {
      if (showSpinner) setCadreLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffProfiles();
  }, [activeSubTab]);

  const executeCadreDecision = async (
    cadre: any,
    action: "approve" | "reject" | "revoke"
  ) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!canManageStaff) {
      showNewsToast(
        "Chỉ Quản trị viên (Bí thư Chi bộ / Thường trực BĐH có quyền Admin) mới có quyền phê duyệt hoặc thu hồi tài khoản Cán bộ!",
        "error"
      );
      return;
    }

    setProcessingCadreId(cadre.id);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token;

      if (!accessToken) {
        showNewsToast(
          "Phiên xác thực đã hết hạn. Vui lòng đăng xuất và đăng nhập lại bằng tài khoản Quản trị viên!",
          "error"
        );
        return;
      }

      const apiRes = await fetch("/api/staff-admin", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cadreId: cadre.id,
          action,
        }),
      });

      const contentType = apiRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await apiRes.json();
        if (!apiRes.ok || !json?.ok) {
          showNewsToast(
            json?.error || "Không thể cập nhật trạng thái tài khoản Cán bộ.",
            "error"
          );
          return;
        }

        if (json.profile) {
          setStaffProfiles((prev) =>
            prev.map((item) => (item.id === cadre.id ? json.profile : item))
          );
        } else {
          await fetchStaffProfiles(false);
        }

        if (action === "approve") {
          showNewsToast(
            `Đã phê duyệt và kích hoạt quyền công tác cho ${cadre.full_name || cadre.email}!`,
            "success"
          );
        } else if (action === "reject") {
          showNewsToast(
            `Đã từ chối hồ sơ đăng ký Cán bộ của ${cadre.full_name || cadre.email}.`,
            "info"
          );
        } else {
          showNewsToast(
            `Đã thu hồi quyền truy cập hệ thống của ${cadre.full_name || cadre.email}.`,
            "warning"
          );
        }
        return;
      }

      // Fallback trực tiếp nếu chạy môi trường không có serverless API
      const nextStatus = action === "approve" ? "approved" : "rejected";
      const { data: updatedRows, error } = await (supabase as any)
        .from("user_profiles")
        .update({
          approval_status: nextStatus,
          ...(action === "approve"
            ? { approved_at: new Date().toISOString() }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cadre.id)
        .select();

      if (error) {
        showNewsToast(
          `Lỗi phê duyệt tài khoản Cán bộ: ${error.message}`,
          "error"
        );
        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        showNewsToast(
          "Không thể cập nhật hồ sơ do giới hạn phân quyền RLS. Vui lòng kiểm tra quyền Quản trị viên!",
          "error"
        );
        return;
      }

      setStaffProfiles((prev) =>
        prev.map((item) => (item.id === cadre.id ? updatedRows[0] : item))
      );
      showNewsToast(
        action === "approve"
          ? `Đã phê duyệt tài khoản Cán bộ ${cadre.full_name || ""} thành công!`
          : `Đã cập nhật trạng thái tài khoản Cán bộ ${cadre.full_name || ""}!`,
        "success"
      );
    } catch (e: any) {
      showNewsToast(
        e?.message || "Đã xảy ra lỗi kết nối khi xử lý tài khoản Cán bộ.",
        "error"
      );
    } finally {
      setProcessingCadreId(null);
    }
  };

  const handleApproveCadre = (cadre: any) => executeCadreDecision(cadre, "approve");
  const handleRejectCadre = (cadre: any) => executeCadreDecision(cadre, "reject");
  const handleRevokeCadre = (cadre: any) => executeCadreDecision(cadre, "revoke");

  const [editingLinkCadreId, setEditingLinkCadreId] = useState<string | null>(null);
  const [linkCccdInput, setLinkCccdInput] = useState<string>("");

  const handleLinkCadreResident = async (cadre: any) => {
    const cccdDigits = linkCccdInput.replace(/\D/g, "");
    if (cccdDigits.length !== 12) {
      showNewsToast("Vui lòng nhập Số CCCD hợp lệ gồm đủ 12 chữ số của cư dân Khu phố 3!", "warning");
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;

    setProcessingCadreId(cadre.id);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token;
      if (!accessToken) {
        showNewsToast("Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại!", "error");
        return;
      }
      const res = await fetch("/api/staff-admin", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "link_resident",
          cadreId: cadre.id,
          residentCccd: cccdDigits,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        showNewsToast(json?.error || "Không thể đối khớp & liên kết hồ sơ Cư dân.", "error");
        return;
      }
      setEditingLinkCadreId(null);
      setLinkCccdInput("");
      showNewsToast(
        `Đã liên kết tài khoản ${cadre.full_name} với hồ sơ Cư dân ${json.linked?.residentName || ""} thành công!`,
        "success"
      );
      await fetchStaffProfiles(false);
    } catch (e: any) {
      showNewsToast(e?.message || "Lỗi kết nối khi liên kết hồ sơ Cư dân.", "error");
    } finally {
      setProcessingCadreId(null);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("subtab");
      if (q === "zalo_oa") {
        setActiveSubTab("zalo_oa");
        return;
      }
    }
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Cụm địa bàn & Tuyến đường KP3 permission scope state per officer group
  const [selectedScopeGroup, setSelectedScopeGroup] = useState<string>("bandieuhanh");
  const [areaScopesByGroup, setAreaScopesByGroup] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem(AREA_SCOPES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaultAreas: Record<string, boolean> = {};
    KP3_OPERATIONAL_ZONES.forEach((zone) => {
      defaultAreas[zone.id] = true;
    });
    return {
      bandieuhanh: { ...defaultAreas },
      mattran: { ...defaultAreas },
      congtacvien: { ...defaultAreas }
    };
  });

  const handleToggleAreaScope = (zoneId: string, zoneName: string) => {
    const currentGroup = areaScopesByGroup[selectedScopeGroup] || {};
    const nextGroup = { ...currentGroup, [zoneId]: !(currentGroup[zoneId] ?? true) };
    const nextAll = { ...areaScopesByGroup, [selectedScopeGroup]: nextGroup };
    setAreaScopesByGroup(nextAll);
    try {
      localStorage.setItem(AREA_SCOPES_STORAGE_KEY, JSON.stringify(nextAll));
    } catch {}
    savePortalSetting(AREA_SCOPES_KEY, nextAll, false);
    showNewsToast(
      `Đã ${(nextGroup[zoneId] ? "bật" : "khóa")} phạm vi ${zoneName} cho nhóm quyền đang chọn.`
    );
  };

  const handleSetAllAreaScope = (enabled: boolean) => {
    const nextGroup: Record<string, boolean> = {};
    KP3_OPERATIONAL_ZONES.forEach((zone) => {
      nextGroup[zone.id] = enabled;
    });
    const nextAll = { ...areaScopesByGroup, [selectedScopeGroup]: nextGroup };
    setAreaScopesByGroup(nextAll);
    try {
      localStorage.setItem(AREA_SCOPES_STORAGE_KEY, JSON.stringify(nextAll));
    } catch {}
    savePortalSetting(AREA_SCOPES_KEY, nextAll, false);
    showNewsToast(
      enabled
        ? "Đã mở toàn bộ cụm địa bàn & tuyến đường KP3."
        : "Đã giới hạn phạm vi điều hành cụm địa bàn."
    );
  };

  useEffect(() => {
    let active = true;
    loadPortalSetting<Record<string, Record<string, boolean>>>(AREA_SCOPES_KEY).then((data) => {
      if (active && data && typeof data === "object") {
        setAreaScopesByGroup(data);
        try {
          localStorage.setItem(AREA_SCOPES_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Mock data for Roadmap / Kế hoạch triển khai
  const planningSteps = [
    {
      phase: "Giai đoạn 1: Thiết kế Cơ chế",
      title: "Phân tích & Thiết kế Mô hình Phân quyền (RBAC)",
      status: "completed",
      date: "Tháng 07/2026",
      desc: "Xác định 2 nhóm người dùng chính cho KP3 An Phú: Cán bộ (Chi ủy, Ban Điều hành khu phố, Ban Công tác Mặt trận) với quyền quản trị tập trung; và Người dân (Chủ hộ, cư dân) với quyền tự phục vụ bản thân."
    },
    {
      phase: "Giai đoạn 2: Phát triển Giao diện",
      title: "Trang Đăng nhập & Đăng ký Nhân khẩu Trực tuyến",
      status: "completed",
      date: "Hiện tại",
      desc: "Lập trình form khai báo thông tin cư trú chuẩn của Bộ Công an, cho phép đăng ký trực tuyến kèm định vị Google Maps."
    },
    {
      phase: "Giai đoạn 3: Tích hợp Toàn diện",
      title: "Đồng bộ Cơ sở dữ liệu & Phân quyền Thời gian thực",
      status: "active",
      date: "Tháng 08/2026",
      desc: "Đồng bộ thông tin đăng ký mới vào Sổ hộ khẩu điện tử khi Cán bộ phê duyệt. Tự động cô lập dữ liệu (Data Isolation) để người dân chỉ nhìn thấy dữ liệu của hộ mình."
    },
    {
      phase: "Giai đoạn 4: Thử nghiệm thực tế",
      title: "Triển khai thí điểm 50 hộ dân trên các tuyến đường KP3",
      status: "upcoming",
      date: "Tháng 09/2026",
      desc: "Thử nghiệm tải thực tế, đánh giá độ tiện dụng cho người cao tuổi, sửa đổi biểu mẫu phản ánh hiện trường 1022 cục bộ."
    }
  ];

  const menuInfo: Record<string, { label: string; icon: any; desc: string }> = {
    forms: { label: "Biểu mẫu hành chính", icon: FileText, desc: "Tải trực tiếp đơn xin cấp số nhà, CT01, đăng ký kinh doanh" },
    residents: { label: "Quản lý Nhân khẩu", icon: Users, desc: "Tra cứu lý lịch, danh sách nhân khẩu chi tiết" },
    households: { label: "Quản lý Hộ khẩu", icon: Home, desc: "Chỉnh sửa Sổ hộ khẩu, phân tách hộ gia đình" },
    enterprises: { label: "Quản lý Doanh nghiệp (DNNVV)", icon: Building2, desc: "Theo dõi tổ chức kinh tế, mã số thuế, quy mô lao động theo NĐ 80/2021" },
    businesses: { label: "Cơ sở Kinh doanh & Hộ cá thể", icon: Store, desc: "Cấp phép hoạt động, duyệt an toàn phòng cháy chữa cháy, cơ sở lưu trú" },
    gis: { label: "Bản đồ không gian GIS", icon: MapIcon, desc: "" },
    tasks: { label: "Lịch công tác & Nhiệm vụ", icon: Calendar, desc: "Theo dõi lịch họp chi bộ, phân công nhiệm vụ Ban Điều hành KP3, kiểm tra hạn chót" },
    ai: { label: "Hỏi đáp Trợ lý AI", icon: Bot, desc: "Hỏi đáp pháp luật, quy trình thủ tục hành chính tự động" },
    reports: { label: "Phản ánh hiện trường", icon: MessageSquare, desc: "Gửi phản ánh 1022 về rác thải, tiếng ồn, lấn chiếm hẻm" },
    party: { label: "Quản lý Chi hội Đảng", icon: ShieldAlert, desc: "Danh sách đảng viên miễn sinh hoạt, đảng viên 76" },
    welfare: { label: "An sinh Xã hội", icon: Heart, desc: "Nhận tiền hỗ trợ hộ nghèo, người già neo đơn, trẻ mồ côi" },
    cultural: { label: "Tin tức & Sự kiện", icon: CalendarDays, desc: "Xem và đăng ký tham gia hội họp, lễ kỷ niệm khu phố" },
    finance: { label: "Quỹ Khu phố", icon: Coins, desc: "Công khai tài chính, đóng góp quỹ Khuyến học, hẻm tự quản" },
  };

  return (
    <div className="space-y-4">
      {newsActionToast && (
        <InlineNotice
          message={newsActionToast}
          type={newsActionType}
          onDismiss={() => setNewsActionToast(null)}
        />
      )}

      {/* Minimalist Flat Header & Clean Tab Bar */}
      <div className="space-y-3">
        <PageHeader
          title="Cấu hình & Phân quyền Hệ thống"
          description="Phê duyệt tài khoản cán bộ, kết nối Zalo OA, quản trị Cổng Cư dân và nhật ký kiểm toán"
        />

        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 w-fit max-w-full evon-scroll">
          <button
            type="button"
            onClick={() => setActiveSubTab("approvals")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === "approvals"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={13} className={activeSubTab === "approvals" ? "text-emerald-700" : "text-slate-500"} />
            <span>Duyệt tài khoản ({pendingCadres.length + realPendingRegistrations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("zalo_oa")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === "zalo_oa"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BellRing size={13} className={activeSubTab === "zalo_oa" ? "text-emerald-700" : "text-slate-500"} />
            <span>Zalo OA &amp; Tự động</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("portal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === "portal"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 size={13} className={activeSubTab === "portal" ? "text-emerald-700" : "text-slate-500"} />
            <span>Cổng Cư dân</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("permissions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === "permissions"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield size={13} className={activeSubTab === "permissions" ? "text-emerald-700" : "text-slate-500"} />
            <span>Phân quyền</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === "audit"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Fingerprint size={13} className={activeSubTab === "audit" ? "text-emerald-700" : "text-slate-500"} />
            <span>Nhật ký kiểm toán</span>
          </button>
        </div>
      </div>

      {/* Zalo OA & 15-Day Expiry Notification Hub */}
      {activeSubTab === "zalo_oa" && (
        <ZaloOaNotificationHub
          onNotify={showNewsToast}
          onNavigateToBroadcast={onNavigate ? () => onNavigate("tasks") : undefined}
        />
      )}

      {/* Portal Config Tab (Trang chủ, Hình ảnh, Cán bộ & Giới thiệu KP3) */}
      {activeSubTab === "portal" && (
        <PortalConfigSettings
          landingConfig={localLandingConfig}
          onUpdateLandingConfig={handleSaveLandingConfig}
          onNotify={showNewsToast}
          onResyncLeadership={onResyncLeadership}
          onNavigateToParty={onNavigate ? () => onNavigate("party") : undefined}
        />
      )}

      {/* Approvals tab */}
      {activeSubTab === "approvals" && (
        <div className="space-y-4">
          {/* 1. Phê duyệt Cán bộ công tác (Supabase Auth & RLS) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/80">
                  <ShieldCheck size={14} />
                </span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Phê duyệt Tài khoản Cán bộ công tác
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold px-2.5 py-0.5 rounded-full text-xs font-mono">
                  {pendingCadres.length} Cán bộ chờ duyệt
                </span>
                <button
                  type="button"
                  onClick={() => fetchStaffProfiles(true)}
                  disabled={cadreLoading}
                  className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  title="Tải lại danh sách tài khoản Cán bộ"
                >
                  <RefreshCw size={12} className={cadreLoading ? "animate-spin" : ""} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {!canManageStaff && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-700 shrink-0" />
                <span>
                  Bạn đang đăng nhập với quyền <strong>Cán bộ công tác</strong>. Thao tác phê duyệt hoặc thu hồi quyền thuộc thẩm quyền của <strong>Quản trị viên Ban Điều hành (Bí thư Chi bộ)</strong>.
                </span>
              </div>
            )}

            {cadreLoading ? (
              <div className="py-6 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin text-indigo-600" />
                <span>Đang đồng bộ danh sách tài khoản cán bộ...</span>
              </div>
            ) : pendingCadres.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-700 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                Không có tài khoản Cán bộ nào đang chờ phê duyệt. Toàn bộ cán bộ đã được cấp quyền hợp lệ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingCadres.map((cadre) => {
                  const isBusy = processingCadreId === cadre.id;
                  const createdLabel = cadre.created_at
                    ? new Date(cadre.created_at).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : null;

                  return (
                    <div key={cadre.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="font-bold text-slate-900 text-xs sm:text-[13px] truncate">{cadre.full_name}</h5>
                          <p className="text-xs text-indigo-700 font-medium">{cadre.position || "Cán bộ Khu phố"}</p>
                          <p className="text-xs text-slate-600 font-mono mt-0.5 break-all">{cadre.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            Chờ duyệt
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {cadre.role === "admin" ? "Quản trị" : "Cán bộ (cadre)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1.5 border-t border-slate-200">
                        <span>Điện thoại: <strong className="text-slate-900 font-mono">{cadre.phone || "Chưa cập nhật"}</strong></span>
                        {createdLabel && (
                          <span className="text-[11px] text-slate-500">Đăng ký: {createdLabel}</span>
                        )}
                      </div>

                      {cadre.linked_resident_id ? (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg px-2.5 py-2 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold">
                              ✓ Đã đối khớp Cư dân KP3: {cadre.linked_resident_name || cadre.full_name}
                            </span>
                            {cadre.linked_resident_cccd && (
                              <span className="font-mono ml-1.5">
                                (CCCD {maskStaffCccd(cadre.linked_resident_cccd)})
                              </span>
                            )}
                            {(cadre.linked_official_role || cadre.linked_association_name) && (
                              <span className="block text-emerald-800 mt-0.5">
                                {cadre.linked_official_role || "Cán bộ"}
                                {cadre.linked_association_name ? ` • ${cadre.linked_association_name}` : ""}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(getResidentDetailPath(cadre.linked_resident_id))}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100 cursor-pointer shrink-0"
                          >
                            <span>Hồ sơ cư dân</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      ) : (
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-800">
                          Chưa liên kết mã nhân khẩu trong CSDL Dân cư KP3 (có thể gắn CCCD sau khi duyệt).
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={!canManageStaff || isBusy}
                          onClick={() => handleApproveCadre(cadre)}
                          className="flex-1 min-h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isBusy ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Đang xử lý...</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={13} />
                              <span>Phê duyệt cấp quyền</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={!canManageStaff || isBusy}
                          onClick={() => handleRejectCadre(cadre)}
                          className="min-h-9 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Danh sách Cán bộ đã cấp quyền & lịch sử xét duyệt */}
            {reviewedCadres.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Danh sách Tài khoản Cán bộ Đã Xét duyệt ({reviewedCadres.length})
                  </h5>
                </div>
                <div className="divide-y divide-slate-200/80 border border-slate-200 rounded-xl bg-white overflow-hidden">
                  {reviewedCadres.map((cadre) => {
                    const isApproved = cadre.approval_status === "approved";
                    const isAdminAccount = cadre.role === "admin";
                    const isProtected =
                      cadre.id === callerStaffId ||
                      String(cadre.email || "").trim().toLowerCase() === "bdhkhupho3.ap@gmail.com";
                    const isBusy = processingCadreId === cadre.id;

                    return (
                      <div
                        key={cadre.id}
                        className="px-3.5 py-3 flex flex-col gap-2 text-xs hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900">{cadre.full_name}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[11px] border ${
                                  isAdminAccount
                                    ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {isAdminAccount ? "Quản trị viên" : cadre.position || "Cán bộ KP3"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[11px] border ${
                                  isApproved
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {isApproved ? "Đã cấp quyền" : "Đã từ chối / Thu hồi"}
                              </span>
                            </div>

                            <div className="text-slate-600 font-mono flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>{cadre.email}</span>
                              {cadre.phone && <span>• SĐT: {cadre.phone}</span>}
                            </div>

                            {/* Liên kết Hồ sơ Cư dân & Chi hội KP3 */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {cadre.linked_resident_id ? (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                                    <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                                    <span>
                                      Đã liên kết Cư dân KP3: <strong>{cadre.linked_resident_name || cadre.full_name}</strong>
                                      {cadre.linked_resident_cccd ? ` (${maskStaffCccd(cadre.linked_resident_cccd)})` : ""}
                                      {cadre.linked_official_role ? ` • ${cadre.linked_official_role}` : ""}
                                      {cadre.linked_association_name ? ` (${cadre.linked_association_name})` : ""}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => navigate(getResidentDetailPath(cadre.linked_resident_id))}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] cursor-pointer"
                                  >
                                    <span>Xem hồ sơ cư dân</span>
                                    <ExternalLink size={11} />
                                  </button>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
                                  Chưa gắn mã CCCD Cư dân KP3
                                </span>
                              )}

                              {(canManageStaff || cadre.id === callerStaffId) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingLinkCadreId === cadre.id) {
                                      setEditingLinkCadreId(null);
                                      setLinkCccdInput("");
                                    } else {
                                      setEditingLinkCadreId(cadre.id);
                                      setLinkCccdInput(cadre.linked_resident_cccd || "");
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                                >
                                  <Link2 size={11} />
                                  <span>{cadre.linked_resident_id ? "Đổi CCCD liên kết" : "Liên kết Cư dân KP3"}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {canManageStaff && !isProtected && (
                            <div className="shrink-0 flex items-center gap-2">
                              {isApproved ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRevokeCadre(cadre)}
                                  className="min-h-8 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? "Đang xử lý..." : "Thu hồi quyền"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApproveCadre(cadre)}
                                  className="min-h-8 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? "Đang xử lý..." : "Cấp quyền lại"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {editingLinkCadreId === cadre.id && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={12}
                              value={linkCccdInput}
                              onChange={(e) => setLinkCccdInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                              placeholder="Nhập 12 số CCCD của Cán bộ trong CSDL Dân cư KP3..."
                              className="flex-1 min-h-[36px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleLinkCadreResident(cadre)}
                                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? "Đang đối khớp..." : "Lưu liên kết"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLinkCadreId(null);
                                  setLinkCccdInput("");
                                }}
                                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Yêu cầu Đăng ký Cư dân trực tuyến */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                  <Users size={14} />
                </span>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Hồ sơ Đăng ký Cư dân Trực tuyến
                </h4>
              </div>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2.5 py-0.5 rounded-full text-xs font-mono shrink-0">
                {realPendingRegistrations.length} chờ duyệt
              </span>
            </div>

            {realPendingRegistrations.length === 0 ? (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                <span>Chưa có hồ sơ đăng ký cư dân trực tuyến nào đang chờ xét duyệt.</span>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {realPendingRegistrations.map((reg) => (
                <div key={reg.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs overflow-hidden shrink-0">
                        {reg.avatar ? (
                          <img src={reg.avatar} alt={reg.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          reg.fullName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-900 text-xs sm:text-[13px] flex flex-wrap items-center gap-1.5">
                          <span className="truncate">{reg.fullName}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${reg.status === "Thường trú" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {reg.status}
                          </span>
                        </h5>
                        <p className="text-xs text-slate-600 mt-0.5 font-mono">CCCD: {reg.cccd}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                        <Clock size={11} /> Chờ duyệt
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-b border-slate-100 py-2.5">
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Giới tính</span>
                      <span className="font-semibold text-slate-800">{reg.gender}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Ngày sinh</span>
                      <span className="font-semibold text-slate-800 font-mono">{reg.birthDate}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Điện thoại</span>
                      <span className="font-semibold text-slate-800 font-mono">{reg.phone}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Nghề nghiệp</span>
                      <span className="font-semibold text-slate-800">{reg.occupation}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Mã Hộ khẩu xin nhập</span>
                      <span className="font-bold text-indigo-600 font-mono">{reg.householdId}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Quan hệ chủ hộ</span>
                      <span className="font-semibold text-slate-800">{reg.relationToOwner}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-tight"><b>Địa chỉ:</b> {reg.address}</span>
                    </div>
                    {reg.coordinates && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Fingerprint size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                        <span className="font-mono text-xs text-indigo-600"><b>Tọa độ định vị:</b> {reg.coordinates}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveRealRegistration(reg)}
                      className="flex-1 h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck size={13} /> Phê duyệt nhập khẩu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectRealRegistration(reg.id)}
                      className="h-9 w-9 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                      title="Từ chối hồ sơ"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Administrative Forms tab */}
      {activeSubTab === "forms" && (
        <div className="space-y-4">
          <AdministrativeForms
            forms={forms}
            onAddForm={onAddForm}
            onUpdateForm={onUpdateForm}
            onDeleteForm={onDeleteForm}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Canonical News Link tab */}
      {activeSubTab === "news" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Newspaper size={12} /> Đã hợp nhất về phân hệ Truyền thông KP3
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Quản lý Tin tức, Thông báo &amp; Sự kiện Cộng đồng
              </h4>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Để tránh trùng lặp dữ liệu biên tập, toàn bộ chức năng đăng bài, ghim thông báo khẩn, đính kèm văn bản và lịch Nhà Văn hóa đã được tập trung tại phân hệ <strong>Tin tức &amp; Sự kiện Khu phố 3</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate("cultural");
                } else {
                  showNewsToast("Vui lòng chọn mục Tin tức & Sự kiện trên thanh điều hướng bên trái.");
                }
              }}
              className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Newspaper size={14} />
              <span>Mở Kênh Tin tức &amp; Sự kiện KP3 →</span>
            </button>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Tổng số bài viết</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{(newsList || []).length}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Đã lưu &amp; phát hành</span>
            </div>
            <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Đang ghim trang chủ</span>
              <span className="text-lg font-bold text-amber-700 mt-1 block font-mono">{(newsList || []).filter(n => n.isPinned).length}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Ưu tiên trên Cổng Cư dân</span>
            </div>
            <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Thông báo khẩn</span>
              <span className="text-lg font-bold text-rose-700 mt-1 block font-mono">{(newsList || []).filter(n => n.category === "Thông báo khẩn").length}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">An ninh &amp; Y tế cấp bách</span>
            </div>
            <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Tin hành chính</span>
              <span className="text-lg font-bold text-blue-700 mt-1 block font-mono">{(newsList || []).filter(n => n.category === "Hành chính").length}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Thủ tục &amp; Lịch tiếp dân</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(newsList || []).slice(0, 6).map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(getNewsDetailPath(item.id))}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(getNewsDetailPath(item.id));
                  }
                }}
                className="bg-white border border-slate-200/90 hover:border-emerald-300 shadow-2xs rounded-xl p-3.5 flex flex-col justify-between gap-3 cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[11px]">
                      {item.category}
                    </span>
                    <span className="font-mono text-slate-500">{item.date}</span>
                  </div>
                  <h5 className="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-emerald-700 line-clamp-2 leading-snug transition-colors">
                    {item.title}
                  </h5>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.summary || item.content}</p>
                </div>
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => _onUpdateNews && _onUpdateNews({ ...item, isPinned: !item.isPinned })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      item.isPinned
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {item.isPinned ? "Đã ghim" : "Ghim tin"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(getNewsEditPath(item.id))}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Sửa
                    </button>
                    {_onDeleteNews && (
                      <button
                        type="button"
                        onClick={() => {
                          _onDeleteNews(item.id);
                          showNewsToast(`Đã xóa bài viết "${item.title}".`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions tab */}
      {activeSubTab === "permissions" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">Phân quyền truy cập theo phân hệ</span>
            </div>

            <div className="divide-y divide-slate-100">
              {Object.entries(menuInfo).map(([key, info]) => {
                const IconComponent = info.icon;
                const isResidentAllowed = persistedPermissions[key] ?? residentPermissions[key] ?? false;
                
                // Hardcoded rules: Resident cannot be granted access to full residents or households for personal privacy security
                const isRestrictedBySystem = ["residents", "households"].includes(key);

                return (
                  <div key={key} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                        <IconComponent size={14} />
                      </div>
                      <h5 className="font-semibold text-slate-900 text-xs flex flex-wrap items-center gap-2">
                        <span>{info.label}</span>
                        {isRestrictedBySystem && (
                          <span className="text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <Lock size={10} /> Nội bộ cán bộ
                          </span>
                        )}
                      </h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 self-end sm:self-center shrink-0">
                      {/* Officer Access Level */}
                      <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 shrink-0">
                        <Shield size={11} /> Cán bộ: Đầy đủ
                      </div>

                      {/* Resident Access Level Toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isRestrictedBySystem ? (
                          <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold select-none bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Lock size={11} /> Bị khóa ở dân
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePersistentPermission(key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border shrink-0
                              ${isResidentAllowed 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }
                            `}
                          >
                            {isResidentAllowed ? (
                              <>
                                <Check size={11} /> Dân: Được xem
                              </>
                            ) : (
                              <>
                                <X size={11} /> Dân: Đã khóa
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phạm vi Phân quyền Theo Cụm địa bàn & Tuyến đường KP3 */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-700" />
                Phạm vi phụ trách theo tuyến đường KP3
              </h5>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-60">
                  <ReportSelect
                    aria-label="Chọn nhóm quyền áp dụng phạm vi địa bàn KP3"
                    value={selectedScopeGroup}
                    onChange={(val) => setSelectedScopeGroup(val)}
                    options={[
                      { value: "bandieuhanh", label: "Ban Điều hành Khu phố 3" },
                      { value: "mattran", label: "Ban Công tác Mặt trận KP3" },
                      { value: "congtacvien", label: "Cộng tác viên Dân số & An sinh" }
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSetAllAreaScope(true)}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold cursor-pointer shrink-0"
                >
                  Mở toàn địa bàn
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {KP3_OPERATIONAL_ZONES.map((zone) => {
                const enabled = areaScopesByGroup[selectedScopeGroup]?.[zone.id] ?? true;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => handleToggleAreaScope(zone.id, zone.name)}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      enabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold">{zone.name}</span>
                      {enabled ? (
                        <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                      ) : (
                        <Lock size={12} className="text-slate-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-600 block mt-0.5">
                      {enabled ? "Đang cấp quyền" : "Đã khóa"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeSubTab === "audit" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                  <Fingerprint size={14} />
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Nhật ký Kiểm toán Hệ thống ({normalizedAuditLogs.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => fetchAuditLogs(true)}
                disabled={auditLoading}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw size={13} className={auditLoading ? "animate-spin" : ""} />
                <span>Làm mới nhật ký</span>
              </button>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
              {(
                [
                  { cat: "Xuất Excel", tone: "border-emerald-200 bg-emerald-50/50 text-emerald-800" },
                  { cat: "Truy cập CCCD", tone: "border-amber-200 bg-amber-50/50 text-amber-800" },
                  { cat: "Đổi nhân sự", tone: "border-indigo-200 bg-indigo-50/50 text-indigo-800" },
                  { cat: "CRUD hồ sơ", tone: "border-blue-200 bg-blue-50/50 text-blue-800" },
                ] as const
              ).map(({ cat, tone }) => {
                const count = normalizedAuditLogs.filter((l) => l.category === cat).length;
                return (
                  <div key={cat} className={`rounded-xl border p-3.5 ${tone}`}>
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      {cat}
                    </span>
                    <span className="text-lg font-bold font-mono mt-1 block">
                      {count}
                    </span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      Bản ghi kiểm toán trên Cloud
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {["Tất cả", "Xuất Excel", "Truy cập CCCD", "Đổi nhân sự", "CRUD hồ sơ"].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAuditCategoryFilter(cat)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                        auditCategoryFilter === cat
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  placeholder="Tìm cán bộ, hành động, đối tượng..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {auditLoading ? (
              <div className="py-10 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-700" />
                <span>Đang tải nhật ký kiểm toán từ Supabase Cloud...</span>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Chưa có bản ghi kiểm toán nào khớp bộ lọc"
                  description="Các thao tác Xuất Excel, Xem số CCCD, Đổi nhân sự và Cập nhật hồ sơ dân cư sẽ tự động được ghi vết bảo mật tại đây theo Nghị định 13/2023/NĐ-CP."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Thời gian</th>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Người thực hiện</th>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Phân loại hành động</th>
                      <th className="py-2.5 px-3.5 min-w-[260px]">Đối tượng tác động &amp; Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log) => {
                      const badgeTone =
                        log.category === "Xuất Excel"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : log.category === "Truy cập CCCD"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : log.category === "Đổi nhân sự"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-blue-50 text-blue-800 border-blue-200";
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                            {log.formattedTime}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-slate-900">{log.actorLabel}</div>
                            {log.actorRole && (
                              <div className="text-[11px] text-slate-500">{log.actorRole}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeTone}`}
                            >
                              {log.category}
                            </span>
                            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {log.actionLabel}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-semibold text-slate-900">{log.targetLabel}</div>
                            {log.detailsLabel && (
                              <div className="text-slate-600 mt-0.5 leading-relaxed">
                                {log.detailsLabel}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan tab */}
      {activeSubTab === "plan" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h4 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Đề án Xây dựng Cổng Bảo Mật & Xác thực (Roadmap)</h4>
            <p className="text-xs text-slate-500">Lộ trình 4 giai đoạn chuẩn hóa phân quyền và chuyển đổi số bảo mật dữ liệu dân cư tại Khu phố 3</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="relative border-l-2 border-indigo-100 pl-6 ml-3 space-y-6">
              {planningSteps.map((step, idx) => (
                <div key={idx} className="relative group">
                  {/* Status node */}
                  <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-transform group-hover:scale-110
                    ${step.status === "completed" 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600" 
                      : step.status === "active" 
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600" 
                        : "border-slate-300 bg-slate-50 text-slate-600"
                    }
                  `}>
                    {step.status === "completed" ? (
                      <CheckCircle2 size={10} className="stroke-[3]" />
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${step.status === "active" ? "bg-indigo-600" : "bg-slate-400"}`} />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded
                        ${step.status === "completed" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : step.status === "active" 
                            ? "bg-indigo-50 text-indigo-700" 
                            : "bg-slate-50 text-slate-500"
                        }
                      `}>
                        {step.phase}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{step.date}</span>
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm">{step.title}</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100/50 flex items-start gap-3">
              <ShieldAlert className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">Lưu ý bảo mật:</span> Mọi hoạt động phê duyệt nhân khẩu, thiết lập phân quyền sẽ được tự động đồng bộ và lưu trữ vết nhật ký quản trị (Audit Trail) để đảm bảo tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
