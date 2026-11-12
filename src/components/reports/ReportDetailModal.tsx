import React, { useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  RotateCcw,
  Send,
  Star,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  FieldReport,
  ReportMessage,
  ReportPriority,
  TargetGisItem,
} from "../../types";
import {
  CANBO_QUICK_REPLIES,
  CITIZEN_QUICK_REPLIES,
  KP3_TEAMS,
  REPORT_PRIORITY_CONFIG,
  formatNowVNString,
  getAfterImages,
  getBeforeImages,
  getCategoryMeta,
  getSlaStatus,
  maskPhoneForCitizen,
  reportToTargetGisItem,
} from "../../data/reportConfig";
import { uploadReportImages } from "../../utils/imageUpload";
import { DetailRow } from "../common/DetailRow";
import { Button, Modal, StatusBadge } from "../ui";
import { ReportSelect } from "./ReportSelect";
import { mapReportStatusToBadge } from "./ReportCard";
import { LightboxImageItem, ReportImage } from "./ImageLightboxModal";

export interface ReportDetailModalProps {
  report: FieldReport | null;
  readOnly: boolean;
  currentActorName: string;
  currentActorTitle: string;
  onClose: () => void;
  onOpenLightbox: (items: LightboxImageItem[], startIndex: number) => void;
  onAddMessage: (reportId: string, msg: ReportMessage) => void;
  onAppendEvidencePhotos: (
    reportId: string,
    stage: "before" | "after",
    urls: string[]
  ) => void;
  onAssignOrChangePriority: (
    reportId: string,
    updates: { assignedUnit?: string; priority?: ReportPriority }
  ) => void;
  onStartProcess: (report: FieldReport) => void;
  onOpenResolve: (report: FieldReport) => void;
  onOpenEdit: (report: FieldReport) => void;
  onOpenDelete: (report: FieldReport) => void;
  onReopenReport: (reportId: string, reason: string) => void;
  onSubmitFeedback: (reportId: string, rating: number, comment: string) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
  onCreateTask?: (report: FieldReport) => void;
}

