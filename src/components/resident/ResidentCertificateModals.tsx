import React from "react";
import { Download, Globe, Printer, X } from "lucide-react";
import { Resident } from "../../types";
import {
  downloadNA17Doc,
  getCountryFlag,
  getVisaExpiryStatus
} from "../../utils/residentFormUtils";

interface ResidentCertificateModalProps {
  resident: Resident | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResidentCT07Modal({
  resident,
  isOpen,
  onClose
}: ResidentCertificateModalProps) {
  if (!isOpen || !resident) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem và in Giấy xác nhận thông tin cư trú Mẫu CT07"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="text-emerald-400" size={18} />
            <h3 className="font-bold text-sm">
              Xem & In Giấy Xác Nhận Thông Tin Cư Trú (Mẫu CT07)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng mẫu CT07"
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-slate-900 font-serif leading-relaxed bg-white">
          <div className="text-center space-y-1 border-b border-slate-200 pb-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="text-[11px] font-semibold text-slate-600">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-24 h-0.5 bg-slate-400 mx-auto mt-1" />
            <div className="pt-2 text-[10px] text-slate-500 font-sans">
              Mẫu CT07 ban hành kèm theo Thông tư số 56/2021/TT-BCA ngày 15/5/2021 của Bộ Công an
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-base font-bold uppercase tracking-tight text-slate-900">
              XÁC NHẬN THÔNG TIN VỀ CƯ TRÚ
            </h2>
            <p className="text-xs text-slate-500 font-sans italic">
              Kính gửi: Công an Phường An Phú, TP. Hồ Chí Minh
            </p>
          </div>

          <div className="space-y-2 text-xs font-sans">
            <p>
              <strong>1. Họ, chữ đệm và tên khai sinh:</strong>{" "}
              <span className="uppercase font-bold text-emerald-800">{resident.fullName}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <p>
                <strong>2. Ngày, tháng, năm sinh:</strong> {resident.birthDate}
              </p>
              <p>
                <strong>3. Giới tính:</strong> {resident.gender}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p>
                <strong>4. Số định danh cá nhân / CCCD:</strong>{" "}
                <span className="font-mono font-bold">{resident.cccd}</span>
              </p>
              <p>
                <strong>5. Dân tộc:</strong> {resident.ethnicity || "Kinh"} -{" "}
                <strong>Tôn giáo:</strong> {resident.religion || "Không"}
              </p>
            </div>
            <p>
              <strong>6. Quốc tịch:</strong> {resident.nationality || "Việt Nam"}
            </p>
            <p>
              <strong>7. Quê quán:</strong> {resident.hometown || "Chưa cập nhật"}
            </p>
            <p>
              <strong>8. Nơi thường trú:</strong> {resident.permanentAddress || resident.address}
            </p>
            <p>
              <strong>9. Nơi ở hiện tại:</strong> {resident.temporaryAddress || resident.address}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <p>
                <strong>10. Mã số hộ khẩu:</strong>{" "}
                <span className="font-mono font-semibold">{resident.householdId}</span>
              </p>
              <p>
                <strong>11. Quan hệ với chủ hộ:</strong> {resident.relationToOwner}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p>
                <strong>12. Trình độ học vấn:</strong> {resident.education || "12/12"}
              </p>
              <p>
                <strong>13. Nghề nghiệp:</strong> {resident.occupation || "Tự do"}
              </p>
            </div>
            {resident.healthInsuranceNumber && (
              <p>
                <strong>14. Mã số BHYT / Y tế:</strong>{" "}
                <span className="font-mono">{resident.healthInsuranceNumber}</span>
              </p>
            )}
            {resident.policyGroup && resident.policyGroup !== "Bình thường" && (
              <p>
                <strong>15. Diện chính sách / Đoàn thể:</strong>{" "}
                <span className="font-semibold text-rose-700">{resident.policyGroup}</span>
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between items-start text-xs font-sans">
            <div className="text-center space-y-1">
              <p className="font-bold">NGƯỜI YÊU CẦU XÁC NHẬN</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-14" />
              <p className="font-semibold">{resident.fullName}</p>
            </div>
            <div className="text-center space-y-1">
              <p className="italic text-[11px]">
                TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm{" "}
                {new Date().getFullYear()}
              </p>
              <p className="font-bold text-slate-900">CÔNG AN PHƯỜNG AN PHÚ</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, đóng dấu)</p>
              <div className="h-14 flex items-center justify-center">
                <span className="px-2 py-1 border border-red-400 text-red-600 rounded text-[10px] font-bold uppercase rotate-[-6deg]">
                  ĐÃ XÁC NHẬN ĐIỆN TỬ
                </span>
              </div>
              <p className="font-semibold">Trung tá Lê Văn Sơn</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer text-xs font-semibold"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer text-xs font-bold flex items-center gap-2 shadow-xs"
          >
            <Printer size={15} /> In Giấy Xác Nhận (Print)
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResidentNA17Modal({
  resident,
  isOpen,
  onClose
}: ResidentCertificateModalProps) {
  if (!isOpen || !resident) return null;

  const exp = getVisaExpiryStatus(resident.visaValidUntil);

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Phiếu khai báo tạm trú cho người nước ngoài Mẫu NA17"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        <div className="bg-purple-950 text-white p-4 flex justify-between items-center shrink-0 border-b border-purple-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-800/80 rounded-lg text-purple-200">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Phiếu Khai Báo Tạm Trú Cho Người Nước Ngoài (Mẫu NA17)
              </h3>
              <p className="text-[11px] text-purple-300">
                Thông tư 53/2016/TT-BCA & Luật số 47/2014/QH13 • Bộ Công an & QLXNC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng mẫu NA17"
            className="text-purple-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-slate-900 font-serif leading-relaxed bg-white">
          <div className="text-center space-y-1 border-b border-slate-200 pb-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / SOCIALIST REPUBLIC OF VIETNAM
            </h4>
            <p className="text-xs font-semibold text-slate-700">
              Độc lập - Tự do - Hạnh phúc / Independence - Freedom - Happiness
            </p>
            <div className="w-28 h-0.5 bg-slate-400 mx-auto mt-1" />
            <div className="pt-2 text-[10px] text-slate-500 font-sans">
              Mẫu NA17 ban hành kèm theo Thông tư số 53/2016/TT-BCA ngày 28/12/2016 của Bộ Công an
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
              PHIẾU KHAI BÁO TẠM TRÚ
            </h2>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 font-sans">
              TEMPORARY RESIDENCE DECLARATION FOR FOREIGNERS
            </h3>
            <p className="text-xs text-slate-500 font-sans italic pt-1">
              Kính gửi (To): Công an Phường An Phú, TP. Hồ Chí Minh
            </p>
          </div>

          <div className="space-y-2.5 text-xs font-sans text-slate-800">
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-900 font-bold block">
                  1. Họ và tên (chữ in hoa) / Full name (in capital letters):
                </span>
                <span className="text-sm font-black text-purple-950 uppercase tracking-wide">
                  {resident.fullName}
                </span>
              </div>
              <span className="text-xl" title={`Quốc tịch: ${resident.nationality}`}>
                {getCountryFlag(resident.nationality)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <strong>2. Giới tính / Sex:</strong> {resident.gender} (
                {resident.gender === "Nam" ? "Male" : "Female"})
              </div>
              <div>
                <strong>3. Ngày sinh / Date of birth:</strong> {resident.birthDate}
              </div>
              <div>
                <strong>4. Quốc tịch / Nationality:</strong>{" "}
                {resident.nationality || "Nước ngoài"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <strong>5. Hộ chiếu số / Passport No.:</strong>{" "}
                <span className="font-mono font-bold text-slate-900">
                  {resident.passportNumber || resident.cccd}
                </span>
              </div>
              <div>
                <strong>Hạn đến / Valid until:</strong>{" "}
                <span className="font-mono">{resident.passportExpiryDate || "15/08/2028"}</span>
              </div>
              <div>
                <strong>Cơ quan cấp / Authority:</strong>{" "}
                {resident.idIssuePlace || "Cục Quản lý Xuất nhập cảnh"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <strong>6. Nghề nghiệp / Occupation:</strong>{" "}
                {resident.occupation || "Chuyên gia / Lao động nước ngoài"}
              </div>
              <div>
                <strong>Cơ quan / Doanh nghiệp bảo lãnh:</strong>{" "}
                {resident.sponsoringOrganization || resident.workplace || "Tự do"}
              </div>
            </div>

            {resident.workPermitNumber && (
              <div className="text-xs">
                <strong>Số Giấy phép lao động (GPLĐ) / Work permit No.:</strong>{" "}
                <span className="font-mono text-blue-700">{resident.workPermitNumber}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>7. Thị thực hoặc Thẻ cư trú / Visa or Residence Card:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                  {resident.visaOrCardType || "Thẻ tạm trú (TRC)"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <strong>Số thẻ / Số thị thực:</strong>{" "}
                  <span className="font-mono font-semibold">
                    {resident.visaOrCardNumber || "TRC-KR-2023-0941"}
                  </span>
                </div>
                <div>
                  <strong>Thời hạn cư trú / Validity:</strong>{" "}
                  <span className="font-mono">
                    Từ {resident.visaValidFrom || "01/01/2023"} đến{" "}
                    {resident.visaValidUntil || "31/12/2026"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500">Tình trạng thời hạn:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${exp.badgeClass}`}
                >
                  {exp.label}
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <p>
                <strong>8. Địa chỉ cơ sở lưu trú tại Việt Nam / Temporary residential address:</strong>{" "}
                <span className="text-slate-900">
                  {resident.temporaryAddress ||
                    resident.address ||
                    "42 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                Mã hộ gia đình liên kết:{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {resident.householdId || "HK-301"}
                </span>{" "}
                ({resident.relationToOwner || "Người thuê trọ"})
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <strong>9. Mã hồ sơ khai báo trực tuyến (Cổng DVC):</strong>{" "}
                <span className="font-mono font-bold text-emerald-700">
                  {resident.temporaryRegistrationCode || "KBTT-AP-2024-ONLINE"}
                </span>
              </div>
              <div>
                <strong>Ngày khai báo:</strong>{" "}
                <span>
                  {resident.temporaryRegistrationDate || "15/01/2024"} (
                  {resident.temporaryRegistrationStatus || "Đã khai báo"})
                </span>
              </div>
            </div>

            <div className="pt-1">
              <p>
                <strong>10. Chủ cơ sở lưu trú / Người bảo lãnh (Host / Landlord):</strong>{" "}
                <span>
                  {resident.landlordContact || "Ban Điều hành Khu phố 3 - 0903123456"}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs font-sans">
            <div className="space-y-1">
              <p className="font-bold text-[11px]">NGƯỜI NƯỚC NGOÀI</p>
              <p className="text-[10px] text-slate-400 italic">Foreigner (Sign & Full name)</p>
              <div className="h-16" />
              <p className="font-semibold text-slate-800 text-[11px]">{resident.fullName}</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-[11px]">CHỦ CƠ SỞ LƯU TRÚ</p>
              <p className="text-[10px] text-slate-400 italic">Host / Landlord</p>
              <div className="h-16" />
              <p className="font-semibold text-slate-800 text-[11px]">
                {resident.landlordContact
                  ? resident.landlordContact.split("-")[0].trim()
                  : "Chủ hộ"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="italic text-[10px] text-slate-500">
                TP. Hồ Chí Minh, {new Date().toLocaleDateString("vi-VN")}
              </p>
              <p className="font-bold text-[11px] text-slate-900">CÔNG AN PHƯỜNG AN PHÚ</p>
              <p className="text-[10px] text-slate-400 italic">Xác nhận trực tuyến</p>
              <div className="h-12 flex items-center justify-center">
                <span className="px-2 py-1 border border-red-500 text-red-600 rounded text-[10px] font-bold uppercase rotate-[-4deg] bg-red-50/50">
                  ✓ ĐÃ TIẾP NHẬN ĐIỆN TỬ
                </span>
              </div>
              <p className="font-semibold text-slate-800 text-[11px]">Trung tá Lê Văn Sơn</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer text-xs font-semibold"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadNA17Doc(resident)}
              className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg cursor-pointer text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Tải Mẫu Word (.DOC)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer size={15} /> In Phiếu Khai Báo (Print)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

