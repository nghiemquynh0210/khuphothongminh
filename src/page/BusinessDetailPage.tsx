import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  History,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  UserCheck,
  Users2,
  X
} from "lucide-react";
import {
  Business,
  BusinessChangeLog,
  BusinessFile,
  Household,
  InspectionLog,
  Resident,
  TargetGisItem
} from "../types";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import BusinessGisPinModal from "../components/business/BusinessGisPinModal";
import BusinessSodoModal, {
  ViewingBusinessDoc
} from "../components/business/BusinessSodoModal";
import {
  ROUTES,
  getBusinessEditPath,
  getHouseholdDetailPath,
  getResidentDetailPath,
  navigate
} from "../routes";
import {
  getGoogleMapsDirectionUrl,
  parseCoordinates as parseGisCoords
} from "../utils/gisUtils";
import { getTemporaryResidenceExpiryStatus } from "../utils/householdRecognitionUtils";
import {
  buildGisTargetForBusiness,
  downloadBusinessFile,
  exportHostelResidentsToExcel,
  findBusinessByIdOrCode,
  getBusinessImage,
  getBusinessIndustryGroup,
  getBusinessInspections,
  getLinkedForeignResidentsForBusiness,
  getLinkedHouseholdForBusiness,
  getSectorMeta,
  getStayingResidentsInBusiness,
  isAccommodationBusiness,
  processBusinessFileUpload
} from "../utils/businessFormUtils";

export interface BusinessDetailPageProps {
  businessId: string;
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  isDataLoading?: boolean;
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
  onUpdateBusinesses?: React.Dispatch<React.SetStateAction<Business[]>> | ((businesses: Business[]) => void);
  onNavigateToGis?: (item: TargetGisItem) => void;
  onShowToast?: (message: string) => void;
}

type BusinessDetailTab = "general" | "premises" | "personnel" | "history";

