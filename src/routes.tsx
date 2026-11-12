import React, { useEffect, useState } from "react";

/**
 * Định nghĩa các hằng số Route tập trung của toàn bộ ứng dụng.
 * Hỗ trợ mở rộng link: /dashboard/("sidebar content") cho toàn bộ phân hệ cán bộ.
 */
export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  REFLECTION: "/reflection",
  FORMS: "/forms",
  NOTICES: "/notices",
  NEWS: "/news",
  LEADERSHIP: "/leadership",
  SCHEDULE: "/schedule",

  // Cổng cán bộ / Quản trị
  CANBO: "/dashboard",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",

  // Mở rộng link theo cú pháp: /dashboard/("sidebar content")
  DASHBOARD_RESIDENTS: "/dashboard/residents",
  DASHBOARD_RESIDENTS_NEW: "/dashboard/residents/new",
  DASHBOARD_RESIDENTS_EDIT: "/dashboard/residents/edit",
  DASHBOARD_RESIDENTS_DETAIL: "/dashboard/residents/detail",
  DASHBOARD_HOUSEHOLDS: "/dashboard/households",
  DASHBOARD_HOUSEHOLDS_NEW: "/dashboard/households/new",
  DASHBOARD_HOUSEHOLDS_EDIT: "/dashboard/households/edit",
  DASHBOARD_HOUSEHOLDS_ADD_MEMBER: "/dashboard/households/add-member",
  DASHBOARD_HOUSEHOLDS_DETAIL: "/dashboard/households/detail",
  DASHBOARD_ENTERPRISES: "/dashboard/enterprises",
  DASHBOARD_ENTERPRISES_NEW: "/dashboard/enterprises/new",
  DASHBOARD_ENTERPRISES_EDIT: "/dashboard/enterprises/edit",
  DASHBOARD_ENTERPRISES_DETAIL: "/dashboard/enterprises/detail",
  DASHBOARD_BUSINESSES: "/dashboard/businesses",
  DASHBOARD_BUSINESSES_NEW: "/dashboard/businesses/new",
  DASHBOARD_BUSINESSES_EDIT: "/dashboard/businesses/edit",
  DASHBOARD_BUSINESSES_DETAIL: "/dashboard/businesses/detail",
  DASHBOARD_GIS: "/dashboard/gis",
  DASHBOARD_TASKS: "/dashboard/tasks",
  DASHBOARD_AI: "/dashboard/ai",
  DASHBOARD_REPORTS: "/dashboard/reports",
  DASHBOARD_REPORTS_NEW: "/dashboard/reports/new",
  DASHBOARD_REPORTS_EDIT: "/dashboard/reports/edit",
  DASHBOARD_REPORTS_DETAIL: "/dashboard/reports/detail",
  DASHBOARD_REPORTS_RESOLVE: "/dashboard/reports/resolve",
  DASHBOARD_PARTY: "/dashboard/party",
  DASHBOARD_WELFARE: "/dashboard/welfare",
  DASHBOARD_CULTURAL: "/dashboard/cultural",
  DASHBOARD_CULTURAL_NEWS_NEW: "/dashboard/cultural/news/new",
  DASHBOARD_CULTURAL_NEWS_EDIT: "/dashboard/cultural/news/edit",
  DASHBOARD_CULTURAL_NEWS_DETAIL: "/dashboard/cultural/news/detail",
  DASHBOARD_CULTURAL_EVENTS_NEW: "/dashboard/cultural/events/new",
  DASHBOARD_CULTURAL_EVENTS_EDIT: "/dashboard/cultural/events/edit",
  DASHBOARD_CULTURAL_EVENTS_DETAIL: "/dashboard/cultural/events/detail",
  DASHBOARD_FINANCE: "/dashboard/finance",
  DASHBOARD_PLAN: "/dashboard/plan",
  DASHBOARD_SETTINGS: "/dashboard/settings",
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

export type LandingRoute =
  | "all"
  | "about"
  | "reflection"
  | "forms"
  | "notices"
  | "news"
  | "leadership"
  | "schedule";

export interface RouteConfig {
  id: LandingRoute;
  label: string;
  path: string;
  description: string;
}

/**
 * Danh sách cấu hình các Route trên Cổng Cư Dân
 */
