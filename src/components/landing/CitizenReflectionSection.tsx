import React, { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock,
  Inbox,
  LocateFixed,
  MapPin,
  MessageSquare,
  Search,
  Send,
  Shield,
  X
} from "lucide-react";
import { FieldReport } from "../../types";
import { EmptyState } from "./LandingCommon";
import { uploadReportImages } from "../../utils/imageUpload";
import { KP3_CENTER } from "../../utils/gisUtils";
import { formatShortRecordId } from "../../utils/kp3Utils";
import { extractTimemarkFromImage } from "../../utils/timemarkParser";
import {
  REPORT_PRIORITY_CONFIG,
  computeSlaDeadlineIso,
  getCategoryMeta,
} from "../../data/reportConfig";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_SUBMISSIONS_PER_DAY,
  RATE_KEY,
  REPORT_CATEGORIES,
  SUBMIT_COOLDOWN_MS,
  btnGhost,
  btnPrimary,
  inputCls,
  readSubmissionLog
} from "./landingConstants";

export interface CitizenReflectionSectionProps {
  reports: FieldReport[];
  onAddReport: (newReport: FieldReport) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function CitizenReflectionSection({
  reports,
  onAddReport,
  showToast
}: CitizenReflectionSectionProps) {
  const [repCategory, setRepCategory] = useState<FieldReport["category"]>("Rác thải");
  const [repTitle, setRepTitle] = useState("");
  const [repLocation, setRepLocation] = useState("");
  const [repDescription, setRepDescription] = useState("");
  const [repAnonymous, setRepAnonymous] = useState(false);
  const [repName, setRepName] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repImages, setRepImages] = useState<string[]>([]);
  const [repConsent, setRepConsent] = useState(false);
  const [repHoneypot, setRepHoneypot] = useState("");
  const [repErrors, setRepErrors] = useState<Record<string, string>>({});
  const [repLoading, setRepLoading] = useState(false);
  const [repSubmittedId, setRepSubmittedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [timemarkData, setTimemarkData] = useState<{
    timemarkHash?: string;
    timemarkVerified?: boolean;
    photoElevation?: string;
    photoDirection?: string;
    photoTakenAt?: string;
    lat?: number;
    lng?: number;
    coordinates?: string;
  } | null>(null);

  // Tra cứu tiến độ hồ sơ phản ánh (Mã PA-... hoặc SĐT)
  const [lookupQuery, setLookupQuery] = useState("");
  const [submittedLookupQuery, setSubmittedLookupQuery] = useState("");

  const lookupResults = useMemo(() => {
    const raw = submittedLookupQuery.trim();
    if (!raw) return null;
    const qLower = raw.toLowerCase();
    const qDigits = raw.replace(/\D/g, "");
    const isPhoneSearch = qDigits.length >= 9 && !qLower.startsWith("pa");

    let localPhoneMap: Record<string, string> = {};
    try {
      const saved = localStorage.getItem("kp3_citizen_report_phones_v1");
      if (saved) localPhoneMap = JSON.parse(saved) || {};
    } catch {}

    return reports.filter((r) => {
      const shortCode = formatShortRecordId(r.id, "PA").toLowerCase();
      const idLower = String(r.id || "").toLowerCase();
      if (idLower === qLower || shortCode === qLower) return true;
      if (qLower.length >= 4 && (idLower.includes(qLower) || shortCode.includes(qLower))) {
        return true;
      }
      if (isPhoneSearch && !r.isAnonymous) {
        const repDigits = String(r.reporterPhone || localPhoneMap[r.id] || "").replace(/\D/g, "");
        if (repDigits && repDigits === qDigits) return true;
      }
      return false;
    });
  }, [reports, submittedLookupQuery]);

  const recentReports = reports.slice(0, 3);

  const handleImageChange = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, 3 - repImages.length);
    if (files.length === 0) {
      setRepErrors(prev => ({ ...prev, image: "Mỗi phản ánh đính kèm tối đa 3 ảnh hiện trường." }));
      return;
    }

