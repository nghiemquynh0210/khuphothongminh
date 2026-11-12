import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Compass,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  History,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  Trash2,
  Undo2,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { Household, Resident, TargetGisItem } from "../types";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import HouseholdBusinesses from "../components/household/HouseholdBusinesses";
import HouseholdMemberProfile from "../components/household/HouseholdMemberProfile";
import HouseholdGisPinModal from "../components/household/HouseholdGisPinModal";
import {
  ROUTES,
  getHouseholdAddMemberPath,
  getHouseholdEditPath,
  getHouseholdTreePath,
  getResidentDetailPath,
  navigate
} from "../routes";
import {
  getGoogleMapsDirectionUrl,
  parseCoordinates as parseGisCoords
} from "../utils/gisUtils";
import {
  appendHouseholdAuditEntry,
  buildGisTargetForHousehold,
  findHouseholdByIdOrCode,
  findResidentByCccd,
  isHouseholdSoftDeleted,
  maskCitizenId,
  restoreSoftDeletedHousehold
} from "../utils/householdFormUtils";

export interface HouseholdDetailPageProps {
  householdId: string;
  households: Household[];
  residents: Resident[];
  isDataLoading?: boolean;
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onShowToast?: (message: string) => void;
}

type HouseholdDetailTab = "members" | "businesses" | "history";

