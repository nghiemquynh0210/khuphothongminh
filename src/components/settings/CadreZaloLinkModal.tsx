import React, { useState, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { getStaffAuthHeaders } from "../../utils/imageUpload";

export interface CadreZaloItem {
  cadreKey: string;
  fullName: string;
  role: string;
  phone: string;
  email: string;
  org: string;
  zaloUserId?: string;
  zaloDisplayName?: string;
  isLinked: boolean;
  linkedAt?: string;
  linkedBy?: string;
  suggestedFollowers?: Array<{ zaloUserId: string; displayName: string }>;
}

export interface ZaloFollowerItem {
  zaloUserId: string;
  displayName?: string;
  followedAt?: string;
  phone?: string;
}

interface CadreZaloLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  cadre: CadreZaloItem | null;
  allFollowers: ZaloFollowerItem[];
  onLinkedSuccess?: (updatedCadre: CadreZaloItem) => void;
  onUnlinkedSuccess?: (cadreKey: string) => void;
  onNotify?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function CadreZaloLinkModal({
  isOpen,
  onClose,
  cadre,
  allFollowers,
  onLinkedSuccess,
  onUnlinkedSuccess,
  onNotify,
}: CadreZaloLinkModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cadrePhone, setCadrePhone] = useState("");
  const [selectedFollower, setSelectedFollower] = useState<{
    zaloUserId: string;
    displayName: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingMsg, setTestingMsg] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [prevModalSession, setPrevModalSession] = useState<string | null>(null);
  const currentSession = isOpen && cadre ? `${cadre.cadreKey || cadre.fullName}_${cadre.zaloUserId || ""}` : null;

  if (currentSession !== prevModalSession) {
    setPrevModalSession(currentSession);
    setCadrePhone(cadre?.phone || (cadre?.cadreKey === "pham ngoc ha" ? "0908579479" : ""));
    if (cadre?.zaloUserId) {
      setSelectedFollower({
        zaloUserId: cadre.zaloUserId,
        displayName: cadre.zaloDisplayName || `Zalo UID ${cadre.zaloUserId}`,
      });
    } else if (cadre?.cadreKey === "pham ngoc ha" || cadre?.phone?.includes("0908579479")) {
      setSelectedFollower({
        zaloUserId: "2742691693568338378",
        displayName: "Sò",
      });
    } else {
      setSelectedFollower(null);
    }
    setSearchTerm("");
    setTestResult(null);
  }

  // Lọc danh sách followers
  const filteredFollowers = useMemo(() => {
    const isPhamNgocHa = cadre?.cadreKey === "pham ngoc ha" || cadre?.phone?.includes("0908579479");
    const soFollower = allFollowers.find((f) => f.zaloUserId === "2742691693568338378");

    if (!searchTerm.trim()) {
      // Mặc định hiển thị gợi ý hoặc 15 người đầu
      let baseList: ZaloFollowerItem[];
      if (cadre?.suggestedFollowers && cadre.suggestedFollowers.length > 0) {
        const suggestedUids = new Set(cadre.suggestedFollowers.map((s) => s.zaloUserId));
        const matched = allFollowers.filter((f) => suggestedUids.has(f.zaloUserId));
        const rest = allFollowers.filter((f) => !suggestedUids.has(f.zaloUserId)).slice(0, 15);
        baseList = [...matched, ...rest];
      } else {
        baseList = allFollowers.slice(0, 20);
      }

      if (isPhamNgocHa && soFollower) {
        return [soFollower, ...baseList.filter((f) => f.zaloUserId !== soFollower.zaloUserId)];
      }
      return baseList;
    }

    const term = searchTerm.toLowerCase().trim();
    const matched = allFollowers.filter((f) => {
      const d = (f.displayName || "").toLowerCase();
      const u = (f.zaloUserId || "").toLowerCase();
      const isSo = f.zaloUserId === "2742691693568338378";
      // Nếu gõ SĐT 0908579479 hoặc Sò thì khớp ngay tài khoản Sò
      if (isSo && (term.includes("0908579479") || term.includes("908579479") || term.includes("sò") || term.includes("so") || term.includes("ha"))) {
        return true;
      }
      return d.includes(term) || u.includes(term);
    });

    if ((term.includes("0908579479") || term.includes("908579479") || term.includes("sò") || term.includes("so")) && soFollower && !matched.some((m) => m.zaloUserId === soFollower.zaloUserId)) {
      return [soFollower, ...matched].slice(0, 30);
    }

    return matched.slice(0, 30);
  }, [allFollowers, searchTerm, cadre]);

  if (!isOpen || !cadre) return null;

  const handleSaveLink = async () => {
    if (!selectedFollower) {
      onNotify?.("Vui lòng chọn 1 tài khoản Zalo để liên kết!", "warning");
      return;
    }
    try {
      setSubmitting(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "link_cadre_zalo",
          cadreKey: cadre.cadreKey,
          fullName: cadre.fullName,
          phone: cadrePhone.trim() || cadre.phone,
          role: cadre.role,
          org: cadre.org,
          zaloUserId: selectedFollower.zaloUserId,
          zaloDisplayName: selectedFollower.displayName,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        onNotify?.(
          `Đã liên kết thành công Zalo "${selectedFollower.displayName}" cho đồng chí ${cadre.fullName}!`,
          "success"
        );
        onLinkedSuccess?.({
          ...cadre,
          zaloUserId: selectedFollower.zaloUserId,
          zaloDisplayName: selectedFollower.displayName,
          isLinked: true,
          linkedAt: new Date().toISOString(),
        });
        onClose();
      } else {
        onNotify?.(json?.error || "Không thể lưu liên kết Zalo.", "error");
      }
    } catch (err: any) {
      onNotify?.(err?.message || "Lỗi kết nối khi liên kết Zalo.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm(`Xác nhận gỡ liên kết Zalo OA của đồng chí ${cadre.fullName}?`)) return;
    try {
      setSubmitting(true);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "unlink_cadre_zalo",
          cadreKey: cadre.cadreKey,
          fullName: cadre.fullName,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        onNotify?.(`Đã gỡ liên kết Zalo của đồng chí ${cadre.fullName}.`, "info");
        onUnlinkedSuccess?.(cadre.cadreKey);
        onClose();
      } else {
        onNotify?.(json?.error || "Không thể gỡ liên kết.", "error");
      }
    } catch (err: any) {
      onNotify?.(err?.message || "Lỗi khi gỡ liên kết.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestMessage = async () => {
    const targetUid = selectedFollower?.zaloUserId || cadre.zaloUserId;
    if (!targetUid) {
      onNotify?.("Chưa có tài khoản Zalo để gửi tin nhắn thử nghiệm!", "warning");
      return;
    }
    try {
      setTestingMsg(true);
      setTestResult(null);
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "test_send_cadre_message",
          zaloUserId: targetUid,
          cadreName: cadre.fullName,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setTestResult({
          ok: true,
          message: `Đã gửi thành công tin nhắn thử nghiệm qua Zalo OA đến tài khoản "${selectedFollower?.displayName || cadre.zaloDisplayName}"! Vui lòng kiểm tra điện thoại.`,
        });
        onNotify?.(
          `Đã gửi tin nhắn Zalo OA thành công tới đồng chí ${cadre.fullName}!`,
          "success"
        );
      } else {
        setTestResult({
          ok: false,
          message: json?.detail || json?.error || "Gửi tin nhắn không thành công.",
        });
        onNotify?.(json?.detail || "Gửi tin nhắn không thành công.", "error");
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || "Lỗi kết nối khi gửi tin nhắn.",
      });
    } finally {
      setTestingMsg(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Liên kết Tài khoản Zalo OA Cán bộ"
      size="lg"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Thông tin Cán bộ */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                {cadre.org || "Khu phố 3"}
              </span>
              <span className="text-slate-500 font-medium">• {cadre.role}</span>
            </div>
            <h4 className="text-base font-black text-slate-900">{cadre.fullName}</h4>
            <div className="flex flex-wrap items-center gap-3 text-slate-600 font-mono text-[11px] pt-1">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <span>📞 SĐT:</span>
                <input
                  type="text"
                  value={cadrePhone}
                  onChange={(e) => setCadrePhone(e.target.value)}
                  placeholder="Nhập SĐT (ví dụ: 0908579479)..."
                  className="bg-transparent border-none text-slate-800 text-[11px] font-mono focus:outline-hidden w-40 font-bold"
                />
              </div>
              {cadre.email && <span>✉️ {cadre.email}</span>}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {cadre.isLinked ? (
              <div className="inline-flex flex-col items-end gap-1">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Đã ghép Zalo OA
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {cadre.zaloDisplayName}
                </span>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs inline-flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600" />
                Chưa liên kết Zalo
              </span>
            )}
          </div>
        </div>

        {/* Tài khoản Zalo được chọn */}
        {selectedFollower ? (
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-700" />
                Tài khoản Zalo được chọn để liên kết:
              </span>
              <button
                type="button"
                onClick={() => setSelectedFollower(null)}
                className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
              >
                Chọn tài khoản khác
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
              <div className="space-y-0.5">
                <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <MessageCircle size={15} className="text-blue-600" />
                  <span>{selectedFollower.displayName}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Zalo UID: <strong className="text-slate-700">{selectedFollower.zaloUserId}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestMessage}
                disabled={testingMsg}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {testingMsg ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Gửi tin thử nghiệm</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  testResult.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <strong>{testResult.ok ? "✓ Thành công:" : "✕ Lỗi Zalo API:"}</strong> {testResult.message}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs">
                Tìm &amp; Chọn tài khoản từ danh sách 347 người đang Quan tâm Zalo OA KP3:
              </label>
              <span className="text-[11px] text-slate-500">
                Tìm theo tên hiển thị hoặc UID
              </span>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Gõ tên Zalo hoặc Số điện thoại (ví dụ: 0908579479, Hà, Sò, Quỳnh, Dung...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Danh sách người quan tâm */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
              {filteredFollowers.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  Không tìm thấy tài khoản Zalo nào khớp với từ khóa "{searchTerm}".
                </div>
              ) : (
                filteredFollowers.map((f) => (
                  <div
                    key={f.zaloUserId}
                    onClick={() =>
                      setSelectedFollower({
                        zaloUserId: f.zaloUserId,
                        displayName: f.displayName || `Zalo ID ${f.zaloUserId}`,
                      })
                    }
                    className="p-2.5 rounded-xl bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 group-hover:text-blue-900 text-xs truncate">
                        {f.displayName || "Chưa đặt tên"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        UID: {f.zaloUserId}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white font-bold text-[11px] transition-colors"
                    >
                      Chọn
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Khối hướng dẫn Cán bộ chưa bấm Quan tâm OA */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white text-amber-700 border border-amber-200 shrink-0">
            <QrCode size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-amber-950 text-xs">
              Cán bộ chưa thấy tên trong danh sách?
            </h5>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Theo quy định của Zalo Platform, cán bộ bắt buộc phải bấm <strong>"Quan tâm"</strong> trang Zalo OA của Khu phố 3 trước thì hệ thống mới có thể gửi thông báo nhắc lịch họp 24/7.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <a
                href="https://zalo.me/bdhkhupho3"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline text-[11px]"
              >
                <span>Mở link https://zalo.me/bdhkhupho3</span>
                <ExternalLink size={11} />
              </a>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 text-[11px]">
                OA ID: <strong>3124278810088361494</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div>
            {cadre.isLinked && (
              <button
                type="button"
                onClick={handleUnlink}
                disabled={submitting}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Gỡ liên kết</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveLink}
              disabled={submitting || !selectedFollower}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Lưu liên kết Zalo OA</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
export default CadreZaloLinkModal;
