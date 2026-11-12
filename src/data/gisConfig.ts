import { FieldReport } from "../types";
import { KP3_CENTER, isPointInPolygon, calculateDistanceMeters } from "../utils/gisUtils";
import { GisPin, GisPinType, GisZoneDefinition } from "../components/gis/gisTypes";

export const BOUNDARY_COORDS_STORAGE_KEY = "kp3_gis_custom_boundary";
export const BOUNDARY_STYLE_STORAGE_KEY = "kp3_gis_boundary_style";
export const CUSTOM_PINS_STORAGE_KEY = "kp3_gis_custom_pins_v2";

export const KP3_OFFICIAL_MAP_IMAGE_URL =
  "https://danguy.phuonganphu.gov.vn/assets/images/maps/khu-pho-3.jpg?v=20261103-155725";

export const KP3_OFFICIAL_MAP_PORTAL_URL =
  "https://danguy.phuonganphu.gov.vn/ban-do";

export interface PinCategoryMeta {
  type: GisPinType;
  label: string;
  shortLabel: string;
  markerBg: string;
  markerBorder: string;
  pillBg: string;
  pillText: string;
  defaultCoverageMeters?: number;
}

export const PIN_CATEGORY_META: Record<GisPinType, PinCategoryMeta> = {
  civic: {
    type: "civic",
    label: "Điểm hành chính & An ninh KP3",
    shortLabel: "Hành chính KP3",
    markerBg: "#073B72",
    markerBorder: "#0f172a",
    pillBg: "bg-[#073B72]",
    pillText: "text-white",
  },
  report: {
    type: "report",
    label: "Phản ánh hiện trường 1022",
    shortLabel: "Phản ánh 1022",
    markerBg: "#991b1b",
    markerBorder: "#7f1d1d",
    pillBg: "bg-red-800",
    pillText: "text-white",
  },
  camera: {
    type: "camera",
    label: "Camera An ninh AI",
    shortLabel: "Camera",
    markerBg: "#047857",
    markerBorder: "#064e3b",
    pillBg: "bg-emerald-700",
    pillText: "text-white",
    defaultCoverageMeters: 60,
  },
  fire: {
    type: "fire",
    label: "Trụ nước & Điểm PCCC",
    shortLabel: "PCCC",
    markerBg: "#be123c",
    markerBorder: "#881337",
    pillBg: "bg-rose-700",
    pillText: "text-white",
    defaultCoverageMeters: 100,
  },
  light: {
    type: "light",
    label: "Đèn chiếu sáng Smart LED",
    shortLabel: "Đèn LED",
    markerBg: "#b45309",
    markerBorder: "#78350f",
    pillBg: "bg-amber-700",
    pillText: "text-white",
    defaultCoverageMeters: 45,
  },
  household: {
    type: "household",
    label: "Hộ gia đình",
    shortLabel: "Hộ dân",
    markerBg: "#4338ca",
    markerBorder: "#312e81",
    pillBg: "bg-indigo-700",
    pillText: "text-white",
  },
  business: {
    type: "business",
    label: "Cơ sở kinh doanh / Nhà trọ",
    shortLabel: "Kinh doanh",
    markerBg: "#0369a1",
    markerBorder: "#0c4a6e",
    pillBg: "bg-sky-700",
    pillText: "text-white",
  },
  custom: {
    type: "custom",
    label: "Điểm ghim bổ sung",
    shortLabel: "Điểm ghim",
    markerBg: "#334155",
    markerBorder: "#0f172a",
    pillBg: "bg-slate-700",
    pillText: "text-white",
  },
};

function makeZoneBox(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): { center: { lat: number; lng: number }; polygon: { lat: number; lng: number }[] } {
  return {
    center: {
      lat: Number(((minLat + maxLat) / 2).toFixed(6)),
      lng: Number(((minLng + maxLng) / 2).toFixed(6)),
    },
    polygon: [
      { lat: maxLat, lng: minLng },
      { lat: maxLat, lng: maxLng },
      { lat: minLat, lng: maxLng },
      { lat: minLat, lng: minLng },
    ],
  };
}

