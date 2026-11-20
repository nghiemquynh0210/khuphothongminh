// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PartyBranch from "../../components/PartyBranch";
import type { Association } from "../../types";

afterEach(() => {
  cleanup();
});

describe("PartyBranch member card pointer & detail click behavior", () => {
  const sampleAssociations: Association[] = [
    {
      id: "ASC_BDH",
      name: "Ban điều hành khu phố",
      category: "Chính quyền cơ sở",
      description: "Ban điều hành Khu phố 3",
      leaderName: "Lê Thị Mai",
      leaderCccd: "079185001122",
      members: [
        {
          id: "M01",
          fullName: "Lê Thị Mai",
          role: "Trưởng Ban điều hành",
          cccd: "079185001122",
          phone: "0909123456",
          birthDate: "15/06/1985",
          joinDate: "01/01/2024",
          decisionNumber: "QĐ-01/UBND-AP",
        },
        {
          id: "M02",
          fullName: "Trần Văn Tâm",
          role: "Thành viên Ban điều hành",
          cccd: "079090003344",
          phone: "0912345678",
          birthDate: "20/10/1990",
          joinDate: "15/03/2024",
        },
      ],
    },
  ];

  it("displays cursor-pointer on member square cards and opens detail when clicked", () => {
    const onOpenMemberDetail = vi.fn();
    const onOpenEditMember = vi.fn();

    render(
      <PartyBranch
        partyMembers={[]}
        residents={[]}
        associations={sampleAssociations}
        selectedAssociationId="ASC_BDH"
        onOpenMemberDetail={onOpenMemberDetail}
        onOpenEditMember={onOpenEditMember}
      />
    );

    const memberCard = screen.getByRole("button", {
      name: /Xem thông tin chi tiết hội viên Trần Văn Tâm/i,
    });

    expect(memberCard.className).toContain("cursor-pointer");

    fireEvent.click(memberCard);
    expect(onOpenMemberDetail).toHaveBeenCalledTimes(1);
    expect(onOpenMemberDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        cccd: "079090003344",
        fullName: "Trần Văn Tâm",
      }),
      expect.objectContaining({
        id: "ASC_BDH",
      })
    );
  });

  it("does not trigger member detail navigation when clicking nested edit button", () => {
    const onOpenMemberDetail = vi.fn();
    const onOpenEditMember = vi.fn();

    render(
      <PartyBranch
        partyMembers={[]}
        residents={[]}
        associations={sampleAssociations}
        selectedAssociationId="ASC_BDH"
        onOpenMemberDetail={onOpenMemberDetail}
        onOpenEditMember={onOpenEditMember}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Sửa Trần Văn Tâm/i,
    });

    fireEvent.click(editBtn);
    expect(onOpenEditMember).toHaveBeenCalledTimes(1);
    expect(onOpenMemberDetail).not.toHaveBeenCalled();
  });
});
