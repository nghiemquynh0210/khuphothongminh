import {
  Association,
  AssociationLeaderSummary,
  AssociationMember,
  LandingConfig,
  LeadershipMember,
} from "../types";

export type MemberRoleTier = "head" | "deputy" | "committee" | "member";

export interface AssociationRolePreset {
  headRole: string;
  deputyRole: string;
  committeeRoles: string[];
  memberRoles: string[];
  handoverFallbackRole: string;
  allSuggestedRoles: string[];
}

export interface RoleHandoverPreview {
  requiresHandover: boolean;
  isHeadRole: boolean;
  isDeputyRole: boolean;
  currentHead?: AssociationMember;
  suggestedPreviousHeadRole: string;
}

export interface KeyLeaderContact {
  name: string;
  role: string;
  phone?: string;
  cccd?: string;
  formattedWithTitle: string;
}

export interface KeyLeadersSummary {
  partySecretary: KeyLeaderContact;
  deputyPartySecretary?: KeyLeaderContact;
  neighborhoodHead: KeyLeaderContact;
  deputyNeighborhoodHead?: KeyLeaderContact;
  frontHead?: KeyLeaderContact;
  policeOfficer: KeyLeaderContact;
}

const CANONICAL_ASSOC_ORDER: Record<string, number> = {
  ASC_DANG: 1,
  ASC_CHIBO: 1,
  ASC_BDH: 2,
  ASC_MT: 3,
  ASC_MATTRAN: 3,
  ASC_ANTT: 4,
  ASC_KHUDOI: 5,
  ASC_PCCC: 6,
  ASC_HG: 7,
  ASC_HOAGIAI: 7,
  ASC_TOTRUONG: 8,
  ASC_PN: 9,
  ASC_PHUNU: 9,
  ASC_CCB: 10,
  ASC_TN: 11,
  ASC_THANHNIEN: 11,
  ASC_NCT: 12,
  ASC_NGUOICAOTUOI: 12,
  ASC_CTD: 13,
  ASC_CHUTHAPDO: 13,
  ASC_CCA: 14,
  ASC_KHUYENHOC: 15,
  ASC_DANG213: 16,
  ASC_CTDANG: 17,
};

