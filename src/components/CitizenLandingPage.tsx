import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bot,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Eye,
  FileText,
  Inbox,
  Info,
  LocateFixed,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Users,
  X,
  Home,
  Briefcase,
  Coins
} from "lucide-react";
import { AdministrativeForm, CommunityEvent, FieldReport, LocalNews } from "../types";

/* ==========================================================================
   CỔNG NGƯỜI DÂN — LANDING PAGE KHU PHỐ 3, PHƯỜNG AN PHÚ
   Nguyên tắc dữ liệu:
   - Hiển thị dữ liệu trực tiếp từ hệ thống quản lý Khu phố 3 (props).
   - Tự động đồng bộ các bài viết tin tức, thông báo khẩn do Cán bộ ban hành.
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
  /** Mở màn hình đăng nhập hiện hữu (LoginAndRegister) để vào Cổng cán bộ */
  onOpenStaffLogin?: () => void;
  onSwitchToCanBo?: () => void;
  onNavigateToTab: (tab: any) => void;
}

/** Thông tin đã xác minh trong AGENTS.md — chỉ họ tên & chức danh, không có SĐT/ảnh. */
const VERIFIED_LEADERSHIP = [
  { name: "Nguyễn Văn Hùng", role: "Bí thư Chi bộ", scope: "Chi bộ Khu phố 3" },
  { name: "Lê Thị Mai", role: "Trưởng Khu phố", scope: "Ban Điều hành Khu phố 3" },
  { name: "Đại úy Trần Quốc Hải", role: "Công an khu vực", scope: "Công an Phường An Phú (phụ trách địa bàn KP3)" }
];

const PUBLIC_CONTACT_EMAIL = "bdhkhupho3.ap@gmail.com";

/** Thông báo chính thức: hệ thống chưa có mô hình dữ liệu/quy trình duyệt riêng. */
const APPROVED_NOTICES: { id: string; title: string; date: string; source: string; category: string; pinned?: boolean; content: string }[] = [];

const REPORT_CATEGORIES: { id: FieldReport["category"]; label: string }[] = [
  { id: "Rác thải", label: "Rác & môi trường" },
  { id: "Lấn chiếm lòng đường", label: "Lấn chiếm vỉa hè" },
  { id: "Tiếng ồn", label: "Tiếng ồn" },
  { id: "Hạ tầng đô thị", label: "Đèn, cống, hẻm" },
  { id: "An ninh trật tự", label: "An ninh trật tự" }
];

const FORM_CATEGORIES = ["Tất cả", "Cư trú & Hộ khẩu", "Địa chính & Nhà ở", "Hộ kinh doanh", "Hộ tịch & Tư pháp", "An sinh xã hội", "Tổ dân phố & Chi bộ"];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SUBMIT_COOLDOWN_MS = 60 * 1000;
const MAX_SUBMISSIONS_PER_DAY = 5;
const RATE_KEY = "kp3_report_submissions";

const NAV_ITEMS = [
  { id: "services", label: "Tiện ích" },
  { id: "reflection", label: "Phản ánh" },
  { id: "forms", label: "Biểu mẫu" },
  { id: "notices", label: "Thông báo" },
  { id: "news", label: "Tin tức" },
  { id: "leadership", label: "Cán bộ" },
  { id: "schedule", label: "Lịch hoạt động" }
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

function readSubmissionLog(): number[] {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return Array.isArray(arr) ? arr.filter(t => typeof t === "number" && t > dayAgo) : [];
  } catch {
    return [];
  }
}

/* ---------------------------- Shared UI pieces ---------------------------- */

