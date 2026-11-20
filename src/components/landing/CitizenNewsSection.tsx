import React, { useMemo, useState } from "react";
import {
  BellRing,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  FileText,
  Flame,
  Link2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Pin,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { CommunityEvent, LocalNews } from "../../types";
import { ROUTES, Link, navigate, useCurrentPath } from "./landingConstants";
import NewsDetailPage from "../../page/NewsDetailPage";
import Pagination from "../Pagination";
import {
  getCategoryTheme,
  getNewsImage,
  getNewsReadTime,
  getNewsSummary,
  getNewsViews,
  normalizeNewsAuthor,
} from "../news/newsHelpers";
import { Button } from "../ui/Button";
import ZaloArticleSyncModal from "../news/ZaloArticleSyncModal";

export interface CitizenNewsSectionProps {
  displayNews: LocalNews[];
  upcomingEvents?: CommunityEvent[];
  initialCategory?: string;
  setNewsDetail?: (news: LocalNews | null) => void;
  onSelectEvent?: (ev: CommunityEvent) => void;
  onNavigateToTab: (tab: string) => void;
  isAdmin?: boolean;
  onAddNews?: () => void;
  onEditNews?: (news: LocalNews) => void;
  onDeleteNews?: (news: LocalNews) => void;
  onRefreshNews?: () => void;
}

const EDITORIAL_CATEGORIES = [
  "Tất cả",
  "Thông báo khẩn",
  "Hành chính",
  "Y tế & Đời sống",
  "An sinh xã hội",
  "Phong trào",
] as const;

export default function CitizenNewsSection({
  displayNews,
  upcomingEvents = [],
  initialCategory = "Tất cả",
  onSelectEvent,
  onNavigateToTab,
  isAdmin = false,
  onAddNews,
  onEditNews,
  onDeleteNews,
  onRefreshNews,
}: CitizenNewsSectionProps) {
  const currentPath = useCurrentPath();
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [showZaloSyncModal, setShowZaloSyncModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [prevInitialCategory, setPrevInitialCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  if (initialCategory !== prevInitialCategory) {
    setPrevInitialCategory(initialCategory);
    setSelectedCategory(initialCategory);
    setCurrentPage(1);
  }

  const activeCategory = selectedCategory ?? initialCategory;
  const setActiveCategory = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const urlNewsId = useMemo(() => {
    if (currentPath.startsWith("/news/detail/")) {
      return decodeURIComponent(currentPath.replace(/^\/news\/detail\//, ""));
    }
    if (currentPath.startsWith("/dashboard/cultural/news/detail/")) {
      return decodeURIComponent(
        currentPath.replace(/^\/dashboard\/cultural\/news\/detail\//, "")
      );
    }
    return null;
  }, [currentPath]);

  const activeNewsId = selectedNewsId || urlNewsId;

  const handleSelectNews = (news: LocalNews) => {
    setSelectedNewsId(news.id);
    navigate(`/news/detail/${encodeURIComponent(news.id)}`);
  };

  const handleBackToList = () => {
    setSelectedNewsId(null);
    navigate(ROUTES.NEWS);
  };

  const sortedAll = useMemo(() => {
    return [...displayNews].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.id.localeCompare(a.id);
    });
  }, [displayNews]);

  const pinnedAndOfficialNotices = useMemo(() => {
    const list = sortedAll.filter(
      (n) => n.isPinned || n.category === "Thông báo khẩn" || n.category === "Hành chính"
    );
    return (list.length > 0 ? list : sortedAll).slice(0, 5);
  }, [sortedAll]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedAll.filter((n) => {
      const matchCat =
        activeCategory === "Tất cả"
          ? true
          : activeCategory === "Thông báo & Hành chính"
          ? n.category === "Thông báo khẩn" || n.category === "Hành chính" || Boolean(n.isPinned)
          : n.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        n.author.toLowerCase().includes(q)
      );
    });
  }, [sortedAll, activeCategory, searchQuery]);

  const showLeadHero =
    activeCategory === "Tất cả" &&
    searchQuery.trim() === "" &&
    currentPage === 1 &&
    filteredArticles.length > 0;

  const leadStory = showLeadHero ? filteredArticles[0] : null;
  const streamSource = showLeadHero ? filteredArticles.slice(1) : filteredArticles;

  const totalPages = Math.max(1, Math.ceil(streamSource.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStream = streamSource.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const todayFormatted = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Điều hướng trang chi tiết bài báo chính luận
  if (activeNewsId) {
    return (
      <section
        id="news-detail-view"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 scroll-mt-24 outline-none"
      >
        <NewsDetailPage
          newsId={activeNewsId}
          newsList={displayNews}
          basePath={ROUTES.NEWS}
          onBack={handleBackToList}
          onSelectNews={(nextNews) => {
            setSelectedNewsId(nextNews.id);
            navigate(`/news/detail/${encodeURIComponent(nextNews.id)}`);
          }}
          onEdit={isAdmin ? onEditNews : undefined}
          onDelete={
            isAdmin && onDeleteNews
              ? (id) => {
                  const target = displayNews.find((n) => n.id === id);
                  if (target) onDeleteNews(target);
                  handleBackToList();
                }
              : undefined
          }
        />
      </section>
    );
  }

  return (
    <section
      id="news"
      tabIndex={-1}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12 scroll-mt-20 outline-none space-y-6"
    >
      {/* THANH TIÊU ĐỀ TÒA SOẠN & CHUYÊN MỤC BÁO ĐIỆN TỬ (DUY NHẤT 1 KHỐI, KHÔNG LẶP MENU HỆ THỐNG) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Newspaper size={12} /> Báo Điện Tử KP3
              </span>
              <span>•</span>
              <span className="capitalize font-medium">{todayFormatted}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tin tức &amp; Thông báo Khu phố 3, Phường An Phú
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="citizen-news-search-input"
                name="citizenNewsSearch"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm bài viết, thông báo..."
                aria-label="Tìm bài viết trên trang tin tức"
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isAdmin && onAddNews && (
              <Button
                type="button"
                size="sm"
                variant="emerald"
                onClick={onAddNews}
                leftIcon={<Plus size={14} aria-hidden="true" />}
                className="font-bold shrink-0"
              >
                Đăng bài mới
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowZaloSyncModal(true)}
                leftIcon={<MessageCircle size={14} className="text-blue-600 fill-current" aria-hidden="true" />}
                className="font-bold text-blue-700 border-blue-200 bg-blue-50/70 hover:bg-blue-100 shrink-0"
              >
                Đồng bộ Zalo OA
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onNavigateToTab("cultural")}
                className="font-semibold text-slate-700 border-slate-200 shrink-0"
              >
                Quản trị Tin
              </Button>
            )}
          </div>
        </div>

        {/* Dải Chuyên mục Báo chí (Editorial Category Ribbon — chỉ lọc chuyên mục bài viết, không lặp menu trên Header) */}
        <div
          role="tablist"
          aria-label="Chuyên mục tin tức Khu phố 3"
          className="px-4 sm:px-6 py-2.5 bg-slate-50/70 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap evon-scroll"
        >
          {EDITORIAL_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            const count =
              cat === "Tất cả"
                ? sortedAll.length
                : sortedAll.filter((n) => n.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200/90 hover:border-emerald-300 hover:text-emerald-800"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-emerald-900/60 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BỐ CỤC TÒA SOẠN 2 CỘT CHUẨN BÁO ĐIỆN TỬ (8 CỘT LUỒNG BÀI CHÍNH + 4 CỘT SIDEBAR THÔNG BÁO/SỰ KIỆN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (8 COLS): BÀI ĐINH TIÊU ĐIỂM + DÒNG CHẢY TIN TỨC */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {/* Bài Đinh Tiêu điểm (Lead Story) */}
          {leadStory && (
            <article
              onClick={() => handleSelectNews(leadStory)}
              className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="relative h-56 sm:h-72 w-full bg-slate-100 overflow-hidden">
                <img
                  src={getNewsImage(leadStory)}
                  alt={leadStory.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-rose-700 text-white inline-flex items-center gap-1 shadow-xs">
                      <Flame size={12} /> Tiêu điểm
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 border border-slate-200">
                      {leadStory.category}
                    </span>
                    {(leadStory.isFromZalo || leadStory.zaloArticleId) && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs inline-flex items-center gap-1">
                        <MessageCircle size={11} className="fill-current" /> Zalo OA
                      </span>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/95 text-slate-700 border border-slate-200">
                    {leadStory.date}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-3">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                  {leadStory.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {getNewsSummary(leadStory)}
                </p>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <User size={13} className="text-emerald-700" />
                      {normalizeNewsAuthor(leadStory.author)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock size={12} /> {getNewsReadTime(leadStory)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Eye size={12} /> {getNewsViews(leadStory)} đọc
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700 group-hover:underline inline-flex items-center gap-1">
                    Đọc toàn văn <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </article>
          )}

          {/* Luồng bài viết theo dòng thời gian */}
          {filteredArticles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2.5">
              <Newspaper size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                Không tìm thấy bài viết nào khớp với bộ lọc hiện tại
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("Tất cả");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer"
              >
                Xem lại tất cả bản tin
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {paginatedStream.map((article) => {
                const theme = getCategoryTheme(article.category);
                const linksCount = article.links?.length || 0;
                return (
                  <article
                    key={article.id}
                    onClick={() => handleSelectNews(article)}
                    className="group bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row gap-4 items-start"
                  >
                    <div className="w-full sm:w-48 h-40 sm:h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                      <img
                        src={getNewsImage(article)}
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      {article.isPinned && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold inline-flex items-center gap-1">
                          <Pin size={10} /> Ghim
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between w-full">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md border font-bold ${theme.pill}`}>
                              {article.category}
                            </span>
                            {(article.isFromZalo || article.zaloArticleId) && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                <MessageCircle size={10} className="text-blue-600 fill-current" /> Zalo OA
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-slate-500 inline-flex items-center gap-1">
                            <CalendarDays size={12} /> {article.date}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                          {article.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {getNewsSummary(article)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                          <span className="font-semibold text-slate-700 truncate">
                            {normalizeNewsAuthor(article.author)}
                          </span>
                          {article.attachedFile && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                              <FileText size={11} /> Đính kèm tệp
                            </span>
                          )}
                          {linksCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                              <Link2 size={11} /> {linksCount} liên kết
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAdmin && onEditNews && (
                            <button
                              type="button"
                              onClick={() => onEditNews(article)}
                              className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit3 size={11} /> Sửa
                            </button>
                          )}
                          {isAdmin && onDeleteNews && (
                            <button
                              type="button"
                              onClick={() => onDeleteNews(article)}
                              className="px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Xóa
                            </button>
                          )}
                          <span
                            onClick={() => handleSelectNews(article)}
                            className="font-bold text-emerald-700 group-hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            Xem bài <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              <div className="bg-white rounded-2xl border border-slate-200 p-3">
                <Pagination
                  currentPage={safePage}
                  totalItems={streamSource.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (4 COLS): SIDEBAR THÔNG BÁO CHÍNH THỨC & SỰ KIỆN KHU PHỐ */}
        <aside className="lg:col-span-4 space-y-5 min-w-0">
          {/* Khối 1: Thông báo & Chỉ đạo cần chú ý */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <BellRing size={15} className="text-rose-600 shrink-0" />
                <span>Thông báo &amp; Chỉ đạo</span>
              </h3>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Chính thức
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {pinnedAndOfficialNotices.map((notice, idx) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => handleSelectNews(notice)}
                  className="w-full py-3 first:pt-0 last:pb-0 text-left flex items-start gap-3 group cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-emerald-700 group-hover:text-white text-slate-700 font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-emerald-700 leading-snug line-clamp-2 transition-colors">
                      {notice.title}
                    </p>
                    <span className="text-[11px] font-mono text-slate-500 block">
                      {notice.category} • {notice.date}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Khối 2: Lịch Sinh hoạt & Sự kiện sắp tới */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Calendar size={15} className="text-blue-700 shrink-0" />
                  <span>Sự kiện Sắp diễn ra</span>
                </h3>
                <Link
                  to={ROUTES.SCHEDULE}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Tất cả →
                </Link>
              </div>

              <div className="space-y-2.5">
                {upcomingEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => (onSelectEvent ? onSelectEvent(ev) : navigate(ROUTES.SCHEDULE))}
                    className="w-full text-left p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 transition-colors space-y-1 cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                      {ev.title}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Clock size={11} className="text-blue-700 shrink-0" />
                      <span className="truncate">{ev.dateTime}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <MapPin size={11} className="text-rose-600 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Khối 3: Kênh Tương tác Cư dân nhanh */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5 text-xs">
            <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-emerald-700 shrink-0" />
              <span>Cần phản ánh dân sinh hoặc tải biểu mẫu?</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Gửi kiến nghị về môi trường, trật tự đô thị hoặc tải biểu mẫu cư trú trực tuyến 24/7 tại Cổng dịch vụ Khu phố 3.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to={ROUTES.REFLECTION}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors"
              >
                Gửi phản ánh 1022 →
              </Link>
              <Link
                to={ROUTES.FORMS}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold transition-colors"
              >
                Kho biểu mẫu
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {isAdmin && (
        <ZaloArticleSyncModal
          isOpen={showZaloSyncModal}
          onClose={() => setShowZaloSyncModal(false)}
          onSyncSuccess={onRefreshNews}
        />
      )}
    </section>
  );
}
