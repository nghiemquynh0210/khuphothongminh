import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  UserCheck, 
  UserX, 
  Check, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  BookOpen, 
  Calendar, 
  Lock, 
  Unlock, 
  Users, 
  Home, 
  Briefcase, 
  Map, 
  Bot, 
  MessageSquare, 
  Heart, 
  CalendarDays, 
  Coins, 
  FileText,
  User,
  Fingerprint,
  Building2,
  Store,
  Newspaper,
  Pin,
  Edit3,
  Trash2,
  Plus,
  Search,
  Eye,
  Filter,
  Tag,
  Megaphone,
  Send,
  Sparkles
} from "lucide-react";
import { Resident, ActiveTab, AdministrativeForm, LocalNews } from "../types";
import AdministrativeForms from "./AdministrativeForms";
import { initialAdministrativeForms } from "../mockForms";
import { initialNewsList } from "../mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface PendingRegistration {
  id: string;
  fullName: string;
  gender: "Nam" | "Nữ";
  birthDate: string;
  cccd: string;
  phone: string;
  status: "Thường trú" | "Tạm trú";
  occupation: string;
  address: string;
  householdId: string;
  relationToOwner: string;
  coordinates?: string;
  avatar?: string;
}

interface SettingsAndPermissionsProps {
  pendingRegistrations: PendingRegistration[];
  onApproveRegistration: (reg: PendingRegistration) => void;
  onRejectRegistration: (id: string) => void;
  residentPermissions: Record<string, boolean>;
  onTogglePermission: (tabKey: string) => void;
  // Administrative Forms Integration
  forms?: AdministrativeForm[];
  onAddForm?: (newForm: AdministrativeForm) => void;
  onUpdateForm?: (updatedForm: AdministrativeForm) => void;
  onDeleteForm?: (formId: string) => void;
  // News & Announcement Management
  newsList?: LocalNews[];
  onAddNews?: (newNews: LocalNews) => void;
  onUpdateNews?: (updatedNews: LocalNews) => void;
  onDeleteNews?: (newsId: string) => void;
  currentUser?: {
    role: "canbo" | "nguoidan";
    fullName?: string;
    phone?: string;
  } | null;
  defaultSubTab?: "approvals" | "forms" | "news" | "permissions" | "plan";
}

