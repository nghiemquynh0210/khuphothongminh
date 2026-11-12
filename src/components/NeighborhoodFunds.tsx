import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  FileSpreadsheet,
  Filter,
  FolderCog,
  LayoutGrid,
  List,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Edit2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FundCategory,
  FundContribution,
  FundExpenditure,
  Household,
} from "../types";
import Pagination from "./Pagination";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { Button } from "./ui/Button";
import { StatusBadge } from "./ui/StatusBadge";
import { EmptyState } from "./ui/EmptyState";
import { ConfirmModal } from "./ui/ConfirmModal";
import { formatVNNumber } from "../utils/numberFormat";
import { loadFundCategoriesFromDb, saveFundCategoriesToDb } from "../utils/supabaseSync";
import VietQrModal from "./funds/VietQrModal";
import HouseholdFundLookup from "./funds/HouseholdFundLookup";
import FundCatalogManager from "./funds/FundCatalogManager";
import {
  AddContributionModal,
  AddExpenditureModal,
  DeleteExpenditureModal,
  ReceiptPreviewData,
  ReceiptPrintModal,
} from "./funds/FundModals";
import {
  DEFAULT_FUND_CATEGORIES,
  doesRecordMatchCategory,
  exportFundsWorkbookXlsx,
  findCategoryByFundName,
  formatReceiptCode,
  FUND_CATEGORIES_STORAGE_KEY,
  FUND_EXPENDITURES_STORAGE_KEY,
  inferPayerMeta,
  mergeDiscoveredFundCategories,
  MOCK_INITIAL_EXPENDITURES,
  normalizeFundKey,
} from "./funds/fundCatalog";

export type FundsSubTab = "thu" | "chi" | "danhmuc" | "baocao" | "qr_portal";

interface NeighborhoodFundsProps {
  contributions: FundContribution[];
  onAddContribution: (newCont: FundContribution) => void;
  onUpdateContribution?: (updatedCont: FundContribution) => void;
  onDeleteContribution?: (id: string) => void;
  onUpdateContributionStatus: (
    id: string,
    status: "Đã nộp" | "Chưa nộp",
    paidAt?: string
  ) => void;
  households?: Household[];
  expenditures?: FundExpenditure[];
  onAddExpenditure?: (newExp: FundExpenditure) => void;
  onUpdateExpenditure?: (updatedExp: FundExpenditure) => void;
  onDeleteExpenditure?: (id: string) => void;
  onSyncRenamedFund?: (oldNames: string[], newName: string) => void;
  readOnly?: boolean;
}

