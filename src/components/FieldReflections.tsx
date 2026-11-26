import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Filter,
  LayoutGrid,
  List,
  MessageCircle,
  MessageSquareWarning,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
} from "lucide-react";
import {
  FieldReport,
  ReportMessage,
  ReportPriority,
  Resident,
  TargetGisItem,
} from "../types";
import {
  REPORT_CATEGORIES,
  getBeforeImages,
  getAfterImages,
  getSlaStatus,
  normalizeReport,
} from "../data/reportConfig";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { Button, EmptyState } from "./ui";
import Pagination from "./Pagination";
import { formatShortRecordId } from "../utils/kp3Utils";
import { recordAuditLog } from "../utils/auditLogger";
import { ReportSelect } from "./reports/ReportSelect";
import { ReportCard } from "./reports/ReportCard";
import { ReportTable } from "./reports/ReportTable";
import { ZaloOaChatInbox } from "./reports/ZaloOaChatInbox";
import { SecurityPatrolLogTab } from "./reports/SecurityPatrolLogTab";
import {
  ROUTES,
  getReportCreatePath,
  getReportDetailPath,
  getReportResolvePath,
  navigate,
} from "../routes";

export interface FieldReflectionsProps {
  reports: FieldReport[];
  basePath?: string;
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
  onOpenDetail?: (report: FieldReport) => void;
  onOpenCreate?: () => void;
  onOpenEdit?: (report: FieldReport) => void;
  onOpenResolve?: (report: FieldReport) => void;
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
  readOnly?: boolean;
  residents?: Resident[];
}

