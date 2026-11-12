import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldAlert,
  X,
} from "lucide-react";
import { FieldReport } from "../types";
import {
  getBeforeImages,
  getCategoryMeta,
  normalizeReport,
} from "../data/reportConfig";
import {
  DEFAULT_MAX_IMAGES_PER_SET,
  uploadReportImages,
} from "../utils/imageUpload";
import { Button, Input } from "../components/ui";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ReportImage } from "../components/reports/ImageLightboxModal";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, getReportDetailPath, navigate } from "../routes";

export interface ReportResolvePageProps {
  reportId: string;
  reports: FieldReport[];
  isDataLoading?: boolean;
  readOnly?: boolean;
  defaultActorName?: string;
  onConfirmResolve: (
    report: FieldReport,
    payload: {
      afterImages: string[];
      note: string;
      actorName: string;
    }
  ) => void;
  onCancel?: () => void;
  onResolved?: (report: FieldReport) => void;
}

export default function ReportResolvePage({
  reportId,
  reports,
  isDataLoading = false,
  readOnly = false,
  defaultActorName = "Ban Điều hành KP3",
  onConfirmResolve,
  onCancel,
  onResolved,
}: ReportResolvePageProps) {
  const report = useMemo(() => {
    const found = reports.find((r) => r.id === reportId);
    return found ? normalizeReport(found) : null;
  }, [reports, reportId]);

  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [actorName, setActorName] = useState(defaultActorName);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    setAfterImages(
      report.afterImages || (report.afterImage ? [report.afterImage] : [])
    );
    setNote(
      "Sự cố đã được tổ công tác kiểm tra, khắc phục dứt điểm và bàn giao lại hiện trạng thông thoáng cho cư dân."
    );
    setActorName(
      defaultActorName || report.assignedOfficer || "Ban Điều hành KP3"
    );
    setErrorMsg(null);
  }, [report, defaultActorName]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (report) {
      navigate(getReportDetailPath(report.id));
      return;
    }
    navigate(ROUTES.DASHBOARD_REPORTS);
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = DEFAULT_MAX_IMAGES_PER_SET - afterImages.length;
    if (remaining <= 0) {
      setErrorMsg(
        `Tối đa ${DEFAULT_MAX_IMAGES_PER_SET} ảnh minh chứng sau xử lý.`
      );
      return;
    }
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const files = Array.from(fileList).slice(0, remaining);
      const { urls, errors } = await uploadReportImages(files, "after");
      if (urls.length > 0) {
        setAfterImages((prev) =>
          [...prev, ...urls].slice(0, DEFAULT_MAX_IMAGES_PER_SET)
        );
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
    if (!report) return;
    if (afterImages.length === 0) {
      setErrorMsg(
        "Vui lòng đính kèm ít nhất 1 ảnh minh chứng sau xử lý để công khai kết quả."
      );
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
    if (onResolved) {
      onResolved(report);
    } else {
      navigate(getReportDetailPath(report.id));
    }
  };

  if (isDataLoading && !report) {
    return <LoadingFade title="Đang tải hồ sơ phản ánh để nghiệm thu..." />;
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Không tìm thấy hồ sơ phản ánh
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hồ sơ mã{" "}
                <span className="font-mono font-bold text-slate-700">
                  {reportId}
                </span>{" "}
                không tồn tại hoặc đã bị xóa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD_REPORTS)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Quay lại danh sách phản ánh
          </button>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Chức năng dành riêng cho Cán bộ Khu phố 3
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Chỉ cán bộ phụ trách mới có quyền nghiệm thu và xác nhận hoàn
                tất xử lý phản ánh.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            leftIcon={<ArrowLeft size={14} />}
            onClick={handleBack}
          >
            Quay lại hồ sơ phản ánh
          </Button>
        </div>
      </div>
    );
  }

  const beforeImgs = getBeforeImages(report);
  const catMeta = getCategoryMeta(report.category);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        badgeIcon={<CheckCircle2 size={14} className="text-emerald-700 shrink-0" />}
        badgeText={`Nghiệm thu & Hoàn tất • ${report.id}`}
        badgeSubtext={report.category}
        title={`Hoàn tất xử lý hồ sơ ${report.id}`}
        description={report.title}
        actions={
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft size={14} />}
            onClick={handleBack}
          >
            Quay lại hồ sơ
          </Button>
        }
      />

      {errorMsg && (
        <InlineNotice
          type="error"
          message={errorMsg}
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Report Summary & Before Images for comparison */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
              >
                {report.category}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {report.reportedAt}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">{report.title}</h3>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-700 shrink-0" />
              <span>{report.location}</span>
            </p>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              {report.description}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block">
              Ảnh hiện trạng ban đầu ({beforeImgs.length} ảnh)
            </span>
            {beforeImgs.length === 0 ? (
              <div className="py-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                Không có ảnh hiện trạng ban đầu.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {beforeImgs.map((url, idx) => (
                  <div
                    key={`${url.slice(0, 20)}-${idx}`}
                    className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <ReportImage
                      src={url}
                      alt={`Hiện trạng ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Resolve Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Ảnh minh chứng sau khi xử lý ({afterImages.length}/
              {DEFAULT_MAX_IMAGES_PER_SET}){" "}
              <span className="text-rose-600 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {afterImages.map((url, idx) => (
                <div
                  key={`${url.slice(0, 20)}-${idx}`}
                  className="relative aspect-square rounded-xl border border-emerald-200 overflow-hidden bg-slate-50"
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
                <label className="aspect-square rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 flex flex-col items-center justify-center gap-1.5 text-emerald-800 cursor-pointer p-2 text-center transition-colors">
                  {isUploading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Camera size={20} />
                      <span className="text-xs font-semibold">
                        Tải ảnh xong
                      </span>
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
              Ảnh này sẽ hiển thị đối chiếu cùng ảnh hiện trường và gửi thông
              báo tới cư dân.
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
              Báo cáo kết quả xử lý{" "}
              <span className="text-rose-600 font-bold">*</span>
            </label>
            <textarea
              id="resolve-note-textarea"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Nêu rõ biện pháp đã khắc phục để cư dân nắm thông tin..."
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={handleBack}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="emerald"
              isLoading={isUploading}
              leftIcon={<CheckCircle2 size={15} />}
            >
              Xác nhận hoàn tất
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

