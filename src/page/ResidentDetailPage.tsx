import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Home,
  MapPin,
  Navigation,
  Phone,
  Printer,
  Shield,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Household, Resident, TargetGisItem } from "../types";
import {
  buildResidentGisTarget,
  getCountryFlag,
  getVisaExpiryStatus,
  isForeignResident,
} from "../utils/residentHelpers";
import {
  getTemporaryResidenceExpiryStatus,
  parseAccommodationInfo,
} from "../utils/householdRecognitionUtils";
import { formatShortRecordId } from "../utils/kp3Utils";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import {
  CT07Modal,
  NA17Modal,
  QuickHouseholdModal,
} from "../components/residents/ResidentModals";
import {
  ROUTES,
  getResidentDetailPath,
  getResidentEditPath,
  navigate,
} from "../routes";

export type ResidentDetailTab = "identity" | "residence" | "social" | "foreign";

export interface ResidentDetailPageProps {
  residentId: string;
  residents: Resident[];
  households?: Household[];
  isDataLoading?: boolean;
  onDeleteResident: (id: string) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onBack?: () => void;
  onEdit?: (resident: Resident) => void;
  onSelectResident?: (residentId: string) => void;
  onDeleted?: (deletedResident: Resident) => void;
}

export default function ResidentDetailPage({
  residentId,
  residents,
  households = [],
  isDataLoading = false,
  onDeleteResident,
  onNavigateToGis,
  onBack,
  onEdit,
  onSelectResident,
  onDeleted,
}: ResidentDetailPageProps) {
  const [activeTab, setActiveTab] = useState<ResidentDetailTab>("identity");
  const [showFullCccd, setShowFullCccd] = useState(false);
  const [showCT07Modal, setShowCT07Modal] = useState(false);
  const [showNA17Modal, setShowNA17Modal] = useState(false);
  const [quickHouseholdModal, setQuickHouseholdModal] =
    useState<Household | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const residentIndex = useMemo(
    () => residents.findIndex((r) => r.id === residentId),
    [residents, residentId]
  );
  const resident = residentIndex >= 0 ? residents[residentIndex] : undefined;
  const prevResident = residentIndex > 0 ? residents[residentIndex - 1] : null;
  const nextResident =
    residentIndex >= 0 && residentIndex < residents.length - 1
      ? residents[residentIndex + 1]
      : null;

  useEffect(() => {
    setActiveTab("identity");
    setShowFullCccd(false);
    setShowCT07Modal(false);
    setShowNA17Modal(false);
    setQuickHouseholdModal(null);
    setShowDeleteConfirm(false);
  }, [residentId]);

  useEffect(() => {
    if (showCT07Modal || showNA17Modal || quickHouseholdModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCT07Modal, showNA17Modal, quickHouseholdModal]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(ROUTES.DASHBOARD_RESIDENTS);
    }
  };

  const handleGoToResident = (targetId: string) => {
    if (onSelectResident) {
      onSelectResident(targetId);
    } else {
      navigate(getResidentDetailPath(targetId));
    }
  };

  const handleEditResident = (target: Resident) => {
    if (onEdit) {
      onEdit(target);
    } else {
      navigate(getResidentEditPath(target.id));
    }
  };

  const handleQuickViewHousehold = (householdCodeOrId: string) => {
    if (!households || households.length === 0) return;
    const found = households.find(
      (h) => h.code === householdCodeOrId || h.id === householdCodeOrId
    );
    if (found) {
      setQuickHouseholdModal(found);
    }
  };

  const handleDirections = (target: Resident) => {
    if (!onNavigateToGis) return;
    onNavigateToGis(buildResidentGisTarget(target, households));
  };

  if (isDataLoading && !resident) {
    return (
      <div className="max-w-5xl mx-auto">
        <LoadingFade
          variant="page"
          title="Đang tải hồ sơ cư dân..."
          subtitle="Hệ thống đang truy xuất thông tin chi tiết từ Cơ sở dữ liệu KP3."
        />
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 theme-loading-fade">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Không tìm thấy hồ sơ cư dân
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Mã hồ sơ{" "}
          <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
            {residentId}
          </code>{" "}
          không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu Khu phố 3.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Quay lại danh bạ cư dân
          </button>
        </div>
      </div>
    );
  }

  const isForeign = isForeignResident(resident);
  const shortId = formatShortRecordId(resident.id, "CD");
  const rawCccd = isForeign
    ? resident.passportNumber || resident.cccd
    : resident.cccd;
  const maskedCccdDisplay = !rawCccd
    ? undefined
    : showFullCccd
      ? rawCccd
      : rawCccd.length >= 9
        ? `${rawCccd.slice(0, 4)} ••• ••• ${rawCccd.slice(-3)}`
        : rawCccd;

  const displayAddress =
    resident.currentAddress || resident.temporaryAddress || resident.address;
  const expiryInfo = getTemporaryResidenceExpiryStatus(resident.temporaryExpDate);
  const hostelInfo = parseAccommodationInfo(displayAddress);
  const linkedHousehold = resident.householdId
    ? households.find(
        (h) => h.code === resident.householdId || h.id === resident.householdId
      )
    : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8 theme-loading-fade">
      <PageHeader
        badgeIcon={Shield}
        badgeText="HỒ SƠ CƯ DÂN CHI TIẾT • CSDL ĐỀ ÁN 06/CP"
        badgeSubtext={shortId}
        title={resident.fullName}
        description={
          isForeign
            ? `Công dân nước ngoài (${resident.nationality || "Nước ngoài"}) • ${displayAddress}`
            : `${resident.status} • ${displayAddress}`
        }
        showDate={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-detail-back"
              onClick={handleGoBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Danh bạ cư dân</span>
            </button>

            <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
              <button
                type="button"
                disabled={!prevResident}
                onClick={() => prevResident && handleGoToResident(prevResident.id)}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-r border-slate-200 transition-colors"
                title={
                  prevResident
                    ? `Cư dân trước: ${prevResident.fullName}`
                    : "Đang ở đầu danh sách"
                }
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Trước</span>
              </button>
              <button
                type="button"
                disabled={!nextResident}
                onClick={() => nextResident && handleGoToResident(nextResident.id)}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title={
                  nextResident
                    ? `Cư dân sau: ${nextResident.fullName}`
                    : "Đang ở cuối danh sách"
                }
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              type="button"
              id="btn-detail-edit-top"
              onClick={() => handleEditResident(resident)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Edit2 size={14} />
              <span>Chỉnh sửa</span>
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Identity Summary Banner */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span
                className="font-mono font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center"
                title={`Mã hồ sơ gốc: ${resident.id}`}
              >
                {shortId}
              </span>
              {resident.householdId && (
                <button
                  type="button"
                  onClick={() => handleQuickViewHousehold(resident.householdId!)}
                  disabled={!linkedHousehold}
                  className="inline-flex items-center font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-70 transition-colors cursor-pointer disabled:cursor-default"
                  title={
                    linkedHousehold
                      ? "Xem nhanh Sổ hộ khẩu liên kết"
                      : "Mã hộ khẩu đã liên kết"
                  }
                >
                  HỘ: {resident.householdId}
                </button>
              )}
              {residentIndex >= 0 && (
                <span className="text-slate-500 font-medium px-2">
                  Hồ sơ {residentIndex + 1} / {residents.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isForeign ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1.5">
                  <span>{getCountryFlag(resident.nationality)}</span>
                  <span>{resident.nationality}</span>
                </span>
              ) : (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    resident.status === "Thường trú"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : resident.status === "Tạm trú"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {resident.status}
                </span>
              )}

              {resident.policyGroup?.includes("Đảng viên") && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  ★ Đảng viên ĐCSVN
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative shrink-0 self-start">
              <img
                id="detail-resident-avatar"
                src={
                  resident.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
                }
                alt={resident.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 object-cover bg-slate-100"
                referrerPolicy="no-referrer"
              />
              {resident.policyGroup?.includes("Đảng viên") && (
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[11px] text-white font-bold"
                  title="Đảng viên ĐCSVN"
                >
                  ★
                </span>
              )}
              {isForeign && !resident.policyGroup?.includes("Đảng viên") && (
                <span
                  className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-purple-700 border-2 border-white text-[10px] text-white font-bold"
                  title={resident.nationality}
                >
                  {getCountryFlag(resident.nationality)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <h2
                id="detail-resident-name"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug"
              >
                {resident.fullName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 text-slate-700 min-w-0">
                  <MapPin
                    size={14}
                    className="text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="break-words">{displayAddress}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                {resident.birthDate && (
                  <span>
                    Ngày sinh:{" "}
                    <strong className="text-slate-900 font-semibold font-mono">
                      {resident.birthDate}
                    </strong>
                  </span>
                )}
                {resident.gender && (
                  <span>
                    · Giới tính:{" "}
                    <strong className="text-slate-900 font-semibold">
                      {resident.gender}
                    </strong>
                  </span>
                )}
                {resident.phone && resident.phone !== "N/A" && (
                  <a
                    href={`tel:${resident.phone}`}
                    className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-mono font-semibold"
                  >
                    <Phone size={12} />
                    {resident.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-4 sm:px-6 gap-5 sm:gap-7 text-xs sm:text-sm font-bold border-b border-slate-200 overflow-x-auto bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "identity"
                ? "text-emerald-800 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard size={15} aria-hidden="true" />
            <span>Định danh &amp; Nhân thân</span>
            {activeTab === "identity" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("residence")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "residence"
                ? "text-emerald-800 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Home size={15} aria-hidden="true" />
            <span>Hộ tịch &amp; Nơi cư trú</span>
            {activeTab === "residence" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("social")}
            className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "social"
                ? "text-emerald-800 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award size={15} aria-hidden="true" />
            <span>Đoàn thể &amp; Y tế - Xã hội</span>
            {activeTab === "social" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />
            )}
          </button>

          {isForeign && (
            <button
              type="button"
              onClick={() => setActiveTab("foreign")}
              className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "foreign"
                  ? "text-purple-800 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Globe size={15} aria-hidden="true" />
              <span>Thị thực &amp; Xuất nhập cảnh</span>
              {activeTab === "foreign" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-700" />
              )}
            </button>
          )}
        </div>

        {/* Tab Panels */}
        <div className="p-4 sm:p-6 space-y-5">
          {activeTab === "identity" && (
            <div className="space-y-5">
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard
                      size={14}
                      className="text-emerald-700"
                      aria-hidden="true"
                    />
                    {isForeign
                      ? "Hộ chiếu Quốc tế"
                      : "Căn cước công dân (Định danh)"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowFullCccd(!showFullCccd)}
                    className="min-h-7 px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                    aria-pressed={showFullCccd}
                  >
                    {showFullCccd ? (
                      <EyeOff size={13} aria-hidden="true" />
                    ) : (
                      <Eye size={13} aria-hidden="true" />
                    )}
                    <span>{showFullCccd ? "Ẩn số" : "Hiện số"}</span>
                  </button>
                </div>

                <DetailGrid hideEmpty>
                  <DetailRow
                    label={isForeign ? "Số Hộ chiếu" : "Số CCCD"}
                    value={maskedCccdDisplay}
                    copyValue={rawCccd || undefined}
                    isMono
                  />
                  <DetailRow label="Ngày cấp" value={resident.idIssueDate} isMono />
                  <DetailRow
                    label="Nơi cấp"
                    value={resident.idIssuePlace || "Cục Cảnh sát QLHC về TTXH"}
                    colSpan={2}
                  />
                </DetailGrid>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <UserCheck
                    size={14}
                    className="text-emerald-700"
                    aria-hidden="true"
                  />
                  Lai lịch &amp; Nhân thân
                </h3>

                <DetailGrid hideEmpty>
                  <DetailRow label="Ngày sinh" value={resident.birthDate} isMono />
                  <DetailRow label="Giới tính" value={resident.gender} />
                  <DetailRow
                    label="Dân tộc"
                    value={resident.ethnicity || "Kinh"}
                  />
                  <DetailRow
                    label="Tôn giáo"
                    value={resident.religion || "Không"}
                  />
                  <DetailRow
                    label="Quê quán"
                    value={resident.hometown}
                    colSpan={2}
                  />
                  <DetailRow
                    label="Quốc tịch"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <span>{getCountryFlag(resident.nationality)}</span>
                        <span>{resident.nationality || "Việt Nam"}</span>
                      </span>
                    }
                  />
                  <DetailRow label="Trình độ học vấn" value={resident.education} />
                  <DetailRow
                    label="Tình trạng hôn nhân"
                    value={resident.maritalStatus}
                  />
                  <DetailRow label="Nghề nghiệp" value={resident.occupation} />
                  <DetailRow label="Nơi làm việc" value={resident.workplace} colSpan={2} />
                  <DetailRow label="Họ tên cha" value={resident.fatherName} />
                  <DetailRow label="Họ tên mẹ" value={resident.motherName} />
                </DetailGrid>
              </div>
            </div>
          )}

          {activeTab === "residence" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Home
                    size={14}
                    className="text-emerald-700"
                    aria-hidden="true"
                  />
                  Hồ sơ Hộ tịch &amp; Nơi cư trú
                </h3>
                {resident.householdId && (
                  <button
                    type="button"
                    onClick={() => handleQuickViewHousehold(resident.householdId!)}
                    disabled={!linkedHousehold}
                    className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-75 transition-colors cursor-pointer disabled:cursor-default"
                  >
                    MÃ HỘ: {resident.householdId}
                  </button>
                )}
              </div>

              <DetailGrid hideEmpty>
                <DetailRow label="Diện cư trú" value={resident.status} />
                <DetailRow
                  label="Quan hệ chủ hộ"
                  value={resident.relationToOwner || "Thành viên"}
                />
                <DetailRow
                  label="Tình trạng quản lý"
                  value={resident.managementStatus || "Đang quản lý thực tế"}
                  colSpan={2}
                />
                <DetailRow
                  label="Nơi thường trú gốc"
                  value={resident.permanentAddress}
                  colSpan={2}
                />
                <DetailRow
                  label="Chỗ ở hiện tại"
                  value={displayAddress}
                  colSpan={2}
                />
              </DetailGrid>

              {(resident.status === "Tạm trú" ||
                resident.temporaryRegDate ||
                resident.temporaryExpDate) && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <DetailGrid hideEmpty>
                    <DetailRow
                      label="Ngày ĐK tạm trú"
                      value={resident.temporaryRegDate}
                      isMono
                    />
                    <DetailRow
                      label="Ngày hết hạn"
                      value={resident.temporaryExpDate}
                      isMono
                    />
                  </DetailGrid>

                  {expiryInfo.status !== "unknown" && (
                    <div
                      className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                        expiryInfo.isWarning
                          ? "bg-amber-50 border-amber-300 text-amber-950"
                          : expiryInfo.isExpired
                            ? "bg-rose-50 border-rose-300 text-rose-950"
                            : "bg-emerald-50 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      {expiryInfo.isWarning ? (
                        <AlertTriangle
                          size={16}
                          className="text-amber-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : expiryInfo.isExpired ? (
                        <AlertCircle
                          size={16}
                          className="text-rose-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2
                          size={16}
                          className="text-emerald-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <div className="flex-1 text-xs">
                        <div className="font-bold flex flex-wrap items-center gap-2">
                          <span>{expiryInfo.label}</span>
                          {expiryInfo.isWarning && (
                            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono font-bold">
                              Cảnh báo trước 30 ngày
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 leading-relaxed">
                          {expiryInfo.isWarning
                            ? "Cán bộ khu phố / CSKV cần liên hệ cơ sở lưu trú hướng dẫn gia hạn tạm trú trực tuyến."
                            : expiryInfo.isExpired
                              ? "Đã quá hạn đăng ký tạm trú: cần kiểm tra nơi ở thực tế và nhắc nhở gia hạn theo Luật Cư trú."
                              : `Thời hạn cư trú hợp lệ đến ngày ${expiryInfo.formattedDate}.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hostelInfo.isHostel && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Building2
                        size={14}
                        className="text-amber-700"
                        aria-hidden="true"
                      />
                      Cơ sở Lưu trú / Nhà trọ Quản lý
                    </span>
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Đã đối soát CSKD
                    </span>
                  </div>
                  <dl className="@container bg-white px-3 py-1 rounded-lg border border-amber-200 text-xs">
                    <DetailRow
                      label="Tên nhà trọ"
                      value={hostelInfo.hostelName}
                      compact
                      hideIfEmpty
                    />
                    {hostelInfo.owner && (
                      <DetailRow
                        label="Chủ nhà trọ"
                        value={hostelInfo.owner}
                        compact
                        hideIfEmpty
                      />
                    )}
                    {hostelInfo.phone && (
                      <DetailRow
                        label="SĐT chủ trọ"
                        value={hostelInfo.phone}
                        href={`tel:${hostelInfo.phone}`}
                        copyValue={hostelInfo.phone}
                        isMono
                        compact
                        hideIfEmpty
                      />
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Award
                  size={14}
                  className="text-rose-700"
                  aria-hidden="true"
                />
                Chính sách, Đoàn thể &amp; Y tế - Xã hội
              </h3>

              <DetailGrid hideEmpty>
                <DetailRow
                  label="Diện chính sách"
                  value={resident.policyGroup || "Dân cư phổ thông"}
                />
                <DetailRow
                  label="Mã thẻ BHYT"
                  value={resident.healthInsuranceNumber}
                  copyValue={resident.healthInsuranceNumber}
                  isMono
                />
                <DetailRow
                  label="Nghĩa vụ quân sự"
                  value={resident.militaryServiceStatus}
                />
                <DetailRow
                  label="Số điện thoại"
                  value={
                    resident.phone && resident.phone !== "N/A"
                      ? resident.phone
                      : undefined
                  }
                  href={
                    resident.phone && resident.phone !== "N/A"
                      ? `tel:${resident.phone}`
                      : undefined
                  }
                  copyValue={
                    resident.phone && resident.phone !== "N/A"
                      ? resident.phone
                      : undefined
                  }
                  isMono
                />
                <DetailRow
                  label="Liên hệ khẩn cấp"
                  value={resident.emergencyContact}
                  colSpan={2}
                />
              </DetailGrid>

              {resident.notes && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-950 block mb-1">
                    Ghi chú nghiệp vụ:
                  </span>
                  <p className="text-slate-800 leading-relaxed">
                    {resident.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "foreign" && isForeign && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200 pb-2">
                <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe
                    size={14}
                    className="text-purple-700"
                    aria-hidden="true"
                  />
                  Thị thực &amp; Quản lý Người nước ngoài
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 border rounded-md ${getVisaExpiryStatus(resident.visaValidUntil).badgeClass}`}
                  >
                    {getVisaExpiryStatus(resident.visaValidUntil).label}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md font-bold">
                    {getCountryFlag(resident.nationality)} {resident.nationality}
                  </span>
                </div>
              </div>

              <DetailGrid hideEmpty>
                <DetailRow
                  label="Số Hộ chiếu"
                  value={resident.passportNumber || resident.cccd}
                  copyValue={resident.passportNumber || resident.cccd}
                  isMono
                />
                <DetailRow
                  label="Hạn Hộ chiếu"
                  value={resident.passportExpiryDate || "Không thời hạn"}
                  isMono
                />
                <DetailRow
                  label="Loại thị thực"
                  value={resident.visaOrCardType || "Thẻ tạm trú (TRC)"}
                />
                <DetailRow
                  label="Số thẻ / Thị thực"
                  value={resident.visaOrCardNumber}
                  copyValue={resident.visaOrCardNumber}
                  isMono
                />
                <DetailRow
                  label="Thời hạn cư trú"
                  value={`Từ ${resident.visaValidFrom || "01/01/2023"} đến ${resident.visaValidUntil || "31/12/2026"}`}
                  isMono
                />
                <DetailRow
                  label="Mã KB tạm trú CA"
                  value={
                    resident.temporaryRegistrationCode || "KBTT-AP-2024-ONLINE"
                  }
                  copyValue={
                    resident.temporaryRegistrationCode || "KBTT-AP-2024-ONLINE"
                  }
                  isMono
                />
                <DetailRow
                  label="Ngày khai báo CA"
                  value={resident.temporaryRegistrationDate}
                  isMono
                />
                <DetailRow
                  label="Tình trạng khai báo"
                  value={resident.temporaryRegistrationStatus || "Đã khai báo"}
                />
                <DetailRow
                  label="Giấy phép lao động"
                  value={resident.workPermitNumber || "Miễn GPLĐ / Chuyên gia"}
                  isMono
                />
                <DetailRow
                  label="Đơn vị bảo lãnh"
                  value={resident.sponsoringOrganization || resident.workplace}
                />
                <DetailRow
                  label="Chủ nhà / Bảo lãnh"
                  value={resident.landlordContact}
                  colSpan={2}
                />
              </DetailGrid>
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isForeign ? (
              <button
                type="button"
                id="btn-detail-print-na17"
                onClick={() => setShowNA17Modal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <FileText
                  size={14}
                  className="text-purple-700"
                  aria-hidden="true"
                />
                <span>Mẫu NA17</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-detail-print-ct07"
                onClick={() => setShowCT07Modal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer
                  size={14}
                  className="text-emerald-700"
                  aria-hidden="true"
                />
                <span>Mẫu CT07</span>
              </button>
            )}

            {onNavigateToGis && (
              <button
                type="button"
                id="btn-detail-directions"
                onClick={() => handleDirections(resident)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Navigation
                  size={14}
                  className="text-emerald-700"
                  aria-hidden="true"
                />
                <span>Chỉ đường GIS</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-detail-delete"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Xóa hồ sơ</span>
            </button>

            <button
              type="button"
              onClick={handleGoBack}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Quay lại
            </button>

            <button
              type="button"
              id="btn-detail-edit-footer"
              onClick={() => handleEditResident(resident)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Edit2 size={14} aria-hidden="true" />
              <span>Chỉnh sửa</span>
            </button>
          </div>
        </div>
      </div>

      {showCT07Modal && (
        <CT07Modal resident={resident} onClose={() => setShowCT07Modal(false)} />
      )}

      {showNA17Modal && (
        <NA17Modal resident={resident} onClose={() => setShowNA17Modal(false)} />
      )}

      {quickHouseholdModal && (
        <QuickHouseholdModal
          household={quickHouseholdModal}
          showFullCccd={showFullCccd}
          onClose={() => setQuickHouseholdModal(null)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          const targetRes = resident;
          setShowDeleteConfirm(false);
          onDeleteResident(targetRes.id);
          if (onDeleted) {
            onDeleted(targetRes);
          } else {
            navigate(ROUTES.DASHBOARD_RESIDENTS);
          }
        }}
        title={`Xóa hồ sơ ${resident.fullName}?`}
        description={`Hồ sơ cư dân ${resident.fullName} sẽ bị xóa khỏi danh bạ khu phố và không thể hoàn tác.`}
        confirmLabel="Xóa hồ sơ"
        variant="danger"
      />
    </div>
  );
}

