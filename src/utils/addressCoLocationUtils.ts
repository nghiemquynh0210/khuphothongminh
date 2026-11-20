import { Business, Household } from "../types";
import { isEnterpriseRecord } from "./kp3Utils";
import { normalizeEntityLandParcels } from "./landParcelsUtils";

export function isAccommodationBusiness(b?: Partial<Business> | null): boolean {
  if (!b) return false;
  if (b.isAccommodation) return true;
  const hay = `${b.name || ""} ${b.type || ""} ${b.industryGroup || ""}`.toLowerCase();
  return /nhà trọ|lưu trú|phòng trọ|nhà nghỉ|khách sạn|homestay|căn hộ dịch vụ/i.test(hay);
}

/**
 * Bỏ dấu tiếng Việt và chuẩn hóa chữ thường
 */
export function stripVietnameseAccents(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Tách danh sách mã hộ liên kết chuẩn từ Business (hỗ trợ cả linkedHouseholdCodes[] và chuỗi "HK-001, HK-002")
 */
export function getNormalizedLinkedHouseholdCodes(
  business?: Partial<Business> | null
): string[] {
  if (!business) return [];
  const rawList: string[] = [];
  if (Array.isArray(business.linkedHouseholdCodes)) {
    rawList.push(...business.linkedHouseholdCodes);
  }
  if (business.linkedHouseholdCode) {
    rawList.push(
      ...String(business.linkedHouseholdCode)
        .split(/[,;+|&]+/)
        .map((s) => s.trim())
    );
  }
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const item of rawList) {
    const clean = String(item || "").trim().toUpperCase();
    if (!clean) continue;
    if (!seen.has(clean)) {
      seen.add(clean);
      codes.push(clean);
    }
  }
  return codes;
}

/**
 * Bóc tách tập khóa địa chỉ chuẩn tại Khu phố 3 (tránh 100% lỗi "42" khớp nhầm "142" hay "42/15",
 * đồng thời hỗ trợ địa chỉ ghép "42-44 Lương Định Của", "42 & 44 Lương Định Của", "Tầng 2, 42 Lương Định Của").
 */
export function extractKp3AddressKeys(rawAddress?: string | null): string[] {
  if (!rawAddress) return [];
  let text = stripVietnameseAccents(rawAddress);
  if (!text) return [];

  // Loại bỏ thông tin chủ trọ trong ngoặc đơn: "(sdt: 0913...)"
  text = text.replace(/\([^)]*\)/g, " ");
  // Loại bỏ tên cơ sở phía trước dấu gạch ngang hoặc phẩy nếu bắt đầu bằng nha tro / cong ty / ho kd / tang / lau / phong / ki-ot
  text = text.replace(
    /^(?:nha tro|nha nghi|cong ty|ho kinh doanh|ho kd|cua hang|quan|van phong)\s+[^,\d]+[, -]+/i,
    ""
  );
  text = text.replace(
    /\b(?:tang|lau|phong|p\.|ki-ot|kiot|o so|mat bang|can ho)\s*[a-z0-9\-]+\s*[, -]*/gi,
    " "
  );

  // Cắt bỏ hậu tố hành chính chung từ cấp khu phố/phường trở đi để giữ lại [Số nhà + Đường/Khu]
  const adminCut = text.split(
    /\b(?:,?\s*khu pho\s*3|,?\s*kp\s*3|,?\s*kp3|,?\s*phuong\s*an\s*phu|,?\s*p\.?\s*an\s*phu|,?\s*quan\s*2|,?\s*thanh\s*pho\s*ho\s*chi\s*minh|,?\s*tp\.?\s*hcm)\b/i
  )[0];

  let core = (adminCut || text)
    .replace(/\b(?:so nha|so|sn|duong)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Trường hợp địa chỉ kiểu "17/A3 Khu phố 3" (khi phần sau là Khu phố 3 bị cắt còn mỗi "17/a3")
  if (!core) {
    const fallbackMatch = text.match(/(\d+[a-z]?(?:\/[a-z0-9]+)+)/i);
    if (fallbackMatch) {
      return [`${fallbackMatch[1].toLowerCase()}|kp3`];
    }
    return [];
  }

  // Mẫu 1: Số nhà ghép dạng "42-44 luong dinh cua", "42 - 44 luong dinh cua", "42 & 44 luong dinh cua", "42+44 luong dinh cua"
  const compoundMatch = core.match(
    /^(\d+[a-z]?(?:\/[a-z0-9]+)?)\s*(?:[-–+&]|va|,)\s*(\d+[a-z]?(?:\/[a-z0-9]+)?)\s+([a-z][a-z0-9\s]*)$/i
  );
  if (compoundMatch) {
    const firstToken = compoundMatch[1].toLowerCase();
    const secondToken = compoundMatch[2].toLowerCase();
    const street = normalizeStreetToken(compoundMatch[3]);
    const expanded = expandHouseRange(firstToken, secondToken);
    return expanded.map((num) => `${num}|${street}`);
  }

  // Mẫu 2: Số nhà đơn hoặc số hẻm + Tên đường: "42 luong dinh cua", "42a luong dinh cua", "42/15 luong dinh cua"
  const standardMatch = core.match(
    /^(\d+[a-z]?(?:\/[a-z0-9]+)*)\s+([a-z][a-z0-9\s]*)$/i
  );
  if (standardMatch) {
    const num = standardMatch[1].toLowerCase();
    const street = normalizeStreetToken(standardMatch[2]);
    return [`${num}|${street}`];
  }

  // Mẫu 3: Chỉ có mã số phân khu kiểu "17/a3" hoặc "a3/17"
  const alleyOnlyMatch = core.match(/^(\d+[a-z]?(?:\/[a-z0-9]+)+)$/i);
  if (alleyOnlyMatch) {
    return [`${alleyOnlyMatch[1].toLowerCase()}|kp3`];
  }

  return [];
}

