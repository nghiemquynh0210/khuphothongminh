import React, { useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Home,
  Image as ImageIcon,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { BusinessFile, Household, LandParcelCertificate } from "../../types";
import {
  extractLandCertificateFromFile,
  LandCertificateOcrResult,
} from "../../utils/landCertificateOcr";
import {
  createEmptyLandParcel,
  inheritParcelsFromHouseholds,
  summarizeLandParcels,
} from "../../utils/landParcelsUtils";
import { SoDoOcrConfirmModal } from "../business/SoDoOcrConfirmModal";
import { uploadFileToStorageBucket } from "../../utils/imageUpload";

interface MultiParcelEditorProps {
  sectionTitle?: string;
  parcels: LandParcelCertificate[];
  onChange: (nextParcels: LandParcelCertificate[]) => void;
  linkedHouseholds?: Household[];
  defaultOwnerName?: string;
  defaultAddress?: string;
  onNotice?: (notice: {
    type: "success" | "warning" | "error" | "info";
    message: string;
  }) => void;
}

export const MultiParcelEditor: React.FC<MultiParcelEditorProps> = ({
  sectionTitle = "6. Thông tin Địa chính & Giấy chứng nhận QSDĐ (Hỗ trợ Ghép Thửa / Nhiều Sổ Đỏ)",
  parcels,
  onChange,
  linkedHouseholds = [],
  defaultOwnerName = "",
  defaultAddress = "",
  onNotice,
}) => {
  const [activeOcrIdx, setActiveOcrIdx] = useState<number | null>(null);
  const [pendingOcrTargetIdx, setPendingOcrTargetIdx] = useState<number | null>(
    null
  );
  const [pendingOcrData, setPendingOcrData] =
    useState<LandCertificateOcrResult | null>(null);
  const [previewFile, setPreviewFile] = useState<BusinessFile | null>(null);

  const effectiveParcels: LandParcelCertificate[] =
    parcels.length > 0
      ? parcels
      : [
          createEmptyLandParcel(0, {
            tenChuSuDung: defaultOwnerName,
            addressNote: defaultAddress,
          }),
        ];

  const summary = summarizeLandParcels(effectiveParcels);

  const updateParcelAt = (
    idx: number,
    patch: Partial<LandParcelCertificate>
  ) => {
    const next = effectiveParcels.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );
    onChange(next);
  };

  const handleAddEmptyParcel = () => {
    const nextIdx = effectiveParcels.length;
    const prevToBanDo = effectiveParcels[0]?.toBanDo || "272";
    const next = [
      ...effectiveParcels,
      createEmptyLandParcel(nextIdx, {
        toBanDo: prevToBanDo,
        tenChuSuDung: defaultOwnerName,
        addressNote: defaultAddress,
      }),
    ];
    onChange(next);
    onNotice?.({
      type: "info",
      message: `Đã thêm Thửa ghép #${
        nextIdx + 1
      }. Bạn có thể nhập số thửa hoặc tải ảnh/PDF Sổ đỏ thứ ${
        nextIdx + 1
      } để quét OCR tự động.`,
    });
  };

  const handleRemoveParcel = (idx: number) => {
    if (effectiveParcels.length <= 1) {
      onChange([
        createEmptyLandParcel(0, {
          tenChuSuDung: defaultOwnerName,
          addressNote: defaultAddress,
        }),
      ]);
      return;
    }
    const next = effectiveParcels.filter((_, i) => i !== idx);
    onChange(next);
  };

  const handleInheritFromHouseholds = () => {
    if (linkedHouseholds.length === 0) return;
    const { nextParcels, addedCount } = inheritParcelsFromHouseholds(
      linkedHouseholds,
      effectiveParcels
    );
    if (addedCount > 0) {
      onChange(nextParcels);
      onNotice?.({
        type: "success",
        message: `Đã kế thừa ${addedCount} thửa đất / Sổ đỏ từ Sổ hộ khẩu liên kết (${linkedHouseholds
          .map((h) => h.code)
          .join(", ")})!`,
      });
    } else {
      onNotice?.({
        type: "info",
        message:
          "Các thửa đất từ Hộ khẩu liên kết đã có trong danh sách hoặc Hộ khẩu chưa khai báo Sổ đỏ.",
      });
    }
  };

  const readFileToBusinessFile = (
    file: File,
    onReady: (fileObj: BusinessFile, localDataUrl: string) => void
  ) => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      onNotice?.({
        type: "error",
        message: "Chỉ hỗ trợ tệp Sổ đỏ định dạng PDF hoặc hình ảnh (JPG, PNG, WebP)!",
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      onNotice?.({
        type: "error",
        message: "Dung lượng tệp tối đa cho phép là 25MB!",
      });
      return;
    }

    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const reader = new FileReader();
    reader.onload = async () => {
      const localDataUrl = String(reader.result || "");
      let resolvedUrl = localDataUrl;
      try {
        const uploadedUrl = await uploadFileToStorageBucket(
          file,
          "cadastral-docs",
          "so-do"
        );
        if (uploadedUrl) {
          resolvedUrl = uploadedUrl;
        }
      } catch {
        // Fallback to localDataUrl when offline
      }
      onReady(
        {
          name: file.name,
          url: resolvedUrl,
          type: isPdf ? "pdf" : "image",
          size: formattedSize,
          uploadDate: new Date().toLocaleDateString("vi-VN"),
        },
        localDataUrl
      );
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSoDoForParcel = (idx: number, file: File) => {
    readFileToBusinessFile(file, async (fileObj, localDataUrl) => {
      const currentList = [...effectiveParcels];
      const target = currentList[idx] || createEmptyLandParcel(idx);
      currentList[idx] = { ...target, soDoFile: fileObj };
      onChange(currentList);

      setActiveOcrIdx(idx);
      try {
        const ocrRes = await extractLandCertificateFromFile(file, {
          parcelIndex: idx,
          existingDataUrl: localDataUrl,
          toBanDo: target.toBanDo || undefined,
          soThua: target.soThua || undefined,
          dienTich: target.dienTich ? String(target.dienTich) : undefined,
          loaiDat: target.loaiDat || undefined,
          tenChuSuDung: target.tenChuSuDung || defaultOwnerName || undefined,
          soGcn: target.soGcn || undefined,
          soVaoSo: target.soVaoSo || undefined,
        });
        currentList[idx] = {
          ...currentList[idx],
          soDoFile: fileObj,
          soDoOcrData: ocrRes,
        };
        onChange(currentList);
        setPendingOcrTargetIdx(idx);
        setPendingOcrData(ocrRes);
      } catch {
        onNotice?.({
          type: "warning",
          message: "Đã đính kèm tệp Sổ đỏ. Vui lòng kiểm tra các trường địa chính.",
        });
      } finally {
        setActiveOcrIdx(null);
      }
    });
  };

  const handleUploadNewAdditionalSoDo = (file: File) => {
    // Nếu thửa đầu tiên hoàn toàn trống thì điền vào thửa đầu tiên, ngược lại tự tạo thêm thửa ghép mới!
    const first = effectiveParcels[0];
    const isFirstBlank =
      effectiveParcels.length === 1 &&
      !first.soDoFile &&
      !String(first.soGcn || "").trim() &&
      !String(first.soThua || "").trim();

    if (isFirstBlank) {
      handleUploadSoDoForParcel(0, file);
      return;
    }

    const newIdx = effectiveParcels.length;
    const prevToBanDo = effectiveParcels[0]?.toBanDo || "272";
    const appended = [
      ...effectiveParcels,
      createEmptyLandParcel(newIdx, {
        toBanDo: prevToBanDo,
        tenChuSuDung: defaultOwnerName,
        addressNote: defaultAddress,
      }),
    ];
    onChange(appended);

    readFileToBusinessFile(file, async (fileObj, localDataUrl) => {
      const updated = [...appended];
      updated[newIdx] = { ...updated[newIdx], soDoFile: fileObj };
      onChange(updated);

      setActiveOcrIdx(newIdx);
      try {
        const ocrRes = await extractLandCertificateFromFile(file, {
          parcelIndex: newIdx,
          existingDataUrl: localDataUrl,
          toBanDo: prevToBanDo,
          tenChuSuDung: defaultOwnerName || undefined,
        });
        updated[newIdx] = {
          ...updated[newIdx],
          soDoFile: fileObj,
          soDoOcrData: ocrRes,
        };
        onChange(updated);
        setPendingOcrTargetIdx(newIdx);
        setPendingOcrData(ocrRes);
      } finally {
        setActiveOcrIdx(null);
      }
    });
  };

  const handleApplyConfirmedOcr = () => {
    if (pendingOcrTargetIdx === null || !pendingOcrData) return;
    const idx = pendingOcrTargetIdx;
    const target = effectiveParcels[idx];
    if (!target) return;

    updateParcelAt(idx, {
      toBanDo: pendingOcrData.toBanDo || target.toBanDo,
      soThua: pendingOcrData.soThua || target.soThua,
      dienTich: pendingOcrData.dienTich || target.dienTich,
      loaiDat: pendingOcrData.loaiDat || target.loaiDat,
      tenChuSuDung: pendingOcrData.tenChuSuDung || target.tenChuSuDung,
      soGcn: pendingOcrData.soGcn || target.soGcn,
      soVaoSo: pendingOcrData.soVaoSo || target.soVaoSo,
      ngayCapGcn: pendingOcrData.ngayCap || target.ngayCapGcn,
      soDoOcrData: pendingOcrData,
    });

    setPendingOcrTargetIdx(null);
    setPendingOcrData(null);
    onNotice?.({
      type: "success",
      message: `✓ Đã điền dữ liệu OCR Sổ đỏ #${idx + 1} (Tờ ${
        pendingOcrData.toBanDo
      }, Thửa ${pendingOcrData.soThua})!`,
    });
  };

  const hasHouseholdParcelsToInherit = linkedHouseholds.some(
    (h) =>
      Boolean(h.toBanDo || h.soThua || h.soGcn || h.soDoFile) ||
      (Array.isArray(h.landParcels) && h.landParcels.length > 0)
  );

  return (
    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3.5">
      {/* Header & Thanh tổng hợp đa thửa đất */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-indigo-600" />
            <span>{sectionTitle}</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Trường hợp mặt bằng ghép 02+ thửa đất liền kề hoặc có từ 02 Sổ đỏ trở
            lên, nhấn <strong>+ Thêm Thửa đất ghép</strong> để lưu đầy đủ từng sổ
            và tự cộng tổng diện tích.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-950 border border-indigo-200">
            <Layers size={12} className="text-indigo-700" />
            {effectiveParcels.length} Thửa đất •{" "}
            {summary.totalArea > 0 ? `Tổng ${summary.totalArea} m²` : "Chưa nhập DT"}
          </span>
        </div>
      </div>

      {/* Cụm nút hành động nhanh: Kế thừa từ Hộ khẩu & Thêm thửa ghép / Quét thêm Sổ đỏ */}
      <div className="flex flex-wrap items-center gap-2">
        {linkedHouseholds.length > 0 && hasHouseholdParcelsToInherit && (
          <button
            type="button"
            onClick={handleInheritFromHouseholds}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <Download size={13} className="text-emerald-700" />
            <span>
              Kế thừa Sổ đỏ từ Hộ khẩu ({linkedHouseholds.map((h) => h.code).join(", ")})
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleAddEmptyParcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus size={13} />
          <span>Thêm Thửa đất ghép (#{effectiveParcels.length + 1})</span>
        </button>

        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer">
          <Sparkles size={13} />
          <span>+ Tải Sổ đỏ mới &amp; Quét OCR tự động</span>
          <input
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUploadNewAdditionalSoDo(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>

      {/* Danh sách từng Thửa đất / Sổ đỏ */}
      <div className="space-y-3">
        {effectiveParcels.map((parcel, idx) => {
          const isScanning = activeOcrIdx === idx;
          return (
            <div
              key={parcel.id || idx}
              className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold font-mono shrink-0">
                    Sổ #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={parcel.parcelLabel || ""}
                    onChange={(e) =>
                      updateParcelAt(idx, { parcelLabel: e.target.value })
                    }
                    placeholder={
                      idx === 0 ? "Thửa chính (#1)" : `Thửa ghép #${idx + 1}`
                    }
                    className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-indigo-500 max-w-full"
                  />

                  <select
                    aria-label={`Hình thức sử dụng thửa ${idx + 1}`}
                    value={parcel.usageRightType || (idx === 0 ? "owned" : "merged")}
                    onChange={(e) =>
                      updateParcelAt(idx, {
                        usageRightType:
                          e.target.value as LandParcelCertificate["usageRightType"],
                      })
                    }
                    className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:border-indigo-500 cursor-pointer max-w-full"
                  >
                    <option value="owned">Thuộc chủ cơ sở / Chủ hộ</option>
                    <option value="merged">Thửa ghép mở rộng mặt bằng</option>
                    <option value="leased">Thuê mặt bằng / QSDĐ</option>
                    <option value="co_owned">Đồng sở hữu / Sử dụng chung</option>
                  </select>

                  {parcel.sourceHouseholdCode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-mono font-bold">
                      <Home size={11} /> Từ hộ {parcel.sourceHouseholdCode}
                    </span>
                  )}
                </div>

                {effectiveParcels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParcel(idx)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Gỡ thửa đất này khỏi danh sách"
                  >
                    <Trash2 size={13} />
                    <span>Gỡ thửa #{idx + 1}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Tờ bản đồ số
                  </label>
                  <input
                    type="text"
                    placeholder="272"
                    value={parcel.toBanDo}
                    onChange={(e) =>
                      updateParcelAt(idx, { toBanDo: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Thửa đất số
                  </label>
                  <input
                    type="text"
                    placeholder={String(55 + idx)}
                    value={parcel.soThua}
                    onChange={(e) =>
                      updateParcelAt(idx, { soThua: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Diện tích (m²)
                  </label>
                  <input
                    type="text"
                    placeholder="120"
                    value={parcel.dienTich ?? ""}
                    onChange={(e) =>
                      updateParcelAt(idx, { dienTich: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Loại đất
                  </label>
                  <input
                    type="text"
                    placeholder="ODT, TMD..."
                    value={parcel.loaiDat || ""}
                    onChange={(e) =>
                      updateParcelAt(idx, { loaiDat: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Người đứng tên trên Sổ đỏ #{idx + 1}
                  </label>
                  <input
                    type="text"
                    placeholder="Họ và tên chủ sử dụng đất"
                    value={parcel.tenChuSuDung || ""}
                    onChange={(e) =>
                      updateParcelAt(idx, { tenChuSuDung: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Số phát hành GCN (Seri)
                  </label>
                  <input
                    type="text"
                    placeholder="CS 038291"
                    value={parcel.soGcn || ""}
                    onChange={(e) =>
                      updateParcelAt(idx, { soGcn: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Số vào sổ cấp GCN
                  </label>
                  <input
                    type="text"
                    placeholder="CH 01234"
                    value={parcel.soVaoSo || ""}
                    onChange={(e) =>
                      updateParcelAt(idx, { soVaoSo: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tệp đính kèm & OCR riêng cho từng Sổ đỏ */}
              <div className="pt-1">
                {isScanning ? (
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center gap-2 text-xs text-indigo-800 font-bold">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Đang bóc tách AI OCR Sổ đỏ #{idx + 1}...</span>
                  </div>
                ) : parcel.soDoFile ? (
                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {parcel.soDoFile.type === "pdf" ? (
                        <FileText size={17} className="text-rose-600 shrink-0" />
                      ) : (
                        <ImageIcon size={17} className="text-indigo-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {parcel.soDoFile.name}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          Sổ đỏ #{idx + 1} • {parcel.soDoFile.size || "Đã tải"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(parcel.soDoFile!)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Eye size={12} /> Xem
                      </button>
                      <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-[11px] font-bold text-white cursor-pointer">
                        <Upload size={11} /> Đổi &amp; OCR
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadSoDoForParcel(idx, e.target.files[0]);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateParcelAt(idx, {
                            soDoFile: undefined,
                            soDoOcrData: undefined,
                          })
                        }
                        aria-label={`Xóa tệp Sổ đỏ ${idx + 1}`}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-2.5 bg-slate-50/60 hover:bg-indigo-50/30 transition-colors flex flex-wrap items-center justify-between gap-2 cursor-pointer">
                    <span className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Upload size={14} className="text-indigo-600 shrink-0" />
                      <span>
                        Đính kèm ảnh chụp / PDF{" "}
                        <strong>Sổ đỏ #{idx + 1}</strong> (Tự động nhận diện OCR)
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 shrink-0">
                      Chọn tệp ➜
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadSoDoForParcel(idx, e.target.files[0]);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal xác nhận OCR cho đúng thửa đang quét */}
      <SoDoOcrConfirmModal
        isOpen={pendingOcrTargetIdx !== null && Boolean(pendingOcrData)}
        onClose={() => {
          setPendingOcrTargetIdx(null);
          setPendingOcrData(null);
        }}
        ocrData={pendingOcrData}
        currentValues={{
          toBanDo:
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.toBanDo) ||
            "",
          soThua:
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.soThua) ||
            "",
          dienTich: String(
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.dienTich) ||
              ""
          ),
          loaiDat:
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.loaiDat) ||
            "",
          tenChuSuDung:
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.tenChuSuDung) ||
            "",
          soGcn:
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.soGcn) ||
            "",
          soVaoSo:
            (pendingOcrTargetIdx !== null &&
              effectiveParcels[pendingOcrTargetIdx]?.soVaoSo) ||
            "",
        }}
        onApply={handleApplyConfirmedOcr}
      />

      {/* Lightbox xem Sổ đỏ */}
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
                Xem tệp Sổ đỏ: {previewFile.name}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                aria-label="Đóng xem trước"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
              {previewFile.type === "pdf" ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
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

export default MultiParcelEditor;
