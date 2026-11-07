import React from "react";
import { Clock, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export type StatusType = "pending" | "in_progress" | "completed" | "danger" | "info";

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Chờ duyệt",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  in_progress: {
    label: "Đang xử lý",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: Loader2,
  },
  completed: {
    label: "Đã hoàn thành",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  danger: {
    label: "Cảnh báo / Quá hạn",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
  info: {
    label: "Thông tin",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: Info,
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.info;
  const IconComponent = config.icon;
  const displayLabel = label || config.label;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10.5px] gap-1",
    md: "px-2.5 py-0.5 text-[11px] gap-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide whitespace-nowrap select-none transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <IconComponent
          className={`shrink-0 ${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} ${
            status === "in_progress" ? "animate-spin" : ""
          }`}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}

