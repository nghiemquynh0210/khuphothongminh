import React from "react";

export interface DetailRowProps {
  label: string;
  value?: React.ReactNode;
  colSpan?: 1 | 2;
  isMono?: boolean;
  className?: string;
  labelWidth?: string;
  badge?: React.ReactNode;
  helperText?: string;
}

/**
 * Standardized single-line detail row: [Label]: [Value]
 * Enforces uniform typography, font sizes, colors, and responsive alignment across all detail modals.
 */
export function DetailRow({
  label,
  value,
  colSpan = 1,
  isMono = false,
  className = "",
  labelWidth = "min-w-[140px] sm:min-w-[160px]",
  badge,
  helperText,
}: DetailRowProps) {
  // Format label to guarantee ending with ':'
  const cleanLabel = label.trim();
  const formattedLabel = cleanLabel.endsWith(":") ? cleanLabel : `${cleanLabel}:`;

  return (
    <div
      className={`flex items-baseline gap-2 py-2 border-b border-slate-100/90 text-xs sm:text-sm ${
        colSpan === 2 ? "md:col-span-2" : ""
      } ${className}`}
    >
      <span className={`text-slate-500 font-medium shrink-0 text-xs select-none ${labelWidth}`}>
        {formattedLabel}
      </span>
      <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-1.5">
        {typeof value === "string" || typeof value === "number" ? (
          <strong
            className={`text-slate-900 font-semibold text-xs sm:text-sm leading-snug break-words ${
              isMono ? "font-mono" : ""
            }`}
          >
            {value || "Chưa cập nhật"}
          </strong>
        ) : (
          value ?? <strong className="text-slate-400 font-normal text-xs sm:text-sm">Chưa cập nhật</strong>
        )}
        {badge}
        {helperText && (
          <span className="text-[11.5px] text-slate-400 font-normal block sm:inline ml-1">
            ({helperText})
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Responsive 2-column grid for DetailRow items.
 */
export function DetailGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5 ${className}`}>
      {children}
    </div>
  );
}

export default DetailRow;
