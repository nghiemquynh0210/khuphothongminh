import { describe, expect, it } from "vitest";
import { Resident } from "../../types";
import { scanResidentsByCohort } from "../../components/residents/AgeCohortScannerModal";

function makeRes(overrides: Partial<Resident>): Resident {
  return {
    id: overrides.id || "R1",
    fullName: overrides.fullName || "NGUYỄN VĂN A",
    gender: overrides.gender || "Nam",
    birthDate: overrides.birthDate || "01/01/2000",
    cccd: overrides.cccd || "079200001234",
    phone: overrides.phone || "0909123456",
    status: overrides.status || "Thường trú",
    occupation: overrides.occupation || "",
    address: overrides.address || "17/A3 Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
    householdId: overrides.householdId || "HK-001",
    relationToOwner: overrides.relationToOwner || "Con",
    avatar: "",
    ...overrides,
  };
}

describe("scanResidentsByCohort (NVQS, Mừng thọ, Tuyển sinh & Căn cước)", () => {
  const sample: Resident[] = [
    makeRes({ id: "1", fullName: "TRẦN NAM 17", gender: "Nam", birthDate: "15/05/2009" }), // 17 in 2026
    makeRes({ id: "2", fullName: "LÊ NỮ 17", gender: "Nữ", birthDate: "15/05/2009" }), // female 17 -> excluded from NVQS
    makeRes({ id: "3", fullName: "PHẠM QUÂN 22", gender: "Nam", birthDate: "10/10/2004" }), // 22 in 2026
    makeRes({ id: "4", fullName: "VÕ ĐẠI HỌC 26", gender: "Nam", birthDate: "02/03/2000" }), // 26 in 2026
    makeRes({ id: "5", fullName: "CỤ ÔNG 80", gender: "Nam", birthDate: "12/02/1946" }), // 80 in 2026
    makeRes({ id: "6", fullName: "CỤ BÀ 73", gender: "Nữ", birthDate: "12/02/1953" }), // 73 -> not milestone
    makeRes({ id: "7", fullName: "CỤ BÀ 101", gender: "Nữ", birthDate: "01/01/1925" }), // 101 -> >=100 milestone
    makeRes({ id: "8", fullName: "BÉ LỚP 1", gender: "Nữ", birthDate: "20/08/2020" }), // 6 in 2026
    makeRes({ id: "9", fullName: "EM CĂN CƯỚC 14", gender: "Nam", birthDate: "05/09/2012" }), // 14 in 2026
  ];

  it("filters male 17-year-old residents accurately for initial NVQS registration", () => {
    const res = scanResidentsByCohort(sample, "nvqs_17", 2026);
    expect(res.map((x) => x.resident.id)).toEqual(["1"]);
  });

  it("distinguishes 18-25 vs 18-27 NVQS cohorts accurately", () => {
    const g25 = scanResidentsByCohort(sample, "nvqs_18_25", 2026);
    expect(g25.map((x) => x.resident.id)).toEqual(["3"]);

    const g27 = scanResidentsByCohort(sample, "nvqs_18_27", 2026);
    expect(g27.map((x) => x.resident.id)).toEqual(["4", "3"]);
  });

  it("detects longevity milestones (70,75,80,85,90,95,100+) and skips non-milestone ages", () => {
    const allMilestones = scanResidentsByCohort(sample, "longevity_all", 2026);
    expect(allMilestones.map((x) => x.resident.id)).toEqual(["7", "5"]);

    const only80 = scanResidentsByCohort(sample, "longevity_all", 2026, {
      longevityMilestoneFilter: 80,
    });
    expect(only80.map((x) => x.resident.id)).toEqual(["5"]);
  });

  it("detects Grade 1 (6yo) and Citizen ID (14yo) cohorts accurately", () => {
    expect(scanResidentsByCohort(sample, "school_6", 2026).map((x) => x.resident.id)).toEqual(["8"]);
    expect(scanResidentsByCohort(sample, "cccd_14", 2026).map((x) => x.resident.id)).toEqual(["9"]);
  });
});
