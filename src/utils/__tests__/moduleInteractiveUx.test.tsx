// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ReportCard } from "../../components/reports/ReportCard";
import HouseholdDetailPage from "../../page/HouseholdDetailPage";
import BusinessDetailPage from "../../page/BusinessDetailPage";
import AdministrativeForms from "../../components/AdministrativeForms";
import { Business, FieldReport, Household, Resident } from "../../types";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.history.pushState({}, "", "/dashboard");
});

const SAMPLE_RESIDENTS: Resident[] = [
  {
    id: "RES-101",
    fullName: "Phạm Văn Bình",
    birthDate: "1975-05-10",
    gender: "Nam",
    cccd: "079075001122",
    phone: "0913137155",
    address: "17/A3 Khu phố 3, Phường An Phú",
    householdId: "HK-101",
    status: "Thường trú",
    occupation: "Kinh doanh",
    relationToOwner: "Chủ hộ",
  },
  {
    id: "RES-102",
    fullName: "Lê Thị Hồng",
    birthDate: "1978-08-12",
    gender: "Nữ",
    cccd: "079178002233",
    phone: "0908123456",
    address: "17/A3 Khu phố 3, Phường An Phú",
    householdId: "HK-101",
    status: "Thường trú",
    occupation: "Nội trợ",
    relationToOwner: "Vợ",
  },
  {
    id: "RES-103",
    fullName: "Phạm Minh Tuấn",
    birthDate: "2003-02-20",
    gender: "Nam",
    cccd: "079203003344",
    phone: "0908999888",
    address: "17/A3 Khu phố 3, Phường An Phú",
    householdId: "HK-101",
    status: "Thường trú",
    occupation: "Sinh viên",
    relationToOwner: "Con trai",
  },
  {
    id: "RES-201",
    fullName: "Nguyễn Thị Khách Trọ",
    birthDate: "1999-11-11",
    gender: "Nữ",
    cccd: "083199004455",
    phone: "0939112233",
    address: "Nhà trọ Phạm Văn Bình (SĐT: 0913137155) 17/A3 Khu phố 3, Phường An Phú",
    currentAddress: "Nhà trọ Phạm Văn Bình (SĐT: 0913137155) 17/A3 Khu phố 3, Phường An Phú",
    permanentAddress: "Bến Tre",
    householdId: "TT-201",
    status: "Tạm trú",
    occupation: "Nhân viên văn phòng",
    relationToOwner: "Người thuê trọ",
    temporaryExpDate: "2027-05-01",
  },
];

const SAMPLE_HOUSEHOLD: Household = {
  id: "HH-101",
  code: "HK-101",
  ownerName: "Phạm Văn Bình",
  address: "17/A3 Khu phố 3, Phường An Phú",
  memberCount: 3,
  type: "Thường trú",
  members: [
    {
      name: "Phạm Văn Bình",
      relation: "Chủ hộ",
      cccd: "079075001122",
      phone: "0913137155",
      birthYear: 1975,
    },
    {
      name: "Lê Thị Hồng",
      relation: "Vợ",
      cccd: "079178002233",
      phone: "0908123456",
      birthYear: 1978,
    },
    {
      name: "Phạm Minh Tuấn",
      relation: "Con trai",
      cccd: "079203003344",
      phone: "0908999888",
      birthYear: 2003,
    },
  ],
};

