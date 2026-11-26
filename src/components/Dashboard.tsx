import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Map,
  MapPin,
  MapPinOff,
  MessageSquare,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  AdministrativeForm,
  Business,
  FieldReport,
  FundContribution,
  FundExpenditure,
  Household,
  Resident,
  ScheduleEvent,
  TaskItem,
} from "../types";
import { initialAdministrativeForms } from "../mockForms";
import {
  calculateResidentAge,
  formatCompactKp3Address,
  getTemporaryResidenceExpiryStatus,
} from "../utils/householdRecognitionUtils";
import {
  KP3_OFFICIAL_BASELINE,
  computeKp3PopulationMetrics,
  formatDecimalVN,
  isEnterpriseRecord,
  maskCccd,
} from "../utils/kp3Utils";
import { getEffectiveResidencyStatus } from "../utils/residencyClassifier";
import { recordAuditLog } from "../utils/auditLogger";
import { formatVNNumber } from "../utils/numberFormat";
import {
  getDashboardExtensionPath,
  getHouseholdDetailPath,
  getReportDetailPath,
  getResidentDetailPath,
  getTaskDetailPath,
  navigate,
} from "../routes";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { Button, InlineNotice, Modal } from "./ui";
import { PeriodicWordReportModal } from "./dashboard/PeriodicWordReportModal";
import { MobileStaffHome } from "./mobile/MobileStaffHome";

interface DashboardProps {
  residents: Resident[];
  households: Household[];
  businesses: Business[];
  reports: FieldReport[];
  forms?: AdministrativeForm[];
  tasks?: TaskItem[];
  schedules?: ScheduleEvent[];
  fundContributions?: FundContribution[];
  fundExpenditures?: FundExpenditure[];
  welfareCount?: number;
  setActiveTab: (tab: any) => void;
  currentUser?: {
    username: string;
    fullName: string;
    role: "canbo" | "nguoidan";
    cccd?: string;
    householdCode?: string;
    phone?: string;
  } | null;
  onOpenQuickCommand?: () => void;
}

