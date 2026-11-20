import {
  AssignedKp3Officer,
  Association,
  AssociationMember,
  RecurringReminder,
  ScheduleEvent,
  TaskItem,
} from "../types";
import { classifyMemberRoleTier, extractKeyLeadersSummary } from "./leadershipSync";

function norm(input?: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findAssociationForRoleOrUnit(
  associations: Association[],
  associationId?: string,
  unitOrRole?: string
): Association | undefined {
  if (!associations || associations.length === 0) return undefined;

  if (associationId) {
    const byId = associations.find(
      (a) => a.id.toLowerCase() === associationId.trim().toLowerCase()
    );
    if (byId) return byId;
  }

  const r = norm(unitOrRole);
  if (!r) return undefined;

  if (
    r.includes("chi bộ") ||
    r.includes("bí thư chi bộ") ||
    r.includes("phó bí thư chi bộ") ||
    r.includes("chi ủy")
  ) {
    return associations.find((a) => a.id === "ASC_DANG" || norm(a.name).includes("chi bộ"));
  }
  if (
    r.includes("ban điều hành") ||
    r.includes("đhkp") ||
    r.includes("bđh") ||
    r.includes("trưởng khu phố") ||
    r.includes("phó trưởng khu phố")
  ) {
    return associations.find(
      (a) => a.id === "ASC_BDH" || norm(a.name).includes("ban điều hành")
    );
  }
  if (
    r.includes("công tác mặt trận") ||
    r.includes("ban ctmt") ||
    r.includes("mặt trận")
  ) {
    return associations.find(
      (a) =>
        a.id === "ASC_MT" ||
        a.id === "ASC_MATTRAN" ||
        norm(a.name).includes("mặt trận")
    );
  }
  if (r.includes("phụ nữ")) {
    return associations.find(
      (a) => a.id === "ASC_PN" || a.id === "ASC_PHUNU" || norm(a.name).includes("phụ nữ")
    );
  }
  if (r.includes("chi đoàn") || r.includes("thanh niên")) {
    return associations.find(
      (a) =>
        a.id === "ASC_TN" ||
        a.id === "ASC_THANHNIEN" ||
        norm(a.name).includes("thanh niên")
    );
  }
  if (r.includes("cựu chiến binh")) {
    return associations.find(
      (a) => a.id === "ASC_CCB" || norm(a.name).includes("cựu chiến binh")
    );
  }
  if (r.includes("người cao tuổi")) {
    return associations.find(
      (a) => a.id === "ASC_NCT" || norm(a.name).includes("người cao tuổi")
    );
  }
  if (r.includes("chữ thập đỏ")) {
    return associations.find(
      (a) => a.id === "ASC_CTD" || norm(a.name).includes("chữ thập đỏ")
    );
  }
  if (r.includes("antt") || r.includes("an ninh trật tự")) {
    return associations.find(
      (a) => a.id === "ASC_ANTT" || norm(a.name).includes("antt")
    );
  }
  if (r.includes("pccc") || r.includes("tổ liên gia")) {
    return associations.find(
      (a) => a.id === "ASC_PCCC" || norm(a.name).includes("pccc")
    );
  }
  if (r.includes("hòa giải") || r.includes("hoà giải")) {
    return associations.find(
      (a) => a.id === "ASC_HG" || norm(a.name).includes("hoà giải") || norm(a.name).includes("hòa giải")
    );
  }
  if (r.includes("khu đội") || r.includes("dân quân") || r.includes("dqtv")) {
    return associations.find(
      (a) => a.id === "ASC_KHUDOI" || norm(a.name).includes("khu đội")
    );
  }
  if (r.includes("tự quản") || r.includes("tổ trưởng dân phố")) {
    return associations.find(
      (a) => a.id === "ASC_TOTRUONG" || norm(a.name).includes("tự quản")
    );
  }

  return associations.find(
    (a) => norm(a.name) === r || (norm(a.name).length >= 5 && r.includes(norm(a.name)))
  );
}

function getHeadOfAssociation(
  assoc: Association
): { name: string; phone?: string; role: string } | null {
  const headMember = assoc.members?.find(
    (m) => classifyMemberRoleTier(m.role) === "head"
  );
  if (headMember?.fullName) {
    return {
      name: headMember.fullName,
      phone: headMember.phone && headMember.phone !== "N/A" ? headMember.phone : undefined,
      role: headMember.role,
    };
  }
  if (assoc.leaderName && assoc.leaderName !== "Chưa phân công" && assoc.leaderName !== "Chưa xác định") {
    const matched = assoc.members?.find((m) => norm(m.fullName) === norm(assoc.leaderName));
    return {
      name: assoc.leaderName,
      phone: matched?.phone && matched.phone !== "N/A" ? matched.phone : undefined,
      role: matched?.role || "Trưởng ban",
    };
  }
  return null;
}

function getDeputiesOfAssociation(assoc: Association): AssociationMember[] {
  return (assoc.members || []).filter((m) => classifyMemberRoleTier(m.role) === "deputy");
}

function getCommitteesOfAssociation(assoc: Association): AssociationMember[] {
  return (assoc.members || []).filter((m) => classifyMemberRoleTier(m.role) === "committee");
}

function stripRedundantAssocSuffix(role?: string, assocName?: string): string {
  let cleaned = String(role || "").trim();
  if (!cleaned) return "";
  if (assocName) {
    const escaped = assocName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`\\s*\\(${escaped}\\)`, "gi"), "").trim();
  }
  cleaned = cleaned.replace(/\s*\(Ban điều hành khu phố\)/gi, "").trim();
  return cleaned;
}

