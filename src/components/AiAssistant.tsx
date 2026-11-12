import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  HelpCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { KP3_OFFICIAL_BASELINE, Kp3AssistantContext, generateKp3AssistantReply } from "../utils/kp3Utils";
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
  const [isLoading, setIsLoading] = useState(false);
  const [offlineFallbackUsed, setOfflineFallbackUsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const safeContext = context ?? EMPTY_KP3_CONTEXT;
  const pendingReportsCount = safeContext.reports.filter((r) => r.status !== "Đã giải quyết").length;
  const openTasksCount = safeContext.tasks.filter((t) => t.status !== "Hoàn thành").length;
  const sampleQuestions = assistantMode === "canbo" ? CANBO_PROMPTS : CITIZEN_PROMPTS;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: assistantMode,
          context: {
            residentsCount: KP3_OFFICIAL_BASELINE.population,
            householdsCount: KP3_OFFICIAL_BASELINE.households,
            pendingReportsCount,
            openTasksCount,
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
      const fallbackReply = generateKp3AssistantReply(trimmed, safeContext, assistantMode);
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

      {/* Live Context Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-slate-600">Quy mô KP3</div>
          <div className="text-lg font-bold text-slate-900">
            {formatVNNumber(KP3_OFFICIAL_BASELINE.households)} hộ gia đình
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-slate-600">Dân số định mức</div>
          <div className="text-lg font-bold text-slate-900">
            {formatVNNumber(KP3_OFFICIAL_BASELINE.population)} nhân khẩu
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-slate-600">Phản ánh chờ xử lý</div>
          <div className="text-lg font-bold text-rose-700">
            {formatVNNumber(pendingReportsCount)} hồ sơ
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-slate-600">Nhiệm vụ đang mở</div>
          <div className="text-lg font-bold text-indigo-800">
            {formatVNNumber(openTasksCount)} đầu việc
          </div>
        </div>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <section
          aria-label="Hội thoại Trợ lý Khu phố 3"
          className="lg:col-span-3 bg-white border border-slate-200 rounded-xl flex flex-col h-[520px] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
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
                      <p className="text-sm">{m.content}</p>
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
          <div className="p-3.5 bg-slate-50 border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="ai-assistant-question-input" className="sr-only">
                Nhập câu hỏi gửi Trợ lý Khu phố 3
              </label>
              <input
                id="ai-assistant-question-input"
                name="aiQuestion"
                type="text"
                placeholder="Nhập câu hỏi (ví dụ: Tạm trú sắp hết hạn, số dư Quỹ, tuyến hẻm KP3)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing) {
                    e.preventDefault();
                  }
                }}
                disabled={isLoading}
                className="flex-1 h-11 md:h-10 bg-white border border-slate-300 text-slate-900 text-sm px-3.5 rounded-lg placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />
              <Button
                type="submit"
                variant="emerald"
                size="form"
                disabled={isLoading || !input.trim()}
                leftIcon={<Send size={16} />}
              >
                Gửi
              </Button>
            </form>
          </div>
        </section>

        {/* Right FAQ Panel */}
        <aside className="lg:col-span-1 space-y-4">
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
