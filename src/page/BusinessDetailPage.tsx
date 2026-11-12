import React, { useMemo, useState } from "react";
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
import { formatShortRecordId } from "../utils/kp3Utils";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { ReportSelect } from "../components/reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  getBusinessDetailPath,
  getBusinessEditPath,
  getHouseholdDetailPath,
  navigate,
} from "../routes";

export type BusinessDetailTab = "general" | "premises" | "personnel" | "history";

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

const DEFAULT_SAMPLE_INSPECTIONS: InspectionLog[] = [
  {
    id: "INSP-01",
    date: "05/06/2026",
    result: "Đạt chuẩn",
    inspector: "Đoàn liên ngành Phường An Phú",
    note: "Kiểm tra vệ sinh an toàn thực phẩm và điều kiện hoạt động. Cơ sở sạch sẽ, trang bị đủ bình chữa cháy CO2 và bột.",
    recommendation:
      "Tiếp tục duy trì vệ sinh định kỳ và lưu trữ hóa đơn nguyên liệu.",
  },
  {
    id: "INSP-02",
    date: "15/04/2026",
    result: "Cảnh cáo",
    inspector: "Cảnh sát Phòng cháy Chữa cháy & CNCH",
    note: "Bình chữa cháy MFZ4 áp kế kim chỉ vạch đỏ hết hạn nạp. Lối thoát nạn phụ có để vật cản hàng hóa.",
    recommendation:
      "Yêu cầu nạp sạc lại bình chữa cháy và giải phóng hành lang thoát hiểm trong 7 ngày.",
    penalties: "Lập biên bản nhắc nhở, cảnh cáo lần 1",
  },
  {
    id: "INSP-03",
    date: "10/02/2026",
    result: "Đạt chuẩn",
    inspector: "Công an khu vực Phường An Phú",
    note: "Kiểm tra tạm trú cho nhân viên và khách lưu trú. Đầy đủ sổ sách và khai báo định danh VNeID theo quy định.",
  },
];

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
    if (!b) return [];
    if (b.inspections && Array.isArray(b.inspections)) {
      return b.inspections;
    }
    return DEFAULT_SAMPLE_INSPECTIONS.map((item, index) => ({
      ...item,
      id: `INSP-${b.id}-${index + 1}`,
    }));
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
    reader.onload = () => {
      onSuccess({
        name: file.name,
        url: reader.result as string,
        type: isPdf ? "pdf" : "image",
        size: formattedSize,
        uploadDate: new Date().toLocaleDateString("vi-VN"),
      });
      showToast(`Đã nhận tệp: ${file.name} (${formattedSize})`, "success");
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
    reader.onload = () => {
      const newImg = reader.result as string;
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
      return {
        STT: i + 1,
        "Họ và tên": r.fullName,
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

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      {/* Top Breadcrumb & Prev/Next Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Quay lại Danh sách Cơ sở Kinh doanh</span>
        </button>

        {totalNav > 1 && currentIdx >= 0 && (
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => hasPrev && handleSelectNav(businesses[currentIdx - 1])}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Cơ sở trước"
              title="Cơ sở trước"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-mono font-semibold text-slate-600 px-1.5">
              Cơ sở {currentIdx + 1}/{totalNav}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => hasNext && handleSelectNav(businesses[currentIdx + 1])}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Cơ sở tiếp theo"
              title="Cơ sở tiếp theo"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Header Summary */}
        <div className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 min-w-0">
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
                  <Camera size={15} className="text-white mb-0.5" />
                  <span className="text-[11px] font-semibold">Đổi ảnh</span>
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
                          showToast(
                            "Đã cập nhật ảnh đại diện cơ sở thành công!",
                            "success"
                          );
                        });
                      }
                    }}
                  />
                </label>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                    MÃ: {shortBizId}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                    <span>{sectorMeta.icon}</span>
                    <span>{sectorMeta.shortName}</span>
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
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
                </div>

                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                  {selectedBusiness.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin size={13} className="text-emerald-700 shrink-0" />
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
                    className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    <Maximize2 size={11} /> Xem ảnh lớn
                  </button>

                  {selectedBusiness.coordinates && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedBusiness.coordinates)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      <ExternalLink size={11} /> Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
              <div className="min-w-[180px]">
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
                onClick={() => window.print()}
                className="min-h-9 text-xs font-semibold py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Printer size={13} /> In phiếu
              </button>
              <button
                type="button"
                onClick={() =>
                  onEdit
                    ? onEdit(selectedBusiness)
                    : navigate(getBusinessEditPath(selectedBusiness.id))
                }
                className="min-h-9 text-xs font-semibold py-1.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Pencil size={13} /> Sửa hồ sơ
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="min-h-9 text-xs font-semibold py-1.5 px-3 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-5 gap-5 text-xs font-bold overflow-x-auto print:hidden">
          <button
            type="button"
            onClick={() => setDetailTab("general")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              detailTab === "general"
                ? "text-emerald-800"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store size={14} />
            <span>Thông tin chung &amp; Pháp lý</span>
            {detailTab === "general" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("premises")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              detailTab === "premises"
                ? "text-emerald-800"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={14} />
            <span>Mặt bằng &amp; Cư dân Lưu trú</span>
            {detailTab === "premises" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("personnel")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              detailTab === "personnel"
                ? "text-emerald-800"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users2 size={14} />
            <span>Người đại diện &amp; Lao động</span>
            {detailTab === "personnel" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("history")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              detailTab === "history"
                ? "text-emerald-800"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History size={14} />
            <span>Biến động &amp; Kiểm tra</span>
            {detailTab === "history" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 bg-white text-xs sm:text-sm">
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
                  value={selectedBusiness.startDate || "10/01/2021"}
                  isMono
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
                  value={
                    selectedBusiness.soDoFile ? (
                      <span className="text-blue-700 font-bold inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        <FileText size={12} /> Đã nộp bản sao chứng thực
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">
                        Chưa nộp hồ sơ sổ đỏ
                      </span>
                    )
                  }
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

              {/* KHỐI LIÊN KẾT HỘ DÂN KP3 */}
              {(() => {
                const linkedHh = getLinkedHousehold(selectedBusiness);
                return (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                        <Home size={14} className="text-emerald-700" />
                        <span>Liên kết Dữ liệu Hộ Dân KP3</span>
                      </div>
                      {linkedHh ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950">
                            MÃ HỘ: {linkedHh.code}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(getHouseholdDetailPath(linkedHh.id))
                            }
                            className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                          >
                            Xem sổ hộ khẩu ➜
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">
                          Chưa đối khớp mã hộ
                        </span>
                      )}
                    </div>

                    {linkedHh ? (
                      <div className="space-y-1.5 text-[11px] text-slate-700 bg-white/90 p-2.5 rounded-lg border border-emerald-100">
                        <div className="flex justify-between items-center">
                          <span>
                            Chủ hộ quản lý:{" "}
                            <strong className="text-slate-900">
                              {linkedHh.ownerName}
                            </strong>
                          </span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {linkedHh.type || "Thường trú"} •{" "}
                            {linkedHh.memberCount} nhân khẩu
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Địa chỉ hộ: <strong>{linkedHh.address}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-emerald-100">
                        Cơ sở tọa lạc tại địa chỉ đăng ký độc lập hoặc đang liên
                        kết hồ sơ quản lý hành chính địa bàn.
                      </div>
                    )}
                  </div>
                );
              })()}

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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-2">
                          <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <span>Danh sách Người Lưu trú Thực tế</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-200 text-amber-900 font-bold">
                              {stayingResidents.length} người
                            </span>
                          </h4>

                          {stayingResidents.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleExportHostelResidents(
                                  selectedBusiness,
                                  stayingResidents
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <Download size={13} /> Xuất DS Excel (
                              {stayingResidents.length})
                            </button>
                          )}
                        </div>

                        {stayingResidents.length > 0 ? (
                          <div className="overflow-x-auto max-h-60 overflow-y-auto border border-amber-100 rounded-lg">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-amber-50 text-amber-950 font-bold sticky top-0 z-10 border-b border-amber-200 text-[11px]">
                                <tr>
                                  <th className="py-2 px-2.5">STT</th>
                                  <th className="py-2 px-2.5">Họ và tên</th>
                                  <th className="py-2 px-2.5">CCCD</th>
                                  <th className="py-2 px-2.5">SĐT</th>
                                  <th className="py-2 px-2.5">Quê quán</th>
                                  <th className="py-2 px-2.5">
                                    Thời hạn tạm trú
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {stayingResidents.map((res, idx) => {
                                  const expStatus =
                                    getTemporaryResidenceExpiryStatus(
                                      res.temporaryExpDate
                                    );
                                  return (
                                    <tr
                                      key={res.id}
                                      className="hover:bg-amber-50/40 transition-colors"
                                    >
                                      <td className="py-2 px-2.5 font-mono text-slate-400 text-[10px]">
                                        {idx + 1}
                                      </td>
                                      <td className="py-2 px-2.5">
                                        <div className="font-bold text-slate-900 text-xs">
                                          {res.fullName}
                                        </div>
                                      </td>
                                      <td className="py-2 px-2.5 font-mono text-slate-800 text-[11px]">
                                        {res.cccd}
                                      </td>
                                      <td className="py-2 px-2.5 font-mono text-slate-600 text-[11px]">
                                        {res.phone || "—"}
                                      </td>
                                      <td className="py-2 px-2.5 text-slate-600 truncate max-w-[160px]">
                                        {res.permanentAddress ||
                                          res.hometown ||
                                          "—"}
                                      </td>
                                      <td className="py-2 px-2.5">
                                        <span className="text-[10px] font-mono text-slate-600">
                                          {expStatus.formattedDate || "Còn hạn"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg">
                            Chưa phát hiện cư dân có địa chỉ đăng ký trùng khớp
                            trong dữ liệu tạm trú
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* THÔNG TIN ĐỊA CHÍNH & SỔ ĐỎ */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                    <FileSpreadsheet size={13} className="text-indigo-600" />
                    Địa chính &amp; Giấy chứng nhận QSDĐ (Sổ đỏ)
                  </span>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                    GCN: {selectedBusiness.soGcn || "CH-098234"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Tờ bản đồ:
                    </span>
                    <strong className="text-slate-800 font-mono">
                      Tờ {selectedBusiness.toBanDo || "272"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Thửa đất:
                    </span>
                    <strong className="text-slate-800 font-mono">
                      Thửa {selectedBusiness.soThua || "55"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Diện tích:
                    </span>
                    <strong className="text-slate-800">
                      {selectedBusiness.dienTich
                        ? `${selectedBusiness.dienTich} m²`
                        : "150 m²"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Loại đất:
                    </span>
                    <strong className="text-slate-800">
                      {selectedBusiness.loaiDat || "ODT (Đất ở đô thị)"}
                    </strong>
                  </div>
                </div>

                {selectedBusiness.soDoFile && (
                  <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
                      <FileText size={12} className="text-rose-600" />
                      Tệp đính kèm:{" "}
                      <strong>{selectedBusiness.soDoFile.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          title: "Giấy chứng nhận Quyền sử dụng đất (Sổ đỏ)",
                          businessName: selectedBusiness.name,
                          file: selectedBusiness.soDoFile!,
                          business: selectedBusiness,
                        })
                      }
                      className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer"
                    >
                      Xem Sổ đỏ
                    </button>
                  </div>
                )}
              </div>

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
          {detailTab === "personnel" && (
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
                      selectedBusiness.legalRepresentative ||
                      selectedBusiness.owner
                    }
                    helperText={`SĐT: ${selectedBusiness.legalRepPhone || selectedBusiness.phone}${
                      selectedBusiness.legalRepCccd
                        ? ` • CCCD: ${selectedBusiness.legalRepCccd}`
                        : ""
                    }`}
                  />
                  <DetailRow
                    label="Quản lý tại chỗ"
                    value={
                      selectedBusiness.siteManager || selectedBusiness.owner
                    }
                    helperText={`SĐT: ${selectedBusiness.siteManagerPhone || selectedBusiness.phone}`}
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
          )}

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
                            recordedBy: "Bà Lê Thị Mai (Trưởng KP3)",
                          },
                        ]
                    ).map((chg) => (
                      <div
                        key={chg.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
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
                      <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                        Chưa có biên bản kiểm tra định kỳ nào.
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
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
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
        </div>
      </div>

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
            <div className="bg-slate-950 text-white p-4 px-6 flex justify-between items-center shrink-0">
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

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
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
              ) : viewingDoc.file.url.startsWith("data:application/pdf") ? (
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                  <iframe
                    src={viewingDoc.file.url}
                    title={viewingDoc.file.name}
                    className="w-full h-[540px]"
                  />
                </div>
              ) : (
                <div className="bg-[#fffdf9] p-8 md:p-10 rounded-2xl shadow-md border-2 border-amber-600/40 max-w-2xl mx-auto space-y-6 text-slate-800 font-serif">
                  <div className="text-center space-y-1 font-sans border-b border-amber-200/80 pb-4">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="font-bold text-xs text-slate-700 underline decoration-1 underline-offset-4">
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <h2 className="text-lg font-black text-rose-800 pt-2 tracking-tight font-serif uppercase">
                      GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT
                    </h2>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Số phát hành:{" "}
                      <strong className="text-rose-700">
                        {viewingDoc.business.soGcn || "CH-098234"}
                      </strong>{" "}
                      • Số vào sổ:{" "}
                      {viewingDoc.business.soVaoSo || "CS-2023-112"}
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
    </div>
  );
}

