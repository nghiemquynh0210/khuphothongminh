import React, { useState, useRef } from "react";
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Building2, 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronRight, 
  PenTool,
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileUp,
  AlertTriangle,
  Paperclip,
  ShieldCheck,
  BookOpen
} from "lucide-react";
import { AdministrativeForm } from "../types";
import { initialAdministrativeForms } from "../mockForms";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { KP3_AREA_LIST, formatShortRecordId } from "../utils/kp3Utils";
import { formatVNNumber } from "../utils/numberFormat";

interface AdministrativeFormsProps {
  forms?: AdministrativeForm[];
  onAddForm?: (newForm: AdministrativeForm) => void;
  onUpdateForm?: (updatedForm: AdministrativeForm) => void;
  onDeleteForm?: (formId: string) => void;
  currentUser?: {
    role: "canbo" | "nguoidan";
    fullName?: string;
    phone?: string;
  } | null;
}

export default function AdministrativeForms({ 
  forms = initialAdministrativeForms, 
  onAddForm,
  onUpdateForm,
  onDeleteForm,
  currentUser 
}: AdministrativeFormsProps) {
  // Local fallback if parent does not control state
  const [localForms, setLocalForms] = useState<AdministrativeForm[]>(forms);
  const currentForms = forms || localForms;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [selectedTo, setSelectedTo] = useState<string>("all");
  const [previewForm, setPreviewForm] = useState<AdministrativeForm | null>(null);
  const [fillModalForm, setFillModalForm] = useState<AdministrativeForm | null>(null);
  
  // Fill-in modal state
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cccd, setCccd] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("42/3 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh");
  const [customDetail, setCustomDetail] = useState("");
  
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cán Bộ CRUD Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [deleteConfirmForm, setDeleteConfirmForm] = useState<AdministrativeForm | null>(null);

  // Form Fields State for Add / Edit
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<AdministrativeForm["category"]>("Cư trú & Hộ khẩu");
  const [formIssuingBody, setFormIssuingBody] = useState("UBND Phường An Phú, TP. Hồ Chí Minh");
  const [formDescription, setFormDescription] = useState("");
  const [formRequiredDocuments, setFormRequiredDocuments] = useState("");
  const [formProcessingTime, setFormProcessingTime] = useState("01 - 03 ngày làm việc");
  const [formFee, setFormFee] = useState("Miễn phí");
  const [formFileFormat, setFormFileFormat] = useState<"DOCX" | "PDF" | "DOCX / PDF">("DOCX / PDF");
  const [formFileSize, setFormFileSize] = useState("48 KB");
  const [formTemplateContent, setFormTemplateContent] = useState("");
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // Hidden File Inputs
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const categories: AdministrativeForm["category"][] = [
    "Cư trú & Hộ khẩu",
    "Địa chính & Nhà ở",
    "Hộ kinh doanh",
    "Hộ tịch & Tư pháp",
    "An sinh xã hội",
    "Điều hành KP3 & Chi bộ"
  ];

  const filterCategories = ["Tất cả", ...categories];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredForms = currentForms.filter((form) => {
    const matchesCategory = selectedCategory === "Tất cả" || form.category === selectedCategory;
    const matchesSearch = 
      form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.issuingBody.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Download form as formatted document
  const handleDownloadForm = (form: AdministrativeForm, format: "doc" | "txt" = "doc") => {
    const filename = `${form.code.replace(/[^a-zA-Z0-9]/g, "_")}_${form.title.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
    const fileHeader = `\uFEFF` + form.templateContent; // Add UTF-8 BOM so Vietnamese characters display properly in Word
    const blob = new Blob([fileHeader], { type: format === "doc" ? "application/msword;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã tải xuống biểu mẫu: "${form.code} - ${form.title}" thành công!`);
  };

  // Open Fill and Print Modal
  const handleOpenFillModal = (form: AdministrativeForm) => {
    setFillModalForm(form);
    setFullName(currentUser?.role === "canbo" ? (currentUser.fullName || "") : "");
    setPhone(currentUser?.role === "canbo" ? (currentUser.phone || "") : "");
    setBirthDate("");
    setCccd("");
    setAddress("Số 42/ Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh");
    setCustomDetail("");
  };

  // Generate Personalized Content
  const getPersonalizedContent = () => {
    if (!fillModalForm) return "";
    let content = fillModalForm.templateContent;
    if (fullName) content = content.replace(/\[NGUYỄN VĂN A\]/g, fullName).replace(/\[LÊ THỊ B\]/g, fullName).replace(/\[TRẦN THỊ C\]/g, fullName).replace(/\[PHẠM VĂN D\]/g, fullName);
    if (birthDate) content = content.replace(/\[01\/01\/1990\]/g, birthDate).replace(/\[01\/01\/1980\]/g, birthDate).replace(/\[15\/08\/1985\]/g, birthDate);
    if (cccd) content = content.replace(/\[079090001234\]/g, cccd).replace(/\[079080004567\]/g, cccd).replace(/\[079185002345\]/g, cccd);
    if (phone) content = content.replace(/\[0901234567\]/g, phone).replace(/\[0918765432\]/g, phone).replace(/\[0938987654\]/g, phone);
    if (address) content = content.replace(/Số 42\/3 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh/g, address);
    if (customDetail) content += `\n\nNỘI DUNG BỔ SUNG CỦA NGƯỜI LÀM ĐƠN:\n${customDetail}`;
    return content;
  };

  // Download filled form
  const handleDownloadFilled = () => {
    if (!fillModalForm) return;
    const personalized = getPersonalizedContent();
    const filename = `Don_da_dien_${fillModalForm.code.replace(/[^a-zA-Z0-9]/g, "_")}_${fullName || "Cudan"}.doc`;
    const blob = new Blob([`\uFEFF` + personalized], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất văn bản đã điền thông tin: ${filename}`);
    setFillModalForm(null);
  };

  // Copy Template to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingFormId(null);
    setFormCode(`Mẫu BM-${Math.floor(100 + Math.random() * 900)}`);
    setFormTitle("");
    setFormCategory("Cư trú & Hộ khẩu");
    setFormIssuingBody("UBND Phường An Phú, TP. Hồ Chí Minh");
    setFormDescription("");
    setFormRequiredDocuments("Bản sao CCCD gắn chip\nTờ khai theo mẫu đã điền đầy đủ\nGiấy tờ chứng minh chỗ ở hợp pháp");
    setFormProcessingTime("01 - 03 ngày làm việc");
    setFormFee("Miễn phí");
    setFormFileFormat("DOCX / PDF");
    setFormFileSize("45 KB");
    setAttachedFileName(null);
    setFormTemplateContent(`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-----------------\n\nĐƠN ĐỀ NGHỊ\n\nKính gửi: UBND Phường An Phú, TP. Hồ Chí Minh\n\n1. Tôi tên là: [HỌ VÀ TÊN]\n2. Sinh ngày: [01/01/1990]       Số CCCD: [079090001234]\n3. Địa chỉ thường trú: [Số ..., Khu phố 3, Phường An Phú, TP. Hồ Chí Minh]\n4. Điện thoại: [0901234567]\n\nNỘI DUNG ĐỀ NGHỊ:\n[Kê khai nội dung đề nghị giải quyết tại đây...]\n\nTôi cam kết thông tin kê khai trên là hoàn toàn chính xác.\n\nNGƯỜI LÀM ĐƠN\n(Ký và ghi rõ họ tên)`);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (form: AdministrativeForm) => {
    setModalMode("edit");
    setEditingFormId(form.id);
    setFormCode(form.code);
    setFormTitle(form.title);
    setFormCategory(form.category);
    setFormIssuingBody(form.issuingBody);
    setFormDescription(form.description);
    setFormRequiredDocuments(form.requiredDocuments.join("\n"));
    setFormProcessingTime(form.processingTime);
    setFormFee(form.fee);
    setFormFileFormat(form.fileFormat);
    setFormFileSize(form.fileSize);
    setFormTemplateContent(form.templateContent);
    setAttachedFileName(null);
    setIsFormModalOpen(true);
  };

  // Handle File Upload from disk (both direct bar or inside modal)
  const processUploadedFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const sizeInKB = Math.max(12, Math.round(file.size / 1024));
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    setAttachedFileName(file.name);
    setFormFileSize(`${sizeInKB} KB`);
    
    if (ext === "pdf") {
      setFormFileFormat("PDF");
    } else if (ext === "doc" || ext === "docx") {
      setFormFileFormat("DOCX / PDF");
    }

    // Auto set title if blank or creating
    if (!formTitle || modalMode === "create") {
      setFormTitle(cleanBaseName.charAt(0).toUpperCase() + cleanBaseName.slice(1));
    }

    // If text file, read text content directly
    if (file.type.includes("text") || ext === "txt") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) setFormTemplateContent(text);
      };
      reader.readAsText(file);
    } else {
      // For Word or PDF files, construct a standard template structure
      if (!formTemplateContent || formTemplateContent.includes("ĐƠN ĐỀ NGHỊ")) {
        setFormTemplateContent(`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-----------------\n\n${cleanBaseName.toUpperCase()}\n(Đính kèm theo tệp số: ${file.name})\n\nKính gửi: UBND Phường An Phú, TP. Hồ Chí Minh\n\n1. Người kê khai: [HỌ VÀ TÊN]\n2. Ngày sinh: [01/01/1990]       CCCD: [079090001234]\n3. Nơi cư trú: [Khu phố 3, Phường An Phú, TP. Hồ Chí Minh]\n4. Điện thoại liên hệ: [0901234567]\n\nNỘI DUNG KÊ KHAI THEO BIỂU MẪU ĐÍNH KÈM:\n[Tệp gốc: ${file.name} - Kích thước: ${sizeInKB} KB]\n\nNGƯỜI KÊ KHAI\n(Ký và ghi rõ họ tên)`);
      }
    }

    showToast(`Đã nhận diện tệp "${file.name}" (${sizeInKB} KB) thành công!`);
  };

  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleOpenCreateModal();
    processUploadedFile(file);
    e.target.value = ""; // Reset
  };

  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    e.target.value = "";
  };

  // Save Form (Create or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      showToast("Vui lòng nhập Mã biểu mẫu (ví dụ: Mẫu CT01)!");
      return;
    }
    if (!formTitle.trim()) {
      showToast("Vui lòng nhập Tiêu đề biểu mẫu!");
      return;
    }

    const docsArray = formRequiredDocuments
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);

    if (modalMode === "create") {
      const newForm: AdministrativeForm = {
        id: "FORM-" + Date.now().toString().slice(-4),
        code: formCode.trim(),
        title: formTitle.trim(),
        category: formCategory,
        issuingBody: formIssuingBody.trim() || "UBND Phường An Phú, TP. Hồ Chí Minh",
        description: formDescription.trim() || `Biểu mẫu chuẩn hóa dành cho cư dân và cán bộ Khu phố 3, Phường An Phú.`,
        requiredDocuments: docsArray.length > 0 ? docsArray : ["Bản sao CCCD gắn chip", "Đơn theo mẫu đã điền đủ thông tin"],
        processingTime: formProcessingTime.trim() || "01 - 03 ngày làm việc",
        fee: formFee.trim() || "Miễn phí",
        fileFormat: formFileFormat,
        fileSize: formFileSize || "48 KB",
        downloadCount: 0,
        templateContent: formTemplateContent.trim()
      };

      if (onAddForm) {
        onAddForm(newForm);
      } else {
        setLocalForms([newForm, ...localForms]);
      }
      showToast(`Đã thêm mới và xuất bản biểu mẫu: "${newForm.code} - ${newForm.title}"!`);
    } else {
      const existing = currentForms.find((f) => f.id === editingFormId);
      if (!existing) return;

      const updatedForm: AdministrativeForm = {
        ...existing,
        code: formCode.trim(),
        title: formTitle.trim(),
        category: formCategory,
        issuingBody: formIssuingBody.trim(),
        description: formDescription.trim(),
        requiredDocuments: docsArray,
        processingTime: formProcessingTime.trim(),
        fee: formFee.trim(),
        fileFormat: formFileFormat,
        fileSize: formFileSize,
        templateContent: formTemplateContent.trim()
      };

      if (onUpdateForm) {
        onUpdateForm(updatedForm);
      } else {
        setLocalForms(localForms.map((f) => (f.id === updatedForm.id ? updatedForm : f)));
      }
      showToast(`Đã cập nhật biểu mẫu: "${updatedForm.code}" thành công!`);
    }

    setIsFormModalOpen(false);
  };

  // Confirm Delete Form
  const handleConfirmDelete = () => {
    if (!deleteConfirmForm) return;

    if (onDeleteForm) {
      onDeleteForm(deleteConfirmForm.id);
    } else {
      setLocalForms(localForms.filter((f) => f.id !== deleteConfirmForm.id));
    }

    showToast(`Đã xóa biểu mẫu "${deleteConfirmForm.code}" khỏi Cổng cư dân thành công.`);
    setDeleteConfirmForm(null);
  };

  return (
    <div id="administrative-forms-view" className="space-y-6">
      {toastMessage && (
        <InlineNotice
          message={toastMessage}
          type="success"
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {/* Hidden File Input for Direct Upload */}
      <input
        id="admin-forms-direct-file-input"
        name="directFileInput"
        type="file"
        ref={directFileInputRef}
        accept=".doc,.docx,.pdf,.txt"
        onChange={handleDirectFileUpload}
        className="hidden"
      />

      {/* Hero Header Banner */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 relative">
        <div className="space-y-1.5 max-w-3xl">
          <div className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide uppercase">
            <FileText size={13} className="text-emerald-700" />
            <span>Kho Biểu Mẫu Điện Tử • Đề Án 06/CP • KP3 An Phú</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span className="font-normal text-xs text-emerald-800">
              {currentUser?.role === "canbo" ? "Quyền Quản Trị Cán Bộ" : "Tải về trực tiếp & Miễn phí"}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Kho Biểu Mẫu Hành Chính Điện Tử Khu Phố 3
          </h1>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-wrap gap-4 md:gap-8 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Tổng số: <strong className="text-slate-800 font-bold">{formatVNNumber(currentForms.length)} Biểu mẫu chuẩn hóa</strong></span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Định dạng: <strong className="text-slate-800 font-bold">Word (.DOCX) & In trực tuyến</strong></span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Clock size={14} className="text-teal-600" />
            <span>Phục vụ: <strong className="text-slate-800 font-bold">Cư dân & Cán bộ 24/7</strong></span>
          </div>
        </div>
      </div>

      {/* CÁN BỘ ADMINISTRATIVE MANAGEMENT BAR */}
      {currentUser?.role === "canbo" && (
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={13} className="text-indigo-600" />
              <span>Khu Vực Thiết Lập Của Cán Bộ</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-800">
              Quản Trị Biểu Mẫu Hành Chính Khu Phố
            </h3>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Cán bộ có quyền <strong>Thêm mới, Chỉnh sửa, Xóa</strong> và <strong>Upload trực tiếp file văn bản mẫu</strong> (.doc, .docx, .pdf, .txt) để công dân tải về.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => directFileInputRef.current?.click()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer group"
              title="Tải lên tệp biểu mẫu có sẵn từ máy tính"
            >
              <Upload size={15} />
              <span>Upload File Biểu Mẫu</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus size={15} />
              <span>+ Thêm Biểu Mẫu Mới</span>
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={17} />
            <input
              id="admin-forms-search-input"
              name="adminFormsSearch"
              type="text"
              placeholder="Tìm theo tên đơn (ví dụ: cấp số nhà, CT01, đăng ký kinh doanh, cư trú, hôn nhân)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>
          <div className="w-full sm:w-56 shrink-0">
            <ReportSelect
              aria-label="Chọn tuyến đường / khu vực KP3 nhận hồ sơ"
              value={selectedTo}
              onChange={(val) => {
                setSelectedTo(val);
                if (val !== "all") {
                  setAddress(`${val}, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh`);
                } else {
                  setAddress("42/3 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh");
                }
              }}
              options={[
                { value: "all", label: "Mặc định: Toàn địa bàn Khu phố 3" },
                ...KP3_AREA_LIST.map((areaName) => ({ value: areaName, label: `Áp dụng cho ${areaName}` }))
              ]}
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl transition-colors shrink-0"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="space-y-1.5 pt-1 text-xs">
          <span className="text-slate-600 font-semibold text-xs inline-flex items-center gap-1">
            <Filter size={13} /> Phân loại thủ tục
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2">
            {filterCategories.map((cat, idx) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
                  idx === 0 && filterCategories.length % 2 === 1 ? "col-span-2 sm:col-span-1" : ""
                } ${
                  selectedCategory === cat
                    ? "bg-emerald-700 text-white font-bold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredForms.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
            <FileText size={36} className="text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">Không tìm thấy biểu mẫu phù hợp</h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Không có biểu mẫu nào khớp với từ khóa "{searchTerm}". Quý cư dân hoặc cán bộ có thể chọn danh mục khác hoặc xóa bộ lọc.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("Tất cả");
              }}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Xem tất cả biểu mẫu
            </button>
          </div>
        ) : (
          filteredForms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between gap-4 group relative"
            >
              <div className="space-y-2.5">
                {/* Header tags & Cán Bộ Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-mono font-bold text-xs">
                      {form.code}
                    </span>
                    <span className="text-xs text-slate-700 font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                      {form.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">{form.fileFormat}</span>
                      <span>{form.fileSize}</span>
                    </div>

                    {/* Cán Bộ Sửa / Xóa Controls */}
                    {currentUser?.role === "canbo" && (
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                        <button
                          onClick={() => handleOpenEditModal(form)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Chỉnh sửa thông tin biểu mẫu"
                        >
                          <Pencil size={12} />
                          <span className="hidden sm:inline text-xs">Sửa</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmForm(form)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Xóa biểu mẫu này khỏi hệ thống"
                        >
                          <Trash2 size={12} />
                          <span className="hidden sm:inline text-xs">Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Title & Issuing Authority */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors leading-snug">
                    {form.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                    <Building2 size={12} className="shrink-0 text-slate-600" />
                    <span>Cơ quan ban hành: {form.issuingBody}</span>
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {form.description}
                </p>

                {/* Key metadata chips */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-600" />
                      <span>Giải quyết: <strong className="text-slate-800">{form.processingTime}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={12} className="text-slate-600" />
                      <span>Lệ phí: <strong className="text-slate-800">{form.fee}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Download size={12} className="text-slate-600" />
                    <span>Đã tải: <strong className="text-emerald-700">{form.downloadCount} lần</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewForm(form)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Xem trước mẫu đơn"
                  >
                    <Eye size={15} />
                    <span className="hidden sm:inline">Xem trước</span>
                  </button>

                  <button
                    onClick={() => handleOpenFillModal(form)}
                    className="p-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Điền thông tin và in trực tiếp"
                  >
                    <PenTool size={14} />
                    <span>Điền & In</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDownloadForm(form, "doc")}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download size={14} />
                  <span>Tải Biểu Mẫu (.DOC)</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Guide Note Box */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600" />
            Hướng dẫn nộp hồ sơ sau khi tải và hoàn tất biểu mẫu
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Người dân sau khi điền biểu mẫu có thể nộp trực tiếp tại <strong>Văn phòng Ban Điều hành Khu phố 3</strong> (đối với các xác nhận cư trú, an ninh trật tự) hoặc nộp tại <strong>Bộ phận Tiếp nhận và Trả kết quả (Một cửa) UBND Phường An Phú</strong> / Cổng Dịch vụ công Quốc gia.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
            Hotline Hỗ Trợ: 028.3740.xxxx
          </span>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewForm && (() => {
        const navList = filteredForms.length > 0 ? filteredForms : currentForms;
        const currentIdx = navList.findIndex(f => f.id === previewForm.id);
        const totalNav = navList.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;
        const shortFormId = formatShortRecordId(previewForm.code || previewForm.id, "BM");

        return (
          <Modal
            isOpen={Boolean(previewForm)}
            onClose={() => setPreviewForm(null)}
            size="2xl"
            ariaLabel={`Xem trước biểu mẫu ${previewForm.title}`}
            headerNavigation={
              totalNav > 1 && currentIdx >= 0
                ? {
                    positionText: `Biểu mẫu ${currentIdx + 1}/${totalNav}`,
                    hasPrev,
                    hasNext,
                    onPrev: () => hasPrev && setPreviewForm(navList[currentIdx - 1]),
                    onNext: () => hasNext && setPreviewForm(navList[currentIdx + 1]),
                    prevLabel: "Biểu mẫu trước",
                    nextLabel: "Biểu mẫu tiếp theo",
                  }
                : undefined
            }
            headerSlot={
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {shortFormId}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {previewForm.category}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                    {previewForm.title}
                  </h3>
                </div>
              </div>
            }
            bodyClassName="p-4 sm:p-5 space-y-3.5 bg-slate-50/60"
            footer={
              <div className="flex flex-wrap justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(previewForm.templateContent)}
                  className="min-h-9 px-3 py-1.5 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                  <span>{copied ? "Đã sao chép" : "Sao chép mẫu"}</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenFillModal(previewForm);
                      setPreviewForm(null);
                    }}
                    className="min-h-9 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <PenTool size={13} /> Điền thông tin nhanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewForm(null)}
                    className="min-h-9 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadForm(previewForm, "doc");
                      setPreviewForm(null);
                    }}
                    className="min-h-9 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Download size={13} /> Tải .DOC
                  </button>
                </div>
              </div>
            }
          >
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
              <DetailGrid>
                <DetailRow label="Mã biểu mẫu" value={previewForm.code} isMono copyValue={previewForm.code} />
                <DetailRow label="Cơ quan ban hành" value={previewForm.issuingBody} />
                <DetailRow label="Thời gian xử lý" value={previewForm.processingTime} />
                <DetailRow label="Lệ phí / Định dạng" value={`${previewForm.fee} • ${previewForm.fileFormat}`} />
              </DetailGrid>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <CheckCircle2 size={15} className="text-emerald-700" /> Thành phần hồ sơ yêu cầu kèm theo:
              </span>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-1">
                {previewForm.requiredDocuments.map((doc, idx) => (
                  <li key={idx} className="leading-relaxed">{doc}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <BookOpen size={15} className="text-slate-700" /> Khung văn bản biểu mẫu chuẩn:
              </span>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-800 text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
                {previewForm.templateContent}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* FILL-IN & PRINT MODAL */}
      {fillModalForm && (
        <Modal
          isOpen={Boolean(fillModalForm)}
          onClose={() => setFillModalForm(null)}
          size="2xl"
          title={`Điền & Xuất tờ khai: ${fillModalForm.title}`}
          description={`Mã ${fillModalForm.code} • ${fillModalForm.category} • Hỗ trợ tự động điền cư dân KP3`}
          bodyClassName="p-5 sm:p-6 space-y-4 text-xs"
          footer={
            <div className="flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setFillModalForm(null)}
                className="min-h-9 px-4 py-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDownloadFilled}
                className="min-h-9 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>Tải Bản Đã Điền (.DOC)</span>
              </button>
            </div>
          }
        >
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <Sparkles size={15} className="shrink-0 text-emerald-700" />
            <span>Nhập thông tin bên dưới, hệ thống sẽ tự động điền vào mẫu chuẩn để bạn tải về file Word hoặc in ra nộp.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="fill-form-fullname" className="font-semibold text-slate-700 block text-xs">Họ và tên người làm đơn *</label>
              <input
                id="fill-form-fullname"
                type="text"
                required
                aria-invalid={!fullName.trim() ? "true" : "false"}
                placeholder="Ví dụ: Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="fill-form-birthdate" className="font-semibold text-slate-700 block text-xs">Ngày tháng năm sinh</label>
              <input
                id="fill-form-birthdate"
                type="text"
                placeholder="Ví dụ: 15/04/1985"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="fill-form-cccd" className="font-semibold text-slate-700 block text-xs">Số định danh / CCCD *</label>
              <input
                id="fill-form-cccd"
                type="text"
                required
                aria-invalid={!cccd.trim() ? "true" : "false"}
                placeholder="12 chữ số CCCD gắn chip"
                value={cccd}
                onChange={(e) => setCccd(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="fill-form-phone" className="font-semibold text-slate-700 block text-xs">Số điện thoại liên hệ</label>
              <input
                id="fill-form-phone"
                type="text"
                placeholder="Ví dụ: 090xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="fill-form-address" className="font-semibold text-slate-700 block text-xs">Địa chỉ cư trú / Địa chỉ căn nhà đề nghị</label>
            <input
              id="fill-form-address"
              type="text"
              placeholder="Số nhà, hẻm, Khu phố 3, Phường An Phú..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="fill-form-detail" className="font-semibold text-slate-700 block text-xs">Lý do / Nội dung chi tiết cần đề nghị</label>
            <textarea
              id="fill-form-detail"
              rows={3}
              placeholder="Ghi rõ lý do xin cấp số nhà, nội dung thay đổi cư trú hoặc ngành nghề kinh doanh..."
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-slate-900 leading-relaxed"
            />
          </div>
        </Modal>
      )}

      {/* CÁN BỘ ADD / EDIT FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 text-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                  {modalMode === "create" ? <Plus size={18} /> : <Pencil size={18} />}
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest block font-mono">
                    {modalMode === "create" ? "THIẾT LẬP BIỂU MẪU MỚI" : "CHỈNH SỬA BIỂU MẪU HÀNH CHÍNH"}
                  </span>
                  <h3 className="font-black text-slate-800 text-base">
                    {modalMode === "create" ? "Thêm Biểu Mẫu Vào Cổng Cư Dân" : `Cập Nhật ${formCode}`}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-600 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Upload file attachment box */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <FileUp size={16} className="text-indigo-600" />
                    <span>Upload Tệp Văn Bản Gốc (.DOCX, .DOC, .PDF, .TXT)</span>
                  </div>
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    accept=".doc,.docx,.pdf,.txt"
                    onChange={handleModalFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold border border-indigo-200 transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <Upload size={12} />
                    <span>Chọn file từ máy tính</span>
                  </button>
                </div>
                {attachedFileName ? (
                  <div className="p-2.5 bg-white rounded-xl border border-indigo-200 flex items-center justify-between text-indigo-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip size={14} className="text-indigo-600 shrink-0" />
                      <span className="font-mono font-bold text-xs truncate">{attachedFileName}</span>
                      <span className="text-xs text-slate-600">({formFileSize})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFileName(null)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      Gỡ file
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-snug">
                    Tải lên file Word hoặc PDF để tự động trích xuất tên file, định dạng và kích thước tệp vào biểu mẫu.
                  </p>
                )}
              </div>

              {/* Basic Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Mã biểu mẫu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Mẫu CT01, ĐN-SN01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Tên biểu mẫu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đơn đề nghị cấp biển số nhà"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Phân loại danh mục
                  </label>
                  <ReportSelect
                    aria-label="Phân loại danh mục biểu mẫu"
                    value={formCategory}
                    onChange={(val) => setFormCategory(val as AdministrativeForm["category"])}
                    options={categories.map((cat) => ({ value: cat, label: cat }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Cơ quan ban hành / Thẩm quyền
                  </label>
                  <input
                    type="text"
                    placeholder="VD: UBND Phường An Phú, Bộ Công an"
                    value={formIssuingBody}
                    onChange={(e) => setFormIssuingBody(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                  Mô tả mục đích sử dụng & Đối tượng áp dụng
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả khi nào công dân cần sử dụng mẫu đơn này..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Thời gian giải quyết
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 01 - 03 ngày làm việc"
                    value={formProcessingTime}
                    onChange={(e) => setFormProcessingTime(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Lệ phí
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Miễn phí hoặc 50.000 VNĐ"
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Định dạng file
                  </label>
                  <ReportSelect
                    aria-label="Định dạng tệp biểu mẫu"
                    value={formFileFormat}
                    onChange={(val) => setFormFileFormat(val as "DOCX" | "PDF" | "DOCX / PDF")}
                    options={[
                      { value: "DOCX", label: "DOCX" },
                      { value: "PDF", label: "PDF" },
                      { value: "DOCX / PDF", label: "DOCX / PDF" }
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                  Hồ sơ kèm theo yêu cầu (Mỗi tài liệu viết trên 1 dòng)
                </label>
                <textarea
                  rows={3}
                  placeholder="Bản sao CCCD&#10;Giấy chứng nhận quyền sở hữu nhà đất&#10;Biên lai nộp thuế..."
                  value={formRequiredDocuments}
                  onChange={(e) => setFormRequiredDocuments(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white leading-relaxed font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Nội dung văn bản mẫu (Word / Text)</span>
                  <span className="text-xs text-slate-600 font-normal">Hỗ trợ các thẻ [HỌ TÊN], [CCCD]</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Soạn thảo mẫu đơn có quốc hiệu, tiêu ngữ..."
                  value={formTemplateContent}
                  onChange={(e) => setFormTemplateContent(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white leading-relaxed font-mono text-xs"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check size={16} />
                  <span>{modalMode === "create" ? "Xuất Bản Biểu Mẫu" : "Lưu Thay Đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteConfirmForm)}
        onClose={() => setDeleteConfirmForm(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa biểu mẫu hành chính"
        description={`Bạn đang chuẩn bị gỡ bỏ vĩnh viễn biểu mẫu "${deleteConfirmForm?.code || ""} - ${deleteConfirmForm?.title || ""}" khỏi Cổng Cư dân số Khu phố 3.`}
        confirmLabel="Xóa biểu mẫu"
        variant="danger"
      />
    </div>
  );
}
