import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  FilePlus2,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { FieldReport } from "../../types";
import { formatNowVNString } from "../../data/reportConfig";
import { loadPortalSetting, savePortalSetting } from "../../utils/supabaseSync";
import { getStaffAuthHeaders, uploadReportImages } from "../../utils/imageUpload";
import { extractTimemarkFromImage } from "../../utils/timemarkParser";
import { recordAuditLog } from "../../utils/auditLogger";

export type PatrolResultStatus =
  | "An toàn ổn định"
  | "Đã nhắc nhở tại chỗ"
  | "Phát hiện vi phạm cần xử lý";

export interface SecurityPatrolLog {
  id: string;
  shiftLabel: string;
  patrolDate: string;
  routeArea: string;
  teamMembers: string;
  result: PatrolResultStatus;
  note: string;
  images: string[];
  lat?: number;
  lng?: number;
  timemarkVerified?: boolean;
  linkedReportId?: string;
  createdBy: string;
  createdAt: string;
}

const PATROL_STORAGE_KEY = "kp3_security_patrol_logs_v1";

const INITIAL_SAMPLE_LOGS: SecurityPatrolLog[] = [
  {
    id: "ANTT-2026-01",
    shiftLabel: "Ca tuần tra đêm (22:00 – 02:00)",
    patrolDate: new Date().toLocaleDateString("vi-VN"),
    routeArea: "Trục đường Song Hành – Hẻm 17/A3 – Khu nhà trọ Tổ 5, KP3",
    teamMembers: "Tổ bảo vệ ANTT cơ sở KP3 phối hợp CSKV",
    result: "An toàn ổn định",
    note: "Kiểm tra an ninh trật tự các dãy nhà trọ đông công nhân lưu trú, nhắc nhở khóa cổng an toàn phòng chống trộm cắp tài sản.",
    images: [],
    createdBy: "Tổ ANTT Cơ sở KP3",
    createdAt: new Date().toISOString(),
  },
];

export interface SecurityPatrolLogTabProps {
  onAddReport: (newReport: FieldReport) => void;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
}

