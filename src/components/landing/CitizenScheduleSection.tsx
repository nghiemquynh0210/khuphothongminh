import React, { useState } from "react";
import {
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { CommunityEvent, ScheduleEvent } from "../../types";
import { EmptyState, SectionHeader } from "./LandingCommon";
import { btnGhost } from "./landingConstants";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { DetailGrid, DetailRow } from "../common/DetailRow";

export interface CitizenScheduleSectionProps {
  upcomingEvents: CommunityEvent[];
  publicSchedules?: ScheduleEvent[];
  setEventDetail: (event: CommunityEvent | null) => void;
  onNavigateToTab: (tab: any) => void;
  isAdmin?: boolean;
  onAddEvent?: () => void;
  onEditEvent?: (event: CommunityEvent) => void;
  onDeleteEvent?: (event: CommunityEvent) => void;
}

function formatScheduleDateVN(raw?: string): string {
  if (!raw) return "Đang cập nhật";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    const [y, m, d] = raw.trim().split("-");
    return `${d}/${m}/${y}`;
  }
  return raw;
}

export default function CitizenScheduleSection({
  upcomingEvents,
  publicSchedules = [],
  setEventDetail,
  onNavigateToTab,
  isAdmin = false,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: CitizenScheduleSectionProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEvent | null>(null);
  const visiblePublicSchedules = publicSchedules.filter(
    (s) => s.isPublicCitizenVisible === true
  );

  return (
    <section id="schedule" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-24 outline-none space-y-6">
      {/* 1. Lịch Tiếp dân & Công tác Công khai của Ban Điều hành KP3 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
        <SectionHeader
          icon={<Briefcase size={20} />}
          title="Lịch Tiếp dân & Công tác Công khai Ban Điều hành KP3"
          action={
            isAdmin ? (
              <button
                type="button"
                onClick={() => onNavigateToTab("tasks")}
                className={btnGhost}
              >
                Quản lý Lịch công tác <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : undefined
          }
        />

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong className="font-bold">Lịch tiếp công dân định kỳ:</strong> Sáng Thứ Bảy hằng tuần (08:00 – 11:00) &amp; Giờ hành chính Thứ Hai – Thứ Sáu tại Nhà Văn hóa Khu phố 3.
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0 self-start sm:self-auto">
            Công khai minh bạch
          </span>
        </div>

        {visiblePublicSchedules.length > 0 && (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visiblePublicSchedules.map((sch) => (
              <li key={sch.id}>
                <article
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSchedule(sch)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSchedule(sch);
                    }
                  }}
                  className="w-full h-full p-4 rounded-2xl border border-emerald-200/90 hover:border-emerald-600 hover:shadow-sm transition-all flex flex-col justify-between gap-3 bg-white cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        {sch.type || "Lịch công tác"}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {sch.status || "Sắp diễn ra"}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-800 line-clamp-2 transition-colors">
                      {sch.title}
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>
                        {formatScheduleDateVN(sch.date)} • {sch.time}
                        {sch.sessionPeriod ? ` (${sch.sessionPeriod})` : ""}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin size={13} className="text-rose-600 shrink-0" aria-hidden="true" />
                      <span className="truncate">{sch.location || "Nhà Văn hóa Khu phố 3"}</span>
                    </p>
                    {sch.host && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Users size={13} className="text-gov-blue shrink-0" aria-hidden="true" />
                        <span className="truncate">Chủ trì: {sch.host}</span>
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 truncate">
                      {sch.attendees || "Mời cư dân quan tâm theo dõi"}
                    </span>
                    <span className="text-emerald-700 font-bold group-hover:underline shrink-0 ml-2">
                      Xem lịch →
                    </span>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. Sự kiện & Hoạt động Cộng đồng */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
        <SectionHeader
          icon={<Calendar size={20} />}
          title="Lịch hoạt động & Sự kiện Cộng đồng"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && onAddEvent && (
                <button
                  type="button"
                  onClick={onAddEvent}
                  className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  <Plus size={15} aria-hidden="true" /> Tạo sự kiện
                </button>
              )}
              <button type="button" onClick={() => onNavigateToTab("cultural")} className={btnGhost}>
                Xem đầy đủ <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          }
        />
        {upcomingEvents.length === 0 ? (
          <EmptyState
            icon={<Calendar size={22} />}
            title="Chưa có lịch hoạt động sắp tới"
            description="Lịch sẽ hiển thị khi Ban Điều hành cập nhật sự kiện mới."
          />
        ) : (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map(ev => (
              <li key={ev.id}>
                <article
                  role="button"
                  tabIndex={0}
                  aria-label={`Xem chi tiết sự kiện ${ev.title}`}
                  onClick={() => setEventDetail(ev)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEventDetail(ev);
                    }
                  }}
                  className="w-full h-full p-4 rounded-2xl border border-slate-200 hover:border-gov-blue hover:shadow-sm transition-all flex flex-col justify-between gap-3 bg-white cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-blue"
                >
                  <div className="w-full text-left space-y-2">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        ev.status === "Đang diễn ra"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-gov-navy"
                      }`}
                    >
                      {ev.status}
                    </span>
                    <h3 className="font-bold text-sm text-gov-text group-hover:text-gov-blue line-clamp-2 transition-colors">{ev.title}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock size={13} className="text-gov-blue" aria-hidden="true" /> {ev.dateTime}
                    </p>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin size={13} className="text-gov-danger" aria-hidden="true" />{" "}
                      <span className="truncate">{ev.location}</span>
                    </p>
                    <p className="text-xs text-slate-500">Phụ trách: {ev.organizer}</p>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-600 font-medium">
                      Dự kiến {ev.expectedAttendees} người
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isAdmin && onEditEvent && (
                        <button
                          type="button"
                          onClick={() => onEditEvent(ev)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          title="Sửa sự kiện"
                          aria-label={`Sửa ${ev.title}`}
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(ev)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                          title="Xóa sự kiện"
                          aria-label={`Xóa ${ev.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEventDetail(ev)}
                        className="text-gov-blue font-bold hover:underline cursor-pointer"
                      >
                        Chi tiết →
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedSchedule)}
        onClose={() => setSelectedSchedule(null)}
        title={selectedSchedule?.title || ""}
        description={
          selectedSchedule
            ? `${selectedSchedule.type || "Lịch công tác"} • Ban Điều hành Khu phố 3`
            : undefined
        }
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
            Đóng
          </Button>
        }
      >
        {selectedSchedule && (
          <div className="space-y-4">
            <DetailGrid>
              <DetailRow
                label="Ngày thực hiện"
                value={formatScheduleDateVN(selectedSchedule.date)}
                isMono
              />
              <DetailRow
                label="Khung giờ"
                value={`${selectedSchedule.time}${
                  selectedSchedule.sessionPeriod ? ` (${selectedSchedule.sessionPeriod})` : ""
                }`}
                isMono
              />
              <DetailRow
                label="Địa điểm"
                value={selectedSchedule.location || "Nhà Văn hóa Khu phố 3"}
              />
              <DetailRow
                label="Chủ trì"
                value={selectedSchedule.host || "Ban Điều hành Khu phố 3"}
              />
              {selectedSchedule.attendees && (
                <DetailRow
                  label="Thành phần"
                  value={selectedSchedule.attendees}
                  colSpan={2}
                />
              )}
            </DetailGrid>
            {(selectedSchedule.content || selectedSchedule.description || selectedSchedule.notes) && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {selectedSchedule.content || selectedSchedule.description || selectedSchedule.notes}
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
