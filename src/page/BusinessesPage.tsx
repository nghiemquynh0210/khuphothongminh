import React, { useEffect, useState } from "react";
import BusinessManagement from "../components/BusinessManagement";
import BusinessDetailPage from "./BusinessDetailPage";
import BusinessFormPage from "./BusinessFormPage";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { Business, Resident, Household, TargetGisItem } from "../types";
import {
  ROUTES,
  getBusinessCreatePath,
  getBusinessDetailPath,
  getBusinessEditPath,
  navigate,
  parseBusinessFormRoute,
  useCurrentLocation,
} from "../routes";

export interface BusinessesPageProps {
  businesses: Business[];
  residents: Resident[];
  households: Household[];
  isDataLoading?: boolean;
  onToggleCertification: (id: string) => void;
  onUpdateStatus: (id: string, status: any) => void;
  onUpdateBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
  onNavigateToGis: (item: TargetGisItem) => void;
}

export default function BusinessesPage(props: BusinessesPageProps) {
  const location = useCurrentLocation();
  const routeMatch = parseBusinessFormRoute(
    location.pathname,
    location.search
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  if (routeMatch) {
    if (routeMatch.mode === "detail") {
      return (
        <BusinessDetailPage
          businessId={routeMatch.businessId}
          businesses={props.businesses}
          residents={props.residents}
          households={props.households}
          isDataLoading={props.isDataLoading}
          onUpdateStatus={props.onUpdateStatus}
          onUpdateBusinesses={props.onUpdateBusinesses}
          onNavigateToGis={props.onNavigateToGis}
          onBack={() => navigate(ROUTES.DASHBOARD_BUSINESSES)}
          onEdit={(b) => navigate(getBusinessEditPath(b.id))}
          onSelectBusiness={(id) => navigate(getBusinessDetailPath(id))}
          onDeleted={(deleted) => {
            setSavedNotice(
              `Đã xóa hồ sơ cơ sở kinh doanh "${deleted.name}" khỏi hệ thống.`
            );
            navigate(ROUTES.DASHBOARD_BUSINESSES);
          }}
        />
      );
    }

    if (routeMatch.mode === "edit") {
      return (
        <BusinessFormPage
          mode="edit"
          businessId={routeMatch.businessId}
          businesses={props.businesses}
          isDataLoading={props.isDataLoading}
          onUpdateBusinesses={props.onUpdateBusinesses}
          onCancel={() =>
            navigate(getBusinessDetailPath(routeMatch.businessId))
          }
          onSaved={(saved) => {
            setSavedNotice(
              `Đã cập nhật hồ sơ cơ sở kinh doanh "${saved.name}" thành công!`
            );
            navigate(getBusinessDetailPath(saved.id));
          }}
        />
      );
    }

    return (
      <BusinessFormPage
        mode="create"
        businesses={props.businesses}
        isDataLoading={props.isDataLoading}
        onUpdateBusinesses={props.onUpdateBusinesses}
        onCancel={() => navigate(ROUTES.DASHBOARD_BUSINESSES)}
        onSaved={(saved) => {
          setSavedNotice(
            `Đã đăng ký cơ sở kinh doanh "${saved.name}" thành công!`
          );
          navigate(getBusinessDetailPath(saved.id));
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {savedNotice && (
        <InlineNotice
          type="success"
          message={savedNotice}
          onDismiss={() => setSavedNotice(null)}
        />
      )}
      {props.isDataLoading ? (
        <LoadingFade title="Đang tải dữ liệu cơ sở kinh doanh và nhà trọ..." />
      ) : (
        <BusinessManagement
          {...props}
          onOpenDetail={(b) => navigate(getBusinessDetailPath(b.id))}
          onOpenCreate={() => navigate(getBusinessCreatePath())}
          onOpenEdit={(b) => navigate(getBusinessEditPath(b.id))}
        />
      )}
    </div>
  );
}
