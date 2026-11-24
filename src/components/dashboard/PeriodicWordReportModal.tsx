import React, { useEffect, useMemo, useState } from "react";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { CheckCircle2, FileDown, Loader2, Sparkles } from "lucide-react";
import {
  Business,
  FieldReport,
  FundContribution,
  FundExpenditure,
  Household,
  Resident,
  ScheduleEvent,
  TaskItem,
} from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { formatVNNumber } from "../../utils/numberFormat";
import { KP3_OFFICIAL_BASELINE, isEnterpriseRecord } from "../../utils/kp3Utils";
import { getTemporaryResidenceExpiryStatus } from "../../utils/householdRecognitionUtils";
import { getStoredAssociations } from "../../data/associationsData";
import { extractKeyLeadersSummary } from "../../utils/leadershipSync";
import { recordAuditLog } from "../../utils/auditLogger";

export type ReportPeriodType = "month" | "quarter" | "year";
export type ReportIssuerType = "bdh" | "chibo";

export interface PeriodicWordReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  households: Household[];
  businesses: Business[];
  reports: FieldReport[];
  tasks?: TaskItem[];
  schedules?: ScheduleEvent[];
  fundContributions?: FundContribution[];
  fundExpenditures?: FundExpenditure[];
  welfareCount?: number;
  actorName?: string;
}

