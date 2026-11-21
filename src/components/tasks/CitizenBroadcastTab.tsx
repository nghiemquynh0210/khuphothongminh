import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileUp,
  Flag,
  Globe,
  HeartHandshake,
  History,
  Loader2,
  Megaphone,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { Association, LocalNews, ScheduleEvent, TaskItem } from "../../types";
import { getStaffAuthHeaders } from "../../utils/imageUpload";
import { recordAuditLog } from "../../utils/auditLogger";

export interface BroadcastSeedSource {
  kind: "schedule" | "task";
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  hostOrAssignee?: string;
  unit?: string;
  nonce: number;
}

interface AudienceOptionItem {
  id: string;
  name: string;
  groupType: "all_citizens" | "party_gov" | "mass_org" | "welfare" | "hostel_owners";
  categoryLabel: string;
  leaderName?: string;
  leaderPhone?: string;
  totalMembers: number;
  zaloLinkedCount: number;
  defaultPublishPortal: boolean;
}

interface RecentBroadcastLog {
  id: string;
  timestamp: string;
  recipientName: string;
  subject: string;
  messagePreview: string;
  status: string;
  detail?: string;
  actorName: string;
}

interface UnmatchedContact {
  fullName: string;
  groupName: string;
  roleOrCategory: string;
  phone?: string;
}

export interface CitizenBroadcastTabProps {
  schedules: ScheduleEvent[];
  tasks: TaskItem[];
  associationsList: Association[];
  creatorLabel: string;
  seedSource?: BroadcastSeedSource | null;
  onClearSeedSource?: () => void;
  onNotify?: (message: string, tone?: "success" | "info" | "warning") => void;
}

const NEWS_CATEGORIES: LocalNews["category"][] = [
  "Hành chính",
  "Thông báo khẩn",
  "Y tế & Đời sống",
  "Phong trào",
  "An sinh xã hội",
];

const QUICK_SCENARIO_PRESETS: Array<{
  id: string;
  label: string;
  prompt: string;
  tone: "formal" | "urgent" | "friendly";
  suggestedAudiences?: string[];
}> = [
  {
    id: "party_meeting",
    label: "Sinh hoạt Chi bộ Đảng",
    prompt:
      "Thông báo lịch họp lệ Chi bộ Khu phố 3 định kỳ hằng tháng, quán triệt nghị quyết Đảng ủy Phường An Phú và triển khai nhiệm vụ trọng tâm tháng tới. Đề nghị các đồng chí Đảng viên tham dự đầy đủ, đúng giờ.",
    tone: "formal",
    suggestedAudiences: ["ASC_DANG"],
  },
  {
    id: "veterans_mass_org",
    label: "Hội họp Chi hội CCB / Đoàn thể",
    prompt:
      "Thông báo mời hội viên tham dự sinh hoạt chuyên đề, triển khai phong trào thi đua và công tác tự quản tại địa bàn Khu phố 3.",
    tone: "friendly",
    suggestedAudiences: ["ASC_CCB"],
  },
  {
    id: "welfare_support",
    label: "Chăm lo Hộ nghèo / Chính sách",
    prompt:
      "Thông báo mời đại diện các hộ gia đình thuộc diện quan tâm chăm lo đến Văn phòng Khu phố 3 nhận quà hỗ trợ an sinh xã hội. Khi đi vui lòng mang theo Căn cước hoặc VNeID để đối chiếu.",
    tone: "friendly",
    suggestedAudiences: ["ASC_CS_NGHEO", "ASC_CS_CANNGHEO"],
  },
  {
    id: "pccc_hostel",
    label: "Kiểm tra PCCC & Tạm trú nhà trọ",
    prompt:
      "Thông báo phối hợp kiểm tra an toàn Phòng cháy chữa cháy, lối thoát nạn và rà soát đăng ký tạm trú CT01/VNeID tại các cơ sở nhà trọ trên địa bàn Khu phố 3.",
    tone: "urgent",
    suggestedAudiences: ["HOSTEL_OWNERS"],
  },
  {
    id: "clean_health",
    label: "Ra quân Vệ sinh & Phòng dịch",
    prompt:
      "Phát động ra quân Ngày Chủ nhật xanh tổng vệ sinh môi trường, diệt lăng quăng phòng chống sốt xuất huyết trên các tuyến đường, hẻm tại Khu phố 3.",
    tone: "friendly",
    suggestedAudiences: ["ALL_CITIZENS"],
  },
  {
    id: "urgent_utility",
    label: "Cảnh báo Điện / Nước / Triều cường",
    prompt:
      "Thông báo khẩn về lịch tạm ngưng cung cấp điện/nước hoặc cảnh báo mưa lớn, triều cường để bà con chủ động tích trữ sinh hoạt và đảm bảo an toàn điện.",
    tone: "urgent",
    suggestedAudiences: ["ALL_CITIZENS"],
  },
];

