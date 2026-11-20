import React, { useState, useRef, useEffect } from "react";
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
  BookOpen,
  Printer,
  Loader2,
  ExternalLink
} from "lucide-react";
import { AdministrativeForm } from "../types";
import { initialAdministrativeForms } from "../mockForms";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { KP3_AREA_LIST, formatShortRecordId } from "../utils/kp3Utils";
import { formatVNNumber } from "../utils/numberFormat";
import { uploadFileToStorageBucket } from "../utils/imageUpload";
import { upsertAdministrativeFormToDb } from "../utils/supabaseSync";
import { downloadOfficialDocx } from "../utils/docxExport";

function escapeHtmlText(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOfficialA4DocumentHtml(
  rawContent: string,
  fallbackTitle: string,
  forWordExport: boolean
): string {
  const lines = String(rawContent || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

  // Strip leading Quốc hiệu / Tiêu ngữ / dashes so we render standard formal header once
  let startIdx = 0;
  while (startIdx < lines.length && startIdx < 8) {
    const trimmed = lines[startIdx].trim();
    const upper = trimmed.toUpperCase();
    if (
      !trimmed ||
      upper.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM") ||
      trimmed.includes("Độc lập - Tự do - Hạnh phúc") ||
      trimmed.includes("Độc lập – Tự do – Hạnh phúc") ||
      /^[-_─—=*]{3,}$/.test(trimmed)
    ) {
      startIdx++;
    } else {
      break;
    }
  }

  const remaining = lines.slice(startIdx);
  // Check if first non-empty line is an uppercase document title
  let docHeading = "";
  let bodyStartIdx = 0;
  for (let i = 0; i < Math.min(remaining.length, 3); i++) {
    const candidate = remaining[i].trim();
    if (!candidate) continue;
    if (
      candidate === candidate.toUpperCase() &&
      candidate.length >= 6 &&
      candidate.length <= 120 &&
      !candidate.startsWith("KÍNH GỬI") &&
      !candidate.startsWith("1.")
    ) {
      docHeading = candidate;
      bodyStartIdx = i + 1;
    }
    break;
  }
  if (!docHeading) {
    docHeading = fallbackTitle.toUpperCase();
  }

  const bodyLines = remaining.slice(bodyStartIdx);
  const today = new Date();
  const dateLine = `An Phú, ngày ${String(today.getDate()).padStart(2, "0")} tháng ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} năm ${today.getFullYear()}`;

  const renderedParagraphs = bodyLines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return `<p style="margin: 4pt 0;">&nbsp;</p>`;
      }
      if (
        /^NGƯỜI\s+(LÀM\s+ĐƠN|KÊ\s+KHAI|VIẾT\s+ĐƠN|ĐỀ\s+NGHỊ)/i.test(trimmed)
      ) {
        return `<div style="margin-top: 18pt; text-align: right; padding-right: 24pt;">
          <p style="margin: 0 0 4pt 0; font-style: italic; font-size: 12.5pt;">${escapeHtmlText(dateLine)}</p>
          <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${escapeHtmlText(trimmed)}</p>
        </div>`;
      }
      if (/^\(Ký[^)]*\)$/i.test(trimmed)) {
        return `<p style="margin: 2pt 0 48pt 0; text-align: right; padding-right: 28pt; font-style: italic; font-size: 12pt;">${escapeHtmlText(
          trimmed
        )}</p>`;
      }
      if (/^Kính\s+gửi\s*:/i.test(trimmed)) {
        return `<p style="margin: 8pt 0 10pt 0; font-weight: bold; text-align: center;">${escapeHtmlText(
          trimmed
        )}</p>`;
      }
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 5 &&
        trimmed.endsWith(":")
      ) {
        return `<p style="margin: 10pt 0 4pt 0; font-weight: bold;">${escapeHtmlText(
          trimmed
        )}</p>`;
      }
      return `<p style="margin: 4pt 0; text-align: justify;">${escapeHtmlText(
        trimmed
      )}</p>`;
    })
    .join("\n");

  const innerSheet = `
    <div style="text-align: center; margin-bottom: 14pt;">
      <p style="margin: 0; font-weight: bold; font-size: 12.5pt; text-transform: uppercase; letter-spacing: 0.2pt;">
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
      </p>
      <p style="margin: 2pt 0 4pt 0; font-weight: bold; font-size: 13pt;">
        Độc lập - Tự do - Hạnh phúc
      </p>
      <div style="width: 150px; border-bottom: 1.5px solid #000; margin: 0 auto;"></div>
    </div>
    <h1 style="margin: 14pt 0 10pt 0; text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; line-height: 1.35;">
      ${escapeHtmlText(docHeading)}
    </h1>
    <div>
      ${renderedParagraphs}
    </div>
  `;

  if (forWordExport) {
    return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${escapeHtmlText(fallbackTitle)}</title>
<style>
  @page Section1 {
    size: 595.3pt 841.9pt;
    margin: 56.7pt 56.7pt 56.7pt 70.9pt;
    mso-header-margin: 35.4pt;
    mso-footer-margin: 35.4pt;
  }
  div.Section1 { page: Section1; }
  body, p, div, td, li {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    color: #000000;
  }
</style>
</head>
<body>
  <div class="Section1">
    ${innerSheet}
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${escapeHtmlText(fallbackTitle)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 20mm 20mm 20mm 25mm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    color: #000;
    max-width: 175mm;
    margin: 0 auto;
    padding: 8mm 0;
  }
  @media print {
    body { max-width: none; padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 14px; padding: 8px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-family: system-ui, sans-serif; font-size: 12px;">
    <span><strong>Bản xem in khổ A4 chuẩn hành chính</strong> — Khu phố 3, Phường An Phú</span>
    <button onclick="window.print()" style="background: #047857; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-weight: 700; cursor: pointer;">In ngay (A4)</button>
  </div>
  ${innerSheet}
</body>
</html>`;
}

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
  forms: controlledForms, 
  onAddForm,
  onUpdateForm,
  onDeleteForm,
  currentUser 
}: AdministrativeFormsProps) {
  // Local fallback if parent does not control state
  const [localForms, setLocalForms] = useState<AdministrativeForm[]>(
    controlledForms || initialAdministrativeForms
  );
  const [prevControlled, setPrevControlled] = useState(controlledForms);
  if (controlledForms !== prevControlled) {
    setPrevControlled(controlledForms);
    if (controlledForms) setLocalForms(controlledForms);
  }
  const currentForms =
    controlledForms && (onAddForm || onUpdateForm) ? controlledForms : localForms;

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
  const [attachedFileUrl, setAttachedFileUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

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

  const bumpFormDownloadCount = (form: AdministrativeForm) => {
    const updated: AdministrativeForm = {
      ...form,
      downloadCount: (form.downloadCount || 0) + 1,
    };
    if (onUpdateForm) {
      onUpdateForm(updated);
    } else {
      setLocalForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
    upsertAdministrativeFormToDb(updated);
  };

  // Download form: real Storage file if uploaded, otherwise Native Word (.docx)
  const handleDownloadForm = async (form: AdministrativeForm, format: "doc" | "txt" = "doc") => {
    bumpFormDownloadCount(form);
    const realFileUrl = (form as any).fileUrl as string | undefined;
    const realFileName = (form as any).fileName as string | undefined;

    if (realFileUrl && format === "doc") {
      const link = document.createElement("a");
      link.href = realFileUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (realFileName) {
        link.download = realFileName;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(
        `Đang tải tệp biểu mẫu gốc "${realFileName || form.code}" từ Kho lưu trữ số Khu phố 3!`
      );
      return;
    }

    const safeCode = form.code.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "doc") {
      const filename = `${safeCode}_KhuPho3_AnPhu.docx`;
      try {
        await downloadOfficialDocx({
          title: form.title,
          rawContent: form.templateContent,
          documentNumber: `Mẫu số: ${form.code}/BĐH-KP3`,
        }, filename);
        showToast(`Đã xuất văn bản Word (.docx) chuẩn Nghị định 30: ${filename}`);
        return;
      } catch (err) {
        console.warn("Lỗi xuất docx native, chuyển sang fallback doc:", err);
      }
    }

    const filename = `${safeCode}_KhuPho3_AnPhu.${format}`;
    const payload =
      format === "doc"
        ? "\uFEFF" + buildOfficialA4DocumentHtml(form.templateContent, form.title, true)
        : "\uFEFF" + form.templateContent;
    const blob = new Blob([payload], {
      type:
        format === "doc"
          ? "application/msword;charset=utf-8"
          : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã tải xuống biểu mẫu Word chuẩn hành chính: "${form.code} - ${form.title}"!`);
  };

  // Print A4 Window
  const handlePrintA4Document = (contentText: string, docTitle: string, sourceForm?: AdministrativeForm) => {
    if (sourceForm) {
      bumpFormDownloadCount(sourceForm);
    }
    const html = buildOfficialA4DocumentHtml(contentText, docTitle, false);
    const printWin = window.open("", "_blank", "width=900,height=820");
    if (!printWin) {
      showToast("Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép Pop-up để mở bản in A4!");
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    window.setTimeout(() => {
      try {
        printWin.print();
      } catch {
        // ignore
      }
    }, 300);
  };

  // Open Fill and Print Modal
  const handleOpenFillModal = (form: AdministrativeForm) => {
    setFillModalForm(form);
    setFullName(currentUser?.role === "canbo" ? (currentUser.fullName || "") : "");
    setPhone(currentUser?.role === "canbo" ? (currentUser.phone || "") : "");
    setBirthDate("");
    setCccd("");
    setAddress("42/3 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh");
    setCustomDetail("");
  };

  // Generate Personalized Content matching BOTH [BRACKETS] and "Họ và tên...: ..." formats
  const getPersonalizedContent = () => {
    if (!fillModalForm) return "";
    let content = fillModalForm.templateContent;

    const cleanName = fullName.trim();
    const cleanBirth = birthDate.trim();
    const cleanCccd = cccd.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanDetail = customDetail.trim();

    if (cleanName) {
      const before = content;
      content = content
        .replace(/\[(?:HỌ\s*(?:VÀ\s*)?TÊN|NGƯỜI\s*LÀM\s*ĐƠN|NGƯỜI\s*KÊ\s*KHAI|NGUYỄN\s*VĂN\s*A|LÊ\s*THỊ\s*B|TRẦN\s*THỊ\s*C|PHẠM\s*VĂN\s*D)\]/gi, cleanName);
      if (content === before) {
        content = content.replace(
          /((?:Tôi\s+tên\s+là|Họ\s*(?:và\s*)?tên(?:\s*chủ\s*hộ|\s*người\s*kê\s*khai|\s*người\s*làm\s*đơn)?|Người\s*kê\s*khai)[^:\n]{0,30}:\s*)(?:\.{2,}|_{2,}|\[[^\]]*\]|(?=\s*(?:\r?\n|$)))/gi,
          `$1${cleanName}`
        );
      }
    }

    if (cleanBirth) {
      const before = content;
      content = content.replace(
        /\[(?:NGÀY\s*(?:THÁNG\s*NĂM\s*)?SINH|NĂM\s*SINH|01\/01\/1990|01\/01\/1980|15\/08\/1985)\]/gi,
        cleanBirth
      );
      if (content === before) {
        content = content.replace(
          /((?:Sinh\s*ngày|Ngày(?:\s*tháng\s*năm)?\s*sinh|Năm\s*sinh)[^:\n]{0,20}:\s*)(?:\.{2,}|_{2,}|\[[^\]]*\])/gi,
          `$1${cleanBirth}`
        );
      }
    }

    if (cleanCccd) {
      const before = content;
      content = content.replace(
        /\[(?:SỐ\s*CCCD|CCCD|SỐ\s*ĐỊNH\s*DANH(?:\s*CÁ\s*NHÂN)?|CMND\/CCCD|079090001234|079080004567|079185002345)\]/gi,
        cleanCccd
      );
      if (content === before) {
        content = content.replace(
          /((?:Số\s*(?:CCCD|CMND|ĐDCN|định\s*danh)|CCCD(?:\s*\/\s*CMND)?)[^:\n]{0,25}:\s*)(?:\.{2,}|_{2,}|\[[^\]]*\])/gi,
          `$1${cleanCccd}`
        );
      }
    }

    if (cleanPhone) {
      const before = content;
      content = content.replace(
        /\[(?:SỐ\s*ĐIỆN\s*THOẠI|ĐIỆN\s*THOẠI|SĐT|0901234567|0918765432|0938987654)\]/gi,
        cleanPhone
      );
      if (content === before) {
        content = content.replace(
          /((?:Số\s*điện\s*thoại|Điện\s*thoại(?:\s*liên\s*hệ)?|SĐT)[^:\n]{0,20}:\s*)(?:\.{2,}|_{2,}|\[[^\]]*\])/gi,
          `$1${cleanPhone}`
        );
      }
    }

    if (cleanAddress) {
      const before = content;
      content = content
        .replace(
          /\[(?:ĐỊA\s*CHỈ(?:\s*THƯỜNG\s*TRÚ|\s*TẠM\s*TRÚ|\s*HIỆN\s*TẠI)?|NƠI\s*CƯ\s*TRÚ|CHỖ\s*Ở\s*HIỆN\s*(?:TẠI|NAY)|Số\s*\.\.\.[^[\]]*|Khu\s*phố\s*3,\s*Phường\s*An\s*Phú,\s*TP\.\s*Hồ\s*Chí\s*Minh)\]/gi,
          cleanAddress
        )
        .replace(
          /Số 42\/3 Lương Định Của, Khu phố 3, Phường An Phú, TP\. Hồ Chí Minh/g,
          cleanAddress
        );
      if (content === before) {
        content = content.replace(
          /((?:Địa\s*chỉ(?:\s*thường\s*trú|\s*tạm\s*trú|\s*cư\s*trú)?|Nơi\s*(?:thường\s*trú|cư\s*trú)|Chỗ\s*ở\s*hiện\s*(?:tại|nay))[^:\n]{0,30}:\s*)(?:\.{2,}|_{2,}|\[[^\]]*\])/gi,
          `$1${cleanAddress}`
        );
      }
    }

    if (cleanDetail) {
      const beforeDetail = content;
      content = content.replace(
        /\[(?:NỘI\s*DUNG\s*ĐỀ\s*NGHỊ|LÝ\s*DO|Kê\s*khai\s*nội\s*dung[^\]]*)\]/gi,
        cleanDetail
      );
      if (content === beforeDetail) {
        const signMatch = content.search(/\n\s*(?:Tôi\s+xin\s+cam\s+kết|Tôi\s+cam\s+kết|NGƯỜI\s+(?:LÀM\s+ĐƠN|KÊ\s+KHAI))/i);
        if (signMatch > 0) {
          content =
            content.slice(0, signMatch) +
            `\n\nNỘI DUNG ĐỀ NGHỊ / KÊ KHAI CHI TIẾT:\n${cleanDetail}\n` +
            content.slice(signMatch);
        } else {
          content += `\n\nNỘI DUNG ĐỀ NGHỊ / KÊ KHAI CHI TIẾT:\n${cleanDetail}`;
        }
      }
    }

    return content;
  };

  // Download filled form as formatted Native Word (.docx) or fallback (.doc)
  const handleDownloadFilled = async () => {
    if (!fillModalForm) return;
    bumpFormDownloadCount(fillModalForm);
    const personalized = getPersonalizedContent();
    const safeCode = fillModalForm.code.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safePerson = (fullName || "CuDanKP3").trim().replace(/\s+/g, "_");
    const filename = `Don_da_dien_${safeCode}_${safePerson}.docx`;

    try {
      await downloadOfficialDocx({
        title: fillModalForm.title,
        rawContent: personalized,
        signerLeftTitle: "NGƯỜI KÊ KHAI / LÀM ĐƠN",
        signerLeftName: fullName || "(Ký và ghi rõ họ tên)",
        signerRightTitle: "TM. BAN ĐIỀU HÀNH KHU PHỐ 3",
        signerRightName: "Trưởng Ban điều hành\n\n\nNguyễn Trung Huy",
        documentNumber: `Số: ...... /BĐH-${safeCode}`,
      }, filename);
      showToast(`Đã xuất văn bản Word (.docx) chuẩn A4: ${filename}`);
      setFillModalForm(null);
      return;
    } catch (err) {
      console.warn("Lỗi xuất docx native, dùng fallback .doc:", err);
    }

    const fallbackName = `Don_da_dien_${safeCode}_${safePerson}.doc`;
    const wordHtml =
      "\uFEFF" + buildOfficialA4DocumentHtml(personalized, fillModalForm.title, true);
    const blob = new Blob([wordHtml], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fallbackName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất văn bản Word chuẩn A4: ${fallbackName}`);
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
    setAttachedFileUrl(null);
    setFormTemplateContent(`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-----------------\n\nĐƠN ĐỀ NGHỊ\n\nKính gửi: UBND Phường An Phú, TP. Hồ Chí Minh\n\n1. Tôi tên là: [HỌ VÀ TÊN]\n2. Sinh ngày: [NGÀY SINH]       Số CCCD: [SỐ CCCD]\n3. Địa chỉ thường trú: [ĐỊA CHỈ]\n4. Điện thoại: [SỐ ĐIỆN THOẠI]\n\nNỘI DUNG ĐỀ NGHỊ:\n[NỘI DUNG ĐỀ NGHỊ]\n\nTôi cam kết thông tin kê khai trên là hoàn toàn chính xác.\n\nNGƯỜI LÀM ĐƠN\n(Ký và ghi rõ họ tên)`);
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
    setAttachedFileName((form as any).fileName || null);
    setAttachedFileUrl((form as any).fileUrl || null);
    setIsFormModalOpen(true);
  };

  // Handle File Upload from disk -> upload real .docx/.pdf to Supabase Storage ("admin-forms" / "templates")
  const processUploadedFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const sizeInKB = Math.max(12, Math.round(file.size / 1024));
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    setAttachedFileName(file.name);
    setFormFileSize(`${sizeInKB} KB`);
    
    if (ext === "pdf") {
      setFormFileFormat("PDF");
    } else if (ext === "doc" || ext === "docx") {
      setFormFileFormat("DOCX");
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
      // For Word or PDF files, construct a standard fillable template structure
      if (!formTemplateContent || formTemplateContent.includes("ĐƠN ĐỀ NGHỊ")) {
        setFormTemplateContent(`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-----------------\n\n${cleanBaseName.toUpperCase()}\n\nKính gửi: UBND Phường An Phú, TP. Hồ Chí Minh\n\n1. Người kê khai: [HỌ VÀ TÊN]\n2. Ngày sinh: [NGÀY SINH]       Số CCCD: [SỐ CCCD]\n3. Địa chỉ cư trú: [ĐỊA CHỈ]\n4. Số điện thoại: [SỐ ĐIỆN THOẠI]\n\nNỘI DUNG ĐỀ NGHỊ:\n[NỘI DUNG ĐỀ NGHỊ]\n\nTôi cam kết thông tin kê khai trên là hoàn toàn chính xác.\n\nNGƯỜI KÊ KHAI\n(Ký và ghi rõ họ tên)`);
      }
    }

    try {
      setIsUploadingFile(true);
      const uploadedUrl = await uploadFileToStorageBucket(
        file,
        "admin-forms",
        "templates"
      );
      if (uploadedUrl) {
        setAttachedFileUrl(uploadedUrl);
        showToast(
          `Đã tải tệp gốc "${file.name}" (${sizeInKB} KB) lên Kho lưu trữ Supabase Storage thành công!`
        );
      } else {
        showToast(`Đã nhận diện tệp "${file.name}" (${sizeInKB} KB).`);
      }
    } catch (err: any) {
      console.warn("Template storage upload warning:", err);
      showToast(
        `Đã nhận diện cấu trúc "${file.name}" (${sizeInKB} KB). Lưu ý: Không thể tải tệp nhị phân lên Cloud (${err?.message || "kiểm tra đăng nhập"}).`
      );
    } finally {
      setIsUploadingFile(false);
    }
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
        templateContent: formTemplateContent.trim(),
        ...(attachedFileUrl ? { fileUrl: attachedFileUrl } : {}),
        ...(attachedFileName ? { fileName: attachedFileName } : {}),
      } as AdministrativeForm;

      upsertAdministrativeFormToDb(newForm);
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
        templateContent: formTemplateContent.trim(),
        fileUrl: attachedFileUrl || undefined,
        fileName: attachedFileName || undefined,
      } as AdministrativeForm;

      upsertAdministrativeFormToDb(updatedForm);
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

      {/* Compact Header Bar */}
      <div className="bg-white px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            Kho Biểu Mẫu Hành Chính ({formatVNNumber(currentForms.length)})
          </h1>
        </div>

        {currentUser?.role === "canbo" && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => directFileInputRef.current?.click()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Tải lên tệp biểu mẫu có sẵn từ máy tính"
            >
              <Upload size={14} />
              <span>Tải File Mẫu</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Thêm Biểu Mẫu</span>
            </button>
          </div>
        )}
      </div>

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
              role="button"
              tabIndex={0}
              aria-label={`Xem trước biểu mẫu ${form.title}`}
              onClick={() => setPreviewForm(form)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPreviewForm(form);
                }
              }}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between gap-4 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <div className="space-y-2.5">
                {/* Header tags & Cán Bộ Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 gap-y-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-mono font-bold text-xs shrink-0">
                      {form.code}
                    </span>
                    <span className="text-xs text-slate-700 font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                      {form.category}
                    </span>
                    {(form as any).fileUrl && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        Tệp gốc đính kèm
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">{form.fileFormat}</span>
                      <span>{form.fileSize}</span>
                    </div>

                    {/* Cán Bộ Sửa / Xóa Controls */}
                    {currentUser?.role === "canbo" && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 pl-2 border-l border-slate-200"
                      >
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
              <div
                onClick={(e) => e.stopPropagation()}
                className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
              >
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
                    title="Điền thông tin và in trực tiếp khổ A4"
                  >
                    <PenTool size={14} />
                    <span>Điền &amp; In</span>
                  </button>

                  <button
                    onClick={() => handlePrintA4Document(form.templateContent, form.title, form)}
                    className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="In đơn chuẩn khổ A4"
                  >
                    <Printer size={14} />
                    <span className="hidden xl:inline">In A4</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDownloadForm(form, "doc")}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {(form as any).fileUrl ? <ExternalLink size={14} /> : <Download size={14} />}
                  <span>
                    {(form as any).fileUrl
                      ? `Tải Tệp Gốc (${form.fileFormat})`
                      : "Tải Biểu Mẫu (.DOC)"}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
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
                    onClick={() =>
                      handlePrintA4Document(
                        previewForm.templateContent,
                        previewForm.title,
                        previewForm
                      )
                    }
                    className="min-h-9 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Printer size={13} /> In Đơn Chuẩn A4
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenFillModal(previewForm);
                      setPreviewForm(null);
                    }}
                    className="min-h-9 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <PenTool size={13} /> Điền &amp; In A4
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
                    <Download size={13} />{" "}
                    {(previewForm as any).fileUrl ? "Tải Tệp Gốc" : "Tải .DOC"}
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
            <div className="flex flex-wrap justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setFillModalForm(null)}
                className="min-h-9 px-4 py-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() =>
                  handlePrintA4Document(
                    getPersonalizedContent(),
                    fillModalForm.title,
                    fillModalForm
                  )
                }
                className="min-h-9 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>In Đơn Chuẩn A4</span>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <FileUp size={16} className="text-indigo-600 shrink-0" />
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
                    disabled={isUploadingFile}
                    onClick={() => modalFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold border border-indigo-200 transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-2xs shrink-0 disabled:opacity-50"
                  >
                    {isUploadingFile ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Đang tải lên Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={12} />
                        <span>Chọn file từ máy tính</span>
                      </>
                    )}
                  </button>
                </div>
                {attachedFileName ? (
                  <div className="p-2.5 bg-white rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-indigo-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip size={14} className="text-indigo-600 shrink-0" />
                      <span className="font-mono font-bold text-xs truncate">{attachedFileName}</span>
                      <span className="text-xs text-slate-600 shrink-0">({formFileSize})</span>
                      {attachedFileUrl && (
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold shrink-0">
                          Đã lưu Cloud
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFileName(null);
                        setAttachedFileUrl(null);
                      }}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer shrink-0"
                    >
                      Gỡ file
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-snug">
                    Tải lên file Word (.docx) hoặc PDF gốc để lưu trực tiếp vào Kho lưu trữ số Supabase Storage (admin-forms) cho người dân tải nguyên bản.
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
