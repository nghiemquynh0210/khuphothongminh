import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "emerald" | "ghost" | "dangerGhost";
  size?: "sm" | "md" | "lg" | "form";
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
      type = "button",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-9 px-3 text-xs gap-1.5 rounded-lg",
      md: "h-10 px-3.5 text-sm gap-2 rounded-lg",
      lg: "h-11 px-4 text-sm gap-2 rounded-xl",
      form: "h-11 md:h-10 px-4 text-sm gap-2 rounded-lg",
    }[size];

    const variantClasses = {
      primary: "bg-[#073B72] hover:bg-[#06305d] text-white border border-[#073B72] active:scale-[0.98]",
      emerald: "bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-700 active:scale-[0.98]",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/90 active:scale-[0.98]",
      outline: "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 active:scale-[0.98]",
      destructive: "bg-rose-700 hover:bg-rose-800 text-white border border-rose-700 active:scale-[0.98]",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent",
      dangerGhost: "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200",
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
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

