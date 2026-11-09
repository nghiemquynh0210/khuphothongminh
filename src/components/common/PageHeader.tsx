import React from "react";
import { Clock } from "lucide-react";

export interface PageHeaderProps {
  badgeIcon?: React.ComponentType<{ size?: number; className?: string }> | React.ReactNode;
  badgeText?: string;
  badgeSubtext?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  showDate?: boolean;
}

/**
 * Standardized Page Header synchronized with Dashboard Executive Banner standard.
 * - Gradient surface from-slate-50 via-white to-emerald-50/40 with rounded-2xl border border-slate-200 shadow-2xs
 * - Left: Badge with pulsing indicator + bold authoritative title
 * - Right: Action buttons or Live Date pill badge
 */
export function PageHeader({
  badgeIcon,
  badgeText,
  badgeSubtext,
  title,
  description,
  actions,
  className = "",
  showDate = true,
}: PageHeaderProps) {
  const renderedBadgeIcon = React.useMemo(() => {
    if (!badgeIcon) return null;
    if (React.isValidElement(badgeIcon)) return badgeIcon;
    if (typeof badgeIcon === "function" || (typeof badgeIcon === "object" && (badgeIcon as any)?.$$typeof)) {
      const IconComponent = badgeIcon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComponent size={14} className="text-emerald-600" />;
    }
    return null;
  }, [badgeIcon]);

  return (
    <div
      className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-5 md:p-6 rounded-2xl border border-slate-200 shadow-2xs ${className}`}
    >
      <div className="space-y-1.5 min-w-0">
        {badgeText && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {renderedBadgeIcon}
            <span>{badgeText}</span>
            {badgeSubtext && (
              <>
                <span className="text-emerald-300">•</span>
                <span className="font-normal text-[11px] text-emerald-700">{badgeSubtext}</span>
              </>
            )}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {actions ? (
          actions
        ) : showDate ? (
          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-mono text-slate-600 shrink-0">
            <Clock size={15} className="text-emerald-600" />
            <span>Hôm nay: {new Date().toLocaleDateString("vi-VN")}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PageHeader;

