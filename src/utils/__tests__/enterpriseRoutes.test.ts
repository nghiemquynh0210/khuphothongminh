import { describe, expect, it } from "vitest";
import {
  ROUTES,
  getEnterpriseCreatePath,
  getEnterpriseDetailPath,
  getEnterpriseEditPath,
  getTabFromDashboardPath,
  parseEnterpriseFormRoute,
} from "../../routes";

describe("enterpriseRoutes", () => {
  it("resolves dashboard tab for all enterprise subpaths", () => {
    expect(getTabFromDashboardPath(ROUTES.DASHBOARD_ENTERPRISES)).toBe(
      "enterprises"
    );
    expect(getTabFromDashboardPath(getEnterpriseCreatePath())).toBe(
      "enterprises"
    );
    expect(getTabFromDashboardPath(getEnterpriseEditPath("B001"))).toBe(
      "enterprises"
    );
    expect(getTabFromDashboardPath(getEnterpriseDetailPath("B001"))).toBe(
      "enterprises"
    );
  });

  it("builds parameterized enterprise paths cleanly", () => {
    expect(getEnterpriseCreatePath()).toBe("/dashboard/enterprises/new");
    expect(getEnterpriseEditPath("B001")).toBe(
      "/dashboard/enterprises/edit/B001"
    );
    expect(getEnterpriseDetailPath("DN/01")).toBe(
      "/dashboard/enterprises/detail/DN%2F01"
    );
  });

  it("parses create, edit, and detail routes from path params and query params", () => {
    expect(parseEnterpriseFormRoute("/dashboard/enterprises/new")).toEqual({
      mode: "create",
    });
    expect(parseEnterpriseFormRoute("/enterprises/new")).toEqual({
      mode: "create",
    });

    expect(
      parseEnterpriseFormRoute("/dashboard/enterprises/edit/B002")
    ).toEqual({
      mode: "edit",
      enterpriseId: "B002",
    });
    expect(
      parseEnterpriseFormRoute("/dashboard/enterprises/edit", "?id=B003")
    ).toEqual({
      mode: "edit",
      enterpriseId: "B003",
    });

    expect(
      parseEnterpriseFormRoute("/dashboard/enterprises/detail/B004")
    ).toEqual({
      mode: "detail",
      enterpriseId: "B004",
    });
    expect(
      parseEnterpriseFormRoute("/dashboard/enterprises/detail", "?id=B005")
    ).toEqual({
      mode: "detail",
      enterpriseId: "B005",
    });
    expect(
      parseEnterpriseFormRoute("/dashboard/enterprises/detail/DN%2F09")
    ).toEqual({
      mode: "detail",
      enterpriseId: "DN/09",
    });

    expect(parseEnterpriseFormRoute("/dashboard/enterprises")).toBeNull();
  });
});

