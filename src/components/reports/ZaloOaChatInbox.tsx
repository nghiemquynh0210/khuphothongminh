import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FilePlus2,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { FieldReport, ReportCategory } from "../../types";
import { formatNowVNString } from "../../data/reportConfig";
import { getStaffAuthHeaders, uploadReportImages } from "../../utils/imageUpload";
import { formatShortRecordId } from "../../utils/kp3Utils";
import { recordAuditLog } from "../../utils/auditLogger";

export interface ZaloChatConversation {
  zaloUserId: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  cccd?: string;
  residentName?: string;
  residentAddress?: string;
  lastMessage: string;
  lastMessageType: "text" | "image" | "location" | "file" | "sticker";
  lastDirection: "inbound" | "outbound";
  lastMessageAt: string;
  unreadCount: number;
  linkedReportId?: string;
  linkedReportTitle?: string;
  status: "open" | "resolved";
}

export interface ZaloChatMessage {
  id: string;
  zaloUserId: string;
  direction: "inbound" | "outbound";
  msgType: "text" | "image" | "location" | "file" | "sticker";
  content: string;
  attachmentUrl?: string;
  lat?: number;
  lng?: number;
  senderName: string;
  reportId?: string;
  zaloMsgId?: string;
  createdAt: string;
}

interface FollowerLite {
  zaloUserId: string;
  displayName: string;
  phone?: string;
}

export interface ZaloOaChatInboxProps {
  reports: FieldReport[];
  onAddReport: (newReport: FieldReport) => void;
  onOpenReportDetail?: (report: FieldReport) => void;
  onUnreadCountChange?: (count: number) => void;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
}

