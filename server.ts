import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import keepAliveHandler from "./api/keepalive";
import staffAdminHandler from "./api/staff-admin";
import ocrDocumentHandler from "./api/ocr-document";
import chatHandler from "./api/chat";
import uploadStorageHandler from "./api/upload-storage";
import notificationsHandler from "./api/notifications";

dotenv.config({ path: [".env.local", ".env"] });

// Chống sập tiến trình khi gặp lỗi mạng bất khả kháng (ECONNRESET, ConnectTimeoutError)
process.on("unhandledRejection", (reason) => {
  console.warn("⚠️ [Server] Unhandled Rejection được bắt và xử lý an toàn:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ [Server] Uncaught Exception được bắt và xử lý an toàn:", error);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self)");
    next();
  });

  const smallJson = express.json({ limit: "1mb" });
  const mediaJson = express.json({ limit: "12mb" });

  const asyncRoute = (handler: (req: any, res: any) => any) => async (req: any, res: any, next: any) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };

  // Keep-Alive / Health Check Endpoint (ngăn Supabase tự dừng sau 7 ngày)
  app.all("/api/keepalive", smallJson, asyncRoute((req, res) => keepAliveHandler(req, res)));

  // Quản trị Đăng ký & Phê duyệt Tài khoản Cán bộ (xác thực JWT + Service Role)
  app.all("/api/staff-admin", smallJson, asyncRoute((req, res) => staffAdminHandler(req, res)));

  // AI Multimodal OCR Giấy phép kinh doanh, Sổ đỏ & Lịch làm việc Phường
  app.all("/api/ocr-document", mediaJson, asyncRoute((req, res) => ocrDocumentHandler(req, res)));

  // Tải tệp an toàn lên Supabase Storage Buckets
  app.all("/api/upload-storage", mediaJson, asyncRoute((req, res) => uploadStorageHandler(req, res)));

  // Trợ lý AI Khu phố 3 Đa phương thức
  app.all("/api/chat", mediaJson, asyncRoute((req, res) => chatHandler(req, res)));

  // Kết nối Zalo OA & Email tự động nhắc gia hạn tạm trú 15 ngày + thông báo cộng đồng
  app.all("/api/notifications", smallJson, asyncRoute((req, res) => notificationsHandler(req, res)));

  // Serve static files or Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        immutable: true,
        maxAge: "1y",
        fallthrough: false,
      })
    );
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
