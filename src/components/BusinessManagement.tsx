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

interface BusinessManagementProps {
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  onToggleCertification: (id: string) => void;
  onUpdateStatus: (id: string, status: "Đang hoạt động" | "Tạm ngưng" | "Chờ duyệt" | "Chuyển địa điểm" | "Chưa xác minh") => void;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
}

export default function BusinessManagement({ 
  businesses, 
  residents = [],
  households = [],
  onToggleCertification, 
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis
}: BusinessManagementProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // GIS Coordinate Pinning & Navigation Modal States
  const [gisPinModalBusiness, setGisPinModalBusiness] = useState<Business | null>(null);
  const [gisPinInput, setGisPinInput] = useState("");
  const [gisPinToast, setGisPinToast] = useState<string | null>(null);

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
      alert("Vui lòng nhập hoặc lấy tọa độ GIS!");
      return;
    }

    const updated = { ...gisPinModalBusiness, coordinates: finalCoord };
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(item => item.id === updated.id ? updated : item));
    }
    if (selectedBusiness && selectedBusiness.id === updated.id) {
      setSelectedBusiness(updated);
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
      setGisPinToast(`Đã đồng bộ tọa độ ${updated.name} lên bản đồ GIS!`);
      setTimeout(() => setGisPinToast(null), 3500);
    }
  };
  const [establishmentFilter, setEstablishmentFilter] = useState<"all" | "household" | "accommodation" | "pccc-pass" | "pccc-fail" | "has-sodo">("all");
  const [pcccFilter, setPcccFilter] = useState<string>("Tất cả");
  const [streetFilter, setStreetFilter] = useState<string>("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [categoryFilter, setCategoryFilter] = useState<string>("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const itemsPerPage = 8;

  // Open and close detail modal
  const handleOpenDetailModal = (b: Business) => {
    setSelectedBusiness(b);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
  };

  // Close detail modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showDetailModal) {
        setShowDetailModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDetailModal]);

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

  // Helper to detect accommodation business (Nhà trọ, Nhà nghỉ, Khách sạn, Lưu trú)
  const isAccommodationBusiness = (b: Business): boolean => {
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

  const getLinkedHousehold = (b: Business): Household | undefined => {
    if (b.linkedHouseholdCode) {
      const found = households.find(h => h.code.toLowerCase() === b.linkedHouseholdCode?.toLowerCase());
      if (found) return found;
    }
    if (b.address) {
      const found = households.find(h => b.address.toLowerCase().includes(h.address.toLowerCase()) || h.address.toLowerCase().includes(b.address.toLowerCase()));
      if (found) return found;
    }
    return undefined;
  };

  const getLinkedForeignResidents = (b: Business): Resident[] => {
    return (residents || []).filter(r => {
      const isForeign = r.nationality && r.nationality !== "Việt Nam";
      if (!isForeign) return false;
      if (r.workplace && b.name && r.workplace.toLowerCase().includes(b.name.toLowerCase())) return true;
      if (b.linkedHouseholdCode && r.householdId === b.linkedHouseholdCode) return true;
      return false;
    });
  };

  // Change Log States & Handlers
  const [showAddChangeLogModal, setShowAddChangeLogModal] = useState(false);
  const [formChangeDate, setFormChangeDate] = useState("");
  const [formChangeType, setFormChangeType] = useState<"Mở mới" | "Chuyển địa điểm" | "Thay đổi ngành nghề" | "Thay đổi người đại diện" | "Tạm ngừng" | "Hoạt động trở lại" | "Khác">("Thay đổi ngành nghề");
  const [formChangeDesc, setFormChangeDesc] = useState("");
  const [formChangeRecordedBy, setFormChangeRecordedBy] = useState("Bí thư Chi bộ / Trưởng KP3");

  const handleOpenAddChangeLog = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormChangeDate(today);
    setFormChangeType("Thay đổi ngành nghề");
    setFormChangeDesc("");
    setFormChangeRecordedBy("Bí thư Chi bộ / Trưởng KP3");
    setShowAddChangeLogModal(true);
  };

  const handleSaveChangeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    if (!formChangeDesc.trim()) {
      showToast("Vui lòng nhập nội dung biến động!", "warning");
      return;
    }

    const [yyyy, mm, dd] = formChangeDate.includes("-") 
      ? formChangeDate.split("-") 
      : ["2026", "10", "10"];
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    const newLog: BusinessChangeLog = {
      id: `CHG-${selectedBusiness.id}-${Date.now().toString().slice(-4)}`,
      date: formattedDate,
      type: formChangeType,
      description: formChangeDesc.trim(),
      recordedBy: formChangeRecordedBy.trim() || "Ban Điều hành KP3"
    };

    const updatedLogs = [newLog, ...(selectedBusiness.changeHistory || [])];
    const updatedBusiness: Business = {
      ...selectedBusiness,
      changeHistory: updatedLogs
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updatedBusiness : b));
    }
    setSelectedBusiness(updatedBusiness);
    setShowAddChangeLogModal(false);
    showToast("Đã ghi nhận biến động cơ sở kinh doanh thành công!", "success");
  };

  // Coordinate editing state
  const [isEditingCoordinates, setIsEditingCoordinates] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Document Viewer & Lightbox states
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    businessName: string;
    file: BusinessFile;
    business: Business;
  } | null>(null);

  const [viewingImagePreview, setViewingImagePreview] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  // Form states for register business
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newIndustryGroup, setNewIndustryGroup] = useState("Dịch vụ ăn uống");
  const [newOwner, setNewOwner] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("42 Lương Định Của, Phường An Phú");
  const [newEmployeeCount, setNewEmployeeCount] = useState(3);
  const [newCoordinates, setNewCoordinates] = useState("10°56'07.5\"N 106°44'38.0\"E");
  const [newImage, setNewImage] = useState<string>("");
  const [newAdditionalImages, setNewAdditionalImages] = useState<string[]>([]);

  // Accommodation fields (Nhà trọ, Nhà nghỉ...)
  const [newIsAccommodation, setNewIsAccommodation] = useState(false);
  const [newSoPhong, setNewSoPhong] = useState<number | string>(12);
  const [newSoTang, setNewSoTang] = useState<number | string>(3);
  const [newSoNguoiLuuTru, setNewSoNguoiLuuTru] = useState<number | string>(20);
  const [newGiaThueTrungBinh, setNewGiaThueTrungBinh] = useState("2.5 - 3.5 triệu/tháng");

  // Cadastral & Land Use fields (Địa chính & Sổ đỏ)
  const [newToBanDo, setNewToBanDo] = useState("272");
  const [newSoThua, setNewSoThua] = useState("55");
  const [newDienTich, setNewDienTich] = useState<number | string>("150");
  const [newLoaiDat, setNewLoaiDat] = useState("ODT");
  const [newTenChuSuDung, setNewTenChuSuDung] = useState("");
  const [newSoGcn, setNewSoGcn] = useState("");
  const [newSoVaoSo, setNewSoVaoSo] = useState("");
  const [newSoDoFile, setNewSoDoFile] = useState<BusinessFile | null>(null);
  const [newGiayPhepFile, setNewGiayPhepFile] = useState<BusinessFile | null>(null);
  const [newPcccFile, setNewPcccFile] = useState<BusinessFile | null>(null);

  // SME Fields for Add Business Modal
  const [newInternalCode, setNewInternalCode] = useState("");
  const [newTaxCode, setNewTaxCode] = useState("");
  const [newBusinessType, setNewBusinessType] = useState<"Công ty TNHH" | "Công ty Cổ phần" | "Doanh nghiệp tư nhân" | "Hộ kinh doanh" | "Cơ sở kinh doanh khác">("Công ty TNHH");
  const [newEnterpriseScale, setNewEnterpriseScale] = useState<"Siêu nhỏ (< 5 LĐ)" | "Nhỏ (5 - 20 LĐ)" | "Vừa (20 - 50 LĐ)" | "Lớn (> 50 LĐ)">("Nhỏ (5 - 20 LĐ)");
  const [newStartDate, setNewStartDate] = useState("01/01/2024");
  const [newVerificationSource, setNewVerificationSource] = useState("Khảo sát Tổ dân phố & Ban Điều hành KP3");
  const [newStreetArea, setNewStreetArea] = useState("Mặt tiền Lương Định Của");
  const [newPremisesType, setNewPremisesType] = useState<"Nhà phố" | "Văn phòng" | "Cửa hàng" | "Nhà xưởng" | "Ki-ốt" | "Địa điểm thuê" | "Chung cư / Căn hộ">("Cửa hàng");
  const [newPremisesOwner, setNewPremisesOwner] = useState("");
  const [newPremisesOwnerPhone, setNewPremisesOwnerPhone] = useState("");
  const [newLinkedHouseholdCode, setNewLinkedHouseholdCode] = useState("");
  const [newLinkedBuildingOrHostel, setNewLinkedBuildingOrHostel] = useState("");
  const [newLegalRep, setNewLegalRep] = useState("");
  const [newLegalRepPhone, setNewLegalRepPhone] = useState("");
  const [newLegalRepCccd, setNewLegalRepCccd] = useState("");
  const [newLegalRepEmail, setNewLegalRepEmail] = useState("");
  const [newSiteManager, setNewSiteManager] = useState("");
  const [newSiteManagerPhone, setNewSiteManagerPhone] = useState("");
  const [newFocalPointName, setNewFocalPointName] = useState("");
  const [newFocalPointPhone, setNewFocalPointPhone] = useState("");
  const [newFocalPointRole, setNewFocalPointRole] = useState("Chủ cơ sở / Quản lý");
  const [newLocalWorkers, setNewLocalWorkers] = useState(2);
  const [newTemporaryWorkers, setNewTemporaryWorkers] = useState(2);
  const [newForeignWorkersCount, setNewForeignWorkersCount] = useState(0);
  const [newSupportNeeds, setNewSupportNeeds] = useState<string[]>([]);
  const [newSupportNotes, setNewSupportNotes] = useState("");

  // Drag-and-drop States
  const [dragActiveDetail, setDragActiveDetail] = useState(false);
  const [dragActiveModal, setDragActiveModal] = useState(false);
  const [dragActiveSoDoModal, setDragActiveSoDoModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper to process any file (PDF or Image)
  const handleProcessFileUpload = (
    file: File,
    onSuccess: (fileObj: BusinessFile) => void
  ) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      showToast("Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!", "error");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast("Dung lượng tệp tối đa cho phép là 25MB!", "error");
      return;
    }

    const formattedSize = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      onSuccess({
        name: file.name,
        url: reader.result as string,
        type: isPdf ? "pdf" : "image",
        size: formattedSize,
        uploadDate: new Date().toLocaleDateString("vi-VN")
      });
      showToast(`Đã nhận tệp: ${file.name} (${formattedSize})`, "success");
    };
    reader.onerror = () => {
      showToast("Không thể đọc tệp tin đã chọn!", "error");
    };
    reader.readAsDataURL(file);
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
      setSelectedBusiness(remaining[0] || null);
    } else {
      showToast("Lỗi hệ thống: Không thể kết nối với cơ sở dữ liệu!", "error");
    }
  };

  // Edit Business States & Handlers
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editIndustryGroup, setEditIndustryGroup] = useState("Dịch vụ ăn uống");
  const [editOwner, setEditOwner] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmployeeCount, setEditEmployeeCount] = useState(3);
  const [editImage, setEditImage] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editCoordinates, setEditCoordinates] = useState("");

  // Industry Sector Statistics UI states - mặc định luôn hiển thị ở trạng thái thu gọn
  const [showIndustryStats, setShowIndustryStats] = useState(false);

  // Edit Accommodation states
  const [editIsAccommodation, setEditIsAccommodation] = useState(false);
  const [editSoPhong, setEditSoPhong] = useState<number | string>(0);
  const [editSoTang, setEditSoTang] = useState<number | string>(0);
  const [editSoNguoiLuuTru, setEditSoNguoiLuuTru] = useState<number | string>(0);
  const [editGiaThueTrungBinh, setEditGiaThueTrungBinh] = useState("");

  // Edit Cadastral states
  const [editToBanDo, setEditToBanDo] = useState("");
  const [editSoThua, setEditSoThua] = useState("");
  const [editDienTich, setEditDienTich] = useState<number | string>("");
  const [editLoaiDat, setEditLoaiDat] = useState("");
  const [editTenChuSuDung, setEditTenChuSuDung] = useState("");
  const [editSoGcn, setEditSoGcn] = useState("");
  const [editSoVaoSo, setEditSoVaoSo] = useState("");
  const [editSoDoFile, setEditSoDoFile] = useState<BusinessFile | null>(null);
  const [editGiayPhepFile, setEditGiayPhepFile] = useState<BusinessFile | null>(null);
  const [editPcccFile, setEditPcccFile] = useState<BusinessFile | null>(null);

  // SME Fields for Edit Business Modal
  const [editInternalCode, setEditInternalCode] = useState("");
  const [editTaxCode, setEditTaxCode] = useState("");
  const [editBusinessType, setEditBusinessType] = useState<"Công ty TNHH" | "Công ty Cổ phần" | "Doanh nghiệp tư nhân" | "Hộ kinh doanh" | "Cơ sở kinh doanh khác">("Công ty TNHH");
  const [editEnterpriseScale, setEditEnterpriseScale] = useState<"Siêu nhỏ (< 5 LĐ)" | "Nhỏ (5 - 20 LĐ)" | "Vừa (20 - 50 LĐ)" | "Lớn (> 50 LĐ)">("Nhỏ (5 - 20 LĐ)");
  const [editStartDate, setEditStartDate] = useState("");
  const [editVerificationSource, setEditVerificationSource] = useState("");
  const [editStreetArea, setEditStreetArea] = useState("");
  const [editPremisesType, setEditPremisesType] = useState<"Nhà phố" | "Văn phòng" | "Cửa hàng" | "Nhà xưởng" | "Ki-ốt" | "Địa điểm thuê" | "Chung cư / Căn hộ">("Cửa hàng");
  const [editPremisesOwner, setEditPremisesOwner] = useState("");
  const [editPremisesOwnerPhone, setEditPremisesOwnerPhone] = useState("");
  const [editLinkedHouseholdCode, setEditLinkedHouseholdCode] = useState("");
  const [editLinkedBuildingOrHostel, setEditLinkedBuildingOrHostel] = useState("");
  const [editLegalRep, setEditLegalRep] = useState("");
  const [editLegalRepPhone, setEditLegalRepPhone] = useState("");
  const [editLegalRepCccd, setEditLegalRepCccd] = useState("");
  const [editLegalRepEmail, setEditLegalRepEmail] = useState("");
  const [editSiteManager, setEditSiteManager] = useState("");
  const [editSiteManagerPhone, setEditSiteManagerPhone] = useState("");
  const [editFocalPointName, setEditFocalPointName] = useState("");
  const [editFocalPointPhone, setEditFocalPointPhone] = useState("");
  const [editFocalPointRole, setEditFocalPointRole] = useState("Chủ cơ sở");
  const [editLocalWorkers, setEditLocalWorkers] = useState(2);
  const [editTemporaryWorkers, setEditTemporaryWorkers] = useState(2);
  const [editForeignWorkersCount, setEditForeignWorkersCount] = useState(0);
  const [editSupportNeeds, setEditSupportNeeds] = useState<string[]>([]);
  const [editSupportNotes, setEditSupportNotes] = useState("");

  // Periodic Inspection Log States & Handlers
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [showEditInspectionModal, setShowEditInspectionModal] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<InspectionLog | null>(null);
  const [editingInspection, setEditingInspection] = useState<InspectionLog | null>(null);

  // Form fields for Add/Edit Inspection
  const [formInspDate, setFormInspDate] = useState("");
  const [formInspInspector, setFormInspInspector] = useState("");
  const [formInspResult, setFormInspResult] = useState<"Đạt chuẩn" | "Cảnh cáo" | "Không đạt" | "Yêu cầu khắc phục">("Đạt chuẩn");
  const [formInspNote, setFormInspNote] = useState("");
  const [formInspRecommendation, setFormInspRecommendation] = useState("");
  const [formInspPenalties, setFormInspPenalties] = useState("");

  const defaultSampleInspections: InspectionLog[] = [
    {
      id: "INSP-01",
      date: "05/06/2026",
      result: "Đạt chuẩn",
      inspector: "Đoàn liên ngành Phường An Phú",
      note: "Kiểm tra vệ sinh an toàn thực phẩm và điều kiện hoạt động. Cơ sở sạch sẽ, trang bị đủ bình chữa cháy CO2 và bột.",
      recommendation: "Tiếp tục duy trì vệ sinh định kỳ và lưu trữ hóa đơn nguyên liệu."
    },
    {
      id: "INSP-02",
      date: "15/04/2026",
      result: "Cảnh cáo",
      inspector: "Cảnh sát Phòng cháy Chữa cháy & CNCH",
      note: "Bình chữa cháy MFZ4 áp kế kim chỉ vạch đỏ hết hạn nạp. Lối thoát nạn phụ có để vật cản hàng hóa.",
      recommendation: "Yêu cầu nạp sạc lại bình chữa cháy và giải phóng hành lang thoát hiểm trong 7 ngày.",
      penalties: "Lập biên bản nhắc nhở, cảnh cáo lần 1"
    },
    {
      id: "INSP-03",
      date: "10/02/2026",
      result: "Đạt chuẩn",
      inspector: "Công an khu vực Phường An Phú",
      note: "Kiểm tra tạm trú cho nhân viên và khách lưu trú. Đầy đủ sổ sách và khai báo định danh VNeID theo quy định."
    }
  ];

  const getBusinessInspections = (b: Business | null): InspectionLog[] => {
    if (!b) return [];
    if (b.inspections && Array.isArray(b.inspections)) {
      return b.inspections;
    }
    return defaultSampleInspections.map((item, index) => ({
      ...item,
      id: `INSP-${b.id}-${index + 1}`
    }));
  };

  const handleOpenAddInspection = () => {
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    setFormInspDate(formattedToday);
    setFormInspInspector("Đoàn liên ngành Phường An Phú");
    setFormInspResult("Đạt chuẩn");
    setFormInspNote("");
    setFormInspRecommendation("");
    setFormInspPenalties("");
    setShowAddInspectionModal(true);
  };

  const handleOpenEditInspection = (inspect: InspectionLog) => {
    setEditingInspection(inspect);
    let dateVal = inspect.date;
    if (inspect.date.includes("/")) {
      const parts = inspect.date.split("/");
      if (parts.length === 3) {
        dateVal = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    setFormInspDate(dateVal);
    setFormInspInspector(inspect.inspector);
    setFormInspResult(inspect.result);
    setFormInspNote(inspect.note);
    setFormInspRecommendation(inspect.recommendation || "");
    setFormInspPenalties(inspect.penalties || "");
    setShowEditInspectionModal(true);
  };

  const handleSaveAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    if (!formInspInspector.trim()) {
      showToast("Vui lòng nhập tên Đoàn / Cán bộ kiểm tra!", "error");
      return;
    }
    if (!formInspNote.trim()) {
      showToast("Vui lòng nhập nội dung biên bản kiểm tra!", "error");
      return;
    }

    let displayDate = formInspDate;
    if (formInspDate.includes("-")) {
      const parts = formInspDate.split("-");
      if (parts.length === 3) {
        displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const newInspection: InspectionLog = {
      id: `INSP-${Date.now()}`,
      date: displayDate || new Date().toLocaleDateString("vi-VN"),
      result: formInspResult,
      inspector: formInspInspector.trim(),
      note: formInspNote.trim(),
      recommendation: formInspRecommendation.trim() || undefined,
      penalties: formInspPenalties.trim() || undefined
    };

    const currentList = getBusinessInspections(selectedBusiness);
    const updatedList = [newInspection, ...currentList];

    const updatedB: Business = {
      ...selectedBusiness,
      inspections: updatedList
    };

    setSelectedBusiness(updatedB);
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updatedB : b));
    }
    setShowAddInspectionModal(false);
    showToast("Đã thêm biên bản kiểm tra định kỳ mới thành công!", "success");
  };

  const handleSaveEditInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !editingInspection) return;
    if (!formInspInspector.trim()) {
      showToast("Vui lòng nhập tên Đoàn / Cán bộ kiểm tra!", "error");
      return;
    }
    if (!formInspNote.trim()) {
      showToast("Vui lòng nhập nội dung biên bản kiểm tra!", "error");
      return;
    }

    let displayDate = formInspDate;
    if (formInspDate.includes("-")) {
      const parts = formInspDate.split("-");
      if (parts.length === 3) {
        displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const currentList = getBusinessInspections(selectedBusiness);
    const updatedList = currentList.map(item => {
      if (item.id === editingInspection.id) {
        return {
          ...item,
          date: displayDate || item.date,
          result: formInspResult,
          inspector: formInspInspector.trim(),
          note: formInspNote.trim(),
          recommendation: formInspRecommendation.trim() || undefined,
          penalties: formInspPenalties.trim() || undefined
        };
      }
      return item;
    });

    const updatedB: Business = {
      ...selectedBusiness,
      inspections: updatedList
    };

    setSelectedBusiness(updatedB);
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updatedB : b));
    }
    setShowEditInspectionModal(false);
    setEditingInspection(null);
    showToast("Đã cập nhật biên bản kiểm tra thành công!", "success");
  };

  const handleExecuteDeleteInspection = () => {
    if (!selectedBusiness || !inspectionToDelete) return;

    const currentList = getBusinessInspections(selectedBusiness);
    const updatedList = currentList.filter(item => item.id !== inspectionToDelete.id);

    const updatedB: Business = {
      ...selectedBusiness,
      inspections: updatedList
    };

    setSelectedBusiness(updatedB);
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updatedB : b));
    }
    setInspectionToDelete(null);
    showToast("Đã xóa biên bản kiểm tra thành công!", "success");
  };

  const [dragActiveEditModal, setDragActiveEditModal] = useState(false);
  const [dragActiveEditSoDo, setDragActiveEditSoDo] = useState(false);

  const handleOpenEditModal = (business: Business) => {
    setEditName(business.name);
    setEditType(business.type);
    setEditIndustryGroup(business.industryGroup || getBusinessIndustryGroup(business));
    setEditOwner(business.owner);
    setEditPhone(business.phone);
    setEditAddress(business.address);
    setEditEmployeeCount(business.employeeCount);
    setEditImage(business.image || "");
    setEditImages(business.images || (business.image ? [business.image] : []));
    setEditCoordinates(business.coordinates || "");

    // Fields in Edit Modal
    setEditInternalCode(business.internalCode || `CSKD-${business.id}`);
    setEditTaxCode(business.licenseNumber || business.taxCode || "");
    setEditBusinessType(business.businessType || (business.isAccommodation ? "Hộ kinh doanh" : "Hộ kinh doanh"));
    setEditEnterpriseScale(business.enterpriseScale || "Siêu nhỏ (< 5 LĐ)");
    setEditStartDate(business.startDate || "01/01/2023");
    setEditVerificationSource(business.verificationSource || "Khảo sát Tổ dân phố & Ban Điều hành KP3");
    setEditStreetArea(business.streetArea || (business.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của"));
    setEditPremisesType(business.premisesType || (isAccommodationBusiness(business) ? "Nhà phố" : "Cửa hàng"));
    setEditPremisesOwner(business.premisesOwner || business.owner);
    setEditPremisesOwnerPhone(business.premisesOwnerPhone || business.phone);
    setEditLinkedHouseholdCode(business.linkedHouseholdCode || "");
    setEditLinkedBuildingOrHostel(business.linkedBuildingOrHostel || "");
    setEditLegalRep(business.legalRepresentative || business.owner);
    setEditLegalRepPhone(business.legalRepPhone || business.phone);
    setEditLegalRepCccd(business.legalRepCccd || "");
    setEditLegalRepEmail(business.legalRepEmail || "");
    setEditSiteManager(business.siteManager || business.owner);
    setEditSiteManagerPhone(business.siteManagerPhone || business.phone);
    setEditFocalPointName(business.focalPointName || business.owner);
    setEditFocalPointPhone(business.focalPointPhone || business.phone);
    setEditFocalPointRole(business.focalPointRole || "Chủ cơ sở");
    setEditLocalWorkers(business.localWorkersCount ?? Math.floor(business.employeeCount / 2));
    setEditTemporaryWorkers(business.temporaryWorkersCount ?? Math.ceil(business.employeeCount / 2));
    setEditForeignWorkersCount(business.foreignWorkersCount || (business.foreignWorkers ? business.foreignWorkers.length : 0));
    setEditSupportNeeds(business.supportNeeds || []);
    setEditSupportNotes(business.supportNotes || "");

    const isAcc = isAccommodationBusiness(business);
    setEditIsAccommodation(isAcc);
    setEditSoPhong(business.soPhong || (isAcc ? 10 : 0));
    setEditSoTang(business.soTang || (isAcc ? 3 : 0));
    setEditSoNguoiLuuTru(business.soNguoiLuuTru || (isAcc ? 15 : 0));
    setEditGiaThueTrungBinh(business.giaThueTrungBinh || (isAcc ? "2.5 - 3.5 triệu/tháng" : ""));

    setEditToBanDo(business.toBanDo || "272");
    setEditSoThua(business.soThua || "55");
    setEditDienTich(business.dienTich || 120);
    setEditLoaiDat(business.loaiDat || "ODT");
    setEditTenChuSuDung(business.tenChuSuDung || business.owner);
    setEditSoGcn(business.soGcn || "CH-" + Math.floor(100000 + Math.random() * 900000));
    setEditSoVaoSo(business.soVaoSo || "CS-2023-099");
    setEditSoDoFile(business.soDoFile || null);
    setEditGiayPhepFile(business.giayPhepFile || null);
    setEditPcccFile(business.pcccFile || null);

    setShowEditModal(true);
  };

  const handleUpdateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    const updatedB: Business = {
      ...selectedBusiness,
      name: editName,
      type: editType,
      industryGroup: editIndustryGroup,
      owner: editOwner,
      phone: editPhone,
      address: editAddress,
      employeeCount: editEmployeeCount,
      image: editImage || selectedBusiness.image,
      images: editImages.length > 0 ? editImages : (editImage ? [editImage] : selectedBusiness.images),
      coordinates: editCoordinates,

      // SME Fields
      internalCode: editInternalCode,
      taxCode: editTaxCode,
      businessType: editBusinessType,
      enterpriseScale: editEnterpriseScale,
      startDate: editStartDate,
      verificationSource: editVerificationSource,
      streetArea: editStreetArea,
      premisesType: editPremisesType,
      premisesOwner: editPremisesOwner,
      premisesOwnerPhone: editPremisesOwnerPhone,
      linkedHouseholdCode: editLinkedHouseholdCode,
      linkedBuildingOrHostel: editLinkedBuildingOrHostel,
      legalRepresentative: editLegalRep,
      legalRepPhone: editLegalRepPhone,
      legalRepCccd: editLegalRepCccd,
      legalRepEmail: editLegalRepEmail,
      siteManager: editSiteManager,
      siteManagerPhone: editSiteManagerPhone,
      focalPointName: editFocalPointName,
      focalPointPhone: editFocalPointPhone,
      focalPointRole: editFocalPointRole,
      localWorkersCount: editLocalWorkers,
      temporaryWorkersCount: editTemporaryWorkers,
      foreignWorkersCount: editForeignWorkersCount,
      supportNeeds: editSupportNeeds,
      supportNotes: editSupportNotes,

      // Accommodation fields
      isAccommodation: editIsAccommodation,
      soPhong: editIsAccommodation ? Number(editSoPhong) || 0 : undefined,
      soTang: editIsAccommodation ? Number(editSoTang) || 0 : undefined,
      soNguoiLuuTru: editIsAccommodation ? Number(editSoNguoiLuuTru) || 0 : undefined,
      giaThueTrungBinh: editIsAccommodation ? editGiaThueTrungBinh : undefined,

      // Cadastral fields
      toBanDo: editToBanDo,
      soThua: editSoThua,
      dienTich: editDienTich,
      loaiDat: editLoaiDat,
      tenChuSuDung: editTenChuSuDung,
      soGcn: editSoGcn,
      soVaoSo: editSoVaoSo,

      // Files
      soDoFile: editSoDoFile || undefined,
      giayPhepFile: editGiayPhepFile || undefined,
      pcccFile: editPcccFile || undefined
    };

    if (onUpdateBusinesses) {
      const updatedBusinesses = businesses.map(b => b.id === selectedBusiness.id ? updatedB : b);
      onUpdateBusinesses(updatedBusinesses);
      setSelectedBusiness(updatedB);
      showToast("Đã cập nhật thông tin hộ kinh doanh thành công!", "success");
      setShowEditModal(false);
    } else {
      showToast("Lỗi hệ thống: Không thể cập nhật thông tin!", "error");
    }
  };

  // Direct upload Sổ đỏ in Detail Panel
  const handleUploadDetailSoDo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBusiness || !e.target.files || !e.target.files[0]) return;
    handleProcessFileUpload(e.target.files[0], (fileObj) => {
      const updated = {
        ...selectedBusiness,
        soDoFile: fileObj
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updated : b));
      }
      setSelectedBusiness(updated);
      showToast("Đã tải lên tệp Sổ đỏ thành công!", "success");
    });
  };

  // Direct upload photo to gallery in Detail Panel
  const handleAddGalleryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBusiness || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newImg = reader.result as string;
      const existing = selectedBusiness.images || (selectedBusiness.image ? [selectedBusiness.image] : []);
      const updatedImages = [...existing, newImg];
      const updated = {
        ...selectedBusiness,
        images: updatedImages
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updated : b));
      }
      setSelectedBusiness(updated);
      showToast("Đã thêm ảnh vào bộ sưu tập cơ sở!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCoordinates = () => {
    if (!selectedBusiness) return;
    
    const updatedBusiness = {
      ...selectedBusiness,
      coordinates: tempCoordinates
    };

    const updatedBusinesses = businesses.map(b => b.id === selectedBusiness.id ? updatedBusiness : b);
    if (onUpdateBusinesses) {
      onUpdateBusinesses(updatedBusinesses);
    }
    setSelectedBusiness(updatedBusiness);
    setIsEditingCoordinates(false);
    showToast("Đã lưu tọa độ định vị mới!", "success");
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newOwner || !newPhone) {
      showToast("Vui lòng nhập đầy đủ các trường bắt buộc!", "error");
      return;
    }

    const newId = "B" + (businesses.length + 1).toString().padStart(3, "0");
    const newLicense = "GP-" + Math.floor(100000 + Math.random() * 900000);

    const isAcc = newIsAccommodation || isAccommodationBusiness({ name: newName, type: newType } as Business);

    const newB: Business = {
      id: newId,
      internalCode: newInternalCode || `DN-KP3-${newId}`,
      taxCode: newTaxCode || "",
      businessType: newBusinessType,
      enterpriseScale: newEnterpriseScale,
      startDate: newStartDate,
      verificationSource: newVerificationSource,
      streetArea: newStreetArea,
      premisesType: newPremisesType,
      premisesOwner: newPremisesOwner || newOwner,
      premisesOwnerPhone: newPremisesOwnerPhone || newPhone,
      linkedHouseholdCode: newLinkedHouseholdCode,
      linkedBuildingOrHostel: newLinkedBuildingOrHostel,
      legalRepresentative: newLegalRep || newOwner,
      legalRepPhone: newLegalRepPhone || newPhone,
      legalRepCccd: newLegalRepCccd,
      legalRepEmail: newLegalRepEmail,
      siteManager: newSiteManager || newOwner,
      siteManagerPhone: newSiteManagerPhone || newPhone,
      focalPointName: newFocalPointName || newOwner,
      focalPointPhone: newFocalPointPhone || newPhone,
      focalPointRole: newFocalPointRole,
      localWorkersCount: newLocalWorkers,
      temporaryWorkersCount: newTemporaryWorkers,
      foreignWorkersCount: newForeignWorkersCount,
      supportNeeds: newSupportNeeds,
      supportNotes: newSupportNotes,

      name: newName,
      type: newType || (isAcc ? "Nhà trọ / Cho thuê lưu trú" : "Cửa hàng tiện lợi"),
      industryGroup: newIndustryGroup || getBusinessIndustryGroup({ name: newName, type: newType } as Business),
      owner: newOwner,
      phone: newPhone,
      address: newAddress,
      licenseNumber: newLicense,
      status: "Chờ duyệt",
      employeeCount: newEmployeeCount,
      safetyCertified: false,
      coordinates: newCoordinates,
      image: newImage || (isAcc 
        ? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500" 
        : "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400"),
      images: newAdditionalImages.length > 0 
        ? (newImage ? [newImage, ...newAdditionalImages] : newAdditionalImages)
        : (newImage ? [newImage] : []),

      // Accommodation fields
      isAccommodation: isAcc,
      soPhong: isAcc ? Number(newSoPhong) || 0 : undefined,
      soTang: isAcc ? Number(newSoTang) || 0 : undefined,
      soNguoiLuuTru: isAcc ? Number(newSoNguoiLuuTru) || 0 : undefined,
      giaThueTrungBinh: isAcc ? newGiaThueTrungBinh : undefined,

      // Cadastral fields
      toBanDo: newToBanDo,
      soThua: newSoThua,
      dienTich: newDienTich,
      loaiDat: newLoaiDat,
      tenChuSuDung: newTenChuSuDung || newOwner,
      soGcn: newSoGcn || "CH-" + Math.floor(100000 + Math.random() * 900000),
      soVaoSo: newSoVaoSo || "CS-2024-001",

      // Files
      soDoFile: newSoDoFile || undefined,
      giayPhepFile: newGiayPhepFile || undefined,
      pcccFile: newPcccFile || undefined
    };

    const updatedBusinesses = [newB, ...businesses];
    if (onUpdateBusinesses) {
      onUpdateBusinesses(updatedBusinesses);
    }
    setSelectedBusiness(newB);
    setShowAddModal(false);
    showToast("Đã đăng ký cơ sở kinh doanh mới thành công!", "success");

    // Reset Form
    setNewName("");
    setNewType("");
    setNewIndustryGroup("Dịch vụ ăn uống");
    setNewOwner("");
    setNewPhone("");
    setNewEmployeeCount(3);
    setNewCoordinates("10°56'07.5\"N 106°44'38.0\"E");
    setNewImage("");
    setNewAdditionalImages([]);
    setNewIsAccommodation(false);
    setNewSoDoFile(null);
    setNewGiayPhepFile(null);
    setNewPcccFile(null);
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
    <div id="business-management-view" className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Store size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Quản lý Cơ sở Kinh doanh KP3</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Quản lý mạng lưới cơ sở kinh doanh tại chỗ, hộ kinh doanh cá thể, dịch vụ ăn uống, đời sống nhân dân, cơ sở lưu trú / nhà trọ, an toàn PCCC, ATTP và hồ sơ địa chính
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            type="button"
            onClick={handleExportBusinessesCsv}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
            title="Xuất danh sách cơ sở kinh doanh dạng CSV"
          >
            <Download size={15} /> Xuất File CSV
          </button>
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer hover:shadow-emerald-500/20"
          >
            <Plus size={16} /> Đăng ký Cơ sở Kinh doanh Mới
          </button>
        </div>
      </div>
          {/* KPI Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Tổng cơ sở kinh doanh</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-slate-800">{businesses.length}</span>
              <span className="text-[10px] text-slate-500">cơ sở</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Building size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-amber-800 block uppercase tracking-wider">Nhà trọ & Lưu trú</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-amber-900">{totalAccomCount}</span>
              <span className="text-[10px] text-amber-700 font-bold">({totalRooms} phòng)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-indigo-800 block uppercase tracking-wider">Hồ sơ Sổ đỏ đính kèm</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-indigo-900">{totalSoDoFiles}</span>
              <span className="text-[10px] text-indigo-700 font-bold">/ {businesses.length} cơ sở</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 block uppercase tracking-wider">Đạt chuẩn PCCC</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-emerald-900">{totalCertifiedPccc}</span>
              <span className="text-[10px] text-emerald-700 font-bold">cơ sở</span>
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG PHÂN LOẠI & THỐNG KÊ NGÀNH NGHỀ KINH DOANH KP3 (GỌN GÀNG, TINH GỌN, KHÔNG TRÙNG LẶP) */}
      <div 
        id="industry-sectors-stats-panel"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
      >
        {/* Panel Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
              <PieChart size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Phân loại & Thống kê Ngành nghề Kinh doanh KP3
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {sectorStats.filter(s => s.count > 0).length}/{INDUSTRY_SECTORS.length} nhóm ngành
                </span>
                {dominantSector && dominantSector.count > 0 && (
                  <span className="text-[10px] text-amber-200 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-full hidden md:inline-flex items-center gap-1">
                    <span>Nhiều nhất:</span>
                    <strong className="text-amber-300">{dominantSector.icon} {dominantSector.shortName}</strong>
                    <span>({dominantSector.count} cơ sở • {dominantSector.percentage.toFixed(0)}%)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {categoryFilter !== "Tất cả" && (
              <button
                type="button"
                onClick={() => handleCategoryFilterChange("Tất cả")}
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Bỏ lọc ngành nghề đang chọn"
              >
                <X size={12} />
                <span>Bỏ lọc: {categoryFilter}</span>
              </button>
            )}

            {/* Collapse / Expand Toggle */}
            <button
              type="button"
              onClick={() => setShowIndustryStats(!showIndustryStats)}
              className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1 shadow-xs"
              title={showIndustryStats ? "Thu gọn bảng thống kê ngành nghề" : "Mở rộng bảng thống kê ngành nghề"}
            >
              <span>{showIndustryStats ? "Thu gọn ▲" : "Mở rộng ▼"}</span>
            </button>
          </div>
        </div>

        {/* Panel Content (Expandable - gọn gàng, trực quan) */}
        {showIndustryStats && (
          <div className="p-3.5 sm:p-4 space-y-3 bg-slate-50/50">
            {/* Visual Segmented Distribution Bar (Biểu đồ dải màu tỷ trọng 100%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <TrendingUp size={13} className="text-indigo-600" />
                  Cơ cấu tỷ trọng ngành nghề thương mại dịch vụ (100%)
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Nhấp vào dải màu hoặc từng nhóm ngành để lọc danh sách
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/70 p-0.5">
                {sectorStats.map((s) => {
                  if (s.count === 0) return null;
                  const isCurrent = categoryFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleCategoryFilterChange(isCurrent ? "Tất cả" : s.id)}
                      style={{ width: `${s.percentage}%` }}
                      className={`h-full transition-all cursor-pointer relative group ${s.barColor} ${
                        isCurrent ? "ring-2 ring-slate-900 ring-offset-1 z-10" : "hover:opacity-90"
                      }`}
                      title={`${s.name}: ${s.count} cơ sở (${s.percentage.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Streamlined Interactive Sector Chips (Tích hợp phân tích & lọc nhanh) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleCategoryFilterChange("Tất cả")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                  categoryFilter === "Tất cả"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <span>Tất cả ngành nghề</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  categoryFilter === "Tất cả" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {businesses.length}
                </span>
              </button>

              {sectorStats.map((s) => {
                const isCurrent = categoryFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleCategoryFilterChange(isCurrent ? "Tất cả" : s.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-400 font-bold"
                        : "bg-white text-slate-700 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300"
                    }`}
                    title={`${s.name}: ${s.count} cơ sở (${s.percentage.toFixed(1)}%) - Nhấp để lọc`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-semibold">{s.shortName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      {s.count}
                    </span>
                    <span className={`text-[9px] ${isCurrent ? "text-indigo-200" : "text-slate-400"}`}>
                      ({s.percentage.toFixed(0)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ESTABLISHMENT FILTER PILLS (Phân loại Hộ kinh doanh, Lưu trú, PCCC) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-wider flex items-center gap-1">
          <Store size={13} className="text-amber-600" /> Phân loại:
        </span>
        <button
          type="button"
          onClick={() => { setEstablishmentFilter("all"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer border ${
            establishmentFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
          }`}
        >
          Tất cả ({businesses.length})
        </button>

        <button
          type="button"
          onClick={() => { setEstablishmentFilter("household"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            establishmentFilter === "household"
              ? "bg-slate-800 text-white border-slate-800 shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Store size={13} />
          <span>Hộ kinh doanh cá thể</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            establishmentFilter === "household" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {businesses.filter(b => !b.isAccommodation).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setEstablishmentFilter("accommodation"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            establishmentFilter === "accommodation"
              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
              : "bg-white text-amber-800 hover:bg-amber-50 border-amber-200"
          }`}
        >
          <Building size={13} />
          <span>Nhà trọ / Lưu trú</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            establishmentFilter === "accommodation" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
          }`}>
            {totalAccomCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setEstablishmentFilter("pccc-pass"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            establishmentFilter === "pccc-pass"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          }`}
        >
          <ShieldCheck size={13} />
          <span>Đạt chuẩn PCCC</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            establishmentFilter === "pccc-pass" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
          }`}>
            {totalCertifiedPccc}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setEstablishmentFilter("pccc-fail"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            establishmentFilter === "pccc-fail"
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-white text-rose-700 hover:bg-rose-50 border-rose-200"
          }`}
        >
          <ShieldAlert size={13} />
          <span>Chưa đạt PCCC</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            establishmentFilter === "pccc-fail" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
          }`}>
            {businesses.length - totalCertifiedPccc}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setEstablishmentFilter("has-sodo"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            establishmentFilter === "has-sodo"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-white text-indigo-700 hover:bg-indigo-50 border-indigo-200"
          }`}
        >
          <FileText size={13} />
          <span>Có hồ sơ Sổ đỏ</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            establishmentFilter === "has-sodo" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800"
          }`}>
            {totalSoDoFiles}
          </span>
        </button>
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
              <option value="Tất cả">Tất cả ngành nghề ({businesses.length})</option>
              {INDUSTRY_SECTORS.map((sec) => {
                const count = sectorStats.find(s => s.id === sec.id)?.count || 0;
                return (
                  <option key={sec.id} value={sec.id}>
                    {sec.icon} {sec.name} ({count})
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
                  "Đang hoạt động": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                  "Tạm ngưng": "bg-rose-500/10 text-rose-600 border-rose-500/20",
                  "Chờ duyệt": "bg-amber-500/10 text-amber-600 border-amber-500/20"
                };
                const isSelected = selectedBusiness?.id === b.id && showDetailModal;
                const isAccom = isAccommodationBusiness(b);
                const sectorGroup = getBusinessIndustryGroup(b);
                const sectorMeta = getSectorMeta(sectorGroup);

                return (
                  <div 
                    key={b.id}
                    id={`business-card-${b.id}`}
                    onClick={() => handleOpenDetailModal(b)}
                    className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 relative
                      ${isSelected ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm" : "border-slate-100"}
                    `}
                  >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sectorMeta.badgeClass}`}>
                              <span>{sectorMeta.icon}</span>
                              <span>{sectorMeta.shortName}</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono uppercase">
                              {b.type}
                            </span>
                            {isAccom && sectorGroup !== "Lưu trú & Cho thuê" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <Building size={10} /> Lưu trú
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusColors[b.status]}`}>
                            {b.status}
                          </span>
                        </div>

                        {/* Image Thumbnail preview */}
                        <div className="relative h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                          <img 
                            src={b.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400"} 
                            alt={b.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>
                          
                          {/* Badges on bottom of card image */}
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end text-white">
                            <div className="text-[11px] font-bold truncate pr-2 drop-shadow-sm">
                              {b.name}
                            </div>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-white/90 backdrop-blur-xs shrink-0">
                              {b.licenseNumber}
                            </span>
                          </div>
                        </div>

                        {/* Accommodation Highlight Box */}
                        {isAccom && (
                          <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-100 text-xs text-amber-900 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Building size={13} className="text-amber-700" />
                              <span>{b.soPhong || 0} phòng</span>
                              <span className="text-amber-400">•</span>
                              <span>{b.soTang || 0} tầng</span>
                            </div>
                            {b.soNguoiLuuTru ? (
                              <span className="text-[11px] font-medium text-amber-800">
                                👥 {b.soNguoiLuuTru} người lưu trú
                              </span>
                            ) : null}
                          </div>
                        )}

                        {/* Cadastral & Land Use Info */}
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100/80 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Tờ BĐ / Thửa:</span>
                            <span className="font-mono font-bold text-slate-700">Tờ {b.toBanDo || "—"}, Thửa {b.soThua || "—"}</span>
                          </div>
                          {b.dienTich && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Diện tích & Loại đất:</span>
                              <span className="font-semibold text-slate-700">{b.dienTich} m² ({b.loaiDat || "ODT"})</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0 text-slate-400" /> 
                          <span className="truncate">{b.address}</span>
                        </div>
                      </div>

                      {/* Footer Actions & Badges */}
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User size={12} className="text-slate-400" /> {b.owner}
                        </span>

                        <div className="flex items-center gap-2">
                          {b.soDoFile && (
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
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                                b.soDoFile.type === "pdf" 
                                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" 
                                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              }`}
                              title="Nhấp để xem tệp Sổ đỏ"
                            >
                              <FileText size={11} />
                              Sổ đỏ ({b.soDoFile.type.toUpperCase()})
                            </button>
                          )}

                          {b.safetyCertified && (
                            <span className="flex items-center gap-0.5 text-emerald-600 font-bold text-[10px]">
                              <ShieldCheck size={12} /> PCCC
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
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3">Cơ sở / Ngành nghề</th>
                      <th className="p-3">Chủ sở hữu & Liên hệ</th>
                      <th className="p-3">Đặc điểm Lưu trú</th>
                      <th className="p-3">Địa chính / Thửa đất</th>
                      <th className="p-3">Sổ đỏ & PCCC</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBusinesses.map((b) => {
                      const isSelected = selectedBusiness?.id === b.id && showDetailModal;
                      const isAccom = isAccommodationBusiness(b);
                      const sectorGroup = getBusinessIndustryGroup(b);
                      const sectorMeta = getSectorMeta(sectorGroup);
                      return (
                        <tr 
                          key={b.id}
                          onClick={() => handleOpenDetailModal(b)}
                          className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${
                            isSelected ? "bg-indigo-50/60 font-medium" : ""
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-800 text-xs">{b.name}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 ${sectorMeta.badgeClass}`}>
                                <span>{sectorMeta.icon}</span>
                                <span>{sectorMeta.shortName}</span>
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">{b.licenseNumber}</span>
                              <span className="text-[10px] text-slate-500">• {b.type}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{b.owner}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{b.phone}</div>
                          </td>

                          <td className="p-3">
                            {isAccom ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full text-[10px]">
                                  <Building size={11} /> {b.soPhong || 0} phòng / {b.soTang || 0} tầng
                                </span>
                                {b.soNguoiLuuTru ? (
                                  <div className="text-[10px] text-slate-500">
                                    {b.soNguoiLuuTru} người lưu trú
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Không lưu trú</span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="text-[11px] font-mono text-slate-700">
                              Tờ: <strong>{b.toBanDo || "—"}</strong>, Thửa: <strong>{b.soThua || "—"}</strong>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {b.dienTich ? `${b.dienTich} m²` : "—"} ({b.loaiDat || "ODT"})
                            </div>
                          </td>

                          <td className="p-3">
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
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                                    b.soDoFile.type === "pdf"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                      : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                  }`}
                                >
                                  <FileText size={10} /> Sổ đỏ ({b.soDoFile.type.toUpperCase()})
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Chưa nộp sổ</span>
                              )}

                              {b.safetyCertified && (
                                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  ✓ PCCC đạt
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              b.status === "Đang hoạt động" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                              b.status === "Tạm ngưng" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                              "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}>
                              {b.status}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(b)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                                title="Xem chi tiết hồ sơ kinh doanh"
                              >
                                <Eye size={13} />
                                <span className="hidden sm:inline">Hồ sơ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(b)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setBusinessToDelete(b)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa cơ sở"
                              >
                                <Trash2 size={14} />
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

      {/* MODAL CHI TIẾT HỒ SƠ CƠ SỞ KINH DOANH CHÍNH GIỮA VIEWPORT (Chuẩn Reference KP3) */}
      {showDetailModal && selectedBusiness && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={handleCloseDetailModal}
        >
          <div 
            id="business-detail-modal"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Header: Dark Navy Gradient & Centered Round Photo / Business Name / Badges */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
              {/* Close Button top-right */}
              <button 
                id="btn-close-business-modal"
                onClick={handleCloseDetailModal}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>

              {/* Centered Circular Business Photo */}
              <div className="relative mx-auto w-18 h-18 sm:w-20 sm:h-20 rounded-full group ring-4 ring-slate-800/80 shadow-md overflow-hidden border-2 border-emerald-400/50 mb-2">
                <img 
                  src={selectedBusiness.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400"} 
                  alt={selectedBusiness.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual change photo overlay */}
                <label className="absolute inset-0 bg-slate-950/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                  <Camera size={18} className="text-emerald-400 mb-0.5" />
                  <span className="text-[9px] font-bold">Đổi ảnh</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessFileUpload(e.target.files[0], (fileObj) => {
                          const updated = {
                            ...selectedBusiness,
                            image: fileObj.url
                          };
                          if (onUpdateBusinesses) {
                            onUpdateBusinesses(businesses.map(b => b.id === selectedBusiness.id ? updated : b));
                          }
                          setSelectedBusiness(updated);
                          showToast("Đã cập nhật ảnh đại diện cơ sở thành công!", "success");
                        });
                      }
                    }}
                  />
                </label>
              </div>

              {/* Centered Business Name */}
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight text-center leading-snug break-words">
                {selectedBusiness.name}
              </h3>

              {/* Centered Badges: Mã ĐKKD (green) & Nhóm ngành (amber) & Loại hình (blue) & Trạng thái */}
              {(() => {
                const selectedSectorGroup = getBusinessIndustryGroup(selectedBusiness);
                const selectedSectorMeta = getSectorMeta(selectedSectorGroup);
                return (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      {selectedBusiness.licenseNumber}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-400/50 flex items-center gap-1 shadow-2xs">
                      <span>{selectedSectorMeta.icon}</span>
                      <span>{selectedSectorMeta.name}</span>
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40">
                      {selectedBusiness.type}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedBusiness.status === "Đang hoạt động" 
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" 
                        : selectedBusiness.status === "Tạm ngừng" 
                        ? "bg-amber-950/80 text-amber-300 border-amber-500/40" 
                        : "bg-rose-950/80 text-rose-300 border-rose-500/40"
                    }`}>
                      {selectedBusiness.status}
                    </span>
                    {selectedBusiness.taxCode && (
                      <span className="font-mono text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                        MST: {selectedBusiness.taxCode}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Address subtext & Zoom photo button */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 mt-2 text-center">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-400 shrink-0" />
                  <span>{selectedBusiness.address}</span>
                </span>
                <button 
                  type="button"
                  onClick={() => setViewingImagePreview({
                    url: selectedBusiness.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400",
                    caption: selectedBusiness.name
                  })}
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:underline cursor-pointer"
                >
                  <Maximize2 size={11} /> Xem ảnh lớn
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 bg-slate-50/60">

                {/* Photo Gallery Thumbnails (Album hình ảnh) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <ImageIcon size={13} className="text-indigo-600" />
                    Album ảnh cơ sở ({(selectedBusiness.images?.length || 1)})
                  </span>
                  <label className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-0.5">
                    <Plus size={12} /> Thêm ảnh
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAddGalleryPhoto} 
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(selectedBusiness.images || [selectedBusiness.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400"]).map((imgUrl, i) => (
                    <div 
                      key={i} 
                      onClick={() => setViewingImagePreview({ url: imgUrl, caption: `${selectedBusiness.name} - Ảnh ${i + 1}` })}
                      className="w-14 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                      <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Details with 6 Unified Administrative Cards */}
              <div className="px-5 pb-5 space-y-4">
                
                {/* CARD 1: THÔNG TIN CƠ SỞ KINH DOANH & GIẤY PHÉP */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                        <Store size={15} />
                      </span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                        1. Thông tin Cơ sở Kinh doanh & Giấy phép
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {selectedBusiness.internalCode || `CSKD-${selectedBusiness.id}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Tên cơ sở kinh doanh / Hộ kinh doanh</span>
                      <strong className="text-slate-800 text-xs block break-words mt-0.5">{selectedBusiness.name}</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Số Giấy phép KD / Mã đăng ký</span>
                      <strong className="text-slate-800 font-mono text-xs block mt-0.5">
                        {selectedBusiness.licenseNumber || selectedBusiness.taxCode || "Đang cập nhật"}
                      </strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Loại hình cơ sở</span>
                      <strong className="text-indigo-800 text-xs block font-bold mt-0.5">
                        {selectedBusiness.isAccommodation ? "Cơ sở Lưu trú / Nhà trọ" : (selectedBusiness.businessType || "Hộ kinh doanh cá thể")}
                      </strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Lao động tại cơ sở</span>
                      <strong className="text-purple-800 text-xs block font-bold mt-0.5">
                        {selectedBusiness.employeeCount} lao động
                      </strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Ngành nghề kinh doanh chính</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">{selectedBusiness.type}</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Ngày bắt đầu hoạt động tại địa chỉ</span>
                      <strong className="text-slate-800 font-mono text-xs block mt-0.5">
                        {selectedBusiness.startDate || "10/01/2021"}
                      </strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 sm:col-span-2">
                      <div className="flex flex-wrap justify-between items-center gap-1">
                        <span className="text-[10px] text-slate-400 block font-medium">Tình trạng xác minh & Nguồn thông tin</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                          {selectedBusiness.status}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px] mt-0.5">
                        Nguồn thu thập: <strong>{selectedBusiness.verificationSource || "Khảo sát Tổ dân phố & Ban Điều hành Khu phố 3"}</strong> (phục vụ quản lý địa bàn hành chính tại chỗ)
                      </p>
                    </div>
                  </div>
                </div>

                {/* CARD 2: ĐỊA ĐIỂM, MẶT BẰNG KINH DOANH & LIÊN KẾT ĐỊA BÀN KP3 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                        <MapPin size={15} />
                      </span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                        2. Địa điểm, Mặt bằng Kinh doanh & Liên kết Địa bàn
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedBusiness.premisesType || "Nhà phố"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 block font-medium">Địa chỉ & Tuyến đường ghi nhận</span>
                      <strong className="text-slate-800 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin size={13} className="text-rose-500 shrink-0" />
                        <span>{selectedBusiness.address}</span>
                      </strong>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Khu vực / Phân tuyến: <strong>{selectedBusiness.streetArea || (selectedBusiness.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của")}</strong>
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Loại mặt bằng hoạt động</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">
                        {selectedBusiness.premisesType || "Cửa hàng / Nhà phố"}
                      </strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Chủ sở hữu / Người quản lý mặt bằng</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">
                        {selectedBusiness.premisesOwner || selectedBusiness.owner} 
                        {selectedBusiness.premisesOwnerPhone ? ` (SĐT: ${selectedBusiness.premisesOwnerPhone})` : ""}
                      </strong>
                    </div>
                  </div>

                  {/* KHỐI LIÊN KẾT HỘ DÂN KP3 */}
                  {(() => {
                    const linkedHh = getLinkedHousehold(selectedBusiness);
                    return (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                            <Home size={14} className="text-emerald-700" />
                            <span>Liên kết Dữ liệu Hộ Dân KP3</span>
                          </div>
                          {linkedHh ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950">
                              MÃ HỘ: {linkedHh.code}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Chưa đối khớp mã hộ</span>
                          )}
                        </div>

                        {linkedHh ? (
                          <div className="space-y-1.5 text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                            <div className="flex justify-between items-center">
                              <span>Chủ hộ quản lý: <strong className="text-slate-900">{linkedHh.ownerName}</strong></span>
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {linkedHh.type || "Thường trú"} • {linkedHh.memberCount} nhân khẩu
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Địa chỉ hộ: <strong>{linkedHh.address}</strong>
                            </div>
                            {linkedHh.members && linkedHh.members.length > 0 && (
                              <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-600">
                                <span>Thành viên hộ: </span>
                                <span className="font-medium text-slate-800">
                                  {linkedHh.members.map(m => `${m.name} (${m.relation})`).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-emerald-100">
                            Cơ sở tọa lạc tại địa chỉ đăng ký độc lập hoặc đang liên kết hồ sơ quản lý hành chính địa bàn.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* KHỐI LIÊN KẾT NHÀ TRỌ / CƠ SỞ LƯU TRÚ / TÒA NHÀ (Nếu có) */}
                  {(isAccommodationBusiness(selectedBusiness) || selectedBusiness.linkedBuildingOrHostel) && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                          <Building size={14} className="text-amber-700" />
                          <span>Liên kết Tòa nhà, Căn hộ & Cơ sở Lưu trú / Nhà trọ</span>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                          Chuyên đề lưu trú
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[10px] text-slate-500 block">Số tầng</span>
                          <strong className="text-amber-950 font-black text-xs">{selectedBusiness.soTang || "3"} tầng</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[10px] text-slate-500 block">Số phòng trọ</span>
                          <strong className="text-amber-950 font-black text-xs">{selectedBusiness.soPhong || "12"} phòng</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[10px] text-slate-500 block">Người lưu trú</span>
                          <strong className="text-slate-800 font-bold text-xs">{selectedBusiness.soNguoiLuuTru || "18"} người</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[10px] text-slate-500 block">Giá thuê</span>
                          <strong className="text-slate-800 text-[10.5px] block truncate">{selectedBusiness.giaThueTrungBinh || "Thỏa thuận"}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* THÔNG TIN ĐỊA CHÍNH, SỔ ĐỎ & TỌA ĐỘ */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                        <FileSpreadsheet size={13} className="text-indigo-600" />
                        Địa chính & Giấy chứng nhận QSDĐ (Sổ đỏ)
                      </span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                        GCN: {selectedBusiness.soGcn || "CH-098234"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tờ bản đồ:</span>
                        <strong className="text-slate-800 font-mono">Tờ {selectedBusiness.toBanDo || "272"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Thửa đất:</span>
                        <strong className="text-slate-800 font-mono">Thửa {selectedBusiness.soThua || "55"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Diện tích:</span>
                        <strong className="text-slate-800">{selectedBusiness.dienTich ? `${selectedBusiness.dienTich} m²` : "150 m²"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Loại đất:</span>
                        <strong className="text-slate-800">{selectedBusiness.loaiDat || "ODT (Đất ở đô thị)"}</strong>
                      </div>
                    </div>

                    {selectedBusiness.soDoFile && (
                      <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
                          <FileText size={12} className="text-rose-600" />
                          Tệp đính kèm: <strong>{selectedBusiness.soDoFile.name}</strong>
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({
                              title: "Giấy chứng nhận Quyền sử dụng đất (Sổ đỏ)",
                              businessName: selectedBusiness.name,
                              file: selectedBusiness.soDoFile!,
                              business: selectedBusiness
                            })}
                            className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Xem Sổ đỏ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google Coordinates */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100/50 flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-700 font-bold uppercase flex items-center gap-1">
                        <MapPin size={12} /> Tọa độ định vị địa bàn
                      </span>
                      <span className="font-mono text-slate-700 text-[11px] font-bold">
                        {selectedBusiness.coordinates || "10°56'07.5\"N 106°44'38.0\"E"}
                      </span>
                    </div>
                    {selectedBusiness.coordinates && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedBusiness.coordinates)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-md text-[10px] transition-colors cursor-pointer"
                      >
                        <MapPin size={11} /> Chỉ đường trên Google Maps ➜
                      </a>
                    )}
                  </div>
                </div>

                {/* CARD 3: NGƯỜI ĐẠI DIỆN & ĐẦU MỐI PHỐI HỢP ĐỊA PHƯƠNG */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                        <UserCheck size={15} />
                      </span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                        3. Người đại diện & Đầu mối Liên hệ Địa phương
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Người đại diện theo pháp luật / Phụ trách</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">
                        {selectedBusiness.legalRepresentative || selectedBusiness.owner}
                      </strong>
                      <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                        <span>SĐT: <strong className="font-mono text-slate-800">{selectedBusiness.legalRepPhone || selectedBusiness.phone}</strong></span>
                        {selectedBusiness.legalRepCccd && <span>CCCD/HC: <strong className="font-mono">{selectedBusiness.legalRepCccd}</strong></span>}
                        {selectedBusiness.legalRepEmail && <span>Email: <strong>{selectedBusiness.legalRepEmail}</strong></span>}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Người trực tiếp quản lý cơ sở tại chỗ</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">
                        {selectedBusiness.siteManager || selectedBusiness.owner}
                      </strong>
                      <div className="text-[10px] text-slate-500 mt-1">
                        <span>SĐT liên hệ trực tiếp: <strong className="font-mono text-slate-800">{selectedBusiness.siteManagerPhone || selectedBusiness.phone}</strong></span>
                      </div>
                    </div>

                    {/* Đầu mối phối hợp địa phương nổi bật */}
                    <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-200/80 sm:col-span-2">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs mb-1">
                        <Phone size={13} className="text-blue-700" />
                        <span>Đầu mối phối hợp khi địa phương tổ chức khảo sát / tuyên truyền / nhiệm vụ:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-800 mt-1">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Họ và tên đầu mối:</span>
                          <strong className="text-blue-950 font-bold">{selectedBusiness.focalPointName || selectedBusiness.owner}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Số điện thoại công vụ:</span>
                          <strong className="font-mono text-blue-950 font-bold">{selectedBusiness.focalPointPhone || selectedBusiness.phone}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Vai trò / chức vụ:</span>
                          <strong className="text-blue-950">{selectedBusiness.focalPointRole || "Chủ cơ sở / Quản lý"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: QUY MÔ, CƠ CẤU LAO ĐỘNG & NGƯỜI NƯỚC NGOÀI */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                        <Users2 size={15} />
                      </span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                        4. Tình hình Hoạt động, Lao động & Quản lý Người nước ngoài
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                      {selectedBusiness.employeeCount} lao động
                    </span>
                  </div>

                  {/* Thống kê lao động 3 nhóm */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Thường trú tại KP3</span>
                      <strong className="text-emerald-700 text-sm font-black">
                        {selectedBusiness.localWorkersCount ?? Math.floor(selectedBusiness.employeeCount / 2)}
                      </strong>
                      <span className="text-[9px] text-slate-500 block">lao động</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Lao động tạm trú</span>
                      <strong className="text-blue-700 text-sm font-black">
                        {selectedBusiness.temporaryWorkersCount ?? Math.ceil(selectedBusiness.employeeCount / 2)}
                      </strong>
                      <span className="text-[9px] text-slate-500 block">lao động</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Người nước ngoài</span>
                      <strong className={`text-sm font-black ${
                        (selectedBusiness.foreignWorkersCount || (selectedBusiness.foreignWorkers?.length || 0)) > 0 
                          ? "text-rose-700" 
                          : "text-slate-400"
                      }`}>
                        {selectedBusiness.foreignWorkersCount || (selectedBusiness.foreignWorkers?.length || 0)}
                      </strong>
                      <span className="text-[9px] text-slate-500 block">chuyên gia / LĐ</span>
                    </div>
                  </div>

                  {/* BẢNG QUẢN LÝ LAO ĐỘNG NGƯỜI NƯỚC NGOÀI */}
                  {(() => {
                    const linkedForeigners = selectedBusiness.foreignWorkers && selectedBusiness.foreignWorkers.length > 0 
                      ? selectedBusiness.foreignWorkers 
                      : getLinkedForeignResidents(selectedBusiness).map(r => ({
                          name: r.fullName,
                          nationality: r.nationality || "Nước ngoài",
                          passportOrCode: r.cccd,
                          position: r.occupation,
                          temporaryResidenceStatus: "Đã khai báo tạm trú" as const
                        }));

                    if (linkedForeigners.length > 0) {
                      return (
                        <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-900 text-xs flex items-center gap-1">
                              <Globe size={13} className="text-rose-600" />
                              Danh sách Chuyên gia / Lao động Người nước ngoài:
                            </span>
                            <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-2 py-0.2 rounded-full">
                              Khai báo CSKV
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {linkedForeigners.map((f, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                <div>
                                  <strong className="text-slate-900">{f.name}</strong>
                                  <span className="text-slate-500 ml-1.5 font-medium">({f.nationality})</span>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Hộ chiếu: {f.passportOrCode} • Vị trí: <strong className="text-slate-700">{f.position}</strong>
                                  </div>
                                </div>
                                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  f.temporaryResidenceStatus === "Đã khai báo tạm trú"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}>
                                  ✓ {f.temporaryResidenceStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-slate-400" />
                          <span>Cơ sở hiện không có lao động hoặc chuyên gia người nước ngoài.</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* CARD 5: NHU CẦU HỖ TRỢ, KHÓ KHĂN & KIẾN NGHỊ CỦA CƠ SỞ */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                        <HelpCircle size={15} />
                      </span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                        5. Nhu cầu Hỗ trợ, Khó khăn & Kiến nghị (Tự nguyện cung cấp)
                      </h4>
                    </div>
                  </div>

                  {selectedBusiness.supportNeeds && selectedBusiness.supportNeeds.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Lĩnh vực cơ sở đề xuất hỗ trợ:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBusiness.supportNeeds.map((need, i) => (
                          <span key={i} className="text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/90 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <span className="text-amber-600 font-bold">•</span> {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Cơ sở chưa đăng ký danh mục nhu cầu hỗ trợ đặc thù.
                    </div>
                  )}

                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ý kiến phản ánh / Khó khăn gửi Chi bộ & Ban ĐH KP3:</span>
                    <p className="text-slate-800 text-[11px] italic leading-relaxed">
                      "{selectedBusiness.supportNotes || "Cơ sở hoạt động ổn định, chấp hành nghiêm túc quy định của khu phố và địa phương, không có đề xuất khó khăn cần giải quyết."}"
                    </p>
                  </div>
                </div>

                {/* CARD 6: LỊCH SỬ BIẾN ĐỘNG ĐỊA BÀN & NHẬT KÝ KIỂM TRA ĐỊNH KỲ */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                        <History size={15} />
                      </span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                        6. Lịch sử Biến động Địa bàn & Nhật ký Kiểm tra
                      </h4>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleOpenAddChangeLog}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10.5px] font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                        title="Ghi nhận biến động mới cho cơ sở"
                      >
                        <Plus size={11} /> Biến động
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddInspection}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                        title="Thêm biên bản kiểm tra mới"
                      >
                        <Plus size={11} /> Biên bản KT
                      </button>
                    </div>
                  </div>

                  {/* LỊCH SỬ BIẾN ĐỘNG ĐỊA BÀN */}
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      A. Lịch sử biến động địa bàn ({selectedBusiness.changeHistory?.length || 1} sự kiện):
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {(selectedBusiness.changeHistory && selectedBusiness.changeHistory.length > 0 
                        ? selectedBusiness.changeHistory 
                        : [
                            {
                              id: `CHG-${selectedBusiness.id}-INIT`,
                              date: selectedBusiness.startDate || "12/03/2021",
                              type: "Mở mới" as const,
                              description: `Ghi nhận cơ sở bắt đầu hoạt động kinh doanh tại địa chỉ ${selectedBusiness.address}`,
                              recordedBy: "Bà Lê Thị Mai (Trưởng KP3)"
                            }
                          ]
                      ).map((chg) => (
                        <div key={chg.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              {chg.type}
                            </span>
                            <span className="font-mono text-slate-500">{chg.date}</span>
                          </div>
                          <p className="text-slate-800 leading-snug">{chg.description}</p>
                          <span className="text-[9.5px] text-slate-400 block">Ghi nhận bởi: {chg.recordedBy}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NHẬT KÝ KIỂM TRA ĐỊNH KỲ */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        B. Nhật ký kiểm tra định kỳ ({getBusinessInspections(selectedBusiness).length} đợt):
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {getBusinessInspections(selectedBusiness).length === 0 ? (
                        <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                          Chưa có biên bản kiểm tra định kỳ nào.
                        </div>
                      ) : (
                        getBusinessInspections(selectedBusiness).map((inspect) => (
                          <div key={inspect.id} className="p-2.5 rounded-lg border border-slate-200 bg-white text-[11px] space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800 text-[11.5px]">{inspect.inspector}</span>
                              <div className="flex items-center gap-1">
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                                  inspect.result === "Đạt chuẩn" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  inspect.result === "Cảnh cáo" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {inspect.result}
                                </span>
                                <span className="text-[9.5px] font-mono text-slate-400 ml-1">{inspect.date}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditInspection(inspect)}
                                  className="p-0.5 text-slate-400 hover:text-indigo-600 rounded ml-1"
                                  title="Sửa biên bản"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInspectionToDelete(inspect)}
                                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                                  title="Xóa biên bản"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                            <p className="text-slate-600 bg-slate-50 p-1.5 rounded">{inspect.note}</p>
                            {inspect.recommendation && (
                              <div className="text-[10px] text-amber-800 bg-amber-50/60 p-1 rounded">
                                <strong>Yêu cầu khắc phục:</strong> {inspect.recommendation}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Footer Modal: Quick Status & Action Buttons */}
            <div className="bg-slate-100/90 border-t border-slate-200 p-3.5 px-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">Trạng thái:</span>
                <button 
                  onClick={() => onUpdateStatus(selectedBusiness.id, "Đang hoạt động")}
                  className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedBusiness.status === "Đang hoạt động"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  Đang hoạt động
                </button>
                <button 
                  onClick={() => onUpdateStatus(selectedBusiness.id, "Tạm ngưng")}
                  className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedBusiness.status === "Tạm ngưng"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Tạm ngưng
                </button>
                <button 
                  onClick={() => onUpdateStatus(selectedBusiness.id, "Chuyển địa điểm")}
                  className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedBusiness.status === "Chuyển địa điểm"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  Chuyển đi
                </button>
                <button 
                  onClick={() => onUpdateStatus(selectedBusiness.id, "Chưa xác minh")}
                  className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedBusiness.status === "Chưa xác minh"
                      ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Chưa xác minh
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs font-bold py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  title="In phiếu thông tin cơ sở kinh doanh"
                >
                  <Printer size={13} /> In phiếu
                </button>

                <button 
                  onClick={() => handleOpenEditModal(selectedBusiness)}
                  className="flex-1 sm:flex-initial text-xs font-bold py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Pencil size={13} /> Sửa hồ sơ
                </button>

                <button 
                  onClick={() => setBusinessToDelete(selectedBusiness)}
                  className="text-xs font-bold py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} /> Xóa
                </button>

                <button 
                  onClick={handleCloseDetailModal}
                  className="text-xs font-bold py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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
                          <span className="text-[10px] text-slate-500 italic block">TP. Thủ Đức, ngày 15 tháng 04 năm 2023</span>
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

      {/* IMAGE PREVIEW LIGHTBOX */}
      {viewingImagePreview && (
        <div 
          onClick={() => setViewingImagePreview(null)}
          className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={viewingImagePreview.url} 
              alt={viewingImagePreview.caption}
              className="max-h-[80vh] w-auto rounded-xl shadow-2xl object-contain border border-white/10" 
            />
            <div className="mt-3 flex items-center justify-between w-full px-2 text-white">
              <span className="text-xs font-bold">{viewingImagePreview.caption}</span>
              <button
                type="button"
                onClick={() => setViewingImagePreview(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 px-6 flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                <Plus size={18} className="text-emerald-400" />
                Đăng ký Cơ sở / Hộ Kinh doanh Mới
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateBusiness} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Group 1: Thông tin Cơ sở Kinh doanh & Giấy phép */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Store size={14} className="text-amber-600" />
                  1. Thông tin Cơ sở Kinh doanh & Giấy phép
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Tên Cơ sở Kinh doanh / Hộ kinh doanh *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Hộ KD Phở Bò Gia Truyền, Quán Cà Phê Mộc, Nhà trọ..."
                      value={newName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewName(val);
                        if (/nhà trọ|nhà nghỉ|khách sạn|homestay/i.test(val)) {
                          setNewIsAccommodation(true);
                          setNewIndustryGroup("Lưu trú & Cho thuê");
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Số Giấy phép KD / Mã đăng ký</label>
                    <input 
                      type="text" 
                      placeholder="GP-12345/AP hoặc số ĐKKD"
                      value={newTaxCode}
                      onChange={(e) => setNewTaxCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Loại hình cơ sở *</label>
                    <select
                      value={newBusinessType}
                      onChange={(e) => setNewBusinessType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Hộ kinh doanh">Hộ kinh doanh cá thể</option>
                      <option value="Cơ sở kinh doanh khác">Cơ sở kinh doanh tại chỗ</option>
                      <option value="Doanh nghiệp tư nhân">Cơ sở tư nhân dịch vụ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Số lượng lao động tại cơ sở</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newEmployeeCount}
                      onChange={(e) => setNewEmployeeCount(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Ngày bắt đầu hoạt động</label>
                    <input 
                      type="text" 
                      placeholder="01/01/2024"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Nhóm ngành nghề phân loại *</label>
                    <select
                      value={newIndustryGroup}
                      onChange={(e) => {
                        setNewIndustryGroup(e.target.value);
                        if (e.target.value === "Lưu trú & Cho thuê") {
                          setNewIsAccommodation(true);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      {INDUSTRY_SECTORS.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.icon} {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Lĩnh vực / Loại hình cụ thể *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Phần mềm, Quán ăn, Cà phê, Tạp hóa, Tiệm thuốc..."
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Địa điểm, Mặt bằng & Liên kết Địa bàn KP3 */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <MapPin size={14} className="text-emerald-600" />
                  2. Địa điểm, Mặt bằng Kinh doanh & Liên kết Địa bàn
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block">Địa chỉ cơ sở kinh doanh *</label>
                    <input 
                      type="text" 
                      required
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Tuyến đường / Phân khu *</label>
                    <select
                      value={newStreetArea}
                      onChange={(e) => setNewStreetArea(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
                      <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
                      <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
                      <option value="Khu dân cư nội bộ KP3">Khu dân cư nội bộ KP3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Loại mặt bằng *</label>
                    <select
                      value={newPremisesType}
                      onChange={(e) => setNewPremisesType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Nhà phố">Nhà phố</option>
                      <option value="Cửa hàng">Cửa hàng</option>
                      <option value="Văn phòng">Văn phòng</option>
                      <option value="Nhà xưởng">Nhà xưởng</option>
                      <option value="Ki-ốt">Ki-ốt</option>
                      <option value="Địa điểm thuê">Địa điểm thuê</option>
                      <option value="Chung cư / Căn hộ">Chung cư / Căn hộ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Chủ sở hữu / Quản lý mặt bằng</label>
                    <input 
                      type="text" 
                      placeholder="Tên chủ nhà / chủ mặt bằng"
                      value={newPremisesOwner}
                      onChange={(e) => setNewPremisesOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Mã hộ dân KP3 liên kết</label>
                    <input 
                      type="text" 
                      placeholder="HK-01, HK-02..."
                      value={newLinkedHouseholdCode}
                      onChange={(e) => setNewLinkedHouseholdCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Người đại diện & Đầu mối Liên hệ Địa phương */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <UserCheck size={14} className="text-blue-600" />
                  3. Người đại diện & Đầu mối Liên hệ Địa phương
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Người đại diện pháp luật / Chủ cơ sở *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nguyễn Văn Bình"
                      value={newOwner}
                      onChange={(e) => {
                        setNewOwner(e.target.value);
                        if (!newLegalRep) setNewLegalRep(e.target.value);
                        if (!newTenChuSuDung) setNewTenChuSuDung(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Số điện thoại liên hệ *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="0903xxxxxx"
                      value={newPhone}
                      onChange={(e) => {
                        setNewPhone(e.target.value);
                        if (!newLegalRepPhone) setNewLegalRepPhone(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Người trực tiếp quản lý cơ sở tại chỗ</label>
                    <input 
                      type="text" 
                      placeholder="Tên quản lý trực tiếp"
                      value={newSiteManager}
                      onChange={(e) => setNewSiteManager(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                    <Phone size={12} className="text-blue-700" />
                    Đầu mối phối hợp khi địa phương tổ chức khảo sát / tuyên truyền / nhiệm vụ:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Họ tên đầu mối</label>
                      <input 
                        type="text"
                        placeholder="Họ và tên đầu mối"
                        value={newFocalPointName}
                        onChange={(e) => setNewFocalPointName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Số điện thoại công vụ</label>
                      <input 
                        type="text"
                        placeholder="SĐT công vụ tiếp nhận"
                        value={newFocalPointPhone}
                        onChange={(e) => setNewFocalPointPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Vai trò đầu mối</label>
                      <input 
                        type="text"
                        placeholder="Chủ cơ sở / Quản lý"
                        value={newFocalPointRole}
                        onChange={(e) => setNewFocalPointRole(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: Tình hình Hoạt động & Lao động */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <Users2 size={14} className="text-purple-600" />
                  4. Tình hình Hoạt động & Lực lượng Lao động
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Tổng số lao động *</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newEmployeeCount}
                      onChange={(e) => setNewEmployeeCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">LĐ thường trú KP3</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newLocalWorkers}
                      onChange={(e) => setNewLocalWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">LĐ tạm trú</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newTemporaryWorkers}
                      onChange={(e) => setNewTemporaryWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">LĐ người nước ngoài</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newForeignWorkersCount}
                      onChange={(e) => setNewForeignWorkersCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Nhu cầu Hỗ trợ & Khó khăn do cơ sở tự nguyện cung cấp */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <HelpCircle size={14} className="text-amber-600" />
                  5. Nhu cầu Hỗ trợ & Khó khăn do Cơ sở Tự nguyện Phản ánh
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 block">Lĩnh vực cơ sở đề xuất hỗ trợ (chọn nhanh):</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      "Vốn vay chính sách / ưu đãi",
                      "Hướng dẫn PCCC & ANTT",
                      "Hướng dẫn An toàn thực phẩm",
                      "Mặt bằng & thủ tục thuê đất",
                      "Giới thiệu nguồn lao động",
                      "Hỗ trợ thủ tục hành chính địa phương"
                    ].map((need, idx) => {
                      const checked = newSupportNeeds.includes(need);
                      return (
                        <label key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer text-[11px]">
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSupportNeeds([...newSupportNeeds, need]);
                              } else {
                                setNewSupportNeeds(newSupportNeeds.filter(n => n !== need));
                              }
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                          />
                          <span className="text-slate-800 font-medium">{need}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Ý kiến khó khăn / Kiến nghị gửi Chi bộ & Ban ĐH KP3:</label>
                  <textarea 
                    rows={2}
                    placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
                    value={newSupportNotes}
                    onChange={(e) => setNewSupportNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              {/* Group 2: Chuyên biệt Nhà trọ / Nhà nghỉ (Số phòng, số tầng) */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newIsAccommodation}
                      onChange={(e) => setNewIsAccommodation(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300"
                    />
                    <span className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                      <Building size={16} className="text-amber-700" />
                      Đây là cơ sở kinh doanh Nhà trọ, Nhà nghỉ, Khách sạn lưu trú
                    </span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-200/60 px-2 py-0.5 rounded-full">
                    {newIsAccommodation ? "Đang bật" : "Tắt"}
                  </span>
                </div>

                {newIsAccommodation && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Số tầng *</label>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="3"
                        value={newSoTang}
                        onChange={(e) => setNewSoTang(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Số phòng *</label>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="12"
                        value={newSoPhong}
                        onChange={(e) => setNewSoPhong(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Số người lưu trú</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="24"
                        value={newSoNguoiLuuTru}
                        onChange={(e) => setNewSoNguoiLuuTru(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Giá thuê tham khảo</label>
                      <input 
                        type="text" 
                        placeholder="2.5 - 3.5 triệu/tháng"
                        value={newGiaThueTrungBinh}
                        onChange={(e) => setNewGiaThueTrungBinh(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Group 3: Thông tin Địa chính & Tải lên Sổ đỏ (PDF / Hình ảnh) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-indigo-600" />
                  3. Thông tin Địa chính & Giấy chứng nhận QSDĐ (Sổ đỏ)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Tờ bản đồ số</label>
                    <input 
                      type="text" 
                      placeholder="272"
                      value={newToBanDo}
                      onChange={(e) => setNewToBanDo(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Số thửa đất</label>
                    <input 
                      type="text" 
                      placeholder="55"
                      value={newSoThua}
                      onChange={(e) => setNewSoThua(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Diện tích (m²)</label>
                    <input 
                      type="text" 
                      placeholder="150"
                      value={newDienTich}
                      onChange={(e) => setNewDienTich(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Loại đất</label>
                    <input 
                      type="text" 
                      placeholder="ODT, TMD..."
                      value={newLoaiDat}
                      onChange={(e) => setNewLoaiDat(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Tên chủ sử dụng đất</label>
                    <input 
                      type="text" 
                      placeholder="Nguyễn Văn Bình"
                      value={newTenChuSuDung}
                      onChange={(e) => setNewTenChuSuDung(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Số GCN (Sổ đỏ)</label>
                    <input 
                      type="text" 
                      placeholder="CH-098234"
                      value={newSoGcn}
                      onChange={(e) => setNewSoGcn(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Số vào sổ cấp GCN</label>
                    <input 
                      type="text" 
                      placeholder="CS-2023-112"
                      value={newSoVaoSo}
                      onChange={(e) => setNewSoVaoSo(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Sổ đỏ Upload Field (Hỗ trợ PDF & Hình ảnh) */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-700 block flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Paperclip size={13} className="text-indigo-600" />
                      Tải lên tệp Sổ đỏ / Giấy chứng nhận QSDĐ (Hỗ trợ PDF hoặc Hình ảnh)
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG &lt; 25MB</span>
                  </label>

                  <div 
                    className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                      dragActiveSoDoModal ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 bg-white"
                    }`}
                    onDragEnter={() => setDragActiveSoDoModal(true)}
                    onDragOver={(e) => { e.preventDefault(); setDragActiveSoDoModal(true); }}
                    onDragLeave={() => setDragActiveSoDoModal(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveSoDoModal(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleProcessFileUpload(e.dataTransfer.files[0], (fileObj) => {
                          setNewSoDoFile(fileObj);
                        });
                      }
                    }}
                  >
                    {newSoDoFile ? (
                      <div className="flex items-center justify-between w-full p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2">
                          {newSoDoFile.type === "pdf" ? <FileText size={20} className="text-rose-600" /> : <ImageIcon size={20} className="text-blue-600" />}
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">{newSoDoFile.name}</span>
                            <span className="text-[10px] text-emerald-700 font-mono">Đã tải lên • {newSoDoFile.size}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewSoDoFile(null)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center w-full py-2">
                        <input 
                          type="file" 
                          accept=".pdf,image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleProcessFileUpload(e.target.files[0], (fileObj) => {
                                setNewSoDoFile(fileObj);
                              });
                            }
                          }}
                        />
                        <Upload size={22} className="text-indigo-500 mb-1" />
                        <p className="text-xs font-semibold text-slate-700">Kéo thả tệp PDF Sổ đỏ hoặc ảnh tại đây, hoặc <span className="text-indigo-600 hover:underline font-bold">chọn tệp từ máy</span></p>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Group 4: Hình ảnh đại diện & thư viện */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                  <Camera size={14} className="text-indigo-600" />
                  4. Hình ảnh thực tế cơ sở kinh doanh
                </label>
                
                <div 
                  className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                    dragActiveModal ? "border-emerald-500 bg-emerald-50/30" : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                  onDragEnter={() => setDragActiveModal(true)}
                  onDragOver={(e) => { e.preventDefault(); setDragActiveModal(true); }}
                  onDragLeave={() => setDragActiveModal(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveModal(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleProcessFileUpload(e.dataTransfer.files[0], (fileObj) => {
                        setNewImage(fileObj.url);
                      });
                    }
                  }}
                >
                  {newImage ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-100">
                        <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewImage("")}
                          className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1 rounded-full shadow transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full py-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleProcessFileUpload(e.target.files[0], (fileObj) => {
                              setNewImage(fileObj.url);
                            });
                          }
                        }}
                      />
                      <Camera size={22} className="text-slate-400 mb-1" />
                      <p className="text-xs font-semibold text-slate-700">Kéo thả ảnh mặt tiền cơ sở hoặc <span className="text-emerald-600 hover:underline font-bold">chọn từ thiết bị</span></p>
                    </label>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-xs sm:text-sm font-semibold"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-xs sm:text-sm"
                >
                  Đăng ký Cơ sở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-indigo-950 text-white p-4 px-6 flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                <Pencil size={18} className="text-indigo-400" />
                Chỉnh sửa Thông tin Cơ sở Kinh doanh
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBusiness} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Group 1: Thông tin Cơ sở Kinh doanh & Giấy phép */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Store size={14} className="text-amber-600" />
                  1. Thông tin Cơ sở Kinh doanh & Giấy phép
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block">Tên Cơ sở Kinh doanh / Hộ cá thể *</label>
                    <input 
                      type="text" 
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Mã cơ sở / Mã nội bộ</label>
                    <input 
                      type="text" 
                      value={editInternalCode}
                      onChange={(e) => setEditInternalCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Số Giấy phép KD / Mã đăng ký</label>
                    <input 
                      type="text" 
                      value={editTaxCode}
                      onChange={(e) => setEditTaxCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Loại hình cơ sở *</label>
                    <select
                      value={editBusinessType}
                      onChange={(e) => setEditBusinessType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Hộ kinh doanh">Hộ kinh doanh cá thể</option>
                      <option value="Cơ sở kinh doanh khác">Cơ sở kinh doanh tại chỗ</option>
                      <option value="Doanh nghiệp tư nhân">Cơ sở tư nhân dịch vụ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Số lượng lao động tại cơ sở</label>
                    <input 
                      type="number"
                      min={1}
                      value={editEmployeeCount}
                      onChange={(e) => setEditEmployeeCount(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Nhóm ngành nghề *</label>
                    <select
                      value={editIndustryGroup}
                      onChange={(e) => {
                        setEditIndustryGroup(e.target.value);
                        if (e.target.value === "Lưu trú & Cho thuê") {
                          setEditIsAccommodation(true);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      {INDUSTRY_SECTORS.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.icon} {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Lĩnh vực cụ thể *</label>
                    <input 
                      type="text" 
                      required
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Ngày bắt đầu hoạt động</label>
                    <input 
                      type="text" 
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Địa điểm, Mặt bằng & Liên kết Địa bàn KP3 */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <MapPin size={14} className="text-emerald-600" />
                  2. Địa điểm, Mặt bằng Kinh doanh & Liên kết Địa bàn
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block">Địa chỉ cơ sở *</label>
                    <input 
                      type="text" 
                      required
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Tuyến đường / Phân khu *</label>
                    <select
                      value={editStreetArea}
                      onChange={(e) => setEditStreetArea(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
                      <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
                      <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
                      <option value="Khu dân cư nội bộ KP3">Khu dân cư nội bộ KP3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Loại mặt bằng *</label>
                    <select
                      value={editPremisesType}
                      onChange={(e) => setEditPremisesType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Nhà phố">Nhà phố</option>
                      <option value="Cửa hàng">Cửa hàng</option>
                      <option value="Văn phòng">Văn phòng</option>
                      <option value="Nhà xưởng">Nhà xưởng</option>
                      <option value="Ki-ốt">Ki-ốt</option>
                      <option value="Địa điểm thuê">Địa điểm thuê</option>
                      <option value="Chung cư / Căn hộ">Chung cư / Căn hộ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Chủ sở hữu / Quản lý mặt bằng</label>
                    <input 
                      type="text" 
                      value={editPremisesOwner}
                      onChange={(e) => setEditPremisesOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Mã hộ dân KP3 liên kết</label>
                    <input 
                      type="text" 
                      value={editLinkedHouseholdCode}
                      onChange={(e) => setEditLinkedHouseholdCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Tọa độ định vị GPS Google</label>
                  <input 
                    type="text" 
                    value={editCoordinates}
                    onChange={(e) => setEditCoordinates(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Group 3: Người đại diện & Đầu mối Liên hệ Địa phương */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <UserCheck size={14} className="text-blue-600" />
                  3. Người đại diện & Đầu mối Liên hệ Địa phương
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Người đại diện pháp luật / Chủ cơ sở *</label>
                    <input 
                      type="text" 
                      required
                      value={editOwner}
                      onChange={(e) => setEditOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Số điện thoại liên hệ *</label>
                    <input 
                      type="text" 
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Người trực tiếp quản lý cơ sở tại chỗ</label>
                    <input 
                      type="text" 
                      value={editSiteManager}
                      onChange={(e) => setEditSiteManager(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                    <Phone size={12} className="text-blue-700" />
                    Đầu mối phối hợp khi địa phương tổ chức khảo sát / tuyên truyền / nhiệm vụ:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Họ tên đầu mối</label>
                      <input 
                        type="text" 
                        value={editFocalPointName}
                        onChange={(e) => setEditFocalPointName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Số điện thoại công vụ</label>
                      <input 
                        type="text" 
                        value={editFocalPointPhone}
                        onChange={(e) => setEditFocalPointPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Vai trò đầu mối</label>
                      <input 
                        type="text" 
                        value={editFocalPointRole}
                        onChange={(e) => setEditFocalPointRole(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: Tình hình Hoạt động & Lao động */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <Users2 size={14} className="text-purple-600" />
                  4. Tình hình Hoạt động & Lực lượng Lao động
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Tổng số lao động *</label>
                    <input 
                      type="number" 
                      min="1"
                      value={editEmployeeCount}
                      onChange={(e) => setEditEmployeeCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">LĐ thường trú KP3</label>
                    <input 
                      type="number" 
                      min="0"
                      value={editLocalWorkers}
                      onChange={(e) => setEditLocalWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">LĐ tạm trú</label>
                    <input 
                      type="number" 
                      min="0"
                      value={editTemporaryWorkers}
                      onChange={(e) => setEditTemporaryWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">LĐ người nước ngoài</label>
                    <input 
                      type="number" 
                      min="0"
                      value={editForeignWorkersCount}
                      onChange={(e) => setEditForeignWorkersCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Nhu cầu Hỗ trợ & Khó khăn do cơ sở tự nguyện cung cấp */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                  <HelpCircle size={14} className="text-amber-600" />
                  5. Nhu cầu Hỗ trợ & Khó khăn do Cơ sở Tự nguyện Phản ánh
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 block">Lĩnh vực cơ sở đề xuất hỗ trợ (chọn nhanh):</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      "Vốn vay chính sách / ưu đãi",
                      "Hướng dẫn PCCC & ANTT",
                      "Hướng dẫn An toàn thực phẩm",
                      "Mặt bằng & thủ tục thuê đất",
                      "Giới thiệu nguồn lao động",
                      "Hỗ trợ thủ tục hành chính địa phương"
                    ].map((need, idx) => {
                      const checked = editSupportNeeds.includes(need);
                      return (
                        <label key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer text-[11px]">
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditSupportNeeds([...editSupportNeeds, need]);
                              } else {
                                setEditSupportNeeds(editSupportNeeds.filter(n => n !== need));
                              }
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                          />
                          <span className="text-slate-800 font-medium">{need}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Ý kiến khó khăn / Kiến nghị gửi Chi bộ & Ban ĐH KP3:</label>
                  <textarea 
                    rows={2}
                    value={editSupportNotes}
                    onChange={(e) => setEditSupportNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              {/* Group 2: Chuyên biệt Nhà trọ / Nhà nghỉ (Số phòng, số tầng) */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editIsAccommodation}
                      onChange={(e) => setEditIsAccommodation(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300"
                    />
                    <span className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                      <Building size={16} className="text-amber-700" />
                      Đây là cơ sở kinh doanh Nhà trọ, Nhà nghỉ, Khách sạn lưu trú
                    </span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-200/60 px-2 py-0.5 rounded-full">
                    {editIsAccommodation ? "Đang bật" : "Tắt"}
                  </span>
                </div>

                {editIsAccommodation && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Số tầng *</label>
                      <input 
                        type="number" 
                        min="1"
                        value={editSoTang}
                        onChange={(e) => setEditSoTang(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Số phòng *</label>
                      <input 
                        type="number" 
                        min="1"
                        value={editSoPhong}
                        onChange={(e) => setEditSoPhong(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Số người lưu trú</label>
                      <input 
                        type="number" 
                        min="0"
                        value={editSoNguoiLuuTru}
                        onChange={(e) => setEditSoNguoiLuuTru(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">Giá thuê tham khảo</label>
                      <input 
                        type="text" 
                        value={editGiaThueTrungBinh}
                        onChange={(e) => setEditGiaThueTrungBinh(e.target.value)}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Group 3: Thông tin Địa chính & Tải lên Sổ đỏ (PDF / Hình ảnh) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-indigo-600" />
                  3. Thông tin Địa chính & Giấy chứng nhận QSDĐ (Sổ đỏ)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Tờ bản đồ số</label>
                    <input 
                      type="text" 
                      value={editToBanDo}
                      onChange={(e) => setEditToBanDo(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Số thửa đất</label>
                    <input 
                      type="text" 
                      value={editSoThua}
                      onChange={(e) => setEditSoThua(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Diện tích (m²)</label>
                    <input 
                      type="text" 
                      value={editDienTich}
                      onChange={(e) => setEditDienTich(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Loại đất</label>
                    <input 
                      type="text" 
                      value={editLoaiDat}
                      onChange={(e) => setEditLoaiDat(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Tên chủ sử dụng đất</label>
                    <input 
                      type="text" 
                      value={editTenChuSuDung}
                      onChange={(e) => setEditTenChuSuDung(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Số GCN (Sổ đỏ)</label>
                    <input 
                      type="text" 
                      value={editSoGcn}
                      onChange={(e) => setEditSoGcn(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Số vào sổ cấp GCN</label>
                    <input 
                      type="text" 
                      value={editSoVaoSo}
                      onChange={(e) => setEditSoVaoSo(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Sổ đỏ Upload Field (Hỗ trợ PDF & Hình ảnh) */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-700 block flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Paperclip size={13} className="text-indigo-600" />
                      Tệp Sổ đỏ / Giấy chứng nhận QSDĐ (PDF hoặc Hình ảnh)
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG &lt; 25MB</span>
                  </label>

                  <div 
                    className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                      dragActiveEditSoDo ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 bg-white"
                    }`}
                    onDragEnter={() => setDragActiveEditSoDo(true)}
                    onDragOver={(e) => { e.preventDefault(); setDragActiveEditSoDo(true); }}
                    onDragLeave={() => setDragActiveEditSoDo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveEditSoDo(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleProcessFileUpload(e.dataTransfer.files[0], (fileObj) => {
                          setEditSoDoFile(fileObj);
                        });
                      }
                    }}
                  >
                    {editSoDoFile ? (
                      <div className="flex items-center justify-between w-full p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2">
                          {editSoDoFile.type === "pdf" ? <FileText size={20} className="text-rose-600" /> : <ImageIcon size={20} className="text-blue-600" />}
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">{editSoDoFile.name}</span>
                            <span className="text-[10px] text-emerald-700 font-mono">Đã tải lên • {editSoDoFile.size}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditSoDoFile(null)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center w-full py-2">
                        <input 
                          type="file" 
                          accept=".pdf,image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleProcessFileUpload(e.target.files[0], (fileObj) => {
                                setEditSoDoFile(fileObj);
                              });
                            }
                          }}
                        />
                        <Upload size={22} className="text-indigo-500 mb-1" />
                        <p className="text-xs font-semibold text-slate-700">Kéo thả tệp PDF Sổ đỏ hoặc ảnh tại đây, hoặc <span className="text-indigo-600 hover:underline font-bold">chọn tệp từ máy</span></p>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Group 4: Hình ảnh đại diện */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                  <Camera size={14} className="text-indigo-600" />
                  4. Hình ảnh đại diện cơ sở
                </label>
                
                <div 
                  className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                    dragActiveEditModal ? "border-indigo-500 bg-indigo-50/30" : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                  onDragEnter={() => setDragActiveEditModal(true)}
                  onDragOver={(e) => { e.preventDefault(); setDragActiveEditModal(true); }}
                  onDragLeave={() => setDragActiveEditModal(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveEditModal(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleProcessFileUpload(e.dataTransfer.files[0], (fileObj) => {
                        setEditImage(fileObj.url);
                      });
                    }
                  }}
                >
                  {editImage ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-100">
                        <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImage("")}
                          className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1 rounded-full shadow transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full py-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleProcessFileUpload(e.target.files[0], (fileObj) => {
                              setEditImage(fileObj.url);
                            });
                          }
                        }}
                      />
                      <Camera size={22} className="text-slate-400 mb-1" />
                      <p className="text-xs font-semibold text-slate-700">Kéo thả ảnh tại đây, hoặc <span className="text-indigo-600 hover:underline font-bold">chọn từ thiết bị</span></p>
                    </label>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-xs sm:text-sm font-semibold"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-xs sm:text-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Biên bản Kiểm tra định kỳ */}
      {showAddInspectionModal && selectedBusiness && (
        <div 
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center z-[70] p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddInspectionModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-700/40 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 p-4 sm:px-6 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Thêm Biên bản Kiểm tra định kỳ</h3>
                  <p className="text-[11px] text-emerald-200/80 truncate max-w-[280px] sm:max-w-xs">
                    Cơ sở: {selectedBusiness.name}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddInspectionModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveAddInspection} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Ngày kiểm tra & Kết quả đánh giá */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Ngày kiểm tra <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={formInspDate}
                    onChange={(e) => setFormInspDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Kết quả đánh giá <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formInspResult}
                    onChange={(e) => setFormInspResult(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white font-semibold"
                  >
                    <option value="Đạt chuẩn">✅ Đạt chuẩn</option>
                    <option value="Cảnh cáo">⚠️ Cảnh cáo</option>
                    <option value="Yêu cầu khắc phục">🛠️ Yêu cầu khắc phục</option>
                    <option value="Không đạt">❌ Không đạt</option>
                  </select>
                </div>
              </div>

              {/* Đơn vị / Cán bộ kiểm tra */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Đoàn / Đơn vị kiểm tra <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Đoàn kiểm tra liên ngành Phường An Phú"
                  value={formInspInspector}
                  onChange={(e) => setFormInspInspector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
                {/* Gợi ý nhanh */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Gợi ý nhanh:</span>
                  {[
                    "Đoàn liên ngành Phường An Phú",
                    "Cảnh sát PCCC & CNCH",
                    "Trạm Y tế Phường An Phú",
                    "Tổ QL Đô thị & Môi trường KP3",
                    "Công an khu vực Phường"
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormInspInspector(sug)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung biên bản kiểm tra */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Nội dung kiểm tra & Hiện trạng ghi nhận <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Ghi nhận hiện trạng cơ sở, các nội dung kiểm tra ATTP, PCCC, giấy phép, niêm yết giá..."
                  value={formInspNote}
                  onChange={(e) => setFormInspNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-xs leading-relaxed"
                />
              </div>

              {/* Yêu cầu / Đề xuất khắc phục */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-500" />
                  Yêu cầu / Biện pháp khắc phục (nếu có)
                </label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Nạp sạc lại bình PCCC, thời hạn khắc phục 7 ngày..."
                  value={formInspRecommendation}
                  onChange={(e) => setFormInspRecommendation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
              </div>

              {/* Hình thức xử lý vi phạm / Xử phạt */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-rose-500" />
                  Hình thức xử lý / Mức phạt (nếu có)
                </label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Nhắc nhở, Cảnh cáo lần 1, Phạt VPHC 1.500.000đ..."
                  value={formInspPenalties}
                  onChange={(e) => setFormInspPenalties(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
              </div>

              {/* Footer buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowAddInspectionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-semibold text-xs"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Lưu biên bản kiểm tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Biên bản Kiểm tra */}
      {showEditInspectionModal && editingInspection && selectedBusiness && (
        <div 
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center z-[70] p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => { setShowEditInspectionModal(false); setEditingInspection(null); }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-700/40 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 p-4 sm:px-6 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Chỉnh sửa Biên bản Kiểm tra</h3>
                  <p className="text-[11px] text-indigo-200/80 truncate max-w-[280px] sm:max-w-xs">
                    Mã đợt: {editingInspection.id} • {selectedBusiness.name}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowEditInspectionModal(false); setEditingInspection(null); }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEditInspection} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Ngày kiểm tra & Kết quả đánh giá */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Ngày kiểm tra <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={formInspDate}
                    onChange={(e) => setFormInspDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Kết quả đánh giá <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formInspResult}
                    onChange={(e) => setFormInspResult(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-semibold"
                  >
                    <option value="Đạt chuẩn">✅ Đạt chuẩn</option>
                    <option value="Cảnh cáo">⚠️ Cảnh cáo</option>
                    <option value="Yêu cầu khắc phục">🛠️ Yêu cầu khắc phục</option>
                    <option value="Không đạt">❌ Không đạt</option>
                  </select>
                </div>
              </div>

              {/* Đơn vị / Cán bộ kiểm tra */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Đoàn / Đơn vị kiểm tra <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Đoàn kiểm tra liên ngành Phường An Phú"
                  value={formInspInspector}
                  onChange={(e) => setFormInspInspector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs"
                />
              </div>

              {/* Nội dung biên bản kiểm tra */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Nội dung kiểm tra & Hiện trạng ghi nhận <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  required
                  rows={3}
                  value={formInspNote}
                  onChange={(e) => setFormInspNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs leading-relaxed"
                />
              </div>

              {/* Yêu cầu / Đề xuất khắc phục */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-500" />
                  Yêu cầu / Biện pháp khắc phục (nếu có)
                </label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Nạp sạc lại bình PCCC, thời hạn 7 ngày..."
                  value={formInspRecommendation}
                  onChange={(e) => setFormInspRecommendation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs"
                />
              </div>

              {/* Hình thức xử lý vi phạm */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-rose-500" />
                  Hình thức xử lý / Mức phạt (nếu có)
                </label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Cảnh cáo, xử phạt..."
                  value={formInspPenalties}
                  onChange={(e) => setFormInspPenalties(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs"
                />
              </div>

              {/* Footer buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => { setShowEditInspectionModal(false); setEditingInspection(null); }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-semibold text-xs"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Cập nhật thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Inspection Confirmation Dialog */}
      {inspectionToDelete && (
        <div className="fixed inset-0 bg-slate-900/65 flex items-center justify-center z-[80] p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Xóa biên bản kiểm tra?</h3>
                <p className="text-[11px] text-slate-500 font-mono">Ngày: {inspectionToDelete.date}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="font-semibold text-slate-800">{inspectionToDelete.inspector}</div>
              <div className="text-[11px] text-slate-600 line-clamp-2">{inspectionToDelete.note}</div>
              <div className="text-[10px] font-extrabold text-rose-700">Kết quả: {inspectionToDelete.result}</div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Biên bản kiểm tra định kỳ này sẽ bị xóa khỏi hồ sơ của cơ sở kinh doanh. Bạn có chắc chắn muốn xóa không?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectionToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteInspection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

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
