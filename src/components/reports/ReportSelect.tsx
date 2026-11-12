import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface ReportSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface ReportSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReportSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}

export function ReportSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Chọn mục...",
  className = "",
  buttonClassName = "",
  disabled = false,
  required = false,
  "aria-label": ariaLabel,
}: ReportSelectProps) {
  const autoId = useId();
  const triggerId = id || `report-select-${autoId}`;
  const listboxId = `${triggerId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setHighlightedIndex(idx);
  }, [value, options]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(options.length, 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev - 1 + options.length) % Math.max(options.length, 1));
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (isOpen) {
        e.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) {
          onChange(opt.value);
          setIsOpen(false);
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-xs font-semibold text-slate-700 select-none flex items-center justify-between mb-1.5"
        >
          <span>{label}</span>
          {required && <span className="text-rose-600 ml-1 font-bold">*</span>}
        </label>
      )}
      <button
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel || label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`group flex h-11 md:h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm transition-colors cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/20 ${
          isOpen
            ? "border-emerald-600 ring-2 ring-emerald-500/20"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-100"
        } ${buttonClassName}`}
      >
        <span className={`truncate ${selectedOption ? "text-slate-900 font-medium" : "text-slate-500"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`shrink-0 text-slate-500 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-emerald-700" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 min-w-[200px] max-h-[460px] overflow-y-auto evon-scroll rounded-xl border border-slate-900/[0.08] bg-white p-1.5 shadow-lg flex flex-col gap-1 z-40 origin-top transition-all duration-150"
        >
          {options.map((opt, idx) => {
            const selected = opt.value === value;
            const highlighted = idx === highlightedIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full min-h-10 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                  highlighted ? "bg-slate-100 text-slate-900" : "text-slate-700"
                } ${selected ? "font-semibold text-emerald-800 bg-emerald-50/70" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="leading-snug">{opt.label}</div>
                  {opt.description && (
                    <div className="text-xs text-slate-600 font-normal mt-0.5">
                      {opt.description}
                    </div>
                  )}
                </div>
                {selected && <Check size={14} className="shrink-0 text-emerald-700" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

