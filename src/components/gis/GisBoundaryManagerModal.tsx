import React, { useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Layers,
  Check,
  Copy,
  Palette,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  FileText,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import {
  decimalToDMS,
  parseCoordinates,
  calculatePolygonAreaMeters,
  calculatePolygonPerimeterMeters,
  calculateDistanceMeters,
  formatArea,
  formatDistance,
  isPointInPolygon,
} from "../../utils/gisUtils";
import { formatVNNumber } from "../../utils/numberFormat";

export interface BoundaryStyle {
  strokeColor: string;
  strokeWeight: number;
  fillColor: string;
  fillOpacity: number;
}

export interface BoundaryPreset {
  id: string;
  name: string;
  description: string;
  coords: { lat: number; lng: number }[];
  color: string;
}

export const DEFAULT_KP3_BOUNDARY = [
  { lat: 10.9405, lng: 106.7425 }, // Mốc 1: Cửa ngõ Tây Bắc (ĐT.743A / ĐT.743B)
  { lat: 10.9395, lng: 106.7440 }, // Mốc 2: Điểm rẽ trục đường chính
  { lat: 10.9378, lng: 106.7435 }, // Mốc 3: Đoạn gấp khúc nội khu
  { lat: 10.9388, lng: 106.7450 }, // Mốc 4: Hướng vào hẻm trung tâm
  { lat: 10.9395, lng: 106.7465 }, // Mốc 5: Phía Đông Bắc
  { lat: 10.9385, lng: 106.7485 }, // Mốc 6: Điểm cực Đông ranh giới
  { lat: 10.9355, lng: 106.7478 }, // Mốc 7: Ranh giới Đông Nam (giáp Dĩ An)
  { lat: 10.9345, lng: 106.7455 }, // Mốc 8: Góc Nam khu vực dân cư
  { lat: 10.9352, lng: 106.7445 }, // Mốc 9: Giao cắt trục đường nội khu
  { lat: 10.9335, lng: 106.7440 }, // Mốc 10: Điểm cực Nam
  { lat: 10.9332, lng: 106.7425 }, // Mốc 11: Góc Tây Nam địa bàn
  { lat: 10.9405, lng: 106.7425 }, // Mốc 12: Khép góc về Mốc 1
];

export const BOUNDARY_PRESETS: BoundaryPreset[] = [
  {
    id: "kp3_full",
    name: "Toàn bộ Khu phố 3 (Ranh giới chuẩn 51,26 ha)",
    description: "Đường biên đầy đủ 12 mốc giới bao quanh toàn địa bàn Khu phố 3, Phường An Phú.",
    color: "#047857",
    coords: DEFAULT_KP3_BOUNDARY,
  },
  {
    id: "subzone_north",
    name: "Cụm Bắc: Trục ĐT.743A & Cửa ngõ Bắc",
    description: "Khu vực giáp hành lang ĐT.743A/ĐT.743B, cụm dân cư và cơ sở thương mại phía Bắc.",
    color: "#1d4ed8",
    coords: [
      { lat: 10.9405, lng: 106.7425 },
      { lat: 10.9395, lng: 106.7440 },
      { lat: 10.9395, lng: 106.7465 },
      { lat: 10.9385, lng: 106.7485 },
      { lat: 10.9372, lng: 106.7475 },
      { lat: 10.9375, lng: 106.7435 },
      { lat: 10.9405, lng: 106.7425 },
    ],
  },
  {
    id: "subzone_center",
    name: "Cụm Trung tâm: Văn phòng KP3 & Các tuyến hẻm (Phân khu 6 – 10)",
    description: "Khu vực trung tâm hành chính Văn phòng Khu phố 3 và các cụm sinh hoạt cộng đồng.",
    color: "#6d28d9",
    coords: [
      { lat: 10.9380, lng: 106.7432 },
      { lat: 10.9380, lng: 106.7468 },
      { lat: 10.9360, lng: 106.7470 },
      { lat: 10.9355, lng: 106.7442 },
      { lat: 10.9368, lng: 106.7430 },
      { lat: 10.9380, lng: 106.7432 },
    ],
  },
  {
    id: "subzone_south",
    name: "Cụm Nam: Khu nhà trọ & Giáp ranh Dĩ An (Phân khu 11 – 14)",
    description: "Khu vực nhà trọ công nhân, cơ sở sản xuất vừa và nhỏ và ranh giới giáp TP. Dĩ An.",
    color: "#b45309",
    coords: [
      { lat: 10.9360, lng: 106.7435 },
      { lat: 10.9360, lng: 106.7475 },
      { lat: 10.9345, lng: 106.7455 },
      { lat: 10.9335, lng: 106.7440 },
      { lat: 10.9332, lng: 106.7425 },
      { lat: 10.9360, lng: 106.7435 },
    ],
  },
];

const BOUNDARY_COLOR_OPTIONS = [
  { label: "Xanh Lục chuẩn", hex: "#047857" },
  { label: "Xanh Dương", hex: "#1d4ed8" },
  { label: "Đỏ Cảnh báo", hex: "#b91c1c" },
  { label: "Cam Hổ phách", hex: "#b45309" },
  { label: "Tím Đô thị", hex: "#6d28d9" },
  { label: "Xanh Thép", hex: "#0369a1" },
];

interface GisBoundaryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  coords: { lat: number; lng: number }[];
  style: BoundaryStyle;
  onSave: (newCoords: { lat: number; lng: number }[], newStyle: BoundaryStyle) => void;
  householdsCount?: number;
  businessesCount?: number;
  householdsList?: { coordinates?: string }[];
  businessesList?: { coordinates?: string }[];
}

