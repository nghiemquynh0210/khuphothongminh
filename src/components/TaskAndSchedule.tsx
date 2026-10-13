import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  MapPin,
  CalendarCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Printer,
  X,
  Edit2,
  Trash2,
  UploadCloud,
  FileText,
  BadgeAlert,
  SlidersHorizontal,
  LayoutGrid,
  ListFilter,
  Layers,
  Phone
} from "lucide-react";
import { TaskItem, ScheduleEvent } from "../types";

// Default seed data for Community Tasks
export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "TASK-001",
    title: "Tổ chức chiến dịch 'Chủ Nhật Xanh' dọn dẹp hẻm 124 đường KV AP12",
    description: "Vận động 100% hộ dân tại Tổ 12 tham gia phát quang bụi rậm, khơi thông cống rãnh chống ngập và dịch sốt xuất huyết.",
    unit: "Tổ dân phố 12",
    assignee: {
      name: "Bà Lê Thị Mai",
      role: "Tổ trưởng Tổ 12",
      unit: "Tổ dân phố 12",
      phone: "0908 123 456"
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Cao",
    status: "Đang thực hiện",
    progressPercent: 65,
    startDate: "2026-10-10",
    deadline: "2026-10-15",
    notes: "Đã mượn được xe thu gom rác của Đô thị Phường An Phú."
  },
  {
    id: "TASK-002",
    title: "Kiểm tra rà soát PCCC tại 14 nhà trọ và cơ sở kinh doanh phế liệu",
    description: "Phối hợp Công an phường kiểm tra lối thoát nạn thứ 2, bình chữa cháy mini tại dãy nhà trọ trên đường X1.",
    unit: "Tổ Bảo vệ ANTT",
    assignee: {
      name: "Ông Trần Văn Minh",
      role: "Tổ phó ANTT cơ sở",
      unit: "Tổ Bảo vệ ANTT",
      phone: "0913 888 999"
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Khẩn cấp",
    status: "Chờ nghiệm thu",
    progressPercent: 90,
    startDate: "2026-10-08",
    deadline: "2026-10-14",
    notes: "Đã kiểm tra 12/14 cơ sở, lập biên bản nhắc nhở 2 cơ sở bổ sung bình bọt ABC."
  },
  {
    id: "TASK-003",
    title: "Cập nhật dữ liệu CCCD và mã định danh VNeID mức 2 cho 18 công dân tạm trú",
    description: "Hỗ trợ người lao động thuê trọ tại TDP 15 hoàn tất xác thực sinh trắc học và khai báo cư trú.",
    unit: "Tổ dân phố 15",
    assignee: {
      name: "Ông Hoàng Văn Thái",
      role: "Tổ trưởng Tổ 15",
      unit: "Tổ dân phố 15",
      phone: "0977 456 789"
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Trung bình",
    status: "Đang thực hiện",
    progressPercent: 40,
    startDate: "2026-10-11",
    deadline: "2026-10-18",
    notes: "Đang liên hệ đại diện chủ nhà trọ lập danh sách."
  },
  {
    id: "TASK-004",
    title: "Thu nộp Quỹ Vì người nghèo & Quỹ Khuyến học năm 2026 tại TDP 11",
    description: "Phát hành phiếu thu điện tử có VietQR đến từng hộ gia đình, công khai danh sách ủng hộ trên cổng khu phố.",
    unit: "Tổ dân phố 11",
    assignee: {
      name: "Ông Nguyễn Văn Hùng",
      role: "Tổ trưởng TDP 11",
      unit: "Tổ dân phố 11",
      phone: "0912 345 678"
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Cao",
    status: "Chờ xử lý",
    progressPercent: 15,
    startDate: "2026-10-12",
    deadline: "2026-10-25",
    notes: "Đã nhận mã QR động theo từng hộ gia đình."
  },
  {
    id: "TASK-005",
    title: "Sửa chữa 2 bóng đèn chiếu sáng năng lượng mặt trời hẻm KV AP29",
    description: "Thay pin lưu trữ cho đèn chiếu sáng công cộng do bà con TDP 14 phản ánh chập chờn.",
    unit: "Tổ dân phố 14",
    assignee: {
      name: "Bà Phạm Thị Lan",
      role: "Tổ trưởng TDP 14",
      unit: "Tổ dân phố 14",
      phone: "0988 654 321"
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Trung bình",
    status: "Hoàn thành",
    progressPercent: 100,
    startDate: "2026-10-05",
    deadline: "2026-10-10",
    completedAt: "2026-10-09",
    notes: "Đã bàn giao nghiệm thu đưa vào chiếu sáng an toàn."
  },
  {
    id: "TASK-006",
    title: "Tổ chức thăm hỏi, tặng quà cho 3 Mẹ Việt Nam Anh Hùng & Gia đình chính sách",
    description: "Nhân dịp kỷ niệm ngày truyền thống, trao quà và kiểm tra điều kiện sinh hoạt gia đình có công.",
    unit: "Hội Phụ nữ",
    assignee: {
      name: "Bà Nguyễn Thu Hà",
      role: "Chi hội trưởng Phụ nữ KP3",
      unit: "Hội Phụ nữ",
      phone: "0934 567 890"
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Cao",
    status: "Hoàn thành",
    progressPercent: 100,
    startDate: "2026-10-01",
    deadline: "2026-10-05",
    completedAt: "2026-10-04",
    notes: "Đã trao 3 phần quà trị giá 3.000.000đ từ Quỹ Đền ơn đáp nghĩa."
  }
];

// Default seed data for Community Schedules
export const INITIAL_SCHEDULES: ScheduleEvent[] = [
  {
    id: "SCH-001",
    title: "Sinh hoạt Chi bộ định kỳ tháng 10/2026",
    type: "Họp Chi bộ",
    date: "2026-10-03",
    time: "19:00 - 21:00",
    location: "Văn phòng Ban Điều hành KP3 (Số 45, ĐT.743B)",
    host: "Đ/c Nguyễn Văn Hùng - Bí thư Chi bộ",
    attendees: "Toàn thể 42 Đảng viên Chi bộ KP3",
    status: "Đã kết thúc",
    notes: "Đánh giá công tác tháng 9 và triển khai mô hình Khu phố thông minh số hoá."
  },
  {
    id: "SCH-002",
    title: "Họp giao ban Tổ trưởng 5 Tổ dân phố (TDP 11 - 15)",
    type: "Họp Tổ Dân Phố",
    date: "2026-10-14",
    time: "08:30 - 10:30",
    location: "Hội trường Khu phố 3",
    host: "Ông Trần Quốc Tuấn - Trưởng ban Điều hành KP3",
    attendees: "Tổ trưởng & Tổ phó 5 TDP, Đại diện CSKV",
    status: "Sắp diễn ra",
    notes: "Rà soát tiến độ thu Quỹ an sinh và triển khai kiểm tra PCCC nhà trọ."
  },
  {
    id: "SCH-003",
    title: "Tuần tra liên tịch đảm bảo ANTT & trật tự đô thị ban đêm",
    type: "Tuần tra ANTT",
    date: "2026-10-15",
    time: "22:00 - 01:30",
    location: "Các tuyến hẻm trọng điểm ĐT.743B, KV AP12, giáp ranh Dĩ An",
    host: "Đ/c Trung úy CSKV & Tổ trưởng Tổ ANTT cơ sở",
    attendees: "Lực lượng ANTT cơ sở (8 đ/c), Dân quân tự vệ (4 đ/c)",
    status: "Sắp diễn ra",
    notes: "Tập trung kiểm tra các tụ điểm thanh thiếu niên tụ tập đêm khuya."
  },
  {
    id: "SCH-004",
    title: "Ra quân ngày 'Chủ Nhật Xanh' dọn vệ sinh tuyến hẻm kiểu mẫu TDP 12",
    type: "Chủ Nhật Xanh",
    date: "2026-10-18",
    time: "06:30 - 09:30",
    location: "Điểm tập kết: Đầu hẻm 124 đường KV AP12",
    host: "Đ/c Bí thư Chi đoàn TN & Tổ trưởng TDP 12",
    attendees: "Đoàn viên thanh niên, Hội viên Phụ nữ, Cư dân TDP 12",
    status: "Sắp diễn ra",
    notes: "Chuẩn bị bao đựng rác, chổi cào và xe gom rác chuyên dụng."
  },
  {
    id: "SCH-005",
    title: "Tiếp công dân và giải quyết thủ tục hành chính tại cơ sở",
    type: "Tiếp công dân",
    date: "2026-10-20",
    time: "08:00 - 11:30",
    location: "Bàn tiếp dân điện tử - Văn phòng KP3",
    host: "Trưởng ban Điều hành & Cán bộ tư pháp - hộ tịch Phường An Phú",
    attendees: "Công dân trên địa bàn KP3 có kiến nghị, phản ánh",
    status: "Sắp diễn ra",
    notes: "Hướng dẫn thực hiện dịch vụ công trực tuyến và ký xác nhận đơn thư."
  }
];

export default function TaskAndSchedule() {
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "schedules">("tasks");
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_community_tasks");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TASKS;
  });

  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_community_schedules");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SCHEDULES;
  });

  // Task filter & view controls
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "list">("kanban");
  const [taskUnitFilter, setTaskUnitFilter] = useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");

  // Schedule filter & controls
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<string>("all");
  const [scheduleMonthFilter, setScheduleMonthFilter] = useState<string>("2026-10");

  // Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskUnit, setNewTaskUnit] = useState<TaskItem["unit"]>("Tổ dân phố 12");
  const [newTaskAssigneeName, setNewTaskAssigneeName] = useState("Bà Lê Thị Mai");
  const [newTaskAssigneeRole, setNewTaskAssigneeRole] = useState("Tổ trưởng Tổ 12");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem["priority"]>("Cao");
  const [newTaskDeadline, setNewTaskDeadline] = useState("2026-10-20");

  // New schedule form state
  const [newSchTitle, setNewSchTitle] = useState("");
  const [newSchType, setNewSchType] = useState<ScheduleEvent["type"]>("Họp Tổ Dân Phố");
  const [newSchDate, setNewSchDate] = useState("2026-10-22");
  const [newSchTime, setNewSchTime] = useState("08:30 - 10:30");
  const [newSchLocation, setNewSchLocation] = useState("Văn phòng Ban Điều hành KP3");
  const [newSchHost, setNewSchHost] = useState("Ông Trần Quốc Tuấn - Trưởng ban ĐHKP");
  const [newSchAttendees, setNewSchAttendees] = useState("Đại diện các Tổ dân phố");
  const [newSchNotes, setNewSchNotes] = useState("");

  // Save changes to localStorage
  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem("kp3_community_tasks", JSON.stringify(newTasks));
    } catch {}
  };

  const saveSchedules = (newSchedules: ScheduleEvent[]) => {
    setSchedules(newSchedules);
    try {
      localStorage.setItem("kp3_community_schedules", JSON.stringify(newSchedules));
    } catch {}
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchUnit = taskUnitFilter === "all" || t.unit === taskUnitFilter;
      const matchPriority = taskPriorityFilter === "all" || t.priority === taskPriorityFilter;
      const matchSearch =
        taskSearchQuery === "" ||
        t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        t.assignee.name.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(taskSearchQuery.toLowerCase());
      return matchUnit && matchPriority && matchSearch;
    });
  }, [tasks, taskUnitFilter, taskPriorityFilter, taskSearchQuery]);

  // Task KPI calculations
  const taskKpi = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Hoàn thành").length;
    const inProgress = tasks.filter(t => t.status === "Đang thực hiện").length;
    const pendingReview = tasks.filter(t => t.status === "Chờ nghiệm thu").length;
    const urgent = tasks.filter(t => t.priority === "Khẩn cấp" && t.status !== "Hoàn thành").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pendingReview, urgent, completionRate };
  }, [tasks]);

  // Status transitions
  const handleMoveStatus = (taskId: string, nextStatus: TaskItem["status"]) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: nextStatus,
          progressPercent: nextStatus === "Hoàn thành" ? 100 : nextStatus === "Chờ nghiệm thu" ? 90 : t.progressPercent,
          completedAt: nextStatus === "Hoàn thành" ? new Date().toISOString().slice(0, 10) : undefined
        };
      }
      return t;
    });
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated.find(t => t.id === taskId) || null);
    }
  };

  // Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `TASK-${String(tasks.length + 1).padStart(3, "0")}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || "Chưa có mô tả chi tiết.",
      unit: newTaskUnit,
      assignee: {
        name: newTaskAssigneeName,
        role: newTaskAssigneeRole,
        unit: newTaskUnit
      },
      creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
      priority: newTaskPriority,
      status: "Chờ xử lý",
      progressPercent: 0,
      startDate: new Date().toISOString().slice(0, 10),
      deadline: newTaskDeadline
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);
    setShowAddTaskModal(false);
    setNewTaskTitle("");
    setNewTaskDesc("");
  };

  // Create Schedule
  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchTitle.trim()) return;

    const newSch: ScheduleEvent = {
      id: `SCH-${String(schedules.length + 1).padStart(3, "0")}`,
      title: newSchTitle.trim(),
      type: newSchType,
      date: newSchDate,
      time: newSchTime,
      location: newSchLocation,
      host: newSchHost,
      attendees: newSchAttendees,
      status: "Sắp diễn ra",
      notes: newSchNotes.trim()
    };

    const updated = [...schedules, newSch].sort((a, b) => a.date.localeCompare(b.date));
    saveSchedules(updated);
    setShowAddScheduleModal(false);
    setNewSchTitle("");
    setNewSchNotes("");
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    if (confirm("Bạn có chắc muốn xoá nhiệm vụ này?")) {
      const updated = tasks.filter(t => t.id !== id);
      saveTasks(updated);
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  // Priority color helper
  const getPriorityBadge = (p: TaskItem["priority"]) => {
    switch (p) {
      case "Khẩn cấp":
        return <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse"><Flame size={12} className="text-rose-600" /> Khẩn cấp</span>;
      case "Cao":
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold">Ưu tiên cao</span>;
      case "Trung bình":
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">Bình thường</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px]">Thấp</span>;
    }
  };

  // Status badge helper
  const getStatusBadge = (s: TaskItem["status"]) => {
    switch (s) {
      case "Hoàn thành":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Đã hoàn thành</span>;
      case "Chờ nghiệm thu":
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"><Clock size={12} /> Chờ nghiệm thu</span>;
      case "Đang thực hiện":
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"><Clock size={12} /> Đang tiến hành</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium">Chờ xử lý</span>;
    }
  };

  // Schedule type badge helper
  const getScheduleTypeBadge = (t: ScheduleEvent["type"]) => {
    switch (t) {
      case "Họp Chi bộ":
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-bold">Họp Chi bộ</span>;
      case "Họp Tổ Dân Phố":
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold">Họp TDP</span>;
      case "Tuần tra ANTT":
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">Tuần tra ANTT</span>;
      case "Chủ Nhật Xanh":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">Chủ Nhật Xanh</span>;
      case "Tiếp công dân":
        return <span className="bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded text-[11px] font-bold">Tiếp công dân</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">{t}</span>;
    }
  };

  return (
    <div id="task-and-schedule-module" className="space-y-6">
      {/* Header title & Sub-tab switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={15} /> Ban Điều Hành & Cán Bộ Khu Phố 3
            </div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <CalendarCheck className="text-emerald-400" size={28} />
              Lịch Công Tác Điện Tử & Phân Công Nhiệm Vụ
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Hệ thống điều hành tác nghiệp số: Giao việc trực tiếp đến 5 Tổ dân phố (TDP 11 - 15), quản lý tiến độ, cảnh báo hạn chót và giám sát lịch sinh hoạt chi bộ, ANTT toàn diện.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              id="btn-subtab-tasks"
              onClick={() => setActiveSubTab("tasks")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === "tasks"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <CheckSquare size={15} /> Phân Công Nhiệm Vụ ({tasks.length})
            </button>
            <button
              id="btn-subtab-schedules"
              onClick={() => setActiveSubTab("schedules")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === "schedules"
                  ? "bg-indigo-500 text-white shadow-md font-black"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <CalendarIcon size={15} /> Lịch Công Tác Tuần/Tháng ({schedules.length})
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-850/60 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Tổng việc giao</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-white">{taskKpi.total}</span>
              <span className="text-xs font-bold text-slate-400">100%</span>
            </div>
          </div>
          <div className="bg-slate-850/60 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-sky-400 block font-medium">Đang triển khai</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-sky-400">{taskKpi.inProgress}</span>
              <span className="text-xs text-sky-300 font-bold">{taskKpi.pendingReview} chờ duyệt</span>
            </div>
          </div>
          <div className="bg-slate-850/60 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-rose-400 block font-medium">Việc khẩn cấp</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-rose-400">{taskKpi.urgent}</span>
              <span className="text-xs text-rose-300 font-bold">Cần ưu tiên</span>
            </div>
          </div>
          <div className="bg-slate-850/60 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-emerald-400 block font-medium">Đã hoàn thành</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-400">{taskKpi.completed}</span>
              <span className="text-xs text-emerald-300 font-bold">Đạt {taskKpi.completionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: PHÂN CÔNG NHIỆM VỤ (TASKS) */}
      {activeSubTab === "tasks" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="task-search-input"
                  name="taskSearchQuery"
                  aria-label="Tìm kiếm nhiệm vụ"
                  type="text"
                  placeholder="Tìm nhiệm vụ, người nhận việc..."
                  value={taskSearchQuery}
                  onChange={e => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter by unit */}
              <select
                id="task-unit-filter"
                name="taskUnitFilter"
                aria-label="Lọc theo đơn vị"
                value={taskUnitFilter}
                onChange={e => setTaskUnitFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả đơn vị (Toàn KP3)</option>
                <option value="Tổ dân phố 11">Tổ dân phố 11</option>
                <option value="Tổ dân phố 12">Tổ dân phố 12</option>
                <option value="Tổ dân phố 13">Tổ dân phố 13</option>
                <option value="Tổ dân phố 14">Tổ dân phố 14</option>
                <option value="Tổ dân phố 15">Tổ dân phố 15</option>
                <option value="Tổ Bảo vệ ANTT">Tổ Bảo vệ ANTT cơ sở</option>
                <option value="Chi bộ KP3">Chi bộ Khu phố 3</option>
                <option value="Chi đoàn Thanh niên">Chi đoàn Thanh niên</option>
                <option value="Hội Phụ nữ">Hội Phụ nữ</option>
              </select>

              {/* Filter by priority */}
              <select
                id="task-priority-filter"
                name="taskPriorityFilter"
                aria-label="Lọc theo mức độ ưu tiên"
                value={taskPriorityFilter}
                onChange={e => setTaskPriorityFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Mọi mức ưu tiên</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
                <option value="Cao">Ưu tiên cao</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thấp">Thấp</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle Kanban vs List */}
              <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
                <button
                  id="btn-view-kanban"
                  onClick={() => setTaskViewMode("kanban")}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    taskViewMode === "kanban" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Chế độ Kanban"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  id="btn-view-list"
                  onClick={() => setTaskViewMode("list")}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    taskViewMode === "list" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Chế độ Danh sách"
                >
                  <ListFilter size={15} />
                </button>
              </div>

              {/* Add task button */}
              <button
                id="btn-add-task-modal"
                onClick={() => setShowAddTaskModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={15} /> Giao nhiệm vụ mới
              </button>
            </div>
          </div>

          {/* KANBAN VIEW */}
          {taskViewMode === "kanban" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(statusCol => {
                const columnTasks = filteredTasks.filter(t => t.status === statusCol);
                const colColors = {
                  "Chờ xử lý": "border-slate-300 bg-slate-50 text-slate-700",
                  "Đang thực hiện": "border-sky-300 bg-sky-50 text-sky-800",
                  "Chờ nghiệm thu": "border-purple-300 bg-purple-50 text-purple-800",
                  "Hoàn thành": "border-emerald-300 bg-emerald-50 text-emerald-800"
                }[statusCol];

                return (
                  <div key={statusCol} className="flex flex-col rounded-xl border border-slate-200 bg-slate-100/60 p-3 min-h-[500px]">
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${colColors}`}>
                          {statusCol}
                        </span>
                        <span className="text-xs font-bold text-slate-500">({columnTasks.length})</span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {columnTasks.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 italic">
                          Chưa có nhiệm vụ
                        </div>
                      ) : (
                        columnTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400 font-bold">{task.id}</span>
                              {getPriorityBadge(task.priority)}
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 leading-snug hover:text-emerald-700">
                              {task.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {task.description}
                            </p>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                <span>Tiến độ</span>
                                <span className="font-bold text-slate-700">{task.progressPercent}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    task.progressPercent === 100
                                      ? "bg-emerald-500"
                                      : task.progressPercent > 50
                                      ? "bg-sky-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{ width: `${task.progressPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Footer card info */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <div className="flex items-center gap-1 truncate max-w-[130px]" title={task.assignee.name}>
                                <User size={12} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-700 truncate">{task.assignee.name}</span>
                              </div>

                              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                                <Clock size={11} className="text-slate-400" />
                                <span>Hạn: {task.deadline.slice(5)}</span>
                              </div>
                            </div>

                            {/* Quick status transition buttons */}
                            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                              {statusCol !== "Chờ xử lý" && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, statusCol === "Hoàn thành" ? "Chờ nghiệm thu" : statusCol === "Chờ nghiệm thu" ? "Đang thực hiện" : "Chờ xử lý")}
                                  className="text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Lùi trạng thái"
                                >
                                  ← Lùi
                                </button>
                              )}
                              {statusCol !== "Hoàn thành" && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, statusCol === "Chờ xử lý" ? "Đang thực hiện" : statusCol === "Đang thực hiện" ? "Chờ nghiệm thu" : "Hoàn thành")}
                                  className="text-[10px] text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 rounded font-bold cursor-pointer"
                                  title="Chuyển bước tiếp theo"
                                >
                                  Tiến →
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {taskViewMode === "list" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Mã</th>
                      <th className="py-3 px-3">Tên nhiệm vụ / Nội dung</th>
                      <th className="py-3 px-3">Đơn vị & Người nhận</th>
                      <th className="py-3 px-3">Mức độ</th>
                      <th className="py-3 px-3">Hạn chót</th>
                      <th className="py-3 px-3">Tiến độ</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                          Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500 text-[11px]">{t.id}</td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="font-bold text-slate-900 line-clamp-1">{t.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{t.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{t.assignee.name}</div>
                            <div className="text-[10px] text-slate-500">{t.unit}</div>
                          </td>
                          <td className="py-2.5 px-3">{getPriorityBadge(t.priority)}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{t.deadline}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.progressPercent}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-slate-700 font-bold">{t.progressPercent}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">{getStatusBadge(t.status)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedTask(t)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded font-bold cursor-pointer"
                              >
                                Chi tiết
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 p-1 rounded cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
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

      {/* SUB-TAB 2: LỊCH CÔNG TÁC (SCHEDULES) */}
      {activeSubTab === "schedules" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Lọc theo loại:</span>
              <select
                id="schedule-type-filter"
                name="scheduleTypeFilter"
                aria-label="Lọc theo loại sự kiện"
                value={scheduleTypeFilter}
                onChange={e => setScheduleTypeFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả sự kiện</option>
                <option value="Họp Chi bộ">Họp Chi bộ</option>
                <option value="Họp Tổ Dân Phố">Họp Tổ Dân Phố</option>
                <option value="Tuần tra ANTT">Tuần tra ANTT</option>
                <option value="Chủ Nhật Xanh">Chủ Nhật Xanh</option>
                <option value="Tiếp công dân">Tiếp công dân</option>
              </select>

              <span className="text-xs font-bold text-slate-700 ml-2">Tháng:</span>
              <input
                id="schedule-month-filter"
                name="scheduleMonthFilter"
                aria-label="Lọc theo tháng"
                type="month"
                value={scheduleMonthFilter}
                onChange={e => setScheduleMonthFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="In lịch công tác tuần/tháng"
              >
                <Printer size={14} /> In Lịch
              </button>
              <button
                id="btn-add-schedule-modal"
                onClick={() => setShowAddScheduleModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={15} /> Thêm sự kiện / Lịch họp mới
              </button>
            </div>
          </div>

          {/* Timeline of events */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules
              .filter(s => scheduleTypeFilter === "all" || s.type === scheduleTypeFilter)
              .map(sch => {
                const isPassed = sch.status === "Đã kết thúc";
                return (
                  <div
                    key={sch.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isPassed
                        ? "bg-slate-50 border-slate-200 opacity-75"
                        : "bg-white border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {getScheduleTypeBadge(sch.type)}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sch.status === "Đang diễn ra"
                          ? "bg-emerald-100 text-emerald-800 animate-pulse"
                          : sch.status === "Sắp diễn ra"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {sch.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
                      {sch.title}
                    </h4>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-indigo-700 font-bold bg-indigo-50/70 p-1.5 rounded-md">
                        <CalendarIcon size={13} className="shrink-0" />
                        <span>{sch.date} • {sch.time}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{sch.location}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <User size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="font-semibold text-slate-800 line-clamp-1">{sch.host}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-slate-500 line-clamp-2">{sch.attendees}</span>
                      </div>
                    </div>

                    {sch.notes && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                        "{sch.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL: DETAIL / UPDATE TASK */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400">{selectedTask.id}</span>
                <h3 className="font-bold text-sm text-white">Chi tiết & Cập nhật nhiệm vụ</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tên nhiệm vụ</span>
                <h4 className="text-sm font-bold text-slate-900">{selectedTask.title}</h4>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Mô tả công việc</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Đơn vị nhận</span>
                  <span className="font-bold text-slate-800">{selectedTask.unit}</span>
                  <div className="text-slate-500 mt-0.5">{selectedTask.assignee.name} ({selectedTask.assignee.role})</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Người giao việc</span>
                  <span className="font-bold text-slate-800">{selectedTask.creator}</span>
                  <div className="text-slate-500 mt-0.5">Bắt đầu: {selectedTask.startDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tiến độ hoàn thành (%)</label>
                  <input
                    id="selected-task-progress-range"
                    name="progressPercent"
                    aria-label="Thanh trượt tiến độ"
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progressPercent}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const updated = tasks.map(t => t.id === selectedTask.id ? { ...t, progressPercent: val } : t);
                      saveTasks(updated);
                      setSelectedTask({ ...selectedTask, progressPercent: val });
                    }}
                    className="w-full cursor-pointer accent-emerald-600"
                  />
                  <div className="text-right font-mono font-bold text-emerald-700">{selectedTask.progressPercent}%</div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Chuyển trạng thái</label>
                  <select
                    id="selected-task-status-select"
                    name="status"
                    aria-label="Chọn trạng thái"
                    value={selectedTask.status}
                    onChange={e => handleMoveStatus(selectedTask.id, e.target.value as any)}
                    className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Chờ xử lý">Chờ xử lý</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Chờ nghiệm thu">Chờ nghiệm thu</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>
              </div>

              {selectedTask.notes && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Ghi chú / Minh chứng</span>
                  <p className="text-slate-700 bg-amber-50/60 border border-amber-200 p-2.5 rounded-lg">{selectedTask.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold cursor-pointer"
              >
                <Trash2 size={13} /> Xóa nhiệm vụ
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TASK */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus size={16} /> Phân công nhiệm vụ mới
              </h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề nhiệm vụ *</label>
                <input
                  id="modal-new-task-title"
                  name="newTaskTitle"
                  aria-label="Tiêu đề nhiệm vụ"
                  type="text"
                  required
                  placeholder="Ví dụ: Rà soát PCCC tại các dãy trọ TDP 12..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả nội dung chi tiết</label>
                <textarea
                  id="modal-new-task-desc"
                  name="newTaskDesc"
                  aria-label="Mô tả nội dung chi tiết"
                  rows={2}
                  placeholder="Nội dung, mục tiêu cụ thể, yêu cầu báo cáo..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn vị nhận việc</label>
                  <select
                    id="modal-new-task-unit"
                    name="newTaskUnit"
                    aria-label="Đơn vị nhận việc"
                    value={newTaskUnit}
                    onChange={e => {
                      const u = e.target.value as any;
                      setNewTaskUnit(u);
                      if (u === "Tổ dân phố 11") { setNewTaskAssigneeName("Ông Nguyễn Văn Hùng"); setNewTaskAssigneeRole("Tổ trưởng TDP 11"); }
                      else if (u === "Tổ dân phố 12") { setNewTaskAssigneeName("Bà Lê Thị Mai"); setNewTaskAssigneeRole("Tổ trưởng TDP 12"); }
                      else if (u === "Tổ dân phố 13") { setNewTaskAssigneeName("Ông Trần Văn Minh"); setNewTaskAssigneeRole("Tổ trưởng TDP 13"); }
                      else if (u === "Tổ dân phố 14") { setNewTaskAssigneeName("Bà Phạm Thị Lan"); setNewTaskAssigneeRole("Tổ trưởng TDP 14"); }
                      else if (u === "Tổ dân phố 15") { setNewTaskAssigneeName("Ông Hoàng Văn Thái"); setNewTaskAssigneeRole("Tổ trưởng TDP 15"); }
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Tổ dân phố 11">Tổ dân phố 11</option>
                    <option value="Tổ dân phố 12">Tổ dân phố 12</option>
                    <option value="Tổ dân phố 13">Tổ dân phố 13</option>
                    <option value="Tổ dân phố 14">Tổ dân phố 14</option>
                    <option value="Tổ dân phố 15">Tổ dân phố 15</option>
                    <option value="Tổ Bảo vệ ANTT">Tổ Bảo vệ ANTT</option>
                    <option value="Chi đoàn Thanh niên">Chi đoàn Thanh niên</option>
                    <option value="Hội Phụ nữ">Hội Phụ nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    id="modal-new-task-priority"
                    name="newTaskPriority"
                    aria-label="Mức độ ưu tiên"
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Trung bình">Trung bình (Bình thường)</option>
                    <option value="Cao">Ưu tiên cao</option>
                    <option value="Khẩn cấp">Khẩn cấp (Hỏa tốc)</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người nhận việc chính</label>
                  <input
                    id="modal-new-task-assignee-name"
                    name="newTaskAssigneeName"
                    aria-label="Người nhận việc chính"
                    type="text"
                    value={newTaskAssigneeName}
                    onChange={e => setNewTaskAssigneeName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạn chót hoàn thành *</label>
                  <input
                    id="modal-new-task-deadline"
                    name="newTaskDeadline"
                    aria-label="Hạn chót hoàn thành"
                    type="date"
                    required
                    value={newTaskDeadline}
                    onChange={e => setNewTaskDeadline(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs cursor-pointer"
                >
                  Giao việc ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SCHEDULE */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-indigo-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CalendarIcon size={16} /> Thêm sự kiện / Lịch họp mới
              </h3>
              <button onClick={() => setShowAddScheduleModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề cuộc họp / Sự kiện *</label>
                <input
                  id="modal-new-sch-title"
                  name="newSchTitle"
                  aria-label="Tiêu đề cuộc họp"
                  type="text"
                  required
                  placeholder="Ví dụ: Họp chi bộ triển khai công tác tháng..."
                  value={newSchTitle}
                  onChange={e => setNewSchTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại sự kiện</label>
                  <select
                    id="modal-new-sch-type"
                    name="newSchType"
                    aria-label="Loại sự kiện"
                    value={newSchType}
                    onChange={e => setNewSchType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Họp Chi bộ">Họp Chi bộ (Ngày 3 hàng tháng)</option>
                    <option value="Họp Tổ Dân Phố">Họp Tổ Dân Phố</option>
                    <option value="Tuần tra ANTT">Tuần tra ANTT ban đêm</option>
                    <option value="Chủ Nhật Xanh">Chủ Nhật Xanh</option>
                    <option value="Tiếp công dân">Tiếp công dân</option>
                    <option value="Hội nghị Khu phố">Hội nghị Khu phố</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày tổ chức *</label>
                  <input
                    id="modal-new-sch-date"
                    name="newSchDate"
                    aria-label="Ngày tổ chức"
                    type="date"
                    required
                    value={newSchDate}
                    onChange={e => setNewSchDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian (Giờ)</label>
                  <input
                    id="modal-new-sch-time"
                    name="newSchTime"
                    aria-label="Thời gian diễn ra"
                    type="text"
                    value={newSchTime}
                    placeholder="19:00 - 21:00"
                    onChange={e => setNewSchTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Địa điểm</label>
                  <input
                    id="modal-new-sch-location"
                    name="newSchLocation"
                    aria-label="Địa điểm diễn ra"
                    type="text"
                    value={newSchLocation}
                    onChange={e => setNewSchLocation(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chủ trì</label>
                  <input
                    id="modal-new-sch-host"
                    name="newSchHost"
                    aria-label="Người chủ trì"
                    type="text"
                    value={newSchHost}
                    onChange={e => setNewSchHost(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thành phần tham dự</label>
                  <input
                    id="modal-new-sch-attendees"
                    name="newSchAttendees"
                    aria-label="Thành phần tham dự"
                    type="text"
                    value={newSchAttendees}
                    onChange={e => setNewSchAttendees(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs cursor-pointer"
                >
                  Lưu vào lịch công tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
