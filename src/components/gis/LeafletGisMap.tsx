import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Compass, Layers, Crosshair, X, Radar } from "lucide-react";
import { KP3_CENTER } from "../../utils/gisUtils";
import { BoundaryStyle } from "./GisBoundaryManagerModal";
import { GisLayersState, GisPickedLocation, GisPin, GisPinType } from "./gisTypes";
import {
  KP3_14_ZONES,
  PIN_CATEGORY_META,
  detectToDanPhoFromCoord,
  formatLatLngVN,
} from "../../data/gisConfig";

export interface LeafletGisMapProps {
  pins: GisPin[];
  selectedPin: GisPin | null;
  onSelectPin: (pin: GisPin) => void;
  layers: GisLayersState;
  boundaryCoords: { lat: number; lng: number }[];
  boundaryStyle: BoundaryStyle;
  isBoundaryEditMode: boolean;
  selectedMilestoneIndex: number | null;
  onSelectMilestone: (index: number | null) => void;
  onUpdateMilestoneCoord: (index: number, coord: { lat: number; lng: number }) => void;
  onAddVertexFromMap: (coord: { lat: number; lng: number }) => void;
  isPickLocationMode?: boolean;
  pickedCoord?: { lat: number; lng: number } | null;
  onPickLocation?: (location: GisPickedLocation) => void;
  onCancelPickLocation?: () => void;
  showCoverageRadius?: boolean;
  onToggleCoverageRadius?: () => void;
  routeTarget?: GisPin | null;
  activeToFilter?: number | null;
  onSelectToFilter?: (toNum: number | null) => void;
  onTriggerLiveStream?: (pin: GisPin) => void;
  focusZoomCoord?: { lat: number; lng: number; zoom?: number; ts?: number } | null;
  readOnly?: boolean;
}

type MapTileStyle = "streets" | "satellite" | "light";

const TILE_PROVIDERS: Record<
  MapTileStyle,
  { url: string; attribution: string; maxZoom: number }
> = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap & CARTO",
    maxZoom: 19,
  },
};

