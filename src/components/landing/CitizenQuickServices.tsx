import React from "react";
import {
  Bell,
  Bot,
  Calendar,
  ChevronRight,
  Coins,
  Compass,
  FileText,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Landmark,
  ExternalLink
} from "lucide-react";
import { btnGhost, Link, getPathFromRoute, ROUTES } from "./landingConstants";

export interface CitizenQuickServicesProps {
  formsCount: number;
  goTo?: (id: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export default function CitizenQuickServices({
  formsCount,
  goTo,
  onNavigateToTab
}: CitizenQuickServicesProps) {
  const cards = [
    {
      id: "about",
      icon: <Landmark size={22} />,
      title: "Giới thiệu Khu phố 3",
      desc: "Địa giới, Chi bộ & Không gian số Đảng ủy Phường.",
      accent: "bg-red-700"
    },
    {
      id: "reflection",
      icon: <MessageSquare size={22} />,
      title: "Phản ánh hiện trường",
      desc: "Gửi phản ánh kèm ảnh, vị trí tới Ban Điều hành.",
      accent: "bg-gov-blue"
    },
    {
      id: "forms",
      icon: <FileText size={22} />,
      title: "Biểu mẫu & hướng dẫn",
      desc: `${formsCount} biểu mẫu hành chính tải về.`,
      accent: "bg-emerald-600"
    },
    {
      id: "leadership",
      icon: <ShieldCheck size={22} />,
      title: "Cơ cấu cán bộ",
      desc: "Thường trực Chi bộ, Ban Điều hành, CSKV.",
      accent: "bg-indigo-600"
    },
    {
      id: "notices",
      icon: <Bell size={22} />,
      title: "Thông báo",
      desc: "Thông báo đã duyệt, còn hiệu lực.",
      accent: "bg-amber-600"
    },
    {
      id: "news",
      icon: <Compass size={22} />,
      title: "Tin tức địa phương",
      desc: "Hoạt động cộng đồng đã diễn ra.",
      accent: "bg-teal-600"
    },
    {
      id: "schedule",
      icon: <Calendar size={22} />,
      title: "Lịch hoạt động",
      desc: "Sự kiện sắp và đang diễn ra.",
      accent: "bg-gov-danger"
    },
    {
      id: "finance-tab",
      icon: <Coins size={22} />,
      title: "Quỹ khu phố & VietQR",
      desc: "Minh bạch thu chi quỹ & quét mã ủng hộ.",
      accent: "bg-emerald-700",
      tab: "finance" as const
    }
  ];

  return (
    <section
      id="services"
      tabIndex={-1}
      aria-labelledby="services-title"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 scroll-mt-24 outline-none pt-15 pb-15"
    >
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="services-title" className="text-lg font-black text-gov-navy">
            Tiện ích nhanh
          </h2>
          <span className="text-xs font-semibold text-slate-600">
            8 nhóm dịch vụ trọng tâm KP3
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map(card => {
            const cardCls =
              "group w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-gov-blue hover:bg-slate-100 transition-colors cursor-pointer flex items-start gap-3 min-h-[44px]";
            const inner = (
              <>
                <span
                  className={`w-11 h-11 rounded-xl ${card.accent} text-white flex items-center justify-center shrink-0`}
                  aria-hidden="true"
                >
                  {card.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-bold text-sm text-gov-navy group-hover:text-gov-blue">
                    {card.title} <ChevronRight size={15} className="shrink-0" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-slate-600 line-clamp-2 block mt-0.5 leading-relaxed">
                    {card.desc}
                  </span>
                </span>
              </>
            );
            if ("tab" in card && card.tab) {
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onNavigateToTab(card.tab)}
                  className={cardCls}
                >
                  {inner}
                </button>
              );
            }
            return (
              <Link key={card.id} to={getPathFromRoute(card.id)} className={cardCls}>
                {inner}
              </Link>
            );
          })}
        </div>

        {/* Banner Liên Kết Trực Tiếp Không Gian Số Đảng Ủy Phường An Phú */}
        <div className="bg-red-700 border border-red-800 text-white p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-white" aria-hidden="true">
              <Landmark size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-red-800">
                  CỔNG THÔNG TIN CẤP TRÊN
                </span>
                <span className="text-xs text-red-100 font-medium">Nhiệm kỳ 2025 – 2030</span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white mt-1">
                Không Gian Số Đảng Ủy Phường An Phú – TP. Hồ Chí Minh
              </h3>
              <p className="text-xs text-red-100 hidden sm:block">
                Tra cứu bản đồ số 14 khu phố, cơ cấu 39 Chi bộ trực thuộc và thông tin chỉ đạo của Đảng ủy Phường.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto">
            <Link
              to={ROUTES.ABOUT}
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors border border-white/30 cursor-pointer"
            >
              Xem Giới thiệu KP3
            </Link>
            <a
              href="https://danguy.phuonganphu.gov.vn/"
              target="_blank"
              rel="noreferrer"
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white text-red-800 hover:bg-red-50 font-black text-xs transition-colors border border-white"
            >
              <span>Truy cập Cổng Phường</span> <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => onNavigateToTab("ai")} className={btnGhost}>
            <Bot size={16} aria-hidden="true" /> Trợ lý AI hỏi đáp thủ tục
          </button>
          <button type="button" onClick={() => onNavigateToTab("finance")} className={btnGhost}>
            <Coins size={16} aria-hidden="true" /> Quỹ khu phố & VietQR
          </button>
          <button type="button" onClick={() => onNavigateToTab("gis")} className={btnGhost}>
            <MapPin size={16} aria-hidden="true" /> Bản đồ số GIS
          </button>
        </div>
      </div>
    </section>
  );
}