const QUICK_AUDIENCE_SHORTCUTS = [
  { id: "ALL_CITIZENS", label: "Toàn dân" },
  { id: "ASC_DANG", label: "Đảng viên" },
  { id: "ASC_CCB", label: "Cựu chiến binh" },
  { id: "ASC_CS_NGHEO", label: "Hộ nghèo" },
  { id: "HOSTEL_OWNERS", label: "Chủ nhà trọ" },
];

export function inferTargetAudiencesFromText(text: string): string[] {
  const norm = String(text || "").toLowerCase();
  const matched: string[] = [];
  if (/chi bộ|đảng viên 213/.test(norm)) {
    if (/213|sinh hoạt nơi cư trú/.test(norm)) matched.push("ASC_DANG213");
    else matched.push("ASC_DANG");
  } else if (/đảng ủy|đảng viên/.test(norm)) {
    matched.push("ASC_DANG");
  }
  if (/cựu chiến binh|\bccb\b/.test(norm)) matched.push("ASC_CCB");
  if (/phụ nữ/.test(norm)) matched.push("ASC_PN");
  if (/thanh niên|đoàn viên/.test(norm)) matched.push("ASC_TN");
  if (/người cao tuổi|mừng thọ/.test(norm)) matched.push("ASC_NCT");
  if (/chữ thập đỏ|hiến máu/.test(norm)) matched.push("ASC_CTD");
  if (/cựu công an/.test(norm)) matched.push("ASC_CCA");
  if (/hộ nghèo/.test(norm)) matched.push("ASC_CS_NGHEO");
  if (/cận nghèo/.test(norm)) matched.push("ASC_CS_CANNGHEO");
  if (/người có công|thương binh|liệt sĩ/.test(norm)) matched.push("ASC_CS_NCC");
  if (/gia đình chính sách/.test(norm)) matched.push("ASC_CS_GDCS");
  if (/khuyết tật|bảo trợ/.test(norm)) matched.push("ASC_CS_NKT");
  if (/nhà trọ|chủ trọ|lưu trú|tạm trú/.test(norm)) matched.push("HOSTEL_OWNERS");
  if (/pccc|cháy nổ/.test(norm) && matched.length === 0) matched.push("ASC_PCCC");
  if (/an ninh trật tự|\bantt\b|tuần tra/.test(norm) && matched.length === 0) matched.push("ASC_ANTT");
  if (/mặt trận/.test(norm) && matched.length === 0) matched.push("ASC_MT");

  return matched.length > 0 ? Array.from(new Set(matched)) : ["ALL_CITIZENS"];
}

function toZaloChatUrl(phone?: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const localPhone = digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
  return `https://zalo.me/${localPhone}`;
}

function buildLocalFallbackAudienceList(associationsList: Association[]): AudienceOptionItem[] {
  const items: AudienceOptionItem[] = [
    {
      id: "ALL_CITIZENS",
      name: "Toàn thể Người dân Khu phố 3",
      groupType: "all_citizens",
      categoryLabel: "Cộng đồng dân cư",
      totalMembers: 347,
      zaloLinkedCount: 347,
      defaultPublishPortal: true,
    },
  ];
  for (const a of associationsList) {
    const isPartyGov =
      a.id === "ASC_DANG" ||
      a.id === "ASC_CHIBO" ||
      a.id === "ASC_DANG213" ||
      a.id === "ASC_CTDANG" ||
      a.id === "ASC_BDH" ||
      a.id === "ASC_MT" ||
      a.id === "ASC_MATTRAN" ||
      a.id === "ASC_TOTRUONG";
    const isWelfare =
      a.id.startsWith("ASC_CS_") || a.category.toLowerCase().includes("chính sách");
    const members = Array.isArray(a.members) ? a.members : [];
    items.push({
      id: a.id,
      name: a.name,
      groupType: isWelfare ? "welfare" : isPartyGov ? "party_gov" : "mass_org",
      categoryLabel: a.category,
      leaderName: a.leaderName,
      totalMembers: members.length,
      zaloLinkedCount: members.filter((m) => Boolean(m.zaloUserId)).length,
      defaultPublishPortal: false,
    });
  }
  items.push({
    id: "HOSTEL_OWNERS",
    name: "Chủ nhà trọ & Cơ sở lưu trú",
    groupType: "hostel_owners",
    categoryLabel: "Quản lý lưu trú - PCCC",
    totalMembers: 108,
    zaloLinkedCount: 0,
    defaultPublishPortal: false,
  });
  return items;
}

