import { Association, Resident } from "../types";

export interface DecisionAppointeeOcr {
  fullName: string;
  role: string;
  birthDate?: string;
  cccd?: string;
  phone?: string;
  matchedResident?: Resident;
}

export interface DecisionDocumentOcrResult {
  decisionNumber: string;
  decisionDate: string;
  issuingAuthority: string;
  signerName: string;
  signerTitle: string;
  summary: string;
  organizationName: string;
  matchedAssocId?: string;
  appointees: DecisionAppointeeOcr[];
  source: "gemini_vision" | "local_parser";
  isOcrSuccess: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function normalizeDecisionDate(raw?: string): string {
  if (!raw) return "";
  const s = raw.trim();
  const slashMatch = s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2}|19\d{2})\b/);
  if (slashMatch) {
    return `${slashMatch[1].padStart(2, "0")}/${slashMatch[2].padStart(2, "0")}/${slashMatch[3]}`;
  }
  const vnMatch = s.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(20\d{2}|19\d{2})/i);
  if (vnMatch) {
    return `${vnMatch[1].padStart(2, "0")}/${vnMatch[2].padStart(2, "0")}/${vnMatch[3]}`;
  }
  const isoMatch = s.match(/\b(20\d{2}|19\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return s;
}

function normalizeVietnameseName(s?: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchAssociationFromText(
  orgHint: string,
  associations: Association[] = []
): string | undefined {
  if (!orgHint || associations.length === 0) return undefined;
  const norm = normalizeVietnameseName(orgHint);
  if (!norm) return undefined;

  const keywordMap: Array<[RegExp, string]> = [
    [/\b(chi bo|dang uy|cap uy|bi thu chi bo)\b/, "ASC_DANG"],
    [/\b(ban dieu hanh|truong khu pho|pho khu pho|bdh)\b/, "ASC_BDH"],
    [/\b(mat tran|ctmt|ubmttq)\b/, "ASC_MT"],
    [/\b(phu nu|lhpn)\b/, "ASC_PN"],
    [/\b(doan thanh nien|chi doan|thanh nien)\b/, "ASC_DTN"],
    [/\b(cuu chien binh|ccb)\b/, "ASC_CCB"],
    [/\b(nguoi cao tuoi|nct)\b/, "ASC_NCT"],
    [/\b(chu thap do|ctd)\b/, "ASC_CTD"],
    [/\b(an ninh trat tu|antt|bao ve dan pho)\b/, "ASC_ANTT"],
    [/\b(phong chay|pccc|lien gia)\b/, "ASC_PCCC"],
    [/\b(hoa giai)\b/, "ASC_HG"],
    [/\b(dan quan|khu doi|quan su)\b/, "ASC_KHUDOI"],
    [/\b(cuu cong an|cand)\b/, "ASC_CCA"],
  ];

  for (const [regex, id] of keywordMap) {
    if (regex.test(norm) && associations.some((a) => a.id === id)) {
      return id;
    }
  }

  for (const assoc of associations) {
    const assocNorm = normalizeVietnameseName(assoc.name);
    if (assocNorm && (norm.includes(assocNorm) || assocNorm.includes(norm))) {
      return assoc.id;
    }
  }
  return undefined;
}

export function matchResidentByAppointee(
  appointee: { fullName?: string; cccd?: string; birthDate?: string },
  residents: Resident[] = []
): Resident | undefined {
  if (!residents.length) return undefined;
  const cleanCccd = (appointee.cccd || "").replace(/\D/g, "");
  if (cleanCccd.length >= 9) {
    const exactCccd = residents.find((r) => r.cccd === cleanCccd);
    if (exactCccd) return exactCccd;
  }

  const targetName = normalizeVietnameseName(appointee.fullName);
  if (!targetName || targetName.length < 4) return undefined;

  const candidates = residents.filter((r) => normalizeVietnameseName(r.fullName) === targetName);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1 && appointee.birthDate) {
    const yearMatch = appointee.birthDate.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      const byYear = candidates.find((c) => (c.birthDate || "").includes(yearMatch[1]));
      if (byYear) return byYear;
    }
    return candidates[0];
  }
  return undefined;
}

