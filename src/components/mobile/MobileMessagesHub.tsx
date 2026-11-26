import React, { Suspense, useState } from "react";
import { Bot, ExternalLink, Megaphone, MessageCircle } from "lucide-react";
import { Association, FieldReport, ScheduleEvent, TaskItem } from "../../types";
import { lazyWithChunkRetry } from "../../utils/chunkReloadRecovery";
import { triggerLightHaptic } from "../../utils/mobileHaptics";
import { LoadingFade } from "../common/LoadingFade";

const ZaloOaChatInbox = lazyWithChunkRetry(
  () => import("../reports/ZaloOaChatInbox").then((m) => ({ default: m.ZaloOaChatInbox }))
);
const CitizenBroadcastTab = lazyWithChunkRetry(
  () => import("../tasks/CitizenBroadcastTab").then((m) => ({ default: m.CitizenBroadcastTab }))
);
const AiAssistant = lazyWithChunkRetry(() => import("../AiAssistant"));

export interface MobileMessagesHubProps {
  isStaff: boolean;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
  reports: FieldReport[];
  schedules: ScheduleEvent[];
  tasks: TaskItem[];
  associations: Association[];
  onAddReport: (report: FieldReport) => void;
  onUnreadCountChange?: (count: number) => void;
  onClose: () => void;
}

type MessageChannelTab = "zalo_inbox" | "broadcast" | "ai";

export const MobileMessagesHub: React.FC<MobileMessagesHubProps> = ({
  isStaff,
  currentUser,
  reports,
  schedules,
  tasks,
  associations,
  onAddReport,
  onUnreadCountChange,
}) => {
  const [channel, setChannel] = useState<MessageChannelTab>(isStaff ? "zalo_inbox" : "ai");
  const [unreadCount, setUnreadCount] = useState(0);

  const handleSelectChannel = (next: MessageChannelTab) => {
    void triggerLightHaptic();
    setChannel(next);
  };

  const handleUnread = (count: number) => {
    setUnreadCount(count);
    onUnreadCountChange?.(count);
  };

  return (
    <div
      className="fixed inset-0 z-[85] bg-slate-50 flex flex-col md:hidden"
      style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Header Đỏ đô Trống đồng đồng bộ Super-App */}
      <div
        className="shrink-0 text-white px-4 pb-3 relative overflow-hidden shadow-sm"
        style={{
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          background:
            "radial-gradient(circle at 80% 130%, rgba(254,202,202,0.18) 0%, transparent 55%), repeating-radial-gradient(circle at 80% 115%, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 14px), linear-gradient(135deg, #B91C1C 0%, #DC2626 55%, #991B1B 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight">Tin nhắn &amp; Giao tiếp</h2>
            <p className="text-[11px] text-red-100/95 font-medium">
              {isStaff ? "Zalo OA Cư dân • Phát thông báo • Trợ lý AI" : "Trợ lý AI KP3 & Zalo OA Ban Điều hành"}
            </p>
          </div>
          {!isStaff && (
            <a
              href="https://zalo.me/bdhkhupho3"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 active:bg-white/25 text-white text-[11px] font-bold"
            >
              <span>Zalo OA</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Segmented Channel Switcher (Staff: 3 kênh) */}
        {isStaff && (
          <div className="mt-2.5 grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/20 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => handleSelectChannel("zalo_inbox")}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                channel === "zalo_inbox"
                  ? "bg-white text-red-700 shadow-xs"
                  : "text-red-50 hover:text-white"
              }`}
            >
              <MessageCircle size={13} />
              <span>Zalo OA</span>
              {unreadCount > 0 && (
                <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold inline-flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectChannel("broadcast")}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                channel === "broadcast"
                  ? "bg-white text-red-700 shadow-xs"
                  : "text-red-50 hover:text-white"
              }`}
            >
              <Megaphone size={13} />
              <span>Thông báo</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectChannel("ai")}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                channel === "ai"
                  ? "bg-white text-red-700 shadow-xs"
                  : "text-red-50 hover:text-white"
              }`}
            >
              <Bot size={13} />
              <span>Trợ lý AI</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        <Suspense
          fallback={
            <LoadingFade
              variant="inline"
              title="Đang mở kênh tin nhắn..."
              subtitle="KP3 Messaging"
            />
          }
        >
          {isStaff && channel === "zalo_inbox" && (
            <ZaloOaChatInbox
              reports={reports}
              onAddReport={onAddReport}
              onUnreadCountChange={handleUnread}
              currentUser={currentUser}
            />
          )}

          {isStaff && channel === "broadcast" && (
            <CitizenBroadcastTab
              schedules={schedules}
              tasks={tasks}
              associationsList={associations}
              creatorLabel={currentUser?.fullName || "Ban Điều hành Khu phố 3"}
            />
          )}

          {(!isStaff || channel === "ai") && <AiAssistant />}
        </Suspense>
      </div>
    </div>
  );
};
