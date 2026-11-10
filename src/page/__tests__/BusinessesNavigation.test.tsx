import React, { useState } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BusinessesPage from "../BusinessesPage";
import { Business, Household, Resident } from "../../types";
import {
  ROUTES,
  getBusinessCreatePath,
  getBusinessDetailPath,
  getBusinessEditPath,
  getTabFromDashboardPath,
  parseBusinessesSubRoute
} from "../../routes";

const sampleBusinesses: Business[] = [
  {
    id: "B001",
    internalCode: "HKD-KP3-001",
    name: "Hộ KD Quán Phở Bò Gia Truyền",
    type: "Quán ăn & Đồ uống",
    industryGroup: "Dịch vụ ăn uống",
    owner: "Nguyễn Văn An",
    phone: "0903111222",
    address: "12 Lương Định Của, Khu phố 3, Phường An Phú",
    licenseNumber: "GP-HKD-001/AP",
    status: "Đang hoạt động",
    employeeCount: 6,
    safetyCertified: true,
    linkedHouseholdCode: "HK-001",
    toBanDo: "272",
    soThua: "55",
    dienTich: 120,
    loaiDat: "ODT",
    soDoFile: {
      name: "SoDo_HKD001.pdf",
      url: "sample://sodo-001.pdf",
      type: "pdf",
      size: "420 KB"
    },
    coordinates: "10.793500, 106.744500"
  },
  {
    id: "B002",
    internalCode: "HKD-KP3-002",
    name: "Nhà trọ Bình An KP3",
    type: "Nhà trọ cho thuê",
    industryGroup: "Lưu trú & Cho thuê",
    isAccommodation: true,
    soTang: 3,
    soPhong: 14,
    soNguoiLuuTru: 1,
    giaThueTrungBinh: "2.8 triệu/tháng",
    owner: "Trần Thị Hoa",
    phone: "0918222333",
    address: "17/A3 Khu phố 3, Phường An Phú",
    licenseNumber: "GP-NT-002/AP",
    status: "Đang hoạt động",
    employeeCount: 2,
    safetyCertified: true
  }
];

const sampleHouseholds: Household[] = [
  {
    id: "H001",
    code: "HK-001",
    ownerName: "Nguyễn Văn An",
    address: "12 Lương Định Của, Khu phố 3, Phường An Phú",
    memberCount: 2,
    type: "Thường trú",
    members: []
  }
];

const sampleResidents: Resident[] = [
  {
    id: "R101",
    fullName: "Lê Minh Tâm",
    birthDate: "1995-05-12",
    gender: "Nam",
    cccd: "079095001122",
    phone: "0988777666",
    address: "Nhà trọ Bình An (SĐT: 0918222333) 17/A3 Khu phố 3, Phường An Phú",
    currentAddress: "Nhà trọ Bình An (SĐT: 0918222333) 17/A3 Khu phố 3, Phường An Phú",
    permanentAddress: "Xã Bình Hưng, Bình Chánh",
    temporaryExpDate: "2027-01-01",
    householdId: "HK-999",
    relationToOwner: "Người thuê trọ",
    occupation: "Nhân viên văn phòng",
    status: "Tạm trú"
  }
];

