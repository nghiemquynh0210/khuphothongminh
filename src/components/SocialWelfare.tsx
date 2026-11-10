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
  WelfareBenefit
} from "../types";
import Pagination from "./Pagination";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
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
  onDeleteRecipient: (id: string) => void;
  residents?: Resident[];
}

export default function SocialWelfare({
  recipients,
  onUpdateStatus,
  onAddRecipient,
  onDeleteRecipient,
  residents = []
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
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const itemsPerPage = 8;

  // Modals
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<WelfareRecipient | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<WelfareCampaign | null>(null);
  const [recipientToDelete, setRecipientToDelete] = useState<WelfareRecipient | null>(null);
  const [emergencyTargetRecipient, setEmergencyTargetRecipient] = useState<WelfareRecipient | null>(null);

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
    if (confirm(`Bạn có chắc chắn muốn xóa phân hệ "${target.name}"?`)) {
      const updated = subCategories.filter(s => s.id !== subId);
      updateSubCategories(updated);
      showToast(`Đã xóa phân hệ "${target.name}"!`, "info");
    }
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
    setShowEmergencyModal(false);
    showToast(`⚡ ĐÃ CHI TRẢ HỖ TRỢ NGAY ${formatVNNumber(emgAmount)} VNĐ cho ${emgRecipientName}!`, "success");
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
    } catch {}
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
    } catch {}
  };

  // Execute Recipient Deletion
  const executeDeleteRecipient = (id: string) => {
    onDeleteRecipient(id);
    showToast("Đã xóa đối tượng khỏi danh sách trợ cấp thành công!", "info");
    setRecipientToDelete(null);
    if (selectedRecipient?.id === id) setSelectedRecipient(null);
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

      return matchSearch && matchCategory && matchStatus;
    });
  }, [recipients, searchTerm, selectedCategoryPill, statusFilter]);

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
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colorClasses[color] || colorClasses.rose}`}>
        <Tag size={10} />
        {catName}
      </span>
    );
  };

  return (
    <div id="social-welfare-view" className="space-y-6">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-5 right-5 z-70 max-w-md bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-top-4 duration-200 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
            <Heart size={16} className="animate-pulse" />
          </div>
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-bold block text-rose-300 mb-0.5">HỆ THỐNG AN SINH XÃ HỘI KP3</span>
            {toast.message}
          </div>
          <button onClick={() => setToast(null)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header with Main Sub-tab Navigation & Action Controls */}
      <PageHeader
        badgeIcon={<Heart size={13} className="text-rose-600 fill-rose-500/20" />}
        badgeText="CHÍNH SÁCH BẢO TRỢ & AN SINH CỘNG ĐỒNG • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="NGHỊ ĐỊNH 20/2021/NĐ-CP & ĐỀ ÁN AN SINH"
        title="An Sinh Xã Hội, Chăm Lo Chính Sách & Cứu Trợ Cộng Đồng"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Action Buttons */}
            <button
              id="btn-add-welfare-recipient"
              onClick={() => {
                setShowAddRecipientModal(true);
                handleCategorySelectChange("Người có công");
              }}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Thêm đối tượng thụ hưởng
            </button>

            <button
              id="btn-add-submodule"
              onClick={() => setShowAddSubCategoryModal(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              <FolderPlus size={14} className="text-indigo-600" /> Tạo phân hệ con mới
            </button>

            <button
              id="btn-add-campaign"
              onClick={() => setShowAddCampaignModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Gift size={14} /> Lập đợt hỗ trợ
            </button>

            <button
              id="btn-emergency-support"
              onClick={() => {
                setEmergencyTargetRecipient(null);
                setEmgRecipientId("");
                setEmgRecipientName("");
                setEmgCccd("");
                setEmgAddress("42/ Lương Định Của, Phường An Phú");
                setEmgReason("Hỗ trợ khẩn cấp đột xuất cho trường hợp khó khăn cấp bách");
                setShowEmergencyModal(true);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all animate-pulse"
            >
              <Zap size={14} /> Hỗ trợ ngay ⚡
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
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab("recipients")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "recipients"
              ? "bg-white text-rose-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Users size={14} className={activeTab === "recipients" ? "text-rose-600" : "text-slate-400"} />
          <span>Danh Sách Đối Tượng Thụ Hưởng ({recipients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("submodules")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "submodules"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <FolderPlus size={14} className={activeTab === "submodules" ? "text-indigo-600" : "text-slate-400"} />
          <span>Phân Hệ Con & Chế Độ Chính Sách ({subCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "campaigns"
              ? "bg-white text-emerald-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Gift size={14} className={activeTab === "campaigns" ? "text-emerald-600" : "text-slate-400"} />
          <span>Đợt Hỗ Trợ & Cấp Phát Tập Trung ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("emergency")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "emergency"
              ? "bg-white text-amber-800 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Zap size={14} className={activeTab === "emergency" ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
          <span>Hỗ Trợ Ngay & Cứu Trợ Khẩn Cấp ({emergencyRecords.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DANH SÁCH ĐỐI TƯỢNG THỤ HƯỞNG                                 */}
      {/* ========================================================================= */}
      {activeTab === "recipients" && (
        <div className="space-y-4">
          {/* Sub-Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => { setSelectedCategoryPill("all"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                selectedCategoryPill === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Tất cả phân hệ ({recipients.length})
            </button>
            {subCategories.map(sub => {
              const count = recipients.filter(r => r.category === sub.name).length;
              return (
                <button
                  key={sub.id}
                  onClick={() => { setSelectedCategoryPill(sub.name); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                    selectedCategoryPill === sub.name
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50"
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategoryPill === sub.name ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search, Status Filter & View Mode Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50/60 focus:outline-none focus:border-rose-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Đang nhận trợ cấp">Đang nhận trợ cấp</option>
                  <option value="Chờ duyệt hồ sơ">Chờ duyệt hồ sơ</option>
                  <option value="Đã tạm ngưng">Đã tạm ngưng</option>
                </select>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100 gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "card" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
                  title="Xem dạng Lưới Thẻ"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
                  title="Xem dạng Bảng Danh sách"
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
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-400">
                  Không tìm thấy thông tin đối tượng chính sách phù hợp bộ lọc.
                </div>
              ) : (
                paginatedRecipients.map(rec => {
                  const statusColors: Record<string, string> = {
                    "Đang nhận trợ cấp": "bg-emerald-50 text-emerald-800 border-emerald-200",
                    "Chờ duyệt hồ sơ": "bg-amber-50 text-amber-800 border-amber-200",
                    "Đã tạm ngưng": "bg-slate-100 text-slate-600 border-slate-200"
                  };
                  return (
                    <div
                      key={rec.id}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-rose-300 p-4 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1.5">
                          {getSubCategoryBadge(rec.category)}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[rec.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                            {rec.status}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-rose-700 transition-colors line-clamp-1">
                          {rec.fullName}
                        </h3>

                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{rec.address}</span>
                        </div>

                        {/* Active Benefits Chips */}
                        {rec.benefits && rec.benefits.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {rec.benefits.slice(0, 2).map((b, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded truncate max-w-[180px]" title={b}>
                                ✓ {b}
                              </span>
                            ))}
                            {rec.benefits.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-bold self-center">
                                +{rec.benefits.length - 2} chế độ
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-slate-500 text-[11px]">CCCD: {rec.cccd.substring(0, 6)}***</span>
                          <span className="font-black text-rose-700 text-xs">{rec.supportLevel}</span>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRecipient(rec)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 cursor-pointer transition-colors"
                          >
                            <Eye size={13} /> Hồ sơ & Quyền lợi
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEmergencyForRecipient(rec)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Hỗ trợ khẩn cấp ngay cho đối tượng này"
                          >
                            <Zap size={12} className="text-amber-600" /> Hỗ trợ ngay
                          </button>
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
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Mã & Đối tượng thụ hưởng</th>
                      <th className="py-3 px-4">Số CCCD & Liên hệ</th>
                      <th className="py-3 px-4">Phân hệ an sinh</th>
                      <th className="py-3 px-4">Địa chỉ cư trú</th>
                      <th className="py-3 px-4">Mức trợ cấp</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecipients.map(rec => (
                      <tr key={rec.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{rec.fullName}</div>
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
                        <td className="py-3.5 px-4">{getSubCategoryBadge(rec.category)}</td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600 truncate max-w-[200px] flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span>{rec.address}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-rose-700 text-xs">{rec.supportLevel}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedRecipient(rec)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 cursor-pointer"
                              title="Xem chi tiết hồ sơ & quyền lợi"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEmergencyForRecipient(rec)}
                              className="p-1 text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Hỗ trợ ngay"
                            >
                              <Zap size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecipientToDelete(rec)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Xóa đối tượng"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
      {/* SUB-TAB 2: PHÂN HỆ CON & CHẾ ĐỘ CHÍNH SÁCH QUYỀN LỢI                     */}
      {/* ========================================================================= */}
      {activeTab === "submodules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Danh Mục Phân Hệ An Sinh Con & Chế Độ Chính Sách
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý các nhóm đối tượng bảo trợ đặc thù (người có công, hộ nghèo, người cao tuổi...) và chuẩn hóa quyền lợi theo quy định
              </p>
            </div>
            <button
              onClick={() => setShowAddSubCategoryModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
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
                          <span className="text-[10px] text-slate-400 font-mono">
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
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tiêu chí xét duyệt:</span>
                      <p className="text-slate-700 text-[11px] leading-relaxed line-clamp-2">{sub.criteria}</p>
                    </div>

                    {/* Standard Benefits */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Chế độ & Quyền lợi chuẩn ({sub.standardBenefits?.length || 0}):</span>
                      <ul className="space-y-1">
                        {(sub.standardBenefits || []).slice(0, 3).map((ben, i) => (
                          <li key={i} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{ben}</span>
                          </li>
                        ))}
                        {(sub.standardBenefits?.length || 0) > 3 && (
                          <li className="text-[10px] text-indigo-700 font-semibold pl-4">
                            +{(sub.standardBenefits?.length || 0) - 3} chế độ chính sách khác...
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryPill(sub.name);
                        setActiveTab("recipients");
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      Xem {count} đối tượng ➜
                    </button>

                    {sub.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSubCategory(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Xóa phân hệ tự tạo"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
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
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Kế Hoạch & Các Đợt Trao Quà Hỗ Trợ Định Kỳ
              </h3>
              <p className="text-xs text-slate-500">
                Tổ chức các đợt phát quà Tết, học bổng khuyến học, gạo cứu trợ định kỳ theo từng diện chính sách
              </p>
            </div>
            <button
              onClick={() => setShowAddCampaignModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
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
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadges[cam.status] || "bg-slate-100 text-slate-700"}`}>
                        {cam.status}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base leading-snug">
                      {cam.title}
                    </h4>

                    {/* Target Categories */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold">Đối tượng thụ hưởng:</span>
                      {cam.targetCategories.map((c, i) => (
                        <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Số đối tượng:</span>
                        <span className="font-bold text-slate-900 text-sm">{cam.recipientCount} người</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mức tiền mặt:</span>
                        <span className="font-bold text-rose-700 text-sm">{formatVNNumber(cam.cashAmountPerPerson)} đ</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng ngân sách:</span>
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
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-rose-50 p-4 rounded-2xl border border-amber-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Zap size={22} className="animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-amber-950 text-sm sm:text-base">
                  Cơ Chế Hỗ Trợ Ngay & Cứu Trợ Khẩn Cấp
                </h3>
                <p className="text-xs text-amber-800">
                  Xử lý ngay các trường hợp tai nạn đột xuất, viện phí nóng, hỏa hoạn, tang gia khó khăn trong ngày
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setEmergencyTargetRecipient(null);
                setEmgRecipientId("");
                setEmgRecipientName("");
                setEmgCccd("");
                setEmgAddress("42/ Lương Định Của, Phường An Phú");
                setEmgReason("Hỗ trợ khẩn cấp đột xuất cho trường hợp khó khăn cấp bách");
                setShowEmergencyModal(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
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
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={11} /> {rec.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base leading-snug">{rec.recipientName}</h4>
                    <span className="text-xs text-slate-500 font-mono">CCCD: {rec.cccd}</span>
                  </div>

                  <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900">Mức chi khẩn cấp:</span>
                    <span className="text-base font-black text-rose-700">{formatVNNumber(rec.amount)} VNĐ</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">Lý do khẩn cấp:</span>
                    <p className="text-[11px] leading-relaxed text-slate-600">{rec.reason}</p>
                  </div>

                  {rec.giftItems && (
                    <div className="text-[11px] text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                      <Gift size={13} className="text-amber-600 shrink-0" />
                      <span>Hiện vật: {rec.giftItems}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                    <div>Ngày giải ngân: <strong className="text-slate-800">{rec.disbursedDate}</strong></div>
                    <div>Người duyệt nóng: <strong className="text-slate-800">{rec.approver}</strong></div>
                    <div>Cán bộ chi trả: {rec.disbursedBy}</div>
                    <div>Nguồn kinh phí: {rec.fundingSource}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-bold">Đã lưu trữ biên lai</span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
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
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Heart size={16} className="text-rose-400" /> Thêm Đối Tượng Thụ Hưởng Từ Danh Sách Cư Dân
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRecipientModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
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
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên cư dân hoặc số CCCD..."
                    value={residentSearchQuery}
                    onChange={e => setResidentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
                <select
                  value={selectedResidentCccd}
                  onChange={e => handleSelectResident(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 text-xs"
                >
                  <option value="">-- Bấm để chọn cư dân thụ hưởng ({candidateResidents.length} kết quả) --</option>
                  {candidateResidents.map(r => (
                    <option key={r.cccd} value={r.cccd}>
                      {r.fullName} - CCCD: {r.cccd} ({r.address})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
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
                  <select
                    value={recCategory}
                    onChange={e => handleCategorySelectChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-rose-900"
                  >
                    {subCategories.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
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
                        <span>{ben.name} <strong className="text-[10px] text-slate-400">({ben.standardValue})</strong></span>
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
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <FolderPlus size={16} className="text-indigo-400" /> Tạo Phân Hệ Con An Sinh Xã Hội Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSubCategoryModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
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
                  <select
                    value={newSubColor}
                    onChange={e => setNewSubColor(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="rose">Đỏ hoa hồng (Rose)</option>
                    <option value="indigo">Xanh chàm (Indigo)</option>
                    <option value="emerald">Xanh lục (Emerald)</option>
                    <option value="amber">Vàng hổ phách (Amber)</option>
                    <option value="purple">Tím (Purple)</option>
                    <option value="cyan">Xanh ngọc (Cyan)</option>
                  </select>
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
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Gift size={16} className="text-emerald-400" /> Đề Xuất Đợt Hỗ Trợ & Cấp Phát Tập Trung
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCampaignModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
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
            <div className="p-4 bg-gradient-to-r from-amber-600 via-rose-600 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-amber-400/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Zap size={18} className="text-amber-300 animate-bounce" /> Quyết Định Chi Trả Hỗ Trợ Ngay (Cứu Trợ Khẩn)
              </h3>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEmergencySupport} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-black block text-xs">⚡ CƠ CHẾ DUYỆT NÓNG CƠ SỞ KHU PHỐ 3:</span>
                <p className="text-[11px] leading-relaxed">
                  Áp dụng cho tai nạn đột xuất, tang tế, hỏa hoạn, bệnh hiểm nghèo cần xuất quỹ hỗ trợ tận tay trong vòng 24h.
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
                  <select
                    value={emgCategory}
                    onChange={e => setEmgCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    {subCategories.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="Khó khăn đột xuất khác">Khó khăn đột xuất khác</option>
                  </select>
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 font-black text-white shadow-xs cursor-pointer flex items-center gap-1.5"
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
      {selectedRecipient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedRecipient(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Header */}
            <div className="bg-gradient-to-b from-slate-50 via-white to-rose-50/30 px-5 pt-6 pb-5 text-slate-800 relative text-center border-b border-slate-200 shrink-0">
              <button
                onClick={() => setSelectedRecipient(null)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-2xs mb-2">
                <Heart size={26} className="fill-rose-500/20 text-rose-600" />
              </div>

              <h3 className="text-lg font-black text-slate-900 leading-snug">
                {selectedRecipient.fullName}
              </h3>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                  {selectedRecipient.id}
                </span>
                {getSubCategoryBadge(selectedRecipient.category)}
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                  {selectedRecipient.status}
                </span>
              </div>

              <p className="text-slate-500 text-xs mt-2 flex items-center justify-center gap-1 font-medium">
                <MapPin size={12} className="text-rose-500 shrink-0" />
                <span className="truncate max-w-xs">{selectedRecipient.address}</span>
              </p>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/60 text-xs">
              {/* Thẻ 1: Thông tin định danh */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
                  <User size={14} className="text-rose-600" />
                  <span>1. Thông tin Định danh & Cư trú</span>
                </div>
                <DetailGrid>
                  <DetailRow label="Số CCCD" value={selectedRecipient.cccd} isMono />
                  <DetailRow label="Số điện thoại" value={selectedRecipient.phone || "Chưa cập nhật"} isMono />
                  <DetailRow label="Mức trợ cấp hàng tháng" value={<span className="font-black text-rose-700 text-sm">{selectedRecipient.supportLevel}</span>} />
                  <DetailRow label="Nơi cư trú" value={selectedRecipient.address} colSpan={2} />
                </DetailGrid>
              </div>

              {/* Thẻ 2: Chế độ Chính sách & Quyền lợi được hưởng */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Gift size={14} className="text-emerald-600" />
                    <span>2. Chế độ Chính sách & Quyền lợi ({selectedRecipient.benefits?.length || 0})</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {(selectedRecipient.benefits || []).length === 0 ? (
                    <div className="p-3 text-slate-400 text-center italic bg-slate-50 rounded-lg">
                      Chưa gắn chế độ chính sách cụ thể nào cho đối tượng.
                    </div>
                  ) : (
                    (selectedRecipient.benefits || []).map((ben, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/40 border border-emerald-200/80 text-xs text-slate-800">
                        <span className="font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          {ben}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefitFromSelected(ben)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Hủy quyền lợi này"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Form to add custom benefit to this recipient */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Thêm quyền lợi mới (e.g. Cấp máy may, học bổng, quà Tết...)"
                    value={newCustomBenefitName}
                    onChange={e => setNewCustomBenefitName(e.target.value)}
                    className="flex-1 p-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefitToSelected}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0"
                  >
                    + Thêm quyền lợi
                  </button>
                </div>
              </div>

              {/* Thẻ 3: Hoàn cảnh & Ghi chú khảo sát */}
              {selectedRecipient.notes && (
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck size={14} className="text-indigo-600" />
                    <span>3. Ghi chú khảo sát hoàn cảnh</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedRecipient.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(selectedRecipient.id, "Đang nhận trợ cấp")}
                  className="text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Duyệt chi
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(selectedRecipient.id, "Đã tạm ngưng")}
                  className="text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  Tạm ngưng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEmergencyForRecipient(selectedRecipient);
                    setSelectedRecipient(null);
                  }}
                  className="text-xs font-bold py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white cursor-pointer flex items-center gap-1"
                >
                  <Zap size={12} /> Hỗ trợ ngay
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} /> In phiếu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Gift size={16} className="text-emerald-400" /> {selectedCampaign.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-900 block">Tổng kinh phí:</span>
                  <span className="font-black text-emerald-800 text-base">{formatVNNumber(selectedCampaign.totalBudget)} đ</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-900 block">Số đối tượng:</span>
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
                          <span className="text-[10px] text-slate-400 font-mono">CCCD: {r.cccd} • {r.address}</span>
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Printer size={13} /> In danh sách ký nhận quà
              </button>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Deletion Confirmation Dialog */}
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
