import React from "react";
import { FileText, Download, ExternalLink, CheckSquare, Info, ShieldCheck } from "lucide-react";

export const FormsTab: React.FC = () => {
  const forms = [
    {
      code: "CT01",
      title: "Mẫu CT01 - Tờ khai thay đổi thông tin cư trú",
      desc: "Áp dụng đăng ký thường trú, tạm trú, tách hộ, điều chỉnh thông tin cư trú theo Thông tư 66/2023/TT-BCA",
      tag: "Cư trú",
      color: "bg-red-50 text-red-700 border-red-200",
    },
    {
      code: "CT08",
      title: "Mẫu CT08 - Thông báo kết quả giải quyết cư trú",
      desc: "Văn bản xác nhận của Công an về kết quả giải quyết thường trú, tạm trú của công dân",
      tag: "Xác nhận",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      code: "DKN",
      title: "Mẫu Đơn Kiến Nghị / Phản Ánh của Nhân Dân",
      desc: "Mẫu đơn gửi Ban Điều Hành Khu Phố 3 và UBND Phường An Phú về các vấn đề dân sinh",
      tag: "Kiến nghị",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
            <FileText size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Biểu Mẫu & Thủ Tục Hành Chính</h1>
            <p className="text-xs text-slate-500">
              Mẫu biểu chuẩn theo Luật Căn cước 2023 & Thông tư Bộ Công an
            </p>
          </div>
        </div>
      </div>

      {/* Forms List */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Danh mục biểu mẫu tải về
        </h2>

        {forms.map((f) => (
          <div
            key={f.code}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${f.color}`}>
                {f.tag}
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">{f.code}</span>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-800">{f.title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Định dạng file Word / PDF</span>
              <a
                href="https://bdhkp3.vercel.app/forms"
                target="_blank"
                rel="noreferrer"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
              >
                <Download size={12} />
                <span>Tải Mẫu</span>
              </a>
            </div>
          </div>
        ))}

        {/* View all 11 forms banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-3 text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-100 font-medium">Kho Biểu Mẫu Hành Chính</div>
            <div className="text-xs font-bold">11 Mẫu Biểu Số Hóa Đầy Đủ</div>
          </div>
          <a
            href="https://bdhkp3.vercel.app/forms"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1 hover:bg-amber-50"
          >
            <span>Mở Kho Mẫu</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Legal & VNeID Guide Card */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
          <ShieldCheck size={16} className="text-red-600" />
          <span>Hướng dẫn Thủ tục Căn cước & VNeID</span>
        </div>

        <div className="flex flex-col gap-2 text-[11px] text-slate-600">
          <div className="flex items-start gap-2">
            <CheckSquare size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Cấp thẻ Căn cước (Luật Căn cước 2023):</strong> Người dân từ 14 tuổi trở lên bắt buộc; trẻ em dưới 14 tuổi cấp theo nhu cầu của cha mẹ tại Công an TP. Hồ Chí Minh.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckSquare size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Đăng ký tạm trú trực tuyến:</strong> Người dân có thể nộp trực tuyến qua Cổng Dịch vụ công Bộ Công an hoặc liên hệ Công an Phường An Phú.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckSquare size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Kích hoạt VNeID Mức 2:</strong> Đến trực tiếp trụ sở Công an Phường An Phú cùng thẻ CCCD/Căn cước và số điện thoại chính chủ.
            </div>
          </div>
        </div>

        <a
          href="https://dichvucong.bocongan.gov.vn"
          target="_blank"
          rel="noreferrer"
          className="mt-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold p-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all"
        >
          <span>Mở Cổng Dịch Vụ Công Bộ Công An</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};
