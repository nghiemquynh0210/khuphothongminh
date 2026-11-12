import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  Phone,
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
  Building2,
  Eye,
  FileCheck,
  Home,
  Globe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
  Navigation,
  Loader2,
  Database,
  MoreHorizontal,
  Users
} from "lucide-react";
import { Resident, TargetGisItem } from "../types";
import { getTemporaryResidenceExpiryStatus, parseAccommodationInfo } from "../utils/householdRecognitionUtils";
import * as XLSX from "xlsx";
import Pagination from "./Pagination";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { formatVNNumber } from "../utils/numberFormat";
import {
  ROUTES,
  getResidentCreatePath,
  getResidentDetailPath,
  getResidentEditPath,
  navigate
} from "../routes";
import {
  buildGisTargetForResident,
  isForeignResident,
  getCountryFlag,
  getVisaExpiryStatus
} from "../utils/residentFormUtils";
import {
  ResidentCT07Modal,
  ResidentNA17Modal
} from "./resident/ResidentCertificateModals";

export { isForeignResident, getCountryFlag, getVisaExpiryStatus };

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
    <div className="relative flex-1 min-w-[280px]">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        id="citizen-search-input"
        name="citizenSearch"
        type="text"
        placeholder={placeholder || "Tìm theo họ tên, CCCD, SĐT, quê quán, nghề nghiệp, mã BHYT..."}
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
  onAddResident: (newResident: Resident) => Promise<void> | void;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [temporaryExpiryFilter, setTemporaryExpiryFilter] = useState("Tất cả");
  const [genderFilter, setGenderFilter] = useState("Tất cả");
  const [policyFilter, setPolicyFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const itemsPerPage = 8;

  const handleDirections = (res: Resident) => {
    if (onNavigateToGis) {
      onNavigateToGis(buildGisTargetForResident(res, households));
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

  // Navigate to Resident Detail page (/dashboard/residents/:id)
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

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showImportModal || showCT07Modal || showNA17Modal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showImportModal, showCT07Modal, showNA17Modal]);

  const handleEditClick = (res: Resident) => {
    navigate(getResidentEditPath(res.id));
  };

  const handleOpenAddModal = () => {
    navigate(ROUTES.DASHBOARD_RESIDENTS_NEW);
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

  // Export full residents to Excel
  const handleExportFullExcel = () => {
    const exportRows = residents.map((r, i) => ({
      "STT": i + 1,
      "Mã cư dân": r.id,
      "Họ và Tên": r.fullName,
      "Số CCCD": r.cccd,
      "Ngày cấp CCCD": r.idIssueDate || "15/05/2021",
      "Nơi cấp CCCD": r.idIssuePlace || "Cục Cảnh sát QLHC về TTXH",
      "Giới tính": r.gender,
      "Ngày sinh": r.birthDate,
      "Dân tộc": r.ethnicity || "Kinh",
      "Tôn giáo": r.religion || "Không",
      "Quốc tịch": r.nationality || "Việt Nam",
      "Quê quán": r.hometown || "",
      "Số điện thoại": r.phone || "",
      "Diện cư trú": r.status,
      "Trình độ học vấn": r.education || "12/12",
      "Nghề nghiệp": r.occupation || "",
      "Nơi làm việc": r.workplace || "",
      "Tình trạng hôn nhân": r.maritalStatus || "Đã kết hôn",
      "Địa chỉ cư trú": r.address,
      "Nơi thường trú gốc": r.permanentAddress || r.address,
      "Nơi ở hiện nay": r.temporaryAddress || r.address,
      "Mã hộ khẩu": r.householdId,
      "Quan hệ với chủ hộ": r.relationToOwner,
      "Mã số BHYT": r.healthInsuranceNumber || "",
      "Nghĩa vụ quân sự": r.militaryServiceStatus || "Đã hoàn thành",
      "Nhóm chính sách / Đoàn thể": r.policyGroup || "Bình thường",
      "Người liên hệ khẩn cấp": r.emergencyContact || "",
      "Ghi chú": r.notes || "",
      "Ngày đăng ký": r.joinDate || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "So_Bo_Quan_Ly_Dan_Cu_KP3");
    XLSX.writeFile(workbook, `Danh_Sach_Dan_Cu_Thuong_Tru_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Foreign Residents List to Excel (Báo cáo Công an Phường & Lưu trữ)
  const handleExportForeignResidentsExcel = () => {
    const foreignList = residents.filter(r => isForeignResident(r));
    const exportRows = foreignList.map((r, i) => ({
      "STT": i + 1,
      "Mã cư dân": r.id,
      "Họ và Tên (Full Name)": r.fullName,
      "Quốc tịch (Nationality)": r.nationality || "Nước ngoài",
      "Số Hộ chiếu (Passport No.)": r.passportNumber || r.cccd,
      "Ngày hết hạn Hộ chiếu": r.passportExpiryDate || "",
      "Cơ quan cấp HC": r.idIssuePlace || "",
      "Giới tính": r.gender,
      "Ngày sinh": r.birthDate,
      "Số điện thoại tại VN": r.phone || "",
      "Loại thị thực / Cư trú": r.visaOrCardType || "Thẻ tạm trú (TRC)",
      "Số thẻ / Thị thực": r.visaOrCardNumber || "",
      "Thời hạn cư trú từ ngày": r.visaValidFrom || "",
      "Thời hạn cư trú đến ngày": r.visaValidUntil || "",
      "Mã khai báo tạm trú trực tuyến": r.temporaryRegistrationCode || "",
      "Ngày khai báo CA Phường": r.temporaryRegistrationDate || "",
      "Tình trạng khai báo": r.temporaryRegistrationStatus || "Đã khai báo",
      "Nghề nghiệp / Vị trí công tác": r.occupation || "",
      "Cơ quan / Doanh nghiệp bảo lãnh": r.sponsoringOrganization || r.workplace || "",
      "Số Giấy phép LĐ (GPLĐ)": r.workPermitNumber || "",
      "Địa chỉ cư trú tại KP3": r.temporaryAddress || r.address,
      "Chủ nhà / Cơ sở cho thuê": r.landlordContact || "",
      "Mã hộ liên kết": r.householdId,
      "Người liên hệ khẩn cấp": r.emergencyContact || "",
      "Ghi chú lưu trú": r.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DS_Nguoi_Nuoc_Ngoai_KP3");
    XLSX.writeFile(workbook, `Danh_Sach_Nguoi_Nuoc_Ngoai_Tam_Tru_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Dynamic row mapper for Excel & Paste text
  const mapRawRowToResident = (row: any, idx: number) => {
    const findVal = (keys: string[]) => {
      const foundKey = Object.keys(row).find(k =>
        keys.some(key => k.toLowerCase().trim().replace(/_/g, " ") === key.toLowerCase().trim().replace(/_/g, " "))
      );
      return foundKey ? String(row[foundKey]).trim() : "";
    };

    const fullName = findVal(["Họ và Tên", "Ho va Ten", "fullName", "Họ tên", "Ho ten", "Tên", "Ten"]);
    const cccd = findVal(["Số CCCD", "So CCCD", "cccd", "CMND", "Số định danh", "So dinh danh", "Số CCCD/CMND"]);
    const idIssueDate = findVal(["Ngày cấp CCCD", "Ngay cap CCCD", "idIssueDate", "Ngày cấp", "Ngay cap"]);
    const idIssuePlace = findVal(["Nơi cấp CCCD", "Noi cap CCCD", "idIssuePlace", "Nơi cấp", "Noi cap"]);
    const genderStr = findVal(["Giới tính", "Gioi tinh", "gender", "Phái", "Phai"]);
    const birthDate = findVal(["Ngày sinh", "Ngay sinh", "birthDate", "Năm sinh", "Nam sinh", "Sinh nhật"]);
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
      "Nơi thường trú gốc", "Nơi thường trú", "Noi thuong tru", "permanentAddress", "Hộ khẩu thường trú"
    ]);
    const currentAddressRaw = findVal([
      "CHỔ Ở HIỆN TẠI", "Chổ ở hiện tại", "Chỗ ở hiện tại", "Cho o hien tai",
      "ĐỊA CHỈ TẠM TRÚ", "Địa chỉ tạm trú", "Dia chi tam tru",
      "Nơi tạm trú", "Noi tam tru", "Nơi ở hiện nay", "temporaryAddress", "currentAddress"
    ]);
    const fatherName = findVal(["HỌ TÊN CHA", "Họ tên cha", "Ho ten cha", "Cha", "fatherName"]);
    const motherName = findVal(["HỌ TÊN MẸ", "Họ tên mẹ", "Ho ten me", "Mẹ", "motherName"]);
    const temporaryRegDate = findVal(["NGÀY ĐĂNG KÝ", "Ngày đăng ký", "Ngay dang ky", "temporaryRegDate"]);
    const temporaryExpDate = findVal(["NGÀY HẾT HẠN", "Ngày hết hạn", "Ngay het han", "temporaryExpDate"]);
    const managementStatus = findVal(["TÌNH TRẠNG QUẢN LÝ", "Tình trạng quản lý", "managementStatus", "Diện quản lý"]);
    const householdId = findVal(["MÃ HỘ KHẨU", "Mã hộ khẩu", "Ma ho khau", "householdId", "Mã hộ", "Ma ho", "Số hộ khẩu", "So ho khau"]);
    const relationToOwner = findVal(["Quan hệ với chủ hộ", "Quan he voi chu ho", "relationToOwner", "Quan hệ", "Quan he", "Quan hệ chủ hộ"]);
    const healthInsuranceNumber = findVal(["Mã số BHYT", "Ma so BHYT", "healthInsuranceNumber", "BHYT", "Thẻ BHYT"]);
    const militaryServiceStatus = findVal(["Nghĩa vụ quân sự", "Nghia vu quan su", "militaryServiceStatus", "NVQS"]);
    const policyGroup = findVal(["Nhóm chính sách", "Nhom chinh sach", "policyGroup", "Chính sách", "Đoàn thể", "Diện chính sách"]);
    const emergencyContact = findVal(["Người liên hệ khẩn cấp", "Liên hệ khẩn cấp", "emergencyContact"]);
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
    let resolvedPermanent = permanentAddress || undefined;
    let resolvedCurrent = currentAddressRaw || address || undefined;
    let resolvedActiveAddress = resolvedCurrent || resolvedPermanent || "Khu phố 3, Phường An Phú";

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
      temporaryRegDate: temporaryRegDate || undefined,
      temporaryExpDate: temporaryExpDate || undefined,
      managementStatus: managementStatus || undefined,
      householdId: householdId || (status === "Tạm trú" ? "Tạm trú" : undefined),
      relationToOwner: relationToOwner || "Thành viên",
      healthInsuranceNumber: healthInsuranceNumber || undefined,
      militaryServiceStatus: militaryServiceStatus || undefined,
      policyGroup: policyGroup || undefined,
      emergencyContact: emergencyContact || undefined,
      notes: notes || undefined,
      isValid: !!fullName && !!cleanCccd && cleanCccd.length >= 9
    };
  };

  // Excel Parser Logic
  const handleExcelParse = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          alert("Tệp tin Excel trống hoặc không đúng định dạng!");
          return;
        }

        const mapped = jsonData.map((row, idx) => mapRawRowToResident(row, idx));
        setParsedData(mapped);
        setImportFileName(file.name);
      } catch (err) {
        alert("Có lỗi xảy ra khi xử lý file Excel. Vui lòng kiểm tra lại định dạng!");
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
      alert("Vui lòng dán danh sách hoặc bảng dữ liệu dân cư vào ô nhập!");
      return;
    }

    try {
      const lines = textToParse.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("Dữ liệu cần có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu!");
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

      setParsedData(rows);
      setImportFileName(`Dữ liệu vừa dán (${rows.length} cư dân)`);
    } catch (err) {
      alert("Lỗi khi phân tích dữ liệu dạng văn bản!");
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
      alert("Chỉ chấp nhận tệp tin Excel (.xlsx, .xls) hoặc CSV!");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelParse(file);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert("Không có dữ liệu cư dân hợp lệ nào để nhập!");
      return;
    }

    setIsUploadingToDb(true);
    setUploadStatusMsg("Đang chuẩn hóa và chuẩn bị đồng bộ vào Database...");

    try {
      if (isSupabaseConfigured && supabase) {
        // Chuẩn hóa dữ liệu tương thích schema Supabase PostgreSQL
        const dbPayload = validRows.map(row => {
          let birthDateIso: string | null = null;
          if (row.birthDate && row.birthDate.includes("/")) {
            const parts = row.birthDate.split("/");
            if (parts.length === 3) {
              const [d, m, y] = parts;
              if (y && m && d) birthDateIso = `${y.trim()}-${m.trim().padStart(2, '0')}-${d.trim().padStart(2, '0')}`;
            }
          } else if (row.birthDate && row.birthDate.includes("-")) {
            birthDateIso = row.birthDate.slice(0, 10);
          }

          const birthYear = birthDateIso ? parseInt(birthDateIso.slice(0, 4), 10) : null;
          const isElderly = birthYear ? (2026 - birthYear) >= 60 : false;

          return {
            full_name: (row.fullName || "").trim(),
            cccd: (row.cccd || "").trim(),
            gender: row.gender === "Nữ" ? "Nữ" : "Nam",
            birth_date: birthDateIso,
            phone: row.phone && row.phone !== "N/A" ? row.phone.trim() : null,
            address: (row.address || row.temporaryAddress || row.permanentAddress || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh").trim(),
            permanent_address: row.permanentAddress?.trim() || null,
            current_address: (row.currentAddress || row.temporaryAddress || row.address)?.trim() || null,
            father_name: row.fatherName?.trim() || null,
            mother_name: row.motherName?.trim() || null,
            temporary_reg_date: row.temporaryRegDate?.trim() || null,
            temporary_exp_date: row.temporaryExpDate?.trim() || null,
            management_status: row.managementStatus?.trim() || null,
            household_code: row.householdId?.trim() || null,
            relation_to_owner: row.relationToOwner?.trim() || "Thành viên",
            status: row.status || "Thường trú",
            occupation: row.occupation?.trim() || null,
            workplace: row.workplace?.trim() || null,
            nationality: row.nationality?.trim() || "Việt Nam",
            is_party_member: false,
            is_policy_household: false,
            is_elderly: isElderly,
            is_poor_household: false
          };
        });

        // Chia lô 500 bản ghi và chạy song song (Concurrency x4) để tối ưu hiệu năng siêu tốc
        const BATCH_SIZE = 500;
        const CONCURRENCY = 4;
        const totalBatches: any[][] = [];
        for (let i = 0; i < dbPayload.length; i += BATCH_SIZE) {
          totalBatches.push(dbPayload.slice(i, i + BATCH_SIZE));
        }

        let insertedCount = 0;
        for (let i = 0; i < totalBatches.length; i += CONCURRENCY) {
          const chunk = totalBatches.slice(i, i + CONCURRENCY);
          await Promise.all(chunk.map(async (batch) => {
            const { error: upsertErr } = await (supabase as any).from('residents').upsert(batch, { onConflict: 'cccd' });
            if (upsertErr) {
              console.error("Supabase upsert error:", upsertErr);
              throw new Error(upsertErr.message);
            }
            insertedCount += batch.length;
            setUploadStatusMsg(`Đang ghi siêu tốc vào Supabase: ${Math.min(insertedCount, dbPayload.length)}/${dbPayload.length} hồ sơ (${Math.round((insertedCount / dbPayload.length) * 100)}%)...`);
          }));
        }

        // Cập nhật State giao diện 1 lần duy nhất để không làm đứng giao diện
        if (onUpdateResidents) {
          const newMap = new Map<string, Resident>(residents.map(r => [r.cccd, r]));
          validRows.forEach((row, i) => {
            newMap.set(row.cccd, {
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
              healthInsuranceNumber: row.healthInsuranceNumber,
              militaryServiceStatus: row.militaryServiceStatus,
              policyGroup: row.policyGroup,
              emergencyContact: row.emergencyContact,
              notes: row.notes,
              avatar: `https://images.unsplash.com/photo-${1535713875002 + (i % 10)}?w=150`,
              joinDate: new Date().toLocaleDateString("vi-VN")
            });
          });
          onUpdateResidents(Array.from(newMap.values()));
        } else {
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
              householdId: row.householdId,
              relationToOwner: row.relationToOwner,
              healthInsuranceNumber: row.healthInsuranceNumber,
              militaryServiceStatus: row.militaryServiceStatus,
              policyGroup: row.policyGroup,
              emergencyContact: row.emergencyContact,
              notes: row.notes,
              avatar: `https://images.unsplash.com/photo-${1535713875002 + (i % 10)}?w=150`,
              joinDate: new Date().toLocaleDateString("vi-VN")
            });
          });
        }

        alert(`✓ ĐỒNG BỘ SIÊU TỐC THÀNH CÔNG!\nĐã nạp ${insertedCount} hồ sơ cư dân vào Cơ sở dữ liệu Supabase PostgreSQL!`);
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
            householdId: row.householdId,
            relationToOwner: row.relationToOwner,
            healthInsuranceNumber: row.healthInsuranceNumber,
            militaryServiceStatus: row.militaryServiceStatus,
            policyGroup: row.policyGroup,
            emergencyContact: row.emergencyContact,
            notes: row.notes,
            avatar: `https://images.unsplash.com/photo-${1535713875002 + (i % 10)}?w=150`,
            joinDate: new Date().toLocaleDateString("vi-VN")
          });
        });
        alert(`Đã lưu ${validRows.length} hồ sơ vào bộ nhớ cục bộ.`);
      }

      setShowImportModal(false);
      setParsedData([]);
      setImportFileName("");
      setPastedRawText("");
    } catch (err: any) {
      alert("Lỗi khi ghi dữ liệu vào Supabase Database: " + (err?.message || "Không thể kết nối máy chủ CSDL"));
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
        thuongTru++;
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
      } else if (statusFilter !== "Tất cả") {
        matchesStatus = res.status === statusFilter && !isForeign;
      }

      if (!matchesStatus) return false;

      if (genderFilter !== "Tất cả" && res.gender !== genderFilter) return false;
      if (policyFilter !== "Tất cả" && (!res.policyGroup || !res.policyGroup.includes(policyFilter))) return false;

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
    policyFilter
  ]);

  // Pagination Logic
  const totalItems = filteredResidents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="citizen-management-view" className="space-y-6">
      {/* Header and Action Buttons */}
      <PageHeader
        badgeIcon={<Users size={14} className="text-emerald-600" />}
        badgeText="CSDL DÂN CƯ ĐỀ ÁN 06/CP • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="VNeID CƠ SỞ"
        title="Quản Lý Dân Cư Khu Phố"
        actions={
          <>
            <button
              id="btn-export-excel"
              onClick={handleExportFullExcel}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer hover:shadow-sm"
              title="Xuất file Excel chứa đầy đủ 26 trường thông tin của toàn bộ nhân khẩu"
            >
              <Download size={15} className="text-slate-600" /> Xuất Excel ({formatVNNumber(residents.length)})
            </button>
            <button
              id="btn-import-excel"
              onClick={() => {
                setShowImportModal(true);
                setParsedData([]);
                setImportFileName("");
              }}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer hover:shadow-sm hover:border-emerald-400"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" /> Nhập Excel / Dán bảng
            </button>
            <button
              id="btn-add-resident"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer hover:shadow-md"
            >
              <Plus size={15} /> Thêm Hồ sơ Cư dân Mới
            </button>
          </>
        }
      />

      {/* 4 Standardized StatCard KPI blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng số Dân cư"
          value={residents.length}
          badge="CSDL ↗"
          icon={<Users size={22} />}
          color="emerald"
          subtext="Đồng bộ CSDL Đề án 06/CP"
          subtextRight="Khu phố 3"
          highlighted={true}
        />
        <StatCard
          label="Thường trú"
          value={tabCounts.thuongTru}
          badge="công dân"
          icon={<CheckCircle2 size={22} />}
          color="blue"
          subtext="Có hộ khẩu thường trú KP3"
          subtextRight="Hộ tịch điện tử"
        />
        <StatCard
          label="Tạm trú thực tế"
          value={tabCounts.tamTru}
          badge="người"
          icon={<Clock size={22} />}
          color="amber"
          subtext="Lưu trú, phòng trọ địa bàn"
          subtextRight="Khai báo lưu trú"
        />
        <StatCard
          label="Người nước ngoài"
          value={tabCounts.foreigners}
          badge="cư dân"
          icon={<Globe size={22} />}
          color="purple"
          subtext="Đăng ký tạm trú / Thị thực"
          subtextRight="Quản lý cư trú"
        />
      </div>

      {/* Filter and Search Bar - 2-tier clean layout */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Tier 1: Search Box & Status Pills */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <CitizenSearchInput
            defaultValue={searchTerm}
            onSearch={handleSearchChange}
          />

          {/* Residency Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200/80 p-1 rounded-xl shrink-0 overflow-x-auto shadow-2xs">
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Tất cả")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === "Tất cả"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
            >
              Tất cả ({formatVNNumber(tabCounts.all)})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Thường trú")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === "Thường trú"
                  ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                  : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
            >
              Thường trú ({formatVNNumber(tabCounts.thuongTru)})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Tạm trú")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${statusFilter === "Tạm trú"
                  ? "bg-white text-amber-700 shadow-xs border border-amber-200"
                  : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
            >
              <span>Tạm trú ({formatVNNumber(tabCounts.tamTru)})</span>
              {tamTruExpiringSoonCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse" title={`Có ${tamTruExpiringSoonCount} cư dân tạm trú sắp hết hạn trước 1 tháng`}>
                  ⚠️ {formatVNNumber(tamTruExpiringSoonCount)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Tạm vắng")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === "Tạm vắng"
                  ? "bg-white text-slate-700 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
            >
              Tạm vắng ({formatVNNumber(tabCounts.tamVang)})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("Người nước ngoài")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${statusFilter === "Người nước ngoài"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-700 hover:text-purple-900 font-medium hover:bg-purple-50"
                }`}
            >
              <Globe size={13} className={statusFilter === "Người nước ngoài" ? "text-purple-200" : "text-purple-600"} />
              Người nước ngoài ({formatVNNumber(tabCounts.foreigners)})
            </button>
          </div>
        </div>

        {/* Tier 2: Sub-filters & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Temporary Residence Expiry Filter Dropdown */}
            {statusFilter === "Tạm trú" && (
              <select
                id="citizen-temporary-expiry-filter"
                value={temporaryExpiryFilter}
                onChange={(e) => {
                  setTemporaryExpiryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-amber-300 rounded-xl text-xs bg-amber-50/90 text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shrink-0"
              >
                <option value="Tất cả">Thời hạn tạm trú: Tất cả ({formatVNNumber(tabCounts.tamTru)})</option>
                <option value="Sắp hết hạn (< 30 ngày)">⚠️ Sắp hết hạn trước 1 tháng ({formatVNNumber(tamTruExpiringSoonCount)})</option>
                <option value="Đã hết hạn">🚨 Đã hết hạn tạm trú ({formatVNNumber(tamTruExpiredCount)})</option>
                <option value="Còn hạn dài">Còn hạn dài ({formatVNNumber(Math.max(0, tabCounts.tamTru - tamTruExpiringSoonCount - tamTruExpiredCount))})</option>
              </select>
            )}

            {/* Gender Filter */}
            <select
              id="citizen-gender-filter"
              name="citizenGenderFilter"
              value={genderFilter}
              onChange={(e) => handleGenderFilterChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200/90 rounded-xl text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            >
              <option value="Tất cả">Giới tính: Tất cả</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>

            {/* Policy / Organization Filter */}
            <select
              id="citizen-policy-filter"
              name="citizenPolicyFilter"
              value={policyFilter}
              onChange={(e) => handlePolicyFilterChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200/90 rounded-xl text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            >
              <option value="Tất cả">Diện chính sách: Tất cả</option>
              <option value="Đảng viên">Đảng viên</option>
              <option value="Người có công">Người có công / Thương binh</option>
              <option value="Người cao tuổi">Người cao tuổi</option>
              <option value="Hộ nghèo">Hộ nghèo / Hộ cận nghèo</option>
              <option value="Đoàn viên">Đoàn viên thanh niên</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200/90 rounded-xl p-0.5 bg-slate-100/70 gap-0.5 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              title="Xem dạng Bảng"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "card" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              title="Xem dạng Thẻ"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Temporary Residence Expiry Alert Banner */}
      {statusFilter === "Tạm trú" && (tamTruExpiringSoonCount > 0 || tamTruExpiredCount > 0) && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-50/90 to-orange-50 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
              <AlertTriangle size={18} className="animate-pulse text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                  Cảnh báo Quản lý Cư trú: Cư dân Tạm trú Sắp hết hạn & Quá hạn
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  Trước 01 tháng (30 ngày)
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                Phát hiện <strong className="text-amber-950 font-black underline">{tamTruExpiringSoonCount} nhân khẩu</strong> sắp hết hạn tạm trú trong vòng 30 ngày tới và <strong className="text-rose-700 font-black">{tamTruExpiredCount} nhân khẩu</strong> đã hết hạn. Đề nghị cán bộ rà soát, thông báo cho chủ cơ sở lưu trú / nhà trọ và người tạm trú nộp hồ sơ gia hạn theo quy định Luật Cư trú.
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
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${temporaryExpiryFilter === "Sắp hết hạn (< 30 ngày)"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                }`}
            >
              <span>Xem DS sắp hết hạn</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
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
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              >
                Hiện tất cả
              </button>
            )}
          </div>
        </div>
      )}

      {/* Foreign Resident Intelligence & Compliance Panel */}
      {statusFilter === "Người nước ngoài" && (
        <div className="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-purple-800/60 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-800/80 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-400/30">
                  <Globe size={18} />
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Phân hệ Quản lý Cư dân Người nước ngoài (Foreign Residents Compliance)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Luật 47/2014 & TT 53/2016-BCA
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                Theo dõi hồ sơ lưu trú, Hộ chiếu, Thẻ tạm trú (TRC), Thị thực lao động, Giấy phép lao động & Liên thông khai báo trực tuyến Công an Phường An Phú
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleExportForeignResidentsExcel}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
                title="Xuất file Excel danh sách người nước ngoài gửi Công an Phường & Lưu trữ"
              >
                <Download size={14} /> Xuất DS Công an ({foreignResidentsList.length})
              </button>
              <button
                type="button"
                onClick={handleOpenAddForeignerModal}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Thêm Người nước ngoài
              </button>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-purple-200 font-medium">Tổng người nước ngoài</p>
                <p className="text-xl font-black text-white">{foreignResidentsList.length} <span className="text-xs font-normal text-purple-300">người</span></p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold shrink-0">
                <Shield size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-purple-200 font-medium">Quốc gia & Vùng lãnh thổ</p>
                <p className="text-xl font-black text-white">{uniqueNationalities.length} <span className="text-xs font-normal text-purple-300">quốc gia</span></p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold shrink-0">
                <Award size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-purple-200 font-medium">Thẻ tạm trú (TRC) dài hạn</p>
                <p className="text-xl font-black text-white">{trcCount} <span className="text-xs font-normal text-purple-300">thẻ</span></p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${expiringSoonCount > 0 ? "bg-amber-500/30 text-amber-300" : "bg-emerald-500/30 text-emerald-300"
                }`}>
                {expiringSoonCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-purple-200 font-medium">Thời hạn lưu trú & Khai báo</p>
                <p className="text-xs font-bold text-white">
                  {expiringSoonCount > 0 ? `${expiringSoonCount} ca sắp hết hạn` : `${registeredPoliceCount}/${foreignResidentsList.length} đã cấp KBTT`}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-filter Bar for Foreigners */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="text-purple-300 text-xs font-semibold flex items-center gap-1">
              <Filter size={13} /> Lọc chuyên sâu:
            </span>

            {/* Nationality Sub-filter */}
            <select
              value={foreignNationalityFilter}
              onChange={(e) => {
                setForeignNationalityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-purple-950/80 border border-purple-700 text-purple-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-400 text-xs"
            >
              <option value="Tất cả">Quốc tịch: Tất cả ({uniqueNationalities.length})</option>
              {uniqueNationalities.map((nat) => (
                <option key={nat} value={nat}>{getCountryFlag(nat)} {nat}</option>
              ))}
            </select>

            {/* Visa Type Sub-filter */}
            <select
              value={foreignVisaTypeFilter}
              onChange={(e) => {
                setForeignVisaTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-purple-950/80 border border-purple-700 text-purple-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-400 text-xs"
            >
              <option value="Tất cả">Loại thị thực / Cư trú: Tất cả</option>
              <option value="Thẻ tạm trú (TRC)">Thẻ tạm trú (TRC)</option>
              <option value="Thị thực LĐ">Thị thực Lao động (Visa LĐ)</option>
              <option value="Thị thực ĐT">Thị thực Đầu tư (Visa ĐT)</option>
              <option value="Miễn thị thực / E-Visa">Miễn thị thực / E-Visa</option>
            </select>

            {/* Expiry Sub-filter */}
            <select
              value={foreignExpiryFilter}
              onChange={(e) => {
                setForeignExpiryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-purple-950/80 border border-purple-700 text-purple-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-400 text-xs"
            >
              <option value="Tất cả">Thời hạn cư trú: Tất cả</option>
              <option value="Còn hạn dài">Còn hạn dài (&gt; 30 ngày)</option>
              <option value="Sắp hết hạn">Sắp hết hạn (≤ 30 ngày)</option>
              <option value="Đã hết hạn">Đã quá hạn</option>
            </select>

            {(foreignNationalityFilter !== "Tất cả" || foreignVisaTypeFilter !== "Tất cả" || foreignExpiryFilter !== "Tất cả") && (
              <button
                type="button"
                onClick={() => {
                  setForeignNationalityFilter("Tất cả");
                  setForeignVisaTypeFilter("Tất cả");
                  setForeignExpiryFilter("Tất cả");
                  setCurrentPage(1);
                }}
                className="text-[11px] text-purple-300 hover:text-white underline cursor-pointer"
              >
                Đặt lại bộ lọc NNN
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container: Toàn bộ chiều rộng cho danh sách cư dân */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[250px]">Cư dân & Nhân thân</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Số CCCD / Mã BHYT</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Hộ khẩu & Nơi ở</th>
                  <th className="py-3.5 px-4 min-w-[210px]">Học vấn & Việc làm</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Diện cư trú & Chính sách</th>
                  <th className="py-3.5 px-4 text-center w-[85px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                      Không tìm thấy cư dân nào phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                ) : (
                  paginatedResidents.map((res) => {
                    const statusColors = {
                      "Thường trú": "bg-emerald-50 text-emerald-700 border-emerald-200",
                      "Tạm trú": "bg-amber-50 text-amber-700 border-amber-200",
                      "Tạm vắng": "bg-slate-100 text-slate-700 border-slate-300"
                    };
                    const isForeign = isForeignResident(res);
                    const expiryInfo = isForeign ? getVisaExpiryStatus(res.visaValidUntil) : null;
                    const tamTruExpiry = (!isForeign && res.status === "Tạm trú") ? getTemporaryResidenceExpiryStatus(res.temporaryExpDate) : null;
                    const hostelInfo = parseAccommodationInfo(res.address || res.currentAddress || res.temporaryAddress);

                    return (
                      <tr
                        key={res.id}
                        id={`resident-row-${res.id}`}
                        onClick={() => handleOpenDetailModal(res)}
                        className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <img
                                src={res.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                                alt={res.fullName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 group-hover:border-emerald-400 transition-colors"
                                referrerPolicy="no-referrer"
                              />
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
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                    {res.nationality || "Nước ngoài"}
                                  </span>
                                )}
                                {res.policyGroup?.includes("Đảng viên") && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Đảng viên"></span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
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
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-sans font-bold">HC</span>
                                {res.passportNumber || res.cccd}
                              </div>
                              {res.passportExpiryDate && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Hạn HC: {res.passportExpiryDate}
                                </div>
                              )}
                              {res.temporaryRegistrationCode && (
                                <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-medium truncate max-w-[170px]" title={res.temporaryRegistrationCode}>
                                  CA: {res.temporaryRegistrationCode}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono text-xs font-bold text-slate-900">{res.cccd}</div>
                              {res.healthInsuranceNumber ? (
                                <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-medium">
                                  BHYT: {res.healthInsuranceNumber}
                                </div>
                              ) : res.idIssueDate ? (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
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
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-mono font-bold transition-all shadow-2xs cursor-pointer"
                              title={`Xem Sổ hộ tịch ${res.householdId}`}
                            >
                              <Home size={10} className="text-emerald-600" />
                              <span>{res.householdId}</span>
                            </button>
                            {res.relationToOwner && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                ({res.relationToOwner})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate max-w-[280px] mt-0.5 flex items-center gap-1" title={res.address}>
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span>{hostelInfo.isHostel && hostelInfo.shortAddress ? hostelInfo.shortAddress : res.address}</span>
                          </div>
                          {hostelInfo.isHostel && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                <Home size={9} className="text-amber-700" />
                                <span>{hostelInfo.hostelName}</span>
                              </span>
                              {hostelInfo.phone && (
                                <a
                                  href={`tel:${hostelInfo.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 text-[9.5px] text-emerald-700 font-mono font-semibold hover:underline bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200"
                                  title="Gọi điện cho chủ nhà trọ"
                                >
                                  <Phone size={8.5} /> {hostelInfo.phone}
                                </a>
                              )}
                            </div>
                          )}
                          {isForeign && res.landlordContact && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[280px] mt-0.5 flex items-center gap-1">
                              <Home size={10} className="text-slate-400 shrink-0" />
                              <span>Chủ nhà: {res.landlordContact}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 truncate max-w-[190px]">{res.occupation || "Chưa cập nhật"}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[190px] mt-0.5">
                            {isForeign
                              ? (res.sponsoringOrganization || res.workplace || "Cư trú tự do")
                              : `${res.education ? res.education : "Học vấn: Chưa cập nhật"}${res.workplace ? ` • ${res.workplace}` : ""}`}
                          </div>
                          {isForeign && res.workPermitNumber && (
                            <div className="text-[10px] text-blue-700 font-mono truncate max-w-[190px] mt-0.5">
                              GPLĐ: {res.workPermitNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isForeign ? (
                            <div className="space-y-1">
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                                {res.visaOrCardType || "Tạm trú"}
                              </span>
                              {expiryInfo && (
                                <div className={`text-[10px] px-2 py-0.5 rounded-md border font-mono truncate max-w-[160px] ${expiryInfo.badgeClass}`}>
                                  {expiryInfo.label}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[res.status]}`}>
                                  {res.status}
                                </span>
                                {res.policyGroup && res.policyGroup !== "Bình thường" && (
                                  <span className="text-[10px] font-semibold text-rose-600 truncate max-w-[140px]">
                                    {res.policyGroup}
                                  </span>
                                )}
                              </div>
                              {/* CẢNH BÁO HẾT HẠN TẠM TRÚ TRƯỚC 1 THÁNG / QUÁ HẠN */}
                              {tamTruExpiry && tamTruExpiry.status !== "unknown" && (
                                <div>
                                  {tamTruExpiry.isWarning ? (
                                    <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-mono font-bold bg-amber-100 text-amber-950 border-amber-400 shadow-xs animate-pulse" title={`Thời hạn tạm trú đến ngày ${tamTruExpiry.formattedDate}`}>
                                      <AlertTriangle size={11} className="text-amber-700 shrink-0" />
                                      <span>{tamTruExpiry.label}</span>
                                    </div>
                                  ) : tamTruExpiry.isExpired ? (
                                    <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-mono font-bold bg-rose-100 text-rose-900 border-rose-300 shadow-xs" title={`Thời hạn tạm trú đã hết ngày ${tamTruExpiry.formattedDate}`}>
                                      <AlertCircle size={11} className="text-rose-700 shrink-0" />
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
                        <td className="py-3.5 px-4 text-center relative">
                          <div className="flex items-center justify-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(res);
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-all cursor-pointer shadow-2xs"
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
                              className={`p-1 rounded-lg transition-all cursor-pointer border ${activeDropdownId === res.id
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs"
                                  : "text-slate-400 hover:text-slate-800 hover:bg-slate-100 border-transparent hover:border-slate-200"
                                }`}
                              title="Tùy chọn thao tác"
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {/* Dropdown Menu Popup */}
                            {activeDropdownId === res.id && (
                              <div
                                className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
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
                                    if (confirm(`Bạn có chắc muốn xóa hồ sơ cư dân ${res.fullName}?`)) {
                                      onDeleteResident(res.id);
                                    }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5 max-h-[640px] overflow-y-auto bg-slate-50/30">
            {filteredResidents.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 col-span-full">
                Không tìm thấy cư dân nào phù hợp với bộ lọc hiện tại
              </div>
            ) : (
              paginatedResidents.map((res) => {
                const statusColors = {
                  "Thường trú": "bg-emerald-50 text-emerald-700 border-emerald-200",
                  "Tạm trú": "bg-amber-50 text-amber-700 border-amber-200",
                  "Tạm vắng": "bg-slate-100 text-slate-700 border-slate-300"
                };
                const isForeign = isForeignResident(res);
                const expiryInfo = isForeign ? getVisaExpiryStatus(res.visaValidUntil) : null;
                const tamTruExpiry = (!isForeign && res.status === "Tạm trú") ? getTemporaryResidenceExpiryStatus(res.temporaryExpDate) : null;
                const hostelInfo = parseAccommodationInfo(res.address || res.currentAddress || res.temporaryAddress);

                return (
                  <div
                    key={res.id}
                    id={`resident-card-${res.id}`}
                    onClick={() => handleOpenDetailModal(res)}
                    className="p-4 rounded-2xl border border-slate-200/90 cursor-pointer transition-all flex flex-col justify-between gap-3.5 bg-white hover:shadow-md hover:border-emerald-300 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={res.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                          alt={res.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 group-hover:border-emerald-400 transition-colors"
                          referrerPolicy="no-referrer"
                        />
                        {isForeign && (
                          <span className="absolute -bottom-1 -right-1 text-sm" title={`Quốc tịch: ${res.nationality}`}>
                            {getCountryFlag(res.nationality)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-700 transition-colors">
                            {res.fullName}
                          </h4>
                          {isForeign ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-purple-50 text-purple-700 border-purple-200">
                              {res.visaOrCardType || "Tạm trú NNN"}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColors[res.status]}`}>
                              {res.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {res.gender} • {res.birthDate} • {isForeign ? res.nationality : (res.ethnicity || "Kinh")}
                        </p>
                        <p className="text-[11px] text-slate-800 mt-1 font-mono font-bold flex items-center justify-between">
                          <span>{isForeign ? `HC: ${res.passportNumber || res.cccd}` : `CCCD: ${res.cccd}`}</span>
                          <span className="text-slate-500 font-normal text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">Hộ: {res.householdId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 text-[11px] space-y-1">
                      <div className="text-slate-600 truncate flex items-center gap-1.5">
                        <Briefcase size={12} className="text-slate-400 shrink-0" />
                        <span>{res.occupation || "Chưa cập nhật nghề nghiệp"} {isForeign && res.sponsoringOrganization ? `• ${res.sponsoringOrganization}` : (res.education ? `(${res.education})` : "")}</span>
                      </div>
                      <div className="text-slate-500 truncate flex items-center gap-1.5" title={res.address}>
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{hostelInfo.isHostel && hostelInfo.shortAddress ? hostelInfo.shortAddress : res.address}</span>
                      </div>
                      {hostelInfo.isHostel && (
                        <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                          <Home size={10} className="text-amber-600 shrink-0" />
                          <span className="truncate">{hostelInfo.hostelName} {hostelInfo.phone ? `(${hostelInfo.phone})` : ""}</span>
                        </div>
                      )}
                      {isForeign && expiryInfo && (
                        <div className="text-[10px] font-mono flex items-center gap-1 pt-0.5">
                          <span className={`px-2 py-0.5 rounded border ${expiryInfo.badgeClass}`}>
                            {expiryInfo.label}
                          </span>
                        </div>
                      )}
                      {tamTruExpiry && tamTruExpiry.status !== "unknown" && (
                        <div className="text-[10px] font-mono flex items-center gap-1 pt-0.5">
                          {tamTruExpiry.isWarning ? (
                            <span className="px-2 py-0.5 rounded border font-bold bg-amber-100 text-amber-950 border-amber-400 animate-pulse flex items-center gap-1">
                              <AlertTriangle size={10} className="text-amber-700" />
                              {tamTruExpiry.label}
                            </span>
                          ) : tamTruExpiry.isExpired ? (
                            <span className="px-2 py-0.5 rounded border font-bold bg-rose-100 text-rose-900 border-rose-300 flex items-center gap-1">
                              <AlertCircle size={10} className="text-rose-700" />
                              {tamTruExpiry.label}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              Hạn tạm trú: {tamTruExpiry.formattedDate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-semibold text-rose-600 truncate max-w-[120px]">
                        {isForeign ? (res.temporaryRegistrationCode ? `Đã KBTT CA` : "Chờ khai báo") : (res.policyGroup && res.policyGroup !== "Bình thường" ? res.policyGroup : "Dân cư phổ thông")}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(res)}
                          className="px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Eye size={12} /> Chi tiết
                        </button>
                        <button
                          onClick={() => handleDirections(res)}
                          className="p-1 text-emerald-700 hover:text-emerald-900 rounded-lg hover:bg-emerald-50 border border-emerald-200 cursor-pointer transition-colors"
                          title="Chỉ đường GIS đến nơi cư trú"
                        >
                          <Navigation size={12} />
                        </button>
                        {isForeign ? (
                          <button
                            onClick={() => handleOpenNA17(res)}
                            className="p-1 text-purple-600 hover:text-purple-800 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors"
                            title="In mẫu NA17"
                          >
                            <FileText size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCT07(res)}
                            className="p-1 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                            title="In mẫu CT07"
                          >
                            <Printer size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(res)}
                          className="p-1 text-slate-500 hover:text-blue-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
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

      {/* MODAL 2: IMPORT EXCEL & RAW DATA PASTE */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-400" size={20} />
                <h3 className="font-bold text-sm sm:text-base">Tích hợp danh sách dân cư vào hệ thống</h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedData([]);
                  setImportFileName("");
                  setPastedRawText("");
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher: Upload File or Paste Raw Text */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setImportTab("file")}
                className={`flex-1 py-3 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${importTab === "file"
                    ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <UploadCloud size={15} /> Tải tệp Excel / CSV (.xlsx, .csv)
              </button>
              <button
                type="button"
                onClick={() => setImportTab("paste")}
                className={`flex-1 py-3 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${importTab === "paste"
                    ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <FileCheck size={15} /> Dán bảng dữ liệu trực tiếp (Copy & Paste)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {importTab === "file" ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] tracking-wide">
                          ⚡ TỐC ĐỘ CAO
                        </span>
                        <p className="font-bold text-slate-900 text-xs">Thuật toán phân tích thông minh Thường trú & Tạm trú:</p>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Tự động nhận diện Cột H & J (Thường trú & Chỗ ở hiện tại), Cột G & J (Địa chỉ tạm trú & Thường trú gốc), Cha/Mẹ, Ngày đăng ký/Hết hạn.
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
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center ${isDragging ? "border-emerald-500 bg-emerald-500/5 scale-[0.99]" : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50"
                      }`}
                  >
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud size={42} className={`mb-2.5 transition-colors ${isDragging ? "text-emerald-500" : "text-slate-400"}`} />
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
                        <p className="text-[11px] text-slate-400">hoặc nhấp chuột để chọn tệp từ máy tính (.xlsx, .xls, .csv)</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* PASTE TEXT TAB */
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-800">Hướng dẫn dán bảng dữ liệu dân cư:</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bạn có thể copy trực tiếp các ô từ Excel/Google Sheets hoặc văn bản cách nhau bởi dấu Tab/Dấu phẩy và dán vào bên dưới.
                    </p>
                  </div>

                  <textarea
                    id="raw-pasted-residents-textarea"
                    name="rawPastedResidents"
                    rows={6}
                    value={pastedRawText}
                    onChange={(e) => setPastedRawText(e.target.value)}
                    placeholder={"Họ và Tên\tSố CCCD\tGiới tính\tNgày sinh\tDiện cư trú\tĐịa chỉ\tMã hộ\nNguyễn Văn An\t079090001111\tNam\t10/05/1990\tThường trú\t42/3 Lương Định Của\tHK-301"}
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

              {/* Parsed Data Preview Table */}
              {parsedData.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" />
                      Kết quả phân tích ({parsedData.length} nhân khẩu):
                    </h4>
                    <span className="text-[10px] text-slate-400">Dòng màu đỏ có thông tin thiếu hoặc sai CCCD</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="sticky top-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-2 px-3">Họ và Tên</th>
                          <th className="py-2 px-3">Số CCCD</th>
                          <th className="py-2 px-3">Ngày sinh</th>
                          <th className="py-2 px-3">Quê quán</th>
                          <th className="py-2 px-3">Diện cư trú</th>
                          <th className="py-2 px-3">Mã hộ</th>
                          <th className="py-2 px-3 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.map((row) => (
                          <tr key={row.id} className={row.isValid ? "hover:bg-slate-50" : "bg-rose-50/50"}>
                            <td className="py-2 px-3 font-bold text-slate-800">
                              {row.fullName || <span className="text-rose-600 italic">Thiếu họ tên *</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {row.cccd || <span className="text-rose-600 italic">Thiếu CCCD *</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{row.birthDate}</td>
                            <td className="py-2 px-3 text-slate-600">{row.hometown || "-"}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-mono">{row.householdId}</td>
                            <td className="py-2 px-3 text-right">
                              {row.isValid ? (
                                <span className="text-emerald-600 font-bold flex items-center justify-end gap-1">
                                  <Check size={12} /> Hợp lệ
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold flex items-center justify-end gap-1" title="CCCD tối thiểu 9 số">
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

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {isSupabaseConfigured ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Database size={13} className="text-emerald-600" />
                    Supabase PostgreSQL: Đã kết nối
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <AlertTriangle size={13} className="text-amber-600" />
                    Lưu trữ cục bộ (Offline)
                  </span>
                )}
                {isUploadingToDb && (
                  <span className="text-emerald-600 font-medium animate-pulse">
                    {uploadStatusMsg}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  disabled={isUploadingToDb}
                  onClick={() => {
                    setShowImportModal(false);
                    setParsedData([]);
                    setImportFileName("");
                    setPastedRawText("");
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer text-xs font-semibold disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isUploadingToDb || parsedData.filter(r => r.isValid).length === 0}
                  onClick={handleConfirmImport}
                  className={`px-4 py-2 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${isUploadingToDb || parsedData.filter(r => r.isValid).length === 0
                      ? "bg-slate-400 cursor-not-allowed opacity-80"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer active:scale-95"
                    }`}
                >
                  {isUploadingToDb ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{uploadStatusMsg || "Đang ghi vào Supabase..."}</span>
                    </>
                  ) : (
                    <>
                      <Database size={15} />
                      <span>Tích hợp vào Database ({parsedData.filter(r => r.isValid).length} hồ sơ hợp lệ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3 & 4: OFFICIAL POLICE CT07 & NA17 CERTIFICATE MODALS */}
      <ResidentCT07Modal
        resident={residentForCT07}
        isOpen={showCT07Modal}
        onClose={() => setShowCT07Modal(false)}
      />
      <ResidentNA17Modal
        resident={residentForNA17}
        isOpen={showNA17Modal}
        onClose={() => setShowNA17Modal(false)}
      />

      {/* QUICK VIEW HOUSEHOLD DRAWER / MODAL - LIÊN KẾT 2 CHIỀU CƯ DÂN & HỘ KHẨU */}
      {quickHouseholdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setQuickHouseholdModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            <div className="bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {quickHouseholdModal.code}
                </span>
                <span className="text-xs font-bold text-slate-600">SỔ HỘ TỊCH ĐIỆN TỬ</span>
              </div>
              <button
                onClick={() => setQuickHouseholdModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hộ gia đình: {quickHouseholdModal.ownerName}
                </h3>
                <p className="text-slate-600 flex items-center gap-1 mt-1 font-medium">
                  <MapPin size={13} className="text-emerald-600 shrink-0" />
                  <span>{quickHouseholdModal.address}</span>
                </p>
                {quickHouseholdModal.coordinates && (
                  <p className="text-slate-400 font-mono text-[10.5px] mt-0.5">
                    Tọa độ GIS: {quickHouseholdModal.coordinates}
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Danh sách nhân khẩu trong hộ ({quickHouseholdModal.members?.length || quickHouseholdModal.memberCount || 0} người)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {quickHouseholdModal.type || "Thường trú"}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {(quickHouseholdModal.members || []).map((m: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-slate-200/70 text-xs shadow-2xs">
                      <div>
                        <strong className="text-slate-900 block">{m.name}</strong>
                        <span className="text-slate-500 font-mono text-[10.5px]">
                          Sinh: {m.birthYear || "—"} • CCCD: {m.cccd}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.relation === "Chủ hộ" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                        }`}>
                        {m.relation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-400 font-medium">Đồng bộ cơ sở dữ liệu Khu phố 3</span>
              <button
                type="button"
                onClick={() => setQuickHouseholdModal(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
