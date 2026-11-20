import React, { useState } from "react";
import { supabase } from "../supabase";
import { ResidentLookupResult } from "../types";
import { Search, ShieldCheck, AlertTriangle, CheckCircle, Clock, Home, UserCheck } from "lucide-react";

export const LookupTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<ResidentLookupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const maskName = (name?: string) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length <= 1) return parts[0];
    return parts.slice(0, -1).join(" ") + " ***";
  };

  const maskIdCard = (id?: string) => {
    if (!id || id.length < 8) return "Chưa cập nhật";
    return id.slice(0, 4) + "******" + id.slice(-3);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) {
      setErrorMsg("Vui lòng nhập số CCCD/Định danh hoặc Mã hộ gia đình.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const endpoint = "https://bdhkp3.vercel.app/api/notifications";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mini_app_lookup_resident",
          query: q,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Lỗi khi kết nối CSDL dân cư.");
      }

      if (json.found && json.data) {
        setResult({
          found: true,
          fullName: json.data.fullName,
          idCardMasked: json.data.idCardMasked,
          residenceType: json.data.residenceType,
          address: json.data.address,
          temporaryRegDate: json.data.temporaryRegDate,
          temporaryExpDate: json.data.temporaryExpDate,
          expiryStatus: json.data.expiryStatus,
          daysLeft: json.data.daysLeft,
          householdCode: json.data.householdCode,
          managementStatus: json.data.managementStatus,
        });
      } else {
        setResult({ found: false });
      }
    } catch (err: any) {
      console.error("Lookup error:", err);
      setErrorMsg("Lỗi khi kết nối máy chủ CSDL Khu phố 3. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            <Search size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Tra Cứu Thông Tin Cư Trú</h1>
            <p className="text-xs text-slate-500">
              Kiểm tra tình trạng thường trú, tạm trú & hạn 30 ngày (Luật Căn cước 2023)
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Số Thẻ Căn cước / CCCD (12 số) hoặc Mã hộ *
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Nhập 12 số CCCD để tra cứu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8"
              required
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold p-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all disabled:opacity-50"
        >
          {loading ? <span>Đang đối soát dữ liệu CSDL...</span> : <span>Tra Cứu Dữ Liệu</span>}
        </button>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span>Thông tin công dân được mã hóa bảo mật theo tiêu chuẩn Đề án 06.</span>
        </div>
      </form>

      {/* Result Display */}
      {searched && (
        <div>
          {result && result.found ? (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {maskName(result.fullName)}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    result.residenceType === "Thường trú"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {result.residenceType}
                </span>
              </div>

              {/* Expiry Warning Box for Temporary Residence */}
              {result.residenceType === "Tạm trú" && (
                <div>
                  {result.expiryStatus === "warning_30d" && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-amber-800 text-xs">
                      <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <div className="font-bold">⚠️ Sắp hết hạn tạm trú (còn {result.daysLeft} ngày)!</div>
                        <div className="text-[11px] mt-0.5">
                          Thời hạn đến ngày {result.temporaryExpDate ? new Date(result.temporaryExpDate).toLocaleDateString("vi-VN") : "---"}. Vui lòng liên hệ Công an Phường An Phú hoặc chủ trọ để làm thủ tục gia hạn kịp thời.
                        </div>
                      </div>
                    </div>
                  )}

                  {result.expiryStatus === "expired" && (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-start gap-2.5 text-red-800 text-xs">
                      <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-bold">🚨 Hồ sơ tạm trú đã quá hạn!</div>
                        <div className="text-[11px] mt-0.5">
                          Hạn tạm trú đã kết thúc. Vui lòng bổ sung hồ sơ gia hạn theo mẫu CT01 tại Công an Phường An Phú để tránh bị xử phạt hành chính.
                        </div>
                      </div>
                    </div>
                  )}

                  {result.expiryStatus === "valid" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-800 text-xs">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                      <span>Hồ sơ tạm trú hợp lệ (còn hơn 30 ngày).</span>
                    </div>
                  )}
                </div>
              )}

              {/* Key Details */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Số Căn cước / CCCD:</span>
                  <span className="font-mono font-bold text-slate-800">{result.idCardMasked}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Mã sổ hộ gia đình:</span>
                  <span className="font-mono text-slate-700">{result.householdCode || "Đang cập nhật"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Địa chỉ cư trú tại KP3:</span>
                  <span className="text-slate-800 font-medium text-right max-w-[65%]">{result.address}</span>
                </div>
                {result.temporaryRegDate && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Ngày đăng ký tạm trú:</span>
                    <span className="text-slate-700">{new Date(result.temporaryRegDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
                {result.temporaryExpDate && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Ngày hết hạn tạm trú:</span>
                    <span className="font-bold text-red-600">{new Date(result.temporaryExpDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 mx-auto flex items-center justify-center mb-2">
                <Search size={20} />
              </div>
              <div className="font-bold text-slate-700">Không tìm thấy thông tin trên hệ thống</div>
              <p className="mt-1 max-w-xs mx-auto text-[11px]">
                Nếu Anh/Chị mới chuyển đến hoặc chưa đăng ký cư trú tại Khu phố 3, vui lòng liên hệ Công an Phường An Phú hoặc Tổ trưởng để được hướng dẫn nộp hồ sơ.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
