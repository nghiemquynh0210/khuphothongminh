/**
 * docxExport.ts - Trích xuất văn bản hành chính sang định dạng Microsoft Word (.docx) chuẩn quốc gia
 * Ứng dụng kỹ năng 'docx' từ Awesome Claude Skills
 * Tuân thủ Nghị định 30/2020/NĐ-CP về công tác văn thư & Tiêu chuẩn A4 Việt Nam
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

export interface DocxOfficialFormOptions {
  title: string;
  subTitle?: string;
  rawContent: string;
  signerLeftTitle?: string;
  signerLeftName?: string;
  signerRightTitle?: string;
  signerRightName?: string;
  placeAndDate?: string;
  documentNumber?: string;
}

/**
 * Tạo và tải xuống tệp tin .docx chuẩn hành chính A4
 */
export async function downloadOfficialDocx(
  options: DocxOfficialFormOptions,
  fileName?: string
): Promise<void> {
  const {
    title,
    rawContent,
    signerLeftTitle = "NGƯỜI LÀM ĐƠN / KÊ KHAI",
    signerLeftName = "(Ký, ghi rõ họ và tên)",
    signerRightTitle = "TM. BAN ĐIỀU HÀNH KHU PHỐ 3",
    signerRightName = "Trưởng Ban điều hành\n\n\nNguyễn Trung Huy",
    placeAndDate = `An Phú, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`,
    documentNumber = "Số: ...... /BĐH-KP3",
  } = options;

  const contentLines = String(rawContent || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

  // Lọc bớt Quốc hiệu nếu người dùng dán cả Quốc hiệu vào nội dung
  let startIdx = 0;
  while (startIdx < contentLines.length && startIdx < 8) {
    const trimmed = contentLines[startIdx].trim();
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

  const cleanBodyLines = contentLines.slice(startIdx);

  // Tạo các đoạn văn bản cho phần thân
  const bodyParagraphs = cleanBodyLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return new Paragraph({
        spacing: { before: 120, after: 120 },
      });
    }

    const isHeading =
      /^(?:ĐIỀU|MỤC|PHẦN|CHƯƠNG|[I|V|X]+\.|\d+\.)/i.test(trimmed) ||
      (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && trimmed.length < 80);

    return new Paragraph({
      alignment: isHeading ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      indent: isHeading ? undefined : { firstLine: 720 }, // Thụt đầu dòng 0.5 inch (1.27cm) theo NĐ 30/2020
      spacing: { line: 276, before: isHeading ? 200 : 100, after: isHeading ? 140 : 100 }, // Dãn dòng 1.15-1.25
      children: [
        new TextRun({
          text: trimmed,
          font: "Times New Roman",
          size: isHeading ? 26 : 26, // 13pt
          bold: isHeading,
        }),
      ],
    });
  });

  // Bảng chữ ký 2 cột chuẩn thể thức văn bản hành chính Việt Nam
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  const signatureTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "",
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: placeAndDate,
                    font: "Times New Roman",
                    size: 24, // 12pt
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 80 },
                children: [
                  new TextRun({
                    text: signerLeftTitle,
                    font: "Times New Roman",
                    size: 24,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 1200 },
                children: [
                  new TextRun({
                    text: signerLeftName,
                    font: "Times New Roman",
                    size: 22,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 80 },
                children: [
                  new TextRun({
                    text: signerRightTitle,
                    font: "Times New Roman",
                    size: 24,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 1200 },
                children: [
                  new TextRun({
                    text: signerRightName,
                    font: "Times New Roman",
                    size: 22,
                    bold: !signerRightName.includes("Ký"),
                    italics: signerRightName.includes("Ký"),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width: 210mm (11906 dxa)
              height: 16838, // A4 height: 297mm (16838 dxa)
            },
            margin: {
              top: 1440, // 25mm ~ 1440 dxa
              bottom: 1134, // 20mm ~ 1134 dxa
              left: 1701, // 30mm ~ 1701 dxa (lề trái để đóng gáy hồ sơ)
              right: 1134, // 20mm ~ 1134 dxa
            },
          },
        },
        children: [
          // Header 2 cột: Cơ quan ban hành & Quốc hiệu Tiêu ngữ
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [4400, 4960],
            borders: noBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 4400, type: WidthType.DXA },
                    borders: noBorder,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "UBND PHƯỜNG AN PHÚ",
                            font: "Times New Roman",
                            size: 24,
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "BAN ĐIỀU HÀNH KHU PHỐ 3",
                            font: "Times New Roman",
                            size: 24,
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 40 },
                        children: [
                          new TextRun({
                            text: documentNumber,
                            font: "Times New Roman",
                            size: 22,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4960, type: WidthType.DXA },
                    borders: noBorder,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                            font: "Times New Roman",
                            size: 24,
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 40, after: 60 },
                        children: [
                          new TextRun({
                            text: "Độc lập - Tự do - Hạnh phúc",
                            font: "Times New Roman",
                            size: 26,
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [
                          new TextRun({
                            text: "————————————",
                            font: "Times New Roman",
                            size: 20,
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Tiêu đề văn bản
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 180 },
            children: [
              new TextRun({
                text: title.toUpperCase(),
                font: "Times New Roman",
                size: 28, // 14pt
                bold: true,
              }),
            ],
          }),

          // Thân văn bản
          ...bodyParagraphs,

          // Khoảng đệm trước chữ ký
          new Paragraph({
            spacing: { before: 240, after: 120 },
          }),

          // Bảng chữ ký
          signatureTable,
        ],
      },
    ],
  });

  // Đóng gói blob và tải xuống
  const blob = await Packer.toBlob(doc);
  const outName = fileName || `${title.replace(/\s+/g, "_")}_KP3_An_Phu.docx`;

  if (typeof document !== "undefined" && typeof URL !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