function normalizeStreetToken(rawStreet: string): string {
  return rawStreet
    .replace(/^[,.\-\s]+|[,.\-\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function expandHouseRange(first: string, second: string): string[] {
  // Nếu cả hai là số nguyên thuần và cùng tính chẵn/lẻ cách nhau tối đa 8 đơn vị (VD 42-46 -> 42, 44, 46)
  if (/^\d+$/.test(first) && /^\d+$/.test(second)) {
    const n1 = parseInt(first, 10);
    const n2 = parseInt(second, 10);
    if (n2 > n1 && n2 - n1 <= 8 && n1 % 2 === n2 % 2) {
      const nums: string[] = [];
      for (let cur = n1; cur <= n2; cur += 2) {
        nums.push(String(cur));
      }
      return nums;
    }
    if (n2 > n1 && n2 - n1 <= 3) {
      const nums: string[] = [];
      for (let cur = n1; cur <= n2; cur += 1) {
        nums.push(String(cur));
      }
      return nums;
    }
  }
  return Array.from(new Set([first, second]));
}

export function hasIntersectingAddressKeys(
  addressA?: string | null,
  addressB?: string | null
): boolean {
  const keysA = extractKp3AddressKeys(addressA);
  const keysB = extractKp3AddressKeys(addressB);
  if (keysA.length === 0 || keysB.length === 0) return false;
  const setA = new Set(keysA);
  return keysB.some((k) => setA.has(k));
}

/**
 * Bóc tách khóa Số GCN hoặc cặp (Tờ + Thửa đã xác thực) phục vụ đối khớp nhà 2 mặt tiền / ghép thửa.
 * Chỉ dùng cặp (Tờ + Thửa) để liên kết tự động khi có Số GCN thật hoặc có từ 2 thửa trở lên,
 * nhằm tránh trường hợp dữ liệu mẫu mặc định "Tờ 272, Thửa 55" chưa có Số GCN gom nhầm các hộ xa nhau.
 */
export function extractVerifiedCadastralKeys(
  entity?: Partial<Household> | Partial<Business> | null
): string[] {
  if (!entity) return [];
  const parcels = normalizeEntityLandParcels(entity);
  const keys: string[] = [];

  for (const p of parcels) {
    const gcn = stripVietnameseAccents(p.soGcn || "").replace(/\s+/g, "");
    if (gcn && gcn.length >= 5 && gcn !== "chodtkp3") {
      keys.push(`gcn:${gcn}`);
    }
    const to = String(p.toBanDo || "").trim();
    const thua = String(p.soThua || "").trim();
    const isVerifiedParcel =
      Boolean(gcn && gcn.length >= 5) ||
      Boolean(p.sourceHouseholdCode) ||
      parcels.length >= 2 ||
      !(to === "272" && thua === "55");

    if (to && thua && isVerifiedParcel && /^\d+[a-z0-9\-]*$/i.test(thua)) {
      keys.push(`parcel:${to.toLowerCase()}_${thua.toLowerCase()}`);
    }
  }

  return Array.from(new Set(keys));
}

export interface CoLocatedBundle {
  households: Household[];
  enterprises: Business[];
  businesses: Business[]; // Cơ sở KD cá thể & nhà trọ (không bao gồm Doanh nghiệp)
  hostels: Business[];    // Riêng các cơ sở lưu trú / nhà trọ trong nhóm businesses
  allBusinessEntities: Business[];
  totalOtherEntities: number;
  isMultiFunctional: boolean;
  multiFunctionalNote?: string;
  matchedAddressKeys: string[];
}

/**
 * Tìm toàn bộ Tổ hợp đơn vị Cùng Địa Chỉ / Địa chỉ ghép / Cùng Thửa Đất Địa Chính
 * xoay quanh 1 Hộ khẩu hoặc 1 Cơ sở kinh doanh / Doanh nghiệp đang xem.
 */
export function resolveCoLocatedEntities(params: {
  focusHousehold?: Household | null;
  focusBusiness?: Business | null;
  households: Household[];
  businesses: Business[];
}): CoLocatedBundle {
  const { focusHousehold, focusBusiness, households, businesses } = params;

  const seedAddressKeys = new Set<string>();
  const seedCadastralKeys = new Set<string>();
  const seedHouseholdCodes = new Set<string>();

  if (focusHousehold) {
    seedHouseholdCodes.add(focusHousehold.code.trim().toUpperCase());
    extractKp3AddressKeys(focusHousehold.address).forEach((k) =>
      seedAddressKeys.add(k)
    );
    extractVerifiedCadastralKeys(focusHousehold).forEach((k) =>
      seedCadastralKeys.add(k)
    );
  }

  if (focusBusiness) {
    getNormalizedLinkedHouseholdCodes(focusBusiness).forEach((c) =>
      seedHouseholdCodes.add(c)
    );
    extractKp3AddressKeys(focusBusiness.address).forEach((k) =>
      seedAddressKeys.add(k)
    );
    extractVerifiedCadastralKeys(focusBusiness).forEach((k) =>
      seedCadastralKeys.add(k)
    );
    normalizeEntityLandParcels(focusBusiness).forEach((p) => {
      if (p.sourceHouseholdCode) {
        seedHouseholdCodes.add(p.sourceHouseholdCode.trim().toUpperCase());
      }
      if (p.addressNote) {
        extractKp3AddressKeys(p.addressNote).forEach((k) =>
          seedAddressKeys.add(k)
        );
      }
    });
  }

  // Bước 1: Tìm các Sổ Hộ khẩu Thường trú khớp mã hộ liên kết, khớp khóa địa chỉ hoặc khớp thửa đất xác thực
  // (Không nhân bản danh sách các cụm/hộ tạm trú TT-xxxx vốn đã hiển thị trong Danh sách Người Lưu trú Thực tế)
  const matchedHouseholds = households.filter((hh) => {
    if ((hh as any).deletedAt) return false;
    const codeUpper = hh.code.trim().toUpperCase();
    const isTempCluster = hh.type === "Tạm trú" || /^TT-\d+/i.test(codeUpper);
    if (isTempCluster && focusHousehold?.id !== hh.id) {
      return false;
    }
    if (seedHouseholdCodes.has(codeUpper)) return true;

    const hhAddrKeys = extractKp3AddressKeys(hh.address);
    if (hhAddrKeys.some((k) => seedAddressKeys.has(k))) return true;

    const hhCadKeys = extractVerifiedCadastralKeys(hh);
    if (hhCadKeys.some((k) => seedCadastralKeys.has(k))) return true;

    return false;
  });

  // Mở rộng tập mã hộ và khóa địa chỉ từ các hộ vừa tìm được (để bắt trọn mối quan hệ bắc cầu: Hộ <-> Doanh nghiệp <-> Cơ sở KD)
  for (const hh of matchedHouseholds) {
    seedHouseholdCodes.add(hh.code.trim().toUpperCase());
    extractKp3AddressKeys(hh.address).forEach((k) => seedAddressKeys.add(k));
    extractVerifiedCadastralKeys(hh).forEach((k) => seedCadastralKeys.add(k));
  }

  // Bước 2: Tìm toàn bộ Doanh nghiệp & Cơ sở kinh doanh / Nhà trọ thuộc cùng tổ hợp địa chỉ này
  const matchedBusinessEntities = businesses.filter((b) => {
    const bLinkedCodes = getNormalizedLinkedHouseholdCodes(b);
    if (bLinkedCodes.some((c) => seedHouseholdCodes.has(c))) return true;

    const bAddrKeys = extractKp3AddressKeys(b.address);
    if (bAddrKeys.some((k) => seedAddressKeys.has(k))) return true;

    const bCadKeys = extractVerifiedCadastralKeys(b);
    if (bCadKeys.some((k) => seedCadastralKeys.has(k))) return true;

    return false;
  });

  // Loại trừ chính thực thể đang mở khỏi đếm "đơn vị liên quan khác", nhưng giữ danh sách đầy đủ rõ ràng
  const otherHouseholds = focusHousehold
    ? matchedHouseholds.filter((h) => h.id !== focusHousehold.id)
    : matchedHouseholds;

  const otherBusinessEntities = focusBusiness
    ? matchedBusinessEntities.filter((b) => b.id !== focusBusiness.id)
    : matchedBusinessEntities;

  const enterprises = otherBusinessEntities.filter((b) => isEnterpriseRecord(b));
  const nonEnterpriseBusinesses = otherBusinessEntities.filter(
    (b) => !isEnterpriseRecord(b)
  );
  const hostels = nonEnterpriseBusinesses.filter((b) =>
    isAccommodationBusiness(b)
  );

  // Đánh giá tổ hợp đa công năng (cùng địa điểm vừa ở vừa có >=1 đơn vị kinh doanh/doanh nghiệp hoặc >=2 đơn vị KD chồng nhau)
  const totalHouseholdsAtSite = matchedHouseholds.length;
  const totalBizAtSite = matchedBusinessEntities.length;
  const isMultiFunctional =
    (totalHouseholdsAtSite >= 1 && totalBizAtSite >= 1) || totalBizAtSite >= 2;

  let multiFunctionalNote: string | undefined;
  if (isMultiFunctional) {
    const parts: string[] = [];
    if (totalHouseholdsAtSite > 0) {
      parts.push(`${totalHouseholdsAtSite} Hộ dân cư trú`);
    }
    const totalEntAtSite = matchedBusinessEntities.filter((b) =>
      isEnterpriseRecord(b)
    ).length;
    const totalShopAtSite = totalBizAtSite - totalEntAtSite;
    if (totalEntAtSite > 0) {
      parts.push(`${totalEntAtSite} Doanh nghiệp`);
    }
    if (totalShopAtSite > 0) {
      parts.push(`${totalShopAtSite} Cơ sở KD/Nhà trọ`);
    }
    multiFunctionalNote = `Tổ hợp cùng địa điểm (${parts.join(
      " • "
    )}) — Lưu ý phối hợp kiểm tra điều kiện PCCC, lối thoát nạn & ANTT liên thông.`;
  }

  return {
    households: otherHouseholds,
    enterprises,
    businesses: nonEnterpriseBusinesses,
    hostels,
    allBusinessEntities: otherBusinessEntities,
    totalOtherEntities: otherHouseholds.length + otherBusinessEntities.length,
    isMultiFunctional,
    multiFunctionalNote,
    matchedAddressKeys: Array.from(seedAddressKeys),
  };
}

/**
 * Tìm danh sách tất cả Hộ khẩu liên kết trực tiếp hoặc cùng địa chỉ với một Business/Enterprise
 */
export function getLinkedHouseholdsForBusiness(
  business: Business,
  households: Household[]
): Household[] {
  const explicitCodes = new Set(getNormalizedLinkedHouseholdCodes(business));
  const explicitMatches = households.filter(
    (h) => !(h as any).deletedAt && explicitCodes.has(h.code.trim().toUpperCase())
  );

  const addrMatches = households.filter(
    (h) =>
      !(h as any).deletedAt &&
      !explicitCodes.has(h.code.trim().toUpperCase()) &&
      hasIntersectingAddressKeys(business.address, h.address)
  );

  return [...explicitMatches, ...addrMatches];
}
