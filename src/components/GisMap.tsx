import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Compass,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  Business,
  FieldReport,
  Household,
  Resident,
  TargetGisItem,
} from "../types";
import {
  KP3_CENTER,
  calculateDistanceMeters,
  calculatePolygonAreaMeters,
  calculatePolygonPerimeterMeters,
  formatArea,
  formatDistance,
  generateRouteSteps,
  parseCoordinates,
} from "../utils/gisUtils";
import { formatTextNumbers, formatVNNumber } from "../utils/numberFormat";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import LeafletGisMap from "./gis/LeafletGisMap";
import GisBoundaryManagerModal, {
  BoundaryStyle,
  DEFAULT_KP3_BOUNDARY,
} from "./gis/GisBoundaryManagerModal";
import Kp3SchematicView from "./gis/Kp3SchematicView";
import GisPinListPanel from "./gis/GisPinListPanel";
import GisPinDetailDrawer from "./gis/GisPinDetailDrawer";
import GisPinFormModal from "./gis/GisPinFormModal";
import GisSyncModal from "./gis/GisSyncModal";
import {
  BOUNDARY_COORDS_STORAGE_KEY,
  BOUNDARY_STYLE_STORAGE_KEY,
  CUSTOM_PINS_STORAGE_KEY,
  DEFAULT_INFRASTRUCTURE_PINS,
  KP3_14_ZONES,
  detectToDanPhoFromCoord,
  extractToDanPhoNumber,
  formatLatLngVN,
  generateToAwareCoordinates,
  mapFieldReportToGisPin,
  sanitizePinForCitizen,
} from "../data/gisConfig";
import {
  GisLayersState,
  GisPickedLocation,
  GisPin,
  GisPinType,
  GisWorkspaceMode,
  ToStatsSummary,
} from "./gis/gisTypes";

export type { GisPin } from "./gis/gisTypes";

export interface GisMapProps {
  households?: Household[];
  onUpdateHouseholds?:
    | React.Dispatch<React.SetStateAction<Household[]>>
    | ((h: Household[]) => void);
  residents?: Resident[];
  onUpdateResidents?:
    | React.Dispatch<React.SetStateAction<Resident[]>>
    | ((r: Resident[]) => void);
  businesses?: Business[];
  onUpdateBusinesses?:
    | React.Dispatch<React.SetStateAction<Business[]>>
    | ((b: Business[]) => void);
  reports?: FieldReport[];
  targetGisItem?: TargetGisItem | null;
  onClearTargetGisItem?: () => void;
  onNavigateToReport?: (reportId?: string) => void;
  readOnly?: boolean;
}