function parseDecisionLocallyFromFileNameAndText(
  fileName: string,
  rawText: string,
  associations: Association[],
  residents: Resident[]
): DecisionDocumentOcrResult {
  const combined = `${fileName.replace(/[_-]+/g, " ")} \n ${rawText || ""}`;

  const numMatch =
    combined.match(/(?:Số|So)\s*[:.]?\s*([0-9]{1,5}\s*\/\s*QĐ-[A-ZĐ0-9-]+|[0-9]{1,5}-QĐ\/[A-ZĐ0-9-]+)/i) ||
    combined.match(/\b(QĐ-[0-9]{1,5}\/[A-ZĐ0-9-]+|[0-9]{1,5}[/_-]QĐ[/_-][A-ZĐ0-9-]+)\b/i);

  const decisionNumber = numMatch
    ? numMatch[1].replace(/\s+/g, "").replace(/_/g, "/").toUpperCase()
    : "";

  const decisionDate = normalizeDecisionDate(combined);

  let issuingAuthority = "UBND Phường An Phú";
  if (/đảng\s*ủy|dang\s*uy|-qđ\/đu|\/đu/i.test(combined)) {
    issuingAuthority = "Đảng ủy Phường An Phú";
  } else if (/mặt\s*trận|ubmttq/i.test(combined)) {
    issuingAuthority = "UBMTTQ Việt Nam Phường An Phú";
  }

  const matchedAssocId = matchAssociationFromText(combined, associations);
  const matchedAssoc = associations.find((a) => a.id === matchedAssocId);

  const appointees: DecisionAppointeeOcr[] = [];
  const personRegex =
    /(?:Ông|Bà|Đồng\s+chí|Đ\/c)\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][^\n,;–-]{3,35}?)(?:\s*(?:[-–,:]|giữ\s+chức(?:\s+vụ)?|làm)\s*([^\n.;,]{3,50}))/gi;
  let m: RegExpExecArray | null;
  while ((m = personRegex.exec(rawText || "")) !== null) {
    const fullName = m[1].trim();
    const role = m[2].trim();
    const matchedResident = matchResidentByAppointee({ fullName }, residents);
    appointees.push({
      fullName,
      role,
      cccd: matchedResident?.cccd,
      birthDate: matchedResident?.birthDate,
      phone: matchedResident?.phone,
      matchedResident,
    });
  }

  return {
    decisionNumber,
    decisionDate,
    issuingAuthority,
    signerName: "",
    signerTitle: "",
    summary: matchedAssoc ? `Quyết định chuẩn y nhân sự ${matchedAssoc.name}` : "",
    organizationName: matchedAssoc?.name || "",
    matchedAssocId,
    appointees,
    source: "local_parser",
    isOcrSuccess: Boolean(decisionNumber || decisionDate || appointees.length > 0 || matchedAssocId),
  };
}

/**
 * Check if a decision document URL is a real (non-fake) URL.
 * Returns true for https://, blob:, and data: URLs.
 */
export function isRealDecisionDocumentUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  );
}

/**
 * Download a decision document file via Blob-based approach.
 */
export async function downloadDecisionDocument(fileObj: {
  url: string;
  name: string;
  type: string;
}): Promise<void> {
  try {
    const resp = await fetch(fileObj.url);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileObj.name || `Quyet_dinh.${fileObj.type === "pdf" ? "pdf" : "jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: open in new tab
    window.open(fileObj.url, "_blank");
  }
}

/**
 * Quét AI Vision OCR (Gemini 2.5 Flash) đọc tệp PDF hoặc Ảnh chụp Quyết định chuẩn y / bổ nhiệm
 * và tự động đối khớp với danh mục Chi hội + CSDL 11.632 cư dân Khu phố 3.
 */
export async function extractDecisionDocumentViaOcr(
  file: File,
  associations: Association[] = [],
  residents: Resident[] = []
): Promise<DecisionDocumentOcrResult> {
  const dataUrl = await fileToDataUrl(file);

  try {
    const { getStaffAuthHeaders } = await import("./imageUpload");
    const authHeaders = await getStaffAuthHeaders();
    const resp = await fetch("/api/ocr-document", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        docType: "decision_document",
        fileBase64: dataUrl,
        mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        fileName: file.name,
      }),
    });

    if (resp.ok) {
      const payload = await resp.json();
      if (payload?.available && payload?.data) {
        const d = payload.data;
        const orgName = String(d.organizationName || d.summary || "").trim();
        const matchedAssocId = matchAssociationFromText(
          `${orgName} ${d.summary || ""} ${d.issuingAuthority || ""}`,
          associations
        );

        const rawAppointees = Array.isArray(d.appointees) ? d.appointees : [];
        const appointees: DecisionAppointeeOcr[] = rawAppointees
          .filter((item: any) => item && String(item.fullName || "").trim().length >= 2)
          .map((item: any) => {
            const fullName = String(item.fullName || "").trim();
            const cccdRaw = String(item.cccd || "").replace(/\D/g, "");
            const birthDate = String(item.birthDate || "").trim();
            const matchedResident = matchResidentByAppointee(
              { fullName, cccd: cccdRaw, birthDate },
              residents
            );
            return {
              fullName: matchedResident?.fullName || fullName,
              role: String(item.role || "").trim() || "Hội viên",
              birthDate: birthDate || matchedResident?.birthDate,
              cccd: cccdRaw || matchedResident?.cccd,
              phone: String(item.phone || "").trim() || matchedResident?.phone,
              matchedResident,
            };
          });

        return {
          decisionNumber: String(d.decisionNumber || "").trim(),
          decisionDate: normalizeDecisionDate(String(d.decisionDate || "")),
          issuingAuthority: String(d.issuingAuthority || "").trim() || "UBND Phường An Phú",
          signerName: String(d.signerName || "").trim(),
          signerTitle: String(d.signerTitle || "").trim(),
          summary: String(d.summary || "").trim(),
          organizationName: orgName,
          matchedAssocId,
          appointees,
          source: "gemini_vision",
          isOcrSuccess: true,
        };
      }
    }
  } catch {
    // Chuyển sang bộ phân tích nội bộ bên dưới
  }

  let extractedAscii = "";
  try {
    if (file.size < 2_500_000) {
      const buf = await file.arrayBuffer();
      extractedAscii = new TextDecoder("utf-8", { fatal: false }).decode(buf).slice(0, 60_000);
    }
  } catch {}

  return parseDecisionLocallyFromFileNameAndText(
    file.name,
    extractedAscii,
    associations,
    residents
  );
}
