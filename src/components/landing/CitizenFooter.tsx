import React from "react";
import { Clock, Edit2, LayoutDashboard, LockKeyhole, Mail, MapPin, Phone } from "lucide-react";
import { LandingConfig } from "../../types";
import { DEFAULT_LANDING_CONFIG, ROUTES, Link } from "./landingConstants";

export interface CitizenFooterProps {
  onOpenStaff: () => void;
  isAdmin?: boolean;
  landingConfig?: LandingConfig;
  onEditConfig?: () => void;
}

export default function CitizenFooter({
  onOpenStaff,
  isAdmin = false,
  landingConfig = DEFAULT_LANDING_CONFIG,
  onEditConfig,
}: CitizenFooterProps) {
  return (
    <footer className="bg-gov-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-3 gap-8 text-sm">
        {/* Column 1: Info & Contact */}
        <div className="space-y-2.5 md:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-base">{landingConfig.siteTitle}</p>
            {isAdmin && onEditConfig && (
              <button
                type="button"
                onClick={onEditConfig}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-emerald-200 cursor-pointer"
              >
                <Edit2 size={12} aria-hidden="true" /> Sửa
              </button>
            )}
          </div>
          <p className="text-blue-100/90">{landingConfig.footerOperator}</p>
          <p className="text-xs text-blue-100/90 flex items-start gap-2">
            <MapPin size={14} className="shrink-0 mt-0.5 text-blue-200" aria-hidden="true" />
            <span>{landingConfig.contactAddress}</span>
          </p>
          <p className="text-xs text-blue-100/90 flex items-center gap-2">
            <Phone size={14} className="shrink-0 text-blue-200" aria-hidden="true" />
            <span>{landingConfig.hotline}</span>
          </p>
          <p className="text-xs text-blue-100/90 flex items-center gap-2">
            <Clock size={14} className="shrink-0 text-blue-200" aria-hidden="true" />
            <span>{landingConfig.workingHours}</span>
          </p>
          <a
            href={`mailto:${landingConfig.contactEmail}`}
            className="inline-flex items-center gap-2 min-h-10 text-blue-100 hover:text-white underline-offset-4 hover:underline"
          >
            <Mail size={16} aria-hidden="true" /> {landingConfig.contactEmail}
          </a>
        </div>

        {/* Column 2: Data Sources */}
        <div className="space-y-3">
          <p className="font-bold text-blue-200 uppercase text-xs tracking-wider">Nguồn tin & dữ liệu</p>
          <p className="text-blue-100 leading-relaxed">
            Hệ sinh thái số hóa đồng bộ cùng{" "}
            <a 
              href="https://danguy.phuonganphu.gov.vn/" 
              target="_blank" 
              rel="noreferrer"
              className="text-white font-bold underline underline-offset-2 hover:text-emerald-200 inline-flex items-center py-1 min-h-[28px]"
            >
              Không Gian Số Đảng Ủy Phường An Phú ↗
            </a>. Số liệu địa bàn và cơ cấu Chi bộ theo bản đồ số 14 khu phố nhiệm kỳ 2025–2030.
          </p>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-1.5 sm:gap-3 pt-1 text-xs">
            <Link to={ROUTES.ABOUT} className="min-h-[36px] inline-flex items-center text-emerald-200 hover:text-white hover:underline">
              • Giới thiệu Khu phố 3
            </Link>
            <a href="https://danguy.phuonganphu.gov.vn/ban-do" target="_blank" rel="noreferrer" className="min-h-[36px] inline-flex items-center text-blue-100 hover:text-white hover:underline">
              • Bản đồ số Phường ↗
            </a>
            <a href="https://danguy.phuonganphu.gov.vn/chi-bo" target="_blank" rel="noreferrer" className="min-h-[36px] inline-flex items-center text-blue-100 hover:text-white hover:underline">
              • 39 Chi bộ Phường ↗
            </a>
          </div>
        </div>

        {/* Column 3: Data Protection & Staff Portal */}
        <div className="space-y-3">
          <p className="font-bold text-blue-100 uppercase text-xs tracking-wider">Bảo vệ dữ liệu</p>
          <p className="text-blue-100">
            Thông tin cá nhân trong phản ánh chỉ dùng cho mục đích tiếp nhận và xử lý, chỉ cán bộ có thẩm quyền được truy cập.
          </p>
          <Link
            to={isAdmin ? ROUTES.DASHBOARD_CULTURAL : ROUTES.DASHBOARD}
            onClick={(e) => {
              e.preventDefault();
              onOpenStaff();
            }}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 font-semibold cursor-pointer"
            title={isAdmin ? "Đến Kênh Tin Tức & Sự Kiện (/dashboard/cultural)" : "Đến Bảng Điều Hành Cán Bộ (/dashboard)"}
          >
            {isAdmin ? (
              <>
                <LayoutDashboard size={16} aria-hidden="true" /> Quản trị Kênh Tin tức & Sự kiện
              </>
            ) : (
              <>
                <LockKeyhole size={16} aria-hidden="true" /> Cổng dành cho cán bộ
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Bottom disclaimer */}
      <div className="border-t border-white/15 py-4 px-4 text-center text-xs text-blue-100">
        Cổng thông tin cộng đồng do Ban Điều hành Khu phố 3 vận hành · Không phải cổng thông tin điện tử chính thức của cơ quan nhà nước.
      </div>
    </footer>
  );
}
