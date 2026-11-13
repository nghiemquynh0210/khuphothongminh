import React from "react";
import {
  Briefcase,
  Calendar,
  ChevronRight,
  Compass,
  Edit2,
  ExternalLink,
  FileText,
  Home,
  Landmark,
  MapPin,
  Megaphone,
  MessageSquare,
  Search,
  Users,
  X,
} from "lucide-react";
import { AdministrativeForm, CommunityEvent, LandingConfig, LocalNews } from "../../types";
import { KP3_OFFICIAL_BASELINE } from "../../utils/kp3Utils";
import { DEFAULT_LANDING_CONFIG, VERIFIED_LEADERSHIP, ROUTES, Link } from "./landingConstants";
import { Button, buttonVariants } from "../ui/Button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/Card";
import { cn } from "../../lib/utils";

export interface CitizenHeroProps {
  portalSearch: string;
  setPortalSearch: (val: string) => void;
  searchResults: {
    forms: AdministrativeForm[];
    events: CommunityEvent[];
    leaders: typeof VERIFIED_LEADERSHIP;
    news: LocalNews[];
  } | null;
  setPreviewForm: (form: AdministrativeForm | null) => void;
  setEventDetail: (event: CommunityEvent | null) => void;
  setNewsDetail: (news: LocalNews | null) => void;
  goTo: (id: string) => void;
  onNavigateToTab: (tab: any) => void;
  households?: any[];
  residents?: any[];
  businesses?: any[];
  landingConfig?: LandingConfig;
  isAdmin?: boolean;
  onEditConfig?: () => void;
}

