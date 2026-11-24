import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Award,
  Baby,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  GraduationCap,
  Heart,
  Search,
  Shield,
  Square,
  CheckSquare,
  Users,
} from "lucide-react";
import { Resident } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { formatVNNumber } from "../../utils/numberFormat";
import { formatCompactKp3Address } from "../../utils/householdRecognitionUtils";
import { getEffectiveResidencyStatus } from "../../utils/residencyClassifier";
import { maskCccd } from "../../utils/kp3Utils";
import { recordAuditLog } from "../../utils/auditLogger";
import { loadPortalSetting, savePortalSetting } from "../../utils/supabaseSync";

export type CohortPresetId =
  | "nvqs_17"
  | "nvqs_18_25"
  | "nvqs_18_27"
  | "longevity_all"
  | "child_under3"
  | "school_5"
  | "school_6"
  | "school_11"
  | "cccd_14";

export type Nvqs1827Status =
  | "unreviewed"
  | "eligible"
  | "serving"
  | "completed"
  | "militia"
  | "deferred_health"
  | "deferred_student"
  | "deferred_highschool"
  | "deferred_policy_family"
  | "deferred_other"
  | "exempt_policy"
  | "ineligible";

export interface NvqsStatusOption {
  value: Nvqs1827Status;
  label: string;
  shortLabel: string;
  group: "ready" | "active_done" | "deferred" | "exempt";
  legalHint: string;
  badgeClass: string;
}

