import React, { useState } from "react";
import { Home, LayoutGrid, Megaphone, MessageCircle, Newspaper } from "lucide-react";
import { ActiveTab } from "../../types";
import { MobileUtilitiesHub } from "./MobileUtilitiesHub";
import { triggerLightHaptic } from "../../utils/mobileHaptics";

interface MobileSuperAppBarProps {
  activeTab: ActiveTab;
  isStaff: boolean;
  isPublicHome?: boolean;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
  residentsCount: number;
  householdsCount: number;
  onNavigateHome: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenStaffLogin: () => void;
}

export const MobileSuperAppBar: React.FC<MobileSuperAppBarProps> = ({
  activeTab,
  isStaff,
  isPublicHome = false,
  currentUser,
  residentsCount,
  householdsCount,
  onNavigateHome,
  onSelectTab,
  onOpenStaffLogin,
}) => {
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);

  const navItems: Array<{
    id: "home" | "news" | "reports" | "messages" | "utilities";
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }> = [
    {
      id: "home",
      label: "Trang chủ",
      icon: <Home size={20} />,
      active: !utilitiesOpen && (isPublicHome || activeTab === "dashboard"),
      onClick: () => {
        setUtilitiesOpen(false);
        onNavigateHome();
      },
    },
    {
      id: "news",
      label: "Tin tức",
      icon: <Newspaper size={20} />,
      active: !utilitiesOpen && !isPublicHome && activeTab === "cultural",
      onClick: () => {
        setUtilitiesOpen(false);
        onSelectTab("cultural");
      },
    },
    {
      id: "reports",
      label: "Phản ánh",
      icon: <Megaphone size={20} />,
      active: !utilitiesOpen && !isPublicHome && activeTab === "reports",
      onClick: () => {
        setUtilitiesOpen(false);
        onSelectTab("reports");
      },
    },
    {
      id: "messages",
      label: "Tin nhắn",
      icon: <MessageCircle size={20} />,
      active: !utilitiesOpen && !isPublicHome && activeTab === "ai",
      onClick: () => {
        setUtilitiesOpen(false);
        onSelectTab(isStaff ? "reports" : "ai");
      },
    },
    {
      id: "utilities",
      label: "Tiện ích",
      icon: <LayoutGrid size={20} />,
      active: utilitiesOpen,
      onClick: () => setUtilitiesOpen((prev) => !prev),
    },
  ];

  return (
    <>
      {utilitiesOpen && (
        <MobileUtilitiesHub
          isStaff={isStaff}
          currentUser={currentUser}
          residentsCount={residentsCount}
          householdsCount={householdsCount}
          onSelectTab={onSelectTab}
          onOpenStaffLogin={onOpenStaffLogin}
          onClose={() => setUtilitiesOpen(false)}
        />
      )}

      {/* Fixed Native-Feel 5-Tab Bottom Bar (Mobile / Android App only) */}
      <nav
        aria-label="Điều hướng nhanh ứng dụng di động Khu phố 3"
        className="fixed bottom-0 left-0 right-0 z-[95] bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                void triggerLightHaptic();
                item.onClick();
              }}
              aria-current={item.active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                item.active
                  ? "text-red-700 font-extrabold"
                  : "text-slate-500 hover:text-slate-800 font-semibold"
              }`}
            >
              <span className={item.active ? "scale-105 transition-transform" : ""}>
                {item.icon}
              </span>
              <span className="text-[10.5px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
