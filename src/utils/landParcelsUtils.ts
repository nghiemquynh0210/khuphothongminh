import { Business, BusinessFile, Household, LandParcelCertificate } from "../types";

export interface LandParcelsSummary {
  parcels: LandParcelCertificate[];
  meaningfulParcels: LandParcelCertificate[];
  totalCount: number;
  soDoFileCount: number;
  totalArea: number;
  isMergedParcels: boolean;
  toBanDoSummary: string;
  soThuaSummary: string;
  loaiDatSummary: string;
  tenChuSuDungSummary: string;
  soGcnSummary: string;
  soVaoSoSummary: string;
  ngayCapGcnSummary: string;
  primarySoDoFile?: BusinessFile;
  primarySoDoOcrData?: any;
  compactBadgeText: string;
}

export function parseAreaNumber(val: number | string | undefined | null): number {
  if (typeof val === "number") {
    return Number.isFinite(val) && val > 0 ? val : 0;
  }
  if (!val) return 0;
  const normalized = String(val)
    .replace(/m2|m²/gi, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0;
}

export function createEmptyLandParcel(
  index: number,
  defaults?: Partial<LandParcelCertificate>
): LandParcelCertificate {
  const isPrimary = index === 0;
  return {
    id: `parcel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    parcelLabel:
      defaults?.parcelLabel ||
      (isPrimary ? "Thửa chính (#1)" : `Thửa ghép #${index + 1}`),
    addressNote: defaults?.addressNote || "",
    usageRightType: defaults?.usageRightType || (isPrimary ? "owned" : "merged"),
    sourceHouseholdCode: defaults?.sourceHouseholdCode,
    toBanDo: defaults?.toBanDo ?? "",
    soThua: defaults?.soThua ?? "",
    dienTich: defaults?.dienTich ?? "",
    loaiDat: defaults?.loaiDat ?? "Đất ở tại đô thị (ODT)",
    tenChuSuDung: defaults?.tenChuSuDung ?? "",
    soGcn: defaults?.soGcn ?? "",
    soVaoSo: defaults?.soVaoSo ?? "",
    ngayCapGcn: defaults?.ngayCapGcn ?? "",
    soDoFile: defaults?.soDoFile,
    soDoOcrData: defaults?.soDoOcrData,
  };
}

/**
 * Chuẩn hóa danh sách thửa đất / Sổ đỏ của Hộ khẩu hoặc Doanh nghiệp / Cơ sở KD.
 * Nếu hồ sơ cũ chỉ có trường đơn (toBanDo, soThua, soGcn, soDoFile...), tự động chuyển thành 1 phần tử chuẩn.
 */
export function normalizeEntityLandParcels(
  rawEntity?: Partial<Household> | Partial<Business> | null
): LandParcelCertificate[] {
  if (!rawEntity) return [];
  const entity = rawEntity as Partial<Household> & Partial<Business> & Record<string, any>;

  if (Array.isArray(entity.landParcels) && entity.landParcels.length > 0) {
    return entity.landParcels.map((p, idx) => ({
      ...p,
      id: p.id || `parcel-existing-${idx + 1}`,
      parcelLabel:
        p.parcelLabel ||
        (idx === 0 ? "Thửa chính (#1)" : `Thửa ghép #${idx + 1}`),
      usageRightType: p.usageRightType || (idx === 0 ? "owned" : "merged"),
      toBanDo: String(p.toBanDo || "").trim(),
      soThua: String(p.soThua || "").trim(),
      dienTich: p.dienTich ?? "",
      loaiDat: p.loaiDat || "Đất ở tại đô thị (ODT)",
      tenChuSuDung: p.tenChuSuDung || "",
      soGcn: p.soGcn || "",
      soVaoSo: p.soVaoSo || "",
      ngayCapGcn: p.ngayCapGcn || "",
    }));
  }

  const hasMeaningfulScalar = Boolean(
    (entity.toBanDo && String(entity.toBanDo).trim()) ||
      (entity.soThua && String(entity.soThua).trim()) ||
      (entity.soGcn && String(entity.soGcn).trim()) ||
      entity.soDoFile ||
      parseAreaNumber(entity.dienTich) > 0
  );

  if (!hasMeaningfulScalar) return [];

  return [
    {
      id: "parcel-legacy-1",
      parcelLabel: "Thửa chính (#1)",
      addressNote: entity.address || "",
      usageRightType: "owned",
      toBanDo: String(entity.toBanDo || "").trim(),
      soThua: String(entity.soThua || "").trim(),
      dienTich: entity.dienTich ?? "",
      loaiDat: entity.loaiDat || "Đất ở tại đô thị (ODT)",
      tenChuSuDung:
        entity.tenChuSuDung ||
        (entity as Household).ownerName ||
        (entity as Business).premisesOwner ||
        (entity as Business).owner ||
        "",
      soGcn: entity.soGcn || "",
      soVaoSo: entity.soVaoSo || "",
      ngayCapGcn: entity.ngayCapGcn || "",
      soDoFile: entity.soDoFile,
      soDoOcrData: entity.soDoOcrData,
    },
  ];
}

function uniqueNonEmpty(values: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Tổng hợp mảng đa thửa đất / Sổ đỏ về cả số liệu gộp lẫn các trường đơn tương thích ngược.
 */
export function summarizeLandParcels(
  rawParcels: LandParcelCertificate[]
): LandParcelsSummary {
  const validParcels = (rawParcels || []).filter((p) =>
    Boolean(
      String(p.toBanDo || "").trim() ||
        String(p.soThua || "").trim() ||
        String(p.soGcn || "").trim() ||
        parseAreaNumber(p.dienTich) > 0 ||
        p.soDoFile
    )
  );

  const totalCount = validParcels.length;
  const isMergedParcels = totalCount >= 2;
  const totalArea =
    Math.round(
      validParcels.reduce((sum, p) => sum + parseAreaNumber(p.dienTich), 0) * 100
    ) / 100;

  const soDoFileCount = validParcels.filter(
    (p) => Boolean(p.soDoFile || (p.soGcn && String(p.soGcn).trim()))
  ).length;

  const uniqueTo = uniqueNonEmpty(validParcels.map((p) => p.toBanDo));
  const rawThuaList = validParcels
    .map((p) => String(p.soThua || "").trim())
    .filter(Boolean);
  const uniqueLoaiDat = uniqueNonEmpty(validParcels.map((p) => p.loaiDat));
  const uniqueOwners = uniqueNonEmpty(validParcels.map((p) => p.tenChuSuDung));
  const uniqueSoGcn = uniqueNonEmpty(validParcels.map((p) => p.soGcn));
  const uniqueSoVaoSo = uniqueNonEmpty(validParcels.map((p) => p.soVaoSo));
  const uniqueNgayCap = uniqueNonEmpty(validParcels.map((p) => p.ngayCapGcn));

  const toBanDoSummary = uniqueTo.join(", ");
  const soThuaSummary = isMergedParcels
    ? rawThuaList.length > 0
      ? `${rawThuaList.join(" + ")} (Ghép ${String(totalCount).padStart(2, "0")} thửa)`
      : `Ghép ${String(totalCount).padStart(2, "0")} thửa`
    : rawThuaList[0] || "";

  const loaiDatSummary = uniqueLoaiDat.join(" + ");
  const tenChuSuDungSummary = uniqueOwners.join(" & ");
  const soGcnSummary = uniqueSoGcn.join("; ");
  const soVaoSoSummary = uniqueSoVaoSo.join("; ");
  const ngayCapGcnSummary = uniqueNgayCap.join("; ");

  const firstWithFile = validParcels.find((p) => Boolean(p.soDoFile));
  const firstWithOcr = validParcels.find((p) => Boolean(p.soDoOcrData));

  let compactBadgeText = "";
  if (totalCount >= 2) {
    compactBadgeText = `${String(totalCount).padStart(2, "0")} Sổ đỏ • Ghép ${totalCount} thửa${
      totalArea > 0 ? ` (${totalArea} m²)` : ""
    }`;
  } else if (totalCount === 1) {
    const p = validParcels[0];
    compactBadgeText = `Tờ ${p.toBanDo || "--"}, Thửa ${p.soThua || "--"}${
      totalArea > 0 ? ` • ${totalArea} m²` : ""
    }`;
  }

  return {
    parcels: validParcels,
    meaningfulParcels: validParcels,
    totalCount,
    soDoFileCount: Math.max(soDoFileCount, isMergedParcels ? totalCount : soDoFileCount),
    totalArea,
    isMergedParcels,
    toBanDoSummary,
    soThuaSummary,
    loaiDatSummary,
    tenChuSuDungSummary,
    soGcnSummary,
    soVaoSoSummary,
    ngayCapGcnSummary,
    primarySoDoFile: firstWithFile?.soDoFile,
    primarySoDoOcrData: firstWithOcr?.soDoOcrData,
    compactBadgeText,
  };
}

/**
 * Kế thừa thông minh danh sách Sổ đỏ / Thửa đất từ 1 hoặc nhiều Hộ khẩu đã liên kết
 * (Tránh nhân đôi các thửa đã có sẵn trong hồ sơ).
 */
export function inheritParcelsFromHouseholds(
  linkedHouseholds: Household[],
  existingParcels: LandParcelCertificate[]
): { nextParcels: LandParcelCertificate[]; addedCount: number } {
  const cleanedExisting = existingParcels.filter((p) =>
    Boolean(
      String(p.toBanDo || "").trim() ||
        String(p.soThua || "").trim() ||
        String(p.soGcn || "").trim() ||
        parseAreaNumber(p.dienTich) > 0 ||
        p.soDoFile
    )
  );

  const result = [...cleanedExisting];
  let addedCount = 0;

  for (const hh of linkedHouseholds) {
    const hhParcels = normalizeEntityLandParcels(hh);
    if (hhParcels.length === 0) {
      // Nếu hộ khẩu chưa nhập thửa đất chi tiết nhưng có chủ hộ & địa chỉ, vẫn bỏ qua để tránh tạo thửa rỗng
      continue;
    }

    for (const hp of hhParcels) {
      const isDuplicate = result.some((cur) => {
        if (
          hp.soGcn &&
          cur.soGcn &&
          hp.soGcn.trim().toLowerCase() === cur.soGcn.trim().toLowerCase()
        ) {
          return true;
        }
        if (
          hp.toBanDo &&
          hp.soThua &&
          cur.toBanDo.trim() === hp.toBanDo.trim() &&
          cur.soThua.trim() === hp.soThua.trim()
        ) {
          return true;
        }
        return false;
      });

      if (!isDuplicate) {
        const nextIdx = result.length;
        result.push({
          ...hp,
          id: `parcel-hh-${hh.code}-${Date.now()}-${nextIdx}`,
          parcelLabel:
            nextIdx === 0
              ? `Thửa chính (Từ hộ ${hh.code})`
              : `Thửa ghép #${nextIdx + 1} (Từ hộ ${hh.code})`,
          addressNote: hp.addressNote || hh.address,
          usageRightType: nextIdx === 0 ? "owned" : "merged",
          sourceHouseholdCode: hh.code,
          tenChuSuDung: hp.tenChuSuDung || hh.ownerName,
        });
        addedCount += 1;
      }
    }
  }

  return { nextParcels: result, addedCount };
}

export function getUsageRightLabel(
  type?: LandParcelCertificate["usageRightType"]
): string {
  switch (type) {
    case "leased":
      return "Thuê mặt bằng / QSDĐ";
    case "co_owned":
      return "Đồng sở hữu / Sử dụng chung";
    case "merged":
      return "Thửa ghép mở rộng mặt bằng";
    case "owned":
    default:
      return "Thuộc chủ cơ sở / Chủ hộ";
  }
}
