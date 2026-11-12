import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Briefcase, 
  ShieldCheck, 
  ShieldAlert,
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Layers, 
  Plus, 
  AlertTriangle, 
  FileCheck, 
  X, 
  LayoutGrid, 
  List, 
  Camera, 
  Upload, 
  Trash2, 
  Pencil,
  Home,
  Building,
  Bed,
  Download,
  Printer,
  Eye,
  Check,
  Image as ImageIcon,
  Maximize2,
  FileSpreadsheet,
  ExternalLink,
  File,
  Paperclip,
  Info,
  Sparkles,
  ChevronRight,
  RefreshCw,
  PieChart,
  BarChart3,
  Utensils,
  Scissors,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Wrench,
  TrendingUp,
  Users,
  CheckCircle2,
  Store,
  Activity,
  ArrowUpDown,
  Building2,
  Globe,
  HelpCircle,
  History,
  UserCheck,
  CheckSquare,
  FileDown,
  Clock,
  ArrowRight,
  Share2,
  Mail,
  Users2,
  Landmark,
  DollarSign,
  AlertCircle,
  Navigation,
  Compass
} from "lucide-react";
import { Business, BusinessFile, InspectionLog, ForeignWorker, BusinessChangeLog, Resident, Household, TargetGisItem } from "../types";
import { 
  KP3_CENTER, 
  decimalToDMS, 
  parseCoordinates as parseGisCoords, 
  generateDefaultCoordinatesForAddress, 
  getGoogleMapsDirectionUrl 
} from "../utils/gisUtils";
import Pagination from "./Pagination";
import * as XLSX from "xlsx";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { formatVNNumber } from "../utils/numberFormat";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { 
  isResidentInAccommodation, 
  parseAccommodationInfo, 
  getTemporaryResidenceExpiryStatus,
  autoExtractHostelBusinesses,
  ParsedAccommodationInfo 
} from "../utils/householdRecognitionUtils";
import { supabase } from "../lib/supabase";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { KP3_AREA_LIST, extractKp3Area, isSmallBusinessOrHostel, formatShortRecordId } from "../utils/kp3Utils";
import { getBusinessCreatePath, getBusinessDetailPath, getBusinessEditPath, navigate } from "../routes";

export interface IndustrySectorDef {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  badgeClass: string;
  cardBg: string;
  borderClass: string;
  barColor: string;
  textColor: string;
  accentHex: string;
  description: string;
}

export const INDUSTRY_SECTORS: IndustrySectorDef[] = [
  {
    id: "Dịch vụ ăn uống",
    name: "Dịch vụ ăn uống",
    shortName: "Ẩm thực & Đồ uống",
    icon: "🍜",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    cardBg: "bg-amber-50/70 hover:bg-amber-50/90",
    borderClass: "border-amber-200",
    barColor: "bg-amber-500",
    textColor: "text-amber-800",
    accentHex: "#f59e0b",
    description: "Nhà hàng, quán ăn, cà phê, trà sữa, phở bò, điểm tâm"
  },
  {
    id: "Dịch vụ đời sống",
    name: "Dịch vụ đời sống",
    shortName: "Dịch vụ đời sống",
    icon: "✂️",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    cardBg: "bg-purple-50/70 hover:bg-purple-50/90",
    borderClass: "border-purple-200",
    barColor: "bg-purple-500",
    textColor: "text-purple-800",
    accentHex: "#a855f7",
    description: "Cắt tóc gội đầu, tiệm giặt ủi, spa thẩm mỹ, sửa xe máy, tiệm may"
  },
  {
    id: "Bán lẻ thương mại",
    name: "Bán lẻ thương mại",
    shortName: "Bán lẻ thương mại",
    icon: "🛒",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    cardBg: "bg-emerald-50/70 hover:bg-emerald-50/90",
    borderClass: "border-emerald-200",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-800",
    accentHex: "#10b981",
    description: "Cửa hàng tiện lợi 24/7, tạp hóa, siêu thị mini, shop thời trang"
  },
  {
    id: "Y tế / Chăm sóc sức khỏe",
    name: "Y tế / Chăm sóc sức khỏe",
    shortName: "Y tế & Sức khỏe",
    icon: "🏥",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    cardBg: "bg-rose-50/70 hover:bg-rose-50/90",
    borderClass: "border-rose-200",
    barColor: "bg-rose-500",
    textColor: "text-rose-800",
    accentHex: "#f43f5e",
    description: "Nhà thuốc GPP, phòng khám nha khoa, trạm y tế, phòng khám chuyên khoa"
  },
  {
    id: "Lưu trú & Cho thuê",
    name: "Lưu trú & Cho thuê",
    shortName: "Nhà trọ & Lưu trú",
    icon: "🏠",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    cardBg: "bg-blue-50/70 hover:bg-blue-50/90",
    borderClass: "border-blue-200",
    barColor: "bg-blue-500",
    textColor: "text-blue-800",
    accentHex: "#3b82f6",
    description: "Nhà trọ công nhân/sinh viên, nhà nghỉ, khách sạn, căn hộ mini"
  },
  {
    id: "Giáo dục & Đào tạo",
    name: "Giáo dục & Đào tạo",
    shortName: "Giáo dục & Đào tạo",
    icon: "🎓",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    cardBg: "bg-indigo-50/70 hover:bg-indigo-50/90",
    borderClass: "border-indigo-200",
    barColor: "bg-indigo-500",
    textColor: "text-indigo-800",
    accentHex: "#6366f1",
    description: "Lớp mầm non tư thục, trung tâm gia sư, bồi dưỡng ngoại ngữ, năng khiếu"
  },
  {
    id: "Cơ khí & Kỹ thuật số / Khác",
    name: "Cơ khí & Kỹ thuật số / Khác",
    shortName: "Kỹ thuật & Khác",
    icon: "🔧",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    cardBg: "bg-slate-50/70 hover:bg-slate-50/90",
    borderClass: "border-slate-200",
    barColor: "bg-slate-500",
    textColor: "text-slate-800",
    accentHex: "#64748b",
    description: "Sửa máy tính, điện thoại, điện lạnh, hàn cơ khí, quảng cáo, in ấn"
  }
];