const DEFAULT_BOUNDARY_STYLE: BoundaryStyle = {
  strokeColor: "#047857",
  strokeWeight: 3,
  fillColor: "#047857",
  fillOpacity: 0.15,
};

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function GisMap({
  households = [],
  onUpdateHouseholds,
  businesses = [],
  onUpdateBusinesses,
  reports = [],
  targetGisItem,
  onClearTargetGisItem,
  onNavigateToReport,
  readOnly = false,
}: GisMapProps) {
  const [workspaceMode, setWorkspaceMode] = useState<GisWorkspaceMode>("map");
  const [showSidebar, setShowSidebar] = useState(true);

  const [boundaryCoords, setBoundaryCoords] = useState<{ lat: number; lng: number }[]>(
    () => {
      const saved = loadStoredJson<{ lat: number; lng: number }[]>(
        BOUNDARY_COORDS_STORAGE_KEY,
        DEFAULT_KP3_BOUNDARY
      );
      return Array.isArray(saved) && saved.length >= 3 ? saved : DEFAULT_KP3_BOUNDARY;
    }
  );
  const [boundaryStyle, setBoundaryStyle] = useState<BoundaryStyle>(() =>
    loadStoredJson<BoundaryStyle>(BOUNDARY_STYLE_STORAGE_KEY, DEFAULT_BOUNDARY_STYLE)
  );
  const [customPins, setCustomPins] = useState<GisPin[]>(() =>
    loadStoredJson<GisPin[]>(CUSTOM_PINS_STORAGE_KEY, [])
  );

  const [layers, setLayers] = useState<GisLayersState>(() => ({
    boundary: true,
    civic: true,
    reports: true,
    cameras: true,
    fire: true,
    light: true,
    businesses: true,
    households: !readOnly,
    custom: true,
  }));

  useEffect(() => {
    if (readOnly) {
      setLayers((prev) => ({ ...prev, households: false }));
    }
  }, [readOnly]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterType, setActiveFilterType] = useState<"ALL" | GisPinType>("ALL");
  const [activeToFilter, setActiveToFilter] = useState<number | null>(null);

  const [selectedPin, setSelectedPin] = useState<GisPin | null>(null);
  const [routeTarget, setRouteTarget] = useState<GisPin | null>(null);
  const [showCoverageRadius, setShowCoverageRadius] = useState(false);
  const [focusZoomCoord, setFocusZoomCoord] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    ts?: number;
  } | null>(null);

  // Editing & Modals
  const [boundaryEditMode, setBoundaryEditMode] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);
  const [confirmClearBoundary, setConfirmClearBoundary] = useState(false);
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);
  const [isPinFormOpen, setIsPinFormOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [liveCameraPin, setLiveCameraPin] = useState<GisPin | null>(null);

  // 1-tap map location picking (either for form creation OR updating an existing pin)
  const [pickPurpose, setPickPurpose] = useState<
    null | { kind: "form" } | { kind: "reposition"; pin: GisPin }
  >(null);
  const [pickedLocation, setPickedLocation] = useState<GisPickedLocation | null>(null);

  const [toastMsg, setToastMsg] = useState("");

  const notify = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    try {
      localStorage.setItem(BOUNDARY_COORDS_STORAGE_KEY, JSON.stringify(boundaryCoords));
    } catch {
      // Ignore storage quota issues
    }
  }, [boundaryCoords]);

  useEffect(() => {
    try {
      localStorage.setItem(BOUNDARY_STYLE_STORAGE_KEY, JSON.stringify(boundaryStyle));
    } catch {
      // Ignore storage quota issues
    }
  }, [boundaryStyle]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PINS_STORAGE_KEY, JSON.stringify(customPins));
    } catch {
      // Ignore storage quota issues
    }
  }, [customPins]);

  // Derived Missing Records
  const missingHouseholds = useMemo(
    () => households.filter((h) => !parseCoordinates(h.coordinates)),
    [households]
  );
  const missingBusinesses = useMemo(
    () => businesses.filter((b) => !parseCoordinates(b.coordinates)),
    [businesses]
  );
  const unpinnedReportCount = useMemo(
    () =>
      reports.filter(
        (r) => typeof r.lat !== "number" || typeof r.lng !== "number" || !r.lat || !r.lng
      ).length,
    [reports]
  );

  // Convert entities into normalized GisPins
  const rawAllPins = useMemo<GisPin[]>(() => {
    const infraAndCustom = [...DEFAULT_INFRASTRUCTURE_PINS, ...customPins];
    const repPins = reports.map(mapFieldReportToGisPin);

    const bizPins: GisPin[] = [];
    for (const b of businesses) {
      const pt = parseCoordinates(b.coordinates);
      if (!pt) continue;
      bizPins.push({
        id: `BIZ_PIN_${b.id}`,
        sourceId: b.id,
        type: "business",
        name: b.name,
        location: b.address,
        status: b.status === "Tạm ngưng" ? "Bảo trì" : "Hoạt động",
        lat: pt.lat,
        lng: pt.lng,
        toNumber: extractToDanPhoNumber(b.address, pt.lat, pt.lng),
        details: `${b.type} · Chủ hộ/Đại diện: ${b.owner} · ${formatVNNumber(
          b.employeeCount || 0
        )} lao động.`,
      });
    }

    const hhPins: GisPin[] = [];
    if (!readOnly) {
      for (const h of households) {
        const pt = parseCoordinates(h.coordinates);
        if (!pt) continue;
        hhPins.push({
          id: `HH_PIN_${h.id}`,
          sourceId: h.id,
          type: "household",
          name: `${h.code} · ${h.ownerName}`,
          location: h.address,
          status: "Hoạt động",
          lat: pt.lat,
          lng: pt.lng,
          toNumber: extractToDanPhoNumber(h.address, pt.lat, pt.lng),
          details: `Hộ ${h.type || "Thường trú"} · ${formatVNNumber(h.memberCount)} nhân khẩu.`,
        });
      }
    }

    return [...infraAndCustom, ...repPins, ...bizPins, ...hhPins];
  }, [customPins, reports, businesses, households, readOnly]);

  const allPins = useMemo(
    () => (readOnly ? rawAllPins.map(sanitizePinForCitizen) : rawAllPins),
    [rawAllPins, readOnly]
  );

  const layerCounts = useMemo(() => {
    const counts: Record<GisPinType, number> = {
      civic: 0,
      report: 0,
      camera: 0,
      fire: 0,
      light: 0,
      business: 0,
      household: 0,
      custom: 0,
    };
    for (const p of allPins) {
      counts[p.type] = (counts[p.type] || 0) + 1;
    }
    if (readOnly) {
      counts.household = households.length;
    }
    return counts;
  }, [allPins, readOnly, households.length]);

  const toStats = useMemo<ToStatsSummary[]>(() => {
    return KP3_14_ZONES.map((zone) => {
      const toNum = zone.toNumber;
      const householdCount = households.filter((h) => {
        const pt = parseCoordinates(h.coordinates);
        return extractToDanPhoNumber(h.address, pt?.lat, pt?.lng) === toNum;
      }).length;
      const businessCount = businesses.filter((b) => {
        const pt = parseCoordinates(b.coordinates);
        return extractToDanPhoNumber(b.address, pt?.lat, pt?.lng) === toNum;
      }).length;
      const infraCount = [...DEFAULT_INFRASTRUCTURE_PINS, ...customPins].filter(
        (p) => (p.toNumber || detectToDanPhoFromCoord(p.lat, p.lng)?.toNumber) === toNum
      ).length;
      const activeReportCount = reports.filter((r) => {
        if (r.status === "Đã giải quyết") return false;
        return extractToDanPhoNumber(r.location, r.lat, r.lng) === toNum;
      }).length;

      return {
        zone,
        householdCount,
        businessCount,
        infraCount,
        activeReportCount,
      };
    });
  }, [households, businesses, customPins, reports]);

  const filteredPins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPins.filter((pin) => {
      if (activeFilterType !== "ALL" && pin.type !== activeFilterType) {
        return false;
      }
      if (activeToFilter !== null && pin.toNumber !== activeToFilter) {
        return false;
      }
      if (!q) return true;
      return (
        pin.name.toLowerCase().includes(q) ||
        pin.location.toLowerCase().includes(q) ||
        pin.details.toLowerCase().includes(q) ||
        (pin.toNumber ? `tổ ${pin.toNumber}`.includes(q) : false)
      );
    });
  }, [allPins, activeFilterType, activeToFilter, searchQuery]);

  // Deep-link handler when navigated from Households / Businesses / Reports
  useEffect(() => {
    if (!targetGisItem) return;

    setWorkspaceMode("map");
    const normType: GisPinType =
      targetGisItem.type === "enterprise"
        ? "business"
        : (targetGisItem.type as GisPinType) || "custom";

    // Enable the target layer if currently turned off
    setLayers((prev) => ({
      ...prev,
      cameras: normType === "camera" ? true : prev.cameras,
      fire: normType === "fire" ? true : prev.fire,
      light: normType === "light" ? true : prev.light,
      businesses: normType === "business" ? true : prev.businesses,
      households: normType === "household" && !readOnly ? true : prev.households,
      reports: normType === "report" ? true : prev.reports,
      civic: normType === "civic" ? true : prev.civic,
      custom: normType === "custom" ? true : prev.custom,
    }));

    const existing = allPins.find(
      (p) =>
        (targetGisItem.id && p.sourceId === targetGisItem.id) ||
        p.name.toLowerCase().includes(targetGisItem.name.toLowerCase())
    );

    if (existing) {
      setSelectedPin(existing);
      setFocusZoomCoord({ lat: existing.lat, lng: existing.lng, zoom: 18, ts: Date.now() });
      if (targetGisItem.navigateRoute) {
        setRouteTarget(existing);
      }
      notify(`Đã định vị: ${existing.name}`);
    } else {
      const explicitPt =
        typeof targetGisItem.lat === "number" && typeof targetGisItem.lng === "number"
          ? { lat: targetGisItem.lat, lng: targetGisItem.lng }
          : parseCoordinates(targetGisItem.coordinates) ||
            generateToAwareCoordinates(targetGisItem.address || "Khu phố 3", targetGisItem.name);

      const synthetic: GisPin = {
        id: `TARGET_${Date.now()}`,
        sourceId: targetGisItem.id,
        type: normType === "household" && readOnly ? "custom" : normType,
        name: targetGisItem.name,
        location: targetGisItem.address || "Khu phố 3, Phường An Phú",
        status: "Hoạt động",
        lat: explicitPt.lat,
        lng: explicitPt.lng,
        toNumber: extractToDanPhoNumber(targetGisItem.address, explicitPt.lat, explicitPt.lng),
        details: "Điểm định vị từ phân hệ liên thông Khu phố 3.",
      };
      setSelectedPin(synthetic);
      setFocusZoomCoord({ lat: synthetic.lat, lng: synthetic.lng, zoom: 18, ts: Date.now() });
      if (targetGisItem.navigateRoute) {
        setRouteTarget(synthetic);
      }
      notify(`Đã mở vị trí: ${synthetic.name}`);
    }

    onClearTargetGisItem?.();
  }, [targetGisItem, allPins, readOnly, onClearTargetGisItem]);

  const handleToggleLayer = (key: keyof GisLayersState) => {
    if (readOnly && key === "households") return;
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectPin = (pin: GisPin) => {
    setSelectedPin(pin);
    setFocusZoomCoord({ lat: pin.lat, lng: pin.lng, zoom: 18, ts: Date.now() });
  };

  const handleSelectToFilter = (toNum: number | null) => {
    setActiveToFilter(toNum);
    if (toNum !== null) {
      const zone = KP3_14_ZONES.find((z) => z.toNumber === toNum);
      if (zone) {
        setFocusZoomCoord({ lat: zone.center.lat, lng: zone.center.lng, zoom: 18, ts: Date.now() });
      }
    }
  };

  const handleSelectToFromSchematic = (toNum: number) => {
    setActiveToFilter(toNum);
    setWorkspaceMode("map");
    const zone = KP3_14_ZONES.find((z) => z.toNumber === toNum);
    if (zone) {
      setFocusZoomCoord({ lat: zone.center.lat, lng: zone.center.lng, zoom: 18, ts: Date.now() });
      notify(`Đã chuyển đến Tổ dân phố ${toNum} (Cụm ${zone.cluster}).`);
    }
  };

  const handleUpdateMilestoneCoord = (index: number, coord: { lat: number; lng: number }) => {
    setBoundaryCoords((prev) => prev.map((pt, i) => (i === index ? coord : pt)));
  };

  const handleAddVertexFromMap = (coord: { lat: number; lng: number }) => {
    if (readOnly) return;
    setBoundaryCoords((prev) => [...prev, coord]);
    notify(`Đã thêm mốc ranh giới mới (${formatLatLngVN(coord.lat, coord.lng)}).`);
  };

  const handlePickLocationFromMap = (loc: GisPickedLocation) => {
    if (pickPurpose?.kind === "reposition") {
      const pin = pickPurpose.pin;
      const coordStr = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;

      if (pin.type === "household" && pin.sourceId && onUpdateHouseholds) {
        onUpdateHouseholds((prev) =>
          prev.map((h) => (h.id === pin.sourceId ? { ...h, coordinates: coordStr } : h))
        );
      } else if (pin.type === "business" && pin.sourceId && onUpdateBusinesses) {
        onUpdateBusinesses((prev) =>
          prev.map((b) => (b.id === pin.sourceId ? { ...b, coordinates: coordStr } : b))
        );
      } else {
        setCustomPins((prev) => {
          const exists = prev.some((c) => c.id === pin.id);
          if (exists) {
            return prev.map((c) =>
              c.id === pin.id
                ? { ...c, lat: loc.lat, lng: loc.lng, toNumber: loc.detectedTo }
                : c
            );
          }
          return [
            ...prev,
            {
              ...pin,
              id: `CUSTOM_${Date.now()}`,
              type: "custom",
              lat: loc.lat,
              lng: loc.lng,
              toNumber: loc.detectedTo,
            },
          ];
        });
      }

      setSelectedPin((prev) =>
        prev && prev.id === pin.id
          ? { ...prev, lat: loc.lat, lng: loc.lng, toNumber: loc.detectedTo ?? prev.toNumber }
          : prev
      );
      setPickPurpose(null);
      notify(
        `Đã cập nhật tọa độ mới (${formatLatLngVN(loc.lat, loc.lng)})${
          loc.detectedTo ? ` · Tổ ${loc.detectedTo}` : ""
        }.`
      );
      return;
    }

    // Standard form pick mode
    setPickedLocation(loc);
    setPickPurpose(null);
    setIsPinFormOpen(true);
    notify(
      `Đã lấy tọa độ ${formatLatLngVN(loc.lat, loc.lng)}${
        loc.detectedTo ? ` (Tổ ${loc.detectedTo})` : ""
      }.`
    );
  };

  const handleAssignHousehold = (householdId: string, lat: number, lng: number) => {
    if (readOnly || !onUpdateHouseholds) return;
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    onUpdateHouseholds((prev) =>
      prev.map((h) => (h.id === householdId ? { ...h, coordinates: coordStr } : h))
    );
    notify("Đã lưu tọa độ hộ gia đình lên bản đồ GIS KP3.");
  };

  const handleAssignBusiness = (businessId: string, lat: number, lng: number) => {
    if (readOnly || !onUpdateBusinesses) return;
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    onUpdateBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, coordinates: coordStr } : b))
    );
    notify("Đã lưu tọa độ cơ sở kinh doanh lên bản đồ GIS KP3.");
  };

  const handleAddCustomPin = (pinData: Omit<GisPin, "id">) => {
    if (readOnly) return;
    const newPin: GisPin = { ...pinData, id: `CUSTOM_${Date.now()}` };
    setCustomPins((prev) => [newPin, ...prev]);
    setSelectedPin(newPin);
    setFocusZoomCoord({ lat: newPin.lat, lng: newPin.lng, zoom: 18, ts: Date.now() });
    notify(`Đã ghim điểm mới: ${newPin.name}`);
  };

  const handleDeleteCustomPin = (pinId: string) => {
    if (readOnly) return;
    setCustomPins((prev) => prev.filter((p) => p.id !== pinId));
    if (selectedPin?.id === pinId) setSelectedPin(null);
    if (routeTarget?.id === pinId) setRouteTarget(null);
    notify("Đã xóa điểm ghim bổ sung khỏi bản đồ.");
  };

  const handleConfirmSyncAll = () => {
    if (readOnly) return;
    if (onUpdateHouseholds && missingHouseholds.length > 0) {
      onUpdateHouseholds((prev) =>
        prev.map((h) => {
          if (parseCoordinates(h.coordinates)) return h;
          const pt = generateToAwareCoordinates(h.address, h.id);
          return { ...h, coordinates: `${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}` };
        })
      );
    }
    if (onUpdateBusinesses && missingBusinesses.length > 0) {
      onUpdateBusinesses((prev) =>
        prev.map((b) => {
          if (parseCoordinates(b.coordinates)) return b;
          const pt = generateToAwareCoordinates(b.address, b.id);
          return { ...b, coordinates: `${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}` };
        })
      );
    }
    notify(
      `Đã đồng bộ tọa độ GIS theo Tổ dân phố cho ${formatVNNumber(
        missingHouseholds.length + missingBusinesses.length
      )} hồ sơ.`
    );
  };

  const areaFormatted = formatArea(calculatePolygonAreaMeters(boundaryCoords));
  const perimeterFormatted = formatDistance(calculatePolygonPerimeterMeters(boundaryCoords));

  const activeReportsCount = useMemo(
    () => reports.filter((r) => r.status !== "Đã giải quyết").length,
    [reports]
  );

  const routeSteps = useMemo(() => {
    if (!routeTarget) return [];
    const dist = calculateDistanceMeters(
      KP3_CENTER.lat,
      KP3_CENTER.lng,
      routeTarget.lat,
      routeTarget.lng
    );
    return generateRouteSteps(routeTarget.name, routeTarget.location, dist);
  }, [routeTarget]);

  const missingTotal = missingHouseholds.length + missingBusinesses.length;

  return (
    <div className="space-y-5 min-w-0">
      {/* Live Status Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold max-w-sm"
        >
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Executive Page Header */}
      <PageHeader
        badgeIcon={<MapIcon size={14} className="text-emerald-700 shrink-0" />}
        badgeText="GIS KHU PHỐ 3"
        badgeSubtext={readOnly ? "CƯ DÂN" : "14 TỔ DP"}
        title="Bản đồ Số GIS & Sơ đồ Khu phố 3"
        description={
          readOnly
            ? "Tra cứu điểm hành chính, phản ánh 1022, camera an ninh, trụ PCCC, cơ sở kinh doanh và sơ đồ 14 Tổ dân phố Khu phố 3."
            : "Điều hành không gian thực địa 14 Tổ Dân Phố, lớp phản ánh 1022, hạ tầng an ninh – PCCC và ranh giới địa bàn KP3."
        }
        actions={
          !readOnly ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {missingTotal > 0 && (
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={() => setIsSyncModalOpen(true)}
                >
                  Đồng bộ ({formatVNNumber(missingTotal)})
                </Button>
              )}
              <Button
                variant="emerald"
                size="md"
                leftIcon={<Plus size={15} />}
                onClick={() => {
                  setWorkspaceMode("map");
                  setIsPinFormOpen(true);
                }}
              >
                Ghim vị trí mới
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Citizen Privacy Guard */}
      {readOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#073B72] font-medium">
          <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
          <span>
            Bạn đang xem Bản đồ số với vai trò <strong>Cư dân Khu phố 3</strong>. Thông tin nhân khẩu hộ gia đình và tọa độ chi tiết người gửi phản ánh được ẩn để bảo vệ quyền riêng tư.
          </span>
        </div>
      )}

      {/* 4 KPI Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Hộ gia đình KP3"
          value={households.length}
          badge="hộ"
          icon={MapPin}
          color="indigo"
          highlighted={activeFilterType === "household"}
          subtext={
            readOnly
              ? "Thống kê tổng hợp KP3"
              : `${households.length - missingHouseholds.length} hộ đã gắn tọa độ`
          }
          subtextRight="14 Tổ DP"
          onClick={
            readOnly
              ? () => setWorkspaceMode("schematic")
              : () => {
                  setWorkspaceMode("map");
                  setActiveFilterType((f) => (f === "household" ? "ALL" : "household"));
                }
          }
        />
        <StatCard
          label="Cơ sở kinh doanh"
          value={businesses.length}
          badge="cơ sở"
          icon={Compass}
          color="blue"
          highlighted={activeFilterType === "business"}
          subtext={`${businesses.length - missingBusinesses.length} đã định vị GPS`}
          subtextRight="An Phú"
          onClick={() => {
            setWorkspaceMode("map");
            setActiveFilterType((f) => (f === "business" ? "ALL" : "business"));
          }}
        />
        <StatCard
          label="Hạ tầng An ninh"
          value={layerCounts.camera + layerCounts.fire + layerCounts.light + layerCounts.civic}
          badge="điểm"
          icon={Camera}
          color="emerald"
          highlighted={activeFilterType === "camera"}
          subtext={`${layerCounts.camera} Camera · ${layerCounts.fire} PCCC`}
          subtextRight={`${layerCounts.light} Đèn LED`}
          onClick={() => {
            setWorkspaceMode("map");
            setActiveFilterType((f) => (f === "camera" ? "ALL" : "camera"));
          }}
        />
        <StatCard
          label="Phản ánh 1022"
          value={reports.length}
          badge="vụ"
          icon={AlertTriangle}
          color="rose"
          highlighted={activeFilterType === "report"}
          subtext={`${activeReportsCount} đang xử lý`}
          subtextRight={`${Math.max(0, reports.length - activeReportsCount)} đã xong`}
          onClick={() => {
            setWorkspaceMode("map");
            setActiveFilterType((f) => (f === "report" ? "ALL" : "report"));
          }}
        />
      </div>

      {/* Workspace Mode Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div className="flex items-center gap-2" role="tablist" aria-label="Chế độ xem GIS Khu phố 3">
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "map"}
            onClick={() => setWorkspaceMode("map")}
            className={`min-h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              workspaceMode === "map"
                ? "bg-[#073B72] text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            <MapIcon size={14} /> Bản đồ GIS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "schematic"}
            onClick={() => setWorkspaceMode("schematic")}
            className={`min-h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              workspaceMode === "schematic"
                ? "bg-[#073B72] text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            <LayoutGrid size={14} /> Sơ đồ KP3 (14 Tổ)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {workspaceMode === "map" && (
            <button
              type="button"
              onClick={() => setShowSidebar((v) => !v)}
              className="hidden lg:inline-flex min-h-9 px-3 rounded-xl bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold items-center gap-1.5 cursor-pointer"
            >
              {showSidebar ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              {showSidebar ? "Thu gọn bộ lọc" : "Mở bộ lọc lớp"}
            </button>
          )}
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            Diện tích: <strong className="text-slate-900">{areaFormatted}</strong> · Chu vi:{" "}
            <strong className="text-slate-900">{perimeterFormatted}</strong>
          </span>
        </div>
      </div>

      {/* Main Content Workspace */}
      {workspaceMode === "schematic" ? (
        <Kp3SchematicView
          toStats={toStats}
          activeToFilter={activeToFilter}
          onSelectToOnMap={handleSelectToFromSchematic}
          onResetToFilter={() => setActiveToFilter(null)}
          onOpenBoundaryModal={!readOnly ? () => setIsBoundaryModalOpen(true) : undefined}
          readOnly={readOnly}
          areaFormatted={areaFormatted}
          perimeterFormatted={perimeterFormatted}
          verticesCount={boundaryCoords.length}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {showSidebar && (
            <div className="lg:col-span-4 min-w-0">
              <GisPinListPanel
                layers={layers}
                onToggleLayer={handleToggleLayer}
                boundaryCount={boundaryCoords.length}
                boundaryEditMode={boundaryEditMode}
                onToggleBoundaryEditMode={() => setBoundaryEditMode((v) => !v)}
                onOpenBoundaryModal={() => setIsBoundaryModalOpen(true)}
                layerCounts={layerCounts}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                activeFilterType={activeFilterType}
                onChangeFilterType={setActiveFilterType}
                activeToFilter={activeToFilter}
                onChangeToFilter={handleSelectToFilter}
                filteredPins={filteredPins}
                selectedPinId={selectedPin?.id || null}
                onSelectPin={handleSelectPin}
                readOnly={readOnly}
                missingCoordCount={missingTotal}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
              />
            </div>
          )}

          <div
            className={`${
              showSidebar ? "lg:col-span-8" : "lg:col-span-12"
            } min-w-0 space-y-4`}
          >
            {/* Boundary Live Edit HUD */}
            {!readOnly && boundaryEditMode && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="space-y-0.5 text-amber-950">
                  <div className="font-bold flex items-center gap-1.5">
                    <Compass size={14} className="text-amber-700" />
                    Chế độ chỉnh sửa Ranh giới trực tiếp ({formatVNNumber(boundaryCoords.length)} mốc · {areaFormatted})
                  </div>
                  <p className="text-amber-900">
                    Kéo thả các mốc tròn trên bản đồ để nắn đường biên hoặc chạm bản đồ để thêm mốc mới.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={boundaryCoords.length <= 3}
                    onClick={() => setBoundaryCoords((prev) => prev.slice(0, -1))}
                    className="min-h-8 px-2.5 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold disabled:opacity-45 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw size={13} /> Hoàn tác mốc cuối
                  </button>
                  {confirmClearBoundary ? (
                    <div className="flex items-center gap-1.5 bg-white border border-rose-300 rounded-lg px-2 py-1">
                      <span className="font-bold text-rose-900">Đặt về KP3 gốc?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBoundaryCoords([...DEFAULT_KP3_BOUNDARY]);
                          setConfirmClearBoundary(false);
                          notify("Đã khôi phục 12 mốc ranh giới gốc KP3.");
                        }}
                        className="min-h-8 px-2 bg-rose-700 text-white rounded font-bold cursor-pointer"
                      >
                        Đồng ý
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearBoundary(false)}
                        className="min-h-8 px-2 bg-slate-100 text-slate-800 rounded font-semibold cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearBoundary(true)}
                      className="min-h-8 px-2.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Khôi phục 12 mốc gốc
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBoundaryEditMode(false);
                      setConfirmClearBoundary(false);
                    }}
                    className="min-h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                  >
                    Hoàn tất sửa mốc
                  </button>
                </div>
              </div>
            )}

            {/* Leaflet Map Container (strict min-w-0 + overflow-hidden prevents SVG track blowout) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-w-0 h-[440px] sm:h-[520px] xl:h-[580px]">
              <LeafletGisMap
                pins={filteredPins}
                selectedPin={selectedPin}
                onSelectPin={handleSelectPin}
                layers={layers}
                boundaryCoords={boundaryCoords}
                boundaryStyle={boundaryStyle}
                isBoundaryEditMode={!readOnly && boundaryEditMode}
                selectedMilestoneIndex={selectedMilestoneIndex}
                onSelectMilestone={setSelectedMilestoneIndex}
                onUpdateMilestoneCoord={handleUpdateMilestoneCoord}
                onAddVertexFromMap={handleAddVertexFromMap}
                isPickLocationMode={!readOnly && pickPurpose !== null}
                pickedCoord={pickedLocation}
                onPickLocation={handlePickLocationFromMap}
                onCancelPickLocation={() => {
                  const wasForm = pickPurpose?.kind === "form";
                  setPickPurpose(null);
                  if (wasForm) setIsPinFormOpen(true);
                }}
                showCoverageRadius={showCoverageRadius}
                onToggleCoverageRadius={() => setShowCoverageRadius((v) => !v)}
                routeTarget={routeTarget}
                activeToFilter={activeToFilter}
                onSelectToFilter={handleSelectToFilter}
                onTriggerLiveStream={(pin) => setLiveCameraPin(pin)}
                focusZoomCoord={focusZoomCoord}
                readOnly={readOnly}
              />
            </div>

            {/* Turn-by-turn Route Guidance Panel */}
            {routeTarget && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-2 rounded-xl bg-blue-50 text-[#073B72] shrink-0">
                      <Navigation size={16} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        Lộ trình từ Trụ sở BĐH KP3 đến: {routeTarget.name}
                      </h3>
                      <p className="text-xs text-slate-600 truncate">
                        Khoảng cách ước tính:{" "}
                        {formatDistance(
                          calculateDistanceMeters(
                            KP3_CENTER.lat,
                            KP3_CENTER.lng,
                            routeTarget.lat,
                            routeTarget.lng
                          )
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRouteTarget(null)}
                    aria-label="Đóng lộ trình chỉ đường"
                    className="min-h-8 min-w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                <ol className="space-y-2 text-xs">
                  {routeSteps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    >
                      <span className="text-slate-800 font-medium leading-relaxed">
                        <strong className="text-[#073B72]">Bước {i + 1}:</strong>{" "}
                        {formatTextNumbers(step.instruction)}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatTextNumbers(step.distance)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Pin Inspector Drawer */}
            <GisPinDetailDrawer
              pin={selectedPin}
              onClose={() => setSelectedPin(null)}
              isRouteActive={Boolean(routeTarget && selectedPin && routeTarget.id === selectedPin.id)}
              onToggleRoute={(pin) =>
                setRouteTarget((prev) => (prev?.id === pin.id ? null : pin))
              }
              showCoverageRadius={showCoverageRadius}
              onToggleCoverageRadius={() => setShowCoverageRadius((v) => !v)}
              onEditPinLocation={
                !readOnly
                  ? (pin) => {
                      setWorkspaceMode("map");
                      setPickPurpose({ kind: "reposition", pin });
                      notify(`Chạm lên bản đồ để đặt lại vị trí cho: ${pin.name}`);
                    }
                  : undefined
              }
              onDeleteCustomPin={!readOnly ? handleDeleteCustomPin : undefined}
              onTriggerLiveStream={(pin) => setLiveCameraPin(pin)}
              onNavigateToReport={onNavigateToReport}
              readOnly={readOnly}
            />
          </div>
        </div>
      )}

      {/* Boundary Manager Modal */}
      {!readOnly && (
        <GisBoundaryManagerModal
          isOpen={isBoundaryModalOpen}
          onClose={() => setIsBoundaryModalOpen(false)}
          coords={boundaryCoords}
          style={boundaryStyle}
          onSave={(coords, style) => {
            setBoundaryCoords(coords);
            setBoundaryStyle(style);
            notify(`Đã lưu ranh giới địa bàn (${formatVNNumber(coords.length)} mốc).`);
          }}
          householdsList={households}
          businessesList={businesses}
        />
      )}

      {/* Pin Setup Form Modal */}
      {!readOnly && (
        <GisPinFormModal
          isOpen={isPinFormOpen}
          onClose={() => setIsPinFormOpen(false)}
          households={households}
          businesses={businesses}
          pickedLocation={pickedLocation}
          onRequestPickOnMap={() => {
            setIsPinFormOpen(false);
            setWorkspaceMode("map");
            setPickPurpose({ kind: "form" });
          }}
          onSubmitAssignHousehold={handleAssignHousehold}
          onSubmitAssignBusiness={handleAssignBusiness}
          onSubmitAddCustomPin={handleAddCustomPin}
        />
      )}

      {/* Auto-Sync Modal */}
      {!readOnly && (
        <GisSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          missingHouseholds={missingHouseholds}
          missingBusinesses={missingBusinesses}
          unpinnedReportCount={unpinnedReportCount}
          onConfirmSyncAll={handleConfirmSyncAll}
        />
      )}

      {/* Camera Live Feed Simulation Modal */}
      <Modal
        isOpen={Boolean(liveCameraPin)}
        onClose={() => setLiveCameraPin(null)}
        size="xl"
        title={liveCameraPin ? `Camera Trực tiếp: ${liveCameraPin.name}` : "Camera Trực tiếp"}
        description={
          liveCameraPin
            ? `${liveCameraPin.location} · ${formatLatLngVN(liveCameraPin.lat, liveCameraPin.lng)}`
            : ""
        }
      >
        {liveCameraPin && (
          <div className="space-y-3 text-xs">
            <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between text-white">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-700 text-white font-bold">
                  <Video size={13} /> ĐANG PHÁT TRỰC TIẾP · RTSP AI
                </span>
                <span className="font-mono text-slate-300">1080p · 25 FPS</span>
              </div>

              <div className="text-center space-y-1.5 my-auto">
                <Camera size={36} className="mx-auto text-emerald-400" />
                <div className="text-sm font-bold">{liveCameraPin.name}</div>
                <p className="text-slate-300 max-w-md mx-auto leading-relaxed">
                  Luồng camera kết nối Trung tâm Điều hành An ninh trật tự Khu phố 3 (trạng thái:{" "}
                  <strong>{liveCameraPin.status}</strong>).
                </p>
              </div>

              <div className="flex items-center justify-between text-slate-300 font-mono border-t border-slate-800 pt-2">
                <span>ID: {liveCameraPin.id}</span>
                <span>{formatLatLngVN(liveCameraPin.lat, liveCameraPin.lng)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
