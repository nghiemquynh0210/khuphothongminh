import React, { useEffect, useState } from "react";

/**
 * Định nghĩa các hằng số Route tập trung của toàn bộ ứng dụng.
 * Hỗ trợ mở rộng link: /dashboard/("sidebar content") cho toàn bộ phân hệ cán bộ.
 */
export const ROUTES = {
  HOME: "/",
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
  DASHBOARD_HOUSEHOLDS: "/dashboard/households",
  DASHBOARD_HOUSEHOLDS_NEW: "/dashboard/households/new",
  DASHBOARD_ENTERPRISES: "/dashboard/enterprises",
  DASHBOARD_ENTERPRISES_NEW: "/dashboard/enterprises/new",
  DASHBOARD_BUSINESSES: "/dashboard/businesses",
  DASHBOARD_BUSINESSES_NEW: "/dashboard/businesses/new",
  DASHBOARD_GIS: "/dashboard/gis",
  DASHBOARD_TASKS: "/dashboard/tasks",
  DASHBOARD_AI: "/dashboard/ai",
  DASHBOARD_REPORTS: "/dashboard/reports",
  DASHBOARD_PARTY: "/dashboard/party",
  DASHBOARD_WELFARE: "/dashboard/welfare",
  DASHBOARD_CULTURAL: "/dashboard/cultural",
  DASHBOARD_FINANCE: "/dashboard/finance",
  DASHBOARD_PLAN: "/dashboard/plan",
  DASHBOARD_SETTINGS: "/dashboard/settings",
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

export type LandingRoute =
  | "all"
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

export type ResidentsSubRoute =
  | { mode: "create"; isForeigner: boolean }
  | { mode: "edit"; residentId: string }
  | { mode: "detail"; residentId: string }
  | null;

/**
 * Tạo đường dẫn trang Thêm mới cư dân (hỗ trợ chế độ Người nước ngoài)
 */
export function getResidentCreatePath(isForeigner = false): string {
  return isForeigner ? `${ROUTES.DASHBOARD_RESIDENTS_NEW}?type=foreigner` : ROUTES.DASHBOARD_RESIDENTS_NEW;
}

/**
 * Tạo đường dẫn trang Chi tiết hồ sơ cư dân
 */
export function getResidentDetailPath(residentId: string): string {
  return `${ROUTES.DASHBOARD_RESIDENTS}/${encodeURIComponent(residentId)}`;
}

/**
 * Tạo đường dẫn trang Cập nhật hồ sơ cư dân
 */
export function getResidentEditPath(residentId: string): string {
  return `${ROUTES.DASHBOARD_RESIDENTS}/${encodeURIComponent(residentId)}/edit`;
}

/**
 * Phân tích sub-route trong phân hệ Dân cư (/dashboard/residents/new, /dashboard/residents/:id, /dashboard/residents/:id/edit)
 */
export function parseResidentsSubRoute(pathname: string, search = ""): ResidentsSubRoute {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, "");

  if (clean === "/dashboard/residents/new" || clean === "/residents/new") {
    const params = new URLSearchParams(search);
    return {
      mode: "create",
      isForeigner: params.get("type") === "foreigner"
    };
  }

  const editMatch = clean.match(/^\/(?:dashboard\/)?residents\/([^/]+)\/edit$/);
  if (editMatch && editMatch[1]) {
    try {
      return {
        mode: "edit",
        residentId: decodeURIComponent(editMatch[1])
      };
    } catch {
      return {
        mode: "edit",
        residentId: editMatch[1]
      };
    }
  }

  const detailMatch = clean.match(/^\/(?:dashboard\/)?residents\/([^/]+)$/);
  if (detailMatch && detailMatch[1] && detailMatch[1] !== "new") {
    try {
      return {
        mode: "detail",
        residentId: decodeURIComponent(detailMatch[1])
      };
    } catch {
      return {
        mode: "detail",
        residentId: detailMatch[1]
      };
    }
  }

  return null;
}

export type HouseholdsSubRoute =
  | { mode: "create" }
  | { mode: "detail"; householdId: string }
  | { mode: "edit"; householdId: string }
  | { mode: "add-member"; householdId: string }
  | { mode: "tree"; householdId: string }
  | null;

