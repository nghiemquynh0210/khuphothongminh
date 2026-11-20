import React, { useState } from "react";
import { NewsItem } from "../types";
import { Search, Calendar, ChevronRight } from "lucide-react";

interface NewsTabProps {
  newsList: NewsItem[];
  onSelectNews: (news: NewsItem) => void;
}

export const NewsTab: React.FC<NewsTabProps> = ({ newsList, onSelectNews }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", "Thông báo", "An ninh trật tự", "Văn hóa & Đời sống", "PCCC", "Chính sách"];

  const filtered = newsList.filter((n) => {
    const matchSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.summary && n.summary.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = selectedCategory === "all" || n.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="flex flex-col gap-3 p-4 pb-20">
      {/* Search Header */}
      <div>
        <h1 className="text-base font-bold text-slate-800">Bản Tin & Thông Báo Khu Phố 3</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Cập nhật chỉ đạo, kế hoạch công tác và hoạt động cộng đồng
        </p>

        <div className="relative mt-2.5">
          <input
            type="text"
            placeholder="Tìm kiếm bài viết, thông báo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs py-2"
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-all ${
              selectedCategory === c
                ? "bg-red-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {c === "all" ? "Tất cả" : c}
          </button>
        ))}
      </div>

      {/* News List */}
      <div className="flex flex-col gap-2.5 mt-1">
        {filtered.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            Không tìm thấy bài viết hoặc thông báo phù hợp.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectNews(item)}
              className="bg-white hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200">
                  {item.category || "Thông báo"}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {item.created_at || item.published_at
                    ? new Date(item.created_at || item.published_at!).toLocaleDateString("vi-VN")
                    : "Hôm nay"}
                </span>
              </div>

              <h2 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                {item.title}
              </h2>

              <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                {item.summary || item.content.slice(0, 120) + "..."}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-0.5 text-[11px]">
                <span className="text-slate-400 font-medium">Ban Biên Tập Khu Phố 3</span>
                <span className="text-red-600 font-bold flex items-center hover:underline">
                  <span>Chi tiết</span>
                  <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