export const APP_ROUTES: RouteConfig[] = [
  {
    id: "about",
    label: "Giới thiệu KP3",
    path: ROUTES.ABOUT,
    description: "Giới thiệu địa giới, Chi bộ & bản đồ số Khu phố 3 (Đảng ủy Phường An Phú)"
  },
  {
    id: "reflection",
    label: "Phản ánh",
    path: ROUTES.REFLECTION,
    description: "Gửi phản ánh hiện trường & tra cứu hồ sơ"
  },
  {
    id: "forms",
    label: "Biểu mẫu",
    path: ROUTES.FORMS,
    description: "Kho biểu mẫu hành chính tải về"
  },
  {
    id: "notices",
    label: "Thông báo",
    path: ROUTES.NOTICES,
    description: "Thông báo chính thức & khẩn từ Ban Điều Hành"
  },
  {
    id: "news",
    label: "Tin tức",
    path: ROUTES.NEWS,
    description: "Bản tin đời sống, phong trào thi đua KP3"
  },
  {
    id: "leadership",
    label: "Cán bộ",
    path: ROUTES.LEADERSHIP,
    description: "Cơ cấu thường trực Chi bộ, BĐH, CSKV"
  },
  {
    id: "schedule",
    label: "Lịch hoạt động",
    path: ROUTES.SCHEDULE,
    description: "Lịch sinh hoạt cộng đồng & tiếp dân"
  }
];

/**
 * Tạo đường dẫn mở rộng cho Cổng Cán bộ: /dashboard/("sidebar content")
 */
export function getDashboardExtensionPath(sidebarContentId: string): string {
  if (!sidebarContentId || sidebarContentId === "dashboard") {
    return ROUTES.DASHBOARD;
  }
  return `/dashboard/${sidebarContentId}`;
}

/**
 * Phân tích URL pathname để trích xuất tab Cán bộ tương ứng từ /dashboard/(sidebar content)
 */
export function getTabFromDashboardPath(pathname: string): string | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  
  if (clean === "dashboard" || clean === "canbo") {
    return "dashboard";
  }

  if (clean.startsWith("dashboard/")) {
    const sub = clean.replace(/^dashboard\//, "").split("/")[0];
    return sub || "dashboard";
  }

  // Hỗ trợ tương thích ngược nếu người dùng gõ trực tiếp /residents hoặc /gis
  const validTabs = [
    "dashboard",
    "residents",
    "households",
    "enterprises",
    "businesses",
    "gis",
    "tasks",
    "ai",
    "reports",
    "party",
    "welfare",
    "cultural",
    "finance",
    "plan",
    "settings"
  ];

  if (validTabs.includes(clean)) {
    return clean;
  }

  return null;
}

export type ResidentFormRouteMatch =
  | { mode: "create"; isForeigner: boolean }
  | { mode: "edit"; residentId: string }
  | { mode: "detail"; residentId: string };

/**
 * Tạo URL thêm mới cư dân (hỗ trợ tham số loại người nước ngoài)
 */
export function getResidentCreatePath(isForeigner = false): string {
  return isForeigner
    ? `${ROUTES.DASHBOARD_RESIDENTS_NEW}?type=foreigner`
    : ROUTES.DASHBOARD_RESIDENTS_NEW;
}

/**
 * Tạo URL chỉnh sửa hồ sơ cư dân theo tham số ID
 */
export function getResidentEditPath(residentId: string): string {
  return `${ROUTES.DASHBOARD_RESIDENTS_EDIT}/${encodeURIComponent(residentId)}`;
}

/**
 * Tạo URL xem chi tiết hồ sơ cư dân theo tham số ID
 */
export function getResidentDetailPath(residentId: string): string {
  return `${ROUTES.DASHBOARD_RESIDENTS_DETAIL}/${encodeURIComponent(residentId)}`;
}

/**
 * Phân tích URL hiện tại để xác định trang Form Thêm/Sửa hoặc Chi tiết cư dân từ params
 */