function formatAttendeesFromOfficers(officers: AssignedKp3Officer[]): string {
  return officers
    .map((o) => {
      const cleanRole = stripRedundantAssocSuffix(o.role);
      return o.delegatedFrom
        ? `${o.name} (${cleanRole} — dự thay ${o.delegatedFrom})`
        : `${o.name} (${cleanRole})`;
    })
    .join("; ");
}

function reconcileHostLabel(host: string, associations: Association[]): string {
  if (!host) return host;
  const h = norm(host);
  const leaders = extractKeyLeadersSummary(associations);

  if (h.includes("bí thư chi bộ") && !h.includes("phó bí thư") && !h.includes("đảng ủy")) {
    const target = `Đ/c ${leaders.partySecretary.name} - Bí thư Chi bộ KP3`;
    if (!h.includes(norm(leaders.partySecretary.name))) {
      return target;
    }
  }
  if (
    (h.includes("trưởng ban điều hành") || h.includes("trưởng khu phố")) &&
    !h.includes("phó") &&
    !h.includes("cán bộ tư pháp")
  ) {
    const target = `Đ/c ${leaders.neighborhoodHead.name} - Trưởng Ban điều hành KP3`;
    if (!h.includes(norm(leaders.neighborhoodHead.name))) {
      return target;
    }
  }
  if (
    (h.includes("trưởng ban ctmt") || h.includes("trưởng ban công tác mặt trận")) &&
    leaders.frontHead?.name
  ) {
    const target = `Đ/c ${leaders.frontHead.name} - Trưởng Ban CTMT KP3`;
    if (!h.includes(norm(leaders.frontHead.name))) {
      return target;
    }
  }
  return host;
}

/**
 * Reconcile chuỗi attendees text: thay thế tên người giữ chức vụ chủ chốt
 * khi nhân sự đã thay đổi trong CSDL Chi hội.
 * Ví dụ: "Nguyễn Văn Hùng (Trưởng Ban CTMT KP3)" → "Trần Thị Mỹ Dung (Trưởng Ban CTMT KP3)"
 */
function reconcileAttendeesText(attendees: string, associations: Association[]): string {
  if (!attendees) return attendees;
  const leaders = extractKeyLeadersSummary(associations);
  let result = attendees;

  // Bí thư Chi bộ
  if (leaders.partySecretary?.name) {
    result = replaceLeaderInAttendeesText(result, leaders.partySecretary.name, [
      "Bí thư Chi bộ",
      "Bí thư Chi bộ KP3",
    ]);
  }
  // Trưởng BĐH
  if (leaders.neighborhoodHead?.name) {
    result = replaceLeaderInAttendeesText(result, leaders.neighborhoodHead.name, [
      "Trưởng Ban Điều hành KP3",
      "Trưởng Ban điều hành KP3",
      "Trưởng Khu phố",
      "Trưởng BĐH KP3",
    ]);
  }
  // Trưởng Ban CTMT
  if (leaders.frontHead?.name) {
    result = replaceLeaderInAttendeesText(result, leaders.frontHead.name, [
      "Trưởng Ban CTMT KP3",
      "Trưởng Ban Công tác Mặt trận KP3",
      "Trưởng Ban CTMT",
    ]);
  }
  // Công an khu vực
  if (leaders.policeOfficer?.name) {
    result = replaceLeaderInAttendeesText(result, leaders.policeOfficer.name, [
      "Công an khu vực KP3",
      "Công an khu vực",
      "CAKV KP3",
    ]);
  }
  return result;
}

