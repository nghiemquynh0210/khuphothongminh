import React, { useEffect } from "react";
import {
  Check,
  FileCheck,
  Home,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { BusinessLicenseOcrData, Household, Resident } from "../../types";

interface BusinessLicenseOcrConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrData: BusinessLicenseOcrData | null;
  modeType?: "enterprise" | "business";
  currentValues: {
    businessName: string;
    licenseNumber: string;
    businessType?: string;
    issueDate?: string;
    issuingAuthority?: string;
    headquartersAddress?: string;
    businessLine?: string;
    charterCapital?: string;
    legalRepresentative?: string;
    legalRepCccd?: string;
    legalRepPhone?: string;
  };
  matchedResident?: Resident | null;
  matchedHouseholds?: Household[];
  onApply: (applyHouseholdLink: boolean) => void;
}

export const BusinessLicenseOcrConfirmModal: React.FC<
  BusinessLicenseOcrConfirmModalProps
> = ({
  isOpen,
  onClose,
  ocrData,
  modeType = "business",
  currentValues,
  matchedResident,
  matchedHouseholds = [],
  onApply,
}) => {
  const [autoLinkHouseholds, setAutoLinkHouseholds] = React.useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setAutoLinkHouseholds(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ocrData) return null;

  const rows = [
    {
      label:
        modeType === "enterprise"
          ? "Tên Doanh nghiệp"
          : "Tên Cơ sở / Hộ kinh doanh",
      ocr: ocrData.businessName,
      current: currentValues.businessName || "Chưa có",
    },
    {
      label:
        modeType === "enterprise"
          ? "Mã số doanh nghiệp / MST"
          : "Số Giấy phép KD / ĐKHKD",
      ocr: ocrData.licenseNumber || ocrData.taxCode,
      current: currentValues.licenseNumber || "Chưa có",
    },
    {
      label: "Loại hình đăng ký",
      ocr: ocrData.businessType,
      current: currentValues.businessType || "Chưa có",
    },
    {
      label: "Ngày cấp / Đăng ký",
      ocr: ocrData.issueDate,
      current: currentValues.issueDate || "Chưa có",
    },
    {
      label: "Cơ quan cấp phép",
      ocr: ocrData.issuingAuthority,
      current: currentValues.issuingAuthority || "Chưa có",
    },
    {
      label: "Địa chỉ trụ sở / Mặt bằng",
      ocr: ocrData.headquartersAddress,
      current: currentValues.headquartersAddress || "Chưa có",
    },
    {
      label: "Ngành nghề kinh doanh chính",
      ocr: ocrData.businessLine,
      current: currentValues.businessLine || "Chưa có",
    },
    {
      label: "Vốn điều lệ / Vốn KD",
      ocr: ocrData.charterCapital,
      current: currentValues.charterCapital || "Chưa có",
    },
    {
      label: "Người đại diện / Chủ hộ KD",
      ocr: ocrData.legalRepresentative,
      current: currentValues.legalRepresentative || "Chưa có",
    },
    {
      label: "Số CCCD / ĐDCN",
      ocr: ocrData.legalRepCccd,
      current: currentValues.legalRepCccd || "Chưa có",
    },
    {
      label: "Số điện thoại trên GP",
      ocr: ocrData.legalRepPhone,
      current: currentValues.legalRepPhone || "Chưa có",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <Sparkles size={18} className="text-amber-300" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Kết Quả AI OCR Giấy Phép Kinh Doanh / ĐKDN
              </h3>
              <p className="text-[11px] text-emerald-200">
                {ocrData.ocrSource === "gemini_vision"
                  ? "Trích xuất tự động qua AI Vision từ hình ảnh/PDF giấy phép"
                  : "Trích xuất tự động các trường thông tin pháp lý từ tệp giấy phép"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại OCR Giấy phép"
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
            <FileCheck size={17} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Đã nhận diện thông tin pháp lý từ Giấy phép kinh doanh. Kiểm tra bảng
              đối chiếu bên dưới trước khi tự động điền vào biểu mẫu.
            </span>
          </div>

          {/* Liên kết tự động phát hiện được */}
          {(matchedResident || matchedHouseholds.length > 0) && (
            <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/90 space-y-2 text-xs">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                <span>Đối khớp tự động với Cơ sở dữ liệu Khu phố 3:</span>
              </div>

              {matchedResident && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100 text-slate-800">
                  <UserCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    Người đại diện khớp cư dân KP3:{" "}
                    <strong>{matchedResident.fullName}</strong> (
                    {matchedResident.status} • CCCD:{" "}
                    <span className="font-mono">{matchedResident.cccd}</span>)
                  </span>
                </div>
              )}

              {matchedHouseholds.length > 0 && (
                <label className="flex items-start gap-2 bg-white px-2.5 py-2 rounded-lg border border-indigo-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoLinkHouseholds}
                    onChange={(e) => setAutoLinkHouseholds(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <Home size={13} className="text-emerald-600" />
                      <span>
                        Tự động liên kết{" "}
                        {matchedHouseholds.length === 1
                          ? `Sổ hộ khẩu ${matchedHouseholds[0].code}`
                          : `${matchedHouseholds.length} Sổ hộ khẩu cùng địa chỉ (${matchedHouseholds
                              .map((h) => h.code)
                              .join(", ")})`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chủ hộ:{" "}
                      {matchedHouseholds.map((h) => h.ownerName).join(" & ")} —
                      Hỗ trợ kế thừa nhanh Sổ đỏ (GCN QSDĐ) tại mục Địa chính.
                    </p>
                  </div>
                </label>
              )}
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left w-[30%]">
                    Trường Pháp lý
                  </th>
                  <th className="py-2.5 px-3 text-left w-[30%]">
                    Dữ liệu hiện tại
                  </th>
                  <th className="py-2.5 px-3 text-left bg-emerald-50/70 text-emerald-900 w-[40%]">
                    <span className="flex items-center gap-1 font-black">
                      <Sparkles size={12} className="text-emerald-600" />
                      Nhận diện OCR tự động
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-medium text-slate-700">
                      {row.label}
                    </td>
                    <td className="py-2 px-3 text-slate-500 break-words">
                      {row.current}
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-950 bg-emerald-50/30 break-words">
                      {row.ocr ? (
                        <span className="inline-flex items-start gap-1">
                          <Check
                            size={12}
                            className="text-emerald-600 shrink-0 mt-0.5"
                          />
                          <span>{row.ocr}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">
                          Không có trên tệp
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Giữ nguyên / Tự nhập tay
          </button>
          <button
            type="button"
            onClick={() => onApply(autoLinkHouseholds)}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check size={14} />
            <span>Áp dụng kết quả OCR vào Hồ sơ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessLicenseOcrConfirmModal;
