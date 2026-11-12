import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import HouseholdManagement from "../components/HouseholdManagement";
import HouseholdFormPage from "./HouseholdFormPage";
import HouseholdDetailPage from "./HouseholdDetailPage";
import HouseholdAddMemberPage from "./HouseholdAddMemberPage";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { LoadingFade } from "../components/common/LoadingFade";
import { Household, Resident, TargetGisItem, ActiveTab } from "../types";
import {
  ROUTES,
  getHouseholdAddMemberPath,
  getHouseholdDetailPath,
  getHouseholdEditPath,
  navigate,
  parseHouseholdFormRoute,
  useCurrentLocation,
} from "../routes";

export interface HouseholdsPageProps {
  households: Household[];
  residents: Resident[];
  currentUser: any;
  residentPermissions: Record<string, boolean>;
  isDataLoading?: boolean;
  onAddHousehold: (newH: Household) => void;
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
  setActiveTab,
}: HouseholdsPageProps) {
  const { pathname, search } = useCurrentLocation();
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (currentUser?.role === "nguoidan" && !residentPermissions.households) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Không có quyền tra cứu Sổ Hộ Khẩu
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Theo quy định bảo vệ thông tin cá nhân và an ninh dữ liệu, vai trò Cư
          dân không được phép tra cứu Sổ hộ khẩu điện tử & thông tin nhân khẩu
          của các hộ gia đình. Chức năng này chỉ dành riêng cho Cán bộ Quản lý.
        </p>
        <button
          onClick={() => setActiveTab("dashboard")}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Quay về Cổng cư dân
        </button>
      </div>
    );
  }

  const formRoute = parseHouseholdFormRoute(pathname, search);

  if (formRoute) {
    if (formRoute.mode === "detail") {
      return (
        <div
          key={`detail-${formRoute.householdId}`}
          className="space-y-4 theme-loading-fade"
        >
          {savedNotice && (
            <div className="max-w-5xl mx-auto">
              <InlineNotice
                message={savedNotice}
                type="success"
                onDismiss={() => setSavedNotice(null)}
              />
            </div>
          )}
          <HouseholdDetailPage
            householdId={formRoute.householdId}
            households={households}
            residents={residents}
            isDataLoading={isDataLoading}
            onUpdateHouseholds={onUpdateHouseholds}
            onUpdateResidents={onUpdateResidents}
            onNavigateToGis={onNavigateToGis}
            onBack={() => navigate(ROUTES.DASHBOARD_HOUSEHOLDS)}
            onEdit={(h) => navigate(getHouseholdEditPath(h.id))}
            onAddMember={(h) => navigate(getHouseholdAddMemberPath(h.id))}
            onSelectHousehold={(id) => navigate(getHouseholdDetailPath(id))}
            onOpenRecognition={() =>
              navigate(`${ROUTES.DASHBOARD_HOUSEHOLDS}?tab=recognition`)
            }
            onDeleted={(deletedHousehold) => {
              setSavedNotice(
                `Đã chuyển Sổ ${deletedHousehold.code} (${deletedHousehold.ownerName}) vào thùng rác lưu trữ.`
              );
              navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
            }}
          />
        </div>
      );
    }

    if (formRoute.mode === "add-member") {
      return (
        <div
          key={`add-member-${formRoute.householdId}`}
          className="theme-loading-fade"
        >
          <HouseholdAddMemberPage
            householdId={formRoute.householdId}
            households={households}
            isDataLoading={isDataLoading}
            onUpdateHouseholds={onUpdateHouseholds}
            onUpdateResidents={onUpdateResidents}
            onCancel={() => navigate(ROUTES.DASHBOARD_HOUSEHOLDS)}
            onSaved={(household, addedMemberName) => {
              setSavedNotice(
                `Đã nhập khẩu thành viên "${addedMemberName}" vào Sổ ${household.code} thành công.`
              );
              navigate(getHouseholdDetailPath(household.id));
            }}
          />
        </div>
      );
    }

    const formKey =
      formRoute.mode === "edit"
        ? `edit-${formRoute.householdId}`
        : "create-household";
    return (
      <div key={formKey} className="theme-loading-fade">
        <HouseholdFormPage
          mode={formRoute.mode}
          householdId={
            formRoute.mode === "edit" ? formRoute.householdId : undefined
          }
          households={households}
          residents={residents}
          isDataLoading={isDataLoading}
          onAddHousehold={onAddHousehold}
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
          onCancel={() => navigate(ROUTES.DASHBOARD_HOUSEHOLDS)}
          onSaved={(savedHousehold, mode) => {
            setSavedNotice(
              mode === "edit"
                ? `Đã cập nhật thông tin Sổ hộ khẩu ${savedHousehold.code} (${savedHousehold.ownerName}) thành công.`
                : `Đã lập Sổ hộ khẩu mới ${savedHousehold.code} (${savedHousehold.ownerName}) thành công.`
            );
            navigate(
              mode === "edit"
                ? getHouseholdDetailPath(savedHousehold.id)
                : ROUTES.DASHBOARD_HOUSEHOLDS
            );
          }}
        />
      </div>
    );
  }

  if (isDataLoading && households.length === 0) {
    return (
      <LoadingFade
        variant="page"
        title="Đang tải danh sách sổ hộ khẩu Khu phố 3..."
        subtitle="Đồng bộ dữ liệu hộ tịch từ hệ thống cơ sở dữ liệu Supabase"
      />
    );
  }

  return (
    <div key="households-list" className="space-y-4 theme-loading-fade">
      {savedNotice && (
        <InlineNotice
          message={savedNotice}
          type="success"
          onDismiss={() => setSavedNotice(null)}
        />
      )}
      <HouseholdManagement
        households={households}
        onAddHousehold={onAddHousehold}
        residents={residents}
        onUpdateHouseholds={onUpdateHouseholds}
        onUpdateResidents={onUpdateResidents}
        onNavigateToGis={onNavigateToGis}
      />
    </div>
  );
}