/**
 * Tìm pattern "Tên_cũ (Chức vụ)" hoặc "Tên_cũ — Chức vụ" trong chuỗi attendees,
 * thay bằng tên đương nhiệm nếu tên hiện tại không khớp.
 */
function replaceLeaderInAttendeesText(
  text: string,
  currentName: string,
  roleLabels: string[]
): string {
  let result = text;
  for (const roleLabel of roleLabels) {
    // Pattern: "Họ Tên (Chức vụ)" hoặc "Họ Tên — Chức vụ"
    const escapedRole = roleLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match: tên người trước role label (trong ngoặc hoặc sau dấu gạch ngang)
    const paren = new RegExp(
      `([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,5})\\s*\\(\\s*${escapedRole}\\s*\\)`,
      "g"
    );
    const dash = new RegExp(
      `([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,5})\\s*[-–—]\\s*${escapedRole}`,
      "g"
    );

    result = result.replace(paren, (match, oldName) => {
      if (norm(oldName) !== norm(currentName)) {
        return `${currentName} (${roleLabel})`;
      }
      return match;
    });
    result = result.replace(dash, (match, oldName) => {
      if (norm(oldName) !== norm(currentName)) {
        return `${currentName} — ${roleLabel}`;
      }
      return match;
    });
  }
  return result;
}

