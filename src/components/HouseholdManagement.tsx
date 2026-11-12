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
  LayoutGrid,
  List,
  Sparkles,
  Calendar,
  Layers,
  Navigation,
  Compass,
  Check
} from "lucide-react";
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
import { KP3_AREA_LIST, extractKp3Area } from "../utils/kp3Utils";
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

interface HouseholdManagementProps {
  households: Household[];
  onAddHousehold: (newH: Household) => void;
  residents: Resident[];
  onUpdateHouseholds: (households: Household[]) => void;
  onUpdateResidents: (residents: Resident[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
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
    <div className="relative flex-1">
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
  onNavigateToGis
}: HouseholdManagementProps) {
  const { search } = useCurrentLocation();

  // Navigation & Sub-views tabs
  const [activeTab, setActiveTab] = useState<"list" | "recognition" | "dashboard" | "audit">(() => {
    const tabParam = new URLSearchParams(search || "").get("tab");
    if (tabParam === "recognition" || tabParam === "dashboard" || tabParam === "audit") {
      return tabParam;
    }
    return "list";
  });

  useEffect(() => {
    const tabParam = new URLSearchParams(search || "").get("tab");
    if (tabParam === "recognition" || tabParam === "dashboard" || tabParam === "audit" || tabParam === "list") {
      setActiveTab(tabParam);
    }
  }, [search]);
  
  // Basic states
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);
  const [typeFilter, setTypeFilter] = useState<"Tất cả" | "Thường trú" | "Tạm trú">("Tất cả");
  const [toFilter, setToFilter] = useState<string>("all");
  const [showSoftDeleted, setShowSoftDeleted] = useState(false); // Recycle bin toggle
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "card">("card");
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

      if (toFilter !== "all" && extractKp3Area(h.address) !== toFilter) return false;

      if (!hasQuery) return true;

