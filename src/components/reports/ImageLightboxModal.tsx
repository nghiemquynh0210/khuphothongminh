import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxImageItem {
  url: string;
  caption: string;
  stageLabel?: string;
}

export interface ImageLightboxModalProps {
  images: LightboxImageItem[];
  currentIndex: number;
  onChangeIndex: (idx: number) => void;
  onClose: () => void;
}

export const FALLBACK_IMAGE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23f1f5f9'/%3E%3Cpath d='M256 140h128v80H256z' fill='none' stroke='%2394a3b8' stroke-width='4'/%3E%3Ccircle cx='286' cy='166' r='10' fill='%2394a3b8'/%3E%3Cpath d='M264 212l40-36 32 28 20-18 20 26z' fill='%2394a3b8'/%3E%3Ctext x='320' y='252' text-anchor='middle' fill='%23475569' font-family='sans-serif' font-size='14'%3E%E1%BA%A2nh hi%E1%BB%87n tr%C6%B0%E1%BB%9Dng KP3%3C/text%3E%3C/svg%3E";

export function ReportImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src || FALLBACK_IMAGE_SVG}
      alt={alt}
      className={className}
      onError={(e) => {
        const target = e.currentTarget;
        if (target.dataset.fallbackApplied) return;
        target.dataset.fallbackApplied = "1";
        target.src = FALLBACK_IMAGE_SVG;
      }}
    />
  );
}

export function ImageLightboxModal({
  images,
  currentIndex,
  onChangeIndex,
  onClose,
}: ImageLightboxModalProps) {
  const isOpen = images.length > 0 && currentIndex >= 0 && currentIndex < images.length;
  const active = isOpen ? images[currentIndex] : null;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) {
        onChangeIndex((currentIndex - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        onChangeIndex((currentIndex + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, currentIndex, images.length, onChangeIndex, onClose]);

  if (!isOpen || !active) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh hiện trường phóng to"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2 min-w-0">
            {active.stageLabel && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-xs font-bold shrink-0">
                {active.stageLabel}
              </span>
            )}
            <span className="text-sm font-medium truncate">{active.caption}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {images.length > 1 && (
              <span className="text-xs font-mono text-slate-300">
                {currentIndex + 1}/{images.length}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
              aria-label="Đóng xem ảnh"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex items-center justify-center min-h-[280px] max-h-[75vh]">
          <ReportImage
            src={active.url}
            alt={active.caption}
            className="max-h-[72vh] w-auto max-w-full object-contain"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onChangeIndex((currentIndex - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                aria-label="Ảnh trước"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => onChangeIndex((currentIndex + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