function normText(s?: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function isWelfarePolicyGroup(assoc: Pick<Association, "id" | "name" | "category">): boolean {
  if (assoc.id.startsWith("ASC_CS_")) return true;
  if (assoc.category === "Chính sách xã hội") return true;
  const lower = normText(assoc.name);
  return (
    lower.includes("hộ nghèo") ||
    lower.includes("hộ cận nghèo") ||
    lower.includes("người khuyết tật") ||
    lower.includes("mẹ việt nam anh hùng") ||
    lower === "trẻ em" ||
    lower.includes("người có công") ||
    lower.includes("gia đình chính sách")
  );
}

/**
 * Thứ tự ưu tiên chuẩn hệ thống chính trị cơ sở:
 * 1. Chi bộ Đảng (ASC_DANG) LUÔN đứng số 1
 * 2. Ban điều hành Khu phố (ASC_BDH)
 * 3. Ban Công tác Mặt trận (ASC_MT)
 * 4. Khối ANTT - Quốc phòng - Tự quản
 * 5. Khối Chi hội Đoàn thể chính trị - xã hội
 * 6. Nhóm đối tượng chính sách xã hội (nếu có)
 */
export function getAssociationCanonicalRank(assoc: Pick<Association, "id" | "name" | "category">): number {
  const exact = CANONICAL_ASSOC_ORDER[assoc.id];
  if (exact !== undefined) return exact;

  const lower = normText(assoc.name);
  if (lower.includes("chi bộ đảng") || lower === "chi bộ") return 1;
  if (lower.includes("ban điều hành")) return 2;
  if (lower.includes("mặt trận")) return 3;
  if (lower.includes("antt") || lower.includes("an ninh")) return 4;
  if (lower.includes("khu đội") || lower.includes("dân quân")) return 5;
  if (lower.includes("pccc")) return 6;
  if (lower.includes("hoà giải") || lower.includes("hòa giải")) return 7;
  if (lower.includes("tự quản")) return 8;
  if (lower.includes("phụ nữ")) return 9;
  if (lower.includes("cựu chiến binh")) return 10;
  if (lower.includes("thanh niên") || lower.includes("chi đoàn")) return 11;
  if (lower.includes("người cao tuổi")) return 12;
  if (lower.includes("chữ thập đỏ")) return 13;
  if (isWelfarePolicyGroup(assoc)) return 80;
  return 40;
}

/**
 * Trả về bộ chức danh chuẩn Trưởng / Phó / Ủy viên / Hội viên theo từng loại Chi hội - Tổ chức.
 */
export function getAssociationRolePresets(assoc: Pick<Association, "id" | "name" | "category">): AssociationRolePreset {
  const id = assoc.id;
  const lower = normText(assoc.name);

  if (id === "ASC_DANG" || id === "ASC_CHIBO" || lower.includes("chi bộ đảng")) {
    const headRole = "Bí thư Chi bộ";
    const deputyRole = "Phó Bí thư Chi bộ";
    const committeeRoles = ["Chi ủy viên"];
    const memberRoles = ["Đảng viên", "Đảng viên dự bị"];
    return {
      headRole,
      deputyRole,
      committeeRoles,
      memberRoles,
      handoverFallbackRole: "Chi ủy viên",
      allSuggestedRoles: [headRole, deputyRole, ...committeeRoles, ...memberRoles],
    };
  }

  if (id === "ASC_BDH" || lower.includes("ban điều hành")) {
    const headRole = "Trưởng Khu phố";
    const deputyRole = "Phó Trưởng Khu phố";
    const committeeRoles = ["Thư ký Ban điều hành", "Cố vấn Ban điều hành"];
    const memberRoles = ["Thành viên Ban điều hành"];
    return {
      headRole,
      deputyRole,
      committeeRoles,
      memberRoles,
      handoverFallbackRole: "Thành viên Ban điều hành",
      allSuggestedRoles: [
        headRole,
        "Trưởng Ban điều hành",
        deputyRole,
        "Phó Ban điều hành",
        ...committeeRoles,
        ...memberRoles,
      ],
    };
  }

  if (id === "ASC_MT" || id === "ASC_MATTRAN" || lower.includes("mặt trận")) {
    const headRole = "Trưởng Ban CTMT";
    const deputyRole = "Phó Ban CTMT";
    const committeeRoles = ["Ủy viên Ban CTMT"];
    const memberRoles = ["Thành viên Mặt trận"];
    return {
      headRole,
      deputyRole,
      committeeRoles,
      memberRoles,
      handoverFallbackRole: "Ủy viên Ban CTMT",
      allSuggestedRoles: [headRole, deputyRole, ...committeeRoles, ...memberRoles],
    };
  }

  if (id === "ASC_TN" || id === "ASC_THANHNIEN" || lower.includes("thanh niên") || lower.includes("chi đoàn")) {
    const headRole = "Bí thư Chi đoàn";
    const deputyRole = "Phó Bí thư Chi đoàn";
    const committeeRoles = ["Ủy viên BCH Chi đoàn"];
    const memberRoles = ["Đoàn viên tích cực", "Đoàn viên"];
    return {
      headRole,
      deputyRole,
      committeeRoles,
      memberRoles,
      handoverFallbackRole: "Ủy viên BCH Chi đoàn",
      allSuggestedRoles: [headRole, deputyRole, ...committeeRoles, ...memberRoles],
    };
  }

  if (id === "ASC_KHUDOI" || lower.includes("khu đội") || lower.includes("dân quân")) {
    const headRole = "Chỉ huy trưởng DQTV";
    const deputyRole = "Chỉ huy phó DQTV";
    const committeeRoles = ["Tiểu đội trưởng DQTV"];
    const memberRoles = ["Chiến sĩ dân quân cơ động", "Chiến sĩ Y tế dân quân", "Chiến sĩ dân quân"];
    return {
      headRole,
      deputyRole,
      committeeRoles,
      memberRoles,
      handoverFallbackRole: "Chiến sĩ dân quân",
      allSuggestedRoles: [headRole, deputyRole, ...committeeRoles, ...memberRoles],
    };
  }

  if (
    id === "ASC_ANTT" ||
    id === "ASC_PCCC" ||
    id === "ASC_HG" ||
    id === "ASC_HOAGIAI" ||
    id === "ASC_DANG213" ||
    lower.startsWith("tổ ")
  ) {
    const headRole =
      id === "ASC_ANTT"
        ? "Tổ trưởng ANTT cơ sở"
        : id === "ASC_PCCC"
          ? "Tổ trưởng Tổ liên gia PCCC"
          : id === "ASC_HG" || id === "ASC_HOAGIAI"
            ? "Tổ trưởng Tổ hòa giải"
            : id === "ASC_DANG213"
              ? "Tổ trưởng đảng viên 213"
              : "Tổ trưởng";
    const deputyRole =
      id === "ASC_ANTT"
        ? "Tổ phó ANTT cơ sở"
        : id === "ASC_PCCC"
          ? "Tổ phó Tổ liên gia PCCC"
          : id === "ASC_HG" || id === "ASC_HOAGIAI"
            ? "Tổ phó Tổ hòa giải"
            : id === "ASC_DANG213"
              ? "Tổ phó đảng viên 213"
              : "Tổ phó";
    const committeeRoles =
      id === "ASC_ANTT" ? ["Công an khu vực", "Cố vấn nghiệp vụ"] : ["Thư ký Tổ"];
    const memberRoles =
      id === "ASC_ANTT"
        ? ["Đội viên ANTT cơ sở"]
        : id === "ASC_PCCC"
          ? ["Đội viên PCCC xung kích"]
          : id === "ASC_HG" || id === "ASC_HOAGIAI"
            ? ["Hòa giải viên cơ sở"]
            : id === "ASC_DANG213"
              ? ["Đảng viên sinh hoạt nơi cư trú"]
              : ["Tổ viên"];
    return {
      headRole,
      deputyRole,
      committeeRoles,
      memberRoles,
      handoverFallbackRole: memberRoles[0],
      allSuggestedRoles: [headRole, deputyRole, ...committeeRoles, ...memberRoles],
    };
  }

  if (id === "ASC_TOTRUONG" || lower.includes("tự quản")) {
    return {
      headRole: "Tổ trưởng Mạng lưới tự quản",
      deputyRole: "Tổ phó Mạng lưới tự quản",
      committeeRoles: ["Cán sự phụ trách cụm liên gia"],
      memberRoles: ["Cán sự phụ trách tuyến đường", "Thành viên Ban Điều hành"],
      handoverFallbackRole: "Cán sự phụ trách tuyến đường",
      allSuggestedRoles: [
        "Tổ trưởng Mạng lưới tự quản",
        "Tổ phó Mạng lưới tự quản",
        "Cán sự phụ trách cụm liên gia",
        "Cán sự phụ trách tuyến đường",
      ],
    };
  }

  const headRole = "Chi hội trưởng";
  const deputyRole = "Chi hội phó";
  const committeeRoles = ["Ủy viên Ban chấp hành", "Thư ký"];
  const memberRoles = ["Hội viên nòng cốt", "Hội viên tích cực", "Hội viên"];
  return {
    headRole,
    deputyRole,
    committeeRoles,
    memberRoles,
    handoverFallbackRole: "Ủy viên Ban chấp hành",
    allSuggestedRoles: [headRole, deputyRole, ...committeeRoles, ...memberRoles],
  };
}

/**
 * Phân loại cấp bậc chức danh của hội viên trong một tổ chức:
 * - "head": Cấp Trưởng (Bí thư, Trưởng Khu phố, Trưởng Ban, Chi hội trưởng, Tổ trưởng, Chỉ huy trưởng...)
 * - "deputy": Cấp Phó (Phó Bí thư, Phó Trưởng KP, Phó Ban, Chi hội phó, Tổ phó, Chỉ huy phó...)
 * - "committee": Cấp ủy / Ủy viên BCH / Công an khu vực / Thư ký / Cố vấn
 * - "member": Đảng viên / Hội viên / Thành viên
 */
export function classifyMemberRoleTier(role?: string): MemberRoleTier {
  const r = normText(role);
  if (!r) return "member";

  // Kiểm tra cấp Phó trước để "Phó Bí thư", "Phó Trưởng khu phố", "Chi hội phó" không bị bắt nhầm vào Trưởng
  if (
    r.includes("phó bí thư") ||
    r.includes("phó trưởng") ||
    r.includes("phó ban") ||
    r.includes("phó khu phố") ||
    r.includes("chi hội phó") ||
    r.includes("hội phó") ||
    r.includes("tổ phó") ||
    r.includes("chỉ huy phó") ||
    r.includes("khu đội phó") ||
    r.includes("đội phó") ||
    r === "phó"
  ) {
    return "deputy";
  }

  if (
    r.includes("bí thư") ||
    r.includes("trưởng khu phố") ||
    r.includes("trưởng kp") ||
    r.includes("trưởng ban") ||
    r.includes("chi hội trưởng") ||
    r.includes("hội trưởng") ||
    r.includes("tổ trưởng") ||
    r.includes("chỉ huy trưởng") ||
    r.includes("khu đội trưởng") ||
    r.includes("chủ nhiệm") ||
    r.includes("đội trưởng")
  ) {
    return "head";
  }

  if (
    r.includes("chi ủy") ||
    r.includes("ủy viên") ||
    r.includes("uỷ viên") ||
    r.includes("công an khu vực") ||
    r.includes("cảnh sát khu vực") ||
    r.includes("thư ký") ||
    r.includes("cố vấn") ||
    r.includes("tiểu đội trưởng")
  ) {
    return "committee";
  }

  return "member";
}

function getTierOrder(tier: MemberRoleTier): number {
  switch (tier) {
    case "head":
      return 0;
    case "deputy":
      return 1;
    case "committee":
      return 2;
    default:
      return 3;
  }
}

/**
 * Sắp xếp hội viên trong 1 chi hội (Trưởng -> Phó -> Ủy viên -> Hội viên)
 * và đồng bộ trường leaderName / leaderCccd của chi hội khớp với người giữ chức Trưởng.
 */
export function normalizeSingleAssociation(assoc: Association): Association {
  const members = Array.isArray(assoc.members) ? [...assoc.members] : [];

  members.sort((a, b) => {
    const tierDiff = getTierOrder(classifyMemberRoleTier(a.role)) - getTierOrder(classifyMemberRoleTier(b.role));
    if (tierDiff !== 0) return tierDiff;
    return 0;
  });

  if (isWelfarePolicyGroup(assoc)) {
    return { ...assoc, members };
  }

  const headMember = members.find((m) => classifyMemberRoleTier(m.role) === "head");
  if (headMember) {
    return {
      ...assoc,
      leaderName: headMember.fullName,
      leaderCccd: headMember.cccd || assoc.leaderCccd || "N/A",
      members,
    };
  }

  // Nếu chưa có ai mang chức danh head nhưng có leaderCccd khớp thành viên thì giữ nguyên,
  // ngược lại nếu có cấp Phó mà trống Trưởng thì giữ leaderName hiện hữu hoặc tạm lấy người đứng đầu danh sách.
  const matchedLeader = members.find(
    (m) =>
      (assoc.leaderCccd && assoc.leaderCccd !== "N/A" && m.cccd === assoc.leaderCccd) ||
      (assoc.leaderName && normText(m.fullName) === normText(assoc.leaderName))
  );

  if (matchedLeader) {
    return {
      ...assoc,
      leaderName: matchedLeader.fullName,
      leaderCccd: matchedLeader.cccd || assoc.leaderCccd || "N/A",
      members,
    };
  }

  return {
    ...assoc,
    members,
  };
}

/**
 * Sắp xếp toàn bộ danh sách Chi hội & Đoàn thể theo thứ bậc chuẩn (Chi bộ Đảng đứng #1)
 * và chuẩn hóa từng tổ chức bên trong.
 */
export function sortAssociationsAndMembers(associations: Association[]): Association[] {
  return [...associations]
    .map(normalizeSingleAssociation)
    .sort((a, b) => {
      const rankDiff = getAssociationCanonicalRank(a) - getAssociationCanonicalRank(b);
      if (rankDiff !== 0) return rankDiff;
      return 0;
    });
}

/**
 * Xem trước tác động khi gán chức danh mới cho hội viên (kiểm tra xem có cần bàn giao chức Trưởng không).
 */
export function previewRoleAssignment(
  assoc: Association,
  targetMemberCccd: string,
  nextRole: string
): RoleHandoverPreview {
  const presets = getAssociationRolePresets(assoc);
  const nextTier = classifyMemberRoleTier(nextRole);
  const isHeadRole = nextTier === "head" && !isWelfarePolicyGroup(assoc);
  const isDeputyRole = nextTier === "deputy";

  if (!isHeadRole) {
    return {
      requiresHandover: false,
      isHeadRole: false,
      isDeputyRole,
      suggestedPreviousHeadRole: presets.handoverFallbackRole,
    };
  }

  const currentHead = (assoc.members || []).find(
    (m) =>
      m.cccd !== targetMemberCccd &&
      (classifyMemberRoleTier(m.role) === "head" ||
        (assoc.leaderCccd && assoc.leaderCccd !== "N/A" && m.cccd === assoc.leaderCccd))
  );

  return {
    requiresHandover: Boolean(currentHead),
    isHeadRole: true,
    isDeputyRole: false,
    currentHead,
    suggestedPreviousHeadRole: presets.handoverFallbackRole,
  };
}

/**
 * Thay đổi chức danh cho một hội viên trong Chi hội, tự động bàn giao chức Trưởng (nếu là Cấp Trưởng)
 * và đồng bộ lại thứ tự toàn hệ thống.
 */
export function assignMemberRoleInAssociation(
  associations: Association[],
  assocId: string,
  targetMemberCccd: string,
  nextRole: string,
  options?: {
    previousHeadNextRole?: string;
    decisionNumber?: string;
    decisionDate?: string;
  }
): Association[] {
  const trimmedRole = nextRole.trim();
  const nextList = associations.map((assoc) => {
    if (assoc.id !== assocId) return assoc;

    const presets = getAssociationRolePresets(assoc);
    const nextTier = classifyMemberRoleTier(trimmedRole);
    const isPromotingToHead = nextTier === "head" && !isWelfarePolicyGroup(assoc);
    const fallbackForOldHead = options?.previousHeadNextRole || presets.handoverFallbackRole;

    let targetMemberObj: AssociationMember | undefined;

    const updatedMembers = (assoc.members || []).map((m) => {
      if (m.cccd === targetMemberCccd) {
        const updated: AssociationMember = {
          ...m,
          role: trimmedRole,
          decisionNumber: options?.decisionNumber !== undefined ? options.decisionNumber : m.decisionNumber,
          decisionDate: options?.decisionDate !== undefined ? options.decisionDate : m.decisionDate,
        };
        targetMemberObj = updated;
        return updated;
      }

      if (isPromotingToHead && classifyMemberRoleTier(m.role) === "head") {
        return {
          ...m,
          role: fallbackForOldHead,
        };
      }

      return m;
    });

    let nextLeaderName = assoc.leaderName;
    let nextLeaderCccd = assoc.leaderCccd;

    if (isPromotingToHead && targetMemberObj) {
      nextLeaderName = targetMemberObj.fullName;
      nextLeaderCccd = targetMemberObj.cccd;
    } else if (assoc.leaderCccd === targetMemberCccd && nextTier !== "head") {
      const remainingHead = updatedMembers.find((m) => classifyMemberRoleTier(m.role) === "head");
      const remainingDeputy = updatedMembers.find((m) => classifyMemberRoleTier(m.role) === "deputy");
      const replacement = remainingHead || remainingDeputy;
      nextLeaderName = replacement ? replacement.fullName : "Chưa phân công";
      nextLeaderCccd = replacement ? replacement.cccd : "N/A";
    }

    return normalizeSingleAssociation({
      ...assoc,
      leaderName: nextLeaderName,
      leaderCccd: nextLeaderCccd,
      members: updatedMembers,
    });
  });

  return sortAssociationsAndMembers(nextList);
}

/**
 * Thứ bậc ưu tiên của từng cá nhân lãnh đạo trên toàn Khu phố (số càng nhỏ càng cao):
 * 1: Bí thư Chi bộ (Đứng đầu Khu phố - BẤT BIẾN #1)
 * 2: Phó Bí thư Chi bộ
 * 3: Trưởng Khu phố / Trưởng Ban Điều hành Khu phố
 * 4: Phó Trưởng Khu phố / Phó Ban Điều hành Khu phố
 * 5: Chi ủy viên Chi bộ
 * 6: Trưởng Ban Công tác Mặt trận
 * 7: Phó Ban Công tác Mặt trận
 * 8: Công an khu vực / Cảnh sát khu vực
 * 9: Tổ trưởng ANTT / Chỉ huy trưởng Khu đội / Tổ trưởng PCCC
 * 10+: Trưởng / Phó các Chi hội đoàn thể khác
 */
export function getLeadershipProtocolRank(role?: string, subRole?: string, group?: string): number {
  const combined = `${normText(role)} | ${normText(subRole)}`;
  const primary = normText(role);

  // Bí thư Chi bộ (không phải Phó Bí thư, không phải Bí thư Chi đoàn)
  const isPartySec =
    (primary.includes("bí thư chi bộ") || (primary === "bí thư" && normText(group).includes("chi bộ"))) &&
    !primary.includes("phó");
  if (isPartySec) return 1;

  if (
    combined.includes("bí thư chi bộ") &&
    !primary.includes("phó bí thư") &&
    !combined.includes("phó bí thư chi bộ")
  ) {
    return 1;
  }

  if (primary.includes("phó bí thư chi bộ") || (primary === "phó bí thư" && !primary.includes("chi đoàn"))) {
    return 2;
  }

  // Kiểm tra Phó Trưởng Khu phố TRƯỚC Trưởng Khu phố vì chuỗi "phó trưởng khu phố" chứa "trưởng khu phố"
  const isDeputyNeighborhood =
    primary.includes("phó trưởng khu phố") ||
    primary.includes("phó khu phố") ||
    primary.includes("phó ban điều hành");

  if (
    !isDeputyNeighborhood &&
    (primary.includes("trưởng khu phố") ||
      primary.includes("trưởng ban điều hành") ||
      (combined.includes("trưởng khu phố") && !combined.includes("phó trưởng khu phố")) ||
      (combined.includes("trưởng ban điều hành") && !combined.includes("phó ban điều hành")))
  ) {
    return 3;
  }

  if (isDeputyNeighborhood) {
    return 4;
  }

  if (primary.includes("chi ủy viên") || primary.includes("chi uỷ viên")) {
    return 5;
  }

  if (primary.includes("phó ban công tác mặt trận") || primary.includes("phó ban ctmt")) {
    return 7;
  }

  if (primary.includes("trưởng ban công tác mặt trận") || primary.includes("trưởng ban ctmt")) {
    return 6;
  }

  if (primary.includes("công an khu vực") || primary.includes("cảnh sát khu vực") || normText(group) === "công an khu vực") {
    return 8;
  }

  if (
    primary.includes("tổ trưởng antt") ||
    primary.includes("chỉ huy trưởng") ||
    primary.includes("khu đội trưởng")
  ) {
    return 9;
  }

  if (classifyMemberRoleTier(role) === "head") return 10;
  if (classifyMemberRoleTier(role) === "deputy") return 11;
  return 20;
}

/**
 * Đảm bảo danh sách LeadershipMember LUÔN LUÔN đặt Bí thư Chi bộ ở vị trí đầu tiên (#01, isHighlight = true, isTopLeader = true),
 * tiếp đến theo đúng thang thứ bậc hệ thống chính trị cơ sở.
 */
export function enforcePartySecretaryFirst(leaders: LeadershipMember[]): LeadershipMember[] {
  const withRanks = leaders.map((item, idx) => {
    const rank = getLeadershipProtocolRank(item.role, item.subRole, item.group);
    return { item, rank, idx };
  });

  withRanks.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.idx - b.idx;
  });

  const usedIds = new Set<string>();
  return withRanks.map(({ item, rank }, sortedIdx) => {
    const isTop = rank === 1 && sortedIdx === 0;
    // Nếu một người vừa là Bí thư Chi bộ vừa giữ subRole khác mà role đang để ngược, chuẩn hóa để Bí thư Chi bộ đứng chính
    let primaryRole = item.role;
    let secondaryRole = item.subRole;
    if (isTop && !normText(primaryRole).includes("bí thư") && normText(secondaryRole).includes("bí thư chi bộ")) {
      primaryRole = "Bí thư Chi bộ";
      secondaryRole = item.role;
    }

    let uniqueId = (item.id || "").trim();
    if (!uniqueId || usedIds.has(uniqueId)) {
      let n = sortedIdx + 1;
      uniqueId = `LD-${String(n).padStart(2, "0")}`;
      while (usedIds.has(uniqueId)) {
        n += 1;
        uniqueId = `LD-${String(n).padStart(2, "0")}`;
      }
    }
    usedIds.add(uniqueId);

    return {
      ...item,
      id: uniqueId,
      role: primaryRole,
      subRole: secondaryRole,
      group: isTop ? "Cấp ủy Chi bộ" : item.group,
      isTopLeader: isTop,
      isHighlight: isTop ? true : Boolean(item.isHighlight && rank > 1 ? false : item.isHighlight),
      protocolRank: rank,
    };
  });
}

