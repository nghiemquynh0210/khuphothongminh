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
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { formatVNNumber } from "../utils/numberFormat";
import { formatShortRecordId } from "../utils/kp3Utils";
import { initialNewsList } from "../mockData";

const EVENT_RSVP_KEY = "kp3_event_rsvp_v1";
const CULTURAL_VENUES = [
  "Nhà Văn hóa Khu phố 3 (Hội trường 80 chỗ)",
  "Phòng Sinh hoạt Chi bộ KP3 (30 chỗ)",
  "Sân Nhà Văn hóa Khu phố 3 (120 chỗ)",
  "Điểm sinh hoạt Liên tổ 1–14"
];

interface CommunityEventsProps {
  events: CommunityEvent[];
  onAddEvent: (newEvent: CommunityEvent) => void;
  onUpdateEventStatus: (id: string, status: CommunityEvent["status"]) => void;
  onUpdateEvent?: (updatedEvent: CommunityEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  newsList?: LocalNews[];
  onAddNews?: (newNews: LocalNews) => void;
  onUpdateNews?: (updatedNews: LocalNews) => void;
  onDeleteNews?: (newsId: string) => void;
}

// 7 Preset chủ đề ảnh bìa minh họa chuẩn báo chí cộng đồng
const COVER_PRESETS = [
  {
    id: "med",
    label: "Y tế & Phòng dịch",
    category: "Thông báo khẩn",
    url: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=1200&auto=format&fit=crop&q=80",
    desc: "Phun thuốc diệt muỗi, phòng chống dịch sốt xuất huyết"
  },
  {
    id: "id_card",
    label: "Căn cước & VNeID",
    category: "Hành chính",
    url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80",
    desc: "Làm thẻ căn cước mới, chuyển đổi số & định danh VNeID"
  },
  {
    id: "meeting",
    label: "Tiếp dân & Họp Chi bộ",
    category: "Hành chính",
    url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80",
    desc: "Hội nghị đối thoại, tiếp công dân định kỳ tại Nhà văn hóa"
  },
  {
    id: "charity",
    label: "An sinh & Đền ơn đáp nghĩa",
    category: "An sinh xã hội",
    url: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&auto=format&fit=crop&q=80",
    desc: "Trao quà tình nghĩa, trợ cấp hộ nghèo & gia đình chính sách"
  },
  {
    id: "sport",
    label: "Thể thao & Hội thi hè",
    category: "Phong trào",
    url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&auto=format&fit=crop&q=80",
    desc: "Hội thao cộng đồng, tiếng hát thiếu nhi & sinh hoạt hè"
  },
  {
    id: "pccc",
    label: "Diễn tập PCCC hẻm",
    category: "Hành chính",
    url: "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=1200&auto=format&fit=crop&q=80",
    desc: "Tổ liên gia an toàn PCCC, tập huấn cứu nạn & bình bọt dập lửa"
  },
  {
    id: "green",
    label: "Chủ nhật Xanh & Môi trường",
    category: "Phong trào",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80",
    desc: "Ngày hội vệ sinh hẻm, dọn rác khai thông cống rãnh"
  }
];

export default function CommunityEvents({ 
  events, 
  onAddEvent, 
  onUpdateEventStatus,
  onUpdateEvent,
  onDeleteEvent,
  newsList: propNewsList,
  onAddNews,
  onUpdateNews,
  onDeleteNews
}: CommunityEventsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"news" | "events">("news");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Pagination states
  const [currentNewsPage, setCurrentNewsPage] = useState(1);
  const [currentEventsPage, setCurrentEventsPage] = useState(1);
  const newsPerPage = 6;
  const eventsPerPage = 6;

  // States for News Board
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingNews, setEditingNews] = useState<LocalNews | null>(null);
  const [selectedNewsForModal, setSelectedNewsForModal] = useState<LocalNews | null>(null);
  const [newsSearch, setNewsSearch] = useState("");
  const [newsFilter, setNewsFilter] = useState<string>("Tất cả");
  const [copiedLink, setCopiedLink] = useState(false);
  const [newsList, setNewsList] = useState<LocalNews[]>(propNewsList || initialNewsList);

