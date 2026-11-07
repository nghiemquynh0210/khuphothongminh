import React from "react";

export interface PageHeaderProps {
  badgeIcon?: React.ReactNode;
  badgeText?: string;
  badgeSubtext?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Page Header across all admin and citizen modules.
 * Ensures uniform visual hierarchy, authoritative government badges, and action alignment.
 */
export function PageHeader({
  badgeIcon,
  badgeText,
  badgeSubtext,
  title,
  description,
  actions,
  className = ""
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${className}`}>
      <div className="space-y-1">
        {badgeText && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
            {badgeIcon}
            <span>{badgeText}</span>
            {badgeSubtext && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-normal text-[11px] text-emerald-700">{badgeSubtext}</span>
              </>
            )}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
          {title}
        </h1>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;

