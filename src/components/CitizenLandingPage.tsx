import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  AdministrativeForm,
  CommunityEvent,
  FieldReport,
  LandingConfig,
  LocalNews,
  ScheduleEvent,
} from "../types";
import { loadSchedulesFromDb } from "../utils/supabaseSync";
import { downloadOfficialDocx } from "../utils/docxExport";
import CitizenFooter from "./landing/CitizenFooter";
import CitizenFormsSection from "./landing/CitizenFormsSection";
import CitizenHeader from "./landing/CitizenHeader";
import CitizenLeadershipSection from "./landing/CitizenLeadershipSection";
import CitizenAboutKP3Section from "./landing/CitizenAboutKP3Section";
import CitizenModals from "./landing/CitizenModals";
import { PublicHostelCheckinModal } from "./landing/PublicHostelCheckinModal";
import CitizenNewsSection from "./landing/CitizenNewsSection";
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
  useCurrentPath,
} from "./landing/landingConstants";
import { Button, buttonVariants } from "./ui/Button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/Card";
import { cn } from "../lib/utils";

export interface CitizenLandingPageProps {
  reports: FieldReport[];
  forms: AdministrativeForm[];
  events: CommunityEvent[];
  publicSchedules?: ScheduleEvent[];
  news?: LocalNews[];
  residents?: any[];
  households?: any[];
  businesses?: any[];
  onAddReport: (newReport: FieldReport) => void;
  onOpenStaffLogin?: () => void;
  onSwitchToCanBo?: () => void;
  onNavigateToTab: (tab: any) => void;
  isAdmin?: boolean;
  adminName?: string;
  landingConfig?: LandingConfig;
  onUpdateLandingConfig?: (next: LandingConfig) => void;
  onAddNews?: (item: LocalNews) => void;
  onUpdateNews?: (item: LocalNews) => void;
  onDeleteNews?: (id: string) => void;
  onRefreshNews?: () => void;
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
  publicSchedules,
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
  onRefreshNews,
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

  const currentPath = useCurrentPath();
  const activeRoute = useMemo(() => getRouteFromPath(currentPath), [currentPath]);