const ZONES_RAW: Array<{
  toNumber: number;
  cluster: "Bắc" | "Trung tâm" | "Nam";
  streets: string;
  fillColor: string;
  strokeColor: string;
  bounds: [number, number, number, number];
}> = [
  // Cụm Bắc: dọc ĐT.743A – Đường X3 – Lô A8/A10/A11/A12/A13
  {
    toNumber: 12,
    cluster: "Bắc",
    streets: "Đường X3, ĐT.743A, Lô A4–A8",
    fillColor: "#047857",
    strokeColor: "#064e3b",
    bounds: [10.9384, 10.9403, 106.7426, 106.7443],
  },
  {
    toNumber: 11,
    cluster: "Bắc",
    streets: "Đường X3, Lô A6–A10",
    fillColor: "#0369a1",
    strokeColor: "#0c4a6e",
    bounds: [10.9384, 10.9401, 106.7443, 106.7458],
  },
  {
    toNumber: 9,
    cluster: "Bắc",
    streets: "Nhánh Đông Bắc, Lô A13",
    fillColor: "#4338ca",
    strokeColor: "#312e81",
    bounds: [10.9382, 10.9396, 106.7458, 106.7478],
  },
  {
    toNumber: 7,
    cluster: "Bắc",
    streets: "Lô A12, Đường nội khu Bắc",
    fillColor: "#0f766e",
    strokeColor: "#134e4a",
    bounds: [10.9371, 10.9384, 106.7428, 106.7444],
  },
  {
    toNumber: 5,
    cluster: "Bắc",
    streets: "Đường X1, Lô A7–A11",
    fillColor: "#1d4ed8",
    strokeColor: "#1e3a8a",
    bounds: [10.9371, 10.9384, 106.7444, 106.7460],
  },
  {
    toNumber: 6,
    cluster: "Bắc",
    streets: "Đường X2, Lô A8 Đông",
    fillColor: "#b45309",
    strokeColor: "#78350f",
    bounds: [10.9370, 10.9382, 106.7460, 106.7481],
  },

  // Cụm Trung tâm: Trụ sở KP3 – X1 – X2 – N1 – N2
  {
    toNumber: 10,
    cluster: "Trung tâm",
    streets: "Lô A4–A5, Trục X1 Tây",
    fillColor: "#be123c",
    strokeColor: "#881337",
    bounds: [10.9358, 10.9371, 106.7426, 106.7443],
  },
  {
    toNumber: 8,
    cluster: "Trung tâm",
    streets: "Đường N1–N2, Lô A9 (Trung tâm KP3)",
    fillColor: "#059669",
    strokeColor: "#065f46",
    bounds: [10.9358, 10.9371, 106.7443, 106.7459],
  },
  {
    toNumber: 4,
    cluster: "Trung tâm",
    streets: "Đường N1–N2 Đông, Lô A4",
    fillColor: "#6d28d9",
    strokeColor: "#4c1d95",
    bounds: [10.9357, 10.9370, 106.7459, 106.7478],
  },
  {
    toNumber: 13,
    cluster: "Trung tâm",
    streets: "Hẻm nối KV AP12 – Đường D4",
    fillColor: "#0e7490",
    strokeColor: "#164e63",
    bounds: [10.9347, 10.9358, 106.7457, 106.7475],
  },

  // Cụm Nam: Đường D1 – D2 – D4 – Lô B1..B5 – C6 – Giáp Dĩ An
  {
    toNumber: 1,
    cluster: "Nam",
    streets: "Đường D1, Lô B1–B2 Tây Nam",
    fillColor: "#0284c7",
    strokeColor: "#075985",
    bounds: [10.9345, 10.9358, 106.7426, 106.7442],
  },
  {
    toNumber: 2,
    cluster: "Nam",
    streets: "Đường D2, Lô B3 Nam",
    fillColor: "#4f46e5",
    strokeColor: "#3730a3",
    bounds: [10.9345, 10.9358, 106.7442, 106.7457],
  },
  {
    toNumber: 3,
    cluster: "Nam",
    streets: "Lô B3–B5, C6, Giáp Đường N4",
    fillColor: "#c2410c",
    strokeColor: "#7c2d12",
    bounds: [10.9334, 10.9345, 106.7426, 106.7445],
  },
  {
    toNumber: 14,
    cluster: "Nam",
    streets: "PKV AP28–30, Lối Dĩ An",
    fillColor: "#7c3aed",
    strokeColor: "#5b21b6",
    bounds: [10.9334, 10.9347, 106.7445, 106.7466],
  },
];

