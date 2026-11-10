import React, { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import BusinessManagement from "../components/BusinessManagement";
import BusinessDetailPage from "./BusinessDetailPage";
import BusinessFormPage from "./BusinessFormPage";
import { Business, Household, Resident, TargetGisItem } from "../types";
import { parseBusinessesSubRoute, useCurrentLocation } from "../routes";

export interface BusinessesPageProps {
  businesses: Business[];
  residents: Resident[];
  households: Household[];
  isDataLoading?: boolean;
  onToggleCertification: (id: string) => void;
  onUpdateStatus: (
    id: string,
    status:
      | "Đang hoạt động"
      | "Tạm ngưng"
      | "Chờ duyệt"
      | "Chuyển địa điểm"
      | "Chưa xác minh"
  ) => void;
  onUpdateBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
  onNavigateToGis: (item: TargetGisItem) => void;
}

export default function BusinessesPage({
  businesses,
  residents,
  households,
  isDataLoading = false,
  onToggleCertification,
  onUpdateStatus,
  onUpdateBusinesses,
  onNavigateToGis
}: BusinessesPageProps) {
  const { pathname } = useCurrentLocation();
  const subRoute = parseBusinessesSubRoute(pathname);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleSaveBusiness = (
    savedBusiness: Business,
    isEdit: boolean,
    oldBusiness?: Business
  ) => {
    if (isEdit && oldBusiness) {
      onUpdateBusinesses(prev =>
        prev.map(b => (b.id === oldBusiness.id ? savedBusiness : b))
      );
    } else {
      onUpdateBusinesses(prev => [savedBusiness, ...prev]);
    }
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
      <div key="business-create" className="space-y-4">
        {toastBanner}
        <BusinessFormPage
          mode="create"
          businesses={businesses}
          isDataLoading={isDataLoading}
          onSaveBusiness={handleSaveBusiness}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  if (subRoute?.mode === "edit") {
    const hasLoaded = businesses.some(b => b.id === subRoute.businessId);
    return (
      <div
        key={`business-edit-${subRoute.businessId}-${hasLoaded ? "ready" : "pending"}`}
        className="space-y-4"
      >
        {toastBanner}
        <BusinessFormPage
          mode="edit"
          businessId={subRoute.businessId}
          businesses={businesses}
          isDataLoading={isDataLoading}
          onSaveBusiness={handleSaveBusiness}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  if (subRoute?.mode === "detail") {
    return (
      <div key={`business-detail-${subRoute.businessId}`} className="space-y-4">
        {toastBanner}
        <BusinessDetailPage
          businessId={subRoute.businessId}
          businesses={businesses}
          residents={residents}
          households={households}
          isDataLoading={isDataLoading}
          onToggleCertification={onToggleCertification}
          onUpdateStatus={onUpdateStatus}
          onUpdateBusinesses={onUpdateBusinesses}
          onNavigateToGis={onNavigateToGis}
          onShowToast={setToastMessage}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toastBanner}
      <BusinessManagement
        businesses={businesses}
        residents={residents}
        households={households}
        onToggleCertification={onToggleCertification}
        onUpdateStatus={onUpdateStatus}
        onUpdateBusinesses={onUpdateBusinesses}
        onNavigateToGis={onNavigateToGis}
      />
    </div>
  );
}
