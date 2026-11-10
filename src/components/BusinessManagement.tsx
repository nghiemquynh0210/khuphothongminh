import React, { useState } from "react";
import {
  Search,
  Filter,
  Briefcase,
  ShieldCheck,
  MapPin,
  FileText,
  Plus,
  LayoutGrid,
  List,
  Trash2,
  Pencil,
  User,
  Phone,
  Building,
  Bed,
  Download,
  Upload,
  Eye,
  Sparkles,
  RefreshCw,
  Store
} from "lucide-react";
import { Business, Household, Resident, TargetGisItem } from "../types";
import Pagination from "./Pagination";
import { formatVNNumber } from "../utils/numberFormat";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import {
  isResidentInAccommodation,
  autoExtractHostelBusinesses
} from "../utils/householdRecognitionUtils";
import { supabase } from "../lib/supabase";
import {
  INDUSTRY_SECTORS,
  getBusinessIndustryGroup,
  getSectorMeta,
  isAccommodationBusiness
} from "../utils/businessFormUtils";
import {
  getBusinessCreatePath,
  getBusinessDetailPath,
  getBusinessEditPath,
  navigate
} from "../routes";
import BusinessSodoModal, {
  ViewingBusinessDoc
} from "./business/BusinessSodoModal";

interface BusinessManagementProps {
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  onToggleCertification: (id: string) => void;
  onUpdateStatus: (
    id: string,
    status:
      | "Đang hoạt động"
      | "Tạm ngưng"
      | "Chờ duyệt"
      | "Chuyển địa điểm"
      | "Chưa xác minh"
  ) => void;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
}

