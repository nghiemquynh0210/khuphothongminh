import React, { useState } from "react";
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Award,
  BookOpen,
  Newspaper,
  Megaphone,
  MessageCircle,
  User,
  Tag,
  Search,
  BellRing,
  X,
  Share2,
  Printer,
  Download,
  FileText,
  Eye,
  Flame,
  Paperclip,
  ExternalLink,
  Bookmark,
  Pin,
  Layers,
  LayoutGrid,
  List,
  Check,
  Copy,
  ChevronRight,
  Image as ImageIcon,
  Edit3,
  Trash2,
  RotateCcw
} from "lucide-react";
import { CommunityEvent, LocalNews } from "../types";
import Pagination from "./Pagination";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { formatVNNumber } from "../utils/numberFormat";
import { loadPortalSetting, savePortalSetting } from "../utils/supabaseSync";
import { initialNewsList } from "../mockData";
import {
  COVER_PRESETS,
  doesEventMatchVenue,
  findVenueScheduleConflicts,
  getCategoryTheme,
  getNewsImage,
  getNewsReadTime,
  getNewsSummary,
  getNewsViews,
  normalizeNewsItem,
} from "./news/newsHelpers";
import { NewsNewspaperFeed } from "./news/NewsNewspaperFeed";
import ZaloArticleSyncModal from "./news/ZaloArticleSyncModal";
import {
  ROUTES,
  getEventCreatePath,
  getEventDetailPath,
  getEventEditPath,
  getNewsCreatePath,
  getNewsDetailPath,
  getNewsEditPath,
  navigate,
} from "../routes";

const EVENT_RSVP_KEY = "kp3_event_rsvp_v1";
export const CULTURAL_VENUES = [
  "Nhà Văn hóa Khu phố 3 (Hội trường 80 chỗ)",
  "Phòng Sinh hoạt Chi bộ KP3 (30 chỗ)",
  "Sân Nhà Văn hóa Khu phố 3 (120 chỗ)",
  "Điểm sinh hoạt cụm dân cư KP3"
];

