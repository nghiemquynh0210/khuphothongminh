import React, { useEffect, useId, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface ModalHeaderNavigation {
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  positionText?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  description?: string;
  /** Optional custom header content rendered alongside title/close/navigation controls. */
  headerSlot?: React.ReactNode;
  /** Optional sticky tab bar or secondary bar directly under the modal header. */
  subHeader?: React.ReactNode;
  /** Optional Previous / Next record navigation buttons ("‹ ›") anchored cleanly beside Close. */
  headerNavigation?: ModalHeaderNavigation;
  size?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  footerClassName?: string;
  /** Default true for detail inspection; pass false for form modals to prevent accidental data loss. */
  closeOnOverlayClick?: boolean;
  zIndexClass?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  description,
  headerSlot,
  subHeader,
  headerNavigation,
  size = "xl",
  children,
  footer,
  bodyClassName = "p-5 sm:p-6 bg-white",
  footerClassName = "justify-end",
  closeOnOverlayClick = true,
  zIndexClass = "z-50",
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keep keyboard focus inside navigation cluster when reaching first/last item
  useEffect(() => {
    if (!headerNavigation) return;
    if (document.activeElement === prevBtnRef.current && headerNavigation.hasPrev === false) {
      nextBtnRef.current?.focus();
    } else if (document.activeElement === nextBtnRef.current && headerNavigation.hasNext === false) {
      prevBtnRef.current?.focus();
    }
  }, [headerNavigation?.hasPrev, headerNavigation?.hasNext]);

  if (!isOpen) return null;

  const sizeClasses = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  }[size];

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-[6vh] overflow-y-auto`}
    >
      <div
        className="fixed inset-0 bg-slate-950/55 transition-opacity duration-150"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${sizeClasses} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-10vh)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-10 focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6 bg-white border-b border-slate-200 shrink-0">
          {headerSlot ? (
            <div id={titleId} className="min-w-0 flex-1">
              {headerSlot}
            </div>
          ) : (
            <div className="min-w-0 flex-1 pr-2">
              <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed text-pretty">
                  {description}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {headerNavigation && (
              <>
                <button
                  ref={prevBtnRef}
                  type="button"
                  disabled={headerNavigation.hasPrev === false}
                  onClick={headerNavigation.onPrev}
                  className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                  title={headerNavigation.prevLabel || "Hồ sơ trước"}
                  aria-label={headerNavigation.prevLabel || "Hồ sơ trước"}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                {headerNavigation.positionText && (
                  <span className="text-xs font-medium text-slate-500 tabular-nums px-1 select-none">
                    {headerNavigation.positionText}
                  </span>
                )}
                <button
                  ref={nextBtnRef}
                  type="button"
                  disabled={headerNavigation.hasNext === false}
                  onClick={headerNavigation.onNext}
                  className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                  title={headerNavigation.nextLabel || "Hồ sơ sau"}
                  aria-label={headerNavigation.nextLabel || "Hồ sơ sau"}
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <div className="h-5 w-px bg-slate-200 mx-1" aria-hidden="true" />
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Đóng hộp thoại"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {subHeader && (
          <div className="bg-white border-b border-slate-200 shrink-0">{subHeader}</div>
        )}

        <div className={`flex-1 min-h-0 overflow-y-auto evon-scroll ${bodyClassName}`}>{children}</div>

        {footer && (
          <div
            className={`flex flex-wrap items-center gap-2.5 px-5 py-3.5 sm:px-6 bg-white border-t border-slate-200 shrink-0 ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