export function reconcileScheduleWithAssociations(
  schedule: ScheduleEvent,
  associations: Association[]
): { schedule: ScheduleEvent; changed: boolean } {
  if (!associations || associations.length === 0) {
    return { schedule, changed: false };
  }

  let changed = false;
  let nextHost = reconcileHostLabel(schedule.host, associations);
  if (nextHost !== schedule.host) {
    changed = true;
  }

  if (!schedule.assignedOfficers || schedule.assignedOfficers.length === 0) {
    // Reconcile attendees text trực tiếp khi không có assignedOfficers
    let nextAttendees = reconcileAttendeesText(schedule.attendees, associations);
    if (nextAttendees !== schedule.attendees) {
      changed = true;
    }
    return changed
      ? { schedule: { ...schedule, host: nextHost, attendees: nextAttendees }, changed: true }
      : { schedule, changed: false };
  }

  const rebuiltOfficers: AssignedKp3Officer[] = [];
  const handledCommitteeAssocs = new Set<string>();
  let nextLastRescheduleReason = schedule.lastRescheduleReason;
  let nextAdjustmentLogs = schedule.adjustmentLogs;

  const pushUniqueOfficer = (off: AssignedKp3Officer) => {
    const existingIdx = rebuiltOfficers.findIndex((x) => norm(x.name) === norm(off.name));
    if (existingIdx === -1) {
      rebuiltOfficers.push(off);
    }
  };

  for (const off of schedule.assignedOfficers) {
    // Kiểm tra các trường hợp cử người dự thay:
    // - Nếu người đi thay vẫn thuộc đúng Chi hội/BĐH trong CSDL hiện tại -> giữ nguyên người đi thay (chỉ chuẩn hóa tên chức danh gọn gàng)
    // - Nếu người đi thay là dữ liệu mẫu cũ không còn trong Chi hội/BĐH (VD: "Lê Văn Sơn" không thuộc Ban điều hành khu phố) -> tự động cập nhật sang Phó đương nhiệm thật!
    if (
      off.attendanceRole === "deputy_substitute" ||
      Boolean(off.delegatedFrom)
    ) {
      const subAssoc = findAssociationForRoleOrUnit(
        associations,
        off.associationId,
        off.role
      );
      if (subAssoc) {
        const matchedMember = (subAssoc.members || []).find(
          (m) => norm(m.fullName) === norm(off.name)
        );
        if (matchedMember) {
          const cleanRole = stripRedundantAssocSuffix(
            matchedMember.role || off.role,
            subAssoc.name
          );
          if (cleanRole !== off.role) changed = true;
          pushUniqueOfficer({
            ...off,
            role: cleanRole || off.role,
            phone:
              matchedMember.phone && matchedMember.phone !== "N/A"
                ? matchedMember.phone
                : off.phone,
          });
          continue;
        }

        // Người được ghi dự thay không tồn tại trong Chi hội/BĐH thực tế -> thay bằng Phó đương nhiệm
        const deputies = getDeputiesOfAssociation(subAssoc).filter(
          (d) => !off.delegatedFrom || norm(d.fullName) !== norm(off.delegatedFrom)
        );
        const fallbackMember =
          deputies[0] ||
          (subAssoc.members || []).find(
            (m) => !off.delegatedFrom || norm(m.fullName) !== norm(off.delegatedFrom)
          );
        if (fallbackMember) {
          const oldName = off.name;
          const cleanRole = stripRedundantAssocSuffix(
            fallbackMember.role || off.role,
            subAssoc.name
          );
          changed = true;
          if (nextLastRescheduleReason && oldName && nextLastRescheduleReason.includes(oldName)) {
            nextLastRescheduleReason = nextLastRescheduleReason.replaceAll(
              oldName,
              fallbackMember.fullName
            );
          }
          if (Array.isArray(nextAdjustmentLogs) && oldName) {
            nextAdjustmentLogs = nextAdjustmentLogs.map((log) => ({
              ...log,
              reason: log.reason ? log.reason.replaceAll(oldName, fallbackMember.fullName) : log.reason,
              delegatedTo: log.delegatedTo
                ? `${fallbackMember.fullName} (${cleanRole})`
                : log.delegatedTo,
            }));
          }
          pushUniqueOfficer({
            ...off,
            name: fallbackMember.fullName,
            role: cleanRole,
            associationId: subAssoc.id,
            phone:
              fallbackMember.phone && fallbackMember.phone !== "N/A"
                ? fallbackMember.phone
                : off.phone,
          });
          continue;
        }
      }

      const cleanFallbackRole = stripRedundantAssocSuffix(off.role);
      if (cleanFallbackRole !== off.role) changed = true;
      pushUniqueOfficer({ ...off, role: cleanFallbackRole || off.role });
      continue;
    }

    // "Đích danh trên Lịch cấp trên": Nếu tên trên lịch cấp trên không còn khớp
    // với Trưởng đương nhiệm trong CSDL Chi hội → phải cập nhật theo nhân sự mới.
    // Chỉ giữ nguyên nếu tên vẫn khớp với Trưởng hiện tại hoặc không tìm được Chi hội.
    if (off.note === "Đích danh trên Lịch cấp trên") {
      const assocForNamed = findAssociationForRoleOrUnit(
        associations,
        off.associationId,
        off.role
      );
      if (assocForNamed) {
        const currentHead = getHeadOfAssociation(assocForNamed);
        if (currentHead && currentHead.name && norm(currentHead.name) !== norm(off.name)) {
          // Nhân sự đã thay đổi → cập nhật tên + xóa note "đích danh"
          changed = true;
          pushUniqueOfficer({
            ...off,
            name: currentHead.name,
            phone: currentHead.phone || off.phone,
            associationId: assocForNamed.id,
            note: undefined,
          });
          continue;
        }
      }
      // Tên vẫn khớp hoặc không xác định được Chi hội → giữ nguyên
      pushUniqueOfficer(off);
      continue;
    }

    const assoc = findAssociationForRoleOrUnit(associations, off.associationId, off.role);
    if (!assoc) {
      pushUniqueOfficer(off);
      continue;
    }

    const tier = classifyMemberRoleTier(off.role);

    if (tier === "head") {
      const head = getHeadOfAssociation(assoc);
      if (head && head.name) {
        const nextPhone = head.phone || off.phone;
        if (
          off.name !== head.name ||
          off.associationId !== assoc.id ||
          (head.phone && off.phone !== head.phone)
        ) {
          changed = true;
        }
        pushUniqueOfficer({
          ...off,
          name: head.name,
          associationId: assoc.id,
          phone: nextPhone,
        });
        continue;
      }
    }

    if (tier === "deputy") {
      const deputies = getDeputiesOfAssociation(assoc);
      if (deputies.length > 0) {
        const stillDeputy = deputies.find((d) => norm(d.fullName) === norm(off.name));
        const chosen = stillDeputy || deputies[0];
        const nextPhone =
          chosen.phone && chosen.phone !== "N/A" ? chosen.phone : off.phone;
        if (
          off.name !== chosen.fullName ||
          off.associationId !== assoc.id ||
          (nextPhone && off.phone !== nextPhone)
        ) {
          changed = true;
        }
        pushUniqueOfficer({
          ...off,
          name: chosen.fullName,
          associationId: assoc.id,
          phone: nextPhone,
        });
        continue;
      }
    }

    if (tier === "committee") {
      if (handledCommitteeAssocs.has(assoc.id)) {
        changed = true;
        continue;
      }
      handledCommitteeAssocs.add(assoc.id);
      const committees = getCommitteesOfAssociation(assoc);
      if (committees.length > 0) {
        for (const cm of committees) {
          pushUniqueOfficer({
            name: cm.fullName,
            role: off.role,
            associationId: assoc.id,
            phone: cm.phone && cm.phone !== "N/A" ? cm.phone : undefined,
            attendanceRole: off.attendanceRole,
          });
        }
        if (
          committees.length !== 1 ||
          norm(committees[0].fullName) !== norm(off.name)
        ) {
          changed = true;
        }
        continue;
      }
    }

    pushUniqueOfficer(off);
  }

  const nextAttendees =
    rebuiltOfficers.length > 0
      ? formatAttendeesFromOfficers(rebuiltOfficers)
      : schedule.attendees;

  if (nextAttendees !== schedule.attendees) {
    changed = true;
  }

  if (!changed) {
    return { schedule, changed: false };
  }

  return {
    schedule: {
      ...schedule,
      host: nextHost,
      assignedOfficers: rebuiltOfficers,
      attendees: nextAttendees,
      lastRescheduleReason: nextLastRescheduleReason,
      adjustmentLogs: nextAdjustmentLogs,
    },
    changed: true,
  };
}

