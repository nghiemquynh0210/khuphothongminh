import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import CitizenManagement from "../components/CitizenManagement";
import ResidentFormPage from "./ResidentFormPage";
import ResidentDetailPage from "./ResidentDetailPage";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { LoadingFade } from "../components/common/LoadingFade";
import { Resident, Household, TargetGisItem, ActiveTab } from "../types";
import {
  ROUTES,
  getResidentDetailPath,
  getResidentEditPath,
  navigate,
  parseResidentFormRoute,
  useCurrentLocation,
} from "../routes";

export interface ResidentsPageProps {
  residents: Resident[];
  households: Household[];
  currentUser: any;
  residentPermissions: Record<string, boolean>;
  isDataLoading?: boolean;
  onAddResident: (resident: Resident) => void;
  onDeleteResident: (id: string) => void;
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  onNavigateToGis: (item: TargetGisItem) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function ResidentsPage({
  residents,
  households,
  currentUser,
  residentPermissions,
  isDataLoading = false,
  onAddResident,
  onDeleteResident,
  onUpdateResidents,
  onUpdateHouseholds,
  onNavigateToGis,
  setActiveTab,
}: ResidentsPageProps) {
  const { pathname, search } = useCurrentLocation();
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (currentUser?.role === "nguoidan" && !residentPermissions.residents) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Không có quyền truy cập Nhân khẩu
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Theo quy định bảo vệ dữ liệu cư dân, vai trò Cư dân không được phép tra
          cứu danh bạ nhân khẩu. Quyền này chỉ dành riêng cho Cán bộ Quản lý địa
          bàn.
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

  const formRoute = parseResidentFormRoute(pathname, search);

  if (formRoute) {
    if (formRoute.mode === "detail") {
      return (
        <div key={`detail-${formRoute.residentId}`} className="theme-loading-fade">
          <ResidentDetailPage
            residentId={formRoute.residentId}
            residents={residents}
            households={households}
            isDataLoading={isDataLoading}
            onDeleteResident={onDeleteResident}
            onNavigateToGis={onNavigateToGis}
            onBack={() => navigate(ROUTES.DASHBOARD_RESIDENTS)}
            onEdit={(res) => navigate(getResidentEditPath(res.id))}
            onSelectResident={(id) => navigate(getResidentDetailPath(id))}
            onDeleted={(deletedRes) => {
              setSavedNotice(`Đã xóa hồ sơ cư dân "${deletedRes.fullName}".`);
              navigate(ROUTES.DASHBOARD_RESIDENTS);
            }}
          />
        </div>
      );
    }

    const formKey =
      formRoute.mode === "edit"
        ? `edit-${formRoute.residentId}`
        : `create-${formRoute.isForeigner ? "foreigner" : "standard"}`;
    return (
      <div key={formKey} className="theme-loading-fade">
        <ResidentFormPage
          mode={formRoute.mode}
          residentId={formRoute.mode === "edit" ? formRoute.residentId : undefined}
          initialForeigner={
            formRoute.mode === "create" ? formRoute.isForeigner : false
          }
          residents={residents}
          households={households}
          isDataLoading={isDataLoading}
          onAddResident={onAddResident}
          onUpdateResidents={onUpdateResidents}
          onUpdateHouseholds={onUpdateHouseholds}
          onCancel={() => navigate(ROUTES.DASHBOARD_RESIDENTS)}
          onSaved={(savedRes, mode) => {
            setSavedNotice(
              mode === "edit"
                ? `Đã cập nhật hồ sơ cư dân "${savedRes.fullName}" thành công.`
                : `Đã thêm mới hồ sơ cư dân "${savedRes.fullName}" vào danh sách.`
            );
            navigate(ROUTES.DASHBOARD_RESIDENTS);
          }}
        />
      </div>
    );
  }

  if (isDataLoading && residents.length === 0) {
    return (
      <LoadingFade
        variant="page"
        title="Đang tải danh sách nhân khẩu Khu phố 3..."
        subtitle="Đồng bộ dữ liệu dân cư từ hệ thống cơ sở dữ liệu Supabase"
      />
    );
  }

  return (
    <div key="residents-list" className="space-y-4 theme-loading-fade">
      {savedNotice && (
        <InlineNotice
          message={savedNotice}
          type="success"
          onDismiss={() => setSavedNotice(null)}
        />
      )}
      <CitizenManagement
        residents={residents}
        onAddResident={onAddResident}
        onDeleteResident={onDeleteResident}
        onUpdateResidents={onUpdateResidents}
        onUpdateHouseholds={onUpdateHouseholds}
        households={households}
        onNavigateToGis={onNavigateToGis}
      />
    </div>
  );
}
