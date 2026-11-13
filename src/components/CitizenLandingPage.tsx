import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Clock,
  Edit2,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X,
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
import CitizenLeadershipSection from "./landing/CitizenLeadershipSection";
import CitizenAboutKP3Section from "./landing/CitizenAboutKP3Section";
import CitizenModals from "./landing/CitizenModals";
import CitizenNewsSection from "./landing/CitizenNewsSection";
import CitizenNoticesSection from "./landing/CitizenNoticesSection";
import CitizenQuickServices from "./landing/CitizenQuickServices";
import CitizenReflectionSection from "./landing/CitizenReflectionSection";
import CitizenScheduleSection from "./landing/CitizenScheduleSection";
import { NewsNewspaperFeed } from "./news/NewsNewspaperFeed";
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
import { Button, buttonVariants } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/Card";
import { Separator } from "./ui/separator";
import { cn } from "../lib/utils";

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
  onAddReport,
  onOpenStaffLogin,
  onSwitchToCanBo,
  onNavigateToTab,
  isAdmin = false,
  adminName,
  landingConfig = DEFAULT_LANDING_CONFIG,
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

  // Admin editors state
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
      leaders: (landingConfig.leadership && landingConfig.leadership.length > 0
        ? landingConfig.leadership
        : VERIFIED_LEADERSHIP
      ).filter(
        l => l.name.toLowerCase().includes(q) || l.role.toLowerCase().includes(q)
      ),
      news: (news || [])
        .filter(n => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q)))
        .slice(0, 5)
    };
  }, [portalSearch, forms, events, news, landingConfig.leadership]);

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

      {/* Admin Bar when signed in as Cán bộ */}
      {isAdmin && (
        <div className="border-b border-emerald-200/90 bg-emerald-50/90 text-emerald-950 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <Badge variant="success" className="gap-1.5 px-2.5 py-1 text-xs font-bold border-emerald-300 bg-emerald-100 text-emerald-900 shadow-2xs">
                <ShieldCheck size={14} className="text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Chế độ Cán bộ ({adminName || "Cán bộ KP3"})</span>
              </Badge>
              <span className="text-emerald-900 hidden md:inline text-xs font-medium">
                Quản lý nội dung Trang chủ &amp; Cổng cư dân trong mục Cài đặt
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onNavigateToTab("settings")}
                leftIcon={<Settings size={13} aria-hidden="true" />}
                className="bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
              >
                Cài đặt Trang chủ &amp; Cán bộ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="emerald"
                onClick={() => setNewsEditorState({ open: true, item: null })}
                leftIcon={<Plus size={13} aria-hidden="true" />}
                className="font-bold"
              >
                Đăng Tin tức
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => setEventEditorState({ open: true, item: null })}
                leftIcon={<Plus size={13} aria-hidden="true" />}
                className="font-bold bg-[#073B72] hover:bg-[#062d57]"
              >
                Tạo Sự kiện
              </Button>
              {onOpenDashboard && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenDashboard}
                  leftIcon={<LayoutDashboard size={13} aria-hidden="true" />}
                  className="bg-white hover:bg-slate-100 border-slate-300 text-slate-900 font-bold"
                >
                  Vào Quản trị KP3
                </Button>
              )}
              {onLogoutAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="dangerGhost"
                  onClick={onLogoutAdmin}
                  leftIcon={<LogOut size={13} aria-hidden="true" />}
                  className="font-semibold text-rose-700 border-rose-200"
                  title="Đăng xuất phiên Cán bộ"
                >
                  Đăng xuất
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main content sections with route switching */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Sub-page Breadcrumb & Header Banner when route !== "all" */}
        {activeRoute !== "all" && currentNavItem && (
          <div className="bg-gradient-to-r from-gov-navy to-[#062d57] text-white border-b border-blue-950/40 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-200/90 mb-2">
                <Link
                  to={ROUTES.HOME}
                  className="hover:text-white hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors min-h-[36px]"
                >
                  <Home size={13} aria-hidden="true" /> Trang chủ
                </Link>
                <ChevronRight size={13} className="text-blue-300/80" aria-hidden="true" />
                <span className="text-white font-bold">{currentNavItem.label}</span>
              </nav>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{currentNavItem.label}</h1>
                  <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-2xl">
                    Cổng dịch vụ hành chính công trực tuyến và tra cứu cộng đồng Khu phố 3, Phường An Phú
                  </p>
                </div>
                <Link
                  to={ROUTES.HOME}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-xs font-bold",
                  })}
                >
                  ← Về toàn bộ trang chủ
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ROUTE 0: TRANG CHỦ — Mặc định hiển thị Bản tin & Báo điện tử Khu phố 3 + Sự kiện & Tiện ích nhanh */}
        {activeRoute === "all" ? (
          <>
            {/* Compact Masthead & Global Portal Search Strip (shadcn Card + Badge) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-2xs space-y-4 bg-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-gov-navy bg-blue-50/80 border-blue-200/80 px-2.5 py-0.5 font-bold">
                        {landingConfig.heroBadge}
                      </Badge>
                      <Badge variant="success" className="font-semibold text-[11px] px-2 py-0.5">
                        Cổng Dịch Vụ Cư Dân Số
                      </Badge>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {landingConfig.heroTitle}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5">
                      <MapPin size={14} className="text-rose-600/80 shrink-0" aria-hidden="true" />
                      <span>{landingConfig.heroAddressNote}</span>
                    </p>
                  </div>

                  {/* Global Portal Search */}
                  <div className="relative w-full lg:w-96 shrink-0">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={portalSearch}
                      onChange={(e) => setPortalSearch(e.target.value)}
                      placeholder="Tra cứu nhanh tin tức, sự kiện, cán bộ, biểu mẫu..."
                      aria-label="Tra cứu nhanh cổng thông tin"
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white focus:bg-white text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs placeholder:text-slate-500"
                    />
                    {portalSearch && (
                      <button
                        type="button"
                        onClick={() => setPortalSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        aria-label="Xóa nội dung tìm kiếm"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {searchResults && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl z-30 p-3 space-y-1.5 max-h-80 overflow-y-auto text-xs animate-in fade-in-0 zoom-in-95">
                        {searchResults.news.length === 0 &&
                        searchResults.events.length === 0 &&
                        searchResults.forms.length === 0 &&
                        searchResults.leaders.length === 0 ? (
                          <p className="text-slate-500 py-3 text-center font-medium">
                            Không tìm thấy kết quả phù hợp cho &quot;{portalSearch}&quot;.
                          </p>
                        ) : (
                          <>
                            {searchResults.news.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => {
                                  navigate(`/news/detail/${encodeURIComponent(n.id)}`);
                                  setPortalSearch("");
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Badge variant="success" className="shrink-0 text-[10px] px-1.5 py-0 font-bold">
                                    Tin tức
                                  </Badge>
                                  <span className="truncate">{n.title}</span>
                                </div>
                                <ChevronRight size={13} className="text-slate-400 shrink-0" />
                              </button>
                            ))}
                            {searchResults.events.map((ev) => (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => {
                                  setEventDetail(ev);
                                  setPortalSearch("");
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-bold bg-blue-50 text-gov-navy border-blue-200">
                                    Sự kiện
                                  </Badge>
                                  <span className="truncate">{ev.title}</span>
                                </div>
                                <ChevronRight size={13} className="text-slate-400 shrink-0" />
                              </button>
                            ))}
                            {searchResults.forms.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setPreviewForm(f);
                                  setPortalSearch("");
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Badge variant="warning" className="shrink-0 text-[10px] px-1.5 py-0 font-bold">
                                    Biểu mẫu
                                  </Badge>
                                  <span className="truncate">{f.code} — {f.title}</span>
                                </div>
                                <ChevronRight size={13} className="text-slate-400 shrink-0" />
                              </button>
                            ))}
                            {searchResults.leaders.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => {
                                  goTo("leadership");
                                  setPortalSearch("");
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 font-bold border-purple-200 text-purple-700 bg-purple-50">
                                    Cán bộ
                                  </Badge>
                                  <span className="truncate">{l.name} — {l.role}</span>
                                </div>
                                <ChevronRight size={13} className="text-slate-400 shrink-0" />
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </section>

            {/* Mặc định: Trang Bản tin & Báo điện tử Khu phố 3 (shadcn Card) */}
            <section
              id="kp3-news-events"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8"
              aria-labelledby="kp3-news-events-heading"
            >
              <Card className="bg-white rounded-2xl sm:rounded-3xl border-slate-200/90 p-5 sm:p-8 shadow-2xs">
                <h2 id="kp3-news-events-heading" className="sr-only">
                  Bản tin &amp; Báo điện tử Khu phố 3
                </h2>
                <NewsNewspaperFeed
                  newsList={displayNews}
                  onSelectNews={(item) => navigate(`/news/detail/${encodeURIComponent(item.id)}`)}
                  onCreateNews={
                    isAdmin ? () => setNewsEditorState({ open: true, item: null }) : undefined
                  }
                  onEditNews={
                    isAdmin ? (item) => setNewsEditorState({ open: true, item }) : undefined
                  }
                  onDeleteNews={
                    isAdmin
                      ? (item) =>
                          setDeleteTarget({ kind: "news", id: item.id, title: item.title })
                      : undefined
                  }
                  bannerNotice={landingConfig.bannerNotice}
                  itemsPerPage={6}
                />
              </Card>

              {/* Lịch Sự kiện Cộng đồng sắp tới (shadcn Card + Badge + Button) */}
              <Card className="bg-white rounded-2xl sm:rounded-3xl border-slate-200/90 p-5 sm:p-8 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-gov-blue shrink-0">
                      <Calendar size={18} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Sự kiện &amp; Hoạt động Cộng đồng KP3
                      </h3>
                      <p className="text-xs text-slate-500">
                        Lịch sinh hoạt chi bộ, họp dân, tiêm chủng và phong trào thi đua
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="emerald"
                        onClick={() => setEventEditorState({ open: true, item: null })}
                        leftIcon={<Plus size={14} aria-hidden="true" />}
                        className="font-bold shadow-2xs"
                      >
                        Tạo sự kiện
                      </Button>
                    )}
                    <Link
                      to={ROUTES.SCHEDULE}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "font-bold text-gov-blue hover:text-gov-blue border-slate-200 gap-1",
                      })}
                    >
                      Xem lịch đầy đủ <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.slice(0, 6).map((ev) => (
                    <Card
                      key={ev.id}
                      variant="interactive"
                      className="p-4 rounded-xl border-slate-200/90 hover:border-gov-blue/60 hover:shadow-sm bg-white flex flex-col justify-between gap-3 transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setEventDetail(ev)}
                        className="text-left space-y-2.5 cursor-pointer w-full"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={
                              ev.status === "Đang diễn ra"
                                ? "success"
                                : ev.status === "Sắp diễn ra"
                                ? "secondary"
                                : "outline"
                            }
                            className={cn(
                              "font-semibold text-xs",
                              ev.status === "Sắp diễn ra" && "bg-blue-50 text-gov-navy border-blue-200"
                            )}
                          >
                            {ev.status}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-slate-600 text-[11px] bg-slate-50 border-slate-200">
                            ~{ev.expectedAttendees} người
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug hover:text-gov-blue transition-colors">
                          {ev.title}
                        </h4>
                        <div className="space-y-1 text-xs text-slate-600">
                          <p className="flex items-center gap-1.5">
                            <Clock size={13} className="text-gov-blue shrink-0" aria-hidden="true" />{" "}
                            <span className="truncate">{ev.dateTime}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-rose-600 shrink-0" aria-hidden="true" />{" "}
                            <span className="truncate">{ev.location}</span>
                          </p>
                        </div>
                      </button>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-500 font-medium">{ev.organizer}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isAdmin && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventEditorState({ open: true, item: ev });
                                }}
                                className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                title="Sửa sự kiện"
                                aria-label={`Sửa ${ev.title}`}
                              >
                                <Edit2 size={13} />
                              </Button>
                              <Button
                                size="icon"
                                variant="dangerGhost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ kind: "event", id: ev.id, title: ev.title });
                                }}
                                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Xóa sự kiện"
                                aria-label={`Xóa ${ev.title}`}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEventDetail(ev)}
                            className="text-gov-blue hover:text-gov-blue hover:bg-blue-50 font-bold h-8 px-2 cursor-pointer"
                          >
                            Chi tiết →
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
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
            {activeRoute === "about" && <CitizenAboutKP3Section landingConfig={landingConfig} />}

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

            {activeRoute === "leadership" && (
              <CitizenLeadershipSection landingConfig={landingConfig} />
            )}

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
