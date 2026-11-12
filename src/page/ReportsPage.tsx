import React, { useEffect, useState } from "react";
import FieldReflections from "../components/FieldReflections";
import ReportDetailPage from "./ReportDetailPage";
import ReportFormPage from "./ReportFormPage";
import ReportResolvePage from "./ReportResolvePage";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import {
  FieldReport,
  ReportMessage,
  ReportPriority,
  TargetGisItem,
} from "../types";
import {
  ROUTES,
  getReportCreatePath,
  getReportDetailPath,
  getReportEditPath,
  getReportResolvePath,
  navigate,
  parseReportFormRoute,
  useCurrentLocation,
} from "../routes";

export interface ReportsPageProps {
  reports: FieldReport[];
  isDataLoading?: boolean;
  basePath?: string;
  onAddReport: (newReport: FieldReport) => void;
  onUpdateReportStatus: (
    id: string,
    status: FieldReport["status"],
    actorName?: string,
    actionDetail?: string,
    afterImages?: string[]
  ) => void;
  onUpdateReports?:
    | React.Dispatch<React.SetStateAction<FieldReport[]>>
    | ((reports: FieldReport[]) => void);
  onEditReport?: (updated: FieldReport) => void;
  onDeleteReport?: (id: string) => void;
  onAddMessage?: (reportId: string, msg: ReportMessage) => void;
  onAssignOrPriority?: (
    reportId: string,
    updates: { assignedUnit?: string; priority?: ReportPriority }
  ) => void;
  onSubmitFeedback?: (reportId: string, rating: number, comment: string) => void;
  onReopenReport?: (reportId: string, reason: string, actorName: string) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onCreateTaskFromReport?: (report: FieldReport) => void;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
  readOnly?: boolean;
}