export const NVQS_1827_STATUS_OPTIONS: NvqsStatusOption[] = [
  {
    value: "unreviewed",
    label: "Chưa rà soát",
    shortLabel: "Chưa rà soát",
    group: "ready",
    legalHint: "Chưa phân loại nguồn",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "eligible",
    label: "Đủ ĐK sơ tuyển / khám tuyển",
    shortLabel: "Đủ ĐK sơ tuyển",
    group: "ready",
    legalHint: "Điều 30 Luật NVQS — Sẵn sàng gọi khám sức khỏe",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    value: "serving",
    label: "Đang thực hiện NVQS / CAND",
    shortLabel: "Đang tại ngũ",
    group: "active_done",
    legalHint: "Đang tại ngũ Quân đội hoặc nghĩa vụ Công an nhân dân",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    value: "completed",
    label: "Đã hoàn thành NVQS / Xuất ngũ",
    shortLabel: "Đã hoàn thành",
    group: "active_done",
    legalHint: "Đã hoàn thành nghĩa vụ tại ngũ, chuyển ngạch dự bị",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
  },
  {
    value: "militia",
    label: "Đang là Dân quân thường trực",
    shortLabel: "Dân quân TT",
    group: "active_done",
    legalHint: "Khoản 1 Điều 41 (bổ sung theo Luật Dân quân tự vệ 2019)",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300",
  },
  {
    value: "deferred_health",
    label: "Tạm hoãn — Chưa đủ sức khỏe (TT 105/2023)",
    shortLabel: "Hoãn: Sức khỏe",
    group: "deferred",
    legalHint: "Điểm a K1 Đ41 • TT 105/2023/TT-BQP (Loại 4–5, cận >1,5 độ...)",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    value: "deferred_student",
    label: "Tạm hoãn — Sinh viên ĐH / CĐ chính quy",
    shortLabel: "Hoãn: Sinh viên",
    group: "deferred",
    legalHint: "Điểm g K1 Đ41 — 01 khóa đào tạo chính quy (gọi lại đến hết 27t)",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    value: "deferred_highschool",
    label: "Tạm hoãn — Học sinh phổ thông (THPT)",
    shortLabel: "Hoãn: Học sinh",
    group: "deferred",
    legalHint: "Điểm g K1 Đ41 — Đang học tại cơ sở giáo dục phổ thông",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    value: "deferred_policy_family",
    label: "Tạm hoãn — Gia đình chính sách / Hoàn cảnh ĐB",
    shortLabel: "Hoãn: GĐ Chính sách",
    group: "deferred",
    legalHint: "Lao động duy nhất; thiên tai; 1 con bệnh binh/da cam 61-80%; anh/em tại ngũ",
    badgeClass: "bg-orange-50 text-orange-900 border-orange-200",
  },
  {
    value: "deferred_other",
    label: "Tạm hoãn — Lý do khác (Di dân, vùng ĐBKK...)",
    shortLabel: "Hoãn: Lý do khác",
    group: "deferred",
    legalHint: "Di dân 3 năm đầu, công tác vùng ĐBKK hoặc lý do hợp lệ khác",
    badgeClass: "bg-yellow-50 text-yellow-900 border-yellow-200",
  },
  {
    value: "exempt_policy",
    label: "Miễn gọi nhập ngũ (Chính sách / Cơ yếu)",
    shortLabel: "Miễn gọi nhập ngũ",
    group: "exempt",
    legalHint: "Khoản 2 Điều 41 — Con liệt sĩ/TB hạng 1, 1 anh/em liệt sĩ, cơ yếu...",
    badgeClass: "bg-purple-50 text-purple-900 border-purple-200",
  },
  {
    value: "ineligible",
    label: "Không đủ tiêu chuẩn / Tạm dừng theo quy định",
    shortLabel: "Không đủ TC",
    group: "exempt",
    legalHint: "Không đủ tiêu chuẩn chính trị, đạo đức hoặc đang bị truy cứu",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
];

export interface NvqsRecordEntry {
  residentKey: string;
  age17Registered?: boolean;
  age17RegDate?: string;
  age17CertNumber?: string;
  status1827?: Nvqs1827Status;
  detailNote?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const NVQS_RECORDS_STORAGE_KEY = "kp3_nvqs_records_v1";

export function getNvqsResidentKey(r: Resident): string {
  const cleanCccd = String(r.cccd || "").replace(/\D/g, "");
  return cleanCccd.length >= 9 ? cleanCccd : r.id;
}

export function getNvqsStatusMeta(status?: Nvqs1827Status): NvqsStatusOption {
  return (
    NVQS_1827_STATUS_OPTIONS.find((o) => o.value === status) || NVQS_1827_STATUS_OPTIONS[0]
  );
}

export interface CohortPresetDef {
  id: CohortPresetId;
  group: "Nghĩa vụ Quân sự" | "Mừng thọ NCT" | "Trẻ em & Căn cước";
  label: string;
  shortBadge: string;
  legalBasis: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const COHORT_PRESETS: CohortPresetDef[] = [
  {
    id: "nvqs_17",
    group: "Nghĩa vụ Quân sự",
    label: "Nam đủ 17 tuổi (Đăng ký NVQS lần đầu)",
    shortBadge: "17 tuổi • Nam",
    legalBasis: "Điều 12 Luật NVQS 2015 — Đăng ký trực tiếp tại Ban CHQS Phường hoặc trực tuyến",
    icon: Shield,
  },
  {
    id: "nvqs_18_25",
    group: "Nghĩa vụ Quân sự",
    label: "Nam 18 – 25 tuổi (Gọi nhập ngũ phổ thông)",
    shortBadge: "18–25t • Nam",
    legalBasis: "Điều 30, Điều 41 Luật NVQS 2015 & Thông tư 105/2023/TT-BQP",
    icon: Shield,
  },
  {
    id: "nvqs_18_27",
    group: "Nghĩa vụ Quân sự",
    label: "Nam 18 – 27 tuổi (Gồm diện CĐ / Đại học)",
    shortBadge: "18–27t • Nam",
    legalBasis: "Điều 30, Điều 41 Luật NVQS (độ tuổi kéo dài đến hết 27 tuổi)",
    icon: Shield,
  },
  {
    id: "longevity_all",
    group: "Mừng thọ NCT",
    label: "Mừng thọ tròn 70, 75, 80, 85, 90, 95, 100+ tuổi",
    shortBadge: "Chúc thọ NCT",
    legalBasis: "Điều 21 Luật Người cao tuổi 2009",
    icon: Award,
  },
  {
    id: "child_under3",
    group: "Trẻ em & Căn cước",
    label: "Trẻ 0 – 2 tuổi (Tiêm chủng & Vitamin A)",
    shortBadge: "0–2 tuổi",
    legalBasis: "Chương trình Tiêm chủng mở rộng & Y tế cơ sở",
    icon: Baby,
  },
  {
    id: "school_5",
    group: "Trẻ em & Căn cước",
    label: "Trẻ 5 tuổi (Phổ cập Mầm non mẫu giáo lớn)",
    shortBadge: "5 tuổi",
    legalBasis: "Phổ cập giáo dục mầm non cho trẻ em 5 tuổi",
    icon: Heart,
  },
  {
    id: "school_6",
    group: "Trẻ em & Căn cước",
    label: "Trẻ 6 tuổi (Tuyển sinh vào Lớp 1)",
    shortBadge: "6 tuổi • Lớp 1",
    legalBasis: "Kế hoạch huy động trẻ ra lớp đầu cấp hằng năm",
    icon: GraduationCap,
  },
  {
    id: "school_11",
    group: "Trẻ em & Căn cước",
    label: "Trẻ 11 tuổi (Tuyển sinh vào Lớp 6)",
    shortBadge: "11 tuổi • Lớp 6",
    legalBasis: "Kế hoạch tuyển sinh đầu cấp THCS hằng năm",
    icon: GraduationCap,
  },
  {
    id: "cccd_14",
    group: "Trẻ em & Căn cước",
    label: "Công dân đủ 14 tuổi (Cấp Căn cước lần đầu)",
    shortBadge: "14 tuổi • Căn cước",
    legalBasis: "Điều 19 Luật Căn cước 2023",
    icon: CreditCard,
  },
];

export function extractResidentBirthYear(birthDate?: string): number | null {
  if (!birthDate) return null;
  const match = String(birthDate).match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return null;
  const yr = parseInt(match[1], 10);
  if (Number.isNaN(yr) || yr < 1900 || yr > 2100) return null;
  return yr;
}

export interface ScannedCohortResident {
  resident: Resident;
  birthYear: number;
  ageInTargetYear: number;
  residencyLabel: "Thường trú" | "Tạm trú" | "Tạm vắng";
  cohortNote: string;
}

export function scanResidentsByCohort(
  residents: Resident[],
  presetId: CohortPresetId,
  targetYear: number,
  options?: {
    residencyFilter?: "all" | "Thường trú" | "Tạm trú";
    longevityMilestoneFilter?: number | "all";
    searchQuery?: string;
  }
): ScannedCohortResident[] {
  const resFilter = options?.residencyFilter || "all";
  const milestoneFilter = options?.longevityMilestoneFilter || "all";
  const q = (options?.searchQuery || "").trim().toLowerCase();
  const LONGEVITY_MILESTONES = [70, 75, 80, 85, 90, 95];

  const results: ScannedCohortResident[] = [];

  for (const r of residents) {
    const birthYear = extractResidentBirthYear(r.birthDate);
    if (!birthYear) continue;
    const age = targetYear - birthYear;
    if (age < 0 || age > 130) continue;

    const effStatus = getEffectiveResidencyStatus(r);
    if (resFilter !== "all" && effStatus !== resFilter) continue;

    let matched = false;
    let cohortNote = "";

    switch (presetId) {
      case "nvqs_17":
        if (r.gender === "Nam" && age === 17) {
          matched = true;
          cohortNote = `Sinh năm ${birthYear} — Đăng ký NVQS tuổi 17`;
        }
        break;
      case "nvqs_18_25":
        if (r.gender === "Nam" && age >= 18 && age <= 25) {
          matched = true;
          cohortNote = `Sinh năm ${birthYear} (${age} tuổi) — Độ tuổi gọi nhập ngũ phổ thông`;
        }
        break;
      case "nvqs_18_27":
        if (r.gender === "Nam" && age >= 18 && age <= 27) {
          matched = true;
          cohortNote =
            age > 25
              ? `Sinh năm ${birthYear} (${age} tuổi • Diện tốt nghiệp CĐ/ĐH)`
              : `Sinh năm ${birthYear} (${age} tuổi)`;
        }
        break;
      case "longevity_all": {
        const isMilestone = LONGEVITY_MILESTONES.includes(age) || age >= 100;
        if (isMilestone) {
          if (milestoneFilter === "all") {
            matched = true;
          } else if (milestoneFilter === 100) {
            matched = age >= 100;
          } else {
            matched = age === milestoneFilter;
          }
          if (matched) {
            cohortNote =
              age >= 100
                ? `Thượng thượng thọ ${age} tuổi (Sinh năm ${birthYear})`
                : `Mừng thọ tròn ${age} tuổi (Sinh năm ${birthYear})`;
          }
        }
        break;
      }
      case "child_under3":
        if (age >= 0 && age <= 2) {
          matched = true;
          cohortNote = `Trẻ ${age === 0 ? "dưới 12 tháng" : `${age} tuổi`} (Sinh năm ${birthYear})`;
        }
        break;
      case "school_5":
        if (age === 5) {
          matched = true;
          cohortNote = `Trẻ 5 tuổi — Phổ cập Mầm non (Sinh năm ${birthYear})`;
        }
        break;
      case "school_6":
        if (age === 6) {
          matched = true;
          cohortNote = `Trẻ 6 tuổi — Vào Lớp 1 năm học ${targetYear}–${targetYear + 1}`;
        }
        break;
      case "school_11":
        if (age === 11) {
          matched = true;
          cohortNote = `Trẻ 11 tuổi — Vào Lớp 6 năm học ${targetYear}–${targetYear + 1}`;
        }
        break;
      case "cccd_14":
        if (age === 14) {
          matched = true;
          cohortNote = `Đủ 14 tuổi (Sinh năm ${birthYear}) — Cấp Thẻ Căn cước lần đầu`;
        }
        break;
    }

    if (!matched) continue;

    if (q) {
      const hay = `${r.fullName} ${r.cccd || ""} ${r.phone || ""} ${r.address || ""} ${
        r.ownerName || ""
      }`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    results.push({
      resident: r,
      birthYear,
      ageInTargetYear: age,
      residencyLabel: effStatus,
      cohortNote,
    });
  }

  return results.sort((a, b) => {
    if (b.ageInTargetYear !== a.ageInTargetYear) {
      return b.ageInTargetYear - a.ageInTargetYear;
    }
    return a.resident.fullName.localeCompare(b.resident.fullName, "vi");
  });
}

export interface AgeCohortScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  actorName?: string;
  onOpenResidentDetail?: (resident: Resident) => void;
}

export function AgeCohortScannerModal({
  isOpen,
  onClose,
  residents,
  actorName = "Cán bộ Ban Điều hành KP3",
  onOpenResidentDetail,
}: AgeCohortScannerModalProps) {
  const currentYear = new Date().getFullYear();
  const [targetYear, setTargetYear] = useState<number>(currentYear);
  const [presetId, setPresetId] = useState<CohortPresetId>("nvqs_18_27");
  const [residencyFilter, setResidencyFilter] = useState<"all" | "Thường trú" | "Tạm trú">(
    "Thường trú"
  );
  const [longevityMilestone, setLongevityMilestone] = useState<number | "all">("all");
  const [nvqs17Filter, setNvqs17Filter] = useState<"all" | "unregistered" | "registered">("all");
  const [nvqs1827Filter, setNvqs1827Filter] = useState<
    "all" | "unreviewed" | "eligible" | "serving_done" | "deferred" | "exempt"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealCccd, setRevealCccd] = useState(false);
  const [exportedToast, setExportedToast] = useState<string | null>(null);

  // Persistent NVQS tracking map keyed by residentKey (CCCD || id)
  const [nvqsRecords, setNvqsRecords] = useState<Record<string, NvqsRecordEntry>>(() => {
    try {
      const raw = localStorage.getItem(NVQS_RECORDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      const cloud = await loadPortalSetting<Record<string, NvqsRecordEntry>>(
        NVQS_RECORDS_STORAGE_KEY
      );
      if (active && cloud && typeof cloud === "object") {
        setNvqsRecords((prev) => {
          const merged = { ...prev, ...cloud };
          try {
            localStorage.setItem(NVQS_RECORDS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  const updateNvqsRecord = (resident: Resident, patch: Partial<NvqsRecordEntry>) => {
    const key = getNvqsResidentKey(resident);
    setNvqsRecords((prev) => {
      const nextEntry: NvqsRecordEntry = {
        ...prev[key],
        residentKey: key,
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: actorName,
      };
      const nextMap = { ...prev, [key]: nextEntry };
      try {
        localStorage.setItem(NVQS_RECORDS_STORAGE_KEY, JSON.stringify(nextMap));
      } catch {}
      void savePortalSetting(NVQS_RECORDS_STORAGE_KEY, nextMap, false);
      return nextMap;
    });
  };

  const activePreset = useMemo(
    () => COHORT_PRESETS.find((p) => p.id === presetId) || COHORT_PRESETS[0],
    [presetId]
  );

  const presetCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of COHORT_PRESETS) {
      map[p.id] = scanResidentsByCohort(residents, p.id, targetYear, {
        residencyFilter,
      }).length;
    }
    return map;
  }, [residents, targetYear, residencyFilter]);

  const baseMatchedList = useMemo(
    () =>
      scanResidentsByCohort(residents, presetId, targetYear, {
        residencyFilter,
        longevityMilestoneFilter: presetId === "longevity_all" ? longevityMilestone : "all",
        searchQuery,
      }),
    [residents, presetId, targetYear, residencyFilter, longevityMilestone, searchQuery]
  );

  // Derived NVQS summary stats for active list
  const nvqs17Stats = useMemo(() => {
    if (presetId !== "nvqs_17") return null;
    let registered = 0;
    for (const item of baseMatchedList) {
      const rec = nvqsRecords[getNvqsResidentKey(item.resident)];
      if (rec?.age17Registered) registered++;
    }
    const total = baseMatchedList.length;
    const unregistered = total - registered;
    const pct = total > 0 ? Math.round((registered / total) * 100) : 0;
    return { total, registered, unregistered, pct };
  }, [presetId, baseMatchedList, nvqsRecords]);

  const nvqs1827Stats = useMemo(() => {
    if (presetId !== "nvqs_18_25" && presetId !== "nvqs_18_27") return null;
    const counts = {
      total: baseMatchedList.length,
      unreviewed: 0,
      eligible: 0,
      serving_done: 0,
      deferred: 0,
      exempt: 0,
      byStatus: {} as Record<string, number>,
    };
    for (const item of baseMatchedList) {
      const rec = nvqsRecords[getNvqsResidentKey(item.resident)];
      const st: Nvqs1827Status = rec?.status1827 || "unreviewed";
      counts.byStatus[st] = (counts.byStatus[st] || 0) + 1;
      const meta = getNvqsStatusMeta(st);
      if (st === "unreviewed") counts.unreviewed++;
      else if (st === "eligible") counts.eligible++;
      else if (meta.group === "active_done") counts.serving_done++;
      else if (meta.group === "deferred") counts.deferred++;
      else if (meta.group === "exempt") counts.exempt++;
    }
    return counts;
  }, [presetId, baseMatchedList, nvqsRecords]);

  const matchedList = useMemo(() => {
    if (presetId === "nvqs_17" && nvqs17Filter !== "all") {
      return baseMatchedList.filter((item) => {
        const isReg = Boolean(nvqsRecords[getNvqsResidentKey(item.resident)]?.age17Registered);
        return nvqs17Filter === "registered" ? isReg : !isReg;
      });
    }
    if ((presetId === "nvqs_18_25" || presetId === "nvqs_18_27") && nvqs1827Filter !== "all") {
      return baseMatchedList.filter((item) => {
        const st: Nvqs1827Status =
          nvqsRecords[getNvqsResidentKey(item.resident)]?.status1827 || "unreviewed";
        const meta = getNvqsStatusMeta(st);
        if (nvqs1827Filter === "unreviewed") return st === "unreviewed";
        if (nvqs1827Filter === "eligible") return st === "eligible";
        if (nvqs1827Filter === "serving_done") return meta.group === "active_done";
        if (nvqs1827Filter === "deferred") return meta.group === "deferred";
        if (nvqs1827Filter === "exempt") return meta.group === "exempt";
        return true;
      });
    }
    return baseMatchedList;
  }, [presetId, baseMatchedList, nvqs17Filter, nvqs1827Filter, nvqsRecords]);

  const isNvqs17 = presetId === "nvqs_17";
  const isNvqs1827 = presetId === "nvqs_18_25" || presetId === "nvqs_18_27";

  const handleExportExcel = () => {
    const rows = matchedList.map((item, idx) => {
      const r = item.resident;
      const rec = nvqsRecords[getNvqsResidentKey(r)];
      const baseRow: Record<string, any> = {
        STT: idx + 1,
        "Họ và tên": r.fullName,
        "Ngày sinh": r.birthDate || String(item.birthYear),
        "Năm sinh": item.birthYear,
        [`Tuổi năm ${targetYear}`]: item.ageInTargetYear,
        "Giới tính": r.gender,
        "Số CCCD/ĐDCN": r.cccd || "",
        "Số điện thoại": r.phone || "",
        "Loại cư trú": item.residencyLabel,
        "Mã hộ khẩu": r.householdId || "",
        "Chủ hộ / Chủ trọ": r.ownerName || "",
        "Địa chỉ tại Khu phố 3": r.currentAddress || r.address || "",
        "Họ tên Cha": r.fatherName || "",
        "Họ tên Mẹ": r.motherName || "",
      };

      if (isNvqs17) {
        baseRow["Đăng ký NVQS tuổi 17"] = rec?.age17Registered
          ? "Đã đăng ký NVQS lần đầu"
          : "Chưa đăng ký";
        baseRow["Ngày ĐK"] = rec?.age17RegDate || "";
        baseRow["Số GCN ĐK NVQS / Ghi chú"] = rec?.age17CertNumber || rec?.detailNote || "";
      } else if (isNvqs1827) {
        const meta = getNvqsStatusMeta(rec?.status1827);
        baseRow["Phân loại NVQS (Luật NVQS)"] = meta.label;
        baseRow["Chi tiết (Tên trường / Sức khỏe / Lý do)"] = rec?.detailNote || "";
        baseRow["Cập nhật bởi"] = rec?.updatedBy || "";
      } else {
        baseRow["Ghi chú chuyên đề"] = item.cohortNote;
      }

      return baseRow;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 13 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 15 },
      { wch: 24 },
      { wch: 40 },
      { wch: 22 },
      { wch: 22 },
      { wch: 36 },
      { wch: 36 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `RaSoat_${targetYear}`);

    // Sheet 2: Bảng Tổng hợp Thực lực NVQS nộp Ban CHQS Phường An Phú
    if (isNvqs17 && nvqs17Stats) {
      const sumRows = [
        { "Chỉ tiêu đăng ký NVQS tuổi 17": `Tổng nguồn nam đủ 17 tuổi năm ${targetYear}`, "Số lượng": nvqs17Stats.total, "Tỷ lệ": "100%" },
        { "Chỉ tiêu đăng ký NVQS tuổi 17": "Đã đăng ký NVQS lần đầu", "Số lượng": nvqs17Stats.registered, "Tỷ lệ": `${nvqs17Stats.pct}%` },
        { "Chỉ tiêu đăng ký NVQS tuổi 17": "Chưa đăng ký (cần vận động nhắc)", "Số lượng": nvqs17Stats.unregistered, "Tỷ lệ": `${100 - nvqs17Stats.pct}%` },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumRows), "TongHop_Tuoi17");
    } else if (isNvqs1827 && nvqs1827Stats) {
      const sumRows = NVQS_1827_STATUS_OPTIONS.map((opt) => ({
        "Phân loại thực lực NVQS (Điều 30 & 41 Luật NVQS)": opt.label,
        "Số lượng": nvqs1827Stats.byStatus[opt.value] || 0,
        "Căn cứ pháp lý": opt.legalHint,
      }));
      sumRows.unshift({
        "Phân loại thực lực NVQS (Điều 30 & 41 Luật NVQS)": `TỔNG NGUỒN NAM TRONG ĐỘ TUỔI (${targetYear})`,
        "Số lượng": nvqs1827Stats.total,
        "Căn cứ pháp lý": activePreset.legalBasis,
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumRows), "TongHop_ThucLuc_NVQS");
    }

    const fileName = `KP3_RaSoat_${presetId}_${targetYear}_${
      residencyFilter === "all"
        ? "ToanKP"
        : residencyFilter === "Thường trú"
          ? "ThuongTru"
          : "TamTru"
    }.xlsx`;
    XLSX.writeFile(wb, fileName);

    recordAuditLog({
      actorName,
      actorRole: "Cán bộ BĐH Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: `Xuất danh sách rà soát độ tuổi: ${activePreset.label}`,
      targetSummary: `${matchedList.length} nhân khẩu (Năm kế hoạch ${targetYear} • ${fileName})`,
    });

    setExportedToast(`Đã xuất ${formatVNNumber(matchedList.length)} nhân khẩu ra tệp ${fileName}`);
    setTimeout(() => setExportedToast(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Rà soát Tự động Theo Độ tuổi: NVQS • Mừng thọ • Tuyển sinh & Căn cước"
      description={`Tự động trích xuất từ ${formatVNNumber(residents.length)} nhân khẩu Khu phố 3, Phường An Phú, TP. Hồ Chí Minh`}
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600">
            Căn cứ: <strong className="text-slate-800">{activePreset.legalBasis}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant="emerald"
              leftIcon={<Download size={14} />}
              disabled={matchedList.length === 0}
              onClick={handleExportExcel}
            >
              Xuất Danh sách Phường (.xlsx • {formatVNNumber(matchedList.length)})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        {exportedToast && (
          <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{exportedToast}</span>
          </div>
        )}

        {/* Top Control Strip: Target Year + Residency Scope */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Năm kế hoạch rà soát:</span>
            {[currentYear, currentYear + 1, currentYear + 2].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setTargetYear(yr)}
                className={`h-8 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  targetYear === yr
                    ? "bg-emerald-700 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Năm {yr}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700">Phạm vi cư trú:</span>
            {(
              [
                { id: "Thường trú", label: "Thường trú (CT01)" },
                { id: "Tạm trú", label: "Tạm trú (CT08)" },
                { id: "all", label: "Toàn bộ KP3" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setResidencyFilter(opt.id)}
                className={`h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  residencyFilter === opt.id
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 9 Preset Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {COHORT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = preset.id === presetId;
            const count = presetCounts[preset.id] || 0;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPresetId(preset.id);
                  setNvqs17Filter("all");
                  setNvqs1827Filter("all");
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                  active
                    ? "bg-emerald-50/90 border-emerald-600 ring-1 ring-emerald-600/30"
                    : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      size={13}
                      className={active ? "text-emerald-700 shrink-0" : "text-slate-500 shrink-0"}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {preset.group}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                    {preset.label}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold shrink-0 ${
                    active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {formatVNNumber(count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* NVQS 17-year-old Registration Progress & Filter Strip */}
        {isNvqs17 && nvqs17Stats && (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-950">
                Tiến độ ĐK NVQS tuổi 17 ({targetYear}):
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold">
                Đã ĐK: {nvqs17Stats.registered}/{nvqs17Stats.total} ({nvqs17Stats.pct}%)
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                Chưa ĐK: {nvqs17Stats.unregistered}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "all", label: `Tất cả (${nvqs17Stats.total})` },
                  { id: "unregistered", label: `Chưa ĐK (${nvqs17Stats.unregistered})` },
                  { id: "registered", label: `Đã ĐK (${nvqs17Stats.registered})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setNvqs17Filter(f.id)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                    nvqs17Filter === f.id
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-emerald-200 text-slate-700 hover:bg-emerald-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* NVQS 18-27 Status Distribution & Filter Strip */}
        {isNvqs1827 && nvqs1827Stats && (
          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-800 mr-1">Lọc thực lực NVQS:</span>
            {(
              [
                { id: "all", label: `Tất cả (${nvqs1827Stats.total})` },
                { id: "unreviewed", label: `Chưa rà soát (${nvqs1827Stats.unreviewed})` },
                { id: "eligible", label: `Đủ ĐK sơ tuyển (${nvqs1827Stats.eligible})` },
                { id: "serving_done", label: `Tại ngũ / Hoàn thành (${nvqs1827Stats.serving_done})` },
                { id: "deferred", label: `Đang tạm hoãn (${nvqs1827Stats.deferred})` },
                { id: "exempt", label: `Miễn gọi / Loại trừ (${nvqs1827Stats.exempt})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setNvqs1827Filter(f.id)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                  nvqs1827Filter === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-blue-200 text-slate-700 hover:bg-blue-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Longevity Milestone Sub-filter */}
        {presetId === "longevity_all" && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200">
            <span className="text-xs font-semibold text-amber-900 mr-1">Lọc mốc mừng thọ:</span>
            {(
              [
                { val: "all", label: "Tất cả mốc" },
                { val: 70, label: "Tròn 70t" },
                { val: 75, label: "Tròn 75t" },
                { val: 80, label: "Tròn 80t" },
                { val: 85, label: "Tròn 85t" },
                { val: 90, label: "Tròn 90t" },
                { val: 95, label: "Tròn 95t" },
                { val: 100, label: "100+ tuổi" },
              ] as const
            ).map((m) => (
              <button
                key={String(m.val)}
                type="button"
                onClick={() => setLongevityMilestone(m.val)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                  longevityMilestone === m.val
                    ? "bg-amber-700 text-white"
                    : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Search & Mask toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              id="cohort-search-input"
              name="cohortSearch"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm họ tên, CCCD, SĐT, chủ hộ, địa chỉ..."
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={revealCccd}
                onChange={(e) => setRevealCccd(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700"
              />
              <span>Hiện đủ 12 số CCCD</span>
            </label>
            <span className="font-semibold text-slate-900">
              Hiển thị: {formatVNNumber(matchedList.length)} người
            </span>
          </div>
        </div>

        {/* Results Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="max-h-[360px] overflow-y-auto">
            {matchedList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <Users size={22} className="mx-auto text-slate-300" />
                <p className="font-semibold text-slate-700">
                  Không có nhân khẩu thuộc diện này trong phạm vi đang chọn
                </p>
                <p>Thử chuyển bộ lọc hoặc đổi Năm kế hoạch rà soát.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Họ và tên • Địa chỉ</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Ngày sinh</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">CCCD / SĐT</th>
                    {isNvqs17 ? (
                      <>
                        <th className="py-2.5 px-3">Trạng thái ĐK tuổi 17</th>
                        <th className="py-2.5 px-3">Số GCN / Ghi chú</th>
                      </>
                    ) : isNvqs1827 ? (
                      <>
                        <th className="py-2.5 px-3">Phân loại NVQS (Điều 41)</th>
                        <th className="py-2.5 px-3">Chi tiết (Trường / Bệnh lý / Lý do)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-3">Cư trú</th>
                        <th className="py-2.5 px-3">Ghi chú chuyên đề</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedList.slice(0, 250).map((item, idx) => {
                    const r = item.resident;
                    const recKey = getNvqsResidentKey(r);
                    const rec = nvqsRecords[recKey];
                    const isReg17 = Boolean(rec?.age17Registered);
                    const status1827: Nvqs1827Status = rec?.status1827 || "unreviewed";
                    const stMeta = getNvqsStatusMeta(status1827);

                    return (
                      <tr
                        key={r.id}
                        onClick={() => {
                          if (onOpenResidentDetail) {
                            onClose();
                            onOpenResidentDetail(r);
                          }
                        }}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 max-w-[230px]">
                          <div className="font-bold text-slate-900 truncate">{r.fullName}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {formatCompactKp3Address(r.currentAddress || r.address)}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{r.birthDate}</div>
                          <div className="text-[11px] font-semibold text-emerald-700">
                            {item.ageInTargetYear} tuổi
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                          <div>{revealCccd ? r.cccd : maskCccd(r.cccd)}</div>
                          {r.phone && <div className="text-slate-500">{r.phone}</div>}
                        </td>

                        {isNvqs17 ? (
                          <>
                            <td
                              className="py-2 px-3 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateNvqsRecord(r, {
                                    age17Registered: !isReg17,
                                    age17RegDate: !isReg17
                                      ? new Date().toLocaleDateString("vi-VN")
                                      : "",
                                  })
                                }
                                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                                  isReg17
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                    : "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                                }`}
                              >
                                {isReg17 ? (
                                  <CheckSquare size={14} className="text-emerald-700" />
                                ) : (
                                  <Square size={14} className="text-amber-600" />
                                )}
                                <span>{isReg17 ? "Đã đăng ký" : "Chưa đăng ký"}</span>
                              </button>
                              {isReg17 && rec?.age17RegDate && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Ngày ĐK: {rec.age17RegDate}
                                </div>
                              )}
                            </td>
                            <td
                              className="py-2 px-3 min-w-[190px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                defaultValue={rec?.age17CertNumber || rec?.detailNote || ""}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (rec?.age17CertNumber || "")) {
                                    updateNvqsRecord(r, { age17CertNumber: v });
                                  }
                                }}
                                placeholder="Số GCN ĐK / Trực tuyến..."
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-[11px] focus:outline-none focus:border-emerald-600"
                              />
                            </td>
                          </>
                        ) : isNvqs1827 ? (
                          <>
                            <td
                              className="py-2 px-3 min-w-[235px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                aria-label={`Trạng thái NVQS của ${r.fullName}`}
                                value={status1827}
                                onChange={(e) =>
                                  updateNvqsRecord(r, {
                                    status1827: e.target.value as Nvqs1827Status,
                                  })
                                }
                                className={`w-full h-8 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer focus:outline-none focus:border-emerald-600 ${stMeta.badgeClass}`}
                              >
                                {NVQS_1827_STATUS_OPTIONS.map((opt) => (
                                  <option
                                    key={opt.value}
                                    value={opt.value}
                                    className="bg-white text-slate-900"
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td
                              className="py-2 px-3 min-w-[200px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                defaultValue={rec?.detailNote || ""}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (rec?.detailNote || "")) {
                                    updateNvqsRecord(r, { detailNote: v });
                                  }
                                }}
                                placeholder={
                                  status1827 === "deferred_student"
                                    ? "Tên trường ĐH/CĐ & niên khóa..."
                                    : status1827 === "deferred_health"
                                      ? "VD: Cận 2.5 độ, Loại 4..."
                                      : "Ghi chú chi tiết lý do..."
                                }
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-[11px] focus:outline-none focus:border-emerald-600"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  item.residencyLabel === "Thường trú"
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                {item.residencyLabel}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-700">
                              {item.cohortNote}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {matchedList.length > 250 && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
              Đang hiển thị 250 dòng đầu tiên trên màn hình. Bấm{" "}
              <strong>Xuất Danh sách Phường (.xlsx)</strong> để tải đầy đủ 100% (
              {formatVNNumber(matchedList.length)} nhân khẩu).
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
