import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  Briefcase,
  Printer,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  Check,
  LayoutGrid,
  List,
  Shield,
  Award,
  GraduationCap,
  Building2,
  ClipboardList,
  Eye,
  FileCheck,
  Heart,
  Home,
  CreditCard,
  UserCheck,
  Share2,
  Globe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
  Navigation,
  Compass,
  Loader2,
  Database,
  MoreVertical,
  MoreHorizontal,
  EyeOff,
  Copy,
  Users,
  Layers,
  RefreshCw,
  BellRing
} from "lucide-react";
import { Resident, TargetGisItem } from "../types";
import {
  calculateResidentAge,
  formatCompactKp3Address,
  getTemporaryResidenceExpiryStatus,
  parseAccommodationInfo,
} from "../utils/householdRecognitionUtils";
import * as XLSX from "xlsx";
import Pagination from "./Pagination";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { CT07Modal, NA17Modal, QuickHouseholdModal } from "./residents/ResidentModals";
import { formatVNNumber } from "../utils/numberFormat";
import { KP3_AREA_LIST, extractKp3Area, maskCccd } from "../utils/kp3Utils";
import { recordAuditLog } from "../utils/auditLogger";
import { getEffectiveResidencyStatus } from "../utils/residencyClassifier";
import { getResidentCreatePath, getResidentDetailPath, getResidentEditPath, navigate } from "../routes";
import {
  buildResidentGisTarget,
  getCountryFlag,
  getVisaExpiryStatus,
  isForeignResident,
} from "../utils/residentHelpers";

export { isForeignResident, getCountryFlag, getVisaExpiryStatus };

function isElderlyResident(res: Resident): boolean {
  if (res.policyGroup && res.policyGroup.includes("Người cao tuổi")) return true;
  if (res.birthDate) {
    const match = String(res.birthDate).match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
      const birthYear = parseInt(match[1], 10);
      if (!Number.isNaN(birthYear) && new Date().getFullYear() - birthYear >= 60) {
        return true;
      }
    }
  }
  return false;
}

function hasRealUploadedAvatar(url?: string): boolean {
  if (!url) return false;
  if (url.includes("images.unsplash.com/photo-")) return false;
  return true;
}

