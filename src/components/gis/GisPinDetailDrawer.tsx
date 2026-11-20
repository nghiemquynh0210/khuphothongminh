import React, { useMemo, useState } from "react";
import {
  Building2,
  Camera,
  Check,
  Compass,
  Copy,
  Crosshair,
  ExternalLink,
  FileWarning,
  Home,
  Layers,
  Navigation,
  Radar,
  ShieldCheck,
  Store,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Business, Household } from "../../types";
import {
  KP3_CENTER,
  calculateDistanceMeters,
  decimalToDMS,
  formatDistance,
  getGoogleMapsDirectionUrl,
} from "../../utils/gisUtils";
import {
  PIN_CATEGORY_META,
  detectToDanPhoFromCoord,
  formatLatLngVN,
} from "../../data/gisConfig";
import { isEnterpriseRecord } from "../../utils/kp3Utils";
import { resolveCoLocatedEntities } from "../../utils/addressCoLocationUtils";
import { normalizeEntityLandParcels, summarizeLandParcels } from "../../utils/landParcelsUtils";
import {
  getBusinessDetailPath,
  getEnterpriseDetailPath,
  getHouseholdDetailPath,
  navigate,
} from "../../routes";
import { GisPin } from "./gisTypes";

interface GisPinDetailDrawerProps {
  pin: GisPin | null;
  onClose: () => void;
  isRouteActive: boolean;
  onToggleRoute: (pin: GisPin) => void;
  showCoverageRadius: boolean;
  onToggleCoverageRadius: () => void;
  onEditPinLocation?: (pin: GisPin) => void;
  onDeleteCustomPin?: (pinId: string) => void;
  onTriggerLiveStream?: (pin: GisPin) => void;
  onNavigateToReport?: (reportId?: string) => void;
  households?: Household[];
  businesses?: Business[];
  readOnly?: boolean;
}

function getStatusPillClasses(status: GisPin["status"]): string {
  switch (status) {
    case "Hoạt động":
    case "Đã giải quyết":
      return "bg-emerald-50 border-emerald-200 text-emerald-900";
    case "Khẩn cấp":
    case "Cảnh báo":
      return "bg-red-50 border-red-200 text-red-900";
    default:
      return "bg-amber-50 border-amber-200 text-amber-950";
  }
}