export const KP3_14_ZONES: GisZoneDefinition[] = ZONES_RAW.map((z) => {
  const { center, polygon } = makeZoneBox(...z.bounds);
  return {
    id: `TDP_${z.toNumber}`,
    toNumber: z.toNumber,
    name: `Tổ dân phố ${z.toNumber}`,
    shortLabel: `Tổ ${z.toNumber}`,
    cluster: z.cluster,
    streets: z.streets,
    fillColor: z.fillColor,
    strokeColor: z.strokeColor,
    center,
    polygon,
  };
}).sort((a, b) => a.toNumber - b.toNumber);

export const DEFAULT_INFRASTRUCTURE_PINS: GisPin[] = [
  {
    id: "P_CIVIC_BDH",
    type: "civic",
    name: "Trụ sở Ban Điều Hành Khu phố 3",
    location: "Trung tâm KP3, Đường N1, Phường An Phú",
    status: "Hoạt động",
    lat: KP3_CENTER.lat,
    lng: KP3_CENTER.lng,
    toNumber: 8,
    details:
      "Điểm tiếp công dân, tiếp nhận phản ánh 1022 và điều phối 14 Tổ dân phố Khu phố 3.",
  },
  {
    id: "P_CIVIC_CHOT",
    type: "civic",
    name: "Chốt An ninh Trật tự Cổng ĐT.743A",
    location: "Ngã ba ĐT.743A & Đường X1, Tổ 12, Khu phố 3",
    status: "Hoạt động",
    lat: 10.9389,
    lng: 106.7429,
    toNumber: 12,
    details:
      "Điểm trực Tổ bảo vệ ANTT cơ sở, hỗ trợ điều tiết giao thông và tuần tra ban đêm.",
  },
  {
    id: "P_CAM_1",
    type: "camera",
    name: "Camera An Ninh Tổ 12",
    location: "Giao lộ ĐT.743B & Đường X1",
    status: "Hoạt động",
    lat: 10.936997,
    lng: 106.7435,
    toNumber: 10,
    coverageMeters: 60,
    details:
      "Camera IP 4MP giám sát an ninh 24/7 giao lộ hành lang huyết mạch vào Khu phố 3.",
  },
  {
    id: "P_CAM_2",
    type: "camera",
    name: "Camera Đường KV AP12",
    location: "Trước số nhà 124, Đường KV AP12",
    status: "Hoạt động",
    lat: 10.9378,
    lng: 106.7455,
    toNumber: 5,
    coverageMeters: 60,
    details:
      "Thiết bị giám sát điểm nút giao thông dân sinh trọng yếu thuộc Khu phố 3.",
  },
  {
    id: "P_CAM_3",
    type: "camera",
    name: "Camera Giám Sát Lối Đi Dĩ An",
    location: "Đoạn cuối Đường KV AP12 hướng đi Dĩ An",
    status: "Bảo trì",
    lat: 10.9358,
    lng: 106.7468,
    toNumber: 4,
    coverageMeters: 60,
    details:
      "Theo dõi lưu lượng phương tiện khu vực giáp ranh; đang kiểm tra nguồn truyền dẫn.",
  },
  {
    id: "P_FIRE_1",
    type: "fire",
    name: "Trụ Nước Chữa Cháy Tổ 3",
    location: "Giao lộ Đường X1 & Đường PKV AP29",
    status: "Hoạt động",
    lat: 10.9368,
    lng: 106.7446,
    toNumber: 8,
    coverageMeters: 100,
    details:
      "Trụ cấp nước 2 đầu chuẩn DN100 áp lực 3,2 bar phục vụ Tổ liên gia an toàn PCCC.",
  },
  {
    id: "P_FIRE_2",
    type: "fire",
    name: "Trụ Cứu Hỏa KV AP14",
    location: "Gần giao lộ PKV AP30 & KV AP14",
    status: "Hoạt động",
    lat: 10.9355,
    lng: 106.7452,
    toNumber: 2,
    coverageMeters: 100,
    details:
      "Họng tiếp nước xe cứu hỏa và điểm đặt thiết bị PCCC lưu động cho khu nhà trọ.",
  },
  {
    id: "P_LIGHT_1",
    type: "light",
    name: "Đèn Chiếu Sáng ĐT.743B - Trụ 04",
    location: "Dọc tuyến ĐT.743B, Tổ 12",
    status: "Hoạt động",
    lat: 10.9385,
    lng: 106.7432,
    toNumber: 12,
    coverageMeters: 45,
    details:
      "Hệ thống đèn LED thông minh 120W tự điều chỉnh độ sáng tiết kiệm 40% điện năng.",
  },
  {
    id: "P_LIGHT_2",
    type: "light",
    name: "Đèn Chiếu Sáng Đường PKV AP28",
    location: "Tuyến Đường PKV AP28, Tổ dân phố 14",
    status: "Cảnh báo",
    lat: 10.9365,
    lng: 106.7465,
    toNumber: 14,
    coverageMeters: 45,
    details:
      "Cảm biến phát hiện sụt áp nhánh LED 02, đã ghi nhận chờ đội kỹ thuật kiểm tra.",
  },
];

