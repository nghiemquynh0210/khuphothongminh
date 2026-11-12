import React, { useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Layers,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ReportSelect } from "../reports/ReportSelect";
import { KP3_14_ZONES, PIN_CATEGORY_META } from "../../data/gisConfig";
import { GisLayersState, GisPin, GisPinType } from "./gisTypes";
import { formatVNNumber } from "../../utils/numberFormat";

interface GisPinListPanelProps {
  layers: GisLayersState;
  onToggleLayer: (key: keyof GisLayersState) => void;
  boundaryCount: number;
  boundaryEditMode: boolean;
  onToggleBoundaryEditMode: () => void;
  onOpenBoundaryModal: () => void;
  layerCounts: Record<GisPinType, number>;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  activeFilterType: "ALL" | GisPinType;
  onChangeFilterType: (value: "ALL" | GisPinType) => void;
  activeToFilter: number | null;
  onChangeToFilter: (value: number | null) => void;
  filteredPins: GisPin[];
  selectedPinId: string | null;
  onSelectPin: (pin: GisPin) => void;
  readOnly?: boolean;
  missingCoordCount?: number;
  onOpenSyncModal?: () => void;
}

interface LayerRowConfig {
  key: keyof GisLayersState;
  label: string;
  count: number;
  dotColor: string;
  adminOnly?: boolean;
}

interface CustomCheckboxRowProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  count: number;
  dotColor: string;
  rightActions?: React.ReactNode;
}

const CustomCheckboxRow: React.FC<CustomCheckboxRowProps> = ({
  checked,
  onChange,
  label,
  count,
  dotColor,
  rightActions,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 min-h-9 px-1 py-0.5">
      <label className="flex items-center gap-2.5 flex-1 min-w-[160px] min-h-9 px-1.5 rounded-lg hover:bg-slate-100 cursor-pointer select-none py-1 transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700 ${
            checked
              ? "bg-emerald-700 border-emerald-700 text-white"
              : "bg-white border-slate-400 text-transparent"
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-xs font-semibold text-slate-800 leading-snug text-pretty">
          {label} ({formatVNNumber(count)})
        </span>
      </label>
      {rightActions && <div className="flex items-center gap-1 shrink-0">{rightActions}</div>}
    </div>
  );
};

const PAGE_SIZE = 25;