function getPinSvgPath(type: GisPinType): string {
  switch (type) {
    case "civic":
      return '<path d="M3 21h18"/><path d="M6 21V9l6-4 6 4v12"/><path d="M10 21v-4h4v4"/>';
    case "report":
      return '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>';
    case "camera":
      return '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>';
    case "fire":
      return '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>';
    case "light":
      return '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>';
    case "business":
      return '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>';
    case "household":
      return '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
    default:
      return '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function LeafletGisMap({
  pins,
  selectedPin,
  onSelectPin,
  layers,
  boundaryCoords,
  boundaryStyle,
  isBoundaryEditMode,
  selectedMilestoneIndex,
  onSelectMilestone,
  onUpdateMilestoneCoord,
  onAddVertexFromMap,
  isPickLocationMode = false,
  pickedCoord = null,
  onPickLocation,
  onCancelPickLocation,
  showCoverageRadius = false,
  onToggleCoverageRadius,
  routeTarget = null,
  activeToFilter = null,
  onSelectToFilter,
  onTriggerLiveStream,
  focusZoomCoord = null,
  readOnly = false,
}: LeafletGisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const milestonesGroupRef = useRef<L.LayerGroup | null>(null);
  const tdpGroupRef = useRef<L.LayerGroup | null>(null);
  const coverageGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);
  const pinsGroupRef = useRef<L.LayerGroup | null>(null);
  const pickerLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<MapTileStyle>("streets");
  const [showTdpZones, setShowTdpZones] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [mapMoveSeq, setMapMoveSeq] = useState<number>(0);

  // Refs synced so map click/drag handlers avoid stale closures
  const isBoundaryEditRef = useRef(isBoundaryEditMode);
  const isPickLocationRef = useRef(isPickLocationMode);
  const addVertexRef = useRef(onAddVertexFromMap);
  const pickLocationRef = useRef(onPickLocation);
  const selectPinRef = useRef(onSelectPin);
  const selectMilestoneRef = useRef(onSelectMilestone);
  const updateMilestoneRef = useRef(onUpdateMilestoneCoord);
  const selectToFilterRef = useRef(onSelectToFilter);
  const liveStreamRef = useRef(onTriggerLiveStream);

  useEffect(() => {
    isBoundaryEditRef.current = isBoundaryEditMode;
  }, [isBoundaryEditMode]);

  useEffect(() => {
    isPickLocationRef.current = isPickLocationMode;
  }, [isPickLocationMode]);

  useEffect(() => {
    addVertexRef.current = onAddVertexFromMap;
    pickLocationRef.current = onPickLocation;
    selectPinRef.current = onSelectPin;
    selectMilestoneRef.current = onSelectMilestone;
    updateMilestoneRef.current = onUpdateMilestoneCoord;
    selectToFilterRef.current = onSelectToFilter;
    liveStreamRef.current = onTriggerLiveStream;
  });

  // 1. Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [KP3_CENTER.lat, KP3_CENTER.lng],
      zoom: 16,
      zoomSnap: 0.25,
      preferCanvas: true,
      renderer: L.canvas({ padding: 0 }),
      zoomControl: false,
      attributionControl: true,
    });

    const provider = TILE_PROVIDERS.streets;
    tileLayerRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
    }).addTo(map);

    tdpGroupRef.current = L.layerGroup().addTo(map);
    coverageGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    milestonesGroupRef.current = L.layerGroup().addTo(map);
    pinsGroupRef.current = L.layerGroup().addTo(map);
    pickerLayerRef.current = L.layerGroup().addTo(map);

    if (boundaryCoords.length >= 3) {
      const initBounds = L.latLngBounds(
        boundaryCoords.map((c) => [c.lat, c.lng] as L.LatLngTuple)
      );
      map.fitBounds(initBounds, { padding: [54, 48], maxZoom: 16, animate: false });
      setCurrentZoom(map.getZoom());
    }

    map.on("zoomend", () => {
      setCurrentZoom(map.getZoom());
      setMapMoveSeq((s) => s + 1);
    });
    map.on("moveend", () => {
      setMapMoveSeq((s) => s + 1);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));

      if (isPickLocationRef.current && pickLocationRef.current) {
        const zone = detectToDanPhoFromCoord(lat, lng);
        pickLocationRef.current({
          lat,
          lng,
          detectedTo: zone ? zone.toNumber : null,
        });
        return;
      }

      if (isBoundaryEditRef.current && addVertexRef.current) {
        addVertexRef.current({ lat, lng });
      }
    });

    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch tile layers when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const p = TILE_PROVIDERS[mapStyle];
    tileLayerRef.current = L.tileLayer(p.url, {
      attribution: p.attribution,
      maxZoom: p.maxZoom,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [mapStyle]);

  // 3. Draw 14 Tổ Dân Phố zone overlay when enabled or when filtered to a Tổ
  useEffect(() => {
    const group = tdpGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const shouldRender = showTdpZones || activeToFilter !== null;
    if (!shouldRender) return;

    KP3_14_ZONES.forEach((zone) => {
      const isActive = activeToFilter === zone.toNumber;
      const isDimmed = activeToFilter !== null && !isActive;

      const latLngs = zone.polygon.map((c) => [c.lat, c.lng] as L.LatLngExpression);
      const poly = L.polygon(latLngs, {
        color: isActive ? "#073B72" : zone.strokeColor,
        weight: isActive ? 3 : 1.5,
        opacity: isDimmed ? 0.25 : 0.85,
        dashArray: isActive ? undefined : "5, 5",
        fillColor: zone.fillColor,
        fillOpacity: isActive ? 0.22 : isDimmed ? 0.03 : 0.11,
        interactive: true,
      });

      poly.on("click", (ev) => {
        if (isPickLocationRef.current || isBoundaryEditRef.current) return;
        L.DomEvent.stopPropagation(ev);
        selectToFilterRef.current?.(isActive ? null : zone.toNumber);
      });

      poly.bindTooltip(
        `<div class="text-xs font-sans">
          <div class="font-bold text-slate-900">${escapeHtml(zone.name)} · Cụm ${escapeHtml(zone.cluster)}</div>
          <div class="text-slate-600 mt-0.5">${escapeHtml(zone.streets)}</div>
        </div>`,
        { sticky: true }
      );

      poly.addTo(group);

      // Center pill badge for Tổ number when zones are shown
      if (showTdpZones || isActive) {
        const badgeIcon = L.divIcon({
          className: "kp3-zone-label",
          html: `<div style="background:${
            isActive ? "#073B72" : "#0f172a"
          };color:#ffffff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:9999px;border:1.5px solid #ffffff;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.22);">${escapeHtml(
            zone.shortLabel
          )}</div>`,
          iconSize: [52, 22],
          iconAnchor: [26, 11],
        });
        L.marker([zone.center.lat, zone.center.lng], {
          icon: badgeIcon,
          interactive: false,
        }).addTo(group);
      }
    });
  }, [showTdpZones, activeToFilter]);

  // 4. Draw KP3 boundary polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    if (!layers.boundary || boundaryCoords.length < 3) return;

    const latLngs = boundaryCoords.map((c) => [c.lat, c.lng] as L.LatLngExpression);
    const poly = L.polygon(latLngs, {
      color: boundaryStyle.strokeColor,
      weight: Math.max(2, boundaryStyle.strokeWeight),
      opacity: 0.9,
      dashArray: isBoundaryEditMode ? undefined : "10, 6",
      fillColor: boundaryStyle.fillColor,
      fillOpacity: Math.min(0.25, boundaryStyle.fillOpacity),
      interactive: false,
    }).addTo(map);

    boundaryLayerRef.current = poly;
  }, [boundaryCoords, boundaryStyle, layers.boundary, isBoundaryEditMode]);

  // 5. Render boundary milestones (shown ONLY in edit mode or explicitly toggled by boundary layer + edit)
  useEffect(() => {
    const group = milestonesGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.boundary || !isBoundaryEditMode) return;

    boundaryCoords.forEach((coord, idx) => {
      const isSelected = selectedMilestoneIndex === idx;
      const iconHtml = `
        <div class="flex flex-col items-center">
          <div style="width:28px;height:28px;border-radius:9999px;border:2px solid #ffffff;background:${
            isSelected ? "#4f46e5" : "#047857"
          };color:#ffffff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:grab;">
            ${idx + 1}
          </div>
        </div>
      `;

      const milestoneIcon = L.divIcon({
        className: "kp3-milestone-pin",
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([coord.lat, coord.lng], {
        icon: milestoneIcon,
        draggable: !readOnly && isBoundaryEditMode,
        autoPan: true,
        zIndexOffset: isSelected ? 1000 : 500,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectMilestoneRef.current(isSelected ? null : idx);
      });

      marker.on("dragend", (e) => {
        const ll = (e.target as L.Marker).getLatLng();
        updateMilestoneRef.current(idx, {
          lat: Number(ll.lat.toFixed(6)),
          lng: Number(ll.lng.toFixed(6)),
        });
      });

      marker.bindTooltip(
        `<div class="text-xs font-sans font-semibold text-slate-900">Mốc ${idx + 1} · Kéo để chỉnh tọa độ</div>`,
        { direction: "top", offset: [0, -10] }
      );

      marker.addTo(group);
    });
  }, [boundaryCoords, isBoundaryEditMode, selectedMilestoneIndex, layers.boundary, readOnly]);

  // 6. Render radar coverage circles around Cameras / Fire hydrants when requested or selected
  useEffect(() => {
    const group = coverageGroupRef.current;
    if (!group) return;
    group.clearLayers();

    pins.forEach((pin) => {
      const isSelected = selectedPin?.id === pin.id;
      const shouldDraw =
        (showCoverageRadius && (pin.type === "camera" || pin.type === "fire" || pin.type === "light")) ||
        (isSelected && (pin.type === "camera" || pin.type === "fire" || pin.type === "light"));

      if (!shouldDraw) return;

      const radius =
        pin.coverageMeters || PIN_CATEGORY_META[pin.type]?.defaultCoverageMeters || 60;
      const color =
        pin.type === "fire" ? "#be123c" : pin.type === "light" ? "#b45309" : "#047857";

      L.circle([pin.lat, pin.lng], {
        radius,
        color,
        weight: isSelected ? 2 : 1,
        dashArray: "4, 4",
        fillColor: color,
        fillOpacity: isSelected ? 0.16 : 0.08,
        interactive: false,
      }).addTo(group);
    });
  }, [pins, selectedPin, showCoverageRadius]);

  // 7. Render route polyline when active
  useEffect(() => {
    const group = routeGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;
    group.clearLayers();

    if (!routeTarget) return;

    const midLat = (KP3_CENTER.lat + routeTarget.lat) / 2 + 0.00025;
    const midLng = (KP3_CENTER.lng + routeTarget.lng) / 2 - 0.00015;
    const pts: L.LatLngExpression[] = [
      [KP3_CENTER.lat, KP3_CENTER.lng],
      [midLat, midLng],
      [routeTarget.lat, routeTarget.lng],
    ];

    L.polyline(pts, {
      color: "#059669",
      weight: 4,
      opacity: 0.9,
      dashArray: "8, 6",
    }).addTo(group);

    L.circleMarker([KP3_CENTER.lat, KP3_CENTER.lng], {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#073B72",
      fillOpacity: 1,
    })
      .bindTooltip("Trụ sở Ban Điều Hành KP3", { direction: "top" })
      .addTo(group);
  }, [routeTarget]);

  // 8. Render pins + spatial clustering for dense layers (households & businesses)
  useEffect(() => {
    const group = pinsGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;
    group.clearLayers();

    const alwaysIndividual: GisPin[] = [];
    const clusterCandidates: GisPin[] = [];

    const useClustering =
      currentZoom < 18 && activeToFilter === null && pins.length > 40;

    pins.forEach((pin) => {
      const isDenseLayer = pin.type === "household" || pin.type === "business";
      const isSelected = selectedPin?.id === pin.id;
      if (isSelected || !isDenseLayer || !useClustering) {
        alwaysIndividual.push(pin);
      } else {
        clusterCandidates.push(pin);
      }
    });

    const mapSize = map.getSize();
    const isInsideViewportBox = (lat: number, lng: number, halfW: number, halfH: number) => {
      if (!mapSize || mapSize.x === 0 || mapSize.y === 0) return true;
      const pt = map.latLngToContainerPoint([lat, lng]);
      return (
        pt.x >= halfW &&
        pt.x <= mapSize.x - halfW &&
        pt.y >= halfH &&
        pt.y <= mapSize.y - halfH
      );
    };

    // Cluster dense markers in spatial grid cells proportional to zoom level
    if (clusterCandidates.length > 0) {
      const cellSize = currentZoom <= 15 ? 0.0014 : currentZoom <= 16 ? 0.00095 : 0.00055;
      const buckets = new Map<string, GisPin[]>();

      clusterCandidates.forEach((pin) => {
        const keyLat = Math.floor(pin.lat / cellSize);
        const keyLng = Math.floor(pin.lng / cellSize);
        const key = `${pin.type}:${keyLat}:${keyLng}`;
        const list = buckets.get(key) || [];
        list.push(pin);
        buckets.set(key, list);
      });

      buckets.forEach((bucketPins) => {
        if (bucketPins.length === 1) {
          alwaysIndividual.push(bucketPins[0]);
          return;
        }

        const avgLat =
          bucketPins.reduce((s, p) => s + p.lat, 0) / bucketPins.length;
        const avgLng =
          bucketPins.reduce((s, p) => s + p.lng, 0) / bucketPins.length;
        const sampleType = bucketPins[0].type;
        const meta = PIN_CATEGORY_META[sampleType];

        const countVal = bucketPins.length;
        const badgeWidth = countVal >= 100 ? 86 : countVal >= 10 ? 70 : 58;
        if (!isInsideViewportBox(avgLat, avgLng, badgeWidth / 2 + 2, 19)) {
          return;
        }

        const clusterIcon = L.divIcon({
          className: "kp3-cluster-badge",
          html: `<div style="width:${badgeWidth}px;height:34px;padding:0 8px;box-sizing:border-box;white-space:nowrap;border-radius:9999px;background:${
            meta.markerBg
          };color:#ffffff;border:2px solid #ffffff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 2px 6px rgba(15,23,42,0.28);cursor:pointer;">
            <span>${countVal}</span>
            <span style="font-weight:500;">${sampleType === "household" ? "hộ" : "KD"}</span>
          </div>`,
          iconSize: [badgeWidth, 34],
          iconAnchor: [badgeWidth / 2, 17],
        });

        const marker = L.marker([avgLat, avgLng], {
          icon: clusterIcon,
          zIndexOffset: 250,
          title: `Cụm ${bucketPins.length} ${meta.shortLabel} — Nhấp để phóng to`,
        });

        marker.on("click", () => {
          map.setView([avgLat, avgLng], Math.min(18, map.getZoom() + 2), {
            animate: true,
          });
        });

        marker.bindTooltip(
          `<div class="text-xs font-sans font-semibold text-slate-900">Cụm ${bucketPins.length} ${escapeHtml(
            meta.shortLabel
          )} — Nhấp để phóng to</div>`,
          { direction: "auto" }
        );

        marker.addTo(group);
      });
    }

    // Individual high-contrast pins
    alwaysIndividual.forEach((pin) => {
      const isSelected = selectedPin?.id === pin.id;
      const badgeSize = isSelected ? 40 : 34;
      if (!isSelected && !isInsideViewportBox(pin.lat, pin.lng, badgeSize / 2 + 2, badgeSize / 2 + 2)) {
        return;
      }

      const meta = PIN_CATEGORY_META[pin.type] || PIN_CATEGORY_META.custom;
      const svgPath = getPinSvgPath(pin.type);

      const iconHtml = `
        <div style="width:${badgeSize}px;height:${badgeSize}px;border-radius:12px;background:${
        meta.markerBg
      };color:#ffffff;border:2.5px solid ${
        isSelected ? "#0f172a" : "#ffffff"
      };display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(15,23,42,0.3);cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            ${svgPath}
          </svg>
        </div>
      `;

      const pinIcon = L.divIcon({
        className: "kp3-entity-pin",
        html: iconHtml,
        iconSize: [badgeSize, badgeSize],
        iconAnchor: [badgeSize / 2, badgeSize / 2],
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon,
        zIndexOffset: isSelected ? 1100 : pin.type === "report" || pin.type === "civic" ? 650 : 320,
        title: pin.name,
      });

      marker.on("click", (ev) => {
        if (isPickLocationRef.current) return;
        L.DomEvent.stopPropagation(ev);
        selectPinRef.current(pin);
        if (pin.type === "camera" && pin.status === "Hoạt động" && liveStreamRef.current) {
          // Expose quick inspection; drawer also lets user launch stream
        }
      });

      const toTag = pin.toNumber ? ` · Tổ ${pin.toNumber}` : "";
      marker.bindTooltip(
        `<div class="text-xs font-sans">
          <div class="font-bold text-slate-900">${escapeHtml(pin.name)}</div>
          <div class="text-slate-600 mt-0.5">${escapeHtml(meta.shortLabel)}${escapeHtml(toTag)} · ${escapeHtml(
          pin.status
        )}</div>
        </div>`,
        { direction: "auto", offset: [0, -14] }
      );

      marker.addTo(group);
    });
  }, [pins, selectedPin, currentZoom, activeToFilter, mapMoveSeq]);

  // 9. Render coordinate picker preview marker when choosing on map
  useEffect(() => {
    const group = pickerLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!pickedCoord) return;

    const targetIcon = L.divIcon({
      className: "kp3-picker-pin",
      html: `<div style="width:36px;height:36px;border-radius:9999px;background:#073B72;color:#ffffff;border:3px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(7,59,114,0.45);cursor:grab;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([pickedCoord.lat, pickedCoord.lng], {
      icon: targetIcon,
      draggable: true,
      zIndexOffset: 1400,
    });

    marker.on("dragend", (e) => {
      const ll = (e.target as L.Marker).getLatLng();
      const lat = Number(ll.lat.toFixed(6));
      const lng = Number(ll.lng.toFixed(6));
      const z = detectToDanPhoFromCoord(lat, lng);
      pickLocationRef.current?.({
        lat,
        lng,
        detectedTo: z ? z.toNumber : null,
      });
    });

    marker.bindTooltip(
      `<div class="text-xs font-sans font-bold text-slate-900">Điểm đã chấm (${formatLatLngVN(
        pickedCoord.lat,
        pickedCoord.lng
      )}) — Kéo để tinh chỉnh</div>`,
      { permanent: true, direction: "top", offset: [0, -18] }
    );

    marker.addTo(group);
  }, [pickedCoord]);

  // 10. Pan when focusZoomCoord triggers or selectedPin changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPin) return;
    map.panTo([selectedPin.lat, selectedPin.lng], { animate: true });
  }, [selectedPin]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusZoomCoord) return;
    map.setView(
      [focusZoomCoord.lat, focusZoomCoord.lng],
      focusZoomCoord.zoom || 17,
      { animate: true }
    );
  }, [focusZoomCoord]);

  const handleFitKp3Bounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (boundaryCoords.length >= 3) {
      const bounds = L.latLngBounds(
        boundaryCoords.map((c) => [c.lat, c.lng] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [54, 48], maxZoom: 16, animate: true });
    } else {
      map.setView([KP3_CENTER.lat, KP3_CENTER.lng], 16, { animate: true });
    }
  };

  return (
    <div className="relative isolate z-0 w-full h-full min-w-0 overflow-hidden bg-slate-100">
      <div
        ref={mapContainerRef}
        className={`w-full h-full z-0 ${
          isPickLocationMode || isBoundaryEditMode
            ? "cursor-crosshair"
            : "cursor-grab active:cursor-grabbing"
        }`}
      />

      {/* Pick location live guide banner (1-tap map coordinate selection) */}
      {isPickLocationMode && (
        <div className="absolute top-3 left-3 right-3 z-[410] flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 text-white px-3.5 py-2.5 shadow-lg border border-slate-700">
          <div className="flex items-center gap-2 text-xs font-medium min-w-0">
            <Crosshair size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="text-pretty">
              Chạm vào bất kỳ điểm nào trên bản đồ để lấy tọa độ tự động nhận diện Tổ DP
            </span>
          </div>
          {onCancelPickLocation && (
            <button
              type="button"
              onClick={onCancelPickLocation}
              className="min-h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            >
              <X size={14} aria-hidden="true" />
              <span>Hủy chọn</span>
            </button>
          )}
        </div>
      )}

      {/* Top-right Map Toolbar (strictly constrained inside container so it never clips) */}
      {!isPickLocationMode && (
        <div className="pointer-events-none absolute top-3 inset-x-3 z-[400] flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1 rounded-xl bg-white/95 border border-slate-300/80 p-1 shadow-md max-w-full">
            {(
              [
                { id: "streets", label: "Đường phố" },
                { id: "satellite", label: "Vệ tinh" },
                { id: "light", label: "Sáng dịu" },
              ] as const
            ).map((tile) => {
              const active = mapStyle === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setMapStyle(tile.id)}
                  className={`min-h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-[#073B72] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {tile.label}
                </button>
              );
            })}
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 max-w-full">
            <button
              type="button"
              onClick={() => setShowTdpZones((v) => !v)}
              className={`min-h-8 px-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                showTdpZones
                  ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                  : "bg-white text-slate-900 border-slate-300 hover:bg-emerald-50"
              }`}
            >
              <Layers size={14} aria-hidden="true" />
              <span>14 Tổ</span>
            </button>

            {onToggleCoverageRadius && (
              <button
                type="button"
                onClick={onToggleCoverageRadius}
                className={`min-h-8 px-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  showCoverageRadius
                    ? "bg-[#073B72] text-white border-[#073B72] hover:bg-[#06305d]"
                    : "bg-white text-slate-900 border-slate-300 hover:bg-emerald-50"
                }`}
              >
                <Radar size={14} aria-hidden="true" />
                <span>Vùng phủ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFitKp3Bounds}
              className="min-h-8 px-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-white border border-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Compass size={14} aria-hidden="true" />
              <span>Toàn cảnh</span>
            </button>
          </div>
        </div>
      )}

      {/* Compact Bottom-Left Map Status & Zoom Bar (never overflows 375px or 768px) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto inline-flex flex-wrap items-center gap-2 rounded-xl bg-slate-900/95 text-white border border-slate-700 px-3 py-1.5 text-xs max-w-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold hidden sm:inline">Leaflet WGS-84</span>
          <span className="text-slate-200 font-mono">
            Zoom {String(Math.round(currentZoom * 10) / 10).replace(".", ",")}×
          </span>
          {activeToFilter !== null && (
            <button
              type="button"
              onClick={() => onSelectToFilter?.(null)}
              className="min-h-8 px-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer transition-colors"
            >
              Tổ {activeToFilter} ×
            </button>
          )}
          <button
            type="button"
            onClick={handleFitKp3Bounds}
            className="min-h-8 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer transition-colors"
          >
            Căn giữa
          </button>
        </div>

        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-xl bg-white/95 border border-slate-300 p-1">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            aria-label="Phóng to bản đồ"
            className="min-h-8 min-w-8 rounded-lg text-slate-900 hover:bg-slate-200 font-bold text-sm flex items-center justify-center cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            aria-label="Thu nhỏ bản đồ"
            className="min-h-8 min-w-8 rounded-lg text-slate-900 hover:bg-slate-200 font-bold text-sm flex items-center justify-center cursor-pointer"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
