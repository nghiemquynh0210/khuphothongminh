import React from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

export interface RecordDetailNavProps {
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  prevTitle?: string;
  nextTitle?: string;
  positionLabel?: string;
}

export interface RecordDetailTabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface RecordDetailShellProps {
  backLabel?: string;
  backButtonId?: string;
  onBack: () => void;
  navigation?: RecordDetailNavProps;
  topRightSlot?: React.ReactNode;
  noticeSlot?: React.ReactNode;
  avatarSlot?: React.ReactNode;
  badgesSlot?: React.ReactNode;
  title: React.ReactNode;
  titleId?: string;
  subtitleSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  tabs?: RecordDetailTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** Render children outside the main sheet for multi-pane workspaces (e.g. 2-column Evidence + Chat). */
  seamlessBody?: boolean;
  maxWidthClass?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Unified Minimalist Record Detail Shell — standardizes all 9+ detail views across KP3.
 * Eliminates duplicate double-titles, aligns Back + Prev/Next navigation on a slim top bar,
 * and presents identity, actions, tabs, and data inside one calm, airy white sheet.
 */
export function RecordDetailShell({
  backLabel = "Quay lại danh sách",
  backButtonId,
  onBack,
  navigation,
  topRightSlot,
  noticeSlot,
  avatarSlot,
  badgesSlot,
  title,
  titleId,
  subtitleSlot,
  actionsSlot,
  tabs,
  activeTab,
  onTabChange,
  seamlessBody = false,
  maxWidthClass = "max-w-6xl",
  bodyClassName = "p-5 sm:p-6 space-y-4 text-xs",
  children,
}: RecordDetailShellProps) {
  return (
    <div className={`${maxWidthClass} mx-auto space-y-3.5 pb-10 text-xs`}>
      {/* 1. Slim Top Navigation Bar (Left: Back | Right: Prev/Next & Utilities) */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button
          type="button"
          id={backButtonId}
          onClick={onBack}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          <span>{backLabel}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {topRightSlot}

          {navigation && (navigation.hasPrev || navigation.hasNext || navigation.positionLabel) && (
            <div className="inline-flex items-center h-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                disabled={!navigation.hasPrev}
                onClick={navigation.onPrev}
                title={navigation.prevTitle || "Hồ sơ trước"}
                aria-label={navigation.prevTitle || "Hồ sơ trước"}
                className="h-full px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {navigation.positionLabel && (
                <span className="px-2 text-xs font-mono font-semibold text-slate-600 border-x border-slate-100 tabular-nums select-none">
                  {navigation.positionLabel}
                </span>
              )}
              <button
                type="button"
                disabled={!navigation.hasNext}
                onClick={navigation.onNext}
                title={navigation.nextTitle || "Hồ sơ sau"}
                aria-label={navigation.nextTitle || "Hồ sơ sau"}
                className="h-full px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {noticeSlot}

      {/* 2. Unified White Record Sheet (BusinessDetailPage Typography & Style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Identity & Actions Header */}
        <div className="bg-slate-50/60 p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
            {avatarSlot && <div className="shrink-0">{avatarSlot}</div>}

            <div className="min-w-0 flex-1 space-y-1.5">
              {badgesSlot && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {badgesSlot}
                </div>
              )}

              <h1
                id={titleId}
                className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug break-words"
              >
                {title}
              </h1>

              {subtitleSlot && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  {subtitleSlot}
                </div>
              )}
            </div>
          </div>

          {actionsSlot && (
            <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
              {actionsSlot}
            </div>
          )}
        </div>

        {/* Optional Unified Sub-Tabs Bar */}
        {tabs && tabs.length > 0 && (
          <div className="flex px-5 sm:px-6 gap-5 sm:gap-6 border-b border-slate-200/80 bg-white overflow-x-auto print:hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={`py-2.5 text-xs transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? "text-emerald-800 font-bold"
                      : "text-slate-500 hover:text-slate-800 font-semibold"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Single-Sheet Body */}
        {!seamlessBody && (
          <div className={bodyClassName}>
            {children}
          </div>
        )}
      </div>

      {/* Multi-Pane Workspace Body (when seamlessBody is true) */}
      {seamlessBody && children}
    </div>
  );
}

export default RecordDetailShell;
