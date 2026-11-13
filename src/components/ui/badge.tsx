import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "border-transparent bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100",
    outline: "border-slate-200/90 text-slate-900 hover:bg-slate-50",
    success: "border-emerald-200/90 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    warning: "border-amber-200/90 bg-amber-50 text-amber-800 hover:bg-amber-100",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 select-none",
        variantClasses,
        className
      )}
      {...props}
    />
  );
}