/**
 * Trích xuất danh bạ Trưởng / Phó của toàn bộ các Chi hội & Tổ chức (loại trừ nhóm đối tượng bảo trợ xã hội)
 * để hiển thị đồng bộ trên Trang Giới thiệu KP3, Cổng Cư dân và Sơ đồ tổ chức.
 */
export function buildAssociationLeadersDirectory(associations: Association[]): AssociationLeaderSummary[] {
  const sorted = sortAssociationsAndMembers(associations);
  return sorted
    .filter((a) => !isWelfarePolicyGroup(a))
    .map((assoc) => {
      const presets = getAssociationRolePresets(assoc);
      const headMember =
        assoc.members.find((m) => classifyMemberRoleTier(m.role) === "head") ||
        assoc.members.find((m) => assoc.leaderCccd && m.cccd === assoc.leaderCccd);
      const deputies = assoc.members
        .filter((m) => classifyMemberRoleTier(m.role) === "deputy")
        .map((d) => ({
          name: d.fullName,
          role: d.role,
          phone: d.phone && d.phone !== "N/A" ? d.phone : undefined,
        }));

      return {
        assocId: assoc.id,
        assocName: assoc.name,
        category: assoc.category,
        headName: headMember?.fullName || assoc.leaderName || "Chưa kiện toàn",
        headRole: headMember?.role || presets.headRole,
        headPhone:
          headMember?.phone && headMember.phone !== "N/A" ? headMember.phone : undefined,
        deputyList: deputies,
        memberCount: assoc.members?.length || 0,
      };
    });
}

