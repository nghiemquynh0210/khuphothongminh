import React from "react";
import { FieldReport, LandingConfig, LeadershipMember } from "../../types";

export const PUBLIC_CONTACT_EMAIL = "bdhkhupho3.ap@gmail.com";
export const LANDING_CONFIG_STORAGE_KEY = "kp3_landing_config_v1";

export const DEFAULT_LEADERSHIP_MEMBERS: LeadershipMember[] = [
  {
    id: "LD-01",
    name: "Nghiêm Xuân Quỳnh",
    role: "Bí thư Chi bộ",
    group: "Cấp ủy Chi bộ",
    scope: "Chi bộ Khu phố 3",
    phone: "0825681868",
    description: "Phụ trách chung công tác Đảng, chính trị tư tưởng và định hướng chuyển đổi số tại cơ sở.",
    schedule: "Sáng Thứ 7 (08:00 - 11:00) tại Nhà Văn hóa KP3",
    isHighlight: true,
  },
  {
    id: "LD-02",
    name: "Phạm Ngọc Hà",
    role: "Phó Bí thư Chi bộ",
    group: "Cấp ủy Chi bộ",
    scope: "Chi bộ Khu phố 3",
    phone: "0908579479",
    description: "Phụ trách công tác tổ chức, kiểm tra giám sát và phong trào đoàn thể khu phố.",
    isHighlight: false,
  },
  {
    id: "LD-03",
    name: "Nguyễn Trung Huy",
    role: "Chi ủy viên",
    subRole: "Trưởng Ban Điều hành Khu phố 3",
    group: "Ban Điều hành Khu phố",
    scope: "Ban Điều hành Khu phố 3",
    phone: "0962037937",
    description: "Chủ trì điều hành hoạt động hành chính, trật tự đô thị, an sinh xã hội và dịch vụ công.",
    schedule: "Giờ hành chính Thứ 2 - Thứ 6",
    isHighlight: false,
  },
  {
    id: "LD-04",
    name: "Dương Tấn Đạt",
    role: "Chi ủy viên",
    group: "Cấp ủy Chi bộ",
    scope: "Ban Điều hành Khu phố 3",
    phone: "0352475848",
    description: "Phụ trách công tác thanh niên, phong trào tự quản và an ninh trật tự địa bàn.",
    isHighlight: false,
  },
  {
    id: "LD-05",
    name: "Đại úy Trần Quốc Hải",
    role: "Công an khu vực",
    group: "Công an khu vực",
    scope: "Công an Phường An Phú (phụ trách địa bàn KP3)",
    description: "Phụ trách an ninh trật tự, quản lý cư trú VNeID, PCCC và tiếp nhận tin báo tội phạm.",
    isHighlight: false,
  },
];

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  siteTitle: "Khu phố 3 – Phường An Phú",
  siteSubtitle: "Cổng thông tin cộng đồng & tiện ích số",
  heroBadge: "Khu phố 3 · Phường An Phú · TP. Hồ Chí Minh",
  heroTitle: "Kết nối người dân – Xây dựng khu phố văn minh",
  heroAddressNote: "Địa bàn khép kín theo các trục đường Song Hành, Lương Định Của, Mai Chí Thọ.",
  bannerNotice: "",
  contactEmail: PUBLIC_CONTACT_EMAIL,
  contactAddress: "Nhà Văn hóa Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
  workingHours: "Thứ 2 – Thứ 6 (07:30 – 17:00) • Trực địa bàn 24/7",
  hotline: "028.3747.xxxx (Ban Điều hành KP3)",
  footerOperator: "Đơn vị phụ trách nội dung: Ban Điều hành Khu phố 3.",
  logoUrl: "",
  heroCoverUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80",
  galleryImages: [
    {
      id: "GAL-01",
      url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80",
      caption: "Ngày Chủ Nhật Xanh dọn dẹp vệ sinh và chăm sóc mảng xanh Khu phố 3",
    },
    {
      id: "GAL-02",
      url: "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=1200&auto=format&fit=crop&q=80",
      caption: "Tuyên truyền & thực tập phương án PCCC tại cụm dân cư tự quản",
    },
  ],
  leadership: DEFAULT_LEADERSHIP_MEMBERS,
  about: {
    summaryText:
      "Khu phố 3 là một trong 14 khu phố trực thuộc Đảng ủy – HĐND – UBND – UBMTTQ Việt Nam Phường An Phú, Thành phố Hồ Chí Minh; địa bàn khép kín văn minh, hiện đại, năng động và đi đầu trong công tác chuyển đổi số cơ sở.",
    mapImageUrl: "https://danguy.phuonganphu.gov.vn/assets/images/maps/khu-pho-3.jpg?v=20261103-155725",
    mapCaption: "Nguồn trích xuất: Bản đồ số 14 Khu phố — Không Gian Số Đảng Ủy Phường An Phú (Nhiệm kỳ 2025 – 2030)",
    transportTitle: "Tọa độ & Trục giao thông chính",
    transportIntro:
      "Địa bàn Khu phố 3 nằm trong quy hoạch chỉnh trang đô thị đồng bộ, vận hành trực tiếp không chia tổ dân phố, kết nối thuận lợi thông qua các tuyến giao thông trọng điểm:",
    transportRoutes: [
      "Đường Lương Định Của (Trục thương mại, dịch vụ sôi động)",
      "Đường Song Hành & Tuyến kết nối Đại lộ Mai Chí Thọ",
      "Hệ thống các tuyến hẻm nội khu bê tông hóa 100%",
    ],
    selfGovTitle: "Điểm nhấn mô hình tự quản",
    selfGovDescription:
      "Các tuyến đường và cụm dân cư nội khu đều duy trì Tổ liên gia an toàn PCCC, camera an ninh giám sát 24/7 và hệ thống phân loại rác tại nguồn.",
    civilizedStatValue: "100%",
    civilizedStatLabel: "Tuyến đường đạt chuẩn xanh - sạch - đẹp",
  },
};

