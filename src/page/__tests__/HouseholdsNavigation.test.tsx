import React, { useState } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HouseholdsPage from "../HouseholdsPage";
import { Household, Resident } from "../../types";
import {
  ROUTES,
  getHouseholdAddMemberPath,
  getHouseholdCreatePath,
  getHouseholdDetailPath,
  getHouseholdEditPath,
  getHouseholdTreePath,
  getTabFromDashboardPath,
  parseHouseholdsSubRoute
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
    fullName: "Trần Thị Lan",
    gender: "Nữ",
    birthDate: "20/08/1972",
    cccd: "079072005511",
    phone: "0918345678",
    status: "Thường trú",
    occupation: "Giáo viên",
    address: "42/3 Lương Định Của, Phường An Phú",
    householdId: "HK-301",
    relationToOwner: "Vợ",
    nationality: "Việt Nam"
  }
];

const sampleHouseholds: Household[] = [
  {
    id: "H001",
    code: "HK-301",
    ownerName: "Nguyễn Văn Hùng",
    address: "42/3 Lương Định Của, Phường An Phú",
    memberCount: 2,
    type: "Thường trú",
    coordinates: "10.793500, 106.744500",
    members: [
      {
        name: "Nguyễn Văn Hùng",
        relation: "Chủ hộ",
        cccd: "079068001234",
        phone: "0903829112",
        birthYear: 1968
      },
      {
        name: "Trần Thị Lan",
        relation: "Vợ",
        cccd: "079072005511",
        phone: "0918345678",
        birthYear: 1972
      }
    ]
  },
  {
    id: "H002",
    code: "HK-302",
    ownerName: "Lê Minh Tâm",
    address: "18 Lương Định Của, Phường An Phú",
    memberCount: 0,
    type: "Tạm trú",
    members: []
  }
];

function HouseholdsHarness({
  initialPath = ROUTES.DASHBOARD_HOUSEHOLDS
}: {
  initialPath?: string;
}) {
  const [households, setHouseholds] = useState<Household[]>(sampleHouseholds);
  const [residents, setResidents] = useState<Resident[]>(sampleResidents);

  React.useLayoutEffect(() => {
    window.history.replaceState({}, "", initialPath);
  }, [initialPath]);

  return (
    <HouseholdsPage
      households={households}
      residents={residents}
      currentUser={{ username: "canbo", fullName: "Nguyễn Văn Hùng", role: "canbo" }}
      residentPermissions={{ households: true }}
      onAddHousehold={newH => setHouseholds(prev => [newH, ...prev])}
      onUpdateHouseholds={setHouseholds}
      onUpdateResidents={setResidents}
      onNavigateToGis={vi.fn()}
      setActiveTab={vi.fn()}
    />
  );
}

describe("Household sub-route helpers", () => {
  it("parses list, create, detail, edit, add-member, and tree routes cleanly", () => {
    expect(parseHouseholdsSubRoute("/dashboard/households")).toBeNull();
    expect(parseHouseholdsSubRoute("/dashboard/households/new")).toEqual({ mode: "create" });
    expect(parseHouseholdsSubRoute("/dashboard/households/H001")).toEqual({
      mode: "detail",
      householdId: "H001"
    });
    expect(parseHouseholdsSubRoute("/dashboard/households/H001/edit")).toEqual({
      mode: "edit",
      householdId: "H001"
    });
    expect(parseHouseholdsSubRoute("/dashboard/households/H001/members/new")).toEqual({
      mode: "add-member",
      householdId: "H001"
    });
    expect(parseHouseholdsSubRoute("/dashboard/households/H001/tree")).toEqual({
      mode: "tree",
      householdId: "H001"
    });

    expect(getTabFromDashboardPath("/dashboard/households/new")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/H001")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/H001/edit")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/H001/members/new")).toBe("households");
    expect(getTabFromDashboardPath("/dashboard/households/H001/tree")).toBe("households");
    expect(getTabFromDashboardPath("/households/H001/tree")).toBe("households");

    expect(getHouseholdCreatePath()).toBe("/dashboard/households/new");
    expect(getHouseholdDetailPath("H001")).toBe("/dashboard/households/H001");
    expect(getHouseholdEditPath("H001")).toBe("/dashboard/households/H001/edit");
    expect(getHouseholdAddMemberPath("H001")).toBe("/dashboard/households/H001/members/new");
    expect(getHouseholdTreePath("H001")).toBe("/dashboard/households/H001/tree");
  });
});

