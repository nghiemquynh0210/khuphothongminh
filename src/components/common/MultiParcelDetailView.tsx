import React, { useState } from "react";
import {
  Eye,
  FileCheck,
  FileText,
  Home,
  Layers,
  X,
} from "lucide-react";
import { Business, BusinessFile, Household } from "../../types";
import {
  getUsageRightLabel,
  normalizeEntityLandParcels,
  summarizeLandParcels,
} from "../../utils/landParcelsUtils";
import { DetailGrid, DetailRow } from "./DetailRow";

interface MultiParcelDetailViewProps {
  entity: Partial<Household & Business>;
  title?: string;
}

export const MultiParcelDetailView: React.FC<MultiParcelDetailViewProps> = ({
  entity,
  title = "Hồ sơ Địa chính & Giấy chứng nhận QSDĐ (Sổ đỏ)",
}) => {
  const parcels = normalizeEntityLandParcels(entity);
  const summary = summarizeLandParcels(parcels);
  const [activeIdx, setActiveIdx] = useState(0);
  const [previewFile, setPreviewFile] = useState<{
    file: BusinessFile;
    label: string;
  } | null>(null);

  if (summary.totalCount === 0) {
    return null;
  }

  const safeIdx = activeIdx < parcels.length ? activeIdx : 0;
  const activeParcel = parcels[safeIdx];

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <FileCheck size={14} className="text-indigo-600" />
          <span>{title}</span>
        </h4>

        <div className="flex flex-wrap items-center gap-1.5">
          {summary.isMergedParcels ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
              <Layers size={12} className="text-indigo-700" />
              Ghép {String(summary.totalCount).padStart(2, "0")} thửa đất •{" "}
              {String(summary.totalCount).padStart(2, "0")} Sổ đỏ
              {summary.totalArea > 0 ? ` • Tổng ${summary.totalArea} m²` : ""}
            </span>
          ) : (
            summary.soGcnSummary && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                GCN: {summary.soGcnSummary}
              </span>
            )
          )}
        </div>
      </div>

      {/* Nếu ghép từ 02 thửa đất trở lên: Thanh chuyển đổi nhanh từng cuốn Sổ đỏ */}
      {summary.isMergedParcels && (
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2.5">
          <DetailGrid hideEmpty compact>
            <DetailRow
              label="Tổ hợp thửa đất"
              value={`Tờ ${summary.toBanDoSummary || "—"} • Thửa ${
                summary.soThuaSummary
              }`}
              isMono
            />
            <DetailRow
              label="Tổng diện tích gộp"
              value={
                summary.totalArea > 0 ? `${summary.totalArea} m²` : undefined
              }
            />
            <DetailRow
              label="Danh sách Số GCN"
              value={summary.soGcnSummary}
              isMono
              colSpan={2}
            />
          </DetailGrid>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-indigo-200/60">
            {parcels.map((p, idx) => {
              const isSelected = idx === safeIdx;
              return (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-indigo-700 text-white border-indigo-700 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                  }`}
                >
                  <span>
                    Sổ #{idx + 1}: Thửa {p.soThua || "—"}
                  </span>
                  {p.dienTich ? (
                    <span
                      className={`text-[10.5px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.dienTich} m²
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chi tiết chuẩn 1 hàng (DetailRow) cho Sổ đỏ đang chọn */}
      {activeParcel && (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
          {summary.isMergedParcels && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <FileText size={13} className="text-indigo-600" />
                {activeParcel.parcelLabel || `Sổ đỏ #${safeIdx + 1}`}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {getUsageRightLabel(activeParcel.usageRightType)}
                </span>
                {activeParcel.sourceHouseholdCode && (
                  <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                    <Home size={11} /> Kế thừa {activeParcel.sourceHouseholdCode}
                  </span>
                )}
              </div>
            </div>
          )}

          <DetailGrid hideEmpty compact>
            <DetailRow
              label="Tờ bản đồ số"
              value={activeParcel.toBanDo}
              isMono
            />
            <DetailRow
              label="Số thửa đất"
              value={activeParcel.soThua}
              isMono
            />
            <DetailRow
              label="Diện tích thửa"
              value={
                activeParcel.dienTich
                  ? `${activeParcel.dienTich} m²`
                  : undefined
              }
            />
            <DetailRow
              label="Mục đích / Loại đất"
              value={activeParcel.loaiDat || "Đất ở tại đô thị (ODT)"}
            />
            <DetailRow
              label="Chủ sử dụng trên GCN"
              value={activeParcel.tenChuSuDung}
            />
            <DetailRow
              label="Số phát hành GCN"
              value={activeParcel.soGcn}
              isMono
              copyValue={activeParcel.soGcn}
            />
            <DetailRow
              label="Số vào sổ cấp GCN"
              value={activeParcel.soVaoSo}
              isMono
            />
            <DetailRow
              label="Ngày cấp GCN"
              value={activeParcel.ngayCapGcn}
              isMono
            />
            {activeParcel.addressNote && (
              <DetailRow
                label="Vị trí thửa đất"
                value={activeParcel.addressNote}
                colSpan={2}
              />
            )}
          </DetailGrid>

          {activeParcel.soDoFile && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 text-xs">
                <FileText size={15} className="text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">
                  {activeParcel.soDoFile.name}
                </span>
                {activeParcel.soDoFile.size && (
                  <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                    ({activeParcel.soDoFile.size})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setPreviewFile({
                    file: activeParcel.soDoFile!,
                    label:
                      activeParcel.parcelLabel ||
                      `Sổ đỏ Thửa ${activeParcel.soThua || safeIdx + 1}`,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold cursor-pointer shrink-0"
              >
                <Eye size={13} />
                <span>Xem Sổ đỏ</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox xem tệp Sổ đỏ */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {previewFile.label} — {previewFile.file.name}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                aria-label="Đóng xem trước Sổ đỏ"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
              {previewFile.file.type === "pdf" ? (
                <iframe
                  src={previewFile.file.url}
                  title={previewFile.file.name}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewFile.file.url}
                  alt={previewFile.file.name}
                  className="max-h-[72vh] w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiParcelDetailView;