    if (files.length > 0) {
      try {
        const ocrResult = await extractTimemarkFromImage(files[0]);
        if (ocrResult) {
          if (!repLocation.trim() && ocrResult.address) {
            setRepLocation(ocrResult.address);
          }
          setTimemarkData({
            timemarkHash: ocrResult.timemarkHash,
            timemarkVerified: ocrResult.isVerified,
            photoElevation: ocrResult.elevation,
            photoDirection: ocrResult.direction,
            photoTakenAt: ocrResult.rawTime || ocrResult.recordedTime,
            lat: ocrResult.lat,
            lng: ocrResult.lng,
            coordinates: ocrResult.coordinates,
          });
          showToast(`Tự động trích xuất Timemark: Tọa độ ${ocrResult.coordinates}`);
        }
      } catch (ocrErr) {
        console.warn("[CitizenReflection] Timemark check skipped:", ocrErr);
      }
    }

    const { urls, errors } = await uploadReportImages(files, "landing");
    if (errors.length > 0) {
      setRepErrors(prev => ({ ...prev, image: errors[0] }));
    } else {
      setRepErrors(prev => {
        const copy = { ...prev };
        delete copy.image;
        return copy;
      });
    }
    if (urls.length > 0) {
      setRepImages(prev => [...prev, ...urls].slice(0, 3));
    }
  };

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      showToast("Thiết bị không hỗ trợ định vị vị trí.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setRepLocation(`Tọa độ [${lat}, ${lng}] — Khu phố 3, An Phú`);
        setRepErrors(prev => {
          const copy = { ...prev };
          delete copy.location;
          return copy;
        });
      },
      () => {
        setLocating(false);
        showToast("Không lấy được toạ độ GPS. Vui lòng nhập địa chỉ.", "error");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const validateReport = (): boolean => {
    const errors: Record<string, string> = {};
    if (!repTitle.trim()) errors.title = "Vui lòng nhập tiêu đề phản ánh.";
    else if (repTitle.trim().length < 6) errors.title = "Tiêu đề cần ít nhất 6 ký tự.";

    if (!repLocation.trim()) errors.location = "Vui lòng nhập vị trí phản ánh.";
    else if (repLocation.trim().length < 4) errors.location = "Địa điểm quá ngắn.";

    if (!repDescription.trim()) errors.description = "Vui lòng mô tả chi tiết sự việc.";
    else if (repDescription.trim().length < 15) errors.description = "Nội dung cần ít nhất 15 ký tự.";

    if (!repAnonymous) {
      if (!repName.trim()) errors.name = "Vui lòng nhập họ tên.";
      if (!repPhone.trim()) errors.phone = "Vui lòng nhập số điện thoại liên hệ.";
      else if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(repPhone.trim().replace(/\s/g, ""))) {
        errors.phone = "Số điện thoại chưa hợp lệ (10 số, bắt đầu bằng 03/05/07/08/09).";
      }
    }

    if (!repConsent) errors.consent = "Bạn cần đồng ý với điều khoản sử dụng thông tin.";

    setRepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (repHoneypot) return;
    if (!validateReport()) return;

    const log = readSubmissionLog();
    const now = new Date();
    if (log.length > 0) {
      const last = log[log.length - 1];
      if (now.getTime() - last < SUBMIT_COOLDOWN_MS) {
        showToast("Bạn vừa gửi phản ánh. Vui lòng chờ 1 phút trước khi gửi tiếp.", "error");
        return;
      }
    }
    if (log.length >= MAX_SUBMISSIONS_PER_DAY) {
      showToast("Bạn đã gửi đủ số lượt phản ánh trong ngày (5 lượt).", "error");
      return;
    }

    setRepLoading(true);
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
    const displayTrackingCode = formatShortRecordId(id, "PA");
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} ${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    const reporterName = repAnonymous ? "Cư dân (Ẩn danh)" : repName.trim();

    const catMeta = getCategoryMeta(repCategory);
    const defaultPriority = catMeta.defaultPriority;
    const newReport: FieldReport = {
      id,
      title: repTitle.trim(),
      category: repCategory,
      priority: defaultPriority,
      slaHours: REPORT_PRIORITY_CONFIG[defaultPriority].slaHours,
      slaDeadline: computeSlaDeadlineIso(defaultPriority, now),
      assignedUnit: catMeta.defaultUnit,
      reporterName,
      reporterPhone: repAnonymous ? "" : repPhone.trim(),
      isAnonymous: repAnonymous,
      reportedAt: timeStr,
      createdAt: now.toLocaleDateString("vi-VN"),
      location: repLocation.trim(),
      coordinates: timemarkData?.coordinates || { x: 50, y: 50 },
      lat: timemarkData?.lat || KP3_CENTER.lat,
      lng: timemarkData?.lng || KP3_CENTER.lng,
      timemarkHash: timemarkData?.timemarkHash,
      timemarkVerified: timemarkData?.timemarkVerified,
      photoElevation: timemarkData?.photoElevation,
      photoDirection: timemarkData?.photoDirection,
      photoTakenAt: timemarkData?.photoTakenAt,
      description: repDescription.trim(),
      status: "Đã tiếp nhận",
      beforeImage: repImages[0] || undefined,
      beforeImages: repImages,
      timeline: [
        {
          time: timeStr,
          title: "Tiếp nhận phản ánh từ Cổng người dân",
          description: `Phản ánh được gửi qua Cổng người dân${repAnonymous ? " (chế độ ẩn danh)" : ""}.`,
          actor: reporterName
        }
      ],
      messages: []
    };

    try {
      onAddReport(newReport);
      localStorage.setItem(RATE_KEY, JSON.stringify([...log, now.getTime()]));
      if (!repAnonymous && repPhone.trim()) {
        try {
          const prevMap = JSON.parse(localStorage.getItem("kp3_citizen_report_phones_v1") || "{}");
          localStorage.setItem(
            "kp3_citizen_report_phones_v1",
            JSON.stringify({ ...prevMap, [id]: repPhone.trim() })
          );
        } catch {}
      }
      setRepSubmittedId(displayTrackingCode);
      setRepTitle("");
      setRepLocation("");
      setRepDescription("");
      setRepImages([]);
      setRepConsent(false);
      showToast(`Đã gửi phản ánh. Mã hồ sơ: ${id}`);
    } catch {
      showToast("Gửi phản ánh không thành công. Vui lòng thử lại.", "error");
    } finally {
      setRepLoading(false);
    }
  };

  return (
    <section id="reflection" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gov-navy border-b border-blue-950 p-5 sm:p-8 text-white">
          <h2 className="text-xl sm:text-2xl font-black">Phản ánh hiện trường</h2>
          <p className="text-sm sm:text-base text-blue-100 mt-1 max-w-2xl">
            Vệ sinh môi trường, lấn chiếm vỉa hè, tiếng ồn, hạ tầng hay an ninh trật tự — phản ánh được chuyển vào hệ thống tiếp nhận của Ban Điều hành Khu phố 3.
          </p>
        </div>

        <div className="p-5 sm:p-8 space-y-8">
          {/* KHỐI TRA CỨU TIẾN ĐỘ HỒ SƠ PHẢN ÁNH 1022 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-gov-navy flex items-center gap-2">
                  <Search size={17} className="text-gov-blue shrink-0" aria-hidden="true" />
                  <span>Tra cứu Tiến độ Hồ sơ Phản ánh</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Nhập mã hồ sơ (VD: <span className="font-mono font-semibold">PA-839201</span>) hoặc Số điện thoại đã gửi để theo dõi kết quả xử lý
                </p>
              </div>
              {submittedLookupQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLookupQuery("");
                    setSubmittedLookupQuery("");
                  }}
                  className="self-start sm:self-auto text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer"
                >
                  Đóng kết quả tra cứu
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedLookupQuery(lookupQuery.trim());
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <label htmlFor="citizen-report-lookup-input" className="sr-only">
                Nhập mã PA-... hoặc Số điện thoại để tra cứu tiến độ phản ánh
              </label>
              <input
                id="citizen-report-lookup-input"
                type="search"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Nhập mã PA-... hoặc Số điện thoại liên hệ..."
                className={`${inputCls} flex-1`}
              />
              <button
                type="submit"
                disabled={!lookupQuery.trim()}
                className={`${btnPrimary} shrink-0`}
              >
                <Search size={16} aria-hidden="true" />
                <span>Tra cứu hồ sơ</span>
              </button>
            </form>

            {lookupResults !== null && (
              <div className="pt-2 space-y-3" aria-live="polite">
                {lookupResults.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white border border-amber-200 text-xs sm:text-sm text-amber-900">
                    Không tìm thấy hồ sơ phản ánh khớp với <strong>&quot;{submittedLookupQuery}&quot;</strong>. Vui lòng kiểm tra lại mã <span className="font-mono">PA-...</span> hoặc số điện thoại.
                  </div>
                ) : (
                  lookupResults.map((item) => {
                    // Bảo mật tuyệt đối: Ẩn toàn bộ ghi chú trao đổi nội bộ của cán bộ (isInternal === true)
                    const publicMessages = (item.messages || []).filter((m) => !m.isInternal);
                    const shortCode = formatShortRecordId(item.id, "PA");
                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 space-y-3.5 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-900">
                              {shortCode}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-gov-navy">
                              {item.category}
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              item.status === "Đã giải quyết"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.status === "Đang xử lý"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} className="text-rose-600 shrink-0" aria-hidden="true" />
                              {item.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={13} className="text-slate-500 shrink-0" aria-hidden="true" />
                              Tiếp nhận: {item.reportedAt}
                            </span>
                            {item.assignedUnit && (
                              <span className="font-medium text-emerald-800">
                                Đơn vị xử lý: {item.assignedUnit}
                              </span>
                            )}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-700 pt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {item.timeline && item.timeline.length > 0 && (
                          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Tiến trình giải quyết ({item.timeline.length} bước)
                            </p>
                            <ol className="space-y-2 text-xs">
                              {item.timeline.map((step, sIdx) => (
                                <li key={`${item.id}-tl-${sIdx}`} className="flex items-start gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" aria-hidden="true" />
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900">{step.title}</span>{" "}
                                    <span className="font-mono text-slate-500">({step.time})</span>
                                    <p className="text-slate-600 mt-0.5">{step.description}</p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {publicMessages.length > 0 && (
                          <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/80 p-3.5 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                              <MessageSquare size={13} className="text-emerald-700" aria-hidden="true" />
                              <span>Phản hồi chính thức từ Ban Điều hành ({publicMessages.length})</span>
                            </p>
                            <div className="space-y-2">
                              {publicMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className="p-2.5 rounded-lg bg-white border border-emerald-100 text-xs space-y-1"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span className="font-bold text-slate-900">
                                      {msg.senderName}
                                      {msg.senderTitle ? ` (${msg.senderTitle})` : ""}
                                    </span>
                                    <span className="font-mono text-slate-500">{msg.createdAt}</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed">{msg.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {repSubmittedId ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3" role="status" aria-live="polite">
              <CheckCircle2 size={40} className="mx-auto text-emerald-600" aria-hidden="true" />
              <h3 className="text-lg font-bold text-emerald-900">Đã gửi phản ánh thành công</h3>
              <p className="text-sm text-slate-600">Vui lòng lưu mã hồ sơ để tra cứu khi cần:</p>
              <p className="inline-block px-4 py-2 rounded-xl bg-white border border-emerald-300 font-mono font-bold text-emerald-800">
                {repSubmittedId}
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setLookupQuery(repSubmittedId);
                    setSubmittedLookupQuery(repSubmittedId);
                  }}
                  className={btnGhost}
                >
                  <Search size={16} aria-hidden="true" /> Tra cứu hồ sơ này
                </button>
                <button type="button" onClick={() => setRepSubmittedId(null)} className={btnPrimary}>
                  Gửi phản ánh khác
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} noValidate className="space-y-6">
              {/* honeypot */}
              <input
                id="rep-honeypot"
                name="honeypot"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={repHoneypot}
                onChange={e => setRepHoneypot(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              <fieldset>
                <legend className="text-sm font-bold text-gov-text mb-2">
                  1. Nhóm vấn đề <span className="text-gov-danger">*</span>
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                  {REPORT_CATEGORIES.map((c, idx) => {
                    const spanCls =
                      idx < 3
                        ? "col-span-1 sm:col-span-2 lg:col-span-1"
                        : idx === 3
                        ? "col-span-1 sm:col-span-3 lg:col-span-1"
                        : "col-span-2 sm:col-span-3 lg:col-span-1";
                    return (
                      <label
                        key={c.id}
                        className={`${spanCls} min-h-12 flex items-center justify-center text-center px-3 rounded-xl border text-sm font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gov-blue ${
                          repCategory === c.id
                            ? "bg-gov-navy text-white border-gov-navy"
                            : "bg-white text-slate-700 border-slate-300 hover:border-gov-blue"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rep-category"
                          value={c.id}
                          checked={repCategory === c.id}
                          onChange={() => setRepCategory(c.id)}
                          className="sr-only"
                        />
                        {c.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="rep-title" className="text-sm font-bold block">
                    2. Tiêu đề <span className="text-gov-danger">*</span>
                  </label>
                  <input
                    id="rep-title"
                    name="title"
                    value={repTitle}
                    onChange={e => setRepTitle(e.target.value)}
                    maxLength={150}
                    enterKeyHint="next"
                    aria-invalid={!!repErrors.title}
                    aria-describedby={repErrors.title ? "rep-title-err" : undefined}
                    className={inputCls}
                    placeholder="VD: Rác tồn đọng đầu hẻm chưa thu gom"
                  />
                  {repErrors.title && <p id="rep-title-err" role="alert" className="text-xs text-gov-danger">{repErrors.title}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="rep-location" className="text-sm font-bold block">
                    3. Vị trí <span className="text-gov-danger">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="rep-location"
                      name="location"
                      value={repLocation}
                      onChange={e => setRepLocation(e.target.value)}
                      enterKeyHint="next"
                      aria-invalid={!!repErrors.location}
                      aria-describedby={repErrors.location ? "rep-location-err" : undefined}
                      className={inputCls}
                      placeholder="Số nhà, hẻm, tuyến đường"
                    />
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      className={`${btnGhost} shrink-0 px-3`}
                      aria-label="Dùng vị trí hiện tại"
                      title="Dùng vị trí hiện tại"
                    >
                      <LocateFixed size={18} />
                    </button>
                  </div>
                  {repErrors.location && <p id="rep-location-err" role="alert" className="text-xs text-gov-danger">{repErrors.location}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="rep-desc" className="text-sm font-bold block">
                  4. Nội dung phản ánh <span className="text-gov-danger">*</span>
                </label>
                <textarea
                  id="rep-desc"
                  name="description"
                  rows={4}
                  value={repDescription}
                  onChange={e => setRepDescription(e.target.value)}
                  maxLength={2000}
                  aria-invalid={!!repErrors.description}
                  aria-describedby={repErrors.description ? "rep-desc-err rep-desc-count" : "rep-desc-count"}
                  className={`${inputCls} py-3`}
                  placeholder="Mô tả thời điểm, mức độ ảnh hưởng…"
                />
                <div className="flex justify-between text-xs">
                  <span id="rep-desc-err" role={repErrors.description ? "alert" : undefined} className="text-gov-danger">{repErrors.description}</span>
                  <span id="rep-desc-count" className="text-slate-600">{repDescription.length}/2000</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-bold block">5. Ảnh hiện trường (tuỳ chọn · JPG/PNG/WebP · tối đa 3 ảnh)</span>
                <div className="flex flex-wrap items-center gap-3">
                  {repImages.length < 3 && (
                    <label htmlFor="rep-image-file" className={`${btnGhost} border-dashed cursor-pointer`}>
                      <Camera size={18} aria-hidden="true" /> Chọn / chụp ảnh ({repImages.length}/3)
                      <input
                        id="rep-image-file"
                        name="repImageFile"
                        type="file"
                        accept={ALLOWED_IMAGE_TYPES.join(",")}
                        multiple
                        capture="environment"
                        className="sr-only"
                        aria-label="Chọn hoặc chụp ảnh hiện trường"
                        onChange={e => {
                          handleImageChange(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  )}
                  {repImages.map((imgUrl, idx) => (
                    <div key={`rep-img-${idx}`} className="flex items-center gap-2 p-1.5 bg-gov-light rounded-xl border border-slate-200">
                      <img src={imgUrl} alt={`Ảnh hiện trường đã chọn ${idx + 1}`} className="w-12 h-12 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setRepImages(prev => prev.filter((_, i) => i !== idx))}
                        className="min-w-11 min-h-11 flex items-center justify-center text-slate-600 hover:text-gov-danger cursor-pointer"
                        aria-label={`Xoá ảnh ${idx + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {repErrors.image && <p className="text-xs text-gov-danger">{repErrors.image}</p>}
              </div>

              <fieldset className="p-4 rounded-2xl bg-gov-light border border-slate-200 space-y-3">
                <legend className="text-sm font-bold px-1">6. Chế độ gửi</legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { v: false, t: "Có thông tin liên hệ", d: "Cán bộ có thể liên hệ xác minh và báo kết quả." },
                    { v: true, t: "Ẩn danh", d: "Không lưu họ tên, số điện thoại. Không nhận được phản hồi." }
                  ].map(o => (
                    <label
                      key={String(o.v)}
                      className={`p-3 rounded-xl border cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gov-blue ${
                        repAnonymous === o.v ? "border-gov-blue bg-white" : "border-slate-200 bg-white/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rep-mode"
                        checked={repAnonymous === o.v}
                        onChange={() => setRepAnonymous(o.v)}
                        className="sr-only"
                      />
                      <span className="font-semibold text-sm block">{o.t}</span>
                      <span className="text-xs text-slate-500">{o.d}</span>
                    </label>
                  ))}
                </div>
                {!repAnonymous && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rep-name" className="sr-only">Họ và tên</label>
                      <input
                        id="rep-name"
                        value={repName}
                        onChange={e => setRepName(e.target.value)}
                        autoComplete="name"
                        aria-invalid={!!repErrors.name}
                        placeholder="Họ và tên *"
                        className={inputCls}
                      />
                      {repErrors.name && <p className="text-xs text-gov-danger mt-1">{repErrors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="rep-phone" className="sr-only">Số điện thoại</label>
                      <input
                        id="rep-phone"
                        type="tel"
                        inputMode="numeric"
                        value={repPhone}
                        onChange={e => setRepPhone(e.target.value)}
                        autoComplete="tel"
                        aria-invalid={!!repErrors.phone}
                        placeholder="Số điện thoại *"
                        className={inputCls}
                      />
                      {repErrors.phone && <p className="text-xs text-gov-danger mt-1">{repErrors.phone}</p>}
                    </div>
                  </div>
                )}
              </fieldset>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2">
                <p className="text-sm font-bold text-gov-navy flex items-center gap-2">
                  <Shield size={16} aria-hidden="true" /> Thông tin về quyền riêng tư
                </p>
                <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                  <li>Thông tin chỉ dùng để tiếp nhận, xác minh và xử lý phản ánh này.</li>
                  <li>Chỉ cán bộ có thẩm quyền trong hệ thống được xem họ tên, số điện thoại.</li>
                  <li>Không chụp rõ mặt người khác hoặc giấy tờ cá nhân trong ảnh gửi kèm.</li>
                </ul>
                <label className="flex items-start gap-2 pt-1 text-sm cursor-pointer min-h-11">
                  <input
                    id="rep-consent"
                    name="repConsent"
                    type="checkbox"
                    checked={repConsent}
                    onChange={e => setRepConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-gov-blue"
                    aria-invalid={!!repErrors.consent}
                    aria-label="Tôi đã đọc và đồng ý với điều khoản sử dụng thông tin phản ánh"
                  />
                  <span>
                    Tôi đã đọc và đồng ý với cách sử dụng thông tin nêu trên. <span className="text-gov-danger">*</span>
                  </span>
                </label>
                {repErrors.consent && <p className="text-xs text-gov-danger">{repErrors.consent}</p>}
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={repLoading} className={btnPrimary}>
                  <Send size={16} aria-hidden="true" /> {repLoading ? "Đang gửi…" : "Gửi phản ánh"}
                </button>
              </div>
            </form>
          )}

          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-gov-text">Phản ánh gần đây trong hệ thống</h3>
            {recentReports.length === 0 ? (
              <EmptyState icon={<Inbox size={22} />} title="Chưa có phản ánh" description="Các phản ánh đã tiếp nhận sẽ hiển thị tại đây." />
            ) : (
              <ul className="grid md:grid-cols-3 gap-3">
                {recentReports.map(r => (
                  <li key={r.id} className="p-4 rounded-2xl bg-gov-light border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gov-navy bg-blue-100 px-2 py-0.5 rounded">{r.category}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === "Đã giải quyết" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm line-clamp-1">{r.title}</p>
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin size={12} aria-hidden="true" /> <span className="truncate">{r.location}</span>
                    </p>
                    <p className="text-xs text-slate-600">{r.reportedAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