export function reconcileSchedulesWithAssociations(
  schedules: ScheduleEvent[],
  associations: Association[]
): { schedules: ScheduleEvent[]; changed: boolean } {
  if (!associations || associations.length === 0 || schedules.length === 0) {
    return { schedules, changed: false };
  }
  let anyChanged = false;
  const next = schedules.map((sch) => {
    const res = reconcileScheduleWithAssociations(sch, associations);
    if (res.changed) anyChanged = true;
    return res.schedule;
  });
  return { schedules: anyChanged ? next : schedules, changed: anyChanged };
}

function reconcileCreatorLabel(creator: string, associations: Association[]): string {
  if (!creator) return creator;
  const leaders = extractKeyLeadersSummary(associations);
  let next = creator;

  if (/bí\s*thư\s+nguyễn\s*văn\s*hùng/i.test(next)) {
    next = next.replace(
      /bí\s*thư\s+nguyễn\s*văn\s*hùng/gi,
      `Bí thư ${leaders.partySecretary.name}`
    );
  }
  if (/đ\/c\s+nguyễn\s*văn\s*hùng\s*\(\s*bí\s*thư\s*chi\s*bộ\s*\)/i.test(next)) {
    next = `Đ/c ${leaders.partySecretary.name} (Bí thư Chi bộ)`;
  }
  if (/trần\s*quốc\s*tuấn\s*\(\s*trưởng\s*ban\s*đhkp\s*\)/i.test(next)) {
    next = `Đ/c ${leaders.neighborhoodHead.name} (Trưởng Ban điều hành)`;
  }
  return next;
}

