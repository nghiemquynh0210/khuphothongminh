import React, { useState } from "react";
import { 
  X, 
  MapPin, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Download, 
  Upload, 
  Layers, 
  Compass, 
  Check, 
  Copy, 
  Palette, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle,
  Maximize2,
  FileText,
  Sliders,
  CheckCircle2
} from "lucide-react";
import { 
  decimalToDMS, 
  parseCoordinates, 
  calculatePolygonAreaMeters, 
  calculatePolygonPerimeterMeters,
  calculateDistanceMeters,
  formatArea,
  formatDistance,
  isPointInPolygon
} from "../../utils/gisUtils";

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
  { lat: 10.9405, lng: 106.7425 }, // Mốc 1: Cửa ngõ Tây Bắc (ĐT.743B)
  { lat: 10.9395, lng: 106.7440 }, // Mốc 2: Điểm rẽ trục đường chính
  { lat: 10.9378, lng: 106.7435 }, // Mốc 3: Đoạn gấp khúc nội khu
  { lat: 10.9388, lng: 106.7450 }, // Mốc 4: Hướng vào hẻm trung tâm
  { lat: 10.9395, lng: 106.7465 }, // Mốc 5: Phía Đông Bắc
  { lat: 10.9385, lng: 106.7485 }, // Mốc 6: Điểm cực Đông ranh giới
  { lat: 10.9355, lng: 106.7478 }, // Mốc 7: Ranh giới Đông Nam (giáp Dĩ An)
  { lat: 10.9345, lng: 106.7455 }, // Mốc 8: Góc Nam khu vực dân cư
  { lat: 10.9352, lng: 106.7445 }, // Mốc 9: Giao cắt trục PKV AP
  { lat: 10.9335, lng: 106.7440 }, // Mốc 10: Điểm cực Nam
  { lat: 10.9332, lng: 106.7425 }, // Mốc 11: Góc Tây Nam địa bàn
  { lat: 10.9405, lng: 106.7425 }  // Mốc 12: Khép góc về Mốc 1
];

export const BOUNDARY_PRESETS: BoundaryPreset[] = [
  {
    id: "kp3_full",
    name: "Toàn bộ Khu phố 3 (Ranh giới Lịch sử 51,26ha)",
    description: "Đường biên đầy đủ 12 mốc giới bao quanh toàn bộ địa bàn Khu phố 3, Phường An Phú.",
    color: "#10b981",
    coords: DEFAULT_KP3_BOUNDARY
  },
  {
    id: "subzone_north",
    name: "Phân khu 1: Trục ĐT.743B & Cửa ngõ Bắc (Tổ 1 - 2)",
    description: "Khu vực giáp hành lang ĐT.743B, cụm dân cư và cơ sở thương mại cửa ngõ phía Bắc.",
    color: "#3b82f6",
    coords: [
      { lat: 10.9405, lng: 106.7425 },
      { lat: 10.9395, lng: 106.7440 },
      { lat: 10.9395, lng: 106.7465 },
      { lat: 10.9385, lng: 106.7485 },
      { lat: 10.9372, lng: 106.7475 },
      { lat: 10.9375, lng: 106.7435 },
      { lat: 10.9405, lng: 106.7425 }
    ]
  },
  {
    id: "subzone_center",
    name: "Phân khu 2: Hẻm 42 Lương Định Của & Trung tâm (Tổ 3 - 4)",
    description: "Khu vực trung tâm hành chính Văn phòng Khu phố 3, hẻm dân cư 42 và cụm sinh hoạt cộng đồng.",
    color: "#8b5cf6",
    coords: [
      { lat: 10.9380, lng: 106.7432 },
      { lat: 10.9380, lng: 106.7468 },
      { lat: 10.9360, lng: 106.7470 },
      { lat: 10.9355, lng: 106.7442 },
      { lat: 10.9368, lng: 106.7430 },
      { lat: 10.9380, lng: 106.7432 }
    ]
  },
  {
    id: "subzone_south",
    name: "Phân khu 3: Phía Nam & Tuyến PKV AP28/30 (Tổ 5)",
    description: "Khu vực nhà trọ công nhân, cụm tiểu thủ công nghiệp và ranh giới giáp ranh TP. Dĩ An.",
    color: "#f59e0b",
    coords: [
      { lat: 10.9360, lng: 106.7435 },
      { lat: 10.9360, lng: 106.7475 },
      { lat: 10.9345, lng: 106.7455 },
      { lat: 10.9335, lng: 106.7440 },
      { lat: 10.9332, lng: 106.7425 },
      { lat: 10.9360, lng: 106.7435 }
    ]
  }
];

