export type SupervisionCategoryId =
  | "an_treo"
  | "cam_di_khoi_noi_cu_tru"
  | "cai_tao_kgg_quan_che"
  | "tha_tu_co_dieu_kien"
  | "chap_hanh_xong_an_tu"
  | "dac_xa"
  | "su_dung_ma_tuy"
  | "dang_cai_methadone"
  | "sau_cai_nghien"
  | "giao_duc_tai_phuong";

export type SupervisionGroupKey =
  | "thi_hanh_an"
  | "tai_hoa_nhap"
  | "phong_chong_ma_tuy"
  | "hanh_chinh";

export interface SupervisionCategoryMeta {
  id: SupervisionCategoryId;
  label: string;
  shortLabel: string;
  group: SupervisionGroupKey;
  groupLabel: string;
  legalBasis: string;
  defaultDurationMonths?: number;
  badgeColor: string;
}

export const SUPERVISION_CATEGORIES: SupervisionCategoryMeta[] = [
  {
    id: "an_treo",
    label: "Người đang hưởng Án treo",
    shortLabel: "Án treo",
    group: "thi_hanh_an",
    groupLabel: "Thi hành án hình sự & Tố tụng",
    legalBasis: "Luật Thi hành án hình sự 2019",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
  },
  {
    id: "cam_di_khoi_noi_cu_tru",
    label: "Cấm đi khỏi nơi cư trú / Tại ngoại",
    shortLabel: "Cấm đi khỏi nơi cư trú",
    group: "thi_hanh_an",
    groupLabel: "Thi hành án hình sự & Tố tụng",
    legalBasis: "Bộ luật Tố tụng hình sự 2015",
    badgeColor: "bg-red-50 text-red-800 border-red-200",
  },
  {
    id: "cai_tao_kgg_quan_che",
    label: "Cải tạo không giam giữ / Quản chế / Hoãn án",
    shortLabel: "Cải tạo KGG / Quản chế",
    group: "thi_hanh_an",
    groupLabel: "Thi hành án hình sự & Tố tụng",
    legalBasis: "Luật Thi hành án hình sự 2019",
    badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
  },
  {
    id: "tha_tu_co_dieu_kien",
    label: "Tha tù trước thời hạn có điều kiện",
    shortLabel: "Tha tù có điều kiện",
    group: "thi_hanh_an",
    groupLabel: "Thi hành án hình sự & Tố tụng",
    legalBasis: "Luật Thi hành án hình sự 2019",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "chap_hanh_xong_an_tu",
    label: "Người chấp hành xong án phạt tù (Tái hòa nhập)",
    shortLabel: "Chấp hành xong án tù",
    group: "tai_hoa_nhap",
    groupLabel: "Tái hòa nhập cộng đồng (NĐ 49/2020)",
    legalBasis: "Nghị định 49/2020/NĐ-CP",
    badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  {
    id: "dac_xa",
    label: "Người được Đặc xá",
    shortLabel: "Đặc xá",
    group: "tai_hoa_nhap",
    groupLabel: "Tái hòa nhập cộng đồng (NĐ 49/2020)",
    legalBasis: "Luật Đặc xá & Nghị định 49/2020/NĐ-CP",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    id: "su_dung_ma_tuy",
    label: "Quản lý người sử dụng trái phép chất ma túy",
    shortLabel: "Sử dụng ma túy (1 năm)",
    group: "phong_chong_ma_tuy",
    groupLabel: "Phòng, chống ma túy (Luật PCMT 2021)",
    legalBasis: "Điều 23 Luật Phòng, chống ma túy 2021",
    defaultDurationMonths: 12,
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    id: "dang_cai_methadone",
    label: "Đang cai nghiện tự nguyện / Điều trị Methadone",
    shortLabel: "Cai tự nguyện / Methadone",
    group: "phong_chong_ma_tuy",
    groupLabel: "Phòng, chống ma túy (Luật PCMT 2021)",
    legalBasis: "Luật Phòng, chống ma túy 2021",
    badgeColor: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
  },
  {
    id: "sau_cai_nghien",
    label: "Quản lý sau cai nghiện ma túy (1–2 năm)",
    shortLabel: "Sau cai nghiện",
    group: "phong_chong_ma_tuy",
    groupLabel: "Phòng, chống ma túy (Luật PCMT 2021)",
    legalBasis: "Điều 40 Luật Phòng, chống ma túy 2021",
    defaultDurationMonths: 24,
    badgeColor: "bg-violet-50 text-violet-800 border-violet-200",
  },
  {
    id: "giao_duc_tai_phuong",
    label: "Giáo dục tại phường / Đối tượng cần cảm hóa",
    shortLabel: "Giáo dục tại phường",
    group: "hanh_chinh",
    groupLabel: "Xử lý hành chính & Cảm hóa cơ sở",
    legalBasis: "Luật Xử lý vi phạm hành chính",
    defaultDurationMonths: 6,
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },
];

export type SupervisionRecordStatus =
  | "active"
  | "warning_absent"
  | "completed"
  | "expunged";

export interface SupervisionCheckinLog {
  id: string;
  dateIso: string;
  type: "trinh_dien" | "tiep_xuc_cam_hoa" | "test_nhanh_am_tinh" | "test_nhanh_duong_tinh" | "vang_mat_luu_y";
  note: string;
  recordedBy: string;
}

export interface ReintegrationSupportFlags {
  cccdAndResidency: boolean;
  jobReferral: boolean;
  policyLoan: boolean;
  legalCounseling: boolean;
}

export interface SpecialSupervisionRecord {
  id: string;
  residentId?: string;
  fullName: string;
  birthYear?: string;
  cccd?: string;
  phone?: string;
  address: string;
  residenceType?: string;
  categories: SupervisionCategoryId[];
  decisionNumber?: string;
  issuingAuthority?: string;
  startDateIso: string;
  endDateIso?: string;
  assignedOfficer: string;
  status: SupervisionRecordStatus;
  reintegration: ReintegrationSupportFlags;
  checkins: SupervisionCheckinLog[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export function getSupervisionCategoryMeta(id: SupervisionCategoryId): SupervisionCategoryMeta {
  return (
    SUPERVISION_CATEGORIES.find((c) => c.id === id) || SUPERVISION_CATEGORIES[0]
  );
}

/**
 * Strict RBAC check (Nghị định 13/2023/NĐ-CP):
 * Only Admin / Bí thư Chi bộ / Trưởng BĐH KP3 / CSKV / Tổ Bảo vệ ANTT cơ sở can view this sensitive module.
 */
export function canAccessSpecialSupervision(user?: {
  username?: string;
  fullName?: string;
  role?: string;
  title?: string;
} | null): boolean {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  const title = String(user.title || "").toLowerCase();
  const username = String(user.username || "").toLowerCase();

  if (role === "admin" || username === "bdhkhupho3.ap@gmail.com") return true;
  if (role === "canbo") {
    if (
      title.includes("bí thư") ||
      title.includes("bi thu") ||
      title.includes("quản trị") ||
      title.includes("quan tri") ||
      title.includes("trưởng khu phố") ||
      title.includes("truong khu pho") ||
      title.includes("công an") ||
      title.includes("cong an") ||
      title.includes("cskv") ||
      title.includes("antt") ||
      title.includes("an ninh")
    ) {
      return true;
    }
  }
  return false;
}

export function computeDaysUntilEnd(
  endDateIso?: string,
  referenceDate: Date = new Date()
): number | null {
  if (!endDateIso) return null;
  const parsed = new Date(`${endDateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const refDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  return Math.round((parsed.getTime() - refDay.getTime()) / (1000 * 60 * 60 * 24));
}

export function maskPersonName(fullName: string): string {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return "***";
  return `${parts[0]} ${parts
    .slice(1)
    .map((p) => `${p.charAt(0)}***`)
    .join(" ")}`;
}

export function maskCccdNumber(cccd?: string): string {
  const digits = String(cccd || "").replace(/\D/g, "");
  if (digits.length < 6) return "Chưa cập nhật";
  return `${digits.slice(0, 3)}*****${digits.slice(-4)}`;
}
