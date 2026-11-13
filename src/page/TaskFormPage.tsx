import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Plus,
  Save,
  Users,
  X,
} from "lucide-react";
import { Association, TaskAttachment, TaskItem } from "../types";
import { KP3_AREA_LIST } from "../utils/kp3Utils";
import { getStoredAssociations } from "../data/associationsData";
import { Button, Input, ReportSelect } from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { AttachmentGallery } from "../components/tasks/AttachmentGallery";
import { AttachmentPreviewModal } from "../components/tasks/TaskModals";
import { loadStoredTasks } from "../components/tasks/tasksData";
import { loadTaskByIdFromDb } from "../utils/supabaseSync";
import {
  ROUTES,
  getTaskDetailPath,
  navigate,
} from "../routes";

export interface TaskFormPageProps {
  mode: "create" | "edit";
  taskId?: string;
  tasks: TaskItem[];
  isDataLoading?: boolean;
  basePath?: string;
  creatorLabel?: string;
  associationsList?: Association[];
  onAddTask?: (newTask: TaskItem) => void;
  onUpdateTask?: (updatedTask: TaskItem) => void;
  onCancel?: () => void;
  onSaved?: (savedTask: TaskItem, mode: "create" | "edit") => void;
}

export default function TaskFormPage({
  mode,
  taskId,
  tasks,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_TASKS,
  creatorLabel = "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
  associationsList: customAssociations,
  onAddTask,
  onUpdateTask,
  onCancel,
  onSaved,
}: TaskFormPageProps) {
  const associationsList = useMemo(() => {
    return customAssociations && customAssociations.length > 0
      ? customAssociations
      : getStoredAssociations();
  }, [customAssociations]);

  const [directTask, setDirectTask] = useState<TaskItem | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState<boolean>(false);

  const normalizedTaskId = useMemo(() => {
    return taskId ? decodeURIComponent(taskId).trim() : "";
  }, [taskId]);

  const targetTask = useMemo(() => {
    if (mode !== "edit" || !normalizedTaskId) return null;
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
  }, [mode, normalizedTaskId, tasks, directTask]);

  useEffect(() => {
    if (mode === "edit" && !targetTask && normalizedTaskId) {
      try {
        const stored = loadStoredTasks();
        const found = stored.find(
          (t) => t.id === normalizedTaskId || t.id.toLowerCase() === normalizedTaskId.toLowerCase()
        );
        if (found) {
          setDirectTask(found);
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
  }, [mode, normalizedTaskId, targetTask]);

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
  const [status, setStatus] = useState<TaskItem["status"]>("Chờ xử lý");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [deadline, setDeadline] = useState("2026-10-25");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [fileError, setFileError] = useState("");
  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && targetTask) {
      setTitle(targetTask.title || "");
      setTitleError("");
      setDesc(targetTask.description || "");
      setAssociationId(targetTask.associationId || "");
      setUnit(targetTask.unit || "Ban điều hành khu phố");
      setAssigneeName(targetTask.assignee?.name || "");
      setAssigneeRole(targetTask.assignee?.role || "");
      setAssigneePhone(targetTask.assignee?.phone || "");
      const matchedAssoc = associationsList.find(
        (a) => a.id === targetTask.associationId || a.name === targetTask.unit
      );
      const isInMembers = matchedAssoc?.members?.some(
        (m) => m.fullName === targetTask.assignee?.name
      );
      setIsCustomAssignee(!isInMembers);
      setPriority(targetTask.priority || "Cao");
      setStatus(targetTask.status || "Chờ xử lý");
      setProgressPercent(targetTask.progressPercent ?? 0);
      setDeadline(targetTask.deadline || "2026-10-25");
      setAttachments(targetTask.attachments || []);
      setFileError("");
      return;
    }

    if (mode === "create") {
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
      setStatus("Chờ xử lý");
      setProgressPercent(0);
      setDeadline("2026-10-25");
      setAttachments([]);
      setFileError("");
    }
  }, [mode, targetTask, associationsList]);

  const unitOptions = useMemo(() => {
    const assocOpts = associationsList.map((a) => ({ value: a.id, label: a.name }));
    const areaOpts = KP3_AREA_LIST.map((area) => ({
      value: `AREA_${area}`,
      label: `Khu vực KP3 (${area})`,
    }));
    return [...assocOpts, ...areaOpts];
  }, [associationsList]);

  const currentMembers = useMemo(() => {
    const found = associationsList.find((a) => a.id === associationId || a.name === unit);
    return found?.members || [];
  }, [associationsList, associationId, unit]);

  const handleUnitSelect = (val: string) => {
    if (val.startsWith("AREA_") || val.startsWith("TDP_")) {
      const label = val.replace(/^(AREA_|TDP_)/, "");
      setAssociationId("");
      setUnit(label);
      setIsCustomAssignee(true);
      setAssigneeName(`Cán bộ phụ trách ${label}`);
      setAssigneeRole(`Phụ trách ${label}`);
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

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(basePath);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Vui lòng nhập tiêu đề nhiệm vụ.");
      setErrorNotice("Vui lòng điền đầy đủ các thông tin bắt buộc trước khi lưu.");
      return;
    }

    if (mode === "edit") {
      if (!targetTask) return;
      const updated: TaskItem = {
        ...targetTask,
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
        priority,
        status,
        progressPercent,
        deadline,
        completedAt: status === "Hoàn thành" ? targetTask.completedAt || new Date().toISOString().slice(0, 10) : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      if (onUpdateTask) {
        onUpdateTask(updated);
      }
      if (onSaved) {
        onSaved(updated, "edit");
      } else {
        navigate(getTaskDetailPath(updated.id, basePath));
      }
      return;
    }

    const newId = `TASK-${String(tasks.length + 1).padStart(3, "0")}`;
    const newTask: TaskItem = {
      id: newId,
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
      creator: creatorLabel,
      priority,
      status: "Chờ xử lý",
      progressPercent: 0,
      startDate: new Date().toISOString().slice(0, 10),
      deadline,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    if (onAddTask) {
      onAddTask(newTask);
    }
    if (onSaved) {
      onSaved(newTask, "create");
    } else {
      navigate(getTaskDetailPath(newTask.id, basePath));
    }
  };

  if (mode === "edit" && (isDataLoading || isFetchingDirect) && !targetTask) {
    return <LoadingFade title="Đang tải dữ liệu hồ sơ nhiệm vụ..." />;
  }

  if (mode === "edit" && !targetTask) {
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
        badgeText={
          mode === "create"
            ? "Phân công nhiệm vụ mới"
            : `Cập nhật nhiệm vụ • ${targetTask?.id || taskId}`
        }
        badgeSubtext="BAN ĐIỀU HÀNH KP3"
        title={
          mode === "create"
            ? "Giao Nhiệm Vụ Mới"
            : `Chỉnh Sửa Nhiệm Vụ: ${targetTask?.title || taskId}`
        }
        description="Phân công trực tiếp cho Chi hội, cụm địa bàn hoặc lực lượng chuyên trách Khu phố 3."
        actions={
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft size={14} />}
            onClick={handleBack}
          >
            {mode === "edit" ? "Quay lại chi tiết" : "Quay lại danh sách"}
          </Button>
        }
      />

      {errorNotice && (
        <InlineNotice
          type="error"
          message={errorNotice}
          onDismiss={() => setErrorNotice(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5"
      >
        <div className="space-y-4">
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
            placeholder="Ví dụ: Kiểm tra PCCC các cơ sở nhà trọ tại Đường Lương Định Của"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Đơn vị / Khu vực KP3 thực hiện <span className="text-rose-500">*</span>
              </label>
              <ReportSelect
                aria-label="Đơn vị thực hiện nhiệm vụ"
                value={associationId || `AREA_${unit}`}
                onChange={handleUnitSelect}
                options={unitOptions}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Cán bộ phụ trách <span className="text-rose-500">*</span>
              </label>
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
                  placeholder="Tên cán bộ phụ trách"
                />
              )}
            </div>
          </div>

          {isCustomAssignee && currentMembers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <Input
                label="Họ và tên cán bộ"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
              <Input
                label="Chức vụ"
                value={assigneeRole}
                onChange={(e) => setAssigneeRole(e.target.value)}
                placeholder="Tổ phó / Phụ trách"
              />
              <Input
                label="Số điện thoại liên hệ"
                value={assigneePhone}
                onChange={(e) => setAssigneePhone(e.target.value)}
                placeholder="090..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <fieldset className="space-y-1.5">
              <legend className="block text-sm font-medium text-slate-700">Mức độ ưu tiên</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["Thấp", "Trung bình", "Cao", "Khẩn cấp"] as TaskItem["priority"][]).map((lvl) => (
                  <label
                    key={lvl}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      priority === lvl
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
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

          {mode === "edit" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Trạng thái thực hiện</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setStatus(st);
                          if (st === "Hoàn thành" && progressPercent < 100) {
                            setProgressPercent(100);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors text-center ${
                          status === st
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Tiến độ hoàn thành</span>
                  <span className="font-mono font-bold text-emerald-800">{progressPercent}%</span>
                </div>
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {[0, 25, 50, 75, 90, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setProgressPercent(pct);
                        if (pct === 100 && status !== "Hoàn thành") {
                          setStatus("Hoàn thành");
                        }
                      }}
                      className={`py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors text-center ${
                        progressPercent === pct
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="task-desc-input" className="block text-sm font-medium text-slate-700">
              Nội dung chỉ đạo & yêu cầu kết quả
            </label>
            <textarea
              id="task-desc-input"
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ghi rõ địa điểm cụ thể (Tổ/hẻm), thời gian bắt đầu, yêu cầu đính kèm ảnh nghiệm thu hoặc biên bản..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {fileError && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              {fileError}
            </p>
          )}

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tài liệu & Hình ảnh hiện trường đính kèm
            </label>
            <AttachmentGallery
              attachments={attachments}
              onAddFiles={(files) => setAttachments((prev) => [...prev, ...files])}
              onRemoveFile={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
              onPreviewFile={setPreviewAtt}
              onFileError={setFileError}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/90 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" size="md" onClick={handleBack}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="emerald"
            size="md"
            leftIcon={mode === "edit" ? <Save size={16} /> : <Plus size={16} />}
          >
            {mode === "edit" ? "Lưu thay đổi nhiệm vụ" : "Giao nhiệm vụ ngay"}
          </Button>
        </div>
      </form>

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </div>
  );
}