function SectionHeader({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-gov-blue" aria-hidden="true">{icon}</span>
          <h2 className="text-lg sm:text-xl font-black text-gov-navy tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="py-10 px-6 text-center rounded-2xl border border-dashed border-slate-300 bg-gov-light space-y-3" role="status">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center" aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-bold text-gov-text text-sm">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-gov-light">
          <h3 className="font-bold text-gov-text text-base leading-snug">{title}</h3>
          <button ref={closeRef} onClick={onClose} aria-label="Đóng" className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto text-sm text-slate-700 space-y-4">{children}</div>
        {footer && <div className="p-4 border-t border-slate-100 bg-gov-light flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

const btnPrimary = "inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl text-sm font-bold text-white bg-gov-blue hover:bg-gov-navy active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const btnGhost = "inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl text-sm font-semibold text-gov-text bg-white border border-slate-200 hover:border-gov-blue hover:text-gov-blue transition-colors cursor-pointer";
const inputCls = "w-full min-h-11 px-3.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-gov-blue aria-[invalid=true]:border-gov-danger";

/* ================================ Component ================================ */

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
  onNavigateToTab
}: CitizenLandingPageProps) {
  const handleOpenStaff = () => {
    if (onSwitchToCanBo) {
      onSwitchToCanBo();
    } else if (onOpenStaffLogin) {
      onOpenStaffLogin();
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Global search
  const [portalSearch, setPortalSearch] = useState("");

  // Forms
  const [formCategory, setFormCategory] = useState("Tất cả");
  const [formQuery, setFormQuery] = useState("");
  const [previewForm, setPreviewForm] = useState<AdministrativeForm | null>(null);

  // Detail modals
  const [eventDetail, setEventDetail] = useState<CommunityEvent | null>(null);
  const [newsDetail, setNewsDetail] = useState<LocalNews | null>(null);

  // Report form
  const [repCategory, setRepCategory] = useState<FieldReport["category"]>("Rác thải");
  const [repTitle, setRepTitle] = useState("");
  const [repLocation, setRepLocation] = useState("");
  const [repDescription, setRepDescription] = useState("");
  const [repAnonymous, setRepAnonymous] = useState(false);
  const [repName, setRepName] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repImage, setRepImage] = useState("");
  const [repConsent, setRepConsent] = useState(false);
  const [repHoneypot, setRepHoneypot] = useState("");
  const [repErrors, setRepErrors] = useState<Record<string, string>>({});
  const [repLoading, setRepLoading] = useState(false);
  const [repSubmittedId, setRepSubmittedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const goTo = (id: string) => {
    setMobileMenuOpen(false);
    scrollToSection(id);
  };

  /* ------------------------------ Derived data ------------------------------ */

  const filteredForms = useMemo(() => {
    const q = formQuery.trim().toLowerCase();
    return forms.filter(f =>
      (formCategory === "Tất cả" || f.category === formCategory) &&
      (!q || f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
    );
  }, [forms, formCategory, formQuery]);

  // Lịch hoạt động: sự kiện sắp/đang diễn ra. Tin tức: hoạt động đã diễn ra.
  const upcomingEvents = events.filter(e => e.status === "Sắp diễn ra" || e.status === "Đang diễn ra");
  const pastEvents = events.filter(e => e.status === "Đã kết thúc");
  const recentReports = reports.slice(0, 3);

  // Thông báo chính thức & tin khẩn: lấy từ danh sách news có isPinned hoặc Thông báo khẩn / Hành chính
  const displayNotices = useMemo(() => {
    if (news && news.length > 0) {
      const pinnedOrUrgent = news.filter(n => n.isPinned || n.category === "Thông báo khẩn" || n.category === "Hành chính");
      return pinnedOrUrgent.length > 0 ? pinnedOrUrgent : news.slice(0, 4);
    }
    return [];
  }, [news]);

  // Tin tức cộng đồng: toàn bộ bài viết mới nhất do cán bộ đăng
  const displayNews = useMemo(() => {
    if (news && news.length > 0) return news;
    return [];
  }, [news]);

  const searchResults = useMemo(() => {
    const q = portalSearch.trim().toLowerCase();
    if (q.length < 2) return null;
    return {
      forms: forms.filter(f => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)).slice(0, 5),
      events: events.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)).slice(0, 5),
      leaders: VERIFIED_LEADERSHIP.filter(l => l.name.toLowerCase().includes(q) || l.role.toLowerCase().includes(q))
    };
  }, [portalSearch, forms, events]);

  /* ------------------------------- Handlers ------------------------------- */

  const handleDownloadForm = (form: AdministrativeForm) => {
    // Tái sử dụng nội dung mẫu đơn có sẵn trong hệ thống (templateContent)
    const blob = new Blob(["\uFEFF" + form.templateContent], { type: "application/msword;charset=utf-8" });
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

  const handleImageChange = (file?: File) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setRepErrors(prev => ({ ...prev, image: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP." }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setRepErrors(prev => ({ ...prev, image: "Ảnh vượt quá dung lượng tối đa 5 MB." }));
      return;
    }
    setRepErrors(prev => {
      const { image, ...rest } = prev;
      return rest;
    });
    const reader = new FileReader();
    reader.onload = () => setRepImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      showToast("Trình duyệt không hỗ trợ định vị.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coord = `(${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`;
        setRepLocation(prev => (prev ? `${prev} ${coord}` : `Tọa độ ${coord}`));
        setLocating(false);
      },
      () => {
        setLocating(false);
        showToast("Không lấy được vị trí. Vui lòng nhập địa chỉ thủ công.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (repHoneypot) return; // chặn bot đơn giản

    const errors: Record<string, string> = {};
    const title = repTitle.trim();
    const location = repLocation.trim();
    const description = repDescription.trim();

    if (title.length < 5 || title.length > 150) errors.title = "Tiêu đề cần từ 5 đến 150 ký tự.";
    if (location.length < 5) errors.location = "Vui lòng nhập vị trí cụ thể (số nhà, hẻm, tuyến đường).";
    if (description.length < 20 || description.length > 2000) errors.description = "Nội dung cần từ 20 đến 2.000 ký tự.";
    if (!repAnonymous) {
      if (repName.trim().length < 2) errors.name = "Vui lòng nhập họ tên hoặc chọn gửi ẩn danh.";
      if (!/^0\d{9,10}$/.test(repPhone.trim())) errors.phone = "Số điện thoại cần 10–11 chữ số, bắt đầu bằng 0.";
    }
    if (!repConsent) errors.consent = "Vui lòng xác nhận đã đọc thông tin về quyền riêng tư.";

    if (Object.keys(errors).length) {
      setRepErrors(errors);
      showToast("Vui lòng kiểm tra lại các trường được đánh dấu.", "error");
      return;
    }

    const log = readSubmissionLog();
    const last = log[log.length - 1];
    if (last && Date.now() - last < SUBMIT_COOLDOWN_MS) {
      const wait = Math.ceil((SUBMIT_COOLDOWN_MS - (Date.now() - last)) / 1000);
      showToast(`Bạn vừa gửi phản ánh. Vui lòng chờ ${wait} giây trước khi gửi tiếp.`, "error");
      return;
    }
    if (log.length >= MAX_SUBMISSIONS_PER_DAY) {
      showToast(`Mỗi thiết bị gửi tối đa ${MAX_SUBMISSIONS_PER_DAY} phản ánh/ngày. Vui lòng liên hệ trực tiếp Ban Điều hành.`, "error");
      return;
    }

    setRepErrors({});
    setRepLoading(true);

    const now = new Date();
    const timeStr = now.toLocaleString("vi-VN", { hour12: false });
    const id = `RP-${now.getTime().toString().slice(-8)}`;
    const reporterName = repAnonymous ? "Người dân (ẩn danh)" : repName.trim();

    const newReport: FieldReport = {
      id,
      title,
      category: repCategory,
      reporterName,
      reporterPhone: repAnonymous ? "" : repPhone.trim(),
      reportedAt: now.toLocaleString("vi-VN", { hour12: false }).replace(/\//g, "-"),
      location,
      // Toạ độ sơ đồ nội bộ (0–100) theo quy ước của module FieldReflections
      coordinates: { x: 50, y: 50 },
      description,
      status: "Đã tiếp nhận",
      beforeImage: repImage || undefined,
      timeline: [
        {
          time: timeStr,
          title: "Tiếp nhận phản ánh từ Cổng người dân",
          description: `Phản ánh được gửi qua Cổng người dân${repAnonymous ? " (chế độ ẩn danh)" : ""}.`,
          actor: reporterName
        }
      ]
    };

    try {
      onAddReport(newReport);
      localStorage.setItem(RATE_KEY, JSON.stringify([...log, now.getTime()]));
      setRepSubmittedId(id);
      setRepTitle("");
      setRepLocation("");
      setRepDescription("");
      setRepImage("");
      setRepConsent(false);
      showToast(`Đã gửi phản ánh. Mã hồ sơ: ${id}`);
    } catch {
      showToast("Gửi phản ánh không thành công. Vui lòng thử lại.", "error");
    } finally {
      setRepLoading(false);
    }
  };

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="min-h-screen bg-gov-light text-gov-text font-sans antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow">
        Bỏ qua đến nội dung chính
      </a>

      {/* ------------------------------ HEADER ------------------------------ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <button onClick={() => window.scrollTo({ top: 0 })} className="flex items-center gap-3 text-left cursor-pointer min-h-11" aria-label="Về đầu trang">
            <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-gov-navy to-gov-blue text-white flex items-center justify-center shadow-md" aria-hidden="true">
              <Building2 size={22} />
            </span>
            <span className="flex flex-col">
              <span className="text-sm sm:text-lg font-black text-gov-navy tracking-tight leading-tight">Khu phố 3 – Phường An Phú</span>
              <span className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">Cổng thông tin cộng đồng & tiện ích số</span>
            </span>
          </button>

          <nav aria-label="Điều hướng chính" className="hidden xl:flex items-center gap-0.5">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => goTo(item.id)} className="min-h-11 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:text-gov-blue hover:bg-slate-100 transition-colors cursor-pointer">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenStaff}
              className="hidden sm:inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-sm font-semibold text-gov-navy border border-gov-navy/30 hover:bg-gov-navy hover:text-white transition-colors cursor-pointer"
            >
              <LockKeyhole size={15} aria-hidden="true" />
              Cổng dành cho cán bộ
            </button>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="xl:hidden min-w-11 min-h-11 flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 cursor-pointer"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-nav" className="xl:hidden border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-lg">
            <nav aria-label="Điều hướng di động" className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => goTo(item.id)} className="min-h-12 px-3 rounded-xl text-sm font-semibold text-left text-slate-700 bg-gov-light hover:text-gov-blue cursor-pointer">
                  {item.label}
                </button>
              ))}
            </nav>
            <button onClick={() => { setMobileMenuOpen(false); handleOpenStaff(); }} className={`${btnPrimary} w-full mt-3 bg-gov-navy`}>
              <LockKeyhole size={16} aria-hidden="true" /> Cổng dành cho cán bộ
            </button>
          </div>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* ------------------------------- HERO ------------------------------- */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gov-navy via-[#0a4a8c] to-gov-blue text-white">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-20 sm:pb-24 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6 kp3-fade-up">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-blue-100">
                Khu phố 3 · Phường An Phú · TP. Hồ Chí Minh
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                Kết nối người dân – Xây dựng khu phố văn minh
              </h1>
              <p className="text-base sm:text-lg text-blue-100 leading-relaxed max-w-2xl">
                Gửi phản ánh hiện trường, tra cứu biểu mẫu hành chính, theo dõi hoạt động cộng đồng và thông tin liên hệ Ban Điều hành Khu phố 3 — ngay trên điện thoại.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => goTo("reflection")} className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl text-base font-bold bg-white text-gov-navy hover:bg-blue-50 shadow-lg transition-all cursor-pointer">
                  <MessageSquare size={18} aria-hidden="true" /> Phản ánh hiện trường
                </button>
                <button onClick={() => goTo("forms")} className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl text-base font-semibold bg-white/10 border border-white/30 hover:bg-white/20 transition-all cursor-pointer">
                  <FileText size={18} aria-hidden="true" /> Tra cứu biểu mẫu
                </button>
              </div>

              {/* Tìm kiếm toàn cổng */}
              <div className="relative max-w-xl">
                <label htmlFor="portal-search" className="sr-only">Tìm kiếm biểu mẫu, hoạt động, cán bộ</label>
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="portal-search"
                  type="search"
                  value={portalSearch}
                  onChange={e => setPortalSearch(e.target.value)}
                  placeholder="Tìm biểu mẫu, hoạt động, cán bộ…"
                  className="w-full min-h-12 pl-11 pr-4 rounded-xl text-sm text-gov-text bg-white border-0 shadow-lg focus:outline-none"
                />
                {searchResults && (
                  <div className="absolute left-0 right-0 mt-2 bg-white text-gov-text rounded-2xl shadow-2xl border border-slate-200 p-2 max-h-80 overflow-y-auto z-30" role="listbox" aria-label="Kết quả tìm kiếm">
                    {searchResults.forms.length + searchResults.events.length + searchResults.leaders.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500">Không tìm thấy kết quả cho “{portalSearch}”.</p>
                    ) : (
                      <>
                        {searchResults.forms.map(f => (
                          <button key={f.id} onClick={() => { setPreviewForm(f); setPortalSearch(""); }} className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer">
                            <FileText size={15} className="text-gov-blue shrink-0" aria-hidden="true" /><span className="truncate">{f.code} — {f.title}</span>
                          </button>
                        ))}
                        {searchResults.events.map(ev => (
                          <button key={ev.id} onClick={() => { setEventDetail(ev); setPortalSearch(""); }} className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer">
                            <Calendar size={15} className="text-gov-blue shrink-0" aria-hidden="true" /><span className="truncate">{ev.title}</span>
                          </button>
                        ))}
                        {searchResults.leaders.map(l => (
                          <button key={l.name} onClick={() => { setPortalSearch(""); goTo("leadership"); }} className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer">
                            <Users size={15} className="text-gov-blue shrink-0" aria-hidden="true" /><span className="truncate">{l.name} — {l.role}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hero graphic: số liệu địa bàn đã xác minh (AGENTS.md) */}
            <div className="lg:col-span-5 kp3-fade-up [animation-delay:120ms]">
              <div className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                  <Compass size={16} aria-hidden="true" /> Quy mô địa bàn Khu phố 3
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Home size={18} />, value: households?.length ? households.length.toLocaleString("vi-VN") : "488", label: "Hộ gia đình" },
                    { icon: <Users size={18} />, value: residents?.length ? residents.length.toLocaleString("vi-VN") : "11.632", label: "Nhân khẩu" },
                    { icon: <Briefcase size={18} />, value: businesses?.length ? businesses.length.toLocaleString("vi-VN") : "118", label: "Cơ sở kinh doanh" }
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl bg-white/10 p-3 text-center">
                      <span className="text-blue-200 flex justify-center" aria-hidden="true">{s.icon}</span>
                      <dd className="text-xl sm:text-2xl font-black mt-1">{s.value}</dd>
                      <dt className="text-[11px] text-blue-100">{s.label}</dt>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  Địa bàn khép kín theo các trục đường Song Hành, Lương Định Của, Mai Chí Thọ.
                </p>
                <button onClick={() => onNavigateToTab("gis")} className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-semibold cursor-pointer">
                  <MapPin size={16} aria-hidden="true" /> Xem bản đồ số địa bàn
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------- QUICK SERVICES -------------------------- */}
        <section id="services" tabIndex={-1} aria-labelledby="services-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
            <h2 id="services-title" className="text-lg font-black text-gov-navy">Tiện ích nhanh</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { id: "reflection", icon: <MessageSquare size={22} />, title: "Phản ánh hiện trường", desc: "Gửi phản ánh kèm ảnh, vị trí tới Ban Điều hành.", accent: "bg-gov-blue" },
                { id: "forms", icon: <FileText size={22} />, title: "Biểu mẫu & hướng dẫn", desc: `${forms.length} biểu mẫu hành chính tải về.`, accent: "bg-emerald-600" },
                { id: "leadership", icon: <ShieldCheck size={22} />, title: "Cơ cấu cán bộ", desc: "Thường trực Chi bộ, Ban Điều hành, CSKV.", accent: "bg-indigo-600" },
                { id: "notices", icon: <Bell size={22} />, title: "Thông báo", desc: "Thông báo đã duyệt, còn hiệu lực.", accent: "bg-amber-600" },
                { id: "news", icon: <Compass size={22} />, title: "Tin tức địa phương", desc: "Hoạt động cộng đồng đã diễn ra.", accent: "bg-teal-600" },
                { id: "schedule", icon: <Calendar size={22} />, title: "Lịch hoạt động", desc: "Sự kiện sắp và đang diễn ra.", accent: "bg-gov-danger" }
              ].map(card => (
                <button
                  key={card.id}
                  onClick={() => goTo(card.id)}
                  className="group text-left p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-gov-blue hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col sm:flex-row items-start gap-3 min-h-11"
                >
                  <span className={`w-11 h-11 rounded-xl ${card.accent} text-white flex items-center justify-center shrink-0`} aria-hidden="true">{card.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 font-bold text-sm sm:text-base text-gov-navy group-hover:text-gov-blue">
                      {card.title} <ChevronRight size={16} className="hidden sm:inline" aria-hidden="true" />
                    </span>
                    <span className="block text-xs sm:text-sm text-slate-500 mt-1 leading-snug">{card.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => onNavigateToTab("ai")} className={btnGhost}><Bot size={16} aria-hidden="true" /> Trợ lý AI hỏi đáp thủ tục</button>
              <button onClick={() => onNavigateToTab("finance")} className={btnGhost}><Coins size={16} aria-hidden="true" /> Quỹ khu phố & VietQR</button>
              <button onClick={() => onNavigateToTab("gis")} className={btnGhost}><MapPin size={16} aria-hidden="true" /> Bản đồ số GIS</button>
            </div>
          </div>
        </section>

        {/* ---------------------------- REFLECTION ---------------------------- */}
        <section id="reflection" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gov-navy to-gov-blue p-5 sm:p-8 text-white">
              <h2 className="text-xl sm:text-2xl font-black">Phản ánh hiện trường</h2>
              <p className="text-sm sm:text-base text-blue-100 mt-1 max-w-2xl">
                Vệ sinh môi trường, lấn chiếm vỉa hè, tiếng ồn, hạ tầng hay an ninh trật tự — phản ánh được chuyển vào hệ thống tiếp nhận của Ban Điều hành Khu phố 3.
              </p>
            </div>

            <div className="p-5 sm:p-8 space-y-8">
              {repSubmittedId ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3" role="status" aria-live="polite">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-600" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-emerald-900">Đã gửi phản ánh thành công</h3>
                  <p className="text-sm text-slate-600">Vui lòng lưu mã hồ sơ để tra cứu khi cần:</p>
                  <p className="inline-block px-4 py-2 rounded-xl bg-white border border-emerald-300 font-mono font-bold text-emerald-800">{repSubmittedId}</p>
                  <div><button onClick={() => setRepSubmittedId(null)} className={btnPrimary}>Gửi phản ánh khác</button></div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} noValidate className="space-y-6">
                  {/* honeypot */}
                  <input 
                    id="rep-honeypot"
                    name="honeypot"
                    type="text" 
                    tabIndex={-1} 
                    autoComplete="off" 
                    value={repHoneypot} 
                    onChange={e => setRepHoneypot(e.target.value)} 
                    className="hidden" 
                    aria-hidden="true" 
                  />

                  <fieldset>
                    <legend className="text-sm font-bold text-gov-text mb-2">1. Nhóm vấn đề <span className="text-gov-danger">*</span></legend>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {REPORT_CATEGORIES.map(c => (
                        <label key={c.id} className={`min-h-12 flex items-center justify-center text-center px-3 rounded-xl border text-sm font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gov-blue ${repCategory === c.id ? "bg-gov-navy text-white border-gov-navy" : "bg-white text-slate-700 border-slate-300 hover:border-gov-blue"}`}>
                          <input type="radio" name="rep-category" value={c.id} checked={repCategory === c.id} onChange={() => setRepCategory(c.id)} className="sr-only" />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="rep-title" className="text-sm font-bold block">2. Tiêu đề <span className="text-gov-danger">*</span></label>
                      <input id="rep-title" value={repTitle} onChange={e => setRepTitle(e.target.value)} maxLength={150} aria-invalid={!!repErrors.title} aria-describedby="rep-title-err" className={inputCls} placeholder="VD: Rác tồn đọng đầu hẻm chưa thu gom" />
                      {repErrors.title && <p id="rep-title-err" className="text-xs text-gov-danger">{repErrors.title}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="rep-location" className="text-sm font-bold block">3. Vị trí <span className="text-gov-danger">*</span></label>
                      <div className="flex gap-2">
                        <input id="rep-location" value={repLocation} onChange={e => setRepLocation(e.target.value)} aria-invalid={!!repErrors.location} aria-describedby="rep-location-err" className={inputCls} placeholder="Số nhà, hẻm, tuyến đường" />
                        <button type="button" onClick={handleUseCurrentLocation} disabled={locating} className={`${btnGhost} shrink-0 px-3`} aria-label="Dùng vị trí hiện tại" title="Dùng vị trí hiện tại">
                          <LocateFixed size={18} className={locating ? "animate-pulse" : ""} />
                        </button>
                      </div>
                      {repErrors.location && <p id="rep-location-err" className="text-xs text-gov-danger">{repErrors.location}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="rep-desc" className="text-sm font-bold block">4. Nội dung phản ánh <span className="text-gov-danger">*</span></label>
                    <textarea id="rep-desc" rows={4} value={repDescription} onChange={e => setRepDescription(e.target.value)} maxLength={2000} aria-invalid={!!repErrors.description} aria-describedby="rep-desc-err rep-desc-count" className={`${inputCls} py-3`} placeholder="Mô tả thời điểm, mức độ ảnh hưởng…" />
                    <div className="flex justify-between text-xs">
                      <span id="rep-desc-err" className="text-gov-danger">{repErrors.description}</span>
                      <span id="rep-desc-count" className="text-slate-400">{repDescription.length}/2000</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-sm font-bold block">5. Ảnh hiện trường (tuỳ chọn · JPG/PNG/WebP · tối đa 5 MB)</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <label htmlFor="rep-image-file" className={`${btnGhost} border-dashed cursor-pointer`}>
                        <Camera size={18} aria-hidden="true" /> Chọn ảnh
                        <input 
                          id="rep-image-file"
                          name="repImageFile"
                          type="file" 
                          accept={ALLOWED_IMAGE_TYPES.join(",")} 
                          capture="environment" 
                          className="sr-only" 
                          aria-label="Chọn hoặc chụp ảnh hiện trường"
                          onChange={e => handleImageChange(e.target.files?.[0])} 
                        />
                      </label>
                      {repImage && (
                        <div className="flex items-center gap-2 p-1.5 bg-gov-light rounded-xl border border-slate-200">
                          <img src={repImage} alt="Ảnh hiện trường đã chọn" className="w-12 h-12 rounded-lg object-cover" />
                          <button type="button" onClick={() => setRepImage("")} className="min-w-11 min-h-11 flex items-center justify-center text-slate-500 hover:text-gov-danger cursor-pointer" aria-label="Xoá ảnh"><X size={16} /></button>
                        </div>
                      )}
                    </div>
                    {repErrors.image && <p className="text-xs text-gov-danger">{repErrors.image}</p>}
                  </div>

                  <fieldset className="p-4 rounded-2xl bg-gov-light border border-slate-200 space-y-3">
                    <legend className="text-sm font-bold px-1">6. Chế độ gửi</legend>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {[{ v: false, t: "Có thông tin liên hệ", d: "Cán bộ có thể liên hệ xác minh và báo kết quả." }, { v: true, t: "Ẩn danh", d: "Không lưu họ tên, số điện thoại. Không nhận được phản hồi." }].map(o => (
                        <label key={String(o.v)} className={`p-3 rounded-xl border cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gov-blue ${repAnonymous === o.v ? "border-gov-blue bg-white" : "border-slate-200 bg-white/60"}`}>
                          <input type="radio" name="rep-mode" checked={repAnonymous === o.v} onChange={() => setRepAnonymous(o.v)} className="sr-only" />
                          <span className="font-semibold text-sm block">{o.t}</span>
                          <span className="text-xs text-slate-500">{o.d}</span>
                        </label>
                      ))}
                    </div>
                    {!repAnonymous && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="rep-name" className="sr-only">Họ và tên</label>
                          <input id="rep-name" value={repName} onChange={e => setRepName(e.target.value)} autoComplete="name" aria-invalid={!!repErrors.name} placeholder="Họ và tên *" className={inputCls} />
                          {repErrors.name && <p className="text-xs text-gov-danger mt-1">{repErrors.name}</p>}
                        </div>
                        <div>
                          <label htmlFor="rep-phone" className="sr-only">Số điện thoại</label>
                          <input id="rep-phone" type="tel" inputMode="numeric" value={repPhone} onChange={e => setRepPhone(e.target.value)} autoComplete="tel" aria-invalid={!!repErrors.phone} placeholder="Số điện thoại *" className={inputCls} />
                          {repErrors.phone && <p className="text-xs text-gov-danger mt-1">{repErrors.phone}</p>}
                        </div>
                      </div>
                    )}
                  </fieldset>

                  <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2">
                    <p className="text-sm font-bold text-gov-navy flex items-center gap-2"><Shield size={16} aria-hidden="true" /> Thông tin về quyền riêng tư</p>
                    <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                      <li>Thông tin chỉ dùng để tiếp nhận, xác minh và xử lý phản ánh này.</li>
                      <li>Chỉ cán bộ có thẩm quyền trong hệ thống được xem họ tên, số điện thoại.</li>
                      <li>Không chụp rõ mặt người khác hoặc giấy tờ cá nhân trong ảnh gửi kèm.</li>
                    </ul>
                    <label className="flex items-start gap-2 pt-1 text-sm cursor-pointer min-h-11">
                      <input 
                        id="rep-consent"
                        name="repConsent"
                        type="checkbox" 
                        checked={repConsent} 
                        onChange={e => setRepConsent(e.target.checked)} 
                        className="mt-1 w-5 h-5 accent-gov-blue" 
                        aria-invalid={!!repErrors.consent} 
                        aria-label="Tôi đã đọc và đồng ý với điều khoản sử dụng thông tin phản ánh"
                      />
                      <span>Tôi đã đọc và đồng ý với cách sử dụng thông tin nêu trên. <span className="text-gov-danger">*</span></span>
                    </label>
                    {repErrors.consent && <p className="text-xs text-gov-danger">{repErrors.consent}</p>}
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" disabled={repLoading} className={btnPrimary}>
                      <Send size={16} aria-hidden="true" /> {repLoading ? "Đang gửi…" : "Gửi phản ánh"}
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-6 border-t border-slate-100 space-y-3">
                <h3 className="text-sm font-bold text-gov-text">Phản ánh gần đây trong hệ thống</h3>
                {recentReports.length === 0 ? (
                  <EmptyState icon={<Inbox size={22} />} title="Chưa có phản ánh" description="Các phản ánh đã tiếp nhận sẽ hiển thị tại đây." />
                ) : (
                  <ul className="grid md:grid-cols-3 gap-3">
                    {recentReports.map(r => (
                      <li key={r.id} className="p-4 rounded-2xl bg-gov-light border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gov-navy bg-blue-100 px-2 py-0.5 rounded">{r.category}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === "Đã giải quyết" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{r.status}</span>
                        </div>
                        <p className="font-semibold text-sm line-clamp-1">{r.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> <span className="truncate">{r.location}</span></p>
                        <p className="text-xs text-slate-400">{r.reportedAt}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------- FORMS ------------------------------- */}
        <section id="forms" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
            <SectionHeader
              icon={<FileText size={20} />}
              title="Kho biểu mẫu"
              subtitle="Biểu mẫu công khai trong hệ thống. Bấm “Hướng dẫn” để xem hồ sơ cần chuẩn bị."
              action={<button onClick={() => onNavigateToTab("forms")} className={btnGhost}>Mở trang biểu mẫu đầy đủ <ChevronRight size={16} aria-hidden="true" /></button>}
            />
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative md:w-80">
                <label htmlFor="form-search" className="sr-only">Tìm biểu mẫu</label>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="form-search" type="search" value={formQuery} onChange={e => setFormQuery(e.target.value)} placeholder="Tìm theo tên hoặc mã…" className={`${inputCls} pl-9`} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo nhóm thủ tục">
                {FORM_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setFormCategory(c)} aria-pressed={formCategory === c} className={`min-h-11 px-3 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer ${formCategory === c ? "bg-gov-navy text-white" : "bg-gov-light text-slate-700 hover:bg-slate-200"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {filteredForms.length === 0 ? (
              <EmptyState icon={<FileText size={22} />} title="Không có biểu mẫu phù hợp" description="Thử từ khóa khác hoặc chọn nhóm “Tất cả”." action={<button onClick={() => { setFormQuery(""); setFormCategory("Tất cả"); }} className={btnGhost}>Xoá bộ lọc</button>} />
            ) : (
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredForms.map(f => (
                  <li key={f.id} className="p-4 rounded-2xl border border-slate-200 hover:border-gov-blue hover:shadow-md transition-all flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-bold text-gov-navy bg-blue-100 px-2 py-0.5 rounded">{f.code}</span>
                        <span className="text-slate-500">{f.fileFormat} · {f.fileSize}</span>
                      </div>
                      <h3 className="font-bold text-sm text-gov-navy line-clamp-2">{f.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{f.description}</p>
                      <p className="text-xs text-slate-500">Nơi tiếp nhận: <span className="text-gov-text">{f.issuingBody}</span></p>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => setPreviewForm(f)} className={`${btnGhost} flex-1`}><Eye size={16} aria-hidden="true" /> Hướng dẫn</button>
                      <button onClick={() => handleDownloadForm(f)} className={`${btnPrimary} flex-1`}><Download size={16} aria-hidden="true" /> Tải về</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ------------------------------ NOTICES ------------------------------ */}
        <section id="notices" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
            <SectionHeader 
              icon={<Bell size={20} />} 
              title="Thông báo Khu phố" 
              subtitle="Thông báo chỉ đạo, lịch tiếp dân và cảnh báo khẩn đã được Ban Điều hành phê duyệt." 
            />
            {displayNotices.length === 0 ? (
              <EmptyState
                icon={<Bell size={22} />}
                title="Chưa có thông báo được công bố"
                description="Khi Ban Điều hành duyệt và công bố thông báo, nội dung sẽ hiển thị tại đây. Trong lúc chờ, bạn có thể xem các hoạt động cộng đồng."
                action={<button onClick={() => goTo("schedule")} className={btnGhost}>Xem lịch hoạt động</button>}
              />
            ) : (
              <ul className="grid md:grid-cols-2 gap-4">
                {[...displayNotices].sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned)).map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => setNewsDetail(n)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 h-full hover:shadow-md ${
                        n.isPinned 
                          ? "border-gov-danger/40 bg-red-50/30 hover:border-gov-danger" 
                          : "border-slate-200 hover:border-gov-blue"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            n.isPinned ? "bg-red-100 text-gov-danger font-bold" : "bg-blue-100 text-gov-navy"
                          }`}>
                            {n.isPinned ? "📌 Ưu tiên" : n.category}
                          </span>
                          <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                            <Clock size={11} /> {n.date}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                          {n.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {n.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                        <span className="truncate max-w-[200px]">Nguồn: <strong className="text-slate-700">{n.author}</strong></span>
                        <span className="text-gov-blue font-bold flex items-center gap-0.5">Chi tiết →</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* -------------------------------- NEWS -------------------------------- */}
        <section id="news" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
            <SectionHeader
              icon={<Compass size={20} />}
              title="Tin tức & Đời sống Khu phố"
              subtitle="Cập nhật tin tức chính sách, phong trào thi đua và hoạt động cộng đồng Khu phố 3."
              action={
                <button onClick={() => onNavigateToTab("cultural")} className={btnGhost}>
                  Xem sự kiện <ChevronRight size={16} aria-hidden="true" />
                </button>
              }
            />
            {displayNews.length === 0 ? (
              <EmptyState 
                icon={<Compass size={22} />} 
                title="Chưa có tin hoạt động" 
                description="Tin tức sẽ được cập nhật khi Ban Điều hành ghi nhận hoạt động đã diễn ra." 
              />
            ) : (
              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayNews.map(item => (
                  <li key={item.id}>
                    <button 
                      onClick={() => setNewsDetail(item)} 
                      className="w-full h-full text-left rounded-2xl border border-slate-200 overflow-hidden hover:border-gov-blue hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-28 bg-gradient-to-br from-gov-navy to-gov-blue flex items-center justify-center text-white/80 relative" aria-hidden="true">
                          <Users size={36} />
                          {item.isPinned && (
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-bold text-[10px] shadow">
                              Ghim
                            </span>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-gov-navy bg-slate-100 px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {item.date}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-gov-text line-clamp-2 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {item.content}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 pt-0 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 mt-2">
                        <span className="truncate max-w-[180px]">Tác giả: {item.author}</span>
                        <span className="text-gov-blue font-bold">Đọc tiếp →</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ----------------------------- LEADERSHIP ----------------------------- */}
        <section id="leadership" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
            <SectionHeader icon={<ShieldCheck size={20} />} title="Cơ cấu tổ chức & cán bộ" subtitle="Thường trực Ban điều hành Khu phố 3." />
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VERIFIED_LEADERSHIP.map(l => (
                <li key={l.name} className="p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-blue-100 text-gov-navy font-black flex items-center justify-center shrink-0" aria-hidden="true">
                    {l.name.split(" ").slice(-1)[0].charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-gov-text">{l.name}</h3>
                    <p className="text-sm font-semibold text-gov-blue">{l.role}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{l.scope}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-4 rounded-2xl bg-gov-light border border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="flex items-start gap-2"><Info size={16} className="text-gov-blue shrink-0 mt-0.5" aria-hidden="true" /> Số điện thoại, ảnh và lịch tiếp dân của từng cán bộ sẽ được bổ sung khi được phê duyệt công khai.</span>
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className={`${btnGhost} shrink-0`}><Mail size={16} aria-hidden="true" /> {PUBLIC_CONTACT_EMAIL}</a>
            </div>
          </div>
        </section>

        {/* ------------------------------ SCHEDULE ------------------------------ */}
        <section id="schedule" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-24 outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
            <SectionHeader
              icon={<Calendar size={20} />}
              title="Lịch hoạt động"
              subtitle="Sự kiện sắp và đang diễn ra — cùng nguồn dữ liệu với phân hệ Tin tức & Sự kiện."
              action={<button onClick={() => onNavigateToTab("cultural")} className={btnGhost}>Xem đầy đủ <ChevronRight size={16} aria-hidden="true" /></button>}
            />
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={<Calendar size={22} />} title="Chưa có lịch hoạt động sắp tới" description="Lịch sẽ hiển thị khi Ban Điều hành cập nhật sự kiện mới." />
            ) : (
              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map(ev => (
                  <li key={ev.id}>
                    <button onClick={() => setEventDetail(ev)} className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-gov-blue transition-colors cursor-pointer space-y-2">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${ev.status === "Đang diễn ra" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-gov-navy"}`}>{ev.status}</span>
                      <h3 className="font-bold text-sm text-gov-text line-clamp-2">{ev.title}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5"><Clock size={13} className="text-gov-blue" aria-hidden="true" /> {ev.dateTime}</p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5"><MapPin size={13} className="text-gov-danger" aria-hidden="true" /> <span className="truncate">{ev.location}</span></p>
                      <p className="text-xs text-slate-500">Phụ trách: {ev.organizer}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------- FOOTER ------------------------------- */}
      <footer className="bg-gov-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3 md:col-span-1">
            <p className="font-black text-base">Khu phố 3 – Phường An Phú</p>
            <p className="text-blue-100/90">Đơn vị phụ trách nội dung: Ban Điều hành Khu phố 3.</p>
            <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="inline-flex items-center gap-2 min-h-11 text-blue-100 hover:text-white underline-offset-4 hover:underline">
              <Mail size={16} aria-hidden="true" /> {PUBLIC_CONTACT_EMAIL}
            </a>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-blue-200 uppercase text-xs tracking-wider">Nguồn tin & dữ liệu</p>
            <p className="text-blue-100/90">Thông báo, lịch hoạt động, biểu mẫu và phản ánh hiển thị từ hệ thống quản lý nội bộ của Khu phố 3. Số liệu quy mô địa bàn do Ban Điều hành cung cấp.</p>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-blue-200 uppercase text-xs tracking-wider">Bảo vệ dữ liệu</p>
            <p className="text-blue-100/90">Thông tin cá nhân trong phản ánh chỉ dùng cho mục đích tiếp nhận và xử lý, chỉ cán bộ có thẩm quyền được truy cập.</p>
            <button onClick={handleOpenStaff} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-semibold cursor-pointer">
              <LockKeyhole size={16} aria-hidden="true" /> Cổng dành cho cán bộ
            </button>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 px-4 text-center text-xs text-blue-200">
          Cổng thông tin cộng đồng do Ban Điều hành Khu phố 3 vận hành · Không phải cổng thông tin điện tử chính thức của cơ quan nhà nước.
        </div>
      </footer>

      {/* ------------------------------- MODALS ------------------------------- */}
      {previewForm && (
        <Modal
          title={`${previewForm.code} — ${previewForm.title}`}
          onClose={() => setPreviewForm(null)}
          footer={<>
            <button onClick={() => setPreviewForm(null)} className={btnGhost}>Đóng</button>
            <button onClick={() => { handleDownloadForm(previewForm); setPreviewForm(null); }} className={btnPrimary}><Download size={16} aria-hidden="true" /> Tải biểu mẫu</button>
          </>}
        >
          <p>{previewForm.description}</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-gov-light">
            <div><dt className="text-xs text-slate-500">Nơi tiếp nhận</dt><dd className="font-semibold">{previewForm.issuingBody}</dd></div>
            <div><dt className="text-xs text-slate-500">Thời gian giải quyết</dt><dd className="font-semibold">{previewForm.processingTime}</dd></div>
            <div><dt className="text-xs text-slate-500">Lệ phí</dt><dd className="font-semibold">{previewForm.fee}</dd></div>
            <div><dt className="text-xs text-slate-500">Định dạng</dt><dd className="font-semibold">{previewForm.fileFormat} · {previewForm.fileSize}</dd></div>
          </dl>
          {previewForm.requiredDocuments.length > 0 && (
            <div>
              <p className="font-bold mb-2">Hồ sơ cần chuẩn bị</p>
              <ul className="list-disc pl-5 space-y-1">{previewForm.requiredDocuments.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
        </Modal>
      )}

      {eventDetail && (
        <Modal title={eventDetail.title} onClose={() => setEventDetail(null)} footer={<button onClick={() => setEventDetail(null)} className={btnPrimary}>Đóng</button>}>
          <dl className="grid sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-gov-light">
            <div><dt className="text-xs text-slate-500">Thời gian</dt><dd className="font-semibold">{eventDetail.dateTime}</dd></div>
            <div><dt className="text-xs text-slate-500">Trạng thái</dt><dd className="font-semibold">{eventDetail.status}</dd></div>
            <div><dt className="text-xs text-slate-500">Địa điểm</dt><dd className="font-semibold">{eventDetail.location}</dd></div>
            <div><dt className="text-xs text-slate-500">Đơn vị phụ trách</dt><dd className="font-semibold">{eventDetail.organizer}</dd></div>
          </dl>
          <p className="leading-relaxed">{eventDetail.description}</p>
        </Modal>
      )}

      {newsDetail && (
        <Modal 
          title={newsDetail.title} 
          onClose={() => setNewsDetail(null)} 
          footer={<button onClick={() => setNewsDetail(null)} className={btnPrimary}>Đóng</button>}
        >
          <dl className="grid sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-gov-light text-xs">
            <div><dt className="text-slate-500">Chuyên mục</dt><dd className="font-semibold text-gov-navy">{newsDetail.category}</dd></div>
            <div><dt className="text-slate-500">Ngày công bố</dt><dd className="font-semibold">{newsDetail.date}</dd></div>
            <div><dt className="text-slate-500">Cơ quan ban hành / Tác giả</dt><dd className="font-semibold text-gov-navy">{newsDetail.author}</dd></div>
            <div><dt className="text-slate-500">Tình trạng</dt><dd className="font-semibold text-emerald-700">{newsDetail.isPinned ? "📌 Thông báo ưu tiên" : "Bản tin chính thức"}</dd></div>
          </dl>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line p-4 rounded-2xl bg-white border border-slate-200">
            {newsDetail.content}
          </div>
        </Modal>
      )}

      {toast && (
        <div role="status" aria-live="polite" className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white flex items-center gap-2 ${toast.type === "success" ? "bg-gov-navy" : "bg-gov-danger"}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
