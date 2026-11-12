import React from "react";
import { Calendar, ChevronRight, Clock, Edit2, MapPin, Plus, Trash2 } from "lucide-react";
import { CommunityEvent } from "../../types";
import { EmptyState, SectionHeader } from "./LandingCommon";
import { btnGhost } from "./landingConstants";

export interface CitizenScheduleSectionProps {
  upcomingEvents: CommunityEvent[];
  setEventDetail: (event: CommunityEvent | null) => void;
  onNavigateToTab: (tab: any) => void;
  isAdmin?: boolean;
  onAddEvent?: () => void;
  onEditEvent?: (event: CommunityEvent) => void;
  onDeleteEvent?: (event: CommunityEvent) => void;
}

export default function CitizenScheduleSection({
  upcomingEvents,
  setEventDetail,
  onNavigateToTab,
  isAdmin = false,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: CitizenScheduleSectionProps) {
  return (
    <section id="schedule" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-24 outline-none">
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
                <article className="w-full h-full p-4 rounded-2xl border border-slate-200 hover:border-gov-blue transition-colors flex flex-col justify-between gap-3 bg-white">
                  <button
                    type="button"
                    onClick={() => setEventDetail(ev)}
                    className="w-full text-left cursor-pointer space-y-2"
                  >
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        ev.status === "Đang diễn ra"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-gov-navy"
                      }`}
                    >
                      {ev.status}
                    </span>
                    <h3 className="font-bold text-sm text-gov-text line-clamp-2">{ev.title}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock size={13} className="text-gov-blue" aria-hidden="true" /> {ev.dateTime}
                    </p>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin size={13} className="text-gov-danger" aria-hidden="true" />{" "}
                      <span className="truncate">{ev.location}</span>
                    </p>
                    <p className="text-xs text-slate-500">Phụ trách: {ev.organizer}</p>
                  </button>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
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
    </section>
  );
}
