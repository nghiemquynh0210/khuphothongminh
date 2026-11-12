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
  Undo2,
  Sparkles,
  Calendar,
  Layers,
  Navigation,
  Compass,
  Check
} from "lucide-react";
import { Household, Resident, TargetGisItem } from "../types";
import Pagination from "./Pagination";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { formatVNNumber } from "../utils/numberFormat";
import {
  getHouseholdCreatePath,
  getHouseholdDetailPath,
  navigate,
  useCurrentLocation
} from "../routes";
import {
  appendHouseholdAuditEntry,
  buildGisTargetForHousehold,
  isHouseholdSoftDeleted,
  restoreSoftDeletedHousehold
} from "../utils/householdFormUtils";

// Sub-component imports
import HouseholdDashboard from "./household/HouseholdDashboard";
import HouseholdDuplicates from "./household/HouseholdDuplicates";
import HouseholdAutoRecognition from "./household/HouseholdAutoRecognition";
import HouseholdGisPinModal from "./household/HouseholdGisPinModal";

interface HouseholdManagementProps {
  households: Household[];
  onAddHousehold?: (newH: Household) => void;
  residents: Resident[];
  onUpdateHouseholds: (households: Household[]) => void;
  onUpdateResidents: (residents: Resident[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onShowToast?: (message: string) => void;
}

const HouseholdSearchInput = React.memo(function HouseholdSearchInput({
  defaultValue,
  onSearch
}: {
  defaultValue: string;
  onSearch: (value: string) => void;
}) {
  const [val, setVal] = useState(defaultValue);
  const [prevDefault, setPrevDefault] = useState(defaultValue);

  if (defaultValue !== prevDefault) {
    setPrevDefault(defaultValue);
    setVal(defaultValue);
  }

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
        onChange={e => setVal(e.target.value)}
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

function parseTabFromSearch(search: string): "list" | "recognition" | "dashboard" | "audit" | null {
  const tabParam = new URLSearchParams(search).get("tab");
  if (
    tabParam === "recognition" ||
    tabParam === "dashboard" ||
    tabParam === "audit" ||
    tabParam === "list"
  ) {
    return tabParam;
  }
  return null;
}

export default function HouseholdManagement({
  households,
  residents = [],
  onUpdateHouseholds,
  onUpdateResidents,
  onNavigateToGis,
  onShowToast
}: HouseholdManagementProps) {
  const { search } = useCurrentLocation();
  const [prevSearch, setPrevSearch] = useState(search);
  const [activeTab, setActiveTab] = useState<"list" | "recognition" | "dashboard" | "audit">(
    () => parseTabFromSearch(search) || "list"
  );

  if (search !== prevSearch) {
    setPrevSearch(search);
    const nextTab = parseTabFromSearch(search);
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "card">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "card" : "list"
  );
  const itemsPerPage = 8;

  const [searchTerm, setSearchTerm] = useState("");
  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);
  const [typeFilter, setTypeFilter] = useState<"Tất cả" | "Thường trú" | "Tạm trú">("Tất cả");
  const [showSoftDeleted, setShowSoftDeleted] = useState(false);

  // GIS Coordinate Pinning Modal & Toast State
  const [gisPinModalHousehold, setGisPinModalHousehold] = useState<Household | null>(null);
  const [gisPinToast, setGisPinToast] = useState<string | null>(null);

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

  const handleDirections = (h: Household) => {
    const { target, resolvedCoordinates, wasAutoGenerated } = buildGisTargetForHousehold(h);
    if (wasAutoGenerated) {
      const updated = households.map(item =>
        item.id === h.id ? { ...item, coordinates: resolvedCoordinates } : item
      );
      onUpdateHouseholds(updated);
    }
    if (onNavigateToGis) {
      onNavigateToGis(target);
    }
  };

  const handleSavePinCoordinates = (
    targetHousehold: Household,
    finalCoord: string,
    andNavigate: boolean
  ) => {
    const updated = households.map(h =>
      h.id === targetHousehold.id
        ? {
            ...h,
            coordinates: finalCoord,
            auditHistory: appendHouseholdAuditEntry(
              h,
              `Cập nhật tọa độ GIS (${finalCoord})`
            )
          }
        : h
    );
    onUpdateHouseholds(updated);
    setGisPinModalHousehold(null);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: targetHousehold.id,
        type: "household",
        name: `Hộ ${targetHousehold.ownerName} (${targetHousehold.code})`,
        address: targetHousehold.address,
        coordinates: finalCoord,
        navigateRoute: true
      });
    } else {
      const msg = `Đã đồng bộ tọa độ Hộ ${targetHousehold.ownerName} (${finalCoord}) lên bản đồ GIS!`;
      setGisPinToast(msg);
      setTimeout(() => setGisPinToast(null), 3500);
    }
  };