export const CitizenBroadcastTab: React.FC<CitizenBroadcastTabProps> = ({
  schedules,
  tasks,
  associationsList,
  creatorLabel,
  seedSource,
  onClearSeedSource,
  onNotify,
}) => {
  const [audiences, setAudiences] = useState<AudienceOptionItem[]>(() =>
    buildLocalFallbackAudienceList(associationsList)
  );
  const [recentLogs, setRecentLogs] = useState<RecentBroadcastLog[]>([]);
  const [oaFollowersCount, setOaFollowersCount] = useState(347);

  // Audience Popover state
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>(["ALL_CITIZENS"]);
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [audienceTabFilter, setAudienceTabFilter] = useState<
    "all" | "party_gov" | "mass_org" | "welfare"
  >("all");
  const [audienceSearch, setAudienceSearch] = useState("");
  const audienceDropdownRef = useRef<HTMLDivElement | null>(null);

  // AI Composer state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState<"formal" | "urgent" | "friendly">("formal");
  const [selectedSourceRef, setSelectedSourceRef] = useState<string>("");
  const [attachedDoc, setAttachedDoc] = useState<{
    name: string;
    mimeType: string;
    base64: string;
    sizeLabel: string;
  } | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [previousDraftSnapshot, setPreviousDraftSnapshot] = useState<{
    title: string;
    content: string;
    summary: string;
    category: LocalNews["category"];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Official Broadcast Form state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [portalSummary, setPortalSummary] = useState("");
  const [showSummaryInput, setShowSummaryInput] = useState(false);
  const [newsCategory, setNewsCategory] = useState<LocalNews["category"]>("Hành chính");
  const [publishToPortalNews, setPublishToPortalNews] = useState(true);
  const [portalToggledManually, setPortalToggledManually] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [showHistoryLogs, setShowHistoryLogs] = useState(false);

  // Post-dispatch result state
  const [dispatchResult, setDispatchResult] = useState<{
    zaloSent: number;
    zaloTargeted: number;
    emailSent: number;
    portalPublished: boolean;
    audienceLabel: string;
    formattedBroadcast: string;
    unmatchedManualContacts: UnmatchedContact[];
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadAudienceDirectory = async () => {
    try {
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "preview_broadcast_audience" }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && Array.isArray(json.audiences)) {
        setAudiences(json.audiences);
        if (json.oa?.followersSyncedCount) {
          setOaFollowersCount(Math.max(347, Number(json.oa.followersSyncedCount) || 347));
        }
        if (Array.isArray(json.recentBroadcastLogs)) {
          setRecentLogs(json.recentBroadcastLogs);
        }
      }
    } catch {
      // Giữ fallback nội bộ khi offline
    }
  };

  useEffect(() => {
    loadAudienceDirectory();
  }, []);

  useEffect(() => {
    if (!showAudienceMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        audienceDropdownRef.current &&
        !audienceDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAudienceMenu(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showAudienceMenu]);

  const isAllCitizensSelected = selectedAudienceIds.includes("ALL_CITIZENS");
  useEffect(() => {
    if (!portalToggledManually) {
      setPublishToPortalNews(isAllCitizensSelected);
    }
  }, [isAllCitizensSelected, portalToggledManually]);

  const toggleAudienceSelection = (id: string) => {
    setPortalToggledManually(false);
    if (id === "ALL_CITIZENS") {
      setSelectedAudienceIds(["ALL_CITIZENS"]);
      return;
    }
    setSelectedAudienceIds((prev) => {
      const withoutAll = prev.filter((x) => x !== "ALL_CITIZENS");
      if (withoutAll.includes(id)) {
        const next = withoutAll.filter((x) => x !== id);
        return next.length > 0 ? next : ["ALL_CITIZENS"];
      }
      return [...withoutAll, id];
    });
  };

  const selectSingleQuickAudience = (id: string) => {
    setPortalToggledManually(false);
    setSelectedAudienceIds([id]);
  };

  const selectedAudienceObjects = useMemo(
    () => audiences.filter((a) => selectedAudienceIds.includes(a.id)),
    [audiences, selectedAudienceIds]
  );

  const filteredAudiences = useMemo(() => {
    const q = audienceSearch.trim().toLowerCase();
    return audiences.filter((a) => {
      if (audienceTabFilter !== "all" && a.groupType !== audienceTabFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.categoryLabel.toLowerCase().includes(q) ||
        (a.leaderName && a.leaderName.toLowerCase().includes(q))
      );
    });
  }, [audiences, audienceTabFilter, audienceSearch]);

  const upcomingSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.relevanceTier !== "ward_reference" && s.status !== "Đã kết thúc")
        .slice(0, 25),
    [schedules]
  );

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== "Hoàn thành").slice(0, 25),
    [tasks]
  );

  const runAiDraft = async (opts?: {
    mode?: "prompt" | "polish" | "source";
    shortenForZalo?: boolean;
    overrideAudienceIds?: string[];
    overrideSource?: {
      kind: "schedule" | "task";
      title: string;
      date?: string;
      time?: string;
      location?: string;
      description?: string;
      hostOrAssignee?: string;
    };
    overridePrompt?: string;
    overrideTone?: "formal" | "urgent" | "friendly";
  }) => {
    const mode = opts?.mode || "prompt";
    const effectiveAudienceIds = opts?.overrideAudienceIds || selectedAudienceIds;
    const effectiveTone = opts?.overrideTone || aiTone;
    const effectivePrompt = opts?.overridePrompt !== undefined ? opts.overridePrompt : aiPrompt;

    let resolvedSource = opts?.overrideSource || null;
    if (!resolvedSource && selectedSourceRef) {
      const [kind, rawId] = selectedSourceRef.split("::");
      if (kind === "schedule") {
        const sch = schedules.find((s) => s.id === rawId);
        if (sch) {
          resolvedSource = {
            kind: "schedule",
            title: sch.title,
            date: sch.date,
            time: sch.time,
            location: sch.location,
            description: sch.description || sch.content,
            hostOrAssignee: sch.host,
          };
        }
      } else if (kind === "task") {
        const t = tasks.find((x) => x.id === rawId);
        if (t) {
          resolvedSource = {
            kind: "task",
            title: t.title,
            date: t.deadline,
            description: t.description,
            hostOrAssignee: t.assignee?.name,
          };
        }
      }
    }

    if (mode === "polish" && !broadcastContent.trim() && !broadcastTitle.trim()) {
      onNotify?.("Chưa có nội dung trong ô soạn thảo để chuẩn hóa.", "warning");
      return;
    }

    if (mode !== "polish" && !effectivePrompt.trim() && !attachedDoc && !resolvedSource) {
      onNotify?.(
        "Nhập ngắn gọn ý chính, chọn Lịch/Nhiệm vụ hoặc đính kèm công văn trước khi bấm AI Soạn.",
        "warning"
      );
      return;
    }

    try {
      setAiDrafting(true);
      if (broadcastTitle.trim() || broadcastContent.trim()) {
        setPreviousDraftSnapshot({
          title: broadcastTitle,
          content: broadcastContent,
          summary: portalSummary,
          category: newsCategory,
        });
      }

      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "ai_draft_broadcast",
          mode,
          shortenForZalo: Boolean(opts?.shortenForZalo),
          prompt: effectivePrompt,
          tone: effectiveTone,
          targetAudienceIds: effectiveAudienceIds,
          currentTitle: broadcastTitle,
          currentContent: broadcastContent,
          sourceItem: resolvedSource,
          fileBase64: attachedDoc?.base64,
          mimeType: attachedDoc?.mimeType,
          fileName: attachedDoc?.name,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        onNotify?.(
          json?.error || "Trợ lý AI tạm bận, vui lòng thử lại sau ít giây.",
          "warning"
        );
        return;
      }

      setBroadcastTitle(json.title || "");
      setBroadcastContent(json.content || "");
      setPortalSummary(json.portalSummary || "");
      if (json.category && NEWS_CATEGORIES.includes(json.category)) {
        setNewsCategory(json.category);
      }
      if (!portalToggledManually && typeof json.suggestedPublishPortal === "boolean") {
        setPublishToPortalNews(json.suggestedPublishPortal);
      }

      onNotify?.(
        "Đã tạo bản nháp thông báo theo đúng đối tượng chọn. Anh kiểm tra lại trước khi bấm Phát nhé!",
        "success"
      );
    } catch (err: any) {
      onNotify?.(err?.message || "Lỗi kết nối khi gọi AI soạn thông báo.", "warning");
    } finally {
      setAiDrafting(false);
    }
  };

  useEffect(() => {
    if (!seedSource) return;
    const inferredIds = inferTargetAudiencesFromText(
      `${seedSource.title} ${seedSource.unit || ""} ${seedSource.description || ""}`
    );
    setPortalToggledManually(false);
    setSelectedAudienceIds(inferredIds);
    setSelectedSourceRef(`${seedSource.kind}::${seedSource.id}`);
    runAiDraft({
      mode: "source",
      overrideAudienceIds: inferredIds,
      overrideSource: {
        kind: seedSource.kind,
        title: seedSource.title,
        date: seedSource.date,
        time: seedSource.time,
        location: seedSource.location,
        description: seedSource.description,
        hostOrAssignee: seedSource.hostOrAssignee,
      },
      overridePrompt: "",
    });
    onClearSeedSource?.();
  }, [seedSource?.nonce]);

  const handleAttachDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4.2 * 1024 * 1024) {
      onNotify?.("Tệp vượt quá 4.2 MB, vui lòng chọn ảnh hoặc PDF nhẹ hơn.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const kb = Math.max(1, Math.round(file.size / 1024));
      setAttachedDoc({
        name: file.name,
        mimeType:
          file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        base64: dataUrl,
        sizeLabel: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`,
      });
    };
    reader.readAsDataURL(file);
  };

  const hasRawCccdInDraft = useMemo(
    () => /\b\d{12}\b/.test(`${broadcastTitle} ${broadcastContent}`),
    [broadcastTitle, broadcastContent]
  );

  const liveZaloPreviewText = useMemo(() => {
    const titleText = (broadcastTitle.trim() || "TIÊU ĐỀ THÔNG BÁO KHU PHỐ 3").toUpperCase();
    const bodyText =
      broadcastContent.trim() ||
      "Nội dung chi tiết thông báo sẽ hiển thị trực tiếp tại đây khi anh dùng AI soạn nhanh hoặc nhập bên trái.";
    const targetHeader = isAllCitizensSelected
      ? ""
      : `🎯 Đối tượng: ${selectedAudienceObjects.map((g) => g.name).join(" • ")}\n`;
    return `📢 [THÔNG BÁO KHU PHỐ 3 - PHƯỜNG AN PHÚ]\n${targetHeader}${titleText}\n\n${bodyText}\n\n👉 Cổng Cư dân KP3: https://bdhkp3.vercel.app\n👉 Zalo OA chính thức: https://zalo.me/bdhkhupho3`;
  }, [broadcastTitle, broadcastContent, isAllCitizensSelected, selectedAudienceObjects]);

  const handleCopyText = (key: string, value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    onNotify?.(`Đã sao chép ${label}!`, "success");
    window.setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      onNotify?.("Vui lòng nhập Tiêu đề và Nội dung thông báo trước khi phát!", "warning");
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
          portalSummary: portalSummary.trim(),
          category: newsCategory,
          publishToPortalNews,
          targetAudienceIds: selectedAudienceIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        onNotify?.(json?.error || "Không thể phát thông báo lúc này.", "warning");
        return;
      }

      setDispatchResult({
        zaloSent: Number(json.zaloSent) || 0,
        zaloTargeted: Number(json.zaloTargeted) || 0,
        emailSent: Number(json.emailSent) || 0,
        portalPublished: Boolean(json.portalPublished),
        audienceLabel: String(json.audienceLabel || ""),
        formattedBroadcast: String(json.formattedBroadcast || liveZaloPreviewText),
        unmatchedManualContacts: Array.isArray(json.unmatchedManualContacts)
          ? json.unmatchedManualContacts
          : [],
      });

      recordAuditLog({
        actorName: creatorLabel,
        actorRole: "Ban Điều hành Khu phố 3",
        category: "DATA_EXPORT",
        actionTitle: "Phát Thông báo Chính thức (Zalo OA & Cổng Cư dân)",
        targetSummary: `${broadcastTitle.trim()} -> ${
          isAllCitizensSelected
            ? "Toàn thể Người dân KP3"
            : selectedAudienceObjects.map((g) => g.name).join(", ")
        }`,
      });

      onNotify?.(
        `Đã phát thông báo "${broadcastTitle.trim()}" tới ${
          json.zaloSent || 0
        } tài khoản Zalo OA${json.portalPublished ? " và ghim lên Cổng Cư dân!" : "!"}`,
        "success"
      );

      setBroadcastTitle("");
      setBroadcastContent("");
      setPortalSummary("");
      setPreviousDraftSnapshot(null);
      await loadAudienceDirectory();
    } catch (err: any) {
      onNotify?.(err?.message || "Lỗi kết nối khi phát thông báo.", "warning");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const renderGroupIcon = (type: AudienceOptionItem["groupType"]) => {
    if (type === "all_citizens") return <Globe size={13} className="text-emerald-700 shrink-0" />;
    if (type === "party_gov") return <Flag size={13} className="text-rose-700 shrink-0" />;
    if (type === "welfare") return <HeartHandshake size={13} className="text-amber-700 shrink-0" />;
    if (type === "hostel_owners") return <Building2 size={13} className="text-blue-700 shrink-0" />;
    return <Users size={13} className="text-indigo-700 shrink-0" />;
  };

  const charPct = Math.min(100, Math.round((liveZaloPreviewText.length / 1980) * 100));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (7/12): BÀN SOẠN THẢO HỢP NHẤT - GỌN, THOÁNG, KHÔNG RỐI */}
        <form
          onSubmit={handleSendBroadcast}
          className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-2xs divide-y divide-slate-100"
        >
          {/* 1. Dòng tiêu đề + Chọn đối tượng nhận tin gọn như trình soạn thư */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={17} className="text-emerald-700 shrink-0" />
                <span>Soạn &amp; Phát Thông Báo Khu Phố 3</span>
              </h3>
              <a
                href="https://oa.nhatkyzalo.vn/manage/content/article/"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
              >
                <span>Broadcast OA</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Thanh "Gửi đến:" + Popover chọn đa nhóm */}
            <div className="relative" ref={audienceDropdownRef}>
              <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 mr-1">Gửi đến:</span>

                {selectedAudienceObjects.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-xs font-bold text-slate-900 shadow-2xs"
                  >
                    {renderGroupIcon(g.groupType)}
                    <span>{g.name}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      ({g.id === "ALL_CITIZENS" ? `${oaFollowersCount}+` : g.totalMembers})
                    </span>
                    {selectedAudienceObjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleAudienceSelection(g.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label={`Bỏ chọn ${g.name}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}

                <button
                  type="button"
                  onClick={() => setShowAudienceMenu((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80 text-xs font-semibold cursor-pointer transition-colors ml-auto"
                >
                  <Plus size={13} />
                  <span>Chọn nhóm / Chi hội</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${showAudienceMenu ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {/* Phím tắt chọn nhanh 1 chạm cho 5 đối tượng hay gửi nhất */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-0.5">Chọn nhanh:</span>
                {QUICK_AUDIENCE_SHORTCUTS.map((sc) => {
                  const active =
                    selectedAudienceIds.length === 1 && selectedAudienceIds[0] === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => selectSingleQuickAudience(sc.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {sc.label}
                    </button>
                  );
                })}
              </div>

              {/* Menu thả xuống chọn chi tiết 25 nhóm Đảng, Đoàn thể, Hộ nghèo */}
              {showAudienceMenu && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {[
                        { id: "all", label: "Tất cả" },
                        { id: "party_gov", label: "Đảng & Chính quyền" },
                        { id: "mass_org", label: "Chi hội Đoàn thể" },
                        { id: "welfare", label: "Hộ nghèo & Chính sách" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAudienceTabFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                            audienceTabFilter === tab.id
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative sm:w-52 shrink-0">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="search"
                        value={audienceSearch}
                        onChange={(e) => setAudienceSearch(e.target.value)}
                        placeholder="Tìm tên nhóm..."
                        className="w-full h-8 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                    {filteredAudiences.map((aud) => {
                      const checked = selectedAudienceIds.includes(aud.id);
                      return (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => toggleAudienceSelection(aud.id)}
                          className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            checked
                              ? "bg-blue-50/90 border-blue-500 text-slate-900"
                              : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {renderGroupIcon(aud.groupType)}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{aud.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {aud.id === "ALL_CITIZENS"
                                  ? `${oaFollowersCount}+ người quan tâm OA`
                                  : `${aud.totalMembers} người${
                                      aud.zaloLinkedCount > 0
                                        ? ` • ${aud.zaloLinkedCount} khớp Zalo`
                                        : ""
                                    }`}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              checked
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {checked && <Check size={11} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Có thể chọn nhiều Chi hội / Nhóm đối tượng cùng lúc
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAudienceMenu(false)}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white font-semibold cursor-pointer"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Thanh Trợ lý AI gọn tinh tế trên 1 dải mềm */}
          <div className="p-4 sm:p-5 bg-slate-50/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Sparkles
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 pointer-events-none"
                />
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runAiDraft({ mode: "prompt" });
                    }
                  }}
                  placeholder="Nhập ý chính để AI viết thông báo (VD: 8h sáng CN họp CCB tại Văn phòng KP3)..."
                  className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={aiDrafting}
                onClick={() => runAiDraft({ mode: "prompt" })}
                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors disabled:opacity-50"
              >
                {aiDrafting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang soạn...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>AI Soạn nháp</span>
                  </>
                )}
              </button>
            </div>

            {/* Hàng công cụ phụ trợ siêu gọn: Lấy từ Lịch/Việc • Tải công văn • Mẫu nhanh • Giọng văn */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Chọn từ Lịch / Nhiệm vụ */}
              <div className="relative inline-flex items-center">
                <Calendar
                  size={12}
                  className="absolute left-2.5 text-slate-500 pointer-events-none"
                />
                <select
                  aria-label="Lấy từ Lịch công tác hoặc Nhiệm vụ"
                  value={selectedSourceRef}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSourceRef(val);
                    if (!val) return;
                    const [kind, rawId] = val.split("::");
                    const item =
                      kind === "schedule"
                        ? schedules.find((s) => s.id === rawId)
                        : tasks.find((t) => t.id === rawId);
                    if (item) {
                      const inferred = inferTargetAudiencesFromText(
                        `${item.title} ${(item as any).unit || ""} ${(item as any).description || ""}`
                      );
                      setPortalToggledManually(false);
                      setSelectedAudienceIds(inferred);
                      runAiDraft({
                        mode: "source",
                        overrideAudienceIds: inferred,
                        overrideSource:
                          kind === "schedule"
                            ? {
                                kind: "schedule",
                                title: (item as ScheduleEvent).title,
                                date: (item as ScheduleEvent).date,
                                time: (item as ScheduleEvent).time,
                                location: (item as ScheduleEvent).location,
                                description:
                                  (item as ScheduleEvent).description ||
                                  (item as ScheduleEvent).content,
                                hostOrAssignee: (item as ScheduleEvent).host,
                              }
                            : {
                                kind: "task",
                                title: (item as TaskItem).title,
                                date: (item as TaskItem).deadline,
                                description: (item as TaskItem).description,
                                hostOrAssignee: (item as TaskItem).assignee?.name,
                              },
                      });
                    }
                  }}
                  className="h-8 pl-7 pr-6 max-w-[210px] rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer truncate"
                >
                  <option value="">Lấy từ Lịch / Nhiệm vụ...</option>
                  {upcomingSchedules.length > 0 && (
                    <optgroup label="Lịch công tác sắp tới">
                      {upcomingSchedules.map((s) => (
                        <option key={s.id} value={`schedule::${s.id}`}>
                          {s.date} ({s.time}) - {s.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {activeTasks.length > 0 && (
                    <optgroup label="Nhiệm vụ đang mở">
                      {activeTasks.map((t) => (
                        <option key={t.id} value={`task::${t.id}`}>
                          Hạn {t.deadline} - {t.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Chọn mẫu tình huống gọn */}
              <select
                aria-label="Chọn mẫu thông báo nhanh"
                value=""
                onChange={(e) => {
                  const preset = QUICK_SCENARIO_PRESETS.find((p) => p.id === e.target.value);
                  if (!preset) return;
                  setAiPrompt(preset.prompt);
                  setAiTone(preset.tone);
                  const nextAud = preset.suggestedAudiences || selectedAudienceIds;
                  if (preset.suggestedAudiences) {
                    setPortalToggledManually(false);
                    setSelectedAudienceIds(preset.suggestedAudiences);
                  }
                  runAiDraft({
                    mode: "prompt",
                    overridePrompt: preset.prompt,
                    overrideTone: preset.tone,
                    overrideAudienceIds: nextAud,
                  });
                }}
                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">Mẫu tình huống...</option>
                {QUICK_SCENARIO_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              {/* Đính kèm Ảnh / PDF Công văn */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleAttachDocument}
                className="hidden"
              />
              {attachedDoc ? (
                <span className="h-8 px-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium inline-flex items-center gap-1.5 max-w-[200px]">
                  <span className="truncate">{attachedDoc.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedDoc(null)}
                    className="text-slate-500 hover:text-rose-700 cursor-pointer shrink-0"
                    aria-label="Gỡ tệp đính kèm"
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileUp size={12} className="text-slate-500" />
                  <span>Từ Ảnh / PDF công văn</span>
                </button>
              )}

              {/* Chọn giọng văn */}
              <select
                aria-label="Chọn giọng văn"
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer ml-auto"
              >
                <option value="formal">Giọng: Trang trọng</option>
                <option value="urgent">Giọng: Khẩn cấp</option>
                <option value="friendly">Giọng: Gần gũi</option>
              </select>
            </div>
          </div>

          {/* 3. Vùng biên tập Tiêu đề & Nội dung chính thức */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {hasRawCccdInDraft && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-950">
                <ShieldAlert size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Phát hiện dãy 12 chữ số giống CCCD trong bản nháp. Vui lòng lược bỏ thông tin cá nhân trước khi phát rộng rãi.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Tiêu đề thông báo
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full h-9 px-3 bg-white border border-slate-200 focus:border-emerald-600 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Chuyên mục tin
                </label>
                <select
                  value={newsCategory}
                  onChange={(e) => setNewsCategory(e.target.value as LocalNews["category"])}
                  className="w-full h-9 px-3 bg-white border border-slate-200 focus:border-emerald-600 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  {NEWS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  Nội dung chi tiết
                </label>

                {(broadcastContent.trim() || previousDraftSnapshot) && (
                  <div className="flex items-center gap-2 text-xs">
                    {broadcastContent.trim() && (
                      <>
                        <button
                          type="button"
                          disabled={aiDrafting}
                          onClick={() => runAiDraft({ mode: "polish", shortenForZalo: false })}
                          className="text-indigo-700 hover:text-indigo-900 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Wand2 size={12} />
                          <span>Chuốt câu chữ</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          disabled={aiDrafting}
                          onClick={() => runAiDraft({ mode: "polish", shortenForZalo: true })}
                          className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Rút gọn Zalo
                        </button>
                      </>
                    )}
                    {previousDraftSnapshot && (
                      <>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBroadcastTitle(previousDraftSnapshot.title);
                            setBroadcastContent(previousDraftSnapshot.content);
                            setPortalSummary(previousDraftSnapshot.summary);
                            setNewsCategory(previousDraftSnapshot.category);
                            setPreviousDraftSnapshot(null);
                          }}
                          className="text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          <span>Hoàn tác</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <textarea
                rows={7}
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="Thời gian, địa điểm, nội dung phối hợp và đầu mối liên hệ..."
                className="w-full p-3 bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs leading-relaxed text-slate-900 focus:outline-none"
              />
            </div>

            {publishToPortalNews && (
              <div>
                {!showSummaryInput ? (
                  <button
                    type="button"
                    onClick={() => setShowSummaryInput(true)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    + Tùy chỉnh câu tóm tắt hiển thị trên Cổng Cư dân (mặc định AI tự tạo)
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600">
                        Tóm tắt ngắn trên thẻ tin Cổng Cư dân
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSummaryInput(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Thu gọn
                      </button>
                    </div>
                    <input
                      type="text"
                      value={portalSummary}
                      onChange={(e) => setPortalSummary(e.target.value)}
                      placeholder="Tóm tắt 1-2 câu..."
                      className="w-full h-9 px-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Thanh tác vụ chân trang chuẩn mực */}
          <div className="p-4 sm:px-5 bg-slate-50/50 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publishToPortalNews}
                onChange={(e) => {
                  setPortalToggledManually(true);
                  setPublishToPortalNews(e.target.checked);
                }}
                className="w-4 h-4 accent-emerald-700 rounded"
              />
              <span>
                Đăng &amp; ghim lên Cổng Cư dân{" "}
                {!isAllCitizensSelected && !publishToPortalNews && (
                  <span className="text-slate-400">(đang tắt cho tin nội bộ)</span>
                )}
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleCopyText("draft-zalo", liveZaloPreviewText, "bản tin Zalo")
                }
                disabled={!broadcastTitle.trim() && !broadcastContent.trim()}
                className="h-10 px-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {copiedKey === "draft-zalo" ? <Check size={14} /> : <Copy size={14} />}
                <span>Sao chép</span>
              </button>

              <button
                type="submit"
                disabled={sendingBroadcast}
                className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {sendingBroadcast ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang phát...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>
                      {isAllCitizensSelected
                        ? "Phát Thông Báo"
                        : `Phát tới ${selectedAudienceObjects.length} nhóm`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* CỘT PHẢI (5/12): KHUNG XEM TRƯỚC TIN NHẮN ZALO OA TRỰC QUAN & NHẬT KÝ GỌN */}
        <div className="xl:col-span-5 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            {/* Thanh đầu kênh Zalo OA mô phỏng thực tế */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <MessageCircle size={15} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                    <span>Ban Điều Hành Khu Phố 3</span>
                    <ShieldCheck size={13} className="text-amber-500 shrink-0" />
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {isAllCitizensSelected
                      ? `Gửi ${oaFollowersCount}+ người dân quan tâm OA`
                      : `Gửi chọn lọc: ${selectedAudienceObjects.map((g) => g.name).join(", ")}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Nền khung chat Zalo xanh xám dịu mắt */}
            <div className="p-4 bg-[#eef3f9] min-h-[280px] max-h-[380px] overflow-y-auto">
              <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-xs border border-slate-200/60">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                  {liveZaloPreviewText}
                </pre>
              </div>
            </div>

            {/* Chân khung đo độ dài ký tự */}
            <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      liveZaloPreviewText.length > 1950
                        ? "bg-rose-600"
                        : liveZaloPreviewText.length > 1600
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${charPct}%` }}
                  />
                </div>
                <span className="text-slate-500 font-mono">
                  {liveZaloPreviewText.length}/1.980 ký tự
                </span>
              </div>
              <span className="text-slate-600 font-medium">
                {publishToPortalNews ? `Ghim mục: ${newsCategory}` : "Chỉ gửi Zalo"}
              </span>
            </div>
          </div>

          {/* Kết quả vừa phát (chỉ hiện sau khi gửi) */}
          {dispatchResult && (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950">
                      Đã phát tới: {dispatchResult.audienceLabel}
                    </p>
                    <p className="text-emerald-800 mt-0.5">
                      Zalo OA: <strong>{dispatchResult.zaloSent}</strong> người
                      {dispatchResult.portalPublished ? " • Đã ghim Cổng Cư dân" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText("sent-bc", dispatchResult.formattedBroadcast, "bản tin vừa phát")
                  }
                  className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-semibold cursor-pointer shrink-0"
                >
                  Sao chép
                </button>
              </div>

              {dispatchResult.unmatchedManualContacts.length > 0 && (
                <div className="bg-white border border-emerald-200/80 rounded-xl p-2.5 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <AlertTriangle size={12} className="text-amber-600" />
                    <span>
                      {dispatchResult.unmatchedManualContacts.length} thành viên chưa nhấn Quan tâm OA:
                    </span>
                  </p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {dispatchResult.unmatchedManualContacts.map((m, idx) => {
                      const chatUrl = toZaloChatUrl(m.phone);
                      return (
                        <div
                          key={`${m.fullName}-${idx}`}
                          className="px-2 py-1.5 rounded-lg bg-slate-50 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="font-medium text-slate-800 truncate">
                            {m.fullName} {m.phone ? `(${m.phone})` : ""}
                          </span>
                          {chatUrl && (
                            <a
                              href={chatUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 hover:underline font-semibold shrink-0"
                            >
                              Nhắn Zalo
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ngăn thu gọn: Nhật ký đã phát gần đây (Mặc định đóng gọn để không rối mắt) */}
          {recentLogs.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistoryLogs((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <History size={14} className="text-slate-500" />
                  <span>Nhật ký đã phát gần đây ({recentLogs.length})</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${
                    showHistoryLogs ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showHistoryLogs && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 max-h-56 overflow-y-auto">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="px-4 py-2.5 text-xs space-y-0.5">
                      <p className="font-semibold text-slate-900 truncate">{log.subject}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {log.recipientName} • {new Date(log.timestamp).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
