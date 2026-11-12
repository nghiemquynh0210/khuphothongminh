import React, { useState, useId, useEffect } from "react";
import {
  Building2,
  Search,
  Filter,
  MapPin,
  Phone,
  User,
  UserCheck,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Printer,
  Download,
  List,
  LayoutGrid,
  TrendingUp,
  Briefcase,
  Sparkles,
  Building,
  Users2,
  Globe,
  HelpCircle,
  History,
  CheckCircle2,
  Clock,
  Mail,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  Navigation,
  Compass,
  Check,
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon
} from "lucide-react";
import { Business, BusinessChangeLog, Resident, Household, ForeignWorker, BusinessFile, TargetGisItem } from "../types";
import {
  KP3_CENTER,
  decimalToDMS,
  parseCoordinates as parseGisCoords,
  generateDefaultCoordinatesForAddress,
  getGoogleMapsDirectionUrl
} from "../utils/gisUtils";
import Pagination from "./Pagination";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { formatVNNumber } from "../utils/numberFormat";
import PageHeader from "./common/PageHeader";
import StatCard from "./common/StatCard";
import { ReportSelect } from "./reports/ReportSelect";
import { InlineNotice } from "./ui/ConfirmModal";
import { KP3_AREA_LIST, extractKp3Area } from "../utils/kp3Utils";
import {
  getEnterpriseCreatePath,
  getEnterpriseDetailPath,
  navigate,
} from "../routes";

interface EnterpriseManagementProps {
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  onToggleCertification: (id: string) => void;
  onUpdateStatus: (id: string, status: "Đang hoạt động" | "Tạm ngưng" | "Chờ duyệt" | "Chuyển địa điểm" | "Chưa xác minh") => void;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
}

// Helper to identify enterprises (DNNVV)
export const isEnterpriseEntity = (b: Business): boolean => {
  if (b.businessType) {
    if (["Công ty TNHH", "Công ty Cổ phần", "Doanh nghiệp tư nhân", "Cơ sở kinh doanh khác"].includes(b.businessType)) {
      return true;
    }
    if (b.businessType === "Hộ kinh doanh") return false;
  }
  const nameLower = (b.name || "").toLowerCase();
  const typeLower = (b.type || "").toLowerCase();
  return (
    nameLower.includes("công ty") ||
    nameLower.includes("tnhh") ||
    nameLower.includes("cổ phần") ||
    nameLower.includes("doanh nghiệp") ||
    nameLower.includes("nhà sách") ||
    typeLower.includes("công ty") ||
    (b.employeeCount && b.employeeCount >= 5 && !b.isAccommodation)
  );
};

export const getEnterpriseScaleLabel = (b: Business): "Siêu nhỏ (< 5 LĐ)" | "Nhỏ (5 - 20 LĐ)" | "Vừa (20 - 50 LĐ)" | "Lớn (> 50 LĐ)" => {
  if (b.enterpriseScale) return b.enterpriseScale;
  const count = b.employeeCount || 1;
  if (count < 5) return "Siêu nhỏ (< 5 LĐ)";
  if (count <= 20) return "Nhỏ (5 - 20 LĐ)";
  if (count <= 50) return "Vừa (20 - 50 LĐ)";
  return "Lớn (> 50 LĐ)";
};

// Default curated corporate & office images for enterprises (DNNVV)
export const ENTERPRISE_DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600", // Tòa nhà kính văn phòng hiện đại
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", // Không gian làm việc công nghệ hiện đại
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600", // Trụ sở công ty khang trang
  "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600", // Kiến trúc trụ sở văn phòng
  "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=600", // Khu liên hợp văn phòng
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600", // Studio & công nghệ cao
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600", // Xưởng sản xuất công nghiệp hiện đại
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600"  // Phòng họp điều hành doanh nghiệp
];

export const getEnterpriseImage = (ent?: Business | null): string => {
  if (!ent) return ENTERPRISE_DEFAULT_IMAGES[0];
  if (ent.image && typeof ent.image === "string" && ent.image.trim() !== "") {
    return ent.image;
  }
  if (ent.images && Array.isArray(ent.images) && ent.images.length > 0 && ent.images[0] && ent.images[0].trim() !== "") {
    return ent.images[0];
  }
  const hash = (ent.id || ent.name || "DN")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ENTERPRISE_DEFAULT_IMAGES[hash % ENTERPRISE_DEFAULT_IMAGES.length];
};

