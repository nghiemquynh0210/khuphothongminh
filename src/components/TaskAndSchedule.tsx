import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  Flame,
  LayoutGrid,
  ListFilter,
  MapPin,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { RecurringReminder, ScheduleEvent, TaskAttachment, TaskItem } from "../types";
import { getStoredAssociations } from "../data/associationsData";
import { KP3_AREA_LIST, extractKp3Area } from "../utils/kp3Utils";
import {
  loadRemindersFromDb,
  loadSchedulesFromDb,
  syncRemindersToDb,
  syncSchedulesToDb,
  syncTasksDiffToDb,
} from "../utils/supabaseSync";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { Button, ConfirmModal, EmptyState, InlineNotice, ReportSelect } from "./ui";
import {
  INITIAL_REMINDERS,
  INITIAL_SCHEDULES,
  INITIAL_TASKS,
  REMINDER_STORAGE_KEY,
  SCHEDULE_STORAGE_KEY,
  SCHEDULE_TYPES,
  detectFileType,
  formatFileSize,
  formatFrequencyText,
  loadStoredTasks,
  saveStoredTasks,
} from "./tasks/tasksData";
import {
  getFrequencyBadge,
  getPriorityBadge,
  getReminderStatusBadge,
  getScheduleTypeBadge,
  getStatusBadge,
} from "./tasks/taskBadges";
import { CreateTaskModal, TaskDetailModal } from "./tasks/TaskModals";
import { CreateScheduleModal, ScheduleDetailModal } from "./tasks/ScheduleModals";
import { ReminderSection } from "./tasks/ReminderSection";

export {
  INITIAL_TASKS,
  INITIAL_SCHEDULES,
  INITIAL_REMINDERS,
  formatFileSize,
  detectFileType,
  formatFrequencyText,
  getFrequencyBadge,
  getReminderStatusBadge,
};

export interface TaskAndScheduleProps {
  tasks?: TaskItem[];
  onTasksChange?: (next: TaskItem[]) => void;
  creatorLabel?: string;
  basePath?: string;
  onOpenCreate?: () => void;
  onOpenEdit?: (task: TaskItem) => void;
  onOpenDetail?: (task: TaskItem) => void;
}

