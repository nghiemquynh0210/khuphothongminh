import React, { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  PlayCircle,
  PauseCircle,
  FolderPlus,
  Users,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Landmark,
  ShieldAlert,
  Coins,
} from "lucide-react";
import {
  FundAudience,
  FundCategory,
  FundContribution,
  FundExpenditure,
  FundGroup,
  FundStatus,
  Household,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { BANK_CONFIG } from "./VietQrModal";
import { doesRecordMatchCategory, normalizeFundKey } from "./fundCatalog";

interface FundCatalogManagerProps {
  categories: FundCategory[];
  contributions: FundContribution[];
  expenditures: FundExpenditure[];
  households: Household[];
  readOnly?: boolean;
  externalCreateTrigger?: number;
  onCreateCategory: (cat: FundCategory) => void;
  onUpdateCategory: (prevName: string, updated: FundCategory, syncRecords: boolean) => void;
  onDeleteCategory: (cat: FundCategory, reassignToFundName?: string) => void;
  onBatchGenerateReminders: (
    category: FundCategory,
    selectedHouseholds: Household[],
    customAmount: number
  ) => void;
  onNavigateToLedger: (fundName: string, tab: "thu" | "chi") => void;
}

const FUND_GROUP_OPTIONS: FundGroup[] = [
  "Bắt buộc / Chỉ tiêu",
  "Vận động tự nguyện",
  "Quỹ tự quản khu phố",
];

const FUND_AUDIENCE_OPTIONS: FundAudience[] = [
  "Hộ dân & Tổ chức",
  "Hộ dân",
  "Doanh nghiệp & Tổ chức",
];

const FUND_STATUS_OPTIONS: FundStatus[] = [
  "Đang vận động",
  "Tạm dừng",
  "Đã khóa sổ",
];

export default function FundCatalogManager({
  categories,
  contributions,
  expenditures,
  households,
  readOnly = false,
  externalCreateTrigger = 0,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onBatchGenerateReminders,
  onNavigateToLedger,
}: FundCatalogManagerProps) {
  const [groupFilter, setGroupFilter] = useState<string>("Tất cả");
  const [editingCat, setEditingCat] = useState<FundCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Safe Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<FundCategory | null>(null);
  const [reassignTargetName, setReassignTargetName] = useState<string>("");

  // Batch Campaign Modal State
  const [campaignFund, setCampaignFund] = useState<FundCategory | null>(null);
  const [campaignAmount, setCampaignAmount] = useState<number>(100000);
  const [selectedHouseholdCodes, setSelectedHouseholdCodes] = useState<string[]>([]);
  const [onlyMissingHouseholds, setOnlyMissingHouseholds] = useState(true);

  // Form Fields for Add/Edit Fund Category
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formGroup, setFormGroup] = useState<FundGroup>("Vận động tự nguyện");
  const [formAudience, setFormAudience] = useState<FundAudience>("Hộ dân & Tổ chức");
  const [formDefaultAmount, setFormDefaultAmount] = useState<string>("100000");
  const [formAnnualTarget, setFormAnnualTarget] = useState<string>("10000000");
  const [formOpeningBalance, setFormOpeningBalance] = useState<string>("0");
  const [formStatus, setFormStatus] = useState<FundStatus>("Đang vận động");
  const [formDescription, setFormDescription] = useState("");
  const [formCustomBankAcc, setFormCustomBankAcc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [syncRenamedRecords, setSyncRenamedRecords] = useState(true);

  const lastTriggerRef = React.useRef(externalCreateTrigger);
  React.useEffect(() => {
    if (externalCreateTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = externalCreateTrigger;
      openCreateModal();
    }
  }, [externalCreateTrigger]);

  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const linkedConts = contributions.filter((c) =>
        doesRecordMatchCategory(c.fundName, cat, categories)
      );
      const linkedExps = expenditures.filter((e) =>
        doesRecordMatchCategory(e.fundName, cat, categories)
      );
      const paidTotal = linkedConts
        .filter((c) => c.status === "Đã nộp")
        .reduce((sum, c) => sum + c.amount, 0);
      const pendingTotal = linkedConts
        .filter((c) => c.status !== "Đã nộp")
        .reduce((sum, c) => sum + c.amount, 0);
      const spentTotal = linkedExps.reduce((sum, e) => sum + e.amount, 0);
      const endingBalance = cat.openingBalance + paidTotal - spentTotal;
      const targetPercent =
        cat.annualTarget > 0 ? Math.min(100, Math.round((paidTotal / cat.annualTarget) * 100)) : 0;

      return {
        category: cat,
        thuCount: linkedConts.length,
        chiCount: linkedExps.length,
        linkedTotalCount: linkedConts.length + linkedExps.length,
        paidTotal,
        pendingTotal,
        spentTotal,
        endingBalance,
        targetPercent,
      };
    });
  }, [categories, contributions, expenditures]);

  const filteredStats = useMemo(() => {
    if (groupFilter === "Tất cả") return categoryStats;
    return categoryStats.filter((item) => item.category.group === groupFilter);
  }, [categoryStats, groupFilter]);

  function openCreateModal() {
    setEditingCat(null);
    setFormCode("");
    setFormName("");
    setFormGroup("Vận động tự nguyện");
    setFormAudience("Hộ dân & Tổ chức");
    setFormDefaultAmount("100000");
    setFormAnnualTarget("10000000");
    setFormOpeningBalance("0");
    setFormStatus("Đang vận động");
    setFormDescription("");
    setFormCustomBankAcc("");
    setFormError(null);
    setSyncRenamedRecords(true);
    setIsFormOpen(true);
  }

  function openEditModal(cat: FundCategory) {
    setEditingCat(cat);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormGroup(cat.group);
    setFormAudience(cat.targetAudience);
    setFormDefaultAmount(String(cat.defaultAmount));
    setFormAnnualTarget(String(cat.annualTarget));
    setFormOpeningBalance(String(cat.openingBalance));
    setFormStatus(cat.status);
    setFormDescription(cat.description || "");
    setFormCustomBankAcc(cat.bankAccountNo || "");
    setFormError(null);
    setSyncRenamedRecords(true);
    setIsFormOpen(true);
  }

  function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanCode = formCode.trim().toUpperCase();

    if (!cleanName || cleanName.length < 3) {
      setFormError("Vui lòng nhập Tên loại quỹ (tối thiểu 3 ký tự).");
      return;
    }
    if (!cleanCode || cleanCode.length < 2) {
      setFormError("Vui lòng nhập Mã viết tắt quỹ (ví dụ: KH, VNN, CAM).");
      return;
    }

    const duplicate = categories.find(
      (c) =>
        normalizeFundKey(c.name) === normalizeFundKey(cleanName) &&
        c.id !== editingCat?.id
    );
    if (duplicate) {
      setFormError(`Quỹ "${cleanName}" đã tồn tại trong danh mục.`);
      return;
    }

    const defaultAmt = Math.max(0, Number(formDefaultAmount) || 0);
    const targetAmt = Math.max(0, Number(formAnnualTarget) || 0);
    const openingBal = Number(formOpeningBalance) || 0;

    if (editingCat) {
      const updated: FundCategory = {
        ...editingCat,
        code: cleanCode,
        name: cleanName,
        group: formGroup,
        targetAudience: formAudience,
        defaultAmount: defaultAmt,
        annualTarget: targetAmt,
        openingBalance: openingBal,
        status: formStatus,
        description: formDescription.trim(),
        bankAccountNo: formCustomBankAcc.trim() || undefined,
      };
      onUpdateCategory(editingCat.name, updated, syncRenamedRecords);
    } else {
      const newCat: FundCategory = {
        id: `FUND-${cleanCode}-${Date.now().toString().slice(-4)}`,
        code: cleanCode,
        name: cleanName,
        group: formGroup,
        targetAudience: formAudience,
        defaultAmount: defaultAmt,
        annualTarget: targetAmt,
        openingBalance: openingBal,
        status: formStatus,
        description: formDescription.trim(),
        bankAccountNo: formCustomBankAcc.trim() || undefined,
        isDefault: false,
        createdAt: new Date().toLocaleDateString("vi-VN"),
      };
      onCreateCategory(newCat);
    }

    setIsFormOpen(false);
  }

  function openBatchCampaign(cat: FundCategory) {
    setCampaignFund(cat);
    setCampaignAmount(cat.defaultAmount || 100000);
    setOnlyMissingHouseholds(true);

    const existingHouseholdCodes = new Set(
      contributions
        .filter((c) => doesRecordMatchCategory(c.fundName, cat, categories))
        .map((c) => c.householdCode)
    );
    const missingCodes = households
      .filter((h) => !existingHouseholdCodes.has(h.code))
      .map((h) => h.code);
    setSelectedHouseholdCodes(missingCodes);
  }

  function handleQuickStatusCycle(cat: FundCategory) {
    const nextStatus: FundStatus =
      cat.status === "Đang vận động"
        ? "Tạm dừng"
        : cat.status === "Tạm dừng"
        ? "Đã khóa sổ"
        : "Đang vận động";
    onUpdateCategory(cat.name, { ...cat, status: nextStatus }, false);
  }

  const deleteStat = useMemo(() => {
    if (!deleteTarget) return null;
    return categoryStats.find((s) => s.category.id === deleteTarget.id) || null;
  }, [deleteTarget, categoryStats]);

  const eligibleCampaignHouseholds = useMemo(() => {
    if (!campaignFund) return [];
    const existingCodes = new Set(
      contributions
        .filter((c) => doesRecordMatchCategory(c.fundName, campaignFund, categories))
        .map((c) => c.householdCode)
    );
    return households.map((h) => ({
      household: h,
      alreadyAssigned: existingCodes.has(h.code),
    }));
  }, [campaignFund, households, contributions, categories]);

  const visibleCampaignHouseholds = onlyMissingHouseholds
    ? eligibleCampaignHouseholds.filter((item) => !item.alreadyAssigned)
    : eligibleCampaignHouseholds;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["Tất cả", ...FUND_GROUP_OPTIONS].map((grp) => {
            const active = groupFilter === grp;
            const count =
              grp === "Tất cả"
                ? categories.length
                : categories.filter((c) => c.group === grp).length;
            return (
              <button
                key={grp}
                type="button"
                onClick={() => setGroupFilter(grp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
                  active
                    ? "bg-[#073B72] text-white border-[#073B72]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {grp} ({count})
              </button>
            );
          })}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="emerald"
              size="md"
              leftIcon={<FolderPlus size={15} />}
              onClick={openCreateModal}
            >
              Thêm loại Quỹ mới
            </Button>
          </div>
        )}
      </div>

      {/* Category Cards Grid */}
      {filteredStats.length === 0 ? (
        <EmptyState
          title="Chưa có loại quỹ nào trong nhóm này"
          description="Bạn có thể tạo mới loại quỹ phù hợp với kế hoạch vận động tại Khu phố 3 hoặc chuyển bộ lọc sang Tất cả."
          actionText={!readOnly ? "Thêm loại Quỹ mới" : undefined}
          onAction={!readOnly ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStats.map((stat) => {
            const { category } = stat;
            const badgeStatus =
              category.status === "Đang vận động"
                ? "completed"
                : category.status === "Tạm dừng"
                ? "pending"
                : "info";

            return (
              <article
                key={category.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                {/* Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold shrink-0">
                        {category.code}
                      </span>
                      <span className="text-xs font-semibold text-[#073B72] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md truncate">
                        {category.group}
                      </span>
                    </div>
                    <StatusBadge
                      status={badgeStatus}
                      label={category.status}
                      size="sm"
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                    <span>
                      Định mức:{" "}
                      <strong className="font-mono text-slate-900">
                        {category.defaultAmount.toLocaleString("vi-VN")}đ
                      </strong>
                    </span>
                    <span>
                      Đối tượng:{" "}
                      <strong className="text-slate-800">{category.targetAudience}</strong>
                    </span>
                  </div>
                </div>

                {/* Live Balances */}
                <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Thực thu
                      </span>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        +{stat.paidTotal.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Đã chi
                      </span>
                      <span className="font-mono font-bold text-rose-700 tabular-nums">
                        -{stat.spentTotal.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Tồn hiện tại
                      </span>
                      <span
                        className={`font-mono font-extrabold tabular-nums ${
                          stat.endingBalance >= 0 ? "text-slate-900" : "text-rose-700"
                        }`}
                      >
                        {stat.endingBalance.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>
                        Tiến độ chỉ tiêu ({category.annualTarget.toLocaleString("vi-VN")}đ)
                      </span>
                      <span className="font-mono text-slate-900">{stat.targetPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${stat.targetPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigateToLedger(category.name, "thu")}
                      className="text-xs font-semibold text-slate-700 hover:text-[#073B72] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {stat.thuCount} phiếu thu
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToLedger(category.name, "chi")}
                      className="text-xs font-semibold text-slate-700 hover:text-rose-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {stat.chiCount} phiếu chi
                    </button>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      {category.status === "Đang vận động" && households.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openBatchCampaign(category)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                          title="Phát hành phiếu nhắc thu cho các hộ dân"
                          aria-label={`Phát hành đợt thu ${category.name}`}
                        >
                          <Users size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleQuickStatusCycle(category)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                        title="Đổi trạng thái (Đang vận động / Tạm dừng / Khóa sổ)"
                        aria-label={`Đổi trạng thái ${category.name}`}
                      >
                        {category.status === "Đang vận động" ? (
                          <PauseCircle size={15} />
                        ) : category.status === "Tạm dừng" ? (
                          <Lock size={15} />
                        ) : (
                          <PlayCircle size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(category)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-[#073B72] hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                        title="Chỉnh sửa thông tin quỹ"
                        aria-label={`Sửa ${category.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(category);
                          const fallbackOther = categories.find(
                            (other) => other.id !== category.id
                          );
                          setReassignTargetName(fallbackOther?.name || "");
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title="Xóa hoặc ngừng sử dụng quỹ"
                        aria-label={`Xóa ${category.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT FUND CATEGORY */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCat ? `Chỉnh sửa: ${editingCat.name}` : "Thêm Loại Quỹ Mới Khu Phố 3"}
        description="Cấu hình linh hoạt tên quỹ, nhóm vận động, định mức gợi ý và số dư chuyển kỳ cho Ban Điều Hành."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              form="fund-category-form"
              variant="primary"
              leftIcon={editingCat ? <CheckCircle2 size={15} /> : <Plus size={15} />}
            >
              {editingCat ? "Lưu thay đổi quỹ" : "Tạo loại quỹ mới"}
            </Button>
          </>
        }
      >
        <form id="fund-category-form" onSubmit={handleSaveCategory} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="fund-cat-code"
              label="Mã viết tắt *"
              required
              placeholder="VD: KH, ANQP, CAM"
              value={formCode}
              onChange={(e) => {
                setFormCode(e.target.value.toUpperCase());
                setFormError(null);
              }}
              className="font-mono uppercase"
              maxLength={10}
            />
            <div className="sm:col-span-2">
              <Input
                id="fund-cat-name"
                label="Tên loại quỹ *"
                required
                placeholder="VD: Quỹ Lắp đặt Camera An ninh Hẻm 42"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError(null);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fund-cat-group" className="text-xs font-semibold text-slate-700">
                Phân loại nhóm quỹ *
              </label>
              <select
                id="fund-cat-group"
                value={formGroup}
                onChange={(e) => setFormGroup(e.target.value as FundGroup)}
                className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {FUND_GROUP_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fund-cat-audience" className="text-xs font-semibold text-slate-700">
                Đối tượng áp dụng
              </label>
              <select
                id="fund-cat-audience"
                value={formAudience}
                onChange={(e) => setFormAudience(e.target.value as FundAudience)}
                className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {FUND_AUDIENCE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fund-cat-status" className="text-xs font-semibold text-slate-700">
                Trạng thái vận động
              </label>
              <select
                id="fund-cat-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as FundStatus)}
                className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {FUND_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="fund-cat-default-amount"
              label="Định mức gợi ý / Hộ (VNĐ)"
              type="number"
              min={0}
              step={10000}
              value={formDefaultAmount}
              onChange={(e) => setFormDefaultAmount(e.target.value)}
              className="font-mono font-semibold"
            />
            <Input
              id="fund-cat-annual-target"
              label="Chỉ tiêu cả năm (VNĐ)"
              type="number"
              min={0}
              step={100000}
              value={formAnnualTarget}
              onChange={(e) => setFormAnnualTarget(e.target.value)}
              className="font-mono font-semibold"
            />
            <Input
              id="fund-cat-opening"
              label="Số dư đầu kỳ (VNĐ)"
              type="number"
              step={10000}
              value={formOpeningBalance}
              onChange={(e) => setFormOpeningBalance(e.target.value)}
              helperText="Tồn năm trước chuyển sang"
              className="font-mono font-semibold"
            />
          </div>

          <Input
            id="fund-cat-bank"
            label="Số tài khoản VietQR riêng (nếu không dùng tài khoản chung BQL)"
            placeholder={`Mặc định dùng: ${BANK_CONFIG.accountNo} (${BANK_CONFIG.bankId.toUpperCase()})`}
            value={formCustomBankAcc}
            onChange={(e) => setFormCustomBankAcc(e.target.value)}
            className="font-mono"
            leftIcon={<Landmark size={15} />}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fund-cat-desc" className="text-xs font-semibold text-slate-700">
              Mục đích chi tiêu & Ghi chú quy ước khu phố
            </label>
            <textarea
              id="fund-cat-desc"
              rows={2}
              placeholder="Ghi rõ mục đích sử dụng quỹ để công khai minh bạch với cư dân..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full p-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {editingCat && normalizeFundKey(editingCat.name) !== normalizeFundKey(formName || editingCat.name) && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={syncRenamedRecords}
                onChange={(e) => setSyncRenamedRecords(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <strong>Đồng bộ tên mới cho toàn bộ chứng từ cũ:</strong> Tự động cập nhật tên quỹ trên
                tất cả phiếu thu & phiếu chi đang mang tên <em>"{editingCat.name}"</em>.
              </span>
            </label>
          )}
        </form>
      </Modal>

      {/* MODAL: SAFE DELETE FUND CATEGORY */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Xóa loại quỹ: ${deleteTarget?.name || ""}`}
        description="Kiểm tra ràng buộc dữ liệu tài chính trước khi gỡ khỏi danh mục."
        size="lg"
        footer={
          deleteStat && deleteStat.linkedTotalCount === 0 ? (
            <>
              <Button variant="outline" autoFocus onClick={() => setDeleteTarget(null)}>
                Giữ lại
              </Button>
              <Button
                variant="destructive"
                leftIcon={<Trash2 size={15} />}
                onClick={() => {
                  if (deleteTarget) onDeleteCategory(deleteTarget);
                  setDeleteTarget(null);
                }}
              >
                Xóa vĩnh viễn quỹ này
              </Button>
            </>
          ) : (
            <Button variant="outline" autoFocus onClick={() => setDeleteTarget(null)}>
              Đóng
            </Button>
          )
        }
      >
        {deleteTarget && deleteStat && (
          <div className="space-y-4 text-sm text-slate-700">
            {deleteStat.linkedTotalCount === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-700" />
                  Quỹ này chưa phát sinh phiếu thu hoặc phiếu chi nào
                </p>
                <p>
                  Bạn có thể xóa vĩnh viễn <strong>{deleteTarget.name}</strong> mà không ảnh hưởng đến
                  lịch sử kế toán Khu phố 3.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-sm">
                    <ShieldAlert size={16} className="text-rose-700" />
                    Phát hiện {deleteStat.thuCount} phiếu thu & {deleteStat.chiCount} phiếu chi đang liên kết
                  </p>
                  <p>
                    Để đảm bảo sổ sách minh bạch, hệ thống không xóa trắng chứng từ. Hãy chọn 1 trong 2 phương án an toàn sau:
                  </p>
                </div>

                {/* Option 1: Lock/Archive */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Phương án 1 (Khuyến nghị): Khóa sổ & Ngừng vận động mới
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Ẩn quỹ này khỏi form thu mới nhưng giữ nguyên toàn bộ biên lai cũ và báo cáo quyết toán lịch sử.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Lock size={14} />}
                      onClick={() => {
                        onUpdateCategory(
                          deleteTarget.name,
                          { ...deleteTarget, status: "Đã khóa sổ" },
                          false
                        );
                        setDeleteTarget(null);
                      }}
                    >
                      Khóa sổ quỹ
                    </Button>
                  </div>
                </div>

                {/* Option 2: Reassign and Delete */}
                {categories.length > 1 && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Phương án 2: Chuyển chứng từ sang quỹ khác rồi xóa
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Gộp toàn bộ {deleteStat.linkedTotalCount} chứng từ thu/chi hiện có vào một quỹ phù hợp hơn trước khi xóa.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        aria-label="Chọn quỹ đích nhận chuyển giao chứng từ"
                        value={reassignTargetName}
                        onChange={(e) => setReassignTargetName(e.target.value)}
                        className="flex-1 h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300"
                      >
                        {categories
                          .filter((c) => c.id !== deleteTarget.id)
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                      </select>
                      <Button
                        variant="destructive"
                        size="sm"
                        leftIcon={<ArrowRightLeft size={14} />}
                        disabled={!reassignTargetName}
                        onClick={() => {
                          onDeleteCategory(deleteTarget, reassignTargetName);
                          setDeleteTarget(null);
                        }}
                      >
                        Chuyển & Xóa quỹ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL: BATCH GENERATE REMINDERS BY HOUSEHOLD */}
      <Modal
        isOpen={Boolean(campaignFund)}
        onClose={() => setCampaignFund(null)}
        title={`Phát hành Đợt thu: ${campaignFund?.name || ""}`}
        description="Tạo nhanh danh sách phiếu nhắc thu (Trạng thái Chưa nộp) cho các Hộ khẩu để Ban Điều Hành dễ theo dõi tiến độ & tạo mã VietQR hàng loạt."
        size="2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCampaignFund(null)}>
              Hủy
            </Button>
            <Button
              variant="emerald"
              leftIcon={<Coins size={15} />}
              disabled={selectedHouseholdCodes.length === 0 || campaignAmount <= 0}
              onClick={() => {
                if (!campaignFund) return;
                const chosen = households.filter((h) =>
                  selectedHouseholdCodes.includes(h.code)
                );
                onBatchGenerateReminders(campaignFund, chosen, campaignAmount);
                setCampaignFund(null);
              }}
            >
              Phát hành cho {selectedHouseholdCodes.length} hộ
            </Button>
          </>
        }
      >
        {campaignFund && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="batch-amount"
                label="Mức vận động mỗi hộ (VNĐ)"
                type="number"
                min={10000}
                step={10000}
                value={campaignAmount}
                onChange={(e) => setCampaignAmount(Number(e.target.value) || 0)}
                className="font-mono font-bold"
              />
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer h-9 px-3 rounded-lg border border-slate-200 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={onlyMissingHouseholds}
                    onChange={(e) => setOnlyMissingHouseholds(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>Chỉ hiện hộ chưa có phiếu ở quỹ này</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Chọn hộ khẩu áp dụng ({selectedHouseholdCodes.length}/{visibleCampaignHouseholds.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedHouseholdCodes(
                      visibleCampaignHouseholds.map((item) => item.household.code)
                    )
                  }
                  className="text-xs font-semibold text-[#073B72] hover:underline cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedHouseholdCodes([])}
                  className="text-xs font-semibold text-slate-600 hover:underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {visibleCampaignHouseholds.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600">
                  Tất cả các hộ trong danh sách đã được lập phiếu thu cho quỹ này.
                </div>
              ) : (
                visibleCampaignHouseholds.map(({ household, alreadyAssigned }) => {
                  const checked = selectedHouseholdCodes.includes(household.code);
                  return (
                    <label
                      key={household.code}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHouseholdCodes((prev) => [...prev, household.code]);
                            } else {
                              setSelectedHouseholdCodes((prev) =>
                                prev.filter((code) => code !== household.code)
                              );
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {household.ownerName}{" "}
                            <span className="font-mono text-slate-600 font-semibold">
                              ({household.code})
                            </span>
                          </div>
                          <div className="text-slate-600 truncate">{household.address}</div>
                        </div>
                      </div>
                      {alreadyAssigned && (
                        <StatusBadge status="info" label="Đã có phiếu" size="sm" showIcon={false} />
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