export default function Dashboard({
  residents,
  households,
  businesses,
  reports,
  forms = initialAdministrativeForms,
  tasks = [],
  schedules = [],
  fundContributions = [],
  fundExpenditures = [],
  welfareCount = 0,
  setActiveTab,
  currentUser,
  onOpenQuickCommand,
}: DashboardProps) {
  const isStaff = currentUser?.role === "canbo";
  const [showWordReportModal, setShowWordReportModal] = useState(false);

  const metrics = useMemo(() => {
    const totalRes = (residents || []).length;
    let maleCount = 0;
    let femaleCount = 0;
    let thuongTruCount = 0;
    let tamTruCount = 0;
    let tamVangCount = 0;
    let foreignCount = 0;
    let childrenCount = 0;
    let workingAgeCount = 0;
    let elderlyCount = 0;
    let expiringTamTruCount = 0;
    let expiredTamTruCount = 0;
    let tempHeadsCount = 0;
    let tempFamilyMembersCount = 0;

    for (let i = 0; i < totalRes; i++) {
      const r = residents[i];
      if (r.gender === "Nam") maleCount++;
      else if (r.gender === "Nữ") femaleCount++;

      const isForeign =
        (r.nationality && r.nationality !== "Việt Nam") ||
        Boolean(r.passportNumber) ||
        (r.cccd && (r.cccd.toLowerCase().includes("hộ chiếu") || r.cccd.toLowerCase().includes("passport"))) ||
        Boolean(r.id && r.id.startsWith("R_FOR_"));

      if (isForeign) foreignCount++;
      else if (r.status === "Thường trú") {
        const effective = getEffectiveResidencyStatus(r);
        if (effective === "Tạm vắng") {
          tamVangCount++;
        } else {
          thuongTruCount++;
        }
      } else if (r.status === "Tạm trú") {
        tamTruCount++;
        const rel = (r.relationToOwner || "").toLowerCase();
        if (rel.includes("đứng tên") || rel === "chủ hộ") tempHeadsCount++;
        else tempFamilyMembersCount++;
      } else if (r.status === "Tạm vắng") tamVangCount++;

      const age = calculateResidentAge(r.birthDate);
      if (age !== null) {
        if (age < 14) childrenCount++;
        else if (age >= 60) elderlyCount++;
        else workingAgeCount++;
      } else {
        workingAgeCount++;
      }

      if (r.status === "Tạm trú" && r.temporaryExpDate) {
        const expStatus = getTemporaryResidenceExpiryStatus(r.temporaryExpDate);
        if (expStatus.isWarning) expiringTamTruCount++;
        else if (expStatus.isExpired) expiredTamTruCount++;
      }
    }

    const activeHouseholds = (households || []).filter((h) => !(h as any).deletedAt);
    const permanentHouseholds = activeHouseholds.filter((h) => (h.type || "Thường trú") === "Thường trú");
    const temporaryHouseholds = activeHouseholds.filter((h) => h.type === "Tạm trú");
    const independentTempHouseholds = temporaryHouseholds.filter((h) => h.tempSubType !== "hostel");
    const hostelTempHouseholds = temporaryHouseholds.filter((h) => h.tempSubType === "hostel");
    const alertTempHouseholds = temporaryHouseholds.filter(
      (h) => (h.expiringMemberCount || 0) > 0 || (h.expiredMemberCount || 0) > 0
    );

    const popMetrics = computeKp3PopulationMetrics(residents, permanentHouseholds);
    const permanentHouseholdsCount =
      permanentHouseholds.length > 0 ? permanentHouseholds.length : KP3_OFFICIAL_BASELINE.households;
    const temporaryHouseholdsCount = temporaryHouseholds.length;
    const totalManagedHouseholdsCount = permanentHouseholdsCount + temporaryHouseholdsCount;

    let enterprisesCount = 0;
    let establishmentsCount = 0;
    let hostelsCount = 0;
    let roomsCount = 0;
    let pcccNeedAttentionCount = 0;

    (businesses || []).forEach((b) => {
      if (isEnterpriseRecord(b)) enterprisesCount++;
      else establishmentsCount++;
      if (b.isAccommodation) {
        hostelsCount++;
        roomsCount += b.soPhong || 0;
      }
      const latestInsp = b.inspections?.[0];
      if (
        b.safetyCertified === false ||
        (latestInsp && latestInsp.result !== "Đạt chuẩn")
      ) {
        pcccNeedAttentionCount++;
      }
    });

    const pendingReports = (reports || []).filter((r) => r.status !== "Đã giải quyết");
    const newReportsCount = (reports || []).filter((r) => r.status === "Đã tiếp nhận").length;
    const inProgressReportsCount = (reports || []).filter((r) => r.status === "Đang xử lý").length;
    const urgentReportsCount = pendingReports.filter(
      (r) => r.priority === "Khẩn cấp" || r.priority === "Cao"
    ).length;

    const priorityWeight: Record<string, number> = {
      "Khẩn cấp": 4,
      Cao: 3,
      "Trung bình": 2,
      "Bình thường": 1,
      Thấp: 1,
    };
    const openTasks = [...(tasks || [])]
      .filter((t) => t.status !== "Hoàn thành")
      .sort((a, b) => {
        const diffPrio = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (diffPrio !== 0) return diffPrio;
        return String(a.deadline || "9999-12-31").localeCompare(String(b.deadline || "9999-12-31"));
      });
    const urgentTasks = openTasks.filter((t) => t.priority === "Khẩn cấp" || t.priority === "Cao");

    const todayIso = new Date().toISOString().slice(0, 10);
    const upcomingSchedules = [...(schedules || [])]
      .filter(
        (s) =>
          s.relevanceTier !== "ward_reference" &&
          s.status !== "Đã kết thúc" &&
          s.status !== "Đã hoãn" &&
          (!s.date || s.date >= todayIso)
      )
      .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`))
      .slice(0, 4);

    const totalFundCollected = (fundContributions || [])
      .filter((c) => c.status === "Đã nộp" || !c.status)
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalFundSpent = (fundExpenditures || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netFundBalance = totalFundCollected - totalFundSpent;

    const thuongTruPct = totalRes > 0 ? Math.round((thuongTruCount / totalRes) * 1000) / 10 : 17.8;
    const tamTruPct = totalRes > 0 ? Math.round((tamTruCount / totalRes) * 1000) / 10 : 82.2;

    return {
      totalRes,
      maleCount,
      femaleCount,
      malePctLabel: totalRes > 0 ? formatDecimalVN((maleCount / totalRes) * 100, 1) : "51,6",
      femalePctLabel: totalRes > 0 ? formatDecimalVN((femaleCount / totalRes) * 100, 1) : "48,4",
      thuongTruCount,
      tamTruCount,
      tamVangCount,
      foreignCount,
      thuongTruPct,
      tamTruPct,
      childrenCount,
      workingAgeCount,
      elderlyCount,
      expiringTamTruCount,
      expiredTamTruCount,
      tempHeadsCount,
      tempFamilyMembersCount,
      permanentHouseholdsCount,
      temporaryHouseholdsCount,
      totalManagedHouseholdsCount,
      independentTempHouseholdsCount: independentTempHouseholds.length,
      hostelTempHouseholdsCount: hostelTempHouseholds.length,
      alertTempHouseholdsCount: alertTempHouseholds.length,
      popMetrics,
      enterprisesCount,
      establishmentsCount,
      hostelsCount,
      roomsCount,
      pcccNeedAttentionCount,
      pendingReportsCount: pendingReports.length,
      newReportsCount,
      inProgressReportsCount,
      urgentReportsCount,
      pendingReports,
      openTasksCount: openTasks.length,
      openTasks,
      urgentTasks,
      urgentTasksCount: urgentTasks.length,
      upcomingSchedules,
      totalFundCollected,
      totalFundSpent,
      netFundBalance,
    };
  }, [residents, households, businesses, reports, tasks, schedules, fundContributions, fundExpenditures]);

  // Household Lookup State (Supports both Thường trú & Hộ tạm trú)
  const [householdSearchQuery, setHouseholdSearchQuery] = useState("");
  const [searchedHousehold, setSearchedHousehold] = useState<Household | null>(null);
  const [searchFeedback, setSearchFeedback] = useState("");
  const [showSensitivePii, setShowSensitivePii] = useState(false);

  // Dashboard Forms Quick Browser (Citizen Portal View)
  const [dashboardFormSearch, setDashboardFormSearch] = useState("");
  const [dashboardFormCategory, setDashboardFormCategory] = useState("Tất cả");
  const [showAllDashboardForms, setShowAllDashboardForms] = useState(false);
  const [dashboardPreviewForm, setDashboardPreviewForm] = useState<AdministrativeForm | null>(null);
  const [dashboardToast, setDashboardToast] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const samplePermHousehold = useMemo(
    () => households.find((h) => (h.type || "Thường trú") === "Thường trú" && !(h as any).deletedAt),
    [households]
  );
  const sampleTempHousehold = useMemo(
    () => households.find((h) => h.type === "Tạm trú" && !(h as any).deletedAt),
    [households]
  );

  const handleSearchHousehold = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSearchFeedback("Vui lòng nhập Mã sổ hộ khẩu, Mã hộ tạm trú (TT-0001), tên chủ hộ hoặc số CCCD.");
      setSearchedHousehold(null);
      return;
    }

    let foundH =
      households.find((h) => h.code.toLowerCase() === q) ||
      households.find(
        (h) =>
          h.code.toLowerCase().includes(q) ||
          h.ownerName.toLowerCase().includes(q) ||
          h.members?.some((m) => (m.cccd || "").toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      );

    if (!foundH) {
      const foundRes = residents.find(
        (r) => r.cccd.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q)
      );
      if (foundRes?.householdId) {
        foundH = households.find((h) => h.code === foundRes.householdId);
      }
    }

    if (foundH) {
      setSearchedHousehold(foundH);
      setSearchFeedback("");
    } else {
      setSearchedHousehold(null);
      setSearchFeedback(
        `Không tìm thấy hồ sơ khớp "${query}". Hãy thử mã hộ thường trú (${samplePermHousehold?.code || "25975-006539"}) hoặc hộ tạm trú (${sampleTempHousehold?.code || "TT-0001"}).`
      );
    }
  };

  const searchedMembers = useMemo(() => {
    if (!searchedHousehold) return [];
    const direct = residents.filter((r) => r.householdId === searchedHousehold.code);
    if (direct.length > 0) return direct;
    return searchedHousehold.members.map((m, idx) => ({
      id: `M-${idx}`,
      fullName: m.name,
      gender: "Nam" as const,
      birthDate: `01/01/${m.birthYear}`,
      cccd: m.cccd || "Chưa cập nhật",
      phone: m.phone || "",
      status: (searchedHousehold.type === "Tạm trú" ? "Tạm trú" : "Thường trú") as Resident["status"],
      occupation: "Chưa cập nhật",
      address: searchedHousehold.address,
      householdId: searchedHousehold.code,
      relationToOwner: m.relation,
      avatar: "",
    }));
  }, [searchedHousehold, residents]);

  const navigateToTab = (tab: any) => {
    setActiveTab(tab);
    if (isStaff) {
      navigate(getDashboardExtensionPath(tab));
    }
  };

  const navigateResidentsWithFilter = (query: string) => {
    const targetUrl = query ? `/dashboard/residents?${query}` : "/dashboard/residents";
    window.history.pushState({}, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new CustomEvent("app:navigate", { detail: { path: targetUrl } }));
    setActiveTab("residents");
  };

  const navigateHouseholdsWithFilter = (query: string) => {
    const targetUrl = query ? `/dashboard/households?${query}` : "/dashboard/households";
    window.history.pushState({}, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new CustomEvent("app:navigate", { detail: { path: targetUrl } }));
    setActiveTab("households");
  };

  const handleExportBriefingReport = () => {
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const safeRemainTemp = Math.max(
      0,
      metrics.tamTruCount - metrics.expiringTamTruCount - metrics.expiredTamTruCount
    );

    const summaryRows = [
      ["Nhóm chỉ tiêu", "Chỉ tiêu thống kê", "Giá trị", "Đơn vị", "Ghi chú điều hành"],
      [
        "1. Dân cư Khu phố 3",
        "Tổng nhân khẩu thực tế",
        metrics.popMetrics.officialPopulation,
        "người",
        `Đã số hóa: ${metrics.totalRes} hồ sơ (${metrics.malePctLabel}% Nam • ${metrics.femalePctLabel}% Nữ)`,
      ],
      ["1. Dân cư Khu phố 3", "Nhân khẩu Thường trú", metrics.thuongTruCount, "người", `${formatDecimalVN(metrics.thuongTruPct, 1)}% tổng dân số`],
      ["1. Dân cư Khu phố 3", "Nhân khẩu Tạm trú", metrics.tamTruCount, "người", `${formatDecimalVN(metrics.tamTruPct, 1)}% tổng dân số`],
      ["1. Dân cư Khu phố 3", "Người nước ngoài (Luật 47)", metrics.foreignCount, "người", "Quản lý lưu trú NNN"],
      ["1. Dân cư Khu phố 3", "Trẻ em (< 14 tuổi)", metrics.childrenCount, "người", "Tiêm chủng & phổ cập GD"],
      ["1. Dân cư Khu phố 3", "Độ tuổi lao động (14 – 59 tuổi)", metrics.workingAgeCount, "người", "Lực lượng lao động địa bàn"],
      ["1. Dân cư Khu phố 3", "Người cao tuổi (≥ 60 tuổi)", metrics.elderlyCount, "người", "Mừng thọ & chăm sóc NCT"],
      [
        "2. Hộ tịch (Thường trú & Tạm trú)",
        "Tổng số Hộ quản lý trên địa bàn",
        metrics.totalManagedHouseholdsCount,
        "hộ",
        "Gồm Sổ Hộ thường trú + Hồ sơ Hộ tạm trú",
      ],
      [
        "2. Hộ tịch (Thường trú & Tạm trú)",
        "Sổ Hộ khẩu Thường trú (CT01)",
        metrics.permanentHouseholdsCount,
        "hộ",
        `Bình quân ${metrics.popMetrics.avgPerDigitizedHouseholdLabel} người/hộ`,
      ],
      [
        "2. Hộ tịch (Thường trú & Tạm trú)",
        "Hộ Tạm trú (CT08 / Khai báo lưu trú)",
        metrics.temporaryHouseholdsCount,
        "hộ",
        `${metrics.independentTempHouseholdsCount} hộ thuê nhà độc lập • ${metrics.hostelTempHouseholdsCount} điểm nhà trọ`,
      ],
      [
        "3. Cảnh báo Hạn Tạm trú",
        "Tạm trú đã quá hạn",
        metrics.expiredTamTruCount,
        "người",
        "Phối hợp CSKV rà soát lưu trú ngay",
      ],
      [
        "3. Cảnh báo Hạn Tạm trú",
        "Tạm trú sắp hết hạn (≤ 30 ngày)",
        metrics.expiringTamTruCount,
        "người",
        `Thuộc ${metrics.alertTempHouseholdsCount} hộ tạm trú cần nhắc gia hạn`,
      ],
      ["3. Cảnh báo Hạn Tạm trú", "Tạm trú còn hạn an toàn", safeRemainTemp, "người", "Đang quản lý hợp lệ"],
      ["4. Kinh tế & Nhà trọ", "Doanh nghiệp TNHH / Cổ phần", metrics.enterprisesCount, "doanh nghiệp", "Có mã số thuế pháp nhân"],
      ["4. Kinh tế & Nhà trọ", "Hộ kinh doanh cá thể tại chỗ", metrics.establishmentsCount, "cơ sở", "Thương mại & dịch vụ"],
      ["4. Kinh tế & Nhà trọ", "Cơ sở nhà trọ lưu trú", metrics.hostelsCount, "cơ sở", `${metrics.roomsCount} phòng cho thuê`],
      ["5. Phản ánh 1022 & Nhiệm vụ", "Phản ánh đang chờ / đang xử lý", metrics.pendingReportsCount, "hồ sơ", `${metrics.newReportsCount} mới • ${metrics.inProgressReportsCount} đang xử lý`],
      ["5. Phản ánh 1022 & Nhiệm vụ", "Nhiệm vụ đang triển khai", metrics.openTasksCount, "đầu việc", `${metrics.urgentTasksCount} việc khẩn cấp / cao`],
      ["6. An sinh & Tài chính", "Hồ sơ đối tượng An sinh xã hội", welfareCount, "hồ sơ", "Người có công & Bảo trợ XH"],
      ["6. An sinh & Tài chính", "Tồn Quỹ Khu phố hiện hành", metrics.netFundBalance, "VNĐ", `Thu: ${formatVNNumber(metrics.totalFundCollected)}đ • Chi: ${formatVNNumber(metrics.totalFundSpent)}đ`],
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Giao_Ban_Tong_Hop");

    const openReportRows = [
      ["Mã hồ sơ", "Tiêu đề phản ánh", "Nhóm lĩnh vực", "Địa điểm", "Mức ưu tiên", "Trạng thái", "Thời điểm gửi"],
      ...metrics.pendingReports.map((r) => [
        r.id,
        r.title,
        r.category,
        r.location,
        r.priority || "Bình thường",
        r.status,
        r.reportedAt,
      ]),
    ];
    const wsReports = XLSX.utils.aoa_to_sheet(openReportRows);
    wsReports["!cols"] = [{ wch: 16 }, { wch: 36 }, { wch: 20 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsReports, "Phan_Anh_1022_Mo");

    const openTaskRows = [
      ["Tiêu đề nhiệm vụ", "Đơn vị chủ trì", "Cán bộ thực hiện", "Mức ưu tiên", "Tiến độ (%)", "Hạn hoàn thành", "Trạng thái"],
      ...metrics.openTasks.map((t) => [
        t.title,
        t.unit,
        t.assignee?.name || "Ban Điều hành KP3",
        t.priority,
        t.progressPercent ?? 0,
        t.deadline,
        t.status,
      ]),
    ];
    const wsTasks = XLSX.utils.aoa_to_sheet(openTaskRows);
    wsTasks["!cols"] = [{ wch: 36 }, { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsTasks, "Nhiem_Vu_Dang_Mo");

    const fileName = `Bao_Cao_Giao_Ban_KP3_AnPhu_${dateStamp}.xlsx`;
    XLSX.writeFile(wb, fileName);

    void recordAuditLog({
      actorName: currentUser?.fullName || "Cán bộ Ban Điều hành KP3",
      actorRole: currentUser?.role === "canbo" ? "Cán bộ KP3" : "Người dùng",
      category: "DATA_EXPORT",
      actionTitle: "Xuất Báo cáo Giao ban tổng hợp (.xlsx)",
      targetSummary: `File ${fileName}: ${formatVNNumber(metrics.popMetrics.officialPopulation)} dân, ${formatVNNumber(
        metrics.permanentHouseholdsCount
      )} hộ TT + ${formatVNNumber(metrics.temporaryHouseholdsCount)} hộ tạm trú`,
    });

    setDashboardToast(`Đã xuất tệp "${fileName}" và ghi nhật ký kiểm toán thành công.`);
  };

  const handleQuickDownloadForm = (formId: string) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;
    const filename = `${form.code.replace(/[^a-zA-Z0-9]/g, "_")}_${form.title.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    const blob = new Blob([`\uFEFF${form.templateContent}`], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDashboardToast(`Đã tải biểu mẫu "${form.code} - ${form.title}" (.DOC).`);
  };

  const dashboardFormCategories = [
    "Tất cả",
    "Cư trú & Hộ khẩu",
    "Địa chính & Nhà ở",
    "Hộ kinh doanh",
    "Hộ tịch & Tư pháp",
    "An sinh xã hội",
  ];

  const filteredDashboardForms = useMemo(() => {
    const q = dashboardFormSearch.trim().toLowerCase();
    return forms.filter((f) => {
      const matchCat = dashboardFormCategory === "Tất cả" || f.category === dashboardFormCategory;
      const matchSearch =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [forms, dashboardFormCategory, dashboardFormSearch]);

  const displayedDashboardForms =
    dashboardFormSearch || showAllDashboardForms || dashboardFormCategory !== "Tất cả"
      ? filteredDashboardForms
      : filteredDashboardForms.slice(0, 4);

  // ===================== CITIZEN PORTAL HOME (Fallback inside Dashboard Shell) =====================
  if (!isStaff) {
    const citizenServices = [
      { id: "forms", title: "Biểu mẫu Hành chính", icon: FileText },
      { id: "reports", title: "Phản ánh Hiện trường 1022", icon: MessageSquare },
      { id: "gis", title: "Bản đồ Số KP3 (GIS)", icon: Map },
      { id: "finance", title: "Quỹ Khu phố & VietQR", icon: Coins },
      { id: "ai", title: "Hỏi đáp Trợ lý KP3", icon: Bot },
      { id: "welfare", title: "An sinh Xã hội", icon: Heart },
      { id: "cultural", title: "Tin tức & Sinh hoạt KP3", icon: Bell },
      { id: "party", title: "Ban Điều hành & Chi bộ KP3", icon: Users },
    ];

    return (
      <div id="dashboard-view" className="space-y-5">
        <PageHeader
          badgeIcon={<Sparkles size={14} className="text-emerald-700" />}
          badgeText="CỔNG DỊCH VỤ CƯ DÂN SỐ • KHU PHỐ 3, AN PHÚ"
          badgeSubtext="PHỤC VỤ 24/7"
          title="Xin chào Quý Cư dân Khu phố 3"
          actions={
            <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
              <Clock size={14} className="text-emerald-700" aria-hidden="true" />
              <span>Hôm nay: {new Date().toLocaleDateString("vi-VN")}</span>
            </div>
          }
        />

        {dashboardToast && (
          <InlineNotice type="success" message={dashboardToast} onDismiss={() => setDashboardToast(null)} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Dân số Toàn Khu phố 3"
            value={formatVNNumber(KP3_OFFICIAL_BASELINE.population)}
            icon={Users}
            color="emerald"
            subtext="Quy mô toàn khu phố"
            subtextRight="Khu phố 3"
          />
          <StatCard
            label="Hộ Thường trú"
            value={formatVNNumber(KP3_OFFICIAL_BASELINE.households)}
            icon={Home}
            color="indigo"
            subtext="Sổ hộ khẩu điện tử"
            subtextRight="Toàn địa bàn KP3"
          />
          <StatCard
            label="Doanh nghiệp & Hộ KD"
            value={formatVNNumber(KP3_OFFICIAL_BASELINE.activeBusinessesTotal)}
            icon={Briefcase}
            color="amber"
            subtext="Cơ sở sản xuất & dịch vụ"
            subtextRight={`${metrics.hostelsCount} nhà trọ`}
          />
          <StatCard
            label="Kho biểu mẫu tải nhanh"
            value={forms.length}
            icon={FileText}
            color="blue"
            subtext="Word (.DOC) & In trực tiếp"
            subtextRight="Mở biểu mẫu →"
            onClick={() => navigateToTab("forms")}
          />
        </div>

        <section aria-labelledby="citizen-services-heading" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 id="citizen-services-heading" className="text-base font-bold text-slate-900">
              Tiện ích Cư dân Trực tuyến
            </h2>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
              Truy cập nhanh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {citizenServices.map((svc) => {
              const IconComp = svc.icon;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => navigateToTab(svc.id)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 hover:bg-slate-50 transition-colors text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <IconComp size={18} aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 leading-snug">{svc.title}</span>
                  </div>
                  <ArrowUpRight size={15} className="text-slate-500 shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="citizen-forms-heading" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 id="citizen-forms-heading" className="text-base font-bold text-slate-900 inline-flex items-center gap-2">
                <FileText size={18} className="text-emerald-700" aria-hidden="true" />
                Kho Biểu mẫu Hành chính Tải nhanh
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Tìm kiếm mẫu đơn CT01, xác nhận cư trú, đăng ký HKD và tải về định dạng Word.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigateToTab("forms")}>
              Mở toàn bộ kho biểu mẫu
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="search"
                value={dashboardFormSearch}
                onChange={(e) => setDashboardFormSearch(e.target.value)}
                placeholder="Tìm mã hoặc tên biểu mẫu..."
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {dashboardFormCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDashboardFormCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                    dashboardFormCategory === cat
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedDashboardForms.map((form) => (
              <div
                key={form.id}
                role="button"
                tabIndex={0}
                onClick={() => setDashboardPreviewForm(form)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDashboardPreviewForm(form);
                  }
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm bg-white flex flex-col justify-between gap-3 cursor-pointer transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs font-semibold">
                      {form.code}
                    </span>
                    <span className="text-xs text-slate-600">{form.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{form.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{form.description}</p>
                </div>

                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button variant="secondary" size="sm" leftIcon={<Eye size={14} />} onClick={() => setDashboardPreviewForm(form)}>
                    Xem mẫu
                  </Button>
                  <Button variant="emerald" size="sm" leftIcon={<Download size={14} />} onClick={() => handleQuickDownloadForm(form.id)}>
                    Tải .DOC
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredDashboardForms.length > 4 && !dashboardFormSearch && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => setShowAllDashboardForms((s) => !s)}>
                {showAllDashboardForms ? "Thu gọn danh sách" : `Xem thêm ${filteredDashboardForms.length - 4} biểu mẫu khác`}
              </Button>
            </div>
          )}
        </section>

        <Modal
          isOpen={Boolean(dashboardPreviewForm)}
          onClose={() => setDashboardPreviewForm(null)}
          title={dashboardPreviewForm?.title || ""}
          description={`Mã biểu mẫu: ${dashboardPreviewForm?.code || ""} • ${dashboardPreviewForm?.category || ""}`}
          size="lg"
          footer={
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={copiedTemplate ? <Check size={14} /> : <Copy size={14} />}
                onClick={() => {
                  if (!dashboardPreviewForm) return;
                  navigator.clipboard.writeText(dashboardPreviewForm.templateContent);
                  setCopiedTemplate(true);
                  setTimeout(() => setCopiedTemplate(false), 2000);
                }}
              >
                {copiedTemplate ? "Đã chép nội dung" : "Sao chép mẫu"}
              </Button>
              <div className="flex items-center gap-2">
                {dashboardPreviewForm && (
                  <Button
                    variant="emerald"
                    size="sm"
                    leftIcon={<Download size={14} />}
                    onClick={() => handleQuickDownloadForm(dashboardPreviewForm.id)}
                  >
                    Tải file Word (.DOC)
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setDashboardPreviewForm(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          }
        >
          {dashboardPreviewForm && (
            <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
              {dashboardPreviewForm.templateContent}
            </pre>
          )}
        </Modal>
      </div>
    );
  }

  // ===================== STAFF EXECUTIVE COMMAND DASHBOARD =====================
  return (
    <div id="dashboard-view" className="space-y-4">
      <MobileStaffHome
        currentUserName={currentUser?.fullName || "Ban Điều hành KP3"}
        population={metrics.popMetrics.officialPopulation}
        thuongTruCount={metrics.thuongTruCount}
        tamTruCount={metrics.tamTruCount}
        totalHouseholds={metrics.totalManagedHouseholdsCount}
        permanentHouseholds={metrics.permanentHouseholdsCount}
        temporaryHouseholds={metrics.temporaryHouseholdsCount}
        totalBusinesses={metrics.enterprisesCount + metrics.establishmentsCount}
        hostelsCount={metrics.hostelsCount}
        roomsCount={metrics.roomsCount}
        openActionCount={metrics.pendingReportsCount + metrics.openTasksCount}
        urgentCount={metrics.urgentTasksCount + metrics.urgentReportsCount}
        pendingReportsCount={metrics.pendingReportsCount}
        openTasksCount={metrics.openTasksCount}
        expiredTempCount={metrics.expiredTamTruCount}
        expiringTempCount={metrics.expiringTamTruCount}
        pcccWarningCount={metrics.pcccNeedAttentionCount}
        fundBalance={metrics.netFundBalance}
        topTasks={metrics.openTasks || []}
        openReports={metrics.pendingReports || []}
        onNavigateTab={(tab) => navigateToTab(tab)}
        onOpenWordReport={() => setShowWordReportModal(true)}
        onExportExcelReport={handleExportBriefingReport}
        onOpenQuickCommand={onOpenQuickCommand}
      />

      <div className="hidden md:block space-y-4">
      <PageHeader
        title="Tổng quan Điều hành Khu phố 3"
        description="Quy mô hộ thường trú – tạm trú, các cảnh báo cư trú và đầu việc cần xử lý trong ngày"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="emerald"
              size="sm"
              leftIcon={<FileText size={14} />}
              onClick={() => setShowWordReportModal(true)}
            >
              Xuất Báo cáo Word (.docx)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleExportBriefingReport}
            >
              Xuất Báo cáo Giao ban (.xlsx)
            </Button>
          </div>
        }
      />

      {dashboardToast && (
        <InlineNotice type="success" message={dashboardToast} onDismiss={() => setDashboardToast(null)} />
      )}

      {/* TẦNG 1: 4 CHỈ SỐ TỔNG QUÁT CỐT LÕI (KHÔNG TRÀN Ở 1280PX, RÕ CẢ HỘ THƯỜNG TRÚ & HỘ TẠM TRÚ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng Nhân khẩu KP3"
          value={formatVNNumber(metrics.popMetrics.officialPopulation)}
          badge={`${metrics.malePctLabel}% Nam`}
          icon={Users}
          color="emerald"
          subtext={`Thường trú: ${formatVNNumber(metrics.thuongTruCount)}`}
          subtextRight={`Tạm trú: ${formatVNNumber(metrics.tamTruCount)}`}
          onClick={() => navigateToTab("residents")}
        />
        <StatCard
          label="Tổng Hộ Quản lý"
          value={formatVNNumber(metrics.totalManagedHouseholdsCount)}
          badge="hộ cư trú"
          icon={Home}
          color="indigo"
          subtext={`Hộ thường trú: ${formatVNNumber(metrics.permanentHouseholdsCount)}`}
          subtextRight={`Hộ tạm trú: ${formatVNNumber(metrics.temporaryHouseholdsCount)}`}
          onClick={() => navigateToTab("households")}
        />
        <StatCard
          label="Kinh tế & Nhà trọ"
          value={formatVNNumber(metrics.enterprisesCount + metrics.establishmentsCount)}
          badge="cơ sở"
          icon={Building2}
          color="blue"
          subtext={`${formatVNNumber(metrics.enterprisesCount)} DN • ${formatVNNumber(metrics.establishmentsCount)} Hộ KD`}
          subtextRight={`${formatVNNumber(metrics.hostelsCount)} nhà trọ (${formatVNNumber(metrics.roomsCount)}p)`}
          onClick={() => navigateToTab("businesses")}
        />
        <StatCard
          label="Tác nghiệp Cần xử lý"
          value={metrics.pendingReportsCount + metrics.openTasksCount}
          badge={metrics.urgentTasksCount + metrics.urgentReportsCount > 0 ? `${metrics.urgentTasksCount + metrics.urgentReportsCount} khẩn` : "đang mở"}
          icon={ShieldAlert}
          color={metrics.pendingReportsCount > 0 || metrics.urgentTasksCount > 0 ? "rose" : "amber"}
          subtext={`Phản ánh 1022: ${metrics.pendingReportsCount}`}
          subtextRight={`Nhiệm vụ mở: ${metrics.openTasksCount}`}
          onClick={() => navigateToTab(metrics.pendingReportsCount > 0 ? "reports" : "tasks")}
        />
      </div>

      {/* TẦNG 2: BỨC TRANH HỘ TỊCH (THƯỜNG TRÚ vs HỘ TẠM TRÚ) & CẢNH BÁO ĐỎ TRONG NGÀY */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Cột Trái (7 cols): Bức tranh Cư trú & Hộ tịch 2 Trụ cột */}
        <section
          aria-labelledby="residency-command-heading"
          className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 id="residency-command-heading" className="text-base font-bold text-slate-900">
              Cơ cấu Hộ tịch &amp; Nhân khẩu Khu phố 3
            </h2>
            <button
              type="button"
              onClick={() => navigateToTab("households")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Quản lý Sổ Hộ tịch</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Thanh tỷ trọng trực quan Thường trú vs Tạm trú */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-800">
                Thường trú: <strong>{formatVNNumber(metrics.thuongTruCount)} người</strong> ({formatDecimalVN(metrics.thuongTruPct, 1)}%)
              </span>
              <span className="text-amber-800">
                Tạm trú: <strong>{formatVNNumber(metrics.tamTruCount)} người</strong> ({formatDecimalVN(metrics.tamTruPct, 1)}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80">
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${Math.max(8, Math.min(92, metrics.thuongTruPct))}%` }}
                title={`Thường trú: ${formatVNNumber(metrics.thuongTruCount)} người`}
              />
              <div
                className="bg-amber-500 h-full flex-1 transition-all"
                title={`Tạm trú: ${formatVNNumber(metrics.tamTruCount)} người`}
              />
            </div>
          </div>

          {/* 2 Thẻ đối xứng: Hộ Thường Trú vs Hộ Tạm Trú (Tối giản, nền sáng dịu mắt) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hộ Thường trú */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigateHouseholdsWithFilter("type=thuong_tru")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigateHouseholdsWithFilter("type=thuong_tru");
                }
              }}
              className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Sổ hộ thường trú
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-mono font-semibold">
                    CT01
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 tabular-nums">
                    {formatVNNumber(metrics.permanentHouseholdsCount)}
                  </span>
                  <span className="text-xs text-slate-500">hộ gia đình</span>
                </div>
                <div className="space-y-1 text-xs text-slate-600 pt-1.5 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span>Nhân khẩu thường trú</span>
                    <strong className="font-mono text-slate-900">{formatVNNumber(metrics.thuongTruCount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Bình quân quy mô</span>
                    <strong className="font-mono text-slate-900">{metrics.popMetrics.avgPerDigitizedHouseholdLabel} người/hộ</strong>
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 group-hover:underline inline-flex items-center gap-1">
                <span>Danh sách hộ thường trú</span>
                <ArrowUpRight size={12} />
              </span>
            </div>

            {/* Hộ Tạm trú */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigateHouseholdsWithFilter("type=tam_tru")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigateHouseholdsWithFilter("type=tam_tru");
                }
              }}
              className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Hộ tạm trú &amp; lưu trú
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-semibold">
                    CT08
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 tabular-nums">
                    {formatVNNumber(metrics.temporaryHouseholdsCount)}
                  </span>
                  <span className="text-xs text-slate-500">hộ / điểm lưu trú</span>
                </div>
                <div className="space-y-1 text-xs text-slate-600 pt-1.5 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span>Thuê độc lập / Cụm trọ</span>
                    <strong className="font-mono text-slate-900">
                      {formatVNNumber(metrics.independentTempHouseholdsCount)} / {formatVNNumber(metrics.hostelTempHouseholdsCount)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhân khẩu tạm trú</span>
                    <strong className="font-mono text-slate-900">{formatVNNumber(metrics.tamTruCount)}</strong>
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 group-hover:underline inline-flex items-center gap-1">
                <span>Danh sách hộ tạm trú</span>
                <ArrowUpRight size={12} />
              </span>
            </div>
          </div>

          {/* Dải Cơ cấu Độ tuổi & Nhóm đặc thù (Trung tính, không tô màu sặc sỡ) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => navigateToTab("residents")}
              className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] text-slate-500 block">Trẻ em (&lt;14t)</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                {formatVNNumber(metrics.childrenCount)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateToTab("residents")}
              className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] text-slate-500 block">Lao động (14–59t)</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                {formatVNNumber(metrics.workingAgeCount)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateResidentsWithFilter("age=elderly")}
              className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors cursor-pointer"
              title="Lọc danh sách Người cao tuổi từ 60 tuổi trở lên"
            >
              <span className="text-[11px] text-slate-500 block">Cao tuổi (≥60t)</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                {formatVNNumber(metrics.elderlyCount)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateToTab("residents")}
              className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors cursor-pointer"
              title="Nhân khẩu thường trú tạm vắng"
            >
              <span className="text-[11px] text-slate-500 block">Tạm vắng</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                {formatVNNumber(metrics.tamVangCount)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateToTab("welfare")}
              className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors cursor-pointer"
              title="Mở hồ sơ An sinh xã hội & Chính sách"
            >
              <span className="text-[11px] text-slate-500 block">Hồ sơ An sinh</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                {formatVNNumber(welfareCount)}
              </span>
            </button>
          </div>
        </section>

        {/* Cột Phải (5 cols): Cảnh báo Điều hành (Chỉ giữ màu đỏ/cam cho cảnh báo thực sự) */}
        <section
          aria-labelledby="priority-alerts-heading"
          className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h2 id="priority-alerts-heading" className="text-sm sm:text-base font-bold text-slate-900">
              Cảnh báo &amp; Trọng tâm Hôm nay
            </h2>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            {/* Cảnh báo 1: Đã quá hạn tạm trú */}
            <button
              type="button"
              onClick={() => navigateResidentsWithFilter("expiry=expired")}
              className="w-full px-3.5 py-3 hover:bg-rose-50/40 transition-colors text-left flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center justify-center shrink-0">
                  <AlertCircle size={15} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    Quá hạn tạm trú: <span className="text-rose-700">{formatVNNumber(metrics.expiredTamTruCount)} người</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Cần phối hợp rà soát lưu trú</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Cảnh báo 2: Sắp hết hạn tạm trú <= 30 ngày */}
            <button
              type="button"
              onClick={() => navigateResidentsWithFilter("expiry=expiring")}
              className="w-full px-3.5 py-3 hover:bg-amber-50/40 transition-colors text-left flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
                  <AlertTriangle size={15} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    Sắp hết hạn ≤ 30 ngày: <span className="text-amber-700">{formatVNNumber(metrics.expiringTamTruCount)} người</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Thuộc {formatVNNumber(metrics.alertTempHouseholdsCount)} hộ tạm trú cần nhắc hạn
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Cảnh báo 3: PCCC & Nhà trọ */}
            <button
              type="button"
              onClick={() => navigateToTab("businesses")}
              className="w-full px-3.5 py-3 hover:bg-slate-50 transition-colors text-left flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80 flex items-center justify-center shrink-0">
                  <Flame size={15} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    Mạng lưới nhà trọ: {formatVNNumber(metrics.hostelsCount)} cơ sở ({formatVNNumber(metrics.roomsCount)} phòng)
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {metrics.pcccNeedAttentionCount > 0
                      ? `${metrics.pcccNeedAttentionCount} cơ sở cần rà soát hồ sơ PCCC`
                      : `Đang quản lý ${metrics.enterprisesCount + metrics.establishmentsCount} cơ sở & doanh nghiệp`}
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Cảnh báo 4: Tồn Quỹ Khu phố minh bạch */}
            <button
              type="button"
              onClick={() => navigateToTab("finance")}
              className="w-full px-3.5 py-3 hover:bg-slate-50 transition-colors text-left flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                  <Coins size={15} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    Tồn Quỹ Khu phố: {formatVNNumber(metrics.netFundBalance)}đ
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Thu {formatVNNumber(metrics.totalFundCollected)}đ • Chi {formatVNNumber(metrics.totalFundSpent)}đ
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </section>
      </div>

      {/* TẦNG 3: NHIỆM VỤ TRỌNG TÂM KHU PHỐ 3 & PHẢN ÁNH 1022 CHỜ XỬ LÝ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cột 1: Lịch Công tác & Nhiệm vụ Trọng tâm — Chỉ hiển thị nhiệm vụ của Khu phố 3 */}
        <section
          aria-labelledby="today-schedule-heading"
          className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3.5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-indigo-700 shrink-0" />
              <div>
                <h2 id="today-schedule-heading" className="text-base font-bold text-slate-900">
                  Lịch Công tác &amp; Nhiệm vụ Trọng tâm
                </h2>
                <p className="text-xs text-slate-500">
                  Đang triển khai {metrics.openTasksCount} nhiệm vụ của Khu phố 3 ({metrics.urgentTasksCount} việc ưu tiên cao / khẩn)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveTab("tasks");
                navigate("/dashboard/tasks");
              }}
            >
              Mở Nhiệm vụ KP3 →
            </Button>
          </div>

          <div className="space-y-2.5 flex-1">
            {metrics.openTasks.length > 0 ? (
              metrics.openTasks.slice(0, 4).map((t) => {
                const formattedDeadline =
                  t.deadline && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline)
                    ? t.deadline.split("-").reverse().join("/")
                    : t.deadline || "Chưa đặt hạn";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(getTaskDetailPath(t.id))}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/25 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded border font-bold ${
                            t.priority === "Khẩn cấp"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : t.priority === "Cao"
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {t.priority}
                        </span>
                        {t.unit && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
                            {t.unit}
                          </span>
                        )}
                        <span className="text-slate-500 font-medium tabular-nums">
                          Hạn: {formattedDeadline}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{t.title}</div>
                      <div className="text-xs text-slate-600 truncate">
                        Phụ trách KP3: <strong className="font-semibold text-slate-800">{t.assignee?.name || t.unit}</strong>
                        {t.assignee?.role && t.assignee.role !== t.unit ? ` • ${t.assignee.role}` : ""}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 whitespace-nowrap tabular-nums ${
                        t.status === "Chờ nghiệm thu"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                          : t.status === "Đang thực hiện"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {t.status}
                      {t.progressPercent > 0 ? ` (${t.progressPercent}%)` : ""}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Hiện tất cả đầu việc của Khu phố 3 đã hoàn thành. Bấm <strong>Mở Nhiệm vụ KP3</strong> để phân công nhiệm vụ mới cho các Chi hội &amp; Tổ tự quản.
              </div>
            )}
          </div>
        </section>

        {/* Cột 2: Phản ánh Hiện trường 1022 Cần giải quyết */}
        <section
          aria-labelledby="recent-reports-heading"
          className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3.5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-700 shrink-0" />
              <div>
                <h2 id="recent-reports-heading" className="text-base font-bold text-slate-900">
                  Phản ánh Hiện trường 1022 Cần theo dõi
                </h2>
                <p className="text-xs text-slate-500">
                  Đang mở {metrics.pendingReportsCount} hồ sơ ({metrics.newReportsCount} mới tiếp nhận • {metrics.inProgressReportsCount} đang xử lý)
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigateToTab("reports")}>
              Xem tất cả →
            </Button>
          </div>

          <div className="space-y-2.5 flex-1">
            {(metrics.pendingReports.length > 0 ? metrics.pendingReports : reports).slice(0, 4).map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => navigate(getReportDetailPath(report.id))}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                      {report.category}
                    </span>
                    <span className="text-slate-500 font-mono">{report.reportedAt}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{report.title}</div>
                  <div className="text-xs text-slate-600 truncate">{formatCompactKp3Address(report.location)}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 whitespace-nowrap ${
                    report.status === "Đã giải quyết"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : report.status === "Đang xử lý"
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-blue-50 text-blue-900 border-blue-200"
                  }`}
                >
                  {report.status}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* TẦNG 4: TRA CỨU NHANH HỘ THƯỜNG TRÚ & HỘ TẠM TRÚ (GỌN 1 THANH, CHỈ BUNG KHI TRA CỨU) */}
      <section aria-labelledby="officer-hk-lookup" className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="officer-hk-lookup" className="text-sm sm:text-base font-bold text-slate-900">
            Tra cứu Hộ Thường trú, Hộ Tạm trú &amp; Nhân khẩu
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {samplePermHousehold && (
              <button
                type="button"
                onClick={() => {
                  setHouseholdSearchQuery(samplePermHousehold.code);
                  handleSearchHousehold(samplePermHousehold.code);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-mono font-semibold cursor-pointer transition-colors"
              >
                Mẫu TT: {samplePermHousehold.code}
              </button>
            )}
            {sampleTempHousehold && (
              <button
                type="button"
                onClick={() => {
                  setHouseholdSearchQuery(sampleTempHousehold.code);
                  handleSearchHousehold(sampleTempHousehold.code);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-mono font-semibold cursor-pointer transition-colors"
              >
                Mẫu Tạm trú: {sampleTempHousehold.code}
              </button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={showSensitivePii ? <EyeOff size={14} /> : <Eye size={14} />}
              onClick={() => setShowSensitivePii((s) => !s)}
            >
              {showSensitivePii ? "Che CCCD" : "Hiện CCCD"}
            </Button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchHousehold(householdSearchQuery);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <label htmlFor="dashboard-household-search-input" className="sr-only">
              Nhập mã hộ thường trú, mã hộ tạm trú, tên chủ hộ hoặc CCCD
            </label>
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              id="dashboard-household-search-input"
              name="householdSearchQuery"
              type="search"
              placeholder="Gõ Mã hộ (25975-... / TT-0001), Họ tên chủ hộ hoặc số CCCD..."
              value={householdSearchQuery}
              onChange={(e) => setHouseholdSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-50/70 focus:bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Button type="submit" variant="emerald" size="form" leftIcon={<Search size={15} />}>
            Tra cứu hộ
          </Button>
          {searchedHousehold && (
            <Button
              type="button"
              variant="secondary"
              size="form"
              leftIcon={<X size={15} />}
              onClick={() => {
                setSearchedHousehold(null);
                setHouseholdSearchQuery("");
                setSearchFeedback("");
              }}
            >
              Đóng
            </Button>
          )}
        </form>

        {searchFeedback && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-2">
            <HelpCircle size={15} className="shrink-0 text-amber-700" />
            <span>{searchFeedback}</span>
          </div>
        )}

        {searchedHousehold && (
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      searchedHousehold.type === "Tạm trú"
                        ? "bg-amber-100 text-amber-950 border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border-emerald-200"
                    }`}
                  >
                    {searchedHousehold.type === "Tạm trú" ? "Hồ sơ Hộ Tạm trú" : "Sổ Hộ khẩu Thường trú"}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{searchedHousehold.code}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {searchedHousehold.type === "Tạm trú" ? "Đứng tên tạm trú" : "Chủ hộ"}: {searchedHousehold.ownerName}
                </h3>
                <p className="text-xs text-slate-700">{searchedHousehold.address}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end justify-between gap-2 text-xs shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-800 font-semibold">
                  {searchedMembers.length} nhân khẩu
                </span>
                <button
                  type="button"
                  onClick={() => navigate(getHouseholdDetailPath(searchedHousehold.id))}
                  className="font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Mở chi tiết trong Quản lý Hộ khẩu →
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Họ và tên</th>
                      <th className="py-2.5 px-4">Quan hệ</th>
                      <th className="py-2.5 px-4">Ngày sinh</th>
                      <th className="py-2.5 px-4">Số CCCD</th>
                      <th className="py-2.5 px-4">Tình trạng / Hạn TT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {searchedMembers.map((member, idx) => {
                      const matchedRes = residents.find(
                        (r) =>
                          (member.cccd && r.cccd === member.cccd) ||
                          (r.fullName === member.fullName && r.householdId === searchedHousehold.code)
                      );
                      return (
                        <tr
                          key={member.id || idx}
                          onClick={matchedRes ? () => navigate(getResidentDetailPath(matchedRes.id)) : undefined}
                          className={`hover:bg-emerald-50/40 transition-colors ${matchedRes ? "cursor-pointer group" : ""}`}
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900 group-hover:text-emerald-800">
                            {member.fullName}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-900">{member.relationToOwner}</td>
                          <td className="py-2.5 px-4 text-slate-700 font-mono">{member.birthDate}</td>
                          <td className="py-2.5 px-4 text-slate-800 font-mono">
                            {maskCccd(member.cccd, showSensitivePii)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-mono">
                            {matchedRes?.temporaryExpDate
                              ? `Hạn: ${matchedRes.temporaryExpDate}`
                              : member.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
      </div>

      <PeriodicWordReportModal
        isOpen={showWordReportModal}
        onClose={() => setShowWordReportModal(false)}
        residents={residents}
        households={households}
        businesses={businesses}
        reports={reports}
        tasks={tasks}
        schedules={schedules}
        fundContributions={fundContributions}
        fundExpenditures={fundExpenditures}
        welfareCount={welfareCount}
        actorName={currentUser?.fullName}
      />
    </div>
  );
}