export function parseResidentFormRoute(
  pathname: string,
  search = ""
): ResidentFormRouteMatch | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams(search || "");

  if (clean === "dashboard/residents/new" || clean === "residents/new") {
    const isForeigner =
      params.get("type") === "foreigner" || params.get("foreigner") === "1";
    return { mode: "create", isForeigner };
  }

  for (const prefix of ["dashboard/residents/edit/", "residents/edit/"]) {
    if (clean.startsWith(prefix)) {
      const residentId = decodeURIComponent(clean.slice(prefix.length));
      if (residentId) return { mode: "edit", residentId };
    }
  }

  if (clean === "dashboard/residents/edit" || clean === "residents/edit") {
    const idParam = params.get("id");
    if (idParam) return { mode: "edit", residentId: idParam };
  }

  for (const prefix of ["dashboard/residents/detail/", "residents/detail/"]) {
    if (clean.startsWith(prefix)) {
      const residentId = decodeURIComponent(clean.slice(prefix.length));
      if (residentId) return { mode: "detail", residentId };
    }
  }

  if (clean === "dashboard/residents/detail" || clean === "residents/detail") {
    const idParam = params.get("id");
    if (idParam) return { mode: "detail", residentId: idParam };
  }

  return null;
}

export type HouseholdFormRouteMatch =
  | { mode: "create" }
  | { mode: "edit"; householdId: string }
  | { mode: "add-member"; householdId: string }
  | { mode: "detail"; householdId: string };

/**
 * Tạo URL lập sổ hộ khẩu mới
 */
export function getHouseholdCreatePath(): string {
  return ROUTES.DASHBOARD_HOUSEHOLDS_NEW;
}

/**
 * Tạo URL chỉnh sửa thông tin sổ hộ khẩu theo tham số ID
 */
export function getHouseholdEditPath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS_EDIT}/${encodeURIComponent(householdId)}`;
}

/**
 * Tạo URL thêm nhân khẩu vào sổ hộ khẩu theo tham số ID
 */
export function getHouseholdAddMemberPath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS_ADD_MEMBER}/${encodeURIComponent(householdId)}`;
}

/**
 * Tạo URL xem chi tiết sổ hộ khẩu theo tham số ID
 */
