import React, { useEffect } from "react";
import { FileCheck, Sparkles, X, Check, FileText } from "lucide-react";
import { LandCertificateOcrResult } from "../../utils/landCertificateOcr";

interface SoDoOcrConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrData: LandCertificateOcrResult | null;
  currentValues: {
    toBanDo: string;
    soThua: string;
    dienTich: string;
    loaiDat: string;
    tenChuSuDung: string;
    soGcn: string;
    soVaoSo: string;
  };
  onApply: () => void;
}

export const SoDoOcrConfirmModal: React.FC<SoDoOcrConfirmModalProps> = ({
  isOpen,
  onClose,
  ocrData,
  currentValues,
  onApply,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ocrData) return null;

  const comparisonRows = [
    { label: "Tờ bản đồ số", ocr: ocrData.toBanDo, current: currentValues.toBanDo || "Chưa có" },
    { label: "Thửa đất số", ocr: ocrData.soThua, current: currentValues.soThua || "Chưa có" },
    { label: "Diện tích đất", ocr: ocrData.dienTich ? `${ocrData.dienTich} m²` : "", current: currentValues.dienTich ? `${currentValues.dienTich} m²` : "Chưa có" },
    { label: "Loại đất", ocr: ocrData.loaiDat, current: currentValues.loaiDat || "Chưa có" },
    { label: "Tên người sử dụng đất", ocr: ocrData.tenChuSuDung, current: currentValues.tenChuSuDung || "Chưa có" },
    { label: "Số phát hành GCN", ocr: ocrData.soGcn, current: currentValues.soGcn || "Chưa có" },
    { label: "Số vào sổ cấp GCN", ocr: ocrData.soVaoSo, current: currentValues.soVaoSo || "Chưa có" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <Sparkles size={18} className="text-emerald-400" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Kết Quả Trích Xuất OCR Sổ Đỏ / GCN QSDĐ
              </h3>
              <p className="text-xs text-emerald-200">
                Hệ thống AI đã tự động nhận diện các trường Địa chính từ tệp bạn tải lên
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

        {/* Comparison Table */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <FileCheck size={18} className="text-emerald-600 shrink-0" />
            <span>
              Đã nhận diện thành công dữ liệu địa chính. Bạn có muốn tự động cập nhật các trường thông tin bên dưới vào hồ sơ cơ sở kinh doanh không?
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[480px] text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Trường Địa chính</th>
                  <th className="py-2.5 px-3 text-left">Dữ liệu hiện tại</th>
                  <th className="py-2.5 px-3 text-left bg-emerald-50/70 text-emerald-900">
                    <span className="flex items-center gap-1 font-black">
                      <Sparkles size={12} className="text-emerald-600" />
                      Nhận diện OCR tự động
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-medium text-slate-700">{row.label}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{row.current}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-900 bg-emerald-50/30 font-mono">
                      {row.ocr ? (
                        <span className="inline-flex items-center gap-1">
                          <Check size={12} className="text-emerald-600 shrink-0" />
                          {row.ocr}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">Không nhận diện được</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Bỏ qua / Tự nhập tay
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check size={14} />
            <span>Áp dụng kết quả OCR vào Hồ sơ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoDoOcrConfirmModal;
