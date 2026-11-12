import React, { useState } from "react";
import {
  QrCode,
  Copy,
  Check,
  Download,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { FundCategory, FundContribution } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export const BANK_CONFIG = {
  bankId: "vietcombank",
  bankName: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  accountNo: "1026070128",
  accountName: "BAN QUAN LY QUY KHU PHO 3 AN PHU",
};

export function getVietQRUrl(
  amount: number,
  memo: string,
  overrideAccountNo?: string,
  overrideBankId?: string
) {
  const cleanMemo = memo.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 50);
  const bankId = overrideBankId || BANK_CONFIG.bankId;
  const accountNo = overrideAccountNo || BANK_CONFIG.accountNo;
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    cleanMemo
  )}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
}

interface VietQrModalProps {
  contribution: FundContribution;
  category?: FundCategory;
  readOnly?: boolean;
  onClose: () => void;
  onConfirmPaid?: (id: string) => void;
}

export default function VietQrModal({
  contribution,
  category,
  readOnly = false,
  onClose,
  onConfirmPaid,
}: VietQrModalProps) {
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const targetBankId = category?.bankId || BANK_CONFIG.bankId;
  const targetAccountNo = category?.bankAccountNo || BANK_CONFIG.accountNo;
  const targetBankName = category?.bankName || BANK_CONFIG.bankName;
  const shortFundTag =
    category?.code ||
    contribution.fundName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);

  const transferMemo = `KP3 ${contribution.householdCode || "UNGHO"} ${shortFundTag}`.toUpperCase();
  const qrUrl = getVietQRUrl(
    contribution.amount,
    transferMemo,
    targetAccountNo,
    targetBankId
  );

  const handleCopyAcc = () => {
    navigator.clipboard.writeText(targetAccountNo);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(transferMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleConfirmPaid = () => {
    if (onConfirmPaid) {
      setIsConfirming(true);
      onConfirmPaid(contribution.id);
      setTimeout(() => {
        setIsConfirming(false);
        onClose();
      }, 600);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Mã VietQR Chuẩn NAPAS 247"
      description="Đóng quỹ tự động qua mọi ứng dụng ngân hàng hoặc ví điện tử."
      size="md"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`VietQR_${contribution.householdCode}_${shortFundTag}.png`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download size={14} /> Tải ảnh QR
          </a>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
            {!readOnly && onConfirmPaid && contribution.status !== "Đã nộp" && (
              <Button
                variant="emerald"
                size="sm"
                leftIcon={<CheckCircle2 size={14} />}
                isLoading={isConfirming}
                onClick={handleConfirmPaid}
              >
                {isConfirming ? "Đang đối soát..." : "Xác nhận đã thu"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-600 font-medium">Người / Đơn vị nộp:</span>
            <span className="font-bold text-slate-900 text-right">
              {contribution.ownerName}
            </span>
          </div>
          {contribution.householdCode && contribution.householdCode !== "N/A" && (
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-600 font-medium">Mã đối tượng:</span>
              <span className="font-mono font-bold text-[#073B72] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {contribution.householdCode}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-600 font-medium">Quỹ đóng góp:</span>
            <span className="font-semibold text-slate-900 text-right">
              {contribution.fundName}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-slate-700 font-bold">Số tiền chuyển:</span>
            <span className="font-mono font-black text-emerald-700 text-base tabular-nums">
              {contribution.amount.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <img
            src={qrUrl}
            alt="Mã VietQR Đóng Quỹ Khu phố 3"
            className="w-52 h-auto object-contain rounded-xl border border-slate-200 bg-white p-1"
            loading="eager"
          />
          <p className="text-xs text-slate-600 mt-2.5 text-center flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            Quét mã bằng ứng dụng ngân hàng để tự động điền đúng số tiền & nội dung
          </p>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 block font-medium">
              Ngân hàng thụ hưởng
            </span>
            <span className="font-bold text-slate-900">{targetBankName}</span>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="min-w-0">
              <span className="text-xs text-slate-600 block font-medium">
                Số tài khoản Ban Quản lý Quỹ
              </span>
              <span className="font-mono font-bold text-[#073B72] text-sm">
                {targetAccountNo}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyAcc}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold flex items-center gap-1 text-xs cursor-pointer shrink-0"
            >
              {copiedAcc ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} />
              )}
              {copiedAcc ? "Đã chép" : "Sao chép"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="min-w-0">
              <span className="text-xs text-slate-600 block font-medium">
                Nội dung chuyển khoản tự động
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs break-all">
                {transferMemo}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyMemo}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold flex items-center gap-1 text-xs cursor-pointer shrink-0"
            >
              {copiedMemo ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} />
              )}
              {copiedMemo ? "Đã chép" : "Sao chép"}
            </button>
          </div>
        </div>

        {readOnly && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-[#073B72] text-xs font-medium flex items-center gap-2">
            <QrCode size={15} className="shrink-0" />
            <span>
              Sau khi chuyển khoản thành công, Thủ quỹ KP3 sẽ đối soát sao kê và cập nhật trạng thái biên lai trong ngày.
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
