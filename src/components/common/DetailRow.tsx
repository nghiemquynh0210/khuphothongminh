import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface DetailRowProps {
  label: string;
  value?: React.ReactNode;
  colSpan?: 1 | 2;
  isMono?: boolean;
  isNumeric?: boolean;
  className?: string;
  labelWidth?: string;
  badge?: React.ReactNode;
  helperText?: string;
  copyValue?: string;
  href?: string;
}

const EMPTY_VALUE_PATTERN = /^(chưa cập nhật|chưa ghi nhận|chưa có|n\/a|null|undefined|-)$/i;

function isEffectivelyEmpty(value: React.ReactNode): boolean {
  if (value === null || value === undefined || value === false) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" || EMPTY_VALUE_PATTERN.test(trimmed);
  }
  return false;
}

/**
 * Standardized semantic description row (<dt> / <dd>) following UI/UX description-list rules:
 * - Responsive @container stacking below 384px, fixed label column above.
 * - Uses "—" for missing values rather than verbose placeholder text.
 * - Optional inline copy button with 40px touch target and tel:/mailto: link support.
 */
export function DetailRow({
  label,
  value,
  colSpan = 1,
  isMono = false,
  isNumeric = false,
  className = "",
  labelWidth = "",
  badge,
  helperText,
  copyValue,
  href,
}: DetailRowProps) {
  const [copied, setCopied] = useState(false);
  const cleanLabel = label.trim().replace(/:+$/, "");
  const empty = isEffectivelyEmpty(value);

  const handleCopy = () => {
    const textToCopy = copyValue ?? (typeof value === "string" || typeof value === "number" ? String(value) : "");
    if (!textToCopy || empty) return;
    navigator.clipboard?.writeText(textToCopy).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`group grid gap-1 py-2.5 border-b border-slate-100 text-xs sm:text-sm @sm:grid-cols-[8.75rem_minmax(0,1fr)] @sm:items-baseline @sm:gap-4 ${
        colSpan === 2 ? "md:col-span-2" : ""
      } ${className}`}
    >
      <dt className={`text-slate-500 font-medium text-xs select-none leading-5 ${labelWidth}`}>
        {cleanLabel}
      </dt>
      <dd className="min-w-0 flex flex-wrap items-center gap-1.5">
        {empty ? (
          <span className="text-slate-400 font-normal" aria-label="Chưa có thông tin">
            —
          </span>
        ) : href ? (
          <a
            href={href}
            className={`text-slate-900 font-semibold leading-snug break-words hover:underline decoration-slate-400 underline-offset-2 ${
              isMono ? "font-mono" : ""
            } ${isNumeric ? "tabular-nums" : ""}`}
          >
            {value}
          </a>
        ) : typeof value === "string" || typeof value === "number" ? (
          <span
            className={`text-slate-900 font-semibold leading-snug [overflow-wrap:anywhere] ${
              isMono ? "font-mono" : ""
            } ${isNumeric ? "tabular-nums" : ""}`}
          >
            {value}
          </span>
        ) : (
          <span className="text-slate-900 font-semibold leading-snug min-w-0">{value}</span>
        )}
        {!empty && copyValue && (
          <button
            type="button"
            onClick={handleCopy}
            className="relative inline-flex items-center justify-center size-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer before:absolute before:-inset-1.5 sm:opacity-75 sm:group-hover:opacity-100 focus:opacity-100"
            title={copied ? "Đã sao chép" : `Sao chép ${cleanLabel.toLowerCase()}`}
            aria-label={copied ? `Đã sao chép ${cleanLabel}` : `Sao chép ${cleanLabel}`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        )}
        {badge}
        {helperText && (
          <span className="text-xs text-slate-500 font-normal">({helperText})</span>
        )}
      </dd>
    </div>
  );
}

/**
 * Semantic 2-column responsive description list (<dl>) with @container queries.
 */
export function DetailGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl className={`@container grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 ${className}`}>
      {children}
    </dl>
  );
}

/**
 * Single-column semantic description list (<dl>) for compact detail cards.
 */
export function DetailList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dl className={`@container space-y-0 ${className}`}>{children}</dl>;
}

export default DetailRow;
