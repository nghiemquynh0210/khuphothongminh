import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, X } from "lucide-react";
import HouseholdManagement from "../components/HouseholdManagement";
import HouseholdDetailPage from "./HouseholdDetailPage";
import HouseholdFormPage from "./HouseholdFormPage";
import HouseholdAddMemberPage from "./HouseholdAddMemberPage";
import HouseholdTreePage from "./HouseholdTreePage";
import { Household, Resident, TargetGisItem, ActiveTab } from "../types";
import { parseHouseholdsSubRoute, useCurrentLocation } from "../routes";
import { appendHouseholdAuditEntry } from "../utils/householdFormUtils";

export interface HouseholdsPageProps {
  households: Household[];
  residents: Resident[];
  currentUser: {
    username?: string;
    fullName?: string;
    role?: "canbo" | "nguoidan";
  } | null;
  residentPermissions: Record<string, boolean>;
  isDataLoading?: boolean;
  onAddHousehold?: (household: Household) => void;
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  onNavigateToGis: (item: TargetGisItem) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function HouseholdsPage({
  households,
  residents,
  currentUser,
  residentPermissions,
  isDataLoading = false,
  onAddHousehold,
  onUpdateHouseholds,
  onUpdateResidents,
  onNavigateToGis,
  setActiveTab
}: HouseholdsPageProps) {
  const { pathname } = useCurrentLocation();
  const subRoute = parseHouseholdsSubRoute(pathname);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (currentUser?.role === "nguoidan" && !residentPermissions.households) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không có quyền tra cứu Sổ Hộ Khẩu</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Theo quy định bảo vệ thông tin cá nhân và an ninh dữ liệu, vai trò Cư dân không được phép tra cứu Sổ hộ khẩu điện tử & thông tin nhân khẩu của các hộ gia đình. Chức năng này chỉ dành riêng cho Cán bộ Quản lý.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Quay về Cổng cư dân
        </button>
      </div>
    );
  }

  const handleCreateHousehold = (newHousehold: Household, newResidents: Resident[]) => {
    if (onAddHousehold) {
      onAddHousehold(newHousehold);
    } else {
      onUpdateHouseholds(prev => [newHousehold, ...prev]);
    }
    onUpdateResidents(prev => [...newResidents, ...prev]);
  };

  const handleUpdateHousehold = (updatedHousehold: Household, oldHousehold: Household) => {
    onUpdateHouseholds(prev =>
      prev.map(h => (h.id === oldHousehold.id ? updatedHousehold : h))
    );

    // Đồng bộ địa chỉ và chủ hộ sang danh bạ nhân khẩu khi chỉnh sửa sổ
    if (
      updatedHousehold.address !== oldHousehold.address ||
      updatedHousehold.ownerName !== oldHousehold.ownerName ||
      updatedHousehold.type !== oldHousehold.type
    ) {
      onUpdateResidents(prev =>
        prev.map(r => {
          if (r.householdId !== updatedHousehold.code) return r;
          const isNewOwner =
            r.fullName.trim().toLowerCase() === updatedHousehold.ownerName.trim().toLowerCase();
          return {
            ...r,
            address: updatedHousehold.address,
            status: updatedHousehold.type || r.status,
            relationToOwner: isNewOwner
              ? "Chủ hộ"
              : r.relationToOwner === "Chủ hộ"
                ? "Thành viên"
                : r.relationToOwner
          };
        })
      );
    }
  };

  const handleAddMemberToHousehold = (
    targetHouseholdId: string,
    member: {
      name: string;
      relation: string;
      cccd: string;
      birthYear: number;
      phone?: string;
    },
    newResident: Resident
  ) => {
    onUpdateHouseholds(prev =>
      prev.map(h => {
        if (h.id !== targetHouseholdId) return h;
        const nextMembers = [...h.members, member];
        return {
          ...h,
          members: nextMembers,
          memberCount: nextMembers.length,
          auditHistory: appendHouseholdAuditEntry(
            h,
            `Nhập khẩu thêm thành viên: ${member.name}`
          )
        };
      })
    );
    onUpdateResidents(prev => [newResident, ...prev]);
  };

  const toastBanner = toastMessage ? (
    <div
      role="status"
      aria-live="polite"
      className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
        <span>{toastMessage}</span>
      </div>
      <button
        type="button"
        onClick={() => setToastMessage(null)}
        className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
        aria-label="Đóng thông báo"
      >
        <X size={15} />
      </button>
    </div>
  ) : null;

  if (subRoute?.mode === "create") {
    return (
      <div key="household-create" className="space-y-4">
        {toastBanner}
        <HouseholdFormPage
          mode="create"
          households={households}
          isDataLoading={isDataLoading}
          onCreateHousehold={handleCreateHousehold}
          onUpdateHousehold={handleUpdateHousehold}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  if (subRoute?.mode === "edit") {
    const hasLoaded = households.some(
      h => h.id === subRoute.householdId || h.code === subRoute.householdId
    );
    return (
      <div
        key={`household-edit-${subRoute.householdId}-${hasLoaded ? "ready" : "pending"}`}
        className="space-y-4"
      >
        {toastBanner}
        <HouseholdFormPage
          mode="edit"
          householdId={subRoute.householdId}
          households={households}
          isDataLoading={isDataLoading}
          onCreateHousehold={handleCreateHousehold}
          onUpdateHousehold={handleUpdateHousehold}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  if (subRoute?.mode === "add-member") {
    return (
      <div key={`household-add-member-${subRoute.householdId}`} className="space-y-4">
        {toastBanner}
        <HouseholdAddMemberPage
          householdId={subRoute.householdId}
          households={households}
          isDataLoading={isDataLoading}
          onAddMember={handleAddMemberToHousehold}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  if (subRoute?.mode === "tree") {
    return (
      <div className="space-y-4">
        {toastBanner}
        <HouseholdTreePage
          householdId={subRoute.householdId}
          households={households}
          residents={residents}
          isDataLoading={isDataLoading}
        />
      </div>
    );
  }

  if (subRoute?.mode === "detail") {
    return (
      <div className="space-y-4">
        {toastBanner}
        <HouseholdDetailPage
          householdId={subRoute.householdId}
          households={households}
          residents={residents}
          isDataLoading={isDataLoading}
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
          onNavigateToGis={onNavigateToGis}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toastBanner}
      <HouseholdManagement
        households={households}
        residents={residents}
        onUpdateHouseholds={onUpdateHouseholds}
        onUpdateResidents={onUpdateResidents}
        onNavigateToGis={onNavigateToGis}
        onShowToast={setToastMessage}
      />
    </div>
  );
}