  useEffect(() => {
    if (window.location.hash) {
      const legacyHash = window.location.hash.replace("#", "").trim();
      const matched = NAV_ITEMS.find((n) => n.id === legacyHash);
      if (matched) {
        navigate(matched.path, { replace: true });
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const [portalSearch, setPortalSearch] = useState("");
  const [previewForm, setPreviewForm] = useState<AdministrativeForm | null>(null);
  const [eventDetail, setEventDetail] = useState<CommunityEvent | null>(null);
  const [newsDetail, setNewsDetailState] = useState<LocalNews | null>(null);
  const prevPathBeforeNewsRef = useRef<string>(ROUTES.HOME);

  const setNewsDetail = (next: LocalNews | null) => {
    setNewsDetailState(next);
    if (!next && typeof window !== "undefined" && window.location.pathname.startsWith("/news/detail/")) {
      const fallback =
        prevPathBeforeNewsRef.current && !prevPathBeforeNewsRef.current.startsWith("/news/detail/")
          ? prevPathBeforeNewsRef.current
          : ROUTES.NEWS;
      navigate(fallback, { replace: true, scrollToTop: false });
    }
  };

  const openNewsArticle = (item: LocalNews) => {
    if (!currentPath.startsWith("/news/detail/")) {
      prevPathBeforeNewsRef.current = currentPath || ROUTES.HOME;
    }
    setNewsDetailState(item);
    navigate(`/news/detail/${encodeURIComponent(item.id)}`, { scrollToTop: false });
  };

  const [fetchedPublicSchedules, setFetchedPublicSchedules] = useState<ScheduleEvent[]>([]);
  useEffect(() => {
    if (publicSchedules !== undefined) return;
    let cancelled = false;
    loadSchedulesFromDb()
      .then((rows) => {
        if (cancelled) return;
        if (Array.isArray(rows)) {
          setFetchedPublicSchedules(rows.filter((s) => s.isPublicCitizenVisible === true));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [publicSchedules]);

  const effectivePublicSchedules = useMemo(
    () =>
      (publicSchedules ?? fetchedPublicSchedules).filter(
        (s) => s.isPublicCitizenVisible === true
      ),
    [publicSchedules, fetchedPublicSchedules]
  );

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
    () => NAV_ITEMS.find((n) => n.id === activeRoute),
    [activeRoute]
  );

  const upcomingEvents = useMemo(
    () => events.filter((e) => e.status === "Sắp diễn ra" || e.status === "Đang diễn ra"),
    [events]
  );

  const displayNews = useMemo(() => {
    if (news && news.length > 0) {
      return [...news].sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));
    }
    return [];
  }, [news]);

  const [prevMatchedPath, setPrevMatchedPath] = useState<string | null>(null);
  const match = currentPath.match(/^\/news\/detail\/([^/?#]+)/);
  const targetId = match ? decodeURIComponent(match[1]) : null;

  if (targetId && targetId !== prevMatchedPath) {
    setPrevMatchedPath(targetId);
    const matchedArticle = (news || []).find((n) => String(n.id) === targetId);
    if (matchedArticle) {
      setNewsDetailState(matchedArticle);
    }
  } else if (!targetId && prevMatchedPath !== null) {
    setPrevMatchedPath(null);
  }

  const searchResults = useMemo(() => {
    const q = portalSearch.trim().toLowerCase();
    if (q.length < 2) return null;
    return {
      forms: forms
        .filter((f) => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
        .slice(0, 5),
      events: events
        .filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
        .slice(0, 5),
      leaders: (landingConfig.leadership && landingConfig.leadership.length > 0
        ? landingConfig.leadership
        : VERIFIED_LEADERSHIP
      ).filter(
        (l) => l.name.toLowerCase().includes(q) || l.role.toLowerCase().includes(q)
      ),
      news: (news || [])
        .filter((n) => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q)))
        .slice(0, 5),
    };
  }, [portalSearch, forms, events, news, landingConfig.leadership]);

  const handleDownloadForm = async (form: AdministrativeForm) => {
    const realFileUrl = (form as any).fileUrl as string | undefined;
    const realFileName = (form as any).fileName as string | undefined;

    if (realFileUrl) {
      const a = document.createElement("a");
      a.href = realFileUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      if (realFileName) a.download = realFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Đang tải tệp biểu mẫu "${realFileName || form.code}"`);
      return;
    }

    const safeCode = form.code.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeCode}_KhuPho3_AnPhu.docx`;
    try {
      await downloadOfficialDocx(
        {
          title: form.title,
          rawContent: form.templateContent,
          documentNumber: `Mẫu số: ${form.code}/BĐH-KP3`,
        },
        filename
      );
      showToast(`Đã tải biểu mẫu Word (.docx) chuẩn: ${form.code}`);
      return;
    } catch (err) {
      console.warn("Lỗi xuất docx, dùng fallback .doc:", err);
    }

    const blob = new Blob(["\uFEFF" + form.templateContent], {
      type: "application/msword;charset=utf-8",
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

  const isNewsSubPage = activeRoute === "news" || activeRoute === "notices";
  const isAboutOrLeadership = activeRoute === "about" || activeRoute === "leadership";

  return (
    <div className="min-h-screen bg-gov-light text-gov-text font-sans antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-slate-300"
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* 1. Thanh Điều hướng Chính (Tinh gọn 6 mục cốt lõi, không lặp menu) */}
      <CitizenHeader
        activeRoute={activeRoute}
        onOpenStaff={handleOpenStaff}
        goTo={goTo}
        isAdmin={isAdmin}
        landingConfig={landingConfig}
      />

      {/* Thanh trạng thái Cán bộ gọn nhẹ (không lặp nút Đăng tin / Tạo sự kiện gây rối ở bên dưới) */}
      {isAdmin && (
        <div className="border-b border-emerald-200/80 bg-emerald-50/90 text-emerald-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={14} className="text-emerald-700 shrink-0" aria-hidden="true" />
              <span>Phiên làm việc Cán bộ: <strong>{adminName || "Cán bộ KP3"}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigateToTab("settings")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Settings size={12} /> Cài đặt Cổng
              </button>
              {onOpenDashboard && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LayoutDashboard size={12} /> Bảng Điều hành
                </button>
              )}
              {onLogoutAdmin && (
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  className="px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Đăng xuất phiên Cán bộ"
                >
                  <LogOut size={12} /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Khu vực Nội dung Chính */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Thanh điều hướng phụ mỏng gọn cho các trang con (Riêng /news dùng thẳng Masthead Báo điện tử để không lặp Header!) */}
        {activeRoute !== "all" && !isNewsSubPage && currentNavItem && (
          <div className="bg-white border-b border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Link
                  to={ROUTES.HOME}
                  className="hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Home size={13} aria-hidden="true" /> Trang chủ
                </Link>
                <ChevronRight size={13} className="text-slate-400" aria-hidden="true" />
                <span className="text-slate-900 font-bold">
                  {isAboutOrLeadership ? "Giới thiệu & Danh bạ Cán bộ KP3" : currentNavItem.label}
                </span>
              </nav>

              {isAboutOrLeadership && (
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <Link
                    to={ROUTES.ABOUT}
                    className={cn(
                      "px-3 py-1 rounded-lg font-bold transition-colors inline-flex items-center gap-1.5",
                      activeRoute === "about"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Info size={13} /> Giới thiệu Khu phố 3
                  </Link>
                  <Link
                    to={ROUTES.LEADERSHIP}
                    className={cn(
                      "px-3 py-1 rounded-lg font-bold transition-colors inline-flex items-center gap-1.5",
                      activeRoute === "leadership"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Users size={13} /> Danh bạ Ban Điều hành
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ROUTE 0: TRANG CHỦ CỔNG CƯ DÂN — 1 Dải Tra cứu + Tác vụ nhanh & Điểm tin Tiêu điểm (Không chồng 2 thẻ tiêu đề!) */}
        {activeRoute === "all" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
            {/* Dải Tác nghiệp & Tra cứu Toàn cổng hợp nhất (Thay thế 2 hộp tiêu đề rời rạc trước đây) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:px-6 sm:py-4 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mr-1">
                  Dịch vụ nhanh:
                </span>
                <a
                  href="https://zalo.me/s/30172911027069915/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <MessageCircle size={13} className="text-white" />
                  <span>Zalo Mini App</span>
                </a>
                <Link
                  to={ROUTES.REFLECTION}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare size={13} className="text-rose-700" />
                  <span>Gửi / Tra cứu Phản ánh 1022</span>
                </Link>
                <Link
                  to={ROUTES.FORMS}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <FileText size={13} className="text-emerald-700" />
                  <span>Biểu mẫu Cư trú ({forms.length})</span>
                </Link>
                <Link
                  to={ROUTES.SCHEDULE}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Calendar size={13} className="text-blue-700" />
                  <span>Lịch tiếp dân</span>
                </Link>
                <Link
                  to={ROUTES.LEADERSHIP}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Users size={13} className="text-slate-600" />
                  <span>Danh bạ Cán bộ KP3</span>
                </Link>
              </div>

              {/* Ô Tra cứu nhanh toàn cổng (Placeholder gọn, không bao giờ bị cắt cụt) */}
              <div className="relative w-full xl:w-88 shrink-0">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="portal-quick-search-input"
                  name="portalQuickSearch"
                  type="search"
                  value={portalSearch}
                  onChange={(e) => setPortalSearch(e.target.value)}
                  placeholder="Tìm tin tức, biểu mẫu, cán bộ..."
                  aria-label="Tra cứu nhanh cổng thông tin"
                  className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500"
                />
                {portalSearch && (
                  <button
                    type="button"
                    onClick={() => setPortalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                    aria-label="Xóa nội dung tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
                {searchResults && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 space-y-1.5 max-h-80 overflow-y-auto text-xs">
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
                              openNewsArticle(n);
                              setPortalSearch("");
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer"
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
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer"
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
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer"
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
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-800 flex items-center justify-between gap-2 cursor-pointer"
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

            {/* Banner Zalo Mini App Chính Thức */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-600/40">
              <div className="flex items-center gap-3.5">
                <img
                  src="/zalo_mini_app_v2_qr_code.png"
                  alt="QR Code Zalo Mini App KP3"
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-xl shadow shrink-0 object-contain"
                />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-emerald-400 text-slate-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Mới • Zalo Mini App
                    </span>
                    <span className="text-xs text-blue-200 font-medium">Phiên bản v6 • Có Cổng Cán bộ</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-tight">
                    Khu Phố 3 - Phường An Phú trên Zalo
                  </h3>
                  <p className="text-xs text-blue-100 mt-1 max-w-xl">
                    Quét mã QR bằng ứng dụng Zalo trên điện thoại hoặc bấm nút mở trực tiếp để gửi phản ánh 1022, tra cứu cư trú &amp; tải biểu mẫu hành chính mọi lúc mọi nơi.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href="https://zalo.me/s/30172911027069915/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-800 font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle size={15} className="text-blue-600" />
                  <span>Mở trên Zalo</span>
                  <ExternalLink size={13} className="text-blue-400" />
                </a>
                <a
                  href="https://github.com/nghiemquynh0210/khuphothongminh/releases/latest/download/KP3-AnPhu.apk"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Smartphone size={15} />
                  <span>Tải App Android (.APK)</span>
                  <Download size={13} />
                </a>
                <a
                  href="https://zalo.me/bdhkhupho3"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-blue-900/60 hover:bg-blue-900 text-white font-bold text-xs inline-flex items-center gap-1.5 border border-white/20 transition-all"
                >
                  <span>Quan tâm Zalo OA</span>
                </a>
              </div>
            </div>

            {/* Điểm tin Báo điện tử Khu phố 3 (Chế độ tinh gọn Trang chủ, không lặp hộp tiêu đề / ô tìm kiếm) */}
            <Card className="bg-white rounded-2xl border-slate-200/90 p-5 sm:p-7 shadow-2xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                    <Newspaper size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Điểm tin &amp; Thông báo Khu phố 3
                    </h2>
                    <p className="text-xs text-slate-500">
                      Thông tin điều hành chính thức và đời sống dân cư Phường An Phú
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="emerald"
                      onClick={() => setNewsEditorState({ open: true, item: null })}
                      leftIcon={<Plus size={14} aria-hidden="true" />}
                      className="font-bold"
                    >
                      Đăng bản tin
                    </Button>
                  )}
                  <Link
                    to={ROUTES.NEWS}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "font-bold text-emerald-800 hover:text-emerald-900 border-slate-200 gap-1",
                    })}
                  >
                    Chuyên trang Tin tức <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <NewsNewspaperFeed
                newsList={displayNews}
                onSelectNews={(item) => openNewsArticle(item)}
                onEditNews={isAdmin ? (item) => setNewsEditorState({ open: true, item }) : undefined}
                onDeleteNews={
                  isAdmin
                    ? (item) => setDeleteTarget({ kind: "news", id: item.id, title: item.title })
                    : undefined
                }
                showMasthead={false}
                compactHome={true}
                bannerNotice={landingConfig.bannerNotice}
                itemsPerPage={6}
              />
            </Card>

            {/* Lịch Sự kiện Cộng đồng sắp tới (3 thẻ tiêu biểu) */}
            <Card className="bg-white rounded-2xl border-slate-200/90 p-5 sm:p-7 shadow-2xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-gov-blue shrink-0">
                    <Calendar size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Sự kiện &amp; Sinh hoạt Cộng đồng
                    </h2>
                    <p className="text-xs text-slate-500">
                      Lịch họp khu phố, tiêm chủng mở rộng và phong trào thi đua
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
                      className="font-bold"
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
                {events.slice(0, 3).map((ev) => (
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
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug hover:text-gov-blue transition-colors">
                        {ev.title}
                      </h3>
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
          </div>
        ) : (
          /* CÁC CHUYÊN TRANG CON */
          <div className="pb-16 min-h-[60vh]">
            {activeRoute === "about" && <CitizenAboutKP3Section landingConfig={landingConfig} />}

            {activeRoute === "services" && (
              <div className="pt-6">
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

            {(activeRoute === "news" || activeRoute === "notices") && (
              <CitizenNewsSection
                displayNews={displayNews}
                upcomingEvents={upcomingEvents}
                initialCategory={activeRoute === "notices" ? "Thông báo khẩn" : "Tất cả"}
                setNewsDetail={setNewsDetail}
                onSelectEvent={(ev) => setEventDetail(ev)}
                onNavigateToTab={onNavigateToTab}
                isAdmin={isAdmin}
                onAddNews={() => setNewsEditorState({ open: true, item: null })}
                onEditNews={(item) => setNewsEditorState({ open: true, item })}
                onDeleteNews={(item) =>
                  setDeleteTarget({ kind: "news", id: item.id, title: item.title })
                }
                onRefreshNews={onRefreshNews}
              />
            )}

            {activeRoute === "leadership" && (
              <CitizenLeadershipSection landingConfig={landingConfig} />
            )}

            {activeRoute === "schedule" && (
              <CitizenScheduleSection
                upcomingEvents={upcomingEvents}
                publicSchedules={effectivePublicSchedules}
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

      {/* 3. Footer */}
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
      <PublicHostelCheckinModal />
    </div>
  );
}
