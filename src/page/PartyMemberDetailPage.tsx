import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Home,
  ImageIcon,
  Phone,
  Printer,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Association, AssociationMember, PartyMember, Resident } from "../types";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { PageHeader } from "../components/common/PageHeader";
import { RecordDetailShell } from "../components/common/RecordDetailShell";
import { LoadingFade } from "../components/common/LoadingFade";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import {
  assignMemberRoleInAssociation,
  getAssociationRolePresets,
  previewRoleAssignment,
} from "../utils/leadershipSync";
import {
  isRealDecisionDocumentUrl,
  downloadDecisionDocument,
} from "../utils/decisionDocumentOcr";
import {
  ROUTES,
  getPartyMemberDetailPath,
  getPartyMemberEditPath,
  navigate,
} from "../routes";

export interface PartyMemberDetailPageProps {
  cccd: string;
  assocId?: string;
  associations: Association[];
  residents?: Resident[];
  partyMembers?: PartyMember[];
  isDataLoading?: boolean;
  basePath?: string;
  onBack?: () => void;
  onEdit?: (member: AssociationMember, assoc: Association) => void;
  onRemoveMember?: (assocId: string, memberCccd: string, memberName: string) => void;
  onUpdateAssociations?: (next: Association[]) => void;
}

export default function PartyMemberDetailPage({
  cccd,
  assocId,
  associations,
  residents = [],
  partyMembers = [],
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_PARTY,
  onBack,
  onEdit,
  onRemoveMember,
  onUpdateAssociations,
}: PartyMemberDetailPageProps) {
  const normalizedCccd = useMemo(() => {
    return cccd ? decodeURIComponent(cccd).trim() : "";
  }, [cccd]);

  const normalizedAssocId = useMemo(() => {
    return assocId ? decodeURIComponent(assocId).trim() : "";
  }, [assocId]);

  // Find the primary association for this member
  const currentAssoc = useMemo(() => {
    if (normalizedAssocId) {
      const found = associations.find(
        (a) =>
          a.id === normalizedAssocId ||
          a.id.toLowerCase() === normalizedAssocId.toLowerCase()
      );
      if (found) return found;
    }
    // Fallback: find first association that contains this member
    return associations.find((a) =>
      a.members?.some((m) => m.cccd === normalizedCccd)
    ) || associations[0] || null;
  }, [associations, normalizedAssocId, normalizedCccd]);

  // Find the member record
  const member = useMemo(() => {
    if (!currentAssoc) {
      // search across all associations
      for (const a of associations) {
        const found = a.members?.find((m) => m.cccd === normalizedCccd);
        if (found) return found;
      }
      return null;
    }
    return currentAssoc.members?.find((m) => m.cccd === normalizedCccd) || null;
  }, [currentAssoc, associations, normalizedCccd]);

  // Find matching resident
  const matchedRes = useMemo(() => {
    return residents.find((r) => r.cccd === normalizedCccd) || null;
  }, [residents, normalizedCccd]);

  // Check if Party member
  const isPartyMem = useMemo(() => {
    return partyMembers.some((p) => p.cccd === normalizedCccd);
  }, [partyMembers, normalizedCccd]);

  // Find all associations this person belongs to
  const allAssociatedRoles = useMemo(() => {
    return associations
      .filter((a) => a.members?.some((m) => m.cccd === normalizedCccd))
      .map((a) => {
        const m = a.members.find((mem) => mem.cccd === normalizedCccd)!;
        return {
          assocId: a.id,
          assocName: a.name,
          assocCategory: a.category,
          role: m.role,
          decisionNumber: m.decisionNumber,
          decisionDate: m.decisionDate,
          joinDate: m.joinDate,
          isCurrentAssoc: a.id === currentAssoc?.id,
        };
      });
  }, [associations, normalizedCccd, currentAssoc]);

  // Sibling members in current association for Prev/Next navigation
  const siblingMembers = useMemo(() => {
    return currentAssoc?.members || [];
  }, [currentAssoc]);

  const currentIdx = useMemo(() => {
    return siblingMembers.findIndex((m) => m.cccd === normalizedCccd);
  }, [siblingMembers, normalizedCccd]);

  const totalMembers = siblingMembers.length;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < totalMembers - 1;

  // Local state for actions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingDecisionDoc, setViewingDecisionDoc] = useState<boolean>(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Avatar handling
  const memberAvatar =
    member?.avatar ||
    matchedRes?.avatar ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200";

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member || !currentAssoc) return;

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", message: "Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updatedAssocs = associations.map((assoc) => {
        if (!assoc.members?.some((m) => m.cccd === member.cccd)) return assoc;
        return {
          ...assoc,
          members: assoc.members.map((m) =>
            m.cccd === member.cccd ? { ...m, avatar: dataUrl } : m
          ),
        };
      });
      if (onUpdateAssociations) {
        onUpdateAssociations(updatedAssocs);
      }
      setNotice({ type: "success", message: `Đã cập nhật ảnh đại diện của ${member.fullName} thành công!` });
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadDecision = () => {
    if (!member?.decisionFile) return;
    downloadDecisionDocument(member.decisionFile);
  };

  const handleConfirmDelete = () => {
    if (!member || !currentAssoc) return;
    if (onRemoveMember) {
      onRemoveMember(currentAssoc.id, member.cccd, member.fullName);
    } else if (onUpdateAssociations) {
      const updatedAssocs = associations.map((a) => {
        if (a.id !== currentAssoc.id) return a;
        return {
          ...a,
          members: a.members.filter((m) => m.cccd !== member.cccd),
        };
      });
      onUpdateAssociations(updatedAssocs);
    }
    setShowDeleteConfirm(false);
    if (onBack) {
      onBack();
    } else {
      navigate(basePath);
    }
  };

  const handleNavigateSibling = (targetCccd: string) => {
    navigate(getPartyMemberDetailPath(targetCccd, currentAssoc?.id, basePath));
  };

  if (isDataLoading && !member) {
    return <LoadingFade title="Đang tải dữ liệu hồ sơ hội viên..." />;
  }

  if (!member) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <PageHeader
          badgeText="Công tác Đảng & Chi hội"
          title="Không tìm thấy Hội viên"
          description={`Không tìm thấy thông tin hội viên với CCCD "${normalizedCccd}" trong cơ sở dữ liệu.`}
          onBackClick={onBack || (() => navigate(basePath))}
        />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Hội viên có thể đã bị xóa hoặc mã định danh CCCD không chính xác. Vui lòng kiểm tra lại danh sách chi hội.
          </p>
          <button
            type="button"
            onClick={onBack || (() => navigate(basePath))}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Quay lại trang Công tác Đảng & Chi hội</span>
          </button>
        </div>
      </div>
    );
  }

  const memberPhone = member.phone || matchedRes?.phone;

  return (
    <RecordDetailShell
      backLabel="Danh sách chi hội"
      onBack={onBack || (() => navigate(basePath))}
      navigation={
        totalMembers > 1 && currentIdx >= 0
          ? {
              hasPrev,
              hasNext,
              onPrev: () =>
                hasPrev && handleNavigateSibling(siblingMembers[currentIdx - 1].cccd),
              onNext: () =>
                hasNext && handleNavigateSibling(siblingMembers[currentIdx + 1].cccd),
              prevTitle: "Hội viên trước",
              nextTitle: "Hội viên tiếp theo",
              positionLabel: `${currentIdx + 1} / ${totalMembers}`,
            }
          : undefined
      }
      noticeSlot={
        notice ? (
          <InlineNotice
            type={notice.type}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        ) : undefined
      }
      avatarSlot={
        <div className="relative group">
          <img
            src={memberAvatar}
            alt={member.fullName}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 bg-slate-100"
            referrerPolicy="no-referrer"
          />
          {isPartyMem && (
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-xs"
              title="Đảng viên Đảng Cộng sản Việt Nam"
            >
              <Star size={10} className="fill-white text-white" />
            </span>
          )}

          <label
            className="absolute inset-0 rounded-xl bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[10px] font-semibold gap-0.5"
            title="Bấm để tải lên ảnh đại diện mới"
          >
            <Camera size={14} />
            <span>Đổi ảnh</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
      }
      badgesSlot={
        <>
          <span className="px-2.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
            {currentAssoc?.name || "Chi hội"}
          </span>
          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {member.role}
          </span>
          {isPartyMem ? (
            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
              <Star size={11} className="fill-rose-600 text-rose-600" />
              <span>Đảng viên ĐCSVN</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Quần chúng
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
            {allAssociatedRoles.length} vai trò tại KP3
          </span>
        </>
      }
      title={member.fullName}
      subtitleSlot={
        <>
          <span className="font-mono text-slate-700">CCCD: {member.cccd}</span>
          {memberPhone && (
            <a
              href={`tel:${memberPhone}`}
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono font-semibold"
            >
              <Phone size={12} />
              <span>{memberPhone}</span>
            </a>
          )}
          <label className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer">
            <Camera size={12} />
            <span>Tải ảnh mới</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </label>
        </>
      }
      actionsSlot={
        <>
          <button
            type="button"
            onClick={() => {
              if (onEdit && currentAssoc) {
                onEdit(member, currentAssoc);
              } else {
                navigate(getPartyMemberEditPath(member.cccd, currentAssoc?.id, basePath));
              }
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Edit2 size={13} />
            <span>Sửa thông tin &amp; QĐ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Xóa hội viên khỏi chi hội này"
          >
            <Trash2 size={13} />
            <span>Xóa khỏi Chi hội</span>
          </button>
        </>
      }
      bodyClassName="p-5 sm:p-6 space-y-5"
    >
      {/* Quick Role Switcher (Đổi nhanh Trưởng / Phó đồng bộ toàn hệ thống) */}
      {currentAssoc && onUpdateAssociations && (
        <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-xs font-semibold text-slate-600 shrink-0">
            Đổi nhanh chức danh (Đồng bộ toàn hệ thống):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {getAssociationRolePresets(currentAssoc).allSuggestedRoles.map((roleOpt) => {
              const isActive = member.role === roleOpt;
              const preview = previewRoleAssignment(currentAssoc, member.cccd, roleOpt);
              return (
                <button
                  key={roleOpt}
                  type="button"
                  onClick={() => {
                    if (isActive) return;
                    const nextAssocs = assignMemberRoleInAssociation(
                      associations,
                      currentAssoc.id,
                      member.cccd,
                      roleOpt
                    );
                    onUpdateAssociations(nextAssocs);
                    setNotice({
                      type: "success",
                      message:
                        preview.requiresHandover && preview.currentHead
                          ? `Đã bổ nhiệm "${member.fullName}" giữ chức "${roleOpt}" (bàn giao từ Đ/c ${preview.currentHead.fullName}) và đồng bộ toàn hệ thống!`
                          : `Đã cập nhật chức danh "${roleOpt}" cho "${member.fullName}" và đồng bộ toàn hệ thống!`,
                    });
                  }}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  {roleOpt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 1: Định danh & Nhiệm vụ Chi hội */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <CreditCard size={14} />
            </span>
            <span>1. Định danh &amp; Nhiệm vụ Chi hội</span>
          </div>
          <span className="text-xs text-slate-500">
            Trưởng chi hội: <strong className="text-slate-700">{currentAssoc?.leaderName || "Chưa bổ nhiệm"}</strong> ({currentAssoc?.members?.length || 0} người)
          </span>
        </div>

        <DetailGrid hideEmpty compact>
          <DetailRow label="Họ và tên" value={member.fullName} />
          <DetailRow label="Số CCCD / Mã định danh" value={member.cccd} isMono copyValue={member.cccd} />
          <DetailRow
            label="Chức danh / Vai trò"
            value={<span className="font-bold text-emerald-800">{member.role}</span>}
          />
          <DetailRow
            label="Ngày tham gia chi hội"
            value={member.joinDate || "Ghi nhận hệ thống"}
            isMono
          />
          <DetailRow
            label="Tình trạng Đảng viên"
            value={
              <span className={isPartyMem ? "font-bold text-rose-700 inline-flex items-center gap-1" : "text-slate-600"}>
                {isPartyMem ? "Đảng viên Đảng Cộng sản Việt Nam" : "Quần chúng ưu tú"}
              </span>
            }
          />
        </DetailGrid>
      </div>

      {/* Section 2: Cư trú & Liên hệ */}
      <div className="pt-3 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Home size={14} />
            </span>
            <span>2. Cư trú &amp; Liên hệ Cư dân</span>
          </div>
          <span className="text-xs text-slate-500">
            Đối soát từ CSDL Dân cư KP3
          </span>
        </div>

        <DetailGrid hideEmpty compact>
          <DetailRow
            label="Số điện thoại"
            value={memberPhone || "Chưa cập nhật"}
            isMono
            copyValue={memberPhone}
            href={memberPhone ? `tel:${memberPhone}` : undefined}
          />
          <DetailRow
            label="Ngày / Năm sinh"
            value={member.birthDate || matchedRes?.birthDate || "Chưa cập nhật"}
            isMono
          />
          <DetailRow
            label="Địa chỉ thường trú / Chỗ ở"
            value={matchedRes?.address || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"}
            colSpan={2}
          />
          <DetailRow
            label="Mã Hộ gia đình"
            value={matchedRes?.householdId || "N/A"}
            isMono
            copyValue={matchedRes?.householdId}
          />
          <DetailRow
            label="Tình trạng quản lý cư trú"
            value={
              <span className="font-semibold text-emerald-800">
                {matchedRes?.status || "Thường trú"}
              </span>
            }
          />
        </DetailGrid>
      </div>

      {/* Section 3: Quyết định công nhận & Văn bản đính kèm */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <FileCheck size={14} className="text-amber-600" />
            <span>3. Quyết định công nhận &amp; Hồ sơ lưu trữ</span>
          </div>
          {member.decisionFile ? (
            <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Có văn bản đính kèm
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">
              Chưa tải văn bản
            </span>
          )}
        </div>

        <DetailGrid hideEmpty>
          <DetailRow
            label="Số Quyết định"
            value={member.decisionNumber || "Chưa cập nhật"}
            isMono
            copyValue={member.decisionNumber}
          />
          <DetailRow
            label="Ngày ký / Ban hành"
            value={member.decisionDate || "Chưa cập nhật"}
            isMono
          />
        </DetailGrid>

        {member.decisionFile ? (
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0">
              {member.decisionFile.type === "pdf" ? (
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                  <ImageIcon size={18} />
                </div>
              )}
              <div className="min-w-0">
                <span
                  className="text-xs font-bold text-slate-800 block truncate"
                  title={member.decisionFile.name}
                >
                  {member.decisionFile.name}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {member.decisionFile.type.toUpperCase()} • {member.decisionFile.size || "Sẵn sàng"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewingDecisionDoc(true)}
                className="inline-flex items-center gap-1 h-8 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Eye size={13} />
                <span>Xem văn bản</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadDecision}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                title="Tải về máy tính"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2">
            <p className="text-xs text-slate-600">
              Hội viên chưa có tệp văn bản Quyết định công nhận đính kèm.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onEdit && currentAssoc) {
                  onEdit(member, currentAssoc);
                } else {
                  navigate(getPartyMemberEditPath(member.cccd, currentAssoc?.id, basePath));
                }
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <Edit2 size={12} />
              <span>Bổ sung Quyết định đính kèm</span>
            </button>
          </div>
        )}
      </div>

      {/* Section 4: Đa vai trò & Kiêm nhiệm tại Khu phố 3 */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Users size={14} className="text-emerald-700" />
            <span>4. Đa vai trò &amp; Kiêm nhiệm tại Khu phố 3</span>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
            {allAssociatedRoles.length} tổ chức / chi hội
          </span>
        </div>

        <div className="space-y-2">
          {allAssociatedRoles.map((roleItem, idx) => (
            <div
              key={idx}
              role={!roleItem.isCurrentAssoc ? "button" : undefined}
              tabIndex={!roleItem.isCurrentAssoc ? 0 : undefined}
              onClick={
                !roleItem.isCurrentAssoc
                  ? () =>
                      navigate(
                        getPartyMemberDetailPath(member.cccd, roleItem.assocId, basePath)
                      )
                  : undefined
              }
              onKeyDown={
                !roleItem.isCurrentAssoc
                  ? (e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(
                          getPartyMemberDetailPath(member.cccd, roleItem.assocId, basePath)
                        );
                      }
                    }
                  : undefined
              }
              title={
                !roleItem.isCurrentAssoc
                  ? `Nhấp để xem thông tin tại ${roleItem.assocName}`
                  : undefined
              }
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                roleItem.isCurrentAssoc
                  ? "bg-emerald-50/50 border-emerald-200"
                  : "bg-slate-50/60 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    {roleItem.assocName}
                  </span>
                  {roleItem.isCurrentAssoc && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                      Chi hội đang xem
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Phân loại: {roleItem.assocCategory} • Vai trò:{" "}
                  <strong className="text-emerald-800">{roleItem.role}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {roleItem.decisionNumber && (
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                    QĐ: {roleItem.decisionNumber}
                  </span>
                )}
                {!roleItem.isCurrentAssoc && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        getPartyMemberDetailPath(member.cccd, roleItem.assocId, basePath)
                      )
                    }
                    className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-semibold cursor-pointer"
                  >
                    Xem tại chi hội này →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Document Preview Modal */}
      {viewingDecisionDoc && member.decisionFile && (
        <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 px-5 flex justify-between items-center shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-sm flex items-center gap-2 truncate">
                  <FileCheck size={16} className="text-emerald-700 shrink-0" />
                  <span>Quyết định công nhận Hội viên</span>
                </h3>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  {member.fullName} • {currentAssoc?.name} • QĐ: {member.decisionNumber || "Chưa có số"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDecisionDoc(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
              {member.decisionFile.type === "pdf" ? (
                isRealDecisionDocumentUrl(member.decisionFile.url) ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
                    <iframe
                      src={member.decisionFile.url}
                      className="w-full h-[520px] rounded-lg border border-slate-200"
                    />
                    <div className="px-4 pb-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDownloadDecision}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                      >
                        <Download size={14} />
                        <span>Tải về xem chi tiết</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(member.decisionFile!.url, "_blank")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Mở bản gốc tab mới
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{member.decisionFile.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Định dạng PDF • {member.decisionFile.size || "Văn bản số hóa"}</p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleDownloadDecision}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                      >
                        <Download size={14} />
                        <span>Tải về xem chi tiết</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex justify-center">
                  <img
                    src={member.decisionFile.url}
                    alt={member.decisionFile.name}
                    className="max-h-[65vh] rounded-lg object-contain"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white p-3.5 px-5 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              {member.decisionFile && isRealDecisionDocumentUrl(member.decisionFile.url) && (
                <button
                  type="button"
                  onClick={() => window.open(member.decisionFile!.url, "_blank")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở bản gốc tab mới
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingDecisionDoc(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Xóa Hội viên khỏi Chi hội"
        description={`Bạn có chắc chắn muốn xóa hội viên "${member.fullName}" (CCCD: ${member.cccd}) khỏi "${currentAssoc?.name}" không? Hành động này có thể hoàn tác bằng cách thêm lại sau.`}
        confirmLabel="Xác nhận xóa"
        cancelLabel="Hủy bỏ"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </RecordDetailShell>
  );
}

