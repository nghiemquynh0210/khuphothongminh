import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MapPin, 
  User, 
  Phone, 
  Clock, 
  ArrowRight,
  Plus,
  X,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  TrendingUp,
  Upload,
  Pencil,
  Trash2,
  Eye,
  LayoutGrid,
  List,
  AlertTriangle
} from "lucide-react";
import { FieldReport } from "../types";
import Pagination from "./Pagination";

interface FieldReflectionsProps {
  reports: FieldReport[];
  onAddReport: (newReport: FieldReport) => void;
  onUpdateReportStatus: (id: string, status: "Đã tiếp nhận" | "Đang xử lý" | "Đã giải quyết", actorName?: string, actionDetail?: string) => void;
  onUpdateReports?: (reports: FieldReport[]) => void;
  currentUser?: {
    username: string;
    fullName: string;
    role: "canbo" | "nguoidan";
    cccd?: string;
    householdCode?: string;
    phone?: string;
  } | null;
}

export default function FieldReflections({ reports, onAddReport, onUpdateReportStatus, onUpdateReports, currentUser }: FieldReflectionsProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const selectedReport = reports.find(r => r.id === selectedReportId) || null;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const itemsPerPage = 8;
  const [viewingImagePreview, setViewingImagePreview] = useState<{ url: string; caption?: string } | null>(null);

  const handleOpenDetailModal = (repId: string) => {
    setSelectedReportId(repId);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
  };

  // Close detail modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewingImagePreview) {
          setViewingImagePreview(null);
        } else if (showDetailModal) {
          setShowDetailModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDetailModal, viewingImagePreview]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  // New Report Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"Rác thải" | "Lấn chiếm lòng đường" | "Tiếng ồn" | "An ninh trật tự" | "Hạ tầng đô thị">("Rác thải");
  const [reporterName, setReporterName] = useState(currentUser?.role === "canbo" ? currentUser.fullName : "");
  const [reporterPhone, setReporterPhone] = useState(currentUser?.role === "canbo" ? (currentUser.phone || "") : "");
  const [location, setLocation] = useState("42/ Lương Định Của");
  const [description, setDescription] = useState("");

  const handleOpenNewModal = () => {
    if (currentUser?.role === "canbo") {
      setReporterName(currentUser.fullName);
      setReporterPhone(currentUser.phone || "");
    } else {
      setReporterName("");
      setReporterPhone("");
    }
    setShowModal(true);
  };

  // Deletion States
  const [reportToDelete, setReportToDelete] = useState<FieldReport | null>(null);

  // Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<"Rác thải" | "Lấn chiếm lòng đường" | "Tiếng ồn" | "An ninh trật tự" | "Hạ tầng đô thị">("Rác thải");
  const [editLocation, setEditLocation] = useState("");
  const [editReporterName, setEditReporterName] = useState("");
  const [editReporterPhone, setEditReporterPhone] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBeforeImage, setEditBeforeImage] = useState("");
  const [dragActiveEdit, setDragActiveEdit] = useState(false);

  // Custom Resolve States
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveImage, setResolveImage] = useState("");
  const [resolveDescription, setResolveDescription] = useState("Xử lý dọn dẹp hiện trạng thành công, trả lại mỹ quan cho vỉa hè / khu dân cư.");
  const [dragActiveResolve, setDragActiveResolve] = useState(false);

  // Lock body scroll when modals open
  useEffect(() => {
    if (showDetailModal || showModal || reportToDelete || showResolveModal || showEditModal || viewingImagePreview) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailModal, showModal, reportToDelete, showResolveModal, showEditModal, viewingImagePreview]);

  // Image Upload and Drag & Drop states
  const [beforeImage, setBeforeImage] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chỉ chọn tệp hình ảnh (jpg, png, jpeg...)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setBeforeImage(reader.result as string);
      showToast("Đã đính kèm ảnh hiện trường thành công!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Execute Deletion
  const executeDeleteReport = (id: string) => {
    if (onUpdateReports) {
      const remaining = reports.filter(r => r.id !== id);
      onUpdateReports(remaining);
      showToast("Đã xóa phản ánh khỏi hệ thống thành công!", "success");
      setReportToDelete(null);
      setSelectedReportId(remaining[0]?.id || null);
    } else {
      showToast("Không tìm thấy hàm cập nhật danh sách!", "error");
    }
  };

  // Open Edit Modal with Pre-populated details
  const handleOpenEditModal = (report: FieldReport) => {
    setEditTitle(report.title);
    setEditCategory(report.category);
    setEditLocation(report.location);
    setEditReporterName(report.reporterName);
    setEditReporterPhone(report.reporterPhone);
    setEditDescription(report.description);
    setEditBeforeImage(report.beforeImage || "");
    setShowEditModal(true);
  };

  // Execute Update of Report Details
  const handleUpdateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    const updated: FieldReport = {
      ...selectedReport,
      title: editTitle,
      category: editCategory,
      location: editLocation,
      reporterName: editReporterName,
      reporterPhone: editReporterPhone,
      description: editDescription,
      beforeImage: editBeforeImage
    };

    if (onUpdateReports) {
      const updatedList = reports.map(r => r.id === selectedReport.id ? updated : r);
      onUpdateReports(updatedList);
      showToast("Đã cập nhật thông tin phản ánh thành công!", "success");
      setShowEditModal(false);
    } else {
      showToast("Không tìm thấy hàm cập nhật danh sách!", "error");
    }
  };

  // Image Upload and drag handlers for Edit Modal
  const handleFileProcessEdit = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chỉ chọn tệp hình ảnh (jpg, png, jpeg...)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditBeforeImage(reader.result as string);
      showToast("Đã tải lên ảnh hiện trường mới!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDragEdit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveEdit(true);
    } else if (e.type === "dragleave") {
      setDragActiveEdit(false);
    }
  };

  const handleDropEdit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveEdit(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcessEdit(e.dataTransfer.files[0]);
    }
  };

  const handleFileChangeEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcessEdit(e.target.files[0]);
    }
  };

  // Open Resolve (Complete) Dialog
  const handleOpenResolveModal = () => {
    setResolveImage("");
    setResolveDescription("Đã cử lực lượng chức năng đến xử lý hiện trạng sạch sẽ, trả lại cảnh quan đô thị thông thoáng.");
    setShowResolveModal(true);
  };

  // Execute Resolve (Complete) with optional photo
  const executeResolveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    // Call standard App.tsx update to set general progress log
    onUpdateReportStatus(
      selectedReport.id,
      "Đã giải quyết",
      "Ủy ban Nhân dân Phường",
      resolveDescription
    );

    // Save customized details into memory
    if (onUpdateReports) {
      setTimeout(() => {
        onUpdateReports(reports.map(r => {
          if (r.id === selectedReport.id) {
            const timeStr = new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour12: false });
            return {
              ...r,
              status: "Đã giải quyết",
              afterImage: resolveImage || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300",
              timeline: [
                ...r.timeline.filter(item => item.title !== "Đã xử lý hoàn thành"), // remove the generic one if added
                {
                  time: timeStr,
                  title: "Đã xử lý hoàn thành",
                  description: resolveDescription,
                  actor: "Ủy ban Nhân dân Phường"
                }
              ]
            };
          }
          return r;
        }));
      }, 50);
    }

    setShowResolveModal(false);
    showToast("Đã xử lý và lưu kết quả giải quyết phản ánh thành công!", "success");
  };

  // Image Upload and drag handlers for Resolve Modal
  const handleFileProcessResolve = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chỉ chọn tệp hình ảnh (jpg, png, jpeg...)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setResolveImage(reader.result as string);
      showToast("Đã tải lên ảnh kết quả hoàn thành!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDragResolve = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveResolve(true);
    } else if (e.type === "dragleave") {
      setDragActiveResolve(false);
    }
  };

  const handleDropResolve = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveResolve(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcessResolve(e.dataTransfer.files[0]);
    }
  };

  const handleFileChangeResolve = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcessResolve(e.target.files[0]);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reporterName || !reporterPhone) {
      showToast("Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)", "error");
      return;
    }

    const newReport: FieldReport = {
      id: "REP" + (reports.length + 1).toString().padStart(3, "0"),
      title,
      category,
      reporterName,
      reporterPhone,
      reportedAt: new Date().toLocaleString("vi-VN", { hour12: false }).replace(/\//g, "-"),
      location,
      coordinates: { x: Math.floor(20 + Math.random() * 60), y: Math.floor(20 + Math.random() * 60) },
      description,
      status: "Đã tiếp nhận",
      timeline: [
        { 
          time: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour12: false }),
          title: "Gửi phản ánh",
          description: "Hệ thống ghi nhận ý kiến phản ánh từ công dân kèm ảnh hiện trường đính kèm.",
          actor: `${reporterName} (Công dân)`
        }
      ],
      beforeImage: beforeImage || "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=300" // default mock issue image
    };

    onAddReport(newReport);
    setSelectedReportId(newReport.id);
    setShowModal(false);
    showToast("Đã gửi phản ánh hiện trường 1022 mới thành công!", "success");

    // Reset Form
    setTitle("");
    setReporterName("");
    setReporterPhone("");
    setDescription("");
    setBeforeImage("");
  };

  // Filter Reports logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Tất cả" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="field-reflections-view" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tiếp nhận Phản ánh Hiện trường (1022)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Xử lý kịp thời các ý kiến, khiếu nại của cư dân về môi trường, trật tự đô thị, hạ tầng và an ninh</p>
        </div>
        <button 
          onClick={handleOpenNewModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Gửi Phản Ánh Mới
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            id="field-report-search-input"
            name="fieldReportSearch"
            type="text" 
            placeholder="Tìm theo nội dung phản ánh, người báo, địa chỉ..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Filter size={14} /> Lọc trạng thái:</span>
            <select 
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Đã tiếp nhận">Đã tiếp nhận</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Đã giải quyết">Đã giải quyết</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "card" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              title="Xem dạng Lưới Thẻ"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              title="Xem dạng Bảng Danh sách"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Toàn bộ chiều rộng cho danh sách Phản ánh hiện trường */}
      <div className="w-full space-y-4">
        {viewMode === "card" ? (
          /* Card Grid View: Toàn bộ chiều rộng, 1-3 cột */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedReports.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400 space-y-2">
                <MessageSquare size={36} className="mx-auto text-slate-300" />
                <p>Không tìm thấy phản ánh nào phù hợp với bộ lọc</p>
              </div>
            ) : (
              paginatedReports.map((report) => {
                const statusColors = {
                  "Đã tiếp nhận": "bg-blue-50 text-blue-700 border-blue-200",
                  "Đang xử lý": "bg-amber-50 text-amber-700 border-amber-200",
                  "Đã giải quyết": "bg-emerald-50 text-emerald-700 border-emerald-200"
                };
                const isSelected = selectedReportId === report.id && showDetailModal;

                return (
                  <div
                    key={report.id}
                    id={`report-card-${report.id}`}
                    onClick={() => handleOpenDetailModal(report.id)}
                    className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group
                      ${isSelected ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm" : "border-slate-150 hover:border-emerald-300"}
                    `}
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono tracking-wider">
                          {report.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[report.status]}`}>
                          {report.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                          {report.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {report.description}
                        </p>
                      </div>

                      {/* Before / After Thumbnail previews */}
                      {(report.beforeImage || report.afterImage) && (
                        <div className="flex items-center gap-2 pt-1">
                          {report.beforeImage && (
                            <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                              <img src={report.beforeImage} alt="Hiện trạng" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-[8px] text-white text-center font-bold">Trước</span>
                            </div>
                          )}
                          {report.afterImage && (
                            <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0">
                              <img src={report.afterImage} alt="Xử lý xong" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-emerald-700/80 text-[8px] text-white text-center font-bold">Sau</span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 pl-1 font-mono">
                            {report.afterImage ? "✓ Có ảnh hoàn tất" : "• Có ảnh hiện trường"}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{report.location}</span>
                        </span>
                        <span className="shrink-0 flex items-center gap-1 font-mono text-[10px]">
                          <Clock size={11} /> {report.reportedAt.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[11px]">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          {report.id}
                        </span>
                        <span className="text-emerald-700 font-bold group-hover:underline flex items-center gap-0.5">
                          Xem lộ trình ➜
                        </span>
                      </div>
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
                    <th className="py-3 px-4">Mã & Tiêu đề phản ánh</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Địa điểm</th>
                    <th className="py-3 px-4">Người gửi & SĐT</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReports.map((report) => {
                    const statusColors = {
                      "Đã tiếp nhận": "bg-blue-50 text-blue-700 border-blue-200",
                      "Đang xử lý": "bg-amber-50 text-amber-700 border-amber-200",
                      "Đã giải quyết": "bg-emerald-50 text-emerald-700 border-emerald-200"
                    };
                    const isSelected = selectedReportId === report.id && showDetailModal;

                    return (
                      <tr
                        key={report.id}
                        onClick={() => handleOpenDetailModal(report.id)}
                        className={`hover:bg-emerald-50/30 transition-colors cursor-pointer ${
                          isSelected ? "bg-emerald-50/60 font-medium" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                              {report.id}
                            </span>
                            <div className="font-bold text-slate-800 text-xs line-clamp-1">{report.title}</div>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 max-w-[280px]">
                            {report.description}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono">
                            {report.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600 truncate max-w-[200px] flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span>{report.location}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700 text-xs">{report.reporterName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{report.reporterPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {report.reportedAt}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusColors[report.status]}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(report.id)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                              title="Xem chi tiết lộ trình"
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">Chi tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(report)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportToDelete(report)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa phản ánh"
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

        {/* Pagination Component */}
        <Pagination
          id="reflection-pagination"
          currentPage={activePage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL CHI TIẾT PHẢN ÁNH HIỆN TRƯỜNG CHÍNH GIỮA VIEWPORT (Chuẩn Reference KP3) */}
      {showDetailModal && selectedReport && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={handleCloseDetailModal}
        >
          <div 
            id="reflection-detail-modal"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Header: Dark Navy Gradient & Centered Icon / Title / Badges */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
              <button 
                id="btn-close-reflection-modal"
                onClick={handleCloseDetailModal}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>

              {/* Centered Circular Reflection Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-300 mx-auto flex items-center justify-center shadow-lg ring-4 ring-slate-800/80 mb-2.5">
                <AlertTriangle size={32} className="text-emerald-300" />
              </div>

              {/* Centered Title */}
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight text-center leading-snug break-words">
                {selectedReport.title}
              </h2>

              {/* Centered Badges: Mã ID (green) & Chuyên mục (blue) & Trạng thái */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  {selectedReport.id}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40">
                  {selectedReport.category}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedReport.status === "Đã giải quyết" 
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" 
                    : selectedReport.status === "Đang xử lý"
                    ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                    : "bg-blue-950/80 text-blue-300 border-blue-500/40"
                }`}>
                  {selectedReport.status}
                </span>
              </div>

              {/* Location & Time */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300 mt-2 text-center">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-400 shrink-0" />
                  <span>{selectedReport.location}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Clock size={12} className="shrink-0" />
                  <span>{selectedReport.reportedAt}</span>
                </span>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 bg-slate-50/60 text-slate-800">
              
              {/* Thẻ 1: Thông tin người báo tin & Địa bàn */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                  <User size={15} className="text-emerald-600" />
                  <span>1. Người báo tin & Hiện trường tiếp nhận</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Họ tên người báo:</span>
                    <span className="text-[13px] font-bold text-slate-800 mt-0.5 block">{selectedReport.reporterName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Số điện thoại liên hệ:</span>
                    <span className="text-[13px] font-bold text-slate-800 font-mono mt-0.5 flex items-center gap-1">
                      <Phone size={12} className="text-slate-400" /> {selectedReport.reporterPhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Vị trí ghi nhận:</span>
                    <span className="text-[13px] font-medium text-slate-800 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-slate-400 shrink-0" /> {selectedReport.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Mô tả tình huống hiện trạng */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                  <MessageSquare size={15} className="text-emerald-600" />
                  <span>2. Nội dung chi tiết phản ánh</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-sans">
                  {selectedReport.description}
                </p>
              </div>

              {/* Thẻ 3: Hình ảnh đối chứng hiện trạng */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                  <ImageIcon size={15} className="text-emerald-600" />
                  <span>3. Hình ảnh đối chứng Hiện trường (Trước & Sau xử lý)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Before Image */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 text-[11px]">Hiện trạng ban đầu (Trước):</span>
                      {selectedReport.beforeImage && (
                        <button
                          type="button"
                          onClick={() => setViewingImagePreview({ url: selectedReport.beforeImage!, caption: `Hiện trạng: ${selectedReport.title}` })}
                          className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          Phóng to ↗
                        </button>
                      )}
                    </div>
                    <div 
                      onClick={() => selectedReport.beforeImage && setViewingImagePreview({ url: selectedReport.beforeImage, caption: `Hiện trạng: ${selectedReport.title}` })}
                      className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group relative cursor-pointer"
                    >
                      {selectedReport.beforeImage ? (
                        <img 
                          src={selectedReport.beforeImage} 
                          alt="Before reflection status"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                          <Camera size={20} className="mb-1 text-slate-300" /> Không có hình ảnh đính kèm
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Image */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 text-[11px] flex items-center gap-1">
                        <CheckCircle size={12} className="text-emerald-600" /> Kết quả (Sau xử lý):
                      </span>
                      {selectedReport.afterImage && (
                        <button
                          type="button"
                          onClick={() => setViewingImagePreview({ url: selectedReport.afterImage!, caption: `Kết quả hoàn tất: ${selectedReport.title}` })}
                          className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          Phóng to ↗
                        </button>
                      )}
                    </div>
                    <div 
                      onClick={() => selectedReport.afterImage && setViewingImagePreview({ url: selectedReport.afterImage, caption: `Kết quả hoàn tất: ${selectedReport.title}` })}
                      className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer"
                    >
                      {selectedReport.afterImage ? (
                        <img 
                          src={selectedReport.afterImage} 
                          alt="After reflection completion status"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-xs text-center p-3">
                          <Clock size={20} className="mb-1 text-slate-300" /> 
                          <span className="text-[11px]">Chưa cập nhật ảnh sau xử lý</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thẻ 4: Lộ trình và nhật ký xử lý công khai */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                  <TrendingUp size={15} className="text-emerald-600" />
                  <span>4. Lộ trình và nhật ký giải quyết</span>
                </div>
                
                <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedReport.timeline.map((item, idx) => (
                    <div key={idx} className="relative text-xs space-y-0.5">
                      <span className="absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 text-xs">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                      </div>
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">{item.description}</p>
                      <span className="text-[10px] font-semibold text-emerald-700 block">Thực hiện: {item.actor}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedReport.status !== "Đã giải quyết" ? (
                  <>
                    <button
                      onClick={() => onUpdateReportStatus(
                        selectedReport.id, 
                        "Đang xử lý", 
                        "Cán bộ trật tự đô thị",
                        "Xuống thực địa xác minh phản ánh và lập biên bản xử lý vi phạm."
                      )}
                      disabled={selectedReport.status === "Đang xử lý"}
                      className="text-xs font-bold py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Đang xử lý
                    </button>
                    <button
                      onClick={handleOpenResolveModal}
                      className="text-xs font-bold py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Đã giải quyết
                    </button>
                  </>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-emerald-600" />
                    Đã giải quyết hoàn tất
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedReport)}
                  className="text-xs font-semibold py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Pencil size={12} /> Sửa
                </button>
                <button
                  type="button"
                  onClick={() => setReportToDelete(selectedReport)}
                  className="text-xs font-semibold py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={12} /> Xóa
                </button>
                <button 
                  onClick={handleCloseDetailModal}
                  className="text-xs font-bold py-1.5 px-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* LIGHTBOX ENLARGE IMAGE PREVIEW */}
      {viewingImagePreview && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingImagePreview(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
              <img 
                src={viewingImagePreview.url} 
                alt="Enlarged preview" 
                className="max-h-[80vh] max-w-[90vw] object-contain"
              />
              <button
                onClick={() => setViewingImagePreview(null)}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer border border-white/20"
              >
                <X size={18} />
              </button>
            </div>
            {viewingImagePreview.caption && (
              <p className="text-white text-xs font-medium bg-slate-900/80 px-4 py-1.5 rounded-full border border-white/10">
                {viewingImagePreview.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add New Report Modal (Chuẩn Reference KP3) */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-slate-950/65 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-700/50 flex flex-col max-h-[min(90vh,760px)]"
          >
            {/* Header: Dark Navy Gradient & Centered Icon */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-300 mx-auto flex items-center justify-center shadow-lg ring-4 ring-slate-800/80 mb-2">
                <AlertTriangle size={26} className="text-emerald-300" />
              </div>

              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Gửi Phản ánh Hiện trường mới
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tiếp nhận sự việc đô thị, vệ sinh môi trường, an ninh trật tự KP3
              </p>
            </div>
            <form onSubmit={handleSubmitReport} className="p-5 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Tiêu đề phản ánh ngắn gọn *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Đống rác tự phát chắn lối hẻm 42"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Danh mục sự việc</label>
                  <select 
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Rác thải">Rác thải</option>
                    <option value="Lấn chiếm lòng đường">Lấn chiếm lòng đường</option>
                    <option value="Tiếng ồn">Tiếng ồn</option>
                    <option value="An ninh trật tự">An ninh trật tự</option>
                    <option value="Hạ tầng đô thị">Hạ tầng đô thị</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Vị trí hiện trường *</label>
                  <input 
                    type="text" 
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Họ tên người báo tin *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nguyễn Văn B"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Số điện thoại liên lạc *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="09xxxxxxxx"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Mô tả tình huống hiện trạng</label>
                <textarea 
                  rows={3}
                  placeholder="Ghi rõ chi tiết sự việc để ban tự quản và đội đô thị phường dễ dàng xác minh..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Drag-and-drop image upload field in Add Report Modal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Hình ảnh đính kèm hiện trạng</label>
                <div 
                  className={`border border-dashed rounded-xl p-4 transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer relative
                    ${dragActive ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-slate-350"}
                    ${beforeImage ? "bg-slate-50/50" : "bg-white"}
                  `}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  {beforeImage ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-100">
                        <img 
                          src={beforeImage} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setBeforeImage("")}
                          className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1 rounded-full shadow transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-1.5">✓ Đã đính kèm ảnh hiện trạng! Sẵn sàng gửi.</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full py-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                      <Upload size={20} className="text-slate-400 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">Kéo thả ảnh tại đây, hoặc <span className="text-emerald-600 hover:underline font-bold">chọn từ thiết bị</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Định dạng JPG, PNG. Dung lượng dưới 5MB</p>
                    </label>
                  )}
                </div>
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Gửi Phản Ánh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-4 text-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">Xác nhận xóa phản ánh</h3>
                <p className="text-xs text-slate-500">Bạn có chắc chắn muốn xóa phản ánh <span className="font-mono text-indigo-600 font-bold">{reportToDelete.id}</span> không? Hành động này không thể hoàn tác.</p>
              </div>
              <div className="flex gap-3 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setReportToDelete(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteReport(reportToDelete.id)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Xác nhận Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Chỉnh sửa thông tin phản ánh</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateReport} className="p-5 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Tiêu đề phản ánh *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Tiêu đề sự việc"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Danh mục sự việc</label>
                  <select 
                    value={editCategory}
                    onChange={(e: any) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Rác thải">Rác thải</option>
                    <option value="Lấn chiếm lòng đường">Lấn chiếm lòng đường</option>
                    <option value="Tiếng ồn">Tiếng ồn</option>
                    <option value="An ninh trật tự">An ninh trật tự</option>
                    <option value="Hạ tầng đô thị">Hạ tầng đô thị</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Vị trí hiện trường *</label>
                  <input 
                    type="text" 
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Họ tên người báo tin *</label>
                  <input 
                    type="text" 
                    required
                    value={editReporterName}
                    onChange={(e) => setEditReporterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Số điện thoại liên lạc *</label>
                  <input 
                    type="text" 
                    required
                    value={editReporterPhone}
                    onChange={(e) => setEditReporterPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Mô tả tình huống hiện trạng</label>
                <textarea 
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Drag-and-drop image upload field in Edit Report Modal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Hình ảnh đính kèm hiện trạng mới</label>
                <div 
                  className={`border border-dashed rounded-xl p-4 transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer relative
                    ${dragActiveEdit ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-slate-350"}
                    ${editBeforeImage ? "bg-slate-50/50" : "bg-white"}
                  `}
                  onDragEnter={handleDragEdit}
                  onDragOver={handleDragEdit}
                  onDragLeave={handleDragEdit}
                  onDrop={handleDropEdit}
                >
                  {editBeforeImage ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-100">
                        <img 
                          src={editBeforeImage} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditBeforeImage("")}
                          className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1 rounded-full shadow transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-1.5">✓ Đã đính kèm ảnh hiện trạng!</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full py-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChangeEdit}
                      />
                      <Upload size={20} className="text-slate-400 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">Kéo thả ảnh tại đây, hoặc <span className="text-emerald-600 hover:underline font-bold">chọn từ thiết bị</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Định dạng JPG, PNG. Dung lượng dưới 5MB</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Report Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Báo cáo Hoàn Thành: ĐÃ GIẢI QUYẾT</h3>
                <p className="text-[10px] text-emerald-100 mt-0.5">Cập nhật ảnh thực địa sau xử lý và mô tả kết quả xử lý thực địa</p>
              </div>
              <button 
                onClick={() => setShowResolveModal(false)}
                className="text-emerald-100 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={executeResolveReport} className="p-5 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Nội dung giải quyết thực tế *</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Ghi rõ chi tiết kết quả xử lý..."
                  value={resolveDescription}
                  onChange={(e) => setResolveDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Drag-and-drop image upload field in Resolve Modal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Hình ảnh kết quả sau xử lý (Sau) *</label>
                <div 
                  className={`border border-dashed rounded-xl p-4 transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer relative
                    ${dragActiveResolve ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-slate-350"}
                    ${resolveImage ? "bg-slate-50/50" : "bg-white"}
                  `}
                  onDragEnter={handleDragResolve}
                  onDragOver={handleDragResolve}
                  onDragLeave={handleDragResolve}
                  onDrop={handleDropResolve}
                >
                  {resolveImage ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-100">
                        <img 
                          src={resolveImage} 
                          alt="Resolve Preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setResolveImage("")}
                          className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1 rounded-full shadow transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-1.5">✓ Đã tải ảnh thực địa hoàn thành! Sẵn sàng hoàn thành.</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full py-2">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChangeResolve}
                      />
                      <Camera size={24} className="text-slate-400 mb-1.5 animate-bounce" />
                      <p className="text-xs font-semibold text-slate-700">Kéo thả ảnh thực địa hoàn thành, hoặc <span className="text-emerald-600 hover:underline font-bold">chọn từ thiết bị</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bắt buộc tải ảnh minh chứng trước khi giải quyết hoàn tất</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <CheckCircle size={16} /> Xác nhận Hoàn Thành
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2
            ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800 animate-pulse" : "bg-rose-50 border-rose-200 text-rose-800"}
          `}>
            <span className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}></span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
