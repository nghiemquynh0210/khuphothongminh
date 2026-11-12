import React from "react";
import { CheckCircle2, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Business, Household } from "../../types";
import { extractToDanPhoNumber } from "../../data/gisConfig";
import { formatVNNumber } from "../../utils/numberFormat";

interface GisSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingHouseholds: Household[];
  missingBusinesses: Business[];
  unpinnedReportCount: number;
  onConfirmSyncAll: () => void;
}

export default function GisSyncModal({
  isOpen,
  onClose,
  missingHouseholds,
  missingBusinesses,
  unpinnedReportCount,
  onConfirmSyncAll,
}: GisSyncModalProps) {
  const totalMissing = missingHouseholds.length + missingBusinesses.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Đồng bộ Tọa độ GIS theo Cụm địa bàn KP3"
      description="Tự động phân bổ tọa độ thực địa vào đúng phân khu bản đồ trên địa bàn Khu phố 3 cho dữ liệu chưa gắn GPS"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={totalMissing === 0}
            onClick={() => {
              onConfirmSyncAll();
              onClose();
            }}
            className="min-h-9 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            {totalMissing > 0
              ? `Gắn tọa độ tự động (${formatVNNumber(totalMissing)} hồ sơ)`
              : "Tất cả hồ sơ đã có tọa độ"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-600 block">Hộ dân chưa có tọa độ</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {formatVNNumber(missingHouseholds.length)} hộ
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-600 block">Cơ sở KD chưa có tọa độ</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {formatVNNumber(missingBusinesses.length)} cơ sở
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-600 block">Phản ánh 1022 ước lượng vị trí</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {formatVNNumber(unpinnedReportCount)} phản ánh
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
          <Sparkles size={16} className="text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Hệ thống đọc địa chỉ của từng hộ dân và cơ sở kinh doanh trên địa bàn để đặt ghim vào đúng phân khu bản đồ Khu phố 3. Sau khi đồng bộ, cán bộ vẫn có thể chỉnh lại từng điểm bằng 1 chạm thực địa.
          </p>
        </div>

        {totalMissing === 0 ? (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-700 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-700" />
            <span className="font-bold">Toàn bộ hộ gia đình và cơ sở kinh doanh đã có tọa độ GIS.</span>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-bold text-slate-800">
              Xem trước hồ sơ sẽ được gắn tọa độ (tối đa 8 mục đầu)
            </div>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto evon-scroll">
              {[
                ...missingHouseholds.map((h) => ({
                  id: h.id,
                  title: `${h.code} · ${h.ownerName}`,
                  address: h.address,
                  kind: "Hộ dân",
                  toNum: extractToDanPhoNumber(h.address),
                })),
                ...missingBusinesses.map((b) => ({
                  id: b.id,
                  title: b.name,
                  address: b.address,
                  kind: "Kinh doanh",
                  toNum: extractToDanPhoNumber(b.address),
                })),
              ]
                .slice(0, 8)
                .map((row) => (
                  <div key={row.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{row.title}</div>
                      <div className="text-slate-600 truncate flex items-center gap-1">
                        <MapPin size={12} className="shrink-0" /> {row.address}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold text-slate-800">
                        {row.kind}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 font-bold text-emerald-900">
                        {row.toNum ? `Phân khu GIS #${row.toNum}` : "Trung tâm KP3"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
