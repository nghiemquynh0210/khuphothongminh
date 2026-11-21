import React, { useEffect, useMemo, useState } from "react";
import { Edit2, History, Plus, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { Association, ScheduleEvent, TaskAttachment } from "../../types";
import { getStoredAssociations } from "../../data/associationsData";
import { extractKeyLeadersSummary } from "../../utils/leadershipSync";
import { SCHEDULE_TYPES } from "./tasksData";
import { getScheduleTypeBadge } from "./taskBadges";
import { AttachmentGallery } from "./AttachmentGallery";
import { AttachmentPreviewModal } from "./TaskModals";
import { Button, Input, Modal, ReportSelect } from "../ui";
import { DetailRow } from "../common/DetailRow";

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sch: ScheduleEvent) => void;
  existingCount: number;
  editingSchedule?: ScheduleEvent | null;
  associationsList?: Association[];
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingCount,
  editingSchedule = null,
  associationsList,
}) => {
  const hostOptions = useMemo(() => {
    const assocs =
      associationsList && associationsList.length > 0
        ? associationsList
        : getStoredAssociations();
    const kl = extractKeyLeadersSummary(assocs);
    const items: Array<{ value: string; label: string; description?: string }> = [];
    const seenValues = new Set<string>();

    const pushHost = (name: string, roleLabel: string, prefix = "Đ/c ") => {
      if (!name || name === "Chưa phân công") return;
      const fullVal = `${prefix}${name} - ${roleLabel}`.trim();
      if (seenValues.has(fullVal.toLowerCase())) return;
      seenValues.add(fullVal.toLowerCase());
      items.push({
        value: fullVal,
        label: `${prefix}${name}`.trim(),
        description: roleLabel,
      });
    };

    pushHost(kl.partySecretary.name, "Bí thư Chi bộ KP3");
    pushHost(kl.neighborhoodHead.name, "Trưởng Ban điều hành KP3");
    if (kl.deputyPartySecretary) {
      pushHost(kl.deputyPartySecretary.name, "Phó Bí thư Chi bộ KP3");
    }
    if (kl.deputyNeighborhoodHead) {
      pushHost(kl.deputyNeighborhoodHead.name, "Phó Trưởng BĐH KP3");
    }
    if (kl.frontHead) {
      pushHost(kl.frontHead.name, "Trưởng Ban CTMT KP3");
    }
    pushHost(kl.policeOfficer.name, "Công an khu vực KP3", "");

    // Bổ sung tự động Trưởng các Chi hội & Đoàn thể khác từ Quản lý Chi hội
    for (const assoc of assocs) {
      if (["ASC_DANG", "ASC_BDH", "ASC_MT"].includes(assoc.id)) continue;
      if (assoc.leaderName && assoc.leaderName !== "Chưa phân công") {
        const headMem = assoc.members?.find(
          (m) => m.fullName.toLowerCase() === assoc.leaderName.toLowerCase()
        );
        const roleDesc = headMem?.role
          ? `${headMem.role} (${assoc.name})`
          : `Trưởng ${assoc.name}`;
        pushHost(assoc.leaderName, roleDesc);
      }
    }

    items.push({
      value: "Thường trực Đảng ủy Phường An Phú",
      label: "Thường trực Đảng ủy Phường An Phú",
      description: "Cấp trên chủ trì",
    });
    items.push({
      value: "Lãnh đạo HĐND - UBND Phường An Phú",
      label: "Lãnh đạo HĐND - UBND Phường An Phú",
      description: "Cấp trên chủ trì",
    });

    return items;
  }, [associationsList]);

  const dynamicHosts = useMemo(() => hostOptions.map((o) => o.value), [hostOptions]);

  const todayIso = () => new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [type, setType] = useState<string>("Họp Ban Điều hành KP3");
  const [customType, setCustomType] = useState("");
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState("08:30 - 10:30");
  const [location, setLocation] = useState("Văn phòng Ban Điều hành KP3");
  const [host, setHost] = useState(dynamicHosts[0]);
  const [customHost, setCustomHost] = useState("");
  const [attendees, setAttendees] = useState("Ban Điều hành KP3 & Đại diện cụm dân cư");
  const [desc, setDesc] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublicCitizenVisible, setIsPublicCitizenVisible] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [fileError, setFileError] = useState("");
  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSchedule) {
      setTitle(editingSchedule.title);
      setTitleError("");
      if (SCHEDULE_TYPES.includes(editingSchedule.type as any)) {
        setType(editingSchedule.type);
        setCustomType("");
      } else {
        setType("__CUSTOM__");
        setCustomType(editingSchedule.type);
      }
      setDate(editingSchedule.date);
      setTime(editingSchedule.time);
      setLocation(editingSchedule.location);
      if (dynamicHosts.includes(editingSchedule.host)) {
        setHost(editingSchedule.host);
        setCustomHost("");
      } else {
        setHost("__CUSTOM__");
        setCustomHost(editingSchedule.host);
      }
      setAttendees(editingSchedule.attendees);
      setDesc(editingSchedule.description || editingSchedule.content || "");
      setNotes(editingSchedule.notes || "");
      setIsPublicCitizenVisible(
        Boolean(
          (editingSchedule as ScheduleEvent & { isPublicCitizenVisible?: boolean })
            .isPublicCitizenVisible
        )
      );
      setAttachments(editingSchedule.attachments || []);
      setFileError("");
      return;
    }
    setTitle("");
    setTitleError("");
    setType("Họp Ban Điều hành KP3");
    setCustomType("");
    setDate(todayIso());
    setTime("08:30 - 10:30");
    setLocation("Văn phòng Ban Điều hành KP3");
    setHost(dynamicHosts[0]);
    setCustomHost("");
    setAttendees("Ban Điều hành KP3 & Đại diện cụm dân cư");
    setDesc("");
    setNotes("");
    setIsPublicCitizenVisible(false);
    setAttachments([]);
    setFileError("");
  }, [isOpen, editingSchedule, dynamicHosts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Vui lòng nhập tên lịch họp / sự kiện.");
      return;
    }

    const finalType = type === "__CUSTOM__" ? customType.trim() || "Sự kiện khác" : type;
    const finalHost = host === "__CUSTOM__" ? customHost.trim() || "Chủ trì cuộc họp" : host;

    const newSch: ScheduleEvent & { isPublicCitizenVisible?: boolean } = {
      ...(editingSchedule || {}),
      id: editingSchedule?.id || `SCH-${String(existingCount + 1).padStart(3, "0")}`,
      title: title.trim(),
      type: finalType,
      date,
      time,
      location,
      host: finalHost,
      attendees,
      status: editingSchedule?.status || "Sắp diễn ra",
      description: desc.trim() || undefined,
      content: desc.trim() || undefined,
      notes: notes.trim() || undefined,
      isPublicCitizenVisible,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    onCreate(newSch);
    setTitle("");
    setTitleError("");
    setDesc("");
    setNotes("");
    setCustomType("");
    setCustomHost("");
    setAttachments([]);
    setFileError("");
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingSchedule ? "Cập nhật lịch họp & sự kiện" : "Tạo lịch họp & sự kiện mới"}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="create-schedule-form"
              variant="primary"
              size="md"
              leftIcon={editingSchedule ? <Edit2 size={15} /> : <Plus size={16} />}
            >
              {editingSchedule ? "Lưu thay đổi" : "Lưu lịch công tác"}
            </Button>
          </div>
        }
      >
        <form id="create-schedule-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="schedule-title-input"
            label="Tên lịch họp / sự kiện"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError("");
            }}
            onBlur={() => {
              if (!title.trim()) setTitleError("Vui lòng nhập tên lịch họp / sự kiện.");
            }}
            error={titleError}
            placeholder="Ví dụ: Họp giao ban Ban Điều hành KP3 tháng 11"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Phân loại sự kiện</label>
              <ReportSelect
                aria-label="Phân loại sự kiện"
                value={type}
                onChange={setType}
                options={[
                  ...SCHEDULE_TYPES.map((t) => ({ value: t, label: t })),
                  { value: "__CUSTOM__", label: "+ Nhập loại sự kiện khác..." },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Người chủ trì</label>
              <ReportSelect
                aria-label="Người chủ trì"
                value={host}
                onChange={setHost}
                options={[
                  ...hostOptions,
                  { value: "__CUSTOM__", label: "+ Nhập người chủ trì khác..." },
                ]}
              />
            </div>
          </div>

          {type === "__CUSTOM__" && (
            <Input
              label="Tên loại sự kiện mới"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Ví dụ: Hội nghị Nhân dân"
            />
          )}

          {host === "__CUSTOM__" && (
            <Input
              label="Họ tên & chức vụ người chủ trì"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="Ví dụ: Ông Nguyễn Văn A - Thành viên Ban Điều hành KP3"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="schedule-date-input"
              label="Ngày tổ chức"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              id="schedule-time-input"
              label="Khung giờ"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="08:30 - 10:30"
            />
            <Input
              id="schedule-location-input"
              label="Địa điểm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <Input
            id="schedule-attendees-input"
            label="Thành phần tham dự"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
          />

          <div className="space-y-1.5">
            <label htmlFor="schedule-desc-input" className="block text-sm font-medium text-slate-700">
              Nội dung chương trình chi tiết
            </label>
            <textarea
              id="schedule-desc-input"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Nội dung thảo luận, tài liệu chuẩn bị..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <Input
            id="schedule-notes-input"
            label="Ghi chú hậu cần"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Chuẩn bị máy chiếu, biên bản..."
          />

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublicCitizenVisible}
              onChange={(e) => setIsPublicCitizenVisible(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-300 accent-emerald-700 cursor-pointer shrink-0"
            />
            <span className="space-y-0.5">
              <span className="block text-xs font-bold text-emerald-950">
                Công khai lịch này trên Cổng Cư dân (Lịch tiếp dân / Sinh hoạt khu phố)
              </span>
              <span className="block text-[11px] text-emerald-800">
                Đồng bộ hiển thị trực tiếp tại trang /schedule của Cổng Dịch vụ Cư dân số KP3.
              </span>
            </span>
          </label>

          {fileError && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {fileError}
            </p>
          )}

          <AttachmentGallery
            attachments={attachments}
            onAddFiles={(files) => setAttachments((prev) => [...prev, ...files])}
            onRemoveFile={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
            onPreviewFile={setPreviewAtt}
            onFileError={setFileError}
          />
        </form>
      </Modal>

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </>
  );
};

interface ScheduleDetailModalProps {
  schedule: ScheduleEvent | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ScheduleEvent["status"]) => void;
  onAddAttachments: (id: string, files: TaskAttachment[]) => void;
  onRemoveAttachment: (id: string, attId: string) => void;
  onRequestDelete: (schedule: ScheduleEvent) => void;
  onRequestEdit?: (schedule: ScheduleEvent) => void;
  onRequestReschedule?: (
    schedule: ScheduleEvent,
    mode?: "reschedule" | "delegate" | "postpone"
  ) => void;
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  onClose,
  onUpdateStatus,
  onAddAttachments,
  onRemoveAttachment,
  onRequestDelete,
  onRequestEdit,
  onRequestReschedule,
}) => {
  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);
  const [fileError, setFileError] = useState("");

  if (!schedule) return null;

  return (
    <>
      <Modal
        isOpen={Boolean(schedule)}
        onClose={onClose}
        title={schedule.title}
        description={`Mã lịch: ${schedule.id} • ${schedule.date}`}
        size="2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <Button
              variant="destructive"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => onRequestDelete(schedule)}
            >
              Xóa
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {onRequestReschedule && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshCw size={14} />}
                    onClick={() => {
                      onClose();
                      onRequestReschedule(schedule, "reschedule");
                    }}
                  >
                    Dời / Đổi giờ
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<UserCheck size={14} />}
                    onClick={() => {
                      onClose();
                      onRequestReschedule(schedule, "delegate");
                    }}
                  >
                    Cử đi thay
                  </Button>
                </>
              )}
              {onRequestEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit2 size={14} />}
                  onClick={() => onRequestEdit(schedule)}
                >
                  Sửa lịch họp
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {getScheduleTypeBadge(schedule.type)}
              <span className="px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-900 text-xs font-semibold">
                {schedule.status}
              </span>
              {schedule.rescheduleCount && schedule.rescheduleCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-900 text-xs font-bold">
                  Đã dời lịch ({schedule.rescheduleCount} lần)
                </span>
              ) : null}
            </div>
            <div className="w-48">
              <ReportSelect
                aria-label="Cập nhật trạng thái sự kiện"
                value={schedule.status}
                onChange={(val) => onUpdateStatus(schedule.id, val as ScheduleEvent["status"])}
                options={[
                  { value: "Sắp diễn ra", label: "Sắp diễn ra" },
                  { value: "Đang diễn ra", label: "Đang diễn ra" },
                  { value: "Đã kết thúc", label: "Đã kết thúc" },
                  { value: "Đã hoãn", label: "Đã hoãn" },
                ]}
              />
            </div>
          </div>

          <dl className="@container divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4 py-1">
            <DetailRow
              label="Thời gian hiện tại"
              value={`${schedule.date.split("-").reverse().join("/")} • ${schedule.time}`}
              isMono
            />
            {(schedule.originalDate || schedule.originalTime) && (
              <DetailRow
                label="Lịch gốc ban đầu"
                value={`${
                  schedule.originalDate
                    ? schedule.originalDate.split("-").reverse().join("/")
                    : schedule.date.split("-").reverse().join("/")
                } • ${schedule.originalTime || schedule.time}`}
                isMono
              />
            )}
            <DetailRow label="Địa điểm" value={schedule.location} />
            <DetailRow label="Chủ trì / Cấp trên" value={schedule.host} />
            <DetailRow label="Thành phần KP3" value={schedule.attendees} />
            {schedule.sourceDocNumber && (
              <DetailRow label="Văn bản nguồn" value={schedule.sourceDocNumber} />
            )}
            {schedule.notes && <DetailRow label="Ghi chú / Chỉ đạo" value={schedule.notes} />}
          </dl>

          {(schedule.description || schedule.content) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {schedule.description || schedule.content}
            </div>
          )}

          {schedule.adjustmentLogs && schedule.adjustmentLogs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                <History size={14} className="text-indigo-700" />
                <span>Nhật ký Nguồn lịch, Điều chỉnh &amp; Cử đi thay ({schedule.adjustmentLogs.length})</span>
              </h5>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {schedule.adjustmentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-white border border-slate-200/90 space-y-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-800">
                      <span>{log.reason}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {new Date(log.changedAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    {log.previousDate && log.newDate && log.actionType === "reschedule" && (
                      <div className="text-[11px] font-mono text-emerald-800">
                        {log.previousDate.split("-").reverse().join("/")} ({log.previousTime}) →{" "}
                        {log.newDate.split("-").reverse().join("/")} ({log.newTime})
                      </div>
                    )}
                    {log.delegatedFrom && log.delegatedTo && (
                      <div className="text-[11px] text-indigo-800 font-medium">
                        Ủy quyền: {log.delegatedFrom} → {log.delegatedTo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fileError && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {fileError}
            </p>
          )}

          <AttachmentGallery
            attachments={schedule.attachments || []}
            onAddFiles={(files) => onAddAttachments(schedule.id, files)}
            onRemoveFile={(attId) => onRemoveAttachment(schedule.id, attId)}
            onPreviewFile={setPreviewAtt}
            onFileError={setFileError}
          />
        </div>
      </Modal>

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </>
  );
};
