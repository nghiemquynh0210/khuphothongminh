export type GisPinType =
  | "household"
  | "business"
  | "camera"
  | "fire"
  | "light"
  | "report"
  | "civic"
  | "custom";

export type GisPinStatus =
  | "Hoạt động"
  | "Cảnh báo"
  | "Bảo trì"
  | "Đang xử lý"
  | "Khẩn cấp"
  | "Đã giải quyết";

export interface GisPin {
  id: string;
  type: GisPinType;
  name: string;
  location: string;
  status: GisPinStatus;
  lat: number;
  lng: number;
  details: string;
  toNumber?: number | null;
  sourceId?: string;
  alleyGroup?: string;
  priority?: "Bình thường" | "Cao" | "Khẩn cấp";
  reportCategory?: string;
  coverageMeters?: number;
}

export interface GisLayersState {
  boundary: boolean;
  civic: boolean;
  reports: boolean;
  households: boolean;
  businesses: boolean;
  cameras: boolean;
  fire: boolean;
  light: boolean;
  custom: boolean;
}

export type GisWorkspaceMode = "map" | "schematic";

export type GisClusterName = "Bắc" | "Trung tâm" | "Nam";

export interface GisZoneDefinition {
  id: string;
  toNumber: number;
  name: string;
  shortLabel: string;
  cluster: GisClusterName;
  streets: string;
  fillColor: string;
  strokeColor: string;
  center: { lat: number; lng: number };
  polygon: { lat: number; lng: number }[];
}

export interface ToStatsSummary {
  zone: GisZoneDefinition;
  householdCount: number;
  businessCount: number;
  infraCount: number;
  activeReportCount: number;
}

export interface GisPickedLocation {
  lat: number;
  lng: number;
  detectedTo: number | null;
}
