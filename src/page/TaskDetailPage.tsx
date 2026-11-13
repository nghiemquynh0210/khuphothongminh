import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Phone,
  Trash2,
  User,
  ClipboardList,
} from "lucide-react";
import { TaskAttachment, TaskItem } from "../types";
import { Button, ConfirmModal } from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { getPriorityBadge, getStatusBadge } from "../components/tasks/taskBadges";
import { AttachmentGallery } from "../components/tasks/AttachmentGallery";
import { AttachmentPreviewModal } from "../components/tasks/TaskModals";
import { loadStoredTasks } from "../components/tasks/tasksData";
import { loadTaskByIdFromDb } from "../utils/supabaseSync";
import {
  ROUTES,
  getTaskEditPath,
  navigate,
} from "../routes";

export interface TaskDetailPageProps {
  taskId: string;
  tasks: TaskItem[];
  isDataLoading?: boolean;
  basePath?: string;
  onUpdateStatus?: (taskId: string, nextStatus: TaskItem["status"]) => void;
  onUpdateProgress?: (taskId: string, pct: number) => void;
  onAddAttachments?: (taskId: string, files: TaskAttachment[]) => void;
  onRemoveAttachment?: (taskId: string, attId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onEdit?: (task: TaskItem) => void;
  onBack?: () => void;
  onDeleted?: (deletedTask: TaskItem) => void;
}

export default function TaskDetailPage({
  taskId,
  tasks,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_TASKS,
  onUpdateStatus,
  onUpdateProgress,
  onAddAttachments,
  onRemoveAttachment,
  onDeleteTask,
  onEdit,
  onBack,
  onDeleted,
}: TaskDetailPageProps) {
  const [directTask, setDirectTask] = useState<TaskItem | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState<boolean>(false);

  const normalizedTaskId = useMemo(() => {
    return taskId ? decodeURIComponent(taskId).trim() : "";
  }, [taskId]);

  const task = useMemo(() => {
    if (!normalizedTaskId) return null;
    const foundInTasks = tasks.find(
      (t) => t.id === normalizedTaskId || t.id.toLowerCase() === normalizedTaskId.toLowerCase()
    );
    if (foundInTasks) return foundInTasks;
    if (
      directTask &&
      (directTask.id === normalizedTaskId || directTask.id.toLowerCase() === normalizedTaskId.toLowerCase())
    ) {
      return directTask;
    }
    return null;
  }, [normalizedTaskId, tasks, directTask]);

  useEffect(() => {
    if (!task && normalizedTaskId) {
      try {
        const stored = loadStoredTasks();
        const foundInStored = stored.find(
          (t) => t.id === normalizedTaskId || t.id.toLowerCase() === normalizedTaskId.toLowerCase()
        );
        if (foundInStored) {
          setDirectTask(foundInStored);
          return;
        }
      } catch {}

      setIsFetchingDirect(true);
      loadTaskByIdFromDb(normalizedTaskId)
        .then((dbTask) => {
          if (dbTask) {
            setDirectTask(dbTask);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsFetchingDirect(false);
        });
    }
  }, [normalizedTaskId, task]);

  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);
  const [fileError, setFileError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(basePath);
    }
  };

  const handleEdit = () => {
    if (!task) return;
    if (onEdit) {
      onEdit(task);
    } else {
      navigate(getTaskEditPath(task.id, basePath));
    }
  };

  const handleStatusChange = (nextStatus: TaskItem["status"]) => {
    if (!task || !onUpdateStatus) return;
    onUpdateStatus(task.id, nextStatus);
  };

  const handleProgressChange = (pct: number) => {
    if (!task || !onUpdateProgress) return;
    onUpdateProgress(task.id, pct);
  };

  const handleAddFiles = (files: TaskAttachment[]) => {
    if (!task || !onAddAttachments) return;
    onAddAttachments(task.id, files);
  };

  const handleRemoveFile = (attId: string) => {
    if (!task || !onRemoveAttachment) return;
    onRemoveAttachment(task.id, attId);
  };

  const handleConfirmDelete = () => {
    if (!task) return;
    if (onDeleteTask) {
      onDeleteTask(task.id);
    }
    setShowDeleteModal(false);
    if (onDeleted) {
      onDeleted(task);
    } else {
      navigate(basePath);
    }
  };

