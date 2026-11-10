import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Printer,
  Shield,
  Trash2,
  UserCheck,
  X
} from "lucide-react";
import { Household, Resident, TargetGisItem } from "../types";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import {
  ResidentCT07Modal,
  ResidentNA17Modal
} from "../components/resident/ResidentCertificateModals";
import { ROUTES, getResidentEditPath, navigate } from "../routes";
import {
  getTemporaryResidenceExpiryStatus,
  parseAccommodationInfo
} from "../utils/householdRecognitionUtils";
import {
  buildGisTargetForResident,
  getCountryFlag,
  isForeignResident
} from "../utils/residentFormUtils";

export interface ResidentDetailPageProps {
  residentId: string;
  residents: Resident[];
  households: Household[];
  isDataLoading?: boolean;
  onDeleteResident: (id: string, residentName?: string) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
}

type DetailTab = "identity" | "residence" | "social" | "foreign";

export default function ResidentDetailPage({
  residentId,
  residents,
  households,
  isDataLoading = false,
  onDeleteResident,
  onNavigateToGis
}: ResidentDetailPageProps) {
  const resident = useMemo(
    () => residents.find(r => r.id === residentId) || null,
    [residents, residentId]
  );

  const linkedHousehold = useMemo(() => {
    if (!resident?.householdId) return null;
    return (
      households.find(
        h => h.code === resident.householdId || h.id === resident.householdId
      ) || null
    );
  }, [households, resident]);

  const [activeTab, setActiveTab] = useState<DetailTab>("identity");
  const [showFullCccd, setShowFullCccd] = useState(false);
  const [copiedCccd, setCopiedCccd] = useState(false);
  const [showCT07Modal, setShowCT07Modal] = useState(false);
  const [showNA17Modal, setShowNA17Modal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);

  const handleBackToList = () => {
    navigate(ROUTES.DASHBOARD_RESIDENTS);
  };

  const handleDirections = (res: Resident) => {
    if (onNavigateToGis) {
      onNavigateToGis(buildGisTargetForResident(res, households));
    }
  };

  if (!resident && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải hồ sơ cư dân...</h2>
        <p className="text-xs text-slate-500">
          Hệ thống đang đồng bộ thông tin chi tiết nhân khẩu từ cơ sở dữ liệu Khu phố 3.
        </p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy hồ sơ cư dân</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Mã hồ sơ <span className="font-mono font-bold text-slate-800">{residentId}</span> không tồn tại hoặc đã bị xóa khỏi danh sách nhân khẩu.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Danh sách Dân cư</span>
          </button>
        </div>
      </div>
    );
  }

  const isForeign = isForeignResident(resident);
  const effectiveTab: DetailTab =
    activeTab === "foreign" && !isForeign ? "identity" : activeTab;

  const statusBadgeClass =
    resident.status === "Thường trú"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : resident.status === "Tạm trú"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  const maskedIdValue = (() => {
    const raw = isForeign ? resident.passportNumber || resident.cccd : resident.cccd;
    if (!raw) return "Chưa cập nhật";
    if (showFullCccd) return raw;
    if (raw.length >= 9) {
      return `${raw.slice(0, 4)} ••• ••• ${raw.slice(-3)}`;
    }
    return raw;
  })();

  const temporaryExpiry =
    resident.status === "Tạm trú" || resident.temporaryRegDate || resident.temporaryExpDate
      ? getTemporaryResidenceExpiryStatus(resident.temporaryExpDate)
      : null;

  const hostelInfo = parseAccommodationInfo(
    resident.currentAddress || resident.temporaryAddress || resident.address
  );

  return (
    <div id="resident-detail-page" className="space-y-5">
      {/* Top Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-to-residents-from-detail"
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Danh sách Dân cư</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">Quản lý Dân cư</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-emerald-700 truncate max-w-[200px] sm:max-w-xs">
            {resident.fullName}
          </span>
        </nav>
      </div>

      {/* Main Executive Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden text-slate-800">
        {/* Executive Header */}
        <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-5 sm:px-6 pt-5 pb-5 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <Shield size={11} className="text-blue-600" /> CSDL DÂN CƯ ĐỀ ÁN 06/CP
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Định danh điện tử VNeID Khu phố 3, P. An Phú
              </span>
            </div>

            <button
              type="button"
              id="btn-detail-header-edit"
              onClick={() => navigate(getResidentEditPath(resident.id))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Edit2 size={13} />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img
                id="detail-resident-avatar"
                src={
                  resident.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
                }
                alt={resident.fullName}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border border-slate-200/90 shadow-2xs object-cover bg-slate-100"
                referrerPolicy="no-referrer"
              />
              {resident.policyGroup?.includes("Đảng viên") && (
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-xs"
                  title="Đảng viên ĐCSVN"
                >
                  ★
                </span>
              )}
              {isForeign && !resident.policyGroup?.includes("Đảng viên") && (
                <span
                  className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-purple-600 border-2 border-white text-[10px] text-white font-bold shadow-xs"
                  title={resident.nationality}
                >
                  {getCountryFlag(resident.nationality)}
                </span>
              )}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  MÃ: {resident.id}
                </span>
                {linkedHousehold ? (
                  <button
                    type="button"
                    onClick={() => setShowHouseholdModal(true)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer transition-colors"
                    title="Xem nhanh Sổ hộ tịch liên kết"
                  >
                    HỘ: {resident.householdId}
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    HỘ: {resident.householdId}
                  </span>
                )}
                {isForeign ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <span>{getCountryFlag(resident.nationality)}</span>
                    <span>{resident.nationality}</span>
                  </span>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusBadgeClass}`}
                  >
                    {resident.status}
                  </span>
                )}
                {resident.relationToOwner && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {resident.relationToOwner}
                  </span>
                )}
              </div>

              <h1
                id="detail-resident-name"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug"
              >
                {resident.fullName}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1 text-slate-700">
                  <MapPin size={13} className="text-emerald-600 shrink-0" />
                  <span>{resident.currentAddress || resident.address}</span>
                </div>
                {resident.birthDate && (
                  <span className="text-slate-400">
                    • Sinh ngày: <strong className="text-slate-700">{resident.birthDate}</strong>
                  </span>
                )}
                {resident.gender && (
                  <span className="text-slate-400">
                    • Giới tính: <strong className="text-slate-700">{resident.gender}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div
          role="tablist"
          aria-label="Chi tiết hồ sơ cư dân"
          className="flex border-b border-slate-200 bg-white px-5 sm:px-6 gap-6 text-xs font-bold overflow-x-auto"
        >
          <button
            type="button"
            id="detail-tab-btn-identity"
            role="tab"
            aria-selected={effectiveTab === "identity"}
            aria-controls="detail-tab-panel-identity"
            onClick={() => setActiveTab("identity")}
            className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              effectiveTab === "identity"
                ? "text-blue-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard size={15} />
            <span>Định danh & Nhân thân</span>
            {effectiveTab === "identity" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700" />
            )}
          </button>

          <button
            type="button"
            id="detail-tab-btn-residence"
            role="tab"
            aria-selected={effectiveTab === "residence"}
            aria-controls="detail-tab-panel-residence"
            onClick={() => setActiveTab("residence")}
            className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              effectiveTab === "residence"
                ? "text-blue-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Home size={15} />
            <span>Hộ tịch & Nơi cư trú</span>
            {effectiveTab === "residence" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700" />
            )}
          </button>

          <button
            type="button"
            id="detail-tab-btn-social"
            role="tab"
            aria-selected={effectiveTab === "social"}
            aria-controls="detail-tab-panel-social"
            onClick={() => setActiveTab("social")}
            className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              effectiveTab === "social"
                ? "text-blue-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award size={15} />
            <span>Đoàn thể & Y tế - Xã hội</span>
            {effectiveTab === "social" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700" />
            )}
          </button>

          {isForeign && (
            <button
              type="button"
              id="detail-tab-btn-foreign"
              role="tab"
              aria-selected={effectiveTab === "foreign"}
              aria-controls="detail-tab-panel-foreign"
              onClick={() => setActiveTab("foreign")}
              className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                effectiveTab === "foreign"
                  ? "text-purple-700 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Globe size={15} />
              <span>Thị thực & Xuất nhập cảnh</span>
              {effectiveTab === "foreign" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-700" />
              )}
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 space-y-5 bg-slate-50/70 text-xs sm:text-sm">
          {/* TAB 1: IDENTITY */}
          {effectiveTab === "identity" && (
            <div
              id="detail-tab-panel-identity"
              role="tabpanel"
              aria-labelledby="detail-tab-btn-identity"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden animate-in fade-in duration-200 divide-y divide-slate-100"
            >
              <div className="p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard size={15} className="text-blue-600" />
                      {isForeign
                        ? "Thông tin Hộ chiếu Quốc tế"
                        : "Thẻ Căn cước công dân (Định danh điện tử)"}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Xác thực CCCD gắn chip theo CSDL Quốc gia về dân cư
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowFullCccd(!showFullCccd)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Bật/Tắt che số định danh (Nghị định 13/2023/NĐ-CP)"
                    >
                      {showFullCccd ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showFullCccd ? "Ẩn số" : "Hiện số"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const val = isForeign
                          ? resident.passportNumber || resident.cccd
                          : resident.cccd;
                        if (val) {
                          navigator.clipboard.writeText(val);
                          setCopiedCccd(true);
                          setTimeout(() => setCopiedCccd(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      {copiedCccd ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                      <span>{copiedCccd ? "Đã chép!" : "Sao chép"}</span>
                    </button>
                  </div>
                </div>

                <DetailGrid>
                  <DetailRow
                    label={isForeign ? "Số Hộ chiếu:" : "Số định danh / CCCD:"}
                    value={maskedIdValue}
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

              <div className="p-4 sm:p-5 bg-slate-50/30 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck size={15} className="text-blue-600" />
                    Lai lịch & Thông tin Nhân thân Công dân
                  </h2>
                  <span className="text-[11px] text-slate-400">Hồ sơ công dân KP3</span>
                </div>

                <DetailGrid>
                  <DetailRow label="Ngày sinh" value={resident.birthDate} isMono />
                  <DetailRow label="Giới tính" value={resident.gender} />
                  <DetailRow label="Dân tộc" value={resident.ethnicity || "Kinh"} />
                  <DetailRow label="Tôn giáo" value={resident.religion || "Không"} />
                  <DetailRow
                    label="Quê quán (Nguyên quán)"
                    value={resident.hometown}
                    colSpan={2}
                  />
                  <DetailRow
                    label="Quốc tịch"
                    value={
                      <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <span>{getCountryFlag(resident.nationality)}</span>
                        <span>{resident.nationality || "Việt Nam"}</span>
                      </span>
                    }
                  />
                  <DetailRow label="Trình độ học vấn" value={resident.education || "12/12"} />
                  <DetailRow label="Tình trạng hôn nhân" value={resident.maritalStatus} />
                  <DetailRow label="Nghề nghiệp" value={resident.occupation || "Tự do"} />
                  <DetailRow
                    label="Họ tên cha"
                    value={resident.fatherName || "Chưa ghi nhận"}
                  />
                  <DetailRow
                    label="Họ tên mẹ"
                    value={resident.motherName || "Chưa ghi nhận"}
                  />
                </DetailGrid>
              </div>
            </div>
          )}

          {/* TAB 2: RESIDENCE & HOUSEHOLD */}
          {effectiveTab === "residence" && (
            <div
              id="detail-tab-panel-residence"
              role="tabpanel"
              aria-labelledby="detail-tab-btn-residence"
              className="space-y-4 animate-in fade-in duration-200"
            >
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Home size={16} className="text-emerald-600" />
                    Hồ sơ Hộ tịch & Nơi cư trú
                  </h2>
                  {linkedHousehold ? (
                    <button
                      type="button"
                      onClick={() => setShowHouseholdModal(true)}
                      className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer transition-colors"
                    >
                      MÃ HỘ: {resident.householdId} (Xem thành viên)
                    </button>
                  ) : (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      MÃ HỘ: {resident.householdId}
                    </span>
                  )}
                </div>

                <DetailGrid>
                  <DetailRow
                    label="Diện cư trú"
                    value={
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${statusBadgeClass}`}
                      >
                        {resident.status}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Quan hệ với chủ hộ"
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
                    label="Chỗ ở hiện tại / Tạm trú KP3"
                    value={resident.currentAddress || resident.temporaryAddress || resident.address}
                    colSpan={2}
                  />
                </DetailGrid>

                {(resident.status === "Tạm trú" ||
                  resident.temporaryRegDate ||
                  resident.temporaryExpDate) && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <DetailGrid>
                      <DetailRow
                        label="Ngày đăng ký tạm trú"
                        value={resident.temporaryRegDate || "Chưa ghi nhận"}
                        isMono
                      />
                      <DetailRow
                        label="Ngày hết hạn tạm trú"
                        value={resident.temporaryExpDate || "Chưa ghi nhận"}
                        isMono
                      />
                    </DetailGrid>

                    {temporaryExpiry && temporaryExpiry.status !== "unknown" && (
                      <div
                        className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                          temporaryExpiry.isWarning
                            ? "bg-amber-50 border-amber-300 text-amber-950 animate-pulse"
                            : temporaryExpiry.isExpired
                              ? "bg-rose-50 border-rose-300 text-rose-950"
                              : "bg-emerald-50 border-emerald-200 text-emerald-900"
                        }`}
                      >
                        {temporaryExpiry.isWarning ? (
                          <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                        ) : temporaryExpiry.isExpired ? (
                          <AlertCircle size={18} className="text-rose-700 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 text-xs">
                          <div className="font-bold flex items-center gap-2">
                            <span>{temporaryExpiry.label}</span>
                            {temporaryExpiry.isWarning && (
                              <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                                Cảnh báo trước 30 ngày
                              </span>
                            )}
                          </div>
                          <p className="opacity-90 mt-1 leading-relaxed">
                            {temporaryExpiry.isWarning
                              ? "Cảnh báo trước 01 tháng: Cán bộ khu phố / CSKV cần liên hệ cơ sở lưu trú và cư dân hướng dẫn nộp hồ sơ gia hạn tạm trú trực tuyến trên Cổng Dịch vụ công."
                              : temporaryExpiry.isExpired
                                ? "Đã quá hạn đăng ký tạm trú: Cần kiểm tra nơi ở hiện tại thực tế và nhắc nhở công dân hoặc lập biên bản xử lý theo Luật Cư trú."
                                : `Thời hạn cư trú hợp lệ đến ngày ${temporaryExpiry.formattedDate}.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {hostelInfo.isHostel && (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                        <Building2 size={15} className="text-amber-700" />
                        Cơ sở Lưu trú / Nhà trọ Quản lý
                      </span>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                        Đã đối soát CSKD
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-amber-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Tên cơ sở / Nhà trọ:</span>
                        <strong className="text-slate-900">{hostelInfo.hostelName}</strong>
                      </div>
                      {hostelInfo.owner && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Chủ nhà trọ:</span>
                          <strong className="text-slate-800">{hostelInfo.owner}</strong>
                        </div>
                      )}
                      {hostelInfo.phone && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Số điện thoại chủ trọ:</span>
                          <a
                            href={`tel:${hostelInfo.phone}`}
                            className="inline-flex items-center gap-1 text-emerald-700 font-mono font-bold hover:underline bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                          >
                            <Phone size={11} /> {hostelInfo.phone} (Gọi ngay)
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Compass size={13} className="text-emerald-400" /> Bản đồ số GIS & Dẫn đường
                    </span>
                    <div className="text-slate-300">
                      Địa chỉ dẫn đường:{" "}
                      <strong className="text-emerald-300 font-medium">{resident.address}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDirections(resident)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Navigation size={13} />
                    <span>Chỉ đường trên Bản đồ GIS</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOCIAL & HEALTH */}
          {effectiveTab === "social" && (
            <div
              id="detail-tab-panel-social"
              role="tabpanel"
              aria-labelledby="detail-tab-btn-social"
              className="space-y-4 animate-in fade-in duration-200"
            >
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Award size={16} className="text-rose-600" />
                  Chính sách, Đoàn thể & Chăm sóc Xã hội
                </h2>

                <DetailGrid>
                  <DetailRow
                    label="Diện chính sách / Đoàn thể"
                    value={resident.policyGroup || "Dân cư phổ thông"}
                  />
                  <DetailRow
                    label="Mã thẻ BHYT"
                    value={resident.healthInsuranceNumber}
                    isMono
                  />
                  <DetailRow
                    label="Nghĩa vụ quân sự"
                    value={resident.militaryServiceStatus}
                  />
                  <DetailRow
                    label="Số điện thoại liên lạc"
                    value={
                      <span className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                        <Phone size={13} className="text-slate-400" />
                        {resident.phone && resident.phone !== "N/A"
                          ? resident.phone
                          : "Chưa cập nhật"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Nơi làm việc / Công tác"
                    value={resident.workplace || "Chưa cập nhật"}
                  />
                  <DetailRow
                    label="Người liên hệ khẩn cấp"
                    value={resident.emergencyContact}
                    colSpan={2}
                  />
                </DetailGrid>

                {resident.notes && (
                  <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
                    <span className="text-[11px] font-bold text-amber-900 block mb-1">
                      Ghi chú quản lý nghiệp vụ:
                    </span>
                    <p className="text-slate-800 leading-relaxed italic">
                      &ldquo;{resident.notes}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FOREIGNER */}
          {effectiveTab === "foreign" && isForeign && (
            <div
              id="detail-tab-panel-foreign"
              role="tabpanel"
              aria-labelledby="detail-tab-btn-foreign"
              className="space-y-4 animate-in fade-in duration-200"
            >
              <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
                  <h2 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
                    <Globe size={16} className="text-purple-600" />
                    Hồ sơ Thị thực & Quản lý Người nước ngoài
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold">
                    {getCountryFlag(resident.nationality)} {resident.nationality}
                  </span>
                </div>

                <DetailGrid>
                  <DetailRow
                    label="Số Hộ chiếu (Passport No.)"
                    value={resident.passportNumber || resident.cccd}
                    isMono
                  />
                  <DetailRow
                    label="Hạn hiệu lực Hộ chiếu"
                    value={resident.passportExpiryDate || "Không thời hạn"}
                    isMono
                  />
                  <DetailRow
                    label="Loại thị thực / Cư trú"
                    value={resident.visaOrCardType || "Thẻ tạm trú (TRC)"}
                  />
                  <DetailRow
                    label="Thời hạn cư trú"
                    value={`Từ ${resident.visaValidFrom || "01/01/2023"} đến ${resident.visaValidUntil || "31/12/2026"}`}
                    isMono
                  />
                  <DetailRow
                    label="Mã KB tạm trú CA Phường"
                    value={resident.temporaryRegistrationCode || "KBTT-AP-2024-ONLINE"}
                    isMono
                  />
                  <DetailRow
                    label="Tình trạng khai báo"
                    value={
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {resident.temporaryRegistrationStatus || "Đã khai báo"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Giấy phép lao động (GPLĐ)"
                    value={resident.workPermitNumber || "Miễn GPLĐ / Chuyên gia"}
                    isMono
                  />
                  <DetailRow
                    label="Cơ quan / Đơn vị bảo lãnh"
                    value={resident.sponsoringOrganization || resident.workplace || "Tự do"}
                  />
                  <DetailRow
                    label="Chủ nhà / Cơ sở cho thuê"
                    value={resident.landlordContact}
                    colSpan={2}
                  />
                </DetailGrid>
              </div>
            </div>
          )}
        </div>

        {/* Standardized Action Footer */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isForeign ? (
              <button
                type="button"
                id="btn-detail-print-na17"
                onClick={() => setShowNA17Modal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <FileText size={14} className="text-purple-700" />
                <span>In Mẫu NA17</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-detail-print-ct07"
                onClick={() => setShowCT07Modal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Printer size={14} className="text-emerald-700" />
                <span>In Mẫu CT07</span>
              </button>
            )}
            <button
              type="button"
              id="btn-detail-directions"
              onClick={() => handleDirections(resident)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Navigation size={13} />
              <span>Chỉ đường GIS</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-detail-edit"
              onClick={() => navigate(getResidentEditPath(resident.id))}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Edit2 size={13} />
              <span>Sửa</span>
            </button>
            <button
              type="button"
              id="btn-detail-delete"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Xóa</span>
            </button>
            <button
              type="button"
              id="btn-detail-back-footer"
              onClick={handleBackToList}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowDeleteConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-resident-confirm-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div className="space-y-1">
                <h3
                  id="delete-resident-confirm-title"
                  className="text-sm font-extrabold text-slate-900"
                >
                  Xác nhận xóa hồ sơ cư dân
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn có chắc muốn xóa vĩnh viễn cư dân{" "}
                  <strong className="text-slate-900">{resident.fullName}</strong> khỏi danh sách quản lý?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-delete-resident"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteResident(resident.id, resident.fullName);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linked Household Members Modal */}
      {showHouseholdModal && linkedHousehold && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowHouseholdModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Sổ hộ tịch ${linkedHousehold.code}`}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            <div className="bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {linkedHousehold.code}
                </span>
                <span className="text-xs font-bold text-slate-600">SỔ HỘ TỊCH ĐIỆN TỬ</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHouseholdModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng sổ hộ tịch"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hộ gia đình: {linkedHousehold.ownerName}
                </h3>
                <p className="text-slate-600 flex items-center gap-1 mt-1 font-medium">
                  <MapPin size={13} className="text-emerald-600 shrink-0" />
                  <span>{linkedHousehold.address}</span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Danh sách nhân khẩu trong hộ (
                    {linkedHousehold.members?.length || linkedHousehold.memberCount || 0} người)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {linkedHousehold.type || "Thường trú"}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {(linkedHousehold.members || []).map((m, idx) => (
                    <div
                      key={`${m.cccd}-${idx}`}
                      className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-slate-200/70 text-xs shadow-2xs"
                    >
                      <div>
                        <strong className="text-slate-900 block">{m.name}</strong>
                        <span className="text-slate-500 font-mono text-[10.5px]">
                          Sinh: {m.birthYear || "—"} • CCCD: {m.cccd}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.relation === "Chủ hộ"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {m.relation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHouseholdModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modals */}
      <ResidentCT07Modal
        resident={resident}
        isOpen={showCT07Modal}
        onClose={() => setShowCT07Modal(false)}
      />
      <ResidentNA17Modal
        resident={resident}
        isOpen={showNA17Modal}
        onClose={() => setShowNA17Modal(false)}
      />
    </div>
  );
}

