import React, { useEffect, useState } from "react";
import { Camera, Loader2, LocateFixed, Plus, X } from "lucide-react";
import { FieldReport, ReportCategory, ReportPriority } from "../../types";
import {
  KP3_STREETS,
  KP3_TEAMS,
  REPORT_CATEGORIES,
  REPORT_PRIORITY_CONFIG,
  computeSlaDeadlineIso,
  formatNowVNString,
  getBeforeImages,
  getCategoryMeta,
} from "../../data/reportConfig";
import {
  DEFAULT_MAX_IMAGES_PER_SET,
  uploadReportImages,
} from "../../utils/imageUpload";
import { KP3_CENTER, decimalToDMS } from "../../utils/gisUtils";
import { Button, Input, Modal } from "../ui";
import { ReportSelect } from "./ReportSelect";
import { ReportImage } from "./ImageLightboxModal";

export interface ReportFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialReport?: FieldReport | null;
  readOnly: boolean;
  defaultReporterName?: string;
  onClose: () => void;
  onSaveCreate: (newReport: FieldReport) => void;
  onSaveEdit: (updatedReport: FieldReport) => void;
}

export function ReportFormModal({
  isOpen,
  mode,
  initialReport,
  readOnly,
  defaultReporterName = "",
  onClose,
  onSaveCreate,
  onSaveEdit,
}: ReportFormModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReportCategory>("Rác thải");
  const [priority, setPriority] = useState<ReportPriority>("Bình thường");
  const [location, setLocation] = useState("");
  const [alleyGroup, setAlleyGroup] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [assignedUnit, setAssignedUnit] = useState<string>(KP3_TEAMS[0]);
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [gpsCoords, setGpsCoords] = useState<{ lat?: number; lng?: number }>({});
  const [isLocating, setIsLocating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (mode === "edit" && initialReport) {
      setTitle(initialReport.title);
      setCategory(initialReport.category);
      setPriority(initialReport.priority || "Bình thường");
      setLocation(initialReport.location);
      setAlleyGroup(initialReport.alleyGroup || "");
      setDescription(initialReport.description);
      setReporterName(initialReport.reporterName);
      setReporterPhone(initialReport.reporterPhone);
      setIsAnonymous(Boolean(initialReport.isAnonymous));
      setAssignedUnit(
        initialReport.assignedUnit || getCategoryMeta(initialReport.category).defaultUnit
      );
      setBeforeImages(getBeforeImages(initialReport));
      setGpsCoords({ lat: initialReport.lat, lng: initialReport.lng });
    } else {
      const defaultCat: ReportCategory = "Rác thải";
      setTitle("");
      setCategory(defaultCat);
      setPriority(getCategoryMeta(defaultCat).defaultPriority);
      setLocation("");
      setAlleyGroup("");
      setDescription("");
      setReporterName(defaultReporterName);
      setReporterPhone("");
      setIsAnonymous(false);
      setAssignedUnit(getCategoryMeta(defaultCat).defaultUnit);
      setBeforeImages([]);
      setGpsCoords({});
    }
  }, [isOpen, mode, initialReport, defaultReporterName]);

  const handleCategoryChange = (val: string) => {
    const nextCat = val as ReportCategory;
    setCategory(nextCat);
    if (mode === "create") {
      const meta = getCategoryMeta(nextCat);
      setPriority(meta.defaultPriority);
      setAssignedUnit(meta.defaultUnit);
    }
  };

  const handleImageFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = DEFAULT_MAX_IMAGES_PER_SET - beforeImages.length;
    if (remaining <= 0) {
      setErrorMsg(`Mỗi phản ánh đính kèm tối đa ${DEFAULT_MAX_IMAGES_PER_SET} ảnh hiện trường.`);
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const files = Array.from(fileList).slice(0, remaining);
      const { urls, errors } = await uploadReportImages(files, "before");
      if (urls.length > 0) {
        setBeforeImages((prev) => [...prev, ...urls].slice(0, DEFAULT_MAX_IMAGES_PER_SET));
      }
      if (errors.length > 0) {
        setErrorMsg(errors[0]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDetectGps = () => {
    setIsLocating(true);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setGpsCoords({ lat, lng });
          if (!location.trim()) {
            setLocation(`Khu phố 3 (${decimalToDMS(lat, lng)})`);
          }
          setIsLocating(false);
        },
        () => {
          setGpsCoords({ lat: KP3_CENTER.lat, lng: KP3_CENTER.lng });
          if (!location.trim()) {
            setLocation("Trục Lương Định Của, Khu phố 3, P. An Phú");
          }
          setIsLocating(false);
        },
        { timeout: 6000 }
      );
    } else {
      setGpsCoords({ lat: KP3_CENTER.lat, lng: KP3_CENTER.lng });
      setIsLocating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề ngắn gọn cho phản ánh.");
      return;
    }
    if (!location.trim()) {
      setErrorMsg("Vui lòng nhập vị trí/số nhà cụ thể để tổ công tác tìm tới.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Vui lòng mô tả chi tiết tình trạng hiện trường.");
      return;
    }
    if (!isAnonymous && !reporterName.trim()) {
      setErrorMsg("Vui lòng nhập họ tên người phản ánh hoặc chọn chế độ ẩn danh.");
      return;
    }

    const now = new Date();
    const timeStr = formatNowVNString(now);
    const slaHours = REPORT_PRIORITY_CONFIG[priority].slaHours;

    if (mode === "edit" && initialReport) {
      const updated: FieldReport = {
        ...initialReport,
        title: title.trim(),
        category,
        priority,
        slaHours,
        location: location.trim(),
        alleyGroup: alleyGroup || initialReport.alleyGroup,
        description: description.trim(),
        reporterName: isAnonymous ? "Cư dân ẩn danh" : reporterName.trim(),
        reporterPhone: isAnonymous ? "" : reporterPhone.trim(),
        isAnonymous,
        assignedUnit,
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        beforeImages,
        beforeImage: beforeImages[0],
      };
      onSaveEdit(updated);
      onClose();
      return;
    }

    const newReport: FieldReport = {
      id: `REP${String(Math.floor(100 + Math.random() * 900))}`,
      title: title.trim(),
      category,
      priority,
      slaHours,
      slaDeadline: computeSlaDeadlineIso(priority, now),
      location: location.trim(),
      alleyGroup: alleyGroup || undefined,
      description: description.trim(),
      reporterName: isAnonymous ? "Cư dân ẩn danh" : reporterName.trim(),
      reporterPhone: isAnonymous ? "" : reporterPhone.trim(),
      isAnonymous,
      assignedUnit,
      reportedAt: timeStr,
      createdAt: now.toLocaleDateString("vi-VN"),
      coordinates: {
        x: 35 + Math.floor(Math.random() * 35),
        y: 25 + Math.floor(Math.random() * 45),
      },
      lat: gpsCoords.lat ?? KP3_CENTER.lat,
      lng: gpsCoords.lng ?? KP3_CENTER.lng,
      status: "Đã tiếp nhận",
      beforeImages,
      beforeImage: beforeImages[0],
      timeline: [
        {
          time: timeStr,
          title: "Tiếp nhận phản ánh 1022",
          description: `Ghi nhận phản ánh kèm ${beforeImages.length} ảnh hiện trường.`,
          actor: isAnonymous ? "Cư dân ẩn danh" : `${reporterName.trim()}`,
        },
      ],
      messages: [],
    };
    onSaveCreate(newReport);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={mode === "edit" ? `Chỉnh sửa hồ sơ ${initialReport?.id || ""}` : "Gửi Phản ánh Hiện trường 1022"}
      description="Cung cấp địa điểm chính xác và đính kèm tối đa 4 ảnh thực tế để Ban Điều hành KP3 xử lý nhanh."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="report-form-modal-form"
            variant="emerald"
            isLoading={isUploading}
          >
            {mode === "edit" ? "Lưu thay đổi" : "Gửi phản ánh"}
          </Button>
        </>
      }
    >
      <form id="report-form-modal-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800"
          >
            {errorMsg}
          </div>
        )}

        <Input
          id="report-title-input"
          label="Tiêu đề phản ánh"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Rác ứ đọng đầu hẻm 42, hỏng đèn đường..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReportSelect
            id="report-category-select"
            label="Nhóm vấn đề"
            required
            value={category}
            onChange={handleCategoryChange}
            options={REPORT_CATEGORIES.slice(0, 6).map((c) => ({
              value: c.id,
              label: c.label,
            }))}
          />

          <ReportSelect
            id="report-priority-select"
            label="Mức độ khẩn cấp (SLA)"
            value={priority}
            onChange={(v) => setPriority(v as ReportPriority)}
            options={(Object.keys(REPORT_PRIORITY_CONFIG) as ReportPriority[]).map((p) => ({
              value: p,
              label: `${REPORT_PRIORITY_CONFIG[p].label} (${REPORT_PRIORITY_CONFIG[p].shortSla})`,
            }))}
          />
        </div>

        {/* Location + GPS */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1">
              <Input
                id="report-location-input"
                label="Vị trí cụ thể / Số nhà"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Số nhà, cột điện, đoạn hẻm xảy ra sự cố..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleDetectGps}
              isLoading={isLocating}
              leftIcon={<LocateFixed size={15} className="text-emerald-700" />}
              className="shrink-0"
            >
              Lấy GPS
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-600 font-medium">Chọn nhanh khu vực:</span>
            {KP3_STREETS.slice(0, 4).map((street) => (
              <button
                key={street}
                type="button"
                onClick={() => {
                  setAlleyGroup(street);
                  if (!location.trim()) setLocation(street);
                }}
                className={`px-2.5 py-1 rounded-full text-xs border cursor-pointer transition-colors ${
                  alleyGroup === street
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {street}
              </button>
            ))}
          </div>
          {gpsCoords.lat && gpsCoords.lng && (
            <p className="text-xs font-mono text-emerald-800">
              Tọa độ đã gắn: {gpsCoords.lat}, {gpsCoords.lng}
            </p>
          )}
        </div>

        {!readOnly && (
          <ReportSelect
            id="report-team-select"
            label="Đơn vị / Tổ công tác tiếp nhận"
            value={assignedUnit}
            onChange={setAssignedUnit}
            options={KP3_TEAMS.map((t) => ({ value: t, label: t }))}
          />
        )}

        <div>
          <label
            htmlFor="report-description-input"
            className="text-xs font-semibold text-slate-700 block mb-1.5"
          >
            Mô tả hiện trạng chi tiết <span className="text-rose-600 font-bold">*</span>
          </label>
          <textarea
            id="report-description-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả mức độ ảnh hưởng, thời gian xuất hiện sự cố, hướng dẫn lối vào..."
            className="w-full p-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 hover:border-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Multi-image upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Ảnh hiện trường ({beforeImages.length}/{DEFAULT_MAX_IMAGES_PER_SET} ảnh • Tự động nén nhanh)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {beforeImages.map((url, idx) => (
              <div
                key={`${url.slice(0, 24)}-${idx}`}
                className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
              >
                <ReportImage
                  src={url}
                  alt={`Ảnh hiện trường ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBeforeImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 hover:bg-rose-700 text-white cursor-pointer"
                  aria-label={`Xóa ảnh ${idx + 1}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {beforeImages.length < DEFAULT_MAX_IMAGES_PER_SET && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-1.5 text-slate-600 cursor-pointer transition-colors p-2 text-center">
                {isUploading ? (
                  <Loader2 size={20} className="animate-spin text-emerald-700" />
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-700">
                      <Camera size={16} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">
                      Thêm / Chụp ảnh
                    </span>
                    <span className="text-[11px] text-slate-600 flex items-center gap-0.5">
                      <Plus size={11} /> Tối đa {DEFAULT_MAX_IMAGES_PER_SET}
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
                    handleImageFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Reporter info */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Thông tin liên hệ phản hồi
            </span>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="size-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
              />
              <span>Gửi ẩn danh</span>
            </label>
          </div>
          {!isAnonymous && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="report-reporter-name"
                label="Họ tên người báo"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
              <Input
                id="report-reporter-phone"
                label="Số điện thoại"
                type="tel"
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
                placeholder="09xx xxx xxx"
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