export default function GisBoundaryManagerModal({
  isOpen,
  onClose,
  coords: initialCoords,
  style: initialStyle,
  onSave,
  householdsList = [],
  businessesList = [],
}: GisBoundaryManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"vertices" | "presets" | "style" | "geojson">("vertices");
  const [workingCoords, setWorkingCoords] = useState<{ lat: number; lng: number }[]>([...initialCoords]);
  const [workingStyle, setWorkingStyle] = useState<BoundaryStyle>({ ...initialStyle });

  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newDms, setNewDms] = useState("");
  const [vertexError, setVertexError] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

  const [geoJsonText, setGeoJsonText] = useState("");
  const [copiedGeoJson, setCopiedGeoJson] = useState(false);
  const [importError, setImportError] = useState("");
  const [confirmResetDefault, setConfirmResetDefault] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWorkingCoords([...initialCoords]);
      setWorkingStyle({ ...initialStyle });
      setVertexError("");
      setImportError("");
      setActionFeedback(null);
      setConfirmResetDefault(false);
      setEditingIndex(null);
    }
  }, [isOpen, initialCoords, initialStyle]);

  const calculatedArea = calculatePolygonAreaMeters(workingCoords);
  const calculatedPerimeter = calculatePolygonPerimeterMeters(workingCoords);

  const insideHouseholds = householdsList.filter((h) => {
    const pt = parseCoordinates(h.coordinates);
    return pt ? isPointInPolygon(pt, workingCoords) : false;
  }).length;

  const insideBusinesses = businessesList.filter((b) => {
    const pt = parseCoordinates(b.coordinates);
    return pt ? isPointInPolygon(pt, workingCoords) : false;
  }).length;

  const handleAddVertex = () => {
    setVertexError("");
    setActionFeedback(null);
    let parsed: { lat: number; lng: number } | null = null;

    if (newDms.trim()) {
      parsed = parseCoordinates(newDms.trim());
    } else if (newLat.trim() && newLng.trim()) {
      const lat = parseFloat(newLat);
      const lng = parseFloat(newLng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        parsed = { lat, lng };
      }
    }

    if (!parsed) {
      setVertexError("Tọa độ không hợp lệ. Vui lòng nhập số thập phân hoặc định dạng DMS.");
      return;
    }

    setWorkingCoords((prev) => [...prev, parsed as { lat: number; lng: number }]);
    setNewLat("");
    setNewLng("");
    setNewDms("");
    setActionFeedback({ tone: "success", text: `Đã thêm mốc giới thứ ${workingCoords.length + 1}.` });
  };

  const handleRemoveVertex = (index: number) => {
    setActionFeedback(null);
    if (workingCoords.length <= 3) {
      setActionFeedback({
        tone: "error",
        text: "Đa giác ranh giới cần tối thiểu 3 điểm mốc để tạo thành khu vực khép kín.",
      });
      return;
    }
    setWorkingCoords((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleMoveVertex = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= workingCoords.length) return;
    setWorkingCoords((prev) => {
      const clone = [...prev];
      const temp = clone[index];
      clone[index] = clone[newIdx];
      clone[newIdx] = temp;
      return clone;
    });
  };

  const handleStartEdit = (index: number) => {
    setVertexError("");
    setEditingIndex(index);
    setEditLat(workingCoords[index].lat.toString());
    setEditLng(workingCoords[index].lng.toString());
  };

  const handleSaveEdit = (index: number) => {
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setVertexError("Tọa độ đang sửa phải là số thập phân hợp lệ.");
      return;
    }
    setVertexError("");
    setWorkingCoords((prev) => {
      const clone = [...prev];
      clone[index] = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      return clone;
    });
    setEditingIndex(null);
  };

  const handleApplyPreset = (preset: BoundaryPreset) => {
    setWorkingCoords([...preset.coords]);
    setWorkingStyle((prev) => ({
      ...prev,
      strokeColor: preset.color,
      fillColor: preset.color,
    }));
    setActionFeedback({
      tone: "success",
      text: `Đã nạp mẫu "${preset.name}" (${preset.coords.length} mốc giới).`,
    });
  };

  const handleConfirmResetDefault = () => {
    setWorkingCoords([...DEFAULT_KP3_BOUNDARY]);
    setWorkingStyle({
      strokeColor: "#047857",
      strokeWeight: 3,
      fillColor: "#047857",
      fillOpacity: 0.15,
    });
    setConfirmResetDefault(false);
    setActionFeedback({
      tone: "success",
      text: "Đã khôi phục ranh giới chuẩn 12 mốc của Khu phố 3 (51,26 ha).",
    });
  };

  const generateGeoJson = () => {
    const coordinates = workingCoords.map((p) => [p.lng, p.lat]);
    if (
      coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])
    ) {
      coordinates.push([...coordinates[0]]);
    }

    const geoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "Ranh giới địa bàn Khu phố 3",
            ward: "Phường An Phú",
            city: "TP. Hồ Chí Minh",
            areaMeters: calculatedArea,
            perimeterMeters: calculatedPerimeter,
            verticesCount: workingCoords.length,
            updatedAt: new Date().toISOString(),
          },
          geometry: {
            type: "Polygon",
            coordinates: [coordinates],
          },
        },
      ],
    };
    return JSON.stringify(geoJson, null, 2);
  };

  const handleDownloadGeoJson = () => {
    const content = generateGeoJson();
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ranh_gioi_Khu_pho_3_${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportGeoJson = () => {
    setImportError("");
    setActionFeedback(null);
    try {
      const parsed = JSON.parse(geoJsonText);
      let ring: unknown[] | null = null;

      if (parsed.type === "FeatureCollection" && parsed.features?.[0]?.geometry?.coordinates?.[0]) {
        ring = parsed.features[0].geometry.coordinates[0];
      } else if (parsed.type === "Feature" && parsed.geometry?.coordinates?.[0]) {
        ring = parsed.geometry.coordinates[0];
      } else if (parsed.type === "Polygon" && parsed.coordinates?.[0]) {
        ring = parsed.coordinates[0];
      } else if (Array.isArray(parsed) && parsed.length >= 3) {
        ring = parsed;
      }

      if (!ring || ring.length < 3) {
        setImportError("Tệp GeoJSON không đúng cấu trúc Polygon hoặc có ít hơn 3 đỉnh.");
        return;
      }

      const newPoints = ring
        .map((pt) => {
          if (Array.isArray(pt) && pt.length >= 2) {
            return { lat: Number(pt[1]), lng: Number(pt[0]) };
          }
          if (pt && typeof pt === "object" && "lat" in pt && "lng" in pt) {
            const coord = pt as { lat: unknown; lng: unknown };
            return { lat: Number(coord.lat), lng: Number(coord.lng) };
          }
          return null;
        })
        .filter((p): p is { lat: number; lng: number } => Boolean(p && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)));

      if (newPoints.length < 3) {
        setImportError("Không thể trích xuất các điểm tọa độ hợp lệ từ GeoJSON.");
        return;
      }

      setWorkingCoords(newPoints);
      setActiveTab("vertices");
      setActionFeedback({
        tone: "success",
        text: `Đã nạp thành công ${formatVNNumber(newPoints.length)} điểm mốc ranh giới từ GeoJSON.`,
      });
    } catch {
      setImportError("Cú pháp JSON không hợp lệ. Vui lòng kiểm tra lại định dạng chuỗi dán vào.");
    }
  };

  const handleCopyGeoJson = () => {
    const text = generateGeoJson();
    navigator.clipboard.writeText(text);
    setCopiedGeoJson(true);
    setTimeout(() => setCopiedGeoJson(false), 2000);
  };

  const handleFinalSave = () => {
    if (workingCoords.length < 3) {
      setActionFeedback({
        tone: "error",
        text: "Đa giác ranh giới cần tối thiểu 3 điểm mốc để lưu.",
      });
      return;
    }
    onSave(workingCoords, workingStyle);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Điều chỉnh & Khoanh vùng Địa bàn Khu phố 3"
      description="Quản trị mốc giới hành chính, tự động tính toán diện tích, chu vi và đối tượng dân cư trong ranh giới GIS"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            {confirmResetDefault ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1">
                <span className="text-xs font-semibold text-amber-900">Khôi phục 12 mốc gốc KP3?</span>
                <button
                  type="button"
                  onClick={handleConfirmResetDefault}
                  className="min-h-8 px-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetDefault(false)}
                  className="min-h-8 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetDefault(true)}
                className="min-h-9 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} className="text-slate-600" /> Khôi phục KP3 gốc
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              className="min-h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} /> Lưu ranh giới ({formatVNNumber(workingCoords.length)} mốc)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Metrics summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 font-medium block">Số mốc ranh giới</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {formatVNNumber(workingCoords.length)} điểm đỉnh
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 font-medium block">Diện tích địa bàn</span>
            <span className="text-sm font-bold text-emerald-800 mt-0.5 block">{formatArea(calculatedArea)}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 font-medium block">Chu vi đường biên</span>
            <span className="text-sm font-bold text-blue-800 mt-0.5 block">{formatDistance(calculatedPerimeter)}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 font-medium block">Đối tượng trong vùng</span>
            <span className="text-sm font-bold text-indigo-800 mt-0.5 block">
              {formatVNNumber(insideHouseholds)} hộ · {formatVNNumber(insideBusinesses)} cơ sở KD
            </span>
          </div>
        </div>

        {/* Inline action feedback */}
        {actionFeedback && (
          <div
            role="status"
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              actionFeedback.tone === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {actionFeedback.tone === "success" ? (
              <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-rose-700 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Công cụ quản lý ranh giới GIS"
          className="flex border-b border-slate-200 gap-1 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "vertices"}
            onClick={() => setActiveTab("vertices")}
            className={`min-h-9 py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-bold text-xs ${
              activeTab === "vertices"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={14} /> Mốc giới ({formatVNNumber(workingCoords.length)})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "presets"}
            onClick={() => setActiveTab("presets")}
            className={`min-h-9 py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-bold text-xs ${
              activeTab === "presets"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={14} /> Mẫu phân vùng KP3
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "style"}
            onClick={() => setActiveTab("style")}
            className={`min-h-9 py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-bold text-xs ${
              activeTab === "style"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette size={14} /> Màu sắc & Đường biên
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "geojson"}
            onClick={() => {
              setActiveTab("geojson");
              setGeoJsonText(generateGeoJson());
            }}
            className={`min-h-9 py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-bold text-xs ${
              activeTab === "geojson"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={14} /> Xuất / Nhập GeoJSON
          </button>
        </div>

        {/* Tab 1: Vertices */}
        {activeTab === "vertices" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <Plus size={14} /> Thêm mốc giới mới vào đường biên
                </span>
                <span className="text-xs font-semibold text-emerald-800">
                  Mốc thứ {formatVNNumber(workingCoords.length + 1)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Vĩ độ Lat (Thập phân)
                  </label>
                  <input
                    type="text"
                    placeholder="10.938500"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full min-h-9 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kinh độ Lng (Thập phân)
                  </label>
                  <input
                    type="text"
                    placeholder="106.745200"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full min-h-9 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Hoặc nhập định dạng DMS
                  </label>
                  <input
                    type="text"
                    placeholder={`10°56'18.6"N 106°44'42.7"E`}
                    value={newDms}
                    onChange={(e) => setNewDms(e.target.value)}
                    className="w-full min-h-9 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {vertexError && (
                <p className="text-rose-700 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={13} /> {vertexError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddVertex}
                  className="min-h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Thêm vào danh sách mốc
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2 font-bold text-slate-800 text-xs">
                <span>Danh sách {formatVNNumber(workingCoords.length)} điểm mốc ranh giới</span>
                <button
                  type="button"
                  onClick={() => setWorkingCoords((prev) => [...prev].reverse())}
                  className="min-h-8 px-2 text-slate-700 hover:text-emerald-800 cursor-pointer text-xs font-semibold hover:underline"
                >
                  Đảo chiều vòng quanh
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 evon-scroll">
                {workingCoords.map((pt, idx) => {
                  const isEditing = editingIndex === idx;
                  const nextPt = workingCoords[(idx + 1) % workingCoords.length];
                  const legDist = calculateDistanceMeters(pt.lat, pt.lng, nextPt.lat, nextPt.lng);

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 flex items-center justify-between gap-2 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-900 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-emerald-300">
                          {idx + 1}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={editLat}
                              onChange={(e) => setEditLat(e.target.value)}
                              className="w-28 min-h-8 px-2 border border-slate-300 rounded font-mono text-xs text-slate-900 placeholder:text-slate-500"
                              placeholder="Lat"
                            />
                            <input
                              type="text"
                              value={editLng}
                              onChange={(e) => setEditLng(e.target.value)}
                              className="w-28 min-h-8 px-2 border border-slate-300 rounded font-mono text-xs text-slate-900 placeholder:text-slate-500"
                              placeholder="Lng"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(idx)}
                              className="min-h-8 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="min-h-8 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="font-mono text-slate-900 font-bold text-xs truncate">
                              [{pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}]
                            </div>
                            <div className="text-xs text-slate-600 font-mono truncate">
                              DMS: {decimalToDMS(pt.lat, pt.lng)} · Đoạn nối tiếp: {formatVNNumber(legDist)} m
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveVertex(idx, "up")}
                          disabled={idx === 0}
                          aria-label={`Di chuyển mốc ${idx + 1} lên`}
                          title="Di chuyển lên"
                          className={`min-h-8 min-w-8 flex items-center justify-center rounded-lg text-slate-600 ${
                            idx === 0 ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveVertex(idx, "down")}
                          disabled={idx === workingCoords.length - 1}
                          aria-label={`Di chuyển mốc ${idx + 1} xuống`}
                          title="Di chuyển xuống"
                          className={`min-h-8 min-w-8 flex items-center justify-center rounded-lg text-slate-600 ${
                            idx === workingCoords.length - 1
                              ? "opacity-35 cursor-not-allowed"
                              : "cursor-pointer hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx)}
                          aria-label={`Sửa tọa độ mốc ${idx + 1}`}
                          title="Sửa tọa độ mốc này"
                          className="min-h-8 min-w-8 flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50 cursor-pointer"
                        >
                          <Sliders size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVertex(idx)}
                          aria-label={`Xóa mốc ${idx + 1}`}
                          title="Xóa mốc này"
                          className="min-h-8 min-w-8 flex items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Presets */}
        {activeTab === "presets" && (
          <div className="space-y-3">
            <p className="text-slate-700 leading-relaxed text-xs">
              Chọn mẫu khoanh vùng chuẩn cho toàn địa bàn hoặc từng cụm địa bàn thuộc Khu phố 3, Phường An Phú:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {BOUNDARY_PRESETS.map((preset) => {
                const pArea = calculatePolygonAreaMeters(preset.coords);
                const pPerimeter = calculatePolygonPerimeterMeters(preset.coords);

                return (
                  <div
                    key={preset.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 transition-colors space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.color }} />
                        <span className="text-xs font-mono text-slate-600 font-bold">
                          {formatVNNumber(preset.coords.length)} mốc giới
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">{preset.name}</h4>
                      <p className="text-xs text-slate-600 leading-snug">{preset.description}</p>
                      <div className="text-xs font-mono text-emerald-900 pt-1">
                        Diện tích: <b>{formatArea(pArea)}</b> · Chu vi: {formatDistance(pPerimeter)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full min-h-9 py-1.5 px-3 bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                    >
                      Áp dụng mẫu khoanh vùng này
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-amber-950">
              <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Khi chọn mẫu khoanh vùng, danh sách mốc giới đang chỉnh sẽ được cập nhật theo tọa độ chuẩn của phân khu. Bạn có thể tinh chỉnh từng mốc ngay sau đó.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Styling */}
        {activeTab === "style" && (
          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="font-bold text-slate-800 block text-xs">
                Màu sắc đường viền ranh giới (Stroke Color)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {BOUNDARY_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setWorkingStyle({ ...workingStyle, strokeColor: c.hex, fillColor: c.hex })}
                    className={`min-h-9 px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                      workingStyle.strokeColor === c.hex
                        ? "border-emerald-700 ring-2 ring-emerald-600 font-bold bg-emerald-50 text-emerald-950"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-xs">
                Độ dày đường viền ranh giới: {workingStyle.strokeWeight}px
              </label>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={workingStyle.strokeWeight}
                onChange={(e) => setWorkingStyle({ ...workingStyle, strokeWeight: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-600 font-mono">
                <span>1px (Mảnh)</span>
                <span>3px (Chuẩn)</span>
                <span>6px (Đậm rõ)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-xs">
                Độ mờ màu nền khoanh vùng: {Math.round(workingStyle.fillOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={workingStyle.fillOpacity}
                onChange={(e) => setWorkingStyle({ ...workingStyle, fillOpacity: parseFloat(e.target.value) })}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-600 font-mono">
                <span>0% (Chỉ viền)</span>
                <span>15% (Mặc định)</span>
                <span>50% (Phủ đậm)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-1.5">
              <span className="text-xs text-slate-300 font-bold block">
                Xem trước màu phủ trên nền vệ tinh
              </span>
              <div
                className="h-14 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                style={{
                  border: `${workingStyle.strokeWeight}px solid ${workingStyle.strokeColor}`,
                  backgroundColor: `${workingStyle.fillColor}${Math.round(workingStyle.fillOpacity * 255)
                    .toString(16)
                    .padStart(2, "0")}`,
                }}
              >
                Ranh giới Khu phố 3 ({formatVNNumber(workingCoords.length)} mốc giới)
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: GeoJSON */}
        {activeTab === "geojson" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-xs">
                Dữ liệu Ranh giới chuẩn OGC GeoJSON (Polygon)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyGeoJson}
                  className="min-h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedGeoJson ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                  {copiedGeoJson ? "Đã sao chép" : "Sao chép GeoJSON"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadGeoJson}
                  className="min-h-8 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={13} /> Tải file .geojson
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              value={geoJsonText}
              onChange={(e) => setGeoJsonText(e.target.value)}
              className="w-full p-3 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl border border-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              placeholder="Dán nội dung GeoJSON FeatureCollection hoặc Polygon vào đây để nạp..."
            />

            {importError && (
              <p className="text-rose-700 text-xs font-bold flex items-center gap-1">
                <AlertCircle size={13} /> {importError}
              </p>
            )}

            <div className="flex justify-between items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-slate-600">
                Hỗ trợ dán dữ liệu trích xuất từ ArcGIS, QGIS hoặc Cổng Quy hoạch để nạp vào GIS KP3.
              </span>
              <button
                type="button"
                onClick={handleImportGeoJson}
                className="min-h-9 px-3.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload size={13} /> Nhập dữ liệu từ JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
