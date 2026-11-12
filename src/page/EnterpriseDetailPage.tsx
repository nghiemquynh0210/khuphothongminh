import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Eye,
  HelpCircle,
  History,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  UserCheck,
  Users2,
  X,
} from "lucide-react";
import {
  Business,
  BusinessChangeLog,
  Household,
  Resident,
  TargetGisItem,
} from "../types";
import {
  getEnterpriseImage,
  getEnterpriseScaleLabel,
  isEnterpriseEntity,
} from "../components/EnterpriseManagement";
import {
  decimalToDMS,
  generateDefaultCoordinatesForAddress,
  getGoogleMapsDirectionUrl,
  KP3_CENTER,
  parseCoordinates as parseGisCoords,
} from "../utils/gisUtils";
import { formatShortRecordId } from "../utils/kp3Utils";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { ReportSelect } from "../components/reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  getEnterpriseDetailPath,
  getEnterpriseEditPath,
  getHouseholdDetailPath,
  navigate,
} from "../routes";

export type EnterpriseDetailTab = "legal" | "premises" | "personnel" | "history";

export interface EnterpriseDetailPageProps {
  enterpriseId: string;
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
  onEdit?: (enterprise: Business) => void;
  onSelectEnterprise?: (enterpriseId: string) => void;
  onDeleted?: (deletedEnterprise: Business) => void;
}

