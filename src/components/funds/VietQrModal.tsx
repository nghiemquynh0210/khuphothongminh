import React, { useState } from "react";
import { 
  QrCode, 
  X, 
  Copy, 
  Check, 
  Download, 
  Building2, 
  ShieldCheck, 
  Coins, 
  Info,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { FundContribution } from "../../types";

export const BANK_CONFIG = {
  bankId: "vietcombank",
  bankName: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  accountNo: "1026070128",
  accountName: "BAN QUAN LY QUY KHU PHO 3 AN PHU"
};

export function getVietQRUrl(amount: number, memo: string) {
  const cleanMemo = memo.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 50);
  return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
}

interface VietQrModalProps {
  contribution: FundContribution;
  onClose: () => void;
  onConfirmPaid?: (id: string) => void;
}

export default function VietQrModal({ contribution, onClose, onConfirmPaid }: VietQrModalProps) {
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const transferMemo = `KP3 ${contribution.householdCode} ${contribution.fundName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`.toUpperCase();
  const qrUrl = getVietQRUrl(contribution.amount, transferMemo);

  const handleCopyAcc = () => {
    navigator.clipboard.writeText(BANK_CONFIG.accountNo);
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
      onConfirmPaid(contribution.id);
      setIsConfirming(true);
      setTimeout(() => {
        setIsConfirming(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="text-emerald-400" size={20} />
            <div>
              <h3 className="font-bold text-sm text-white">Mã VietQR Chuẩn NAPAS 247</h3>
              <p className="text-[10px] text-emerald-300">Đóng quỹ tự động bằng mọi ứng dụng ngân hàng</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Contribution details */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Hộ gia đình:</span>
              <span className="font-bold text-slate-900">{contribution.ownerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Mã Sổ hộ khẩu:</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{contribution.householdCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Quỹ đóng góp:</span>
              <span className="font-semibold text-slate-800">{contribution.fundName}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-700 font-bold">Số tiền chuyển:</span>
              <span className="font-mono font-black text-emerald-700 text-base">{contribution.amount.toLocaleString("vi-VN")} VNĐ</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-50 to-emerald-50/40 rounded-2xl border border-emerald-200/60 shadow-inner">
            <img
              src={qrUrl}
              alt="Mã VietQR Đóng Quỹ Khu phố 3"
              className="w-56 h-auto object-contain rounded-xl shadow-md border-2 border-white"
              loading="eager"
            />
            <p className="text-[10px] text-slate-500 mt-2 text-center flex items-center gap-1 font-medium">
              <ShieldCheck size={13} className="text-emerald-600" />
              Mở app ngân hàng (VCB, MB, Techcom, Viettel...) quét để nộp tự động
            </p>
          </div>

          {/* Transfer Info Breakdown with Copy Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Ngân hàng thụ hưởng</span>
                <span className="font-bold text-slate-800">{BANK_CONFIG.bankName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Số tài khoản Ban Quản lý Quỹ</span>
                <span className="font-mono font-black text-indigo-700 text-xs">{BANK_CONFIG.accountNo}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyAcc}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-bold flex items-center gap-1 text-[10px] cursor-pointer"
              >
                {copiedAcc ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                {copiedAcc ? "Đã chép" : "Sao chép"}
              </button>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Nội dung chuyển khoản (Tự động)</span>
                <span className="font-mono font-bold text-slate-800 text-[10px]">{transferMemo}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyMemo}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-bold flex items-center gap-1 text-[10px] cursor-pointer"
              >
                {copiedMemo ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                {copiedMemo ? "Đã chép" : "Sao chép"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`VietQR_${contribution.householdCode}_${contribution.id}.png`}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} /> Tải ảnh QR
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Đóng
            </button>
            {onConfirmPaid && contribution.status !== "Đã nộp" && (
              <button
                onClick={handleConfirmPaid}
                disabled={isConfirming}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <CheckCircle2 size={13} /> {isConfirming ? "Đang lưu..." : "Xác nhận đã nộp"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
