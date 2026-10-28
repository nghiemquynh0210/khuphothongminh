import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  Map, 
  Bot, 
  MessageSquare, 
  ShieldAlert, 
  Menu, 
  X,
  User,
  Settings,
  Heart,
  CalendarDays,
  Coins,
  FileText,
  LogOut,
  Building2,
  Store,
  CalendarCheck,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { ActiveTab } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: {
    fullName: string;
    role: "canbo" | "nguoidan";
  } | null;
  onLogout: () => void;
  onSwitchRole?: () => void;
  residentPermissions: Record<string, boolean>;
}

interface MenuItemDef {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  badgeColor?: string;
  group?: string;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout,
  onSwitchRole,
  residentPermissions 
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Auto collapse on screens smaller than 1024px (desktop)
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    handleResize(); // Init on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard accessibility: Close mobile drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && window.innerWidth < 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Menu items with structured groups
  const menuItems: MenuItemDef[] = [
    // Group 1: Điều hành
    { 
      id: "dashboard", 
      label: currentUser?.role === "canbo" ? "Tổng quan Cán bộ" : "Cổng Cư dân số", 
      icon: LayoutDashboard,
      group: "ĐIỀU HÀNH & TRỢ LÝ"
    },
    ...(currentUser?.role === "nguoidan" 
      ? [{ id: "forms" as ActiveTab, label: "Biểu mẫu hành chính", icon: FileText, badge: "43", group: "DỊCH VỤ CƯ DÂN" }] 
      : []
    ),
    { id: "tasks", label: "Lịch & Nhiệm vụ", icon: CalendarCheck, group: "ĐIỀU HÀNH & TRỢ LÝ" },
    { id: "ai", label: "Trợ lý AI Gemini", icon: Bot, badge: "AI", badgeColor: "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30", group: "ĐIỀU HÀNH & TRỢ LÝ" },

    // Group 2: Dân cư & Địa bàn
    { id: "residents", label: "Quản lý Dân cư", icon: Users, badge: "11.6k", group: "DÂN CƯ & ĐỊA BÀN" },
    { id: "households", label: "Quản lý Hộ khẩu", icon: Home, badge: "488", group: "DÂN CƯ & ĐỊA BÀN" },
    { id: "gis", label: "Bản đồ số GIS", icon: Map, group: "DÂN CƯ & ĐỊA BÀN" },

    // Group 3: Kinh tế & Doanh nghiệp
    { id: "enterprises", label: "Quản lý Doanh nghiệp", icon: Building2, group: "KINH TẾ & DOANH NGHIỆP" },
    { id: "businesses", label: "Cơ sở Kinh doanh & Trọ", icon: Store, badge: "118", group: "KINH TẾ & DOANH NGHIỆP" },

    // Group 4: Cộng đồng & An sinh
    { id: "reports", label: "Phản ánh hiện trường", icon: MessageSquare, badge: "1022", badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-400/30", group: "CỘNG ĐỒNG & AN SINH" },
    { id: "party", label: "Quản lý Chi hội", icon: ShieldAlert, group: "CỘNG ĐỒNG & AN SINH" },
    { id: "welfare", label: "An sinh Xã hội", icon: Heart, group: "CỘNG ĐỒNG & AN SINH" },
    { id: "cultural", label: "Tin tức & Sự kiện", icon: CalendarDays, group: "CỘNG ĐỒNG & AN SINH" },
    { id: "finance", label: "Quỹ Khu phố", icon: Coins, group: "CỘNG ĐỒNG & AN SINH" },

    // Group 5: Hệ thống
    ...(currentUser?.role === "canbo" ? [
      { id: "settings" as ActiveTab, label: "Cấu hình & Duyệt", icon: Settings, group: "QUẢN TRỊ HỆ THỐNG" }
    ] : [])
  ];

  // Filter items based on user role and permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (!currentUser) return false;
    if (currentUser.role === "canbo") return true;
    return residentPermissions[item.id] ?? false;
  });

  // Group items if user is cán bộ for clean hierarchy
  const isCadre = currentUser?.role === "canbo";

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        id="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3.5 left-3.5 z-50 p-2.5 bg-blue-700 text-white rounded-xl md:hidden hover:bg-blue-800 transition-colors shadow-lg cursor-pointer flex items-center justify-center"
        aria-label="Toggle Navigation"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/70 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          id="sidebar-backdrop"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        id="sidebar-container"
        className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-100 flex flex-col z-50 transition-all duration-300 border-r border-slate-800/80 shadow-xl
          ${isOpen ? "w-64" : "w-20 md:w-20"} 
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* App Logo & Brand Header */}
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-slate-800 h-16 shrink-0 bg-slate-950/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 shrink-0 tracking-wider">
            KP3
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-tight text-white truncate text-sm sm:text-base leading-tight">
                KHU PHỐ 3 AN PHÚ
              </span>
              <span className="text-[10px] text-blue-400 font-mono tracking-widest font-semibold uppercase">
                {currentUser?.role === "canbo" ? "ĐIỀU HÀNH THÔNG MINH" : "CỔNG CƯ DÂN SỐ"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Menu chức năng">
          {visibleMenuItems.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            const prevItem = visibleMenuItems[index - 1];
            const isNewGroup = isCadre && isOpen && item.group && (!prevItem || prevItem.group !== item.group);

            return (
              <React.Fragment key={item.id}>
                {isNewGroup && (
                  <div className="pt-3 pb-1 px-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {item.group}
                    </span>
                  </div>
                )}
                <button
                  id={`nav-${item.id}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    if (window.innerWidth < 768) {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer group relative interactive-tap
                    ${isActive 
                      ? "bg-blue-600/20 text-blue-400 border-l-[3px] border-blue-500 font-semibold shadow-inner" 
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                    }
                  `}
                >
                  <IconComponent 
                    size={19} 
                    className={`shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                    }`} 
                  />
                  
                  {isOpen && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {isOpen && item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                      item.badgeColor || (isActive ? "bg-blue-500/30 text-blue-200" : "bg-slate-800 text-slate-400")
                    }`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip on compact mode */}
                  {!isOpen && (
                    <div className="absolute left-16 bg-slate-950 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-slate-800 flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-blue-900/60 text-blue-300 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User Profile & Role Switch at Bottom */}
        <div className="p-3.5 border-t border-slate-800/90 bg-slate-950/80 shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.role === "canbo" ? (
                <div className="relative shrink-0">
                  <img 
                    id="sidebar-user-avatar"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                    alt="Avatar cán bộ" 
                    className="w-9 h-9 rounded-full border border-blue-500/40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-950"></span>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                  <Users size={17} />
                </div>
              )}
              {isOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {currentUser?.role === "canbo" ? currentUser.fullName : "Cổng Cư dân số"}
                  </span>
                  <span className="text-[10px] text-blue-400 truncate font-mono flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
                    {currentUser?.role === "canbo" ? "Bí thư Chi bộ KP3" : "Truy cập mở toàn dân"}
                  </span>
                </div>
              )}
            </div>
            
            {isOpen && (
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all shrink-0 cursor-pointer"
                title={currentUser?.role === "canbo" ? "Đăng xuất về Cổng Cư dân" : "Làm mới Cổng Cư dân"}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>

          {isOpen && onSwitchRole && (
            <button
              onClick={onSwitchRole}
              className="w-full py-2 px-2.5 bg-slate-900 hover:bg-slate-800/90 text-[11px] font-semibold text-slate-300 hover:text-white rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs interactive-tap"
            >
              <User size={13} className="text-blue-400" />
              <span>{currentUser?.role === "nguoidan" ? "Đăng nhập Cán bộ" : "Về Cổng Cư dân"}</span>
            </button>
          )}
          
          {!isOpen && (
            <button
              onClick={onSwitchRole || onLogout}
              className="w-full py-2 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title={currentUser?.role === "nguoidan" ? "Đăng nhập Cán bộ" : "Về Cổng Cư dân"}
            >
              <User size={17} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
