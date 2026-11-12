import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BellRing,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  FileText,
  Flame,
  Images,
  LayoutGrid,
  Link2,
  List,
  Newspaper,
  Pin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { LocalNews } from "../../types";
import Pagination from "../Pagination";
import {
  getCategoryTheme,
  getNewsImage,
  getNewsReadTime,
  getNewsSummary,
  getNewsViews,
} from "./newsHelpers";

export interface NewsNewspaperFeedProps {
  newsList: LocalNews[];
  onSelectNews: (news: LocalNews) => void;
  onCreateNews?: () => void;
  onEditNews?: (news: LocalNews) => void;
  onDeleteNews?: (news: LocalNews) => void;
  showMasthead?: boolean;
  title?: string;
  subtitle?: string;
  bannerNotice?: string;
  itemsPerPage?: number;
}

export const NewsNewspaperFeed: React.FC<NewsNewspaperFeedProps> = ({
  newsList,
  onSelectNews,
  onCreateNews,
  onEditNews,
  onDeleteNews,
  showMasthead = true,
  title = "Bản tin & Báo điện tử Khu phố 3",
  subtitle = "Thông báo chính thức, hướng dẫn thủ tục và tin tức cộng đồng Phường An Phú",
  bannerNotice,
  itemsPerPage = 6,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [newsSearch, setNewsSearch] = useState("");
  const [newsFilter, setNewsFilter] = useState<string>("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);

  const canManage = Boolean(onEditNews || onDeleteNews || onCreateNews);

  const urgentNews = useMemo(() => {
    return (
      newsList.find((n) => n.category === "Thông báo khẩn" && n.isPinned) ||
      newsList.find((n) => n.category === "Thông báo khẩn") ||
      newsList.find((n) => n.isPinned)
    );
  }, [newsList]);

  const sortedNews = useMemo(() => {
    return [...newsList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.id.localeCompare(a.id);
    });
  }, [newsList]);

  const heroNews = sortedNews[0];
  const subFeaturedNews = sortedNews.slice(1, 3);

  const filteredNews = useMemo(() => {
    return sortedNews.filter((n) => {
      const q = newsSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        (n.summary && n.summary.toLowerCase().includes(q));
      const matchCat = newsFilter === "Tất cả" || n.category === newsFilter;
      return matchSearch && matchCat;
    });
  }, [sortedNews, newsSearch, newsFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedNews = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return filteredNews.slice(start, start + itemsPerPage);
  }, [filteredNews, activePage, itemsPerPage]);

  const handleSearchChange = (val: string) => {
    setNewsSearch(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (val: string) => {
    setNewsFilter(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {showMasthead && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Newspaper size={13} /> Cổng Tin Tức KP3
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Cập nhật liên tục 24/7
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{subtitle}</p>
          </div>
          {onCreateNews && (
            <button
              type="button"
              onClick={onCreateNews}
              className="min-h-10 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-center"
            >
              <Plus size={16} /> Đăng bản tin mới
            </button>
          )}
        </div>
      )}

      {bannerNotice && bannerNotice.trim() !== "" && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:px-5 flex items-start gap-3 text-xs sm:text-sm text-amber-950"
        >
          <BellRing size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{bannerNotice}</p>
        </div>
      )}

      {/* Urgent Alert Strip */}
      {urgentNews && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-3 w-full sm:flex-1 min-w-0">
            <span className="p-2 bg-rose-700 text-white rounded-xl shrink-0">
              <BellRing size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-700 text-white">
                  TIN KHẨN
                </span>
                <span className="text-xs font-mono text-rose-700 font-semibold">
                  {urgentNews.date}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-rose-950 truncate mt-0.5">
                {urgentNews.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectNews(urgentNews)}
            className="shrink-0 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            Xem chỉ đạo ngay <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* KHỐI TIÊU ĐIỂM BÁO CHÍ (SPOTLIGHT) */}
      {newsFilter === "Tất cả" && newsSearch === "" && heroNews && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-amber-600" /> Tiêu Điểm Truyền Thông Khu Phố
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Cập nhật liên tục 24/7
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Hero Spotlight Card */}
            <div
              onClick={() => onSelectNews(heroNews)}
              className="lg:col-span-7 group bg-white rounded-2xl overflow-hidden border border-slate-200 cursor-pointer flex flex-col justify-between transition-colors hover:border-emerald-300"
            >
              <div className="relative h-56 sm:h-64 w-full bg-slate-100 overflow-hidden shrink-0">
                <img
                  src={getNewsImage(heroNews)}
                  alt={heroNews.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-700 text-white flex items-center gap-1.5">
                      <Flame size={12} /> TIÊU ĐIỂM
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-slate-800 border border-slate-200">
                      {heroNews.category}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 font-mono">
                    {heroNews.date}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col justify-between bg-white">
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {heroNews.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed">
                    {getNewsSummary(heroNews)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <User size={13} className="text-emerald-700" /> {heroNews.author}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                      <Clock size={12} className="text-emerald-700" /> {getNewsReadTime(heroNews)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-600">
                      <Eye size={12} className="text-emerald-700" /> {getNewsViews(heroNews)} đọc
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover:underline">
                    Đọc toàn văn <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-featured (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {subFeaturedNews.map((subNews) => {
                const theme = getCategoryTheme(subNews.category);
                return (
                  <div
                    key={subNews.id}
                    onClick={() => onSelectNews(subNews)}
                    className="group flex-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex gap-4">
                      <div className="w-28 sm:w-32 h-24 sm:h-26 rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                        <img
                          src={getNewsImage(subNews)}
                          alt={subNews.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-xs font-mono bg-black/60 text-white backdrop-blur-xs">
                          {getNewsReadTime(subNews)}
                        </span>
                      </div>

                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${theme.pill}`}
                          >
                            {subNews.category}
                          </span>
                          <span className="text-xs text-slate-600 font-mono">
                            {subNews.date}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                          {subNews.title}
                        </h4>
                        <p className="text-slate-500 text-xs line-clamp-1 leading-relaxed">
                          {getNewsSummary(subNews)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="truncate max-w-[180px] font-medium text-slate-600">
                        {subNews.author}
                      </span>
                      <span className="text-emerald-700 font-bold group-hover:underline flex items-center gap-0.5">
                        Chi tiết <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* THANH TÌM KIẾM, BỘ LỌC CHUYÊN MỤC & CHẾ ĐỘ XEM */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
              size={16}
            />
            <input
              type="text"
              placeholder="Tìm kiếm bản tin, thông báo hành chính, lịch tiêm ngừa, PCCC..."
              value={newsSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Tìm kiếm bản tin"
              className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 hover:bg-white transition-colors"
            />
            {newsSearch && (
              <button
                type="button"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Chế độ Lưới Ảnh Lớn"
              className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-emerald-800 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={15} /> <span className="hidden sm:inline">Lưới ảnh</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Chế độ Danh Sách Báo"
              className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-emerald-800 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <List size={15} /> <span className="hidden sm:inline">Dòng báo</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <span className="text-xs font-bold text-slate-600 inline-flex items-center gap-1">
            <Tag size={12} /> Chuyên mục:
          </span>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
            {[
              { name: "Tất cả", icon: Newspaper, count: newsList.length },
              {
                name: "Thông báo khẩn",
                icon: AlertTriangle,
                count: newsList.filter((n) => n.category === "Thông báo khẩn").length,
              },
              {
                name: "Hành chính",
                icon: BookOpen,
                count: newsList.filter((n) => n.category === "Hành chính").length,
              },
              {
                name: "Y tế & Đời sống",
                icon: Sparkles,
                count: newsList.filter((n) => n.category === "Y tế & Đời sống").length,
              },
              {
                name: "An sinh xã hội",
                icon: Award,
                count: newsList.filter((n) => n.category === "An sinh xã hội").length,
              },
              {
                name: "Phong trào",
                icon: Users,
                count: newsList.filter((n) => n.category === "Phong trào").length,
              },
            ].map((cat) => {
              const isSelected = newsFilter === cat.name;
              const IconComponent = cat.icon;
              return (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => handleFilterChange(cat.name)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between sm:justify-start gap-1.5 ${
                    isSelected
                      ? "bg-emerald-700 text-white font-bold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <IconComponent size={12} />
                    <span>{cat.name}</span>
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected
                        ? "bg-emerald-950/60 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DANH SÁCH BẢN TIN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
            {newsFilter === "Tất cả"
              ? "Tất Cả Bản Tin Cập Nhật"
              : `Chuyên mục: ${newsFilter}`}{" "}
            ({filteredNews.length})
          </span>
          <span className="text-xs text-slate-600">
            Trang {activePage} / {totalPages}
          </span>
        </div>

        {filteredNews.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-600 border border-slate-200 rounded-3xl shadow-xs space-y-3">
            <Newspaper size={40} className="mx-auto text-slate-300" />
            <p className="font-semibold text-sm text-slate-600">
              Không tìm thấy bản tin nào phù hợp
            </p>
            <p className="text-xs text-slate-600">
              Vui lòng thử tìm kiếm bằng từ khóa khác hoặc chuyển sang chuyên mục "Tất cả".
            </p>
            <button
              type="button"
              onClick={() => {
                setNewsSearch("");
                setNewsFilter("Tất cả");
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedNews.map((news) => {
              const theme = getCategoryTheme(news.category);
              const imageUrl = getNewsImage(news);
              const galleryCount = news.imageGallery?.length || 0;
              const linksCount = news.links?.length || 0;

              return (
                <div
                  key={news.id}
                  onClick={() => onSelectNews(news)}
                  className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-teal-300 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  <div>
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                      <img
                        src={imageUrl}
                        alt={news.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${theme.pill} bg-white/90`}
                        >
                          {news.category}
                        </span>
                        {news.isPinned && (
                          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1">
                            <Pin size={10} /> Ghim
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                        {galleryCount > 0 && (
                          <span className="text-xs font-mono bg-black/65 backdrop-blur-xs text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Images size={10} /> +{galleryCount}
                          </span>
                        )}
                        <span className="text-xs font-mono bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock size={10} /> {getNewsReadTime(news)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} className="text-slate-600" /> {news.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} className="text-slate-600" /> {getNewsViews(news)}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {news.title}
                      </h3>

                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                        {getNewsSummary(news)}
                      </p>

                      {(news.attachedFile || linksCount > 0) && (
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          {news.attachedFile && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 inline-flex items-center gap-1 max-w-full">
                              <FileText size={12} className="text-rose-500 shrink-0" />
                              <span className="truncate">{news.attachedFile.name}</span>
                            </span>
                          )}
                          {linksCount > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 inline-flex items-center gap-1">
                              <Link2 size={12} className="shrink-0" />
                              <span>{linksCount} liên kết</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2 truncate max-w-[180px]">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {news.author.charAt(0)}
                      </div>
                      <span className="truncate text-xs font-medium text-slate-700">
                        {news.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManage && onEditNews && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditNews(news);
                          }}
                          title="Sửa bản tin"
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                      {canManage && onDeleteNews && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNews(news);
                          }}
                          title="Xóa bản tin"
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <span className="text-emerald-700 font-bold text-xs flex items-center gap-0.5 ml-1">
                        Đọc tiếp <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedNews.map((news) => {
              const theme = getCategoryTheme(news.category);
              const imageUrl = getNewsImage(news);
              const galleryCount = news.imageGallery?.length || 0;
              const linksCount = news.links?.length || 0;

              return (
                <div
                  key={news.id}
                  onClick={() => onSelectNews(news)}
                  className="group bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                >
                  <div className="w-full sm:w-52 h-36 sm:h-32 rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                    <img
                      src={imageUrl}
                      alt={news.title}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded-full border shadow-xs bg-white/95 ${theme.pill}`}
                    >
                      {news.category}
                    </span>
                    <span className="absolute bottom-2 right-2 text-xs font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {getNewsReadTime(news)}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono">
                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                        <CalendarDays size={13} /> {news.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye size={13} /> {getNewsViews(news)} lượt đọc
                      </span>
                      {news.isPinned && (
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                          <Pin size={11} /> Đã ghim
                        </span>
                      )}
                      {galleryCount > 0 && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Images size={11} /> {galleryCount} ảnh
                        </span>
                      )}
                      {linksCount > 0 && (
                        <span className="text-blue-700 font-bold flex items-center gap-1">
                          <Link2 size={11} /> {linksCount} link
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 group-hover:text-emerald-700 transition-colors leading-snug">
                      {news.title}
                    </h3>

                    <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {getNewsSummary(news)}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <User size={12} className="text-emerald-600" /> {news.author}
                      </span>
                      {news.attachedFile && (
                        <span className="text-xs font-mono text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
                          <FileText size={11} /> {news.attachedFile.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center justify-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {canManage && onEditNews && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditNews(news);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={12} /> Sửa
                      </button>
                    )}
                    {canManage && onDeleteNews && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNews(news);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    )}
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                      Đọc tin <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={activePage}
          totalItems={filteredNews.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
