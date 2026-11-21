import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  GitBranch,
  History,
  Home,
  Layers,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Business, Household, Resident, TargetGisItem } from "../types";
import {
  decimalToDMS,
  generateDefaultCoordinatesForAddress,
  getGoogleMapsDirectionUrl,
  parseCoordinates as parseGisCoords,
} from "../utils/gisUtils";
import { extractKp3Area, maskCccd, maskPhone } from "../utils/kp3Utils";
import { resolveCoLocatedEntities } from "../utils/addressCoLocationUtils";
import { normalizeEntityLandParcels } from "../utils/landParcelsUtils";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { MultiParcelDetailView } from "../components/common/MultiParcelDetailView";
import { PageHeader } from "../components/common/PageHeader";
import { RecordDetailShell } from "../components/common/RecordDetailShell";
import { SharedAddressHubCard } from "../components/common/SharedAddressHubCard";
import { ReportSelect } from "../components/reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import HouseholdBusinesses from "../components/household/HouseholdBusinesses";
import HouseholdFamilyTree from "../components/household/HouseholdFamilyTree";
import HouseholdMemberProfile from "../components/household/HouseholdMemberProfile";
import {
  ROUTES,
  getHouseholdAddMemberPath,
  getHouseholdDetailPath,
  getHouseholdEditPath,
  getResidentDetailPath,
  navigate,
} from "../routes";

export type HouseholdDetailTab = "members" | "businesses" | "history";

export interface HouseholdDetailPageProps {
  householdId: string;
  households: Household[];
  residents: Resident[];
  businesses?: Business[];
  isDataLoading?: boolean;
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onBack?: () => void;
  onEdit?: (household: Household) => void;
  onAddMember?: (household: Household) => void;
  onSelectHousehold?: (householdId: string) => void;
  onOpenRecognition?: () => void;
  onDeleted?: (deletedHousehold: Household) => void;
}

