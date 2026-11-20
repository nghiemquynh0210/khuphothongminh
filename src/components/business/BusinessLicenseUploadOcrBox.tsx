import React, { useState } from "react";
import {
  Eye,
  FileCheck,
  FileText,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { BusinessFile, BusinessLicenseOcrData } from "../../types";

interface BusinessLicenseUploadOcrBoxProps {
  modeType?: "enterprise" | "business";
  giayPhepFile: BusinessFile | null;
  ocrData?: BusinessLicenseOcrData | null;
  isProcessingOcr: boolean;
  autoOcrEnabled: boolean;
  onToggleAutoOcr: (enabled: boolean) => void;
  onUploadFile: (file: File) => void;
  onTriggerManualOcr: () => void;
  onOpenOcrReview?: () => void;
  onClearFile: () => void;
}

export const BusinessLicenseUploadOcrBox: React.FC<
  BusinessLicenseUploadOcrBoxProps
> = ({
  modeType = "business",
  giayPhepFile,
  ocrData,
  isProcessingOcr,
  autoOcrEnabled,
  onToggleAutoOcr,
  onUploadFile,
  onTriggerManualOcr,
  onOpenOcrReview,
  onClearFile,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const docTitle =
    modeType === "enterprise"
      ? "Giấy chứng nhận Đăng ký Doanh nghiệp (ERC)"
      : "Giấy phép Kinh doanh / GCN Đăng ký Hộ kinh doanh";

  return (
    <>
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/80 via-emerald-50/50 to-slate-50 border border-indigo-200/80 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles size={14} />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Tải hình ảnh / PDF {docTitle}
              </span>
              <span className="text-[11px] text-slate-600 block">
                Hỗ trợ ảnh chụp điện thoại (JPG, PNG, WebP) hoặc PDF để tự động bóc
                tách tên, mã số, ngành nghề, người đại diện &amp; địa chỉ
              </span>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 cursor-pointer shrink-0 self-start sm:self-auto">
            <input
              type="checkbox"
              checked={autoOcrEnabled}
              onChange={(e) => onToggleAutoOcr(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600"
            />
            <span className="text-[11px] font-bold text-indigo-950">
              Tự động nhận diện OCR khi tải ảnh
            </span>
          </label>
        </div>

        <div
          className={`border border-dashed rounded-xl p-3 transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-50/70"
              : "border-slate-300 hover:border-indigo-400 bg-white"
          }`}
          onDragEnter={() => setDragActive(true)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              onUploadFile(e.dataTransfer.files[0]);
            }
          }}
        >
          {isProcessingOcr ? (
            <div className="py-3 flex flex-col items-center justify-center gap-1.5 text-indigo-700">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold">
                Đang nhận diện AI OCR Giấy phép kinh doanh...
              </span>
            </div>
          ) : giayPhepFile ? (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200/90">
                <div className="flex items-center gap-2.5 min-w-0">
                  {giayPhepFile.type === "image" ? (
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 cursor-pointer group relative"
                      title="Nhấn để phóng to ảnh Giấy phép kinh doanh"
                    >
                      <img
                        src={giayPhepFile.url}
                        alt={giayPhepFile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                  )}

                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {giayPhepFile.name}
                    </p>
                    <p className="text-[10.5px] text-emerald-700 font-medium flex items-center gap-1">
                      <FileCheck size={12} />
                      <span>
                        Đã đính kèm ({giayPhepFile.size || "Bản chụp"}) •{" "}
                        {giayPhepFile.uploadDate || "Hôm nay"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>Xem giấy phép</span>
                  </button>

                  <button
                    type="button"
                    onClick={onTriggerManualOcr}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Quét OCR</span>
                  </button>

                  {ocrData && onOpenOcrReview && (
                    <button
                      type="button"
                      onClick={onOpenOcrReview}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Đối chiếu</span>
                    </button>
                  )}

                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer">
                    <Upload size={12} />
                    <span>Đổi tệp</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onUploadFile(e.target.files[0]);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={onClearFile}
                    aria-label="Xóa tệp Giấy phép kinh doanh"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {ocrData?.isOcrSuccess && (
                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate">
                    <strong>OCR đã bóc tách:</strong>{" "}
                    {ocrData.businessName || "Đơn vị"} • Số GP/MST:{" "}
                    <span className="font-mono font-bold">
                      {ocrData.licenseNumber || ocrData.taxCode || "—"}
                    </span>
                  </span>
                  {onOpenOcrReview && (
                    <button
                      type="button"
                      onClick={onOpenOcrReview}
                      className="text-emerald-800 font-bold hover:underline cursor-pointer shrink-0"
                    >
                      Xem chi tiết OCR ➜
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center py-2.5 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUploadFile(e.target.files[0]);
                    e.target.value = "";
                  }
                }}
              />
              <Upload size={20} className="text-indigo-600 mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                Kéo thả ảnh chụp hoặc PDF{" "}
                <strong className="text-indigo-900">{docTitle}</strong> vào đây,
                hoặc{" "}
                <span className="text-indigo-600 underline font-bold">
                  chọn tệp / chụp ảnh
                </span>
              </p>
              <span className="text-[10.5px] text-slate-400 mt-0.5">
                {autoOcrEnabled
                  ? "Chế độ Tự động OCR đang BẬT: tải lên sẽ tự đọc Tên, Mã số, Địa chỉ & Người đại diện"
                  : "Chế độ chỉ đính kèm tệp (có thể nhấn Quét OCR thủ công bất cứ lúc nào)"}
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Lightbox xem bản chụp Giấy phép KD */}
      {isPreviewOpen && giayPhepFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {docTitle}: {giayPhepFile.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                aria-label="Đóng xem trước"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
              {giayPhepFile.type === "pdf" ? (
                <iframe
                  src={giayPhepFile.url}
                  title={giayPhepFile.name}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={giayPhepFile.url}
                  alt={giayPhepFile.name}
                  className="max-h-[72vh] w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BusinessLicenseUploadOcrBox;
