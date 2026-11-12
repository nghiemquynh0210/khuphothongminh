import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Compass,
  Crosshair,
  LocateFixed,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { ReportSelect } from "../reports/ReportSelect";
import { Business, Household } from "../../types";
import { parseCoordinates } from "../../utils/gisUtils";
import {
  detectToDanPhoFromCoord,
  formatLatLngVN,
  generateToAwareCoordinates,
} from "../../data/gisConfig";
import { GisPickedLocation, GisPin, GisPinType } from "./gisTypes";

interface GisPinFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  households: Household[];
  businesses: Business[];
  pickedLocation: GisPickedLocation | null;
  onRequestPickOnMap: () => void;
  onSubmitAssignHousehold: (householdId: string, lat: number, lng: number) => void;
  onSubmitAssignBusiness: (businessId: string, lat: number, lng: number) => void;
  onSubmitAddCustomPin: (pin: Omit<GisPin, "id">) => void;
}

type FormMode = "household" | "business" | "custom";

export default function GisPinFormModal({
  isOpen,
  onClose,
  households,
  businesses,
  pickedLocation,
  onRequestPickOnMap,
  onSubmitAssignHousehold,
  onSubmitAssignBusiness,
  onSubmitAddCustomPin,
}: GisPinFormModalProps) {
  const [mode, setMode] = useState<FormMode>("custom");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  const [pinType, setPinType] = useState<GisPinType>("camera");
  const [pinName, setPinName] = useState("");
  const [pinLocation, setPinLocation] = useState("");
  const [pinDetails, setPinDetails] = useState("");
  const [pinStatus, setPinStatus] = useState<GisPin["status"]>("Hoạt động");

  const [coordInput, setCoordInput] = useState("10.937000, 106.744700");
  const [errorText, setErrorText] = useState("");
  const [gpsStatus, setGpsStatus] = useState("");

  // Sync picked coordinate returned from 1-tap map mode
  useEffect(() => {
    if (pickedLocation) {
      setCoordInput(`${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}`);
      setErrorText("");
      if (pickedLocation.detectedTo && !pinLocation.trim()) {
        setPinLocation(`Tổ dân phố ${pickedLocation.detectedTo}, Khu phố 3, Phường An Phú`);
      }
    }
  }, [pickedLocation]);

  // Preselect first missing household / business when list changes
  useEffect(() => {
    if (!selectedHouseholdId && households.length > 0) {
      const missing = households.find((h) => !parseCoordinates(h.coordinates));
      setSelectedHouseholdId((missing || households[0]).id);
    }
    if (!selectedBusinessId && businesses.length > 0) {
      const missing = businesses.find((b) => !parseCoordinates(b.coordinates));
      setSelectedBusinessId((missing || businesses[0]).id);
    }
  }, [households, businesses, selectedHouseholdId, selectedBusinessId]);

  const parsedCoord = useMemo(() => parseCoordinates(coordInput), [coordInput]);
  const detectedZone = useMemo(
    () => (parsedCoord ? detectToDanPhoFromCoord(parsedCoord.lat, parsedCoord.lng) : null),
    [parsedCoord]
  );

  const householdOptions = useMemo(() => {
    const sorted = [...households].sort((a, b) => {
      const aHas = Boolean(parseCoordinates(a.coordinates));
      const bHas = Boolean(parseCoordinates(b.coordinates));
      return Number(aHas) - Number(bHas);
    });
    return sorted.map((h) => {
      const hasCoord = Boolean(parseCoordinates(h.coordinates));
      return {
        value: h.id,
        label: `${hasCoord ? "✓" : "[Chưa tọa độ]"} ${h.code} – ${h.ownerName}`,
        description: h.address,
      };
    });
  }, [households]);

  const businessOptions = useMemo(() => {
    const sorted = [...businesses].sort((a, b) => {
      const aHas = Boolean(parseCoordinates(a.coordinates));
      const bHas = Boolean(parseCoordinates(b.coordinates));
      return Number(aHas) - Number(bHas);
    });
    return sorted.map((b) => {
      const hasCoord = Boolean(parseCoordinates(b.coordinates));
      return {
        value: b.id,
        label: `${hasCoord ? "✓" : "[Chưa tọa độ]"} ${b.name}`,
        description: b.address,
      };
    });
  }, [businesses]);

  const handleUseDeviceGps = () => {
    setErrorText("");
    setGpsStatus("Đang lấy tín hiệu GPS...");
    if (!navigator.geolocation) {
      setGpsStatus("");
      setErrorText("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoordInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setGpsStatus(`Đã nhận tọa độ GPS (±${Math.round(pos.coords.accuracy)} m).`);
      },
      () => {
        setGpsStatus("");
        setErrorText("Không truy cập được GPS. Bạn có thể chạm trực tiếp lên bản đồ để chọn tọa độ.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAutoLocateByAddress = () => {
    setErrorText("");
    let address = pinLocation;
    let seed = pinName || "kp3";

    if (mode === "household") {
      const h = households.find((x) => x.id === selectedHouseholdId);
      if (h) {
        address = h.address;
        seed = h.id;
      }
    } else if (mode === "business") {
      const b = businesses.find((x) => x.id === selectedBusinessId);
      if (b) {
        address = b.address;
        seed = b.id;
      }
    }

    const gen = generateToAwareCoordinates(address || "Khu phố 3", seed);
    setCoordInput(`${gen.lat.toFixed(6)}, ${gen.lng.toFixed(6)}`);
    setGpsStatus("Đã tự đặt tọa độ ước lượng vào vùng Tổ dân phố tương ứng.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!parsedCoord) {
      setErrorText("Tọa độ không hợp lệ. Vui lòng nhập Lat, Lng hoặc chọn trực tiếp trên bản đồ.");
      return;
    }

    if (mode === "household") {
      if (!selectedHouseholdId) {
        setErrorText("Vui lòng chọn hộ gia đình cần gắn vị trí.");
        return;
      }
      onSubmitAssignHousehold(selectedHouseholdId, parsedCoord.lat, parsedCoord.lng);
      onClose();
      return;
    }

    if (mode === "business") {
      if (!selectedBusinessId) {
        setErrorText("Vui lòng chọn cơ sở kinh doanh cần gắn vị trí.");
        return;
      }
      onSubmitAssignBusiness(selectedBusinessId, parsedCoord.lat, parsedCoord.lng);
      onClose();
      return;
    }

    if (!pinName.trim()) {
      setErrorText("Vui lòng nhập tên điểm ghim mới.");
      return;
    }

    onSubmitAddCustomPin({
      type: pinType,
      name: pinName.trim(),
      location:
        pinLocation.trim() ||
        (detectedZone ? `${detectedZone.name}, Khu phố 3` : "Khu phố 3, Phường An Phú"),
      status: pinStatus,
      lat: parsedCoord.lat,
      lng: parsedCoord.lng,
      toNumber: detectedZone?.toNumber || null,
      coverageMeters:
        pinType === "camera" ? 60 : pinType === "fire" ? 100 : pinType === "light" ? 45 : undefined,
      details:
        pinDetails.trim() || "Điểm dữ liệu GIS do Ban Điều Hành Khu phố 3 cập nhật trực tiếp.",
    });

    setPinName("");
    setPinDetails("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Thiết lập & Ghim vị trí trên Bản đồ GIS KP3"
      description="Gắn tọa độ nhanh cho hộ dân, cơ sở kinh doanh hoặc điểm hạ tầng bằng 1 chạm trên bản đồ"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="gis-pin-form"
            className="min-h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Lưu vị trí lên Bản đồ GIS
          </button>
        </div>
      }
    >
      <form id="gis-pin-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Mode tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: "custom" as const, label: "Ghim hạ tầng / Điểm mới" },
            { id: "household" as const, label: "Gắn vị trí Hộ dân" },
            { id: "business" as const, label: "Gắn vị trí Kinh doanh" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setErrorText("");
              }}
              className={`min-h-9 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                mode === tab.id
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mode-specific fields */}
        {mode === "household" && (
          <ReportSelect
            label="Chọn Hộ gia đình (ưu tiên hộ chưa có tọa độ)"
            value={selectedHouseholdId}
            onChange={setSelectedHouseholdId}
            options={householdOptions}
          />
        )}

        {mode === "business" && (
          <ReportSelect
            label="Chọn Cơ sở kinh doanh / Nhà trọ"
            value={selectedBusinessId}
            onChange={setSelectedBusinessId}
            options={businessOptions}
          />
        )}

        {mode === "custom" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReportSelect
                label="Phân loại điểm ghim"
                value={pinType}
                onChange={(v) => setPinType(v as GisPinType)}
                options={[
                  { value: "camera", label: "Camera An ninh AI (vùng phủ 60 m)" },
                  { value: "fire", label: "Trụ nước / Điểm PCCC (vùng phủ 100 m)" },
                  { value: "light", label: "Đèn Smart LED (vùng phủ 45 m)" },
                  { value: "civic", label: "Điểm hành chính / Chốt ANTT KP3" },
                  { value: "custom", label: "Điểm ghim bổ sung khác" },
                ]}
              />
              <ReportSelect
                label="Trạng thái vận hành"
                value={pinStatus}
                onChange={(v) => setPinStatus(v as GisPin["status"])}
                options={[
                  { value: "Hoạt động", label: "Hoạt động bình thường" },
                  { value: "Cảnh báo", label: "Cần theo dõi / Cảnh báo" },
                  { value: "Bảo trì", label: "Đang bảo trì kỹ thuật" },
                ]}
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Tên điểm ghim *
              </label>
              <input
                type="text"
                value={pinName}
                onChange={(e) => setPinName(e.target.value)}
                placeholder="Ví dụ: Camera ngã tư Đường X1 - N2"
                className="w-full min-h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Địa chỉ / Tuyến đường
              </label>
              <input
                type="text"
                value={pinLocation}
                onChange={(e) => setPinLocation(e.target.value)}
                placeholder="Ví dụ: Đầu hẻm Tổ 8, Đường N1, Khu phố 3"
                className="w-full min-h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                rows={2}
                value={pinDetails}
                onChange={(e) => setPinDetails(e.target.value)}
                placeholder="Ghi chú phạm vi quan sát, thông số kỹ thuật hoặc tổ quản lý phụ trách..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>
        )}

        {/* Quick coordinate setup tools */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Compass size={14} className="text-emerald-700" /> Chọn tọa độ siêu nhanh
            </span>
            {parsedCoord && (
              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                {formatLatLngVN(parsedCoord.lat, parsedCoord.lng)}
                {detectedZone ? ` · ${detectedZone.shortLabel}` : ""}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRequestPickOnMap}
              className="min-h-9 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Crosshair size={14} /> Chạm lên bản đồ để chọn tọa độ
            </button>
            <button
              type="button"
              onClick={handleUseDeviceGps}
              className="min-h-9 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LocateFixed size={14} /> Lấy GPS hiện tại
            </button>
            <button
              type="button"
              onClick={handleAutoLocateByAddress}
              className="min-h-9 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} /> Ước lượng theo Tổ / Địa chỉ
            </button>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Hoặc dán trực tiếp tọa độ WGS-84 (Thập phân / DMS / link Google Maps)
            </label>
            <input
              type="text"
              value={coordInput}
              onChange={(e) => setCoordInput(e.target.value)}
              placeholder={`Ví dụ: 10.937000, 106.744700 hoặc 10°56'13"N 106°44'41"E`}
              className="w-full min-h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700"
            />
          </div>

          {gpsStatus && (
            <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-700" /> {gpsStatus}
            </p>
          )}
        </div>

        {errorText && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-700 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