export const getBusinessIndustryGroup = (b: Business): string => {
  if (b.industryGroup && b.industryGroup.trim()) {
    const ig = b.industryGroup.trim().toLowerCase();
    if (ig.includes("ăn uống") || ig.includes("đồ uống") || ig.includes("ẩm thực")) return "Dịch vụ ăn uống";
    if (ig.includes("đời sống")) return "Dịch vụ đời sống";
    if (ig.includes("bán lẻ") || ig.includes("thương mại")) return "Bán lẻ thương mại";
    if (ig.includes("y tế") || ig.includes("sức khỏe") || ig.includes("dược")) return "Y tế / Chăm sóc sức khỏe";
    if (ig.includes("lưu trú") || ig.includes("nhà trọ") || ig.includes("khách sạn") || ig.includes("nhà nghỉ")) return "Lưu trú & Cho thuê";
    if (ig.includes("giáo dục") || ig.includes("đào tạo")) return "Giáo dục & Đào tạo";
    if (ig.includes("cơ khí") || ig.includes("kỹ thuật") || ig.includes("khác")) return "Cơ khí & Kỹ thuật số / Khác";
    return b.industryGroup;
  }

  const typeLower = (b.type || "").toLowerCase();
  const nameLower = (b.name || "").toLowerCase();
  const combined = `${typeLower} ${nameLower}`;

  if (b.isAccommodation || combined.includes("nhà trọ") || combined.includes("nhà nghỉ") || combined.includes("khách sạn") || combined.includes("lưu trú") || combined.includes("homestay")) {
    return "Lưu trú & Cho thuê";
  }
  if (combined.includes("ăn uống") || combined.includes("cà phê") || combined.includes("cafe") || combined.includes("phở") || combined.includes("quán ăn") || combined.includes("nhà hàng") || combined.includes("trà sữa") || combined.includes("điểm tâm") || combined.includes("bánh")) {
    return "Dịch vụ ăn uống";
  }
  if (combined.includes("đời sống") || combined.includes("giặt ủi") || combined.includes("giặt") || combined.includes("tóc") || combined.includes("gội") || combined.includes("spa") || combined.includes("nail") || combined.includes("may") || combined.includes("sửa xe") || combined.includes("đồ da")) {
    return "Dịch vụ đời sống";
  }
  if (combined.includes("bán lẻ") || combined.includes("thương mại") || combined.includes("tiện lợi") || combined.includes("tạp hóa") || combined.includes("siêu thị") || combined.includes("shop") || combined.includes("cửa hàng")) {
    return "Bán lẻ thương mại";
  }
  if (combined.includes("y tế") || combined.includes("sức khỏe") || combined.includes("nha khoa") || combined.includes("thuốc") || combined.includes("dược") || combined.includes("phòng khám")) {
    return "Y tế / Chăm sóc sức khỏe";
  }
  if (combined.includes("giáo dục") || combined.includes("đào tạo") || combined.includes("mầm non") || combined.includes("gia sư") || combined.includes("học") || combined.includes("trường")) {
    return "Giáo dục & Đào tạo";
  }

  return "Cơ khí & Kỹ thuật số / Khác";
};

export const getSectorMeta = (groupName: string): IndustrySectorDef => {
  return INDUSTRY_SECTORS.find(s => s.id === groupName) || {
    id: groupName,
    name: groupName,
    shortName: groupName,
    icon: "💼",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    cardBg: "bg-slate-50/70 hover:bg-slate-50/90",
    borderClass: "border-slate-200",
    barColor: "bg-slate-500",
    textColor: "text-slate-800",
    accentHex: "#64748b",
    description: "Ngành nghề kinh doanh khác"
  };
};

