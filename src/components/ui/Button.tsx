import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "emerald";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Size tokens: adhering to WCAG touch targets (min 36px desktop, 40px touch)
    const sizeClasses = {
      sm: "h-8 px-2.5 text-xs gap-1.5 rounded-lg",
      md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
      lg: "h-10 px-4 text-base gap-2.5 rounded-xl",
    }[size];

    // Variant tokens per D1 & DESIGN.md
    const variantClasses = {
      primary: "bg-[#073B72] hover:bg-[#06305d] text-white border border-[#073B72] shadow-xs active:scale-[0.98]",
      emerald: "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs active:scale-[0.98]",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 active:scale-[0.98]",
      outline: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs active:scale-[0.98]",
      destructive: "bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-xs active:scale-[0.98]",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