const EXTERNAL_LOCATION_KEYWORDS = [
  "vĩnh tân",
  "đông thành",
  "dĩ an",
  "đông hòa",
  "khánh hội",
  "lái thiêu",
  "tân khánh",
  "thới hòa",
  "tân thuận",
  "thủ dầu một",
  "tây ninh",
  "hóc môn",
  "khu phố 1a",
  "khu phố 2",
  "khu phố 6",
];

/**
 * Extracts Tổ Dân Phố number (1..14) from a KP3 address or falls back to spatial zone detection.
 */
export function extractToDanPhoNumber(
  address?: string,
  fallbackLat?: number,
  fallbackLng?: number
): number | null {
  if (address) {
    const lower = address.toLowerCase();
    const mentionsKp3 = lower.includes("khu phố 3") || lower.includes("kp3") || lower.includes("kp 3");
    const looksExternal =
      !mentionsKp3 && EXTERNAL_LOCATION_KEYWORDS.some((kw) => lower.includes(kw));

    if (!looksExternal) {
      const match = lower.match(/(?:t[ổởơ]|tdp)\s*0?(\d{1,2})\b/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed >= 1 && parsed <= 14) {
          return parsed;
        }
      }
    }
  }

  if (typeof fallbackLat === "number" && typeof fallbackLng === "number") {
    const zone = detectToDanPhoFromCoord(fallbackLat, fallbackLng);
    return zone ? zone.toNumber : null;
  }

  return null;
}

/**
 * Finds the matching Tổ Dân Phố zone containing a WGS-84 coordinate (or closest zone inside KP3 radius).
 */
