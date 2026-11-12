import React from "react";
import { Loader2 } from "lucide-react";

export interface LoadingFadeProps {
  variant?: "screen" | "page" | "inline";
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Themed loading state with smooth fade-in and KP3 Civic Emerald/Slate shimmer.
 */
export function LoadingFade({
  variant = "page",
  title = "Đang tải dữ liệu Khu phố 3...",
  subtitle,
  className = "",
}: LoadingFadeProps) {
  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`theme-loading-fade flex items-center justify-between gap-3 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-2.5 text-xs font-semibold ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Loader2
            size={15}
            className="animate-spin text-emerald-700 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{title}</span>
        </div>
        {subtitle && (
          <span className="hidden sm:inline text-[11px] font-mono text-emerald-700 shrink-0">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  if (variant === "screen") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`theme-loading-fade min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 ${className}`}
      >
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-base mx-auto border border-emerald-800">
            KP3
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              <Loader2
                size={16}
                className="animate-spin text-emerald-700 shrink-0"
                aria-hidden="true"
              />
              <span>{title}</span>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-600 leading-relaxed">{subtitle}</p>
            )}
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-2 rounded-full theme-loading-shimmer w-full" />
            <div className="h-2 rounded-full theme-loading-shimmer w-3/4 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`theme-loading-fade bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-5 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <Loader2
            size={20}
            className="animate-spin text-emerald-700"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-20 rounded-xl border border-slate-200/70 p-3.5 space-y-2.5 bg-slate-50/40"
          >
            <div className="h-3 w-1/2 rounded theme-loading-shimmer" />
            <div className="h-5 w-2/3 rounded theme-loading-shimmer" />
          </div>
        ))}
      </div>

      <div className="space-y-2.5 pt-1">
        <div className="h-10 rounded-xl theme-loading-shimmer w-full" />
        <div className="h-10 rounded-xl theme-loading-shimmer w-full" />
        <div className="h-10 rounded-xl theme-loading-shimmer w-5/6" />
      </div>
    </div>
  );
}

export default LoadingFade;

