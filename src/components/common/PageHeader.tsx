import React from "react";
import { ArrowLeft } from "lucide-react";

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
 * Minimalist Flat Page Header — airy, borderless layout aligned with executive portal standards.
 * Eliminates nested header boxes and duplicate clock pills to keep primary content above the fold.
 */
export function PageHeader({
  title,
  description,
  actions,
  onBackClick,
  backLabel = "Quay lại",
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1 ${className}`}
    >
      <div className={`min-w-0 max-w-full space-y-0.5 ${onBackClick ? "block" : "hidden md:block"}`}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {onBackClick && (
            <button
              type="button"
              onClick={onBackClick}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span>{backLabel}</span>
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight text-balance break-words">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-xs text-slate-500 line-clamp-1">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:justify-end min-w-0 shrink-0 [&>*]:max-w-full">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
