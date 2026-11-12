import React from "react";
import { Bell, Clock, Edit2, Plus, Trash2 } from "lucide-react";
import { LocalNews } from "../../types";
import { EmptyState, SectionHeader } from "./LandingCommon";
import { btnGhost, Link, ROUTES } from "./landingConstants";

export interface CitizenNoticesSectionProps {
  displayNotices: LocalNews[];
  setNewsDetail: (news: LocalNews | null) => void;
  goTo?: (id: string) => void;
  isAdmin?: boolean;
  onAddNews?: () => void;
  onEditNews?: (news: LocalNews) => void;
  onDeleteNews?: (news: LocalNews) => void;
}

export default function CitizenNoticesSection({
  displayNotices,
  setNewsDetail,
  goTo,
  isAdmin = false,
  onAddNews,
  onEditNews,
  onDeleteNews,
}: CitizenNoticesSectionProps) {
  return (
    <section id="notices" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
        <SectionHeader
          icon={<Bell size={20} />}
          title="Thông báo Khu phố"
          action={
            isAdmin && onAddNews ? (
              <button
                type="button"
                onClick={onAddNews}
                className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <Plus size={15} aria-hidden="true" /> Đăng thông báo mới
              </button>
            ) : undefined
          }
        />
        {displayNotices.length === 0 ? (
          <EmptyState
            icon={<Bell size={22} />}
            title="Chưa có thông báo được công bố"
            description="Khi Ban Điều hành duyệt và công bố thông báo, nội dung sẽ hiển thị tại đây. Trong lúc chờ, bạn có thể xem các hoạt động cộng đồng."
            action={
              <Link to={ROUTES.SCHEDULE} className={btnGhost}>
                Xem lịch hoạt động
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...displayNotices]
              .sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned))
              .map(n => (
                <li key={n.id} className="min-w-0">
                  <article
                    className={`w-full min-w-0 overflow-hidden p-5 rounded-2xl border transition-colors flex flex-col justify-between gap-3 h-full ${
                      n.isPinned
                        ? "border-gov-danger/40 bg-red-50/40 hover:border-gov-danger"
                        : "border-slate-200 hover:border-gov-blue bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setNewsDetail(n)}
                      className="space-y-2 min-w-0 text-left cursor-pointer"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-xs ${
                            n.isPinned ? "bg-red-100 text-gov-danger font-bold" : "bg-blue-100 text-gov-navy"
                          }`}
                        >
                          {n.isPinned ? "Ưu tiên" : n.category}
                        </span>
                        <span className="text-slate-600 flex items-center gap-1 font-mono text-xs shrink-0">
                          <Clock size={12} aria-hidden="true" /> {n.date}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                        {n.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>
                    </button>
                    <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600">
                      <span className="truncate min-w-0 flex-1">
                        Nguồn: <strong className="text-slate-800">{n.author}</strong>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && onEditNews && (
                          <button
                            type="button"
                            onClick={() => onEditNews(n)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                            title="Sửa thông báo"
                            aria-label={`Sửa ${n.title}`}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {isAdmin && onDeleteNews && (
                          <button
                            type="button"
                            onClick={() => onDeleteNews(n)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                            title="Xóa thông báo"
                            aria-label={`Xóa ${n.title}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNewsDetail(n)}
                          className="text-gov-blue font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
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
