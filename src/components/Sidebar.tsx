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
  Newspaper,
  Coins,
  FileText,
  LogOut,
  Building2,
  Store,
  CalendarCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { motion } from "motion/react";
import { spring } from "@animate-ui/react/utils/motion";
import { ActiveTab } from "../types";
import { Link, getDashboardExtensionPath, navigate } from "../routes";

const MotionLink = motion.create(Link);

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: {
    fullName: string;
    role: "canbo" | "nguoidan";
  } | null;
  staffRoleLabel?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout: () => void;
  onSwitchRole?: () => void;
  residentPermissions: Record<string, boolean>;
}

interface SidebarMenuItem {
  id: ActiveTab;
  label: string;
  group: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

function getInitials(name?: string): string {
  if (!name) return "KP3";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  staffRoleLabel = "Ban Điều hành KP3",
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
  onSwitchRole,
  residentPermissions,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer when expanding to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard accessibility: Close mobile drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll when mobile/tablet drawer is open
  useEffect(() => {
    if (mobileOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const menuItems: SidebarMenuItem[] = [
    {
      id: "dashboard",
      group: "Điều hành",
      label: currentUser?.role === "canbo" ? "Tổng quan Cán bộ" : "Cổng Cư dân số",
      icon: LayoutDashboard,
    },
    {
      id: "ai",
      group: "Điều hành",
      label: "Trợ lý AI",
      icon: Bot,
    },
    ...(currentUser?.role === "nguoidan"
      ? [
          {
            id: "forms" as ActiveTab,
            group: "Điều hành",
            label: "Biểu mẫu hành chính",
            icon: FileText,
          },
        ]
      : []),
    { id: "residents", group: "Dân cư & Địa bàn", label: "Quản lý Dân cư", icon: Users },
    { id: "households", group: "Dân cư & Địa bàn", label: "Quản lý Hộ khẩu", icon: Home },
    { id: "gis", group: "Dân cư & Địa bàn", label: "Bản đồ GIS", icon: Map },
    { id: "enterprises", group: "Kinh tế Cơ sở", label: "Quản lý Doanh nghiệp", icon: Building2 },
    { id: "businesses", group: "Kinh tế Cơ sở", label: "Cơ sở Kinh doanh", icon: Store },
    { id: "reports", group: "Tác nghiệp", label: "Phản ánh hiện trường", icon: MessageSquare },
    { id: "tasks", group: "Tác nghiệp", label: "Lịch & Nhiệm vụ", icon: CalendarCheck },
    { id: "party", group: "Đoàn thể & An sinh", label: "Quản lý Chi hội", icon: ShieldAlert },
    { id: "welfare", group: "Đoàn thể & An sinh", label: "An sinh Xã hội", icon: Heart },
    { id: "cultural", group: "Đoàn thể & An sinh", label: "Tin tức & Sự kiện", icon: Newspaper },
    { id: "finance", group: "Tài chính & Hệ thống", label: "Quỹ Khu phố", icon: Coins },
    ...(currentUser?.role === "canbo"
      ? [
          {
            id: "settings" as ActiveTab,
            group: "Tài chính & Hệ thống",
            label: "Cấu hình & Duyệt",
            icon: Settings,
          },
        ]
      : []),
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (!currentUser) return false;
    if (currentUser.role === "canbo") return true;
    return residentPermissions[item.id] ?? false;
  });

  const groups = Array.from(new Set(visibleMenuItems.map((i) => i.group)));
  // On mobile/tablet drawer, always render expanded labels; on desktop, respect isCollapsed
  const showLabels = mobileOpen || !isCollapsed;

  return (
    <>
      {/* Mobile & Tablet (< 1024px) Toggle Button */}
      <button
        id="sidebar-toggle"
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        className={`fixed top-2.5 left-3 z-50 h-11 w-11 items-center justify-center bg-emerald-700 text-white rounded-xl border border-emerald-600 lg:hidden ${
          mobileOpen ? "hidden" : "flex"
        } hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
        aria-label={mobileOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
      >
        <Menu size={20} />
      </button>

      {/* Mobile & Tablet Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          id="sidebar-backdrop"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar-container"
        aria-label="Thanh điều hướng phân hệ Khu phố 3"
        className={`fixed top-0 left-0 h-screen bg-slate-950 text-slate-200 flex flex-col z-50 transition-all duration-300 border-r border-slate-800/80
          w-60 ${isCollapsed ? "lg:w-20" : "lg:w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* App Logo & Desktop Collapse Button */}
        <div className="px-4 flex items-center justify-between gap-2 h-14 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
              KP3
            </div>
            {showLabels && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-tight text-white truncate text-xs sm:text-[13px]">
                  Khu phố 3 An Phú
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  Điều hành đô thị số
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Đóng thanh điều hướng"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Đóng thanh điều hướng"
            >
              <X size={17} />
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
                title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
              >
                {isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
              </button>
            )}
          </div>
        </div>
        <div className="mx-3 h-px bg-slate-800/70 shrink-0" />

        {/* Grouped Enterprise Navigation */}
        <nav className="flex-1 px-2.5 py-2.5 space-y-2.5 overflow-y-auto evon-scroll">
          {groups.map((groupName, gIdx) => {
            const itemsInGroup = visibleMenuItems.filter((i) => i.group === groupName);
            return (
              <div key={groupName} className="space-y-0.5">
                {showLabels ? (
                  <div className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-slate-500 select-none">
                    {groupName}
                  </div>
                ) : (
                  gIdx > 0 && <div className="mx-2 my-1.5 h-px bg-slate-800/80" />
                )}

                {itemsInGroup.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;
                  const itemPath = getDashboardExtensionPath(item.id);

                  return (
                    <MotionLink
                      key={item.id}
                      id={`nav-${item.id}`}
                      to={itemPath}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                      whileTap={{ scale: 0.99 }}
                      transition={spring.press}
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                        setActiveTab(item.id);
                        navigate(itemPath);
                        e.currentTarget.blur();
                        if (window.innerWidth < 1024) {
                          setMobileOpen(false);
                        }
                      }}
                      className={`w-full min-h-[38px] flex items-center ${
                        showLabels ? "px-2.5 justify-start" : "px-0 justify-center"
                      } py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                        ${
                          isActive
                            ? "text-white font-semibold"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-100 font-medium"
                        }
                      `}
                      title={`${item.label} (${itemPath})`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-sidebar-pill"
                          transition={spring.selection}
                          className="absolute inset-0 bg-white/10 rounded-lg -z-0"
                        />
                      )}
                      <span
                        className={`relative z-10 flex items-center gap-2.5 ${
                          showLabels ? "w-full min-w-0" : "justify-center"
                        }`}
                      >
                        <IconComponent
                          size={17}
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? "text-emerald-400"
                              : "text-slate-500 group-hover:text-slate-200"
                          }`}
                        />
                        {showLabels && <span className="truncate">{item.label}</span>}
                      </span>
                    </MotionLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-2.5 border-t border-slate-800/80 shrink-0">
          <div className={`flex items-center ${showLabels ? "justify-between gap-2" : "justify-center"}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.role === "canbo" ? (
                <div
                  id="sidebar-user-avatar"
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0 select-none"
                  title={currentUser.fullName}
                >
                  {getInitials(currentUser.fullName)}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                  <Users size={15} />
                </div>
              )}
              {showLabels && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {currentUser?.role === "canbo" ? currentUser.fullName : "Cổng Cư dân số"}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {currentUser?.role === "canbo" ? staffRoleLabel : "Truy cập mở toàn dân"}
                  </span>
                </div>
              )}
            </div>

            {showLabels && (
              <button
                type="button"
                onClick={onLogout}
                aria-label={
                  currentUser?.role === "canbo"
                    ? "Đăng xuất khỏi hệ thống"
                    : "Làm mới Cổng Cư dân"
                }
                className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                title={
                  currentUser?.role === "canbo"
                    ? "Đăng xuất khỏi hệ thống"
                    : "Làm mới Cổng Cư dân"
                }
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
