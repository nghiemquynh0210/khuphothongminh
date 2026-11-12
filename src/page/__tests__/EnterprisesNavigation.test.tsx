import React, { useState } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EnterprisesPage from "../EnterprisesPage";
import { Business, Household, Resident } from "../../types";
import {
  ROUTES,
  getEnterpriseCreatePath,
  getEnterpriseDetailPath,
  getEnterpriseEditPath,
  getTabFromDashboardPath,
  parseEnterprisesSubRoute
} from "../../routes";

const sampleBusinesses: Business[] = [
  {
    id: "E001",
    internalCode: "DN-KP3-001",
    name: "Công ty TNHH Giải pháp Công nghệ An Phú Tech",
    taxCode: "0316123456",
    businessType: "Công ty TNHH",
    enterpriseScale: "Vừa (20 - 50 LĐ)",
    type: "Phần mềm & CNTT",
    owner: "Trần Minh Quang",
    legalRepresentative: "Trần Minh Quang",
    legalRepPhone: "0909123456",
    phone: "0909123456",
    address: "42 Lương Định Của, Phường An Phú",
    licenseNumber: "GP-DN-001/AP",
    status: "Đang hoạt động",
    employeeCount: 32,
    safetyCertified: true,
    linkedHouseholdCode: "HK-301",
    coordinates: "10.793500, 106.744500",
    supportNeeds: ["Hướng dẫn PCCC & ANTT"]
  },
  {
    id: "E002",
    internalCode: "DN-KP3-002",
    name: "Công ty Cổ phần Giáo dục Mầm non Sao Mai",
    taxCode: "0317987654",
    businessType: "Công ty Cổ phần",
    enterpriseScale: "Nhỏ (5 - 20 LĐ)",
    type: "Giáo dục mầm non",
    owner: "Lê Thị Thu Hà",
    legalRepresentative: "Lê Thị Thu Hà",
    legalRepPhone: "0918765432",
    phone: "0918765432",
    address: "18/2 Lương Định Của, Phường An Phú",
    licenseNumber: "GP-DN-002/AP",
    status: "Đang hoạt động",
    employeeCount: 15,
    safetyCertified: true
  }
];

const sampleHouseholds: Household[] = [
  {
    id: "H001",
    code: "HK-301",
    ownerName: "Nguyễn Văn Hùng",
    address: "42 Lương Định Của, Phường An Phú",
    memberCount: 2,
    type: "Thường trú",
    members: []
  }
];

const sampleResidents: Resident[] = [];

function EnterprisesHarness({
  initialPath = ROUTES.DASHBOARD_ENTERPRISES
}: {
  initialPath?: string;
}) {
  const [businesses, setBusinesses] = useState<Business[]>(sampleBusinesses);

  React.useLayoutEffect(() => {
    window.history.replaceState({}, "", initialPath);
  }, [initialPath]);

  const handleToggleCertification = (id: string) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === id ? { ...b, safetyCertified: !b.safetyCertified } : b
      )
    );
  };

  const handleUpdateStatus = (id: string, status: Business["status"]) => {
    setBusinesses(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
  };

  return (
    <EnterprisesPage
      businesses={businesses}
      residents={sampleResidents}
      households={sampleHouseholds}
      onToggleCertification={handleToggleCertification}
      onUpdateStatus={handleUpdateStatus}
      onUpdateBusinesses={setBusinesses}
      onNavigateToGis={vi.fn()}
    />
  );
}

describe("Enterprise sub-route helpers", () => {
  it("parses list, create, detail, and edit routes cleanly", () => {
    expect(parseEnterprisesSubRoute("/dashboard/enterprises")).toBeNull();
    expect(parseEnterprisesSubRoute("/dashboard/enterprises/new")).toEqual({
      mode: "create"
    });
    expect(parseEnterprisesSubRoute("/dashboard/enterprises/E001")).toEqual({
      mode: "detail",
      enterpriseId: "E001"
    });
    expect(parseEnterprisesSubRoute("/dashboard/enterprises/E001/edit")).toEqual({
      mode: "edit",
      enterpriseId: "E001"
    });

    expect(getTabFromDashboardPath("/dashboard/enterprises/new")).toBe("enterprises");
    expect(getTabFromDashboardPath("/dashboard/enterprises/E001")).toBe("enterprises");
    expect(getTabFromDashboardPath("/dashboard/enterprises/E001/edit")).toBe("enterprises");
    expect(getTabFromDashboardPath("/enterprises/E001/edit")).toBe("enterprises");

    expect(getEnterpriseCreatePath()).toBe("/dashboard/enterprises/new");
    expect(getEnterpriseDetailPath("E001")).toBe("/dashboard/enterprises/E001");
    expect(getEnterpriseEditPath("E001")).toBe("/dashboard/enterprises/E001/edit");
  });
});

