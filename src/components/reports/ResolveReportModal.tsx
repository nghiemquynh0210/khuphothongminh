import React, { useEffect, useState } from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { FieldReport } from "../../types";
import {
  DEFAULT_MAX_IMAGES_PER_SET,
  uploadReportImages,
} from "../../utils/imageUpload";
import { Button, Input, Modal } from "../ui";
import { ReportImage } from "./ImageLightboxModal";

export interface ResolveReportModalProps {
  report: FieldReport | null;
  defaultActorName: string;
  onClose: () => void;
  onConfirmResolve: (
    report: FieldReport,
    payload: {
      afterImages: string[];
      note: string;
      actorName: string;
    }
  ) => void;
}

export function ResolveReportModal({
  report,
  defaultActorName,
  onClose,
  onConfirmResolve,
}: ResolveReportModalProps) {
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [actorName, setActorName] = useState(defaultActorName);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    setAfterImages(report.afterImages || (report.afterImage ? [report.afterImage] : []));
    setNote(
      "Sự cố đã được tổ công tác kiểm tra, khắc phục dứt điểm và bàn giao lại hiện trạng thông thoáng cho cư dân."
    );
    setActorName(defaultActorName || report.assignedOfficer || "Ban Điều hành KP3");
    setErrorMsg(null);
  }, [report, defaultActorName]);

  if (!report) return null;

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = DEFAULT_MAX_IMAGES_PER_SET - afterImages.length;
    if (remaining <= 0) {
      setErrorMsg(`Tối đa ${DEFAULT_MAX_IMAGES_PER_SET} ảnh minh chứng sau xử lý.`);
      return;
    }
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const files = Array.from(fileList).slice(0, remaining);
      const { urls, errors } = await uploadReportImages(files, "after");
      if (urls.length > 0) {
        setAfterImages((prev) => [...prev, ...urls].slice(0, DEFAULT_MAX_IMAGES_PER_SET));
      }
      if (errors.length > 0) {
        setErrorMsg(errors[0]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (afterImages.length === 0) {
      setErrorMsg("Vui lòng đính kèm ít nhất 1 ảnh minh chứng sau xử lý để công khai kết quả.");
      return;
    }
    if (!note.trim()) {
      setErrorMsg("Vui lòng nhập nội dung báo cáo kết quả xử lý.");
      return;
    }
    onConfirmResolve(report, {
      afterImages,
      note: note.trim(),
      actorName: actorName.trim() || "Cán bộ KP3",
    });
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(report)}
      onClose={onClose}
      size="lg"
      title={`Hoàn tất xử lý hồ sơ ${report.id}`}
      description={report.title}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng lại
          </Button>
          <Button
            type="submit"
            form="resolve-report-form"
            variant="emerald"
            isLoading={isUploading}
            leftIcon={<CheckCircle2 size={15} />}
          >
            Xác nhận hoàn tất
          </Button>
        </>
      }
    >
      <form id="resolve-report-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800"
          >
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Ảnh minh chứng sau khi xử lý ({afterImages.length}/{DEFAULT_MAX_IMAGES_PER_SET}){" "}
            <span className="text-rose-600 font-bold">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {afterImages.map((url, idx) => (
              <div
                key={`${url.slice(0, 20)}-${idx}`}
                className="relative aspect-square rounded-lg border border-emerald-200 overflow-hidden bg-slate-50"
              >
                <ReportImage
                  src={url}
                  alt={`Minh chứng hoàn tất ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAfterImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 hover:bg-rose-700 text-white cursor-pointer"
                  aria-label={`Xóa ảnh kết quả ${idx + 1}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {afterImages.length < DEFAULT_MAX_IMAGES_PER_SET && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 flex flex-col items-center justify-center gap-1.5 text-emerald-800 cursor-pointer p-2 text-center">
                {isUploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={20} />
                    <span className="text-xs font-semibold">Tải ảnh xong</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    handleUploadFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Ảnh này sẽ hiển thị đối chiếu cùng ảnh hiện trường và gửi thông báo tới cư dân.
          </p>
        </div>

        <Input
          id="resolve-actor-input"
          label="Cán bộ / Đơn vị xác nhận"
          value={actorName}
          onChange={(e) => setActorName(e.target.value)}
        />

        <div>
          <label
            htmlFor="resolve-note-textarea"
            className="text-xs font-semibold text-slate-700 block mb-1.5"
          >
            Báo cáo kết quả xử lý <span className="text-rose-600 font-bold">*</span>
          </label>
          <textarea
            id="resolve-note-textarea"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Nêu rõ biện pháp đã khắc phục để cư dân nắm thông tin..."
          />
        </div>
      </form>
    </Modal>
  );
}

