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
import { ReportSelect } from "./reports/ReportSelect";
import { InlineNotice } from "./ui/ConfirmModal";
import { KP3_TO_LIST } from "../utils/kp3Utils";
import { initialAdministrativeForms } from "../mockForms";
import { initialNewsList } from "../mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const TO_SCOPES_STORAGE_KEY = "kp3_to_permission_scopes_v1";

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
  onNavigate?: (tab: ActiveTab) => void;
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
  onAddNews: _onAddNews,
  onUpdateNews: _onUpdateNews,
  onDeleteNews: _onDeleteNews,
  currentUser,
  defaultSubTab = "approvals",
  onNavigate
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

  // Tổ 1-14 permission scope state per officer group
  const [selectedScopeGroup, setSelectedScopeGroup] = useState<string>("totruong");
  const [toScopesByGroup, setToScopesByGroup] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem(TO_SCOPES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const default14: Record<string, boolean> = {};
    KP3_TO_LIST.forEach((toName, idx) => {
      default14[String(idx + 1)] = true;
      void toName;
    });
    return {
      totruong: { ...default14 },
      mattran: { ...default14 },
      congtacvien: { ...default14 }
    };
  });
  const [newsActionToast, setNewsActionToast] = useState<string | null>(null);

  const showNewsToast = (msg: string) => {
    setNewsActionToast(msg);
    setTimeout(() => setNewsActionToast(null), 3500);
  };

  const handleToggleToScope = (toId: number) => {
    const key = String(toId);
    const currentGroup = toScopesByGroup[selectedScopeGroup] || {};
    const nextGroup = { ...currentGroup, [key]: !(currentGroup[key] ?? true) };
    const nextAll = { ...toScopesByGroup, [selectedScopeGroup]: nextGroup };
    setToScopesByGroup(nextAll);
    try {
      localStorage.setItem(TO_SCOPES_STORAGE_KEY, JSON.stringify(nextAll));
    } catch {}
    showNewsToast(
      `Đã ${(nextGroup[key] ? "bật" : "khóa")} phạm vi Tổ ${toId} cho nhóm quyền đang chọn.`
    );
  };

  const handleSetAllToScope = (enabled: boolean) => {
    const nextGroup: Record<string, boolean> = {};
    KP3_TO_LIST.forEach((_, idx) => {
      nextGroup[String(idx + 1)] = enabled;
    });
    const nextAll = { ...toScopesByGroup, [selectedScopeGroup]: nextGroup };
    setToScopesByGroup(nextAll);
    try {
      localStorage.setItem(TO_SCOPES_STORAGE_KEY, JSON.stringify(nextAll));
    } catch {}
    showNewsToast(enabled ? "Đã mở toàn bộ 14 Tổ dân phố KP3." : "Đã giới hạn phạm vi 14 Tổ.");
  };

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
    tasks: { label: "Lịch công tác & Nhiệm vụ", icon: Calendar, desc: "Theo dõi lịch họp chi bộ, phân công nhiệm vụ 14 Tổ dân phố KP3, kiểm tra hạn chót" },
    ai: { label: "Hỏi đáp Trợ lý AI", icon: Bot, desc: "Hỏi đáp pháp luật, quy trình thủ tục hành chính tự động" },
    reports: { label: "Phản ánh hiện trường", icon: MessageSquare, desc: "Gửi phản ánh 1022 về rác thải, tiếng ồn, lấn chiếm hẻm" },
    party: { label: "Quản lý Chi hội Đảng", icon: ShieldAlert, desc: "Danh sách đảng viên miễn sinh hoạt, đảng viên 76" },
    welfare: { label: "An sinh Xã hội", icon: Heart, desc: "Nhận tiền hỗ trợ hộ nghèo, người già neo đơn, trẻ mồ côi" },
    cultural: { label: "Tin tức & Sự kiện", icon: CalendarDays, desc: "Xem và đăng ký tham gia hội họp, lễ kỷ niệm khu phố" },
    finance: { label: "Quỹ Khu phố", icon: Coins, desc: "Công khai tài chính, đóng góp quỹ Khuyến học, hẻm tự quản" },
  };

  return (
    <div className="space-y-6">
      {newsActionToast && (
        <InlineNotice
          message={newsActionToast}
          type="success"
          onDismiss={() => setNewsActionToast(null)}
        />
      )}

      {/* Top Flat Hairline Header & Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
              <Shield size={22} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                Quản trị &amp; Bảo mật Đề án 06 • KP3 An Phú
              </span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Cổng Bảo Mật &amp; Quản Trị Hệ Thống
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setActiveSubTab("approvals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border
              ${activeSubTab === "approvals"
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            <UserCheck size={14} /> Duyệt Hồ sơ Đăng ký ({pendingRegistrations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("forms")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border
              ${activeSubTab === "forms"
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            <FileText size={14} /> Biểu mẫu Hành chính ({forms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("permissions")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border
              ${activeSubTab === "permissions"
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            <Shield size={14} /> Phân quyền Cán bộ &amp; Tổ 1–14
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("news")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border
              ${activeSubTab === "news"
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            <Newspaper size={14} /> Kênh Tin tức ({newsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("plan")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border
              ${activeSubTab === "plan"
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            <FileText size={14} /> Kế hoạch Triển khai
          </button>
        </div>
      </div>

      {/* Approvals tab */}
      {activeSubTab === "approvals" && (
        <div className="space-y-6">
          {/* 1. Phê duyệt Cán bộ công tác (Supabase Auth & RLS) */}
          <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-600 rounded-2xl p-5 text-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h4 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-700" />
                  PHÊ DUYỆT TÀI KHOẢN CÁN BỘ CÔNG TÁC (SUPABASE AUTH)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Xác thực danh tính và phân quyền truy cập hệ thống Quản lý dân cư theo chuẩn PostgreSQL Row Level Security (RLS)
                </p>
              </div>
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold px-2.5 py-1 rounded-full text-xs font-mono shrink-0 w-fit">
                {pendingCadres.length} Cán bộ chờ duyệt
              </span>
            </div>

            {cadreLoading ? (
              <div className="py-6 text-center text-xs text-slate-600">Đang kiểm tra danh sách cán bộ...</div>
            ) : pendingCadres.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-700 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                Không có tài khoản Cán bộ nào đang chờ phê duyệt. Toàn bộ cán bộ đã được cấp quyền hợp lệ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingCadres.map((cadre) => (
                  <div key={cadre.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{cadre.full_name}</h5>
                        <p className="text-xs text-indigo-700 font-medium">{cadre.position || "Cán bộ Khu phố"}</p>
                        <p className="text-xs text-slate-600 font-mono mt-0.5">{cadre.email}</p>
                      </div>
                      <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200">
                      <span>Điện thoại: <strong className="text-slate-900">{cadre.phone || "Chưa cập nhật"}</strong></span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApproveCadre(cadre.id)}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <UserCheck size={13} /> Phê duyệt cấp quyền
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectCadre(cadre.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
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
            <span className="bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-full text-xs font-mono">
              {pendingRegistrations.length} Hồ sơ chờ duyệt
            </span>
          </div>

          {pendingRegistrations.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <h5 className="font-bold text-slate-700 text-sm">Không có hồ sơ nào chờ duyệt</h5>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">Tất cả yêu cầu đăng ký cư trú của người dân đã được xử lý hoàn tất.</p>
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
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${reg.status === "Thường trú" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {reg.status}
                          </span>
                        </h5>
                        <p className="text-xs text-slate-600 mt-0.5 font-mono">CCCD: {reg.cccd}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-xs font-bold shrink-0">
                      <Clock size={11} /> Chờ duyệt
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs border-t border-b border-slate-50 py-3">
                    <div>
                      <span className="text-xs text-slate-600 uppercase tracking-wider block">Giới tính</span>
                      <span className="font-bold text-slate-700">{reg.gender}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 uppercase tracking-wider block">Ngày sinh</span>
                      <span className="font-bold text-slate-700 font-mono">{reg.birthDate}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 uppercase tracking-wider block">Điện thoại</span>
                      <span className="font-bold text-slate-700 font-mono">{reg.phone}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 uppercase tracking-wider block">Nghề nghiệp</span>
                      <span className="font-bold text-slate-700">{reg.occupation}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 uppercase tracking-wider block">Mã Hộ khẩu xin nhập</span>
                      <span className="font-bold text-indigo-600 font-mono">{reg.householdId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 uppercase tracking-wider block">Quan hệ chủ hộ</span>
                      <span className="font-bold text-slate-700">{reg.relationToOwner}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin size={12} className="text-slate-600 mt-0.5 shrink-0" />
                      <span className="leading-tight"><b>Địa chỉ:</b> {reg.address}</span>
                    </div>
                    {reg.coordinates && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Fingerprint size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                        <span className="font-mono text-xs text-indigo-600"><b>Tọa độ định vị:</b> {reg.coordinates}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => onApproveRegistration(reg)}
                      className="flex-1 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
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

      {/* Canonical News Link tab */}
      {activeSubTab === "news" && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Newspaper size={13} /> Đã hợp nhất về phân hệ Truyền thông KP3
              </span>
              <h4 className="text-base font-bold text-slate-900">
                Quản lý Tin tức, Thông báo &amp; Sự kiện Cộng đồng
              </h4>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Để tránh trùng lặp dữ liệu biên tập, toàn bộ chức năng đăng bài, ghim thông báo khẩn, đính kèm văn bản và lịch Nhà Văn hóa đã được tập trung tại phân hệ <strong>Tin tức &amp; Sự kiện Khu phố 3</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate("cultural");
                } else {
                  showNewsToast("Vui lòng chọn mục Tin tức & Sự kiện trên thanh điều hướng bên trái.");
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-2"
            >
              <Newspaper size={15} />
              <span>Mở Kênh Tin tức &amp; Sự kiện KP3 →</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Tổng số bài viết</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{(newsList || []).length}</span>
              <span className="text-xs text-slate-600 mt-0.5 block">Đã lưu &amp; phát hành</span>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Đang ghim trang chủ</span>
              <span className="text-2xl font-bold text-amber-700 mt-1 block">{(newsList || []).filter(n => n.isPinned).length}</span>
              <span className="text-xs text-slate-600 mt-0.5 block">Ưu tiên trên Cổng Cư dân</span>
            </div>
            <div className="bg-white border border-rose-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Thông báo khẩn</span>
              <span className="text-2xl font-bold text-rose-700 mt-1 block">{(newsList || []).filter(n => n.category === "Thông báo khẩn").length}</span>
              <span className="text-xs text-slate-600 mt-0.5 block">An ninh &amp; Y tế cấp bách</span>
            </div>
            <div className="bg-white border border-blue-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Tin hành chính</span>
              <span className="text-2xl font-bold text-blue-700 mt-1 block">{(newsList || []).filter(n => n.category === "Hành chính").length}</span>
              <span className="text-xs text-slate-600 mt-0.5 block">Thủ tục &amp; Lịch tiếp dân</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(newsList || []).slice(0, 6).map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {item.category}
                    </span>
                    <span className="font-mono text-slate-500">{item.date}</span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">{item.title}</h5>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.summary || item.content}</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => _onUpdateNews && _onUpdateNews({ ...item, isPinned: !item.isPinned })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      item.isPinned
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {item.isPinned ? "Đã ghim" : "Ghim tin"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("cultural")}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Sửa
                    </button>
                    {_onDeleteNews && (
                      <button
                        type="button"
                        onClick={() => {
                          _onDeleteNews(item.id);
                          showNewsToast(`Đã xóa bài viết "${item.title}".`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              <span className="text-xs text-slate-600 font-mono">CẬP NHẬT TỰ ĐỘNG</span>
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
                            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-0.5">
                              <Lock size={8} /> Chỉ cán bộ
                            </span>
                          )}
                        </h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-center">
                      {/* Officer Access Level */}
                      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700">
                        <Shield size={12} /> Cán bộ: Đầy đủ
                      </div>

                      {/* Resident Access Level Toggle */}
                      <div className="flex items-center gap-2">
                        {isRestrictedBySystem ? (
                          <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold select-none bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
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

          {/* Phạm vi Phân quyền Theo Tổ Dân Phố (Tổ 1 - Tổ 14 KP3) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-700" />
                  Phạm vi Phụ trách 14 Tổ Dân Phố KP3
                </h5>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cấp hoặc giới hạn quyền thao tác dữ liệu theo từng Tổ dân phố (1–14) cho nhóm cán bộ phụ trách
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-56">
                  <ReportSelect
                    aria-label="Chọn nhóm quyền áp dụng phạm vi Tổ"
                    value={selectedScopeGroup}
                    onChange={(val) => setSelectedScopeGroup(val)}
                    options={[
                      { value: "totruong", label: "Tổ trưởng & Tổ phó (14 Tổ)" },
                      { value: "mattran", label: "Ban Công tác Mặt trận KP3" },
                      { value: "congtacvien", label: "Cộng tác viên Dân số & An sinh" }
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSetAllToScope(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold cursor-pointer"
                >
                  Mở 14 Tổ
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {KP3_TO_LIST.map((toName, idx) => {
                const toId = idx + 1;
                const enabled = toScopesByGroup[selectedScopeGroup]?.[String(toId)] ?? true;
                return (
                  <button
                    key={toId}
                    type="button"
                    onClick={() => handleToggleToScope(toId)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      enabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold">{toName}</span>
                      {enabled ? (
                        <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                      ) : (
                        <Lock size={12} className="text-slate-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-600 block mt-0.5">
                      {enabled ? "Đang cấp quyền" : "Đã khóa"}
                    </span>
                  </button>
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
                        : "border-slate-300 bg-slate-50 text-slate-600"
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
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded
                        ${step.status === "completed" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : step.status === "active" 
                            ? "bg-indigo-50 text-indigo-700" 
                            : "bg-slate-50 text-slate-500"
                        }
                      `}>
                        {step.phase}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{step.date}</span>
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
