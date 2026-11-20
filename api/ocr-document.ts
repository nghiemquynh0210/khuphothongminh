import { GoogleGenAI } from "@google/genai";

async function verifyApprovedCaller(
  req: any,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const authHeader = String(
    req?.headers?.authorization || req?.headers?.Authorization || ""
  ).trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Yêu cầu xác thực tài khoản Cán bộ để sử dụng AI OCR hồ sơ nội bộ.",
    };
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return { ok: false, status: 401, error: "Không tìm thấy mã xác thực phiên làm việc." };
  }
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey || serviceRoleKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!userRes.ok) {
    return { ok: false, status: 401, error: "Phiên đăng nhập Cán bộ không hợp lệ hoặc đã hết hạn." };
  }
  const authUser = await userRes.json();
  if (!authUser?.id) {
    return { ok: false, status: 401, error: "Không xác định được danh tính tài khoản." };
  }
  const profRes = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,role,approval_status`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    }
  );
  if (!profRes.ok) {
    return { ok: false, status: 500, error: "Không thể truy xuất hồ sơ phân quyền." };
  }
  const rows = await profRes.json();
  const profile = rows?.[0];
  if (
    !profile ||
    profile.approval_status !== "approved" ||
    (profile.role !== "admin" && profile.role !== "cadre")
  ) {
    return { ok: false, status: 403, error: "Tài khoản chưa được phê duyệt quyền Cán bộ." };
  }
  return { ok: true };
}

const ipOcrRateMap = new Map<string, { count: number; resetAt: number }>();

const STAFF_ONLY_DOC_TYPES = new Set([
  "business_license",
  "land_certificate",
  "ward_schedule",
  "decision_document",
]);

const ALLOWED_OCR_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function extractClientIp(req: any): string {
  const realIp = String(req?.headers?.["x-real-ip"] || "").trim();
  if (realIp) return realIp;
  const xff = String(req?.headers?.["x-forwarded-for"] || "").trim();
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || "local";
  }
  return String(req?.socket?.remoteAddress || "local");
}

function checkOcrRateLimit(ip: string): boolean {
  const now = Date.now();
  if (ipOcrRateMap.size > 2000) {
    for (const [k, v] of ipOcrRateMap.entries()) {
      if (now > v.resetAt) ipOcrRateMap.delete(k);
    }
  }
  const entry = ipOcrRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipOcrRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 25) return false;
  entry.count += 1;
  return true;
}

export default async function ocrDocumentHandler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientIp = extractClientIp(req);
    if (!checkOcrRateLimit(clientIp)) {
      return res.status(429).json({
        available: false,
        reason: "rate_limited",
        error: "Tần suất quét AI OCR vượt ngưỡng cho phép, vui lòng đợi ít giây.",
      });
    }

    const { docType, fileBase64, mimeType, fileName } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ available: false, reason: "missing_file" });
    }
    if (fileBase64.length > 6_000_000) {
      return res.status(413).json({
        available: false,
        reason: "payload_too_large",
        error: "Tệp gửi quét OCR vượt quá 4.2 MB, vui lòng chọn tệp nén nhẹ hơn.",
      });
    }

    const normalizedDocType = String(docType || "land_certificate").trim();

    // Các nghiệp vụ OCR nội bộ Cán bộ yêu cầu xác thực JWT khi máy chủ đã cấu hình Supabase Service Role
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (STAFF_ONLY_DOC_TYPES.has(normalizedDocType) && supabaseUrl && serviceRoleKey) {
      const callerCheck = await verifyApprovedCaller(req, supabaseUrl, anonKey, serviceRoleKey);
      if (!callerCheck.ok) {
        return res.status(callerCheck.status || 401).json({
          available: false,
          reason: "unauthorized",
          error: callerCheck.error || "Yêu cầu đăng nhập tài khoản Cán bộ để sử dụng AI OCR văn bản nội bộ.",
        });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(200).json({ available: false, reason: "no_api_key" });
    }

    const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const candidateMime =
      typeof mimeType === "string" && mimeType.trim()
        ? mimeType.trim().toLowerCase()
        : fileName && String(fileName).toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "image/jpeg";

    if (!ALLOWED_OCR_MIMES.has(candidateMime)) {
      return res.status(415).json({
        available: false,
        reason: "unsupported_mime",
        error: "Chỉ hỗ trợ quét OCR trên tệp Ảnh (JPEG/PNG/WebP) hoặc PDF.",
      });
    }
    const resolvedMime = candidateMime === "image/jpg" ? "image/jpeg" : candidateMime;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const isLicense = normalizedDocType === "business_license";
    const isWardSchedule = normalizedDocType === "ward_schedule";
    const isDecisionDoc = normalizedDocType === "decision_document";
    const isTimemarkPhoto = normalizedDocType === "timemark_photo";

    const prompt = isTimemarkPhoto
      ? `Bạn là chuyên gia phân tích ảnh hiện trường đô thị & watermark định vị GPS (Timemark / Timestamp Camera). Hãy đọc toàn bộ chữ in trên hình ảnh đính kèm và trích xuất CHÍNH XÁC sang JSON thuần (không bọc markdown) theo cấu trúc:
{
  "lat": 0,
  "lng": 0,
  "rawCoordinates": "Chuỗi tọa độ nguyên bản trên ảnh nếu có (VD: '10.937011°N, 106.744351°E' hoặc '10.793512, 106.744510'), không có thì rỗng ''",
  "address": "Địa chỉ đầy đủ hiển thị trên watermark ảnh, không có thì rỗng ''",
  "streetArea": "Tên đường / hẻm / khu phố nếu có, không có thì rỗng ''",
  "landmark": "Địa danh / cơ sở cạnh điểm chụp nếu có, không có thì rỗng ''",
  "recordedTime": "Thời gian chụp chuẩn hóa YYYY-MM-DD HH:mm nếu đọc được, không có thì rỗng ''",
  "rawTime": "Chuỗi thời gian nguyên bản trên ảnh, không có thì rỗng ''",
  "elevation": "Độ cao nếu có (VD: '37.1m'), không có thì rỗng ''",
  "direction": "Phương hướng la bàn nếu có (VD: '71° E'), không có thì rỗng ''",
  "timemarkHash": "Mã xác thực Timemark Verified dọc lề ảnh hoặc góc ảnh (VD: 'N9ULW4DEHPT33Y'), không có thì rỗng ''",
  "isVerified": true
}
Quy tắc bắt buộc: Đọc từng chữ số thập phân của vĩ độ (lat) và kinh độ (lng) thật chính xác từ ảnh; nếu trên ảnh hoàn toàn KHÔNG có tọa độ GPS thì trả lat: 0, lng: 0 và isVerified: false. Tuyệt đối không tự bịa tọa độ.`
      : isDecisionDoc
      ? `Bạn là Chánh Văn phòng Đảng ủy - UBND cấp Phường tại Việt Nam. Hãy đọc toàn bộ nội dung hình ảnh hoặc tệp PDF "QUYẾT ĐỊNH" (chuẩn y nhân sự, công nhận chức danh Chi bộ, Ban điều hành Khu phố, Ban Công tác Mặt trận, các Chi hội đoàn thể, Tổ ANTT, Tổ PCCC...) đính kèm và trích xuất chính xác sang JSON thuần (không bọc markdown) theo đúng cấu trúc sau:
{
  "decisionNumber": "Số hiệu Quyết định đầy đủ (VD: '145/QĐ-UBND' hoặc '28-QĐ/ĐU')",
  "decisionDate": "Ngày ký ban hành định dạng DD/MM/YYYY (VD: '15/10/2025')",
  "issuingAuthority": "Tên cơ quan ban hành (VD: 'UBND Phường An Phú', 'Đảng ủy Phường An Phú', 'UBMTTQ Việt Nam Phường An Phú')",
  "signerName": "Họ và tên người ký quyết định (VD: 'Phạm Phú Nam')",
  "signerTitle": "Chức vụ người ký (VD: 'Chủ tịch UBND Phường' hoặc 'Bí thư Đảng ủy')",
  "summary": "Trích yếu nội dung Quyết định (ngắn gọn, rõ nghĩa, VD: 'Về việc công nhận Trưởng, Phó Khu phố 3 nhiệm kỳ 2025 - 2030')",
  "organizationName": "Tên tổ chức / Chi bộ / Ban điều hành / Chi hội tại Khu phố được kiện toàn hoặc bổ nhiệm (VD: 'Chi bộ Khu phố 3', 'Ban Điều hành Khu phố 3', 'Chi hội Phụ nữ', 'Tổ ANTT cơ sở'...)",
  "appointees": [
    {
      "fullName": "Họ và tên nhân sự được chuẩn y / bổ nhiệm / công nhận",
      "role": "Chức danh / nhiệm vụ được giao trong Quyết định (VD: 'Bí thư Chi bộ', 'Trưởng Khu phố', 'Chi hội trưởng', 'Tổ trưởng', 'Ủy viên'...)",
      "birthDate": "Ngày sinh hoặc năm sinh nếu có trên văn bản (DD/MM/YYYY hoặc YYYY, không có thì để rỗng '')",
      "cccd": "Số CCCD / Mã định danh nếu có trên văn bản (không có thì để rỗng '')",
      "phone": "Số điện thoại nếu có trên văn bản (không có thì để rỗng '')"
    }
  ]
}
Lưu ý: Nếu Quyết định có danh sách nhiều người (ở Điều 1 hoặc Danh sách kèm theo Quyết định), hãy trích xuất ĐẦY ĐỦ tất cả nhân sự vào mảng appointees. Trường nào không có trên văn bản thì trả về chuỗi rỗng "".`
      : isWardSchedule
      ? `Bạn là Chánh Văn phòng Đảng ủy - UBND cấp Phường tại Việt Nam. Hãy đọc toàn bộ các trang của tệp PDF hoặc hình ảnh "LỊCH LÀM VIỆC" của Đảng ủy / HĐND / UBND Phường đính kèm và trích xuất ĐẦY ĐỦ TẤT CẢ các mục lịch làm việc trong tuần sang JSON thuần (không bọc markdown) theo đúng cấu trúc sau:
{
  "issuingBody": "Tên cơ quan ban hành (VD: 'Đảng ủy Phường An Phú' hoặc 'UBND Phường An Phú')",
  "sourceLevel": "Chọn đúng 1 trong 2 giá trị: 'party_ward' (nếu của Đảng ủy) | 'ubnd_ward' (nếu của HĐND - UBND)",
  "documentNumber": "Số hiệu văn bản nếu có (VD: 'Số 45-LLV/ĐU' hoặc 'Lịch tuần UBND')",
  "weekRangeLabel": "Khoảng thời gian tuần làm việc (VD: '16/11/2026 - 22/11/2026')",
  "entries": [
    {
      "date": "Ngày dương lịch định dạng YYYY-MM-DD (VD: '2026-11-17')",
      "dayOfWeekLabel": "Thứ trong tuần (VD: 'Thứ Ba')",
      "sessionPeriod": "Chọn 'Sáng' | 'Chiều' | 'Tối'",
      "startTime": "Giờ bắt đầu định dạng HH:mm (VD: '08:00', '09:30', '14:00')",
      "endTime": "Giờ kết thúc ước tính định dạng HH:mm (VD: '11:00' hoặc '16:30')",
      "title": "Tên cuộc họp / hội nghị / hoạt động ngắn gọn, rõ nghĩa",
      "fullContent": "Toàn bộ nội dung chi tiết của mục lịch (bao gồm các Nội dung 1, 2, 3 nếu có)",
      "hostLeader": "Họ tên và chức danh lãnh đạo chủ trì / tham dự chính (VD: 'Đ/c Phạm Phú Nam - Chủ tịch UBND phường')",
      "location": "Địa điểm tổ chức đầy đủ (VD: 'Hội trường A - UBND phường')",
      "participants": "Toàn văn mục Thành phần / Mời dự / Cùng dự (giữ nguyên đầy đủ tên khu phố, bí thư, trưởng ban điều hành, mặt trận, đoàn thể...)",
      "directiveNotes": "Các ghi chú giao việc trong ngoặc hoặc chỉ đạo (VD: 'Nhờ khu phố thông báo mời', 'Giao Phòng VH-XH chuẩn bị nội dung'...)"
    }
  ]
}
Lưu ý quan trọng: Nếu một buổi Sáng/Chiều có nhiều mục (1-, 2- hoặc nhiều dấu gạch đầu dòng '- 08 giờ...', '- 09 giờ 30...'), phải tách riêng từng mục thành 1 phần tử độc lập trong mảng entries. Đọc hết tất cả các trang từ trang đầu đến trang cuối.`
      : isLicense
      ? `Bạn là chuyên gia số hóa hồ sơ hành chính công Việt Nam. Hãy đọc hình ảnh hoặc tệp PDF Giấy chứng nhận đăng ký doanh nghiệp / Giấy chứng nhận đăng ký hộ kinh doanh / Giấy phép kinh doanh đính kèm và trích xuất chính xác sang JSON thuần (không bọc markdown) với các khóa sau:
{
  "businessName": "Tên doanh nghiệp hoặc hộ kinh doanh bằng tiếng Việt in hoa/chuẩn",
  "licenseNumber": "Mã số doanh nghiệp / Số GCN đăng ký hộ kinh doanh / Số giấy phép",
  "taxCode": "Mã số thuế (nếu giống mã số doanh nghiệp thì điền giống licenseNumber)",
  "businessType": "Chọn đúng 1 trong 5 giá trị: 'Công ty TNHH' | 'Công ty Cổ phần' | 'Doanh nghiệp tư nhân' | 'Hộ kinh doanh' | 'Cơ sở kinh doanh khác'",
  "issueDate": "Ngày đăng ký lần đầu hoặc ngày cấp dạng dd/mm/yyyy",
  "issuingAuthority": "Tên cơ quan cấp phép (VD: Phòng Đăng ký kinh doanh - Sở KH&ĐT TP.HCM, hoặc Phòng Tài chính - Kế hoạch...)",
  "headquartersAddress": "Địa chỉ trụ sở chính hoặc địa điểm kinh doanh đầy đủ",
  "businessLine": "Ngành, nghề kinh doanh chính (ngắn gọn, rõ ràng)",
  "suggestedIndustryGroup": "Chọn 1 nhóm phù hợp nhất: 'Ăn uống & Giải khát' | 'Bán lẻ & Tạp hóa' | 'Lưu trú & Cho thuê' | 'Dịch vụ Đời sống' | 'Y tế & Giáo dục' | 'Sản xuất & Kho bãi' | 'Kinh doanh & Dịch vụ'",
  "charterCapital": "Vốn điều lệ hoặc vốn kinh doanh (VD: '2.000.000.000 VNĐ' hoặc '150.000.000 đồng')",
  "legalRepresentative": "Họ và tên Người đại diện theo pháp luật hoặc Chủ hộ kinh doanh",
  "legalRepCccd": "Số Căn cước công dân / CMND / Định danh cá nhân của người đại diện",
  "legalRepPhone": "Số điện thoại liên hệ trên giấy phép (nếu có)",
  "legalRepEmail": "Email liên hệ trên giấy phép (nếu có)"
}
Chỉ trả về trường đọc được thực tế từ tài liệu, trường không có trên tài liệu thì trả về chuỗi rỗng "".`
      : `Bạn là chuyên gia địa chính Việt Nam. Hãy đọc hình ảnh hoặc tệp PDF Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở và tài sản khác gắn liền với đất (Sổ đỏ / Sổ hồng) đính kèm và trích xuất chính xác sang JSON thuần (không bọc markdown) với các khóa sau:
{
  "toBanDo": "Số tờ bản đồ (chỉ lấy số, VD: '272')",
  "soThua": "Số thửa đất (chỉ lấy số hoặc mã thửa, VD: '55')",
  "dienTich": "Diện tích đất tính bằng m2 (chỉ lấy số, dùng dấu chấm thập phân nếu có, VD: '150.5')",
  "loaiDat": "Mục đích sử dụng / Loại đất (VD: 'Đất ở tại đô thị (ODT)')",
  "tenChuSuDung": "Họ và tên người sử dụng đất, chủ sở hữu nhà ở",
  "diaChiThuaDat": "Địa chỉ thửa đất đầy đủ",
  "soGcn": "Số phát hành GCN (seri chữ in hoa + số ở trang 1, VD: 'CS 038291')",
  "soVaoSo": "Số vào sổ cấp GCN (VD: 'CH 01234' hoặc 'CS-2024-001')",
  "ngayCap": "Ngày ký cấp GCN định dạng dd/mm/yyyy"
}
Chỉ trả về trường đọc được thực tế từ tài liệu, trường không có thì trả về chuỗi rỗng "".`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: resolvedMime,
                data: cleanedBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = (response.text || "").trim();
    if (!rawText) {
      return res.status(200).json({ available: false, reason: "empty_response" });
    }

    const cleanedJson = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);
    return res.status(200).json({
      available: true,
      source: "gemini_vision",
      data: parsed,
    });
  } catch (error: any) {
    console.warn("OCR Vision fallback:", error?.message || error);
    return res.status(200).json({
      available: false,
      reason: "vision_error",
    });
  }
}
