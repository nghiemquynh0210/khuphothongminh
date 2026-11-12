import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  Edit2,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Newspaper,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  AdministrativeForm,
  CommunityEvent,
  FieldReport,
  LandingConfig,
  LocalNews,
} from "../types";
import CitizenFooter from "./landing/CitizenFooter";
import CitizenFormsSection from "./landing/CitizenFormsSection";
import CitizenHeader from "./landing/CitizenHeader";
import CitizenHero from "./landing/CitizenHero";
import CitizenLeadershipSection from "./landing/CitizenLeadershipSection";
import CitizenAboutKP3Section from "./landing/CitizenAboutKP3Section";
import CitizenModals from "./landing/CitizenModals";
import CitizenNewsSection from "./landing/CitizenNewsSection";
import CitizenNoticesSection from "./landing/CitizenNoticesSection";
import CitizenQuickServices from "./landing/CitizenQuickServices";
import CitizenReflectionSection from "./landing/CitizenReflectionSection";
import CitizenScheduleSection from "./landing/CitizenScheduleSection";
import {
  DEFAULT_LANDING_CONFIG,
  LandingRoute,
  NAV_ITEMS,
  VERIFIED_LEADERSHIP,
  ROUTES,
  Link,
  getRouteFromPath,
  getPathFromRoute,
  navigate,
  useCurrentPath
} from "./landing/landingConstants";

/* ==========================================================================
   CỔNG NGƯỜI DÂN — LANDING PAGE KHU PHỐ 3, PHƯỜNG AN PHÚ
   Nguyên tắc dữ liệu:
   - Hiển thị dữ liệu trực tiếp từ hệ thống quản lý Khu phố 3 (props).
   - Tự động đồng bộ các bài viết tin tức, thông báo khẩn do Cán bộ ban hành.
   - Kiến trúc tách module: Header, Hero, Services, Reflection, Forms, Notices,
     News, Leadership, Schedule, Footer, Modals.
   ========================================================================== */

export interface CitizenLandingPageProps {
  reports: FieldReport[];
  forms: AdministrativeForm[];
  events: CommunityEvent[];
  news?: LocalNews[];
  residents?: any[];
  households?: any[];
  businesses?: any[];
  onAddReport: (newReport: FieldReport) => void;
  /** Mở màn hình đăng nhập hiện hữu (LoginAndRegister) hoặc nhảy thẳng Quản trị khi đã đăng nhập */
  onOpenStaffLogin?: () => void;
  onSwitchToCanBo?: () => void;
  onNavigateToTab: (tab: any) => void;
  // Admin landing editing props
  isAdmin?: boolean;
  adminName?: string;
  landingConfig?: LandingConfig;
  onUpdateLandingConfig?: (next: LandingConfig) => void;
  onAddNews?: (item: LocalNews) => void;
  onUpdateNews?: (item: LocalNews) => void;
  onDeleteNews?: (id: string) => void;
  onAddEvent?: (item: CommunityEvent) => void;
  onUpdateEvent?: (item: CommunityEvent) => void;
  onDeleteEvent?: (id: string) => void;
  onOpenDashboard?: () => void;
  onLogoutAdmin?: () => void;
}

