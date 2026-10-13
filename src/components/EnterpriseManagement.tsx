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
  Camera,
  Upload,
  Navigation,
  Compass,
  Check,
  Image as ImageIcon,
  Maximize2
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
  
  // Modals
  const [selectedEnterprise, setSelectedEnterprise] = useState<Business | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeLogModal, setShowChangeLogModal] = useState(false);

  // GIS Coordinate Pinning & Navigation Modal States
  const [gisPinModalEnterprise, setGisPinModalEnterprise] = useState<Business | null>(null);
  const [gisPinInput, setGisPinInput] = useState("");
  const [gisPinToast, setGisPinToast] = useState<string | null>(null);

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
      alert("Vui lòng nhập hoặc lấy tọa độ GIS!");
      return;
    }

    const updated = { ...gisPinModalEnterprise, coordinates: finalCoord };
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === updated.id ? updated : b));
    }
    if (selectedEnterprise && selectedEnterprise.id === updated.id) {
      setSelectedEnterprise(updated);
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
      setGisPinToast(`Đã đồng bộ tọa độ ${updated.name} lên bản đồ GIS!`);
      setTimeout(() => setGisPinToast(null), 3500);
    }
  };
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("Tất cả");
  const [scaleFilter, setScaleFilter] = useState<string>("Tất cả");
  const [streetFilter, setStreetFilter] = useState<string>("Tất cả");
  const [statusFilter, setStatusFilter] = useState<string>("Tất cả");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Change Log Form state
  const [changeType, setChangeType] = useState<BusinessChangeLog["type"]>("Khác");
  const [changeDate, setChangeDate] = useState(new Date().toISOString().split("T")[0]);
  const [changeDesc, setChangeDesc] = useState("");
  const [changeRecorder, setChangeRecorder] = useState("Cán bộ quản lý kinh tế KP3");

  // Add Enterprise Form state
  const [newName, setNewName] = useState("");
  const [newInternalCode, setNewInternalCode] = useState("");
  const [newTaxCode, setNewTaxCode] = useState("");
  const [newBusinessType, setNewBusinessType] = useState<"Công ty TNHH" | "Công ty Cổ phần" | "Doanh nghiệp tư nhân" | "Cơ sở kinh doanh khác">("Công ty TNHH");
  const [newEnterpriseScale, setNewEnterpriseScale] = useState<"Siêu nhỏ (< 5 LĐ)" | "Nhỏ (5 - 20 LĐ)" | "Vừa (20 - 50 LĐ)" | "Lớn (> 50 LĐ)">("Nhỏ (5 - 20 LĐ)");
  const [newType, setNewType] = useState("");
  const [newStartDate, setNewStartDate] = useState(new Date().toLocaleDateString("vi-VN"));
  const [newAddress, setNewAddress] = useState("");
  const [newStreetArea, setNewStreetArea] = useState("Mặt tiền Lương Định Của");
  const [newPremisesType, setNewPremisesType] = useState<"Văn phòng" | "Nhà phố" | "Cửa hàng" | "Nhà xưởng" | "Ki-ốt" | "Địa điểm thuê" | "Chung cư / Căn hộ">("Văn phòng");
  const [newPremisesOwner, setNewPremisesOwner] = useState("");
  const [newPremisesOwnerPhone, setNewPremisesOwnerPhone] = useState("");
  const [newLinkedHouseholdCode, setNewLinkedHouseholdCode] = useState("");
  const [newLegalRep, setNewLegalRep] = useState("");
  const [newLegalRepPhone, setNewLegalRepPhone] = useState("");
  const [newLegalRepEmail, setNewLegalRepEmail] = useState("");
  const [newSiteManager, setNewSiteManager] = useState("");
  const [newSiteManagerPhone, setNewSiteManagerPhone] = useState("");
  const [newFocalPointName, setNewFocalPointName] = useState("");
  const [newFocalPointPhone, setNewFocalPointPhone] = useState("");
  const [newFocalPointRole, setNewFocalPointRole] = useState("Đại diện phối hợp");
  const [newEmployeeCount, setNewEmployeeCount] = useState<number>(8);
  const [newLocalWorkers, setNewLocalWorkers] = useState<number>(3);
  const [newTemporaryWorkers, setNewTemporaryWorkers] = useState<number>(5);
  const [newForeignWorkersCount, setNewForeignWorkersCount] = useState<number>(0);
  const [newSupportNeeds, setNewSupportNeeds] = useState<string[]>([]);
  const [newSupportNotes, setNewSupportNotes] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newAdditionalImages, setNewAdditionalImages] = useState<string[]>([]);

  // Edit Enterprise Form state
  const [editName, setEditName] = useState("");
  const [editInternalCode, setEditInternalCode] = useState("");
  const [editTaxCode, setEditTaxCode] = useState("");
  const [editBusinessType, setEditBusinessType] = useState<"Công ty TNHH" | "Công ty Cổ phần" | "Doanh nghiệp tư nhân" | "Cơ sở kinh doanh khác">("Công ty TNHH");
  const [editEnterpriseScale, setEditEnterpriseScale] = useState<"Siêu nhỏ (< 5 LĐ)" | "Nhỏ (5 - 20 LĐ)" | "Vừa (20 - 50 LĐ)" | "Lớn (> 50 LĐ)">("Nhỏ (5 - 20 LĐ)");
  const [editType, setEditType] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editStreetArea, setEditStreetArea] = useState("Mặt tiền Lương Định Của");
  const [editPremisesType, setEditPremisesType] = useState<"Văn phòng" | "Nhà phố" | "Cửa hàng" | "Nhà xưởng" | "Ki-ốt" | "Địa điểm thuê" | "Chung cư / Căn hộ">("Văn phòng");
  const [editPremisesOwner, setEditPremisesOwner] = useState("");
  const [editPremisesOwnerPhone, setEditPremisesOwnerPhone] = useState("");
  const [editLinkedHouseholdCode, setEditLinkedHouseholdCode] = useState("");
  const [editLegalRep, setEditLegalRep] = useState("");
  const [editLegalRepPhone, setEditLegalRepPhone] = useState("");
  const [editLegalRepEmail, setEditLegalRepEmail] = useState("");
  const [editSiteManager, setEditSiteManager] = useState("");
  const [editSiteManagerPhone, setEditSiteManagerPhone] = useState("");
  const [editFocalPointName, setEditFocalPointName] = useState("");
  const [editFocalPointPhone, setEditFocalPointPhone] = useState("");
  const [editFocalPointRole, setEditFocalPointRole] = useState("");
  const [editEmployeeCount, setEditEmployeeCount] = useState<number>(1);
  const [editLocalWorkers, setEditLocalWorkers] = useState<number>(0);
  const [editTemporaryWorkers, setEditTemporaryWorkers] = useState<number>(0);
  const [editForeignWorkersCount, setEditForeignWorkersCount] = useState<number>(0);
  const [editSupportNeeds, setEditSupportNeeds] = useState<string[]>([]);
  const [editSupportNotes, setEditSupportNotes] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);

  // Lightbox preview modal state
  const [viewingImagePreview, setViewingImagePreview] = useState<{ url: string; caption: string } | null>(null);

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

  // Synchronize selected enterprise when data changes
  useEffect(() => {
    if (selectedEnterprise) {
      const updated = businesses.find(b => b.id === selectedEnterprise.id);
      if (updated) setSelectedEnterprise(updated);
    }
  }, [businesses]);

  // Modal scroll lock
  useEffect(() => {
    const isAnyModalOpen = showDetailModal || showAddModal || showEditModal || showChangeLogModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailModal, showAddModal, showEditModal, showChangeLogModal]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showChangeLogModal) setShowChangeLogModal(false);
        else if (showEditModal) setShowEditModal(false);
        else if (showAddModal) setShowAddModal(false);
        else if (showDetailModal) setShowDetailModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showChangeLogModal, showEditModal, showAddModal, showDetailModal]);

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

      // Status filter
      if (statusFilter !== "Tất cả") {
        if (item.status !== statusFilter) return false;
      }

      return true;
    });
  }, [enterprises, searchTerm, typeFilter, scaleFilter, streetFilter, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, scaleFilter, streetFilter, statusFilter]);

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

  // Helper to get linked household
  const getLinkedHh = (b: Business): Household | undefined => {
    if (b.linkedHouseholdCode) {
      return households.find(h => h.code.toLowerCase() === b.linkedHouseholdCode?.toLowerCase());
    }
    if (b.address) {
      return households.find(h => b.address.toLowerCase().includes(h.address.toLowerCase()));
    }
    return undefined;
  };

  // Helper to get foreign residents working at this enterprise
  const getEnterpriseForeignResidents = (b: Business): Resident[] => {
    return residents.filter(r => {
      const isForeign = r.nationality && r.nationality !== "Việt Nam";
      if (!isForeign) return false;
      if (r.workplace && b.name && r.workplace.toLowerCase().includes(b.name.toLowerCase())) return true;
      if (b.linkedHouseholdCode && r.householdId === b.linkedHouseholdCode) return true;
      return false;
    });
  };

  // Handle Open Detail Modal
  const handleOpenDetailModal = (ent: Business) => {
    setSelectedEnterprise(ent);
    setShowDetailModal(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (ent: Business) => {
    setSelectedEnterprise(ent);
    setEditName(ent.name);
    setEditInternalCode(ent.internalCode || `DN-KP3-${ent.id}`);
    setEditTaxCode(ent.taxCode || "");
    setEditBusinessType((ent.businessType as any) || "Công ty TNHH");
    setEditEnterpriseScale(getEnterpriseScaleLabel(ent));
    setEditType(ent.type || "Thương mại dịch vụ");
    setEditStartDate(ent.startDate || "01/01/2024");
    setEditAddress(ent.address);
    setEditStreetArea(ent.streetArea || (ent.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của"));
    setEditPremisesType((ent.premisesType as any) || "Văn phòng");
    setEditPremisesOwner(ent.premisesOwner || "");
    setEditPremisesOwnerPhone(ent.premisesOwnerPhone || "");
    setEditLinkedHouseholdCode(ent.linkedHouseholdCode || "");
    setEditLegalRep(ent.legalRepresentative || ent.owner);
    setEditLegalRepPhone(ent.legalRepPhone || ent.phone);
    setEditLegalRepEmail(ent.legalRepEmail || "");
    setEditSiteManager(ent.siteManager || ent.owner);
    setEditSiteManagerPhone(ent.siteManagerPhone || ent.phone);
    setEditFocalPointName(ent.focalPointName || ent.owner);
    setEditFocalPointPhone(ent.focalPointPhone || ent.phone);
    setEditFocalPointRole(ent.focalPointRole || "Đại diện phối hợp");
    setEditEmployeeCount(ent.employeeCount || 5);
    setEditLocalWorkers(ent.localWorkersCount ?? Math.floor((ent.employeeCount || 5) / 2));
    setEditTemporaryWorkers(ent.temporaryWorkersCount ?? Math.ceil((ent.employeeCount || 5) / 2));
    setEditForeignWorkersCount(ent.foreignWorkersCount || (ent.foreignWorkers?.length || 0));
    setEditSupportNeeds(ent.supportNeeds || []);
    setEditSupportNotes(ent.supportNotes || "");
    setEditImage(ent.image || "");
    setEditImages(ent.images || (ent.image ? [ent.image] : []));
    setShowEditModal(true);
  };

  // Handle Update Business Status
  const handleChangeStatus = (status: Business["status"]) => {
    if (!selectedEnterprise) return;
    onUpdateStatus(selectedEnterprise.id, status);
    showToast(`Đã cập nhật trạng thái doanh nghiệp thành: ${status}`, "success");
  };

  // Handle Delete Enterprise
  const handleDeleteEnterprise = () => {
    if (!selectedEnterprise) return;
    if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ doanh nghiệp "${selectedEnterprise.name}" khỏi hệ thống?`)) {
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.filter(b => b.id !== selectedEnterprise.id));
      }
      setShowDetailModal(false);
      showToast("Đã xóa hồ sơ doanh nghiệp thành công", "success");
    }
  };

  // Handle Add Enterprise
  const handleCreateEnterprise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Vui lòng nhập tên doanh nghiệp!", "warning");
      return;
    }

    const nextId = "B" + (businesses.length + 1).toString().padStart(3, "0");
    const code = newInternalCode.trim() || `DN-KP3-${nextId}`;

    const newEnt: Business = {
      id: nextId,
      internalCode: code,
      name: newName.trim(),
      taxCode: newTaxCode.trim() || "03" + Math.floor(10000000 + Math.random() * 90000000),
      businessType: newBusinessType,
      enterpriseScale: newEnterpriseScale,
      type: newType.trim() || "Dịch vụ thương mại",
      industryGroup: "Kinh doanh & Dịch vụ",
      owner: newLegalRep.trim() || "Chưa cập nhật",
      phone: newLegalRepPhone.trim() || "0900000000",
      address: newAddress.trim() || "Lương Định Của, Phường An Phú",
      licenseNumber: `GP-DN-${nextId}/AP`,
      status: "Đang hoạt động",
      startDate: newStartDate,
      verificationSource: "Ban Điều hành & Chi bộ KP3 ghi nhận",
      streetArea: newStreetArea,
      premisesType: newPremisesType,
      premisesOwner: newPremisesOwner.trim(),
      premisesOwnerPhone: newPremisesOwnerPhone.trim(),
      linkedHouseholdCode: newLinkedHouseholdCode.trim(),
      legalRepresentative: newLegalRep.trim() || "Chưa cập nhật",
      legalRepPhone: newLegalRepPhone.trim(),
      legalRepEmail: newLegalRepEmail.trim(),
      siteManager: newSiteManager.trim(),
      siteManagerPhone: newSiteManagerPhone.trim(),
      focalPointName: newFocalPointName.trim() || newLegalRep.trim(),
      focalPointPhone: newFocalPointPhone.trim() || newLegalRepPhone.trim(),
      focalPointRole: newFocalPointRole.trim(),
      employeeCount: newEmployeeCount || 1,
      localWorkersCount: newLocalWorkers,
      temporaryWorkersCount: newTemporaryWorkers,
      foreignWorkersCount: newForeignWorkersCount,
      supportNeeds: newSupportNeeds,
      supportNotes: newSupportNotes.trim(),
      safetyCertified: true,
      image: newImage || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
      images: newAdditionalImages.length > 0 
        ? (newImage ? [newImage, ...newAdditionalImages] : newAdditionalImages)
        : (newImage ? [newImage] : []),
      changeHistory: [
        {
          id: `CHG-${nextId}-INIT`,
          date: new Date().toLocaleDateString("vi-VN"),
          type: "Mở mới",
          description: `Ghi nhận thành lập & đăng ký hoạt động doanh nghiệp trên địa bàn KP3`,
          recordedBy: "Cán bộ quản trị địa bàn"
        }
      ]
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses([newEnt, ...businesses]);
    }
    setShowAddModal(false);
    showToast(`Đã thêm mới hồ sơ doanh nghiệp "${newEnt.name}" thành công!`, "success");

    // Reset fields
    setNewName("");
    setNewInternalCode("");
    setNewTaxCode("");
    setNewAddress("");
    setNewLegalRep("");
    setNewLegalRepPhone("");
    setNewLegalRepEmail("");
    setNewSiteManager("");
    setNewFocalPointName("");
    setNewFocalPointPhone("");
    setNewSupportNeeds([]);
    setNewSupportNotes("");
    setNewImage("");
    setNewAdditionalImages([]);
  };

  // Handle Update Enterprise
  const handleUpdateEnterprise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnterprise) return;

    const finalImage = editImage || selectedEnterprise.image;
    const finalImages = editImages.length > 0 
      ? editImages 
      : (finalImage ? [finalImage] : selectedEnterprise.images || []);

    const updated: Business = {
      ...selectedEnterprise,
      name: editName.trim(),
      internalCode: editInternalCode.trim(),
      taxCode: editTaxCode.trim(),
      businessType: editBusinessType,
      enterpriseScale: editEnterpriseScale,
      type: editType.trim(),
      startDate: editStartDate,
      address: editAddress.trim(),
      streetArea: editStreetArea,
      premisesType: editPremisesType,
      premisesOwner: editPremisesOwner.trim(),
      premisesOwnerPhone: editPremisesOwnerPhone.trim(),
      linkedHouseholdCode: editLinkedHouseholdCode.trim(),
      legalRepresentative: editLegalRep.trim(),
      legalRepPhone: editLegalRepPhone.trim(),
      legalRepEmail: editLegalRepEmail.trim(),
      siteManager: editSiteManager.trim(),
      siteManagerPhone: editSiteManagerPhone.trim(),
      focalPointName: editFocalPointName.trim(),
      focalPointPhone: editFocalPointPhone.trim(),
      focalPointRole: editFocalPointRole.trim(),
      employeeCount: editEmployeeCount,
      localWorkersCount: editLocalWorkers,
      temporaryWorkersCount: editTemporaryWorkers,
      foreignWorkersCount: editForeignWorkersCount,
      supportNeeds: editSupportNeeds,
      supportNotes: editSupportNotes.trim(),
      image: finalImage,
      images: finalImages
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === updated.id ? updated : b));
    }
    setSelectedEnterprise(updated);
    setShowEditModal(false);
    showToast(`Đã cập nhật hồ sơ doanh nghiệp "${updated.name}" thành công!`, "success");
  };

  // Direct change avatar photo in Detail Panel
  const handleChangeAvatarPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEnterprise || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newImg = reader.result as string;
      const existingImages = selectedEnterprise.images || (selectedEnterprise.image ? [selectedEnterprise.image] : []);
      const updatedImages = existingImages.includes(newImg) ? existingImages : [newImg, ...existingImages];
      const updated: Business = {
        ...selectedEnterprise,
        image: newImg,
        images: updatedImages
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.map(b => b.id === selectedEnterprise.id ? updated : b));
      }
      setSelectedEnterprise(updated);
      showToast("Đã cập nhật ảnh đại diện doanh nghiệp thành công!", "success");
    };
    reader.readAsDataURL(file);
  };

  // Direct upload photo to gallery in Detail Panel
  const handleAddGalleryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEnterprise || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newImg = reader.result as string;
      const existing = selectedEnterprise.images || (selectedEnterprise.image ? [selectedEnterprise.image] : []);
      const updatedImages = [...existing, newImg];
      const updated: Business = {
        ...selectedEnterprise,
        images: updatedImages
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(businesses.map(b => b.id === selectedEnterprise.id ? updated : b));
      }
      setSelectedEnterprise(updated);
      showToast("Đã thêm ảnh vào album ảnh cơ sở doanh nghiệp!", "success");
    };
    reader.readAsDataURL(file);
  };

  // Remove photo from gallery in Detail Panel
  const handleRemoveGalleryPhoto = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedEnterprise) return;
    const existing = selectedEnterprise.images || (selectedEnterprise.image ? [selectedEnterprise.image] : []);
    const updatedImages = existing.filter((_, idx) => idx !== indexToRemove);
    const updated: Business = {
      ...selectedEnterprise,
      images: updatedImages,
      // If we removed the current avatar, fallback to the next available image
      image: selectedEnterprise.image === existing[indexToRemove] 
        ? (updatedImages[0] || "") 
        : selectedEnterprise.image
    };
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === selectedEnterprise.id ? updated : b));
    }
    setSelectedEnterprise(updated);
    showToast("Đã xóa ảnh khỏi album!", "success");
  };

  // Handle Save Change Log
  const handleSaveChangeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnterprise) return;
    if (!changeDesc.trim()) {
      showToast("Vui lòng nhập nội dung biến động!", "warning");
      return;
    }

    const [yyyy, mm, dd] = changeDate.includes("-") ? changeDate.split("-") : ["2026", "10", "10"];
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    const newLog: BusinessChangeLog = {
      id: `CHG-${selectedEnterprise.id}-${Date.now().toString().slice(-4)}`,
      date: formattedDate,
      type: changeType,
      description: changeDesc.trim(),
      recordedBy: changeRecorder.trim() || "Cán bộ KP3"
    };

    const updatedHistory = [newLog, ...(selectedEnterprise.changeHistory || [])];
    const updated: Business = {
      ...selectedEnterprise,
      changeHistory: updatedHistory,
      status: changeType === "Tạm ngừng" ? "Tạm ngưng" : changeType === "Hoạt động trở lại" ? "Đang hoạt động" : selectedEnterprise.status
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.map(b => b.id === updated.id ? updated : b));
    }
    setSelectedEnterprise(updated);
    setShowChangeLogModal(false);
    setChangeDesc("");
    showToast("Đã ghi nhận biến động doanh nghiệp thành công!", "success");
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
      {/* Upper header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-400/30">
              <Building2 size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Phân hệ Quản lý Doanh nghiệp Vừa & Nhỏ (DNNVV) KP3
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
            Nắm bắt tình hình hoạt động kinh tế địa bàn, quản lý đầu mối liên hệ công vụ, lao động, chuyên gia nước ngoài, biến động cơ sở và hỗ trợ Chi bộ - Ban Điều hành Khu phố 3
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-white/20 transition-all cursor-pointer shadow-xs"
            title="Xuất file báo cáo doanh nghiệp định dạng CSV/Excel"
          >
            <Download size={15} /> Xuất CSV
          </button>
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer hover:shadow-indigo-500/20"
          >
            <Plus size={16} /> Đăng ký Doanh nghiệp Mới
          </button>
        </div>
      </div>

      {/* Main Subsystem Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMainTab("list")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === "list"
                ? "bg-white text-indigo-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Building2 size={16} className={activeMainTab === "list" ? "text-indigo-600" : "text-slate-400"} />
            <span>Danh mục Doanh nghiệp & Hồ sơ DNNVV</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeMainTab === "list" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
            }`}>
              {enterprises.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("economicReport")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === "economicReport"
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileText size={16} className={activeMainTab === "economicReport" ? "text-white" : "text-slate-400"} />
            <span>Báo cáo Kinh tế Địa bàn & Biến động</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeMainTab === "economicReport" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              Bí thư / Trưởng KP
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden md:flex items-center gap-1.5 px-3 py-1 bg-indigo-50/50 rounded-lg border border-indigo-100 text-indigo-900">
          <Sparkles size={13} className="text-indigo-600" />
          <span>Theo dõi độc lập tổ chức kinh tế, MST, đầu mối công vụ & NĐ 80/2021</span>
        </div>
      </div>

      {/* VIEW 1: DANH MỤC DOANH NGHIỆP & HỒ SƠ */}
      {activeMainTab === "list" ? (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                <Building2 size={20} />
              </div>
              <div>
                <span className="text-[10.5px] font-semibold text-slate-400 block uppercase tracking-wider">Tổng doanh nghiệp</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900">{enterprises.length}</span>
                  <span className="text-[10px] text-slate-500">đơn vị</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                <Briefcase size={20} />
              </div>
              <div>
                <span className="text-[10.5px] font-semibold text-slate-400 block uppercase tracking-wider">Công ty TNHH</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-blue-900">{tnhhCount}</span>
                  <span className="text-[10px] text-blue-700 font-bold">({((tnhhCount / (enterprises.length || 1)) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[10.5px] font-semibold text-slate-400 block uppercase tracking-wider">Cổ phần & DNTN</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-teal-900">{cpCount + dntnCount}</span>
                  <span className="text-[10px] text-teal-700">cơ sở</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-100 bg-purple-50/20 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Users2 size={20} />
              </div>
              <div>
                <span className="text-[10.5px] font-semibold text-purple-800 block uppercase tracking-wider">Lực lượng lao động</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-purple-950">{totalEmployees}</span>
                  <span className="text-[10px] text-purple-700 font-bold">({totalForeignWorkers} NN)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <span className="text-[10.5px] font-semibold text-amber-800 block uppercase tracking-wider">Đề xuất hỗ trợ</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-amber-950">{totalSupportNeeds}</span>
                  <span className="text-[10px] text-amber-700 font-bold">doanh nghiệp</span>
                </div>
              </div>
            </div>
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
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "card" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Xem dạng thẻ"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "table" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Xem dạng bảng"
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Loại hình DN</label>
                <select
                  id="enterprise-type-filter"
                  name="enterpriseTypeFilter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="Tất cả">Tất cả loại hình</option>
                  <option value="Công ty TNHH">Công ty TNHH</option>
                  <option value="Công ty Cổ phần">Công ty Cổ phần</option>
                  <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                  <option value="Cơ sở kinh doanh khác">Cơ sở khác</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quy mô lao động (NĐ 80)</label>
                <select
                  id="enterprise-scale-filter"
                  name="enterpriseScaleFilter"
                  value={scaleFilter}
                  onChange={(e) => setScaleFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="Tất cả">Tất cả quy mô</option>
                  <option value="Siêu nhỏ (< 5 LĐ)">Siêu nhỏ (&lt; 5 LĐ)</option>
                  <option value="Nhỏ (5 - 20 LĐ)">Nhỏ (5 - 20 LĐ)</option>
                  <option value="Vừa (20 - 50 LĐ)">Vừa (20 - 50 LĐ)</option>
                  <option value="Lớn (> 50 LĐ)">Lớn (&gt; 50 LĐ)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tuyến đường</label>
                <select
                  id="enterprise-street-filter"
                  name="enterpriseStreetFilter"
                  value={streetFilter}
                  onChange={(e) => setStreetFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="Tất cả">Tất cả tuyến đường</option>
                  <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
                  <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
                  <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
                  <option value="Khu dân cư nội bộ KP3">KDC nội bộ KP3</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Trạng thái</label>
                <select
                  id="enterprise-status-filter"
                  name="enterpriseStatusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  <option value="Đang hoạt động">Đang hoạt động</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Tạm ngưng">Tạm ngưng</option>
                  <option value="Chuyển địa điểm">Chuyển địa điểm</option>
                </select>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginatedEnterprises.map((ent) => {
                const scale = getEnterpriseScaleLabel(ent);
                const foreigners = ent.foreignWorkersCount || (ent.foreignWorkers?.length || 0);

                return (
                  <div
                    key={ent.id}
                    onClick={() => handleOpenDetailModal(ent)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group"
                  >
                    <div>
                      {/* Image header */}
                      <div className="relative h-36 bg-slate-100 overflow-hidden">
                        <img 
                          src={ent.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400"} 
                          alt={ent.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        
                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center text-[10px] font-bold">
                          <span className="font-mono bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-md border border-white/20">
                            {ent.internalCode || `DN-KP3-${ent.id}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            ent.status === "Đang hoạt động" ? "bg-emerald-500 text-white" :
                            ent.status === "Chờ duyệt" ? "bg-amber-500 text-white" :
                            "bg-rose-500 text-white"
                          }`}>
                            {ent.status}
                          </span>
                        </div>

                        {/* Bottom Name on image */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                          <span className="text-[10px] text-indigo-300 font-bold block uppercase tracking-wider">
                            {ent.businessType || "Công ty TNHH"}
                          </span>
                          <h3 className="font-bold text-sm leading-snug line-clamp-1 text-white">
                            {ent.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 space-y-2.5 text-xs">
                        {/* MST & Scale */}
                        <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-100">
                          <span className="text-slate-500 font-mono">
                            MST: <strong className="text-slate-800">{ent.taxCode || "Đang xác minh"}</strong>
                          </span>
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                            {scale}
                          </span>
                        </div>

                        {/* Representatives */}
                        <div className="space-y-1 text-slate-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <User size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">ĐDPL: <strong className="text-slate-800">{ent.legalRepresentative || ent.owner}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate text-[11px]">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <span className="font-mono text-slate-700">{ent.legalRepPhone || ent.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate text-[11px]">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate text-slate-500">{ent.address}</span>
                          </div>
                        </div>

                        {/* Foreigner and Support badges */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {foreigners > 0 && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <Globe size={11} /> {foreigners} LĐ nước ngoài
                            </span>
                          )}
                          {(ent.supportNeeds && ent.supportNeeds.length > 0) && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                              <HelpCircle size={11} /> Có đề xuất hỗ trợ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDirections(ent)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="Dẫn đường tới doanh nghiệp trên bản đồ GIS"
                        >
                          <Navigation size={11} />
                          <span>Dẫn đường</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPinModal(ent)}
                          className={`p-1 rounded-lg text-[11px] font-semibold flex items-center gap-0.5 border ${
                            ent.coordinates 
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          }`}
                          title={ent.coordinates ? `Tọa độ GIS: ${ent.coordinates}` : "Ghim tọa độ GIS"}
                        >
                          <MapPin size={11} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(ent)}
                        className="text-indigo-600 font-bold hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px] cursor-pointer"
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
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
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                                <img src={ent.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200"} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <strong className="text-slate-900 block font-bold truncate max-w-xs">{ent.name}</strong>
                                <span className="text-[10px] text-slate-500 block truncate">{ent.address}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-[11px] font-bold text-slate-800 block">{ent.internalCode || `DN-KP3-${ent.id}`}</span>
                            <span className="font-mono text-[10px] text-slate-400 block">MST: {ent.taxCode || "N/A"}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-indigo-900 block">{ent.businessType || "Công ty TNHH"}</span>
                            <span className="text-[10px] text-slate-500 block">{getEnterpriseScaleLabel(ent)}</span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-800 block">{ent.legalRepresentative || ent.owner}</strong>
                            <span className="font-mono text-[10px] text-slate-500 block">{ent.legalRepPhone || ent.phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-blue-950 block">{ent.focalPointName || ent.owner}</strong>
                            <span className="font-mono text-[10px] text-blue-700 block">{ent.focalPointPhone || ent.phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{ent.employeeCount || 1} LĐ</span>
                            {foreigners > 0 ? (
                              <span className="text-[10px] text-rose-600 font-bold block">{foreigners} người NN</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">0 người NN</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ent.status === "Đang hoạt động" ? "bg-emerald-100 text-emerald-800" :
                              ent.status === "Chờ duyệt" ? "bg-amber-100 text-amber-800" :
                              "bg-rose-100 text-rose-800"
                            }`}>
                              {ent.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleDirections(ent)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="Chỉ đường tới doanh nghiệp trên bản đồ GIS"
                              >
                                <Navigation size={11} />
                                <span className="hidden sm:inline">Chỉ đường</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openPinModal(ent)}
                                className={`p-1 rounded-lg text-[11px] font-semibold border ${
                                  ent.coordinates 
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                }`}
                                title={ent.coordinates ? `Đã ghim: ${ent.coordinates}` : "Ghim tọa độ GIS"}
                              >
                                <MapPin size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(ent)}
                                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
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
          {/* Executive Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <FileText size={20} />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Báo cáo Tình hình Hoạt động Kinh tế & Biến động Doanh nghiệp KP3
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  Dành cho Cấp ủy Chi bộ, Trưởng khu phố và Cán bộ phụ trách địa bàn • Cập nhật: Tháng 10/2026
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30 font-semibold">
                    ✓ Phục vụ công tác địa bàn KP3
                  </span>
                  <span>•</span>
                  <span>Không thay thế hệ thống đăng ký doanh nghiệp, thuế hoặc lao động chuyên ngành</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-white/20 transition-all cursor-pointer"
                  title="In báo cáo dạng A4 / PDF"
                >
                  <Printer size={15} /> In Báo cáo
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
                  title="Xuất file CSV báo cáo toàn diện"
                >
                  <Download size={15} /> Xuất File Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab("list")}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  <List size={15} /> Danh mục doanh nghiệp
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Tổng doanh nghiệp</span>
                <strong className="text-lg font-black text-white block mt-0.5">{enterprises.length}</strong>
                <span className="text-[10px] text-emerald-400 font-semibold">100% có hồ sơ địa bàn</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-indigo-500/40">
                <span className="text-[10px] text-indigo-300 block uppercase font-bold">Công ty TNHH</span>
                <strong className="text-lg font-black text-indigo-200 block mt-0.5">{tnhhCount}</strong>
                <span className="text-[10px] text-indigo-300">{((tnhhCount / (enterprises.length || 1)) * 100).toFixed(0)}% cơ cấu</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-teal-500/40">
                <span className="text-[10px] text-teal-300 block uppercase font-bold">Cổ phần & DNTN</span>
                <strong className="text-lg font-black text-teal-200 block mt-0.5">{cpCount + dntnCount}</strong>
                <span className="text-[10px] text-teal-300">đơn vị độc lập</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-purple-500/40">
                <span className="text-[10px] text-purple-300 block uppercase font-bold">Tổng lao động</span>
                <strong className="text-lg font-black text-purple-200 block mt-0.5">{totalEmployees}</strong>
                <span className="text-[10px] text-purple-300">{totalForeignWorkers} nhân sự nước ngoài</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-amber-500/40">
                <span className="text-[10px] text-amber-300 block uppercase font-bold">Có đề xuất hỗ trợ</span>
                <strong className="text-lg font-black text-amber-200 block mt-0.5">{totalSupportNeeds}</strong>
                <span className="text-[10px] text-amber-300">đề xuất tự nguyện</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-emerald-500/40">
                <span className="text-[10px] text-emerald-300 block uppercase font-bold">Đang hoạt động</span>
                <strong className="text-lg font-black text-emerald-200 block mt-0.5">
                  {enterprises.filter(e => e.status === "Đang hoạt động").length}
                </strong>
                <span className="text-[10px] text-emerald-300">ổn định địa bàn</span>
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
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    3. Danh bạ Người đại diện pháp luật & Đầu mối Liên hệ Phối hợp Công vụ
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Phục vụ Cấp ủy Chi bộ, Ban Điều hành KP3 khi tổ chức khảo sát, tuyên truyền, an ninh trật tự & phòng cháy chữa cháy
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-lg border border-white/20 self-start sm:self-auto">
                {enterprises.length} doanh nghiệp đầu mối
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
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
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                            <img src={b.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200"} alt="" className="w-full h-full object-cover" />
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.type === "Mở mới" ? "bg-emerald-100 text-emerald-800" :
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

      {/* UNIFIED DETAIL MODAL: HỒ SƠ CHI TIẾT DOANH NGHIỆP (DNNVV) */}
      {showDetailModal && selectedEnterprise && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-800/40 w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Header Modal: Dark Navy Gradient & Centered Round Photo / Business Name / Badges */}
            <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
              {/* Close Button top-right */}
              <button 
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>

              {/* Centered Circular Enterprise Avatar Photo with hover change overlay */}
              <div className="relative mx-auto w-20 h-20 sm:w-22 sm:h-22 rounded-full group ring-4 ring-indigo-900/80 shadow-md overflow-hidden border-2 border-indigo-400/60 mb-2.5">
                <img 
                  src={selectedEnterprise.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400"} 
                  alt={selectedEnterprise.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual change photo overlay */}
                <label className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                  <Camera size={18} className="text-indigo-400 mb-0.5" />
                  <span className="text-[9px] font-bold">Đổi ảnh</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleChangeAvatarPhoto}
                  />
                </label>
              </div>

              {/* Centered Enterprise Name */}
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight text-center leading-snug break-words px-4">
                {selectedEnterprise.name}
              </h2>

              {/* Badges: Mã nội bộ, Loại hình doanh nghiệp, Quy mô NĐ 80, Trạng thái, MST */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2 px-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-950/90 text-indigo-200 border border-indigo-500/50">
                  {selectedEnterprise.internalCode || `DN-KP3-${selectedEnterprise.id}`}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-400/50 flex items-center gap-1">
                  <Briefcase size={11} className="text-amber-400" />
                  <span>{selectedEnterprise.businessType || "Công ty TNHH"}</span>
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40">
                  {getEnterpriseScaleLabel(selectedEnterprise)}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedEnterprise.status === "Đang hoạt động" 
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" 
                    : selectedEnterprise.status === "Tạm ngừng" 
                    ? "bg-rose-950/80 text-rose-300 border-rose-500/40" 
                    : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                }`}>
                  {selectedEnterprise.status}
                </span>
                {selectedEnterprise.taxCode && (
                  <span className="font-mono text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                    MST: {selectedEnterprise.taxCode}
                  </span>
                )}
              </div>

              {/* Address subtext & Zoom photo button */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 mt-2 text-center">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-indigo-400 shrink-0" />
                  <span>{selectedEnterprise.address}</span>
                </span>
                <button 
                  type="button"
                  onClick={() => setViewingImagePreview({
                    url: selectedEnterprise.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
                    caption: selectedEnterprise.name
                  })}
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-300 hover:text-indigo-100 hover:underline cursor-pointer ml-1"
                >
                  <Maximize2 size={11} /> Xem ảnh đại diện lớn
                </button>
              </div>
            </div>

            {/* Modal Body - Album ảnh & 6 Unified Cards */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/60 text-xs sm:text-sm">
              
              {/* Photo Gallery Thumbnails (Album hình ảnh cơ sở doanh nghiệp tương tự cơ sở kinh doanh) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-indigo-600" />
                    Album ảnh cơ sở doanh nghiệp ({(selectedEnterprise.images?.length || (selectedEnterprise.image ? 1 : 0))})
                  </span>
                  <label className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors">
                    <Plus size={13} /> Thêm ảnh vào album
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAddGalleryPhoto} 
                    />
                  </label>
                </div>

                {/* Thumbnails list */}
                {(() => {
                  const galleryPhotos = selectedEnterprise.images && selectedEnterprise.images.length > 0 
                    ? selectedEnterprise.images 
                    : (selectedEnterprise.image ? [selectedEnterprise.image] : ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=400"]);
                  return (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5">
                      {galleryPhotos.map((imgUrl, i) => {
                        const isMainAvatar = imgUrl === selectedEnterprise.image;
                        return (
                          <div 
                            key={i} 
                            onClick={() => setViewingImagePreview({ url: imgUrl, caption: `${selectedEnterprise.name} - Ảnh ${i + 1}` })}
                            className="group/thumb relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all shadow-2xs"
                          >
                            <img src={imgUrl} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                            {isMainAvatar && (
                              <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-indigo-900/85 text-[8px] font-bold text-indigo-100 text-center rounded py-0.2">
                                Ảnh đại diện
                              </span>
                            )}
                            {/* Action overlay on thumbnail: Set as Avatar or Delete */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                              {!isMainAvatar && (
                                <button
                                  type="button"
                                  title="Đặt làm ảnh đại diện"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated: Business = {
                                      ...selectedEnterprise,
                                      image: imgUrl
                                    };
                                    if (onUpdateBusinesses) {
                                      onUpdateBusinesses(businesses.map(b => b.id === selectedEnterprise.id ? updated : b));
                                    }
                                    setSelectedEnterprise(updated);
                                    showToast("Đã đặt ảnh này làm ảnh đại diện!", "success");
                                  }}
                                  className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[9px]"
                                >
                                  <Camera size={11} />
                                </button>
                              )}
                              {galleryPhotos.length > 1 && (
                                <button
                                  type="button"
                                  title="Xóa khỏi album"
                                  onClick={(e) => handleRemoveGalleryPhoto(i, e)}
                                  className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9px]"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              {/* Card 1: Thông tin Doanh nghiệp & Pháp lý */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Briefcase size={16} className="text-indigo-600" />
                  1. Hồ sơ Doanh nghiệp, Mã số thuế & Thông tin Pháp lý
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Tên chính thức:</span>
                    <strong className="text-slate-900 block font-bold text-xs sm:text-sm mt-0.5">{selectedEnterprise.name}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Mã số thuế / MSDN:</span>
                    <strong className="text-slate-900 font-mono block text-xs sm:text-sm mt-0.5">{selectedEnterprise.taxCode || "Chưa có căn cứ thu thập"}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Loại hình tổ chức:</span>
                    <strong className="text-indigo-700 block font-bold text-xs sm:text-sm mt-0.5">{selectedEnterprise.businessType || "Công ty TNHH"}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Ngành nghề kinh doanh chính:</span>
                    <strong className="text-slate-800 block mt-0.5">{selectedEnterprise.type}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Quy mô lao động (NĐ 80/2021):</span>
                    <strong className="text-indigo-900 block mt-0.5">{getEnterpriseScaleLabel(selectedEnterprise)}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Ngày bắt đầu hoạt động tại địa chỉ:</span>
                    <strong className="text-slate-800 font-mono block mt-0.5">{selectedEnterprise.startDate || "Chưa ghi nhận"}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Trụ sở & Mặt bằng Kinh doanh */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin size={16} className="text-emerald-600" />
                  2. Trụ sở, Mặt bằng Kinh doanh & Liên kết Địa bàn KP3
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Địa chỉ trụ sở / văn phòng:</span>
                    <strong className="text-slate-900 block text-xs sm:text-sm mt-0.5">{selectedEnterprise.address}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Tuyến đường / Phân khu:</span>
                    <strong className="text-slate-800 block mt-0.5">
                      {selectedEnterprise.streetArea || (selectedEnterprise.address.includes("42") ? "Hẻm 42 Lương Định Của" : "Mặt tiền Lương Định Của")}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Loại mặt bằng:</span>
                    <strong className="text-slate-800 block mt-0.5">{selectedEnterprise.premisesType || "Văn phòng"}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Chủ sở hữu mặt bằng:</span>
                    <strong className="text-slate-800 block mt-0.5">
                      {selectedEnterprise.premisesOwner || "Chưa cập nhật"}
                      {selectedEnterprise.premisesOwnerPhone && ` (${selectedEnterprise.premisesOwnerPhone})`}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-semibold">Liên kết mã hộ dân KP3:</span>
                    <strong className="text-indigo-700 font-mono block mt-0.5">
                      {selectedEnterprise.linkedHouseholdCode || "Địa chỉ độc lập"}
                    </strong>
                  </div>
                </div>

                {/* Linked Household Info if available */}
                {(() => {
                  const hh = getLinkedHh(selectedEnterprise);
                  if (!hh) return null;
                  return (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="text-emerald-900 font-bold block">
                          Liên kết Hộ dân: {hh.ownerName} (Mã hộ: {hh.code})
                        </span>
                        <span className="text-[11px] text-emerald-800 block">
                          Số nhân khẩu: {hh.memberCount} người • Địa chỉ: {hh.address}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                        Đã đối soát CSDL
                      </span>
                    </div>
                  );
                })()}

                {/* GIS & Navigation Banner inside Card 2 */}
                <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-1.5">
                      <Compass size={13} className="text-emerald-400" /> Bản đồ số GIS & Dẫn đường Khu phố 3
                    </span>
                    <div className="font-mono text-[11px] text-slate-300">
                      Tọa độ: <strong className="text-emerald-300">{selectedEnterprise.coordinates || "Chưa thiết lập tọa độ GIS"}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleDirections(selectedEnterprise);
                        setShowDetailModal(false);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      title="Dẫn đường trực tiếp trên bản đồ số GIS Khu phố 3"
                    >
                      <Navigation size={13} />
                      <span>Dẫn đường GIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPinModal(selectedEnterprise)}
                      className="px-2.5 py-1.5 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-400/40 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MapPin size={13} />
                      <span>{selectedEnterprise.coordinates ? "Sửa tọa độ" : "Ghim tọa độ"}</span>
                    </button>

                    {selectedEnterprise.coordinates && (
                      <a
                        href={getGoogleMapsDirectionUrl(
                          parseGisCoords(selectedEnterprise.coordinates)?.lat || 10.936997,
                          parseGisCoords(selectedEnterprise.coordinates)?.lng || 106.744645,
                          selectedEnterprise.address
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        title="Mở chỉ đường ngoài ứng dụng bằng Google Maps GPS"
                      >
                        <ExternalLink size={12} />
                        <span>Google Maps</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Người đại diện & Đầu mối Công vụ */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <UserCheck size={16} className="text-blue-600" />
                  3. Người đại diện Pháp luật & Đầu mối Liên hệ Phối hợp Công vụ
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold">Người đại diện theo pháp luật:</span>
                    <strong className="text-slate-900 block font-bold text-xs sm:text-sm">{selectedEnterprise.legalRepresentative || selectedEnterprise.owner}</strong>
                    <span className="text-[11px] font-mono text-slate-600 block">SĐT: {selectedEnterprise.legalRepPhone || selectedEnterprise.phone}</span>
                    {selectedEnterprise.legalRepEmail && (
                      <span className="text-[10.5px] text-indigo-600 block truncate">{selectedEnterprise.legalRepEmail}</span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold">Người trực tiếp quản lý tại chỗ:</span>
                    <strong className="text-slate-900 block font-bold text-xs sm:text-sm">{selectedEnterprise.siteManager || selectedEnterprise.owner}</strong>
                    <span className="text-[11px] font-mono text-slate-600 block">SĐT: {selectedEnterprise.siteManagerPhone || selectedEnterprise.phone}</span>
                  </div>

                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1">
                    <span className="text-[11px] text-blue-800 block font-bold">Đầu mối phối hợp địa phương (Công vụ):</span>
                    <strong className="text-blue-950 block font-black text-xs sm:text-sm">{selectedEnterprise.focalPointName || selectedEnterprise.owner}</strong>
                    <span className="text-[11px] font-mono font-bold text-blue-700 block">SĐT công vụ: {selectedEnterprise.focalPointPhone || selectedEnterprise.phone}</span>
                    <span className="text-[10px] text-slate-500 block">Vai trò: {selectedEnterprise.focalPointRole || "Đại diện phối hợp"}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Lao động & Quản lý Người nước ngoài */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Users2 size={16} className="text-purple-600" />
                  4. Tình hình Lực lượng Lao động & Chuyên gia, Lao động Nước ngoài
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                    <span className="text-[10.5px] text-purple-800 block font-bold uppercase">Tổng lao động</span>
                    <strong className="text-xl font-black text-purple-950 block mt-0.5">{selectedEnterprise.employeeCount || 1}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-500 block font-semibold uppercase">Thường trú KP3</span>
                    <strong className="text-xl font-black text-slate-800 block mt-0.5">{selectedEnterprise.localWorkersCount ?? Math.floor((selectedEnterprise.employeeCount || 1) / 2)}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-500 block font-semibold uppercase">Tạm trú địa bàn</span>
                    <strong className="text-xl font-black text-slate-800 block mt-0.5">{selectedEnterprise.temporaryWorkersCount ?? Math.ceil((selectedEnterprise.employeeCount || 1) / 2)}</strong>
                  </div>
                  <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                    <span className="text-[10.5px] text-rose-800 block font-bold uppercase">Người nước ngoài</span>
                    <strong className="text-xl font-black text-rose-950 block mt-0.5">{selectedEnterprise.foreignWorkersCount || (selectedEnterprise.foreignWorkers?.length || 0)}</strong>
                  </div>
                </div>

                {/* Foreign workers list if any */}
                {(() => {
                  const foreigners = selectedEnterprise.foreignWorkers && selectedEnterprise.foreignWorkers.length > 0
                    ? selectedEnterprise.foreignWorkers
                    : getEnterpriseForeignResidents(selectedEnterprise).map(r => ({
                        name: r.fullName,
                        nationality: r.nationality || "Nước ngoài",
                        passportOrCode: r.cccd,
                        position: r.occupation,
                        temporaryResidenceStatus: "Đã khai báo tạm trú" as const
                      }));

                  if (foreigners.length === 0) {
                    return (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        Doanh nghiệp không ghi nhận chuyên gia hoặc lao động người nước ngoài làm việc tại chỗ.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 block">Danh sách chuyên gia / nhân sự nước ngoài:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {foreigners.map((f, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-rose-50/30 border border-rose-200/80 flex justify-between items-center text-xs">
                            <div>
                              <strong className="text-slate-900 block">{f.name}</strong>
                              <span className="text-[10.5px] text-slate-500 block">{f.nationality} • {f.position}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Hộ chiếu: {f.passportOrCode}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              {f.temporaryResidenceStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Card 5: Nhu cầu Hỗ trợ & Khó khăn */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <HelpCircle size={16} className="text-amber-600" />
                  5. Nhu cầu Hỗ trợ & Ý kiến Khó khăn do Doanh nghiệp Tự nguyện Cung cấp
                </h4>

                <div className="space-y-2">
                  {selectedEnterprise.supportNeeds && selectedEnterprise.supportNeeds.length > 0 ? (
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Lĩnh vực doanh nghiệp mong muốn được hỗ trợ:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEnterprise.supportNeeds.map((need, ni) => (
                          <span key={ni} className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                            • {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      Doanh nghiệp chưa đăng ký danh mục nhu cầu hỗ trợ đặc thù.
                    </div>
                  )}

                  {selectedEnterprise.supportNotes && (
                    <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/80 text-xs">
                      <span className="text-[11px] font-bold text-amber-900 block mb-0.5">Ghi chú khó khăn / Ý kiến kiến nghị gửi Khu phố:</span>
                      <p className="text-slate-800 leading-relaxed italic">"{selectedEnterprise.supportNotes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 6: Lịch sử Biến động Cơ sở */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-2">
                    <History size={16} className="text-teal-600" />
                    6. Lịch sử Biến động Địa bàn (Mở mới, Chuyển địa điểm, Đổi ngành nghề, Tạm ngừng)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowChangeLogModal(true)}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={13} /> Ghi nhận biến động
                  </button>
                </div>

                <div className="space-y-2">
                  {!selectedEnterprise.changeHistory || selectedEnterprise.changeHistory.length === 0 ? (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      Chưa ghi nhận biến động mới đối với doanh nghiệp này.
                    </div>
                  ) : (
                    selectedEnterprise.changeHistory.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{log.type}</span>
                          <span className="font-mono text-[10.5px] text-slate-500">{log.date}</span>
                        </div>
                        <p className="text-slate-700 text-[11.5px]">{log.description}</p>
                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Người ghi nhận: {log.recordedBy}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <select
                  value={selectedEnterprise.status}
                  onChange={(e) => handleChangeStatus(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Đang hoạt động">Trạng thái: Đang hoạt động</option>
                  <option value="Chờ duyệt">Trạng thái: Chờ duyệt</option>
                  <option value="Tạm ngưng">Trạng thái: Tạm ngưng</option>
                  <option value="Chuyển địa điểm">Trạng thái: Chuyển địa điểm</option>
                </select>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} /> In phiếu hồ sơ
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteEnterprise}
                  className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} /> Xóa hồ sơ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenEditModal(selectedEnterprise);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Pencil size={14} /> Sửa hồ sơ
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM BIẾN ĐỘNG DOANH NGHIỆP */}
      {showChangeLogModal && selectedEnterprise && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => setShowChangeLogModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-slate-800 space-y-4 p-5"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <History size={16} className="text-teal-600" />
                Ghi nhận Biến động Doanh nghiệp
              </h3>
              <button 
                type="button" 
                onClick={() => setShowChangeLogModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChangeLog} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại biến động *</label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                >
                  <option value="Mở mới">Mở mới hoạt động tại địa chỉ</option>
                  <option value="Chuyển địa điểm">Chuyển địa điểm trụ sở / văn phòng</option>
                  <option value="Thay đổi ngành nghề">Thay đổi ngành nghề kinh doanh</option>
                  <option value="Thay đổi người đại diện">Thay đổi người đại diện / pháp lý</option>
                  <option value="Tạm ngừng">Tạm ngừng hoạt động</option>
                  <option value="Hoạt động trở lại">Hoạt động trở lại</option>
                  <option value="Khác">Biến động khác</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Ngày ghi nhận *</label>
                <input
                  type="date"
                  value={changeDate}
                  onChange={(e) => setChangeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nội dung chi tiết biến động *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ghi nhận cụ thể thông tin thay đổi địa chỉ, ngành nghề, người đại diện hoặc nguyên nhân tạm ngừng..."
                  value={changeDesc}
                  onChange={(e) => setChangeDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Người ghi nhận</label>
                <input
                  type="text"
                  value={changeRecorder}
                  onChange={(e) => setChangeRecorder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangeLogModal(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Lưu biến động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐĂNG KÝ DOANH NGHIỆP MỚI */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-800/40 w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:px-6 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Đăng ký Doanh nghiệp Vừa & Nhỏ Mới</h3>
                  <p className="text-[11px] text-indigo-200/80">Khu phố 3, Phường An Phú</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEnterprise} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Group 1: Pháp lý */}
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-600" /> 1. Thông tin Doanh nghiệp & Pháp lý
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên Doanh nghiệp *</label>
                    <input
                      type="text"
                      required
                      placeholder="Công ty TNHH Giải pháp ..., Công ty CP ..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã số thuế / MSDN *</label>
                    <input
                      type="text"
                      required
                      placeholder="031xxxxxxx"
                      value={newTaxCode}
                      onChange={(e) => setNewTaxCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại hình tổ chức *</label>
                    <select
                      value={newBusinessType}
                      onChange={(e) => setNewBusinessType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="Công ty TNHH">Công ty TNHH</option>
                      <option value="Công ty Cổ phần">Công ty Cổ phần</option>
                      <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                      <option value="Cơ sở kinh doanh khác">Cơ sở khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Quy mô lao động (NĐ 80) *</label>
                    <select
                      value={newEnterpriseScale}
                      onChange={(e) => setNewEnterpriseScale(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="Siêu nhỏ (< 5 LĐ)">Siêu nhỏ (&lt; 5 LĐ)</option>
                      <option value="Nhỏ (5 - 20 LĐ)">Nhỏ (5 - 20 LĐ)</option>
                      <option value="Vừa (20 - 50 LĐ)">Vừa (20 - 50 LĐ)</option>
                      <option value="Lớn (> 50 LĐ)">Lớn (&gt; 50 LĐ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Ngành nghề chính *</label>
                    <input
                      type="text"
                      required
                      placeholder="Phần mềm, Thương mại, Y tế..."
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Địa điểm */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" /> 2. Trụ sở, Mặt bằng Kinh doanh & Tuyến đường
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Địa chỉ trụ sở *</label>
                    <input
                      type="text"
                      required
                      placeholder="Số nhà, hẻm, Lương Định Của..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tuyến đường *</label>
                    <select
                      value={newStreetArea}
                      onChange={(e) => setNewStreetArea(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                    >
                      <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
                      <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
                      <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
                      <option value="Khu dân cư nội bộ KP3">KDC nội bộ KP3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại mặt bằng</label>
                    <select
                      value={newPremisesType}
                      onChange={(e) => setNewPremisesType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                    >
                      <option value="Văn phòng">Văn phòng</option>
                      <option value="Nhà phố">Nhà phố</option>
                      <option value="Cửa hàng">Cửa hàng</option>
                      <option value="Nhà xưởng">Nhà xưởng</option>
                      <option value="Ki-ốt">Ki-ốt</option>
                      <option value="Địa điểm thuê">Địa điểm thuê</option>
                      <option value="Chung cư / Căn hộ">Chung cư / Căn hộ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Chủ sở hữu mặt bằng</label>
                    <input
                      type="text"
                      placeholder="Tên chủ nhà / chủ mặt bằng"
                      value={newPremisesOwner}
                      onChange={(e) => setNewPremisesOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã hộ dân KP3 liên kết</label>
                    <input
                      type="text"
                      placeholder="HK-301, HK-302..."
                      value={newLinkedHouseholdCode}
                      onChange={(e) => setNewLinkedHouseholdCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Người đại diện & Đầu mối */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-blue-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-blue-600" /> 3. Người đại diện & Đầu mối Công vụ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Đại diện pháp luật *</label>
                    <input
                      type="text"
                      required
                      placeholder="Họ và tên người ĐDPL"
                      value={newLegalRep}
                      onChange={(e) => setNewLegalRep(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">SĐT đại diện *</label>
                    <input
                      type="text"
                      required
                      placeholder="0903xxxxxx"
                      value={newLegalRepPhone}
                      onChange={(e) => setNewLegalRepPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Email công vụ</label>
                    <input
                      type="email"
                      placeholder="contact@doanhnghiep.vn"
                      value={newLegalRepEmail}
                      onChange={(e) => setNewLegalRepEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                    <Phone size={12} className="text-blue-700" /> Đầu mối phối hợp công vụ địa phương:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Họ tên đầu mối"
                        value={newFocalPointName}
                        onChange={(e) => setNewFocalPointName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="SĐT công vụ tiếp nhận"
                        value={newFocalPointPhone}
                        onChange={(e) => setNewFocalPointPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Vai trò (Giám đốc, Quản lý...)"
                        value={newFocalPointRole}
                        onChange={(e) => setNewFocalPointRole(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: Lao động */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-purple-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Users2 size={14} className="text-purple-600" /> 4. Lực lượng Lao động & Nước ngoài
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tổng số lao động *</label>
                    <input
                      type="number"
                      min="1"
                      value={newEmployeeCount}
                      onChange={(e) => setNewEmployeeCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">LĐ thường trú KP3</label>
                    <input
                      type="number"
                      min="0"
                      value={newLocalWorkers}
                      onChange={(e) => setNewLocalWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">LĐ tạm trú</label>
                    <input
                      type="number"
                      min="0"
                      value={newTemporaryWorkers}
                      onChange={(e) => setNewTemporaryWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">LĐ người nước ngoài</label>
                    <input
                      type="number"
                      min="0"
                      value={newForeignWorkersCount}
                      onChange={(e) => setNewForeignWorkersCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Nhu cầu hỗ trợ */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-amber-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-amber-600" /> 5. Nhu cầu Hỗ trợ & Ý kiến Khó khăn (Tự nguyện)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      <label key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setNewSupportNeeds([...newSupportNeeds, need]);
                            else setNewSupportNeeds(newSupportNeeds.filter(n => n !== need));
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span>{need}</span>
                      </label>
                    );
                  })}
                </div>
                <div>
                  <textarea
                    rows={2}
                    placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
                    value={newSupportNotes}
                    onChange={(e) => setNewSupportNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              {/* Group 6: Ảnh đại diện & Album ảnh cơ sở */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-indigo-600" /> 6. Ảnh đại diện & Album ảnh cơ sở doanh nghiệp
                  </span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ảnh đại diện */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Ảnh đại diện chính
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0 relative group">
                        <img 
                          src={newImage || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400"} 
                          alt="Avatar preview" 
                          className="w-full h-full object-cover"
                        />
                        {newImage && (
                          <button
                            type="button"
                            onClick={() => setNewImage("")}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa ảnh"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer transition-colors">
                          <Camera size={13} />
                          <span>Tải ảnh đại diện</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = () => setNewImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-slate-500">Hỗ trợ JPG, PNG, WebP</p>
                      </div>
                    </div>
                  </div>

                  {/* Album ảnh cơ sở */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Album ảnh cơ sở ({newAdditionalImages.length})
                      </label>
                      <label className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-0.5">
                        <Plus size={11} /> Thêm ảnh
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = () => {
                                setNewAdditionalImages(prev => [...prev, reader.result as string]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {newAdditionalImages.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-2">Chưa thêm ảnh phụ nào vào album</p>
                    ) : (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {newAdditionalImages.map((img, idx) => (
                          <div key={idx} className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 group">
                            <img src={img} alt="album" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={9} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Đăng ký Doanh nghiệp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA HỒ SƠ DOANH NGHIỆP */}
      {showEditModal && selectedEnterprise && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-800/40 w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:px-6 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Chỉnh sửa Hồ sơ Doanh nghiệp</h3>
                  <p className="text-[11px] text-indigo-200/80 truncate max-w-xs">{selectedEnterprise.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateEnterprise} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Group 1: Pháp lý */}
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-600" /> 1. Thông tin Doanh nghiệp & Pháp lý
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên Doanh nghiệp *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã nội bộ</label>
                    <input
                      type="text"
                      value={editInternalCode}
                      onChange={(e) => setEditInternalCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã số thuế / MSDN</label>
                    <input
                      type="text"
                      value={editTaxCode}
                      onChange={(e) => setEditTaxCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại hình tổ chức *</label>
                    <select
                      value={editBusinessType}
                      onChange={(e) => setEditBusinessType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="Công ty TNHH">Công ty TNHH</option>
                      <option value="Công ty Cổ phần">Công ty Cổ phần</option>
                      <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                      <option value="Cơ sở kinh doanh khác">Cơ sở khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Quy mô lao động (NĐ 80) *</label>
                    <select
                      value={editEnterpriseScale}
                      onChange={(e) => setEditEnterpriseScale(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="Siêu nhỏ (< 5 LĐ)">Siêu nhỏ (&lt; 5 LĐ)</option>
                      <option value="Nhỏ (5 - 20 LĐ)">Nhỏ (5 - 20 LĐ)</option>
                      <option value="Vừa (20 - 50 LĐ)">Vừa (20 - 50 LĐ)</option>
                      <option value="Lớn (> 50 LĐ)">Lớn (&gt; 50 LĐ)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 2: Địa điểm */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" /> 2. Trụ sở, Mặt bằng Kinh doanh & Tuyến đường
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Địa chỉ trụ sở *</label>
                    <input
                      type="text"
                      required
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tuyến đường *</label>
                    <select
                      value={editStreetArea}
                      onChange={(e) => setEditStreetArea(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                    >
                      <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
                      <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
                      <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
                      <option value="Khu dân cư nội bộ KP3">KDC nội bộ KP3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại mặt bằng</label>
                    <select
                      value={editPremisesType}
                      onChange={(e) => setEditPremisesType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                    >
                      <option value="Văn phòng">Văn phòng</option>
                      <option value="Nhà phố">Nhà phố</option>
                      <option value="Cửa hàng">Cửa hàng</option>
                      <option value="Nhà xưởng">Nhà xưởng</option>
                      <option value="Ki-ốt">Ki-ốt</option>
                      <option value="Địa điểm thuê">Địa điểm thuê</option>
                      <option value="Chung cư / Căn hộ">Chung cư / Căn hộ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Chủ sở hữu mặt bằng</label>
                    <input
                      type="text"
                      value={editPremisesOwner}
                      onChange={(e) => setEditPremisesOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã hộ dân KP3 liên kết</label>
                    <input
                      type="text"
                      value={editLinkedHouseholdCode}
                      onChange={(e) => setEditLinkedHouseholdCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Người đại diện */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-blue-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-blue-600" /> 3. Người đại diện & Đầu mối Công vụ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Đại diện pháp luật *</label>
                    <input
                      type="text"
                      required
                      value={editLegalRep}
                      onChange={(e) => setEditLegalRep(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">SĐT đại diện *</label>
                    <input
                      type="text"
                      required
                      value={editLegalRepPhone}
                      onChange={(e) => setEditLegalRepPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Email công vụ</label>
                    <input
                      type="email"
                      value={editLegalRepEmail}
                      onChange={(e) => setEditLegalRepEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                    <Phone size={12} className="text-blue-700" /> Đầu mối phối hợp công vụ địa phương:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Họ tên đầu mối"
                        value={editFocalPointName}
                        onChange={(e) => setEditFocalPointName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="SĐT công vụ"
                        value={editFocalPointPhone}
                        onChange={(e) => setEditFocalPointPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Vai trò"
                        value={editFocalPointRole}
                        onChange={(e) => setEditFocalPointRole(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: Lao động */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-purple-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Users2 size={14} className="text-purple-600" /> 4. Lực lượng Lao động & Nước ngoài
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tổng số lao động *</label>
                    <input
                      type="number"
                      min="1"
                      value={editEmployeeCount}
                      onChange={(e) => setEditEmployeeCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">LĐ thường trú KP3</label>
                    <input
                      type="number"
                      min="0"
                      value={editLocalWorkers}
                      onChange={(e) => setEditLocalWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">LĐ tạm trú</label>
                    <input
                      type="number"
                      min="0"
                      value={editTemporaryWorkers}
                      onChange={(e) => setEditTemporaryWorkers(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">LĐ người nước ngoài</label>
                    <input
                      type="number"
                      min="0"
                      value={editForeignWorkersCount}
                      onChange={(e) => setEditForeignWorkersCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Nhu cầu hỗ trợ */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-amber-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-amber-600" /> 5. Nhu cầu Hỗ trợ & Ý kiến Khó khăn (Tự nguyện)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      <label key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setEditSupportNeeds([...editSupportNeeds, need]);
                            else setEditSupportNeeds(editSupportNeeds.filter(n => n !== need));
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span>{need}</span>
                      </label>
                    );
                  })}
                </div>
                <div>
                  <textarea
                    rows={2}
                    value={editSupportNotes}
                    onChange={(e) => setEditSupportNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              {/* Group 6: Ảnh đại diện & Album ảnh cơ sở */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-100 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-indigo-600" /> 6. Ảnh đại diện & Album ảnh cơ sở doanh nghiệp
                  </span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ảnh đại diện */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Ảnh đại diện chính
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0 relative group">
                        <img 
                          src={editImage || selectedEnterprise.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400"} 
                          alt="Avatar preview" 
                          className="w-full h-full object-cover"
                        />
                        {editImage && (
                          <button
                            type="button"
                            onClick={() => setEditImage("")}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa ảnh"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer transition-colors">
                          <Camera size={13} />
                          <span>Đổi ảnh đại diện</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const url = reader.result as string;
                                  setEditImage(url);
                                  if (!editImages.includes(url)) {
                                    setEditImages(prev => [url, ...prev]);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-slate-500">Hỗ trợ JPG, PNG, WebP</p>
                      </div>
                    </div>
                  </div>

                  {/* Album ảnh cơ sở */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Album ảnh cơ sở ({editImages.length})
                      </label>
                      <label className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-0.5">
                        <Plus size={11} /> Thêm ảnh
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = () => {
                                setEditImages(prev => [...prev, reader.result as string]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {editImages.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-2">Chưa có ảnh trong album cơ sở</p>
                    ) : (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {editImages.map((img, idx) => {
                          const isAvatar = (editImage || selectedEnterprise.image) === img;
                          return (
                            <div key={idx} className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 group">
                              <img src={img} alt="album" className="w-full h-full object-cover" />
                              {isAvatar && (
                                <span className="absolute bottom-0 left-0 right-0 bg-indigo-900/90 text-[7px] font-bold text-white text-center">
                                  Chính
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                {!isAvatar && (
                                  <button
                                    type="button"
                                    onClick={() => setEditImage(img)}
                                    title="Chọn làm ảnh đại diện"
                                    className="p-0.5 bg-indigo-600 text-white rounded text-[8px]"
                                  >
                                    <Camera size={9} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                                  title="Xóa ảnh"
                                  className="p-0.5 bg-rose-600 text-white rounded text-[8px]"
                                >
                                  <X size={9} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
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

      {/* TOAST THÔNG BÁO ĐỒNG BỘ GIS DOANH NGHIỆP */}
      {gisPinToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{gisPinToast}</span>
        </div>
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS DOANH NGHIỆP */}
      {gisPinModalEnterprise && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setGisPinModalEnterprise(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex justify-between items-center border-b border-indigo-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Ghim & Đồng bộ Tọa độ GIS Doanh nghiệp</h3>
                  <p className="text-[11px] text-indigo-200/90 font-mono">
                    {gisPinModalEnterprise.name} ({gisPinModalEnterprise.internalCode || gisPinModalEnterprise.id})
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setGisPinModalEnterprise(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trụ sở hoạt động:</span>
                <p className="font-bold text-slate-800 text-xs sm:text-sm">{gisPinModalEnterprise.address}</p>
                <span className="text-[11px] text-slate-500 block">Khu phố 3, Phường An Phú, TP. Thủ Đức</span>
              </div>

              {/* Coordinate Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Tọa độ GIS (Định dạng DMS hoặc Thập phân):</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(gisPinModalEnterprise.address, gisPinModalEnterprise.id);
                      setGisPinInput(auto.dms);
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Tự động nhận diện tọa độ từ địa chỉ"
                  >
                    <Sparkles size={12} className="text-indigo-600" /> Tự động nhận diện từ địa chỉ
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gợi ý phân khu trục chính KP3:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'13.2"N 106°44\'40.7"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Mặt tiền Lương Định Của</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.936997, 106.744645</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'16.1"N 106°44\'43.8"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 42 Lương Định Của</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.937800, 106.745500</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'08.9"N 106°44\'48.5"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 18 Lương Định Của</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.935800, 106.746800</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'14.8"N 106°44\'38.2"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Khu thương mại dịch vụ KP3</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.937200, 106.743800</span>
                  </button>
                </div>
              </div>

              {/* Status helper */}
              {gisPinInput && (() => {
                const parsed = parseGisCoords(gisPinInput);
                if (parsed) {
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check size={13} className="text-emerald-600" />
                        <span>Tọa độ hợp lệ: {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}</span>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                        {decimalToDMS(parsed.lat, parsed.lng)}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Lưu & Đồng bộ GIS
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(true)}
                  className="px-4 py-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Lưu & Dẫn đường ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX CHO DOANH NGHIỆP */}
      {viewingImagePreview && (
        <div 
          onClick={() => setViewingImagePreview(null)}
          className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
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
    </div>
  );
}
