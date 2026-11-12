import { describe, expect, it } from "vitest";
import {
  getResidentCreatePath,
  getResidentDetailPath,
  getResidentEditPath,
  getTabFromDashboardPath,
  parseResidentFormRoute,
} from "../../routes";

describe("resident form & detail route params", () => {
  it("keeps residents tab active for create, edit, and detail subroutes", () => {
    expect(getTabFromDashboardPath("/dashboard/residents")).toBe("residents");
    expect(getTabFromDashboardPath("/dashboard/residents/new")).toBe("residents");
    expect(getTabFromDashboardPath("/dashboard/residents/edit/R001")).toBe("residents");
    expect(getTabFromDashboardPath("/dashboard/residents/detail/R001")).toBe("residents");
  });

  it("builds create, edit, and detail URLs with params", () => {
    expect(getResidentCreatePath(false)).toBe("/dashboard/residents/new");
    expect(getResidentCreatePath(true)).toBe("/dashboard/residents/new?type=foreigner");
    expect(getResidentEditPath("R-123/45")).toBe("/dashboard/residents/edit/R-123%2F45");
    expect(getResidentDetailPath("R-123/45")).toBe("/dashboard/residents/detail/R-123%2F45");
  });

  it("parses create route and foreigner query param", () => {
    expect(parseResidentFormRoute("/dashboard/residents/new", "")).toEqual({
      mode: "create",
      isForeigner: false,
    });
    expect(parseResidentFormRoute("/dashboard/residents/new", "?type=foreigner")).toEqual({
      mode: "create",
      isForeigner: true,
    });
    expect(parseResidentFormRoute("/dashboard/residents/new", "?foreigner=1")).toEqual({
      mode: "create",
      isForeigner: true,
    });
  });

  it("parses edit route from path param and query param", () => {
    expect(parseResidentFormRoute("/dashboard/residents/edit/R001", "")).toEqual({
      mode: "edit",
      residentId: "R001",
    });
    expect(parseResidentFormRoute("/dashboard/residents/edit/R-123%2F45", "")).toEqual({
      mode: "edit",
      residentId: "R-123/45",
    });
    expect(parseResidentFormRoute("/dashboard/residents/edit", "?id=R002")).toEqual({
      mode: "edit",
      residentId: "R002",
    });
    expect(parseResidentFormRoute("/dashboard/residents", "")).toBeNull();
  });

  it("parses detail route from path param and query param", () => {
    expect(parseResidentFormRoute("/dashboard/residents/detail/R001", "")).toEqual({
      mode: "detail",
      residentId: "R001",
    });
    expect(parseResidentFormRoute("/dashboard/residents/detail/R-123%2F45", "")).toEqual({
      mode: "detail",
      residentId: "R-123/45",
    });
    expect(parseResidentFormRoute("/dashboard/residents/detail", "?id=R002")).toEqual({
      mode: "detail",
      residentId: "R002",
    });
  });
});

