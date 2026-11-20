import React from "react";
import { NewsItem } from "../types";
import { X, Calendar, User } from "lucide-react";

interface NewsDetailModalProps {
  news: NewsItem | null;
  onClose: () => void;
}

function sanitizeArticleHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ news, onClose }) => {
  if (!news) return null;

  const dateValue = news.created_at || news.published_at;
  const isHtmlContent = /<[a-z][\s\S]*>/i.test(news.content || "");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded border border-red-200">
            {news.category || "Thông báo"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bài viết"
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="py-3 flex flex-col gap-2.5">
          <h1 className="text-sm font-bold text-slate-900 leading-snug">{news.title}</h1>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {dateValue ? new Date(dateValue).toLocaleDateString("vi-VN") : "Hôm nay"}
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {news.author_name || "Ban Điều Hành Khu Phố 3"}
            </span>
          </div>

          {news.image_url && (
            <img
              src={news.image_url}
              alt={news.title}
              className="w-full h-44 object-cover rounded-xl mt-1 border border-slate-100"
            />
          )}

          {isHtmlContent ? (
            <div
              className="article-html-body text-xs text-slate-700 leading-relaxed mt-1"
              dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(news.content) }}
            />
          ) : (
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-1">
              {news.content}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
