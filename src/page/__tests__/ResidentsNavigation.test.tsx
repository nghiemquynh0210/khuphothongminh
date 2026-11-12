import React, { useState } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResidentsPage from "../ResidentsPage";
import { Resident, Household } from "../../types";
import {
  ROUTES,
  getResidentCreatePath,
  getResidentDetailPath,
  getResidentEditPath,
  getTabFromDashboardPath,
  navigate,
  parseResidentsSubRoute
} from "../../routes";

const sampleResidents: Resident[] = [
  {
    id: "R001",
    fullName: "Nguyễn Văn Hùng",
    gender: "Nam",
    birthDate: "15/04/1968",
    cccd: "079068001234",
    phone: "0903829112",
    status: "Thường trú",
    occupation: "Bí thư chi bộ",
    address: "42/3 Lương Định Của, Phường An Phú",
    householdId: "HK-301",
    relationToOwner: "Chủ hộ",
    nationality: "Việt Nam"
  },
  {
    id: "R002",
    fullName: "Park Min-ho",
    gender: "Nam",
    birthDate: "20/08/1988",
    cccd: "M89210452",
    passportNumber: "M89210452",
    phone: "0901122334",
    status: "Tạm trú",
    occupation: "Chuyên gia phần mềm",
    address: "18 Lương Định Của, Phường An Phú",
    householdId: "HK-302",
    relationToOwner: "Thành viên",
    nationality: "Hàn Quốc",
    isForeigner: true
  }
];

const sampleHouseholds: Household[] = [
  {
    id: "H001",
    code: "HK-301",
    ownerName: "Nguyễn Văn Hùng",
    address: "42/3 Lương Định Của, Phường An Phú",
    memberCount: 1,
    type: "Thường trú",
    members: [
      {
        name: "Nguyễn Văn Hùng",
        relation: "Chủ hộ",
        cccd: "079068001234",
        phone: "0903829112",
        birthYear: 1968
      }
    ]
  }
];

function ResidentsHarness({ initialPath = ROUTES.DASHBOARD_RESIDENTS }: { initialPath?: string }) {
  const [residents, setResidents] = useState<Resident[]>(sampleResidents);
  const [households, setHouseholds] = useState<Household[]>(sampleHouseholds);

  React.useLayoutEffect(() => {
    window.history.replaceState({}, "", initialPath);
  }, [initialPath]);

  const handleAddResident = (newRes: Resident) => {
    setResidents(prev => [newRes, ...prev]);
  };

  const handleUpdateResident = (updatedRes: Resident, oldRes: Resident) => {
    setResidents(prev => prev.map(r => (r.id === oldRes.id ? updatedRes : r)));
  };

  const handleDeleteResident = (id: string) => {
    setResidents(prev => prev.filter(r => r.id !== id));
  };

  return (
    <ResidentsPage
      residents={residents}
      households={households}
      currentUser={{ username: "canbo", fullName: "Nguyễn Văn Hùng", role: "canbo" }}
      residentPermissions={{ residents: true }}
      onAddResident={handleAddResident}
      onUpdateResident={handleUpdateResident}
      onDeleteResident={handleDeleteResident}
      onUpdateResidents={setResidents}
      onUpdateHouseholds={setHouseholds}
      onNavigateToGis={vi.fn()}
      setActiveTab={vi.fn()}
    />
  );
}

describe("Resident sub-route helpers", () => {
  it("parses list, detail, create, foreigner create, and edit routes cleanly", () => {
    expect(parseResidentsSubRoute("/dashboard/residents", "")).toBeNull();
    expect(parseResidentsSubRoute("/dashboard/residents/new", "")).toEqual({
      mode: "create",
      isForeigner: false
    });
    expect(parseResidentsSubRoute("/dashboard/residents/new", "?type=foreigner")).toEqual({
      mode: "create",
      isForeigner: true
    });
    expect(parseResidentsSubRoute("/dashboard/residents/R001", "")).toEqual({
      mode: "detail",
      residentId: "R001"
    });
    expect(parseResidentsSubRoute("/dashboard/residents/R001/edit", "")).toEqual({
      mode: "edit",
      residentId: "R001"
    });
    expect(getTabFromDashboardPath("/dashboard/residents/new")).toBe("residents");
    expect(getTabFromDashboardPath("/dashboard/residents/R001")).toBe("residents");
    expect(getTabFromDashboardPath("/dashboard/residents/R001/edit")).toBe("residents");
    expect(getResidentDetailPath("R001")).toBe("/dashboard/residents/R001");
    expect(getResidentCreatePath(true)).toBe("/dashboard/residents/new?type=foreigner");
    expect(getResidentEditPath("R001")).toBe("/dashboard/residents/R001/edit");
  });
});

