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

import { filterStayingResidents } from "../../page/BusinessDetailPage";
import type { Resident } from "../../types";

describe("filterStayingResidents quick search & expiry filter", () => {
  const sampleResidents: Resident[] = [
    {
      id: "R1",
      fullName: "Nguyễn Quốc Khải",
      gender: "Nam",
      birthDate: "12/05/1998",
      cccd: "091200006098",
      phone: "0913137155",
      status: "Tạm trú",
      occupation: "Công nhân",
      address: "17/A3 Khu phố 3",
      permanentAddress: "Xã Đông Thái, Tỉnh An Giang",
      householdId: "Tạm trú",
      relationToOwner: "Người thuê trọ",
      temporaryExpDate: "2020-01-01",
    },
    {
      id: "R2",
      fullName: "Đặng Thị Hồng Thắm",
      gender: "Nữ",
      birthDate: "20/11/2001",
      cccd: "083301004412",
      phone: "0988776655",
      status: "Tạm trú",
      occupation: "Nhân viên",
      address: "17/A3 Khu phố 3",
      permanentAddress: "Huyện Châu Thành, Tỉnh Bến Tre",
      householdId: "Tạm trú",
      relationToOwner: "Người thuê trọ",
      temporaryExpDate: "2030-12-31",
    },
  ];

  it("matches Vietnamese names without diacritics, CCCD, phone, hometown, and birth year", () => {
    expect(filterStayingResidents(sampleResidents, "nguyen quoc khai")).toHaveLength(1);
    expect(filterStayingResidents(sampleResidents, "dang thi")).toHaveLength(1);
    expect(filterStayingResidents(sampleResidents, "006098")).toHaveLength(1);
    expect(filterStayingResidents(sampleResidents, "098877")).toHaveLength(1);
    expect(filterStayingResidents(sampleResidents, "ben tre")).toHaveLength(1);
    expect(filterStayingResidents(sampleResidents, "1998")).toHaveLength(1);
    expect(filterStayingResidents(sampleResidents, "khong ton tai")).toHaveLength(0);
  });

  it("filters accurately by temporary residence expiry status", () => {
    const expiredOnly = filterStayingResidents(sampleResidents, "", "expired");
    expect(expiredOnly).toHaveLength(1);
    expect(expiredOnly[0].id).toBe("R1");
  });
});


