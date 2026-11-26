import React, { useState } from "react";
import { Home, LayoutGrid, Megaphone, MessageCircle, Newspaper } from "lucide-react";
import { ActiveTab, Association, FieldReport, ScheduleEvent, TaskItem } from "../../types";
import { MobileUtilitiesHub } from "./MobileUtilitiesHub";
import { MobileMessagesHub } from "./MobileMessagesHub";
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
  reports?: FieldReport[];
  schedules?: ScheduleEvent[];
  tasks?: TaskItem[];
  associations?: Association[];
  onAddReport?: (report: FieldReport) => void;
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
  reports = [],
  schedules = [],
  tasks = [],
  associations = [],
  onAddReport,
  onNavigateHome,
  onSelectTab,
  onOpenStaffLogin,
}) => {
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const navItems: Array<{
    id: "home" | "news" | "reports" | "messages" | "utilities";
    label: string;
    icon: React.ReactNode;
    badge?: number;
    active: boolean;
    onClick: () => void;
  }> = [
    {
      id: "home",
      label: "Trang chủ",
      icon: <Home size={20} />,
      active: !utilitiesOpen && !messagesOpen && (isPublicHome || activeTab === "dashboard"),
      onClick: () => {
        setUtilitiesOpen(false);
        setMessagesOpen(false);
        onNavigateHome();
      },
    },
    {
      id: "news",
      label: "Tin tức",
      icon: <Newspaper size={20} />,
      active: !utilitiesOpen && !messagesOpen && !isPublicHome && activeTab === "cultural",
      onClick: () => {
        setUtilitiesOpen(false);
        setMessagesOpen(false);
        onSelectTab("cultural");
      },
    },
    {
      id: "reports",
      label: "Phản ánh",
      icon: <Megaphone size={20} />,
      active: !utilitiesOpen && !messagesOpen && !isPublicHome && activeTab === "reports",
      onClick: () => {
        setUtilitiesOpen(false);
        setMessagesOpen(false);
        onSelectTab("reports");
      },
    },
    {
      id: "messages",
      label: "Tin nhắn",
      icon: <MessageCircle size={20} />,
      badge: unreadMessagesCount,
      active: messagesOpen,
      onClick: () => {
        setUtilitiesOpen(false);
        setMessagesOpen((prev) => !prev);
      },
    },
    {
      id: "utilities",
      label: "Tiện ích",
      icon: <LayoutGrid size={20} />,
      active: utilitiesOpen,
      onClick: () => {
        setMessagesOpen(false);
        setUtilitiesOpen((prev) => !prev);
      },
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

      {messagesOpen && (
        <MobileMessagesHub
          isStaff={isStaff}
          currentUser={currentUser}
          reports={reports}
          schedules={schedules}
          tasks={tasks}
          associations={associations}
          onAddReport={onAddReport || (() => {})}
          onUnreadCountChange={setUnreadMessagesCount}
          onClose={() => setMessagesOpen(false)}
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
              <span className={`relative ${item.active ? "scale-105 transition-transform" : ""}`}>
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold inline-flex items-center justify-center border border-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10.5px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
