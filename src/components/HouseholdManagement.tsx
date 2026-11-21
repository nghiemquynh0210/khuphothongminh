import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Home, 
  Users, 
  Search, 
  GitBranch, 
  MapPin, 
  ChevronRight,
  Plus,
  X,
  Trash2,
  AlertCircle,
  AlertTriangle,
  LayoutGrid,
  List,
  Sparkles,
  Calendar,
  Layers,
  Navigation,
  Compass,
  Check,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { Household, Resident, TargetGisItem } from "../types";
import { 
  decimalToDMS, 
  parseCoordinates as parseGisCoords, 
  generateDefaultCoordinatesForAddress
} from "../utils/gisUtils";
import Pagination from "./Pagination";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { ReportSelect } from "./reports/ReportSelect";
import { InlineNotice } from "./ui/ConfirmModal";
import { formatVNNumber } from "../utils/numberFormat";
import { KP3_AREA_LIST, computeKp3PopulationMetrics, extractKp3Area } from "../utils/kp3Utils";
import { formatCompactKp3Address } from "../utils/householdRecognitionUtils";
import { recordAuditLog } from "../utils/auditLogger";
import {
  getHouseholdCreatePath,
  getHouseholdDetailPath,
  navigate,
  useCurrentLocation
} from "../routes";

// Sub-component imports
import HouseholdDashboard from "./household/HouseholdDashboard";
import HouseholdDuplicates from "./household/HouseholdDuplicates";
import HouseholdAutoRecognition from "./household/HouseholdAutoRecognition";

export type HouseholdModuleTab = "list" | "recognition" | "dashboard" | "audit";

