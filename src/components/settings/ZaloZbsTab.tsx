import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { getStaffAuthHeaders } from "../../utils/imageUpload";

interface ZaloZbsTemplateSummary {
  templateId: string;
  templateName: string;
  status: string;
  templateQuality?: string;
}

interface ZaloZbsConfig {
  enabled: boolean;
  mode: "development" | "production";
  preferFreeOaFirst: boolean;
  unitPriceVnd: number;
  templates: {
    tempResidenceReminder: string;
    nvqsNotice: string;
    report1022Result: string;
    generalCivicNotice: string;
  };
  syncedTemplates?: ZaloZbsTemplateSummary[];
  updatedAt?: string;
  updatedBy?: string;
}

interface ZaloZbsLogItem {
  id: string;
  timestamp: string;
  tier: "tier1_oa_free" | "tier2_zbs_dev" | "tier2_zbs_prod";
  recipientName: string;
  phone: string;
  templateId?: string;
  templateKey?: string;
  status: "sent" | "failed";
  msgId?: string;
  estimatedCostVnd: number;
  detail: string;
  actorName: string;
}

interface ZaloZbsTabProps {
  onNotify?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const TEMPLATE_PRESETS = [
  {
    key: "tempResidenceReminder" as const,
    label: "Mẫu 1: Nhắc gia hạn tạm trú (30 ngày)",
    desc: "Gửi cư dân tạm trú sắp hết hạn & 230 chủ nhà trọ",
    sampleContent:
      "Kính chào {{resident_name}}, hồ sơ tạm trú tại {{address}} sẽ hết hạn ngày {{exp_date}}. Đề nghị Ông/Bà liên hệ Công an Phường An Phú hoặc quét QR nhà trọ để gia hạn đúng quy định.",
  },
  {
    key: "nvqsNotice" as const,
    label: "Mẫu 2: Đăng ký & Sơ tuyển NVQS",
    desc: "Gửi gia đình Nam 17 tuổi & Nam 18–27 tuổi",
    sampleContent:
      "Ban Điều hành Khu phố 3 thông báo: Công dân {{citizen_name}} (sinh năm {{birth_year}}) thuộc diện {{cohort_label}} năm {{year}}. Đề nghị thực hiện đăng ký/sơ tuyển tại {{location}} trước ngày {{deadline}}.",
  },
  {
    key: "report1022Result" as const,
    label: "Mẫu 3: Kết quả xử lý Phản ánh 1022",
    desc: "Báo tự động khi tiếp nhận hoặc hoàn tất xử lý",
    sampleContent:
      "Phản ánh mã {{report_code}} ({{title}}) của Ông/Bà {{citizen_name}} đã được Khu phố 3 cập nhật trạng thái: {{status}}. Ghi chú: {{note}}.",
  },
  {
    key: "generalCivicNotice" as const,
    label: "Mẫu 4: Thông báo công vụ / Mừng thọ / An sinh",
    desc: "Mời họp, tiêm chủng, khám sức khỏe, nhận quà lễ Tết",
    sampleContent:
      "Ban Điều hành Khu phố 3, Phường An Phú trân trọng thông báo đến {{citizen_name}}: {{notice_title}}. Thời gian: {{event_time}} tại {{location}}.",
  },
];

export const ZaloZbsTab: React.FC<ZaloZbsTabProps> = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  const [config, setConfig] = useState<ZaloZbsConfig>({
    enabled: false,
    mode: "development",
    preferFreeOaFirst: true,
    unitPriceVnd: 120,
    templates: {
      tempResidenceReminder: "",
      nvqsNotice: "",
      report1022Result: "",
      generalCivicNotice: "",
    },
    syncedTemplates: [],
  });
  const [logs, setLogs] = useState<ZaloZbsLogItem[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalFreeOaSaved: 0,
    totalZbsSent: 0,
    estimatedCostVnd: 0,
  });

  // Quick Test Form
  const [testPhone, setTestPhone] = useState("");
  const [testRecipientName, setTestRecipientName] = useState("Cư dân Khu phố 3");
  const [testTemplateKey, setTestTemplateKey] = useState<
    "tempResidenceReminder" | "nvqsNotice" | "report1022Result" | "generalCivicNotice"
  >("generalCivicNotice");
  const [testTemplateIdOverride, setTestTemplateIdOverride] = useState("");
  const [testJsonData, setTestJsonData] = useState(
    '{\n  "citizen_name": "Nguyễn Văn An",\n  "notice_title": "Thử nghiệm hệ thống ZBS Khu phố 3",\n  "event_time": "08:00 ngày 26/11/2026",\n  "location": "Trụ sở Khu phố 3, Phường An Phú"\n}'
  );
  const [forceZbsTest, setForceZbsTest] = useState(true);

  const notify = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    onNotify?.(msg, type);
  };

  const loadState = async () => {
    try {
      setLoading(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "get_zbs_state" }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setConfig(json.config);
        setLogs(json.logs || []);
        setStats(
          json.stats || {
            totalSent: 0,
            totalFreeOaSaved: 0,
            totalZbsSent: 0,
            estimatedCostVnd: 0,
          }
        );
      }
    } catch (err: any) {
      notify(err?.message || "Không thể tải cấu hình ZBS.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadState();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "save_zbs_config",
          enabled: config.enabled,
          mode: config.mode,
          preferFreeOaFirst: config.preferFreeOaFirst,
          unitPriceVnd: config.unitPriceVnd,
          templates: config.templates,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        notify(json?.error || "Không thể lưu cấu hình ZBS.", "error");
        return;
      }
      setConfig(json.config);
      notify("Đã lưu cấu hình ZBS 2 tầng lên Supabase Cloud!", "success");
    } catch (err: any) {
      notify(err?.message || "Lỗi kết nối khi lưu cấu hình ZBS.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncTemplates = async () => {
    try {
      setSyncingTemplates(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "sync_zbs_templates" }),
      });
      const json = await res.json();
      if (!json?.ok) {
        notify(json?.error || "Chưa đồng bộ được danh sách mẫu ZBS từ Zalo Cloud.", "warning");
        return;
      }
      setConfig(json.config);
      notify(
        `Đã đồng bộ ${(json.templates || []).length} mẫu Template ZBS từ Zalo Cloud!`,
        "success"
      );
    } catch (err: any) {
      notify(err?.message || "Lỗi đồng bộ mẫu ZBS.", "error");
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      notify("Vui lòng nhập Số điện thoại Zalo người nhận (VD: 0901234567).", "warning");
      return;
    }
    let parsedData: Record<string, string | number> = {};
    try {
      parsedData = JSON.parse(testJsonData || "{}");
    } catch {
      notify("Dữ liệu tham số JSON chưa đúng cú pháp.", "warning");
      return;
    }
    try {
      setSendingTest(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "send_zbs_smart_message",
          phone: testPhone.trim(),
          recipientName: testRecipientName.trim() || "Cư dân Khu phố 3",
          templateKey: testTemplateKey,
          templateId: testTemplateIdOverride.trim() || undefined,
          templateData: parsedData,
          fallbackFreeText: `Thông báo từ Ban Điều hành Khu phố 3, Phường An Phú: ${
            parsedData.notice_title || "Kiểm tra kết nối Zalo OA / ZBS"
          }`,
          forceZbs: forceZbsTest,
          modeOverride: config.mode,
        }),
      });
      const json = await res.json();
      if (json?.ok) {
        notify(json.message || "Đã gửi tin nhắn thành công!", "success");
      } else {
        notify(json?.error || "Không gửi được tin ZBS.", "error");
      }
      await loadState();
    } catch (err: any) {
      notify(err?.message || "Lỗi kết nối khi gửi thử ZBS.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  const copyPresetText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPreset(key);
      notify("Đã sao chép nội dung mẫu hành chính công để dán lên Zalo Cloud!", "success");
      setTimeout(() => setCopiedPreset(null), 2000);
    } catch {
      notify("Không thể sao chép tự động.", "warning");
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 size={16} className="animate-spin text-blue-600" />
        <span>Đang tải cấu hình ZBS / ZNS 2 tầng...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-slate-500">Trạng thái ZBS 2 tầng</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                config.enabled ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            <span className="text-sm font-extrabold text-slate-900">
              {config.enabled
                ? config.mode === "production"
                  ? "Đang bật (Chính thức)"
                  : "Đang bật (Thử nghiệm 0đ)"
                : "Đang tắt"}
            </span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-emerald-800">Tầng 1 OA Miễn phí (0đ)</div>
          <div className="mt-1 text-xl font-black text-emerald-900 font-mono">
            {stats.totalFreeOaSaved} tin
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-blue-800">Tầng 2 ZBS theo SĐT</div>
          <div className="mt-1 text-xl font-black text-blue-900 font-mono">
            {stats.totalZbsSent} tin
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-amber-800 flex items-center gap-1">
            <Wallet size={12} /> Ước tính chi phí ZCA
          </div>
          <div className="mt-1 text-xl font-black text-amber-900 font-mono">
            {stats.estimatedCostVnd.toLocaleString("vi-VN")} đ
          </div>
        </div>
      </div>

      {/* Main Config & Quick Test Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Configuration & 4 Civic Templates */}
        <form
          onSubmit={handleSave}
          className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ShieldCheck size={15} className="text-blue-700" />
                Cấu hình ZBS Template Message (Định tuyến 2 tầng)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tầng 1 ưu tiên gửi OA miễn phí (0đ) nếu cư dân đã Quan tâm • Tầng 2 tự chuyển ZBS theo SĐT (~120đ/tin hành chính công).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://account.zalo.solutions/home"
                target="_blank"
                rel="noreferrer"
                className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
              >
                <span>Cổng ZBS</span>
                <ExternalLink size={11} />
              </a>
              <button
                type="button"
                onClick={handleSyncTemplates}
                disabled={syncingTemplates}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncingTemplates ? "animate-spin" : ""} />
                <span>Đồng bộ Mẫu từ Zalo</span>
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
                className="w-4 h-4 accent-blue-700"
              />
              <span className="font-bold text-slate-800">Bật gửi ZBS theo SĐT</span>
            </label>

            <label className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.preferFreeOaFirst}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, preferFreeOaFirst: e.target.checked }))
                }
                className="w-4 h-4 accent-emerald-700"
              />
              <span className="font-bold text-emerald-900">Ưu tiên OA 0đ trước</span>
            </label>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">Chế độ:</span>
              <select
                value={config.mode}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    mode: e.target.value === "production" ? "production" : "development",
                  }))
                }
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900"
              >
                <option value="development">Thử nghiệm (0đ)</option>
                <option value="production">Chính thức (~120đ)</option>
              </select>
            </div>
          </div>

          {/* Synced Templates from Zalo Cloud */}
          {config.syncedTemplates && config.syncedTemplates.length > 0 && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-blue-900">
                Mẫu đã đồng bộ từ Zalo Cloud ({config.syncedTemplates.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {config.syncedTemplates.map((t) => (
                  <span
                    key={t.templateId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[11px] text-slate-800"
                  >
                    <strong className="font-mono text-blue-700">{t.templateId}</strong>
                    <span>• {t.templateName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      {t.status}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4 Civic Template IDs + Copyable Drafts */}
          <div className="space-y-3">
            {TEMPLATE_PRESETS.map((preset) => (
              <div
                key={preset.key}
                className="border border-slate-200/90 rounded-xl p-3 space-y-2 bg-slate-50/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{preset.label}</div>
                    <div className="text-[11px] text-slate-500">{preset.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Nhập Template ID (VD: 312456)"
                      value={config.templates[preset.key] || ""}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          templates: { ...c.templates, [preset.key]: e.target.value },
                        }))
                      }
                      className="w-44 h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => copyPresetText(preset.key, preset.sampleContent)}
                      className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                      title="Sao chép mẫu nội dung chuẩn hành chính công để nộp Zalo duyệt"
                    >
                      {copiedPreset === preset.key ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                      <span>Chép mẫu</span>
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 font-mono leading-relaxed">
                  {preset.sampleContent}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Đơn giá hành chính công (VNĐ/tin):</span>
              <input
                type="number"
                min={0}
                max={2000}
                value={config.unitPriceVnd}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, unitPriceVnd: Number(e.target.value) || 0 }))
                }
                className="w-20 h-8 px-2 rounded-lg border border-slate-300 font-mono font-bold text-right text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Lưu cấu hình ZBS</span>
            </button>
          </div>
        </form>

        {/* Right: Quick Test Panel + Recent Logs */}
        <div className="xl:col-span-5 space-y-4">
          <form
            onSubmit={handleSendTest}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs"
          >
            <div className="pb-2.5 border-b border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" />
                Gửi thử nghiệm ZBS / ZNS 1-chạm
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ở chế độ <strong className="text-slate-700">Thử nghiệm (0đ)</strong>, Zalo cho phép gửi miễn phí vào SĐT quản trị viên OA để kiểm tra mẫu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  SĐT Zalo nhận tin *
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-300 font-mono font-semibold text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tên người nhận
                </label>
                <input
                  type="text"
                  value={testRecipientName}
                  onChange={(e) => setTestRecipientName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nghiệp vụ mẫu
                </label>
                <select
                  value={testTemplateKey}
                  onChange={(e) => setTestTemplateKey(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="tempResidenceReminder">Nhắc gia hạn tạm trú</option>
                  <option value="nvqsNotice">Đăng ký / Sơ tuyển NVQS</option>
                  <option value="report1022Result">Kết quả Phản ánh 1022</option>
                  <option value="generalCivicNotice">Thông báo công vụ / An sinh</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Template ID (tùy chọn ghi đè)
                </label>
                <input
                  type="text"
                  placeholder="Để trống sẽ lấy theo cấu hình"
                  value={testTemplateIdOverride}
                  onChange={(e) => setTestTemplateIdOverride(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tham số template_data (JSON)
              </label>
              <textarea
                rows={4}
                value={testJsonData}
                onChange={(e) => setTestJsonData(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-[11px] text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceZbsTest}
                  onChange={(e) => setForceZbsTest(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-700"
                />
                <span>Ép test thẳng API ZBS (bỏ qua Tầng 1 OA)</span>
              </label>
              <button
                type="submit"
                disabled={sendingTest}
                className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Gửi thử ngay</span>
              </button>
            </div>
          </form>

          {/* Recent ZBS Logs */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Nhật ký định tuyến ZBS gần đây ({logs.length})
              </h5>
              <button
                type="button"
                onClick={() => void loadState()}
                className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Làm mới
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">
                Chưa có lượt gửi ZBS nào. Hãy nhập Template ID và bấm &quot;Gửi thử ngay&quot;.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {logs.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-100 rounded-xl p-2.5 bg-slate-50/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        {item.status === "sent" ? (
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle size={13} className="text-rose-600 shrink-0" />
                        )}
                        {item.recipientName} ({item.phone})
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {item.tier === "tier1_oa_free"
                          ? "Tầng 1 • 0đ"
                          : item.tier === "tier2_zbs_dev"
                            ? "ZBS Dev • 0đ"
                            : `ZBS • ${item.estimatedCostVnd}đ`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">{item.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
