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
  FileCheck
} from "lucide-react";
import { PendingRegistration } from "./SettingsAndPermissions";

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
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu!");
      return;
    }

    // Check credentials or allow demo login
    if (username === "canbo" && password === "admin123") {
      onLoginSuccess({
        username: "canbo",
        fullName: "Nguyễn Văn Hùng",
        role: "canbo",
        phone: "0901234567"
      });
    } else if (username === "nguoidan" && password === "user123") {
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
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
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

  // Quick login helper
  const handleQuickLogin = (role: "canbo" | "nguoidan") => {
    if (role === "canbo") {
      onLoginSuccess({
        username: "canbo",
        fullName: "Nguyễn Văn Hùng",
        role: "canbo",
        phone: "0901234567"
      });
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
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 text-xs leading-relaxed flex gap-3 animate-in fade-in duration-300">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Đăng ký thành công!</p>
              <p className="mt-0.5">{successMsg}</p>
              <button 
                onClick={() => {
                  setSuccessMsg("");
                  setIsRegisterMode(false);
                }}
                className="mt-2 text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-md font-semibold text-[10px] transition-colors cursor-pointer"
              >
                Quay lại Đăng nhập ➜
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

          {!isRegisterMode ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Bypass Button: Enter directly as Resident */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Truy cập nhanh 1-chạm
                  </span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    MIỄN ĐĂNG NHẬP
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onLoginSuccess({
                      username: "canbo",
                      fullName: "Nguyễn Văn Hùng",
                      role: "canbo",
                      phone: "0901234567"
                    })}
                    className="py-2.5 px-3 bg-[#073B72] hover:bg-[#005BAC] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-950/40 cursor-pointer"
                  >
                    <span>Vào Cổng Cán bộ</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoginSuccess({
                      username: "nguoidan",
                      fullName: "Nguyễn Thị Mai",
                      role: "nguoidan",
                      cccd: "079195000456",
                      householdCode: "HK-301",
                      phone: "0918765432"
                    })}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                  >
                    <span>Vào Cổng Cư dân</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-800 pb-3 mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">Hoặc đăng nhập tài khoản</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Dành cho Cán bộ khu phố hoặc tài khoản khác</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Tên đăng nhập</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="canbo hoặc nguoidan"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin123 hoặc user123"
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 pt-3"
              >
                Đăng nhập hệ thống <ArrowRight size={15} />
              </button>

              {/* Redirect to registration */}
              <div className="pt-4 border-t border-slate-800/80 text-center">
                <span className="text-xs text-slate-500">Bạn là cư dân mới chưa khai báo? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError("");
                  }}
                  className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Đăng ký Nhân khẩu Trực tuyến
                </button>
              </div>
            </form>
          ) : (
            /* Register / Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
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
                    setIsRegisterMode(false);
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
              <p className="text-[10px] text-slate-400 mt-0.5">Quyền Quản trị viên</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">canbo / admin123</p>
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
