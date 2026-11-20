import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  Landmark,
  Layers,
  Loader2,
  MapPin,
  PauseCircle,
  RefreshCw,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { Association, ScheduleEvent } from "../../types";
import { getStaffAuthHeaders } from "../../utils/imageUpload";
import { extractKeyLeadersSummary } from "../../utils/leadershipSync";
import {
  buildWeeklyZaloDigest,
  detectScheduleConflicts,
  getScheduleOfficerNames,
  inferSessionPeriod,
  parseStartMinutes,
  shiftIsoDateByDays,
} from "../../utils/wardScheduleAnalyzer";

interface WeeklyScheduleMatrixProps {
  schedules: ScheduleEvent[];
  associations: Association[];
  focusDate?: string | null;
  onSelectSchedule: (sch: ScheduleEvent) => void;
  onOpenReschedule: (
    sch: ScheduleEvent,
    mode?: "reschedule" | "delegate" | "postpone"
  ) => void;
  onEditSchedule: (sch: ScheduleEvent) => void;
  onNotify?: (msg: string, tone?: "success" | "info" | "warning") => void;
}

function getMondayOfIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = y && m && d ? new Date(y, m - 1, d) : new Date();
  const day = dt.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMon = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMon);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function formatDmyShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const WEEKDAY_NAMES = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
];

