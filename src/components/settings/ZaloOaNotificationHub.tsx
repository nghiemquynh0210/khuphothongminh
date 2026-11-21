import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  BellRing,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { getStaffAuthHeaders } from "../../utils/imageUpload";
import ZaloArticleSyncModal from "../news/ZaloArticleSyncModal";
import CadreZaloLinkModal, {
  CadreZaloItem,
  ZaloFollowerItem,
} from "./CadreZaloLinkModal";

interface ZaloOaNotificationHubProps {
  onNotify?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  onNavigateToBroadcast?: () => void;
}

interface CadreMeetingReminderItem {
  id: string;
  title: string;
  dateIso: string;
  dateFormatted: string;
  time: string;
  location: string;
  attendees: string;
  minutesUntilStart?: number | null;
  remindAtHHmm?: string;
  remindLeadMinutes?: number;
  inRemindWindow?: boolean;
  alreadyAutoReminded?: boolean;
  formattedMessage: string;
  cadres: Array<{
    fullName: string;
    role: string;
    phone: string;
    email: string;
    zaloUserId?: string;
  }>;
}

interface LandlordDigestItem {
  key: string;
  hostelName: string;
  landlordName: string;
  landlordPhone: string;
  address: string;
  tenantCount: number;
  sampleMessage: string;
  tenants: Array<{
    id: string;
    fullName: string;
    cccdMasked: string;
    phone: string;
    expFormatted: string;
    daysLeft: number;
  }>;
}

interface NotificationLogRow {
  id: string;
  timestamp: string;
  channel: "zalo_oa" | "zalo_zns" | "email" | "outbox_ready";
  notificationType: string;
  recipientName: string;
  recipientRole: string;
  recipientPhone?: string;
  recipientEmail?: string;
  hostelName?: string;
  subject: string;
  messagePreview: string;
  status: "sent" | "queued_manual_zalo" | "skipped_duplicate" | "failed";
  detail?: string;
  actorName: string;
}

const DEFAULT_OA = {
  oaId: "3124278810088361494",
  oaName: "Ban Điều Hành Khu Phố 3 phường An Phú",
  oaCategory: "Cơ Quan Nhà Nước (Đã xác thực tích vàng Zalo)",
  oaUrl: "https://zalo.me/bdhkhupho3",
  linkedAppId: "432932322782886593",
  linkedAppName: "Điều hành Đô thị Số KP3 An Phú",
  headquartersAddress: "01 Đường D2, Khu Phố 3, Phường An Phú, Thành phố Hồ Chí Minh",
  verifiedFollowersBaseline: 347,
};

function toZaloChatUrl(phone?: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const localPhone = digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
  return `https://zalo.me/${localPhone}`;
}