export function ReportDetailModal({
  report,
  readOnly,
  currentActorName,
  currentActorTitle,
  onClose,
  onOpenLightbox,
  onAddMessage,
  onAppendEvidencePhotos,
  onAssignOrChangePriority,
  onStartProcess,
  onOpenResolve,
  onOpenEdit,
  onOpenDelete,
  onReopenReport,
  onSubmitFeedback,
  onNavigateToGis,
  onCreateTask,
}: ReportDetailModalProps) {
  const [chatChannel, setChatChannel] = useState<"public" | "internal">("public");
  const [msgText, setMsgText] = useState("");
  const [msgImages, setMsgImages] = useState<string[]>([]);
  const [isUploadingMsgImg, setIsUploadingMsgImg] = useState(false);
  const [isUploadingStageImg, setIsUploadingStageImg] = useState(false);
  const [photoViewMode, setPhotoViewMode] = useState<"compare" | "before" | "after">("compare");
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [showReopenBox, setShowReopenBox] = useState(false);

  useEffect(() => {
    if (!report) return;
    setChatChannel("public");
    setMsgText("");
    setMsgImages([]);
    setShowReopenBox(false);
    setReopenReason("");
    setRatingScore(5);
    setRatingComment("");
    const afterImgs = getAfterImages(report);
    const beforeImgs = getBeforeImages(report);
    if (beforeImgs.length > 0 && afterImgs.length > 0) {
      setPhotoViewMode("compare");
    } else if (afterImgs.length > 0) {
      setPhotoViewMode("after");
    } else {
      setPhotoViewMode("before");
    }
  }, [report?.id]);

  if (!report) return null;

  const beforeImgs = getBeforeImages(report);
  const afterImgs = getAfterImages(report);
  const catMeta = getCategoryMeta(report.category);
  const statusInfo = mapReportStatusToBadge(report.status);
  const priority: ReportPriority = report.priority || "Bình thường";
  const prioMeta = REPORT_PRIORITY_CONFIG[priority];
  const sla = getSlaStatus(report);

  const allGalleryItems: LightboxImageItem[] = [
    ...beforeImgs.map((url, idx) => ({
      url,
      caption: `${report.title} — Hiện trạng (${idx + 1}/${beforeImgs.length})`,
      stageLabel: "Trước xử lý",
    })),
    ...afterImgs.map((url, idx) => ({
      url,
      caption: `${report.title} — Kết quả (${idx + 1}/${afterImgs.length})`,
      stageLabel: "Sau xử lý",
    })),
  ];

  const publicMessages = (report.messages || []).filter((m) => !m.isInternal);
  const internalMessages = (report.messages || []).filter((m) => Boolean(m.isInternal));
  const displayedMessages =
    !readOnly && chatChannel === "internal" ? internalMessages : publicMessages;

  const handleAttachMessagePhotos = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = 3 - msgImages.length;
    if (remaining <= 0) return;
    setIsUploadingMsgImg(true);
    try {
      const files = Array.from(fileList).slice(0, remaining);
      const { urls } = await uploadReportImages(files, "chat");
      if (urls.length > 0) {
        setMsgImages((prev) => [...prev, ...urls].slice(0, 3));
      }
    } finally {
      setIsUploadingMsgImg(false);
    }
  };

  const handleAppendStagePhotos = async (
    stage: "before" | "after",
    fileList: FileList | null
  ) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploadingStageImg(true);
    try {
      const files = Array.from(fileList).slice(0, 4);
      const { urls } = await uploadReportImages(files, stage);
      if (urls.length > 0) {
        onAppendEvidencePhotos(report.id, stage, urls);
      }
    } finally {
      setIsUploadingStageImg(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!msgText.trim() && msgImages.length === 0) return;
    const newMsg: ReportMessage = {
      id: `MSG-${Date.now()}`,
      senderRole: readOnly ? "citizen" : "canbo",
      senderName: currentActorName || (readOnly ? "Cư dân KP3" : "Cán bộ KP3"),
      senderTitle: currentActorTitle || (readOnly ? "Cư dân" : "Ban Điều hành KP3"),
      content: msgText.trim() || "(Đã gửi hình ảnh minh chứng bổ sung)",
      images: msgImages.length > 0 ? msgImages : undefined,
      createdAt: formatNowVNString(),
      isInternal: !readOnly && chatChannel === "internal",
    };
    onAddMessage(report.id, newMsg);
    setMsgText("");
    setMsgImages([]);
  };

  const quickReplies = readOnly ? CITIZEN_QUICK_REPLIES : CANBO_QUICK_REPLIES;

  return (
    <Modal
      isOpen={Boolean(report)}
      onClose={onClose}
      size="5xl"
      title={`Hồ sơ phản ánh ${report.id}`}
      description={`${report.location} • Gửi lúc ${report.reportedAt}`}
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToGis && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<MapPin size={14} className="text-emerald-700" />}
                onClick={() => {
                  onNavigateToGis(reportToTargetGisItem(report));
                  onClose();
                }}
              >
                Định vị trên Bản đồ GIS
              </Button>
            )}
            {!readOnly && onCreateTask && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<CheckSquare size={14} className="text-indigo-700" />}
                onClick={() => {
                  onCreateTask(report);
                  onClose();
                }}
              >
                Giao việc
              </Button>
            )}
            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit2 size={14} />}
                  onClick={() => {
                    onClose();
                    onOpenEdit(report);
                  }}
                >
                  Chỉnh sửa
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => {
                    onClose();
                    onOpenDelete(report);
                  }}
                >
                  Xóa hồ sơ
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && report.status === "Đã tiếp nhận" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onStartProcess(report)}
              >
                Tiếp nhận &amp; Giao xử lý
              </Button>
            )}
            {!readOnly && report.status === "Đang xử lý" && (
              <Button
                type="button"
                variant="emerald"
                size="sm"
                leftIcon={<CheckCircle2 size={14} />}
                onClick={() => {
                  onClose();
                  onOpenResolve(report);
                }}
              >
                Hoàn tất &amp; Đính kèm ảnh Sau
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Metadata & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
              >
                {report.category}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${prioMeta.bg} ${prioMeta.text} ${prioMeta.border}`}
              >
                {prioMeta.label} ({prioMeta.shortSla})
              </span>
              <StatusBadge status={statusInfo.type} label={statusInfo.label} size="sm" />
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  sla.state === "overdue"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : sla.state === "warning"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : sla.state === "completed"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <Clock size={12} aria-hidden="true" />
                {sla.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {report.title}
            </h3>
          </div>
        </div>

        {/* Main 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Evidence Gallery + Details + Timeline */}
          <div className="lg:col-span-6 space-y-4">
            {/* Multi-Image Before/After Showcase */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Camera size={15} className="text-emerald-700" aria-hidden="true" />
                  <span className="text-xs font-bold text-slate-800">
                    Ảnh minh chứng ({beforeImgs.length} Trước / {afterImgs.length} Sau)
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  {[
                    { id: "compare" as const, label: "Đối chiếu" },
                    { id: "before" as const, label: `Trước (${beforeImgs.length})` },
                    { id: "after" as const, label: `Sau (${afterImgs.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPhotoViewMode(tab.id)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        photoViewMode === tab.id
                          ? "bg-emerald-700 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 space-y-3">
                {beforeImgs.length === 0 && afterImgs.length === 0 ? (
                  <div className="py-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-600">
                    Chưa có hình ảnh đính kèm cho phản ánh này.
                  </div>
                ) : photoViewMode === "compare" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Hiện trạng ban đầu
                      </span>
                      {beforeImgs[0] ? (
                        <button
                          type="button"
                          onClick={() => onOpenLightbox(allGalleryItems, 0)}
                          className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group block"
                        >
                          <ReportImage
                            src={beforeImgs[0]}
                            alt="Hiện trạng ban đầu"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/85 text-white text-[11px] font-semibold">
                            Phóng to
                          </span>
                        </button>
                      ) : (
                        <div className="h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-600">
                          Chưa có ảnh Trước
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-emerald-800 block">
                        Kết quả sau xử lý
                      </span>
                      {afterImgs[0] ? (
                        <button
                          type="button"
                          onClick={() => onOpenLightbox(allGalleryItems, beforeImgs.length)}
                          className="relative w-full h-40 rounded-lg overflow-hidden border border-emerald-200 cursor-pointer group block"
                        >
                          <ReportImage
                            src={afterImgs[0]}
                            alt="Kết quả sau xử lý"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-800 text-white text-[11px] font-semibold">
                            Đã nghiệm thu
                          </span>
                        </button>
                      ) : (
                        <div className="h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-600 px-3 text-center">
                          Đang chờ cập nhật ảnh sau khi hoàn tất
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(photoViewMode === "before" ? beforeImgs : afterImgs).map((url, idx) => {
                      const globalIdx =
                        photoViewMode === "before" ? idx : beforeImgs.length + idx;
                      return (
                        <button
                          key={`${url.slice(0, 20)}-${idx}`}
                          type="button"
                          onClick={() => onOpenLightbox(allGalleryItems, globalIdx)}
                          className="h-28 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group"
                        >
                          <ReportImage
                            src={url}
                            alt={`Ảnh ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {!readOnly && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-600">
                      Cán bộ bổ sung ảnh kiểm tra hiện trường:
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                        {isUploadingStageImg ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ImagePlus size={13} />
                        )}
                        <span>+ Ảnh hiện trường</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            handleAppendStagePhotos("before", e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Metadata Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Thông tin chi tiết
              </div>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {report.description}
              </p>
              <dl className="@container divide-y divide-slate-100">
                <DetailRow label="Người phản ánh" value={report.reporterName} />
                <DetailRow
                  label="Điện thoại liên hệ"
                  value={maskPhoneForCitizen(report.reporterPhone, readOnly)}
                  isMono
                />
                <DetailRow label="Địa điểm sự cố" value={report.location} />
                <DetailRow
                  label="Đơn vị phụ trách"
                  value={report.assignedUnit || "Ban Điều hành KP3"}
                />
                <DetailRow
                  label="Hạn xử lý (SLA)"
                  value={`${sla.deadlineLabel} (${sla.label})`}
                />
              </dl>

              {/* Officer Assignment & Priority Switch */}
              {!readOnly && (
                <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ReportSelect
                    label="Phân công tổ phụ trách"
                    value={report.assignedUnit || KP3_TEAMS[0]}
                    onChange={(unit) =>
                      onAssignOrChangePriority(report.id, { assignedUnit: unit })
                    }
                    options={KP3_TEAMS.map((t) => ({ value: t, label: t }))}
                  />
                  <ReportSelect
                    label="Mức ưu tiên xử lý"
                    value={priority}
                    onChange={(p) =>
                      onAssignOrChangePriority(report.id, {
                        priority: p as ReportPriority,
                      })
                    }
                    options={(Object.keys(REPORT_PRIORITY_CONFIG) as ReportPriority[]).map(
                      (p) => ({
                        value: p,
                        label: `${REPORT_PRIORITY_CONFIG[p].label} (${REPORT_PRIORITY_CONFIG[p].shortSla})`,
                      })
                    )}
                  />
                </div>
              )}
            </div>

            {/* Process Timeline */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Nhật ký xử lý ({report.timeline.length} bước)
              </div>
              <ol className="space-y-3 border-l-2 border-emerald-200 ml-2 pl-4">
                {report.timeline.map((step, idx) => (
                  <li key={`${step.time}-${idx}`} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        idx === report.timeline.length - 1
                          ? "bg-emerald-600"
                          : "bg-slate-400"
                      }`}
                    />
                    <div className="text-xs font-mono text-slate-600">{step.time}</div>
                    <div className="text-sm font-bold text-slate-900">{step.title}</div>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                    <div className="text-xs font-medium text-emerald-800 mt-0.5">
                      Thực hiện: {step.actor}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* RIGHT COLUMN: Two-Way Citizen <-> Officer Communication */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
              {/* Header + Channel Switch */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-700" aria-hidden="true" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Trao đổi 2 chiều Cư dân ↔ Cán bộ
                    </h4>
                    <p className="text-xs text-slate-600">
                      Hỏi đáp hiện trường và gửi bổ sung hình ảnh trực tiếp
                    </p>
                  </div>
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setChatChannel("public")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        chatChannel === "public"
                          ? "bg-emerald-700 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Với cư dân ({publicMessages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatChannel("internal")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        chatChannel === "internal"
                          ? "bg-amber-700 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Lock size={11} aria-hidden="true" />
                      Nội bộ ({internalMessages.length})
                    </button>
                  </div>
                )}
              </div>

              {!readOnly && chatChannel === "internal" && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                  <Lock size={13} className="shrink-0" aria-hidden="true" />
                  <span>
                    Ghi chú nội bộ chỉ hiển thị với Cán bộ Ban Điều hành &amp; Tổ công tác KP3 (ẩn với Cư dân).
                  </span>
                </div>
              )}

              {/* Messages Feed */}
              <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto evon-scroll bg-slate-50/40">
                {displayedMessages.length === 0 ? (
                  <div className="py-10 text-center space-y-1.5">
                    <MessageSquare
                      size={24}
                      className="mx-auto text-slate-400"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold text-slate-700">
                      {chatChannel === "internal"
                        ? "Chưa có ghi chú nội bộ giữa các cán bộ."
                        : "Chưa có tin nhắn trao đổi trực tiếp."}
                    </p>
                    <p className="text-xs text-slate-600">
                      {readOnly
                        ? "Anh/chị có thể nhắn thêm thông tin hoặc gửi bổ sung ảnh cho cán bộ tại đây."
                        : "Nhắn hỏi cư dân vị trí cụ thể hoặc cập nhật tiến độ xử lý."}
                    </p>
                  </div>
                ) : (
                  displayedMessages.map((msg) => {
                    const isOfficer = msg.senderRole === "canbo";
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl p-3 border text-sm space-y-1.5 ${
                          msg.isInternal
                            ? "bg-amber-50 border-amber-200"
                            : isOfficer
                            ? "bg-emerald-50/80 border-emerald-200"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <UserCheck
                              size={13}
                              className={isOfficer ? "text-emerald-700" : "text-slate-600"}
                              aria-hidden="true"
                            />
                            <span>{msg.senderName}</span>
                            {msg.senderTitle && (
                              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-700">
                                {msg.senderTitle}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-slate-600">
                            {msg.createdAt}
                          </span>
                        </div>

                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </p>

                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.images.map((imgUrl, idx) => (
                              <button
                                key={`${msg.id}-img-${idx}`}
                                type="button"
                                onClick={() =>
                                  onOpenLightbox(
                                    msg.images!.map((u, i) => ({
                                      url: u,
                                      caption: `Ảnh trao đổi bởi ${msg.senderName} (${i + 1}/${
                                        msg.images!.length
                                      })`,
                                      stageLabel: "Hội thoại",
                                    })),
                                    idx
                                  )
                                }
                                className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                              >
                                <ReportImage
                                  src={imgUrl}
                                  alt={`Ảnh đính kèm tin nhắn ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Reply Chips */}
              <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex flex-wrap gap-1.5">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setMsgText(reply)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs text-slate-700 font-medium cursor-pointer transition-colors text-left"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5"
              >
                {msgImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msgImages.map((u, idx) => (
                      <div
                        key={`compose-img-${idx}`}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 bg-white"
                      >
                        <ReportImage
                          src={u}
                          alt={`Ảnh chuẩn bị gửi ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setMsgImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/80 text-white cursor-pointer"
                          aria-label="Xóa ảnh đính kèm"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <label
                    className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                    title="Đính kèm tối đa 3 ảnh"
                  >
                    {isUploadingMsgImg ? (
                      <Loader2 size={16} className="animate-spin text-emerald-700" />
                    ) : (
                      <ImagePlus size={16} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="sr-only"
                      aria-label="Đính kèm ảnh vào tin nhắn"
                      onChange={(e) => {
                        handleAttachMessagePhotos(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder={
                      !readOnly && chatChannel === "internal"
                        ? "Nhập ghi chú phối hợp nội bộ tổ công tác..."
                        : "Nhập nội dung trao đổi hoặc hướng dẫn..."
                    }
                    className="flex-1 h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />

                  <Button
                    type="submit"
                    variant="emerald"
                    size="md"
                    disabled={!msgText.trim() && msgImages.length === 0}
                    leftIcon={<Send size={14} />}
                  >
                    Gửi
                  </Button>
                </div>
              </form>
            </div>

            {/* Citizen Feedback / Reopen Box when Resolved */}
            {report.status === "Đã giải quyết" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Xác nhận &amp; Đánh giá kết quả xử lý
                  </h4>
                  {report.citizenFeedback && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-xs font-bold text-emerald-800">
                      <Star size={12} className="fill-amber-400 text-amber-500" />
                      {report.citizenFeedback.rating}/5
                    </span>
                  )}
                </div>

                {report.citizenFeedback ? (
                  <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1">
                    <div className="font-semibold text-slate-900">
                      Cư dân đã xác nhận hài lòng ({report.citizenFeedback.submittedAt})
                    </div>
                    {report.citizenFeedback.comment && (
                      <p className="italic">&ldquo;{report.citizenFeedback.comment}&rdquo;</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingScore(star)}
                          className="p-1 cursor-pointer"
                          aria-label={`Đánh giá ${star} sao`}
                        >
                          <Star
                            size={18}
                            className={
                              star <= ratingScore
                                ? "fill-amber-400 text-amber-500"
                                : "text-slate-300"
                            }
                          />
                        </button>
                      ))}
                      <span className="text-xs text-slate-700 font-medium ml-1">
                        {ratingScore} sao
                      </span>
                    </div>

                    <input
                      type="text"
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Nhận xét về chất lượng xử lý của tổ công tác..."
                      className="w-full h-9 px-3 bg-white text-slate-900 text-xs rounded-lg border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="emerald"
                        size="sm"
                        leftIcon={<CheckCircle2 size={14} />}
                        onClick={() => onSubmitFeedback(report.id, ratingScore, ratingComment)}
                      >
                        Xác nhận đã xử lý tốt
                      </Button>

                      <button
                        type="button"
                        onClick={() => setShowReopenBox((s) => !s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        Chưa dứt điểm? Đề nghị kiểm tra lại
                      </button>
                    </div>

                    {showReopenBox && (
                      <div className="pt-2 border-t border-emerald-200 space-y-2">
                        <input
                          type="text"
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="Nêu lý do chưa triệt để để cán bộ mở lại hồ sơ..."
                          className="w-full h-9 px-3 bg-white text-slate-900 text-xs rounded-lg border border-rose-300 placeholder:text-slate-500 focus:outline-none focus:border-rose-600"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={!reopenReason.trim()}
                          onClick={() => onReopenReport(report.id, reopenReason.trim())}
                        >
                          Gửi yêu cầu mở lại xử lý
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

