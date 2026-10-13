import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Compass, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Crosshair, 
  X, 
  Layers,
  ArrowRight,
  Clock,
  Car
} from "lucide-react";
import { 
  KP3_CENTER, 
  parseCoordinates, 
  decimalToDMS, 
  calculateDistanceMeters, 
  generateDefaultCoordinatesForAddress, 
  getGoogleMapsDirectionUrl,
  generateRouteSteps
} from "../../utils/gisUtils";

interface GisCoordinateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code?: string;
  address: string;
  currentCoordinates?: string;
  type: "household" | "business" | "enterprise";
  onSaveCoordinates: (newCoordinates: string) => void;
  onNavigateToGis: (item: {
    name: string;
    address: string;
    coordinates: string;
    lat: number;
    lng: number;
    navigateRoute: boolean;
    type: "household" | "business" | "enterprise";
  }) => void;
}

export default function GisCoordinateModal({
  isOpen,
  onClose,
  title,
  code,
  address,
  currentCoordinates,
  type,
  onSaveCoordinates,
  onNavigateToGis
}: GisCoordinateModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"navigate" | "coordinates">("navigate");
  const [inputCoords, setInputCoords] = useState(currentCoordinates || "");
  const [parsed, setParsed] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Parse existing or newly entered coordinates
  useEffect(() => {
    const res = parseCoordinates(inputCoords);
    setParsed(res);
  }, [inputCoords]);

  // Initial load
  useEffect(() => {
    setInputCoords(currentCoordinates || "");
    const res = parseCoordinates(currentCoordinates);
    setParsed(res);
    // If not pinned yet, default to coordinates tab
    if (!res) {
      setActiveTab("coordinates");
    } else {
      setActiveTab("navigate");
    }
  }, [currentCoordinates]);

  // Auto assign from address
  const handleAutoAssign = () => {
    const generated = generateDefaultCoordinatesForAddress(address, code || title);
    setInputCoords(generated.dms);
    setErrorMsg("");
  };

  // Get current device GPS
  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Trình duyệt không hỗ trợ Geolocation");
      return;
    }
    setGpsLoading(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setInputCoords(decimalToDMS(lat, lng));
      },
      (err) => {
        setGpsLoading(false);
        setErrorMsg(`Không lấy được GPS (${err.message}). Vui lòng cấp quyền vị trí.`);
      },
      { timeout: 8000 }
    );
  };

  const handleSave = () => {
    if (!parsed) {
      setErrorMsg("Vui lòng nhập tọa độ hợp lệ (DMS hoặc Decimal)");
      return;
    }
    onSaveCoordinates(inputCoords);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  // Distance from KP3 Office
  const distance = parsed
    ? calculateDistanceMeters(KP3_CENTER.lat, KP3_CENTER.lng, parsed.lat, parsed.lng)
    : 0;

  const estimatedMinsMoto = Math.max(1, Math.ceil(distance / 350));
  const estimatedMinsWalk = Math.max(2, Math.ceil(distance / 70));
  const routeSteps = parsed ? generateRouteSteps(title, address, distance) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Navigation size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white line-clamp-1">
                {title}
              </h3>
              <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
                {code && <span className="font-mono bg-slate-800 px-1.5 py-0.2 rounded text-emerald-300">{code}</span>}
                <span className="truncate max-w-[280px]">{address}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("navigate")}
            className={`flex-1 py-3 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "navigate"
                ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Navigation size={14} /> 1. Chỉ đường & Dẫn đường
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("coordinates")}
            className={`flex-1 py-3 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "coordinates"
                ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MapPin size={14} /> 2. Cập nhật Tọa độ GIS
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === "navigate" ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Coordinates status box */}
              {parsed ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" /> Vị trí đã được ghim trên Bản đồ GIS
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      Đã đồng bộ
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-1 bg-white/70 p-2 rounded-lg border border-emerald-100">
                    <div><b>DEC:</b> {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}</div>
                    <div><b>DMS:</b> {decimalToDMS(parsed.lat, parsed.lng)}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <span>Chưa có tọa độ ghim trên Bản đồ GIS</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Địa điểm này hiện chưa được gán tọa độ GPS cụ thể. Bạn có thể bấm nút bên dưới để tự động ghim vị trí hoặc chuyển sang tab "Cập nhật Tọa độ GIS".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoAssign();
                      setActiveTab("coordinates");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    <Sparkles size={13} /> Tự động xác định tọa độ & Ghim ngay
                  </button>
                </div>
              )}

              {/* Distance & Trip stats */}
              {parsed && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-medium block">Khoảng cách</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}
                    </span>
                    <span className="text-[9px] text-slate-500 block">Từ VP KP3</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-medium block">Đi xe máy</span>
                    <span className="text-base font-extrabold text-emerald-700">~{estimatedMinsMoto} phút</span>
                    <span className="text-[9px] text-slate-500 block">Tốc độ ~20km/h</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-medium block">Đi bộ</span>
                    <span className="text-base font-extrabold text-indigo-700">~{estimatedMinsWalk} phút</span>
                    <span className="text-[9px] text-slate-500 block">Tốc độ ~4km/h</span>
                  </div>
                </div>
              )}

              {/* Turn by turn guidance steps */}
              {parsed && routeSteps.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                  <span className="font-bold text-slate-800 text-xs block flex items-center justify-between">
                    <span>Lộ trình dẫn đường nội bộ Khu phố 3:</span>
                    <span className="text-[10px] text-slate-500 font-normal">Xuất phát: 42 Lương Định Của</span>
                  </span>
                  <div className="space-y-2">
                    {routeSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p>{step.instruction}</p>
                          <span className="text-[10px] text-slate-400 font-mono">({step.distance})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons for Navigation */}
              <div className="space-y-2 pt-1">
                {parsed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToGis({
                          name: title,
                          address,
                          coordinates: inputCoords,
                          lat: parsed.lat,
                          lng: parsed.lng,
                          navigateRoute: true,
                          type
                        });
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-sm transition-all"
                    >
                      <Navigation size={15} /> Dẫn đường trực tiếp trên Bản đồ GIS Khu phố 3
                    </button>

                    <a
                      href={getGoogleMapsDirectionUrl(parsed.lat, parsed.lng, `${address}, Phường An Phú, TP. Thủ Đức`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      <ExternalLink size={14} /> Mở Chỉ đường Google Maps GPS (Ngoài thực địa)
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("coordinates")}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    <MapPin size={15} /> Thêm tọa độ để kích hoạt dẫn đường
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: UPDATE / ADD COORDINATES */
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Tọa độ vị trí (Hỗ trợ định dạng DMS hoặc Thập phân):
                </label>
                <input
                  type="text"
                  value={inputCoords}
                  onChange={(e) => {
                    setInputCoords(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder={`Ví dụ: 10°56'07.5"N 106°44'38.0"E hoặc 10.936997, 106.744645`}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                />
              </div>

              {/* Status info */}
              {parsed ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Tọa độ hợp lệ:
                  </div>
                  <div className="text-[11px] font-mono text-emerald-900">
                    Vĩ độ (Lat): <b>{parsed.lat.toFixed(6)}</b> • Kinh độ (Lng): <b>{parsed.lng.toFixed(6)}</b>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    DMS chuẩn: {decimalToDMS(parsed.lat, parsed.lng)}
                  </div>
                </div>
              ) : (
                inputCoords.trim() !== "" && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Định dạng tọa độ chưa đúng. Vui lòng kiểm tra lại.</span>
                  </div>
                )
              )}

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={15} /> Đã lưu và đồng bộ thành công với Bản đồ GIS!
                </div>
              )}

              {/* Quick actions */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block">Tiện ích hỗ trợ lấy tọa độ nhanh:</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAutoAssign}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
                  >
                    <Sparkles size={14} /> Tự động theo địa chỉ KP3
                  </button>

                  <button
                    type="button"
                    disabled={gpsLoading}
                    onClick={handleGetCurrentGPS}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs cursor-pointer transition-colors disabled:opacity-60"
                  >
                    <Crosshair size={14} className={gpsLoading ? "animate-spin" : ""} />
                    {gpsLoading ? "Đang định vị..." : "Lấy GPS thiết bị hiện tại"}
                  </button>
                </div>
              </div>

              {/* Save & View */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Đóng
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!parsed}
                    className={`px-4 py-2 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-colors ${
                      parsed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-300 cursor-not-allowed"
                    }`}
                  >
                    Lưu & Đồng bộ GIS
                  </button>
                  {parsed && (
                    <button
                      type="button"
                      onClick={() => {
                        onSaveCoordinates(inputCoords);
                        onNavigateToGis({
                          name: title,
                          address,
                          coordinates: inputCoords,
                          lat: parsed.lat,
                          lng: parsed.lng,
                          navigateRoute: false,
                          type
                        });
                        onClose();
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
                    >
                      Xem trên GIS <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
