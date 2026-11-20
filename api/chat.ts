import { GoogleGenAI } from "@google/genai";

const ipChatRateMap = new Map<string, { count: number; resetAt: number }>();

function checkChatRateLimit(ip: string): boolean {
  const now = Date.now();
  if (ipChatRateMap.size > 2000) {
    for (const [k, v] of ipChatRateMap.entries()) {
      if (now > v.resetAt) ipChatRateMap.delete(k);
    }
  }
  const entry = ipChatRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipChatRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count += 1;
  return true;
}

export default async function handler(req: any, res: any) {
  const origin = String(req.headers?.origin || "*");
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientIp =
      String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "local")
        .split(",")[0]
        .trim() || "local";
    if (!checkChatRateLimit(clientIp)) {
      return res.status(429).json({
        error: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi khoảng 30 giây rồi thử lại.",
      });
    }

    const { messages, mode, context, imageBase64, imageMimeType } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return res.status(400).json({ error: "Danh sách tin nhắn không hợp lệ (tối đa 40 lượt hội thoại)." });
    }

    const sanitizedMessages = messages
      .filter((m: any) => m && typeof m.content === "string" && m.content.trim().length > 0)
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content.slice(0, 4000),
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: "Nội dung tin nhắn trống." });
    }

    const householdsCount = Number(context?.householdsCount) || 488;
    const residentsCount = Number(context?.residentsCount) || 11632;
    const permanentCount = Number(context?.permanentCount) || 2076;
    const temporaryCount = Number(context?.temporaryCount) || 9556;
    const elderlyCount = Number(context?.elderlyCount) || 438;
    const expiringTempCount = Number(context?.expiringTempCount ?? 245);
    const expiredTempCount = Number(context?.expiredTempCount ?? 533);
    const businessesCount = Number(context?.businessesCount) || 118;
    const hostelsCount = Number(context?.hostelsCount) || 108;
    const pendingReportsCount = Number(context?.pendingReportsCount ?? 0);
    const openTasksCount = Number(context?.openTasksCount ?? 0);
    const fundBalanceText = String(context?.fundBalanceText || "").slice(0, 300);
    const openReportTitles: string[] = Array.isArray(context?.openReportTitles)
      ? context.openReportTitles.slice(0, 8).map((s: any) => String(s).slice(0, 140))
      : [];
    const openTaskTitles: string[] = Array.isArray(context?.openTaskTitles)
      ? context.openTaskTitles.slice(0, 8).map((s: any) => String(s).slice(0, 140))
      : [];
    const upcomingScheduleTitles: string[] = Array.isArray(context?.upcomingScheduleTitles)
      ? context.upcomingScheduleTitles.slice(0, 8).map((s: any) => String(s).slice(0, 140))
      : [];

    const rawLeadership = Array.isArray(context?.leadership) ? context.leadership : [];
    const partySec = rawLeadership.find(
      (l: any) =>
        String(l?.role || "").toLowerCase().includes("bí thư chi bộ") ||
        (String(l?.role || "").toLowerCase().includes("bí thư") &&
          !String(l?.role || "").toLowerCase().includes("phó"))
    );
    const partyDeputy = rawLeadership.find((l: any) =>
      String(l?.role || "").toLowerCase().includes("phó bí thư")
    );
    const neighborhoodHead = rawLeadership.find(
      (l: any) =>
        String(l?.role || "").toLowerCase().includes("trưởng khu phố") ||
        String(l?.subRole || "").toLowerCase().includes("trưởng khu phố") ||
        String(l?.role || "").toLowerCase().includes("trưởng ban điều hành")
    );
    const policeOfficer = rawLeadership.find(
      (l: any) =>
        String(l?.role || "").toLowerCase().includes("công an khu vực") ||
        String(l?.group || "").toLowerCase().includes("công an")
    );

    const partySecName = partySec?.name || "Nghiêm Xuân Quỳnh";
    const partyDeputyName = partyDeputy?.name || "Phạm Ngọc Hà";
    const neighborhoodHeadName = neighborhoodHead?.name || "Nguyễn Trung Huy";
    const policeOfficerName = policeOfficer?.name || "Đại úy Trần Quốc Hải";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || "";
      let reply = "";
      const lower = lastMessage.toLowerCase();

      if (lower.includes("quỹ") || lower.includes("thu nộp") || lower.includes("tài chính")) {
        reply = `**Tổng hợp Quỹ Khu phố 3 (Cập nhật trực tiếp từ CSDL):**\n- ${
          fundBalanceText || "Đang đồng bộ sổ thu - chi minh bạch của 488 hộ dân."
        }\n- Cư dân và cán bộ có thể đối chiếu biên lai điện tử hoặc quét mã VietQR trực tiếp tại phân hệ **Quỹ Khu phố**.`;
      } else if (lower.includes("tạm trú") || lower.includes("đăng ký") || lower.includes("ct01")) {
        reply = `**Tình hình & Thủ tục Tạm trú tại Khu phố 3, Phường An Phú:**\n- Tổng tạm trú thực tế: **${temporaryCount.toLocaleString("vi-VN")} nhân khẩu** tại **${hostelsCount} cơ sở nhà trọ**.\n- Cảnh báo thời hạn: **${expiringTempCount} trường hợp sắp hết hạn (≤30 ngày)** và **${expiredTempCount} trường hợp quá hạn** cần gia hạn.\n- Hồ sơ gia hạn/đăng ký tạm trú: CCCD gắn chip / VNeID mức 2 + **Tờ khai Mẫu CT01** + Hợp đồng thuê nhà (liên hệ Cảnh sát khu vực **${policeOfficerName}**).`;
      } else if (lower.includes("phản ánh") || lower.includes("rác") || lower.includes("tiếng ồn") || lower.includes("1022")) {
        const listStr =
          openReportTitles.length > 0
            ? `\n- **Các hồ sơ đang mở:**\n${openReportTitles.map((t) => `  + ${t}`).join("\n")}`
            : "";
        reply = `Hiện trên hệ thống **Phản ánh 1022 Khu phố 3** đang có **${pendingReportsCount} hồ sơ cần xử lý**.${listStr}\nCư dân có thể tra cứu tiến độ bằng mã hồ sơ \`PA-xxxxxx\` ngay tại Cổng Cư dân.`;
      } else if (lower.includes("lịch") || lower.includes("nhiệm vụ") || lower.includes("giao ban")) {
        const taskStr =
          openTaskTitles.length > 0
            ? `\n- **Nhiệm vụ đang triển khai (${openTasksCount}):**\n${openTaskTitles.map((t) => `  + ${t}`).join("\n")}`
            : "";
        const schStr =
          upcomingScheduleTitles.length > 0
            ? `\n- **Lịch công tác sắp tới:**\n${upcomingScheduleTitles.map((s) => `  + ${s}`).join("\n")}`
            : "";
        reply = `**Tổng hợp Điều hành Công việc & Lịch công tác Khu phố 3:**${taskStr}${schStr}`;
      } else if (lower.includes("bí thư") || lower.includes("trưởng khu phố") || lower.includes("liên hệ") || lower.includes("ai là")) {
        reply = `Thông tin Cấp ủy & Thường trực **Ban Điều hành Khu phố 3, Phường An Phú**:\n- **Bí thư Chi bộ (Đứng đầu Khu phố 3):** ${partySecName}${partySec?.phone ? ` — SĐT: \`${partySec.phone}\`` : ""}\n- **Phó Bí thư Chi bộ:** ${partyDeputyName}${partyDeputy?.phone ? ` — SĐT: \`${partyDeputy.phone}\`` : ""}\n- **Trưởng Ban Điều hành Khu phố:** ${neighborhoodHeadName}${neighborhoodHead?.phone ? ` — SĐT: \`${neighborhoodHead.phone}\`` : ""}\n- **Công an khu vực:** ${policeOfficerName}${policeOfficer?.phone ? ` — SĐT: \`${policeOfficer.phone}\`` : ""}\n- **Tiếp dân định kỳ:** Sáng Thứ Bảy hằng tuần (08:00 – 11:00) tại Văn phòng Khu phố 3.`;
      } else {
        reply = `Xin chào! Tôi là **Trợ lý AI Khu phố 3, Phường An Phú, TP. Hồ Chí Minh**:\n- **Dân cư:** **${householdsCount.toLocaleString("vi-VN")} hộ**, **${residentsCount.toLocaleString("vi-VN")} nhân khẩu** (${permanentCount.toLocaleString("vi-VN")} thường trú • ${temporaryCount.toLocaleString("vi-VN")} tạm trú • ${elderlyCount} người cao tuổi ≥60t).\n- **Kinh tế cơ sở:** **${businessesCount} doanh nghiệp & cơ sở KD** (${hostelsCount} nhà trọ).\n- **Tác nghiệp:** **${pendingReportsCount}** phản ánh 1022 cần xử lý • **${openTasksCount}** nhiệm vụ đang mở.`;
      }

      return res.json({ content: reply });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `Bạn là Trợ lý Ảo Thông Minh của Khu phố 3, Phường An Phú, TP. Hồ Chí Minh (chế độ hiện tại: ${mode === "canbo" ? "Trợ lý Điều hành Cán bộ KP3" : "Hướng dẫn Dịch vụ Công Cư dân"}).
