import React from "react";
import { formatVNNumber, formatTextNumbers } from "../../utils/numberFormat";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  subtext?: string;
  badge?: React.ReactNode;
  color?: "emerald" | "blue" | "indigo" | "amber" | "rose" | "purple" | "slate";
  onClick?: () => void;
  className?: string;
}

/**
 * Standardized KPI Stat Card for all dashboard modules.
 * Adheres to Meta Astryx design system principles:
 * - High-contrast WCAG AAA metrics display
 * - 4dp spacing grid with consistent padding and radius
 * - Semantic accent icon container with subtle border
 * - Automatic Vietnamese thousands dot separators (e.g. 11632 -> 11.632)
 */
export function StatCard({
  label,
  value,
  icon,
  subtext,
  badge,
  color = "emerald",
  onClick,
  className = ""
}: StatCardProps) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    blue: "bg-blue-50 text-blue-700 border-blue-200/80",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
    slate: "bg-slate-100 text-slate-700 border-slate-200/80"
  };

  // Format value: if number, use formatVNNumber; if string, format any raw numbers inside
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

  return (
    <div
      onClick={onClick}
      className={`astryx-card bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3.5 ${
        onClick ? "cursor-pointer hover:border-slate-300" : ""
      } ${className}`}
      data-variant="default"
      data-elevation="none"
    >
      <div className="space-y-1 min-w-0 flex-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
            {formattedValue}
          </span>
          {badge}
        </div>
        {formattedSubtext && (
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
            {formattedSubtext}
          </p>
        )}
      </div>

      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${colorMap[color]}`}>
        {icon}
      </div>
    </div>
  );
}

export default StatCard;

