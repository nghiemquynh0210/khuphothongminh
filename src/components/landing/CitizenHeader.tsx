import React, { useState } from "react";
import { Building2, LayoutDashboard, LockKeyhole, Menu, X } from "lucide-react";
import { LandingConfig } from "../../types";
import { DEFAULT_LANDING_CONFIG, NAV_ITEMS, ROUTES, Link } from "./landingConstants";

export interface CitizenHeaderProps {
  activeRoute?: string;
  onOpenStaff: () => void;
  goTo?: (id: string) => void;
  isAdmin?: boolean;
  landingConfig?: LandingConfig;
}

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <Link
          to={ROUTES.HOME}
          onClick={() => handleNavClick("all")}
          className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0 flex-1 lg:flex-initial lg:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg p-1 -ml-1 transition-opacity hover:opacity-90"
          aria-label="Về trang chủ Cổng Cư dân số"
        >
          <div
            className="w-9 h-9 rounded-lg bg-gov-navy text-white flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Building2 size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
              {landingConfig.siteTitle}
            </span>
            <span className="text-xs text-slate-600 font-normal hidden sm:block truncate">
              {landingConfig.siteSubtitle}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0"
        >
          {/* Nút Trang chủ */}
          <Link
            to={ROUTES.HOME}
            onClick={() => handleNavClick("all")}
            className={`whitespace-nowrap min-h-[44px] inline-flex items-center px-2 xl:px-2.5 py-2 rounded-md text-xs xl:text-sm font-medium transition-colors cursor-pointer ${
              activeRoute === "all"
                ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-transparent"
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
                className={`whitespace-nowrap min-h-[44px] inline-flex items-center px-2 xl:px-2.5 py-2 rounded-md text-xs xl:text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-transparent"
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
            rel="noreferrer"
            className="hidden 2xl:inline-flex items-center gap-1.5 whitespace-nowrap rounded-md text-xs font-bold transition-colors border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 min-h-[44px] px-3"
            title="Mở Không Gian Số Đảng Ủy Phường An Phú"
          >
            <span>Đảng ủy Phường ↗</span>
          </a>

          <button
            type="button"
            onClick={onOpenStaff}
            className={`hidden sm:inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs xl:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 border min-h-[44px] px-3 cursor-pointer ${
              isAdmin
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 text-slate-700"
            }`}
            title={isAdmin ? "Vào Kênh Tin Tức & Sự Kiện (/dashboard/cultural)" : "Đến Cổng Đăng nhập Cán bộ (/login)"}
          >
            {isAdmin ? (
              <>
                <LayoutDashboard size={14} className="text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Quản trị KP3</span>
              </>
            ) : (
              <>
                <LockKeyhole size={14} className="text-slate-600 shrink-0" aria-hidden="true" />
                <span className="2xl:hidden">Cổng cán bộ</span>
                <span className="hidden 2xl:inline">Cổng dành cho cán bộ</span>
              </>
            )}
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="lg:hidden border-t border-b border-slate-200 bg-white px-4 py-3 space-y-3"
        >
          <nav aria-label="Điều hướng di động" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <Link
              to={ROUTES.HOME}
              onClick={() => handleNavClick("all")}
              className={`min-h-[44px] flex items-center px-3 py-2 rounded-md text-sm font-medium text-left cursor-pointer transition-colors ${
                activeRoute === "all"
                  ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              Trang chủ
            </Link>
            {NAV_ITEMS.map(item => {
              const isActive = activeRoute === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => handleNavClick(item.id)}
                  className={`min-h-[44px] flex items-center px-3 py-2 rounded-md text-sm font-medium text-left cursor-pointer transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenStaff();
              }}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors bg-gov-navy text-white hover:bg-gov-blue px-4 cursor-pointer"
            >
              {isAdmin ? (
                <>
                  <LayoutDashboard size={15} aria-hidden="true" />
                  <span>Quản trị KP3 (/dashboard/cultural)</span>
                </>
              ) : (
                <>
                  <LockKeyhole size={15} aria-hidden="true" />
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