function getResidentMonogram(fullName?: string): string {
  const parts = String(fullName || "CD")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "CD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

interface CitizenSearchInputProps {
  defaultValue: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

const CitizenSearchInput = React.memo(function CitizenSearchInput({
  defaultValue,
  onSearch,
  placeholder
}: CitizenSearchInputProps) {
  const [val, setVal] = useState(defaultValue);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(val);
    }, 220);
    return () => clearTimeout(timer);
  }, [val, onSearch]);

  return (
    <div className="relative flex-1 min-w-0 w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        id="citizen-search-input"
        name="citizenSearch"
        type="text"
        placeholder={placeholder || "Tìm họ tên, CCCD, SĐT, địa chỉ, nhà trọ..."}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full pl-9 pr-8 py-2 border border-slate-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50 hover:bg-white transition-all placeholder:text-slate-400"
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

interface CitizenManagementProps {
  residents: Resident[];
  onAddResident: (newResident: Resident) => void;
  onDeleteResident: (id: string) => void;
  onUpdateResidents?: (residents: Resident[]) => void;
  onUpdateHouseholds?: (households: any[]) => void;
  households?: any[];
  onNavigateToGis?: (item: TargetGisItem) => void;
}

export default function CitizenManagement({
  residents,
  onAddResident,
  onDeleteResident,
  onUpdateResidents,
  onUpdateHouseholds,
  households = [],
  onNavigateToGis
}: CitizenManagementProps) {
  const [quickHouseholdModal, setQuickHouseholdModal] = useState<any | null>(null);

  const handleQuickViewHousehold = (householdCodeOrId: string) => {
    if (!households || households.length === 0) return;
    const found = households.find((h: any) => h.code === householdCodeOrId || h.id === householdCodeOrId);
    if (found) {
      setQuickHouseholdModal(found);
    }
  };
  const [showFullCccd, setShowFullCccd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [temporaryExpiryFilter, setTemporaryExpiryFilter] = useState("Tất cả");
  const [genderFilter, setGenderFilter] = useState("Tất cả");
  const [policyFilter, setPolicyFilter] = useState("Tất cả");
  const [toFilter, setToFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const itemsPerPage = 8;

  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const showNotice = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setNotice({ message, type });
  }, []);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "primary";
    onConfirm: () => void;
  } | null>(null);

  const handleDirections = (res: Resident) => {
    if (onNavigateToGis) {
      onNavigateToGis(buildResidentGisTarget(res, households));
    }
  };

  // Foreign Resident Specific Sub-filters
  const [foreignNationalityFilter, setForeignNationalityFilter] = useState("Tất cả");
  const [foreignVisaTypeFilter, setForeignVisaTypeFilter] = useState("Tất cả");
  const [foreignExpiryFilter, setForeignExpiryFilter] = useState("Tất cả");

  // Print CT07 Certificate Modal State
  const [showCT07Modal, setShowCT07Modal] = useState(false);
  const [residentForCT07, setResidentForCT07] = useState<Resident | null>(null);

  // Print NA17 Foreign Resident Certificate Modal State
  const [showNA17Modal, setShowNA17Modal] = useState(false);
  const [residentForNA17, setResidentForNA17] = useState<Resident | null>(null);

  const handleOpenNA17 = (res: Resident) => {
    setResidentForNA17(res);
    setShowNA17Modal(true);
  };

  // Dropdown actions menu state for citizen rows
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveDropdownId(null);
    };
    if (activeDropdownId) {
      window.addEventListener("click", handleDocumentClick);
    }
    return () => {
      window.removeEventListener("click", handleDocumentClick);
    };
  }, [activeDropdownId]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode("card");
    }
  }, []);

  // Read URL Query filters (?expiry=expiring, ?expiry=expired, ?age=elderly) on mount & popstate
  useEffect(() => {
    const applyUrlQueryFilters = () => {
      const params = new URLSearchParams(window.location.search);
      const expiryParam = params.get("expiry");
      const ageParam = params.get("age");

      if (expiryParam === "expiring") {
        setStatusFilter("Tạm trú");
        setTemporaryExpiryFilter("Sắp hết hạn (< 30 ngày)");
        setCurrentPage(1);
      } else if (expiryParam === "expired") {
        setStatusFilter("Tạm trú");
        setTemporaryExpiryFilter("Đã hết hạn");
        setCurrentPage(1);
      } else if (ageParam === "elderly") {
        setStatusFilter("Tất cả");
        setPolicyFilter("Người cao tuổi");
        setCurrentPage(1);
      }
    };

    applyUrlQueryFilters();
    window.addEventListener("popstate", applyUrlQueryFilters);
    return () => {
      window.removeEventListener("popstate", applyUrlQueryFilters);
    };
  }, []);

  // Navigate to dedicated resident detail page
  const handleOpenDetailModal = (res: Resident) => {
    navigate(getResidentDetailPath(res.id));
  };

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleGenderFilterChange = (val: string) => {
    setGenderFilter(val);
    setCurrentPage(1);
  };

  const handlePolicyFilterChange = (val: string) => {
    setPolicyFilter(val);
    setCurrentPage(1);
  };

  // Excel & Paste Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"file" | "paste">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [pastedRawText, setPastedRawText] = useState("");
  const [isUploadingToDb, setIsUploadingToDb] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [pendingWorkbook, setPendingWorkbook] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [duplicateMergedCount, setDuplicateMergedCount] = useState(0);

  // Smart Sync Diff States
  const [syncDiff, setSyncDiff] = useState<{
    newResidents: any[];
    updatedResidents: { old: Resident; new: any }[];
    removedResidents: Resident[];
    unchangedCount: number;
    syncStatus: string; // "Thường trú" | "Tạm trú"
  } | null>(null);
  const [enableSmartSync, setEnableSmartSync] = useState(true);
  const [confirmRemoval, setConfirmRemoval] = useState(false);

  const resetImportModalState = useCallback(() => {
    setParsedData([]);
    setImportFileName("");
    setPastedRawText("");
    setAvailableSheets([]);
    setPendingWorkbook(null);
    setPendingFileName("");
    setDuplicateMergedCount(0);
    setSyncDiff(null);
    setConfirmRemoval(false);
    setEnableSmartSync(true);
  }, []);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showImportModal || showCT07Modal || showNA17Modal || quickHouseholdModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showImportModal, showCT07Modal, showNA17Modal, quickHouseholdModal]);

  // Smart Sync: Tính diff giữa danh sách mới (parsedData đã khử trùng CCCD) và dữ liệu cũ (residents)
  useEffect(() => {
    if (!enableSmartSync || parsedData.length === 0) {
      setSyncDiff(null);
      setConfirmRemoval(false);
      return;
    }

    const validNew = parsedData.filter((r: any) => r.isValid);
    if (validNew.length === 0) {
      setSyncDiff(null);
      return;
    }

    // Xác định diện cư trú theo dữ liệu mới (Thường trú / Tạm trú)
    const statusCounts: Record<string, number> = {};
    validNew.forEach((r: any) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    const syncStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Tạm trú";

    // Map toàn bộ cư dân hiện có theo CCCD để nhận diện chính xác Mới vs Cập nhật
    const allExistingByCccd = new Map<string, Resident>();
    const scopedExistingByCccd = new Map<string, Resident>();
    residents.forEach((r) => {
      const clean = (r.cccd || "").trim();
      if (clean.length < 9) return;
      allExistingByCccd.set(clean, r);
      if (r.status === syncStatus || (syncStatus === "Thường trú" && r.status === "Tạm vắng")) {
        scopedExistingByCccd.set(clean, r);
      }
    });

    const newCccdSet = new Set<string>();
    const newResidents: any[] = [];
    const updatedResidents: { old: Resident; new: any }[] = [];
    let unchangedCount = 0;

    for (const row of validNew) {
      const cccd = (row.cccd || "").trim();
      if (newCccdSet.has(cccd)) continue;
      newCccdSet.add(cccd);
      const existing = allExistingByCccd.get(cccd);
      if (!existing) {
        newResidents.push(row);
      } else {
        const nextPhone = row.phone && row.phone !== "N/A" ? row.phone.trim() : "";
        const prevPhone = existing.phone && existing.phone !== "N/A" ? existing.phone.trim() : "";
        const nextHh = (row.householdId || "").trim();
        const prevHh = (existing.householdId || "").trim();
        const householdChanged =
          nextHh !== "" && nextHh !== "Tạm trú" && prevHh !== nextHh;

        const hasChange =
          existing.fullName.trim().toUpperCase() !== (row.fullName || "").trim().toUpperCase() ||
          existing.status !== row.status ||
          (nextPhone !== "" && prevPhone !== nextPhone) ||
          (existing.currentAddress || "").trim() !== (row.currentAddress || row.address || "").trim() ||
          (existing.permanentAddress || "").trim() !== (row.permanentAddress || "").trim() ||
          (existing.ownerName || "").trim().toUpperCase() !== (row.ownerName || "").trim().toUpperCase() ||
          householdChanged ||
          (existing.temporaryRegDate || "").trim() !== (row.temporaryRegDate || "").trim() ||
          (existing.temporaryExpDate || "").trim() !== (row.temporaryExpDate || "").trim();
        if (hasChange) {
          updatedResidents.push({ old: existing, new: row });
        } else {
          unchangedCount++;
        }
      }
    }

    // Cư dân cũ cùng diện không còn trong danh sách mới → đã rời đi khỏi địa bàn KP3
    const removedResidents: Resident[] = [];
    scopedExistingByCccd.forEach((resident, cccd) => {
      if (!newCccdSet.has(cccd)) {
        removedResidents.push(resident);
      }
    });

    setSyncDiff({
      newResidents,
      updatedResidents,
      removedResidents,
      unchangedCount,
      syncStatus,
    });
  }, [parsedData, residents, enableSmartSync]);

  const handleEditClick = (res: Resident) => {
    navigate(getResidentEditPath(res.id));
  };

  const handleOpenAddModal = () => {
    navigate(getResidentCreatePath(false));
  };

  const handleOpenAddForeignerModal = () => {
    navigate(getResidentCreatePath(true));
  };

  const handleOpenCT07 = (res: Resident) => {
    setResidentForCT07(res);
    setShowCT07Modal(true);
  };

  // Download Sample Excel Template with full fields
  const downloadTemplate = () => {
    const headers = [
      {
        "Họ và Tên": "Nguyễn Văn Hùng",
        "Số CCCD": "079068001234",
        "Ngày cấp CCCD": "15/05/2021",
        "Nơi cấp CCCD": "Cục Cảnh sát QLHC về TTXH",
        "Giới tính": "Nam",
        "Ngày sinh": "15/04/1968",
        "Dân tộc": "Kinh",
        "Tôn giáo": "Không",
        "Quốc tịch": "Việt Nam",
        "Quê quán": "Nam Định",
        "Số điện thoại": "0903829112",
        "Diện cư trú": "Thường trú",
        "Trình độ học vấn": "Thạc sĩ Quản lý Nhà nước",
        "Nghề nghiệp": "Hưu trí / Bí thư chi bộ",
        "Nơi làm việc": "Chi bộ Khu phố 3, Phường An Phú",
        "Tình trạng hôn nhân": "Đã kết hôn",
        "Địa chỉ cư trú": "42/3 Lương Định Của, Phường An Phú",
        "Nơi thường trú gốc": "42/3 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
        "Nơi ở hiện nay": "42/3 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
        "Mã hộ khẩu": "HK-301",
        "Quan hệ với chủ hộ": "Chủ hộ",
        "Mã số BHYT": "HT279068001234",
        "Nghĩa vụ quân sự": "Sĩ quan dự bị / Đã hoàn thành",
        "Nhóm chính sách": "Đảng viên / Cán bộ hưu trí",
        "Người liên hệ khẩn cấp": "Trần Thị Lan (Vợ) - 0918345678",
        "Ghi chú": "Bí thư Chi bộ KP3, Đảng viên gương mẫu"
      },
      {
        "Họ và Tên": "Nguyễn Thị Ngọc",
        "Số CCCD": "079073005511",
        "Ngày cấp CCCD": "20/09/2021",
        "Nơi cấp CCCD": "Cục Cảnh sát QLHC về TTXH",
        "Giới tính": "Nữ",
        "Ngày sinh": "11/03/1973",
        "Dân tộc": "Kinh",
        "Tôn giáo": "Không",
        "Quốc tịch": "Việt Nam",
        "Quê quán": "Bình Định",
        "Số điện thoại": "0908123456",
        "Diện cư trú": "Thường trú",
        "Trình độ học vấn": "Dược sĩ Đại học",
        "Nghề nghiệp": "Dược sĩ / Chi ủy viên",
        "Nơi làm việc": "Nhà thuốc An Phú Care",
        "Tình trạng hôn nhân": "Đã kết hôn",
        "Địa chỉ cư trú": "18/2 Lương Định Của, Phường An Phú",
        "Nơi thường trú gốc": "18/2 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
        "Nơi ở hiện nay": "18/2 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
        "Mã hộ khẩu": "HK-304",
        "Quan hệ với chủ hộ": "Vợ",
        "Mã số BHYT": "DN479073005511",
        "Nghĩa vụ quân sự": "Không thuộc diện",
        "Nhóm chính sách": "Đảng viên / Chi ủy viên Chi bộ KP3",
        "Người liên hệ khẩn cấp": "Lê Văn Sơn (Chồng) - 0944112233",
        "Ghi chú": "Chi ủy viên, phụ trách an sinh"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_sach_cu_dan_chuan_CSDL");
    XLSX.writeFile(workbook, "Mau_Danh_Sach_Dan_Cu_Thuong_Tru_KP3_Chuan_CSDL.xlsx");
  };

  // Export filtered residents to Excel (honest empty values + audit log)
  const handleExportFullExcel = () => {
    const exportRows = filteredResidents.map((r, i) => ({
      "STT": i + 1,
      "Mã cư dân": r.id,
      "Họ và Tên": r.fullName,
      "Số CCCD": r.cccd || "Chưa cập nhật",
      "Ngày cấp CCCD": r.idIssueDate || "Chưa cập nhật",
      "Nơi cấp CCCD": r.idIssuePlace || "Chưa cập nhật",
      "Giới tính": r.gender || "Chưa cập nhật",
      "Ngày sinh": r.birthDate || "Chưa cập nhật",
      "Dân tộc": r.ethnicity || "Chưa cập nhật",
      "Tôn giáo": r.religion || "Chưa cập nhật",
      "Quốc tịch": r.nationality || "Việt Nam",
      "Quê quán": r.hometown || "Chưa cập nhật",
      "Số điện thoại": r.phone && r.phone !== "N/A" ? r.phone : "Chưa cập nhật",
      "Diện cư trú": r.status,
      "Ngày ĐK tạm trú": r.temporaryRegDate || "Chưa cập nhật",
      "Ngày hết hạn tạm trú": r.temporaryExpDate || "Chưa cập nhật",
      "Trình độ học vấn": r.education || "Chưa cập nhật",
      "Nghề nghiệp": r.occupation || "Chưa cập nhật",
      "Nơi làm việc": r.workplace || "Chưa cập nhật",
      "Tình trạng hôn nhân": r.maritalStatus || "Chưa cập nhật",
      "Địa chỉ cư trú": r.address || "Chưa cập nhật",
      "Nơi thường trú gốc": r.permanentAddress || "Chưa cập nhật",
      "Nơi ở hiện nay": r.currentAddress || r.temporaryAddress || r.address || "Chưa cập nhật",
      "Mã hộ khẩu": r.householdId || "Chưa cập nhật",
      "Quan hệ với chủ hộ": r.relationToOwner || "Chưa cập nhật",
      "Mã số BHYT": r.healthInsuranceNumber || "Chưa cập nhật",
      "Nghĩa vụ quân sự": r.militaryServiceStatus || "Chưa cập nhật",
      "Nhóm chính sách / Đoàn thể":
        r.policyGroup && r.policyGroup !== "Bình thường" && r.policyGroup !== "Dân cư phổ thông"
          ? r.policyGroup
          : "Chưa cập nhật",
      "Người liên hệ khẩn cấp": r.emergencyContact || "Chưa cập nhật",
      "Ghi chú": r.notes || "",
      "Ngày đăng ký": r.joinDate || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Sach_Dan_Cu_KP3");
    const fileName = `Danh_Sach_Dan_Cu_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    void recordAuditLog({
      actorName: "Cán bộ Quản lý Dân cư",
      actorRole: "Ban điều hành Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất danh sách cư dân ra Excel",
      targetSummary: `Đã xuất ${filteredResidents.length} nhân khẩu (Bộ lọc: ${statusFilter}${statusFilter === "Tạm trú" && temporaryExpiryFilter !== "Tất cả" ? ` - ${temporaryExpiryFilter}` : ""}${policyFilter !== "Tất cả" ? ` - ${policyFilter}` : ""}${toFilter !== "all" ? ` - ${toFilter}` : ""}) ra tệp ${fileName}`,
    });
  };

  // Export Foreign Residents List to Excel (Báo cáo Công an Phường & Lưu trữ)
  const handleExportForeignResidentsExcel = () => {
    const foreignList = filteredResidents.filter(r => isForeignResident(r));
    const sourceList = foreignList.length > 0 ? foreignList : residents.filter(r => isForeignResident(r));
    const exportRows = sourceList.map((r, i) => ({
      "STT": i + 1,
      "Mã cư dân": r.id,
      "Họ và Tên (Full Name)": r.fullName,
      "Quốc tịch (Nationality)": r.nationality || "Nước ngoài",
      "Số Hộ chiếu (Passport No.)": r.passportNumber || r.cccd,
      "Ngày hết hạn Hộ chiếu": r.passportExpiryDate || "Chưa cập nhật",
      "Cơ quan cấp HC": r.idIssuePlace || "Chưa cập nhật",
      "Giới tính": r.gender,
      "Ngày sinh": r.birthDate || "Chưa cập nhật",
      "Số điện thoại tại VN": r.phone && r.phone !== "N/A" ? r.phone : "Chưa cập nhật",
      "Loại thị thực / Cư trú": r.visaOrCardType || "Chưa cập nhật",
      "Số thẻ / Thị thực": r.visaOrCardNumber || "Chưa cập nhật",
      "Thời hạn cư trú từ ngày": r.visaValidFrom || "Chưa cập nhật",
      "Thời hạn cư trú đến ngày": r.visaValidUntil || "Chưa cập nhật",
      "Mã khai báo tạm trú trực tuyến": r.temporaryRegistrationCode || "Chưa cập nhật",
      "Ngày khai báo CA Phường": r.temporaryRegistrationDate || "Chưa cập nhật",
      "Tình trạng khai báo": r.temporaryRegistrationStatus || "Chưa cập nhật",
      "Nghề nghiệp / Vị trí công tác": r.occupation || "Chưa cập nhật",
      "Cơ quan / Doanh nghiệp bảo lãnh": r.sponsoringOrganization || r.workplace || "Chưa cập nhật",
      "Số Giấy phép LĐ (GPLĐ)": r.workPermitNumber || "Chưa cập nhật",
      "Địa chỉ cư trú tại KP3": r.temporaryAddress || r.address || "Chưa cập nhật",
      "Chủ nhà / Cơ sở cho thuê": r.landlordContact || "Chưa cập nhật",
      "Mã hộ liên kết": r.householdId || "Chưa cập nhật",
      "Người liên hệ khẩn cấp": r.emergencyContact || "Chưa cập nhật",
      "Ghi chú lưu trú": r.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DS_Nguoi_Nuoc_Ngoai_KP3");
    const fileName = `Danh_Sach_Nguoi_Nuoc_Ngoai_Tam_Tru_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    void recordAuditLog({
      actorName: "Cán bộ Quản lý Dân cư",
      actorRole: "Ban điều hành Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất danh sách người nước ngoài ra Excel",
      targetSummary: `Đã xuất ${sourceList.length} hồ sơ người nước ngoài ra tệp ${fileName}`,
    });
  };

  // Dynamic row mapper for Excel & Paste text
  const mapRawRowToResident = (row: any, idx: number) => {
    const findVal = (keys: string[]) => {
      const foundKey = Object.keys(row).find(k =>
        keys.some(key => k.toLowerCase().trim().replace(/_/g, " ") === key.toLowerCase().trim().replace(/_/g, " "))
      );
      return foundKey ? String(row[foundKey]).trim() : "";
    };

    const fullName = findVal(["Họ và Tên", "Ho va Ten", "fullName", "Họ tên", "Ho ten", "Tên", "Ten", "HỌ TÊN", "Họ và tên"]);
    const cccd = findVal(["Số CCCD", "So CCCD", "cccd", "CMND", "Số định danh", "So dinh danh", "Số CCCD/CMND", "Số ĐDCN/CCCD/CMND", "CCCD"]);
    const idIssueDate = findVal(["Ngày cấp CCCD", "Ngay cap CCCD", "idIssueDate", "Ngày cấp", "Ngay cap"]);
    const idIssuePlace = findVal(["Nơi cấp CCCD", "Noi cap CCCD", "idIssuePlace", "Nơi cấp", "Noi cap"]);
    const genderStr = findVal(["Giới tính", "Gioi tinh", "gender", "Phái", "Phai", "GIỚI TÍNH"]);
    const birthDate = findVal(["Ngày sinh", "Ngay sinh", "birthDate", "Năm sinh", "Nam sinh", "Sinh nhật", "NĂM SINH"]);
    const ethnicity = findVal(["Dân tộc", "Dan toc", "ethnicity"]);
    const religion = findVal(["Tôn giáo", "Ton giao", "religion"]);
    const nationality = findVal(["Quốc tịch", "Quoc tich", "nationality"]);
    const hometown = findVal(["Quê quán", "Que quan", "hometown", "Nguyên quán", "Nguyen quan"]);
    const phone = findVal(["Số điện thoại", "So dien thoai", "phone", "SĐT", "SDT", "Điện thoại", "Dien thoai"]);
    const statusStr = findVal(["Diện cư trú", "Dien cu tru", "status", "Trạng thái", "Trang thai", "Cư trú", "Cu tru"]);
    const education = findVal(["Trình độ học vấn", "Trinh do hoc van", "education", "Trình độ", "Học vấn"]);
    const occupation = findVal(["Nghề nghiệp", "Nghe nghiep", "occupation", "Công việc", "Cong viec"]);
    const workplace = findVal(["Nơi làm việc", "Noi lam viec", "workplace", "Cơ quan", "Đơn vị"]);
    const maritalStatusStr = findVal(["Tình trạng hôn nhân", "Tinh trang hon nhan", "maritalStatus", "Hôn nhân"]);
    const address = findVal(["Địa chỉ cư trú", "Địa chỉ", "Dia chi", "address", "Nơi ở", "Noi o"]);
    const permanentAddress = findVal([
      "ĐỊA CHỈ THƯỜNG TRÚ", "Địa chỉ thường trú", "Dia chi thuong tru",
      "Nơi thường trú gốc", "Nơi thường trú", "Noi thuong tru", "permanentAddress", "Hộ khẩu thường trú",
      "HKTT" // Tạm trú file: cột "HKTT" = Hộ khẩu thường trú gốc
    ]);
    const currentAddressRaw = findVal([
      "CHỔ Ở HIỆN TẠI", "Chổ ở hiện tại", "Chỗ ở hiện tại", "Cho o hien tai",
      "ĐỊA CHỈ TẠM TRÚ", "Địa chỉ tạm trú", "Dia chi tam tru",
      "Nơi tạm trú", "Noi tam tru", "Nơi ở hiện nay", "temporaryAddress", "currentAddress",
      "Nơi ở hiện tại" // Thường trú file: cột J
    ]);
    const fatherName = findVal(["HỌ TÊN CHA", "Họ tên cha", "Ho ten cha", "Cha", "fatherName"]);
    const motherName = findVal(["HỌ TÊN MẸ", "Họ tên mẹ", "Ho ten me", "Mẹ", "motherName"]);
    const temporaryRegDate = findVal(["NGÀY ĐĂNG KÝ", "Ngày đăng ký", "Ngay dang ky", "temporaryRegDate", "NGÀY ĐK", "Ngày ĐK"]);
    const temporaryExpDate = findVal(["NGÀY HẾT HẠN", "Ngày hết hạn", "Ngay het han", "temporaryExpDate"]);
    const managementStatus = findVal(["TÌNH TRẠNG QUẢN LÝ", "Tình trạng quản lý", "managementStatus", "Diện quản lý"]);
    const householdId = findVal(["MÃ HỘ KHẨU", "Mã hộ khẩu", "Ma ho khau", "householdId", "Mã hộ", "Ma ho", "Số hộ khẩu", "So ho khau", "Số HSCT"]);
    const ownerName = findVal(["Họ và tên chủ hộ", "CHỦ HỘ TẠM TRÚ", "Chủ hộ", "Chu ho", "ownerName", "Tên chủ hộ"]);
    const relationToOwner = findVal(["Quan hệ với chủ hộ", "Quan he voi chu ho", "relationToOwner", "Quan hệ", "Quan he", "Quan hệ chủ hộ"]);
    const healthInsuranceNumber = findVal(["Mã số BHYT", "Ma so BHYT", "healthInsuranceNumber", "BHYT", "Thẻ BHYT"]);
    const militaryServiceStatus = findVal(["Nghĩa vụ quân sự", "Nghia vu quan su", "militaryServiceStatus", "NVQS"]);
    const policyGroup = findVal(["Nhóm chính sách", "Nhom chinh sach", "policyGroup", "Chính sách", "Đoàn thể", "Diện chính sách"]);
    const emergencyContact = findVal(["Người liên hệ khẩn cấp", "Liên hệ khẩn cấp", "emergencyContact"]);
    const registrationDate = findVal(["Ngày ĐKTT", "Ngày đăng ký thường trú", "registrationDate"]);
    const notes = findVal(["Ghi chú", "Ghi chu", "notes", "NGÀY LẬP HỘ"]);

    // Parse Gender
    let gender: "Nam" | "Nữ" = "Nam";
    if (genderStr.toLowerCase() === "nữ" || genderStr.toLowerCase() === "nu" || genderStr.toLowerCase() === "female" || genderStr.toLowerCase() === "f") {
      gender = "Nữ";
    }

    // Auto-normalize CCCD 12 digits (pad leading zeroes if lost from Excel)
    let cleanCccd = cccd.replace(/\D/g, "");
    if (cleanCccd.length > 0 && cleanCccd.length <= 12) {
      cleanCccd = cleanCccd.padStart(12, "0");
    }

    // Auto-normalize Birth Date (supports Excel serial date, ISO, and DD/MM/YYYY)
    let formattedBirthDate = birthDate || "";
    if (birthDate) {
      const trimmed = String(birthDate).trim().replace(/\.0$/, "");
      if (/^\d{4,5}$/.test(trimmed)) {
        const valNum = parseInt(trimmed, 10);
        if (valNum >= 1900 && valNum <= 2100 && trimmed.length === 4) {
          formattedBirthDate = `01/01/${valNum}`;
        } else if (valNum >= 10000 && valNum <= 65000) {
          try {
            const dt = new Date(Math.round((valNum - 25569) * 86400 * 1000));
            if (!isNaN(dt.getTime())) {
              const d = String(dt.getUTCDate()).padStart(2, "0");
              const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
              const y = dt.getUTCFullYear();
              formattedBirthDate = `${d}/${m}/${y}`;
            }
          } catch {
            // fallback
          }
        }
      } else if (trimmed.includes("-") && trimmed.length >= 10) {
        const parts = trimmed.slice(0, 10).split("-");
        if (parts.length === 3) {
          formattedBirthDate = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        }
      }
    }

    // Parse Status
    let status: "Thường trú" | "Tạm trú" | "Tạm vắng" = "Thường trú";
    const lowerStatus = statusStr.toLowerCase();
    if (lowerStatus.includes("tạm trú") || lowerStatus === "tam tru" || lowerStatus.includes("temporary") || !!temporaryRegDate || !!temporaryExpDate) {
      status = "Tạm trú";
    } else if (lowerStatus.includes("tạm vắng") || lowerStatus === "tam vang" || lowerStatus.includes("absent")) {
      status = "Tạm vắng";
    }

    // Parse Marital
    let maritalStatus: "Độc thân" | "Đã kết hôn" | "Ly hôn" | "Góa" | undefined = undefined;
    if (maritalStatusStr.includes("Độc thân") || maritalStatusStr.includes("Doc than")) {
      maritalStatus = "Độc thân";
    } else if (maritalStatusStr.includes("Ly hôn") || maritalStatusStr.includes("Ly hon")) {
      maritalStatus = "Ly hôn";
    } else if (maritalStatusStr.includes("Góa") || maritalStatusStr.includes("Goa")) {
      maritalStatus = "Góa";
    } else if (maritalStatusStr.includes("kết hôn") || maritalStatusStr.includes("ket hon")) {
      maritalStatus = "Đã kết hôn";
    }

    // Địa chỉ thường trú và Chỗ ở hiện tại / Tạm trú
    // File Thường trú: "Địa chỉ" (cột H) = permanent, "Nơi ở hiện tại" (cột J) = current
    // File Tạm trú: "Địa chỉ" (cột G) = tạm trú/current, "HKTT" (cột J) = permanent gốc
    let resolvedPermanent = permanentAddress || undefined;
    let resolvedCurrent = currentAddressRaw || undefined;

    if (status === "Thường trú") {
      // Thường trú: "Địa chỉ" = hộ khẩu thường trú (permanent), "Nơi ở hiện tại" = current
      if (!resolvedPermanent && address) resolvedPermanent = address;
      if (!resolvedCurrent && address) resolvedCurrent = address;
    } else if (status === "Tạm trú") {
      // Tạm trú: "Địa chỉ" = nơi tạm trú (current), "HKTT" = hộ khẩu gốc (permanent)
      if (!resolvedCurrent && address) resolvedCurrent = address;
    }

    let resolvedActiveAddress = resolvedCurrent || resolvedPermanent || "Khu phố 3, Phường An Phú";

    // Tự suy luận quan hệ chủ hộ từ tên chủ hộ (phân biệt Thường trú vs Tạm trú)
    let resolvedRelation =
      relationToOwner || (status === "Tạm trú" ? "Thành viên tạm trú" : "Thành viên");
    if (
      ownerName &&
      fullName &&
      ownerName.trim().toLowerCase() === fullName.trim().toLowerCase()
    ) {
      resolvedRelation = status === "Tạm trú" ? "Người đứng tên tạm trú" : "Chủ hộ";
    }

    // Normalize ngày đăng ký (Excel serial date → DD/MM/YYYY)
    const normalizeExcelDate = (val: string) => {
      if (!val) return undefined;
      const trimmed = String(val).trim().replace(/\.0$/, "");
      if (/^\d{5}$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        if (num >= 10000 && num <= 65000) {
          try {
            const dt = new Date(Math.round((num - 25569) * 86400 * 1000));
            if (!isNaN(dt.getTime())) {
              return `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}/${dt.getUTCFullYear()}`;
            }
          } catch { /* fallback */ }
        }
      }
      return val;
    };

    return {
      id: `TEMP-${idx}-${Date.now()}`,
      fullName: fullName || "",
      gender,
      birthDate: formattedBirthDate,
      cccd: cleanCccd || cccd,
      idIssueDate: idIssueDate || undefined,
      idIssuePlace: idIssuePlace || undefined,
      ethnicity: ethnicity || undefined,
      religion: religion || undefined,
      nationality: nationality || "Việt Nam",
      hometown: hometown || undefined,
      phone: phone || undefined,
      status,
      education: education || undefined,
      occupation: occupation || undefined,
      workplace: workplace || undefined,
      maritalStatus,
      address: resolvedActiveAddress,
      permanentAddress: resolvedPermanent,
      temporaryAddress: resolvedCurrent,
      currentAddress: resolvedCurrent,
      fatherName: fatherName || undefined,
      motherName: motherName || undefined,
      temporaryRegDate: normalizeExcelDate(temporaryRegDate) || normalizeExcelDate(registrationDate) || undefined,
      temporaryExpDate: normalizeExcelDate(temporaryExpDate) || undefined,
      managementStatus: managementStatus || undefined,
      householdId: householdId || (status === "Tạm trú" ? "Tạm trú" : undefined),
      relationToOwner: resolvedRelation,
      ownerName: ownerName || undefined,
      healthInsuranceNumber: healthInsuranceNumber || undefined,
      militaryServiceStatus: militaryServiceStatus || undefined,
      policyGroup: policyGroup || undefined,
      emergencyContact: emergencyContact || undefined,
      notes: notes || undefined,
      isValid: !!fullName && !!cleanCccd && cleanCccd.length >= 9
    };
  };

  // Khử trùng CCCD ngay khi nạp file / dán dữ liệu để ngăn lỗi PostgreSQL 21000
  // ("ON CONFLICT DO UPDATE command cannot affect row a second time")
  const deduplicateParsedRows = (rows: any[]) => {
    const validByCccd = new Map<string, any>();
    const invalidRows: any[] = [];
    let duplicateCount = 0;

    for (const row of rows) {
      const key = (row.cccd || "").trim();
      if (!row.isValid || key.length < 9) {
        invalidRows.push(row);
        continue;
      }
      const prev = validByCccd.get(key);
      if (!prev) {
        validByCccd.set(key, row);
      } else {
        duplicateCount++;
        const merged: any = { ...prev };
        Object.keys(row).forEach((k) => {
          if (k === "id") return;
          const v = row[k];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            merged[k] = v;
          }
        });
        validByCccd.set(key, merged);
      }
    }

    return {
      deduped: [...validByCccd.values(), ...invalidRows],
      duplicateCount,
    };
  };

  // Excel Parser Logic — Tự động tìm sheet "Khu phố 3" / "KP3" hoặc dùng sheet đầu tiên
  const parseSheetFromWorkbook = (workbook: any, sheetName: string, fileName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

    if (jsonData.length === 0) {
      showNotice(`Sheet "${sheetName}" trống hoặc không đúng định dạng!`, "warning");
      return;
    }

    const mapped = jsonData.map((row: any, idx: number) => mapRawRowToResident(row, idx));
    const { deduped, duplicateCount } = deduplicateParsedRows(mapped);
    setDuplicateMergedCount(duplicateCount);
    setParsedData(deduped);
    setImportFileName(
      `${fileName} [${sheetName}] (${deduped.length} nhân khẩu${duplicateCount > 0 ? `, đã gộp ${duplicateCount} dòng trùng CCCD` : ""})`
    );
    setAvailableSheets([]);
    setPendingWorkbook(null);
  };

  const handleExcelParse = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheets = workbook.SheetNames;

        // Tự động tìm sheet KP3
        const kp3Sheet = sheets.find((s: string) => {
          const lower = s.toLowerCase().replace(/\s+/g, "");
          return lower === "khuphố3" || lower === "khupho3" || lower === "kp3";
        });

        if (kp3Sheet) {
          parseSheetFromWorkbook(workbook, kp3Sheet, file.name);
          showNotice(`Đã tự động chọn sheet "${kp3Sheet}" (Khu phố 3)`, "info");
        } else if (sheets.length === 1) {
          parseSheetFromWorkbook(workbook, sheets[0], file.name);
        } else {
          setParsedData([]);
          setDuplicateMergedCount(0);
          setSyncDiff(null);
          setPendingWorkbook(workbook);
          setPendingFileName(file.name);
          setAvailableSheets(sheets);
          showNotice(`File có ${sheets.length} sheet. Vui lòng chọn sheet cần nhập!`, "info");
        }
      } catch (err) {
        showNotice("Có lỗi xảy ra khi xử lý file Excel. Vui lòng kiểm tra lại định dạng!", "error");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Raw Text / Paste Parser Logic (Tab-separated or Comma-separated)
  const handleParsePastedText = () => {
    const textareaEl = document.getElementById("raw-pasted-residents-textarea") as HTMLTextAreaElement | null;
    const textToParse = (pastedRawText || "").trim() || (textareaEl?.value || "").trim();
    if (!textToParse) {
      showNotice("Vui lòng dán danh sách hoặc bảng dữ liệu dân cư vào ô nhập!", "warning");
      return;
    }

    try {
      const lines = textToParse.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        showNotice("Dữ liệu cần có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu!", "warning");
        return;
      }

      // Check delimiter (tab or comma or semicolon)
      const firstLine = lines[0];
      const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""));
      const rows = lines.slice(1).map((line, idx) => {
        const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = cols[i] !== undefined ? cols[i] : "";
        });
        return mapRawRowToResident(rowObj, idx);
      });

      const { deduped, duplicateCount } = deduplicateParsedRows(rows);
      setDuplicateMergedCount(duplicateCount);
      setParsedData(deduped);
      setImportFileName(
        `Dữ liệu vừa dán (${deduped.length} cư dân${duplicateCount > 0 ? `, đã gộp ${duplicateCount} dòng trùng` : ""})`
      );
    } catch (err) {
      showNotice("Lỗi khi phân tích dữ liệu dạng văn bản!", "error");
      console.error(err);
    }
  };

  // Drag & Drop Helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv"))) {
      handleExcelParse(file);
    } else {
      showNotice("Chỉ chấp nhận tệp tin Excel (.xlsx, .xls) hoặc CSV!", "warning");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelParse(file);
    }
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    const rawValidRows = parsedData.filter(r => r.isValid);
    if (rawValidRows.length === 0) {
      showNotice("Không có dữ liệu cư dân hợp lệ nào để nhập!", "warning");
      return;
    }

    // Bảo vệ kép: Khử trùng tuyệt đối theo CCCD trước khi ghi vào PostgreSQL
    const uniqueRowMap = new Map<string, any>();
    for (const row of rawValidRows) {
      const cccdKey = (row.cccd || "").trim();
      if (cccdKey.length >= 9) {
        uniqueRowMap.set(cccdKey, row);
      }
    }
    const validRows = Array.from(uniqueRowMap.values());

    setIsUploadingToDb(true);
    setUploadStatusMsg("Đang chuẩn hóa và chuẩn bị đồng bộ vào Database...");

    try {
      const existingByCccd = new Map<string, Resident>();
      residents.forEach((r) => {
        const key = (r.cccd || "").trim();
        if (key) existingByCccd.set(key, r);
      });

      if (isSupabaseConfigured && supabase) {
        // Chuẩn hóa dữ liệu tương thích schema Supabase PostgreSQL (100% duy nhất theo CCCD)
        const dbPayloadMap = new Map<string, any>();
        for (const row of validRows) {
          const cccdClean = (row.cccd || "").trim();
          if (cccdClean.length < 9) continue;

          let birthDateIso: string | null = null;
          if (row.birthDate && row.birthDate.includes("/")) {
            const parts = row.birthDate.split("/");
            if (parts.length === 3) {
              const [d, m, yRaw] = parts;
              let y = (yRaw || "").trim();
              if (y.length === 2) {
                y = (parseInt(y, 10) <= 30 ? "20" : "19") + y;
              }
              if (y && m && d) {
                const candidate = `${y}-${m.trim().padStart(2, "0")}-${d.trim().padStart(2, "0")}`;
                const [yy, mm, dd] = candidate.split("-").map(Number);
                const dt = new Date(Date.UTC(yy, mm - 1, dd));
                if (
                  /^\d{4}-\d{2}-\d{2}$/.test(candidate) &&
                  dt.getUTCFullYear() === yy &&
                  dt.getUTCMonth() + 1 === mm &&
                  dt.getUTCDate() === dd
                ) {
                  birthDateIso = candidate;
                }
              }
            }
          } else if (row.birthDate && row.birthDate.includes("-")) {
            const candidate = row.birthDate.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(candidate) && !isNaN(Date.parse(candidate))) {
              birthDateIso = candidate;
            }
          }

          const birthYear = birthDateIso ? parseInt(birthDateIso.slice(0, 4), 10) : null;
          const isElderly = birthYear ? (2026 - birthYear) >= 60 : false;
          const prevRes = existingByCccd.get(cccdClean);
          const policyLower = (prevRes?.policyGroup || row.policyGroup || "").toLowerCase();

          dbPayloadMap.set(cccdClean, {
            full_name: (row.fullName || "").trim(),
            cccd: cccdClean,
            gender: row.gender === "Nữ" ? "Nữ" : "Nam",
            birth_date: birthDateIso,
            phone: row.phone && row.phone !== "N/A" ? row.phone.trim() : (prevRes?.phone && prevRes.phone !== "N/A" ? prevRes.phone : null),
            address: (row.address || row.temporaryAddress || row.permanentAddress || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh").trim(),
            permanent_address: row.permanentAddress?.trim() || null,
            current_address: (row.currentAddress || row.temporaryAddress || row.address)?.trim() || null,
            father_name: row.fatherName?.trim() || prevRes?.fatherName || null,
            mother_name: row.motherName?.trim() || prevRes?.motherName || null,
            temporary_reg_date: row.temporaryRegDate?.trim() || null,
            temporary_exp_date: row.temporaryExpDate?.trim() || null,
            management_status: row.managementStatus?.trim() || prevRes?.managementStatus || null,
            household_code: row.householdId?.trim() || null,
            relation_to_owner: row.relationToOwner?.trim() || (row.status === "Tạm trú" ? "Thành viên tạm trú" : "Thành viên"),
            owner_name: row.ownerName?.trim() || null,
            status: row.status || "Thường trú",
            occupation: row.occupation?.trim() || prevRes?.occupation || null,
            workplace: row.workplace?.trim() || prevRes?.workplace || null,
            nationality: row.nationality?.trim() || "Việt Nam",
            is_party_member: policyLower.includes("đảng viên"),
            is_policy_household: policyLower.includes("chính sách") || policyLower.includes("người có công"),
            is_elderly: isElderly,
            is_poor_household: policyLower.includes("hộ nghèo") || policyLower.includes("cận nghèo"),
          });
        }

        const dbPayload = Array.from(dbPayloadMap.values());

        // Chia lô 500 bản ghi và chạy song song (Concurrency x4)
        const BATCH_SIZE = 500;
        const CONCURRENCY = 4;
        const totalBatches: any[][] = [];
        for (let i = 0; i < dbPayload.length; i += BATCH_SIZE) {
          totalBatches.push(dbPayload.slice(i, i + BATCH_SIZE));
        }

        let insertedCount = 0;
        let stripOwnerNameFallback = false;
        for (let i = 0; i < totalBatches.length; i += CONCURRENCY) {
          const chunk = totalBatches.slice(i, i + CONCURRENCY);
          await Promise.all(
            chunk.map(async (batch) => {
              const payloadBatch = stripOwnerNameFallback
                ? batch.map(({ owner_name: _ignored, ...rest }) => rest)
                : batch;
              let { error: upsertErr } = await (supabase as any)
                .from("residents")
                .upsert(payloadBatch, { onConflict: "cccd" });

              if (upsertErr && String(upsertErr.message || "").includes("owner_name")) {
                stripOwnerNameFallback = true;
                const fallbackBatch = batch.map(({ owner_name: _ignored, ...rest }) => rest);
                const retry = await (supabase as any)
                  .from("residents")
                  .upsert(fallbackBatch, { onConflict: "cccd" });
                upsertErr = retry.error;
              }

              if (upsertErr) {
                console.error("Supabase upsert error:", upsertErr);
                throw new Error(upsertErr.message);
              }
              insertedCount += batch.length;
              setUploadStatusMsg(
                `Đang ghi siêu tốc vào Supabase: ${Math.min(insertedCount, dbPayload.length)}/${dbPayload.length} hồ sơ (${Math.round((insertedCount / dbPayload.length) * 100)}%)...`
              );
            })
          );
        }

        // Smart Sync: Xóa cư dân đã rời đi (không còn trong danh sách mới của Công an)
        let deletedCount = 0;
        const removedSet = new Set<string>();
        if (enableSmartSync && confirmRemoval && syncDiff && syncDiff.removedResidents.length > 0) {
          setUploadStatusMsg(`Đang xóa ${syncDiff.removedResidents.length} cư dân đã rời khỏi địa bàn...`);
          const removedCccds = syncDiff.removedResidents
            .map((r) => (r.cccd || "").trim())
            .filter((c) => c.length >= 9);
          if (removedCccds.length > 0) {
            const BATCH = 200;
            for (let i = 0; i < removedCccds.length; i += BATCH) {
              const batch = removedCccds.slice(i, i + BATCH);
              const { error: delErr } = await (supabase as any)
                .from("residents")
                .delete()
                .in("cccd", batch);
              if (delErr) {
                console.error("Delete error:", delErr);
              } else {
                deletedCount += batch.length;
                batch.forEach((c) => removedSet.add(c));
              }
              setUploadStatusMsg(`Đã xóa ${deletedCount}/${removedCccds.length} cư dân rời đi...`);
            }
          }
        }

        // Cập nhật State giao diện 1 lần duy nhất (bảo toàn ID & thông tin bổ sung của cư dân cũ)
        const buildMergedResident = (row: any, idx: number, prev?: Resident): Resident => ({
          id: prev?.id || `R${(residents.length + 1 + idx).toString().padStart(4, "0")}`,
          fullName: row.fullName,
          gender: row.gender,
          birthDate: row.birthDate,
          cccd: row.cccd,
          idIssueDate: row.idIssueDate || prev?.idIssueDate,
          idIssuePlace: row.idIssuePlace || prev?.idIssuePlace,
          ethnicity: row.ethnicity || prev?.ethnicity,
          religion: row.religion || prev?.religion,
          nationality: row.nationality || prev?.nationality || "Việt Nam",
          hometown: row.hometown || prev?.hometown,
          phone: row.phone || prev?.phone,
          status: row.status,
          education: row.education || prev?.education,
          occupation: row.occupation || prev?.occupation,
          workplace: row.workplace || prev?.workplace,
          maritalStatus: row.maritalStatus || prev?.maritalStatus,
          address: row.address,
          permanentAddress: row.permanentAddress,
          temporaryAddress: row.temporaryAddress,
          currentAddress: row.currentAddress,
          fatherName: row.fatherName || prev?.fatherName,
          motherName: row.motherName || prev?.motherName,
          temporaryRegDate: row.temporaryRegDate,
          temporaryExpDate: row.temporaryExpDate,
          managementStatus: row.managementStatus || prev?.managementStatus,
          householdId: row.householdId,
          relationToOwner: row.relationToOwner,
          ownerName: row.ownerName,
          healthInsuranceNumber: row.healthInsuranceNumber || prev?.healthInsuranceNumber,
          militaryServiceStatus: row.militaryServiceStatus || prev?.militaryServiceStatus,
          policyGroup: row.policyGroup || prev?.policyGroup,
          emergencyContact: row.emergencyContact || prev?.emergencyContact,
          notes: row.notes || prev?.notes,
          avatar:
            prev?.avatar ||
            (row.gender === "Nữ"
              ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
              : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"),
          joinDate: prev?.joinDate || new Date().toLocaleDateString("vi-VN"),
        });

        if (onUpdateResidents) {
          const baseList = removedSet.size > 0
            ? residents.filter((r) => !removedSet.has((r.cccd || "").trim()))
            : residents;
          const newMap = new Map<string, Resident>(baseList.map((r) => [(r.cccd || "").trim() || r.id, r]));
          validRows.forEach((row, i) => {
            const key = (row.cccd || "").trim();
            newMap.set(key, buildMergedResident(row, i, existingByCccd.get(key)));
          });
          onUpdateResidents(Array.from(newMap.values()));
        } else {
          validRows.forEach((row, i) => {
            const key = (row.cccd || "").trim();
            onAddResident(buildMergedResident(row, i, existingByCccd.get(key)));
          });
        }

        if (deletedCount > 0) {
          showNotice(
            `Đồng bộ hoàn tất: ${insertedCount} hồ sơ cập nhật + đã xóa ${deletedCount} cư dân rời đi khỏi CSDL!`,
            "success"
          );
        } else {
          showNotice(`Đồng bộ thành công ${insertedCount} hồ sơ cư dân vào Cơ sở dữ liệu!`, "success");
        }
      } else {
        // Fallback khi offline hoặc chưa config Supabase
        validRows.forEach((row, i) => {
          onAddResident({
            id: "R" + (residents.length + 1 + i).toString().padStart(3, "0"),
            fullName: row.fullName,
            gender: row.gender,
            birthDate: row.birthDate,
            cccd: row.cccd,
            idIssueDate: row.idIssueDate,
            idIssuePlace: row.idIssuePlace,
            ethnicity: row.ethnicity,
            religion: row.religion,
            nationality: row.nationality,
            hometown: row.hometown,
            phone: row.phone,
            status: row.status,
            education: row.education,
            occupation: row.occupation,
            workplace: row.workplace,
            maritalStatus: row.maritalStatus,
            address: row.address,
            permanentAddress: row.permanentAddress,
            temporaryAddress: row.temporaryAddress,
            currentAddress: row.currentAddress,
            fatherName: row.fatherName,
            motherName: row.motherName,
            temporaryRegDate: row.temporaryRegDate,
            temporaryExpDate: row.temporaryExpDate,
            managementStatus: row.managementStatus,
            householdId: row.householdId,
            relationToOwner: row.relationToOwner,
            ownerName: row.ownerName,
            healthInsuranceNumber: row.healthInsuranceNumber,
            militaryServiceStatus: row.militaryServiceStatus,
            policyGroup: row.policyGroup,
            emergencyContact: row.emergencyContact,
            notes: row.notes,
            avatar: `https://images.unsplash.com/photo-${1535713875002 + (i % 10)}?w=150`,
            joinDate: new Date().toLocaleDateString("vi-VN")
          });
        });
        showNotice(`Đã lưu ${validRows.length} hồ sơ vào bộ nhớ cục bộ.`, "success");
      }

      setShowImportModal(false);
      resetImportModalState();
    } catch (err: any) {
      showNotice("Lỗi khi ghi dữ liệu vào Supabase Database: " + (err?.message || "Không thể kết nối máy chủ CSDL"), "error");
    } finally {
      setIsUploadingToDb(false);
      setUploadStatusMsg("");
    }
  };

  // Calculate dynamic segment tab counts and foreign resident statistics (Memoized on residents change only)
  const {
    tabCounts,
    foreignResidentsList,
    tamTruResidentsList,
    tamTruExpiringSoonCount,
    tamTruExpiredCount,
    uniqueNationalities,
    trcCount,
    expiringSoonCount,
    registeredPoliceCount
  } = useMemo(() => {
    let thuongTru = 0;
    let tamVang = 0;
    const foreignList: Resident[] = [];
    const tamTruList: Resident[] = [];

    for (let i = 0; i < residents.length; i++) {
      const r = residents[i];
      const isForeign = isForeignResident(r);
      if (isForeign) {
        foreignList.push(r);
      } else if (r.status === "Thường trú") {
        const effective = getEffectiveResidencyStatus(r);
        if (effective === "Tạm vắng") {
          tamVang++;
        } else {
          thuongTru++;
        }
      } else if (r.status === "Tạm trú") {
        tamTruList.push(r);
      } else if (r.status === "Tạm vắng") {
        tamVang++;
      }
    }

    let expiringSoon = 0;
    let expired = 0;
    for (let i = 0; i < tamTruList.length; i++) {
      const exp = tamTruList[i].temporaryExpDate;
      if (exp) {
        const s = getTemporaryResidenceExpiryStatus(exp);
        if (s.isWarning) expiringSoon++;
        else if (s.isExpired) expired++;
      }
    }

    const nationalitiesSet = new Set<string>();
    let trc = 0;
    let fExpSoon = 0;
    let registeredPolice = 0;

    for (let i = 0; i < foreignList.length; i++) {
      const fr = foreignList[i];
      if (fr.nationality) nationalitiesSet.add(fr.nationality);
      if (fr.visaOrCardType === "Thẻ tạm trú (TRC)") trc++;
      if (fr.visaValidUntil && getVisaExpiryStatus(fr.visaValidUntil).status === "expiring_soon") fExpSoon++;
      if (fr.temporaryRegistrationStatus === "Đã khai báo" || Boolean(fr.temporaryRegistrationCode)) registeredPolice++;
    }

    return {
      tabCounts: {
        all: residents.length,
        thuongTru,
        tamTru: tamTruList.length,
        tamVang,
        foreigners: foreignList.length
      },
      foreignResidentsList: foreignList,
      tamTruResidentsList: tamTruList,
      tamTruExpiringSoonCount: expiringSoon,
      tamTruExpiredCount: expired,
      uniqueNationalities: Array.from(nationalitiesSet),
      trcCount: trc,
      expiringSoonCount: fExpSoon,
      registeredPoliceCount: registeredPolice
    };
  }, [residents]);

  // Memoized Filter Logic with fast-path search & debounced input
  const filteredResidents = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const hasQuery = query.length > 0;

    return residents.filter(res => {
      const isForeign = isForeignResident(res);

      let matchesStatus = true;
      if (statusFilter === "Người nước ngoài") {
        if (!isForeign) return false;
        if (foreignNationalityFilter !== "Tất cả" && res.nationality !== foreignNationalityFilter) return false;
        if (foreignVisaTypeFilter !== "Tất cả" && res.visaOrCardType !== foreignVisaTypeFilter) return false;
        if (foreignExpiryFilter !== "Tất cả") {
          const expiryInfo = getVisaExpiryStatus(res.visaValidUntil);
          if (foreignExpiryFilter === "Sắp hết hạn" && expiryInfo.status !== "expiring_soon") return false;
          if (foreignExpiryFilter === "Còn hạn dài" && expiryInfo.status !== "valid") return false;
          if (foreignExpiryFilter === "Đã hết hạn" && expiryInfo.status !== "expired") return false;
        }
      } else if (statusFilter === "Tạm trú") {
        if (res.status !== "Tạm trú" || isForeign) return false;
        if (temporaryExpiryFilter !== "Tất cả") {
          const expStatus = getTemporaryResidenceExpiryStatus(res.temporaryExpDate);
          if (temporaryExpiryFilter === "Sắp hết hạn (< 30 ngày)" && !expStatus.isWarning) return false;
          if (temporaryExpiryFilter === "Đã hết hạn" && !expStatus.isExpired) return false;
          if (temporaryExpiryFilter === "Còn hạn dài" && (expStatus.isWarning || expStatus.isExpired)) return false;
        }
      } else if (statusFilter === "Tạm vắng") {
        const effective = getEffectiveResidencyStatus(res);
        if (effective !== "Tạm vắng") return false;
      } else if (statusFilter !== "Tất cả") {
        if (statusFilter === "Thường trú") {
          matchesStatus = res.status === "Thường trú" && !isForeign && getEffectiveResidencyStatus(res) !== "Tạm vắng";
        } else {
          matchesStatus = res.status === statusFilter && !isForeign;
        }
      }

      if (!matchesStatus) return false;

      if (genderFilter !== "Tất cả" && res.gender !== genderFilter) return false;
      if (policyFilter !== "Tất cả") {
        if (policyFilter === "Người cao tuổi") {
          if (!isElderlyResident(res)) return false;
        } else if (!res.policyGroup || !res.policyGroup.includes(policyFilter)) {
          return false;
        }
      }
      if (toFilter !== "all" && extractKp3Area(res.address) !== toFilter) return false;

      if (!hasQuery) return true;

      // Fast-path text matches
      return (
        res.fullName.toLowerCase().includes(query) ||
        res.cccd.toLowerCase().includes(query) ||
        (res.phone && res.phone.includes(query)) ||
        (res.address && res.address.toLowerCase().includes(query)) ||
        (res.householdId && res.householdId.toLowerCase().includes(query)) ||
        (res.occupation && res.occupation.toLowerCase().includes(query)) ||
        (res.hometown && res.hometown.toLowerCase().includes(query)) ||
        (res.passportNumber && res.passportNumber.toLowerCase().includes(query)) ||
        (res.nationality && res.nationality.toLowerCase().includes(query)) ||
        (res.temporaryRegistrationCode && res.temporaryRegistrationCode.toLowerCase().includes(query)) ||
        (res.visaOrCardNumber && res.visaOrCardNumber.toLowerCase().includes(query)) ||
        (res.sponsoringOrganization && res.sponsoringOrganization.toLowerCase().includes(query)) ||
        (res.workPermitNumber && res.workPermitNumber.toLowerCase().includes(query)) ||
        (res.healthInsuranceNumber && res.healthInsuranceNumber.toLowerCase().includes(query)) ||
        (res.policyGroup && res.policyGroup.toLowerCase().includes(query))
      );
    });
  }, [
    residents,
    searchTerm,
    statusFilter,
    foreignNationalityFilter,
    foreignVisaTypeFilter,
    foreignExpiryFilter,
    temporaryExpiryFilter,
    genderFilter,
    policyFilter,
    toFilter
  ]);

  // Pagination Logic
  const totalItems = filteredResidents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + itemsPerPage);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const activeSubFilterCount =
    (toFilter !== "all" ? 1 : 0) +
    (genderFilter !== "Tất cả" ? 1 : 0) +
    (policyFilter !== "Tất cả" ? 1 : 0) +
    (statusFilter === "Tạm trú" && temporaryExpiryFilter !== "Tất cả" ? 1 : 0);

  return (
    <div id="citizen-management-view" className="space-y-4">
      {/* Header and Action Buttons */}
      <PageHeader
        title="Quản lý Dân cư Khu phố"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard/settings?subtab=zalo_oa")}
              className="flex items-center gap-1.5 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
              title="Nhắc gia hạn tạm trú trước 15 ngày qua Zalo OA & Email cho Chủ nhà trọ và Cư dân"
            >
              <BellRing size={14} className="text-slate-500 shrink-0" /> Nhắc hạn Zalo
            </button>
            <button
              id="btn-export-excel"
              onClick={handleExportFullExcel}
              className="flex items-center gap-1.5 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
              title="Xuất file Excel danh sách nhân khẩu theo bộ lọc hiện tại"
            >
              <Download size={14} className="text-slate-500 shrink-0" /> Xuất Excel ({formatVNNumber(filteredResidents.length)})
            </button>
            <button
              id="btn-import-excel"
              onClick={() => {
                resetImportModalState();
                setShowImportModal(true);
              }}
              className="flex items-center gap-1.5 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet size={14} className="text-slate-500 shrink-0" /> Nhập Excel
            </button>
            <button
              id="btn-add-resident"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Plus size={14} className="shrink-0" /> Thêm cư dân
            </button>
          </div>
        }
      />

      {notice && !showImportModal && (
        <InlineNotice
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* 4 Standardized StatCard KPI blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng số Dân cư"
          value={residents.length}
          badge="nhân khẩu"
          icon={<Users size={22} />}
          color="emerald"
          subtext={`Thường trú: ${formatVNNumber(tabCounts.thuongTru)}`}
          subtextRight={`Tạm trú: ${formatVNNumber(tabCounts.tamTru)}`}
          highlighted={statusFilter === "Tất cả"}
          onClick={() => handleStatusFilterChange("Tất cả")}
        />
        <StatCard
          label="Thường trú"
          value={tabCounts.thuongTru}
          badge="công dân"
          icon={<CheckCircle2 size={22} />}
          color="blue"
          highlighted={statusFilter === "Thường trú"}
          onClick={() =>
            handleStatusFilterChange(
              statusFilter === "Thường trú" ? "Tất cả" : "Thường trú"
            )
          }
        />
        <StatCard
          label="Tạm trú thực tế"
          value={tabCounts.tamTru}
          badge="người"
          icon={<Clock size={22} />}
          color="amber"
          highlighted={statusFilter === "Tạm trú"}
          onClick={() =>
            handleStatusFilterChange(
              statusFilter === "Tạm trú" ? "Tất cả" : "Tạm trú"
            )
          }
        />
        <StatCard
          label="Cảnh báo Hạn Tạm trú"
          value={tamTruExpiringSoonCount + tamTruExpiredCount}
          badge="cần rà soát"
          icon={<AlertTriangle size={22} />}
          color="rose"
          subtext={`Sắp hết hạn: ${formatVNNumber(tamTruExpiringSoonCount)}`}
          subtextRight={`Quá hạn: ${formatVNNumber(tamTruExpiredCount)}`}
          highlighted={
            statusFilter === "Tạm trú" &&
            (temporaryExpiryFilter === "Sắp hết hạn (< 30 ngày)" || temporaryExpiryFilter === "Đã hết hạn")
          }
          onClick={() => {
            setStatusFilter("Tạm trú");
            setTemporaryExpiryFilter(
              temporaryExpiryFilter === "Đã hết hạn" ? "Sắp hết hạn (< 30 ngày)" : "Đã hết hạn"
            );
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Minimalist Single-Row Filter & Search Bar (Collapsible Advanced Filters) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2.5 shadow-2xs">
        <div className="flex flex-col 2xl:flex-row gap-2.5 items-stretch 2xl:items-center justify-between">
          <CitizenSearchInput
            defaultValue={searchTerm}
            onSearch={handleSearchChange}
          />

          <div className="flex flex-wrap items-center justify-between 2xl:justify-end gap-2">
            {/* Residency Status Tabs */}
            <div className="flex flex-wrap items-center gap-0.5 bg-slate-100/90 border border-slate-200/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleStatusFilterChange("Tất cả")}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  statusFilter === "Tất cả"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                Tất cả ({formatVNNumber(tabCounts.all)})
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange("Thường trú")}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  statusFilter === "Thường trú"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                Thường trú ({formatVNNumber(tabCounts.thuongTru)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Tạm trú");
                  setTemporaryExpiryFilter("Tất cả");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  statusFilter === "Tạm trú" && temporaryExpiryFilter === "Tất cả"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                Tạm trú ({formatVNNumber(tabCounts.tamTru)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Tạm trú");
                  setTemporaryExpiryFilter("Sắp hết hạn (< 30 ngày)");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === "Tạm trú" && temporaryExpiryFilter === "Sắp hết hạn (< 30 ngày)"
                    ? "bg-amber-600 text-white font-semibold"
                    : "text-amber-700 hover:bg-amber-50 font-medium"
                }`}
              >
                <span>Sắp hết hạn ({formatVNNumber(tamTruExpiringSoonCount)})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Tạm trú");
                  setTemporaryExpiryFilter("Đã hết hạn");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === "Tạm trú" && temporaryExpiryFilter === "Đã hết hạn"
                    ? "bg-rose-600 text-white font-semibold"
                    : "text-rose-700 hover:bg-rose-50 font-medium"
                }`}
              >
                <span>Quá hạn ({formatVNNumber(tamTruExpiredCount)})</span>
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange("Tạm vắng")}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  statusFilter === "Tạm vắng"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                Tạm vắng ({formatVNNumber(tabCounts.tamVang)})
              </button>
              {tabCounts.foreigners > 0 && (
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange("Người nước ngoài")}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    statusFilter === "Người nước ngoài"
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  Nước ngoài ({formatVNNumber(tabCounts.foreigners)})
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle Advanced Sub-filters */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((v) => !v)}
                className={`h-9 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showAdvancedFilters || activeSubFilterCount > 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Filter size={13} />
                <span>Bộ lọc</span>
                {activeSubFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                    {activeSubFilterCount}
                  </span>
                )}
              </button>

              {/* Privacy-by-default PII Mask Toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowFullCccd((prev) => {
                    const next = !prev;
                    if (next) {
                      void recordAuditLog({
                        actorName: "Cán bộ Quản lý Dân cư",
                        actorRole: "Ban điều hành Khu phố 3",
                        category: "PII_ACCESS",
                        actionTitle: "Bật hiển thị số CCCD / Hộ chiếu đầy đủ",
                        targetSummary: `Mở khóa mặt nạ CCCD trên danh sách dân cư (${filteredResidents.length} nhân khẩu đang lọc)`,
                      });
                    }
                    return next;
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 h-9 border rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  showFullCccd
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                }`}
                title="Bật hoặc tắt che số CCCD / Hộ chiếu trên màn hình dùng chung"
              >
                {showFullCccd ? <EyeOff size={13} /> : <Eye size={13} />}
                <span className="hidden sm:inline">{showFullCccd ? "Che CCCD" : "Hiện CCCD"}</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100/80 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Xem dạng Bảng"
                  aria-label="Xem dạng Bảng"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "card"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Xem dạng Thẻ"
                  aria-label="Xem dạng Thẻ"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Sub-filters (Only visible when opened or active) */}
        {(showAdvancedFilters || activeSubFilterCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
            {statusFilter === "Tạm trú" && (
              <div className="w-full sm:w-56">
                <ReportSelect
                  aria-label="Lọc thời hạn tạm trú"
                  value={temporaryExpiryFilter}
                  onChange={(val) => {
                    setTemporaryExpiryFilter(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "Tất cả", label: `Thời hạn tạm trú: Tất cả (${formatVNNumber(tabCounts.tamTru)})` },
                    { value: "Sắp hết hạn (< 30 ngày)", label: `Sắp hết hạn < 30 ngày (${formatVNNumber(tamTruExpiringSoonCount)})` },
                    { value: "Đã hết hạn", label: `Đã hết hạn tạm trú (${formatVNNumber(tamTruExpiredCount)})` },
                    { value: "Còn hạn dài", label: `Còn hạn dài (${formatVNNumber(Math.max(0, tabCounts.tamTru - tamTruExpiringSoonCount - tamTruExpiredCount))})` },
                  ]}
                  className="w-full"
                />
              </div>
            )}

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

            <div className="w-full sm:w-40">
              <ReportSelect
                aria-label="Lọc theo giới tính"
                value={genderFilter}
                onChange={handleGenderFilterChange}
                options={[
                  { value: "Tất cả", label: "Giới tính: Tất cả" },
                  { value: "Nam", label: "Nam" },
                  { value: "Nữ", label: "Nữ" },
                ]}
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-52">
              <ReportSelect
                aria-label="Lọc theo diện chính sách"
                value={policyFilter}
                onChange={handlePolicyFilterChange}
                options={[
                  { value: "Tất cả", label: "Diện chính sách: Tất cả" },
                  { value: "Đảng viên", label: "Đảng viên" },
                  { value: "Người có công", label: "Người có công / Thương binh" },
                  { value: "Người cao tuổi", label: "Người cao tuổi (≥ 60 tuổi)" },
                  { value: "Hộ nghèo", label: "Hộ nghèo / Hộ cận nghèo" },
                  { value: "Đoàn viên", label: "Đoàn viên thanh niên" },
                ]}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Temporary Residence Expiry Alert Banner */}
      {statusFilter === "Tạm trú" && (tamTruExpiringSoonCount > 0 || tamTruExpiredCount > 0) && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-amber-950 text-xs">
                  Cảnh báo Quản lý Cư trú: Cư dân Tạm trú Sắp hết hạn &amp; Quá hạn
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-amber-900 border border-amber-200">
                  Trước 01 tháng (30 ngày)
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                Phát hiện <strong className="text-amber-950 font-bold">{tamTruExpiringSoonCount} nhân khẩu</strong> sắp hết hạn tạm trú trong vòng 30 ngày tới và <strong className="text-rose-700 font-bold">{tamTruExpiredCount} nhân khẩu</strong> đã hết hạn. Đề nghị cán bộ rà soát, thông báo cho chủ cơ sở lưu trú / nhà trọ và người tạm trú nộp hồ sơ gia hạn theo quy định Luật Cư trú.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setTemporaryExpiryFilter("Sắp hết hạn (< 30 ngày)");
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-none h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${temporaryExpiryFilter === "Sắp hết hạn (< 30 ngày)"
                  ? "bg-amber-700 text-white"
                  : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-300"
                }`}
            >
              <span>Xem DS sắp hết hạn</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-600 text-white">
                {tamTruExpiringSoonCount}
              </span>
            </button>
            {temporaryExpiryFilter !== "Tất cả" && (
              <button
                type="button"
                onClick={() => {
                  setTemporaryExpiryFilter("Tất cả");
                  setCurrentPage(1);
                }}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white bg-white/80 border border-slate-200 transition-colors cursor-pointer"
              >
                Hiện tất cả
              </button>
            )}
          </div>
        </div>
      )}

      {/* Foreign Resident Intelligence & Compliance Panel - Flat Hairline Light Theme */}
      {statusFilter === "Người nước ngoài" && (
        <div className="bg-white text-slate-900 p-5 rounded-2xl border border-purple-200 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                  <Globe size={18} />
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Phân hệ Quản lý Cư dân Người nước ngoài (Foreign Residents Compliance)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  Luật 47/2014 & TT 53/2016-BCA
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Theo dõi hồ sơ lưu trú, Hộ chiếu, Thẻ tạm trú (TRC), Thị thực lao động, Giấy phép lao động & Liên thông khai báo trực tuyến Công an Phường An Phú
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleExportForeignResidentsExcel}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="Xuất file Excel danh sách người nước ngoài gửi Công an Phường & Lưu trữ"
              >
                <Download size={14} /> Xuất DS Công an ({foreignResidentsList.length})
              </button>
              <button
                type="button"
                onClick={handleOpenAddForeignerModal}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus size={14} /> Thêm Người nước ngoài
              </button>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600 font-medium">Tổng người nước ngoài</p>
                <p className="text-xl font-bold text-slate-900">{foreignResidentsList.length} <span className="text-xs font-normal text-slate-600">người</span></p>
              </div>
            </div>

            <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                <Shield size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600 font-medium">Quốc gia & Vùng lãnh thổ</p>
                <p className="text-xl font-bold text-slate-900">{uniqueNationalities.length} <span className="text-xs font-normal text-slate-600">quốc gia</span></p>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                <Award size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600 font-medium">Thẻ tạm trú (TRC) dài hạn</p>
                <p className="text-xl font-bold text-slate-900">{trcCount} <span className="text-xs font-normal text-slate-600">thẻ</span></p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold shrink-0 ${expiringSoonCount > 0 ? "bg-amber-100 border-amber-200 text-amber-800" : "bg-emerald-100 border-emerald-200 text-emerald-700"}`}>
                {expiringSoonCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600 font-medium">Thời hạn lưu trú & Khai báo</p>
                <p className="text-xs font-bold text-slate-900">
                  {expiringSoonCount > 0 ? `${expiringSoonCount} ca sắp hết hạn` : `${registeredPoliceCount}/${foreignResidentsList.length} đã cấp KBTT`}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-filter Bar for Foreigners */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="text-slate-700 text-xs font-semibold flex items-center gap-1">
              <Filter size={13} className="text-purple-700" /> Lọc chuyên sâu:
            </span>

            <div className="w-full sm:w-48">
              <ReportSelect
                aria-label="Lọc theo quốc tịch"
                value={foreignNationalityFilter}
                onChange={(val) => {
                  setForeignNationalityFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "Tất cả", label: `Quốc tịch: Tất cả (${uniqueNationalities.length})` },
                  ...uniqueNationalities.map((nat) => ({ value: nat, label: `${getCountryFlag(nat)} ${nat}` })),
                ]}
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-52">
              <ReportSelect
                aria-label="Lọc theo loại thị thực"
                value={foreignVisaTypeFilter}
                onChange={(val) => {
                  setForeignVisaTypeFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "Tất cả", label: "Loại thị thực: Tất cả" },
                  { value: "Thẻ tạm trú (TRC)", label: "Thẻ tạm trú (TRC)" },
                  { value: "Thị thực LĐ", label: "Thị thực Lao động (Visa LĐ)" },
                  { value: "Thị thực ĐT", label: "Thị thực Đầu tư (Visa ĐT)" },
                  { value: "Miễn thị thực / E-Visa", label: "Miễn thị thực / E-Visa" },
                ]}
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-48">
              <ReportSelect
                aria-label="Lọc theo thời hạn cư trú"
                value={foreignExpiryFilter}
                onChange={(val) => {
                  setForeignExpiryFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "Tất cả", label: "Thời hạn cư trú: Tất cả" },
                  { value: "Còn hạn dài", label: "Còn hạn dài (> 30 ngày)" },
                  { value: "Sắp hết hạn", label: "Sắp hết hạn (≤ 30 ngày)" },
                  { value: "Đã hết hạn", label: "Đã quá hạn" },
                ]}
                className="w-full"
              />
            </div>

            {(foreignNationalityFilter !== "Tất cả" || foreignVisaTypeFilter !== "Tất cả" || foreignExpiryFilter !== "Tất cả") && (
              <button
                type="button"
                onClick={() => {
                  setForeignNationalityFilter("Tất cả");
                  setForeignVisaTypeFilter("Tất cả");
                  setForeignExpiryFilter("Tất cả");
                  setCurrentPage(1);
                }}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold underline cursor-pointer"
              >
                Đặt lại bộ lọc NNN
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container: Toàn bộ chiều rộng cho danh sách cư dân */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full">
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[230px] whitespace-nowrap">Cư dân & Nhân thân</th>
                  <th className="py-3.5 px-4 min-w-[205px] whitespace-nowrap">Số CCCD / BHYT</th>
                  <th className="py-3.5 px-4 min-w-[240px] whitespace-nowrap">Hộ khẩu & Nơi ở</th>
                  <th className="py-3.5 px-4 min-w-[225px] whitespace-nowrap">Diện cư trú & Thời hạn tạm trú</th>
                  <th className="py-3.5 px-4 text-center min-w-[110px] whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] z-10">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm text-slate-400">
                      Không tìm thấy cư dân nào phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                ) : (
                  paginatedResidents.map((res, idx) => {
                    const effectiveStatus = getEffectiveResidencyStatus(res);
                    const statusColors: Record<string, string> = {
                      "Thường trú": "bg-emerald-50 text-emerald-700 border-emerald-200",
                      "Tạm trú": "bg-amber-50 text-amber-700 border-amber-200",
                      "Tạm vắng": "bg-amber-50 text-amber-700 border-amber-200"
                    };
                    const isForeign = isForeignResident(res);
                    const expiryInfo = isForeign ? getVisaExpiryStatus(res.visaValidUntil) : null;
                    const tamTruExpiry = (!isForeign && res.status === "Tạm trú") ? getTemporaryResidenceExpiryStatus(res.temporaryExpDate) : null;
                    const hostelInfo = parseAccommodationInfo(res.address || res.currentAddress || res.temporaryAddress);
                    const openUpward = paginatedResidents.length > 3
                      ? idx >= paginatedResidents.length - 3
                      : idx > 0 && idx >= paginatedResidents.length - 1;

                    return (
                      <tr
                        key={res.id}
                        id={`resident-row-${res.id}`}
                        onClick={() => handleOpenDetailModal(res)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {hasRealUploadedAvatar(res.avatar) ? (
                                <img
                                  src={res.avatar}
                                  alt={res.fullName}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 group-hover:border-emerald-400 transition-colors"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 transition-colors ${
                                    isForeign
                                      ? "bg-purple-50 text-purple-800 border-purple-200"
                                      : res.gender === "Nữ"
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                                >
                                  {getResidentMonogram(res.fullName)}
                                </div>
                              )}
                              {isForeign && (
                                <span className="absolute -bottom-1 -right-1 text-xs" title={`Quốc tịch: ${res.nationality}`}>
                                  {getCountryFlag(res.nationality)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-nowrap">
                                <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-sm whitespace-nowrap truncate hover:underline" title={res.fullName}>
                                  {res.fullName}
                                </span>
                                {isForeign && (
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                                    {res.nationality || "Nước ngoài"}
                                  </span>
                                )}
                                {res.policyGroup?.includes("Đảng viên") && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Đảng viên"></span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                <span>{res.gender}</span>
                                <span>•</span>
                                <span>{res.birthDate}</span>
                                {isForeign ? (
                                  <span>• {res.nationality}</span>
                                ) : (
                                  res.ethnicity && <span>• {res.ethnicity}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isForeign ? (
                            <div>
                              <div className="font-mono text-xs font-bold text-purple-900 flex items-center gap-1">
                                <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded font-sans font-bold">HC</span>
                                {maskCccd(res.passportNumber || res.cccd, showFullCccd)}
                              </div>
                              {res.passportExpiryDate && (
                                <div className="text-xs text-slate-600 font-mono mt-0.5">
                                  Hạn HC: {res.passportExpiryDate}
                                </div>
                              )}
                              {res.temporaryRegistrationCode && (
                                <div className="text-xs text-emerald-700 font-mono mt-0.5 font-medium truncate max-w-[170px]" title={res.temporaryRegistrationCode}>
                                  CA: {res.temporaryRegistrationCode}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono text-xs font-bold text-slate-900">{maskCccd(res.cccd, showFullCccd)}</div>
                              {res.healthInsuranceNumber ? (
                                <div className="text-xs text-emerald-700 font-mono mt-0.5 font-medium">
                                  BHYT: {res.healthInsuranceNumber}
                                </div>
                              ) : res.idIssueDate ? (
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                  Cấp: {res.idIssueDate}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickViewHousehold(res.householdId);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold transition-colors cursor-pointer"
                              title={`Xem Sổ hộ tịch ${res.householdId}`}
                            >
                              <Home size={11} className="text-emerald-700" />
                              <span>{res.householdId}</span>
                            </button>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                              {extractKp3Area(res.address)}
                            </span>
                          </div>
                          {res.relationToOwner && (
                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                              Quan hệ: {res.relationToOwner}
                            </div>
                          )}
                          <div className="text-xs text-slate-700 truncate max-w-[290px] mt-0.5 flex items-center gap-1" title={res.address}>
                            <MapPin size={11} className="text-slate-500 shrink-0" />
                            <span>{formatCompactKp3Address(res.address || res.currentAddress)}</span>
                          </div>
                          {hostelInfo.isHostel && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                                <Home size={11} className="text-amber-700" />
                                <span>{hostelInfo.hostelName}</span>
                              </span>
                              {hostelInfo.phone && (
                                <a
                                  href={`tel:${hostelInfo.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs text-emerald-800 font-mono font-semibold hover:underline bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                                  title="Gọi điện cho chủ nhà trọ"
                                >
                                  <Phone size={11} /> {hostelInfo.phone}
                                </a>
                              )}
                            </div>
                          )}
                          {isForeign && res.landlordContact && (
                            <div className="text-xs text-slate-600 truncate max-w-[280px] mt-0.5 flex items-center gap-1">
                              <Home size={11} className="text-slate-500 shrink-0" />
                              <span>Chủ nhà: {res.landlordContact}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isForeign ? (
                            <div className="space-y-1">
                              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
                                {res.visaOrCardType || "Tạm trú"}
                              </span>
                              {expiryInfo && (
                                <div className={`text-xs px-2 py-0.5 rounded-md border font-mono truncate max-w-[160px] ${expiryInfo.badgeClass}`}>
                                  {expiryInfo.label}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {effectiveStatus === "Tạm vắng" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Tạm vắng
                                  </span>
                                ) : (
                                  <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusColors[res.status]}`}>
                                    {res.status}
                                  </span>
                                )}
                                {res.policyGroup && res.policyGroup !== "Bình thường" && res.policyGroup !== "Dân cư phổ thông" && (
                                  <span className="text-xs font-semibold text-rose-700 truncate max-w-[140px]">
                                    {res.policyGroup}
                                  </span>
                                )}
                              </div>
                              {/* CẢNH BÁO HẾT HẠN TẠM TRÚ TRƯỚC 1 THÁNG / QUÁ HẠN */}
                              {tamTruExpiry && tamTruExpiry.status !== "unknown" && (
                                <div>
                                  {tamTruExpiry.isWarning ? (
                                    <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border font-mono font-bold bg-amber-100 text-amber-950 border-amber-400" title={`Thời hạn tạm trú đến ngày ${tamTruExpiry.formattedDate}`}>
                                      <AlertTriangle size={12} className="text-amber-700 shrink-0" />
                                      <span>{tamTruExpiry.label}</span>
                                    </div>
                                  ) : tamTruExpiry.isExpired ? (
                                    <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border font-mono font-bold bg-rose-100 text-rose-900 border-rose-300" title={`Thời hạn tạm trú đã hết ngày ${tamTruExpiry.formattedDate}`}>
                                      <AlertCircle size={12} className="text-rose-700 shrink-0" />
                                      <span>{tamTruExpiry.label}</span>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      Hạn: {tamTruExpiry.formattedDate}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] ${activeDropdownId === res.id ? "z-30" : "z-10"}`}>
                          <div className="flex items-center justify-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(res);
                              }}
                              className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-colors cursor-pointer"
                              title="Xem nhanh hồ sơ"
                            >
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === res.id ? null : res.id);
                              }}
                              className={`min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer border ${activeDropdownId === res.id
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                                }`}
                              aria-label="Tùy chọn thao tác"
                              title="Tùy chọn thao tác"
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {/* Dropdown Menu Popup */}
                            {activeDropdownId === res.id && (
                              <div
                                className={`absolute right-0 ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenDetailModal(res);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                >
                                  <Eye size={14} className="text-emerald-600" />
                                  <span>Xem chi tiết hồ sơ</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDirections(res);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                >
                                  <Navigation size={14} className="text-emerald-600" />
                                  <span>Chỉ đường GIS</span>
                                </button>

                                {isForeign ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenNA17(res);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                  >
                                    <FileText size={14} className="text-purple-600" />
                                    <span>In Mẫu NA17 (BCA)</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenCT07(res);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                  >
                                    <Printer size={14} className="text-slate-600" />
                                    <span>In xác nhận CT07</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEditClick(res);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                >
                                  <Edit2 size={14} className="text-blue-600" />
                                  <span>Sửa thông tin</span>
                                </button>

                                <div className="my-1 border-t border-slate-100"></div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setConfirmDialog({
                                      title: "Xóa hồ sơ cư dân",
                                      description: `Bạn có chắc muốn xóa hồ sơ cư dân ${res.fullName}?`,
                                      confirmLabel: "Xóa hồ sơ",
                                      variant: "danger",
                                      onConfirm: () => {
                                        onDeleteResident(res.id);
                                        setConfirmDialog(null);
                                        showNotice(`Đã xóa hồ sơ cư dân ${res.fullName}.`, "info");
                                      }
                                    });
                                  }}
                                  className="w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                  <span>Xóa hồ sơ</span>
                                </button>
                              </div>
                            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4 sm:p-5 bg-slate-50/35">
            {filteredResidents.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 col-span-full">
                Không tìm thấy cư dân nào phù hợp với bộ lọc hiện tại
              </div>
            ) : (
              paginatedResidents.map((res) => {
                const cardEffectiveStatus = getEffectiveResidencyStatus(res);
                const statusColors: Record<string, string> = {
                  "Thường trú": "bg-emerald-50 text-emerald-800 border-emerald-200",
                  "Tạm trú": "bg-amber-50 text-amber-800 border-amber-200",
                  "Tạm vắng": "bg-amber-50 text-amber-700 border-amber-200"
                };
                const isForeign = isForeignResident(res);
                const expiryInfo = isForeign ? getVisaExpiryStatus(res.visaValidUntil) : null;
                const tamTruExpiry = (!isForeign && res.status === "Tạm trú") ? getTemporaryResidenceExpiryStatus(res.temporaryExpDate) : null;
                const hostelInfo = parseAccommodationInfo(res.address || res.currentAddress || res.temporaryAddress);
                const age = calculateResidentAge(res.birthDate);
                const compactAddr = formatCompactKp3Address(res.address || res.currentAddress || res.temporaryAddress);
                const hasValidHouseholdCode = Boolean(
                  res.householdId &&
                  res.householdId !== "Tạm trú" &&
                  res.householdId !== "Chưa cập nhật" &&
                  res.householdId !== "N/A"
                );
                const hasSpecialPolicy = Boolean(
                  res.policyGroup &&
                  res.policyGroup !== "Bình thường" &&
                  res.policyGroup !== "Dân cư phổ thông"
                );
                const shortRoleLabel =
                  res.relationToOwner === "Người đứng tên tạm trú"
                    ? "Đứng tên TT"
                    : res.relationToOwner === "Thành viên tạm trú"
                    ? "Thành viên TT"
                    : res.relationToOwner || "Thành viên";

                return (
                  <div
                    key={res.id}
                    id={`resident-card-${res.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenDetailModal(res)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenDetailModal(res);
                      }
                    }}
                    className="min-w-0 p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between gap-3 bg-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {/* TẦNG 1 + 2 + 3: ĐỊNH DANH, ĐỘ TUỔI & MÃ HỘ (KHÔNG LẶP TAG ĐỊA BÀN CẮT CỤT) */}
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            {hasRealUploadedAvatar(res.avatar) ? (
                              <img
                                src={res.avatar}
                                alt={res.fullName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 group-hover:border-emerald-400 transition-colors"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 transition-colors ${
                                  isForeign
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : res.gender === "Nữ"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                {getResidentMonogram(res.fullName)}
                              </div>
                            )}
                            {isForeign && (
                              <span className="absolute -bottom-1 -right-1 text-sm" title={`Quốc tịch: ${res.nationality}`}>
                                {getCountryFlag(res.nationality)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4
                              className="font-extrabold text-slate-900 text-[13.5px] leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors"
                              title={res.fullName}
                            >
                              {res.fullName}
                            </h4>
                            <div className="flex items-center gap-1 mt-0.5 text-[11.5px] text-slate-600 whitespace-nowrap">
                              <span>{res.gender}</span>
                              <span>•</span>
                              <span className="font-mono">{res.birthDate}</span>
                              {age !== null && (
                                <span
                                  className={`px-1 py-0.5 rounded text-[11px] font-semibold ${
                                    age < 14
                                      ? "bg-sky-50 text-sky-800"
                                      : age >= 60
                                      ? "bg-amber-50 text-amber-900"
                                      : "text-slate-500"
                                  }`}
                                >
                                  ({age}t)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isForeign ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0 bg-purple-50 text-purple-700 border-purple-200">
                            {res.visaOrCardType || "Tạm trú NNN"}
                          </span>
                        ) : cardEffectiveStatus === "Tạm vắng" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Tạm vắng
                          </span>
                        ) : (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${statusColors[res.status]}`}>
                            {res.status}
                          </span>
                        )}
                      </div>

                      {/* Dải CCCD & Mã Hộ liên kết 1-chạm */}
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <span className="font-mono font-bold text-slate-800 truncate">
                          {isForeign
                            ? `HC: ${maskCccd(res.passportNumber || res.cccd, showFullCccd)}`
                            : `CCCD: ${maskCccd(res.cccd, showFullCccd)}`}
                        </span>
                        {hasValidHouseholdCode ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (res.householdId) handleQuickViewHousehold(res.householdId);
                            }}
                            title={`Mở hồ sơ hộ ${res.householdId} (${shortRoleLabel})`}
                            className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer shrink-0"
                          >
                            {res.householdId}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium shrink-0">{shortRoleLabel}</span>
                        )}
                      </div>

                      {/* Địa chỉ rút gọn thông minh + Tên Nhà trọ (nếu có) */}
                      <div className="space-y-1 text-xs min-w-0">
                        <div className="text-slate-700 flex items-center gap-1.5 min-w-0" title={res.address}>
                          <MapPin size={12} className="text-emerald-600 shrink-0" />
                          <span className="truncate min-w-0 flex-1 font-medium">{compactAddr}</span>
                        </div>
                        {hostelInfo.isHostel && (
                          <div className="text-amber-900 font-semibold flex items-center gap-1.5 min-w-0">
                            <Home size={12} className="text-amber-600 shrink-0" />
                            <span className="truncate min-w-0 flex-1">
                              {hostelInfo.hostelName}
                              {hostelInfo.phone ? ` • ${hostelInfo.phone}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TẦNG 4 + 5: DẢI HẠN CƯ TRÚ ĐỒNG NHẤT CHIỀU CAO & CHÂN THẺ TINH GỌN */}
                    <div className="space-y-2.5 pt-2.5 border-t border-slate-100 min-w-0">
                      {isForeign && expiryInfo ? (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-purple-800 font-semibold">
                            {res.temporaryRegistrationCode ? "Đã KBTT Công an" : "Chờ khai báo"}
                          </span>
                          <span className={`px-2 py-0.5 rounded border font-mono text-[11px] ${expiryInfo.badgeClass}`}>
                            {expiryInfo.label}
                          </span>
                        </div>
                      ) : res.status === "Tạm trú" ? (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-600 font-mono truncate">
                            Hạn TT: <strong className="text-slate-800">{tamTruExpiry?.formattedDate || res.temporaryExpDate || "Chưa rõ"}</strong>
                          </span>
                          {tamTruExpiry?.isExpired ? (
                            <span className="px-2 py-0.5 rounded-md border font-bold bg-rose-100 text-rose-900 border-rose-300 text-[11px] shrink-0">
                              Quá {Math.abs(tamTruExpiry.daysLeft || 0)} ngày
                            </span>
                          ) : tamTruExpiry?.isWarning ? (
                            <span className="px-2 py-0.5 rounded-md border font-bold bg-amber-100 text-amber-950 border-amber-400 text-[11px] shrink-0">
                              Còn {tamTruExpiry.daysLeft ?? 0} ngày
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                              Còn hiệu lực
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-600 truncate">
                            Vai trò: <strong className="text-slate-800">{shortRoleLabel}</strong>
                          </span>
                          {hasSpecialPolicy ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold truncate max-w-[140px]">
                              {res.policyGroup}
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold shrink-0">
                              Ổn định tại KP3
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(res)}
                          className="h-8 px-3 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                          title="Xem chi tiết hồ sơ cư dân"
                        >
                          <Eye size={13} />
                          <span>Xem hồ sơ</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDirections(res)}
                            className="h-8 px-2 inline-flex items-center justify-center gap-1 text-slate-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 border border-slate-200 text-[11px] font-semibold cursor-pointer transition-colors"
                            title="Định vị nơi cư trú trên Bản đồ GIS"
                          >
                            <MapPin size={12} className="text-emerald-600" />
                            <span>Bản đồ</span>
                          </button>
                          {isForeign ? (
                            <button
                              type="button"
                              onClick={() => handleOpenNA17(res)}
                              className="h-8 w-8 inline-flex items-center justify-center text-purple-700 hover:text-purple-900 rounded-lg hover:bg-purple-50 border border-purple-200 cursor-pointer transition-colors"
                              title="In mẫu NA17 (Khai báo NNN)"
                            >
                              <FileText size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCT07(res)}
                              className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-emerald-800 rounded-lg hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                              title="In xác nhận cư trú CT07"
                            >
                              <Printer size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditClick(res)}
                            className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                            title="Sửa hồ sơ"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <Pagination
          id="citizen-pagination"
          currentPage={activePage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL 2: IMPORT EXCEL & RAW DATA PASTE (Rendered via Portal to escape any ancestor stacking/transform context) */}
      {showImportModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/55 flex items-center justify-center z-[100] p-2.5 sm:p-4 backdrop-blur-xs">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-residents-modal-title"
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100dvh-1.25rem)] sm:max-h-[90dvh]"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-200 text-slate-900 px-4 py-3 sm:px-5 sm:py-3.5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="text-emerald-600 shrink-0" size={20} />
                  <h3 id="import-residents-modal-title" className="font-bold text-sm sm:text-base truncate">
                    Tích hợp danh sách dân cư vào hệ thống
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={isUploadingToDb}
                  onClick={() => {
                    setShowImportModal(false);
                    resetImportModalState();
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Đóng cửa sổ nhập Excel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Switcher: Upload File or Paste Raw Text */}
              <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setImportTab("file")}
                  className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    importTab === "file"
                      ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <UploadCloud size={15} /> Tải tệp Excel / CSV (.xlsx, .csv)
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab("paste")}
                  className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    importTab === "paste"
                      ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileCheck size={15} /> Dán bảng dữ liệu trực tiếp (Copy & Paste)
                </button>
              </div>

              {/* Modal Body (min-h-0 ensures flex child scrolls inside viewport instead of pushing footer off-screen) */}
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto min-h-0 flex-1 text-xs">
                {importTab === "file" ? (
                  parsedData.length > 0 ? (
                    /* Compact File Bar once parsed so Smart Sync + Preview + Footer all fit comfortably on screen */
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all ${
                        isDragging
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-emerald-200 bg-emerald-50/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-900 truncate">
                            Đã nạp: {importFileName}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Kéo thả hoặc bấm &ldquo;Chọn tệp khác&rdquo; để thay thế dữ liệu
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs cursor-pointer transition-colors">
                          <UploadCloud size={13} />
                          <span>Chọn tệp khác</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5 rounded-xl border border-emerald-200">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] tracking-wide">
                              ⚡ TỐC ĐỘ CAO
                            </span>
                            <p className="font-bold text-slate-900 text-xs">
                              Thuật toán phân tích thông minh Thường trú & Tạm trú:
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Tự động nhận diện Cột H & J (Thường trú & Chỗ ở hiện tại), Cột G & J (Địa chỉ tạm trú & Thường trú gốc), Chủ hộ tạm trú, Cha/Mẹ, Ngày đăng ký/Hết hạn và khử trùng CCCD.
                          </p>
                        </div>
                        <button
                          onClick={downloadTemplate}
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Download size={13} /> Tải file mẫu (.xlsx)
                        </button>
                      </div>

                      {/* Drag and Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-6 sm:p-7 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                          isDragging
                            ? "border-emerald-500 bg-emerald-500/5 scale-[0.99]"
                            : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <UploadCloud
                          size={38}
                          className={`mb-2 transition-colors ${isDragging ? "text-emerald-500" : "text-slate-400"}`}
                        />
                        {importFileName ? (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                              <CheckCircle size={15} /> Đã nạp: {importFileName}
                            </p>
                            <p className="text-[11px] text-slate-400">Kéo thả tệp khác để thay thế</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-700">Kéo và thả tệp Excel tại đây</p>
                            <p className="text-[11px] text-slate-400">
                              hoặc nhấp chuột để chọn tệp từ máy tính (.xlsx, .xls, .csv)
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  /* PASTE TEXT TAB */
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-800">Hướng dẫn dán bảng dữ liệu dân cư:</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Bạn có thể copy trực tiếp các ô từ Excel/Google Sheets hoặc văn bản cách nhau bởi dấu Tab/Dấu phẩy và dán vào bên dưới.
                      </p>
                    </div>

                    <textarea
                      id="raw-pasted-residents-textarea"
                      name="rawPastedResidents"
                      rows={parsedData.length > 0 ? 3 : 6}
                      value={pastedRawText}
                      onChange={(e) => setPastedRawText(e.target.value)}
                      placeholder={
                        "Họ và Tên\tSố CCCD\tGiới tính\tNgày sinh\tDiện cư trú\tĐịa chỉ\tMã hộ\nNguyễn Văn An\t079090001111\tNam\t10/05/1990\tThường trú\t42/3 Lương Định Của\tHK-301"
                      }
                      className="w-full p-3 font-mono text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-slate-50/30"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleParsePastedText}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                      >
                        <CheckCircle size={14} /> Phân tích dữ liệu vừa dán
                      </button>
                    </div>
                  </div>
                )}

                {/* Sheet Selector — Hiển thị khi file có nhiều sheet */}
                {availableSheets.length > 1 && pendingWorkbook && (
                  <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-2">
                    <p className="font-bold text-amber-800 text-xs sm:text-sm flex items-center gap-1.5">
                      <Layers size={15} />
                      File có {availableSheets.length} sheet — Chọn sheet cần nhập:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableSheets.map((sheetName) => {
                        const lower = sheetName.toLowerCase().replace(/\s+/g, "");
                        const isKp3 =
                          lower.includes("kp3") || lower.includes("khupho3") || lower.includes("khuphố3");
                        return (
                          <button
                            key={sheetName}
                            type="button"
                            onClick={() => parseSheetFromWorkbook(pendingWorkbook, sheetName, pendingFileName)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isKp3
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-sm hover:bg-emerald-700"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                            }`}
                          >
                            {sheetName} {isKp3 && "⭐"}
                          </button>
                        );
                      })}
                    </div>
                    {availableSheets.some((s) => {
                      const l = s.toLowerCase().replace(/\s+/g, "");
                      return l.includes("kp3") || l.includes("khupho3") || l.includes("khuphố3");
                    }) && <p className="text-[10px] text-amber-600">⭐ Sheet được đề xuất cho Khu phố 3</p>}
                  </div>
                )}

                {parsedData.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    {duplicateMergedCount > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                        <AlertCircle size={14} className="text-amber-600 shrink-0" />
                        <span>
                          Đã tự động gộp <strong>{formatVNNumber(duplicateMergedCount)}</strong> dòng bị lặp CCCD trong tệp Excel để đảm bảo đồng bộ CSDL không lỗi xung đột.
                        </span>
                      </div>
                    )}

                    {/* Smart Sync Diff Summary */}
                    {syncDiff && enableSmartSync ? (
                      <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                            <RefreshCw size={14} className="shrink-0" />
                            <span>
                              Phân tích Đồng bộ Thông minh — Danh sách {syncDiff.syncStatus} mới từ Công an
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setEnableSmartSync(false)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0"
                          >
                            Tắt so khớp
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                            <div className="text-base sm:text-lg font-black text-emerald-700 tabular-nums">
                              {formatVNNumber(syncDiff.newResidents.length)}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-700">Cư dân MỚI</div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
                            <div className="text-base sm:text-lg font-black text-amber-700 tabular-nums">
                              {formatVNNumber(syncDiff.updatedResidents.length)}
                            </div>
                            <div className="text-[10px] font-bold text-amber-700">Cập nhật thay đổi</div>
                          </div>
                          <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                            <div className="text-base sm:text-lg font-black text-slate-700 tabular-nums">
                              {formatVNNumber(syncDiff.unchangedCount)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500">Không thay đổi</div>
                          </div>
                          <div
                            className={`p-2 rounded-lg border text-center ${
                              syncDiff.removedResidents.length > 0
                                ? "bg-rose-50 border-rose-200"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div
                              className={`text-base sm:text-lg font-black tabular-nums ${
                                syncDiff.removedResidents.length > 0 ? "text-rose-700" : "text-slate-700"
                              }`}
                            >
                              {formatVNNumber(syncDiff.removedResidents.length)}
                            </div>
                            <div
                              className={`text-[10px] font-bold ${
                                syncDiff.removedResidents.length > 0 ? "text-rose-700" : "text-slate-500"
                              }`}
                            >
                              Đã rời khỏi KP3
                            </div>
                          </div>
                        </div>

                        {syncDiff.removedResidents.length > 0 && (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={confirmRemoval}
                                onChange={(e) => setConfirmRemoval(e.target.checked)}
                                className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-600"
                              />
                              <span className="text-xs font-bold text-rose-800">
                                Xóa {formatVNNumber(syncDiff.removedResidents.length)} cư dân {syncDiff.syncStatus} đã rời khỏi địa bàn KP3 (không còn trong danh sách Công an mới)
                              </span>
                            </label>
                            {confirmRemoval && (
                              <div className="border border-rose-200 rounded-lg overflow-hidden max-h-28 overflow-y-auto bg-white">
                                <table className="w-full text-[11px] text-left">
                                  <thead className="sticky top-0 bg-rose-100 text-rose-800 font-bold">
                                    <tr>
                                      <th className="py-1.5 px-2">Họ Tên</th>
                                      <th className="py-1.5 px-2">CCCD</th>
                                      <th className="py-1.5 px-2">Địa chỉ cũ</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-rose-100">
                                    {syncDiff.removedResidents.slice(0, 50).map((r) => (
                                      <tr key={r.cccd || r.id} className="hover:bg-rose-50/50">
                                        <td className="py-1 px-2 font-semibold text-slate-800">{r.fullName}</td>
                                        <td className="py-1 px-2 font-mono text-slate-600">{r.cccd}</td>
                                        <td className="py-1 px-2 text-slate-500 truncate max-w-[220px]">
                                          {r.currentAddress || r.address}
                                        </td>
                                      </tr>
                                    ))}
                                    {syncDiff.removedResidents.length > 50 && (
                                      <tr>
                                        <td colSpan={3} className="py-1.5 px-2 text-center text-rose-600 font-semibold">
                                          ... và {formatVNNumber(syncDiff.removedResidents.length - 50)} cư dân khác
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      !enableSmartSync && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                          <span>Đang tắt chế độ đối chiếu Đồng bộ Thông minh.</span>
                          <button
                            type="button"
                            onClick={() => setEnableSmartSync(true)}
                            className="font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            Bật lại so khớp
                          </button>
                        </div>
                      )
                    )}

                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-emerald-600" />
                        Kết quả phân tích ({formatVNNumber(parsedData.length)} nhân khẩu duy nhất):
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {parsedData.length > 100
                          ? `Xem trước 100 / ${formatVNNumber(parsedData.length)} hồ sơ`
                          : "Dòng màu đỏ thiếu hoặc sai CCCD"}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-44 overflow-y-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider z-10">
                          <tr>
                            <th className="py-2 px-3">Họ và Tên</th>
                            <th className="py-2 px-3">Số CCCD</th>
                            <th className="py-2 px-3">Ngày sinh</th>
                            <th className="py-2 px-3">Chủ hộ / Mã hộ</th>
                            <th className="py-2 px-3">Diện cư trú</th>
                            <th className="py-2 px-3 text-right">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedData.slice(0, 100).map((row) => (
                            <tr key={row.id} className={row.isValid ? "hover:bg-slate-50" : "bg-rose-50/50"}>
                              <td className="py-1.5 px-3 font-bold text-slate-800">
                                {row.fullName || <span className="text-rose-600 italic">Thiếu họ tên *</span>}
                              </td>
                              <td className="py-1.5 px-3 font-mono text-slate-700">
                                {row.cccd || <span className="text-rose-600 italic">Thiếu CCCD *</span>}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600">{row.birthDate || "-"}</td>
                              <td className="py-1.5 px-3 text-slate-700 truncate max-w-[160px]">
                                {row.ownerName || row.householdId || "-"}
                              </td>
                              <td className="py-1.5 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {row.isValid ? (
                                  <span className="text-emerald-600 font-bold flex items-center justify-end gap-1">
                                    <Check size={12} /> Hợp lệ
                                  </span>
                                ) : (
                                  <span
                                    className="text-rose-600 font-bold flex items-center justify-end gap-1"
                                    title="CCCD tối thiểu 9 số"
                                  >
                                    <AlertCircle size={12} /> Cần sửa
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer — Pinned shrink-0 so action buttons are ALWAYS visible */}
              <div className="bg-slate-50 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center shrink-0">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  {isSupabaseConfigured ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                      <Database size={13} className="text-emerald-600" />
                      Supabase PostgreSQL: Đã kết nối
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                      <AlertTriangle size={13} className="text-amber-600" />
                      Lưu trữ cục bộ (Offline)
                    </span>
                  )}
                  {isUploadingToDb && (
                    <span className="text-emerald-700 font-semibold animate-pulse truncate">
                      {uploadStatusMsg}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button
                    type="button"
                    disabled={isUploadingToDb}
                    onClick={() => {
                      setShowImportModal(false);
                      resetImportModalState();
                    }}
                    className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer text-xs font-semibold disabled:opacity-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingToDb || parsedData.filter((r) => r.isValid).length === 0}
                    onClick={handleConfirmImport}
                    className={`px-4 py-2 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isUploadingToDb || parsedData.filter((r) => r.isValid).length === 0
                        ? "bg-slate-400 cursor-not-allowed opacity-80"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer active:scale-95"
                    }`}
                  >
                    {isUploadingToDb ? (
                      <>
                        <Loader2 size={15} className="animate-spin shrink-0" />
                        <span>{uploadStatusMsg || "Đang ghi vào Supabase..."}</span>
                      </>
                    ) : syncDiff && enableSmartSync ? (
                      <>
                        <RefreshCw size={15} className="shrink-0" />
                        <span>
                          Đồng bộ {formatVNNumber(syncDiff.newResidents.length)} mới +{" "}
                          {formatVNNumber(syncDiff.updatedResidents.length)} cập nhật
                          {confirmRemoval && syncDiff.removedResidents.length > 0
                            ? ` • Xóa ${formatVNNumber(syncDiff.removedResidents.length)} rời đi`
                            : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <Database size={15} className="shrink-0" />
                        <span>
                          Tích hợp vào Database (
                          {formatVNNumber(parsedData.filter((r) => r.isValid).length)} hồ sơ hợp lệ)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 3: OFFICIAL POLICE CT07 CERTIFICATE MODAL */}
      {showCT07Modal && residentForCT07 && (
        <CT07Modal
          resident={residentForCT07}
          onClose={() => setShowCT07Modal(false)}
        />
      )}

      {/* MODAL 4: OFFICIAL POLICE NA17 DECLARATION FOR FOREIGN RESIDENTS */}
      {showNA17Modal && residentForNA17 && (
        <NA17Modal
          resident={residentForNA17}
          onClose={() => setShowNA17Modal(false)}
        />
      )}

      {/* QUICK VIEW HOUSEHOLD DRAWER / MODAL - LIÊN KẾT 2 CHIỀU CƯ DÂN & HỘ KHẨU */}
      {quickHouseholdModal && (
        <QuickHouseholdModal
          household={quickHouseholdModal}
          residents={residents}
          showFullCccd={showFullCccd}
          onClose={() => setQuickHouseholdModal(null)}
        />
      )}

      {notice &&
        showImportModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed top-4 right-4 z-[110] max-w-md w-full px-4 sm:px-0">
            <InlineNotice
              message={notice.message}
              type={notice.type}
              onDismiss={() => setNotice(null)}
            />
          </div>,
          document.body
        )}

      {confirmDialog && (
        <ConfirmModal
          isOpen={true}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