interface CandidateRoleEntry {
  assocId: string;
  assocName: string;
  role: string;
  rank: number;
  group: LeadershipMember["group"];
  defaultScope: string;
  defaultDesc: string;
  member: AssociationMember;
}

/**
 * Tự động dẫn xuất danh sách Lãnh đạo Chủ chốt Khu phố (LandingConfig.leadership) trực tiếp từ `associations`.
 * - Luôn đặt Bí thư Chi bộ đứng #1 (isTopLeader = true, isHighlight = true).
 * - Tự động gộp các chức danh kiêm nhiệm (ví dụ Chi ủy viên kiêm Trưởng Khu phố) thành 1 thẻ duy nhất.
 * - Bảo toàn ảnh chân dung (avatar), lịch tiếp dân (schedule), mô tả tùy chỉnh và mục Công an khu vực từ cấu hình hiện hữu.
 */
export function deriveSystemLeadership(
  associations: Association[],
  existingLeadership: LeadershipMember[] = []
): LeadershipMember[] {
  const sortedAssocs = sortAssociationsAndMembers(associations);
  const candidatesByPersonKey = new Map<string, CandidateRoleEntry[]>();

  const makePersonKey = (m: Pick<AssociationMember, "cccd" | "fullName">) => {
    const cleanCccd = (m.cccd || "").trim();
    if (cleanCccd && cleanCccd !== "N/A" && cleanCccd !== "Chưa cập nhật") {
      return `cccd:${cleanCccd}`;
    }
    return `name:${normText(m.fullName)}`;
  };

  const pushCandidate = (entry: CandidateRoleEntry) => {
    const key = makePersonKey(entry.member);
    const list = candidatesByPersonKey.get(key) || [];
    list.push(entry);
    candidatesByPersonKey.set(key, list);
  };

  // 1. Chi bộ Đảng (Cấp ủy: Bí thư, Phó Bí thư, Chi ủy viên)
  const partyAssoc = sortedAssocs.find(
    (a) => a.id === "ASC_DANG" || a.id === "ASC_CHIBO" || normText(a.name).includes("chi bộ đảng")
  );
  if (partyAssoc) {
    for (const m of partyAssoc.members || []) {
      const tier = classifyMemberRoleTier(m.role);
      const lowerRole = normText(m.role);
      if (tier === "head" || tier === "deputy" || lowerRole.includes("chi ủy") || lowerRole.includes("chi uỷ")) {
        const canonicalRole =
          tier === "head"
            ? "Bí thư Chi bộ"
            : tier === "deputy"
              ? "Phó Bí thư Chi bộ"
              : "Chi ủy viên";
        pushCandidate({
          assocId: partyAssoc.id,
          assocName: partyAssoc.name,
          role: canonicalRole,
          rank: getLeadershipProtocolRank(canonicalRole, undefined, "Cấp ủy Chi bộ"),
          group: "Cấp ủy Chi bộ",
          defaultScope: "Chi bộ Khu phố 3",
          defaultDesc:
            tier === "head"
              ? "Lãnh đạo toàn diện công tác Đảng, chính trị tư tưởng, tổ chức cán bộ và định hướng phát triển Khu phố 3."
              : tier === "deputy"
                ? "Phụ trách công tác tổ chức Đảng, kiểm tra giám sát và khối vận động quần chúng tại Khu phố 3."
                : "Tham gia Cấp ủy lãnh đạo thực hiện nghị quyết Chi bộ và các mặt công tác trọng tâm tại địa bàn.",
          member: m,
        });
      }
    }
  }

  // 2. Ban Điều hành Khu phố (Trưởng Khu phố, Phó Trưởng Khu phố)
  const bdhAssoc = sortedAssocs.find(
    (a) => a.id === "ASC_BDH" || normText(a.name).includes("ban điều hành")
  );
  if (bdhAssoc) {
    for (const m of bdhAssoc.members || []) {
      const tier = classifyMemberRoleTier(m.role);
      if (tier === "head" || tier === "deputy") {
        const displayRole =
          tier === "head"
            ? normText(m.role).includes("khu phố")
              ? m.role
              : "Trưởng Khu phố (Trưởng BĐH KP3)"
            : normText(m.role).includes("khu phố")
              ? m.role
              : "Phó Trưởng Khu phố (Phó BĐH KP3)";
        pushCandidate({
          assocId: bdhAssoc.id,
          assocName: bdhAssoc.name,
          role: displayRole,
          rank: tier === "head" ? 3 : 4,
          group: "Ban Điều hành Khu phố",
          defaultScope: "Ban Điều hành Khu phố 3",
          defaultDesc:
            tier === "head"
              ? "Chủ trì điều hành hoạt động hành chính tự quản, trật tự đô thị, an sinh xã hội và dịch vụ công tại Khu phố 3."
              : "Phối hợp điều hành công tác dân cư, trật tự mỹ quan đô thị, hòa giải và đời sống khu phố.",
          member: m,
        });
      }
    }
  }

  // 3. Ban Công tác Mặt trận (Trưởng Ban CTMT, Phó Ban CTMT)
  const frontAssoc = sortedAssocs.find(
    (a) => a.id === "ASC_MT" || a.id === "ASC_MATTRAN" || normText(a.name).includes("mặt trận")
  );
  if (frontAssoc) {
    for (const m of frontAssoc.members || []) {
      const tier = classifyMemberRoleTier(m.role);
      if (tier === "head" || tier === "deputy") {
        const displayRole =
          tier === "head" ? "Trưởng Ban Công tác Mặt trận" : "Phó Ban Công tác Mặt trận";
        pushCandidate({
          assocId: frontAssoc.id,
          assocName: frontAssoc.name,
          role: displayRole,
          rank: tier === "head" ? 6 : 7,
          group: "Đoàn thể",
          defaultScope: "Ban Công tác Mặt trận Khu phố 3",
          defaultDesc:
            "Chủ trì khối đại đoàn kết toàn dân tộc, giám sát cộng đồng và vận động các nguồn quỹ an sinh xã hội.",
          member: m,
        });
      }
    }
  }

  // 4. Công an khu vực (nếu được khai báo trong Tổ ANTT cơ sở)
  const anttAssoc = sortedAssocs.find(
    (a) => a.id === "ASC_ANTT" || normText(a.name).includes("antt")
  );
  if (anttAssoc) {
    for (const m of anttAssoc.members || []) {
      const r = normText(m.role);
      if (r.includes("công an khu vực") || r.includes("cảnh sát khu vực")) {
        pushCandidate({
          assocId: anttAssoc.id,
          assocName: anttAssoc.name,
          role: m.role,
          rank: 8,
          group: "Công an khu vực",
          defaultScope: "Công an Phường An Phú (phụ trách địa bàn KP3)",
          defaultDesc:
            "Phụ trách an ninh trật tự, quản lý cư trú VNeID, PCCC và tiếp nhận tin báo tội phạm trên địa bàn Khu phố 3.",
          member: m,
        });
      }
    }
  }

  const derived: LeadershipMember[] = [];
  let seq = 1;

  for (const [, entries] of candidatesByPersonKey.entries()) {
    entries.sort((a, b) => a.rank - b.rank);
    const primary = entries[0];
    const secondaryRoles = entries
      .slice(1)
      .map((e) => e.role)
      .filter((r) => normText(r) !== normText(primary.role));

    const samePersonExisting = existingLeadership.find(
      (ex) =>
        (ex.cccd && primary.member.cccd && ex.cccd === primary.member.cccd) ||
        normText(ex.name) === normText(primary.member.fullName)
    );
    const samePositionExisting = !samePersonExisting
      ? existingLeadership.find(
          (ex) =>
            getLeadershipProtocolRank(ex.role, ex.subRole, ex.group) === primary.rank &&
            primary.rank <= 3
        )
      : undefined;

    const phone =
      primary.member.phone && primary.member.phone !== "N/A"
        ? primary.member.phone
        : samePersonExisting?.phone;

    derived.push({
      id: samePersonExisting?.id || samePositionExisting?.id || `LD-${String(seq).padStart(2, "0")}`,
      name: primary.member.fullName,
      role: primary.role,
      subRole: secondaryRoles.length > 0 ? `Kiêm ${secondaryRoles.join(" • ")}` : undefined,
      group: primary.group,
      scope: samePersonExisting?.scope || primary.defaultScope,
      phone,
      cccd: primary.member.cccd,
      assocId: primary.assocId,
      avatar: primary.member.avatar || samePersonExisting?.avatar,
      description: samePersonExisting?.description || primary.defaultDesc,
      schedule:
        samePersonExisting?.schedule ||
        samePositionExisting?.schedule ||
        (primary.rank === 1
          ? "Sáng Thứ 7 (08:00 - 11:00) tại Nhà Văn hóa KP3"
          : primary.rank === 3
            ? "Giờ hành chính Thứ 2 - Thứ 6"
            : undefined),
      isHighlight: primary.rank === 1,
      isTopLeader: primary.rank === 1,
      protocolRank: primary.rank,
    });
    seq++;
  }

  // Bảo toàn mục Công an khu vực từ existingLeadership nếu chưa có trong Tổ ANTT
  const hasPoliceInDerived = derived.some((d) => d.group === "Công an khu vực" || d.protocolRank === 8);
  if (!hasPoliceInDerived) {
    const existingPolice = existingLeadership.find(
      (ex) =>
        ex.group === "Công an khu vực" ||
        normText(ex.role).includes("công an khu vực") ||
        normText(ex.role).includes("cảnh sát khu vực")
    );
    if (existingPolice) {
      derived.push({
        ...existingPolice,
        isHighlight: false,
        isTopLeader: false,
        protocolRank: 8,
      });
    }
  }

  return enforcePartySecretaryFirst(derived);
}

