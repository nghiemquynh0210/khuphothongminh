import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";
import {
  ShieldCheck,
  LogIn,
  LogOut,
  Users,
  Home,
  Building2,
  AlertTriangle,
  Calendar,
  Search,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  MapPin,
  Phone,
  Lock,
  Megaphone,
  Send,
  Clock,
  KeyRound,
} from "lucide-react";

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: string;
  approval_status: string;
  position?: string | null;
}

interface StaffTabProps {
  staffProfile: StaffProfile | null;
  onAuthChange: (profile: StaffProfile | null) => void;
  onNewsPublished?: () => void;
}

interface DashboardStats {
  residents: number;
  households: number;
  businesses: number;
  pendingReports: number;
}

interface ReportItem {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  reporter_name?: string;
  reporter_phone?: string;
  status: string;
  response_content?: string;
  created_at?: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  schedule_date?: string;
  schedule_time?: string;
  location?: string;
  host?: string;
  status?: string;
}

interface ResidentRecord {
  id: string;
  full_name: string;
  cccd?: string;
  phone?: string;
  status?: string;
  birth_date?: string;
  current_address?: string;
  permanent_address?: string;
  address?: string;
  temporary_exp_date?: string;
  household_code?: string;
  daysLeft?: number;
}

function parseExpDaysLeft(rawDate?: string): number | null {
  if (!rawDate) return null;
  const clean = rawDate.trim();
  let expMs = NaN;
  if (clean.includes("/")) {
    const [d, m, y] = clean.split("/").map(Number);
    if (d && m && y) expMs = new Date(y, m - 1, d).getTime();
  } else {
    expMs = new Date(clean).getTime();
  }
  if (Number.isNaN(expMs)) return null;
  return Math.ceil((expMs - Date.now()) / (1000 * 3600 * 24));
}