/**
 * Tạo đường dẫn trang Lập sổ hộ khẩu mới
 */
export function getHouseholdCreatePath(): string {
  return ROUTES.DASHBOARD_HOUSEHOLDS_NEW;
}

/**
 * Tạo đường dẫn trang Chi tiết sổ hộ khẩu
 */
export function getHouseholdDetailPath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS}/${encodeURIComponent(householdId)}`;
}

/**
 * Tạo đường dẫn trang Chỉnh sửa sổ hộ khẩu
 */
export function getHouseholdEditPath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS}/${encodeURIComponent(householdId)}/edit`;
}

/**
 * Tạo đường dẫn trang Thêm nhân khẩu vào sổ hộ khẩu
 */
export function getHouseholdAddMemberPath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS}/${encodeURIComponent(householdId)}/members/new`;
}

/**
 * Tạo đường dẫn trang Sơ đồ cây phả hệ hộ tịch
 */
export function getHouseholdTreePath(householdId: string): string {
  return `${ROUTES.DASHBOARD_HOUSEHOLDS}/${encodeURIComponent(householdId)}/tree`;
}

function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Phân tích sub-route trong phân hệ Hộ khẩu:
 * /dashboard/households/new, /dashboard/households/:id, /dashboard/households/:id/edit,
 * /dashboard/households/:id/members/new, /dashboard/households/:id/tree
 */
export function parseHouseholdsSubRoute(pathname: string): HouseholdsSubRoute {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, "");

  if (clean === "/dashboard/households/new" || clean === "/households/new") {
    return { mode: "create" };
  }

  const editMatch = clean.match(/^\/(?:dashboard\/)?households\/([^/]+)\/edit$/);
  if (editMatch && editMatch[1]) {
    return { mode: "edit", householdId: safeDecodeSegment(editMatch[1]) };
  }

  const addMemberMatch = clean.match(/^\/(?:dashboard\/)?households\/([^/]+)\/members\/new$/);
  if (addMemberMatch && addMemberMatch[1]) {
    return { mode: "add-member", householdId: safeDecodeSegment(addMemberMatch[1]) };
  }

  const treeMatch = clean.match(/^\/(?:dashboard\/)?households\/([^/]+)\/tree$/);
  if (treeMatch && treeMatch[1]) {
    return { mode: "tree", householdId: safeDecodeSegment(treeMatch[1]) };
  }

  const detailMatch = clean.match(/^\/(?:dashboard\/)?households\/([^/]+)$/);
  if (detailMatch && detailMatch[1] && detailMatch[1] !== "new") {
    return { mode: "detail", householdId: safeDecodeSegment(detailMatch[1]) };
  }

  return null;
}

export type EnterprisesSubRoute =
  | { mode: "create" }
  | { mode: "detail"; enterpriseId: string }
  | { mode: "edit"; enterpriseId: string }
  | null;

/**
 * Tạo đường dẫn trang Đăng ký Doanh nghiệp mới
 */
export function getEnterpriseCreatePath(): string {
  return ROUTES.DASHBOARD_ENTERPRISES_NEW;
}

/**
 * Tạo đường dẫn trang Chi tiết Doanh nghiệp
 */
export function getEnterpriseDetailPath(enterpriseId: string): string {
  return `${ROUTES.DASHBOARD_ENTERPRISES}/${encodeURIComponent(enterpriseId)}`;
}

/**
 * Tạo đường dẫn trang Chỉnh sửa hồ sơ Doanh nghiệp
 */
export function getEnterpriseEditPath(enterpriseId: string): string {
  return `${ROUTES.DASHBOARD_ENTERPRISES}/${encodeURIComponent(enterpriseId)}/edit`;
}

/**
 * Phân tích sub-route trong phân hệ Doanh nghiệp:
 * /dashboard/enterprises/new, /dashboard/enterprises/:id, /dashboard/enterprises/:id/edit
 */
export function parseEnterprisesSubRoute(pathname: string): EnterprisesSubRoute {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, "");

  if (clean === "/dashboard/enterprises/new" || clean === "/enterprises/new") {
    return { mode: "create" };
  }

  const editMatch = clean.match(/^\/(?:dashboard\/)?enterprises\/([^/]+)\/edit$/);
  if (editMatch && editMatch[1]) {
    return { mode: "edit", enterpriseId: safeDecodeSegment(editMatch[1]) };
  }

  const detailMatch = clean.match(/^\/(?:dashboard\/)?enterprises\/([^/]+)$/);
  if (detailMatch && detailMatch[1] && detailMatch[1] !== "new") {
    return { mode: "detail", enterpriseId: safeDecodeSegment(detailMatch[1]) };
  }

  return null;
}

export type BusinessesSubRoute =
  | { mode: "create" }
  | { mode: "detail"; businessId: string }
  | { mode: "edit"; businessId: string }
  | null;

/**
 * Tạo đường dẫn trang Đăng ký Cơ sở Kinh doanh mới
 */
export function getBusinessCreatePath(): string {
  return ROUTES.DASHBOARD_BUSINESSES_NEW;
}

/**
 * Tạo đường dẫn trang Chi tiết Cơ sở Kinh doanh
 */
export function getBusinessDetailPath(businessId: string): string {
  return `${ROUTES.DASHBOARD_BUSINESSES}/${encodeURIComponent(businessId)}`;
}

/**
 * Tạo đường dẫn trang Chỉnh sửa hồ sơ Cơ sở Kinh doanh
 */
export function getBusinessEditPath(businessId: string): string {
  return `${ROUTES.DASHBOARD_BUSINESSES}/${encodeURIComponent(businessId)}/edit`;
}

/**
 * Phân tích sub-route trong phân hệ Cơ sở Kinh doanh:
 * /dashboard/businesses/new, /dashboard/businesses/:id, /dashboard/businesses/:id/edit
 */
export function parseBusinessesSubRoute(pathname: string): BusinessesSubRoute {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, "");

  if (clean === "/dashboard/businesses/new" || clean === "/businesses/new") {
    return { mode: "create" };
  }

  const editMatch = clean.match(/^\/(?:dashboard\/)?businesses\/([^/]+)\/edit$/);
  if (editMatch && editMatch[1]) {
    return { mode: "edit", businessId: safeDecodeSegment(editMatch[1]) };
  }

  const detailMatch = clean.match(/^\/(?:dashboard\/)?businesses\/([^/]+)$/);
  if (detailMatch && detailMatch[1] && detailMatch[1] !== "new") {
    return { mode: "detail", businessId: safeDecodeSegment(detailMatch[1]) };
  }

  return null;
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

  // Hỗ trợ tương thích ngược nếu người dùng gõ trực tiếp /residents hoặc /residents/... hoặc /gis
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

  const firstSeg = clean.split("/")[0];
  if (validTabs.includes(clean)) {
    return clean;
  }
  if (firstSeg === "residents" && parseResidentsSubRoute(`/${clean}`)) {
    return "residents";
  }
  if (firstSeg === "households" && parseHouseholdsSubRoute(`/${clean}`)) {
    return "households";
  }
  if (firstSeg === "enterprises" && parseEnterprisesSubRoute(`/${clean}`)) {
    return "enterprises";
  }
  if (firstSeg === "businesses" && parseBusinessesSubRoute(`/${clean}`)) {
    return "businesses";
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
  const currentFull = window.location.pathname + window.location.search;

  // Tránh pushState trùng URL + query hiện tại
  if (currentFull !== targetPath) {
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
 * Hook trả về { pathname, search } hiện tại của trình duyệt và lắng nghe popstate + navigate
 */
export function useCurrentLocation(): { pathname: string; search: string } {
  const [loc, setLoc] = useState<{ pathname: string; search: string }>(() => {
    if (typeof window === "undefined") return { pathname: "/", search: "" };
    return {
      pathname: window.location.pathname || "/",
      search: window.location.search || ""
    };
  });

  useEffect(() => {
    const handleUpdate = () => {
      setLoc({
        pathname: window.location.pathname || "/",
        search: window.location.search || ""
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
 * Hook trả về pathname hiện tại của trình duyệt và lắng nghe popstate + navigate
 */
export function useCurrentPath(): string {
  return useCurrentLocation().pathname;
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