describe("EnterprisesPage navigation workflows (replaces dialogs)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.history.replaceState({}, "", ROUTES.DASHBOARD_ENTERPRISES);
  });

  it("navigates to EnterpriseDetailPage on card click, switches tabs, records change log, and edits via EnterpriseFormPage", async () => {
    render(<EnterprisesHarness />);

    const card = document.getElementById("enterprise-card-E001");
    expect(card).not.toBeNull();
    if (card) fireEvent.click(card);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/enterprises/E001");
    });

    expect(document.getElementById("enterprise-detail-page")).toBeInTheDocument();
    expect(document.getElementById("detail-enterprise-name")).toHaveTextContent(
      "Công ty TNHH Giải pháp Công nghệ An Phú Tech"
    );

    // Switch to premises tab
    const premisesTab = document.getElementById("enterprise-tab-btn-premises");
    if (premisesTab) fireEvent.click(premisesTab);
    expect(document.getElementById("enterprise-tab-panel-premises")).toBeInTheDocument();
    expect(screen.getByText(/Liên kết Hộ dân: Nguyễn Văn Hùng/i)).toBeInTheDocument();

    // Switch to history tab and add a change log
    const historyTab = document.getElementById("enterprise-tab-btn-history");
    if (historyTab) fireEvent.click(historyTab);
    const addLogBtn = document.getElementById("btn-enterprise-add-changelog");
    if (addLogBtn) fireEvent.click(addLogBtn);
    fireEvent.change(document.getElementById("changelog-desc") as HTMLTextAreaElement, {
      target: { value: "Mở rộng văn phòng tầng 2" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Lưu biến động/i }));
    expect(await screen.findByText("Mở rộng văn phòng tầng 2")).toBeInTheDocument();

    // Navigate to Edit page
    const editBtn = document.getElementById("btn-enterprise-detail-edit");
    expect(editBtn).not.toBeNull();
    if (editBtn) fireEvent.click(editBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/enterprises/E001/edit");
    });
    expect(document.getElementById("enterprise-form-page")).toBeInTheDocument();

    const nameInput = document.getElementById("enterprise-field-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Công ty TNHH Giải pháp Công nghệ An Phú Tech");
    fireEvent.change(nameInput, {
      target: { value: "Công ty TNHH Công nghệ An Phú Tech Updated" }
    });

    const submitBtn = document.getElementById("btn-submit-enterprise-form");
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/enterprises/E001");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      'Đã cập nhật hồ sơ doanh nghiệp "Công ty TNHH Công nghệ An Phú Tech Updated" thành công!'
    );
    expect(document.getElementById("detail-enterprise-name")).toHaveTextContent(
      "Công ty TNHH Công nghệ An Phú Tech Updated"
    );
  });

  it("supports deleting an enterprise from EnterpriseDetailPage and returning to list", async () => {
    render(<EnterprisesHarness />);

    const card2 = document.getElementById("enterprise-card-E002");
    expect(card2).not.toBeNull();
    if (card2) fireEvent.click(card2);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/enterprises/E002");
    });

    const deleteBtn = document.getElementById("btn-enterprise-detail-delete");
    if (deleteBtn) fireEvent.click(deleteBtn);

    const confirmBtn = document.getElementById("btn-confirm-delete-enterprise");
    expect(confirmBtn).not.toBeNull();
    if (confirmBtn) fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_ENTERPRISES);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      'Đã xóa hồ sơ doanh nghiệp "Công ty Cổ phần Giáo dục Mầm non Sao Mai" thành công.'
    );
    expect(
      screen.queryByText("Công ty Cổ phần Giáo dục Mầm non Sao Mai")
    ).not.toBeInTheDocument();
  });

  it("navigates to EnterpriseFormPage (create) when clicking Đăng ký Doanh nghiệp Mới, validates required fields, and creates enterprise", async () => {
    render(<EnterprisesHarness />);

    const addBtn = document.getElementById("btn-add-enterprise");
    expect(addBtn).not.toBeNull();
    if (addBtn) fireEvent.click(addBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_ENTERPRISES_NEW);
    });
    expect(document.getElementById("enterprise-form-page")).toBeInTheDocument();

    // Empty submit triggers GOV.UK error summary
    const submitBtn = document.getElementById("btn-submit-enterprise-form");
    if (submitBtn) fireEvent.click(submitBtn);
    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toHaveTextContent("Vui lòng kiểm tra lại thông tin bắt buộc");

    fireEvent.change(document.getElementById("enterprise-field-name") as HTMLInputElement, {
      target: { value: "Công ty TNHH Thương mại Đông Nam" }
    });
    fireEvent.change(document.getElementById("enterprise-field-taxcode") as HTMLInputElement, {
      target: { value: "0319998887" }
    });
    fireEvent.change(document.getElementById("enterprise-field-type") as HTMLInputElement, {
      target: { value: "Thương mại điện tử" }
    });
    fireEvent.change(document.getElementById("enterprise-field-address") as HTMLInputElement, {
      target: { value: "75 Song Hành, Phường An Phú" }
    });
    fireEvent.change(document.getElementById("enterprise-field-legalrep") as HTMLInputElement, {
      target: { value: "Nguyễn Hoàng Nam" }
    });
    fireEvent.change(
      document.getElementById("enterprise-field-legalrep-phone") as HTMLInputElement,
      { target: { value: "0908111222" } }
    );

    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_ENTERPRISES);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      'Đã thêm mới hồ sơ doanh nghiệp "Công ty TNHH Thương mại Đông Nam" thành công!'
    );
    expect(
      screen.getByText("Công ty TNHH Thương mại Đông Nam")
    ).toBeInTheDocument();
  });
});