export default function BusinessDetailPage({
  businessId,
  businesses,
  residents = [],
  households = [],
  isDataLoading = false,
  onToggleCertification,
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis,
  onShowToast
}: BusinessDetailPageProps) {
  const business = useMemo(
    () => findBusinessByIdOrCode(businesses, businessId),
    [businesses, businessId]
  );

  const [detailTab, setDetailTab] = useState<BusinessDetailTab>("general");
  const [viewingImagePreview, setViewingImagePreview] = useState<{
    url: string;
    caption: string;
  } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ViewingBusinessDoc | null>(null);
  const [gisPinTarget, setGisPinTarget] = useState<Business | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragActiveSoDo, setDragActiveSoDo] = useState(false);

  // Change Log modal states
  const [showChangeLogModal, setShowChangeLogModal] = useState(false);
  const [changeDate, setChangeDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [changeType, setChangeType] =
    useState<BusinessChangeLog["type"]>("Thay đổi ngành nghề");
  const [changeDesc, setChangeDesc] = useState("");
  const [changeRecorder, setChangeRecorder] = useState(
    "Bí thư Chi bộ / Trưởng KP3"
  );
  const [changeLogError, setChangeLogError] = useState<string | null>(null);

  // Inspection CRUD states
  const [showInspectionModal, setShowInspectionModal] = useState<
    "add" | "edit" | null
  >(null);
  const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
  const [inspDate, setInspDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [inspResult, setInspResult] =
    useState<InspectionLog["result"]>("Đạt chuẩn");
  const [inspInspector, setInspInspector] = useState(
    "Công an khu vực & Tổ kiểm tra liên ngành KP3"
  );
  const [inspNote, setInspNote] = useState("");
  const [inspRecommendation, setInspRecommendation] = useState("");
  const [inspError, setInspError] = useState<string | null>(null);
  const [inspectionToDelete, setInspectionToDelete] =
    useState<InspectionLog | null>(null);

  useEffect(() => {
    if (!viewingImagePreview) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewingImagePreview(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewingImagePreview]);

  const applyBusinessUpdate = (updater: (curr: Business) => Business) => {
    if (!business || !onUpdateBusinesses) return null;
    const updated = updater(business);
    onUpdateBusinesses(businesses.map(b => (b.id === business.id ? updated : b)));
    return updated;
  };

  if (!business && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-bold text-slate-800">
          Đang tải hồ sơ cơ sở kinh doanh từ cơ sở dữ liệu...
        </p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Store size={28} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900">
            Không tìm thấy hồ sơ cơ sở kinh doanh
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Cơ sở mã <span className="font-mono font-bold">{businessId}</span> không tồn tại hoặc đã bị xóa khỏi danh mục Khu phố 3.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD_BUSINESSES)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Danh sách Cơ sở Kinh doanh</span>
        </button>
      </div>
    );
  }

  const sectorGroup = getBusinessIndustryGroup(business);
  const sectorMeta = getSectorMeta(sectorGroup);
  const isAccom = isAccommodationBusiness(business);
  const linkedHousehold = getLinkedHouseholdForBusiness(business, households);
  const linkedForeignResidents = getLinkedForeignResidentsForBusiness(
    business,
    residents
  );
  const stayingResidents = isAccom
    ? getStayingResidentsInBusiness(business, residents)
    : [];
  const actualStayingCount =
    stayingResidents.length > 0
      ? stayingResidents.length
      : business.soNguoiLuuTru || 0;
  const inspections = getBusinessInspections(business);
  const coverImage = getBusinessImage(business);
  const parsedCoord = business.coordinates
    ? parseGisCoords(business.coordinates)
    : null;

  const handleSavePinCoordinates = (
    targetBusiness: Business,
    coordinates: string,
    andNavigate: boolean
  ) => {
    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map(b =>
          b.id === targetBusiness.id ? { ...b, coordinates } : b
        )
      );
    }
    setGisPinTarget(null);
    onShowToast?.(
      `Đã lưu tọa độ GIS (${coordinates}) cho ${targetBusiness.name}.`
    );

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: targetBusiness.id,
        type: "business",
        name: targetBusiness.name,
        address: targetBusiness.address,
        coordinates,
        navigateRoute: true
      });
    }
  };

  const handleDirections = () => {
    const { target, resolvedCoordinates, wasAutoGenerated } =
      buildGisTargetForBusiness(business);
    if (wasAutoGenerated && onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map(b =>
          b.id === business.id
            ? { ...b, coordinates: resolvedCoordinates }
            : b
        )
      );
    }
    if (onNavigateToGis) {
      onNavigateToGis(target);
      return;
    }
    const parsedTarget = parseGisCoords(resolvedCoordinates);
    if (parsedTarget) {
      window.open(
        getGoogleMapsDirectionUrl(parsedTarget.lat, parsedTarget.lng, business.address),
        "_blank"
      );
      return;
    }
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`,
      "_blank"
    );
  };

  const handleReplaceSoDo = (targetBusiness: Business, fileObj: BusinessFile) => {
    if (!onUpdateBusinesses) return;
    const updatedBusiness: Business = { ...targetBusiness, soDoFile: fileObj };
    onUpdateBusinesses(
      businesses.map(b => (b.id === targetBusiness.id ? updatedBusiness : b))
    );
    setViewingDoc(prev =>
      prev
        ? { ...prev, file: fileObj, business: updatedBusiness }
        : null
    );
    onShowToast?.(`Đã cập nhật tệp Sổ đỏ "${fileObj.name}" thành công.`);
  };

  const handleUploadAvatarPhoto = (file: File) => {
    processBusinessFileUpload(
      file,
      fileObj => {
        if (fileObj.type !== "image") {
          onShowToast?.("Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP).");
          return;
        }
        applyBusinessUpdate(curr => ({
          ...curr,
          image: fileObj.url,
          images: [fileObj.url, ...(curr.images || []).filter(u => u !== fileObj.url)]
        }));
        onShowToast?.(`Đã cập nhật ảnh đại diện cho ${business.name}.`);
      },
      msg => onShowToast?.(msg)
    );
  };

  const handleAddGalleryPhoto = (file: File) => {
    processBusinessFileUpload(
      file,
      fileObj => {
        if (fileObj.type !== "image") {
          onShowToast?.("Vui lòng chọn tệp hình ảnh hợp lệ.");
          return;
        }
        applyBusinessUpdate(curr => ({
          ...curr,
          image: curr.image || fileObj.url,
          images: [...(curr.images || []), fileObj.url]
        }));
        onShowToast?.("Đã bổ sung ảnh thực tế vào hồ sơ cơ sở.");
      },
      msg => onShowToast?.(msg)
    );
  };

  const handleExportResidents = () => {
    const res = exportHostelResidentsToExcel(business, stayingResidents);
    onShowToast?.(res.message);
  };

  const handleOpenAddChangeLog = () => {
    setChangeDate(new Date().toISOString().split("T")[0]);
    setChangeType("Thay đổi ngành nghề");
    setChangeDesc("");
    setChangeRecorder("Bí thư Chi bộ / Trưởng KP3");
    setChangeLogError(null);
    setShowChangeLogModal(true);
  };

  const handleCreateChangeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeDesc.trim()) {
      setChangeLogError("Vui lòng nhập nội dung biến động cần ghi nhận.");
      return;
    }

    const displayDate = changeDate.includes("-")
      ? changeDate.split("-").reverse().join("/")
      : changeDate;

    const entry: BusinessChangeLog = {
      id: `CHG-${Date.now()}`,
      date: displayDate,
      type: changeType,
      description: changeDesc.trim(),
      recordedBy: changeRecorder.trim() || "Cán bộ KP3"
    };

    applyBusinessUpdate(curr => ({
      ...curr,
      changeHistory: [entry, ...(curr.changeHistory || [])]
    }));

    setShowChangeLogModal(false);
    setChangeLogError(null);
    onShowToast?.(`Đã ghi nhận biến động "${entry.type}" vào hồ sơ.`);
  };

  const handleOpenAddInspection = () => {
    setEditingInspectionId(null);
    setInspDate(new Date().toISOString().split("T")[0]);
    setInspResult("Đạt chuẩn");
    setInspInspector("Công an khu vực & Tổ kiểm tra liên ngành KP3");
    setInspNote("");
    setInspRecommendation("");
    setInspError(null);
    setShowInspectionModal("add");
  };

  const handleOpenEditInspection = (log: InspectionLog) => {
    const isoDate = log.date.includes("/")
      ? log.date.split("/").reverse().join("-")
      : log.date;
    setEditingInspectionId(log.id);
    setInspDate(isoDate);
    setInspResult(log.result);
    setInspInspector(log.inspector);
    setInspNote(log.note);
    setInspRecommendation(log.recommendation || "");
    setInspError(null);
    setShowInspectionModal("edit");
  };

  const handleSubmitInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspInspector.trim()) {
      setInspError("Vui lòng nhập tên đơn vị hoặc cán bộ kiểm tra.");
      return;
    }
    if (!inspNote.trim()) {
      setInspError("Vui lòng nhập kết quả, ghi nhận kiểm tra tại hiện trường.");
      return;
    }

    const displayDate = inspDate.includes("-")
      ? inspDate.split("-").reverse().join("/")
      : inspDate;

    if (showInspectionModal === "edit" && editingInspectionId) {
      applyBusinessUpdate(curr => ({
        ...curr,
        inspections: getBusinessInspections(curr).map(item =>
          item.id === editingInspectionId
            ? {
                ...item,
                date: displayDate,
                result: inspResult,
                inspector: inspInspector.trim(),
                note: inspNote.trim(),
                recommendation: inspRecommendation.trim() || undefined
              }
            : item
        )
      }));
      onShowToast?.("Đã cập nhật biên bản kiểm tra PCCC / ANTT.");
    } else {
      const newLog: InspectionLog = {
        id: `INSP-${Date.now()}`,
        date: displayDate,
        result: inspResult,
        inspector: inspInspector.trim(),
        note: inspNote.trim(),
        recommendation: inspRecommendation.trim() || undefined
      };
      applyBusinessUpdate(curr => ({
        ...curr,
        safetyCertified: inspResult === "Đạt chuẩn" ? true : curr.safetyCertified,
        inspections: [newLog, ...getBusinessInspections(curr)]
      }));
      onShowToast?.("Đã thêm đợt kiểm tra PCCC / ANTT mới vào hồ sơ.");
    }

    setShowInspectionModal(null);
    setEditingInspectionId(null);
    setInspError(null);
  };

  const handleConfirmDeleteInspection = () => {
    if (!inspectionToDelete) return;
    applyBusinessUpdate(curr => ({
      ...curr,
      inspections: getBusinessInspections(curr).filter(
        item => item.id !== inspectionToDelete.id
      )
    }));
    setInspectionToDelete(null);
    onShowToast?.("Đã xóa biên bản kiểm tra khỏi lịch sử.");
  };

  const handleConfirmDeleteBusiness = () => {
    if (!onUpdateBusinesses) return;
    onUpdateBusinesses(businesses.filter(b => b.id !== business.id));
    setShowDeleteConfirm(false);
    onShowToast?.(`Đã xóa cơ sở "${business.name}" khỏi hệ thống.`);
    navigate(ROUTES.DASHBOARD_BUSINESSES);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 text-slate-800">
      {/* Top Action Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD_BUSINESSES)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Danh sách</span>
          </button>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-xs font-semibold text-slate-500 truncate hidden sm:inline">
            Hồ sơ Cơ sở: <strong className="text-slate-900">{business.name}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Cập nhật trạng thái cơ sở"
            value={business.status}
            onChange={e => {
              const nextStatus = e.target.value as Business["status"];
              onUpdateStatus(business.id, nextStatus);
              onShowToast?.(`Đã chuyển trạng thái cơ sở thành "${nextStatus}".`);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="Đang hoạt động">Đang hoạt động</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Tạm ngưng">Tạm ngưng</option>
            <option value="Chuyển địa điểm">Chuyển địa điểm</option>
            <option value="Chưa xác minh">Chưa xác minh</option>
          </select>

          <button
            type="button"
            onClick={() => {
              onToggleCertification(business.id);
              onShowToast?.(
                business.safetyCertified
                  ? "Đã hủy xác nhận đạt chuẩn PCCC / ANTT."
                  : "Đã xác nhận cơ sở đạt chuẩn PCCC / ANTT."
              );
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              business.safetyCertified
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            {business.safetyCertified ? (
              <ShieldCheck size={14} />
            ) : (
              <ShieldAlert size={14} />
            )}
            <span>{business.safetyCertified ? "Đạt PCCC" : "Xác nhận PCCC"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(getBusinessEditPath(business.id))}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Pencil size={13} />
            <span>Sửa hồ sơ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* Hero Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-indigo-800/40">
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-800 shrink-0 shadow-md">
              <img
                src={coverImage}
                alt={business.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setViewingImagePreview({
                      url: coverImage,
                      caption: `${business.name} — ${business.address}`
                    })
                  }
                  className="text-[10px] font-bold bg-white/90 text-slate-900 px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={11} /> Xem lớn
                </button>
                <label className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer">
                  <Camera size={11} /> Đổi ảnh
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) handleUploadAvatarPhoto(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${sectorMeta.badgeClass}`}
                >
                  <span>{sectorMeta.icon}</span>
                  <span>{sectorMeta.shortName}</span>
                </span>
                {isAccom && (
                  <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1">
                    <Building size={11} />
                    <span>
                      Nhà trọ / Lưu trú ({business.soPhong || 0} phòng)
                    </span>
                  </span>
                )}
                <span className="text-[10.5px] font-mono bg-white/10 text-indigo-200 px-2 py-0.5 rounded border border-white/15">
                  GP: {business.licenseNumber || "Chưa cập nhật"}
                </span>
                <span
                  className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                    business.status === "Đang hoạt động"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : business.status === "Tạm ngưng"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  }`}
                >
                  {business.status}
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-white leading-snug">
                {business.name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-emerald-400 shrink-0" />
                  <span>{business.address}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-indigo-300 shrink-0" />
                  <strong className="text-white">{business.owner}</strong>
                  <span className="font-mono text-indigo-200">
                    ({business.phone || "Chưa có SĐT"})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setGisPinTarget(business)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Compass size={14} className="text-indigo-300" />
              <span>{parsedCoord ? "Sửa Tọa độ GIS" : "Ghim Tọa độ GIS"}</span>
            </button>
            <button
              type="button"
              onClick={handleDirections}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Navigation size={14} />
              <span>Dẫn đường GIS</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>In hồ sơ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div
          role="tablist"
          aria-label="Phân mục hồ sơ cơ sở kinh doanh"
          className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-3 pt-2.5 gap-1.5"
        >
          {[
            {
              id: "general" as const,
              label: isAccom
                ? `Hồ sơ & Lưu trú (${actualStayingCount})`
                : "Hồ sơ & Liên hệ",
              icon: <Store size={14} />
            },
            {
              id: "premises" as const,
              label: "Mặt bằng & Sổ đỏ",
              icon: <MapPin size={14} />
            },
            {
              id: "personnel" as const,
              label: `Nhân lực (${business.employeeCount || 0})`,
              icon: <Users2 size={14} />
            },
            {
              id: "history" as const,
              label: `Kiểm tra PCCC & Biến động (${inspections.length})`,
              icon: <History size={14} />
            }
          ].map(tab => {
            const active = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setDetailTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 border-transparent"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {detailTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Store size={14} className="text-indigo-600" />
                  1. Thông tin Pháp lý & Phân loại Cơ sở
                </h2>
                <DetailGrid>
                  <DetailRow label="Tên cơ sở" value={business.name} />
                  <DetailRow
                    label="Loại hình tổ chức"
                    value={business.businessType || "Hộ kinh doanh"}
                  />
                  <DetailRow label="Nhóm ngành" value={`${sectorMeta.icon} ${sectorMeta.name}`} />
                  <DetailRow label="Ngành nghề cụ thể" value={business.type} />
                  <DetailRow
                    label="Số GPĐKKD / MST"
                    value={business.taxCode || business.licenseNumber}
                    isMono
                  />
                  <DetailRow
                    label="Số giấy phép"
                    value={business.licenseNumber}
                    isMono
                  />
                  <DetailRow
                    label="Ngày bắt đầu hoạt động"
                    value={business.startDate || "Chưa cập nhật"}
                    isMono
                  />
                  <DetailRow
                    label="Tình trạng PCCC / ANTT"
                    value={
                      business.safetyCertified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold">
                          <ShieldCheck size={12} /> Đạt chuẩn PCCC / ANTT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold">
                          <ShieldAlert size={12} /> Chờ hoàn thiện hồ sơ PCCC
                        </span>
                      )
                    }
                  />
                </DetailGrid>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-blue-600" />
                  2. Chủ cơ sở & Đầu mối Liên hệ Địa phương
                </h2>
                <DetailGrid>
                  <DetailRow label="Chủ cơ sở / Đại diện PL" value={business.owner} />
                  <DetailRow
                    label="Số điện thoại liên hệ"
                    value={business.phone}
                    isMono
                  />
                  <DetailRow
                    label="Người trực tiếp quản lý"
                    value={business.siteManager || business.owner}
                  />
                  <DetailRow
                    label="Email công vụ"
                    value={business.legalRepEmail || "Chưa cập nhật"}
                    isMono
                  />
                  <DetailRow
                    label="Đầu mối phối hợp KP3"
                    value={business.focalPointName || business.owner}
                  />
                  <DetailRow
                    label="SĐT & Vai trò đầu mối"
                    value={`${business.focalPointPhone || business.phone || "—"} (${business.focalPointRole || "Chủ cơ sở"})`}
                    isMono
                  />
                </DetailGrid>
              </div>

              {/* Accommodation / Hostel Staying Residents Section */}
              {isAccom && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                        <Building size={16} className="text-amber-700" />
                        Quản lý Lưu trú & Cư dân Tạm trú Thực tế
                      </h3>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Quy mô {business.soTang || 0} tầng • {business.soPhong || 0} phòng •{" "}
                        {actualStayingCount} người lưu trú{" "}
                        {business.giaThueTrungBinh
                          ? `• Giá tham khảo: ${business.giaThueTrungBinh}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportResidents}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Xuất DS Excel ({stayingResidents.length} người)</span>
                    </button>
                  </div>

                  {stayingResidents.length > 0 ? (
                    <div className="bg-white rounded-xl border border-amber-200/80 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-amber-100/60 text-amber-950 border-b border-amber-200 text-[10.5px] uppercase font-bold">
                            <th className="p-2.5">STT</th>
                            <th className="p-2.5">Họ và tên</th>
                            <th className="p-2.5">CCCD / Năm sinh</th>
                            <th className="p-2.5">Thường trú gốc</th>
                            <th className="p-2.5">Hết hạn tạm trú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {stayingResidents.map((res, idx) => {
                            const exp = getTemporaryResidenceExpiryStatus(
                              res.temporaryExpDate
                            );
                            return (
                              <tr key={res.id} className="hover:bg-amber-50/40">
                                <td className="p-2.5 font-mono text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="p-2.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(getResidentDetailPath(res.id))
                                    }
                                    className="font-bold text-indigo-700 hover:underline text-left cursor-pointer"
                                  >
                                    {res.fullName}
                                  </button>
                                  <div className="text-[10.5px] text-slate-500 font-mono">
                                    {res.phone || "Chưa có SĐT"}
                                  </div>
                                </td>
                                <td className="p-2.5 font-mono text-slate-700">
                                  <div>{res.cccd || "—"}</div>
                                  <div className="text-[10.5px] text-slate-500">
                                    {res.birthDate}
                                  </div>
                                </td>
                                <td className="p-2.5 text-slate-600 max-w-xs">
                                  {res.permanentAddress ||
                                    res.hometown ||
                                    "Chưa cập nhật"}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-mono text-slate-800">
                                    {res.temporaryExpDate || "Chưa cập nhật"}
                                  </div>
                                  <span
                                    className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                      exp.status === "expired"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : exp.status === "expiring_soon"
                                          ? "bg-amber-50 text-amber-800 border-amber-300"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}
                                  >
                                    {exp.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white/90 rounded-xl border border-amber-200/80 p-4 text-xs text-slate-600">
                      Hiện chưa có nhân khẩu tạm trú nào được liên kết trực tiếp trong CSDL cư dân cho địa chỉ{" "}
                      <strong>{business.address}</strong>.
                    </div>
                  )}
                </div>
              )}

              {/* Support Needs */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-amber-600" />
                  3. Nhu cầu Hỗ trợ & Kiến nghị Cơ sở
                </h3>
                {business.supportNeeds && business.supportNeeds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {business.supportNeeds.map((need, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700"
                      >
                        {need}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Chưa ghi nhận nhu cầu hỗ trợ đặc biệt.
                  </p>
                )}
                {business.supportNotes && (
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/70">
                    {business.supportNotes}
                  </p>
                )}
              </div>

              {/* Photo Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-indigo-600" />
                    4. Thư viện Hình ảnh Thực tế Cơ sở
                  </h3>
                  <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload size={13} />
                    <span>Thêm ảnh thực tế</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) handleAddGalleryPhoto(e.target.files[0]);
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(business.images && business.images.length > 0
                    ? business.images
                    : [coverImage]
                  ).map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() =>
                        setViewingImagePreview({
                          url: imgUrl,
                          caption: `${business.name} — Ảnh #${idx + 1}`
                        })
                      }
                      className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer"
                    >
                      <img
                        src={imgUrl}
                        alt={`${business.name} ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {detailTab === "premises" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" />
                  1. Mặt bằng Kinh doanh & Liên kết Hộ dân
                </h2>
                <DetailGrid>
                  <DetailRow label="Địa chỉ cơ sở" value={business.address} colSpan={2} />
                  <DetailRow
                    label="Tuyến đường / Khu vực"
                    value={business.streetArea || "Chưa phân khu"}
                  />
                  <DetailRow
                    label="Loại mặt bằng"
                    value={business.premisesType || "Nhà phố"}
                  />
                  <DetailRow
                    label="Chủ sở hữu mặt bằng"
                    value={business.premisesOwner || business.owner}
                  />
                  <DetailRow
                    label="Hộ dân KP3 liên kết"
                    value={
                      linkedHousehold ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(getHouseholdDetailPath(linkedHousehold.id))
                          }
                          className="font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {linkedHousehold.code} ({linkedHousehold.ownerName})
                          </span>
                          <ExternalLink size={12} />
                        </button>
                      ) : (
                        business.linkedHouseholdCode || "Chưa liên kết"
                      )
                    }
                  />
                  <DetailRow
                    label="Tọa độ GIS"
                    value={
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono">
                          {business.coordinates || "Chưa ghim tọa độ"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGisPinTarget(business)}
                          className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                        >
                          Cập nhật GIS
                        </button>
                      </div>
                    }
                    colSpan={2}
                  />
                </DetailGrid>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  2. Thông tin Địa chính & Giấy chứng nhận QSDĐ (Sổ đỏ)
                </h2>
                <DetailGrid>
                  <DetailRow label="Tờ bản đồ số" value={business.toBanDo} isMono />
                  <DetailRow label="Số thửa đất" value={business.soThua} isMono />
                  <DetailRow
                    label="Diện tích"
                    value={business.dienTich ? `${business.dienTich} m²` : undefined}
                    isMono
                  />
                  <DetailRow label="Loại đất" value={business.loaiDat || "ODT"} />
                  <DetailRow
                    label="Tên chủ sử dụng đất"
                    value={business.tenChuSuDung || business.owner}
                  />
                  <DetailRow label="Số GCN (Sổ đỏ)" value={business.soGcn} isMono />
                  <DetailRow label="Số vào sổ cấp GCN" value={business.soVaoSo} isMono />
                </DetailGrid>

                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Tệp Sổ đỏ / Giấy chứng nhận QSDĐ đính kèm
                    </span>
                    {business.soDoFile && (() => {
                      const sodoFile = business.soDoFile;
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({
                                title: "Hồ sơ Giấy chứng nhận QSDĐ (Sổ đỏ)",
                                businessName: business.name,
                                file: sodoFile,
                                business
                              })
                            }
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Xem Sổ đỏ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadBusinessFile(sodoFile)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Tải xuống</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div
                    onDragEnter={() => setDragActiveSoDo(true)}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragActiveSoDo(true);
                    }}
                    onDragLeave={() => setDragActiveSoDo(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragActiveSoDo(false);
                      if (e.dataTransfer.files?.[0]) {
                        processBusinessFileUpload(
                          e.dataTransfer.files[0],
                          fileObj => handleReplaceSoDo(business, fileObj),
                          msg => onShowToast?.(msg)
                        );
                      }
                    }}
                    className={`border border-dashed rounded-xl p-4 text-center transition-colors ${
                      dragActiveSoDo
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <label className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-600">
                      <Upload size={20} className="text-indigo-500" />
                      <span>
                        {business.soDoFile
                          ? `Đang đính kèm: ${business.soDoFile.name}. Kéo thả hoặc chọn tệp mới để thay thế.`
                          : "Chưa có tệp Sổ đỏ. Kéo thả PDF/hình ảnh vào đây hoặc chọn từ máy."}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            processBusinessFileUpload(
                              e.target.files[0],
                              fileObj => handleReplaceSoDo(business, fileObj),
                              msg => onShowToast?.(msg)
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailTab === "personnel" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <div className="text-[11px] font-bold text-indigo-700 uppercase">
                    Tổng số lao động
                  </div>
                  <div className="text-2xl font-black text-indigo-950 mt-1">
                    {business.employeeCount || 0}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">
                    Thường trú KP3
                  </div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">
                    {business.localWorkersCount ?? 0}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">
                    Lao động tạm trú
                  </div>
                  <div className="text-2xl font-black text-amber-950 mt-1">
                    {business.temporaryWorkersCount ?? 0}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
                  <div className="text-[11px] font-bold text-rose-700 uppercase">
                    Người nước ngoài
                  </div>
                  <div className="text-2xl font-black text-rose-950 mt-1">
                    {business.foreignWorkersCount ?? linkedForeignResidents.length}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Danh sách Lao động Người nước ngoài liên kết
                </h3>
                {linkedForeignResidents.length > 0 ||
                (business.foreignWorkers && business.foreignWorkers.length > 0) ? (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase text-slate-500 font-bold">
                          <th className="p-3">Họ và tên</th>
                          <th className="p-3">Quốc tịch</th>
                          <th className="p-3">Hộ chiếu / CCCD</th>
                          <th className="p-3">Tình trạng cư trú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {linkedForeignResidents.map(fr => (
                          <tr key={fr.id}>
                            <td className="p-3 font-bold text-indigo-700">
                              <button
                                type="button"
                                onClick={() => navigate(getResidentDetailPath(fr.id))}
                                className="hover:underline cursor-pointer"
                              >
                                {fr.fullName}
                              </button>
                            </td>
                            <td className="p-3">{fr.nationality}</td>
                            <td className="p-3 font-mono">{fr.cccd}</td>
                            <td className="p-3">{fr.status}</td>
                          </tr>
                        ))}
                        {(business.foreignWorkers || []).map((fw, idx) => (
                          <tr key={`${fw.passportOrCode}-${idx}`}>
                            <td className="p-3 font-bold text-slate-800">{fw.name}</td>
                            <td className="p-3">{fw.nationality}</td>
                            <td className="p-3 font-mono">{fw.passportOrCode}</td>
                            <td className="p-3">{fw.temporaryResidenceStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                    Cơ sở hiện không có lao động người nước ngoài đăng ký làm việc.
                  </p>
                )}
              </div>
            </div>
          )}

          {detailTab === "history" && (
            <div className="space-y-6">
              {/* Inspection CRUD Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ClipboardCheck size={14} className="text-emerald-600" />
                    1. Nhật ký Kiểm tra PCCC, ANTT & Vệ sinh ATTP
                  </h2>
                  <button
                    type="button"
                    onClick={handleOpenAddInspection}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Thêm đợt kiểm tra</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {inspections.map(log => (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {log.date}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              log.result === "Đạt chuẩn"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : log.result === "Cảnh cáo"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {log.result}
                          </span>
                          <strong className="text-xs text-slate-900">
                            {log.inspector}
                          </strong>
                        </div>
                        <p className="text-xs text-slate-700">{log.note}</p>
                        {log.recommendation && (
                          <p className="text-[11.5px] text-indigo-800 font-medium">
                            Kiến nghị: {log.recommendation}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditInspection(log)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectionToDelete(log)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change History Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <History size={14} className="text-indigo-600" />
                    2. Lịch sử Biến động Cơ sở trên Địa bàn
                  </h2>
                  <button
                    type="button"
                    onClick={handleOpenAddChangeLog}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Ghi nhận biến động</span>
                  </button>
                </div>

                {business.changeHistory && business.changeHistory.length > 0 ? (
                  <div className="space-y-2">
                    {business.changeHistory.map(chg => (
                      <div
                        key={chg.id}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-3"
                      >
                        <CheckCircle2
                          size={15}
                          className="text-indigo-600 mt-0.5 shrink-0"
                        />
                        <div className="space-y-0.5 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-slate-600">
                              {chg.date}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10.5px] font-bold">
                              {chg.type}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium">
                            {chg.description}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Cán bộ ghi nhận: {chg.recordedBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                    Chưa có lịch sử biến động nào được ghi nhận thêm.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GIS Pin Modal */}
      <BusinessGisPinModal
        business={gisPinTarget}
        onClose={() => setGisPinTarget(null)}
        onSaveCoordinates={handleSavePinCoordinates}
      />

      {/* Sổ đỏ Modal */}
      <BusinessSodoModal
        viewingDoc={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onReplaceFile={handleReplaceSoDo}
      />

      {/* Image Lightbox Modal */}
      {viewingImagePreview && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImagePreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white text-xs">
              <span className="font-bold truncate">{viewingImagePreview.caption}</span>
              <button
                type="button"
                onClick={() => setViewingImagePreview(null)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                aria-label="Đóng xem ảnh"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/50">
              <img
                src={viewingImagePreview.url}
                alt={viewingImagePreview.caption}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Change Log Modal */}
      {showChangeLogModal && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowChangeLogModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Ghi nhận Biến động Địa bàn</h3>
              <button
                type="button"
                onClick={() => setShowChangeLogModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
                aria-label="Đóng hộp thoại biến động"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateChangeLog} className="p-5 space-y-3 text-xs">
              {changeLogError && (
                <p role="alert" className="text-rose-700 font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> {changeLogError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Ngày ghi nhận</label>
                  <input
                    type="date"
                    value={changeDate}
                    onChange={e => setChangeDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Loại biến động</label>
                  <select
                    value={changeType}
                    onChange={e =>
                      setChangeType(e.target.value as BusinessChangeLog["type"])
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Mở mới">Mở mới</option>
                    <option value="Thay đổi ngành nghề">Thay đổi ngành nghề</option>
                    <option value="Thay đổi người đại diện">Thay đổi người đại diện</option>
                    <option value="Chuyển địa điểm">Chuyển địa điểm</option>
                    <option value="Tạm ngừng">Tạm ngừng</option>
                    <option value="Hoạt động trở lại">Hoạt động trở lại</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nội dung biến động *
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chi tiết biến động của cơ sở..."
                  value={changeDesc}
                  onChange={e => {
                    setChangeDesc(e.target.value);
                    if (changeLogError) setChangeLogError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Cán bộ ghi nhận</label>
                <input
                  type="text"
                  value={changeRecorder}
                  onChange={e => setChangeRecorder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangeLogModal(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Lưu biến động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Inspection Modal */}
      {showInspectionModal && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowInspectionModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {showInspectionModal === "edit"
                  ? "Cập nhật Đợt Kiểm tra PCCC / ANTT"
                  : "Thêm Đợt Kiểm tra PCCC / ANTT Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowInspectionModal(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
                aria-label="Đóng hộp thoại kiểm tra"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitInspection} className="p-5 space-y-3 text-xs">
              {inspError && (
                <p role="alert" className="text-rose-700 font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> {inspError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Ngày kiểm tra</label>
                  <input
                    type="date"
                    value={inspDate}
                    onChange={e => setInspDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Kết quả</label>
                  <select
                    value={inspResult}
                    onChange={e =>
                      setInspResult(e.target.value as InspectionLog["result"])
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Đạt chuẩn">Đạt chuẩn</option>
                    <option value="Cảnh cáo">Cảnh cáo</option>
                    <option value="Yêu cầu khắc phục">Yêu cầu khắc phục</option>
                    <option value="Không đạt">Không đạt</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Đoàn / Cán bộ kiểm tra *
                </label>
                <input
                  type="text"
                  value={inspInspector}
                  onChange={e => {
                    setInspInspector(e.target.value);
                    if (inspError) setInspError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nội dung ghi nhận tại hiện trường *
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi nhận tình trạng bình chữa cháy, lối thoát hiểm, ANTT..."
                  value={inspNote}
                  onChange={e => {
                    setInspNote(e.target.value);
                    if (inspError) setInspError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Kiến nghị khắc phục (nếu có)
                </label>
                <input
                  type="text"
                  value={inspRecommendation}
                  onChange={e => setInspRecommendation(e.target.value)}
                  placeholder="Ví dụ: Bổ sung thêm đèn exit cầu thang..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(null)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {showInspectionModal === "edit" ? "Lưu cập nhật" : "Thêm đợt kiểm tra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Inspection Confirm Modal */}
      {inspectionToDelete && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setInspectionToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4"
          >
            <h3 className="font-bold text-sm text-slate-900">
              Xác nhận xóa biên bản kiểm tra?
            </h3>
            <p className="text-xs text-slate-600">
              Biên bản ngày <strong>{inspectionToDelete.date}</strong> ({inspectionToDelete.inspector}) sẽ bị xóa khỏi hồ sơ.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectionToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInspection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Xóa biên bản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Business Confirm Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4"
          >
            <h3 className="font-black text-base text-slate-900">
              Xác nhận xóa cơ sở kinh doanh?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Hồ sơ <strong>{business.name}</strong> ({business.address}) sẽ bị gỡ bỏ khỏi danh mục quản lý Khu phố 3.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBusiness}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Xác nhận xóa cơ sở
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
