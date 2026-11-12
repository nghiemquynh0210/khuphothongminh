import React, { useState, useEffect, useMemo, useRef } from "react";
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
  List,
  ShieldCheck,
  Award,
  Medal,
  Home,
  Smile,
  Baby,
  HeartHandshake,
  Zap,
  Calendar,
  CheckCircle2,
  FileText,
  DollarSign,
  ChevronRight,
  ExternalLink,
  Edit2,
  AlertTriangle,
  FolderPlus,
  Users,
  Check,
  Tag
} from "lucide-react";
import {
  WelfareRecipient,
  Resident,
  WelfareSubCategory,
  WelfareCampaign,
  EmergencySupportRecord,
  WelfareBenefit,
  FundExpenditure
} from "../types";
import Pagination from "./Pagination";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { KP3_TO_LIST, extractToDanPho, formatShortRecordId } from "../utils/kp3Utils";
import { formatVNNumber } from "../utils/numberFormat";
import {
  DEFAULT_WELFARE_SUBCATEGORIES,
  ALL_STANDARD_BENEFITS,
  getStoredSubCategories,
  saveStoredSubCategories,
  getStoredCampaigns,
  saveStoredCampaigns,
  getStoredEmergencyRecords,
  saveStoredEmergencyRecords
} from "../data/welfareData";

interface SocialWelfareProps {
  recipients: WelfareRecipient[];
  onUpdateStatus: (id: string, status: "Đang nhận trợ cấp" | "Chờ duyệt hồ sơ" | "Đã tạm ngưng") => void;
  onAddRecipient: (newRec: WelfareRecipient) => void;
  onUpdateRecipient?: (updatedRec: WelfareRecipient) => void;
  onDeleteRecipient: (id: string) => void;
  residents?: Resident[];
  onRecordFundExpenditure?: (exp: FundExpenditure) => void;
}

