import React, { useState, useEffect } from "react";
import { 
  Shield, 
  ShieldAlert, 
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
  Store
} from "lucide-react";
import { Resident, ActiveTab, AdministrativeForm } from "../types";
import AdministrativeForms from "./AdministrativeForms";
import { initialAdministrativeForms } from "../mockForms";

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
  currentUser?: {
    role: "canbo" | "nguoidan";
    fullName?: string;
    phone?: string;
  } | null;
  defaultSubTab?: "approvals" | "forms" | "permissions" | "plan";
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
  currentUser,
  defaultSubTab = "approvals"
}: SettingsAndPermissionsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"approvals" | "forms" | "permissions" | "plan">(defaultSubTab);

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
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