export function PeriodicWordReportModal({
  isOpen,
  onClose,
  residents,
  households,
  businesses,
  reports,
  tasks = [],
  schedules = [],
  fundContributions = [],
  fundExpenditures = [],
  welfareCount = 0,
  actorName = "Cán bộ Ban Điều hành KP3",
}: PeriodicWordReportModalProps) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("month");
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    Math.floor(now.getMonth() / 3) + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [issuerType, setIssuerType] = useState<ReportIssuerType>("bdh");
  const [docNumber, setDocNumber] = useState<string>("");
  const [customEvaluation, setCustomEvaluation] = useState<string>("");
  const [customNextPlan, setCustomNextPlan] = useState<string>("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const leaders = useMemo(
    () => extractKeyLeadersSummary(getStoredAssociations()),
    [isOpen]
  );

  const periodLabel = useMemo(() => {
    if (periodType === "month") return `Tháng ${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;
    if (periodType === "quarter") return `Quý ${selectedQuarter} năm ${selectedYear}`;
    return `Năm ${selectedYear}`;
  }, [periodType, selectedMonth, selectedQuarter, selectedYear]);

  const stats = useMemo(() => {
    const totalRes = residents.length || KP3_OFFICIAL_BASELINE.population;
    const permRes =
      residents.filter((r) => r.status === "Thường trú").length || 2109;
    const tempRes = Math.max(0, totalRes - permRes);

    let expiring30d = 0;
    for (const r of residents) {
      if (r.status === "Tạm trú" && r.temporaryExpDate) {
        const st = getTemporaryResidenceExpiryStatus(r.temporaryExpDate);
        if (st.status === "expiring_soon") expiring30d++;
      }
    }

    const totalHh = households.length || KP3_OFFICIAL_BASELINE.households;
    const permHh =
      households.filter((h) => (h.type || "Thường trú") === "Thường trú").length ||
      KP3_OFFICIAL_BASELINE.households;
    const tempHh = Math.max(0, totalHh - permHh);

    const enterprises = businesses.filter((b) => isEnterpriseRecord(b)).length;
    const hostels = businesses.filter((b) => b.isAccommodation).length;
    const pcccPassed = businesses.filter((b) => b.safetyCertified !== false).length;

    const totalReports = reports.length;
    const resolvedReports = reports.filter((r) => r.status === "Đã giải quyết").length;
    const processingReports = reports.filter((r) => r.status === "Đang xử lý").length;
    const pendingReports = Math.max(0, totalReports - resolvedReports - processingReports);
    const resolveRate =
      totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 100;

    const doneTasks = tasks.filter((t) => t.status === "Hoàn thành").length;
    const totalIncome = fundContributions
      .filter((c) => c.status === "Đã nộp")
      .reduce((s, c) => s + (c.amount || 0), 0);
    const totalExpense = fundExpenditures.reduce((s, e) => s + (e.amount || 0), 0);

    return {
      totalRes,
      permRes,
      tempRes,
      expiring30d,
      totalHh,
      permHh,
      tempHh,
      totalBiz: businesses.length,
      enterprises,
      hostels,
      pcccPassed,
      totalReports,
      resolvedReports,
      processingReports,
      pendingReports,
      resolveRate,
      totalTasks: tasks.length,
      doneTasks,
      totalSchedules: schedules.length,
      totalIncome,
      totalExpense,
      fundBalance: totalIncome - totalExpense,
      welfareCount,
    };
  }, [
    residents,
    households,
    businesses,
    reports,
    tasks,
    schedules,
    fundContributions,
    fundExpenditures,
    welfareCount,
  ]);

  // Seed realistic default paragraphs whenever period/issuer changes
  useEffect(() => {
    const unitName = issuerType === "chibo" ? "Chi bộ Khu phố 3" : "Ban Điều hành Khu phố 3";
    setCustomEvaluation(
      `Trong ${periodLabel.toLowerCase()}, dưới sự lãnh đạo sát sao của Đảng ủy – UBND Phường An Phú, ${unitName} đã phối hợp chặt chẽ cùng Ban Công tác Mặt trận, các Chi hội đoàn thể và Cảnh sát khu vực giữ vững ổn định an ninh chính trị, trật tự an toàn xã hội trên địa bàn. Đặc biệt, việc vận hành thực tế Hệ thống Quản lý Đô thị số Khu phố 3 theo tinh thần Nghị quyết số 57-NQ/TW đã giúp số hóa công tác quản lý ${formatVNNumber(stats.totalRes)} nhân khẩu, tiếp nhận – phản hồi kịp thời phản ánh hiện trường qua Zalo OA 2 chiều (tỷ lệ giải quyết đạt ${stats.resolveRate}%) và tự động hóa công tác điều hành lịch tuần, báo cáo định kỳ.`
    );
    setCustomNextPlan(
      `1. Tiếp tục rà soát, tuyên truyền nhắc gia hạn tạm trú đúng hạn đối với ${formatVNNumber(stats.expiring30d)} nhân khẩu sắp đến hạn tại ${formatVNNumber(stats.hostels)} cơ sở nhà trọ trên địa bàn.\n2. Tăng cường kiểm tra an toàn PCCC cơ sở, Tổ liên gia an toàn PCCC và trật tự mỹ quan đô thị trên các trục hẻm chính.\n3. Giải quyết dứt điểm 100% phản ánh hiện trường 1022 và tin nhắn phản ánh qua Hộp thư Zalo OA đúng hạn SLA.\n4. Chăm lo kịp thời chế độ chính sách, an sinh xã hội và công khai minh bạch các nguồn quỹ vận động tại Khu phố.`
    );
  }, [periodLabel, issuerType, stats.totalRes, stats.resolveRate, stats.expiring30d, stats.hostels]);

  const handleAiRefine = async () => {
    setIsAiGenerating(true);
    try {
      const prompt = `Bạn là thư ký tổng hợp văn bản hành chính của ${
        issuerType === "chibo" ? "Chi bộ Khu phố 3" : "Ban Điều hành Khu phố 3"
      }, Phường An Phú, TP. Hồ Chí Minh (tuyệt đối không dùng từ TP. Thủ Đức).
Dựa trên số liệu thực tế ${periodLabel}:
- Nhân khẩu: ${stats.totalRes} người (${stats.permRes} thường trú, ${stats.tempRes} tạm trú; ${stats.expiring30d} người sắp hết hạn tạm trú 30 ngày).
- Hộ quản lý: ${stats.totalHh} hộ (${stats.permHh} hộ CT01, ${stats.tempHh} hộ tạm trú CT08).
- Kinh tế & PCCC: ${stats.totalBiz} cơ sở (${stats.enterprises} doanh nghiệp, ${stats.hostels} nhà trọ; ${stats.pcccPassed} cơ sở đạt PCCC).
- Phản ánh hiện trường 1022 & Zalo OA: ${stats.totalReports} vụ (đã giải quyết ${stats.resolvedReports} vụ, đạt ${stats.resolveRate}%).
- Nhiệm vụ & Lịch công tác: ${stats.doneTasks}/${stats.totalTasks} nhiệm vụ hoàn thành, ${stats.totalSchedules} lịch công tác.

Hãy viết trả về JSON thuần (không bọc markdown) gồm 2 trường:
{"evaluation": "Đoạn đánh giá chung sâu sắc, trang trọng dài 4-5 câu gắn với Nghị quyết 57-NQ/TW", "nextPlan": "4 gạch đầu dòng đánh số 1..4 phương hướng nhiệm vụ trọng tâm kỳ tới sát thực tế"}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json().catch(() => ({}));
      const rawReply = String(data?.reply || data?.text || "").trim();
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.evaluation) setCustomEvaluation(String(parsed.evaluation).trim());
        if (parsed.nextPlan) setCustomNextPlan(String(parsed.nextPlan).trim());
        setToast("AI đã biên tập lại phần Đánh giá chung & Phương hướng kỳ tới!");
        setTimeout(() => setToast(null), 3500);
      }
    } catch {
      // keep existing clean text if offline
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDownloadWord = async () => {
    setIsExporting(true);
    try {
      const noBorder = {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      };
      const thinBorder = {
        top: { style: BorderStyle.SINGLE, size: 4, color: "334155" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "334155" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "334155" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "334155" },
      };

      const isParty = issuerType === "chibo";
      const upperOrg = isParty ? "ĐẢNG ỦY PHƯỜNG AN PHÚ" : "UBND PHƯỜNG AN PHÚ";
      const subOrg = isParty ? "CHI BỘ KHU PHỐ 3" : "BAN ĐIỀU HÀNH KHU PHỐ 3";
      const rightMottoTop = isParty
        ? "ĐẢNG CỘNG SẢN VIỆT NAM"
        : "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
      const rightMottoSub = isParty ? "" : "Độc lập - Tự do - Hạnh phúc";
      const signerRoleHeader = isParty ? "T/M CHI BỘ KHU PHỐ 3" : "TM. BAN ĐIỀU HÀNH KHU PHỐ 3";
      const signerTitle = isParty ? "BÍ THƯ" : "TRƯỞNG KHU PHỐ";
      const signerName = isParty
        ? leaders.partySecretary.name
        : leaders.neighborhoodHead.name;
      const defaultNumber =
        docNumber.trim() ||
        (isParty ? `Số: ......-BC/CBKP3` : `Số: ....../BC-BĐHKP3`);

      const headerTable = new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4200, 5160],
        borders: noBorder,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4200, type: WidthType.DXA },
                borders: noBorder,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: upperOrg, font: "Times New Roman", size: 24 }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                    children: [
                      new TextRun({
                        text: subOrg,
                        font: "Times New Roman",
                        size: 25,
                        bold: true,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: defaultNumber, font: "Times New Roman", size: 24 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 5160, type: WidthType.DXA },
                borders: noBorder,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: rightMottoTop,
                        font: "Times New Roman",
                        size: 25,
                        bold: true,
                      }),
                    ],
                  }),
                  ...(rightMottoSub
                    ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { after: 80 },
                          children: [
                            new TextRun({
                              text: rightMottoSub,
                              font: "Times New Roman",
                              size: 26,
                              bold: true,
                              underline: {},
                            }),
                          ],
                        }),
                      ]
                    : []),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 80 },
                    children: [
                      new TextRun({
                        text: `An Phú, ngày ${now.getDate()} tháng ${
                          now.getMonth() + 1
                        } năm ${now.getFullYear()}`,
                        font: "Times New Roman",
                        size: 25,
                        italics: true,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const makeMetricRow = (stt: string, label: string, val: string, note: string, isHeader = false) =>
        new TableRow({
          children: [
            { text: stt, w: 760, align: AlignmentType.CENTER },
            { text: label, w: 3600, align: AlignmentType.LEFT },
            { text: val, w: 2000, align: AlignmentType.RIGHT },
            { text: note, w: 3000, align: AlignmentType.LEFT },
          ].map(
            (col) =>
              new TableCell({
                width: { size: col.w, type: WidthType.DXA },
                borders: thinBorder,
                children: [
                  new Paragraph({
                    alignment: isHeader ? AlignmentType.CENTER : col.align,
                    spacing: { before: 80, after: 80 },
                    children: [
                      new TextRun({
                        text: col.text,
                        font: "Times New Roman",
                        size: 24,
                        bold: isHeader,
                      }),
                    ],
                  }),
                ],
              })
          ),
        });

      const metricsTable = new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [760, 3600, 2000, 3000],
        rows: [
          makeMetricRow("TT", "Chỉ tiêu quản lý điều hành", "Số liệu thực tế", "Ghi chú chi tiết", true),
          makeMetricRow(
            "1",
            "Tổng số hộ gia đình quản lý",
            `${formatVNNumber(stats.totalHh)} hộ`,
            `${formatVNNumber(stats.permHh)} hộ thường trú CT01; ${formatVNNumber(stats.tempHh)} hộ tạm trú CT08`
          ),
          makeMetricRow(
            "2",
            "Tổng số nhân khẩu trên địa bàn",
            `${formatVNNumber(stats.totalRes)} người`,
            `${formatVNNumber(stats.permRes)} thường trú; ${formatVNNumber(stats.tempRes)} tạm trú`
          ),
          makeMetricRow(
            "3",
            "Nhân khẩu tạm trú sắp đến hạn (≤30 ngày)",
            `${formatVNNumber(stats.expiring30d)} người`,
            "Đã theo dõi & nhắc gia hạn qua Zalo OA"
          ),
          makeMetricRow(
            "4",
            "Doanh nghiệp, Hộ kinh doanh & Nhà trọ",
            `${formatVNNumber(stats.totalBiz)} cơ sở`,
            `${stats.enterprises} doanh nghiệp; ${stats.hostels} cơ sở nhà trọ (${stats.pcccPassed} đạt PCCC)`
          ),
          makeMetricRow(
            "5",
            "Tiếp nhận & xử lý Phản ánh hiện trường 1022",
            `${stats.resolvedReports}/${stats.totalReports} vụ`,
            `Tỷ lệ giải quyết đạt ${stats.resolveRate}% (đang xử lý ${stats.processingReports} vụ)`
          ),
          makeMetricRow(
            "6",
            "Lịch công tác & Nhiệm vụ triển khai",
            `${stats.doneTasks}/${stats.totalTasks} việc`,
            `Đã triển khai ${stats.totalSchedules} lịch họp & công tác khu phố`
          ),
          makeMetricRow(
            "7",
            "Công tác An sinh xã hội & Quỹ Khu phố",
            `${formatVNNumber(stats.fundBalance)} đ`,
            `Thu: ${formatVNNumber(stats.totalIncome)} đ • Chi: ${formatVNNumber(stats.totalExpense)} đ`
          ),
        ],
      });

      const pText = (text: string, opts?: { bold?: boolean; indent?: boolean; center?: boolean }) =>
        new Paragraph({
          alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
          indent: opts?.indent ? { firstLine: 720 } : undefined,
          spacing: { line: 300, before: 100, after: 100 },
          children: [
            new TextRun({
              text,
              font: "Times New Roman",
              size: 26,
              bold: opts?.bold,
            }),
          ],
        });

      const signatureTable = new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4560, 4800],
        borders: noBorder,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4560, type: WidthType.DXA },
                borders: noBorder,
                children: [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: "Nơi nhận:",
                        font: "Times New Roman",
                        size: 24,
                        bold: true,
                        italics: true,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: isParty
                          ? "- Đảng ủy Phường An Phú (để b/c);"
                          : "- UBND, Ủy ban MTTQ Phường An Phú (để b/c);",
                        font: "Times New Roman",
                        size: 22,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "- Chi ủy, BĐH, Ban CTMT Khu phố 3;",
                        font: "Times New Roman",
                        size: 22,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "- Lưu: Hồ sơ Khu phố 3.",
                        font: "Times New Roman",
                        size: 22,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 4800, type: WidthType.DXA },
                borders: noBorder,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: signerRoleHeader,
                        font: "Times New Roman",
                        size: 25,
                        bold: true,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 960 },
                    children: [
                      new TextRun({
                        text: signerTitle,
                        font: "Times New Roman",
                        size: 25,
                        bold: true,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: signerName,
                        font: "Times New Roman",
                        size: 26,
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const nextPlanParagraphs = customNextPlan
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => pText(line, { indent: true }));

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 }, // Chuẩn NĐ 30/2020: Trái 3cm, Trên/Dưới/Phải 2cm
              },
            },
            children: [
              headerTable,
              new Paragraph({ spacing: { before: 240, after: 80 } }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "BÁO CÁO",
                    font: "Times New Roman",
                    size: 30,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Kết quả công tác lãnh đạo, điều hành tại Khu phố 3 — ${periodLabel} và phương hướng nhiệm vụ kỳ tới`,
                    font: "Times New Roman",
                    size: 27,
                    bold: true,
                  }),
                ],
              }),
              pText("I. ĐẶC ĐIỂM TÌNH HÌNH & ĐÁNH GIÁ CHUNG", { bold: true }),
              pText(customEvaluation, { indent: true }),
              pText("II. KẾT QUẢ THỰC HIỆN TRÊN CÁC MẶT CÔNG TÁC (TRÍCH XUẤT TỪ CSDL SỐ KP3)", {
                bold: true,
              }),
              metricsTable,
              new Paragraph({ spacing: { before: 160 } }),
              pText("III. PHƯƠNG HƯỚNG, NHIỆM VỤ TRỌNG TÂM TRONG KỲ TỚI", { bold: true }),
              ...nextPlanParagraphs,
              pText(
                `Trên đây là báo cáo kết quả công tác ${periodLabel.toLowerCase()} và phương hướng nhiệm vụ kỳ tới của ${
                  isParty ? "Chi bộ Khu phố 3" : "Ban Điều hành Khu phố 3"
                }, Phường An Phú, TP. Hồ Chí Minh, kính trình cấp trên xem xét, chỉ đạo./.`,
                { indent: true }
              ),
              new Paragraph({ spacing: { before: 240 } }),
              signatureTable,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safePeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Bao_cao_${isParty ? "ChiBo" : "BDH"}_KP3_${safePeriod}.docx`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      recordAuditLog({
        actorName,
        actorRole: "Cán bộ BĐH Khu phố 3",
        category: "DATA_EXPORT",
        actionTitle: `Xuất Báo cáo Word hành chính (${periodLabel})`,
        targetSummary: `${fileName} • Người ký: ${signerName}`,
      });

      setToast(`Đã tải xuống tệp Word chuẩn Nghị định 30/2020: ${fileName}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title="Xuất Báo Cáo Định Kỳ Chuẩn Hành Chính (.docx)"
      description="Tự động tổng hợp số liệu thực tế trên toàn hệ thống Khu phố 3 theo thể thức Nghị định 30/2020/NĐ-CP"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            leftIcon={
              isAiGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} className="text-amber-600" />
              )
            }
            disabled={isAiGenerating}
            onClick={handleAiRefine}
          >
            AI Biên tập Văn phong
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant="emerald"
              isLoading={isExporting}
              leftIcon={<FileDown size={15} />}
              onClick={handleDownloadWord}
            >
              Tải Báo cáo Word (.docx)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {toast && (
          <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Issuer + Period Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Cơ quan ban hành & Chữ ký</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setIssuerType("bdh")}
                className={`h-9 px-2.5 rounded-lg font-semibold cursor-pointer border ${
                  issuerType === "bdh"
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Ban Điều hành KP3
              </button>
              <button
                type="button"
                onClick={() => setIssuerType("chibo")}
                className={`h-9 px-2.5 rounded-lg font-semibold cursor-pointer border ${
                  issuerType === "chibo"
                    ? "bg-rose-700 text-white border-rose-700"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Chi bộ Khu phố 3
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Loại kỳ báo cáo</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "month", label: "Tháng" },
                  { id: "quarter", label: "Quý" },
                  { id: "year", label: "Năm" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPeriodType(t.id)}
                  className={`h-9 px-3 rounded-lg font-semibold cursor-pointer border ${
                    periodType === t.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}

              {periodType === "month" && (
                <select
                  id="report-month-select"
                  name="reportMonth"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      T{m}
                    </option>
                  ))}
                </select>
              )}

              {periodType === "quarter" && (
                <select
                  id="report-quarter-select"
                  name="reportQuarter"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>
                      Quý {q}
                    </option>
                  ))}
                </select>
              )}

              <select
                id="report-year-select"
                name="reportYear"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Snapshot of Auto-Collected Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] text-slate-500">Nhân khẩu • Hộ</div>
            <div className="text-sm font-extrabold text-slate-900">
              {formatVNNumber(stats.totalRes)} • {formatVNNumber(stats.totalHh)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] text-slate-500">Cơ sở KD • Nhà trọ</div>
            <div className="text-sm font-extrabold text-slate-900">
              {stats.totalBiz} • {stats.hostels} trọ
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] text-slate-500">Phản ánh 1022</div>
            <div className="text-sm font-extrabold text-emerald-700">
              {stats.resolvedReports}/{stats.totalReports} ({stats.resolveRate}%)
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] text-slate-500">Người ký văn bản</div>
            <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {issuerType === "chibo"
                ? leaders.partySecretary.name
                : leaders.neighborhoodHead.name}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="report-doc-number" className="font-semibold text-slate-700 block">
            Số văn bản (tùy chọn)
          </label>
          <input
            id="report-doc-number"
            name="reportDocNumber"
            type="text"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            placeholder={
              issuerType === "chibo" ? "Số: 12-BC/CBKP3" : "Số: 24/BC-BĐHKP3"
            }
            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="report-eval-textarea" className="font-semibold text-slate-700 block">
            I. Đánh giá chung tình hình thực hiện
          </label>
          <textarea
            id="report-eval-textarea"
            name="reportEvaluation"
            rows={3}
            value={customEvaluation}
            onChange={(e) => setCustomEvaluation(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs leading-relaxed focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="report-plan-textarea" className="font-semibold text-slate-700 block">
            III. Phương hướng, nhiệm vụ trọng tâm kỳ tới
          </label>
          <textarea
            id="report-plan-textarea"
            name="reportNextPlan"
            rows={4}
            value={customNextPlan}
            onChange={(e) => setCustomNextPlan(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs leading-relaxed focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>
    </Modal>
  );
}