describe("HouseholdsPage navigation workflows (replaces dialogs)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.history.replaceState({}, "", ROUTES.DASHBOARD_HOUSEHOLDS);
  });

  it("navigates to HouseholdDetailPage on row click, supports PII toggle, edits household, adds member, and opens family tree page", async () => {
    render(<HouseholdsHarness />);

    // 1. Click household row -> /dashboard/households/H001
    const row = document.getElementById("household-row-H001");
    expect(row).not.toBeNull();
    if (row) fireEvent.click(row);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001");
    });

    expect(document.getElementById("household-detail-page")).toBeInTheDocument();
    expect(document.getElementById("detail-household-title")).toHaveTextContent(
      "Hộ gia đình: Nguyễn Văn Hùng"
    );

    // PII masking toggle reveals full CCCD
    expect(screen.getByText(/0790 ••• ••• 234/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hiện CCCD/i }));
    expect(screen.getByText(/079068001234/)).toBeInTheDocument();

    // Tab switching
    const historyTabBtn = document.getElementById("household-tab-btn-history");
    expect(historyTabBtn).not.toBeNull();
    if (historyTabBtn) fireEvent.click(historyTabBtn);
    expect(document.getElementById("household-tab-panel-history")).toBeInTheDocument();

    // 2. Click "Sửa Sổ" -> /dashboard/households/H001/edit
    const editBtn = document.getElementById("btn-detail-edit");
    expect(editBtn).not.toBeNull();
    if (editBtn) fireEvent.click(editBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001/edit");
    });
    expect(document.getElementById("household-form-page")).toBeInTheDocument();

    const addressInput = document.getElementById("household-field-address") as HTMLInputElement;
    expect(addressInput.value).toBe("42/3 Lương Định Của, Phường An Phú");
    fireEvent.change(addressInput, {
      target: { value: "42/5 Lương Định Của, Phường An Phú" }
    });

    const submitEditBtn = document.getElementById("btn-submit-household-form");
    expect(submitEditBtn).not.toBeNull();
    if (submitEditBtn) fireEvent.click(submitEditBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã cập nhật Sổ hộ khẩu HK-301 thành công."
    );
    expect(screen.getAllByText("42/5 Lương Định Của, Phường An Phú").length).toBeGreaterThan(0);

    // 3. Click "Thêm nhân khẩu" -> /dashboard/households/H001/members/new
    const membersTabBtn = document.getElementById("household-tab-btn-members");
    if (membersTabBtn) fireEvent.click(membersTabBtn);

    const addMemberBtn = document.getElementById("btn-detail-add-member");
    expect(addMemberBtn).not.toBeNull();
    if (addMemberBtn) fireEvent.click(addMemberBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001/members/new");
    });
    expect(document.getElementById("household-add-member-page")).toBeInTheDocument();

    // Empty submit triggers accessible error summary without alert()
    const submitMemberBtn = document.getElementById("btn-submit-add-member");
    if (submitMemberBtn) fireEvent.click(submitMemberBtn);
    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toHaveTextContent("Vui lòng kiểm tra lại thông tin nhập khẩu");

    fireEvent.change(document.getElementById("member-field-name") as HTMLInputElement, {
      target: { value: "Nguyễn Minh Khang" }
    });
    fireEvent.change(document.getElementById("member-field-cccd") as HTMLInputElement, {
      target: { value: "079205009988" }
    });
    fireEvent.change(document.getElementById("member-field-birthyear") as HTMLInputElement, {
      target: { value: "2005" }
    });

    if (submitMemberBtn) fireEvent.click(submitMemberBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã nhập khẩu thành viên Nguyễn Minh Khang vào Sổ HK-301 thành công."
    );
    expect(screen.getByText("Nguyễn Minh Khang")).toBeInTheDocument();

    // 4. Click "Sơ đồ cây Phả Hệ Hộ Tịch" -> /dashboard/households/H001/tree
    const treeBtn = document.getElementById("btn-detail-tree");
    expect(treeBtn).not.toBeNull();
    if (treeBtn) fireEvent.click(treeBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001/tree");
    });
    expect(document.getElementById("household-tree-page")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Minh Khang")).toBeInTheDocument();

    // Clicking a member node opens profile preview, and back returns to detail
    fireEvent.click(screen.getByText("Nguyễn Minh Khang"));
    expect(await screen.findByText("Hồ sơ điện tử Cư dân")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Đóng hồ sơ/i }));

    const backFromTree = document.getElementById("btn-back-from-tree");
    if (backFromTree) fireEvent.click(backFromTree);
    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H001");
    });
  });

  it("navigates to HouseholdFormPage (create) when clicking Lập Sổ Hộ Mới, validates required fields, and creates household", async () => {
    render(<HouseholdsHarness />);

    const addBtn = document.getElementById("btn-add-household");
    expect(addBtn).not.toBeNull();
    if (addBtn) fireEvent.click(addBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_HOUSEHOLDS_NEW);
    });
    expect(document.getElementById("household-form-page")).toBeInTheDocument();

    // Submit empty triggers GOV.UK error summary
    const submitBtn = document.getElementById("btn-submit-household-form");
    if (submitBtn) fireEvent.click(submitBtn);
    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toHaveTextContent("Vui lòng kiểm tra lại thông tin bắt buộc");

    fireEvent.change(document.getElementById("household-field-code") as HTMLInputElement, {
      target: { value: "HK-399" }
    });
    fireEvent.change(document.getElementById("household-field-owner") as HTMLInputElement, {
      target: { value: "Phạm Quốc Bảo" }
    });
    fireEvent.change(document.getElementById("household-field-address") as HTMLInputElement, {
      target: { value: "99 Song Hành, Phường An Phú" }
    });

    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_HOUSEHOLDS);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã lập Sổ hộ khẩu mới HK-399 (Phạm Quốc Bảo) thành công."
    );
    expect(screen.getByText(/Hộ gia đình: Phạm Quốc Bảo/)).toBeInTheDocument();
  });

  it("supports soft-deleting an empty household from HouseholdDetailPage and restoring it", async () => {
    render(<HouseholdsHarness />);

    const row2 = document.getElementById("household-row-H002");
    expect(row2).not.toBeNull();
    if (row2) fireEvent.click(row2);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/households/H002");
    });

    const deleteBtn = document.getElementById("btn-detail-delete");
    expect(deleteBtn).not.toBeNull();
    if (deleteBtn) fireEvent.click(deleteBtn);

    const confirmBtn = document.getElementById("btn-confirm-delete-household");
    expect(confirmBtn).not.toBeNull();
    if (confirmBtn) fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe(ROUTES.DASHBOARD_HOUSEHOLDS);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã chuyển Sổ hộ khẩu HK-302 vào thùng rác lưu trữ."
    );
    expect(screen.queryByText(/Hộ gia đình: Lê Minh Tâm/)).not.toBeInTheDocument();

    // Open recycle bin and restore
    fireEvent.click(screen.getByRole("button", { name: /Xem hộ đã xóa/i }));
    expect(await screen.findByText(/Hộ gia đình: Lê Minh Tâm/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Khôi phục/i }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Khôi phục Sổ hộ khẩu HK-302 thành công!"
    );
  });
});

