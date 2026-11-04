import React, { useState, useMemo } from "react";
import { 
  Search, 
  Home, 
  User, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  DollarSign, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  Printer, 
  ArrowRight,
  TrendingUp,
  FileCheck
} from "lucide-react";
import { FundContribution } from "../../types";
import VietQrModal from "./VietQrModal";

interface HouseholdFundLookupProps {
  contributions: FundContribution[];
  households: any[];
  onOpenReceipt: (type: "THU", item: FundContribution) => void;
  onUpdateContributionStatus: (id: string, status: "Đã nộp" | "Chưa nộp", paidAt?: string) => void;
}

export default function HouseholdFundLookup({
  contributions,
  households,
  onOpenReceipt,
  onUpdateContributionStatus
}: HouseholdFundLookupProps) {
  // Search query by household code or owner name
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouseholdCode, setSelectedHouseholdCode] = useState<string>("HK-301");
  const [activeQrContribution, setActiveQrContribution] = useState<FundContribution | null>(null);

  // Group unique households from contributions & households prop
  const uniqueHouseholds = useMemo(() => {
    const map = new Map<string, { code: string; ownerName: string; address?: string }>();
    
    // Seed from households list
    households.forEach(h => {
      map.set(h.code, { code: h.code, ownerName: h.ownerName, address: h.address });
    });

    // Also collect from contributions
    contributions.forEach(c => {
      if (!map.has(c.householdCode)) {
        map.set(c.householdCode, { code: c.householdCode, ownerName: c.ownerName });
      }
    });

    return Array.from(map.values());
  }, [contributions, households]);

  // Filtered list of households for quick selection
  const filteredHouseholdList = useMemo(() => {
    if (!searchQuery.trim()) return uniqueHouseholds.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return uniqueHouseholds.filter(h => 
      h.code.toLowerCase().includes(q) || 
      h.ownerName.toLowerCase().includes(q)
    );
  }, [uniqueHouseholds, searchQuery]);

  // Current selected household info & contributions
  const currentHousehold = useMemo(() => {
    return uniqueHouseholds.find(h => h.code === selectedHouseholdCode) || uniqueHouseholds[0];
  }, [uniqueHouseholds, selectedHouseholdCode]);

  const householdContributions = useMemo(() => {
    if (!currentHousehold) return [];
    return contributions.filter(c => c.householdCode === currentHousehold.code);
  }, [contributions, currentHousehold]);

  // Summary stats for this household
  const totalDue = householdContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = householdContributions.filter(c => c.status === "Đã nộp").reduce((sum, c) => sum + c.amount, 0);
  const totalRemaining = totalDue - totalPaid;
  const paidCount = householdContributions.filter(c => c.status === "Đã nộp").length;
  const totalCount = householdContributions.length;
  const completionPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  // Bundle unpaid funds for 1-click Pay-All QR
  const unpaidContributions = householdContributions.filter(c => c.status !== "Đã nộp");

  const handlePayAllQr = () => {
    if (unpaidContributions.length === 0 || !currentHousehold) return;
    const bundleCont: FundContribution = {
      id: `BUNDLE-${currentHousehold.code}`,
      householdCode: currentHousehold.code,
      ownerName: currentHousehold.ownerName,
      fundName: "Tổng hợp các Quỹ năm 2026" as any,
      amount: totalRemaining,
      status: "Chưa nộp"
    };
    setActiveQrContribution(bundleCont);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-emerald-800 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={15} /> Cổng Dịch Vụ Công Dân Số Khu Phố 3
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <QrCode className="text-emerald-400" size={26} />
            Tra Cứu Đóng Nộp & Thanh Toán Quỹ Bằng VietQR
          </h2>
          <p className="text-xs text-emerald-100">
            Minh bạch 100% tài chính cộng đồng: Cư dân tra cứu tình trạng đóng nộp các loại quỹ an sinh, khuyến học, hẻm tự quản và thanh toán quét mã QR NAPAS 24/7 tức thì.
          </p>

          {/* Search Input Bar */}
          <div className="pt-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-400" size={17} />
              <input
                id="household-fund-search-input"
                name="searchQuery"
                aria-label="Nhập mã hộ khẩu hoặc họ tên chủ hộ"
                type="text"
                placeholder="Nhập Mã Sổ hộ khẩu (VD: HK-301) hoặc Họ tên chủ hộ để tra cứu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-900 text-xs rounded-xl shadow-lg border-2 border-emerald-400/80 focus:outline-none focus:ring-4 focus:ring-emerald-400/30 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Quick select pills */}
        <div className="relative z-10 mt-4 pt-4 border-t border-emerald-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-emerald-300 font-semibold">Gợi ý tra cứu nhanh:</span>
          {filteredHouseholdList.slice(0, 6).map(h => (
            <button
              key={h.code}
              onClick={() => setSelectedHouseholdCode(h.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedHouseholdCode === h.code
                  ? "bg-emerald-400 text-slate-950 shadow-md font-black"
                  : "bg-emerald-950/70 text-emerald-200 border border-emerald-700/60 hover:bg-emerald-800"
              }`}
            >
              <Home size={12} /> {h.code} - {h.ownerName}
            </button>
          ))}
        </div>
      </div>

      {/* Household Detail & Status Dashboard */}
      {currentHousehold && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Household Profile Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                  Sổ Hộ Khẩu Điện Tử
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{currentHousehold.ownerName}</h3>
                <p className="text-xs font-mono text-slate-500 font-bold">Mã số: {currentHousehold.code}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg shadow-inner">
                {currentHousehold.ownerName.charAt(0)}
              </div>
            </div>

            {currentHousehold.address && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px]">ĐỊA CHỈ THƯỜNG TRÚ:</span>
                <span className="font-semibold">{currentHousehold.address}</span>
              </div>
            )}

            {/* Financial Status Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Tiến độ hoàn thành:</span>
                <span className="font-bold text-emerald-400">{paidCount}/{totalCount} Quỹ ({completionPercent}%)</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Đã đóng nộp:</span>
                  <span className="font-mono font-bold text-emerald-400">{totalPaid.toLocaleString("vi-VN")}đ</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Còn phải đóng:</span>
                  <span className="font-mono font-bold text-rose-400">{totalRemaining.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>

            {/* Pay All Button if any unpaid */}
            {totalRemaining > 0 ? (
              <button
                onClick={handlePayAllQr}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <QrCode size={15} /> Tạo VietQR Trọn Gói ({totalRemaining.toLocaleString("vi-VN")}đ)
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Hộ gia đình đã hoàn thành 100% nghĩa vụ đóng quỹ năm 2026!
              </div>
            )}
          </div>

          {/* Contributions List of this household */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileCheck className="text-indigo-600" size={18} />
                Bảng Kê Chi Tiết Các Quỹ Năm 2026 ({householdContributions.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">DỮ LIỆU ĐIỆN TỬ KP3</span>
            </div>

            <div className="space-y-3">
              {householdContributions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Chưa có dữ liệu phân bổ quỹ cho hộ gia đình này.
                </div>
              ) : (
                householdContributions.map(cont => {
                  const isPaid = cont.status === "Đã nộp";
                  return (
                    <div
                      key={cont.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isPaid
                          ? "bg-slate-50/60 border-slate-200"
                          : "bg-emerald-50/30 border-emerald-200 hover:border-emerald-400"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{cont.fundName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                            {cont.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                          <span>Mã biên lai: <b className="font-mono text-slate-700">{cont.id}</b></span>
                          {cont.paidAt && <span>Ngày nộp: <b className="font-mono text-slate-700">{cont.paidAt}</b></span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {cont.amount.toLocaleString("vi-VN")}đ
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Receipt button */}
                          <button
                            onClick={() => onOpenReceipt("THU", cont)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                            title="In biên lai"
                          >
                            <Printer size={14} />
                          </button>

                          {/* VietQR button if unpaid */}
                          {!isPaid ? (
                            <button
                              onClick={() => setActiveQrContribution(cont)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Tạo mã VietQR quét nộp"
                            >
                              <QrCode size={13} /> Quét QR
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-1 rounded">
                              Đã quyết toán
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIETQR DYNAMIC POPUP */}
      {activeQrContribution && (
        <VietQrModal
          contribution={activeQrContribution}
          onClose={() => setActiveQrContribution(null)}
          onConfirmPaid={(id) => {
            const todayStr = new Date().toLocaleDateString("vi-VN");
            if (id.startsWith("BUNDLE-")) {
              // Mark all unpaid of this household as paid
              unpaidContributions.forEach(u => {
                onUpdateContributionStatus(u.id, "Đã nộp", todayStr);
              });
            } else {
              onUpdateContributionStatus(id, "Đã nộp", todayStr);
            }
          }}
        />
      )}
    </div>
  );
}
