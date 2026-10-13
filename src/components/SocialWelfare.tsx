import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Search, 
  Filter, 
  User, 
  Phone, 
  MapPin, 
  Plus, 
  Sparkles, 
  FileCheck, 
  AlertCircle,
  Clock,
  Gift,
  Trash2,
  X,
  Printer,
  Eye,
  LayoutGrid,
  List
} from "lucide-react";
import { WelfareRecipient, Resident } from "../types";
import Pagination from "./Pagination";

interface SocialWelfareProps {
  recipients: WelfareRecipient[];
  onUpdateStatus: (id: string, status: "Đang nhận trợ cấp" | "Chờ duyệt hồ sơ" | "Đã tạm ngưng") => void;
  onAddRecipient: (newRec: WelfareRecipient) => void;
  onDeleteRecipient: (id: string) => void;
  residents?: Resident[];
}

export default function SocialWelfare({ recipients, onUpdateStatus, onAddRecipient, onDeleteRecipient, residents = [] }: SocialWelfareProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<WelfareRecipient | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const itemsPerPage = 8;

  const handleOpenDetailModal = (rec: WelfareRecipient) => {
    setSelectedRecipient(rec);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
  };

  // Close detail modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showDetailModal) {
        setShowDetailModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDetailModal]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  // Confirmation state for deleting a welfare recipient
  const [recipientToDelete, setRecipientToDelete] = useState<WelfareRecipient | null>(null);

  // Modern Toast system
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const executeDeleteRecipient = (id: string) => {
    onDeleteRecipient(id);
    showToast("Đã xóa đối tượng khỏi danh sách trợ cấp thành công!", "success");
    setRecipientToDelete(null);
    
    // Auto-select another recipient
    const remaining = recipients.filter(r => r.id !== id);
    setSelectedRecipient(remaining[0] || null);
  };

  const standardCategories = ["Gia đình chính sách", "Hộ nghèo/Cận nghèo", "Người có công", "Người cao tuổi", "Trẻ em mồ côi"];
  const uniqueCategories = Array.from(new Set(recipients.map(r => r.category)));
  const customCategories = uniqueCategories.filter(cat => !standardCategories.includes(cat));

  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState<string>("Người có công");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryValue, setCustomCategoryValue] = useState("");
  const [address, setAddress] = useState("42/ Lương Định Của, Phường An Phú");
  const [cccd, setCccd] = useState("");
  const [phone, setPhone] = useState("");
  const [supportLevel, setSupportLevel] = useState("1.500.000đ / tháng");
  const [notes, setNotes] = useState("");

  // Lock body scroll when modals open
  useEffect(() => {
    if (showDetailModal || showModal || recipientToDelete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailModal, showModal, recipientToDelete]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !cccd) {
      alert("Vui lòng nhập họ tên và số CCCD");
      return;
    }

    const finalCategory = isCustomCategory ? customCategoryValue.trim() : category;
    if (!finalCategory) {
      alert("Vui lòng nhập hoặc chọn diện chính sách!");
      return;
    }

    const newRec: WelfareRecipient = {
      id: "WF" + (recipients.length + 1).toString().padStart(3, "0"),
      fullName,
      category: finalCategory,
      address,
      cccd,
      phone: phone || undefined,
      supportLevel,
      status: "Chờ duyệt hồ sơ",
      notes
    };
    onAddRecipient(newRec);
    setSelectedRecipient(newRec);
    setShowModal(false);

    // Reset fields
    setFullName("");
    setCccd("");
    setPhone("");
    setNotes("");
    setIsCustomCategory(false);
    setCustomCategoryValue("");
    setCategory("Người có công");
  };

  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.cccd.includes(searchTerm) || 
                          r.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "Tất cả" || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination Logic
  const totalItems = filteredRecipients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedRecipients = filteredRecipients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="social-welfare-view" className="space-y-6">
      {/* Upper Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-sans">An sinh Xã hội & Trợ giúp Cộng đồng</h1>
          <p className="text-xs text-slate-500 mt-0.5">Quản lý và theo dõi diện chính sách, người có công, bảo trợ xã hội và hộ gia đình khó khăn</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Đề xuất Diện Trợ cấp mới
        </button>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600"><Heart size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Người có công & Gia đình LS</span>
            <span className="text-base font-bold text-slate-800">12 đối tượng</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600"><Gift size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hộ nghèo & Cận nghèo</span>
            <span className="text-base font-bold text-slate-800">4 hộ gia đình</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600"><FileCheck size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ngân sách chi trả tháng này</span>
            <span className="text-base font-extrabold text-indigo-600">32.400.000đ</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600"><Sparkles size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hồ sơ mới chờ duyệt</span>
            <span className="text-base font-bold text-amber-600">{recipients.filter(r => r.status === "Chờ duyệt hồ sơ").length} hồ sơ</span>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên công dân, số CCCD hoặc địa chỉ..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500 bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Filter size={14} /> Phân loại:</span>
            <select 
              value={categoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-rose-500"
            >
              <option value="Tất cả">Tất cả danh mục</option>
              <option value="Gia đình chính sách">Gia đình chính sách</option>
              <option value="Hộ nghèo/Cận nghèo">Hộ nghèo/Cận nghèo</option>
              <option value="Người có công">Người có công</option>
              <option value="Người cao tuổi">Người cao tuổi</option>
              <option value="Trẻ em mồ côi">Trẻ em mồ côi</option>
              {customCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "card" ? "bg-white text-rose-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              title="Xem dạng Lưới Thẻ"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-rose-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              title="Xem dạng Bảng Danh sách"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Toàn bộ chiều rộng cho danh sách Đối tượng chính sách */}
      <div className="w-full space-y-4">
        {viewMode === "card" ? (
          /* Card Grid View: 1 đến 4 cột */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedRecipients.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">
                Không tìm thấy thông tin đối tượng chính sách phù hợp bộ lọc
              </div>
            ) : (
              paginatedRecipients.map((rec) => {
                const statusColors = {
                  "Đang nhận trợ cấp": "bg-emerald-50 text-emerald-700 border-emerald-100",
                  "Chờ duyệt hồ sơ": "bg-amber-50 text-amber-700 border-amber-100",
                  "Đã tạm ngưng": "bg-slate-50 text-slate-500 border-slate-100"
                };
                const isSelected = selectedRecipient?.id === rec.id && showDetailModal;
                return (
                  <div 
                    key={rec.id}
                    id={`welfare-card-${rec.id}`}
                    onClick={() => handleOpenDetailModal(rec)}
                    className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group
                      ${isSelected ? "border-rose-500 ring-2 ring-rose-500/10 shadow-sm" : "border-slate-150 hover:border-rose-300"}
                    `}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-sans">{rec.category}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${statusColors[rec.status]}`}>
                          {rec.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm group-hover:text-rose-700 transition-colors line-clamp-1">{rec.fullName}</h3>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={12} className="shrink-0" /> <span className="truncate">{rec.address}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                      <span className="font-mono font-medium">CCCD: {rec.cccd.substring(0, 6)}***</span>
                      <span className="font-extrabold text-rose-600">{rec.supportLevel}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{rec.id}</span>
                      <span className="text-[11px] text-rose-600 font-bold group-hover:underline flex items-center gap-0.5">
                        Xem hồ sơ ➜
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Table View: Toàn bộ chiều rộng */
          <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Mã & Đối tượng thụ hưởng</th>
                    <th className="py-3 px-4">Số CCCD & Liên hệ</th>
                    <th className="py-3 px-4">Phân loại Diện chính sách</th>
                    <th className="py-3 px-4">Địa chỉ cư ngụ</th>
                    <th className="py-3 px-4">Mức trợ cấp duyệt chi</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecipients.map((rec) => {
                    const statusColors = {
                      "Đang nhận trợ cấp": "bg-emerald-50 text-emerald-700 border-emerald-100",
                      "Chờ duyệt hồ sơ": "bg-amber-50 text-amber-700 border-amber-100",
                      "Đã tạm ngưng": "bg-slate-50 text-slate-500 border-slate-100"
                    };
                    const isSelected = selectedRecipient?.id === rec.id && showDetailModal;
                    return (
                      <tr 
                        key={rec.id}
                        onClick={() => handleOpenDetailModal(rec)}
                        className={`hover:bg-rose-50/30 transition-colors cursor-pointer ${
                          isSelected ? "bg-rose-50/60 font-medium" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 text-xs">{rec.fullName}</div>
                          <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 mt-0.5 inline-block">
                            {rec.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-700">{rec.cccd}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Phone size={11} /> {rec.phone || "Chưa có SĐT"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            {rec.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600 truncate max-w-[220px] flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span>{rec.address}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-rose-600 text-xs">{rec.supportLevel}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusColors[rec.status]}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(rec)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                              title="Xem chi tiết hồ sơ trợ cấp"
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">Hồ sơ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecipientToDelete(rec)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa đối tượng"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          id="social-welfare-pagination"
          currentPage={activePage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL CHI TIẾT ĐỐI TƯỢNG CHÍNH SÁCH CHÍNH GIỮA VIEWPORT (Chuẩn Reference KP3) */}
      {showDetailModal && selectedRecipient && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={handleCloseDetailModal}
        >
          <div 
            id="welfare-detail-modal"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-[500px] max-h-[min(90vh,760px)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Header: Dark Navy Gradient & Centered Icon/Name/Badges */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
              {/* Close Button top-right */}
              <button 
                id="btn-close-welfare-modal"
                onClick={handleCloseDetailModal}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>

              {/* Centered Circular Welfare Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-500/20 border-2 border-rose-400/50 text-rose-300 mx-auto flex items-center justify-center shadow-lg ring-4 ring-slate-800/80">
                <Heart size={32} className="fill-rose-400/30 text-rose-300" />
              </div>

              {/* Centered Name */}
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-3 text-center leading-snug break-words">
                {selectedRecipient.fullName}
              </h3>

              {/* Centered Badges: Mã hồ sơ (green) & Phân loại chính sách (blue) & Trạng thái */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  {selectedRecipient.id}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40">
                  {selectedRecipient.category}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedRecipient.status === "Đang nhận trợ cấp"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                    : selectedRecipient.status === "Chờ duyệt hồ sơ"
                    ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                    : "bg-rose-950/80 text-rose-300 border-rose-500/40"
                }`}>
                  {selectedRecipient.status}
                </span>
              </div>

              {/* Address subtext */}
              <p className="text-slate-300 text-xs mt-2 flex items-center justify-center gap-1 text-center">
                <MapPin size={12} className="text-rose-400 shrink-0" />
                <span className="truncate max-w-xs">{selectedRecipient.address}</span>
              </p>
            </div>

            {/* Scrollable Body: Divided into Clean Info Cards */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 bg-slate-50/60 text-slate-800">
              
              {/* Thẻ 1: Thông tin định danh & CCCD */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                  <User size={15} className="text-rose-600" />
                  <span>1. Thông tin Định danh & Công dân</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Số thẻ CCCD:</span>
                    <span className="text-[13px] font-bold text-slate-800 font-mono">{selectedRecipient.cccd}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Số điện thoại:</span>
                    <span className="text-[13px] font-semibold text-slate-800 font-mono flex items-center gap-1">
                      <Phone size={12} className="text-slate-400" /> {selectedRecipient.phone || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Nơi cư ngụ hiện nay:</span>
                    <span className="text-[13px] font-medium text-slate-800 flex items-start gap-1">
                      <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" /> {selectedRecipient.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Chế độ chính sách & Mức trợ cấp */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                  <Gift size={15} className="text-emerald-600" />
                  <span>2. Chế độ Chính sách & Quyền lợi</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Diện chính sách:</span>
                    <span className="text-[13px] font-bold text-rose-700">{selectedRecipient.category}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Mức trợ cấp duyệt chi:</span>
                    <span className="text-sm font-black text-rose-700">{selectedRecipient.supportLevel}</span>
                  </div>
                  <div className="sm:col-span-2 pt-1 border-t border-slate-50">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Hình thức chi trả:</span>
                    <span className="text-xs text-slate-700">Chi trả hàng tháng qua tài khoản An sinh xã hội hoặc nhận trực tiếp tại Nhà văn hóa KP3</span>
                  </div>
                </div>
              </div>

              {/* Thẻ 3: Ghi chú khảo sát & Thẩm định */}
              {selectedRecipient.notes && (
                <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                    <FileCheck size={15} className="text-indigo-600" />
                    <span>3. Ghi chú khảo sát & Thẩm định</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    {selectedRecipient.notes}
                  </p>
                </div>
              )}

              {/* Thẻ 4: Quy chế giám sát định kỳ */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex gap-2.5 text-xs">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-slate-800 text-xs mb-0.5">Khảo sát & Kiểm duyệt định kỳ</span>
                  <span className="text-slate-500 leading-relaxed text-[11px]">Hàng quý, Ban xóa đói giảm nghèo phường phối hợp cùng Chi hội Chữ thập đỏ KP3 rà soát thực tế thu nhập và hoàn cảnh gia đình.</span>
                </div>
              </div>

            </div>

            {/* Footer Modal Actions */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button 
                  onClick={() => onUpdateStatus(selectedRecipient.id, "Đang nhận trợ cấp")}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedRecipient.status === "Đang nhận trợ cấp"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  Duyệt chi
                </button>
                <button 
                  onClick={() => onUpdateStatus(selectedRecipient.id, "Đã tạm ngưng")}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedRecipient.status === "Đã tạm ngưng"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Tạm ngưng
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="In phiếu xác nhận trợ cấp"
                >
                  <Printer size={13} />
                  <span>In</span>
                </button>

                <button 
                  onClick={() => {
                    setRecipientToDelete(selectedRecipient);
                    setShowDetailModal(false);
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Xóa</span>
                </button>

                <button 
                  onClick={handleCloseDetailModal}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Recipient Modal (Chuẩn Reference KP3) */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-slate-950/65 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-700/50 flex flex-col max-h-[min(90vh,760px)]"
          >
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-400/50 text-rose-300 mx-auto flex items-center justify-center shadow-lg ring-4 ring-slate-800/80 mb-2">
                <Heart size={26} className="fill-rose-400/30 text-rose-300" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Đề xuất Hồ sơ An sinh Xã hội mới
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Đăng ký diện chính sách, trợ cấp thường xuyên cho công dân KP3
              </p>
            </div>
             <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Chọn nhanh từ danh sách cư dân khu phố</label>
                <select
                  onChange={(e) => {
                    const selectedCccd = e.target.value;
                    if (!selectedCccd) return;
                    const res = residents.find(r => r.cccd === selectedCccd);
                    if (res) {
                      setFullName(res.fullName);
                      setCccd(res.cccd);
                      setPhone(res.phone === "N/A" ? "" : res.phone);
                      setAddress(res.address);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500 bg-white"
                >
                  <option value="">-- Chọn cư dân có sẵn trong hệ thống --</option>
                  {residents.map(r => (
                    <option key={r.cccd} value={r.cccd}>
                      {r.fullName} - CCCD: {r.cccd}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">Hệ thống tự động liên kết điền dữ liệu của cư dân được chọn</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Họ và Tên đối tượng thụ hưởng *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Trần Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Diện chính sách đề xuất *</label>
                  <select 
                    value={isCustomCategory ? "Khác" : category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Khác") {
                        setIsCustomCategory(true);
                        setCustomCategoryValue("");
                      } else {
                        setIsCustomCategory(false);
                        setCategory(val);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500 bg-white"
                  >
                    <option value="Gia đình chính sách">Gia đình chính sách</option>
                    <option value="Hộ nghèo/Cận nghèo">Hộ nghèo/Cận nghèo</option>
                    <option value="Người có công">Người có công</option>
                    <option value="Người cao tuổi">Người cao tuổi</option>
                    <option value="Trẻ em mồ côi">Trẻ em mồ côi</option>
                    <option value="Khác">-- Diện khác (Nhập thủ công) --</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Mức hỗ trợ đề xuất (tháng) *</label>
                  <input 
                    type="text" 
                    required
                    value={supportLevel}
                    onChange={(e) => setSupportLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Input block for manual custom category input */}
              {isCustomCategory && (
                <div className="space-y-1.5 p-3 bg-rose-50/50 rounded-xl border border-rose-100/60 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-rose-800 block">Tự nhập diện chính sách mới *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ví dụ: Người khuyết tật, Gia đình neo đơn..."
                    value={customCategoryValue}
                    onChange={(e) => setCustomCategoryValue(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:border-rose-500 bg-white"
                  />
                  <span className="text-[10px] text-rose-600 block">Diện chính sách này sẽ được ghi nhận vào danh sách phân loại</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Số CCCD / Số Định danh cá nhân *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="079xxxxxxxxxx"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Số điện thoại liên lạc</label>
                  <input 
                    type="text" 
                    placeholder="09xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Địa chỉ thường trú / tạm trú của gia đình *</label>
                <input 
                  type="text" 
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Mô tả hoàn cảnh / Lý do đề xuất</label>
                <textarea 
                  rows={3}
                  placeholder="Nêu rõ hoàn cảnh khó khăn thực tế, bệnh tật, thu nhập hay công lao cách mạng để có cơ sở thẩm định nhanh hơn..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Tạo Đề xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Toast Notification Container */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            {toast.message}
          </div>
        </div>
      )}

      {/* Modern Custom Recipient Deletion Confirmation Dialog */}
      {recipientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Xác nhận xóa đối tượng trợ cấp</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa đối tượng <strong className="text-slate-800">{recipientToDelete.fullName}</strong> (<span className="text-rose-700 font-semibold">{recipientToDelete.category}</span>) khỏi danh sách trợ giúp an sinh xã hội không?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecipientToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => executeDeleteRecipient(recipientToDelete.id)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