  // States for new News Item
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsCategory, setNewNewsCategory] = useState<LocalNews["category"]>("Hành chính");
  const [newNewsSummary, setNewNewsSummary] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsAuthor, setNewNewsAuthor] = useState("Ban Điều hành Khu phố 3");
  const [newNewsImage, setNewNewsImage] = useState(COVER_PRESETS[1].url);
  const [newNewsFileName, setNewNewsFileName] = useState("");
  const [newNewsIsPinned, setNewNewsIsPinned] = useState(false);

  // Notice & Confirm states
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmResetNews, setConfirmResetNews] = useState(false);
  const [deleteNewsTarget, setDeleteNewsTarget] = useState<{ id: string; title: string } | null>(null);

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

  // States for Events Calendar
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CommunityEvent | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<{ id: string; title: string } | null>(null);
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("Ban Điều hành Khu phố 3");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState(CULTURAL_VENUES[0]);
  const [expectedAttendees, setExpectedAttendees] = useState(50);
  const [description, setDescription] = useState("");
  const [eventImage, setEventImage] = useState(COVER_PRESETS[6].url);
  const [eventFilter, setEventFilter] = useState<"Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc">("Tất cả");

  // Sync internal state when propNewsList changes
  React.useEffect(() => {
    if (propNewsList && propNewsList.length > 0) {
      setNewsList(propNewsList);
    }
  }, [propNewsList]);

  // Helpers to resolve data safely with fallbacks
  const getNewsImage = (news: LocalNews): string => {
    // If news has custom user-provided image that is not the old deprecated placeholder
    if (news.imageUrl && !news.imageUrl.includes("1450133064473") && !news.imageUrl.includes("554224155-8d04cb21cd6c")) {
      return news.imageUrl;
    }

    // Match smart contextual keywords in news title
    const t = (news.title || "").toLowerCase();
    if (t.includes("sốt xuất huyết") || t.includes("diệt muỗi") || t.includes("tiêm") || t.includes("y tế") || t.includes("khử khuẩn")) {
      return COVER_PRESETS[0].url; // Y tế phun thuốc
    }
    if (t.includes("căn cước") || t.includes("vneid") || t.includes("định danh")) {
      return COVER_PRESETS[1].url; // Căn cước VNeID
    }
    if (t.includes("tiếp công dân") || t.includes("tiếp dân") || t.includes("chi bộ") || t.includes("đối thoại") || t.includes("lịch tiếp")) {
      return COVER_PRESETS[2].url; // Tiếp dân & Họp Chi bộ
    }
    if (t.includes("nghèo") || t.includes("đền ơn") || t.includes("tình nghĩa") || t.includes("an sinh") || t.includes("cứu trợ") || t.includes("quỹ")) {
      return COVER_PRESETS[3].url; // An sinh & Quỹ vì người nghèo
    }
    if (t.includes("thể thao") || t.includes("tiếng hát") || t.includes("thiếu nhi") || t.includes("hè") || t.includes("văn nghệ")) {
      return COVER_PRESETS[4].url; // Thể thao & Hội thi hè
    }
    if (t.includes("chữa cháy") || t.includes("pccc") || t.includes("cứu nạn") || t.includes("bình gas") || t.includes("cháy")) {
      return COVER_PRESETS[5].url; // PCCC hẻm
    }
    if (t.includes("môi trường") || t.includes("chủ nhật xanh") || t.includes("rác") || t.includes("vệ sinh")) {
      return COVER_PRESETS[6].url; // Môi trường & Chủ nhật Xanh
    }

    if (news.imageUrl && !news.imageUrl.includes("1450133064473")) return news.imageUrl;
    if (news.image && !news.image.includes("1450133064473")) return news.image;

    // Fallback based on category
    switch (news.category) {
      case "Thông báo khẩn":
        return COVER_PRESETS[0].url;
      case "Hành chính":
        return COVER_PRESETS[1].url;
      case "Y tế & Đời sống":
        return COVER_PRESETS[0].url;
      case "An sinh xã hội":
        return COVER_PRESETS[3].url;
      case "Phong trào":
        return COVER_PRESETS[4].url;
      default:
        return COVER_PRESETS[2].url;
    }
  };

  const getNewsSummary = (news: LocalNews): string => {
    if (news.summary && news.summary.trim().length > 0) return news.summary;
    const cleanContent = news.content.replace(/\n+/g, " ");
    return cleanContent.length > 130 ? cleanContent.substring(0, 130) + "..." : cleanContent;
  };

  const getNewsReadTime = (news: LocalNews): string => {
    if (news.readTime) return news.readTime;
    const wordCount = news.content.split(/\s+/).length;
    return `${Math.max(2, Math.ceil(wordCount / 50))} phút đọc`;
  };

  const getNewsViews = (news: LocalNews): number => {
    if (news.views) return news.views;
    const charCodeSum = news.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 100);
    return (charCodeSum * 3) % 400 + 180;
  };

  const getCategoryTheme = (category: LocalNews["category"]) => {
    switch (category) {
      case "Thông báo khẩn":
        return {
          pill: "bg-rose-50 text-rose-700 border-rose-200",
          solid: "bg-rose-600 text-white",
          dot: "bg-rose-500",
          ring: "ring-rose-500/20",
          border: "border-rose-200",
          icon: AlertTriangle
        };
      case "Hành chính":
        return {
          pill: "bg-blue-50 text-blue-700 border-blue-200",
          solid: "bg-blue-600 text-white",
          dot: "bg-blue-500",
          ring: "ring-blue-500/20",
          border: "border-blue-200",
          icon: BookOpen
        };
      case "Y tế & Đời sống":
        return {
          pill: "bg-teal-50 text-teal-700 border-teal-200",
          solid: "bg-teal-600 text-white",
          dot: "bg-teal-500",
          ring: "ring-teal-500/20",
          border: "border-teal-200",
          icon: Sparkles
        };
      case "An sinh xã hội":
        return {
          pill: "bg-pink-50 text-pink-700 border-pink-200",
          solid: "bg-pink-600 text-white",
          dot: "bg-pink-500",
          ring: "ring-pink-500/20",
          border: "border-pink-200",
          icon: Award
        };
      case "Phong trào":
        return {
          pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
          solid: "bg-emerald-600 text-white",
          dot: "bg-emerald-500",
          ring: "ring-emerald-500/20",
          border: "border-emerald-200",
          icon: Users
        };
      default:
        return {
          pill: "bg-slate-50 text-slate-700 border-slate-200",
          solid: "bg-slate-700 text-white",
          dot: "bg-slate-500",
          ring: "ring-slate-500/20",
          border: "border-slate-200",
          icon: Newspaper
        };
    }
  };

  const handleNewsSearchChange = (val: string) => {
    setNewsSearch(val);
    setCurrentNewsPage(1);
  };

  const handleNewsFilterChange = (val: string) => {
    setNewsFilter(val);
    setCurrentNewsPage(1);
  };

  const handleEventFilterChange = (val: "Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc") => {
    setEventFilter(val);
    setCurrentEventsPage(1);
  };

  // Create or Update News
  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsContent.trim()) {
      setNotice({ message: "Vui lòng điền đầy đủ tiêu đề và nội dung bài viết!", type: "error" });
      return;
    }

    const todayStr = new Date().toLocaleDateString("vi-VN");
    const activeList = propNewsList || newsList;

    if (editingNews) {
      // Update existing
      const updated: LocalNews = {
        ...editingNews,
        title: newNewsTitle,
        category: newNewsCategory,
        summary: newNewsSummary,
        content: newNewsContent,
        author: newNewsAuthor,
        imageUrl: newNewsImage,
        image: newNewsImage,
        isPinned: newNewsIsPinned,
        attachedFile: newNewsFileName ? { name: newNewsFileName, size: "1.2 MB" } : editingNews.attachedFile
      };

      if (onUpdateNews) {
        onUpdateNews(updated);
      }
      setNewsList(prev => prev.map(n => n.id === updated.id ? updated : n));
      setEditingNews(null);
      setNotice({ message: `Đã cập nhật bài viết "${updated.title}".`, type: "success" });
    } else {
      // Create new
      const newNews: LocalNews = {
        id: "NEWS" + (activeList.length + 1).toString().padStart(3, "0"),
        title: newNewsTitle,
        category: newNewsCategory,
        date: todayStr,
        author: newNewsAuthor,
        summary: newNewsSummary,
        content: newNewsContent,
        isPinned: newNewsIsPinned,
        imageUrl: newNewsImage,
        image: newNewsImage,
        readTime: "3 phút đọc",
        views: 1,
        attachedFile: newNewsFileName ? { name: newNewsFileName, size: "1.2 MB" } : undefined
      };

      if (onAddNews) {
        onAddNews(newNews);
      }
      setNewsList([newNews, ...newsList]);
      setNotice({ message: `Đã phát hành bản tin "${newNews.title}".`, type: "success" });
    }

    setShowNewsModal(false);
    resetNewsForm();
  };

  const resetNewsForm = () => {
    setNewNewsTitle("");
    setNewNewsCategory("Hành chính");
    setNewNewsSummary("");
    setNewNewsContent("");
    setNewNewsAuthor("Ban Điều hành Khu phố 3");
    setNewNewsImage(COVER_PRESETS[1].url);
    setNewNewsFileName("");
    setNewNewsIsPinned(false);
    setEditingNews(null);
  };

  const handleOpenEditNews = (news: LocalNews) => {
    setEditingNews(news);
    setNewNewsTitle(news.title);
    setNewNewsCategory(news.category);
    setNewNewsSummary(news.summary || "");
    setNewNewsContent(news.content);
    setNewNewsAuthor(news.author);
    setNewNewsImage(getNewsImage(news));
    setNewNewsFileName(news.attachedFile?.name || "");
    setNewNewsIsPinned(Boolean(news.isPinned));
    setShowNewsModal(true);
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
    if (selectedNewsForModal?.id === deleteNewsTarget.id) {
      setSelectedNewsForModal(null);
    }
    setNotice({ message: `Đã xóa bản tin "${deleteNewsTarget.title}".`, type: "info" });
    setDeleteNewsTarget(null);
  };

  const handleTogglePin = (news: LocalNews) => {
    const updated = { ...news, isPinned: !news.isPinned };
    if (onUpdateNews) {
      onUpdateNews(updated);
    }
    setNewsList(prev => prev.map(n => n.id === updated.id ? updated : n));
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

  const handleCopyShareLink = (news: LocalNews) => {
    const shareUrl = `${window.location.origin}/dashboard/events?news=${news.id}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const resetEventForm = () => {
    setEditingEvent(null);
    setTitle("");
    setOrganizer("Ban Điều hành Khu phố 3");
    setDateTime("");
    setLocation(CULTURAL_VENUES[0]);
    setExpectedAttendees(50);
    setDescription("");
    setEventImage(COVER_PRESETS[6].url);
  };

  const handleOpenEditEvent = (ev: CommunityEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setOrganizer(ev.organizer);
    setDateTime(ev.dateTime);
    setLocation(ev.location);
    setExpectedAttendees(ev.expectedAttendees || 50);
    setDescription(ev.description);
    setEventImage(ev.imageUrl || COVER_PRESETS[6].url);
    setShowEventModal(true);
  };

  const executeDeleteEventItem = () => {
    if (!deleteEventTarget) return;
    if (onDeleteEvent) {
      onDeleteEvent(deleteEventTarget.id);
    }
    if (selectedEventForModal?.id === deleteEventTarget.id) {
      setSelectedEventForModal(null);
    }
    setNotice({ message: `Đã xóa sự kiện "${deleteEventTarget.title}".`, type: "info" });
    setDeleteEventTarget(null);
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime.trim() || !description.trim()) {
      setNotice({ message: "Vui lòng điền đầy đủ tên sự kiện, thời gian và nội dung chương trình!", type: "error" });
      return;
    }

    if (editingEvent) {
      const updatedEvent: CommunityEvent = {
        ...editingEvent,
        title: title.trim(),
        organizer: organizer.trim() || "Ban Điều hành Khu phố 3",
        dateTime: dateTime.trim(),
        location,
        expectedAttendees: Number(expectedAttendees) || 50,
        description: description.trim(),
        imageUrl: eventImage
      };
      if (onUpdateEvent) {
        onUpdateEvent(updatedEvent);
      }
      if (selectedEventForModal?.id === updatedEvent.id) {
        setSelectedEventForModal(updatedEvent);
      }
      setShowEventModal(false);
      resetEventForm();
      setNotice({ message: `Đã cập nhật sự kiện "${updatedEvent.title}".`, type: "success" });
      return;
    }

    const newEvent: CommunityEvent = {
      id: "EV" + (events.length + 1).toString().padStart(3, "0"),
      title: title.trim(),
      organizer: organizer.trim() || "Ban Điều hành Khu phố 3",
      dateTime: dateTime.trim(),
      location,
      status: "Sắp diễn ra",
      expectedAttendees: Number(expectedAttendees) || 50,
      description: description.trim(),
      imageUrl: eventImage
    };

    onAddEvent(newEvent);
    setShowEventModal(false);
    resetEventForm();
    setNotice({ message: `Đã lên lịch hoạt động "${newEvent.title}" tại ${newEvent.location}.`, type: "success" });
  };

  // Filter Logic
  const filteredEvents = events.filter(ev => {
    if (eventFilter === "Tất cả") return true;
    return ev.status === eventFilter;
  });

  const activeNewsList = propNewsList && propNewsList.length > 0 ? propNewsList : newsList;
  const filteredNews = activeNewsList.filter(news => {
    const matchesSearch = news.title.toLowerCase().includes(newsSearch.toLowerCase()) || 
                          news.content.toLowerCase().includes(newsSearch.toLowerCase()) ||
                          news.author.toLowerCase().includes(newsSearch.toLowerCase());
    const matchesCategory = newsFilter === "Tất cả" || news.category === newsFilter;
    return matchesSearch && matchesCategory;
  });

  // Urgent News for Alert Banner
  const urgentNews = activeNewsList.find(n => n.category === "Thông báo khẩn");

  // Spotlight / Featured News
  const pinnedNews = activeNewsList.filter(n => n.isPinned);
  const heroNews = pinnedNews.length > 0 ? pinnedNews[0] : activeNewsList[0];
  const subFeaturedNews = pinnedNews.length > 1 ? pinnedNews.slice(1, 3) : activeNewsList.slice(1, 3);

  // Pagination for News
  const totalNewsItems = filteredNews.length;
  const totalNewsPages = Math.ceil(totalNewsItems / newsPerPage) || 1;
  const activeNewsPage = currentNewsPage > totalNewsPages ? totalNewsPages : currentNewsPage;
  const startNewsIndex = (activeNewsPage - 1) * newsPerPage;
  const paginatedNews = filteredNews.slice(startNewsIndex, startNewsIndex + newsPerPage);

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
                  onClick={() => {
                    resetNewsForm();
                    setShowNewsModal(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Đăng Bản Tin Mới
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowEventModal(true)}
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
        <div className="space-y-6">

          {/* DẢI CẢNH BÁO KHẨN CẤP (FLAT HAIRLINE ALERT BANNER) */}
          {urgentNews && (
            <div className="bg-rose-50 border border-rose-200 border-l-4 border-l-rose-600 text-slate-900 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shrink-0 flex items-center justify-center">
                  <BellRing size={20} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-700 text-white">
                      THÔNG BÁO KHẨN CẤP
                    </span>
                    <span className="text-xs text-rose-800 font-mono font-medium">{urgentNews.date}</span>
                  </div>
                  <p className="font-bold text-xs sm:text-sm line-clamp-1 text-slate-900">
                    {urgentNews.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNewsForModal(urgentNews)}
                className="shrink-0 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                Xem chỉ đạo ngay <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* KHỐI TIÊU ĐIỂM BÁO CHÍ (FLAT HAIRLINE SPOTLIGHT SECTION) */}
          {newsFilter === "Tất cả" && newsSearch === "" && heroNews && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-600" /> Tiêu Điểm Truyền Thông Khu Phố
                </span>
                <span className="text-xs text-slate-600 font-medium">Cập nhật liên tục 24/7</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Tin Tiêu Điểm Lớn (Hero Card - Flat Hairline, NO dark overlay over text) */}
                <div
                  onClick={() => setSelectedNewsForModal(heroNews)}
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

                  {/* Crisp White Flat Content Body */}
                  <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col justify-between bg-white">
                    <div className="space-y-2">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {heroNews.title}
                      </h2>
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

                {/* Các Tin Nổi Bật Kế Tiếp (Sub-featured - 5 cột) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {subFeaturedNews.map(subNews => {
                    const theme = getCategoryTheme(subNews.category);
                    return (
                      <div 
                        key={subNews.id}
                        onClick={() => setSelectedNewsForModal(subNews)}
                        className="group flex-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex gap-4">
                          <div className="w-28 sm:w-32 h-24 sm:h-26 rounded-xl overflow-hidden shrink-0 relative">
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
                              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${theme.pill}`}>
                                {subNews.category}
                              </span>
                              <span className="text-xs text-slate-600 font-mono">{subNews.date}</span>
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
                          <span className="truncate max-w-[160px] font-medium text-slate-600">
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
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  id="news-search-input"
                  name="newsSearch"
                  type="text" 
                  placeholder="Tìm kiếm bản tin, thông báo hành chính, lịch tiêm ngừa, PCCC..."
                  value={newsSearch}
                  onChange={(e) => handleNewsSearchChange(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 hover:bg-white transition-colors"
                />
                {newsSearch && (
                  <button 
                    onClick={() => handleNewsSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Chế độ Lưới Ảnh Lớn"
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${viewMode === "grid" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-700 hover:text-slate-900"}`}
                >
                  <LayoutGrid size={15} /> <span className="hidden sm:inline">Lưới ảnh</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="Chế độ Danh Sách Báo"
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${viewMode === "list" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-700 hover:text-slate-900"}`}
                >
                  <List size={15} /> <span className="hidden sm:inline">Dòng báo</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-xs font-bold text-slate-600 inline-flex items-center gap-1">
                <Tag size={12} /> Chuyên mục:
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
              {[
                { name: "Tất cả", icon: Newspaper, count: activeNewsList.length },
                { name: "Thông báo khẩn", icon: AlertTriangle, count: activeNewsList.filter(n => n.category === "Thông báo khẩn").length },
                { name: "Hành chính", icon: BookOpen, count: activeNewsList.filter(n => n.category === "Hành chính").length },
                { name: "Y tế & Đời sống", icon: Sparkles, count: activeNewsList.filter(n => n.category === "Y tế & Đời sống").length },
                { name: "An sinh xã hội", icon: Award, count: activeNewsList.filter(n => n.category === "An sinh xã hội").length },
                { name: "Phong trào", icon: Users, count: activeNewsList.filter(n => n.category === "Phong trào").length }
              ].map(cat => {
                const isSelected = newsFilter === cat.name;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleNewsFilterChange(cat.name)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between sm:justify-start gap-1.5
                      ${isSelected 
                        ? "bg-emerald-700 text-white font-bold" 
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <IconComponent size={12} />
                      <span>{cat.name}</span>
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${isSelected ? "bg-emerald-950/60 text-white" : "bg-slate-200 text-slate-700"}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>

          {/* DANH SÁCH BẢN TIN CHÍNH (MULTIMEDIA NEWS STREAM) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                {newsFilter === "Tất cả" ? "Tất Cả Bản Tin Cập Nhật" : `Chuyên mục: ${newsFilter}`} ({filteredNews.length})
              </span>
              <span className="text-xs text-slate-600">
                Trang {activeNewsPage} / {totalNewsPages}
              </span>
            </div>

            {filteredNews.length === 0 ? (
              <div className="bg-white p-12 text-center text-slate-600 border border-slate-200 rounded-3xl shadow-xs space-y-3">
                <Newspaper size={40} className="mx-auto text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">Không tìm thấy bản tin nào phù hợp</p>
                <p className="text-xs text-slate-600">Vui lòng thử tìm kiếm bằng từ khóa khác hoặc chuyển sang chuyên mục "Tất cả".</p>
                <button 
                  onClick={() => {
                    setNewsSearch("");
                    setNewsFilter("Tất cả");
                  }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* CHẾ ĐỘ XEM LƯỚI ẢNH (GRID VIEW - 3 CỘT) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedNews.map(news => {
                  const theme = getCategoryTheme(news.category);
                  const imageUrl = getNewsImage(news);

                  return (
                    <div 
                      key={news.id} 
                      className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-teal-300 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                      onClick={() => setSelectedNewsForModal(news)}
                    >
                      <div>
                        {/* Thumbnail Image with aspect ratio 16:9 */}
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                          <img 
                            src={imageUrl} 
                            alt={news.title}
                            className="w-full h-full object-cover" 
                            loading="lazy"
                          />
                          
                          {/* Badge Category overlay */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${theme.pill} bg-white/90`}>
                              {news.category}
                            </span>
                            {news.isPinned && (
                              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1">
                                <Pin size={10} /> Ghim
                              </span>
                            )}
                          </div>

                          {/* Read time and views badge */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                            <span className="text-xs font-mono bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock size={10} /> {getNewsReadTime(news)}
                            </span>
                          </div>
                        </div>

                        {/* Article Snippet Content */}
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

                          {/* Attached File indicator */}
                          {news.attachedFile && (
                            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                              <span className="flex items-center gap-1.5 truncate max-w-[200px] font-medium">
                                <FileText size={13} className="text-rose-500 shrink-0" />
                                <span className="truncate">{news.attachedFile.name}</span>
                              </span>
                              <span className="text-xs font-mono text-slate-600 shrink-0">
                                {news.attachedFile.size}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer with Author and Actions */}
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditNews(news);
                            }}
                            title="Sửa bản tin"
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNewsItem(news.id, news.title);
                            }}
                            title="Xóa bản tin"
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
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
              /* CHẾ ĐỘ XEM DÒNG BÁO (LIST VIEW - DẠNG BÀI VIẾT NGANG) */
              <div className="space-y-4">
                {paginatedNews.map(news => {
                  const theme = getCategoryTheme(news.category);
                  const imageUrl = getNewsImage(news);

                  return (
                    <div 
                      key={news.id} 
                      className="group bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                      onClick={() => setSelectedNewsForModal(news)}
                    >
                      <div className="w-full sm:w-52 h-36 sm:h-32 rounded-xl overflow-hidden shrink-0 relative">
                        <img 
                          src={imageUrl} 
                          alt={news.title}
                          className="w-full h-full object-cover" 
                        />
                        <span className={`absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded-full border shadow-xs bg-white/95 ${theme.pill}`}>
                          {news.category}
                        </span>
                        <span className="absolute bottom-2 right-2 text-xs font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {getNewsReadTime(news)}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
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
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 group-hover:text-emerald-700 transition-colors leading-snug">
                          {news.title}
                        </h3>

                        <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {getNewsSummary(news)}
                        </p>

                        <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditNews(news);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                        >
                          <Edit3 size={12} /> Sửa
                        </button>
                        <button 
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        >
                          Đọc <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              id="news-pagination"
              currentPage={activeNewsPage}
              totalItems={totalNewsItems}
              itemsPerPage={newsPerPage}
              onPageChange={setCurrentNewsPage}
            />
          </div>
        </div>
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
                      onClick={() => {
                        setLocation(venue);
                        setShowEventModal(true);
                      }}
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
                        onClick={() => setSelectedEventForModal(ev)}
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
                          onClick={() => setSelectedEventForModal(ev)}
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
                          onClick={() => setSelectedEventForModal(ev)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} /> Chi tiết
                        </button>
                        <div className="flex items-center gap-1">
                          {onUpdateEvent && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditEvent(ev)}
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

      {/* ========================================================
          MODAL 1: CREATE OR EDIT NEWS (ĐĂNG / SỬA BẢN TIN ĐIỆN TỬ)
          ======================================================== */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-50 via-white to-emerald-50/50 p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800">
                    {editingNews ? "Chỉnh sửa bài viết bản tin" : "Đăng bản tin & Thông báo khu phố mới"}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Kênh truyền thông chính thống phát sóng tới toàn thể nhân dân
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowNewsModal(false);
                  resetNewsForm();
                }}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveNews} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* News Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Tiêu đề Bản tin / Thông báo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Kế hoạch triển khai chiến dịch sốt xuất huyết diện rộng..."
                  value={newNewsTitle}
                  onChange={(e) => setNewNewsTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Category and Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Chuyên mục Bản tin</label>
                  <ReportSelect
                    aria-label="Chuyên mục Bản tin"
                    value={newNewsCategory}
                    onChange={(val) => setNewNewsCategory(val as LocalNews["category"])}
                    options={[
                      { value: "Hành chính", label: "Hành chính" },
                      { value: "Thông báo khẩn", label: "Thông báo khẩn" },
                      { value: "Y tế & Đời sống", label: "Y tế & Đời sống" },
                      { value: "Phong trào", label: "Phong trào" },
                      { value: "An sinh xã hội", label: "An sinh xã hội" }
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nguồn phát hành / Tác giả *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ví dụ: Ban Điều hành KP3, Trạm Y tế, Công an Phường..."
                    value={newNewsAuthor}
                    onChange={(e) => setNewNewsAuthor(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Summary Snippet */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Đoạn Sa-pô / Tóm tắt ngắn (Lead snippet)
                </label>
                <textarea 
                  rows={2}
                  placeholder="Đoạn tóm tắt nổi bật từ 1-2 câu xuất hiện trên thẻ tin tức..."
                  value={newNewsSummary}
                  onChange={(e) => setNewNewsSummary(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Full Content */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Nội dung chi tiết toàn văn *</label>
                <textarea 
                  rows={5}
                  required
                  placeholder="Nhập nội dung thông báo đầy đủ gửi tới cư dân hẻm..."
                  value={newNewsContent}
                  onChange={(e) => setNewNewsContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              {/* CHỌN ẢNH BÌA MINH HỌA (PRESET PICKER HOẶC CUSTOM URL) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-emerald-600" /> Chọn ảnh bìa minh họa sinh động:
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">Bấm vào ảnh mẫu để chọn nhanh</span>
                </label>

                {/* Preset image cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {COVER_PRESETS.map((preset) => {
                    const isSelected = newNewsImage === preset.url;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setNewNewsImage(preset.url)}
                        className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? "border-emerald-600 ring-2 ring-emerald-500/30 scale-[1.02]" : "border-slate-200 hover:border-emerald-400"}`}
                      >
                        <div className="aspect-video w-full">
                          <img 
                            src={preset.url} 
                            alt={preset.label}
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="p-1.5 bg-white text-center">
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {preset.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom URL fallback input */}
                <div className="pt-1.5">
                  <input 
                    type="url" 
                    placeholder="Hoặc dán URL ảnh bìa tùy chỉnh (https://...)"
                    value={newNewsImage}
                    onChange={(e) => setNewNewsImage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Tệp văn bản đính kèm & Ghim tin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Tệp công văn đính kèm (PDF/Scan)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Ke_hoach_so_42_PCD_KP3_signed.pdf"
                    value={newNewsFileName}
                    onChange={(e) => setNewNewsFileName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input 
                    id="news-pinned-check"
                    type="checkbox" 
                    checked={newNewsIsPinned}
                    onChange={(e) => setNewNewsIsPinned(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="news-pinned-check" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                    <Pin size={13} className="text-rose-600" /> Ghim bản tin lên vị trí Tiêu điểm
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewsModal(false);
                    resetNewsForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {editingNews ? "Cập nhật bài viết" : "Phát hành bản tin ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ADD / EDIT EVENT / BOOKING (LÊN LỊCH / SỬA SỰ KIỆN)
          ======================================================== */}
      {showEventModal && (
        <Modal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            resetEventForm();
          }}
          title={editingEvent ? "Chỉnh sửa sự kiện cộng đồng" : "Lên lịch hoạt động & Đặt chỗ Nhà văn hóa"}
          description="Quản lý không gian sinh hoạt cộng đồng, hội họp dân cư"
          size="xl"
          footer={
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setShowEventModal(false);
                  resetEventForm();
                }}
                className="min-h-9 px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="kp3-event-editor-form"
                className="min-h-9 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {editingEvent ? "Lưu cập nhật sự kiện" : "Đăng ký Đặt chỗ"}
              </button>
            </div>
          }
        >
          <form id="kp3-event-editor-form" onSubmit={handleAddEventSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Tên sự kiện / Hoạt động phong trào *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Họp chi bộ định kỳ tháng 8, Lớp sinh hoạt kỹ năng hè thiếu nhi..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Đơn vị chủ trì *</label>
                  <input 
                    type="text" 
                    required
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Dự kiến số người tham dự *</label>
                  <input 
                    type="number" 
                    required
                    value={expectedAttendees}
                    onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Thời gian tổ chức *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ví dụ: 25/07/2026 - 19:00"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Địa điểm / Phòng Nhà Văn hóa *</label>
                  <ReportSelect
                    aria-label="Chọn phòng Nhà Văn hóa"
                    value={CULTURAL_VENUES.includes(location) ? location : CULTURAL_VENUES[0]}
                    onChange={(val) => setLocation(val)}
                    options={CULTURAL_VENUES.map((v) => ({ value: v, label: v }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Nội dung chi tiết chương trình *</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Ghi rõ chương trình nghị sự, mục đích, cơ sở vật chất cần mượn (loa kéo, bàn ghế, tivi trình chiếu...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <p><strong>Quy định sử dụng:</strong> Các tổ chức có trách nhiệm giữ gìn vệ sinh, tắt toàn bộ điều hòa, thiết bị điện trước khi bàn giao chìa khóa cho Tổ quản lý Nhà văn hóa.</p>
              </div>
            </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL 2B: VIEW EVENT DETAILS (XEM CHI TIẾT SỰ KIỆN KP3)
          ======================================================== */}
      {selectedEventForModal && (() => {
        const navList = filteredEvents.length > 0 ? filteredEvents : events;
        const currentIdx = navList.findIndex(e => e.id === selectedEventForModal.id);
        const totalNav = navList.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;
        const shortEvId = formatShortRecordId(selectedEventForModal.id, "EV");
        const rsvpInfo = eventRsvpMap[selectedEventForModal.id] || { registered: false, extraCount: 0 };
        const totalAttendees = (selectedEventForModal.expectedAttendees || 0) + (rsvpInfo.extraCount || 0);
        const eventImg = (selectedEventForModal.imageUrl && !selectedEventForModal.imageUrl.includes("1555696958"))
          ? selectedEventForModal.imageUrl
          : COVER_PRESETS[6].url;

        return (
          <Modal
            isOpen={Boolean(selectedEventForModal)}
            onClose={() => setSelectedEventForModal(null)}
            size="2xl"
            ariaLabel={`Chi tiết sự kiện ${selectedEventForModal.title}`}
            headerNavigation={
              totalNav > 1 && currentIdx >= 0
                ? {
                    positionText: `Sự kiện ${currentIdx + 1}/${totalNav}`,
                    hasPrev,
                    hasNext,
                    onPrev: () => hasPrev && setSelectedEventForModal(navList[currentIdx - 1]),
                    onNext: () => hasNext && setSelectedEventForModal(navList[currentIdx + 1]),
                    prevLabel: "Sự kiện trước",
                    nextLabel: "Sự kiện tiếp theo",
                  }
                : undefined
            }
            headerSlot={
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    MÃ: {shortEvId}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {selectedEventForModal.status}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {selectedEventForModal.title}
                </h2>
              </div>
            }
            bodyClassName="p-4 sm:p-5 bg-slate-50/70 space-y-4 text-xs sm:text-sm"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedEventForModal.status !== "Đã kết thúc" && selectedEventForModal.status !== "Đã hủy" && (
                    <button
                      type="button"
                      onClick={() => handleToggleRsvp(selectedEventForModal.id, selectedEventForModal.title)}
                      className={`min-h-9 px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                        rsvpInfo.registered
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>{rsvpInfo.registered ? "Đã đăng ký tham dự" : "Đăng ký tham dự"}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onDeleteEvent && (
                    <button
                      type="button"
                      onClick={() => setDeleteEventTarget({ id: selectedEventForModal.id, title: selectedEventForModal.title })}
                      className="min-h-9 px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} /> Xóa sự kiện
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEventForModal(null)}
                    className="min-h-9 px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                  {onUpdateEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedEventForModal;
                        setSelectedEventForModal(null);
                        handleOpenEditEvent(target);
                      }}
                      className="min-h-9 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={13} /> Chỉnh sửa sự kiện
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
              <img src={eventImg} alt={selectedEventForModal.title} className="w-full h-full object-cover" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <DetailGrid>
                <DetailRow label="Thời gian tổ chức" value={selectedEventForModal.dateTime} isMono />
                <DetailRow label="Đơn vị chủ trì" value={selectedEventForModal.organizer} />
                <DetailRow label="Địa điểm tổ chức" value={selectedEventForModal.location} colSpan={2} />
                <DetailRow label="Số lượng dự kiến" value={`${totalAttendees} người tham dự`} isNumeric />
                <DetailRow label="Trạng thái" value={selectedEventForModal.status} />
              </DetailGrid>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nội dung chương trình</span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {selectedEventForModal.description}
              </p>
            </div>
          </Modal>
        );
      })()}

      {/* ========================================================
          MODAL 3: VIEW NEWS DETAILS (ĐỌC BÀI VIẾT BÁO ĐIỆN TỬ CHI TIẾT)
          ======================================================== */}
      {selectedNewsForModal && (() => {
        const navList = filteredNews.length > 0 ? filteredNews : activeNewsList;
        const currentIdx = navList.findIndex(n => n.id === selectedNewsForModal.id);
        const totalNav = navList.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;
        const shortNewsId = formatShortRecordId(selectedNewsForModal.id, "TIN");

        return (
          <Modal
            isOpen={Boolean(selectedNewsForModal)}
            onClose={() => setSelectedNewsForModal(null)}
            size="3xl"
            ariaLabel={`Chi tiết bản tin ${selectedNewsForModal.title}`}
            headerNavigation={
              totalNav > 1 && currentIdx >= 0
                ? {
                    positionText: `Bản tin ${currentIdx + 1}/${totalNav}`,
                    hasPrev,
                    hasNext,
                    onPrev: () => hasPrev && setSelectedNewsForModal(navList[currentIdx - 1]),
                    onNext: () => hasNext && setSelectedNewsForModal(navList[currentIdx + 1]),
                    prevLabel: "Bản tin trước",
                    nextLabel: "Bản tin tiếp theo",
                  }
                : undefined
            }
            headerSlot={
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    MÃ: {shortNewsId}
                  </span>
                  <span className={`font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryTheme(selectedNewsForModal.category).pill}`}>
                    {selectedNewsForModal.category}
                  </span>
                </div>
                <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                  {selectedNewsForModal.title}
                </h1>
              </div>
            }
            bodyClassName="px-5 sm:px-7 py-5 space-y-5 text-xs sm:text-sm"
            footer={
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(selectedNewsForModal)}
                    className="min-h-9 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-700" /> : <Share2 size={14} />}
                    <span>{copiedLink ? "Đã sao chép!" : "Chia sẻ"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-9 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Printer size={14} />
                    <span>In tin</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteNewsItem(selectedNewsForModal.id, selectedNewsForModal.title)}
                    className="min-h-9 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 size={14} /> Xóa bài
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNewsForModal(null)}
                    className="min-h-9 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedNewsForModal;
                      setSelectedNewsForModal(null);
                      handleOpenEditNews(target);
                    }}
                    className="min-h-9 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} /> Chỉnh sửa bài viết
                  </button>
                </div>
              </div>
            }
          >
            {/* Structured Metadata Grid */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
              <DetailGrid>
                <DetailRow label="Cơ quan / Tác giả" value={selectedNewsForModal.author} />
                <DetailRow label="Ngày phát hành" value={selectedNewsForModal.date} isMono />
                <DetailRow label="Thời gian đọc" value={getNewsReadTime(selectedNewsForModal)} />
                <DetailRow label="Lượt tiếp cận" value={`${getNewsViews(selectedNewsForModal)} lượt đọc`} isNumeric />
              </DetailGrid>
            </div>

            {/* Featured Cover Photo */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="aspect-video w-full bg-slate-100">
                <img 
                  src={getNewsImage(selectedNewsForModal)} 
                  alt={selectedNewsForModal.title}
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="px-4 py-2 bg-slate-50 text-xs text-slate-600 italic text-center border-t border-slate-100">
                Hình ảnh tư liệu hoạt động thực tế trên địa bàn Khu phố 3, Phường An Phú
              </div>
            </div>

            {/* Lead Summary */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border-l-4 border-emerald-700 text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
              {getNewsSummary(selectedNewsForModal)}
            </div>

            {/* Full Article Text Content */}
            <div className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-3 font-normal">
              {selectedNewsForModal.content}
            </div>

            {selectedNewsForModal.imageGallery && selectedNewsForModal.imageGallery.length > 0 && (
              <div className="space-y-2 pt-3">
                <span className="text-xs font-bold text-slate-700 block">Thư viện hình ảnh hoạt động:</span>
                <div className="grid grid-cols-2 gap-3">
                  {selectedNewsForModal.imageGallery.map((imgUrl, idx) => (
                    <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-slate-200">
                      <img src={imgUrl} alt="Hoạt động" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedNewsForModal.attachedFile && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {selectedNewsForModal.attachedFile.name}
                    </span>
                    <span className="text-xs text-slate-600 font-mono">
                      Văn bản đính kèm • {selectedNewsForModal.attachedFile.size || "1.2 MB"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotice({
                      message: `Đang tải xuống công văn đính kèm: ${selectedNewsForModal.attachedFile?.name}`,
                      type: "info"
                    })
                  }
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  <Download size={14} /> Tải văn bản
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end text-right">
              <div>
                <span className="text-xs text-slate-600 italic block">Ban Biên tập Cổng thông tin Khu phố 3</span>
                <span className="text-xs font-bold text-slate-800">Trân trọng thông báo tới toàn thể bà con cư dân</span>
              </div>
            </div>
          </Modal>
        );
      })()}

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
