import React from "react";
import { X, User, ShieldCheck, MapPin, Info, QrCode, ExternalLink } from "lucide-react";
import { Resident } from "../../types";
import { DetailRow } from "../common/DetailRow";
import { getResidentDetailPath, navigate } from "../../routes";

interface HouseholdMemberProfileProps {
  resident: Resident | null;
  fallbackMember?: {
    name: string;
    relation: string;
    cccd: string;
  };
  relation: string;
  onClose: () => void;
}

export default function HouseholdMemberProfile({
  resident,
  fallbackMember,
  relation,
  onClose,
}: HouseholdMemberProfileProps) {
  if (!resident && !fallbackMember) return null;

  const displayName = resident?.fullName || fallbackMember?.name || "Chưa cập nhật";
  const displayCccd = resident?.cccd || fallbackMember?.cccd || "Chưa cập nhật";

  // Render a mock beautiful pixelated digital QR code
  const renderMockQr = (cccd: string) => {
    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-1.5 shadow-sm">
        <div className="w-32 h-32 bg-slate-900 rounded-lg p-2 flex flex-wrap items-center justify-center relative">
          <QrCode size={100} className="text-white" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-7 h-7 bg-white rounded-md border-2 border-slate-900 flex items-center justify-center shadow-xs">
              <User size={14} className="text-emerald-600" />
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded tracking-widest">
          {cccd || "0790XXXXXXXX"}
        </span>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200"
      >
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-700 to-teal-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            <div>
              <h3 className="font-bold text-sm">Hồ sơ điện tử Cư dân</h3>
              <p className="text-[10px] text-emerald-100 font-mono tracking-wide">Xác thực bởi Chính phủ số</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-1">
          {/* Left Column: Avatar & QR */}
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="relative">
              <img 
                src={resident?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md"
              />
              <span className="absolute bottom-0 right-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white border-2 border-white shadow-xs">
                {relation}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-base">{displayName}</h4>
              <p className="text-[11px] text-slate-400 font-medium font-mono">{resident?.id || displayCccd}</p>
            </div>

            {renderMockQr(displayCccd)}
          </div>

          {/* Right Columns: Detailed Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-100 pb-1 flex items-center gap-1">
              <Info size={12} /> Thông tin cá nhân cơ bản
            </div>

            <dl className="@container space-y-0">
              <DetailRow label="Số CCCD" value={displayCccd} isMono copyValue={displayCccd} />
              <DetailRow label="Ngày sinh" value={resident?.birthDate || "Chưa cập nhật"} isMono />
              <DetailRow label="Giới tính" value={resident?.gender || "Chưa cập nhật"} />
              <DetailRow label="Số điện thoại" value={resident?.phone || "Chưa cập nhật"} isMono href={resident?.phone && resident.phone !== "Chưa cập nhật" ? `tel:${resident.phone}` : undefined} copyValue={resident?.phone} />
              <DetailRow
                label="Trạng thái cư trú"
                value={
                  <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                    resident?.status === "Thường trú" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : resident?.status === "Tạm trú"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}>
                    {resident?.status || "Chưa đối khớp CSDL"}
                  </span>
                }
              />
              <DetailRow label="Nghề nghiệp" value={resident?.occupation || "Chưa cập nhật"} />
            </dl>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100 pb-1 flex items-center gap-1">
                <MapPin size={12} /> Nơi đăng ký cư trú & Lịch sử
              </div>
              <dl className="@container bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0">
                <DetailRow label="Địa chỉ đăng ký" value={resident?.address || "Theo sổ hộ khẩu"} />
                <DetailRow label="Ngày nhập khẩu" value={resident?.joinDate || "Chưa cập nhật"} isMono />
                <DetailRow label="Mã Sổ hộ tịch" value={resident?.householdId || "Theo sổ hiện hành"} isMono />
              </dl>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex flex-wrap justify-between items-center gap-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
          <span>Khóa định danh: {resident?.id || displayCccd}</span>
          <div className="flex items-center gap-2 font-sans">
            {resident?.id && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(getResidentDetailPath(resident.id));
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Xem Hồ sơ Cư dân đầy đủ</span>
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng hồ sơ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