export default function SocialWelfare({
  recipients,
  onUpdateStatus,
  onAddRecipient,
  onUpdateRecipient,
  onDeleteRecipient,
  residents = [],
  onRecordFundExpenditure
}: SocialWelfareProps) {
  // Navigation Tabs: 4 comprehensive views
  const [activeTab, setActiveTab] = useState<"recipients" | "submodules" | "campaigns" | "emergency">("recipients");

  // Dynamic Sub-categories (Preset + Custom user-created)
  const [subCategories, setSubCategories] = useState<WelfareSubCategory[]>(() => getStoredSubCategories());

  // Campaigns & Emergency records
  const [campaigns, setCampaigns] = useState<WelfareCampaign[]>(() => getStoredCampaigns());
  const [emergencyRecords, setEmergencyRecords] = useState<EmergencySupportRecord[]>(() => getStoredEmergencyRecords());

  // Save changes to localStorage
  const updateSubCategories = (updated: WelfareSubCategory[]) => {
    setSubCategories(updated);
    saveStoredSubCategories(updated);
  };

  const updateCampaigns = (updated: WelfareCampaign[]) => {
    setCampaigns(updated);
    saveStoredCampaigns(updated);
  };

  const updateEmergencyRecords = (updated: EmergencySupportRecord[]) => {
    setEmergencyRecords(updated);
    saveStoredEmergencyRecords(updated);
  };

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toFilter, setToFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const itemsPerPage = 8;

  // Map CCCD -> Resident for cross-module BHYT status verification
  const residentByCccd = useMemo(() => {
    const map = new Map<string, Resident>();
    residents.forEach(res => {
      if (res.cccd) map.set(res.cccd.trim(), res);
    });
    return map;
  }, [residents]);

  const getBhytInfo = (rec: WelfareRecipient) => {
    const matchedResident = residentByCccd.get((rec.cccd || "").trim());
    const cardNumber = matchedResident?.healthInsuranceNumber?.trim();
    const hasBenefitBhyt = (rec.benefits || []).some(b => /bhyt|bảo hiểm y tế/i.test(b));
    if (cardNumber) {
      return { hasBhyt: true, code: cardNumber, label: `BHYT: ${cardNumber}` };
    }
    if (hasBenefitBhyt) {
      return { hasBhyt: true, code: "", label: "Có thẻ BHYT chính sách" };
    }
    return { hasBhyt: false, code: "", label: "Chưa cập nhật BHYT" };
  };

  // Modals
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<WelfareRecipient | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<WelfareCampaign | null>(null);
  const [recipientToDelete, setRecipientToDelete] = useState<WelfareRecipient | null>(null);
  const [subCategoryConfirmToDelete, setSubCategoryConfirmToDelete] = useState<WelfareSubCategory | null>(null);
  const [emergencyTargetRecipient, setEmergencyTargetRecipient] = useState<WelfareRecipient | null>(null);

  // Edit Recipient Modal State
  const [recipientToEdit, setRecipientToEdit] = useState<WelfareRecipient | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editCccd, setEditCccd] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCategory, setEditCategory] = useState("Người có công");
  const [editSupportLevel, setEditSupportLevel] = useState("2.500.000đ / tháng");
  const [editStatus, setEditStatus] = useState<"Đang nhận trợ cấp" | "Chờ duyệt hồ sơ" | "Đã tạm ngưng">("Đang nhận trợ cấp");
  const [editBenefits, setEditBenefits] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editTempBenefitInput, setEditTempBenefitInput] = useState("");

  // Edit & Delete SubCategory Modal State
  const [subCategoryToEdit, setSubCategoryToEdit] = useState<WelfareSubCategory | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubCode, setEditSubCode] = useState("");
  const [editSubColor, setEditSubColor] = useState("indigo");
  const [editSubDesc, setEditSubDesc] = useState("");
  const [editSubCriteria, setEditSubCriteria] = useState("");
  const [editSubBenefits, setEditSubBenefits] = useState<string[]>([]);
  const [editSubTempBenefit, setEditSubTempBenefit] = useState("");
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<WelfareSubCategory | null>(null);
  const [reassignCategoryTarget, setReassignCategoryTarget] = useState("");

  // Modern Toast system
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ================= FORM STATE: ADD RECIPIENT FROM RESIDENTS =================
  const [selectedResidentCccd, setSelectedResidentCccd] = useState<string>("");
  const [residentSearchQuery, setResidentSearchQuery] = useState("");
  const [recFullName, setRecFullName] = useState("");
  const [recCccd, setRecCccd] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recAddress, setRecAddress] = useState("42/ Lương Định Của, Phường An Phú");
  const [recCategory, setRecCategory] = useState<string>("Người có công");
  const [recSupportLevel, setRecSupportLevel] = useState("2.500.000đ / tháng");
  const [recNotes, setRecNotes] = useState("");
  const [recSelectedBenefits, setRecSelectedBenefits] = useState<string[]>([]);
  const [recGender, setRecGender] = useState("");
  const [recBirthDate, setRecBirthDate] = useState("");
  const [recHouseholdId, setRecHouseholdId] = useState("");

  // Filter candidate residents
  const candidateResidents = useMemo(() => {
    const q = residentSearchQuery.toLowerCase().trim();
    if (!q) return residents.slice(0, 50);
    return residents
      .filter(r => (r.fullName && r.fullName.toLowerCase().includes(q)) || (r.cccd && r.cccd.includes(q)) || (r.address && r.address.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [residents, residentSearchQuery]);

  // Handle Resident Selection
  const handleSelectResident = (cccdVal: string) => {
    setSelectedResidentCccd(cccdVal);
    const found = residents.find(r => r.cccd === cccdVal);
    if (found) {
      setRecFullName(found.fullName);
      setRecCccd(found.cccd);
      setRecPhone(found.phone === "N/A" ? "" : found.phone);
      setRecAddress(found.address);
      setRecGender(found.gender || "");
      setRecBirthDate(found.birthDate || "");
      setRecHouseholdId(found.householdId || "");
    }
  };

  // Sync default benefits when category changes
  const handleCategorySelectChange = (catName: string) => {
    setRecCategory(catName);
    const sub = subCategories.find(s => s.name === catName);
    if (sub && sub.standardBenefits) {
      setRecSelectedBenefits(sub.standardBenefits);
    }
    // Set typical support levels
    if (catName.includes("Người có công")) setRecSupportLevel("2.500.000đ / tháng");
    else if (catName.includes("Gia đình chính sách")) setRecSupportLevel("3.200.000đ / tháng");
    else if (catName.includes("Hộ nghèo")) setRecSupportLevel("1.200.000đ / tháng");
    else if (catName.includes("Người cao tuổi")) setRecSupportLevel("1.000.000đ / tháng");
    else if (catName.includes("Trẻ em mồ côi")) setRecSupportLevel("1.500.000đ / tháng");
  };

  // Submit Add Recipient
  const handleCreateRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recFullName.trim() || !recCccd.trim()) {
      showToast("Vui lòng chọn hoặc nhập họ tên và số CCCD đối tượng!", "error");
      return;
    }

    const sub = subCategories.find(s => s.name === recCategory);
    const newId = "WF" + (recipients.length + 1).toString().padStart(3, "0");

    const newRec: WelfareRecipient = {
      id: newId,
      fullName: recFullName.trim(),
      category: recCategory,
      subCategoryId: sub?.id,
      address: recAddress.trim(),
      cccd: recCccd.trim(),
      phone: recPhone.trim() || undefined,
      supportLevel: recSupportLevel.trim(),
      status: "Chờ duyệt hồ sơ",
      notes: recNotes.trim(),
      benefits: recSelectedBenefits,
      gender: recGender,
      birthDate: recBirthDate,
      householdId: recHouseholdId,
      joinedDate: new Date().toISOString().split("T")[0],
      disbursedTotal: 0
    };

    onAddRecipient(newRec);
    setShowAddRecipientModal(false);
    setSelectedRecipient(newRec);
    showToast(`Đã thêm đối tượng thụ hưởng "${newRec.fullName}" thành công!`, "success");

    // Reset Form
    setSelectedResidentCccd("");
    setRecFullName("");
    setRecCccd("");
    setRecPhone("");
    setRecNotes("");
    setRecSelectedBenefits([]);
  };

  // ================= FORM STATE: CREATE CUSTOM SUB-MODULE =================
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubColor, setNewSubColor] = useState("rose");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubCriteria, setNewSubCriteria] = useState("");
  const [newSubBenefits, setNewSubBenefits] = useState<string[]>([
    "Trợ cấp tiền mặt bảo trợ xã hội hàng tháng",
    "Cấp thẻ BHYT miễn phí 100%"
  ]);
  const [tempBenefitInput, setTempBenefitInput] = useState("");

  const handleAddTempBenefit = () => {
    if (tempBenefitInput.trim() && !newSubBenefits.includes(tempBenefitInput.trim())) {
      setNewSubBenefits(prev => [...prev, tempBenefitInput.trim()]);
      setTempBenefitInput("");
    }
  };

  const handleCreateSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) {
      showToast("Vui lòng nhập tên phân hệ an sinh xã hội con!", "error");
      return;
    }

    const code = newSubCode.trim().toUpperCase() || newSubName.trim().substring(0, 3).toUpperCase();
    const newSub: WelfareSubCategory = {
      id: "SUB_" + Date.now().toString(36).toUpperCase(),
      name: newSubName.trim(),
      code,
      color: newSubColor,
      iconName: "FolderPlus",
      description: newSubDesc.trim() || "Phân hệ bảo trợ an sinh xã hội cơ sở Khu phố 3",
      criteria: newSubCriteria.trim() || "Theo biên bản thẩm tra hoàn cảnh gia đình của Tổ dân phố",
      standardBenefits: newSubBenefits,
      isCustom: true,
      createdAt: new Date().toISOString().split("T")[0]
    };

    const updated = [...subCategories, newSub];
    updateSubCategories(updated);
    setShowAddSubCategoryModal(false);
    showToast(`Đã tạo thành công phân hệ an sinh con "${newSub.name}"!`, "success");

    // Reset Form
    setNewSubName("");
    setNewSubCode("");
    setNewSubDesc("");
    setNewSubCriteria("");
    setNewSubBenefits(["Trợ cấp tiền mặt bảo trợ xã hội hàng tháng", "Cấp thẻ BHYT miễn phí 100%"]);
  };

  // Delete Custom Sub-Category
  const handleDeleteSubCategory = (subId: string) => {
    const target = subCategories.find(s => s.id === subId);
    if (!target) return;
    if (recipients.some(r => r.category === target.name)) {
      showToast(`Không thể xóa phân hệ "${target.name}" vì đang có đối tượng thụ hưởng!`, "error");
      return;
    }
    setSubCategoryConfirmToDelete(target);
  };

  // ================= FORM STATE: PROPOSE SUPPORT CAMPAIGN =================
  const [camTitle, setCamTitle] = useState("");
  const [camCategories, setCamCategories] = useState<string[]>(["Hộ nghèo/Cận nghèo", "Người có công"]);
  const [camCashAmount, setCamCashAmount] = useState<number>(1000000);
  const [camGiftDesc, setCamGiftDesc] = useState("Túi quà nhu yếu phẩm (Gạo ST25, dầu ăn, bánh mứt trị giá 500.000đ)");
  const [camFundingSource, setCamFundingSource] = useState("Quỹ Vì người nghèo KP3 & Ngân sách Phường");
  const [camDate, setCamDate] = useState("2026-11-20");
  const [camLocation, setCamLocation] = useState("Nhà văn hóa Khu phố 3");
  const [camNotes, setCamNotes] = useState("");

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!camTitle.trim()) {
      showToast("Vui lòng nhập tên chương trình / đợt hỗ trợ!", "error");
      return;
    }

    // Match recipients from selected categories
    const matchingRecs = recipients.filter(r => camCategories.includes(r.category));
    const recipientIds = matchingRecs.map(r => r.id);
    const count = matchingRecs.length || 10;
    const total = count * camCashAmount;

    const newCampaign: WelfareCampaign = {
      id: "CAM-" + String(campaigns.length + 1).padStart(3, "0"),
      title: camTitle.trim(),
      type: "batch",
      targetCategories: camCategories,
      cashAmountPerPerson: camCashAmount,
      giftDescription: camGiftDesc.trim() || undefined,
      totalBudget: total,
      fundingSource: camFundingSource.trim(),
      disbursementDate: camDate,
      location: camLocation.trim(),
      status: "Đang đề xuất",
      recipientIds,
      recipientCount: count,
      notes: camNotes.trim() || undefined,
      createdAt: new Date().toISOString().split("T")[0]
    };

    const updated = [newCampaign, ...campaigns];
    updateCampaigns(updated);
    setShowAddCampaignModal(false);
    showToast(`Đã lập đề xuất đợt hỗ trợ "${newCampaign.title}" thành công!`, "success");

    // Reset Form
    setCamTitle("");
    setCamNotes("");
  };

  // Update Campaign Status
  const handleUpdateCampaignStatus = (camId: string, status: WelfareCampaign["status"]) => {
    const updated = campaigns.map(c => c.id === camId ? { ...c, status } : c);
    updateCampaigns(updated);
    if (selectedCampaign?.id === camId) {
      setSelectedCampaign({ ...selectedCampaign, status });
    }
    showToast(`Đã cập nhật trạng thái đợt hỗ trợ: "${status}"!`, "success");
  };

  // ================= FORM STATE: IMMEDIATE EMERGENCY SUPPORT =================
  const [emgRecipientId, setEmgRecipientId] = useState("");
  const [emgRecipientName, setEmgRecipientName] = useState("");
  const [emgCccd, setEmgCccd] = useState("");
  const [emgAddress, setEmgAddress] = useState("");
  const [emgCategory, setEmgCategory] = useState("Hộ nghèo/Cận nghèo");
  const [emgAmount, setEmgAmount] = useState<number>(3000000);
  const [emgGiftItems, setEmgGiftItems] = useState("Túi thuốc men khẩn cấp + 25kg Gạo");
  const [emgReason, setEmgReason] = useState("");
  const [emgApprover, setEmgApprover] = useState("Nguyễn Trung Huy (Trưởng ban ĐHKP)");
  const [emgDisbursedBy, setEmgDisbursedBy] = useState("Lê Văn Sơn (Phó Ban điều hành)");
  const [emgFundingSource, setEmgFundingSource] = useState("Quỹ Cứu trợ khẩn cấp & Tương thân tương ái KP3");
  const [emgNotes, setEmgNotes] = useState("");

  // Pre-fill Emergency Modal when triggered from a card
  const handleOpenEmergencyForRecipient = (rec: WelfareRecipient) => {
    setEmergencyTargetRecipient(rec);
    setEmgRecipientId(rec.id);
    setEmgRecipientName(rec.fullName);
    setEmgCccd(rec.cccd);
    setEmgAddress(rec.address);
    setEmgCategory(rec.category);
    setEmgAmount(3000000);
    setEmgReason(`Hỗ trợ khó khăn đột xuất cho gia đình đối tượng ${rec.fullName} (${rec.category})`);
    setShowEmergencyModal(true);
  };

  const handleConfirmEmergencySupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emgRecipientName.trim() || !emgReason.trim()) {
      showToast("Vui lòng nhập đối tượng và lý do hỗ trợ khẩn cấp!", "error");
      return;
    }

    const newRecord: EmergencySupportRecord = {
      id: "EMG-" + String(emergencyRecords.length + 1).padStart(3, "0"),
      recipientId: emgRecipientId || "WF_EMG_" + Date.now().toString(36).toUpperCase(),
      recipientName: emgRecipientName.trim(),
      cccd: emgCccd.trim(),
      address: emgAddress.trim(),
      category: emgCategory,
      amount: emgAmount,
      giftItems: emgGiftItems.trim() || undefined,
      reason: emgReason.trim(),
      disbursedDate: new Date().toISOString().split("T")[0],
      disbursedBy: emgDisbursedBy,
      approver: emgApprover,
      fundingSource: emgFundingSource,
      status: "Đã hỗ trợ ngay",
      notes: emgNotes.trim() || undefined
    };

    const updated = [newRecord, ...emergencyRecords];
    updateEmergencyRecords(updated);
    if (onRecordFundExpenditure && emgAmount > 0) {
      onRecordFundExpenditure({
        id: `EXP_${newRecord.id}_${Date.now().toString(36)}`,
        voucherCode: newRecord.id,
        fundName: emgFundingSource.trim() || "Quỹ An sinh Xã hội KP3",
        title: `Chi hỗ trợ khẩn cấp: ${newRecord.recipientName} — ${newRecord.reason}`,
        amount: emgAmount,
        spentAt: newRecord.disbursedDate,
        receiver: newRecord.recipientName,
        evidence: `HS An sinh ${newRecord.recipientId}`,
        approvedBy: emgApprover.trim() || "Trưởng Ban Điều hành KP3"
      });
    }
    setShowEmergencyModal(false);
    showToast(`Đã chi trả hỗ trợ ngay ${formatVNNumber(emgAmount)} VNĐ cho ${emgRecipientName} và ghi nhận phiếu chi Quỹ khu phố.`, "success");
  };

  // Add Custom Benefit to Selected Recipient
  const [newCustomBenefitName, setNewCustomBenefitName] = useState("");
  const handleAddBenefitToSelected = () => {
    if (!selectedRecipient || !newCustomBenefitName.trim()) return;
    const currentBenefits = selectedRecipient.benefits || [];
    if (currentBenefits.includes(newCustomBenefitName.trim())) return;
    const updatedBenefits = [...currentBenefits, newCustomBenefitName.trim()];
    const updatedRec = { ...selectedRecipient, benefits: updatedBenefits };
    setSelectedRecipient(updatedRec);

    // Update in recipients list
    const updatedList = recipients.map(r => r.id === selectedRecipient.id ? updatedRec : r);
    try {
      localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updatedList));
    } catch { }
    if (onUpdateRecipient) onUpdateRecipient(updatedRec);
    setNewCustomBenefitName("");
    showToast(`Đã thêm quyền lợi "${newCustomBenefitName.trim()}" cho ${selectedRecipient.fullName}!`, "success");
  };

  const handleRemoveBenefitFromSelected = (benefitText: string) => {
    if (!selectedRecipient) return;
    const updatedBenefits = (selectedRecipient.benefits || []).filter(b => b !== benefitText);
    const updatedRec = { ...selectedRecipient, benefits: updatedBenefits };
    setSelectedRecipient(updatedRec);
    const updatedList = recipients.map(r => r.id === selectedRecipient.id ? updatedRec : r);
    try {
      localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updatedList));
    } catch { }
    if (onUpdateRecipient) onUpdateRecipient(updatedRec);
  };

  // Execute Recipient Deletion
  const executeDeleteRecipient = (id: string) => {
    onDeleteRecipient(id);
    showToast("Đã xóa đối tượng khỏi danh sách trợ cấp thành công!", "info");
    setRecipientToDelete(null);
    if (selectedRecipient?.id === id) setSelectedRecipient(null);
  };

  // ================= FORM HANDLERS: EDIT RECIPIENT =================
  const handleOpenEditRecipient = (rec: WelfareRecipient) => {
    setRecipientToEdit(rec);
    setEditFullName(rec.fullName);
    setEditCccd(rec.cccd);
    setEditPhone(rec.phone || "");
    setEditAddress(rec.address);
    setEditCategory(rec.category);
    setEditSupportLevel(rec.supportLevel);
    setEditStatus(rec.status);
    setEditBenefits(rec.benefits ? [...rec.benefits] : []);
    setEditNotes(rec.notes || "");
    setEditTempBenefitInput("");
  };

  const handleAddBenefitToEdit = () => {
    if (editTempBenefitInput.trim() && !editBenefits.includes(editTempBenefitInput.trim())) {
      setEditBenefits(prev => [...prev, editTempBenefitInput.trim()]);
      setEditTempBenefitInput("");
    }
  };

  const handleRemoveBenefitFromEdit = (benefitText: string) => {
    setEditBenefits(prev => prev.filter(b => b !== benefitText));
  };

  const handleSaveEditRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientToEdit) return;
    if (!editFullName.trim() || !editCccd.trim()) {
      showToast("Vui lòng điền họ tên và số CCCD!", "error");
      return;
    }
    const matchedSub = subCategories.find(s => s.name === editCategory);
    const updated: WelfareRecipient = {
      ...recipientToEdit,
      fullName: editFullName.trim(),
      cccd: editCccd.trim(),
      phone: editPhone.trim() || undefined,
      address: editAddress.trim() || "Khu phố 3, Phường An Phú",
      category: editCategory,
      subCategoryId: matchedSub?.id || recipientToEdit.subCategoryId,
      supportLevel: editSupportLevel,
      status: editStatus,
      benefits: editBenefits,
      notes: editNotes.trim() || undefined
    };

    if (onUpdateRecipient) {
      onUpdateRecipient(updated);
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem("kp3_welfare_recipients") || "[]");
        const newStored = stored.map((r: any) => r.id === updated.id ? updated : r);
        localStorage.setItem("kp3_welfare_recipients", JSON.stringify(newStored));
      } catch { }
    }

    if (selectedRecipient?.id === updated.id) {
      setSelectedRecipient(updated);
    }

    setRecipientToEdit(null);
    showToast(`Đã cập nhật hồ sơ đối tượng "${updated.fullName}" thành công!`, "success");
  };

  // ================= FORM HANDLERS: EDIT & DELETE SUB-CATEGORY =================
  const handleOpenEditSubCategory = (sub: WelfareSubCategory) => {
    setSubCategoryToEdit(sub);
    setEditSubName(sub.name);
    setEditSubCode(sub.code);
    setEditSubColor(sub.color || "indigo");
    setEditSubDesc(sub.description);
    setEditSubCriteria(sub.criteria);
    setEditSubBenefits([...(sub.standardBenefits || [])]);
    setEditSubTempBenefit("");
  };

  const handleAddBenefitToEditSub = () => {
    if (editSubTempBenefit.trim() && !editSubBenefits.includes(editSubTempBenefit.trim())) {
      setEditSubBenefits(prev => [...prev, editSubTempBenefit.trim()]);
      setEditSubTempBenefit("");
    }
  };

  const handleRemoveBenefitFromEditSub = (benefitText: string) => {
    setEditSubBenefits(prev => prev.filter(b => b !== benefitText));
  };

  const handleSaveEditSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCategoryToEdit) return;
    if (!editSubName.trim()) {
      showToast("Vui lòng nhập tên phân hệ an sinh con!", "error");
      return;
    }
    const oldName = subCategoryToEdit.name;
    const newName = editSubName.trim();
    const updatedSub: WelfareSubCategory = {
      ...subCategoryToEdit,
      name: newName,
      code: editSubCode.trim().toUpperCase() || newName.substring(0, 3).toUpperCase(),
      color: editSubColor,
      description: editSubDesc.trim() || subCategoryToEdit.description,
      criteria: editSubCriteria.trim() || subCategoryToEdit.criteria,
      standardBenefits: editSubBenefits
    };

    const updatedList = subCategories.map(s => s.id === updatedSub.id ? updatedSub : s);
    updateSubCategories(updatedList);

    // If name changed, synchronize recipients whose category was oldName
    if (oldName !== newName) {
      recipients.forEach(r => {
        if (r.category === oldName) {
          const updatedRec = { ...r, category: newName };
          if (onUpdateRecipient) onUpdateRecipient(updatedRec);
        }
      });
      if (selectedRecipient && selectedRecipient.category === oldName) {
        setSelectedRecipient({ ...selectedRecipient, category: newName });
      }
    }

    setSubCategoryToEdit(null);
    showToast(`Đã cập nhật phân hệ "${newName}" thành công!`, "success");
  };

  const handleConfirmDeleteSubCategory = (sub: WelfareSubCategory, reassignTarget?: string) => {
    const affectedRecipients = recipients.filter(r => r.category === sub.name);
    if (affectedRecipients.length > 0) {
      if (!reassignTarget) {
        showToast(`Vui lòng chọn phân hệ mới để chuyển ${affectedRecipients.length} đối tượng!`, "error");
        return;
      }
      affectedRecipients.forEach(r => {
        const updatedRec = { ...r, category: reassignTarget };
        if (onUpdateRecipient) onUpdateRecipient(updatedRec);
      });
      showToast(`Đã chuyển giao ${affectedRecipients.length} đối tượng sang phân hệ "${reassignTarget}".`, "info");
    }

    const updated = subCategories.filter(s => s.id !== sub.id);
    updateSubCategories(updated);
    setSubCategoryToDelete(null);
    showToast(`Đã xóa phân hệ an sinh "${sub.name}" thành công!`, "success");
  };

  // Filter Recipients
  const filteredRecipients = useMemo(() => {
    return recipients.filter(r => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        r.fullName.toLowerCase().includes(q) ||
        r.cccd.includes(q) ||
        r.address.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q));

      const matchCategory = selectedCategoryPill === "all" || r.category === selectedCategoryPill;
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const toNum = extractToDanPho(r.address);
      const matchTo = toFilter === "all" || (toNum !== null && String(toNum) === toFilter);

      return matchSearch && matchCategory && matchStatus && matchTo;
    });
  }, [recipients, searchTerm, selectedCategoryPill, statusFilter, toFilter]);

  // Pagination
  const totalItems = filteredRecipients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedRecipients = filteredRecipients.slice(startIndex, startIndex + itemsPerPage);

  // Overall KPI Metrics
  const kpiData = useMemo(() => {
    const totalRecs = recipients.length;
    const activeRecs = recipients.filter(r => r.status === "Đang nhận trợ cấp").length;
    const pendingRecs = recipients.filter(r => r.status === "Chờ duyệt hồ sơ").length;
    const totalCampaigns = campaigns.length;
    const totalEmergency = emergencyRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalRecs,
      activeRecs,
      pendingRecs,
      totalCampaigns,
      totalEmergency
    };
  }, [recipients, campaigns, emergencyRecords]);

  // Sub-Category Helper for Badges & Colors
  const getSubCategoryBadge = (catName: string) => {
    const sub = subCategories.find(s => s.name === catName);
    const color = sub?.color || "rose";
    const colorClasses: Record<string, string> = {
      rose: "bg-rose-50 text-rose-700 border-rose-200",
      amber: "bg-amber-50 text-amber-800 border-amber-200",
      emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
      cyan: "bg-cyan-50 text-cyan-800 border-cyan-200",
      indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
      purple: "bg-purple-50 text-purple-800 border-purple-200",
      blue: "bg-blue-50 text-blue-800 border-blue-200"
    };
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${colorClasses[color] || colorClasses.rose}`}>
        <Tag size={11} />
        {catName}
      </span>
    );
  };

  return (
    <div id="social-welfare-view" className="space-y-6">
      {/* Inline Notification Bar */}
      <InlineNotice
        message={toast?.message ?? null}
        type={toast?.type ?? "info"}
        onDismiss={() => setToast(null)}
      />

      {/* Page Header with Clean Dual-Action Controls */}
      <PageHeader
        badgeIcon={<Heart size={13} className="text-rose-600 fill-rose-500/20" />}
        badgeText="CHÍNH SÁCH & AN SINH CỘNG ĐỒNG • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="NGHỊ ĐỊNH 20/2021/NĐ-CP & ĐỀ ÁN AN SINH"
        title="An Sinh Xã Hội"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-add-welfare-recipient"
              type="button"
              onClick={() => {
                setShowAddRecipientModal(true);
                handleCategorySelectChange("Người có công");
              }}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Thêm đối tượng thụ hưởng
            </button>

            <button
              id="btn-emergency-support"
              type="button"
              onClick={() => {
                setEmergencyTargetRecipient(null);
                setEmgRecipientId("");
                setEmgRecipientName("");
                setEmgCccd("");
                setEmgAddress("42/ Lương Định Của, Phường An Phú");
                setEmgReason("Hỗ trợ khẩn cấp đột xuất cho trường hợp khó khăn cấp bách");
                setShowEmergencyModal(true);
              }}
              className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Zap size={14} className="text-amber-600" /> Hỗ trợ khẩn cấp
            </button>
          </div>
        }
      />

      {/* 4 StatCards: Responsive & Actionable Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Đối tượng thụ hưởng"
          value={kpiData.totalRecs}
          badge={`${kpiData.activeRecs} đang hưởng`}
          highlighted={true}
          icon={Heart}
          color="rose"
          subtext="Toàn bộ đối tượng bảo trợ cơ sở"
          subtextRight="Hồ sơ số hóa"
        />
        <StatCard
          label="Phân hệ an sinh con"
          value={subCategories.length}
          badge="nhóm đối tượng"
          icon={Tag}
          color="indigo"
          subtext="Người có công, Hộ nghèo, Trẻ em..."
          subtextRight="Phân loại chuẩn"
        />
        <StatCard
          label="Đợt hỗ trợ & Trao quà"
          value={kpiData.totalCampaigns}
          badge="chương trình"
          icon={Gift}
          color="emerald"
          subtext="Tết Nguyên Đán, gạo Quý, học bổng"
          subtextRight="Kế hoạch năm"
        />
        <StatCard
          label="Cứu trợ khẩn cấp đã chi"
          value={formatVNNumber(kpiData.totalEmergency)}
          badge="VNĐ"
          icon={Zap}
          color="amber"
          subtext="Hỗ trợ ngay tai nạn, tang tế, viện phí"
          subtextRight="Giải ngân nóng"
        />
      </div>

      {/* Sub-tab Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab("recipients")}
          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "recipients"
            ? "bg-white text-rose-800 border border-slate-200"
            : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
        >
          <Users size={14} className={activeTab === "recipients" ? "text-rose-700" : "text-slate-600"} />
          <span>Đối tượng thụ hưởng ({recipients.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("submodules")}
          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "submodules"
            ? "bg-white text-indigo-800 border border-slate-200"
            : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
        >
          <FolderPlus size={14} className={activeTab === "submodules" ? "text-indigo-700" : "text-slate-600"} />
          <span>Phân hệ chính sách ({subCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "campaigns"
            ? "bg-white text-emerald-800 border border-slate-200"
            : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
        >
          <Gift size={14} className={activeTab === "campaigns" ? "text-emerald-700" : "text-slate-600"} />
          <span>Đợt hỗ trợ tập trung ({campaigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("emergency")}
          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "emergency"
            ? "bg-white text-amber-800 border border-slate-200"
            : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
        >
          <Zap size={14} className={activeTab === "emergency" ? "text-amber-700" : "text-slate-600"} />
          <span>Cứu trợ khẩn cấp ({emergencyRecords.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DANH SÁCH ĐỐI TƯỢNG THỤ HƯỞNG                                 */}
      {/* ========================================================================= */}
      {activeTab === "recipients" && (
        <div className="space-y-4">
          {/* Sub-Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setSelectedCategoryPill("all"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${selectedCategoryPill === "all"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
            >
              Tất cả phân hệ ({recipients.length})
            </button>
            {subCategories.map(sub => {
              const count = recipients.filter(r => r.category === sub.name).length;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => { setSelectedCategoryPill(sub.name); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${selectedCategoryPill === sub.name
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50"
                    }`}
                >
                  <span>{sub.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${selectedCategoryPill === sub.name ? "bg-white/25 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search, Status Filter, Tổ 1–14 & View Mode Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                id="social-welfare-search"
                type="text"
                placeholder="Tìm theo tên cư dân, số CCCD, địa chỉ, số điện thoại..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-rose-500 bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="min-w-[145px]">
                <ReportSelect
                  aria-label="Lọc theo Tổ dân phố"
                  value={toFilter}
                  onChange={val => { setToFilter(val); setCurrentPage(1); }}
                  options={[
                    { value: "all", label: "Tất cả Tổ 1–14" },
                    ...KP3_TO_LIST.map(n => ({ value: String(n), label: `Tổ dân phố ${n}` }))
                  ]}
                  className="text-xs"
                />
              </div>

              <div className="min-w-[165px]">
                <ReportSelect
                  aria-label="Lọc trạng thái trợ cấp"
                  value={statusFilter}
                  onChange={val => { setStatusFilter(val); setCurrentPage(1); }}
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "Đang nhận trợ cấp", label: "Đang nhận trợ cấp" },
                    { value: "Chờ duyệt hồ sơ", label: "Chờ duyệt hồ sơ" },
                    { value: "Đã tạm ngưng", label: "Đã tạm ngưng" }
                  ]}
                  className="text-xs"
                />
              </div>

              {/* View mode toggle */}
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100 gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "card" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  title="Xem dạng Lưới Thẻ"
                  aria-label="Xem dạng Lưới Thẻ"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  title="Xem dạng Bảng Danh sách"
                  aria-label="Xem dạng Bảng Danh sách"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid or Table View */}
          {viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedRecipients.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-600">
                  Không tìm thấy thông tin đối tượng chính sách phù hợp bộ lọc.
                </div>
              ) : (
                paginatedRecipients.map(rec => {
                  const statusColors: Record<string, string> = {
                    "Đang nhận trợ cấp": "bg-emerald-50 text-emerald-800 border-emerald-200",
                    "Chờ duyệt hồ sơ": "bg-amber-50 text-amber-800 border-amber-200",
                    "Đã tạm ngưng": "bg-slate-100 text-slate-700 border-slate-200"
                  };
                  const bhyt = getBhytInfo(rec);
                  const toNum = extractToDanPho(rec.address);
                  return (
                    <div
                      key={rec.id}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-rose-300 p-4 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap justify-between items-start gap-1.5">
                          {getSubCategoryBadge(rec.category)}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[rec.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {rec.status}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-rose-700 transition-colors line-clamp-1">
                          {rec.fullName}
                        </h3>

                        <div className="text-xs text-slate-600 flex items-center gap-1.5 min-w-0">
                          <MapPin size={12} className="shrink-0 text-slate-500" />
                          <span className="truncate">{rec.address}</span>
                          {toNum !== null && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
                              Tổ {toNum}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${bhyt.hasBhyt
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {bhyt.label}
                          </span>
                        </div>

                        {/* Active Benefits Chips */}
                        {rec.benefits && rec.benefits.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {rec.benefits.slice(0, 2).map((b, idx) => (
                              <span key={idx} className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded truncate max-w-[180px]" title={b}>
                                ✓ {b}
                              </span>
                            ))}
                            {rec.benefits.length > 2 && (
                              <span className="text-xs text-slate-600 font-bold self-center">
                                +{rec.benefits.length - 2} chế độ
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-slate-600 text-xs">CCCD: {rec.cccd.substring(0, 6)}***</span>
                          <span className="font-black text-rose-700 text-xs">{rec.supportLevel}</span>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRecipient(rec)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 cursor-pointer transition-colors"
                          >
                            <Eye size={13} /> Hồ sơ
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEmergencyForRecipient(rec)}
                              className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Hỗ trợ khẩn cấp ngay cho đối tượng này"
                            >
                              <Zap size={13} className="text-amber-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRecipient(rec)}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer"
                              title="Chỉnh sửa hồ sơ"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecipientToDelete(rec)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer"
                              title="Xóa đối tượng"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
                      <th className="py-3 px-4 min-w-[215px] whitespace-nowrap">Mã & Đối tượng</th>
                      <th className="py-3 px-4 min-w-[210px] whitespace-nowrap">CCCD & Liên hệ</th>
                      <th className="py-3 px-4 min-w-[215px] whitespace-nowrap">Phân hệ & BHYT</th>
                      <th className="py-3 px-4 min-w-[215px] whitespace-nowrap">Địa chỉ cư trú</th>
                      <th className="py-3 px-4 min-w-[140px] whitespace-nowrap">Trợ cấp</th>
                      <th className="py-3 px-4 text-center min-w-[150px] whitespace-nowrap">Trạng thái</th>
                      <th className="py-3 px-4 text-center min-w-[130px] whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecipients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-sm text-slate-600">
                          Không tìm thấy thông tin đối tượng chính sách phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecipients.map(rec => {
                        const bhyt = getBhytInfo(rec);
                        const toNum = extractToDanPho(rec.address);
                        const statusClasses =
                          rec.status === "Đang nhận trợ cấp"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : rec.status === "Chờ duyệt hồ sơ"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200";
                        return (
                          <tr key={rec.id} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-xs">{rec.fullName}</div>
                              <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-0.5 inline-block">
                                {rec.id}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-slate-800">{rec.cccd}</div>
                              <div className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                                <Phone size={12} /> {rec.phone || "Chưa có SĐT"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 space-y-1">
                              <div>{getSubCategoryBadge(rec.category)}</div>
                              <div>
                                <span
                                  className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${bhyt.hasBhyt
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}
                                >
                                  {bhyt.label}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-xs text-slate-700 truncate max-w-[210px] flex items-center gap-1">
                                <MapPin size={12} className="text-slate-500 shrink-0" />
                                <span className="truncate">{rec.address}</span>
                              </div>
                              {toNum !== null && (
                                <span className="text-xs font-semibold text-slate-600">Tổ dân phố {toNum}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-bold text-rose-700 text-xs">{rec.supportLevel}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border inline-block ${statusClasses}`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecipient(rec)}
                                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 cursor-pointer"
                                  title="Xem chi tiết hồ sơ"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRecipient(rec)}
                                  className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                  title="Chỉnh sửa thông tin đối tượng"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmergencyForRecipient(rec)}
                                  className="p-1.5 text-amber-800 hover:bg-amber-50 rounded-lg cursor-pointer"
                                  title="Hỗ trợ ngay"
                                >
                                  <Zap size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRecipientToDelete(rec)}
                                  className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Xóa đối tượng"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PHÂN HỆ & CHẾ ĐỘ CHÍNH SÁCH QUYỀN LỢI                     */}
      {/* ========================================================================= */}
      {activeTab === "submodules" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Danh Mục Phân Hệ An Sinh Con & Chế Độ Chính Sách
              </h3>
              <p className="text-xs text-slate-600">
                Quản lý các nhóm đối tượng bảo trợ đặc thù (người có công, hộ nghèo, người cao tuổi...) và chuẩn hóa quyền lợi theo quy định
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSubCategoryModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto shrink-0"
            >
              <Plus size={14} /> Tạo phân hệ con mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subCategories.map(sub => {
              const count = recipients.filter(r => r.category === sub.name).length;
              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-4.5 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                          {sub.code}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{sub.name}</h4>
                          <span className="text-xs text-slate-600 font-mono">
                            {sub.isCustom ? "Phân hệ tự tạo" : "Phân hệ quy chuẩn"}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {count} đối tượng
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {sub.description}
                    </p>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                      <span className="text-xs uppercase font-bold text-slate-600 block mb-1">Tiêu chí xét duyệt:</span>
                      <p className="text-slate-700 text-xs leading-relaxed line-clamp-2">{sub.criteria}</p>
                    </div>

                    {/* Standard Benefits */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs uppercase font-bold text-slate-600 block">Chế độ & Quyền lợi chuẩn ({sub.standardBenefits?.length || 0}):</span>
                      <ul className="space-y-1">
                        {(sub.standardBenefits || []).slice(0, 3).map((ben, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{ben}</span>
                          </li>
                        ))}
                        {(sub.standardBenefits?.length || 0) > 3 && (
                          <li className="text-xs text-indigo-700 font-semibold pl-4">
                            +{(sub.standardBenefits?.length || 0) - 3} chế độ chính sách khác...
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryPill(sub.name);
                        setActiveTab("recipients");
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer truncate"
                    >
                      Xem {count} đối tượng ➜
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSubCategory(sub)}
                        className="px-2 py-1 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-bold transition-colors"
                        title="Chỉnh sửa phân hệ & tiêu chuẩn chính sách"
                      >
                        <Edit2 size={12} />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubCategoryToDelete(sub);
                          const others = subCategories.filter(s => s.id !== sub.id);
                          setReassignCategoryTarget(others[0]?.name || "");
                        }}
                        className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg cursor-pointer flex items-center gap-1 text-xs transition-colors"
                        title="Xóa phân hệ"
                      >
                        <Trash2 size={12} />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ĐỢT HỖ TRỢ & CẤP PHÁT TẬP TRUNG                                */}
      {/* ========================================================================= */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Kế Hoạch & Các Đợt Trao Quà Hỗ Trợ Định Kỳ
              </h3>
              <p className="text-xs text-slate-600">
                Tổ chức các đợt phát quà Tết, học bổng khuyến học, gạo cứu trợ định kỳ theo từng diện chính sách
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCampaignModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto shrink-0"
            >
              <Plus size={14} /> Lập đợt hỗ trợ mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(cam => {
              const statusBadges: Record<string, string> = {
                "Đang đề xuất": "bg-amber-100 text-amber-800 border-amber-300",
                "Đã duyệt chi": "bg-indigo-100 text-indigo-800 border-indigo-300",
                "Đang trao tặng": "bg-sky-100 text-sky-800 border-sky-300",
                "Đã hoàn tất": "bg-emerald-100 text-emerald-800 border-emerald-300"
              };

              return (
                <div
                  key={cam.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {cam.id}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadges[cam.status] || "bg-slate-100 text-slate-700"}`}>
                        {cam.status}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base leading-snug">
                      {cam.title}
                    </h4>

                    {/* Target Categories */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-600 font-semibold">Đối tượng thụ hưởng:</span>
                      {cam.targetCategories.map((c, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <span className="text-xs uppercase font-bold text-slate-600 block">Số đối tượng:</span>
                        <span className="font-bold text-slate-900 text-sm">{cam.recipientCount} người</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase font-bold text-slate-600 block">Mức tiền mặt:</span>
                        <span className="font-bold text-rose-700 text-sm">{formatVNNumber(cam.cashAmountPerPerson)} đ</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-xs uppercase font-bold text-slate-600 block">Tổng ngân sách:</span>
                        <span className="font-black text-emerald-800 text-sm">{formatVNNumber(cam.totalBudget)} đ</span>
                      </div>
                    </div>

                    {/* Gift Item Description */}
                    {cam.giftDescription && (
                      <div className="text-xs text-slate-700 flex items-start gap-1.5 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                        <Gift size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Hiện vật đính kèm:</strong> {cam.giftDescription}</span>
                      </div>
                    )}

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Thời gian: <strong>{cam.disbursementDate}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span>Địa điểm: {cam.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={13} className="text-slate-400" />
                        <span>Nguồn kinh phí: <strong>{cam.fundingSource}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {cam.status === "Đang đề xuất" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCampaignStatus(cam.id, "Đã duyệt chi")}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Phê duyệt chi
                        </button>
                      )}
                      {cam.status === "Đã duyệt chi" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCampaignStatus(cam.id, "Đang trao tặng")}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Bắt đầu trao tặng
                        </button>
                      )}
                      {cam.status === "Đang trao tặng" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCampaignStatus(cam.id, "Đã hoàn tất")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Hoàn tất đợt
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedCampaign(cam)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Chi tiết danh sách
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="In phiếu ký nhận quà"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: HỖ TRỢ NGAY & CỨU TRỢ KHẨN CẤP                                */}
      {/* ========================================================================= */}
      {activeTab === "emergency" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-black text-amber-950 text-sm sm:text-base">
                  Cơ Chế Hỗ Trợ Ngay & Cứu Trợ Khẩn Cấp
                </h3>
                <p className="text-xs text-amber-900">
                  Xử lý ngay các trường hợp tai nạn đột xuất, viện phí nóng, hỏa hoạn, tang gia khó khăn trong ngày
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEmergencyTargetRecipient(null);
                setEmgRecipientId("");
                setEmgRecipientName("");
                setEmgCccd("");
                setEmgAddress("42/ Lương Định Của, Phường An Phú");
                setEmgReason("Hỗ trợ khẩn cấp đột xuất cho trường hợp khó khăn cấp bách");
                setShowEmergencyModal(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto shrink-0"
            >
              <Zap size={14} /> Chi trả hỗ trợ ngay
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emergencyRecords.map(rec => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-amber-200/90 hover:border-amber-400 p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      {rec.id}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {rec.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base leading-snug">{rec.recipientName}</h4>
                    <span className="text-xs text-slate-600 font-mono">CCCD: {rec.cccd}</span>
                  </div>

                  <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900">Mức chi khẩn cấp:</span>
                    <span className="text-base font-black text-rose-700">{formatVNNumber(rec.amount)} VNĐ</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">Lý do khẩn cấp:</span>
                    <p className="text-xs leading-relaxed text-slate-700">{rec.reason}</p>
                  </div>

                  {rec.giftItems && (
                    <div className="text-xs text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                      <Gift size={13} className="text-amber-700 shrink-0" />
                      <span>Hiện vật: {rec.giftItems}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                    <div>Ngày giải ngân: <strong className="text-slate-800">{rec.disbursedDate}</strong></div>
                    <div>Người duyệt nóng: <strong className="text-slate-800">{rec.approver}</strong></div>
                    <div>Cán bộ chi trả: {rec.disbursedBy}</div>
                    <div>Nguồn kinh phí: {rec.fundingSource}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-emerald-700 font-bold">Đã lưu trữ biên lai</span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                    title="In phiếu chi cứu trợ khẩn cấp"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM ĐỐI TƯỢNG TỪ DANH SÁCH CƯ DÂN KHU PHỐ                      */}
      {/* ========================================================================= */}
      {showAddRecipientModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowAddRecipientModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Heart size={16} className="text-rose-600" /> Thêm Đối Tượng Thụ Hưởng Từ Danh Sách Cư Dân
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRecipientModal(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRecipient} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Resident Selector */}
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                <label className="font-bold text-rose-950 block text-xs">
                  1. Chọn nhanh từ CSDL Dân cư Khu phố 3 ({residents.length} nhân khẩu):
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên cư dân hoặc số CCCD..."
                    value={residentSearchQuery}
                    onChange={e => setResidentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
                <ReportSelect
                  aria-label="Chọn cư dân thụ hưởng"
                  value={selectedResidentCccd}
                  onChange={val => handleSelectResident(val)}
                  options={[
                    { value: "", label: `-- Bấm để chọn cư dân thụ hưởng (${candidateResidents.length} kết quả) --` },
                    ...candidateResidents.map(r => ({
                      value: r.cccd,
                      label: `${r.fullName} - CCCD: ${r.cccd} (${r.address})`
                    }))
                  ]}
                  className="text-xs"
                />
                <p className="text-xs text-slate-600">
                  * Dữ liệu định danh, CCCD, địa chỉ và SĐT sẽ tự động được đồng bộ vào hồ sơ an sinh.
                </p>
              </div>

              {/* Citizen Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên đối tượng *</label>
                  <input
                    type="text"
                    required
                    value={recFullName}
                    onChange={e => setRecFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD / Định danh *</label>
                  <input
                    type="text"
                    required
                    value={recCccd}
                    onChange={e => setRecCccd(e.target.value)}
                    placeholder="079xxxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={recPhone}
                    onChange={e => setRecPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Địa chỉ cư trú *</label>
                  <input
                    type="text"
                    required
                    value={recAddress}
                    onChange={e => setRecAddress(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Sub-Category Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân hệ an sinh con *</label>
                  <ReportSelect
                    aria-label="Phân hệ an sinh con"
                    value={recCategory}
                    onChange={val => handleCategorySelectChange(val)}
                    options={subCategories.map(s => ({
                      value: s.name,
                      label: `${s.name} (${s.code})`
                    }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức hỗ trợ đề xuất *</label>
                  <input
                    type="text"
                    required
                    value={recSupportLevel}
                    onChange={e => setRecSupportLevel(e.target.value)}
                    placeholder="2.500.000đ / tháng"
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold text-rose-700"
                  />
                </div>
              </div>

              {/* Benefits Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  2. Chế độ Chính sách & Quyền lợi được hưởng:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {ALL_STANDARD_BENEFITS.map(ben => {
                    const isChecked = recSelectedBenefits.includes(ben.name);
                    return (
                      <label key={ben.id} className="flex items-start gap-2 cursor-pointer font-medium text-slate-700 text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setRecSelectedBenefits(prev => [...prev, ben.name]);
                            else setRecSelectedBenefits(prev => prev.filter(b => b !== ben.name));
                          }}
                          className="rounded accent-rose-600 mt-0.5"
                        />
                        <span>{ben.name} <strong className="text-xs text-slate-600">({ben.standardValue})</strong></span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hoàn cảnh thực tế & Đề xuất của cơ sở</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ hoàn cảnh gia đình, thương tật, độ tuổi, kết quả bình xét của Tổ dân phố..."
                  value={recNotes}
                  onChange={e => setRecNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddRecipientModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Heart size={14} /> Lưu hồ sơ an sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TỰ TẠO PHÂN HỆ AN SINH CON MỚI                                   */}
      {/* ========================================================================= */}
      {showAddSubCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowAddSubCategoryModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          >
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200">
              <h3 className="font-black text-sm flex items-center gap-2">
                <FolderPlus size={16} className="text-indigo-600" /> Tạo Phân Hệ Con An Sinh Xã Hội Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSubCategoryModal(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubCategory} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên phân hệ con *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Người khuyết tật đặc biệt nặng, Bệnh nhân hiểm nghèo, Thanh niên xung phong..."
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-indigo-950 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã viết tắt</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: NKT, BNHN..."
                    value={newSubCode}
                    onChange={e => setNewSubCode(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Màu nhận diện</label>
                  <ReportSelect
                    aria-label="Màu nhận diện"
                    value={newSubColor}
                    onChange={val => setNewSubColor(val)}
                    options={[
                      { value: "rose", label: "Đỏ hoa hồng (Rose)" },
                      { value: "indigo", label: "Xanh chàm (Indigo)" },
                      { value: "emerald", label: "Xanh lục (Emerald)" },
                      { value: "amber", label: "Vàng hổ phách (Amber)" },
                      { value: "purple", label: "Tím (Purple)" },
                      { value: "cyan", label: "Xanh ngọc (Cyan)" }
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả phân hệ con & Phạm vi</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả nhóm đối tượng và mục tiêu chăm lo hỗ trợ của khu phố..."
                  value={newSubDesc}
                  onChange={e => setNewSubDesc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu chí & Điều kiện xét duyệt</label>
                <textarea
                  rows={2}
                  placeholder="Giấy tờ chứng minh, giấy chứng nhận y tế, biên bản xác nhận của TDP..."
                  value={newSubCriteria}
                  onChange={e => setNewSubCriteria(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              {/* Standard Benefits for this category */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">Chế độ chính sách & Quyền lợi chuẩn:</span>
                <div className="space-y-1">
                  {newSubBenefits.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="truncate">✓ {b}</span>
                      <button
                        type="button"
                        onClick={() => setNewSubBenefits(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Nhập quyền lợi mới (e.g. Cấp xe lăn, hỗ trợ tiền điện...)"
                    value={tempBenefitInput}
                    onChange={e => setTempBenefitInput(e.target.value)}
                    className="flex-1 p-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTempBenefit}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddSubCategoryModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <FolderPlus size={14} /> Lưu phân hệ mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ĐỀ XUẤT ĐỢT HỖ TRỢ / CHIẾN DỊCH TRAO QUÀ                        */}
      {/* ========================================================================= */}
      {showAddCampaignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowAddCampaignModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          >
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Gift size={16} className="text-emerald-600" /> Đề Xuất Đợt Hỗ Trợ & Cấp Phát Tập Trung
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCampaignModal(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề chương trình / Đợt hỗ trợ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đợt trao quà Tết Nguyên Đán 2026, Đợt phát gạo Quý 4..."
                  value={camTitle}
                  onChange={e => setCamTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                />
              </div>

              {/* Target Categories Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Đối tượng thụ hưởng (chọn nhiều phân hệ):</label>
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 max-h-32 overflow-y-auto">
                  {subCategories.map(s => {
                    const isChecked = camCategories.includes(s.name);
                    return (
                      <label key={s.id} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setCamCategories(prev => [...prev, s.name]);
                            else setCamCategories(prev => prev.filter(c => c !== s.name));
                          }}
                          className="rounded accent-emerald-600"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiền mặt mỗi đối tượng (VNĐ) *</label>
                  <input
                    type="number"
                    step={100000}
                    required
                    value={camCashAmount}
                    onChange={e => setCamCashAmount(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày trao quà dự kiến *</label>
                  <input
                    type="date"
                    required
                    value={camDate}
                    onChange={e => setCamDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quà tặng hiện vật kèm theo</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Túi quà nhu yếu phẩm (Gạo ST25, dầu ăn, bánh mứt trị giá 500.000đ)..."
                  value={camGiftDesc}
                  onChange={e => setCamGiftDesc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nguồn kinh phí *</label>
                  <input
                    type="text"
                    required
                    value={camFundingSource}
                    onChange={e => setCamFundingSource(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Địa điểm tổ chức</label>
                  <input
                    type="text"
                    value={camLocation}
                    onChange={e => setCamLocation(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú kế hoạch</label>
                <textarea
                  rows={2}
                  placeholder="Phối hợp các ban ngành, phân công chi đoàn thanh niên hỗ trợ..."
                  value={camNotes}
                  onChange={e => setCamNotes(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddCampaignModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Gift size={14} /> Lưu kế hoạch đợt hỗ trợ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: HỖ TRỢ NGAY & CỨU TRỢ KHẨN CẤP (FAST ACTION)                     */}
      {/* ========================================================================= */}
      {showEmergencyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-amber-300 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          >
            <div className="p-4 bg-amber-50/70 text-slate-900 flex items-center justify-between shrink-0 border-b border-amber-200">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Zap size={17} className="text-amber-700" /> Quyết Định Chi Trả Hỗ Trợ Ngay (Cứu Trợ Khẩn)
              </h3>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-amber-100 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEmergencySupport} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-black block text-xs">CƠ CHẾ DUYỆT NÓNG CƠ SỞ KHU PHỐ 3:</span>
                <p className="text-xs leading-relaxed">
                  Áp dụng cho tai nạn đột xuất, tang tế, hỏa hoạn, bệnh hiểm nghèo cần xuất quỹ hỗ trợ tận tay trong vòng 24h. Khoản chi sẽ tự động ghi nhận vào Quỹ khu phố.
                </p>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đối tượng thụ hưởng *</label>
                  <input
                    type="text"
                    required
                    value={emgRecipientName}
                    onChange={e => setEmgRecipientName(e.target.value)}
                    placeholder="Họ và tên người nhận..."
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={emgCccd}
                    onChange={e => setEmgCccd(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ thường trú / tạm trú</label>
                <input
                  type="text"
                  value={emgAddress}
                  onChange={e => setEmgAddress(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-rose-800 mb-1">Số tiền hỗ trợ khẩn cấp (VNĐ) *</label>
                  <input
                    type="number"
                    step={500000}
                    required
                    value={emgAmount}
                    onChange={e => setEmgAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-rose-300 bg-rose-50/40 font-mono font-black text-rose-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân loại diện chính sách</label>
                  <ReportSelect
                    aria-label="Phân loại diện chính sách"
                    value={emgCategory}
                    onChange={val => setEmgCategory(val)}
                    options={[
                      ...subCategories.map(s => ({ value: s.name, label: s.name })),
                      { value: "Khó khăn đột xuất khác", label: "Khó khăn đột xuất khác" }
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lý do cứu trợ khẩn cấp *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ghi rõ tình huống khẩn cấp (tai nạn, hỏa hoạn, tang tế, phẫu thuật bệnh viện...)"
                  value={emgReason}
                  onChange={e => setEmgReason(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hiện vật cấp bách kèm theo (nếu có)</label>
                <input
                  type="text"
                  placeholder="Gạo, thuốc men, sữa dinh dưỡng, quần áo..."
                  value={emgGiftItems}
                  onChange={e => setEmgGiftItems(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lãnh đạo duyệt nóng *</label>
                  <input
                    type="text"
                    required
                    value={emgApprover}
                    onChange={e => setEmgApprover(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nguồn quỹ chi trả *</label>
                  <input
                    type="text"
                    required
                    value={emgFundingSource}
                    onChange={e => setEmgFundingSource(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Zap size={14} /> Xác nhận chi trả hỗ trợ ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CHI TIẾT HỒ SƠ, CHẾ ĐỘ CHÍNH SÁCH & QUYỀN LỢI ĐỐI TƯỢNG          */}
      {/* ========================================================================= */}
      {selectedRecipient && (() => {
        const navList = filteredRecipients.length > 0 ? filteredRecipients : recipients;
        const currentIdx = navList.findIndex(r => r.id === selectedRecipient.id);
        const totalNav = navList.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;
        const shortId = formatShortRecordId(selectedRecipient.id, "ASXH");
        const bhyt = getBhytInfo(selectedRecipient);

        return (
          <Modal
            isOpen={Boolean(selectedRecipient)}
            onClose={() => setSelectedRecipient(null)}
            size="2xl"
            ariaLabel={`Hồ sơ an sinh ${selectedRecipient.fullName}`}
            headerNavigation={
              totalNav > 1 && currentIdx >= 0
                ? {
                    positionText: `Đối tượng ${currentIdx + 1}/${totalNav}`,
                    hasPrev,
                    hasNext,
                    onPrev: () => hasPrev && setSelectedRecipient(navList[currentIdx - 1]),
                    onNext: () => hasNext && setSelectedRecipient(navList[currentIdx + 1]),
                    prevLabel: "Đối tượng trước",
                    nextLabel: "Đối tượng tiếp theo",
                  }
                : undefined
            }
            headerSlot={
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <Heart size={22} className="fill-rose-500/20 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      MÃ: {shortId}
                    </span>
                    {getSubCategoryBadge(selectedRecipient.category)}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      selectedRecipient.status === "Đang nhận trợ cấp"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : selectedRecipient.status === "Chờ duyệt hồ sơ"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}>
                      {selectedRecipient.status}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {selectedRecipient.fullName}
                  </h3>
                  <p className="text-slate-600 text-xs flex items-center gap-1 font-medium">
                    <MapPin size={12} className="text-rose-600 shrink-0" />
                    <span className="truncate">{selectedRecipient.address}</span>
                  </p>
                </div>
              </div>
            }
            bodyClassName="p-4 sm:p-5 space-y-4 bg-slate-50/60 text-xs"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selectedRecipient.id, "Đang nhận trợ cấp")}
                    className="min-h-9 text-xs font-semibold py-1.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                  >
                    Duyệt chi
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selectedRecipient.id, "Đã tạm ngưng")}
                    className="min-h-9 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Tạm ngưng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEmergencyForRecipient(selectedRecipient);
                      setSelectedRecipient(null);
                    }}
                    className="min-h-9 text-xs font-semibold py-1.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer inline-flex items-center gap-1"
                  >
                    <Zap size={12} /> Hỗ trợ ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-9 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Printer size={13} /> In phiếu
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientToDelete(selectedRecipient)}
                    className="min-h-9 px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(null)}
                    className="min-h-9 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditRecipient(selectedRecipient)}
                    className="min-h-9 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={13} /> Chỉnh sửa hồ sơ
                  </button>
                </div>
              </div>
            }
          >
            {/* Thẻ 1: Thông tin định danh */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-100">
                <User size={15} className="text-rose-600" />
                <span className="text-sm">1. Thông tin Định danh, Bảo trợ & Cư trú</span>
              </div>

              <DetailGrid>
                <DetailRow
                  label="Số CCCD / Định danh"
                  value={selectedRecipient.cccd}
                  isMono
                  copyValue={selectedRecipient.cccd}
                />
                <DetailRow
                  label="Số điện thoại liên hệ"
                  value={selectedRecipient.phone}
                  isMono
                  copyValue={selectedRecipient.phone}
                  href={selectedRecipient.phone ? `tel:${selectedRecipient.phone}` : undefined}
                />
                <DetailRow
                  label="Mức trợ cấp hàng tháng"
                  value={<span className="font-bold text-rose-700">{selectedRecipient.supportLevel}</span>}
                  isNumeric
                />
                <DetailRow
                  label="Bảo hiểm y tế (BHYT)"
                  value={bhyt.label}
                  isMono={Boolean(bhyt.code)}
                  copyValue={bhyt.code || undefined}
                />
                <DetailRow
                  label="Nơi cư trú hiện tại"
                  value={selectedRecipient.address}
                  colSpan={2}
                />
              </DetailGrid>
            </div>

            {/* Thẻ 2: Chế độ Chính sách & Quyền lợi được hưởng */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Gift size={15} className="text-emerald-700" />
                  <span className="text-sm">2. Chế độ Chính sách & Quyền lợi ({selectedRecipient.benefits?.length || 0})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {(selectedRecipient.benefits || []).length === 0 ? (
                  <div className="p-3 text-slate-500 text-center italic bg-slate-50 rounded-lg border border-slate-100">
                    Chưa gắn chế độ chính sách cụ thể nào cho đối tượng.
                  </div>
                ) : (
                  (selectedRecipient.benefits || []).map((ben, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/40 border border-emerald-200/80 text-xs text-slate-800">
                      <span className="font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                        {ben}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefitFromSelected(ben)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Hủy quyền lợi này"
                        aria-label={`Hủy quyền lợi ${ben}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Thêm quyền lợi mới (VD: Cấp thẻ BHYT, học bổng, quà Tết...)"
                  value={newCustomBenefitName}
                  onChange={e => setNewCustomBenefitName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefitToSelected(); } }}
                  className="flex-1 p-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddBenefitToSelected}
                  className="min-h-8 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs cursor-pointer shrink-0"
                >
                  + Thêm quyền lợi
                </button>
              </div>
            </div>

            {/* Thẻ 3: Hoàn cảnh & Ghi chú khảo sát */}
            {selectedRecipient.notes && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck size={14} className="text-slate-700" />
                  <span>3. Ghi chú khảo sát hoàn cảnh</span>
                </div>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedRecipient.notes}
                </p>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 6: CHI TIẾT ĐỢT HỖ TRỢ / DANH SÁCH THỤ HƯỞNG                         */}
      {/* ========================================================================= */}
      {selectedCampaign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedCampaign(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 text-xs"
          >
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Gift size={16} className="text-emerald-600" /> {selectedCampaign.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-900 block">Tổng kinh phí:</span>
                  <span className="font-black text-emerald-800 text-base">{formatVNNumber(selectedCampaign.totalBudget)} đ</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-900 block">Số đối tượng:</span>
                  <span className="font-bold text-slate-900 text-base">{selectedCampaign.recipientCount} người</span>
                </div>
              </div>

              {selectedCampaign.giftDescription && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-950 block mb-0.5">Quà tặng hiện vật:</span>
                  <p className="text-amber-900">{selectedCampaign.giftDescription}</p>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-800 block mb-1">Danh sách đối tượng thụ hưởng dự kiến:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {recipients
                    .filter(r => selectedCampaign.targetCategories.includes(r.category))
                    .map(r => (
                      <div key={r.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{r.fullName}</span>
                          <span className="text-xs text-slate-600 font-mono">CCCD: {r.cccd} • {r.address}</span>
                        </div>
                        <span className="font-mono text-rose-700 font-bold">{formatVNNumber(selectedCampaign.cashAmountPerPerson)} đ</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer size={13} /> In danh sách ký nhận quà
              </button>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(recipientToDelete)}
        onClose={() => setRecipientToDelete(null)}
        onConfirm={() => recipientToDelete && executeDeleteRecipient(recipientToDelete.id)}
        title="Xác nhận xóa đối tượng trợ cấp"
        description={
          recipientToDelete
            ? `Bạn có chắc chắn muốn xóa đối tượng "${recipientToDelete.fullName}" (${recipientToDelete.category}) khỏi danh sách trợ giúp an sinh xã hội không?`
            : ""
        }
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />

      {/* Unused empty subCategory deletion modal fallback */}
      <ConfirmModal
        isOpen={Boolean(subCategoryConfirmToDelete)}
        onClose={() => setSubCategoryConfirmToDelete(null)}
        onConfirm={() => {
          if (!subCategoryConfirmToDelete) return;
          const updated = subCategories.filter(s => s.id !== subCategoryConfirmToDelete.id);
          updateSubCategories(updated);
          showToast(`Đã xóa phân hệ "${subCategoryConfirmToDelete.name}"!`, "info");
          setSubCategoryConfirmToDelete(null);
        }}
        title="Xác nhận xóa phân hệ"
        description={
          subCategoryConfirmToDelete
            ? `Bạn có chắc chắn muốn xóa phân hệ "${subCategoryConfirmToDelete.name}"?`
            : ""
        }
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />

      {/* ========================================================================= */}
      {/* MODAL 7: CHỈNH SỬA THÔNG TIN ĐỐI TƯỢNG THỤ HƯỞNG                          */}
      {/* ========================================================================= */}
      {recipientToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setRecipientToEdit(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 text-xs"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-slate-900">
                    Chỉnh sửa hồ sơ đối tượng thụ hưởng
                  </h3>
                  <p className="text-xs text-slate-600">
                    Mã hồ sơ: <span className="font-mono font-bold text-slate-900">{recipientToEdit.id}</span> • Đối tượng: <span className="font-bold text-indigo-700">{recipientToEdit.fullName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecipientToEdit(null)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEditRecipient} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* 1. Định danh & Cư trú */}
                <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <User size={14} className="text-indigo-600" />
                    <span>1. Thông tin định danh & Cư trú</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Họ và tên đối tượng <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={e => setEditFullName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                        placeholder="Nhập họ và tên..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số CCCD / Định danh cá nhân <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editCccd}
                        onChange={e => setEditCccd(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                        placeholder="Ví dụ: 079..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                        placeholder="Ví dụ: 0912 345 678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Địa chỉ cư trú
                      </label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={e => setEditAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                        placeholder="Địa chỉ tại KP3..."
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Phân hệ & Mức trợ cấp & Trạng thái */}
                <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Heart size={14} className="text-rose-600" />
                    <span>2. Phân loại đối tượng & Mức hỗ trợ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phân hệ an sinh trực thuộc
                      </label>
                      <ReportSelect
                        aria-label="Phân hệ an sinh trực thuộc"
                        value={editCategory}
                        onChange={val => setEditCategory(val)}
                        options={subCategories.map(cat => ({
                          value: cat.name,
                          label: `${cat.name} (${cat.code})`
                        }))}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Trạng thái thụ hưởng
                      </label>
                      <ReportSelect
                        aria-label="Trạng thái thụ hưởng"
                        value={editStatus}
                        onChange={val => setEditStatus(val as WelfareRecipient["status"])}
                        options={[
                          { value: "Đang nhận trợ cấp", label: "Đang nhận trợ cấp" },
                          { value: "Chờ duyệt hồ sơ", label: "Chờ duyệt hồ sơ" },
                          { value: "Đã tạm ngưng", label: "Đã tạm ngưng" }
                        ]}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mức trợ cấp hàng tháng
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editSupportLevel}
                        onChange={e => setEditSupportLevel(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                        placeholder="Ví dụ: 2.500.000đ / tháng"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-slate-600 font-medium">Gợi ý nhanh:</span>
                        {["1.000.000đ / tháng", "1.200.000đ / tháng", "1.500.000đ / tháng", "2.000.000đ / tháng", "2.500.000đ / tháng", "3.000.000đ / tháng"].map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setEditSupportLevel(lvl)}
                            className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${editSupportLevel === lvl
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Chế độ chính sách & Quyền lợi */}
                <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Gift size={14} className="text-emerald-600" />
                      <span>3. Chế độ chính sách & Quyền lợi ({editBenefits.length})</span>
                    </div>
                    <span className="text-xs text-slate-600">Tùy biến theo từng hồ sơ</span>
                  </div>

                  <div className="space-y-1.5">
                    {editBenefits.length === 0 ? (
                      <p className="text-xs text-slate-600 italic py-2 text-center bg-white rounded-lg border border-dashed border-slate-200">
                        Chưa có chế độ quyền lợi nào. Hãy nhập thêm bên dưới.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                        {editBenefits.map((ben, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200 group"
                          >
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            <span>{ben}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBenefitFromEdit(ben)}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-emerald-700 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Bỏ quyền lợi này"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={editTempBenefitInput}
                        onChange={e => setEditTempBenefitInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBenefitToEdit();
                          }
                        }}
                        placeholder="Thêm quyền lợi mới (e.g. Quà Tết, Hỗ trợ học bổng...)..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddBenefitToEdit}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0 transition-colors"
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Ghi chú khảo sát */}
                <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <FileCheck size={14} className="text-indigo-600" />
                    <span>4. Ghi chú thẩm tra hoàn cảnh</span>
                  </div>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Ghi chú hoàn cảnh gia đình, điều kiện sinh hoạt, nhu cầu trợ cấp..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setRecipientToEdit(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check size={14} />
                  <span>Lưu thay đổi hồ sơ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CHỈNH SỬA PHÂN HỆ AN SINH XÃ HỘI CON                            */}
      {/* ========================================================================= */}
      {subCategoryToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSubCategoryToEdit(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 text-xs"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <FolderPlus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-slate-900">
                    Chỉnh sửa phân hệ an sinh con
                  </h3>
                  <p className="text-xs text-slate-600">
                    Mã phân hệ: <span className="font-mono font-bold text-slate-900">{subCategoryToEdit.code}</span> • Đang có <span className="font-bold text-indigo-700">{recipients.filter(r => r.category === subCategoryToEdit.name).length}</span> đối tượng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubCategoryToEdit(null)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditSubCategory} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên phân hệ an sinh <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editSubName}
                      onChange={e => setEditSubName(e.target.value)}
                      placeholder="Ví dụ: Nạn nhân chất độc da cam..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã ký hiệu
                    </label>
                    <input
                      type="text"
                      value={editSubCode}
                      onChange={e => setEditSubCode(e.target.value.toUpperCase())}
                      placeholder="Ví dụ: DCD, TB, ..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Màu sắc nhận diện
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "rose", label: "Đỏ hồng", bg: "bg-rose-500" },
                      { key: "amber", label: "Hổ phách", bg: "bg-amber-500" },
                      { key: "emerald", label: "Ngọc bích", bg: "bg-emerald-500" },
                      { key: "sky", label: "Xanh da trời", bg: "bg-sky-500" },
                      { key: "indigo", label: "Chàm", bg: "bg-indigo-500" },
                      { key: "purple", label: "Tím", bg: "bg-purple-500" },
                      { key: "teal", label: "Mòng két", bg: "bg-teal-500" },
                    ].map(c => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setEditSubColor(c.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-all ${editSubColor === c.key
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`}></span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả phân hệ
                  </label>
                  <textarea
                    rows={2}
                    value={editSubDesc}
                    onChange={e => setEditSubDesc(e.target.value)}
                    placeholder="Mô tả nhóm đối tượng và mục đích bảo trợ..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu chí xét duyệt hồ sơ
                  </label>
                  <textarea
                    rows={2}
                    value={editSubCriteria}
                    onChange={e => setEditSubCriteria(e.target.value)}
                    placeholder="Căn cứ pháp lý, điều kiện thu nhập, tình trạng sức khỏe..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Danh mục chính sách & quyền lợi chuẩn ({editSubBenefits.length})
                    </label>
                    <span className="text-xs text-slate-600">Áp dụng mặc định khi thêm đối tượng mới</span>
                  </div>

                  <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {editSubBenefits.map((ben, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-900 border border-indigo-200"
                        >
                          <CheckCircle2 size={12} className="text-indigo-600 shrink-0" />
                          <span>{ben}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBenefitFromEditSub(ben)}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-indigo-600 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={editSubTempBenefit}
                        onChange={e => setEditSubTempBenefit(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBenefitToEditSub();
                          }
                        }}
                        placeholder="Thêm quyền lợi chuẩn mới..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddBenefitToEditSub}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0 transition-colors"
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setSubCategoryToEdit(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check size={14} />
                  <span>Lưu phân hệ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: XÁC NHẬN XÓA PHÂN HỆ AN SINH VÀ CHUYỂN GIAO ĐỐI TƯỢNG             */}
      {/* ========================================================================= */}
      {subCategoryToDelete && (() => {
        const affectedCount = recipients.filter(r => r.category === subCategoryToDelete.name).length;
        const otherCategories = subCategories.filter(s => s.id !== subCategoryToDelete.id);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setSubCategoryToDelete(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 text-xs p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Xác nhận xóa phân hệ an sinh
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Phân hệ: <strong className="text-slate-900">{subCategoryToDelete.name}</strong> ({subCategoryToDelete.code})
                  </p>
                </div>
              </div>

              {affectedCount > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                      <span>Cảnh báo: Đang có {affectedCount} đối tượng thuộc phân hệ này!</span>
                    </div>
                    <p className="leading-relaxed text-xs">
                      Để không làm mất dữ liệu an sinh xã hội của người dân, toàn bộ {affectedCount} đối tượng sẽ được tự động chuyển sang phân hệ bạn chỉ định dưới đây:
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chọn phân hệ tiếp nhận chuyển giao <span className="text-rose-500">*</span>
                    </label>
                    <ReportSelect
                      aria-label="Chọn phân hệ tiếp nhận chuyển giao"
                      value={reassignCategoryTarget}
                      onChange={val => setReassignCategoryTarget(val)}
                      options={otherCategories.map(c => ({
                        value: c.name,
                        label: `${c.name} (${c.code})`
                      }))}
                      className="text-xs"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 leading-relaxed text-xs">
                  Phân hệ này hiện chưa có đối tượng thụ hưởng nào. Bạn có chắc chắn muốn xóa vĩnh viễn phân hệ <strong className="text-slate-900">"{subCategoryToDelete.name}"</strong> không? Hành động này không thể hoàn tác.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubCategoryToDelete(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteSubCategory(subCategoryToDelete, affectedCount > 0 ? reassignCategoryTarget : undefined)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 size={13} />
                  <span>{affectedCount > 0 ? "Chuyển giao & Xóa" : "Xác nhận xóa"}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