export default function SettingsAndPermissions({
  pendingRegistrations,
  onApproveRegistration,
  onRejectRegistration,
  residentPermissions,
  onTogglePermission,
  forms = initialAdministrativeForms,
  onAddForm,
  onUpdateForm,
  onDeleteForm,
  newsList = initialNewsList,
  onAddNews,
  onUpdateNews,
  onDeleteNews,
  currentUser,
  defaultSubTab = "approvals"
}: SettingsAndPermissionsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"approvals" | "forms" | "news" | "permissions" | "plan">(defaultSubTab);

  // Supabase Cadre Approval state
  const [pendingCadres, setPendingCadres] = useState<any[]>([]);
  const [cadreLoading, setCadreLoading] = useState(false);

  const fetchPendingCadres = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setCadreLoading(true);
      const { data, error } = await (supabase as any)
        .from("user_profiles")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setPendingCadres(data);
      }
    } catch (e) {
      console.warn("Fetch pending cadres error:", e);
    } finally {
      setCadreLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCadres();
  }, [activeSubTab]);

  const handleApproveCadre = async (cadreId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await (supabase as any)
        .from("user_profiles")
        .update({ approval_status: "approved", approved_at: new Date().toISOString() })
        .eq("id", cadreId);
      if (!error) {
        setPendingCadres(prev => prev.filter(c => c.id !== cadreId));
        showNewsToast("Đã phê duyệt tài khoản Cán bộ công tác thành công!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectCadre = async (cadreId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await (supabase as any)
        .from("user_profiles")
        .update({ approval_status: "rejected" })
        .eq("id", cadreId);
      if (!error) {
        setPendingCadres(prev => prev.filter(c => c.id !== cadreId));
        showNewsToast("Đã từ chối cấp quyền tài khoản Cán bộ!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // News editing state
  const [newsSearch, setNewsSearch] = useState("");
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>("Tất cả");
  const [isWritingNews, setIsWritingNews] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [previewNewsItem, setPreviewNewsItem] = useState<LocalNews | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newsActionToast, setNewsActionToast] = useState<string | null>(null);

  // News form fields
  const [formNewsTitle, setFormNewsTitle] = useState("");
  const [formNewsCategory, setFormNewsCategory] = useState<LocalNews["category"]>("Hành chính");
  const [formNewsAuthor, setFormNewsAuthor] = useState("Ban Điều hành Khu phố 3");
  const [formNewsDate, setFormNewsDate] = useState("");
  const [formNewsContent, setFormNewsContent] = useState("");
  const [formNewsIsPinned, setFormNewsIsPinned] = useState(false);

  const showNewsToast = (msg: string) => {
    setNewsActionToast(msg);
    setTimeout(() => setNewsActionToast(null), 3000);
  };

  const handleOpenCreateNews = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    setEditingNewsId(null);
    setFormNewsTitle("");
    setFormNewsCategory("Hành chính");
    setFormNewsAuthor(currentUser?.fullName ? `${currentUser.fullName} - Cán bộ KP3` : "Ban Điều hành Khu phố 3");
    setFormNewsDate(todayStr);
    setFormNewsContent("");
    setFormNewsIsPinned(false);
    setIsWritingNews(true);
  };

  const handleOpenEditNews = (newsItem: LocalNews) => {
    setEditingNewsId(newsItem.id);
    setFormNewsTitle(newsItem.title);
    setFormNewsCategory(newsItem.category);
    setFormNewsAuthor(newsItem.author);
    setFormNewsDate(newsItem.date);
    setFormNewsContent(newsItem.content);
    setFormNewsIsPinned(!!newsItem.isPinned);
    setIsWritingNews(true);
  };

  const handleSaveNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNewsTitle.trim() || !formNewsContent.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết!");
      return;
    }

    const todayStr = formNewsDate.trim() || new Date().toLocaleDateString("vi-VN");

    if (editingNewsId) {
      const updated: LocalNews = {
        id: editingNewsId,
        title: formNewsTitle.trim(),
        category: formNewsCategory,
        author: formNewsAuthor.trim() || "Ban Điều hành Khu phố 3",
        date: todayStr,
        content: formNewsContent.trim(),
        isPinned: formNewsIsPinned
      };
      if (onUpdateNews) {
        onUpdateNews(updated);
      }
      showNewsToast("Đã cập nhật bài viết thành công!");
    } else {
      const newId = `NEWS-${Date.now().toString().slice(-6)}`;
      const created: LocalNews = {
        id: newId,
        title: formNewsTitle.trim(),
        category: formNewsCategory,
        author: formNewsAuthor.trim() || "Ban Điều hành Khu phố 3",
        date: todayStr,
        content: formNewsContent.trim(),
        isPinned: formNewsIsPinned
      };
      if (onAddNews) {
        onAddNews(created);
      }
      showNewsToast("Đã xuất bản bài viết mới lên Cổng Cư dân!");
    }

    setIsWritingNews(false);
    setEditingNewsId(null);
  };

  const handleTogglePinNews = (item: LocalNews) => {
    if (onUpdateNews) {
      onUpdateNews({ ...item, isPinned: !item.isPinned });
      showNewsToast(item.isPinned ? "Đã bỏ ghim bài viết" : "Đã ghim bài viết lên đầu trang Cổng Cư dân");
    }
  };

  const handleDeleteNewsConfirm = (id: string) => {
    if (onDeleteNews) {
      onDeleteNews(id);
      showNewsToast("Đã xóa bài viết thành công!");
    }
    setDeleteConfirmId(null);
  };

  const filteredNews = useMemo(() => {
    const q = newsSearch.trim().toLowerCase();
    return (newsList || []).filter(item => {
      const matchCat = newsCategoryFilter === "Tất cả" || item.category === newsCategoryFilter;
      const matchQuery = !q || item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.author.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [newsList, newsSearch, newsCategoryFilter]);

  // Mock data for Roadmap / Kế hoạch triển khai
  const planningSteps = [
    {
      phase: "Giai đoạn 1: Thiết kế Cơ chế",
      title: "Phân tích & Thiết kế Mô hình Phân quyền (RBAC)",
      status: "completed",
      date: "Tháng 07/2026",
      desc: "Xác định 2 nhóm người dùng chính cho KP3 An Phú: Cán bộ (Bí thư, Tổ trưởng, Ban chỉ đạo) với quyền quản trị tối đa; và Người dân (Chủ hộ, cư dân tự do) với quyền tự phục vụ bản thân."
    },
    {
      phase: "Giai đoạn 2: Phát triển Giao diện",
      title: "Trang Đăng nhập & Đăng ký Nhân khẩu Trực tuyến",
      status: "completed",
      date: "Hiện tại",
      desc: "Lập trình form khai báo thông tin cư trú chuẩn của Bộ Công an, cho phép đăng ký trực tuyến kèm định vị Google Maps."
    },
    {
      phase: "Giai đoạn 3: Tích hợp Toàn diện",
      title: "Đồng bộ Cơ sở dữ liệu & Phân quyền Thời gian thực",
      status: "active",
      date: "Tháng 08/2026",
      desc: "Đồng bộ thông tin đăng ký mới vào Sổ hộ khẩu điện tử khi Cán bộ phê duyệt. Tự động cô lập dữ liệu (Data Isolation) để người dân chỉ nhìn thấy dữ liệu của hộ mình."
    },
    {
      phase: "Giai đoạn 4: Thử nghiệm thực tế",
      title: "Triển khai Alpha Test 50 hộ dân tại Tổ tự quản 12",
      status: "upcoming",
      date: "Tháng 09/2026",
      desc: "Thử nghiệm tải thực tế, đánh giá độ tiện dụng cho người cao tuổi, sửa đổi biểu mẫu phản ánh hiện trường 1022 cục bộ."
    }
  ];

  const menuInfo: Record<string, { label: string; icon: any; desc: string }> = {
    forms: { label: "Biểu mẫu hành chính", icon: FileText, desc: "Tải trực tiếp đơn xin cấp số nhà, CT01, đăng ký kinh doanh" },
    residents: { label: "Quản lý Nhân khẩu", icon: Users, desc: "Tra cứu lý lịch, danh sách nhân khẩu chi tiết" },
    households: { label: "Quản lý Hộ khẩu", icon: Home, desc: "Chỉnh sửa Sổ hộ khẩu, phân tách hộ gia đình" },
    enterprises: { label: "Quản lý Doanh nghiệp (DNNVV)", icon: Building2, desc: "Theo dõi tổ chức kinh tế, mã số thuế, quy mô lao động theo NĐ 80/2021" },
    businesses: { label: "Cơ sở Kinh doanh & Hộ cá thể", icon: Store, desc: "Cấp phép hoạt động, duyệt an toàn phòng cháy chữa cháy, cơ sở lưu trú" },
    gis: { label: "Bản đồ không gian GIS", icon: Map, desc: "Định vị vị trí hộ dân, điểm nóng ANTT trên bản đồ số" },
    tasks: { label: "Lịch công tác & Nhiệm vụ", icon: Calendar, desc: "Theo dõi lịch họp chi bộ, phân công nhiệm vụ 5 Tổ dân phố, kiểm tra hạn chót" },
    ai: { label: "Hỏi đáp Trợ lý AI", icon: Bot, desc: "Hỏi đáp pháp luật, quy trình thủ tục hành chính tự động" },
    reports: { label: "Phản ánh hiện trường", icon: MessageSquare, desc: "Gửi phản ánh 1022 về rác thải, tiếng ồn, lấn chiếm hẻm" },
    party: { label: "Quản lý Chi hội Đảng", icon: ShieldAlert, desc: "Danh sách đảng viên miễn sinh hoạt, đảng viên 76" },
    welfare: { label: "An sinh Xã hội", icon: Heart, desc: "Nhận tiền hỗ trợ hộ nghèo, người già neo đơn, trẻ mồ côi" },
    cultural: { label: "Tin tức & Sự kiện", icon: CalendarDays, desc: "Xem và đăng ký tham gia hội họp, lễ kỷ niệm khu phố" },
    finance: { label: "Quỹ Khu phố", icon: Coins, desc: "Công khai tài chính, đóng góp quỹ Khuyến học, hẻm tự quản" },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Cổng Bảo Mật & Quản Trị Hệ Thống</h3>
              <p className="text-xs text-indigo-200 mt-1">Quản lý duyệt hồ sơ nhân khẩu trực tuyến, ma trận phân quyền và lộ trình triển khai</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6 border-t border-slate-700/60 pt-4">
            <button
              onClick={() => setActiveSubTab("approvals")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
                ${activeSubTab === "approvals" 
                  ? "bg-white text-indigo-950 shadow" 
                  : "text-indigo-200 hover:bg-white/10"
                }
              `}
            >
              <UserCheck size={14} /> Duyệt Hồ sơ Đăng ký ({pendingRegistrations.length})
            </button>
            <button
              onClick={() => setActiveSubTab("forms")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
                ${activeSubTab === "forms" 
                  ? "bg-white text-indigo-950 shadow" 
                  : "text-indigo-200 hover:bg-white/10"
                }
              `}
            >
              <FileText size={14} /> Biểu mẫu Hành chính ({forms.length})
            </button>
            <button
              onClick={() => setActiveSubTab("news")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
                ${activeSubTab === "news" 
                  ? "bg-white text-indigo-950 shadow" 
                  : "text-indigo-200 hover:bg-white/10"
                }
              `}
            >
              <Newspaper size={14} /> Quản lý & Viết Tin tức ({newsList.length})
            </button>
            <button
              onClick={() => setActiveSubTab("permissions")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
                ${activeSubTab === "permissions" 
                  ? "bg-white text-indigo-950 shadow" 
                  : "text-indigo-200 hover:bg-white/10"
                }
              `}
            >
              <Shield size={14} /> Phân quyền Cư dân / Cán bộ
            </button>
            <button
              onClick={() => setActiveSubTab("plan")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
                ${activeSubTab === "plan" 
                  ? "bg-white text-indigo-950 shadow" 
                  : "text-indigo-200 hover:bg-white/10"
                }
              `}
            >
              <FileText size={14} /> Kế hoạch Triển khai (Roadmap)
            </button>
          </div>
        </div>
      </div>

      {/* Approvals tab */}
      {activeSubTab === "approvals" && (
        <div className="space-y-6">
          {/* 1. Phê duyệt Cán bộ công tác (Supabase Auth & RLS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-400" />
                  PHÊ DUYỆT TÀI KHOẢN CÁN BỘ CÔNG TÁC (SUPABASE AUTH)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Xác thực danh tính và phân quyền truy cập hệ thống Quản lý dân cư theo chuẩn PostgreSQL Row Level Security (RLS)
                </p>
              </div>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2.5 py-1 rounded-full text-[11px] font-mono">
                {pendingCadres.length} Cán bộ chờ duyệt
              </span>
            </div>

            {cadreLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Đang kiểm tra danh sách cán bộ...</div>
            ) : pendingCadres.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Không có tài khoản Cán bộ nào đang chờ phê duyệt. Toàn bộ cán bộ đã được cấp quyền hợp lệ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingCadres.map((cadre) => (
                  <div key={cadre.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-bold text-white text-sm">{cadre.full_name}</h5>
                        <p className="text-xs text-indigo-400 font-medium">{cadre.position || "Cán bộ Khu phố"}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{cadre.email}</p>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>Điện thoại: <strong className="text-slate-200">{cadre.phone || "Chưa cập nhật"}</strong></span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApproveCadre(cadre.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <UserCheck size={13} /> Phê duyệt cấp quyền
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectCadre(cadre.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Yêu cầu Đăng ký Cư dân trực tuyến */}
          <div className="flex justify-between items-center pt-2">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Yêu cầu Đăng ký Cư dân trực tuyến</h4>
              <p className="text-xs text-slate-500">Người dân tự khai báo nhân khẩu qua ứng dụng và đợi Cán bộ phê duyệt trước khi tích hợp vào sổ hộ khẩu</p>
            </div>
            <span className="bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-full text-[11px] font-mono">
              {pendingRegistrations.length} Hồ sơ chờ duyệt
            </span>
          </div>

          {pendingRegistrations.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <h5 className="font-bold text-slate-700 text-sm">Không có hồ sơ nào chờ duyệt</h5>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Tất cả yêu cầu đăng ký cư trú của người dân đã được xử lý hoàn tất.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRegistrations.map((reg) => (
                <div key={reg.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-200 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm overflow-hidden shrink-0">
                        {reg.avatar ? (
                          <img src={reg.avatar} alt={reg.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          reg.fullName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {reg.fullName}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${reg.status === "Thường trú" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {reg.status}
                          </span>
                        </h5>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">CCCD: {reg.cccd}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0">
                      <Clock size={11} /> Chờ duyệt
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs border-t border-b border-slate-50 py-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Giới tính</span>
                      <span className="font-bold text-slate-700">{reg.gender}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ngày sinh</span>
                      <span className="font-bold text-slate-700 font-mono">{reg.birthDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Điện thoại</span>
                      <span className="font-bold text-slate-700 font-mono">{reg.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Nghề nghiệp</span>
                      <span className="font-bold text-slate-700">{reg.occupation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mã Hộ khẩu xin nhập</span>
                      <span className="font-bold text-indigo-600 font-mono">{reg.householdId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quan hệ chủ hộ</span>
                      <span className="font-bold text-slate-700">{reg.relationToOwner}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-tight"><b>Địa chỉ:</b> {reg.address}</span>
                    </div>
                    {reg.coordinates && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Fingerprint size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                        <span className="font-mono text-[10px] text-indigo-600"><b>Tọa độ định vị:</b> {reg.coordinates}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => onApproveRegistration(reg)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserCheck size={14} /> Phê duyệt nhập khẩu
                    </button>
                    <button
                      onClick={() => onRejectRegistration(reg.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-2 rounded-lg text-xs transition-colors cursor-pointer"
                      title="Từ chối hồ sơ"
                    >
                      <UserX size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Administrative Forms tab */}
      {activeSubTab === "forms" && (
        <div className="space-y-4">
          <AdministrativeForms
            forms={forms}
            onAddForm={onAddForm}
            onUpdateForm={onUpdateForm}
            onDeleteForm={onDeleteForm}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* News & Announcement Editor tab */}
      {activeSubTab === "news" && (
        <div className="space-y-5">
          {newsActionToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} /> {newsActionToast}
              </span>
              <button onClick={() => setNewsActionToast(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tổng số bài viết</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{(newsList || []).length}</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Đã lưu & phát hành</span>
            </div>
            <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Đang ghim trang chủ</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{(newsList || []).filter(n => n.isPinned).length}</span>
              <span className="text-[11px] text-amber-600/80 mt-0.5 block">Ưu tiên trên Cổng Cư dân</span>
            </div>
            <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Thông báo khẩn</span>
              <span className="text-2xl font-black text-rose-600 mt-1 block">{(newsList || []).filter(n => n.category === "Thông báo khẩn").length}</span>
              <span className="text-[11px] text-rose-600/80 mt-0.5 block">An ninh & Y tế cấp bách</span>
            </div>
            <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Tin hành chính</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">{(newsList || []).filter(n => n.category === "Hành chính").length}</span>
              <span className="text-[11px] text-blue-600/80 mt-0.5 block">Thủ tục & Lịch tiếp dân</span>
            </div>
          </div>

          {/* Action Bar & Header */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                  <Megaphone size={18} />
                </span>
                <h4 className="text-base font-black text-slate-900 tracking-tight">
                  Biên tập & Công bố Tin tức, Thông báo Khu phố 3
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Các bài viết và thông báo soạn thảo tại đây sẽ lập tức hiển thị đồng bộ trên Cổng Dịch vụ Cư Dân của Khu phố.
              </p>
            </div>
            <button
              onClick={handleOpenCreateNews}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#073B72] hover:bg-[#005BAC] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer shrink-0"
            >
              <Plus size={15} />
              <span>Viết bài / Soạn thông báo mới</span>
            </button>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-news-search-input"
                name="newsSearch"
                aria-label="Tìm bài viết theo tiêu đề, nội dung, tác giả"
                type="text"
                value={newsSearch}
                onChange={(e) => setNewsSearch(e.target.value)}
                placeholder="Tìm bài viết theo tiêu đề, nội dung, tác giả..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
              {newsSearch && (
                <button
                  onClick={() => setNewsSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {(["Tất cả", "Thông báo khẩn", "Hành chính", "Y tế & Đời sống", "Phong trào", "An sinh xã hội"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewsCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    newsCategoryFilter === cat
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* News List */}
          {filteredNews.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Newspaper size={24} />
              </div>
              <h5 className="font-bold text-slate-800 text-sm">Chưa tìm thấy bài viết nào phù hợp</h5>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {newsSearch || newsCategoryFilter !== "Tất cả" 
                  ? "Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc chuyên mục." 
                  : "Chưa có bài viết nào trong hệ thống. Hãy bấm nút phía trên để soạn thảo bản tin đầu tiên."}
              </p>
              <button
                onClick={handleOpenCreateNews}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus size={14} /> Viết bài ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNews.map((item) => {
                const badgeColor = 
                  item.category === "Thông báo khẩn" ? "bg-rose-50 text-rose-700 border-rose-200" :
                  item.category === "Hành chính" ? "bg-blue-50 text-blue-700 border-blue-200" :
                  item.category === "Y tế & Đời sống" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  item.category === "Phong trào" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-purple-50 text-purple-700 border-purple-200";

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-sm ${
                      item.isPinned ? "border-amber-300 bg-amber-50/20 ring-1 ring-amber-300/40" : "border-slate-200/80"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                            {item.category}
                          </span>
                          {item.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                              <Pin size={10} className="fill-amber-700" /> Ghim trang chủ
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={11} /> {item.date}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>

                      <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1 font-medium">
                        <span>Tác giả:</span>
                        <strong className="text-slate-700">{item.author}</strong>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => handleTogglePinNews(item)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          item.isPinned 
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={item.isPinned ? "Bỏ ghim khỏi đầu trang" : "Ghim lên đầu trang chủ Cổng Cư dân"}
                      >
                        <Pin size={12} className={item.isPinned ? "fill-amber-800" : ""} />
                        <span>{item.isPinned ? "Bỏ ghim" : "Ghim tin"}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewNewsItem(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                          title="Xem trước hiển thị"
                        >
                          <Eye size={12} />
                          <span>Xem</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditNews(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors cursor-pointer"
                          title="Chỉnh sửa nội dung bài viết"
                        >
                          <Edit3 size={12} />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold transition-colors cursor-pointer"
                          title="Xóa bài viết"
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Writing / Editing News */}
          {isWritingNews && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                      <Edit3 size={16} />
                    </span>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900">
                        {editingNewsId ? "Chỉnh sửa Bản tin / Thông báo Khu phố" : "Soạn thảo Bản tin / Thông báo mới"}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Xuất bản trực tiếp lên Cổng thông tin Cư dân số Khu phố 3
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsWritingNews(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveNewsSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tiêu đề bản tin / thông báo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formNewsTitle}
                      onChange={(e) => setFormNewsTitle(e.target.value)}
                      placeholder="Ví dụ: Kế hoạch tiêm phòng vắc-xin mở rộng cho trẻ em tại Trạm y tế..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chuyên mục phân loại
                      </label>
                      <select
                        value={formNewsCategory}
                        onChange={(e) => setFormNewsCategory(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Thông báo khẩn">Thông báo khẩn (Ưu tiên đỏ)</option>
                        <option value="Hành chính">Hành chính (Thủ tục, tiếp dân)</option>
                        <option value="Y tế & Đời sống">Y tế & Đời sống</option>
                        <option value="Phong trào">Phong trào (Văn hóa, thể thao)</option>
                        <option value="An sinh xã hội">An sinh xã hội (Quỹ, bảo trợ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ngày công bố
                      </label>
                      <input
                        type="text"
                        value={formNewsDate}
                        onChange={(e) => setFormNewsDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tác giả / Cơ quan ban hành
                    </label>
                    <input
                      type="text"
                      value={formNewsAuthor}
                      onChange={(e) => setFormNewsAuthor(e.target.value)}
                      placeholder="Ban Điều hành Khu phố 3, Chi bộ KP3, CSKV..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nội dung bài viết chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formNewsContent}
                      onChange={(e) => setFormNewsContent(e.target.value)}
                      placeholder="Nhập nội dung đầy đủ của thông báo, thời gian, địa điểm, yêu cầu chuẩn bị hồ sơ hoặc chỉ đạo..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pin size={16} className="text-amber-700" />
                      <div>
                        <span className="text-xs font-bold text-amber-900 block">Ghim nổi bật lên đầu Cổng Cư Dân</span>
                        <span className="text-[11px] text-amber-700">Bài viết sẽ được đưa vào khung Thông báo quan trọng trên trang chủ người dân</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formNewsIsPinned}
                      onChange={(e) => setFormNewsIsPinned(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsWritingNews(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#073B72] hover:bg-[#005BAC] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <Send size={14} />
                      <span>{editingNewsId ? "Lưu thay đổi" : "Xuất bản ngay"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Preview News */}
          {previewNewsItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Giao diện hiển thị cho cư dân
                  </span>
                  <button
                    onClick={() => setPreviewNewsItem(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                      {previewNewsItem.category}
                    </span>
                    {previewNewsItem.isPinned && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Pin size={11} className="fill-amber-800" /> Ghim ưu tiên
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} /> {previewNewsItem.date}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {previewNewsItem.title}
                  </h3>

                  <div className="text-xs text-slate-500 pb-2 border-b border-slate-100">
                    Nguồn thông tin: <strong className="text-slate-800">{previewNewsItem.author}</strong>
                  </div>

                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {previewNewsItem.content}
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                  <button
                    onClick={() => setPreviewNewsItem(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Đóng xem trước
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirm Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Xác nhận xóa bài viết?</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Bài viết sẽ bị gỡ bỏ hoàn toàn khỏi Cổng thông tin Cư dân số và không thể khôi phục.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => handleDeleteNewsConfirm(deleteConfirmId)}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permissions tab */}
      {activeSubTab === "permissions" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100/50 rounded-xl p-4 flex gap-3 text-amber-800 text-xs leading-relaxed">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Quản lý bảo mật phân quyền theo vai trò (Role-Based Access Control)</p>
              <p className="mt-0.5 text-amber-700">Mặc định, tài khoản vai trò <b>Cán bộ quản lý</b> sẽ luôn có toàn quyền Đọc/Ghi trên tất cả các module. Đối với tài khoản vai trò <b>Người dân</b>, bạn có thể thiết lập bật/tắt quyền xem các phân hệ nâng cao (như Bản đồ GIS, An sinh xã hội, đóng góp Quỹ Khu phố) bên dưới.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">Danh sách phân hệ chức năng</span>
              <span className="text-[10px] text-slate-400 font-mono">CẬP NHẬT TỰ ĐỘNG</span>
            </div>

            <div className="divide-y divide-slate-100">
              {Object.entries(menuInfo).map(([key, info]) => {
                const IconComponent = info.icon;
                const isResidentAllowed = residentPermissions[key] ?? false;
                
                // Hardcoded rules: Resident cannot be granted access to full residents or households for personal privacy security
                const isRestrictedBySystem = ["residents", "households"].includes(key);

                return (
                  <div key={key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                        <IconComponent size={16} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          {info.label}
                          {isRestrictedBySystem && (
                            <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Lock size={8} /> Chỉ cán bộ
                            </span>
                          )}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">{info.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-center">
                      {/* Officer Access Level */}
                      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-700">
                        <Shield size={12} /> Cán bộ: Đầy đủ
                      </div>

                      {/* Resident Access Level Toggle */}
                      <div className="flex items-center gap-2">
                        {isRestrictedBySystem ? (
                          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold select-none bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            <Lock size={12} /> Bị khóa ở dân
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onTogglePermission(key)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border
                              ${isResidentAllowed 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }
                            `}
                          >
                            {isResidentAllowed ? (
                              <>
                                <Check size={12} /> Dân: Được xem
                              </>
                            ) : (
                              <>
                                <X size={12} /> Dân: Đã khóa
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Plan tab */}
      {activeSubTab === "plan" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h4 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Đề án Xây dựng Cổng Bảo Mật & Xác thực (Roadmap)</h4>
            <p className="text-xs text-slate-500">Lộ trình 4 giai đoạn chuẩn hóa phân quyền và chuyển đổi số bảo mật dữ liệu dân cư tại Khu phố 3</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="relative border-l-2 border-indigo-100 pl-6 ml-3 space-y-6">
              {planningSteps.map((step, idx) => (
                <div key={idx} className="relative group">
                  {/* Status node */}
                  <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-transform group-hover:scale-110
                    ${step.status === "completed" 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600" 
                      : step.status === "active" 
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600" 
                        : "border-slate-300 bg-slate-50 text-slate-400"
                    }
                  `}>
                    {step.status === "completed" ? (
                      <CheckCircle2 size={10} className="stroke-[3]" />
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${step.status === "active" ? "bg-indigo-600" : "bg-slate-400"}`} />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
                        ${step.status === "completed" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : step.status === "active" 
                            ? "bg-indigo-50 text-indigo-700" 
                            : "bg-slate-50 text-slate-500"
                        }
                      `}>
                        {step.phase}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{step.date}</span>
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm">{step.title}</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100/50 flex items-start gap-3">
              <ShieldAlert className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">Lưu ý bảo mật:</span> Mọi hoạt động phê duyệt nhân khẩu, thiết lập phân quyền sẽ được tự động đồng bộ và lưu trữ vết nhật ký quản trị (Audit Trail) để đảm bảo tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
