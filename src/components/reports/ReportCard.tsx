import React from "react";
import {
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { FieldReport } from "../../types";
import {
  REPORT_PRIORITY_CONFIG,
  getAfterImages,
  getBeforeImages,
  getCategoryMeta,
  getSlaStatus,
} from "../../data/reportConfig";
import { Button, StatusBadge, StatusType } from "../ui";
import { ReportImage } from "./ImageLightboxModal";

export interface ReportCardProps {
  report: FieldReport;
  readOnly: boolean;
  onOpenDetail: (report: FieldReport) => void;
  onStartProcess: (report: FieldReport) => void;
  onOpenResolve: (report: FieldReport) => void;
}

export function mapReportStatusToBadge(status: FieldReport["status"]): {
  type: StatusType;
  label: string;
} {
  if (status === "Đã giải quyết") {
    return { type: "completed", label: "Đã giải quyết" };
  }
  if (status === "Đang xử lý") {
    return { type: "in_progress", label: "Đang xử lý" };
  }
  return { type: "pending", label: "Đã tiếp nhận" };
}

export function ReportCard({
  report,
  readOnly,
  onOpenDetail,
  onStartProcess,
  onOpenResolve,
}: ReportCardProps) {
  const beforeImgs = getBeforeImages(report);
  const afterImgs = getAfterImages(report);
  const totalPhotos = beforeImgs.length + afterImgs.length;
  const catMeta = getCategoryMeta(report.category);
  const priority = report.priority || "Bình thường";
  const prioMeta = REPORT_PRIORITY_CONFIG[priority];
  const sla = getSlaStatus(report);
  const statusInfo = mapReportStatusToBadge(report.status);
  const visibleMessages = (report.messages || []).filter((m) =>
    readOnly ? !m.isInternal : true
  );

  return (
    <article className="bg-white rounded-xl border border-slate-200/80 hover:border-emerald-500/70 transition-colors flex flex-col justify-between overflow-hidden h-full">
      {/* 1. Thumbnail Header */}
      <button
        type="button"
        onClick={() => onOpenDetail(report)}
        className="relative block w-full h-40 bg-slate-100 border-b border-slate-200/80 overflow-hidden text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        aria-label={`Xem chi tiết và ảnh phản ánh ${report.title}`}
      >
        {beforeImgs.length > 0 && afterImgs.length > 0 ? (
          <div className="grid grid-cols-2 w-full h-full gap-0.5 bg-white">
            <div className="relative h-full overflow-hidden">
              <ReportImage
                src={beforeImgs[0]}
                alt={`Hiện trạng: ${report.title}`}
                className="w-full h-full object-cover group-hover:opacity-95 transition-opacity duration-200"
              />
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/85 text-white text-xs font-semibold">
                Trước
              </span>
            </div>
            <div className="relative h-full overflow-hidden">
              <ReportImage
                src={afterImgs[0]}
                alt={`Sau xử lý: ${report.title}`}
                className="w-full h-full object-cover group-hover:opacity-95 transition-opacity duration-200"
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-800 text-white text-xs font-semibold">
                Sau xong
              </span>
            </div>
          </div>
        ) : beforeImgs.length > 0 ? (
          <ReportImage
            src={beforeImgs[0]}
            alt={`Ảnh hiện trường: ${report.title}`}
            className="w-full h-full object-cover group-hover:opacity-95 transition-opacity duration-200"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-600 bg-slate-50">
            <Camera size={22} className="text-slate-500" aria-hidden="true" />
            <span className="text-xs font-medium">Chưa có ảnh hiện trường</span>
          </div>
        )}

        {/* Top Category Badge */}
        <span
          className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
        >
          {report.category}
        </span>

        {/* Photo Count Chip */}
        {totalPhotos > 0 && !(beforeImgs.length > 0 && afterImgs.length > 0) && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/85 text-white text-xs font-semibold">
            <Camera size={12} aria-hidden="true" />
            <span>{totalPhotos} ảnh</span>
          </span>
        )}
      </button>

      {/* 2. Body Info (concise, touch-safe title >= 32px) */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-slate-600">
              {report.id}
            </span>
            {priority !== "Bình thường" && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${prioMeta.bg} ${prioMeta.text} ${prioMeta.border}`}
              >
                <ShieldAlert size={11} aria-hidden="true" />
                {priority}
              </span>
            )}
          </div>
          <StatusBadge status={statusInfo.type} label={statusInfo.label} size="sm" />
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(report)}
          className="w-full min-h-8 py-1 flex items-center text-left text-sm font-bold text-slate-900 hover:text-emerald-700 leading-snug cursor-pointer transition-colors focus-visible:outline-none focus-visible:underline"
        >
          <span className="line-clamp-2 text-pretty">{report.title}</span>
        </button>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 min-w-0 pt-0.5">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin size={13} className="shrink-0 text-slate-600" aria-hidden="true" />
            <span className="truncate">{report.location}</span>
          </span>
        </div>

        {/* Meta Strip: SLA + Messages */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              sla.state === "overdue"
                ? "text-rose-700 font-semibold"
                : sla.state === "warning"
                ? "text-amber-800 font-semibold"
                : sla.state === "completed"
                ? "text-emerald-800"
                : "text-slate-600"
            }`}
          >
            {sla.state === "completed" ? (
              <CheckCircle2 size={13} aria-hidden="true" />
            ) : (
              <Clock size={13} aria-hidden="true" />
            )}
            <span>{sla.shortLabel}</span>
          </span>

          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            <MessageSquare size={13} aria-hidden="true" />
            <span>
              {visibleMessages.length > 0
                ? `${visibleMessages.length} trao đổi`
                : "Chưa có tin nhắn"}
            </span>
          </span>
        </div>
      </div>

      {/* 3. Clean Visible Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600 truncate font-medium">
          {report.assignedUnit || "Ban Điều hành KP3"}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {!readOnly && report.status === "Đã tiếp nhận" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStartProcess(report)}
            >
              Tiếp nhận
            </Button>
          )}
          {!readOnly && report.status === "Đang xử lý" && (
            <Button
              variant="emerald"
              size="sm"
              onClick={() => onOpenResolve(report)}
            >
              Hoàn tất
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenDetail(report)}
          >
            {readOnly ? "Xem & Nhắn tin" : "Chi tiết"}
          </Button>
        </div>
      </div>
    </article>
  );
}