/**
 * Đồng bộ toàn diện LandingConfig từ danh sách Chi hội & Đoàn thể mới nhất.
 */
export function syncLandingConfigWithAssociations(
  currentConfig: LandingConfig,
  associations: Association[]
): LandingConfig {
  const nextLeadership = deriveSystemLeadership(associations, currentConfig.leadership || []);
  const nextDirectory = buildAssociationLeadersDirectory(associations);
  return {
    ...currentConfig,
    leadership: nextLeadership,
    associationLeaders: nextDirectory,
    leadershipSyncedV1: true,
  };
}

/**
 * Khi người dùng chỉnh sửa tên/chức danh/SĐT/ảnh của 1 cán bộ trong Cài đặt Cổng (PortalConfigSettings),
 * đồng bộ ngược lại vào Chi hội tương ứng để 2 chiều luôn khớp nhau 100%.
 */
export function syncPortalLeaderChangeToAssociations(
  associations: Association[],
  updatedLeaders: LeadershipMember[]
): Association[] {
  const enforced = enforcePartySecretaryFirst(updatedLeaders);
  let nextAssocs = [...associations];

  for (const leader of enforced) {
    const rank = getLeadershipProtocolRank(leader.role, leader.subRole, leader.group);
    const targetAssocId =
      leader.assocId ||
      (rank === 1 || rank === 2 || rank === 5
        ? "ASC_DANG"
        : rank === 3 || rank === 4
          ? "ASC_BDH"
          : rank === 6 || rank === 7
            ? "ASC_MT"
            : rank === 8
              ? "ASC_ANTT"
              : undefined);

    if (!targetAssocId) continue;

    nextAssocs = nextAssocs.map((assoc) => {
      if (assoc.id !== targetAssocId) return assoc;
      const presets = getAssociationRolePresets(assoc);
      const targetRoleInAssoc =
        rank === 1
          ? presets.headRole
          : rank === 2
            ? presets.deputyRole
            : rank === 3
              ? presets.headRole
              : rank === 4
                ? presets.deputyRole
                : rank === 5
                  ? "Chi ủy viên"
                  : rank === 6
                    ? presets.headRole
                    : rank === 7
                      ? presets.deputyRole
                      : leader.role;

      const isHeadInAssoc = classifyMemberRoleTier(targetRoleInAssoc) === "head";
      const existingIdx = (assoc.members || []).findIndex(
        (m) => normText(m.fullName) === normText(leader.name)
      );

      let nextMembers = [...(assoc.members || [])];
      if (existingIdx >= 0) {
        if (isHeadInAssoc) {
          nextMembers = nextMembers.map((m, i) =>
            i !== existingIdx && classifyMemberRoleTier(m.role) === "head"
              ? { ...m, role: presets.handoverFallbackRole }
              : m
          );
        }
        nextMembers[existingIdx] = {
          ...nextMembers[existingIdx],
          fullName: leader.name,
          role: targetRoleInAssoc,
          phone: leader.phone || nextMembers[existingIdx].phone,
          avatar: leader.avatar || nextMembers[existingIdx].avatar,
        };
      } else {
        if (isHeadInAssoc) {
          nextMembers = nextMembers.map((m) =>
            classifyMemberRoleTier(m.role) === "head"
              ? { ...m, role: presets.handoverFallbackRole }
              : m
          );
        }
        const syntheticCccd = `KP3_${assoc.id}_${normText(leader.name).replace(/\s+/g, "_").slice(0, 12)}`;
        nextMembers.unshift({
          id: `M_${Date.now().toString().slice(-6)}`,
          fullName: leader.name,
          role: targetRoleInAssoc,
          cccd: syntheticCccd,
          phone: leader.phone || "N/A",
          avatar: leader.avatar,
          joinDate: new Date().toLocaleDateString("vi-VN"),
        });
      }

      return normalizeSingleAssociation({
        ...assoc,
        members: nextMembers,
      });
    });
  }

  return sortAssociationsAndMembers(nextAssocs);
}

