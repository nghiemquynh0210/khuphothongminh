import React, { useState } from "react";
import {
  Lock,
  User,
  ShieldCheck,
  Phone,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Users,
  Fingerprint,
  Mail,
  Briefcase,
  Clock,
  Loader2,
  KeyRound,
  Building2,
  ShieldAlert,
  CreditCard,
  FileCheck2,
  X
} from "lucide-react";
import { PendingRegistration } from "./SettingsAndPermissions";
import { ReportSelect } from "./reports/ReportSelect";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface LoginAndRegisterProps {
  onLoginSuccess: (user: {
    username: string;
    fullName: string;
    role: "canbo" | "nguoidan";
    cccd?: string;
    householdCode?: string;
    phone?: string;
  }) => void;
  onRegisterSubmit: (registration: PendingRegistration) => void;
  householdCodes: string[];
  onBackToLanding?: () => void;
}

export default function LoginAndRegister({
  onLoginSuccess,
  onRegisterSubmit,
  householdCodes,
  onBackToLanding
}: LoginAndRegisterProps) {
  // Mode: "login" | "register_resident" | "register_cadre" | "forgot_password"
  const [authMode, setAuthMode] = useState<"login" | "register_resident" | "register_cadre" | "forgot_password">("login");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Trạng thái tài khoản cán bộ chờ phê duyệt
  const [pendingUser, setPendingUser] = useState<{
    email: string;
    fullName: string;
    position?: string;
  } | null>(null);

  // Login form state
  const [username, setUsername] = useState(() => {
    try {
      const saved = localStorage.getItem("kp3_saved_login_user") || "";
      if (isSupabaseConfigured && saved && !saved.includes("@")) {
        return "";
      }
      return saved;
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");

  // Cadre Register form state
  const [cadreEmail, setCadreEmail] = useState("");
  const [cadrePassword, setCadrePassword] = useState("");
  const [cadreFullName, setCadreFullName] = useState("");
  const [cadrePhone, setCadrePhone] = useState("");
  const [cadrePosition, setCadrePosition] = useState("Cán bộ Ban Điều hành KP3");

  // Resident Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regGender, setRegGender] = useState<"Nam" | "Nữ">("Nam");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regCCCD, setRegCCCD] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regStatus, setRegStatus] = useState<"Thường trú" | "Tạm trú">("Thường trú");
  const [regOccupation, setRegOccupation] = useState("");
  const [regAddress, setRegAddress] = useState("42 Lương Định Của, Phường An Phú, TP. Thủ Đức");
  const [regHouseholdId, setRegHouseholdId] = useState(householdCodes[0] || "HK-301");
  const [regRelation, setRegRelation] = useState("Thành viên");
  const [regCoordinates, setRegCoordinates] = useState("10°56'07.5\"N 106°44'38.0\"E");

  // 1. Xử lý Đăng nhập hệ thống (Xác thực Supabase Auth thật & Phân quyền RLS)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingUser(null);

    const inputUser = username.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
              setError("Vui lòng nhập đầy đủ Email công vụ và Mật khẩu!");
              return;
            }

            setLoading(true);

            try {
              const lowerUser = inputUser.toLowerCase();

              // Tài khoản Quản trị / Cán bộ (xác thực trực tiếp qua Supabase Auth)
              const isAdminAlias = lowerUser === "admin" || lowerUser === "canbo";
              if (isAdminAlias || inputUser.includes("@")) {
                const targetEmail = isAdminAlias ? "bdhkhupho3.ap@gmail.com" : inputUser;
                if (isSupabaseConfigured && supabase) {
                  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: targetEmail,
                    password: inputPass,
                  });

                  if (authError) {
                    throw new Error(
                      authError.message === "Invalid login credentials"
                        ? "Email hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại."
                        : authError.message
                    );
                  }

                  if (authData?.user) {
                    // Kiểm tra trạng thái phê duyệt trong bảng user_profiles
                    const { data: profile } = await (supabase as any)
                      .from("user_profiles")
                      .select("*")
                      .eq("id", authData.user.id)
                      .maybeSingle();

                    if (!profile || profile.approval_status === "pending") {
                      await supabase.auth.signOut().catch(() => {});
                      setPendingUser({
                        email: profile?.email || authData.user.email || targetEmail,
                        fullName:
                          profile?.full_name ||
                          authData.user.user_metadata?.full_name ||
                          "Cán bộ Khu phố 3",
                        position:
                          profile?.position ||
                          authData.user.user_metadata?.position ||
                          "Cán bộ Khu phố",
                      });
                      setLoading(false);
                      return;
                    }

                    if (profile.approval_status === "rejected") {
                      await supabase.auth.signOut().catch(() => {});
                      throw new Error(
                        "Tài khoản của bạn đã bị từ chối cấp quyền công tác. Vui lòng liên hệ Thường trực Ban điều hành."
                      );
                    }

                    if (profile.role !== "admin" && profile.role !== "cadre") {
                      await supabase.auth.signOut().catch(() => {});
                      throw new Error(
                        "Tài khoản chưa được phân quyền Cán bộ quản lý. Vui lòng liên hệ Thường trực Ban điều hành."
                      );
                    }

                    const authenticatedUser = {
                      username: profile.email.split("@")[0],
                      fullName: profile.full_name,
                      role: "canbo" as const,
                      phone: profile.phone || "",
                    };

                    if (rememberMe) {
                      try {
                        localStorage.setItem("kp3_auth_user", JSON.stringify(authenticatedUser));
                        localStorage.setItem("kp3_saved_login_user", targetEmail);
                      } catch (e) {}
                    } else {
                      try {
                        localStorage.removeItem("kp3_saved_login_user");
                      } catch (e) {}
                    }

                    onLoginSuccess(authenticatedUser);
                    return;
                  }
                } else {
                  throw new Error("Dịch vụ xác thực đám mây tạm thời không khả dụng. Vui lòng thử lại sau.");
                }
              }

              // Không cho phép tra cứu dữ liệu dân cư phía client; yêu cầu email công vụ hợp lệ
              throw new Error("Vui lòng đăng nhập bằng Email công vụ đã được cấp quyền trên hệ thống!");
            } catch (err: any) {
              setError(err?.message || "Đã xảy ra lỗi khi đăng nhập hệ thống.");
            } finally {
              setLoading(false);
            }
          };

  // 2. Đăng ký Cán bộ mới (yêu cầu phê duyệt từ Ban điều hành)
  const handleCadreRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!cadreFullName.trim() || !cadreEmail.trim() || !cadrePassword.trim()) {
      setError("Vui lòng điền đầy đủ Họ tên, Email công tác và Mật khẩu!");
      return;
    }

    if (cadrePassword.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự!");
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cadreEmail.trim(),
          password: cadrePassword,
          options: {
            data: {
              full_name: cadreFullName.trim(),
              phone: cadrePhone.trim(),
              position: cadrePosition,
              role: "cadre"
            }
          }
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        setPendingUser({
          email: cadreEmail.trim(),
          fullName: cadreFullName.trim(),
          position: cadrePosition
        });
        setSuccessMsg("Tạo hồ sơ Cán bộ công tác thành công! Vui lòng chờ Ban Điều Hành Khu phố 3 xem xét phê duyệt danh tính.");
      } else {
        setSuccessMsg("Hệ thống đã ghi nhận hồ sơ Cán bộ công tác. Vui lòng chờ phê duyệt!");
        setAuthMode("login");
      }
    } catch (err: any) {
      setError(err?.message || "Không thể đăng ký tài khoản cán bộ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Khôi phục mật khẩu
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!forgotEmail.trim()) {
      setError("Vui lòng nhập Email đã đăng ký để nhận liên kết đặt lại mật khẩu!");
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
          redirectTo: window.location.origin
        });

        if (resetError) {
          throw new Error(resetError.message);
        }
      }

      setSuccessMsg(`Hệ thống đã gửi hướng dẫn khôi phục mật khẩu tới địa chỉ ${forgotEmail}. Vui lòng kiểm tra hộp thư đến (Inbox) hoặc Spam.`);
      setAuthMode("login");
    } catch (err: any) {
      setError(err?.message || "Không thể gửi email khôi phục mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Khai báo Cư dân trực tuyến
  const handleResidentRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!regFullName || !regCCCD || !regPhone || !regBirthDate || !regOccupation) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    if (regCCCD.length !== 12) {
      setError("Số CCCD phải gồm đúng 12 chữ số!");
      return;
    }

    const registration: PendingRegistration = {
      id: "REG-" + Date.now(),
      fullName: regFullName,
      gender: regGender,
      birthDate: regBirthDate,
      cccd: regCCCD,
      phone: regPhone,
      status: regStatus,
      occupation: regOccupation,
      address: regAddress,
      householdId: regHouseholdId,
      relationToOwner: regRelation,
      coordinates: regCoordinates,
      avatar: regGender === "Nam"
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    };

    onRegisterSubmit(registration);
    setSuccessMsg("Gửi yêu cầu đăng ký cư dân trực tuyến thành công! Hồ sơ đã được chuyển tới Cán bộ Khu phố 3 duyệt.");

    // Reset Form
    setRegFullName("");
    setRegCCCD("");
    setRegPhone("");
    setRegBirthDate("");
    setRegOccupation("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 relative font-sans">
      {/* Subtle Flat Hairline Grid Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" aria-hidden="true"></div>

      {/* TOP HEADER BAR */}
      <div className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 relative z-10 pt-1 pb-4">
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-emerald-800 hover:border-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Về Cổng thông tin Cư dân</span>
          </button>
        ) : (
          <div />
        )}

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true"></span>
          <span>HỆ THỐNG XÁC THỰC SỐ KP3</span>
        </div>
      </div>

      {/* MAIN CENTERPIECE CARD */}
      <div className="w-full max-w-md mx-auto relative z-10 my-auto py-2">
        {/* Success Alert */}
        {successMsg && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs leading-relaxed flex gap-3"
          >
            <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-bold text-emerald-950">Thao tác thành công!</p>
              <p className="mt-0.5 text-emerald-800">{successMsg}</p>
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg("");
                  setAuthMode("login");
                }}
                className="mt-2.5 min-h-[44px] inline-flex items-center gap-1.5 text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                <span>Về màn hình Đăng nhập</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Card Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">

          {/* Header Title & Crest */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl mx-auto mb-3 border border-emerald-800">
              KP3
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
              KHU PHỐ THÔNG MINH AN PHÚ
            </h1>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mt-1">
              ỦY BAN NHÂN DÂN PHƯỜNG AN PHÚ • KHU PHỐ 3
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Trung tâm Chỉ huy Điều hành số & Quản trị Dân cư
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              id="auth-form-error"
              role="alert"
              aria-live="assertive"
              className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex gap-2.5 items-start"
            >
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* 1. SCREEN: PENDING APPROVAL */}
          {pendingUser ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                <Clock size={30} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Tài khoản đang chờ phê duyệt</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Xin chào <strong className="text-slate-900">{pendingUser.fullName}</strong>. Hồ sơ công tác ({pendingUser.position || "Cán bộ"}) với email <code className="text-amber-900 font-mono text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{pendingUser.email}</code> đã được ghi nhận.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-700" aria-hidden="true" />
                  Quy trình bảo mật Cán bộ:
                </p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Để đảm bảo an toàn dữ liệu dân cư theo Luật An ninh mạng, tài khoản cán bộ mới cần được Thường trực Ban Điều Hành Khu phố 3 (Bí thư Chi bộ Nguyễn Văn Hùng) xác nhận danh tính trước khi cấp quyền điều hành.
                </p>
                <p className="text-slate-600 text-xs italic">
                  Hỗ trợ nhanh: Liên hệ <strong>bdhkhupho3.ap@gmail.com</strong>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingUser(null);
                    setAuthMode("login");
                  }}
                  className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </div>
          ) : authMode === "login" ? (
            /* 2. SCREEN: MAIN LOGIN */
            <div className="space-y-4">

              {/* Cổng xác thực Cán bộ & thông báo truy cập công khai cho Cư dân */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-bold">Xác thực Cán bộ Ban Điều hành Khu phố 3</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Cư dân xem Tin tức, Bản đồ GIS và gửi phản ánh hiện trường trực tiếp tại Trang chủ mà không cần đăng nhập.
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Field: Username or Email */}
                <div className="space-y-1">
                  <label htmlFor="auth-username-input" className="text-xs font-bold text-slate-700 block">
                    Email công vụ đã đăng ký *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500" aria-hidden="true">
                      <Mail size={15} />
                    </div>
                    <input
                      id="auth-username-input"
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      required
                      aria-invalid={Boolean(error && !username.trim())}
                      aria-describedby={error ? "auth-form-error" : undefined}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập email công vụ đã đăng ký"
                      className="w-full min-h-[44px] pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 user-invalid:bg-rose-50/40 transition-colors font-medium"
                    />
                  </div>
                </div>

                {/* Field: Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="auth-password-input" className="text-xs font-bold text-slate-700 block">Mật khẩu truy cập *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("forgot_password");
                        setError("");
                      }}
                      className="min-h-[32px] inline-flex items-center text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-semibold cursor-pointer py-1 px-1.5 rounded"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500" aria-hidden="true">
                      <Lock size={15} />
                    </div>
                    <input
                      id="auth-password-input"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      enterKeyHint="done"
                      required
                      aria-invalid={Boolean(error && !password.trim())}
                      aria-describedby={error ? "auth-form-error" : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu truy cập"
                      className="w-full min-h-[44px] pl-9 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 user-invalid:bg-rose-50/40 transition-colors font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute inset-y-0 right-0 min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer rounded-r-xl"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between">
                  <label className="min-h-[44px] inline-flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="font-medium">Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm border border-emerald-800 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Đang xác thực thông tin...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Nav Links */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register_cadre");
                    setError("");
                  }}
                  className="min-h-[44px] py-2 text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  Đăng ký Cán bộ mới ➜
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register_resident");
                    setError("");
                  }}
                  className="min-h-[44px] py-2 text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Khai báo Cư dân mới ➜
                </button>
              </div>

            </div>
          ) : authMode === "forgot_password" ? (
            /* 3. SCREEN: FORGOT PASSWORD */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <KeyRound size={17} className="text-emerald-700" aria-hidden="true" />
                  Khôi phục Mật khẩu
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Hệ thống sẽ gửi liên kết thiết lập lại mật khẩu qua email công vụ của bạn
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="auth-forgot-email" className="text-xs font-bold text-slate-700 block">Email đã đăng ký *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500" aria-hidden="true">
                    <Mail size={15} />
                  </div>
                  <input
                    id="auth-forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(error && !forgotEmail.trim())}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="bdhkhupho3.ap@gmail.com"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                  }}
                  className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-xs font-bold border border-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Đang gửi..." : "Gửi liên kết khôi phục"}
                </button>
              </div>
            </form>
          ) : authMode === "register_cadre" ? (
            /* 4. SCREEN: CADRE REGISTRATION */
            <form onSubmit={handleCadreRegisterSubmit} className="space-y-3.5">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={17} className="text-emerald-700" aria-hidden="true" />
                  Đăng ký Tài khoản Cán bộ
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Dành cho Cán bộ Chi bộ, Ban Điều hành Khu phố 3 &amp; Trưởng các đoàn thể
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="cadre-fullname" className="text-xs font-bold text-slate-700 block">Họ và tên Cán bộ *</label>
                <input
                  id="cadre-fullname"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  value={cadreFullName}
                  onChange={(e) => setCadreFullName(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="cadre-email" className="text-xs font-bold text-slate-700 block">Email công vụ *</label>
                  <input
                    id="cadre-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="canbo@gmail.com"
                    value={cadreEmail}
                    onChange={(e) => setCadreEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="cadre-phone" className="text-xs font-bold text-slate-700 block">Số điện thoại *</label>
                  <input
                    id="cadre-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="090xxxxxxx"
                    value={cadrePhone}
                    onChange={(e) => setCadrePhone(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Chức vụ / Vị trí công tác *</label>
                <ReportSelect
                  aria-label="Chức vụ / Vị trí công tác"
                  value={cadrePosition}
                  onChange={setCadrePosition}
                  options={[
                    { value: "Cán bộ Ban Điều hành KP3", label: "Cán bộ Ban Điều hành KP3" },
                    { value: "Chi ủy viên / Đảng viên", label: "Chi ủy viên / Đảng viên" },
                    { value: "Tổ trưởng / Tổ phó Tổ ANTT", label: "Tổ trưởng / Tổ phó Tổ ANTT" },
                    { value: "Trưởng / Phó Chi hội đoàn thể", label: "Trưởng / Phó Chi hội đoàn thể" },
                    { value: "Cảnh sát khu vực", label: "Cảnh sát khu vực" },
                    { value: "Cán bộ UBND Phường", label: "Cán bộ UBND Phường" },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="cadre-password" className="text-xs font-bold text-slate-700 block">Mật khẩu khởi tạo *</label>
                <input
                  id="cadre-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  value={cadrePassword}
                  onChange={(e) => setCadrePassword(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                  }}
                  className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-xs font-bold border border-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Đang gửi hồ sơ..." : "Gửi đăng ký Cán bộ"}
                </button>
              </div>
            </form>
          ) : (
            /* 5. SCREEN: RESIDENT REGISTRATION */
            <form onSubmit={handleResidentRegisterSubmit} className="space-y-3">
              <div className="border-b border-slate-100 pb-3 mb-1">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <User size={17} className="text-emerald-700" aria-hidden="true" />
                  Khai báo Cư dân Trực tuyến
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Đăng ký thường trú / tạm trú mới vào danh bạ số Khu phố 3
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="reg-fullname" className="text-xs font-bold text-slate-700 block">Họ và tên *</label>
                  <input
                    id="reg-fullname"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Nguyễn Văn A"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">Giới tính *</span>
                  <ReportSelect
                    aria-label="Giới tính"
                    value={regGender}
                    onChange={(val) => setRegGender(val as "Nam" | "Nữ")}
                    options={[
                      { value: "Nam", label: "Nam" },
                      { value: "Nữ", label: "Nữ" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="reg-cccd" className="text-xs font-bold text-slate-700 block">Số CCCD (12 số) *</label>
                  <input
                    id="reg-cccd"
                    name="cccd"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{12}"
                    required
                    maxLength={12}
                    placeholder="079xxxxxxxxx"
                    value={regCCCD}
                    onChange={(e) => setRegCCCD(e.target.value.replace(/\D/g, ""))}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-phone" className="text-xs font-bold text-slate-700 block">Số điện thoại *</label>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="090xxxxxxx"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="reg-birthdate" className="text-xs font-bold text-slate-700 block">Ngày sinh *</label>
                  <input
                    id="reg-birthdate"
                    name="bday"
                    type="text"
                    autoComplete="bday"
                    required
                    placeholder="DD/MM/YYYY"
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-occupation" className="text-xs font-bold text-slate-700 block">Nghề nghiệp *</label>
                  <input
                    id="reg-occupation"
                    name="occupation"
                    type="text"
                    required
                    placeholder="Kỹ sư, Giáo viên..."
                    value={regOccupation}
                    onChange={(e) => setRegOccupation(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">Mã Hộ khẩu *</span>
                  <ReportSelect
                    aria-label="Mã Hộ khẩu"
                    value={regHouseholdId}
                    onChange={setRegHouseholdId}
                    options={householdCodes.map((code) => ({ value: code, label: code }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-relation" className="text-xs font-bold text-slate-700 block">Quan hệ chủ hộ *</label>
                  <input
                    id="reg-relation"
                    name="relation"
                    type="text"
                    required
                    placeholder="Con, Vợ, Chồng..."
                    value={regRelation}
                    onChange={(e) => setRegRelation(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">Hình thức cư trú *</span>
                  <ReportSelect
                    aria-label="Hình thức cư trú"
                    value={regStatus}
                    onChange={(val) => setRegStatus(val as "Thường trú" | "Tạm trú")}
                    options={[
                      { value: "Thường trú", label: "Thường trú" },
                      { value: "Tạm trú", label: "Tạm trú" },
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-coordinates" className="text-xs font-bold text-slate-700 block">Tọa độ GPS *</label>
                  <input
                    id="reg-coordinates"
                    name="coordinates"
                    type="text"
                    required
                    value={regCoordinates}
                    onChange={(e) => setRegCoordinates(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="reg-address" className="text-xs font-bold text-slate-700 block">Địa chỉ nơi cư trú *</label>
                <input
                  id="reg-address"
                  name="street-address"
                  type="text"
                  autoComplete="street-address"
                  required
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white user-invalid:border-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                  }}
                  className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-xs font-bold border border-emerald-800 transition-colors cursor-pointer"
                >
                  Gửi hồ sơ đăng ký
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* FOOTER */}
      <div className="w-full max-w-md mx-auto text-center relative z-10 py-3 space-y-1">
        <p className="text-xs text-slate-600 font-medium">
          Bản quyền © 2026 Ban điều hành Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
        </p>
        <p className="text-xs text-slate-600">
          Hệ thống bảo vệ dữ liệu theo Luật An ninh mạng & Đề án 06/CP Chuyển đổi số quốc gia
        </p>
      </div>

    </div>
  );
}
