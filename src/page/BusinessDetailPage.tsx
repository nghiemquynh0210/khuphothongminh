import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  History,
  Home,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  Users2,
  X,
} from "lucide-react";
import {
  Business,
  BusinessChangeLog,
  BusinessFile,
  Household,
  InspectionLog,
  Resident,
  TargetGisItem,
} from "../types";
import {
  getBusinessIndustryGroup,
  getSectorMeta,
  isAccommodationBusiness,
} from "../components/BusinessManagement";
import {
  generateDefaultCoordinatesForAddress,
  getGoogleMapsDirectionUrl,
  parseCoordinates as parseGisCoords,
} from "../utils/gisUtils";
import {
  getTemporaryResidenceExpiryStatus,
  isResidentInAccommodation,
} from "../utils/householdRecognitionUtils";
import { getStoredAssociations } from "../data/associationsData";
import { extractKeyLeadersSummary } from "../utils/leadershipSync";
import { formatShortRecordId } from "../utils/kp3Utils";
import { normalizeEntityLandParcels } from "../utils/landParcelsUtils";
import { uploadFileToStorageBucket } from "../utils/imageUpload";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { MultiParcelDetailView } from "../components/common/MultiParcelDetailView";
import { RecordDetailShell } from "../components/common/RecordDetailShell";
import { SharedAddressHubCard } from "../components/common/SharedAddressHubCard";
import { LoadingFade } from "../components/common/LoadingFade";
import { ReportSelect } from "../components/reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  getBusinessDetailPath,
  getBusinessEditPath,
  getHouseholdDetailPath,
  getResidentDetailPath,
  navigate,
} from "../routes";

export type BusinessDetailTab = "general" | "premises" | "personnel" | "history";
export type StayingExpiryFilter = "all" | "expiring" | "expired";

