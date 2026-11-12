import React from "react";
import {
  Briefcase,
  Calendar,
  Compass,
  Edit2,
  FileText,
  Home,
  MapPin,
  Megaphone,
  MessageSquare,
  Search,
  Users,
  Landmark,
} from "lucide-react";
import { AdministrativeForm, CommunityEvent, LandingConfig, LocalNews } from "../../types";
import { KP3_OFFICIAL_BASELINE } from "../../utils/kp3Utils";
import { DEFAULT_LANDING_CONFIG, VERIFIED_LEADERSHIP, ROUTES, Link } from "./landingConstants";

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
    <section className="relative overflow-hidden bg-gov-navy border-b border-blue-950 text-white">
      <div
        className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Slogan, Actions & Search */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/25 text-xs font-semibold text-blue-100">
              {landingConfig.heroBadge}
            </span>
            <a
              href="https://danguy.phuonganphu.gov.vn/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-700 hover:bg-red-800 border border-red-500 text-white text-xs font-bold transition-colors"
            >
              Không Gian Số Đảng Ủy Phường ↗
            </a>
            {isAdmin && onEditConfig && (
              <button
                type="button"
                onClick={onEditConfig}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Edit2 size={12} aria-hidden="true" /> Sửa nội dung Trang chủ
              </button>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
            {landingConfig.heroTitle}
          </h1>
          {landingConfig.bannerNotice && landingConfig.bannerNotice.trim() !== "" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/20 border border-amber-300/40 px-4 py-3 text-sm text-amber-50 font-medium">
              <Megaphone size={16} className="shrink-0 mt-0.5 text-amber-200" aria-hidden="true" />
              <span>{landingConfig.bannerNotice}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              to={ROUTES.REFLECTION}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl text-base font-bold bg-white text-gov-navy border border-white hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <MessageSquare size={18} aria-hidden="true" /> Phản ánh hiện trường
            </Link>
            <Link
              to={ROUTES.FORMS}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl text-base font-semibold bg-white/10 border border-white/30 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <FileText size={18} aria-hidden="true" /> Tra cứu biểu mẫu
            </Link>
            <Link
              to={ROUTES.ABOUT}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl text-base font-bold bg-red-700 hover:bg-red-800 text-white transition-colors cursor-pointer border border-red-500"
            >
              <Landmark size={18} aria-hidden="true" /> Giới thiệu KP3
            </Link>
          </div>

          {/* Tìm kiếm toàn cổng */}
          <search className="relative max-w-xl">
            <label htmlFor="portal-search" className="sr-only">
              Tìm kiếm biểu mẫu, hoạt động, cán bộ
            </label>
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
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
              onChange={e => setPortalSearch(e.target.value)}
              placeholder="Tìm biểu mẫu, hoạt động, cán bộ…"
              className="w-full min-h-[48px] pl-11 pr-4 rounded-xl text-sm text-gov-text bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {searchResults && (
              <div
                className="absolute left-0 right-0 mt-2 bg-white text-gov-text rounded-2xl border border-slate-200 p-2 max-h-80 overflow-y-auto z-30 shadow-sm"
                role="listbox"
                aria-label="Kết quả tìm kiếm"
              >
                {searchResults.forms.length +
                  searchResults.events.length +
                  searchResults.leaders.length +
                  searchResults.news.length ===
                0 ? (
                  <p className="p-3 text-sm text-slate-600">
                    Không tìm thấy kết quả cho “{portalSearch}”.
                  </p>
                ) : (
                  <>
                    {searchResults.forms.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setPreviewForm(f);
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <FileText size={15} className="text-gov-blue shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {f.code} — {f.title}
                        </span>
                      </button>
                    ))}
                    {searchResults.events.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => {
                          setEventDetail(ev);
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Calendar size={15} className="text-gov-blue shrink-0" aria-hidden="true" />
                        <span className="truncate">{ev.title}</span>
                      </button>
                    ))}
                    {searchResults.news.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNewsDetail(n);
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Compass size={15} className="text-teal-600 shrink-0" aria-hidden="true" />
                        <span className="truncate">Tin tức: {n.title}</span>
                      </button>
                    ))}
                    {searchResults.leaders.map(l => (
                      <Link
                        key={l.name}
                        to={ROUTES.LEADERSHIP}
                        onClick={() => {
                          setPortalSearch("");
                        }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-gov-light flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Users size={15} className="text-gov-blue shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {l.name} — {l.role}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </search>
        </div>

        {/* Right Column: Quy mô địa bàn KP3 */}
        <div className="lg:col-span-5 min-w-0">
          <div className="rounded-2xl bg-white/10 border border-white/25 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
              <Compass size={16} aria-hidden="true" /> Quy mô địa bàn Khu phố 3 (14 Tổ Dân Phố)
            </div>
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
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
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white/10 border border-white/15 p-2.5 sm:p-3 text-center min-w-0">
                  <span className="text-blue-200 flex justify-center" aria-hidden="true">
                    {s.icon}
                  </span>
                  <dd className="text-lg sm:text-2xl font-black mt-1 truncate">{s.value}</dd>
                  <dt className="text-xs text-blue-100">{s.label}</dt>
                </div>
              ))}
            </dl>
            <p className="text-xs text-blue-100 leading-relaxed">
              {landingConfig.heroAddressNote}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab("gis")}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs sm:text-sm font-semibold cursor-pointer px-3"
              >
                <MapPin size={15} aria-hidden="true" /> Bản đồ số GIS
              </button>
              <Link
                to={ROUTES.ABOUT}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 text-xs sm:text-sm font-bold text-white cursor-pointer border border-red-500 px-3"
              >
                <Compass size={15} aria-hidden="true" /> Bản đồ Đảng ủy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