export function getHouseholdDetailPath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS_DETAIL}/${encodeURIComponent(householdId)}`;
}

/**
 * Phân tích URL hiện tại để xác định trang Lập sổ / Sửa sổ / Thêm nhân khẩu / Chi tiết sổ hộ khẩu từ params
 */
export function parseHouseholdFormRoute(
  pathname: string,
  search = ""
): HouseholdFormRouteMatch | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams(search || "");

  if (clean === "dashboard/households/new" || clean === "households/new") {
    return { mode: "create" };
  }

  for (const prefix of ["dashboard/households/edit/", "households/edit/"]) {
    if (clean.startsWith(prefix)) {
      const householdId = decodeURIComponent(clean.slice(prefix.length));
      if (householdId) return { mode: "edit", householdId };
    }
  }

  if (clean === "dashboard/households/edit" || clean === "households/edit") {
    const idParam = params.get("id");
    if (idParam) return { mode: "edit", householdId: idParam };
  }

  for (const prefix of [
    "dashboard/households/add-member/",
    "households/add-member/",
  ]) {
    if (clean.startsWith(prefix)) {
      const householdId = decodeURIComponent(clean.slice(prefix.length));
      if (householdId) return { mode: "add-member", householdId };
    }
  }

  if (
    clean === "dashboard/households/add-member" ||
    clean === "households/add-member"
  ) {
    const idParam = params.get("id");
    if (idParam) return { mode: "add-member", householdId: idParam };
  }

  for (const prefix of ["dashboard/households/detail/", "households/detail/"]) {
    if (clean.startsWith(prefix)) {
      const householdId = decodeURIComponent(clean.slice(prefix.length));
      if (householdId) return { mode: "detail", householdId };
    }
  }

  if (clean === "dashboard/households/detail" || clean === "households/detail") {
    const idParam = params.get("id");
    if (idParam) return { mode: "detail", householdId: idParam };
  }

  return null;
}

export type EnterpriseFormRouteMatch =
  | { mode: "create" }
  | { mode: "edit"; enterpriseId: string }
  | { mode: "detail"; enterpriseId: string };

/**
 * Tạo URL đăng ký doanh nghiệp mới
 */
export function getEnterpriseCreatePath(): string {
  return ROUTES.DASHBOARD_ENTERPRISES_NEW;
}

/**
 * Tạo URL chỉnh sửa hồ sơ doanh nghiệp theo tham số ID
 */
export function getEnterpriseEditPath(enterpriseId: string): string {
  return `${ROUTES.DASHBOARD_ENTERPRISES_EDIT}/${encodeURIComponent(enterpriseId)}`;
}

/**
 * Tạo URL xem chi tiết hồ sơ doanh nghiệp theo tham số ID
 */
export function getEnterpriseDetailPath(enterpriseId: string): string {
  return `${ROUTES.DASHBOARD_ENTERPRISES_DETAIL}/${encodeURIComponent(enterpriseId)}`;
}

/**
 * Phân tích URL hiện tại để xác định trang Thêm/Sửa hoặc Chi tiết doanh nghiệp từ params
 */
export function parseEnterpriseFormRoute(
  pathname: string,
  search = ""
): EnterpriseFormRouteMatch | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams(search || "");

  if (clean === "dashboard/enterprises/new" || clean === "enterprises/new") {
    return { mode: "create" };
  }

  for (const prefix of ["dashboard/enterprises/edit/", "enterprises/edit/"]) {
    if (clean.startsWith(prefix)) {
      const enterpriseId = decodeURIComponent(clean.slice(prefix.length));
      if (enterpriseId) return { mode: "edit", enterpriseId };
    }
  }

  if (clean === "dashboard/enterprises/edit" || clean === "enterprises/edit") {
    const idParam = params.get("id");
    if (idParam) return { mode: "edit", enterpriseId: idParam };
  }

  for (const prefix of ["dashboard/enterprises/detail/", "enterprises/detail/"]) {
    if (clean.startsWith(prefix)) {
      const enterpriseId = decodeURIComponent(clean.slice(prefix.length));
      if (enterpriseId) return { mode: "detail", enterpriseId };
    }
  }

  if (clean === "dashboard/enterprises/detail" || clean === "enterprises/detail") {
    const idParam = params.get("id");
    if (idParam) return { mode: "detail", enterpriseId: idParam };
  }

  return null;
}

export type BusinessFormRouteMatch =
  | { mode: "create" }
  | { mode: "edit"; businessId: string }
  | { mode: "detail"; businessId: string };

/**
 * Tạo URL đăng ký cơ sở kinh doanh mới
 */
export function getBusinessCreatePath(): string {
  return ROUTES.DASHBOARD_BUSINESSES_NEW;
}

/**
 * Tạo URL chỉnh sửa hồ sơ cơ sở kinh doanh theo tham số ID
 */
export function getBusinessEditPath(businessId: string): string {
  return `${ROUTES.DASHBOARD_BUSINESSES_EDIT}/${encodeURIComponent(businessId)}`;
}

/**
 * Tạo URL xem chi tiết hồ sơ cơ sở kinh doanh theo tham số ID
 */
export function getBusinessDetailPath(businessId: string): string {
  return `${ROUTES.DASHBOARD_BUSINESSES_DETAIL}/${encodeURIComponent(businessId)}`;
}

/**
 * Phân tích URL hiện tại để xác định trang Thêm/Sửa hoặc Chi tiết cơ sở kinh doanh từ params
 */
export function parseBusinessFormRoute(
  pathname: string,
  search = ""
): BusinessFormRouteMatch | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams(search || "");

  if (clean === "dashboard/businesses/new" || clean === "businesses/new") {
    return { mode: "create" };
  }

  for (const prefix of ["dashboard/businesses/edit/", "businesses/edit/"]) {
    if (clean.startsWith(prefix)) {
      const businessId = decodeURIComponent(clean.slice(prefix.length));
      if (businessId) return { mode: "edit", businessId };
    }
  }

  if (clean === "dashboard/businesses/edit" || clean === "businesses/edit") {
    const idParam = params.get("id");
    if (idParam) return { mode: "edit", businessId: idParam };
  }

  for (const prefix of ["dashboard/businesses/detail/", "businesses/detail/"]) {
    if (clean.startsWith(prefix)) {
      const businessId = decodeURIComponent(clean.slice(prefix.length));
      if (businessId) return { mode: "detail", businessId };
    }
  }

  if (clean === "dashboard/businesses/detail" || clean === "businesses/detail") {
    const idParam = params.get("id");
    if (idParam) return { mode: "detail", businessId: idParam };
  }

  return null;
}

export type ReportFormRouteMatch =
  | { mode: "create" }
  | { mode: "edit"; reportId: string }
  | { mode: "detail"; reportId: string }
  | { mode: "resolve"; reportId: string };

/**
 * Tạo URL gửi phản ánh hiện trường 1022 mới
 */
export function getReportCreatePath(
  basePath: string = ROUTES.DASHBOARD_REPORTS
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/new`;
}

