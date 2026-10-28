import React, { useState } from "react";
import { 
  Users, 
  Home, 
  Briefcase, 
  MessageSquare, 
  TrendingUp, 
  PlusCircle, 
  ShieldAlert, 
  Activity,
  ArrowUpRight,
  Bell,
  Clock,
  User,
  Heart,
  Bot,
  Map,
  Coins,
  Search,
  CalendarDays,
  CheckCircle2,
  Building2,
  Store,
  Sparkles,
  HelpCircle,
  X,
  ChevronRight,
  FileText,
  Download,
  Eye,
  Copy,
  Check,
  Filter,
  Globe,
  MapPin
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Resident, Household, Business, FieldReport, AdministrativeForm } from "../types";
import { initialAdministrativeForms } from "../mockForms";
import { 
  extractBirthYear, 
  getTemporaryResidenceExpiryStatus 
} from "../utils/householdRecognitionUtils";

interface DashboardProps {
  residents: Resident[];
  households: Household[];
  businesses: Business[];
  reports: FieldReport[];
  forms?: AdministrativeForm[];
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

export default function Dashboard({ 
  residents, 
  households, 
  businesses, 
  reports, 
  forms = initialAdministrativeForms,
  setActiveTab,
  currentUser 
}: DashboardProps) {
  // 1. Dân cư thực tế từ Supabase CSDL
  const totalResidentsCount = residents.length;
  const maleCount = residents.filter(r => r.gender === "Nam").length;
  const femaleCount = residents.filter(r => r.gender === "Nữ").length;
  const malePct = totalResidentsCount > 0 ? ((maleCount / totalResidentsCount) * 100).toFixed(1) : "0";
  const femalePct = totalResidentsCount > 0 ? ((femaleCount / totalResidentsCount) * 100).toFixed(1) : "0";

  // Phân loại cư trú
  const thuongTruCount = residents.filter(r => r.status === "Thường trú").length;
  const tamTruCount = residents.filter(r => r.status === "Tạm trú").length;
  const tamVangCount = residents.filter(r => r.status === "Tạm vắng").length;

  // Người nước ngoài (Luật 47/2014/QH13)
  const foreignResidents = residents.filter(r => 
    (r.nationality && r.nationality !== "Việt Nam") ||
    r.passportNumber ||
    (r.cccd && (r.cccd.toLowerCase().includes("hộ chiếu") || r.cccd.toLowerCase().includes("passport"))) ||
    (r.id && r.id.startsWith("R_FOR_"))
  );
  const foreignCount = foreignResidents.length;

  // 2. Cơ cấu độ tuổi (Luật Căn cước 2023) & Cảnh báo thời hạn tạm trú thực tế
  const currentYear = 2026;
  let childrenCount = 0;   // < 14 tuổi (Trẻ em)
  let workingAgeCount = 0; // 14 - 59 tuổi (Độ tuổi lao động)
  let elderlyCount = 0;    // >= 60 tuổi (Người cao tuổi)
  let expiringTamTruCount = 0; // Hết hạn <= 30 ngày
  let expiredTamTruCount = 0;  // Đã quá hạn

  residents.forEach(r => {
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
  });

  // 3. Hộ khẩu thực tế từ Supabase CSDL
  const totalHouseholdsCount = households.length;
  const avgPerHousehold = totalHouseholdsCount > 0 
    ? (thuongTruCount / totalHouseholdsCount).toFixed(1) 
    : "0";

  // 4. Doanh nghiệp & Cơ sở kinh doanh thực tế
  const enterprises = businesses.filter(b => 
    b.businessType === "Công ty TNHH" || 
    b.businessType === "Công ty Cổ phần" || 
    b.businessType === "Doanh nghiệp tư nhân" || 
    (b.name && (b.name.toLowerCase().includes("công ty") || b.name.toLowerCase().includes("tnhh") || b.name.toLowerCase().includes("cổ phần")))
  );
  const totalEnterprisesCount = enterprises.length;

  const establishments = businesses.filter(b => !enterprises.some(e => e.id === b.id));
  const totalEstablishmentsCount = establishments.length;

  const hostelList = businesses.filter(b => b.isAccommodation);
  const totalHostelsCount = hostelList.length;
  const totalRoomsCount = hostelList.reduce((sum, h) => sum + (h.soPhong || 0), 0);

  // 5. Phản ánh hiện trường
  const pendingReportsCount = reports.filter(r => r.status !== "Đã giải quyết").length;

  // Filter household members if resident
  const familyMembers = currentUser?.role === "nguoidan" && currentUser.householdCode
    ? residents.filter(r => r.householdId === currentUser.householdCode)
    : [];

  const myReports = currentUser?.role === "nguoidan"
    ? reports.filter(r => r.reporterName === currentUser.fullName || r.reporterPhone === currentUser.phone)
    : [];

  // Demographics chart data từ CSDL thực
  const residencyChartData = [
    { name: "Thường trú", Số_lượng: thuongTruCount, color: "#10b981" },
    { name: "Tạm trú", Số_lượng: tamTruCount, color: "#f59e0b" },
    { name: "Tạm vắng", Số_lượng: tamVangCount, color: "#64748b" },
    { name: "Người nước ngoài", Số_lượng: foreignCount, color: "#9333ea" }
  ];

  // Business type chart data
  const businessTypeCounts = businesses.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const businessChartData = Object.entries(businessTypeCounts).map(([name, value]) => ({
    name,
    "Cơ sở": value
  }));

  // Report Categories distribution
  const reportCategoryCounts = reports.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6"];
  const reportPieData = Object.entries(reportCategoryCounts).map(([name, value]) => ({
    name,
    value
  }));

  const handleAdminCardClick = (targetTab: string) => {
    if (currentUser?.role === "canbo") {
      setActiveTab(targetTab);
    }
  };

  // Cán Bộ administrative household & resident lookup state
  const [householdSearchQuery, setHouseholdSearchQuery] = useState("");
  const [searchedHousehold, setSearchedHousehold] = useState<Household | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string>("");

  const handleSearchHousehold = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSearchFeedback("Vui lòng nhập Mã sổ hộ khẩu (VD: HK-301) hoặc số CCCD.");
      setSearchedHousehold(null);
      return;
    }

