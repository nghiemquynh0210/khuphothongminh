import React, { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, GitBranch, Loader2, UserPlus } from "lucide-react";
import { Household, Resident } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { HouseholdFamilyTreeDiagram } from "../components/household/HouseholdFamilyTree";
import HouseholdMemberProfile from "../components/household/HouseholdMemberProfile";
import {
  ROUTES,
  getHouseholdAddMemberPath,
  getHouseholdDetailPath,
  getResidentDetailPath,
  navigate
} from "../routes";
import {
  findHouseholdByIdOrCode,
  findResidentByCccd
} from "../utils/householdFormUtils";

export interface HouseholdTreePageProps {
  householdId: string;
  households: Household[];
  residents: Resident[];
  isDataLoading?: boolean;
}

export default function HouseholdTreePage({
  householdId,
  households,
  residents,
  isDataLoading = false
}: HouseholdTreePageProps) {
  const household = useMemo(
    () => findHouseholdByIdOrCode(households, householdId),
    [households, householdId]
  );

  const [selectedMember, setSelectedMember] = useState<{
    name: string;
    relation: string;
    cccd: string;
  } | null>(null);

  const handleBack = () => {
    if (household) {
      navigate(getHouseholdDetailPath(household.id));
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  if (!household && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải sơ đồ phả hệ...</h2>
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
          Mã sổ <span className="font-mono font-bold text-slate-800">{householdId}</span> không tồn tại hoặc đã bị xóa.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD_HOUSEHOLDS)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Danh sách Hộ khẩu</span>
          </button>
        </div>
      </div>
    );
  }

  const matchedResident = selectedMember
    ? findResidentByCccd(residents, selectedMember.cccd)
    : null;

  const fallbackMember = selectedMember
    ? household.members.find(m => m.cccd === selectedMember.cccd)
    : null;

  const resolvedResident: Resident | null = selectedMember
    ? matchedResident || {
        id: selectedMember.cccd || "N/A",
        fullName: selectedMember.name,
        gender: "Nam",
        birthDate: fallbackMember?.birthYear
          ? `01/01/${fallbackMember.birthYear}`
          : "Chưa cập nhật",
        cccd: selectedMember.cccd,
        phone: fallbackMember?.phone || "Chưa đăng ký",
        status: household.type || "Thường trú",
        occupation: "Chưa cập nhật",
        address: household.address,
        householdId: household.code,
        relationToOwner: selectedMember.relation
      }
    : null;

  return (
    <div id="household-tree-page" className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-from-tree"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Chi tiết Sổ {household.code}</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">
            Hộ {household.ownerName}
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-emerald-700">Sơ đồ phả hệ</span>
        </nav>
      </div>

      {/* PageHeader */}
      <PageHeader
        badgeIcon={<GitBranch size={14} className="text-emerald-600" />}
        badgeText="SƠ ĐỒ CÂY PHẢ HỆ HỘ TỊCH • ĐỀ ÁN 06/CP"
        badgeSubtext={`SỔ HK: ${household.code}`}
        title={`Sơ đồ Phả hệ Thành viên — ${household.code}`}
        description={`Chủ hộ: ${household.ownerName} • ${household.members.length} nhân khẩu • Nhấp chọn thành viên để xem hồ sơ điện tử chi tiết`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(getHouseholdAddMemberPath(household.id))}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
              <UserPlus size={14} />
              <span>Thêm nhân khẩu</span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Sổ</span>
            </button>
          </div>
        }
      />

      {/* Tree Workspace Card */}
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 bg-slate-950">
          <div className="flex items-center gap-2">
            <GitBranch size={17} className="text-emerald-400" />
            <span className="font-bold text-white text-xs sm:text-sm">
              Cây quan hệ nhân khẩu sổ {household.code}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Địa chỉ: {household.address}
          </span>
        </div>

        <HouseholdFamilyTreeDiagram
          household={household}
          onSelectMember={(name, relation, cccd) =>
            setSelectedMember({ name, relation, cccd })
          }
        />

        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>Hệ thống cây phả hệ số tự động đồng bộ</span>
          <span>Phường An Phú, TP. Hồ Chí Minh</span>
        </div>
      </div>

      {/* Member Quick Profile Modal */}
      {selectedMember && resolvedResident && (
        <HouseholdMemberProfile
          resident={resolvedResident}
          relation={selectedMember.relation}
          onClose={() => setSelectedMember(null)}
          onOpenFullProfile={
            matchedResident
              ? res => {
                  setSelectedMember(null);
                  navigate(getResidentDetailPath(res.id));
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