  if ((isDataLoading || isFetchingDirect) && !task) {
    return <LoadingFade title="Đang tải dữ liệu hồ sơ nhiệm vụ..." />;
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Không tìm thấy nhiệm vụ</h2>
              <p className="text-xs text-slate-500 mt-1">
                Nhiệm vụ có mã <span className="font-mono font-bold text-slate-700">{taskId}</span> không tồn tại hoặc đã bị xóa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Quay lại danh sách nhiệm vụ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <PageHeader
        badgeIcon={<ClipboardList size={14} className="text-emerald-700 shrink-0" />}
        badgeText={`Chi tiết nhiệm vụ • ${task.id}`}
        badgeSubtext="BAN ĐIỀU HÀNH KP3"
        title={task.title}
        description={`Mã nhiệm vụ: ${task.id} • Khởi tạo: ${task.startDate}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={<ArrowLeft size={14} />}
              onClick={handleBack}
            >
              Quay lại danh sách
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<Edit2 size={14} />}
              onClick={handleEdit}
            >
              Sửa nhiệm vụ
            </Button>
            {task.status !== "Hoàn thành" && onUpdateStatus && (
              <Button
                type="button"
                variant="emerald"
                size="md"
                leftIcon={<CheckCircle2 size={15} />}
                onClick={() => handleStatusChange("Hoàn thành")}
              >
                Đánh dấu hoàn thành
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="md"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setShowDeleteModal(true)}
            >
              Xóa
            </Button>
          </div>
        }
      />

      {/* Badges bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
        {getPriorityBadge(task.priority)}
        {getStatusBadge(task.status)}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold">
          <Calendar size={13} className="text-slate-500" />
          <span>Hạn chót: <span className="font-mono">{task.deadline}</span></span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold">
          <Clock size={13} className="text-slate-500" />
          <span>Tiến độ: <span className="font-mono text-emerald-800 font-bold">{task.progressPercent}%</span></span>
        </span>
      </div>

      {/* Description / Instructions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Nội dung chỉ đạo & Yêu cầu kết quả
        </h3>
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
          {task.description}
        </p>
      </div>

      {/* Detailed metadata */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Thông tin phân công & Đơn vị thực hiện
          </h3>
        </div>
        <dl className="@container divide-y divide-slate-100 px-5 py-2">
          <DetailRow
            label="Cán bộ phụ trách"
            value={`${task.assignee.name} (${task.assignee.role})`}
          />
          <DetailRow label="Đơn vị thực hiện" value={task.unit} />
          {task.assignee.phone && (
            <DetailRow
              label="SĐT liên hệ"
              value={task.assignee.phone}
              href={`tel:${task.assignee.phone}`}
              copyValue={task.assignee.phone}
              isMono
            />
          )}
          <DetailRow label="Người giao việc" value={task.creator} />
          <DetailRow label="Ngày khởi tạo" value={task.startDate} isMono />
          <DetailRow label="Hạn hoàn thành" value={task.deadline} isMono />
          {task.completedAt && (
            <DetailRow label="Ngày hoàn thành" value={task.completedAt} isMono />
          )}
          {task.notes && <DetailRow label="Ghi chú điều hành" value={task.notes} />}
        </dl>
      </div>

      {/* Status & Progress Management */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Cập nhật tiến độ & Trạng thái thực tế
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-800">
            {task.progressPercent}% hoàn tất
          </span>
        </div>

        {/* Progress percent bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${task.progressPercent}%` }}
          />
        </div>

        {/* Quick progress percent buttons */}
        {onUpdateProgress && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Chọn mức tiến độ:</span>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 25, 50, 75, 90, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleProgressChange(pct)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                    task.progressPercent === pct
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status buttons */}
        {onUpdateStatus && (
          <div className="space-y-1.5 pt-2">
            <span className="text-xs font-semibold text-slate-700">Chuyển trạng thái nhiệm vụ:</span>
            <div className="flex flex-wrap items-center gap-2">
              {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
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
        )}
      </div>

      {/* Attachments Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Tài liệu & Hình ảnh nghiệm thu hiện trường
        </h3>
        {fileError && (
          <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2">
            {fileError}
          </p>
        )}
        <AttachmentGallery
          attachments={task.attachments || []}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
          onPreviewFile={setPreviewAtt}
          onFileError={setFileError}
        />
      </div>

      {/* Preview modal */}
      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa nhiệm vụ"
        description={`Bạn có chắc chắn muốn xóa nhiệm vụ "${task.title}" (Mã: ${task.id})? Hành động này không thể hoàn tác.`}
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />
    </div>
  );
}