    let foundH = households.find(h => h.code.toLowerCase() === q);
    if (!foundH) {
      const foundRes = residents.find(r => 
        r.cccd.toLowerCase().includes(q) || 
        r.fullName.toLowerCase().includes(q)
      );
      if (foundRes && foundRes.householdId) {
        foundH = households.find(h => h.code === foundRes.householdId);
      }
    }

    if (foundH) {
      setSearchedHousehold(foundH);
      setSearchFeedback("");
    } else {
      setSearchedHousehold(null);
      setSearchFeedback(`Không tìm thấy hồ sơ hộ khẩu cho từ khóa "${query}". Cán bộ vui lòng thử các mã mẫu như HK-301, HK-302, HK-303.`);
    }
  };

  const searchedMembers = searchedHousehold 
    ? (residents.filter(r => r.householdId === searchedHousehold.code).length > 0 
        ? residents.filter(r => r.householdId === searchedHousehold.code)
        : searchedHousehold.members.map((m, idx) => ({
            id: "M-" + idx,
            fullName: m.name,
            gender: "Nam" as const,
            birthDate: "01/01/" + m.birthYear,
            cccd: m.cccd || "Đang cập nhật",
            phone: m.phone || "---",
            status: (searchedHousehold.type === "Tạm trú" ? "Tạm trú" : "Thường trú") as any,
            occupation: "Cư dân",
            address: searchedHousehold.address,
            householdId: searchedHousehold.code,
            relationToOwner: m.relation,
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            joinDate: "01/01/2020"
          }))
      )
    : [];

  // Interactive Administrative Forms on Dashboard
  const [dashboardFormSearch, setDashboardFormSearch] = useState("");
  const [dashboardFormCategory, setDashboardFormCategory] = useState("Tất cả");
  const [showAllDashboardForms, setShowAllDashboardForms] = useState(false);
  const [dashboardPreviewForm, setDashboardPreviewForm] = useState<AdministrativeForm | null>(null);
  const [dashboardToast, setDashboardToast] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const handleQuickDownloadForm = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return;
    const filename = `${form.code.replace(/[^a-zA-Z0-9]/g, "_")}_${form.title.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    const blob = new Blob([`\uFEFF` + form.templateContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDashboardToast(`Đã tải xuống biểu mẫu: "${form.code} - ${form.title}" (.DOC) thành công!`);
    setTimeout(() => setDashboardToast(null), 3500);
  };

  const dashboardFormCategories = [
    "Tất cả",
    "Cư trú & Hộ khẩu",
    "Địa chính & Nhà ở",
    "Hộ kinh doanh",
    "Hộ tịch & Tư pháp",
    "An sinh xã hội"
  ];

  const filteredDashboardForms = forms.filter(f => {
    const matchCat = dashboardFormCategory === "Tất cả" || f.category === dashboardFormCategory;
    const matchSearch = 
      f.title.toLowerCase().includes(dashboardFormSearch.toLowerCase()) ||
      f.code.toLowerCase().includes(dashboardFormSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(dashboardFormSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const displayedDashboardForms = (dashboardFormSearch || showAllDashboardForms || dashboardFormCategory !== "Tất cả")
    ? filteredDashboardForms
    : filteredDashboardForms.slice(0, 4);

  if (currentUser?.role === "nguoidan") {
    return (
      <div id="dashboard-view" className="space-y-6">
        {/* Public Citizen Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden border border-blue-900/40">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm mb-1">
              <Sparkles size={14} className="text-blue-300 animate-pulse" />
              <span>Cổng Dịch Vụ Cư Dân Số Khu Phố 3</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-normal text-[11px] text-blue-200">Truy cập mở 24/7</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Xin chào Quý Cư dân Khu phố 3, An Phú!
            </h1>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Cổng dịch vụ trực tuyến phục vụ toàn thể người dân địa phương. Tải trực tiếp 43 biểu mẫu hành chính (cấp số nhà, CT01, đăng ký kinh doanh), gửi phản ánh hiện trường 1022 và hỏi Trợ lý AI hoàn toàn miễn phí.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium backdrop-blur-md border border-white/15">
              <Clock size={15} className="text-blue-300" />
              <span>Hôm nay: {new Date().toLocaleDateString("vi-VN", { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
            </div>
            <div className="text-[11px] text-blue-200/90 font-medium font-mono">
              Phường An Phú, TP. Thủ Đức, TP. Hồ Chí Minh
            </div>
          </div>
        </div>

        {/* Quick Highlights / Key Public Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Dân cư địa phương</span>
              <span className="text-xl font-black text-slate-800">{totalResidentsCount.toLocaleString("vi-VN")}</span>
              <span className="text-[10px] text-slate-500 block font-mono">Người dân</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Home size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Hộ gia đình</span>
              <span className="text-xl font-black text-slate-800">{totalHouseholdsCount.toLocaleString("vi-VN")}</span>
              <span className="text-[10px] text-slate-500 block font-mono">Hộ cư trú</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Briefcase size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Cơ sở kinh doanh & lưu trú</span>
              <span className="text-xl font-black text-slate-800">{businesses.length}</span>
              <span className="text-[10px] text-slate-500 block font-mono">Doanh nghiệp & Hộ KD</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab("forms")}
            className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Kho biểu mẫu tải về</span>
              <span className="text-xl font-black text-slate-800">{forms.length}</span>
              <span className="text-[10px] text-emerald-600 font-bold block font-mono">Word & In trực tuyến →</span>
            </div>
          </div>
        </div>

        {/* 6 Essential Digital Services for Citizens */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Dịch Vụ Cư Dân Số Trực Tuyến</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tiếp cận nhanh các tiện ích công cộng và phản ánh đời sống thường nhật</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Tiện ích trực tuyến
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Service 1: Biểu mẫu hành chính */}
            <button
              onClick={() => setActiveTab("forms")}
              className="p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 hover:border-emerald-500 transition-all text-left flex items-start gap-3.5 cursor-pointer group shadow-2xs interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                <FileText size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                    Tải Biểu Mẫu Hành Chính
                  </h4>
                  <ChevronRight size={14} className="text-emerald-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Đơn xin cấp số nhà, Tờ khai cư trú CT01, Đăng ký hộ kinh doanh cá thể, xác nhận cư trú.
                </p>
              </div>
            </button>

            {/* Service 2 */}
            <button
              onClick={() => setActiveTab("reports")}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all text-left flex items-start gap-3.5 cursor-pointer group interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-800 transition-colors">
                    Gửi Phản Ánh Hiện Trường 1022
                  </h4>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Báo cáo rác thải, ngập nước, lấn chiếm hẻm, tiếng ồn kèm hình ảnh trực tiếp tới Ban Điều hành.
                </p>
              </div>
            </button>

            {/* Service 3 */}
            <button
              onClick={() => setActiveTab("ai")}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all text-left flex items-start gap-3.5 cursor-pointer group interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Bot size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-800 transition-colors">
                    Hỏi Đáp Trợ Lý AI Khu Phố
                  </h4>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Giải đáp 24/7 về thủ tục hành chính, đăng ký tạm trú, lịch thu gom rác, chính sách cấp cơ sở.
                </p>
              </div>
            </button>

            {/* Service 4 */}
            <button
              onClick={() => setActiveTab("gis")}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-teal-50/30 hover:border-teal-300 transition-all text-left flex items-start gap-3.5 cursor-pointer group interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Map size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-teal-800 transition-colors">
                    Bản Đồ Số Không Gian GIS
                  </h4>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-teal-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Xem bản đồ trực quan nhà ở, cửa hàng kinh doanh, điểm phản ánh và thông tin địa giới khu phố 3.
                </p>
              </div>
            </button>

            {/* Service 5 */}
            <button
              onClick={() => setActiveTab("finance")}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-amber-50/30 hover:border-amber-300 transition-all text-left flex items-start gap-3.5 cursor-pointer group interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Coins size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-800 transition-colors">
                    Quỹ Tự Quản & Đóng Góp
                  </h4>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Minh bạch thu chi Quỹ Khuyến học, Vì người nghèo, An ninh quốc phòng và tra cứu tình trạng nộp quỹ.
                </p>
              </div>
            </button>

            {/* Service 6 */}
            <button
              onClick={() => setActiveTab("welfare")}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-rose-50/30 hover:border-rose-300 transition-all text-left flex items-start gap-3.5 cursor-pointer group interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Heart size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-rose-800 transition-colors">
                    An Sinh Xã Hội & Trợ Cấp
                  </h4>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-rose-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Theo dõi chính sách chăm sóc người cao tuổi, thẻ BHYT miễn phí, quà tết hộ nghèo và cận nghèo.
                </p>
              </div>
            </button>

            {/* Service 7: Quản lý Chi hội */}
            <button
              onClick={() => setActiveTab("party")}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all text-left flex items-start gap-3.5 cursor-pointer group interactive-card interactive-tap"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-800 transition-colors">
                    Chi Hội & Đoàn Thể Cơ Sở
                  </h4>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Chi bộ Đảng, Ban điều hành khu phố, Tổ trưởng dân phố, Mặt trận, Phụ nữ, Cựu chiến binh, Đa vai trò.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* FEATURED: Biểu Mẫu Trực Tuyến Tải Nhanh Cho Cán Bộ & Cư Dân */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">
                  Kho Biểu Mẫu Hành Chính Tải Trực Tiếp (Dành Cho Cán Bộ & Cư Dân)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cung cấp đầy đủ các mẫu đơn chuẩn Word (.DOC) tải về tức thì: Cấp số nhà, Tờ khai CT01, Đăng ký hộ kinh doanh cá thể, xác nhận cư trú...
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("forms")}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60"
              >
                <span>Mở toàn bộ kho {forms.length} biểu mẫu</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Search & Category Filter */}
          <div className="flex flex-col md:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="dashboard-form-search-input"
                name="dashboardFormSearch"
                type="text"
                placeholder="Tìm nhanh biểu mẫu (ví dụ: cấp số nhà, CT01, hộ kinh doanh, sửa chữa, kết hôn)..."
                value={dashboardFormSearch}
                onChange={(e) => setDashboardFormSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0">
              {dashboardFormCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDashboardFormCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                    dashboardFormCategory === cat
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Forms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {displayedDashboardForms.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <FileText size={28} className="text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Không tìm thấy biểu mẫu nào khớp với "{dashboardFormSearch}"</p>
                <button
                  onClick={() => {
                    setDashboardFormSearch("");
                    setDashboardFormCategory("Tất cả");
                  }}
                  className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              displayedDashboardForms.map((form) => (
                <div
                  key={form.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                        {form.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{form.fileFormat}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {form.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {form.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>{form.issuingBody.split("(")[0]}</span>
                      <span className="text-emerald-600 font-semibold">{form.fee}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDashboardPreviewForm(form)}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1"
                      title="Xem trước nội dung mẫu đơn"
                    >
                      <Eye size={13} />
                      <span>Xem trước</span>
                    </button>

                    <button
                      onClick={() => handleQuickDownloadForm(form.id)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Tải biểu mẫu Microsoft Word về máy"
                    >
                      <Download size={13} />
                      <span>Tải .DOC</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Expand / Collapse or View Full Forms Tab */}
          {filteredDashboardForms.length > 4 && !dashboardFormSearch && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setShowAllDashboardForms(!showAllDashboardForms)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{showAllDashboardForms ? "Thu gọn (hiển thị 4 mẫu phổ biến)" : `Xem thêm ${filteredDashboardForms.length - 4} biểu mẫu khác`}</span>
                <ChevronRight size={14} className={showAllDashboardForms ? "-rotate-90" : "rotate-90"} />
              </button>
            </div>
          )}
        </div>

        {/* Community Field Reports Transparency (Phản ánh hiện trường 1022) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">
                  Phản Ánh Hiện Trường 1022 Khu Phố 3 Mới Nhất
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Các kiến nghị của bà con về hạ tầng, vệ sinh môi trường, an ninh trật tự được giải quyết công khai
              </p>
            </div>
            <button
              onClick={() => setActiveTab("reports")}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle size={15} /> Gửi Phản Ánh Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.slice(0, 3).map((r) => (
              <div 
                key={r.id}
                onClick={() => setActiveTab("reports")}
                className="p-4 border border-slate-100 rounded-2xl bg-slate-50/40 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {r.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0
                      ${r.status === "Đã giải quyết" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : r.status === "Đang xử lý" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-slate-200 text-slate-700"
                      }
                    `}>
                      {r.status}
                    </span>
                  </div>

                  <h5 className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {r.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {r.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{r.location}</span>
                  </span>
                  <span className="shrink-0">{r.reportedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Announcements Notice Board */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-amber-400" />
              <span className="font-bold text-sm uppercase tracking-wide text-white">
                Bản Tin & Thông Báo Cư Dân Khu Phố 3
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Ban Điều hành KP3</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Lịch Vệ Sinh</span>
              <h5 className="font-bold text-white text-xs">Thu gom rác sinh hoạt hằng ngày</h5>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Đề nghị bà con để rác vào túi kín trước cửa nhà từ 19h00 - 21h00 hằng ngày để xe thu gom đúng giờ.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Y Tế & Tiêm Chủng</span>
              <h5 className="font-bold text-white text-xs">Tiêm chủng mở rộng tại Trạm Y Tế</h5>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Sáng thứ Bảy tuần này tại Trạm Y tế Phường An Phú dành cho trẻ em dưới 5 tuổi và người cao tuổi.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Chuyển Đổi Số</span>
              <h5 className="font-bold text-white text-xs">Hỗ trợ kích hoạt định danh VNeID mức 2</h5>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Tổ công nghệ số cộng đồng trực hỗ trợ bà con vào các buổi tối thứ 3 và thứ 5 tại Văn phòng Khu phố 3.
              </p>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {dashboardToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/40 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-bounce">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="font-medium">{dashboardToast}</span>
          </div>
        )}

        {/* Preview Modal on Dashboard */}
        {dashboardPreviewForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                    {dashboardPreviewForm.code}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base truncate max-w-md">
                    {dashboardPreviewForm.title}
                  </h3>
                </div>
                <button
                  onClick={() => setDashboardPreviewForm(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-slate-50/40">
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 font-sans">
                  <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-amber-700" /> Hồ sơ kèm theo yêu cầu:
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                    {dashboardPreviewForm.requiredDocuments.map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-inner whitespace-pre-wrap text-slate-800 text-xs leading-relaxed max-h-96 overflow-y-auto font-mono">
                  {dashboardPreviewForm.templateContent}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap justify-between items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(dashboardPreviewForm.templateContent);
                    setCopiedTemplate(true);
                    setTimeout(() => setCopiedTemplate(false), 2000);
                  }}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedTemplate ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedTemplate ? "Đã sao chép nội dung" : "Sao chép nội dung"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDashboardPreviewForm(null);
                      setActiveTab("forms");
                    }}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Điền trực tuyến
                  </button>
                  <button
                    onClick={() => {
                      handleQuickDownloadForm(dashboardPreviewForm.id);
                      setDashboardPreviewForm(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Download size={14} /> Tải văn bản (.DOC)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Banner / Welcome Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-lg relative overflow-hidden border border-blue-900/40">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Trung Tâm Điều Hành Cán Bộ • KP3 An Phú</span>
            <span className="w-1 h-1 rounded-full bg-blue-300"></span>
            <span className="font-mono text-[10px] text-blue-300 font-normal">WGS-84 CRS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bàn Làm Việc & Điều Hành Khu Phố 3
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Giám sát trực quan dữ liệu 11.632 nhân khẩu, 488 hộ gia đình, 118 cơ sở kinh doanh và tiếp nhận xử lý phản ánh hiện trường 1022 theo thời gian thực.
          </p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold backdrop-blur-md border border-white/15">
            <Clock size={14} className="text-blue-300" />
            <span>{new Date().toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Supabase PostgreSQL: Đã đồng bộ</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => handleAdminCardClick("residents")}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 cursor-pointer shadow-sm group interactive-card interactive-tap"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Tổng số Dân cư</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalResidentsCount.toLocaleString("vi-VN")}</span>
                <span className="text-emerald-500 text-[10px] font-semibold flex items-center gap-0.5">
                  CSDL <TrendingUp size={11} />
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <Users size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-50 flex justify-between text-[11px] text-slate-500">
            <span>Nam: <strong className="text-slate-700">{maleCount.toLocaleString("vi-VN")}</strong> ({malePct}%)</span>
            <span>Nữ: <strong className="text-slate-700">{femaleCount.toLocaleString("vi-VN")}</strong> ({femalePct}%)</span>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => setActiveTab("households")}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 cursor-pointer shadow-sm group interactive-card interactive-tap"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Số Hộ khẩu</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalHouseholdsCount.toLocaleString("vi-VN")}</span>
                <span className="text-slate-400 text-[10px]">Điện tử</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
              <Home size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-50 flex justify-between text-[11px] text-slate-500">
            <span>TB: <strong className="text-slate-700">{avgPerHousehold}</strong> người/hộ</span>
            <span>{totalHouseholdsCount} hộ số hóa</span>
          </div>
        </div>

        {/* Card 3: Doanh nghiệp (DNNVV) */}
        <div 
          onClick={() => setActiveTab("enterprises")}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:shadow-lg transition-all duration-300 cursor-pointer shadow-sm group interactive-card interactive-tap"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider block font-bold">Doanh nghiệp (DNNVV)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalEnterprisesCount}</span>
                <span className="text-indigo-500 text-[10px] font-semibold flex items-center gap-0.5">
                  Độc lập <TrendingUp size={11} />
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <Building2 size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-50 flex justify-between text-[11px] text-slate-500">
            <span>TNHH & Cổ phần</span>
            <span>100% có MST</span>
          </div>
        </div>

        {/* Card 4: Cơ sở Kinh doanh & Hộ cá thể */}
        <div 
          onClick={() => setActiveTab("businesses")}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-amber-500 hover:shadow-lg transition-all duration-300 cursor-pointer shadow-sm group interactive-card interactive-tap"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Cơ sở Kinh doanh</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalEstablishmentsCount}</span>
                <span className="text-amber-600 text-[10px] font-semibold flex items-center gap-0.5">
                  Tại chỗ
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              <Store size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-50 flex justify-between text-[11px] text-slate-500">
            <span>{totalHostelsCount} nhà trọ ({totalRoomsCount} phòng)</span>
            <span>{establishments.length - totalHostelsCount} Hộ KD khác</span>
          </div>
        </div>

        {/* Card 5: Phản ánh chưa xử lý */}
        <div 
          onClick={() => setActiveTab("reports")}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-rose-500 hover:shadow-lg transition-all duration-300 cursor-pointer shadow-sm group interactive-card interactive-tap"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Phản ánh hiện trường</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-rose-600">{pendingReportsCount}</span>
                <span className="text-rose-500 text-[10px] font-semibold animate-pulse">Cần xử lý</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
              <MessageSquare size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-50 flex justify-between text-[11px] text-slate-500">
            <span>Mới: <strong className="text-rose-600">{reports.filter(r => r.status === "Đã tiếp nhận").length}</strong></span>
            <span>Đang xử lý: <strong className="text-amber-600">{reports.filter(r => r.status === "Đang xử lý").length}</strong></span>
          </div>
        </div>
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Demographics Chart (2/3 width) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900">Phân bố Cư trú Khu phố</h2>
              <p className="text-xs text-slate-400 mt-0.5">Số liệu nhân khẩu phân loại theo tình trạng khai báo cư trú</p>
            </div>
            <span className="p-1.5 bg-slate-50 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <Activity size={16} />
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={residencyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="Số_lượng" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {residencyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick demographic status breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-slate-600">Thường trú: <strong>{thuongTruCount.toLocaleString("vi-VN")}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-slate-600">Tạm trú: <strong>{tamTruCount.toLocaleString("vi-VN")}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
              <span className="text-slate-600">Tạm vắng: <strong>{tamVangCount.toLocaleString("vi-VN")}</strong></span>
            </div>
            <div 
              onClick={() => setActiveTab("residents")}
              className="flex items-center gap-1.5 cursor-pointer text-purple-700 hover:text-purple-900 font-semibold transition-colors"
              title="Xem danh sách người cư trú nước ngoài tại Khu phố 3"
            >
              <Globe size={13} className="text-purple-600 shrink-0" />
              <span>NNN: <strong>{foreignCount}</strong> (Luật 47) →</span>
            </div>
          </div>
        </div>

        {/* Right Category Distribution (1/3 width) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h2 className="font-bold text-slate-900">Danh mục Phản ánh</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tỷ lệ rải rác các phản ánh hiện trường đã gửi</p>
          </div>

          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reportPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {reportPieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-slate-500 truncate" title={item.name}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Khối Chỉ Số Quản Lý Dân Cư & Cảnh Báo Điều Hành KP3 */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-emerald-400" />
                Chỉ Số Quản Lý Dân Cư & Cảnh Báo Điều Hành KP3
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Đối soát tự động từ 11.632 nhân khẩu, 488 hộ gia đình và 118 cơ sở kinh doanh - Dữ liệu thực tế thời gian thực
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              ✓ CSDL Số Hóa 100%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Box 1: Cơ cấu độ tuổi */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-2 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span>Cơ cấu Độ tuổi (Căn cước 2023)</span>
              <Users size={16} />
            </div>
            <div className="space-y-1.5 text-xs text-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trẻ em (&lt;14 tuổi):</span>
                <strong className="text-white font-mono">{childrenCount.toLocaleString("vi-VN")}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Độ tuổi lao động (14-59):</span>
                <strong className="text-white font-mono">{workingAgeCount.toLocaleString("vi-VN")}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Người cao tuổi (≥60):</span>
                <strong className="text-amber-300 font-mono">{elderlyCount.toLocaleString("vi-VN")}</strong>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Tổng: {totalResidentsCount.toLocaleString("vi-VN")} người</span>
              <button 
                onClick={() => setActiveTab("residents")}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
              >
                Chi tiết →
              </button>
            </div>
          </div>

          {/* Box 2: Cảnh báo Tạm trú */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-2 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
              <span>Cảnh Báo Hạn Tạm Trú (Công an KV)</span>
              <Clock size={16} />
            </div>
            <div className="space-y-1.5 text-xs text-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sắp hết hạn (≤30 ngày):</span>
                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${expiringTamTruCount > 0 ? "bg-amber-500/20 text-amber-300 border border-amber-400/30 animate-pulse" : "text-slate-300"}`}>
                  {expiringTamTruCount} người
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Đã quá hạn tạm trú:</span>
                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${expiredTamTruCount > 0 ? "bg-rose-500/20 text-rose-300 border border-rose-400/30" : "text-slate-300"}`}>
                  {expiredTamTruCount} người
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hồ sơ tạm trú an toàn:</span>
                <strong className="text-emerald-300 font-mono">{Math.max(0, tamTruCount - expiringTamTruCount - expiredTamTruCount).toLocaleString("vi-VN")}</strong>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center">
              <span>{tamTruCount.toLocaleString("vi-VN")} hồ sơ tạm trú</span>
              <button 
                onClick={() => setActiveTab("residents")}
                className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
              >
                Lọc cảnh báo →
              </button>
            </div>
          </div>

          {/* Box 3: Mạng lưới Cơ sở Lưu Trú */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-2 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-sky-300 font-bold">
              <span>Nhà Trọ & Cơ Sở Lưu Trú</span>
              <Store size={16} />
            </div>
            <div className="space-y-1.5 text-xs text-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số cơ sở trọ số hóa:</span>
                <strong className="text-white font-mono">{totalHostelsCount} cơ sở</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tổng quy mô phòng:</span>
                <strong className="text-sky-300 font-mono">{totalRoomsCount} phòng</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Khách tạm trú thực tế:</span>
                <strong className="text-emerald-300 font-mono">{tamTruCount.toLocaleString("vi-VN")} người</strong>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center">
              <span>Đã liên kết CSDL cư dân</span>
              <button 
                onClick={() => setActiveTab("businesses")}
                className="text-sky-400 hover:text-sky-300 font-bold transition-colors cursor-pointer"
              >
                Xem cơ sở →
              </button>
            </div>
          </div>

          {/* Box 4: Sổ hộ khẩu điện tử */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-2 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
              <span>Sổ Hộ Khẩu & Thường Trú</span>
              <Home size={16} />
            </div>
            <div className="space-y-1.5 text-xs text-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tổng số Sổ hộ khẩu:</span>
                <strong className="text-white font-mono">{totalHouseholdsCount} hộ (HK-xxx)</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nhân khẩu thường trú:</span>
                <strong className="text-indigo-300 font-mono">{thuongTruCount.toLocaleString("vi-VN")} người</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nhận diện gia phả:</span>
                <strong className="text-emerald-300 font-mono">100% tự động</strong>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center">
              <span>TB {avgPerHousehold} người/hộ</span>
              <button 
                onClick={() => setActiveTab("households")}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
              >
                Xem Sổ HK →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Officer Household Lookup Tool (Restricted strictly to Cán bộ) */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">
                Nghiệp Vụ Cán Bộ: Tra Cứu Sổ Hộ Khẩu & Nhân Khẩu Cư Trú
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                Chỉ Cán Bộ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tra cứu nhanh hồ sơ nhân khẩu và sổ hộ khẩu phục vụ công tác đối soát hành chính và xác minh cư trú
            </p>
          </div>
          {searchedHousehold && (
            <button
              onClick={() => {
                setSearchedHousehold(null);
                setHouseholdSearchQuery("");
                setSearchFeedback("");
              }}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <X size={14} /> Đóng kết quả tra cứu
            </button>
          )}
        </div>

        {/* Search Bar Input */}
        <div className="space-y-3">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchHousehold(householdSearchQuery);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                id="dashboard-household-search-input"
                name="householdSearchQuery"
                type="text"
                placeholder="Nhập Mã hộ khẩu (ví dụ: HK-001) hoặc số CCCD cán bộ cần kiểm tra..."
                value={householdSearchQuery}
                onChange={(e) => setHouseholdSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-2 shadow-xs"
            >
              <Search size={16} />
              Tra cứu hồ sơ
            </button>
          </form>

          {/* Quick Sample Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Hộ khẩu mẫu trên địa bàn:</span>
            {households.slice(0, 4).map((h) => (
              <button
                key={h.code}
                type="button"
                onClick={() => {
                  setHouseholdSearchQuery(h.code);
                  handleSearchHousehold(h.code);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  searchedHousehold?.code === h.code
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40"
                }`}
              >
                {h.code} ({h.ownerName})
              </button>
            ))}
          </div>

          {searchFeedback && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <HelpCircle size={15} className="shrink-0 text-amber-600" />
              <span>{searchFeedback}</span>
            </div>
          )}
        </div>

        {/* Searched Household Result Card */}
        {searchedHousehold && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-mono">
                      SỔ HỘ KHẨU ĐIỆN TỬ (CƠ SỞ DỮ LIỆU ĐỊA PHƯƠNG)
                    </span>
                    <h4 className="text-2xl font-black font-mono tracking-wider mt-0.5 text-white">
                      {searchedHousehold.code}
                    </h4>
                    <p className="text-slate-300 text-xs mt-1">
                      Chủ hộ: <strong className="text-white text-sm font-bold">{searchedHousehold.ownerName}</strong>
                    </p>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Địa chỉ: {searchedHousehold.address}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold shrink-0">
                    {searchedHousehold.type}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap gap-4 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tọa độ GIS:</span>
                    <span className="font-mono text-emerald-300 text-[11px]">{searchedHousehold.coordinates || "Đang định vị"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tổng số nhân khẩu:</span>
                    <span className="font-bold text-white text-xs">{searchedMembers.length} thành viên</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    QUẢN LÝ DÂN CƯ
                  </span>
                  <h5 className="font-bold text-slate-800 text-sm">Hồ sơ Cư trú Hợp lệ</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dữ liệu được cập nhật từ hồ sơ đăng ký thường trú / tạm trú và sổ hộ khẩu điện tử Khu phố 3.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-emerald-100/80 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab("households")}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Xem chi tiết tại Quản lý Hộ khẩu →
                  </button>
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                  Danh sách nhân khẩu đăng ký trong hộ ({searchedMembers.length} người)
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Mã HK: {searchedHousehold.code}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold text-[10px] bg-white">
                      <th className="py-2.5 px-4">Họ và tên</th>
                      <th className="py-2.5 px-4">Quan hệ với chủ hộ</th>
                      <th className="py-2.5 px-4">Ngày / Năm sinh</th>
                      <th className="py-2.5 px-4">Số CCCD</th>
                      <th className="py-2.5 px-4">Nghề nghiệp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {searchedMembers.map((member, idx) => (
                      <tr key={member.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{member.fullName}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-800">
                          <span className="bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {member.relationToOwner}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{member.birthDate}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono font-medium">{member.cccd}</td>
                        <td className="py-3 px-4 text-slate-600">{member.occupation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Recent Reflections and Bento Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reflections List (2/3 width) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div>
              <h2 className="font-bold text-slate-900">Báo cáo Phản ánh Mới nhận</h2>
              <p className="text-xs text-slate-400 mt-0.5">Theo dõi thời gian thực phản hồi từ công dân</p>
            </div>
            <button 
              onClick={() => setActiveTab("reports")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              Xem tất cả <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {reports.slice(0, 3).map((report) => {
              const statusColors = {
                "Đã tiếp nhận": "bg-blue-50 text-blue-600 border-blue-100",
                "Đang xử lý": "bg-amber-50 text-amber-600 border-amber-100",
                "Đã giải quyết": "bg-emerald-50 text-emerald-600 border-emerald-100"
              };
              return (
                <div 
                  key={report.id} 
                  onClick={() => setActiveTab("reports")}
                  className="p-4 rounded-xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50/50 transition-all cursor-pointer flex justify-between items-center"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{report.category}</span>
                      <span className="text-slate-400 text-[10px]">{report.reportedAt}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{report.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{report.location}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 font-medium ${statusColors[report.status]}`}>
                    {report.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bento Quick Actions (1/3 width) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h2 className="font-bold text-slate-900">Liên kết Nhanh</h2>
            <p className="text-xs text-slate-400 mt-0.5">Các chức năng khẩn cấp và thường dùng</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <button 
              onClick={() => setActiveTab("residents")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 text-emerald-900 hover:from-emerald-500/15 border border-emerald-500/20 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm shrink-0">
                  <PlusCircle size={16} />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Đăng ký Cư dân</span>
                  <span className="text-[10px] text-slate-500">Khai báo tạm trú/tạm vắng mới</span>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-emerald-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <button 
              onClick={() => setActiveTab("ai")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 text-indigo-900 hover:from-indigo-500/15 border border-indigo-500/20 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm shrink-0">
                  <Bell size={16} />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Trợ lý Hỏi đáp</span>
                  <span className="text-[10px] text-slate-500">Đặt câu hỏi quy trình và văn bản</span>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-indigo-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <button 
              onClick={() => setActiveTab("forms")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-teal-500/10 to-teal-600/5 text-teal-900 hover:from-teal-500/15 border border-teal-500/20 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-teal-600 shadow-sm shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Kho Biểu mẫu Hành chính</span>
                  <span className="text-[10px] text-slate-500">Tải đơn cấp số nhà, CT01, HKD cá thể</span>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-teal-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <button 
              onClick={() => setActiveTab("gis")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-slate-500/10 to-slate-600/5 text-slate-900 hover:from-slate-500/15 border border-slate-300/20 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-slate-600 shadow-sm shrink-0">
                  <Activity size={16} />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Camera Giám sát</span>
                  <span className="text-[10px] text-slate-500">Giám sát các mắt camera an ninh LIVE</span>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <button 
              onClick={() => setActiveTab("party")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-600/10 to-teal-600/5 text-emerald-950 hover:from-emerald-600/15 border border-emerald-600/20 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-emerald-700 shadow-sm shrink-0">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Quản lý Chi hội & Đoàn thể</span>
                  <span className="text-[10px] text-slate-500">Chi bộ, Ban điều hành, Đa vai trò cư dân</span>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-emerald-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
