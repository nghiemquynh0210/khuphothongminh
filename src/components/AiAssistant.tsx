import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  HelpCircle,
  ImagePlus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { KP3_OFFICIAL_BASELINE, Kp3AssistantContext, generateKp3AssistantReply } from "../utils/kp3Utils";
import { extractBirthYear, getTemporaryResidenceExpiryStatus } from "../utils/householdRecognitionUtils";
import { compressImageToDataUrl, validateImageFile } from "../utils/imageUpload";
import { formatVNNumber } from "../utils/numberFormat";
import { PageHeader } from "./common/PageHeader";
import { Button, ConfirmModal, InlineNotice } from "./ui";

const EMPTY_KP3_CONTEXT: Kp3AssistantContext = {
  residents: [],
  households: [],
  businesses: [],
  reports: [],
  welfareRecipients: [],
  fundContributions: [],
  fundExpenditures: [],
  communityEvents: [],
  tasks: [],
};

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "gemini" | "kp3-local";
  imageUrl?: string;
}

export interface AiAssistantProps {
  context?: Kp3AssistantContext;
  currentUser?: {
    fullName?: string;
    role?: "canbo" | "nguoidan";
  } | null;
}

const CANBO_PROMPTS = [
  "Tình hình tạm trú sắp hết hạn và công việc ưu tiên tuần này?",
  "Thống kê quỹ khu phố và tình hình thu chi tại KP3 hiện nay?",
  "Quy trình tiếp nhận phản ánh 1022 và giao việc cho Tổ trưởng?",
  "Tổng hợp nhân khẩu thường trú, tạm trú và hộ gia đình KP3?",
];

const CITIZEN_PROMPTS = [
  "Thủ tục đăng ký tạm trú tại Khu phố 3 cần giấy tờ gì?",
  "Ai là Bí thư Chi bộ / Trưởng ban Điều hành và số điện thoại liên hệ?",
  "Làm thế nào gửi phản ánh rác thải, ngập úng hoặc đóng quỹ VietQR?",
  "Lịch hỗ trợ kích hoạt định danh điện tử VNeID mức 2 ở đâu?",
];

