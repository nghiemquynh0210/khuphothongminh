import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, X } from "lucide-react";
import CitizenManagement from "../components/CitizenManagement";
import ResidentFormPage from "./ResidentFormPage";
import ResidentDetailPage from "./ResidentDetailPage";
import { Resident, Household, TargetGisItem, ActiveTab } from "../types";
import { ROUTES, navigate, parseResidentsSubRoute, useCurrentLocation } from "../routes";
import { synchronizeHouseholdsOnResidentEdit } from "../utils/residentFormUtils";

export interface ResidentsPageProps {
  residents: Resident[];
  households: Household[];
  currentUser: {
    username?: string;
    fullName?: string;
    role?: "canbo" | "nguoidan";
  } | null;
  residentPermissions: Record<string, boolean>;
  isDataLoading?: boolean;
  onAddResident: (resident: Resident) => Promise<void> | void;
  onUpdateResident?: (updatedResident: Resident, oldResident: Resident) => Promise<void> | void;
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
  onUpdateResident,
  onDeleteResident,
  onUpdateResidents,
  onUpdateHouseholds,
  onNavigateToGis,
  setActiveTab
}: ResidentsPageProps) {
  const { pathname, search } = useCurrentLocation();
  const subRoute = parseResidentsSubRoute(pathname, search);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (currentUser?.role === "nguoidan" && !residentPermissions.residents) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không có quyền truy cập Nhân khẩu</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Theo quy định bảo vệ dữ liệu cư dân, vai trò Cư dân không được phép tra cứu danh bạ nhân khẩu. Quyền này chỉ dành riêng cho Cán bộ Quản lý địa bàn.
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

  const handleSaveResident = async (
    savedResident: Resident,
    isEdit: boolean,
    oldResident?: Resident
  ) => {
    if (isEdit && oldResident) {
      if (onUpdateResident) {
        await onUpdateResident(savedResident, oldResident);
      } else {
        onUpdateResidents(prev =>
          prev.map(r => (r.id === oldResident.id ? savedResident : r))
        );
        onUpdateHouseholds(prev =>
          synchronizeHouseholdsOnResidentEdit(prev, oldResident, savedResident)
        );
      }
      setToastMessage(`Đã cập nhật hồ sơ cư dân ${savedResident.fullName} thành công.`);
    } else {
      await onAddResident(savedResident);
      setToastMessage(`Đã thêm mới hồ sơ cư dân ${savedResident.fullName} vào hệ thống.`);
    }
  };

  if (subRoute?.mode === "create") {
    return (
      <div key={`create-${subRoute.isForeigner ? "foreigner" : "standard"}`}>
        <ResidentFormPage
          mode="create"
          initialIsForeigner={subRoute.isForeigner}
          residents={residents}
          households={households}
          isDataLoading={isDataLoading}
          onSaveResident={handleSaveResident}
        />
      </div>
    );
  }

  if (subRoute?.mode === "edit") {
    const hasLoadedResident = residents.some(r => r.id === subRoute.residentId);
    return (
      <div key={`edit-${subRoute.residentId}-${hasLoadedResident ? "ready" : "pending"}`}>
        <ResidentFormPage
          mode="edit"
          residentId={subRoute.residentId}
          residents={residents}
          households={households}
          isDataLoading={isDataLoading}
          onSaveResident={handleSaveResident}
        />
      </div>
    );
  }

  if (subRoute?.mode === "detail") {
    return (
      <ResidentDetailPage
        residentId={subRoute.residentId}
        residents={residents}
        households={households}
        isDataLoading={isDataLoading}
        onDeleteResident={(id, residentName) => {
          onDeleteResident(id);
          setToastMessage(
            residentName
              ? `Đã xóa hồ sơ cư dân ${residentName} khỏi hệ thống.`
              : "Đã xóa hồ sơ cư dân khỏi hệ thống."
          );
          navigate(ROUTES.DASHBOARD_RESIDENTS);
        }}
        onNavigateToGis={onNavigateToGis}
      />
    );
  }

  return (
    <div className="space-y-4">
      {toastMessage && (
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
