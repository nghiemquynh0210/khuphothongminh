import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  MessageSquareWarning,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  FieldReport,
  ReportMessage,
  ReportPriority,
  TargetGisItem,
} from "../types";
import {
  REPORT_CATEGORIES,
  REPORT_PRIORITY_CONFIG,
  formatNowVNString,
  getBeforeImages,
  getAfterImages,
  getSlaStatus,
  normalizeReport,
} from "../data/reportConfig";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { Button, EmptyState } from "./ui";
import { ReportSelect } from "./reports/ReportSelect";
import { ReportCard } from "./reports/ReportCard";
import { ReportTable } from "./reports/ReportTable";
import { ReportDetailModal } from "./reports/ReportDetailModal";
import { ReportFormModal } from "./reports/ReportFormModal";
import { ResolveReportModal } from "./reports/ResolveReportModal";
import { DeleteReportModal } from "./reports/DeleteReportModal";
import { ImageLightboxModal, LightboxImageItem } from "./reports/ImageLightboxModal";

export interface FieldReflectionsProps {
  reports: FieldReport[];
  onAddReport: (newReport: FieldReport) => void;
  onUpdateReportStatus: (
    id: string,
    status: FieldReport["status"],
    actorName?: string,
    actionDetail?: string,
    afterImages?: string[]
  ) => void;
  onUpdateReports?: (reports: FieldReport[]) => void;
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

export default function FieldReflections({
  reports,
  onAddReport,
  onUpdateReportStatus,
  onUpdateReports,
  onEditReport,
  onDeleteReport,
  onAddMessage,
  onAssignOrPriority,
  onSubmitFeedback,
  onReopenReport,
  onNavigateToGis,
  onCreateTaskFromReport,
  currentUser,
  readOnly: readOnlyProp,
}: FieldReflectionsProps) {
  const readOnly =
    typeof readOnlyProp === "boolean"
      ? readOnlyProp
      : currentUser?.role !== "canbo";

  const actorName =
    currentUser?.fullName || (readOnly ? "Cư dân Khu phố 3" : "Cán bộ Ban Điều hành KP3");
  const actorTitle =
    currentUser?.title || (readOnly ? "Cư dân" : "Ban Điều hành KP3");

  // Normalize all incoming reports safely
  const normalizedReports = useMemo(
    () => reports.map((r) => normalizeReport(r)),
    [reports]
  );

  // Filters & view state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Tất cả");
  const [statusFilter, setStatusFilter] = useState<string>("Tất cả");
  const [priorityFilter, setPriorityFilter] = useState<string>("Tất cả");
  const [onlySlaRisk, setOnlySlaRisk] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Active modals state
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [formModalState, setFormModalState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    target: FieldReport | null;
  }>({ open: false, mode: "create", target: null });
  const [resolveTarget, setResolveTarget] = useState<FieldReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FieldReport | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    items: LightboxImageItem[];
    index: number;
  }>({ items: [], index: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => normalizedReports.find((r) => r.id === selectedReportId) || null,
    [normalizedReports, selectedReportId]
  );

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Derived KPI metrics
  const kpi = useMemo(() => {
    const total = normalizedReports.length;
    const pending = normalizedReports.filter((r) => r.status === "Đã tiếp nhận").length;
    const inProgress = normalizedReports.filter((r) => r.status === "Đang xử lý").length;
    const resolved = normalizedReports.filter((r) => r.status === "Đã giải quyết").length;
    const withPhotos = normalizedReports.filter(
      (r) => getBeforeImages(r).length > 0 || getAfterImages(r).length > 0
    ).length;
    const slaRiskCount = normalizedReports.filter((r) => {
      const s = getSlaStatus(r);
      return s.state === "overdue" || s.state === "warning";
    }).length;
    const totalMessages = normalizedReports.reduce(
      (sum, r) =>
        sum + (r.messages || []).filter((m) => (readOnly ? !m.isInternal : true)).length,
      0
    );
    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return {
      total,
      pending,
      inProgress,
      resolved,
      withPhotos,
      slaRiskCount,
      totalMessages,
      resolvedRate,
    };
  }, [normalizedReports, readOnly]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return normalizedReports.filter((r) => {
      const matchQuery =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q) ||
        (r.assignedUnit || "").toLowerCase().includes(q);
      const matchCat = categoryFilter === "Tất cả" || r.category === categoryFilter;
      const matchStatus = statusFilter === "Tất cả" || r.status === statusFilter;
      const matchPrio =
        priorityFilter === "Tất cả" || (r.priority || "Bình thường") === priorityFilter;
      const sla = getSlaStatus(r);
      const matchSla =
        !onlySlaRisk || sla.state === "overdue" || sla.state === "warning";
      return matchQuery && matchCat && matchStatus && matchPrio && matchSla;
    });
  }, [
    normalizedReports,
    searchTerm,
    categoryFilter,
    statusFilter,
    priorityFilter,
    onlySlaRisk,
  ]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    categoryFilter !== "Tất cả" ||
    statusFilter !== "Tất cả" ||
    priorityFilter !== "Tất cả" ||
    onlySlaRisk;

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("Tất cả");
    setStatusFilter("Tất cả");
    setPriorityFilter("Tất cả");
    setOnlySlaRisk(false);
  };

  // Fallback helper if App didn't pass granular mutators
  const mutateReportsList = (updater: (prev: FieldReport[]) => FieldReport[]) => {
    if (onUpdateReports) {
      onUpdateReports(updater(normalizedReports));
    }
  };

  const handleStartProcess = (report: FieldReport) => {
    onUpdateReportStatus(
      report.id,
      "Đang xử lý",
      actorName,
      `Tổ công tác (${report.assignedUnit || "Ban Điều hành KP3"}) đã tiếp nhận và xuống kiểm tra hiện trường.`
    );
    setToastMsg(`Đã chuyển hồ sơ ${report.id} sang trạng thái Đang xử lý.`);
  };

  const handleConfirmResolve = (
    report: FieldReport,
    payload: { afterImages: string[]; note: string; actorName: string }
  ) => {
    onUpdateReportStatus(
      report.id,
      "Đã giải quyết",
      payload.actorName,
      payload.note,
      payload.afterImages
    );
    setToastMsg(`Đã hoàn tất xử lý và lưu minh chứng ảnh cho hồ sơ ${report.id}.`);
  };

  const handleSaveCreate = (newReport: FieldReport) => {
    onAddReport(newReport);
    setToastMsg(`Đã tiếp nhận phản ánh mới [${newReport.id}] vào hệ thống.`);
  };

  const handleSaveEdit = (updated: FieldReport) => {
    if (onEditReport) {
      onEditReport(updated);
    } else {
      mutateReportsList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
    setToastMsg(`Đã cập nhật thông tin hồ sơ ${updated.id}.`);
  };

  const handleConfirmDelete = (id: string) => {
    if (selectedReportId === id) setSelectedReportId(null);
    if (onDeleteReport) {
      onDeleteReport(id);
    } else {
      mutateReportsList((prev) => prev.filter((r) => r.id !== id));
    }
    setToastMsg(`Đã xóa hồ sơ phản ánh ${id}.`);
  };

  const handleSendMessage = (reportId: string, msg: ReportMessage) => {
    if (onAddMessage) {
      onAddMessage(reportId, msg);
    } else {
      mutateReportsList((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, messages: [...(r.messages || []), msg] }
            : r
        )
      );
    }
    setToastMsg(msg.isInternal ? "Đã lưu ghi chú nội bộ tổ công tác." : "Đã gửi tin nhắn trao đổi.");
  };

  const handleAppendEvidencePhotos = (
    reportId: string,
    stage: "before" | "after",
    urls: string[]
  ) => {
    const target = normalizedReports.find((r) => r.id === reportId);
    if (!target) return;
    const updated: FieldReport =
      stage === "before"
        ? {
            ...target,
            beforeImages: Array.from(new Set([...getBeforeImages(target), ...urls])).slice(0, 6),
            beforeImage: getBeforeImages(target)[0] || urls[0],
          }
        : {
            ...target,
            afterImages: Array.from(new Set([...getAfterImages(target), ...urls])).slice(0, 6),
            afterImage: getAfterImages(target)[0] || urls[0],
          };
    handleSaveEdit(updated);
  };

  const handleAssignOrChangePriority = (
    reportId: string,
    updates: { assignedUnit?: string; priority?: ReportPriority }
  ) => {
    if (onAssignOrPriority) {
      onAssignOrPriority(reportId, updates);
    } else {
      mutateReportsList((prev) =>
        prev.map((r) => {
          if (r.id !== reportId) return r;
          const nextPriority = updates.priority || r.priority || "Bình thường";
          return {
            ...r,
            assignedUnit: updates.assignedUnit ?? r.assignedUnit,
            priority: nextPriority,
            slaHours: REPORT_PRIORITY_CONFIG[nextPriority].slaHours,
          };
        })
      );
    }
    setToastMsg(`Đã cập nhật điều phối cho hồ sơ ${reportId}.`);
  };

  const handleSubmitCitizenFeedback = (
    reportId: string,
    rating: number,
    comment: string
  ) => {
    if (onSubmitFeedback) {
      onSubmitFeedback(reportId, rating, comment);
    } else {
      mutateReportsList((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                citizenFeedback: {
                  rating,
                  comment: comment.trim(),
                  satisfied: rating >= 3,
                  submittedAt: formatNowVNString(),
                },
              }
            : r
        )
      );
    }
    setToastMsg("Cảm ơn cư dân đã xác nhận và đánh giá kết quả xử lý.");
  };

  const handleReopenCase = (reportId: string, reason: string) => {
    if (onReopenReport) {
      onReopenReport(reportId, reason, actorName);
    } else {
      mutateReportsList((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: "Đang xử lý",
                timeline: [
                  ...r.timeline,
                  {
                    time: formatNowVNString(),
                    title: "Cư dân yêu cầu kiểm tra lại",
                    description: reason,
                    actor: actorName,
                  },
                ],
                messages: [
                  ...(r.messages || []),
                  {
                    id: `MSG-REOPEN-${Date.now()}`,
                    senderRole: "citizen",
                    senderName: actorName,
                    senderTitle: "Cư dân",
                    content: `[Mở lại hồ sơ] ${reason}`,
                    createdAt: formatNowVNString(),
                    isInternal: false,
                  },
                ],
              }
            : r
        )
      );
    }
    setToastMsg(`Đã chuyển hồ sơ ${reportId} về trạng thái Đang xử lý để kiểm tra lại.`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/40 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium"
        >
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Executive Page Header */}
      <PageHeader
        badgeIcon={<MessageSquareWarning size={14} className="text-emerald-700 shrink-0" />}
        badgeText="CỔNG PHẢN ÁNH 1022 • KP3 AN PHÚ"
        badgeSubtext={readOnly ? "CHẾ ĐỘ CƯ DÂN" : "ĐIỀU PHỐI 2 CHIỀU"}
        title="Tiếp Nhận & Xử Lý Phản Ánh Hiện Trường"
        description={
          readOnly
            ? "Gửi phản ánh hiện trường kèm đa ảnh thực tế, theo dõi tiến độ và nhắn tin trao đổi trực tiếp với cán bộ KP3."
            : "Tiếp nhận phản ánh, điều phối tổ công tác theo SLA, trao đổi 2 chiều với cư dân và nghiệm thu bằng ảnh Trước–Sau."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="emerald"
              size="md"
              leftIcon={<Plus size={15} />}
              onClick={() =>
                setFormModalState({ open: true, mode: "create", target: null })
              }
            >
              Gửi Phản Ánh Mới
            </Button>
          </div>
        }
      />

      {/* Citizen Role Guard Notice */}
      {readOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#073B72] font-medium">
          <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
          <span>
            Bạn đang xem kênh phản ánh với vai trò <strong>Cư dân Khu phố 3</strong>. Số điện thoại cá nhân được bảo mật và chỉ cán bộ phụ trách mới có quyền điều phối hoặc xóa hồ sơ.
          </span>
        </div>
      )}

      {/* 4 Non-Truncating KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Tổng hồ sơ"
          value={kpi.total}
          badge="vụ"
          icon={MessageSquareWarning}
          color="emerald"
          highlighted={statusFilter === "Tất cả" && !onlySlaRisk}
          subtext={`${kpi.withPhotos} hồ sơ có ảnh`}
          subtextRight="KP3 1022"
          onClick={() => {
            setStatusFilter("Tất cả");
            setOnlySlaRisk(false);
          }}
        />
        <StatCard
          label="Mới tiếp nhận"
          value={kpi.pending}
          badge="chờ"
          icon={Clock}
          color="amber"
          highlighted={statusFilter === "Đã tiếp nhận"}
          subtext="Cần xác minh"
          subtextRight={kpi.slaRiskCount > 0 ? `${kpi.slaRiskCount} gấp SLA` : "Trong hạn"}
          onClick={() =>
            setStatusFilter((s) => (s === "Đã tiếp nhận" ? "Tất cả" : "Đã tiếp nhận"))
          }
        />
        <StatCard
          label="Đang xử lý"
          value={kpi.inProgress}
          badge="vụ"
          icon={AlertTriangle}
          color="blue"
          highlighted={statusFilter === "Đang xử lý"}
          subtext="Tổ đang xử lý"
          subtextRight={`${kpi.totalMessages} trao đổi`}
          onClick={() =>
            setStatusFilter((s) => (s === "Đang xử lý" ? "Tất cả" : "Đang xử lý"))
          }
        />
        <StatCard
          label="Đã giải quyết"
          value={kpi.resolved}
          badge="xong"
          icon={CheckCircle2}
          color="emerald"
          highlighted={statusFilter === "Đã giải quyết"}
          subtext="Đạt tiêu chuẩn"
          subtextRight={`${kpi.resolvedRate}% xong`}
          onClick={() =>
            setStatusFilter((s) => (s === "Đã giải quyết" ? "Tất cả" : "Đã giải quyết"))
          }
        />
      </div>

      {/* Unified Filter & View Bar (2 balanced rows: spacious search + never-orphaned view toggle & 4-cell filter strip) */}
      <search className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 w-full">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="reports-search-input" className="sr-only">
              Tìm kiếm phản ánh hiện trường
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              size={16}
              aria-hidden="true"
            />
            <input
              id="reports-search-input"
              name="fieldReportSearch"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã, nội dung..."
              className="w-full h-9 pl-9 pr-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Grid / Table Mode Switch anchored beside search */}
          <div
            role="group"
            aria-label="Chế độ hiển thị"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0"
          >
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              aria-label="Chế độ Thẻ ảnh"
              onClick={() => setViewMode("grid")}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Thẻ ảnh</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              aria-label="Chế độ Bảng"
              onClick={() => setViewMode("table")}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center gap-2">
          <ReportSelect
            aria-label="Lọc theo danh mục"
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="w-full lg:w-44"
            options={[
              { value: "Tất cả", label: "Tất cả nhóm" },
              ...REPORT_CATEGORIES.slice(0, 6).map((c) => ({
                value: c.id,
                label: c.label,
              })),
            ]}
          />

          <ReportSelect
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-full lg:w-40"
            options={[
              { value: "Tất cả", label: "Mọi trạng thái" },
              { value: "Đã tiếp nhận", label: "Đã tiếp nhận" },
              { value: "Đang xử lý", label: "Đang xử lý" },
              { value: "Đã giải quyết", label: "Đã giải quyết" },
            ]}
          />

          <ReportSelect
            aria-label="Lọc theo mức ưu tiên"
            value={priorityFilter}
            onChange={setPriorityFilter}
            className="w-full lg:w-40"
            options={[
              { value: "Tất cả", label: "Mọi mức SLA" },
              { value: "Khẩn cấp", label: "Khẩn cấp (4h)" },
              { value: "Cao", label: "Ưu tiên cao (24h)" },
              { value: "Bình thường", label: "Bình thường (72h)" },
            ]}
          />

          <div className="flex items-center gap-2 flex-wrap">
            {kpi.slaRiskCount > 0 && (
              <button
                type="button"
                onClick={() => setOnlySlaRisk((v) => !v)}
                aria-pressed={onlySlaRisk}
                className={`h-9 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                  onlySlaRisk
                    ? "bg-rose-700 text-white border-rose-700"
                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                }`}
              >
                <AlertTriangle size={13} aria-hidden="true" />
                <span>Gấp / Quá hạn ({kpi.slaRiskCount})</span>
              </button>
            )}

            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<RotateCcw size={13} />}
                onClick={resetFilters}
              >
                Xóa lọc
              </Button>
            )}
          </div>
        </div>
      </search>

      {/* Main Content: Empty / Cards / Table */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title="Không có phản ánh phù hợp"
          description={
            hasActiveFilters
              ? "Thử xóa bộ lọc hiện tại hoặc tìm với từ khóa khác."
              : "Chưa có hồ sơ phản ánh nào được ghi nhận trong hệ thống."
          }
          actionText={hasActiveFilters ? "Đặt lại bộ lọc" : "Gửi Phản Ánh Mới"}
          onAction={
            hasActiveFilters
              ? resetFilters
              : () => setFormModalState({ open: true, mode: "create", target: null })
          }
        />
      ) : viewMode === "table" ? (
        <ReportTable
          reports={filteredReports}
          readOnly={readOnly}
          onOpenDetail={(r) => setSelectedReportId(r.id)}
          onStartProcess={handleStartProcess}
          onOpenResolve={(r) => setResolveTarget(r)}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <React.Fragment key={report.id}>
                <ReportCard
                  report={report}
                  readOnly={readOnly}
                  onOpenDetail={(r) => setSelectedReportId(r.id)}
                  onStartProcess={handleStartProcess}
                  onOpenResolve={(r) => setResolveTarget(r)}
                />
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-slate-600 px-1">
            Đang hiển thị {filteredReports.length} / {normalizedReports.length} hồ sơ phản ánh hiện trường KP3.
          </p>
        </div>
      )}

      {/* Detail + 2-Way Communication Drawer/Modal */}
      <ReportDetailModal
        report={selectedReport}
        readOnly={readOnly}
        currentActorName={actorName}
        currentActorTitle={actorTitle}
        onClose={() => setSelectedReportId(null)}
        onOpenLightbox={(items, index) => setLightboxState({ items, index })}
        onAddMessage={handleSendMessage}
        onAppendEvidencePhotos={handleAppendEvidencePhotos}
        onAssignOrChangePriority={handleAssignOrChangePriority}
        onStartProcess={handleStartProcess}
        onOpenResolve={(r) => setResolveTarget(r)}
        onOpenEdit={(r) =>
          setFormModalState({ open: true, mode: "edit", target: r })
        }
        onOpenDelete={(r) => setDeleteTarget(r)}
        onReopenReport={handleReopenCase}
        onSubmitFeedback={handleSubmitCitizenFeedback}
        onNavigateToGis={onNavigateToGis}
        onCreateTask={
          onCreateTaskFromReport
            ? (r) => {
                onCreateTaskFromReport(r);
                setToastMsg(`Đã chuyển phản ánh "${r.title}" sang bảng Nhiệm vụ & Lịch công tác.`);
              }
            : undefined
        }
      />

      {/* Create / Edit Report Modal */}
      <ReportFormModal
        isOpen={formModalState.open}
        mode={formModalState.mode}
        initialReport={formModalState.target}
        readOnly={readOnly}
        defaultReporterName={currentUser?.fullName || ""}
        onClose={() =>
          setFormModalState((s) => ({ ...s, open: false, target: null }))
        }
        onSaveCreate={handleSaveCreate}
        onSaveEdit={handleSaveEdit}
      />

      {/* Resolve & Mandatory Proof Photo Modal */}
      <ResolveReportModal
        report={resolveTarget}
        defaultActorName={actorName}
        onClose={() => setResolveTarget(null)}
        onConfirmResolve={handleConfirmResolve}
      />

      {/* Safe Delete Confirmation AlertDialog */}
      <DeleteReportModal
        report={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Fullscreen Lightbox Viewer */}
      <ImageLightboxModal
        images={lightboxState.items}
        currentIndex={lightboxState.index}
        onChangeIndex={(index) => setLightboxState((s) => ({ ...s, index }))}
        onClose={() => setLightboxState({ items: [], index: 0 })}
      />
    </div>
  );
}