export function ZaloOaNotificationHub({
  onNotify,
  onNavigateToBroadcast,
}: ZaloOaNotificationHubProps) {
  const [activeHubTab, setActiveHubTab] = useState<
    "meetings" | "cadres" | "residency" | "logs"
  >("meetings");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Verified OA & Config state
  const [oaMeta, setOaMeta] = useState(DEFAULT_OA);
  const [linkedFollowersCount, setLinkedFollowersCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<NotificationLogRow[]>([]);

  const [autoRemind15dEnabled, setAutoRemind15dEnabled] = useState(true);
  const [remindDaysThreshold, setRemindDaysThreshold] = useState(15);
  const [includeExpiredWithin7d, setIncludeExpiredWithin7d] = useState(false);
  const [autoRemindMeeting60mEnabled, setAutoRemindMeeting60mEnabled] = useState(true);
  const [meetingRemindMinutesBefore, setMeetingRemindMinutesBefore] = useState(60);
  const [znsTemplateId, setZnsTemplateId] = useState("");
  const [notifyBdhEmail, setNotifyBdhEmail] = useState("bdhkhupho3.ap@gmail.com");
  const [senderEmail, setSenderEmail] = useState("");
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [refreshTokenInput, setRefreshTokenInput] = useState("");
  const [appSecretInput, setAppSecretInput] = useState("");
  const [resendApiKeyInput, setResendApiKeyInput] = useState("");

  const [maskedAccessToken, setMaskedAccessToken] = useState("");
  const [maskedRefreshToken, setMaskedRefreshToken] = useState("");
  const [maskedEmailKey, setMaskedEmailKey] = useState("");
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [hasEmailKey, setHasEmailKey] = useState(false);
  const [showZaloArticleSync, setShowZaloArticleSync] = useState(false);

  // 15-day scan results & Cadre meeting reminders
  const [totalDueResidents, setTotalDueResidents] = useState(0);
  const [totalLandlordGroups, setTotalLandlordGroups] = useState(0);
  const [landlordDigests, setLandlordDigests] = useState<LandlordDigestItem[]>([]);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<CadreMeetingReminderItem[]>([]);
  const [dispatchingMeetingId, setDispatchingMeetingId] = useState<string | null>(null);

  // Cadre Zalo Mapping state
  const [cadres, setCadres] = useState<CadreZaloItem[]>([]);
  const [allFollowers, setAllFollowers] = useState<ZaloFollowerItem[]>([]);
  const [cadreStats, setCadreStats] = useState({
    totalCadres: 0,
    linkedCount: 0,
    unlinkedCount: 0,
    totalFollowers: 0,
  });
  const [loadingCadres, setLoadingCadres] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [cadreToLink, setCadreToLink] = useState<CadreZaloItem | null>(null);
  const [cadreSearchTerm, setCadreSearchTerm] = useState("");
  const [testingCadreKey, setTestingCadreKey] = useState<string | null>(null);

  // Broadcast composer
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [publishToPortalNews, setPublishToPortalNews] = useState(true);
  const [lastBroadcastPreview, setLastBroadcastPreview] = useState("");

  const webhookUrl =
    typeof window !== "undefined" && !window.location.origin.includes("localhost")
      ? `${window.location.origin}/api/notifications`
      : "https://bdhkp3.vercel.app/api/notifications";

  const notify = (msg: string, type: "success" | "error" | "info" | "warning" = "success") => {
    onNotify?.(msg, type);
  };

  const copyText = async (id: string, text: string, label = "nội dung") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
      notify(`Đã sao chép ${label} vào bộ nhớ tạm!`, "info");
    } catch {
      notify("Trình duyệt chặn sao chép tự động. Vui lòng bôi đen để sao chép.", "warning");
    }
  };

  const loadHubState = async (thresholdOverride?: number, expiredOverride?: boolean) => {
    try {
      setLoading(true);
      const authHeaders = await getStaffAuthHeaders();

      const [cfgRes, scanRes, mtgRes] = await Promise.all([
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ action: "get_config" }),
        }),
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            action: "scan_or_send_15d_reminders",
            dryRun: true,
            thresholdDays: thresholdOverride ?? remindDaysThreshold,
            includeExpiredWithin7d: expiredOverride ?? includeExpiredWithin7d,
          }),
        }),
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            action: "scan_or_send_cadre_meeting_reminders",
            dryRun: true,
            daysAhead: 14,
          }),
        }),
      ]);

      if (cfgRes.ok) {
        const cfgJson = await cfgRes.json();
        if (cfgJson?.ok) {
          if (cfgJson.oa) setOaMeta({ ...DEFAULT_OA, ...cfgJson.oa });
          if (cfgJson.config) {
            setAutoRemind15dEnabled(cfgJson.config.autoRemind15dEnabled !== false);
            setRemindDaysThreshold(Number(cfgJson.config.remindDaysThreshold) || 15);
            setIncludeExpiredWithin7d(Boolean(cfgJson.config.includeExpiredWithin7d));
            setAutoRemindMeeting60mEnabled(cfgJson.config.autoRemindMeeting60mEnabled !== false);
            setMeetingRemindMinutesBefore(Number(cfgJson.config.meetingRemindMinutesBefore) || 60);
            setZnsTemplateId(cfgJson.config.znsTemplateId || "");
            setNotifyBdhEmail(cfgJson.config.notifyBdhEmail || "bdhkhupho3.ap@gmail.com");
            setSenderEmail(cfgJson.config.senderEmail || "");
            setHasAccessToken(Boolean(cfgJson.config.hasAccessToken));
            setHasEmailKey(Boolean(cfgJson.config.hasEmailKey));
            setMaskedAccessToken(cfgJson.config.maskedAccessToken || "");
            setMaskedRefreshToken(cfgJson.config.maskedRefreshToken || "");
            setMaskedEmailKey(cfgJson.config.maskedEmailKey || "");
          }
          setLinkedFollowersCount(Number(cfgJson.linkedFollowersCount) || 0);
          setRecentLogs(Array.isArray(cfgJson.recentLogs) ? cfgJson.recentLogs : []);
        }
      }

      if (scanRes.ok) {
        const scanJson = await scanRes.json();
        if (scanJson?.ok) {
          setTotalDueResidents(Number(scanJson.totalDueResidents) || 0);
          setTotalLandlordGroups(Number(scanJson.totalLandlordGroups) || 0);
          setLandlordDigests(
            Array.isArray(scanJson.landlordDigests) ? scanJson.landlordDigests : []
          );
        }
      }

      if (mtgRes.ok) {
        const mtgJson = await mtgRes.json();
        if (mtgJson?.ok && Array.isArray(mtgJson.meetings)) {
          setUpcomingMeetings(mtgJson.meetings);
        }
      }
    } catch (e: any) {
      console.warn("Load Zalo OA Hub warning:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadCadresDirectory = async () => {
    try {
      setLoadingCadres(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "get_cadre_zalo_directory" }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setCadres(Array.isArray(json.cadres) ? json.cadres : []);
        setAllFollowers(Array.isArray(json.followers) ? json.followers : []);
        if (json.stats) setCadreStats(json.stats);
      }
    } catch (e) {
      console.warn("Load Cadres Directory warning:", e);
    } finally {
      setLoadingCadres(false);
    }
  };

  const handleAutoMatchAll = async () => {
    try {
      setAutoMatching(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "auto_match_all_cadres" }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        notify(
          `Đã quét đối chiếu: Ghép tự động thành công ${json.newlyLinkedCount} cán bộ mới (Tổng cộng ${json.totalLinked} cán bộ đã kết nối Zalo OA)!`,
          "success"
        );
        await loadCadresDirectory();
      } else {
        notify(json?.error || "Lỗi khi quét khớp tự động cán bộ.", "error");
      }
    } catch (e: any) {
      notify(e?.message || "Lỗi kết nối khi quét khớp tự động cán bộ.", "error");
    } finally {
      setAutoMatching(false);
    }
  };

  const handleQuickTestMessage = async (c: CadreZaloItem) => {
    if (!c.zaloUserId) return;
    try {
      setTestingCadreKey(c.cadreKey);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "test_send_cadre_message",
          zaloUserId: c.zaloUserId,
          cadreName: c.fullName,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        notify(`Đã gửi tin nhắn Zalo OA thử nghiệm tới đồng chí ${c.fullName}!`, "success");
      } else {
        notify(json?.detail || json?.error || "Gửi tin nhắn không thành công.", "error");
      }
    } catch (e: any) {
      notify(e?.message || "Lỗi khi gửi tin nhắn thử nghiệm.", "error");
    } finally {
      setTestingCadreKey(null);
    }
  };

  const filteredCadres = useMemo(() => {
    if (!cadreSearchTerm.trim()) return cadres;
    const term = cadreSearchTerm.toLowerCase().trim();
    return cadres.filter(
      (c) =>
        c.fullName.toLowerCase().includes(term) ||
        c.role.toLowerCase().includes(term) ||
        c.org.toLowerCase().includes(term) ||
        (c.zaloDisplayName && c.zaloDisplayName.toLowerCase().includes(term))
    );
  }, [cadres, cadreSearchTerm]);

  useEffect(() => {
    loadHubState(15, false);
    loadCadresDirectory();
  }, []);

  const handleScanNow = async (nextThreshold = remindDaysThreshold, nextIncludeExpired = includeExpiredWithin7d) => {
    try {
      setScanning(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "scan_or_send_15d_reminders",
          dryRun: true,
          thresholdDays: nextThreshold,
          includeExpiredWithin7d: nextIncludeExpired,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setTotalDueResidents(Number(json.totalDueResidents) || 0);
        setTotalLandlordGroups(Number(json.totalLandlordGroups) || 0);
        setLandlordDigests(Array.isArray(json.landlordDigests) ? json.landlordDigests : []);
        notify(
          `Đã rà soát CSDL Dân cư KP3: phát hiện ${json.totalDueResidents} nhân khẩu thuộc ${json.totalLandlordGroups} nhà trọ / hộ tạm trú cần nhắc hạn.`,
          "info"
        );
      } else {
        notify(json?.error || "Không thể quét danh sách hạn tạm trú.", "error");
      }
    } catch (e: any) {
      notify(e?.message || "Lỗi kết nối khi rà soát hạn tạm trú.", "error");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCfg(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "save_config",
          autoRemind15dEnabled,
          remindDaysThreshold,
          includeExpiredWithin7d,
          autoRemindMeeting60mEnabled,
          meetingRemindMinutesBefore,
          znsTemplateId,
          notifyBdhEmail,
          senderEmail,
          ...(accessTokenInput.trim() ? { accessToken: accessTokenInput.trim() } : {}),
          ...(refreshTokenInput.trim() ? { refreshToken: refreshTokenInput.trim() } : {}),
          ...(appSecretInput.trim() ? { appSecret: appSecretInput.trim() } : {}),
          ...(resendApiKeyInput.trim() ? { resendApiKey: resendApiKeyInput.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        notify(json?.error || "Không thể lưu cấu hình Zalo OA & Email.", "error");
        return;
      }
      setAccessTokenInput("");
      setRefreshTokenInput("");
      setAppSecretInput("");
      setResendApiKeyInput("");
      notify(json.message || "Đã lưu cấu hình kết nối Zalo OA & Email tự động!", "success");
      await loadHubState(remindDaysThreshold, includeExpiredWithin7d);
    } catch (err: any) {
      notify(err?.message || "Lỗi lưu cấu hình Zalo OA.", "error");
    } finally {
      setSavingCfg(false);
    }
  };

  const handleDispatch15dReminders = async () => {
    try {
      setDispatching(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "scan_or_send_15d_reminders",
          dryRun: false,
          thresholdDays: remindDaysThreshold,
          includeExpiredWithin7d,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        notify(json?.error || "Không thể thực thi đợt gửi nhắc hạn tạm trú.", "error");
        return;
      }
      notify(
        `Đã xử lý nhắc hạn trước ${remindDaysThreshold} ngày cho ${json.totalLandlordGroups} nhà trọ/hộ (${json.totalDueResidents} nhân khẩu): Đẩy API tự động ${json.sentDirectlyCount} lượt • Tạo phiếu nhắn Zalo 1-chạm ${json.queuedManualZaloCount} cơ sở.`,
        "success"
      );
      await loadHubState(remindDaysThreshold, includeExpiredWithin7d);
    } catch (err: any) {
      notify(err?.message || "Lỗi khi phát thông báo nhắc gia hạn tạm trú.", "error");
    } finally {
      setDispatching(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      notify("Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo khu phố!", "warning");
      return;
    }
    try {
      setSendingBroadcast(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "send_broadcast",
          title: broadcastTitle.trim(),
          content: broadcastContent.trim(),
          publishToPortalNews,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        notify(json?.error || "Không thể phát thông báo khu phố.", "error");
        return;
      }
      setLastBroadcastPreview(json.formattedBroadcast || "");
      setBroadcastTitle("");
      setBroadcastContent("");
      notify(
        `Đã phát thông báo Khu phố 3 thành công!${
          json.portalPublished ? " Đồng thời đã ghim lên mục Thông báo Cổng Cư dân." : ""
        }`,
        "success"
      );
      await loadHubState(remindDaysThreshold, includeExpiredWithin7d);
    } catch (err: any) {
      notify(err?.message || "Lỗi kết nối khi phát thông báo.", "error");
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. COMPACT ZALO OA HEADER & INLINE METRICS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                oaMeta.oaUrl
              )}`}
              alt="QR Zalo OA Ban Điều Hành Khu Phố 3"
              className="w-12 h-12 rounded-xl border border-slate-200 bg-white p-1 shrink-0 hidden sm:block"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {oaMeta.oaName}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold">
                  <ShieldCheck size={11} className="text-blue-700" />
                  Tích vàng Cơ quan Nhà nước
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
                  OA ID: {oaMeta.oaId}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>
                  Quan tâm OA:{" "}
                  <strong className="text-slate-900 font-mono">
                    {Math.max(oaMeta.verifiedFollowersBaseline, linkedFollowersCount)}
                  </strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Cán bộ đã ghép:{" "}
                  <strong className="text-emerald-700 font-mono">
                    {cadreStats.linkedCount}/{cadreStats.totalCadres}
                  </strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Đến hạn ≤{remindDaysThreshold}n:{" "}
                  <strong className="text-amber-700 font-mono">
                    {loading ? "..." : totalDueResidents} người
                  </strong>
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <button
                  type="button"
                  onClick={() => copyText("oa-url", oaMeta.oaUrl, "đường dẫn Zalo OA")}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  {copiedId === "oa-url" ? <Check size={11} /> : <Copy size={11} />}
                  <span>zalo.me/bdhkhupho3</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={oaMeta.oaUrl}
              target="_blank"
              rel="noreferrer"
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <MessageCircle size={13} />
              <span>Mở Zalo OA</span>
              <ExternalLink size={11} />
            </a>
            <a
              href="https://oa.nhatkyzalo.vn/manage/profile"
              target="_blank"
              rel="noreferrer"
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <span>Quản trị OA</span>
              <ExternalLink size={11} />
            </a>
            <button
              type="button"
              onClick={() => setShowApiConfig((prev) => !prev)}
              className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                showApiConfig
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Settings2 size={13} />
              <span>{showApiConfig ? "Đóng cấu hình API" : "Cấu hình API & Webhook"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible OAuth v4 + Webhook + Email Configuration Form */}
        {showApiConfig && (
          <form
            onSubmit={handleSaveConfig}
            className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-3.5 pt-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 text-xs">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-blue-700" />
                  Khóa API Tự động (Zalo OA v2 / ZNS &amp; Resend Email)
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lưu mã hóa nội bộ trên Supabase (`is_public = false`), không lộ ra trình duyệt công khai.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText("webhook", webhookUrl, "Webhook URL")}
                className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] shrink-0 cursor-pointer"
                title={webhookUrl}
              >
                {copiedId === "webhook" ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                <span>Chép Webhook OA</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRemind15dEnabled}
                  onChange={(e) => setAutoRemind15dEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-700 rounded"
                />
                <span className="font-semibold text-slate-800 truncate">
                  Tự động quét &amp; nhắc hạn hằng ngày
                </span>
              </label>

              <div className="bg-white border border-slate-200 rounded-lg px-3 h-9 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">Mốc báo trước (ngày):</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={remindDaysThreshold}
                  onChange={(e) => setRemindDaysThreshold(Number(e.target.value) || 15)}
                  className="w-16 h-7 px-2 border border-slate-200 rounded font-mono font-bold text-right text-slate-900"
                />
              </div>

              <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpiredWithin7d}
                  onChange={(e) => setIncludeExpiredWithin7d(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-600 rounded"
                />
                <span className="font-semibold text-slate-800 truncate">
                  Gồm cả hồ sơ quá hạn ≤ 7 ngày
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Zalo OA Access Token {maskedAccessToken && <span className="text-emerald-700 font-mono">({maskedAccessToken})</span>}
                </label>
                <input
                  type="password"
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  placeholder={`Dán Access Token của App ${oaMeta.linkedAppId} (để trống nếu giữ nguyên)`}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Zalo OA Refresh Token {maskedRefreshToken && <span className="text-emerald-700 font-mono">({maskedRefreshToken})</span>}
                </label>
                <input
                  type="password"
                  value={refreshTokenInput}
                  onChange={(e) => setRefreshTokenInput(e.target.value)}
                  placeholder="Dán Refresh Token OAuth v4 để tự động gia hạn token"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Zalo App Secret &amp; Mã Mẫu ZNS (Tùy chọn)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={appSecretInput}
                    onChange={(e) => setAppSecretInput(e.target.value)}
                    placeholder="Zalo App Secret"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={znsTemplateId}
                    onChange={(e) => setZnsTemplateId(e.target.value)}
                    placeholder="ZNS Template ID"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Resend API Key &amp; Email nhận báo cáo {maskedEmailKey && <span className="text-emerald-700 font-mono">({maskedEmailKey})</span>}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={resendApiKeyInput}
                    onChange={(e) => setResendApiKeyInput(e.target.value)}
                    placeholder="re_xxxxxxxxx"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                  <input
                    type="email"
                    value={notifyBdhEmail}
                    onChange={(e) => setNotifyBdhEmail(e.target.value)}
                    placeholder="bdhkhupho3.ap@gmail.com"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowApiConfig(false)}
                className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={savingCfg}
                className="h-9 inline-flex items-center gap-1.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {savingCfg ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. SEGMENTED SUB-TABS FOR ZALO OA WORKFLOWS */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 w-fit max-w-full evon-scroll">
          <button
            type="button"
            onClick={() => setActiveHubTab("meetings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeHubTab === "meetings"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={13} className={activeHubTab === "meetings" ? "text-emerald-700" : "text-slate-500"} />
            <span>Nhắc lịch họp CB ({upcomingMeetings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab("cadres")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeHubTab === "cadres"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Link2 size={13} className={activeHubTab === "cadres" ? "text-emerald-700" : "text-slate-500"} />
            <span>Danh bạ Zalo CB ({cadreStats.linkedCount}/{cadreStats.totalCadres})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab("residency")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeHubTab === "residency"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BellRing size={13} className={activeHubTab === "residency" ? "text-emerald-700" : "text-slate-500"} />
            <span>Nhắc hạn tạm trú ({totalLandlordGroups})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab("logs")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeHubTab === "logs"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail size={13} className={activeHubTab === "logs" ? "text-emerald-700" : "text-slate-500"} />
            <span>Nhật ký gửi tin ({recentLogs.length})</span>
          </button>
        </div>

        {onNavigateToBroadcast && (
          <button
            type="button"
            onClick={onNavigateToBroadcast}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Megaphone size={13} className="text-emerald-700" />
            <span>Phát thông báo AI đa đối tượng →</span>
          </button>
        )}
      </div>

      {/* TAB 2A: NHẮC LỊCH HỌP CÁN BỘ QUA ZALO OA */}
      {activeHubTab === "meetings" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                  <Calendar size={13} />
                </span>
                Tự động Nhắc Lịch Họp &amp; Công tác Cán bộ qua Zalo OA
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Canh giờ Việt Nam (UTC+7) đẩy thông báo Zalo OA cho cán bộ dự họp đúng{" "}
                <strong className="text-slate-700">{meetingRemindMinutesBefore} phút trước giờ bắt đầu</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="h-9 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs">
                <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRemindMeeting60mEnabled}
                    onChange={async (e) => {
                      const nextVal = e.target.checked;
                      setAutoRemindMeeting60mEnabled(nextVal);
                      const authHeaders = await getStaffAuthHeaders();
                      await fetch("/api/notifications", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...authHeaders },
                        body: JSON.stringify({
                          action: "save_config",
                          autoRemindMeeting60mEnabled: nextVal,
                          meetingRemindMinutesBefore,
                        }),
                      }).catch(() => {});
                      notify(
                        nextVal
                          ? `Đã bật tự động nhắc lịch họp qua Zalo OA trước ${meetingRemindMinutesBefore} phút!`
                          : "Đã tạm tắt tự động nhắc lịch họp trước giờ họp.",
                        "info"
                      );
                    }}
                    className="w-3.5 h-3.5 accent-emerald-700 rounded"
                  />
                  <span>Nhắc trước</span>
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={meetingRemindMinutesBefore}
                  onChange={(e) => setMeetingRemindMinutesBefore(Number(e.target.value) || 60)}
                  onBlur={async () => {
                    const authHeaders = await getStaffAuthHeaders();
                    await fetch("/api/notifications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...authHeaders },
                      body: JSON.stringify({
                        action: "save_config",
                        autoRemindMeeting60mEnabled,
                        meetingRemindMinutesBefore,
                      }),
                    }).catch(() => {});
                    await loadHubState(remindDaysThreshold, includeExpiredWithin7d);
                  }}
                  className="w-12 h-6 px-1 bg-white border border-slate-200 rounded font-mono font-bold text-center text-slate-900"
                />
                <span className="text-slate-500">phút</span>
              </div>

              <button
                type="button"
                disabled={dispatchingMeetingId === "ALL" || upcomingMeetings.length === 0}
                onClick={async () => {
                  try {
                    setDispatchingMeetingId("ALL");
                    const authHeaders = await getStaffAuthHeaders();
                    const res = await fetch("/api/notifications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...authHeaders },
                      body: JSON.stringify({
                        action: "scan_or_send_cadre_meeting_reminders",
                        dryRun: false,
                        daysAhead: 14,
                      }),
                    });
                    const json = await res.json();
                    if (res.ok && json?.ok) {
                      notify(
                        `Đã phát thông báo nhắc ${json.totalMeetings} lịch họp cho Cán bộ Khu phố 3 qua Zalo OA (${json.sentDirectlyCount} lượt đẩy API tự động • ${json.queuedManualZaloCount} phiếu Zalo 1-chạm)!`,
                        "success"
                      );
                      await loadHubState(remindDaysThreshold, includeExpiredWithin7d);
                    } else {
                      notify(json?.error || "Không thể phát nhắc lịch họp.", "error");
                    }
                  } finally {
                    setDispatchingMeetingId(null);
                  }
                }}
                className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {dispatchingMeetingId === "ALL" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>Phát nhắc tất cả</span>
              </button>
            </div>
          </div>

          {upcomingMeetings.length === 0 ? (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600">
              Hiện chưa có lịch họp / lịch công tác sắp diễn ra trong 14 ngày tới trên bảng Lịch công tác Khu phố 3.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingMeetings.slice(0, 10).map((mtg) => {
                const firstPhoneCadre = mtg.cadres.find((c) => c.phone);
                const zaloDirect = firstPhoneCadre ? toZaloChatUrl(firstPhoneCadre.phone) : null;

                return (
                  <div
                    key={mtg.id}
                    className="bg-slate-50/60 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 border border-slate-200 font-mono font-bold text-[11px] inline-flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          {mtg.dateFormatted} {mtg.time ? `• ${mtg.time}` : ""}
                        </span>
                        {mtg.inRemindWindow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px]">
                            Họp sau {mtg.minutesUntilStart} phút
                          </span>
                        ) : mtg.alreadyAutoReminded ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                            ✓ Đã nhắc tự động
                          </span>
                        ) : mtg.remindAtHHmm ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[11px]">
                            Nhắc lúc {mtg.remindAtHHmm}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">
                            {mtg.cadres.length} cán bộ
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 leading-snug text-xs sm:text-[13px]">{mtg.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate">{mtg.location || "Phường An Phú"}</span>
                      </p>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {mtg.cadres.slice(0, 4).map((c, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 ${
                              c.zaloUserId
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            {c.zaloUserId && <Check size={10} className="text-emerald-700" />}
                            <span>{c.fullName}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          copyText(`mtg-${mtg.id}`, mtg.formattedMessage, `nội dung nhắc lịch "${mtg.title}"`)
                        }
                        className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        {copiedId === `mtg-${mtg.id}` ? (
                          <Check size={11} className="text-emerald-700" />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>Mẫu tin</span>
                      </button>

                      <button
                        type="button"
                        disabled={dispatchingMeetingId === mtg.id}
                        onClick={async () => {
                          try {
                            setDispatchingMeetingId(mtg.id);
                            await navigator.clipboard?.writeText(mtg.formattedMessage).catch(() => {});
                            const authHeaders = await getStaffAuthHeaders();
                            const res = await fetch("/api/notifications", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", ...authHeaders },
                              body: JSON.stringify({
                                action: "scan_or_send_cadre_meeting_reminders",
                                dryRun: false,
                                scheduleId: mtg.id,
                              }),
                            });
                            const json = await res.json();
                            if (res.ok && json?.ok) {
                              notify(
                                `Đã gửi nhắc lịch "${mtg.title}" qua Zalo OA & chép sẵn mẫu tin vào bộ nhớ tạm!`,
                                "success"
                              );
                              await loadHubState(remindDaysThreshold, includeExpiredWithin7d);
                            }
                          } finally {
                            setDispatchingMeetingId(null);
                          }
                        }}
                        className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {dispatchingMeetingId === mtg.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <BellRing size={11} />
                        )}
                        <span>Nhắc OA</span>
                      </button>

                      {zaloDirect && (
                        <a
                          href={zaloDirect}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            navigator.clipboard?.writeText(mtg.formattedMessage).catch(() => {});
                          }}
                          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          <MessageCircle size={11} />
                          <span>Zalo</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2B: DANH BẠ CÁN BỘ & LIÊN KẾT ZALO OA (COMPACT TABLE) */}
      {activeHubTab === "cadres" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={cadreSearchTerm}
                onChange={(e) => setCadreSearchTerm(e.target.value)}
                placeholder="Tìm cán bộ, chức vụ hoặc chi hội..."
                className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 mr-1 hidden sm:inline">
                {allFollowers.length} tài khoản đang quan tâm OA
              </span>
              <button
                type="button"
                disabled={autoMatching}
                onClick={handleAutoMatchAll}
                className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Tự động đối chiếu SĐT và Họ tên cán bộ với danh sách người quan tâm Zalo OA"
              >
                {autoMatching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>Quét &amp; Khớp tự động</span>
              </button>
              <button
                type="button"
                disabled={loadingCadres}
                onClick={loadCadresDirectory}
                className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingCadres ? "animate-spin" : ""} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {loadingCadres && cadres.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin text-emerald-700" />
              <span>Đang tải danh bạ cán bộ và trạng thái Zalo OA...</span>
            </div>
          ) : filteredCadres.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Không tìm thấy cán bộ nào phù hợp với từ khóa "{cadreSearchTerm}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3.5">Họ và tên Cán bộ</th>
                    <th className="py-2.5 px-3.5">Đơn vị &amp; Chức vụ</th>
                    <th className="py-2.5 px-3.5">Điện thoại</th>
                    <th className="py-2.5 px-3.5">Tài khoản Zalo OA</th>
                    <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCadres.map((c) => {
                    const isTesting = testingCadreKey === c.cadreKey;
                    return (
                      <tr key={c.cadreKey} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {c.fullName}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-slate-800">{c.role}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="text-slate-500">{c.org}</span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                          {c.phone || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {c.isLinked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                              <Check size={11} className="text-emerald-700" />
                              <span>{c.zaloDisplayName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                              Chưa ghép OA
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {c.isLinked && (
                              <button
                                type="button"
                                disabled={isTesting}
                                onClick={() => handleQuickTestMessage(c)}
                                className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs cursor-pointer disabled:opacity-50"
                                title="Gửi tin nhắn Zalo OA thử nghiệm"
                              >
                                {isTesting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                <span>Nhắn thử</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setCadreToLink(c)}
                              className={`h-7 inline-flex items-center gap-1 px-2.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                                c.isLinked
                                  ? "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                                  : "bg-slate-900 hover:bg-slate-800 text-white"
                              }`}
                            >
                              <Link2 size={11} />
                              <span>{c.isLinked ? "Đổi" : "Ghép OA"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2C: NHẮC GIA HẠN TẠM TRÚ TRƯỚC 15 NGÀY */}
      {activeHubTab === "residency" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/70">
                  <BellRing size={13} />
                </span>
                Nhắc Gia hạn Tạm trú Tự động Trước {remindDaysThreshold} Ngày
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Gom cụm cư dân sắp hết hạn theo từng <strong>Chủ cơ sở nhà trọ / Chủ hộ tạm trú</strong> để thông báo tập trung qua Zalo OA hoặc Email.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={scanning || loading}
                onClick={() => handleScanNow(remindDaysThreshold, includeExpiredWithin7d)}
                className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
                <span>Quét lại CSDL</span>
              </button>

              <button
                type="button"
                disabled={dispatching || landlordDigests.length === 0}
                onClick={handleDispatch15dReminders}
                className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {dispatching ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang phát nhắc hạn...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Phát nhắc hạn ({totalLandlordGroups} chủ hộ)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin text-emerald-700" />
              <span>Đang đối khớp hạn tạm trú của cư dân và cơ sở nhà trọ...</span>
            </div>
          ) : landlordDigests.length === 0 ? (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                <span>
                  Không có nhân khẩu tạm trú nào hết hạn trong vòng <strong>{remindDaysThreshold} ngày</strong> tới.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRemindDaysThreshold(30);
                  setIncludeExpiredWithin7d(true);
                  handleScanNow(30, true);
                }}
                className="h-8 px-3 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-semibold text-xs shrink-0 cursor-pointer hover:bg-emerald-100"
              >
                Quét mở rộng 30 ngày
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3.5">Cơ sở Nhà trọ / Hộ tạm trú</th>
                      <th className="py-2.5 px-3.5">Chủ nhà trọ / Chủ hộ</th>
                      <th className="py-2.5 px-3.5">SĐT Liên hệ</th>
                      <th className="py-2.5 px-3.5 text-center">Đến hạn</th>
                      <th className="py-2.5 px-3.5">Hạn gần nhất</th>
                      <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {landlordDigests.slice(0, 25).map((grp) => {
                      const earliest = grp.tenants[0];
                      const zaloChatLink = toZaloChatUrl(grp.landlordPhone);
                      const isExpanded = expandedGroupKey === grp.key;

                      return (
                        <React.Fragment key={grp.key}>
                          <tr className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3.5">
                              <p className="font-bold text-slate-900">{grp.hostelName}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{grp.address}</p>
                            </td>
                            <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                              {grp.landlordName}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-800">
                              {grp.landlordPhone ? (
                                <a
                                  href={`tel:${grp.landlordPhone}`}
                                  className="text-blue-700 hover:underline font-semibold"
                                >
                                  {grp.landlordPhone}
                                </a>
                              ) : (
                                <span className="text-slate-400">Chưa cập nhật</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGroupKey(isExpanded ? null : grp.key)
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px] cursor-pointer hover:bg-amber-100"
                              >
                                <Users size={11} />
                                <span>{grp.tenantCount} người</span>
                              </button>
                            </td>
                            <td className="py-2.5 px-3.5">
                              {earliest && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-semibold text-[11px] border ${
                                    earliest.daysLeft < 0
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`}
                                >
                                  <Clock size={11} />
                                  {earliest.expFormatted} (
                                  {earliest.daysLeft < 0
                                    ? `Quá ${Math.abs(earliest.daysLeft)}n`
                                    : `Còn ${earliest.daysLeft}n`}
                                  )
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(
                                      `msg-${grp.key}`,
                                      grp.sampleMessage,
                                      `nội dung nhắc hạn cho ${grp.landlordName}`
                                    )
                                  }
                                  className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                                >
                                  {copiedId === `msg-${grp.key}` ? (
                                    <Check size={11} className="text-emerald-700" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                  <span>Mẫu tin</span>
                                </button>

                                {zaloChatLink && (
                                  <a
                                    href={zaloChatLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(grp.sampleMessage).catch(() => {});
                                    }}
                                    className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                  >
                                    <MessageCircle size={11} />
                                    <span>Zalo</span>
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={6} className="p-3.5 space-y-2">
                                <p className="font-bold text-slate-800 text-xs">
                                  Danh sách nhân khẩu đến hạn tại {grp.hostelName}:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {grp.tenants.map((t) => (
                                    <div
                                      key={t.id}
                                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate">
                                          {t.fullName}
                                        </p>
                                        <p className="font-mono text-[11px] text-slate-500">
                                          CCCD: {t.cccdMasked} {t.phone ? `• ${t.phone}` : ""}
                                        </p>
                                      </div>
                                      <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                                        {t.expFormatted}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2D: NHẬT KÝ GỬI THÔNG BÁO ZALO OA & EMAIL */}
      {activeHubTab === "logs" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Mail size={13} className="text-emerald-700" />
              Nhật ký Phát Thông báo Zalo OA &amp; Email Gần đây ({recentLogs.length})
            </h4>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Chưa có nhật ký gửi thông báo tự động nào gần đây.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-900">{log.subject}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700">
                        {log.channel === "zalo_oa"
                          ? "Zalo OA"
                          : log.channel === "zalo_zns"
                          ? "Zalo ZNS"
                          : log.channel === "email"
                          ? "Email"
                          : "Phiếu Zalo 1-chạm"}
                      </span>
                    </div>
                    <p className="text-slate-600 truncate">
                      Người nhận: <strong className="text-slate-800">{log.recipientName}</strong>
                      {log.recipientPhone ? ` (${log.recipientPhone})` : ""} • Thực hiện: {log.actorName}
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleString("vi-VN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Liên kết Zalo OA cho Cán bộ */}
      <CadreZaloLinkModal
        isOpen={Boolean(cadreToLink)}
        onClose={() => setCadreToLink(null)}
        cadre={cadreToLink}
        allFollowers={allFollowers}
        onLinkedSuccess={(updated) => {
          setCadres((prev) =>
            prev.map((c) => (c.cadreKey === updated.cadreKey ? updated : c))
          );
          setCadreStats((prev) => ({
            ...prev,
            linkedCount: prev.linkedCount + 1,
            unlinkedCount: Math.max(0, prev.unlinkedCount - 1),
          }));
          loadHubState(remindDaysThreshold, includeExpiredWithin7d);
        }}
        onUnlinkedSuccess={(unlinkedKey) => {
          setCadres((prev) =>
            prev.map((c) =>
              c.cadreKey === unlinkedKey
                ? { ...c, isLinked: false, zaloUserId: undefined, zaloDisplayName: undefined }
                : c
            )
          );
          setCadreStats((prev) => ({
            ...prev,
            linkedCount: Math.max(0, prev.linkedCount - 1),
            unlinkedCount: prev.unlinkedCount + 1,
          }));
          loadHubState(remindDaysThreshold, includeExpiredWithin7d);
        }}
        onNotify={notify}
      />
    </div>
  );
}
