import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Maximize2, 
  Layers, 
  MapPin, 
  Navigation, 
  Tv, 
  Home, 
  Briefcase, 
  Camera, 
  Flame, 
  Lightbulb, 
  RotateCcw,
  CheckCircle2,
  Info,
  Compass
} from "lucide-react";
import { KP3_CENTER } from "../../utils/gisUtils";
import { GisPin } from "../GisMap";
import { BoundaryStyle } from "./GisBoundaryManagerModal";

// 5 Sub-zones for Tổ Dân Phố within KP3
export const TO_DAN_PHO_ZONES = [
  {
    id: "TDP_11",
    name: "Tổ dân phố 11",
    leader: "Ông Nguyễn Văn Hùng",
    color: "#6366f1", // Indigo
    coords: [
      { lat: 10.9385, lng: 106.7432 },
      { lat: 10.9392, lng: 106.7450 },
      { lat: 10.9378, lng: 106.7455 },
      { lat: 10.9372, lng: 106.7436 }
    ]
  },
  {
    id: "TDP_12",
    name: "Tổ dân phố 12 (Khu trung tâm)",
    leader: "Bà Lê Thị Mai",
    color: "#10b981", // Emerald
    coords: [
      { lat: 10.9372, lng: 106.7436 },
      { lat: 10.9378, lng: 106.7455 },
      { lat: 10.9362, lng: 106.7460 },
      { lat: 10.9356, lng: 106.7440 }
    ]
  },
  {
    id: "TDP_13",
    name: "Tổ dân phố 13",
    leader: "Ông Trần Văn Minh",
    color: "#f59e0b", // Amber
    coords: [
      { lat: 10.9392, lng: 106.7450 },
      { lat: 10.9388, lng: 106.7472 },
      { lat: 10.9374, lng: 106.7475 },
      { lat: 10.9378, lng: 106.7455 }
    ]
  },
  {
    id: "TDP_14",
    name: "Tổ dân phố 14",
    leader: "Bà Phạm Thị Lan",
    color: "#ec4899", // Pink
    coords: [
      { lat: 10.9378, lng: 106.7455 },
      { lat: 10.9374, lng: 106.7475 },
      { lat: 10.9358, lng: 106.7468 },
      { lat: 10.9362, lng: 106.7460 }
    ]
  },
  {
    id: "TDP_15",
    name: "Tổ dân phố 15 (Giáp Dĩ An)",
    leader: "Ông Hoàng Văn Thái",
    color: "#06b6d4", // Cyan
    coords: [
      { lat: 10.9356, lng: 106.7440 },
      { lat: 10.9362, lng: 106.7460 },
      { lat: 10.9350, lng: 106.7452 },
      { lat: 10.9345, lng: 106.7435 }
    ]
  }
];

interface LeafletGisMapProps {
  boundaryCoords: { lat: number; lng: number }[];
  boundaryStyle: BoundaryStyle;
  isBoundaryEditMode: boolean;
  selectedMilestoneIndex: number | null;
  onSelectMilestone: (index: number | null) => void;
  onAddVertexFromMap?: (coord: { lat: number; lng: number }) => void;
  layers: {
    boundary: boolean;
    household: boolean;
    business: boolean;
    camera: boolean;
    fire: boolean;
    light: boolean;
  };
  pins: GisPin[];
  selectedPin: GisPin | null;
  onSelectPin: (pin: GisPin) => void;
  onLiveCameraClick?: () => void;
}