export default function HouseholdDetailPage({
  householdId,
  households,
  residents,
  businesses = [],
  isDataLoading = false,
  onUpdateHouseholds,
  onUpdateResidents,
  onNavigateToGis,
  onBack,
  onEdit,
  onAddMember,
  onSelectHousehold,
  onOpenRecognition,
  onDeleted,
}: HouseholdDetailPageProps) {
  const [detailTab, setDetailTab] = useState<HouseholdDetailTab>("members");
  const [showFullPii, setShowFullPii] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Sub-modals for actions inside household detail
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [profileViewMember, setProfileViewMember] = useState<{
    name: string;
    relation: string;
    cccd: string;
  } | null>(null);

  // GIS Pin modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [gisPinInput, setGisPinInput] = useState("");

  // Move member state
  const [moveTargetMember, setMoveTargetMember] = useState<{
    name: string;
    cccd: string;
  } | null>(null);
  const [moveTargetHCode, setMoveTargetHCode] = useState("");

  // Split household state
  const [splitSelectedCccds, setSplitSelectedCccds] = useState<string[]>([]);
  const [splitNewHCode, setSplitNewHCode] = useState("");
  const [splitNewOwner, setSplitNewOwner] = useState("");
  const [splitNewAddress, setSplitNewAddress] = useState("");
  const [splitNewCoordinates, setSplitNewCoordinates] = useState("");

  // Feedback & confirmation
  const [notice, setNotice] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "primary";
    onConfirm: () => void;
  } | null>(null);

  const showNotice = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setNotice({ message, type });
  };

  const householdIndex = useMemo(
    () =>
      households.findIndex(
        (h) => h.id === householdId || h.code === householdId
      ),
    [households, householdId]
  );
  const household = householdIndex >= 0 ? households[householdIndex] : undefined;
  const prevHousehold =
    householdIndex > 0 ? households[householdIndex - 1] : null;
  const nextHousehold =
    householdIndex >= 0 && householdIndex < households.length - 1
      ? households[householdIndex + 1]
      : null;

  useEffect(() => {
    setDetailTab("members");
    setShowFullPii(false);
    setShowTreeModal(false);
    setShowMoveModal(false);
    setShowSplitModal(false);
    setProfileViewMember(null);
    setShowPinModal(false);
    setConfirmDialog(null);
    setNotice(null);
  }, [householdId]);

  useEffect(() => {
    if (
      showTreeModal ||
      showMoveModal ||
      showSplitModal ||
      showPinModal ||
      !!profileViewMember
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    showTreeModal,
    showMoveModal,
    showSplitModal,
    showPinModal,
    profileViewMember,
  ]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  const handleGoToHousehold = (targetId: string) => {
    if (onSelectHousehold) {
      onSelectHousehold(targetId);
    } else {
      navigate(getHouseholdDetailPath(targetId));
    }
  };

  const handleEditHousehold = (target: Household) => {
    if (onEdit) {
      onEdit(target);
    } else {
      navigate(getHouseholdEditPath(target.id));
    }
  };

  const handleAddMember = (target: Household) => {
    if (onAddMember) {
      onAddMember(target);
    } else {
      navigate(getHouseholdAddMemberPath(target.id));
    }
  };

  const handleDirections = (target: Household) => {
    let coords = target.coordinates;
    if (!coords || !parseGisCoords(coords)) {
      const autoGeo = generateDefaultCoordinatesForAddress(
        target.address,
        target.code
      );
      coords = autoGeo.dms;
      onUpdateHouseholds((prev) =>
        prev.map((item) =>
          item.id === target.id ? { ...item, coordinates: coords } : item
        )
      );
    }
    if (onNavigateToGis) {
      onNavigateToGis({
        id: target.id,
        type: "household",
        name: `Hộ ${target.ownerName} (${target.code})`,
        address: target.address,
        coordinates: coords,
        navigateRoute: true,
      });
    }
  };

  const openPinModal = (target: Household) => {
    setShowPinModal(true);
    if (target.coordinates) {
      setGisPinInput(target.coordinates);
    } else {
      const auto = generateDefaultCoordinatesForAddress(
        target.address,
        target.code
      );
      setGisPinInput(auto.dms);
    }
  };

  const handleSavePinCoordinates = (andNavigate = false) => {
    if (!household) return;
    const finalCoord = gisPinInput.trim();
    if (!finalCoord) {
      showNotice("Vui lòng nhập hoặc lấy tọa độ GIS!", "warning");
      return;
    }

    onUpdateHouseholds((prev) =>
      prev.map((h) =>
        h.id === household.id ? { ...h, coordinates: finalCoord } : h
      )
    );
    setShowPinModal(false);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: household.id,
        type: "household",
        name: `Hộ ${household.ownerName} (${household.code})`,
        address: household.address,
        coordinates: finalCoord,
        navigateRoute: true,
      });
    } else {
      showNotice(
        `Đã đồng bộ tọa độ Hộ ${household.ownerName} (${finalCoord}) lên bản đồ GIS!`,
        "success"
      );
    }
  };

  const handleSoftDeleteHousehold = (target: Household) => {
    if (target.members.length > 0) {
      showNotice(
        "Cảnh báo: Không thể xóa sổ hộ khẩu khi vẫn còn thành viên cư ngụ! Vui lòng thực hiện tách hộ hoặc chuyển thành viên trước.",
        "warning"
      );
      return;
    }

    setConfirmDialog({
      title: "Chuyển Sổ hộ khẩu vào lưu trữ",
      description: `Bạn có chắc chắn muốn xóa (Soft Delete) Sổ hộ khẩu ${target.code}? Sổ sẽ được chuyển vào mục lưu trữ.`,
      confirmLabel: "Chuyển vào lưu trữ",
      variant: "danger",
      onConfirm: () => {
        onUpdateHouseholds((prev) =>
          prev.map((h) =>
            h.id === target.id
              ? {
                  ...h,
                  deletedAt: new Date().toISOString(),
                  deletedBy: "Cán bộ Hành chính Phường",
                }
              : h
          )
        );
        setConfirmDialog(null);
        if (onDeleted) {
          onDeleted(target);
        } else {
          navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
        }
      },
    });
  };

  const handleRestoreHousehold = (target: Household) => {
    onUpdateHouseholds((prev) =>
      prev.map((h) => {
        if (h.id === target.id) {
          const copy = { ...h } as any;
          delete copy.deletedAt;
          delete copy.deletedBy;
          return copy;
        }
        return h;
      })
    );
    showNotice("Khôi phục sổ hộ khẩu thành công!", "success");
  };

  const handleRemoveMember = (cccd: string) => {
    if (!household) return;
    const member = household.members.find((m) => m.cccd === cccd);
    if (!member) return;

    if (member.relation === "Chủ hộ") {
      showNotice(
        "Không thể xóa chủ hộ khỏi sổ! Hãy chỉ định một chủ hộ mới bằng cách Sửa sổ trước.",
        "warning"
      );
      return;
    }

    setConfirmDialog({
      title: "Xóa thành viên khỏi sổ",
      description: `Bạn chắc chắn muốn xóa thành viên ${member.name} khỏi sổ hộ tịch ${household.code}?`,
      confirmLabel: "Xóa thành viên",
      variant: "danger",
      onConfirm: () => {
        const updatedMembers = household.members.filter((m) => m.cccd !== cccd);
        onUpdateHouseholds((prev) =>
          prev.map((h) =>
            h.id === household.id
              ? {
                  ...h,
                  members: updatedMembers,
                  memberCount: updatedMembers.length,
                }
              : h
          )
        );
        onUpdateResidents((prev) =>
          prev.map((r) =>
            r.cccd === cccd
              ? { ...r, householdId: "N/A", relationToOwner: "Tự do" }
              : r
          )
        );
        setConfirmDialog(null);
        showNotice(
          `Đã xóa thành viên ${member.name} khỏi sổ ${household.code}.`,
          "info"
        );
      },
    });
  };

  const startMoveMember = (name: string, cccd: string) => {
    if (!household) return;
    setMoveTargetMember({ name, cccd });
    setMoveTargetHCode(
      households.find((h) => h.id !== household.id && !(h as any).deletedAt)
        ?.code || ""
    );
    setShowMoveModal(true);
  };

  const handlePerformMoveMember = () => {
    if (!household || !moveTargetMember || !moveTargetHCode) return;

    const targetH = households.find((h) => h.code === moveTargetHCode);
    if (!targetH) {
      showNotice("Hộ tịch đích không tồn tại!", "error");
      return;
    }

    const memberToMove = household.members.find(
      (m) => m.cccd === moveTargetMember.cccd
    );
    if (!memberToMove) return;

    const updatedSourceMembers = household.members.filter(
      (m) => m.cccd !== moveTargetMember.cccd
    );
    const updatedTargetMembers = [
      ...targetH.members,
      {
        ...memberToMove,
        relation: "Thành viên mới chuyển đến",
      },
    ];

    onUpdateHouseholds((prev) =>
      prev.map((h) => {
        if (h.id === household.id) {
          return {
            ...h,
            members: updatedSourceMembers,
            memberCount: updatedSourceMembers.length,
          };
        }
        if (h.id === targetH.id) {
          return {
            ...h,
            members: updatedTargetMembers,
            memberCount: updatedTargetMembers.length,
          };
        }
        return h;
      })
    );

    onUpdateResidents((prev) =>
      prev.map((r) =>
        r.cccd === moveTargetMember.cccd
          ? {
              ...r,
              householdId: targetH.code,
              address: targetH.address,
              relationToOwner: "Thành viên mới chuyển đến",
            }
          : r
      )
    );

    setShowMoveModal(false);
    showNotice(
      `Đã chuyển nhân khẩu ${moveTargetMember.name} cư trú sang sổ ${targetH.code} thành công.`,
      "success"
    );
  };

  const startSplitHousehold = () => {
    if (!household) return;
    setSplitSelectedCccds([]);
    setSplitNewOwner("");
    setSplitNewHCode(`HK-${Math.floor(300 + Math.random() * 100)}`);
    setSplitNewAddress(household.address || "");
    setSplitNewCoordinates(household.coordinates || "");
    setShowSplitModal(true);
  };

  const toggleSelectSplitMember = (cccd: string) => {
    if (splitSelectedCccds.includes(cccd)) {
      setSplitSelectedCccds(splitSelectedCccds.filter((c) => c !== cccd));
      if (splitNewOwner === cccd) setSplitNewOwner("");
    } else {
      setSplitSelectedCccds([...splitSelectedCccds, cccd]);
      if (!splitNewOwner) setSplitNewOwner(cccd);
    }
  };

  const handlePerformSplitHousehold = () => {
    if (
      !household ||
      splitSelectedCccds.length === 0 ||
      !splitNewHCode.trim() ||
      !splitNewOwner
    ) {
      showNotice(
        "Vui lòng tích chọn thành viên tách và nhập mã sổ mới + chủ hộ mới!",
        "warning"
      );
      return;
    }

    const membersToSplit = household.members.filter((m) =>
      splitSelectedCccds.includes(m.cccd)
    );
    const newHMembers = membersToSplit.map((m) => ({
      ...m,
      relation: m.cccd === splitNewOwner ? "Chủ hộ" : "Thành viên tách hộ",
    }));

    const candidateId = "H" + (households.length + 1).toString().padStart(3, "0");
    const uniqueId = households.some((h) => h.id === candidateId)
      ? `H-${Date.now()}`
      : candidateId;

    const newH: Household = {
      id: uniqueId,
      code: splitNewHCode.trim(),
      ownerName:
        household.members.find((m) => m.cccd === splitNewOwner)?.name ||
        "Chưa xác định",
      address: splitNewAddress.trim(),
      type: household.type || "Thường trú",
      memberCount: newHMembers.length,
      coordinates: splitNewCoordinates || undefined,
      members: newHMembers,
    };

    const updatedOriginalMembers = household.members.filter(
      (m) => !splitSelectedCccds.includes(m.cccd)
    );

    onUpdateHouseholds((prev) => [
      ...prev.map((h) =>
        h.id === household.id
          ? {
              ...h,
              members: updatedOriginalMembers,
              memberCount: updatedOriginalMembers.length,
            }
          : h
      ),
      newH,
    ]);

    onUpdateResidents((prev) =>
      prev.map((r) =>
        splitSelectedCccds.includes(r.cccd)
          ? {
              ...r,
              householdId: splitNewHCode.trim(),
              address: splitNewAddress.trim(),
              relationToOwner:
                r.cccd === splitNewOwner ? "Chủ hộ" : "Thành viên tách hộ",
            }
          : r
      )
    );

    setShowSplitModal(false);
    showNotice(
      `Tách hộ tịch thành công! Sổ mới ${splitNewHCode.trim()} đã được khởi tạo.`,
      "success"
    );
  };

  if (isDataLoading && !household) {
    return (
      <div className="max-w-5xl mx-auto">
        <LoadingFade
          variant="page"
          title="Đang tải thông tin sổ hộ khẩu..."
          subtitle="Hệ thống đang truy xuất thông tin chi tiết từ Cơ sở dữ liệu KP3."
        />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 theme-loading-fade">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Không tìm thấy sổ hộ khẩu
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Mã sổ hộ khẩu{" "}
          <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
            {householdId}
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
            Quay lại danh sách hộ gia đình
          </button>
        </div>
      </div>
    );
  }

  const isSoftDeleted = Boolean((household as any).deletedAt);
  const hType = household.type || "Thường trú";

  const coLocatedCount = (() => {
    const co = resolveCoLocatedEntities({
      focusHousehold: household,
      households,
      businesses,
    });
    return co.enterprises.length + co.businesses.length;
  })();

  const householdTabs = [
    {
      id: "members",
      label: `Thông tin & Thành viên (${household.members.length})`,
      icon: <Users size={14} aria-hidden="true" />,
    },
    {
      id: "businesses",
      label: `Doanh nghiệp & Cơ sở KD cùng địa chỉ (${coLocatedCount})`,
      icon: <Home size={14} aria-hidden="true" />,
    },
    {
      id: "history",
      label: "Nhật ký biến động",
      icon: <History size={14} aria-hidden="true" />,
    },
  ];

  return (
    <RecordDetailShell
      backLabel="Danh sách hộ"
      backButtonId="btn-household-detail-back"
      onBack={handleGoBack}
      navigation={{
        hasPrev: Boolean(prevHousehold),
        hasNext: Boolean(nextHousehold),
        onPrev: () => prevHousehold && handleGoToHousehold(prevHousehold.id),
        onNext: () => nextHousehold && handleGoToHousehold(nextHousehold.id),
        prevTitle: prevHousehold ? `Sổ hộ trước: ${prevHousehold.code}` : "Không có sổ hộ trước",
        nextTitle: nextHousehold ? `Sổ hộ sau: ${nextHousehold.code}` : "Không có sổ hộ sau",
      }}
      topRightSlot={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btn-detail-tree"
            onClick={() => setShowTreeModal(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <GitBranch size={13} className="text-slate-500" />
            <span>Phả hệ</span>
          </button>
          <button
            type="button"
            onClick={() => handleDirections(household)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Navigation size={13} className="text-slate-500" />
            <span>Chỉ đường GIS</span>
          </button>
        </div>
      }
      noticeSlot={
        notice && !showMoveModal && !showSplitModal && !showPinModal ? (
          <InlineNotice
            message={notice.message}
            type={notice.type}
            onDismiss={() => setNotice(null)}
          />
        ) : undefined
      }
      avatarSlot={
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/90 text-emerald-700 flex items-center justify-center">
          <Home size={20} aria-hidden="true" />
        </div>
      }
      badgesSlot={
        <>
          <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
            {household.code}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold border ${
              hType === "Tạm trú"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {hType}
          </span>
          {isSoftDeleted && (
            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Đã lưu trữ
            </span>
          )}
          {household.timemarkVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles size={11} className="text-amber-600" />
              <span>Timemark GPS</span>
            </span>
          )}
          {(() => {
            const parcels = normalizeEntityLandParcels(household);
            if (parcels.length < 2) return null;
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Layers size={11} />
                <span>Ghép {String(parcels.length).padStart(2, "0")} Sổ đỏ</span>
              </span>
            );
          })()}
        </>
      }
      title={`Hộ gia đình: ${household.ownerName}`}
      subtitleSlot={
        <>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <MapPin size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
            <span className="break-words">{household.address}</span>
          </span>
          <span>
            {extractKp3Area(household.address)} •{" "}
            <strong className="text-slate-800">{household.members.length} nhân khẩu</strong>
          </span>
        </>
      }
      actionsSlot={
        <>
          {isSoftDeleted ? (
            <button
              type="button"
              onClick={() => handleRestoreHousehold(household)}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Undo2 size={13} />
              <span>Khôi phục</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSoftDeleteHousehold(household)}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Đóng sổ</span>
            </button>
          )}
          <button
            type="button"
            id="btn-detail-edit-household"
            onClick={() => handleEditHousehold(household)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Edit3 size={13} />
            <span>Chỉnh sửa</span>
          </button>
        </>
      }
      tabs={householdTabs}
      activeTab={detailTab}
      onTabChange={(id) => setDetailTab(id as any)}
      bodyClassName="space-y-0"
    >

        {/* Tab Body */}
        <div className="p-5 sm:p-6 bg-white text-xs">
          {detailTab === "members" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                      <Home size={14} aria-hidden="true" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Thông tin Sổ Hộ Khẩu
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openPinModal(household)}
                      className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin
                        size={12}
                        className="text-indigo-600"
                        aria-hidden="true"
                      />
                      <span>
                        {household.coordinates ? "Sửa tọa độ" : "Ghim tọa độ"}
                      </span>
                    </button>
                    {household.coordinates && (
                      <a
                        href={getGoogleMapsDirectionUrl(
                          parseGisCoords(household.coordinates)?.lat ||
                            10.936997,
                          parseGisCoords(household.coordinates)?.lng ||
                            106.744645,
                          household.address
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} aria-hidden="true" />
                        <span>Google Maps</span>
                      </a>
                    )}
                  </div>
                </div>
                <DetailGrid hideEmpty compact>
                  <DetailRow
                    label="Mã sổ hộ khẩu"
                    value={household.code}
                    copyValue={household.code}
                    isMono
                  />
                  <DetailRow label="Chủ hộ" value={household.ownerName} />
                  <DetailRow label="Loại cư trú" value={hType} />
                  <DetailRow
                    label="Khu vực KP3"
                    value={extractKp3Area(household.address)}
                  />
                  <DetailRow
                    label="Số nhân khẩu"
                    value={`${household.members.length} người`}
                    isNumeric
                  />
                  <DetailRow
                    label="Tọa độ GIS"
                    value={household.coordinates}
                    copyValue={household.coordinates}
                    isMono
                  />
                  <DetailRow
                    label="Địa chỉ thường trú"
                    value={household.address}
                    colSpan={2}
                  />
                  {(household as any).notes && (
                    <DetailRow
                      label="Ghi chú biến động"
                      value={(household as any).notes}
                      colSpan={2}
                    />
                  )}
                </DetailGrid>

                {/* Khối Đa Thửa Đất & Nhiều Sổ Đỏ (GCN QSDĐ) */}
                <div className="pt-2 border-t border-slate-200/80">
                  <MultiParcelDetailView entity={household} />
                </div>

                {/* Tổ hợp Doanh nghiệp • Cơ sở KD • Nhà trọ Cùng Địa Chỉ */}
                <div className="pt-2 border-t border-slate-200/80">
                  <SharedAddressHubCard
                    focusHousehold={household}
                    households={households}
                    businesses={businesses}
                  />
                </div>

                {/* Khối Ảnh hiện trường & Timemark Verified Geolocation */}
                <div className="space-y-2.5 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Camera size={14} className="text-amber-600" />
                      Hình ảnh Hiện trường &amp; Khảo sát Thực tế Timemark
                    </span>
                    {household.timemarkVerified && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                        <Sparkles size={11} /> Timemark 100% Chân thực
                      </span>
                    )}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video md:aspect-auto md:h-44">
                      <img
                        src={household.houseImage || "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500"}
                        alt={`Nhà ở hộ ${household.ownerName}`}
                        className="w-full h-full object-cover"
                      />
                      {household.timemarkHash && (
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/20">
                          #{household.timemarkHash}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Tọa độ GPS xác thực:</span>
                          <span className="font-mono font-bold text-slate-800 text-[12px]">{household.coordinates || "Chưa ghi nhận"}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Thời gian khảo sát:</span>
                          <span className="font-semibold text-slate-800 text-[12px]">{household.photoTakenAt || "Chưa ghi nhận"}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Độ cao định vị:</span>
                          <span className="font-semibold text-slate-800">{household.photoElevation || "Chưa ghi nhận"}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Phương hướng camera:</span>
                          <span className="font-semibold text-slate-800">{household.photoDirection || "Chưa ghi nhận"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                          <Check size={12} className="text-emerald-600" /> Dữ liệu đã đồng bộ Bản đồ số GIS KP3
                        </span>
                        {household.coordinates && (
                          <button
                            type="button"
                            onClick={() => handleDirections(household)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            Xem trên bản đồ ➜
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Danh sách nhân khẩu ({household.members.length})
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowFullPii((prev) => !prev)}
                    className="min-h-8 flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-300"
                    aria-pressed={showFullPii}
                  >
                    {showFullPii ? (
                      <EyeOff size={13} aria-hidden="true" />
                    ) : (
                      <Eye size={13} aria-hidden="true" />
                    )}
                    <span>
                      {showFullPii ? "Che CCCD/SĐT" : "Hiện CCCD/SĐT"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRecognition) {
                        onOpenRecognition();
                      } else {
                        navigate(
                          `${ROUTES.DASHBOARD_HOUSEHOLDS}?tab=recognition`
                        );
                      }
                    }}
                    className="min-h-8 flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-300"
                  >
                    <Sparkles
                      size={13}
                      className="text-emerald-700"
                      aria-hidden="true"
                    />{" "}
                    Nhận diện
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMember(household)}
                    className="min-h-8 flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    <UserPlus size={13} aria-hidden="true" /> Thêm nhân khẩu
                  </button>
                </div>
              </div>

              {household.members.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs">
                  Sổ hộ khẩu chưa có thành viên nào. Nhấn "Thêm nhân khẩu" để
                  nhập khẩu thành viên.
                </div>
              ) : (() => {
                const q = memberSearchQuery.trim().toLowerCase();
                const filteredMembers = q
                  ? household.members.filter(
                      (m) =>
                        (m.name || "").toLowerCase().includes(q) ||
                        (m.cccd || "").toLowerCase().includes(q) ||
                        String(m.birthYear || "").includes(q) ||
                        (m.relation || "").toLowerCase().includes(q) ||
                        (m.phone || "").toLowerCase().includes(q)
                    )
                  : household.members;

                const resolveMemberResident = (m: typeof household.members[number]) =>
                  residents.find(
                    (r) =>
                      (m.cccd && r.cccd && r.cccd.trim() === m.cccd.trim()) ||
                      (r.fullName.trim().toLowerCase() === m.name.trim().toLowerCase() &&
                        r.householdId === household.code)
                  );

                return (
                  <div className="space-y-3">
                    {household.members.length > 1 && (
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          placeholder="Tìm nhanh thành viên theo họ tên, CCCD, quan hệ, năm sinh..."
                          aria-label="Tìm nhanh thành viên trong sổ hộ khẩu"
                          className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                        />
                        {memberSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMemberSearchQuery("")}
                            aria-label="Xóa tìm kiếm thành viên"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    {filteredMembers.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs">
                        Không tìm thấy thành viên khớp từ khóa &ldquo;{memberSearchQuery.trim()}&rdquo;.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredMembers.map((m) => {
                          const matchedResident = resolveMemberResident(m);
                          const handleOpenMemberDetail = () => {
                            if (matchedResident) {
                              navigate(getResidentDetailPath(matchedResident.id));
                            } else {
                              setProfileViewMember({
                                name: m.name,
                                relation: m.relation,
                                cccd: m.cccd,
                              });
                            }
                          };

                          return (
                            <div
                              key={`${m.cccd}-${m.name}`}
                              role="button"
                              tabIndex={0}
                              onClick={handleOpenMemberDetail}
                              onKeyDown={(e) => {
                                if (e.target !== e.currentTarget) return;
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                                                  handleOpenMemberDetail();
                                }
                              }}
                              title={`Nhấn để mở thông tin chi tiết của ${m.name}`}
                              className="group p-3 bg-white hover:border-emerald-400 hover:shadow-2xs border border-slate-200 rounded-xl space-y-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="text-left flex-1 min-w-0">
                                  <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-xs sm:text-sm truncate">
                                    {m.name}
                                  </h4>
                                  <p className="text-xs text-slate-600 font-mono truncate">
                                    {m.birthYear ? `Sinh ${m.birthYear} • ` : ""}CCCD:{" "}
                                    {maskCccd(m.cccd, showFullPii)}
                                  </p>
                                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                                    SĐT:{" "}
                                    {m.phone && m.phone !== "N/A"
                                      ? maskPhone(m.phone, showFullPii)
                                      : "Chưa cập nhật"}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 border ${
                                    m.relation === "Chủ hộ"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {m.relation}
                                </span>
                              </div>

                              <div
                                className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end text-xs gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProfileViewMember({
                                        name: m.name,
                                        relation: m.relation,
                                        cccd: m.cccd,
                                      });
                                    }}
                                    className="min-h-7 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer"
                                  >
                                    Thẻ QR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startMoveMember(m.name, m.cccd);
                                    }}
                                    className="min-h-7 text-xs bg-white hover:bg-slate-100 text-indigo-700 border border-slate-300 px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer"
                                  >
                                    Chuyển
                                  </button>
                                  {m.relation !== "Chủ hộ" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startSplitHousehold();
                                        }}
                                        className="min-h-7 text-xs bg-white hover:bg-slate-100 text-emerald-800 border border-slate-300 px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer"
                                      >
                                        Tách
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveMember(m.cccd);
                                        }}
                                        className="min-h-7 min-w-7 inline-flex items-center justify-center text-xs text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                                        aria-label={`Xóa ${m.name} khỏi sổ`}
                                      >
                                        <Trash2 size={14} aria-hidden="true" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {detailTab === "businesses" && (
            <div className="bg-white">
              <HouseholdBusinesses
                household={household}
                households={households}
                residents={residents}
                businessesState={businesses}
              />
            </div>
          )}

          {detailTab === "history" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-2">
                Nhật ký biến động và sửa đổi sổ
              </span>
              {((household as any).auditHistory || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Chưa ghi nhận biến động chính thức nào kể từ ngày lập sổ.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {((household as any).auditHistory || []).map(
                    (log: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs"
                      >
                        <History
                          size={14}
                          className="text-slate-500 mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-slate-800 font-semibold">
                            {log.action}
                          </p>
                          <span className="text-xs text-slate-500 font-mono block mt-0.5">
                            {log.date} • Cán bộ: {log.actor}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Chuyển hộ tịch Modal */}
      {showMoveModal && moveTargetMember && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm">Chuyển hộ tịch Nhân khẩu</h3>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ chuyển hộ tịch"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
              <p className="leading-relaxed">
                Đang thực hiện chuyển nhân khẩu{" "}
                <strong>{moveTargetMember.name}</strong> (CCCD:{" "}
                {maskCccd(moveTargetMember.cccd, showFullPii)}) từ Sổ hộ khẩu
                hiện tại ({household.code}) sang một Sổ hộ khẩu điện tử đích
                khác.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Lựa chọn Sổ hộ khẩu đích
                </label>
                <ReportSelect
                  aria-label="Sổ hộ khẩu đích"
                  value={moveTargetHCode}
                  onChange={setMoveTargetHCode}
                  options={households
                    .filter(
                      (h) => h.id !== household.id && !(h as any).deletedAt
                    )
                    .map((h) => ({
                      value: h.code,
                      label: `${h.code} - Hộ ${h.ownerName} (${h.address})`,
                    }))}
                  className="w-full"
                />
              </div>

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

      {/* Tách hộ tịch Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm">
                  Tách hộ tịch (Chia tách gia đình)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Sổ nguồn: {household.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ tách hộ tịch"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Tích chọn các thành viên muốn tách sổ *
                </label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  {household.members
                    .filter((m) => m.relation !== "Chủ hộ")
                    .map((m) => (
                      <div
                        key={m.cccd}
                        className="flex items-center gap-2 select-none"
                      >
                        <input
                          type="checkbox"
                          id={`split-${m.cccd}`}
                          checked={splitSelectedCccds.includes(m.cccd)}
                          onChange={() => toggleSelectSplitMember(m.cccd)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded cursor-pointer"
                        />
                        <label
                          htmlFor={`split-${m.cccd}`}
                          className="text-slate-800 cursor-pointer font-semibold"
                        >
                          {m.name} ({m.relation})
                        </label>
                      </div>
                    ))}
                  {household.members.filter((m) => m.relation !== "Chủ hộ")
                    .length === 0 && (
                    <p className="text-xs text-slate-500 italic">
                      Sổ này không có thành viên phụ để tách!
                    </p>
                  )}
                </div>
              </div>

              {splitSelectedCccds.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label
                        htmlFor="split-new-h-code"
                        className="font-bold text-slate-700 block"
                      >
                        Mã số Sổ mới *
                      </label>
                      <input
                        id="split-new-h-code"
                        type="text"
                        value={splitNewHCode}
                        onChange={(e) => setSplitNewHCode(e.target.value)}
                        className="w-full px-3 h-10 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">
                        Chỉ định Chủ hộ mới *
                      </label>
                      <ReportSelect
                        aria-label="Chỉ định chủ hộ mới"
                        value={splitNewOwner}
                        onChange={setSplitNewOwner}
                        options={[
                          { value: "", label: "-- Lựa chọn --" },
                          ...household.members
                            .filter((m) => splitSelectedCccds.includes(m.cccd))
                            .map((m) => ({ value: m.cccd, label: m.name })),
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="split-new-address"
                      className="font-bold text-slate-700 block"
                    >
                      Địa chỉ sổ mới đăng ký *
                    </label>
                    <input
                      id="split-new-address"
                      type="text"
                      value={splitNewAddress}
                      onChange={(e) => setSplitNewAddress(e.target.value)}
                      className="w-full px-3 h-10 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </>
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

      {/* Sơ đồ Cây gia đình phả hệ Modal */}
      {showTreeModal && (
        <HouseholdFamilyTree
          household={household}
          onClose={() => setShowTreeModal(false)}
          onSelectMember={(name, relation, cccd) => {
            setProfileViewMember({ name, relation, cccd });
          }}
        />
      )}

      {/* Chi tiết Profile thành viên Modal */}
      {profileViewMember && (
        <HouseholdMemberProfile
          resident={
            residents.find(
              (r) =>
                (profileViewMember.cccd &&
                  r.cccd &&
                  r.cccd.trim() === profileViewMember.cccd.trim()) ||
                (r.fullName.trim().toLowerCase() ===
                  profileViewMember.name.trim().toLowerCase() &&
                  r.householdId === household.code)
            ) || null
          }
          fallbackMember={profileViewMember}
          relation={profileViewMember.relation}
          onClose={() => setProfileViewMember(null)}
        />
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS HỘ KHẨU */}
      {showPinModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowPinModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            <div className="bg-slate-50 p-4 text-slate-900 flex justify-between items-center border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Ghim & Đồng bộ Tọa độ GIS Hộ Khẩu
                  </h3>
                  <p className="text-xs text-slate-600 font-mono">
                    Hộ: {household.ownerName} • Mã sổ: {household.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ ghim tọa độ GIS"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">
                  Địa chỉ hộ cư trú:
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  {household.address}
                </p>
                <span className="text-xs text-slate-600 block">
                  Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <label
                    htmlFor="detail-gis-pin-coord-input"
                    className="font-bold text-slate-700"
                  >
                    Tọa độ GIS (Định dạng DMS hoặc Thập phân):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(
                        household.address,
                        household.code
                      );
                      setGisPinInput(auto.dms);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} className="text-emerald-600" /> Tự động
                    nhận diện từ địa chỉ
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="detail-gis-pin-coord-input"
                    type="text"
                    value={gisPinInput}
                    onChange={(e) => setGisPinInput(e.target.value)}
                    placeholder='Ví dụ: 10°56&apos;13.2"N 106°44&apos;40.8"E hoặc 10.936997, 106.744645'
                    className="w-full px-3.5 h-10 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white pr-9"
                  />
                  <MapPin
                    size={15}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Gợi ý phân khu / tuyến đường nhanh:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput("10°56'13.2\"N 106°44'40.7\"E")
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      42 Lương Định Của
                    </strong>
                    <span className="text-xs text-slate-600 font-mono">
                      10.936997, 106.744645
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput("10°56'16.1\"N 106°44'43.8\"E")
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      Hẻm 42 Lương Định Của
                    </strong>
                    <span className="text-xs text-slate-600 font-mono">
                      10.937800, 106.745500
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput("10°56'08.9\"N 106°44'48.5\"E")
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      Hẻm 18 Lương Định Của
                    </strong>
                    <span className="text-xs text-slate-600 font-mono">
                      10.935800, 106.746800
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGisPinInput("10°56'12.5\"N 106°44'42.6\"E")
                    }
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">
                      KDC Giáp ranh Tây Bắc KP3
                    </strong>
                    <span className="text-xs text-slate-600 font-mono">
                      10.936800, 106.744600
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
                      <AlertCircle
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
                className="px-3.5 py-2 text-slate-700 hover:bg-slate-200/70 border border-slate-200 bg-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Lưu & Đồng bộ GIS
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Lưu & Dẫn đường ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notice && (showMoveModal || showSplitModal || showPinModal) && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-md w-full px-4 sm:px-0">
          <InlineNotice
            message={notice.message}
            type={notice.type}
            onDismiss={() => setNotice(null)}
          />
        </div>
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
    </RecordDetailShell>
  );
}