export default function ReportsPage(props: ReportsPageProps) {
  const basePath = props.basePath || ROUTES.DASHBOARD_REPORTS;
  const location = useCurrentLocation();
  const routeMatch = parseReportFormRoute(location.pathname, location.search);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  const readOnly =
    typeof props.readOnly === "boolean"
      ? props.readOnly
      : props.currentUser?.role !== "canbo";

  const actorName =
    props.currentUser?.fullName ||
    (readOnly ? "Cư dân Khu phố 3" : "Cán bộ Ban Điều hành KP3");
  const actorTitle =
    props.currentUser?.title || (readOnly ? "Cư dân" : "Ban Điều hành KP3");

  // Mutator helper for fallback when granular mutators are not passed
  const handleUpdateReportsDirect = (
    updater: (prev: FieldReport[]) => FieldReport[]
  ) => {
    if (props.onUpdateReports) {
      props.onUpdateReports(updater(props.reports));
    }
  };

  const handleEditReport = (updated: FieldReport) => {
    if (props.onEditReport) {
      props.onEditReport(updated);
    } else {
      handleUpdateReportsDirect((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
  };

  const handleDeleteReport = (id: string) => {
    if (props.onDeleteReport) {
      props.onDeleteReport(id);
    } else {
      handleUpdateReportsDirect((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleAddMessage = (reportId: string, msg: ReportMessage) => {
    if (props.onAddMessage) {
      props.onAddMessage(reportId, msg);
    } else {
      handleUpdateReportsDirect((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, messages: [...(r.messages || []), msg] }
            : r
        )
      );
    }
  };

  const handleAppendEvidencePhotos = (
    reportId: string,
    stage: "before" | "after",
    urls: string[]
  ) => {
    const target = props.reports.find((r) => r.id === reportId);
    if (!target) return;
    const updated: FieldReport =
      stage === "before"
        ? {
            ...target,
            beforeImages: Array.from(
              new Set([...(target.beforeImages || []), ...urls])
            ).slice(0, 6),
            beforeImage: target.beforeImages?.[0] || urls[0],
          }
        : {
            ...target,
            afterImages: Array.from(
              new Set([...(target.afterImages || []), ...urls])
            ).slice(0, 6),
            afterImage: target.afterImages?.[0] || urls[0],
          };
    handleEditReport(updated);
  };

  const handleAssignOrChangePriority = (
    reportId: string,
    updates: { assignedUnit?: string; priority?: ReportPriority }
  ) => {
    if (props.onAssignOrPriority) {
      props.onAssignOrPriority(reportId, updates);
    } else {
      handleUpdateReportsDirect((prev) =>
        prev.map((r) => {
          if (r.id !== reportId) return r;
          return {
            ...r,
            assignedUnit: updates.assignedUnit ?? r.assignedUnit,
            priority: updates.priority ?? r.priority,
          };
        })
      );
    }
  };

  const handleStartProcess = (report: FieldReport) => {
    props.onUpdateReportStatus(
      report.id,
      "Đang xử lý",
      actorName,
      `Tổ công tác (${report.assignedUnit || "Ban Điều hành KP3"}) đã tiếp nhận và xuống kiểm tra hiện trường.`
    );
  };

  const handleConfirmResolve = (
    report: FieldReport,
    payload: { afterImages: string[]; note: string; actorName: string }
  ) => {
    props.onUpdateReportStatus(
      report.id,
      "Đã giải quyết",
      payload.actorName,
      payload.note,
      payload.afterImages
    );
  };

  const handleReopenReport = (reportId: string, reason: string) => {
    if (props.onReopenReport) {
      props.onReopenReport(reportId, reason, actorName);
    } else {
      handleUpdateReportsDirect((prev) =>
        prev.map((r) => {
          if (r.id !== reportId) return r;
          return {
            ...r,
            status: "Đang xử lý",
            timeline: [
              ...r.timeline,
              {
                time: new Date().toLocaleDateString("vi-VN"),
                title: "Cư dân yêu cầu kiểm tra lại",
                description: reason,
                actor: actorName,
              },
            ],
          };
        })
      );
    }
  };

  const handleSubmitFeedback = (
    reportId: string,
    rating: number,
    comment: string
  ) => {
    if (props.onSubmitFeedback) {
      props.onSubmitFeedback(reportId, rating, comment);
    } else {
      handleUpdateReportsDirect((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                citizenFeedback: {
                  rating,
                  comment: comment.trim(),
                  satisfied: rating >= 3,
                  submittedAt: new Date().toLocaleDateString("vi-VN"),
                },
              }
            : r
        )
      );
    }
  };

  if (routeMatch) {
    if (routeMatch.mode === "detail") {
      return (
        <ReportDetailPage
          reportId={routeMatch.reportId}
          reports={props.reports}
          isDataLoading={props.isDataLoading}
          readOnly={readOnly}
          currentActorName={actorName}
          currentActorTitle={actorTitle}
          onBack={() => navigate(basePath)}
          onEdit={(report) => navigate(getReportEditPath(report.id, basePath))}
          onResolve={(report) =>
            navigate(getReportResolvePath(report.id, basePath))
          }
          onDeleted={(deleted) => {
            setSavedNotice(
              `Đã xóa hồ sơ phản ánh "${deleted.title}" khỏi hệ thống.`
            );
            navigate(basePath);
          }}
          onAddMessage={handleAddMessage}
          onAppendEvidencePhotos={handleAppendEvidencePhotos}
          onAssignOrChangePriority={handleAssignOrChangePriority}
          onStartProcess={handleStartProcess}
          onDeleteReport={handleDeleteReport}
          onReopenReport={handleReopenReport}
          onSubmitFeedback={handleSubmitFeedback}
          onNavigateToGis={props.onNavigateToGis}
          onCreateTask={props.onCreateTaskFromReport}
        />
      );
    }

    if (routeMatch.mode === "edit") {
      return (
        <ReportFormPage
          mode="edit"
          reportId={routeMatch.reportId}
          reports={props.reports}
          isDataLoading={props.isDataLoading}
          readOnly={readOnly}
          currentUser={props.currentUser}
          onEditReport={handleEditReport}
          onCancel={() =>
            navigate(getReportDetailPath(routeMatch.reportId, basePath))
          }
          onSaved={(saved) => {
            setSavedNotice(`Đã cập nhật hồ sơ phản ánh [${saved.id}] thành công!`);
            navigate(getReportDetailPath(saved.id, basePath));
          }}
        />
      );
    }

    if (routeMatch.mode === "resolve") {
      return (
        <ReportResolvePage
          reportId={routeMatch.reportId}
          reports={props.reports}
          isDataLoading={props.isDataLoading}
          readOnly={readOnly}
          defaultActorName={actorName}
          onConfirmResolve={handleConfirmResolve}
          onCancel={() =>
            navigate(getReportDetailPath(routeMatch.reportId, basePath))
          }
          onResolved={(resolved) => {
            setSavedNotice(
              `Đã hoàn tất xử lý và công khai kết quả hồ sơ [${resolved.id}]!`
            );
            navigate(getReportDetailPath(resolved.id, basePath));
          }}
        />
      );
    }

    return (
      <ReportFormPage
        mode="create"
        reports={props.reports}
        isDataLoading={props.isDataLoading}
        readOnly={readOnly}
        currentUser={props.currentUser}
        onAddReport={props.onAddReport}
        onCancel={() => navigate(basePath)}
        onSaved={(saved) => {
          setSavedNotice(`Đã tiếp nhận phản ánh mới [${saved.id}] thành công!`);
          navigate(getReportDetailPath(saved.id, basePath));
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
        <LoadingFade title="Đang tải dữ liệu phản ánh hiện trường 1022..." />
      ) : (
        <FieldReflections
          {...props}
          basePath={basePath}
          onOpenDetail={(r) => navigate(getReportDetailPath(r.id, basePath))}
          onOpenCreate={() => navigate(getReportCreatePath(basePath))}
          onOpenEdit={(r) => navigate(getReportEditPath(r.id, basePath))}
          onOpenResolve={(r) => navigate(getReportResolvePath(r.id, basePath))}
        />
      )}
    </div>
  );
}
