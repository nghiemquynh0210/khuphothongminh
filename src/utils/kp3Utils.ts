import type {
  Resident,
  Household,
  Business,
  FieldReport,
  FundContribution,
  FundExpenditure,
  WelfareRecipient,
  CommunityEvent,
  TaskItem,
} from "../types";

export const KP3_OFFICIAL_BASELINE = {
  households: 488,
  population: 11632,
  activeBusinessesTotal: 118,
  residentialGroups: 14,
} as const;

export const KP3_TO_LIST: string[] = Array.from(
  { length: KP3_OFFICIAL_BASELINE.residentialGroups },
  (_, idx) => `Tổ ${idx + 1}`
);

/**
 * Extracts "Tổ 1" .. "Tổ 14" from a KP3 address string; falls back to deterministic mapping
 * for known KP3 alleys/streets if the literal "Tổ X" prefix is absent.
 */
export function extractToDanPho(address?: string): string {
  if (!address) return "Chưa phân tổ";
  const direct = address.match(/\bTổ\s*(1[0-4]|[1-9])\b/i);
  if (direct) return `Tổ ${direct[1]}`;

  const tdpMatch = address.match(/\bTDP\s*(1[0-4]|[1-9])\b/i);
  if (tdpMatch) return `Tổ ${tdpMatch[1]}`;

  const lower = address.toLowerCase();
  if (lower.includes("42/3") || lower.includes("42/5") || lower.includes("42 lương")) return "Tổ 1";
  if (lower.includes("42/12") || lower.includes("18/2") || lower.includes("18/5")) return "Tổ 2";
  if (lower.includes("56 lương") || lower.includes("56/2") || lower.includes("68/9")) return "Tổ 3";
  if (lower.includes("72 lương") || lower.includes("78 lương") || lower.includes("80 lương")) return "Tổ 4";
  if (lower.includes("90 lương") || lower.includes("10/4")) return "Tổ 5";
  if (lower.includes("song hành")) return "Tổ 7";
  if (lower.includes("mai chí thọ")) return "Tổ 10";
  return "Tổ 1";
}

/**
 * Formats decimals with comma for Vietnamese typography (e.g. 66.7 -> "66,7").
 */