export const StaffTab: React.FC<StaffTabProps> = ({
  staffProfile,
  onAuthChange,
  onNewsPublished,
}) => {
  // Login & Password Reset state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Authenticated workspace state
  const [subTab, setSubTab] = useState<"reports" | "schedules" | "residents" | "publish">("reports");
  const [stats, setStats] = useState<DashboardStats>({
    residents: 0,
    households: 0,
    businesses: 0,
    pendingReports: 0,
  });
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Report resolution state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Resident search (staff privilege)
  const [resQuery, setResQuery] = useState("");
  const [resResults, setResResults] = useState<ResidentRecord[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [resSearched, setResSearched] = useState(false);
  const [expiringMode, setExpiringMode] = useState(false);
  const [revealedCccdIds, setRevealedCccdIds] = useState<Record<string, boolean>>({});

  // Quick publish notice state
  const [newsTitle, setNewsTitle] = useState("");
  const [newsCategory, setNewsCategory] = useState("Thông báo khẩn");
  const [newsContent, setNewsContent] = useState("");
  const [newsPinned, setNewsPinned] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadStaffData = useCallback(async () => {
    if (!staffProfile) return;
    setLoadingData(true);
    try {
      const [resCount, hhCount, bizCount, reportsRes, schedulesRes] = await Promise.all([
        supabase.from("residents").select("id", { count: "exact", head: true }),
        supabase.from("households").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase
          .from("field_reports")
          .select("id, title, category, location, description, reporter_name, reporter_phone, status, response_content, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("work_schedules")
          .select("id, title, schedule_date, schedule_time, location, host, status")
          .order("schedule_date", { ascending: false })
          .limit(15),
      ]);

      const reportList = (reportsRes.data as ReportItem[]) || [];
      const pendingCount = reportList.filter((r) => r.status !== "Đã giải quyết").length;

      setStats({
        residents: resCount.count || 0,
        households: hhCount.count || 0,
        businesses: bizCount.count || 0,
        pendingReports: pendingCount,
      });
      setReports(reportList);
      setSchedules((schedulesRes.data as ScheduleItem[]) || []);
    } catch (err) {
      console.error("Load staff data error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [staffProfile]);

  useEffect(() => {
    if (staffProfile) {
      void loadStaffData();
    }
  }, [staffProfile, loadStaffData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setLoginError("Vui lòng nhập đầy đủ Email công vụ và Mật khẩu.");
      return;
    }

    setLoginError("");
    setResetMessage("");
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error || !data.user) {
        setLoginError("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
        return;
      }

      const { data: profile, error: profErr } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, phone, role, approval_status, position")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profErr || !profile) {
        await supabase.auth.signOut();
        setLoginError("Tài khoản chưa có hồ sơ Cán bộ hợp lệ trong hệ thống Khu phố 3.");
        return;
      }

      if (profile.approval_status !== "approved") {
        await supabase.auth.signOut();
        setLoginError(
          profile.approval_status === "pending"
            ? "Tài khoản đang chờ Bí thư Chi bộ phê duyệt quyền Cán bộ."
            : "Tài khoản đã bị thu hồi quyền truy cập Cán bộ."
        );
        return;
      }

      onAuthChange(profile as StaffProfile);
      setPassword("");
    } catch (err) {
      console.error("Staff login error:", err);
      setLoginError("Không thể kết nối máy chủ xác thực. Vui lòng thử lại.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setLoginError("Vui lòng nhập Email tài khoản Cán bộ trước khi bấm Quên mật khẩu.");
      return;
    }
    setLoginError("");
    setResetMessage("");
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: "https://bdhkp3.vercel.app/login",
      });
      if (error) throw error;
      setResetMessage(
        `Đã gửi liên kết đặt lại mật khẩu tới ${trimmedEmail}. Vui lòng kiểm tra hộp thư (kể cả mục Spam).`
      );
    } catch (err) {
      console.error("Reset password error:", err);
      setLoginError("Không thể gửi email khôi phục lúc này. Vui lòng thử lại sau.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onAuthChange(null);
    setResResults([]);
    setResSearched(false);
  };

  const handleResolveReport = async (reportId: string) => {
    setActionMessage("");
    try {
      const note =
        resolveNote.trim() ||
        `Cán bộ ${staffProfile?.full_name || "KP3"} đã xác minh và xử lý hoàn tất qua Zalo Mini App.`;
      const { error } = await supabase
        .from("field_reports")
        .update({
          status: "Đã giải quyết",
          response_content: note,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: "Đã giải quyết", response_content: note } : r
        )
      );
      setStats((prev) => ({ ...prev, pendingReports: Math.max(0, prev.pendingReports - 1) }));
      setResolvingId(null);
      setResolveNote("");
      setActionMessage("Đã cập nhật trạng thái 'Đã giải quyết' lên CSDL Khu phố 3.");
    } catch (err) {
      console.error("Resolve report error:", err);
      setActionMessage("Lỗi cập nhật phản ánh. Vui lòng kiểm tra quyền Cán bộ.");
    }
  };

  const handleStaffResidentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = resQuery.trim();
    if (q.length < 2) return;
    setResLoading(true);
    setResSearched(true);
    setExpiringMode(false);
    try {
      const digits = q.replace(/\D/g, "");
      let queryBuilder = supabase
        .from("residents")
        .select("id, full_name, cccd, phone, status, birth_date, current_address, permanent_address, address, temporary_exp_date, household_code")
        .limit(15);

      if (digits.length >= 9) {
        queryBuilder = queryBuilder.or(`cccd.ilike.%${digits}%,phone.ilike.%${digits}%`);
      } else {
        queryBuilder = queryBuilder.or(`full_name.ilike.%${q}%,household_code.ilike.%${q}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      const mapped = ((data as ResidentRecord[]) || []).map((r) => ({
        ...r,
        daysLeft: parseExpDaysLeft(r.temporary_exp_date) ?? undefined,
      }));
      setResResults(mapped);
    } catch (err) {
      console.error("Staff resident search error:", err);
      setResResults([]);
    } finally {
      setResLoading(false);
    }
  };

  const handleLoadExpiringTempResidents = async () => {
    setResLoading(true);
    setResSearched(true);
    setExpiringMode(true);
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, cccd, phone, status, birth_date, current_address, permanent_address, address, temporary_exp_date, household_code")
        .eq("status", "Tạm trú")
        .not("temporary_exp_date", "is", null)
        .limit(300);

      if (error) throw error;
      const dueList = ((data as ResidentRecord[]) || [])
        .map((r) => ({
          ...r,
          daysLeft: parseExpDaysLeft(r.temporary_exp_date) ?? 9999,
        }))
        .filter((r) => r.daysLeft <= 30)
        .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
        .slice(0, 20);

      setResResults(dueList);
    } catch (err) {
      console.error("Load expiring residents error:", err);
      setResResults([]);
    } finally {
      setResLoading(false);
    }
  };

  const handlePublishQuickNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) {
      setActionMessage("Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo.");
      return;
    }
    setPublishing(true);
    setActionMessage("");
    try {
      const summary = newsContent.trim().slice(0, 140);
      const { error } = await supabase.from("community_news").insert({
        title: newsTitle.trim(),
        category: newsCategory,
        summary,
        content: newsContent.trim(),
        author_name: staffProfile?.full_name || "Ban Điều hành Khu phố 3",
        is_pinned: newsPinned,
        is_urgent: newsCategory === "Thông báo khẩn",
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNewsTitle("");
      setNewsContent("");
      setActionMessage("Đã đăng thông báo thành công! Tin đã đồng bộ lên Cổng Cư dân & Zalo Mini App.");
      onNewsPublished?.();
    } catch (err) {
      console.error("Publish quick news error:", err);
      setActionMessage("Lỗi đăng thông báo. Vui lòng thử lại.");
    } finally {
      setPublishing(false);
    }
  };

  const maskCccd = (cccd?: string) => {
    if (!cccd) return "Chưa cập nhật";
    if (cccd.length < 8) return cccd;
    return `${cccd.slice(0, 4)} ••• ••• ${cccd.slice(-3)}`;
  };

  // --- VIEW 1: CHƯA ĐĂNG NHẬP ---
  if (!staffProfile) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Cổng Điều Hành Nội Bộ
              </div>
              <h1 className="text-base font-bold leading-tight">Đăng Nhập Cán Bộ KP3</h1>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Dành cho Chi ủy, Ban Điều hành, Ban CTMT & CSKV Phường An Phú
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3.5"
        >
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 font-medium">
              {loginError}
            </div>
          )}

          {resetMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 font-medium">
              {resetMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="staff-login-email"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Email tài khoản Cán bộ
            </label>
            <input
              id="staff-login-email"
              name="staffEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bdhkhupho3.ap@gmail.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="staff-login-password"
                className="block text-xs font-bold text-slate-700"
              >
                Mật khẩu
              </label>
              <button
                type="button"
                disabled={resetLoading}
                onClick={() => void handleForgotPassword()}
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <KeyRound size={11} />
                <span>{resetLoading ? "Đang gửi..." : "Quên mật khẩu?"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                id="staff-login-password"
                name="staffPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu công vụ..."
                autoComplete="current-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <LogIn size={16} />
            <span>{loginLoading ? "Đang xác thực..." : "Đăng nhập Cổng Cán bộ"}</span>
          </button>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
            <Lock size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <span>
              Sử dụng chung tài khoản Cán bộ đã được Bí thư Chi bộ phê duyệt trên hệ thống{" "}
              <strong className="text-slate-700">bdhkp3.vercel.app</strong>. Mọi truy cập dữ liệu
              dân cư đều được bảo vệ bởi RLS & ghi nhật ký kiểm toán.
            </span>
          </div>
        </form>

        <a
          href="https://bdhkp3.vercel.app/login"
          target="_blank"
          rel="noreferrer"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl p-3 text-xs font-semibold flex items-center justify-between transition-all"
        >
          <span>Chưa có tài khoản? Đăng ký Cán bộ trên Cổng Web</span>
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  // --- VIEW 2: ĐÃ ĐĂNG NHẬP CÁN BỘ ---
  return (
    <div className="flex flex-col gap-3.5 pb-24">
      {/* Staff Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-b-2xl shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              {staffProfile.full_name
                .split(" ")
                .slice(-2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {staffProfile.role === "admin" ? "Quản trị viên KP3" : "Cán bộ đã duyệt"}
                </span>
              </div>
              <h1 className="text-sm font-bold leading-tight mt-0.5">{staffProfile.full_name}</h1>
              <div className="text-[11px] text-slate-300">
                {staffProfile.position || "Ban Điều hành Khu phố 3"} • {staffProfile.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0"
          >
            <LogOut size={12} />
            <span>Thoát</span>
          </button>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-4 gap-1.5 mt-3.5">
          <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
            <Users size={14} className="mx-auto text-blue-300 mb-0.5" />
            <div className="text-xs font-bold">{stats.residents.toLocaleString("vi-VN")}</div>
            <div className="text-[10px] text-slate-300">Nhân khẩu</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
            <Home size={14} className="mx-auto text-emerald-300 mb-0.5" />
            <div className="text-xs font-bold">{stats.households.toLocaleString("vi-VN")}</div>
            <div className="text-[10px] text-slate-300">Hộ GĐ</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
            <Building2 size={14} className="mx-auto text-amber-300 mb-0.5" />
            <div className="text-xs font-bold">{stats.businesses.toLocaleString("vi-VN")}</div>
            <div className="text-[10px] text-slate-300">Cơ sở KD</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
            <AlertTriangle size={14} className="mx-auto text-red-300 mb-0.5" />
            <div className="text-xs font-bold">{stats.pendingReports}</div>
            <div className="text-[10px] text-slate-300">Chờ xử lý</div>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* Sub-Navigation Pills */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("reports")}
            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              subTab === "reports"
                ? "bg-white text-red-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            1022 ({stats.pendingReports})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("schedules")}
            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              subTab === "schedules"
                ? "bg-white text-red-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Lịch họp
          </button>
          <button
            type="button"
            onClick={() => setSubTab("residents")}
            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              subTab === "residents"
                ? "bg-white text-red-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Dân cư
          </button>
          <button
            type="button"
            onClick={() => setSubTab("publish")}
            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              subTab === "publish"
                ? "bg-white text-red-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Đăng tin
          </button>
        </div>

        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-2.5 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* SUB-TAB 1: XỬ LÝ PHẢN ÁNH 1022 */}
        {subTab === "reports" && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh sách Phản ánh 1022 mới nhất
              </h2>
              <button
                type="button"
                onClick={() => void loadStaffData()}
                className="text-xs text-blue-600 font-semibold flex items-center gap-1"
              >
                <RefreshCw size={12} className={loadingData ? "animate-spin" : ""} />
                <span>Làm mới</span>
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                {loadingData ? "Đang tải phản ánh..." : "Chưa có phản ánh hiện trường nào."}
              </div>
            ) : (
              reports.map((rep) => {
                const isResolved = rep.status === "Đã giải quyết";
                return (
                  <div
                    key={rep.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        {rep.category || "Phản ánh"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900">{rep.title}</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{rep.description}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {rep.location}
                      </span>
                      {rep.reporter_phone && (
                        <a
                          href={`tel:${rep.reporter_phone}`}
                          className="flex items-center gap-1 text-blue-600 font-semibold"
                        >
                          <Phone size={11} />
                          {rep.reporter_phone}
                        </a>
                      )}
                    </div>

                    {!isResolved && (
                      <div className="pt-2 border-t border-slate-100">
                        {resolvingId === rep.id ? (
                          <div className="flex flex-col gap-2">
                            <label htmlFor={`resolve-note-${rep.id}`} className="sr-only">
                              Nội dung phản hồi xử lý
                            </label>
                            <textarea
                              id={`resolve-note-${rep.id}`}
                              name="resolveNote"
                              rows={2}
                              value={resolveNote}
                              onChange={(e) => setResolveNote(e.target.value)}
                              placeholder="Nhập kết quả xử lý gửi phản hồi cho cư dân..."
                              className="text-xs"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleResolveReport(rep.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg"
                              >
                                Xác nhận Đã giải quyết
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingId(null);
                                  setResolveNote("");
                                }}
                                className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setResolvingId(rep.id)}
                            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 size={14} />
                            <span>Cập nhật xử lý xong</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUB-TAB 2: LỊCH CÔNG TÁC */}
        {subTab === "schedules" && (
          <div className="flex flex-col gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lịch họp & Công tác Khu phố 3
            </h2>
            {schedules.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                Chưa có lịch công tác nào.
              </div>
            ) : (
              schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <Calendar size={11} />
                      {sc.schedule_date || "Chưa rõ ngày"}{" "}
                      {sc.schedule_time ? `• ${sc.schedule_time}` : ""}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">{sc.title}</div>
                  {sc.location && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <MapPin size={11} className="shrink-0 text-slate-400" />
                      <span>{sc.location}</span>
                    </div>
                  )}
                  {sc.host && (
                    <div className="text-[11px] text-slate-500">
                      Chủ trì / Phụ trách: <strong className="text-slate-700">{sc.host}</strong>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* SUB-TAB 3: TRA CỨU DÂN CƯ & CẢNH BÁO TẠM TRÚ (QUYỀN CÁN BỘ) */}
        {subTab === "residents" && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleStaffResidentSearch} className="flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="staff-resident-query" className="sr-only">
                  Tìm kiếm nhân khẩu theo Họ tên, CCCD, SĐT hoặc Mã hộ
                </label>
                <input
                  id="staff-resident-query"
                  name="residentQuery"
                  type="text"
                  value={resQuery}
                  onChange={(e) => setResQuery(e.target.value)}
                  placeholder="Nhập Họ tên, số CCCD, SĐT hoặc Mã hộ..."
                  className="pl-8 text-xs py-2"
                />
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={resLoading}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 rounded-xl shrink-0"
              >
                {resLoading ? "Tìm..." : "Tra cứu"}
              </button>
            </form>

            {/* Quick filter: Sắp hết hạn tạm trú <= 30 ngày */}
            <button
              type="button"
              onClick={() => void handleLoadExpiringTempResidents()}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                expiringMode
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <Clock size={14} />
              <span>Lọc nhanh: Tạm trú sắp hết hạn ≤ 30 ngày / quá hạn</span>
            </button>

            {resSearched && resResults.length === 0 && !resLoading && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-500">
                {expiringMode
                  ? "Hiện không có nhân khẩu tạm trú nào sắp hết hạn trong 30 ngày tới."
                  : "Không tìm thấy nhân khẩu phù hợp trong CSDL Khu phố 3."}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {resResults.map((r) => {
                const isRevealed = Boolean(revealedCccdIds[r.id]);
                const isOverdue = typeof r.daysLeft === "number" && r.daysLeft < 0;
                const isWarn = typeof r.daysLeft === "number" && r.daysLeft >= 0 && r.daysLeft <= 30;
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{r.full_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          r.status === "Thường trú"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {r.status || "Cư dân"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <span className="font-mono text-[11px] text-slate-700">
                        CCCD: {isRevealed ? r.cccd || "—" : maskCccd(r.cccd)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedCccdIds((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                        }
                        aria-label={isRevealed ? "Ẩn CCCD" : "Xem đầy đủ CCCD"}
                        className="text-blue-600 text-[11px] font-bold flex items-center gap-1"
                      >
                        {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{isRevealed ? "Ẩn" : "Xem"}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      📍 {r.current_address || r.address || r.permanent_address || "Khu phố 3, P. An Phú"}
                    </div>

                    {r.temporary_exp_date && (
                      <div
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                          isOverdue
                            ? "bg-red-50 text-red-700 border-red-200"
                            : isWarn
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                        }`}
                      >
                        ⏳ Hạn tạm trú: {r.temporary_exp_date}
                        {isOverdue && ` (Quá hạn ${Math.abs(r.daysLeft!)} ngày)`}
                        {isWarn && ` (Còn ${r.daysLeft} ngày)`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: ĐĂNG THÔNG BÁO NHANH LÊN CỔNG CƯ DÂN */}
        {subTab === "publish" && (
          <form
            onSubmit={handlePublishQuickNews}
            className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Megaphone size={15} className="text-red-600" />
              <span>Phát Hành Thông Báo Nhanh Đến Cư Dân KP3</span>
            </div>

            <div>
              <label htmlFor="quick-news-category" className="block text-xs font-bold text-slate-700 mb-1">
                Chuyên mục
              </label>
              <select
                id="quick-news-category"
                name="newsCategory"
                value={newsCategory}
                onChange={(e) => setNewsCategory(e.target.value)}
                className="text-xs"
              >
                <option value="Thông báo khẩn">Thông báo khẩn</option>
                <option value="Hành chính">Hành chính</option>
                <option value="An ninh trật tự">An ninh trật tự</option>
                <option value="PCCC">PCCC</option>
                <option value="Phong trào">Phong trào</option>
              </select>
            </div>

            <div>
              <label htmlFor="quick-news-title" className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề thông báo
              </label>
              <input
                id="quick-news-title"
                name="newsTitle"
                type="text"
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="VD: Thông báo lịch cắt điện / họp tổ dân phố..."
                className="text-xs"
                required
              />
            </div>

            <div>
              <label htmlFor="quick-news-content" className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung chi tiết
              </label>
              <textarea
                id="quick-news-content"
                name="newsContent"
                rows={4}
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                placeholder="Nhập nội dung thông báo gửi đến toàn thể Nhân dân Khu phố 3..."
                className="text-xs"
                required
              />
            </div>

            <label
              htmlFor="quick-news-pinned"
              className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer"
            >
              <input
                id="quick-news-pinned"
                name="newsPinned"
                type="checkbox"
                checked={newsPinned}
                onChange={(e) => setNewsPinned(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span>Ghim nổi bật lên Trang chủ Cổng Cư dân & Zalo Mini App</span>
            </label>

            <button
              type="submit"
              disabled={publishing}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
            >
              <Send size={14} />
              <span>{publishing ? "Đang phát hành..." : "Đăng thông báo ngay"}</span>
            </button>
          </form>
        )}

        {/* Open Full Web Dashboard */}
        <a
          href="https://bdhkp3.vercel.app/dashboard"
          target="_blank"
          rel="noreferrer"
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl p-3 text-xs font-bold flex items-center justify-between transition-all mt-1"
        >
          <span>Mở Bảng Điều Hành Web Đầy Đủ (GIS, Excel, Word)</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};
