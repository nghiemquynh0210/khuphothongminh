import React from "react";
import { ChevronRight, Clock, Compass, Edit2, Plus, Trash2, Users } from "lucide-react";
import { LocalNews } from "../../types";
import { EmptyState, SectionHeader } from "./LandingCommon";
import { btnGhost } from "./landingConstants";

export interface CitizenNewsSectionProps {
  displayNews: LocalNews[];
  setNewsDetail: (news: LocalNews | null) => void;
  onNavigateToTab: (tab: any) => void;
  isAdmin?: boolean;
  onAddNews?: () => void;
  onEditNews?: (news: LocalNews) => void;
  onDeleteNews?: (news: LocalNews) => void;
}

export default function CitizenNewsSection({
  displayNews,
  setNewsDetail,
  onNavigateToTab,
  isAdmin = false,
  onAddNews,
  onEditNews,
  onDeleteNews,
}: CitizenNewsSectionProps) {
  return (
    <section id="news" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
        <SectionHeader
          icon={<Compass size={20} />}
          title="Tin tức & Đời sống Khu phố"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && onAddNews && (
                <button
                  type="button"
                  onClick={onAddNews}
                  className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  <Plus size={15} aria-hidden="true" /> Đăng bài mới
                </button>
              )}
              <button onClick={() => onNavigateToTab("cultural")} className={btnGhost}>
                Kênh sự kiện <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          }
        />
        {displayNews.length === 0 ? (
          <EmptyState
            icon={<Compass size={22} />}
            title="Chưa có tin hoạt động"
            description="Tin tức sẽ được cập nhật khi Ban Điều hành ghi nhận hoạt động đã diễn ra."
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayNews.map(item => (
              <li key={item.id} className="min-w-0">
                <article className="w-full min-w-0 h-full rounded-2xl border border-slate-200 overflow-hidden hover:border-gov-blue transition-colors flex flex-col justify-between bg-white">
                  <button
                    type="button"
                    onClick={() => setNewsDetail(item)}
                    className="min-w-0 text-left cursor-pointer flex-1 flex flex-col"
                  >
                    <div
                      className="h-28 bg-gov-navy border-b border-blue-950 flex items-center justify-center text-white/85 relative overflow-hidden"
                      aria-hidden="true"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Users size={36} />
                      )}
                      {item.isPinned && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-950 font-bold text-xs border border-amber-400">
                          Ghim
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-gov-navy bg-slate-100 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock size={12} aria-hidden="true" /> {item.date}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-gov-text line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </button>
                  <div className="p-4 pt-3 text-xs text-slate-600 flex items-center justify-between gap-2 border-t border-slate-100">
                    <span className="truncate min-w-0 flex-1">Tác giả: {item.author}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && onEditNews && (
                        <button
                          type="button"
                          onClick={() => onEditNews(item)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          title="Sửa bài viết"
                          aria-label={`Sửa ${item.title}`}
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && onDeleteNews && (
                        <button
                          type="button"
                          onClick={() => onDeleteNews(item)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                          title="Xóa bài viết"
                          aria-label={`Xóa ${item.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNewsDetail(item)}
                        className="text-gov-blue font-bold hover:underline cursor-pointer"
                      >
                        Đọc tiếp →
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
