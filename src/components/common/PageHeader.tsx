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
      className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 ${className}`}
    >
      <div className="space-y-1.5 min-w-0">
        {badgeText && (
          <div className="inline-flex items-center flex-wrap gap-x-2 gap-y-0.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold tracking-wide uppercase leading-tight max-w-full">
            <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-600" aria-hidden="true"></span>
            {renderedBadgeIcon}
            <span className="leading-tight">{badgeText}</span>
            {badgeSubtext && (
              <>
                <span className="text-emerald-800 shrink-0" aria-hidden="true">•</span>
                <span className="font-normal text-xs text-emerald-800 leading-tight">{badgeSubtext}</span>
              </>
            )}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-600 font-normal leading-relaxed">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {actions ? (
          actions
        ) : showDate ? (
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 shrink-0">
            <Clock size={15} className="text-emerald-700" aria-hidden="true" />
            <span>Hôm nay: {new Date().toLocaleDateString("vi-VN")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PageHeader;

