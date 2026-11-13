import { describe, expect, it } from "vitest";
import {
  ROUTES,
  getPartyAssociationCreatePath,
  getPartyAssociationEditPath,
  getPartyMemberCreatePath,
  getPartyMemberDetailPath,
  getPartyMemberEditPath,
  getTabFromDashboardPath,
  parsePartyRoute,
} from "../../routes";

describe("partyRoutes", () => {
  it("resolves dashboard tab for all party subpaths", () => {
    expect(getTabFromDashboardPath(ROUTES.DASHBOARD_PARTY)).toBe("party");
    expect(getTabFromDashboardPath(getPartyAssociationCreatePath())).toBe("party");
    expect(getTabFromDashboardPath(getPartyAssociationEditPath("ASC001"))).toBe("party");
    expect(getTabFromDashboardPath(getPartyMemberCreatePath("ASC001"))).toBe("party");
    expect(getTabFromDashboardPath(getPartyMemberDetailPath("079085000123"))).toBe("party");
    expect(getTabFromDashboardPath(getPartyMemberEditPath("079085000123"))).toBe("party");
  });

  it("builds parameterized party association paths cleanly", () => {
    expect(getPartyAssociationCreatePath()).toBe("/dashboard/party/association/new");
    expect(getPartyAssociationEditPath("ASC001")).toBe(
      "/dashboard/party/association/edit/ASC001"
    );
    expect(getPartyAssociationEditPath("ASC/01")).toBe(
      "/dashboard/party/association/edit/ASC%2F01"
    );
  });

  it("builds parameterized party member paths cleanly", () => {
    expect(getPartyMemberCreatePath()).toBe("/dashboard/party/member/new");
    expect(getPartyMemberCreatePath("ASC001")).toBe(
      "/dashboard/party/member/new?assocId=ASC001"
    );
    expect(getPartyMemberDetailPath("079085000123")).toBe(
      "/dashboard/party/member/detail/079085000123"
    );
    expect(getPartyMemberDetailPath("079085000123", "ASC001")).toBe(
      "/dashboard/party/member/detail/079085000123?assocId=ASC001"
    );
    expect(getPartyMemberEditPath("079085000123")).toBe(
      "/dashboard/party/member/edit/079085000123"
    );
    expect(getPartyMemberEditPath("079085000123", "ASC001")).toBe(
      "/dashboard/party/member/edit/079085000123?assocId=ASC001"
    );
  });

  it("parses create and edit association routes from path params and query params", () => {
    expect(parsePartyRoute("/dashboard/party/association/new")).toEqual({
      mode: "create_assoc",
    });
    expect(parsePartyRoute("/party/association/new")).toEqual({
      mode: "create_assoc",
    });

    expect(
      parsePartyRoute("/dashboard/party/association/edit/ASC002")
    ).toEqual({
      mode: "edit_assoc",
      assocId: "ASC002",
    });

    expect(
      parsePartyRoute("/dashboard/party/association/edit", "?id=ASC003")
    ).toEqual({
      mode: "edit_assoc",
      assocId: "ASC003",
    });

    expect(parsePartyRoute("/dashboard/party")).toBeNull();
  });

  it("parses party member routes from path params and query params", () => {
    expect(parsePartyRoute("/dashboard/party/member/new")).toEqual({
      mode: "member_new",
      assocId: undefined,
    });
    expect(parsePartyRoute("/dashboard/party/member/new", "?assocId=ASC001")).toEqual({
      mode: "member_new",
      assocId: "ASC001",
    });

    expect(parsePartyRoute("/dashboard/party/member/detail/079085000123")).toEqual({
      mode: "member_detail",
      cccd: "079085000123",
      assocId: undefined,
    });
    expect(
      parsePartyRoute("/dashboard/party/member/detail/079085000123", "?assocId=ASC001")
    ).toEqual({
      mode: "member_detail",
      cccd: "079085000123",
      assocId: "ASC001",
    });

    expect(parsePartyRoute("/dashboard/party/member/edit/079085000123")).toEqual({
      mode: "member_edit",
      cccd: "079085000123",
      assocId: undefined,
    });
    expect(
      parsePartyRoute("/dashboard/party/member/edit/079085000123", "?assocId=ASC002")
    ).toEqual({
      mode: "member_edit",
      cccd: "079085000123",
      assocId: "ASC002",
    });
  });
});