/**
 * Tạo URL chỉnh sửa hồ sơ phản ánh hiện trường theo tham số ID
 */
export function getReportEditPath(
  reportId: string,
  basePath: string = ROUTES.DASHBOARD_REPORTS
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/edit/${encodeURIComponent(reportId)}`;
}

/**
 * Tạo URL xem chi tiết hồ sơ phản ánh hiện trường theo tham số ID
 */
export function getReportDetailPath(
  reportId: string,
  basePath: string = ROUTES.DASHBOARD_REPORTS
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/detail/${encodeURIComponent(reportId)}`;
}

/**
 * Tạo URL hoàn tất xử lý & đính kèm ảnh minh chứng phản ánh theo tham số ID
 */
export function getReportResolvePath(
  reportId: string,
  basePath: string = ROUTES.DASHBOARD_REPORTS
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/resolve/${encodeURIComponent(reportId)}`;
}

/**
 * Phân tích URL hiện tại để xác định trang Thêm/Sửa, Chi tiết hoặc Hoàn tất xử lý phản ánh từ params
 */
export function parseReportFormRoute(
  pathname: string,
  search = ""
): ReportFormRouteMatch | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams(search || "");

  if (
    clean === "dashboard/reports/new" ||
    clean === "reports/new" ||
    clean === "reflection/new"
  ) {
    return { mode: "create" };
  }

  for (const prefix of [
    "dashboard/reports/edit/",
    "reports/edit/",
    "reflection/edit/",
  ]) {
    if (clean.startsWith(prefix)) {
      const reportId = decodeURIComponent(clean.slice(prefix.length));
      if (reportId) return { mode: "edit", reportId };
    }
  }

  if (
    clean === "dashboard/reports/edit" ||
    clean === "reports/edit" ||
    clean === "reflection/edit"
  ) {
    const idParam = params.get("id");
    if (idParam) return { mode: "edit", reportId: idParam };
  }

  for (const prefix of [
    "dashboard/reports/resolve/",
    "reports/resolve/",
    "reflection/resolve/",
  ]) {
    if (clean.startsWith(prefix)) {
      const reportId = decodeURIComponent(clean.slice(prefix.length));
      if (reportId) return { mode: "resolve", reportId };
    }
  }

  if (
    clean === "dashboard/reports/resolve" ||
    clean === "reports/resolve" ||
    clean === "reflection/resolve"
  ) {
    const idParam = params.get("id");
    if (idParam) return { mode: "resolve", reportId: idParam };
  }

  for (const prefix of [
    "dashboard/reports/detail/",
    "reports/detail/",
    "reflection/detail/",
  ]) {
    if (clean.startsWith(prefix)) {
      const reportId = decodeURIComponent(clean.slice(prefix.length));
      if (reportId) return { mode: "detail", reportId };
    }
  }

  if (
    clean === "dashboard/reports/detail" ||
    clean === "reports/detail" ||
    clean === "reflection/detail"
  ) {
    const idParam = params.get("id");
    if (idParam) return { mode: "detail", reportId: idParam };
  }

  return null;
}

export type CulturalRouteMatch =
  | { type: "news"; mode: "create" }
  | { type: "news"; mode: "edit"; newsId: string }
  | { type: "news"; mode: "detail"; newsId: string }
  | { type: "event"; mode: "create" }
  | { type: "event"; mode: "edit"; eventId: string }
  | { type: "event"; mode: "detail"; eventId: string };

/**
 * Tạo URL soạn thảo bản tin mới
 */
export function getNewsCreatePath(
  basePath: string = ROUTES.DASHBOARD_CULTURAL
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/news/new`;
}

/**
 * Tạo URL chỉnh sửa bài viết bản tin theo ID
 */
export function getNewsEditPath(
  newsId: string,
  basePath: string = ROUTES.DASHBOARD_CULTURAL
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/news/edit/${encodeURIComponent(newsId)}`;
}

/**
 * Tạo URL xem chi tiết bài viết bản tin theo ID
 */
export function getNewsDetailPath(
  newsId: string,
  basePath: string = ROUTES.DASHBOARD_CULTURAL
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/news/detail/${encodeURIComponent(newsId)}`;
}

/**
 * Tạo URL lên lịch / đặt chỗ sự kiện mới
 */
