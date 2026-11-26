import React, { useState } from "react";
import { Drawer } from "vaul";
import { ArrowLeft, ChevronRight, MoreVertical, Plus } from "lucide-react";
import { triggerLightHaptic, triggerMediumHaptic } from "../../utils/mobileHaptics";
import { navigate, ROUTES } from "../../routes";

export interface MobileSubTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface MobileSheetAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: "default" | "emerald" | "amber" | "rose";
  onClick: () => void;
}

interface MobileSubpageShellProps<T extends string = string> {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  subTabs?: MobileSubTabItem<T>[];
  activeSubTab?: T;
  onSubTabChange?: (tab: T) => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  sheetTitle?: string;
  sheetActions?: MobileSheetAction[];
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  noPadding?: boolean;
}

export function MobileSubpageShell<T extends string = string>({
  title,
  subtitle,
  onBack,
  subTabs,
  activeSubTab,
  onSubTabChange,
  primaryActionLabel,
  onPrimaryAction,
  sheetTitle = "Tác vụ & Công cụ chuyên sâu",
  sheetActions = [],
  rightSlot,
  children,
  noPadding = false,
}: MobileSubpageShellProps<T>) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleBack = () => {
    void triggerLightHaptic();
    if (onBack) {
      onBack();
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  return (
    <div
      className={`md:hidden -mx-3.5 -mt-3.5 ${
        children !== undefined ? "bg-slate-50 min-h-[calc(100vh-64px)] flex flex-col" : "mb-2.5"
      }`}
    >
      {/* Native Red Bronze-Drum App Bar */}
      <div
        className="shrink-0 text-white px-3.5 pt-3 pb-3 sticky top-0 z-30 shadow-sm"
        style={{
          background:
            "radial-gradient(circle at 85% 130%, rgba(254,202,202,0.16) 0%, transparent 55%), repeating-radial-gradient(circle at 80% 115%, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 14px), linear-gradient(135deg, #B91C1C 0%, #DC2626 55%, #991B1B 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Quay lại"
              className="w-8 h-8 rounded-full bg-white/15 active:bg-white/25 flex items-center justify-center text-white shrink-0 cursor-pointer"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-extrabold tracking-tight leading-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-red-100/95 font-medium truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {rightSlot}
            {onPrimaryAction && (
              <button
                type="button"
                onClick={() => {
                  void triggerMediumHaptic();
                  onPrimaryAction();
                }}
                aria-label={primaryActionLabel || "Thêm mới"}
                className="h-8 px-2.5 rounded-xl bg-white text-red-700 font-extrabold text-xs inline-flex items-center gap-1 shadow-xs active:scale-95 transition-transform cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                {primaryActionLabel && <span>{primaryActionLabel}</span>}
              </button>
            )}
            {sheetActions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void triggerLightHaptic();
                  setSheetOpen(true);
                }}
                aria-label="Mở menu tác vụ"
                className="w-8 h-8 rounded-full bg-white/15 active:bg-white/25 flex items-center justify-center text-white cursor-pointer"
              >
                <MoreVertical size={17} />
              </button>
            )}
          </div>
        </div>

        {/* Integrated Native Segmented Sub-Tabs */}
        {subTabs && subTabs.length > 0 && onSubTabChange && (
          <div
            role="tablist"
            className="mt-2.5 flex items-center gap-1 overflow-x-auto whitespace-nowrap p-1 rounded-xl bg-black/20 no-scrollbar"
          >
            {subTabs.map((tab) => {
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    void triggerLightHaptic();
                    onSubTabChange(tab.id);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-[11.5px] font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                    active
                      ? "bg-white text-red-700 shadow-xs"
                      : "text-red-50/95 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== 0 && tab.badge !== "" && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        active ? "bg-red-100 text-red-800" : "bg-white/20 text-white"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Mobile Body */}
      {children !== undefined && (
        <div className={noPadding ? "flex-1 flex flex-col" : "flex-1 px-3 py-3 space-y-3"}>
          {children}
        </div>
      )}

      {/* Vaul Native Gesture Action Sheet for Secondary Actions */}
      {sheetActions.length > 0 && (
        <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-slate-950/50 z-[96] backdrop-blur-[1px]" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[97] bg-white rounded-t-3xl p-5 pb-8 outline-none shadow-2xl max-h-[82vh] overflow-y-auto">
              <div className="mx-auto w-11 h-1.5 rounded-full bg-slate-300 mb-4" />
              <Drawer.Title className="text-base font-extrabold text-slate-900">
                {sheetTitle}
              </Drawer.Title>
              <Drawer.Description className="text-xs text-slate-500 mt-0.5">
                Chọn công cụ nghiệp vụ Khu phố 3 Phường An Phú
              </Drawer.Description>

              <div className="mt-4 space-y-2">
                {sheetActions.map((act) => {
                  const toneStyles =
                    act.tone === "emerald"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : act.tone === "amber"
                        ? "bg-amber-50 border-amber-200 text-amber-950"
                        : act.tone === "rose"
                          ? "bg-rose-50 border-rose-200 text-rose-950"
                          : "bg-slate-50 border-slate-200 text-slate-900";
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        void triggerMediumHaptic();
                        setSheetOpen(false);
                        act.onClick();
                      }}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left active:scale-[0.99] transition-transform cursor-pointer ${toneStyles}`}
                    >
                      {act.icon && (
                        <span className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center shrink-0 text-slate-800 shadow-2xs">
                          {act.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-snug">{act.label}</p>
                        {act.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {act.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  );
}