describe("Cross-module Interactive UX (cursor-pointer, click-to-detail, quick search, stopPropagation)", () => {
  it("ReportCard renders cursor-pointer on full card, opens detail on card click, and stops propagation on footer buttons", () => {
    const onOpenDetail = vi.fn();
    const onStartProcess = vi.fn();
    const onOpenResolve = vi.fn();

    const report: FieldReport = {
      id: "PA-001",
      title: "Đèn chiếu sáng hẻm 17/A3 bị hỏng",
      category: "Hạ tầng đô thị",
      location: "Hẻm 17/A3 Khu phố 3",
      coordinates: { x: 50, y: 50 },
      description: "Bóng đèn cao áp nhấp nháy không sáng vào ban đêm.",
      reporterName: "Phạm Văn Bình",
      reporterPhone: "0913137155",
      reportedAt: "15/11/2026 08:30",
      status: "Đã tiếp nhận",
      priority: "Cao",
      timeline: [],
    };

    render(
      <ReportCard
        report={report}
        readOnly={false}
        onOpenDetail={onOpenDetail}
        onStartProcess={onStartProcess}
        onOpenResolve={onOpenResolve}
      />
    );

    const card = screen.getByRole("button", {
      name: /Xem chi tiết phản ánh Đèn chiếu sáng hẻm 17\/A3 bị hỏng/i,
    });
    expect(card.className).toContain("cursor-pointer");

    // Clicking nested "Tiếp nhận" button triggers onStartProcess ONLY, not card onOpenDetail
    const startBtn = screen.getByRole("button", { name: "Tiếp nhận" });
    fireEvent.click(startBtn);
    expect(onStartProcess).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();

    // Clicking card body opens detail
    fireEvent.click(card);
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).toHaveBeenCalledWith(report);
  });

  it("HouseholdDetailPage filters members via quick search and navigates to ResidentDetailPage on member card click", () => {
    render(
      <HouseholdDetailPage
        householdId="HH-101"
        households={[SAMPLE_HOUSEHOLD]}
        residents={SAMPLE_RESIDENTS}
        onUpdateHouseholds={vi.fn()}
        onUpdateResidents={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(
      /Tìm nhanh thành viên theo họ tên, CCCD/i
    );
    expect(searchInput).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: "Minh Tuấn" } });
    expect(screen.getByText("Phạm Minh Tuấn")).toBeTruthy();
    expect(screen.queryByText("Lê Thị Hồng")).toBeNull();

    const memberCard = screen
      .getByText("Phạm Minh Tuấn")
      .closest('[role="button"]') as HTMLElement;
    expect(memberCard).toBeTruthy();
    expect(memberCard.className).toContain("cursor-pointer");

    fireEvent.click(memberCard);
    expect(window.location.pathname).toBe("/dashboard/residents/detail/RES-103");
  });

  it("BusinessDetailPage staying resident row has cursor-pointer and navigates to ResidentDetailPage when clicked", () => {
    const hostel: Business = {
      id: "BIZ-HOSTEL-1",
      name: "Nhà trọ Phạm Văn Bình",
      type: "Nhà trọ / Cơ sở lưu trú",
      owner: "Phạm Văn Bình",
      phone: "0913137155",
      address: "17/A3 Khu phố 3, Phường An Phú",
      licenseNumber: "HKD-17A3",
      status: "Đang hoạt động",
      employeeCount: 2,
      safetyCertified: true,
      isAccommodation: true,
      soPhong: 15,
      soNguoiLuuTru: 1,
    };

    render(
      <BusinessDetailPage
        businessId="BIZ-HOSTEL-1"
        businesses={[hostel]}
        residents={SAMPLE_RESIDENTS}
        households={[SAMPLE_HOUSEHOLD]}
        onUpdateStatus={vi.fn()}
      />
    );

    // Switch to tab 2 (Mặt bằng & Cư dân Lưu trú) where staying residents table is rendered
    const premisesTab = screen.getByRole("button", { name: /Mặt bằng & Cư dân Lưu trú/i });
    fireEvent.click(premisesTab);

    const guestCell = screen.getByText("Nguyễn Thị Khách Trọ");
    const row = guestCell.closest("tr") as HTMLElement;
    expect(row).toBeTruthy();
    expect(row.className).toContain("cursor-pointer");

    fireEvent.click(row);
    expect(window.location.pathname).toBe("/dashboard/residents/detail/RES-201");
  });

  it("AdministrativeForms card has cursor-pointer and opens preview modal when clicking the card box", () => {
    render(<AdministrativeForms currentUser={{ role: "canbo" }} />);

    const formCards = screen
      .getAllByRole("button")
      .filter((el) => (el.getAttribute("aria-label") || "").startsWith("Xem trước biểu mẫu"));
    expect(formCards.length).toBeGreaterThan(0);
    expect(formCards[0].className).toContain("cursor-pointer");

    fireEvent.click(formCards[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/Sao chép mẫu/i)).toBeTruthy();
  });
});