export default function BusinessManagement({
  businesses,
  residents = [],
  onUpdateBusinesses
}: BusinessManagementProps) {
  const [establishmentFilter] = useState<"all" | "household" | "accommodation" | "pccc-pass" | "pccc-fail" | "has-sodo">("all");
  const [pcccFilter, setPcccFilter] = useState<string>("Tất cả");
  const [streetFilter, setStreetFilter] = useState<string>("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [categoryFilter, setCategoryFilter] = useState<string>("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const itemsPerPage = 8;

  // Tự động nhận diện & thêm cơ sở nhà trọ từ dữ liệu dân cư
  const [isDetectingHostels, setIsDetectingHostels] = useState(false);
  const [isSyncingHostels, setIsSyncingHostels] = useState(false);
  const [hostelToast, setHostelToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const showHostelToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setHostelToast({ message, type });
    setTimeout(() => setHostelToast(null), 4000);
  };

  const handleAutoDetectHostels = () => {
    setIsDetectingHostels(true);
    try {
      const extracted = autoExtractHostelBusinesses(residents, businesses);
      if (extracted.length === 0) {
        showHostelToast("Hệ thống đã nhận diện đầy đủ tất cả cơ sở trọ từ dữ liệu cư dân KP3!", "info");
        return;
      }
      const updated = [...businesses, ...extracted];
      if (onUpdateBusinesses) {
        onUpdateBusinesses(updated);
      }
      showHostelToast(`Đã tự động nhận diện và liên kết thành công ${extracted.length} cơ sở nhà trọ từ dữ liệu cư dân KP3!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showHostelToast(`Lỗi nhận diện cơ sở trọ: ${msg}`, "error");
    } finally {
      setIsDetectingHostels(false);
    }
  };

  const handleSyncHostelsToSupabase = async () => {
    if (!supabase) {
      showHostelToast("Chưa kết nối CSDL Supabase", "error");
      return;
    }
    setIsSyncingHostels(true);
    try {
      const hostelsToSync = businesses.filter(b => b.isAccommodation);
      const rows = hostelsToSync.map(b => {
        const isValidUuid = b.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id);
        const item: Record<string, unknown> = {
          name: b.name,
          tax_code: b.taxCode || "",
          business_type: b.businessType || "Hộ kinh doanh",
          industry_group: b.industryGroup || "Lưu trú & Cho thuê",
          owner_name: b.owner,
          phone: b.phone,
          address: b.address,
          license_number: b.licenseNumber,
          status: b.status,
          safety_certified: b.safetyCertified,
          employee_count: b.employeeCount || 1,
          coordinates: b.coordinates,
          is_accommodation: true,
          room_count: b.soPhong || 0,
          guest_count: b.soNguoiLuuTru || 0,
          internal_code: b.internalCode || `HKD-KP3-${b.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 15)}`,
          image_url: b.image
        };
        if (isValidUuid) {
          item.id = b.id;
        }
        return item;
      });

      const sb = supabase as unknown as {
        from: (table: string) => {
          upsert: (
            values: Record<string, unknown>[],
            opts: { onConflict: string }
          ) => Promise<{ error: { message?: string } | null }>;
        };
      };
      const { error } = await sb
        .from("businesses")
        .upsert(rows, { onConflict: "internal_code" });

      if (error) throw new Error(error.message || "Lỗi đồng bộ");
      showHostelToast(`Đã lưu vĩnh viễn ${hostelsToSync.length} cơ sở lưu trú vào CSDL Supabase!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showHostelToast(`Lỗi đồng bộ Supabase: ${msg}`, "error");
    } finally {
      setIsSyncingHostels(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  // Document Viewer state (Sổ đỏ quick view)
  const [viewingDoc, setViewingDoc] = useState<ViewingBusinessDoc | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Delete Business States & Handler
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);

  const executeDeleteBusiness = (id: string) => {
    if (onUpdateBusinesses) {
      const remaining = businesses.filter(b => b.id !== id);
      onUpdateBusinesses(remaining);
      showToast("Đã xóa hộ kinh doanh khỏi danh sách thành công!", "success");
      setBusinessToDelete(null);
    } else {
      showToast("Lỗi hệ thống: Không thể kết nối với cơ sở dữ liệu!", "error");
    }
  };

  // Filtered Businesses Logic with Standardized Industry Sector Classifier & SME Filter
  const filteredBusinesses = businesses.filter(b => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = b.name.toLowerCase().includes(searchLower) || 
                          b.owner.toLowerCase().includes(searchLower) ||
                          b.licenseNumber.toLowerCase().includes(searchLower) ||
                          (b.internalCode && b.internalCode.toLowerCase().includes(searchLower)) ||
                          (b.taxCode && b.taxCode.toLowerCase().includes(searchLower)) ||
                          (b.legalRepresentative && b.legalRepresentative.toLowerCase().includes(searchLower)) ||
                          (b.focalPointName && b.focalPointName.toLowerCase().includes(searchLower)) ||
                          (b.linkedHouseholdCode && b.linkedHouseholdCode.toLowerCase().includes(searchLower)) ||
                          (b.address && b.address.toLowerCase().includes(searchLower)) ||
                          (b.toBanDo && b.toBanDo.includes(searchTerm)) ||
                          (b.soThua && b.soThua.includes(searchTerm)) ||
                          (b.type && b.type.toLowerCase().includes(searchLower)) ||
                          (b.industryGroup && b.industryGroup.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === "Tất cả" || b.status === statusFilter;

    let matchesCategory = true;
    if (categoryFilter !== "Tất cả") {
      const bGroup = getBusinessIndustryGroup(b);
      matchesCategory = bGroup === categoryFilter || 
        (categoryFilter === "Nhà trọ & Lưu trú" && bGroup === "Lưu trú & Cho thuê") ||
        (categoryFilter === "Y tế / Sức khỏe" && bGroup === "Y tế / Chăm sóc sức khỏe");
    }

    let matchesEstablishmentFilter = true;
    if (establishmentFilter === "household") {
      matchesEstablishmentFilter = !b.isAccommodation;
    } else if (establishmentFilter === "accommodation") {
      matchesEstablishmentFilter = isAccommodationBusiness(b);
    } else if (establishmentFilter === "pccc-pass") {
      matchesEstablishmentFilter = Boolean(b.safetyCertified);
    } else if (establishmentFilter === "pccc-fail") {
      matchesEstablishmentFilter = !b.safetyCertified;
    } else if (establishmentFilter === "has-sodo") {
      matchesEstablishmentFilter = Boolean(b.soDoFile);
    }

    let matchesPccc = true;
    if (pcccFilter === "Đạt chuẩn") {
      matchesPccc = Boolean(b.safetyCertified);
    } else if (pcccFilter === "Chưa đạt") {
      matchesPccc = !b.safetyCertified;
    }

    let matchesStreet = true;
    if (streetFilter !== "Tất cả") {
      const addrLower = (b.address || "").toLowerCase();
      const streetAreaLower = (b.streetArea || "").toLowerCase();
      if (streetFilter === "Mặt tiền Lương Định Của") {
        matchesStreet = streetAreaLower.includes("mặt tiền") || (!addrLower.includes("hẻm") && addrLower.includes("lương định của"));
      } else if (streetFilter === "Hẻm 42 Lương Định Của") {
        matchesStreet = addrLower.includes("42/") || streetAreaLower.includes("42");
      } else if (streetFilter === "Hẻm 18 Lương Định Của") {
        matchesStreet = addrLower.includes("18/") || streetAreaLower.includes("18");
      } else {
        matchesStreet = true;
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesEstablishmentFilter && matchesPccc && matchesStreet;
  });

  // Industry Sector Statistics Calculation (Bảng Thống kê Cơ cấu Ngành nghề)
  const sectorStats = React.useMemo(() => {
    const total = businesses.length || 1;
    return INDUSTRY_SECTORS.map(sec => {
      const secBusinesses = businesses.filter(b => getBusinessIndustryGroup(b) === sec.id);
      const count = secBusinesses.length;
      const percentage = (count / total) * 100;
      const activeCount = secBusinesses.filter(b => b.status === "Đang hoạt động").length;
      const pausedOrPendingCount = secBusinesses.filter(b => b.status !== "Đang hoạt động").length;
      const employeeCount = secBusinesses.reduce((acc, b) => acc + (b.employeeCount || 0), 0);
      const certifiedPcccCount = secBusinesses.filter(b => b.safetyCertified).length;
      return {
        ...sec,
        count,
        percentage,
        activeCount,
        pausedOrPendingCount,
        employeeCount,
        certifiedPcccCount,
        businesses: secBusinesses
      };
    });
  }, [businesses]);

  // Analytics & Statistics for Local Establishments
  const totalAccomCount = businesses.filter(b => isAccommodationBusiness(b)).length;
  const totalRooms = businesses.reduce((acc, b) => acc + (b.soPhong || 0), 0);
  const totalSoDoFiles = businesses.filter(b => Boolean(b.soDoFile)).length;
  const totalCertifiedPccc = businesses.filter(b => b.safetyCertified).length;

  // Pagination Logic
  const totalItems = filteredBusinesses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedBusinesses = filteredBusinesses.slice(startIndex, startIndex + itemsPerPage);

  const handleExportBusinessesCsv = () => {
    const headers = [
      "Mã cơ sở",
      "Tên cơ sở kinh doanh",
      "Số GPKD",
      "Ngành nghề",
      "Chủ cơ sở",
      "Số điện thoại",
      "Địa chỉ",
      "Tuyến đường",
      "Loại mặt bằng",
      "Chứng nhận PCCC",
      "Cơ sở lưu trú",
      "Số phòng",
      "Số người lưu trú",
      "Tờ BĐ",
      "Thửa đất",
      "Trạng thái hoạt động"
    ];

    const rows = filteredBusinesses.map(b => [
      `"${b.internalCode || b.id}"`,
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.licenseNumber || ""}"`,
      `"${b.type || ""}"`,
      `"${b.owner || ""}"`,
      `"${b.phone || ""}"`,
      `"${b.address.replace(/"/g, '""')}"`,
      `"${b.streetArea || ""}"`,
      `"${b.premisesType || "Nhà phố"}"`,
      b.safetyCertified ? '"Đạt chuẩn"' : '"Chưa đạt"',
      b.isAccommodation ? '"Có"' : '"Không"',
      b.soPhong || 0,
      b.soNguoiLuuTru || 0,
      `"${b.toBanDo || ""}"`,
      `"${b.soThua || ""}"`,
      `"${b.status || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_Co_so_Kinh_doanh_KP3_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách cơ sở kinh doanh KP3 thành công!", "success");
  };

  return (
    <div id="business-management-view" className="space-y-6 relative">
      {/* Toast thông báo Nhận diện / Đồng bộ Cơ sở trọ */}
      {hostelToast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border transition-all animate-bounce ${
          hostelToast.type === "success" 
            ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30"
            : hostelToast.type === "info"
            ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30"
            : "bg-rose-600 text-white border-rose-500 shadow-rose-600/30"
        }`}>
          <Sparkles size={16} />
          <span>{hostelToast.message}</span>
        </div>
      )}

      {/* Upper header */}
      <PageHeader
        badgeIcon={<Store size={14} className="text-emerald-600" />}
        badgeText="KINH TẾ CƠ SỞ & HỘ KINH DOANH • KP3 AN PHÚ"
        badgeSubtext="ĐỀ ÁN 06/CP"
        title="Quản lý Cơ sở Kinh doanh KP3"
        actions={
          <>
            <button 
              type="button"
              onClick={handleAutoDetectHostels}
              disabled={isDetectingHostels}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Tự động phân tích cư dân để nhận diện và thêm các cơ sở nhà trọ / lưu trú"
            >
              <Sparkles size={15} className={`text-amber-600 ${isDetectingHostels ? "animate-spin" : ""}`} />
              <span>Tự động nhận diện Nhà trọ</span>
            </button>
            <button 
              type="button"
              onClick={handleExportBusinessesCsv}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs border border-slate-200 transition-all cursor-pointer shadow-xs"
              title="Xuất danh sách cơ sở kinh doanh dạng CSV"
            >
              <Download size={15} className="text-slate-600" /> Xuất File CSV
            </button>
            <button 
              type="button"
              onClick={() => navigate(getBusinessCreatePath())}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer hover:shadow-md"
            >
              <Plus size={16} /> Đăng ký Cơ sở Mới
            </button>
          </>
        }
      />

      {/* KPI Stats Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng cơ sở kinh doanh"
          value={businesses.length}
          badge="Tại chỗ"
          icon={<Briefcase size={22} />}
          color="blue"
          subtext="Hộ kinh doanh cá thể & cơ sở"
          subtextRight="CSDL KP3"
          highlighted={true}
        />
        <StatCard
          label="Nhà trọ & Lưu trú"
          value={totalAccomCount}
          badge={`${formatVNNumber(totalRooms)} phòng`}
          icon={<Building size={22} />}
          color="amber"
          subtext="Cơ sở phòng trọ lưu trú"
          subtextRight="An ninh lưu trú"
        />
        <StatCard
          label="Hồ sơ Sổ đỏ đính kèm"
          value={totalSoDoFiles}
          badge={`/ ${formatVNNumber(businesses.length)}`}
          icon={<FileText size={22} />}
          color="indigo"
          subtext="Giấy chứng nhận QSDĐ"
          subtextRight="Địa chính ODT"
        />
        <StatCard
          label="Đạt chuẩn an toàn PCCC"
          value={totalCertifiedPccc}
          badge="cơ sở"
          icon={<ShieldCheck size={22} />}
          color="emerald"
          subtext="Đạt điều kiện PCCC"
          subtextRight="Kiểm tra định kỳ"
        />
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            id="business-search-input"
            name="businessSearchTerm"
            type="text" 
            placeholder="Tìm theo tên cơ sở, chủ hộ, số GPKD, địa chỉ, ngành nghề, Tờ BĐ, số Thửa..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter size={13} /> Ngành:
            </span>
            <select 
              id="business-category-filter"
              name="businessCategoryFilter"
              value={categoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium max-w-[150px] truncate"
            >
              <option value="Tất cả">Tất cả ngành nghề ({formatVNNumber(businesses.length)})</option>
              {INDUSTRY_SECTORS.map((sec) => {
                const count = sectorStats.find(s => s.id === sec.id)?.count || 0;
                return (
                  <option key={sec.id} value={sec.id}>
                    {sec.icon} {sec.name} ({formatVNNumber(count)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* PCCC Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500">PCCC:</span>
            <select 
              id="business-pccc-filter"
              name="businessPcccFilter"
              value={pcccFilter}
              onChange={(e) => { setPcccFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="Tất cả">Tất cả điều kiện PCCC</option>
              <option value="Đạt chuẩn">Đạt chuẩn an toàn PCCC</option>
              <option value="Chưa đạt">Chưa đạt / Cần nhắc nhở</option>
            </select>
          </div>

          {/* Street Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Tuyến đường:</span>
            <select 
              id="business-street-filter"
              name="businessStreetFilter"
              value={streetFilter}
              onChange={(e) => { setStreetFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="Tất cả">Tất cả tuyến đường</option>
              <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
              <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
              <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select 
              id="business-status-filter"
              name="businessStatusFilter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Tạm ngưng">Tạm ngưng</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "card" 
                  ? "bg-white text-indigo-700 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Xem dạng Lưới Thẻ"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "table" 
                  ? "bg-white text-indigo-700 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Xem dạng Bảng Danh Sách"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Toàn bộ chiều rộng cho danh sách Cơ sở Kinh doanh */}
      <div className="w-full space-y-4">
        {/* Banner Tự động liên kết Nhà trọ từ dữ liệu Dân cư */}
        {establishmentFilter === "accommodation" && (
          <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 border border-amber-200/90 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300/60 shadow-xs">
                <Sparkles size={20} className="text-amber-700" />
              </div>
              <div>
                <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <span>Hệ thống đã tự động nhận diện {totalAccomCount} cơ sở nhà trọ & lưu trú từ 11.632 cư dân</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                    Đối soát CSDL thực tế
                  </span>
                </div>
                <div className="text-amber-800/80 text-[11px] mt-0.5">
                  Tất cả các cơ sở trọ được trích xuất tự động từ địa chỉ tạm trú, nhận diện tên chủ trọ, số điện thoại, quy mô phòng và số người lưu trú thực tế.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAutoDetectHostels}
                disabled={isDetectingHostels}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Quét lại toàn bộ 11.632 cư dân để bổ sung thêm cơ sở trọ mới"
              >
                <RefreshCw size={13} className={isDetectingHostels ? "animate-spin" : ""} />
                <span>Quét lại cư dân</span>
              </button>
              <button
                type="button"
                onClick={handleSyncHostelsToSupabase}
                disabled={isSyncingHostels}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Lưu toàn bộ các cơ sở lưu trú vào bảng businesses trong cơ sở dữ liệu Supabase"
              >
                <Upload size={13} className={isSyncingHostels ? "animate-spin" : ""} />
                <span>{isSyncingHostels ? "Đang lưu..." : "Lưu vào Supabase CSDL"}</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === "card" ? (
          /* Card Grid View: Toàn bộ chiều rộng, 1-4 cột */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBusinesses.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400 space-y-2">
                <Briefcase size={36} className="mx-auto text-slate-300" />
                <p>Không tìm thấy cơ sở kinh doanh nào phù hợp với bộ lọc</p>
              </div>
            ) : (
              paginatedBusinesses.map((b) => {
                const statusColors: Record<string, string> = {
                  "Đang hoạt động": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                  "Tạm ngưng": "bg-rose-500/10 text-rose-600 border-rose-500/20",
                  "Chờ duyệt": "bg-amber-500/10 text-amber-600 border-amber-500/20",
                  "Chuyển địa điểm": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
                  "Chưa xác minh": "bg-slate-500/10 text-slate-600 border-slate-500/20"
                };
                const isAccom = isAccommodationBusiness(b);
                const sectorGroup = getBusinessIndustryGroup(b);
                const sectorMeta = getSectorMeta(sectorGroup);

                return (
                  <div 
                    key={b.id}
                    id={`business-card-${b.id}`}
                    onClick={() => navigate(getBusinessDetailPath(b.id))}
                    className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 cursor-pointer flex flex-col justify-between relative"
                  >
                    <div className="space-y-3">
                      {/* 1. Header Badges: Category & Status (Đã bỏ nhãn loại hình trùng lặp để tinh gọn UI) */}
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-2xs shrink-0 ${sectorMeta.badgeClass}`}>
                          <span>{sectorMeta.icon}</span>
                          <span className="truncate">{sectorMeta.shortName}</span>
                        </span>
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${statusColors[b.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${b.status === "Đang hoạt động" ? "bg-emerald-500 animate-pulse" : b.status === "Tạm ngưng" ? "bg-rose-500" : "bg-amber-500"}`} />
                          <span>{b.status}</span>
                        </span>
                      </div>

                      {/* 2. Image Thumbnail (Gọn gàng, sang trọng, không chèn chữ dài ngoằng đè lên ảnh) */}
                      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 shadow-inner">
                        <img 
                          src={b.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500"} 
                          alt={b.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
                        
                        {/* Giấy phép kinh doanh đặt góc trên phải ảnh */}
                        <div className="absolute top-2 right-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs shadow-xs border border-white/20">
                            {b.licenseNumber || b.internalCode || "KP3-KD"}
                          </span>
                        </div>

                        {/* Huy hiệu cơ sở lưu trú ở góc dưới trái ảnh */}
                        {isAccom && (
                          <div className="absolute bottom-2 left-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Building size={11} /> Cơ sở lưu trú
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 3. Tên cơ sở kinh doanh đặt ra ngoài ảnh - Rõ ràng, không bị che khuất */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-[14px] leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1" title={b.name}>
                          {b.name}
                        </h3>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="line-clamp-1 text-slate-600 font-medium" title={b.address}>
                            {b.address}
                          </span>
                        </div>
                      </div>

                      {/* 4. Khối thông tin lưu trú / phòng trọ (Đồng bộ chuẩn 100% như 2 hộ kế bên, không vỡ layout) */}
                      {isAccom && (() => {
                        const staying = residents.filter(r => isResidentInAccommodation(r, b));
                        const actualCount = staying.length > 0 ? staying.length : (b.soNguoiLuuTru || 0);
                        return (
                          <div className="py-2 px-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                              <Bed size={14} className="text-amber-700 shrink-0" />
                              <span>{b.soPhong || 0} phòng</span>
                              <span className="text-amber-400">•</span>
                              <span>{b.soTang || 0} tầng</span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/80 whitespace-nowrap shrink-0">
                              👥 {actualCount} người
                            </span>
                          </div>
                        );
                      })()}

                      {/* 5. Địa chính & Thửa đất (Gọn gàng 1 hàng không bị rớt dòng) */}
                      <div className="bg-slate-50/90 py-2 px-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700 font-bold whitespace-nowrap">
                          <span className="text-slate-400 font-sans font-normal text-[10px]">ĐC:</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs text-[10.5px]">
                            Tờ {b.toBanDo || "—"}, Thửa {b.soThua || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 whitespace-nowrap text-[11px]">
                          <span>{b.dienTich ? `${b.dienTich} m²` : "—"}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {b.loaiDat || "ODT"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 6. Footer: Chủ hộ + Nút Sổ đỏ + PCCC */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1 flex-1">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {b.owner ? b.owner.charAt(0) : "U"}
                        </div>
                        <span className="font-semibold text-slate-800 truncate text-[11.5px]" title={b.owner}>
                          {b.owner}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {b.soDoFile ? (() => {
                          const sodoFile = b.soDoFile;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDoc({
                                  title: "Hồ sơ Giấy chứng nhận QSDĐ (Sổ đỏ)",
                                  businessName: b.name,
                                  file: sodoFile,
                                  business: b
                                });
                              }}
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                                sodoFile.type === "pdf" 
                                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" 
                                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              }`}
                              title="Nhấp để xem tệp Sổ đỏ"
                            >
                              <FileText size={10} />
                              <span>Sổ đỏ</span>
                            </button>
                          );
                        })() : (
                          <span className="text-[9.5px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 italic">
                            Chưa sổ
                          </span>
                        )}

                        {b.safetyCertified && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold text-[9.5px]">
                            <ShieldCheck size={11} className="text-emerald-600" /> PCCC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          ) : (
            /* Table Detailed View */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Cơ sở / Ngành nghề</th>
                      <th className="p-3.5">Chủ sở hữu & Liên hệ</th>
                      <th className="p-3.5">Đặc điểm Lưu trú</th>
                      <th className="p-3.5">Địa chính / Thửa đất</th>
                      <th className="p-3.5">Sổ đỏ & PCCC</th>
                      <th className="p-3.5 text-center">Trạng thái</th>
                      <th className="p-3.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBusinesses.map((b) => {
                      const isAccom = isAccommodationBusiness(b);
                      const sectorGroup = getBusinessIndustryGroup(b);
                      const sectorMeta = getSectorMeta(sectorGroup);
                      return (
                        <tr 
                          key={b.id}
                          onClick={() => navigate(getBusinessDetailPath(b.id))}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                        >
                          {/* Cột 1: Cơ sở / Ngành nghề */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                                <img 
                                  src={b.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200"} 
                                  alt={b.name} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200";
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition-colors line-clamp-1">{b.name}</div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-1 ${sectorMeta.badgeClass}`}>
                                    <span>{sectorMeta.icon}</span>
                                    <span>{sectorMeta.shortName}</span>
                                  </span>
                                  <span className="font-mono text-slate-500 font-semibold text-[10px] bg-slate-100 px-1 py-0.2 rounded border border-slate-200">{b.licenseNumber}</span>
                                  <span className="text-[10px] text-slate-500">• {b.type}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 2: Chủ sở hữu & Liên hệ */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              <User size={13} className="text-slate-400" />
                              <span>{b.owner}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <Phone size={11} className="text-slate-400" />
                              <span>{b.phone || "—"}</span>
                            </div>
                          </td>

                          {/* Cột 3: Đặc điểm Lưu trú */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isAccom ? (() => {
                              const staying = residents.filter(r => isResidentInAccommodation(r, b));
                              const actualCount = staying.length > 0 ? staying.length : (b.soNguoiLuuTru || 0);
                              return (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full text-[10px] border border-amber-200">
                                    <Building size={11} className="text-amber-700" /> {b.soPhong || 0} phòng / {b.soTang || 0} tầng
                                  </span>
                                  <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                                    <span>👥 {actualCount} người</span>
                                    {staying.length > 0 ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        ✓ CSDL
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-normal">lưu trú</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })() : (
                              <span className="text-slate-400 text-[11px] italic bg-slate-50 px-2 py-0.5 rounded">Không lưu trú</span>
                            )}
                          </td>

                          {/* Cột 4: Địa chính / Thửa đất */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="text-[11px] font-mono text-slate-800 font-bold">
                              Tờ {b.toBanDo || "—"} • Thửa {b.soThua || "—"}
                            </div>
                            <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>{b.dienTich ? `${b.dienTich} m²` : "—"}</span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {b.loaiDat || "ODT"}
                              </span>
                            </div>
                          </td>

                          {/* Cột 5: Sổ đỏ & PCCC */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              {b.soDoFile ? (() => {
                                const sodoFile = b.soDoFile;
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingDoc({
                                        title: "Hồ sơ Giấy chứng nhận QSDĐ (Sổ đỏ)",
                                        businessName: b.name,
                                        file: sodoFile,
                                        business: b
                                      });
                                    }}
                                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                                      sodoFile.type === "pdf"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                        : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                    }`}
                                  >
                                    <FileText size={11} /> Sổ đỏ ({sodoFile.type.toUpperCase()})
                                  </button>
                                );
                              })() : (
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200/60 italic">
                                  Chưa nộp sổ
                                </span>
                              )}

                              {b.safetyCertified && (
                                <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <ShieldCheck size={11} className="text-emerald-600" /> PCCC đạt
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cột 6: Trạng thái (Luôn 1 hàng, không bị ngắt chữ) */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                              b.status === "Đang hoạt động" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              b.status === "Tạm ngưng" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${b.status === "Đang hoạt động" ? "bg-emerald-500 animate-pulse" : b.status === "Tạm ngưng" ? "bg-rose-500" : "bg-amber-500"}`} />
                              <span>{b.status}</span>
                            </span>
                          </td>

                          {/* Cột 7: Thao tác (Cân đối, chuẩn UI) */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => navigate(getBusinessDetailPath(b.id))}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
                                title="Xem chi tiết hồ sơ kinh doanh"
                              >
                                <Eye size={13} />
                                <span>Hồ sơ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(getBusinessEditPath(b.id))}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                title="Chỉnh sửa"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setBusinessToDelete(b)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                title="Xóa cơ sở"
                              >
                                <Trash2 size={13} />
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
          <Pagination
            id="business-pagination"
            currentPage={activePage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

      {/* Document Preview Modal (Sổ đỏ PDF / Ảnh) */}
      <BusinessSodoModal
        viewingDoc={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onReplaceFile={(targetBusiness, fileObj) => {
          const updated = { ...targetBusiness, soDoFile: fileObj };
          onUpdateBusinesses?.(businesses.map(item => (item.id === targetBusiness.id ? updated : item)));
          setViewingDoc(prev => (prev ? { ...prev, file: fileObj, business: updated } : null));
          showToast(`Đã cập nhật tệp Sổ đỏ: ${fileObj.name}`, "success");
        }}
      />

      {/* Delete Confirmation Dialog */}
      {businessToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Xác nhận xóa hộ kinh doanh</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa hộ kinh doanh <strong className="text-slate-800">{businessToDelete.name}</strong> (<span className="text-rose-700 font-semibold">{businessToDelete.licenseNumber}</span>) thuộc đại diện <strong className="text-slate-800">{businessToDelete.owner}</strong> ra khỏi danh sách quản lý địa phương không?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBusinessToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => executeDeleteBusiness(businessToDelete.id)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : toast.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-850"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              toast.type === "success" ? "bg-emerald-600" : toast.type === "warning" ? "bg-amber-600" : "bg-rose-600"
            }`}></span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