export default function CitizenHero({
  portalSearch,
  setPortalSearch,
  searchResults,
  setPreviewForm,
  setEventDetail,
  setNewsDetail,
  goTo,
  onNavigateToTab,
  households,
  residents,
  businesses,
  landingConfig = DEFAULT_LANDING_CONFIG,
  isAdmin = false,
  onEditConfig,
}: CitizenHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gov-navy to-[#06294e] border-b border-blue-950/60 text-white">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Slogan, Actions & Search */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          {/* Badge Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="px-3 py-1 text-xs font-semibold text-blue-100 bg-white/10 border-white/25 backdrop-blur-xs"
            >
              {landingConfig.heroBadge}
            </Badge>

            <a
              href="https://danguy.phuonganphu.gov.vn/"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "destructive",
                size: "sm",
                className: "h-7 px-3 text-xs font-bold bg-red-700 hover:bg-red-800 border-red-500 rounded-full gap-1 shadow-2xs",
              })}
            >
              <span>Không Gian Số Đảng Ủy Phường</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>

            {isAdmin && onEditConfig && (
              <Button
                type="button"
                size="sm"
                variant="emerald"
                onClick={onEditConfig}
                leftIcon={<Edit2 size={12} aria-hidden="true" />}
                className="h-7 px-3 text-xs font-bold rounded-full shadow-2xs"
              >
                Sửa nội dung Trang chủ
              </Button>
            )}
          </div>

          {/* Hero Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-2xs">
            {landingConfig.heroTitle}
          </h1>

          {/* Banner Notice Alert */}
          {landingConfig.bannerNotice && landingConfig.bannerNotice.trim() !== "" && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-500/20 border border-amber-300/40 p-4 text-sm text-amber-50 font-medium backdrop-blur-xs shadow-2xs">
              <div className="p-1.5 rounded-lg bg-amber-500/30 text-amber-200 shrink-0">
                <Megaphone size={16} aria-hidden="true" />
              </div>
              <span className="leading-relaxed">{landingConfig.bannerNotice}</span>
            </div>
          )}

          {/* Quick Action CTA Links */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              to={ROUTES.REFLECTION}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "bg-white text-gov-navy hover:bg-blue-50 border-white font-bold text-sm sm:text-base shadow-sm gap-2 min-h-[46px] px-6",
              })}
            >
              <MessageSquare size={18} aria-hidden="true" />
              <span>Phản ánh hiện trường</span>
            </Link>

            <Link
              to={ROUTES.FORMS}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "bg-white/10 text-white hover:bg-white/20 border-white/30 backdrop-blur-xs font-semibold text-sm sm:text-base gap-2 min-h-[46px] px-5",
              })}
            >
              <FileText size={18} aria-hidden="true" />
              <span>Tra cứu biểu mẫu</span>
            </Link>

            <Link
              to={ROUTES.ABOUT}
              className={buttonVariants({
                variant: "destructive",
                size: "lg",
                className: "bg-red-700 hover:bg-red-800 text-white border-red-500 font-bold text-sm sm:text-base shadow-sm gap-2 min-h-[46px] px-5",
              })}
            >
              <Landmark size={18} aria-hidden="true" />
              <span>Giới thiệu KP3</span>
            </Link>
          </div>

          {/* Search Box with Popover */}
          <div className="relative max-w-xl">
            <label htmlFor="portal-search" className="sr-only">
              Tìm kiếm biểu mẫu, hoạt động, cán bộ
            </label>
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="portal-search"
                type="search"
                enterKeyHint="search"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={portalSearch}
                onChange={(e) => setPortalSearch(e.target.value)}
                placeholder="Tìm biểu mẫu, hoạt động, cán bộ, tin tức…"
                className="w-full min-h-[50px] pl-11 pr-10 rounded-2xl text-sm text-slate-900 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-md transition-all placeholder:text-slate-500"
              />
              {portalSearch && (
                <button
                  type="button"
                  onClick={() => setPortalSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer transition-colors"
                  aria-label="Xóa nội dung tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown (shadcn Card + Badge) */}
            {searchResults && (
              <Card
                className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl border border-slate-200 p-2 max-h-80 overflow-y-auto z-30 shadow-xl space-y-1 animate-in fade-in-0 zoom-in-95"
                role="listbox"
                aria-label="Kết quả tìm kiếm"
              >
                {searchResults.forms.length +
                  searchResults.events.length +
                  searchResults.leaders.length +
                  searchResults.news.length ===
                0 ? (
                  <p className="p-3 text-sm text-slate-500 text-center font-medium">
                    Không tìm thấy kết quả cho &quot;{portalSearch}&quot;.
                  </p>
                ) : (
                  <>
                    {searchResults.forms.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setPreviewForm(f);
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 text-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="warning" className="shrink-0 text-[10px] px-1.5 py-0 font-bold">
                            Biểu mẫu
                          </Badge>
                          <span className="truncate font-medium text-slate-800">
                            {f.code} — {f.title}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </button>
                    ))}
                    {searchResults.events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setEventDetail(ev);
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 text-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-bold bg-blue-50 text-gov-navy border-blue-200">
                            Sự kiện
                          </Badge>
                          <span className="truncate font-medium text-slate-800">{ev.title}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </button>
                    ))}
                    {searchResults.news.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNewsDetail(n);
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 text-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="success" className="shrink-0 text-[10px] px-1.5 py-0 font-bold">
                            Tin tức
                          </Badge>
                          <span className="truncate font-medium text-slate-800">{n.title}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </button>
                    ))}
                    {searchResults.leaders.map((l) => (
                      <Link
                        key={l.name}
                        to={ROUTES.LEADERSHIP}
                        onClick={() => {
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 text-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 font-bold border-purple-200 text-purple-700 bg-purple-50">
                            Cán bộ
                          </Badge>
                          <span className="truncate font-medium text-slate-800">
                            {l.name} — {l.role}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </Link>
                    ))}
                  </>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Quy mô địa bàn KP3 (shadcn Card) */}
        <div className="lg:col-span-5 min-w-0">
          <Card className="rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 space-y-5 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-100">
                <Compass size={18} className="text-blue-300" aria-hidden="true" />
                <span>Quy mô địa bàn Khu phố 3</span>
              </div>
              <Badge variant="outline" className="bg-white/10 border-white/20 text-blue-100 text-[11px] font-semibold">
                Số liệu thực tế
              </Badge>
            </div>

            <dl className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {[
                {
                  icon: <Home size={18} />,
                  value:
                    households?.length && households.length >= 100
                      ? households.length.toLocaleString("vi-VN")
                      : KP3_OFFICIAL_BASELINE.households.toLocaleString("vi-VN"),
                  label: "Hộ gia đình"
                },
                {
                  icon: <Users size={18} />,
                  value:
                    residents?.length && residents.length >= 1000
                      ? residents.length.toLocaleString("vi-VN")
                      : KP3_OFFICIAL_BASELINE.population.toLocaleString("vi-VN"),
                  label: "Nhân khẩu"
                },
                {
                  icon: <Briefcase size={18} />,
                  value:
                    businesses?.length && businesses.length >= 50
                      ? businesses.length.toLocaleString("vi-VN")
                      : KP3_OFFICIAL_BASELINE.activeBusinessesTotal.toLocaleString("vi-VN"),
                  label: "Cơ sở KD"
                }
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 p-3 text-center min-w-0 transition-all duration-200"
                >
                  <span className="text-blue-200 flex justify-center" aria-hidden="true">
                    {s.icon}
                  </span>
                  <dd className="text-lg sm:text-2xl font-black mt-1.5 truncate tracking-tight">{s.value}</dd>
                  <dt className="text-xs text-blue-200/90 mt-0.5">{s.label}</dt>
                </div>
              ))}
            </dl>

            <p className="text-xs text-blue-100/90 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10 flex items-start gap-2">
              <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{landingConfig.heroAddressNote}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => onNavigateToTab("gis")}
                leftIcon={<MapPin size={15} aria-hidden="true" />}
                className="flex-1 bg-white/15 hover:bg-white/25 border-white/25 text-white font-semibold text-xs sm:text-sm h-11"
              >
                Bản đồ số GIS
              </Button>
              <Link
                to={ROUTES.ABOUT}
                className={buttonVariants({
                  variant: "destructive",
                  size: "md",
                  className: "flex-1 bg-red-700 hover:bg-red-800 text-white font-bold text-xs sm:text-sm border-red-500 h-11 gap-2 shadow-2xs",
                })}
              >
                <Compass size={15} aria-hidden="true" />
                <span>Bản đồ Đảng ủy</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
