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
import { formatVNNumber } from "../utils/numberFormat";
import { initialNewsList, initialCommunityEvents } from "../mockData";

interface CommunityEventsProps {
  events: CommunityEvent[];
  onAddEvent: (newEvent: CommunityEvent) => void;
  onUpdateEventStatus: (id: string, status: CommunityEvent["status"]) => void;
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

  // States for Events Calendar
  const [showEventModal, setShowEventModal] = useState(false);
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("Ban Điều hành Khu phố 3");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("Nhà Văn hóa Khu phố 3");
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
    if (!newNewsTitle || !newNewsContent) {
      alert("Vui lòng điền đầy đủ tiêu đề và nội dung bài viết!");
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
    if (confirm(`Bạn có chắc chắn muốn xóa bài viết:\n"${title}"?`)) {
      if (onDeleteNews) {
        onDeleteNews(id);
      }
      setNewsList(prev => prev.filter(n => n.id !== id));
      if (selectedNewsForModal?.id === id) {
        setSelectedNewsForModal(null);
      }
    }
  };

  const handleTogglePin = (news: LocalNews) => {
    const updated = { ...news, isPinned: !news.isPinned };
    if (onUpdateNews) {
      onUpdateNews(updated);
    }
    setNewsList(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleResetToSampleNews = () => {
    if (confirm("Khôi phục danh sách bản tin mẫu chuẩn phong cách báo điện tử có kèm ảnh minh họa và công văn đính kèm?")) {
      setNewsList(initialNewsList);
      try {
        localStorage.setItem("kp3_local_news", JSON.stringify(initialNewsList));
      } catch {}
      alert("Đã đồng bộ lại 6 bản tin mẫu có đầy đủ hình ảnh sinh động!");
    }
  };

  const handleCopyShareLink = (news: LocalNews) => {
    const shareUrl = `${window.location.origin}/dashboard/events?news=${news.id}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateTime || !description) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    const newEvent: CommunityEvent = {
      id: "EV" + (events.length + 1).toString().padStart(3, "0"),
      title,
      organizer,
      dateTime,
      location,
      status: "Sắp diễn ra",
      expectedAttendees: Number(expectedAttendees) || 50,
      description,
      imageUrl: eventImage
    };

    onAddEvent(newEvent);
    setShowEventModal(false);

    // Reset event form
    setTitle("");
    setDateTime("");
    setExpectedAttendees(50);
    setDescription("");
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
                  onClick={handleResetToSampleNews}
                  title="Đồng bộ danh sách bản tin mẫu có đầy đủ hình ảnh sinh động"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <RotateCcw size={13} /> Dữ liệu ảnh mẫu
                </button>
                <button 
                  onClick={() => {
                    resetNewsForm();
                    setShowNewsModal(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={15} /> Đăng Bản Tin & Thông Báo Mới
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowEventModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
              >
                <Plus size={15} /> Lên Lịch Hoạt Động & Mượn Hội Trường
              </button>
            )}
          </div>
        }
      />

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
      <div className="flex border-b border-slate-200 gap-8">
        <button
          onClick={() => setActiveSubTab("news")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer
            ${activeSubTab === "news" ? "text-emerald-700 font-extrabold" : "text-slate-400 hover:text-slate-600"}
          `}
        >
          <Newspaper size={18} /> Bản tin & Báo điện tử Khu phố
          {activeSubTab === "news" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("events")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer
            ${activeSubTab === "events" ? "text-emerald-700 font-extrabold" : "text-slate-400 hover:text-slate-600"}
          `}
        >
          <CalendarDays size={18} /> Lịch sinh hoạt & Hoạt động Nhà Văn hóa
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

          {/* DẢI CẢNH BÁO KHẨN CẤP (BREAKING NEWS ALERT BANNER) */}
          {urgentNews && (
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs shrink-0 flex items-center justify-center ring-2 ring-white/30">
                  <BellRing size={20} className="animate-bounce" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-rose-700 shadow-xs">
                      🚨 THÔNG BÁO KHẨN CẤP
                    </span>
                    <span className="text-[11px] text-rose-100 font-mono font-medium">{urgentNews.date}</span>
                  </div>
                  <p className="font-bold text-xs sm:text-sm line-clamp-1 text-white">
                    {urgentNews.title}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNewsForModal(urgentNews)}
                className="shrink-0 text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                Xem chỉ đạo ngay <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* KHỐI TIÊU ĐIỂM BÁO CHÍ (HERO SPOTLIGHT SECTION) */}
          {newsFilter === "Tất cả" && newsSearch === "" && heroNews && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" /> Tiêu Điểm Truyền Thông Khu Phố
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Cập nhật liên tục 24/7</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Tin Tiêu Điểm Lớn (Hero Card - 7 cột) */}
                <div 
                  onClick={() => setSelectedNewsForModal(heroNews)}
                  className="lg:col-span-7 group relative bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-200 cursor-pointer min-h-[360px] sm:min-h-[420px] flex flex-col justify-end transition-all hover:shadow-2xl"
                >
                  <img 
                    src={getNewsImage(heroNews)} 
                    alt={heroNews.title} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out brightness-[0.88]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/50 to-transparent" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md flex items-center gap-1.5">
                        <Flame size={12} className="animate-pulse" /> TIÊU ĐIỂM
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-black/40 backdrop-blur-md text-white border border-white/20">
                        {heroNews.category}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20 font-mono">
                      {heroNews.date}
                    </span>
                  </div>

                  {/* Bottom Content */}
                  <div className="relative z-10 p-5 sm:p-7 space-y-3">
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-snug drop-shadow-sm group-hover:text-teal-200 transition-colors line-clamp-2">
                      {heroNews.title}
                    </h2>
                    
                    <p className="text-slate-200 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed font-normal text-slate-100/90">
                      {getNewsSummary(heroNews)}
                    </p>

                    <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-white/80">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 font-medium">
                          <User size={13} className="text-teal-400" /> {heroNews.author}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Clock size={12} className="text-teal-400" /> {getNewsReadTime(heroNews)}
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
                          <Eye size={12} className="text-teal-400" /> {getNewsViews(heroNews)} đọc
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 font-bold text-teal-300 group-hover:translate-x-1 transition-transform">
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
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-white backdrop-blur-xs">
                              {getNewsReadTime(subNews)}
                            </span>
                          </div>

                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${theme.pill}`}>
                                {subNews.category}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{subNews.date}</span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                              {subNews.title}
                            </h4>
                            <p className="text-slate-500 text-[11px] line-clamp-1 leading-relaxed">
                              {getNewsSummary(subNews)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === "grid" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <LayoutGrid size={15} /> <span className="hidden sm:inline">Lưới ảnh</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="Chế độ Danh Sách Báo"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === "list" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <List size={15} /> <span className="hidden sm:inline">Dòng báo</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Tag size={12} /> Chuyên mục:
              </span>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5
                      ${isSelected 
                        ? "bg-emerald-700 text-white shadow-xs font-bold" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    <IconComponent size={12} />
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600"}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DANH SÁCH BẢN TIN CHÍNH (MULTIMEDIA NEWS STREAM) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                {newsFilter === "Tất cả" ? "Tất Cả Bản Tin Cập Nhật" : `Chuyên mục: ${newsFilter}`} ({filteredNews.length})
              </span>
              <span className="text-xs text-slate-400">
                Trang {activeNewsPage} / {totalNewsPages}
              </span>
            </div>

            {filteredNews.length === 0 ? (
              <div className="bg-white p-12 text-center text-slate-400 border border-slate-200 rounded-3xl shadow-xs space-y-3">
                <Newspaper size={40} className="mx-auto text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">Không tìm thấy bản tin nào phù hợp</p>
                <p className="text-xs text-slate-400">Vui lòng thử tìm kiếm bằng từ khóa khác hoặc chuyển sang chuyên mục "Tất cả".</p>
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
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                            loading="lazy"
                          />
                          
                          {/* Badge Category overlay */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${theme.pill} bg-white/90`}>
                              {news.category}
                            </span>
                            {news.isPinned && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1">
                                <Pin size={10} /> Ghim
                              </span>
                            )}
                          </div>

                          {/* Read time and views badge */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                            <span className="text-[10px] font-mono bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock size={10} /> {getNewsReadTime(news)}
                            </span>
                          </div>
                        </div>

                        {/* Article Snippet Content */}
                        <div className="p-4 sm:p-5 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} className="text-slate-400" /> {news.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={12} className="text-slate-400" /> {getNewsViews(news)}
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
                            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                              <span className="flex items-center gap-1.5 truncate max-w-[200px] font-medium">
                                <FileText size={13} className="text-rose-500 shrink-0" />
                                <span className="truncate">{news.attachedFile.name}</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {news.attachedFile.size}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer with Author and Actions */}
                      <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2 truncate max-w-[180px]">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {news.author.charAt(0)}
                          </div>
                          <span className="truncate text-[11px] font-medium text-slate-700">
                            {news.author}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditNews(news);
                            }}
                            title="Sửa bản tin"
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNewsItem(news.id, news.title);
                            }}
                            title="Xóa bản tin"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                          <span className="text-emerald-700 font-bold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ml-1">
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
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full border shadow-xs bg-white/95 ${theme.pill}`}>
                          {news.category}
                        </span>
                        <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {getNewsReadTime(news)}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
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
                            <span className="text-[11px] font-mono text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
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
            <div className="bg-gradient-to-tr from-teal-700 to-emerald-800 text-white p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs"><CalendarDays size={22} /></div>
                <span className="text-[10px] bg-white/20 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">Sử dụng trụ sở</span>
              </div>
              <div>
                <span className="text-teal-200 text-[10px] font-bold uppercase tracking-wider block">Phòng hội họp Nhà Văn hóa</span>
                <h3 className="text-base font-bold">Trụ sở sinh hoạt Khu phố 3</h3>
                <p className="text-[11px] text-teal-100/80 mt-1 leading-relaxed">Luôn mở cửa phục vụ các chi hội đoàn thể họp định kỳ và tổ chức sinh hoạt kỹ năng cho con em hẻm nội khu.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700"><Users size={22} /></div>
                <span className="text-xs text-emerald-600 font-extrabold font-mono bg-emerald-50 px-2.5 py-0.5 rounded">Tích cực</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Thống kê Sự kiện Năm nay</span>
                <h3 className="text-lg font-bold text-slate-800">{events.length} hoạt động phong trào</h3>
                <p className="text-[11px] text-slate-500 mt-1">Nỗ lực đạt 100% chỉ tiêu phong trào văn nghệ và phong trào dân vận khéo phường giao phó.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Award size={22} /></div>
                <span className="text-xs text-amber-600 font-extrabold bg-amber-50 px-2 py-0.5 rounded">Văn hóa</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Chuẩn mực lối sống</span>
                <h3 className="text-base font-bold text-slate-800">Gia đình Văn hóa xuất sắc</h3>
                <p className="text-[11px] text-slate-500 mt-1">Đạt tỷ lệ cao các hộ dân đăng ký thi đua lối sống văn minh đô thị.</p>
              </div>
            </div>
          </div>

          {/* Event Filters */}
          <div className="flex border-b border-slate-200 gap-6">
            {(["Tất cả", "Sắp diễn ra", "Đang diễn ra", "Đã kết thúc"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleEventFilterChange(tab)}
                className={`pb-3 text-xs font-semibold transition-all relative cursor-pointer
                  ${eventFilter === tab ? "text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600"}
                `}
              >
                {tab}
                {eventFilter === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Event Cards Grid với Ảnh Minh Họa Sống Động */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                Không tìm thấy sự kiện hay hoạt động đoàn thể nào tương ứng bộ lọc.
              </div>
            ) : (
              paginatedEvents.map((ev) => {
                const statusConfigs = {
                  "Sắp diễn ra": { text: "Sắp diễn ra", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
                  "Đang diễn ra": { text: "Đang diễn ra", color: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse", icon: Sparkles },
                  "Đã kết thúc": { text: "Đã hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
                  "Đã hủy": { text: "Đã hủy", color: "bg-rose-50 text-rose-500 border-rose-200", icon: AlertTriangle }
                };

                const conf = statusConfigs[ev.status];
                const StatusIcon = conf.icon;
                const eventImg = (ev.imageUrl && !ev.imageUrl.includes("1555696958")) 
                  ? ev.imageUrl 
                  : (ev.id === "EV001" ? COVER_PRESETS[6].url : ev.id === "EV002" ? COVER_PRESETS[4].url : COVER_PRESETS[5].url);

                return (
                  <div 
                    key={ev.id}
                    id={`event-card-${ev.id}`}
                    className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-teal-300 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Event Cover Image */}
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                        <img 
                          src={eventImg} 
                          alt={ev.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-xs backdrop-blur-md bg-white/95 flex items-center gap-1 ${conf.color}`}>
                            <StatusIcon size={12} /> {conf.text}
                          </span>
                        </div>
                        <span className="absolute bottom-2 right-2 text-[10px] text-white font-mono font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {ev.id}
                        </span>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
                          {ev.title}
                        </h3>
                        <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                          {ev.description}
                        </p>

                        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <CalendarDays size={14} className="text-teal-600 shrink-0" />
                            <span className="font-semibold font-mono text-[11px]">{ev.dateTime}</span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin size={14} className="text-rose-500 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400 pt-1">
                            <span className="text-[10px] font-semibold truncate max-w-[150px] text-slate-700">
                              Tổ chức: {ev.organizer}
                            </span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Users size={10} /> {ev.expectedAttendees} người
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operations */}
                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex gap-2">
                      {ev.status === "Sắp diễn ra" && (
                        <>
                          <button
                            onClick={() => onUpdateEventStatus(ev.id, "Đang diễn ra")}
                            className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Bắt đầu ngay
                          </button>
                          <button
                            onClick={() => onUpdateEventStatus(ev.id, "Đã kết thúc")}
                            className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Hoàn tất sớm
                          </button>
                        </>
                      )}
                      {ev.status === "Đang diễn ra" && (
                        <button
                          onClick={() => onUpdateEventStatus(ev.id, "Đã kết thúc")}
                          className="w-full text-[11px] font-bold py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer text-center"
                        >
                          Xác nhận Đã tổ chức xong
                        </button>
                      )}
                      {ev.status === "Đã kết thúc" && (
                        <div className="w-full text-[11px] text-slate-400 text-center font-semibold py-1">
                          ✓ Đã lưu trữ hồ sơ hoạt động
                        </div>
                      )}
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
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  <select
                    value={newNewsCategory}
                    onChange={(e) => setNewNewsCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="Hành chính">📋 Hành chính</option>
                    <option value="Thông báo khẩn">🚨 Thông báo khẩn</option>
                    <option value="Y tế & Đời sống">🏥 Y tế & Đời sống</option>
                    <option value="Phong trào">🌿 Phong trào</option>
                    <option value="An sinh xã hội">💖 An sinh xã hội</option>
                  </select>
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
                  <span className="text-[11px] text-emerald-700 font-medium">Bấm vào ảnh mẫu để chọn nhanh</span>
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
                          <span className="text-[10px] font-bold text-slate-800 truncate block">
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
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {editingNews ? "Cập nhật bài viết" : "Phát hành bản tin ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ADD EVENT / BOOKING (LÊN LỊCH SỰ KIỆN NHÀ VĂN HÓA)
          ======================================================== */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-50 via-white to-teal-50/50 p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-700">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800">Lên lịch hoạt động & Đặt chỗ Nhà văn hóa</h3>
                  <p className="text-xs text-slate-500 font-normal">Quản lý không gian sinh hoạt cộng đồng, hội họp dân cư</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEventModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddEventSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
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
                  <label className="text-xs font-semibold text-slate-700 block">Địa điểm mượn *</label>
                  <input 
                    type="text" 
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
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

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <p><strong>Quy định sử dụng:</strong> Các tổ chức có trách nhiệm giữ gìn vệ sinh, tắt toàn bộ điều hòa, thiết bị điện trước khi bàn giao chìa khóa cho Tổ quản lý Nhà văn hóa.</p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  Đăng ký Đặt chỗ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: VIEW NEWS DETAILS (ĐỌC BÀI VIẾT BÁO ĐIỆN TỬ CHI TIẾT)
          ======================================================== */}
      {selectedNewsForModal && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Reader Header */}
            <div className="bg-white px-5 sm:px-7 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-black px-2.5 py-0.5 rounded-full border ${getCategoryTheme(selectedNewsForModal.category).pill}`}>
                  {selectedNewsForModal.category}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-500 font-medium">Mã tin: {selectedNewsForModal.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyShareLink(selectedNewsForModal)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  title="Sao chép liên kết chia sẻ"
                >
                  {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
                  <span className="hidden sm:inline">{copiedLink ? "Đã sao chép!" : "Chia sẻ"}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  title="In bản tin này"
                >
                  <Printer size={16} />
                  <span className="hidden sm:inline">In tin</span>
                </button>
                <button 
                  onClick={() => setSelectedNewsForModal(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Reader Article Body (Scrollable) */}
            <div className="px-5 sm:px-8 py-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Article Headline */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {selectedNewsForModal.title}
              </h1>

              {/* Author & Timestamp Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                    {selectedNewsForModal.author.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{selectedNewsForModal.author}</span>
                    <span className="text-[11px] text-slate-400">Cơ quan / Ban hành truyền thông</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={13} className="text-slate-400" /> {selectedNewsForModal.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" /> {getNewsReadTime(selectedNewsForModal)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={13} className="text-slate-400" /> {getNewsViews(selectedNewsForModal)} lượt đọc
                  </span>
                </div>
              </div>

              {/* Featured Cover Photo with Caption */}
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm space-y-2">
                <div className="aspect-video w-full bg-slate-100">
                  <img 
                    src={getNewsImage(selectedNewsForModal)} 
                    alt={selectedNewsForModal.title}
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-500 italic text-center border-t border-slate-100">
                  Hình ảnh tư liệu hoạt động thực tế trên địa bàn Khu phố 3, Phường An Phú
                </div>
              </div>

              {/* Lead Summary Sa-pô */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border-l-4 border-emerald-600 text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
                {getNewsSummary(selectedNewsForModal)}
              </div>

              {/* Full Article Text Content */}
              <div className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-3 font-normal">
                {selectedNewsForModal.content}
              </div>

              {/* Image Gallery if present */}
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

              {/* Attached Official Document File */}
              {selectedNewsForModal.attachedFile && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                      <FileText size={22} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {selectedNewsForModal.attachedFile.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Văn bản đính kèm có dấu đỏ • {selectedNewsForModal.attachedFile.size || "1.2 MB"}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert(`Đang tải tệp: ${selectedNewsForModal.attachedFile?.name}`)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <Download size={14} /> Tải văn bản
                  </button>
                </div>
              )}

              {/* Editorial / Signature Note */}
              <div className="pt-4 border-t border-slate-100 flex justify-end text-right">
                <div>
                  <span className="text-[11px] text-slate-400 italic block">Ban Biên tập Cổng thông tin Khu phố 3</span>
                  <span className="text-xs font-bold text-slate-700">Trân trọng thông báo tới toàn thể bà con cư dân</span>
                </div>
              </div>
            </div>

            {/* Reader Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                onClick={() => {
                  const target = selectedNewsForModal;
                  setSelectedNewsForModal(null);
                  handleOpenEditNews(target);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={14} /> Chỉnh sửa bài này
              </button>

              <button
                onClick={() => setSelectedNewsForModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Đóng bài viết
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
