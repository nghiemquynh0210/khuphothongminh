import React, { useRef } from "react";
import {
  ArrowUp,
  Award,
  Bot,
  Building2,
  Calendar,
  Car,
  CloudRain,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Flame,
  HeartHandshake,
  Home,
  Hotel,
  Landmark,
  Lock,
  Map,
  Megaphone,
  MessageCircle,
  QrCode,
  Settings,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { ActiveTab } from "../../types";
import { canAccessSpecialSupervision } from "../../utils/specialSupervisionUtils";

export interface MobileUtilityAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  tab?: ActiveTab;
  externalUrl?: string;
  lockedBadge?: boolean;
  onCustomAction?: () => void;
}

interface MobileUtilitiesHubProps {
  isStaff: boolean;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
  residentsCount: number;
  householdsCount: number;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenStaffLogin: () => void;
  onClose: () => void;
}

export const MobileUtilitiesHub: React.FC<MobileUtilitiesHubProps> = ({
  isStaff,
  currentUser,
  residentsCount,
  householdsCount,
  onSelectTab,
  onOpenStaffLogin,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canViewAnTT = isStaff && canAccessSpecialSupervision(currentUser);

  const handleTileClick = (item: MobileUtilityAction) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.onCustomAction) {
      item.onCustomAction();
      onClose();
      return;
    }
    if (item.tab) {
      onSelectTab(item.tab);
      onClose();
    }
  };

  const citizenServices: MobileUtilityAction[] = [
    {
      id: "reports_1022",
      label: "Phản ánh 1022",
      icon: <Megaphone size={22} />,
      gradient: "from-red-500 to-red-700",
      tab: "reports",
    },
    {
      id: "forms",
      label: "Biểu mẫu Cư trú",
      icon: <FileText size={22} />,
      gradient: "from-blue-500 to-blue-700",
      tab: "forms",
    },
    {
      id: "qr_hostel",
      label: "Khai báo QR Trọ",
      icon: <QrCode size={22} />,
      gradient: "from-emerald-500 to-emerald-700",
      tab: isStaff ? "businesses" : "reports",
    },
    {
      id: "leaders",
      label: "Danh bạ Cán bộ",
      icon: <Users size={22} />,
      gradient: "from-amber-500 to-amber-700",
      tab: isStaff ? "party" : "cultural",
    },
    {
      id: "schedule",
      label: "Lịch tiếp dân",
      icon: <Calendar size={22} />,
      gradient: "from-sky-500 to-sky-700",
      tab: isStaff ? "tasks" : "cultural",
    },
    {
      id: "funds",
      label: "Quỹ & VietQR",
      icon: <CreditCard size={22} />,
      gradient: "from-teal-500 to-emerald-700",
      tab: "finance",
    },
    {
      id: "welfare",
      label: "An sinh & Mừng thọ",
      icon: <HeartHandshake size={22} />,
      gradient: "from-rose-500 to-rose-700",
      tab: "welfare",
    },
    {
      id: "ai_assistant",
      label: "Trợ lý AI KP3",
      icon: <Bot size={22} />,
      gradient: "from-violet-500 to-purple-700",
      tab: "ai",
    },
  ];

  const urbanServices: MobileUtilityAction[] = [
    {
      id: "gis_map",
      label: "Bản đồ số GIS",
      icon: <Map size={22} />,
      gradient: "from-sky-500 to-blue-700",
      tab: "gis",
    },
    {
      id: "pccc",
      label: "PCCC & Liên gia",
      icon: <Flame size={22} />,
      gradient: "from-orange-500 to-red-700",
      tab: isStaff ? "businesses" : "gis",
    },
    {
      id: "traffic_fine",
      label: "Tra cứu phạt nguội",
      icon: <Car size={22} />,
      gradient: "from-red-600 to-rose-800",
      externalUrl: "https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html",
    },
    {
      id: "flood_map",
      label: "Bản đồ ngập úng",
      icon: <CloudRain size={22} />,
      gradient: "from-blue-500 to-indigo-700",
      externalUrl: "https://giaothong.hochiminhcity.gov.vn/",
    },
  ];

  const staffOpsServices: MobileUtilityAction[] = [
    {
      id: "residents",
      label: `Dân cư (${residentsCount.toLocaleString("vi-VN")})`,
      icon: <Users size={22} />,
      gradient: "from-emerald-500 to-emerald-700",
      tab: "residents",
    },
    {
      id: "households",
      label: `Hộ khẩu (${householdsCount.toLocaleString("vi-VN")})`,
      icon: <Home size={22} />,
      gradient: "from-blue-500 to-blue-700",
      tab: "households",
    },
    {
      id: "nvqs_cohort",
      label: "Rà soát NVQS",
      icon: <Award size={22} />,
      gradient: "from-amber-500 to-amber-700",
      tab: "residents",
    },
    {
      id: "hostels",
      label: "230 Nhà trọ",
      icon: <Hotel size={22} />,
      gradient: "from-orange-500 to-orange-700",
      tab: "businesses",
    },
    {
      id: "enterprises",
      label: "Doanh nghiệp",
      icon: <Building2 size={22} />,
      gradient: "from-indigo-500 to-indigo-700",
      tab: "enterprises",
    },
    {
      id: "tasks",
      label: "Lịch & Nhiệm vụ",
      icon: <ClipboardCheck size={22} />,
      gradient: "from-purple-500 to-purple-700",
      tab: "tasks",
    },
    {
      id: "party",
      label: "Chi bộ & Hội",
      icon: <Landmark size={22} />,
      gradient: "from-red-600 to-red-800",
      tab: "party",
    },
    {
      id: "word_report",
      label: "Báo cáo Word",
      icon: <FileSpreadsheet size={22} />,
      gradient: "from-sky-500 to-blue-700",
      tab: "dashboard",
    },
  ];

  const securityAdminServices: MobileUtilityAction[] = [
    {
      id: "patrol",
      label: "Tuần tra ANTT",
      icon: <Shield size={22} />,
      gradient: "from-amber-500 to-orange-700",
      tab: "reports",
    },
    {
      id: "special_antt",
      label: "Đối tượng ANTT",
      icon: <ShieldAlert size={22} />,
      gradient: "from-slate-700 to-slate-950",
      tab: "residents",
      lockedBadge: true,
    },
    {
      id: "zalo_zbs",
      label: "Zalo OA & ZBS",
      icon: <MessageCircle size={22} />,
      gradient: "from-blue-500 to-blue-700",
      tab: "settings",
    },
    {
      id: "settings",
      label: "Duyệt & Cấu hình",
      icon: <Settings size={22} />,
      gradient: "from-slate-600 to-slate-900",
      tab: "settings",
    },
  ];

  const renderGrid = (items: MobileUtilityAction[]) => (
    <div className="grid grid-cols-4 gap-x-2 gap-y-4">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleTileClick(item)}
          className="flex flex-col items-center text-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
        >
          <div
            className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center shadow-md relative`}
          >
            {item.icon}
            {item.lockedBadge && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-950 border-2 border-white flex items-center justify-center">
                <Lock size={9} strokeWidth={3} />
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-800 leading-tight px-0.5 line-clamp-2">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[85] bg-white flex flex-col md:hidden"
      style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Header Đỏ đô Trống đồng chuẩn bản sắc Việt Nam */}
      <div
        className="shrink-0 text-white px-4 pb-3.5 relative overflow-hidden shadow-sm"
        style={{
          paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
          background:
            "radial-gradient(circle at 50% 130%, rgba(254,202,202,0.18) 0%, transparent 55%), repeating-radial-gradient(circle at 50% 115%, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 14px), linear-gradient(135deg, #B91C1C 0%, #DC2626 52%, #991B1B 100%)",
        }}
      >
        <div className="text-center">
          <h2 className="text-base font-extrabold tracking-tight">Tiện ích Khu phố 3</h2>
          <p className="text-[11px] text-red-100/95 font-medium mt-0.5">
            Phường An Phú • TP. Hồ Chí Minh
          </p>
        </div>
      </div>

      {/* Scrollable 4-Column Categorized Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bg-white">
        <section className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            Dịch vụ Cư dân &amp; Hành chính
          </h3>
          {renderGrid(citizenServices)}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            Địa bàn, An toàn &amp; Giao thông
          </h3>
          {renderGrid(urbanServices)}
        </section>

        {isStaff && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Điều hành Khu phố</h3>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold">
                Cán bộ KP3
              </span>
            </div>
            {renderGrid(staffOpsServices)}
          </section>
        )}

        {canViewAnTT && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">An ninh &amp; Quản trị</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                <Lock size={9} /> Bí thư / CSKV
              </span>
            </div>
            {renderGrid(securityAdminServices)}
          </section>
        )}

        {!isStaff && (
          <div className="pt-2 pb-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStaffLogin();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
            >
              <Lock size={14} className="text-amber-300" />
              <span>Đăng nhập Cổng Cán bộ Điều hành KP3</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Scroll-to-Top Red Circle Button */}
      <button
        type="button"
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Cuộn lên đầu trang"
        className="fixed right-4 bottom-[80px] z-[90] w-10 h-10 rounded-full bg-red-700 hover:bg-red-800 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
      >
        <ArrowUp size={18} />
      </button>
    </div>
  );
};
