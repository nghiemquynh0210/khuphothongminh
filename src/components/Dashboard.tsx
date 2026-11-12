import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  Briefcase,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Coins,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Map,
  MessageSquare,
  PlusCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AdministrativeForm,
  Business,
  FieldReport,
  FundContribution,
  FundExpenditure,
  Household,
  Resident,
  TaskItem,
} from "../types";
import { initialAdministrativeForms } from "../mockForms";
import {
  extractBirthYear,
  getTemporaryResidenceExpiryStatus,
} from "../utils/householdRecognitionUtils";
import {
  KP3_OFFICIAL_BASELINE,
  computeKp3PopulationMetrics,
  formatDecimalVN,
  isEnterpriseRecord,
  maskCccd,
} from "../utils/kp3Utils";
import { formatVNNumber } from "../utils/numberFormat";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { Button, InlineNotice, Modal } from "./ui";

interface DashboardProps {
  residents: Resident[];
  households: Household[];
  businesses: Business[];
  reports: FieldReport[];
  forms?: AdministrativeForm[];
  tasks?: TaskItem[];
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
}

const CHART_COLORS = ["#047857", "#1d4ed8", "#d97706", "#b91c1c", "#6d28d9"];

export default function Dashboard({
  residents,
  households,
  businesses,
  reports,
  forms = initialAdministrativeForms,
  tasks = [],
  fundContributions = [],
  fundExpenditures = [],
  welfareCount = 0,
  setActiveTab,
  currentUser,
}: DashboardProps) {
  const isStaff = currentUser?.role === "canbo";

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
    const currentYear = 2026;

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
      else if (r.status === "Thường trú") thuongTruCount++;
      else if (r.status === "Tạm trú") tamTruCount++;
      else if (r.status === "Tạm vắng") tamVangCount++;

      const by = extractBirthYear(r.birthDate);
      if (by > 1900 && by <= currentYear) {
        const age = currentYear - by;
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

    const popMetrics = computeKp3PopulationMetrics(residents, households);

    let enterprisesCount = 0;
    let establishmentsCount = 0;
    let hostelsCount = 0;
    let roomsCount = 0;

    (businesses || []).forEach((b) => {
      if (isEnterpriseRecord(b)) enterprisesCount++;
      else establishmentsCount++;
      if (b.isAccommodation) {
        hostelsCount++;
        roomsCount += b.soPhong || 0;
      }
    });

    const pendingReports = (reports || []).filter((r) => r.status !== "Đã giải quyết");
    const openTasks = (tasks || []).filter((t) => t.status !== "Hoàn thành");
    const urgentTasks = openTasks.filter((t) => t.priority === "Khẩn cấp");

    const totalFundCollected = (fundContributions || [])
      .filter((c) => c.status === "Đã nộp" || !c.status)
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalFundSpent = (fundExpenditures || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netFundBalance = totalFundCollected - totalFundSpent;

    const myReports =
      currentUser?.role === "nguoidan"
        ? (reports || []).filter(
            (r) => r.reporterName === currentUser.fullName || r.reporterPhone === currentUser.phone
          )
        : [];

    const residencyChartData = [
      { name: "Thường trú", "Số lượng": thuongTruCount, color: "#047857" },
      { name: "Tạm trú", "Số lượng": tamTruCount, color: "#d97706" },
      { name: "Tạm vắng", "Số lượng": tamVangCount, color: "#475569" },
      { name: "Người nước ngoài", "Số lượng": foreignCount, color: "#6d28d9" },
    ];

    const categoryMap = (reports || []).reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reportPieData = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      totalRes,
      maleCount,
      femaleCount,
      malePctLabel: totalRes > 0 ? formatDecimalVN((maleCount / totalRes) * 100, 1) : "0,0",
      femalePctLabel: totalRes > 0 ? formatDecimalVN((femaleCount / totalRes) * 100, 1) : "0,0",
      thuongTruCount,
      tamTruCount,
      tamVangCount,
      foreignCount,
      childrenCount,
      workingAgeCount,
      elderlyCount,
      expiringTamTruCount,
      expiredTamTruCount,
      popMetrics,
      enterprisesCount,
      establishmentsCount,
      hostelsCount,
      roomsCount,
      pendingReportsCount: pendingReports.length,
      pendingReports,
      openTasksCount: openTasks.length,
      urgentTasksCount: urgentTasks.length,
      netFundBalance,
      myReports,
      residencyChartData,
      reportPieData,
    };
  }, [residents, households, businesses, reports, tasks, fundContributions, fundExpenditures, currentUser]);

  // Household Lookup State
  const [householdSearchQuery, setHouseholdSearchQuery] = useState("");
  const [searchedHousehold, setSearchedHousehold] = useState<Household | null>(null);
  const [searchFeedback, setSearchFeedback] = useState("");
  const [showSensitivePii, setShowSensitivePii] = useState(false);

  // Dashboard Forms Quick Browser
  const [dashboardFormSearch, setDashboardFormSearch] = useState("");
  const [dashboardFormCategory, setDashboardFormCategory] = useState("Tất cả");
  const [showAllDashboardForms, setShowAllDashboardForms] = useState(false);
  const [dashboardPreviewForm, setDashboardPreviewForm] = useState<AdministrativeForm | null>(null);
  const [dashboardToast, setDashboardToast] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const handleSearchHousehold = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSearchFeedback("Vui lòng nhập Mã sổ hộ khẩu (VD: HK-301), tên chủ hộ hoặc số CCCD.");
      setSearchedHousehold(null);
      return;
    }

    let foundH = households.find(
      (h) => h.code.toLowerCase() === q || h.ownerName.toLowerCase().includes(q)
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
        `Không tìm thấy hồ sơ hộ khẩu khớp "${query}". Vui lòng thử mã mẫu như ${households[0]?.code || "HK-301"}.`
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
      cccd: m.cccd || "Đang cập nhật",
      phone: m.phone || "---",
      status: (searchedHousehold.type === "Tạm trú" ? "Tạm trú" : "Thường trú") as Resident["status"],
      occupation: "Cư dân",
      address: searchedHousehold.address,
      householdId: searchedHousehold.code,
      relationToOwner: m.relation,
      avatar: "",
      joinDate: "01/01/2020",
    }));
  }, [searchedHousehold, residents]);

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

  // ===================== CITIZEN PORTAL HOME =====================
  if (!isStaff) {
    const citizenServices = [
      { id: "forms", title: "Biểu mẫu Hành chính", icon: FileText, tone: "emerald" },
      { id: "reports", title: "Phản ánh Hiện trường 1022", icon: MessageSquare, tone: "indigo" },
      { id: "gis", title: "Bản đồ Số KP3 (GIS)", icon: Map, tone: "sky" },
      { id: "finance", title: "Quỹ Khu phố & VietQR", icon: Coins, tone: "amber" },
      { id: "ai", title: "Hỏi đáp Trợ lý KP3", icon: Bot, tone: "indigo" },
      { id: "welfare", title: "An sinh Xã hội", icon: Heart, tone: "rose" },
      { id: "cultural", title: "Tin tức & Sinh hoạt KP3", icon: Bell, tone: "emerald" },
      { id: "party", title: "Ban Điều hành & 14 Tổ", icon: Users, tone: "slate" },
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Dân số KP3 (14 Tổ)"
            value={formatVNNumber(KP3_OFFICIAL_BASELINE.population)}
            icon={Users}
            color="emerald"
            subtext="Quy mô toàn khu phố"
            subtextRight={`${metrics.popMetrics.digitizedResidentsCount} hồ sơ số hóa`}
          />
          <StatCard
            label="Số Hộ gia đình"
            value={formatVNNumber(KP3_OFFICIAL_BASELINE.households)}
            icon={Home}
            color="indigo"
            subtext="Sổ hộ khẩu điện tử"
            subtextRight="14 Tổ dân phố"
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
            onClick={() => setActiveTab("forms")}
          />
        </div>

        {/* Even 8-card Quick Services Grid */}
        <section aria-labelledby="citizen-services-heading" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 id="citizen-services-heading" className="text-base font-bold text-slate-900">
              Tiện ích Cư dân Trực tuyến (8 phân hệ)
            </h2>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
              Truy cập nhanh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {citizenServices.map((svc) => {
              const IconComp = svc.icon;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setActiveTab(svc.id)}
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

        {/* Quick Administrative Forms Browser */}
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
            <Button variant="secondary" size="sm" onClick={() => setActiveTab("forms")}>
              Mở toàn bộ kho biểu mẫu
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="dashboard-form-search-input" className="sr-only">
                Tìm kiếm biểu mẫu
              </label>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="dashboard-form-search-input"
                type="search"
                value={dashboardFormSearch}
                onChange={(e) => setDashboardFormSearch(e.target.value)}
                placeholder="Tìm mã hoặc tên biểu mẫu..."
                className="w-full h-11 md:h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600"
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
                className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs font-semibold">
                      {form.code}
                    </span>
                    <span className="text-xs text-slate-600">{form.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{form.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{form.description}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Eye size={14} />}
                    onClick={() => setDashboardPreviewForm(form)}
                  >
                    Xem mẫu
                  </Button>
                  <Button
                    variant="emerald"
                    size="sm"
                    leftIcon={<Download size={14} />}
                    onClick={() => handleQuickDownloadForm(form.id)}
                  >
                    Tải .DOC
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredDashboardForms.length > 4 && !dashboardFormSearch && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => setShowAllDashboardForms((s) => !s)}>
                {showAllDashboardForms
                  ? "Thu gọn danh sách"
                  : `Xem thêm ${filteredDashboardForms.length - 4} biểu mẫu khác`}
              </Button>
            </div>
          )}
        </section>

        {/* Community Notices (Flat Hairline Light Theme) */}
        <section aria-labelledby="citizen-notices-heading" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 id="citizen-notices-heading" className="text-base font-bold text-slate-900 inline-flex items-center gap-2">
              <Bell size={18} className="text-amber-600" aria-hidden="true" />
              Bản tin & Lưu ý Sinh hoạt Cộng đồng KP3
            </h2>
            <span className="text-xs font-mono text-slate-600">Ban Điều hành KP3</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <span className="text-xs font-bold text-emerald-900 uppercase">Lịch vệ sinh</span>
              <h3 className="text-sm font-bold text-slate-900">Thu gom rác sinh hoạt hằng ngày</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Đề nghị các hộ dân buộc kín túi rác trước cửa từ 19h00 – 21h00 để đảm bảo mỹ quan 14 Tổ dân phố.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
              <span className="text-xs font-bold text-amber-900 uppercase">Y tế & tiêm chủng</span>
              <h3 className="text-sm font-bold text-slate-900">Tiêm chủng mở rộng Trạm Y tế An Phú</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Sáng thứ Bảy hằng tuần tiếp nhận khám sàng lọc định kỳ cho trẻ em dưới 5 tuổi và người cao tuổi.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
              <span className="text-xs font-bold text-indigo-900 uppercase">Chuyển đổi số</span>
              <h3 className="text-sm font-bold text-slate-900">Hỗ trợ VNeID mức 2 tại Văn phòng KP3</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Tổ Công nghệ số cộng đồng trực hướng dẫn vào tối thứ Ba và thứ Năm hằng tuần.
              </p>
            </div>
          </div>
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
            <div className="space-y-4">
              {dashboardPreviewForm.requiredDocuments.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                  <div className="font-bold">Giấy tờ cần chuẩn bị:</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {dashboardPreviewForm.requiredDocuments.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {dashboardPreviewForm.templateContent}
              </pre>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ===================== STAFF COMMAND DASHBOARD =====================
  return (
    <div id="dashboard-view" className="space-y-5">
      <PageHeader
        badgeIcon={<Activity size={14} className="text-emerald-700" />}
        badgeText="TRUNG TÂM ĐIỀU HÀNH SỐ • KP3 PHƯỜNG AN PHÚ"
        badgeSubtext="CSDL THỐNG NHẤT"
        title="Bảng Điều Hành Khu Phố 3 (14 Tổ Dân Phố)"
        actions={
          <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 shrink-0">
            <Clock size={14} className="text-emerald-700" aria-hidden="true" />
            <span>Hôm nay: {new Date().toLocaleDateString("vi-VN")}</span>
          </div>
        }
      />

      {dashboardToast && (
        <InlineNotice type="success" message={dashboardToast} onDismiss={() => setDashboardToast(null)} />
      )}

      {/* 5 Clickable Flat Hairline KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Nhân khẩu Khu phố 3"
          value={formatVNNumber(metrics.popMetrics.officialPopulation)}
          icon={Users}
          color="emerald"
          subtext={`Số hóa: ${formatVNNumber(metrics.popMetrics.digitizedResidentsCount)} (${metrics.malePctLabel}% Nam)`}
          subtextRight={`${metrics.femalePctLabel}% Nữ`}
          onClick={() => setActiveTab("residents")}
        />
        <StatCard
          label="Sổ Hộ khẩu Điện tử"
          value={formatVNNumber(metrics.popMetrics.officialHouseholds)}
          icon={Home}
          color="indigo"
          subtext={`TB: ${metrics.popMetrics.avgPerDigitizedHouseholdLabel} người/hộ`}
          subtextRight="14 Tổ dân phố"
          onClick={() => setActiveTab("households")}
        />
        <StatCard
          label="Doanh nghiệp & Hộ KD"
          value={`${formatVNNumber(metrics.enterprisesCount)} / ${formatVNNumber(metrics.establishmentsCount)}`}
          icon={Building2}
          color="blue"
          subtext={`${formatVNNumber(metrics.hostelsCount)} nhà trọ`}
          subtextRight={`${formatVNNumber(metrics.roomsCount)} phòng`}
          onClick={() => setActiveTab("businesses")}
        />
        <StatCard
          label="Phản ánh 1022"
          value={metrics.pendingReportsCount}
          icon={MessageSquare}
          color="rose"
          subtext={`Mới: ${reports.filter((r) => r.status === "Đã tiếp nhận").length}`}
          subtextRight={`Đang xử lý: ${reports.filter((r) => r.status === "Đang xử lý").length}`}
          onClick={() => setActiveTab("reports")}
        />
        <StatCard
          label="Nhiệm vụ & Tài chính"
          value={`${metrics.openTasksCount} việc`}
          icon={CheckSquare}
          color="amber"
          subtext={`Tồn quỹ: ${formatVNNumber(metrics.netFundBalance)}đ`}
          subtextRight={`${welfareCount} hồ sơ an sinh`}
          onClick={() => setActiveTab("tasks")}
        />
      </div>

      {/* Charts Row (Fixed Explicit Container Heights!) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section
          aria-label="Phân bố cư trú Khu phố"
          className="bg-white p-5 rounded-xl border border-slate-200 lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Phân bố Cư trú (Mẫu số hóa KP3)</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Phân loại {formatVNNumber(metrics.totalRes)} nhân khẩu số hóa theo tình trạng cư trú
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("residents")}>
              Xem chi tiết →
            </Button>
          </div>

          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.residencyChartData} margin={{ top: 10, right: 16, left: -12, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Số lượng" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {metrics.residencyChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs text-slate-700">
            <div>
              Thường trú: <strong className="text-emerald-800">{formatVNNumber(metrics.thuongTruCount)}</strong>
            </div>
            <div>
              Tạm trú: <strong className="text-amber-800">{formatVNNumber(metrics.tamTruCount)}</strong>
            </div>
            <div>
              Tạm vắng: <strong className="text-slate-900">{formatVNNumber(metrics.tamVangCount)}</strong>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setActiveTab("residents")}
                className="min-h-[36px] font-semibold text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1 py-1"
              >
                <Globe size={13} aria-hidden="true" />
                NNN: {formatVNNumber(metrics.foreignCount)} (Luật 47) →
              </button>
            </div>
          </div>
        </section>

        <section
          aria-label="Phân loại Phản ánh Hiện trường"
          className="bg-white p-5 rounded-xl border border-slate-200 space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">Nhóm Phản ánh 1022</h2>
            <p className="text-xs text-slate-600 mt-0.5">Tổng số {formatVNNumber(reports.length)} hồ sơ đã tiếp nhận</p>
          </div>

          <div className="w-full h-[200px]">
            {metrics.reportPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.reportPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {metrics.reportPieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#cbd5e1",
                      borderRadius: "8px",
                      color: "#0f172a",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600">
                Chưa có dữ liệu phản ánh.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1.5 text-xs pt-2 border-t border-slate-200">
            {metrics.reportPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between gap-2 text-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <strong className="font-mono">{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Real-time Actionable Alerts Strip (Flat Hairline Light Cards) */}
      <section aria-labelledby="ops-alerts-heading" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-emerald-700" aria-hidden="true" />
            <h2 id="ops-alerts-heading" className="text-base font-bold text-slate-900">
              Việc cần xử lý & Cảnh báo Điều hành hôm nay
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
            Đồng bộ liên phân hệ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-emerald-900">Cơ cấu Độ tuổi (Căn cước)</div>
              <div className="text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Dưới 14 tuổi:</span>
                  <strong className="font-mono text-slate-900">{formatVNNumber(metrics.childrenCount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Lao động (14–59):</span>
                  <strong className="font-mono text-slate-900">{formatVNNumber(metrics.workingAgeCount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cao tuổi (≥ 60):</span>
                  <strong className="font-mono text-amber-900">{formatVNNumber(metrics.elderlyCount)}</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("residents")}
              className="min-h-[36px] inline-flex items-center text-left text-xs font-bold text-emerald-800 hover:underline cursor-pointer py-1"
            >
              Xem nhân khẩu →
            </button>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-amber-950">Cảnh báo Hạn Tạm trú</div>
              <div className="text-xs text-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span>Sắp hết hạn (≤ 30 ngày):</span>
                  <strong className="font-mono text-amber-900">{formatVNNumber(metrics.expiringTamTruCount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Đã quá hạn tạm trú:</span>
                  <strong className="font-mono text-rose-800">{formatVNNumber(metrics.expiredTamTruCount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tạm trú còn hạn:</span>
                  <strong className="font-mono text-emerald-800">
                    {formatVNNumber(Math.max(0, metrics.tamTruCount - metrics.expiringTamTruCount - metrics.expiredTamTruCount))}
                  </strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("residents")}
              className="min-h-[36px] inline-flex items-center text-left text-xs font-bold text-amber-950 hover:underline cursor-pointer py-1"
            >
              Lọc danh sách hết hạn →
            </button>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-indigo-950">Nhiệm vụ & Lịch công tác</div>
              <div className="text-xs text-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span>Việc đang triển khai:</span>
                  <strong className="font-mono text-indigo-900">{formatVNNumber(metrics.openTasksCount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Việc ưu tiên khẩn cấp:</span>
                  <strong className="font-mono text-rose-800">{formatVNNumber(metrics.urgentTasksCount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phản ánh 1022 mở:</span>
                  <strong className="font-mono text-slate-900">{formatVNNumber(metrics.pendingReportsCount)}</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className="min-h-[36px] inline-flex items-center text-left text-xs font-bold text-indigo-900 hover:underline cursor-pointer py-1"
            >
              Mở bảng phân công →
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-900">Nhà trọ & Quỹ Khu phố</div>
              <div className="text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Nhà trọ số hóa:</span>
                  <strong className="font-mono text-slate-900">{formatVNNumber(metrics.hostelsCount)} cơ sở</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tổng phòng trọ:</span>
                  <strong className="font-mono text-slate-900">{formatVNNumber(metrics.roomsCount)} phòng</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tồn Quỹ Khu phố:</span>
                  <strong className="font-mono text-emerald-800">{formatVNNumber(metrics.netFundBalance)}đ</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("finance")}
              className="min-h-[36px] inline-flex items-center text-left text-xs font-bold text-emerald-800 hover:underline cursor-pointer py-1"
            >
              Quản lý Quỹ VietQR →
            </button>
          </div>
        </div>
      </section>

      {/* Officer Household Lookup with PII Toggle */}
      <section aria-labelledby="officer-hk-lookup" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 id="officer-hk-lookup" className="text-base font-bold text-slate-900">
              Tra cứu Nhanh Sổ Hộ Khẩu & Nhân Khẩu
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Tra theo Mã hộ khẩu (HK-301), tên chủ hộ hoặc số CCCD. Mặc định ẩn bớt 4 số giữa CCCD.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={showSensitivePii ? <EyeOff size={14} /> : <Eye size={14} />}
              onClick={() => setShowSensitivePii((s) => !s)}
            >
              {showSensitivePii ? "Che CCCD" : "Hiện đầy đủ CCCD"}
            </Button>
            {searchedHousehold && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X size={14} />}
                onClick={() => {
                  setSearchedHousehold(null);
                  setHouseholdSearchQuery("");
                  setSearchFeedback("");
                }}
              >
                Đóng kết quả
              </Button>
            )}
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
              Nhập mã hộ khẩu, tên chủ hộ hoặc CCCD
            </label>
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              id="dashboard-household-search-input"
              name="householdSearchQuery"
              type="search"
              placeholder="Nhập Mã hộ khẩu (VD: HK-301), Tên chủ hộ hoặc CCCD..."
              value={householdSearchQuery}
              onChange={(e) => setHouseholdSearchQuery(e.target.value)}
              className="w-full h-11 md:h-10 pl-10 pr-4 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Button type="submit" variant="emerald" size="form" leftIcon={<Search size={15} />}>
            Tra cứu hồ sơ
          </Button>
        </form>

        <div className="space-y-1.5 text-xs">
          <span className="text-slate-600 font-medium block">Mẫu tra nhanh:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {households.slice(0, 4).map((h) => (
              <button
                key={h.code}
                type="button"
                onClick={() => {
                  setHouseholdSearchQuery(h.code);
                  handleSearchHousehold(h.code);
                }}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg border font-mono font-semibold text-left truncate cursor-pointer transition-colors ${
                  searchedHousehold?.code === h.code
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-600"
                }`}
              >
                {h.code} ({h.ownerName})
              </button>
            ))}
          </div>
        </div>

        {searchFeedback && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-center gap-2">
            <HelpCircle size={15} className="shrink-0 text-amber-700" />
            <span>{searchFeedback}</span>
          </div>
        )}

        {searchedHousehold && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-800 uppercase">
                  Sổ Hộ khẩu Điện tử • {searchedHousehold.code}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Chủ hộ: {searchedHousehold.ownerName}
                </h3>
                <p className="text-xs text-slate-700">{searchedHousehold.address}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end justify-between gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-800 font-semibold">
                  {searchedHousehold.type} • {searchedMembers.length} nhân khẩu
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("households")}
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
                      <th className="py-2.5 px-4">Nghề nghiệp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {searchedMembers.map((member, idx) => (
                      <tr key={member.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{member.fullName}</td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-900">{member.relationToOwner}</td>
                        <td className="py-2.5 px-4 text-slate-700 font-mono">{member.birthDate}</td>
                        <td className="py-2.5 px-4 text-slate-800 font-mono">
                          {maskCccd(member.cccd, showSensitivePii)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{member.occupation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Row: Recent Field Reflections + Flat Hairline Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section
          aria-labelledby="recent-reports-heading"
          className="bg-white p-5 rounded-xl border border-slate-200 lg:col-span-2 space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 id="recent-reports-heading" className="text-base font-bold text-slate-900">
                Phản ánh Hiện trường 1022 Mới nhất
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">Nhấn vào từng hồ sơ để xử lý hoặc trao đổi với cư dân</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("reports")}>
              Xem tất cả →
            </Button>
          </div>

          <div className="space-y-2.5">
            {reports.slice(0, 3).map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setActiveTab("reports")}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                      {report.category}
                    </span>
                    <span className="text-slate-600 font-mono">{report.reportedAt}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">{report.title}</div>
                  <div className="text-xs text-slate-600 truncate">{report.location}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 ${
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

        <section
          aria-labelledby="quick-links-heading"
          className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
        >
          <div className="border-b border-slate-200 pb-3">
            <h2 id="quick-links-heading" className="text-base font-bold text-slate-900">
              Liên kết Điều hành Nhanh
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">Chuyển nhanh tới các phân hệ nghiệp vụ</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              {
                tab: "residents",
                title: "Đăng ký & Tra cứu Cư dân",
                desc: "Thường trú, Tạm trú & Cảnh báo hết hạn",
                icon: PlusCircle,
              },
              {
                tab: "gis",
                title: "Bản đồ GIS & Camera An ninh KP3",
                desc: "Xem vị trí hộ dân, tuyến đường & điểm nóng",
                icon: Camera,
              },
              {
                tab: "tasks",
                title: "Giao việc & Lịch Công tác",
                desc: "Kanban, Lịch họp & Báo cáo định kỳ",
                icon: CheckSquare,
              },
              {
                tab: "forms",
                title: "Kho Biểu mẫu Hành chính",
                desc: "Tải đơn CT01, xác nhận cư trú & HKD",
                icon: FileText,
              },
              {
                tab: "party",
                title: "Chi bộ, Chi hội & Tổ trưởng",
                desc: "Sinh hoạt Chi bộ, Đảng viên 213 & Đa vai trò",
                icon: TrendingUp,
              },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <IconComp size={16} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{item.title}</div>
                      <div className="text-xs text-slate-600 truncate">{item.desc}</div>
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="text-slate-500 shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
