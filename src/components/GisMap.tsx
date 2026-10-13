import React, { useState, useEffect, useRef } from "react";
import { 
  Map as MapIcon, 
  Layers, 
  Camera, 
  Flame, 
  Lightbulb, 
  Compass, 
  MapPin, 
  X, 
  Tv, 
  Activity,
  Info,
  AlertTriangle,
  Globe,
  Search,
  CheckCircle2,
  Plus,
  Home,
  Building,
  Briefcase,
  Share2,
  RefreshCw,
  HelpCircle,
  Navigation,
  ExternalLink,
  Car,
  Sliders,
  PenTool,
  RotateCcw,
  Check,
  Undo2,
  Crosshair,
  Wand2,
  MousePointerClick,
  Trash2
} from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { 
  KP3_CENTER, 
  decimalToDMS, 
  parseCoordinates, 
  calculateDistanceMeters, 
  getGoogleMapsDirectionUrl,
  generateRouteSteps,
  calculatePolygonAreaMeters,
  calculatePolygonPerimeterMeters,
  formatArea,
  formatDistance,
  isPointInPolygon,
  calculateCentroid,
  sortPointsClockwise
} from "../utils/gisUtils";
import { TargetGisItem } from "../types";
import GisBoundaryManagerModal, { DEFAULT_KP3_BOUNDARY, BoundaryStyle, BOUNDARY_PRESETS } from "./gis/GisBoundaryManagerModal";
import LeafletGisMap from "./gis/LeafletGisMap";

// API Key retrieval from multiple possible sources
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

export interface GisPin {
  id: string;
  type: "camera" | "fire" | "light" | "household" | "business" | "custom";
  name: string;
  location: string;
  status: "Hoạt động" | "Bảo trì" | "Hỏng";
  lat: number;
  lng: number;
  details?: string;
}

const initialGisPins: GisPin[] = [
  { 
    id: "P_CAM_1", 
    type: "camera", 
    name: "Camera An Ninh Tổ 12", 
    location: "Giao lộ ĐT.743B & Đường X1", 
    status: "Hoạt động", 
    lat: 10.936997, 
    lng: 106.743500, 
    details: "Mẫu Hikvision IP 4MP. Giám sát an ninh 24/7 giao lộ hành lang huyết mạch vào tổ dân phố." 
  },
  { 
    id: "P_CAM_2", 
    type: "camera", 
    name: "Camera Đường KV AP12", 
    location: "Trước số nhà 124, Đường KV AP12", 
    status: "Hoạt động", 
    lat: 10.937800, 
    lng: 106.745500, 
    details: "Mẫu Dahua Dome. Quan sát an ninh, giám sát mật độ giao thông tuyến liên khu." 
  },
  { 
    id: "P_CAM_3", 
    type: "camera", 
    name: "Camera Giám Sát Lối Đi Dĩ An", 
    location: "Đoạn cuối Đường KV AP12 hướng đi Dĩ An", 
    status: "Bảo trì", 
    lat: 10.935800, 
    lng: 106.746800, 
    details: "Đang bảo trì định kỳ ống kính và cấu hình định tuyến dữ liệu." 
  },
  { 
    id: "P_FIRE_1", 
    type: "fire", 
    name: "Trụ Nước Chữa Cháy Tổ 3", 
    location: "Giao lộ Đường X1 & Đường PKV AP29", 
    status: "Hoạt động", 
    lat: 10.936800, 
    lng: 106.744600, 
    details: "Trụ nổi cứu hỏa đô thị. Áp lực nước đạt tiêu chuẩn, bảo trì định kỳ quý 2/2026." 
  },
  { 
    id: "P_FIRE_2", 
    type: "fire", 
    name: "Trụ Cứu Hỏa KV AP14", 
    location: "Gần giao lộ PKV AP30 & KV AP14", 
    status: "Hoạt động", 
    lat: 10.935500, 
    lng: 106.745200, 
    details: "Hệ thống cấp nước cứu hỏa công cộng phòng chống cháy nổ khu nhà trọ tự quản." 
  },
  { 
    id: "P_LIGHT_1", 
    type: "light", 
    name: "Đèn Chiếu Sáng ĐT.743B - Trụ 04", 
    location: "Dọc tuyến ĐT.743B, Tổ 12", 
    status: "Hoạt động", 
    lat: 10.938500, 
    lng: 106.743200, 
    details: "Bóng đèn LED Smart 150W thông minh. Tự động bật tắt theo cường độ ánh sáng môi trường." 
  },
  { 
    id: "P_LIGHT_2", 
    type: "light", 
    name: "Đèn Chiếu Sáng Đường PKV AP28", 
    location: "Tuyến Đường PKV AP28, Tổ dân phố 15", 
    status: "Hoạt động", 
    lat: 10.937500, 
    lng: 106.746000, 
    details: "Đèn chiếu sáng đô thị tiết kiệm điện năng liên kết tủ điều khiển thông minh khu phố." 
  }
];

// Custom Polygon component to draw administrative boundaries on Google Maps with live editing support
function MapPolygon({ 
  paths,
  editable = false,
  strokeColor = "#10b981",
  strokeWeight = 3,
  fillColor = "#10b981",
  fillOpacity = 0.15,
  onPathsChange
}: { 
  paths: { lat: number; lng: number }[];
  editable?: boolean;
  strokeColor?: string;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  onPathsChange?: (newPaths: { lat: number; lng: number }[]) => void;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }

    const polygon = new google.maps.Polygon({
      paths: paths,
      strokeColor: strokeColor,
      strokeOpacity: 0.85,
      strokeWeight: strokeWeight,
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      editable: editable,
      draggable: false
    });

    polygon.setMap(map);
    polygonRef.current = polygon;

    if (editable && onPathsChange) {
      const path = polygon.getPath();
      const handlePathChange = () => {
        const len = path.getLength();
        const updated: { lat: number; lng: number }[] = [];
        for (let i = 0; i < len; i++) {
          const pt = path.getAt(i);
          updated.push({
            lat: Number(pt.lat().toFixed(6)),
            lng: Number(pt.lng().toFixed(6))
          });
        }
        onPathsChange(updated);
      };

      const l1 = google.maps.event.addListener(path, "set_at", handlePathChange);
      const l2 = google.maps.event.addListener(path, "insert_at", handlePathChange);
      const l3 = google.maps.event.addListener(path, "remove_at", handlePathChange);

      return () => {
        google.maps.event.removeListener(l1);
        google.maps.event.removeListener(l2);
        google.maps.event.removeListener(l3);
        if (polygonRef.current) {
          polygonRef.current.setMap(null);
        }
      };
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
    };
  }, [map, paths, editable, strokeColor, strokeWeight, fillColor, fillOpacity]);

  return null;
}

// Map click listener for drawing new polygon vertices in Google Maps mode
function MapDrawingHandler({
  isDrawing,
  onMapClick
}: {
  isDrawing: boolean;
  onMapClick: (coord: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !isDrawing) return;

    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick({
          lat: Number(e.latLng.lat().toFixed(6)),
          lng: Number(e.latLng.lng().toFixed(6))
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, isDrawing, onMapClick]);

  return null;
}

// Custom Polyline component to draw navigation route on Google Maps
function MapPolyline({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const polyline = new google.maps.Polyline({
      path: path,
      strokeColor: "#2563eb", // Blue route line
      strokeOpacity: 0.9,
      strokeWeight: 6,
    });

    polyline.setMap(map);
    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, path]);

  return null;
}

// Map controller to automatically pan map to selected pin or central coordinate
function MapController({ 
  selectedPin,
  isRouteActive,
  routeTarget
}: { 
  selectedPin: GisPin | null;
  isRouteActive?: boolean;
  routeTarget?: GisPin | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (isRouteActive && routeTarget) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(KP3_CENTER);
      bounds.extend({ lat: routeTarget.lat, lng: routeTarget.lng });
      map.fitBounds(bounds, { top: 90, right: 90, bottom: 90, left: 90 });
    } else if (selectedPin) {
      map.panTo({ lat: selectedPin.lat, lng: selectedPin.lng });
      map.setZoom(18);
    } else {
      map.panTo(KP3_CENTER);
      map.setZoom(17);
    }
  }, [map, selectedPin, isRouteActive, routeTarget]);

  return null;
}

interface GisMapProps {
  households?: any[];
  onUpdateHouseholds?: (h: any[]) => void;
  residents?: any[];
  onUpdateResidents?: (r: any[]) => void;
  businesses?: any[];
  onUpdateBusinesses?: (b: any[]) => void;
  targetGisItem?: TargetGisItem | null;
  onClearTargetGisItem?: () => void;
}