Dữ liệu thời gian thực từ CSDL Khu phố 3 An Phú:
- Quy mô dân cư: ${householdsCount.toLocaleString("vi-VN")} hộ gia đình, ${residentsCount.toLocaleString("vi-VN")} nhân khẩu (${permanentCount.toLocaleString("vi-VN")} Thường trú + ${temporaryCount.toLocaleString("vi-VN")} Tạm trú; ${elderlyCount} Người cao tuổi ≥60t; ${expiringTempCount} sắp hết hạn tạm trú ≤30 ngày; ${expiredTempCount} đã quá hạn tạm trú).
- Kinh tế địa bàn: ${businessesCount} cơ sở kinh doanh & doanh nghiệp (${hostelsCount} cơ sở nhà trọ).
- Cấp ủy & Thường trực Khu phố 3 (Bí thư Chi bộ luôn là người đứng đầu Khu phố 3): Bí thư Chi bộ ${partySecName}, Phó Bí thư Chi bộ ${partyDeputyName}, Trưởng BĐH Khu phố ${neighborhoodHeadName}, Công an khu vực ${policeOfficerName}.
- Tình hình Quỹ Khu phố: ${fundBalanceText || "Đang cập nhật"}
- Phản ánh 1022 đang mở (${pendingReportsCount}): ${openReportTitles.join(" | ") || "Không có phản ánh tồn đọng"}
- Nhiệm vụ đang thực hiện (${openTasksCount}): ${openTaskTitles.join(" | ") || "Không có"}
- Lịch công tác sắp diễn ra: ${upcomingScheduleTitles.join(" | ") || "Theo lịch tuần BĐH KP3"}
Nếu người dùng đính kèm hình ảnh văn bản, biên bản hoặc ảnh hiện trường, hãy đọc và phân tích chi tiết nội dung ảnh. Trả lời bằng tiếng Việt lịch sự, chuẩn mực hành chính công, trình bày Markdown rõ ràng, tuyệt đối không bịa đặt số liệu ngoài thực tế.`;

    const contents = sanitizedMessages.map((m: any, idx: number) => {
      const parts: any[] = [{ text: m.content }];
      if (
        idx === sanitizedMessages.length - 1 &&
        m.role === "user" &&
        typeof imageBase64 === "string" &&
        imageBase64.length > 0 &&
        imageBase64.length < 5_500_000
      ) {
        const cleanedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: typeof imageMimeType === "string" && imageMimeType ? imageMimeType : "image/jpeg",
            data: cleanedBase64,
          },
        });
      }
      return { role: m.role, parts };
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    return res.json({ content: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return res.status(500).json({
      error: "Trợ lý AI hiện đang bận hoặc tạm gián đoạn kết nối. Vui lòng thử lại sau ít giây.",
    });
  }
}
