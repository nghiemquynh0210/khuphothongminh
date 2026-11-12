import React, { useState, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from "react";
import { motion } from "motion/react";
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
  LandingConfig
} from "./types";
import {
  DEFAULT_LANDING_CONFIG,
  LANDING_CONFIG_STORAGE_KEY,
} from "./components/landing/landingConstants";
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
import Dashboard from "./components/Dashboard";
import CitizenManagement from "./components/CitizenManagement";
import HouseholdManagement from "./components/HouseholdManagement";
import BusinessManagement from "./components/BusinessManagement";
import EnterpriseManagement from "./components/EnterpriseManagement";
import GisMap from "./components/GisMap";
import TaskAndSchedule from "./components/TaskAndSchedule";
import { loadStoredTasks, saveStoredTasks } from "./components/tasks/tasksData";
import { KP3_OFFICIAL_BASELINE, createTaskFromReport } from "./utils/kp3Utils";
import AiAssistant from "./components/AiAssistant";
import FieldReflections from "./components/FieldReflections";
import PartyBranch from "./components/PartyBranch";
import SocialWelfare from "./components/SocialWelfare";
import CommunityEvents from "./components/CommunityEvents";
import NeighborhoodFunds from "./components/NeighborhoodFunds";
import PlanArchitecture from "./components/PlanArchitecture";
import LoginAndRegister from "./components/LoginAndRegister";
import SettingsAndPermissions, { PendingRegistration } from "./components/SettingsAndPermissions";
import AdministrativeForms from "./components/AdministrativeForms";
import { inferRelationToOwner, extractBirthYear, autoExtractHostelBusinesses } from "./utils/householdRecognitionUtils";
import CitizenLandingPage from "./components/CitizenLandingPage";
import { 
  ROUTES, 
  navigate, 
  getDashboardExtensionPath, 
  getTabFromDashboardPath, 
  Link 
} from "./routes";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { 
  Bell, 
  Users,
  ShieldAlert,
  ChevronDown,
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
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.fallbackTab !== this.props.fallbackTab && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Không thể tải phân hệ</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống phát hiện lỗi hiển thị tạm thời: {this.state.errorMessage}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: "" });
                this.props.onReset();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Tải lại phân hệ
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

  const [activeTab, setActiveTab] = useState<ActiveTab>("cultural");
  const [routePath, setRoutePath] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  const [citizenSubView, setCitizenSubView] = useState<ActiveTab | null>(null);
  const [residents, setResidents] = useState<Resident[]>(initialResidents);
  const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
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
  const [isDataLoading, setIsDataLoading] = useState(false);

  const handleTasksChange = (nextTasks: TaskItem[]) => {
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
      if (pathname === "/login") {
        setCurrentUser(null);
      } else if (tab) {
        const activeUser = readSavedUser() || CANBO_USER;
        if (activeUser.role === "canbo" && !readSavedUser()) {
          try {
            localStorage.setItem("kp3_auth_user", JSON.stringify(activeUser));
          } catch (e) {}
        }
        setCurrentUser(activeUser);
        setActiveTab(tab as ActiveTab);
        setCitizenSubView(null);
      } else {
        // Landing Page routes: /, /about, /reflection, /forms, /notices, /news, /leadership, /schedule
        // Giữ nguyên phiên Cán bộ Admin nếu đang đăng nhập để sửa trực tiếp trên Landing Page
        const savedUser = readSavedUser();
        setCurrentUser(savedUser?.role === "canbo" ? savedUser : PUBLIC_CITIZEN_USER);
        setCitizenSubView(null);
      }
    };

    handleLocationSync();
    window.addEventListener("popstate", handleLocationSync);
    window.addEventListener("app:navigate", handleLocationSync);
    return () => {
      window.removeEventListener("popstate", handleLocationSync);
      window.removeEventListener("app:navigate", handleLocationSync);
    };
  }, []);

  // Nạp toàn bộ Dữ liệu thật từ Supabase PostgreSQL (11.632 Cư dân & 488 Hộ)
  useEffect(() => {
    async function fetchSupabaseData() {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        setIsDataLoading(true);

        // 1. Fetch Households thật
        let loadedHouseholds: Household[] = [];
        const { data: dbHouseholds, error: hErr } = await (supabase as any)
          .from("households")
          .select("*")
          .order("code", { ascending: true });

        if (!hErr && dbHouseholds && dbHouseholds.length > 0) {
          loadedHouseholds = dbHouseholds.map((h: any) => ({
            id: h.id,
            code: h.code,
            ownerName: h.owner_name,
            address: h.address,
            memberCount: h.member_count || 1,
            coordinates: h.coordinates || "10.7935, 106.7445",
            type: "Thường trú",
            members: []
          }));
          setHouseholds(loadedHouseholds);
        }

        // 2. Fetch Residents thật (Tải toàn bộ 11.632 cư dân qua phân trang Supabase)
        let allResidents: any[] = [];
        let fromIdx = 0;
        const batchSize = 1000;
        let keepFetching = true;

        while (keepFetching && fromIdx < 20000) {
          const { data: chunk, error: rErr } = await (supabase as any)
            .from("residents")
            .select("*")
            .order("created_at", { ascending: false })
            .range(fromIdx, fromIdx + batchSize - 1);

          if (rErr || !chunk || chunk.length === 0) {
            keepFetching = false;
          } else {
            allResidents = allResidents.concat(chunk);
            if (chunk.length < batchSize) {
              keepFetching = false;
            } else {
              fromIdx += batchSize;
            }
          }
        }

        let mappedResidents: Resident[] = [];
        if (allResidents.length > 0) {
          mappedResidents = allResidents.map((r: any) => ({
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
            householdId: r.household_code || (r.status === "Tạm trú" ? "Tạm trú" : "Chưa cập nhật"),
            relationToOwner: r.relation_to_owner || "Thành viên",
            workplace: r.workplace || undefined,
            avatar: r.gender === "Nữ" 
              ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" 
              : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
          }));
          setResidents(mappedResidents);

          // Tự động liên kết nhân khẩu & suy luận quan hệ gia phả vào từng Sổ Hộ Khẩu (Không cần bấm thủ công)
          if (loadedHouseholds.length > 0) {
            // Gom nhóm cư dân theo mã hộ khẩu
            const resByHousehold: { [code: string]: Resident[] } = {};
            mappedResidents.forEach(res => {
              const code = res.householdId?.trim();
              if (code && code !== "Chưa cập nhật" && code !== "Tạm trú" && code !== "N/A") {
                if (!resByHousehold[code]) resByHousehold[code] = [];
                resByHousehold[code].push(res);
              }
            });

            const enrichedHouseholds = loadedHouseholds.map(h => {
              const matchedResidents = resByHousehold[h.code] || [];
              if (matchedResidents.length === 0) return h;

              // Tìm chủ hộ trong nhóm
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

            setHouseholds(enrichedHouseholds);
          }
        }

        // 3. Fetch Businesses (Bao gồm Doanh nghiệp, Hộ kinh doanh & Cơ sở lưu trú, Nhà trọ)
        const { data: dbBusinesses } = await (supabase as any).from("businesses").select("*");
        if (dbBusinesses && dbBusinesses.length > 0) {
          const loadedBusinesses: Business[] = dbBusinesses.map((b: any) => {
            // Đối chiếu với initialBusinesses để kế thừa thông tin giàu chi tiết (hình ảnh, nhật ký kiểm tra, sổ đỏ...)
            const matchedMock = initialBusinesses.find(ib => 
              (ib.internalCode && ib.internalCode === b.internal_code) ||
              ib.name.trim().toLowerCase() === b.name.trim().toLowerCase() ||
              ib.id === b.id
            );

            return {
              ...(matchedMock || {}),
              id: matchedMock ? matchedMock.id : b.id,
              internalCode: b.internal_code || matchedMock?.internalCode,
              name: b.name,
              taxCode: b.tax_code || matchedMock?.taxCode || "",
              type: (b.business_type as any) || matchedMock?.type || "Hộ kinh doanh",
              businessType: (b.business_type as any) || matchedMock?.businessType || "Hộ kinh doanh",
              industryGroup: b.industry_group || matchedMock?.industryGroup || "Khác",
              owner: b.owner_name || matchedMock?.owner || "",
              phone: b.phone || matchedMock?.phone || "",
              address: b.address,
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
          });

          // Bổ sung các cơ sở trong initialBusinesses nếu chưa có trong DB
          const existingCodes = new Set(loadedBusinesses.map(b => b.internalCode || b.name));
          initialBusinesses.forEach(ib => {
            const key = ib.internalCode || ib.name;
            if (!existingCodes.has(key)) {
              loadedBusinesses.push(ib);
            }
          });

          // Tự động nhận diện & liên kết các cơ sở nhà trọ từ dữ liệu 11.632 cư dân (tương tự Nhà trọ Phạm Văn Bình)
          if (mappedResidents.length > 0) {
            const autoHostels = autoExtractHostelBusinesses(mappedResidents, loadedBusinesses);
            if (autoHostels.length > 0) {
              loadedBusinesses.push(...autoHostels);
            }
          }

          setBusinesses(loadedBusinesses);
        }

        // 4. Fetch Field Reports (1022)
        const { data: dbReports } = await (supabase as any)
          .from("field_reports")
          .select("*")
          .order("created_at", { ascending: false });
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
              reporterPhone: rep.reporter_phone || "",
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

        // 5. Fetch Community News
        const { data: dbNews } = await (supabase as any)
          .from("community_news")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbNews && dbNews.length > 0) {
          setNewsList(dbNews.map((n: any) => ({
            id: n.id,
            title: n.title,
            category: n.category,
            content: n.content,
            author: n.author_name,
            date: new Date(n.created_at).toLocaleDateString("vi-VN"),
            isPinned: n.is_pinned ?? false
          })));
        }

        // 6. Fetch Neighborhood Funds (tách rạch ròi Phiếu Thu & Phiếu Chi)
        const { data: dbFunds } = await (supabase as any)
          .from("neighborhood_funds")
          .select("*")
          .order("created_at", { ascending: false });

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
            approvedBy: f.approved_by || "Nguyễn Văn Hùng",
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
              // Không trộn 10.000.000đ chi mẫu ảo vào số liệu thu thật từ Supabase
              setFundExpenditures(mappedChi);
            }
          } catch {
            setFundExpenditures(mappedChi);
          }
        }
      } catch (e) {
        console.warn("Lỗi nạp dữ liệu từ Supabase:", e);
      } finally {
        setIsDataLoading(false);
      }
    }

    fetchSupabaseData();
  }, []);
  
  // New State variables for the 3 additional views
  const [welfareRecipients, setWelfareRecipients] = useState<WelfareRecipient[]>(() => {
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
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(() => {
    try {
      const saved = localStorage.getItem(LANDING_CONFIG_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_LANDING_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_LANDING_CONFIG;
  });
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
        const { data, error } = await (supabase as any).from("community_news").insert({
          title: newNews.title,
          category: newNews.category,
          content: newNews.content,
          author_name: newNews.author,
          is_pinned: newNews.isPinned ?? false,
          is_urgent: newNews.category === "Thông báo khẩn"
        }).select().single();

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
        await (supabase as any).from("community_news").update({
          title: updatedNews.title,
          category: updatedNews.category,
          content: updatedNews.content,
          author_name: updatedNews.author,
          is_pinned: updatedNews.isPinned ?? false
        }).eq("id", updatedNews.id);
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

  // Target item for GIS Map navigation & sync
  const [targetGisItem, setTargetGisItem] = useState<TargetGisItem | null>(null);

  const handleNavigateToGis = (item: TargetGisItem) => {
    setTargetGisItem(item);
    setActiveTab("gis");
  };

  // Notifications State Mock
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Phản ánh mới hẻm 42 vừa được gửi", unread: true },
    { id: 2, text: "Yêu cầu duyệt GPKD Cửa hàng 247", unread: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

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
    setNotifications(prev => [
      { id: Date.now(), text: `Cán bộ đã thêm biểu mẫu: ${newForm.code} - ${newForm.title}`, unread: true },
      ...prev
    ]);
  };

  const handleUpdateForm = (updatedForm: AdministrativeForm) => {
    setAdministrativeForms(prev => prev.map(f => f.id === updatedForm.id ? updatedForm : f));
    setNotifications(prev => [
      { id: Date.now(), text: `Cán bộ đã cập nhật biểu mẫu: ${updatedForm.code}`, unread: true },
      ...prev
    ]);
  };

  const handleDeleteForm = (formId: string) => {
    const f = administrativeForms.find(form => form.id === formId);
    setAdministrativeForms(prev => prev.filter(form => form.id !== formId));
    if (f) {
      setNotifications(prev => [
        { id: Date.now(), text: `Cán bộ đã xóa biểu mẫu: ${f.code}`, unread: true },
        ...prev
      ]);
    }
  };

  // Handlers for State Management
  const handleAddResident = (newResident: Resident) => {
    setResidents([newResident, ...residents]);
    
    // Auto-update household members if matched
    const hhId = newResident.householdId;
    setHouseholds(households.map(hh => {
      if (hh.code === hhId) {
        return {
          ...hh,
          memberCount: hh.memberCount + 1,
          members: [...hh.members, {
            name: newResident.fullName,
            relation: newResident.relationToOwner,
            cccd: newResident.cccd,
            phone: newResident.phone,
            birthYear: parseInt(newResident.birthDate.split("/")[2]) || 1990
          }]
        };
      }
      return hh;
    }));
  };

  const handleDeleteResident = (id: string) => {
    const resToDelete = residents.find(r => r.id === id);
    setResidents(residents.filter(r => r.id !== id));

    if (resToDelete) {
      const hhId = resToDelete.householdId;
      setHouseholds(households.map(hh => {
        if (hh.code === hhId) {
          const updatedMembers = hh.members.filter(m => m.cccd !== resToDelete.cccd);
          return {
            ...hh,
            memberCount: updatedMembers.length,
            members: updatedMembers
          };
        }
        return hh;
      }));
    }
  };

  const handleAddHousehold = (newH: Household) => {
    setHouseholds([newH, ...households]);
    
    // Add owner to residents roster
    const ownerRes: Resident = {
      id: "R" + (residents.length + 1).toString().padStart(3, "0"),
      fullName: newH.ownerName,
      gender: "Nam",
      birthDate: "01/01/1975",
      cccd: newH.members[0]?.cccd || "N/A",
      phone: newH.members[0]?.phone || "N/A",
      status: (newH.type === "Tạm trú" ? "Tạm trú" : "Thường trú") as "Thường trú" | "Tạm trú",
      occupation: "Kinh doanh",
      address: newH.address,
      householdId: newH.code,
      relationToOwner: "Chủ hộ",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      joinDate: new Date().toLocaleDateString("vi-VN")
    };
    setResidents([ownerRes, ...residents]);
  };

  const handleToggleBusinessCertification = (id: string) => {
    setBusinesses(businesses.map(b => {
      if (b.id === id) {
        return { ...b, safetyCertified: !b.safetyCertified };
      }
      return b;
    }));
  };

  const handleUpdateBusinessStatus = (id: string, status: "Đang hoạt động" | "Tạm ngưng" | "Chờ duyệt" | "Chuyển địa điểm" | "Chưa xác minh") => {
    setBusinesses(businesses.map(b => {
      if (b.id === id) {
        return { ...b, status };
      }
      return b;
    }));
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
        await (supabase as any).from("field_reports").insert({
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
        });
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
    const updated = [newRec, ...welfareRecipients];
    setWelfareRecipients(updated);
    try { localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated)); } catch {}
  };

  const handleUpdateWelfareStatus = (id: string, status: WelfareRecipient["status"]) => {
    const updated = welfareRecipients.map(w => w.id === id ? { ...w, status } : w);
    setWelfareRecipients(updated);
    try { localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated)); } catch {}
  };

  const handleUpdateWelfareRecipient = (updatedRec: WelfareRecipient) => {
    const updated = welfareRecipients.map(w => w.id === updatedRec.id ? updatedRec : w);
    setWelfareRecipients(updated);
    try { localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated)); } catch {}
  };

  const handleDeleteWelfareRecipient = (id: string) => {
    const updated = welfareRecipients.filter(w => w.id !== id);
    setWelfareRecipients(updated);
    try { localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updated)); } catch {}
  };

  const handleAddCommunityEvent = (newEvent: CommunityEvent) => {
    setCommunityEvents(prev => [newEvent, ...prev]);
  };

  const handleUpdateEventStatus = (id: string, status: CommunityEvent["status"]) => {
    setCommunityEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const handleUpdateCommunityEvent = (updatedEvent: CommunityEvent) => {
    setCommunityEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleDeleteCommunityEvent = (eventId: string) => {
    setCommunityEvents(prev => prev.filter(e => e.id !== eventId));
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

    setResidents([newRes, ...residents]);

    setHouseholds(households.map(hh => {
      if (hh.code === reg.householdId) {
        return {
          ...hh,
          memberCount: hh.memberCount + 1,
          members: [...hh.members, {
            name: reg.fullName,
            relation: reg.relationToOwner,
            cccd: reg.cccd,
            phone: reg.phone,
            birthYear: parseInt(reg.birthDate.split("/")[2]) || 1995
          }]
        };
      }
      return hh;
    }));

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
      case "enterprises": return "Quản lý Doanh nghiệp Vừa & Nhỏ (DNNVV)";
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

  if (!currentUser) {
    return (
      <LoginAndRegister
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          try {
            localStorage.setItem("kp3_auth_user", JSON.stringify(user));
          } catch (e) {}
          if (user.role === "canbo") {
            setActiveTab("cultural");
            navigate(ROUTES.DASHBOARD_CULTURAL);
          } else {
            navigate(ROUTES.HOME);
          }
        }}
        onRegisterSubmit={(newReg) => {
          setPendingRegistrations([newReg, ...pendingRegistrations]);
        }}
        householdCodes={households.map(h => h.code)}
        onBackToLanding={() => {
          setCurrentUser(PUBLIC_CITIZEN_USER);
          setCitizenSubView(null);
          navigate(ROUTES.HOME);
        }}
      />
    );
  }

  const isDashboardUrl = Boolean(getTabFromDashboardPath(routePath));

  // 1. CỔNG NGƯỜI DÂN (LANDING PAGE) LÀ TRANG CHỦ MẶC ĐỊNH (giữ quyền Admin sửa khi Cán bộ đang đăng nhập)
  if ((currentUser.role === "nguoidan" || !isDashboardUrl) && !citizenSubView) {
    const isAdminUser = currentUser.role === "canbo";
    return (
      <CitizenLandingPage
        residents={residents}
        households={households}
        businesses={businesses}
        reports={reports}
        forms={administrativeForms}
        events={communityEvents}
        news={newsList}
        isAdmin={isAdminUser}
        adminName={isAdminUser ? currentUser.fullName : undefined}
        landingConfig={landingConfig}
        onUpdateLandingConfig={setLandingConfig}
        onAddNews={handleAddNews}
        onUpdateNews={handleUpdateNews}
        onDeleteNews={handleDeleteNews}
        onAddEvent={handleAddCommunityEvent}
        onUpdateEvent={handleUpdateCommunityEvent}
        onDeleteEvent={handleDeleteCommunityEvent}
        onAddReport={handleAddReport}
        onOpenStaffLogin={() => {
          if (isAdminUser) {
            setActiveTab("cultural");
            setCitizenSubView(null);
            navigate(ROUTES.DASHBOARD_CULTURAL);
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
          try {
            localStorage.removeItem("kp3_auth_user");
          } catch {}
          setCurrentUser(PUBLIC_CITIZEN_USER);
          navigate(ROUTES.HOME);
        }}
        onSwitchToCanBo={() => {
          if (!isAdminUser) {
            try {
              localStorage.setItem("kp3_auth_user", JSON.stringify(CANBO_USER));
            } catch {}
          }
          setCurrentUser(isAdminUser ? currentUser : CANBO_USER);
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
          <AppErrorBoundary fallbackTab={citizenSubView} onReset={() => setActiveTab(citizenSubView)}>
            {citizenSubView === "gis" && (
              <GisMap 
                households={households}
                onUpdateHouseholds={setHouseholds}
                residents={residents}
                onUpdateResidents={setResidents}
                businesses={businesses}
                onUpdateBusinesses={setBusinesses}
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
                }}
              />
            )}
            {citizenSubView === "finance" && (
              <NeighborhoodFunds 
                contributions={fundContributions}
                expenditures={fundExpenditures}
                onAddContribution={handleAddFundContribution}
                onUpdateContributionStatus={handleUpdateContributionStatus}
                households={households}
                readOnly={true}
              />
            )}
            {citizenSubView === "forms" && (
              <AdministrativeForms 
                forms={administrativeForms}
                onAddForm={handleAddForm}
                onUpdateForm={handleUpdateForm}
                onDeleteForm={handleDeleteForm}
                currentUser={currentUser} 
              />
            )}
            {citizenSubView === "reports" && (
              <FieldReflections 
                reports={reports} 
                onAddReport={handleAddReport} 
                onUpdateReportStatus={handleUpdateReportStatus} 
                onUpdateReports={setReports}
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
              <PartyBranch 
                partyMembers={partyMembers} 
                residents={residents}
              />
            )}
            {citizenSubView === "welfare" && (
              <SocialWelfare 
                recipients={welfareRecipients}
                onUpdateStatus={handleUpdateWelfareStatus}
                onAddRecipient={handleAddWelfareRecipient}
                onUpdateRecipient={handleUpdateWelfareRecipient}
                onDeleteRecipient={handleDeleteWelfareRecipient}
                residents={residents}
              />
            )}
            {citizenSubView === "cultural" && (
              <CommunityEvents 
                events={communityEvents}
                onAddEvent={handleAddCommunityEvent}
                onUpdateEventStatus={handleUpdateEventStatus}
                onUpdateEvent={handleUpdateCommunityEvent}
                onDeleteEvent={handleDeleteCommunityEvent}
                newsList={newsList}
                onAddNews={handleAddNews}
                onUpdateNews={handleUpdateNews}
                onDeleteNews={handleDeleteNews}
              />
            )}
            {citizenSubView === "plan" && (
              <PlanArchitecture />
            )}
          </AppErrorBoundary>
        </main>
      </div>
    );
  }

  // 3. CỔNG CÁN BỘ QUẢN LÝ (KHU VỰC NGHIỆP VỤ RIÊNG)
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          navigate(getDashboardExtensionPath(tab));
        }} 
        currentUser={currentUser}
        onLogout={() => {
          try {
            localStorage.removeItem("kp3_auth_user");
            if (supabase) {
              supabase.auth.signOut().catch(() => {});
            }
          } catch (e) {}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-20 lg:pl-64 min-w-0 transition-all duration-300">
        
        {/* Top Header Bar */}
        <header className="min-h-16 h-auto py-2 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shrink-0 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3 pl-14 md:pl-0 flex-1 min-w-0 mr-2 sm:mr-4">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base lg:text-lg tracking-tight leading-snug sm:truncate">
              {currentUser.role === "nguoidan" && activeTab === "dashboard" ? "Cổng Dịch Vụ Cư Dân Số" : getTabTitle()}
            </h2>
            <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Cổng Điều Hành Số • Đề án 06/CP • KP3 An Phú
            </span>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Info button for Plan & Database design */}
            <Link
              to={getDashboardExtensionPath("plan")}
              id="header-info-plan"
              aria-label="Đề án & Thiết kế Kiến trúc Cơ sở dữ liệu"
              onClick={() => {
                setActiveTab("plan");
                navigate(getDashboardExtensionPath("plan"));
              }}
              className={`h-11 w-11 sm:h-10 sm:w-10 text-xs inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer relative ${
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
                className="h-11 w-11 sm:h-10 sm:w-10 text-xs inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-transparent transition-colors cursor-pointer relative"
              >
                <Bell size={18} />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 bg-white rounded-xl border border-slate-200 p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <span className="font-bold text-xs text-slate-800">Thông báo mới nhận</span>
                    <button 
                      type="button"
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, unread: false })))}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer py-1 px-1.5 rounded"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>
                  <div className="py-1 divide-y divide-slate-100 max-h-48 overflow-y-auto evon-scroll">
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
                <div className="hidden xl:inline-flex h-8 items-center gap-1.5 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Cổng Cư dân</span>
                </div>
                <button
                  id="header-login-canbo"
                  onClick={() => {
                    try {
                      localStorage.setItem("kp3_auth_user", JSON.stringify(CANBO_USER));
                    } catch (e) {}
                    setCurrentUser(CANBO_USER);
                    setActiveTab("cultural");
                    navigate(ROUTES.DASHBOARD_CULTURAL);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1 sm:gap-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  title="Chuyển sang Bàn làm việc Cán bộ quản lý"
                >
                  <span className="hidden sm:inline">Đăng nhập </span><span>Cán bộ</span>
                </button>
                <button
                  id="header-open-auth"
                  onClick={() => {
                    setCurrentUser(null);
                    navigate(ROUTES.LOGIN);
                  }}
                  className="hidden md:inline-flex h-11 sm:h-10 items-center gap-1 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  title="Đăng nhập tài khoản cá nhân / Đăng ký nhân khẩu mới"
                >
                  <span>Tài khoản</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="hidden xl:inline-flex h-10 items-center gap-1.5 px-2.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-bold whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span>Cán bộ</span>
                </div>
                <button
                  id="header-back-cudan"
                  onClick={() => {
                    try {
                      localStorage.setItem("kp3_auth_user", JSON.stringify(currentUser));
                    } catch (e) {}
                    setCitizenSubView(null);
                    navigate(ROUTES.HOME);
                  }}
                  className="inline-flex h-11 sm:h-10 items-center gap-1 sm:gap-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Xem Trang chủ Cổng Cư dân (giữ quyền Cán bộ để chỉnh sửa trực tiếp)"
                >
                  <span className="hidden sm:inline">Về Cổng&nbsp;</span><span>Cư dân</span>
                </button>
                <button
                  id="header-logout-auth"
                  onClick={() => {
                    try {
                      localStorage.removeItem("kp3_auth_user");
                      if (supabase) {
                        supabase.auth.signOut().catch(() => {});
                      }
                    } catch (e) {}
                    setCurrentUser(null);
                    navigate(ROUTES.LOGIN);
                  }}
                  className="hidden md:inline-flex h-11 sm:h-10 items-center gap-1 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}

            {/* User identity display */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
              {currentUser.role === "canbo" ? (
                <>
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 block">{currentUser.fullName}</span>
                    <span className="text-xs text-slate-600 font-mono uppercase tracking-wider block">Bí thư Chi bộ KP3</span>
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
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
          <AppErrorBoundary fallbackTab={activeTab} onReset={() => setActiveTab(activeTab)}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
          {activeTab === "dashboard" && (
            <Dashboard 
              residents={residents} 
              households={households} 
              businesses={businesses} 
              reports={reports} 
              forms={administrativeForms}
              tasks={tasks}
              fundContributions={fundContributions}
              fundExpenditures={fundExpenditures}
              welfareCount={welfareRecipients.length}
              setActiveTab={setActiveTab} 
              currentUser={currentUser}
            />
          )}

          {activeTab === "residents" && (
            currentUser?.role === "nguoidan" && !residentPermissions.residents ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Không có quyền truy cập Nhân khẩu</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Theo quy định bảo vệ dữ liệu cư dân, vai trò Cư dân không được phép tra cứu danh bạ nhân khẩu. Quyền này chỉ dành riêng cho Cán bộ Quản lý địa bàn.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Quay về Cổng cư dân
                </button>
              </div>
            ) : (
              <CitizenManagement 
                residents={residents} 
                onAddResident={handleAddResident} 
                onDeleteResident={handleDeleteResident} 
                onUpdateResidents={setResidents}
                onUpdateHouseholds={setHouseholds}
                households={households}
                onNavigateToGis={handleNavigateToGis}
              />
            )
          )}

          {activeTab === "households" && (
            currentUser?.role === "nguoidan" && !residentPermissions.households ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Không có quyền tra cứu Sổ Hộ Khẩu</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Theo quy định bảo vệ thông tin cá nhân và an ninh dữ liệu, vai trò Cư dân không được phép tra cứu Sổ hộ khẩu điện tử & thông tin nhân khẩu của các hộ gia đình. Chức năng này chỉ dành riêng cho Cán bộ Quản lý.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Quay về Cổng cư dân
                </button>
              </div>
            ) : (
              <HouseholdManagement 
                households={households} 
                onAddHousehold={handleAddHousehold} 
                residents={residents}
                onUpdateHouseholds={setHouseholds}
                onUpdateResidents={setResidents}
                onNavigateToGis={handleNavigateToGis}
              />
            )
          )}

          {activeTab === "enterprises" && (
            <EnterpriseManagement 
              businesses={businesses} 
              residents={residents}
              households={households}
              onToggleCertification={handleToggleBusinessCertification} 
              onUpdateStatus={handleUpdateBusinessStatus} 
              onUpdateBusinesses={setBusinesses}
              onNavigateToGis={handleNavigateToGis}
            />
          )}

          {activeTab === "businesses" && (
            <BusinessManagement 
              businesses={businesses} 
              residents={residents}
              households={households}
              onToggleCertification={handleToggleBusinessCertification} 
              onUpdateStatus={handleUpdateBusinessStatus} 
              onUpdateBusinesses={setBusinesses}
              onNavigateToGis={handleNavigateToGis}
            />
          )}

          {activeTab === "gis" && (
            <GisMap 
              households={households}
              onUpdateHouseholds={setHouseholds}
              residents={residents}
              onUpdateResidents={setResidents}
              businesses={businesses}
              onUpdateBusinesses={setBusinesses}
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
            <TaskAndSchedule
              tasks={tasks}
              onTasksChange={handleTasksChange}
              creatorLabel={currentUser?.fullName || "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)"}
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
              }}
            />
          )}

          {activeTab === "reports" && (
            <FieldReflections 
              reports={reports} 
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
            <PartyBranch 
              partyMembers={partyMembers} 
              residents={residents}
              onCreateTask={(newTask) => handleTasksChange([newTask, ...tasks])}
              onNavigate={(tab) => {
                setActiveTab(tab as ActiveTab);
                navigate(getDashboardExtensionPath(tab as ActiveTab));
              }}
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
            <CommunityEvents 
              events={communityEvents}
              onAddEvent={handleAddCommunityEvent}
              onUpdateEventStatus={handleUpdateEventStatus}
              onUpdateEvent={handleUpdateCommunityEvent}
              onDeleteEvent={handleDeleteCommunityEvent}
              newsList={newsList}
              onAddNews={handleAddNews}
              onUpdateNews={handleUpdateNews}
              onDeleteNews={handleDeleteNews}
            />
          )}

          {activeTab === "finance" && (
            <NeighborhoodFunds 
              contributions={fundContributions}
              expenditures={fundExpenditures}
              onAddContribution={handleAddFundContribution}
              onUpdateContribution={handleUpdateFundContribution}
              onDeleteContribution={handleDeleteFundContribution}
              onUpdateContributionStatus={handleUpdateContributionStatus}
              onAddExpenditure={handleAddFundExpenditure}
              onUpdateExpenditure={handleUpdateFundExpenditure}
              onDeleteExpenditure={handleDeleteFundExpenditure}
              onSyncRenamedFund={handleSyncRenamedFund}
              households={households}
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
              currentUser={currentUser}
            />
          )}
            </motion.div>
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}
