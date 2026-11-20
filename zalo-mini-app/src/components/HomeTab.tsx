import React from "react";
import { NewsItem } from "../types";
import {
  Bell,
  AlertTriangle,
  Search,
  FileText,
  PhoneCall,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

interface HomeTabProps {
  newsList: NewsItem[];
  onSelectNews: (news: NewsItem) => void;
  onNavigateTab: (tab: "home" | "news" | "report" | "lookup" | "forms" | "staff") => void;
  staffName?: string;
}

export const HomeTab: React.FC<HomeTabProps> = ({ newsList, onSelectNews, onNavigateTab, staffName }) => {
  const pinnedNews = newsList.filter((n) => n.is_pinned).slice(0, 3);
  const displayNews = pinnedNews.length > 0 ? pinnedNews : newsList.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Top Header Card */}
      <div className="bg-red-600 text-white p-4 rounded-b-2xl shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="https://photo-logo-mapps.zadn.vn/a8447242d2073b596216.jpg"
              alt="Logo KP3"
              className="w-11 h-11 rounded-full border-2 border-white/80 object-cover shadow shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-red-200 font-semibold truncate">
                UBND Phường An Phú
              </div>
              <h1 className="text-base font-bold leading-tight truncate">Khu Phố 3 • An Phú</h1>
              <div className="text-[11px] text-red-100 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0"></span>
                <span className="truncate">Cổng Cư Dân Số Zalo</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("staff")}
            className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all"
          >
            <ShieldCheck size={13} className={staffName ? "text-emerald-300" : "text-white"} />
            <span>{staffName ? "Điều hành" : "Cán bộ"}</span>
          </button>
        </div>

        {/* Quick Search trigger */}
        <div
          onClick={() => onNavigateTab("lookup")}
          className="mt-4 bg-white/10 hover:bg-white/20 transition-all rounded-xl p-2.5 flex items-center justify-between text-xs cursor-pointer border border-white/20"
        >
          <div className="flex items-center gap-2 text-white/90">
            <Search size={16} />
            <span>Tra cứu hồ sơ cư trú bằng số CCCD...</span>
          </div>
          <span className="bg-white text-red-700 px-2 py-0.5 rounded-full font-semibold text-[11px]">
            Tra cứu
          </span>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Quick Action Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Dịch vụ công & Tiện ích trực tuyến
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              onClick={() => onNavigateTab("report")}
              className="bg-red-50 hover:bg-red-100 p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border border-red-100"
            >
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Báo 1022</span>
            </button>

            <button
              onClick={() => onNavigateTab("lookup")}
              className="bg-blue-50 hover:bg-blue-100 p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border border-blue-100"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Search size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Tra Cư Trú</span>
            </button>

            <button
              onClick={() => onNavigateTab("forms")}
              className="bg-amber-50 hover:bg-amber-100 p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border border-amber-100"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <FileText size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Biểu Mẫu</span>
            </button>

            <button
              onClick={() => onNavigateTab("news")}
              className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border border-slate-200"
            >
              <div className="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-sm">
                <Bell size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Thông Báo</span>
            </button>
          </div>
        </div>

        {/* Official Zalo OA Follow Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-3.5 text-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg shadow">
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="text-[11px] text-blue-200 font-medium">Kênh Zalo OA Chính Thức</div>
              <div className="text-sm font-bold leading-tight">Ban Điều Hành Khu Phố 3</div>
              <div className="text-[11px] text-blue-100">347+ cư dân đang theo dõi</div>
            </div>
          </div>
          <a
            href="https://zalo.me/bdhkhupho3"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <span>Quan tâm</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Featured Notices */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Thông báo mới từ Ban Điều Hành
            </h2>
            <button
              onClick={() => onNavigateTab("news")}
              className="text-xs text-red-600 font-semibold flex items-center hover:underline"
            >
              <span>Xem tất cả</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {displayNews.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                Đang tải thông báo từ hệ thống CSDL Khu phố 3...
              </div>
            ) : (
              displayNews.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectNews(item)}
                  className="bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-red-50 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-200">
                        {item.category || "Thông báo"}
                      </span>
                      {item.is_pinned && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          📌 Ghim
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                      {item.summary || item.content.slice(0, 80) + "..."}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 mt-2 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hotline & Leadership Directory */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-2.5">
            <ShieldCheck size={16} className="text-red-600" />
            <span>Thường trực Khu phố & Đường dây nóng</span>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">Đồng chí Nghiêm Xuân Quỳnh</div>
                <div className="text-[11px] text-slate-500">Bí thư Chi bộ KP3 (Người đứng đầu)</div>
              </div>
              <a
                href="tel:0825681868"
                className="bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] hover:bg-red-700"
              >
                <PhoneCall size={12} />
                <span>Gọi</span>
              </a>
            </div>

            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">Đồng chí Phạm Ngọc Hà</div>
                <div className="text-[11px] text-slate-500">Phó Bí thư Chi bộ KP3</div>
              </div>
              <a
                href="tel:0908579479"
                className="bg-slate-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] hover:bg-slate-800"
              >
                <PhoneCall size={12} />
                <span>Gọi</span>
              </a>
            </div>

            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">Đồng chí Nguyễn Trung Huy</div>
                <div className="text-[11px] text-slate-500">Trưởng Ban điều hành Khu phố 3</div>
              </div>
              <a
                href="tel:0909123888"
                className="bg-slate-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] hover:bg-slate-800"
              >
                <PhoneCall size={12} />
                <span>Gọi</span>
              </a>
            </div>

            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">Đại úy Trần Quốc Hải</div>
                <div className="text-[11px] text-slate-500">Cảnh sát khu vực phụ trách KP3</div>
              </div>
              <a
                href="tel:0902888888"
                className="bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] hover:bg-blue-700"
              >
                <PhoneCall size={12} />
                <span>Gọi</span>
              </a>
            </div>
          </div>
        </div>

        {/* Administrative footer info */}
        <div className="text-center text-[11px] text-slate-400 py-3">
          <div>Trụ sở: 01 Đường D2, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh</div>
          <div className="mt-0.5">Remix Cổng Cư Dân Số Khu Phố 3 • An Phú</div>
        </div>
      </div>
    </div>
  );
};
