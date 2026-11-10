import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Upload,
  X
} from "lucide-react";
import { Business, BusinessFile } from "../../types";
import {
  downloadBusinessFile,
  processBusinessFileUpload
} from "../../utils/businessFormUtils";

export interface ViewingBusinessDoc {
  title: string;
  businessName: string;
  file: BusinessFile;
  business?: Business;
}

interface BusinessSodoModalProps {
  viewingDoc: ViewingBusinessDoc | null;
  onClose: () => void;
  onReplaceFile?: (business: Business, fileObj: BusinessFile) => void;
}

/**
 * Modal xem nhanh tài liệu Sổ đỏ / Giấy chứng nhận QSDĐ (hỗ trợ PDF và hình ảnh),
 * dùng chung cho thẻ danh sách và trang chi tiết Cơ sở Kinh doanh.
 */
export default function BusinessSodoModal({
  viewingDoc,
  onClose,
  onReplaceFile
}: BusinessSodoModalProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!viewingDoc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingDoc, onClose]);

  if (!viewingDoc) return null;

  const { title, businessName, file, business } = viewingDoc;

  const handleFile = (pickedFile: File) => {
    if (!business || !onReplaceFile) return;
    setUploadError(null);
    processBusinessFileUpload(
      pickedFile,
      fileObj => onReplaceFile(business, fileObj),
      err => setUploadError(err)
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-sodo-modal-title"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
      >
        <div className="bg-slate-900 text-white p-4 px-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
              {file.type === "pdf" ? <FileText size={18} /> : <ImageIcon size={18} />}
            </div>
            <div className="min-w-0">
              <h3 id="business-sodo-modal-title" className="font-bold text-sm truncate">
                {title} — {businessName}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono truncate">
                {file.name} {file.size ? `• ${file.size}` : ""}
                {file.uploadDate ? ` • Tải lên: ${file.uploadDate}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadBusinessFile(file)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Tải xuống</span>
            </button>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={13} />
              <span>Mở tab mới</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng trình xem tài liệu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {business && (business.toBanDo || business.soThua || business.soGcn) && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-700">
            <span>
              Tờ BĐ: <strong className="font-mono text-slate-900">{business.toBanDo || "—"}</strong>
            </span>
            <span>
              Số thửa: <strong className="font-mono text-slate-900">{business.soThua || "—"}</strong>
            </span>
            <span>
              Diện tích:{" "}
              <strong className="font-mono text-slate-900">
                {business.dienTich ? `${business.dienTich} m²` : "—"}
              </strong>
            </span>
            <span>
              Loại đất: <strong className="text-slate-900">{business.loaiDat || "ODT"}</strong>
            </span>
            {business.soGcn && (
              <span>
                Số GCN: <strong className="font-mono text-indigo-800">{business.soGcn}</strong>
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[380px]">
          {file.type === "pdf" ? (
            file.url.startsWith("data:application/pdf") ? (
              <iframe
                src={file.url}
                title={file.name}
                className="w-full h-[62vh] rounded-xl border border-slate-200 bg-white"
              />
            ) : (
              <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-rose-200 p-6 sm:p-8 shadow-md space-y-4 text-slate-800">
                <div className="text-center space-y-1 border-b border-rose-100 pb-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-rose-700">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <h4 className="text-base sm:text-lg font-black uppercase text-rose-800 pt-2">
                    GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT (TRÍCH LỤC BẢN ĐỒ ĐỊA CHÍNH)
                  </h4>
                  <p className="text-xs font-mono text-slate-600">
                    Số phát hành: <strong className="text-rose-700">{business?.soGcn || "CH-098234"}</strong> • Số vào sổ:{" "}
                    <strong>{business?.soVaoSo || "CS-2023-112"}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-rose-50/40 p-4 rounded-xl border border-rose-100">
                  <p>
                    Người sử dụng đất: <strong>{business?.tenChuSuDung || business?.owner || "Chưa cập nhật"}</strong>
                  </p>
                  <p>
                    Cơ sở gắn liền: <strong>{businessName}</strong>
                  </p>
                  <p>
                    Tờ bản đồ số: <strong className="font-mono">{business?.toBanDo || "272"}</strong>
                  </p>
                  <p>
                    Thửa đất số: <strong className="font-mono">{business?.soThua || "55"}</strong>
                  </p>
                  <p className="sm:col-span-2">
                    Địa chỉ thửa đất: <strong>{business?.address || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"}</strong>
                  </p>
                  <p>
                    Diện tích: <strong className="font-mono">{business?.dienTich ? `${business.dienTich} m²` : "150 m²"}</strong>
                  </p>
                  <p>
                    Mục đích sử dụng: <strong className="text-emerald-800">{business?.loaiDat || "Đất ở tại đô thị (ODT)"}</strong>
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 italic text-center">
                  Bản xem trước trích lục hồ sơ điện tử ({file.name}). Có thể tải lên tệp PDF/ảnh thực tế bên dưới để thay thế.
                </p>
              </div>
            )
          ) : (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-[62vh] rounded-xl shadow-md object-contain bg-white"
            />
          )}
        </div>

        {business && onReplaceFile && (
          <div className="p-3.5 px-5 bg-white border-t border-slate-200 space-y-2 shrink-0">
            {uploadError && (
              <p role="alert" className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span>{uploadError}</span>
              </p>
            )}
            <div
              onDragEnter={() => setDragActive(true)}
              onDragOver={e => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={e => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className={`border border-dashed rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 bg-slate-50/70"
              }`}
            >
              <span className="text-slate-600 font-medium">
                Kéo thả tệp PDF hoặc ảnh Sổ đỏ mới để thay thế hồ sơ đính kèm
              </span>
              <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer">
                <Upload size={13} />
                <span>Chọn tệp cập nhật</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
