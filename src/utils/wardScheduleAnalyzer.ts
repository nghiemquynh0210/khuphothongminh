import {
  AssignedKp3Officer,
  Association,
  ScheduleAdjustmentLog,
  ScheduleEvent,
  ScheduleRelevanceTier,
  ScheduleSourceLevel,
  TaskItem,
} from "../types";
import {
  classifyMemberRoleTier,
  extractKeyLeadersSummary,
} from "./leadershipSync";

export interface RawWardScheduleEntry {
  date: string; // YYYY-MM-DD
  dayOfWeekLabel: string;
  sessionPeriod: "Sáng" | "Chiều" | "Tối";
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  fullContent: string;
  hostLeader: string;
  location: string;
  participants: string;
  directiveNotes: string;
  sourceLevel: ScheduleSourceLevel;
  sourceDocNumber: string;
}

export interface ParsedWardScheduleDocument {
  issuingBody: string;
  sourceLevel: ScheduleSourceLevel;
  documentNumber: string;
  weekRangeLabel: string;
  entries: RawWardScheduleEntry[];
  ocrSource: "gemini_vision" | "local_parser";
}

export interface SuggestedFollowUpTask {
  id: string;
  selected: boolean;
  title: string;
  description: string;
  unit: string;
  associationId?: string;
  assigneeName: string;
  assigneeRole: string;
  assigneePhone?: string;
  deadline: string;
  priority: TaskItem["priority"];
}

export interface AnalyzedScheduleCandidate {
  tempId: string;
  selected: boolean;
  date: string;
  dayOfWeekLabel: string;
  sessionPeriod: "Sáng" | "Chiều" | "Tối";
  startTime: string;
  endTime: string;
  timeRange: string;
  title: string;
  description: string;
  location: string;
  hostLeader: string;
  participantsRaw: string;
  directiveNotes: string;
  sourceLevel: ScheduleSourceLevel;
  sourceDocNumber: string;
  relevanceTier: ScheduleRelevanceTier;
  relevanceReason: string;
  namedPersonWarning?: string;
  assignedOfficers: AssignedKp3Officer[];
  suggestedTasks: SuggestedFollowUpTask[];
  mergedFromBothDocs?: boolean;
  existingDuplicateId?: string;
  conflictWithIds?: string[];
}

export interface ScheduleConflictPair {
  scheduleA: ScheduleEvent;
  scheduleB: ScheduleEvent;
  date: string;
  overlappingOfficers: string[];
  overlapTimeWindow: string;
}

function norm(input?: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function pad2(n: number | string): string {
  return String(n).padStart(2, "0");
}

export function inferSessionPeriod(startTime?: string): "Sáng" | "Chiều" | "Tối" {
  const mins = parseStartMinutes(startTime || "08:00");
  if (mins < 12 * 60 + 30) return "Sáng";
  if (mins < 17 * 60 + 45) return "Chiều";
  return "Tối";
}

export function parseStartMinutes(timeStr?: string): number {
  if (!timeStr) return 8 * 60;
  const m = String(timeStr).match(/(\d{1,2})\s*(?:[:hH]|giờ)\s*(\d{1,2})?/i);
  if (!m) return 8 * 60;
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10) || 8));
  const mm = Math.min(59, Math.max(0, parseInt(m[2] || "0", 10) || 0));
  return hh * 60 + mm;
}

export function parseTimeIntervalMinutes(timeStr?: string): [number, number] {
  if (!timeStr) return [8 * 60, 10 * 60];
  const parts = String(timeStr).split(/\s*[-–—]\s*/);
  const start = parseStartMinutes(parts[0]);
  if (parts[1]) {
    const end = parseStartMinutes(parts[1]);
    if (end > start) return [start, end];
  }
  return [start, Math.min(23 * 60 + 30, start + 120)];
}

