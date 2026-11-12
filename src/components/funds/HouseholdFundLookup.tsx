import React, { useState, useMemo } from "react";
import {
  Search,
  Home,
  CheckCircle2,
  QrCode,
  Printer,
  FileCheck,
} from "lucide-react";
import { FundCategory, FundContribution } from "../../types";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import VietQrModal from "./VietQrModal";
import { findCategoryByFundName, formatReceiptCode } from "./fundCatalog";

interface HouseholdFundLookupProps {
  contributions: FundContribution[];
  households: any[];
  categories?: FundCategory[];
  readOnly?: boolean;
  onOpenReceipt: (type: "THU", item: FundContribution) => void;
  onUpdateContributionStatus: (
    id: string,
    status: "Đã nộp" | "Chưa nộp",
    paidAt?: string
  ) => void;
}

export default function HouseholdFundLookup({
  contributions,
  households,
  categories = [],
  readOnly = false,
  onOpenReceipt,
  onUpdateContributionStatus,
}: HouseholdFundLookupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouseholdCode, setSelectedHouseholdCode] = useState<string>("HK-301");
  const [activeQrContribution, setActiveQrContribution] =
    useState<FundContribution | null>(null);

  const uniqueHouseholds = useMemo(() => {
    const map = new Map<
      string,
      { code: string; ownerName: string; address?: string }
    >();

    households.forEach((h) => {
      if (h.code) {
        map.set(h.code, {
          code: h.code,
          ownerName: h.ownerName,
          address: h.address,
        });
      }
    });

    contributions.forEach((c) => {
      if (c.householdCode && c.householdCode !== "N/A" && !map.has(c.householdCode)) {
        map.set(c.householdCode, {
          code: c.householdCode,
          ownerName: c.ownerName,
        });
      }
    });

    return Array.from(map.values());
  }, [contributions, households]);

  const filteredHouseholdList = useMemo(() => {
    if (!searchQuery.trim()) return uniqueHouseholds.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return uniqueHouseholds.filter(
      (h) =>
        h.code.toLowerCase().includes(q) ||
        h.ownerName.toLowerCase().includes(q)
    );
  }, [uniqueHouseholds, searchQuery]);

  const currentHousehold = useMemo(() => {
    return (
      uniqueHouseholds.find((h) => h.code === selectedHouseholdCode) ||
      uniqueHouseholds[0]
    );
  }, [uniqueHouseholds, selectedHouseholdCode]);

  const householdContributions = useMemo(() => {
    if (!currentHousehold) return [];
    return contributions.filter(
      (c) => c.householdCode === currentHousehold.code
    );
  }, [contributions, currentHousehold]);

  const totalDue = householdContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = householdContributions
    .filter((c) => c.status === "Đã nộp")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalRemaining = totalDue - totalPaid;
  const paidCount = householdContributions.filter(
    (c) => c.status === "Đã nộp"
  ).length;
  const totalCount = householdContributions.length;
  const completionPercent =
    totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  const unpaidContributions = householdContributions.filter(
    (c) => c.status !== "Đã nộp"
  );

  const handlePayAllQr = () => {
    if (unpaidContributions.length === 0 || !currentHousehold) return;
    const bundleCont: FundContribution = {
      id: `BUNDLE-${currentHousehold.code}`,
      householdCode: currentHousehold.code,
      ownerName: currentHousehold.ownerName,
      fundName: "Tổng hợp các Quỹ năm 2026",
      amount: totalRemaining,
      status: "Chưa nộp",
    };
    setActiveQrContribution(bundleCont);
  };

  return (
    <div className="space-y-5">
      {/* Search Banner — Clean Flat Government Navy */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-xl border border-slate-800 space-y-4">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-700/70 text-emerald-300 font-bold text-xs uppercase tracking-wider">
            Cổng Dịch Vụ Công Dân Số Khu Phố 3
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <QrCode className="text-emerald-400 shrink-0" size={24} />
            <span>Tra Cứu Đóng Nộp & Thanh Toán Quỹ VietQR</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Cư dân tra cứu nghĩa vụ đóng góp theo Mã sổ hộ khẩu và thanh toán nhanh bằng mã QR chuẩn NAPAS 24/7.
          </p>

          <search className="pt-2 block">
            <label htmlFor="household-fund-search-input" className="sr-only">
              Nhập mã hộ khẩu hoặc họ tên chủ hộ để tra cứu
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-500" size={16} />
              <input
                id="household-fund-search-input"
                name="searchQuery"
                type="search"
                placeholder="Nhập Mã hộ khẩu (HK-301) hoặc Họ tên chủ hộ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 font-medium"
              />
            </div>
          </search>
        </div>

        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300 font-semibold">
            Chọn nhanh hộ khẩu:
          </span>
          {filteredHouseholdList.slice(0, 6).map((h) => {
            const active = currentHousehold?.code === h.code;
            return (
              <button
                key={h.code}
                type="button"
                onClick={() => setSelectedHouseholdCode(h.code)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 border ${
                  active
                    ? "bg-emerald-500 text-slate-950 border-emerald-400"
                    : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <Home size={12} /> {h.code} — {h.ownerName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Household Detail & Contributions */}
      {currentHousehold ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Household Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <StatusBadge
                  status="completed"
                  label="Sổ Hộ Khẩu Điện Tử"
                  size="sm"
                  showIcon={false}
                />
                <h3 className="text-lg font-bold text-slate-900 mt-2 truncate">
                  {currentHousehold.ownerName}
                </h3>
                <p className="text-xs font-mono text-slate-600 font-semibold mt-0.5">
                  Mã hộ khẩu: {currentHousehold.code}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-[#073B72] flex items-center justify-center font-bold text-base shrink-0">
                {currentHousehold.ownerName.charAt(0)}
              </div>
            </div>

            {currentHousehold.address && (
              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">
                  Địa chỉ thường trú
                </span>
                <span className="font-semibold mt-0.5 block">
                  {currentHousehold.address}
                </span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Tiến độ hoàn thành:</span>
                <span className="font-bold text-emerald-400">
                  {paidCount}/{totalCount} Quỹ ({completionPercent}%)
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-xs text-slate-300 block">Đã đóng nộp:</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {totalPaid.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-300 block">Còn phải đóng:</span>
                  <span className="font-mono font-bold text-rose-400 tabular-nums">
                    {totalRemaining.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </div>

            {totalRemaining > 0 ? (
              <Button
                variant="emerald"
                size="md"
                leftIcon={<QrCode size={15} />}
                onClick={handlePayAllQr}
                className="w-full"
              >
                Tạo VietQR Trọn Gói ({totalRemaining.toLocaleString("vi-VN")}đ)
              </Button>
            ) : totalCount > 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                Hộ gia đình đã hoàn thành 100% nghĩa vụ đóng quỹ năm 2026!
              </div>
            ) : null}
          </div>

          {/* Household Contributions Ledger */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileCheck className="text-[#073B72]" size={18} />
                Bảng Kê Chi Tiết Các Quỹ Năm 2026 ({householdContributions.length})
              </h3>
              <span className="text-xs text-slate-600 font-mono font-semibold">
                DỮ LIỆU ĐIỆN TỬ KP3
              </span>
            </div>

            <div className="space-y-3">
              {householdContributions.length === 0 ? (
                <EmptyState
                  title="Chưa có dữ liệu phân bổ quỹ"
                  description="Hộ gia đình này chưa phát sinh khoản đóng góp hoặc phiếu nhắc thu nào."
                />
              ) : (
                householdContributions.map((cont) => {
                  const isPaid = cont.status === "Đã nộp";
                  const shortCode = formatReceiptCode(
                    cont.id,
                    cont.receiptCode,
                    "BL"
                  );
                  return (
                    <div
                      key={cont.id}
                      className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isPaid
                          ? "bg-slate-50/70 border-slate-200"
                          : "bg-emerald-50/40 border-emerald-200"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {cont.fundName}
                          </span>
                          <StatusBadge
                            status={isPaid ? "completed" : "pending"}
                            label={cont.status}
                            size="sm"
                          />
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Số biên lai:{" "}
                            <strong className="font-mono text-slate-800">
                              {shortCode}
                            </strong>
                          </span>
                          {cont.paidAt && (
                            <span>
                              Ngày nộp:{" "}
                              <strong className="font-mono text-slate-800">
                                {cont.paidAt}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 shrink-0">
                        <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                          {cont.amount.toLocaleString("vi-VN")}đ
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenReceipt("THU", cont)}
                            className="p-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                            title="Xem & In biên lai"
                            aria-label={`In biên lai ${shortCode}`}
                          >
                            <Printer size={14} />
                          </button>

                          {!isPaid ? (
                            <Button
                              variant="emerald"
                              size="sm"
                              leftIcon={<QrCode size={13} />}
                              onClick={() => setActiveQrContribution(cont)}
                            >
                              Quét QR
                            </Button>
                          ) : (
                            <StatusBadge
                              status="info"
                              label="Đã quyết toán"
                              size="sm"
                              showIcon={false}
                            />
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
      ) : (
        <EmptyState
          title="Không tìm thấy hộ gia đình phù hợp"
          description="Thử tìm lại theo Mã sổ hộ khẩu (VD: HK-301) hoặc Họ tên chủ hộ."
        />
      )}

      {activeQrContribution && (
        <VietQrModal
          contribution={activeQrContribution}
          category={findCategoryByFundName(
            categories,
            activeQrContribution.fundName
          )}
          readOnly={readOnly}
          onClose={() => setActiveQrContribution(null)}
          onConfirmPaid={
            readOnly
              ? undefined
              : (id) => {
                  const todayStr = new Date().toLocaleDateString("vi-VN");
                  if (id.startsWith("BUNDLE-")) {
                    unpaidContributions.forEach((u) => {
                      onUpdateContributionStatus(u.id, "Đã nộp", todayStr);
                    });
                  } else {
                    onUpdateContributionStatus(id, "Đã nộp", todayStr);
                  }
                }
          }
        />
      )}
    </div>
  );
}
