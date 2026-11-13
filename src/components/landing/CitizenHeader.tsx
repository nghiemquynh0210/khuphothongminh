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
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetTrigger,
} from "../ui/sheet";
import { cn } from "../../lib/utils";

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
        {/* Brand / Logo (shadcn Avatar entity pattern) */}
        <Link
          to={ROUTES.HOME}
          onClick={() => handleNavClick("all")}
          className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0 flex-1 lg:flex-initial lg:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-xl p-1 -ml-1 transition-transform duration-150 active:scale-[0.98]"
          aria-label="Về trang chủ Cổng Cư dân số"
        >
          <Avatar className="h-9 w-9 rounded-xl group-hover:scale-105 transition-transform duration-150">
            {landingConfig.logoUrl ? (
              <AvatarImage src={landingConfig.logoUrl} alt={landingConfig.siteTitle} />
            ) : null}
            <AvatarFallback className="rounded-xl bg-gov-navy text-white">
              <Building2 size={20} />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight group-hover:text-gov-navy transition-colors truncate">
              {landingConfig.siteTitle}
            </span>
            <span className="text-xs text-slate-500 font-normal hidden sm:block truncate leading-tight">
              {landingConfig.siteSubtitle}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation (shadcn NavigationMenu) */}
        <NavigationMenu aria-label="Điều hướng chính" className="hidden lg:flex">
          <NavigationMenuList>
            {/* Nút Trang chủ */}
            <NavigationMenuItem>
              <Link
                to={ROUTES.HOME}
                onClick={() => handleNavClick("all")}
                aria-current={activeRoute === "all" ? "page" : undefined}
                className={navigationMenuTriggerStyle({ active: activeRoute === "all" })}
              >
                Trang chủ
              </Link>
            </NavigationMenuItem>

            {/* Các mục điều hướng */}
            {NAV_ITEMS.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <NavigationMenuItem key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={navigationMenuTriggerStyle({ active: isActive })}
                    title={item.description}
                  >
                    {item.label}
                  </Link>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right action area: Portal badge, Staff login Button & Mobile Sheet Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://danguy.phuonganphu.gov.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:inline-flex"
            title="Mở Không Gian Số Đảng Ủy Phường An Phú (Cổng số hóa nhiệm kỳ 2025–2030)"
          >
            <Badge
              variant="destructive"
              className="gap-1.5 h-9 px-3 text-xs font-bold border-red-200/90 bg-red-50/80 text-red-700 hover:bg-red-100 hover:text-red-800 shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <span>Đảng ủy Phường</span>
              <ExternalLink size={12} className="opacity-75 shrink-0" aria-hidden="true" />
            </Badge>
          </a>

          <Button
            variant={isAdmin ? "secondary" : "outline"}
            size="sm"
            onClick={() => onOpenStaff?.()}
            className={cn(
              "hidden sm:inline-flex items-center gap-2 font-semibold shadow-2xs whitespace-nowrap",
              isAdmin
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-400"
                : "border-slate-200/90 text-slate-700 hover:text-slate-900"
            )}
            title={isAdmin ? "Vào Bảng Điều Hành Quản Trị KP3 (/dashboard/cultural)" : "Đến Cổng Đăng nhập Cán bộ (/login)"}
          >
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <LayoutDashboard size={14} className="text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Quản trị KP3</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <LockKeyhole size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
                <span className="2xl:hidden">Cổng cán bộ</span>
                <span className="hidden 2xl:inline">Cổng dành cho cán bộ</span>
              </span>
            )}
          </Button>

          {/* Mobile Sheet Drawer using shadcn Sheet */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-slate-700 hover:bg-slate-100 border-slate-200/90 shadow-2xs"
                  aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
                >
                  {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
                </Button>
              </SheetTrigger>

              <SheetContent
                side="top"
                showClose={true}
                className="lg:hidden border-b border-slate-200/90 bg-white/98 backdrop-blur-md px-4 py-5 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto"
              >
                <SheetHeader className="pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 rounded-lg">
                      {landingConfig.logoUrl ? (
                        <AvatarImage src={landingConfig.logoUrl} alt={landingConfig.siteTitle} />
                      ) : null}
                      <AvatarFallback className="rounded-lg bg-gov-navy text-white text-[10px]">
                        <Building2 size={14} />
                      </AvatarFallback>
                    </Avatar>
                    <SheetTitle className="text-sm font-bold text-slate-900 truncate">
                      {landingConfig.siteTitle}
                    </SheetTitle>
                  </div>
                  <SheetDescription className="text-xs text-slate-500">
                    Cổng thông tin & dịch vụ số Khu phố 3, Phường An Phú
                  </SheetDescription>
                </SheetHeader>

                <nav aria-label="Điều hướng di động" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  <SheetClose asChild>
                    <Link
                      to={ROUTES.HOME}
                      onClick={() => handleNavClick("all")}
                      aria-current={activeRoute === "all" ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors",
                        activeRoute === "all"
                          ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200/90 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-transparent"
                      )}
                    >
                      <Home size={16} className={activeRoute === "all" ? "text-slate-900" : "text-slate-400"} aria-hidden="true" />
                      <span>Trang chủ</span>
                    </Link>
                  </SheetClose>

                  {NAV_ITEMS.map((item) => {
                    const isActive = activeRoute === item.id;
                    const IconComp = NAV_ICONS[item.id] || FileText;
                    return (
                      <SheetClose asChild key={item.id}>
                        <Link
                          to={item.path}
                          onClick={() => handleNavClick(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors",
                            isActive
                              ? "bg-slate-100 text-slate-950 font-semibold border border-slate-200/90 shadow-2xs"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-transparent"
                          )}
                        >
                          <IconComp size={16} className={isActive ? "text-slate-900" : "text-slate-400"} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>

                <Separator className="my-2" />

                <div className="space-y-2 pt-1">
                  <a
                    href="https://danguy.phuonganphu.gov.vn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block"
                    title="Mở Không Gian Số Đảng Ủy Phường An Phú"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-center gap-2 rounded-lg text-xs sm:text-sm font-bold border-red-200 bg-red-50 text-red-700 hover:bg-red-100 shadow-2xs"
                    >
                      <span>🏛️ Không Gian Số Đảng Ủy Phường An Phú</span>
                      <ExternalLink size={13} className="shrink-0 opacity-80" aria-hidden="true" />
                    </Button>
                  </a>

                  <SheetClose asChild>
                    <Button
                      variant="default"
                      onClick={() => onOpenStaff?.()}
                      className="w-full h-11 justify-center gap-2 rounded-xl text-sm font-semibold bg-gov-navy text-white hover:bg-gov-blue shadow-xs active:scale-[0.99]"
                    >
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <LayoutDashboard size={16} aria-hidden="true" />
                          <span>Quản trị KP3 (/dashboard/cultural)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <LockKeyhole size={16} aria-hidden="true" />
                          <span>Cổng dành cho cán bộ</span>
                        </span>
                      )}
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
