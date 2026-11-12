import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Edit2, FileText, Plus, Trash2 } from "lucide-react";
import { Association, TaskAttachment, TaskItem } from "../../types";
import { KP3_TO_LIST } from "../../utils/kp3Utils";
import { Button, Input, Modal, ReportSelect } from "../ui";
import { DetailRow } from "../common/DetailRow";
import { getPriorityBadge, getStatusBadge } from "./taskBadges";
import { AttachmentGallery } from "./AttachmentGallery";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  associationsList: Association[];
  onCreate: (task: TaskItem) => void;
  existingCount: number;
  creatorLabel?: string;
  editingTask?: TaskItem | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  associationsList,
  onCreate,
  existingCount,
  creatorLabel = "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
  editingTask = null,
}) => {
  const initialAssoc = associationsList[0];
  const initialLeader = initialAssoc?.members?.[0];

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [desc, setDesc] = useState("");
  const [associationId, setAssociationId] = useState(initialAssoc?.id || "ASC_BDH");
  const [unit, setUnit] = useState(initialAssoc?.name || "Ban điều hành khu phố");
  const [assigneeName, setAssigneeName] = useState(initialLeader?.fullName || "Nguyễn Trung Huy");
  const [assigneeRole, setAssigneeRole] = useState(initialLeader?.role || "Trưởng Ban điều hành");
  const [assigneePhone, setAssigneePhone] = useState(initialLeader?.phone || "0909123888");
  const [isCustomAssignee, setIsCustomAssignee] = useState(false);
  const [priority, setPriority] = useState<TaskItem["priority"]>("Cao");
  const [deadline, setDeadline] = useState("2026-10-25");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [fileError, setFileError] = useState("");
  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setTitleError("");
      setDesc(editingTask.description || "");
      setAssociationId(editingTask.associationId || "");
      setUnit(editingTask.unit);
      setAssigneeName(editingTask.assignee.name);
      setAssigneeRole(editingTask.assignee.role);
      setAssigneePhone(editingTask.assignee.phone || "");
      const matchedAssoc = associationsList.find(
        (a) => a.id === editingTask.associationId || a.name === editingTask.unit
      );
      const isInMembers = matchedAssoc?.members?.some(
        (m) => m.fullName === editingTask.assignee.name
      );
      setIsCustomAssignee(!isInMembers);
      setPriority(editingTask.priority);
      setDeadline(editingTask.deadline || "2026-10-25");
      setAttachments(editingTask.attachments || []);
      setFileError("");
      return;
    }
    const defAssoc = associationsList[0];
    const defLeader = defAssoc?.members?.[0];
    setTitle("");
    setTitleError("");
    setDesc("");
    setAssociationId(defAssoc?.id || "ASC_BDH");
    setUnit(defAssoc?.name || "Ban điều hành khu phố");
    setAssigneeName(defLeader?.fullName || "Nguyễn Trung Huy");
    setAssigneeRole(defLeader?.role || "Trưởng Ban điều hành");
    setAssigneePhone(defLeader?.phone || "0909123888");
    setIsCustomAssignee(false);
    setPriority("Cao");
    setDeadline("2026-10-25");
    setAttachments([]);
    setFileError("");
  }, [isOpen, editingTask, associationsList]);

  const unitOptions = useMemo(() => {
    const assocOpts = associationsList.map((a) => ({ value: a.id, label: a.name }));
    const toOpts = KP3_TO_LIST.map((t) => ({ value: `TDP_${t}`, label: `Tổ dân phố (${t})` }));
    return [...assocOpts, ...toOpts];
  }, [associationsList]);

  const currentMembers = useMemo(() => {
    const found = associationsList.find((a) => a.id === associationId || a.name === unit);
    return found?.members || [];
  }, [associationsList, associationId, unit]);

  const handleUnitSelect = (val: string) => {
    if (val.startsWith("TDP_")) {
      const label = val.replace("TDP_", "");
      setAssociationId("");
      setUnit(label);
      setIsCustomAssignee(true);
      setAssigneeName(`Tổ trưởng ${label}`);
      setAssigneeRole(`Tổ trưởng ${label}`);
      setAssigneePhone("");
      return;
    }

    const assoc = associationsList.find((a) => a.id === val || a.name === val);
    if (assoc) {
      setAssociationId(assoc.id);
      setUnit(assoc.name);
      if (assoc.members && assoc.members.length > 0) {
        const leader = assoc.members.find((m) => m.fullName === assoc.leaderName) || assoc.members[0];
        setAssigneeName(leader.fullName);
        setAssigneeRole(leader.role);
        setAssigneePhone(leader.phone || "");
        setIsCustomAssignee(false);
      } else {
        setAssigneeName(assoc.leaderName || "");
        setAssigneeRole("Đại diện đơn vị");
        setAssigneePhone("");
        setIsCustomAssignee(true);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Vui lòng nhập tiêu đề nhiệm vụ.");
      return;
    }
    const newTask: TaskItem = {
      id: editingTask?.id || `TASK-${String(existingCount + 1).padStart(3, "0")}`,
      title: title.trim(),
      description: desc.trim() || "Thực hiện theo phân công của Ban Điều hành KP3.",
      unit,
      associationId: associationId || undefined,
      assignee: {
        name: assigneeName.trim() || "Chưa chỉ định",
        role: assigneeRole.trim() || "Cán bộ phụ trách",
        unit,
        phone: assigneePhone.trim() || undefined,
      },
      creator: editingTask?.creator || creatorLabel,
      priority,
      status: editingTask?.status || "Chờ xử lý",
      progressPercent: editingTask?.progressPercent ?? 0,
      startDate: editingTask?.startDate || new Date().toISOString().slice(0, 10),
      completedAt: editingTask?.completedAt,
      notes: editingTask?.notes,
      deadline,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    onCreate(newTask);
    setTitle("");
    setTitleError("");
    setDesc("");
    setAttachments([]);
    setFileError("");
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingTask ? "Cập nhật nhiệm vụ" : "Giao nhiệm vụ mới"}
        description="Phân công trực tiếp cho Chi hội, Tổ dân phố (Tổ 1–14) hoặc lực lượng chuyên trách KP3"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="create-task-form"
              variant="emerald"
              size="md"
              leftIcon={editingTask ? <Edit2 size={15} /> : <Plus size={16} />}
            >
              {editingTask ? "Lưu thay đổi" : "Giao nhiệm vụ"}
            </Button>
          </div>
        }
      >
        <form id="create-task-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="task-title-input"
            label="Tiêu đề nhiệm vụ"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError("");
            }}
            onBlur={() => {
              if (!title.trim()) setTitleError("Vui lòng nhập tiêu đề nhiệm vụ.");
            }}
            error={titleError}
            placeholder="Ví dụ: Kiểm tra PCCC các nhà trọ tại Tổ 5"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Đơn vị / Tổ dân phố thực hiện
              </label>
              <ReportSelect
                aria-label="Đơn vị thực hiện nhiệm vụ"
                value={associationId || `TDP_${unit}`}
                onChange={handleUnitSelect}
                options={unitOptions}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Cán bộ phụ trách</label>
              {currentMembers.length > 0 ? (
                <ReportSelect
                  aria-label="Cán bộ phụ trách"
                  value={isCustomAssignee ? "__CUSTOM__" : assigneeName}
                  onChange={(val) => {
                    if (val === "__CUSTOM__") {
                      setIsCustomAssignee(true);
                      setAssigneeName("");
                      setAssigneeRole("Cán bộ phụ trách");
                      setAssigneePhone("");
                      return;
                    }
                    setIsCustomAssignee(false);
                    const found = currentMembers.find((m) => m.fullName === val || m.id === val);
                    if (found) {
                      setAssigneeName(found.fullName);
                      setAssigneeRole(found.role);
                      setAssigneePhone(found.phone || "");
                    }
                  }}
                  options={[
                    ...currentMembers.map((m) => ({
                      value: m.fullName,
                      label: `${m.fullName} (${m.role})`,
                    })),
                    { value: "__CUSTOM__", label: "+ Nhập người nhận khác..." },
                  ]}
                />
              ) : (
                <Input
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Tên cán bộ / Tổ trưởng"
                />
              )}
            </div>
          </div>

          {isCustomAssignee && currentMembers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <Input
                label="Họ và tên"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
              <Input
                label="Chức vụ"
                value={assigneeRole}
                onChange={(e) => setAssigneeRole(e.target.value)}
                placeholder="Tổ phó"
              />
              <Input
                label="Số điện thoại"
                value={assigneePhone}
                onChange={(e) => setAssigneePhone(e.target.value)}
                placeholder="090..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
            <fieldset className="space-y-1.5">
              <legend className="block text-sm font-medium text-slate-700">Mức độ ưu tiên</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["Thấp", "Trung bình", "Cao", "Khẩn cấp"] as TaskItem["priority"][]).map((lvl) => (
                  <label
                    key={lvl}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      priority === lvl
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="taskPriority"
                      value={lvl}
                      checked={priority === lvl}
                      onChange={() => setPriority(lvl)}
                      className="accent-emerald-600"
                    />
                    <span>{lvl}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Input
              id="task-deadline-input"
              label="Hạn hoàn thành"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-desc-input" className="block text-sm font-medium text-slate-700">
              Nội dung chỉ đạo & yêu cầu kết quả
            </label>
            <textarea
              id="task-desc-input"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ghi rõ địa điểm (Tổ/hẻm), yêu cầu ảnh nghiệm thu hoặc văn bản báo cáo..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

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

interface TaskDetailModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onUpdateStatus: (taskId: string, nextStatus: TaskItem["status"]) => void;
  onUpdateProgress: (taskId: string, pct: number) => void;
  onAddAttachments: (taskId: string, files: TaskAttachment[]) => void;
  onRemoveAttachment: (taskId: string, attId: string) => void;
  onRequestDelete: (task: TaskItem) => void;
  onRequestEdit?: (task: TaskItem) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onUpdateStatus,
  onUpdateProgress,
  onAddAttachments,
  onRemoveAttachment,
  onRequestDelete,
  onRequestEdit,
}) => {
  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);
  const [fileError, setFileError] = useState("");

  if (!task) return null;

  return (
    <>
      <Modal
        isOpen={Boolean(task)}
        onClose={onClose}
        title={task.title}
        description={`Mã nhiệm vụ: ${task.id} • Khởi tạo: ${task.startDate}`}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="destructive"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => onRequestDelete(task)}
            >
              Xóa
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </Button>
              {onRequestEdit && (
                <Button
                  variant={task.status === "Hoàn thành" ? "primary" : "outline"}
                  size="sm"
                  leftIcon={<Edit2 size={14} />}
                  onClick={() => onRequestEdit(task)}
                >
                  Sửa nhiệm vụ
                </Button>
              )}
              {task.status !== "Hoàn thành" && (
                <Button
                  variant="emerald"
                  size="sm"
                  leftIcon={<CheckCircle2 size={14} />}
                  onClick={() => onUpdateStatus(task.id, "Hoàn thành")}
                >
                  Hoàn thành
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {getPriorityBadge(task.priority)}
            {getStatusBadge(task.status)}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-800 text-xs font-medium">
              <Calendar size={12} aria-hidden="true" /> Hạn: {task.deadline}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
            {task.description}
          </div>

          <dl className="@container divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4 py-1">
            <DetailRow
              label="Cán bộ phụ trách"
              value={`${task.assignee.name} (${task.assignee.role})`}
            />
            <DetailRow label="Đơn vị thực hiện" value={task.unit} />
            <DetailRow
              label="SĐT liên hệ"
              value={task.assignee.phone}
              href={task.assignee.phone ? `tel:${task.assignee.phone}` : undefined}
              copyValue={task.assignee.phone}
              isMono
            />
            <DetailRow label="Người giao việc" value={task.creator} />
            <DetailRow label="Hạn hoàn thành" value={task.deadline} isMono />
            {task.completedAt && (
              <DetailRow label="Ngày hoàn thành" value={task.completedAt} isMono />
            )}
            {task.notes && <DetailRow label="Ghi chú" value={task.notes} />}
          </dl>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>Cập nhật tiến độ & trạng thái</span>
              <span className="font-mono text-emerald-800">{task.progressPercent}%</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 25, 50, 75, 90, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onUpdateProgress(task.id, pct)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                    task.progressPercent === pct
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <div className="pt-1 flex flex-wrap gap-1.5">
              {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onUpdateStatus(task.id, st)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      task.status === st
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          {fileError && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {fileError}
            </p>
          )}

          <AttachmentGallery
            attachments={task.attachments || []}
            onAddFiles={(files) => onAddAttachments(task.id, files)}
            onRemoveFile={(attId) => onRemoveAttachment(task.id, attId)}
            onPreviewFile={setPreviewAtt}
            onFileError={setFileError}
          />
        </div>
      </Modal>

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </>
  );
};

export const AttachmentPreviewModal: React.FC<{
  attachment: TaskAttachment | null;
  onClose: () => void;
}> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  return (
    <Modal
      isOpen={Boolean(attachment)}
      onClose={onClose}
      title={attachment.name}
      description={`Loại tệp: ${attachment.type.toUpperCase()} • ${attachment.size || ""}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          {attachment.url && attachment.url !== "#" && (
            <a
              href={attachment.url}
              download={attachment.name}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
            >
              Tải tệp xuống
            </a>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      {attachment.type === "image" && attachment.url !== "#" ? (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={attachment.url} alt={attachment.name} className="max-h-[60vh] mx-auto object-contain" />
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
          <FileText size={32} className="mx-auto text-indigo-700" />
          <p className="text-sm font-semibold text-slate-900">{attachment.name}</p>
          <p className="text-xs text-slate-600">
            Vui lòng dùng nút &ldquo;Tải tệp xuống&rdquo; để mở tài liệu {attachment.type.toUpperCase()} trên thiết bị.
          </p>
        </div>
      )}
    </Modal>
  );
};
