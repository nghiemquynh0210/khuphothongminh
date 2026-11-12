import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  MapPin,
  Navigation,
  Sparkles,
  X
} from "lucide-react";
import { Business } from "../../types";
import {
  decimalToDMS,
  generateDefaultCoordinatesForAddress,
  parseCoordinates as parseGisCoords
} from "../../utils/gisUtils";

interface BusinessGisPinModalProps {
  business: Business | null;
  onClose: () => void;
  onSaveCoordinates: (
    business: Business,
    coordinates: string,
    andNavigate: boolean
  ) => void;
}

function getInitialBusinessPinCoord(business: Business | null): string {
  if (!business) return "";
  if (business.coordinates) return business.coordinates;
  return generateDefaultCoordinatesForAddress(business.address, business.id).dms;
}

/**
 * Modal ghim và đồng bộ tọa độ GIS cho Cơ sở Kinh doanh, dùng chung giữa danh mục và trang chi tiết.
 */
export default function BusinessGisPinModal({
  business,
  onClose,
  onSaveCoordinates
}: BusinessGisPinModalProps) {
  const [trackedKey, setTrackedKey] = useState<string | null>(
    business ? `${business.id}:${business.coordinates || ""}` : null
  );
  const [gisPinInput, setGisPinInput] = useState(() =>
    getInitialBusinessPinCoord(business)
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const currentKey = business
    ? `${business.id}:${business.coordinates || ""}`
    : null;
  if (currentKey !== trackedKey) {
    setTrackedKey(currentKey);
    setGisPinInput(getInitialBusinessPinCoord(business));
    setInputError(null);
  }

  useEffect(() => {
    if (!business) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [business, onClose]);

  if (!business) return null;

  const parsed = gisPinInput ? parseGisCoords(gisPinInput) : null;

  const handleSave = (andNavigate: boolean) => {
    const finalCoord = gisPinInput.trim();
    if (!finalCoord) {
      setInputError("Vui lòng nhập hoặc lấy tọa độ GIS trước khi lưu.");
      return;
    }
    onSaveCoordinates(business, finalCoord, andNavigate);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-gis-pin-modal-title"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
      >
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex justify-between items-center border-b border-indigo-700/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <MapPin size={18} />
            </div>
            <div>
              <h3 id="business-gis-pin-modal-title" className="font-black text-sm text-white">
                Ghim & Đồng bộ Tọa độ GIS Cơ sở
              </h3>
              <p className="text-[11px] text-indigo-200/90 font-mono">
                {business.name} ({business.licenseNumber || business.id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng hộp thoại tọa độ GIS"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Địa chỉ kinh doanh:
            </span>
            <p className="font-bold text-slate-800 text-xs sm:text-sm">{business.address}</p>
            <span className="text-[11px] text-slate-500 block">
              Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <label htmlFor="business-gis-pin-input" className="font-bold text-slate-700">
                Tọa độ GIS (Định dạng DMS hoặc Thập phân):
              </label>
              <button
                type="button"
                onClick={() => {
                  const auto = generateDefaultCoordinatesForAddress(
                    business.address,
                    business.id
                  );
                  setGisPinInput(auto.dms);
                  setInputError(null);
                }}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                title="Tự động nhận diện tọa độ từ địa chỉ"
              >
                <Sparkles size={12} className="text-indigo-600" /> Tự động nhận diện từ địa chỉ
              </button>
            </div>

            <div className="relative">
              <input
                id="business-gis-pin-input"
                type="text"
                value={gisPinInput}
                onChange={e => {
                  setGisPinInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder='Ví dụ: 10°56&apos;14.2"N 106°44&apos;39.5"E hoặc 10.936997, 106.744645'
                aria-invalid={inputError ? "true" : "false"}
                className={`w-full px-3.5 py-2.5 border rounded-xl font-mono text-xs focus:outline-none focus:ring-2 bg-white ${
                  inputError
                    ? "border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
              />
              <MapPin size={15} className="absolute right-3 top-3 text-slate-400" />
            </div>

            {inputError && (
              <p role="alert" className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span>{inputError}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Gợi ý khu vực trục đường KP3:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setGisPinInput('10°56\'13.2"N 106°44\'40.7"E');
                  setInputError(null);
                }}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <strong className="block text-slate-900">Mặt tiền Lương Định Của</strong>
                <span className="text-[10px] text-slate-500 font-mono">10.936997, 106.744645</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGisPinInput('10°56\'16.1"N 106°44\'43.8"E');
                  setInputError(null);
                }}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <strong className="block text-slate-900">Hẻm 42 Lương Định Của</strong>
                <span className="text-[10px] text-slate-500 font-mono">10.937800, 106.745500</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGisPinInput('10°56\'08.9"N 106°44\'48.5"E');
                  setInputError(null);
                }}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <strong className="block text-slate-900">Hẻm 18 Lương Định Của</strong>
                <span className="text-[10px] text-slate-500 font-mono">10.935800, 106.746800</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGisPinInput('10°56\'14.8"N 106°44\'38.2"E');
                  setInputError(null);
                }}
                className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <strong className="block text-slate-900">Khu dân cư nội bộ KP3</strong>
                <span className="text-[10px] text-slate-500 font-mono">10.937200, 106.743800</span>
              </button>
            </div>
          </div>

          {gisPinInput &&
            (parsed ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check size={13} className="text-emerald-600" />
                  <span>
                    Tọa độ hợp lệ: {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                  {decimalToDMS(parsed.lat, parsed.lng)}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <span>
                  Đang kiểm tra định dạng tọa độ. Vui lòng nhập đúng chuẩn hoặc bấm nút tự động nhận diện.
                </span>
              </div>
            ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Lưu & Đồng bộ GIS
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Navigation size={13} />
              <span>Lưu & Dẫn đường ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

