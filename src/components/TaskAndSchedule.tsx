import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  FileSpreadsheet,
  FileUp,
  Flame,
  LayoutGrid,
  List,
  ListFilter,
  MapPin,
  Megaphone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { Association, RecurringReminder, ScheduleEvent, TaskAttachment, TaskItem } from "../types";
import { getStoredAssociations } from "../data/associationsData";
import { KP3_AREA_LIST, extractKp3Area, formatShortRecordId, formatVNDate } from "../utils/kp3Utils";
import { recordAuditLog } from "../utils/auditLogger";
import {
  loadRemindersFromDb,
  loadSchedulesFromDb,
  syncRemindersToDb,
  syncSchedulesToDb,
  syncTasksDiffToDb,
} from "../utils/supabaseSync";
import {
  reconcileRemindersWithAssociations,
  reconcileSchedulesWithAssociations,
  reconcileTasksWithAssociations,
} from "../utils/taskScheduleRoleSync";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { MobileSubpageShell } from "./mobile/MobileSubpageShell";
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
import { WardScheduleOcrModal } from "./tasks/WardScheduleOcrModal";
import { RescheduleAndDelegateModal } from "./tasks/RescheduleAndDelegateModal";
import { WeeklyScheduleMatrix } from "./tasks/WeeklyScheduleMatrix";
import { CitizenBroadcastTab, BroadcastSeedSource } from "./tasks/CitizenBroadcastTab";

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
  associationsList?: Association[];
  basePath?: string;
  onOpenCreate?: () => void;
  onOpenEdit?: (task: TaskItem) => void;
  onOpenDetail?: (task: TaskItem) => void;
  activeSubTab?: "tasks" | "schedules" | "reminders" | "broadcast";
  onActiveSubTabChange?: (tab: "tasks" | "schedules" | "reminders" | "broadcast") => void;
  taskViewMode?: "kanban" | "list";
  onTaskViewModeChange?: (mode: "kanban" | "list") => void;
}