export default function HouseholdDetailPage({
  householdId,
  households,
  residents,
  isDataLoading = false,
  onUpdateHouseholds,
  onUpdateResidents,
  onNavigateToGis,
  onShowToast
}: HouseholdDetailPageProps) {
  const household = useMemo(
    () => findHouseholdByIdOrCode(households, householdId),
    [households, householdId]
  );

  const [detailTab, setDetailTab] = useState<HouseholdDetailTab>("members");
  const [showFullCccd, setShowFullCccd] = useState(false);

  // Quick member profile modal
  const [profileViewMember, setProfileViewMember] = useState<{
    name: string;
    relation: string;
    cccd: string;
    birthYear: number;
    phone?: string;
  } | null>(null);

  // GIS Pin modal
  const [gisPinTarget, setGisPinTarget] = useState<Household | null>(null);

  // Move member modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetMember, setMoveTargetMember] = useState<{
    name: string;
    cccd: string;
  } | null>(null);
  const [moveTargetHCode, setMoveTargetHCode] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  // Split household modal
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSelectedCccds, setSplitSelectedCccds] = useState<string[]>([]);
  const [splitNewHCode, setSplitNewHCode] = useState("");
  const [splitNewOwner, setSplitNewOwner] = useState("");
  const [splitNewAddress, setSplitNewAddress] = useState("");
  const [splitNewCoordinates, setSplitNewCoordinates] = useState("");
  const [splitError, setSplitError] = useState<string | null>(null);

  // Confirmations (replacing native alert/confirm)
  const [memberToRemove, setMemberToRemove] = useState<{
    name: string;
    cccd: string;
    relation: string;
  } | null>(null);
  const [showDeleteHouseholdModal, setShowDeleteHouseholdModal] = useState(false);

  const handleBackToList = () => {
    navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
  };

  if (!household && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải sổ hộ khẩu...</h2>
        <p className="text-xs text-slate-500">
          Hệ thống đang đồng bộ thông tin hộ tịch và nhân khẩu từ cơ sở dữ liệu Khu phố 3.
        </p>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy Sổ Hộ Khẩu</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Mã sổ <span className="font-mono font-bold text-slate-800">{householdId}</span> không tồn tại hoặc đã bị xóa khỏi danh sách quản lý.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Danh sách Hộ khẩu</span>
          </button>
        </div>
      </div>
    );
  }

  const isDeleted = isHouseholdSoftDeleted(household);
  const hType = household.type || "Thường trú";
  const membersList = household.members || [];

  const handleDirections = (targetH: Household) => {
    const { target, resolvedCoordinates, wasAutoGenerated } = buildGisTargetForHousehold(targetH);
    if (wasAutoGenerated) {
      onUpdateHouseholds(prev =>
        prev.map(item =>
          item.id === targetH.id ? { ...item, coordinates: resolvedCoordinates } : item
        )
      );
    }
    onNavigateToGis?.(target);
  };

  const handleSavePinCoordinates = (
    targetH: Household,
    finalCoord: string,
    andNavigate: boolean
  ) => {
    onUpdateHouseholds(prev =>
      prev.map(h =>
        h.id === targetH.id
          ? {
              ...h,
              coordinates: finalCoord,
              auditHistory: appendHouseholdAuditEntry(
                h,
                `Cập nhật tọa độ GIS (${finalCoord})`
              )
            }
          : h
      )
    );
    setGisPinTarget(null);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: targetH.id,
        type: "household",
        name: `Hộ ${targetH.ownerName} (${targetH.code})`,
        address: targetH.address,
        coordinates: finalCoord,
        navigateRoute: true
      });
    } else {
      onShowToast?.(
        `Đã đồng bộ tọa độ Hộ ${targetH.ownerName} (${finalCoord}) lên bản đồ GIS!`
      );
    }
  };

  const startMoveMember = (name: string, cccd: string) => {
    const defaultTarget = households.find(
      h => h.id !== household.id && !isHouseholdSoftDeleted(h)
    );
    setMoveTargetMember({ name, cccd });
    setMoveTargetHCode(defaultTarget?.code || "");
    setMoveError(null);
    setShowMoveModal(true);
  };

  const handlePerformMoveMember = () => {
    if (!moveTargetMember || !moveTargetHCode) {
      setMoveError("Vui lòng lựa chọn Sổ hộ khẩu đích.");
      return;
    }

    const targetH = households.find(h => h.code === moveTargetHCode);
    if (!targetH) {
      setMoveError("Hộ tịch đích không tồn tại trong hệ thống.");
      return;
    }

    const memberToMove = membersList.find(m => m.cccd === moveTargetMember.cccd);
    if (!memberToMove) return;

    const updatedSourceMembers = membersList.filter(
      m => m.cccd !== moveTargetMember.cccd
    );
    const updatedTargetMembers = [
      ...targetH.members,
      {
        ...memberToMove,
        relation: "Thành viên mới chuyển đến"
      }
    ];

    onUpdateHouseholds(prev =>
      prev.map(h => {
        if (h.id === household.id) {
          return {
            ...h,
            members: updatedSourceMembers,
            memberCount: updatedSourceMembers.length,
            auditHistory: appendHouseholdAuditEntry(
              h,
              `Chuyển nhân khẩu ${moveTargetMember.name} sang sổ ${targetH.code}`
            )
          };
        }
        if (h.id === targetH.id) {
          return {
            ...h,
            members: updatedTargetMembers,
            memberCount: updatedTargetMembers.length,
            auditHistory: appendHouseholdAuditEntry(
              h,
              `Tiếp nhận nhân khẩu ${moveTargetMember.name} chuyển đến từ sổ ${household.code}`
            )
          };
        }
        return h;
      })
    );

    onUpdateResidents(prev =>
      prev.map(r =>
        r.cccd === moveTargetMember.cccd
          ? {
              ...r,
              householdId: targetH.code,
              address: targetH.address,
              relationToOwner: "Thành viên mới chuyển đến"
            }
          : r
      )
    );

    setShowMoveModal(false);
    onShowToast?.(
      `Đã chuyển nhân khẩu ${moveTargetMember.name} sang sổ ${targetH.code} thành công.`
    );
  };

  const startSplitHousehold = () => {
    setSplitSelectedCccds([]);
    setSplitNewHCode(`HK-${Math.floor(300 + Math.random() * 100)}`);
    setSplitNewOwner("");
    setSplitNewAddress(household.address || "");
    setSplitNewCoordinates(household.coordinates || "");
    setSplitError(null);
    setShowSplitModal(true);
  };

  const toggleSelectSplitMember = (cccd: string) => {
    setSplitError(null);
    if (splitSelectedCccds.includes(cccd)) {
      setSplitSelectedCccds(prev => prev.filter(c => c !== cccd));
      if (splitNewOwner === cccd) setSplitNewOwner("");
    } else {
      setSplitSelectedCccds(prev => [...prev, cccd]);
      if (!splitNewOwner) setSplitNewOwner(cccd);
    }
  };

  const handlePerformSplitHousehold = () => {
    if (
      splitSelectedCccds.length === 0 ||
      !splitNewHCode.trim() ||
      !splitNewOwner ||
      !splitNewAddress.trim()
    ) {
      setSplitError(
        "Vui lòng chọn ít nhất một thành viên, nhập mã sổ mới, chủ hộ mới và địa chỉ đăng ký."
      );
      return;
    }

    const cleanCode = splitNewHCode.trim();
    if (
      households.some(
        h => h.code.trim().toUpperCase() === cleanCode.toUpperCase()
      )
    ) {
      setSplitError(`Mã sổ ${cleanCode} đã tồn tại. Vui lòng chọn mã sổ khác.`);
      return;
    }

    const membersToSplit = membersList.filter(m =>
      splitSelectedCccds.includes(m.cccd)
    );
    const newHMembers = membersToSplit.map(m => ({
      ...m,
      relation: m.cccd === splitNewOwner ? "Chủ hộ" : "Thành viên tách hộ"
    }));

    const newH: Household = {
      id: "H" + (households.length + 1).toString().padStart(3, "0") + "-" + Date.now().toString().slice(-3),
      code: cleanCode,
      ownerName:
        membersList.find(m => m.cccd === splitNewOwner)?.name || "Chưa xác định",
      address: splitNewAddress.trim(),
      type: household.type || "Thường trú",
      memberCount: newHMembers.length,
      coordinates: splitNewCoordinates || undefined,
      members: newHMembers,
      auditHistory: [
        {
          date: new Date().toLocaleString("vi-VN"),
          action: `Tách hộ thành lập sổ mới từ sổ nguồn ${household.code}`,
          actor: "Cán bộ Tư pháp"
        }
      ]
    };

    const updatedOriginalMembers = membersList.filter(
      m => !splitSelectedCccds.includes(m.cccd)
    );

    onUpdateHouseholds(prev => [
      ...prev.map(h =>
        h.id === household.id
          ? {
              ...h,
              members: updatedOriginalMembers,
              memberCount: updatedOriginalMembers.length,
              auditHistory: appendHouseholdAuditEntry(
                h,
                `Tách ${membersToSplit.length} nhân khẩu sang sổ mới ${cleanCode}`
              )
            }
          : h
      ),
      newH
    ]);

    onUpdateResidents(prev =>
      prev.map(r =>
        splitSelectedCccds.includes(r.cccd)
          ? {
              ...r,
              householdId: cleanCode,
              address: splitNewAddress.trim(),
              relationToOwner:
                r.cccd === splitNewOwner ? "Chủ hộ" : "Thành viên tách hộ"
            }
          : r
      )
    );

    setShowSplitModal(false);
    onShowToast?.(
      `Tách hộ tịch thành công! Sổ mới ${cleanCode} đã được khởi tạo.`
    );
  };

  const handleConfirmRemoveMember = () => {
    if (!memberToRemove) return;
    const updatedMembers = membersList.filter(
      m => m.cccd !== memberToRemove.cccd
    );

    onUpdateHouseholds(prev =>
      prev.map(h =>
        h.id === household.id
          ? {
              ...h,
              members: updatedMembers,
              memberCount: updatedMembers.length,
              auditHistory: appendHouseholdAuditEntry(
                h,
                `Xóa thành viên ${memberToRemove.name} khỏi sổ hộ khẩu`
              )
            }
          : h
      )
    );

    onUpdateResidents(prev =>
      prev.map(r =>
        r.cccd === memberToRemove.cccd
          ? {
              ...r,
              householdId: "N/A",
              relationToOwner: "Tự do"
            }
          : r
      )
    );

    const removedName = memberToRemove.name;
    setMemberToRemove(null);
    onShowToast?.(`Đã xóa nhân khẩu ${removedName} khỏi sổ ${household.code}.`);
  };

  const handleConfirmSoftDeleteHousehold = () => {
    if (membersList.length > 0) return;

    onUpdateHouseholds(prev =>
      prev.map(h =>
        h.id === household.id
          ? {
              ...h,
              deletedAt: new Date().toISOString(),
              deletedBy: "Cán bộ Hành chính Phường",
              auditHistory: appendHouseholdAuditEntry(
                h,
                "Chuyển sổ hộ khẩu vào mục lưu trữ (Soft Delete)"
              )
            }
          : h
      )
    );
    setShowDeleteHouseholdModal(false);
    onShowToast?.(`Đã chuyển Sổ hộ khẩu ${household.code} vào thùng rác lưu trữ.`);
    navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
  };

  const handleRestoreHousehold = () => {
    onUpdateHouseholds(prev =>
      prev.map(h => (h.id === household.id ? restoreSoftDeletedHousehold(h) : h))
    );
    onShowToast?.(`Khôi phục Sổ hộ khẩu ${household.code} thành công!`);
  };

  const matchedProfileResident = profileViewMember
    ? findResidentByCccd(residents, profileViewMember.cccd)
    : null;

  const fallbackProfileResident: Resident | null = profileViewMember
    ? matchedProfileResident || {
        id: profileViewMember.cccd || "N/A",
        fullName: profileViewMember.name,
        gender: "Nam",
        birthDate: profileViewMember.birthYear
          ? `01/01/${profileViewMember.birthYear}`
          : "Chưa cập nhật",
        cccd: profileViewMember.cccd,
        phone: profileViewMember.phone || "Chưa đăng ký",
        status: hType,
        occupation: "Chưa cập nhật",
        address: household.address,
        householdId: household.code,
        relationToOwner: profileViewMember.relation
      }
    : null;

  return (
    <div id="household-detail-page" className="space-y-5">
      {/* Top Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-to-households-from-detail"
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Danh sách Hộ khẩu</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">Quản lý Hộ khẩu</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-emerald-700 truncate max-w-[220px] sm:max-w-xs">
            {household.code} • {household.ownerName}
          </span>
        </nav>
      </div>

      {/* Main Executive Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden text-slate-800">
        {/* Executive Header */}
        <div className="bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 px-5 sm:px-6 pt-5 pb-5 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                SỔ HỘ KHẨU ĐIỆN TỬ
              </span>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                {household.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  hType === "Tạm trú"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                {hType}
              </span>
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Users size={12} className="text-emerald-600" />
                <span>{membersList.length} nhân khẩu</span>
              </span>
              {isDeleted && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Đang lưu trữ (Đã xóa)
                </span>
              )}
            </div>

            <button
              type="button"
              id="btn-detail-header-edit"
              onClick={() => navigate(getHouseholdEditPath(household.id))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Chỉnh sửa Sổ</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Home size={28} className="text-emerald-700" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h1
                id="detail-household-title"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug break-words"
              >
                Hộ gia đình: {household.ownerName}
              </h1>

              {/* Address & GIS Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 min-w-0">
                  <MapPin size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate max-w-md">{household.address}</span>
                  {household.coordinates && (
                    <span className="text-[11px] text-slate-400 font-mono hidden lg:inline">
                      • ({household.coordinates})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleDirections(household)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Dẫn đường trực tiếp trên bản đồ số GIS Khu phố 3"
                  >
                    <Navigation size={11} />
                    <span>Dẫn đường GIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGisPinTarget(household)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Cập nhật tọa độ ghim trên bản đồ GIS"
                  >
                    <Compass size={11} className="text-indigo-600" />
                    <span>{household.coordinates ? "Sửa tọa độ" : "Ghim GIS"}</span>
                  </button>

                  {household.coordinates && (
                    <a
                      href={getGoogleMapsDirectionUrl(
                        parseGisCoords(household.coordinates)?.lat || 10.936997,
                        parseGisCoords(household.coordinates)?.lng || 106.744645,
                        household.address
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Mở chỉ đường bằng Google Maps"
                    >
                      <ExternalLink size={10} />
                      <span>Google Maps</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div
          role="tablist"
          aria-label="Chi tiết sổ hộ khẩu"
          className="flex border-b border-slate-200 bg-white px-5 sm:px-6 gap-6 text-xs font-bold overflow-x-auto"
        >
          <button
            type="button"
            id="household-tab-btn-members"
            role="tab"
            aria-selected={detailTab === "members"}
            aria-controls="household-tab-panel-members"
            onClick={() => setDetailTab("members")}
            className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              detailTab === "members"
                ? "text-emerald-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={15} />
            <span>Thành viên nhân khẩu ({membersList.length})</span>
            {detailTab === "members" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600" />
            )}
          </button>

          <button
            type="button"
            id="household-tab-btn-businesses"
            role="tab"
            aria-selected={detailTab === "businesses"}
            aria-controls="household-tab-panel-businesses"
            onClick={() => setDetailTab("businesses")}
            className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              detailTab === "businesses"
                ? "text-indigo-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Home size={15} />
            <span>Hộ kinh doanh tại địa chỉ</span>
            {detailTab === "businesses" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
            )}
          </button>

          <button
            type="button"
            id="household-tab-btn-history"
            role="tab"
            aria-selected={detailTab === "history"}
            aria-controls="household-tab-panel-history"
            onClick={() => setDetailTab("history")}
            className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              detailTab === "history"
                ? "text-slate-900 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History size={15} />
            <span>Nhật ký biến động</span>
            {detailTab === "history" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900" />
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 space-y-5 bg-slate-50/70">
          {detailTab === "members" && (
            <div
              id="household-tab-panel-members"
              role="tabpanel"
              aria-labelledby="household-tab-btn-members"
              className="space-y-5 animate-in fade-in duration-150"
            >
              {/* Summary List Matrix (GOV.UK / Đề án 06 Standard) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Thông tin chung Sổ Hộ Khẩu
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {household.id}
                  </span>
                </div>
                <DetailGrid>
                  <DetailRow label="Mã số Sổ" value={household.code} isMono />
                  <DetailRow label="Phân hệ cư trú" value={hType} />
                  <DetailRow label="Chủ hộ đại diện" value={household.ownerName} />
                  <DetailRow
                    label="Quy mô nhân khẩu"
                    value={`${membersList.length} người`}
                  />
                  <DetailRow
                    label="Địa chỉ đăng ký"
                    value={household.address}
                    colSpan={2}
                  />
                  <DetailRow
                    label="Tọa độ GPS GIS"
                    value={household.coordinates || "Chưa định vị"}
                    isMono
                    colSpan={household.notes ? 1 : 2}
                  />
                  {household.notes && (
                    <DetailRow label="Ghi chú biến động" value={household.notes} />
                  )}
                </DetailGrid>
              </div>

              {/* Members Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Danh sách nhân khẩu thường trú / tạm trú ({membersList.length})
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFullCccd(prev => !prev)}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-200 shadow-2xs"
                    title="Bật/Tắt che số định danh (Nghị định 13/2023/NĐ-CP)"
                  >
                    {showFullCccd ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showFullCccd ? "Ẩn CCCD" : "Hiện CCCD"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`${ROUTES.DASHBOARD_HOUSEHOLDS}?tab=recognition`)}
                    className="flex items-center gap-1.5 bg-white hover:bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-teal-200 shadow-2xs"
                    title="Tự động nhận diện chủ hộ và thành viên từ dữ liệu cư dân"
                  >
                    <Sparkles size={13} className="text-teal-600" />
                    <span>Nhận diện từ Dân cư</span>
                  </button>
                  <button
                    type="button"
                    id="btn-detail-add-member"
                    onClick={() => navigate(getHouseholdAddMemberPath(household.id))}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <UserPlus size={13} />
                    <span>Thêm nhân khẩu</span>
                  </button>
                </div>
              </div>

              {/* Members Grid */}
              {membersList.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-500 space-y-2">
                  <Users size={26} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">
                    Sổ hộ khẩu chưa có thành viên nhân khẩu nào.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(getHouseholdAddMemberPath(household.id))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer mt-1"
                  >
                    <UserPlus size={13} />
                    <span>Thêm nhân khẩu đầu tiên</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {membersList.map(m => (
                    <div
                      key={`${m.cccd}-${m.name}`}
                      className="p-3.5 bg-white hover:shadow-md border border-slate-200/90 rounded-2xl space-y-2.5 transition-all relative group shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <button
                          type="button"
                          onClick={() => setProfileViewMember(m)}
                          className="text-left cursor-pointer group-hover:text-emerald-700 transition-colors flex-1 min-w-0"
                        >
                          <h3 className="font-bold text-slate-900 text-sm hover:underline truncate">
                            {m.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                            Sinh {m.birthYear} • CCCD: {maskCitizenId(m.cccd, showFullCccd)}
                          </p>
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 ${
                            m.relation === "Chủ hộ"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {m.relation}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                        <span className="text-slate-500 font-mono text-[11px] truncate">
                          {m.phone && m.phone !== "N/A" ? m.phone : "Chưa có SĐT"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setProfileViewMember(m)}
                            className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Xem chi tiết hồ sơ nhân thân"
                          >
                            <Eye size={11} className="text-slate-500" />
                            <span>Hồ sơ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => startMoveMember(m.name, m.cccd)}
                            className="text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Chuyển sang sổ hộ khẩu khác"
                          >
                            Chuyển
                          </button>
                          {m.relation !== "Chủ hộ" && (
                            <>
                              <button
                                type="button"
                                onClick={startSplitHousehold}
                                className="text-[11px] bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer shadow-2xs"
                                title="Tách thành sổ hộ khẩu mới"
                              >
                                Tách
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(m)}
                                className="text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer"
                                title="Xóa nhân khẩu khỏi hộ"
                                aria-label={`Xóa nhân khẩu ${m.name}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {detailTab === "businesses" && (
            <div
              id="household-tab-panel-businesses"
              role="tabpanel"
              aria-labelledby="household-tab-btn-businesses"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs animate-in fade-in duration-150"
            >
              <HouseholdBusinesses household={household} residents={residents} />
            </div>
          )}

          {detailTab === "history" && (
            <div
              id="household-tab-panel-history"
              role="tabpanel"
              aria-labelledby="household-tab-btn-history"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 animate-in fade-in duration-150"
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Nhật ký biến động và sửa đổi sổ
              </span>
              {(household.auditHistory || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Chưa ghi nhận biến động chính thức nào kể từ ngày lập sổ.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {(household.auditHistory || []).map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs"
                    >
                      <History size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-800 font-semibold">{log.action}</p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {log.date} • Cán bộ: {log.actor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Standardized Action Footer */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            id="btn-detail-tree"
            onClick={() => navigate(getHouseholdTreePath(household.id))}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
          >
            <GitBranch size={14} />
            <span>Sơ đồ cây Phả Hệ Hộ Tịch</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-detail-edit"
              onClick={() => navigate(getHouseholdEditPath(household.id))}
              className="flex items-center gap-1.5 py-2 px-3.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Sửa Sổ</span>
            </button>

            {isDeleted ? (
              <button
                type="button"
                id="btn-detail-restore"
                onClick={handleRestoreHousehold}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Undo2 size={13} />
                <span>Khôi phục Sổ</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-detail-delete"
                onClick={() => setShowDeleteHouseholdModal(true)}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Xóa Sổ</span>
              </button>
            )}

            <button
              type="button"
              id="btn-detail-back-footer"
              onClick={handleBackToList}
              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>

      {/* Move Member Modal */}
      {showMoveModal && moveTargetMember && (
        <div
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowMoveModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-member-modal-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 id="move-member-modal-title" className="font-bold text-sm">
                Chuyển hộ tịch Nhân khẩu
              </h3>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại chuyển hộ"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                Đang thực hiện chuyển nhân khẩu{" "}
                <strong>{moveTargetMember.name}</strong> (CCCD:{" "}
                <span className="font-mono">{moveTargetMember.cccd}</span>) từ Sổ hộ khẩu hiện tại (
                <span className="font-mono font-bold">{household.code}</span>) sang một Sổ hộ khẩu điện tử đích khác.
              </p>

              <div className="space-y-1">
                <label htmlFor="move-target-household-select" className="font-bold text-slate-600 block">
                  Lựa chọn Sổ hộ khẩu đích
                </label>
                <select
                  id="move-target-household-select"
                  value={moveTargetHCode}
                  onChange={e => {
                    setMoveTargetHCode(e.target.value);
                    setMoveError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {households
                    .filter(h => h.id !== household.id && !isHouseholdSoftDeleted(h))
                    .map(h => (
                      <option key={h.id} value={h.code}>
                        {h.code} - Hộ {h.ownerName} ({h.address})
                      </option>
                    ))}
                </select>
              </div>

              {moveError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{moveError}</span>
                </p>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handlePerformMoveMember}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Xác nhận chuyển hộ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Household Modal */}
      {showSplitModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowSplitModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="split-household-modal-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 id="split-household-modal-title" className="font-bold text-sm">
                  Tách hộ tịch (Chia tách gia đình)
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Sổ nguồn: {household.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại tách hộ"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-600 block">
                  Tích chọn các thành viên muốn tách sổ *
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  {membersList
                    .filter(m => m.relation !== "Chủ hộ")
                    .map(m => (
                      <div key={m.cccd} className="flex items-center gap-2 select-none">
                        <input
                          type="checkbox"
                          id={`split-${m.cccd}`}
                          checked={splitSelectedCccds.includes(m.cccd)}
                          onChange={() => toggleSelectSplitMember(m.cccd)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded cursor-pointer"
                        />
                        <label
                          htmlFor={`split-${m.cccd}`}
                          className="text-slate-700 cursor-pointer font-semibold"
                        >
                          {m.name} ({m.relation})
                        </label>
                      </div>
                    ))}
                  {membersList.filter(m => m.relation !== "Chủ hộ").length === 0 && (
                    <p className="text-xs text-slate-400 italic">
                      Sổ này không có thành viên phụ để tách!
                    </p>
                  )}
                </div>
              </div>

              {splitSelectedCccds.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label htmlFor="split-new-code" className="font-bold text-slate-600 block">
                        Mã số Sổ mới *
                      </label>
                      <input
                        id="split-new-code"
                        type="text"
                        value={splitNewHCode}
                        onChange={e => {
                          setSplitNewHCode(e.target.value);
                          setSplitError(null);
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="split-new-owner" className="font-bold text-slate-600 block">
                        Chỉ định Chủ hộ mới *
                      </label>
                      <select
                        id="split-new-owner"
                        value={splitNewOwner}
                        onChange={e => {
                          setSplitNewOwner(e.target.value);
                          setSplitError(null);
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Lựa chọn --</option>
                        {membersList
                          .filter(m => splitSelectedCccds.includes(m.cccd))
                          .map(m => (
                            <option key={m.cccd} value={m.cccd}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="split-new-address" className="font-bold text-slate-600 block">
                      Địa chỉ sổ mới đăng ký *
                    </label>
                    <input
                      id="split-new-address"
                      type="text"
                      value={splitNewAddress}
                      onChange={e => {
                        setSplitNewAddress(e.target.value);
                        setSplitError(null);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </>
              )}

              {splitError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{splitError}</span>
                </p>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handlePerformSplitHousehold}
                  disabled={splitSelectedCccds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Xác nhận tách hộ tịch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Member Dialog */}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setMemberToRemove(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-member-confirm-title"
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
                  id="remove-member-confirm-title"
                  className="text-sm font-extrabold text-slate-900"
                >
                  Xác nhận xóa nhân khẩu khỏi hộ
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn chắc chắn muốn xóa thành viên{" "}
                  <strong className="text-slate-900">{memberToRemove.name}</strong> khỏi sổ hộ tịch{" "}
                  <span className="font-mono font-bold">{household.code}</span>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Soft Delete Household Dialog */}
      {showDeleteHouseholdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowDeleteHouseholdModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-household-confirm-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  membersList.length > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {membersList.length > 0 ? <AlertCircle size={18} /> : <Trash2 size={18} />}
              </div>
              <div className="space-y-1">
                <h3
                  id="delete-household-confirm-title"
                  className="text-sm font-extrabold text-slate-900"
                >
                  {membersList.length > 0
                    ? "Không thể xóa sổ hộ khẩu"
                    : "Xác nhận lưu trữ Sổ hộ khẩu"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {membersList.length > 0 ? (
                    <>
                      Sổ hộ khẩu <span className="font-mono font-bold">{household.code}</span> vẫn còn{" "}
                      <strong>{membersList.length} thành viên</strong> cư ngụ. Vui lòng thực hiện tách hộ hoặc chuyển thành viên trước khi xóa sổ.
                    </>
                  ) : (
                    <>
                      Bạn có chắc chắn muốn chuyển Sổ hộ khẩu{" "}
                      <strong className="text-slate-900">{household.code}</strong> vào mục lưu trữ (Soft Delete)? Bạn có thể khôi phục lại bất cứ lúc nào.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteHouseholdModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {membersList.length > 0 ? "Đã hiểu" : "Hủy bỏ"}
              </button>
              {membersList.length === 0 && (
                <button
                  type="button"
                  id="btn-confirm-delete-household"
                  onClick={handleConfirmSoftDeleteHousehold}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Xác nhận xóa sổ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Quick Profile Modal */}
      {profileViewMember && fallbackProfileResident && (
        <HouseholdMemberProfile
          resident={fallbackProfileResident}
          relation={profileViewMember.relation}
          onClose={() => setProfileViewMember(null)}
          onOpenFullProfile={
            matchedProfileResident
              ? res => {
                  setProfileViewMember(null);
                  navigate(getResidentDetailPath(res.id));
                }
              : undefined
          }
        />
      )}

      {/* Shared GIS Coordinate Pin Modal */}
      <HouseholdGisPinModal
        household={gisPinTarget}
        onClose={() => setGisPinTarget(null)}
        onSaveCoordinates={handleSavePinCoordinates}
      />
    </div>
  );
}