const QUICK_REPLIES = [
  {
    label: "Đã tiếp nhận",
    text: "Ban Điều hành Khu phố 3 Phường An Phú đã tiếp nhận phản ánh của ông/bà và đang chuyển Tổ công tác kiểm tra hiện trường. Trân trọng!",
  },
  {
    label: "Đang kiểm tra",
    text: "Tổ công tác Khu phố 3 đang trực tiếp có mặt kiểm tra thực tế tại khu vực ông/bà phản ánh. Chúng tôi sẽ cập nhật kết quả ngay khi xử lý xong.",
  },
  {
    label: "Đã xử lý xong",
    text: "Sự cố ông/bà phản ánh đã được Ban Điều hành Khu phố 3 kiểm tra và khắc phục hoàn tất. Rất mong nhận được góp ý từ ông/bà để khu phố ngày càng sạch đẹp hơn.",
  },
];

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin}p trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}g trước`;
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMessageTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )} • ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inferCategoryFromText(text: string): ReportCategory {
  const s = text.toLowerCase();
  if (/ngập|cống|thoát nước|ứ đọng/.test(s)) {
    return "Ngập nước";
  }
  if (/rác|vệ sinh|mùi hôi|ô nhiễm/.test(s)) {
    return "Rác thải";
  }
  if (/lấn chiếm|vỉa hè|lòng đường|bán hàng rong/.test(s)) {
    return "Lấn chiếm lòng đường";
  }
  if (/ồn|karaoke|loa kẹo kéo|tiếng ồn/.test(s)) {
    return "Tiếng ồn";
  }
  if (/trộm|đánh nhau|an ninh|tụ tập|cờ bạc/.test(s)) {
    return "An ninh trật tự";
  }
  if (/đèn|điện|đường|ổ gà|nắp cống|hạ tầng|chiếu sáng/.test(s)) {
    return "Hạ tầng đô thị";
  }
  return "Trật tự đô thị";
}

export function ZaloOaChatInbox({
  reports,
  onAddReport,
  onOpenReportDetail,
  onUnreadCountChange,
  currentUser,
}: ZaloOaChatInboxProps) {
  const [conversations, setConversations] = useState<ZaloChatConversation[]>([]);
  const [followers, setFollowers] = useState<FollowerLite[]>([]);
  const [selectedUid, setSelectedUid] = useState<string>("");
  const [messages, setMessages] = useState<ZaloChatMessage[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("https://bdhkp3.vercel.app/api/notifications");

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "unlinked" | "linked">("all");
  const [replyText, setReplyText] = useState("");
  const [replyImageUrl, setReplyImageUrl] = useState("");
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [followerSearch, setFollowerSearch] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const actorName = currentUser?.fullName || "Cán bộ Ban Điều hành KP3";

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const callApi = useCallback(async (payload: Record<string, any>) => {
    const authHeaders = await getStaffAuthHeaders();
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
    }
    return data;
  }, []);

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingList(true);
      try {
        const data = await callApi({ action: "list_zalo_conversations" });
        const list: ZaloChatConversation[] = Array.isArray(data.conversations)
          ? data.conversations
          : [];
        setConversations(list);
        if (Array.isArray(data.followers)) setFollowers(data.followers);
        if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
        onUnreadCountChange?.(Number(data.totalUnread || 0));
        setSelectedUid((prev) => prev || list[0]?.zaloUserId || "");
      } catch (err: any) {
        if (!silent) {
          setNotice({ type: "err", text: err?.message || "Không tải được danh sách hội thoại Zalo OA." });
        }
      } finally {
        if (!silent) setIsLoadingList(false);
      }
    },
    [callApi, onUnreadCountChange]
  );

  const loadMessages = useCallback(
    async (zaloUserId: string, silent = false) => {
      if (!zaloUserId) {
        setMessages([]);
        return;
      }
      if (!silent) setIsLoadingMsgs(true);
      try {
        const data = await callApi({
          action: "get_zalo_conversation_messages",
          zaloUserId,
        });
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setConversations((prev) => {
          const next = prev.map((c) =>
            c.zaloUserId === zaloUserId ? { ...c, unreadCount: 0 } : c
          );
          const unread = next.reduce((s, c) => s + (c.unreadCount || 0), 0);
          onUnreadCountChange?.(unread);
          return next;
        });
      } catch (err: any) {
        if (!silent) {
          setNotice({ type: "err", text: err?.message || "Không tải được tin nhắn." });
        }
      } finally {
        if (!silent) setIsLoadingMsgs(false);
      }
    },
    [callApi, onUnreadCountChange]
  );

  useEffect(() => {
    loadConversations(false);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedUid) {
      loadMessages(selectedUid, false);
    }
  }, [selectedUid, loadMessages]);

  // Tự động làm mới mỗi 15 giây khi đang mở Hộp thư Zalo OA
  useEffect(() => {
    const id = window.setInterval(() => {
      loadConversations(true);
      if (selectedUid) {
        loadMessages(selectedUid, true);
      }
    }, 15_000);
    return () => window.clearInterval(id);
  }, [loadConversations, loadMessages, selectedUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedUid]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.zaloUserId === selectedUid) || null,
    [conversations, selectedUid]
  );

  const linkedReport = useMemo(() => {
    if (!selectedConversation?.linkedReportId) return null;
    return reports.find((r) => r.id === selectedConversation.linkedReportId) || null;
  }, [reports, selectedConversation?.linkedReportId]);

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return conversations.filter((c) => {
      const matchQ =
        !q ||
        c.displayName.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.linkedReportId || "").toLowerCase().includes(q);
      if (!matchQ) return false;
      if (filterMode === "unread") return c.unreadCount > 0;
      if (filterMode === "unlinked") return !c.linkedReportId;
      if (filterMode === "linked") return Boolean(c.linkedReportId);
      return true;
    });
  }, [conversations, searchTerm, filterMode]);

  const filteredFollowers = useMemo(() => {
    const q = followerSearch.trim().toLowerCase();
    return followers
      .filter(
        (f) =>
          !q ||
          f.displayName.toLowerCase().includes(q) ||
          (f.phone || "").includes(q) ||
          f.zaloUserId.includes(q)
      )
      .slice(0, 30);
  }, [followers, followerSearch]);

  const handleSyncRecent = async () => {
    setIsSyncing(true);
    try {
      const data = await callApi({ action: "sync_zalo_recent_chats" });
      await loadConversations(true);
      if (selectedUid) await loadMessages(selectedUid, true);
      if (data.syncedMessages > 0) {
        setNotice({
          type: "ok",
          text: `Đã đồng bộ ${data.syncedMessages} tin nhắn gần đây từ Zalo OA Khu phố 3.`,
        });
      } else if (data.zaloApiError) {
        setNotice({
          type: "ok",
          text: `Đã kiểm tra Zalo OA. Tin nhắn mới sẽ đổ tự động qua Webhook (${data.zaloApiError}).`,
        });
      } else {
        setNotice({ type: "ok", text: "Hộp thư Zalo OA đã được cập nhật mới nhất." });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Đồng bộ Zalo OA thất bại." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartChatWithFollower = (f: FollowerLite) => {
    const exists = conversations.find((c) => c.zaloUserId === f.zaloUserId);
    if (!exists) {
      const stub: ZaloChatConversation = {
        zaloUserId: f.zaloUserId,
        displayName: f.displayName,
        phone: f.phone,
        lastMessage: "Bắt đầu hội thoại mới với cư dân...",
        lastMessageType: "text",
        lastDirection: "outbound",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        status: "open",
      };
      setConversations((prev) => [stub, ...prev]);
    }
    setSelectedUid(f.zaloUserId);
    setShowNewChatPicker(false);
    setFollowerSearch("");
  };

  const handleUploadReplyImage = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploadingImg(true);
    try {
      const { urls, errors } = await uploadReportImages([fileList[0]], "chat");
      if (urls[0]) {
        setReplyImageUrl(urls[0]);
      } else if (errors[0]) {
        setNotice({ type: "err", text: errors[0] });
      }
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation) return;
    const trimmed = replyText.trim();
    if (!trimmed && !replyImageUrl) return;

    setIsSending(true);
    try {
      const data = await callApi({
        action: "reply_zalo_chat",
        zaloUserId: selectedConversation.zaloUserId,
        displayName: selectedConversation.displayName,
        text: trimmed,
        imageUrl: replyImageUrl || undefined,
        reportId: selectedConversation.linkedReportId,
        reportTitle: selectedConversation.linkedReportTitle,
      });

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      if (data.conversation) {
        setConversations((prev) => [
          data.conversation,
          ...prev.filter((c) => c.zaloUserId !== data.conversation.zaloUserId),
        ]);
      }
      setReplyText("");
      setReplyImageUrl("");

      recordAuditLog({
        actorName,
        actorRole: "Cán bộ BĐH Khu phố 3",
        category: "RESIDENT_CRUD",
        actionTitle: "Trả lời tin nhắn Zalo OA (Phản ánh hiện trường)",
        targetSummary: `${selectedConversation.displayName}: ${trimmed.slice(0, 80) || "[Ảnh minh chứng]"}`,
      });
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Gửi tin nhắn Zalo OA thất bại." });
    } finally {
      setIsSending(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedConversation) return;
    setIsAiDrafting(true);
    try {
      const data = await callApi({
        action: "ai_suggest_zalo_reply",
        zaloUserId: selectedConversation.zaloUserId,
        displayName: selectedConversation.displayName,
        linkedReportId: selectedConversation.linkedReportId,
        linkedReportTitle: selectedConversation.linkedReportTitle,
      });
      if (data.suggestion) {
        setReplyText(data.suggestion);
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "AI chưa tạo được gợi ý." });
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleCreateReportFromChat = async () => {
    if (!selectedConversation) return;
    setIsCreatingReport(true);
    try {
      const inboundMsgs = messages.filter((m) => m.direction === "inbound");
      const textParts = inboundMsgs
        .map((m) => m.content)
        .filter((t) => t && !t.startsWith("["))
        .slice(-5);
      const combinedDesc =
        textParts.join("\n") ||
        selectedConversation.lastMessage ||
        `Phản ánh tiếp nhận qua Zalo OA từ ${selectedConversation.displayName}`;
      const images = inboundMsgs
        .filter((m) => m.msgType === "image" && m.attachmentUrl)
        .map((m) => m.attachmentUrl as string)
        .slice(0, 4);
      const locMsg = [...inboundMsgs].reverse().find((m) => m.lat && m.lng);

      const newId = `PA-${new Date().getFullYear()}-${String(
        Math.floor(1000 + Math.random() * 9000)
      )}`;
      const titleCandidate =
        combinedDesc.split("\n")[0].slice(0, 85).trim() ||
        `Phản ánh qua Zalo OA từ ${selectedConversation.displayName}`;
      const nowLabel = formatNowVNString();

      const newReport: FieldReport = {
        id: newId,
        title: titleCandidate,
        category: inferCategoryFromText(combinedDesc),
        reporterName: selectedConversation.displayName,
        reporterPhone: selectedConversation.phone || "Liên hệ qua Zalo OA",
        reportedAt: nowLabel,
        createdAt: new Date().toISOString(),
        location:
          selectedConversation.residentAddress ||
          (locMsg?.lat && locMsg?.lng
            ? `Tọa độ GPS (${locMsg.lat.toFixed(5)}, ${locMsg.lng.toFixed(5)}) — Khu phố 3, Phường An Phú, TP. Hồ Chí Minh`
            : "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"),
        coordinates: { x: 50, y: 50 },
        lat: locMsg?.lat,
        lng: locMsg?.lng,
        description: `[Tiếp nhận từ Zalo OA • UID: ${selectedConversation.zaloUserId}]\n${combinedDesc}`,
        status: "Đã tiếp nhận",
        priority: "Bình thường",
        assignedUnit: "Ban Điều hành KP3",
        beforeImage: images[0],
        beforeImages: images,
        timeline: [
          {
            time: nowLabel,
            title: "Tiếp nhận từ Hộp thư Zalo OA",
            description: `Cán bộ ${actorName} chuyển đổi hội thoại Zalo OA của ${selectedConversation.displayName} thành hồ sơ phản ánh 1022.`,
            actor: actorName,
          },
        ],
        messages: [],
      };

      onAddReport(newReport);

      await callApi({
        action: "link_zalo_conversation_report",
        zaloUserId: selectedConversation.zaloUserId,
        reportId: newId,
        reportTitle: newReport.title,
        notifyResident: true,
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.zaloUserId === selectedConversation.zaloUserId
            ? { ...c, linkedReportId: newId, linkedReportTitle: newReport.title }
            : c
        )
      );
      await loadMessages(selectedConversation.zaloUserId, true);

      setNotice({
        type: "ok",
        text: `Đã lập hồ sơ ${formatShortRecordId(newId, "PA")} và gửi xác nhận tự động qua Zalo OA cho ${selectedConversation.displayName}!`,
      });
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Không lập được phiếu phản ánh." });
    } finally {
      setIsCreatingReport(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-3">
      {notice && (
        <div
          role="status"
          className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            notice.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            {notice.text}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-current opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main 2-Column Minimalist Chat Split */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* LEFT COLUMN: Conversations List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col bg-slate-50/40">
          <div className="p-3 border-b border-slate-200/80 bg-white space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MessageCircle size={15} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Hội thoại Zalo OA ({conversations.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowNewChatPicker((v) => !v)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  title="Chủ động nhắn tin cho cư dân đã Quan tâm Zalo OA"
                >
                  <Plus size={13} />
                  <span>Nhắn mới</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncRecent}
                  disabled={isSyncing}
                  className="h-8 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Đồng bộ tin nhắn gần đây từ Zalo OA"
                >
                  <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                  <span>Đồng bộ</span>
                </button>
              </div>
            </div>

            {showNewChatPicker && (
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900">
                    Chọn cư dân đã Quan tâm OA ({followers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewChatPicker(false)}
                    className="text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
                <input
                  type="search"
                  value={followerSearch}
                  onChange={(e) => setFollowerSearch(e.target.value)}
                  placeholder="Tìm tên Zalo hoặc SĐT..."
                  className="w-full h-8 px-2.5 rounded-md border border-blue-200 bg-white text-xs focus:outline-none focus:border-blue-500"
                />
                <div className="max-h-36 overflow-y-auto divide-y divide-blue-100 bg-white rounded-md border border-blue-100">
                  {filteredFollowers.length === 0 ? (
                    <div className="p-2 text-[11px] text-slate-500 text-center">
                      Không tìm thấy cư dân phù hợp.
                    </div>
                  ) : (
                    filteredFollowers.map((f) => (
                      <button
                        key={f.zaloUserId}
                        type="button"
                        onClick={() => handleStartChatWithFollower(f)}
                        className="w-full px-2.5 py-1.5 text-left hover:bg-blue-50 flex items-center justify-between gap-2 text-xs cursor-pointer"
                      >
                        <span className="font-medium text-slate-800 truncate">
                          {f.displayName}
                        </span>
                        <span className="text-[11px] text-slate-500 shrink-0">
                          {f.phone || `#${f.zaloUserId.slice(-4)}`}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên cư dân, nội dung, mã PA..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(
                [
                  { id: "all", label: "Tất cả" },
                  { id: "unread", label: "Chưa đọc" },
                  { id: "unlinked", label: "Chưa lập phiếu" },
                  { id: "linked", label: "Đã gắn PA" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    filterMode === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-200/70">
            {isLoadingList ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                <span>Đang tải hộp thư Zalo OA...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <MessageCircle size={24} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">
                  Chưa có hội thoại nào phù hợp
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Bấm <strong>Đồng bộ</strong> để kéo tin nhắn gần đây, hoặc bấm{" "}
                  <strong>Nhắn mới</strong> để chủ động liên hệ cư dân đã Quan tâm OA.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.zaloUserId === selectedUid;
                return (
                  <button
                    key={conv.zaloUserId}
                    type="button"
                    onClick={() => setSelectedUid(conv.zaloUserId)}
                    className={`w-full p-3 text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isActive
                        ? "bg-emerald-50/90 border-l-2 border-l-emerald-600"
                        : "hover:bg-white"
                    }`}
                  >
                    {conv.avatar ? (
                      <img
                        src={conv.avatar}
                        alt={conv.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {conv.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {conv.displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        {conv.lastDirection === "outbound" ? "Bạn: " : ""}
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center justify-between gap-1.5">
                        {conv.linkedReportId ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            {formatShortRecordId(conv.linkedReportId, "PA")}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {conv.phone || "Zalo OA"}
                          </span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Conversation & Reply Composer */}
        <div className="lg:col-span-8 flex flex-col bg-white">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageCircle size={24} />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  Hộp thư Zalo OA Khu phố 3 Phường An Phú
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chọn một hội thoại bên trái để xem tin nhắn, ảnh hiện trường, trả lời trực tiếp
                  tới Zalo cư dân hoặc chuyển nhanh thành Phiếu Phản ánh 1022.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedConversation.avatar ? (
                    <img
                      src={selectedConversation.avatar}
                      alt={selectedConversation.displayName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      <User size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {selectedConversation.displayName}
                      </h3>
                      {selectedConversation.phone && (
                        <a
                          href={`tel:${selectedConversation.phone}`}
                          className="text-[11px] font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Phone size={11} />
                          {selectedConversation.phone}
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Zalo UID: {selectedConversation.zaloUserId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {linkedReport && onOpenReportDetail ? (
                    <button
                      type="button"
                      onClick={() => onOpenReportDetail(linkedReport)}
                      className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      <span>Mở hồ sơ {formatShortRecordId(linkedReport.id, "PA")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateReportFromChat}
                      disabled={isCreatingReport}
                      className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingReport ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FilePlus2 size={13} />
                      )}
                      <span>Lập Phản ánh 1022</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 max-h-[380px]">
                {isLoadingMsgs ? (
                  <div className="py-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-emerald-600" />
                    <span>Đang tải lịch sử hội thoại...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    Chưa có tin nhắn nào trong hội thoại này. Anh có thể gửi tin nhắn đầu tiên ở ô
                    bên dưới.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOut = msg.direction === "outbound";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOut ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs space-y-2 ${
                            isOut
                              ? "bg-emerald-700 text-white rounded-br-sm"
                              : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-sm"
                          }`}
                        >
                          {msg.attachmentUrl && msg.msgType === "image" && (
                            <button
                              type="button"
                              onClick={() => setPreviewImgUrl(msg.attachmentUrl || null)}
                              className="block overflow-hidden rounded-lg border border-black/10 cursor-pointer"
                            >
                              <img
                                src={msg.attachmentUrl}
                                alt="Ảnh Zalo OA"
                                className="max-h-52 w-auto object-cover"
                              />
                            </button>
                          )}
                          {msg.lat && msg.lng && (
                            <a
                              href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                                isOut
                                  ? "bg-white/15 text-white hover:bg-white/25"
                                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                            >
                              <MapPin size={13} />
                              <span>
                                Mở vị trí GPS ({msg.lat.toFixed(5)}, {msg.lng.toFixed(5)})
                              </span>
                            </a>
                          )}
                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                        </div>
                        <span className="mt-1 px-1 text-[10px] text-slate-400">
                          {msg.senderName} • {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer Area */}
              <div className="p-3 border-t border-slate-200/80 bg-white space-y-2">
                {/* Quick replies & AI Suggest */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr.label}
                      type="button"
                      onClick={() => setReplyText(qr.text)}
                      className="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
                    >
                      {qr.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={isAiDrafting}
                    className="h-7 px-2.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ml-auto disabled:opacity-50"
                  >
                    {isAiDrafting ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Sparkles size={11} />
                    )}
                    <span>AI Gợi ý trả lời</span>
                  </button>
                </div>

                {replyImageUrl && (
                  <div className="relative inline-block">
                    <img
                      src={replyImageUrl}
                      alt="Ảnh sắp gửi"
                      className="h-16 w-16 object-cover rounded-lg border border-emerald-300"
                    />
                    <button
                      type="button"
                      onClick={() => setReplyImageUrl("")}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="flex items-end gap-2">
                  <label
                    className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
                    title="Đính kèm ảnh gửi qua Zalo OA"
                  >
                    {isUploadingImg ? (
                      <Loader2 size={15} className="animate-spin text-emerald-600" />
                    ) : (
                      <ImagePlus size={15} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        handleUploadReplyImage(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Trả lời ${selectedConversation.displayName} qua Zalo OA... (Enter để gửi)`}
                    className="flex-1 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-600 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSending || (!replyText.trim() && !replyImageUrl)}
                    className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Gửi Zalo</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact Webhook Connection Footer */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">
            Webhook nhận tin nhắn Zalo OA thời gian thực:{" "}
            <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono text-[11px]">
              {webhookUrl}
            </code>
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyWebhook}
          className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          {copiedWebhook ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          <span>{copiedWebhook ? "Đã sao chép" : "Sao chép Webhook"}</span>
        </button>
      </div>

      {/* Fullscreen Image Lightbox */}
      {previewImgUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setPreviewImgUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImgUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
          <img
            src={previewImgUrl}
            alt="Ảnh phóng to"
            className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