interface GisBoundaryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  coords: { lat: number; lng: number }[];
  style: BoundaryStyle;
  onSave: (newCoords: { lat: number; lng: number }[], newStyle: BoundaryStyle) => void;
  householdsCount?: number;
  businessesCount?: number;
  householdsList?: any[];
  businessesList?: any[];
}

export default function GisBoundaryManagerModal({
  isOpen,
  onClose,
  coords: initialCoords,
  style: initialStyle,
  onSave,
  householdsList = [],
  businessesList = []
}: GisBoundaryManagerModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"vertices" | "presets" | "style" | "geojson">("vertices");
  const [workingCoords, setWorkingCoords] = useState<{ lat: number; lng: number }[]>([...initialCoords]);
  const [workingStyle, setWorkingStyle] = useState<BoundaryStyle>({ ...initialStyle });

  // Add new vertex input states
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newDms, setNewDms] = useState("");
  const [vertexError, setVertexError] = useState("");

  // Edit single vertex states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

  // GeoJSON states
  const [geoJsonText, setGeoJsonText] = useState("");
  const [copiedGeoJson, setCopiedGeoJson] = useState(false);
  const [importError, setImportError] = useState("");

  // Spatial stats calculated dynamically
  const calculatedArea = calculatePolygonAreaMeters(workingCoords);
  const calculatedPerimeter = calculatePolygonPerimeterMeters(workingCoords);

  // Calculate inside stats
  const insideHouseholds = householdsList.filter(h => {
    const pt = parseCoordinates(h.coordinates);
    return pt ? isPointInPolygon(pt, workingCoords) : false;
  }).length;

  const insideBusinesses = businessesList.filter(b => {
    const pt = parseCoordinates(b.coordinates);
    return pt ? isPointInPolygon(pt, workingCoords) : false;
  }).length;

  // Handler to add a vertex
  const handleAddVertex = () => {
    setVertexError("");
    let parsed: { lat: number; lng: number } | null = null;

    if (newDms.trim()) {
      parsed = parseCoordinates(newDms.trim());
    } else if (newLat && newLng) {
      const lat = parseFloat(newLat);
      const lng = parseFloat(newLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        parsed = { lat, lng };
      }
    }

    if (!parsed) {
      setVertexError("Tọa độ không hợp lệ! Vui lòng nhập số thập phân hoặc dạng DMS.");
      return;
    }

    const updated = [...workingCoords, parsed];
    setWorkingCoords(updated);
    setNewLat("");
    setNewLng("");
    setNewDms("");
  };

  // Handler to remove a vertex
  const handleRemoveVertex = (index: number) => {
    if (workingCoords.length <= 3) {
      alert("Đa giác ranh giới cần tối thiểu 3 điểm mốc để tạo thành một khu vực khép kín!");
      return;
    }
    const updated = workingCoords.filter((_, i) => i !== index);
    setWorkingCoords(updated);
  };

  // Move vertex up/down
  const handleMoveVertex = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= workingCoords.length) return;
    const clone = [...workingCoords];
    const temp = clone[index];
    clone[index] = clone[newIdx];
    clone[newIdx] = temp;
    setWorkingCoords(clone);
  };

  // Start editing a vertex
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditLat(workingCoords[index].lat.toString());
    setEditLng(workingCoords[index].lng.toString());
  };

  // Save edited vertex
  const handleSaveEdit = (index: number) => {
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Tọa độ phải là số hợp lệ!");
      return;
    }
    const clone = [...workingCoords];
    clone[index] = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    setWorkingCoords(clone);
    setEditingIndex(null);
  };

  // Apply a preset
  const handleApplyPreset = (preset: BoundaryPreset) => {
    setWorkingCoords([...preset.coords]);
    setWorkingStyle({
      ...workingStyle,
      strokeColor: preset.color,
      fillColor: preset.color
    });
  };

  // Reset to default KP3
  const handleResetDefault = () => {
    if (confirm("Khôi phục lại ranh giới gốc 12 mốc giới của Khu phố 3 (51,26ha)?")) {
      setWorkingCoords([...DEFAULT_KP3_BOUNDARY]);
      setWorkingStyle({
        strokeColor: "#10b981",
        strokeWeight: 3,
        fillColor: "#10b981",
        fillOpacity: 0.15
      });
    }
  };

  // Generate GeoJSON string
  const generateGeoJson = () => {
    const coordinates = workingCoords.map(p => [p.lng, p.lat]);
    // Ensure closed loop
    if (coordinates.length > 0 && 
       (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
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
            city: "TP. Hồ Chí Minh / TP. Thủ Đức",
            areaMeters: calculatedArea,
            perimeterMeters: calculatedPerimeter,
            verticesCount: workingCoords.length,
            updatedAt: new Date().toISOString()
          },
          geometry: {
            type: "Polygon",
            coordinates: [coordinates]
          }
        }
      ]
    };
    return JSON.stringify(geoJson, null, 2);
  };

  // Export GeoJSON as file download
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

  // Import GeoJSON string
  const handleImportGeoJson = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(geoJsonText);
      let ring: number[][] | null = null;

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
        setImportError("Tệp GeoJSON không đúng cấu trúc Polygon hoặc có ít hơn 3 đỉnh!");
        return;
      }

      const newPoints = ring.map(pt => {
        if (Array.isArray(pt) && pt.length >= 2) {
          // GeoJSON is [lng, lat]
          return { lat: Number(pt[1]), lng: Number(pt[0]) };
        } else if (typeof pt === "object" && "lat" in pt && "lng" in pt) {
          return { lat: Number((pt as any).lat), lng: Number((pt as any).lng) };
        }
        return null;
      }).filter(Boolean) as { lat: number; lng: number }[];

      if (newPoints.length < 3) {
        setImportError("Không thể trích xuất các điểm tọa độ hợp lệ từ GeoJSON.");
        return;
      }

      setWorkingCoords(newPoints);
      setActiveTab("vertices");
      alert(`Đã nhập thành công ${newPoints.length} điểm mốc ranh giới từ GeoJSON!`);
    } catch {
      setImportError("Cú pháp JSON không hợp lệ! Vui lòng kiểm tra lại định dạng chuỗi dán vào.");
    }
  };

  // Copy GeoJSON to clipboard
  const handleCopyGeoJson = () => {
    const text = generateGeoJson();
    navigator.clipboard.writeText(text);
    setCopiedGeoJson(true);
    setTimeout(() => setCopiedGeoJson(false), 2000);
  };

  const handleFinalSave = () => {
    if (workingCoords.length < 3) {
      alert("Đa giác ranh giới cần tối thiểu 3 điểm mốc!");
      return;
    }
    onSave(workingCoords, workingStyle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/15 rounded-lg">
                <Compass size={18} className="text-emerald-200" />
              </span>
              <h2 className="text-base sm:text-lg font-bold">
                Tự điều chỉnh & Khoanh vùng Địa bàn Khu phố 3
              </h2>
            </div>
            <p className="text-xs text-emerald-100/80">
              Quản trị mốc giới hành chính, tự động tính toán diện tích, chu vi & liên thông đối tượng dân cư trên GIS
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* METRICS STRIP */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-medium block">Số mốc ranh giới</span>
            <span className="text-sm font-bold text-slate-900">{workingCoords.length} điểm đỉnh</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-medium block">Diện tích địa bàn</span>
            <span className="text-sm font-bold text-emerald-700">{formatArea(calculatedArea)}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-medium block">Chu vi đường biên</span>
            <span className="text-sm font-bold text-blue-700">{formatDistance(calculatedPerimeter)}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-medium block">Đối tượng trong vùng</span>
            <span className="text-sm font-bold text-indigo-700">
              {insideHouseholds} hộ • {insideBusinesses} cơ sở KD
            </span>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("vertices")}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "vertices"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MapPin size={14} /> Danh sách Mốc giới ({workingCoords.length})
          </button>
          <button
            onClick={() => setActiveTab("presets")}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "presets"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={14} /> Mẫu Phân khu & Tổ Dân phố
          </button>
          <button
            onClick={() => setActiveTab("style")}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "style"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Palette size={14} /> Màu sắc & Hiển thị
          </button>
          <button
            onClick={() => {
              setActiveTab("geojson");
              setGeoJsonText(generateGeoJson());
            }}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "geojson"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={14} /> Xuất / Nhập GeoJSON
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs space-y-4">

          {/* TAB 1: VERTICES LIST & COORDINATE EDITING */}
          {activeTab === "vertices" && (
            <div className="space-y-4">
              
              {/* Form thêm mốc mới */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Plus size={14} /> Thêm Mốc Giới Mới vào Ranh Giới:
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Mốc thứ {workingCoords.length + 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      Vĩ độ Lat (Thập phân)
                    </label>
                    <input
                      type="text"
                      placeholder="10.938500"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      Kinh độ Lng (Thập phân)
                    </label>
                    <input
                      type="text"
                      placeholder="106.745200"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      Hoặc Nhập Định dạng DMS
                    </label>
                    <input
                      type="text"
                      placeholder={`10°56'18.6"N 106°44'42.7"E`}
                      value={newDms}
                      onChange={(e) => setNewDms(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {vertexError && (
                  <p className="text-rose-600 text-[11px] font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {vertexError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddVertex}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus size={13} /> Thêm vào danh sách mốc
                  </button>
                </div>
              </div>

              {/* Table of Vertices */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between font-bold text-slate-700 text-[11px]">
                  <span>Danh sách {workingCoords.length} Điểm Mốc Ranh Giới (Khoanh vùng Đa giác)</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Reverse vertex order
                        setWorkingCoords([...workingCoords].reverse());
                      }}
                      className="text-slate-600 hover:text-emerald-700 cursor-pointer text-[10px] font-normal hover:underline"
                      title="Đảo ngược chiều vòng quanh của ranh giới"
                    >
                      Đảo chiều vòng quanh
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {workingCoords.map((pt, idx) => {
                    const isEditing = editingIndex === idx;
                    const nextPt = workingCoords[(idx + 1) % workingCoords.length];
                    const legDist = calculateDistanceMeters(pt.lat, pt.lng, nextPt.lat, nextPt.lng);

                    return (
                      <div 
                        key={idx}
                        className={`p-2.5 flex items-center justify-between gap-2 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        } hover:bg-emerald-50/30`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 border border-emerald-300">
                            {idx + 1}
                          </span>

                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={editLat}
                                onChange={(e) => setEditLat(e.target.value)}
                                className="w-28 p-1 border border-slate-300 rounded font-mono text-xs"
                                placeholder="Lat"
                              />
                              <input
                                type="text"
                                value={editLng}
                                onChange={(e) => setEditLng(e.target.value)}
                                className="w-28 p-1 border border-slate-300 rounded font-mono text-xs"
                                placeholder="Lng"
                              />
                              <button
                                onClick={() => handleSaveEdit(idx)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px]"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <div className="font-mono text-slate-900 font-bold text-xs truncate">
                                [{pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}]
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                DMS: {decimalToDMS(pt.lat, pt.lng)} • Đoạn nối tiếp: {legDist}m
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveVertex(idx, "up")}
                            disabled={idx === 0}
                            className={`p-1 rounded text-slate-500 hover:text-slate-800 ${idx === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:bg-slate-100"}`}
                            title="Di chuyển lên"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveVertex(idx, "down")}
                            disabled={idx === workingCoords.length - 1}
                            className={`p-1 rounded text-slate-500 hover:text-slate-800 ${idx === workingCoords.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:bg-slate-100"}`}
                            title="Di chuyển xuống"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Sửa tọa độ mốc này"
                          >
                            <Sliders size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVertex(idx)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa mốc này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESET ZONES */}
          {activeTab === "presets" && (
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed text-xs">
                Chọn một trong các mẫu khoanh vùng chuẩn đã được cấu hình sẵn cho các phân khu hành chính và tổ dân phố của Khu phố 3, Phường An Phú:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {BOUNDARY_PRESETS.map(preset => {
                  const pArea = calculatePolygonAreaMeters(preset.coords);
                  const pPerimeter = calculatePolygonPerimeterMeters(preset.coords);

                  return (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: preset.color }}
                          />
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            {preset.coords.length} mốc giới
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs">{preset.name}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{preset.description}</p>
                        <div className="text-[10px] font-mono text-emerald-800 pt-1">
                          Diện tích: <b>{formatArea(pArea)}</b> • Chu vi: {formatDistance(pPerimeter)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="w-full py-1.5 px-3 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                      >
                        Áp dụng mẫu khoanh vùng này
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-amber-900 mt-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Lưu ý: Khi chọn một mẫu khoanh vùng, danh sách mốc giới hiện tại sẽ được cập nhật lại theo tọa độ chuẩn của phân khu tương ứng. Bạn vẫn có thể tiếp tục tinh chỉnh từng mốc giới sau đó.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: STYLING */}
          {activeTab === "style" && (
            <div className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  Màu sắc đường viền ranh giới (Stroke Color):
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: "Emerald (Mặc định)", hex: "#10b981" },
                    { label: "Xanh Dương (Navy)", hex: "#2563eb" },
                    { label: "Đỏ Cảnh Báo", hex: "#ef4444" },
                    { label: "Hổ Phách (Amber)", hex: "#f59e0b" },
                    { label: "Tím Đô Thị", hex: "#8b5cf6" },
                    { label: "Cyan Hiện Đại", hex: "#06b6d4" }
                  ].map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setWorkingStyle({ ...workingStyle, strokeColor: c.hex, fillColor: c.hex })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                        workingStyle.strokeColor === c.hex 
                          ? "ring-2 ring-emerald-500 font-bold shadow-xs bg-slate-50" 
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
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
                  onChange={(e) => setWorkingStyle({ ...workingStyle, strokeWeight: parseInt(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1px (Thanh mảnh)</span>
                  <span>3px (Chuẩn)</span>
                  <span>6px (Đậm rõ)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  Độ mờ màu nền khoanh vùng (Fill Opacity): {Math.round(workingStyle.fillOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={workingStyle.fillOpacity}
                  onChange={(e) => setWorkingStyle({ ...workingStyle, fillOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0% (Trong suốt - Chỉ hiện viền)</span>
                  <span>15% (Mặc định vệ tinh)</span>
                  <span>50% (Phủ đậm)</span>
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Xem trước màu phủ trên nền Vệ tinh:</span>
                <div 
                  className="h-14 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{
                    border: `${workingStyle.strokeWeight}px solid ${workingStyle.strokeColor}`,
                    backgroundColor: `${workingStyle.fillColor}${Math.round(workingStyle.fillOpacity * 255).toString(16).padStart(2, "0")}`
                  }}
                >
                  Ranh giới địa bàn Khu phố 3 ({workingCoords.length} mốc giới)
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GEOJSON IMPORT / EXPORT */}
          {activeTab === "geojson" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Dữ liệu Ranh giới chuẩn OGC GeoJSON (Polygon):
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyGeoJson}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedGeoJson ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedGeoJson ? "Đã chép!" : "Sao chép GeoJSON"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadGeoJson}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download size={12} /> Tải file .geojson
                  </button>
                </div>
              </div>

              <textarea
                rows={10}
                value={geoJsonText}
                onChange={(e) => setGeoJsonText(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                placeholder="Dán nội dung GeoJSON FeatureCollection hoặc Polygon vào đây để nạp..."
              />

              {importError && (
                <p className="text-rose-600 text-xs font-bold flex items-center gap-1">
                  <AlertCircle size={13} /> {importError}
                </p>
              )}

              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-slate-500">
                  Có thể dán dữ liệu trích xuất từ ArcGIS, QGIS hoặc cổng Quy hoạch đô thị để nạp vào GIS KP3.
                </span>
                <button
                  type="button"
                  onClick={handleImportGeoJson}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <Upload size={13} /> Nhập dữ liệu từ chuỗi JSON
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className="text-slate-500" /> Khôi phục KP3 gốc
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} /> Lưu Ranh Giới Địa Bàn ({workingCoords.length} mốc)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