interface HouseholdManagementProps {
  households: Household[];
  onAddHousehold: (newH: Household) => void;
  residents: Resident[];
  onUpdateHouseholds: (households: Household[]) => void;
  onUpdateResidents: (residents: Resident[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
  activeTab?: HouseholdModuleTab;
  onActiveTabChange?: (tab: HouseholdModuleTab) => void;
  viewMode?: "list" | "card";
  onViewModeChange?: (mode: "list" | "card") => void;
}

const HouseholdSearchInput = React.memo(function HouseholdSearchInput({
  defaultValue,
  onSearch
}: {
  defaultValue: string;
  onSearch: (value: string) => void;
}) {
  const [val, setVal] = useState(defaultValue);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(val);
    }, 200);
    return () => clearTimeout(timer);
  }, [val, onSearch]);

  return (
    <div className="relative flex-1 min-w-0 w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input 
        id="household-search-input"
        name="householdSearchTerm"
        type="text" 
        placeholder="Tìm kiếm theo chủ hộ, mã số sổ, địa chỉ, CCCD..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400"
      />
      {val && (
        <button
          type="button"
          onClick={() => {
            setVal("");
            onSearch("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          title="Xóa tìm kiếm"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});

export default function HouseholdManagement({ 
  households, 
  residents = [],
  onUpdateHouseholds,
  onUpdateResidents,
  onNavigateToGis,
  activeTab: controlledActiveTab,
  onActiveTabChange,
  viewMode: controlledViewMode,
  onViewModeChange
}: HouseholdManagementProps) {
  const { search } = useCurrentLocation();

  // Navigation & Sub-views tabs
  const [internalActiveTab, setInternalActiveTab] = useState<HouseholdModuleTab>(() => {
    const tabParam = new URLSearchParams(search || "").get("tab");
    if (tabParam === "recognition" || tabParam === "dashboard" || tabParam === "audit") {
      return tabParam;
    }
    return "list";
  });
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = useCallback((next: HouseholdModuleTab) => {
    setInternalActiveTab(next);
    onActiveTabChange?.(next);
  }, [onActiveTabChange]);

  useEffect(() => {
    const tabParam = new URLSearchParams(search || "").get("tab");
    if (tabParam === "recognition" || tabParam === "dashboard" || tabParam === "audit" || tabParam === "list") {
      setInternalActiveTab(tabParam);
      onActiveTabChange?.(tabParam);
    }
  }, [search, onActiveTabChange]);
  
  // Basic states
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);
  const [typeFilter, setTypeFilter] = useState<"Tất cả" | "Thường trú" | "Tạm trú">(() => {
    const t = new URLSearchParams(search || "").get("type");
    if (t === "tam_tru" || t === "Tạm trú") return "Tạm trú";
    if (t === "thuong_tru" || t === "Thường trú") return "Thường trú";
    return "Tất cả";
  });
  const [tempSubFilter, setTempSubFilter] = useState<"all" | "independent" | "hostel" | "alert">(() => {
    const s = new URLSearchParams(search || "").get("sub");
    if (s === "independent" || s === "hostel" || s === "alert") return s;
    return "all";
  });
  const [toFilter, setToFilter] = useState<string>("all");
  const [showSoftDeleted, setShowSoftDeleted] = useState(false); // Recycle bin toggle

  useEffect(() => {
    const params = new URLSearchParams(search || "");
    const t = params.get("type");
    if (t === "tam_tru" || t === "Tạm trú") {
      setTypeFilter("Tạm trú");
      setCurrentPage(1);
    } else if (t === "thuong_tru" || t === "Thường trú") {
      setTypeFilter("Thường trú");
      setCurrentPage(1);
    }
    const s = params.get("sub");
    if (s === "independent" || s === "hostel" || s === "alert") {
      setTempSubFilter(s);
    }
  }, [search]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [internalViewMode, setInternalViewMode] = useState<"list" | "card">("card");
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = useCallback((mode: "list" | "card") => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);
  const itemsPerPage = 8;

  // Notice state
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);

  const showNotice = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setNotice({ message, type });
  }, []);

  // GIS Coordinate Pinning & Navigation Modal States
  const [gisPinModalHousehold, setGisPinModalHousehold] = useState<Household | null>(null);
  const [gisPinInput, setGisPinInput] = useState("");

  const handleDirections = (h: Household) => {
    let coords = h.coordinates;
    if (!coords || !parseGisCoords(coords)) {
      // Auto-geolocate based on address
      const autoGeo = generateDefaultCoordinatesForAddress(h.address, h.code);
      coords = autoGeo.dms;
      // Auto-save this coordinate to household so GIS map has it permanently
      const updated = households.map(item => item.id === h.id ? { ...item, coordinates: coords } : item);
      onUpdateHouseholds(updated);
    }
    if (onNavigateToGis) {
      onNavigateToGis({
        id: h.id,
        type: "household",
        name: `Hộ ${h.ownerName} (${h.code})`,
        address: h.address,
        coordinates: coords,
        navigateRoute: true
      });
    }
  };

  const openPinModal = (h: Household) => {
    setGisPinModalHousehold(h);
    if (h.coordinates) {
      setGisPinInput(h.coordinates);
    } else {
      const auto = generateDefaultCoordinatesForAddress(h.address, h.code);
      setGisPinInput(auto.dms);
    }
  };

  const handleSavePinCoordinates = (andNavigate: boolean = false) => {
    if (!gisPinModalHousehold) return;
    const finalCoord = gisPinInput.trim();
    if (!finalCoord) {
      showNotice("Vui lòng nhập hoặc lấy tọa độ GIS!", "warning");
      return;
    }

    const updated = households.map(h => {
      if (h.id === gisPinModalHousehold.id) {
        return { ...h, coordinates: finalCoord };
      }
      return h;
    });

    onUpdateHouseholds(updated);

    const targetH = { ...gisPinModalHousehold, coordinates: finalCoord };
    setGisPinModalHousehold(null);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: targetH.id,
        type: "household",
        name: `Hộ ${targetH.ownerName} (${targetH.code})`,
        address: targetH.address,
        coordinates: finalCoord,
        navigateRoute: true
      });
    } else {
      showNotice(`Đã đồng bộ tọa độ Hộ ${targetH.ownerName} (${finalCoord}) lên bản đồ GIS!`, "success");
    }
  };

  // Responsive default layout
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode("card");
    }
  }, []);

  // Lock body scroll when GIS pin modal is open
  useEffect(() => {
    if (gisPinModalHousehold) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [gisPinModalHousehold]);

  // Filter households by search, type, area, and soft-delete status (Memoized)
  const filteredHouseholds = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const hasQuery = q.length > 0;

    return households.filter((h) => {
      const isDeleted = !!(h as any).deletedAt;
      if (showSoftDeleted !== isDeleted) return false;

      const matchesType = typeFilter === "Tất cả" || (h.type || "Thường trú") === typeFilter;
      if (!matchesType) return false;

      if (typeFilter === "Tạm trú" && tempSubFilter !== "all") {
        if (tempSubFilter === "independent" && h.tempSubType === "hostel") return false;
        if (tempSubFilter === "hostel" && h.tempSubType !== "hostel") return false;
        if (
          tempSubFilter === "alert" &&
          (h.expiringMemberCount || 0) === 0 &&
          (h.expiredMemberCount || 0) === 0
        ) {
          return false;
        }
      }

      if (toFilter !== "all" && extractKp3Area(h.address) !== toFilter) return false;

      if (!hasQuery) return true;

      return (
        h.ownerName.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.hostelName && h.hostelName.toLowerCase().includes(q)) ||
        (h.members && h.members.some(m => (m.name && m.name.toLowerCase().includes(q)) || (m.cccd && m.cccd.includes(q))))
      );
    });
  }, [households, searchTerm, showSoftDeleted, typeFilter, tempSubFilter, toFilter]);

  // Paginated selection
  const paginatedHouseholds = filteredHouseholds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalItems = filteredHouseholds.length;

  const handleExportHouseholdsExcel = () => {
    const rows = filteredHouseholds.map((h, idx) => {
      const ownerMember = h.members?.find(
        (m) => m.relation === "Chủ hộ" || m.relation?.toLowerCase().includes("chủ hộ")
      );
      const ownerRes = residents.find(
        (r) =>
          (ownerMember?.cccd && r.cccd === ownerMember.cccd) ||
          (r.householdId === h.code && r.relationToOwner === "Chủ hộ")
      );
      const parcels = h.landParcels && h.landParcels.length > 0 ? h.landParcels : [];
      const parcelSheetPlot =
        parcels.length > 0
          ? parcels.map((p) => `Tờ ${p.mapSheet || "-"} / Thửa ${p.plotNumber || "-"}`).join("; ")
          : h.mapSheet || h.plotNumber
          ? `Tờ ${h.mapSheet || "-"} / Thửa ${h.plotNumber || "-"}`
          : "Chưa cập nhật";
      const parcelAreaPurpose =
        parcels.length > 0
          ? parcels
              .map((p) => `${p.landArea ? `${p.landArea}m²` : "-"} (${p.landUsePurpose || "-"})`)
              .join("; ")
          : h.landArea
          ? `${h.landArea}m² (${h.landUsePurpose || "-"})`
          : "Chưa cập nhật";
      const certNumbers =
        parcels.length > 0
          ? parcels
              .map((p) => p.certificateNumber)
              .filter(Boolean)
              .join("; ") || "Chưa cập nhật"
          : h.certificateNumber || "Chưa cập nhật";

      return {
        "STT": idx + 1,
        "Mã Sổ Hộ Khẩu": h.code,
        "Loại Hộ": h.type || "Thường trú",
        "Họ Tên Chủ Hộ": h.ownerName,
        "CCCD Chủ Hộ": ownerMember?.cccd || ownerRes?.cccd || "Chưa cập nhật",
        "SĐT Chủ Hộ":
          (ownerMember?.phone && ownerMember.phone !== "N/A" ? ownerMember.phone : "") ||
          (ownerRes?.phone && ownerRes.phone !== "N/A" ? ownerRes.phone : "") ||
          "Chưa cập nhật",
        "Địa Chỉ Cư Trú": h.address,
        "Khu Vực KP3": extractKp3Area(h.address),
        "Số Nhân Khẩu": h.memberCount ?? (h.members?.length || 0),
        "Danh Sách Thành Viên":
          h.members && h.members.length > 0
            ? h.members.map((m) => `${m.name} (${m.relation})`).join(", ")
            : "Chưa cập nhật",
        "Tờ / Thửa Sổ Đỏ": parcelSheetPlot,
        "Diện Tích & Mục Đích SDĐ": parcelAreaPurpose,
        "Số GCN QSDĐ": certNumbers,
        "Tọa Độ GIS": h.coordinates || "Chưa ghim",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "So_Ho_Khau_KP3");
    const fileName = `Danh_Sach_Ho_Khau_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    void recordAuditLog({
      actorName: "Cán bộ Quản lý Hộ tịch",
      actorRole: "Ban điều hành Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất danh sách Sổ hộ khẩu ra Excel",
      targetSummary: `Đã xuất ${filteredHouseholds.length} hộ gia đình (Bộ lọc: ${typeFilter}${toFilter !== "all" ? ` - ${toFilter}` : ""}) ra tệp ${fileName}`,
    });

    showNotice(`Đã xuất thành công ${filteredHouseholds.length} sổ hộ khẩu ra tệp Excel!`, "success");
  };

  return (
    <div id="household-management-view" className="space-y-4">
      {/* Top Banner Navigation & Actions */}
      <PageHeader
        title="Quản lý Hộ tịch & Lưu trú"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-export-households-excel"
              onClick={handleExportHouseholdsExcel}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title="Xuất danh sách Sổ hộ khẩu theo bộ lọc hiện tại ra tệp Excel (.xlsx)"
            >
              <Download size={14} className="text-slate-500 shrink-0" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(getHouseholdCreatePath())}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-2xs"
            >
              <Plus size={14} className="shrink-0" />
              <span>Lập sổ hộ mới</span>
            </button>
          </div>
        }
      />

      {/* Main Module Tab Bar */}
      <div className="flex flex-wrap items-center gap-1 border border-slate-200/80 rounded-xl p-1 bg-slate-100/80 text-xs text-slate-600 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
        >
          <Home size={13} className={activeTab === "list" ? "text-emerald-700" : "text-slate-500"} />
          <span>Hộ gia đình</span>
        </button>
        <button
          type="button"
          id="btn-tab-auto-recognition"
          onClick={() => setActiveTab("recognition")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "recognition" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
          title="Quét dữ liệu dân cư thường trú để tự động nhận diện chủ hộ và thành viên"
        >
          <Sparkles size={13} className={activeTab === "recognition" ? "text-emerald-700" : "text-slate-500"} />
          <span>Nhận diện tự động</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "dashboard" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
          title="Báo cáo chuyên sâu và thống kê cơ cấu hộ"
        >
          <Layers size={13} className={activeTab === "dashboard" ? "text-emerald-700" : "text-slate-500"} />
          <span>Thống kê</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "audit" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
          title="Rà soát hồ sơ trùng lặp và công cụ gộp sổ"
        >
          <GitBranch size={13} className={activeTab === "audit" ? "text-emerald-700" : "text-slate-500"} />
          <span>Trùng lặp &amp; Gộp sổ</span>
        </button>
      </div>

      {notice && !gisPinModalHousehold && (
        <InlineNotice
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}

        {/* RENDER BY ACTIVE MODULE TAB */}
      {activeTab === "recognition" && (
        <HouseholdAutoRecognition
          households={households}
          residents={residents}
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
          onSelectHousehold={(h) => {
            navigate(getHouseholdDetailPath(h.id));
          }}
        />
      )}

      {activeTab === "dashboard" && (
        <HouseholdDashboard households={households} residents={residents} />
      )}

      {activeTab === "audit" && (
        <HouseholdDuplicates 
          households={households} 
          residents={residents} 
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
        />
      )}

      {activeTab === "list" && (
        <div className="space-y-5">
          {/* KPI SUMMARY CARDS - Đồng bộ chuẩn Executive với Quản lý Dân cư */}
            {(() => {
              const activeH = households.filter(h => !(h as any).deletedAt);
              const totalH = activeH.length;
              const permList = activeH.filter(h => (h.type || "Thường trú") === "Thường trú");
              const tempList = activeH.filter(h => h.type === "Tạm trú");
              const ttCount = permList.length;
              const tamCount = tempList.length;
              const tempIndepCount = tempList.filter(h => h.tempSubType !== "hostel").length;
              const tempHostelCount = tempList.filter(h => h.tempSubType === "hostel").length;
              const tempAlertCount = tempList.filter(h => (h.expiringMemberCount || 0) > 0 || (h.expiredMemberCount || 0) > 0).length;
              const popMetrics = computeKp3PopulationMetrics(residents, permList);
              const permResCount = residents.filter(r => r.status === "Thường trú").length;

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in duration-200">
                    <StatCard
                      label="Tổng số hộ quản lý"
                      value={formatVNNumber(totalH)}
                      badge="hộ cư trú"
                      highlighted={typeFilter === "Tất cả"}
                      subtext={`${formatVNNumber(ttCount)} thường trú • ${formatVNNumber(tamCount)} tạm trú`}
                      subtextRight={`${formatVNNumber(popMetrics.officialPopulation)} dân`}
                      icon={Home}
                      color="emerald"
                      onClick={() => {
                        setTypeFilter("Tất cả");
                        setTempSubFilter("all");
                        setCurrentPage(1);
                      }}
                    />
                    <StatCard
                      label="Sổ hộ thường trú (CT01)"
                      value={formatVNNumber(ttCount)}
                      badge={`${((ttCount / (totalH || 1)) * 100).toFixed(0)}%`}
                      highlighted={typeFilter === "Thường trú"}
                      subtext={`${formatVNNumber(permResCount)} nhân khẩu`}
                      subtextRight={`TB: ${popMetrics.avgPerDigitizedHouseholdLabel} người/hộ`}
                      icon={Check}
                      color="blue"
                      onClick={() => {
                        setTypeFilter(typeFilter === "Thường trú" ? "Tất cả" : "Thường trú");
                        setCurrentPage(1);
                      }}
                    />
                    <StatCard
                      label="Hộ tạm trú (CT08)"
                      value={formatVNNumber(tamCount)}
                      badge={`${((tamCount / (totalH || 1)) * 100).toFixed(0)}%`}
                      highlighted={typeFilter === "Tạm trú" && tempSubFilter === "all"}
                      subtext={`${formatVNNumber(tempIndepCount)} hộ thuê nhà`}
                      subtextRight={`${formatVNNumber(tempHostelCount)} điểm nhà trọ`}
                      icon={Calendar}
                      color="amber"
                      onClick={() => {
                        if (typeFilter === "Tạm trú" && tempSubFilter === "all") {
                          setTypeFilter("Tất cả");
                        } else {
                          setTypeFilter("Tạm trú");
                          setTempSubFilter("all");
                        }
                        setCurrentPage(1);
                      }}
                    />
                    <StatCard
                      label="Hộ tạm trú cần gia hạn"
                      value={formatVNNumber(tempAlertCount)}
                      badge="hộ"
                      highlighted={typeFilter === "Tạm trú" && tempSubFilter === "alert"}
                      icon={AlertTriangle}
                      color="rose"
                      onClick={() => {
                        setTypeFilter("Tạm trú");
                        setTempSubFilter("alert");
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {typeFilter === "Tạm trú" && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/80 text-xs">
                      <span className="font-medium text-slate-600">
                        Nhóm hồ sơ tạm trú:
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          { id: "all" as const, label: `Tất cả (${formatVNNumber(tamCount)})` },
                          { id: "independent" as const, label: `Hộ thuê nhà (${formatVNNumber(tempIndepCount)})` },
                          { id: "hostel" as const, label: `Cụm nhà trọ (${formatVNNumber(tempHostelCount)})` },
                          { id: "alert" as const, label: `Cần gia hạn (${formatVNNumber(tempAlertCount)})` },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setTempSubFilter(opt.id);
                              setCurrentPage(1);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                              tempSubFilter === opt.id
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Filters Bar */}
          <div className="flex flex-col 2xl:flex-row gap-2.5 justify-between items-stretch 2xl:items-center bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            {/* Search Box */}
            <HouseholdSearchInput defaultValue={searchTerm} onSearch={handleSearchChange} />

            {/* Quick selectors */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex flex-wrap items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
                <button
                  type="button"
                  onClick={() => { setTypeFilter("Tất cả"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${typeFilter === "Tất cả" ? "bg-white text-slate-900 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tất cả ({households.filter(h => !(h as any).deletedAt).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter("Thường trú"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${typeFilter === "Thường trú" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Thường trú ({households.filter(h => !(h as any).deletedAt && (h.type || "Thường trú") === "Thường trú").length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter("Tạm trú"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${typeFilter === "Tạm trú" ? "bg-white text-amber-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tạm trú ({households.filter(h => !(h as any).deletedAt && h.type === "Tạm trú").length})
                </button>
              </div>

              <div className="w-full sm:w-48">
                <ReportSelect
                  aria-label="Lọc theo tuyến / khu vực KP3"
                  value={toFilter}
                  onChange={(val) => {
                    setToFilter(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "Toàn Khu phố 3" },
                    ...KP3_AREA_LIST.map((area) => ({ value: area, label: area })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Recycle bin trash toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowSoftDeleted(!showSoftDeleted);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 h-9 border rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  showSoftDeleted 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <Trash2 size={13} />
                {showSoftDeleted ? "Thùng rác Sổ" : "Xem hộ đã xóa"}
              </button>

              {/* View switches */}
              <div className="flex items-center border border-slate-200/80 rounded-lg p-0.5 bg-slate-100/80 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
                  title="Xem dạng Danh sách"
                  aria-label="Xem dạng Danh sách"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "card" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
                  title="Xem dạng Thẻ Grid"
                  aria-label="Xem dạng Thẻ Grid"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Container: Toàn bộ chiều rộng cho danh sách Sổ Hộ Khẩu */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col w-full">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {showSoftDeleted ? "Lưu trữ thùng rác sổ hộ khẩu" : "Danh sách sổ chính thống"} ({formatVNNumber(filteredHouseholds.length)})
              </span>
            </div>

            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5 min-w-[230px] whitespace-nowrap">Mã sổ &amp; Chủ hộ</th>
                      <th className="py-2.5 px-3.5 min-w-[260px] whitespace-nowrap">Địa chỉ &amp; Khu vực KP3</th>
                      <th className="py-2.5 px-3.5 min-w-[180px] whitespace-nowrap">Loại hộ &amp; Nhân khẩu</th>
                      <th className="py-2.5 px-3.5 min-w-[170px] whitespace-nowrap">Định vị &amp; Sổ đỏ</th>
                      <th className="py-2.5 px-3.5 text-right min-w-[190px] whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] z-10">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHouseholds.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400">
                          <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                          Không tìm thấy sổ hộ khẩu phù hợp bộ lọc
                        </td>
                      </tr>
                    ) : (
                      paginatedHouseholds.map((h) => {
                        const hType = h.type || "Thường trú";
                        const firstParcel = h.landParcels && h.landParcels.length > 0 ? h.landParcels[0] : null;
                        const sheetNo = firstParcel?.mapSheet || h.mapSheet;
                        const plotNo = firstParcel?.plotNumber || h.plotNumber;
                        return (
                          <tr
                            key={h.id}
                            id={`household-row-${h.id}`}
                            onClick={() => navigate(getHouseholdDetailPath(h.id))}
                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                  {h.code}
                                </span>
                                <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                                  {h.ownerName}
                                </span>
                              </div>
                              {h.members && h.members.length > 0 && (
                                <div className="text-xs text-slate-500 truncate max-w-[260px] mt-1">
                                  {h.members.map((m) => m.name).slice(0, 3).join(", ")}
                                  {h.members.length > 3 ? ` (+${h.members.length - 3})` : ""}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                                  {extractKp3Area(h.address)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-700 font-medium max-w-[320px]">
                                <MapPin size={12} className="text-emerald-600 shrink-0" />
                                <span className="truncate" title={h.address}>
                                  {h.address}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                                      hType === "Tạm trú"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    }`}
                                  >
                                    {hType === "Tạm trú"
                                      ? h.tempSubType === "hostel"
                                        ? "Lưu trú nhà trọ"
                                        : "Hộ tạm trú"
                                      : "Thường trú"}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                                    <Users size={12} className="text-slate-500" />
                                    {h.memberCount} người
                                  </span>
                                </div>
                                {hType === "Tạm trú" && ((h.expiredMemberCount || 0) > 0 || (h.expiringMemberCount || 0) > 0) && (
                                  <div className="flex flex-wrap gap-1">
                                    {(h.expiredMemberCount || 0) > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold">
                                        {h.expiredMemberCount} quá hạn
                                      </span>
                                    )}
                                    {(h.expiringMemberCount || 0) > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                                        {h.expiringMemberCount} sắp hết hạn
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                {h.timemarkVerified ? (
                                  <span
                                    title={`Ảnh thực tế & Tọa độ Timemark: ${h.coordinates}`}
                                    className="inline-flex items-center gap-1 text-xs text-amber-900 font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md"
                                  >
                                    <Sparkles size={11} className="text-amber-600 shrink-0" />
                                    <span>Timemark GPS</span>
                                  </span>
                                ) : h.coordinates ? (
                                  <span
                                    title={`Tọa độ GPS mốc ranh giới: ${h.coordinates}`}
                                    className="inline-flex items-center gap-1 text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md"
                                  >
                                    <MapPin size={12} className="text-indigo-600 shrink-0" />
                                    <span>Đã định vị GIS</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                    <AlertCircle size={12} className="shrink-0" />
                                    <span>Chưa có tọa độ</span>
                                  </span>
                                )}
                                {(sheetNo || plotNo) && (
                                  <div className="font-mono text-[11px] text-slate-600">
                                    Tờ {sheetNo || "-"}, Thửa {plotNo || "-"}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td
                              className="py-3.5 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDirections(h)}
                                  className="min-h-[34px] px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                  title="Chỉ đường tới hộ trên bản đồ số GIS"
                                >
                                  <Navigation size={12} className="text-emerald-600 shrink-0" />
                                  <span className="hidden sm:inline">Chỉ đường</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openPinModal(h)}
                                  className="min-h-[34px] px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                  title={h.coordinates ? `Đã ghim: ${h.coordinates}` : "Ghim tọa độ bản đồ"}
                                >
                                  <MapPin size={12} className="text-indigo-600 shrink-0" />
                                  <span className="hidden sm:inline">Ghim GIS</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(getHouseholdDetailPath(h.id))}
                                  className="min-h-[34px] px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                  title="Mở Sổ hộ khẩu điện tử chi tiết"
                                >
                                  <span>Xem sổ</span>
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4 sm:p-5 bg-slate-50/20">
                {filteredHouseholds.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 col-span-full">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                    Không tìm thấy sổ hộ khẩu nào
                  </div>
                ) : (
                  paginatedHouseholds.map((h) => {
                    const hType = h.type || "Thường trú";
                    return (
                      <div 
                        key={h.id}
                        id={`household-card-${h.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(getHouseholdDetailPath(h.id))}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(getHouseholdDetailPath(h.id));
                          }
                        }}
                        className="min-w-0 p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between gap-3 bg-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">{h.code}</span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                                <Users size={11} className="text-slate-500" />
                                {h.memberCount} người
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 border ${hType === "Tạm trú" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                              {hType === "Tạm trú" ? (h.tempSubType === "hostel" ? "Lưu trú trọ" : "Hộ tạm trú") : "Thường trú"}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {hType === "Tạm trú" ? "Đứng tên: " : "Chủ hộ: "}{h.ownerName}
                          </h3>
                          <p className="text-xs text-slate-600 flex items-center gap-1.5 min-w-0" title={h.address}>
                            <MapPin size={12} className="shrink-0 text-slate-500" />
                            <span className="truncate min-w-0 flex-1">{formatCompactKp3Address(h.address)}</span>
                          </p>
                          {h.hostelName && (
                            <p className="text-xs font-semibold text-amber-900 flex items-center gap-1 min-w-0">
                              <Home size={12} className="shrink-0 text-amber-600" />
                              <span className="truncate">{h.hostelName}{h.hostelPhone ? ` • ${h.hostelPhone}` : ""}</span>
                            </p>
                          )}
                          {hType === "Tạm trú" && (
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
                              <span className="text-slate-500 font-mono">
                                {h.nearestExpiryDate ? `Hạn gần nhất: ${h.nearestExpiryDate}` : "Đang lưu trú"}
                              </span>
                              {(h.expiredMemberCount || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                                  {h.expiredMemberCount} quá hạn
                                </span>
                              ) : (h.expiringMemberCount || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                                  {h.expiringMemberCount} sắp hết hạn
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDirections(h)}
                              className="min-h-[34px] px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                              title="Chỉ đường trên bản đồ GIS"
                            >
                              <Navigation size={12} />
                              <span>Dẫn đường</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPinModal(h)}
                              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-0.5 border cursor-pointer ${
                                h.coordinates 
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              }`}
                              title={h.coordinates ? `Tọa độ: ${h.coordinates}` : "Thêm tọa độ GIS"}
                              aria-label="Ghim tọa độ GIS"
                            >
                              <MapPin size={12} />
                            </button>
                          </div>
                          <span className="text-xs text-emerald-700 font-bold group-hover:underline flex items-center gap-0.5 cursor-pointer" onClick={() => navigate(getHouseholdDetailPath(h.id))}>
                            Chi tiết ➜
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-auto border-t border-slate-100 p-3.5 bg-slate-50/50">
              <Pagination
                id="household-pagination"
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS HỘ KHẨU */}
      {gisPinModalHousehold && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setGisPinModalHousehold(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Modal Header: Flat Hairline */}
            <div className="bg-slate-50 p-4 text-slate-900 flex justify-between items-center border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ghim & Đồng bộ Tọa độ GIS Hộ Khẩu</h3>
                  <p className="text-xs text-slate-600 font-mono">
                    Hộ: {gisPinModalHousehold.ownerName} • Mã sổ: {gisPinModalHousehold.code}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setGisPinModalHousehold(null)}
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ ghim tọa độ GIS"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">Địa chỉ hộ cư trú:</span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{gisPinModalHousehold.address}</p>
                <span className="text-xs text-slate-600 block">Khu phố 3, Phường An Phú, TP. Hồ Chí Minh</span>
              </div>

              {/* Coordinate Input */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <label htmlFor="gis-pin-coord-input" className="font-bold text-slate-700">Tọa độ GIS (Định dạng DMS hoặc Thập phân):</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(gisPinModalHousehold.address, gisPinModalHousehold.code);
                      setGisPinInput(auto.dms);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Tự động ước tính tọa độ dựa trên địa chỉ hộ trong ranh giới KP3"
                  >
                    <Sparkles size={12} className="text-emerald-600" /> Tự động nhận diện từ địa chỉ
                  </button>
                </div>

                <div className="relative">
                  <input 
                    id="gis-pin-coord-input"
                    type="text"
                    value={gisPinInput}
                    onChange={(e) => setGisPinInput(e.target.value)}
                    placeholder="Ví dụ: 10°56'13.2&quot;N 106°44'40.8&quot;E hoặc 10.936997, 106.744645"
                    className="w-full px-3.5 h-10 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white pr-9"
                  />
                  <MapPin size={15} className="absolute right-3 top-3 text-slate-400" />
                </div>
              </div>

              {/* Presets for KP3 */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Gợi ý phân khu / tuyến đường nhanh:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'13.2"N 106°44\'40.7"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">42 Lương Định Của</strong>
                    <span className="text-xs text-slate-600 font-mono">10.936997, 106.744645</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'16.1"N 106°44\'43.8"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 42 Lương Định Của</strong>
                    <span className="text-xs text-slate-600 font-mono">10.937800, 106.745500</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'08.9"N 106°44\'48.5"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 18 Lương Định Của</strong>
                    <span className="text-xs text-slate-600 font-mono">10.935800, 106.746800</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'12.5"N 106°44\'42.6"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">KDC Giáp ranh Tây Bắc KP3</strong>
                    <span className="text-xs text-slate-600 font-mono">10.936800, 106.744600</span>
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
                      <AlertCircle size={13} className="text-amber-600 shrink-0" />
                      <span>Đang kiểm tra định dạng tọa độ. Vui lòng nhập đúng chuẩn hoặc bấm nút tự động nhận diện.</span>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setGisPinModalHousehold(null)}
                className="px-3.5 py-2 text-slate-700 hover:bg-slate-200/70 border border-slate-200 bg-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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

      {notice && gisPinModalHousehold && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-md w-full px-4 sm:px-0">
          <InlineNotice
            message={notice.message}
            type={notice.type}
            onDismiss={() => setNotice(null)}
          />
        </div>
      )}
    </div>
  );
}
