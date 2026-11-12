import React, { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { FieldReport } from "../../types";
import { Button } from "../ui";

export interface DeleteReportModalProps {
  report: FieldReport | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

export function DeleteReportModal({
  report,
  onClose,
  onConfirmDelete,
}: DeleteReportModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!report) return;
    cancelBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [report, onClose]);

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-report-title"
        aria-describedby="delete-report-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
            <Trash2 className="size-5 text-rose-700" aria-hidden="true" />
          </div>
          <h2 id="delete-report-title" className="text-lg font-semibold text-slate-900">
            Xóa phản ánh hiện trường?
          </h2>
          <div className="col-span-2 mt-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:mt-0.5">
            <p id="delete-report-desc" className="text-sm/6 text-slate-600">
              Hồ sơ{" "}
              <span className="font-medium text-slate-900">
                [{report.id}] {report.title}
              </span>{" "}
              cùng toàn bộ hình ảnh và lịch sử trao đổi sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelBtnRef}
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirmDelete(report.id);
              onClose();
            }}
          >
            Xóa phản ánh
          </Button>
        </div>
      </div>
    </div>
  );
}

