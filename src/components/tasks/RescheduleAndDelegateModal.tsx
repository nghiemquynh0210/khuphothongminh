import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { Association, ScheduleEvent } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  applyScheduleAdjustment,
  delegateScheduleOfficer,
  detectScheduleConflicts,
  getScheduleOfficerNames,
  shiftIsoDateByDays,
} from "../../utils/wardScheduleAnalyzer";

interface RescheduleAndDelegateModalProps {
  schedule: ScheduleEvent | null;
  initialMode?: "reschedule" | "delegate" | "postpone";
  onClose: () => void;
  allSchedules: ScheduleEvent[];
  associations: Association[];
  actorLabel: string;
  onSaveAdjustedSchedule: (
    updatedSchedule: ScheduleEvent,
    options?: { shiftLinkedTasksToDate?: string }
  ) => void;
}

const QUICK_REASONS = [
  "Theo thông báo điều chỉnh lịch của Văn phòng UBND Phường",
  "Theo điều chỉnh của Thường trực Đảng ủy Phường",
  "Đổi hội trường / địa điểm tổ chức",
  "Ban Điều hành Khu phố 3 điều chỉnh giờ họp nội bộ",
];

export const RescheduleAndDelegateModal: React.FC<
  RescheduleAndDelegateModalProps