export default function EnterpriseDetailPage({
  enterpriseId,
  businesses,
  residents = [],
  households = [],
  isDataLoading = false,
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis,
  onBack,
  onEdit,
  onSelectEnterprise,
  onDeleted,
}: EnterpriseDetailPageProps) {
  const [detailTab, setDetailTab] = useState<EnterpriseDetailTab>("legal");
  const [showChangeLogModal, setShowChangeLogModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [gisPinInput, setGisPinInput] = useState("");
  const [viewingImagePreview, setViewingImagePreview] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  const [changeType, setChangeType] =
    useState<BusinessChangeLog["type"]>("Thay đổi ngành nghề");
  const [changeDate, setChangeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [changeDesc, setChangeDesc] = useState("");
  const [changeRecorder, setChangeRecorder] = useState("Cán bộ địa bàn KP3");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "warning" | "info";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "warning" | "info" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const enterprises = useMemo(
    () => businesses.filter(isEnterpriseEntity),
    [businesses]
  );

  const selectedEnterprise = useMemo(() => {
    const match = (b: Business) =>
      b.id === enterpriseId ||
      b.internalCode === enterpriseId ||
      b.taxCode === enterpriseId;
    return enterprises.find(match) || businesses.find(match) || null;
  }, [enterprises, businesses, enterpriseId]);

  const currentIdx = selectedEnterprise
    ? enterprises.findIndex((item) => item.id === selectedEnterprise.id)
    : -1;
  const totalNav = enterprises.length;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;

  const handleGoBack = () => {
    if (onBack) onBack();
    else navigate(ROUTES.DASHBOARD_ENTERPRISES);
  };

  const handleSelectNav = (target: Business) => {
    setDetailTab("legal");
    if (onSelectEnterprise) {
      onSelectEnterprise(target.id);
    } else {
      navigate(getEnterpriseDetailPath(target.id));
    }
  };

  const getLinkedHh = (b: Business) => {
    if (b.linkedHouseholdCode) {
      return (
        households.find(
          (h) =>
            h.code.toLowerCase() === b.linkedHouseholdCode?.toLowerCase() ||
            h.id === b.linkedHouseholdCode
        ) || null
      );
    }
    if (b.address) {
      return (
        households.find((h) =>
          b.address.toLowerCase().includes(h.address.toLowerCase())
        ) || null
      );
    }
    return null;
  };

  const getEnterpriseForeignResidents = (b: Business) => {
    return residents.filter((r) => {
      const isForeign = r.nationality && r.nationality !== "Việt Nam";
      if (!isForeign) return false;
      if (
        r.workplace &&
        b.name &&
        r.workplace.toLowerCase().includes(b.name.toLowerCase())
      ) {
        return true;
      }
      if (b.linkedHouseholdCode && r.householdId === b.linkedHouseholdCode) {
        return true;
      }
      return false;
    });
  };

  const handleDirections = (b: Business) => {
    let lat = KP3_CENTER[0];
    let lng = KP3_CENTER[1];
    let coordsStr = b.coordinates;

    if (b.coordinates) {
      const parsed = parseGisCoords(b.coordinates);
      if (parsed) {
        lat = parsed.lat;
        lng = parsed.lng;
      }
    } else {
      const generated = generateDefaultCoordinatesForAddress(b.address, b.id);
      lat = generated.lat;
      lng = generated.lng;
      coordsStr = generated.dms;
    }

    if (onNavigateToGis) {
      onNavigateToGis({
        id: b.id,
        name: b.name,
        address: b.address,
        type: "enterprise",
        coordinates: coordsStr,
        navigateRoute: true,
      });
    } else {
      const url = getGoogleMapsDirectionUrl(lat, lng, b.address);
      window.open(url, "_blank");
    }
  };

  const openPinModal = (b: Business) => {
    if (b.coordinates) {
      setGisPinInput(b.coordinates);
    } else {
      const auto = generateDefaultCoordinatesForAddress(b.address, b.id);
      setGisPinInput(auto.dms);
    }
    setShowPinModal(true);
  };

  const handleSavePinCoordinates = (redirectAfter = false) => {
    if (!selectedEnterprise) return;
    const parsed = parseGisCoords(gisPinInput);
    if (!parsed) {
      showToast(
        "Định dạng tọa độ chưa hợp lệ! Vui lòng nhập dạng thập phân (10.937..., 106.744...) hoặc độ-phút-giây.",
        "warning"
      );
      return;
    }

    const dms = decimalToDMS(parsed.lat, parsed.lng);
    const updated: Business = {
      ...selectedEnterprise,
      coordinates: dms,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === updated.id ? updated : b))
      );
    }

    setShowPinModal(false);
    showToast(
      `Đã ghim và đồng bộ tọa độ GIS cho "${selectedEnterprise.name}" thành công!`,
      "success"
    );

    if (redirectAfter && onNavigateToGis) {
      onNavigateToGis({
        id: updated.id,
        name: updated.name,
        address: updated.address,
        type: "enterprise",
        coordinates: dms,
        navigateRoute: true,
      });
    }
  };

  const handleChangeAvatarPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEnterprise || !e.target.files || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const currentImages =
        selectedEnterprise.images ||
        (selectedEnterprise.image ? [selectedEnterprise.image] : []);
      const updatedImages = [
        dataUrl,
        ...currentImages.filter((img) => img !== dataUrl),
      ];
      const updated: Business = {
        ...selectedEnterprise,
        image: dataUrl,
        images: updatedImages,
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(
          businesses.map((b) => (b.id === updated.id ? updated : b))
        );
      }
      showToast(
        `Đã cập nhật ảnh đại diện trụ sở "${selectedEnterprise.name}"!`,
        "success"
      );
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleAddGalleryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEnterprise || !e.target.files || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const currentImages =
        selectedEnterprise.images ||
        (selectedEnterprise.image ? [selectedEnterprise.image] : []);
      const updatedImages = [dataUrl, ...currentImages];
      const updated: Business = {
        ...selectedEnterprise,
        image: selectedEnterprise.image || dataUrl,
        images: updatedImages,
      };
      if (onUpdateBusinesses) {
        onUpdateBusinesses(
          businesses.map((b) => (b.id === updated.id ? updated : b))
        );
      }
      showToast(
        `Đã thêm ảnh mới vào album của "${selectedEnterprise.name}"!`,
        "success"
      );
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleChangeStatus = (status: Business["status"]) => {
    if (!selectedEnterprise) return;
    onUpdateStatus(selectedEnterprise.id, status);
    showToast(`Đã cập nhật trạng thái doanh nghiệp thành: ${status}`, "success");
  };

  const confirmDeleteEnterprise = () => {
    if (!selectedEnterprise) return;
    const deleted = selectedEnterprise;
    if (onUpdateBusinesses) {
      onUpdateBusinesses(businesses.filter((b) => b.id !== deleted.id));
    }
    setShowDeleteConfirm(false);
    if (onDeleted) {
      onDeleted(deleted);
    } else {
      navigate(ROUTES.DASHBOARD_ENTERPRISES);
    }
  };

  const handleSaveChangeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnterprise) return;
    if (!changeDesc.trim()) {
      showToast("Vui lòng nhập nội dung biến động!", "warning");
      return;
    }

    const [yyyy, mm, dd] = changeDate.includes("-")
      ? changeDate.split("-")
      : ["2026", "10", "10"];
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    const newLog: BusinessChangeLog = {
      id: `CHG-${selectedEnterprise.id}-${Date.now().toString().slice(-4)}`,
      date: formattedDate,
      type: changeType,
      description: changeDesc.trim(),
      recordedBy: changeRecorder.trim() || "Cán bộ KP3",
    };

    const updatedHistory = [
      newLog,
      ...(selectedEnterprise.changeHistory || []),
    ];
    const updated: Business = {
      ...selectedEnterprise,
      changeHistory: updatedHistory,
      status:
        changeType === "Tạm ngừng"
          ? "Tạm ngưng"
          : changeType === "Hoạt động trở lại"
            ? "Đang hoạt động"
            : selectedEnterprise.status,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === updated.id ? updated : b))
      );
    }
    setShowChangeLogModal(false);
    setChangeDesc("");
    showToast("Đã ghi nhận biến động doanh nghiệp thành công!", "success");
  };

  if (isDataLoading && !selectedEnterprise) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <LoadingFade title="Đang tải hồ sơ doanh nghiệp..." />
      </div>
    );
  }

  if (!selectedEnterprise) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Không tìm thấy hồ sơ doanh nghiệp
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Mã hồ sơ{" "}
            <span className="font-mono font-semibold text-slate-800">
              {enterpriseId}
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
              <span>Quay lại Danh sách Doanh nghiệp</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shortEntId = formatShortRecordId(
    selectedEnterprise.internalCode || selectedEnterprise.id,
    "DN"
  );

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
          <span>Quay lại Danh sách Doanh nghiệp</span>
        </button>

        {totalNav > 1 && currentIdx >= 0 && (
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => hasPrev && handleSelectNav(enterprises[currentIdx - 1])}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Doanh nghiệp trước"
              title="Doanh nghiệp trước"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-mono font-semibold text-slate-600 px-1.5">
              Hồ sơ {currentIdx + 1}/{totalNav}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => hasNext && handleSelectNav(enterprises[currentIdx + 1])}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Doanh nghiệp tiếp theo"
              title="Doanh nghiệp tiếp theo"
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
                  src={getEnterpriseImage(selectedEnterprise)}
                  alt={selectedEnterprise.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400";
                  }}
                />
                <label className="absolute inset-0 bg-slate-950/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                  <Camera size={15} className="text-white mb-0.5" />
                  <span className="text-[11px] font-semibold">Đổi ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChangeAvatarPhoto}
                  />
                </label>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                    MÃ: {shortEntId}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 flex items-center gap-1">
                    <Briefcase size={12} className="text-slate-600" />
                    <span>
                      {selectedEnterprise.businessType || "Doanh nghiệp"} •{" "}
                      {getEnterpriseScaleLabel(selectedEnterprise)}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                      selectedEnterprise.status === "Đang hoạt động"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : selectedEnterprise.status === "Tạm ngưng"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedEnterprise.status === "Đang hoạt động"
                          ? "bg-emerald-600"
                          : selectedEnterprise.status === "Tạm ngưng"
                            ? "bg-rose-600"
                            : "bg-amber-600"
                      }`}
                    />
                    <span>{selectedEnterprise.status}</span>
                  </span>
                </div>

                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                  {selectedEnterprise.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin size={13} className="text-emerald-700 shrink-0" />
                    <span>{selectedEnterprise.address}</span>
                  </span>
                  {selectedEnterprise.coordinates && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEnterprise.coordinates)}`}
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
              <div className="min-w-[195px]">
                <ReportSelect
                  aria-label="Trạng thái hoạt động doanh nghiệp"
                  value={selectedEnterprise.status}
                  onChange={(nextVal) => handleChangeStatus(nextVal as any)}
                  options={[
                    { value: "Đang hoạt động", label: "Trạng thái: Đang hoạt động" },
                    { value: "Chờ duyệt", label: "Trạng thái: Chờ duyệt" },
                    { value: "Tạm ngưng", label: "Trạng thái: Tạm ngưng" },
                    { value: "Chuyển địa điểm", label: "Trạng thái: Chuyển địa điểm" },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-9 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer size={13} /> In phiếu
              </button>
              <button
                type="button"
                onClick={() =>
                  onEdit
                    ? onEdit(selectedEnterprise)
                    : navigate(getEnterpriseEditPath(selectedEnterprise.id))
                }
                className="min-h-9 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil size={13} /> Chỉnh sửa doanh nghiệp
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="min-h-9 px-3 py-1.5 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={13} /> Xóa hồ sơ
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-5 gap-5 text-xs font-bold overflow-x-auto print:hidden">
          <button
            type="button"
            onClick={() => setDetailTab("legal")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              detailTab === "legal"
                ? "text-emerald-800"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase size={14} />
            <span>Hồ sơ pháp lý & Thuế</span>
            {detailTab === "legal" && (
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
            <span>Trụ sở & Mặt bằng KP3</span>
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
            <span>Người đại diện & Lao động</span>
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
            <span>Biến động địa bàn</span>
            {detailTab === "history" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 bg-white text-xs sm:text-sm space-y-4">
          {/* TAB 1: THÔNG TIN PHÁP LÝ & TỔ CHỨC */}
          {detailTab === "legal" && (
            <div className="animate-in fade-in duration-200 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase size={14} className="text-indigo-600" />
                    Hồ sơ Doanh nghiệp, Mã số thuế &amp; Pháp lý
                  </h4>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="flex items-center gap-1.5">
                      {(
                        selectedEnterprise.images || [
                          getEnterpriseImage(selectedEnterprise),
                        ]
                      )
                        .slice(0, 3)
                        .map((imgUrl, i) => (
                          <div
                            key={i}
                            onClick={() =>
                              setViewingImagePreview({
                                url: imgUrl,
                                caption: `${selectedEnterprise.name} - Ảnh ${i + 1}`,
                              })
                            }
                            className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all group relative"
                            title={`Xem ảnh ${i + 1}`}
                          >
                            <img
                              src={imgUrl}
                              alt="Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye size={12} />
                            </div>
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
                    label="Mã số thuế / MSDN"
                    value={selectedEnterprise.taxCode}
                    isMono
                  />
                  <DetailRow
                    label="Loại hình tổ chức"
                    value={selectedEnterprise.businessType || "Công ty TNHH"}
                  />
                  <DetailRow
                    label="Ngành nghề kinh doanh"
                    value={selectedEnterprise.type}
                  />
                  <DetailRow
                    label="Quy mô lao động"
                    value={getEnterpriseScaleLabel(selectedEnterprise)}
                  />
                  <DetailRow
                    label="Số giấy phép / Mã hồ sơ"
                    value={
                      selectedEnterprise.licenseNumber ||
                      selectedEnterprise.internalCode ||
                      "Đang hoạt động"
                    }
                    isMono
                  />
                  <DetailRow
                    label="Ngày bắt đầu hoạt động"
                    value={selectedEnterprise.startDate}
                    isMono
                  />
                </DetailGrid>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-amber-600" />
                    Nhu cầu Hỗ trợ &amp; Đóng góp ý kiến
                  </h5>
                </div>

                {selectedEnterprise.supportNeeds &&
                selectedEnterprise.supportNeeds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEnterprise.supportNeeds.map((need, ni) => (
                      <span
                        key={ni}
                        className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{need}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                    Doanh nghiệp chưa đăng ký danh mục nhu cầu hỗ trợ đặc thù.
                  </p>
                )}

                {selectedEnterprise.supportNotes && (
                  <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/90 text-xs">
                    <span className="text-[11px] font-bold text-amber-900 block mb-0.5">
                      Ghi chú khó khăn / Ý kiến kiến nghị gửi Khu phố:
                    </span>
                    <p className="text-slate-800 leading-relaxed italic">
                      "{selectedEnterprise.supportNotes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MẶT BẰNG & KHU VỰC ĐỊA BÀN */}
          {detailTab === "premises" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <MapPin size={14} className="text-emerald-600" />
                  Trụ sở, Mặt bằng Kinh doanh &amp; Liên kết Địa bàn KP3
                </h4>

                <DetailGrid hideEmpty compact>
                  <DetailRow
                    label="Địa chỉ trụ sở / VP"
                    value={selectedEnterprise.address}
                    colSpan={2}
                  />
                  <DetailRow
                    label="Tuyến đường / Phân khu"
                    value={
                      selectedEnterprise.streetArea ||
                      (selectedEnterprise.address.includes("42")
                        ? "Hẻm 42 Lương Định Của"
                        : "Mặt tiền Lương Định Của")
                    }
                  />
                  <DetailRow
                    label="Loại mặt bằng"
                    value={selectedEnterprise.premisesType || "Văn phòng"}
                  />
                  <DetailRow
                    label="Chủ sở hữu mặt bằng"
                    value={
                      selectedEnterprise.premisesOwner
                        ? `${selectedEnterprise.premisesOwner}${
                            selectedEnterprise.premisesOwnerPhone
                              ? ` (${selectedEnterprise.premisesOwnerPhone})`
                              : ""
                          }`
                        : undefined
                    }
                  />
                  <DetailRow
                    label="Liên kết mã hộ KP3"
                    value={
                      <span className="font-mono text-blue-700 font-bold">
                        {selectedEnterprise.linkedHouseholdCode ||
                          "Địa chỉ độc lập"}
                      </span>
                    }
                  />
                </DetailGrid>

                {(() => {
                  const hh = getLinkedHh(selectedEnterprise);
                  if (!hh) return null;
                  return (
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <span className="text-emerald-900 font-bold block">
                          Liên kết Hộ dân: {hh.ownerName} (Mã hộ: {hh.code})
                        </span>
                        <span className="text-[11px] text-emerald-800 block">
                          Số nhân khẩu: {hh.memberCount} người • Địa chỉ:{" "}
                          {hh.address}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2.5 py-0.5 rounded-full">
                          Đã đối soát CSDL
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(getHouseholdDetailPath(hh.id))}
                          className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                        >
                          Xem sổ hộ khẩu ➜
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Compass size={14} className="text-emerald-600" /> Tọa độ
                      số GIS &amp; Dẫn đường
                    </span>
                    <div className="font-mono text-xs text-slate-700">
                      Tọa độ:{" "}
                      <strong className="text-emerald-700 font-semibold">
                        {selectedEnterprise.coordinates || "Chưa thiết lập"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDirections(selectedEnterprise)}
                      className="min-h-8 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Dẫn đường trực tiếp trên bản đồ số GIS Khu phố 3"
                    >
                      <Navigation size={13} />
                      <span>Dẫn đường GIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPinModal(selectedEnterprise)}
                      className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MapPin size={13} className="text-indigo-600" />
                      <span>
                        {selectedEnterprise.coordinates
                          ? "Sửa tọa độ"
                          : "Ghim tọa độ"}
                      </span>
                    </button>

                    {selectedEnterprise.coordinates && (
                      <a
                        href={getGoogleMapsDirectionUrl(
                          parseGisCoords(selectedEnterprise.coordinates)?.lat ||
                            10.936997,
                          parseGisCoords(selectedEnterprise.coordinates)?.lng ||
                            106.744645,
                          selectedEnterprise.address
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Mở chỉ đường bằng Google Maps"
                      >
                        <ExternalLink size={12} />
                        <span>Google Maps</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ĐẠI DIỆN & LAO ĐỘNG */}
          {detailTab === "personnel" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <UserCheck size={14} className="text-blue-600" />
                  Người đại diện Pháp luật &amp; Đầu mối Công vụ
                </h4>

                <DetailGrid hideEmpty compact>
                  <DetailRow
                    label="Đại diện pháp luật"
                    value={
                      selectedEnterprise.legalRepresentative ||
                      selectedEnterprise.owner
                    }
                    helperText={`SĐT: ${selectedEnterprise.legalRepPhone || selectedEnterprise.phone}${
                      selectedEnterprise.legalRepEmail
                        ? ` • ${selectedEnterprise.legalRepEmail}`
                        : ""
                    }`}
                  />
                  <DetailRow
                    label="Quản lý tại chỗ"
                    value={
                      selectedEnterprise.siteManager || selectedEnterprise.owner
                    }
                    helperText={`SĐT: ${selectedEnterprise.siteManagerPhone || selectedEnterprise.phone}`}
                  />

                  <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200/80 md:col-span-2 mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs mb-2">
                      <UserCheck size={14} className="text-blue-700" />
                      <span>Đầu mối phối hợp địa phương (Công vụ):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 font-medium">
                          Họ và tên:
                        </span>
                        <strong className="text-blue-950 font-bold">
                          {selectedEnterprise.focalPointName ||
                            selectedEnterprise.owner}
                        </strong>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 font-medium">
                          SĐT công vụ:
                        </span>
                        <strong className="font-mono text-blue-950 font-bold">
                          {selectedEnterprise.focalPointPhone ||
                            selectedEnterprise.phone}
                        </strong>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 font-medium">
                          Vai trò:
                        </span>
                        <strong className="text-blue-950 font-semibold">
                          {selectedEnterprise.focalPointRole ||
                            "Đại diện phối hợp"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </DetailGrid>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Users2 size={16} className="text-slate-700" />
                  Tình hình Lực lượng Lao động &amp; Nhân sự Nước ngoài
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10.5px] text-slate-500 block font-semibold uppercase">
                      Tổng lao động
                    </span>
                    <strong className="text-xl font-bold text-slate-900 block mt-0.5">
                      {selectedEnterprise.employeeCount || 1}
                    </strong>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10.5px] text-slate-500 block font-semibold uppercase">
                      Thường trú KP3
                    </span>
                    <strong className="text-xl font-bold text-slate-800 block mt-0.5">
                      {selectedEnterprise.localWorkersCount ??
                        Math.floor(
                          (selectedEnterprise.employeeCount || 1) / 2
                        )}
                    </strong>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10.5px] text-slate-500 block font-semibold uppercase">
                      Tạm trú địa bàn
                    </span>
                    <strong className="text-xl font-bold text-slate-800 block mt-0.5">
                      {selectedEnterprise.temporaryWorkersCount ??
                        Math.ceil(
                          (selectedEnterprise.employeeCount || 1) / 2
                        )}
                    </strong>
                  </div>
                  <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200">
                    <span className="text-[10.5px] text-rose-700 block font-bold uppercase">
                      Người nước ngoài
                    </span>
                    <strong className="text-xl font-bold text-rose-800 block mt-0.5">
                      {selectedEnterprise.foreignWorkersCount ||
                        selectedEnterprise.foreignWorkers?.length ||
                        0}
                    </strong>
                  </div>
                </div>

                {(() => {
                  const foreigners =
                    selectedEnterprise.foreignWorkers &&
                    selectedEnterprise.foreignWorkers.length > 0
                      ? selectedEnterprise.foreignWorkers
                      : getEnterpriseForeignResidents(selectedEnterprise).map(
                          (r) => ({
                            name: r.fullName,
                            nationality: r.nationality || "Nước ngoài",
                            passportOrCode: r.cccd,
                            position: r.occupation,
                            temporaryResidenceStatus:
                              "Đã khai báo tạm trú" as const,
                          })
                        );

                  if (foreigners.length === 0) {
                    return (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        Doanh nghiệp không ghi nhận chuyên gia hoặc lao động
                        người nước ngoài làm việc tại chỗ.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Danh sách chuyên gia / nhân sự nước ngoài:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {foreigners.map((f, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-rose-50/40 border border-rose-200/80 flex justify-between items-center text-xs"
                          >
                            <div>
                              <strong className="text-slate-900 block">
                                {f.name}
                              </strong>
                              <span className="text-[10.5px] text-slate-500 block">
                                {f.nationality} • {f.position}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Hộ chiếu: {f.passportOrCode}
                              </span>
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
            </div>
          )}

          {/* TAB 4: BIẾN ĐỘNG ĐỊA BÀN */}
          {detailTab === "history" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <History size={16} className="text-blue-600" />
                    Lịch sử Biến động Địa bàn (Mở mới, Chuyển địa điểm, Đổi
                    ngành nghề, Tạm ngừng)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowChangeLogModal(true)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Ghi nhận biến động
                  </button>
                </div>

                <div className="space-y-2.5">
                  {!selectedEnterprise.changeHistory ||
                  selectedEnterprise.changeHistory.length === 0 ? (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                      Chưa ghi nhận biến động mới đối với doanh nghiệp này.
                    </div>
                  ) : (
                    selectedEnterprise.changeHistory.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">
                            {log.type}
                          </span>
                          <span className="font-mono text-[10.5px] text-slate-500">
                            {log.date}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11.5px]">
                          {log.description}
                        </p>
                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Người ghi nhận: {log.recordedBy}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL THÊM BIẾN ĐỘNG DOANH NGHIỆP */}
      {showChangeLogModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
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
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Loại biến động *
                </label>
                <ReportSelect
                  aria-label="Loại biến động"
                  value={changeType}
                  onChange={(nextVal) => setChangeType(nextVal as any)}
                  options={[
                    { value: "Mở mới", label: "Mở mới hoạt động tại địa chỉ" },
                    {
                      value: "Chuyển địa điểm",
                      label: "Chuyển địa điểm trụ sở / văn phòng",
                    },
                    {
                      value: "Thay đổi ngành nghề",
                      label: "Thay đổi ngành nghề kinh doanh",
                    },
                    {
                      value: "Thay đổi người đại diện",
                      label: "Thay đổi người đại diện / pháp lý",
                    },
                    { value: "Tạm ngừng", label: "Tạm ngừng hoạt động" },
                    {
                      value: "Hoạt động trở lại",
                      label: "Hoạt động trở lại",
                    },
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
                  value={changeDate}
                  onChange={(e) => setChangeDate(e.target.value)}
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
                  placeholder="Ghi nhận cụ thể thông tin thay đổi địa chỉ, ngành nghề, người đại diện hoặc nguyên nhân tạm ngừng..."
                  value={changeDesc}
                  onChange={(e) => setChangeDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Người ghi nhận
                </label>
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

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS DOANH NGHIỆP */}
      {showPinModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowPinModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            <div className="bg-slate-50 p-4 text-slate-900 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900">
                    Ghim &amp; Đồng bộ Tọa độ GIS Doanh nghiệp
                  </h3>
                  <p className="text-xs text-slate-600 font-mono truncate">
                    {selectedEnterprise.name} (
                    {selectedEnterprise.internalCode || selectedEnterprise.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                aria-label="Đóng"
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-600 font-semibold block">
                  Trụ sở hoạt động:
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  {selectedEnterprise.address}
                </p>
                <span className="text-xs text-slate-600 block">
                  Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <label className="font-bold text-slate-700">
                    Tọa độ GIS (Định dạng DMS hoặc Thập phân):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(
                        selectedEnterprise.address,
                        selectedEnterprise.id
                      );
                      setGisPinInput(auto.dms);
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    title="Tự động nhận diện tọa độ từ địa chỉ"
                  >
                    <Sparkles size={12} className="text-indigo-600" /> Tự động
                    nhận diện
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={gisPinInput}
                    onChange={(e) => setGisPinInput(e.target.value)}
                    placeholder='Ví dụ: 10°56&#39;14.2"N 106°44&#39;39.5"E hoặc 10.936997, 106.744645'
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                  />
                  <MapPin
                    size={15}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 block">
                  Gợi ý phân khu trục chính KP3:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput('10°56\'13.2"N 106°44\'40.7"E')
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      Mặt tiền Lương Định Của
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      10.936997, 106.744645
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput('10°56\'16.1"N 106°44\'43.8"E')
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      Hẻm 42 Lương Định Của
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      10.937800, 106.745500
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput('10°56\'08.9"N 106°44\'48.5"E')
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      Hẻm 18 Lương Định Của
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      10.935800, 106.746800
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput('10°56\'14.8"N 106°44\'38.2"E')
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      Khu thương mại dịch vụ KP3
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      10.937200, 106.743800
                    </span>
                  </button>
                </div>
              </div>

              {gisPinInput &&
                (() => {
                  const parsed = parseGisCoords(gisPinInput);
                  if (parsed) {
                    return (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Check size={13} className="text-emerald-600" />
                          <span>
                            Tọa độ hợp lệ: {parsed.lat.toFixed(6)},{" "}
                            {parsed.lng.toFixed(6)}
                          </span>
                        </div>
                        <span className="font-mono text-xs bg-emerald-100 px-2 py-0.5 rounded">
                          {decimalToDMS(parsed.lat, parsed.lng)}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
                      <AlertTriangle
                        size={13}
                        className="text-amber-600 shrink-0"
                      />
                      <span>
                        Đang kiểm tra định dạng tọa độ. Vui lòng nhập đúng chuẩn
                        hoặc bấm nút tự động nhận diện.
                      </span>
                    </div>
                  );
                })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Lưu &amp; Đồng bộ GIS
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Lưu &amp; Dẫn đường ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteEnterprise}
        title="Xác nhận xóa hồ sơ doanh nghiệp"
        description={`Bạn có chắc chắn muốn xóa hồ sơ doanh nghiệp "${selectedEnterprise.name}" khỏi hệ thống?`}
        confirmLabel="Xóa hồ sơ"
        variant="danger"
      />

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