function normalizeVnSearch(input?: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function isResidentHouseholdHead(
  res: Resident,
  households: Household[] = []
): boolean {
  const rel = normalizeVnSearch(res.relationToOwner);
  if (rel === "chu ho") return true;
  if (
    res.ownerName &&
    normalizeVnSearch(res.ownerName) === normalizeVnSearch(res.fullName)
  ) {
    return true;
  }
  if (res.householdId && households.length > 0) {
    const matchedHh = households.find((h) => h.code === res.householdId);
    if (
      matchedHh &&
      normalizeVnSearch(matchedHh.ownerName) === normalizeVnSearch(res.fullName)
    ) {
      return true;
    }
  }
  return false;
}

export function filterStayingResidents(
  list: Resident[],
  query: string,
  expiryFilter: StayingExpiryFilter = "all",
  households: Household[] = []
): Resident[] {
  const normQuery = normalizeVnSearch(query);
  return list.filter((res) => {
    const expStatus = getTemporaryResidenceExpiryStatus(res.temporaryExpDate);
    if (expiryFilter === "expiring" && !expStatus.isWarning) return false;
    if (expiryFilter === "expired" && !expStatus.isExpired) return false;

    if (!normQuery) return true;

    const isHead = isResidentHouseholdHead(res, households);
    const searchableFields = [
      res.fullName,
      res.cccd,
      res.passportNumber,
      res.phone,
      res.permanentAddress,
      res.hometown,
      res.birthDate,
      res.ownerName,
      isHead ? "Chủ hộ" : res.relationToOwner,
      expStatus.formattedDate,
      expStatus.label,
    ];

    return searchableFields.some((field) =>
      normalizeVnSearch(field).includes(normQuery)
    );
  });
}

export interface BusinessDetailPageProps {
  businessId: string;
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  isDataLoading?: boolean;
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
  onBack?: () => void;
  onEdit?: (business: Business) => void;
  onSelectBusiness?: (businessId: string) => void;
  onDeleted?: (deletedBusiness: Business) => void;
}

export default function BusinessDetailPage({
  businessId,
  businesses,
  residents = [],
  households = [],
  isDataLoading = false,
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis,
  onBack,
  onEdit,
  onSelectBusiness,
  onDeleted,
}: BusinessDetailPageProps) {
  const [detailTab, setDetailTab] = useState<BusinessDetailTab>("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Change Log States
  const [showAddChangeLogModal, setShowAddChangeLogModal] = useState(false);
  const [formChangeDate, setFormChangeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formChangeType, setFormChangeType] =
    useState<BusinessChangeLog["type"]>("Thay đổi ngành nghề");
  const [formChangeDesc, setFormChangeDesc] = useState("");
  const [formChangeRecordedBy, setFormChangeRecordedBy] = useState(
    "Bí thư Chi bộ / Trưởng KP3"
  );

  // Periodic Inspection States
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [showEditInspectionModal, setShowEditInspectionModal] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] =
    useState<InspectionLog | null>(null);
  const [editingInspection, setEditingInspection] =
    useState<InspectionLog | null>(null);

  const [formInspDate, setFormInspDate] = useState("");
  const [formInspInspector, setFormInspInspector] = useState("");
  const [formInspResult, setFormInspResult] =
    useState<InspectionLog["result"]>("Đạt chuẩn");
  const [formInspNote, setFormInspNote] = useState("");
  const [formInspRecommendation, setFormInspRecommendation] = useState("");
  const [formInspPenalties, setFormInspPenalties] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  // Quick search & expiry filter for Actual Staying Residents list
  const [stayingSearchQuery, setStayingSearchQuery] = useState("");
  const [stayingExpiryFilter, setStayingExpiryFilter] =
    useState<StayingExpiryFilter>("all");

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const selectedBusiness = useMemo(() => {
    return (
      businesses.find(
        (b) =>
          b.id === businessId ||
          b.internalCode === businessId ||
          b.licenseNumber === businessId ||
          b.taxCode === businessId
      ) || null
    );
  }, [businesses, businessId]);

  useEffect(() => {
    setStayingSearchQuery("");
    setStayingExpiryFilter("all");
  }, [selectedBusiness?.id]);

  const currentIdx = selectedBusiness
    ? businesses.findIndex((item) => item.id === selectedBusiness.id)
    : -1;
  const totalNav = businesses.length;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;

  const handleGoBack = () => {
    if (onBack) onBack();
    else navigate(ROUTES.DASHBOARD_BUSINESSES);
  };

  const handleSelectNav = (target: Business) => {
    setDetailTab("general");
    if (onSelectBusiness) {
      onSelectBusiness(target.id);
    } else {
      navigate(getBusinessDetailPath(target.id));
    }
  };

  const getLinkedHousehold = (b: Business): Household | undefined => {
    if (b.linkedHouseholdCode) {
      const found = households.find(
        (h) => h.code.toLowerCase() === b.linkedHouseholdCode?.toLowerCase()
      );
      if (found) return found;
    }
    if (b.address) {
      const found = households.find(
        (h) =>
          b.address.toLowerCase().includes(h.address.toLowerCase()) ||
          h.address.toLowerCase().includes(b.address.toLowerCase())
      );
      if (found) return found;
    }
    return undefined;
  };

  const getStayingResidentsInBusiness = (b: Business): Resident[] => {
    return (residents || []).filter((r) => isResidentInAccommodation(r, b));
  };

  const getBusinessInspections = (b: Business | null): InspectionLog[] => {
    if (!b || !b.inspections || !Array.isArray(b.inspections)) {
      return [];
    }
    return b.inspections;
  };

  const handleProcessFileUpload = (
    file: File,
    onSuccess: (fileObj: BusinessFile) => void
  ) => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      showToast(
        "Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!",
        "error"
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast("Dung lượng tệp tối đa cho phép là 25MB!", "error");
      return;
    }

    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = async () => {
      const localUrl = (reader.result as string) || "";
      let finalUrl = localUrl;
      try {
        finalUrl = await uploadFileToStorageBucket(
          file,
          "cadastral-docs",
          "businesses"
        );
      } catch {
        finalUrl = localUrl;
      }
      onSuccess({
        name: file.name,
        url: finalUrl,
        type: isPdf ? "pdf" : "image",
        size: formattedSize,
        uploadDate: new Date().toLocaleDateString("vi-VN"),
      });
      showToast(`Đã tải tệp: ${file.name} (${formattedSize})`, "success");
    };
    reader.onerror = () => {
      showToast("Không thể đọc tệp tin đã chọn!", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadFile = (fileObj: BusinessFile) => {
    const link = document.createElement("a");
    link.href = fileObj.url;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đang tải tệp: ${fileObj.name}`, "success");
  };

  const handleAddGalleryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBusiness || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const localImg = (reader.result as string) || "";
      let newImg = localImg;
      try {
        newImg = await uploadFileToStorageBucket(
          file,
          "cadastral-docs",
          "businesses"
        );
      } catch {
        newImg = localImg;
      }
      const existing =
        selectedBusiness.images ||
        (selectedBusiness.image ? [selectedBusiness.image] : []);
      const updatedImages = [...existing, newImg];
      const updated = {
        ...selectedBusiness,
        images: updatedImages,
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(
          businesses.map((b) => (b.id === selectedBusiness.id ? updated : b))
        );
      }
      showToast("Đã thêm ảnh vào bộ sưu tập cơ sở!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDirections = (b: Business) => {
    let coords = b.coordinates;
    if (!coords || !parseGisCoords(coords)) {
      const autoGeo = generateDefaultCoordinatesForAddress(b.address, b.id);
      coords = autoGeo.dms;
      if (onUpdateBusinesses) {
        onUpdateBusinesses(
          businesses.map((item) =>
            item.id === b.id ? { ...item, coordinates: coords } : item
          )
        );
      }
    }
    if (onNavigateToGis) {
      onNavigateToGis({
        id: b.id,
        type: "business",
        name: b.name,
        address: b.address,
        coordinates: coords,
        navigateRoute: true,
      });
    } else if (coords) {
      const parsed = parseGisCoords(coords);
      if (parsed) {
        window.open(
          getGoogleMapsDirectionUrl(parsed.lat, parsed.lng, b.address),
          "_blank"
        );
      }
    }
  };

  const handleExportHostelResidents = (
    bus: Business,
    hostelResidents: Resident[]
  ) => {
    if (!hostelResidents || hostelResidents.length === 0) {
      showToast("Không có dữ liệu người lưu trú để xuất file!", "warning");
      return;
    }

    const exportRows = hostelResidents.map((r, i) => {
      const expStatus = getTemporaryResidenceExpiryStatus(r.temporaryExpDate);
      const isHead = isResidentHouseholdHead(r, households || []);
      return {
        STT: i + 1,
        "Họ và tên": r.fullName,
        "Vai trò trong hộ": isHead ? "Chủ hộ" : r.relationToOwner || "Thành viên",
        "Chủ hộ tạm trú": r.ownerName || (isHead ? r.fullName : "—"),
        "Giới tính": r.gender,
        "Ngày sinh": r.birthDate,
        "Số CCCD / Định danh": r.cccd,
        "Số điện thoại": r.phone || "Chưa cập nhật",
        "Nơi thường trú gốc (Quê quán)":
          r.permanentAddress || r.hometown || "Chưa cập nhật",
        "Chỗ ở hiện tại / Tạm trú": r.currentAddress || r.address,
        "Ngày đăng ký tạm trú": r.temporaryRegDate || "Chưa cập nhật",
        "Ngày hết hạn tạm trú": r.temporaryExpDate || "Chưa cập nhật",
        "Tình trạng thời hạn": expStatus.label,
        "Cơ sở lưu trú": bus.name,
        "Chủ cơ sở": bus.owner,
        "SĐT chủ cơ sở": bus.phone,
        "Địa chỉ cơ sở": bus.address,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_cu_dan_luu_tru");
    const fileName = `DS_LuuTru_${bus.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleOpenAddChangeLog = () => {
    setFormChangeDate(new Date().toISOString().split("T")[0]);
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
      recordedBy: formChangeRecordedBy.trim() || "Ban Điều hành KP3",
    };

    const updatedLogs = [newLog, ...(selectedBusiness.changeHistory || [])];
    const updatedBusiness: Business = {
      ...selectedBusiness,
      changeHistory: updatedLogs,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) =>
          b.id === selectedBusiness.id ? updatedBusiness : b
        )
      );
    }
    setShowAddChangeLogModal(false);
    showToast("Đã ghi nhận biến động cơ sở kinh doanh thành công!", "success");
  };

  const handleOpenAddInspection = () => {
    setFormInspDate(new Date().toISOString().split("T")[0]);
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
      penalties: formInspPenalties.trim() || undefined,
    };

    const currentList = getBusinessInspections(selectedBusiness);
    const updatedB: Business = {
      ...selectedBusiness,
      inspections: [newInspection, ...currentList],
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === selectedBusiness.id ? updatedB : b))
      );
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
    const updatedList = currentList.map((item) => {
      if (item.id === editingInspection.id) {
        return {
          ...item,
          date: displayDate || item.date,
          result: formInspResult,
          inspector: formInspInspector.trim(),
          note: formInspNote.trim(),
          recommendation: formInspRecommendation.trim() || undefined,
          penalties: formInspPenalties.trim() || undefined,
        };
      }
      return item;
    });

    const updatedB: Business = {
      ...selectedBusiness,
      inspections: updatedList,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === selectedBusiness.id ? updatedB : b))
      );
    }
    setShowEditInspectionModal(false);
    setEditingInspection(null);
    showToast("Đã cập nhật biên bản kiểm tra thành công!", "success");
  };

  const handleExecuteDeleteInspection = () => {
    if (!selectedBusiness || !inspectionToDelete) return;
    const currentList = getBusinessInspections(selectedBusiness);
    const updatedB: Business = {
      ...selectedBusiness,
      inspections: currentList.filter(
        (item) => item.id !== inspectionToDelete.id
      ),
    };
    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === selectedBusiness.id ? updatedB : b))
      );
    }
    setInspectionToDelete(null);
    showToast("Đã xóa biên bản kiểm tra thành công!", "success");
  };

  const executeDeleteBusiness = () => {
    if (!selectedBusiness) return;
    const deleted = selectedBusiness;
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.filter((b) => b.id !== deleted.id));
    }
    setShowDeleteConfirm(false);
    if (onDeleted) {
      onDeleted(deleted);
    } else {
      navigate(ROUTES.DASHBOARD_BUSINESSES);
    }
  };

  if (isDataLoading && !selectedBusiness) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <LoadingFade title="Đang tải hồ sơ cơ sở kinh doanh..." />
      </div>
    );
  }

  if (!selectedBusiness) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Không tìm thấy hồ sơ cơ sở kinh doanh
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Mã hồ sơ{" "}
            <span className="font-mono font-semibold text-slate-800">
              {businessId}
            </span>{" "}
            không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu Khu phố 3.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Danh sách Cơ sở Kinh doanh</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shortBizId = formatShortRecordId(
    selectedBusiness.internalCode || selectedBusiness.id,
    "HKD"
  );
  const sectorMeta = getSectorMeta(getBusinessIndustryGroup(selectedBusiness));

  const businessTabs = [
    {
      id: "general",
      label: "Thông tin chung & Pháp lý",
      icon: <Store size={14} />,
    },
    {
      id: "premises",
      label: "Mặt bằng & Cư dân Lưu trú",
      icon: <MapPin size={14} />,
    },
    {
      id: "personnel",
      label: "Người đại diện & Lao động",
      icon: <Users2 size={14} />,
    },
    {
      id: "history",
      label: "Biến động & Kiểm tra",
      icon: <History size={14} />,
    },
  ];

  return (
    <RecordDetailShell
      backLabel="Danh sách cơ sở kinh doanh"
      onBack={handleGoBack}
      navigation={
        totalNav > 1 && currentIdx >= 0
          ? {
              hasPrev,
              hasNext,
              onPrev: () => hasPrev && handleSelectNav(businesses[currentIdx - 1]),
              onNext: () => hasNext && handleSelectNav(businesses[currentIdx + 1]),
              prevTitle: "Cơ sở trước",
              nextTitle: "Cơ sở tiếp theo",
              positionLabel: `${currentIdx + 1} / ${totalNav}`,
            }
          : undefined
      }
      topRightSlot={
        <button
          type="button"
          onClick={() => window.print()}
          className="h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <Printer size={13} className="text-slate-500" />
          <span>In phiếu</span>
        </button>
      }
      avatarSlot={
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 group bg-slate-100">
          <img
            src={
              selectedBusiness.image ||
              "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400"
            }
            alt={selectedBusiness.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <label className="absolute inset-0 bg-slate-950/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
            <Camera size={14} className="text-white mb-0.5" />
            <span className="text-[10px] font-semibold">Đổi ảnh</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFileUpload(e.target.files[0], (fileObj) => {
                    const updated = {
                      ...selectedBusiness,
                      image: fileObj.url,
                    };
                    if (onUpdateBusinesses) {
                      onUpdateBusinesses(
                        businesses.map((b) =>
                          b.id === selectedBusiness.id ? updated : b
                        )
                      );
                    }
                    showToast("Đã cập nhật ảnh đại diện cơ sở thành công!", "success");
                  });
                }
              }}
            />
          </label>
        </div>
      }
      badgesSlot={
        <>
          <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
            {shortBizId}
          </span>
          <span className="font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
            {sectorMeta.shortName}
          </span>
          <span
            className={`font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
              selectedBusiness.status === "Đang hoạt động"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : selectedBusiness.status === "Tạm ngưng"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedBusiness.status === "Đang hoạt động"
                  ? "bg-emerald-600"
                  : selectedBusiness.status === "Tạm ngưng"
                  ? "bg-amber-600"
                  : "bg-rose-600"
              }`}
            />
            <span>{selectedBusiness.status}</span>
          </span>
          {selectedBusiness.timemarkVerified && (
            <span className="font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
              <Camera size={11} className="text-amber-600" />
              <span>Timemark GPS</span>
            </span>
          )}
        </>
      }
      title={selectedBusiness.name}
      subtitleSlot={
        <>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span>{selectedBusiness.address}</span>
          </span>
          <button
            type="button"
            onClick={() =>
              setViewingImagePreview({
                url:
                  selectedBusiness.image ||
                  "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400",
                caption: selectedBusiness.name,
              })
            }
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            <Maximize2 size={11} /> Ảnh lớn
          </button>
          {selectedBusiness.coordinates && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedBusiness.coordinates)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
            >
              <ExternalLink size={11} /> Bản đồ
            </a>
          )}
        </>
      }
      actionsSlot={
        <>
          <div className="min-w-[165px]">
            <ReportSelect
              aria-label="Trạng thái cơ sở kinh doanh"
              value={selectedBusiness.status}
              onChange={(nextVal) =>
                onUpdateStatus(selectedBusiness.id, nextVal as any)
              }
              options={[
                { value: "Đang hoạt động", label: "Đang hoạt động" },
                { value: "Tạm ngưng", label: "Tạm ngưng" },
                { value: "Chuyển địa điểm", label: "Chuyển địa điểm" },
                { value: "Chưa xác minh", label: "Chưa xác minh" },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              onEdit
                ? onEdit(selectedBusiness)
                : navigate(getBusinessEditPath(selectedBusiness.id))
            }
            className="h-9 text-xs font-semibold px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Pencil size={13} /> Sửa hồ sơ
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-9 text-xs font-semibold px-3 border border-slate-200 hover:border-rose-200 bg-white text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Trash2 size={13} /> Xóa
          </button>
        </>
      }
      tabs={businessTabs}
      activeTab={detailTab}
      onTabChange={(id) => setDetailTab(id as any)}
      bodyClassName="p-5 sm:p-6 space-y-4 text-xs"
    >
          {/* TAB 1: THÔNG TIN CHUNG & PHÁP LÝ */}
          {detailTab === "general" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Store size={15} />
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Đăng ký Hoạt động &amp; Giấy phép Pháp lý
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-1.5">
                    {(
                      selectedBusiness.images || [
                        selectedBusiness.image ||
                          "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400",
                      ]
                    )
                      .slice(0, 3)
                      .map((imgUrl, i) => (
                        <div
                          key={i}
                          onClick={() =>
                            setViewingImagePreview({
                              url: imgUrl,
                              caption: `${selectedBusiness.name} - Ảnh ${i + 1}`,
                            })
                          }
                          className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                          title={`Xem ảnh ${i + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                  </div>
                  <label className="min-h-8 text-xs text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors">
                    <Plus size={12} /> Ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAddGalleryPhoto}
                    />
                  </label>
                </div>
              </div>

              <DetailGrid hideEmpty compact>
                <DetailRow
                  label="Số Giấy phép KD / Mã ĐK"
                  value={selectedBusiness.licenseNumber || "Chưa cấp"}
                  isMono
                />
                <DetailRow
                  label="Mã số thuế (MST)"
                  value={selectedBusiness.taxCode || "Đang xác minh"}
                  isMono
                />
                <DetailRow
                  label="Loại hình cơ sở"
                  value={
                    <span className="font-bold text-indigo-800">
                      {selectedBusiness.isAccommodation
                        ? "Cơ sở Lưu trú / Nhà trọ"
                        : selectedBusiness.businessType ||
                          "Hộ kinh doanh cá thể"}
                    </span>
                  }
                />
                <DetailRow
                  label="Ngành nghề kinh doanh"
                  value={selectedBusiness.type}
                />
                <DetailRow
                  label="Quy mô lao động"
                  value={
                    <span className="font-bold text-purple-800">
                      {selectedBusiness.employeeCount} lao động
                    </span>
                  }
                />
                <DetailRow
                  label="Ngày bắt đầu hoạt động"
                  value={
                    selectedBusiness.licenseIssueDate ||
                    selectedBusiness.startDate ||
                    "10/01/2021"
                  }
                  isMono
                />
                {selectedBusiness.issuingAuthority && (
                  <DetailRow
                    label="Cơ quan cấp phép"
                    value={selectedBusiness.issuingAuthority}
                  />
                )}
                {selectedBusiness.charterCapital && (
                  <DetailRow
                    label="Vốn kinh doanh"
                    value={selectedBusiness.charterCapital}
                  />
                )}
                <DetailRow
                  label="Bản chụp Giấy phép KD"
                  value={
                    selectedBusiness.giayPhepFile ? (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingDoc({
                            title: "Giấy phép Kinh doanh / GCN Đăng ký HKD",
                            businessName: selectedBusiness.name,
                            file: selectedBusiness.giayPhepFile!,
                            business: selectedBusiness,
                          })
                        }
                        className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded border border-indigo-200 text-xs cursor-pointer transition-colors"
                      >
                        <FileText size={12} /> Xem bản chụp GPKD
                      </button>
                    ) : (
                      <span className="text-slate-400 italic text-xs">
                        Chưa đính kèm ảnh giấy phép
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="An toàn PCCC"
                  value={
                    selectedBusiness.safetyCertified ? (
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        <ShieldCheck size={12} /> Đã thẩm duyệt an toàn PCCC
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                        Đang trong diện rà soát PCCC
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="Hồ sơ QSDĐ (Sổ đỏ)"
                  value={(() => {
                    const pList = normalizeEntityLandParcels(selectedBusiness);
                    if (pList.length >= 2) {
                      return (
                        <button
                          type="button"
                          onClick={() => setDetailTab("premises")}
                          className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs cursor-pointer"
                        >
                          <FileText size={12} /> Ghép {pList.length} thửa đất (
                          {pList.length} Sổ đỏ) ➜
                        </button>
                      );
                    }
                    if (selectedBusiness.soDoFile || pList[0]?.soDoFile) {
                      return (
                        <span className="text-blue-700 font-bold inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                          <FileText size={12} /> Đã nộp bản sao chứng thực
                        </span>
                      );
                    }
                    return (
                      <span className="text-slate-400 italic text-xs">
                        Chưa nộp hồ sơ sổ đỏ
                      </span>
                    );
                  })()}
                />
                <DetailRow
                  label="Xác minh & Nguồn dữ liệu"
                  value={
                    <span className="text-slate-700 leading-relaxed font-normal">
                      Nguồn thu thập:{" "}
                      <strong className="font-semibold text-slate-800">
                        {selectedBusiness.verificationSource ||
                          "Khảo sát Ban Điều hành KP3 & CSKV"}
                      </strong>{" "}
                      (phục vụ quản lý địa bàn hành chính tại chỗ)
                    </span>
                  }
                  colSpan={2}
                />
              </DetailGrid>

              <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-amber-600" />
                    <span>Ý kiến đóng góp &amp; Nhu cầu hỗ trợ</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Khu phố 3 đồng hành cùng cơ sở
                  </span>
                </div>

                {selectedBusiness.supportNeeds &&
                  selectedBusiness.supportNeeds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedBusiness.supportNeeds.map((need, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/90 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                        >
                          • {need}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                    Ý kiến / Khó khăn gửi Chi bộ &amp; Ban ĐH KP3:
                  </span>
                  <p className="text-slate-700 italic leading-relaxed">
                    "
                    {selectedBusiness.supportNotes ||
                      "Cơ sở hoạt động ổn định, chấp hành nghiêm túc quy định của khu phố và địa phương, không có đề xuất khó khăn cần giải quyết."}
                    "
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MẶT BẰNG & CƯ DÂN LƯU TRÚ */}
          {detailTab === "premises" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-emerald-50 text-emerald-700 rounded-lg">
                    <MapPin size={14} />
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Địa điểm, Mặt bằng &amp; Tuyến đường
                  </h4>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedBusiness.premisesType || "Nhà phố"}
                </span>
              </div>

              <DetailGrid hideEmpty compact>
                <DetailRow
                  label="Địa chỉ & Tuyến đường"
                  value={
                    <span className="flex items-center gap-1 font-semibold text-slate-900">
                      <MapPin size={13} className="text-emerald-600 shrink-0" />
                      <span>{selectedBusiness.address}</span>
                    </span>
                  }
                  helperText={`Phân tuyến: ${
                    selectedBusiness.streetArea ||
                    (selectedBusiness.address.includes("42")
                      ? "Hẻm 42 Lương Định Của"
                      : "Mặt tiền Lương Định Của")
                  }`}
                  colSpan={2}
                />
                <DetailRow
                  label="Loại mặt bằng"
                  value={selectedBusiness.premisesType || "Cửa hàng / Nhà phố"}
                />
                <DetailRow
                  label="Chủ sở hữu mặt bằng"
                  value={`${selectedBusiness.premisesOwner || selectedBusiness.owner}${
                    selectedBusiness.premisesOwnerPhone
                      ? ` (SĐT: ${selectedBusiness.premisesOwnerPhone})`
                      : ""
                  }`}
                />
              </DetailGrid>

              {/* TỔ HỢP HỘ KHẨU • DOANH NGHIỆP • CƠ SỞ KD CÙNG ĐỊA CHỈ */}
              <SharedAddressHubCard
                focusBusiness={selectedBusiness}
                households={households || []}
                businesses={businesses}
                hideHouseholds={Boolean(
                  isAccommodationBusiness(selectedBusiness) ||
                    selectedBusiness.linkedBuildingOrHostel
                )}
                hideWhenEmpty={Boolean(
                  isAccommodationBusiness(selectedBusiness) ||
                    selectedBusiness.linkedBuildingOrHostel
                )}
              />

              {/* KHỐI LIÊN KẾT NHÀ TRỌ / CƠ SỞ LƯU TRÚ */}
              {(isAccommodationBusiness(selectedBusiness) ||
                selectedBusiness.linkedBuildingOrHostel) &&
                (() => {
                  const stayingResidents =
                    getStayingResidentsInBusiness(selectedBusiness);
                  const actualCount =
                    stayingResidents.length > 0
                      ? stayingResidents.length
                      : selectedBusiness.soNguoiLuuTru || 0;
                  return (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                            <Building size={14} className="text-amber-700" />
                            <span>
                              Cơ sở Lưu trú / Nhà trọ &amp; Căn hộ cho thuê
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            Quản lý lưu trú KP3
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                            <span className="text-[10px] text-slate-500 block">
                              Số tầng
                            </span>
                            <strong className="text-amber-950 font-bold text-xs">
                              {selectedBusiness.soTang || "3"} tầng
                            </strong>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                            <span className="text-[10px] text-slate-500 block">
                              Số phòng trọ
                            </span>
                            <strong className="text-amber-950 font-bold text-xs">
                              {selectedBusiness.soPhong || "12"} phòng
                            </strong>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                            <span className="text-[10px] text-slate-500 block">
                              Người lưu trú thực tế
                            </span>
                            <strong className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                              <span>{actualCount} người</span>
                            </strong>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                            <span className="text-[10px] text-slate-500 block">
                              Giá thuê
                            </span>
                            <strong className="text-slate-800 text-[10.5px] block truncate">
                              {selectedBusiness.giaThueTrungBinh || "Thỏa thuận"}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-3">
                        {(() => {
                          const filteredStaying = filterStayingResidents(
                            stayingResidents,
                            stayingSearchQuery,
                            stayingExpiryFilter,
                            households || []
                          );
                          const isFiltered =
                            stayingSearchQuery.trim().length > 0 ||
                            stayingExpiryFilter !== "all";
                          const headCount = stayingResidents.filter((r) =>
                            isResidentHouseholdHead(r, households || [])
                          ).length;
                          const expiringCount = stayingResidents.filter(
                            (r) =>
                              getTemporaryResidenceExpiryStatus(
                                r.temporaryExpDate
                              ).isWarning
                          ).length;
                          const expiredCount = stayingResidents.filter(
                            (r) =>
                              getTemporaryResidenceExpiryStatus(
                                r.temporaryExpDate
                              ).isExpired
                          ).length;

                          return (
                            <>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-2">
                                <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                                  <span>Danh sách Người Lưu trú Thực tế</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-200 text-amber-900 font-bold">
                                    {isFiltered
                                      ? `${filteredStaying.length}/${stayingResidents.length} người`
                                      : `${stayingResidents.length} người`}
                                  </span>
                                  {headCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold normal-case">
                                      {headCount} chủ hộ
                                    </span>
                                  )}
                                </h4>

                                {filteredStaying.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleExportHostelResidents(
                                        selectedBusiness,
                                        filteredStaying
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                  >
                                    <Download size={13} />{" "}
                                    {isFiltered
                                      ? `Xuất kết quả lọc (${filteredStaying.length})`
                                      : `Xuất DS Excel (${stayingResidents.length})`}
                                  </button>
                                )}
                              </div>

                              {stayingResidents.length > 0 && (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <div className="relative flex-1">
                                    <Search
                                      size={14}
                                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                      type="text"
                                      value={stayingSearchQuery}
                                      onChange={(e) =>
                                        setStayingSearchQuery(e.target.value)
                                      }
                                      placeholder="Tìm nhanh họ tên, CCCD, SĐT, quê quán, năm sinh..."
                                      aria-label="Tìm nhanh người lưu trú thực tế"
                                      className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-200/90 bg-slate-50/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                    />
                                    {stayingSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStayingSearchQuery("")
                                        }
                                        aria-label="Xóa từ khóa tìm kiếm"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                      >
                                        <X size={13} />
                                      </button>
                                    )}
                                  </div>

                                  {(expiringCount > 0 || expiredCount > 0) && (
                                    <div className="flex items-center gap-1 flex-wrap shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStayingExpiryFilter("all")
                                        }
                                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                          stayingExpiryFilter === "all"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        }`}
                                      >
                                        Tất cả ({stayingResidents.length})
                                      </button>
                                      {expiringCount > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setStayingExpiryFilter(
                                              stayingExpiryFilter === "expiring"
                                                ? "all"
                                                : "expiring"
                                            )
                                          }
                                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                            stayingExpiryFilter === "expiring"
                                              ? "bg-amber-600 text-white border-amber-600"
                                              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                          }`}
                                        >
                                          Sắp hết hạn ({expiringCount})
                                        </button>
                                      )}
                                      {expiredCount > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setStayingExpiryFilter(
                                              stayingExpiryFilter === "expired"
                                                ? "all"
                                                : "expired"
                                            )
                                          }
                                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                            stayingExpiryFilter === "expired"
                                              ? "bg-rose-600 text-white border-rose-600"
                                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                          }`}
                                        >
                                          Quá hạn ({expiredCount})
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {stayingResidents.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg">
                                  Chưa phát hiện cư dân có địa chỉ đăng ký trùng
                                  khớp trong dữ liệu tạm trú
                                </div>
                              ) : filteredStaying.length === 0 ? (
                                <div className="text-center py-5 px-3 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-2">
                                  <p>
                                    Không tìm thấy người lưu trú nào khớp{" "}
                                    {stayingSearchQuery.trim() ? (
                                      <strong className="text-slate-800">
                                        &ldquo;{stayingSearchQuery.trim()}&rdquo;
                                      </strong>
                                    ) : (
                                      "bộ lọc thời hạn đã chọn"
                                    )}
                                    .
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStayingSearchQuery("");
                                      setStayingExpiryFilter("all");
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] cursor-pointer"
                                  >
                                    <X size={12} /> Xóa tìm kiếm &amp; bộ lọc
                                  </button>
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-64 overflow-y-auto border border-amber-100 rounded-lg">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-amber-50 text-amber-950 font-bold sticky top-0 z-10 border-b border-amber-200 text-[11px]">
                                      <tr>
                                        <th className="py-2 px-2.5">STT</th>
                                        <th className="py-2 px-2.5">
                                          Họ và tên
                                        </th>
                                        <th className="py-2 px-2.5">CCCD</th>
                                        <th className="py-2 px-2.5">SĐT</th>
                                        <th className="py-2 px-2.5">
                                          Quê quán
                                        </th>
                                        <th className="py-2 px-2.5">
                                          Thời hạn tạm trú
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {filteredStaying.map((res, idx) => {
                                        const expStatus =
                                          getTemporaryResidenceExpiryStatus(
                                            res.temporaryExpDate
                                          );
                                        const isHead = isResidentHouseholdHead(
                                          res,
                                          households || []
                                        );
                                        return (
                                          <tr
                                            key={res.id}
                                            tabIndex={0}
                                            onClick={() =>
                                              navigate(
                                                getResidentDetailPath(res.id)
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              if (e.target !== e.currentTarget)
                                                return;
                                              if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                              ) {
                                                e.preventDefault();
                                                navigate(
                                                  getResidentDetailPath(res.id)
                                                );
                                              }
                                            }}
                                            title={`Nhấn để xem chi tiết hồ sơ cư dân: ${res.fullName}`}
                                            className="group cursor-pointer hover:bg-amber-50/70 transition-colors focus-visible:outline-none focus-visible:bg-amber-50"
                                          >
                                            <td className="py-2 px-2.5 font-mono text-slate-400 text-[10px]">
                                              {idx + 1}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors text-xs">
                                                  {res.fullName}
                                                </span>
                                                {isHead && (
                                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                                    Chủ hộ
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                                                {res.birthDate &&
                                                  res.birthDate !==
                                                    "Chưa cập nhật" && (
                                                    <span>
                                                      {res.gender} •{" "}
                                                      {res.birthDate}
                                                    </span>
                                                  )}
                                                {!isHead && res.ownerName && (
                                                  <span className="font-sans text-slate-500">
                                                    • Thuộc hộ: {res.ownerName}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-2 px-2.5 font-mono text-slate-800 text-[11px]">
                                              {res.cccd}
                                            </td>
                                            <td className="py-2 px-2.5 font-mono text-slate-600 text-[11px]">
                                              {res.phone &&
                                              res.phone !== "Chưa cập nhật" ? (
                                                <a
                                                  href={`tel:${res.phone}`}
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  className="hover:text-amber-800 hover:underline"
                                                >
                                                  {res.phone}
                                                </a>
                                              ) : (
                                                "—"
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-600 truncate max-w-[160px]">
                                              {res.permanentAddress ||
                                                res.hometown ||
                                                "—"}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span
                                                className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-mono ${
                                                  expStatus.isExpired
                                                    ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                                                    : expStatus.isWarning
                                                      ? "bg-amber-50 text-amber-800 border-amber-200 font-bold"
                                                      : "bg-emerald-50/60 text-emerald-800 border-emerald-200/80"
                                                }`}
                                                title={expStatus.label}
                                              >
                                                {expStatus.formattedDate ||
                                                  "Còn hạn"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}

              {/* THÔNG TIN ĐỊA CHÍNH & ĐA SỔ ĐỎ (GCN QSDĐ) */}
              <MultiParcelDetailView entity={selectedBusiness} />

              {/* KHỐI XÁC THỰC ẢNH MẶT TIỀN TIMEMARK */}
              {selectedBusiness.timemarkVerified && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white border border-emerald-500/40 shadow-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center shrink-0">
                        <Camera size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-white">
                            Xác thực Ảnh mặt tiền Timemark
                          </h5>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                            100% Chân thực
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-300/80">
                          Bóc tách tự động tọa độ GPS, thời gian chụp và mã bảo mật chống gian lận
                        </p>
                      </div>
                    </div>
                    {selectedBusiness.timemarkHash && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-300/80 uppercase tracking-wider font-semibold">
                          Mã xác thực:
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 border border-emerald-600/70">
                          #{selectedBusiness.timemarkHash}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                      <span className="text-[10px] text-emerald-400 block font-medium">Tọa độ GPS vệ tinh:</span>
                      <strong className="font-mono text-white text-[11px] block truncate" title={selectedBusiness.coordinates}>
                        {selectedBusiness.coordinates || "—"}
                      </strong>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                      <span className="text-[10px] text-emerald-400 block font-medium">Thời điểm chụp:</span>
                      <strong className="text-white text-[11px] block">
                        {selectedBusiness.photoTakenAt || "—"}
                      </strong>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                      <span className="text-[10px] text-emerald-400 block font-medium">Độ cao thực tế:</span>
                      <strong className="text-white text-[11px] block">
                        {selectedBusiness.photoElevation || "—"}
                      </strong>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                      <span className="text-[10px] text-emerald-400 block font-medium">Phương hướng la bàn:</span>
                      <strong className="text-white text-[11px] block">
                        {selectedBusiness.photoDirection || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* GIS & Dẫn đường Banner */}
              <div className="p-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Compass size={14} className="text-emerald-600" /> Tọa độ số
                    GIS &amp; Dẫn đường
                  </span>
                  <div className="font-mono text-xs text-slate-700">
                    Tọa độ:{" "}
                    <strong className="text-emerald-700 font-semibold">
                      {selectedBusiness.coordinates || "Chưa thiết lập"}
                    </strong>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirections(selectedBusiness)}
                    className="min-h-8 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Navigation size={13} />
                    <span>Dẫn đường GIS</span>
                  </button>
                  {selectedBusiness.coordinates && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedBusiness.coordinates)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      <span>Google Maps</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NGƯỜI ĐẠI DIỆN & LAO ĐỘNG */}
          {detailTab === "personnel" && (() => {
            const ownerName = (selectedBusiness.legalRepresentative || selectedBusiness.owner || "").trim().toLowerCase();
            const ownerCccd = selectedBusiness.legalRepCccd?.trim();
            const matchedOwner = (residents || []).find(
              (r) =>
                (ownerCccd && r.cccd && r.cccd.trim() === ownerCccd) ||
                (ownerName && r.fullName.trim().toLowerCase() === ownerName)
            );
            const managerName = (selectedBusiness.siteManager || "").trim().toLowerCase();
            const matchedManager = (residents || []).find(
              (r) => managerName && r.fullName.trim().toLowerCase() === managerName
            );

            return (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="p-1 bg-blue-50 text-blue-700 rounded-lg">
                      <UserCheck size={14} />
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Người đại diện &amp; Đầu mối Liên hệ
                    </h4>
                  </div>

                  <DetailGrid hideEmpty compact>
                    <DetailRow
                      label="Đại diện pháp luật"
                      value={
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          <span>
                            {selectedBusiness.legalRepresentative ||
                              selectedBusiness.owner}
                          </span>
                          {matchedOwner && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(getResidentDetailPath(matchedOwner.id))
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Xem hồ sơ cư dân KP3"
                            >
                              ✓ Hồ sơ cư dân KP3 ➜
                            </button>
                          )}
                        </span>
                      }
                      helperText={`SĐT: ${selectedBusiness.legalRepPhone || selectedBusiness.phone}${
                        selectedBusiness.legalRepCccd
                          ? ` • CCCD: ${selectedBusiness.legalRepCccd}`
                          : ""
                      }${
                        matchedOwner
                          ? ` • ${matchedOwner.status || "Thường trú"}`
                          : ""
                      }`}
                    />
                    <DetailRow
                      label="Quản lý tại chỗ"
                      value={
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          <span>
                            {selectedBusiness.siteManager ||
                              selectedBusiness.owner}
                          </span>
                          {matchedManager && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  getResidentDetailPath(matchedManager.id)
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Xem hồ sơ cư dân KP3"
                            >
                              ✓ Hồ sơ cư dân KP3 ➜
                            </button>
                          )}
                        </span>
                      }
                      helperText={`SĐT: ${selectedBusiness.siteManagerPhone || selectedBusiness.phone}${
                        matchedManager
                          ? ` • ${matchedManager.status || "Thường trú"}`
                          : ""
                      }`}
                    />

                  <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200/80 md:col-span-2 mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs mb-2">
                      <Phone size={13} className="text-blue-700" />
                      <span>Đầu mối phối hợp công vụ địa phương:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 font-medium">
                          Họ và tên:
                        </span>
                        <strong className="text-blue-950 font-bold">
                          {selectedBusiness.focalPointName ||
                            selectedBusiness.owner}
                        </strong>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 font-medium">
                          SĐT công vụ:
                        </span>
                        <strong className="font-mono text-blue-950 font-bold">
                          {selectedBusiness.focalPointPhone ||
                            selectedBusiness.phone}
                        </strong>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 font-medium">
                          Vai trò:
                        </span>
                        <strong className="text-blue-950 font-semibold">
                          {selectedBusiness.focalPointRole || "Chủ cơ sở"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </DetailGrid>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-purple-50 text-purple-700 rounded-lg">
                      <Users2 size={14} />
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Cơ cấu Lao động &amp; Nhân sự
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                    {selectedBusiness.employeeCount} lao động
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">
                      Thường trú KP3
                    </span>
                    <strong className="text-emerald-700 text-base font-extrabold block">
                      {selectedBusiness.localWorkersCount ??
                        Math.floor(selectedBusiness.employeeCount / 2)}
                    </strong>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">
                      Lao động tạm trú
                    </span>
                    <strong className="text-blue-700 text-base font-extrabold block">
                      {selectedBusiness.temporaryWorkersCount ??
                        Math.ceil(selectedBusiness.employeeCount / 2)}
                    </strong>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">
                      Người nước ngoài
                    </span>
                    <strong
                      className={`text-base font-extrabold block ${
                        (selectedBusiness.foreignWorkersCount ||
                          selectedBusiness.foreignWorkers?.length ||
                          0) > 0
                          ? "text-rose-700"
                          : "text-slate-400"
                      }`}
                    >
                      {selectedBusiness.foreignWorkersCount ||
                        selectedBusiness.foreignWorkers?.length ||
                        0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

          {/* TAB 4: BIẾN ĐỘNG & KIỂM TRA */}
          {detailTab === "history" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                      <History size={15} />
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Lịch sử Biến động Địa bàn &amp; Nhật ký Kiểm tra
                    </h4>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenAddChangeLog}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={11} /> Biến động
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddInspection}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={11} /> Biên bản KT
                    </button>
                  </div>
                </div>

                {/* A. LỊCH SỬ BIẾN ĐỘNG ĐỊA BÀN */}
                <div className="space-y-2 text-xs">
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                    A. Lịch sử biến động địa bàn (
                    {selectedBusiness.changeHistory?.length || 1} sự kiện):
                  </span>
                  <div className="space-y-1.5">
                    {(selectedBusiness.changeHistory &&
                    selectedBusiness.changeHistory.length > 0
                      ? selectedBusiness.changeHistory
                      : [
                          {
                            id: `CHG-${selectedBusiness.id}-INIT`,
                            date: selectedBusiness.startDate || "12/03/2021",
                            type: "Mở mới" as const,
                            description: `Ghi nhận cơ sở bắt đầu hoạt động kinh doanh tại địa chỉ ${selectedBusiness.address}`,
                            recordedBy: extractKeyLeadersSummary(getStoredAssociations())
                              .neighborhoodHead.formattedWithTitle,
                          },
                        ]
                    ).map((chg) => (
                      <div
                        key={chg.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {chg.type}
                          </span>
                          <span className="font-mono text-slate-500">
                            {chg.date}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-snug">
                          {chg.description}
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                          Ghi nhận: {chg.recordedBy}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* B. NHẬT KÝ KIỂM TRA ĐỊNH KỲ */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                    B. Nhật ký kiểm tra định kỳ (
                    {getBusinessInspections(selectedBusiness).length} đợt):
                  </span>

                  <div className="space-y-2">
                    {getBusinessInspections(selectedBusiness).length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2.5">
                        <p className="text-xs text-slate-600 font-medium">
                          Chưa có biên bản kiểm tra PCCC / ANTT nào được ghi nhận
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAddInspection}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>+ Lập biên bản kiểm tra mới</span>
                        </button>
                      </div>
                    ) : (
                      getBusinessInspections(selectedBusiness).map((inspect) => (
                        <div
                          key={inspect.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">
                              {inspect.inspector}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  inspect.result === "Đạt chuẩn"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : inspect.result === "Cảnh cáo"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {inspect.result}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 ml-1">
                                {inspect.date}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditInspection(inspect)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded ml-1 cursor-pointer"
                                title="Sửa biên bản"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectionToDelete(inspect)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Xóa biên bản"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-600 bg-slate-50 p-2 rounded text-xs">
                            {inspect.note}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Modal Ghi nhận Biến động */}
      {showAddChangeLogModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddChangeLogModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-slate-800 space-y-4 p-5 border border-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <History size={16} className="text-teal-600" />
                Ghi nhận Biến động Cơ sở Kinh doanh
              </h3>
              <button
                type="button"
                onClick={() => setShowAddChangeLogModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveChangeLog} className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Loại biến động *
                </label>
                <ReportSelect
                  aria-label="Loại biến động"
                  value={formChangeType}
                  onChange={(nextVal) => setFormChangeType(nextVal as any)}
                  options={[
                    { value: "Mở mới", label: "Mở mới hoạt động tại địa chỉ" },
                    {
                      value: "Chuyển địa điểm",
                      label: "Chuyển địa điểm kinh doanh",
                    },
                    {
                      value: "Thay đổi ngành nghề",
                      label: "Thay đổi ngành nghề kinh doanh",
                    },
                    {
                      value: "Thay đổi người đại diện",
                      label: "Thay đổi chủ cơ sở / đại diện",
                    },
                    { value: "Tạm ngừng", label: "Tạm ngừng hoạt động" },
                    { value: "Hoạt động trở lại", label: "Hoạt động trở lại" },
                    { value: "Khác", label: "Biến động khác" },
                  ]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ngày ghi nhận *
                </label>
                <input
                  type="date"
                  value={formChangeDate}
                  onChange={(e) => setFormChangeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nội dung chi tiết biến động *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formChangeDesc}
                  onChange={(e) => setFormChangeDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Người ghi nhận
                </label>
                <input
                  type="text"
                  value={formChangeRecordedBy}
                  onChange={(e) => setFormChangeRecordedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddChangeLogModal(false)}
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

      {/* Modal Thêm Biên bản Kiểm tra định kỳ */}
      {showAddInspectionModal && (
        <div
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddInspectionModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800"
          >
            <div className="bg-slate-50 p-4 sm:px-6 flex items-center justify-between text-slate-900 shrink-0 border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shrink-0">
                  <FileCheck size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Thêm Biên bản Kiểm tra định kỳ
                  </h3>
                  <p className="text-xs text-slate-600 truncate max-w-[280px] sm:max-w-xs">
                    Cơ sở: {selectedBusiness.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setShowAddInspectionModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveAddInspection}
              className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs"
            >
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
                  <ReportSelect
                    aria-label="Kết quả đánh giá"
                    value={formInspResult}
                    onChange={(nextVal) => setFormInspResult(nextVal as any)}
                    options={[
                      { value: "Đạt chuẩn", label: "Đạt chuẩn" },
                      { value: "Cảnh cáo", label: "Cảnh cáo" },
                      {
                        value: "Yêu cầu khắc phục",
                        label: "Yêu cầu khắc phục",
                      },
                      { value: "Không đạt", label: "Không đạt" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Đoàn / Đơn vị kiểm tra{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đoàn kiểm tra liên ngành Phường An Phú"
                  value={formInspInspector}
                  onChange={(e) => setFormInspInspector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">
                    Gợi ý nhanh:
                  </span>
                  {[
                    "Đoàn liên ngành Phường An Phú",
                    "Cảnh sát PCCC & CNCH",
                    "Trạm Y tế Phường An Phú",
                    "Tổ QL Đô thị & Môi trường KP3",
                    "Công an khu vực Phường",
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

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Nội dung kiểm tra &amp; Hiện trạng ghi nhận{" "}
                  <span className="text-rose-500">*</span>
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
      {showEditInspectionModal && editingInspection && (
        <div
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            setShowEditInspectionModal(false);
            setEditingInspection(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800"
          >
            <div className="bg-slate-50 p-4 sm:px-6 flex items-center justify-between text-slate-900 shrink-0 border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 shrink-0">
                  <Pencil size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Chỉnh sửa Biên bản Kiểm tra
                  </h3>
                  <p className="text-xs text-slate-600 truncate max-w-[280px] sm:max-w-xs">
                    Mã đợt: {editingInspection.id} • {selectedBusiness.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => {
                  setShowEditInspectionModal(false);
                  setEditingInspection(null);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveEditInspection}
              className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs"
            >
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
                  <ReportSelect
                    aria-label="Kết quả đánh giá"
                    value={formInspResult}
                    onChange={(nextVal) => setFormInspResult(nextVal as any)}
                    options={[
                      { value: "Đạt chuẩn", label: "Đạt chuẩn" },
                      { value: "Cảnh cáo", label: "Cảnh cáo" },
                      {
                        value: "Yêu cầu khắc phục",
                        label: "Yêu cầu khắc phục",
                      },
                      { value: "Không đạt", label: "Không đạt" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Đoàn / Đơn vị kiểm tra{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formInspInspector}
                  onChange={(e) => setFormInspInspector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Nội dung kiểm tra &amp; Hiện trạng ghi nhận{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formInspNote}
                  onChange={(e) => setFormInspNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-500" />
                  Yêu cầu / Biện pháp khắc phục (nếu có)
                </label>
                <input
                  type="text"
                  value={formInspRecommendation}
                  onChange={(e) => setFormInspRecommendation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-rose-500" />
                  Hình thức xử lý / Mức phạt (nếu có)
                </label>
                <input
                  type="text"
                  value={formInspPenalties}
                  onChange={(e) => setFormInspPenalties(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditInspectionModal(false);
                    setEditingInspection(null);
                  }}
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
        <div className="fixed inset-0 bg-slate-900/65 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Xóa biên bản kiểm tra?
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Ngày: {inspectionToDelete.date}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="font-semibold text-slate-800">
                {inspectionToDelete.inspector}
              </div>
              <div className="text-[11px] text-slate-600 line-clamp-2">
                {inspectionToDelete.note}
              </div>
              <div className="text-[10px] font-extrabold text-rose-700">
                Kết quả: {inspectionToDelete.result}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Biên bản kiểm tra định kỳ này sẽ bị xóa khỏi hồ sơ của cơ sở kinh
              doanh. Bạn có chắc chắn muốn xóa không?
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

      {/* DOCUMENT PREVIEW MODAL (SỔ ĐỎ PDF / ẢNH) */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-950 text-white p-4 sm:px-6 flex flex-wrap justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    viewingDoc.file.type === "pdf"
                      ? "bg-rose-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {viewingDoc.file.type === "pdf" ? (
                    <FileText size={20} />
                  ) : (
                    <ImageIcon size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 truncate">
                    {viewingDoc.title}
                    <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-300">
                      {viewingDoc.file.type}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 truncate">
                    Cơ sở: <strong>{viewingDoc.businessName}</strong> • Chủ hộ:{" "}
                    <strong>{viewingDoc.business.owner}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDoc.file)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download size={13} /> Tải tệp về
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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

            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Tờ BĐ:{" "}
                  <strong className="font-mono text-indigo-700">
                    {viewingDoc.business.toBanDo || "272"}
                  </strong>
                </span>
                <span>
                  Thửa đất:{" "}
                  <strong className="font-mono text-indigo-700">
                    {viewingDoc.business.soThua || "55"}
                  </strong>
                </span>
                <span>
                  Diện tích:{" "}
                  <strong>
                    {viewingDoc.business.dienTich
                      ? `${viewingDoc.business.dienTich} m²`
                      : "150 m²"}
                  </strong>
                </span>
                <span>
                  Loại đất:{" "}
                  <strong className="text-emerald-700">
                    {viewingDoc.business.loaiDat || "ODT"}
                  </strong>
                </span>
                <span>
                  Số GCN:{" "}
                  <strong className="font-mono text-rose-700">
                    {viewingDoc.business.soGcn || "CH-098234"}
                  </strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Tệp: {viewingDoc.file.name} ({viewingDoc.file.size || "520 KB"})
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50">
              {viewingDoc.file.type === "image" ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 max-w-full">
                    <img
                      src={viewingDoc.file.url}
                      alt={viewingDoc.file.name}
                      className="max-h-[540px] w-auto object-contain rounded-lg mx-auto"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Bản chụp Giấy chứng nhận quyền sử dụng đất &amp; Sổ đỏ
                  </span>
                </div>
              ) : (viewingDoc.file.url.startsWith("data:application/pdf") ||
                /^https?:\/\//i.test(viewingDoc.file.url)) ? (
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                  <iframe
                    src={viewingDoc.file.url}
                    title={viewingDoc.file.name}
                    className="w-full h-[540px]"
                  />
                </div>
              ) : (
                <div className="bg-[#fffdf9] p-4 sm:p-8 rounded-2xl shadow-md border-2 border-amber-600/40 max-w-2xl mx-auto space-y-5 sm:space-y-6 text-slate-800">
                  <div className="text-center space-y-1 border-b border-amber-200/80 pb-4">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="font-bold text-xs text-slate-700 underline decoration-1 underline-offset-4">
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-rose-800 pt-2 tracking-tight uppercase">
                      GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT
                    </h2>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Số phát hành:{" "}
                      <strong className="text-rose-700">
                        {viewingDoc.business.soGcn || "Chưa cập nhật"}
                      </strong>{" "}
                      • Số vào sổ:{" "}
                      {viewingDoc.business.soVaoSo || "Chưa cập nhật"}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p>
                      Ông/Bà:{" "}
                      <strong className="text-slate-900">
                        {viewingDoc.business.tenChuSuDung ||
                          viewingDoc.business.owner}
                      </strong>
                    </p>
                    <p>
                      Địa chỉ thửa đất:{" "}
                      <strong>{viewingDoc.business.address}</strong>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-1">
                      <p>
                        Thửa đất số:{" "}
                        <strong className="font-mono text-slate-900">
                          {viewingDoc.business.soThua || "—"}
                        </strong>
                      </p>
                      <p>
                        Tờ bản đồ số:{" "}
                        <strong className="font-mono text-slate-900">
                          {viewingDoc.business.toBanDo || "—"}
                        </strong>
                      </p>
                      <p>
                        Diện tích:{" "}
                        <strong className="text-slate-900">
                          {viewingDoc.business.dienTich
                            ? `${viewingDoc.business.dienTich} m²`
                            : "—"}
                        </strong>
                      </p>
                      <p>
                        Mục đích SDĐ:{" "}
                        <strong className="text-emerald-800">
                          {viewingDoc.business.loaiDat || "ODT"}
                        </strong>
                      </p>
                    </div>
                  </div>
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
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingImagePreview.url}
              alt={viewingImagePreview.caption}
              className="max-h-[80vh] w-auto rounded-xl shadow-2xl object-contain border border-white/10"
            />
            <div className="mt-3 flex items-center justify-between w-full px-2 text-white">
              <span className="text-xs font-bold">
                {viewingImagePreview.caption}
              </span>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDeleteBusiness}
        title="Xác nhận xóa hộ kinh doanh"
        description={`Bạn có chắc chắn muốn xóa hộ kinh doanh "${selectedBusiness.name}" (${selectedBusiness.licenseNumber}) thuộc đại diện ${selectedBusiness.owner} ra khỏi danh sách quản lý địa phương không?`}
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
    </RecordDetailShell>
  );
}

