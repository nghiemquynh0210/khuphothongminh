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
      error: "Phiên đăng nhập hết hạn hoặc thiếu mã xác thực. Vui lòng đăng nhập lại.",
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
    return {
      ok: false,
      status: 401,
      error: "Phiên đăng nhập Cán bộ không hợp lệ hoặc đã hết hạn.",
    };
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

const ALLOWED_BUCKETS = new Set([
  "field-reports",
  "cadastral-docs",
  "task-attachments",
  "admin-forms",
]);

const STAFF_ONLY_BUCKETS = new Set([
  "cadastral-docs",
  "task-attachments",
  "admin-forms",
]);

// Chỉ cho phép định dạng tệp an toàn — tuyệt đối chặn text/html, image/svg+xml, javascript để chống Stored XSS
const SAFE_MEDIA_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const SAFE_OFFICE_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_BASE64_CHARS = 5_600_000; // ~4.1 MB nhị phân gốc, an toàn dưới giới hạn 4.5MB của Vercel Serverless

const ipUploadBuckets = new Map<string, { count: number; resetAt: number }>();

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

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  if (ipUploadBuckets.size > 2000) {
    for (const [k, v] of ipUploadBuckets.entries()) {
      if (now > v.resetAt) ipUploadBuckets.delete(k);
    }
  }
  const entry = ipUploadBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    ipUploadBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 45) return false;
  entry.count += 1;
  return true;
}

function detectMagicMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  // OLE2 (.doc / .xls) or ZIP-based OOXML (.docx / .xlsx)
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return "office";
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05)) return "office";
  return null;
}

export default async function uploadStorageHandler(req: any, res: any) {
  const origin = String(req.headers?.origin || "*");
  res.setHeader?.("Access-Control-Allow-Origin", origin || "*");
  res.setHeader?.("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader?.("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader?.("Vary", "Origin");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const clientIp = extractClientIp(req);

    if (!checkUploadRateLimit(clientIp)) {
      return res.status(429).json({
        ok: false,
        error: "Tải tệp quá nhanh, vui lòng thử lại sau ít giây.",
      });
    }

    const {
      bucket,
      folder = "uploads",
      fileName = "file",
      mimeType,
      contentType,
      fileBase64,
    } = req.body || {};

    const bucketStr = String(bucket || "");
    if (!bucketStr || !ALLOWED_BUCKETS.has(bucketStr)) {
      return res.status(400).json({ ok: false, error: "Bucket lưu trữ không hợp lệ." });
    }

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ ok: false, error: "Thiếu dữ liệu tệp tải lên." });
    }

    const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    if (cleanedBase64.length > MAX_BASE64_CHARS) {
      return res.status(413).json({
        ok: false,
        error: "Tệp vượt quá giới hạn 4 MB cho mỗi lần tải trực tuyến.",
      });
    }

    const effectiveMime = mimeType || contentType;
    const rawMime = typeof effectiveMime === "string" ? effectiveMime.trim().toLowerCase() : "";
    const normalizedMime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
    const allowOffice = STAFF_ONLY_BUCKETS.has(bucketStr);
    const isMimeAllowed =
      SAFE_MEDIA_MIMES.has(normalizedMime) ||
      (allowOffice && SAFE_OFFICE_MIMES.has(normalizedMime));

    if (!isMimeAllowed) {
      return res.status(415).json({
        ok: false,
        error: "Định dạng tệp không được phép tải lên (chỉ chấp nhận Ảnh JPG/PNG/WebP/GIF, PDF hoặc biểu mẫu Office cho Cán bộ).",
      });
    }

    const buffer = Buffer.from(cleanedBase64, "base64");
    const magic = detectMagicMime(buffer);
    if (!magic || (magic === "office" && !allowOffice)) {
      return res.status(415).json({
        ok: false,
        error: "Nội dung nhị phân của tệp không hợp lệ hoặc không khớp định dạng an toàn.",
      });
    }

    // Các bucket nghiệp vụ nội bộ BẮT BUỘC có Bearer token xác thực trước khi chạm tới Storage
    if (STAFF_ONLY_BUCKETS.has(bucketStr)) {
      const authHeader = String(req?.headers?.authorization || req?.headers?.Authorization || "");
      if (!authHeader.toLowerCase().startsWith("bearer ")) {
        return res.status(401).json({
          ok: false,
          error: "Yêu cầu xác thực tài khoản Cán bộ để tải hồ sơ nội bộ.",
        });
      }
    }

    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(200).json({ ok: false, reason: "storage_not_configured" });
    }

    // Xác minh JWT + trạng thái approved trên CSDL cho các bucket nội bộ
    if (STAFF_ONLY_BUCKETS.has(bucketStr)) {
      const callerCheck = await verifyApprovedCaller(req, supabaseUrl, anonKey, serviceRoleKey);
      if (!callerCheck.ok) {
        return res.status(callerCheck.status || 401).json({
          ok: false,
          error: callerCheck.error || "Yêu cầu xác thực tài khoản Cán bộ để tải hồ sơ nội bộ.",
        });
      }
    }

    const resolvedMime = magic === "office" ? normalizedMime : magic;

    // Chặn tuyệt đối path traversal ('..') và các đuôi tệp thực thi/kịch bản (.html, .svg, .js)
    const safeFolder =
      String(folder)
        .replace(/\.\.+/g, "")
        .replace(/[^a-zA-Z0-9/_-]/g, "")
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, "") || "uploads";

    const rawSafeName = String(fileName)
      .replace(/\.\.+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.(html?|svg|js|mjs|cjs|xhtml|xml|php|exe|bat|cmd|sh)$/i, ".bin")
      .slice(-80) || "file";

    const objectPath = `${safeFolder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${rawSafeName}`;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketStr}/${objectPath}`;

    const upResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": resolvedMime,
        "x-upsert": "false",
      },
      body: buffer,
    });

    if (!upResp.ok) {
      return res.status(200).json({ ok: false, reason: "upload_failed" });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketStr}/${objectPath}`;

    return res.status(200).json({
      ok: true,
      publicUrl,
      bucket: bucketStr,
      path: objectPath,
      sizeBytes: buffer.length,
    });
  } catch {
    return res.status(500).json({
      ok: false,
      error: "Lỗi máy chủ khi tải tệp lưu trữ.",
    });
  }
}
