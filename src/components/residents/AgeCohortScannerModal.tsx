import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Award,
  Baby,
  CheckCircle2,
  CreditCard,
  Download,
  GraduationCap,
  Heart,
  Search,
  Shield,
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
    legalBasis: "Điều 12 Luật Nghĩa vụ quân sự 2015",
    icon: Shield,
  },
  {
    id: "nvqs_18_25",
    group: "Nghĩa vụ Quân sự",
    label: "Nam 18 – 25 tuổi (Gọi nhập ngũ phổ thông)",
    shortBadge: "18–25t • Nam",
    legalBasis: "Điều 30 Luật Nghĩa vụ quân sự 2015",
    icon: Shield,
  },
  {
    id: "nvqs_18_27",
    group: "Nghĩa vụ Quân sự",
    label: "Nam 18 – 27 tuổi (Gồm diện CĐ / Đại học)",
    shortBadge: "18–27t • Nam",
    legalBasis: "Điều 30 Luật NVQS (kéo dài đến hết 27 tuổi)",
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
          cohortNote = `Sinh năm ${birthYear} — Đăng ký NVQS tuổi 17 (${r.militaryServiceStatus || "Chưa rà soát"})`;
        }
        break;
      case "nvqs_18_25":
        if (r.gender === "Nam" && age >= 18 && age <= 25) {
          matched = true;
          cohortNote = `Sinh năm ${birthYear} (${age} tuổi) — ${r.militaryServiceStatus || "Trong diện rà soát NVQS"}`;
        }
        break;
      case "nvqs_18_27":
        if (r.gender === "Nam" && age >= 18 && age <= 27) {
          matched = true;
          cohortNote =
            age > 25
              ? `Sinh năm ${birthYear} (${age} tuổi • Diện CĐ/ĐH) — ${r.militaryServiceStatus || "Cần đối chiếu trình độ"}`
              : `Sinh năm ${birthYear} (${age} tuổi) — ${r.militaryServiceStatus || "Trong diện rà soát NVQS"}`;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [revealCccd, setRevealCccd] = useState(false);
  const [exportedToast, setExportedToast] = useState<string | null>(null);

  const activePreset = useMemo(
    () => COHORT_PRESETS.find((p) => p.id === presetId) || COHORT_PRESETS[0],
    [presetId]
  );

  // Quick summary counts across all presets for the selected targetYear & residencyFilter
  const presetCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of COHORT_PRESETS) {
      map[p.id] = scanResidentsByCohort(residents, p.id, targetYear, {
        residencyFilter,
      }).length;
    }
    return map;
  }, [residents, targetYear, residencyFilter]);

  const matchedList = useMemo(
    () =>
      scanResidentsByCohort(residents, presetId, targetYear, {
        residencyFilter,
        longevityMilestoneFilter: presetId === "longevity_all" ? longevityMilestone : "all",
        searchQuery,
      }),
    [residents, presetId, targetYear, residencyFilter, longevityMilestone, searchQuery]
  );

  const handleExportExcel = () => {
    const rows = matchedList.map((item, idx) => {
      const r = item.resident;
      return {
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
        "Ghi chú chuyên đề": item.cohortNote,
      };
    });

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
      { wch: 42 },
      { wch: 22 },
      { wch: 22 },
      { wch: 38 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `RaSoat_${targetYear}`);
    const fileName = `KP3_RaSoat_${presetId}_${targetYear}_${residencyFilter === "all" ? "ToanKP" : residencyFilter === "Thường trú" ? "ThuongTru" : "TamTru"}.xlsx`;
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
      <div className="space-y-4">
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

        {/* 9 Preset Cards grouped cleanly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {COHORT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = preset.id === presetId;
            const count = presetCounts[preset.id] || 0;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPresetId(preset.id)}
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
              Kết quả: {formatVNNumber(matchedList.length)} người
            </span>
          </div>
        </div>

        {/* Results Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="max-h-[340px] overflow-y-auto">
            {matchedList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <Users size={22} className="mx-auto text-slate-300" />
                <p className="font-semibold text-slate-700">
                  Không có nhân khẩu thuộc diện này trong phạm vi đang chọn
                </p>
                <p>Thử chuyển phạm vi sang "Toàn bộ KP3" hoặc đổi Năm kế hoạch rà soát.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Ngày sinh • Tuổi</th>
                    <th className="py-2.5 px-3">CCCD / SĐT</th>
                    <th className="py-2.5 px-3">Cư trú & Địa chỉ KP3</th>
                    <th className="py-2.5 px-3">Ghi chú chuyên đề</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedList.slice(0, 250).map((item, idx) => {
                    const r = item.resident;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => {
                          if (onOpenResidentDetail) {
                            onClose();
                            onOpenResidentDetail(r);
                          }
                        }}
                        className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{r.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.gender} {r.ownerName ? `• Chủ hộ: ${r.ownerName}` : ""}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{r.birthDate}</div>
                          <div className="text-[11px] font-semibold text-emerald-700">
                            {item.ageInTargetYear} tuổi (năm {targetYear})
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div>{revealCccd ? r.cccd : maskCccd(r.cccd)}</div>
                          {r.phone && <div className="text-slate-500">{r.phone}</div>}
                        </td>
                        <td className="py-2 px-3 max-w-[240px]">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-0.5 ${
                              item.residencyLabel === "Thường trú"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {item.residencyLabel}
                          </span>
                          <div className="text-[11px] text-slate-600 truncate">
                            {formatCompactKp3Address(r.currentAddress || r.address)}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-700">
                          {item.cohortNote}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {matchedList.length > 250 && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
              Đang hiển thị 250 dòng đầu tiên trên màn hình. Bấm <strong>Xuất Danh sách Phường (.xlsx)</strong> để tải đầy đủ 100% ({formatVNNumber(matchedList.length)} nhân khẩu).
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
