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
 * Standardized KPI Stat Card for all modules synchronized with Dashboard Executive Standard.
 * - Top Row: [Label] + [Value + Badge] on the left, [Icon Container] on the right with interactive hover effect.
 * - Bottom Row: [Subtext Left] and [Subtext Right] separated by a clean top border.
 * - Card Surface: High-elevation rounded-2xl border, shadow-xs, hover:shadow-lg, hover:border-emerald-500.
 * - Automatic Vietnamese thousands dot separators (e.g. 11632 -> 11.632).
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
  const iconColorStyles = {
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white border-emerald-100",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white border-indigo-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white border-amber-100",
    rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white border-rose-100",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white border-purple-100",
    slate: "bg-slate-100 text-slate-600 group-hover:bg-slate-600 group-hover:text-white border-slate-200"
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

  const formattedSubtextRight = React.useMemo(() => {
    if (typeof subtextRight === "string") {
      return formatTextNumbers(subtextRight);
    }
    return subtextRight;
  }, [subtextRight]);

  const hasFooter = Boolean(formattedSubtext || formattedSubtextRight);

  // Safely render icon whether passed as a JSX element <Icon size={20} /> or component type Icon
  const renderedIcon = React.useMemo(() => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || (typeof icon === "object" && (icon as any)?.$$typeof)) {
      const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComponent size={20} />;
    }
    return null;
  }, [icon]);

  return (
    <div
      onClick={onClick}
      className={`astryx-card bg-white p-4 sm:p-5 rounded-2xl border transition-all duration-300 shadow-xs group interactive-card interactive-tap flex flex-col justify-between ${
        highlighted 
          ? "border-2 border-emerald-500 shadow-sm" 
          : "border-slate-200/90 hover:border-emerald-500 hover:shadow-lg"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      data-variant="default"
      data-elevation="none"
    >
      {/* Top Header: Label, Big Number, Badge & Icon */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1.5 min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
            {label}
          </span>
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {formattedValue}
            </span>
            {badge && (
              <span className="text-xs font-bold text-slate-500">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border shrink-0 transition-colors duration-300 ${iconColorStyles[color]}`}>
          {renderedIcon}
        </div>
      </div>

      {/* Bottom Footer: Subtext & Metadata split */}
      {hasFooter && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 gap-2">
          <div className="truncate font-medium">{formattedSubtext}</div>
          {formattedSubtextRight && (
            <div className="shrink-0 text-slate-400 font-medium">{formattedSubtextRight}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default StatCard;

