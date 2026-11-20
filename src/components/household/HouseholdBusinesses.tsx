import React, { useState } from "react";
import { X, Briefcase, AlertCircle, Plus, MapPin, Info, ShieldAlert, CheckCircle, QrCode, ExternalLink } from "lucide-react";
import { Household, Business, Resident } from "../../types";
import { initialBusinesses } from "../../mockData";
import { DetailRow } from "../common/DetailRow";
import { SharedAddressHubCard } from "../common/SharedAddressHubCard";
import {
  getNormalizedLinkedHouseholdCodes,
  hasIntersectingAddressKeys,
} from "../../utils/addressCoLocationUtils";
import {
  inheritParcelsFromHouseholds,
  summarizeLandParcels,
} from "../../utils/landParcelsUtils";
import { getBusinessDetailPath, getEnterpriseDetailPath, navigate } from "../../routes";

interface HouseholdBusinessesProps {
  household: Household | null;
  households?: Household[];
  residents: Resident[];
  businessesState?: Business[];
  onUpdateBusinesses?: (businesses: Business[]) => void;
}

export default function HouseholdBusinesses({ 
  household, 
  households,
  residents,
  businessesState,
  onUpdateBusinesses
}: HouseholdBusinessesProps) {
  const [localBusinesses, setLocalBusinesses] = useState<Business[]>(businessesState || initialBusinesses);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new business
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Dịch vụ ăn uống");
  const [newOwner, setNewOwner] = useState(household?.ownerName || "");
  const [newPhone, setNewPhone] = useState("");
  const [newLicense, setNewLicense] = useState("");
  const [newEmployees, setNewEmployees] = useState(1);
  const [safetyCertified, setSafetyCertified] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  if (!household) return null;

  // Sync state if parent updates
  const businesses = businessesState || localBusinesses;
  const updateBusinesses = (updated: Business[]) => {
    if (onUpdateBusinesses) {
      onUpdateBusinesses(updated);
    } else {
      setLocalBusinesses(updated);
    }
  };

  // Find linked businesses: matches linkedHouseholdCodes, exact normalized KP3 address keys, OR representative is one of the members
  const memberNamesLower = new Set(
    household.members.map((m) => m.name.trim().toLowerCase()).filter(Boolean)
  );
  const hhCodeUpper = (household.code || "").trim().toUpperCase();
  const linkedBusinesses = businesses.filter((b) => {
    const linkedCodes = getNormalizedLinkedHouseholdCodes(b);
    const codeMatch = hhCodeUpper ? linkedCodes.includes(hhCodeUpper) : false;
    const addressMatch = hasIntersectingAddressKeys(b.address, household.address);
    const ownerMatch =
      memberNamesLower.has((b.owner || "").trim().toLowerCase()) ||
      memberNamesLower.has((b.legalRepresentative || "").trim().toLowerCase());
    return codeMatch || addressMatch || ownerMatch;
  });

  const handleRegisterBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("Tên hộ kinh doanh không được để trống!");
      return;
    }
    setFormError(null);

    const { nextParcels } = inheritParcelsFromHouseholds([household], []);
    const parcelSummary = summarizeLandParcels(nextParcels);

    const newB: Business = {
      id: "B" + (businesses.length + 1).toString().padStart(3, "0"),
      name: newName,
      type: newType,
      owner: newOwner,
      phone: newPhone || "N/A",
      address: household.address,
      linkedHouseholdCode: household.code,
      linkedHouseholdCodes: household.code ? [household.code] : undefined,
      premisesOwner: household.ownerName,
      landParcels:
        parcelSummary.meaningfulParcels.length > 0
          ? parcelSummary.meaningfulParcels
          : undefined,
      toBanDo: parcelSummary.toBanDoSummary || household.toBanDo,
      soThua: parcelSummary.soThuaSummary || household.soThua,
      dienTich: parcelSummary.totalArea || household.dienTich,
      loaiDat: parcelSummary.loaiDatSummary || household.loaiDat,
      tenChuSuDung: parcelSummary.tenChuSuDungSummary || household.tenChuSuDung,
      soGcn: parcelSummary.soGcnSummary || household.soGcn,
      soVaoSo: parcelSummary.soVaoSoSummary || household.soVaoSo,
      soDoFile: parcelSummary.primarySoDoFile || household.soDoFile,
      licenseNumber: newLicense || `GP-${Math.floor(10000 + Math.random() * 90000)}/AP`,
      status: "Đang hoạt động",
      employeeCount: Number(newEmployees),
      safetyCertified: safetyCertified,
      coordinates: household.coordinates,
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"
    };

    const updated = [newB, ...businesses];
    updateBusinesses(updated);
    setShowAddModal(false);

    // Reset Form
    setNewName("");
    setNewPhone("");
    setNewLicense("");
    setNewEmployees(1);
  };

  const toggleSafetyStatus = (id: string) => {
    const updated = businesses.map(b => b.id === id ? { ...b, safetyCertified: !b.safetyCertified } : b);
    updateBusinesses(updated);
    if (selectedBusiness && selectedBusiness.id === id) {
      setSelectedBusiness({ ...selectedBusiness, safetyCertified: !selectedBusiness.safetyCertified });
    }
  };

  return (
    <div className="space-y-4 font-sans text-sm">
      <SharedAddressHubCard
        focusHousehold={household}
        households={households && households.length > 0 ? households : [household]}
        businesses={businesses}
      />

      <div className="flex justify-between items-center border-b border-slate-50 pb-2 pt-1">
        <div>
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase size={14} className="text-indigo-600" />
            Danh sách Cơ sở &amp; Doanh nghiệp liên kết hộ ({linkedBusinesses.length})
          </h4>
          <p className="text-[10px] text-slate-400">Các cơ sở đặt trụ sở tại địa chỉ hộ hoặc do thành viên hộ đứng tên đại diện</p>
        </div>
        <button
          onClick={() => {
            setNewOwner(household.ownerName);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Plus size={12} /> Đăng ký nhanh tại chỗ
        </button>
      </div>

      {linkedBusinesses.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <AlertCircle className="mx-auto text-slate-300 mb-1.5" size={24} />
          Chưa phát hiện hộ kinh doanh nào đăng ký tại địa chỉ này
        </div>
      ) : (
        <div className="space-y-3">
          {linkedBusinesses.map(b => (
            <div 
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedBusiness(b)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedBusiness(b);
                }
              }}
              className="p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200/80 hover:border-indigo-300 rounded-xl shadow-xs transition-all flex justify-between items-start cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 shrink-0">{b.id}</span>
                  <h5 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">{b.name}</h5>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1"><Info size={11} className="shrink-0" /> Ngành: <strong>{b.type}</strong></p>
                  <p className="flex items-center gap-1"><MapPin size={11} className="shrink-0" /> Đại diện: <strong>{b.owner}</strong></p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                  b.safetyCertified 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {b.safetyCertified ? "✓ An toàn PCCC/ATTP" : "⚠ Chưa thẩm duyệt"}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold hover:underline">Chi tiết ➜</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register New Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-indigo-950 text-white p-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm">Đăng ký Hộ Kinh Doanh Cá Thể Mới</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Trụ sở tại: {household.address}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-md transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRegisterBusiness} className="p-4 space-y-3.5 text-xs text-slate-600 overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                  {formError}
                </div>
              )}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Tên Hộ kinh doanh / Thương hiệu *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Tạp hóa Hoàng Gia"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Ngành nghề kinh doanh *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Dịch vụ ăn uống">Dịch vụ ăn uống</option>
                    <option value="Dịch vụ đồ uống">Dịch vụ đồ uống</option>
                    <option value="Bán lẻ thương mại">Bán lẻ thương mại</option>
                    <option value="Dịch vụ đời sống">Dịch vụ đời sống</option>
                    <option value="Y tế / Chăm sóc sức khỏe">Y tế / Chăm sóc sức khỏe</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Người Đại diện pháp luật *</label>
                  <select
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {household.members.map(m => (
                      <option key={m.cccd} value={m.name}>{m.name} ({m.relation})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Số điện thoại liên lạc</label>
                  <input 
                    type="text"
                    placeholder="09XXXXXXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Số Giấy phép ĐKKD (nếu có)</label>
                  <input 
                    type="text"
                    placeholder="GP-XXXXX/AP"
                    value={newLicense}
                    onChange={(e) => setNewLicense(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Số lượng nhân viên</label>
                  <input 
                    type="number"
                    min={1}
                    value={newEmployees}
                    onChange={(e) => setNewEmployees(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 sm:mt-4 select-none">
                  <input 
                    type="checkbox"
                    id="safety-checkbox"
                    checked={safetyCertified}
                    onChange={(e) => setSafetyCertified(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="safety-checkbox" className="font-semibold text-slate-700 cursor-pointer">Đạt chuẩn PCCC/ATTP</label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cấp phép & Đăng ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Details View Modal */}
      {selectedBusiness && (
        <div
          onClick={() => setSelectedBusiness(null)}
          className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            {/* Header banner */}
            <div className="p-5 bg-indigo-950 text-white flex justify-between items-start shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded bg-indigo-900 border border-indigo-800 text-indigo-200">
                    {selectedBusiness.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">HỘ KINH DOANH CHÍNH THỨC</span>
                </div>
                <h3 className="font-extrabold text-base tracking-tight leading-snug">{selectedBusiness.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedBusiness(null)}
                className="text-white/80 hover:text-white bg-white/15 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600 overflow-y-auto flex-1">
              {/* QR Code Column */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
                  <QrCode size={110} className="text-slate-900" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest mt-1.5">{selectedBusiness.licenseNumber}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider block text-slate-400">Trạng thái</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Đang hoạt động
                  </span>
                </div>
              </div>

              {/* Data Column */}
              <div className="sm:col-span-2 space-y-4">
                <div className="space-y-2 border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Chi tiết Giấy phép & Cơ cấu</span>
                  <div className="space-y-0.5">
                    <DetailRow label="Chủ cơ sở (Đại diện)" value={selectedBusiness.owner} />
                    <DetailRow label="Số điện thoại" value={selectedBusiness.phone} isMono />
                    <DetailRow label="Giấy phép KD" value={selectedBusiness.licenseNumber} isMono />
                    <DetailRow label="Ngành nghề" value={selectedBusiness.type} />
                    <DetailRow label="Số lượng nhân sự" value={`${selectedBusiness.employeeCount} nhân sự`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Thẩm định điều kiện An toàn</span>
                  
                  <div className={`p-3 rounded-xl border flex gap-3 items-start ${
                    selectedBusiness.safetyCertified 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                      : "bg-amber-50 border-amber-100 text-amber-800"
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {selectedBusiness.safetyCertified ? (
                        <CheckCircle size={16} className="text-emerald-600" />
                      ) : (
                        <ShieldAlert size={16} className="text-amber-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-bold text-[11px] leading-none uppercase">
                        {selectedBusiness.safetyCertified ? "Cam kết Đủ chuẩn an toàn" : "Chưa hoàn tất Thẩm duyệt an toàn"}
                      </h5>
                      <p className="text-[10px] leading-relaxed opacity-90">
                        {selectedBusiness.safetyCertified 
                          ? "Cơ sở đã vượt qua kỳ kiểm duyệt liên ngành định kỳ về Phòng cháy Chữa cháy (PCCC) và Vệ sinh An toàn Thực phẩm (ATTP)." 
                          : "Cơ sở đang trong thời hạn chờ tổ công tác liên ngành khu phố kiểm tra điều kiện PCCC thực tế hoặc hồ sơ ATTP đang xử lý."
                        }
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleSafetyStatus(selectedBusiness.id)}
                        className={`text-[10px] font-bold hover:underline cursor-pointer mt-1 block ${
                          selectedBusiness.safetyCertified ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {selectedBusiness.safetyCertified ? "Đánh dấu Chưa thẩm duyệt" : "Đánh dấu Đạt thẩm duyệt"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">Tọa độ GPS: {selectedBusiness.coordinates || "Theo hộ dân"}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedBusiness;
                    setSelectedBusiness(null);
                    navigate(
                      target.taxCode
                        ? getEnterpriseDetailPath(target.id)
                        : getBusinessDetailPath(target.id)
                    );
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Mở Hồ sơ Cơ sở đầy đủ</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedBusiness(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
