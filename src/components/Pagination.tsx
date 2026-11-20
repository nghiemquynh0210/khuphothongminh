import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatVNNumber } from "../utils/numberFormat";

interface PaginationProps {
  id?: string;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  id = "pagination",
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalPages <= 1) {
    return (
      <div id={id} className="flex items-center justify-between px-3 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-200/80 text-xs text-slate-500">
        <span>Hiển thị tất cả <b>{formatVNNumber(totalItems)}</b> bản ghi</span>
      </div>
    );
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Large page count: show ellipsis
    pages.push(1);
    if (currentPage > 3) {
      pages.push("...");
    }
    
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = startPage; i <= endPage; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }
  }

  return (
    <div id={id} className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-3 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-200/80 text-xs text-slate-500">
      <div className="text-center sm:text-left">
        Hiển thị <b className="text-slate-800">{formatVNNumber(startItem)}-{formatVNNumber(endItem)}</b> trong số <b className="text-slate-800">{formatVNNumber(totalItems)}</b> bản ghi
      </div>

      <div className="flex items-center gap-1.5 max-w-full">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Trang trước"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Compact page indicator on mobile (< 640px) to prevent horizontal overflow on 375px */}
        <span className="sm:hidden px-3 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap tabular-nums">
          Trang <b className="mx-1 text-emerald-800">{formatVNNumber(currentPage)}</b> / <b className="ml-1 text-slate-900">{formatVNNumber(totalPages)}</b>
        </span>

        {/* Full page strip from sm (>= 640px) upwards */}
        <div className="hidden sm:flex items-center gap-1.5">
          {pages.map((page, index) => {
            if (page === "...") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-600 font-mono">
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;
            return (
              <button
                type="button"
                key={`page-${page}`}
                onClick={() => onPageChange(page as number)}
                aria-current={isCurrent ? "page" : undefined}
                className={`min-w-9 h-9 px-2 flex items-center justify-center rounded-lg font-bold transition-colors text-xs cursor-pointer ${
                  isCurrent
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Trang sau"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
