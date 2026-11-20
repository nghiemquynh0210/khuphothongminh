import React from "react";
import { ArrowLeft, Clock } from "lucide-react";

export interface PageHeaderProps {
  badgeIcon?: React.ComponentType<{ size?: number; className?: string }> | React.ReactNode;
  badgeText?: string;
  badgeSubtext?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  onBackClick?: () => void;
  backLabel?: string;
  className?: string;
  showDate?: boolean;
}

/**
 * Standardized Page Header synchronized with Dashboard Executive Banner standard.
 * - Clean Enterprise surface with rounded-2xl border border-slate-200
 * - Left: Optional Back navigation + Badge + authoritative title
 * - Right: Responsive wrapping Action buttons or Live Date pill badge
 */
export function PageHeader({
  title,
  actions,
  onBackClick,
  backLabel = "Quay lại",
  className = "",
  showDate = true,
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
        {onBackClick && (
          <button
            type="button"
            onClick={onBackClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>{backLabel}</span>
          </button>
        )}
        <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight text-balance break-words">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto md:justify-end min-w-0 [&>*]:max-w-full">
        {actions ? (
          actions
        ) : showDate ? (
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium tabular-nums text-slate-700 shrink-0">
            <Clock size={15} className="text-emerald-700" aria-hidden="true" />
            <span>Hôm nay: {new Date().toLocaleDateString("vi-VN")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PageHeader;

