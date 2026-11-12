import React, { useEffect, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { ScheduleEvent, TaskAttachment } from "../../types";
import { SCHEDULE_TYPES } from "./tasksData";
import { getScheduleTypeBadge } from "./taskBadges";
import { AttachmentGallery } from "./AttachmentGallery";
import { AttachmentPreviewModal } from "./TaskModals";
import { Button, Input, Modal, ReportSelect } from "../ui";
import { DetailRow } from "../common/DetailRow";

const DEFAULT_HOSTS = [
  "Đ/c Nguyễn Văn Hùng - Bí thư Chi bộ KP3",
  "Ông Nguyễn Trung Huy - Trưởng Ban điều hành KP3",
  "Ông Lê Văn Sơn - Phó Trưởng Ban điều hành KP3",
  "Bà Lê Thị Mai - Phó Ban điều hành KP3",
  "Ông Trần Quốc Tuấn - Trưởng ban ĐHKP",
  "Đ/c Trung úy CSKV Khu phố 3",
];

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sch: ScheduleEvent) => void;
  existingCount: number;
  editingSchedule?: ScheduleEvent | null;
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingCount,
  editingSchedule = null,
}) => {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [type, setType] = useState<string>("Họp Tổ Dân Phố");
  const [customType, setCustomType] = useState("");
  const [date, setDate] = useState("2026-10-22");
  const [time, setTime] = useState("08:30 - 10:30");
  const [location, setLocation] = useState("Văn phòng Ban Điều hành KP3");
  const [host, setHost] = useState(DEFAULT_HOSTS[1]);
  const [customHost, setCustomHost] = useState("");
  const [attendees, setAttendees] = useState("Đại diện 14 Tổ dân phố");
  const [desc, setDesc] = useState("");
  const [notes, setNotes] = useState("");
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
      if (DEFAULT_HOSTS.includes(editingSchedule.host)) {
        setHost(editingSchedule.host);
        setCustomHost("");
      } else {
        setHost("__CUSTOM__");
        setCustomHost(editingSchedule.host);
      }
      setAttendees(editingSchedule.attendees);
      setDesc(editingSchedule.description || editingSchedule.content || "");
      setNotes(editingSchedule.notes || "");
      setAttachments(editingSchedule.attachments || []);
      setFileError("");
      return;
    }
    setTitle("");
    setTitleError("");
    setType("Họp Tổ Dân Phố");
    setCustomType("");
    setDate("2026-10-22");
    setTime("08:30 - 10:30");
    setLocation("Văn phòng Ban Điều hành KP3");
    setHost(DEFAULT_HOSTS[1]);
    setCustomHost("");
    setAttendees("Đại diện 14 Tổ dân phố");
    setDesc("");
    setNotes("");
    setAttachments([]);
    setFileError("");
  }, [isOpen, editingSchedule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Vui lòng nhập tên lịch họp / sự kiện.");
      return;
    }

    const finalType = type === "__CUSTOM__" ? customType.trim() || "Sự kiện khác" : type;
    const finalHost = host === "__CUSTOM__" ? customHost.trim() || "Chủ trì cuộc họp" : host;

    const newSch: ScheduleEvent = {
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
        description="Thiết lập lịch giao ban KP3, họp 14 Tổ dân phố hoặc hoạt động cộng đồng"
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
            placeholder="Ví dụ: Họp giao ban Tổ trưởng Tổ 1–14 tháng 11"
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
                  ...DEFAULT_HOSTS.map((h) => ({ value: h, label: h })),
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
              placeholder="Ví dụ: Ông Nguyễn Văn A - Tổ trưởng Tổ 7"
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
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  onClose,
  onUpdateStatus,
  onAddAttachments,
  onRemoveAttachment,
  onRequestDelete,
  onRequestEdit,
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
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="destructive"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => onRequestDelete(schedule)}
            >
              Xóa
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </Button>
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
              label="Thời gian"
              value={`${schedule.date} • ${schedule.time}`}
              isMono
            />
            <DetailRow label="Địa điểm" value={schedule.location} />
            <DetailRow label="Người chủ trì" value={schedule.host} />
            <DetailRow label="Thành phần tham dự" value={schedule.attendees} />
            {schedule.notes && <DetailRow label="Ghi chú hậu cần" value={schedule.notes} />}
          </dl>

          {(schedule.description || schedule.content) && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {schedule.description || schedule.content}
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