export default function NeighborhoodFunds({
  contributions,
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution,
  onUpdateContributionStatus,
  households = [],
  expenditures: controlledExpenditures,
  onAddExpenditure,
  onUpdateExpenditure,
  onDeleteExpenditure,
  onSyncRenamedFund,
  readOnly = false,
}: NeighborhoodFundsProps) {
  const [activeSubTab, setActiveSubTab] = useState<FundsSubTab>(
    readOnly ? "qr_portal" : "thu"
  );
  const [activeVietQrContribution, setActiveVietQrContribution] =
    useState<FundContribution | null>(null);

  // Stored dynamic Fund Categories
  const [storedCategories, setStoredCategories] = useState<FundCategory[]>(() => {
    try {
      const saved = localStorage.getItem(FUND_CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_FUND_CATEGORIES;
  });

  // Uncontrolled local fallback Expenditures (used if parent doesn't supply controlled expenditures)
  const [localExpenditures, setLocalExpenditures] = useState<FundExpenditure[]>(
    () => {
      try {
        const saved = localStorage.getItem(FUND_EXPENDITURES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Fallback to seed
      }
      return MOCK_INITIAL_EXPENDITURES;
    }
  );

  const expenditures = controlledExpenditures ?? localExpenditures;

  const categoriesDbHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadFundCategoriesFromDb().then((rows) => {
      if (active && rows && rows.length > 0) {
        setStoredCategories(rows);
        try {
          localStorage.setItem(FUND_CATEGORIES_STORAGE_KEY, JSON.stringify(rows));
        } catch {}
      }
      categoriesDbHydratedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        FUND_CATEGORIES_STORAGE_KEY,
        JSON.stringify(storedCategories)
      );
    } catch {
      // Ignore storage quota issues
    }
    if (!readOnly && categoriesDbHydratedRef.current) {
      saveFundCategoriesToDb(storedCategories);
    }
  }, [storedCategories, readOnly]);

  useEffect(() => {
    if (controlledExpenditures !== undefined) return;
    try {
      localStorage.setItem(
        FUND_EXPENDITURES_STORAGE_KEY,
        JSON.stringify(localExpenditures)
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [localExpenditures, controlledExpenditures]);

  // Merge user-configured categories with any new fund names discovered from DB records
  const categories = useMemo(
    () =>
      mergeDiscoveredFundCategories(storedCategories, contributions, expenditures),
    [storedCategories, contributions, expenditures]
  );

  // Modals & notifications
  const [showAddThuModal, setShowAddThuModal] = useState(false);
  const [editingContribution, setEditingContribution] =
    useState<FundContribution | null>(null);
  const [deleteContTarget, setDeleteContTarget] =
    useState<FundContribution | null>(null);
  const [showAddChiModal, setShowAddChiModal] = useState(false);
  const [editingExpenditure, setEditingExpenditure] =
    useState<FundExpenditure | null>(null);
  const [createCategoryTrigger, setCreateCategoryTrigger] = useState(0);
  const [deleteExpTarget, setDeleteExpTarget] =
    useState<FundExpenditure | null>(null);
  const [selectedReceipt, setSelectedReceipt] =
    useState<ReceiptPreviewData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [fundFilter, setFundFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [currentContributionsPage, setCurrentContributionsPage] = useState(1);
  const [currentExpendituresPage, setCurrentExpendituresPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const itemsPerPage = 10;

  // Horizontal tab scroll fade management (per modern-web-guidance tabs & scrollability hints)
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const [tabFade, setTabFade] = useState<"none" | "r" | "l" | "lr">("none");

  const updateTabFade = () => {
    const el = tabListRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setTabFade("none");
      return;
    }
    const atStart = el.scrollLeft <= 4;
    const atEnd = el.scrollLeft >= maxScroll - 4;
    if (atStart) setTabFade("r");
    else if (atEnd) setTabFade("l");
    else setTabFade("lr");
  };

  useEffect(() => {
    updateTabFade();
    const ro = new ResizeObserver(updateTabFade);
    if (tabListRef.current) ro.observe(tabListRef.current);
    return () => ro.disconnect();
  }, []);

  const handleSelectTab = (
    tab: FundsSubTab,
    buttonEl?: HTMLButtonElement | null
  ) => {
    setActiveSubTab(tab);
    buttonEl?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  };

  // Category CRUD Handlers
  const handleCreateCategory = (cat: FundCategory) => {
    setStoredCategories((prev) => [cat, ...prev]);
    showToast(`Đã tạo mới "${cat.name}" (${cat.code}).`);
  };

  const handleUpdateCategory = (
    prevName: string,
    updated: FundCategory,
    syncRecords: boolean
  ) => {
    setStoredCategories((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      return [updated, ...prev];
    });

    if (syncRecords && normalizeFundKey(prevName) !== normalizeFundKey(updated.name)) {
      if (onSyncRenamedFund) {
        onSyncRenamedFund([prevName, ...(updated.aliases || [])], updated.name);
      }
      if (controlledExpenditures === undefined) {
        setLocalExpenditures((prev) =>
          prev.map((e) =>
            normalizeFundKey(e.fundName) === normalizeFundKey(prevName)
              ? { ...e, fundName: updated.name }
              : e
          )
        );
      }
    }

    showToast(`Đã cập nhật thông tin "${updated.name}".`);
  };

  const handleDeleteCategory = (
    cat: FundCategory,
    reassignToFundName?: string
  ) => {
    if (reassignToFundName && onSyncRenamedFund) {
      onSyncRenamedFund([cat.name, ...(cat.aliases || [])], reassignToFundName);
    }
    if (reassignToFundName && controlledExpenditures === undefined) {
      setLocalExpenditures((prev) =>
        prev.map((e) =>
          doesRecordMatchCategory(e.fundName, cat, categories)
            ? { ...e, fundName: reassignToFundName }
            : e
        )
      );
    }
    setStoredCategories((prev) => prev.filter((c) => c.id !== cat.id));
    if (fundFilter === cat.name) setFundFilter("Tất cả");
    showToast(
      reassignToFundName
        ? `Đã chuyển chứng từ sang "${reassignToFundName}" và xóa "${cat.name}".`
        : `Đã xóa "${cat.name}" khỏi danh mục quỹ.`
    );
  };

  const handleBatchGenerateReminders = (
    category: FundCategory,
    selectedHouseholds: Household[],
    customAmount: number
  ) => {
    const existingKeys = new Set(
      contributions
        .filter((c) => doesRecordMatchCategory(c.fundName, category, categories))
        .map((c) => c.householdCode)
    );

    let createdCount = 0;
    selectedHouseholds.forEach((hh, idx) => {
      if (existingKeys.has(hh.code)) return;
      createdCount += 1;
      const receiptCode = `${category.code}-${hh.code.replace(/[^A-Z0-9]/gi, "")}`;
      onAddContribution({
        id: `FD-${Date.now().toString().slice(-4)}-${idx}`,
        receiptCode,
        householdCode: hh.code,
        ownerName: hh.ownerName,
        payerType: "household",
        fundName: category.name,
        amount: customAmount,
        status: "Chưa nộp",
        paymentMethod: "VietQR",
        note: `Đợt vận động ${category.name} năm 2026`,
      });
    });

    if (createdCount > 0) {
      showToast(
        `Đã phát hành ${createdCount} phiếu nhắc thu cho "${category.name}".`
      );
      setFundFilter(category.name);
      setStatusFilter("Chưa nộp");
      setActiveSubTab("thu");
    } else {
      showToast("Các hộ được chọn đều đã có phiếu ở quỹ này.");
    }
  };

  // Expenditure Handlers
  const handleSaveThu = (saved: FundContribution) => {
    if (editingContribution) {
      if (onUpdateContribution) {
        onUpdateContribution(saved);
      } else {
        onUpdateContributionStatus(saved.id, saved.status, saved.paidAt);
      }
      showToast(`Đã cập nhật phiếu thu ${saved.receiptCode || saved.id}.`);
      setEditingContribution(null);
      return;
    }
    onAddContribution(saved);
    showToast(`Đã ghi nhận phiếu thu ${saved.receiptCode || saved.id}.`);
  };

  const handleConfirmDeleteCont = () => {
    if (!deleteContTarget) return;
    const code = formatReceiptCode(
      deleteContTarget.id,
      deleteContTarget.receiptCode,
      "BL"
    );
    if (onDeleteContribution) {
      onDeleteContribution(deleteContTarget.id);
    }
    setDeleteContTarget(null);
    showToast(`Đã xóa phiếu thu ${code}.`);
  };

  const handleSaveChi = (newExp: FundExpenditure) => {
    if (editingExpenditure) {
      if (onUpdateExpenditure) {
        onUpdateExpenditure(newExp);
      } else {
        setLocalExpenditures((prev) =>
          prev.map((item) => (item.id === newExp.id ? newExp : item))
        );
      }
      showToast(`Đã cập nhật phiếu chi ${newExp.voucherCode || newExp.id}.`);
      setEditingExpenditure(null);
      return;
    }
    if (onAddExpenditure) {
      onAddExpenditure(newExp);
    } else {
      setLocalExpenditures((prev) => [newExp, ...prev]);
    }
    showToast(`Đã lập phiếu chi ${newExp.voucherCode || newExp.id}.`);
  };

  const handleConfirmDeleteChi = (exp: FundExpenditure) => {
    if (onDeleteExpenditure) {
      onDeleteExpenditure(exp.id);
    } else {
      setLocalExpenditures((prev) => prev.filter((item) => item.id !== exp.id));
    }
    showToast(`Đã xóa phiếu chi ${formatReceiptCode(exp.id, exp.voucherCode, "PC")}.`);
  };

  // Print Receipt Preview
  const handleOpenReceipt = (type: "THU" | "CHI", item: any) => {
    if (type === "THU") {
      const payer = inferPayerMeta(item);
      setSelectedReceipt({
        type: "THU",
        id: item.id,
        receiptCode: item.receiptCode,
        date: item.paidAt || new Date().toLocaleDateString("vi-VN"),
        amount: item.amount,
        title:
          item.note ||
          `Đóng góp tự nguyện vào ${item.fundName} (Khu phố 3, Phường An Phú)`,
        subject: item.ownerName,
        subDetail: `${payer.label} (${payer.codeLabel})`,
        evidence: "Biên lai thu quỹ cộng đồng điện tử",
        fundName: item.fundName,
        approvedBy: "Nguyễn Văn Hùng",
      });
    } else {
      setSelectedReceipt({
        type: "CHI",
        id: item.id,
        receiptCode: item.voucherCode,
        date: item.spentAt,
        amount: item.amount,
        title: item.title,
        subject: item.receiver,
        subDetail: `Người phê duyệt: ${item.approvedBy}`,
        evidence: item.evidence,
        fundName: item.fundName,
        approvedBy: item.approvedBy,
      });
    }
  };

  // KPI & Financial Aggregations
  const paidContributions = useMemo(
    () => contributions.filter((c) => c.status === "Đã nộp"),
    [contributions]
  );
  const pendingContributions = useMemo(
    () => contributions.filter((c) => c.status !== "Đã nộp"),
    [contributions]
  );

  const payerBreakdown = useMemo(() => {
    let householdCount = 0;
    let orgCount = 0;
    const seenHouseholds = new Set<string>();

    paidContributions.forEach((c) => {
      const meta = inferPayerMeta(c);
      if (meta.isHousehold) {
        if (!seenHouseholds.has(c.householdCode)) {
          seenHouseholds.add(c.householdCode);
          householdCount += 1;
        }
      } else {
        orgCount += 1;
      }
    });

    return { householdCount, orgCount };
  }, [paidContributions]);

  const totalOpeningBalance = useMemo(
    () => categories.reduce((sum, c) => sum + (c.openingBalance || 0), 0),
    [categories]
  );
  const totalRevenue = useMemo(
    () => paidContributions.reduce((sum, c) => sum + c.amount, 0),
    [paidContributions]
  );
  const totalExpense = useMemo(
    () => expenditures.reduce((sum, e) => sum + e.amount, 0),
    [expenditures]
  );
  const balanceFund = totalOpeningBalance + totalRevenue - totalExpense;

  const totalAnnualTarget = useMemo(
    () =>
      categories
        .filter((c) => c.status !== "Đã khóa sổ")
        .reduce((sum, c) => sum + (c.annualTarget || 0), 0),
    [categories]
  );

  const targetProgressPercent =
    totalAnnualTarget > 0
      ? Math.min(100, Math.round((totalRevenue / totalAnnualTarget) * 100))
      : contributions.length > 0
      ? Math.round((paidContributions.length / contributions.length) * 100)
      : 0;

  // Filtered Thu & Chi
  const filteredContributions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matchedFilterCat =
      fundFilter !== "Tất cả"
        ? findCategoryByFundName(categories, fundFilter)
        : undefined;

    return contributions.filter((c) => {
      const shortId = formatReceiptCode(c.id, c.receiptCode, "BL").toLowerCase();
      const matchesSearch =
        !q ||
        c.ownerName.toLowerCase().includes(q) ||
        c.householdCode.toLowerCase().includes(q) ||
        shortId.includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.fundName.toLowerCase().includes(q);

      const matchesFund =
        fundFilter === "Tất cả" ||
        (matchedFilterCat
          ? doesRecordMatchCategory(c.fundName, matchedFilterCat, categories)
          : normalizeFundKey(c.fundName) === normalizeFundKey(fundFilter));

      const matchesStatus =
        statusFilter === "Tất cả" || c.status === statusFilter;

      return matchesSearch && matchesFund && matchesStatus;
    });
  }, [contributions, searchTerm, fundFilter, statusFilter, categories]);

  const totalContributionsItems = filteredContributions.length;
  const totalContributionsPages = Math.max(
    1,
    Math.ceil(totalContributionsItems / itemsPerPage)
  );
  const activeContributionsPage = Math.min(
    currentContributionsPage,
    totalContributionsPages
  );
  const paginatedContributions = filteredContributions.slice(
    (activeContributionsPage - 1) * itemsPerPage,
    activeContributionsPage * itemsPerPage
  );

  const filteredExpenditures = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matchedFilterCat =
      fundFilter !== "Tất cả"
        ? findCategoryByFundName(categories, fundFilter)
        : undefined;

    return expenditures.filter((e) => {
      const shortCode = formatReceiptCode(e.id, e.voucherCode, "PC").toLowerCase();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.receiver.toLowerCase().includes(q) ||
        shortCode.includes(q) ||
        (e.evidence || "").toLowerCase().includes(q);

      const matchesFund =
        fundFilter === "Tất cả" ||
        (matchedFilterCat
          ? doesRecordMatchCategory(e.fundName, matchedFilterCat, categories)
          : normalizeFundKey(e.fundName) === normalizeFundKey(fundFilter));

      return matchesSearch && matchesFund;
    });
  }, [expenditures, searchTerm, fundFilter, categories]);

  const totalExpendituresItems = filteredExpenditures.length;
  const totalExpendituresPages = Math.max(
    1,
    Math.ceil(totalExpendituresItems / itemsPerPage)
  );
  const activeExpendituresPage = Math.min(
    currentExpendituresPage,
    totalExpendituresPages
  );
  const paginatedExpenditures = filteredExpenditures.slice(
    (activeExpendituresPage - 1) * itemsPerPage,
    activeExpendituresPage * itemsPerPage
  );

  // Per-fund Balance Sheet & Chart Data
  const listFundsStats = useMemo(() => {
    return categories.map((cat) => {
      const revenue = paidContributions
        .filter((c) => doesRecordMatchCategory(c.fundName, cat, categories))
        .reduce((sum, c) => sum + c.amount, 0);
      const pending = pendingContributions
        .filter((c) => doesRecordMatchCategory(c.fundName, cat, categories))
        .reduce((sum, c) => sum + c.amount, 0);
      const expense = expenditures
        .filter((e) => doesRecordMatchCategory(e.fundName, cat, categories))
        .reduce((sum, e) => sum + e.amount, 0);
      const balance = (cat.openingBalance || 0) + revenue - expense;
      const available = (cat.openingBalance || 0) + revenue;
      const disbursementPercent =
        available > 0 ? Math.min(100, Math.round((expense / available) * 100)) : 0;
      const targetPercent =
        cat.annualTarget > 0
          ? Math.min(100, Math.round((revenue / cat.annualTarget) * 100))
          : 0;

      return {
        category: cat,
        shortLabel: cat.code,
        name: cat.name,
        openingBalance: cat.openingBalance || 0,
        revenue,
        pending,
        expense,
        balance,
        disbursementPercent,
        targetPercent,
      };
    });
  }, [categories, paidContributions, pendingContributions, expenditures]);

  const subTabsConfig: {
    id: FundsSubTab;
    label: string;
    badge?: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: "thu",
      label: "Sổ Thu Quỹ",
      badge: contributions.length,
      icon: <ArrowUpRight size={15} className="text-emerald-600 shrink-0" />,
    },
    {
      id: "chi",
      label: "Sổ Chi Quyết Toán",
      badge: expenditures.length,
      icon: <ArrowDownRight size={15} className="text-rose-600 shrink-0" />,
    },
    {
      id: "danhmuc",
      label: "Danh Mục Quỹ",
      badge: categories.length,
      icon: <FolderCog size={15} className="text-[#073B72] shrink-0" />,
    },
    {
      id: "baocao",
      label: "Cân Đối & Biểu Đồ",
      icon: <Activity size={15} className="text-[#073B72] shrink-0" />,
    },
    {
      id: "qr_portal",
      label: "Tra Cứu & VietQR",
      icon: <QrCode size={15} className="text-emerald-600 shrink-0" />,
    },
  ];

  const fadeClass =
    tabFade === "r"
      ? "evon-fade-r"
      : tabFade === "l"
      ? "evon-fade-l"
      : tabFade === "lr"
      ? "evon-fade-lr"
      : "";

  const resetFilters = () => {
    setSearchTerm("");
    setFundFilter("Tất cả");
    setStatusFilter("Tất cả");
    setCurrentContributionsPage(1);
    setCurrentExpendituresPage(1);
  };

  return (
    <div id="neighborhood-funds-view" className="space-y-6">
      {/* Live Status Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/40 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-medium"
        >
          <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Executive Header */}
      <PageHeader
        badgeIcon={<Coins size={14} className="text-emerald-600 shrink-0" />}
        badgeText="QUỸ KP3 • PHƯỜNG AN PHÚ"
        badgeSubtext={readOnly ? "CHẾ ĐỘ CƯ DÂN" : `${categories.length} QUỸ`}
        title="Quản Lý Đóng Góp & Thu Chi Quỹ Khu Phố"
        description={
          readOnly
            ? "Công khai minh bạch số liệu thu chi từng quỹ, hỗ trợ cư dân tra cứu và nộp quỹ bằng mã VietQR."
            : "Quản trị danh mục quỹ linh hoạt, hạch toán thu–chi rõ nguồn đối tượng và đối soát VietQR."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              size="md"
              className="hover:bg-slate-100"
              leftIcon={<FileSpreadsheet size={15} className="text-emerald-600" />}
              onClick={() => {
                exportFundsWorkbookXlsx({
                  categories,
                  contributions,
                  expenditures,
                });
                showToast("Đã xuất báo cáo tài chính Excel (.xlsx) gồm 4 sheet.");
              }}
            >
              Xuất Excel (.xlsx)
            </Button>

            {!readOnly && (
              <>
                {activeSubTab === "chi" ? (
                  <Button
                    variant="destructive"
                    size="md"
                    leftIcon={<Plus size={15} />}
                    onClick={() => setShowAddChiModal(true)}
                  >
                    Tạo Phiếu Chi
                  </Button>
                ) : activeSubTab === "danhmuc" ? (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus size={15} />}
                    onClick={() => setCreateCategoryTrigger((n) => n + 1)}
                  >
                    Thêm loại Quỹ
                  </Button>
                ) : (
                  <Button
                    variant="emerald"
                    size="md"
                    leftIcon={<Plus size={15} />}
                    onClick={() => setShowAddThuModal(true)}
                  >
                    Ghi nhận Phiếu Thu
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Read-only notice banner when Citizen visits */}
      {readOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#073B72] font-medium">
          <ShieldCheck size={16} className="shrink-0" />
          <span>
            Bạn đang xem bảng công khai tài chính cộng đồng với vai trò <strong>Cư dân</strong>. Các thao tác chỉnh sửa sổ thu–chi hoặc danh mục quỹ chỉ hiển thị trên Cổng Cán bộ.
          </span>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Tồn quỹ thực tế"
          value={formatVNNumber(balanceFund)}
          badge="VNĐ"
          highlighted={true}
          icon={Coins}
          color={balanceFund >= 0 ? "emerald" : "rose"}
          subtext={
            totalOpeningBalance !== 0
              ? `Dư đầu kỳ ${formatVNNumber(totalOpeningBalance)}đ`
              : balanceFund >= 0
              ? "Quỹ đang thặng dư"
              : "Chi vượt thu kỳ này"
          }
          subtextRight={balanceFund >= 0 ? "Thặng dư" : "Cần cân đối"}
        />
        <StatCard
          label="Tổng thu quỹ"
          value={formatVNNumber(totalRevenue)}
          badge="VNĐ"
          icon={ArrowUpRight}
          color="blue"
          subtext={`${payerBreakdown.householdCount} hộ • ${payerBreakdown.orgCount} ĐV`}
          subtextRight={`${pendingContributions.length} chờ thu`}
        />
        <StatCard
          label="Tổng chi quỹ"
          value={formatVNNumber(totalExpense)}
          badge="VNĐ"
          icon={ArrowDownRight}
          color="rose"
          subtext={`${expenditures.length} phiếu đã lập`}
          subtextRight="Công khai"
        />
        <StatCard
          label="Tiến độ năm"
          value={targetProgressPercent}
          badge="%"
          icon={TrendingUp}
          color="amber"
          subtext={`${paidContributions.length}/${contributions.length} phiếu nộp`}
          subtextRight={`Mục tiêu ${Math.round(totalAnnualTarget / 1_000_000)}tr`}
        />
      </div>

      {/* Single-Row Scrollable Tab Bar */}
      <div className="border-b border-slate-200">
        <div
          ref={tabListRef}
          onScroll={updateTabFade}
          role="tablist"
          aria-label="Phân hệ Quỹ Khu phố"
          className={`flex items-center gap-4 sm:gap-6 overflow-x-auto evon-scroll scroll-px-4 sm:scroll-px-6 ${fadeClass}`}
        >
          {subTabsConfig.map((tab) => {
            const selected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-subtab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={(e) => handleSelectTab(tab.id, e.currentTarget)}
                className={`relative flex-none whitespace-nowrap pb-3 pt-1 text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                  selected
                    ? "text-[#073B72] font-bold"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                      selected
                        ? "bg-blue-50 text-[#073B72] border border-blue-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#073B72] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar for Sổ Thu & Sổ Chi */}
      {(activeSubTab === "thu" || activeSubTab === "chi") && (
        <search className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="funds-search-input" className="sr-only">
              Tìm kiếm chứng từ quỹ
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              size={16}
            />
            <input
              id="funds-search-input"
              name="fundsSearch"
              type="search"
              placeholder={
                activeSubTab === "thu"
                  ? "Tìm chủ hộ, mã HK, biên lai..."
                  : "Tìm nội dung chi, người nhận..."
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentContributionsPage(1);
                setCurrentExpendituresPage(1);
              }}
              className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor="funds-type-filter"
                className="text-xs font-semibold text-slate-600 flex items-center gap-1 whitespace-nowrap"
              >
                <Filter size={13} /> Loại quỹ:
              </label>
              <select
                id="funds-type-filter"
                name="fundFilter"
                value={fundFilter}
                onChange={(e) => {
                  setFundFilter(e.target.value);
                  setCurrentContributionsPage(1);
                  setCurrentExpendituresPage(1);
                }}
                className="h-9 px-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-emerald-600 max-w-[210px]"
              >
                <option value="Tất cả">Tất cả ({categories.length} quỹ)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {activeSubTab === "thu" && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="funds-status-filter"
                  className="text-xs font-semibold text-slate-600 whitespace-nowrap"
                >
                  Trạng thái:
                </label>
                <select
                  id="funds-status-filter"
                  name="statusFilter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentContributionsPage(1);
                  }}
                  className="h-9 px-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="Tất cả">Tất cả</option>
                  <option value="Đã nộp">Đã nộp</option>
                  <option value="Chưa nộp">Chưa nộp</option>
                </select>
              </div>
            )}

            {(searchTerm || fundFilter !== "Tất cả" || statusFilter !== "Tất cả") && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw size={13} /> Xóa lọc
              </button>
            )}

            {/* List / Card View Switcher */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Xem dạng Bảng"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-[#073B72] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Xem dạng Bảng"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-label="Xem dạng Thẻ"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "card"
                    ? "bg-white text-[#073B72] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Xem dạng Thẻ"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </search>
      )}

      {/* TAB 1: SỔ THU QUỸ */}
      {activeSubTab === "thu" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {viewMode === "table" ? (
            <div
              role="region"
              tabIndex={0}
              aria-label="Bảng sổ chi tiết các khoản thu quỹ"
              className="w-full overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-sm text-slate-800">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap">Biên lai</th>
                    <th className="px-3 xl:px-4 py-3">Đối tượng đóng góp</th>
                    <th className="px-3 xl:px-4 py-3">Loại quỹ</th>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap text-right">Số tiền</th>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap">Trạng thái & Ngày</th>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContributions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6">
                        <EmptyState
                          title="Chưa có phiếu thu phù hợp"
                          description="Thử xóa bộ lọc hiện tại hoặc ghi nhận phiếu thu mới cho quỹ."
                          actionText={!readOnly ? "Ghi nhận Phiếu Thu" : undefined}
                          onAction={!readOnly ? () => setShowAddThuModal(true) : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedContributions.map((cont) => {
                      const isPaid = cont.status === "Đã nộp";
                      const shortCode = formatReceiptCode(
                        cont.id,
                        cont.receiptCode,
                        "BL"
                      );
                      const payer = inferPayerMeta(cont);

                      return (
                        <tr key={cont.id} className="bg-white">
                          <td
                            className="px-3 xl:px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap"
                            title={`Mã hệ thống: ${cont.id}`}
                          >
                            {shortCode}
                          </td>
                          <td className="px-3 xl:px-4 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[#073B72] flex items-center justify-center font-bold text-xs shrink-0">
                                {cont.ownerName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 text-sm block truncate max-w-[240px]">
                                  {cont.ownerName}
                                </span>
                                <span className="text-xs text-slate-600 font-mono block">
                                  {payer.codeLabel}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 xl:px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-[#073B72] border border-blue-200 whitespace-nowrap">
                              {cont.fundName}
                            </span>
                          </td>
                          <td className="px-3 xl:px-4 py-3 font-mono font-bold text-slate-900 text-sm text-right whitespace-nowrap tabular-nums">
                            {cont.amount.toLocaleString("vi-VN")}đ
                          </td>
                          <td className="px-3 xl:px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge
                                status={isPaid ? "completed" : "pending"}
                                label={cont.status}
                                size="sm"
                              />
                              <span className="text-xs font-mono text-slate-600">
                                {cont.paidAt || "Chưa hoàn tất"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 xl:px-4 py-3 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt("THU", cont)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-colors whitespace-nowrap"
                                title="Xem và in biên lai"
                              >
                                <Printer size={13} /> Biên lai
                              </button>

                              {!readOnly && (
                                <>
                                  {isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateContributionStatus(cont.id, "Chưa nộp");
                                        showToast(`Đã chuyển ${shortCode} về trạng thái Chưa nộp.`);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 cursor-pointer transition-colors whitespace-nowrap"
                                    >
                                      Hủy thu
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setActiveVietQrContribution(cont)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#073B72] hover:bg-[#06305d] text-white text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                      >
                                        <QrCode size={13} /> VietQR
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const todayStr = new Date().toLocaleDateString("vi-VN");
                                          onUpdateContributionStatus(cont.id, "Đã nộp", todayStr);
                                          showToast(`Đã xác nhận thu ${shortCode}.`);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                      >
                                        Thu tiền
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingContribution(cont);
                                      setShowAddThuModal(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                                    title="Sửa phiếu thu"
                                    aria-label={`Sửa phiếu thu ${shortCode}`}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  {onDeleteContribution && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteContTarget(cont)}
                                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                      title="Xóa phiếu thu"
                                      aria-label={`Xóa phiếu thu ${shortCode}`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-slate-50">
              {filteredContributions.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    title="Chưa có phiếu thu phù hợp"
                    description="Thử xóa bộ lọc hiện tại hoặc ghi nhận phiếu thu mới."
                  />
                </div>
              ) : (
                paginatedContributions.map((cont) => {
                  const isPaid = cont.status === "Đã nộp";
                  const shortCode = formatReceiptCode(cont.id, cont.receiptCode, "BL");
                  const payer = inferPayerMeta(cont);

                  return (
                    <div
                      key={cont.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-semibold text-slate-600 block">
                            {shortCode}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                            {cont.ownerName}
                          </h4>
                          <p className="text-xs text-slate-600 font-mono mt-0.5">
                            {payer.codeLabel}
                          </p>
                        </div>
                        <StatusBadge
                          status={isPaid ? "completed" : "pending"}
                          label={cont.status}
                          size="sm"
                        />
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#073B72] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md truncate">
                          {cont.fundName}
                        </span>
                        <span className="font-bold text-slate-900 text-sm font-mono tabular-nums shrink-0">
                          {cont.amount.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center gap-2">
                        <span className="text-xs text-slate-600 font-mono">
                          {cont.paidAt || "Chờ nộp"}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt("THU", cont)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                            title="In biên lai"
                            aria-label={`In biên lai ${shortCode}`}
                          >
                            <Printer size={14} />
                          </button>
                          {!readOnly && (
                            <>
                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => onUpdateContributionStatus(cont.id, "Chưa nộp")}
                                  className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg cursor-pointer"
                                >
                                  Hủy thu
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setActiveVietQrContribution(cont)}
                                    className="text-xs font-semibold text-white bg-[#073B72] hover:bg-[#06305d] px-2.5 py-1 rounded-lg cursor-pointer"
                                  >
                                    QR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const todayStr = new Date().toLocaleDateString("vi-VN");
                                      onUpdateContributionStatus(cont.id, "Đã nộp", todayStr);
                                    }}
                                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg cursor-pointer"
                                  >
                                    Thu tiền
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContribution(cont);
                                  setShowAddThuModal(true);
                                }}
                                className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                                title="Sửa phiếu thu"
                                aria-label={`Sửa phiếu thu ${shortCode}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              {onDeleteContribution && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteContTarget(cont)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 cursor-pointer"
                                  title="Xóa phiếu thu"
                                  aria-label={`Xóa phiếu thu ${shortCode}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <Pagination
            id="contributions-pagination"
            currentPage={activeContributionsPage}
            totalItems={totalContributionsItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentContributionsPage}
          />
        </div>
      )}

      {/* TAB 2: SỔ CHI QUYẾT TOÁN */}
      {activeSubTab === "chi" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {viewMode === "table" ? (
            <div
              role="region"
              tabIndex={0}
              aria-label="Bảng sổ chi quyết toán các quỹ"
              className="w-full overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-sm text-slate-800">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap">Phiếu chi</th>
                    <th className="px-3 xl:px-4 py-3">Nội dung & Chứng từ</th>
                    <th className="px-3 xl:px-4 py-3">Quỹ trích chi</th>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap text-right">Số tiền chi</th>
                    <th className="px-3 xl:px-4 py-3">Đơn vị nhận & Ngày</th>
                    <th className="px-3 xl:px-4 py-3 whitespace-nowrap text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenditures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6">
                        <EmptyState
                          title="Chưa có phiếu chi phù hợp"
                          description="Các khoản chi công khai sẽ hiển thị tại đây khi Ban Điều Hành lập phiếu quyết toán."
                          actionText={!readOnly ? "Tạo Phiếu Chi" : undefined}
                          onAction={!readOnly ? () => setShowAddChiModal(true) : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenditures.map((exp) => {
                      const shortVoucher = formatReceiptCode(
                        exp.id,
                        exp.voucherCode,
                        "PC"
                      );
                      return (
                        <tr key={exp.id} className="bg-white">
                          <td className="px-3 xl:px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {shortVoucher}
                          </td>
                          <td className="px-3 xl:px-4 py-3 max-w-md">
                            <p className="font-semibold text-slate-900 line-clamp-2 leading-snug">
                              {exp.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1">
                              <span>Duyệt: <strong>{exp.approvedBy}</strong></span>
                              {exp.evidence && (
                                <span className="font-mono">CT: <strong>{exp.evidence}</strong></span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 xl:px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                              {exp.fundName}
                            </span>
                          </td>
                          <td className="px-3 xl:px-4 py-3 font-mono font-bold text-rose-700 text-sm text-right whitespace-nowrap tabular-nums">
                            -{exp.amount.toLocaleString("vi-VN")}đ
                          </td>
                          <td className="px-3 xl:px-4 py-3">
                            <span className="font-semibold text-slate-900 block">
                              {exp.receiver}
                            </span>
                            <span className="text-xs font-mono text-slate-600">
                              {exp.spentAt}
                            </span>
                          </td>
                          <td className="px-3 xl:px-4 py-3 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt("CHI", exp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
                              >
                                <Printer size={13} /> Phiếu chi
                              </button>
                              {!readOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingExpenditure(exp);
                                      setShowAddChiModal(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                                    title="Sửa phiếu chi"
                                    aria-label={`Sửa phiếu chi ${shortVoucher}`}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteExpTarget(exp)}
                                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                    title="Xóa phiếu chi"
                                    aria-label={`Xóa phiếu chi ${shortVoucher}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-slate-50">
              {filteredExpenditures.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    title="Chưa có phiếu chi phù hợp"
                    description="Các khoản chi công khai sẽ hiển thị tại đây."
                  />
                </div>
              ) : (
                paginatedExpenditures.map((exp) => {
                  const shortVoucher = formatReceiptCode(
                    exp.id,
                    exp.voucherCode,
                    "PC"
                  );
                  return (
                    <div
                      key={exp.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            {shortVoucher}
                          </span>
                          <span className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            {exp.fundName}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                          {exp.title}
                        </h4>
                        <p className="text-xs text-slate-600">
                          Duyệt: <strong>{exp.approvedBy}</strong>
                          {exp.evidence ? ` • CT: ${exp.evidence}` : ""}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs text-slate-600 block">Thụ hưởng</span>
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {exp.receiver}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-700 text-sm tabular-nums shrink-0">
                          -{exp.amount.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center gap-2">
                        <span className="text-xs text-slate-600 font-mono">
                          {exp.spentAt}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt("CHI", exp)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                            title="In phiếu chi"
                            aria-label={`In phiếu chi ${shortVoucher}`}
                          >
                            <Printer size={14} />
                          </button>
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpenditure(exp);
                                  setShowAddChiModal(true);
                                }}
                                className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                                title="Sửa phiếu chi"
                                aria-label={`Sửa phiếu chi ${shortVoucher}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteExpTarget(exp)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 cursor-pointer"
                                title="Xóa phiếu chi"
                                aria-label={`Xóa phiếu chi ${shortVoucher}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <Pagination
            id="expenditures-pagination"
            currentPage={activeExpendituresPage}
            totalItems={totalExpendituresItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentExpendituresPage}
          />
        </div>
      )}

      {/* TAB 3: QUẢN LÝ DANH MỤC CÁC LOẠI QUỸ (MỞ RỘNG / SỬA / XÓA) */}
      {activeSubTab === "danhmuc" && (
        <FundCatalogManager
          categories={categories}
          contributions={contributions}
          expenditures={expenditures}
          households={households}
          readOnly={readOnly}
          externalCreateTrigger={createCategoryTrigger}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onBatchGenerateReminders={handleBatchGenerateReminders}
          onNavigateToLedger={(fName, targetTab) => {
            setFundFilter(fName);
            setActiveSubTab(targetTab);
          }}
        />
      )}

      {/* TAB 4: BÁO CÁO CÂN ĐỐI THU CHI & BIỂU ĐỒ */}
      {activeSubTab === "baocao" && (
        <div className="space-y-5">
          {/* Bar Chart Comparison */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Biểu đồ Thu – Chi – Tồn theo Từng Quỹ (Năm 2026)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tổng hợp đầy đủ {categories.length} quỹ hiện hành trong danh mục KP3
                </p>
              </div>
              <StatusBadge status="completed" label="Tự động đối soát" size="sm" />
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={listFundsStats}
                  margin={{ top: 10, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1_000_000 ? `${Math.round(v / 1_000_000)}tr` : String(v)
                    }
                    tick={{ fill: "#475569", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(val: any) =>
                      `${Number(val || 0).toLocaleString("vi-VN")} VNĐ`
                    }
                    labelFormatter={(label) => {
                      const found = listFundsStats.find(
                        (s) => s.shortLabel === label
                      );
                      return found ? found.name : String(label);
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="revenue"
                    name="Thực thu"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Đã chi"
                    fill="#B4232D"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="balance"
                    name="Tồn cuối"
                    fill="#073B72"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Balance Sheet Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Bảng Cân Đối Tài Chính Chi Tiết Từng Loại Quỹ
              </h3>
              <span className="text-xs font-mono font-semibold text-slate-600">
                Đơn vị: VNĐ
              </span>
            </div>

            <div
              role="region"
              tabIndex={0}
              aria-label="Bảng cân đối tài chính từng quỹ"
              className="w-full overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Loại quỹ</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Đầu kỳ</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Thực thu</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Chờ thu</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Đã chi</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Tồn cuối</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tiến độ chỉ tiêu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listFundsStats.map((stat) => (
                    <tr key={stat.category.id} className="bg-white">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                            {stat.shortLabel}
                          </span>
                          <span className="font-bold text-slate-900">
                            {stat.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {stat.openingBalance.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                        +{stat.revenue.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-800 tabular-nums whitespace-nowrap">
                        {stat.pending.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-700 tabular-nums whitespace-nowrap">
                        -{stat.expense.toLocaleString("vi-VN")}đ
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-extrabold tabular-nums whitespace-nowrap ${
                          stat.balance >= 0 ? "text-slate-900" : "text-rose-700"
                        }`}
                      >
                        {stat.balance.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${stat.targetPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-700 w-9 text-right">
                            {stat.targetPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CỔNG TRA CỨU & ĐÓNG QUỸ VIETQR */}
      {activeSubTab === "qr_portal" && (
        <HouseholdFundLookup
          contributions={contributions}
          households={households}
          categories={categories}
          readOnly={readOnly}
          onOpenReceipt={handleOpenReceipt}
          onUpdateContributionStatus={onUpdateContributionStatus}
        />
      )}

      {/* MODALS */}
      {!readOnly && (
        <>
          <AddContributionModal
            isOpen={showAddThuModal}
            onClose={() => {
              setShowAddThuModal(false);
              setEditingContribution(null);
            }}
            categories={categories}
            households={households}
            defaultFundName={fundFilter !== "Tất cả" ? fundFilter : undefined}
            editingItem={editingContribution}
            onSubmit={handleSaveThu}
          />

          <AddExpenditureModal
            isOpen={showAddChiModal}
            onClose={() => {
              setShowAddChiModal(false);
              setEditingExpenditure(null);
            }}
            categories={categories}
            contributions={contributions}
            expenditures={expenditures}
            defaultFundName={fundFilter !== "Tất cả" ? fundFilter : undefined}
            editingItem={editingExpenditure}
            onSubmit={handleSaveChi}
          />

          <DeleteExpenditureModal
            expenditure={deleteExpTarget}
            onClose={() => setDeleteExpTarget(null)}
            onConfirmDelete={handleConfirmDeleteChi}
          />

          <ConfirmModal
            isOpen={Boolean(deleteContTarget)}
            onClose={() => setDeleteContTarget(null)}
            onConfirm={handleConfirmDeleteCont}
            title="Xác nhận xóa phiếu thu"
            description={
              deleteContTarget
                ? `Bạn chắc chắn muốn xóa phiếu thu ${formatReceiptCode(
                    deleteContTarget.id,
                    deleteContTarget.receiptCode,
                    "BL"
                  )} của "${deleteContTarget.ownerName}" (${deleteContTarget.amount.toLocaleString(
                    "vi-VN"
                  )}đ)?`
                : ""
            }
            confirmLabel="Xóa phiếu thu"
            variant="danger"
          />
        </>
      )}

      <ReceiptPrintModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      {activeVietQrContribution && (
        <VietQrModal
          contribution={activeVietQrContribution}
          category={findCategoryByFundName(
            categories,
            activeVietQrContribution.fundName
          )}
          readOnly={readOnly}
          onClose={() => setActiveVietQrContribution(null)}
          onConfirmPaid={
            readOnly
              ? undefined
              : (id) => {
                  const todayStr = new Date().toLocaleDateString("vi-VN");
                  onUpdateContributionStatus(id, "Đã nộp", todayStr);
                  showToast("Đã xác nhận chuyển khoản VietQR thành công.");
                }
          }
        />
      )}
    </div>
  );
}