export function formatDecimalVN(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Masks citizen ID card numbers for privacy-by-default presentation on shared screens.
 */
export function maskCccd(cccd?: string, reveal = false): string {
  if (!cccd) return "Chưa cập nhật";
  const trimmed = cccd.trim();
  if (reveal || trimmed.length < 7) return trimmed;
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

/**
 * Masks phone numbers for privacy-by-default presentation on shared screens.
 */
export function maskPhone(phone?: string, reveal = false): string {
  if (!phone) return "Chưa có SĐT";
  const trimmed = phone.trim();
  if (reveal || trimmed.length < 7) return trimmed;
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;
}

export type ExpiryState = "valid" | "warning" | "expired" | "none";

export function getResidentExpiryStatus(expDateStr?: string): {
  status: ExpiryState;
  daysLeft: number | null;
  label: string;
} {
  if (!expDateStr) return { status: "none", daysLeft: null, label: "Không có hạn" };
  let parsed: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(expDateStr)) {
    parsed = new Date(expDateStr);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(expDateStr)) {
    const [d, m, y] = expDateStr.split("/").map(Number);
    parsed = new Date(y, m - 1, d);
  }
  if (!parsed || isNaN(parsed.getTime())) {
    return { status: "none", daysLeft: null, label: expDateStr };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  const diffDays = Math.round((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: "expired", daysLeft: diffDays, label: `Quá hạn ${Math.abs(diffDays)} ngày` };
  }
  if (diffDays <= 30) {
    return { status: "warning", daysLeft: diffDays, label: `Còn ${diffDays} ngày` };
  }
  return { status: "valid", daysLeft: diffDays, label: `Còn ${diffDays} ngày` };
}

/**
 * Computes consistent demographic counts reconciling full KP3 baseline vs digitized records.
 */
export function computeKp3PopulationMetrics(residents: Resident[], households: Household[]) {
  const digitizedResidentsCount = residents.length;
  const digitizedHouseholdsCount = households.length;
  const matchedHouseholds = households.filter((h) => (h.members?.length || 0) > 0);
  const matchedMemberTotal = matchedHouseholds.reduce((sum, h) => sum + (h.members?.length || 0), 0);

  // Average inside fully itemized household books (never dividing 12 demo residents by 488)
  const avgPerDigitizedHousehold =
    matchedHouseholds.length > 0 ? matchedMemberTotal / matchedHouseholds.length : 0;

  const officialPopulation =
    digitizedResidentsCount >= KP3_OFFICIAL_BASELINE.population
      ? digitizedResidentsCount
      : KP3_OFFICIAL_BASELINE.population;

  const officialHouseholds =
    digitizedHouseholdsCount > 0 ? digitizedHouseholdsCount : KP3_OFFICIAL_BASELINE.households;

  return {
    officialPopulation,
    officialHouseholds,
    digitizedResidentsCount,
    matchedHouseholdsCount: matchedHouseholds.length,
    avgPerDigitizedHousehold,
    avgPerDigitizedHouseholdLabel:
      avgPerDigitizedHousehold > 0 ? formatDecimalVN(avgPerDigitizedHousehold, 1) : "—",
  };
}

/**
 * Classifies corporate legal entities (DNNVV) cleanly vs household establishments/hostels.
 */
export function isEnterpriseRecord(b: Business): boolean {
  if (b.isAccommodation) return false;
  if (
    b.businessType === "Công ty TNHH" ||
    b.businessType === "Công ty Cổ phần" ||
    b.businessType === "Doanh nghiệp tư nhân"
  ) {
    return true;
  }
  const lowerType = (b.type || "").toLowerCase();
  const lowerName = (b.name || "").toLowerCase();
  if (
    b.businessType !== "Hộ kinh doanh" &&
    (lowerType.includes("doanh nghiệp") ||
      lowerName.startsWith("công ty") ||
      lowerName.includes("tnhh") ||
      lowerName.includes("cổ phần"))
  ) {
    return true;
  }
  return false;
}

export function isSmallBusinessOrHostel(b: Business): boolean {
  return !isEnterpriseRecord(b);
}

/**
 * Exports any array of tabular rows to UTF-8 BOM CSV cleanly for Vietnamese Excel compatibility.
 */
export function exportCsvUTF8(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const s = String(cell ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const csvLines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Creates a synchronized TaskItem directly from a FieldReport (Phản ánh 1022).
 */
export function createTaskFromReport(report: FieldReport, creatorName = "Ban Điều hành KP3"): TaskItem {
  const priorityMap: Record<string, TaskItem["priority"]> = {
    "Khẩn cấp": "Khẩn cấp",
    "Cao": "Cao",
    "Bình thường": "Trung bình",
  };
  const d = new Date();
  d.setDate(d.getDate() + 2);
  const deadlineStr = d.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  return {
    id: `TASK-PA-${Date.now().toString().slice(-5)}`,
    title: `[1022] ${report.title}`,
    description: `Xử lý phản ánh tại ${report.location}. Nội dung: ${report.description}`,
    unit: report.assignedUnit || extractToDanPho(report.location),
    assignee: {
      name: report.assignedOfficer || "Tổ trưởng phụ trách",
      role: "Cán bộ xử lý hiện trường",
      unit: report.assignedUnit || extractToDanPho(report.location),
    },
    creator: creatorName,
    priority: priorityMap[report.priority || "Bình thường"] || "Trung bình",
    status: report.status === "Đã giải quyết" ? "Hoàn thành" : "Đang thực hiện",
    progressPercent: report.status === "Đã giải quyết" ? 100 : 25,
    startDate: todayStr,
    deadline: deadlineStr,
    notes: `Liên kết tự động từ phản ánh mã ${report.id}`,
  };
}

export interface Kp3AssistantContext {
  residents: Resident[];
  households: Household[];
  businesses: Business[];
  reports: FieldReport[];
  welfareRecipients: WelfareRecipient[];
  fundContributions: FundContribution[];
  fundExpenditures: FundExpenditure[];
  communityEvents: CommunityEvent[];
  tasks: TaskItem[];
}

/**
 * Generates contextual, accurate Vietnamese answers from live KP3 state when AI server
 * isn't available or as structured grounding context.
 */
export function generateKp3AssistantReply(
  query: string,
  ctx: Kp3AssistantContext,
  mode: "canbo" | "cudan"
): string {
  const q = query.trim().toLowerCase();
  const pop = computeKp3PopulationMetrics(ctx.residents, ctx.households);
  const openReports = ctx.reports.filter((r) => r.status !== "Đã giải quyết");
  const expiringResidents = ctx.residents.filter((r) => {
    const st = getResidentExpiryStatus(r.temporaryExpDate).status;
    return st === "warning" || st === "expired";
  });
  const totalThu = ctx.fundContributions
    .filter((c) => c.status === "Đã nộp")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const totalChi = ctx.fundExpenditures.reduce((s, e) => s + (e.amount || 0), 0);
  const openTasks = ctx.tasks.filter((t) => t.status !== "Hoàn thành");

  if (q.includes("tạm trú") || q.includes("hết hạn") || q.includes("ct01")) {
    if (mode === "canbo") {
      return [
        "**Thống kê Cư trú & Tạm trú KP3 (Dữ liệu trực tiếp):**",
        `- Tổng quy mô địa bàn: **${pop.officialPopulation.toLocaleString("vi-VN")} nhân khẩu** / **${pop.officialHouseholds.toLocaleString("vi-VN")} sổ hộ**.`,
        `- Hồ sơ đã số hóa chi tiết: **${ctx.residents.length} hồ sơ** (${ctx.residents.filter((r) => r.status === "Tạm trú").length} tạm trú, ${ctx.residents.filter((r) => r.isForeigner).length} người nước ngoài).`,
        `- Cảnh báo hạn tạm trú (≤30 ngày hoặc quá hạn): **${expiringResidents.length} trường hợp**.`,
        "1. Vào mục **Quản lý Dân cư** và chọn thẻ lọc **Sắp hết hạn / Quá hạn**.",
        "2. Nhấn **Gia hạn / Nhắc chủ nhà trọ** hoặc giao việc sang mục **Lịch & Nhiệm vụ**.",
      ].join("\n");
    }
    return [
      "**Hướng dẫn Đăng ký Tạm trú / Khai báo lưu trú tại Khu phố 3:**",
      "1. Chuẩn bị **CCCD gắn chip**, **Tờ khai CT01** (tải tại mục *Biểu mẫu hành chính*) và hợp đồng thuê nhà hoặc văn bản đồng ý của chủ hộ.",
      "2. Thực hiện trực tuyến qua ứng dụng **VNeID (mức 2)** hoặc **Cổng Dịch vụ công Quốc gia (`dichvucong.gov.vn`)**.",
      "3. Liên hệ Tổ trưởng Tổ dân phố (Tổ 1–14) hoặc Cảnh sát khu vực Công an Phường An Phú khi cần xác nhận cư trú thực tế.",
    ].join("\n");
  }

  if (q.includes("phản ánh") || q.includes("1022") || q.includes("rác")) {
    return [
      `**Tình hình Phản ánh hiện trường 1022 tại KP3:**`,
      `- Tổng hồ sơ phản ánh: **${ctx.reports.length} hồ sơ** (**${openReports.length} hồ sơ đang cần xử lý**).`,
      openReports[0]
        ? `- Hồ sơ ưu tiên gần nhất: **${openReports[0].title}** tại *${openReports[0].location}* (${openReports[0].status}).`
        : "- Tất cả phản ánh đã được xử lý xong.",
      mode === "canbo"
        ? "1. Vào **Phản ánh hiện trường** để phân công cho Tổ dân phố hoặc đẩy sang **Lịch & Nhiệm vụ**.\n2. Cập nhật ảnh nghiệm thu sau xử lý để cư dân đánh giá hài lòng."
        : "1. Vào **Phản ánh hiện trường** -> nhấn **Gửi phản ánh mới** kèm ảnh chụp & vị trí 1 chạm trên Sơ đồ KP3.\n2. Theo dõi phản hồi của cán bộ trực tiếp trên dòng thời gian của hồ sơ.",
    ].join("\n");
  }

  if (q.includes("quỹ") || q.includes("vietqr") || q.includes("thu chi")) {
    return [
      "**Tình hình Quỹ Khu phố 3 (Số liệu trực tiếp):**",
      `- Tổng thu đã nộp: **${totalThu.toLocaleString("vi-VN")}đ** (${ctx.fundContributions.filter((c) => c.status === "Đã nộp").length} phiếu thu).`,
      `- Tổng chi hoạt động: **${totalChi.toLocaleString("vi-VN")}đ** (${ctx.fundExpenditures.length} phiếu chi).`,
      `- Cân đối tồn quỹ: **${(totalThu - totalChi).toLocaleString("vi-VN")}đ**.`,
      mode === "cudan"
        ? "- Bạn có thể vào mục **Quỹ Khu phố → Cổng Tra Cứu & Đóng Quỹ VietQR** và nhập mã hộ (VD: `HK-301`) để quét mã QR thanh toán minh bạch."
        : "- Cán bộ có thể lập phiếu thu/chi, chỉnh sửa danh mục quỹ hoặc đối soát biên lai tại phân hệ **Quỹ Khu phố**.",
    ].join("\n");
  }

  if (q.includes("bí thư") || q.includes("liên hệ") || q.includes("ban điều hành") || q.includes("ai là")) {
    return [
      "**Thông tin Liên hệ Ban Điều hành Khu phố 3, Phường An Phú:**",
      "- **Bí thư Chi bộ KP3:** Ông Nguyễn Văn Hùng — SĐT: `0903.829.112`",
      "- **Trưởng Khu phố:** Bà Lê Thị Mai — SĐT: `0987.654.321`",
      "- **Trưởng Ban Điều hành KP3:** Ông Nguyễn Trung Huy — SĐT: `0909.123.888`",
      "- **Tiếp công dân định kỳ:** Sáng thứ Bảy hàng tuần (08:00 – 11:00) tại Nhà văn hóa Khu phố 3.",
    ].join("\n");
  }

  if (q.includes("nhiệm vụ") || q.includes("báo cáo") || q.includes("soạn thông báo") || q.includes("việc")) {
    const upcomingEvent = ctx.communityEvents.find((e) => e.status === "Sắp diễn ra");
    return [
      "**Tổng hợp Điều hành Nhiệm vụ & Lịch KP3:**",
      `- Công việc chưa hoàn thành: **${openTasks.length}/${ctx.tasks.length} nhiệm vụ**.`,
      `- Đối tượng An sinh xã hội: **${ctx.welfareRecipients.length} trường hợp** đang quản lý.`,
      upcomingEvent
        ? `- Sự kiện sắp tới: **${upcomingEvent.title}** (${upcomingEvent.dateTime} tại ${upcomingEvent.location}).`
        : "- Hiện chưa có sự kiện mới sắp diễn ra.",
      "- Nếu cần soạn nhanh thông báo cho bà con, hãy mở **Tin tức & Sự kiện** và nhấn **Đăng Bản tin & Thông báo mới**.",
    ].join("\n");
  }

  return [
    `Tôi đã kiểm tra nhanh dữ liệu **Khu phố 3, Phường An Phú**:`,
    `- Quy mô: **${pop.officialHouseholds.toLocaleString("vi-VN")} hộ** / **${pop.officialPopulation.toLocaleString("vi-VN")} nhân khẩu** (${ctx.residents.length} hồ sơ số hóa chi tiết).`,
    `- Phản ánh 1022 chưa xử lý: **${openReports.length} hồ sơ** • Công việc đang mở: **${openTasks.length} việc**.`,
    `- Đối tượng An sinh: **${ctx.welfareRecipients.length} người** • Sự kiện cộng đồng: **${ctx.communityEvents.length}**.`,
    `Bạn có thể hỏi cụ thể hơn về: *tạm trú*, *phản ánh 1022*, *quỹ VietQR*, *nhiệm vụ tổ dân phố* hoặc *liên hệ Ban Điều hành*.`,
  ].join("\n");
}

/**
 * Formats long UUID/database IDs into concise readable record codes for modal headers and cards.
 */
export function formatShortRecordId(id?: string | null, prefix = "KP3"): string {
  const raw = (id || "").trim();
  if (!raw) return `${prefix}-—`;
  if (raw.length <= 16) return raw;
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${compact}`;
}