export const WeeklyScheduleMatrix: React.FC<WeeklyScheduleMatrixProps> = ({
  schedules,
  associations,
  focusDate,
  onSelectSchedule,
  onOpenReschedule,
  onEditSchedule,
  onNotify,
}) => {
  const keyLeaders = useMemo(
    () => extractKeyLeadersSummary(associations),
    [associations]
  );

  // Tự động nhảy tới tuần có lịch công tác gần nhất so với hôm nay
  const initialMonday = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const kp3Active = schedules
      .filter((s) => s.relevanceTier !== "ward_reference")
      .sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = kp3Active.find((s) => s.date >= todayIso);
    if (upcoming) return getMondayOfIsoDate(upcoming.date);
    if (kp3Active.length > 0) {
      return getMondayOfIsoDate(kp3Active[kp3Active.length - 1].date);
    }
    return getMondayOfIsoDate(todayIso);
  }, [schedules]);

  const [weekMondayIso, setWeekMondayIso] = useState<string>(initialMonday);
  const [officerFilter, setOfficerFilter] = useState<string>("all");
  const [showWardRefDrawer, setShowWardRefDrawer] = useState<boolean>(false);
  const [copiedZalo, setCopiedZalo] = useState<boolean>(false);
  const [sendingScheduleId, setSendingScheduleId] = useState<string | null>(null);
  const [sendingWeekZalo, setSendingWeekZalo] = useState<boolean>(false);

  const handleDispatchZaloMeetingReminder = async (sch?: ScheduleEvent) => {
    try {
      if (sch) setSendingScheduleId(sch.id);
      else setSendingWeekZalo(true);

      // Tạo sẵn nội dung chuẩn để đồng bộ vào clipboard cho cán bộ cần dán nhanh
      const singleMsg = sch
        ? [
            `📅 [NHẮC LỊCH HỌP & CÔNG TÁC - KHU PHỐ 3 AN PHÚ]`,
            `• Nội dung: ${sch.title}`,
            `• Thời gian: ${sch.time} — Ngày ${formatDmyShort(sch.date)}`,
            `• Địa điểm: ${sch.location}`,
            `• Thành phần dự: ${sch.attendees}`,
            `Đề nghị các đồng chí sắp xếp tham dự đúng giờ. Xem chi tiết: https://bdhkp3.vercel.app/dashboard/tasks`,
          ].join("\n")
        : "";
      if (singleMsg && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(singleMsg).catch(() => {});
      }

      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "scan_or_send_cadre_meeting_reminders",
          dryRun: false,
          ...(sch ? { scheduleId: sch.id } : { daysAhead: 7 }),
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        onNotify?.(
          sch
            ? `Đã phát nhắc lịch "${sch.title}" qua Zalo OA Ban Điều hành KP3 (${
                json.sentDirectlyCount > 0
                  ? `đẩy tự động ${json.sentDirectlyCount} cán bộ`
                  : "đã tạo phiếu nhắc & chép nội dung chuẩn vào bộ nhớ tạm"
              })!`
            : `Đã phát nhắc ${json.totalMeetings || 0} lịch họp trong tuần qua hệ thống Zalo OA Khu phố 3!`,
          "success"
        );
      } else {
        onNotify?.(
          singleMsg
            ? `Đã sao chép thông báo nhắc lịch "${sch?.title}" để gửi qua Zalo OA!`
            : json?.error || "Không thể gửi nhắc lịch qua Zalo OA.",
          singleMsg ? "info" : "warning"
        );
      }
    } catch {
      onNotify?.(
        "Đã sao chép mẫu thông báo nhắc lịch họp chuẩn của Khu phố 3 vào bộ nhớ tạm!",
        "info"
      );
    } finally {
      setSendingScheduleId(null);
      setSendingWeekZalo(false);
    }
  };

  React.useEffect(() => {
    if (focusDate) {
      setWeekMondayIso(getMondayOfIsoDate(focusDate));
    }
  }, [focusDate]);

  // Nếu vừa nạp mới 1 tuần khác qua AI OCR, tự động nhảy tới tuần đó nếu tuần hiện tại trống
  React.useEffect(() => {
    const weekSun = shiftIsoDateByDays(weekMondayIso, 6);
    const hasInCurrent = schedules.some(
      (s) =>
        s.relevanceTier !== "ward_reference" &&
        s.date >= weekMondayIso &&
        s.date <= weekSun
    );
    if (!hasInCurrent && schedules.length > 0) {
      const latest = [...schedules]
        .filter((s) => s.relevanceTier !== "ward_reference")
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) {
        setWeekMondayIso(getMondayOfIsoDate(latest.date));
      }
    }
  }, [schedules.length]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const iso = shiftIsoDateByDays(weekMondayIso, idx);
      return {
        iso,
        dayName: WEEKDAY_NAMES[idx],
        dmy: formatDmyShort(iso),
      };
    });
  }, [weekMondayIso]);

  const weekSundayIso = weekDays[6].iso;

  const kp3WeekSchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        if (s.relevanceTier === "ward_reference") return false;
        if (s.date < weekMondayIso || s.date > weekSundayIso) return false;
        if (officerFilter === "all") return true;

        const names = getScheduleOfficerNames(s)
          .join(" ")
          .toLowerCase();
        const att = (s.attendees || "").toLowerCase();
        if (officerFilter === "secretary") {
          return (
            names.includes(keyLeaders.partySecretary.name.toLowerCase()) ||
            att.includes("bí thư")
          );
        }
        if (officerFilter === "head_kp") {
          return (
            names.includes(keyLeaders.neighborhoodHead.name.toLowerCase()) ||
            att.includes("trưởng ban điều hành") ||
            att.includes("trưởng khu phố")
          );
        }
        if (officerFilter === "front_mass") {
          const frontHeadLower = keyLeaders.frontHead?.name?.toLowerCase() || "";
          return (
            (frontHeadLower && names.includes(frontHeadLower)) ||
            att.includes("ctmt") ||
            att.includes("mặt trận") ||
            att.includes("phụ nữ") ||
            att.includes("thanh niên") ||
            att.includes("cựu chiến binh")
          );
        }
        return true;
      })
      .sort((a, b) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
  }, [schedules, weekMondayIso, weekSundayIso, officerFilter, keyLeaders]);

  const wardRefWeekSchedules = useMemo(() => {
    return schedules
      .filter(
        (s) =>
          s.relevanceTier === "ward_reference" &&
          s.date >= weekMondayIso &&
          s.date <= weekSundayIso
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return parseStartMinutes(a.time) - parseStartMinutes(b.time);
      });
  }, [schedules, weekMondayIso, weekSundayIso]);

  const weekConflicts = useMemo(
    () => detectScheduleConflicts(kp3WeekSchedules),
    [kp3WeekSchedules]
  );

  const conflictScheduleIdSet = useMemo(() => {
    const s = new Set<string>();
    weekConflicts.forEach((c) => {
      s.add(c.scheduleA.id);
      s.add(c.scheduleB.id);
    });
    return s;
  }, [weekConflicts]);

  const handleCopyZaloDigest = () => {
    const text = buildWeeklyZaloDigest(schedules, weekMondayIso, weekSundayIso);
    navigator.clipboard.writeText(text);
    setCopiedZalo(true);
    onNotify?.(
      "Đã sao chép Bản tin Lịch tuần KP3! Bạn có thể dán trực tiếp vào nhóm Zalo Chi bộ / Ban Điều hành.",
      "success"
    );
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const renderSourcePill = (sch: ScheduleEvent) => {
    if (sch.sourceLevel === "merged_ward") {
      return (
        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-[10.5px] font-bold inline-flex items-center gap-1">
          <Layers size={10} /> Đảng ủy + UBND
        </span>
      );
    }
    if (sch.sourceLevel === "party_ward" || sch.type === "Lịch Đảng ủy Phường") {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200 text-[10.5px] font-bold inline-flex items-center gap-1">
          <Landmark size={10} /> Đảng ủy Phường
        </span>
      );
    }
    if (sch.sourceLevel === "ubnd_ward" || sch.type === "Lịch UBND Phường") {
      return (
        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10.5px] font-bold inline-flex items-center gap-1">
          <Building2 size={10} /> UBND Phường
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10.5px] font-bold">
        Nội bộ KP3
      </span>
    );
  };

  const renderEventCard = (sch: ScheduleEvent) => {
    const isPostponed = sch.status === "Đã hoãn";
    const isRescheduled = Boolean(sch.rescheduleCount && sch.rescheduleCount > 0);
    const hasConflict = conflictScheduleIdSet.has(sch.id);

    return (
      <div
        key={sch.id}
        onClick={() => onSelectSchedule(sch)}
        className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
          isPostponed
            ? "bg-amber-50/50 border-amber-300 opacity-85"
            : hasConflict
            ? "bg-rose-50/40 border-rose-300 hover:border-rose-400"
            : "bg-white border-slate-200/90 hover:border-emerald-400 shadow-2xs"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px] inline-flex items-center gap-1">
              <Clock size={11} />
              {sch.time}
            </span>
            {renderSourcePill(sch)}
            {isPostponed && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 text-[10.5px] font-bold inline-flex items-center gap-1">
                <PauseCircle size={10} /> Đã hoãn
              </span>
            )}
            {isRescheduled && !isPostponed && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-[10.5px] font-bold inline-flex items-center gap-1">
                <RefreshCw size={10} /> Đã dời lịch
              </span>
            )}
            {hasConflict && (
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 text-[10.5px] font-bold inline-flex items-center gap-1">
                <AlertTriangle size={10} /> Trùng giờ
              </span>
            )}
          </div>
        </div>

        {(sch.originalDate || sch.originalTime) && (
          <div className="text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-2 py-1">
            Lịch gốc:{" "}
            <span className="line-through font-mono">
              {sch.originalTime || sch.time}{" "}
              {sch.originalDate ? `(${formatDmyShort(sch.originalDate)})` : ""}
            </span>
            {sch.lastRescheduleReason ? ` — ${sch.lastRescheduleReason}` : ""}
          </div>
        )}

        <h4
          className={`font-bold text-xs sm:text-[13px] leading-snug ${
            isPostponed ? "line-through text-slate-600" : "text-slate-900"
          }`}
        >
          {sch.title}
        </h4>

        <div className="space-y-1 text-[11.5px] text-slate-700">
          <div className="flex items-start gap-1.5">
            <MapPin size={12} className="text-slate-500 shrink-0 mt-0.5" />
            <span>{sch.location}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Users size={12} className="text-emerald-700 shrink-0 mt-0.5" />
            <span className="font-semibold text-slate-800">{sch.attendees}</span>
          </div>
        </div>

        {/* Cụm nút điều chỉnh nhanh ngay trên từng lịch */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5"
        >
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenReschedule(sch, "reschedule")}
              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
              title="Dời ngày, đổi giờ hoặc đổi hội trường"
            >
              <RefreshCw size={11} />
              <span>Dời lịch</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenReschedule(sch, "delegate")}
              className="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
              title="Ủy quyền / Cử cán bộ khác đi dự thay"
            >
              <UserCheck size={11} />
              <span>Cử đi thay</span>
            </button>
            <button
              type="button"
              disabled={sendingScheduleId === sch.id}
              onClick={() => handleDispatchZaloMeetingReminder(sch)}
              className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Nhắc lịch họp cho cán bộ tham dự qua Zalo OA Ban Điều hành Khu phố 3"
            >
              {sendingScheduleId === sch.id ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <BellRing size={11} />
              )}
              <span>Nhắc Zalo OA</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onEditSchedule(sch)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            title="Sửa đầy đủ thông tin lịch"
            aria-label={`Sửa lịch ${sch.title}`}
          >
            <Edit2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Thanh điều khiển Tuần & Lọc Cán bộ KP3 */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setWeekMondayIso(shiftIsoDateByDays(weekMondayIso, -7))}
              aria-label="Tuần trước"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-black text-slate-900 font-mono whitespace-nowrap">
              Tuần: {weekDays[0].dmy} – {weekDays[6].dmy}
            </span>
            <button
              type="button"
              onClick={() => setWeekMondayIso(shiftIsoDateByDays(weekMondayIso, 7))}
              aria-label="Tuần sau"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <input
            type="date"
            aria-label="Chọn ngày để xem tuần"
            value={weekMondayIso}
            onChange={(e) => {
              if (e.target.value) {
                setWeekMondayIso(getMondayOfIsoDate(e.target.value));
              }
            }}
            className="h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-white"
          />

          {/* Lọc nhanh theo Cán bộ KP3 */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "all", label: "Tất cả BĐH & Chi bộ" },
              {
                id: "secretary",
                label: `Bí thư (${keyLeaders.partySecretary.name.split(" ").slice(-2).join(" ")})`,
              },
              {
                id: "head_kp",
                label: `Trưởng KP (${keyLeaders.neighborhoodHead.name.split(" ").slice(-2).join(" ")})`,
              },
              { id: "front_mass", label: "Mặt trận & Đoàn thể" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOfficerFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                  officerFilter === f.id
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={sendingWeekZalo}
            onClick={() => handleDispatchZaloMeetingReminder()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            title="Tự động nhắc lịch họp tuần qua Zalo OA Ban Điều hành Khu phố 3 cho các cán bộ tham dự"
          >
            {sendingWeekZalo ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>Nhắc Lịch Cán bộ qua Zalo OA</span>
          </button>

          <button
            type="button"
            onClick={handleCopyZaloDigest}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copiedZalo ? (
              <Check size={14} className="text-emerald-700" />
            ) : (
              <Copy size={14} />
            )}
            <span>
              {copiedZalo ? "Đã chép bản tin Zalo!" : "Copy Lịch tuần"}
            </span>
          </button>
        </div>
      </div>

      {/* Cảnh báo xung đột giờ nếu có */}
      {weekConflicts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
          <div className="font-bold flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-rose-700 shrink-0" />
            <span>
              Phát hiện {weekConflicts.length} xung đột trùng giờ công tác của cán bộ Khu phố 3 trong tuần này!
            </span>
          </div>
          {weekConflicts.map((conf, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center justify-between gap-2 bg-white/90 p-2.5 rounded-xl border border-rose-200"
            >
              <div>
                <strong>{conf.overlappingOfficers.join(", ")}</strong> bị trùng khung giờ{" "}
                <span className="font-mono font-bold">{conf.overlapTimeWindow}</span> ngày{" "}
                <span className="font-mono font-bold">
                  {formatDmyShort(conf.date)}
                </span>{" "}
                giữa <em>"{conf.scheduleA.title}"</em> và <em>"{conf.scheduleB.title}"</em>.
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenReschedule(conf.scheduleB, "delegate")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold cursor-pointer"
                >
                  Cử người dự thay
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReschedule(conf.scheduleB, "reschedule")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold cursor-pointer"
                >
                  Dời lịch
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bảng Lịch Tuần Hành Chính (Thứ Hai -> Chủ Nhật | Sáng / Chiều & Tối) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="hidden xl:grid xl:grid-cols-12 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
          <div className="xl:col-span-2 p-3 border-r border-slate-800">
            Thứ / Ngày
          </div>
          <div className="xl:col-span-5 p-3 border-r border-slate-800">
            Buổi Sáng (07:00 – 11:30)
          </div>
          <div className="xl:col-span-5 p-3">
            Buổi Chiều &amp; Tối (13:30 – 21:00)
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {weekDays.map((wd) => {
            const dayItems = kp3WeekSchedules.filter((s) => s.date === wd.iso);
            const morningItems = dayItems.filter(
              (s) => (s.sessionPeriod || inferSessionPeriod(s.time)) === "Sáng"
            );
            const afternoonEveningItems = dayItems.filter(
              (s) => (s.sessionPeriod || inferSessionPeriod(s.time)) !== "Sáng"
            );
            const isToday = wd.iso === new Date().toISOString().slice(0, 10);

            return (
              <div
                key={wd.iso}
                className={`grid grid-cols-1 xl:grid-cols-12 ${
                  isToday ? "bg-emerald-50/30" : ""
                }`}
              >
                {/* Thanh tiêu đề ngang (dưới 1280px) / Cột Thứ-Ngày (từ 1280px) */}
                <div className="xl:col-span-2 p-3 bg-slate-50/80 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-wrap xl:flex-col items-center xl:items-start justify-between xl:justify-start gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                      {wd.dayName}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold whitespace-nowrap">
                        Hôm nay
                      </span>
                    )}
                    <span className="xl:hidden font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                      • {wd.dmy}
                    </span>
                  </div>
                  <span className="hidden xl:block font-mono text-xs text-slate-600 font-semibold">
                    {wd.dmy}
                  </span>
                  {dayItems.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full xl:mt-1 whitespace-nowrap">
                      {dayItems.length} lịch công tác
                    </span>
                  )}
                </div>

                {/* Khối 2 cột Sáng & Chiều */}
                <div className="xl:col-span-10 grid grid-cols-1 sm:grid-cols-2 min-w-0">
                  {/* Cột Buổi Sáng */}
                  <div className="p-3 sm:border-r border-slate-100 space-y-2.5 min-w-0">
                    <div className="xl:hidden text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                      Buổi Sáng (07:00 – 11:30)
                    </div>
                    {morningItems.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2">
                        Trực / Xử lý công việc thường xuyên tại Khu phố
                      </div>
                    ) : (
                      morningItems.map(renderEventCard)
                    )}
                  </div>

                  {/* Cột Buổi Chiều & Tối */}
                  <div className="p-3 border-t sm:border-t-0 border-slate-100 space-y-2.5 min-w-0">
                    <div className="xl:hidden text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                      Buổi Chiều &amp; Tối (13:30 – 21:00)
                    </div>
                    {afternoonEveningItems.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2">
                        Trực / Xử lý công việc thường xuyên tại Khu phố
                      </div>
                    ) : (
                      afternoonEveningItems.map(renderEventCard)
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ngăn thu gọn: Tra cứu lịch Lãnh đạo Đảng ủy - UBND Phường trong tuần */}
      {wardRefWeekSchedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowWardRefDrawer((v) => !v)}
            className="w-full p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
                <Landmark size={15} />
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Lịch làm việc Lãnh đạo Đảng ủy – UBND Phường trong tuần ({wardRefWeekSchedules.length})
              </h4>
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform ${
                showWardRefDrawer ? "rotate-180" : ""
              }`}
            />
          </button>

          {showWardRefDrawer && (
            <div className="p-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50/50 text-xs">
              {wardRefWeekSchedules.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => onSelectSchedule(ws)}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-blue-900">
                      {formatDmyShort(ws.date)} • {ws.time}
                    </span>
                    {renderSourcePill(ws)}
                  </div>
                  <div className="font-bold text-slate-900">{ws.title}</div>
                  <div className="text-[11px] text-slate-600">
                    Chủ trì: <strong>{ws.host}</strong> • Địa điểm: {ws.location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
