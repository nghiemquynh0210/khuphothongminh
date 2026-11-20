import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

const PRODUCTION_API_BASE = "https://bdhkp3.vercel.app";

export function isAndroidOrNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // ignore
  }
  return (
    window.location.protocol === "capacitor:" ||
    (window.location.hostname === "localhost" && !window.location.port)
  );
}

export function installNativeRuntimeSupport(): void {
  if (typeof window === "undefined") return;
  if (!isAndroidOrNativeRuntime()) return;

  // 1. Tự động định tuyến mọi request tương đối `/api/*` về máy chủ Production https://bdhkp3.vercel.app
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(`${PRODUCTION_API_BASE}${input}`, init);
    }
    if (input instanceof URL && input.origin === window.location.origin && input.pathname.startsWith("/api/")) {
      return originalFetch(`${PRODUCTION_API_BASE}${input.pathname}${input.search}`, init);
    }
    return originalFetch(input, init);
  };

  // 2. Đồng bộ thanh trạng thái Android (Status Bar) màu hành chính #0f172a
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#0f172a" }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  // 3. Xử lý nút Back vật lý trên điện thoại Android (quay lại trang trước thay vì thoát đột ngột)
  CapApp.addListener("backButton", ({ canGoBack }) => {
    const path = window.location.pathname || "/";
    const isRootScreen = path === "/" || path === "/dashboard";
    if (!isRootScreen && (canGoBack || window.history.length > 1)) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  }).catch(() => {});
}