export default function TaskAndSchedule({
  tasks: externalTasks,
  onTasksChange,
  creatorLabel = "Bí thư Chi bộ KP3",
  associationsList: externalAssociations,
  basePath,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
  activeSubTab: activeSubTabProp,
  onActiveSubTabChange,
  taskViewMode: taskViewModeProp,
  onTaskViewModeChange,
}: TaskAndScheduleProps = {}) {
  const [internalSubTab, setInternalSubTab] = useState<"tasks" | "schedules" | "reminders" | "broadcast">("tasks");
  const activeSubTab = activeSubTabProp ?? internalSubTab;
  const setActiveSubTab = (tab: "tasks" | "schedules" | "reminders" | "broadcast") => {
    setInternalSubTab(tab);
    onActiveSubTabChange?.(tab);
  };
  const [broadcastSeed, setBroadcastSeed] = useState<BroadcastSeedSource | null>(null);

  const openBroadcastFromSchedule = (sch: ScheduleEvent) => {
    setBroadcastSeed({
      kind: "schedule",
      id: sch.id,
      title: sch.title,
      date: sch.date,
      time: sch.time,
      location: sch.location,
      description: sch.description || sch.content,
      hostOrAssignee: sch.host,
      unit: sch.attendees,
      nonce: Date.now(),
    });
    setActiveSubTab("broadcast");
  };

  const openBroadcastFromTask = (t: TaskItem) => {
    setBroadcastSeed({
      kind: "task",
      id: t.id,
      title: t.title,
      date: t.deadline,
      description: t.description,
      hostOrAssignee: t.assignee?.name,
      unit: t.unit,
      nonce: Date.now(),
    });
    setActiveSubTab("broadcast");
  };
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kp3:schedules-updated", { detail: next }));
    }
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

  const associationsList = useMemo(
    () =>
      externalAssociations && externalAssociations.length > 0
        ? externalAssociations
        : getStoredAssociations(),
    [externalAssociations]
  );

  useEffect(() => {
    let active = true;
    loadSchedulesFromDb().then((rows) => {
      if (active && rows && rows.length > 0) {
        const currentAssocs =
          externalAssociations && externalAssociations.length > 0
            ? externalAssociations
            : getStoredAssociations();
        const { schedules: syncedRows, changed } = reconcileSchedulesWithAssociations(
          rows,
          currentAssocs
        );
        if (changed) {
          syncSchedulesToDb(rows, syncedRows);
        }
        setSchedules(syncedRows);
        try {
          localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(syncedRows));
        } catch {}
      }
    });
    loadRemindersFromDb().then((rows) => {
      if (active && rows && rows.length > 0) {
        const currentAssocs =
          externalAssociations && externalAssociations.length > 0
            ? externalAssociations
            : getStoredAssociations();
        const { reminders: syncedRem, changed } = reconcileRemindersWithAssociations(
          rows,
          currentAssocs
        );
        if (changed) {
          syncRemindersToDb(rows, syncedRem);
        }
        setRecurringReminders(syncedRem);
        try {
          localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(syncedRem));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Tự động đồng bộ liên thông chức vụ Lịch & Nhiệm vụ ngay khi Quản lý Chi hội thay đổi
  useEffect(() => {
    if (!associationsList || associationsList.length === 0) return;

    setSchedules((prev) => {
      const { schedules: next, changed } = reconcileSchedulesWithAssociations(
        prev,
        associationsList
      );
      if (!changed) return prev;
      syncSchedulesToDb(prev, next);
      try {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setRecurringReminders((prev) => {
      const { reminders: next, changed } = reconcileRemindersWithAssociations(
        prev,
        associationsList
      );
      if (!changed) return prev;
      syncRemindersToDb(prev, next);
      try {
        localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    const { tasks: nextTasks, changed: tasksChanged } = reconcileTasksWithAssociations(
      tasks,
      associationsList
    );
    if (tasksChanged) {
      saveTasks(nextTasks);
    }
  }, [associationsList]);

  // Task filters & modals
  const [internalTaskViewMode, setInternalTaskViewMode] = useState<"kanban" | "list">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "kanban"
  );
  const taskViewMode = taskViewModeProp ?? internalTaskViewMode;
  const setTaskViewMode = (mode: "kanban" | "list") => {
    setInternalTaskViewMode(mode);
    onTaskViewModeChange?.(mode);
  };
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [taskUnitFilter, setTaskUnitFilter] = useState("all");
  const [taskToFilter, setTaskToFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [showTaskFilters, setShowTaskFilters] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Schedule filters, view mode, AI OCR & Reschedule modals
  const [scheduleViewMode, setScheduleViewMode] = useState<"weekly" | "cards">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "weekly"
  );
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>("all");
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState("all");
  const [scheduleMonthFilter, setScheduleMonthFilter] = useState("");
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showWardOcrModal, setShowWardOcrModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEvent | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    schedule: ScheduleEvent;
    mode: "reschedule" | "delegate" | "postpone";
  } | null>(null);
  const [focusScheduleDate, setFocusScheduleDate] = useState<string | null>(null);

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

  const kp3Schedules = useMemo(
    () => schedules.filter((s) => s.relevanceTier !== "ward_reference"),
    [schedules]
  );

  const scheduleKpi = useMemo(() => {
    const upcoming = kp3Schedules.filter((s) => s.status === "Sắp diễn ra").length;
    const done = kp3Schedules.filter((s) => s.status === "Đã kết thúc").length;
    const adjusted = kp3Schedules.filter(
      (s) => (s.rescheduleCount || 0) > 0 || s.status === "Đã hoãn"
    ).length;
    const wardRefCount = schedules.length - kp3Schedules.length;
    return {
      total: kp3Schedules.length,
      upcoming,
      done,
      adjusted,
      wardRefCount,
    };
  }, [kp3Schedules, schedules.length]);

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
      const matchStatus = taskStatusFilter === "all" || t.status === taskStatusFilter;
      const matchUnit = taskUnitFilter === "all" || t.unit === taskUnitFilter;
      const matchPriority = taskPriorityFilter === "all" || t.priority === taskPriorityFilter;
      const areaExtracted = extractKp3Area(`${t.unit} ${t.title} ${t.description}`);
      const matchTo = taskToFilter === "all" || areaExtracted === taskToFilter;
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.assignee.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      return matchStatus && matchUnit && matchPriority && matchTo && matchSearch;
    });
  }, [tasks, taskStatusFilter, taskUnitFilter, taskPriorityFilter, taskToFilter, taskSearchQuery]);

  const filteredSchedules = useMemo(() => {
    const q = scheduleSearchQuery.trim().toLowerCase();
    return kp3Schedules.filter((s) => {
      const matchStatus =
        scheduleStatusFilter === "all"
          ? true
          : scheduleStatusFilter === "__ADJUSTED__"
          ? (s.rescheduleCount || 0) > 0 || s.status === "Đã hoãn"
          : s.status === scheduleStatusFilter;
      const matchType = scheduleTypeFilter === "all" || s.type === scheduleTypeFilter;
      const matchMonth = !scheduleMonthFilter || s.date.startsWith(scheduleMonthFilter);
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.content || "").toLowerCase().includes(q);
      return matchStatus && matchType && matchMonth && matchSearch;
    });
  }, [kp3Schedules, scheduleStatusFilter, scheduleTypeFilter, scheduleMonthFilter, scheduleSearchQuery]);

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

  const handleExportTasksAndSchedulesExcel = () => {
    const taskRows = tasks.map((t) => ({
      "Mã NV": formatShortRecordId(t.id, "NV"),
      "Tiêu đề nhiệm vụ": t.title,
      "Đơn vị thực hiện": t.unit,
      "Người phụ trách": t.assignee.name,
      "Chức vụ": t.assignee.role,
      "SĐT": t.assignee.phone || "",
      "Ưu tiên": t.priority,
      "Tiến độ (%)": t.progressPercent,
      "Hạn hoàn thành": formatVNDate(t.deadline),
      "Trạng thái": t.status,
      "Người giao": t.creator,
    }));

    const scheduleRows = kp3Schedules.map((s) => ({
      "Mã lịch": s.id,
      "Ngày": formatVNDate(s.date),
      "Khung giờ": s.time,
      "Tên lịch công tác": s.title,
      "Phân loại": s.type,
      "Địa điểm": s.location,
      "Chủ trì": s.host,
      "Thành phần": s.attendees,
      "Công khai Cổng Cư dân": (s as ScheduleEvent & { isPublicCitizenVisible?: boolean }).isPublicCitizenVisible
        ? "Có"
        : "Nội bộ",
      "Trạng thái": s.status,
    }));

    const reminderRows = recurringReminders.map((r) => ({
      "Mã nhắc": r.id,
      "Báo cáo định kỳ": r.title,
      "Chu kỳ": formatFrequencyText(r),
      "Cơ quan nhận": r.recipientOrg,
      "Đơn vị phụ trách": r.responsibleUnit,
      "Cán bộ phụ trách": r.responsiblePerson.name,
      "Hạn kế tiếp": formatVNDate(r.nextDueDate),
      "Trạng thái": r.status,
    }));

    const wb = XLSX.utils.book_new();
    const wsTasks = XLSX.utils.json_to_sheet(taskRows);
    wsTasks["!cols"] = [
      { wch: 12 },
      { wch: 38 },
      { wch: 24 },
      { wch: 22 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 16 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTasks, "NhiemVu_KP3");

    const wsSchedules = XLSX.utils.json_to_sheet(scheduleRows);
    wsSchedules["!cols"] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 36 },
      { wch: 22 },
      { wch: 28 },
      { wch: 26 },
      { wch: 30 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSchedules, "LichCongTac_KP3");

    const wsReminders = XLSX.utils.json_to_sheet(reminderRows);
    XLSX.utils.book_append_sheet(wb, wsReminders, "BaoCaoDinhKy");

    const fileName = `Nhiem_vu_va_Lich_cong_tac_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    recordAuditLog({
      actorName: creatorLabel,
      actorRole: "Ban Điều hành Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất Excel Nhiệm vụ & Lịch công tác (.xlsx)",
      targetSummary: `${tasks.length} nhiệm vụ, ${kp3Schedules.length} lịch công tác (${fileName})`,
    });

    showNotice(`Đã xuất báo cáo Nhiệm vụ & Lịch công tác ra tệp ${fileName}!`, "success");
  };

  return (
    <div id="task-and-schedule-module" className="space-y-3 md:space-y-4 text-xs">
      {/* MOBILE NATIVE RED BRONZE-DRUM APP BAR & SUB-TABS */}
      <MobileSubpageShell
        title="Lịch & Nhiệm vụ KP3"
        subtitle={`${tasks.length} nhiệm vụ • ${kp3Schedules.length} lịch công tác`}
        primaryActionLabel={activeSubTab === "schedules" ? "Thêm lịch" : "Giao việc"}
        onPrimaryAction={() => {
          if (activeSubTab === "schedules") {
            setEditingSchedule(null);
            setShowAddScheduleModal(true);
          } else if (onOpenCreate) {
            onOpenCreate();
          } else {
            setEditingTask(null);
            setShowAddTaskModal(true);
          }
        }}
        subTabs={[
          { id: "tasks", label: `Nhiệm vụ (${tasks.length})` },
          { id: "schedules", label: `Lịch họp (${kp3Schedules.length})` },
          { id: "reminders", label: "Định kỳ" },
          { id: "broadcast", label: "Thông báo" },
        ]}
        activeSubTab={activeSubTab}
        onSubTabChange={(t) => setActiveSubTab(t as any)}
        sheetTitle="Công cụ Lịch & Nhiệm vụ"
        sheetActions={[
          {
            id: "ai_ward_ocr",
            label: "AI Đọc Lịch làm việc Phường (PDF / Ảnh)",
            description: "Tự động bóc tách lịch Đảng ủy & UBND Phường sang lịch KP3",
            icon: <Sparkles size={18} className="text-indigo-600" />,
            tone: "emerald",
            onClick: () => setShowWardOcrModal(true),
          },
          {
            id: "export_tasks",
            label: "Xuất Excel Nhiệm vụ & Lịch (.xlsx)",
            description: "Tổng hợp tiến độ công việc & lịch công tác Khu phố 3",
            icon: <FileSpreadsheet size={18} className="text-slate-700" />,
            onClick: handleExportTasksAndSchedulesExcel,
          },
        ]}
      />

      <div className="hidden md:block">
      <PageHeader
        title="Lịch Công Tác & Phân Công Nhiệm Vụ"
        description="Điều hành lịch tuần cán bộ, phân công nhiệm vụ, báo cáo định kỳ và phát thông báo Khu phố 3"
        actions={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportTasksAndSchedulesExcel}
              className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet size={14} className="text-slate-500 shrink-0" />
              <span>Xuất Excel</span>
            </button>
            <button
              id="btn-open-ward-schedule-ocr"
              type="button"
              onClick={() => setShowWardOcrModal(true)}
              className="h-9 px-3 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Tải PDF / Ảnh Lịch Đảng ủy & UBND Phường để AI tự lên lịch cán bộ KP3"
            >
              <Sparkles size={14} className="text-indigo-600 shrink-0" />
              <span>AI Đọc lịch Phường</span>
            </button>
            {activeSubTab === "tasks" && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenCreate) {
                    onOpenCreate();
                  } else {
                    setEditingTask(null);
                    setShowAddTaskModal(true);
                  }
                }}
                className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} className="shrink-0" />
                <span>Giao việc mới</span>
              </button>
            )}
            {activeSubTab === "schedules" && (
              <button
                type="button"
                onClick={() => {
                  setEditingSchedule(null);
                  setShowAddScheduleModal(true);
                }}
                className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} className="shrink-0" />
                <span>Thêm lịch họp</span>
              </button>
            )}
          </div>
        }
      />
      </div>

      {notice && (
        <InlineNotice
          type={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Adaptive 4 KPI Cards (Desktop only) */}
      {activeSubTab === "tasks" && (
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          <StatCard
            label="Tổng nhiệm vụ KP3"
            value={taskKpi.total}
            badge="việc"
            icon={CheckSquare}
            color="slate"
            highlighted={taskStatusFilter === "all" && taskPriorityFilter === "all"}
            onClick={() => {
              setTaskStatusFilter("all");
              setTaskPriorityFilter("all");
            }}
          />
          <StatCard
            label="Đang thực hiện"
            value={taskKpi.inProgress}
            badge={taskKpi.pendingReview > 0 ? `${taskKpi.pendingReview} chờ duyệt` : "việc"}
            icon={Clock}
            color="slate"
            highlighted={taskStatusFilter === "Đang thực hiện"}
            onClick={() =>
              setTaskStatusFilter((prev) => (prev === "Đang thực hiện" ? "all" : "Đang thực hiện"))
            }
          />
          <StatCard
            label="Ưu tiên khẩn cấp"
            value={taskKpi.urgent}
            badge="việc"
            icon={Flame}
            color="rose"
            highlighted={taskPriorityFilter === "Khẩn cấp"}
            onClick={() =>
              setTaskPriorityFilter((prev) => (prev === "Khẩn cấp" ? "all" : "Khẩn cấp"))
            }
          />
          <StatCard
            label="Đã hoàn thành"
            value={taskKpi.completed}
            badge={`${taskKpi.completionRate}%`}
            icon={CheckCircle2}
            color="emerald"
            highlighted={taskStatusFilter === "Hoàn thành"}
            onClick={() =>
              setTaskStatusFilter((prev) => (prev === "Hoàn thành" ? "all" : "Hoàn thành"))
            }
          />
        </div>
      )}

      {activeSubTab === "schedules" && (
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          <StatCard
            label="Tổng lịch cán bộ KP3"
            value={scheduleKpi.total}
            badge="lịch"
            icon={CalendarIcon}
            color="slate"
            highlighted={scheduleStatusFilter === "all"}
            onClick={() => setScheduleStatusFilter("all")}
          />
          <StatCard
            label="Sắp diễn ra"
            value={scheduleKpi.upcoming}
            badge="lịch"
            icon={Clock}
            color="slate"
            highlighted={scheduleStatusFilter === "Sắp diễn ra"}
            onClick={() =>
              setScheduleStatusFilter((prev) => (prev === "Sắp diễn ra" ? "all" : "Sắp diễn ra"))
            }
          />
          <StatCard
            label="Điều chỉnh / Tạm hoãn"
            value={scheduleKpi.adjusted}
            badge="lịch"
            icon={RefreshCw}
            color="amber"
            highlighted={scheduleStatusFilter === "__ADJUSTED__"}
            onClick={() => {
              setScheduleViewMode("cards");
              setScheduleStatusFilter((prev) => (prev === "__ADJUSTED__" ? "all" : "__ADJUSTED__"));
            }}
          />
          <StatCard
            label="Đã hoàn tất"
            value={scheduleKpi.done}
            badge="lịch"
            icon={CheckCircle2}
            color="emerald"
            highlighted={scheduleStatusFilter === "Đã kết thúc"}
            onClick={() =>
              setScheduleStatusFilter((prev) => (prev === "Đã kết thúc" ? "all" : "Đã kết thúc"))
            }
          />
        </div>
      )}

      {activeSubTab === "reminders" && (
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          <StatCard label="Lịch báo cáo định kỳ" value={reminderKpi.total} badge={`${reminderKpi.active} đang bật`} icon={Bell} color="slate" />
          <StatCard label="Đến hạn / sắp hạn" value={reminderKpi.due} badge="báo cáo" icon={Clock} color="rose" />
          <StatCard label="Đã nộp kỳ này" value={reminderKpi.submitted} badge="báo cáo" icon={CheckCircle2} color="emerald" />
          <StatCard
            label="Nhiệm vụ liên kết"
            value={taskKpi.total}
            badge="việc"
            icon={CheckSquare}
            color="slate"
            onClick={() => setActiveSubTab("tasks")}
          />
        </div>
      )}

      {/* Compact Segmented Sub-Tab Bar (Desktop only — Mobile uses Red AppBar Sub-Tabs) */}
      <div
        role="tablist"
        aria-label="Phân khu công tác"
        className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 w-fit max-w-full overflow-x-auto whitespace-nowrap evon-scroll"
      >
        <button
          id="btn-subtab-tasks"
          type="button"
          role="tab"
          aria-selected={activeSubTab === "tasks"}
          onClick={() => setActiveSubTab("tasks")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === "tasks"
              ? "bg-white text-slate-900 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckSquare size={13} className={activeSubTab === "tasks" ? "text-emerald-700" : "text-slate-500"} aria-hidden="true" />
          <span>Nhiệm vụ ({tasks.length})</span>
        </button>
        <button
          id="btn-subtab-schedules"
          type="button"
          role="tab"
          aria-selected={activeSubTab === "schedules"}
          onClick={() => setActiveSubTab("schedules")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === "schedules"
              ? "bg-white text-slate-900 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarIcon size={13} className={activeSubTab === "schedules" ? "text-emerald-700" : "text-slate-500"} aria-hidden="true" />
          <span>
            Lịch công tác ({schedules.filter((s) => s.relevanceTier !== "ward_reference").length})
          </span>
        </button>
        <button
          id="btn-subtab-reminders"
          type="button"
          role="tab"
          aria-selected={activeSubTab === "reminders"}
          onClick={() => setActiveSubTab("reminders")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === "reminders"
              ? "bg-white text-slate-900 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bell size={13} className={activeSubTab === "reminders" ? "text-emerald-700" : "text-slate-500"} aria-hidden="true" />
          <span>Báo cáo định kỳ ({recurringReminders.length})</span>
          {reminderKpi.due > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
              {reminderKpi.due}
            </span>
          )}
        </button>
        <button
          id="btn-subtab-broadcast"
          type="button"
          role="tab"
          aria-selected={activeSubTab === "broadcast"}
          onClick={() => setActiveSubTab("broadcast")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === "broadcast"
              ? "bg-white text-slate-900 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Megaphone size={13} aria-hidden="true" className={activeSubTab === "broadcast" ? "text-emerald-700" : "text-slate-500"} />
          <span>Phát thông báo</span>
        </button>
      </div>

      {/* SUB-TAB 1: TASKS */}
      {activeSubTab === "tasks" && (
        <div className="space-y-3.5">
          <search className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-0">
                <label htmlFor="task-search-input" className="sr-only">
                  Tìm kiếm nhiệm vụ
                </label>
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="task-search-input"
                  name="taskSearch"
                  type="search"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Tìm nhiệm vụ, cán bộ nhận..."
                  className="w-full h-9 pl-9 pr-3 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTaskFilters((v) => !v)}
                  className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    showTaskFilters ||
                    taskUnitFilter !== "all" ||
                    taskToFilter !== "all" ||
                    taskPriorityFilter !== "all"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ListFilter size={13} />
                  <span>Bộ lọc</span>
                </button>

                <div
                  role="group"
                  aria-label="Chế độ xem nhiệm vụ"
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={taskViewMode === "kanban"}
                    onClick={() => setTaskViewMode("kanban")}
                    className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      taskViewMode === "kanban" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    <LayoutGrid size={13} aria-hidden="true" />
                    <span>Kanban</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={taskViewMode === "list"}
                    onClick={() => setTaskViewMode("list")}
                    className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      taskViewMode === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    <List size={13} aria-hidden="true" />
                    <span>Bảng</span>
                  </button>
                </div>

                <Button
                  id="btn-add-task-modal"
                  variant="emerald"
                  size="sm"
                  leftIcon={<Plus size={15} />}
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
            </div>

            {(showTaskFilters ||
              taskUnitFilter !== "all" ||
              taskToFilter !== "all" ||
              taskPriorityFilter !== "all") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-slate-100">
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
            )}
          </search>

          {taskViewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3.5">
              {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(
                (statusCol) => {
                  const colTasks = filteredTasks.filter((t) => t.status === statusCol);
                  return (
                    <section
                      key={statusCol}
                      aria-label={statusCol}
                      className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 min-h-[340px]"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/80">
                        {getStatusBadge(statusCol)}
                        <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {colTasks.length === 0 ? (
                          <div className="py-10 text-center text-xs text-slate-400">Chưa có nhiệm vụ</div>
                        ) : (
                          colTasks.map((task) => {
                            const openTaskDetail = () => {
                              if (onOpenDetail) {
                                onOpenDetail(task);
                              } else {
                                setSelectedTask(task);
                              }
                            };
                            return (
                            <article
                              key={task.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Xem chi tiết nhiệm vụ ${task.title}`}
                              onClick={openTaskDetail}
                              onKeyDown={(e) => {
                                if (e.target !== e.currentTarget) return;
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openTaskDetail();
                                }
                              }}
                              className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-2xs transition-all space-y-2 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono text-slate-500 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80" title={task.id}>
                                  {formatShortRecordId(task.id, "NV")}
                                </span>
                                {getPriorityBadge(task.priority)}
                              </div>

                              <h3 className="text-left w-full text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-emerald-800 leading-snug transition-colors">
                                {task.title}
                              </h3>

                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>

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

                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-x-2 gap-y-1 min-w-0">
                                <span className="inline-flex items-center gap-1.5 min-w-0 font-semibold text-slate-800">
                                  <User size={12} className="text-slate-500 shrink-0" />
                                  <span className="min-w-0 break-words">{task.assignee.name}</span>
                                </span>
                                <span className="font-mono text-slate-600 shrink-0">Hạn: {formatVNDate(task.deadline)}</span>
                              </div>

                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5"
                              >
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={openTaskDetail}
                                    className="min-h-[32px] px-1.5 inline-flex items-center text-xs font-semibold text-indigo-800 hover:underline cursor-pointer whitespace-nowrap"
                                  >
                                    Chi tiết
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openBroadcastFromTask(task)}
                                    className="min-h-[32px] px-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                                    title="AI soạn thông báo Zalo OA & Cổng Cư dân từ nhiệm vụ này"
                                    aria-label={`Soạn thông báo từ nhiệm vụ ${task.title}`}
                                  >
                                    <Megaphone size={13} />
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
                                <div className="flex flex-wrap items-center gap-1.5">
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
                            );
                          })
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
                <table className="w-full min-w-[920px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Mã</th>
                      <th className="py-3 px-3 min-w-[220px]">Nhiệm vụ</th>
                      <th className="py-3 px-3 min-w-[160px]">Đơn vị &amp; người nhận</th>
                      <th className="py-3 px-3">Ưu tiên</th>
                      <th className="py-3 px-3">Hạn</th>
                      <th className="py-3 px-3">Tiến độ</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3 text-right sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)]">Thao tác</th>
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
                      filteredTasks.map((t) => {
                        const openTaskRow = () => {
                          if (onOpenDetail) {
                            onOpenDetail(t);
                          } else {
                            setSelectedTask(t);
                          }
                        };
                        return (
                        <tr
                          key={t.id}
                          tabIndex={0}
                          onClick={openTaskRow}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openTaskRow();
                            }
                          }}
                          className="cursor-pointer hover:bg-emerald-50/40 transition-colors group"
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap" title={t.id}>
                            {formatShortRecordId(t.id, "NV")}
                          </td>
                          <td className="py-2.5 px-3 min-w-[220px] max-w-xs">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-800 line-clamp-1 transition-colors">{t.title}</div>
                            <div className="text-slate-600 line-clamp-1">{t.description}</div>
                          </td>
                          <td className="py-2.5 px-3 min-w-[160px]">
                            <div className="font-semibold text-slate-900">{t.assignee.name}</div>
                            <div className="text-slate-600">{t.unit}</div>
                          </td>
                          <td className="py-2.5 px-3">{getPriorityBadge(t.priority)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{formatVNDate(t.deadline)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{t.progressPercent}%</td>
                          <td className="py-2.5 px-3">{getStatusBadge(t.status)}</td>
                          <td className="py-2.5 px-3 text-right sticky right-0 bg-white group-hover:bg-emerald-50 z-10 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.06)]" onClick={(e) => e.stopPropagation()}>
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
                                title="AI soạn thông báo từ nhiệm vụ này"
                                aria-label={`Soạn thông báo từ nhiệm vụ ${t.title}`}
                                onClick={() => openBroadcastFromTask(t)}
                              >
                                <Megaphone size={14} className="text-emerald-700" />
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
                        );
                      })
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
        <div className="space-y-3.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1">
              <div
                role="group"
                aria-label="Chế độ xem lịch công tác"
                className="inline-flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 self-start"
              >
                <button
                  id="btn-schedule-view-weekly"
                  type="button"
                  onClick={() => setScheduleViewMode("weekly")}
                  className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    scheduleViewMode === "weekly"
                      ? "bg-white text-slate-900 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarIcon size={13} className={scheduleViewMode === "weekly" ? "text-emerald-700" : "text-slate-500"} />
                  <span>Lịch Tuần (Sáng / Chiều)</span>
                </button>
                <button
                  id="btn-schedule-view-cards"
                  type="button"
                  onClick={() => setScheduleViewMode("cards")}
                  className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    scheduleViewMode === "cards"
                      ? "bg-white text-slate-900 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid size={13} className={scheduleViewMode === "cards" ? "text-emerald-700" : "text-slate-500"} />
                  <span>Thẻ Danh Sách ({kp3Schedules.length})</span>
                </button>
              </div>

              {scheduleViewMode === "cards" && (
                <>
                  <div className="relative min-w-[200px] flex-1 max-w-xs">
                    <label htmlFor="schedule-search-input" className="sr-only">
                      Tìm kiếm lịch họp
                    </label>
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="schedule-search-input"
                      type="search"
                      value={scheduleSearchQuery}
                      onChange={(e) => setScheduleSearchQuery(e.target.value)}
                      placeholder="Tìm tên cuộc họp, địa điểm..."
                      className="w-full h-9 pl-9 pr-3 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <ReportSelect
                    aria-label="Lọc theo loại sự kiện"
                    value={scheduleTypeFilter}
                    onChange={setScheduleTypeFilter}
                    className="w-full sm:w-52"
                    options={[
                      { value: "all", label: `Tất cả sự kiện (${kp3Schedules.length})` },
                      ...Array.from(new Set([...SCHEDULE_TYPES, ...kp3Schedules.map((s) => s.type)])).map((type) => ({
                        value: type,
                        label: type,
                      })),
                    ]}
                  />

                  <div className="flex items-center gap-2">
                    <label htmlFor="schedule-month-filter" className="text-xs font-semibold text-slate-600">
                      Tháng:
                    </label>
                    <input
                      id="schedule-month-filter"
                      type="month"
                      value={scheduleMonthFilter}
                      onChange={(e) => setScheduleMonthFilter(e.target.value)}
                      className="h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    {scheduleMonthFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setScheduleMonthFilter("")}>
                        Tất cả
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" leftIcon={<Printer size={13} />} onClick={() => window.print()}>
                In lịch
              </Button>
              <Button
                id="btn-add-schedule-modal"
                variant="emerald"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => {
                  setEditingSchedule(null);
                  setShowAddScheduleModal(true);
                }}
              >
                Thêm lịch họp mới
              </Button>
            </div>
          </div>

          {scheduleViewMode === "weekly" ? (
            <WeeklyScheduleMatrix
              schedules={schedules}
              associations={associationsList}
              focusDate={focusScheduleDate}
              onSelectSchedule={setSelectedSchedule}
              onOpenReschedule={(sch, mode = "reschedule") =>
                setRescheduleTarget({ schedule: sch, mode })
              }
              onEditSchedule={(sch) => {
                setEditingSchedule(sch);
                setShowAddScheduleModal(true);
              }}
              onDraftBroadcast={openBroadcastFromSchedule}
              onNotify={showNotice}
            />
          ) : filteredSchedules.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={28} />}
              title="Không có lịch công tác khớp bộ lọc hiện tại"
              description="Chọn 'Tất cả sự kiện', xóa bộ lọc tháng hoặc bấm 'AI Đọc lịch Phường' để tự động lên lịch tuần."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((sch) => {
                const isRescheduled =
                  (sch.rescheduleCount || 0) > 0 &&
                  Boolean(
                    (sch.originalDate && sch.originalDate !== sch.date) ||
                      (sch.originalTime && sch.originalTime !== sch.time)
                  );
                return (
                  <article
                    key={sch.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Xem chi tiết lịch công tác ${sch.title}`}
                    onClick={() => setSelectedSchedule(sch)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSchedule(sch);
                      }
                    }}
                    className={`p-4 rounded-xl border bg-white flex flex-col justify-between gap-3 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      sch.status === "Đã hoãn"
                        ? "border-amber-300 bg-amber-50/40"
                        : sch.status === "Đã kết thúc"
                        ? "border-slate-200 bg-slate-50/70 hover:border-slate-400"
                        : "border-slate-200 hover:border-indigo-400 hover:shadow-sm"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getScheduleTypeBadge(sch.type)}
                          {isRescheduled && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Đã dời lịch (Lần {sch.rescheduleCount})
                            </span>
                          )}
                        </div>
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

                      <h3 className="text-left w-full text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-emerald-800 leading-snug transition-colors">
                        {sch.title}
                      </h3>

                      {(sch.description || sch.content) && (
                        <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 line-clamp-2">
                          {sch.description || sch.content}
                        </p>
                      )}

                      <div className="space-y-1 text-xs text-slate-700">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono font-semibold text-indigo-800">
                          <CalendarIcon size={13} aria-hidden="true" />
                          {isRescheduled && (sch.originalDate || sch.originalTime) && (
                            <span className="line-through text-slate-400 font-normal">
                              {sch.originalDate || sch.date} • {sch.originalTime || sch.time}
                            </span>
                          )}
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

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRescheduleTarget({ schedule: sch, mode: "reschedule" })}
                          title="Dời ngày, đổi giờ hoặc tạm hoãn"
                        >
                          <RefreshCw size={13} />
                          <span className="ml-1 text-xs">Dời lịch</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRescheduleTarget({ schedule: sch, mode: "delegate" })}
                          title="Cử cán bộ đi dự thay"
                        >
                          <UserCheck size={13} />
                          <span className="ml-1 text-xs">Đi thay</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openBroadcastFromSchedule(sch)}
                          title="AI soạn Thông báo gửi Người dân / Chi hội từ lịch công tác này"
                        >
                          <Megaphone size={13} className="text-emerald-700" />
                          <span className="ml-1 text-xs text-emerald-800">Thông báo</span>
                        </Button>
                      </div>
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
                );
              })}
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

      {/* SUB-TAB 4: AI CITIZEN & ASSOCIATION BROADCAST */}
      {activeSubTab === "broadcast" && (
        <CitizenBroadcastTab
          schedules={schedules}
          tasks={tasks}
          associationsList={associationsList}
          creatorLabel={creatorLabel}
          seedSource={broadcastSeed}
          onClearSeedSource={() => setBroadcastSeed(null)}
          onNotify={showNotice}
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
        associationsList={associationsList}
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
            setFocusScheduleDate(savedSch.date);
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
        onRequestReschedule={(sch, mode = "reschedule") => {
          setSelectedSchedule(null);
          setRescheduleTarget({ schedule: sch, mode });
        }}
        onRequestDelete={(s) => setConfirmState({ kind: "schedule", id: s.id, label: s.title })}
      />

      <WardScheduleOcrModal
        isOpen={showWardOcrModal}
        onClose={() => setShowWardOcrModal(false)}
        associations={associationsList}
        existingSchedules={schedules}
        existingTasksCount={tasks.length}
        creatorLabel={creatorLabel}
        onConfirmImport={({ newSchedules, newTasks }) => {
          if (newSchedules.length > 0) {
            const existingKeys = new Set(
              schedules.map(
                (s) => `${s.date}|${s.time.slice(0, 5)}|${s.title.toLowerCase().slice(0, 40)}`
              )
            );
            const dedupedNew = newSchedules.filter(
              (ns) =>
                !existingKeys.has(
                  `${ns.date}|${ns.time.slice(0, 5)}|${ns.title.toLowerCase().slice(0, 40)}`
                )
            );
            const merged = [...schedules, ...dedupedNew].sort((a, b) =>
              a.date.localeCompare(b.date)
            );
            saveSchedules(merged);
            const firstKp3 =
              dedupedNew.find((s) => s.relevanceTier !== "ward_reference") ||
              newSchedules.find((s) => s.relevanceTier !== "ward_reference") ||
              newSchedules[0];
            if (firstKp3?.date) {
              setFocusScheduleDate(firstKp3.date);
            }
          }

          if (newTasks.length > 0) {
            saveTasks([...newTasks, ...tasks]);
          }

          setActiveSubTab("schedules");
          setScheduleViewMode("weekly");
          const kp3Count = newSchedules.filter((s) => s.relevanceTier !== "ward_reference").length;
          showNotice(
            `Đã đồng bộ ${kp3Count} lịch công tác cán bộ KP3${
              newTasks.length > 0 ? ` và tự động giao ${newTasks.length} nhiệm vụ chuẩn bị` : ""
            } từ Lịch cấp trên.`,
            "success"
          );
        }}
      />

      <RescheduleAndDelegateModal
        schedule={rescheduleTarget?.schedule || null}
        initialMode={rescheduleTarget?.mode || "reschedule"}
        onClose={() => setRescheduleTarget(null)}
        allSchedules={schedules}
        associations={associationsList}
        actorLabel={creatorLabel}
        onSaveAdjustedSchedule={(updatedSch, opts) => {
          const updatedList = schedules
            .map((s) => (s.id === updatedSch.id ? updatedSch : s))
            .sort((a, b) => a.date.localeCompare(b.date));
          saveSchedules(updatedList);
          if (selectedSchedule?.id === updatedSch.id) {
            setSelectedSchedule(updatedSch);
          }
          setFocusScheduleDate(updatedSch.date);

          let shiftedTasksCount = 0;
          if (opts?.shiftLinkedTasksToDate) {
            const linkedIds = new Set(updatedSch.linkedTaskIds || []);
            const nextTasks = tasks.map((t) => {
              if (t.linkedScheduleId === updatedSch.id || linkedIds.has(t.id)) {
                shiftedTasksCount += 1;
                return { ...t, deadline: opts.shiftLinkedTasksToDate! };
              }
              return t;
            });
            if (shiftedTasksCount > 0) {
              saveTasks(nextTasks);
            }
          }

          setRescheduleTarget(null);
          showNotice(
            `Đã lưu điều chỉnh lịch "${updatedSch.title}" (${updatedSch.date} • ${updatedSch.time})${
              shiftedTasksCount > 0
                ? ` và dời hạn ${shiftedTasksCount} nhiệm vụ liên kết`
                : ""
            }.`,
            "success"
          );
        }}
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