      return (
        h.ownerName.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.members && h.members.some(m => (m.name && m.name.toLowerCase().includes(q)) || (m.cccd && m.cccd.includes(q))))
      );
    });
  }, [households, searchTerm, showSoftDeleted, typeFilter, toFilter]);

  // Paginated selection
  const paginatedHouseholds = filteredHouseholds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalItems = filteredHouseholds.length;

  return (
    <div id="household-management-view" className="space-y-6">
      
      {/* Top Banner Navigation & Actions */}
      <PageHeader
        badgeIcon={<Layers className="text-emerald-600 animate-pulse" size={13} />}
        badgeText="SỔ HỘ TỊCH ĐIỆN TỬ • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="ĐỀ ÁN 06/CP"
        title="Hệ thống Quản lý Hộ tịch thông minh"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Main Module Selection */}
            <div className="flex flex-wrap items-center border border-slate-200 rounded-xl p-1 bg-slate-100/80 text-xs text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "list" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Home size={13} className={activeTab === "list" ? "text-emerald-600" : "text-slate-500"} />
                <span>Hộ Gia Đình</span>
              </button>
              <button
                type="button"
                id="btn-tab-auto-recognition"
                onClick={() => setActiveTab("recognition")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "recognition" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                title="Quét dữ liệu dân cư thường trú để tự động nhận diện chủ hộ và thành viên"
              >
                <Sparkles size={13} className={activeTab === "recognition" ? "text-emerald-600" : "text-slate-500"} />
                <span>Nhận Diện Tự Động</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "dashboard" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                title="Báo cáo chuyên sâu và thống kê cơ cấu hộ"
              >
                <Layers size={13} className={activeTab === "dashboard" ? "text-emerald-600" : "text-slate-500"} />
                <span>Báo Cáo Thống Kê</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "audit" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                title="Rà soát hồ sơ trùng lặp và công cụ gộp sổ"
              >
                <GitBranch size={13} className={activeTab === "audit" ? "text-emerald-600" : "text-slate-500"} />
                <span>Trùng Lặp & Gộp Sổ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate(getHouseholdCreatePath())}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ml-auto md:ml-0 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Lập Sổ Hộ Mới</span>
            </button>
          </div>
        }
      />

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
              const ttCount = activeH.filter(h => (h.type || "Thường trú") === "Thường trú").length;
              const tamCount = activeH.filter(h => h.type === "Tạm trú").length;
              const gisCount = activeH.filter(h => h.coordinates).length;
              const totalResidentsInHh = activeH.reduce((acc, h) => acc + (h.members?.length || h.memberCount || 0), 0);

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in duration-200">
                  <StatCard
                    label="Tổng số hộ quản lý"
                    value={totalH}
                    badge="hộ điện tử"
                    highlighted={true}
                    subtext={`Quy mô ${formatVNNumber(totalResidentsInHh)} nhân khẩu`}
                    subtextRight={`TB ${(totalResidentsInHh / (totalH || 1)).toFixed(1)} người/hộ`}
                    icon={Home}
                    color="emerald"
                  />
                  <StatCard
                    label="Sổ hộ thường trú"
                    value={ttCount}
                    badge={`${((ttCount / (totalH || 1)) * 100).toFixed(0)}%`}
                    subtext="CSDL Đề án 06/CP"
                    subtextRight="Hộ khẩu gốc"
                    icon={Check}
                    color="blue"
                  />
                  <StatCard
                    label="Sổ hộ tạm trú"
                    value={tamCount}
                    badge={`${((tamCount / (totalH || 1)) * 100).toFixed(0)}%`}
                    subtext="Lưu trú, thuê trọ địa bàn"
                    subtextRight="Biến động cư trú"
                    icon={Calendar}
                    color="amber"
                  />
                  <StatCard
                    label="Số hóa mốc GIS"
                    value={gisCount}
                    badge={`${((gisCount / (totalH || 1)) * 100).toFixed(0)}%`}
                    subtext="Tọa độ không gian GIS"
                    subtextRight="100% đã ghim mốc"
                    icon={Compass}
                    color="purple"
                  />
                </div>
              );
            })()}

            {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-white p-4 rounded-xl border border-slate-200">
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

              <div className="w-48">
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
                className={`flex items-center gap-1.5 px-3 h-10 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  showSoftDeleted 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <Trash2 size={13} />
                {showSoftDeleted ? "Thùng rác Sổ" : "Xem hộ đã xóa"}
              </button>

              {/* View switches */}
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-emerald-700 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                  title="Xem dạng Danh sách"
                  aria-label="Xem dạng Danh sách"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded transition-colors cursor-pointer ${viewMode === "card" ? "bg-white text-emerald-700 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                  title="Xem dạng Thẻ Grid"
                  aria-label="Xem dạng Thẻ Grid"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Container: Toàn bộ chiều rộng cho danh sách Sổ Hộ Khẩu */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {showSoftDeleted ? "Lưu trữ thùng rác sổ hộ khẩu" : "Danh sách sổ chính thống"} ({formatVNNumber(filteredHouseholds.length)})
              </span>
            </div>

            {viewMode === "list" ? (
              <div className="divide-y divide-slate-100 overflow-y-auto">
                {filteredHouseholds.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                    Không tìm thấy sổ hộ khẩu phù hợp bộ lọc
                  </div>
                ) : (
                  paginatedHouseholds.map((h) => {
                    const hType = h.type || "Thường trú";
                    return (
                      <div 
                        key={h.id}
                        id={`household-row-${h.id}`}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all group border-b border-slate-100 last:border-b-0 hover:bg-slate-50/90"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Line 1: Mã hộ, Tên chủ hộ, Tổ KP3, Loại hộ, Tag GIS gọn gàng */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                              {h.code}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                              {extractKp3Area(h.address)}
                            </span>
                            <h3 
                              onClick={() => navigate(getHouseholdDetailPath(h.id))}
                              className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors cursor-pointer hover:underline"
                            >
                              Hộ gia đình: {h.ownerName}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                              hType === "Tạm trú"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}>
                              {hType}
                            </span>
                            {h.coordinates ? (
                              <span 
                                title={`Tọa độ GPS mốc ranh giới: ${h.coordinates}`}
                                className="text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-help"
                              >
                                <MapPin size={12} className="text-indigo-600" />
                                <span>Đã định vị GIS</span>
                              </span>
                            ) : (
                              <span className="text-xs text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>Chưa có tọa độ</span>
                              </span>
                            )}
                          </div>

                          {/* Line 2: Địa chỉ vật lý & Preview danh sách nhân khẩu */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <MapPin size={13} className="text-emerald-600 shrink-0" />
                              <span className="truncate max-w-md">{h.address}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Users size={12} className="text-slate-500" />
                              <span className="font-semibold text-slate-700">{h.memberCount} nhân khẩu</span>
                              {h.members && h.members.length > 0 && (
                                <span className="text-slate-500 hidden lg:inline">
                                  ({h.members.map(m => m.name).slice(0, 3).join(", ")}{h.members.length > 3 ? `, +${h.members.length - 3}` : ""})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Cân bằng phân cấp hành động */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto pt-2 md:pt-0">
                          <button
                            type="button"
                            onClick={() => handleDirections(h)}
                            className="px-2.5 py-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Chỉ đường tới hộ trên bản đồ số GIS"
                          >
                            <Navigation size={12} className="text-emerald-600" />
                            <span>Chỉ đường</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openPinModal(h)}
                            className="px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={h.coordinates ? `Đã ghim: ${h.coordinates}` : "Ghim tọa độ bản đồ"}
                          >
                            <MapPin size={12} className="text-indigo-600" />
                            <span>Ghim GIS</span>
                          </button>

                          {/* PRIMARY CALL TO ACTION: XEM SỔ HỘ TỊCH */}
                          <button
                            type="button"
                            onClick={() => navigate(getHouseholdDetailPath(h.id))}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            title="Mở Sổ hộ khẩu điện tử chi tiết"
                          >
                            <span>Xem sổ</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );                  })
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5 max-h-[640px] overflow-y-auto bg-slate-50/10">
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
                        onClick={() => navigate(getHouseholdDetailPath(h.id))}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors flex flex-col justify-between gap-3 bg-white group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{h.code}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">{extractKp3Area(h.address)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 border ${hType === "Tạm trú" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                              {hType}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">Chủ hộ: {h.ownerName}</h3>
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <MapPin size={12} className="shrink-0 text-slate-500" /> <span className="truncate">{h.address}</span>
                          </p>
                        </div>
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
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
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Modal Header: Flat Hairline */}
            <div className="bg-slate-50 p-4 text-slate-900 flex justify-between items-center border-b border-slate-200">
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
            <div className="p-5 space-y-4 text-xs">
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
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
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