export function formatMinutesToHHmm(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

export function getVietnameseDayLabel(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  const names = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  return names[dt.getDay()] || "";
}

function dmyToIso(d: string, m: string, y: string): string {
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${pad2(m)}-${pad2(d)}`;
}

function computePreviousDayIso(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function shiftIsoDateByDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/**
 * Bộ phân tích cấu trúc Lịch làm việc hành chính Việt Nam (Đảng ủy / HĐND - UBND Phường)
 * Bóc tách chính xác văn bản nhiều trang, nối liền các mục bị ngắt qua trang 2, 3, 4, 5, 6.
 */
export function parseVietnameseWardScheduleText(
  rawInput: string,
  hintSource?: ScheduleSourceLevel
): ParsedWardScheduleDocument {
  const text = String(rawInput || "")
    .replace(/\r\n/g, "\n")
    // Xóa dòng chỉ chứa số trang đơn lẻ giữa các trang PDF (VD: "\n2\n", "\n3\n")
    .replace(/\n\s*\d{1,2}\s*(?=\n)/g, "\n")
    // Cắt bỏ phần chân trang "Lưu ý: Lịch làm việc thay cho Thư mời..." hoặc "Nơi nhận:"
    .replace(/\n\s*(?:Lưu\s*ý\s*:|Nơi\s*nhận\s*:|TL\.\s*CHỦ\s*TỊCH|T\/L\s*BAN\s*THƯỜNG\s*VỤ)[\s\S]*$/i, "\n");

  const headerSlice = text.slice(0, 650);
  const isPartyDoc =
    hintSource === "party_ward" ||
    (!hintSource &&
      /ĐẢNG\s*ỦY\s*PHƯỜNG|BAN\s*THƯỜNG\s*VỤ\s*ĐẢNG\s*ỦY|-LLV\/ĐU/i.test(
        headerSlice
      ));
  const sourceLevel: ScheduleSourceLevel = isPartyDoc ? "party_ward" : "ubnd_ward";
  const issuingBody = isPartyDoc
    ? "Đảng ủy Phường An Phú"
    : "HĐND - UBND Phường An Phú";

  const docNumMatch = headerSlice.match(
    /Số\s*[:.]?\s*([0-9A-ZĐ\/\-]+\s*(?:LLV|TB|KH)[0-9A-ZĐ\/\-]*)/i
  );
  const rangeMatch = headerSlice.match(
    /từ\s*(?:ngày\s*)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s*đến\s*(?:ngày\s*)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i
  );
  const weekRangeLabel = rangeMatch
    ? `${rangeMatch[1]} - ${rangeMatch[2]}`
    : "";
  const documentNumber = docNumMatch
    ? `Số ${docNumMatch[1].trim()}`
    : isPartyDoc
    ? `Lịch Đảng ủy (${weekRangeLabel || "Tuần"})`
    : `Lịch UBND (${weekRangeLabel || "Tuần"})`;

  // Tách theo tiêu đề Thứ + Ngày: "THỨ HAI 16/11/2026" hoặc "THỨ HAI – 16/11/2026" hoặc "CHỦ NHẬT 22/11/2026"
  const dayHeaderRegex =
    /(?:^|\n)\s*((?:THỨ\s*(?:HAI|BA|TƯ|NĂM|SÁU|BẢY|2|3|4|5|6|7)|CHỦ\s*NHẬT))\s*[–\-:]?\s*(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/gi;

  const dayBlocks: Array<{
    dayLabel: string;
    isoDate: string;
    body: string;
  }> = [];

  let match: RegExpExecArray | null;
  const matches: Array<{
    index: number;
    endIndex: number;
    dayLabel: string;
    isoDate: string;
  }> = [];

  while ((match = dayHeaderRegex.exec(text)) !== null) {
    const rawDay = match[1].replace(/\s+/g, " ").trim();
    const formattedDay = rawDay
      .toLowerCase()
      .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    matches.push({
      index: match.index,
      endIndex: dayHeaderRegex.lastIndex,
      dayLabel: formattedDay,
      isoDate: dmyToIso(match[2], match[3], match[4]),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : text.length;
    dayBlocks.push({
      dayLabel: cur.dayLabel,
      isoDate: cur.isoDate,
      body: text.slice(cur.endIndex, nextStart).trim(),
    });
  }

  const entries: RawWardScheduleEntry[] = [];

  for (const day of dayBlocks) {
    // Tách Sáng / Chiều / Tối trong từng ngày
    const sessionRegex = /(?:^|\n)\s*(Sáng|Chiều|Tối)\b\s*[:.]?\s*/gi;
    const sessionHits: Array<{
      period: "Sáng" | "Chiều" | "Tối";
      idx: number;
      contentStart: number;
    }> = [];

    let sMatch: RegExpExecArray | null;
    while ((sMatch = sessionRegex.exec(day.body)) !== null) {
      const pRaw = sMatch[1].toLowerCase();
      const period: "Sáng" | "Chiều" | "Tối" =
        pRaw === "chiều" ? "Chiều" : pRaw === "tối" ? "Tối" : "Sáng";
      sessionHits.push({
        period,
        idx: sMatch.index,
        contentStart: sessionRegex.lastIndex,
      });
    }

    const sessionChunks =
      sessionHits.length > 0
        ? sessionHits.map((sh, idx) => ({
            period: sh.period,
            content: day.body
              .slice(
                sh.contentStart,
                idx + 1 < sessionHits.length ? sessionHits[idx + 1].idx : day.body.length
              )
              .trim(),
          }))
        : [{ period: "Sáng" as const, content: day.body }];

    for (const sc of sessionChunks) {
      if (!sc.content) continue;

      // Tách từng mục theo giờ bắt đầu: "1- 08h00:", "2- 8h30:", "- 09h30:", "- 08 giờ,", "- 09 giờ 30,"
      const itemStartRegex =
        /(?:^|\n)\s*(?:(?:\d+\s*[-.)]\s*)|(?:[-•+]\s*))?(\d{1,2})\s*(?:[:hH]|giờ)\s*(\d{0,2})\s*[,:.]?\s*/g;
      const itemHits: Array<{
        idx: number;
        bodyStart: number;
        hh: number;
        mm: number;
      }> = [];

      let iMatch: RegExpExecArray | null;
      while ((iMatch = itemStartRegex.exec(sc.content)) !== null) {
        // Đảm bảo đây là đầu mục thời gian (không phải "(25/11)" hay "07/11" hoặc năm)
        const prefixSlice = sc.content.slice(Math.max(0, iMatch.index - 3), iMatch.index + 6);
        if (/\d+\/\d+/.test(prefixSlice)) continue;
        const hh = parseInt(iMatch[1], 10);
        const mm = parseInt(iMatch[2] || "0", 10) || 0;
        if (hh > 23 || mm > 59) continue;
        itemHits.push({
          idx: iMatch.index,
          bodyStart: itemStartRegex.lastIndex,
          hh,
          mm,
        });
      }

      if (itemHits.length === 0) {
        // Mục không ghi giờ cụ thể (VD: "Chiều: Bí thư, Phó Bí thư xử lý công việc tại cơ quan")
        const defaultStart =
          sc.period === "Sáng" ? "08:00" : sc.period === "Chiều" ? "14:00" : "19:00";
        const parsedSingle = parseSingleEntryBlock(
          sc.content,
          day.isoDate,
          day.dayLabel,
          sc.period,
          defaultStart,
          sourceLevel,
          documentNumber
        );
        if (parsedSingle) entries.push(parsedSingle);
        continue;
      }

      for (let k = 0; k < itemHits.length; k++) {
        const hit = itemHits[k];
        const nextIdx = k + 1 < itemHits.length ? itemHits[k + 1].idx : sc.content.length;
        const rawItemBody = sc.content.slice(hit.bodyStart, nextIdx).trim();
        const startHHmm = `${pad2(hit.hh)}:${pad2(hit.mm)}`;
        const parsedItem = parseSingleEntryBlock(
          rawItemBody,
          day.isoDate,
          day.dayLabel,
          sc.period,
          startHHmm,
          sourceLevel,
          documentNumber
        );
        if (parsedItem) entries.push(parsedItem);
      }
    }
  }

  return {
    issuingBody,
    sourceLevel,
    documentNumber,
    weekRangeLabel,
    entries,
    ocrSource: "local_parser",
  };
}

function parseSingleEntryBlock(
  rawBlock: string,
  isoDate: string,
  dayOfWeekLabel: string,
  sessionPeriod: "Sáng" | "Chiều" | "Tối",
  startTime: string,
  sourceLevel: ScheduleSourceLevel,
  sourceDocNumber: string
): RawWardScheduleEntry | null {
  const cleaned = rawBlock.replace(/\s+\n/g, "\n").trim();
  if (!cleaned || cleaned.length < 6) return null;

  // Bóc Địa điểm
  const locMatch = cleaned.match(
    /Địa\s*điểm\s*[:.]?\s*([^\n]+(?:\n(?!(?:Thành\s*phần|Mời\s*dự|Cùng\s*dự|LĐVP|Nội\s*dung|\(Giao))[^\n]+)*)/i
  );
  const location = locMatch
    ? locMatch[1]
        .replace(/\n+/g, " ")
        .replace(/\s*(?:LĐVP|VP)\s*[:.].*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[.;]+$/, "")
    : sourceLevel === "party_ward"
    ? "Trụ sở Đảng ủy - UBND Phường An Phú"
    : "UBND Phường An Phú";

  // Bóc Thành phần / Mời dự / Cùng dự
  const partRegex =
    /(?:Thành\s*phần|Mời\s*dự|Cùng\s*dự)\s*[:.]+\s*([\s\S]*?)(?=(?:\n\s*(?:Địa\s*điểm|LĐVP|VP\s*:))|$)/gi;
  const partPieces: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = partRegex.exec(cleaned)) !== null) {
    partPieces.push(pm[1].replace(/\s+/g, " ").trim());
  }
  const participants = partPieces.join("; ");

  // Bóc các ghi chú trong ngoặc đơn (Giao..., Nhờ khu phố thông báo mời...)
  const parenNotes: string[] = [];
  const parenRegex = /\(([^)]*(?:giao|nhờ|khu phố|thông báo|chuẩn bị|mời)[^)]*)\)/gi;
  let prm: RegExpExecArray | null;
  while ((prm = parenRegex.exec(cleaned)) !== null) {
    parenNotes.push(prm[1].replace(/\s+/g, " ").trim());
  }

  // Phần mở đầu trước Địa điểm / Mời dự / Thành phần / Nội dung 1 là tiêu đề + người chủ trì
  const headlineBlock = cleaned
    .split(/\n\s*(?:Địa\s*điểm|Mời\s*dự|Cùng\s*dự|Thành\s*phần|Nội\s*dung\s*1|\(Giao)/i)[0]
    .replace(/\s+/g, " ")
    .trim();

  // Tách chủ trì và tên sự kiện
  let hostLeader = "";
  let title = headlineBlock;

  const verbMatch = headlineBlock.match(
    /^([\s\S]{5,140}?)\s+(tham\s+dự|dự\s+buổi\s+làm\s+việc|dự\s+Hội\s+nghị|dự\s+Lớp|dự\s+Lễ|dự\s+Chương\s+trình|chủ\s+trì|họp\s+|tiếp\s+công\s+dân|làm\s+việc\s+với|giải\s+quyết|xử\s+lý)\s*([\s\S]*)$/i
  );
  if (verbMatch) {
    hostLeader = verbMatch[1].replace(/^[,\-–\s]+|[,\-–\s]+$/g, "").trim();
    const verb = verbMatch[2].trim();
    const rest = verbMatch[3].trim();
    const rawEventTitle = `${verb} ${rest}`.trim();
    title = rawEventTitle
      .replace(/^dự\s+dự\s+/i, "Dự ")
      .replace(/^tham\s+dự\s+/i, "")
      .replace(/^dự\s+/i, "")
      .replace(/^chủ\s+trì\s+/i, "")
      .trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  if (title.length > 165) {
    title = title.slice(0, 162).trim() + "...";
  }

  const startMins = parseStartMinutes(startTime);
  const endMins =
    sessionPeriod === "Sáng"
      ? Math.min(11 * 60 + 30, startMins + 150)
      : sessionPeriod === "Chiều"
      ? Math.min(17 * 60, startMins + 150)
      : Math.min(21 * 60 + 30, startMins + 120);

  return {
    date: isoDate,
    dayOfWeekLabel: dayOfWeekLabel || getVietnameseDayLabel(isoDate),
    sessionPeriod,
    startTime,
    endTime: formatMinutesToHHmm(endMins),
    title: title || headlineBlock,
    fullContent: cleaned,
    hostLeader: hostLeader || (sourceLevel === "party_ward" ? "Thường trực Đảng ủy Phường" : "Lãnh đạo UBND Phường"),
    location,
    participants,
    directiveNotes: parenNotes.join("; "),
    sourceLevel,
    sourceDocNumber,
  };
}

/**
 * Đọc tệp PDF hoặc Ảnh lịch cấp trên qua Gemini 2.5 Flash Vision (/api/ocr-document),
 * kèm fallback đọc text trực tiếp nếu là file .txt.
 */
export async function extractWardScheduleFromFile(
  file: File
): Promise<ParsedWardScheduleDocument | null> {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    const txt = await file.text();
    return parseVietnameseWardScheduleText(txt);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp lịch công tác"));
    reader.readAsDataURL(file);
  });

  try {
    const { getStaffAuthHeaders } = await import("./imageUpload");
    const authHeaders = await getStaffAuthHeaders();
    const resp = await fetch("/api/ocr-document", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        docType: "ward_schedule",
        fileBase64: dataUrl,
        mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        fileName: file.name,
      }),
    });

    if (resp.ok) {
      const json = await resp.json();
      if (json?.available && json?.data && Array.isArray(json.data.entries)) {
        const d = json.data;
        const srcLevel: ScheduleSourceLevel =
          d.sourceLevel === "party_ward" ? "party_ward" : "ubnd_ward";
        const docNo =
          String(d.documentNumber || "").trim() ||
          (srcLevel === "party_ward" ? "Lịch Đảng ủy Phường" : "Lịch UBND Phường");

        const mappedEntries: RawWardScheduleEntry[] = d.entries
          .filter((e: any) => e && e.date && e.title)
          .map((e: any) => {
            const st = formatMinutesToHHmm(parseStartMinutes(e.startTime || "08:00"));
            const period: "Sáng" | "Chiều" | "Tối" =
              e.sessionPeriod === "Chiều" || e.sessionPeriod === "Tối"
                ? e.sessionPeriod
                : inferSessionPeriod(st);
            const et = e.endTime
              ? formatMinutesToHHmm(parseStartMinutes(e.endTime))
              : formatMinutesToHHmm(parseStartMinutes(st) + 150);

            return {
              date: String(e.date).trim(),
              dayOfWeekLabel:
                String(e.dayOfWeekLabel || "").trim() ||
                getVietnameseDayLabel(String(e.date).trim()),
              sessionPeriod: period,
              startTime: st,
              endTime: et,
              title: String(e.title || "").trim(),
              fullContent: String(e.fullContent || e.title || "").trim(),
              hostLeader: String(e.hostLeader || d.issuingBody || "Lãnh đạo Phường").trim(),
              location: String(e.location || "UBND Phường An Phú").trim(),
              participants: String(e.participants || "").trim(),
              directiveNotes: String(e.directiveNotes || "").trim(),
              sourceLevel: srcLevel,
              sourceDocNumber: docNo,
            };
          });

        if (mappedEntries.length > 0) {
          return {
            issuingBody:
              String(d.issuingBody || "").trim() ||
              (srcLevel === "party_ward"
                ? "Đảng ủy Phường An Phú"
                : "UBND Phường An Phú"),
            sourceLevel: srcLevel,
            documentNumber: docNo,
            weekRangeLabel: String(d.weekRangeLabel || "").trim(),
            entries: mappedEntries,
            ocrSource: "gemini_vision",
          };
        }
      }
    }
  } catch {
    // Trả về null để UI hướng dẫn dán văn bản hoặc cấu hình khóa AI
  }

  return null;
}

/**
 * Phân tích thông minh toàn bộ các mục lịch từ 1 hoặc nhiều văn bản cấp trên:
 * 1. Phân tầng mức độ liên quan đến Khu phố 3 (Bắt buộc dự / Phối hợp địa bàn / Tham khảo lịch Phường)
 * 2. Ánh xạ chính xác chức danh được mời sang Cán bộ đương nhiệm của KP3 từ `associations`
 * 3. Khử trùng & Hợp nhất các cuộc họp xuất hiện đồng thời trên cả Lịch Đảng ủy & Lịch UBND
 * 4. Đề xuất tự động các Nhiệm vụ chuẩn bị / thông báo mời phát sinh
 */
export function analyzeWardDocumentsForKp3(
  docs: ParsedWardScheduleDocument[],
  associations: Association[],
  existingSchedules: ScheduleEvent[] = []
): AnalyzedScheduleCandidate[] {
  const leaders = extractKeyLeadersSummary(associations);
  const partyAssoc = associations.find((a) => a.id === "ASC_DANG");
  const bdhAssoc = associations.find((a) => a.id === "ASC_BDH");
  const mtAssoc = associations.find((a) => a.id === "ASC_MT" || a.id === "ASC_MATTRAN");
  const pnAssoc = associations.find((a) => a.id === "ASC_PN" || a.id === "ASC_PHUNU");
  const tnAssoc = associations.find((a) => a.id === "ASC_TN" || a.id === "ASC_THANHNIEN");

  const rawCandidates: AnalyzedScheduleCandidate[] = [];

  docs.forEach((doc, docIdx) => {
    doc.entries.forEach((entry, entryIdx) => {
      const combinedLower = norm(
        `${entry.title} ${entry.fullContent} ${entry.participants} ${entry.directiveNotes}`
      );
      const partLower = norm(`${entry.participants} ${entry.directiveNotes} ${entry.fullContent}`);

      // Kiểm tra có nhắc đích danh Khu phố 3 hoặc mời chung các khu phố / các chi bộ trực thuộc không
      const mentionsKp3Directly =
        /\bkhu\s*phố\s*0?3\b|\bkp\s*0?3\b|\bchi\s*bộ\s*0?3\b/i.test(combinedLower);
      const mentionsOtherKpOnly =
        !mentionsKp3Directly &&
        /\bkhu\s*phố\s*(?:1|2|4|5|6|7|8|9|10|11|12|13|14)\b/i.test(combinedLower) &&
        !/các\s*khu\s*phố|các\s*chi\s*bộ/i.test(combinedLower);

      const invitesAllNeighborhoods =
        !mentionsOtherKpOnly &&
        /các\s*khu\s*phố|ban\s*điều\s*hành\s*các\s*khu\s*phố|trưởng\s*khu\s*phố|chi\s*bộ\s*trực\s*thuộc|các\s*tổ\s*chức\s*đảng\s*trực\s*thuộc|nhờ\s*khu\s*phố/i.test(
          partLower
        );

      const mentionsLocalEnterprises =
        /các\s*doanh\s*nghiệp,\s*hợp\s*tác\s*xã\s*trên\s*địa\s*bàn\s*phường/i.test(
          partLower
        );

      let relevanceTier: ScheduleRelevanceTier = "ward_reference";
      let relevanceReason = "Lịch công tác nội bộ của Lãnh đạo Phường (Lưu tra cứu khi cần liên hệ)";
      const assignedOfficers: AssignedKp3Officer[] = [];
      const suggestedTasks: SuggestedFollowUpTask[] = [];
      let namedPersonWarning: string | undefined;

      const pushOfficer = (officer: AssignedKp3Officer) => {
        if (!officer.name) return;
        const exists = assignedOfficers.some(
          (o) => norm(o.name) === norm(officer.name)
        );
        if (!exists) {
          assignedOfficers.push(officer);
        }
      };

      if (mentionsKp3Directly || invitesAllNeighborhoods) {
        relevanceTier = "mandatory_kp3";
        relevanceReason = mentionsKp3Directly
          ? "Văn bản triệu tập đích danh Khu phố 3 tham dự"
          : "Triệu tập cấp Khu phố / Chi bộ trực thuộc (Thay cho Thư mời)";

        // 1. Kiểm tra Cấp ủy Chi bộ (Bí thư, Phó Bí thư, Chi ủy viên)
        if (/bí\s*thư\s*chi\s*bộ|bí\s*thư,\s*phó\s*bí\s*thư|cấp\s*ủy|chi\s*ủy/i.test(partLower)) {
          pushOfficer({
            name: leaders.partySecretary.name,
            role: "Bí thư Chi bộ KP3",
            associationId: "ASC_DANG",
            phone: leaders.partySecretary.phone,
            attendanceRole: "primary",
          });
        }

        if (/phó\s*bí\s*thư,\s*chi\s*ủy\s*viên|bí\s*thư,\s*phó\s*bí\s*thư/i.test(partLower)) {
          if (leaders.deputyPartySecretary) {
            pushOfficer({
              name: leaders.deputyPartySecretary.name,
              role: "Phó Bí thư Chi bộ KP3",
              associationId: "ASC_DANG",
              phone: leaders.deputyPartySecretary.phone,
              attendanceRole: "primary",
            });
          }
          if (/chi\s*ủy\s*viên/i.test(partLower) && partyAssoc) {
            partyAssoc.members
              .filter((m) => classifyMemberRoleTier(m.role) === "committee")
              .forEach((m) => {
                pushOfficer({
                  name: m.fullName,
                  role: m.role,
                  associationId: "ASC_DANG",
                  phone: m.phone,
                  attendanceRole: "primary",
                });
              });
          }
        }

        // 2. Kiểm tra Ban điều hành Khu phố (Trưởng / Đại diện BĐH)
        if (/trưởng\s*ban\s*điều\s*hành|đại\s*diện\s*ban\s*điều\s*hành|trưởng\s*khu\s*phố/i.test(partLower)) {
          pushOfficer({
            name: leaders.neighborhoodHead.name,
            role: "Trưởng Ban Điều hành KP3",
            associationId: "ASC_BDH",
            phone: leaders.neighborhoodHead.phone,
            attendanceRole: "primary",
          });
        }

        // 3. Kiểm tra Ban Công tác Mặt trận KP3 (bao gồm phát hiện tên cá nhân cụ thể trên văn bản!)
        if (/ban\s*công\s*tác\s*mặt\s*trận|ban\s*ctmt|trưởng\s*ban\s*ctmt/i.test(partLower)) {
          const currentFrontHead =
            leaders.frontHead?.name ||
            mtAssoc?.leaderName ||
            leaders.partySecretary.name;

          // Kiểm tra xem văn bản có ghi đích danh tên người trước "- Trưởng Ban Công tác Mặt trận khu phố 3" không
          const namedKp3Match = entry.participants.match(
            /(?:Ông|Bà|Đồng\s*chí|Đ\/c)\s+([A-ZÀ-Ỹ][^\-;,\n]{3,35}?)\s*[-–]\s*([^\-;,\n]*khu\s*phố\s*3)/i
          );

          if (namedKp3Match) {
            const docPersonName = namedKp3Match[1].trim();
            const docRoleLabel = namedKp3Match[2].trim();
            pushOfficer({
              name: docPersonName,
              role: docRoleLabel,
              associationId: "ASC_MT",
              attendanceRole: "primary",
              note: "Đích danh trên Lịch cấp trên",
            });
            if (currentFrontHead && norm(docPersonName) !== norm(currentFrontHead)) {
              namedPersonWarning = `Văn bản ghi đích danh "${docPersonName}" (${docRoleLabel}), trong khi CSDL Chi hội KP3 hiện ghi "${currentFrontHead}". Vui lòng kiểm tra xác nhận người dự.`;
            }
          } else if (currentFrontHead) {
            pushOfficer({
              name: currentFrontHead,
              role: "Trưởng Ban CTMT KP3",
              associationId: mtAssoc?.id || "ASC_MT",
              phone: leaders.frontHead?.phone,
              attendanceRole: "primary",
            });
          }
        }

        // 3b. Kiểm tra các Chi hội đoàn thể & lực lượng cơ sở khác trong Quản lý Chi hội
        const extraAssocMatchers: Array<{
          regex: RegExp;
          assocId: string;
          fallbackRole: string;
        }> = [
          {
            regex: /chi\s*hội\s*phụ\s*nữ|chi\s*hội\s*trưởng\s*phụ\s*nữ/i,
            assocId: "ASC_PN",
            fallbackRole: "Chi hội trưởng Phụ nữ KP3",
          },
          {
            regex: /bí\s*thư\s*chi\s*đoàn|chi\s*đoàn\s*khu\s*phố/i,
            assocId: "ASC_TN",
            fallbackRole: "Bí thư Chi đoàn KP3",
          },
          {
            regex: /chi\s*hội\s*cựu\s*chiến\s*binh/i,
            assocId: "ASC_CCB",
            fallbackRole: "Chi hội trưởng CCB KP3",
          },
          {
            regex: /chi\s*hội\s*người\s*cao\s*tuổi/i,
            assocId: "ASC_NCT",
            fallbackRole: "Chi hội trưởng NCT KP3",
          },
          {
            regex: /chi\s*hội\s*chữ\s*thập\s*đỏ/i,
            assocId: "ASC_CTD",
            fallbackRole: "Chi hội trưởng CTĐ KP3",
          },
          {
            regex: /tổ\s*trưởng\s*(?:tổ\s*)?antt|tổ\s*bảo\s*vệ\s*an\s*ninh\s*trật\s*tự/i,
            assocId: "ASC_ANTT",
            fallbackRole: "Tổ trưởng ANTT cơ sở KP3",
          },
          {
            regex: /khu\s*đội\s*trưởng|chỉ\s*huy\s*trưởng\s*dqtv/i,
            assocId: "ASC_KHUDOI",
            fallbackRole: "Khu đội trưởng KP3",
          },
        ];

        for (const item of extraAssocMatchers) {
          if (item.regex.test(partLower)) {
            const matchedAssoc = associations.find((a) => a.id === item.assocId);
            if (matchedAssoc?.leaderName && matchedAssoc.leaderName !== "Chưa phân công") {
              const headMem = matchedAssoc.members?.find(
                (m) => norm(m.fullName) === norm(matchedAssoc.leaderName)
              );
              pushOfficer({
                name: matchedAssoc.leaderName,
                role: headMem?.role ? `${headMem.role} KP3` : item.fallbackRole,
                associationId: matchedAssoc.id,
                phone: headMem?.phone,
                attendanceRole: "primary",
              });
            }
          }
        }

        // Fallback nếu có mời khu phố chung nhưng chưa khớp chức danh riêng
        if (assignedOfficers.length === 0) {
          pushOfficer({
            name: leaders.neighborhoodHead.name,
            role: "Trưởng Ban Điều hành KP3",
            associationId: bdhAssoc?.id || "ASC_BDH",
            phone: leaders.neighborhoodHead.phone,
            attendanceRole: "primary",
          });
        }

        // 4. Phát hiện các Nhiệm vụ phối hợp / triệu tập phát sinh cho KP3
        if (/nhờ\s*khu\s*phố\s*thông\s*báo\s*mời/i.test(combinedLower)) {
          const targetAssoc =
            /phụ\s*nữ|bình\s*đẳng\s*giới/i.test(combinedLower) && pnAssoc
              ? pnAssoc
              : bdhAssoc;
          suggestedTasks.push({
            id: `AUTO-TASK-${docIdx}-${entryIdx}-INVITE`,
            selected: true,
            title: `Thông báo mời CLB, đội nhóm & đoàn thể KP3 dự: ${entry.title}`,
            description: `Thực hiện chỉ đạo trên ${entry.sourceDocNumber}: Thông báo mời đại diện các CLB, đội nhóm, hội viên tại Khu phố 3 tham dự lúc ${entry.startTime} ngày ${entry.date} tại ${entry.location}.`,
            unit: targetAssoc?.name || "Ban điều hành khu phố",
            associationId: targetAssoc?.id || "ASC_BDH",
            assigneeName: targetAssoc?.leaderName || leaders.neighborhoodHead.name,
            assigneeRole:
              targetAssoc?.id === pnAssoc?.id ? "Chi hội trưởng Phụ nữ" : "Trưởng BĐH KP3",
            deadline: computePreviousDayIso(entry.date),
            priority: "Cao",
          });
        }

        if (/đảng\s*viên\s*hưu\s*trí|thành\s*viên\s*ban\s*công\s*tác\s*mặt\s*trận\s*các\s*khu\s*phố/i.test(partLower)) {
          suggestedTasks.push({
            id: `AUTO-TASK-${docIdx}-${entryIdx}-PARTY`,
            selected: true,
            title: `Triệu tập TV Ban CTMT & Đảng viên hưu trí KP3 dự: ${entry.title}`,
            description: `Gửi thông báo mời các đồng chí Thành viên Ban Công tác Mặt trận KP3 và đảng viên hưu trí sinh hoạt tại Chi bộ KP3 tham dự hội nghị lúc ${entry.startTime} ngày ${entry.date} (${entry.location}).`,
            unit: partyAssoc?.name || "Chi bộ",
            associationId: "ASC_DANG",
            assigneeName:
              leaders.deputyPartySecretary?.name || leaders.partySecretary.name,
            assigneeRole: leaders.deputyPartySecretary
              ? "Phó Bí thư Chi bộ"
              : "Bí thư Chi bộ",
            deadline: computePreviousDayIso(entry.date),
            priority: "Cao",
          });
        }

        if (/đội\s*tham\s*gia\s*hội\s*thi/i.test(partLower)) {
          suggestedTasks.push({
            id: `AUTO-TASK-${docIdx}-${entryIdx}-TEAM`,
            selected: true,
            title: `Rà soát điểm danh Đội dự thi của KP3 tham gia: ${entry.title}`,
            description: `Đảm bảo quân số Đội thi Khu phố 3 có mặt đúng ${entry.startTime} ngày ${entry.date} tại ${entry.location}.`,
            unit: tnAssoc?.name || "Ban điều hành khu phố",
            associationId: tnAssoc?.id || "ASC_BDH",
            assigneeName: tnAssoc?.leaderName || leaders.neighborhoodHead.name,
            assigneeRole: tnAssoc ? "Bí thư Chi đoàn" : "Trưởng BĐH KP3",
            deadline: computePreviousDayIso(entry.date),
            priority: "Cao",
          });
        }
      } else if (mentionsLocalEnterprises) {
        relevanceTier = "coordination_kp3";
        relevanceReason =
          "Hội nghị Phường mời các Doanh nghiệp trên địa bàn (Gợi ý thông báo cho DN tại KP3)";
        pushOfficer({
          name: leaders.neighborhoodHead.name,
          role: "Trưởng Ban Điều hành KP3 (Phối hợp thông tin)",
          associationId: "ASC_BDH",
          phone: leaders.neighborhoodHead.phone,
          attendanceRole: "coordinating",
        });
        suggestedTasks.push({
          id: `AUTO-TASK-${docIdx}-${entryIdx}-BIZ`,
          selected: false,
          title: `Chuyển tiếp thông báo Hội nghị thuế & chuyển đổi số đến Doanh nghiệp KP3`,
          description: `Thông tin đến các doanh nghiệp trên địa bàn Khu phố 3 lịch Hội nghị lúc ${entry.startTime} ngày ${entry.date} tại ${entry.location}.`,
          unit: "Ban điều hành khu phố",
          associationId: "ASC_BDH",
          assigneeName: leaders.neighborhoodHead.name,
          assigneeRole: "Trưởng BĐH KP3",
          deadline: computePreviousDayIso(entry.date),
          priority: "Trung bình",
        });
      }

      rawCandidates.push({
        tempId: `CAND-${docIdx}-${entryIdx}-${entry.date}-${entry.startTime.replace(":", "")}`,
        selected: relevanceTier === "mandatory_kp3",
        date: entry.date,
        dayOfWeekLabel: entry.dayOfWeekLabel,
        sessionPeriod: entry.sessionPeriod,
        startTime: entry.startTime,
        endTime: entry.endTime,
        timeRange: `${entry.startTime} - ${entry.endTime}`,
        title: entry.title,
        description: entry.fullContent,
        location: entry.location,
        hostLeader: entry.hostLeader,
        participantsRaw: entry.participants,
        directiveNotes: entry.directiveNotes,
        sourceLevel: entry.sourceLevel,
        sourceDocNumber: entry.sourceDocNumber,
        relevanceTier,
        relevanceReason,
        namedPersonWarning,
        assignedOfficers,
        suggestedTasks,
      });
    });
  });

  // Bước 2: Khử trùng & Hợp nhất các cuộc họp trùng nhau giữa Lịch Đảng ủy & Lịch UBND
  const merged = mergeDuplicateWardCandidates(rawCandidates);

  // Bước 3: Đối chiếu với lịch hiện hữu trong hệ thống để đánh dấu trùng lặp hoặc xung đột giờ
  return merged.map((cand) => {
    const existingDup = existingSchedules.find(
      (ex) =>
        ex.date === cand.date &&
        Math.abs(parseStartMinutes(ex.time) - parseStartMinutes(cand.startTime)) <= 30 &&
        hasSimilarMeetingTopicOrHall(ex.title, ex.location, cand.title, cand.location)
    );

    const conflictIds = existingSchedules
      .filter((ex) => {
        if (ex.id === existingDup?.id || ex.status === "Đã hoãn" || ex.status === "Đã kết thúc") {
          return false;
        }
        if (ex.date !== cand.date) return false;
        const [s1, e1] = parseTimeIntervalMinutes(cand.timeRange);
        const [s2, e2] = parseTimeIntervalMinutes(ex.time);
        if (Math.max(s1, s2) >= Math.min(e1, e2)) return false;
        // Có chung ít nhất 1 cán bộ KP3 được phân công
        const exNames = getScheduleOfficerNames(ex);
        return cand.assignedOfficers.some((o) =>
          exNames.some((en) => norm(en).includes(norm(o.name)) || norm(o.name).includes(norm(en)))
        );
      })
      .map((ex) => ex.id);

    return {
      ...cand,
      selected: existingDup ? false : cand.selected,
      existingDuplicateId: existingDup?.id,
      conflictWithIds: conflictIds.length > 0 ? conflictIds : undefined,
    };
  });
}

function extractSignificantTokens(text: string): string[] {
  const stop = new Set([
    "hoi", "nghi", "buoi", "lam", "viec", "trien", "khai", "thuc", "hien",
    "phuong", "an", "phu", "nam", "2026", "cua", "cac", "va", "ve", "tai",
    "ban", "thuong", "truc", "dang", "uy", "ubnd", "hdnd", "dong", "chi",
  ]);
  return norm(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w));
}

function normalizeHallKey(location: string): string {
  const l = norm(location)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  if (l.includes("hoi truong a")) return "hall_a";
  if (l.includes("hoi truong b")) return "hall_b";
  if (l.includes("hoi truong d")) return "hall_d";
  if (l.includes("phong hop 3") && l.includes("nguyen van troi")) return "ubkt_tu";
  if (l.includes("cong an phuong")) return "cap_an_phu";
  if (l.includes("cung van hoa lao dong")) return "cvhld_d19";
  if (l.includes("tiep cong dan")) return "phong_tcd";
  return l.slice(0, 35);
}

function hasSimilarMeetingTopicOrHall(
  titleA: string,
  locA: string,
  titleB: string,
  locB: string
): boolean {
  const hallA = normalizeHallKey(locA);
  const hallB = normalizeHallKey(locB);
  const tokensA = extractSignificantTokens(titleA);
  const tokensB = new Set(extractSignificantTokens(titleB));
  const shared = tokensA.filter((t) => tokensB.has(t)).length;
  const overlapRatio =
    tokensA.length > 0 && tokensB.size > 0
      ? shared / Math.min(tokensA.length, tokensB.size)
      : 0;

  if (hallA && hallA === hallB && overlapRatio >= 0.25) return true;
  return overlapRatio >= 0.5;
}

function mergeDuplicateWardCandidates(
  list: AnalyzedScheduleCandidate[]
): AnalyzedScheduleCandidate[] {
  const result: AnalyzedScheduleCandidate[] = [];

  for (const item of list) {
    const matchIdx = result.findIndex(
      (cur) =>
        cur.date === item.date &&
        Math.abs(parseStartMinutes(cur.startTime) - parseStartMinutes(item.startTime)) <= 30 &&
        hasSimilarMeetingTopicOrHall(cur.title, cur.location, item.title, item.location)
    );

    if (matchIdx === -1) {
      result.push(item);
      continue;
    }

    const existing = result[matchIdx];
    const mergedOfficers = [...existing.assignedOfficers];
    for (const off of item.assignedOfficers) {
      if (!mergedOfficers.some((o) => norm(o.name) === norm(off.name))) {
        mergedOfficers.push(off);
      }
    }

    const mergedTasks = [...existing.suggestedTasks];
    for (const t of item.suggestedTasks) {
      if (!mergedTasks.some((mt) => norm(mt.title) === norm(t.title))) {
        mergedTasks.push(t);
      }
    }

    const tierRank: Record<ScheduleRelevanceTier, number> = {
      mandatory_kp3: 3,
      coordination_kp3: 2,
      ward_reference: 1,
    };
    const winningTier =
      tierRank[item.relevanceTier] > tierRank[existing.relevanceTier]
        ? item.relevanceTier
        : existing.relevanceTier;

    const isCrossSource = existing.sourceLevel !== item.sourceLevel;

    result[matchIdx] = {
      ...existing,
      selected: winningTier === "mandatory_kp3",
      relevanceTier: winningTier,
      relevanceReason:
        winningTier === "mandatory_kp3"
          ? isCrossSource
            ? "Đã hợp nhất tự động từ cả Lịch Đảng ủy & Lịch UBND Phường (Tránh trùng lịch)"
            : existing.relevanceReason
          : existing.relevanceReason,
      sourceLevel: isCrossSource ? "merged_ward" : existing.sourceLevel,
      sourceDocNumber: isCrossSource
        ? `${existing.sourceDocNumber} + ${item.sourceDocNumber}`
        : existing.sourceDocNumber,
      description:
        item.description.length > existing.description.length
          ? item.description
          : existing.description,
      participantsRaw: [existing.participantsRaw, item.participantsRaw]
        .filter(Boolean)
        .join(" | "),
      directiveNotes: [existing.directiveNotes, item.directiveNotes]
        .filter(Boolean)
        .join("; "),
      namedPersonWarning: existing.namedPersonWarning || item.namedPersonWarning,
      assignedOfficers: mergedOfficers,
      suggestedTasks: mergedTasks,
      mergedFromBothDocs: isCrossSource || existing.mergedFromBothDocs,
    };
  }

  return result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return parseStartMinutes(a.startTime) - parseStartMinutes(b.startTime);
  });
}

export function getScheduleOfficerNames(sch: ScheduleEvent): string[] {
  if (sch.assignedOfficers && sch.assignedOfficers.length > 0) {
    return sch.assignedOfficers.map((o) => o.name).filter(Boolean);
  }
  return sch.attendees
    .split(/[,;•|]+/)
    .map((s) => s.replace(/\(.*?\)/g, "").trim())
    .filter((s) => s.length >= 4);
}

/**
 * Phát hiện tất cả các cặp Lịch công tác bị trùng khung giờ của cùng 1 cán bộ KP3
 */
export function detectScheduleConflicts(
  schedules: ScheduleEvent[]
): ScheduleConflictPair[] {
  const active = schedules.filter(
    (s) =>
      s.status !== "Đã hoãn" &&
      s.status !== "Đã kết thúc" &&
      s.relevanceTier !== "ward_reference"
  );
  const conflicts: ScheduleConflictPair[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.date !== b.date) continue;

      const [s1, e1] = parseTimeIntervalMinutes(a.time);
      const [s2, e2] = parseTimeIntervalMinutes(b.time);
      const overlapStart = Math.max(s1, s2);
      const overlapEnd = Math.min(e1, e2);
      if (overlapStart >= overlapEnd) continue;

      const officersA = getScheduleOfficerNames(a);
      const officersB = getScheduleOfficerNames(b);
      const overlappingOfficers = officersA.filter((na) =>
        officersB.some(
          (nb) =>
            norm(na) === norm(nb) ||
            (norm(na).length >= 6 && norm(nb).includes(norm(na))) ||
            (norm(nb).length >= 6 && norm(na).includes(norm(nb)))
        )
      );

      if (overlappingOfficers.length > 0) {
        conflicts.push({
          scheduleA: a,
          scheduleB: b,
          date: a.date,
          overlappingOfficers,
          overlapTimeWindow: `${formatMinutesToHHmm(overlapStart)} - ${formatMinutesToHHmm(
            overlapEnd
          )}`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Thực hiện Dời lịch / Đổi giờ / Đổi địa điểm / Tạm hoãn với đầy đủ dấu vết lịch sử (`adjustmentLogs`)
 */
export function applyScheduleAdjustment(
  schedule: ScheduleEvent,
  params: {
    actionType: "reschedule" | "location_change" | "postpone" | "reopen";
    newDate?: string;
    newTime?: string;
    newLocation?: string;
    reason: string;
    changedBy: string;
  }
): ScheduleEvent {
  const nextDate = params.newDate || schedule.date;
  const nextTime = params.newTime || schedule.time;
  const nextLoc = params.newLocation ?? schedule.location;
  const isDateOrTimeChanged =
    nextDate !== schedule.date || nextTime !== schedule.time;

  const logEntry: ScheduleAdjustmentLog = {
    id: `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    changedAt: new Date().toISOString(),
    changedBy: params.changedBy,
    actionType: params.actionType,
    previousDate: schedule.date,
    previousTime: schedule.time,
    previousLocation: schedule.location,
    newDate: nextDate,
    newTime: nextTime,
    newLocation: nextLoc,
    reason:
      params.reason.trim() ||
      (params.actionType === "postpone"
        ? "Tạm hoãn chờ thông báo thời gian mới"
        : "Điều chỉnh lịch công tác"),
  };

  const nextStatus: ScheduleEvent["status"] =
    params.actionType === "postpone"
      ? "Đã hoãn"
      : params.actionType === "reopen" || schedule.status === "Đã hoãn"
      ? "Sắp diễn ra"
      : schedule.status;

  return {
    ...schedule,
    date: nextDate,
    time: nextTime,
    sessionPeriod: inferSessionPeriod(nextTime),
    location: nextLoc,
    status: nextStatus,
    originalDate:
      schedule.originalDate || (isDateOrTimeChanged ? schedule.date : undefined),
    originalTime:
      schedule.originalTime || (isDateOrTimeChanged ? schedule.time : undefined),
    originalLocation:
      schedule.originalLocation ||
      (nextLoc !== schedule.location ? schedule.location : undefined),
    rescheduleCount:
      (schedule.rescheduleCount || 0) +
      (isDateOrTimeChanged || params.actionType === "reschedule" ? 1 : 0),
    lastRescheduleReason: logEntry.reason,
    adjustmentLogs: [logEntry, ...(schedule.adjustmentLogs || [])],
  };
}