export default function LeafletGisMap({
  boundaryCoords,
  boundaryStyle,
  isBoundaryEditMode,
  selectedMilestoneIndex,
  onSelectMilestone,
  onAddVertexFromMap,
  layers,
  pins,
  selectedPin,
  onSelectPin,
  onLiveCameraClick
}: LeafletGisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Layer groups
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryPolygonRef = useRef<L.Polygon | null>(null);
  const milestoneMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const pinsGroupRef = useRef<L.LayerGroup | null>(null);
  const tdpPolygonsGroupRef = useRef<L.LayerGroup | null>(null);

  // Map state
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite" | "light">("streets");
  const [showTdpZones, setShowTdpZones] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(16);

  // Available Tile Providers
  const TILE_PROVIDERS = {
    streets: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxZoom: 18
    },
    light: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 19
    }
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization

    // Bounds restriction: keep user within An Phú & TP. Thủ Đức / Dĩ An region
    const southWest = L.latLng(10.7500, 106.6500);
    const northEast = L.latLng(11.0500, 106.8500);
    const bounds = L.latLngBounds(southWest, northEast);

    const map = L.map(mapContainerRef.current, {
      center: [KP3_CENTER.lat, KP3_CENTER.lng],
      zoom: 16,
      minZoom: 13,
      maxZoom: 19,
      maxBounds: bounds,
      maxBoundsViscosity: 0.8, // Bounce back if dragged out
      zoomControl: false // Custom controls
    });

    // Default tile layer
    const tileLayer = L.tileLayer(TILE_PROVIDERS.streets.url, {
      attribution: TILE_PROVIDERS.streets.attribution,
      maxZoom: TILE_PROVIDERS.streets.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    milestoneMarkersGroupRef.current = L.layerGroup().addTo(map);
    pinsGroupRef.current = L.layerGroup().addTo(map);
    tdpPolygonsGroupRef.current = L.layerGroup().addTo(map);

    map.on("zoomend", () => {
      setZoomLevel(map.getZoom());
    });

    // Map click handler for adding vertices in edit mode
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onAddVertexFromMap) {
        onAddVertexFromMap({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6))
        });
      }
    });

    mapInstanceRef.current = map;

    // Fix map sizing when container becomes ready
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Tile Provider (Streets vs Satellite vs Light)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const config = TILE_PROVIDERS[mapStyle];
    tileLayerRef.current.setUrl(config.url);
  }, [mapStyle]);

  // 3. Render / Update Administrative Boundary Polygon (Geo-pinned)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (boundaryPolygonRef.current) {
      map.removeLayer(boundaryPolygonRef.current);
      boundaryPolygonRef.current = null;
    }

    if (!layers.boundary || boundaryCoords.length < 3) return;

    const latLngs = boundaryCoords.map(p => [p.lat, p.lng] as [number, number]);

    const polygon = L.polygon(latLngs, {
      color: boundaryStyle.strokeColor || "#10b981",
      weight: (boundaryStyle.strokeWeight || 3) * 1.2,
      opacity: 0.9,
      fillColor: boundaryStyle.fillColor || "#10b981",
      fillOpacity: boundaryStyle.fillOpacity || 0.15,
      dashArray: isBoundaryEditMode ? "8, 6" : undefined
    });

    polygon.bindTooltip("<b>ĐỊA GIỚI HÀNH CHÍNH KHU PHỐ 3</b><br/>Phường An Phú, TP. Thủ Đức", {
      sticky: true,
      className: "bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-emerald-500/30"
    });

    polygon.addTo(map);
    boundaryPolygonRef.current = polygon;
  }, [boundaryCoords, boundaryStyle, layers.boundary, isBoundaryEditMode]);

  // 4. Render TDP Sub-zones
  useEffect(() => {
    if (!tdpPolygonsGroupRef.current) return;
    tdpPolygonsGroupRef.current.clearLayers();

    if (!showTdpZones || !layers.boundary) return;

    TO_DAN_PHO_ZONES.forEach(zone => {
      const latLngs = zone.coords.map(p => [p.lat, p.lng] as [number, number]);
      const poly = L.polygon(latLngs, {
        color: zone.color,
        weight: 1.5,
        opacity: 0.8,
        dashArray: "4, 4",
        fillColor: zone.color,
        fillOpacity: 0.08
      });

      poly.bindTooltip(
        `<div class="font-sans text-xs"><b>${zone.name}</b><br/><span class="text-slate-500 text-[10px]">Tổ trưởng: ${zone.leader}</span></div>`,
        { sticky: true }
      );

      poly.addTo(tdpPolygonsGroupRef.current!);
    });
  }, [showTdpZones, layers.boundary]);

  // 5. Render Boundary Milestones (Numbered markers 1..N)
  useEffect(() => {
    if (!milestoneMarkersGroupRef.current) return;
    milestoneMarkersGroupRef.current.clearLayers();

    if (!layers.boundary || !isBoundaryEditMode) return;

    boundaryCoords.forEach((coord, idx) => {
      const isSelected = selectedMilestoneIndex === idx;
      const html = `
        <div class="flex flex-col items-center cursor-pointer select-none transition-transform ${isSelected ? "scale-125 z-50" : "hover:scale-110"}">
          <div class="w-6 h-6 rounded-full text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white ring-2 ${
            isSelected ? "bg-amber-500 ring-amber-300" : "bg-emerald-600 ring-emerald-400"
          }">
            ${idx + 1}
          </div>
          <span class="bg-slate-950/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
            Mốc ${idx + 1}
          </span>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-milestone-marker",
        html: html,
        iconSize: [32, 40],
        iconAnchor: [16, 20]
      });

      const marker = L.marker([coord.lat, coord.lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectMilestone(isSelected ? null : idx);
      });

      marker.addTo(milestoneMarkersGroupRef.current!);
    });
  }, [boundaryCoords, isBoundaryEditMode, selectedMilestoneIndex, layers.boundary]);

  // 6. Render Map Pins (Households, Businesses, Cameras, PCCC, Lights)
  useEffect(() => {
    if (!pinsGroupRef.current) return;
    pinsGroupRef.current.clearLayers();

    const getPinColor = (type: string) => {
      switch (type) {
        case "household": return { bg: "#4f46e5", border: "#fff", text: "🏠" }; // Indigo
        case "business": return { bg: "#06b6d4", border: "#fff", text: "💼" };  // Cyan
        case "camera": return { bg: "#10b981", border: "#fff", text: "🎥" };    // Emerald
        case "fire": return { bg: "#f43f5e", border: "#fff", text: "🔥" };      // Rose
        case "light": return { bg: "#f59e0b", border: "#fff", text: "💡" };     // Amber
        default: return { bg: "#6b7280", border: "#fff", text: "📍" };
      }
    };

    pins.forEach(pin => {
      // Filter out if layer is unchecked
      if (pin.type === "household" && !layers.household) return;
      if (pin.type === "business" && !layers.business) return;
      if (pin.type === "camera" && !layers.camera) return;
      if (pin.type === "fire" && !layers.fire) return;
      if (pin.type === "light" && !layers.light) return;

      const isSelected = selectedPin?.id === pin.id;
      const conf = getPinColor(pin.type);

      const html = `
        <div class="relative flex items-center justify-center transition-all ${
          isSelected ? "scale-130 -translate-y-1 z-50 animate-bounce" : "hover:scale-115 cursor-pointer"
        }">
          ${isSelected ? `<span class="absolute -inset-1.5 rounded-full bg-emerald-400/40 animate-ping"></span>` : ""}
          <div style="background-color: ${conf.bg};" class="w-8 h-8 rounded-2xl flex items-center justify-center text-white text-xs shadow-md border-2 border-white ring-1 ring-slate-900/10">
            ${conf.text}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-pin-marker",
        html: html,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([pin.lat, pin.lng], { icon });

      // Popup content
      const popupHtml = `
        <div class="p-1 max-w-[240px] font-sans">
          <div class="font-bold text-xs text-slate-900 mb-0.5">${pin.name}</div>
          <div class="text-[11px] text-slate-600 mb-1.5">${pin.location}</div>
          <div class="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1 text-slate-500">
            <span class="font-mono">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</span>
            <span class="font-bold ${pin.status === "Hoạt động" ? "text-emerald-600" : "text-amber-600"}">${pin.status}</span>
          </div>
          ${pin.type === "camera" ? `
            <button id="leaflet-popup-cam-btn-${pin.id}" class="mt-2 w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer">
              🎥 Xem Camera Trực Tiếp
            </button>
          ` : ""}
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "custom-leaflet-popup" });

      marker.on("click", () => {
        onSelectPin(pin);
      });

      marker.on("popupopen", () => {
        const camBtn = document.getElementById(`leaflet-popup-cam-btn-${pin.id}`);
        if (camBtn && onLiveCameraClick) {
          camBtn.onclick = () => {
            onLiveCameraClick();
          };
        }
      });

      marker.addTo(pinsGroupRef.current!);
    });
  }, [pins, layers, selectedPin]);

  // Fit bounds to entire KP3 boundary
  const handleFitKp3Bounds = () => {
    if (!mapInstanceRef.current || boundaryCoords.length < 3) return;
    const latLngs = boundaryCoords.map(p => [p.lat, p.lng] as [number, number]);
    const bounds = L.latLngBounds(latLngs);
    mapInstanceRef.current.fitBounds(bounds, {
      padding: [40, 40],
      animate: true,
      duration: 0.8
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 1. Leaflet Container */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-gis-map-canvas"
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing" 
      />

      {/* 2. Top-Right Map Mode & Controls Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Style Selector */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-slate-200/80 flex items-center gap-1 text-xs">
          <button
            onClick={() => setMapStyle("streets")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              mapStyle === "streets" 
                ? "bg-emerald-600 text-white shadow-xs" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Bản đồ đường phố OpenStreetMap"
          >
            Đường phố
          </button>
          <button
            onClick={() => setMapStyle("satellite")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              mapStyle === "satellite" 
                ? "bg-emerald-600 text-white shadow-xs" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Ảnh chụp vệ tinh Esri World Imagery"
          >
            Vệ tinh
          </button>
          <button
            onClick={() => setMapStyle("light")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              mapStyle === "light" 
                ? "bg-emerald-600 text-white shadow-xs" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Bản đồ tối giản độ tương phản cao"
          >
            Sáng dịu
          </button>
        </div>

        {/* Quick Map Action Buttons */}
        <div className="flex items-center gap-2 self-end">
          {/* TDP Sub-zones Toggle */}
          <button
            onClick={() => setShowTdpZones(!showTdpZones)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md border transition-all cursor-pointer ${
              showTdpZones
                ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20"
                : "bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
            title="Bật/Tắt hiển thị ranh giới 5 Tổ dân phố (TDP 11 - 15)"
          >
            <Compass size={14} />
            <span>5 Tổ Dân Phố</span>
          </button>

          {/* Fit Boundary Button */}
          <button
            onClick={handleFitKp3Bounds}
            className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg border border-slate-700/50 transition-all cursor-pointer hover:scale-105"
            title="Tự động thu phóng ôm trọn ranh giới hành chính Khu phố 3"
          >
            <Maximize2 size={13} className="text-emerald-400" />
            <span>Toàn cảnh KP3</span>
          </button>
        </div>
      </div>

      {/* 3. Bottom-Left Information HUD */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div className="text-xs">
            <span className="font-bold text-white block">Leaflet WGS-84 GIS Engine</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Ranh giới cố định • Khóa tọa độ thực tế • Zoom: {zoomLevel}x
            </span>
          </div>
          <button
            onClick={handleFitKp3Bounds}
            className="ml-2 px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
          >
            Căn giữa
          </button>
        </div>
      </div>
    </div>
  );
}
