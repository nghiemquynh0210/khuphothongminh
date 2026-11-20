import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Trash2, Users, MapPin, Sparkles, HelpCircle, ArrowRight, X } from "lucide-react";
import { Household, Resident } from "../../types";
import { getHouseholdDetailPath, getResidentDetailPath, navigate } from "../../routes";

interface HouseholdDuplicatesProps {
  households: Household[];
  residents: Resident[];
  onUpdateHouseholds: (households: Household[]) => void;
  onUpdateResidents: (residents: Resident[]) => void;
}

// Address normalization function
export function normalizeAddress(addr: string): string {
  if (!addr) return "";
  return addr
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\s,.\-\/]+/g, " ") // replace punctuation/slashes with space
    .replace(/\b(đường|phố|p|q|tp|thành phố|phường|quận|tổ|tổ dân phố|hẻm|số)\b/g, "") // remove keywords
    .trim()
    .replace(/\s+/g, " "); // consolidate spaces
}

export default function HouseholdDuplicates({
  households,
  residents,
  onUpdateHouseholds,
  onUpdateResidents
}: HouseholdDuplicatesProps) {
  const [selectedMergePair, setSelectedMergePair] = useState<{ h1: Household; h2: Household } | null>(null);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [mergeSuccess, setMergeSuccess] = useState(false);

  // Filter out soft-deleted households for scanning
  const activeHouseholds = households.filter(h => !(h as any).deletedAt);

  // 1. Group households by normalized address to find potential duplicates (Hộ cần xác minh)
  const addressGroups: { [normalized: string]: Household[] } = {};
  activeHouseholds.forEach(h => {
    const norm = normalizeAddress(h.address);
    if (norm) {
      if (!addressGroups[norm]) addressGroups[norm] = [];
      addressGroups[norm].push(h);
    }
  });

  const duplicateAddressPairs = Object.values(addressGroups).filter(group => group.length > 1);

  // 2. Find citizens with duplicated CCCD in multiple households
  const cccdGroups: { [cccd: string]: { name: string; householdCodes: string[] } } = {};
  activeHouseholds.forEach(h => {
    h.members.forEach(m => {
      if (m.cccd) {
        if (!cccdGroups[m.cccd]) {
          cccdGroups[m.cccd] = { name: m.name, householdCodes: [] };
        }
        cccdGroups[m.cccd].householdCodes.push(h.code);
      }
    });
  });

  const duplicateCitizens = Object.entries(cccdGroups)
    .filter(([_, data]) => data.householdCodes.length > 1)
    .map(([cccd, data]) => ({ cccd, ...data }));

  // Initialize Merge Wizard
  const startMerge = (h1: Household, h2: Household) => {
    setSelectedMergePair({ h1, h2 });
    setPrimaryId(h1.id); // Default primary is h1
    setMergeSuccess(false);
  };

  // Perform Household Merge
  const handlePerformMerge = () => {
    if (!selectedMergePair) return;
    const { h1, h2 } = selectedMergePair;
    const primary = primaryId === h1.id ? h1 : h2;
    const secondary = primaryId === h1.id ? h2 : h1;

    // Merge members, making sure we don't duplicate by CCCD
    const mergedMembers = [...primary.members];
    secondary.members.forEach(secMem => {
      // If member is owner of secondary, we change their relation to "Thành viên gộp" unless they are the same person as primary owner
      let relation = secMem.relation;
      if (relation === "Chủ hộ") {
        relation = "Thành viên (Cựu chủ hộ)";
      }

      if (!mergedMembers.some(primMem => primMem.cccd === secMem.cccd)) {
        mergedMembers.push({
          ...secMem,
          relation: relation
        });
      }
    });

    // Update Households: update primary, soft-delete secondary
    const updatedHouseholds = households.map(h => {
      if (h.id === primary.id) {
        return {
          ...h,
          members: mergedMembers,
          memberCount: mergedMembers.length,
          notes: (h as any).notes 
            ? (h as any).notes + ` | Đã tự động gộp dữ liệu từ sổ ${secondary.code}`
            : `Đã tự động gộp dữ liệu từ sổ ${secondary.code}`
        };
      }
      if (h.id === secondary.id) {
        // Soft delete secondary
        return {
          ...h,
          deletedAt: new Date().toISOString(),
          deletedBy: "Hệ thống tự động (Trực ban)",
          notes: `Đã bị gộp vào sổ ${primary.code}`
        };
      }
      return h;
    });

    // Update Residents: point secondary members' householdId to primary code
    const updatedResidents = residents.map(r => {
      if (r.householdId === secondary.code) {
        return {
          ...r,
          householdId: primary.code,
          relationToOwner: r.relationToOwner === "Chủ hộ" ? "Thành viên (Hộ đã gộp)" : r.relationToOwner
        };
      }
      return r;
    });

    // Save states
    onUpdateHouseholds(updatedHouseholds);
    onUpdateResidents(updatedResidents);

    setMergeSuccess(true);
    setTimeout(() => {
      setSelectedMergePair(null);
      setMergeSuccess(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Overview Block */}
      <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
        <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
          <Sparkles size={18} />
        </div>
        <h3 className="font-bold text-sm text-slate-900">Rà soát trùng lặp &amp; Gộp Sổ Hộ khẩu</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Duplicate Addresses (Hộ Cần Xác Minh) */}
        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-[12px] uppercase">Hộ cần xác minh trùng địa chỉ ({duplicateAddressPairs.length})</h4>
              <p className="text-[10px] text-slate-400">Các sổ hộ khẩu có địa chỉ thực tế trùng khớp sau chuẩn hóa</p>
            </div>
          </div>

          {duplicateAddressPairs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
              Tất cả sổ hộ khẩu đều có địa chỉ duy nhất, chuẩn hóa hoàn tất!
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {duplicateAddressPairs.map((group, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Địa chỉ trùng khớp</span>
                      <p className="text-slate-800 font-bold leading-tight">{group[0].address}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.map(h => (
                      <div
                        key={h.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(getHouseholdDetailPath(h.id))}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(getHouseholdDetailPath(h.id));
                          }
                        }}
                        title={`Nhấn để mở sổ hộ khẩu ${h.code}`}
                        className="group p-2 bg-white hover:bg-indigo-50/40 rounded-lg border border-slate-200/80 hover:border-indigo-300 space-y-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[10px] text-slate-500">{h.code}</span>
                          <span className="px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 rounded-full font-bold">{h.type}</span>
                        </div>
                        <p className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors truncate">{h.ownerName}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Users size={10} /> {h.memberCount} nhân khẩu
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => startMerge(group[0], group[1])}
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Sparkles size={11} /> Thực hiện đồng bộ / Gộp Sổ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Card: Duplicate Citizens (Double Registered) */}
        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-[12px] uppercase">Cảnh báo trùng lặp nhân khẩu ({duplicateCitizens.length})</h4>
              <p className="text-[10px] text-slate-400">Cá nhân đăng ký thành viên trên nhiều sổ hộ khẩu cùng lúc</p>
            </div>
          </div>

          {duplicateCitizens.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
              Không phát hiện nhân khẩu trùng lặp CCCD trên toàn khu phố!
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {duplicateCitizens.map((dc, idx) => {
                const matchedResident = residents.find(
                  (r) =>
                    (dc.cccd && r.cccd && r.cccd.trim() === dc.cccd.trim()) ||
                    r.fullName.trim().toLowerCase() === dc.name.trim().toLowerCase()
                );
                return (
                  <div
                    key={idx}
                    role={matchedResident ? "button" : undefined}
                    tabIndex={matchedResident ? 0 : undefined}
                    onClick={() => {
                      if (matchedResident) {
                        navigate(getResidentDetailPath(matchedResident.id));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!matchedResident || e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(getResidentDetailPath(matchedResident.id));
                      }
                    }}
                    className={`group p-3 bg-rose-50/50 border border-rose-200/60 rounded-xl flex justify-between items-center gap-3 transition-all ${
                      matchedResident
                        ? "cursor-pointer hover:bg-rose-50 hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        : ""
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <h5 className="font-bold text-slate-800 group-hover:text-rose-800 transition-colors text-xs">{dc.name}</h5>
                      <p className="text-[10px] text-slate-400 font-mono">CCCD: {dc.cccd}</p>
                      <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400">Hộ khẩu liên đới:</span>
                        {dc.householdCodes.map((code, cidx) => {
                          const targetHh = activeHouseholds.find((h) => h.code === code);
                          return targetHh ? (
                            <button
                              key={cidx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(getHouseholdDetailPath(targetHh.id));
                              }}
                              className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                            >
                              {code}
                            </button>
                          ) : (
                            <span key={cidx} className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-white text-slate-600 rounded border border-slate-200">
                              {code}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-2 bg-rose-100 text-rose-700 rounded-full font-bold text-[10px] shrink-0">
                      Bất hợp lệ
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Merge Wizard Modal */}
      {selectedMergePair && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h3 className="font-bold text-sm">Trình Gộp sổ hộ khẩu chuẩn hóa địa phương</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedMergePair(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {mergeSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2.5 overflow-y-auto flex-1">
                <CheckCircle size={44} className="text-emerald-500 animate-bounce" />
                <h4 className="font-bold text-slate-800 text-sm">Đã gộp dữ liệu thành công!</h4>
                <p className="text-slate-500 text-xs">Cơ sở dữ liệu hộ tịch đã được cấu trúc lại, đang tải lại...</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-5 text-xs text-slate-600 overflow-y-auto flex-1">
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Hai hộ tịch sau đây có địa chỉ trùng khớp tuyệt đối. Hãy lựa chọn <strong>Sổ hộ khẩu chính (Primary Book)</strong> để lưu giữ. Toàn bộ thành viên của sổ còn lại sẽ được chuyển sang sổ chính một cách an toàn. Sổ thứ hai sẽ tự động được <strong>Soft Delete (Đánh dấu lưu trữ)</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1 */}
                  <div 
                    onClick={() => setPrimaryId(selectedMergePair.h1.id)}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all space-y-3 relative overflow-hidden ${
                      primaryId === selectedMergePair.h1.id 
                        ? "border-indigo-600 ring-2 ring-indigo-500/10 bg-indigo-50/20" 
                        : "border-slate-200 hover:border-slate-200"
                    }`}
                  >
                    {primaryId === selectedMergePair.h1.id && (
                      <span className="absolute top-0 right-0 bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-bl-xl text-[10px] uppercase tracking-wider">
                        Sổ Hộ Khẩu Chính
                      </span>
                    )}
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-slate-500">{selectedMergePair.h1.code}</span>
                      <span className="font-bold text-indigo-600">{selectedMergePair.h1.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chủ hộ</span>
                      <p className="font-bold text-slate-800 text-sm">{selectedMergePair.h1.ownerName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Thành viên ({selectedMergePair.h1.members.length})</span>
                      <p className="text-slate-500 truncate">{selectedMergePair.h1.members.map(m => m.name).join(", ")}</p>
                    </div>
                  </div>

                  {/* Option 2 */}
                  <div 
                    onClick={() => setPrimaryId(selectedMergePair.h2.id)}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all space-y-3 relative overflow-hidden ${
                      primaryId === selectedMergePair.h2.id 
                        ? "border-indigo-600 ring-2 ring-indigo-500/10 bg-indigo-50/20" 
                        : "border-slate-200 hover:border-slate-200"
                    }`}
                  >
                    {primaryId === selectedMergePair.h2.id && (
                      <span className="absolute top-0 right-0 bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-bl-xl text-[10px] uppercase tracking-wider">
                        Sổ Hộ Khẩu Chính
                      </span>
                    )}
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-slate-500">{selectedMergePair.h2.code}</span>
                      <span className="font-bold text-indigo-600">{selectedMergePair.h2.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chủ hộ</span>
                      <p className="font-bold text-slate-800 text-sm">{selectedMergePair.h2.ownerName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Thành viên ({selectedMergePair.h2.members.length})</span>
                      <p className="text-slate-500 truncate">{selectedMergePair.h2.members.map(m => m.name).join(", ")}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Địa chỉ chuẩn hóa</span>
                    <strong className="text-slate-700">{selectedMergePair.h1.address}</strong>
                  </div>
                  <ArrowRight size={16} className="text-slate-400" />
                </div>

                {/* Confirm merge actions */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    onClick={() => setSelectedMergePair(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handlePerformMerge}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Xác nhận Gộp hộ & Đồng bộ CSDL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
