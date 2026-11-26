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
  Tag,
  FileSpreadsheet,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { MobileSubpageShell } from "./mobile/MobileSubpageShell";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { KP3_AREA_LIST, extractKp3Area, formatShortRecordId } from "../utils/kp3Utils";
import { loadWelfareRecord, saveWelfareRecord } from "../utils/supabaseSync";
import { formatVNNumber } from "../utils/numberFormat";
import { getResidentDetailPath, navigate } from "../routes";
import { getStoredAssociations } from "../data/associationsData";
import { extractKeyLeadersSummary } from "../utils/leadershipSync";
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

  // Synced recipients cache so batch demographic sync persists even if parent callback updates single items
  const [syncedExtraRecipients, setSyncedExtraRecipients] = useState<WelfareRecipient[]>(() => {
    try {
      const cached = localStorage.getItem("kp3_welfare_synced_extra_v1");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Save changes to localStorage & Supabase
  const updateSubCategories = (updated: WelfareSubCategory[]) => {
    setSubCategories(updated);
    saveStoredSubCategories(updated);
    saveWelfareRecord("subcategories", updated);
  };

  const updateCampaigns = (updated: WelfareCampaign[]) => {
    setCampaigns(updated);
    saveStoredCampaigns(updated);
    saveWelfareRecord("campaigns", updated);
  };

  const updateEmergencyRecords = (updated: EmergencySupportRecord[]) => {
    setEmergencyRecords(updated);
    saveStoredEmergencyRecords(updated);
    saveWelfareRecord("emergency", updated);
  };

  useEffect(() => {
    let active = true;
    loadWelfareRecord<WelfareSubCategory[]>("subcategories").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setSubCategories(rows);
        saveStoredSubCategories(rows);
      }
    });
    loadWelfareRecord<WelfareCampaign[]>("campaigns").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setCampaigns(rows);
        saveStoredCampaigns(rows);
      }
    });
    loadWelfareRecord<EmergencySupportRecord[]>("emergency").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setEmergencyRecords(rows);
        saveStoredEmergencyRecords(rows);
      }
    });
    loadWelfareRecord<WelfareRecipient[]>("recipients").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setSyncedExtraRecipients(rows);
        try {
          localStorage.setItem("kp3_welfare_synced_extra_v1", JSON.stringify(rows));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Deduplicated effective recipients list combining parent props + synced cache
  const effectiveRecipients = useMemo(() => {
    const merged: WelfareRecipient[] = [];
    const seenIds = new Set<string>();
    const seenCccds = new Set<string>();

    const pushUnique = (rec: WelfareRecipient) => {
      if (!rec) return;
      const cleanId = (rec.id || "").trim();
      const cleanCccd = (rec.cccd || "").trim();
      if (cleanId && seenIds.has(cleanId)) return;
      if (cleanCccd && seenCccds.has(cleanCccd)) return;
      if (cleanId) seenIds.add(cleanId);
      if (cleanCccd) seenCccds.add(cleanCccd);
      merged.push(rec);
    };

    recipients.forEach(pushUnique);
    syncedExtraRecipients.forEach(pushUnique);
    return merged;
  }, [recipients, syncedExtraRecipients]);

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

  const parseResidentBirthYear = (rawDate?: string): number | null => {
    if (!rawDate) return null;
    const match = String(rawDate).match(/\b(19\d{2}|20\d{2})\b/);
    if (!match) return null;
    const yr = Number(match[1]);
    return yr >= 1900 && yr <= new Date().getFullYear() ? yr : null;
  };

  const getRecipientBirthYearLabel = (rec: WelfareRecipient): string => {
    const directYr = parseResidentBirthYear(rec.birthDate);
    if (directYr) return String(directYr);
    const matched = residentByCccd.get((rec.cccd || "").trim());
    const resYr = parseResidentBirthYear(matched?.birthDate);
    if (resYr) return String(resYr);
    return rec.birthDate || matched?.birthDate || "—";
  };

  // Real-time Demographic & Policy Reconciliation from CSDL Dân cư (residents)
  const residentWelfareStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const existingCccds = new Set(
      effectiveRecipients.map(r => (r.cccd || "").trim()).filter(Boolean)
    );
    const seenSyncCccds = new Set<string>();

    let seniors60Total = 0;
    let seniors70Plus = 0;
    let seniors80Plus = 0;
    let seniors90Plus = 0;
    let longevityMilestoneCount = 0;
    let childrenUnder14 = 0;
    let policyCount = 0;

    const unsyncedCandidates: Array<{
      resident: Resident;
      age: number | null;
      reasonTag: "senior90" | "senior80" | "longevity" | "policy";
    }> = [];

    const policyRegex = /thương binh|liệt sĩ|bệnh binh|người có công|mẹ việt nam|chất độc da cam|gia đình chính sách|hộ nghèo|cận nghèo|khuyết tật|bảo trợ xã hội|mồ côi|neo đơn/i;

    residents.forEach((res) => {
      const cccd = (res.cccd || "").trim();
      const birthYr = parseResidentBirthYear(res.birthDate);
      const age = birthYr !== null ? currentYear - birthYr : null;

      const metaText = [
        (res as any).notes,
        (res as any).policyCategory,
        (res as any).managementStatus,
        res.occupation
      ]
        .filter(Boolean)
        .join(" ");
      const isPolicyResident = policyRegex.test(metaText);
      if (isPolicyResident) {
        policyCount += 1;
      }

      if (age !== null) {
        if (age >= 0 && age < 14) {
          childrenUnder14 += 1;
        }
        if (age >= 60) {
          seniors60Total += 1;
          if (age >= 70) seniors70Plus += 1;
          if (age >= 80) seniors80Plus += 1;
          if (age >= 90) seniors90Plus += 1;
          if (age === 70 || age === 75 || age === 80 || age === 85 || age === 90 || age === 95 || age >= 100) {
            longevityMilestoneCount += 1;
          }
        }
      }

      // Candidate for 1-click Welfare Sync: Age >= 80, Longevity Milestone (70, 75, 80, 85, 90+), or Policy Household
      const isLongevityMilestone =
        age !== null && (age === 70 || age === 75 || age === 80 || age === 85 || age === 90 || age === 95 || age >= 100);
      const isSenior80 = age !== null && age >= 80;

      if ((isSenior80 || isLongevityMilestone || isPolicyResident) && cccd && !existingCccds.has(cccd) && !seenSyncCccds.has(cccd)) {
        seenSyncCccds.add(cccd);
        unsyncedCandidates.push({
          resident: res,
          age,
          reasonTag:
            age !== null && age >= 90
              ? "senior90"
              : isSenior80
                ? "senior80"
                : isLongevityMilestone
                  ? "longevity"
                  : "policy"
        });
      }
    });

    const existingPolicyRecs = effectiveRecipients.filter(r =>
      /người có công|chính sách|hộ nghèo|cận nghèo/i.test(r.category)
    ).length;

    return {
      currentYear,
      seniors60Total,
      seniors70Plus,
      seniors80Plus,
      seniors90Plus,
      longevityMilestoneCount,
      childrenUnder14,
      policyTotalCount: Math.max(policyCount, existingPolicyRecs),
      unsyncedCandidates
    };
  }, [residents, effectiveRecipients]);

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

    const cleanCccd = recCccd.trim();
    if (effectiveRecipients.some(r => (r.cccd || "").trim() === cleanCccd)) {
      showToast(`Đối tượng có số CCCD ${cleanCccd} đã tồn tại trong danh sách thụ hưởng!`, "error");
      return;
    }

    const sub = subCategories.find(s => s.name === recCategory);
    const newId = "WF" + (effectiveRecipients.length + 1).toString().padStart(3, "0");

    const newRec: WelfareRecipient = {
      id: newId,
      fullName: recFullName.trim(),
      category: recCategory,
      subCategoryId: sub?.id,
      address: recAddress.trim(),
      cccd: cleanCccd,
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

  // 1-Click Sync Seniors (>=80t / Longevity) & Policy Households from Real Residents DB
  const handleSyncResidentsToWelfare = () => {
    if (residents.length === 0) {
      showToast("Đang tải dữ liệu CSDL Dân cư, vui lòng thử lại sau giây lát.", "info");
      return;
    }
    const candidates = residentWelfareStats.unsyncedCandidates;
    if (candidates.length === 0) {
      showToast("Toàn bộ đối tượng Người cao tuổi (≥80t / Mừng thọ) & Chính sách đã được đồng bộ đầy đủ (không trùng CCCD)!", "info");
      return;
    }

    const seniorSub =
      subCategories.find(s => /cao tuổi/i.test(s.name)) ||
      subCategories[0];
    const policySub =
      subCategories.find(s => /người có công|chính sách/i.test(s.name)) ||
      subCategories[0];
    const poorSub =
      subCategories.find(s => /hộ nghèo|cận nghèo/i.test(s.name)) ||
      policySub;

    const todayStr = new Date().toISOString().split("T")[0];
    const baseIdx = effectiveRecipients.length;
    const newlyCreated: WelfareRecipient[] = [];

    candidates.forEach((item, idx) => {
      const { resident, age, reasonTag } = item;
      const metaLower = [
        (resident as any).notes,
        (resident as any).policyCategory,
        (resident as any).managementStatus
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let targetSub = seniorSub;
      let supportLevel = "1.000.000đ / tháng";
      let benefits: string[] = [
        "Trợ cấp xã hội Người cao tuổi hằng tháng (NĐ 20/2021/NĐ-CP)",
        "Cấp thẻ BHYT miễn phí 100%",
        "Chúc thọ, mừng thọ dịp Lễ / Tết Nguyên Đán"
      ];
      let noteDetail = "";

      if (reasonTag === "senior90") {
        supportLevel = "1.500.000đ / tháng";
        noteDetail = `Cao niên đại thọ ${age} tuổi — đồng bộ từ CSDL Dân cư KP3.`;
      } else if (reasonTag === "senior80") {
        supportLevel = "1.000.000đ / tháng";
        noteDetail = `Người cao tuổi ${age} tuổi (≥80t) hưởng trợ cấp bảo trợ xã hội & BHYT — đồng bộ từ CSDL Dân cư KP3.`;
      } else if (reasonTag === "longevity") {
        supportLevel = "1.000.000đ / đợt mừng thọ";
        benefits = [
          `Chúc thọ, mừng thọ tuổi ${age} năm ${residentWelfareStats.currentYear} (Luật Người cao tuổi)`,
          "Thăm hỏi, tặng quà Tết Người cao tuổi Khu phố 3"
        ];
        noteDetail = `Đến tuổi mừng thọ tròn ${age} tuổi năm ${residentWelfareStats.currentYear} — đồng bộ từ CSDL Dân cư KP3.`;
      } else {
        const isPoor = /nghèo|cận nghèo|khó khăn/i.test(metaLower);
        targetSub = isPoor ? poorSub : policySub;
        supportLevel = isPoor ? "1.200.000đ / tháng" : "2.500.000đ / tháng";
        benefits = targetSub?.standardBenefits?.length
          ? [...targetSub.standardBenefits]
          : ["Trợ cấp ưu đãi chính sách hằng tháng", "Cấp thẻ BHYT miễn phí 100%"];
        noteDetail = `Hồ sơ diện chính sách đối soát từ CSDL Dân cư KP3.`;
      }

      const rec: WelfareRecipient = {
        id: `WF-${String(baseIdx + idx + 1).padStart(3, "0")}`,
        fullName: resident.fullName.trim(),
        category: targetSub?.name || "Người cao tuổi neo đơn",
        subCategoryId: targetSub?.id,
        address: (resident.currentAddress || resident.address || "Khu phố 3, Phường An Phú").trim(),
        cccd: resident.cccd.trim(),
        phone: resident.phone && resident.phone !== "N/A" ? resident.phone.trim() : undefined,
        supportLevel,
        status: "Đang nhận trợ cấp",
        notes: noteDetail,
        benefits,
        gender: resident.gender || undefined,
        birthDate: resident.birthDate || undefined,
        householdId: resident.householdId || undefined,
        joinedDate: todayStr,
        disbursedTotal: 0
      };

      newlyCreated.push(rec);
    });

    const nextSyncedCache = [...newlyCreated, ...syncedExtraRecipients];
    const combinedAll = [...newlyCreated, ...effectiveRecipients];
    setSyncedExtraRecipients(nextSyncedCache);
    try {
      localStorage.setItem("kp3_welfare_synced_extra_v1", JSON.stringify(nextSyncedCache));
      localStorage.setItem(
        "kp3_welfare_recipients",
        JSON.stringify(combinedAll)
      );
    } catch {}
    saveWelfareRecord("recipients", combinedAll);
    newlyCreated.forEach((rec) => onAddRecipient(rec));

    showToast(
      `Đã đồng bộ ${newlyCreated.length} đối tượng Người cao tuổi (≥80t / Mừng thọ) & Chính sách từ CSDL Dân cư (đã khử trùng CCCD)!`,
      "success"
    );
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
      criteria: newSubCriteria.trim() || "Theo biên bản thẩm tra hoàn cảnh gia đình của Ban Điều hành Khu phố 3",
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
    if (effectiveRecipients.some(r => r.category === target.name)) {
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

  const getCampaignTargetRecipients = (cam: WelfareCampaign): WelfareRecipient[] => {
    if (Array.isArray(cam.recipientIds) && cam.recipientIds.length > 0) {
      const idSet = new Set(cam.recipientIds);
      const byIds = effectiveRecipients.filter(r => idSet.has(r.id));
      if (byIds.length > 0) return byIds;
    }
    return effectiveRecipients.filter(r => cam.targetCategories.includes(r.category));
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!camTitle.trim()) {
      showToast("Vui lòng nhập tên chương trình / đợt hỗ trợ!", "error");
      return;
    }
    if (camCategories.length === 0) {
      showToast("Vui lòng chọn ít nhất 01 phân hệ đối tượng thụ hưởng!", "error");
      return;
    }

    // Match real recipients from selected categories (never fabricate fake targetCount = 10)
    const matchingRecs = effectiveRecipients.filter(r => camCategories.includes(r.category));
    if (matchingRecs.length === 0) {
      showToast(
        "Phân hệ đã chọn hiện có 0 đối tượng thụ hưởng. Vui lòng bấm \"Đồng bộ Người cao tuổi & Chính sách từ CSDL Dân cư\" hoặc thêm đối tượng trước khi lập đợt!",
        "error"
      );
      return;
    }
    const recipientIds = matchingRecs.map(r => r.id);
    const count = matchingRecs.length;
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
    showToast(`Đã lập đề xuất đợt hỗ trợ "${newCampaign.title}" (${count} đối tượng thực tế) thành công!`, "success");

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
  const liveWelfareLeaders = useMemo(
    () => extractKeyLeadersSummary(getStoredAssociations()),
    [recipients.length]
  );
  const defaultEmgApprover = `${liveWelfareLeaders.neighborhoodHead.name} (${liveWelfareLeaders.neighborhoodHead.role})`;
  const defaultEmgDisburser = liveWelfareLeaders.neighborhoodDeputy
    ? `${liveWelfareLeaders.neighborhoodDeputy.name} (${liveWelfareLeaders.neighborhoodDeputy.role})`
    : liveWelfareLeaders.frontHead
    ? `${liveWelfareLeaders.frontHead.name} (${liveWelfareLeaders.frontHead.role})`
    : `${liveWelfareLeaders.partySecretary.name} (Bí thư Chi bộ)`;

  const [emgRecipientId, setEmgRecipientId] = useState("");
  const [emgRecipientName, setEmgRecipientName] = useState("");
  const [emgCccd, setEmgCccd] = useState("");
  const [emgAddress, setEmgAddress] = useState("");
  const [emgCategory, setEmgCategory] = useState("Hộ nghèo/Cận nghèo");
  const [emgAmount, setEmgAmount] = useState<number>(3000000);
  const [emgGiftItems, setEmgGiftItems] = useState("Túi thuốc men khẩn cấp + 25kg Gạo");
  const [emgReason, setEmgReason] = useState("");
  const [emgApprover, setEmgApprover] = useState(() => defaultEmgApprover);
  const [emgDisbursedBy, setEmgDisbursedBy] = useState(() => defaultEmgDisburser);
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
  const [campaignSearchQuery, setCampaignSearchQuery] = useState("");
  const [campaignModalMemberSearch, setCampaignModalMemberSearch] = useState("");
  const [emergencySearchQuery, setEmergencySearchQuery] = useState("");
  const handleAddBenefitToSelected = () => {
    if (!selectedRecipient || !newCustomBenefitName.trim()) return;
    const currentBenefits = selectedRecipient.benefits || [];
    if (currentBenefits.includes(newCustomBenefitName.trim())) return;
    const updatedBenefits = [...currentBenefits, newCustomBenefitName.trim()];
    const updatedRec = { ...selectedRecipient, benefits: updatedBenefits };
    setSelectedRecipient(updatedRec);

    // Update in recipients list
    const updatedList = effectiveRecipients.map(r => r.id === selectedRecipient.id ? updatedRec : r);
    const nextExtra = syncedExtraRecipients.map(r => r.id === selectedRecipient.id ? updatedRec : r);
    setSyncedExtraRecipients(nextExtra);
    saveWelfareRecord("recipients", updatedList);
    try {
      localStorage.setItem("kp3_welfare_synced_extra_v1", JSON.stringify(nextExtra));
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
    const updatedList = effectiveRecipients.map(r => r.id === selectedRecipient.id ? updatedRec : r);
    const nextExtra = syncedExtraRecipients.map(r => r.id === selectedRecipient.id ? updatedRec : r);
    setSyncedExtraRecipients(nextExtra);
    saveWelfareRecord("recipients", updatedList);
    try {
      localStorage.setItem("kp3_welfare_synced_extra_v1", JSON.stringify(nextExtra));
      localStorage.setItem("kp3_welfare_recipients", JSON.stringify(updatedList));
    } catch { }
    if (onUpdateRecipient) onUpdateRecipient(updatedRec);
  };

  // Execute Recipient Deletion
  const executeDeleteRecipient = (id: string) => {
    const nextExtra = syncedExtraRecipients.filter(r => r.id !== id);
    const remainingAll = effectiveRecipients.filter(r => r.id !== id);
    if (nextExtra.length !== syncedExtraRecipients.length) {
      setSyncedExtraRecipients(nextExtra);
      try {
        localStorage.setItem("kp3_welfare_synced_extra_v1", JSON.stringify(nextExtra));
      } catch {}
    }
    saveWelfareRecord("recipients", remainingAll);
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

    const nextExtra = syncedExtraRecipients.map(r => r.id === updated.id ? updated : r);
    const nextAll = effectiveRecipients.map(r => r.id === updated.id ? updated : r);
    setSyncedExtraRecipients(nextExtra);
    saveWelfareRecord("recipients", nextAll);
    try {
      localStorage.setItem("kp3_welfare_synced_extra_v1", JSON.stringify(nextExtra));
    } catch {}

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
      effectiveRecipients.forEach(r => {
        if (r.category === oldName) {
          const updatedRec = { ...r, category: newName };
          if (onUpdateRecipient) onUpdateRecipient(updatedRec);
        }
      });
      const nextExtra = syncedExtraRecipients.map(r => r.category === oldName ? { ...r, category: newName } : r);
      const nextAll = effectiveRecipients.map(r => r.category === oldName ? { ...r, category: newName } : r);
      setSyncedExtraRecipients(nextExtra);
      saveWelfareRecord("recipients", nextAll);
      if (selectedRecipient && selectedRecipient.category === oldName) {
        setSelectedRecipient({ ...selectedRecipient, category: newName });
      }
    }

    setSubCategoryToEdit(null);
    showToast(`Đã cập nhật phân hệ "${newName}" thành công!`, "success");
  };

  const handleConfirmDeleteSubCategory = (sub: WelfareSubCategory, reassignTarget?: string) => {
    const affectedRecipients = effectiveRecipients.filter(r => r.category === sub.name);
    if (affectedRecipients.length > 0) {
      if (!reassignTarget) {
        showToast(`Vui lòng chọn phân hệ mới để chuyển ${affectedRecipients.length} đối tượng!`, "error");
        return;
      }
      affectedRecipients.forEach(r => {
        const updatedRec = { ...r, category: reassignTarget };
        if (onUpdateRecipient) onUpdateRecipient(updatedRec);
      });
      const nextExtra = syncedExtraRecipients.map(r => r.category === sub.name ? { ...r, category: reassignTarget } : r);
      const nextAll = effectiveRecipients.map(r => r.category === sub.name ? { ...r, category: reassignTarget } : r);
      setSyncedExtraRecipients(nextExtra);
      saveWelfareRecord("recipients", nextAll);
      showToast(`Đã chuyển giao ${affectedRecipients.length} đối tượng sang phân hệ "${reassignTarget}".`, "info");
    }

    const updated = subCategories.filter(s => s.id !== sub.id);
    updateSubCategories(updated);
    setSubCategoryToDelete(null);
    showToast(`Đã xóa phân hệ an sinh "${sub.name}" thành công!`, "success");
  };

  // Export Sign-sheet Excel (.xlsx)
  const handleExportSignSheetXlsx = (
    list: WelfareRecipient[],
    options: {
      title: string;
      amountOverride?: string;
      filenamePrefix?: string;
    }
  ) => {
    if (list.length === 0) {
      showToast("Danh sách hiện đang trống, chưa có đối tượng để xuất Excel!", "error");
      return;
    }

    const rows = list.map((rec, idx) => ({
      "STT": idx + 1,
      "Họ và tên": rec.fullName,
      "Năm sinh": getRecipientBirthYearLabel(rec),
      "Số CCCD": rec.cccd || "",
      "Địa chỉ": rec.address || "",
      "Diện chính sách": rec.category || "",
      "Mức quà/tiền": options.amountOverride || rec.supportLevel || "",
      "Ký và ghi rõ họ tên": ""
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 11 },
      { wch: 16 },
      { wch: 36 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DS_KyNhan_KP3");
    const dateTag = new Date().toISOString().slice(0, 10);
    const safePrefix = (options.filenamePrefix || "DS_KyNhan_AnSinh_KP3")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${safePrefix}_${dateTag}.xlsx`);
    showToast(`Đã xuất tệp Excel danh sách ký nhận (${list.length} đối tượng)!`, "success");
  };

  // Print A4 Sign-sheet (Quốc hiệu – Tiêu ngữ chuẩn hành chính)
  const handlePrintSignSheetA4 = (
    list: WelfareRecipient[],
    options: {
      title: string;
      subtitle?: string;
      amountOverride?: string;
      totalSummary?: string;
    }
  ) => {
    if (list.length === 0) {
      showToast("Danh sách hiện đang trống, chưa có đối tượng để in!", "error");
      return;
    }

    const printWin = window.open("", "_blank", "width=1050,height=820");
    if (!printWin) {
      showToast("Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép mở tab in!", "error");
      return;
    }

    const escapeHtml = (val: string) =>
      String(val || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const now = new Date();
    const dayStr = String(now.getDate()).padStart(2, "0");
    const monthStr = String(now.getMonth() + 1).padStart(2, "0");
    const yearStr = String(now.getFullYear());

    const tableRowsHtml = list
      .map(
        (rec, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold;">${escapeHtml(rec.fullName)}</td>
          <td style="text-align:center;">${escapeHtml(getRecipientBirthYearLabel(rec))}</td>
          <td style="text-align:center;font-family:'Courier New',monospace;">${escapeHtml(rec.cccd)}</td>
          <td>${escapeHtml(rec.address)}</td>
          <td style="text-align:right;font-weight:bold;">${escapeHtml(options.amountOverride || rec.supportLevel)}</td>
          <td style="height:42px;"></td>
        </tr>`
      )
      .join("");

    const htmlDoc = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 12mm 15mm 18mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12.5pt;
      color: #000;
      margin: 0;
      padding: 0;
      line-height: 1.35;
    }
    .gov-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .gov-org, .gov-motto {
      text-align: center;
    }
    .gov-org .upper { font-size: 11.5pt; text-transform: uppercase; }
    .gov-org .bold { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; }
    .gov-motto .country { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
    .gov-motto .motto { font-size: 12.5pt; font-weight: bold; }
    .underline-bar {
      width: 130px;
      border-bottom: 1px solid #000;
      margin: 3px auto 0;
    }
    .doc-title {
      text-align: center;
      margin: 14px 0 12px;
    }
    .doc-title h1 {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 4px;
    }
    .doc-title p {
      font-size: 12pt;
      font-style: italic;
      margin: 2px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5pt;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px 6px;
      vertical-align: middle;
    }
    th {
      background: #f8fafc;
      font-weight: bold;
      text-align: center;
    }
    tr { page-break-inside: avoid; }
    .summary-line {
      margin-top: 10px;
      font-size: 12pt;
      font-weight: bold;
    }
    .date-line {
      text-align: right;
      font-style: italic;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      text-align: center;
      margin-top: 8px;
      page-break-inside: avoid;
    }
    .sig-role { font-weight: bold; text-transform: uppercase; font-size: 11.5pt; }
    .sig-sub { font-style: italic; font-size: 11pt; }
    .sig-name { margin-top: 64px; font-weight: bold; font-size: 12pt; }
  </style>
</head>
<body>
  <div class="gov-header">
    <div class="gov-org">
      <div class="upper">UBND PHƯỜNG AN PHÚ</div>
      <div class="bold">BAN ĐIỀU HÀNH KHU PHỐ 3</div>
      <div class="underline-bar" style="width:90px;"></div>
    </div>
    <div class="gov-motto">
      <div class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
      <div class="underline-bar" style="width:160px;"></div>
    </div>
  </div>

  <div class="doc-title">
    <h1>${escapeHtml(options.title)}</h1>
    ${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : `<p>Địa bàn: Khu phố 3, Phường An Phú, Thành phố Hồ Chí Minh</p>`}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:38px;">STT</th>
        <th style="width:145px;">Họ và tên</th>
        <th style="width:65px;">Năm sinh</th>
        <th style="width:105px;">Số CCCD</th>
        <th>Địa chỉ</th>
        <th style="width:115px;">Mức quà/tiền</th>
        <th style="width:125px;">Ký và ghi rõ họ tên</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="summary-line">
    Danh sách ấn định gồm: ${list.length} người thụ hưởng.${options.totalSummary ? ` ${escapeHtml(options.totalSummary)}` : ""}
  </div>

  <div class="date-line">
    An Phú, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}
  </div>

  <div class="signatures">
    <div>
      <div class="sig-role">NGƯỜI LẬP BIỂU</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-name">&nbsp;</div>
    </div>
    <div>
      <div class="sig-role">TRƯỞNG KHU PHỐ 3</div>
      <div class="sig-sub">(Ký, xác nhận)</div>
      <div class="sig-name">${escapeHtml(liveWelfareLeaders.neighborhoodHead.name)}</div>
    </div>
    <div>
      <div class="sig-role">BÍ THƯ CHI BỘ KP3</div>
      <div class="sig-sub">(Ký, phê duyệt)</div>
      <div class="sig-name">${escapeHtml(liveWelfareLeaders.partySecretary.name)}</div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.focus(); window.print(); }, 250);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(htmlDoc);
    printWin.document.close();
  };

  // Filter Recipients
  const filteredRecipients = useMemo(() => {
    return effectiveRecipients.filter(r => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        r.fullName.toLowerCase().includes(q) ||
        r.cccd.includes(q) ||
        r.address.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q));

      const matchCategory = selectedCategoryPill === "all" || r.category === selectedCategoryPill;
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const areaLabel = extractKp3Area(r.address);
      const matchTo = toFilter === "all" || areaLabel === toFilter;

      return matchSearch && matchCategory && matchStatus && matchTo;
    });
  }, [effectiveRecipients, searchTerm, selectedCategoryPill, statusFilter, toFilter]);

  // Pagination
  const totalItems = filteredRecipients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedRecipients = filteredRecipients.slice(startIndex, startIndex + itemsPerPage);

  // Overall KPI Metrics
  const kpiData = useMemo(() => {
    const totalRecs = effectiveRecipients.length;
    const activeRecs = effectiveRecipients.filter(r => r.status === "Đang nhận trợ cấp").length;
    const pendingRecs = effectiveRecipients.filter(r => r.status === "Chờ duyệt hồ sơ").length;
    const totalCampaigns = campaigns.length;
    const totalEmergency = emergencyRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalRecs,
      activeRecs,
      pendingRecs,
      totalCampaigns,
      totalEmergency
    };
  }, [effectiveRecipients, campaigns, emergencyRecords]);

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
    <div id="social-welfare-view" className="space-y-4">
      {/* Inline Notification Bar */}
      <InlineNotice
        message={toast?.message ?? null}
        type={toast?.type ?? "info"}
        onDismiss={() => setToast(null)}
      />

      {/* MOBILE NATIVE RED BRONZE-DRUM APP BAR & SUB-TABS */}
      <MobileSubpageShell
        title="An sinh & Chính sách"
        subtitle={`${kpiData.totalRecs} đối tượng • ${kpiData.totalCampaigns} đợt chăm lo`}
        primaryActionLabel="Thêm"
        onPrimaryAction={() => {
          if (activeTab === "submodules") setShowAddSubCategoryModal(true);
          else if (activeTab === "campaigns") setShowAddCampaignModal(true);
          else if (activeTab === "emergency") setShowEmergencyModal(true);
          else {
            setShowAddRecipientModal(true);
            handleCategorySelectChange("Người có công");
          }
        }}
        subTabs={[
          { id: "recipients", label: `Đối tượng (${effectiveRecipients.length})` },
          { id: "submodules", label: `Nhóm (${subCategories.length})` },
          { id: "campaigns", label: `Trao quà (${kpiData.totalCampaigns})` },
          { id: "emergency", label: "Khẩn cấp" },
        ]}
        activeSubTab={activeTab}
        onSubTabChange={(t) => setActiveTab(t as any)}
        sheetTitle="Công cụ An sinh Xã hội"
        sheetActions={[
          {
            id: "sync_seniors",
            label: "Đối soát tự động Người cao tuổi từ CSDL Dân cư",
            description: `${formatVNNumber(residentWelfareStats.seniors60Total)} cụ ≥60t • ${formatVNNumber(residentWelfareStats.longevityMilestoneCount)} cụ mừng thọ`,
            icon: <RefreshCw size={18} className="text-emerald-700" />,
            tone: "emerald",
            onClick: handleSyncResidentsToWelfare,
          },
          {
            id: "emergency_pay",
            label: "Chi hỗ trợ khẩn cấp đột xuất",
            description: "Ghi nhận hồ sơ chăm lo trường hợp khó khăn cấp bách",
            icon: <Zap size={18} className="text-amber-600" />,
            tone: "amber",
            onClick: () => setShowEmergencyModal(true),
          },
        ]}
      />

      {/* Desktop Minimalist Page Header */}
      <div className="hidden md:block">
      <PageHeader
        title="An sinh Xã hội & Chính sách"
        description="Quản lý đối tượng người có công, bảo trợ xã hội, mừng thọ người cao tuổi và các đợt chăm lo trên địa bàn"
        actions={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-sync-senior-policy-residents"
              type="button"
              onClick={handleSyncResidentsToWelfare}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              title={`Đối soát tự động CSDL Dân cư (${formatVNNumber(residentWelfareStats.seniors60Total)} người cao tuổi ≥60t, ${formatVNNumber(residentWelfareStats.longevityMilestoneCount)} cụ mừng thọ)`}
            >
              <RefreshCw size={13} className="text-slate-500 shrink-0" />
              <span>
                Đồng bộ Dân cư
                {residentWelfareStats.unsyncedCandidates.length > 0
                  ? ` (+${residentWelfareStats.unsyncedCandidates.length})`
                  : ""}
              </span>
            </button>

            {activeTab !== "emergency" && (
              <button
                id="btn-emergency-support"
                type="button"
                onClick={() => {
                  setEmergencyTargetRecipient(null);
                  setEmgRecipientId("");
                  setEmgRecipientName("");
                  setEmgCccd("");
                  setEmgAddress("42/ Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh");
                  setEmgReason("Hỗ trợ khẩn cấp đột xuất cho trường hợp khó khăn cấp bách");
                  setShowEmergencyModal(true);
                }}
                className="flex items-center gap-1.5 h-9 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 px-3 rounded-lg font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Zap size={13} className="text-amber-600" /> Hỗ trợ khẩn cấp
              </button>
            )}

            {activeTab === "submodules" ? (
              <button
                type="button"
                onClick={() => setShowAddSubCategoryModal(true)}
                className="flex items-center gap-1.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus size={14} /> Tạo phân hệ
              </button>
            ) : activeTab === "campaigns" ? (
              <button
                type="button"
                onClick={() => setShowAddCampaignModal(true)}
                className="flex items-center gap-1.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus size={14} /> Lập đợt trao quà
              </button>
            ) : activeTab === "emergency" ? (
              <button
                id="btn-emergency-support"
                type="button"
                onClick={() => {
                  setEmergencyTargetRecipient(null);
                  setEmgRecipientId("");
                  setEmgRecipientName("");
                  setEmgCccd("");
                  setEmgAddress("42/ Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh");
                  setEmgReason("Hỗ trợ khẩn cấp đột xuất cho trường hợp khó khăn cấp bách");
                  setShowEmergencyModal(true);
                }}
                className="flex items-center gap-1.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Zap size={13} /> Chi trả khẩn cấp
              </button>
            ) : (
              <button
                id="btn-add-welfare-recipient"
                type="button"
                onClick={() => {
                  setShowAddRecipientModal(true);
                  handleCategorySelectChange("Người có công");
                }}
                className="flex items-center gap-1.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus size={14} /> Thêm đối tượng
              </button>
            )}
          </div>
        }
      />
      </div>

      {/* 4 StatCards (Desktop only) */}
      <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatCard
          label="Đối tượng thụ hưởng"
          value={kpiData.totalRecs}
          badge={`${kpiData.activeRecs} đang hưởng`}
          highlighted={activeTab === "recipients"}
          icon={Heart}
          color="emerald"
          onClick={() => setActiveTab("recipients")}
        />
        <StatCard
          label="Phân hệ chính sách"
          value={subCategories.length}
          badge="nhóm"
          highlighted={activeTab === "submodules"}
          icon={Tag}
          color="slate"
          onClick={() => setActiveTab("submodules")}
        />
        <StatCard
          label="Đợt hỗ trợ & Trao quà"
          value={kpiData.totalCampaigns}
          badge="chương trình"
          highlighted={activeTab === "campaigns"}
          icon={Gift}
          color="slate"
          onClick={() => setActiveTab("campaigns")}
        />
        <StatCard
          label="Cứu trợ khẩn cấp đã chi"
          value={formatVNNumber(kpiData.totalEmergency)}
          badge="VNĐ"
          highlighted={activeTab === "emergency"}
          icon={Zap}
          color="amber"
          onClick={() => setActiveTab("emergency")}
        />
      </div>

      {/* Compact Sub-tab Navigation & Senior Summary Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="hidden md:flex items-center overflow-x-auto whitespace-nowrap max-w-full gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 w-fit no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("recipients")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "recipients"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={13} className={activeTab === "recipients" ? "text-emerald-700" : "text-slate-500"} />
            <span>Đối tượng thụ hưởng ({effectiveRecipients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("submodules")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "submodules"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderPlus size={13} className={activeTab === "submodules" ? "text-emerald-700" : "text-slate-500"} />
            <span>Phân hệ ({subCategories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("campaigns")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "campaigns"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gift size={13} className={activeTab === "campaigns" ? "text-emerald-700" : "text-slate-500"} />
            <span>Đợt trao quà ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("emergency")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "emergency"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Zap size={13} className={activeTab === "emergency" ? "text-amber-600" : "text-slate-500"} />
            <span>Khẩn cấp ({emergencyRecords.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Cao tuổi ≥60t: <strong className="text-slate-800 font-mono">{formatVNNumber(residentWelfareStats.seniors60Total)}</strong></span>
          <span>•</span>
          <span>Mừng thọ {residentWelfareStats.currentYear}: <strong className="text-slate-800 font-mono">{formatVNNumber(residentWelfareStats.longevityMilestoneCount)} cụ</strong></span>
          <span>•</span>
          <span>Trẻ em &lt;14t: <strong className="text-slate-800 font-mono">{formatVNNumber(residentWelfareStats.childrenUnder14)}</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DANH SÁCH ĐỐI TƯỢNG THỤ HƯỞNG                                 */}
      {/* ========================================================================= */}
      {activeTab === "recipients" && (
        <div className="space-y-3.5">
          {/* Unified Minimalist Search, Filter & Export Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  id="social-welfare-search"
                  type="text"
                  placeholder="Tìm theo họ tên, số CCCD, địa chỉ, số điện thoại..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full h-9 pl-9 pr-4 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-slate-50/70 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="min-w-[145px] flex-1 sm:flex-none">
                  <ReportSelect
                    aria-label="Lọc theo tuyến đường / khu vực KP3"
                    value={toFilter}
                    onChange={val => { setToFilter(val); setCurrentPage(1); }}
                    options={[
                      { value: "all", label: "Toàn địa bàn KP3" },
                      ...KP3_AREA_LIST.map(area => ({ value: area, label: area }))
                    ]}
                    className="text-xs"
                  />
                </div>

                <div className="min-w-[160px] flex-1 sm:flex-none">
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

                {/* Compact Sign-sheet Export & A4 Print */}
                <button
                  type="button"
                  onClick={() =>
                    handleExportSignSheetXlsx(filteredRecipients, {
                      title: "Danh sách ký nhận tiền / quà an sinh Khu phố 3",
                      filenamePrefix:
                        selectedCategoryPill === "all"
                          ? "DS_KyNhan_AnSinh_KP3"
                          : `DS_KyNhan_${selectedCategoryPill}`
                    })
                  }
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  title="Xuất danh sách ký nhận tiền/quà ra tệp Excel (.xlsx)"
                >
                  <FileSpreadsheet size={13} className="text-emerald-700 shrink-0" />
                  <span>Xuất ký nhận</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handlePrintSignSheetA4(filteredRecipients, {
                      title:
                        selectedCategoryPill === "all"
                          ? "DANH SÁCH KÝ NHẬN TIỀN / QUÀ HỖ TRỢ AN SINH XÃ HỘI"
                          : `DANH SÁCH KÝ NHẬN TIỀN / QUÀ — ${selectedCategoryPill.toUpperCase()}`,
                      subtitle: `Địa bàn: Khu phố 3, Phường An Phú, TP. Hồ Chí Minh • Phân hệ: ${
                        selectedCategoryPill === "all" ? "Toàn bộ đối tượng" : selectedCategoryPill
                      }`
                    })
                  }
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  title="In danh sách ký nhận tiền/quà khổ A4 chuẩn Quốc hiệu – Tiêu ngữ"
                >
                  <Printer size={13} className="text-slate-500 shrink-0" />
                  <span>In A4</span>
                </button>

                {/* View mode toggle */}
                <div className="flex items-center border border-slate-200/80 rounded-lg p-0.5 bg-slate-100/80 gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("card")}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "card" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
                    title="Xem dạng Lưới Thẻ"
                    aria-label="Xem dạng Lưới Thẻ"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
                    title="Xem dạng Bảng Danh sách"
                    aria-label="Xem dạng Bảng Danh sách"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Integrated Category Filter Pills */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1 mr-1">
                <Tag size={12} /> Nhóm chính sách:
              </span>
              <button
                type="button"
                onClick={() => { setSelectedCategoryPill("all"); setCurrentPage(1); }}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${selectedCategoryPill === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                Tất cả ({effectiveRecipients.length})
              </button>
              {subCategories.map(sub => {
                const count = effectiveRecipients.filter(r => r.category === sub.name).length;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => { setSelectedCategoryPill(sub.name); setCurrentPage(1); }}
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border inline-flex items-center gap-1.5 ${selectedCategoryPill === sub.name
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <span>{sub.name}</span>
                    <span className={`text-[11px] font-mono ${selectedCategoryPill === sub.name ? "text-slate-300" : "text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid or Table View */}
          {viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {paginatedRecipients.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mx-auto">
                    <Heart size={18} />
                  </div>
                  {effectiveRecipients.length === 0 ? (
                    <>
                      <div className="text-xs sm:text-[13px] font-bold text-slate-900">
                        Chưa có hồ sơ đối tượng chính sách nào được khởi tạo
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {residents.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSyncResidentsToWelfare}
                            className="h-9 inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
                          >
                            <RefreshCw size={13} /> Đồng bộ từ CSDL Dân cư ({residentWelfareStats.unsyncedCandidates.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddRecipientModal(true);
                            handleCategorySelectChange("Người có công");
                          }}
                          className="h-9 inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
                        >
                          <Plus size={13} /> Thêm đối tượng thủ công
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs sm:text-[13px] font-bold text-slate-900">
                        Không tìm thấy đối tượng phù hợp bộ lọc
                      </div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc đặt lại bộ lọc phân hệ / trạng thái trợ cấp.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategoryPill("all");
                          setToFilter("all");
                          setStatusFilter("all");
                          setCurrentPage(1);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Đặt lại bộ lọc
                      </button>
                    </>
                  )}
                </div>
              ) : (
                paginatedRecipients.map(rec => {
                  const statusColors: Record<string, string> = {
                    "Đang nhận trợ cấp": "bg-emerald-50 text-emerald-800 border-emerald-200",
                    "Chờ duyệt hồ sơ": "bg-amber-50 text-amber-800 border-amber-200",
                    "Đã tạm ngưng": "bg-slate-100 text-slate-700 border-slate-200"
                  };
                  const bhyt = getBhytInfo(rec);
                  const areaLabel = extractKp3Area(rec.address);
                  return (
                    <div
                      key={rec.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem chi tiết hồ sơ an sinh ${rec.fullName}`}
                      onClick={() => setSelectedRecipient(rec)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedRecipient(rec);
                        }
                      }}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 p-4 transition-colors flex flex-col justify-between space-y-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap justify-between items-start gap-1.5">
                          {getSubCategoryBadge(rec.category)}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColors[rec.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {rec.status}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-xs sm:text-[13px] group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {rec.fullName}
                        </h3>

                        <div className="text-xs text-slate-600 flex items-center gap-1.5 min-w-0">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{rec.address}</span>
                          {areaLabel && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[11px]">
                              {areaLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${bhyt.hasBhyt
                              ? "bg-emerald-50/70 text-emerald-800 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                          >
                            {bhyt.label}
                          </span>
                          <span className="font-bold text-emerald-700 text-xs">{rec.supportLevel}</span>
                        </div>

                        {/* Active Benefits Chips */}
                        {rec.benefits && rec.benefits.length > 0 && (
                          <div className="pt-0.5 flex flex-wrap gap-1">
                            {rec.benefits.slice(0, 2).map((b, idx) => (
                              <span key={idx} className="text-[11px] bg-slate-50 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded truncate max-w-[180px]" title={b}>
                                ✓ {b}
                              </span>
                            ))}
                            {rec.benefits.length > 2 && (
                              <span className="text-[11px] text-slate-500 font-semibold self-center">
                                +{rec.benefits.length - 2} chế độ
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-mono text-slate-500 text-xs">
                          CCCD: {rec.cccd.substring(0, 6)}***
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEmergencyForRecipient(rec)}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                            title="Hỗ trợ khẩn cấp ngay cho đối tượng này"
                          >
                            <Zap size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditRecipient(rec)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecipientToDelete(rec)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Xóa đối tượng"
                          >
                            <Trash2 size={13} />
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
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
                      <th className="py-2.5 px-3.5 min-w-[215px] whitespace-nowrap">Mã &amp; Đối tượng</th>
                      <th className="py-2.5 px-3.5 min-w-[200px] whitespace-nowrap">CCCD &amp; Liên hệ</th>
                      <th className="py-2.5 px-3.5 min-w-[210px] whitespace-nowrap">Phân hệ &amp; BHYT</th>
                      <th className="py-2.5 px-3.5 min-w-[215px] whitespace-nowrap">Địa chỉ cư trú</th>
                      <th className="py-2.5 px-3.5 min-w-[140px] whitespace-nowrap">Trợ cấp</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[145px] whitespace-nowrap">Trạng thái</th>
                      <th className="py-2.5 px-3.5 text-right min-w-[130px] whitespace-nowrap sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.06)]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecipients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-slate-600">
                          {effectiveRecipients.length === 0
                            ? "Chưa có hồ sơ đối tượng chính sách nào được khởi tạo trên hệ thống."
                            : "Không tìm thấy đối tượng chính sách phù hợp bộ lọc hiện tại."}
                        </td>
                      </tr>
                    ) : (
                      paginatedRecipients.map(rec => {
                        const bhyt = getBhytInfo(rec);
                        const areaLabel = extractKp3Area(rec.address);
                        const statusClasses =
                          rec.status === "Đang nhận trợ cấp"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : rec.status === "Chờ duyệt hồ sơ"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200";
                        return (
                          <tr
                            key={rec.id}
                            tabIndex={0}
                            onClick={() => setSelectedRecipient(rec)}
                            onKeyDown={(e) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedRecipient(rec);
                              }
                            }}
                            className="cursor-pointer hover:bg-slate-50/70 transition-colors group"
                          >
                            <td className="py-2.5 px-3.5">
                              <div className="font-bold text-slate-900 group-hover:text-emerald-700 text-xs transition-colors">{rec.fullName}</div>
                              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 inline-block">
                                {rec.id}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="font-mono font-semibold text-slate-800">{rec.cccd}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                <Phone size={11} /> {rec.phone || "Chưa có SĐT"}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 space-y-1">
                              <div>{getSubCategoryBadge(rec.category)}</div>
                              <div>
                                <span
                                  className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${bhyt.hasBhyt
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}
                                >
                                  {bhyt.label}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="text-xs text-slate-700 truncate max-w-[210px] flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{rec.address}</span>
                              </div>
                              {areaLabel && (
                                <span className="text-[11px] font-medium text-slate-500">{areaLabel}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <span className="font-bold text-emerald-700 text-xs">{rec.supportLevel}</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border inline-block ${statusClasses}`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.06)]" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecipient(rec)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                  title="Xem chi tiết hồ sơ"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRecipient(rec)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Chỉnh sửa thông tin đối tượng"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmergencyForRecipient(rec)}
                                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                                  title="Hỗ trợ ngay"
                                >
                                  <Zap size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRecipientToDelete(rec)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {subCategories.map(sub => {
            const count = effectiveRecipients.filter(r => r.category === sub.name).length;
            return (
              <div
                key={sub.id}
                role="button"
                tabIndex={0}
                aria-label={`Lọc danh sách đối tượng thuộc nhóm ${sub.name}`}
                onClick={() => {
                  setSelectedCategoryPill(sub.name);
                  setActiveTab("recipients");
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCategoryPill(sub.name);
                    setActiveTab("recipients");
                  }
                }}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 p-4 flex flex-col justify-between space-y-3 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-xs border border-slate-200 shrink-0">
                        {sub.code}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] group-hover:text-emerald-700 transition-colors truncate">{sub.name}</h4>
                        <span className="text-[11px] text-slate-500">
                          {sub.isCustom ? "Phân hệ tự tạo" : "Phân hệ quy chuẩn"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                      {count} người
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {sub.description}
                  </p>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs">
                    <span className="text-[11px] uppercase font-bold text-slate-500 block mb-0.5">Tiêu chí xét duyệt</span>
                    <p className="text-slate-700 text-xs leading-relaxed line-clamp-2">{sub.criteria}</p>
                  </div>

                  {/* Standard Benefits */}
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Chế độ chuẩn ({sub.standardBenefits?.length || 0})</span>
                    <ul className="space-y-1">
                      {(sub.standardBenefits || []).slice(0, 3).map((ben, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{ben}</span>
                        </li>
                      ))}
                      {(sub.standardBenefits?.length || 0) > 3 && (
                        <li className="text-[11px] text-emerald-700 font-semibold pl-4">
                          +{(sub.standardBenefits?.length || 0) - 3} chế độ khác
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-700 group-hover:underline truncate">
                    Xem danh sách ({count}) →
                  </span>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenEditSubCategory(sub)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-semibold transition-colors"
                      title="Chỉnh sửa phân hệ & tiêu chuẩn chính sách"
                    >
                      <Edit2 size={11} />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubCategoryToDelete(sub);
                        const others = subCategories.filter(s => s.id !== sub.id);
                        setReassignCategoryTarget(others[0]?.name || "");
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Xóa phân hệ"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ĐỢT HỖ TRỢ & CẤP PHÁT TẬP TRUNG                                */}
      {/* ========================================================================= */}
      {activeTab === "campaigns" && (() => {
        const qCam = campaignSearchQuery.trim().toLowerCase();
        const filteredCampaigns = campaigns.filter(cam =>
          !qCam ||
          cam.id.toLowerCase().includes(qCam) ||
          cam.title.toLowerCase().includes(qCam) ||
          cam.fundingSource.toLowerCase().includes(qCam) ||
          cam.location.toLowerCase().includes(qCam) ||
          cam.targetCategories.some(c => c.toLowerCase().includes(qCam))
        );
        return (
        <div className="space-y-3.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={campaignSearchQuery}
                onChange={e => setCampaignSearchQuery(e.target.value)}
                placeholder="Tìm đợt trao quà, nguồn kinh phí, địa điểm..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị <strong className="text-slate-800">{filteredCampaigns.length}</strong> đợt chăm lo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredCampaigns.map(cam => {
              const statusBadges: Record<string, string> = {
                "Đang đề xuất": "bg-amber-50 text-amber-800 border-amber-200",
                "Đã duyệt chi": "bg-indigo-50 text-indigo-800 border-indigo-200",
                "Đang trao tặng": "bg-sky-50 text-sky-800 border-sky-200",
                "Đã hoàn tất": "bg-emerald-50 text-emerald-800 border-emerald-200"
              };

              return (
                <div
                  key={cam.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Xem chi tiết đợt hỗ trợ ${cam.title}`}
                  onClick={() => {
                    setCampaignModalMemberSearch("");
                    setSelectedCampaign(cam);
                  }}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCampaignModalMemberSearch("");
                      setSelectedCampaign(cam);
                    }
                  }}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 p-4 transition-colors flex flex-col justify-between space-y-3 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {cam.id}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadges[cam.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {cam.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] group-hover:text-emerald-700 transition-colors leading-snug">
                      {cam.title}
                    </h4>

                    {/* Target Categories */}
                    <div className="flex flex-wrap items-center gap-1">
                      {cam.targetCategories.map((c, i) => (
                        <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Đối tượng</span>
                        <span className="font-bold text-slate-900 font-mono">{cam.recipientCount} người</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Mức tiền mặt</span>
                        <span className="font-bold text-slate-900 font-mono">{formatVNNumber(cam.cashAmountPerPerson)}đ</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Tổng kinh phí</span>
                        <span className="font-bold text-emerald-700 font-mono">{formatVNNumber(cam.totalBudget)}đ</span>
                      </div>
                    </div>

                    {/* Gift Item Description */}
                    {cam.giftDescription && (
                      <div className="text-xs text-slate-700 flex items-start gap-1.5 bg-amber-50/50 p-2 rounded-lg border border-amber-200/70">
                        <Gift size={13} className="text-amber-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2"><strong>Hiện vật:</strong> {cam.giftDescription}</span>
                      </div>
                    )}

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <strong className="font-mono">{cam.disbursementDate}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{cam.location}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} className="text-slate-400" />
                        <span>{cam.fundingSource}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cam.status === "Đang đề xuất" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCampaignStatus(cam.id, "Đã duyệt chi")}
                          className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
                        >
                          Phê duyệt chi
                        </button>
                      )}
                      {cam.status === "Đã duyệt chi" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCampaignStatus(cam.id, "Đang trao tặng")}
                          className="h-8 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer"
                        >
                          Bắt đầu trao tặng
                        </button>
                      )}
                      {cam.status === "Đang trao tặng" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCampaignStatus(cam.id, "Đã hoàn tất")}
                          className="h-8 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer"
                        >
                          Hoàn tất đợt
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCampaignModalMemberSearch("");
                          setSelectedCampaign(cam);
                        }}
                        className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                      >
                        Danh sách
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const camRecs = getCampaignTargetRecipients(cam);
                          handleExportSignSheetXlsx(camRecs, {
                            title: cam.title,
                            amountOverride: `${formatVNNumber(cam.cashAmountPerPerson)} đ${cam.giftDescription ? " + Hiện vật" : ""}`,
                            filenamePrefix: `DS_KyNhan_${cam.id}`
                          });
                        }}
                        className="h-8 px-2.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Xuất DS Ký nhận (.xlsx)"
                      >
                        <FileSpreadsheet size={12} className="text-emerald-700" />
                        <span>.xlsx</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const camRecs = getCampaignTargetRecipients(cam);
                          handlePrintSignSheetA4(camRecs, {
                            title: `DANH SÁCH KÝ NHẬN TIỀN / QUÀ — ${cam.title.toUpperCase()}`,
                            subtitle: `Thời gian: ${cam.disbursementDate} • Địa điểm: ${cam.location} • Nguồn quỹ: ${cam.fundingSource}`,
                            amountOverride: `${formatVNNumber(cam.cashAmountPerPerson)} đ${cam.giftDescription ? " + Quà" : ""}`,
                            totalSummary: `Tổng kinh phí tiền mặt: ${formatVNNumber(camRecs.length * cam.cashAmountPerPerson)} VNĐ.`
                          });
                        }}
                        className="h-8 px-2.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="In Danh sách Ký nhận A4"
                      >
                        <Printer size={12} className="text-slate-500" />
                        <span>In A4</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: HỖ TRỢ NGAY & CỨU TRỢ KHẨN CẤP                                */}
      {/* ========================================================================= */}
      {activeTab === "emergency" && (() => {
        const qEmg = emergencySearchQuery.trim().toLowerCase();
        const filteredEmergency = emergencyRecords.filter(rec =>
          !qEmg ||
          rec.id.toLowerCase().includes(qEmg) ||
          rec.recipientName.toLowerCase().includes(qEmg) ||
          rec.cccd.toLowerCase().includes(qEmg) ||
          rec.reason.toLowerCase().includes(qEmg)
        );
        return (
        <div className="space-y-3.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={emergencySearchQuery}
                onChange={e => setEmergencySearchQuery(e.target.value)}
                placeholder="Tìm người nhận cứu trợ khẩn cấp, số CCCD, lý do..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Đã chi trả <strong className="text-slate-800">{filteredEmergency.length}</strong> trường hợp đột xuất
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredEmergency.map(rec => {
              const matchedRec = effectiveRecipients.find(r => r.id === rec.recipientId || r.cccd === rec.cccd);
              const matchedRes = (residents || []).find(r => r.cccd === rec.cccd || r.fullName === rec.recipientName);
              const isClickable = Boolean(matchedRec || matchedRes);
              const openEmgProfile = () => {
                if (matchedRec) {
                  setSelectedRecipient(matchedRec);
                } else if (matchedRes) {
                  navigate(getResidentDetailPath(matchedRes.id));
                }
              };
              return (
              <div
                key={rec.id}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? openEmgProfile : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEmgProfile();
                        }
                      }
                    : undefined
                }
                className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 p-4 transition-colors flex flex-col justify-between space-y-3 ${
                  isClickable ? "cursor-pointer group" : ""
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {rec.id}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={11} /> {rec.status}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] group-hover:text-emerald-700 transition-colors truncate">{rec.recipientName}</h4>
                      <span className="text-xs text-slate-500 font-mono">CCCD: {rec.cccd}</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0">
                      {formatVNNumber(rec.amount)}đ
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-0.5">
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Hoàn cảnh đột xuất</span>
                    <p className="text-xs leading-relaxed text-slate-700 line-clamp-2">{rec.reason}</p>
                  </div>

                  {rec.giftItems && (
                    <div className="text-xs text-slate-700 bg-amber-50/50 p-2 rounded-lg border border-amber-200/70 flex items-center gap-1.5">
                      <Gift size={12} className="text-amber-600 shrink-0" />
                      <span className="truncate">Hiện vật: {rec.giftItems}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                    <div>Giải ngân: <strong className="text-slate-800 font-mono">{rec.disbursedDate}</strong> • Duyệt: <strong className="text-slate-800">{rec.approver}</strong></div>
                    <div className="truncate">Nguồn: {rec.fundingSource}</div>
                  </div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-2 border-t border-slate-100 flex items-center justify-between"
                >
                  <span className="text-xs text-emerald-700 font-semibold">Đã lưu chứng từ chi</span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="In phiếu chi cứu trợ khẩn cấp"
                  >
                    <Printer size={13} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        );
      })()}

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
            <div className="px-5 py-3.5 bg-slate-50/60 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200/80">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <Heart size={15} className="text-emerald-700" /> Thêm đối tượng thụ hưởng an sinh
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRecipientModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRecipient} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Resident Selector */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                <label className="font-bold text-slate-800 block text-xs">
                  1. Chọn nhanh từ CSDL Dân cư Khu phố 3 ({residents.length} nhân khẩu):
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên cư dân hoặc số CCCD..."
                    value={residentSearchQuery}
                    onChange={e => setResidentSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-600"
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
              </div>

              {/* Citizen Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên đối tượng *</label>
                  <input
                    type="text"
                    required
                    value={recFullName}
                    onChange={e => setRecFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số CCCD / Định danh *</label>
                  <input
                    type="text"
                    required
                    value={recCccd}
                    onChange={e => setRecCccd(e.target.value)}
                    placeholder="079xxxxxxxxxx"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={recPhone}
                    onChange={e => setRecPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa chỉ cư trú *</label>
                  <input
                    type="text"
                    required
                    value={recAddress}
                    onChange={e => setRecAddress(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Sub-Category Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân hệ an sinh con *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Mức hỗ trợ đề xuất *</label>
                  <input
                    type="text"
                    required
                    value={recSupportLevel}
                    onChange={e => setRecSupportLevel(e.target.value)}
                    placeholder="2.500.000đ / tháng"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Benefits Checklist */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  2. Chế độ Chính sách &amp; Quyền lợi được hưởng:
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
                          className="rounded accent-emerald-700 mt-0.5"
                        />
                        <span>{ben.name} <strong className="text-xs text-slate-600">({ben.standardValue})</strong></span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hoàn cảnh thực tế &amp; Đề xuất của cơ sở</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ hoàn cảnh gia đình, thương tật, độ tuổi, kết quả bình xét của Ban Điều hành Khu phố 3..."
                  value={recNotes}
                  onChange={e => setRecNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddRecipientModal(false)}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 font-semibold text-white cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} /> Lưu hồ sơ an sinh
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="block font-bold text-slate-700 mb-1">
                  Đối tượng thụ hưởng (chọn nhiều phân hệ — khớp {effectiveRecipients.filter(r => camCategories.includes(r.category)).length} người):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
                  {subCategories.map(s => {
                    const isChecked = camCategories.includes(s.name);
                    const subCount = effectiveRecipients.filter(r => r.category === s.name).length;
                    return (
                      <label key={s.id} className="flex items-center justify-between gap-1.5 cursor-pointer font-medium text-slate-800 text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) setCamCategories(prev => [...prev, s.name]);
                              else setCamCategories(prev => prev.filter(c => c !== s.name));
                            }}
                            className="rounded accent-emerald-600 shrink-0"
                          />
                          <span className="truncate">{s.name}</span>
                        </span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                          {subCount}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          >
            <div className="px-5 py-3.5 bg-slate-50/60 text-slate-900 flex items-center justify-between shrink-0 border-b border-slate-200/80">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <Zap size={15} className="text-amber-600" /> Quyết định chi trả hỗ trợ khẩn cấp
              </h3>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmEmergencySupport} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-950 space-y-0.5">
                <span className="font-bold block text-xs">Cơ chế duyệt nóng tại Khu phố 3</span>
                <p className="text-xs leading-relaxed text-amber-900/90">
                  Áp dụng cho tai nạn đột xuất, tang tế, hỏa hoạn, bệnh hiểm nghèo cần xuất quỹ hỗ trợ trong 24h. Khoản chi sẽ tự động đồng bộ sang Quỹ khu phố.
                </p>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đối tượng thụ hưởng *</label>
                  <input
                    type="text"
                    required
                    value={emgRecipientName}
                    onChange={e => setEmgRecipientName(e.target.value)}
                    placeholder="Họ và tên người nhận..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={emgCccd}
                    onChange={e => setEmgCccd(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ thường trú / tạm trú</label>
                <input
                  type="text"
                  value={emgAddress}
                  onChange={e => setEmgAddress(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số tiền hỗ trợ khẩn cấp (VNĐ) *</label>
                  <input
                    type="number"
                    step={500000}
                    required
                    value={emgAmount}
                    onChange={e => setEmgAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-mono font-bold text-emerald-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại diện chính sách</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Lý do cứu trợ khẩn cấp *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ghi rõ tình huống khẩn cấp (tai nạn, hỏa hoạn, tang tế, phẫu thuật bệnh viện...)"
                  value={emgReason}
                  onChange={e => setEmgReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hiện vật cấp bách kèm theo (nếu có)</label>
                <input
                  type="text"
                  placeholder="Gạo, thuốc men, sữa dinh dưỡng, quần áo..."
                  value={emgGiftItems}
                  onChange={e => setEmgGiftItems(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lãnh đạo duyệt nóng *</label>
                  <input
                    type="text"
                    required
                    value={emgApprover}
                    onChange={e => setEmgApprover(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nguồn quỹ chi trả *</label>
                  <input
                    type="text"
                    required
                    value={emgFundingSource}
                    onChange={e => setEmgFundingSource(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 font-semibold text-white cursor-pointer flex items-center gap-1.5"
                >
                  <Zap size={13} /> Xác nhận chi trả
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
        const navList = filteredRecipients.length > 0 ? filteredRecipients : effectiveRecipients;
        const currentIdx = navList.findIndex(r => r.id === selectedRecipient.id);
        const totalNav = navList.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;
        const shortId = formatShortRecordId(selectedRecipient.id, "ASXH");
        const bhyt = getBhytInfo(selectedRecipient);
        const matchedResidentProfile = (residents || []).find(
          r => r.cccd === selectedRecipient.cccd || r.fullName === selectedRecipient.fullName
        );

        return (
          <Modal
            isOpen={Boolean(selectedRecipient)}
            onClose={() => setSelectedRecipient(null)}
            size="2xl"
            compact
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
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <Heart size={20} className="fill-rose-500/20 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      MÃ: {shortId}
                    </span>
                    {getSubCategoryBadge(selectedRecipient.category)}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
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
            bodyClassName="p-4 sm:p-5 space-y-3.5 bg-white text-xs"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selectedRecipient.id, "Đang nhận trợ cấp")}
                    className="min-h-8 text-xs font-semibold py-1 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                  >
                    Duyệt chi
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selectedRecipient.id, "Đã tạm ngưng")}
                    className="min-h-8 text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Tạm ngưng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEmergencyForRecipient(selectedRecipient);
                      setSelectedRecipient(null);
                    }}
                    className="min-h-8 text-xs font-semibold py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer inline-flex items-center gap-1"
                  >
                    <Zap size={12} /> Hỗ trợ
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Printer size={13} /> In
                  </button>
                  {matchedResidentProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(null);
                        navigate(getResidentDetailPath(matchedResidentProfile.id));
                      }}
                      className="min-h-8 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink size={12} /> Hồ sơ Cư dân
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRecipientToDelete(selectedRecipient)}
                    className="min-h-8 px-2.5 py-1 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(null)}
                    className="min-h-8 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditRecipient(selectedRecipient)}
                    className="min-h-8 px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={13} /> Chỉnh sửa
                  </button>
                </div>
              </div>
            }
          >
            {/* Mục 1: Thông tin định danh */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 pb-1.5 border-b border-slate-200">
                <User size={14} className="text-rose-600" />
                <span className="text-xs uppercase tracking-wider">1. Định danh, Bảo trợ &amp; Cư trú</span>
              </div>

              <DetailGrid hideEmpty compact>
                <DetailRow
                  label="Số CCCD / Định danh"
                  value={selectedRecipient.cccd}
                  isMono
                  copyValue={selectedRecipient.cccd}
                />
                <DetailRow
                  label="Số điện thoại"
                  value={selectedRecipient.phone}
                  isMono
                  copyValue={selectedRecipient.phone}
                  href={selectedRecipient.phone ? `tel:${selectedRecipient.phone}` : undefined}
                />
                <DetailRow
                  label="Mức trợ cấp tháng"
                  value={<span className="font-bold text-rose-700">{selectedRecipient.supportLevel}</span>}
                  isNumeric
                />
                <DetailRow
                  label="Bảo hiểm y tế"
                  value={bhyt.label}
                  isMono={Boolean(bhyt.code)}
                  copyValue={bhyt.code || undefined}
                />
                <DetailRow
                  label="Nơi cư trú"
                  value={selectedRecipient.address}
                  colSpan={2}
                />
              </DetailGrid>
            </div>

            {/* Mục 2: Chế độ Chính sách & Quyền lợi được hưởng */}
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Gift size={14} className="text-emerald-700" />
                  <span className="text-xs uppercase tracking-wider">2. Chính sách &amp; Quyền lợi ({selectedRecipient.benefits?.length || 0})</span>
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
      {selectedCampaign && (() => {
        const campaignTargetList = getCampaignTargetRecipients(selectedCampaign);
        const filteredCampaignTargetList = campaignTargetList.filter(r => {
          const q = campaignModalMemberSearch.trim().toLowerCase();
          if (!q) return true;
          return (
            r.fullName.toLowerCase().includes(q) ||
            r.cccd.toLowerCase().includes(q) ||
            r.address.toLowerCase().includes(q)
          );
        });
        return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedCampaign(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 text-xs"
          >
            <div className="p-4 bg-slate-50 text-slate-900 flex items-center justify-between gap-2 shrink-0 border-b border-slate-200">
              <h3 className="font-black text-sm flex items-center gap-2 min-w-0">
                <Gift size={16} className="text-emerald-600 shrink-0" />
                <span className="truncate">{selectedCampaign.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer shrink-0"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-900 block">Tổng kinh phí:</span>
                  <span className="font-black text-emerald-800 text-base">{formatVNNumber(selectedCampaign.totalBudget)} đ</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-900 block">Số đối tượng:</span>
                  <span className="font-bold text-slate-900 text-base">{campaignTargetList.length || selectedCampaign.recipientCount} người</span>
                </div>
              </div>

              {selectedCampaign.giftDescription && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-950 block mb-0.5">Quà tặng hiện vật:</span>
                  <p className="text-amber-900">{selectedCampaign.giftDescription}</p>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-slate-800">
                    Danh sách đối tượng thụ hưởng ({filteredCampaignTargetList.length}):
                  </span>
                  <div className="relative w-full sm:w-48">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="search"
                      value={campaignModalMemberSearch}
                      onChange={e => setCampaignModalMemberSearch(e.target.value)}
                      placeholder="Tìm tên, CCCD..."
                      className="w-full h-7 pl-7 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {filteredCampaignTargetList.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      Chưa có đối tượng phù hợp trong danh sách. Hãy bấm &ldquo;Đồng bộ từ CSDL Dân cư&rdquo; để nạp đối tượng chính sách &amp; người cao tuổi.
                    </div>
                  ) : (
                    filteredCampaignTargetList.map(r => (
                      <div
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedCampaign(null);
                          setSelectedRecipient(r);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCampaign(null);
                            setSelectedRecipient(r);
                          }
                        }}
                        className="p-2.5 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 rounded-lg border border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 group-hover:text-emerald-800 block truncate transition-colors">{r.fullName}</span>
                          <span className="text-xs text-slate-600 font-mono block truncate">CCCD: {r.cccd} • {r.address}</span>
                        </div>
                        <span className="font-mono text-rose-700 font-bold shrink-0 whitespace-nowrap">
                          {formatVNNumber(selectedCampaign.cashAmountPerPerson)} đ
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleExportSignSheetXlsx(campaignTargetList, {
                      title: selectedCampaign.title,
                      amountOverride: `${formatVNNumber(selectedCampaign.cashAmountPerPerson)} đ${selectedCampaign.giftDescription ? " + Hiện vật" : ""}`,
                      filenamePrefix: `DS_KyNhan_${selectedCampaign.id}`
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={13} /> Xuất DS Ký nhận (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePrintSignSheetA4(campaignTargetList, {
                      title: `DANH SÁCH KÝ NHẬN TIỀN / QUÀ — ${selectedCampaign.title.toUpperCase()}`,
                      subtitle: `Thời gian: ${selectedCampaign.disbursementDate} • Địa điểm: ${selectedCampaign.location} • Nguồn quỹ: ${selectedCampaign.fundingSource}`,
                      amountOverride: `${formatVNNumber(selectedCampaign.cashAmountPerPerson)} đ${selectedCampaign.giftDescription ? " + Quà" : ""}`,
                      totalSummary: `Tổng kinh phí tiền mặt: ${formatVNNumber(campaignTargetList.length * selectedCampaign.cashAmountPerPerson)} VNĐ.`
                    })
                  }
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} /> In Danh sách Ký nhận A4
                </button>
              </div>
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
        );
      })()}

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
                    Mã phân hệ: <span className="font-mono font-bold text-slate-900">{subCategoryToEdit.code}</span> • Đang có <span className="font-bold text-indigo-700">{effectiveRecipients.filter(r => r.category === subCategoryToEdit.name).length}</span> đối tượng
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
        const affectedCount = effectiveRecipients.filter(r => r.category === subCategoryToDelete.name).length;
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