export default function AiAssistant({ context, currentUser }: AiAssistantProps = {}) {
  const defaultMode: "canbo" | "cudan" = currentUser?.role === "canbo" ? "canbo" : "cudan";
  const [assistantMode, setAssistantMode] = useState<"canbo" | "cudan">(defaultMode);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là **Trợ lý Số Khu phố 3 (Phường An Phú)**. Tôi có thể hỗ trợ tra cứu nhanh số liệu điều hành toàn địa bàn Khu phố 3, thủ tục cư trú, phản ánh 1022, tình hình Quỹ khu phố hoặc thông tin Ban điều hành. Anh/chị cần tra cứu nội dung gì hôm nay?",
      source: "kp3-local",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [offlineFallbackUsed, setOfflineFallbackUsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeContext = context ?? EMPTY_KP3_CONTEXT;

  const liveMetrics = useMemo(() => {
    const resList = safeContext.residents || [];
    const hhList = safeContext.households || [];
    const bizList = safeContext.businesses || [];
    const repList = safeContext.reports || [];
    const taskList = safeContext.tasks || [];
    const contribList = safeContext.fundContributions || [];
    const expList = safeContext.fundExpenditures || [];

    const hasFullResidents = resList.length > 0;
    const currentYear = new Date().getFullYear();

    let permanentCount = 2076;
    let temporaryCount = 9556;
    let elderlyCount = 438;
    let expiringTempCount = 245;
    let expiredTempCount = 533;

    if (hasFullResidents) {
      permanentCount = 0;
      temporaryCount = 0;
      elderlyCount = 0;
      expiringTempCount = 0;
      expiredTempCount = 0;

      for (let i = 0; i < resList.length; i++) {
        const r = resList[i];
        if (r.status === "Thường trú") permanentCount++;
        else if (r.status === "Tạm trú") temporaryCount++;

        const by = extractBirthYear(r.birthDate);
        if (by > 1900 && currentYear - by >= 60) {
          elderlyCount++;
        }

        if (r.status === "Tạm trú" && r.temporaryExpDate) {
          const exp = getTemporaryResidenceExpiryStatus(r.temporaryExpDate);
          if (exp.isWarning) expiringTempCount++;
          else if (exp.isExpired) expiredTempCount++;
        }
      }
    }

    const residentsCount =
      resList.length >= 100
        ? resList.length
        : hasFullResidents
          ? Math.max(resList.length, KP3_OFFICIAL_BASELINE.population)
          : KP3_OFFICIAL_BASELINE.population;
    const householdsCount =
      hhList.length > 0 ? hhList.length : KP3_OFFICIAL_BASELINE.households;
    const businessesCount =
      bizList.length > 0 ? bizList.length : KP3_OFFICIAL_BASELINE.activeBusinessesTotal;
    const hostelsCount =
      bizList.length > 0 ? bizList.filter((b) => b.isAccommodation).length : 108;

    const openReports = repList.filter((r) => r.status !== "Đã giải quyết");
    const openTasks = taskList.filter((t) => t.status !== "Hoàn thành");

    const totalCollected = contribList
      .filter((c) => c.status === "Đã nộp" || !c.status)
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalSpent = expList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netBalance = totalCollected - totalSpent;
    const fundBalanceText =
      contribList.length > 0 || expList.length > 0
        ? `Tổng thu đã nộp: ${formatVNNumber(totalCollected)} đ | Tổng chi: ${formatVNNumber(
            totalSpent
          )} đ | Tồn quỹ hiện tại: ${formatVNNumber(netBalance)} đ`
        : "";

    const openReportTitles = openReports
      .slice(0, 8)
      .map((r) => `[${r.id}] ${r.title} (${r.status})`);
    const openTaskTitles = openTasks
      .slice(0, 8)
      .map((t) => `${t.title} (${t.status} - Hạn: ${t.deadline})`);

    return {
      residentsCount,
      householdsCount,
      permanentCount,
      temporaryCount,
      elderlyCount,
      expiringTempCount,
      expiredTempCount,
      businessesCount,
      hostelsCount,
      pendingReportsCount: openReports.length,
      openTasksCount: openTasks.length,
      fundBalanceText,
      openReportTitles,
      openTaskTitles,
    };
  }, [safeContext]);

  const pendingReportsCount = liveMetrics.pendingReportsCount;
  const openTasksCount = liveMetrics.openTasksCount;
  const sampleQuestions = assistantMode === "canbo" ? CANBO_PROMPTS : CITIZEN_PROMPTS;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSelectImage = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const validationErr = validateImageFile(file);
    if (validationErr) {
      setImageError(validationErr);
      return;
    }
    setImageError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.82,
      });
      const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || "image/jpeg";
      setAttachedImage({
        dataUrl,
        mimeType,
        name: file.name,
      });
    } catch {
      setImageError("Không thể nén ảnh đính kèm. Vui lòng chọn tệp ảnh khác.");
    }
  };

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    const currentAttachment = attachedImage;
    if ((!trimmed && !currentAttachment) || isLoading) return;

    const effectivePrompt =
      trimmed ||
      "Hãy phân tích chi tiết nội dung hình ảnh đính kèm này và hướng dẫn xử lý theo quy định tại Khu phố 3.";

    const userMsg: Message = {
      role: "user",
      content: effectivePrompt,
      imageUrl: currentAttachment?.dataUrl,
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setAttachedImage(null);
    setImageError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: assistantMode,
          imageBase64: currentAttachment?.dataUrl,
          imageMimeType: currentAttachment?.mimeType,
          context: {
            residentsCount: liveMetrics.residentsCount,
            householdsCount: liveMetrics.householdsCount,
            permanentCount: liveMetrics.permanentCount,
            temporaryCount: liveMetrics.temporaryCount,
            elderlyCount: liveMetrics.elderlyCount,
            expiringTempCount: liveMetrics.expiringTempCount,
            expiredTempCount: liveMetrics.expiredTempCount,
            businessesCount: liveMetrics.businessesCount,
            hostelsCount: liveMetrics.hostelsCount,
            pendingReportsCount: liveMetrics.pendingReportsCount,
            openTasksCount: liveMetrics.openTasksCount,
            fundBalanceText: liveMetrics.fundBalanceText,
            openReportTitles: liveMetrics.openReportTitles,
            openTaskTitles: liveMetrics.openTaskTitles,
            leadership: safeContext.leadership,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Offline or API unavailable");
      }

      const data = await response.json();
      if (!data?.content) {
        throw new Error("Empty response");
      }
      setOfflineFallbackUsed(false);
      setMessages([...updatedMessages, { role: "assistant", content: data.content, source: "gemini" }]);
    } catch {
      const fallbackReply = generateKp3AssistantReply(effectivePrompt, safeContext, assistantMode);
      setOfflineFallbackUsed(true);
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: fallbackReply, source: "kp3-local" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (text: string, isUserBubble: boolean) => {
    return text.split("\n").map((line, idx) => {
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong
            key={match.index}
            className={isUserBubble ? "text-white font-bold" : "text-slate-950 font-bold"}
          >
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const renderedLine = parts.length > 0 ? parts : line;

      if (/^\d+\./.test(line.trim())) {
        return (
          <div key={idx} className="pl-3 py-0.5 text-sm leading-relaxed">
            {renderedLine}
          </div>
        );
      }
      if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
        return (
          <div key={idx} className="flex gap-2 pl-4 py-0.5 text-sm leading-relaxed">
            <span className="text-emerald-700 font-bold" aria-hidden="true">
              •
            </span>
            <span>{renderedLine}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="py-0.5 leading-relaxed text-sm">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div id="ai-assistant-view" className="space-y-5">
      <PageHeader
        badgeIcon={<Sparkles size={14} className="text-emerald-700" />}
        badgeText="TRỢ LÝ ĐIỀU HÀNH & TRA CỨU • KHU PHỐ 3"
        badgeSubtext="CSDL THỰC TẾ"
        title="Trợ Lý Ảo Khu Phố 3"
        actions={
          <div
            role="radiogroup"
            aria-label="Chế độ trả lời của Trợ lý"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={assistantMode === "canbo"}
              onClick={() => setAssistantMode("canbo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                assistantMode === "canbo"
                  ? "bg-white text-emerald-900 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Nghiệp vụ Cán bộ</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={assistantMode === "cudan"}
              onClick={() => setAssistantMode("cudan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                assistantMode === "cudan"
                  ? "bg-white text-emerald-900 border border-slate-200"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Users size={14} aria-hidden="true" />
              <span>Hỏi đáp Cư dân</span>
            </button>
          </div>
        }
      />

      {offlineFallbackUsed && (
        <InlineNotice
          type="info"
          message="Đang trả lời từ kho tri thức & CSDL KP3 trực tiếp trên trình duyệt (máy chủ /api/chat không kết nối)."
          onDismiss={() => setOfflineFallbackUsed(false)}
        />
      )}

      {/* Live Context Strip (2x2 on Mobile) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500">Quy mô KP3</div>
          <div className="text-sm sm:text-lg font-bold text-slate-900">
            {formatVNNumber(liveMetrics.householdsCount)} hộ gia đình
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500">Dân số quản lý</div>
          <div className="text-sm sm:text-lg font-bold text-slate-900">
            {formatVNNumber(liveMetrics.residentsCount)} nhân khẩu
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500">Phản ánh chờ xử lý</div>
          <div className="text-sm sm:text-lg font-bold text-rose-700">
            {formatVNNumber(pendingReportsCount)} hồ sơ
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500">Nhiệm vụ đang mở</div>
          <div className="text-sm sm:text-lg font-bold text-indigo-800">
            {formatVNNumber(openTasksCount)} đầu việc
          </div>
        </div>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section
          aria-label="Hội thoại Trợ lý Khu phố 3"
          className="xl:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[540px] sm:h-[560px] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Bot size={18} aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 block leading-tight">
                  Trợ lý Số Khu phố 3
                </span>
                <span className="text-xs text-slate-600">
                  {assistantMode === "canbo" ? "Chế độ Điều hành Cán bộ KP3" : "Chế độ Hướng dẫn Cư dân"}
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setShowClearConfirm(true)}
            >
              Làm mới hội thoại
            </Button>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-white"
            aria-live="polite"
          >
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[88%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center self-end border ${
                      isUser
                        ? "bg-emerald-700 border-emerald-700 text-white"
                        : "bg-slate-100 border-slate-200 text-emerald-800"
                    }`}
                  >
                    {isUser ? <User size={14} aria-hidden="true" /> : <Bot size={14} aria-hidden="true" />}
                  </div>

                  <div
                    className={`px-4 py-3 rounded-xl border text-sm leading-relaxed ${
                      isUser
                        ? "bg-emerald-700 border-emerald-700 text-white rounded-br-xs"
                        : "bg-slate-50 border-slate-200 text-slate-900 rounded-bl-xs"
                    }`}
                  >
                    {isUser ? (
                      <div className="space-y-2">
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt="Ảnh đính kèm hội thoại"
                            className="max-h-40 rounded-lg border border-white/25 object-cover"
                          />
                        )}
                        <p className="text-sm">{m.content}</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {renderFormattedText(m.content, false)}
                        {m.source && (
                          <div className="pt-2 mt-2 border-t border-slate-200/80 text-xs text-slate-600">
                            Nguồn: {m.source === "gemini" ? "Gemini AI" : "CSDL Khu phố 3"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-end">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-emerald-800 flex items-center justify-center">
                  <Bot size={14} aria-hidden="true" />
                </div>
                <div className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
                  Đang tra cứu thông tin Khu phố 3...
                </div>
              </div>
            )}
          </div>

          {/* Form Input */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
            {attachedImage && (
              <div className="inline-flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs max-w-full">
                <img
                  src={attachedImage.dataUrl}
                  alt={attachedImage.name}
                  className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-[260px]">
                    {attachedImage.name}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Đã nén tối ưu • Sẵn sàng phân tích AI
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  aria-label="Gỡ ảnh đính kèm"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {imageError && (
              <p role="alert" className="text-xs text-rose-700 font-medium">
                {imageError}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Chọn ảnh văn bản hoặc hiện trường gửi Trợ lý AI"
                onChange={(e) => {
                  void handleSelectImage(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                aria-label="Đính kèm hình ảnh gửi Trợ lý AI"
                title="Đính kèm ảnh văn bản / ảnh hiện trường để Gemini phân tích"
                className={`h-11 w-11 md:h-10 md:w-10 shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                  attachedImage
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "bg-white border-slate-300 text-slate-600 hover:border-emerald-600 hover:text-emerald-700"
                }`}
              >
                <ImagePlus size={18} aria-hidden="true" />
              </button>

              <label htmlFor="ai-assistant-question-input" className="sr-only">
                Nhập câu hỏi gửi Trợ lý Khu phố 3
              </label>
              <input
                id="ai-assistant-question-input"
                name="aiQuestion"
                type="text"
                placeholder="Nhập câu hỏi hoặc đính kèm ảnh văn bản/hiện trường..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing) {
                    e.preventDefault();
                  }
                }}
                disabled={isLoading}
                className="flex-1 min-w-0 h-11 md:h-10 bg-white border border-slate-300 text-slate-900 text-sm px-3.5 rounded-lg placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />
              <Button
                type="submit"
                variant="emerald"
                size="form"
                disabled={isLoading || (!input.trim() && !attachedImage)}
                leftIcon={<Send size={16} />}
              >
                Gửi
              </Button>
            </form>
          </div>
        </section>

        {/* Right FAQ Panel */}
        <aside className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <HelpCircle size={16} className="text-emerald-700" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Câu hỏi gợi ý
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {sampleQuestions.map((q, i) => (
                <button
                  key={q}
                  id={`faq-${i}`}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-emerald-600 transition-colors text-xs font-semibold text-slate-800 leading-relaxed cursor-pointer disabled:opacity-60"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-amber-950">
            <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold block">Đồng bộ dữ liệu KP3</span>
              <span>
                Câu trả lời tham chiếu trực tiếp số liệu nhân khẩu, phản ánh 1022, nhiệm vụ và Quỹ khu phố hiện hành.
              </span>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setMessages([
            {
              role: "assistant",
              content: "Hội thoại đã được làm mới. Anh/chị cần tra cứu thêm nội dung gì về Khu phố 3?",
              source: "kp3-local",
            },
          ]);
          setShowClearConfirm(false);
        }}
        title="Làm mới lịch sử trò chuyện"
        description="Bạn có muốn xóa các tin nhắn hiện tại để bắt đầu phiên hỏi đáp mới?"
        confirmLabel="Làm mới"
        variant="primary"
      />
    </div>
  );
}