export function detectToDanPhoFromCoord(
  lat: number,
  lng: number
): GisZoneDefinition | null {
  const inside = KP3_14_ZONES.find((z) => isPointInPolygon({ lat, lng }, z.polygon));
  if (inside) return inside;

  // Fallback to closest centroid if within ~600m of KP3 center
  const distToKp3 = calculateDistanceMeters(lat, lng, KP3_CENTER.lat, KP3_CENTER.lng);
  if (distToKp3 > 650) return null;

  let best: GisZoneDefinition | null = null;
  let bestDist = Infinity;
  for (const z of KP3_14_ZONES) {
    const d = calculateDistanceMeters(lat, lng, z.center.lat, z.center.lng);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return best;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates deterministic WGS-84 coordinates inside the address's Tổ Dân Phố polygon (or near KP3 center).
 */
export function generateToAwareCoordinates(
  address: string,
  seedId: string
): { lat: number; lng: number } {
  const toNum = extractToDanPhoNumber(address);
  const zone = toNum ? KP3_14_ZONES.find((z) => z.toNumber === toNum) : null;
  const seed = hashSeed(`${address}-${seedId}`);

  if (zone) {
    const offsetLat = (((seed % 100) / 100) - 0.5) * 0.00075;
    const offsetLng = ((((seed >> 8) % 100) / 100) - 0.5) * 0.00095;
    return {
      lat: Number((zone.center.lat + offsetLat).toFixed(6)),
      lng: Number((zone.center.lng + offsetLng).toFixed(6)),
    };
  }

  const offsetLat = (((seed % 100) / 100) - 0.5) * 0.0022;
  const offsetLng = ((((seed >> 8) % 100) / 100) - 0.5) * 0.0022;
  return {
    lat: Number((KP3_CENTER.lat + offsetLat).toFixed(6)),
    lng: Number((KP3_CENTER.lng + offsetLng).toFixed(6)),
  };
}

/**
 * Converts a FieldReport into a normalized GIS pin anchored in KP3 if real lat/lng missing.
 */
export function mapFieldReportToGisPin(report: FieldReport): GisPin {
  let lat = report.lat;
  let lng = report.lng;

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat === 0 ||
    lng === 0
  ) {
    const gen = generateToAwareCoordinates(report.location, report.id);
    lat = gen.lat;
    lng = gen.lng;
  }

  const toNum = extractToDanPhoNumber(report.location, lat, lng);
  const status: GisPin["status"] =
    report.status === "Đã giải quyết"
      ? "Đã giải quyết"
      : report.priority === "Khẩn cấp"
      ? "Khẩn cấp"
      : "Đang xử lý";

  return {
    id: `R_PIN_${report.id}`,
    sourceId: report.id,
    alleyGroup: report.alleyGroup,
    type: "report",
    name: report.title,
    location: report.location,
    status,
    priority: report.priority || "Bình thường",
    reportCategory: report.category,
    lat,
    lng,
    toNumber: toNum,
    details: `[${report.category}] ${report.description} (${report.reportedAt})`,
  };
}

/**
 * Masks sensitive household PII when displayed on the Citizen Portal (`readOnly` mode).
 */
export function sanitizePinForCitizen(pin: GisPin): GisPin {
  if (pin.type === "household") {
    const toLabel = pin.toNumber ? `Tổ dân phố ${pin.toNumber}` : "Khu phố 3";
    return {
      ...pin,
      name: `Cụm hộ dân cư (${toLabel})`,
      location: `${toLabel}, Khu phố 3, Phường An Phú`,
      details:
        "Thông tin nhân khẩu chi tiết và mã sổ hộ khẩu được ẩn để bảo vệ quyền riêng tư trên Cổng Cư dân.",
    };
  }

  if (pin.type === "report") {
    const toLabel = pin.toNumber ? `Tổ ${pin.toNumber}, KP3` : "Khu phố 3";
    return {
      ...pin,
      location: pin.alleyGroup ? `${pin.alleyGroup} (${toLabel})` : `${toLabel}, Phường An Phú`,
      details: `[${pin.reportCategory || "Phản ánh"}] ${pin.status}. Vị trí được khái quát theo tuyến đường nhằm bảo mật người gửi.`,
    };
  }

  return pin;
}

/**
 * Vietnamese rounded coordinate text (`10,9370° B · 106,7447° Đ`).
 */
export function formatLatLngVN(lat: number, lng: number): string {
  const fLat = lat.toFixed(4).replace(".", ",");
  const fLng = lng.toFixed(4).replace(".", ",");
  return `${fLat}° B · ${fLng}° Đ`;
}
