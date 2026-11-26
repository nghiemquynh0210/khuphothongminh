import React from "react";
import { formatVNNumber, formatTextNumbers } from "../../utils/numberFormat";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }> | React.ReactNode;
  subtext?: React.ReactNode;
  subtextRight?: React.ReactNode;
  badge?: React.ReactNode;
  color?: "emerald" | "blue" | "indigo" | "amber" | "rose" | "purple" | "slate";
  onClick?: () => void;
  className?: string;
  highlighted?: boolean;
}

/**
 * Minimalist KPI Stat Card — compact height, sentence-case typography, and 90-8-2 color restraint.
 * Reserves amber/rose strictly for actionable alerts while keeping general metrics calm and legible.
 */
export function StatCard({
  label,
  value,
  icon,
  subtext,
  subtextRight,
  badge,
  color = "emerald",
  onClick,
  className = "",
  highlighted = false,
}: StatCardProps) {
  // 90-8-2 palette discipline: calm neutral/emerald for informational metrics, semantic amber/rose only for alerts
  const iconColorStyles = {
    emerald: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60",
    blue: "bg-slate-50 text-slate-600 border-slate-200/80",
    indigo: "bg-slate-50 text-slate-600 border-slate-200/80",
    purple: "bg-slate-50 text-slate-600 border-slate-200/80",
    slate: "bg-slate-50 text-slate-600 border-slate-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  const formattedValue = React.useMemo(() => {
    if (typeof value === "number") {
      return formatVNNumber(value);
    }
    if (typeof value === "string") {
      return formatTextNumbers(value);
    }
    return value;
  }, [value]);

  const formattedSubtext = React.useMemo(() => {
    if (typeof subtext === "string") {
      return formatTextNumbers(subtext);
    }
    return subtext;
  }, [subtext]);

  const formattedSubtextRight = React.useMemo(() => {
    if (typeof subtextRight === "string") {
      return formatTextNumbers(subtextRight);
    }
    return subtextRight;
  }, [subtextRight]);

  const hasFooter = Boolean(formattedSubtext || formattedSubtextRight);

  const renderedIcon = React.useMemo(() => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || (typeof icon === "object" && (icon as any)?.$$typeof)) {
      const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComponent size={16} />;
    }
    return null;
  }, [icon]);

  const baseClasses = `w-full text-left bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border transition-colors duration-150 group flex flex-col justify-between shadow-2xs ${
    highlighted
      ? "border-slate-900 ring-1 ring-slate-900/10"
      : "border-slate-200/80 hover:border-slate-300"
  } ${
    onClick
      ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      : ""
  } ${className}`;

  const content = (
    <>
      <div className="flex justify-between items-start gap-1.5 sm:gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 block leading-snug truncate">
            {label}
          </span>
          <div className="flex items-baseline flex-wrap gap-x-1 sm:gap-x-1.5 gap-y-0.5 min-w-0">
            <span className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-tight tabular-nums whitespace-nowrap">
              {formattedValue}
            </span>
            {badge && (
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border shrink-0 flex items-center justify-center ${iconColorStyles[color]}`}
          aria-hidden="true"
        >
          {renderedIcon}
        </div>
      </div>

      {hasFooter && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center text-[11px] text-slate-500 gap-x-2 gap-y-0.5">
          <div className="truncate">{formattedSubtext}</div>
          {formattedSubtextRight && (
            <div className="shrink-0 text-slate-600 font-medium">{formattedSubtextRight}</div>
          )}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export default StatCard;