export interface CommunityEventsProps {
  events: CommunityEvent[];
  onAddEvent: (newEvent: CommunityEvent) => void;
  onUpdateEventStatus: (id: string, status: CommunityEvent["status"]) => void;
  onUpdateEvent?: (updatedEvent: CommunityEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  newsList?: LocalNews[];
  onAddNews?: (newNews: LocalNews) => void;
  onUpdateNews?: (updatedNews: LocalNews) => void;
  onDeleteNews?: (newsId: string) => void;
  basePath?: string;
  onOpenCreateNews?: () => void;
  onOpenEditNews?: (news: LocalNews) => void;
  onOpenDetailNews?: (news: LocalNews) => void;
  onOpenCreateEvent?: (venueName?: string) => void;
  onOpenEditEvent?: (event: CommunityEvent) => void;
  onOpenDetailEvent?: (event: CommunityEvent) => void;
  activeSubTab?: "news" | "events";
  onActiveSubTabChange?: (tab: "news" | "events") => void;
  onRefreshNews?: () => void;
}

export default function CommunityEvents({ 
  events, 
  onAddEvent, 
  onUpdateEventStatus,
  onUpdateEvent,
  onDeleteEvent,
  newsList: propNewsList,
  onAddNews,
  onUpdateNews,
  onDeleteNews,
  onRefreshNews,
  basePath = ROUTES.DASHBOARD_CULTURAL,
  onOpenCreateNews,
  onOpenEditNews,
  onOpenDetailNews,
  onOpenCreateEvent,
  onOpenEditEvent,
  onOpenDetailEvent,
  activeSubTab: activeSubTabProp,
  onActiveSubTabChange,
}: CommunityEventsProps) {
  const [internalSubTab, setInternalSubTab] = useState<"news" | "events">("news");
  const activeSubTab = activeSubTabProp ?? internalSubTab;
  const setActiveSubTab = (tab: "news" | "events") => {
    setInternalSubTab(tab);
    onActiveSubTabChange?.(tab);
  };
  const [currentEventsPage, setCurrentEventsPage] = useState(1);
  const eventsPerPage = 6;

  // States for News Board & Events
  const [newsList, setNewsList] = useState<LocalNews[]>(() =>
    (propNewsList || initialNewsList).map(normalizeNewsItem)
  );
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [showZaloSyncModal, setShowZaloSyncModal] = useState(false);
  const [confirmResetNews, setConfirmResetNews] = useState(false);
  const [deleteNewsTarget, setDeleteNewsTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<{ id: string; title: string } | null>(null);
  const [eventFilter, setEventFilter] = useState<"Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc">("Tất cả");
  const [eventSearchQuery, setEventSearchQuery] = useState("");

  // RSVP counter persisted locally & synced to Supabase portal_settings
  const [eventRsvpMap, setEventRsvpMap] = useState<Record<string, { registered: boolean; extraCount: number }>>(() => {
    try {
      const saved = localStorage.getItem(EVENT_RSVP_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  React.useEffect(() => {
    let active = true;
    loadPortalSetting<Record<string, { registered: boolean; extraCount: number }>>("event_rsvp_map").then((cloudMap) => {
      if (active && cloudMap && typeof cloudMap === "object") {
        setEventRsvpMap(cloudMap);
        try {
          localStorage.setItem(EVENT_RSVP_KEY, JSON.stringify(cloudMap));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleRsvp = (evId: string, evTitle: string) => {
    const current = eventRsvpMap[evId] || { registered: false, extraCount: 0 };
    const nextRegistered = !current.registered;
    const nextMap = {
      ...eventRsvpMap,
      [evId]: {
        registered: nextRegistered,
        extraCount: Math.max(0, current.extraCount + (nextRegistered ? 1 : -1))
      }
    };
    setEventRsvpMap(nextMap);
    try {
      localStorage.setItem(EVENT_RSVP_KEY, JSON.stringify(nextMap));
    } catch {}
    savePortalSetting("event_rsvp_map", nextMap, true);
    setNotice({
      message: nextRegistered
        ? `Đã xác nhận đăng ký tham dự sự kiện "${evTitle}" (đã đồng bộ Cloud).`
        : `Đã hủy đăng ký tham dự sự kiện "${evTitle}".`,
      type: nextRegistered ? "success" : "info"
    });
  };

  // Sync internal state when propNewsList changes
  React.useEffect(() => {
    if (propNewsList && propNewsList.length > 0) {
      setNewsList(propNewsList.map(normalizeNewsItem));
    }
  }, [propNewsList]);

  const handleEventFilterChange = (val: "Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc") => {
    setEventFilter(val);
    setCurrentEventsPage(1);
  };

  const handleSelectNews = (news: LocalNews) => {
    if (onOpenDetailNews) {
      onOpenDetailNews(news);
    } else {
      navigate(getNewsDetailPath(news.id, basePath));
    }
  };

  const handleEditNews = (news: LocalNews) => {
    if (onOpenEditNews) {
      onOpenEditNews(news);
    } else {
      navigate(getNewsEditPath(news.id, basePath));
    }
  };

  const handleCreateNews = () => {
    if (onOpenCreateNews) {
      onOpenCreateNews();
    } else {
      navigate(getNewsCreatePath(basePath));
    }
  };

  const handleSelectEvent = (ev: CommunityEvent) => {
    if (onOpenDetailEvent) {
      onOpenDetailEvent(ev);
    } else {
      navigate(getEventDetailPath(ev.id, basePath));
    }
  };

  const handleEditEvent = (ev: CommunityEvent) => {
    if (onOpenEditEvent) {
      onOpenEditEvent(ev);
    } else {
      navigate(getEventEditPath(ev.id, basePath));
    }
  };

  const handleCreateEvent = (venueName?: string) => {
    try {
      if (venueName && venueName.trim()) {
        sessionStorage.setItem("kp3_preselected_venue", venueName.trim());
      } else {
        sessionStorage.removeItem("kp3_preselected_venue");
      }
    } catch {}

    if (onOpenCreateEvent) {
      onOpenCreateEvent(venueName);
    } else {
      navigate(getEventCreatePath(basePath));
    }
  };

  const handleDeleteNewsItem = (id: string, title: string) => {
    setDeleteNewsTarget({ id, title });
  };

  const executeDeleteNewsItem = () => {
    if (!deleteNewsTarget) return;
    if (onDeleteNews) {
      onDeleteNews(deleteNewsTarget.id);
    }
    setNewsList(prev => prev.filter(n => n.id !== deleteNewsTarget.id));
    setNotice({ message: `Đã xóa bản tin "${deleteNewsTarget.title}".`, type: "info" });
    setDeleteNewsTarget(null);
  };

  const executeDeleteEventItem = () => {
    if (!deleteEventTarget) return;
    if (onDeleteEvent) {
      onDeleteEvent(deleteEventTarget.id);
    }
    setNotice({ message: `Đã xóa sự kiện "${deleteEventTarget.title}".`, type: "info" });
    setDeleteEventTarget(null);
  };

  const handleResetToSampleNews = () => {
    setConfirmResetNews(true);
  };

  const executeResetToSampleNews = () => {
    const normalizedSample = initialNewsList.map(normalizeNewsItem);
    setNewsList(normalizedSample);
    try {
      localStorage.setItem("kp3_local_news", JSON.stringify(normalizedSample));
    } catch {}
    setConfirmResetNews(false);
    setNotice({ message: "Đã đồng bộ lại danh sách bản tin mẫu đầy đủ hình ảnh minh họa.", type: "success" });
  };

  // Filter Logic
  const qEvent = eventSearchQuery.trim().toLowerCase();
  const filteredEvents = events.filter(ev => {
    const matchStatus = eventFilter === "Tất cả" || ev.status === eventFilter;
    if (!matchStatus) return false;
    if (!qEvent) return true;
    return (
      ev.id.toLowerCase().includes(qEvent) ||
      ev.title.toLowerCase().includes(qEvent) ||
      ev.location.toLowerCase().includes(qEvent) ||
      ev.organizer.toLowerCase().includes(qEvent) ||
      ev.description.toLowerCase().includes(qEvent)
    );
  });

  const activeNewsList = (propNewsList && propNewsList.length > 0 ? propNewsList : newsList).map(normalizeNewsItem);

  // Pagination for Events
  const totalEventsItems = filteredEvents.length;
  const totalEventsPages = Math.ceil(totalEventsItems / eventsPerPage) || 1;
  const activeEventsPage = currentEventsPage > totalEventsPages ? totalEventsPages : currentEventsPage;
  const startEventsIndex = (activeEventsPage - 1) * eventsPerPage;
  const paginatedEvents = filteredEvents.slice(startEventsIndex, startEventsIndex + eventsPerPage);

  return (
    <div id="news-and-events-view" className="space-y-4">
      {/* Minimalist Header */}
      <PageHeader
        title="Tin tức & Sự kiện Khu phố"
        actions={
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            {activeSubTab === "news" ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowZaloSyncModal(true)}
                  title="Đồng bộ bài viết từ Zalo OA Ban Điều Hành KP3"
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <MessageCircle size={13} className="text-blue-600" /> Đồng bộ Zalo OA
                </button>
                <button
                  type="button"
                  onClick={handleResetToSampleNews}
                  title="Đồng bộ danh sách bản tin mẫu"
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <RotateCcw size={13} /> Dữ liệu mẫu
                </button>
                <button
                  type="button"
                  onClick={handleCreateNews}
                  className="h-9 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus size={14} /> Đăng bản tin
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCreateEvent()}
                className="h-9 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Đặt lịch hội trường
              </button>
            )}
          </div>
        }
      />

      {notice && (
        <InlineNotice
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Stats Counter Cards - Standardized StatCard Component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <StatCard
          label="Tổng bản tin & thông báo"
          value={activeNewsList.length}
          badge="bản tin"
          highlighted={activeSubTab === "news"}
          icon={Newspaper}
          color="slate"
          onClick={() => setActiveSubTab("news")}
        />
        <StatCard
          label="Thông báo khẩn cấp"
          value={activeNewsList.filter(n => n.category === "Thông báo khẩn").length}
          badge="tin khẩn"
          icon={AlertTriangle}
          color="rose"
          onClick={() => setActiveSubTab("news")}
        />
        <StatCard
          label="Lịch sự kiện & sinh hoạt"
          value={events.length}
          badge="sự kiện"
          highlighted={activeSubTab === "events"}
          icon={CalendarDays}
          color="emerald"
          onClick={() => setActiveSubTab("events")}
        />
        <StatCard
          label="Dự kiến công dân tham gia"
          value={formatVNNumber(events.reduce((s, e) => s + (e.expectedAttendees || 0), 0))}
          badge="lượt người"
          icon={Users}
          color="slate"
          onClick={() => setActiveSubTab("events")}
        />
      </div>

      {/* Compact Segmented Sub-Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 w-fit max-w-full evon-scroll">
        <button
          type="button"
          onClick={() => setActiveSubTab("news")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeSubTab === "news"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Newspaper size={13} className={activeSubTab === "news" ? "text-emerald-700" : "text-slate-500"} />
          <span>Bản tin &amp; Báo điện tử Khu phố</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("events")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeSubTab === "events"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarDays size={13} className={activeSubTab === "events" ? "text-emerald-700" : "text-slate-500"} />
          <span>Lịch sinh hoạt &amp; Hội trường Nhà Văn hóa</span>
        </button>
      </div>

      {/* ========================================================
          RENDER TAB 1: NEWS & ANNOUNCEMENTS (BẢN TIN SỐ SỐNG ĐỘNG)
          ======================================================== */}
      {activeSubTab === "news" && (
        <NewsNewspaperFeed
          newsList={activeNewsList}
          onSelectNews={handleSelectNews}
          onEditNews={handleEditNews}
          onDeleteNews={(item) => handleDeleteNewsItem(item.id, item.title)}
          onRefreshNews={onRefreshNews}
          showMasthead={false}
          itemsPerPage={6}
        />
      )}

      {/* ========================================================
          RENDER TAB 2: EVENTS CALENDAR (LỊCH SINH HOẠT & SỰ KIỆN)
          ======================================================== */}
      {activeSubTab === "events" && (
        <div className="space-y-4">
          {/* Cultural Hall Venue Schedule Strip (Lịch đặt chỗ Nhà Văn hóa KP3) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                  <MapPin size={13} />
                </span>
                Lịch sử dụng &amp; Đặt phòng Nhà Văn hóa Khu phố 3
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi tình trạng đăng ký hội trường và chọn phòng để lên lịch mới nhanh chóng
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {CULTURAL_VENUES.map((venue) => {
                const bookedEvents = events.filter(
                  (e) =>
                    e.status !== "Đã kết thúc" &&
                    e.status !== "Đã hủy" &&
                    doesEventMatchVenue(e.location, venue)
                );
                const hasDoubleBooking = bookedEvents.some((ev) =>
                  findVenueScheduleConflicts(venue, ev.dateTime, bookedEvents, ev.id).length > 0
                );
                return (
                  <div
                    key={venue}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                      hasDoubleBooking
                        ? "border-amber-300 bg-amber-50/70"
                        : "border-slate-200/90 bg-slate-50/60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-900 leading-snug block">{venue}</span>
                        {hasDoubleBooking && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0 whitespace-nowrap">
                            Trùng lịch
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {bookedEvents.length > 0
                          ? `${bookedEvents.length} lịch sắp tới: ${bookedEvents[0].dateTime}`
                          : "Trống lịch — Sẵn sàng đặt chỗ"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateEvent(venue)}
                      className="w-full h-8 px-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      + Đặt phòng này
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Filters & Quick Search */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["Tất cả", "Sắp diễn ra", "Đang diễn ra", "Đã kết thúc"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleEventFilterChange(tab)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    eventFilter === tab
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={eventSearchQuery}
                onChange={(e) => {
                  setEventSearchQuery(e.target.value);
                  setCurrentEventsPage(1);
                }}
                placeholder="Tìm sự kiện, địa điểm, đơn vị..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Event Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-600">
                Không tìm thấy sự kiện hay hoạt động đoàn thể nào tương ứng bộ lọc.
              </div>
            ) : (
              paginatedEvents.map((ev) => {
                const statusConfigs = {
                  "Sắp diễn ra": { text: "Sắp diễn ra", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
                  "Đang diễn ra": { text: "Đang diễn ra", color: "bg-amber-50 text-amber-800 border-amber-200", icon: Sparkles },
                  "Đã kết thúc": { text: "Đã hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
                  "Đã hủy": { text: "Đã hủy", color: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle }
                };

                const conf = statusConfigs[ev.status];
                const StatusIcon = conf.icon;
                const eventImg = (ev.imageUrl && !ev.imageUrl.includes("1555696958"))
                  ? ev.imageUrl
                  : (ev.id === "EV001" ? COVER_PRESETS[6].url : ev.id === "EV002" ? COVER_PRESETS[4].url : COVER_PRESETS[5].url);
                const rsvpInfo = eventRsvpMap[ev.id] || { registered: false, extraCount: 0 };
                const totalAttendees = (ev.expectedAttendees || 0) + (rsvpInfo.extraCount || 0);

                return (
                  <div
                    key={ev.id}
                    id={`event-card-${ev.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Xem chi tiết sự kiện ${ev.title}`}
                    onClick={() => handleSelectEvent(ev)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectEvent(ev);
                      }
                    }}
                    className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <div>
                      {/* Event Cover Image */}
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                        <img
                          src={eventImg}
                          alt={ev.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border bg-white/95 flex items-center gap-1 ${conf.color}`}>
                            <StatusIcon size={11} /> {conf.text}
                          </span>
                        </div>
                        <span className="absolute bottom-2 right-2 text-[11px] text-slate-900 font-mono font-bold bg-white/95 border border-slate-200 px-2 py-0.5 rounded-md">
                          {ev.id}
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <h3 className="text-left font-bold text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                          {ev.title}
                        </h3>
                        <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                          {ev.description}
                        </p>

                        <div className="space-y-1.5 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <CalendarDays size={13} className="text-emerald-700 shrink-0" />
                            <span className="font-semibold font-mono text-xs">{ev.dateTime}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin size={13} className="text-rose-600 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 gap-2 min-w-0">
                            <span className="text-xs font-medium truncate min-w-0 flex-1 text-slate-600" title={ev.organizer}>
                              Tổ chức: {ev.organizer}
                            </span>
                            <span className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap">
                              <Users size={11} /> {totalAttendees} người
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operations & RSVP */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-1.5"
                    >
                      {ev.status !== "Đã kết thúc" && ev.status !== "Đã hủy" && (
                        <button
                          type="button"
                          onClick={() => handleToggleRsvp(ev.id, ev.title)}
                          className={`w-full h-8 text-xs font-semibold px-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            rsvpInfo.registered
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-white hover:bg-emerald-50 border-slate-200 text-emerald-800"
                          }`}
                        >
                          <CheckCircle2 size={12} />
                          {rsvpInfo.registered ? "Đã đăng ký tham dự (Bấm để hủy)" : "Đăng ký tham dự (RSVP)"}
                        </button>
                      )}
                      <div className="flex gap-2">
                        {ev.status === "Sắp diễn ra" && (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateEventStatus(ev.id, "Đang diễn ra")}
                              className="flex-1 text-xs font-bold py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Bắt đầu ngay
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateEventStatus(ev.id, "Đã kết thúc")}
                              className="flex-1 text-xs font-bold py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Hoàn tất sớm
                            </button>
                          </>
                        )}
                        {ev.status === "Đang diễn ra" && (
                          <button
                            type="button"
                            onClick={() => onUpdateEventStatus(ev.id, "Đã kết thúc")}
                            className="w-full text-xs font-bold py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Xác nhận Đã tổ chức xong
                          </button>
                        )}
                        {ev.status === "Đã kết thúc" && (
                          <div className="w-full text-xs text-slate-600 text-center font-semibold py-1">
                            ✓ Đã lưu trữ hồ sơ hoạt động
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleSelectEvent(ev)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} /> Chi tiết
                        </button>
                        <div className="flex items-center gap-1">
                          {onUpdateEvent && (
                            <button
                              type="button"
                              onClick={() => handleEditEvent(ev)}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
                              title="Chỉnh sửa sự kiện"
                              aria-label={`Chỉnh sửa sự kiện ${ev.title}`}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {onDeleteEvent && (
                            <button
                              type="button"
                              onClick={() => setDeleteEventTarget({ id: ev.id, title: ev.title })}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg cursor-pointer"
                              title="Xóa sự kiện"
                              aria-label={`Xóa sự kiện ${ev.title}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Pagination
            id="events-pagination"
            currentPage={activeEventsPage}
            totalItems={totalEventsItems}
            itemsPerPage={eventsPerPage}
            onPageChange={setCurrentEventsPage}
          />
        </div>
      )}

      {/* Chi tiết và biểu mẫu Bản tin / Sự kiện đã được chuyển sang các trang chuyên dụng: NewsDetailPage, NewsFormPage, EventDetailPage, EventFormPage */}

      <ConfirmModal
        isOpen={Boolean(deleteEventTarget)}
        onClose={() => setDeleteEventTarget(null)}
        onConfirm={executeDeleteEventItem}
        title="Xác nhận xóa sự kiện"
        description={`Bạn có chắc chắn muốn xóa sự kiện "${deleteEventTarget?.title || ""}" khỏi lịch sinh hoạt Khu phố 3?`}
        confirmLabel="Xóa sự kiện"
        variant="danger"
      />

      <ConfirmModal
        isOpen={Boolean(deleteNewsTarget)}
        onClose={() => setDeleteNewsTarget(null)}
        onConfirm={executeDeleteNewsItem}
        title="Xác nhận xóa bản tin"
        description={`Bạn có chắc chắn muốn xóa bài viết "${deleteNewsTarget?.title || ""}" khỏi hệ thống thông báo Khu phố 3?`}
        confirmLabel="Xóa bản tin"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmResetNews}
        onClose={() => setConfirmResetNews(false)}
        onConfirm={executeResetToSampleNews}
        title="Khôi phục bản tin mẫu"
        description="Khôi phục danh sách 6 bản tin mẫu kèm hình ảnh minh họa và công văn đính kèm cho Khu phố 3?"
        confirmLabel="Đồng bộ lại"
        variant="warning"
      />

      <ZaloArticleSyncModal
        isOpen={showZaloSyncModal}
        onClose={() => setShowZaloSyncModal(false)}
        onSyncSuccess={onRefreshNews}
      />

    </div>
  );
}