export function getEventCreatePath(
  basePath: string = ROUTES.DASHBOARD_CULTURAL
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/events/new`;
}

/**
 * Tạo URL chỉnh sửa sự kiện theo ID
 */
export function getEventEditPath(
  eventId: string,
  basePath: string = ROUTES.DASHBOARD_CULTURAL
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/events/edit/${encodeURIComponent(eventId)}`;
}

/**
 * Tạo URL xem chi tiết sự kiện theo ID
 */
export function getEventDetailPath(
  eventId: string,
  basePath: string = ROUTES.DASHBOARD_CULTURAL
): string {
  const clean = basePath.replace(/\/+$/, "");
  return `${clean}/events/detail/${encodeURIComponent(eventId)}`;
}

/**
 * Phân tích URL hiện tại để xác định chế độ xem/tạo/sửa của Bản tin và Sự kiện
 */
export function parseCulturalRoute(
  pathname: string,
  search = ""
): CulturalRouteMatch | null {
  if (!pathname) return null;
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  const params = new URLSearchParams(search || "");

  // 1. News Routes
  if (
    clean === "dashboard/cultural/news/new" ||
    clean === "dashboard/news/new" ||
    clean === "news/new"
  ) {
    return { type: "news", mode: "create" };
  }

  for (const prefix of [
    "dashboard/cultural/news/edit/",
    "dashboard/news/edit/",
    "news/edit/",
  ]) {
    if (clean.startsWith(prefix)) {
      const newsId = decodeURIComponent(clean.slice(prefix.length));
      if (newsId) return { type: "news", mode: "edit", newsId };
    }
  }

  if (
    clean === "dashboard/cultural/news/edit" ||
    clean === "dashboard/news/edit" ||
    clean === "news/edit"
  ) {
    const id = params.get("id");
    if (id) return { type: "news", mode: "edit", newsId: id };
  }

  for (const prefix of [
    "dashboard/cultural/news/detail/",
    "dashboard/news/detail/",
    "news/detail/",
  ]) {
    if (clean.startsWith(prefix)) {
      const newsId = decodeURIComponent(clean.slice(prefix.length));
      if (newsId) return { type: "news", mode: "detail", newsId };
    }
  }

  if (
    clean === "dashboard/cultural/news/detail" ||
    clean === "dashboard/news/detail" ||
    clean === "news/detail"
  ) {
    const id = params.get("id");
    if (id) return { type: "news", mode: "detail", newsId: id };
  }

  // 2. Event Routes
  if (
    clean === "dashboard/cultural/events/new" ||
    clean === "dashboard/events/new" ||
    clean === "schedule/new"
  ) {
    return { type: "event", mode: "create" };
  }

  for (const prefix of [
    "dashboard/cultural/events/edit/",
    "dashboard/events/edit/",
    "schedule/edit/",
  ]) {
    if (clean.startsWith(prefix)) {
      const eventId = decodeURIComponent(clean.slice(prefix.length));
      if (eventId) return { type: "event", mode: "edit", eventId };
    }
  }

  if (
    clean === "dashboard/cultural/events/edit" ||
    clean === "dashboard/events/edit" ||
    clean === "schedule/edit"
  ) {
    const id = params.get("id");
    if (id) return { type: "event", mode: "edit", eventId: id };
  }

  for (const prefix of [
    "dashboard/cultural/events/detail/",
    "dashboard/events/detail/",
    "schedule/detail/",
  ]) {
    if (clean.startsWith(prefix)) {
      const eventId = decodeURIComponent(clean.slice(prefix.length));
      if (eventId) return { type: "event", mode: "detail", eventId };
    }
  }

  if (
    clean === "dashboard/cultural/events/detail" ||
    clean === "dashboard/events/detail" ||
    clean === "schedule/detail"
  ) {
    const id = params.get("id");
    if (id) return { type: "event", mode: "detail", eventId: id };
  }

  return null;
}

/**
 * Phân giải Route ID (LandingRoute) từ URL pathname thực tế
 */
export function getRouteFromPath(pathname: string): LandingRoute {
  if (!pathname) return "all";
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "") return "all";

  const matched = APP_ROUTES.find(
    r => r.path === clean || clean === r.path || clean.startsWith(`${r.path}/`)
  );
  return matched ? matched.id : "all";
}