/**
 * Cử người đi dự thay / Ủy quyền tham dự cuộc họp (bảo toàn tên người được phân công ban đầu)
 */
export function delegateScheduleOfficer(
  schedule: ScheduleEvent,
  params: {
    fromOfficerName: string;
    toOfficerName: string;
    toOfficerRole: string;
    toOfficerPhone?: string;
    toAssociationId?: string;
    reason: string;
    changedBy: string;
  }
): ScheduleEvent {
  const currentOfficers: AssignedKp3Officer[] =
    schedule.assignedOfficers && schedule.assignedOfficers.length > 0
      ? schedule.assignedOfficers
      : [
          {
            name: params.fromOfficerName,
            role: "Cán bộ được phân công",
            attendanceRole: "primary",
          },
        ];

  const updatedOfficers = currentOfficers.map((off) => {
    if (norm(off.name) === norm(params.fromOfficerName)) {
      return {
        name: params.toOfficerName,
        role: params.toOfficerRole,
        phone: params.toOfficerPhone,
        associationId: params.toAssociationId,
        attendanceRole: "deputy_substitute" as const,
        delegatedFrom: off.delegatedFrom || off.name,
        note: `Dự thay ${off.delegatedFrom || off.name}`,
      };
    }
    return off;
  });

  const updatedAttendeesText = updatedOfficers
    .map((o) =>
      o.delegatedFrom
        ? `${o.name} (${o.role} — dự thay ${o.delegatedFrom})`
        : `${o.name} (${o.role})`
    )
    .join("; ");

  const logEntry: ScheduleAdjustmentLog = {
    id: `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    changedAt: new Date().toISOString(),
    changedBy: params.changedBy,
    actionType: "delegate",
    delegatedFrom: params.fromOfficerName,
    delegatedTo: `${params.toOfficerName} (${params.toOfficerRole})`,
    reason: params.reason.trim() || "Bận công tác đột xuất, ủy quyền dự thay",
  };

  return {
    ...schedule,
    attendees: updatedAttendeesText || schedule.attendees,
    assignedOfficers: updatedOfficers,
    lastRescheduleReason: `Cử ${params.toOfficerName} dự thay ${params.fromOfficerName}`,
    adjustmentLogs: [logEntry, ...(schedule.adjustmentLogs || [])],
  };
}

/**
 * Tạo bản tin tổng hợp Lịch công tác tuần của Khu phố 3 chuẩn format gửi nhóm Zalo Chi bộ & Ban Điều hành
 */
export function buildWeeklyZaloDigest(
  schedules: ScheduleEvent[],
  weekStartIso: string,
  weekEndIso: string
): string {
  const inWeek = schedules
    .filter(
      (s) =>
        s.date >= weekStartIso &&
        s.date <= weekEndIso &&
        s.relevanceTier !== "ward_reference"
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return parseStartMinutes(a.time) - parseStartMinutes(b.time);
    });

  const fmtDmy = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return d && m && y ? `${d}/${m}/${y}` : iso;
  };

  if (inWeek.length === 0) {
    return `📅 LỊCH CÔNG TÁC KHU PHỐ 3 (Tuần ${fmtDmy(weekStartIso)} - ${fmtDmy(
      weekEndIso
    )})\nHiện chưa có lịch họp hoặc hội nghị triệu tập trong tuần này.`;
  }

  const byDate = new Map<string, ScheduleEvent[]>();
  for (const s of inWeek) {
    const list = byDate.get(s.date) || [];
    list.push(s);
    byDate.set(s.date, list);
  }

  const lines: string[] = [
    `📅 THÔNG BÁO LỊCH CÔNG TÁC TUẦN — KHU PHỐ 3, PHƯỜNG AN PHÚ`,
    `⏰ Từ ngày ${fmtDmy(weekStartIso)} đến ngày ${fmtDmy(weekEndIso)}`,
    `────────────────────`,
  ];

  for (const [dateIso, dayEvents] of byDate.entries()) {
    lines.push(
      `\n📌 ${getVietnameseDayLabel(dateIso).toUpperCase()} (${fmtDmy(dateIso)}):`
    );
    for (const ev of dayEvents) {
      const statusPrefix =
        ev.status === "Đã hoãn"
          ? "⏸ [TẠM HOÃN] "
          : ev.rescheduleCount && ev.rescheduleCount > 0
          ? "🔄 [ĐÃ DỜI LỊCH] "
          : "• ";
      lines.push(`${statusPrefix}${ev.time}: ${ev.title}`);
      lines.push(`   📍 Địa điểm: ${ev.location}`);
      lines.push(`   👤 Tham dự: ${ev.attendees}`);
      if (ev.originalDate || ev.originalTime) {
        lines.push(
          `   ⚠️ Lưu ý: Đổi từ lịch cũ (${ev.originalTime || ""} ngày ${
            ev.originalDate ? fmtDmy(ev.originalDate) : ""
          }) — ${ev.lastRescheduleReason || ""}`
        );
      }
    }
  }

  lines.push(`\n────────────────────`);
  lines.push(`Trân trọng đề nghị các đồng chí chủ động sắp xếp tham dự đúng giờ!`);
  return lines.join("\n");
}

/**
 * Dữ liệu mẫu chuẩn trích xuất nguyên bản từ 02 văn bản thực tế của Đảng ủy & UBND Phường An Phú (16/11 – 22/11/2026)
 */
export const SAMPLE_PARTY_WARD_SCHEDULE_45_LLV = `ĐẢNG BỘ THÀNH PHỐ HỒ CHÍ MINH
ĐẢNG ỦY PHƯỜNG AN PHÚ
Số 45-LLV/ĐU
LỊCH LÀM VIỆC của Ban Thường vụ Đảng ủy, Thường trực Đảng ủy từ ngày 16/11/2026 đến ngày 22/11/2026
THỨ HAI 16/11/2026
Sáng
- 09h30: Đồng chí Phạm Phú Nam - Phó Bí thư Đảng ủy, Chủ tịch UBND phường dự buổi làm việc về việc triển khai quyết định xem xét, xử lý kỷ luật đối với đảng viên.
Địa điểm: Phòng họp 3, trụ sở Cơ quan Uỷ ban Kiểm tra Thành uỷ, số 155 đường Nguyễn Văn Trỗi, phường Phú Nhuận, Thành phố Hồ Chí Minh.
Cùng dự: Đại diện Thường trực Uỷ ban Kiểm tra Đảng uỷ phường, Thường trực Đảng uỷ Công an phường; Đồng chí Trần Trung Hiếu - Phó Trưởng công an phường.
Chiều
Bí thư, Phó Bí thư xử lý công việc tại cơ quan
THỨ BA 17/11/2026
Sáng
1- 08h00: Đồng chí Nguyễn Thị Hiền, Bí thư Đảng uỷ, Chủ tịch HĐND phường và đồng chí Phạm Phú Nam, Phó Bí thư Đảng uỷ, Chủ tịch UBND phường tham dự Lễ khởi công xây dựng trụ sở Công an phường An Phú.
Địa điểm: Trụ sở Công an phường An Phú
2- 08h00: Đồng chí Nguyễn Thị Hồng Vân - Phó Bí thư Thường trực Đảng ủy dự Hội nghị tuyên dương điển hình “Dân vận khéo” năm 2026
Địa điểm: Hội trường Thành phố (Số 111 đường Bà Huyện Thanh Quan, phường Xuân Hoà, TP. Hồ Chí Minh).
Cùng dự: Đại diện Chi uỷ khu phố 5; Bà Trần Thị Mỹ Dung - Trưởng Ban Công tác Mặt trận khu phố 3.
Chiều
- 14h00: Họp giao ban Thường trực Đảng ủy
Địa điểm: Hội trường B - UBND phường.
Thành phần: Phó Chủ tịch HĐND phường, Chủ tịch UBMTTQVN phường, Trưởng Ban xây dựng Đảng, Chánh Văn phòng Đảng uỷ, Chánh Văn phòng HĐND - UBND phường.
THỨ TƯ 18/11/2026
Sáng
- 09h00: Thường trực Đảng uỷ dự Hội nghị triển khai, tập huấn thực hiện các quy định về kê khai, công khai và kiểm soát tài sản, thu nhập năm 2026 của phường An Phú.
Địa điểm: Hội trường A- UBND phường
Thành phần: Theo Kế hoạch số 172-KH/ĐU ngày 02/11/2026
Chiều
- 14h00: Thường trực Đảng uỷ dự Hội nghị triển khai Luật Phát triển đô thị và các Nghị quyết của HĐND Thành phố.
Địa điểm: Hội trường A- UBND phường
Thành phần: Theo Kế hoạch số 23/KH-HĐND ngày 11/11/2026 của Thường trực HĐND phường.
THỨ NĂM 19/11/2026
Sáng
1- 08h00: Đồng chí Nguyễn Thị Hồng Vân - Phó Bí thư Thường trực Đảng ủy dự Lớp tập huấn nghiệp vụ công tác kiểm tra, giám sát, thi hành kỷ luật của Đảng
Địa điểm: Hội trường A - UBND phường
Thành phần: Theo Giấy mời số 63-GM/ĐU ngày 12/11/2026 của BTV Đảng uỷ phường.
2- 8h30: Đồng chí Nguyễn Thị Hồng Vân - Phó Bí thư Thường trực Đảng ủy tham dự Hội nghị công bố các quyết định về công tác tổ chức, cán bộ và giao ban công đoàn cơ sở trong các khu công nghiệp.
Địa điểm: Cung Văn hóa Lao động (cơ sở Thuận An), đường D19, khu dân cư Việt - Sing, phường An Phú, TP. Hồ Chí Minh
Chiều
- 14h00: Đồng chí Nguyễn Thị Hiền, Bí thư Đảng uỷ, Chủ tịch HĐND phường dự buổi làm việc trao đổi về việc thành lập Chi hội Luật gia phường An Phú.
Địa điểm: Hội trường B - UBND phường
Thành phần: Đại diện Thường trực HĐND, UBND phường; Ban Thường trực UBMTTQ Việt Nam phường; Đại diện Lãnh đạo Phòng VHXH phường.
THỨ SÁU 20/11/2026
Sáng
- 08h00: Thường trực Đảng uỷ chủ trì Lễ trao tặng huy hiệu Đảng đợt 07/11; Hội nghị triển khai các Kế hoạch của Ban Thường vụ Đảng ủy về thực hiện các Nghị quyết, Chỉ thị của Bộ Chính trị; Nghị quyết Hội nghị lần thứ tư Ban Chấp hành Trung ương Đảng khóa XIV; triển khai Kế hoạch tổ chức Kiểm điểm và đánh giá, xếp loại chất lượng đối với tập thể, cá nhân trong hệ thống chính trị phường An Phú.
Địa điểm: Hội trường A - UBND phường
Thành phần: Các đồng chí Ủy viên Ban Thường vụ Đảng ủy; Các đồng chí Ủy viên Ban Chấp hành Đảng bộ phường; Lãnh đạo UBMTTQVN phường và các tổ chức chính trị - xã hội phường; Công an phường; Bí thư, Phó Bí thư, chi ủy viên các chi bộ trực thuộc Đảng ủy.
Chiều
- 14h00: Thường trực Đảng uỷ dự Chương trình kỷ niệm 44 năm Ngày Nhà giáo Việt Nam (20/11/1982 - 20/11/2026), gắn với kỷ niệm 51 năm Ngành Giáo dục và Đào tạo Thành phố Hồ Chí Minh
Địa điểm: Hội trường A - UBND phường
THỨ BẢY 21/11/2026
Sáng
- 07h00: Đồng chí Nguyễn Thị Hồng Vân - Phó Bí thư Thường trực Đảng ủy dự Lễ khai mạc Hội thi "Phường An Phú nói không với ma túy - Mỗi người dân là một chiến sĩ trên mặt trận phòng, chống ma túy" năm 2026
Địa điểm: Cung Văn hóa Lao động cơ sở 2, đường D19, khu dân cư Việt - Sing, phường An Phú, TP. Hồ Chí Minh`;

export const SAMPLE_UBND_WARD_SCHEDULE_16_21_NOV = `ỦY BAN NHÂN DÂN PHƯỜNG AN PHÚ
LỊCH LÀM VIỆC CỦA CHỦ TỊCH VÀ CÁC PHÓ CHỦ TỊCH HĐND-UBND PHƯỜNG AN PHÚ TỪ 16/11/2026 ĐẾN 21/11/2026
THỨ HAI – 16/11/2026
Sáng
- 09 giờ 30, Chủ tịch UBND Phạm Phú Nam dự buổi làm việc triển khai quyết định xem xét, xử lý kỷ luật đối với đảng viên
Địa điểm: Phòng họp 3, trụ sở Cơ quan Ủy ban Kiểm tra Thành ủy, số 155 đường Nguyễn Văn Trỗi, phường Phú Nhuận, Thành phố Hồ Chí Minh.
Chiều
- 14 giờ, Chủ tịch và các Phó Chủ tịch UBND phường họp thành viên UBND phường.
Mời dự: Thành viên Ủy ban nhân dân phường, Giám đốc Trung tâm Phục vụ hành chính công; Giám đốc Trung tâm Cung ứng dịch vụ công; Phó Giám đốc Trạm Y tế phường.
Địa điểm: Phòng họp B – UBND phường
- 14 giờ, Ủy quyền đại diện lãnh đạo Trung tâm Phục vụ hành chính công phường dự Chương trình tập huấn trực tuyến Cổng thông tin theo dõi tình hình tiếp nhận, giải quyết thủ tục hành chính của các cơ quan, đơn vị trên địa bàn Thành phố.
Địa điểm: Hội trường D – UBND phường.
THỨ BA – 17/11/2026
Sáng
- 08 giờ, Chủ tịch UBND Phạm Phú Nam tiếp công dân định kỳ.
Mời dự: Đại diện lãnh đạo: UBMTTQVN phường, Công an, Ban Chỉ huy Quân sự, Phòng Kinh tế, Hạ tầng và Đô thị, Phòng Văn hóa - Xã hội, Trung tâm Phục vụ hành chính công.
Địa điểm: Phòng Tiếp công dân phường.
- 08 giờ, Chủ tịch UBND Phạm Phú Nam, Phó Chủ tịch HĐND Nguyễn Thị Ngọc Bích tham dự Lễ khởi công xây dựng trụ sở Công an phường An Phú.
Địa điểm: Vị trí xây dựng trụ sở Công an phường An Phú.
- 08 giờ, Phó Chủ tịch UBND Nguyễn Thanh Luật họp tháo gỡ khó khăn trong công tác thu - chi tại căn tin các trường học trên địa bàn phường.
Mời dự: Đại diện lãnh đạo các cơ quan, đơn vị: Phòng Kinh tế, Hạ tầng và Đô thị, Phòng Văn hóa - Xã hội, Hiệu trưởng các trường học Công lập trên địa bàn.
Địa điểm: Hội trường B – UBND phường.
- 09 giờ 30, Phó Chủ tịch UBND Nguyễn Thanh Luật họp Hội đồng xét duyệt danh sách và kinh phí chi trả theo Nghị định số 238/2025/NĐ-CP của Chính phủ.
Mời dự: Thành viên Hội đồng xét duyệt danh sách và kinh phí chi trả theo Nghị định số 238/2025/NĐ-CP.
Địa điểm: Hội trường B – UBND phường.
Chiều
- 14 giờ, Chủ tịch UBND Phạm Phú Nam họp giao ban Thường trực Đảng ủy phường.
Mời dự: Phó Chủ tịch HĐND Nguyễn Thị Ngọc Bích.
Địa điểm: Hội trường B – UBND phường.
- 14 giờ, Phó Chủ tịch UBND Nguyễn Thanh Luật dự Hội nghị nói chuyện chuyên đề nội dung: Hưởng ứng Tháng hành động vì bình đẳng giới; phòng ngừa, ứng phó với bạo lực trên cơ sở giới năm 2026 và hưởng ứng Ngày Quốc tế Xóa bỏ bạo lực đối với phụ nữ và trẻ em gái (25/11).
(Giao phòng Văn hóa - Xã hội chuẩn bị nội dung, tài liệu và thông báo thành phần mời dự)
Mời dự: Đại diện lãnh đạo: Đoàn Thanh niên phường, Hội Cựu chiến binh phường, Hội Liên hiệp Phụ nữ phường, Thành viên Ban Chỉ đạo phong trào Toàn dân đoàn kết xây dựng đời sống văn hóa, các Cộng tác viên công tác dân số trên địa bàn phường, Đại diện Ban điều hành các khu phố, Đại diện các câu lạc bộ, đội nhóm (Nhờ khu phố thông báo mời).
Địa điểm: Hội trường A – UBND phường.
THỨ TƯ – 18/11/2026
Sáng
- 09 giờ, Chủ tịch UBND, các Phó Chủ tịch HĐND-UBND phường dự Hội nghị triển khai, tập huấn thực hiện các quy định về kê khai, công khai và kiểm soát tài sản, thu nhập năm 2026 của phường An Phú.
Mời dự: Đại diện lãnh đạo: Công an, Ban Chỉ huy quân sự, Phòng Kinh tế, Hạ tầng và Đô thị, Phòng Văn hóa - Xã hội, Trung tâm Phục vụ hành chính công, Trung tâm Cung ứng dịch vụ công, Trạm Y tế phường; Trưởng Ban điều hành các khu phố; Đại diện Ban giám hiệu các trường học công lập.
Địa điểm: Hội trường A - UBND phường.
Chiều
- 14 giờ, Chủ tịch UBND, các Phó Chủ tịch HĐND-UBND phường dự Hội nghị tập huấn, phổ biến Luật Phát triển đô thị và các Nghị quyết của Hội đồng nhân dân Thành phố Hồ Chí Minh liên quan đến Luật Phát triển đô thị.
Mời dự: Ban Thường trực Ủy ban Mặt trận Tổ quốc Việt Nam phường; Đại biểu Hội đồng nhân dân phường An Phú khóa II; Trưởng, Phó: Công an, Quân sự, các cơ quan, ban chuyên môn; Ban chấp hành Hội Doanh nghiệp An Phú; Ban Giám hiệu các Trường học trên địa bàn phường; Bí thư Chi bộ, Trưởng Ban điều hành, Trưởng Ban công tác Mặt trận và Thành viên Ban công tác Mặt trận các Khu phố; Các đồng chí cán bộ, đảng viên hưu trí đang sinh hoạt tại các Chi bộ trực thuộc Đảng bộ phường An Phú.
Địa điểm: Hội trường A - UBND phường.
THỨ NĂM – 19/11/2026
Sáng
- 09 giờ, Chủ tịch UBND Phạm Phú Nam làm việc với ông Nguyễn Anh Tú.
Địa điểm: Phòng Tiếp công dân.
- 08 giờ, Phó Chủ tịch HĐND Nguyễn Thị Ngọc Bích tiếp công dân định kỳ.
Địa điểm: Phòng Tiếp công dân phường.
- 08 giờ, Phó Chủ tịch UBND Tôn Quang Vinh dự Lớp tập huấn nghiệp vụ công tác kiểm tra, giám sát, thi hành kỷ luật của Đảng năm 2026.
Địa điểm: Hội trường A – UBND phường
Chiều
- 14 giờ, Phó Chủ tịch HĐND Nguyễn Thị Ngọc Bích tiếp công dân định kỳ.
Địa điểm: Phòng Tiếp công dân phường.
- 14 giờ, Phó Chủ tịch HĐND Nguyễn Thị Ngọc Bích, Phó Chủ tịch UBND Nguyễn Thanh Luật dự buổi làm việc trao đổi về việc thành lập Chi hội Luật gia phường An Phú.
Mời dự: Đại diện lãnh đạo Phòng Văn hóa – Xã hội
Địa điểm: Hội trường B - UBND phường.
- 14 giờ, Phó Chủ tịch UBND Tôn Quang Vinh dự Hội nghị chuyên đề hỗ trợ doanh nghiệp, hợp tác xã về chính sách thuế mới và tháo gỡ điểm nghẽn chuyển đổi số.
Mời dự: Đại diện các cơ quan, đơn vị: Trung tâm Chuyển đổi số Thành phố, Bảo hiểm xã hội cơ sở Lái Thiêu, Công ty Điện lực Thuận An, Viettel Thành phố, Thuế cơ sở 27, Đội Cảnh sát Chữa cháy và Cứu nạn, cứu hộ Khu vực 30; Đại diện các doanh nghiệp, hợp tác xã trên địa bàn phường.
Địa điểm: Hội trường A - UBND phường.
THỨ SÁU - 20/11/2026
Sáng
- 08 giờ, Chủ tịch và các Phó Chủ tịch HĐND-UBND phường dự Lễ trao tặng huy hiệu Đảng đợt 07/11; Hội nghị triển khai các Kế hoạch của Ban Thường vụ Đảng ủy về thực hiện các Nghị quyết, Chỉ thị của Bộ Chính trị; Nghị quyết Hội nghị lần thứ tư Ban Chấp hành Trung ương Đảng khóa XIV.
Mời dự: Trưởng, phó các Ban Hội đồng nhân dân; Lãnh đạo Công an phường, Ban Chỉ huy Quân sự phường; Trưởng, phó các phòng chuyên môn; Trưởng Ban điều hành các khu phố, Ban giám hiệu các trường học công lập trên địa bàn phường.
Địa điểm: Hội trường A – UBND phường.
Chiều
- 14 giờ, Chủ tịch và các Phó Chủ tịch HĐND-UBND phường dự Lễ kỷ niệm 44 năm Ngày nhà giáo Việt Nam (20/11/1982 - 20/11/2026), gắn với kỷ niệm 51 năm ngành giáo dục và đào tạo Thành phố Hồ Chí Minh.
Mời dự: Thường trực Đảng ủy phường, Thường trực Hội đồng nhân dân phường, Hiệu trưởng, Phó hiệu trưởng các trường học công lập và mầm non trên địa bàn phường.
Địa điểm: Hội trường A – UBND phường.
THỨ BẢY – 21/11/2026
Sáng
- 07 giờ, Phó Chủ tịch UBND Nguyễn Thanh Luật dự Lễ khai mạc Hội thi "Phường An Phú nói không với ma túy - Mỗi người dân là một chiến sĩ trên mặt trận phòng, chống ma túy" năm 2026.
Mời dự: Đại diện Thường trực Đảng ủy phường; Ban Thường trực Ủy ban Mặt trận Tổ quốc Việt Nam phường; Thành viên Ban Chỉ đạo 26 phường; Bí thư Chi bộ, Trưởng Ban điều hành, Trưởng Ban công tác Mặt trận các khu phố; Thành viên Ban giám khảo Hội thi; Thành viên các Đội tham gia Hội thi.
Địa điểm: Cung Văn hóa Lao động cơ sở 2, đường D19, khu dân cư Việt - Sing, phường An Phú, TP. Hồ Chí Minh
- 07 giờ 30, Giám đốc Trung tâm Phục vụ hành chính công phường giải quyết thủ tục hành chính.`;
