import React from "react";
import { Camera, MessageSquare } from "lucide-react";
import { FieldReport } from "../../types";
import {
  REPORT_PRIORITY_CONFIG,
  getAfterImages,
  getBeforeImages,
  getCategoryMeta,
  getSlaStatus,
} from "../../data/reportConfig";
import {
  Button,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui";
import { mapReportStatusToBadge } from "./ReportCard";

export interface ReportTableProps {
  reports: FieldReport[];
  readOnly: boolean;
  onOpenDetail: (report: FieldReport) => void;
  onStartProcess: (report: FieldReport) => void;
  onOpenResolve: (report: FieldReport) => void;
}

export function ReportTable({
  reports,
  readOnly,
  onOpenDetail,
  onStartProcess,
  onOpenResolve,
}: ReportTableProps) {
  return (
    <Table aria-label="Bảng theo dõi phản ánh hiện trường KP3">
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Mã HS</TableHead>
          <TableHead>Nội dung &amp; Địa điểm</TableHead>
          <TableHead className="w-40">Nhóm / Ưu tiên</TableHead>
          <TableHead className="w-44">Đơn vị phụ trách</TableHead>
          <TableHead className="w-28">Minh chứng</TableHead>
          <TableHead className="w-36">Trạng thái / SLA</TableHead>
          <TableHead className="text-right w-48">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => {
          const catMeta = getCategoryMeta(report.category);
          const priority = report.priority || "Bình thường";
          const prioMeta = REPORT_PRIORITY_CONFIG[priority];
          const beforeCount = getBeforeImages(report).length;
          const afterCount = getAfterImages(report).length;
          const visibleMsgs = (report.messages || []).filter((m) =>
            readOnly ? !m.isInternal : true
          ).length;
          const sla = getSlaStatus(report);
          const badgeInfo = mapReportStatusToBadge(report.status);

          return (
            <TableRow key={report.id}>
              <TableCell className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                {report.id}
              </TableCell>
              <TableCell>
                <div className="space-y-0.5 max-w-md">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(report)}
                    className="font-semibold text-slate-900 hover:text-emerald-700 text-left line-clamp-1 cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    {report.title}
                  </button>
                  <div className="text-xs text-slate-600 truncate">
                    {report.location} • {report.reportedAt}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
                  >
                    {report.category}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${prioMeta.bg} ${prioMeta.text} ${prioMeta.border}`}
                  >
                    {priority}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-700 font-medium">
                {report.assignedUnit || "Ban Điều hành KP3"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3 text-xs text-slate-700 tabular-nums">
                  <span className="inline-flex items-center gap-1" title="Tổng số ảnh đính kèm">
                    <Camera size={13} className="text-slate-600" aria-hidden="true" />
                    {beforeCount + afterCount}
                  </span>
                  <span className="inline-flex items-center gap-1" title="Số tin nhắn trao đổi">
                    <MessageSquare size={13} className="text-slate-600" aria-hidden="true" />
                    {visibleMsgs}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={badgeInfo.type} label={badgeInfo.label} size="sm" />
                  <span
                    className={`text-[11px] font-medium ${
                      sla.state === "overdue"
                        ? "text-rose-700 font-semibold"
                        : sla.state === "warning"
                        ? "text-amber-800"
                        : "text-slate-600"
                    }`}
                  >
                    {sla.shortLabel}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center justify-end gap-1.5">
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
                    Chi tiết
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

