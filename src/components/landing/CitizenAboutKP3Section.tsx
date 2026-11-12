import React, { useState } from "react";
import { 
  Building2, 
  Compass, 
  ExternalLink, 
  MapPin, 
  Phone, 
  Users, 
  Shield, 
  Landmark, 
  Award, 
  CheckCircle2, 
  ChevronRight, 
  Share2, 
  Maximize2, 
  X,
  Globe,
  FileText,
  Home,
  Briefcase
} from "lucide-react";
import { SectionHeader } from "./LandingCommon";
import { KP3_OFFICIAL_BASELINE } from "../../utils/kp3Utils";
import { Link, ROUTES } from "./landingConstants";

export default function CitizenAboutKP3Section() {
  const [showMapZoom, setShowMapZoom] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Dữ liệu đồng bộ trực tiếp từ Không Gian Số Đảng Ủy Phường An Phú (https://danguy.phuonganphu.gov.vn)
  const capUyKP3 = [
    {
      id: "01",
      name: "Nghiêm Xuân Quỳnh",
      role: "Bí thư Chi bộ",
      phone: "0825681868",
      highlight: true,
      desc: "Phụ trách chung công tác Đảng, chính trị tư tưởng và định hướng chuyển đổi số tại cơ sở."
    },
    {
      id: "02",
      name: "Phạm Ngọc Hà",
      role: "Phó Bí thư Chi bộ",
      phone: "0908579479",
      highlight: false,
      desc: "Phụ trách công tác tổ chức, kiểm tra giám sát và phong trào đoàn thể khu phố."
    },
    {
      id: "03",
      name: "Nguyễn Trung Huy",
      role: "Chi ủy viên",
      subRole: "Trưởng Ban Điều hành Khu phố 3",
      phone: "0962037937",
      highlight: false,
      desc: "Chủ trì điều hành hoạt động hành chính, trật tự đô thị, an sinh xã hội và dịch vụ công."
    },
    {
      id: "04",
      name: "Dương Tấn Đạt",
      role: "Chi ủy viên",
      phone: "0352475848",
      highlight: false,
      desc: "Phụ trách công tác thanh niên, phong trào tự quản và an ninh trật tự hẻm."
    }
  ];

  return (
    <section id="about" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 outline-none">
      <div className="space-y-8">

        {/* 1. Header Banner Giới Thiệu Trang Trọng */}
        <div className="bg-gov-navy border border-blue-950 rounded-2xl text-white p-6 sm:p-10 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-red-700 border border-red-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                <Landmark size={13} aria-hidden="true" /> KHU PHỐ 04 / 14 KHU PHỐ
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold border border-white/25 inline-flex items-center gap-1">
                <Globe size={13} aria-hidden="true" /> DỮ LIỆU ĐẢNG BỘ PHƯỜNG AN PHÚ
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Giới Thiệu Khu Phố 3 – Phường An Phú
            </h1>

            <p className="text-blue-100 text-sm sm:text-base leading-relaxed font-normal">
              Khu phố 3 là một trong 14 khu phố trực thuộc Đảng ủy – HĐND – UBND – UBMTTQ Việt Nam Phường An Phú, 
              Thành phố Hồ Chí Minh; địa bàn khép kín văn minh, hiện đại, năng động và đi đầu trong công tác chuyển đổi số cơ sở.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <a 
                href="https://danguy.phuonganphu.gov.vn/ban-do" 
                target="_blank" 
                rel="noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white text-gov-navy font-bold hover:bg-blue-50 transition-colors inline-flex items-center gap-2 border border-white"
              >
                <Compass size={15} aria-hidden="true" /> Xem trên Cổng Đảng ủy Phường <ExternalLink size={13} aria-hidden="true" />
              </a>
              <button 
                type="button"
                onClick={handleShare}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors inline-flex items-center gap-2 border border-white/25 cursor-pointer"
              >
                <Share2 size={15} aria-hidden="true" /> {copiedLink ? "Đã sao chép liên kết!" : "Chia sẻ trang"}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Quy Mô Địa Bàn & Chỉ Số Phát Triển (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-600 text-xs font-semibold flex items-center gap-1.5">
              <Home size={15} className="text-blue-700" aria-hidden="true" /> Hộ gia đình
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {KP3_OFFICIAL_BASELINE.households.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-600">Hộ dân cư thường trú & tạm trú</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-600 text-xs font-semibold flex items-center gap-1.5">
              <Users size={15} className="text-emerald-700" aria-hidden="true" /> Dân số khu phố
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {KP3_OFFICIAL_BASELINE.population.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-600">Nhân khẩu quản lý trên VNeID</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-600 text-xs font-semibold flex items-center gap-1.5">
              <Briefcase size={15} className="text-amber-700" aria-hidden="true" /> Cơ sở kinh doanh
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {KP3_OFFICIAL_BASELINE.activeBusinessesTotal.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-600">Hộ KD cá thể & doanh nghiệp</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-600 text-xs font-semibold flex items-center gap-1.5">
              <Award size={15} className="text-purple-700" aria-hidden="true" /> Đô thị văn minh
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">100%</div>
            <p className="text-xs text-slate-600">Hẻm đạt chuẩn xanh - sạch - đẹp</p>
          </div>
        </div>

        {/* 3. Bản Đồ Số Hóa Địa Giới Hành Chính Khu Phố 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-black text-rose-700 uppercase tracking-widest block">
                BẢN ĐỒ ĐỊA GIỚI HÀNH CHÍNH
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Bản Đồ Số Hóa Vị Trí Địa Lý Khu Phố 3
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowMapZoom(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 size={14} aria-hidden="true" /> Phóng to bản đồ
              </button>
              <a 
                href="https://danguy.phuonganphu.gov.vn/ban-do" 
                target="_blank" 
                rel="noreferrer"
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gov-blue hover:bg-gov-navy text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                Bản đồ 14 KP Phường <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Cột Trái: Ảnh Bản đồ số KP3 từ Server Phường An Phú */}
            <div className="lg:col-span-7">
              <button 
                type="button"
                onClick={() => setShowMapZoom(true)}
                aria-label="Nhấn để phóng to bản đồ địa giới Khu phố 3"
                className="group relative w-full block text-left rounded-2xl overflow-hidden border border-slate-200 cursor-pointer aspect-video bg-slate-100"
              >
                <img 
                  src="https://danguy.phuonganphu.gov.vn/assets/images/maps/khu-pho-3.jpg?v=20261103-155725" 
                  alt="Bản đồ địa giới hành chính Khu phố 3 - Phường An Phú" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3 px-3.5 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold inline-flex items-center gap-1.5 border border-white/25">
                  <Maximize2 size={14} aria-hidden="true" /> Phóng to bản đồ chi tiết
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-700 text-white text-xs font-black tracking-wider uppercase border border-rose-500">
                  SỐ HÓA: KHU PHỐ 3
                </div>
              </button>
            </div>

            {/* Cột Phải: Miêu tả địa giới & Trục đường giao thông */}
            <div className="lg:col-span-5 space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
                <span className="font-bold text-gov-navy flex items-center gap-1.5 text-xs">
                  <MapPin size={15} className="text-rose-500" /> Tọa độ & Trục giao thông chính:
                </span>
                <p className="leading-relaxed">
                  Địa bàn Khu phố 3 nằm trong quy hoạch chỉnh trang đô thị đồng bộ, kết nối thuận lợi thông qua các tuyến giao thông trọng điểm:
                </p>
                <ul className="space-y-1 font-medium text-slate-700 pl-2">
                  <li>• <strong>Đường Lương Định Của</strong> (Trục thương mại, dịch vụ sôi động)</li>
                  <li>• <strong>Đường Song Hành</strong> & Tuyến kết nối Đại lộ Mai Chí Thọ</li>
                  <li>• Hệ thống <strong>16 tuyến hẻm nội khu</strong> bê tông hóa 100%</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Điểm nhấn mô hình tự quản:
                </span>
                <p className="leading-relaxed text-emerald-800">
                  Toàn bộ 16 tuyến hẻm đều thành lập <strong>Tổ liên gia an toàn PCCC</strong>, 
                  camera an ninh giám sát 24/7 và hệ thống thùng rác phân loại tại nguồn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Cấp Ủy & Chi Bộ Khu Phố 3 (Dữ Liệu Không Gian Số Đảng Ủy Phường) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-rose-700 uppercase tracking-widest block">
                TỔ CHỨC CƠ SỞ ĐẢNG TRỰC THUỘC
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Cấp Ủy Chi Bộ Khu Phố 3 (4 Cấp Ủy Viên)
              </h2>
            </div>
            <a 
              href="https://danguy.phuonganphu.gov.vn/chi-bo" 
              target="_blank" 
              rel="noreferrer"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              Tra cứu danh sách 39 Chi bộ Phường <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {capUyKP3.map((cu) => (
              <div 
                key={cu.id}
                className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between space-y-3 ${
                  cu.highlight 
                    ? "bg-rose-50/50 border-rose-200" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      #{cu.id}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      cu.highlight 
                        ? "bg-red-700 text-white border-red-700" 
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}>
                      {cu.role}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      {cu.name}
                    </h3>
                    {cu.subRole && (
                      <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                        {cu.subRole}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cu.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 font-medium">Điện thoại:</span>
                  <a 
                    href={`tel:${cu.phone}`} 
                    className="min-h-[36px] text-xs font-black font-mono text-gov-blue hover:text-gov-navy flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <Phone size={12} aria-hidden="true" /> {cu.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Cổng Liên Kết Số Hóa Đảng Ủy Phường An Phú (Inter-portal Navigation) */}
        <div className="bg-slate-800 border border-slate-700 text-white rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-4">
            <div>
              <span className="text-xs font-extrabold text-teal-300 uppercase tracking-wider block">
                HỆ SINH THÁI CHUYỂN ĐỔI SỐ
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Cổng Không Gian Số Đảng Ủy Phường An Phú
              </h2>
            </div>
            <a 
              href="https://danguy.phuonganphu.gov.vn/" 
              target="_blank" 
              rel="noreferrer"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
            >
              Mở Cổng Đảng ủy Phường <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <a 
              href="https://danguy.phuonganphu.gov.vn/ban-do" 
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-300 text-sm flex items-center gap-1.5">
                  <Compass size={16} /> Bản đồ số 14 Khu phố
                </span>
                <ChevronRight size={14} className="text-white/60" />
              </div>
              <p className="text-slate-300 leading-relaxed">
                Tra cứu trực quan toàn bộ bản đồ địa giới hành chính 14 khu phố Phường An Phú sau khi sắp xếp theo Nghị quyết 34-NQ/ĐU.
              </p>
            </a>

            <a 
              href="https://danguy.phuonganphu.gov.vn/chi-bo" 
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-300 text-sm flex items-center gap-1.5">
                  <Building2 size={16} /> 39 Chi, Đảng bộ trực thuộc
                </span>
                <ChevronRight size={14} className="text-white/60" />
              </div>
              <p className="text-slate-300 leading-relaxed">
                Danh sách lãnh đạo cấp ủy, điện thoại liên hệ và địa chỉ của 14 Chi bộ Khu phố, Khối trường học, LLVT và Doanh nghiệp.
              </p>
            </a>

            <a 
              href="https://www.facebook.com/share/1DX3AibKtJ/?mibextid=wwXIfr" 
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-300 text-sm flex items-center gap-1.5">
                  <Globe size={16} /> Fanpage Phường An Phú
                </span>
                <ChevronRight size={14} className="text-white/60" />
              </div>
              <p className="text-slate-300 leading-relaxed">
                Kênh thông tin tuyên truyền chính thức của Đảng ủy – HĐND – UBND Phường An Phú trên mạng xã hội Facebook.
              </p>
            </a>
          </div>
        </div>

      </div>

      {/* MODAL PHÓNG TO BẢN ĐỒ CHI TIẾT */}
      {showMapZoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 bg-slate-50">
              <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                <span className="font-black px-2.5 py-0.5 rounded-full bg-rose-700 text-white">
                  KHU PHỐ 3
                </span>
                <span className="font-bold text-slate-800 truncate">Bản đồ số địa giới hành chính Phường An Phú</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a 
                  href="https://danguy.phuonganphu.gov.vn/assets/images/maps/khu-pho-3.jpg?v=20261103-155725" 
                  target="_blank" 
                  rel="noreferrer"
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  Mở ảnh gốc <ExternalLink size={12} aria-hidden="true" />
                </a>
                <button 
                  type="button"
                  onClick={() => setShowMapZoom(false)}
                  aria-label="Đóng bản đồ phóng to"
                  className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100">
              <img 
                src="https://danguy.phuonganphu.gov.vn/assets/images/maps/khu-pho-3.jpg?v=20261103-155725" 
                alt="Bản đồ Khu phố 3 phóng to" 
                className="max-h-[75vh] w-auto object-contain rounded-xl border border-slate-200"
              />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 text-center text-xs text-slate-600">
              Nguồn trích xuất: Bản đồ số 14 Khu phố — Không Gian Số Đảng Ủy Phường An Phú (Nhiệm kỳ 2025 – 2030)
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

