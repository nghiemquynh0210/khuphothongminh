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
import { initialNewsList } from "../mockData";
import {
  COVER_PRESETS,
  getCategoryTheme,
  getNewsImage,
  getNewsReadTime,
  getNewsSummary,
  getNewsViews,
} from "./news/newsHelpers";
import { NewsNewspaperFeed } from "./news/NewsNewspaperFeed";
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
  onOpenCreateEvent?: () => void;
  onOpenEditEvent?: (event: CommunityEvent) => void;
  onOpenDetailEvent?: (event: CommunityEvent) => void;
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
  basePath = ROUTES.DASHBOARD_CULTURAL,
  onOpenCreateNews,
  onOpenEditNews,
  onOpenDetailNews,
  onOpenCreateEvent,
  onOpenEditEvent,
  onOpenDetailEvent,
}: CommunityEventsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"news" | "events">("news");
  const [currentEventsPage, setCurrentEventsPage] = useState(1);
  const eventsPerPage = 6;

  // States for News Board & Events
  const [newsList, setNewsList] = useState<LocalNews[]>(propNewsList || initialNewsList);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmResetNews, setConfirmResetNews] = useState(false);
  const [deleteNewsTarget, setDeleteNewsTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<{ id: string; title: string } | null>(null);
  const [eventFilter, setEventFilter] = useState<"Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc">("Tất cả");

  // RSVP counter persisted locally per event id
  const [eventRsvpMap, setEventRsvpMap] = useState<Record<string, { registered: boolean; extraCount: number }>>(() => {
    try {
      const saved = localStorage.getItem(EVENT_RSVP_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

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
    setNotice({
      message: nextRegistered
        ? `Đã xác nhận đăng ký tham dự sự kiện "${evTitle}".`
        : `Đã hủy đăng ký tham dự sự kiện "${evTitle}".`,
      type: nextRegistered ? "success" : "info"
    });
  };

  // Sync internal state when propNewsList changes
  React.useEffect(() => {
    if (propNewsList && propNewsList.length > 0) {
      setNewsList(propNewsList);
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

  const handleCreateEvent = (venue?: string) => {
    if (onOpenCreateEvent) {
      onOpenCreateEvent();
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
    setNewsList(initialNewsList);
    try {
      localStorage.setItem("kp3_local_news", JSON.stringify(initialNewsList));
    } catch {}
    setConfirmResetNews(false);
    setNotice({ message: "Đã đồng bộ lại danh sách bản tin mẫu đầy đủ hình ảnh minh họa.", type: "success" });
  };

  // Filter Logic
  const filteredEvents = events.filter(ev => {
    if (eventFilter === "Tất cả") return true;
    return ev.status === eventFilter;
  });

  const activeNewsList = propNewsList && propNewsList.length > 0 ? propNewsList : newsList;

  // Pagination for Events
  const totalEventsItems = filteredEvents.length;
  const totalEventsPages = Math.ceil(totalEventsItems / eventsPerPage) || 1;
  const activeEventsPage = currentEventsPage > totalEventsPages ? totalEventsPages : currentEventsPage;
  const startEventsIndex = (activeEventsPage - 1) * eventsPerPage;
  const paginatedEvents = filteredEvents.slice(startEventsIndex, startEventsIndex + eventsPerPage);

  return (
    <div id="news-and-events-view" className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Executive Master Header */}
      <PageHeader
        badgeIcon={<Megaphone size={14} className="text-emerald-600" />}
        badgeText="TRUYỀN THÔNG & BÁO CHÍ CỘNG ĐỒNG • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="CỔNG THÔNG TIN SỐ"
        title="Kênh Tin Tức & Quản Lý Sự Kiện Khu Phố"
        actions={
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {activeSubTab === "news" ? (
              <>
                <button
                  type="button"
                  onClick={handleResetToSampleNews}
                  title="Đồng bộ danh sách bản tin mẫu có đầy đủ hình ảnh sinh động"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <RotateCcw size={13} /> Dữ liệu mẫu
                </button>
                <button
                  type="button"
                  onClick={handleCreateNews}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Đăng Bản Tin Mới
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCreateEvent()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Plus size={15} /> Đặt Lịch &amp; Mượn Hội Trường
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Tổng bản tin & thông báo"
          value={activeNewsList.length}
          badge="bản tin số"
          highlighted={true}
          icon={Newspaper}
          color="emerald"
          subtext="Thông báo hành chính, y tế & đời sống"
          subtextRight="Kênh tin tức"
        />
        <StatCard
          label="Thông báo khẩn cấp"
          value={activeNewsList.filter(n => n.category === "Thông báo khẩn").length}
          badge="ưu tiên cao"
          icon={AlertTriangle}
          color="rose"
          subtext="Cần cư dân theo dõi & phổ biến ngay"
          subtextRight="Còi báo động"
        />
        <StatCard
          label="Lịch sự kiện & sinh hoạt"
          value={events.length}
          badge="sự kiện"
          icon={CalendarDays}
          color="blue"
          subtext="Nhà văn hóa & Không gian cộng đồng"
          subtextRight="Kế hoạch năm"
        />
        <StatCard
          label="Dự kiến công dân tham gia"
          value={formatVNNumber(events.reduce((s, e) => s + (e.expectedAttendees || 0), 0))}
          badge="lượt người"
          icon={Users}
          color="purple"
          subtext="Quy mô sinh hoạt toàn khu phố"
          subtextRight="Cộng đồng KP3"
        />
      </div>

      {/* Switcher Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => setActiveSubTab("news")}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 cursor-pointer
            ${activeSubTab === "news" ? "text-emerald-700 font-bold" : "text-slate-600 hover:text-slate-900"}
          `}
        >
          <Newspaper size={18} /> Bản tin & Báo điện tử Khu phố
          {activeSubTab === "news" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("events")}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 cursor-pointer
            ${activeSubTab === "events" ? "text-emerald-700 font-bold" : "text-slate-600 hover:text-slate-900"}
          `}
        >
          <CalendarDays size={18} /> Lịch sinh hoạt & Hội trường Nhà Văn hóa
          {activeSubTab === "events" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
          )}
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
          showMasthead={false}
          itemsPerPage={6}
        />
      )}

      {/* ========================================================
          RENDER TAB 2: EVENTS CALENDAR (LỊCH SINH HOẠT & SỰ KIỆN)
          ======================================================== */}
      {activeSubTab === "events" && (
        <div className="space-y-6">
          
          {/* Quick Info Grid for Events */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 text-slate-900 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"><CalendarDays size={20} /></div>
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">Sử dụng trụ sở</span>
              </div>
              <div>
                <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider block">Phòng hội họp Nhà Văn hóa</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Trụ sở sinh hoạt Khu phố 3</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">Luôn mở cửa phục vụ các chi hội đoàn thể họp định kỳ và tổ chức sinh hoạt cộng đồng.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700"><Users size={22} /></div>
                <span className="text-xs text-emerald-600 font-extrabold font-mono bg-emerald-50 px-2.5 py-0.5 rounded">Tích cực</span>
              </div>
              <div>
                <span className="text-slate-600 text-xs font-bold uppercase tracking-wider block">Thống kê Sự kiện Năm nay</span>
                <h3 className="text-lg font-bold text-slate-800">{events.length} hoạt động phong trào</h3>
                <p className="text-xs text-slate-500 mt-1">Nỗ lực đạt 100% chỉ tiêu phong trào văn nghệ và phong trào dân vận khéo phường giao phó.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Award size={22} /></div>
                <span className="text-xs text-amber-600 font-extrabold bg-amber-50 px-2 py-0.5 rounded">Văn hóa</span>
              </div>
              <div>
                <span className="text-slate-600 text-xs font-bold uppercase tracking-wider block">Chuẩn mực lối sống</span>
                <h3 className="text-base font-bold text-slate-800">Gia đình Văn hóa xuất sắc</h3>
                <p className="text-xs text-slate-500 mt-1">Đạt tỷ lệ cao các hộ dân đăng ký thi đua lối sống văn minh đô thị.</p>
              </div>
            </div>
          </div>

          {/* Cultural Hall Venue Schedule Strip (Lịch đặt chỗ Nhà Văn hóa KP3) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={15} className="text-emerald-700" />
                Lịch sử dụng &amp; Đặt phòng Nhà Văn hóa Khu phố 3
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Theo dõi tình trạng đăng ký hội trường và chọn phòng để lên lịch mới nhanh chóng
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CULTURAL_VENUES.map((venue) => {
                const venueShort = venue.split("(")[0].trim();
                const bookedEvents = events.filter(
                  (e) =>
                    e.status !== "Đã kết thúc" &&
                    e.status !== "Đã hủy" &&
                    (e.location.toLowerCase().includes(venueShort.toLowerCase().slice(0, 12)) ||
                      (venue === CULTURAL_VENUES[0] && e.location.toLowerCase().includes("nhà văn hóa")))
                );
                return (
                  <div
                    key={venue}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 leading-snug block">{venue}</span>
                      <p className="text-xs text-slate-600 mt-1">
                        {bookedEvents.length > 0
                          ? `${bookedEvents.length} lịch sắp tới: ${bookedEvents[0].dateTime}`
                          : "Trống lịch — Sẵn sàng đặt chỗ"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateEvent(venue)}
                      className="w-full py-1.5 px-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      + Đặt phòng này
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Filters */}
          <div className="flex flex-wrap border-b border-slate-200 gap-4 sm:gap-6">
            {(["Tất cả", "Sắp diễn ra", "Đang diễn ra", "Đã kết thúc"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleEventFilterChange(tab)}
                className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer
                  ${eventFilter === tab ? "text-emerald-700 font-bold" : "text-slate-600 hover:text-slate-900"}
                `}
              >
                {tab}
                {eventFilter === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Event Cards Grid với Ảnh Minh Họa Sống Động */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-600">
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
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Event Cover Image */}
                      <div
                        className="relative aspect-video w-full overflow-hidden bg-slate-100 cursor-pointer"
                        onClick={() => handleSelectEvent(ev)}
                      >
                        <img
                          src={eventImg}
                          alt={ev.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border bg-white flex items-center gap-1 ${conf.color}`}>
                            <StatusIcon size={12} /> {conf.text}
                          </span>
                        </div>
                        <span className="absolute bottom-2 right-2 text-xs text-slate-900 font-mono font-bold bg-white/95 border border-slate-200 px-2 py-0.5 rounded-md">
                          {ev.id}
                        </span>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <button
                          type="button"
                          onClick={() => handleSelectEvent(ev)}
                          className="text-left font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          {ev.title}
                        </button>
                        <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                          {ev.description}
                        </p>

                        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-700">
                            <CalendarDays size={14} className="text-emerald-700 shrink-0" />
                            <span className="font-semibold font-mono text-xs">{ev.dateTime}</span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-700">
                            <MapPin size={14} className="text-rose-600 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 gap-2">
                            <span className="text-xs font-semibold truncate max-w-[160px] text-slate-700">
                              Tổ chức: {ev.organizer}
                            </span>
                            <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <Users size={12} /> {totalAttendees} người
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operations & RSVP */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
                      {ev.status !== "Đã kết thúc" && ev.status !== "Đã hủy" && (
                        <button
                          type="button"
                          onClick={() => handleToggleRsvp(ev.id, ev.title)}
                          className={`w-full text-xs font-bold py-1.5 px-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            rsvpInfo.registered
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-white hover:bg-emerald-50 border-slate-200 text-emerald-800"
                          }`}
                        >
                          <CheckCircle2 size={13} />
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

    </div>
  );
}