describe("ResidentsPage detail, add, and edit navigation workflows", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.history.replaceState({}, "", ROUTES.DASHBOARD_RESIDENTS);
  });

  it("navigates to ResidentDetailPage on row click (L1922) and to ResidentFormPage when clicking Sửa", async () => {
    render(<ResidentsHarness />);

    // Row click navigates to /dashboard/residents/R001
    const row = document.getElementById("resident-row-R001");
    expect(row).not.toBeNull();
    if (row) fireEvent.click(row);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/residents/R001");
    });

    expect(document.getElementById("resident-detail-page")).toBeInTheDocument();
    expect(document.getElementById("detail-resident-name")).toHaveTextContent("Nguyễn Văn Hùng");

    // PII masking toggle reveals full CCCD
    expect(screen.getByText("0790 ••• ••• 234")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hiện số/i }));
    expect(screen.getByText("079068001234")).toBeInTheDocument();

    // Switching tabs works
    const residenceTabBtn = document.getElementById("detail-tab-btn-residence");
    expect(residenceTabBtn).not.toBeNull();
    if (residenceTabBtn) fireEvent.click(residenceTabBtn);
    expect(document.getElementById("detail-tab-panel-residence")).toBeInTheDocument();

    // Clicking "Sửa" navigates to /dashboard/residents/R001/edit
    const editBtn = document.getElementById("btn-detail-edit");
    expect(editBtn).not.toBeNull();
    if (editBtn) fireEvent.click(editBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/residents/R001/edit");
    });

    expect(document.getElementById("resident-form-page")).toBeInTheDocument();
    const nameInput = document.getElementById("resident-field-fullName") as HTMLInputElement;
    expect(nameInput.value).toBe("Nguyễn Văn Hùng");

    // Edit full name and submit
    fireEvent.change(nameInput, {
      target: { name: "fullName", value: "Nguyễn Văn Hùng Updated" }
    });
    const submitBtn = document.getElementById("btn-submit-resident-form");
    expect(submitBtn).not.toBeNull();
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_RESIDENTS);
    });

    expect(await screen.findByText("Nguyễn Văn Hùng Updated")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã cập nhật hồ sơ cư dân Nguyễn Văn Hùng Updated thành công."
    );
  });

  it("supports deleting a resident from ResidentDetailPage and returning to list", async () => {
    render(<ResidentsHarness />);

    const row2 = document.getElementById("resident-row-R002");
    expect(row2).not.toBeNull();
    if (row2) fireEvent.click(row2);
    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/residents/R002");
    });

    const deleteBtn = document.getElementById("btn-detail-delete");
    expect(deleteBtn).not.toBeNull();
    if (deleteBtn) fireEvent.click(deleteBtn);
    const confirmBtn = await screen.findByRole("button", { name: /Xác nhận xóa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_RESIDENTS);
    });

    expect(screen.queryByText("Park Min-ho")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã xóa hồ sơ cư dân Park Min-ho khỏi hệ thống."
    );
  });

  it("navigates to add page on clicking Thêm Hồ sơ Cư dân Mới (L1479), validates required fields accessibly, and creates resident", async () => {
    render(<ResidentsHarness />);

    const addBtn = document.getElementById("btn-add-resident");
    expect(addBtn).not.toBeNull();
    if (addBtn) fireEvent.click(addBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_RESIDENTS_NEW);
    });

    // Submitting empty required fields triggers accessible error summary without alert()
    const submitBtn = document.getElementById("btn-submit-resident-form");
    expect(submitBtn).not.toBeNull();
    if (submitBtn) fireEvent.click(submitBtn);
    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toHaveTextContent("Vui lòng kiểm tra lại thông tin bắt buộc");

    const nameInput = document.getElementById("resident-field-fullName") as HTMLInputElement;
    const cccdInput = document.getElementById("resident-field-cccd") as HTMLInputElement;
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(cccdInput).toHaveAttribute("aria-invalid", "true");

    // Fill valid info and submit
    fireEvent.change(nameInput, { target: { name: "fullName", value: "Lê Minh Tuấn" } });
    fireEvent.change(cccdInput, { target: { name: "cccd", value: "079099001122" } });

    expect(nameInput).toHaveAttribute("aria-invalid", "false");
    expect(cccdInput).toHaveAttribute("aria-invalid", "false");

    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_RESIDENTS);
    });

    expect(await screen.findByText("Lê Minh Tuấn")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã thêm mới hồ sơ cư dân Lê Minh Tuấn vào hệ thống."
    );
  });

  it("navigates to foreigner create form when clicking Thêm Người nước ngoài", async () => {
    navigate(ROUTES.DASHBOARD_RESIDENTS);
    render(<ResidentsHarness />);

    const foreignerFilterBtn = screen.getByRole("button", { name: /Người nước ngoài/i });
    fireEvent.click(foreignerFilterBtn);

    const addForeignerBtn = await screen.findByRole("button", { name: /Thêm Người nước ngoài/i });
    fireEvent.click(addForeignerBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/residents/new");
      expect(window.location.search).toBe("?type=foreigner");
    });

    expect(
      screen.getByRole("heading", { level: 1, name: /Thêm mới Hồ sơ Người nước ngoài/i })
    ).toBeInTheDocument();
    expect(document.getElementById("tab-panel-foreigner")).toBeInTheDocument();
  });
});