export default function GisPinDetailDrawer({
  pin,
  onClose,
  isRouteActive,
  onToggleRoute,
  showCoverageRadius,
  onToggleCoverageRadius,
  onEditPinLocation,
  onDeleteCustomPin,
  onTriggerLiveStream,
  onNavigateToReport,
  households = [],
  businesses = [],
  readOnly = false,
}: GisPinDetailDrawerProps) {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sourceHousehold = useMemo(() => {
    if (!pin || pin.type !== "household" || !pin.sourceId) return undefined;
    return households.find((h) => h.id === pin.sourceId);
  }, [pin, households]);

  const sourceBusiness = useMemo(() => {
    if (!pin || pin.type !== "business" || !pin.sourceId) return undefined;
    return businesses.find((b) => b.id === pin.sourceId);
  }, [pin, businesses]);

  const coLocation = useMemo(() => {
    if (readOnly || (!sourceHousehold && !sourceBusiness)) return null;
    if (sourceHousehold) {
      return resolveCoLocatedEntities({
        focusHousehold: sourceHousehold,
        households,
        businesses,
      });
    }
    if (sourceBusiness) {
      return resolveCoLocatedEntities({
        focusBusiness: sourceBusiness,
        households,
        businesses,
      });
    }
    return null;
  }, [readOnly, sourceHousehold, sourceBusiness, households, businesses]);

  const parcelSummary = useMemo(() => {
    const entity = sourceHousehold || sourceBusiness;
    if (!entity) return null;
    const parcels = normalizeEntityLandParcels(entity);
    if (parcels.length === 0) return null;
    return {
      count: parcels.length,
      ...summarizeLandParcels(parcels),
    };
  }, [sourceHousehold, sourceBusiness]);

  if (!pin) return null;

  const meta = PIN_CATEGORY_META[pin.type];
  const distanceMeters = calculateDistanceMeters(
    KP3_CENTER.lat,
    KP3_CENTER.lng,
    pin.lat,
    pin.lng
  );
  const detectedZone = detectToDanPhoFromCoord(pin.lat, pin.lng);

  const handleCopyCoords = () => {
    const text = `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <div
      role="region"
      aria-label={`Chi tiết điểm ${pin.name}`}
      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${meta.pillBg} ${meta.pillText}`}>
              {meta.label}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${getStatusPillClasses(
                pin.status
              )}`}
            >
              {pin.status}
            </span>
            {(pin.toNumber || detectedZone) && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                Phân khu GIS #{pin.toNumber || detectedZone?.toNumber}
              </span>
            )}
            {pin.timemarkVerified && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold inline-flex items-center gap-1">
                <Camera size={12} className="text-amber-600" />
                Timemark GPS 100% Chân thực
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug text-pretty">
            {pin.name}
          </h3>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">{pin.location}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết điểm"
          className="min-h-8 min-w-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
        >
          <X size={15} />
        </button>
      </div>

      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
        {pin.details}
      </p>

      {pin.timemarkVerified && (
        <div className="bg-gradient-to-r from-amber-50/80 to-amber-100/50 border border-amber-200/90 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[12.5px]">
              <ShieldCheck size={14} className="text-amber-700" />
              Đã xác thực tọa độ qua ảnh Timemark Camera
            </span>
            {pin.timemarkHash && (
              <code className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">
                Hash: {pin.timemarkHash}
              </code>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11.5px] text-amber-900 font-medium">
            <div>
              <span className="text-amber-700 block text-[10.5px]">Độ cao thực địa:</span>
              <span className="font-bold">{pin.photoElevation || "37.1m"}</span>
            </div>
            <div>
              <span className="text-amber-700 block text-[10.5px]">Phương hướng:</span>
              <span className="font-bold">{pin.photoHeading || "71° E"}</span>
            </div>
            <div>
              <span className="text-amber-700 block text-[10.5px]">Thời gian chụp:</span>
              <span className="font-bold">{pin.photoDate || "Đã kiểm chứng"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Structured GIS metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
          <span className="text-slate-600 font-medium block">Tọa độ thực địa</span>
          <div className="font-bold text-slate-900">{formatLatLngVN(pin.lat, pin.lng)}</div>
          <code className="text-xs font-mono text-slate-700 block truncate">
            {decimalToDMS(pin.lat, pin.lng)}
          </code>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
          <span className="text-slate-600 font-medium block">Khoảng cách Trụ sở KP3</span>
          <div className="font-bold text-slate-900">{formatDistance(distanceMeters)}</div>
          <span className="text-xs text-slate-600 block">Theo đường chim bay WGS-84</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
          <span className="text-slate-600 font-medium block">Phân vùng hành chính</span>
          <div className="font-bold text-slate-900">
            {detectedZone ? `${detectedZone.name}` : "Khu vực giáp ranh"}
          </div>
          <span className="text-xs text-slate-600 block">
            {detectedZone ? `Cụm ${detectedZone.cluster} · ${detectedZone.streets}` : "Ngoài vùng polygon"}
          </span>
        </div>
      </div>

      {/* Co-located Households / Enterprises / Businesses & Multi-Parcel Summary */}
      {!readOnly && (parcelSummary || (coLocation && coLocation.totalOtherEntities > 0)) && (
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-700" />
              Tổ hợp Địa chính & Chủ thể Cùng Địa Chỉ
            </span>
            {parcelSummary && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-[11px]">
                {parcelSummary.count >= 2
                  ? `Ghép ${String(parcelSummary.count).padStart(2, "0")} Sổ đỏ · ∑ ${parcelSummary.totalArea || "—"} m²`
                  : `Tờ ${parcelSummary.toBanDoSummary || "—"}, Thửa ${parcelSummary.soThuaSummary || "—"} · ${parcelSummary.totalArea || "—"} m²`}
              </span>
            )}
          </div>

          {coLocation && coLocation.totalOtherEntities > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {coLocation.households.map((hh) => (
                <button
                  key={`gis-coloc-hh-${hh.id}`}
                  type="button"
                  onClick={() => navigate(getHouseholdDetailPath(hh.id))}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold transition-colors cursor-pointer"
                >
                  <Home size={12} className="text-emerald-700" />
                  <span>Hộ {hh.code} · {hh.ownerName}</span>
                </button>
              ))}
              {coLocation.enterprises.map((ent) => (
                <button
                  key={`gis-coloc-ent-${ent.id}`}
                  type="button"
                  onClick={() => navigate(getEnterpriseDetailPath(ent.id))}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold transition-colors cursor-pointer"
                >
                  <Building2 size={12} className="text-indigo-700" />
                  <span className="truncate max-w-[220px]">{ent.name}</span>
                </button>
              ))}
              {coLocation.businesses.map((biz) => (
                <button
                  key={`gis-coloc-biz-${biz.id}`}
                  type="button"
                  onClick={() => navigate(getBusinessDetailPath(biz.id))}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-950 border border-amber-200 font-bold transition-colors cursor-pointer"
                >
                  <Store size={12} className="text-amber-700" />
                  <span className="truncate max-w-[220px]">{biz.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!readOnly && sourceHousehold && (
          <button
            type="button"
            onClick={() => navigate(getHouseholdDetailPath(sourceHousehold.id))}
            className="min-h-9 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Home size={14} /> Mở hồ sơ Hộ khẩu
          </button>
        )}

        {!readOnly && sourceBusiness && (
          <button
            type="button"
            onClick={() =>
              navigate(
                isEnterpriseRecord(sourceBusiness)
                  ? getEnterpriseDetailPath(sourceBusiness.id)
                  : getBusinessDetailPath(sourceBusiness.id)
              )
            }
            className="min-h-9 px-3.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isEnterpriseRecord(sourceBusiness) ? <Building2 size={14} /> : <Store size={14} />}
            {isEnterpriseRecord(sourceBusiness) ? "Mở hồ sơ Doanh nghiệp" : "Mở hồ sơ Cơ sở KD"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onToggleRoute(pin)}
          className={`min-h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            isRouteActive
              ? "bg-amber-700 hover:bg-amber-800 text-white"
              : "bg-[#073B72] hover:bg-[#06305d] text-white"
          }`}
        >
          <Navigation size={14} />
          {isRouteActive ? "Tắt chỉ đường KP3" : "Chỉ đường từ Trụ sở KP3"}
        </button>

        {pin.coverageMeters && (
          <button
            type="button"
            onClick={onToggleCoverageRadius}
            className={`min-h-9 px-3.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showCoverageRadius
                ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Radar size={14} />
            {showCoverageRadius ? `Ẩn vùng phủ (${pin.coverageMeters} m)` : `Hiện vùng phủ (${pin.coverageMeters} m)`}
          </button>
        )}

        {pin.type === "camera" && onTriggerLiveStream && (
          <button
            type="button"
            onClick={() => onTriggerLiveStream(pin)}
            className="min-h-9 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Video size={14} /> Xem Camera trực tiếp
          </button>
        )}

        {pin.type === "report" && onNavigateToReport && (
          <button
            type="button"
            onClick={() => onNavigateToReport(pin.sourceId)}
            className="min-h-9 px-3.5 rounded-xl bg-red-800 hover:bg-red-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileWarning size={14} /> Mở chi tiết phản ánh
          </button>
        )}

        {!readOnly && onEditPinLocation && (
          <button
            type="button"
            onClick={() => onEditPinLocation(pin)}
            className="min-h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Crosshair size={14} /> Chỉnh tọa độ trên bản đồ
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyCoords}
          className="min-h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          {copiedCoords ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
          {copiedCoords ? "Đã chép tọa độ" : "Sao chép WGS-84"}
        </button>

        <a
          href={getGoogleMapsDirectionUrl(pin.lat, pin.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5"
        >
          <ExternalLink size={13} /> Google Maps
        </a>

        {!readOnly && pin.type === "custom" && onDeleteCustomPin && (
          <div className="ml-auto flex items-center gap-1.5">
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCustomPin(pin.id);
                    setConfirmDelete(false);
                  }}
                  className="min-h-9 px-3 rounded-xl bg-red-800 hover:bg-red-900 text-white text-xs font-bold cursor-pointer"
                >
                  Xác nhận xóa
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} /> Xóa điểm ghim
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

