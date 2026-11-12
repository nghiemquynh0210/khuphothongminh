import {
  FieldReport,
  ReportCategory,
  ReportFeedback,
  ReportMessage,
  ReportPriority,
  TargetGisItem,
} from "../types";
import { KP3_CENTER, decimalToDMS } from "../utils/gisUtils";

export const REPORT_STORAGE_KEY = "kp3_field_reports_v2";

export const REPORT_CATEGORIES: {
  id: ReportCategory;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  defaultUnit: string;
  defaultPriority: ReportPriority;
}[] = [
  {
    id: "Rác thải",
    label: "Rác thải & Vệ sinh",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    defaultUnit: "Tổ Vệ sinh & Môi trường KP3",
    defaultPriority: "Bình thường",
  },
  {
    id: "Lấn chiếm lòng đường",
    label: "Lấn chiếm vỉa hè",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
    defaultUnit: "Đội Trật tự Đô thị Phường",
    defaultPriority: "Bình thường",
  },
  {
    id: "Tiếng ồn",
    label: "Tiếng ồn đô thị",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-800",
    badgeBorder: "border-violet-200",
    defaultUnit: "Tổ ANTT cơ sở KP3",
    defaultPriority: "Cao",
  },
  {
    id: "An ninh trật tự",
    label: "An ninh trật tự",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200",
    defaultUnit: "Công an Khu vực KP3",
    defaultPriority: "Khẩn cấp",
  },
  {
    id: "Hạ tầng đô thị",
    label: "Hạ tầng & Chiếu sáng",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-800",
    badgeBorder: "border-sky-200",
    defaultUnit: "Ban Điều hành KP3",
    defaultPriority: "Cao",
  },
  {
    id: "Ngập nước",
    label: "Thoát nước & Ngập úng",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-800",
    badgeBorder: "border-cyan-200",
    defaultUnit: "Ban Điều hành KP3",
    defaultPriority: "Cao",
  },
  {
    id: "Trật tự đô thị",
    label: "Trật tự đô thị",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-200",
    defaultUnit: "Đội Trật tự Đô thị Phường",
    defaultPriority: "Bình thường",
  },
];

export const REPORT_PRIORITY_CONFIG: Record<
  ReportPriority,
  {
    label: string;
    slaHours: number;
    shortSla: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  "Khẩn cấp": {
    label: "Khẩn cấp",
    slaHours: 4,
    shortSla: "SLA 4h",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-600",
  },
  Cao: {
    label: "Ưu tiên cao",
    slaHours: 24,
    shortSla: "SLA 24h",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-600",
  },
  "Bình thường": {
    label: "Bình thường",
    slaHours: 72,
    shortSla: "SLA 72h",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
  },
};

export const KP3_TEAMS = [
  "Ban Điều hành KP3",
  "Tổ ANTT cơ sở KP3",
  "Tổ Vệ sinh & Môi trường KP3",
  "Đội Trật tự Đô thị Phường",
  "Công an Khu vực KP3",
  "Đội Thoát nước & Chiếu sáng",
];

export const KP3_STREETS = [
  "Hẻm 42 Lương Định Của",
  "Đường Lương Định Của (Mặt tiền)",
  "Hẻm 82 Lương Định Của",
  "Khu vực Nhà văn hóa KP3",
  "Hẻm 42/18 Lương Định Của",
  "Khu dân cư An Phú Mới",
];

export const CANBO_QUICK_REPLIES = [
  "Tổ tự quản KP3 đã tiếp nhận và đang xuống hiện trường kiểm tra.",
  "Nhờ anh/chị chụp bổ sung thêm ảnh góc rộng hoặc số nhà gần nhất để tổ xác minh.",
  "Đã lập biên bản nhắc nhở và chuyển đơn vị chuyên môn phối hợp khắc phục.",
  "Hiện trường đã được xử lý xong, mời cư dân xem ảnh minh chứng và xác nhận giúp khu phố.",
];

