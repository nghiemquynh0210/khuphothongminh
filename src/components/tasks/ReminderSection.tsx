import React, { useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Building2,
  CheckCheck,
  Clock,
  Download,
  Edit2,
  FileCheck,
  FileText,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { Association, RecurringReminder, TaskAttachment, TaskItem } from "../../types";
import { RECIPIENT_ORGS, formatFrequencyText } from "./tasksData";
import { getFrequencyBadge, getReminderStatusBadge } from "./taskBadges";
import { AttachmentGallery } from "./AttachmentGallery";
import { AttachmentPreviewModal } from "./TaskModals";
import { Button, EmptyState, Input, Modal, ReportSelect } from "../ui";
import { DetailRow } from "../common/DetailRow";

interface ReminderSectionProps {
  reminders: RecurringReminder[];
  associationsList: Association[];
  onSaveReminders: (next: RecurringReminder[]) => void;
  onAutoCreateTask: (task: TaskItem) => void;
  onNotify: (msg: string, type?: "success" | "info" | "warning") => void;
  onRequestDelete: (rem: RecurringReminder) => void;
}

export const ReminderSection: React.FC<ReminderSectionProps> = ({
  reminders,
  associationsList,
  onSaveReminders,
  onAutoCreateTask,
  onNotify,
  onRequestDelete,
}) => {
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<RecurringReminder | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<RecurringReminder | null>(null);
  const [submittingReminder, setSubmittingReminder] = useState<RecurringReminder | null>(null);
  const [previewAtt, setPreviewAtt] = useState<TaskAttachment | null>(null);

  // Create form state
  const [remTitle, setRemTitle] = useState("");
  const [remTitleError, setRemTitleError] = useState("");
  const [remDesc, setRemDesc] = useState("");
  const [remFrequency, setRemFrequency] = useState<RecurringReminder["frequency"]>("weekly");
  const [remTime, setRemTime] = useState("16:30");
  const [remDayOfWeek, setRemDayOfWeek] = useState(6);
  const [remDayOfMonth, setRemDayOfMonth] = useState(15);
  const [remMonthOfYear, setRemMonthOfYear] = useState(12);
  const [remRecipient, setRemRecipient] = useState(RECIPIENT_ORGS[0]);
  const [customRecipient, setCustomRecipient] = useState("");
  const [remAssociationId, setRemAssociationId] = useState("ASC_BDH");
  const [remUnit, setRemUnit] = useState("Ban điều hành khu phố");
  const [remPersonName, setRemPersonName] = useState("Nguyễn Trung Huy");
  const [remPersonRole, setRemPersonRole] = useState("Trưởng Ban điều hành");
  const [remPersonPhone, setRemPersonPhone] = useState("0909123888");
  const [remChannels, setRemChannels] = useState<("in_app" | "banner" | "zalo_sms" | "email")[]>([
    "in_app",
    "banner",
    "zalo_sms",
  ]);
  const [remAutoCreateTask, setRemAutoCreateTask] = useState(true);
  const [remAttachments, setRemAttachments] = useState<TaskAttachment[]>([]);
  const [fileError, setFileError] = useState("");

  // Submit report modal state
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitFiles, setSubmitFiles] = useState<TaskAttachment[]>([]);

  const currentAssocMembers = useMemo(() => {
    const found = associationsList.find((a) => a.id === remAssociationId || a.name === remUnit);
    return found?.members || [];
  }, [associationsList, remAssociationId, remUnit]);

  const filteredReminders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reminders.filter((r) => {
      if (frequencyFilter !== "all" && r.frequency !== frequencyFilter) return false;
      if (recipientFilter !== "all" && !r.recipientOrg.toLowerCase().includes(recipientFilter.toLowerCase())) {
        return false;
      }
      if (q) {
        const hit =
          r.title.toLowerCase().includes(q) ||
          r.recipientOrg.toLowerCase().includes(q) ||
          r.responsiblePerson.name.toLowerCase().includes(q) ||
          r.responsibleUnit.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [reminders, frequencyFilter, recipientFilter, searchQuery]);

  const handleToggleActive = (id: string) => {
    const updated = reminders.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    onSaveReminders(updated);
    onNotify("Đã cập nhật trạng thái kích hoạt lịch nhắc.", "info");
  };

  const openCreateReminder = () => {
    setEditingReminder(null);
    setRemTitle("");
    setRemTitleError("");
    setRemDesc("");
    setRemFrequency("weekly");
    setRemTime("16:30");
    setRemDayOfWeek(6);
    setRemDayOfMonth(15);
    setRemMonthOfYear(12);
    setRemRecipient(RECIPIENT_ORGS[0]);
    setCustomRecipient("");
    setRemAutoCreateTask(true);
    setRemAttachments([]);
    setFileError("");
    setShowAddModal(true);
  };

  const openEditReminder = (rem: RecurringReminder) => {
    setEditingReminder(rem);
    setRemTitle(rem.title);
    setRemTitleError("");
    setRemDesc(rem.description || "");
    setRemFrequency(rem.frequency);
    setRemTime(rem.frequencyDetail?.time || "16:30");
    setRemDayOfWeek(rem.frequencyDetail?.dayOfWeek ?? 6);
    setRemDayOfMonth(rem.frequencyDetail?.dayOfMonth ?? 15);
    setRemMonthOfYear(rem.frequencyDetail?.monthOfYear ?? 12);
    if (RECIPIENT_ORGS.includes(rem.recipientOrg as any)) {
      setRemRecipient(rem.recipientOrg);
      setCustomRecipient("");
    } else {
      setRemRecipient("__CUSTOM__");
      setCustomRecipient(rem.recipientOrg);
    }
    const matchedAssoc = associationsList.find((a) => a.name === rem.responsibleUnit);
    if (matchedAssoc) {
      setRemAssociationId(matchedAssoc.id);
    }
    setRemUnit(rem.responsibleUnit);
    setRemPersonName(rem.responsiblePerson.name);
    setRemPersonRole(rem.responsiblePerson.role);
    setRemPersonPhone(rem.responsiblePerson.phone || "");
    setRemChannels(rem.notifyChannels || ["in_app"]);
    setRemAutoCreateTask(Boolean(rem.autoCreateTask));
    setRemAttachments(rem.attachments || []);
    setFileError("");
    setSelectedReminder(null);
    setShowAddModal(true);
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) {
      setRemTitleError("Vui lòng nhập tiêu đề lịch báo cáo.");
      return;
    }

    const finalRecipient =
      remRecipient === "__CUSTOM__" ? customRecipient.trim() || "Cơ quan cấp trên" : remRecipient;

    const today = new Date();
    const nextDate = new Date(today);
    if (remFrequency === "daily") nextDate.setDate(today.getDate() + 1);
    else if (remFrequency === "weekly") nextDate.setDate(today.getDate() + 7);
    else if (remFrequency === "monthly") nextDate.setMonth(today.getMonth() + 1);
    else if (remFrequency === "quarterly") nextDate.setMonth(today.getMonth() + 3);
    else nextDate.setFullYear(today.getFullYear() + 1);
    const nextDueStr = nextDate.toISOString().split("T")[0];

    const newRem: RecurringReminder = {
      id: editingReminder?.id || `REM-${String(reminders.length + 1).padStart(3, "0")}`,
      title: remTitle.trim(),
      description: remDesc.trim() || "Thực hiện báo cáo đúng hạn theo quy định.",
      frequency: remFrequency,
      frequencyDetail: {
        time: remTime,
        dayOfWeek: remFrequency === "weekly" ? remDayOfWeek : undefined,
        dayOfMonth:
          remFrequency === "monthly" || remFrequency === "quarterly" || remFrequency === "yearly"
            ? remDayOfMonth
            : undefined,
        monthOfYear: remFrequency === "yearly" ? remMonthOfYear : undefined,
      },
      recipientOrg: finalRecipient,
      responsibleUnit: remUnit,
      responsiblePerson: {
        name: remPersonName || "Cán bộ phụ trách",
        role: remPersonRole || "Phụ trách báo cáo",
        phone: remPersonPhone,
      },
      notifyChannels: remChannels.length > 0 ? remChannels : ["in_app"],
      isActive: editingReminder ? editingReminder.isActive : true,
      nextDueDate: editingReminder?.nextDueDate || nextDueStr,
      status: editingReminder?.status || "Đúng hạn",
      lastSubmittedDate: editingReminder?.lastSubmittedDate,
      submissionNotes: editingReminder?.submissionNotes,
      submittedFiles: editingReminder?.submittedFiles,
      attachments: remAttachments.length > 0 ? remAttachments : undefined,
      autoCreateTask: remAutoCreateTask,
      createdAt: editingReminder?.createdAt || today.toISOString().split("T")[0],
    };

    if (editingReminder) {
      onSaveReminders(reminders.map((r) => (r.id === editingReminder.id ? newRem : r)));
      setEditingReminder(null);
      setShowAddModal(false);
      onNotify(`Đã cập nhật lịch báo cáo "${newRem.title}".`, "success");
      return;
    }

    if (remAutoCreateTask) {
      onAutoCreateTask({
        id: `TASK-${Date.now().toString().slice(-4)}`,
        title: `[Báo cáo định kỳ] ${newRem.title}`,
        unit: remUnit,
        associationId: remAssociationId,
        assignee: {
          name: remPersonName || "Cán bộ phụ trách",
          role: remPersonRole || "Phụ trách báo cáo",
          unit: remUnit,
          phone: remPersonPhone,
        },
        creator: "Hệ thống nhắc việc định kỳ KP3",
        startDate: today.toISOString().split("T")[0],
        deadline: nextDueStr,
        priority: "Cao",
        status: "Chờ xử lý",
        progressPercent: 0,
        description: `Báo cáo định kỳ gửi ${finalRecipient} (giờ quy định ${remTime}). ${remDesc.trim()}`,
        attachments: remAttachments.length > 0 ? remAttachments : undefined,
      });
    }

    onSaveReminders([newRem, ...reminders]);
    setShowAddModal(false);
    setRemTitle("");
    setRemTitleError("");
    setRemDesc("");
    setRemAttachments([]);
    setFileError("");
    onNotify(`Đã thiết lập lịch báo cáo "${newRem.title}" thành công!`, "success");
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingReminder) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const nextDate = new Date(submittingReminder.nextDueDate);
    if (submittingReminder.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
    else if (submittingReminder.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (submittingReminder.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
    else if (submittingReminder.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);
    const nextDueStr = nextDate.toISOString().split("T")[0];

    const updated = reminders.map((r) =>
      r.id === submittingReminder.id
        ? {
            ...r,
            lastSubmittedDate: todayStr,
            nextDueDate: nextDueStr,
            status: "Đã nộp kỳ này" as const,
            submissionNotes: submitNotes.trim() || undefined,
            submittedFiles: [...(r.submittedFiles || []), ...submitFiles],
          }
        : r
    );

    onSaveReminders(updated);
    onNotify(
      `Đã nộp báo cáo "${submittingReminder.title}" lên ${submittingReminder.recipientOrg}. Hạn kế tiếp: ${nextDueStr}.`,
      "success"
    );
    setSubmittingReminder(null);
    setSubmitNotes("");
    setSubmitFiles([]);
  };

  const handleUnitSelect = (id: string) => {
    const assoc = associationsList.find((a) => a.id === id || a.name === id);
    if (assoc) {
      setRemAssociationId(assoc.id);
      setRemUnit(assoc.name);
      const leader = assoc.members?.[0];
      setRemPersonName(leader?.fullName || assoc.leaderName || "");
      setRemPersonRole(leader?.role || "Đại diện đơn vị");
      setRemPersonPhone(leader?.phone || "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <search className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] lg:max-w-xs">
            <label htmlFor="reminder-search-input" className="sr-only">
              Tìm lịch báo cáo định kỳ
            </label>
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="reminder-search-input"
              name="reminderSearch"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tiêu đề, cơ quan, cán bộ..."
              className="w-full h-11 md:h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <ReportSelect
            aria-label="Lọc theo chu kỳ"
            value={frequencyFilter}
            onChange={setFrequencyFilter}
            className="w-full sm:w-44"
            options={[
              { value: "all", label: `Tất cả chu kỳ (${reminders.length})` },
              { value: "daily", label: "Hàng ngày" },
              { value: "weekly", label: "Hàng tuần" },
              { value: "monthly", label: "Hàng tháng" },
              { value: "quarterly", label: "Hàng quý" },
              { value: "yearly", label: "Hàng năm" },
            ]}
          />

          <ReportSelect
            aria-label="Lọc theo nơi nhận báo cáo"
            value={recipientFilter}
            onChange={setRecipientFilter}
            className="w-full sm:w-56"
            options={[
              { value: "all", label: "Tất cả nơi nhận" },
              ...RECIPIENT_ORGS.map((org) => ({ value: org, label: org })),
            ]}
          />
        </div>

        <Button
          id="btn-add-reminder-modal"
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={openCreateReminder}
        >
          Cài đặt nhắc hẹn mới
        </Button>
      </search>

      {/* Cards Grid */}
      {filteredReminders.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title="Không tìm thấy lịch báo cáo phù hợp"
          description="Thử thay đổi bộ lọc chu kỳ hoặc cơ quan nhận để xem đầy đủ lịch nhắc việc KP3."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReminders.map((rem) => (
            <article
              key={rem.id}
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                rem.isActive
                  ? "border-slate-200 hover:border-slate-300"
                  : "border-slate-200 bg-slate-50/70 opacity-85"
              }`}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getFrequencyBadge(rem.frequency)}
                    {getReminderStatusBadge(rem.status)}
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rem.isActive}
                      onChange={() => handleToggleActive(rem.id)}
                      className="h-4 w-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <span>Bật nhắc</span>
                  </label>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{rem.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-start gap-1.5">
                    <Building2 size={14} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Nơi nhận: <strong className="text-slate-900">{rem.recipientOrg}</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <User size={14} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Phụ trách: <strong className="text-slate-900">{rem.responsiblePerson.name}</strong> ({rem.responsibleUnit})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-indigo-800 font-semibold">
                    <Clock size={14} className="shrink-0" aria-hidden="true" />
                    <span>
                      {formatFrequencyText(rem)} • Hạn: {rem.nextDueDate}
                    </span>
                  </div>
                </div>

                {rem.attachments && rem.attachments.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText size={14} className="text-indigo-700 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{rem.attachments[0].name}</span>
                    </div>
                    {rem.attachments[0].url && (
                      <a
                        href={rem.attachments[0].url}
                        download={rem.attachments[0].name}
                        className="px-2 py-1 rounded bg-white border border-slate-200 text-indigo-800 font-semibold inline-flex items-center gap-1 shrink-0 hover:bg-slate-50"
                      >
                        <Download size={12} /> Tải mẫu
                      </a>
                    )}
                  </div>
                )}

                {rem.lastSubmittedDate && (
                  <div className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 font-medium">
                    <CheckCheck size={14} className="text-emerald-700" />
                    <span>Đã nộp kỳ gần nhất: {rem.lastSubmittedDate}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    id={`btn-submit-reminder-${rem.id}`}
                    variant="emerald"
                    size="sm"
                    leftIcon={<FileCheck size={14} />}
                    onClick={() => {
                      setSubmittingReminder(rem);
                      setSubmitFiles([]);
                      setSubmitNotes("");
                    }}
                  >
                    Nộp báo cáo
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<BellRing size={14} />}
                    onClick={() =>
                      onNotify(
                        `Đã gửi thông báo nhắc hạn "${rem.title}" tới ${rem.responsiblePerson.name} (${rem.responsiblePerson.phone || "KP3"}).`,
                        "warning"
                      )
                    }
                  >
                    Nhắc
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReminder(rem)}>
                    Chi tiết
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditReminder(rem)}
                    aria-label={`Sửa lịch nhắc ${rem.title}`}
                    title="Sửa lịch nhắc"
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    onClick={() => onRequestDelete(rem)}
                    aria-label={`Xóa lịch nhắc ${rem.title}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal 1: Add / Edit Reminder */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingReminder(null);
        }}
        title={
          editingReminder
            ? "Cập nhật lịch báo cáo & nhắc việc"
            : "Cài đặt lịch báo cáo & nhắc việc định kỳ"
        }
        description="Tự động nhắc hạn nộp báo cáo lên UBND, Đảng ủy, Công an Phường và tạo việc theo dõi"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setShowAddModal(false);
                setEditingReminder(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="add-reminder-form"
              variant="primary"
              size="md"
              leftIcon={editingReminder ? <Edit2 size={15} /> : <Plus size={16} />}
            >
              {editingReminder ? "Lưu thay đổi" : "Lưu lịch nhắc hẹn"}
            </Button>
          </div>
        }
      >
        <form id="add-reminder-form" onSubmit={handleCreateReminder} noValidate className="space-y-4">
          <Input
            id="reminder-title-input"
            label="Tên lịch báo cáo / đầu việc lặp lại"
            required
            value={remTitle}
            onChange={(e) => {
              setRemTitle(e.target.value);
              if (e.target.value.trim()) setRemTitleError("");
            }}
            onBlur={() => {
              if (!remTitle.trim()) setRemTitleError("Vui lòng nhập tiêu đề lịch báo cáo.");
            }}
            error={remTitleError}
            placeholder="Ví dụ: Báo cáo an ninh trật tự cuối tuần"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Chu kỳ lặp lại</label>
              <ReportSelect
                aria-label="Chu kỳ lặp lại"
                value={remFrequency}
                onChange={(v) => setRemFrequency(v as RecurringReminder["frequency"])}
                options={[
                  { value: "daily", label: "Hàng ngày" },
                  { value: "weekly", label: "Hàng tuần" },
                  { value: "monthly", label: "Hàng tháng" },
                  { value: "quarterly", label: "Hàng quý" },
                  { value: "yearly", label: "Hàng năm" },
                ]}
              />
            </div>

            <Input
              id="reminder-time-input"
              label="Giờ nhắc / hạn nộp"
              type="time"
              value={remTime}
              onChange={(e) => setRemTime(e.target.value)}
            />
          </div>

          {remFrequency === "weekly" && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Thứ trong tuần</label>
              <ReportSelect
                aria-label="Thứ trong tuần"
                value={String(remDayOfWeek)}
                onChange={(v) => setRemDayOfWeek(Number(v))}
                options={[
                  { value: "1", label: "Thứ Hai" },
                  { value: "2", label: "Thứ Ba" },
                  { value: "3", label: "Thứ Tư" },
                  { value: "4", label: "Thứ Năm" },
                  { value: "5", label: "Thứ Sáu" },
                  { value: "6", label: "Thứ Bảy" },
                  { value: "0", label: "Chủ Nhật" },
                ]}
              />
            </div>
          )}

          {(remFrequency === "monthly" || remFrequency === "quarterly" || remFrequency === "yearly") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ngày trong tháng"
                type="number"
                min={1}
                max={31}
                value={String(remDayOfMonth)}
                onChange={(e) => setRemDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              />
              {remFrequency === "yearly" && (
                <Input
                  label="Tháng trong năm"
                  type="number"
                  min={1}
                  max={12}
                  value={String(remMonthOfYear)}
                  onChange={(e) => setRemMonthOfYear(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Cơ quan tiếp nhận</label>
              <ReportSelect
                aria-label="Cơ quan tiếp nhận"
                value={remRecipient}
                onChange={setRemRecipient}
                options={[
                  ...RECIPIENT_ORGS.map((org) => ({ value: org, label: org })),
                  { value: "__CUSTOM__", label: "+ Nhập cơ quan khác..." },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Đơn vị thực hiện</label>
              <ReportSelect
                aria-label="Đơn vị thực hiện"
                value={remAssociationId}
                onChange={handleUnitSelect}
                options={associationsList.map((a) => ({ value: a.id, label: a.name }))}
              />
            </div>
          </div>

          {remRecipient === "__CUSTOM__" && (
            <Input
              label="Tên cơ quan tiếp nhận khác"
              value={customRecipient}
              onChange={(e) => setCustomRecipient(e.target.value)}
              placeholder="Ví dụ: Hội Liên hiệp Phụ nữ Phường"
            />
          )}

          {currentAssocMembers.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Cán bộ chịu trách nhiệm</label>
              <ReportSelect
                aria-label="Cán bộ chịu trách nhiệm"
                value={remPersonName}
                onChange={(val) => {
                  const found = currentAssocMembers.find((m) => m.fullName === val || m.id === val);
                  if (found) {
                    setRemPersonName(found.fullName);
                    setRemPersonRole(found.role);
                    setRemPersonPhone(found.phone || "");
                  }
                }}
                options={currentAssocMembers.map((m) => ({
                  value: m.fullName,
                  label: `${m.fullName} (${m.role})`,
                }))}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="rem-desc" className="block text-sm font-medium text-slate-700">
              Hướng dẫn & nội dung mẫu cần tổng hợp
            </label>
            <textarea
              id="rem-desc"
              rows={2}
              value={remDesc}
              onChange={(e) => setRemDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-xs font-semibold text-slate-800 block">Kênh nhắc việc & tự động hóa</span>
            <div className="flex flex-wrap gap-3 text-xs text-slate-800">
              {(
                [
                  { id: "in_app", label: "Chuông ứng dụng" },
                  { id: "banner", label: "Banner ưu tiên" },
                  { id: "zalo_sms", label: "Nhắc Zalo/SMS" },
                  { id: "email", label: "Email văn phòng" },
                ] as const
              ).map((ch) => (
                <label key={ch.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remChannels.includes(ch.id)}
                    onChange={(e) =>
                      setRemChannels((prev) =>
                        e.target.checked ? [...prev, ch.id] : prev.filter((item) => item !== ch.id)
                      )
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>{ch.label}</span>
                </label>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={remAutoCreateTask}
                onChange={(e) => setRemAutoCreateTask(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span>Tự động tạo thẻ nhiệm vụ trong Kanban khi lưu lịch nhắc</span>
            </label>
          </div>

          {fileError && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {fileError}
            </p>
          )}

          <AttachmentGallery
            label="Biểu mẫu báo cáo đính kèm"
            attachments={remAttachments}
            onAddFiles={(files) => setRemAttachments((prev) => [...prev, ...files])}
            onRemoveFile={(id) => setRemAttachments((prev) => prev.filter((a) => a.id !== id))}
            onPreviewFile={setPreviewAtt}
            onFileError={setFileError}
          />
        </form>
      </Modal>

      {/* Modal 2: Submit Report */}
      <Modal
        isOpen={Boolean(submittingReminder)}
        onClose={() => setSubmittingReminder(null)}
        title={`Nộp báo cáo: ${submittingReminder?.title || ""}`}
        description={`Gửi đến: ${submittingReminder?.recipientOrg || ""}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="md" onClick={() => setSubmittingReminder(null)}>
              Hủy
            </Button>
            <Button type="submit" form="submit-reminder-form" variant="emerald" size="md" leftIcon={<FileCheck size={16} />}>
              Xác nhận đã nộp kỳ này
            </Button>
          </div>
        }
      >
        <form id="submit-reminder-form" onSubmit={handleConfirmSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="submit-rem-notes" className="block text-sm font-medium text-slate-700">
              Ghi chú số liệu nộp kỳ này
            </label>
            <textarea
              id="submit-rem-notes"
              rows={3}
              value={submitNotes}
              onChange={(e) => setSubmitNotes(e.target.value)}
              placeholder="Ví dụ: Đã gửi bản ký số qua trục liên thông UBND Phường..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <AttachmentGallery
            label="Tài liệu / biên bản đã nộp"
            attachments={submitFiles}
            onAddFiles={(files) => setSubmitFiles((prev) => [...prev, ...files])}
            onRemoveFile={(id) => setSubmitFiles((prev) => prev.filter((a) => a.id !== id))}
            onPreviewFile={setPreviewAtt}
            onFileError={setFileError}
          />
        </form>
      </Modal>

      {/* Modal 3: Detail & Submission History */}
      <Modal
        isOpen={Boolean(selectedReminder)}
        onClose={() => setSelectedReminder(null)}
        title={selectedReminder?.title || ""}
        description={`Chu kỳ: ${selectedReminder ? formatFrequencyText(selectedReminder) : ""}`}
        size="md"
        footer={
          selectedReminder ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="destructive"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={() => {
                  const target = selectedReminder;
                  setSelectedReminder(null);
                  onRequestDelete(target);
                }}
              >
                Xóa
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedReminder(null)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit2 size={14} />}
                  onClick={() => openEditReminder(selectedReminder)}
                >
                  Sửa lịch nhắc
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {selectedReminder && (
          <div className="space-y-4 text-sm text-slate-800">
            <div className="flex flex-wrap gap-2">
              {getFrequencyBadge(selectedReminder.frequency)}
              {getReminderStatusBadge(selectedReminder.status)}
            </div>
            <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed">
              {selectedReminder.description}
            </p>
            <dl className="@container divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4 py-1">
              <DetailRow label="Cơ quan nhận" value={selectedReminder.recipientOrg} />
              <DetailRow
                label="Đơn vị phụ trách"
                value={selectedReminder.responsibleUnit}
              />
              <DetailRow
                label="Cán bộ phụ trách"
                value={`${selectedReminder.responsiblePerson.name} (${selectedReminder.responsiblePerson.role})`}
              />
              <DetailRow
                label="SĐT liên hệ"
                value={selectedReminder.responsiblePerson.phone}
                href={
                  selectedReminder.responsiblePerson.phone
                    ? `tel:${selectedReminder.responsiblePerson.phone}`
                    : undefined
                }
                copyValue={selectedReminder.responsiblePerson.phone}
                isMono
              />
              <DetailRow
                label="Hạn kỳ tới"
                value={selectedReminder.nextDueDate}
                isMono
              />
              {selectedReminder.submissionNotes && (
                <DetailRow
                  label="Ghi chú kỳ gần nhất"
                  value={selectedReminder.submissionNotes}
                />
              )}
            </dl>

            {selectedReminder.submittedFiles && selectedReminder.submittedFiles.length > 0 && (
              <AttachmentGallery
                label="Hồ sơ đã nộp các kỳ"
                attachments={selectedReminder.submittedFiles}
                onAddFiles={() => {}}
                onPreviewFile={setPreviewAtt}
                readOnly
              />
            )}
          </div>
        )}
      </Modal>

      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </div>
  );
};