export default function GisMap({
  households = [],
  onUpdateHouseholds,
  residents = [],
  onUpdateResidents,
  businesses = [],
  onUpdateBusinesses,
  targetGisItem,
  onClearTargetGisItem
}: GisMapProps) {
  // Layer visibility settings
  const [layers, setLayers] = useState({
    boundary: true,
    camera: true,
    fire: true,
    light: true,
    household: true,
    business: true
  });

  const [selectedPin, setSelectedPin] = useState<GisPin | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Navigation & Direction states
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [routeTarget, setRouteTarget] = useState<GisPin | null>(null);

  // Automatic GIS Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDetails, setSyncDetails] = useState<any[]>([]);

  // Load custom manual pins from local storage
  const [customPins, setCustomPins] = useState<GisPin[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_gis_custom_pins");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic Pinning Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [assignType, setAssignType] = useState<"none" | "household" | "business">("household");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  const [pinName, setPinName] = useState("");
  const [pinLocation, setPinLocation] = useState("");
  const [pinType, setPinType] = useState<"camera" | "fire" | "light" | "household" | "business" | "custom">("household");
  const [pinLat, setPinLat] = useState(10.936997);
  const [pinLng, setPinLng] = useState(106.744645);
  const [pinDetails, setPinDetails] = useState("");
  const [coordsInput, setCoordsInput] = useState("");

  // Neighborhood Boundary Delimitation & Editing States
  const [boundaryCoords, setBoundaryCoords] = useState<{ lat: number; lng: number }[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_gis_custom_boundary");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_KP3_BOUNDARY;
  });

  const [boundaryStyle, setBoundaryStyle] = useState<BoundaryStyle>(() => {
    try {
      const saved = localStorage.getItem("kp3_gis_boundary_style");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      strokeColor: "#10b981",
      strokeWeight: 3,
      fillColor: "#10b981",
      fillOpacity: 0.15
    };
  });

  const [isBoundaryEditMode, setIsBoundaryEditMode] = useState(false);
  const [showBoundaryModal, setShowBoundaryModal] = useState(false);
  const [boundaryNotification, setBoundaryNotification] = useState<string | null>(null);

  // Selected numbered milestone for inspection and quick action
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);

  // Dragging vertex state for interactive map adjustment
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [hoveredVertexIndex, setHoveredVertexIndex] = useState<number | null>(null);
  const [activePresetId, setActivePresetId] = useState<string>("custom");

  // Computed boundary measurements
  const boundaryArea = calculatePolygonAreaMeters(boundaryCoords);
  const boundaryPerimeter = calculatePolygonPerimeterMeters(boundaryCoords);

  const insideHouseholdsCount = households.filter(h => {
    const pt = parseCoordinates(h.coordinates);
    return pt ? isPointInPolygon(pt, boundaryCoords) : false;
  }).length;

  const insideBusinessesCount = businesses.filter(b => {
    const pt = parseCoordinates(b.coordinates);
    return pt ? isPointInPolygon(pt, boundaryCoords) : false;
  }).length;

  const handleSaveBoundary = (newCoords: { lat: number; lng: number }[], newStyle: BoundaryStyle) => {
    setBoundaryCoords(newCoords);
    setBoundaryStyle(newStyle);
    try {
      localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(newCoords));
      localStorage.setItem("kp3_gis_boundary_style", JSON.stringify(newStyle));
    } catch (e) {
      console.error(e);
    }
    setBoundaryNotification(`💾 Đã lưu ranh giới địa bàn Khu phố 3 (${newCoords.length} mốc, ${formatArea(calculatePolygonAreaMeters(newCoords))}) thành công!`);
    setTimeout(() => setBoundaryNotification(null), 3500);
  };

  const handleStartDrawNewBoundary = () => {
    setIsBoundaryEditMode(true);
    setBoundaryCoords([]);
    setSelectedMilestoneIndex(null);
    setBoundaryNotification("🎯 Đã dọn mốc cũ. Hãy nhấp trực tiếp trên bản đồ để ghim Mốc số 1.");
    setTimeout(() => setBoundaryNotification(null), 4000);
  };

  const handleAddVertexFromMap = (coord: { lat: number; lng: number }) => {
    setBoundaryCoords(prev => {
      const updated = [...prev, coord];
      const newArea = calculatePolygonAreaMeters(updated);
      setBoundaryNotification(
        `📍 Đã ghim Mốc ${updated.length}: [${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}]${
          updated.length >= 3 
            ? ` • Đã tự động tạo vùng khoanh: ${formatArea(newArea)}` 
            : ` • Cần thêm ${3 - updated.length} mốc để tự động khép kín`
        }`
      );
      setTimeout(() => setBoundaryNotification(null), 3500);
      try {
        localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Undo last pinned milestone
  const handleUndoLastVertex = () => {
    if (boundaryCoords.length === 0) return;
    setBoundaryCoords(prev => {
      const updated = prev.slice(0, -1);
      setBoundaryNotification(`↩️ Đã hoàn tác mốc. Hiện còn ${updated.length} mốc giới.`);
      setTimeout(() => setBoundaryNotification(null), 2500);
      try {
        localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedMilestoneIndex !== null && selectedMilestoneIndex >= boundaryCoords.length - 1) {
      setSelectedMilestoneIndex(null);
    }
  };

  // Clear all milestones to re-pin from scratch
  const handleClearAllVertices = () => {
    if (boundaryCoords.length === 0) return;
    if (confirm("Xóa toàn bộ các mốc hiện tại để ghim lại ranh giới từ đầu?")) {
      setBoundaryCoords([]);
      setSelectedMilestoneIndex(null);
      setBoundaryNotification("🎯 Đã xóa toàn bộ mốc. Hãy nhấp trên bản đồ để ghim Mốc số 1.");
      setTimeout(() => setBoundaryNotification(null), 3000);
      try {
        localStorage.removeItem("kp3_gis_custom_boundary");
      } catch {}
    }
  };

  // Auto-sort milestones clockwise around center
  const handleAutoSortClockwise = () => {
    if (boundaryCoords.length < 3) {
      alert("Cần tối thiểu 3 mốc để tự động sắp xếp vòng bao khép kín!");
      return;
    }
    const sorted = sortPointsClockwise(boundaryCoords);
    setBoundaryCoords(sorted);
    setBoundaryNotification("✨ Đã tự động tối ưu sắp xếp các mốc giới theo chu vi vòng khép kín (không bị xoắn chéo đa giác)!");
    setTimeout(() => setBoundaryNotification(null), 4000);
    try {
      localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(sorted));
    } catch {}
  };

  // Delete a specific vertex
  const handleDeleteVertex = (index: number) => {
    setBoundaryCoords(prev => {
      const updated = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedMilestoneIndex === index) {
      setSelectedMilestoneIndex(null);
    } else if (selectedMilestoneIndex !== null && selectedMilestoneIndex > index) {
      setSelectedMilestoneIndex(selectedMilestoneIndex - 1);
    }
    setBoundaryNotification(`Đã xóa mốc số ${index + 1}.`);
    setTimeout(() => setBoundaryNotification(null), 2500);
  };

  const handleFinishDrawingBoundary = () => {
    if (boundaryCoords.length < 3) {
      alert("Vùng khoanh cần tối thiểu 3 điểm mốc!");
      return;
    }
    setIsBoundaryEditMode(false);
    try {
      localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(boundaryCoords));
    } catch {}
    setBoundaryNotification(`💾 Đã hoàn tất và lưu khoanh vùng (${boundaryCoords.length} mốc giới, ${formatArea(boundaryArea)})!`);
    setTimeout(() => setBoundaryNotification(null), 4000);
  };

  const handleResetBoundary = () => {
    if (confirm("Khôi phục lại ranh giới gốc 12 mốc giới của Khu phố 3 (51,26ha)?")) {
      setBoundaryCoords(DEFAULT_KP3_BOUNDARY);
      setBoundaryStyle({
        strokeColor: "#10b981",
        strokeWeight: 3,
        fillColor: "#10b981",
        fillOpacity: 0.15
      });
      try {
        localStorage.removeItem("kp3_gis_custom_boundary");
        localStorage.removeItem("kp3_gis_boundary_style");
      } catch {}
      setBoundaryNotification("Đã khôi phục ranh giới gốc 12 mốc của Khu phố 3!");
      setTimeout(() => setBoundaryNotification(null), 3000);
    }
  };

  // Apply quick boundary preset
  const handleApplyQuickPreset = (presetId: string) => {
    const found = BOUNDARY_PRESETS.find(p => p.id === presetId);
    if (found) {
      setBoundaryCoords([...found.coords]);
      setBoundaryStyle({
        ...boundaryStyle,
        strokeColor: found.color,
        fillColor: found.color
      });
      setActivePresetId(presetId);
      setBoundaryNotification(`Đã nạp mẫu: ${found.name} (${found.coords.length} mốc giới)!`);
      setTimeout(() => setBoundaryNotification(null), 3000);
    }
  };

  // SVG projection for Embed mode
  const projectToSvg = (lat: number, lng: number) => {
    const minLat = 10.9320;
    const maxLat = 10.9418;
    const minLng = 106.7410;
    const maxLng = 106.7495;
    const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 1000;
    return { x: Math.max(15, Math.min(985, x)), y: Math.max(15, Math.min(985, y)) };
  };

  const unprojectFromSvg = (svgX: number, svgY: number, rectWidth: number, rectHeight: number) => {
    const minLat = 10.9320;
    const maxLat = 10.9418;
    const minLng = 106.7410;
    const maxLng = 106.7495;
    const lng = minLng + (svgX / rectWidth) * (maxLng - minLng);
    const lat = maxLat - (svgY / rectHeight) * (maxLat - minLat);
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // If dragging just ended, don't trigger new add
    if (draggingVertexIndex !== null) return;
    if (!isBoundaryEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const coord = unprojectFromSvg(clickX, clickY, rect.width, rect.height);
    handleAddVertexFromMap(coord);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingVertexIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const coord = unprojectFromSvg(clickX, clickY, rect.width, rect.height);
    setBoundaryCoords(prev => {
      const updated = [...prev];
      updated[draggingVertexIndex] = coord;
      return updated;
    });
  };

  const handleSvgMouseUp = () => {
    if (draggingVertexIndex !== null) {
      setDraggingVertexIndex(null);
      try {
        localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(boundaryCoords));
      } catch {}
    }
  };

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers({ ...layers, [layer]: !layers[layer] });
  };

  // Convert household coordinates dynamically into pins
  const householdPins: GisPin[] = households.map(h => {
    const coords = parseCoordinates(h.coordinates);
    if (!coords) return null;
    return {
      id: `H_PIN_${h.id}`,
      type: "household" as const,
      name: `Hộ ${h.ownerName}`,
      location: h.address,
      status: "Hoạt động" as const,
      lat: coords.lat,
      lng: coords.lng,
      details: `Chủ hộ: ${h.ownerName}. Mã sổ hộ khẩu: ${h.code}. Thành viên: ${h.members?.map((m: any) => m.name).join(", ") || "Chưa có"}. Nhân khẩu: ${h.memberCount} người.`
    };
  }).filter(Boolean) as GisPin[];

  // Convert businesses dynamically into pins
  const businessPins: GisPin[] = businesses.map(b => {
    const coords = parseCoordinates(b.coordinates);
    if (!coords) return null;
    return {
      id: `B_PIN_${b.id}`,
      type: "business" as const,
      name: b.name,
      location: b.address,
      status: b.status === "Đang hoạt động" ? ("Hoạt động" as const) : ("Bảo trì" as const),
      lat: coords.lat,
      lng: coords.lng,
      details: `Hộ kinh doanh: ${b.name}. Chủ sở hữu: ${b.owner}. Ngành nghề: ${b.type}. Số giấy phép ĐKKD: ${b.licenseNumber}.`
    };
  }).filter(Boolean) as GisPin[];

  // Combine static initial system pins, custom pins, dynamic household pins, and business pins
  const allPins = [...initialGisPins, ...customPins, ...householdPins, ...businessPins];

  // Sync targetGisItem passed from other tabs (Household, Enterprise, Business)
  useEffect(() => {
    if (targetGisItem) {
      let matchedPin = allPins.find(p => 
        (targetGisItem.id && (p.id === targetGisItem.id || p.id.includes(targetGisItem.id))) ||
        (targetGisItem.name && p.name.toLowerCase().includes(targetGisItem.name.toLowerCase()))
      );

      if (!matchedPin) {
        const coords = parseCoordinates(targetGisItem.coordinates);
        const lat = targetGisItem.lat || (coords ? coords.lat : KP3_CENTER.lat);
        const lng = targetGisItem.lng || (coords ? coords.lng : KP3_CENTER.lng);
        matchedPin = {
          id: targetGisItem.id || `TARGET_${Date.now()}`,
          type: (targetGisItem.type as any) || "custom",
          name: targetGisItem.name,
          location: targetGisItem.address || "Khu phố 3, Phường An Phú",
          status: "Hoạt động",
          lat,
          lng,
          details: `Địa chỉ: ${targetGisItem.address || "Khu phố 3"}. Tọa độ: ${decimalToDMS(lat, lng)}.`
        };
      }

      setSelectedPin(matchedPin);
      if (targetGisItem.navigateRoute) {
        setIsRouteActive(true);
        setRouteTarget(matchedPin);
      }
    }
  }, [targetGisItem]);

  // Filter combined pins based on active layers and search filter
  const filteredPins = allPins.filter(pin => {
    if (pin.type === "camera" && !layers.camera) return false;
    if (pin.type === "fire" && !layers.fire) return false;
    if (pin.type === "light" && !layers.light) return false;
    if (pin.type === "household" && !layers.household) return false;
    if (pin.type === "business" && !layers.business) return false;
    
    if (searchTerm.trim() !== "") {
      const matchName = pin.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = pin.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = pin.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName || matchLoc || matchType;
    }
    return true;
  });

  // Count active elements
  const counts = {
    camera: allPins.filter(p => p.type === "camera").length,
    fire: allPins.filter(p => p.type === "fire").length,
    light: allPins.filter(p => p.type === "light").length,
    household: allPins.filter(p => p.type === "household").length,
    business: allPins.filter(p => p.type === "business").length,
  };

  // Generates the Google Satellite map embed URL when API Key is missing
  const getEmbedMapUrl = () => {
    if (isRouteActive && (routeTarget || selectedPin)) {
      const target = routeTarget || selectedPin!;
      return `https://maps.google.com/maps?saddr=${KP3_CENTER.lat},${KP3_CENTER.lng}&daddr=${target.lat},${target.lng}&output=embed`;
    }
    const lat = selectedPin ? selectedPin.lat : KP3_CENTER.lat;
    const lng = selectedPin ? selectedPin.lng : KP3_CENTER.lng;
    const zoom = selectedPin ? 18 : 17;
    // t=k represents satellite view, output=embed facilitates responsive iframe
    return `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=${zoom}&output=embed`;
  };

  // Handle saving pinned location & propagating coordinate data synchronizations
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pinName.trim()) {
      alert("Vui lòng nhập tên địa điểm!");
      return;
    }

    const dmsCoords = decimalToDMS(pinLat, pinLng);

    // Case 1: Assign and synchronize with Household (Sổ Hộ Khẩu)
    if (assignType === "household" && selectedHouseholdId) {
      const targetHh = households.find(h => h.id === selectedHouseholdId);
      if (targetHh) {
        // A. Update household coordinates in list
        const updatedHouseholds = households.map(h => {
          if (h.id === selectedHouseholdId) {
            return { ...h, coordinates: dmsCoords };
          }
          return h;
        });
        if (onUpdateHouseholds) {
          onUpdateHouseholds(updatedHouseholds);
        }

        // B. Automatically propagate and synchronize with ALL resident family members
        if (residents && onUpdateResidents) {
          const updatedResidents = residents.map(r => {
            if (r.householdId === targetHh.code) {
              return { ...r, coordinates: dmsCoords };
            }
            return r;
          });
          onUpdateResidents(updatedResidents);
        }

        alert(`Đã ghim vị trí thành công! Tọa độ "${dmsCoords}" đã được cập nhật đồng bộ cho Sổ hộ khẩu "${targetHh.code}" và tự động đồng bộ cho toàn bộ người nhà (${targetHh.memberCount} nhân khẩu) của hộ ông/bà ${targetHh.ownerName}.`);
      }
    }
    // Case 2: Assign and synchronize with Business (Hộ Kinh Doanh)
    else if (assignType === "business" && selectedBusinessId) {
      const targetB = businesses.find(b => b.id === selectedBusinessId);
      if (targetB) {
        const updatedBusinesses = businesses.map(b => {
          if (b.id === selectedBusinessId) {
            return { ...b, coordinates: dmsCoords };
          }
          return b;
        });
        if (onUpdateBusinesses) {
          onUpdateBusinesses(updatedBusinesses);
        }
        alert(`Đã ghim vị trí thành công! Tọa độ "${dmsCoords}" đã được cập nhật đồng bộ cho hộ kinh doanh "${targetB.name}".`);
      }
    }
    // Case 3: Create custom standalone point of interest / equipment pin
    else {
      const newPin: GisPin = {
        id: `CUSTOM_PIN_${Date.now()}`,
        type: pinType,
        name: pinName,
        location: pinLocation,
        status: "Hoạt động",
        lat: pinLat,
        lng: pinLng,
        details: pinDetails || "Địa điểm tự ghim trên bản đồ vệ tinh."
      };

      const updatedCustomPins = [newPin, ...customPins];
      setCustomPins(updatedCustomPins);
      localStorage.setItem("kp3_gis_custom_pins", JSON.stringify(updatedCustomPins));
      alert(`Đã ghim vị trí "${pinName}" tại tọa độ [${pinLat}, ${pinLng}] thành công.`);
    }

    // Centering the map on the newly pinned location
    const tempPin: GisPin = {
      id: `TEMP_${Date.now()}`,
      type: (assignType !== "none" ? assignType : pinType) as any,
      name: pinName,
      location: pinLocation,
      status: "Hoạt động",
      lat: pinLat,
      lng: pinLng,
      details: pinDetails
    };

    setSelectedPin(tempPin);
    setIsLiveActive(false);
    setShowAddModal(false);

    // Reset Form Fields
    setPinName("");
    setPinLocation("");
    setPinDetails("");
    setAssignType("household");
    setSelectedHouseholdId("");
    setSelectedBusinessId("");
    setPinLat(10.936997);
    setPinLng(106.744645);
    setCoordsInput("");
  };

  // Find unsynced items
  const unsyncedHouseholds = households.filter(h => !h.coordinates || !parseCoordinates(h.coordinates));
  const unsyncedBusinesses = businesses.filter(b => !b.coordinates || !parseCoordinates(b.coordinates));
  const unsyncedCount = unsyncedHouseholds.length + unsyncedBusinesses.length;

  const handleAutoSyncAll = () => {
    setIsSyncing(true);
    setSyncDetails([]);
    
    // Simulate a short scanning/geocoding process
    setTimeout(() => {
      let updatedH = [...households];
      let updatedB = [...businesses];
      let updatedR = [...residents];
      let hCount = 0;
      let bCount = 0;
      let logs: any[] = [];

      // 1. Check households
      updatedH = updatedH.map((hh, idx) => {
        const hasCoords = hh.coordinates && parseCoordinates(hh.coordinates);
        if (!hasCoords) {
          // Generate distributed coordinate near KP3_CENTER
          const offsetLat = (Math.sin(idx + 1) * 0.0012) * 0.5;
          const offsetLng = (Math.cos(idx + 1) * 0.0012) * 0.5;
          const lat = KP3_CENTER.lat + offsetLat;
          const lng = KP3_CENTER.lng + offsetLng;
          const dmsCoords = decimalToDMS(lat, lng);
          
          hCount++;
          logs.push({
            type: "household",
            name: `Hộ ông/bà ${hh.ownerName}`,
            code: hh.code,
            address: hh.address,
            coords: dmsCoords,
            status: "Đã ghim vị trí & Đồng bộ"
          });

          // Sync coordinates to family members (residents)
          updatedR = updatedR.map(r => {
            if (r.householdId === hh.code) {
              return { ...r, coordinates: dmsCoords };
            }
            return r;
          });

          return { ...hh, coordinates: dmsCoords };
        } else {
          logs.push({
            type: "household",
            name: `Hộ ông/bà ${hh.ownerName}`,
            code: hh.code,
            address: hh.address,
            coords: hh.coordinates,
            status: "Đã có vị trí (Giữ nguyên)"
          });
          return hh;
        }
      });

      // 2. Check businesses
      updatedB = updatedB.map((b, idx) => {
        const hasCoords = b.coordinates && parseCoordinates(b.coordinates);
        if (!hasCoords) {
          // Generate distributed coordinate near KP3_CENTER with different pattern
          const offsetLat = (Math.cos(idx + 5) * 0.0014) * 0.5;
          const offsetLng = (Math.sin(idx + 5) * 0.0014) * 0.5;
          const lat = KP3_CENTER.lat + offsetLat;
          const lng = KP3_CENTER.lng + offsetLng;
          const dmsCoords = decimalToDMS(lat, lng);

          bCount++;
          logs.push({
            type: "business",
            name: b.name,
            code: b.id,
            address: b.address,
            coords: dmsCoords,
            status: "Đã ghim vị trí & Đồng bộ"
          });

          return { ...b, coordinates: dmsCoords };
        } else {
          logs.push({
            type: "business",
            name: b.name,
            code: b.id,
            address: b.address,
            coords: b.coordinates,
            status: "Đã có vị trí (Giữ nguyên)"
          });
          return b;
        }
      });

      // Update state
      if (hCount > 0 && onUpdateHouseholds) {
        onUpdateHouseholds(updatedH);
      }
      if (bCount > 0 && onUpdateBusinesses) {
        onUpdateBusinesses(updatedB);
      }
      if (hCount > 0 && onUpdateResidents && residents) {
        onUpdateResidents(updatedR);
      }

      setSyncDetails(logs);
      setIsSyncing(false);
      setShowSyncModal(true);
    }, 1500);
  };

  return (
    <div id="gis-map-view" className="space-y-5">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe className="text-emerald-600 animate-spin" style={{ animationDuration: "12s" }} size={22} />
            Bản đồ số vệ tinh GIS Không gian Khu phố 3
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Định vị và đồng bộ hóa tọa độ Sổ hộ khẩu dân cư, cơ sở kinh doanh, thiết bị kỹ thuật công cộng trên bản đồ trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chế độ Ghim Mốc Khoanh Vùng Trực quan */}
          <button
            id="btn-toggle-boundary-mode"
            onClick={() => {
              const nextMode = !isBoundaryEditMode;
              setIsBoundaryEditMode(nextMode);
              if (nextMode) {
                setBoundaryNotification(`📍 Chế độ Ghim Mốc Khoanh Vùng đang BẬT: Hãy nhấp các vị trí trên bản đồ để ghim mốc. Hệ thống sẽ tự động phân tích và tạo vùng ranh giới khép kín!`);
              } else {
                setBoundaryNotification(`Đã tắt chế độ ghim mốc. Ranh giới hiện tại: ${boundaryCoords.length} mốc giới (${formatArea(boundaryArea)}).`);
              }
              setTimeout(() => setBoundaryNotification(null), 4500);
            }}
            className={`flex items-center gap-2 font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-sm transition-all cursor-pointer border ${
              isBoundaryEditMode
                ? "bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500 ring-2 ring-amber-300 shadow-md font-black animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-xs"
            }`}
            title="Bật/Tắt chế độ ghim mốc trực tiếp trên bản đồ để tự động phân tích và khoanh vùng địa bàn"
          >
            <Crosshair size={14} className={isBoundaryEditMode ? "text-slate-950 animate-spin" : "text-white"} style={isBoundaryEditMode ? { animationDuration: "6s" } : undefined} />
            {isBoundaryEditMode ? (
              <span>🔴 Đang Bật Khoanh Vùng ({boundaryCoords.length} mốc) • Nhấp để Tắt/Lưu</span>
            ) : (
              <span>📍 Khoanh vùng địa bàn (Ghim mốc)</span>
            )}
          </button>

          {/* Auto-Sync Locations Feature */}
          <button
            onClick={handleAutoSyncAll}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-lg text-xs shadow-sm transition-all cursor-pointer border
              ${isSyncing 
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
              }
            `}
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin text-indigo-500" : "text-indigo-600"} />
            {isSyncing ? "Đang đồng bộ..." : `Tự động đồng bộ (${unsyncedCount})`}
          </button>

          {/* Main Action: Ghim vị trí mới */}
          <button
            onClick={() => {
              // Pre-fill coordinate with a slight random displacement to look dynamic, or centered
              const lat = 10.936997 + (Math.random() - 0.5) * 0.001;
              const lng = 106.744645 + (Math.random() - 0.5) * 0.001;
              setPinLat(lat);
              setPinLng(lng);
              setCoordsInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} /> Ghim vị trí mới
          </button>
        </div>
      </div>

      {/* Boundary Notification Banner */}
      {boundaryNotification && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-xl shadow-md border border-emerald-600 flex items-center justify-between animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
            <span>{boundaryNotification}</span>
          </div>
          <button 
            onClick={() => setBoundaryNotification(null)}
            className="text-emerald-200 hover:text-white p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* GIS Badges & Key Metadata Panels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
            <Home size={16} />
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Hộ khẩu định vị</p>
            <p className="text-sm font-extrabold text-slate-800">{counts.household} / {households.length} hộ</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="bg-cyan-50 text-cyan-600 p-2 rounded-lg">
            <Briefcase size={16} />
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Doanh nghiệp GIS</p>
            <p className="text-sm font-extrabold text-slate-800">{counts.business} / {businesses.length}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
            <Camera size={16} />
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Camera An ninh</p>
            <p className="text-sm font-extrabold text-slate-800">{counts.camera} mắt</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
            <Flame size={16} />
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Thiết bị PCCC</p>
            <p className="text-sm font-extrabold text-slate-800">{counts.fire} trụ</p>
          </div>
        </div>
      </div>

      {/* Grid: Map + Sidebar layers panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Layer control and devices sidebar panel */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4 flex flex-col justify-between min-h-[500px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Layers size={14} className="text-emerald-600" />
              <h2 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">Lớp Bản Đồ Số</h2>
            </div>

            <div className="space-y-1.5">
              {/* Boundary layer */}
              <div className="flex items-center justify-between p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Compass size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate" title={`Ranh giới địa bàn (${boundaryCoords.length} mốc • ${formatArea(boundaryArea)})`}>
                    Ranh giới ({boundaryCoords.length} mốc)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsBoundaryEditMode(!isBoundaryEditMode);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      isBoundaryEditMode 
                        ? "bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-2xs" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                    title="Bật/Tắt ghim mốc trực tiếp trên bản đồ"
                  >
                    {isBoundaryEditMode ? "Đang ghim" : "Ghim mốc"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBoundaryModal(true);
                    }}
                    className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-colors cursor-pointer"
                    title="Tự điều chỉnh mốc giới & khoanh vùng địa bàn"
                  >
                    <Sliders size={12} />
                  </button>
                  <input 
                    id="gis-layer-boundary"
                    name="layerBoundary"
                    type="checkbox" 
                    checked={layers.boundary} 
                    onChange={() => toggleLayer("boundary")}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                </div>
              </div>

              {/* Households Layer */}
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <Home size={13} className="text-indigo-600" />
                  <span>Sổ Hộ Khẩu Dân Cư ({counts.household})</span>
                </div>
                <input 
                  id="gis-layer-household"
                  name="layerHousehold"
                  type="checkbox" 
                  checked={layers.household} 
                  onChange={() => toggleLayer("household")}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
              </label>

              {/* Businesses Layer */}
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <Building size={13} className="text-cyan-600" />
                  <span>Cơ sở Kinh doanh ({counts.business})</span>
                </div>
                <input 
                  id="gis-layer-business"
                  name="layerBusiness"
                  type="checkbox" 
                  checked={layers.business} 
                  onChange={() => toggleLayer("business")}
                  className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
                />
              </label>

              {/* Cameras Layer */}
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <Camera size={13} className="text-emerald-500" />
                  <span>Camera An ninh ({counts.camera})</span>
                </div>
                <input 
                  id="gis-layer-camera"
                  name="layerCamera"
                  type="checkbox" 
                  checked={layers.camera} 
                  onChange={() => toggleLayer("camera")}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
              </label>

              {/* Fire Hydrants Layer */}
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <Flame size={13} className="text-rose-500" />
                  <span>Thiết bị PCCC ({counts.fire})</span>
                </div>
                <input 
                  id="gis-layer-fire"
                  name="layerFire"
                  type="checkbox" 
                  checked={layers.fire} 
                  onChange={() => toggleLayer("fire")}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
              </label>

              {/* Smart lights layer */}
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <Lightbulb size={13} className="text-amber-500" />
                  <span>Đèn chiếu sáng Smart LED ({counts.light})</span>
                </div>
                <input 
                  id="gis-layer-light"
                  name="layerLight"
                  type="checkbox" 
                  checked={layers.light} 
                  onChange={() => toggleLayer("light")}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
              </label>
            </div>

            {/* Device search and quick access list */}
            <div className="space-y-2 pt-2 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Search size={11} /> Tìm kiếm nhanh GIS
                </span>
                {selectedPin && (
                  <button 
                    onClick={() => {
                      setSelectedPin(null);
                      setIsLiveActive(false);
                    }}
                    className="text-[9px] text-indigo-600 hover:underline font-bold"
                  >
                    Xem toàn cảnh KP3
                  </button>
                )}
              </div>
              
              <div className="relative">
                <input 
                  id="gis-search-term"
                  name="gisSearchTerm"
                  type="text"
                  placeholder="Hộ dân, doanh nghiệp, thiết bị..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white"
                />
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              {/* Device/Location Quick List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-50">
                {filteredPins.length === 0 ? (
                  <div className="text-[11px] text-slate-400 py-4 text-center">
                    Không tìm thấy dữ liệu nào phù hợp.
                  </div>
                ) : (
                  filteredPins.map((pin) => {
                    const isSelected = selectedPin?.id === pin.id;
                    const icons = {
                      camera: Camera,
                      fire: Flame,
                      light: Lightbulb,
                      household: Home,
                      business: Briefcase,
                      custom: MapPin
                    };
                    const IconComp = icons[pin.type] || MapPin;
                    const colors = {
                      camera: "text-emerald-500 bg-emerald-50",
                      fire: "text-rose-500 bg-rose-50",
                      light: "text-amber-500 bg-amber-50",
                      household: "text-indigo-500 bg-indigo-50",
                      business: "text-cyan-500 bg-cyan-50",
                      custom: "text-slate-500 bg-slate-50"
                    };

                    return (
                      <button
                        key={pin.id}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all text-xs border cursor-pointer mt-1
                          ${isSelected 
                            ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                            : "bg-white text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-100"
                          }
                        `}
                      >
                        <div className={`p-1.5 rounded-md shrink-0 ${isSelected ? "bg-white/15 text-white" : colors[pin.type] || "bg-slate-50"}`}>
                          <IconComp size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{pin.name}</p>
                          <p className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-400"}`}>{pin.location}</p>
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${pin.status === "Hoạt động" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`}></span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed space-y-1 mt-4">
            <div className="font-bold flex items-center gap-1 text-slate-700">
              <Info size={11} className="text-emerald-600 shrink-0" /> Chú dẫn thao tác định vị:
            </div>
            <p>1. Bạn có thể nhấn <b>Ghim vị trí mới</b> để liên kết tọa độ bản đồ với hộ dân từ cơ sở dữ liệu của khu phố.</p>
            <p>2. Chọn bất kỳ hộ dân, cơ sở hoặc thiết bị nào trong danh sách để định tâm vệ tinh tới vị trí tương ứng.</p>
          </div>
        </div>

        {/* Map view canvas and popups */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* MAP CANVAS PANEL */}
          <div className="relative bg-slate-900 border border-slate-200 rounded-2xl shadow-md overflow-hidden aspect-[16/9] min-h-[400px] md:min-h-[480px]">
            
            <div className="w-full h-full absolute inset-0">
              {hasValidKey ? (
                /* Dynamic Custom Google Maps rendering with API Key */
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    defaultCenter={KP3_CENTER}
                    defaultZoom={17}
                    mapId="KP3_GIS_MAP_VIEW_ID"
                    mapTypeId="satellite" // Configured strictly for Satellite imagery
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <MapController 
                      selectedPin={selectedPin} 
                      isRouteActive={isRouteActive}
                      routeTarget={routeTarget || selectedPin}
                    />

                    {/* Live navigation route polyline */}
                    {isRouteActive && (routeTarget || selectedPin) && (
                      <MapPolyline 
                        path={[
                          KP3_CENTER,
                          {
                            lat: (KP3_CENTER.lat + (routeTarget || selectedPin)!.lat) / 2 + 0.0003,
                            lng: (KP3_CENTER.lng + (routeTarget || selectedPin)!.lng) / 2 - 0.0002
                          },
                          { lat: (routeTarget || selectedPin)!.lat, lng: (routeTarget || selectedPin)!.lng }
                        ]} 
                      />
                    )}

                    {/* Live boundary polygon drawn over satellite with live editing */}
                    {layers.boundary && (
                      <>
                        <MapPolygon 
                          paths={boundaryCoords}
                          editable={isBoundaryEditMode}
                          strokeColor={boundaryStyle.strokeColor}
                          strokeWeight={boundaryStyle.strokeWeight}
                          fillColor={boundaryStyle.fillColor}
                          fillOpacity={boundaryStyle.fillOpacity}
                          onPathsChange={(newPaths) => {
                            setBoundaryCoords(newPaths);
                            try {
                              localStorage.setItem("kp3_gis_custom_boundary", JSON.stringify(newPaths));
                            } catch {}
                          }}
                        />
                        <MapDrawingHandler 
                          isDrawing={isBoundaryEditMode}
                          onMapClick={handleAddVertexFromMap}
                        />
                        {/* Numbered Milestone Markers on Google Maps */}
                        {isBoundaryEditMode && boundaryCoords.map((coord, idx) => {
                          const isSelected = selectedMilestoneIndex === idx;
                          return (
                            <AdvancedMarker
                              key={`boundary-milestone-${idx}-${coord.lat}-${coord.lng}`}
                              position={{ lat: coord.lat, lng: coord.lng }}
                              title={`Mốc giới số ${idx + 1}: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`}
                            >
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMilestoneIndex(isSelected ? null : idx);
                                }}
                                className="flex flex-col items-center cursor-pointer group -translate-y-2 select-none"
                              >
                                <div className={`w-7 h-7 rounded-full text-white font-black text-xs flex items-center justify-center shadow-xl border-2 border-white ring-2 transition-all ${
                                  isSelected 
                                    ? "bg-amber-500 ring-amber-300 scale-125" 
                                    : "bg-emerald-600 ring-emerald-400 group-hover:scale-125 group-hover:bg-rose-600"
                                }`}>
                                  {idx + 1}
                                </div>
                                <span className="bg-slate-950/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
                                  Mốc {idx + 1}
                                </span>
                              </div>
                            </AdvancedMarker>
                          );
                        })}
                      </>
                    )}

                    {/* Camera Pins */}
                    {layers.camera && filteredPins.filter(p => p.type === "camera").map(pin => (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#10b981" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                          <Camera size={11} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    ))}

                    {/* Fire Hydrants Pins */}
                    {layers.fire && filteredPins.filter(p => p.type === "fire").map(pin => (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#ef4444" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                          <Flame size={11} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    ))}

                    {/* Smart Light Pins */}
                    {layers.light && filteredPins.filter(p => p.type === "light").map(pin => (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#f59e0b" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                          <Lightbulb size={11} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    ))}

                    {/* Household Pins */}
                    {layers.household && filteredPins.filter(p => p.type === "household").map(pin => (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#4f46e5" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                          <Home size={11} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    ))}

                    {/* Business Pins */}
                    {layers.business && filteredPins.filter(p => p.type === "business").map(pin => (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#06b6d4" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                          <Briefcase size={11} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    ))}

                    {/* Custom Pins */}
                    {filteredPins.filter(p => p.type === "custom").map(pin => (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        onClick={() => {
                          setSelectedPin(pin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#6b7280" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                          <MapPin size={11} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    ))}

                    {/* Selected Pin Marker if not already in filteredPins */}
                    {selectedPin && !filteredPins.some(p => p.id === selectedPin.id) && (
                      <AdvancedMarker
                        key={selectedPin.id}
                        position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
                        onClick={() => {
                          setSelectedPin(selectedPin);
                          setIsLiveActive(false);
                        }}
                      >
                        <Pin background="#10b981" borderColor="#fff" glyphColor="#fff" scale={1.3}>
                          <Navigation size={12} className="text-white" />
                        </Pin>
                      </AdvancedMarker>
                    )}
                  </Map>
                </APIProvider>
              ) : (
                /* Pure WGS-84 GIS Map with Leaflet (True Geo-Pinned Polygons, No coordinate drifting on pan/zoom) */
                <LeafletGisMap
                  boundaryCoords={boundaryCoords}
                  boundaryStyle={boundaryStyle}
                  isBoundaryEditMode={isBoundaryEditMode}
                  selectedMilestoneIndex={selectedMilestoneIndex}
                  onSelectMilestone={setSelectedMilestoneIndex}
                  onAddVertexFromMap={handleAddVertexFromMap}
                  layers={layers}
                  pins={filteredPins}
                  selectedPin={selectedPin}
                  onSelectPin={(pin) => {
                    setSelectedPin(pin);
                    setIsLiveActive(false);
                  }}
                  onLiveCameraClick={() => {
                    if (selectedPin?.type === "camera") {
                      setIsLiveActive(true);
                    }
                  }}
                />
              )}
            </div>

            {/* FLOATING BOUNDARY EDITING & DELIMITATION TOOLBAR */}
            {isBoundaryEditMode && (
              <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-3 z-30 bg-slate-950/95 text-white p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/70 shadow-2xl backdrop-blur-md max-w-xl animate-in slide-in-from-top-3 duration-200 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <div>
                      <h3 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                        <Compass size={15} className="shrink-0" /> Bảng Điều Khiển & Phân Tích Khoanh Vùng
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Chỉ cần nhấp các vị trí trên bản đồ để ghim mốc và tự động khép kín ranh giới
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleFinishDrawingBoundary}
                      className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                      title="Lưu và áp dụng ranh giới này vào bản đồ"
                    >
                      <Check size={13} /> Lưu & Xong
                    </button>
                    <button
                      onClick={() => {
                        setIsBoundaryEditMode(false);
                        setSelectedMilestoneIndex(null);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Đóng chế độ ghim mốc"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Real-time Geometric & Object Spatial Analysis Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Điểm mốc đã ghim:</span>
                    <span className="font-extrabold text-emerald-300 text-xs">{boundaryCoords.length} mốc giới</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Diện tích phân tích:</span>
                    <span className="font-extrabold text-emerald-300 text-xs truncate block">{formatArea(boundaryArea)}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Chu vi ranh giới:</span>
                    <span className="font-extrabold text-blue-300 text-xs">{formatDistance(boundaryPerimeter)}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Đối tượng bên trong:</span>
                    <span className="font-extrabold text-indigo-300 text-xs">{insideHouseholdsCount} hộ • {insideBusinessesCount} KD</span>
                  </div>
                </div>

                {/* Real-time Status Callout */}
                <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <span className="text-emerald-400 font-bold shrink-0">👉 Hướng dẫn:</span>
                    {boundaryCoords.length === 0 ? (
                      <span className="text-amber-200">Nhấp trực tiếp trên bản đồ để ghim <b>Mốc số 1</b>.</span>
                    ) : boundaryCoords.length < 3 ? (
                      <span className="text-amber-200">
                        Đã ghim {boundaryCoords.length} mốc. Nhấp tiếp để đặt <b>Mốc số {boundaryCoords.length + 1}</b> (cần tối thiểu 3 mốc để tự động khép kín).
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-medium">
                        Đã tự động tạo đa giác khép kín ({boundaryCoords.length} mốc). Có thể nhấp thêm để tinh chỉnh!
                      </span>
                    )}
                  </div>
                  {boundaryCoords.length > 0 && (
                    <button
                      onClick={handleUndoLastVertex}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-bold cursor-pointer shrink-0 border border-slate-700"
                      title="Hoàn tác mốc vừa ghim gần nhất"
                    >
                      <Undo2 size={11} className="inline mr-1" /> Hoàn tác
                    </button>
                  )}
                </div>

                {/* Action buttons bar */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <button
                    onClick={handleAutoSortClockwise}
                    disabled={boundaryCoords.length < 3}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      boundaryCoords.length >= 3 
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs" 
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                    title="Tự động sắp xếp lại các mốc giới theo chu vi khép kín quanh tâm để không bị xoắn chéo đường viền"
                  >
                    <Wand2 size={13} /> Tự động tối ưu vòng bao
                  </button>

                  {/* Preset quick selector */}
                  <div className="relative group">
                    <button
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                      title="Chọn mẫu ranh giới có sẵn của địa bàn"
                    >
                      <Layers size={13} className="text-emerald-400" /> Chọn mẫu có sẵn ▾
                    </button>
                    <div className="hidden group-hover:block absolute left-0 bottom-full mb-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1 z-40">
                      {BOUNDARY_PRESETS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleApplyQuickPreset(p.id)}
                          className="w-full text-left p-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.coords.length} mốc giới</p>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleClearAllVertices}
                    disabled={boundaryCoords.length === 0}
                    className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-800/60"
                    title="Xóa toàn bộ các mốc hiện tại để ghim mới từ đầu"
                  >
                    <Trash2 size={12} className="inline mr-1" /> Ghim mới từ đầu
                  </button>

                  <button
                    onClick={() => setShowBoundaryModal(true)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700 ml-auto"
                    title="Mở bảng quản trị mốc nâng cao (GeoJSON, đổi màu sắc, tọa độ DMS)"
                  >
                    <Sliders size={12} className="inline mr-1" /> Quản lý nâng cao
                  </button>
                </div>

                {/* Visually Numbered Milestone Chips Strip */}
                {boundaryCoords.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold flex items-center gap-1">
                        <MapPin size={11} className="text-emerald-400" /> Các mốc giới đã đánh số ({boundaryCoords.length} mốc):
                      </span>
                      <span>Nhấp mốc để xem chi tiết / xóa</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-20 pr-1">
                      {boundaryCoords.map((coord, idx) => {
                        const isSelected = selectedMilestoneIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedMilestoneIndex(isSelected ? null : idx)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono shrink-0 cursor-pointer border transition-all ${
                              isSelected
                                ? "bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm scale-105"
                                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                            }`}
                            title={`Mốc ${idx + 1}: [${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}]`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${
                              isSelected ? "bg-slate-950 text-amber-300" : "bg-emerald-600 text-white"
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[85px]">{coord.lat.toFixed(4)}, {coord.lng.toFixed(4)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVertex(idx);
                              }}
                              className="text-slate-400 hover:text-rose-400 p-0.5 rounded cursor-pointer ml-0.5"
                              title={`Xóa mốc số ${idx + 1}`}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SELECTED MILESTONE INSPECTION CARD OVERLAY */}
            {selectedMilestoneIndex !== null && boundaryCoords[selectedMilestoneIndex] && (() => {
              const mIdx = selectedMilestoneIndex;
              const mCoord = boundaryCoords[mIdx];
              const nextCoord = boundaryCoords[(mIdx + 1) % boundaryCoords.length];
              const distToNext = boundaryCoords.length > 1 
                ? calculateDistanceMeters(mCoord.lat, mCoord.lng, nextCoord.lat, nextCoord.lng)
                : 0;

              return (
                <div className="absolute bottom-16 right-4 z-30 bg-slate-950/95 border-2 border-amber-400 rounded-2xl p-3.5 shadow-2xl backdrop-blur text-white max-w-xs w-full animate-in zoom-in-95 duration-150 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                        {mIdx + 1}
                      </span>
                      <h4 className="font-extrabold text-xs text-white">Mốc giới số {mIdx + 1}</h4>
                    </div>
                    <button
                      onClick={() => setSelectedMilestoneIndex(null)}
                      className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-sans">Tọa độ Thập phân:</span>
                      <span className="text-emerald-300 font-bold block">{mCoord.lat.toFixed(6)}, {mCoord.lng.toFixed(6)}</span>
                      <span className="text-[9px] text-slate-400 block font-sans mt-1">Độ - Phút - Giây (DMS):</span>
                      <span className="text-slate-200 block text-[10px]">{decimalToDMS(mCoord.lat, mCoord.lng)}</span>
                    </div>

                    {boundaryCoords.length > 1 && (
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[10px]">
                        <span className="text-slate-400 block font-sans">Khoảng cách tới Mốc {((mIdx + 1) % boundaryCoords.length) + 1}:</span>
                        <span className="text-blue-300 font-bold">{distToNext} mét</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleDeleteVertex(mIdx)}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Trash2 size={12} /> Xóa mốc này
                    </button>
                    <button
                      onClick={() => setSelectedMilestoneIndex(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Legend floating banner inside map container */}
            <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur border border-slate-800 text-[10px] text-slate-300 rounded-lg p-2.5 flex flex-wrap gap-x-4 gap-y-1 z-10 shadow-md">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#4f46e5]"></span> Hộ gia đình</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#06b6d4]"></span> Hộ kinh doanh</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Camera</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Trụ nước PCCC</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Đèn LED Smart</span>
            </div>

            {/* Selected Pin Details Overlay panel inside map container */}
            {selectedPin && (
              <div className="absolute right-4 top-4 bg-slate-950/95 border border-slate-800 text-slate-100 rounded-xl p-4 shadow-2xl w-72 backdrop-blur animate-in slide-in-from-top-4 duration-150 space-y-3 z-20 max-h-[90%] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {selectedPin.type === "camera" && <Camera size={14} className="text-emerald-400" />}
                    {selectedPin.type === "fire" && <Flame size={14} className="text-rose-400" />}
                    {selectedPin.type === "light" && <Lightbulb size={14} className="text-amber-400" />}
                    {selectedPin.type === "household" && <Home size={14} className="text-indigo-400" />}
                    {selectedPin.type === "business" && <Briefcase size={14} className="text-cyan-400" />}
                    {selectedPin.type === "custom" && <MapPin size={14} className="text-slate-400" />}
                    <h3 className="font-bold text-xs text-white">{selectedPin.name}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPin(null);
                      setIsLiveActive(false);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="text-[11px] text-slate-300 leading-relaxed space-y-2">
                  <p className="text-slate-400 text-justify">{selectedPin.details}</p>
                  
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Vị trí địa chỉ thường trú:</span>
                    <span className="font-semibold text-slate-200 block text-[10px] leading-tight">{selectedPin.location}</span>
                    <span className="font-mono text-emerald-400 text-[9px] block mt-1">DEC: {selectedPin.lat.toFixed(6)}, {selectedPin.lng.toFixed(6)}</span>
                    <span className="font-mono text-slate-400 text-[8px] block">DMS: {decimalToDMS(selectedPin.lat, selectedPin.lng)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className="text-slate-500">Trạng thái kỹ thuật:</span>
                    <span className={`font-bold uppercase px-1.5 py-0.5 rounded text-[8px]
                      ${selectedPin.status === "Hoạt động" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }
                    `}>
                      ● {selectedPin.status}
                    </span>
                  </div>
                </div>

                {/* Actions: Navigation & Google Maps GPS */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <button 
                    onClick={() => {
                      setIsRouteActive(true);
                      setRouteTarget(selectedPin);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-md"
                  >
                    <Navigation size={13} /> Dẫn đường tới vị trí này
                  </button>

                  <a 
                    href={getGoogleMapsDirectionUrl(selectedPin.lat, selectedPin.lng, selectedPin.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer border border-slate-700"
                  >
                    <ExternalLink size={12} /> Mở Google Maps GPS
                  </a>
                </div>

                {/* Show LIVE camera stream triggers */}
                {selectedPin.type === "camera" && selectedPin.status === "Hoạt động" && (
                  <button 
                    onClick={() => setIsLiveActive(true)}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-md mt-1"
                  >
                    <Tv size={13} /> Kết nối LIVE STREAM trực tuyến
                  </button>
                )}
              </div>
            )}

            {/* FLOATING ROUTE GUIDANCE / NAVIGATION PANEL ON MAP */}
            {isRouteActive && (routeTarget || selectedPin) && (() => {
              const target = routeTarget || selectedPin!;
              const dist = calculateDistanceMeters(KP3_CENTER.lat, KP3_CENTER.lng, target.lat, target.lng);
              const motoTime = Math.max(1, Math.ceil(dist / 350));
              const walkTime = Math.max(2, Math.ceil(dist / 70));
              const steps = generateRouteSteps(target.name, target.location, dist);

              return (
                <div className="absolute top-4 left-4 z-30 max-w-sm w-full bg-slate-950/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur text-white animate-in slide-in-from-top-3 duration-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <Navigation size={16} />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-white">Chỉ đường tới {target.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{target.location}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsRouteActive(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                      title="Đóng dẫn đường"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Khoảng cách:</span>
                        <span className="font-bold text-emerald-400">{dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Xe máy:</span>
                        <span className="font-bold text-white">~{motoTime} phút</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Đi bộ:</span>
                        <span className="font-bold text-white">~{walkTime} phút</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {steps.map((st, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-slate-300">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1 leading-snug">
                            <span>{st.instruction}</span>
                            <span className="text-slate-500 font-mono text-[9px] ml-1">({st.distance})</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1 flex gap-2">
                      <a 
                        href={getGoogleMapsDirectionUrl(target.lat, target.lng, target.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded-xl text-[11px] transition-colors"
                      >
                        <ExternalLink size={12} /> Google Maps GPS
                      </a>
                      <button
                        onClick={() => setIsRouteActive(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* LIVE STREAM FEED POPUP CONTAINER */}
          {isLiveActive && selectedPin && selectedPin.type === "camera" && (
            <div id="live-camera-feed" className="bg-slate-950 border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 relative animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">LIVE CAM • {selectedPin.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>MÚI GIỜ: UTC+7 (HỒ CHÍ MINH)</span>
                  <button 
                    onClick={() => setIsLiveActive(false)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Feed video representation container */}
              <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center select-none">
                {/* Simulated lens grid overlays */}
                <div className="absolute inset-4 border border-white/5 pointer-events-none"></div>
                <div className="absolute top-1/2 left-4 right-4 h-px bg-white/5 -translate-y-1/2 pointer-events-none"></div>
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/5 -translate-x-1/2 pointer-events-none"></div>
                
                {/* Video text overlay */}
                <div className="absolute top-4 left-4 font-mono text-[9px] text-emerald-400 space-y-1 bg-black/75 px-2 py-1.5 rounded border border-white/5 z-10">
                  <div className="font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> REC LIVE</div>
                  <div>FPS: 30.00 | BITRATE: 4120 kbps</div>
                  <div>DEVICE: HIK_IP_CAM_03</div>
                  <div>COORDS: {selectedPin.lat}, {selectedPin.lng}</div>
                </div>

                <div className="absolute bottom-4 right-4 font-mono text-xs text-white bg-black/70 px-2 py-1.5 rounded border border-white/5 z-10">
                  {new Date().toLocaleTimeString("vi-VN")}
                </div>

                {/* Simulated street photo behind grid */}
                <img 
                  src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000" 
                  alt="Live Camera Footage feed"
                  className="w-full h-full object-cover opacity-45 blur-[0.5px]"
                  referrerPolicy="no-referrer"
                />

                {/* Animated scanlines and overlay noise */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent bg-[size:100%_12px] animate-pulse pointer-events-none"></div>
                
                <div className="absolute text-center space-y-2 bg-slate-950/40 p-4 rounded-xl backdrop-blur-sm">
                  <Tv size={36} className="text-emerald-500 animate-bounce mx-auto" />
                  <span className="font-bold text-emerald-400 text-xs tracking-widest block">ĐANG STREAM TRỰC TIẾP TỪ THIẾT BỊ ĐẦU CUỐI</span>
                  <p className="text-[10px] text-slate-300">Tín hiệu truyền dẫn đạt chất lượng cao ổn định</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: GHIM VỊ TRÍ MỚI VÀ ĐỒNG BỘ CSDL KHU PHỐ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm">Ghim vị trí mới & Đồng bộ CSDL</h3>
                  <p className="text-[9px] text-slate-400 mt-0.5">Thiết lập tọa độ địa lý đồng bộ thông minh</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSavePin} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Selector Mode: Assign to DB or Standalone */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gán nhanh từ Cơ sở dữ liệu Khu phố</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignType("household");
                      setPinType("household");
                      setPinName("");
                      setPinLocation("");
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${assignType === "household" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                  >
                    🏠 Sổ Hộ Khẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignType("business");
                      setPinType("business");
                      setPinName("");
                      setPinLocation("");
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${assignType === "business" ? "bg-cyan-600 text-white border-cyan-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                  >
                    💼 Hộ Kinh Doanh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignType("none");
                      setPinType("custom");
                      setPinName("");
                      setPinLocation("");
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${assignType === "none" ? "bg-slate-700 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                  >
                    📍 Địa điểm khác
                  </button>
                </div>

                {/* Sub-selectors depending on assign type */}
                {assignType === "household" && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block">Chọn Sổ Hộ Khẩu để lấy thông tin địa chỉ</label>
                    <select
                      value={selectedHouseholdId}
                      onChange={(e) => {
                        const hId = e.target.value;
                        setSelectedHouseholdId(hId);
                        const hh = households.find(h => h.id === hId);
                        if (hh) {
                          setPinName(`Nhà ông/bà ${hh.ownerName}`);
                          setPinLocation(hh.address);
                          setPinDetails(`Mã sổ hộ khẩu điện tử: ${hh.code}. Trưởng hộ: ${hh.ownerName}. Gồm có ${hh.memberCount} thành viên trong gia đình.`);
                          
                          // Pre-fill coordinate if exists
                          const parsed = parseCoordinates(hh.coordinates);
                          if (parsed) {
                            setPinLat(parsed.lat);
                            setPinLng(parsed.lng);
                            setCoordsInput(`${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`);
                          } else {
                            const lat = 10.936997 + (Math.random() - 0.5) * 0.001;
                            const lng = 106.744645 + (Math.random() - 0.5) * 0.001;
                            setPinLat(lat);
                            setPinLng(lng);
                            setCoordsInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                          }
                        }
                      }}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Chọn Sổ Hộ Khẩu từ cơ sở dữ liệu --</option>
                      {households.map(hh => (
                        <option key={hh.id} value={hh.id}>
                          {hh.code} - Hộ {hh.ownerName} ({hh.address})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-amber-600 font-medium">
                      ⚠️ Tọa độ ghim sau khi lưu sẽ đồng bộ ngay lập tức cho trưởng hộ và toàn bộ thành viên gia đình.
                    </p>
                  </div>
                )}

                {assignType === "business" && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block">Chọn Hộ Kinh Doanh để liên kết</label>
                    <select
                      value={selectedBusinessId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setSelectedBusinessId(bId);
                        const b = businesses.find(x => x.id === bId);
                        if (b) {
                          setPinName(b.name);
                          setPinLocation(b.address);
                          setPinDetails(`Hộ kinh doanh: ${b.name}. Ngành nghề: ${b.type}. Chủ kinh doanh: ${b.owner}. Số GP: ${b.licenseNumber}.`);
                          
                          // Pre-fill coordinate if exists
                          const parsed = parseCoordinates(b.coordinates);
                          if (parsed) {
                            setPinLat(parsed.lat);
                            setPinLng(parsed.lng);
                            setCoordsInput(`${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`);
                          } else {
                            const lat = 10.936997 + (Math.random() - 0.5) * 0.001;
                            const lng = 106.744645 + (Math.random() - 0.5) * 0.001;
                            setPinLat(lat);
                            setPinLng(lng);
                            setCoordsInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                          }
                        }
                      }}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Chọn Cơ Sở Kinh Doanh từ CSDL --</option>
                      {businesses.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} - Chủ: {b.owner} ({b.address})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Editable detail fields */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block">Tên địa điểm / Tên ghim *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ví dụ: Nhà ông Nguyễn Văn A"
                      value={pinName}
                      onChange={(e) => setPinName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block">Phân loại vị trí</label>
                    <select
                      value={pinType}
                      onChange={(e: any) => setPinType(e.target.value)}
                      disabled={assignType !== "none"}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="household">🏠 Hộ dân cư</option>
                      <option value="business">💼 Hộ kinh doanh</option>
                      <option value="camera">🎥 Camera an ninh</option>
                      <option value="fire">🔥 Thiết bị PCCC</option>
                      <option value="light">💡 Đèn chiếu sáng LED</option>
                      <option value="custom">📍 Vị trí khác (Tự do)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block">Địa chỉ cụ thể</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: 124/2 Lương Định Của, Tổ 12"
                    value={pinLocation}
                    onChange={(e) => setPinLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Coordinate Picker fields */}
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                      🌐 Tọa độ địa lý GPS vệ tinh (WGS84)
                    </span>
                    <span className="text-[9px] text-indigo-500 font-mono">Hệ tọa độ kép</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">Dán Tọa độ GPS (Vĩ độ, Kinh độ) *</span>
                    <div className="relative">
                      <input 
                        type="text"
                        required
                        placeholder="Ví dụ: 10.936828983072935, 106.74339281983293"
                        value={coordsInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCoordsInput(val);
                          const parsed = parseCoordinates(val);
                          if (parsed) {
                            setPinLat(parsed.lat);
                            setPinLng(parsed.lng);
                          }
                        }}
                        className="w-full pl-3 pr-20 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none bg-white focus:border-indigo-500"
                      />
                      {parseCoordinates(coordsInput) ? (
                        <span className="absolute right-2.5 top-2 bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200 select-none">
                          ✓ Hợp lệ
                        </span>
                      ) : (
                        <span className="absolute right-2.5 top-2 bg-rose-50 text-rose-500 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200 select-none">
                          ✗ Chưa đúng
                        </span>
                      )}
                    </div>
                  </div>

                  {parseCoordinates(coordsInput) && (
                    <div className="bg-white/80 p-2 rounded border border-indigo-50/50 text-[10px] text-slate-600 space-y-1">
                      <div className="flex justify-between items-center">
                        <span>Nhận diện Vĩ độ (Latitude):</span>
                        <strong className="font-mono text-indigo-600">{pinLat.toFixed(6)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Nhận diện Kinh độ (Longitude):</span>
                        <strong className="font-mono text-indigo-600">{pinLng.toFixed(6)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-500 leading-normal bg-white p-2 rounded border border-slate-100 flex items-start gap-1.5 mt-1">
                    <Info size={11} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <b>Mẹo sao chép nhanh:</b> Trên Google Maps, nhấp giữ (hoặc nhấp chuột phải) vào đúng vị trí cần ghim, sao chép dòng tọa độ (ví dụ: <code>10.936828, 106.743392</code>) rồi dán thẳng vào ô phía trên. Hệ thống tự tách vĩ độ và kinh độ tự động để định vị nhanh.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block">Ghi chú chi tiết / Mô tả địa điểm</label>
                  <textarea 
                    rows={2}
                    placeholder="Mô tả thêm về địa điểm ghim này..."
                    value={pinDetails}
                    onChange={(e) => setPinDetails(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={13} /> Lưu & Đồng bộ CSDL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BÁO CÁO KẾT QUẢ ĐỒNG BỘ TỰ ĐỘNG */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-150 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/30 text-indigo-200 p-1.5 rounded-lg border border-indigo-500/20">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Kết Quả Tự Động Đồng Bộ Tọa Độ GIS</h3>
                  <p className="text-[10px] text-indigo-200 mt-0.5">Tiến trình đồng bộ bản đồ với dữ liệu Hộ khẩu & Doanh nghiệp</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div className="text-center space-y-1 py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sổ Hộ Khẩu</span>
                  <span className="text-lg font-extrabold text-indigo-600">
                    {syncDetails.filter(d => d.type === "household" && d.status.includes("mới")).length} / {households.length}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Được định vị mới</span>
                </div>
                <div className="text-center space-y-1 py-1 border-x border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hộ Kinh Doanh</span>
                  <span className="text-lg font-extrabold text-cyan-600">
                    {syncDetails.filter(d => d.type === "business" && d.status.includes("mới")).length} / {businesses.length}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Được định vị mới</span>
                </div>
                <div className="text-center space-y-1 py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trạng thái hệ thống</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> HOÀN THÀNH
                  </span>
                  <span className="text-[9px] text-slate-400 block">100% CSDL Có Tọa Độ</span>
                </div>
              </div>

              {/* Detail Logs List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nhật ký xử lý chi tiết thực địa</span>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-60 overflow-y-auto bg-white">
                  {syncDetails.map((log, i) => (
                    <div key={i} className="p-3 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="mt-0.5 text-base shrink-0 select-none">
                          {log.type === "household" ? "🏠" : "💼"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-800 truncate">{log.name}</span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded shrink-0">{log.code}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{log.address}</p>
                          <p className="text-[9px] font-mono text-indigo-500 mt-1">Ghim GPS: {log.coords}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0
                        ${log.status.includes("mới") 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-slate-100 text-slate-500"
                        }
                      `}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-150 text-emerald-800 text-[11px] leading-relaxed p-3.5 rounded-xl space-y-1.5">
                <p className="font-bold flex items-center gap-1">
                  💡 Cơ chế đồng bộ hóa thông minh kết thúc thành công:
                </p>
                <p>• Tọa độ mới được nội suy một cách đồng bộ và chính xác dựa trên ranh giới thực địa hành chính Khu phố 3.</p>
                <p>• Dữ liệu hộ khẩu mới ghim sẽ <b>tự động đồng bộ và liên kết</b> với tọa độ cư trú của từng Nhân khẩu thành viên tương ứng.</p>
                <p>• Các chấm định vị hộ dân cư <b>(Màu Xanh Tím)</b> và hộ kinh doanh <b>(Màu Xanh Lam)</b> hiện đã hiển thị đầy đủ và trực quan trên bản đồ số GIS.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowSyncModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gis Boundary Manager Modal */}
      <GisBoundaryManagerModal
        isOpen={showBoundaryModal}
        onClose={() => setShowBoundaryModal(false)}
        coords={boundaryCoords}
        style={boundaryStyle}
        onSave={handleSaveBoundary}
        householdsList={households}
        businessesList={businesses}
      />
    </div>
  );
}