/**
 * Lấy URL pathname thực tế từ Route ID
 */
export function getPathFromRoute(id: LandingRoute | string): string {
  if (id === "all" || id === "") return ROUTES.HOME;
  const matched = APP_ROUTES.find(r => r.id === id);
  return matched ? matched.path : (id.startsWith("/") ? id : `/${id}`);
}

const NAVIGATE_EVENT = "app:navigate";

/**
 * Điều hướng SPA bằng HTML5 History API (pushState / replaceState),
 * loại bỏ hoàn toàn hash (#) và phát sự kiện đồng bộ toàn ứng dụng.
 */
export function navigate(
  to: string,
  options?: { replace?: boolean; scrollToTop?: boolean }
) {
  if (typeof window === "undefined") return;

  const targetPath = to.startsWith("/") ? to : `/${to}`;

  // Tránh pushState trùng URL hiện tại (bao gồm query params)
  const currentUrl = window.location.pathname + window.location.search;
  if (currentUrl !== targetPath) {
    if (options?.replace) {
      window.history.replaceState({}, "", targetPath);
    } else {
      window.history.pushState({}, "", targetPath);
    }
  }

  // Xóa hash dư thừa nếu có
  if (window.location.hash) {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }

  if (options?.scrollToTop !== false) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.dispatchEvent(
    new CustomEvent(NAVIGATE_EVENT, { detail: { path: targetPath } })
  );
}

/**
 * Hook trả về pathname hiện tại của trình duyệt và lắng nghe popstate + navigate
 */
export function useCurrentPath(): string {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window === "undefined") return "/";
    return window.location.pathname || "/";
  });

  useEffect(() => {
    const handleUpdate = () => {
      setPathname(window.location.pathname || "/");
    };

    window.addEventListener("popstate", handleUpdate);
    window.addEventListener(NAVIGATE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener("popstate", handleUpdate);
      window.removeEventListener(NAVIGATE_EVENT, handleUpdate);
    };
  }, []);

  return pathname;
}

/**
 * Hook trả về pathname + search hiện tại của trình duyệt để đọc query/route params
 */
export function useCurrentLocation(): { pathname: string; search: string } {
  const [loc, setLoc] = useState<{ pathname: string; search: string }>(() => {
    if (typeof window === "undefined") return { pathname: "/", search: "" };
    return {
      pathname: window.location.pathname || "/",
      search: window.location.search || "",
    };
  });

  useEffect(() => {
    const handleUpdate = () => {
      setLoc({
        pathname: window.location.pathname || "/",
        search: window.location.search || "",
      });
    };

    window.addEventListener("popstate", handleUpdate);
    window.addEventListener(NAVIGATE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener("popstate", handleUpdate);
      window.removeEventListener(NAVIGATE_EVENT, handleUpdate);
    };
  }, []);

  return loc;
}

/**
 * Hook trả về thông tin Route hiện tại và hàm điều hướng
 */
export function useCurrentRoute() {
  const pathname = useCurrentPath();
  const route = getRouteFromPath(pathname);
  return {
    route,
    pathname,
    navigate
  };
}

/**
 * Component Link chuẩn SEO & Accessibility, điều hướng Client-side mượt mà,
 * không load lại trang, không dùng hash (#).
 */
export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  children: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace = false, onClick, className = "", children, ...rest }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Cho phép mở tab mới / cửa sổ mới với các phím bổ trợ thông thường
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      e.preventDefault();
      onClick?.(e);
      navigate(to, { replace });
    };

    return (
      <a
        ref={ref}
        href={to}
        onClick={handleClick}
        className={className}
        {...rest}
      >
        {children}
      </a>
    );
  }
);
Link.displayName = "Link";

/**
 * Component NavLink hỗ trợ tự động kích hoạt activeClassName khi đang ở route tương ứng
 */
export interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  exact?: boolean;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  (
    {
      to,
      activeClassName = "",
      className = "",
      exact = true,
      children,
      ...rest
    },
    ref
  ) => {
    const currentPath = useCurrentPath();
    const isActive = exact ? currentPath === to : currentPath.startsWith(to);
    const resolvedClass = `${className} ${isActive ? activeClassName : ""}`.trim();

    return (
      <Link ref={ref} to={to} className={resolvedClass} {...rest}>
        {children}
      </Link>
    );
  }
);
NavLink.displayName = "NavLink";
