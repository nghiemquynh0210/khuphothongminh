import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  Building,
  CheckCircle2,
  Coins,
  Printer,
  Trash2,
} from "lucide-react";
import {
  FundCategory,
  FundContribution,
  FundExpenditure,
  Household,
} from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { DetailRow } from "../common/DetailRow";
import {
  docSoTiengViet,
  doesRecordMatchCategory,
  findCategoryByFundName,
  formatReceiptCode,
} from "./fundCatalog";

export interface ReceiptPreviewData {
  type: "THU" | "CHI";
  id: string;
  receiptCode?: string;
  date: string;
  amount: number;
  title: string;
  subject: string;
  subDetail: string;
  evidence?: string;
  fundName: string;
  approvedBy?: string;
}

interface AddContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: FundCategory[];
  households: Household[];
  defaultFundName?: string;
  editingItem?: FundContribution | null;
  onSubmit: (contribution: FundContribution) => void;
}

export function AddContributionModal({
  isOpen,
  onClose,
  categories,
  households,
  defaultFundName,
  editingItem,
  onSubmit,
}: AddContributionModalProps) {
  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === "Đang vận động"),
    [categories]
  );
  const selectableCategories =
    activeCategories.length > 0 ? activeCategories : categories;

  const [payerType, setPayerType] = useState<
    "household" | "enterprise" | "sponsor"
  >("household");
  const [fundName, setFundName] = useState<string>("");
  const [householdCode, setHouseholdCode] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [amount, setAmount] = useState<string>("200000");
  const [paymentMethod, setPaymentMethod] = useState<
    "Tiền mặt" | "VietQR" | "Chuyển khoản"
  >("Tiền mặt");
  const [payImmediately, setPayImmediately] = useState(true);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setPayerType(editingItem.payerType || "household");
      setFundName(editingItem.fundName);
      setHouseholdCode(editingItem.householdCode || "");
      setOwnerName(editingItem.ownerName || "");
      setAmount(String(editingItem.amount || 0));
      setPaymentMethod(editingItem.paymentMethod || "Tiền mặt");
      setPayImmediately(editingItem.status === "Đã nộp");
      setNote(editingItem.note || "");
      setFormError(null);
      return;
    }
    const initialFund =
      selectableCategories.find((c) => c.name === defaultFundName) ||
      selectableCategories[0];
    if (initialFund) {
      setFundName(initialFund.name);
      setAmount(String(initialFund.defaultAmount || 100000));
    }
    setPayerType("household");
    setHouseholdCode("");
    setOwnerName("");
    setPaymentMethod("Tiền mặt");
    setPayImmediately(true);
    setNote("");
    setFormError(null);
  }, [isOpen, defaultFundName, selectableCategories, editingItem]);

  const handleFundSelectChange = (selectedName: string) => {
    setFundName(selectedName);
    const matched = findCategoryByFundName(categories, selectedName);
    if (matched && matched.defaultAmount > 0) {
      setAmount(String(matched.defaultAmount));
    }
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount) || 0;
    const cleanOwner = ownerName.trim();
    const cleanCode = householdCode.trim();

    if (!fundName) {
      setFormError("Vui lòng chọn loại quỹ đóng góp.");
      return;
    }
    if (!cleanOwner) {
      setFormError("Vui lòng nhập tên người đại diện hoặc đơn vị đóng nộp.");
      return;
    }
    if (payerType === "household" && !cleanCode) {
      setFormError("Vui lòng nhập Mã sổ hộ khẩu (ví dụ: HK-301).");
      return;
    }
    if (numericAmount <= 0) {
      setFormError("Số tiền đóng góp phải lớn hơn 0 VNĐ.");
      return;
    }

    const selectedCat = findCategoryByFundName(categories, fundName);
    const prefix = selectedCat?.code || "PT";
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const shortReceipt =
      editingItem?.receiptCode || `${prefix}-${Date.now().toString().slice(-4)}`;

    const newCont: FundContribution = {
      id: editingItem?.id || `FD-${Date.now().toString().slice(-6)}`,
      receiptCode: shortReceipt,
      householdCode:
        payerType === "household" ? cleanCode : cleanCode || "Đơn vị ngoài HK",
      ownerName: cleanOwner,
      payerType,
      fundName,
      amount: numericAmount,
      status: payImmediately ? "Đã nộp" : "Chưa nộp",
      paymentMethod,
      paidAt: payImmediately ? editingItem?.paidAt || todayStr : undefined,
      note: note.trim() || undefined,
    };

    onSubmit(newCont);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "Cập nhật Phiếu Thu Quỹ" : "Ghi nhận Phiếu Thu Quỹ Mới"}
      description="Hỗ trợ thu từ Hộ dân Khu phố 3, Doanh nghiệp trên địa bàn hoặc Nguồn tài trợ."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="add-thu-form"
            variant="emerald"
            leftIcon={<Coins size={15} />}
          >
            {editingItem ? "Lưu thay đổi" : "Lưu phiếu thu"}
          </Button>
        </>
      }
    >
      <form id="add-thu-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Fund selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="thu-fund-select" className="text-xs font-semibold text-slate-700">
            Loại Quỹ thu nộp <span className="text-rose-500">*</span>
          </label>
          <select
            id="thu-fund-select"
            value={fundName}
            onChange={(e) => handleFundSelectChange(e.target.value)}
            className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          >
            {selectableCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name} ({cat.code}) — Gợi ý {cat.defaultAmount.toLocaleString("vi-VN")}đ
              </option>
            ))}
          </select>
        </div>

        {/* Payer Type segmented selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Đối tượng đóng góp</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "household" as const, label: "Hộ dân KP3" },
              { id: "enterprise" as const, label: "Doanh nghiệp" },
              { id: "sponsor" as const, label: "Tổ chức / Tài trợ" },
            ].map((opt) => {
              const active = payerType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPayerType(opt.id);
                    setFormError(null);
                  }}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? "bg-[#073B72] text-white border-[#073B72]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Household auto-fill selector when payer is Household */}
        {payerType === "household" && households.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="thu-household-picker" className="text-xs font-semibold text-slate-700">
              Chọn nhanh từ Sổ Hộ Khẩu KP3
            </label>
            <select
              id="thu-household-picker"
              defaultValue=""
              onChange={(e) => {
                const code = e.target.value;
                if (!code) return;
                const hh = households.find((h) => h.code === code);
                if (hh) {
                  setHouseholdCode(hh.code);
                  setOwnerName(hh.ownerName);
                  setFormError(null);
                }
              }}
              className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            >
              <option value="">-- Chọn Sổ hộ khẩu để tự động điền --</option>
              {households.map((hh) => (
                <option key={hh.code} value={hh.code}>
                  {hh.code} — Hộ {hh.ownerName} ({hh.address})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="thu-payer-code"
            label={payerType === "household" ? "Mã hộ khẩu *" : "Mã đơn vị / MST (nếu có)"}
            required={payerType === "household"}
            placeholder={payerType === "household" ? "VD: HK-301" : "VD: MST hoặc DN-KP3"}
            value={householdCode}
            onChange={(e) => {
              setHouseholdCode(e.target.value);
              setFormError(null);
            }}
            className="font-mono"
          />
          <Input
            id="thu-payer-name"
            label={
              payerType === "household"
                ? "Họ tên chủ hộ / Người nộp *"
                : "Tên Công ty / Tổ chức *"
            }
            required
            placeholder={
              payerType === "household"
                ? "VD: Nguyễn Văn Hùng"
                : "VD: Công ty Môi trường Đô thị"
            }
            value={ownerName}
            onChange={(e) => {
              setOwnerName(e.target.value);
              setFormError(null);
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="thu-amount"
            label="Số tiền đóng góp (VNĐ) *"
            type="number"
            min={1000}
            step={10000}
            required
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFormError(null);
            }}
            className="font-mono font-bold"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="thu-method" className="text-xs font-semibold text-slate-700">
              Hình thức thu
            </label>
            <select
              id="thu-method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as "Tiền mặt" | "VietQR" | "Chuyển khoản")
              }
              className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            >
              <option value="Tiền mặt">Tiền mặt tại Nhà văn hóa</option>
              <option value="VietQR">Quét mã VietQR</option>
              <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
            </select>
          </div>
        </div>

        <Input
          id="thu-note"
          label="Ghi chú biên nhận (tùy chọn)"
          placeholder="VD: Thu đợt 1 năm 2026 tại Tuyến Lương Định Của"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-xs font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={payImmediately}
            onChange={(e) => setPayImmediately(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            Đã thu tiền xong (nếu bỏ chọn sẽ tạo phiếu <strong>Chưa nộp</strong> để gửi mã VietQR thu sau)
          </span>
        </label>
      </form>
    </Modal>
  );
}

interface AddExpenditureModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: FundCategory[];
  contributions: FundContribution[];
  expenditures: FundExpenditure[];
  defaultFundName?: string;
  editingItem?: FundExpenditure | null;
  onSubmit: (exp: FundExpenditure) => void;
}

export function AddExpenditureModal({
  isOpen,
  onClose,
  categories,
  contributions,
  expenditures,
  defaultFundName,
  editingItem,
  onSubmit,
}: AddExpenditureModalProps) {
  const [fundName, setFundName] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("500000");
  const [spentAt, setSpentAt] = useState("");
  const [receiver, setReceiver] = useState("");
  const [evidence, setEvidence] = useState("");
  const [approvedBy, setApprovedBy] = useState("Nguyễn Văn Hùng");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setFundName(editingItem.fundName);
      setTitle(editingItem.title);
      setAmount(String(editingItem.amount || 0));
      setSpentAt(editingItem.spentAt || new Date().toLocaleDateString("vi-VN"));
      setReceiver(editingItem.receiver || "");
      setEvidence(editingItem.evidence || "");
      setApprovedBy(editingItem.approvedBy || "Nguyễn Văn Hùng");
      setFormError(null);
      return;
    }
    const initial =
      categories.find((c) => c.name === defaultFundName) || categories[0];
    setFundName(initial?.name || "");
    setTitle("");
    setAmount("500000");
    setSpentAt(new Date().toLocaleDateString("vi-VN"));
    setReceiver("");
    setEvidence("");
    setApprovedBy("Nguyễn Văn Hùng");
    setFormError(null);
  }, [isOpen, defaultFundName, categories, editingItem]);

  const selectedFundAvailableBalance = useMemo(() => {
    const cat = findCategoryByFundName(categories, fundName);
    if (!cat) return 0;
    const paid = contributions
      .filter((c) => doesRecordMatchCategory(c.fundName, cat, categories) && c.status === "Đã nộp")
      .reduce((sum, c) => sum + c.amount, 0);
    const spent = expenditures
      .filter((e) => doesRecordMatchCategory(e.fundName, cat, categories))
      .reduce((sum, e) => sum + e.amount, 0);
    return cat.openingBalance + paid - spent;
  }, [fundName, categories, contributions, expenditures]);

  const numericChi = Number(amount) || 0;
  const exceedsBalance = Boolean(fundName) && numericChi > selectedFundAvailableBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName) {
      setFormError("Vui lòng chọn Nguồn quỹ trích chi.");
      return;
    }
    if (!title.trim()) {
      setFormError("Vui lòng nhập nội dung chi tiêu chi tiết.");
      return;
    }
    if (numericChi <= 0) {
      setFormError("Số tiền chi phải lớn hơn 0 VNĐ.");
      return;
    }
    if (!receiver.trim() || !spentAt.trim()) {
      setFormError("Vui lòng điền Đơn vị thụ hưởng và Ngày chi.");
      return;
    }

    const newExp: FundExpenditure = {
      id: editingItem?.id || `EXP-${Date.now().toString().slice(-6)}`,
      voucherCode: editingItem?.voucherCode || `PC-${Date.now().toString().slice(-4)}`,
      fundName,
      title: title.trim(),
      amount: numericChi,
      spentAt: spentAt.trim(),
      receiver: receiver.trim(),
      evidence: evidence.trim() || undefined,
      approvedBy: approvedBy.trim() || "Nguyễn Văn Hùng",
    };

    onSubmit(newExp);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "Cập nhật Phiếu Chi Ngân Sách" : "Lập Phiếu Chi Ngân Sách Quỹ"}
      description="Kiểm tra số dư quỹ trước khi trích chi để đảm bảo minh bạch, đúng mục đích."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="add-chi-form"
            variant="destructive"
            leftIcon={<ArrowDownRight size={15} />}
          >
            {editingItem ? "Lưu thay đổi" : "Xác nhận lập phiếu chi"}
          </Button>
        </>
      }
    >
      <form id="add-chi-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="chi-fund-select" className="text-xs font-semibold text-slate-700">
            Nguồn Quỹ trích chi <span className="text-rose-500">*</span>
          </label>
          <select
            id="chi-fund-select"
            value={fundName}
            onChange={(e) => {
              setFundName(e.target.value);
              setFormError(null);
            }}
            className="h-9 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name} ({cat.code})
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 mt-1">
            <span className="text-slate-600 font-medium">Số dư khả dụng của quỹ này:</span>
            <span
              className={`font-mono font-bold ${
                selectedFundAvailableBalance >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {selectedFundAvailableBalance.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="chi-title-input" className="text-xs font-semibold text-slate-700">
            Nội dung chi tiêu chi tiết <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="chi-title-input"
            rows={2}
            required
            placeholder="VD: Chi khen thưởng học sinh giỏi vượt khó đợt hè năm 2026..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFormError(null);
            }}
            className="w-full p-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="chi-amount-input"
            label="Số tiền trích chi (VNĐ) *"
            type="number"
            min={1000}
            step={10000}
            required
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFormError(null);
            }}
            className="font-mono font-bold"
          />
          <Input
            id="chi-date-input"
            label="Ngày thực hiện chi *"
            required
            placeholder="DD/MM/YYYY"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
          />
        </div>

        {exceedsBalance && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-700" />
            <span>
              <strong>Lưu ý vượt tồn quỹ:</strong> Khoản chi{" "}
              <span className="font-mono font-bold">{numericChi.toLocaleString("vi-VN")}đ</span> lớn
              hơn số dư hiện tại của quỹ ({selectedFundAvailableBalance.toLocaleString("vi-VN")}đ).
              Hệ thống vẫn cho phép ghi nhận tạm ứng nếu có duyệt chi.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="chi-receiver-input"
            label="Đơn vị / Người thụ hưởng *"
            required
            placeholder="Nhà sách, hộ gia đình, đơn vị thi công..."
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <Input
            id="chi-evidence-input"
            label="Số hóa đơn / Chứng từ kèm theo"
            placeholder="VD: HĐ-045, BB-12/KP3"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            className="font-mono"
          />
        </div>

        <Input
          id="chi-approver-input"
          label="Người ký phê duyệt *"
          required
          value={approvedBy}
          onChange={(e) => setApprovedBy(e.target.value)}
        />
      </form>
    </Modal>
  );
}

interface DeleteExpenditureModalProps {
  expenditure: FundExpenditure | null;
  onClose: () => void;
  onConfirmDelete: (exp: FundExpenditure) => void;
}

export function DeleteExpenditureModal({
  expenditure,
  onClose,
  onConfirmDelete,
}: DeleteExpenditureModalProps) {
  return (
    <Modal
      isOpen={Boolean(expenditure)}
      onClose={onClose}
      title="Xác nhận xóa Phiếu Chi"
      description="Thao tác này sẽ hoàn trả số tiền đã trích chi vào số dư quỹ tương ứng."
      size="md"
      footer={
        <>
          <Button variant="outline" autoFocus onClick={onClose}>
            Giữ lại
          </Button>
          <Button
            variant="destructive"
            leftIcon={<Trash2 size={15} />}
            onClick={() => {
              if (expenditure) onConfirmDelete(expenditure);
              onClose();
            }}
          >
            Xóa phiếu chi
          </Button>
        </>
      }
    >
      {expenditure && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-900">
          <div className="flex justify-between font-semibold">
            <span>Số phiếu: {formatReceiptCode(expenditure.id, expenditure.voucherCode, "PC")}</span>
            <span className="font-mono font-bold">
              {expenditure.amount.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
          <p className="font-bold text-slate-900 text-sm">{expenditure.title}</p>
          <p>
            Nguồn quỹ: <strong>{expenditure.fundName}</strong> • Thụ hưởng:{" "}
            <strong>{expenditure.receiver}</strong>
          </p>
        </div>
      )}
    </Modal>
  );
}

interface ReceiptPrintModalProps {
  receipt: ReceiptPreviewData | null;
  onClose: () => void;
}

export function ReceiptPrintModal({ receipt, onClose }: ReceiptPrintModalProps) {
  const shortCode = receipt
    ? formatReceiptCode(
        receipt.id,
        receipt.receiptCode,
        receipt.type === "THU" ? "BL" : "PC"
      )
    : "";

  return (
    <Modal
      isOpen={Boolean(receipt)}
      onClose={onClose}
      title="Biên Lai / Chứng Từ Điện Tử KP3"
      description="Biên nhận chuẩn hành chính khu phố có mã QR đối soát công khai."
      size="2xl"
      footer={
        <div className="w-full flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-600 font-mono">
            Mã chứng từ: {shortCode}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant="primary"
              leftIcon={<Printer size={15} />}
              onClick={() => window.print()}
            >
              In máy in / Lưu PDF
            </Button>
          </div>
        </div>
      }
    >
      {receipt && (
        <div className="p-6 sm:p-8 bg-white text-slate-900 font-sans border border-slate-200 rounded-xl relative overflow-hidden print:border-0 print:p-0">
          {/* Watermark Stamp */}
          <div className="hidden sm:flex absolute right-8 top-16 border-2 border-emerald-700/35 text-emerald-800/50 font-bold uppercase rounded-full w-24 h-24 items-center justify-center -rotate-12 text-[11px] pointer-events-none select-none text-center leading-tight">
            {receipt.type === "THU" ? "ĐÃ GHI SỔ\nKP3 AN PHÚ" : "ĐÃ QUYẾT TOÁN\nKP3 AN PHÚ"}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                UBND PHƯỜNG AN PHÚ
              </span>
              <span className="text-sm font-black uppercase text-[#073B72] flex items-center gap-1.5">
                <Building size={15} /> BAN ĐIỀU HÀNH KHU PHỐ 3
              </span>
              <span className="text-xs text-slate-600 block">
                Địa bàn: Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
              </span>
            </div>
            <div className="sm:text-right text-xs">
              <p className="font-mono text-slate-600">Mẫu số: 01-TT/KP3</p>
              <p className="font-mono font-bold text-slate-900 mt-1">
                SỐ CHỨNG TỪ: {shortCode}
              </p>
              <p className="text-slate-600 mt-0.5">Ngày lập: {receipt.date}</p>
            </div>
          </div>

          <div className="text-center py-5 space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              {receipt.type === "THU" ? "PHIẾU THU QUỸ CỘNG ĐỒNG" : "PHIẾU CHI QUYẾT TOÁN QUỸ"}
            </h3>
            <p className="text-xs font-bold text-[#073B72]">({receipt.fundName})</p>
          </div>

          <dl className="@container divide-y divide-slate-100 pb-6">
            <DetailRow
              label={
                receipt.type === "THU"
                  ? "Cá nhân / Đơn vị nộp"
                  : "Đơn vị / Người nhận tiền"
              }
              value={<strong className="text-slate-900 text-sm">{receipt.subject}</strong>}
              copyValue={receipt.subject}
              colSpan={2}
            />
            <DetailRow
              label="Phân loại / Chi tiết"
              value={receipt.subDetail}
              isMono
              colSpan={2}
            />
            <DetailRow
              label="Nội dung thu/chi"
              value={receipt.title}
              colSpan={2}
            />
            <DetailRow
              label="Số tiền"
              value={`${receipt.amount.toLocaleString("vi-VN")} VNĐ`}
              isMono
              isNumeric
              colSpan={2}
            />
            <DetailRow
              label="Viết bằng chữ"
              value={
                <span className="font-bold italic text-slate-900">
                  {docSoTiengViet(receipt.amount)}
                </span>
              }
              colSpan={2}
            />
            {receipt.evidence && (
              <DetailRow
                label="Chứng từ gốc"
                value={receipt.evidence}
                isMono
                copyValue={receipt.evidence}
                colSpan={2}
              />
            )}
          </dl>

          <div className="grid grid-cols-3 gap-4 text-center text-xs pt-4 border-t border-slate-200">
            <div className="space-y-10">
              <span className="font-bold text-slate-800 uppercase block">NGƯỜI LẬP PHIẾU</span>
              <strong className="block text-slate-900 pt-2">
                {receipt.approvedBy || "Ban Điều Hành KP3"}
              </strong>
            </div>
            <div className="space-y-10">
              <span className="font-bold text-slate-800 uppercase block">THỦ QUỸ</span>
              <strong className="block text-slate-900 pt-2">Lê Thị Mai</strong>
            </div>
            <div className="space-y-10">
              <span className="font-bold text-slate-800 uppercase block">TRƯỞNG KHU PHỐ 3</span>
              <strong className="block text-slate-900 pt-2">Nguyễn Văn Hùng</strong>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                  `XAC THUC CHUNG TU KP3: ${shortCode} (${receipt.id}) - ${receipt.subject} - ${receipt.amount} VND`
                )}`}
                alt="Mã QR Xác Thực Chứng Từ KP3"
                className="w-16 h-16 border border-slate-200 rounded p-0.5 shrink-0"
              />
              <div className="text-xs text-slate-600 font-mono">
                <p className="font-bold text-slate-800">MÃ XÁC THỰC SỐ HÓA KP3</p>
                <p>Số CT: {shortCode}</p>
                {shortCode !== receipt.id && (
                  <p className="text-[11px] text-slate-600 truncate max-w-[220px]">
                    ID: {receipt.id}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 sm:text-right">
              Công khai minh bạch tài chính cộng đồng Khu phố 3.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