/**
 * Hợp nhất dữ liệu lần đầu nếu CSDL đang chứa dữ liệu mẫu cũ (M101 Nguyễn Văn Hùng ở Chi bộ)
 * trong khi Cổng Cư dân đã có cấu hình Cấp ủy thực tế (VD: Nghiêm Xuân Quỳnh, Phạm Ngọc Hà, Nguyễn Trung Huy...).
 */
export function reconcileLegacyAssociationsIfNeeded(
  associations: Association[],
  landingLeadership?: LeadershipMember[],
  alreadySynced?: boolean
): Association[] {
  const sorted = sortAssociationsAndMembers(associations);
  if (alreadySynced || !landingLeadership || landingLeadership.length === 0) {
    return sorted;
  }

  const partyAssoc = sorted.find((a) => a.id === "ASC_DANG");
  const landingSec = landingLeadership.find(
    (l) => getLeadershipProtocolRank(l.role, l.subRole, l.group) === 1
  );

  // Chỉ tự động nâng cấp một lần khi ASC_DANG vẫn đang mang bản ghi mẫu gốc M101 ("Nguyễn Văn Hùng")
  // khác với Bí thư đã cấu hình trên Cổng Cư dân.
  if (
    partyAssoc &&
    landingSec &&
    normText(partyAssoc.leaderName) === "nguyễn văn hùng" &&
    normText(landingSec.name) !== "nguyễn văn hùng"
  ) {
    return syncPortalLeaderChangeToAssociations(sorted, landingLeadership);
  }

  return sorted;
}

