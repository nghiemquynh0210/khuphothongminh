import { describe, expect, it } from "vitest";
import {
  ROUTES,
  getReportCreatePath,
  getReportDetailPath,
  getReportEditPath,
  getReportResolvePath,
  getTabFromDashboardPath,
  parseReportFormRoute,
} from "../../routes";

describe("reportRoutes", () => {
  it("resolves dashboard tab for all report subpaths", () => {
    expect(getTabFromDashboardPath(ROUTES.DASHBOARD_REPORTS)).toBe("reports");
    expect(getTabFromDashboardPath(getReportCreatePath())).toBe("reports");
    expect(getTabFromDashboardPath(getReportEditPath("REP101"))).toBe(
      "reports"
    );
    expect(getTabFromDashboardPath(getReportDetailPath("REP101"))).toBe(
      "reports"
    );
    expect(getTabFromDashboardPath(getReportResolvePath("REP101"))).toBe(
      "reports"
    );
  });

  it("builds parameterized report paths for dashboard and citizen reflection", () => {
    expect(getReportCreatePath()).toBe("/dashboard/reports/new");
    expect(getReportEditPath("REP101")).toBe("/dashboard/reports/edit/REP101");
    expect(getReportDetailPath("PA/01")).toBe(
      "/dashboard/reports/detail/PA%2F01"
    );
    expect(getReportResolvePath("REP101")).toBe(
      "/dashboard/reports/resolve/REP101"
    );

    expect(getReportCreatePath(ROUTES.REFLECTION)).toBe("/reflection/new");
    expect(getReportDetailPath("REP101", ROUTES.REFLECTION)).toBe(
      "/reflection/detail/REP101"
    );
    expect(getReportEditPath("REP101", ROUTES.REFLECTION)).toBe(
      "/reflection/edit/REP101"
    );
    expect(getReportResolvePath("REP101", ROUTES.REFLECTION)).toBe(
      "/reflection/resolve/REP101"
    );
  });

  it("parses create, edit, detail, and resolve routes from path params and query params", () => {
    expect(parseReportFormRoute("/dashboard/reports/new")).toEqual({
      mode: "create",
    });
    expect(parseReportFormRoute("/reports/new")).toEqual({
      mode: "create",
    });
    expect(parseReportFormRoute("/reflection/new")).toEqual({
      mode: "create",
    });

    expect(parseReportFormRoute("/dashboard/reports/edit/REP202")).toEqual({
      mode: "edit",
      reportId: "REP202",
    });
    expect(parseReportFormRoute("/dashboard/reports/edit", "?id=REP203")).toEqual({
      mode: "edit",
      reportId: "REP203",
    });

    expect(parseReportFormRoute("/dashboard/reports/resolve/REP204")).toEqual({
      mode: "resolve",
      reportId: "REP204",
    });
    expect(
      parseReportFormRoute("/dashboard/reports/resolve", "?id=REP205")
    ).toEqual({
      mode: "resolve",
      reportId: "REP205",
    });

    expect(parseReportFormRoute("/dashboard/reports/detail/REP206")).toEqual({
      mode: "detail",
      reportId: "REP206",
    });
    expect(parseReportFormRoute("/reflection/detail/PA%2F09")).toEqual({
      mode: "detail",
      reportId: "PA/09",
    });
    expect(
      parseReportFormRoute("/dashboard/reports/detail", "?id=REP207")
    ).toEqual({
      mode: "detail",
      reportId: "REP207",
    });

    expect(parseReportFormRoute("/dashboard/reports")).toBeNull();
    expect(parseReportFormRoute("/reflection")).toBeNull();
  });
});