export default function TaskAndSchedule({
  tasks: externalTasks,
  onTasksChange,
  creatorLabel = "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
  basePath,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
}: TaskAndScheduleProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "schedules" | "reminders">("tasks");
  const [internalTasks, setInternalTasks] = useState<TaskItem[]>(loadStoredTasks);
  const tasks = externalTasks ?? internalTasks;

  const saveTasks = (next: TaskItem[]) => {
    if (onTasksChange) {
      onTasksChange(next);
    } else {
      syncTasksDiffToDb(internalTasks, next);
      setInternalTasks(next);
      saveStoredTasks(next);
    }
  };

  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => {
    try {
      const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SCHEDULES;
  });

  const saveSchedules = (next: ScheduleEvent[]) => {
    syncSchedulesToDb(schedules, next);
    setSchedules(next);
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const [recurringReminders, setRecurringReminders] = useState<RecurringReminder[]>(() => {
    try {
      const saved = localStorage.getItem(REMINDER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_REMINDERS;
  });

  const saveReminders = (next: RecurringReminder[]) => {
    syncRemindersToDb(recurringReminders, next);
    setRecurringReminders(next);
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    let active = true;
    loadSchedulesFromDb().then((rows) => {
      if (active && rows && rows.length > 0) {
        setSchedules(rows);
        try { localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(rows)); } catch {}
      }
    });
    loadRemindersFromDb().then((rows) => {
      if (active && rows && rows.length > 0) {
        setRecurringReminders(rows);
        try { localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(rows)); } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const [associationsList] = useState(() => getStoredAssociations());

  // Task filters & modals
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "list">("kanban");
  const [taskUnitFilter, setTaskUnitFilter] = useState("all");
  const [taskToFilter, setTaskToFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Schedule filters & modals
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState("all");
  const [scheduleMonthFilter, setScheduleMonthFilter] = useState("");
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEvent | null>(null);

  // Feedback banner & Confirm dialog
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "info" | "warning" } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    kind: "task" | "schedule" | "reminder";
    id: string;
    label: string;
  } | null>(null);

  const showNotice = (message: string, type: "success" | "info" | "warning" = "info") => {
    setNotice({ message, tone: type });
  };

  // KPI metrics
  const taskKpi = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Hoàn thành").length;
    const inProgress = tasks.filter((t) => t.status === "Đang thực hiện").length;
    const pendingReview = tasks.filter((t) => t.status === "Chờ nghiệm thu").length;
    const urgent = tasks.filter((t) => t.priority === "Khẩn cấp" && t.status !== "Hoàn thành").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pendingReview, urgent, completionRate };
  }, [tasks]);

  const scheduleKpi = useMemo(() => {
    const upcoming = schedules.filter((s) => s.status === "Sắp diễn ra").length;
    const done = schedules.filter((s) => s.status === "Đã kết thúc").length;
    return { total: schedules.length, upcoming, done };
  }, [schedules]);

  const reminderKpi = useMemo(() => {
    const total = recurringReminders.length;
    const active = recurringReminders.filter((r) => r.isActive).length;
    const due = recurringReminders.filter(
      (r) => r.isActive && (r.status === "Hôm nay đến hạn" || r.status === "Sắp đến hạn" || r.status === "Quá hạn")
    ).length;
    const submitted = recurringReminders.filter((r) => r.status === "Đã nộp kỳ này").length;
    return { total, active, due, submitted };
  }, [recurringReminders]);

  const filteredTasks = useMemo(() => {
    const q = taskSearchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchUnit = taskUnitFilter === "all" || t.unit === taskUnitFilter;
      const matchPriority = taskPriorityFilter === "all" || t.priority === taskPriorityFilter;
      const areaExtracted = extractKp3Area(`${t.unit} ${t.title} ${t.description}`);
      const matchTo = taskToFilter === "all" || areaExtracted === taskToFilter;
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.assignee.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      return matchUnit && matchPriority && matchTo && matchSearch;
    });
  }, [tasks, taskUnitFilter, taskPriorityFilter, taskToFilter, taskSearchQuery]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchType = scheduleTypeFilter === "all" || s.type === scheduleTypeFilter;
      const matchMonth = !scheduleMonthFilter || s.date.startsWith(scheduleMonthFilter);
      return matchType && matchMonth;
    });
  }, [schedules, scheduleTypeFilter, scheduleMonthFilter]);

  const unitFilterOptions = useMemo(() => {
    const uniqueUnits = Array.from(new Set(tasks.map((t) => t.unit))).filter(Boolean);
    return [{ value: "all", label: "Tất cả đơn vị" }, ...uniqueUnits.map((u) => ({ value: u, label: u }))];
  }, [tasks]);

  const handleMoveStatus = (taskId: string, nextStatus: TaskItem["status"]) => {
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: nextStatus,
            progressPercent: nextStatus === "Hoàn thành" ? 100 : nextStatus === "Chờ nghiệm thu" ? 90 : t.progressPercent,
            completedAt: nextStatus === "Hoàn thành" ? new Date().toISOString().slice(0, 10) : undefined,
          }
        : t
    );
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated.find((t) => t.id === taskId) || null);
    }
  };

  const handleUpdateProgress = (taskId: string, pct: number) => {
    const nextStatus: TaskItem["status"] =
      pct === 100 ? "Hoàn thành" : pct >= 85 ? "Chờ nghiệm thu" : pct > 0 ? "Đang thực hiện" : "Chờ xử lý";
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            progressPercent: pct,
            status: nextStatus,
            completedAt: pct === 100 ? new Date().toISOString().slice(0, 10) : undefined,
          }
        : t
    );
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated.find((t) => t.id === taskId) || null);
    }
  };

  const handleTaskAttachments = (taskId: string, files: TaskAttachment[]) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, attachments: [...(t.attachments || []), ...files] } : t
    );
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated.find((t) => t.id === taskId) || null);
    }
  };

  const handleRemoveTaskAttachment = (taskId: string, attId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, attachments: (t.attachments || []).filter((a) => a.id !== attId) } : t
    );
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated.find((t) => t.id === taskId) || null);
    }
  };

  const handleScheduleAttachments = (schId: string, files: TaskAttachment[]) => {
    const updated = schedules.map((s) =>
      s.id === schId ? { ...s, attachments: [...(s.attachments || []), ...files] } : s
    );
    saveSchedules(updated);
    if (selectedSchedule?.id === schId) {
      setSelectedSchedule(updated.find((s) => s.id === schId) || null);
    }
  };

  const handleRemoveScheduleAttachment = (schId: string, attId: string) => {
    const updated = schedules.map((s) =>
      s.id === schId ? { ...s, attachments: (s.attachments || []).filter((a) => a.id !== attId) } : s
    );
    saveSchedules(updated);
    if (selectedSchedule?.id === schId) {
      setSelectedSchedule(updated.find((s) => s.id === schId) || null);
    }
  };

  const executeConfirmDelete = () => {
    if (!confirmState) return;
    if (confirmState.kind === "task") {
      saveTasks(tasks.filter((t) => t.id !== confirmState.id));
      if (selectedTask?.id === confirmState.id) setSelectedTask(null);
      showNotice(`Đã xóa nhiệm vụ "${confirmState.label}".`, "info");
    } else if (confirmState.kind === "schedule") {
      saveSchedules(schedules.filter((s) => s.id !== confirmState.id));
      if (selectedSchedule?.id === confirmState.id) setSelectedSchedule(null);
      showNotice(`Đã xóa lịch công tác "${confirmState.label}".`, "info");
    } else if (confirmState.kind === "reminder") {
      saveReminders(recurringReminders.filter((r) => r.id !== confirmState.id));
      showNotice(`Đã xóa lịch nhắc báo cáo "${confirmState.label}".`, "info");
    }
    setConfirmState(null);
  };

  return (
    <div id="task-and-schedule-module" className="space-y-5">
      <PageHeader
        badgeIcon={<Sparkles size={14} className="text-emerald-700" />}
        badgeText="BAN ĐIỀU HÀNH • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="ĐIỀU HÀNH TÁC NGHIỆP"
        title="Lịch Công Tác & Phân Công Nhiệm Vụ"
        actions={
          <div
            role="tablist"
            aria-label="Phân khu công tác"
            className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto"
          >
            <button
              id="btn-subtab-tasks"
              type="button"
              role="tab"
              aria-selected={activeSubTab === "tasks"}
              onClick={() => setActiveSubTab("tasks")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeSubTab === "tasks"
                  ? "bg-white text-emerald-900 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <CheckSquare size={14} aria-hidden="true" />
              <span>Nhiệm vụ ({tasks.length})</span>
            </button>
            <button
              id="btn-subtab-schedules"
              type="button"
              role="tab"
              aria-selected={activeSubTab === "schedules"}
              onClick={() => setActiveSubTab("schedules")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeSubTab === "schedules"
                  ? "bg-white text-emerald-900 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <CalendarIcon size={14} aria-hidden="true" />
              <span>Lịch họp ({schedules.length})</span>
            </button>
            <button
              id="btn-subtab-reminders"
              type="button"
              role="tab"
              aria-selected={activeSubTab === "reminders"}
              onClick={() => setActiveSubTab("reminders")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeSubTab === "reminders"
                  ? "bg-white text-indigo-900 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Bell size={14} aria-hidden="true" />
              <span>Báo cáo định kỳ ({recurringReminders.length})</span>
              {reminderKpi.due > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-xs font-bold">
                  {reminderKpi.due}
                </span>
              )}
            </button>
          </div>
        }
      />

      {notice && (
        <InlineNotice
          type={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Adaptive 4 KPI Cards */}
      {activeSubTab === "tasks" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng nhiệm vụ KP3"
            value={taskKpi.total}
            icon={CheckSquare}
            color="indigo"
            subtext={`Hoàn thành ${taskKpi.completionRate}%`}
            subtextRight={`${taskKpi.completed}/${taskKpi.total} việc`}
          />
          <StatCard
            label="Đang thực hiện"
            value={taskKpi.inProgress}
            icon={Clock}
            color="blue"
            subtext="Tổ & Chi hội triển khai"
            subtextRight={`${taskKpi.pendingReview} chờ nghiệm thu`}
          />
          <StatCard
            label="Ưu tiên khẩn cấp"
            value={taskKpi.urgent}
            icon={Flame}
            color="rose"
            subtext="Cần bám sát tiến độ"
            subtextRight="Chưa xong"
          />
          <StatCard
            label="Đã hoàn thành"
            value={taskKpi.completed}
            icon={CheckCircle2}
            color="emerald"
            subtext="Nghiệm thu đạt"
            subtextRight={`${taskKpi.completionRate}% tổng số`}
          />
        </div>
      )}

      {activeSubTab === "schedules" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tổng lịch công tác" value={scheduleKpi.total} icon={CalendarIcon} color="indigo" subtext="Kỳ hiện tại" />
          <StatCard label="Sắp diễn ra" value={scheduleKpi.upcoming} icon={Clock} color="blue" subtext="Đã lên lịch" />
          <StatCard label="Đã hoàn tất" value={scheduleKpi.done} icon={CheckCircle2} color="emerald" subtext="Lưu biên bản" />
          <StatCard label="Báo cáo định kỳ đến hạn" value={reminderKpi.due} icon={Bell} color="amber" subtext="Cần nộp đúng kỳ" />
        </div>
      )}

      {activeSubTab === "reminders" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Lịch báo cáo định kỳ" value={reminderKpi.total} icon={Bell} color="indigo" subtext={`${reminderKpi.active} đang bật nhắc`} />
          <StatCard label="Đến hạn / sắp hạn" value={reminderKpi.due} icon={Clock} color="rose" subtext="Ưu tiên xử lý" />
          <StatCard label="Đã nộp kỳ này" value={reminderKpi.submitted} icon={CheckCircle2} color="emerald" subtext="Đúng quy định" />
          <StatCard label="Nhiệm vụ liên kết" value={taskKpi.total} icon={CheckSquare} color="blue" subtext="Trên Kanban KP3" />
        </div>
      )}

      {/* SUB-TAB 1: TASKS */}
      {activeSubTab === "tasks" && (
        <div className="space-y-4">
          <search className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 flex-1">
              <div className="relative min-w-0">
                <label htmlFor="task-search-input" className="sr-only">
                  Tìm kiếm nhiệm vụ
                </label>
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="task-search-input"
                  name="taskSearch"
                  type="search"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Tìm nhiệm vụ, cán bộ nhận..."
                  className="w-full h-11 md:h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <ReportSelect
                aria-label="Lọc theo đơn vị"
                value={taskUnitFilter}
                onChange={setTaskUnitFilter}
                className="w-full"
                options={unitFilterOptions}
              />

              <ReportSelect
                aria-label="Lọc theo khu vực KP3"
                value={taskToFilter}
                onChange={setTaskToFilter}
                className="w-full"
                options={[
                  { value: "all", label: "Toàn Khu phố 3" },
                  ...KP3_AREA_LIST.map((area) => ({ value: area, label: area })),
                ]}
              />

              <ReportSelect
                aria-label="Lọc theo mức độ ưu tiên"
                value={taskPriorityFilter}
                onChange={setTaskPriorityFilter}
                className="w-full"
                options={[
                  { value: "all", label: "Mọi mức độ" },
                  { value: "Khẩn cấp", label: "Khẩn cấp" },
                  { value: "Cao", label: "Ưu tiên cao" },
                  { value: "Trung bình", label: "Trung bình" },
                  { value: "Thấp", label: "Thấp" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
              <div
                role="group"
                aria-label="Chế độ xem nhiệm vụ"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={taskViewMode === "kanban"}
                  onClick={() => setTaskViewMode("kanban")}
                  className={`h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    taskViewMode === "kanban" ? "bg-white text-slate-900 border border-slate-200" : "text-slate-700"
                  }`}
                >
                  <LayoutGrid size={14} aria-hidden="true" />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  aria-pressed={taskViewMode === "list"}
                  onClick={() => setTaskViewMode("list")}
                  className={`h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    taskViewMode === "list" ? "bg-white text-slate-900 border border-slate-200" : "text-slate-700"
                  }`}
                >
                  <ListFilter size={14} aria-hidden="true" />
                  <span>Bảng</span>
                </button>
              </div>

              <Button
                id="btn-add-task-modal"
                variant="emerald"
                size="md"
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  if (onOpenCreate) {
                    onOpenCreate();
                  } else {
                    setEditingTask(null);
                    setShowAddTaskModal(true);
                  }
                }}
              >
                Giao việc mới
              </Button>
            </div>
          </search>

          {taskViewMode === "kanban" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(
                (statusCol) => {
                  const colTasks = filteredTasks.filter((t) => t.status === statusCol);
                  return (
                    <section
                      key={statusCol}
                      aria-label={statusCol}
                      className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 min-h-[380px]"
                    >
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                        {getStatusBadge(statusCol)}
                        <span className="text-xs font-bold text-slate-700">{colTasks.length}</span>
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {colTasks.length === 0 ? (
                          <div className="py-10 text-center text-xs text-slate-600">Chưa có nhiệm vụ</div>
                        ) : (
                          colTasks.map((task) => (
                            <article
                              key={task.id}
                              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 transition-colors space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-slate-600 font-semibold">{task.id}</span>
                                {getPriorityBadge(task.priority)}
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedTask(task)}
                                className="text-left w-full text-sm font-bold text-slate-900 hover:text-emerald-800 leading-snug cursor-pointer"
                              >
                                {task.title}
                              </button>

                              <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-700 font-medium">
                                  <span>Tiến độ</span>
                                  <span className="font-bold">{task.progressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      task.progressPercent === 100
                                        ? "bg-emerald-600"
                                        : task.progressPercent > 50
                                        ? "bg-sky-600"
                                        : "bg-amber-500"
                                    }`}
                                    style={{ width: `${task.progressPercent}%` }}
                                  />
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 gap-2">
                                <span className="inline-flex items-center gap-1 truncate font-medium">
                                  <User size={12} className="text-slate-500 shrink-0" />
                                  <span className="truncate">{task.assignee.name}</span>
                                </span>
                                <span className="font-mono text-slate-600 shrink-0">Hạn: {task.deadline.slice(5)}</span>
                              </div>

                              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onOpenDetail) {
                                        onOpenDetail(task);
                                      } else {
                                        setSelectedTask(task);
                                      }
                                    }}
                                    className="min-h-[32px] px-1.5 inline-flex items-center text-xs font-semibold text-indigo-800 hover:underline cursor-pointer whitespace-nowrap"
                                  >
                                    Chi tiết
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onOpenEdit) {
                                        onOpenEdit(task);
                                      } else {
                                        setEditingTask(task);
                                        setShowAddTaskModal(true);
                                      }
                                    }}
                                    className="min-h-[32px] px-1.5 inline-flex items-center text-xs font-semibold text-slate-700 hover:text-emerald-800 cursor-pointer"
                                    title="Sửa nhiệm vụ"
                                    aria-label={`Sửa nhiệm vụ ${task.title}`}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {statusCol !== "Chờ xử lý" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMoveStatus(
                                          task.id,
                                          statusCol === "Hoàn thành"
                                            ? "Chờ nghiệm thu"
                                            : statusCol === "Chờ nghiệm thu"
                                            ? "Đang thực hiện"
                                            : "Chờ xử lý"
                                        )
                                      }
                                      className="min-h-[32px] inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md cursor-pointer whitespace-nowrap"
                                    >
                                      ← Lùi
                                    </button>
                                  )}
                                  {statusCol !== "Hoàn thành" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMoveStatus(
                                          task.id,
                                          statusCol === "Chờ xử lý"
                                            ? "Đang thực hiện"
                                            : statusCol === "Đang thực hiện"
                                            ? "Chờ nghiệm thu"
                                            : "Hoàn thành"
                                        )
                                      }
                                      className="min-h-[32px] inline-flex items-center text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 rounded-md cursor-pointer whitespace-nowrap"
                                    >
                                      Tiến →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  );
                }
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Mã</th>
                      <th className="py-3 px-3">Nhiệm vụ</th>
                      <th className="py-3 px-3">Đơn vị & người nhận</th>
                      <th className="py-3 px-3">Ưu tiên</th>
                      <th className="py-3 px-3">Hạn</th>
                      <th className="py-3 px-3">Tiến độ</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-600">
                          Không có nhiệm vụ nào khớp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{t.id}</td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="font-bold text-slate-900 line-clamp-1">{t.title}</div>
                            <div className="text-slate-600 line-clamp-1">{t.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{t.assignee.name}</div>
                            <div className="text-slate-600">{t.unit}</div>
                          </td>
                          <td className="py-2.5 px-3">{getPriorityBadge(t.priority)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{t.deadline}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{t.progressPercent}%</td>
                          <td className="py-2.5 px-3">{getStatusBadge(t.status)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (onOpenDetail) {
                                    onOpenDetail(t);
                                  } else {
                                    setSelectedTask(t);
                                  }
                                }}
                              >
                                Chi tiết
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Sửa nhiệm vụ ${t.title}`}
                                title="Sửa nhiệm vụ"
                                onClick={() => {
                                  if (onOpenEdit) {
                                    onOpenEdit(t);
                                  } else {
                                    setEditingTask(t);
                                    setShowAddTaskModal(true);
                                  }
                                }}
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                variant="dangerGhost"
                                size="sm"
                                aria-label={`Xóa nhiệm vụ ${t.title}`}
                                onClick={() => setConfirmState({ kind: "task", id: t.id, label: t.title })}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SCHEDULES */}
      {activeSubTab === "schedules" && (
        <div className="space-y-4">
          <search className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
              <ReportSelect
                aria-label="Lọc theo loại sự kiện"
                value={scheduleTypeFilter}
                onChange={setScheduleTypeFilter}
                className="w-full sm:w-52"
                options={[
                  { value: "all", label: `Tất cả sự kiện (${schedules.length})` },
                  ...Array.from(new Set([...SCHEDULE_TYPES, ...schedules.map((s) => s.type)])).map((type) => ({
                    value: type,
                    label: type,
                  })),
                ]}
              />

              <div className="flex items-center gap-2">
                <label htmlFor="schedule-month-filter" className="text-xs font-semibold text-slate-700">
                  Tháng:
                </label>
                <input
                  id="schedule-month-filter"
                  type="month"
                  value={scheduleMonthFilter}
                  onChange={(e) => setScheduleMonthFilter(e.target.value)}
                  className="h-11 md:h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                {scheduleMonthFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setScheduleMonthFilter("")}>
                    Tất cả tháng
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="md" leftIcon={<Printer size={15} />} onClick={() => window.print()}>
                In lịch
              </Button>
              <Button
                id="btn-add-schedule-modal"
                variant="primary"
                size="md"
                leftIcon={<Plus size={15} />}
                onClick={() => {
                  setEditingSchedule(null);
                  setShowAddScheduleModal(true);
                }}
              >
                Thêm lịch họp mới
              </Button>
            </div>
          </search>

          {filteredSchedules.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={28} />}
              title="Không có lịch công tác trong tháng đã chọn"
              description="Chọn 'Tất cả tháng' hoặc tạo mới lịch họp Ban Điều hành / Chi hội đoàn thể KP3."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((sch) => (
                <article
                  key={sch.id}
                  className={`p-4 rounded-xl border bg-white flex flex-col justify-between gap-3 transition-colors ${
                    sch.status === "Đã kết thúc"
                      ? "border-slate-200 bg-slate-50/70"
                      : "border-slate-200 hover:border-indigo-400"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {getScheduleTypeBadge(sch.type)}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          sch.status === "Đang diễn ra"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : sch.status === "Sắp diễn ra"
                            ? "bg-sky-50 text-sky-900 border-sky-200"
                            : sch.status === "Đã hoãn"
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {sch.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSchedule(sch)}
                      className="text-left w-full text-sm font-bold text-slate-900 hover:text-indigo-800 leading-snug cursor-pointer"
                    >
                      {sch.title}
                    </button>

                    {(sch.description || sch.content) && (
                      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 line-clamp-2">
                        {sch.description || sch.content}
                      </p>
                    )}

                    <div className="space-y-1 text-xs text-slate-700">
                      <div className="inline-flex items-center gap-1.5 font-mono font-semibold text-indigo-800">
                        <CalendarIcon size={13} aria-hidden="true" />
                        <span>
                          {sch.date} • {sch.time}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin size={13} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{sch.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSchedule(sch)}>
                      Xem chi tiết
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Sửa lịch ${sch.title}`}
                        title="Sửa lịch họp"
                        onClick={() => {
                          setEditingSchedule(sch);
                          setShowAddScheduleModal(true);
                        }}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        aria-label={`Xóa lịch ${sch.title}`}
                        onClick={() => setConfirmState({ kind: "schedule", id: sch.id, label: sch.title })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: REMINDERS */}
      {activeSubTab === "reminders" && (
        <ReminderSection
          reminders={recurringReminders}
          associationsList={associationsList}
          onSaveReminders={saveReminders}
          onAutoCreateTask={(autoTask) => saveTasks([autoTask, ...tasks])}
          onNotify={showNotice}
          onRequestDelete={(rem) => setConfirmState({ kind: "reminder", id: rem.id, label: rem.title })}
        />
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={showAddTaskModal}
        onClose={() => {
          setShowAddTaskModal(false);
          setEditingTask(null);
        }}
        associationsList={associationsList}
        existingCount={tasks.length}
        creatorLabel={creatorLabel}
        editingTask={editingTask}
        onCreate={(savedTask) => {
          if (editingTask) {
            saveTasks(tasks.map((t) => (t.id === savedTask.id ? savedTask : t)));
            if (selectedTask?.id === savedTask.id) setSelectedTask(savedTask);
            setEditingTask(null);
            showNotice(`Đã cập nhật nhiệm vụ "${savedTask.title}".`, "success");
          } else {
            saveTasks([savedTask, ...tasks]);
            showNotice(`Đã giao nhiệm vụ "${savedTask.title}" cho ${savedTask.assignee.name}.`, "success");
          }
        }}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateStatus={handleMoveStatus}
        onUpdateProgress={handleUpdateProgress}
        onAddAttachments={handleTaskAttachments}
        onRemoveAttachment={handleRemoveTaskAttachment}
        onRequestEdit={(t) => {
          setSelectedTask(null);
          if (onOpenEdit) {
            onOpenEdit(t);
          } else {
            setEditingTask(t);
            setShowAddTaskModal(true);
          }
        }}
        onRequestDelete={(t) => setConfirmState({ kind: "task", id: t.id, label: t.title })}
      />

      <CreateScheduleModal
        isOpen={showAddScheduleModal}
        onClose={() => {
          setShowAddScheduleModal(false);
          setEditingSchedule(null);
        }}
        existingCount={schedules.length}
        editingSchedule={editingSchedule}
        onCreate={(savedSch) => {
          if (editingSchedule) {
            const updated = schedules
              .map((s) => (s.id === savedSch.id ? savedSch : s))
              .sort((a, b) => a.date.localeCompare(b.date));
            saveSchedules(updated);
            if (selectedSchedule?.id === savedSch.id) setSelectedSchedule(savedSch);
            setEditingSchedule(null);
            showNotice(`Đã cập nhật lịch "${savedSch.title}".`, "success");
          } else {
            const updated = [...schedules, savedSch].sort((a, b) => a.date.localeCompare(b.date));
            saveSchedules(updated);
            showNotice(`Đã thêm lịch "${savedSch.title}" vào ngày ${savedSch.date}.`, "success");
          }
        }}
      />

      <ScheduleDetailModal
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        onUpdateStatus={(schId, status) => {
          const updated = schedules.map((s) => (s.id === schId ? { ...s, status } : s));
          saveSchedules(updated);
          if (selectedSchedule?.id === schId) setSelectedSchedule({ ...selectedSchedule, status });
        }}
        onAddAttachments={handleScheduleAttachments}
        onRemoveAttachment={handleRemoveScheduleAttachment}
        onRequestEdit={(s) => {
          setSelectedSchedule(null);
          setEditingSchedule(s);
          setShowAddScheduleModal(true);
        }}
        onRequestDelete={(s) => setConfirmState({ kind: "schedule", id: s.id, label: s.title })}
      />

      <ConfirmModal
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={executeConfirmDelete}
        title="Xác nhận xóa dữ liệu"
        description={
          confirmState
            ? `Bạn có chắc muốn xóa "${confirmState.label}"? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xóa ngay"
      />
    </div>
  );
}
