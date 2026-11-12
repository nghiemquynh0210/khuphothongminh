import React, { useId } from "react";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightElement,
      className = "",
      id,
      disabled,
      "aria-describedby": ariaDescribedByProp,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || `kp3-input-${autoId}`;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    const describedByParts = [
      ariaDescribedByProp,
      helperText && !error ? hintId : undefined,
      error ? errorId : undefined,
    ].filter(Boolean);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-800 select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {props.required && (
              <span className="text-rose-600 ml-1 font-bold" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {helperText && !error && (
          <p id={hintId} className="text-xs text-slate-600">
            {helperText}
          </p>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div
              className="absolute left-3 text-slate-500 pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={describedByParts.length > 0 ? describedByParts.join(" ") : undefined}
            className={`w-full h-11 md:h-10 bg-white text-slate-900 text-sm rounded-lg border transition-colors duration-150 placeholder:text-slate-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 ${
              leftIcon ? "pl-9" : "pl-3"
            } ${rightElement ? "pr-10" : "pr-3"} ${
              error
                ? "border-rose-600 bg-rose-50/40 focus:border-rose-600 focus:ring-rose-500/20"
                : "border-slate-300 hover:border-slate-400"
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-2 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} className="text-xs font-medium text-rose-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

