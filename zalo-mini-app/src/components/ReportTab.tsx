import React, { useState } from "react";
import { supabase } from "../supabase";
import { AlertTriangle, Send, CheckCircle2, Clock, MapPin, ShieldAlert } from "lucide-react";

export const ReportTab: React.FC = () => {
  const [reportType, setReportType] = useState("Vệ sinh môi trường");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = [
    { label: "Môi trường & Rác thải", val: "Vệ sinh môi trường", icon: "🌱" },
    { label: "An ninh trật tự", val: "An ninh trật tự", icon: "🛡️" },
    { label: "PCCC & Lối thoát hiểm", val: "An toàn PCCC", icon: "🔥" },
    { label: "Chiếu sáng & Hạ tầng", val: "Hạ tầng đô thị", icon: "💡" },
    { label: "Ý kiến / Góp ý khác", val: "Góp ý khác", icon: "📝" },
  ];

  const quickAddresses = [
    "Đường Song Hành, KP3",
    "Đường Lương Định Của, KP3",
    "Đường Mai Chí Thọ, KP3",
    "Đường D2, Khu phố 3",
    "Khu vực nhà trọ hẻm 17/A3",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !description.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tiêu đề, vị trí và mô tả sự việc.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const endpoint = "https://bdhkp3.vercel.app/api/notifications";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mini_app_submit_report",
          title: title.trim(),
          category: reportType,
          location: location.trim(),
          description: description.trim(),
          reporter_name: reporterName.trim() || "Cư dân Khu phố 3 (Zalo Mini App)",
          reporter_phone: reporterPhone.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Không thể gửi phản ánh vào hệ thống.");
      }

      setSubmitted(true);
      setTitle("");
      setDescription("");
      setLocation("");
    } catch (err: any) {
      console.error("Submit report error:", err);
      setErrorMsg(err.message || "Lỗi khi gửi phản ánh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Phản Ánh Hiện Trường 1022</h1>
            <p className="text-xs text-slate-500">Tiếp nhận ý kiến, sự cố & phản ánh đô thị KP3</p>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-800">Gửi Phản Ánh Thành Công!</h2>
            <p className="text-xs text-emerald-700 mt-1 max-w-xs mx-auto">
              Thông tin đã được chuyển trực tiếp đến Ban Điều Hành Khu Phố 3 và Cán bộ chuyên trách để xử lý theo quy định.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            Gửi thêm phản ánh mới
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Phân loại vấn đề phản ánh *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.val}
                  onClick={() => setReportType(c.val)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    reportType === c.val
                      ? "bg-red-50 border-red-500 text-red-700 font-bold shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{c.icon}</span>
                  <span className="text-xs">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tiêu đề phản ánh ngắn gọn *
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Rác thải tồn đọng trước hẻm; Đèn đường hỏng..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Địa chỉ / Vị trí cụ thể tại Khu phố 3 *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Số nhà, tên đường, hẻm cụ thể..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-xs pl-8"
                required
              />
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Quick Location Pills */}
            <div className="flex gap-1.5 overflow-x-auto mt-1.5 pb-1 text-[11px] no-scrollbar">
              {quickAddresses.map((addr) => (
                <button
                  type="button"
                  key={addr}
                  onClick={() => setLocation(addr)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md whitespace-nowrap text-[11px]"
                >
                  {addr}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Mô tả chi tiết nội dung sự việc *
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả hiện trạng, thời điểm phát hiện, ảnh hưởng tới người dân xung quanh..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none"
              required
            />
          </div>

          {/* Reporter Info (Optional) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Họ và tên người gửi
              </label>
              <input
                type="text"
                placeholder="Anh/Chị (ẩn danh nếu để trống)"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                placeholder="09xx... (để phản hồi kết quả)"
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs disabled:opacity-50"
          >
            {loading ? (
              <span>Đang gửi thông tin lên hệ thống...</span>
            ) : (
              <>
                <Send size={16} />
                <span>Gửi Phản Ánh Đến Ban Điều Hành</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center mt-1">
            Ý kiến của cư dân được bảo mật thông tin và tiếp nhận xử lý trong vòng 24h.
          </p>
        </form>
      )}
    </div>
  );
};