// Helper to detect accommodation business (Nhà trọ, Nhà nghỉ, Khách sạn, Lưu trú)
export const isAccommodationBusiness = (b: Business): boolean => {
  if (b.isAccommodation) return true;
  const typeLower = (b.type || "").toLowerCase();
  const nameLower = (b.name || "").toLowerCase();
  return (
    typeLower.includes("nhà trọ") ||
    typeLower.includes("nhà nghỉ") ||
    typeLower.includes("khách sạn") ||
    typeLower.includes("homestay") ||
    typeLower.includes("lưu trú") ||
    nameLower.includes("nhà trọ") ||
    nameLower.includes("nhà nghỉ") ||
    nameLower.includes("khách sạn")
  );
};

export interface BusinessManagementProps {
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  onToggleCertification: (id: string) => void;
  onUpdateStatus: (id: string, status: "Đang hoạt động" | "Tạm ngưng" | "Chờ duyệt" | "Chuyển địa điểm" | "Chưa xác minh") => void;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onOpenDetail?: (business: Business) => void;
  onOpenCreate?: () => void;
  onOpenEdit?: (business: Business) => void;
}

export default function BusinessManagement({ 
  businesses, 
  residents = [],
  households = [],
  onToggleCertification, 
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis,
  onOpenDetail,
  onOpenCreate,
  onOpenEdit,
}: BusinessManagementProps) {
  // GIS Coordinate Pinning & Navigation Modal States
  const [gisPinModalBusiness, setGisPinModalBusiness] = useState<Business | null>(null);
  const [gisPinInput, setGisPinInput] = useState("");

  const handleDirections = (b: Business) => {
    let coords = b.coordinates;
    if (!coords || !parseGisCoords(coords)) {
      const autoGeo = generateDefaultCoordinatesForAddress(b.address, b.id);
      coords = autoGeo.dms;
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.map(item => item.id === b.id ? { ...item, coordinates: coords } : item));
      }
    }
    if (onNavigateToGis) {
      onNavigateToGis({
        id: b.id,
        type: "business",
        name: b.name,
        address: b.address,
        coordinates: coords,
        navigateRoute: true
      });
    }
  };

  const openPinModal = (b: Business) => {
    setGisPinModalBusiness(b);
    if (b.coordinates) {
      setGisPinInput(b.coordinates);
    } else {
      const auto = generateDefaultCoordinatesForAddress(b.address, b.id);
      setGisPinInput(auto.dms);
    }
  };

  const handleSavePinCoordinates = (andNavigate: boolean = false) => {
    if (!gisPinModalBusiness) return;
    const finalCoord = gisPinInput.trim();
    if (!finalCoord) {
      showToast("Vui lòng nhập hoặc lấy tọa độ GIS!", "warning");
      return;
    }

    const updated = { ...gisPinModalBusiness, coordinates: finalCoord };
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(item => item.id === updated.id ? updated : item));
    }
    setGisPinModalBusiness(null);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: updated.id,
        type: "business",
        name: updated.name,
        address: updated.address,
        coordinates: finalCoord,
        navigateRoute: true
      });
    } else {
      showToast(`Đã đồng bộ tọa độ ${updated.name} lên bản đồ GIS!`, "success");
    }
  };
  const [scopeFilter, setScopeFilter] = useState<"small" | "all">("small");
  const [establishmentFilter, setEstablishmentFilter] = useState<"all" | "household" | "accommodation" | "pccc-pass" | "pccc-fail" | "has-sodo">("all");
  const [pcccFilter, setPcccFilter] = useState<string>("Tất cả");
  const [streetFilter, setStreetFilter] = useState<string>("Tất cả");
  const [toFilter, setToFilter] = useState<string>("Tất cả");
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
    } catch (err: any) {
      showHostelToast(`Lỗi nhận diện cơ sở trọ: ${err.message}`, "error");
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
        const item: any = {
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

      const { error } = await (supabase as any)
        .from("businesses")
        .upsert(rows, { onConflict: "internal_code" });

      if (error) throw error;
      showHostelToast(`Đã lưu vĩnh viễn ${hostelsToSync.length} cơ sở lưu trú vào CSDL Supabase!`, "success");
    } catch (err: any) {
      showHostelToast(`Lỗi đồng bộ Supabase: ${err.message}`, "error");
    } finally {
      setIsSyncingHostels(false);
    }
  };

  // Navigate to dedicated detail / create / edit route pages
  const handleOpenDetailModal = (b: Business) => {
    if (onOpenDetail) onOpenDetail(b);
    else navigate(getBusinessDetailPath(b.id));
  };

  const handleOpenCreateModal = () => {
    if (onOpenCreate) onOpenCreate();
    else navigate(getBusinessCreatePath());
  };

  const handleOpenEditModal = (b: Business) => {
    if (onOpenEdit) onOpenEdit(b);
    else navigate(getBusinessEditPath(b.id));
  };

  // Auto-switch view on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setViewMode("card");
    }
  }, []);

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

  // Document Viewer & Lightbox states
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    businessName: string;
    file: BusinessFile;
    business: Business;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Download attached file
  const handleDownloadFile = (fileObj: BusinessFile) => {
    const link = document.createElement("a");
    link.href = fileObj.url;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đang tải tệp: ${fileObj.name}`, "success");
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

  // Industry Sector Statistics UI states - mặc định luôn hiển thị ở trạng thái thu gọn
  const [showIndustryStats, setShowIndustryStats] = useState(false);


  // Filtered Businesses Logic with Standardized Industry Sector Classifier & Scope Filter
  const smallBusinessCount = React.useMemo(() => businesses.filter(isSmallBusinessOrHostel).length, [businesses]);

  const filteredBusinesses = businesses.filter(b => {
    if (scopeFilter === "small" && !isSmallBusinessOrHostel(b)) {
      return false;
    }

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

    const matchesTo = toFilter === "Tất cả" || extractKp3Area(b.address) === toFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesEstablishmentFilter && matchesPccc && matchesStreet && matchesTo;
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

  const dominantSector = React.useMemo(() => {
    return [...sectorStats].sort((a, b) => b.count - a.count)[0] || sectorStats[0];
  }, [sectorStats]);

  // Analytics & Statistics for Local Establishments
  const totalAccomCount = businesses.filter(b => isAccommodationBusiness(b)).length;
  const totalRooms = businesses.reduce((acc, b) => acc + (b.soPhong || 0), 0);
  const totalSoDoFiles = businesses.filter(b => Boolean(b.soDoFile)).length;
  const totalCertifiedPccc = businesses.filter(b => b.safetyCertified).length;
  const totalLocalWorkers = businesses.reduce((acc, b) => acc + (b.localWorkersCount ?? Math.floor(b.employeeCount / 2)), 0);
  const totalTempWorkers = businesses.reduce((acc, b) => acc + (b.temporaryWorkersCount ?? Math.ceil(b.employeeCount / 2)), 0);
  const totalForeignWorkers = businesses.reduce((acc, b) => acc + (b.foreignWorkersCount || (b.foreignWorkers?.length || 0)), 0);
  const totalSupportNeeds = businesses.filter(b => (b.supportNeeds && b.supportNeeds.length > 0) || Boolean(b.supportNotes)).length;

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
        <div className="fixed top-5 right-5 z-50 max-w-sm animate-in fade-in slide-in-from-top-3 duration-200">
          <InlineNotice
            message={hostelToast.message}
            type={hostelToast.type}
            onDismiss={() => setHostelToast(null)}
          />
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
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
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

      {/* Scope & Filters bar - Flat Hairline */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setScopeFilter("small");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                scopeFilter === "small"
                  ? "bg-white text-indigo-800 border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store size={14} className={scopeFilter === "small" ? "text-indigo-600" : "text-slate-500"} />
              <span>Hộ KD & Nhà trọ (Mặc định)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                scopeFilter === "small" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-700"
              }`}>
                {formatVNNumber(smallBusinessCount)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScopeFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                scopeFilter === "all"
                  ? "bg-white text-indigo-800 border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase size={14} className={scopeFilter === "all" ? "text-indigo-600" : "text-slate-500"} />
              <span>Tất cả cơ sở địa bàn</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                scopeFilter === "all" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-700"
              }`}>
                {formatVNNumber(businesses.length)}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === "card" 
                  ? "bg-white text-indigo-700 border border-slate-200" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Xem dạng Lưới Thẻ"
              aria-label="Xem dạng Lưới Thẻ"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === "table" 
                  ? "bg-white text-indigo-700 border border-slate-200" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Xem dạng Bảng Danh Sách"
              aria-label="Xem dạng Bảng Danh Sách"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              id="business-search-input"
              name="businessSearchTerm"
              aria-label="Tìm kiếm cơ sở kinh doanh"
              type="text" 
              placeholder="Tìm theo tên cơ sở, chủ hộ, số GPKD, địa chỉ, ngành nghề, Tờ BĐ, số Thửa..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Category Filter */}
            <ReportSelect
              aria-label="Nhóm ngành nghề"
              value={categoryFilter}
              onChange={(nextVal) => handleCategoryFilterChange(nextVal)}
              options={[
                { value: "Tất cả", label: `Tất cả ngành (${formatVNNumber(businesses.length)})` },
                ...INDUSTRY_SECTORS.map((sec) => {
                  const count = sectorStats.find(s => s.id === sec.id)?.count || 0;
                  return { value: sec.id, label: `${sec.icon} ${sec.shortName} (${formatVNNumber(count)})` };
                }),
              ]}
              className="w-full lg:min-w-[155px]"
            />

            {/* PCCC Filter */}
            <ReportSelect
              aria-label="Điều kiện PCCC"
              value={pcccFilter}
              onChange={(nextVal) => { setPcccFilter(nextVal); setCurrentPage(1); }}
              options={[
                { value: "Tất cả", label: "Tất cả PCCC" },
                { value: "Đạt chuẩn", label: "Đạt chuẩn an toàn PCCC" },
                { value: "Chưa đạt", label: "Chưa đạt / Cần nhắc nhở" },
              ]}
              className="w-full"
            />

            {/* Street Filter */}
            <ReportSelect
              aria-label="Tuyến đường"
              value={streetFilter}
              onChange={(nextVal) => { setStreetFilter(nextVal); setCurrentPage(1); }}
              options={[
                { value: "Tất cả", label: "Tất cả tuyến đường" },
                { value: "Mặt tiền Lương Định Của", label: "Mặt tiền Lương Định Của" },
                { value: "Hẻm 42 Lương Định Của", label: "Hẻm 42 Lương Định Của" },
                { value: "Hẻm 18 Lương Định Của", label: "Hẻm 18 Lương Định Của" },
              ]}
              className="w-full"
            />

            {/* Khu vuc KP3 Filter */}
            <ReportSelect
              aria-label="Tuyến đường / khu vực KP3"
              value={toFilter}
              onChange={(nextVal) => { setToFilter(nextVal); setCurrentPage(1); }}
              options={[
                { value: "Tất cả", label: "Toàn Khu phố 3" },
                ...KP3_AREA_LIST.map((area) => ({ value: area, label: area })),
              ]}
              className="w-full"
            />

            {/* Status Filter */}
            <ReportSelect
              aria-label="Trạng thái hoạt động"
              value={statusFilter}
              onChange={(nextVal) => handleStatusFilterChange(nextVal)}
              options={[
                { value: "Tất cả", label: "Tất cả trạng thái" },
                { value: "Đang hoạt động", label: "Đang hoạt động" },
                { value: "Tạm ngưng", label: "Tạm ngưng" },
                { value: "Chờ duyệt", label: "Chờ duyệt" },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Container: Toàn bộ chiều rộng cho danh sách Cơ sở Kinh doanh */}
      <div className="w-full space-y-4">
        {/* Banner Tự động liên kết Nhà trọ từ dữ liệu Dân cư */}
        {establishmentFilter === "accommodation" && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                <Sparkles size={20} className="text-amber-700" />
              </div>
              <div>
                <div className="font-bold text-amber-950 text-sm flex flex-wrap items-center gap-2">
                  <span>Hệ thống đã tự động nhận diện {totalAccomCount} cơ sở nhà trọ & lưu trú từ 11.632 cư dân</span>
                  <span className="text-xs bg-amber-200 text-amber-950 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                    Đối soát CSDL thực tế
                  </span>
                </div>
                <div className="text-amber-900 text-xs mt-0.5">
                  Tất cả các cơ sở trọ được trích xuất tự động từ địa chỉ tạm trú, nhận diện tên chủ trọ, số điện thoại, quy mô phòng và số người lưu trú thực tế.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAutoDetectHostels}
                disabled={isDetectingHostels}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Quét lại toàn bộ 11.632 cư dân để bổ sung thêm cơ sở trọ mới"
              >
                <RefreshCw size={13} className={isDetectingHostels ? "animate-spin" : ""} />
                <span>Quét lại cư dân</span>
              </button>
              <button
                type="button"
                onClick={handleSyncHostelsToSupabase}
                disabled={isSyncingHostels}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
                const statusColors = {
                  "Đang hoạt động": "bg-emerald-50 text-emerald-800 border-emerald-200",
                  "Tạm ngưng": "bg-rose-50 text-rose-800 border-rose-200",
                  "Chờ duyệt": "bg-amber-50 text-amber-800 border-amber-200"
                };
                const isSelected = false;
                const isAccom = isAccommodationBusiness(b);
                const sectorGroup = getBusinessIndustryGroup(b);
                const sectorMeta = getSectorMeta(sectorGroup);

                return (
                  <div 
                    key={b.id}
                    id={`business-card-${b.id}`}
                    onClick={() => handleOpenDetailModal(b)}
                    className={`group bg-white rounded-2xl border p-4 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between relative
                      ${isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"}
                    `}
                  >
                    <div className="space-y-3">
                      {/* 1. Header Badges: Category & Status */}
                      <div className="flex flex-wrap justify-between items-center gap-1.5 min-w-0">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 min-w-0 max-w-full ${sectorMeta.badgeClass}`}>
                          <span>{sectorMeta.icon}</span>
                          <span className="truncate">{sectorMeta.shortName}</span>
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0 ${statusColors[b.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${b.status === "Đang hoạt động" ? "bg-emerald-600" : b.status === "Tạm ngưng" ? "bg-rose-600" : "bg-amber-600"}`} />
                          <span>{b.status}</span>
                        </span>
                      </div>

                      {/* 2. Image Thumbnail */}
                      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img 
                          src={b.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500"} 
                          alt={b.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500";
                          }}
                        />
                        
                        {/* Giấy phép kinh doanh đặt góc trên phải ảnh */}
                        <div className="absolute top-2 right-2">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white/95 text-slate-800 border border-slate-200">
                            {b.licenseNumber || b.internalCode || "KP3-KD"}
                          </span>
                        </div>

                        {/* Huy hiệu cơ sở lưu trú ở góc dưới trái ảnh */}
                        {isAccom && (
                          <div className="absolute bottom-2 left-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50/95 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Building size={11} className="text-amber-700" /> Cơ sở lưu trú
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 3. Tên cơ sở kinh doanh đặt ra ngoài ảnh */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1" title={b.name}>
                          {b.name}
                        </h3>
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                          <MapPin size={12} className="shrink-0 text-slate-500" />
                          <span className="line-clamp-1 text-slate-600 font-medium" title={b.address}>
                            {b.address}
                          </span>
                        </div>
                      </div>

                      {/* 4. Khối thông tin lưu trú / phòng trọ */}
                      {isAccom && (() => {
                        const staying = residents.filter(r => isResidentInAccommodation(r, b));
                        const actualCount = staying.length > 0 ? staying.length : (b.soNguoiLuuTru || 0);
                        return (
                          <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              <Bed size={14} className="text-amber-800 shrink-0" />
                              <span>{b.soPhong || 0} phòng</span>
                              <span className="text-amber-800">•</span>
                              <span>{b.soTang || 0} tầng</span>
                            </div>
                            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0">
                              {actualCount} người
                            </span>
                          </div>
                        );
                      })()}

                      {/* 5. Địa chính & Thửa đất */}
                      <div className="bg-slate-50 py-2 px-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700 font-bold">
                          <span className="text-slate-600 font-sans font-normal text-xs">ĐC:</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                            Tờ {b.toBanDo || "—"}, Thửa {b.soThua || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 text-xs">
                          <span>{b.dienTich ? `${b.dienTich} m²` : "—"}</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {b.loaiDat || "ODT"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 6. Footer: Chủ hộ + Nút Sổ đỏ + PCCC */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                          {b.owner ? b.owner.charAt(0) : "U"}
                        </div>
                        <span className="font-semibold text-slate-800 text-xs leading-snug" title={b.owner}>
                          {b.owner}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {b.soDoFile ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingDoc({
                                title: "Hồ sơ Giấy chứng nhận QSDĐ (Sổ đỏ)",
                                businessName: b.name,
                                file: b.soDoFile!,
                                business: b
                              });
                            }}
                            className={`min-h-[32px] text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                              b.soDoFile.type === "pdf" 
                                ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100" 
                                : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                            }`}
                            title="Nhấp để xem tệp Sổ đỏ"
                          >
                            <FileText size={11} />
                            <span>Sổ đỏ</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 italic">
                            Chưa sổ
                          </span>
                        )}

                        {b.safetyCertified && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-bold text-xs whitespace-nowrap">
                            <ShieldCheck size={11} className="text-emerald-700" /> PCCC
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
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
                      const isSelected = false;
                      const isAccom = isAccommodationBusiness(b);
                      const sectorGroup = getBusinessIndustryGroup(b);
                      const sectorMeta = getSectorMeta(sectorGroup);
                      return (
                        <tr 
                          key={b.id}
                          onClick={() => handleOpenDetailModal(b)}
                          className={`hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                            isSelected ? "bg-indigo-50/70 font-medium" : ""
                          }`}
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
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sectorMeta.badgeClass}`}>
                                    <span>{sectorMeta.icon}</span>
                                    <span>{sectorMeta.shortName}</span>
                                  </span>
                                  <span className="font-mono text-slate-600 font-semibold text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{b.licenseNumber}</span>
                                  <span className="text-xs text-slate-600">• {b.type}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 2: Chủ sở hữu & Liên hệ */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              <User size={13} className="text-slate-500" />
                              <span>{b.owner}</span>
                            </div>
                            <div className="text-xs text-slate-600 font-mono flex items-center gap-1.5 mt-0.5">
                              <Phone size={12} className="text-slate-500" />
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
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full text-xs border border-amber-200">
                                    <Building size={11} className="text-amber-700" /> {b.soPhong || 0} phòng / {b.soTang || 0} tầng
                                  </span>
                                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                    <span>{actualCount} người</span>
                                    {staying.length > 0 ? (
                                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        CSDL
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-500 font-normal">lưu trú</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })() : (
                              <span className="text-slate-600 text-xs italic bg-slate-50 px-2 py-0.5 rounded">Không lưu trú</span>
                            )}
                          </td>

                          {/* Cột 4: Địa chính / Thửa đất */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="text-xs font-mono text-slate-800 font-bold">
                              Tờ {b.toBanDo || "—"} • Thửa {b.soThua || "—"}
                            </div>
                            <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                              <span>{b.dienTich ? `${b.dienTich} m²` : "—"}</span>
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {b.loaiDat || "ODT"}
                              </span>
                            </div>
                          </td>

                          {/* Cột 5: Sổ đỏ & PCCC */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              {b.soDoFile ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingDoc({
                                      title: "Hồ sơ Giấy chứng nhận QSDĐ (Sổ đỏ)",
                                      businessName: b.name,
                                      file: b.soDoFile!,
                                      business: b
                                    });
                                  }}
                                  className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                                    b.soDoFile.type === "pdf"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                      : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                  }`}
                                >
                                  <FileText size={11} /> Sổ đỏ ({b.soDoFile.type.toUpperCase()})
                                </button>
                              ) : (
                                <span className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 italic">
                                  Chưa nộp sổ
                                </span>
                              )}

                              {b.safetyCertified && (
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <ShieldCheck size={11} className="text-emerald-600" /> PCCC đạt
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cột 6: Trạng thái */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                              b.status === "Đang hoạt động" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              b.status === "Tạm ngưng" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${b.status === "Đang hoạt động" ? "bg-emerald-500" : b.status === "Tạm ngưng" ? "bg-rose-500" : "bg-amber-500"}`} />
                              <span>{b.status}</span>
                            </span>
                          </td>

                          {/* Cột 7: Thao tác (Cân đối, chuẩn UI) */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(b)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
                                title="Xem chi tiết hồ sơ kinh doanh"
                              >
                                <Eye size={13} />
                                <span>Hồ sơ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(b)}
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

      {/* DOCUMENT PREVIEW MODAL (SỔ ĐỎ PDF / ẢNH) */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-4 px-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  viewingDoc.file.type === "pdf" ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                }`}>
                  {viewingDoc.file.type === "pdf" ? <FileText size={20} /> : <ImageIcon size={20} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 truncate">
                    {viewingDoc.title}
                    <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-300">
                      {viewingDoc.file.type}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 truncate">
                    Cơ sở: <strong>{viewingDoc.businessName}</strong> • Chủ hộ: <strong>{viewingDoc.business.owner}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDoc.file)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Tải về tệp này"
                >
                  <Download size={13} /> Tải tệp về
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="In văn bản"
                >
                  <Printer size={13} /> In
                </button>
                <button 
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Cadastral Info Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <span>Tờ BĐ: <strong className="font-mono text-indigo-700">{viewingDoc.business.toBanDo || "272"}</strong></span>
                <span>Thửa đất: <strong className="font-mono text-indigo-700">{viewingDoc.business.soThua || "55"}</strong></span>
                <span>Diện tích: <strong>{viewingDoc.business.dienTich ? `${viewingDoc.business.dienTich} m²` : "150 m²"}</strong></span>
                <span>Loại đất: <strong className="text-emerald-700">{viewingDoc.business.loaiDat || "ODT"}</strong></span>
                <span>Số GCN: <strong className="font-mono text-rose-700">{viewingDoc.business.soGcn || "CH-098234"}</strong></span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Tệp: {viewingDoc.file.name} ({viewingDoc.file.size || "520 KB"})
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {viewingDoc.file.type === "image" ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 max-w-full">
                    <img 
                      src={viewingDoc.file.url} 
                      alt={viewingDoc.file.name}
                      className="max-h-[540px] w-auto object-contain rounded-lg mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900";
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">Bản chụp Giấy chứng nhận quyền sử dụng đất & Sổ đỏ</span>
                </div>
              ) : (
                /* PDF Viewer */
                <div className="space-y-4">
                  {viewingDoc.file.url.startsWith("data:application/pdf") ? (
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                      <iframe 
                        src={viewingDoc.file.url} 
                        title={viewingDoc.file.name} 
                        className="w-full h-[540px]"
                      />
                    </div>
                  ) : (
                    /* Official Authentic Vietnamese Land Use Certificate Layout */
                    <div className="bg-[#fffdf9] p-8 md:p-10 rounded-2xl shadow-md border-2 border-amber-600/40 max-w-2xl mx-auto space-y-6 text-slate-800 font-serif relative overflow-hidden">
                      {/* Decorative border line */}
                      <div className="absolute inset-1 border border-amber-500/20 pointer-events-none rounded-xl"></div>
                      
                      {/* Header */}
                      <div className="text-center space-y-1 font-sans border-b border-amber-200/80 pb-4">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div className="font-bold text-xs text-slate-700 underline decoration-1 underline-offset-4">Độc lập - Tự do - Hạnh phúc</div>
                        <div className="text-[10px] text-amber-900 font-bold tracking-widest pt-2 uppercase">BỘ TÀI NGUYÊN VÀ MÔI TRƯỜNG</div>
                        <h2 className="text-lg font-black text-rose-800 pt-1 tracking-tight font-serif uppercase">
                          GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT
                        </h2>
                        <h3 className="text-xs font-bold text-rose-700 uppercase">
                          QUYỀN SỞ HỮU NHÀ Ở VÀ TÀI SẢN KHÁC GẮN LIỀN VỚI ĐẤT
                        </h3>
                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          Số phát hành: <strong className="text-rose-700 font-mono">{viewingDoc.business.soGcn || "CH-098234"}</strong> • Số vào sổ: {viewingDoc.business.soVaoSo || "CS-2023-112"}
                        </div>
                      </div>

                      {/* Section I */}
                      <div className="space-y-1.5 text-xs">
                        <h4 className="font-bold text-slate-900 font-sans uppercase text-[11px] text-amber-900">
                          I. Người sử dụng đất, chủ sở hữu nhà ở và tài sản khác gắn liền với đất:
                        </h4>
                        <div className="pl-3 space-y-1 text-slate-700">
                          <p>Ông/Bà: <strong className="text-slate-900">{viewingDoc.business.tenChuSuDung || viewingDoc.business.owner}</strong></p>
                          <p>Địa chỉ thường trú: <strong>{viewingDoc.business.address}</strong></p>
                        </div>
                      </div>

                      {/* Section II */}
                      <div className="space-y-1.5 text-xs">
                        <h4 className="font-bold text-slate-900 font-sans uppercase text-[11px] text-amber-900">
                          II. Thửa đất, nhà ở và tài sản khác gắn liền với đất:
                        </h4>
                        <div className="pl-3 space-y-1 text-slate-700">
                          <div className="grid grid-cols-2 gap-2">
                            <p>1. Thửa đất số: <strong className="font-mono text-slate-900">{viewingDoc.business.soThua || "55"}</strong></p>
                            <p>2. Tờ bản đồ số: <strong className="font-mono text-slate-900">{viewingDoc.business.toBanDo || "272"}</strong></p>
                          </div>
                          <p>3. Địa chỉ thửa đất: <strong>{viewingDoc.business.address}</strong></p>
                          <div className="grid grid-cols-2 gap-2">
                            <p>4. Diện tích: <strong className="text-slate-900">{viewingDoc.business.dienTich ? `${viewingDoc.business.dienTich} m²` : "150 m²"}</strong></p>
                            <p>5. Hình thức sử dụng: <strong>Sử dụng riêng</strong></p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p>6. Mục đích sử dụng: <strong className="text-emerald-800">{viewingDoc.business.loaiDat || "Đất ở tại đô thị (ODT)"}</strong></p>
                            <p>7. Thời hạn sử dụng: <strong>Lâu dài</strong></p>
                          </div>
                          <p>8. Nguồn gốc sử dụng: <strong>Nhà nước công nhận quyền sử dụng đất có thu tiền sử dụng đất</strong></p>
                        </div>
                      </div>

                      {/* Accommodation Annex (Nếu là Nhà trọ) */}
                      {isAccommodationBusiness(viewingDoc.business) && (
                        <div className="space-y-1 text-xs bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                          <h4 className="font-bold text-amber-900 font-sans uppercase text-[10px]">
                            III. Tài sản gắn liền với đất (Công trình Nhà trọ / Lưu trú):
                          </h4>
                          <p className="text-[11px] text-slate-700 pl-2">
                            Công trình xây dựng: Nhà ở kết hợp cho thuê trọ • Kết cấu bê tông cốt thép • <strong>{viewingDoc.business.soTang || 3} tầng</strong> • Quy mô <strong>{viewingDoc.business.soPhong || 12} phòng lưu trú</strong>.
                          </p>
                        </div>
                      )}

                      {/* Signatures & Seal */}
                      <div className="pt-4 border-t border-amber-200 flex justify-between items-end text-xs font-sans">
                        <div className="text-center space-y-1">
                          <span className="text-[10px] text-slate-400 block">Trích lục số hóa bởi</span>
                          <span className="font-bold text-slate-700 text-[11px]">Văn phòng Đăng ký Đất đai</span>
                          <div className="text-emerald-700 font-bold text-[10px]">✓ ĐÃ XÁC THỰC CƠ SỞ DỮ LIỆU ĐỊA CHÍNH</div>
                        </div>

                        <div className="text-center space-y-1">
                          <span className="text-[10px] text-slate-500 italic block">TP. Hồ Chí Minh, ngày 15 tháng 04 năm 2023</span>
                          <span className="font-bold text-slate-900 uppercase text-[11px] block">TM. ỦY BAN NHÂN DÂN</span>
                          <span className="text-[10px] font-bold text-slate-700 block">KT. CHỦ TỊCH - PHÓ CHỦ TỊCH</span>
                          <div className="pt-6">
                            <span className="font-black text-rose-800 uppercase tracking-wider text-xs border border-rose-300 px-3 py-1 rounded bg-rose-50">
                              (ĐÃ KÝ VÀ ĐÓNG DẤU ĐỎ)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(businessToDelete)}
        onClose={() => setBusinessToDelete(null)}
        onConfirm={() => businessToDelete && executeDeleteBusiness(businessToDelete.id)}
        title="Xác nhận xóa hộ kinh doanh"
        description={businessToDelete ? `Bạn có chắc chắn muốn xóa hộ kinh doanh "${businessToDelete.name}" (${businessToDelete.licenseNumber}) thuộc đại diện ${businessToDelete.owner} ra khỏi danh sách quản lý địa phương không?` : ""}
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />

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
    </div>
  );
}