export default function CitizenLandingPage({
  reports,
  forms,
  events,
  news = [],
  residents,
  households,
  businesses,
  onAddReport,
  onOpenStaffLogin,
  onSwitchToCanBo,
  onNavigateToTab,
  isAdmin = false,
  adminName,
  landingConfig = DEFAULT_LANDING_CONFIG,
  onUpdateLandingConfig,
  onAddNews,
  onUpdateNews,
  onDeleteNews,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenDashboard,
  onLogoutAdmin,
}: CitizenLandingPageProps) {
  const handleOpenStaff = () => {
    if (isAdmin && onOpenDashboard) {
      onOpenDashboard();
      return;
    }
    if (onOpenStaffLogin) {
      onOpenStaffLogin();
    } else if (onSwitchToCanBo) {
      onSwitchToCanBo();
    }
  };

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Theo dõi route từ pathname thực tế (History API, không dùng hash #)
  const currentPath = useCurrentPath();
  const activeRoute = useMemo(() => getRouteFromPath(currentPath), [currentPath]);

  // Chuẩn hóa nếu người dùng vô tình truy cập qua anchor hash cũ (#reflection)
  useEffect(() => {
    if (window.location.hash) {
      const legacyHash = window.location.hash.replace("#", "").trim();
      const matched = NAV_ITEMS.find(n => n.id === legacyHash);
      if (matched) {
        navigate(matched.path, { replace: true });
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // Global search
  const [portalSearch, setPortalSearch] = useState("");

  // Detail modals
  const [previewForm, setPreviewForm] = useState<AdministrativeForm | null>(null);
  const [eventDetail, setEventDetail] = useState<CommunityEvent | null>(null);
  const [newsDetail, setNewsDetail] = useState<LocalNews | null>(null);

  // Showcase filter on Home ("/" default = Tin tức & Sự kiện Khu phố)
  const [showcaseTab, setShowcaseTab] = useState<"all" | "news" | "events">("all");

  // Admin editors state
  const [editingConfigOpen, setEditingConfigOpen] = useState(false);
  const [newsEditorState, setNewsEditorState] = useState<{
    open: boolean;
    item: LocalNews | null;
  }>({ open: false, item: null });
  const [eventEditorState, setEventEditorState] = useState<{
    open: boolean;
    item: CommunityEvent | null;
  }>({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "news" | "event";
    id: string;
    title: string;
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const goTo = (idOrPath: string) => {
    const targetPath = idOrPath.startsWith("/") ? idOrPath : getPathFromRoute(idOrPath as LandingRoute);
    navigate(targetPath);
  };

  const currentNavItem = useMemo(
    () => NAV_ITEMS.find(n => n.id === activeRoute),
    [activeRoute]
  );

  /* ------------------------------ Derived data ------------------------------ */

  // Lịch hoạt động: sự kiện sắp/đang diễn ra
  const upcomingEvents = useMemo(
    () => events.filter(e => e.status === "Sắp diễn ra" || e.status === "Đang diễn ra"),
    [events]
  );

  // Thông báo chính thức & tin khẩn: lấy từ danh sách news có isPinned hoặc Thông báo khẩn / Hành chính
  const displayNotices = useMemo(() => {
    if (news && news.length > 0) {
      const pinnedOrUrgent = news.filter(
        n => n.isPinned || n.category === "Thông báo khẩn" || n.category === "Hành chính"
      );
      return pinnedOrUrgent.length > 0 ? pinnedOrUrgent : news.slice(0, 4);
    }
    return [];
  }, [news]);

  // Tin tức cộng đồng: ưu tiên ghim trước
  const displayNews = useMemo(() => {
    if (news && news.length > 0) {
      return [...news].sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));
    }
    return [];
  }, [news]);

  // Tìm kiếm toàn cổng: biểu mẫu, hoạt động, tin tức, cán bộ
  const searchResults = useMemo(() => {
    const q = portalSearch.trim().toLowerCase();
    if (q.length < 2) return null;
    return {
      forms: forms
        .filter(f => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
        .slice(0, 5),
      events: events
        .filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
        .slice(0, 5),
      leaders: VERIFIED_LEADERSHIP.filter(
        l => l.name.toLowerCase().includes(q) || l.role.toLowerCase().includes(q)
      ),
      news: (news || [])
        .filter(n => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q)))
        .slice(0, 5)
    };
  }, [portalSearch, forms, events, news]);

  /* ------------------------------- Handlers ------------------------------- */

  const handleDownloadForm = (form: AdministrativeForm) => {
    const blob = new Blob(["\uFEFF" + form.templateContent], {
      type: "application/msword;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.code}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã tải biểu mẫu ${form.code}`);
  };

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="min-h-screen bg-gov-light text-gov-text font-sans antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-slate-300"
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* 1. Header (Navbar, Logo, Mobile Nav, Cổng cán bộ, Active Route indicator) */}
      <CitizenHeader
        activeRoute={activeRoute}
        onOpenStaff={handleOpenStaff}
        goTo={goTo}
        isAdmin={isAdmin}
        landingConfig={landingConfig}
      />

      {/* Admin Edit Bar when signed in as Cán bộ */}
      {isAdmin && (
        <div className="border-b border-emerald-200 bg-emerald-50/90 text-emerald-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={16} className="text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                Chế độ Cán bộ Quản trị ({adminName || "Cán bộ KP3"}) — Cho phép chỉnh sửa trực tiếp Trang Chủ, Tin tức & Sự kiện
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditingConfigOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold cursor-pointer"
              >
                <Settings size={13} aria-hidden="true" /> Sửa thông tin Trang chủ
              </button>
              <button
                type="button"
                onClick={() => setNewsEditorState({ open: true, item: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
              >
                <Plus size={13} aria-hidden="true" /> Đăng Tin tức
              </button>
              <button
                type="button"
                onClick={() => setEventEditorState({ open: true, item: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#073B72] hover:bg-[#062d57] text-white font-bold cursor-pointer"
              >
                <Plus size={13} aria-hidden="true" /> Tạo Sự kiện
              </button>
              {onOpenDashboard && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold cursor-pointer"
                >
                  <LayoutDashboard size={13} aria-hidden="true" /> Vào Quản trị KP3
                </button>
              )}
              {onLogoutAdmin && (
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold cursor-pointer"
                  title="Đăng xuất phiên Cán bộ"
                >
                  <LogOut size={13} aria-hidden="true" /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main content sections with route switching */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Sub-page Breadcrumb & Header Banner when route !== "all" */}
        {activeRoute !== "all" && currentNavItem && (
          <div className="bg-gov-navy text-white border-b border-blue-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-100 mb-2">
                <Link
                  to={ROUTES.HOME}
                  className="hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <Home size={13} aria-hidden="true" /> Trang chủ
                </Link>
                <ChevronRight size={13} className="text-blue-200" aria-hidden="true" />
                <span className="text-white font-bold">{currentNavItem.label}</span>
              </nav>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{currentNavItem.label}</h1>
                </div>
                <Link
                  to={ROUTES.HOME}
                  className="min-h-[44px] inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold transition-colors cursor-pointer"
                >
                  ← Về toàn bộ trang chủ
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ROUTE 0: TRANG CHỦ — Hero Banner + Mặc định hiển thị Kênh Tin Tức & Sự Kiện Khu Phố + Tiện ích nhanh */}
        {activeRoute === "all" ? (
          <>
            {/* Hero banner & Quy mô địa bàn KP3 */}
            <CitizenHero
              portalSearch={portalSearch}
              setPortalSearch={setPortalSearch}
              searchResults={searchResults}
              setPreviewForm={setPreviewForm}
              setEventDetail={setEventDetail}
              setNewsDetail={setNewsDetail}
              goTo={goTo}
              onNavigateToTab={onNavigateToTab}
              households={households}
              residents={residents}
              businesses={businesses}
              landingConfig={landingConfig}
              isAdmin={isAdmin}
              onEditConfig={() => setEditingConfigOpen(true)}
            />

            {/* Mặc định: Kênh Tin Tức & Quản Lý Sự Kiện Khu Phố 3 (dạng lưới thẻ Flat Hairline) */}
            <section
              id="kp3-news-events"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10"
              aria-labelledby="kp3-news-events-heading"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Newspaper size={20} className="text-gov-blue" aria-hidden="true" />
                      <h2
                        id="kp3-news-events-heading"
                        className="text-lg sm:text-xl font-black text-gov-navy tracking-tight"
                      >
                        Kênh Tin Tức & Sự Kiện Khu Phố 3
                      </h2>
                    </div>
                    <p className="text-sm text-slate-600">
                      Cập nhật thông báo điều hành, tin đời sống cộng đồng và lịch sự kiện mới nhất tại KP3.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      role="tablist"
                      aria-label="Lọc Kênh Tin tức và Sự kiện"
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1"
                    >
                      {[
                        { id: "all", label: "Tất cả" },
                        { id: "news", label: `Tin tức (${displayNews.length})` },
                        { id: "events", label: `Sự kiện (${events.length})` },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={showcaseTab === t.id}
                          onClick={() => setShowcaseTab(t.id as "all" | "news" | "events")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            showcaseTab === t.id
                              ? "bg-white text-gov-navy border border-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab("cultural")}
                        className="inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800 cursor-pointer"
                      >
                        <LayoutDashboard size={14} aria-hidden="true" /> Mở Quản trị Tin & Sự kiện
                      </button>
                    )}
                  </div>
                </div>

                {/* News Card Grid */}
                {(showcaseTab === "all" || showcaseTab === "news") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <Compass size={15} className="text-gov-blue" aria-hidden="true" /> Tin tức & Thông báo nổi bật
                      </h3>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setNewsEditorState({ open: true, item: null })}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                          >
                            <Plus size={14} aria-hidden="true" /> Thêm tin
                          </button>
                        )}
                        <Link
                          to={ROUTES.NEWS}
                          className="text-xs font-bold text-gov-blue hover:underline inline-flex items-center gap-0.5"
                        >
                          Xem tất cả <ChevronRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayNews.slice(0, showcaseTab === "news" ? 9 : 6).map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-slate-200 hover:border-gov-blue bg-white overflow-hidden flex flex-col justify-between transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setNewsDetail(item)}
                            className="text-left flex-1 flex flex-col cursor-pointer"
                          >
                            {item.imageUrl && (
                              <div className="h-32 w-full bg-slate-100 border-b border-slate-100 relative overflow-hidden">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {item.isPinned && (
                                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-950 font-bold text-xs border border-amber-400">
                                    Ghim
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="p-4 space-y-2">
                              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                                <span className="font-semibold text-gov-navy bg-slate-100 px-2 py-0.5 rounded">
                                  {item.category}
                                </span>
                                <span className="font-mono flex items-center gap-1 shrink-0">
                                  <Clock size={12} aria-hidden="true" /> {item.date}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                                {item.title}
                              </h4>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {item.content}
                              </p>
                            </div>
                          </button>

                          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-slate-600">{item.author}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setNewsEditorState({ open: true, item })}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                    title="Sửa bài viết"
                                    aria-label={`Sửa ${item.title}`}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({ kind: "news", id: item.id, title: item.title })
                                    }
                                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                    title="Xóa bài viết"
                                    aria-label={`Xóa ${item.title}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setNewsDetail(item)}
                                className="text-gov-blue font-bold hover:underline cursor-pointer"
                              >
                                Chi tiết →
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {/* Events Card Grid */}
                {(showcaseTab === "all" || showcaseTab === "events") && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <Calendar size={15} className="text-gov-blue" aria-hidden="true" /> Sự kiện & Hoạt động Cộng đồng
                      </h3>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setEventEditorState({ open: true, item: null })}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                          >
                            <Plus size={14} aria-hidden="true" /> Tạo sự kiện
                          </button>
                        )}
                        <Link
                          to={ROUTES.SCHEDULE}
                          className="text-xs font-bold text-gov-blue hover:underline inline-flex items-center gap-0.5"
                        >
                          Xem lịch đầy đủ <ChevronRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {events.slice(0, showcaseTab === "events" ? 9 : 6).map((ev) => (
                        <article
                          key={ev.id}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-gov-blue bg-white flex flex-col justify-between gap-3 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setEventDetail(ev)}
                            className="text-left space-y-2 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                  ev.status === "Đang diễn ra"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : ev.status === "Sắp diễn ra"
                                    ? "bg-blue-100 text-gov-navy"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {ev.status}
                              </span>
                              <span className="text-xs font-mono text-slate-600">
                                ~{ev.expectedAttendees} người
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                              {ev.title}
                            </h4>
                            <p className="text-xs text-slate-600 flex items-center gap-1.5">
                              <Clock size={13} className="text-gov-blue shrink-0" aria-hidden="true" />{" "}
                              <span className="truncate">{ev.dateTime}</span>
                            </p>
                            <p className="text-xs text-slate-600 flex items-center gap-1.5">
                              <MapPin size={13} className="text-gov-danger shrink-0" aria-hidden="true" />{" "}
                              <span className="truncate">{ev.location}</span>
                            </p>
                          </button>

                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-slate-600">{ev.organizer}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEventEditorState({ open: true, item: ev })}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                    title="Sửa sự kiện"
                                    aria-label={`Sửa ${ev.title}`}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({ kind: "event", id: ev.id, title: ev.title })
                                    }
                                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                    title="Xóa sự kiện"
                                    aria-label={`Xóa ${ev.title}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Tiện ích nhanh (id="services") — cổng điều hướng vào các chuyên mục */}
            <CitizenQuickServices
              formsCount={forms.length}
              goTo={goTo}
              onNavigateToTab={onNavigateToTab}
            />
          </>
        ) : (
          /* ROUTE CHUYÊN BIỆT: CHỈ RENDER PHÂN HỆ ĐƯỢC CHỌN */
          <div className="pb-16 min-h-[60vh]">
            {activeRoute === "about" && <CitizenAboutKP3Section />}

            {activeRoute === "services" && (
              <div className="pt-8">
                <CitizenQuickServices
                  formsCount={forms.length}
                  goTo={goTo}
                  onNavigateToTab={onNavigateToTab}
                />
              </div>
            )}

            {activeRoute === "reflection" && (
              <CitizenReflectionSection
                reports={reports}
                onAddReport={onAddReport}
                showToast={showToast}
              />
            )}

            {activeRoute === "forms" && (
              <CitizenFormsSection
                forms={forms}
                onNavigateToTab={onNavigateToTab}
                setPreviewForm={setPreviewForm}
                handleDownloadForm={handleDownloadForm}
              />
            )}

            {activeRoute === "notices" && (
              <CitizenNoticesSection
                displayNotices={displayNotices}
                setNewsDetail={setNewsDetail}
                goTo={goTo}
                isAdmin={isAdmin}
                onAddNews={() => setNewsEditorState({ open: true, item: null })}
                onEditNews={(item) => setNewsEditorState({ open: true, item })}
                onDeleteNews={(item) =>
                  setDeleteTarget({ kind: "news", id: item.id, title: item.title })
                }
              />
            )}

            {activeRoute === "news" && (
              <CitizenNewsSection
                displayNews={displayNews}
                setNewsDetail={setNewsDetail}
                onNavigateToTab={onNavigateToTab}
                isAdmin={isAdmin}
                onAddNews={() => setNewsEditorState({ open: true, item: null })}
                onEditNews={(item) => setNewsEditorState({ open: true, item })}
                onDeleteNews={(item) =>
                  setDeleteTarget({ kind: "news", id: item.id, title: item.title })
                }
              />
            )}

            {activeRoute === "leadership" && <CitizenLeadershipSection />}

            {activeRoute === "schedule" && (
              <CitizenScheduleSection
                upcomingEvents={upcomingEvents}
                setEventDetail={setEventDetail}
                onNavigateToTab={onNavigateToTab}
                isAdmin={isAdmin}
                onAddEvent={() => setEventEditorState({ open: true, item: null })}
                onEditEvent={(ev) => setEventEditorState({ open: true, item: ev })}
                onDeleteEvent={(ev) =>
                  setDeleteTarget({ kind: "event", id: ev.id, title: ev.title })
                }
              />
            )}
          </div>
        )}
      </main>

      {/* 3. Footer (Thông tin, nguồn tin, bản quyền) */}
      <CitizenFooter
        onOpenStaff={handleOpenStaff}
        isAdmin={isAdmin}
        landingConfig={landingConfig}
        onEditConfig={() => setEditingConfigOpen(true)}
      />

      {/* 4. Modals & Notifications */}
      <CitizenModals
        previewForm={previewForm}
        setPreviewForm={setPreviewForm}
        allForms={forms}
        eventDetail={eventDetail}
        setEventDetail={setEventDetail}
        allEvents={events}
        newsDetail={newsDetail}
        setNewsDetail={setNewsDetail}
        allNews={displayNews}
        toast={toast}
        handleDownloadForm={handleDownloadForm}
        isAdmin={isAdmin}
        editingConfigOpen={editingConfigOpen}
        onCloseConfigModal={() => setEditingConfigOpen(false)}
        landingConfig={landingConfig}
        onSaveLandingConfig={(next) => {
          onUpdateLandingConfig?.(next);
          showToast("Đã cập nhật thông tin Trang Chủ Khu phố 3.");
        }}
        newsEditorState={newsEditorState}
        onCloseNewsEditor={() => setNewsEditorState({ open: false, item: null })}
        onSaveNews={(saved, isEdit) => {
          if (isEdit) {
            onUpdateNews?.(saved);
            if (newsDetail?.id === saved.id) setNewsDetail(saved);
            showToast(`Đã cập nhật bài viết "${saved.title}".`);
          } else {
            onAddNews?.(saved);
            showToast(`Đã đăng bài viết "${saved.title}".`);
          }
        }}
        onRequestEditNews={(item) => {
          setNewsDetail(null);
          setNewsEditorState({ open: true, item });
        }}
        onRequestDeleteNews={(item) =>
          setDeleteTarget({ kind: "news", id: item.id, title: item.title })
        }
        eventEditorState={eventEditorState}
        onCloseEventEditor={() => setEventEditorState({ open: false, item: null })}
        onSaveEvent={(saved, isEdit) => {
          if (isEdit) {
            onUpdateEvent?.(saved);
            if (eventDetail?.id === saved.id) setEventDetail(saved);
            showToast(`Đã cập nhật sự kiện "${saved.title}".`);
          } else {
            onAddEvent?.(saved);
            showToast(`Đã tạo sự kiện "${saved.title}".`);
          }
        }}
        onRequestEditEvent={(ev) => {
          setEventDetail(null);
          setEventEditorState({ open: true, item: ev });
        }}
        onRequestDeleteEvent={(ev) =>
          setDeleteTarget({ kind: "event", id: ev.id, title: ev.title })
        }
        deleteTarget={deleteTarget}
        onCloseDeleteConfirm={() => setDeleteTarget(null)}
        onConfirmDelete={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "news") {
            onDeleteNews?.(deleteTarget.id);
            if (newsDetail?.id === deleteTarget.id) setNewsDetail(null);
            showToast(`Đã xóa bài viết "${deleteTarget.title}".`);
          } else {
            onDeleteEvent?.(deleteTarget.id);
            if (eventDetail?.id === deleteTarget.id) setEventDetail(null);
            showToast(`Đã xóa sự kiện "${deleteTarget.title}".`);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