export default function GisPinListPanel({
  layers,
  onToggleLayer,
  boundaryCount,
  boundaryEditMode,
  onToggleBoundaryEditMode,
  onOpenBoundaryModal,
  layerCounts,
  searchQuery,
  onChangeSearchQuery,
  activeFilterType,
  onChangeFilterType,
  activeToFilter,
  onChangeToFilter,
  filteredPins,
  selectedPinId,
  onSelectPin,
  readOnly = false,
  missingCoordCount = 0,
  onOpenSyncModal,
}: GisPinListPanelProps) {
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const visiblePins = useMemo(
    () => filteredPins.slice(0, visibleLimit),
    [filteredPins, visibleLimit]
  );

  const layerRows: LayerRowConfig[] = [
    {
      key: "reports",
      label: "Phản ánh 1022",
      count: layerCounts.report,
      dotColor: PIN_CATEGORY_META.report.markerBg,
    },
    {
      key: "civic",
      label: "Hành chính KP3",
      count: layerCounts.civic,
      dotColor: PIN_CATEGORY_META.civic.markerBg,
    },
    {
      key: "cameras",
      label: "Camera An ninh",
      count: layerCounts.camera,
      dotColor: PIN_CATEGORY_META.camera.markerBg,
    },
    {
      key: "fire",
      label: "Thiết bị PCCC",
      count: layerCounts.fire,
      dotColor: PIN_CATEGORY_META.fire.markerBg,
    },
    {
      key: "light",
      label: "Đèn Smart LED",
      count: layerCounts.light,
      dotColor: PIN_CATEGORY_META.light.markerBg,
    },
    {
      key: "businesses",
      label: "Cơ sở Kinh doanh",
      count: layerCounts.business,
      dotColor: PIN_CATEGORY_META.business.markerBg,
    },
    {
      key: "households",
      label: "Hộ gia đình",
      count: layerCounts.household,
      dotColor: PIN_CATEGORY_META.household.markerBg,
      adminOnly: true,
    },
    {
      key: "custom",
      label: "Điểm ghim bổ sung",
      count: layerCounts.custom,
      dotColor: PIN_CATEGORY_META.custom.markerBg,
    },
  ];

  const toOptions = useMemo(
    () => [
      { value: "ALL", label: "Tất cả 14 Tổ dân phố" },
      ...KP3_14_ZONES.map((z) => ({
        value: String(z.toNumber),
        label: `Tổ dân phố ${z.toNumber} (Cụm ${z.cluster})`,
      })),
    ],
    []
  );

  const typeOptions = useMemo(() => {
    const base: Array<{ value: "ALL" | GisPinType; label: string }> = [
      { value: "ALL", label: "Tất cả loại đối tượng" },
      { value: "report", label: `Phản ánh 1022 (${formatVNNumber(layerCounts.report)})` },
      { value: "civic", label: `Hành chính KP3 (${formatVNNumber(layerCounts.civic)})` },
      { value: "camera", label: `Camera An ninh (${formatVNNumber(layerCounts.camera)})` },
      { value: "fire", label: `Trụ PCCC (${formatVNNumber(layerCounts.fire)})` },
      { value: "light", label: `Đèn Smart LED (${formatVNNumber(layerCounts.light)})` },
      { value: "business", label: `Cơ sở Kinh doanh (${formatVNNumber(layerCounts.business)})` },
      { value: "custom", label: `Điểm ghim bổ sung (${formatVNNumber(layerCounts.custom)})` },
    ];
    if (!readOnly) {
      base.splice(6, 0, {
        value: "household",
        label: `Hộ gia đình (${formatVNNumber(layerCounts.household)})`,
      });
    }
    return base;
  }, [layerCounts, readOnly]);

  return (
    <div className="space-y-4 min-w-0">
      {/* Layers panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-emerald-700" /> Lớp bản đồ (Layers)
          </h3>
          {!readOnly && missingCoordCount > 0 && onOpenSyncModal && (
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="min-h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold cursor-pointer"
            >
              Chưa tọa độ: {formatVNNumber(missingCoordCount)}
            </button>
          )}
        </div>

        {/* Boundary layer row with staff edit actions */}
        <CustomCheckboxRow
          checked={layers.boundary}
          onChange={() => onToggleLayer("boundary")}
          label="Ranh giới KP3 (mốc)"
          count={boundaryCount}
          dotColor="#047857"
          rightActions={
            !readOnly ? (
              <>
                <button
                  type="button"
                  onClick={onToggleBoundaryEditMode}
                  aria-label={boundaryEditMode ? "Xong sửa mốc ranh giới" : "Sửa mốc ranh giới"}
                  className={`min-h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    boundaryEditMode
                      ? "bg-amber-700 text-white hover:bg-amber-800"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <Edit3 size={12} /> {boundaryEditMode ? "Xong" : "Sửa mốc"}
                </button>
                <button
                  type="button"
                  onClick={onOpenBoundaryModal}
                  aria-label="Tùy chỉnh ranh giới KP3"
                  className="min-h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal size={12} /> Tùy chỉnh
                </button>
              </>
            ) : undefined
          }
        />

        <div className="divide-y divide-slate-100">
          {layerRows
            .filter((r) => !(readOnly && r.adminOnly))
            .map((row) => (
              <CustomCheckboxRow
                key={row.key}
                checked={layers[row.key]}
                onChange={() => onToggleLayer(row.key)}
                label={row.label}
                count={row.count}
                dotColor={row.dotColor}
              />
            ))}
        </div>
      </div>

      {/* Filter & Pin List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={14} className="text-emerald-700" /> Tra cứu điểm địa bàn
          </h3>
          <span className="text-xs font-bold text-slate-700">
            {formatVNNumber(filteredPins.length)} điểm
          </span>
        </div>

        {/* Search box */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onChangeSearchQuery(e.target.value);
              setVisibleLimit(PAGE_SIZE);
            }}
            placeholder="Tìm tên điểm, tổ..."
            aria-label="Tìm kiếm điểm trên bản đồ GIS"
            className="w-full min-h-9 pl-9 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white focus:border-emerald-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-7 min-w-7 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Combobox filters */}
        <div className="grid grid-cols-1 gap-2">
          <ReportSelect
            aria-label="Lọc theo Tổ dân phố"
            value={activeToFilter !== null ? String(activeToFilter) : "ALL"}
            onChange={(val) => {
              onChangeToFilter(val === "ALL" ? null : parseInt(val, 10));
              setVisibleLimit(PAGE_SIZE);
            }}
            options={toOptions}
            buttonClassName="min-h-9 text-xs border-slate-300"
          />
          <ReportSelect
            aria-label="Lọc theo loại đối tượng GIS"
            value={activeFilterType}
            onChange={(val) => {
              onChangeFilterType(val as "ALL" | GisPinType);
              setVisibleLimit(PAGE_SIZE);
            }}
            options={typeOptions}
            buttonClassName="min-h-9 text-xs border-slate-300"
          />
        </div>

        {/* Pin list */}
        {visiblePins.length === 0 ? (
          <div className="py-8 px-3 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            Không có điểm nào khớp bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 evon-scroll">
            {visiblePins.map((pin) => {
              const meta = PIN_CATEGORY_META[pin.type];
              const isSelected = selectedPinId === pin.id;
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => onSelectPin(pin)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-700"
                      : "bg-white border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <span className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 text-pretty flex-1">
                      {pin.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 ${meta.pillBg} ${meta.pillText}`}
                    >
                      {meta.shortLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">
                    {pin.location}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">
                      {pin.toNumber ? `Tổ ${pin.toNumber}` : "Địa bàn KP3"}
                    </span>
                    <span className="font-semibold text-slate-700">{pin.status}</span>
                  </div>
                </button>
              );
            })}

            {filteredPins.length > visibleLimit && (
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                className="w-full min-h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hiển thị thêm ({formatVNNumber(filteredPins.length - visibleLimit)} điểm còn lại)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