  const handleRestoreHousehold = (h: Household) => {
    const updated = households.map(item =>
      item.id === h.id ? restoreSoftDeletedHousehold(item) : item
    );
    onUpdateHouseholds(updated);
    setShowSoftDeleted(false);
    if (onShowToast) {
      onShowToast(`Khôi phục Sổ hộ khẩu ${h.code} thành công!`);
    } else {
      setGisPinToast(`Khôi phục Sổ hộ khẩu ${h.code} thành công!`);
      setTimeout(() => setGisPinToast(null), 3500);
    }
  };

  const filteredHouseholds = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const hasQuery = q.length > 0;

    return households.filter(h => {
      const isDeleted = isHouseholdSoftDeleted(h);
      if (showSoftDeleted !== isDeleted) return false;

      const matchesType = typeFilter === "Tất cả" || (h.type || "Thường trú") === typeFilter;
      if (!matchesType) return false;

      if (!hasQuery) return true;

      return (
        h.ownerName.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.members &&
          h.members.some(
            m =>
              (m.name && m.name.toLowerCase().includes(q)) ||
              (m.cccd && m.cccd.includes(q))
          ))
      );
    });
  }, [households, searchTerm, showSoftDeleted, typeFilter]);

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
            <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-100/80 text-xs text-slate-600 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "list"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Home
                  size={13}
                  className={activeTab === "list" ? "text-emerald-600" : "text-slate-400"}
                />
                <span>Hộ Gia Đình</span>
              </button>
              <button
                type="button"
                id="btn-tab-auto-recognition"
                onClick={() => setActiveTab("recognition")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "recognition"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Quét dữ liệu dân cư thường trú để tự động nhận diện chủ hộ và thành viên"
              >
                <Sparkles
                  size={13}
                  className={activeTab === "recognition" ? "text-emerald-600" : "text-slate-400"}
                />
                <span>Nhận Diện Tự Động</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "dashboard"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Báo cáo chuyên sâu và thống kê cơ cấu hộ"
              >
                <Layers
                  size={13}
                  className={activeTab === "dashboard" ? "text-emerald-600" : "text-slate-400"}
                />
                <span>Báo Cáo Thống Kê</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "audit"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Rà soát hồ sơ trùng lặp và công cụ gộp sổ"
              >
                <GitBranch
                  size={13}
                  className={activeTab === "audit" ? "text-emerald-600" : "text-slate-400"}
                />
                <span>Trùng Lặp & Gộp Sổ</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-add-household"
              onClick={() => navigate(getHouseholdCreatePath())}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs hover:shadow-md shrink-0 ml-auto md:ml-0"
            >
              <Plus size={15} />
              <span>Lập Sổ Hộ Mới</span>
            </button>
          </div>
        }
      />

      {/* RENDER BY ACTIVE MODULE TAB */}
      {activeTab === "recognition" && (
        <HouseholdAutoRecognition
          households={households}
          residents={residents}
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
          onSelectHousehold={h => navigate(getHouseholdDetailPath(h.id))}
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
          {/* KPI SUMMARY CARDS */}
          {(() => {
            const activeH = households.filter(h => !isHouseholdSoftDeleted(h));
            const totalH = activeH.length;
            const ttCount = activeH.filter(h => (h.type || "Thường trú") === "Thường trú").length;
            const tamCount = activeH.filter(h => h.type === "Tạm trú").length;
            const gisCount = activeH.filter(h => h.coordinates).length;
            const totalResidentsInHh = activeH.reduce(
              (acc, h) => acc + (h.members?.length || h.memberCount || 0),
              0
            );

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
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <HouseholdSearchInput defaultValue={searchTerm} onSearch={handleSearchChange} />

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
                <button
                  type="button"
                  onClick={() => setTypeFilter("Tất cả")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    typeFilter === "Tất cả"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tất cả ({households.filter(h => !isHouseholdSoftDeleted(h)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("Thường trú")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    typeFilter === "Thường trú"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Thường trú (
                  {
                    households.filter(
                      h => !isHouseholdSoftDeleted(h) && (h.type || "Thường trú") === "Thường trú"
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("Tạm trú")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    typeFilter === "Tạm trú"
                      ? "bg-white text-amber-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tạm trú (
                  {households.filter(h => !isHouseholdSoftDeleted(h) && h.type === "Tạm trú").length}
                  )
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSoftDeleted(!showSoftDeleted);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1 px-3 py-2 border rounded-xl font-bold transition-all cursor-pointer ${
                  showSoftDeleted
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <Trash2 size={13} />
                {showSoftDeleted ? "Thùng rác Sổ" : "Xem hộ đã xóa"}
              </button>

              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-emerald-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Xem dạng Danh sách"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    viewMode === "card"
                      ? "bg-white text-emerald-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Xem dạng Thẻ Grid"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {showSoftDeleted ? "Lưu trữ thùng rác sổ hộ khẩu" : "Danh sách sổ chính thống"} (
                {formatVNNumber(filteredHouseholds.length)})
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
                  paginatedHouseholds.map(h => {
                    const hType = h.type || "Thường trú";
                    return (
                      <div
                        key={h.id}
                        id={`household-row-${h.id}`}
                        onClick={() => navigate(getHouseholdDetailPath(h.id))}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all group border-b border-slate-100 last:border-b-0 hover:bg-slate-50/90 cursor-pointer"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                              {h.code}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors group-hover:underline">
                              Hộ gia đình: {h.ownerName}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border shadow-2xs ${
                                hType === "Tạm trú"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {hType}
                            </span>
                            {h.coordinates ? (
                              <span
                                title={`Tọa độ GPS mốc ranh giới: ${h.coordinates}`}
                                className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-help"
                              >
                                <MapPin size={11} className="text-indigo-600" />
                                <span>Đã định vị GIS</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertCircle size={11} />
                                <span>Chưa có tọa độ</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <MapPin size={13} className="text-emerald-600 shrink-0" />
                              <span className="truncate max-w-md">{h.address}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Users size={12} className="text-slate-400" />
                              <span className="font-semibold text-slate-700">
                                {h.memberCount} nhân khẩu
                              </span>
                              {h.members && h.members.length > 0 && (
                                <span className="text-slate-400 hidden lg:inline">
                                  ({h.members.map(m => m.name).slice(0, 3).join(", ")}
                                  {h.members.length > 3 ? `, +${h.members.length - 3}` : ""})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-2 shrink-0 self-end md:self-auto pt-2 md:pt-0"
                          onClick={e => e.stopPropagation()}
                        >
                          {showSoftDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreHousehold(h)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            >
                              <Undo2 size={12} />
                              <span>Khôi phục</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDirections(h)}
                                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                title="Chỉ đường tới hộ trên bản đồ số GIS"
                              >
                                <Navigation size={12} className="text-emerald-600" />
                                <span>Chỉ đường</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setGisPinModalHousehold(h)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                title={
                                  h.coordinates
                                    ? `Đã ghim: ${h.coordinates}`
                                    : "Ghim tọa độ bản đồ"
                                }
                              >
                                <MapPin size={12} className="text-indigo-600" />
                                <span>Ghim GIS</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => navigate(getHouseholdDetailPath(h.id))}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
                            title="Mở Sổ hộ khẩu điện tử chi tiết"
                          >
                            <span>Xem sổ</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
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
                  paginatedHouseholds.map(h => {
                    const hType = h.type || "Thường trú";
                    return (
                      <div
                        key={h.id}
                        id={`household-card-${h.id}`}
                        onClick={() => navigate(getHouseholdDetailPath(h.id))}
                        className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 cursor-pointer transition-all flex flex-col justify-between gap-3 bg-white hover:shadow-md group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                              {h.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                hType === "Tạm trú"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {hType}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            Chủ hộ: {h.ownerName}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{h.address}</span>
                          </p>
                        </div>

                        <div
                          className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {showSoftDeleted ? (
                              <button
                                type="button"
                                onClick={() => handleRestoreHousehold(h)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Undo2 size={11} />
                                <span>Khôi phục</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDirections(h)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                  title="Chỉ đường trên bản đồ GIS"
                                >
                                  <Navigation size={11} />
                                  <span>Dẫn đường</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGisPinModalHousehold(h)}
                                  className={`p-1 rounded-lg text-[11px] font-semibold flex items-center gap-0.5 border cursor-pointer ${
                                    h.coordinates
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  }`}
                                  title={
                                    h.coordinates ? `Tọa độ: ${h.coordinates}` : "Thêm tọa độ GIS"
                                  }
                                >
                                  <MapPin size={11} />
                                </button>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(getHouseholdDetailPath(h.id))}
                            className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            Chi tiết ➜
                          </button>
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

      {/* TOAST THÔNG BÁO ĐỒNG BỘ GIS */}
      {gisPinToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{gisPinToast}</span>
        </div>
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS HỘ KHẨU */}
      <HouseholdGisPinModal
        household={gisPinModalHousehold}
        onClose={() => setGisPinModalHousehold(null)}
        onSaveCoordinates={handleSavePinCoordinates}
      />
    </div>
  );
}
