import { describe, expect, it } from "vitest";
import { INITIAL_ASSOCIATIONS } from "../../data/associationsData";
import { DEFAULT_LANDING_CONFIG, mergeLandingConfig } from "../../components/landing/landingConstants";
import {
  assignMemberRoleInAssociation,
  classifyMemberRoleTier,
  deriveSystemLeadership,
  enforcePartySecretaryFirst,
  extractKeyLeadersSummary,
  previewRoleAssignment,
  reconcileLegacyAssociationsIfNeeded,
  sortAssociationsAndMembers,
  syncLandingConfigWithAssociations,
  syncPortalLeaderChangeToAssociations,
} from "../leadershipSync";
import type { Association, LeadershipMember } from "../../types";

describe("leadershipSync — Canonical Hierarchy & System-Wide Role Synchronization", () => {
  it("always places Chi bộ Đảng (ASC_DANG) at index 0 and Bí thư Chi bộ as #1 top leader", () => {
    const reversed = [...INITIAL_ASSOCIATIONS].reverse();
    const sorted = sortAssociationsAndMembers(reversed);

    expect(sorted[0].id).toBe("ASC_DANG");
    expect(sorted[1].id).toBe("ASC_BDH");
    expect(sorted[2].id).toBe("ASC_MT");
    expect(classifyMemberRoleTier(sorted[0].members[0].role)).toBe("head");

    const syncedLanding = syncLandingConfigWithAssociations(DEFAULT_LANDING_CONFIG, sorted);
    const leaders = syncedLanding.leadership || [];

    expect(leaders.length).toBeGreaterThanOrEqual(5);
    expect(leaders[0].role).toBe("Bí thư Chi bộ");
    expect(leaders[0].name).toBe(sorted[0].leaderName);
    expect(leaders[0].isTopLeader).toBe(true);
    expect(leaders[0].isHighlight).toBe(true);
  });

  it("enforces Bí thư Chi bộ at index 0 even if LandingConfig leadership array is scrambled", () => {
    const scrambled: LeadershipMember[] = [
      {
        id: "ld-1",
        name: "Nguyễn Trung Huy",
        role: "Trưởng Khu phố",
        group: "Ban Điều hành Khu phố",
        scope: "Ban Điều hành KP3",
      },
      {
        id: "ld-2",
        name: "Đại úy Trần Quốc Hải",
        role: "Công an khu vực",
        group: "Công an khu vực",
        scope: "An ninh trật tự",
      },
      {
        id: "ld-3",
        name: "Nghiêm Xuân Quỳnh",
        role: "Bí thư Chi bộ",
        group: "Cấp ủy Chi bộ",
        scope: "Chi bộ Khu phố 3",
      },
      {
        id: "ld-4",
        name: "Phạm Ngọc Hà",
        role: "Phó Bí thư Chi bộ",
        group: "Cấp ủy Chi bộ",
        scope: "Chi bộ Khu phố 3",
      },
    ];

    const ordered = enforcePartySecretaryFirst(scrambled);
    expect(ordered[0].role).toBe("Bí thư Chi bộ");
    expect(ordered[0].name).toBe("Nghiêm Xuân Quỳnh");
    expect(ordered[0].isTopLeader).toBe(true);
    expect(ordered[1].role).toBe("Phó Bí thư Chi bộ");
    expect(ordered[2].role).toBe("Trưởng Khu phố");

    const mergedCfg = mergeLandingConfig({ leadership: scrambled });
    expect(mergedCfg.leadership?.[0].role).toBe("Bí thư Chi bộ");
  });

  it("automatically hands over incumbent Bí thư Chi bộ when appointing a new Bí thư and syncs across all views without leaking predecessor avatar", () => {
    const existingWithAvatar: LeadershipMember[] = [
      {
        id: "leader-1",
        name: "Nghiêm Xuân Quỳnh",
        role: "Bí thư Chi bộ",
        group: "Cấp ủy Chi bộ",
        scope: "Chi bộ KP3",
        avatar: "https://example.com/quynh-avatar.jpg",
        phone: "0903829112",
      },
    ];

    const partyAssoc = INITIAL_ASSOCIATIONS.find((a) => a.id === "ASC_DANG")!;
    const deputy = partyAssoc.members.find((m) => classifyMemberRoleTier(m.role) === "deputy")!;

    const preview = previewRoleAssignment(partyAssoc, deputy.cccd, "Bí thư Chi bộ");
    expect(preview.requiresHandover).toBe(true);
    expect(preview.currentHead?.fullName).toBe("Nghiêm Xuân Quỳnh");

    const updatedAssocs = assignMemberRoleInAssociation(
      INITIAL_ASSOCIATIONS,
      "ASC_DANG",
      deputy.cccd,
      "Bí thư Chi bộ",
      { previousHeadNextRole: "Chi ủy viên" }
    );

    const updatedParty = updatedAssocs.find((a) => a.id === "ASC_DANG")!;
    expect(updatedParty.leaderName).toBe(deputy.fullName);
    expect(updatedParty.leaderCccd).toBe(deputy.cccd);

    const oldHeadAfter = updatedParty.members.find((m) => m.fullName === "Nghiêm Xuân Quỳnh")!;
    expect(oldHeadAfter.role).toBe("Chi ủy viên");

    const derivedLeaders = deriveSystemLeadership(updatedAssocs, existingWithAvatar);
    expect(derivedLeaders[0].role).toBe("Bí thư Chi bộ");
    expect(derivedLeaders[0].name).toBe(deputy.fullName);
    expect(derivedLeaders[0].isTopLeader).toBe(true);
    // Must NOT inherit predecessor's personal photo
    expect(derivedLeaders[0].avatar).toBeUndefined();

    const keySummary = extractKeyLeadersSummary(updatedAssocs, derivedLeaders);
    expect(keySummary.partySecretary.name).toBe(deputy.fullName);
  });

  it("does NOT overwrite Trưởng / leaderName when assigning a Phó role (regression test)", () => {
    const womenAssoc = INITIAL_ASSOCIATIONS.find((a) => a.id === "ASC_PN")!;
    const regularMember = womenAssoc.members.find((m) => classifyMemberRoleTier(m.role) === "member")!;
    const originalHeadName = womenAssoc.leaderName;

    const updatedAssocs = assignMemberRoleInAssociation(
      INITIAL_ASSOCIATIONS,
      "ASC_PN",
      regularMember.cccd,
      "Chi hội phó"
    );

    const updatedWomen = updatedAssocs.find((a) => a.id === "ASC_PN")!;
    expect(updatedWomen.leaderName).toBe(originalHeadName);

    const syncedLanding = syncLandingConfigWithAssociations(DEFAULT_LANDING_CONFIG, updatedAssocs);
    const womenSummary = syncedLanding.associationLeaders?.find((s) => s.assocId === "ASC_PN");
    expect(womenSummary?.headName).toBe(originalHeadName);
    expect(womenSummary?.deputyList.some((d) => d.name === regularMember.fullName)).toBe(true);
  });

  it("propagates Chi hội trưởng changes to public associationLeaders directory and syncs Portal edits back", () => {
    const youthAssoc = INITIAL_ASSOCIATIONS.find((a) => a.id === "ASC_TN")!;
    const deputyMember = youthAssoc.members[1];

    const updatedAssocs = assignMemberRoleInAssociation(
      INITIAL_ASSOCIATIONS,
      "ASC_TN",
      deputyMember.cccd,
      "Bí thư Chi đoàn"
    );

    const syncedLanding = syncLandingConfigWithAssociations(DEFAULT_LANDING_CONFIG, updatedAssocs);
    const youthDir = syncedLanding.associationLeaders?.find((a) => a.assocId === "ASC_TN");
    expect(youthDir?.headName).toBe(deputyMember.fullName);

    // Reverse sync: changing Trưởng Khu phố name in Portal Settings updates ASC_BDH
    const editedPortalLeaders = (syncedLanding.leadership || []).map((l) =>
      l.role.includes("Trưởng Khu phố") && !l.role.includes("Phó")
        ? { ...l, name: "Trần Quốc Bảo", phone: "0911222333" }
        : l
    );
    const reverseSynced = syncPortalLeaderChangeToAssociations(updatedAssocs, editedPortalLeaders);
    const updatedBdh = reverseSynced.find((a) => a.id === "ASC_BDH")!;
    expect(updatedBdh.leaderName).toBe("Trần Quốc Bảo");
  });

  it("reconciles legacy sample M101 Nguyễn Văn Hùng in ASC_DANG to unified LandingConfig personnel", () => {
    const legacyAssocs: Association[] = INITIAL_ASSOCIATIONS.map((a) =>
      a.id === "ASC_DANG"
        ? {
            ...a,
            leaderName: "Nguyễn Văn Hùng",
            leaderCccd: "079068001122",
            members: [
              {
                id: "M101",
                fullName: "Nguyễn Văn Hùng",
                role: "Bí thư Chi bộ",
                cccd: "079068001122",
                phone: "0903829112",
              },
            ],
          }
        : a
    );

    const reconciled = reconcileLegacyAssociationsIfNeeded(
      legacyAssocs,
      DEFAULT_LANDING_CONFIG.leadership,
      false
    );

    expect(reconciled[0].id).toBe("ASC_DANG");
    expect(reconciled[0].leaderName).toBe("Nghiêm Xuân Quỳnh");
  });
});
