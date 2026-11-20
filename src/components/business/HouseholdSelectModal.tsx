import React, { useState, useMemo, useEffect } from "react";
import { Home, Search, X, Check, Users, MapPin, ArrowRight } from "lucide-react";
import { Household } from "../../types";

interface HouseholdSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  households: Household[];
  currentCode?: string;
  onSelect: (household: Household) => void;
}

export const HouseholdSelectModal: React.FC<HouseholdSelectModalProps> = ({
  isOpen,
  onClose,
  households = [],
  currentCode = "",
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return households;
    return households.filter((h) => {
      const code = (h.code || "").toLowerCase();
      const owner = (h.ownerName || "").toLowerCase();
      const address = (h.address || "").toLowerCase();
      const cccd = (h.ownerCccd || "").toLowerCase();
      return (
        code.includes(term) ||
        owner.includes(term) ||
        address.includes(term) ||
        cccd.includes(term)
      );
    });
  }, [households, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <Home size={18} className="text-amber-400" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Liên kết Sổ Hộ Khẩu KP3
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  {households.length} hộ
                </span>
              </h3>
              <p className="text-xs text-indigo-200">
                Chọn hộ gia đình để tự động điền mã hộ, chủ hộ và địa chỉ nhà
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 shrink-0 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              autoFocus
              placeholder="Tìm theo mã hộ (HK-001...), tên chủ hộ, CCCD, địa chỉ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium shrink-0">
            Tìm thấy: <strong className="text-indigo-900 font-bold">{filtered.length}</strong> hộ
          </span>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Home size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold">Không tìm thấy hộ khẩu nào phù hợp</p>
              <p className="text-xs text-slate-400">Thử tìm bằng từ khóa khác hoặc số CCCD</p>
            </div>
          ) : (
            currentItems.map((hh) => {
              const isSelected = currentCode && currentCode.toLowerCase() === hh.code.toLowerCase();
              return (
                <div
                  key={hh.id}
                  onClick={() => onSelect(hh)}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-mono font-bold text-xs shrink-0 mt-0.5 border border-indigo-200">
                      {hh.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-900">
                          {hh.ownerName}
                        </span>
                        {hh.ownerCccd && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            CCCD: {hh.ownerCccd}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 min-w-0">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{hh.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      <Users size={12} className="text-slate-500" />
                      <strong>{hh.members?.length || 1}</strong> người
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(hh);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} />
                          <span>Đang chọn</span>
                        </>
                      ) : (
                        <>
                          <span>Chọn liên kết</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Pagination */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            Trang {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseholdSelectModal;