> = ({
  schedule,
  initialMode = "reschedule",
  onClose,
  allSchedules,
  associations,
  actorLabel,
  onSaveAdjustedSchedule,
}) => {
  const [mode, setMode] = useState<"reschedule" | "delegate" | "postpone">(
    initialMode
  );
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [reason, setReason] = useState("");
  const [syncLinkedTaskDeadline, setSyncLinkedTaskDeadline] = useState(true);

  const [fromOfficerName, setFromOfficerName] = useState("");
  const [selectedSubstituteKey, setSelectedSubstituteKey] = useState("");

  const rosterOptions = useMemo(() => {
    const list: Array<{
      key: string;
      name: string;
      role: string;
      assocName: string;
      associationId: string;
      phone?: string;
    }> = [];
    const seen = new Set<string>();
    for (const assoc of associations) {
      for (const m of assoc.members || []) {
        const key = `${m.fullName}|${assoc.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            key,
            name: m.fullName,
            role: m.role,
            assocName: assoc.name,
            associationId: assoc.id,
            phone: m.phone,
          });
        }
      }
    }
    return list;
  }, [associations]);

  const currentAssignedNames = useMemo(
    () => (schedule ? getScheduleOfficerNames(schedule) : []),
    [schedule]
  );

  useEffect(() => {
    if (!schedule) return;
    setMode(initialMode);
    setNewDate(schedule.date);
    setNewTime(schedule.time);
    setNewLocation(schedule.location);
    setReason("");
    setSyncLinkedTaskDeadline(true);
    const firstAssigned = currentAssignedNames[0] || "";
    setFromOfficerName(firstAssigned);
    const primaryOfficer = schedule.assignedOfficers?.find(
      (o) => o.name === firstAssigned
    );
    const preferredAssocId = primaryOfficer?.associationId;
    const sameAssocDeputy = preferredAssocId
      ? rosterOptions.find(
          (r) =>
            r.associationId === preferredAssocId &&
            r.name !== firstAssigned &&
            /phó/i.test(r.role)
        ) ||
        rosterOptions.find(
          (r) => r.associationId === preferredAssocId && r.name !== firstAssigned
        )
      : undefined;
    const defaultSub =
      sameAssocDeputy || rosterOptions.find((r) => r.name !== firstAssigned);
    setSelectedSubstituteKey(defaultSub?.key || "");
  }, [schedule, initialMode, currentAssignedNames, rosterOptions]);

  // Kiểm tra xung đột trực tiếp với ngày/giờ mới dự kiến
  const previewConflicts = useMemo(() => {
    if (!schedule || mode !== "reschedule") return [];
    const simulated: ScheduleEvent = {
      ...schedule,
      date: newDate || schedule.date,
      time: newTime || schedule.time,
      status: "Sắp diễn ra",
    };
    const nextList = allSchedules.map((s) =>
      s.id === schedule.id ? simulated : s
    );
    return detectScheduleConflicts(nextList).filter(
      (c) => c.scheduleA.id === schedule.id || c.scheduleB.id === schedule.id
    );
  }, [schedule, mode, newDate, newTime, allSchedules]);

  if (!schedule) return null;

  const isCurrentlyPostponed = schedule.status === "Đã hoãn";

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reschedule") {
      const actionType =
        newDate === schedule.date &&
        newTime === schedule.time &&
        newLocation !== schedule.location
          ? "location_change"
          : isCurrentlyPostponed
          ? "reopen"
          : "reschedule";

      const updated = applyScheduleAdjustment(schedule, {
        actionType,
        newDate,
        newTime,
        newLocation,
        reason: reason || "Điều chỉnh thời gian / địa điểm lịch công tác",
        changedBy: actorLabel,
      });

      const prevDayBefore = shiftIsoDateByDays(newDate, -1);
      onSaveAdjustedSchedule(updated, {
        shiftLinkedTasksToDate:
          syncLinkedTaskDeadline &&
          newDate !== schedule.date &&
          (schedule.linkedTaskIds?.length || 0) > 0
            ? prevDayBefore
            : undefined,
      });
      onClose();
      return;
    }

    if (mode === "postpone") {
      const updated = applyScheduleAdjustment(schedule, {
        actionType: isCurrentlyPostponed ? "reopen" : "postpone",
        newDate: schedule.date,
        newTime: schedule.time,
        newLocation: schedule.location,
        reason:
          reason ||
          (isCurrentlyPostponed
            ? "Khôi phục lịch công tác hoạt động trở lại"
            : "Tạm hoãn chờ thông báo thời gian mới từ cấp trên"),
        changedBy: actorLabel,
      });
      onSaveAdjustedSchedule(updated);
      onClose();
      return;
    }

    if (mode === "delegate") {
      const chosenSub = rosterOptions.find((r) => r.key === selectedSubstituteKey);
      if (!chosenSub) return;
      const updated = delegateScheduleOfficer(schedule, {
        fromOfficerName: fromOfficerName || currentAssignedNames[0] || "Cán bộ KP3",
        toOfficerName: chosenSub.name,
        toOfficerRole: chosenSub.role,
        toOfficerPhone: chosenSub.phone,
        toAssociationId: chosenSub.associationId,
        reason: reason || "Bận công tác đột xuất, phân công dự thay",
        changedBy: actorLabel,
      });
      onSaveAdjustedSchedule(updated);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={Boolean(schedule)}
      onClose={onClose}
      size="2xl"
      title="Điều Chỉnh Lịch, Dời Giờ Hoặc Cử Cán Bộ Đi Dự Thay"
      description={schedule.title}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="md" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="reschedule-delegate-form"
            variant="primary"
            size="md"
            leftIcon={
              mode === "delegate" ? (
                <UserCheck size={15} />
              ) : mode === "postpone" ? (
                isCurrentlyPostponed ? (
                  <PlayCircle size={15} />
                ) : (
                  <PauseCircle size={15} />
                )
              ) : (
                <RefreshCw size={15} />
              )
            }
          >
            {mode === "delegate"
              ? "Xác nhận Cử đi dự thay"
              : mode === "postpone"
              ? isCurrentlyPostponed
                ? "Mở lại lịch công tác"
                : "Xác nhận Tạm hoãn lịch"
              : "Lưu điều chỉnh / Dời lịch"}
          </Button>
        </div>
      }
    >
      <form
        id="reschedule-delegate-form"
        onSubmit={handleConfirm}
        className="space-y-4 text-xs"
      >
        {/* 3 chế độ điều chỉnh */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === "reschedule"
                ? "bg-white text-emerald-900 border border-slate-200 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <RefreshCw size={13} />
            <span>Dời ngày / Đổi giờ</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("delegate")}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === "delegate"
                ? "bg-white text-indigo-900 border border-slate-200 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={13} />
            <span>Cử người đi dự thay</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("postpone")}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === "postpone"
                ? "bg-white text-amber-900 border border-slate-200 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PauseCircle size={13} />
            <span>{isCurrentlyPostponed ? "Mở lại lịch" : "Tạm hoãn lịch"}</span>
          </button>
        </div>

        {/* Khung thông tin hiện tại */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Lịch hiện tại đang ghi nhận:
            </span>
            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
              {schedule.date.split("-").reverse().join("/")} • {schedule.time}
            </span>
            <span className="text-slate-600 block mt-0.5">
              Địa điểm: <strong>{schedule.location}</strong>
            </span>
          </div>
          {newDate !== schedule.date || newTime !== schedule.time ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-950">
              <ArrowRight size={14} className="text-emerald-700" />
              <div>
                <span className="text-[10.5px] font-semibold block">Chuyển sang:</span>
                <span className="font-mono font-black">
                  {newDate.split("-").reverse().join("/")} • {newTime}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {mode === "reschedule" && (
          <div className="space-y-3.5">
            {/* Các nút dời nhanh 1 chạm */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-600 mr-1">
                Dời nhanh:
              </span>
              <button
                type="button"
                onClick={() => setNewTime("14:00 - 16:30")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 font-semibold cursor-pointer"
              >
                Sang buổi Chiều (14:00)
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewDate(shiftIsoDateByDays(schedule.date, 1));
                  setNewTime("08:00 - 10:30");
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 font-semibold cursor-pointer"
              >
                Sáng ngày mai (+1 ngày)
              </button>
              <button
                type="button"
                onClick={() => setNewDate(shiftIsoDateByDays(schedule.date, 7))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 font-semibold cursor-pointer"
              >
                Tuần sau (+7 ngày)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ngày tổ chức mới"
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <Input
                label="Khung giờ mới"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="VD: 14:00 - 16:30"
              />
            </div>

            <Input
              label="Địa điểm / Hội trường (nếu có thay đổi)"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />

            {previewConflicts.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-rose-700" />
                  <span>
                    Cảnh báo: Khung giờ mới bị trùng lịch của{" "}
                    {previewConflicts[0].overlappingOfficers.join(", ")}!
                  </span>
                </div>
                <p className="text-[11.5px]">
                  Trùng với:{" "}
                  <strong>
                    {previewConflicts[0].scheduleA.id === schedule.id
                      ? previewConflicts[0].scheduleB.title
                      : previewConflicts[0].scheduleA.title}
                  </strong>{" "}
                  ({previewConflicts[0].overlapTimeWindow}).
                </p>
              </div>
            )}

            {(schedule.linkedTaskIds?.length || 0) > 0 &&
              newDate !== schedule.date && (
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncLinkedTaskDeadline}
                    onChange={(e) => setSyncLinkedTaskDeadline(e.target.checked)}
                    className="rounded border-amber-300 text-amber-700"
                  />
                  <span>
                    Tự động dời hạn chót của {schedule.linkedTaskIds?.length} Nhiệm vụ
                    chuẩn bị liên kết sang ngày{" "}
                    {shiftIsoDateByDays(newDate, -1).split("-").reverse().join("/")}
                  </span>
                </label>
              )}
          </div>
        )}

        {mode === "delegate" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 block">
                Cán bộ bận công tác cần ủy quyền
              </label>
              {currentAssignedNames.length > 1 ? (
                <select
                  aria-label="Chọn cán bộ ủy quyền"
                  value={fromOfficerName}
                  onChange={(e) => setFromOfficerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  {currentAssignedNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={fromOfficerName}
                  onChange={(e) => setFromOfficerName(e.target.value)}
                  placeholder="Nhập tên cán bộ được mời ban đầu"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 block">
                Cử cán bộ Khu phố 3 đi dự thay *
              </label>
              <select
                aria-label="Chọn cán bộ đi dự thay"
                value={selectedSubstituteKey}
                onChange={(e) => setSelectedSubstituteKey(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                {rosterOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.name} — {opt.role} ({opt.assocName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Lý do điều chỉnh / dời lịch */}
        <div className="space-y-1.5">
          <Input
            label="Lý do điều chỉnh / Số văn bản thông báo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Theo thông báo dời lịch của VP UBND Phường sáng 17/11..."
          />
          {mode === "reschedule" && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_REASONS.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 cursor-pointer"
                >
                  + {qr}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
