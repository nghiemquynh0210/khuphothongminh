import React, { useState, useEffect, useMemo, useRef, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import {
  initialResidents,
  initialHouseholds,
  initialBusinesses,
  initialReports,
  initialPartyMembers,
  initialWelfareRecipients,
  initialCommunityEvents,
  initialFundContributions,
  initialNewsList
} from "./mockData";
import {
  Resident,
  Household,
  Business,
  FieldReport,
  ReportMessage,
  ReportPriority,
  PartyMember,
  ActiveTab,
  WelfareRecipient,
  CommunityEvent,
  FundContribution,
  FundExpenditure,
  AdministrativeForm,
  TargetGisItem,
  LocalNews,
  TaskItem,
  ScheduleEvent,
  LandingConfig,
  Association
} from "./types";
import {
  DEFAULT_LANDING_CONFIG,
  LANDING_CONFIG_STORAGE_KEY,
  mergeLandingConfig,
} from "./components/landing/landingConstants";
import { getStoredAssociations, saveStoredAssociations } from "./data/associationsData";
import {
  extractKeyLeadersSummary,
  reconcileLegacyAssociationsIfNeeded,
  sortAssociationsAndMembers,
  syncLandingConfigWithAssociations,
  syncPortalLeaderChangeToAssociations,
} from "./utils/leadershipSync";
import {
  REPORT_STORAGE_KEY,
  REPORT_PRIORITY_CONFIG,
  computeSlaDeadlineIso,
  formatNowVNString,
  getBeforeImages,
  getCategoryMeta,
  normalizeReport,
  parseReportMetadataFromResponse,
  serializeReportMetadata,
} from "./data/reportConfig";
import {
  FUND_EXPENDITURES_STORAGE_KEY,
  MOCK_INITIAL_EXPENDITURES,
  normalizeFundKey,
} from "./components/funds/fundCatalog";
import { initialAdministrativeForms } from "./mockForms";
import Sidebar from "./components/Sidebar";
import { LoadingFade } from "./components/common/LoadingFade";
import { QuickCommandModal } from "./components/common/QuickCommandModal";
import { loadStoredTasks, saveStoredTasks } from "./components/tasks/tasksData";
import { KP3_OFFICIAL_BASELINE, createTaskFromReport } from "./utils/kp3Utils";
import type { PendingRegistration } from "./components/SettingsAndPermissions";
import {
  inferRelationToOwner,
  extractBirthYear,
  autoExtractHostelBusinesses,
  getTemporaryResidenceExpiryStatus,
  buildTemporaryHouseholdsFromResidents,
} from "./utils/householdRecognitionUtils";

import {
  isDynamicImportChunkError,
  lazyWithChunkRetry,
  tryAutoReloadForStaleChunk,
} from "./utils/chunkReloadRecovery";

const Dashboard = lazyWithChunkRetry(() => import("./components/Dashboard"));
const ResidentsPage = lazyWithChunkRetry(() => import("./page/ResidentsPage"));
const HouseholdsPage = lazyWithChunkRetry(() => import("./page/HouseholdsPage"));
const EnterprisesPage = lazyWithChunkRetry(() => import("./page/EnterprisesPage"));
const BusinessesPage = lazyWithChunkRetry(() => import("./page/BusinessesPage"));
const TasksPage = lazyWithChunkRetry(() => import("./page/TasksPage"));
const ReportsPage = lazyWithChunkRetry(() => import("./page/ReportsPage"));
const PartyPage = lazyWithChunkRetry(() => import("./page/PartyPage"));
const CulturalPage = lazyWithChunkRetry(() => import("./page/CulturalPage"));
const GisMap = lazyWithChunkRetry(() => import("./components/GisMap"));
const AiAssistant = lazyWithChunkRetry(() => import("./components/AiAssistant"));
const SocialWelfare = lazyWithChunkRetry(() => import("./components/SocialWelfare"));
const NeighborhoodFunds = lazyWithChunkRetry(() => import("./components/NeighborhoodFunds"));
const PlanArchitecture = lazyWithChunkRetry(() => import("./components/PlanArchitecture"));
const LoginAndRegister = lazyWithChunkRetry(() => import("./components/LoginAndRegister"));
const SettingsAndPermissions = lazyWithChunkRetry(() => import("./components/SettingsAndPermissions"));
const AdministrativeForms = lazyWithChunkRetry(() => import("./components/AdministrativeForms"));
const CitizenLandingPage = lazyWithChunkRetry(() => import("./components/CitizenLandingPage"));
import {
  ROUTES,
  navigate,
  getDashboardExtensionPath,
  getTabFromDashboardPath,
  Link
} from "./routes";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import {
  BUSINESS_EXTENDED_META_KEY,
  DEFAULT_LANDING_CONFIG_KEY,
  RESIDENT_EXTENDED_META_KEY,
  VerifiedStaffSession,
  applyBusinessExtendedMeta,
  applyResidentExtendedMeta,
  deleteAdministrativeFormFromDb,
  deleteCommunityEventFromDb,
  deleteResidentFromDb,
  getVerifiedStaffSession,
  hydrateHouseholdFromDbRow,
  loadAdministrativeFormsFromDb,
  loadAssociationRecord,
  loadCommunityEventsFromDb,
  loadPortalSetting,
  loadSchedulesFromDb,
  loadTasksFromDb,
  loadWelfareRecord,
  mapDbNewsToLocal,
  saveAssociationRecord,
  saveLandingConfigToDb,
  savePublicKp3StatsToDb,
  saveWelfareRecord,
  serializeLocalNewsToDb,
  syncBusinessesDiffToDb,
  syncHouseholdsDiffToDb,
  syncResidentsDiffToDb,
  syncSchedulesToDb,
  syncTasksDiffToDb,
  upsertAdministrativeFormToDb,
  upsertCommunityEventToDb,
  upsertResidentToDb,
} from "./utils/supabaseSync";
import {
  reconcileSchedulesWithAssociations,
  reconcileTasksWithAssociations,
} from "./utils/taskScheduleRoleSync";
import {
  Bell,
  Home,
  Users,
  ShieldAlert,
  ChevronRight,
  Search,
  Info,
  LockKeyhole
} from "lucide-react";

export const PUBLIC_CITIZEN_USER = {
  username: "cudan",
  fullName: "Cư dân Khu phố 3",
  role: "nguoidan" as const,
};

export const CANBO_USER = {
  username: "canbo",
  fullName: "Nguyễn Văn Hùng",
  role: "canbo" as const,
  phone: "0901234567"
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTab: string;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || "Đã xảy ra lỗi khi tải phân hệ" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught an error:", error, errorInfo);
    if (isDynamicImportChunkError(error)) {
      tryAutoReloadForStaleChunk();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.fallbackTab !== this.props.fallbackTab && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      const isStaleChunk = isDynamicImportChunkError(this.state.errorMessage);
      return (
        <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isStaleChunk ? "Hệ thống vừa cập nhật phiên bản mới" : "Không thể tải phân hệ"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isStaleChunk
              ? "Trình duyệt đang giữ bản cache cũ trước khi nâng cấp. Nhấn nút bên dưới để đồng bộ bản mới nhất."
              : `Hệ thống phát hiện lỗi hiển thị tạm thời: ${this.state.errorMessage}`}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (isStaleChunk && typeof window !== "undefined") {
                  window.location.reload();
                  return;
                }
                this.setState({ hasError: false, errorMessage: "" });
                this.props.onReset();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {isStaleChunk ? "Tải lại phiên bản mới" : "Tải lại phân hệ"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    fullName: string;
    role: "canbo" | "nguoidan";
    cccd?: string;
    householdCode?: string;
    phone?: string;
  } | null>(PUBLIC_CITIZEN_USER);

  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([
    {
      id: "REG-001",
      fullName: "Trần Minh Tâm",
      gender: "Nam",
      birthDate: "14/05/1998",
      cccd: "079200114567",
      phone: "0934455667",
      status: "Thường trú",
      occupation: "Kỹ sư phần mềm",
      address: "42 Lương Định Của, Phường An Phú",
      householdId: "HK-301",
      relationToOwner: "Con",
      coordinates: "10°56'07.5\"N 106°44'38.0\"E",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    },
    {
      id: "REG-002",
      fullName: "Lê Thị Hồng Sâm",
      gender: "Nữ",
      birthDate: "20/11/1992",
      cccd: "079305128912",
      phone: "0886677889",
      status: "Tạm trú",
      occupation: "Nhân viên văn phòng",
      address: "Hẻm 30 Lương Định Của",
      householdId: "HK-302",
      relationToOwner: "Vợ",
      coordinates: "10°56'09.1\"N 106°44'36.5\"E",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
    }
  ]);

  const [residentPermissions, setResidentPermissions] = useState<Record<string, boolean>>({
    dashboard: true,
    forms: true,
    residents: false,
    households: false,
    enterprises: true,
    businesses: true,
    gis: true,
    tasks: true,
    ai: true,
    reports: true,
    party: true,
    welfare: true,
    cultural: true,
    finance: true,
    plan: true,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== "undefined") {
      const tab = getTabFromDashboardPath(window.location.pathname);
      if (tab) return tab as ActiveTab;
    }
    return "cultural";
  });
  const [routePath, setRoutePath] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  const [citizenSubView, setCitizenSubView] = useState<ActiveTab | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("kp3_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [showCommandModal, setShowCommandModal] = useState(false);
  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kp3_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaffSession | null>(null);
  const verifiedStaffRef = useRef<VerifiedStaffSession | null>(null);
  const updateVerifiedStaff = (session: VerifiedStaffSession | null) => {
    verifiedStaffRef.current = session;
    setVerifiedStaff(session);
  };
  const [authChecked, setAuthChecked] = useState<boolean>(!isSupabaseConfigured);
  const [residents, setResidents] = useState<Resident[]>(() =>
    isSupabaseConfigured ? [] : initialResidents
  );
  const [households, setHouseholds] = useState<Household[]>(() =>
    isSupabaseConfigured ? [] : initialHouseholds
  );
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [reports, setReports] = useState<FieldReport[]>(() => {
    try {
      const saved = localStorage.getItem(REPORT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: FieldReport) => normalizeReport(item));
        }
      }
    } catch {}
    return initialReports.map((item) => normalizeReport(item));
  });
  const [partyMembers] = useState<PartyMember[]>(initialPartyMembers);
  const [tasks, setTasks] = useState<TaskItem[]>(loadStoredTasks);
  const [allSchedules, setAllSchedules] = useState<ScheduleEvent[]>([]);
  const [publicSchedules, setPublicSchedules] = useState<ScheduleEvent[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const handleTasksChange = (nextTasks: TaskItem[]) => {
    syncTasksDiffToDb(tasks, nextTasks);
    setTasks(nextTasks);
    saveStoredTasks(nextTasks);
  };

  const handleCreateTaskFromReport = (report: FieldReport) => {
    const newTask = createTaskFromReport(
      report,
      currentUser?.fullName || "Cán bộ Ban Điều hành KP3"
    );
    handleTasksChange([newTask, ...tasks]);
  };

  useEffect(() => {
    try {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // Ignore localStorage quota exceeded when storing many compressed images
    }
  }, [reports]);

  // Tự động kiểm tra & nhắc lịch họp cho Cán bộ qua Zalo OA trước 60 phút (mỗi 5 phút khi phiên Cán bộ đang hoạt động)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || currentUser?.role !== "canbo") return;
    let cancelled = false;

    const trigger60mMeetingCheck = async () => {
      try {
        const { data } = await supabase!.auth.getSession();
        const token = data?.session?.access_token;
        if (!token || cancelled) return;
        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "scan_or_send_cadre_meeting_reminders",
            dryRun: false,
            onlyWithinLeadWindow: true,
          }),
        });
      } catch {
        // silent background check
      }
    };

    const initialTimer = window.setTimeout(trigger60mMeetingCheck, 4000);
    const intervalId = window.setInterval(trigger60mMeetingCheck, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
    };
  }, [currentUser?.role]);

  // Phím tắt toàn cục Ctrl+K / Cmd+K mở Bảng điều hướng nhanh (Enterprise Command Palette)
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandModal((s) => !s);
      }
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  // Kiểm tra phiên đăng nhập Supabase Auth thực tế (khử trùng lặp truy vấn user_profiles)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthChecked(true);
      return;
    }

    let mounted = true;
    let inFlightAuthPromise: Promise<VerifiedStaffSession | null> | null = null;

    const syncAuthSession = async () => {
      if (!inFlightAuthPromise) {
        inFlightAuthPromise = getVerifiedStaffSession().finally(() => {
          inFlightAuthPromise = null;
        });
      }
      const session = await inFlightAuthPromise;
      if (!mounted) return;
      updateVerifiedStaff(session);
      setAuthChecked(true);
      if (!session) {
        try {
          localStorage.removeItem("kp3_auth_user");
        } catch {}
      }
    };

    syncAuthSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      syncAuthSession();
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Đồng bộ route từ URL pathname: /dashboard, /dashboard/("sidebar content"), /login
  useEffect(() => {
    const readSavedUser = () => {
      try {
        const savedUserStr = localStorage.getItem("kp3_auth_user");
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.username) return parsed;
        }
      } catch (e) {}
      return null;
    };

    const handleLocationSync = () => {
      const pathname = window.location.pathname;
      setRoutePath(pathname);
      const tab = getTabFromDashboardPath(pathname);
      const activeStaff = verifiedStaffRef.current;

      if (pathname === "/login") {
        if (isSupabaseConfigured && activeStaff) {
          setCurrentUser({
            username: activeStaff.username,
            fullName: activeStaff.fullName,
            role: "canbo",
            phone: activeStaff.phone,
          });
          setActiveTab("cultural");
          setCitizenSubView(null);
          navigate(ROUTES.DASHBOARD_CULTURAL);
          return;
        }
        setCurrentUser(null);
        return;
      }

      if (isSupabaseConfigured) {
        if (!authChecked) return;
        if (activeStaff) {
          const staffUser = {
            username: activeStaff.username,
            fullName: activeStaff.fullName,
            role: "canbo" as const,
            phone: activeStaff.phone,
          };
          setCurrentUser(staffUser);
          if (tab) {
            setActiveTab(tab as ActiveTab);
            setCitizenSubView(null);
          }
        } else if (tab) {
          // Chưa đăng nhập cán bộ trên Supabase Auth -> yêu cầu đăng nhập tại /login
          setCurrentUser(null);
          navigate(ROUTES.LOGIN);
        } else {
          setCurrentUser(PUBLIC_CITIZEN_USER);
          if (pathname.startsWith(`${ROUTES.REFLECTION}/`)) {
            setCitizenSubView("reports");
            setActiveTab("reports");
          } else {
            setCitizenSubView(null);
          }
        }
        return;
      }

      // Fallback khi chạy offline không cấu hình Supabase
      if (tab) {
        const activeUser = readSavedUser() || CANBO_USER;
        setCurrentUser(activeUser);
        setActiveTab(tab as ActiveTab);
        setCitizenSubView(null);
      } else {
        const savedUser = readSavedUser();
        setCurrentUser(savedUser?.role === "canbo" ? savedUser : PUBLIC_CITIZEN_USER);
        if (pathname.startsWith(`${ROUTES.REFLECTION}/`)) {
          setCitizenSubView("reports");
          setActiveTab("reports");
        } else {
          setCitizenSubView(null);
        }
      }
    };

    handleLocationSync();
    window.addEventListener("popstate", handleLocationSync);
    window.addEventListener("app:navigate", handleLocationSync);
    return () => {
      window.removeEventListener("popstate", handleLocationSync);
      window.removeEventListener("app:navigate", handleLocationSync);
    };
  }, [authChecked, verifiedStaff?.userId]);

  const clearSensitiveStaffLocalStorage = () => {
    try {
      const sensitiveKeys = [
        "kp3_auth_user",
        "kp3_associations_data",
        "kp3_welfare_recipients",
        "kp3_welfare_synced_extra_v1",
        "kp3_audit_logs_v1",
        "kp3_tasks_data_v2",
        "kp3_community_schedules",
        "kp3_recurring_reminders",
        "kp3_field_reports_v2",
      ];
      for (const k of sensitiveKeys) {
        localStorage.removeItem(k);
      }
    } catch {}
  };

  useEffect(() => {
    const onSchedulesUpdated = (event: Event) => {
      const custom = event as CustomEvent<ScheduleEvent[]>;
      if (Array.isArray(custom.detail)) {
        setAllSchedules(custom.detail);
        setPublicSchedules(custom.detail.filter((s) => s.isPublicCitizenVisible === true));
      }
    };
    window.addEventListener("kp3:schedules-updated", onSchedulesUpdated);
    return () => window.removeEventListener("kp3:schedules-updated", onSchedulesUpdated);
  }, []);

  // Nạp dữ liệu từ Supabase PostgreSQL (phân quyền Strict RLS cho Khách công khai vs Cán bộ đã xác thực)
  useEffect(() => {
    if (isSupabaseConfigured && !authChecked) return;

    async function fetchSupabaseData() {
      if (!isSupabaseConfigured || !supabase) return;
      const isApprovedStaff = Boolean(verifiedStaffRef.current);
      try {
        setIsDataLoading(true);

        // 0. Nạp cấu hình Cổng thông tin, Sự kiện, Biểu mẫu & Lịch công tác công khai từ Supabase
        const [savedLandingCfg, dbEvents, dbForms, dbSchedules] = await Promise.all([
          loadPortalSetting<Partial<LandingConfig>>(DEFAULT_LANDING_CONFIG_KEY),
          loadCommunityEventsFromDb(),
          loadAdministrativeFormsFromDb(),
          loadSchedulesFromDb(),
        ]);

        if (Array.isArray(dbSchedules)) {
          setAllSchedules(dbSchedules);
          setPublicSchedules(dbSchedules.filter((s) => s.isPublicCitizenVisible === true));
        }

        if (savedLandingCfg && typeof savedLandingCfg === "object") {
          const mergedGuestCfg = mergeLandingConfig(savedLandingCfg);
          if (!isApprovedStaff) {
            const guestReconciledAssocs = sortAssociationsAndMembers(
              reconcileLegacyAssociationsIfNeeded(
                getStoredAssociations(),
                mergedGuestCfg.leadership,
                false
              )
            );
            setAssociationsState(guestReconciledAssocs);
            const guestSyncedLanding =
              mergedGuestCfg.associationLeaders && mergedGuestCfg.associationLeaders.length > 0
                ? mergedGuestCfg
                : syncLandingConfigWithAssociations(mergedGuestCfg, guestReconciledAssocs);
            setLandingConfig(guestSyncedLanding);
          } else {
            setLandingConfig(mergedGuestCfg);
          }
        }
        if (dbEvents && dbEvents.length > 0) {
          setCommunityEvents(dbEvents);
        }
        if (dbForms && dbForms.length > 0) {
          setAdministrativeForms(dbForms);
        }

        // 1 & 2. Fetch Households & Residents song song CHỈ KHI cán bộ đã đăng nhập hợp lệ
        let loadedHouseholds: Household[] = [];
        let mappedResidents: Resident[] = [];

        if (isApprovedStaff) {
          const batchSize = 1000;
          const [
            { data: dbHouseholds, error: hErr },
            firstResPage,
            residentExtendedMeta,
          ] = await Promise.all([
            (supabase as any)
              .from("households")
              .select("*")
              .order("code", { ascending: true }),
            (supabase as any)
              .from("residents")
              .select("*", { count: "exact" })
              .order("created_at", { ascending: false })
              .order("id", { ascending: true })
              .range(0, batchSize - 1),
            loadPortalSetting<Record<string, Record<string, any>>>(RESIDENT_EXTENDED_META_KEY),
          ]);

          if (!hErr && dbHouseholds && dbHouseholds.length > 0) {
            loadedHouseholds = dbHouseholds.map((h: any) => hydrateHouseholdFromDbRow(h));
            setHouseholds(loadedHouseholds);
          }

          let allResidents: any[] = [];
          if (
            !firstResPage.error &&
            Array.isArray(firstResPage.data) &&
            firstResPage.data.length > 0
          ) {
            allResidents = [...firstResPage.data];
            const totalCount =
              typeof firstResPage.count === "number" && firstResPage.count > batchSize
                ? Math.min(firstResPage.count, 25000)
                : firstResPage.data.length === batchSize
                ? 20000
                : firstResPage.data.length;

            if (firstResPage.data.length === batchSize && totalCount > batchSize) {
              const remainingRanges: Array<[number, number]> = [];
              for (let start = batchSize; start < totalCount; start += batchSize) {
                remainingRanges.push([start, start + batchSize - 1]);
              }
              const pageResults = await Promise.all(
                remainingRanges.map(([from, to]) =>
                  (supabase as any)
                    .from("residents")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .order("id", { ascending: true })
                    .range(from, to)
                )
              );
              for (const pageRes of pageResults) {
                if (
                  !pageRes.error &&
                  Array.isArray(pageRes.data) &&
                  pageRes.data.length > 0
                ) {
                  allResidents = allResidents.concat(pageRes.data);
                }
              }
            }
          }

          if (allResidents.length > 0) {
            mappedResidents = allResidents.map((r: any) => {
              const baseRes: Resident = {
                id: r.id,
                fullName: r.full_name,
                gender: (r.gender as "Nam" | "Nữ") || "Nam",
                birthDate: r.birth_date ? r.birth_date.split("-").reverse().join("/") : "Chưa cập nhật",
                cccd: r.cccd,
                phone: r.phone || "",
                status: (r.status as "Thường trú" | "Tạm trú" | "Tạm vắng") || "Thường trú",
                occupation: r.occupation || "",
                address: r.address || r.current_address || r.permanent_address || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
                permanentAddress: r.permanent_address || undefined,
                temporaryAddress: r.current_address || r.address || undefined,
                currentAddress: r.current_address || r.address || undefined,
                fatherName: r.father_name || undefined,
                motherName: r.mother_name || undefined,
                temporaryRegDate: r.temporary_reg_date || undefined,
                temporaryExpDate: r.temporary_exp_date || undefined,
                managementStatus: r.management_status || undefined,
                nationality: r.nationality || undefined,
                householdId: r.household_code || (r.status === "Tạm trú" ? "Tạm trú" : "Chưa cập nhật"),
                relationToOwner: r.relation_to_owner || "Thành viên",
                ownerName: r.owner_name || undefined,
                workplace: r.workplace || undefined,
                avatar: r.gender === "Nữ"
                  ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                  : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
              };
              return applyResidentExtendedMeta(baseRes, residentExtendedMeta);
            });

            let baseEnrichedHouseholds: Household[] = loadedHouseholds;
            if (loadedHouseholds.length > 0) {
              const resByHousehold: { [code: string]: Resident[] } = {};
              mappedResidents.forEach(res => {
                const code = res.householdId?.trim();
                if (code && code !== "Chưa cập nhật" && code !== "Tạm trú" && code !== "N/A") {
                  if (!resByHousehold[code]) resByHousehold[code] = [];
                  resByHousehold[code].push(res);
                }
              });

              baseEnrichedHouseholds = loadedHouseholds.map(h => {
                const allMatched = resByHousehold[h.code] || [];
                if (allMatched.length === 0) return h;

                // Separate core permanent family members from temporary hostel tenants sharing landlord HK code
                const permanentMembers = allMatched.filter(r => r.status !== "Tạm trú");
                const matchedResidents =
                  (h.type || "Thường trú") === "Thường trú" && permanentMembers.length > 0
                    ? permanentMembers
                    : allMatched;

                let owner = matchedResidents.find(r => {
                  const rel = (r.relationToOwner || "").trim().toLowerCase();
                  return rel === "chủ hộ" || r.fullName.trim().toUpperCase() === h.ownerName.trim().toUpperCase();
                }) || matchedResidents[0];

                const membersList = matchedResidents.map(r => {
                  const isOwner = r.cccd === owner.cccd || r.fullName.trim().toUpperCase() === h.ownerName.trim().toUpperCase();
                  const inferredRel = isOwner ? "Chủ hộ" : inferRelationToOwner(r, owner, matchedResidents);
                  return {
                    name: r.fullName,
                    relation: inferredRel,
                    cccd: r.cccd,
                    birthYear: extractBirthYear(r.birthDate),
                    phone: r.phone && r.phone !== "N/A" ? r.phone : undefined
                  };
                });

                return {
                  ...h,
                  ownerName: owner ? owner.fullName : h.ownerName,
                  memberCount: membersList.length,
                  members: membersList
                };
              });
            }

            // Tự động xây dựng & đồng bộ Hộ Tạm Trú (CT08) từ nhân khẩu tạm trú
            const tempBuild = buildTemporaryHouseholdsFromResidents(
              mappedResidents,
              baseEnrichedHouseholds
            );
            mappedResidents = tempBuild.updatedResidents;
            loadedHouseholds = tempBuild.mergedHouseholds;
            setResidents(tempBuild.updatedResidents);
            setHouseholds(tempBuild.mergedHouseholds);
          }
        } else {
          setHouseholds([]);
          setResidents([]);
          setWelfareRecipients([]);
        }

        // 3–7. Tải song song (Promise.all) Businesses, Field Reports, News, Funds, Tasks & Welfare Records để giảm độ trễ mạng
        const reportColumns = isApprovedStaff
          ? "*"
          : "id, title, category, location, description, reporter_name, status, priority, image_urls, response_content, created_at, resolved_at";

        const [
          { data: dbBusinesses },
          { data: dbReports },
          { data: dbNews },
          { data: dbFunds },
          dbTasks,
          dbRecipients,
          dbAssociations,
          businessExtendedMeta,
        ] = await Promise.all([
          (supabase as any).from("businesses").select("*"),
          (supabase as any).from("field_reports").select(reportColumns).order("created_at", { ascending: false }),
          (supabase as any).from("community_news").select("*").order("created_at", { ascending: false }),
          (supabase as any).from("neighborhood_funds").select("*").order("created_at", { ascending: false }),
          isApprovedStaff ? loadTasksFromDb() : Promise.resolve(null),
          isApprovedStaff ? loadWelfareRecord<WelfareRecipient[]>("recipients") : Promise.resolve(null),
          isApprovedStaff ? loadAssociationRecord<Association[]>("associations") : Promise.resolve(null),
          isApprovedStaff
            ? loadPortalSetting<Record<string, any>>(BUSINESS_EXTENDED_META_KEY)
            : Promise.resolve(null),
        ]);

        const deletedBizIds = new Set<string>(
          Array.isArray(businessExtendedMeta?.__deleted_ids__)
            ? businessExtendedMeta.__deleted_ids__.map((x: any) => String(x))
            : []
        );
        const isDeletedBusiness = (biz: {
          id?: string;
          internalCode?: string;
          name?: string;
        }) => {
          if (deletedBizIds.size === 0) return false;
          if (biz.id && deletedBizIds.has(String(biz.id))) return true;
          if (biz.internalCode && deletedBizIds.has(String(biz.internalCode))) return true;
          if (biz.name && deletedBizIds.has("NAME:" + biz.name.trim().toLowerCase())) {
            return true;
          }
          return false;
        };

        if (dbBusinesses && dbBusinesses.length > 0) {
          const loadedBusinesses: Business[] = dbBusinesses
            .map((b: any) => {
              const matchedMock = initialBusinesses.find(ib =>
                (ib.internalCode && ib.internalCode === b.internal_code) ||
                ib.name.trim().toLowerCase() === b.name.trim().toLowerCase() ||
                ib.id === b.id
              );

              const baseBiz: Business = {
                ...(matchedMock || {}),
                id: matchedMock ? matchedMock.id : b.id,
                internalCode: b.internal_code || matchedMock?.internalCode,
                name: b.name,
                taxCode: b.tax_code || matchedMock?.taxCode || "",
                type: (b.business_type as any) || matchedMock?.type || "Hộ kinh doanh",
                businessType: (b.business_type as any) || matchedMock?.businessType || "Hộ kinh doanh",
                industryGroup: b.industry_group || matchedMock?.industryGroup || "Khác",
                owner: b.owner_name || matchedMock?.owner || "",
                phone: isApprovedStaff ? (b.phone || matchedMock?.phone || "") : "",
                address: String(b.address || "")
                  .replace(/,\s*(?:TP\.?|Thành\s*phố)\s*Thủ\s*Đức/gi, "")
                  .replace(/\s{2,}/g, " ")
                  .trim(),
                licenseNumber: b.license_number || matchedMock?.licenseNumber || "",
                status: (b.status as any) || matchedMock?.status || "Đang hoạt động",
                safetyCertified: b.safety_certified ?? matchedMock?.safetyCertified ?? true,
                employeeCount: b.employee_count || matchedMock?.employeeCount || 1,
                coordinates: b.coordinates || matchedMock?.coordinates || "10.7935, 106.7445",
                isAccommodation: b.is_accommodation ?? matchedMock?.isAccommodation ?? false,
                soPhong: b.room_count || matchedMock?.soPhong || 0,
                soNguoiLuuTru: b.guest_count || matchedMock?.soNguoiLuuTru || 0,
                image: matchedMock?.image || b.image_url || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500"
              };
              return isApprovedStaff
                ? applyBusinessExtendedMeta(baseBiz, b, businessExtendedMeta)
                : baseBiz;
            })
            .filter((b) => !isDeletedBusiness(b));

          const existingCodes = new Set(loadedBusinesses.map(b => b.internalCode || b.name));
          initialBusinesses.forEach(ib => {
            if (isDeletedBusiness(ib)) return;
            const key = ib.internalCode || ib.name;
            if (!existingCodes.has(key)) {
              loadedBusinesses.push(ib);
            }
          });

          if (isApprovedStaff && mappedResidents.length > 0) {
            const autoHostels = autoExtractHostelBusinesses(
              mappedResidents,
              loadedBusinesses
            ).filter((hb) => !isDeletedBusiness(hb));
            if (autoHostels.length > 0) {
              loadedBusinesses.push(...autoHostels);
            }
          }

          setBusinesses(loadedBusinesses);

          if (isApprovedStaff && mappedResidents.length > 0 && loadedHouseholds.length > 0) {
            void savePublicKp3StatsToDb({
              households_count: loadedHouseholds.length,
              residents_count: mappedResidents.length,
              permanent_count: mappedResidents.filter(r => r.status === "Thường trú").length,
              temporary_count: mappedResidents.filter(r => r.status === "Tạm trú").length,
              businesses_count: loadedBusinesses.length,
            });
          }
        } else if (deletedBizIds.size > 0) {
          setBusinesses((prev) => prev.filter((b) => !isDeletedBusiness(b)));
        }

        if (dbReports && dbReports.length > 0) {
          setReports(dbReports.map((rep: any) => {
            const createdDate = rep.created_at ? new Date(rep.created_at) : new Date();
            const timeFormatted = formatNowVNString(createdDate);
            const meta = parseReportMetadataFromResponse(rep.response_content);
            const catMeta = getCategoryMeta(rep.category || "Trật tự đô thị");
            const priority: ReportPriority = (rep.priority as ReportPriority) || catMeta.defaultPriority;
            const beforeImgs = meta.beforeImages && meta.beforeImages.length > 0
              ? meta.beforeImages
              : Array.isArray(rep.image_urls) ? rep.image_urls : [];
            const afterImgs = meta.afterImages || [];
            const baseTimeline = [
              {
                time: timeFormatted,
                title: "Tiếp nhận phản ánh",
                description: rep.description || "Hệ thống tự động ghi nhận phản ánh từ Cổng cư dân số.",
                actor: rep.reporter_name || "Cư dân"
              }
            ];
            if (meta.note && (!meta.timeline || meta.timeline.length <= 1)) {
              baseTimeline.push({
                time: rep.resolved_at ? formatNowVNString(new Date(rep.resolved_at)) : timeFormatted,
                title: rep.status === "Đã giải quyết" ? "Đã xử lý hoàn tất" : "Phản hồi từ cán bộ KP3",
                description: meta.note,
                actor: meta.assignedOfficer || "Ban Điều hành KP3"
              });
            }

            return normalizeReport({
              id: rep.id,
              title: rep.title,
              category: (rep.category as any) || "Trật tự đô thị",
              location: rep.location || "Khu phố 3, Phường An Phú",
              description: rep.description || "",
              reporterName: rep.reporter_name || "Cư dân ẩn danh",
              reporterPhone: isApprovedStaff ? (rep.reporter_phone || "") : "",
              status: (rep.status as any) || "Đã tiếp nhận",
              priority,
              slaHours: REPORT_PRIORITY_CONFIG[priority].slaHours,
              slaDeadline: meta.slaDeadline || computeSlaDeadlineIso(priority, createdDate),
              assignedUnit: meta.assignedUnit || catMeta.defaultUnit,
              assignedOfficer: meta.assignedOfficer,
              reportedAt: timeFormatted,
              createdAt: createdDate.toLocaleDateString("vi-VN"),
              resolvedAt: rep.resolved_at ? formatNowVNString(new Date(rep.resolved_at)) : undefined,
              coordinates: { x: 50, y: 50 },
              lat: meta.lat,
              lng: meta.lng,
              timeline: meta.timeline && meta.timeline.length > 0 ? meta.timeline : baseTimeline,
              beforeImages: beforeImgs,
              beforeImage: beforeImgs[0],
              afterImages: afterImgs,
              afterImage: afterImgs[0],
              images: rep.image_urls || beforeImgs,
              messages: meta.messages || [],
              citizenFeedback: meta.citizenFeedback,
            });
          }));
        }

        if (dbNews && dbNews.length > 0) {
          setNewsList(dbNews.map(mapDbNewsToLocal));
        }

        if (dbFunds && dbFunds.length > 0) {
          const thuRows = dbFunds.filter((f: any) => f.transaction_type !== "chi");
          const chiRows = dbFunds.filter((f: any) => f.transaction_type === "chi");

          setFundContributions(
            thuRows.map((f: any) => ({
              id: f.id,
              receiptCode: f.evidence_code || undefined,
              householdCode: f.household_code || "N/A",
              ownerName: f.payer_or_receiver || "Cư dân đóng góp",
              payerType:
                f.household_code && f.household_code !== "N/A"
                  ? "household"
                  : "organization",
              amount: Number(f.amount) || 0,
              fundName: f.fund_name,
              status: f.status === "Chưa nộp" ? "Chưa nộp" : "Đã nộp",
              paidAt:
                f.status !== "Chưa nộp" && f.created_at
                  ? new Date(f.created_at).toLocaleDateString("vi-VN")
                  : undefined,
              note: f.description || undefined,
            }))
          );

          const mappedChi: FundExpenditure[] = chiRows.map((f: any) => ({
            id: f.id,
            voucherCode: f.evidence_code || undefined,
            fundName: f.fund_name,
            title: f.description || f.payer_or_receiver || "Khoản chi hoạt động",
            amount: Number(f.amount) || 0,
            spentAt: f.created_at
              ? new Date(f.created_at).toLocaleDateString("vi-VN")
              : new Date().toLocaleDateString("vi-VN"),
            receiver: f.payer_or_receiver || "Đơn vị thụ hưởng",
            evidence: f.evidence_code || undefined,
            approvedBy:
              f.approved_by ||
              extractKeyLeadersSummary(getStoredAssociations()).partySecretary.name,
          }));

          try {
            const savedLocalExp = localStorage.getItem(FUND_EXPENDITURES_STORAGE_KEY);
            if (savedLocalExp) {
              const parsed = JSON.parse(savedLocalExp);
              if (Array.isArray(parsed) && mappedChi.length === 0) {
                setFundExpenditures(parsed);
              } else {
                setFundExpenditures(mappedChi);
              }
            } else {
              setFundExpenditures(mappedChi);
            }
          } catch {
            setFundExpenditures(mappedChi);
          }
        }

        if (dbTasks && dbTasks.length > 0) {
          setTasks(dbTasks);
        }
        if (Array.isArray(dbRecipients) && dbRecipients.length > 0) {
          setWelfareRecipients(dbRecipients);
        }

        // Đồng bộ 2 chiều Chi bộ/Đoàn thể <-> Cổng Cư dân (Bí thư Chi bộ luôn đứng đầu KP3)
        if (isApprovedStaff) {
          const mergedLandingBase = mergeLandingConfig(savedLandingCfg || undefined);
          const baseAssocs =
            Array.isArray(dbAssociations) && dbAssociations.length > 0
              ? dbAssociations
              : getStoredAssociations();
          const prevPartyLeader = baseAssocs.find((a) => a.id === "ASC_DANG")?.leaderName;
          const reconciledAssocs = reconcileLegacyAssociationsIfNeeded(
            baseAssocs,
            mergedLandingBase.leadership,
            mergedLandingBase.leadershipSyncedV1
          );
          const reconciled =
            reconciledAssocs.find((a) => a.id === "ASC_DANG")?.leaderName !== prevPartyLeader;
          const canonicalAssocs = sortAssociationsAndMembers(reconciledAssocs);
          const syncedLanding = syncLandingConfigWithAssociations(
            mergedLandingBase,
            canonicalAssocs
          );

          setAssociationsState(canonicalAssocs);
          saveStoredAssociations(canonicalAssocs);
          setLandingConfig(syncedLanding);

          // Đồng bộ liên thông chức vụ từ Quản lý Chi hội sang Lịch & Nhiệm vụ ngay khi nạp CSDL
          if (dbTasks && dbTasks.length > 0) {
            const { tasks: syncedTasks, changed: tasksChanged } =
              reconcileTasksWithAssociations(dbTasks, canonicalAssocs);
            if (tasksChanged) {
              setTasks(syncedTasks);
              saveStoredTasks(syncedTasks);
              syncTasksDiffToDb(dbTasks, syncedTasks);
            }
          }

          if (Array.isArray(dbSchedules) && dbSchedules.length > 0) {
            const { schedules: syncedSchedules, changed: schedulesChanged } =
              reconcileSchedulesWithAssociations(dbSchedules, canonicalAssocs);
            if (schedulesChanged) {
              setAllSchedules(syncedSchedules);
              setPublicSchedules(
                syncedSchedules.filter((s) => s.isPublicCitizenVisible === true)
              );
              try {
                localStorage.setItem(
                  "kp3_community_schedules",
                  JSON.stringify(syncedSchedules)
                );
              } catch {}
              syncSchedulesToDb(dbSchedules, syncedSchedules);
            }
          }

          if (
            reconciled ||
            !mergedLandingBase.leadershipSyncedV1 ||
            !mergedLandingBase.associationLeaders?.length
          ) {
            saveAssociationRecord("associations", canonicalAssocs);
            saveLandingConfigToDb(syncedLanding);
          }
        }
      } catch (e) {
        console.warn("Lỗi nạp dữ liệu từ Supabase:", e);
      } finally {
        setIsDataLoading(false);
      }
    }

    fetchSupabaseData();
  }, [authChecked, verifiedStaff?.userId]);

  // New State variables for the 3 additional views
  const [welfareRecipients, setWelfareRecipients] = useState<WelfareRecipient[]>(() => {
    if (isSupabaseConfigured) return [];
    try {
      const saved = localStorage.getItem("kp3_welfare_recipients");
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialWelfareRecipients;
  });
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_community_events");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialCommunityEvents;
  });
  const [associations, setAssociationsState] = useState<Association[]>(() =>
    getStoredAssociations()
  );
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(() => {
    const initialAssocs = getStoredAssociations();
    try {
      const saved = localStorage.getItem(LANDING_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = mergeLandingConfig(JSON.parse(saved));
        return syncLandingConfigWithAssociations(parsed, initialAssocs);
      }
    } catch {}
    return syncLandingConfigWithAssociations(DEFAULT_LANDING_CONFIG, initialAssocs);
  });
  const keyLeaders = React.useMemo(
    () => extractKeyLeadersSummary(associations, landingConfig.leadership || []),
    [associations, landingConfig.leadership]
  );
  useEffect(() => {
    try {
      localStorage.setItem("kp3_community_events", JSON.stringify(communityEvents));
    } catch {}
  }, [communityEvents]);
  useEffect(() => {
    try {
      localStorage.setItem(LANDING_CONFIG_STORAGE_KEY, JSON.stringify(landingConfig));
    } catch {}
  }, [landingConfig]);

  const handleAssociationsChange = (next: Association[]) => {
    const canonical = sortAssociationsAndMembers(next);
    setAssociationsState(canonical);
    saveStoredAssociations(canonical);
    saveAssociationRecord("associations", canonical);

    const nextLeaders = extractKeyLeadersSummary(canonical);
    if (isSupabaseConfigured && supabase && verifiedStaff?.role === "admin" && nextLeaders.partySecretary.name) {
      (supabase as any)
        .from("user_profiles")
        .update({ full_name: `Bí thư ${nextLeaders.partySecretary.name}` })
        .eq("email", "bdhkhupho3.ap@gmail.com")
        .then(() => {})
        .catch(() => {});
    }

    setLandingConfig((prevLanding) => {
      const syncedLanding = syncLandingConfigWithAssociations(prevLanding, canonical);
      try {
        localStorage.setItem(LANDING_CONFIG_STORAGE_KEY, JSON.stringify(syncedLanding));
      } catch {}
      saveLandingConfigToDb(syncedLanding);
      return syncedLanding;
    });

    // Đồng bộ tức thì Lịch công tác & Nhiệm vụ khi đổi Trưởng/Phó tại Quản lý Chi hội
    setTasks((prevTasks) => {
      const { tasks: nextTasks, changed } = reconcileTasksWithAssociations(
        prevTasks,
        canonical
      );
      if (!changed) return prevTasks;
      saveStoredTasks(nextTasks);
      syncTasksDiffToDb(prevTasks, nextTasks);
      return nextTasks;
    });

    setAllSchedules((prevSchedules) => {
      const { schedules: nextSchedules, changed } =
        reconcileSchedulesWithAssociations(prevSchedules, canonical);
      if (!changed) return prevSchedules;
      setPublicSchedules(
        nextSchedules.filter((s) => s.isPublicCitizenVisible === true)
      );
      try {
        localStorage.setItem(
          "kp3_community_schedules",
          JSON.stringify(nextSchedules)
        );
      } catch {}
      syncSchedulesToDb(prevSchedules, nextSchedules);
      return nextSchedules;
    });
  };

  const handleResyncLeadershipFromAssociations = () => {
    const canonical = sortAssociationsAndMembers(associations);
    const syncedLanding = syncLandingConfigWithAssociations(landingConfig, canonical);
    setLandingConfig(syncedLanding);
    try {
      localStorage.setItem(LANDING_CONFIG_STORAGE_KEY, JSON.stringify(syncedLanding));
    } catch {}
    saveLandingConfigToDb(syncedLanding);
  };

  const handleUpdateLandingConfig = (next: LandingConfig) => {
    const normalizedNext = mergeLandingConfig(next);
    // Đồng bộ ngược thay đổi Cán bộ trên Cổng về Chi bộ / Ban Điều hành / Chi hội
    const updatedAssocs = syncPortalLeaderChangeToAssociations(
      associations,
      normalizedNext.leadership || []
    );
    setAssociationsState(updatedAssocs);
    saveStoredAssociations(updatedAssocs);
    saveAssociationRecord("associations", updatedAssocs);

    const finalLanding = syncLandingConfigWithAssociations(normalizedNext, updatedAssocs);
    setLandingConfig(finalLanding);
    try {
      localStorage.setItem(LANDING_CONFIG_STORAGE_KEY, JSON.stringify(finalLanding));
    } catch {}
    saveLandingConfigToDb(finalLanding);
  };
  const [fundContributions, setFundContributions] = useState<FundContribution[]>(initialFundContributions);
  const [fundExpenditures, setFundExpenditures] = useState<FundExpenditure[]>(() => {
    try {
      const saved = localStorage.getItem(FUND_EXPENDITURES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return MOCK_INITIAL_EXPENDITURES;
  });
  const [administrativeForms, setAdministrativeForms] = useState<AdministrativeForm[]>(initialAdministrativeForms);
  const [newsList, setNewsList] = useState<LocalNews[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_local_news");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically hydrate rich images and fields if old cache lacks imageUrl
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].imageUrl) {
          localStorage.setItem("kp3_local_news", JSON.stringify(initialNewsList));
          return initialNewsList;
        }
        return parsed;
      }
      return initialNewsList;
    } catch {
      return initialNewsList;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("kp3_local_news", JSON.stringify(newsList));
    } catch {}
  }, [newsList]);

  const handleAddNews = async (newNews: LocalNews) => {
    setNewsList(prev => [newNews, ...prev]);
    setNotifications(prev => [
      { id: Date.now(), text: `Đã công bố bản tin mới: ${newNews.title}`, unread: true },
      ...prev
    ]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await (supabase as any)
          .from("community_news")
          .insert(serializeLocalNewsToDb(newNews))
          .select()
          .single();

        if (data && !error) {
          setNewsList(prev => prev.map(n => n.id === newNews.id ? { ...n, id: data.id } : n));
        }
      } catch (e) {
        console.warn("Supabase add news error:", e);
      }
    }
  };

  const handleUpdateNews = async (updatedNews: LocalNews) => {
    setNewsList(prev => prev.map(n => n.id === updatedNews.id ? updatedNews : n));
    setNotifications(prev => [
      { id: Date.now(), text: `Đã cập nhật bài viết: ${updatedNews.title}`, unread: true },
      ...prev
    ]);

    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any)
          .from("community_news")
          .update(serializeLocalNewsToDb(updatedNews))
          .eq("id", updatedNews.id);
      } catch (e) {
        console.warn("Supabase update news error:", e);
      }
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    setNewsList(prev => prev.filter(n => n.id !== newsId));

    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any).from("community_news").delete().eq("id", newsId);
      } catch (e) {
        console.warn("Supabase delete news error:", e);
      }
    }
  };

  const handleRefreshNewsList = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data } = await (supabase as any)
        .from("community_news")
        .select("*")
        .order("created_at", { ascending: false });
      if (data && Array.isArray(data)) {
        setNewsList(data.map(mapDbNewsToLocal));
      }
    } catch (e) {
      console.warn("Supabase refresh news error:", e);
    }
  };

  // Target item for GIS Map navigation & sync
  const [targetGisItem, setTargetGisItem] = useState<TargetGisItem | null>(null);

  const handleNavigateToGis = (item: TargetGisItem) => {
    setTargetGisItem(item);
    setActiveTab("gis");
  };

  // Notifications State (Real dynamic operational notifications + session activity)
  const [notifications, setNotifications] = useState<
    Array<{
      id: number | string;
      text: string;
      unread: boolean;
      path?: string;
      tab?: ActiveTab;
    }>
  >([]);
  const [systemAlertsMarkedRead, setSystemAlertsMarkedRead] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const liveOperationalNotifications = useMemo(() => {
    const openReportsCount = reports.filter((r) => r.status !== "Đã giải quyết").length;
    let expiringTempCount = 0;
    for (let i = 0; i < residents.length; i++) {
      const r = residents[i];
      if (r.status === "Tạm trú" && r.temporaryExpDate) {
        if (getTemporaryResidenceExpiryStatus(r.temporaryExpDate).isWarning) {
          expiringTempCount++;
        }
      }
    }
    const openTasksCount = tasks.filter((t) => t.status !== "Hoàn thành").length;

    const items: Array<{
      id: string;
      text: string;
      subtext: string;
      unread: boolean;
      path: string;
      tab: ActiveTab;
    }> = [];

    items.push({
      id: "sys-open-reports",
      text: `${openReportsCount.toLocaleString("vi-VN")} phản ánh 1022 đang chờ / đang xử lý`,
      subtext: "Nhấn để điều phối & cập nhật tiến độ hiện trường",
      unread: !systemAlertsMarkedRead && openReportsCount > 0,
      path: "/dashboard/reports",
      tab: "reports",
    });

    if (currentUser?.role === "canbo") {
      items.push({
        id: "sys-expiring-temp",
        text: `${expiringTempCount.toLocaleString("vi-VN")} nhân khẩu tạm trú sắp hết hạn (≤ 30 ngày)`,
        subtext: "Nhấn để lọc danh sách nhắc gia hạn Mẫu CT01",
        unread: !systemAlertsMarkedRead && expiringTempCount > 0,
        path: "/dashboard/residents?expiry=expiring",
        tab: "residents",
      });

      items.push({
        id: "sys-open-tasks",
        text: `${openTasksCount.toLocaleString("vi-VN")} nhiệm vụ công tác đang mở`,
        subtext: "Nhấn để mở bảng phân công & lịch công tác KP3",
        unread: !systemAlertsMarkedRead && openTasksCount > 0,
        path: "/dashboard/tasks",
        tab: "tasks",
      });
    }

    return items;
  }, [reports, residents, tasks, systemAlertsMarkedRead, currentUser?.role]);

  const hasUnreadNotifications =
    notifications.some((n) => n.unread) ||
    liveOperationalNotifications.some((n) => n.unread);

  useEffect(() => {
    if (!showNotifications) return;
    const onOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNotifications(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [showNotifications]);

  // Form Management Handlers
  const handleAddForm = (newForm: AdministrativeForm) => {
    setAdministrativeForms(prev => [newForm, ...prev]);
    upsertAdministrativeFormToDb(newForm);
    setNotifications(prev => [
      { id: Date.now(), text: `Cán bộ đã thêm biểu mẫu: ${newForm.code} - ${newForm.title}`, unread: true },
      ...prev
    ]);
  };

  const handleUpdateForm = (updatedForm: AdministrativeForm) => {
    setAdministrativeForms(prev => prev.map(f => f.id === updatedForm.id ? updatedForm : f));
    upsertAdministrativeFormToDb(updatedForm);
    setNotifications(prev => [
      { id: Date.now(), text: `Cán bộ đã cập nhật biểu mẫu: ${updatedForm.code}`, unread: true },
      ...prev
    ]);
  };

  const handleDeleteForm = (formId: string) => {
    const f = administrativeForms.find(form => form.id === formId);
    setAdministrativeForms(prev => prev.filter(form => form.id !== formId));
    deleteAdministrativeFormFromDb(formId);
    if (f) {
      setNotifications(prev => [
        { id: Date.now(), text: `Cán bộ đã xóa biểu mẫu: ${f.code}`, unread: true },
        ...prev
      ]);
    }
  };

  const householdsRef = useRef<Household[]>(households);
  useEffect(() => {
    householdsRef.current = households;
  }, [households]);

  const handleHouseholdsChange: React.Dispatch<React.SetStateAction<Household[]>> = (updater) => {
    setHouseholds((prev) => {
      const next = typeof updater === "function" ? (updater as (p: Household[]) => Household[])(prev) : updater;
      if (verifiedStaffRef.current) {
        void syncHouseholdsDiffToDb(prev, next);
      }
      return next;
    });
  };

  const updateResidentsWithSync: React.Dispatch<React.SetStateAction<Resident[]>> = (
    updaterOrNext
  ) => {
    setResidents((prev) => {
      const next =
        typeof updaterOrNext === "function"
          ? (updaterOrNext as (p: Resident[]) => Resident[])(prev)
          : updaterOrNext;
      if (verifiedStaffRef.current || currentUser?.role === "canbo") {
        void syncResidentsDiffToDb(prev, next);
      }
      const tempBuild = buildTemporaryHouseholdsFromResidents(next, householdsRef.current);
      setTimeout(() => {
        setHouseholds(tempBuild.mergedHouseholds);
      }, 0);
      return tempBuild.updatedResidents;
    });
  };

  const handleBusinessesChange: React.Dispatch<React.SetStateAction<Business[]>> = (updater) => {
    setBusinesses((prev) => {
      const next = typeof updater === "function" ? (updater as (p: Business[]) => Business[])(prev) : updater;
      if (verifiedStaffRef.current) {
        void syncBusinessesDiffToDb(prev, next, householdsRef.current);
      }
      return next;
    });
  };

  // Handlers for State Management
  const handleAddResident = (newResident: Resident) => {
    const resWithId: Resident = newResident.id
      ? newResident
      : { ...newResident, id: `R-${Date.now()}` };

    setResidents((prev) => [resWithId, ...prev]);
    if (verifiedStaffRef.current || currentUser?.role === "canbo") {
      void upsertResidentToDb(resWithId);
    }

    // Auto-update household members if matched
    const hhId = resWithId.householdId;
    if (hhId) {
      handleHouseholdsChange((prev) =>
        prev.map((hh) => {
          if (hh.code === hhId) {
            return {
              ...hh,
              memberCount: hh.memberCount + 1,
              members: [
                ...hh.members,
                {
                  name: resWithId.fullName,
                  relation: resWithId.relationToOwner,
                  cccd: resWithId.cccd,
                  phone: resWithId.phone,
                  birthYear: parseInt(resWithId.birthDate.split("/")[2]) || 1990,
                },
              ],
            };
          }
          return hh;
        })
      );
    }
  };

  const handleDeleteResident = (id: string) => {
    const target = residents.find((r) => r.id === id);
    setResidents((prev) => prev.filter((r) => r.id !== id));
    if (verifiedStaffRef.current || currentUser?.role === "canbo") {
      void deleteResidentFromDb(id, target?.cccd);
    }

    if (target) {
      const hhId = target.householdId;
      handleHouseholdsChange((prev) =>
        prev.map((hh) => {
          if (hh.code === hhId) {
            const updatedMembers = hh.members.filter((m) => m.cccd !== target.cccd);
            return {
              ...hh,
              memberCount: updatedMembers.length,
              members: updatedMembers,
            };
          }
          return hh;
        })
      );
    }
  };

  const handleAddHousehold = (newH: Household) => {
    handleHouseholdsChange((prev) => [newH, ...prev]);

    // Chỉ khởi tạo nhân khẩu chủ hộ nếu chưa tồn tại trong danh sách cư dân (tránh tạo trùng khi HouseholdFormPage đã đồng bộ)
    const ownerCccd = (newH.members?.[0]?.cccd || "").trim();
    setResidents((prev) => {
      const alreadyExists = prev.some(
        (r) =>
          (ownerCccd && ownerCccd !== "N/A" && (r.cccd || "").trim() === ownerCccd) ||
          (newH.code && (r.householdId || "").trim() === newH.code.trim())
      );
      if (alreadyExists) return prev;
      const ownerRes: Resident = {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "R" + (prev.length + 1).toString().padStart(4, "0"),
        fullName: newH.ownerName,
        gender: "Nam",
        birthDate: newH.members?.[0]?.birthYear ? `01/01/${newH.members[0].birthYear}` : "",
        cccd: ownerCccd || "N/A",
        phone: newH.members?.[0]?.phone || "N/A",
        status: (newH.type === "Tạm trú" ? "Tạm trú" : "Thường trú") as "Thường trú" | "Tạm trú",
        occupation: "",
        address: newH.address,
        currentAddress: newH.address,
        householdId: newH.code,
        relationToOwner: "Chủ hộ",
        ownerName: newH.ownerName,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        joinDate: new Date().toLocaleDateString("vi-VN"),
      };
      if (verifiedStaffRef.current) {
        void upsertResidentToDb(ownerRes);
      }
      return [ownerRes, ...prev];
    });
  };

  const handleToggleBusinessCertification = (id: string) => {
    handleBusinessesChange((prev) =>
      prev.map((b) => (b.id === id ? { ...b, safetyCertified: !b.safetyCertified } : b))
    );
  };

  const handleUpdateBusinessStatus = (id: string, status: "Đang hoạt động" | "Tạm ngưng" | "Chờ duyệt" | "Chuyển địa điểm" | "Chưa xác minh") => {
    handleBusinessesChange((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  const syncReportToSupabase = async (report: FieldReport, latestNote?: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await (supabase as any)
        .from("field_reports")
        .update({
          title: report.title,
          category: report.category,
          location: report.location,
          description: report.description,
          status: report.status,
          priority: report.priority || "Bình thường",
          image_urls: getBeforeImages(report),
          resolved_at: report.status === "Đã giải quyết" ? new Date().toISOString() : null,
          response_content: serializeReportMetadata(report, latestNote),
        })
        .eq("id", report.id);
    } catch (err) {
      console.warn("Supabase update report error:", err);
    }
  };

  const handleAddReport = async (newReport: FieldReport) => {
    const normalized = normalizeReport(newReport);
    setReports(prev => [normalized, ...prev]);
    setNotifications(prev => [
      { id: Date.now(), text: `Phản ánh mới: "${normalized.title}"`, unread: true },
      ...prev
    ]);

    if (isSupabaseConfigured && supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          normalized.id
        );
        const { data: inserted } = await (supabase as any)
          .from("field_reports")
          .insert({
            ...(isUuid ? { id: normalized.id } : {}),
            title: normalized.title,
            category: normalized.category,
            location: normalized.location,
            description: normalized.description,
            reporter_name: normalized.reporterName,
            reporter_phone: normalized.reporterPhone,
            status: normalized.status,
            priority: normalized.priority || "Bình thường",
            image_urls: getBeforeImages(normalized),
            response_content: serializeReportMetadata(normalized),
          })
          .select("id")
          .maybeSingle();
        if (inserted?.id && inserted.id !== normalized.id) {
          setReports((prev) =>
            prev.map((r) => (r.id === normalized.id ? { ...r, id: inserted.id } : r))
          );
        }
      } catch (err) {
        console.warn("Supabase insert report error:", err);
      }
    }
  };

  const handleUpdateReportStatus = async (
    id: string,
    status: FieldReport["status"],
    actorName: string = "Cán bộ quản lý",
    actionDetail: string = "Cập nhật tiến độ xử lý phản ánh.",
    afterImages?: string[]
  ) => {
    let updatedItem: FieldReport | null = null;
    setReports(prev => prev.map(r => {
      if (r.id !== id) return r;
      const timeStr = formatNowVNString();
      const mergedAfter = afterImages && afterImages.length > 0
        ? Array.from(new Set(afterImages))
        : r.afterImages || (r.afterImage ? [r.afterImage] : []);
      const statusMsg: ReportMessage = {
        id: `MSG-SYS-${Date.now()}`,
        senderRole: "canbo",
        senderName: actorName,
        senderTitle: "Ban Điều hành KP3",
        content: actionDetail,
        images: status === "Đã giải quyết" && mergedAfter.length > 0 ? mergedAfter : undefined,
        createdAt: timeStr,
        isInternal: false,
      };
      updatedItem = {
        ...r,
        status,
        resolvedAt: status === "Đã giải quyết" ? timeStr : r.resolvedAt,
        afterImages: mergedAfter,
        afterImage: mergedAfter[0],
        timeline: [
          ...r.timeline,
          {
            time: timeStr,
            title: status === "Đang xử lý" ? "Xác minh & Đang giải quyết" : "Đã xử lý hoàn thành",
            description: actionDetail,
            actor: actorName
          }
        ],
        messages: [...(r.messages || []), statusMsg],
      };
      return updatedItem;
    }));

    if (updatedItem) {
      await syncReportToSupabase(updatedItem, actionDetail);
    }
  };

  const handleEditReport = async (updated: FieldReport) => {
    const normalized = normalizeReport(updated);
    setReports(prev => prev.map(r => (r.id === normalized.id ? normalized : r)));
    await syncReportToSupabase(normalized);
  };

  const handleDeleteReport = async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any).from("field_reports").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete report error:", err);
      }
    }
  };

  const handleAddReportMessage = async (reportId: string, msg: ReportMessage) => {
    let updatedItem: FieldReport | null = null;
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      updatedItem = { ...r, messages: [...(r.messages || []), msg] };
      return updatedItem;
    }));
    if (!msg.isInternal) {
      setNotifications(prev => [
        { id: Date.now(), text: `${msg.senderName} vừa nhắn tin trong hồ sơ ${reportId}`, unread: true },
        ...prev
      ]);
    }
    if (updatedItem) {
      await syncReportToSupabase(updatedItem, msg.content);
    }
  };

  const handleAssignOrPriorityReport = async (
    reportId: string,
    updates: { assignedUnit?: string; priority?: ReportPriority }
  ) => {
    let updatedItem: FieldReport | null = null;
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const nextPrio = updates.priority || r.priority || "Bình thường";
      updatedItem = {
        ...r,
        assignedUnit: updates.assignedUnit ?? r.assignedUnit,
        priority: nextPrio,
        slaHours: REPORT_PRIORITY_CONFIG[nextPrio].slaHours,
      };
      return updatedItem;
    }));
    if (updatedItem) {
      await syncReportToSupabase(updatedItem);
    }
  };

  const handleSubmitReportFeedback = async (reportId: string, rating: number, comment: string) => {
    let updatedItem: FieldReport | null = null;
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      updatedItem = {
        ...r,
        citizenFeedback: {
          rating,
          comment: comment.trim(),
          satisfied: rating >= 3,
          submittedAt: formatNowVNString(),
        }
      };
      return updatedItem;
    }));
    if (updatedItem) {
      await syncReportToSupabase(updatedItem);
    }
  };

  const handleReopenReport = async (reportId: string, reason: string, actorName: string) => {
    let updatedItem: FieldReport | null = null;
    const timeStr = formatNowVNString();
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      updatedItem = {
        ...r,
        status: "Đang xử lý",
        timeline: [
          ...r.timeline,
          {
            time: timeStr,
            title: "Cư dân đề nghị kiểm tra lại",
            description: reason,
            actor: actorName,
          }
        ],
        messages: [
          ...(r.messages || []),
          {
            id: `MSG-REOPEN-${Date.now()}`,
            senderRole: "citizen",
            senderName: actorName,
            senderTitle: "Cư dân",
            content: `[Đề nghị kiểm tra lại] ${reason}`,
            createdAt: timeStr,
            isInternal: false,
          }
        ]
      };
      return updatedItem;
    }));
    setNotifications(prev => [
      { id: Date.now(), text: `Cư dân đề nghị mở lại hồ sơ ${reportId}`, unread: true },
      ...prev
    ]);
    if (updatedItem) {
      await syncReportToSupabase(updatedItem, reason);
    }
  };

  const handleAddWelfareRecipient = (newRec: WelfareRecipient) => {
    setWelfareRecipients((prev) => {
      if (prev.some((w) => w.id === newRec.id)) return prev;
      const updated = [newRec, ...prev];
      try {
        localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated));
      } catch {}
      void saveWelfareRecord("recipients", updated);
      return updated;
    });
  };

  const handleUpdateWelfareStatus = (id: string, status: WelfareRecipient["status"]) => {
    setWelfareRecipients((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, status } : w));
      try {
        localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated));
      } catch {}
      void saveWelfareRecord("recipients", updated);
      return updated;
    });
  };

  const handleUpdateWelfareRecipient = (updatedRec: WelfareRecipient) => {
    setWelfareRecipients((prev) => {
      const updated = prev.map((w) => (w.id === updatedRec.id ? updatedRec : w));
      try {
        localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated));
      } catch {}
      void saveWelfareRecord("recipients", updated);
      return updated;
    });
  };

  const handleDeleteWelfareRecipient = (id: string) => {
    setWelfareRecipients((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      try {
        localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated));
      } catch {}
      void saveWelfareRecord("recipients", updated);
      return updated;
    });
  };

  const handleAddCommunityEvent = (newEvent: CommunityEvent) => {
    setCommunityEvents(prev => [newEvent, ...prev]);
    upsertCommunityEventToDb(newEvent);
  };

  const handleUpdateEventStatus = (id: string, status: CommunityEvent["status"]) => {
    setCommunityEvents(prev => {
      const next = prev.map(e => e.id === id ? { ...e, status } : e);
      const changed = next.find(e => e.id === id);
      if (changed) upsertCommunityEventToDb(changed);
      return next;
    });
  };

  const handleUpdateCommunityEvent = (updatedEvent: CommunityEvent) => {
    setCommunityEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    upsertCommunityEventToDb(updatedEvent);
  };

  const handleDeleteCommunityEvent = (eventId: string) => {
    setCommunityEvents(prev => prev.filter(e => e.id !== eventId));
    deleteCommunityEventFromDb(eventId);
  };

  const handleUpdateFundContribution = async (updatedCont: FundContribution) => {
    setFundContributions(prev => prev.map(c => c.id === updatedCont.id ? updatedCont : c));
    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any)
          .from("neighborhood_funds")
          .update({
            fund_name: updatedCont.fundName,
            household_code: updatedCont.householdCode,
            payer_or_receiver: updatedCont.ownerName,
            amount: updatedCont.amount,
            description: updatedCont.note || `Đóng góp ${updatedCont.fundName}`,
            status: updatedCont.status,
          })
          .eq("id", updatedCont.id);
      } catch (err) {
        console.warn("Supabase update contribution error:", err);
      }
    }
  };

  const handleDeleteFundContribution = async (id: string) => {
    setFundContributions(prev => prev.filter(c => c.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any).from("neighborhood_funds").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete contribution error:", err);
      }
    }
  };

  const handleUpdateFundExpenditure = async (updatedExp: FundExpenditure) => {
    setFundExpenditures(prev => {
      const next = prev.map(e => e.id === updatedExp.id ? updatedExp : e);
      try {
        localStorage.setItem(FUND_EXPENDITURES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any)
          .from("neighborhood_funds")
          .update({
            fund_name: updatedExp.fundName,
            payer_or_receiver: updatedExp.receiver,
            amount: updatedExp.amount,
            description: updatedExp.title,
            evidence_code: updatedExp.evidence || updatedExp.voucherCode,
            approved_by: updatedExp.approvedBy,
          })
          .eq("id", updatedExp.id);
      } catch (err) {
        console.warn("Supabase update expenditure error:", err);
      }
    }
  };

  const handleBatchAddFundContributions = async (newItems: FundContribution[]) => {
    if (!newItems || newItems.length === 0) return;
    setFundContributions((prev) => [...newItems, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const chunkSize = 500;
        for (let i = 0; i < newItems.length; i += chunkSize) {
          const chunk = newItems.slice(i, i + chunkSize).map((newCont) => ({
            id: newCont.id,
            transaction_type: "thu",
            fund_name: newCont.fundName,
            household_code: newCont.householdCode,
            payer_or_receiver: newCont.ownerName,
            amount: newCont.amount,
            description: newCont.note || `Đóng góp ${newCont.fundName}`,
            evidence_code:
              newCont.receiptCode || `PT-${Date.now().toString().slice(-4)}`,
            status: newCont.status || "Chưa nộp",
            approved_by: "Ban điều hành KP3",
          }));
          await (supabase as any).from("neighborhood_funds").insert(chunk);
        }
      } catch (err) {
        console.warn("Supabase batch insert fund error:", err);
      }
    }
  };

  const handleAddFundContribution = async (newCont: FundContribution) => {
    setFundContributions(prev => [newCont, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await (supabase as any)
          .from("neighborhood_funds")
          .insert({
            transaction_type: "thu",
            fund_name: newCont.fundName,
            household_code: newCont.householdCode,
            payer_or_receiver: newCont.ownerName,
            amount: newCont.amount,
            description: newCont.note || `Đóng góp ${newCont.fundName}`,
            evidence_code: newCont.receiptCode || `PT-${Date.now().toString().slice(-4)}`,
            status: newCont.status || "Đã nộp",
            approved_by: "Ban điều hành KP3"
          })
          .select("id")
          .single();

        if (data?.id) {
          setFundContributions(prev =>
            prev.map(c => (c.id === newCont.id ? { ...c, id: data.id } : c))
          );
        }
      } catch (err) {
        console.warn("Supabase insert fund error:", err);
      }
    }
  };

  const handleUpdateContributionStatus = async (id: string, status: FundContribution["status"], paidAt?: string) => {
    setFundContributions(prev => prev.map(c => c.id === id ? { ...c, status, paidAt } : c));

    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any)
          .from("neighborhood_funds")
          .update({ status })
          .eq("id", id);
      } catch (err) {
        console.warn("Supabase update fund status error:", err);
      }
    }
  };

  const handleAddFundExpenditure = async (newExp: FundExpenditure) => {
    setFundExpenditures(prev => {
      const next = [newExp, ...prev];
      try {
        localStorage.setItem(FUND_EXPENDITURES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await (supabase as any)
          .from("neighborhood_funds")
          .insert({
            transaction_type: "chi",
            fund_name: newExp.fundName,
            household_code: "CHI-KP3",
            payer_or_receiver: newExp.receiver,
            amount: newExp.amount,
            description: newExp.title,
            evidence_code: newExp.evidence || newExp.voucherCode || `PC-${Date.now().toString().slice(-4)}`,
            status: "Đã nộp",
            approved_by: newExp.approvedBy
          })
          .select("id")
          .single();

        if (data?.id) {
          setFundExpenditures(prev => {
            const next = prev.map(e => (e.id === newExp.id ? { ...e, id: data.id } : e));
            try {
              localStorage.setItem(FUND_EXPENDITURES_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      } catch (err) {
        console.warn("Supabase insert expenditure error:", err);
      }
    }
  };

  const handleDeleteFundExpenditure = async (id: string) => {
    setFundExpenditures(prev => {
      const next = prev.filter(e => e.id !== id);
      try {
        localStorage.setItem(FUND_EXPENDITURES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await (supabase as any).from("neighborhood_funds").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete expenditure error:", err);
      }
    }
  };

  const handleSyncRenamedFund = async (oldNames: string[], newName: string) => {
    const oldSet = new Set(oldNames.map(n => normalizeFundKey(n)));
    setFundContributions(prev =>
      prev.map(c => (oldSet.has(normalizeFundKey(c.fundName)) ? { ...c, fundName: newName } : c))
    );
    setFundExpenditures(prev => {
      const next = prev.map(e =>
        oldSet.has(normalizeFundKey(e.fundName)) ? { ...e, fundName: newName } : e
      );
      try {
        localStorage.setItem(FUND_EXPENDITURES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        for (const oldName of oldNames) {
          await (supabase as any)
            .from("neighborhood_funds")
            .update({ fund_name: newName })
            .eq("fund_name", oldName);
        }
      } catch (err) {
        console.warn("Supabase sync fund rename error:", err);
      }
    }
  };

  const handleApproveRegistration = (reg: PendingRegistration) => {
    const newRes: Resident = {
      id: "R" + (residents.length + 1).toString().padStart(3, "0"),
      fullName: reg.fullName,
      gender: reg.gender,
      birthDate: reg.birthDate,
      cccd: reg.cccd,
      phone: reg.phone,
      status: reg.status as "Thường trú" | "Tạm trú",
      occupation: reg.occupation,
      address: reg.address,
      householdId: reg.householdId,
      relationToOwner: reg.relationToOwner,
      avatar: reg.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      joinDate: new Date().toLocaleDateString("vi-VN")
    };

    setResidents((prev) => [newRes, ...prev]);
    if (verifiedStaffRef.current || currentUser?.role === "canbo") {
      void upsertResidentToDb(newRes);
    }

    handleHouseholdsChange((prev) =>
      prev.map((hh) => {
        if (hh.code === reg.householdId) {
          return {
            ...hh,
            memberCount: hh.memberCount + 1,
            members: [
              ...hh.members,
              {
                name: reg.fullName,
                relation: reg.relationToOwner,
                cccd: reg.cccd,
                phone: reg.phone,
                birthYear: parseInt(reg.birthDate.split("/")[2]) || 1995,
              },
            ],
          };
        }
        return hh;
      })
    );

    setPendingRegistrations(pendingRegistrations.filter(r => r.id !== reg.id));

    setNotifications([
      { id: Date.now(), text: `Đã duyệt nhập khẩu thành công cho ${reg.fullName} vào hộ ${reg.householdId}`, unread: true },
      ...notifications
    ]);
  };

  const handleRejectRegistration = (id: string) => {
    setPendingRegistrations(pendingRegistrations.filter(r => r.id !== id));
  };

  // Tab Title helper
  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard": return "Bảng Điều Hành Tổng Quan";
      case "residents": return "Quản lý Nhân Khẩu & Dân cư";
      case "households": return "Hệ thống Quản lý Sổ Hộ khẩu";
      case "enterprises": return "Quản lý Doanh nghiệp";
      case "businesses": return "Quản lý Cơ sở Kinh doanh KP3";
      case "gis": return "Bản đồ số không gian GIS";
      case "tasks": return "Lịch Công Tác & Nhiệm Vụ KP3";
      case "ai": return "Hỏi đáp tự động Trợ lý AI";
      case "reports": return "Tiếp nhận Phản ánh Hiện trường 1022";
      case "party": return "Công tác Đảng & Dân vận mặt trận";
      case "welfare": return "An sinh Xã hội & Trợ cấp";
      case "cultural": return "Tin tức & Sự kiện";
      case "finance": return "Quỹ Tự quản & Đóng góp Khu phố";
      case "plan": return "Đề án & Thiết kế Kiến trúc Cơ sở dữ liệu";
      case "settings": return "Cấu hình Hệ thống & Duyệt hồ sơ";
      default: return "Hệ thống Quản lý";
    }
  };

  const getSubrouteActionLabel = (pathname: string, tab: ActiveTab): string | null => {
    const basePath = getDashboardExtensionPath(tab);
    if (!pathname || pathname === basePath || pathname === `${basePath}/`) return null;
    if (pathname.includes("/add-member/")) return "Thêm nhân khẩu vào hộ";
    if (pathname.endsWith("/new") || pathname.includes("/new/")) return "Thêm mới hồ sơ";
    if (pathname.includes("/edit/")) return "Chỉnh sửa hồ sơ";
    if (pathname.includes("/resolve/")) return "Nghiệm thu & Xử lý";
    if (pathname.includes("/detail/")) return "Chi tiết hồ sơ";
    return null;
  };

  const staffRoleLabel =
    verifiedStaff?.role === "admin"
      ? "Quản trị viên KP3"
      : verifiedStaff
      ? "Cán bộ KP3"
      : "Ban Điều hành KP3";

  const isMasterSecretaryAccount = Boolean(
    currentUser?.role === "canbo" &&
      (verifiedStaff?.email?.toLowerCase() === "bdhkhupho3.ap@gmail.com" ||
        currentUser?.username?.toLowerCase() === "bdhkhupho3.ap@gmail.com" ||
        currentUser?.username === "canbo" ||
        currentUser?.fullName?.startsWith("Bí thư "))
  );

  const effectiveStaffName =
    isMasterSecretaryAccount && keyLeaders.partySecretary.name
      ? `Bí thư ${keyLeaders.partySecretary.name}`
      : currentUser?.fullName || "Cán bộ KP3";

  const displayCurrentUser =
    currentUser && currentUser.role === "canbo"
      ? { ...currentUser, fullName: effectiveStaffName }
      : currentUser;

  const staffInitials = (effectiveStaffName || "KP")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  if (isSupabaseConfigured && !authChecked && Boolean(getTabFromDashboardPath(routePath))) {
    return (
      <LoadingFade
        variant="screen"
        title="Đang xác thực phiên làm việc..."
        subtitle="Hệ thống Quản lý Thông minh Khu phố 3 An Phú"
      />
    );
  }

  if (!currentUser) {
    return (
      <Suspense
        fallback={
          <LoadingFade
            variant="screen"
            title="Đang tải cổng đăng nhập..."
            subtitle="Hệ thống Quản lý Thông minh Khu phố 3 An Phú"
          />
        }
      >
        <LoginAndRegister
          onLoginSuccess={(user) => {
            if (user.staffSession) {
              updateVerifiedStaff(user.staffSession);
            }
            const cleanUser = {
              username: user.username,
              fullName: user.fullName,
              role: user.role,
              cccd: user.cccd,
              householdCode: user.householdCode,
              phone: user.phone,
            };
            setCurrentUser(cleanUser);
            try {
              localStorage.setItem("kp3_auth_user", JSON.stringify(cleanUser));
            } catch (e) {}
            if (cleanUser.role === "canbo") {
              setActiveTab("dashboard");
              navigate(ROUTES.DASHBOARD);
            } else {
              navigate(ROUTES.HOME);
            }
          }}
          onRegisterSubmit={(newReg) => {
            setPendingRegistrations([newReg, ...pendingRegistrations]);
          }}
          householdCodes={households.map(h => h.code)}
          partySecretaryName={keyLeaders.partySecretary.name}
          onBackToLanding={() => {
            setCurrentUser(PUBLIC_CITIZEN_USER);
            setCitizenSubView(null);
            navigate(ROUTES.HOME);
          }}
        />
      </Suspense>
    );
  }

  const isDashboardUrl = Boolean(getTabFromDashboardPath(routePath));

  // 1. CỔNG NGƯỜI DÂN (LANDING PAGE) LÀ TRANG CHỦ MẶC ĐỊNH (giữ quyền Admin sửa khi Cán bộ đang đăng nhập)
  if ((currentUser.role === "nguoidan" || !isDashboardUrl) && !citizenSubView) {
    const isAdminUser = currentUser.role === "canbo";
    return (
      <Suspense
        fallback={
          <LoadingFade
            variant="screen"
            title="Đang tải Cổng Cư dân số..."
            subtitle="Khu phố 3, Phường An Phú"
          />
        }
      >
        <CitizenLandingPage
          residents={residents}
          households={households}
          businesses={businesses}
          reports={reports}
          forms={administrativeForms}
          events={communityEvents}
          publicSchedules={publicSchedules}
          news={newsList}
          isAdmin={isAdminUser}
          adminName={isAdminUser ? effectiveStaffName : undefined}
          landingConfig={landingConfig}
          onUpdateLandingConfig={handleUpdateLandingConfig}
          onAddNews={handleAddNews}
          onUpdateNews={handleUpdateNews}
          onDeleteNews={handleDeleteNews}
          onRefreshNews={handleRefreshNewsList}
          onAddEvent={handleAddCommunityEvent}
          onUpdateEvent={handleUpdateCommunityEvent}
          onDeleteEvent={handleDeleteCommunityEvent}
          onAddReport={handleAddReport}
          onOpenStaffLogin={() => {
            if (isAdminUser) {
              setActiveTab("dashboard");
              setCitizenSubView(null);
              navigate(ROUTES.DASHBOARD);
            } else {
              setCurrentUser(null);
              navigate(ROUTES.LOGIN);
            }
          }}
          onOpenDashboard={() => {
            setActiveTab("cultural");
            setCitizenSubView(null);
            navigate(ROUTES.DASHBOARD_CULTURAL);
          }}
          onLogoutAdmin={() => {
            clearSensitiveStaffLocalStorage();
            if (supabase) {
              supabase.auth.signOut().catch(() => {});
            }
            updateVerifiedStaff(null);
            setCurrentUser(PUBLIC_CITIZEN_USER);
            navigate(ROUTES.HOME);
          }}
          onSwitchToCanBo={() => {
            if (isAdminUser && (!isSupabaseConfigured || verifiedStaff)) {
              setActiveTab("cultural");
              setCitizenSubView(null);
              navigate(ROUTES.DASHBOARD_CULTURAL);
              return;
            }
            if (isSupabaseConfigured) {
              setCurrentUser(null);
              setCitizenSubView(null);
              navigate(ROUTES.LOGIN);
              return;
            }
            try {
              localStorage.setItem("kp3_auth_user", JSON.stringify(CANBO_USER));
            } catch {}
            setCurrentUser(CANBO_USER);
            setActiveTab("cultural");
            setCitizenSubView(null);
            navigate(ROUTES.DASHBOARD_CULTURAL);
          }}
          onNavigateToTab={(tab) => {
            if (isAdminUser) {
              setActiveTab(tab);
              setCitizenSubView(null);
              navigate(getDashboardExtensionPath(tab));
            } else {
              setCitizenSubView(tab);
              setActiveTab(tab);
            }
          }}
        />
      </Suspense>
    );
  }

  // 2. KHI CƯ DÂN ĐANG XEM TIỆN ÍCH CHI TIẾT (GIS, AI, QUỸ, BIỂU MẪU...)
  if (currentUser.role === "nguoidan" && citizenSubView) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Citizen Subview Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCitizenSubView(null);
                setActiveTab("dashboard");
                navigate(ROUTES.HOME);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Quay lại Cổng Thông Tin Cư Dân"
            >
              <span>← Trang Chủ Cổng Cư Dân</span>
            </button>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-[#073B72] truncate max-w-[200px] sm:max-w-md">
                {getTabTitle()}
              </h2>
              <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
                • KP3, An Phú
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isSupabaseConfigured && !verifiedStaff) {
                  setCurrentUser(null);
                  setCitizenSubView(null);
                  navigate(ROUTES.LOGIN);
                  return;
                }
                setCurrentUser(CANBO_USER);
                setActiveTab("cultural");
                setCitizenSubView(null);
                navigate(ROUTES.DASHBOARD_CULTURAL);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#073B72] hover:bg-[#005BAC] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Vào Cổng dành cho cán bộ quản lý"
            >
              <LockKeyhole size={13} className="text-blue-300" />
              <span>Cổng cán bộ</span>
            </button>
          </div>
        </header>

        {/* Subview Content */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto max-w-7xl w-full mx-auto min-w-0">
          <AppErrorBoundary fallbackTab={`${citizenSubView}:${routePath}`} onReset={() => setActiveTab(citizenSubView)}>
            <Suspense fallback={<LoadingFade variant="inline" title="Đang tải phân hệ..." subtitle="KP3 Smart City" />}>
            {citizenSubView === "gis" && (
              <GisMap
                households={households}
                onUpdateHouseholds={() => {}}
                residents={residents}
                onUpdateResidents={() => {}}
                businesses={businesses}
                onUpdateBusinesses={() => {}}
                reports={reports}
                targetGisItem={targetGisItem}
                onClearTargetGisItem={() => setTargetGisItem(null)}
                onNavigateToReport={() => setCitizenSubView("reports")}
                readOnly={true}
              />
            )}
            {citizenSubView === "ai" && (
              <AiAssistant
                currentUser={currentUser}
                context={{
                  residents,
                  households,
                  businesses,
                  reports,
                  welfareRecipients,
                  fundContributions,
                  fundExpenditures,
                  communityEvents,
                  tasks,
                  leadership: landingConfig.leadership,
                }}
              />
            )}
            {citizenSubView === "finance" && (
              <NeighborhoodFunds
                contributions={fundContributions}
                expenditures={fundExpenditures}
                onAddContribution={handleAddFundContribution}
                onUpdateContributionStatus={() => {}}
                households={households}
                defaultApproverName={keyLeaders.partySecretary.name}
                readOnly={true}
              />
            )}
            {citizenSubView === "forms" && (
              <AdministrativeForms
                forms={administrativeForms}
                onAddForm={() => {}}
                onUpdateForm={() => {}}
                onDeleteForm={() => {}}
                currentUser={currentUser}
                {...({ readOnly: true } as any)}
              />
            )}
            {citizenSubView === "reports" && (
              <ReportsPage
                reports={reports}
                residents={residents}
                households={households}
                isDataLoading={isDataLoading}
                basePath={ROUTES.REFLECTION}
                onAddReport={handleAddReport}
                onUpdateReportStatus={() => {}}
                onUpdateReports={() => {}}
                onAddMessage={handleAddReportMessage}
                onSubmitFeedback={handleSubmitReportFeedback}
                onReopenReport={handleReopenReport}
                onNavigateToGis={(item) => {
                  setTargetGisItem(item);
                  setCitizenSubView("gis");
                }}
                currentUser={currentUser}
                readOnly={true}
              />
            )}
            {citizenSubView === "party" && (
              <PartyPage
                partyMembers={partyMembers}
                residents={residents}
                associations={associations}
                onAssociationsChange={() => {}}
                basePath="/citizen/party"
                {...({ readOnly: true } as any)}
              />
            )}
            {citizenSubView === "welfare" && (
              <SocialWelfare
                recipients={welfareRecipients}
                onUpdateStatus={() => {}}
                onAddRecipient={() => {}}
                onUpdateRecipient={() => {}}
                onDeleteRecipient={() => {}}
                residents={residents}
                {...({ readOnly: true } as any)}
              />
            )}
            {citizenSubView === "cultural" && (
              <CulturalPage
                events={communityEvents}
                onAddEvent={() => {}}
                onUpdateEventStatus={() => {}}
                onUpdateEvent={() => {}}
                onDeleteEvent={() => {}}
                newsList={newsList}
                onAddNews={() => {}}
                onUpdateNews={() => {}}
                onDeleteNews={() => {}}
                {...({ readOnly: true } as any)}
              />
            )}
            {citizenSubView === "plan" && (
              <PlanArchitecture />
            )}
            </Suspense>
          </AppErrorBoundary>
        </main>
      </div>
    );
  }

  // 3. CỔNG CÁN BỘ QUẢN LÝ (KHU VỰC NGHIỆP VỤ RIÊNG)
  const subrouteActionLabel = getSubrouteActionLabel(routePath, activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          navigate(getDashboardExtensionPath(tab));
        }}
        currentUser={displayCurrentUser || currentUser}
        staffRoleLabel={staffRoleLabel}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        onLogout={() => {
          clearSensitiveStaffLocalStorage();
          if (supabase) {
            supabase.auth.signOut().catch(() => {});
          }
          updateVerifiedStaff(null);
          setCurrentUser(null);
          navigate(ROUTES.LOGIN);
        }}
        onSwitchRole={() => {
          if (currentUser.role === "nguoidan") {
            setCurrentUser(CANBO_USER);
            setActiveTab("cultural");
            navigate(ROUTES.DASHBOARD_CULTURAL);
          } else {
            // Giữ nguyên kp3_auth_user để Cán bộ Admin có thể chỉnh sửa trực tiếp trên Landing Page
            setCitizenSubView(null);
            navigate(ROUTES.HOME);
          }
        }}
        residentPermissions={residentPermissions}
      />

      <QuickCommandModal
        isOpen={showCommandModal}
        onClose={() => setShowCommandModal(false)}
        isStaff={currentUser.role === "canbo"}
        residents={residents}
        households={households}
        businesses={businesses}
        reports={reports}
        tasks={tasks}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCitizenSubView(null);
          navigate(getDashboardExtensionPath(tab));
        }}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"} min-w-0 transition-all duration-300`}>

        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shrink-0 transition-colors">
          <div className="flex items-center gap-1.5 sm:gap-2 pl-12 lg:pl-0 flex-1 min-w-0 mr-2 sm:mr-3">
            <span className="hidden sm:inline text-xs font-semibold text-emerald-700 shrink-0 select-none">
              KP3 An Phú ›
            </span>
            {subrouteActionLabel ? (
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate(getDashboardExtensionPath(activeTab))}
                  className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-700 transition-colors truncate max-w-[140px] sm:max-w-[260px] cursor-pointer"
                  title={`Quay lại ${getTabTitle()}`}
                >
                  {getTabTitle()}
                </button>
                <ChevronRight size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                <h2 className="font-bold text-slate-900 text-xs sm:text-sm lg:text-base tracking-tight truncate min-w-0">
                  {subrouteActionLabel}
                </h2>
              </nav>
            ) : (
              <h2 className="font-bold text-slate-900 text-sm sm:text-base lg:text-lg tracking-tight leading-snug truncate min-w-0 flex-1">
                {currentUser.role === "nguoidan" && activeTab === "dashboard" ? "Cổng Dịch Vụ Cư Dân Số" : getTabTitle()}
              </h2>
            )}
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Command Palette Trigger (Ctrl+K) */}
            <button
              id="header-quick-command"
              type="button"
              aria-label="Tìm kiếm và chuyển nhanh phân hệ (Ctrl+K)"
              onClick={() => setShowCommandModal(true)}
              className="h-10 w-10 md:w-auto md:px-3 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer shrink-0"
              title="Tìm nhanh phân hệ & thao tác (Ctrl+K)"
            >
              <Search size={15} className="text-slate-500 shrink-0" />
              <span className="hidden md:inline text-slate-500">Tìm nhanh...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-500">
                Ctrl K
              </kbd>
            </button>

            {/* Info button for Plan & Database design */}
            <Link
              to={getDashboardExtensionPath("plan")}
              id="header-info-plan"
              aria-label="Đề án & Thiết kế Kiến trúc Cơ sở dữ liệu"
              onClick={() => {
                setActiveTab("plan");
                navigate(getDashboardExtensionPath("plan"));
              }}
              className={`hidden sm:inline-flex h-10 w-10 text-xs items-center justify-center rounded-lg border transition-colors cursor-pointer relative ${
                activeTab === "plan"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Đề án & Thiết kế Kiến trúc Cơ sở dữ liệu (/dashboard/plan)"
            >
              <Info size={18} />
            </Link>

            {/* Notifications panel toggle button */}
            <div ref={notificationsRef} className="relative">
              <button
                id="header-notifications"
                type="button"
                aria-expanded={showNotifications}
                aria-haspopup="true"
                aria-label="Mở danh sách thông báo"
                onClick={() => setShowNotifications((s) => !s)}
                className="h-10 w-10 text-xs inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-transparent transition-colors cursor-pointer relative"
              >
                <Bell size={18} />
                {hasUnreadNotifications && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <span className="font-bold text-xs text-slate-800">Thông báo điều hành KP3</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSystemAlertsMarkedRead(true);
                        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer py-1 px-1.5 rounded"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>
                  <div className="py-1 divide-y divide-slate-100 max-h-64 overflow-y-auto evon-scroll">
                    {liveOperationalNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          setActiveTab(item.tab);
                          if (item.path.includes("?")) {
                            window.history.pushState({}, "", item.path);
                            window.dispatchEvent(new PopStateEvent("popstate"));
                            window.dispatchEvent(
                              new CustomEvent("app:navigate", { detail: { path: item.path } })
                            );
                          } else {
                            navigate(item.path);
                          }
                        }}
                        className="w-full text-left p-2.5 text-xs text-slate-800 hover:bg-emerald-50/60 rounded-lg flex items-start gap-2.5 cursor-pointer transition-colors"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                            item.unread ? "bg-rose-600" : "bg-emerald-600"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 leading-snug">{item.text}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.subtext}</p>
                        </div>
                      </button>
                    ))}
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${n.unread ? "bg-rose-600" : "bg-slate-400"}`}></span>
                        <span>{n.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role Indicator & Quick Switch */}
            {currentUser.role === "nguoidan" ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="hidden 2xl:inline-flex h-8 items-center gap-1.5 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Cổng Cư dân</span>
                </div>
                <button
                  id="header-login-canbo"
                  onClick={() => {
                    if (isSupabaseConfigured && !verifiedStaff) {
                      setCurrentUser(null);
                      setCitizenSubView(null);
                      navigate(ROUTES.LOGIN);
                      return;
                    }
                    try {
                      localStorage.setItem("kp3_auth_user", JSON.stringify(CANBO_USER));
                    } catch (e) {}
                    setCurrentUser(CANBO_USER);
                    setActiveTab("cultural");
                    navigate(ROUTES.DASHBOARD_CULTURAL);
                  }}
                  className="inline-flex h-10 items-center gap-1 sm:gap-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  title="Chuyển sang Bàn làm việc Cán bộ quản lý"
                >
                  <span className="hidden sm:inline">Đăng nhập </span><span>Cán bộ</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  id="header-back-cudan"
                  type="button"
                  aria-label="Về Cổng Cư dân"
                  onClick={() => {
                    try {
                      localStorage.setItem("kp3_auth_user", JSON.stringify(currentUser));
                    } catch (e) {}
                    setCitizenSubView(null);
                    navigate(ROUTES.HOME);
                  }}
                  className="inline-flex h-10 w-10 sm:w-auto items-center justify-center gap-1.5 sm:px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Xem Trang chủ Cổng Cư dân (giữ quyền Cán bộ để chỉnh sửa trực tiếp)"
                >
                  <Home size={15} className="shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Cổng Cư dân</span>
                </button>
              </div>
            )}

            {/* User identity display (compact on laptop since Sidebar footer already shows full identity) */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
              {currentUser.role === "canbo" ? (
                <>
                  <div className="text-right hidden 2xl:block">
                    <span className="text-xs font-bold text-slate-800 block max-w-[160px] truncate">{effectiveStaffName}</span>
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">{staffRoleLabel}</span>
                  </div>
                  <div
                    aria-label={effectiveStaffName}
                    title={`${effectiveStaffName} (${staffRoleLabel})`}
                    className="w-8 h-8 rounded-full bg-emerald-700 text-white border border-emerald-600 flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none"
                  >
                    {staffInitials}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 block">Cư dân Khu phố 3</span>
                    <span className="text-xs text-emerald-700 font-mono uppercase tracking-wider block">Cổng mở toàn dân</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    <Users size={16} />
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Dynamic view routing based on tab state */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto max-w-7xl w-full mx-auto min-w-0">
          {isDataLoading && activeTab === "dashboard" && (
            <LoadingFade
              variant="inline"
              title="Đang đồng bộ dữ liệu cư dân & địa bàn từ CSDL..."
              subtitle="KP3 Cloud Sync"
              className="mb-4"
            />
          )}
          <AppErrorBoundary fallbackTab={`${activeTab}:${routePath}`} onReset={() => setActiveTab(activeTab)}>
            <Suspense
              fallback={
                <LoadingFade
                  variant="inline"
                  title="Đang tải phân hệ điều hành..."
                  subtitle="KP3 Smart City"
                />
              }
            >
            <div className="w-full">
          {activeTab === "dashboard" && (
            <Dashboard
              residents={residents}
              households={households}
              businesses={businesses}
              reports={reports}
              forms={administrativeForms}
              tasks={tasks}
              schedules={allSchedules}
              fundContributions={fundContributions}
              fundExpenditures={fundExpenditures}
              welfareCount={welfareRecipients.length}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
            />
          )}

          {activeTab === "residents" && (
            <ResidentsPage
              residents={residents}
              households={households}
              currentUser={currentUser}
              residentPermissions={residentPermissions}
              isDataLoading={isDataLoading}
              onAddResident={handleAddResident}
              onDeleteResident={handleDeleteResident}
              onUpdateResidents={updateResidentsWithSync}
              onUpdateHouseholds={handleHouseholdsChange}
              onNavigateToGis={handleNavigateToGis}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "households" && (
            <HouseholdsPage
              households={households}
              residents={residents}
              businesses={businesses}
              currentUser={currentUser}
              residentPermissions={residentPermissions}
              isDataLoading={isDataLoading}
              onAddHousehold={handleAddHousehold}
              onUpdateHouseholds={handleHouseholdsChange}
              onUpdateResidents={updateResidentsWithSync}
              onNavigateToGis={handleNavigateToGis}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "enterprises" && (
            <EnterprisesPage
              businesses={businesses}
              residents={residents}
              households={households}
              isDataLoading={isDataLoading}
              onToggleCertification={handleToggleBusinessCertification}
              onUpdateStatus={handleUpdateBusinessStatus}
              onUpdateBusinesses={handleBusinessesChange}
              onNavigateToGis={handleNavigateToGis}
            />
          )}

          {activeTab === "businesses" && (
            <BusinessesPage
              businesses={businesses}
              residents={residents}
              households={households}
              isDataLoading={isDataLoading}
              onToggleCertification={handleToggleBusinessCertification}
              onUpdateStatus={handleUpdateBusinessStatus}
              onUpdateBusinesses={handleBusinessesChange}
              onNavigateToGis={handleNavigateToGis}
            />
          )}

          {activeTab === "gis" && (
            <GisMap
              households={households}
              onUpdateHouseholds={handleHouseholdsChange}
              residents={residents}
              onUpdateResidents={updateResidentsWithSync}
              businesses={businesses}
              onUpdateBusinesses={handleBusinessesChange}
              reports={reports}
              targetGisItem={targetGisItem}
              onClearTargetGisItem={() => setTargetGisItem(null)}
              onNavigateToReport={() => {
                setActiveTab("reports");
                navigate(ROUTES.DASHBOARD_REPORTS);
              }}
              readOnly={currentUser?.role !== "canbo"}
            />
          )}

          {activeTab === "tasks" && (
            <TasksPage
              tasks={tasks}
              onTasksChange={handleTasksChange}
              creatorLabel={currentUser?.fullName || keyLeaders.partySecretary.formattedWithTitle}
              associationsList={associations}
              isDataLoading={isDataLoading}
            />
          )}

          {activeTab === "ai" && (
            <AiAssistant
              currentUser={currentUser}
              context={{
                residents,
                households,
                businesses,
                reports,
                welfareRecipients,
                fundContributions,
                fundExpenditures,
                communityEvents,
                tasks,
                leadership: landingConfig.leadership,
              }}
            />
          )}

          {activeTab === "reports" && (
            <ReportsPage
              reports={reports}
              residents={residents}
              households={households}
              isDataLoading={isDataLoading}
              onAddReport={handleAddReport}
              onUpdateReportStatus={handleUpdateReportStatus}
              onUpdateReports={setReports}
              onEditReport={handleEditReport}
              onDeleteReport={handleDeleteReport}
              onAddMessage={handleAddReportMessage}
              onAssignOrPriority={handleAssignOrPriorityReport}
              onSubmitFeedback={handleSubmitReportFeedback}
              onReopenReport={handleReopenReport}
              onNavigateToGis={handleNavigateToGis}
              onCreateTaskFromReport={handleCreateTaskFromReport}
              currentUser={currentUser}
              readOnly={currentUser?.role !== "canbo"}
            />
          )}

          {activeTab === "forms" && (
            currentUser?.role === "canbo" ? (
              <SettingsAndPermissions
                defaultSubTab="forms"
                pendingRegistrations={pendingRegistrations}
                onApproveRegistration={handleApproveRegistration}
                onRejectRegistration={handleRejectRegistration}
                residentPermissions={residentPermissions}
                onTogglePermission={(key) => {
                  setResidentPermissions(prev => ({
                    ...prev,
                    [key]: !prev[key]
                  }));
                }}
                forms={administrativeForms}
                onAddForm={handleAddForm}
                onUpdateForm={handleUpdateForm}
                onDeleteForm={handleDeleteForm}
                newsList={newsList}
                onAddNews={handleAddNews}
                onUpdateNews={handleUpdateNews}
                onDeleteNews={handleDeleteNews}
                currentUser={currentUser}
                landingConfig={landingConfig}
                onUpdateLandingConfig={handleUpdateLandingConfig}
                onResyncLeadership={handleResyncLeadershipFromAssociations}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  navigate(getDashboardExtensionPath(tab));
                }}
              />
            ) : (
              <AdministrativeForms
                forms={administrativeForms}
                onAddForm={handleAddForm}
                onUpdateForm={handleUpdateForm}
                onDeleteForm={handleDeleteForm}
                currentUser={currentUser}
              />
            )
          )}

          {activeTab === "party" && (
            <PartyPage
              partyMembers={partyMembers}
              residents={residents}
              associations={associations}
              onAssociationsChange={handleAssociationsChange}
              onCreateTask={(newTask) => handleTasksChange([newTask, ...tasks])}
              onNavigate={(tab) => {
                setActiveTab(tab as ActiveTab);
                navigate(getDashboardExtensionPath(tab as ActiveTab));
              }}
              isDataLoading={isDataLoading}
            />
          )}

          {activeTab === "welfare" && (
            <SocialWelfare
              recipients={welfareRecipients}
              onUpdateStatus={handleUpdateWelfareStatus}
              onAddRecipient={handleAddWelfareRecipient}
              onUpdateRecipient={handleUpdateWelfareRecipient}
              onDeleteRecipient={handleDeleteWelfareRecipient}
              residents={residents}
              onRecordFundExpenditure={handleAddFundExpenditure}
            />
          )}

          {activeTab === "cultural" && (
            <CulturalPage
              events={communityEvents}
              onAddEvent={handleAddCommunityEvent}
              onUpdateEventStatus={handleUpdateEventStatus}
              onUpdateEvent={handleUpdateCommunityEvent}
              onDeleteEvent={handleDeleteCommunityEvent}
              newsList={newsList}
              onAddNews={handleAddNews}
              onUpdateNews={handleUpdateNews}
              onDeleteNews={handleDeleteNews}
              onRefreshNews={handleRefreshNewsList}
            />
          )}

          {activeTab === "finance" && (
            <NeighborhoodFunds
              contributions={fundContributions}
              expenditures={fundExpenditures}
              onAddContribution={handleAddFundContribution}
              onBatchAddContributions={handleBatchAddFundContributions}
              onUpdateContribution={handleUpdateFundContribution}
              onDeleteContribution={handleDeleteFundContribution}
              onUpdateContributionStatus={handleUpdateContributionStatus}
              onAddExpenditure={handleAddFundExpenditure}
              onUpdateExpenditure={handleUpdateFundExpenditure}
              onDeleteExpenditure={handleDeleteFundExpenditure}
              onSyncRenamedFund={handleSyncRenamedFund}
              households={households}
              defaultApproverName={keyLeaders.partySecretary.name}
              readOnly={false}
            />
          )}

          {activeTab === "plan" && (
            <PlanArchitecture />
          )}

          {activeTab === "settings" && (
            <SettingsAndPermissions
              defaultSubTab="approvals"
              onNavigate={(tab) => {
                setActiveTab(tab);
                navigate(getDashboardExtensionPath(tab));
              }}
              pendingRegistrations={pendingRegistrations}
              onApproveRegistration={handleApproveRegistration}
              onRejectRegistration={handleRejectRegistration}
              residentPermissions={residentPermissions}
              onTogglePermission={(key) => {
                setResidentPermissions(prev => ({
                  ...prev,
                  [key]: !prev[key]
                }));
              }}
              forms={administrativeForms}
              onAddForm={handleAddForm}
              onUpdateForm={handleUpdateForm}
              onDeleteForm={handleDeleteForm}
              newsList={newsList}
              onAddNews={handleAddNews}
              onUpdateNews={handleUpdateNews}
              onDeleteNews={handleDeleteNews}
              onRefreshNews={handleRefreshNewsList}
              currentUser={currentUser}
              landingConfig={landingConfig}
              onUpdateLandingConfig={handleUpdateLandingConfig}
              onResyncLeadership={handleResyncLeadershipFromAssociations}
            />
          )}
            </div>
            </Suspense>
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}