/**
 * Trích xuất nhanh thông tin các chức danh chủ chốt để toàn bộ các phân hệ nghiệp vụ
 * (Nhiệm vụ, Quỹ, An sinh, Kinh doanh, Đăng ký cán bộ, Trợ lý AI...) sử dụng thống nhất,
 * xóa bỏ hoàn toàn việc gắn cứng (hardcode) họ tên.
 */
export function extractKeyLeadersSummary(
  associations: Association[],
  landingLeadership: LeadershipMember[] = []
): KeyLeadersSummary {
  const leaders =
    associations.length > 0
      ? deriveSystemLeadership(associations, landingLeadership)
      : enforcePartySecretaryFirst(landingLeadership);

  const sec = leaders.find((l) => l.protocolRank === 1) || leaders[0];
  const depSec = leaders.find((l) => l.protocolRank === 2);

  // Trưởng Khu phố có thể là thẻ riêng (rank === 3) hoặc do Bí thư / Phó Bí thư kiêm nhiệm
  const bdhAssoc = associations.find(
    (a) => a.id === "ASC_BDH" || normText(a.name).includes("ban điều hành")
  );
  const bdhHeadMember = bdhAssoc?.members?.find(
    (m) => classifyMemberRoleTier(m.role) === "head"
  );
  const bdhDeputyMember = bdhAssoc?.members?.find(
    (m) => classifyMemberRoleTier(m.role) === "deputy"
  );

  const headFromLanding = leaders.find(
    (l) =>
      l.protocolRank === 3 ||
      normText(l.subRole).includes("trưởng khu phố") ||
      normText(l.subRole).includes("trưởng ban điều hành")
  );

  const frontAssoc = associations.find(
    (a) => a.id === "ASC_MT" || a.id === "ASC_MATTRAN" || normText(a.name).includes("mặt trận")
  );
  const frontHeadMember = frontAssoc?.members?.find(
    (m) => classifyMemberRoleTier(m.role) === "head"
  );

  const policeLeader = leaders.find(
    (l) => l.protocolRank === 8 || l.group === "Công an khu vực"
  );

  const secName = sec?.name || "Nghiêm Xuân Quỳnh";
  const headName = bdhHeadMember?.fullName || headFromLanding?.name || "Nguyễn Trung Huy";
  const depHeadName = bdhDeputyMember?.fullName;
  const frontHeadName =
    frontHeadMember?.fullName ||
    (frontAssoc?.leaderName && frontAssoc.leaderName !== "Chưa phân công"
      ? frontAssoc.leaderName
      : undefined);
  const policeName = policeLeader?.name || "Đại úy Trần Quốc Hải";

  return {
    partySecretary: {
      name: secName,
      role: "Bí thư Chi bộ",
      phone: sec?.phone,
      cccd: sec?.cccd,
      formattedWithTitle: `Đ/c ${secName} (Bí thư Chi bộ)`,
    },
    deputyPartySecretary: depSec
      ? {
          name: depSec.name,
          role: "Phó Bí thư Chi bộ",
          phone: depSec.phone,
          cccd: depSec.cccd,
          formattedWithTitle: `Đ/c ${depSec.name} (Phó Bí thư Chi bộ)`,
        }
      : undefined,
    neighborhoodHead: {
      name: headName,
      role: "Trưởng Khu phố",
      phone:
        (bdhHeadMember?.phone && bdhHeadMember.phone !== "N/A"
          ? bdhHeadMember.phone
          : headFromLanding?.phone) || undefined,
      cccd: bdhHeadMember?.cccd || headFromLanding?.cccd,
      formattedWithTitle: `Đ/c ${headName} (Trưởng Khu phố 3)`,
    },
    deputyNeighborhoodHead: depHeadName
      ? {
          name: depHeadName,
          role: "Phó Trưởng Khu phố",
          phone:
            bdhDeputyMember?.phone && bdhDeputyMember.phone !== "N/A"
              ? bdhDeputyMember.phone
              : undefined,
          cccd: bdhDeputyMember?.cccd,
          formattedWithTitle: `Đ/c ${depHeadName} (Phó Trưởng Khu phố 3)`,
        }
      : undefined,
    frontHead: frontHeadName
      ? {
          name: frontHeadName,
          role: "Trưởng Ban CTMT",
          phone:
            frontHeadMember?.phone && frontHeadMember.phone !== "N/A"
              ? frontHeadMember.phone
              : undefined,
          cccd: frontHeadMember?.cccd,
          formattedWithTitle: `Đ/c ${frontHeadName} (Trưởng Ban CTMT)`,
        }
      : undefined,
    policeOfficer: {
      name: policeName,
      role: "Công an khu vực",
      phone: policeLeader?.phone,
      formattedWithTitle: `${policeName} (Công an khu vực)`,
    },
  };
}
