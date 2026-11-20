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

export function ZaloOaNotificationHub({ onNotify }: ZaloOaNotificationHubProps) {
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
    <div className="space-y-6">
      {/* 1. KẾT NỐI ZALO OA CHÍNH THỨC CỦA BAN ĐIỀU HÀNH KHU PHỐ 3 */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                <ShieldCheck size={13} className="text-blue-700" />
                Zalo Official Account Tích Vàng Cơ Quan Nhà Nước
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Đã liên kết OA ID: {oaMeta.oaId}
              </span>
            </div>
            <h4 className="text-base font-black text-slate-900">{oaMeta.oaName}</h4>
            <p className="text-xs text-slate-600">
              Trụ sở OA: <strong className="text-slate-800">{oaMeta.headquartersAddress}</strong> • Ứng dụng cấp quyền:{" "}
              <strong className="font-mono text-slate-800">
                {oaMeta.linkedAppName} (App ID: {oaMeta.linkedAppId})
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={oaMeta.oaUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              <MessageCircle size={14} />
              <span>Mở kênh Zalo OA</span>
              <ExternalLink size={12} />
            </a>
            <a
              href="https://oa.nhatkyzalo.vn/manage/profile"
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <span>Quản trị OA</span>
              <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={() => setShowZaloArticleSync(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <MessageCircle size={14} className="fill-current text-blue-600" />
              <span>Đồng bộ Bài viết OA</span>
            </button>
            <button
              type="button"
              onClick={() => setShowApiConfig((prev) => !prev)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Settings2 size={14} className="text-slate-600" />
              <span>{showApiConfig ? "Ẩn cấu hình API" : "Cấu hình Token & Email"}</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip + QR */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                oaMeta.oaUrl
              )}`}
              alt="QR Zalo OA Ban Điều Hành Khu Phố 3"
              className="w-14 h-14 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <QrCode size={12} /> Mã QR Cư dân Quan tâm
              </p>
              <p className="text-xs font-mono font-bold text-blue-700 truncate mt-0.5">
                zalo.me/bdhkhupho3
              </p>
              <button
                type="button"
                onClick={() => copyText("oa-url", oaMeta.oaUrl, "đường dẫn Zalo OA")}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-blue-700 cursor-pointer"
              >
                {copiedId === "oa-url" ? <Check size={11} /> : <Copy size={11} />}
                <span>Sao chép link mời dân</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Người dân quan tâm OA
            </p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {Math.max(oaMeta.verifiedFollowersBaseline, linkedFollowersCount)}
              <span className="text-xs font-semibold text-slate-600 ml-1.5">người</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              {linkedFollowersCount > 0
                ? `${linkedFollowersCount} SĐT đã khớp tự động qua Webhook`
                : "Sẵn sàng nhận tin nhắn SĐT/CCCD từ dân"}
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Cư dân đến hạn ≤ {remindDaysThreshold} ngày
            </p>
            <p className="text-2xl font-black text-amber-950 mt-0.5">
              {loading ? "..." : totalDueResidents}
              <span className="text-xs font-semibold text-amber-800 ml-1.5">nhân khẩu</span>
            </p>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              Thuộc {totalLandlordGroups} nhà trọ / hộ tạm trú
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Chế độ Tự động Nhắc lịch &amp; Hạn
            </p>
            <p className="text-xs font-black text-emerald-800 mt-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
              <span>
                Họp CB: <strong>Trước {meetingRemindMinutesBefore} phút</strong> • Tạm trú: <strong>Trước {remindDaysThreshold} ngày</strong>
              </span>
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Zalo Token:{" "}
              <strong className={hasAccessToken ? "text-emerald-700" : "text-amber-700"}>
                {hasAccessToken ? "Đã cấp" : "Chế độ 1-chạm"}
              </strong>{" "}
              • Email:{" "}
              <strong className={hasEmailKey ? "text-emerald-700" : "text-slate-700"}>
                {hasEmailKey ? "Đã bật" : "Chưa nhập key"}
              </strong>
            </p>
          </div>
        </div>

        {/* Webhook URL Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="font-bold text-slate-700">Webhook nhận sự kiện Zalo OA (Follow / Nhắn SĐT đăng ký): </span>
            <code className="font-mono text-blue-800 break-all">{webhookUrl}</code>
          </div>
          <button
            type="button"
            onClick={() => copyText("webhook", webhookUrl, "Webhook URL")}
            className="min-h-[34px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold shrink-0 cursor-pointer"
          >
            {copiedId === "webhook" ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
            <span>Sao chép Webhook</span>
          </button>
        </div>

        {/* Collapsible OAuth v4 + Email Configuration Form */}
        {showApiConfig && (
          <form
            onSubmit={handleSaveConfig}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-700" />
                  Thiết lập Khóa API Tự động (Zalo OpenAPI v3 / ZNS &amp; Email Resend)
                </h5>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Toàn bộ khóa bí mật được mã hóa lưu nội bộ trên Supabase (`is_public = false`), tuyệt đối không lộ ra trình duyệt công khai.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRemind15dEnabled}
                  onChange={(e) => setAutoRemind15dEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-700 rounded"
                />
                <span className="font-bold text-slate-800">
                  Tự động quét &amp; nhắc hạn hằng ngày
                </span>
              </label>

              <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700">Mốc báo trước (ngày):</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={remindDaysThreshold}
                  onChange={(e) => setRemindDaysThreshold(Number(e.target.value) || 15)}
                  className="w-20 px-2.5 py-1 border border-slate-200 rounded-lg font-mono font-bold text-right text-slate-900"
                />
              </div>

              <label className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpiredWithin7d}
                  onChange={(e) => setIncludeExpiredWithin7d(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <span className="font-bold text-slate-800">
                  Gồm cả hồ sơ vừa quá hạn ≤ 7 ngày
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Zalo OA Access Token {maskedAccessToken && <span className="text-emerald-700 font-mono">({maskedAccessToken})</span>}
                </label>
                <input
                  type="password"
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  placeholder={`Dán Access Token của App ${oaMeta.linkedAppId} (để trống nếu giữ nguyên)`}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Zalo OA Refresh Token {maskedRefreshToken && <span className="text-emerald-700 font-mono">({maskedRefreshToken})</span>}
                </label>
                <input
                  type="password"
                  value={refreshTokenInput}
                  onChange={(e) => setRefreshTokenInput(e.target.value)}
                  placeholder="Dán Refresh Token OAuth v4 để tự động gia hạn token"
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Zalo App Secret &amp; Mã Mẫu ZNS (Tùy chọn)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={appSecretInput}
                    onChange={(e) => setAppSecretInput(e.target.value)}
                    placeholder="Zalo App Secret"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={znsTemplateId}
                    onChange={(e) => setZnsTemplateId(e.target.value)}
                    placeholder="ZNS Template ID"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Resend Email API Key &amp; Email nhận báo cáo BĐH {maskedEmailKey && <span className="text-emerald-700 font-mono">({maskedEmailKey})</span>}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={resendApiKeyInput}
                    onChange={(e) => setResendApiKeyInput(e.target.value)}
                    placeholder="re_xxxxxxxxx (Resend API)"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                  />
                  <input
                    type="email"
                    value={notifyBdhEmail}
                    onChange={(e) => setNotifyBdhEmail(e.target.value)}
                    placeholder="bdhkhupho3.ap@gmail.com"
                    className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowApiConfig(false)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={savingCfg}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingCfg ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Lưu cấu hình Tự động</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2A. NHẮC LỊCH HỌP & CÔNG TÁC CHO CÁN BỘ KHU PHỐ 3 QUA ZALO OA — TỰ ĐỘNG TRƯỚC 60 PHÚT */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-600 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar size={17} className="text-indigo-700" />
                Nhắc Lịch Họp &amp; Công Tác Cho Cán Bộ Khu Phố 3 Qua Zalo OA ({upcomingMeetings.length} lịch sắp tới)
              </h4>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold">
                <Clock size={12} className="text-indigo-700" />
                {autoRemindMeeting60mEnabled
                  ? `Tự động nhắc trước ${meetingRemindMinutesBefore} phút`
                  : "Đang tắt nhắc tự động"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Hệ thống tự động canh giờ Việt Nam (UTC+7) và đẩy thông báo Zalo OA cho cán bộ dự họp đúng <strong>{meetingRemindMinutesBefore} phút trước giờ bắt đầu cuộc họp</strong> (chống gửi trùng lặp).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <label className="inline-flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
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
                  className="w-4 h-4 accent-indigo-700 rounded"
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
                className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-center text-indigo-900"
              />
              <span className="font-semibold text-slate-600">phút</span>
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
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {dispatchingMeetingId === "ALL" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>Phát nhắc ngay</span>
            </button>
          </div>
        </div>

        {upcomingMeetings.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
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
                  className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 font-mono font-bold text-[11px] inline-flex items-center gap-1">
                        <Clock size={11} />
                        {mtg.dateFormatted} {mtg.time ? `• ${mtg.time}` : ""}
                      </span>
                      {mtg.inRemindWindow ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 font-bold text-[11px] animate-pulse">
                          ⏰ Họp sau {mtg.minutesUntilStart} phút (Khung nhắc {meetingRemindMinutesBefore}p)
                        </span>
                      ) : mtg.alreadyAutoReminded ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                          ✓ Đã tự động nhắc trước {meetingRemindMinutesBefore}p
                        </span>
                      ) : mtg.remindAtHHmm ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[11px]">
                          🔔 Tự động nhắc lúc {mtg.remindAtHHmm}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600">
                          {mtg.cadres.length} cán bộ tham dự
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 leading-snug">{mtg.title}</p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{mtg.location || "Phường An Phú"}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {mtg.cadres.slice(0, 4).map((c, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 ${
                            c.zaloUserId
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          {c.zaloUserId && <Check size={10} className="text-emerald-700" />}
                          <span>
                            {c.fullName}
                            {c.zaloUserId ? " (Đã khớp OA)" : c.phone ? ` (${c.phone})` : ""}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        copyText(`mtg-${mtg.id}`, mtg.formattedMessage, `nội dung nhắc lịch "${mtg.title}"`)
                      }
                      className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold cursor-pointer"
                    >
                      {copiedId === `mtg-${mtg.id}` ? (
                        <Check size={12} className="text-emerald-700" />
                      ) : (
                        <Copy size={12} />
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
                      className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {dispatchingMeetingId === mtg.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <BellRing size={12} />
                      )}
                      <span>Nhắc qua OA</span>
                    </button>

                    {zaloDirect && (
                      <a
                        href={zaloDirect}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          navigator.clipboard?.writeText(mtg.formattedMessage).catch(() => {});
                        }}
                        className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <MessageCircle size={12} />
                        <span>Nhắn Zalo Cán bộ</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2B. DANH BẠ CÁN BỘ & LIÊN KẾT TÀI KHOẢN ZALO OA NHẬN TIN NHẮC LỊCH */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-teal-600 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Link2 size={17} className="text-teal-700" />
                Danh Bạ Cán Bộ &amp; Liên Kết Zalo OA ({cadreStats.linkedCount}/{cadreStats.totalCadres} đã liên kết)
              </h4>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-[11px] font-bold">
                <Users size={12} className="text-teal-700" />
                {allFollowers.length} người đang quan tâm OA
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Để cán bộ (như Phó Bí thư Phạm Ngọc Hà, Ban Mặt trận, các Chi hội trưởng, Tổ ANTT, Tổ PCCC...) nhận được tin nhắn nhắc lịch họp qua Zalo, hãy bấm <strong>"Ghép Zalo OA"</strong> và chọn tài khoản Zalo tương ứng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={cadreSearchTerm}
                onChange={(e) => setCadreSearchTerm(e.target.value)}
                placeholder="Tìm cán bộ hoặc chức vụ..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white"
              />
            </div>
            <button
              type="button"
              disabled={autoMatching}
              onClick={handleAutoMatchAll}
              className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Tự động quét danh bạ 36 cán bộ, đối chiếu SĐT và Họ tên với 347 người đang quan tâm Zalo OA để ghép tự động"
            >
              {autoMatching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Quét &amp; Khớp Tự Động (1-Chạm)</span>
            </button>
            <button
              type="button"
              disabled={loadingCadres}
              onClick={loadCadresDirectory}
              className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingCadres ? "animate-spin" : ""} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {loadingCadres && cadres.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-teal-600" />
            <span>Đang tải danh bạ cán bộ và trạng thái Zalo OA...</span>
          </div>
        ) : filteredCadres.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            Không tìm thấy cán bộ nào phù hợp với từ khóa "{cadreSearchTerm}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredCadres.map((c) => {
              const isTesting = testingCadreKey === c.cadreKey;
              return (
                <div
                  key={c.cadreKey}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-xs ${
                    c.isLinked
                      ? "bg-teal-50/40 border-teal-200/80 shadow-2xs"
                      : "bg-slate-50/70 border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-[10px] truncate max-w-[170px]">
                        {c.org}
                      </span>
                      {c.isLinked ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] inline-flex items-center gap-1 shrink-0">
                          <Check size={10} className="text-emerald-700" />
                          Đã ghép
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] inline-flex items-center gap-1 shrink-0">
                          <AlertTriangle size={10} className="text-amber-700" />
                          Chưa ghép
                        </span>
                      )}
                    </div>

                    <div>
                      <h5 className="font-black text-slate-900 text-sm leading-snug">
                        {c.fullName}
                      </h5>
                      <p className="text-[11px] text-slate-600 font-medium line-clamp-1">
                        {c.role}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.email && <span className="truncate max-w-[130px]">✉️ {c.email}</span>}
                    </div>

                    {c.isLinked && (
                      <div className="p-2 rounded-xl bg-white border border-teal-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-teal-800 block">
                            Tài khoản Zalo OA:
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate block">
                            {c.zaloDisplayName}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isTesting}
                          onClick={() => handleQuickTestMessage(c)}
                          className="min-h-[28px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] shrink-0 cursor-pointer disabled:opacity-50"
                          title="Gửi tin nhắn Zalo OA thử nghiệm"
                        >
                          {isTesting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                          <span>Nhắn thử</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCadreToLink(c)}
                      className={`min-h-[30px] inline-flex items-center gap-1 px-3 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        c.isLinked
                          ? "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                      }`}
                    >
                      <Link2 size={12} />
                      <span>{c.isLinked ? "Đổi tài khoản" : "Ghép Zalo OA"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2C. NHẮC GIA HẠN TẠM TRÚ TRƯỚC 15 NGÀY CHO CHỦ NHÀ TRỌ & CƯ DÂN */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BellRing size={17} className="text-amber-600" />
              Nhắc Gia hạn Tạm trú Tự động Trước {remindDaysThreshold} Ngày (Chủ Nhà trọ &amp; Cư dân)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Hệ thống tự động gom cụm cư dân sắp hết hạn theo từng <strong>Chủ cơ sở nhà trọ / Chủ hộ tạm trú</strong> để thông báo tập trung qua Zalo OA, Email hoặc nhắn Zalo trực tiếp 1-chạm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={scanning || loading}
              onClick={() => handleScanNow(remindDaysThreshold, includeExpiredWithin7d)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
              <span>Quét lại CSDL</span>
            </button>

            <button
              type="button"
              disabled={dispatching || landlordDigests.length === 0}
              onClick={handleDispatch15dReminders}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {dispatching ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang phát nhắc hạn...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>
                    Phát nhắc hạn {remindDaysThreshold} ngày ({totalLandlordGroups} chủ trọ / hộ)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-amber-600" />
            <span>Đang đối khớp hạn tạm trú của 9.120 cư dân tạm trú và 108 cơ sở nhà trọ...</span>
          </div>
        ) : landlordDigests.length === 0 ? (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold">
                  Hiện không có nhân khẩu tạm trú nào hết hạn trong vòng {remindDaysThreshold} ngày tới!
                </p>
                <p className="text-emerald-800 mt-0.5">
                  Bạn có thể bật tùy chọn rà soát mở rộng 30 ngày hoặc bao gồm hồ sơ vừa quá hạn 7 ngày để kiểm tra thêm.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRemindDaysThreshold(30);
                setIncludeExpiredWithin7d(true);
                handleScanNow(30, true);
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold text-xs shrink-0 cursor-pointer hover:bg-emerald-100"
            >
              Quét mở rộng (30 ngày + quá hạn 7 ngày)
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Cơ sở Nhà trọ / Hộ tạm trú</th>
                    <th className="py-2.5 px-3">Chủ nhà trọ / Chủ hộ</th>
                    <th className="py-2.5 px-3">SĐT Liên hệ Zalo</th>
                    <th className="py-2.5 px-3 text-center">Số người đến hạn</th>
                    <th className="py-2.5 px-3">Hạn gần nhất</th>
                    <th className="py-2.5 px-3 text-right">Thao tác Nhắc hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {landlordDigests.slice(0, 25).map((grp) => {
                    const earliest = grp.tenants[0];
                    const zaloChatLink = toZaloChatUrl(grp.landlordPhone);
                    const isExpanded = expandedGroupKey === grp.key;

                    return (
                      <React.Fragment key={grp.key}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{grp.hostelName}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{grp.address}</p>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {grp.landlordName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            {grp.landlordPhone ? (
                              <a
                                href={`tel:${grp.landlordPhone}`}
                                className="text-blue-700 hover:underline font-bold"
                              >
                                {grp.landlordPhone}
                              </a>
                            ) : (
                              <span className="text-slate-400">Chưa cập nhật</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedGroupKey(isExpanded ? null : grp.key)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-bold cursor-pointer hover:bg-amber-100"
                            >
                              <Users size={12} />
                              <span>{grp.tenantCount} người</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            {earliest && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold ${
                                  earliest.daysLeft < 0
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
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
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  copyText(
                                    `msg-${grp.key}`,
                                    grp.sampleMessage,
                                    `nội dung nhắc hạn cho ${grp.landlordName}`
                                  )
                                }
                                className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold cursor-pointer"
                                title="Sao chép mẫu thông báo chuẩn để gửi Zalo/SMS"
                              >
                                {copiedId === `msg-${grp.key}` ? (
                                  <Check size={12} className="text-emerald-700" />
                                ) : (
                                  <Copy size={12} />
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
                                  className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                  title="Tự động chép nội dung & mở cửa sổ chat Zalo trực tiếp với Chủ trọ"
                                >
                                  <MessageCircle size={12} />
                                  <span>Nhắn Zalo</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/90">
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
                                      <p className="font-mono text-[11px] text-slate-600">
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

      {/* 3. PHÁT THÔNG BÁO TỪ BAN ĐIỀU HÀNH KHU PHỐ 3 ĐẾN NGƯỜI DÂN */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Megaphone size={17} className="text-emerald-700" />
              Phát Thông báo Chính thức từ Khu phố 3 đến Người dân (Zalo OA &amp; Cổng Cư dân)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Soạn một lần để gửi đồng bộ tới người dân theo dõi Zalo OA (<strong>zalo.me/bdhkhupho3</strong>) và ghim trực tiếp lên bảng Thông báo Khẩn trên Cổng Dịch vụ Cư dân số.
            </p>
          </div>
          <a
            href="https://oa.nhatkyzalo.vn/manage/content/article/"
            target="_blank"
            rel="noreferrer"
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold shrink-0"
          >
            <span>Soạn Bài viết Broadcast OA</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Tiêu đề thông báo gửi người dân *
            </label>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Ví dụ: Thông báo lịch tổng vệ sinh môi trường & kiểm tra PCCC nhà trọ cuối tuần"
              className="w-full min-h-[42px] px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Nội dung chi tiết thông báo *
            </label>
            <textarea
              rows={4}
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Nhập thời gian, địa điểm, đối tượng tham gia và đầu mối liên hệ của Ban Điều hành Khu phố 3..."
              className="w-full p-3.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs text-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={publishToPortalNews}
                onChange={(e) => setPublishToPortalNews(e.target.checked)}
                className="w-4 h-4 accent-emerald-700 rounded"
              />
              <span>Đồng thời đăng &amp; ghim lên mục Thông báo Cổng Cư dân (bdhkp3.vercel.app)</span>
            </label>

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {sendingBroadcast ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang phát thông báo...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Phát Thông báo đến Người dân</span>
                </>
              )}
            </button>
          </div>
        </form>

        {lastBroadcastPreview && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-700" />
                Bản tin chuẩn Zalo OA vừa tạo:
              </span>
              <button
                type="button"
                onClick={() =>
                  copyText("last-bc", lastBroadcastPreview, "bản tin thông báo Zalo OA")
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold cursor-pointer"
              >
                <Copy size={12} />
                <span>Sao chép dán nhóm Zalo Tổ dân phố</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-slate-800 bg-white border border-emerald-100 rounded-lg p-3 leading-relaxed">
              {lastBroadcastPreview}
            </pre>
          </div>
        )}
      </div>

      {/* 4. NHẬT KÝ GỬI THÔNG BÁO TỰ ĐỘNG */}
      {recentLogs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Mail size={14} className="text-slate-600" />
            Nhật ký Phát Thông báo Zalo OA &amp; Email Gần đây ({recentLogs.length})
          </h4>
          <div className="divide-y divide-slate-200/80 border border-slate-200 rounded-xl overflow-hidden">
            {recentLogs.slice(0, 12).map((log) => (
              <div
                key={log.id}
                className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50"
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
