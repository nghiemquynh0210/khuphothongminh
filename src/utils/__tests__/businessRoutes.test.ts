import { describe, expect, it } from "vitest";
import {
  ROUTES,
  getBusinessCreatePath,
  getBusinessDetailPath,
  getBusinessEditPath,
  getTabFromDashboardPath,
  parseBusinessFormRoute,
} from "../../routes";

describe("businessRoutes", () => {
  it("resolves dashboard tab for all business subpaths", () => {
    expect(getTabFromDashboardPath(ROUTES.DASHBOARD_BUSINESSES)).toBe(
      "businesses"
    );
    expect(getTabFromDashboardPath(getBusinessCreatePath())).toBe(
      "businesses"
    );
    expect(getTabFromDashboardPath(getBusinessEditPath("B001"))).toBe(
      "businesses"
    );
    expect(getTabFromDashboardPath(getBusinessDetailPath("B001"))).toBe(
      "businesses"
    );
  });

  it("builds parameterized business paths cleanly", () => {
    expect(getBusinessCreatePath()).toBe("/dashboard/businesses/new");
    expect(getBusinessEditPath("B001")).toBe(
      "/dashboard/businesses/edit/B001"
    );
    expect(getBusinessDetailPath("HKD/01")).toBe(
      "/dashboard/businesses/detail/HKD%2F01"
    );
  });

  it("parses create, edit, and detail routes from path params and query params", () => {
    expect(parseBusinessFormRoute("/dashboard/businesses/new")).toEqual({
      mode: "create",
    });
    expect(parseBusinessFormRoute("/businesses/new")).toEqual({
      mode: "create",
    });

    expect(
      parseBusinessFormRoute("/dashboard/businesses/edit/B002")
    ).toEqual({
      mode: "edit",
      businessId: "B002",
    });
    expect(
      parseBusinessFormRoute("/dashboard/businesses/edit", "?id=B003")
    ).toEqual({
      mode: "edit",
      businessId: "B003",
    });

    expect(
      parseBusinessFormRoute("/dashboard/businesses/detail/B004")
    ).toEqual({
      mode: "detail",
      businessId: "B004",
    });
    expect(
      parseBusinessFormRoute("/dashboard/businesses/detail", "?id=B005")
    ).toEqual({
      mode: "detail",
      businessId: "B005",
    });
    expect(
      parseBusinessFormRoute("/dashboard/businesses/detail/HKD%2F09")
    ).toEqual({
      mode: "detail",
      businessId: "HKD/09",
    });

    expect(parseBusinessFormRoute("/dashboard/businesses")).toBeNull();
  });
});