export function mergeLandingConfig(raw?: Partial<LandingConfig> | null): LandingConfig {
  if (!raw) return DEFAULT_LANDING_CONFIG;
  return {
    ...DEFAULT_LANDING_CONFIG,
    ...raw,
    galleryImages: Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : DEFAULT_LANDING_CONFIG.galleryImages,
    leadership:
      Array.isArray(raw.leadership) && raw.leadership.length > 0
        ? raw.leadership
        : DEFAULT_LANDING_CONFIG.leadership,
    about: {
      ...DEFAULT_LANDING_CONFIG.about!,
      ...(raw.about || {}),
      transportRoutes:
        raw.about && Array.isArray(raw.about.transportRoutes)
          ? raw.about.transportRoutes
          : DEFAULT_LANDING_CONFIG.about!.transportRoutes,
    },
  };
}

/** Danh sách mặc định rút gọn dùng cho tìm kiếm / fallback. */
export const VERIFIED_LEADERSHIP = DEFAULT_LEADERSHIP_MEMBERS;

import {
  ROUTES,
  APP_ROUTES,
  LandingRoute,
  RouteConfig as NavItem,
  getRouteFromPath,
  getPathFromRoute,
  getDashboardExtensionPath,
  getTabFromDashboardPath,
  navigate,
  useCurrentPath,
  useCurrentRoute,
  Link,
  NavLink
} from "../../routes";

export {
  ROUTES,
  getRouteFromPath,
  getPathFromRoute,
  getDashboardExtensionPath,
  getTabFromDashboardPath,
  navigate,
  useCurrentPath,
  useCurrentRoute,
  Link,
  NavLink
};
export type { LandingRoute, NavItem };

export const NAV_ITEMS: NavItem[] = APP_ROUTES;

export const REPORT_CATEGORIES: { id: FieldReport["category"]; label: string }[] = [
  { id: "Rác thải", label: "Rác & môi trường" },
  { id: "Lấn chiếm lòng đường", label: "Lấn chiếm vỉa hè" },
  { id: "Tiếng ồn", label: "Tiếng ồn" },
  { id: "Hạ tầng đô thị", label: "Đèn, cống, hẻm" },
  { id: "An ninh trật tự", label: "An ninh trật tự" }
];

export const FORM_CATEGORIES = [
  "Tất cả",
  "Cư trú & Hộ khẩu",
  "Địa chính & Nhà ở",
  "Hộ kinh doanh",
  "Hộ tịch & Tư pháp",
  "An sinh xã hội",
  "Điều hành KP3 & Chi bộ"
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SUBMIT_COOLDOWN_MS = 60 * 1000;
export const MAX_SUBMISSIONS_PER_DAY = 5;
export const RATE_KEY = "kp3_report_submissions";

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

export function readSubmissionLog(): number[] {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return Array.isArray(arr) ? arr.filter(t => typeof t === "number" && t > dayAgo) : [];
  } catch {
    return [];
  }
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl text-sm font-bold text-white bg-gov-blue hover:bg-gov-navy transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl text-sm font-semibold text-gov-text bg-white border border-slate-200 hover:border-gov-blue hover:text-gov-blue transition-colors cursor-pointer";
export const inputCls =
  "w-full min-h-11 px-3.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-gov-blue aria-[invalid=true]:border-gov-danger";