export const CITIZEN_QUICK_REPLIES = [
  "Xin gửi bổ sung thêm hình ảnh cận cảnh vị trí sự cố.",
  "Cảm ơn Ban Điều hành KP3 đã tiếp nhận và xử lý kịp thời!",
  "Sự cố tại vị trí này có dấu hiệu tái diễn, nhờ cán bộ kiểm tra lại giúp.",
];

export function formatNowVNString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function parseVNDateTime(str?: string): Date | null {
  if (!str) return null;
  // Support "DD/MM/YYYY HH:mm" or "HH:mm:ss DD/MM/YYYY" or ISO
  const matchDMY = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[^\d]+(\d{1,2}):(\d{2}))?/);
  if (matchDMY) {
    const day = Number(matchDMY[1]);
    const month = Number(matchDMY[2]) - 1;
    const year = Number(matchDMY[3]);
    const hour = matchDMY[4] ? Number(matchDMY[4]) : 8;
    const min = matchDMY[5] ? Number(matchDMY[5]) : 0;
    const d = new Date(year, month, day, hour, min, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(str);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function computeSlaDeadlineIso(
  priority: ReportPriority = "Bình thường",
  fromDate: Date = new Date()
): string {
  const hours = REPORT_PRIORITY_CONFIG[priority]?.slaHours ?? 72;
  return new Date(fromDate.getTime() + hours * 3600 * 1000).toISOString();
}

export function getCategoryMeta(category: string) {
  return (
    REPORT_CATEGORIES.find((c) => c.id === category) ||
    REPORT_CATEGORIES[REPORT_CATEGORIES.length - 1]
  );
}

export function getBeforeImages(report: FieldReport): string[] {
  const raw = [
    ...(report.beforeImages || []),
    ...(report.beforeImage ? [report.beforeImage] : []),
    ...(report.images || []),
  ].filter(Boolean);
  return Array.from(new Set(raw));
}

export function getAfterImages(report: FieldReport): string[] {
  const raw = [
    ...(report.afterImages || []),
    ...(report.afterImage ? [report.afterImage] : []),
  ].filter(Boolean);
  return Array.from(new Set(raw));
}

export interface SlaStatusInfo {
  state: "completed" | "overdue" | "warning" | "on_track";
  label: string;
  shortLabel: string;
  hoursRemaining: number;
  deadlineLabel: string;
}

export function getSlaStatus(report: FieldReport, nowMs: number = Date.now()): SlaStatusInfo {
  const priority: ReportPriority = report.priority || "Bình thường";
  const slaHours = report.slaHours || REPORT_PRIORITY_CONFIG[priority]?.slaHours || 72;

  let deadlineMs: number | null = report.slaDeadline ? Date.parse(report.slaDeadline) : null;
  if (!deadlineMs || Number.isNaN(deadlineMs)) {
    const startDate = parseVNDateTime(report.reportedAt);
    if (startDate) {
      deadlineMs = startDate.getTime() + slaHours * 3600 * 1000;
    }
  }

  if (report.status === "Đã giải quyết") {
    return {
      state: "completed",
      label: "Đã đóng hồ sơ",
      shortLabel: "Hoàn tất",
      hoursRemaining: 0,
      deadlineLabel: report.resolvedAt || "Đã xong",
    };
  }

  if (!deadlineMs) {
    return {
      state: "on_track",
      label: `Mục tiêu ${slaHours}h`,
      shortLabel: `${slaHours}h`,
      hoursRemaining: slaHours,
      deadlineLabel: `Trong ${slaHours} giờ`,
    };
  }

  const diffHours = Math.round((deadlineMs - nowMs) / 3600000);
  const d = new Date(deadlineMs);
  const deadlineLabel = `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;

  if (diffHours < 0) {
    return {
      state: "overdue",
      label: `Quá hạn ${Math.abs(diffHours)}h`,
      shortLabel: `Trễ ${Math.abs(diffHours)}h`,
      hoursRemaining: diffHours,
      deadlineLabel,
    };
  }
  if (diffHours <= Math.max(2, Math.round(slaHours * 0.25))) {
    return {
      state: "warning",
      label: `Còn ${diffHours}h (Sắp hạn)`,
      shortLabel: `Còn ${diffHours}h`,
      hoursRemaining: diffHours,
      deadlineLabel,
    };
  }
  return {
    state: "on_track",
    label: `Còn ${diffHours}h (Trong hạn)`,
    shortLabel: `Còn ${diffHours}h`,
    hoursRemaining: diffHours,
    deadlineLabel,
  };
}

export function normalizeReport(report: FieldReport): FieldReport {
  const priority: ReportPriority = report.priority || getCategoryMeta(report.category).defaultPriority;
  const beforeImgs = getBeforeImages(report);
  const afterImgs = getAfterImages(report);
  const slaHours = report.slaHours || REPORT_PRIORITY_CONFIG[priority].slaHours;
  const start = parseVNDateTime(report.reportedAt) || new Date();
  const slaDeadline = report.slaDeadline || computeSlaDeadlineIso(priority, start);

  return {
    ...report,
    priority,
    slaHours,
    slaDeadline,
    assignedUnit: report.assignedUnit || getCategoryMeta(report.category).defaultUnit,
    beforeImage: beforeImgs[0],
    beforeImages: beforeImgs,
    afterImage: afterImgs[0],
    afterImages: afterImgs,
    messages: report.messages || [],
  };
}

export function maskPhoneForCitizen(phone: string | undefined, readOnly: boolean): string {
  if (!phone) return "Ẩn danh";
  if (!readOnly) return phone;
  const cleaned = phone.trim();
  if (cleaned.length < 7) return "***";
  return `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}`;
}

export function reportToTargetGisItem(report: FieldReport): TargetGisItem {
  // Quy đổi tọa độ phần trăm bản đồ lưới sang quanh KP3_CENTER nếu chưa có lat/lng chuẩn
  const lat =
    typeof report.lat === "number"
      ? report.lat
      : KP3_CENTER.lat + ((50 - (report.coordinates?.y ?? 50)) / 100) * 0.0045;
  const lng =
    typeof report.lng === "number"
      ? report.lng
      : KP3_CENTER.lng + (((report.coordinates?.x ?? 50) - 50) / 100) * 0.0045;

  return {
    id: report.id,
    type: "custom",
    name: `[1022] ${report.title}`,
    address: report.location,
    lat,
    lng,
    coordinates: decimalToDMS(lat, lng),
    navigateRoute: true,
  };
}

export interface PersistedReportMetadata {
  note?: string;
  assignedUnit?: string;
  assignedOfficer?: string;
  beforeImages?: string[];
  afterImages?: string[];
  messages?: ReportMessage[];
  timeline?: FieldReport["timeline"];
  slaDeadline?: string;
  citizenFeedback?: ReportFeedback;
  lat?: number;
  lng?: number;
}

export function parseReportMetadataFromResponse(raw?: string | null): PersistedReportMetadata {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return parsed as PersistedReportMetadata;
      }
    } catch {
      // Fallback sang plain note bên dưới
    }
  }
  return { note: raw };
}

export function serializeReportMetadata(report: FieldReport, latestNote?: string): string {
  const payload: PersistedReportMetadata = {
    note: latestNote,
    assignedUnit: report.assignedUnit,
    assignedOfficer: report.assignedOfficer,
    beforeImages: getBeforeImages(report),
    afterImages: getAfterImages(report),
    messages: report.messages || [],
    timeline: report.timeline,
    slaDeadline: report.slaDeadline,
    citizenFeedback: report.citizenFeedback,
    lat: report.lat,
    lng: report.lng,
  };
  return JSON.stringify(payload);
}

