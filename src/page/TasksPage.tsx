import React, { useEffect, useState } from "react";
import TaskAndSchedule from "../components/TaskAndSchedule";
import TaskFormPage from "./TaskFormPage";
import TaskDetailPage from "./TaskDetailPage";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { TaskAttachment, TaskItem } from "../types";
import { loadStoredTasks, saveStoredTasks } from "../components/tasks/tasksData";
import { loadTasksFromDb, syncTasksDiffToDb } from "../utils/supabaseSync";
import {
  ROUTES,
  getTaskCreatePath,
  getTaskDetailPath,
  getTaskEditPath,
  navigate,
  parseTaskFormRoute,
  useCurrentLocation,
} from "../routes";

export interface TasksPageProps {
  tasks?: TaskItem[];
  onTasksChange?: (next: TaskItem[]) => void;
  creatorLabel?: string;
  isDataLoading?: boolean;
  basePath?: string;
}

export default function TasksPage({
  tasks: externalTasks,
  onTasksChange,
  creatorLabel = "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_TASKS,
}: TasksPageProps = {}) {
  const location = useCurrentLocation();
  const routeMatch = parseTaskFormRoute(location.pathname, location.search);
  const [internalTasks, setInternalTasks] = useState<TaskItem[]>(loadStoredTasks);
  const tasks = externalTasks ?? internalTasks;

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadTasksFromDb().then((rows) => {
      if (active && rows && rows.length > 0) {
        if (onTasksChange) {
          onTasksChange(rows);
        } else {
          setInternalTasks(rows);
          saveStoredTasks(rows);
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  const saveTasks = (next: TaskItem[]) => {
    if (onTasksChange) {
      onTasksChange(next);
    } else {
      syncTasksDiffToDb(internalTasks, next);
      setInternalTasks(next);
      saveStoredTasks(next);
    }
  };

  const handleAddTask = (newTask: TaskItem) => {
    saveTasks([newTask, ...tasks]);
  };

  const handleUpdateTask = (updated: TaskItem) => {
    saveTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTask = (taskId: string) => {
    saveTasks(tasks.filter((t) => t.id !== taskId));
  };

  const handleUpdateTaskStatus = (taskId: string, nextStatus: TaskItem["status"]) => {
    saveTasks(
      tasks.map((t) => {
        if (t.id !== taskId) return t;
        const isDone = nextStatus === "Hoàn thành";
        return {
          ...t,
          status: nextStatus,
          progressPercent: isDone ? 100 : t.progressPercent,
          completedAt: isDone ? new Date().toISOString().slice(0, 10) : undefined,
        };
      })
    );
  };

  const handleUpdateProgress = (taskId: string, pct: number) => {
    saveTasks(
      tasks.map((t) => {
        if (t.id !== taskId) return t;
        const isDone = pct === 100;
        return {
          ...t,
          progressPercent: pct,
          status: isDone ? "Hoàn thành" : t.status === "Hoàn thành" ? "Đang thực hiện" : t.status,
          completedAt: isDone ? new Date().toISOString().slice(0, 10) : undefined,
        };
      })
    );
  };

  const handleAddAttachments = (taskId: string, files: TaskAttachment[]) => {
    saveTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, attachments: [...(t.attachments || []), ...files] } : t))
    );
  };

  const handleRemoveAttachment = (taskId: string, attId: string) => {
    saveTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, attachments: (t.attachments || []).filter((a) => a.id !== attId) } : t
      )
    );
  };

  if (routeMatch) {
    if (routeMatch.mode === "detail") {
      return (
        <TaskDetailPage
          taskId={routeMatch.taskId}
          tasks={tasks}
          isDataLoading={isDataLoading}
          basePath={basePath}
          onUpdateStatus={handleUpdateTaskStatus}
          onUpdateProgress={handleUpdateProgress}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
          onDeleteTask={handleDeleteTask}
          onBack={() => navigate(basePath)}
          onEdit={(task) => navigate(getTaskEditPath(task.id, basePath))}
          onDeleted={(deleted) => {
            setSavedNotice(`Đã xóa nhiệm vụ [${deleted.id}] "${deleted.title}" khỏi hệ thống.`);
            navigate(basePath);
          }}
        />
      );
    }

    if (routeMatch.mode === "edit") {
      return (
        <TaskFormPage
          mode="edit"
          taskId={routeMatch.taskId}
          tasks={tasks}
          isDataLoading={isDataLoading}
          basePath={basePath}
          creatorLabel={creatorLabel}
          onUpdateTask={handleUpdateTask}
          onCancel={() => navigate(getTaskDetailPath(routeMatch.taskId, basePath))}
          onSaved={(saved) => {
            setSavedNotice(`Đã cập nhật nhiệm vụ [${saved.id}] thành công!`);
            navigate(getTaskDetailPath(saved.id, basePath));
          }}
        />
      );
    }

    return (
      <TaskFormPage
        mode="create"
        tasks={tasks}
        isDataLoading={isDataLoading}
        basePath={basePath}
        creatorLabel={creatorLabel}
        onAddTask={handleAddTask}
        onCancel={() => navigate(basePath)}
        onSaved={(saved) => {
          setSavedNotice(`Đã phân công nhiệm vụ mới [${saved.id}] thành công!`);
          navigate(getTaskDetailPath(saved.id, basePath));
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {savedNotice && (
        <InlineNotice
          type="success"
          message={savedNotice}
          onDismiss={() => setSavedNotice(null)}
        />
      )}
      {isDataLoading ? (
        <LoadingFade title="Đang tải dữ liệu phân công nhiệm vụ..." />
      ) : (
        <TaskAndSchedule
          tasks={tasks}
          onTasksChange={saveTasks}
          creatorLabel={creatorLabel}
          basePath={basePath}
          onOpenCreate={() => navigate(getTaskCreatePath(basePath))}
          onOpenEdit={(task) => navigate(getTaskEditPath(task.id, basePath))}
          onOpenDetail={(task) => navigate(getTaskDetailPath(task.id, basePath))}
        />
      )}
    </div>
  );
}
