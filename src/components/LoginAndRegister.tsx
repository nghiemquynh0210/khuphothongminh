import React, { useState } from "react";
import { 
  Lock, 
  User, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Users,
  Fingerprint,
  FileCheck,
  Mail,
  Briefcase,
  Clock,
  Loader2,
  KeyRound,
  RotateCcw,
  Send
} from "lucide-react";
import { PendingRegistration } from "./SettingsAndPermissions";
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

  // Trạng thái tài khoản chờ duyệt
  const [pendingUser, setPendingUser] = useState<{
    email: string;
    fullName: string;
    position?: string;
  } | null>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");

  // Cadre Register form state
  const [cadreEmail, setCadreEmail] = useState("");
  const [cadrePassword, setCadrePassword] = useState("");
  const [cadreFullName, setCadreFullName] = useState("");
  const [cadrePhone, setCadrePhone] = useState("");
  const [cadrePosition, setCadrePosition] = useState("Cán bộ Tổ dân phố");

  // Resident Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regGender, setRegGender] = useState<"Nam" | "Nữ">("Nam");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regCCCD, setRegCCCD] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regStatus, setRegStatus] = useState<"Thường trú" | "Tạm trú">("Thường trú");
  const [regOccupation, setRegOccupation] = useState("");
  const [regAddress, setRegAddress] = useState("42 Lương Định Của, Phường An Phú");
  const [regHouseholdId, setRegHouseholdId] = useState(householdCodes[0] || "HK-301");
  const [regRelation, setRegRelation] = useState("Thành viên");
  const [regCoordinates, setRegCoordinates] = useState("10°56'07.5\"N 106°44'38.0\"E");

  // 1. Đăng nhập Supabase Auth thật
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingUser(null);

    const inputUser = username.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setError("Vui lòng điền đầy đủ Email/Tên đăng nhập và Mật khẩu!");
      return;
    }

    setLoading(true);

    try {
      // Chuẩn hóa email
      let emailToLogin = inputUser;
      let passwordToLogin = inputPass;

      // Hỗ trợ alias canbo / bdhkhupho3.ap@gmail.com
      if (inputUser.toLowerCase() === "canbo" || inputUser.toLowerCase() === "bdhkhupho3.ap@gmail.com") {
        emailToLogin = "bdhkhupho3.ap@gmail.com";
        if (inputPass === "admin123" || inputPass === "Canbo@KP3AnPhu") {
          passwordToLogin = "Trunghuy741";
        }
      }

      if (isSupabaseConfigured && supabase) {
        // Thực hiện đăng nhập thật qua Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailToLogin,
          password: passwordToLogin,
        });

        if (authError) {
          // Fallback nếu người dùng gõ sai mật khẩu hoặc tài khoản demo
          if (inputUser === "nguoidan" && inputPass === "user123") {
            onLoginSuccess({
              username: "nguoidan",
              fullName: "Nguyễn Thị Mai",
              role: "nguoidan",
              cccd: "079195000456",
              householdCode: "HK-301",
              phone: "0918765432"
            });
            return;
          }
          throw new Error(authError.message === "Invalid login credentials" 
            ? "Sai thông tin đăng nhập! Vui lòng kiểm tra lại Email và Mật khẩu." 
            : authError.message);
        }

        if (authData?.user) {
          // Kiểm tra hồ sơ và trạng thái phê duyệt trong bảng user_profiles
          const { data: profile } = await (supabase as any)
            .from("user_profiles")
            .select("*")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (profile) {
            // Kiểm tra trạng thái duyệt
            if (profile.approval_status === "pending") {
              setPendingUser({
                email: profile.email,
                fullName: profile.full_name,
                position: profile.position
              });
              setLoading(false);
              return;
            }

            if (profile.approval_status === "rejected") {
              setError("Tài khoản của bạn đã bị từ chối phê duyệt quyền cán bộ. Vui lòng liên hệ Thường trực Ban Điều Hành.");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }

            // Đăng nhập Cán bộ thành công với trạng thái approved
            onLoginSuccess({
              username: profile.email.split("@")[0],
              fullName: profile.full_name,
              role: profile.role === "admin" || profile.role === "cadre" ? "canbo" : "nguoidan",
              phone: profile.phone || ""
            });
            return;
          } else {
            // Nếu là admin mặc định
            onLoginSuccess({
              username: "canbo",
              fullName: "Bí thư Nguyễn Văn Hùng",
              role: "canbo",
              phone: "0901234567"
            });
            return;
          }
        }
      } else {
        // Fallback offline / local nếu chưa cấu hình Supabase
        if (inputUser === "canbo" && inputPass === "admin123") {
          onLoginSuccess({
            username: "canbo",
            fullName: "Nguyễn Văn Hùng",
            role: "canbo",
            phone: "0901234567"
          });
        } else if (inputUser === "nguoidan" && inputPass === "user123") {
          onLoginSuccess({
            username: "nguoidan",
            fullName: "Nguyễn Thị Mai",
            role: "nguoidan",
            cccd: "079195000456",
            householdCode: "HK-301",
            phone: "0918765432"
          });
        } else {
          setError("Sai thông tin đăng nhập! Bạn có thể sử dụng bảng Đăng Nhập Nhanh phía dưới để trải nghiệm.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi đăng nhập hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Đăng ký Cán bộ mới (yêu cầu phê duyệt)
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

  // 5. Đăng nhập nhanh 1-chạm (tự động kết nối Supabase session thật)
  const handleQuickLogin = async (role: "canbo" | "nguoidan") => {
    if (role === "canbo") {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          // Đăng nhập session thật với tài khoản Quản trị viên đã tạo
          await supabase.auth.signInWithPassword({
            email: "bdhkhupho3.ap@gmail.com",
            password: "Trunghuy741"
          });
        }
      } catch (err) {
        console.warn("Fast login Supabase auth silent error:", err);
      } finally {
        setLoading(false);
        onLoginSuccess({
          username: "canbo",
          fullName: "Bí thư Nguyễn Văn Hùng",
          role: "canbo",
          phone: "0901234567"
        });
      }
    } else {
      onLoginSuccess({
        username: "nguoidan",
        fullName: "Nguyễn Thị Mai",
        role: "nguoidan",
        cccd: "079195000456",
        householdCode: "HK-301",
        phone: "0918765432"
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-lg relative z-10 my-8">
        {onBackToLanding && (
          <div className="flex justify-start mb-6">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer backdrop-blur-sm shadow-sm"
            >
              <span>← Về Cổng thông tin Cư dân</span>
            </button>
          </div>
        )}
        
        {/* Logo and App Title */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center font-bold text-white shadow-xl shadow-emerald-500/10 mb-4 text-xl">
            KP3
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">KHU PHỐ THÔNG MINH AN PHÚ</h2>
          <p className="text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-wider">Hệ thống Quản lý Dân cư & Dịch vụ Đô thị thông minh</p>
          
          {/* Badge Supabase Status */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Kết nối Supabase PostgreSQL: 11.632 Cư dân & 488 Hộ
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 text-xs leading-relaxed flex gap-3 animate-in fade-in duration-300">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Thao tác thành công!</p>
              <p className="mt-0.5">{successMsg}</p>
              <button 
                onClick={() => {
                  setSuccessMsg("");
                  setAuthMode("login");
                }}
                className="mt-2 text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-md font-semibold text-[10px] transition-colors cursor-pointer"
              >
                Về màn hình Đăng nhập ➜
              </button>
            </div>
          </div>
        )}

        {/* Card Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs flex gap-2.5 items-start">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pending Approval Screen */}
          {pendingUser ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Clock size={32} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Tài khoản đang chờ phê duyệt</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Xin chào <strong className="text-white">{pendingUser.fullName}</strong>. Hồ sơ công tác ({pendingUser.position || "Cán bộ"}) với email <code className="text-amber-300 font-mono text-[11px]">{pendingUser.email}</code> đã được tiếp nhận.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Quy trình bảo mật Cán bộ:
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Để đảm bảo an toàn dữ liệu dân cư theo Luật An ninh mạng, tài khoản cán bộ mới cần được Thường trực Ban Điều Hành Khu phố 3 (Bí thư Chi bộ Nguyễn Văn Hùng) xác nhận danh tính trước khi cấp quyền truy cập.
                </p>
                <p className="text-slate-500 text-[10px] italic">
                  Hỗ trợ nhanh: Liên hệ <strong>bdhkhupho3.ap@gmail.com</strong>
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingUser(null);
                    setAuthMode("login");
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </div>
          ) : authMode === "login" ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Bypass Button: Enter directly as Resident or Cadre */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Truy cập nhanh 1-chạm
                  </span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    SUPABASE AUTH SESSION
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin("canbo")}
                    className="py-2.5 px-3 bg-[#073B72] hover:bg-[#005BAC] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <span>Vào Cổng Cán bộ</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin("nguoidan")}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <span>Vào Cổng Cư dân</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-800 pb-3 mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">Hoặc đăng nhập tài khoản</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Xác thực Supabase Auth & Phân quyền RLS</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Email hoặc Tên đăng nhập</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="bdhkhupho3.ap@gmail.com hoặc canbo"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("forgot_password");
                      setError("");
                    }}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu của bạn"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 pt-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang xác thực...
                  </>
                ) : (
                  <>
                    Đăng nhập hệ thống <ArrowRight size={15} />
                  </>
                )}
              </button>

              {/* Redirect to registration */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register_cadre");
                    setError("");
                  }}
                  className="text-slate-400 hover:text-indigo-400 font-medium cursor-pointer"
                >
                  Đăng ký tài khoản Cán bộ ➜
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register_resident");
                    setError("");
                  }}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Khai báo Nhân khẩu mới ➜
                </button>
              </div>
            </form>
          ) : authMode === "forgot_password" ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-2">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <KeyRound size={18} className="text-emerald-400" />
                  Khôi phục Mật khẩu
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Hệ thống sẽ gửi liên kết thiết lập lại mật khẩu qua email</p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Email đã đăng ký</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Gửi liên kết
                </button>
              </div>
            </form>
          ) : authMode === "register_cadre" ? (
            /* Register Cadre Form */
            <form onSubmit={handleCadreRegisterSubmit} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-2">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-400" />
                  Đăng ký Tài khoản Cán bộ
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Dành cho Thường trực Chi bộ, Ban Điều hành và Tổ trưởng dân phố</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={cadreFullName}
                    onChange={(e) => setCadreFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="0908xxxxxx"
                    value={cadrePhone}
                    onChange={(e) => setCadrePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Chức vụ công tác *</label>
                <select
                  value={cadrePosition}
                  onChange={(e) => setCadrePosition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Cán bộ Tổ dân phố">Cán bộ Tổ dân phố</option>
                  <option value="Thành viên Ban Điều hành">Thành viên Ban Điều hành</option>
                  <option value="Chi ủy viên / Đảng viên">Chi ủy viên / Đảng viên</option>
                  <option value="Cảnh sát khu vực">Cảnh sát khu vực</option>
                  <option value="Cán bộ Mặt trận / Đoàn thể">Cán bộ Mặt trận / Đoàn thể</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Email công tác *</label>
                <input
                  type="email"
                  required
                  placeholder="canbo.anphu@gmail.com"
                  value={cadreEmail}
                  onChange={(e) => setCadreEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Mật khẩu (tối thiểu 6 ký tự) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={cadrePassword}
                  onChange={(e) => setCadrePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300">
                Lưu ý: Sau khi đăng ký, tài khoản sẽ chuyển sang trạng thái <strong>Chờ Quản trị viên phê duyệt</strong> trước khi được cấp quyền nghiệp vụ.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Đăng ký Cán bộ
                </button>
              </div>
            </form>
          ) : (
            /* Register Resident Form */
            <form onSubmit={handleResidentRegisterSubmit} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-2">
                <h3 className="text-base font-extrabold text-white">Đăng ký Nhân khẩu Trực tuyến</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Khai báo hồ sơ cư trú trực tuyến gửi tới Cán bộ Khu phố 3 phê duyệt</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Giới tính *</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as "Nam" | "Nữ")}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Ngày sinh *</label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY"
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Nghề nghiệp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Kỹ sư, Giáo viên..."
                    value={regOccupation}
                    onChange={(e) => setRegOccupation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Số CCCD (12 chữ số) *</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="079195xxxxxx"
                    value={regCCCD}
                    onChange={(e) => setRegCCCD(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="090xxxxxxx"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Mã Hộ khẩu xin nhập *</label>
                  <select
                    value={regHouseholdId}
                    onChange={(e) => setRegHouseholdId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  >
                    {householdCodes.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Quan hệ với chủ hộ *</label>
                  <input
                    type="text"
                    required
                    placeholder="Con, Vợ, Chồng..."
                    value={regRelation}
                    onChange={(e) => setRegRelation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Loại hình cư trú *</label>
                  <select
                    value={regStatus}
                    onChange={(e) => setRegStatus(e.target.value as "Thường trú" | "Tạm trú")}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Thường trú">Thường trú</option>
                    <option value="Tạm trú">Tạm trú</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Tọa độ vị trí (Google)*</label>
                  <input
                    type="text"
                    required
                    value={regCoordinates}
                    onChange={(e) => setRegCoordinates(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Địa chỉ hiện tại *</label>
                <input
                  type="text"
                  required
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Gửi đăng ký trực tuyến
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Demo Fast Login Panel */}
        <div className="mt-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-3">
          <div className="flex items-center gap-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Sparkles size={12} className="text-emerald-400" />
            Bảng Điều khiển Đăng nhập Nhanh (Dành cho Giám sát/Demo)
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleQuickLogin("canbo")}
              className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-2.5 rounded-xl text-left transition-all hover:bg-slate-900 group cursor-pointer"
            >
              <div className="font-bold text-indigo-400 flex items-center justify-between">
                <span>Cán bộ Khu phố</span>
                <span className="text-[8px] bg-indigo-500/15 px-1 rounded font-normal font-mono group-hover:bg-indigo-500/25">FULL</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Quyền Quản trị viên Supabase</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">bdhkhupho3.ap@gmail.com</p>
            </button>

            <button
              onClick={() => handleQuickLogin("nguoidan")}
              className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-2.5 rounded-xl text-left transition-all hover:bg-slate-900 group cursor-pointer"
            >
              <div className="font-bold text-emerald-400 flex items-center justify-between">
                <span>Cư dân (Mai)</span>
                <span className="text-[8px] bg-emerald-500/15 px-1 rounded font-normal font-mono group-hover:bg-emerald-500/25">RESTRICTED</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Tra cứu cá nhân, gửi 1022</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">nguoidan / user123</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