export function reconcileTaskWithAssociations(
  task: TaskItem,
  associations: Association[]
): { task: TaskItem; changed: boolean } {
  if (!associations || associations.length === 0) {
    return { task, changed: false };
  }

  let changed = false;
  const nextCreator = reconcileCreatorLabel(task.creator, associations);
  if (nextCreator !== task.creator) {
    changed = true;
  }

  const assoc = findAssociationForRoleOrUnit(
    associations,
    task.associationId,
    `${task.assignee?.role || ""} ${task.unit || ""}`
  );

  let nextAssignee = task.assignee;
  let nextAssocId = task.associationId;

  if (assoc && task.assignee) {
    const roleTier = classifyMemberRoleTier(task.assignee.role);
    const cleanedAssigneeName = task.assignee.name.replace(/^(Ông|Bà|Đ\/c|Đồng chí)\s+/i, "").trim();
    const exactCurrentMember = assoc.members?.find(
      (m) => norm(m.fullName) === norm(cleanedAssigneeName)
    );

    if (roleTier === "head") {
      const head = getHeadOfAssociation(assoc);
      if (head && norm(head.name) !== norm(cleanedAssigneeName)) {
        nextAssignee = {
          ...task.assignee,
          name: head.name,
          phone: head.phone || task.assignee.phone,
        };
        nextAssocId = assoc.id;
        changed = true;
      } else if (head && head.phone && !task.assignee.phone) {
        nextAssignee = {
          ...task.assignee,
          phone: head.phone,
        };
        changed = true;
      }
    } else if (roleTier === "deputy") {
      const deputies = getDeputiesOfAssociation(assoc);
      if (
        deputies.length > 0 &&
        (!exactCurrentMember || classifyMemberRoleTier(exactCurrentMember.role) !== "deputy")
      ) {
        const dep = deputies[0];
        nextAssignee = {
          ...task.assignee,
          name: dep.fullName,
          phone: dep.phone && dep.phone !== "N/A" ? dep.phone : task.assignee.phone,
        };
        nextAssocId = assoc.id;
        changed = true;
      }
    }
  }

  if (!changed) {
    return { task, changed: false };
  }

  return {
    task: {
      ...task,
      associationId: nextAssocId,
      assignee: nextAssignee,
      creator: nextCreator,
    },
    changed: true,
  };
}

export function reconcileTasksWithAssociations(
  tasks: TaskItem[],
  associations: Association[]
): { tasks: TaskItem[]; changed: boolean } {
  if (!associations || associations.length === 0 || tasks.length === 0) {
    return { tasks, changed: false };
  }
  let anyChanged = false;
  const next = tasks.map((t) => {
    const res = reconcileTaskWithAssociations(t, associations);
    if (res.changed) anyChanged = true;
    return res.task;
  });
  return { tasks: anyChanged ? next : tasks, changed: anyChanged };
}

export function reconcileRemindersWithAssociations(
  reminders: RecurringReminder[],
  associations: Association[]
): { reminders: RecurringReminder[]; changed: boolean } {
  if (!associations || associations.length === 0 || reminders.length === 0) {
    return { reminders, changed: false };
  }

  let anyChanged = false;
  const next = reminders.map((rem) => {
    const assoc = findAssociationForRoleOrUnit(
      associations,
      undefined,
      `${rem.responsiblePerson?.role || ""} ${rem.responsibleUnit || ""}`
    );
    if (!assoc || !rem.responsiblePerson) return rem;

    const tier = classifyMemberRoleTier(rem.responsiblePerson.role);
    const cleanedName = rem.responsiblePerson.name
      .replace(/^(Ông|Bà|Đ\/c|Đồng chí)\s+/i, "")
      .trim();

    if (tier === "head") {
      const head = getHeadOfAssociation(assoc);
      if (head && norm(head.name) !== norm(cleanedName)) {
        anyChanged = true;
        return {
          ...rem,
          responsiblePerson: {
            ...rem.responsiblePerson,
            name: head.name,
            phone: head.phone || rem.responsiblePerson.phone,
          },
        };
      }
    } else if (tier === "deputy") {
      const deputies = getDeputiesOfAssociation(assoc);
      const stillDeputy = deputies.find((d) => norm(d.fullName) === norm(cleanedName));
      if (deputies.length > 0 && !stillDeputy) {
        anyChanged = true;
        return {
          ...rem,
          responsiblePerson: {
            ...rem.responsiblePerson,
            name: deputies[0].fullName,
            phone:
              deputies[0].phone && deputies[0].phone !== "N/A"
                ? deputies[0].phone
                : rem.responsiblePerson.phone,
          },
        };
      }
    }

    return rem;
  });

  return { reminders: anyChanged ? next : reminders, changed: anyChanged };
}
