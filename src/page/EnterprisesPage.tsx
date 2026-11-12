import React, { useEffect, useState } from "react";
import EnterpriseManagement from "../components/EnterpriseManagement";
import EnterpriseDetailPage from "./EnterpriseDetailPage";
import EnterpriseFormPage from "./EnterpriseFormPage";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { Business, Resident, Household, TargetGisItem } from "../types";
import {
  ROUTES,
  getEnterpriseDetailPath,
  getEnterpriseEditPath,
  navigate,
  parseEnterpriseFormRoute,
  useCurrentLocation,
} from "../routes";

export interface EnterprisesPageProps {
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

export default function EnterprisesPage(props: EnterprisesPageProps) {
  const location = useCurrentLocation();
  const routeMatch = parseEnterpriseFormRoute(
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
        <EnterpriseDetailPage
          enterpriseId={routeMatch.enterpriseId}
          businesses={props.businesses}
          residents={props.residents}
          households={props.households}
          isDataLoading={props.isDataLoading}
          onUpdateStatus={props.onUpdateStatus}
          onUpdateBusinesses={props.onUpdateBusinesses}
          onNavigateToGis={props.onNavigateToGis}
          onBack={() => navigate(ROUTES.DASHBOARD_ENTERPRISES)}
          onEdit={(enterprise) =>
            navigate(getEnterpriseEditPath(enterprise.id))
          }
          onSelectEnterprise={(enterpriseId) =>
            navigate(getEnterpriseDetailPath(enterpriseId))
          }
          onDeleted={(deleted) => {
            setSavedNotice(
              `Đã xóa hồ sơ doanh nghiệp "${deleted.name}" khỏi hệ thống.`
            );
            navigate(ROUTES.DASHBOARD_ENTERPRISES);
          }}
        />
      );
    }

    if (routeMatch.mode === "edit") {
      return (
        <EnterpriseFormPage
          mode="edit"
          enterpriseId={routeMatch.enterpriseId}
          businesses={props.businesses}
          isDataLoading={props.isDataLoading}
          onUpdateBusinesses={props.onUpdateBusinesses}
          onCancel={() =>
            navigate(getEnterpriseDetailPath(routeMatch.enterpriseId))
          }
          onSaved={(saved) => {
            setSavedNotice(
              `Đã cập nhật hồ sơ doanh nghiệp "${saved.name}" thành công!`
            );
            navigate(getEnterpriseDetailPath(saved.id));
          }}
        />
      );
    }

    return (
      <EnterpriseFormPage
        mode="create"
        businesses={props.businesses}
        isDataLoading={props.isDataLoading}
        onUpdateBusinesses={props.onUpdateBusinesses}
        onCancel={() => navigate(ROUTES.DASHBOARD_ENTERPRISES)}
        onSaved={(saved) => {
          setSavedNotice(
            `Đã thêm mới hồ sơ doanh nghiệp "${saved.name}" thành công!`
          );
          navigate(getEnterpriseDetailPath(saved.id));
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
      {props.isDataLoading && props.businesses.length === 0 ? (
        <LoadingFade title="Đang tải danh sách doanh nghiệp..." />
      ) : (
        <EnterpriseManagement
          businesses={props.businesses}
          residents={props.residents}
          households={props.households}
          onToggleCertification={props.onToggleCertification}
          onUpdateStatus={props.onUpdateStatus}
          onUpdateBusinesses={props.onUpdateBusinesses}
          onNavigateToGis={props.onNavigateToGis}
        />
      )}
    </div>
  );
}
