import React, { useMemo, useState } from "react";
import {
  Map as MapIcon,
  MapPin,
  Search,
  ExternalLink,
  Maximize2,
  Compass,
  SlidersHorizontal,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Home,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import {
  KP3_OFFICIAL_MAP_IMAGE_URL,
  KP3_OFFICIAL_MAP_PORTAL_URL,
} from "../../data/gisConfig";
import { GisClusterName, ToStatsSummary } from "./gisTypes";
import { formatVNNumber } from "../../utils/numberFormat";

interface Kp3SchematicViewProps {
  toStats: ToStatsSummary[];
  activeToFilter: number | null;
  onSelectToOnMap: (toNumber: number) => void;
  onResetToFilter: () => void;
  onOpenBoundaryModal?: () => void;
  readOnly?: boolean;
  areaFormatted: string;
  perimeterFormatted: string;
  verticesCount: number;
}

const CLUSTERS: Array<{ id: "ALL" | GisClusterName; label: string }> = [
  { id: "ALL", label: "Tất cả 14 Tổ" },
  { id: "Bắc", label: "Cụm Bắc (Tổ 5, 6, 7, 9, 11, 12)" },
  { id: "Trung tâm", label: "Cụm Trung tâm (Tổ 4, 8, 10, 13)" },
  { id: "Nam", label: "Cụm Nam (Tổ 1, 2, 3, 14)" },
];

function FallbackKp3SvgDiagram() {
  return (
    <svg
      viewBox="0 0 640 400"
      role="img"
      aria-label="Sơ đồ phân vùng 14 Tổ Dân Phố Khu phố 3"
      className="w-full h-full bg-slate-900 rounded-lg select-none"
    >
      <defs>
        <pattern id="kp3-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1e293b" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="640" height="400" fill="url(#kp3-grid)" />

      {/* Main arteries */}
      <path d="M 40 55 L 595 80" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <text x="58" y="42" fill="#e2e8f0" fontSize="12" fontWeight="700">
        TRỤC ĐT.743A / ĐT.743B (CỬA NGÕ BẮC)
      </text>

      <path d="M 110 350 L 580 350" stroke="#64748b" strokeWidth="3" strokeDasharray="6 6" />
      <text x="360" y="375" fill="#cbd5e1" fontSize="12" fontWeight="600">
        GIÁP RANH TP. DĨ AN (PHÍA NAM)
      </text>

      {/* Outer KP3 Boundary Polygon */}
      <polygon
        points="95,85 520,95 570,175 535,310 340,335 120,320 80,200"
        fill="#047857"
        fillOpacity="0.22"
        stroke="#34d399"
        strokeWidth="3"
      />

      {/* Zone cells (North -> Center -> South) */}
      {[
        { x: 115, y: 105, w: 120, h: 52, t: "Tổ 12", sub: "Cổng X3", c: "#047857" },
        { x: 245, y: 105, w: 120, h: 52, t: "Tổ 11", sub: "Lô A6-A10", c: "#0369a1" },
        { x: 375, y: 108, w: 135, h: 50, t: "Tổ 9", sub: "Đông Bắc", c: "#4338ca" },
        { x: 105, y: 165, w: 120, h: 52, t: "Tổ 7", sub: "Lô A12", c: "#0f766e" },
        { x: 235, y: 165, w: 130, h: 52, t: "Tổ 5", sub: "Đường X1", c: "#1d4ed8" },
        { x: 375, y: 165, w: 155, h: 52, t: "Tổ 6", sub: "Đường X2", c: "#b45309" },
        { x: 100, y: 225, w: 110, h: 52, t: "Tổ 10", sub: "X1 Tây", c: "#be123c" },
        { x: 218, y: 225, w: 135, h: 52, t: "Tổ 8 ★", sub: "Trụ sở KP3", c: "#059669" },
        { x: 360, y: 225, w: 110, h: 52, t: "Tổ 4", sub: "N1–N2 Đông", c: "#6d28d9" },
        { x: 478, y: 225, w: 68, h: 52, t: "Tổ 13", sub: "AP12", c: "#0e7490" },
        { x: 125, y: 284, w: 96, h: 42, t: "Tổ 1", sub: "D1", c: "#0284c7" },
        { x: 228, y: 284, w: 96, h: 42, t: "Tổ 2", sub: "D2", c: "#4f46e5" },
        { x: 332, y: 284, w: 98, h: 42, t: "Tổ 3", sub: "N4", c: "#c2410c" },
        { x: 438, y: 284, w: 96, h: 42, t: "Tổ 14", sub: "AP28-30", c: "#7c3aed" },
      ].map((box) => (
        <g key={box.t}>
          <rect
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx="6"
            fill={box.c}
            fillOpacity="0.88"
            stroke="#e2e8f0"
            strokeWidth="1.2"
          />
          <text
            x={box.x + box.w / 2}
            y={box.y + (box.h > 46 ? 24 : 18)}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="700"
          >
            {box.t}
          </text>
          <text
            x={box.x + box.w / 2}
            y={box.y + (box.h > 46 ? 40 : 34)}
            textAnchor="middle"
            fill="#f1f5f9"
            fontSize="12"
          >
            {box.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Kp3SchematicView({
  toStats,
  activeToFilter,
  onSelectToOnMap,
  onResetToFilter,
  onOpenBoundaryModal,
  readOnly = false,
  areaFormatted,
  perimeterFormatted,
  verticesCount,
}: Kp3SchematicViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<"ALL" | GisClusterName>("ALL");
  const [searchTo, setSearchTo] = useState("");
  const [imgError, setImgError] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const filteredZones = useMemo(() => {
    const q = searchTo.trim().toLowerCase();
    return toStats.filter((item) => {
      if (selectedCluster !== "ALL" && item.zone.cluster !== selectedCluster) {
        return false;
      }
      if (!q) return true;
      return (
        item.zone.name.toLowerCase().includes(q) ||
        item.zone.shortLabel.toLowerCase().includes(q) ||
        item.zone.streets.toLowerCase().includes(q) ||
        `cụm ${item.zone.cluster.toLowerCase()}`.includes(q)
      );
    });
  }, [toStats, selectedCluster, searchTo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left 8 cols: Interactive 14 Tổ Dân Phố Schematic Grid */}
      <div className="lg:col-span-8 min-w-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                <MapIcon size={13} className="text-emerald-700" /> Sơ đồ hành chính KP3
              </span>
              <span className="text-xs font-semibold text-slate-600">
                14 Tổ Dân Phố · 3 Cụm địa bàn
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Phân vùng 14 Tổ Dân Phố Khu phố 3, Phường An Phú
            </h2>
          </div>

          {activeToFilter !== null && (
            <button
              type="button"
              onClick={onResetToFilter}
              className="min-h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer shrink-0"
            >
              Đang lọc Tổ {activeToFilter} · Bỏ lọc
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo cụm Tổ dân phố">
            {CLUSTERS.map((c) => {
              const isActive = selectedCluster === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCluster(c.id)}
                  className={`min-h-8 px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isActive
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              placeholder="Tìm số Tổ hoặc tên đường..."
              aria-label="Tìm Tổ dân phố theo tên đường hoặc số tổ"
              className="w-full min-h-9 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white focus:border-emerald-700"
            />
          </div>
        </div>

        {/* 14 Zones Grid */}
        {filteredZones.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            Không tìm thấy Tổ Dân Phố phù hợp với từ khóa "{searchTo}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredZones.map((item) => {
              const { zone, householdCount, businessCount, infraCount, activeReportCount } = item;
              const isSelected = activeToFilter === zone.toNumber;

              return (
                <div
                  key={zone.id}
                  className={`rounded-xl border p-3.5 transition-colors flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "border-emerald-700 bg-emerald-50/40"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-300"
                          style={{ backgroundColor: zone.fillColor }}
                        />
                        <h3 className="font-bold text-slate-900 text-sm">{zone.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                          Cụm {zone.cluster}
                        </span>
                        {activeReportCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-red-800 text-white text-xs font-bold flex items-center gap-1">
                            <AlertTriangle size={12} /> {formatVNNumber(activeReportCount)} PA
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900">Trục đường:</span> {zone.streets}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Home size={12} className="text-indigo-700 shrink-0" />
                          <span>{readOnly ? "Dân cư" : "Hộ dân"}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {formatVNNumber(householdCount)} hộ
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Building2 size={12} className="text-sky-700 shrink-0" />
                          <span>Cơ sở KD</span>
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {formatVNNumber(businessCount)}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <ShieldCheck size={12} className="text-emerald-700 shrink-0" />
                          <span>Hạ tầng</span>
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {formatVNNumber(infraCount)} điểm
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectToOnMap(zone.toNumber)}
                    className={`w-full min-h-9 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                        : "bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-900"
                    }`}
                  >
                    <MapPin size={14} /> Mở {zone.shortLabel} trên Bản đồ GIS
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right 4 cols: Official Boundary Reference Diagram */}
      <div className="lg:col-span-4 min-w-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <Compass size={14} /> Bản đồ Địa giới Hành chính KP3
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Ranh giới chính thức & Quy hoạch phân khu
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Đối chiếu sơ đồ tổng thể 14 Tổ Dân Phố giáp trục ĐT.743A và ranh giới TP. Dĩ An.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsZoomOpen(true)}
          aria-label="Phóng to sơ đồ ranh giới Khu phố 3"
          className="w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 relative group cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          {!imgError ? (
            <img
              src={KP3_OFFICIAL_MAP_IMAGE_URL}
              alt="Bản đồ địa giới Khu phố 3 Phường An Phú"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <FallbackKp3SvgDiagram />
          )}
          <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/90 text-white text-xs font-bold flex items-center gap-1.5">
            <Maximize2 size={12} /> Phóng to sơ đồ
          </span>
        </button>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Diện tích đường biên</span>
            <span className="font-bold text-slate-900">{areaFormatted}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Chu vi khép kín</span>
            <span className="font-bold text-slate-900">{perimeterFormatted}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Số mốc tọa độ</span>
            <span className="font-bold text-slate-900">{formatVNNumber(verticesCount)} điểm</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Trực thuộc</span>
            <span className="font-bold text-slate-900">Phường An Phú, TP. HCM</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!readOnly && onOpenBoundaryModal && (
            <button
              type="button"
              onClick={onOpenBoundaryModal}
              className="w-full min-h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <SlidersHorizontal size={14} /> Chỉnh sửa ranh giới & GeoJSON
            </button>
          )}
          <a
            href={KP3_OFFICIAL_MAP_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink size={14} /> Mở Cổng bản đồ Đảng ủy Phường
          </a>
        </div>
      </div>

      {/* Zoom Modal */}
      <Modal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        size="4xl"
        title="Bản đồ Địa giới Khu phố 3 – Phường An Phú"
        description={`Diện tích ${areaFormatted} · Chu vi ${perimeterFormatted} · 14 Tổ Dân Phố`}
      >
        <div className="space-y-3">
          <div className="w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
            {!imgError ? (
              <img
                src={KP3_OFFICIAL_MAP_IMAGE_URL}
                alt="Bản đồ chi tiết Khu phố 3 Phường An Phú"
                onError={() => setImgError(true)}
                className="w-full h-full object-contain bg-slate-950"
              />
            ) : (
              <FallbackKp3SvgDiagram />
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sơ đồ địa giới Khu phố 3 gồm 3 cụm địa bàn (Bắc, Trung tâm, Nam) với 14 Tổ Dân Phố trực thuộc. Nhấn vào từng Tổ ở tab Sơ đồ để phóng to trực tiếp trên nền bản đồ thực địa OpenStreetMap / Vệ tinh.
          </p>
        </div>
      </Modal>
    </div>
  );
}
