import React, { useEffect, useId, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: "danger" | "destructive" | "warning" | "primary";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const modalDescription = description || message || "";
  const finalConfirmLabel = confirmLabel || confirmText || "Xác nhận";
  const finalCancelLabel = cancelLabel || cancelText || "Hủy bỏ";

  const resolvedVariant = variant === "destructive" ? "danger" : (variant || "danger");

  const iconConfig = {
    danger: {
      bg: "bg-rose-50 border-rose-200 text-rose-700",
      buttonVariant: "destructive" as const,
      Icon: AlertTriangle,
    },
    destructive: {
      bg: "bg-rose-50 border-rose-200 text-rose-700",
      buttonVariant: "destructive" as const,
      Icon: AlertTriangle,
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      buttonVariant: "primary" as const,
      Icon: AlertTriangle,
    },
    primary: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      buttonVariant: "emerald" as const,
      Icon: Info,
    },
  }[resolvedVariant] || {
    bg: "bg-rose-50 border-rose-200 text-rose-700",
    buttonVariant: "destructive" as const,
    Icon: AlertTriangle,
  };

  const { Icon } = iconConfig;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="outline" size="form" onClick={onClose} disabled={isLoading}>
            {finalCancelLabel}
          </Button>
          <Button
            variant={iconConfig.buttonVariant}
            size="form"
            isLoading={isLoading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {finalConfirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-xl border shrink-0 ${iconConfig.bg}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{modalDescription}</p>
      </div>
    </Modal>
  );
}

export interface InlineNoticeProps {
  message: string | null;
  type?: "success" | "error" | "info" | "warning";
  onDismiss?: () => void;
  className?: string;
}

export function InlineNotice({
  message,
  type = "success",
  onDismiss,
  className = "",
}: InlineNoticeProps) {
  const liveId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || !onDismiss) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, onDismiss]);

  if (!message) return null;

  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    error: "bg-rose-50 border-rose-200 text-rose-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-slate-100 border-slate-300 text-slate-900",
  }[type];

  const IconComp = type === "error" || type === "warning" ? AlertTriangle : type === "info" ? Info : CheckCircle2;

  return (
    <div
      id={liveId}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${styles} ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <IconComp className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="leading-snug">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
          aria-label="Ẩn thông báo"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