export default function FieldReflections({
  reports,
  basePath = ROUTES.DASHBOARD_REPORTS,
  onAddReport,
  onUpdateReportStatus,
  onOpenDetail,
  onOpenCreate,
  onOpenResolve,
  viewMode: viewModeProp,
  onViewModeChange,
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
  const [internalViewMode, setInternalViewMode] = useState<"grid" | "table">("grid");
  const viewMode = viewModeProp ?? internalViewMode;
  const setViewMode = (mode: "grid" | "table") => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const REPORTS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState<"reports" | "zalo_inbox" | "patrol_logs">("reports");
  const [zaloUnreadCount, setZaloUnreadCount] = useState(0);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, priorityFilter, onlySlaRisk]);

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
  const [showReportFilters, setShowReportFilters] = useState(false);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("Tất cả");
    setStatusFilter("Tất cả");
    setPriorityFilter("Tất cả");
    setOnlySlaRisk(false);
  };

  const handleStartProcess = (report: FieldReport) => {
    onUpdateReportStatus(
      report.id,
      "Đang xử lý",
      actorName,
      `Tổ công tác (${report.assignedUnit || "Ban Điều hành KP3"}) đã tiếp nhận và xuống kiểm tra hiện trường.`
    );
    setToastMsg(`Đã chuyển hồ sơ ${formatShortRecordId(report.id, "PA")} sang trạng thái Đang xử lý.`);
  };

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / REPORTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReports = useMemo(() => {
    const start = (safeCurrentPage - 1) * REPORTS_PER_PAGE;
    return filteredReports.slice(start, start + REPORTS_PER_PAGE);
  }, [filteredReports, safeCurrentPage]);

  const handleExport1022Excel = () => {
    const rows = filteredReports.map((r) => {
      const sla = getSlaStatus(r);
      return {
        "Mã HS": formatShortRecordId(r.id, "PA"),
        "Tiêu đề": r.title,
        "Phân loại": r.category,
        "Địa điểm": r.location,
        "Thời gian gửi": r.reportedAt,
        "Đơn vị xử lý": r.assignedUnit || "Ban Điều hành KP3",
        "Trạng thái": r.status,
        "Đánh giá SLA": `${sla.label} (${sla.deadlineLabel})`,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 38 },
      { wch: 20 },
      { wch: 32 },
      { wch: 18 },
      { wch: 26 },
      { wch: 16 },
      { wch: 28 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PhanAnh1022_KP3");
    const fileName = `Bao_cao_1022_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    recordAuditLog({
      actorName,
      actorRole: "Cán bộ BĐH Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất Báo cáo Phản ánh 1022 (.xlsx)",
      targetSummary: `${filteredReports.length} hồ sơ phản ánh (${fileName})`,
    });

    setToastMsg(`Đã xuất báo cáo ${filteredReports.length} hồ sơ 1022 ra tệp ${fileName}.`);
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
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<FileSpreadsheet size={15} className="text-emerald-700" />}
                onClick={handleExport1022Excel}
              >
                Xuất Báo cáo 1022 (.xlsx)
              </Button>
            )}
            <Button
              variant="emerald"
              size="md"
              leftIcon={<Plus size={15} />}
              onClick={() =>
                onOpenCreate
                  ? onOpenCreate()
                  : navigate(getReportCreatePath(basePath))
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

      {/* Segmented Sub-Tab for Staff: Phản ánh 1022 vs Hộp thư Zalo OA */}
      {!readOnly && (
        <div
          role="tablist"
          aria-label="Phân khu Phản ánh hiện trường"
          className="flex items-center overflow-x-auto whitespace-nowrap max-w-full p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 w-fit no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "reports"}
            onClick={() => setActiveSubTab("reports")}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === "reports"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquareWarning size={13} className="text-emerald-700" />
            <span>Hồ sơ Phản ánh ({kpi.total})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "zalo_inbox"}
            onClick={() => setActiveSubTab("zalo_inbox")}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === "zalo_inbox"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageCircle size={13} className="text-blue-600" />
            <span>Hộp thư Zalo OA</span>
            {zaloUnreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                {zaloUnreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "patrol_logs"}
            onClick={() => setActiveSubTab("patrol_logs")}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === "patrol_logs"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield size={13} className="text-amber-700" />
            <span>Tuần tra ANTT</span>
          </button>
        </div>
      )}

      {!readOnly && activeSubTab === "patrol_logs" ? (
        <SecurityPatrolLogTab onAddReport={onAddReport} currentUser={currentUser} />
      ) : !readOnly && activeSubTab === "zalo_inbox" ? (
        <ZaloOaChatInbox
          reports={normalizedReports}
          onAddReport={onAddReport}
          onUnreadCountChange={setZaloUnreadCount}
          onOpenReportDetail={(r) =>
            onOpenDetail ? onOpenDetail(r) : navigate(getReportDetailPath(r.id, basePath))
          }
          currentUser={currentUser}
        />
      ) : (
        <>

      {/* 4 KPI Cards (2x2 on Mobile) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Tổng hồ sơ"
          value={kpi.total}
          badge="hồ sơ"
          icon={MessageSquareWarning}
          color="emerald"
          highlighted={statusFilter === "Tất cả" && !onlySlaRisk}
          subtext={kpi.withPhotos > 0 ? `${kpi.withPhotos} có ảnh` : undefined}
          onClick={() => {
            setStatusFilter("Tất cả");
            setOnlySlaRisk(false);
          }}
        />
        <StatCard
          label="Mới tiếp nhận"
          value={kpi.pending}
          badge="chờ xử lý"
          icon={Clock}
          color="amber"
          highlighted={statusFilter === "Đã tiếp nhận"}
          subtext={kpi.slaRiskCount > 0 ? `${kpi.slaRiskCount} gấp SLA` : undefined}
          onClick={() =>
            setStatusFilter((s) => (s === "Đã tiếp nhận" ? "Tất cả" : "Đã tiếp nhận"))
          }
        />
        <StatCard
          label="Đang xử lý"
          value={kpi.inProgress}
          badge="hồ sơ"
          icon={AlertTriangle}
          color="blue"
          highlighted={statusFilter === "Đang xử lý"}
          subtext={kpi.totalMessages > 0 ? `${kpi.totalMessages} trao đổi` : undefined}
          onClick={() =>
            setStatusFilter((s) => (s === "Đang xử lý" ? "Tất cả" : "Đang xử lý"))
          }
        />
        <StatCard
          label="Đã giải quyết"
          value={kpi.resolved}
          badge={`${kpi.resolvedRate}%`}
          icon={CheckCircle2}
          color="emerald"
          highlighted={statusFilter === "Đã giải quyết"}
          onClick={() =>
            setStatusFilter((s) => (s === "Đã giải quyết" ? "Tất cả" : "Đã giải quyết"))
          }
        />
      </div>

      {/* Minimalist Single-Row Filter & View Bar */}
      <search className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="reports-search-input" className="sr-only">
              Tìm kiếm phản ánh hiện trường
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={15}
              aria-hidden="true"
            />
            <input
              id="reports-search-input"
              name="fieldReportSearch"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã hồ sơ, nội dung, địa điểm..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50/70 focus:bg-white text-slate-900 text-xs rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {kpi.slaRiskCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlySlaRisk((v) => !v)}
              aria-pressed={onlySlaRisk}
              className={`h-9 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                onlySlaRisk
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
              }`}
            >
              <AlertTriangle size={13} aria-hidden="true" />
              <span>Gấp ({kpi.slaRiskCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowReportFilters((v) => !v)}
            className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              showReportFilters ||
              categoryFilter !== "Tất cả" ||
              statusFilter !== "Tất cả" ||
              priorityFilter !== "Tất cả"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter size={13} />
            <span>Bộ lọc</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          )}

          {/* Grid / Table Mode Switch anchored beside search */}
          <div
            role="group"
            aria-label="Chế độ hiển thị"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 shrink-0 ml-auto sm:ml-0"
          >
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              aria-label="Chế độ Thẻ ảnh"
              onClick={() => setViewMode("grid")}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Thẻ</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              aria-label="Chế độ Bảng"
              onClick={() => setViewMode("table")}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
          </div>
        </div>

        {(showReportFilters ||
          categoryFilter !== "Tất cả" ||
          statusFilter !== "Tất cả" ||
          priorityFilter !== "Tất cả") && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-slate-100">
            <ReportSelect
              aria-label="Lọc theo danh mục"
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="w-full"
              options={[
                { value: "Tất cả", label: "Tất cả nhóm" },
                ...REPORT_CATEGORIES.map((c) => ({
                  value: c.id,
                  label: c.label,
                })),
              ]}
            />

            <ReportSelect
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full"
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
              className="w-full"
              options={[
                { value: "Tất cả", label: "Mọi mức SLA" },
                { value: "Khẩn cấp", label: "Khẩn cấp (4h)" },
                { value: "Cao", label: "Ưu tiên cao (24h)" },
                { value: "Bình thường", label: "Bình thường (72h)" },
              ]}
            />
          </div>
        )}
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
              : () =>
                  onOpenCreate
                    ? onOpenCreate()
                    : navigate(getReportCreatePath(basePath))
          }
        />
      ) : viewMode === "table" ? (
        <div className="space-y-3">
          <ReportTable
            reports={paginatedReports}
            readOnly={readOnly}
            onOpenDetail={(r) =>
              onOpenDetail
                ? onOpenDetail(r)
                : navigate(getReportDetailPath(r.id, basePath))
            }
            onStartProcess={handleStartProcess}
            onOpenResolve={(r) =>
              onOpenResolve
                ? onOpenResolve(r)
                : navigate(getReportResolvePath(r.id, basePath))
            }
          />
          <Pagination
            currentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
            totalItems={filteredReports.length}
            itemsPerPage={REPORTS_PER_PAGE}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedReports.map((report) => (
              <React.Fragment key={report.id}>
                <ReportCard
                  report={report}
                  readOnly={readOnly}
                  onOpenDetail={(r) =>
                    onOpenDetail
                      ? onOpenDetail(r)
                      : navigate(getReportDetailPath(r.id, basePath))
                  }
                  onStartProcess={handleStartProcess}
                  onOpenResolve={(r) =>
                    onOpenResolve
                      ? onOpenResolve(r)
                      : navigate(getReportResolvePath(r.id, basePath))
                  }
                />
              </React.Fragment>
            ))}
          </div>
          <Pagination
            currentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
            totalItems={filteredReports.length}
            itemsPerPage={REPORTS_PER_PAGE}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
}
