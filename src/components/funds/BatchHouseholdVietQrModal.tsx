import React, { useMemo, useState } from "react";
import { CheckCircle2, Printer, QrCode, Search, Users } from "lucide-react";
import { FundCategory, FundContribution, Household } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { BANK_CONFIG, getVietQRUrl } from "./VietQrModal";
import { formatVNNumber } from "../../utils/numberFormat";

export interface BatchHouseholdVietQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  households: Household[];
  categories: FundCategory[];
  existingContributions: FundContribution[];
  onBatchCreateContributions?: (items: FundContribution[]) => void;
}

export function BatchHouseholdVietQrModal({
  isOpen,
  onClose,
  households,
  categories,
  existingContributions,
  onBatchCreateContributions,
}: BatchHouseholdVietQrModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ""
  );
  const [suggestedAmount, setSuggestedAmount] = useState<number>(100000);
  const [residencyType, setResidencyType] = useState<"Thường trú" | "all">("Thường trú");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || categories[0],
    [categories, selectedCategoryId]
  );

  const targetHouseholds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return households
      .filter((h) => {
        if (residencyType === "Thường trú" && (h.type || "Thường trú") !== "Thường trú") {
          return false;
        }
        if (!q) return true;
        return (
          h.code.toLowerCase().includes(q) ||
          h.ownerName.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [households, residencyType, searchQuery]);

  const handleBatchGenerateUnpaid = () => {
    if (!onBatchCreateContributions || !selectedCategory) return;
    const existingSet = new Set(
      existingContributions
        .filter((c) => c.fundName === selectedCategory.name)
        .map((c) => c.householdCode)
    );
    const toCreate: FundContribution[] = targetHouseholds
      .filter((h) => !existingSet.has(h.code))
      .slice(0, 40)
      .map((h, i) => ({
        id: `FC-QR-${Date.now()}-${i}`,
        householdCode: h.code,
        ownerName: h.ownerName,
        address: h.address,
        fundName: selectedCategory.name,
        amount: suggestedAmount,
        date: new Date().toLocaleDateString("vi-VN"),
        status: "Chưa nộp",
        paymentMethod: "Chuyển khoản QR",
      }));

    if (toCreate.length === 0) {
      setToast("Tất cả các hộ đang hiển thị đã có phiếu vận động cho quỹ này.");
      return;
    }
    onBatchCreateContributions(toCreate);
    setToast(`Đã khởi tạo ${toCreate.length} phiếu thu gắn mã VietQR định danh hộ gia đình!`);
  };

  const handlePrintQrSheet = () => {
    if (!selectedCategory) return;
    const sample = targetHouseholds.slice(0, 12);
    const shortTag =
      selectedCategory.code ||
      selectedCategory.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase();

    const cardsHtml = sample
      .map((h) => {
        const memo = `KP3 ${h.code} ${shortTag}`.toUpperCase();
        const url = getVietQRUrl(
          suggestedAmount,
          memo,
          selectedCategory.bankAccountNo || BANK_CONFIG.accountNo,
          selectedCategory.bankId || BANK_CONFIG.bankId
        );
        return `<div class="card">
          <div class="fund">${selectedCategory.name}</div>
          <div class="owner">${h.ownerName} (${h.code})</div>
          <div class="addr">${h.address}</div>
          <img src="${url}" alt="${h.code}" />
          <div class="memo">Nội dung CK tự động: <strong>${memo}</strong></div>
        </div>`;
      })
      .join("");

    const win = window.open("", "_blank", "width=960,height=900");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Bảng Phiếu Thu VietQR Hộ Gia Đình — Khu phố 3</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; color: #0f172a; }
    h2 { text-align: center; font-size: 16px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .card { border: 1px dashed #64748b; border-radius: 10px; padding: 10px; text-align: center; page-break-inside: avoid; }
    .fund { font-size: 11px; font-weight: bold; color: #047857; }
    .owner { font-size: 12px; font-weight: bold; margin-top: 4px; }
    .addr { font-size: 10px; color: #475569; margin-bottom: 6px; }
    img { width: 165px; height: 165px; object-fit: contain; }
    .memo { font-size: 10px; margin-top: 4px; color: #334155; }
  </style>
</head>
<body>
  <h2>PHIẾU MÃ VIETQR VẬN ĐỘNG QUỸ MINH BẠCH — KHU PHỐ 3, PHƯỜNG AN PHÚ</h2>
  <div class="grid">${cardsHtml}</div>
  <script>setTimeout(() => window.print(), 900);</script>
</body>
</html>`);
    win.document.close();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title="Phát Hành Mã VietQR Động Theo Từng Hộ Gia Đình"
      description="Tự động gắn Mã hộ khẩu vào nội dung chuyển khoản NAPAS 247 giúp đối soát minh bạch 100%"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            leftIcon={<Printer size={14} />}
            disabled={targetHouseholds.length === 0}
            onClick={handlePrintQrSheet}
          >
            In Tờ Phiếu QR Phát Tới Hộ (12 hộ/trang)
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            {onBatchCreateContributions && (
              <Button
                variant="emerald"
                leftIcon={<QrCode size={14} />}
                onClick={handleBatchGenerateUnpaid}
              >
                Lập Phiếu Vận Động Hàng Loạt
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {toast && (
          <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <label htmlFor="batch-qr-fund" className="font-semibold text-slate-700 block mb-1">
              Chọn Quỹ vận động
            </label>
            <select
              id="batch-qr-fund"
              name="batchQrFund"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="batch-qr-amount" className="font-semibold text-slate-700 block mb-1">
              Mức vận động gợi ý (VNĐ)
            </label>
            <input
              id="batch-qr-amount"
              name="batchQrAmount"
              type="number"
              min={10000}
              step={10000}
              value={suggestedAmount}
              onChange={(e) => setSuggestedAmount(Number(e.target.value) || 0)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-bold text-emerald-800"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nhóm hộ áp dụng</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setResidencyType("Thường trú")}
                className={`h-9 rounded-lg font-semibold cursor-pointer border ${
                  residencyType === "Thường trú"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                Thường trú
              </button>
              <button
                type="button"
                onClick={() => setResidencyType("all")}
                className={`h-9 rounded-lg font-semibold cursor-pointer border ${
                  residencyType === "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                Tất cả hộ
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="batch-qr-search"
            name="batchQrSearch"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Lọc theo Tổ dân phố (VD: TỔ 5), mã hộ khẩu, chủ hộ..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white"
          />
        </div>

        <div className="max-h-[280px] overflow-y-auto border border-slate-200 rounded-xl">
          {targetHouseholds.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <Users size={20} className="mx-auto mb-1 text-slate-300" />
              Không có hộ gia đình phù hợp.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-3">Mã hộ</th>
                  <th className="py-2 px-3">Chủ hộ & Địa chỉ</th>
                  <th className="py-2 px-3">Cú pháp VietQR tự động</th>
                  <th className="py-2 px-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetHouseholds.slice(0, 30).map((h) => {
                  const shortTag =
                    selectedCategory?.code ||
                    (selectedCategory?.name || "QUY").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
                  const memo = `KP3 ${h.code} ${shortTag}`.toUpperCase();
                  return (
                    <tr key={h.id}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">{h.code}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{h.ownerName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {h.address}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-emerald-800">
                        {memo}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatVNNumber(suggestedAmount)} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
