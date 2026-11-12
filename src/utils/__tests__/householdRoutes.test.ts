import { describe, expect, it } from "vitest";
import {
  getHouseholdAddMemberPath,
  getHouseholdCreatePath,
  getHouseholdDetailPath,
  getHouseholdEditPath,
  getTabFromDashboardPath,
  parseHouseholdFormRoute,
} from "../../routes";

describe("household form, detail & add-member route params", () => {
  it("keeps households tab active for new, edit, detail, and add-member subroutes", () => {
    expect(getTabFromDashboardPath("/dashboard/households")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/new")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/edit/H001")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/detail/H001")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/add-member/H001")).toBe("households");
  });

  it("builds create, edit, detail, and add-member URLs with encoded params", () => {
    expect(getHouseholdCreatePath()).toBe("/dashboard/households/new");
    expect(getHouseholdEditPath("H-123/45")).toBe("/dashboard/households/edit/H-123%2F45");
    expect(getHouseholdDetailPath("H-123/45")).toBe("/dashboard/households/detail/H-123%2F45");
    expect(getHouseholdAddMemberPath("H-123/45")).toBe("/dashboard/households/add-member/H-123%2F45");
  });

  it("parses create route", () => {
    expect(parseHouseholdFormRoute("/dashboard/households/new", "")).toEqual({
      mode: "create",
    });
    expect(parseHouseholdFormRoute("/households/new", "")).toEqual({
      mode: "create",
    });
    expect(parseHouseholdFormRoute("/dashboard/households", "")).toBeNull();
  });

  it("parses edit route from path param and query param", () => {
    expect(parseHouseholdFormRoute("/dashboard/households/edit/H001", "")).toEqual({
      mode: "edit",
      householdId: "H001",
    });
    expect(parseHouseholdFormRoute("/dashboard/households/edit/H-123%2F45", "")).toEqual({
      mode: "edit",
      householdId: "H-123/45",
    });
    expect(parseHouseholdFormRoute("/dashboard/households/edit", "?id=HK-301")).toEqual({
      mode: "edit",
      householdId: "HK-301",
    });
  });

  it("parses add-member route from path param and query param", () => {
    expect(parseHouseholdFormRoute("/dashboard/households/add-member/H001", "")).toEqual({
      mode: "add-member",
      householdId: "H001",
    });
    expect(parseHouseholdFormRoute("/dashboard/households/add-member/H-123%2F45", "")).toEqual({
      mode: "add-member",
      householdId: "H-123/45",
    });
    expect(parseHouseholdFormRoute("/dashboard/households/add-member", "?id=HK-301")).toEqual({
      mode: "add-member",
      householdId: "HK-301",
    });
  });

  it("parses detail route from path param and query param", () => {
    expect(parseHouseholdFormRoute("/dashboard/households/detail/H001", "")).toEqual({
      mode: "detail",
      householdId: "H001",
    });
    expect(parseHouseholdFormRoute("/dashboard/households/detail/H-123%2F45", "")).toEqual({
      mode: "detail",
      householdId: "H-123/45",
    });
    expect(parseHouseholdFormRoute("/dashboard/households/detail", "?id=HK-301")).toEqual({
      mode: "detail",
      householdId: "HK-301",
    });
  });
});