function BusinessesHarness() {
  const [businesses, setBusinesses] = useState<Business[]>(sampleBusinesses);

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
    <BusinessesPage
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

describe("Businesses URL Routing & Sub-page Navigation", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", ROUTES.DASHBOARD_BUSINESSES);
  });

  it("parses Business sub-routes and resolves dashboard tab accurately", () => {
    expect(parseBusinessesSubRoute(getBusinessCreatePath())).toEqual({
      mode: "create"
    });
    expect(parseBusinessesSubRoute("/businesses/new")).toEqual({
      mode: "create"
    });
    expect(parseBusinessesSubRoute(getBusinessDetailPath("B001"))).toEqual({
      mode: "detail",
      businessId: "B001"
    });
    expect(parseBusinessesSubRoute(getBusinessEditPath("B001"))).toEqual({
      mode: "edit",
      businessId: "B001"
    });
    expect(parseBusinessesSubRoute("/dashboard/enterprises/E001")).toBeNull();

    expect(getTabFromDashboardPath("/dashboard/businesses")).toBe("businesses");
    expect(getTabFromDashboardPath("/dashboard/businesses/new")).toBe("businesses");
    expect(getTabFromDashboardPath("/dashboard/businesses/B001")).toBe("businesses");
    expect(getTabFromDashboardPath("/dashboard/businesses/B001/edit")).toBe("businesses");
    expect(getTabFromDashboardPath("/businesses/B001")).toBe("businesses");
  });

  it("navigates from list card to detail view, switches tabs, adds inspection log, and returns", async () => {
    render(<BusinessesHarness />);

    expect(screen.getByText("Hộ KD Quán Phở Bò Gia Truyền")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hộ KD Quán Phở Bò Gia Truyền"));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/businesses/B001");
      expect(
        screen.getByRole("button", { name: /Quay lại Danh sách/i })
      ).toBeInTheDocument();
    });

    // Switch to Mặt bằng & Sổ đỏ tab and test linked household link + Sổ đỏ button
    fireEvent.click(screen.getByRole("tab", { name: /Mặt bằng & Sổ đỏ/i }));
    expect(screen.getByText(/SoDo_HKD001\.pdf/i)).toBeInTheDocument();

    // Switch to Kiểm tra PCCC & Biến động tab and add an inspection entry
    fireEvent.click(screen.getByRole("tab", { name: /Kiểm tra PCCC & Biến động/i }));
    fireEvent.click(screen.getByRole("button", { name: /Thêm đợt kiểm tra/i }));

    fireEvent.change(
      screen.getByPlaceholderText(/Ghi nhận tình trạng bình chữa cháy/i),
      { target: { value: "Đã kiểm tra bình PCCC MFZ4 đạt chuẩn an toàn." } }
    );
    const submitInspButtons = screen.getAllByRole("button", {
      name: /Thêm đợt kiểm tra/i
    });
    fireEvent.click(submitInspButtons[submitInspButtons.length - 1]);

    await waitFor(() => {
      expect(
        screen.getByText("Đã kiểm tra bình PCCC MFZ4 đạt chuẩn an toàn.")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Quay lại Danh sách/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/businesses");
    });
  });

  it("navigates to create page, shows validation alert on empty submit, and creates a new accommodation business", async () => {
    render(<BusinessesHarness />);

    fireEvent.click(screen.getByRole("button", { name: /Đăng ký Cơ sở Mới/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/businesses/new");
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Đăng ký Cơ sở Kinh doanh/i })
    );

    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toHaveTextContent(/Tên Cơ sở Kinh doanh/i);
    expect(alertBox).toHaveTextContent(/Địa chỉ cơ sở/i);

    fireEvent.change(
      screen.getByLabelText(/Tên Cơ sở Kinh doanh \/ Hộ kinh doanh \*/i),
      { target: { value: "Nhà trọ An Khang Mới" } }
    );
    fireEvent.change(
      screen.getByLabelText(/Lĩnh vực \/ Loại hình cụ thể \*/i),
      { target: { value: "Nhà trọ cho thuê" } }
    );
    fireEvent.change(screen.getByLabelText(/Địa chỉ cơ sở kinh doanh \*/i), {
      target: { value: "99 Lương Định Của, KP3" }
    });
    fireEvent.change(
      screen.getByLabelText(/Người đại diện pháp luật \/ Chủ cơ sở \*/i),
      { target: { value: "Phạm Thị Lan" } }
    );
    fireEvent.change(screen.getByLabelText(/Số điện thoại liên hệ \*/i), {
      target: { value: "0909888777" }
    });
    // Auto-enabled accommodation fields because name includes "Nhà trọ"
    fireEvent.change(screen.getByLabelText(/Số tầng \*/i), {
      target: { value: "4" }
    });
    fireEvent.change(screen.getByLabelText(/Số phòng \*/i), {
      target: { value: "16" }
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Đăng ký Cơ sở Kinh doanh/i })
    );

    await waitFor(() => {
      expect(window.location.pathname).toMatch(/^\/dashboard\/businesses\/\d+$/);
      expect(screen.getByRole("heading", { name: "Nhà trọ An Khang Mới" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(/Nhà trọ An Khang Mới/i);
    });
  });

  it("navigates detail -> edit -> saves updates and supports deleting a business", async () => {
    window.history.replaceState({}, "", getBusinessDetailPath("B002"));
    render(<BusinessesHarness />);

    expect(screen.getByRole("heading", { name: "Nhà trọ Bình An KP3" })).toBeInTheDocument();
    expect(screen.getByText("Lê Minh Tâm")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sửa hồ sơ/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/businesses/B002/edit");
    });

    fireEvent.change(screen.getByLabelText(/Địa chỉ cơ sở kinh doanh \*/i), {
      target: { value: "17/A3 Bis Lương Định Của, KP3" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi hồ sơ/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/businesses/B002");
      expect(screen.getByText("17/A3 Bis Lương Định Của, KP3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Xóa$/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Xác nhận xóa cơ sở/i })
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard/businesses");
      expect(screen.queryByText("Nhà trọ Bình An KP3")).not.toBeInTheDocument();
    });
  });
});