export function SecurityPatrolLogTab({
  onAddReport,
  currentUser,
}: SecurityPatrolLogTabProps) {
  const actorName = currentUser?.fullName || "Tổ ANTT Cơ sở KP3";
  const [logs, setLogs] = useState<SecurityPatrolLog[]>(() => {
    try {
      const raw = localStorage.getItem(PATROL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_SAMPLE_LOGS;
  });

  const [showForm, setShowForm] = useState(false);
  const [shiftLabel, setShiftLabel] = useState("Ca tuần tra đêm (22:00 – 02:00)");
  const [routeArea, setRouteArea] = useState("");
  const [teamMembers, setTeamMembers] = useState(actorName);
  const [result, setResult] = useState<PatrolResultStatus>("An toàn ổn định");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [timemarkVerified, setTimemarkVerified] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAlertingZalo, setIsAlertingZalo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const cloud = await loadPortalSetting<SecurityPatrolLog[]>(PATROL_STORAGE_KEY);
      if (active && Array.isArray(cloud) && cloud.length > 0) {
        setLogs(cloud);
        try {
          localStorage.setItem(PATROL_STORAGE_KEY, JSON.stringify(cloud));
        } catch {}
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persistLogs = async (next: SecurityPatrolLog[]) => {
    setLogs(next);
    try {
      localStorage.setItem(PATROL_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    await savePortalSetting(PATROL_STORAGE_KEY, next, false);
  };

  const handleUploadPatrolPhotos = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const files = Array.from(fileList).slice(0, 3);
      try {
        const tm = await extractTimemarkFromImage(files[0]);
        if (tm?.isVerified) {
          setTimemarkVerified(true);
        }
        if (tm?.lat && tm?.lng) {
          setLat(tm.lat);
          setLng(tm.lng);
        }
        if (tm?.address && !routeArea) {
          setRouteArea(tm.address);
        }
      } catch {
        // optional timemark parse
      }

      const { urls } = await uploadReportImages(files, "before");
      if (urls.length > 0) {
        setImages((prev) => [...prev, ...urls].slice(0, 4));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
      },
      () => {}
    );
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeArea.trim() || !note.trim()) return;
    const newItem: SecurityPatrolLog = {
      id: `ANTT-${Date.now().toString().slice(-6)}`,
      shiftLabel,
      patrolDate: formatNowVNString(),
      routeArea: routeArea.trim(),
      teamMembers: teamMembers.trim() || actorName,
      result,
      note: note.trim(),
      images,
      lat,
      lng,
      timemarkVerified,
      createdBy: actorName,
      createdAt: new Date().toISOString(),
    };
    const next = [newItem, ...logs];
    await persistLogs(next);
    setRouteArea("");
    setNote("");
    setImages([]);
    setLat(undefined);
    setLng(undefined);
    setTimemarkVerified(false);
    setShowForm(false);
    setNotice(`Đã ghi sổ trực tuần tra ${newItem.id} thành công!`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleConvertPatrolToReport = async (log: SecurityPatrolLog) => {
    const newId = `PA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: FieldReport = {
      id: newId,
      title: `[Tuần tra ANTT] ${log.routeArea.slice(0, 65)}`,
      category: "An ninh trật tự",
      reporterName: log.teamMembers,
      reporterPhone: "Tổ ANTT Cơ sở KP3",
      reportedAt: log.patrolDate,
      createdAt: new Date().toISOString(),
      location: log.routeArea,
      coordinates: { x: 50, y: 50 },
      lat: log.lat,
      lng: log.lng,
      description: `[Chuyển từ Sổ Tuần tra ANTT ${log.id} • ${log.shiftLabel}]\n${log.note}`,
      status: "Đang xử lý",
      priority: log.result === "Phát hiện vi phạm cần xử lý" ? "Khẩn cấp" : "Cao",
      assignedUnit: "Công an khu vực & Tổ bảo vệ ANTT",
      beforeImage: log.images[0],
      beforeImages: log.images,
      timeline: [
        {
          time: formatNowVNString(),
          title: "Phát hiện qua ca tuần tra ANTT cơ sở",
          description: log.note,
          actor: actorName,
        },
      ],
      messages: [],
    };
    onAddReport(newReport);
    const updated = logs.map((l) =>
      l.id === log.id ? { ...l, linkedReportId: newId } : l
    );
    await persistLogs(updated);
    setNotice(`Đã lập hồ sơ xử lý ANTT [${newId}] từ ca tuần tra!`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAlertCadresZalo = async (log: SecurityPatrolLog) => {
    setIsAlertingZalo(log.id);
    try {
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "send_patrol_urgent_alert",
          patrolId: log.id,
          shiftLabel: log.shiftLabel,
          routeArea: log.routeArea,
          result: log.result,
          note: log.note,
          teamMembers: log.teamMembers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setNotice(
        data?.sentCount > 0
          ? `Đã gửi báo cáo nhanh ca tuần tra qua Zalo OA tới ${data.sentCount} cán bộ Thường trực / CSKV!`
          : "Đã ghi nhận cảnh báo tuần tra vào nhật ký điều hành."
      );
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsAlertingZalo(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    await persistLogs(logs.filter((l) => l.id !== id));
  };

  const handleExportPatrolExcel = () => {
    const rows = logs.map((l, idx) => ({
      STT: idx + 1,
      "Mã ca trực": l.id,
      "Thời gian ghi nhận": l.patrolDate,
      "Ca tuần tra": l.shiftLabel,
      "Tuyến đường / Khu vực kiểm tra": l.routeArea,
      "Lực lượng tham gia": l.teamMembers,
      "Đánh giá tình hình": l.result,
      "Nội dung chi tiết": l.note,
      "Tọa độ GPS": l.lat && l.lng ? `${l.lat}, ${l.lng}` : "",
      "Hồ sơ 1022 liên kết": l.linkedReportId || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SoTrucTuanTra_ANTT");
    const fileName = `So_Tuan_Tra_ANTT_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    recordAuditLog({
      actorName,
      actorRole: "Tổ ANTT Cơ sở KP3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất Sổ trực & Tuần tra ANTT cơ sở (.xlsx)",
      targetSummary: `${logs.length} ca tuần tra (${fileName})`,
    });
  };

  const stats = useMemo(
    () => ({
      total: logs.length,
      safe: logs.filter((l) => l.result === "An toàn ổn định").length,
      reminded: logs.filter((l) => l.result === "Đã nhắc nhở tại chỗ").length,
      violation: logs.filter((l) => l.result === "Phát hiện vi phạm cần xử lý").length,
    }),
    [logs]
  );

  return (
    <div className="space-y-3.5">
      {notice && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Top Summary & Actions */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-700" size={16} />
            <span className="font-bold text-slate-900">
              Sổ Trực & Tuần Tra Tổ Bảo Vệ ANTT Cơ Sở ({stats.total} ca)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold">
            Ổn định: {stats.safe}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold">
            Nhắc nhở: {stats.reminded}
          </span>
          {stats.violation > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-bold">
              Cần xử lý: {stats.violation}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPatrolExcel}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>Xuất Sổ trực (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Ghi Ca Tuần Tra Mới</span>
          </button>
        </div>
      </div>

      {/* Collapsible New Patrol Form */}
      {showForm && (
        <form
          onSubmit={handleSaveLog}
          className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="patrol-shift" className="font-semibold text-slate-700 block mb-1">
                Ca trực / Tuần tra
              </label>
              <select
                id="patrol-shift"
                name="patrolShift"
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
              >
                <option value="Ca tuần tra đêm (22:00 – 02:00)">
                  Ca tuần tra đêm (22:00 – 02:00)
                </option>
                <option value="Ca tuần tra khuya (02:00 – 05:30)">
                  Ca tuần tra khuya (02:00 – 05:30)
                </option>
                <option value="Ca trực cao điểm chiều – tối (17:00 – 22:00)">
                  Ca trực cao điểm chiều – tối (17:00 – 22:00)
                </option>
                <option value="Kiểm tra hành chính nhà trọ / điểm nóng">
                  Kiểm tra hành chính nhà trọ / điểm nóng
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="patrol-team" className="font-semibold text-slate-700 block mb-1">
                Lực lượng tham gia
              </label>
              <input
                id="patrol-team"
                name="patrolTeam"
                type="text"
                value={teamMembers}
                onChange={(e) => setTeamMembers(e.target.value)}
                placeholder="VD: Tổ ANTT Tổ 3 + Đ/c Hải CSKV"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>

            <div>
              <label htmlFor="patrol-result" className="font-semibold text-slate-700 block mb-1">
                Kết quả kiểm tra
              </label>
              <select
                id="patrol-result"
                name="patrolResult"
                value={result}
                onChange={(e) => setResult(e.target.value as PatrolResultStatus)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="An toàn ổn định">An toàn ổn định</option>
                <option value="Đã nhắc nhở tại chỗ">Đã nhắc nhở tại chỗ</option>
                <option value="Phát hiện vi phạm cần xử lý">Phát hiện vi phạm cần xử lý</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <label htmlFor="patrol-route" className="font-semibold text-slate-700 block mb-1">
                Tuyến đường / Điểm chốt tuần tra <span className="text-rose-600">*</span>
              </label>
              <input
                id="patrol-route"
                name="patrolRoute"
                type="text"
                required
                value={routeArea}
                onChange={(e) => setRouteArea(e.target.value)}
                placeholder="VD: Hẻm 17/A3 – Cụm nhà trọ Tổ 5 – Trục Lương Định Của, Khu phố 3"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
            <div className="sm:col-span-4 flex items-end gap-2">
              <button
                type="button"
                onClick={handleUseCurrentGps}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer w-full justify-center"
              >
                <MapPin size={13} className="text-emerald-700" />
                <span>
                  {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Lấy tọa độ GPS"}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="patrol-note" className="font-semibold text-slate-700 block mb-1">
              Diễn biến & Biện pháp xử lý tại hiện trường <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="patrol-note"
              name="patrolNote"
              rows={2}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi rõ tình hình ANTT, nhắc nhở tiếng ồn karaoke, kiểm tra khóa cổng nhà trọ..."
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <label className="h-8 px-3 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                {isUploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Camera size={13} />
                )}
                <span>Đính kèm ảnh Timemark ({images.length}/4)</span>
                <input
                  id="patrol-photo-input"
                  name="patrolPhoto"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    handleUploadPatrolPhotos(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {timemarkVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <ShieldCheck size={12} />
                  Đã xác thực Timemark
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                Lưu Sổ Trực
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Patrol Logs List */}
      <div className="space-y-2.5">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-slate-500">{log.id}</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                    log.result === "Phát hiện vi phạm cần xử lý"
                      ? "bg-rose-100 text-rose-800"
                      : log.result === "Đã nhắc nhở tại chỗ"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {log.result}
                </span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Clock size={12} />
                  {log.shiftLabel} • {log.patrolDate}
                </span>
                {log.timemarkVerified && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-semibold">
                    <ShieldCheck size={11} />
                    Timemark GPS
                  </span>
                )}
              </div>

              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-700 shrink-0" />
                <span>{log.routeArea}</span>
              </div>

              <p className="text-slate-600 leading-relaxed">{log.note}</p>

              <div className="text-[11px] text-slate-500">
                Lực lượng: <strong className="text-slate-700">{log.teamMembers}</strong>
              </div>

              {log.images.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  {log.images.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-14 h-14 rounded-lg overflow-hidden border border-slate-200"
                    >
                      <img src={url} alt="Ảnh tuần tra" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
              {!log.linkedReportId ? (
                <button
                  type="button"
                  onClick={() => handleConvertPatrolToReport(log)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <FilePlus2 size={12} className="text-emerald-700" />
                  <span>Chuyển Hồ sơ 1022</span>
                </button>
              ) : (
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                  Đã lập {log.linkedReportId}
                </span>
              )}

              <button
                type="button"
                onClick={() => handleAlertCadresZalo(log)}
                disabled={isAlertingZalo === log.id}
                className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isAlertingZalo === log.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                <span>Báo Zalo CSKV</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteLog(log.id)}
                className="h-8 px-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center cursor-pointer"
                title="Xóa dòng nhật ký"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
