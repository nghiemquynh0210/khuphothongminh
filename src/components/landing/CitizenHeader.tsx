import React, { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquare,
  Newspaper,
  Users,
  X,
} from "lucide-react";
import { LandingConfig } from "../../types";
import { DEFAULT_LANDING_CONFIG, NAV_ITEMS, ROUTES, Link } from "./landingConstants";

export interface CitizenHeaderProps {
  activeRoute?: string;
  onOpenStaff?: () => void;
  goTo?: (id: string) => void;
  isAdmin?: boolean;
  landingConfig?: LandingConfig;
}

const NAV_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  all: Home,
  about: Info,
  reflection: MessageSquare,
  forms: FileText,
  notices: Bell,
  news: Newspaper,
  leadership: Users,
  schedule: Calendar,
};

export default function CitizenHeader({
  activeRoute = "all",
  onOpenStaff,
  goTo,
  isAdmin = false,
  landingConfig = DEFAULT_LANDING_CONFIG,
}: CitizenHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    if (goTo) goTo(id);
  };

  // Close mobile drawer on Escape key (shadcn dialog/sheet UX standard)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  // Auto-close mobile drawer when viewport expands to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo (shadcn entity pattern) */}
        <Link
          to={ROUTES.HOME}
          onClick={() => handleNavClick("all")}
          className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0 flex-1 lg:flex-initial lg:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-xl p-1 -ml-1 transition-transform duration-150 active:scale-[0.98]"
          aria-label="Về trang chủ Cổng Cư dân số"
        >
          {landingConfig.logoUrl ? (
            <img
              src={landingConfig.logoUrl}
              alt=""
              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200/90 shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl bg-gov-navy text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              <Building2 size={20} />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight group-hover:text-gov-navy transition-colors truncate">
              {landingConfig.siteTitle}
            </span>
            <span className="text-xs text-slate-500 font-normal hidden sm:block truncate leading-tight">
              {landingConfig.siteSubtitle}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation (shadcn NavigationMenu optimus) */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden lg:flex items-center gap-1 xl:gap-1.5 min-w-0"
        >
          {/* Nút Trang chủ */}
          <Link
            to={ROUTES.HOME}
            onClick={() => handleNavClick("all")}
            aria-current={activeRoute === "all" ? "page" : undefined}
            className={`whitespace-nowrap inline-flex items-center justify-center rounded-lg px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 active:scale-[0.98] ${
              activeRoute === "all"
                ? "bg-slate-100 text-slate-950 font-semibold shadow-2xs border border-slate-200/90"
                : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 border border-transparent"
            }`}
          >
            Trang chủ
          </Link>

          {/* Các mục điều hướng */}
          {NAV_ITEMS.map(item => {
            const isActive = activeRoute === item.id;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap inline-flex items-center justify-center rounded-lg px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 active:scale-[0.98] ${
                  isActive
                    ? "bg-slate-100 text-slate-950 font-semibold shadow-2xs border border-slate-200/90"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 border border-transparent"
                }`}
                title={item.description}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right action area: Link to staff portal / login & Mobile Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://danguy.phuonganphu.gov.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-bold transition-all duration-150 border border-red-200/90 bg-red-50/80 text-red-700 hover:bg-red-100 hover:text-red-800 shadow-2xs h-9 px-3 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            title="Mở Không Gian Số Đảng Ủy Phường An Phú (Cổng số hóa nhiệm kỳ 2025–2030)"
          >
            <span>Đảng ủy Phường</span>
            <ExternalLink size={12} className="opacity-75 shrink-0" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => onOpenStaff?.()}
            className={`hidden sm:inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs xl:text-sm font-semibold transition-all duration-150 h-9 px-3.5 shadow-2xs cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
              isAdmin
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-400"
                : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-400"
            }`}
            title={isAdmin ? "Vào Bảng Điều Hành Quản Trị KP3 (/dashboard/cultural)" : "Đến Cổng Đăng nhập Cán bộ (/login)"}
          >
            {isAdmin ? (
              <>
                <LayoutDashboard size={14} className="text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Quản trị KP3</span>
              </>
            ) : (
              <>
                <LockKeyhole size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
                <span className="2xl:hidden">Cổng cán bộ</span>
                <span className="hidden 2xl:inline">Cổng dành cho cán bộ</span>
              </>
            )}
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200/90 shadow-2xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:scale-[0.98]"
            aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (shadcn Sheet optimus) */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-t border-slate-200/80 bg-white/98 backdrop-blur-md px-4 py-4 shadow-lg space-y-4 animate-in slide-in-from-top-2 fade-in duration-200"
        >
          <nav aria-label="Điều hướng di động" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <Link
              to={ROUTES.HOME}
              onClick={() => handleNavClick("all")}
              aria-current={activeRoute === "all" ? "page" : undefined}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                activeRoute === "all"
                  ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200/90 shadow-2xs"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-transparent"
              }`}
            >
              <Home size={16} className={activeRoute === "all" ? "text-slate-900" : "text-slate-400"} aria-hidden="true" />
              <span>Trang chủ</span>
            </Link>

            {NAV_ITEMS.map(item => {
              const isActive = activeRoute === item.id;
              const IconComp = NAV_ICONS[item.id] || FileText;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200/90 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-transparent"
                  }`}
                >
                  <IconComp size={16} className={isActive ? "text-slate-900" : "text-slate-400"} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-200/90 space-y-2">
            <a
              href="https://danguy.phuonganphu.gov.vn/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg text-xs sm:text-sm font-bold transition-colors border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-4 shadow-2xs"
              title="Mở Không Gian Số Đảng Ủy Phường An Phú"
            >
              <span>🏛️ Không Gian Số Đảng Ủy Phường An Phú</span>
              <ExternalLink size={13} className="shrink-0 opacity-80" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenStaff?.();
              }}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors bg-gov-navy text-white hover:bg-gov-blue px-4 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              {isAdmin ? (
                <>
                  <LayoutDashboard size={16} aria-hidden="true" />
                  <span>Quản trị KP3 (/dashboard/cultural)</span>
                </>
              ) : (
                <>
                  <LockKeyhole size={16} aria-hidden="true" />
                  <span>Cổng dành cho cán bộ</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