export default function EnterpriseManagement({
  businesses,
  residents = [],
  households = [],
  onToggleCertification,
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis
}: EnterpriseManagementProps) {
  // Navigation tabs: Danh mục vs Báo cáo kinh tế địa bàn
  const [activeMainTab, setActiveMainTab] = useState<"list" | "economicReport">("list");

  // Subsystem tab bar visibility (hideable / collapsible preference)
  const [isSubTabsHidden, setIsSubTabsHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("kp3_enterprise_hide_subtabs") === "true";
    } catch {
      return false;
    }
  });

  const toggleSubTabs = () => {
    setIsSubTabsHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem("kp3_enterprise_hide_subtabs", String(next));
      } catch { }
      return next;
    });
  };

  // GIS Coordinate Pinning & Navigation Modal States
  const [gisPinModalEnterprise, setGisPinModalEnterprise] = useState<Business | null>(null);
  const [gisPinInput, setGisPinInput] = useState("");

  const handleDirections = (ent: Business) => {
    let coords = ent.coordinates;
    if (!coords || !parseGisCoords(coords)) {
      const autoGeo = generateDefaultCoordinatesForAddress(ent.address, ent.id);
      coords = autoGeo.dms;
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.map(b => b.id === ent.id ? { ...b, coordinates: coords } : b));
      }
    }
    if (onNavigateToGis) {
      onNavigateToGis({
        id: ent.id,
        type: "enterprise",
        name: ent.name,
        address: ent.address,
        coordinates: coords,
        navigateRoute: true
      });
    }
  };

  const openPinModal = (ent: Business) => {
    setGisPinModalEnterprise(ent);
    if (ent.coordinates) {
      setGisPinInput(ent.coordinates);
    } else {
      const auto = generateDefaultCoordinatesForAddress(ent.address, ent.id);
      setGisPinInput(auto.dms);
    }
  };

  const handleSavePinCoordinates = (andNavigate: boolean = false) => {
    if (!gisPinModalEnterprise) return;
    const finalCoord = gisPinInput.trim();
    if (!finalCoord) {
      showToast("Vui lòng nhập hoặc lấy tọa độ GIS!", "warning");
      return;
    }

    const updated = { ...gisPinModalEnterprise, coordinates: finalCoord };
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === updated.id ? updated : b));
    }
    setGisPinModalEnterprise(null);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: updated.id,
        type: "enterprise",
        name: updated.name,
        address: updated.address,
        coordinates: finalCoord,
        navigateRoute: true
      });
    } else {
      showToast(`Đã đồng bộ tọa độ ${updated.name} lên bản đồ GIS!`, "success");
    }
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("Tất cả");
  const [scaleFilter, setScaleFilter] = useState<string>("Tất cả");
  const [streetFilter, setStreetFilter] = useState<string>("Tất cả");
  const [toFilter, setToFilter] = useState<string>("Tất cả");
  const [statusFilter, setStatusFilter] = useState<string>("Tất cả");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Base enterprise list
  const enterprises = React.useMemo(() => {
    return businesses.filter(isEnterpriseEntity);
  }, [businesses]);

  // Filtered Enterprises
  const filteredEnterprises = React.useMemo(() => {
    return enterprises.filter((item) => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        item.name.toLowerCase().includes(searchLower) ||
        (item.internalCode || "").toLowerCase().includes(searchLower) ||
        (item.taxCode || "").toLowerCase().includes(searchLower) ||
        (item.legalRepresentative || item.owner || "").toLowerCase().includes(searchLower) ||
        (item.focalPointName || "").toLowerCase().includes(searchLower) ||
        item.address.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      // Type filter
      if (typeFilter !== "Tất cả") {
        const itemType = item.businessType || "Công ty TNHH";
        if (itemType !== typeFilter) return false;
      }

      // Scale filter
      if (scaleFilter !== "Tất cả") {
        const scale = getEnterpriseScaleLabel(item);
        if (scale !== scaleFilter) return false;
      }

      // Street filter
      if (streetFilter !== "Tất cả") {
        const street = item.streetArea || (item.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của");
        if (street !== streetFilter) return false;
      }

      // Khu vuc KP3 filter
      if (toFilter !== "Tất cả") {
        if (extractKp3Area(item.address) !== toFilter) return false;
      }

      // Status filter
      if (statusFilter !== "Tất cả") {
        if (item.status !== statusFilter) return false;
      }

      return true;
    });
  }, [enterprises, searchTerm, typeFilter, scaleFilter, streetFilter, toFilter, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, scaleFilter, streetFilter, toFilter, statusFilter]);

  // Pagination
  const totalItems = filteredEnterprises.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedEnterprises = filteredEnterprises.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const tnhhCount = enterprises.filter(b => b.businessType === "Công ty TNHH").length;
  const cpCount = enterprises.filter(b => b.businessType === "Công ty Cổ phần").length;
  const dntnCount = enterprises.filter(b => b.businessType === "Doanh nghiệp tư nhân").length;
  const otherCount = enterprises.filter(b => b.businessType === "Cơ sở kinh doanh khác" || (!b.businessType && isEnterpriseEntity(b))).length;

  const totalEmployees = enterprises.reduce((sum, b) => sum + (b.employeeCount || 0), 0);
  const totalForeignWorkers = enterprises.reduce((sum, b) => sum + (b.foreignWorkersCount || (b.foreignWorkers?.length || 0)), 0);
  const totalSupportNeeds = enterprises.filter(b => (b.supportNeeds && b.supportNeeds.length > 0) || Boolean(b.supportNotes)).length;

  const scaleMicro = enterprises.filter(b => getEnterpriseScaleLabel(b) === "Siêu nhỏ (< 5 LĐ)").length;
  const scaleSmall = enterprises.filter(b => getEnterpriseScaleLabel(b) === "Nhỏ (5 - 20 LĐ)").length;
  const scaleMedium = enterprises.filter(b => getEnterpriseScaleLabel(b) === "Vừa (20 - 50 LĐ)").length;
  const scaleLarge = enterprises.filter(b => getEnterpriseScaleLabel(b) === "Lớn (> 50 LĐ)").length;

  const getEnterpriseForeignResidents = (b: Business): Resident[] => {
    return residents.filter(r => {
      const isForeign = r.nationality && r.nationality !== "Việt Nam";
      if (!isForeign) return false;
      if (r.workplace && b.name && r.workplace.toLowerCase().includes(b.name.toLowerCase())) return true;
      if (b.linkedHouseholdCode && r.householdId === b.linkedHouseholdCode) return true;
      return false;
    });
  };

  const handleOpenDetailModal = (ent: Business) => {
    navigate(getEnterpriseDetailPath(ent.id));
  };

  // Handle Export CSV Report
  const handleExportCSV = () => {
    const headers = [
      "Mã nội bộ",
      "Tên Doanh nghiệp",
      "Mã số thuế",
      "Loại hình tổ chức",
      "Quy mô lao động (NĐ 80)",
      "Lĩnh vực hoạt động",
      "Địa chỉ trụ sở",
      "Tuyến đường",
      "Loại mặt bằng",
      "Người đại diện pháp luật",
      "SĐT đại diện",
      "Email công vụ",
      "Người quản lý tại chỗ",
      "Đầu mối phối hợp địa phương",
      "SĐT đầu mối công vụ",
      "Lao động thường trú",
      "Lao động tạm trú",
      "Lao động nước ngoài",
      "Trạng thái hoạt động",
      "Nhu cầu hỗ trợ",
      "Kiến nghị khó khăn"
    ];

    const rows = enterprises.map(b => [
      `"${b.internalCode || `DN-KP3-${b.id}`}"`,
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.taxCode || ""}"`,
      `"${b.businessType || "Công ty TNHH"}"`,
      `"${getEnterpriseScaleLabel(b)}"`,
      `"${b.type}"`,
      `"${b.address.replace(/"/g, '""')}"`,
      `"${b.streetArea || (b.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của")}"`,
      `"${b.premisesType || "Văn phòng"}"`,
      `"${b.legalRepresentative || b.owner}"`,
      `"${b.legalRepPhone || b.phone}"`,
      `"${b.legalRepEmail || ""}"`,
      `"${b.siteManager || b.owner}"`,
      `"${b.focalPointName || b.owner}"`,
      `"${b.focalPointPhone || b.phone}"`,
      b.localWorkersCount ?? Math.floor((b.employeeCount || 2) / 2),
      b.temporaryWorkersCount ?? Math.ceil((b.employeeCount || 2) / 2),
      b.foreignWorkersCount || (b.foreignWorkers?.length || 0),
      `"${b.status}"`,
      `"${(b.supportNeeds || []).join("; ")}"`,
      `"${(b.supportNotes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_Doanh_nghiep_DNNVV_KP3_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất file báo cáo doanh nghiệp KP3 thành công!", "success");
  };

  return (
    <div id="enterprise-management-view" className="space-y-6">
      {/* Standard Executive Header */}
      <PageHeader
        badgeIcon={<Building2 size={13} className="text-emerald-600" />}
        badgeText="CSDL DOANH NGHIỆP • KP3 AN PHÚ"
        badgeSubtext="DNNVV"
        title="Quản lý Doanh nghiệp Vừa & Nhỏ"
        actions={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Quick Switch View Pill when tabs are hidden */}
            {isSubTabsHidden && (
              <button
                type="button"
                onClick={() => setActiveMainTab(activeMainTab === "list" ? "economicReport" : "list")}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl font-bold text-xs border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                title={`Chuyển sang ${activeMainTab === "list" ? "Báo cáo Kinh tế Địa bàn" : "Danh mục Doanh nghiệp"}`}
              >
                {activeMainTab === "list" ? (
                  <>
                    <FileText size={14} className="text-indigo-600" />
                    <span>Báo cáo Kinh tế</span>
                  </>
                ) : (
                  <>
                    <Building2 size={14} className="text-indigo-600" />
                    <span>Danh mục DN ({formatVNNumber(enterprises.length)})</span>
                  </>
                )}
              </button>
            )}

            {/* Toggle show/hide sub-tabs button */}
            <button
              type="button"
              onClick={toggleSubTabs}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 px-2.5 py-2 rounded-xl font-bold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title={isSubTabsHidden ? "Hiện thanh chuyển phân hệ (Danh mục / Báo cáo)" : "Ẩn thanh chuyển phân hệ để mở rộng không gian"}
            >
              {isSubTabsHidden ? (
                <>
                  <Eye size={14} className="text-emerald-600" />
                  <span className="hidden sm:inline">Hiện thanh tab</span>
                </>
              ) : (
                <>
                  <EyeOff size={14} className="text-slate-500" />
                  <span className="hidden sm:inline">Ẩn thanh tab</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Xuất file báo cáo doanh nghiệp định dạng CSV/Excel"
            >
              <Download size={15} /> Xuất CSV
            </button>
            <button
              type="button"
              onClick={() => navigate(getEnterpriseCreatePath())}
              className="flex items-center gap-2 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} /> Đăng ký Doanh nghiệp Mới
            </button>
          </div>
        }
      />

      {/* Main Subsystem Tabs - Flat Hairline, responsive wrap */}
      {!isSubTabsHidden && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 transition-all">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setActiveMainTab("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${activeMainTab === "list"
                  ? "bg-white text-indigo-800 border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
            >
              <Building2 size={14} className={activeMainTab === "list" ? "text-indigo-600" : "text-slate-500"} />
              <span>Danh mục Doanh nghiệp & Hồ sơ DNNVV</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeMainTab === "list" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-700"
                }`}>
                {formatVNNumber(enterprises.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("economicReport")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${activeMainTab === "economicReport"
                  ? "bg-white text-indigo-800 border border-indigo-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
            >
              <FileText size={14} className={activeMainTab === "economicReport" ? "text-indigo-600" : "text-slate-500"} />
              <span>Báo cáo Kinh tế Địa bàn & Biến động</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeMainTab === "economicReport" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-200 text-slate-700"
                }`}>
                Bí thư / Trưởng KP
              </span>
            </button>
          </div>

          {/* Quick Hide Action */}
          <button
            type="button"
            onClick={toggleSubTabs}
            className="min-h-[36px] flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Ẩn thanh tab này để mở rộng không gian làm việc"
          >
            <EyeOff size={13} className="text-slate-500" />
            <span className="hidden sm:inline">Ẩn thanh này</span>
          </button>
        </div>
      )}

      {/* VIEW 1: DANH MỤC DOANH NGHIỆP & HỒ SƠ */}
      {activeMainTab === "list" ? (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              label="Tổng doanh nghiệp"
              value={enterprises.length}
              badge="đơn vị"
              icon={Building2}
              color="emerald"
              highlighted={true}
              subtext="DNNVV đăng ký hoạt động"
              subtextRight="100% có MST"
            />

            <StatCard
              label="Công ty TNHH"
              value={tnhhCount}
              badge={`${((tnhhCount / (enterprises.length || 1)) * 100).toFixed(0)}%`}
              icon={Briefcase}
              color="blue"
              subtext="TNHH 1 TV & 2 TV"
              subtextRight={`${formatVNNumber(tnhhCount)} cty`}
            />

            <StatCard
              label="Cổ phần & DNTN"
              value={cpCount + dntnCount}
              badge="cơ sở"
              icon={TrendingUp}
              color="purple"
              subtext="Kinh tế tư nhân KP3"
              subtextRight={`${formatVNNumber(cpCount)} CP / ${formatVNNumber(dntnCount)} DNTN`}
            />

            <StatCard
              label="Lực lượng lao động"
              value={totalEmployees}
              badge="nhân sự"
              icon={Users2}
              color="amber"
              subtext={`Lao động VN: ${formatVNNumber(totalEmployees - totalForeignWorkers)}`}
              subtextRight={`${formatVNNumber(totalForeignWorkers)} người NN`}
            />

            <StatCard
              label="Đề xuất hỗ trợ"
              value={totalSupportNeeds}
              badge="kiến nghị"
              icon={HelpCircle}
              color="rose"
              subtext="Mặt bằng, vốn & pháp lý"
              subtextRight="Cần tháo gỡ"
            />
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="enterprise-search-input"
                  name="enterpriseSearchTerm"
                  type="text"
                  aria-label="Tìm theo tên doanh nghiệp, mã nội bộ, mã số thuế (MST), người đại diện, địa chỉ"
                  placeholder="Tìm theo tên doanh nghiệp, mã nội bộ, mã số thuế (MST), người đại diện, địa chỉ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === "card" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  title="Xem dạng thẻ"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === "table" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  title="Xem dạng bảng"
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Loại hình DN</label>
                <ReportSelect
                  aria-label="Loại hình DN"
                  value={typeFilter}
                  onChange={(nextVal) => setTypeFilter(nextVal)}
                  options={[
                    { value: "Tất cả", label: "Tất cả loại hình" },
                    { value: "Công ty TNHH", label: "Công ty TNHH" },
                    { value: "Công ty Cổ phần", label: "Công ty Cổ phần" },
                    { value: "Doanh nghiệp tư nhân", label: "Doanh nghiệp tư nhân" },
                    { value: "Cơ sở kinh doanh khác", label: "Cơ sở khác" },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Quy mô lao động (NĐ 80)</label>
                <ReportSelect
                  aria-label="Quy mô lao động (NĐ 80)"
                  value={scaleFilter}
                  onChange={(nextVal) => setScaleFilter(nextVal)}
                  options={[
                    { value: "Tất cả", label: "Tất cả quy mô" },
                    { value: "Siêu nhỏ (< 5 LĐ)", label: "Siêu nhỏ (< 5 LĐ)" },
                    { value: "Nhỏ (5 - 20 LĐ)", label: "Nhỏ (5 - 20 LĐ)" },
                    { value: "Vừa (20 - 50 LĐ)", label: "Vừa (20 - 50 LĐ)" },
                    { value: "Lớn (> 50 LĐ)", label: "Lớn (> 50 LĐ)" },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tuyến đường</label>
                <ReportSelect
                  aria-label="Tuyến đường"
                  value={streetFilter}
                  onChange={(nextVal) => setStreetFilter(nextVal)}
                  options={[
                    { value: "Tất cả", label: "Tất cả tuyến đường" },
                    { value: "Mặt tiền Lương Định Của", label: "Mặt tiền Lương Định Của" },
                    { value: "Hẻm 42 Lương Định Của", label: "Hẻm 42 Lương Định Của" },
                    { value: "Hẻm 18 Lương Định Của", label: "Hẻm 18 Lương Định Của" },
                    { value: "Khu dân cư nội bộ KP3", label: "KDC nội bộ KP3" },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tuyến đường / khu vực (KP3)</label>
                <ReportSelect
                  aria-label="Tuyến đường / khu vực KP3"
                  value={toFilter}
                  onChange={(nextVal) => setToFilter(nextVal)}
                  options={[
                    { value: "Tất cả", label: "Toàn Khu phố 3" },
                    ...KP3_AREA_LIST.map((area) => ({ value: area, label: area })),
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Trạng thái</label>
                <ReportSelect
                  aria-label="Trạng thái"
                  value={statusFilter}
                  onChange={(nextVal) => setStatusFilter(nextVal)}
                  options={[
                    { value: "Tất cả", label: "Tất cả trạng thái" },
                    { value: "Đang hoạt động", label: "Đang hoạt động" },
                    { value: "Chờ duyệt", label: "Chờ duyệt" },
                    { value: "Tạm ngưng", label: "Tạm ngưng" },
                    { value: "Chuyển địa điểm", label: "Chuyển địa điểm" },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Results List */}
          {filteredEnterprises.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Không tìm thấy doanh nghiệp phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thử điều chỉnh lại bộ lọc tìm kiếm hoặc thêm mới hồ sơ doanh nghiệp vừa và nhỏ trên địa bàn KP3.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("Tất cả");
                  setScaleFilter("Tất cả");
                  setStreetFilter("Tất cả");
                  setStatusFilter("Tất cả");
                }}
                className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Đặt lại toàn bộ bộ lọc
              </button>
            </div>
          ) : viewMode === "card" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {paginatedEnterprises.map((ent) => {
                const scale = getEnterpriseScaleLabel(ent);
                const foreigners = ent.foreignWorkersCount || (ent.foreignWorkers?.length || 0);

                return (
                  <div
                    key={ent.id}
                    onClick={() => handleOpenDetailModal(ent)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="p-3.5 space-y-3">
                      {/* 1. Header with Badges: Loại hình & Trạng thái */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200 flex items-center gap-1.5 min-w-0 max-w-full">
                          <Building2 size={12} className="text-indigo-600 shrink-0" />
                          <span className="truncate">{ent.businessType || "Công ty TNHH"}</span>
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0 ${ent.status === "Đang hoạt động" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                            ent.status === "Chờ duyệt" ? "bg-amber-50 text-amber-800 border-amber-200" :
                              "bg-rose-50 text-rose-800 border-rose-200"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ent.status === "Đang hoạt động" ? "bg-emerald-500" : ent.status === "Tạm ngưng" ? "bg-rose-500" : "bg-amber-500"}`} />
                          <span>{ent.status}</span>
                        </span>
                      </div>

                      {/* 2. Image Thumbnail */}
                      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={getEnterpriseImage(ent)}
                          alt={ent.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500";
                          }}
                        />

                        {/* Mã doanh nghiệp đặt góc trên phải ảnh */}
                        <div className="absolute top-2 right-2">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white/95 text-slate-800 border border-slate-200">
                            {ent.internalCode || `DN-KP3-${ent.id}`}
                          </span>
                        </div>

                        {/* Quy mô doanh nghiệp ở góc dưới trái ảnh */}
                        <div className="absolute bottom-2 left-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/95 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <Briefcase size={11} className="text-indigo-600" /> {scale}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="space-y-2.5 text-xs pt-1">
                        <h3 className="font-bold text-sm leading-snug line-clamp-1 text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {ent.name}
                        </h3>
                        {/* MST & Scale */}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs pb-2 border-b border-slate-100">
                          <span className="text-slate-600 font-mono">
                            MST: <strong className="text-slate-800">{ent.taxCode || "Đang xác minh"}</strong>
                          </span>
                          {extractKp3Area(ent.address) ? (
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-xs border border-slate-200">
                              {extractKp3Area(ent.address)}
                            </span>
                          ) : (
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full text-xs">
                              {scale}
                            </span>
                          )}
                        </div>

                        {/* Representatives */}
                        <div className="space-y-1 text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User size={13} className="text-slate-500 shrink-0" />
                            <span className="truncate">ĐDPL: <strong className="text-slate-800">{ent.legalRepresentative || ent.owner}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Phone size={13} className="text-slate-500 shrink-0" />
                            <span className="font-mono text-slate-700">{ent.legalRepPhone || ent.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={13} className="text-slate-500 shrink-0" />
                            <span className="truncate text-slate-600">{ent.address}</span>
                          </div>
                        </div>

                        {/* Foreigner and Support badges */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {foreigners > 0 && (
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <Globe size={11} /> {foreigners} LĐ nước ngoài
                            </span>
                          )}
                          {(ent.supportNeeds && ent.supportNeeds.length > 0) && (
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                              <HelpCircle size={11} /> Có đề xuất hỗ trợ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDirections(ent)}
                          className="min-h-[36px] px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          title="Dẫn đường tới doanh nghiệp trên bản đồ GIS"
                        >
                          <Navigation size={12} />
                          <span>Dẫn đường</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPinModal(ent)}
                          className={`min-h-[36px] min-w-[36px] justify-center p-1.5 rounded-lg text-xs font-semibold flex items-center gap-0.5 border cursor-pointer ${ent.coordinates
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                            }`}
                          aria-label={ent.coordinates ? `Tọa độ GIS: ${ent.coordinates}` : "Ghim tọa độ GIS"}
                          title={ent.coordinates ? `Tọa độ GIS: ${ent.coordinates}` : "Ghim tọa độ GIS"}
                        >
                          <MapPin size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(ent)}
                        className="min-h-[36px] px-1.5 text-indigo-700 font-bold hover:underline flex items-center gap-1 text-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Hồ sơ chi tiết <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
                      <th className="py-3 px-4">Doanh nghiệp / Đơn vị</th>
                      <th className="py-3 px-3">Mã nội bộ & MST</th>
                      <th className="py-3 px-3">Loại hình & Quy mô</th>
                      <th className="py-3 px-3">Người đại diện pháp luật</th>
                      <th className="py-3 px-3">Đầu mối công vụ</th>
                      <th className="py-3 px-3">Lao động</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEnterprises.map((ent) => {
                      const foreigners = ent.foreignWorkersCount || (ent.foreignWorkers?.length || 0);

                      return (
                        <tr
                          key={ent.id}
                          onClick={() => handleOpenDetailModal(ent)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                                <img
                                  src={getEnterpriseImage(ent)}
                                  alt={ent.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200";
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <strong className="text-slate-900 block font-bold truncate max-w-xs text-xs hover:text-indigo-600 transition-colors">{ent.name}</strong>
                                <span className="text-xs text-slate-600 block truncate">{ent.address}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold text-slate-800 block">{ent.internalCode || `DN-KP3-${ent.id}`}</span>
                            <span className="font-mono text-xs text-slate-500 block">MST: {ent.taxCode || "N/A"}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-indigo-900 block">{ent.businessType || "Công ty TNHH"}</span>
                            <span className="text-xs text-slate-600 block">{getEnterpriseScaleLabel(ent)}</span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-800 block">{ent.legalRepresentative || ent.owner}</strong>
                            <span className="font-mono text-xs text-slate-600 block">{ent.legalRepPhone || ent.phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-blue-950 block">{ent.focalPointName || ent.owner}</strong>
                            <span className="font-mono text-xs text-blue-700 block">{ent.focalPointPhone || ent.phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{ent.employeeCount || 1} LĐ</span>
                            {foreigners > 0 ? (
                              <span className="text-xs text-rose-700 font-bold block">{foreigners} người NN</span>
                            ) : (
                              <span className="text-xs text-slate-500 block">0 người NN</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${ent.status === "Đang hoạt động" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                ent.status === "Chờ duyệt" ? "bg-amber-50 text-amber-800 border-amber-200" :
                                  "bg-rose-50 text-rose-800 border-rose-200"
                              }`}>
                              {ent.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleDirections(ent)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Chỉ đường tới doanh nghiệp trên bản đồ GIS"
                              >
                                <Navigation size={12} />
                                <span className="hidden sm:inline">Chỉ đường</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openPinModal(ent)}
                                className={`p-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${ent.coordinates
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                  }`}
                                aria-label={ent.coordinates ? `Đã ghim: ${ent.coordinates}` : "Ghim tọa độ GIS"}
                                title={ent.coordinates ? `Đã ghim: ${ent.coordinates}` : "Ghim tọa độ GIS"}
                              >
                                <MapPin size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(ent)}
                                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                Hồ sơ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="pt-2">
            <Pagination
              currentPage={activePage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      ) : (
        /* VIEW 2: BÁO CÁO KINH TẾ ĐỊA BÀN & BIẾN ĐỘNG DOANH NGHIỆP KP3 */
        <div id="enterprise-report-view" className="space-y-6">
          {/* Executive Header Banner - Flat Hairline Light */}
          <div className="bg-white text-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl">
                    <FileText size={18} />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    Báo cáo Tình hình Hoạt động Kinh tế & Biến động Doanh nghiệp KP3
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Dành cho Cấp ủy Chi bộ, Trưởng khu phố và Cán bộ phụ trách địa bàn • Cập nhật: Tháng 10/2026
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                  <span className="bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200 font-semibold">
                    Phục vụ công tác địa bàn KP3
                  </span>
                  <span>•</span>
                  <span>Không thay thế hệ thống đăng ký doanh nghiệp, thuế hoặc lao động chuyên ngành</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer"
                  title="In báo cáo dạng A4 / PDF"
                >
                  <Printer size={15} /> In Báo cáo
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                  title="Xuất file CSV báo cáo toàn diện"
                >
                  <Download size={15} /> Xuất File Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab("list")}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition-colors cursor-pointer"
                >
                  <List size={15} /> Danh mục doanh nghiệp
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-200 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-600 block font-semibold">Tổng doanh nghiệp</span>
                <strong className="text-lg font-bold text-slate-900 block mt-0.5 tabular-nums">{enterprises.length}</strong>
                <span className="text-xs text-emerald-700 font-semibold">100% có hồ sơ địa bàn</span>
              </div>

              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
                <span className="text-xs text-indigo-800 block font-semibold">Công ty TNHH</span>
                <strong className="text-lg font-bold text-indigo-950 block mt-0.5 tabular-nums">{tnhhCount}</strong>
                <span className="text-xs text-indigo-700">{((tnhhCount / (enterprises.length || 1)) * 100).toFixed(0)}% cơ cấu</span>
              </div>

              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200">
                <span className="text-xs text-teal-800 block font-semibold">Cổ phần & DNTN</span>
                <strong className="text-lg font-bold text-teal-950 block mt-0.5 tabular-nums">{cpCount + dntnCount}</strong>
                <span className="text-xs text-teal-700">đơn vị độc lập</span>
              </div>

              <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200">
                <span className="text-xs text-purple-800 block font-semibold">Tổng lao động</span>
                <strong className="text-lg font-bold text-purple-950 block mt-0.5 tabular-nums">{totalEmployees}</strong>
                <span className="text-xs text-purple-700">{totalForeignWorkers} nhân sự nước ngoài</span>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-900 block font-semibold">Có đề xuất hỗ trợ</span>
                <strong className="text-lg font-bold text-amber-950 block mt-0.5 tabular-nums">{totalSupportNeeds}</strong>
                <span className="text-xs text-amber-800">đề xuất tự nguyện</span>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800 block font-semibold">Đang hoạt động</span>
                <strong className="text-lg font-bold text-emerald-950 block mt-0.5 tabular-nums">
                  {enterprises.filter(e => e.status === "Đang hoạt động").length}
                </strong>
                <span className="text-xs text-emerald-700">ổn định địa bàn</span>
              </div>
            </div>
          </div>

          {/* Section 1: Phân bổ Loại hình & Quy mô */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1.1 Phân bổ loại hình */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Building2 size={16} />
                  </span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    1. Phân bổ Loại hình Tổ chức Doanh nghiệp
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">{enterprises.length} đơn vị</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Công ty TNHH", count: tnhhCount, color: "bg-indigo-600", desc: "Doanh nghiệp dịch vụ công nghệ, thương mại, nha khoa" },
                  { label: "Công ty Cổ phần", count: cpCount, color: "bg-blue-600", desc: "Doanh nghiệp giáo dục mầm non, dịch vụ kỹ thuật" },
                  { label: "Doanh nghiệp tư nhân", count: dntnCount, color: "bg-teal-600", desc: "Hiệu thuốc tân dược, cơ sở độc lập" },
                  { label: "Cơ sở kinh doanh khác", count: otherCount, color: "bg-purple-600", desc: "Chi nhánh, văn phòng giao dịch tại chỗ" }
                ].map((item, idx) => {
                  const pct = ((item.count / (enterprises.length || 1)) * 100).toFixed(1);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">{item.desc}</span>
                          <strong className="font-mono text-slate-900">{item.count} DN ({pct}%)</strong>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.max(4, Number(pct))}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 1.2 Phân bổ quy mô lao động */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                    <Users2 size={16} />
                  </span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    2. Phân loại theo Quy mô Lao động
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">Theo NĐ 80/2021/NĐ-CP</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Siêu nhỏ (&lt; 5 LĐ)</span>
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black text-xs font-mono">{scaleMicro} DN</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Hiệu thuốc, văn phòng đại diện nhỏ</p>
                  <div className="text-[10px] font-bold text-slate-400 pt-1">
                    Chiếm {((scaleMicro / (enterprises.length || 1)) * 100).toFixed(0)}% tổng số DN
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-900">Nhỏ (5 - 20 LĐ)</span>
                    <span className="text-indigo-800 bg-indigo-200/80 px-2 py-0.5 rounded font-black text-xs font-mono">{scaleSmall} DN</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80">Cửa hàng tiện lợi 247, nha khoa, trường mầm non</p>
                  <div className="text-[10px] font-bold text-indigo-500 pt-1">
                    Chiếm {((scaleSmall / (enterprises.length || 1)) * 100).toFixed(0)}% tổng số DN
                  </div>
                </div>

                <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-purple-900">Vừa (20 - 50 LĐ)</span>
                    <span className="text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded font-black text-xs font-mono">{scaleMedium} DN</span>
                  </div>
                  <p className="text-[11px] text-purple-800/80">Công ty giải pháp phần mềm An Phú Tech</p>
                  <div className="text-[10px] font-bold text-purple-500 pt-1">
                    Chiếm {((scaleMedium / (enterprises.length || 1)) * 100).toFixed(0)}% tổng số DN
                  </div>
                </div>

                <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-900">Lớn (&gt; 50 LĐ)</span>
                    <span className="text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded font-black text-xs font-mono">{scaleLarge} DN</span>
                  </div>
                  <p className="text-[11px] text-rose-800/80">Chi nhánh doanh nghiệp quy mô lớn</p>
                  <div className="text-[10px] font-bold text-rose-500 pt-1">
                    Chiếm {((scaleLarge / (enterprises.length || 1)) * 100).toFixed(0)}% tổng số DN
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Danh bạ Người đại diện & Đầu mối công vụ */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    3. Danh bạ Người đại diện pháp luật & Đầu mối Liên hệ Phối hợp Công vụ
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Phục vụ Cấp ủy Chi bộ, Ban Điều hành KP3 khi tổ chức khảo sát, tuyên truyền, an ninh trật tự & phòng cháy chữa cháy
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                {enterprises.length} doanh nghiệp đầu mối
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
                    <th className="py-3 px-4">Tên Doanh nghiệp</th>
                    <th className="py-3 px-3">Mã nội bộ & MST</th>
                    <th className="py-3 px-3">Người đại diện pháp luật</th>
                    <th className="py-3 px-3">Quản lý tại chỗ</th>
                    <th className="py-3 px-3 bg-blue-50/60 text-blue-900">Đầu mối phối hợp địa phương</th>
                    <th className="py-3 px-3">Địa chỉ & Phân tuyến</th>
                    <th className="py-3 px-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enterprises.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <strong className="text-slate-900 block font-bold leading-tight">{b.name}</strong>
                            <span className="text-[10px] text-slate-500">{b.type} • {b.businessType || "TNHH"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] font-bold text-slate-700 block">{b.internalCode || `DN-KP3-${b.id}`}</span>
                        {b.taxCode && <span className="font-mono text-[10px] text-slate-400 block">MST: {b.taxCode}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-slate-800 block">{b.legalRepresentative || b.owner}</strong>
                        <span className="font-mono text-[10.5px] text-slate-500 block">{b.legalRepPhone || b.phone}</span>
                        {b.legalRepEmail && <span className="text-[10px] text-indigo-600 block truncate max-w-[150px]">{b.legalRepEmail}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-800 block">{b.siteManager || b.owner}</span>
                        <span className="font-mono text-[10px] text-slate-500 block">{b.siteManagerPhone || b.phone}</span>
                      </td>
                      <td className="py-3 px-3 bg-blue-50/30">
                        <strong className="text-blue-950 font-bold block">{b.focalPointName || b.owner}</strong>
                        <span className="font-mono text-[11px] font-black text-blue-700 block">{b.focalPointPhone || b.phone}</span>
                        <span className="text-[9.5px] text-slate-500">{b.focalPointRole || "Đại diện phối hợp"}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                        <span className="block truncate">{b.address}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {b.streetArea || (b.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(b)}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Quản lý Chuyên gia & Lao động người nước ngoài */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <Globe size={16} />
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  4. Quản lý Chuyên gia & Lao động Người nước ngoài tại Doanh nghiệp
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-700">Tổng LĐ doanh nghiệp: <strong className="text-indigo-700 font-mono text-sm">{totalEmployees}</strong></span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {totalForeignWorkers} nhân sự người nước ngoài
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Các doanh nghiệp có chuyên gia / lao động người nước ngoài làm việc tại KP3:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {enterprises
                  .filter(b => (b.foreignWorkersCount || 0) > 0 || (b.foreignWorkers && b.foreignWorkers.length > 0) || getEnterpriseForeignResidents(b).length > 0)
                  .map((b) => {
                    const foreigners = b.foreignWorkers && b.foreignWorkers.length > 0
                      ? b.foreignWorkers
                      : getEnterpriseForeignResidents(b).map(r => ({
                        name: r.fullName,
                        nationality: r.nationality || "Nước ngoài",
                        passportOrCode: r.cccd,
                        position: r.occupation,
                        temporaryResidenceStatus: "Đã khai báo tạm trú" as const
                      }));
                    return (
                      <div key={b.id} className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/30 space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900 font-bold">{b.name}</strong>
                          <span className="font-mono text-[10px] text-slate-500">{b.internalCode || b.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Địa chỉ: {b.address}
                        </div>
                        <div className="space-y-1.5 pt-1 border-t border-rose-100">
                          {foreigners.map((f, i) => (
                            <div key={i} className="bg-white p-2 rounded-lg border border-rose-100 flex justify-between items-center text-[11px]">
                              <div>
                                <strong className="text-slate-900">{f.name}</strong>
                                <span className="text-slate-500 ml-1">({f.nationality})</span>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Hộ chiếu: {f.passportOrCode} • Vị trí: {f.position}
                                </div>
                              </div>
                              <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ Đã khai báo CSKV
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Section 4: Nhu cầu Hỗ trợ & Khó khăn của Doanh nghiệp */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <HelpCircle size={16} />
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  5. Tổng hợp Nhu cầu Hỗ trợ & Ý kiến Khó khăn (Tự nguyện phản ánh)
                </h3>
              </div>
              <span className="text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
                {totalSupportNeeds} doanh nghiệp có đề xuất
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {enterprises
                .filter(b => (b.supportNeeds && b.supportNeeds.length > 0) || Boolean(b.supportNotes))
                .map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/20 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-1">
                        <strong className="text-slate-900 font-bold block">{b.name}</strong>
                        <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold shrink-0">
                          {b.internalCode || b.id}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Đại diện: <strong>{b.legalRepresentative || b.owner}</strong> ({b.legalRepPhone || b.phone})
                      </div>

                      {/* Needs tags */}
                      {b.supportNeeds && b.supportNeeds.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {b.supportNeeds.map((need, ni) => (
                            <span key={ni} className="text-[10px] font-semibold bg-white text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                              • {need}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {b.supportNotes && (
                        <p className="text-[11px] text-slate-700 italic bg-white/80 p-2 rounded-lg border border-amber-100/80 mt-1 leading-relaxed">
                          "{b.supportNotes}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-amber-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Đầu mối: {b.focalPointName || b.owner}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(b)}
                        className="text-indigo-600 hover:underline font-bold cursor-pointer"
                      >
                        Chi tiết hồ sơ ➜
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Section 5: Lịch sử Biến động Cơ sở */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                  <History size={16} />
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  6. Lịch sử Biến động Doanh nghiệp Địa bàn (Mở mới, Chuyển địa điểm, Đổi ngành nghề, Tạm ngừng)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">Ghi nhận bởi Chi bộ & Ban ĐH KP3</span>
            </div>

            <div className="space-y-2">
              {(() => {
                const allLogs: Array<{ enterpriseName: string; enterpriseCode: string } & BusinessChangeLog> = [];
                enterprises.forEach(b => {
                  (b.changeHistory || []).forEach(log => {
                    allLogs.push({
                      ...log,
                      enterpriseName: b.name,
                      enterpriseCode: b.internalCode || b.id
                    });
                  });
                });

                if (allLogs.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                      Chưa ghi nhận biến động mới của doanh nghiệp trên địa bàn.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {allLogs.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900 font-bold">{item.enterpriseName}</strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.type === "Mở mới" ? "bg-emerald-100 text-emerald-800" :
                              item.type === "Chuyển địa điểm" ? "bg-blue-100 text-blue-800" :
                                item.type === "Tạm ngừng" ? "bg-rose-100 text-rose-800" :
                                  "bg-amber-100 text-amber-800"
                            }`}>
                            {item.type}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-snug">{item.description}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Ngày: <strong className="font-mono text-slate-600">{item.date}</strong></span>
                          <span>Người ghi: {item.recordedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <InlineNotice
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS DOANH NGHIỆP */}
      {gisPinModalEnterprise && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setGisPinModalEnterprise(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Modal Header - Flat Hairline Light */}
            <div className="bg-slate-50 p-4 text-slate-900 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900">Ghim & Đồng bộ Tọa độ GIS Doanh nghiệp</h3>
                  <p className="text-xs text-slate-600 font-mono truncate">
                    {gisPinModalEnterprise.name} ({gisPinModalEnterprise.internalCode || gisPinModalEnterprise.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGisPinModalEnterprise(null)}
                aria-label="Đóng"
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-600 font-semibold block">Trụ sở hoạt động:</span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{gisPinModalEnterprise.address}</p>
                <span className="text-xs text-slate-600 block">Khu phố 3, Phường An Phú, TP. Hồ Chí Minh</span>
              </div>

              {/* Coordinate Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <label className="font-bold text-slate-700">Tọa độ GIS (Định dạng DMS hoặc Thập phân):</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(gisPinModalEnterprise.address, gisPinModalEnterprise.id);
                      setGisPinInput(auto.dms);
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    title="Tự động nhận diện tọa độ từ địa chỉ"
                  >
                    <Sparkles size={12} className="text-indigo-600" /> Tự động nhận diện
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={gisPinInput}
                    onChange={(e) => setGisPinInput(e.target.value)}
                    placeholder="Ví dụ: 10°56'14.2&quot;N 106°44'39.5&quot;E hoặc 10.936997, 106.744645"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                  />
                  <MapPin size={15} className="absolute right-3 top-3 text-slate-400" />
                </div>
              </div>

              {/* Presets for KP3 */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 block">Gợi ý phân khu trục chính KP3:</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'13.2"N 106°44\'40.7"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Mặt tiền Lương Định Của</strong>
                    <span className="text-xs text-slate-500 font-mono">10.936997, 106.744645</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'16.1"N 106°44\'43.8"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 42 Lương Định Của</strong>
                    <span className="text-xs text-slate-500 font-mono">10.937800, 106.745500</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'08.9"N 106°44\'48.5"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 18 Lương Định Của</strong>
                    <span className="text-xs text-slate-500 font-mono">10.935800, 106.746800</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'14.8"N 106°44\'38.2"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Khu thương mại dịch vụ KP3</strong>
                    <span className="text-xs text-slate-500 font-mono">10.937200, 106.743800</span>
                  </button>
                </div>
              </div>

              {/* Status helper */}
              {gisPinInput && (() => {
                const parsed = parseGisCoords(gisPinInput);
                if (parsed) {
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check size={13} className="text-emerald-600" />
                        <span>Tọa độ hợp lệ: {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}</span>
                      </div>
                      <span className="font-mono text-xs bg-emerald-100 px-2 py-0.5 rounded">
                        {decimalToDMS(parsed.lat, parsed.lng)}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                      <span>Đang kiểm tra định dạng tọa độ. Vui lòng nhập đúng chuẩn hoặc bấm nút tự động nhận diện.</span>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setGisPinModalEnterprise(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Lưu & Đồng bộ GIS
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Lưu & Dẫn đường ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
