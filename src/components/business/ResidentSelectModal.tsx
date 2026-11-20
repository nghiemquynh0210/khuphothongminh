import React, { useState, useMemo, useEffect } from "react";
import { UserCheck, Search, X, Check, MapPin, Phone, CreditCard, ArrowRight, Filter } from "lucide-react";
import { Resident } from "../../types";

export type ResidentSelectTargetRole = "owner" | "siteManager" | "focalPoint";

interface ResidentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  targetRole: ResidentSelectTargetRole;
  currentValue?: string;
  onSelect: (resident: Resident, role: ResidentSelectTargetRole) => void;
}

export const ResidentSelectModal: React.FC<ResidentSelectModalProps> = ({
  isOpen,
  onClose,
  residents = [],
  targetRole,
  currentValue = "",
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Thường trú" | "Tạm trú">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const roleTitle =
    targetRole === "owner"
      ? "Chủ cơ sở / Người đại diện pháp luật"
      : targetRole === "siteManager"
      ? "Người trực tiếp quản lý cơ sở tại chỗ"
      : "Đầu mối phối hợp công vụ địa phương";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    let list = residents;
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter((r) => {
      const name = (r.fullName || "").toLowerCase();
      const cccd = (r.cccd || "").toLowerCase();
      const phone = (r.phone || "").toLowerCase();
      const curAddr = (r.currentAddress || r.address || "").toLowerCase();
      const permAddr = (r.permanentAddress || "").toLowerCase();
      const hk = (r.householdId || "").toLowerCase();

      return (
        name.includes(term) ||
        cccd.includes(term) ||
        phone.includes(term) ||
        curAddr.includes(term) ||
        permAddr.includes(term) ||
        hk.includes(term)
      );
    });
  }, [residents, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <UserCheck size={18} className="text-emerald-400" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Chọn từ Quản lý Dân cư KP3
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono">
                  {residents.length.toLocaleString("vi-VN")} nhân khẩu
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                Gán công dân làm: <strong className="text-white underline">{roleTitle}</strong>
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

        {/* Filter and Search Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                autoFocus
                placeholder="Tìm theo Họ tên, 12 số CCCD, SĐT, Địa chỉ, Mã hộ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
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

            {/* Quick Filter Status */}
            <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Tất cả ({residents.length.toLocaleString("vi-VN")})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Thường trú");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === "Thường trú"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Thường trú
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Tạm trú");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === "Tạm trú"
                    ? "bg-amber-600 text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Tạm trú
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-500">
            <span>
              Tìm thấy: <strong className="text-blue-900 font-bold">{filtered.length.toLocaleString("vi-VN")}</strong> cư dân phù hợp
            </span>
            <span className="text-slate-400 italic">
              * Tự động trích xuất Họ tên, CCCD, SĐT, Địa chỉ vào hồ sơ
            </span>
          </div>
        </div>

        {/* Resident List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <UserCheck size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold">Không tìm thấy cư dân nào phù hợp</p>
              <p className="text-xs text-slate-400">Vui lòng kiểm tra lại từ khóa hoặc chuyển bộ lọc</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const isSelected = currentValue && currentValue.toLowerCase() === r.fullName.toLowerCase();
              return (
                <div
                  key={r.id}
                  onClick={() => onSelect(r, targetRole)}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 hover:border-blue-300"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-blue-900">
                        {r.fullName}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({r.gender} • Sinh {r.birthDate || "—"})
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                          r.status === "Thường trú"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.householdId && (
                        <span className="text-[10.5px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {r.householdId}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={12} className="text-slate-400 shrink-0" />
                        <span className="text-slate-500">CCCD:</span>
                        <strong className="font-mono text-slate-800">{r.cccd || "Chưa có"}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span className="text-slate-500">SĐT:</span>
                        <strong className="font-mono text-slate-800">{r.phone && r.phone !== "N/A" ? r.phone : "Chưa có"}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2 min-w-0">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="text-slate-500 shrink-0">Chỗ ở KP3:</span>
                        <span className="truncate text-slate-700">{r.currentAddress || r.address || "Khu phố 3, An Phú"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(r, targetRole);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} />
                          <span>Đang chọn</span>
                        </>
                      ) : (
                        <>
                          <span>Chọn người này</span>
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
            Trang {currentPage} / {totalPages} (Hiển thị 8 mục / trang)
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

export default ResidentSelectModal;
