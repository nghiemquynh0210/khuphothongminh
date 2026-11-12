import React from "react";
import { AlertTriangle, Bell, CalendarCheck, CheckCircle2, Clock, Flame } from "lucide-react";
import { RecurringReminder, TaskItem } from "../../types";

export const getFrequencyBadge = (f: RecurringReminder["frequency"]) => {
  switch (f) {
    case "daily":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold">
          Hàng ngày
        </span>
      );
    case "weekly":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
          Hàng tuần
        </span>
      );
    case "monthly":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs font-semibold">
          Hàng tháng
        </span>
      );
    case "quarterly":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-purple-200 bg-purple-50 text-purple-900 text-xs font-semibold">
          Hàng quý
        </span>
      );
    case "yearly":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50 text-rose-900 text-xs font-semibold">
          Hàng năm
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-100 text-slate-800 text-xs font-medium">
          {f}
        </span>
      );
  }
};

export const getReminderStatusBadge = (s: RecurringReminder["status"]) => {
  switch (s) {
    case "Hôm nay đến hạn":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-900 text-xs font-semibold">
          <Bell size={12} aria-hidden="true" /> Hôm nay đến hạn
        </span>
      );
    case "Sắp đến hạn":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold">
          <Clock size={12} aria-hidden="true" /> Sắp đến hạn
        </span>
      );
    case "Đã nộp kỳ này":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
          <CheckCircle2 size={12} aria-hidden="true" /> Đã nộp kỳ này
        </span>
      );
    case "Quá hạn":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-100 text-rose-950 text-xs font-bold">
          <AlertTriangle size={12} aria-hidden="true" /> Quá hạn
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-900 text-xs font-medium">
          <CalendarCheck size={12} aria-hidden="true" /> Đúng hạn
        </span>
      );
  }
};

export const getPriorityBadge = (p: TaskItem["priority"]) => {
  switch (p) {
    case "Khẩn cấp":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-900 text-xs font-bold">
          <Flame size={12} className="text-rose-700" aria-hidden="true" /> Khẩn cấp
        </span>
      );
    case "Cao":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold">
          Ưu tiên cao
        </span>
      );
    case "Trung bình":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-900 text-xs font-medium">
          Bình thường
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-800 text-xs font-medium">
          Thấp
        </span>
      );
  }
};

export const getStatusBadge = (s: TaskItem["status"]) => {
  switch (s) {
    case "Chờ xử lý":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-800 text-xs font-semibold">
          Chờ xử lý
        </span>
      );
    case "Đang thực hiện":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-900 text-xs font-semibold">
          Đang thực hiện
        </span>
      );
    case "Chờ nghiệm thu":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-900 text-xs font-semibold">
          Chờ nghiệm thu
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
          Hoàn thành
        </span>
      );
  }
};

export const getScheduleTypeBadge = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes("chi bộ")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50 text-rose-900 text-xs font-semibold">
        {type}
      </span>
    );
  }
  if (normalized.includes("tổ")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
        {type}
      </span>
    );
  }
  if (normalized.includes("antt") || normalized.includes("tuần tra")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold">
        {type}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs font-semibold">
      {type}
    </span>
  );
};
