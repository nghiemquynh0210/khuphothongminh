import * as XLSX from "xlsx";
import { FundCategory, FundContribution, FundExpenditure } from "../../types";

export const FUND_CATEGORIES_STORAGE_KEY = "kp3_fund_categories_v2";
export const FUND_EXPENDITURES_STORAGE_KEY = "kp3_fund_expenditures_v2";

export const DEFAULT_FUND_CATEGORIES: FundCategory[] = [
  {
    id: "FUND-KH",
    code: "KH",
    name: "Quỹ Khuyến học",
    group: "Vận động tự nguyện",
    targetAudience: "Hộ dân & Tổ chức",
    defaultAmount: 200000,
    annualTarget: 15000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Trao học bổng, khen thưởng học sinh giỏi vượt khó tại Khu phố 3 nhân dịp hè và khai giảng.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
  {
    id: "FUND-VNN",
    code: "VNN",
    name: "Quỹ Vì người nghèo",
    group: "Vận động tự nguyện",
    targetAudience: "Hộ dân & Tổ chức",
    defaultAmount: 200000,
    annualTarget: 15000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Chăm lo hộ nghèo, cận nghèo, hỗ trợ viện phí đột xuất và tặng quà Tết hộ khó khăn.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
  {
    id: "FUND-ANQP",
    code: "ANQP",
    name: "Quỹ Quốc phòng an ninh",
    aliases: ["Quỹ An ninh Quốc phòng"],
    group: "Bắt buộc / Chỉ tiêu",
    targetAudience: "Hộ dân & Tổ chức",
    defaultAmount: 120000,
    annualTarget: 12000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Trang bị công cụ tuần tra, bồi dưỡng lực lượng ANTT cơ sở, bảo vệ dân phố tuần tra đêm.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
  {
    id: "FUND-PCTT",
    code: "PCTT",
    name: "Quỹ Phòng chống thiên tai",
    group: "Bắt buộc / Chỉ tiêu",
    targetAudience: "Hộ dân & Tổ chức",
    defaultAmount: 100000,
    annualTarget: 10000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Quỹ dự phòng ứng phó giông lốc, ngập úng, hỗ trợ khẩn cấp hộ bị thiệt hại do thiên tai.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
  {
    id: "FUND-BTH",
    code: "BTH",
    name: "Quỹ Bảo trì hẻm",
    group: "Quỹ tự quản khu phố",
    targetAudience: "Hộ dân",
    defaultAmount: 500000,
    annualTarget: 20000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Duy tu mặt đường, nâng cấp cống thoát nước, chiếu sáng và camera an ninh các tuyến hẻm tự quản.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
  {
    id: "FUND-DODN",
    code: "DODN",
    name: "Quỹ Đền ơn đáp nghĩa",
    group: "Vận động tự nguyện",
    targetAudience: "Hộ dân & Tổ chức",
    defaultAmount: 150000,
    annualTarget: 10000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Thăm hỏi gia đình chính sách, thương binh liệt sĩ, Mẹ Việt Nam Anh hùng dịp 27/7 và lễ Tết.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
  {
    id: "FUND-HDKP",
    code: "HDKP",
    name: "Quỹ Hoạt động Khu phố",
    group: "Quỹ tự quản khu phố",
    targetAudience: "Hộ dân & Tổ chức",
    defaultAmount: 100000,
    annualTarget: 12000000,
    openingBalance: 0,
    status: "Đang vận động",
    description: "Phục vụ Ngày hội Đại đoàn kết, sinh hoạt cộng đồng tại Nhà văn hóa và công tác tự quản KP3.",
    isDefault: true,
    createdAt: "01/01/2026",
  },
];

export const MOCK_INITIAL_EXPENDITURES: FundExpenditure[] = [
  {
    id: "EXP001",
    voucherCode: "PC-2026-001",
    fundName: "Quỹ Khuyến học",
    title: "Chi mua tập vở, dụng cụ học tập phát thưởng cho các học sinh đạt thành tích cao trong Lễ tổng kết hè",
    amount: 2500000,
    spentAt: "15/06/2026",
    receiver: "Nhà sách Nguyễn Văn Cừ",
    evidence: "HĐ-2026-045",
    approvedBy: "Nguyễn Văn Hùng",
  },
  {
    id: "EXP002",
    voucherCode: "PC-2026-002",
    fundName: "Quỹ Vì người nghèo",
    title: "Chi hỗ trợ đột xuất viện phí cho hộ nghèo bà Trần Thị Lan điều trị bệnh tim",
    amount: 3000000,
    spentAt: "18/06/2026",
    receiver: "Bà Trần Thị Lan (Hộ nghèo hẻm 42)",
    evidence: "PT-0987-BV",
    approvedBy: "Nguyễn Văn Hùng",
  },
  {
    id: "EXP003",
    voucherCode: "PC-2026-003",
    fundName: "Quỹ Quốc phòng an ninh",
    title: "Chi mua trang thiết bị tuần tra (đèn pin siêu sáng, công cụ hỗ trợ) cho lực lượng ANCS giữ gìn trật tự đêm",
    amount: 1200000,
    spentAt: "02/07/2026",
    receiver: "Cửa hàng Thiết bị Bảo hộ An Bình",
    evidence: "HĐ-1209",
    approvedBy: "Lê Văn Sơn",
  },
  {
    id: "EXP004",
    voucherCode: "PC-2026-004",
    fundName: "Quỹ Bảo trì hẻm",
    title: "Chi mua xi măng, cát đá sửa chữa đoạn vỉa hè bị sụt lún trước đầu hẻm 42 An Phú",
    amount: 1800000,
    spentAt: "08/07/2026",
    receiver: "Cửa hàng VLXD Hùng Cường",
    evidence: "HĐ-6752",
    approvedBy: "Nguyễn Văn Hùng",
  },
  {
    id: "EXP005",
    voucherCode: "PC-2026-005",
    fundName: "Quỹ Phòng chống thiên tai",
    title: "Chi hỗ trợ nhu yếu phẩm khẩn cấp cho hộ gia đình bị tốc mái do giông lốc lớn đêm 05/07",
    amount: 1500000,
    spentAt: "06/07/2026",
    receiver: "Gia đình ông Trần Văn Thanh",
    evidence: "BB-0607-KP",
    approvedBy: "Nguyễn Văn Hùng",
  },
];

export function normalizeFundKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findCategoryByFundName(
  categories: FundCategory[],
  fundName: string
): FundCategory | undefined {
  const target = normalizeFundKey(fundName);
  const exact = categories.find((c) => normalizeFundKey(c.name) === target);
  if (exact) return exact;
  return categories.find((c) =>
    (c.aliases || []).some((alias) => normalizeFundKey(alias) === target)
  );
}

export function doesRecordMatchCategory(
  recordFundName: string,
  category: FundCategory,
  allCategories?: FundCategory[]
): boolean {
  const recKey = normalizeFundKey(recordFundName);
  if (recKey === normalizeFundKey(category.name)) return true;
  if ((category.aliases || []).some((a) => normalizeFundKey(a) === recKey)) {
    // Only match via alias if no other category owns that exact canonical name
    const ownedByOther = (allCategories || []).some(
      (other) => other.id !== category.id && normalizeFundKey(other.name) === recKey
    );
    return !ownedByOther;
  }
  return false;
}

export function mergeDiscoveredFundCategories(
  baseCategories: FundCategory[],
  contributions: FundContribution[],
  expenditures: FundExpenditure[]
): FundCategory[] {
  const result = [...baseCategories];
  const seenNames = new Set<string>();
  result.forEach((c) => {
    seenNames.add(normalizeFundKey(c.name));
    (c.aliases || []).forEach((a) => seenNames.add(normalizeFundKey(a)));
  });

  const extraNames = new Set<string>();
  contributions.forEach((c) => {
    if (c.fundName && !seenNames.has(normalizeFundKey(c.fundName))) {
      extraNames.add(c.fundName.trim());
    }
  });
  expenditures.forEach((e) => {
    if (e.fundName && !seenNames.has(normalizeFundKey(e.fundName))) {
      extraNames.add(e.fundName.trim());
    }
  });

  extraNames.forEach((name, idx) => {
    const words = name
      .replace(/quỹ\s*/i, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const shortCode =
      words
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
        .slice(0, 5) || `Q${idx + 1}`;
    result.push({
      id: `FUND-AUTO-${shortCode}-${Date.now() + idx}`,
      code: shortCode,
      name,
      group: "Vận động tự nguyện",
      targetAudience: "Hộ dân & Tổ chức",
      defaultAmount: 100000,
      annualTarget: 10000000,
      openingBalance: 0,
      status: "Đang vận động",
      description: "Loại quỹ được tự động nhận diện từ chứng từ thu/chi đã phát sinh.",
      isDefault: false,
      createdAt: new Date().toLocaleDateString("vi-VN"),
    });
  });

  return result;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatReceiptCode(
  rawId: string,
  receiptCode?: string,
  prefix: "BL" | "PC" = "BL"
): string {
  if (receiptCode && receiptCode.trim() && !UUID_REGEX.test(receiptCode.trim())) {
    return receiptCode.trim();
  }
  if (UUID_REGEX.test(rawId.trim())) {
    return `${prefix}-${rawId.trim().slice(0, 8).toUpperCase()}`;
  }
  return rawId;
}

export interface PayerMeta {
  isHousehold: boolean;
  label: string;
  codeLabel: string;
}

export function inferPayerMeta(cont: FundContribution): PayerMeta {
  if (cont.payerType === "enterprise") {
    return {
      isHousehold: false,
      label: "Doanh nghiệp / Cơ sở",
      codeLabel: cont.householdCode && cont.householdCode !== "N/A" ? `Mã DN: ${cont.householdCode}` : "Đơn vị ngoài hộ khẩu",
    };
  }
  if (cont.payerType === "organization" || cont.payerType === "sponsor") {
    return {
      isHousehold: false,
      label: "Tổ chức / Tài trợ",
      codeLabel: cont.householdCode && cont.householdCode !== "N/A" ? `Mã ĐV: ${cont.householdCode}` : "Nguồn tài trợ / Hội đoàn",
    };
  }

  const code = (cont.householdCode || "").trim();
  const ownerLower = cont.ownerName.toLowerCase();
  const looksLikeOrg =
    !code ||
    code.toUpperCase() === "N/A" ||
    /công ty|cty|doanh nghiệp|hội |ubnd|phường|tổ chức|ngân hàng|trường |bệnh viện/i.test(ownerLower);

  if (looksLikeOrg) {
    const isEnterprise = /công ty|cty|doanh nghiệp|tnhh|cổ phần|cửa hàng|ngân hàng/i.test(ownerLower);
    return {
      isHousehold: false,
      label: isEnterprise ? "Doanh nghiệp / Cơ sở" : "Tổ chức / Hội đoàn",
      codeLabel: isEnterprise ? "Đơn vị kinh doanh / Ủng hộ" : "Tổ chức / Đơn vị tài trợ",
    };
  }

  return {
    isHousehold: true,
    label: "Hộ dân KP3",
    codeLabel: `Mã HK: ${code}`,
  };
}

export function docSoTiengViet(number: number): string {
  const absNum = Math.abs(Math.round(number));
  if (absNum === 0) return "Không đồng";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const unitsTen = [
    "",
    "mười",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];

  const readGroup3 = (num: number, showZeroUnit: boolean): string => {
    let s = "";
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;

    if (hundreds > 0 || showZeroUnit) {
      s += units[hundreds] + " trăm ";
    }

    if (tens > 0) {
      s += unitsTen[tens] + " ";
    } else if (hundreds > 0 && ones > 0) {
      s += "lẻ ";
    }

    if (tens > 1 && ones === 1) {
      s += "mốt";
    } else if (tens > 0 && ones === 5) {
      s += "lăm";
    } else if (ones > 0) {
      s += units[ones];
    }
    return s.trim();
  };

  let str = "";
  let temp = absNum;
  const groups: number[] = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const groupUnits = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const showZero = i < groups.length - 1;
      str += readGroup3(g, showZero) + " " + groupUnits[i] + " ";
    }
  }

  const text = str.trim();
  return `${number < 0 ? "Âm " : ""}${text.charAt(0).toUpperCase() + text.slice(1)} đồng chẵn`;
}

export function exportFundsWorkbookXlsx({
  categories,
  contributions,
  expenditures,
}: {
  categories: FundCategory[];
  contributions: FundContribution[];
  expenditures: FundExpenditure[];
}) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Cân đối Thu Chi từng Quỹ
  const balanceRows = categories.map((cat) => {
    const thuPaid = contributions
      .filter((c) => doesRecordMatchCategory(c.fundName, cat, categories) && c.status === "Đã nộp")
      .reduce((sum, c) => sum + c.amount, 0);
    const thuPending = contributions
      .filter((c) => doesRecordMatchCategory(c.fundName, cat, categories) && c.status === "Chưa nộp")
      .reduce((sum, c) => sum + c.amount, 0);
    const chiTotal = expenditures
      .filter((e) => doesRecordMatchCategory(e.fundName, cat, categories))
      .reduce((sum, e) => sum + e.amount, 0);
    const ending = cat.openingBalance + thuPaid - chiTotal;
    return {
      "Mã Quỹ": cat.code,
      "Tên Quỹ": cat.name,
      "Nhóm Quỹ": cat.group,
      "Trạng thái": cat.status,
      "Số dư đầu kỳ (VNĐ)": cat.openingBalance,
      "Thực thu trong kỳ (VNĐ)": thuPaid,
      "Chờ thu / Vận động (VNĐ)": thuPending,
      "Tổng chi quyết toán (VNĐ)": chiTotal,
      "Tồn quỹ cuối kỳ (VNĐ)": ending,
      "Chỉ tiêu năm (VNĐ)": cat.annualTarget,
      "Tỉ lệ đạt chỉ tiêu (%)":
        cat.annualTarget > 0 ? Math.round((thuPaid / cat.annualTarget) * 100) : 0,
    };
  });
  const wsBalance = XLSX.utils.json_to_sheet(balanceRows);
  XLSX.utils.book_append_sheet(wb, wsBalance, "CanDoi_TheoQuy");

  // Sheet 2: Danh mục Quỹ
  const catRows = categories.map((cat) => ({
    "Mã Quỹ": cat.code,
    "Tên Quỹ": cat.name,
    "Phân nhóm": cat.group,
    "Đối tượng nộp": cat.targetAudience,
    "Định mức gợi ý (VNĐ)": cat.defaultAmount,
    "Chỉ tiêu năm (VNĐ)": cat.annualTarget,
    "Số dư đầu kỳ (VNĐ)": cat.openingBalance,
    "Trạng thái": cat.status,
    "Mô tả / Mục đích": cat.description || "",
  }));
  const wsCat = XLSX.utils.json_to_sheet(catRows);
  XLSX.utils.book_append_sheet(wb, wsCat, "DanhMuc_Quy");

  // Sheet 3: Sổ Thu Quỹ
  const thuRows = contributions.map((c) => {
    const payer = inferPayerMeta(c);
    return {
      "Số Biên Lai": formatReceiptCode(c.id, c.receiptCode, "BL"),
      "ID Hệ Thống": c.id,
      "Phân loại nộp": payer.label,
      "Mã Hộ Khẩu / Đơn vị": c.householdCode,
      "Người / Đơn vị Nộp": c.ownerName,
      "Tên Quỹ": c.fundName,
      "Số Tiền (VNĐ)": c.amount,
      "Trạng thái": c.status,
      "Hình thức": c.paymentMethod || "Tiền mặt / VietQR",
      "Ngày Nộp": c.paidAt || "Chưa nộp",
    };
  });
  const wsThu = XLSX.utils.json_to_sheet(thuRows);
  XLSX.utils.book_append_sheet(wb, wsThu, "SoChiTiet_Thu");

  // Sheet 4: Sổ Chi Quyết Toán
  const chiRows = expenditures.map((e) => ({
    "Số Phiếu Chi": formatReceiptCode(e.id, e.voucherCode, "PC"),
    "Quỹ Trích Chi": e.fundName,
    "Nội Dung Chi Tiêu": e.title,
    "Số Tiền Chi (VNĐ)": e.amount,
    "Ngày Chi": e.spentAt,
    "Đơn Vị / Người Thụ Hưởng": e.receiver,
    "Chứng Từ / Hóa Đơn": e.evidence || "",
    "Người Phê Duyệt": e.approvedBy,
  }));
  const wsChi = XLSX.utils.json_to_sheet(chiRows);
  XLSX.utils.book_append_sheet(wb, wsChi, "SoChiTiet_Chi");

  const todayTag = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `BaoCao_TaiChinh_KP3_AnPhu_${todayTag}.xlsx`);
}

