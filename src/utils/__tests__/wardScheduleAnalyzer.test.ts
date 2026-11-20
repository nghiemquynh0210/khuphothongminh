import { describe, expect, it } from "vitest";
import { INITIAL_ASSOCIATIONS } from "../../data/associationsData";
import { ScheduleEvent } from "../../types";
import {
  SAMPLE_PARTY_WARD_SCHEDULE_45_LLV,
  SAMPLE_UBND_WARD_SCHEDULE_16_21_NOV,
  analyzeWardDocumentsForKp3,
  applyScheduleAdjustment,
  buildWeeklyZaloDigest,
  delegateScheduleOfficer,
  detectScheduleConflicts,
  parseVietnameseWardScheduleText,
} from "../wardScheduleAnalyzer";

describe("wardScheduleAnalyzer — AI OCR Lịch Cấp Trên & Điều Chỉnh Lịch KP3", () => {
  it("parses both Đảng ủy (45-LLV/ĐU) and UBND Phường An Phú weekly schedules cleanly", () => {
    const docParty = parseVietnameseWardScheduleText(
      SAMPLE_PARTY_WARD_SCHEDULE_45_LLV
    );
    const docUbnd = parseVietnameseWardScheduleText(
      SAMPLE_UBND_WARD_SCHEDULE_16_21_NOV
    );

    expect(docParty.sourceLevel).toBe("party_ward");
    expect(docParty.documentNumber).toContain("45-LLV/ĐU");
    expect(docParty.entries.length).toBeGreaterThanOrEqual(8);

    expect(docUbnd.sourceLevel).toBe("ubnd_ward");
    expect(docUbnd.entries.length).toBeGreaterThanOrEqual(12);

    // Đảm bảo có đủ ngày từ 2026-11-16 đến 2026-11-21
    const dates = new Set([
      ...docParty.entries.map((e) => e.date),
      ...docUbnd.entries.map((e) => e.date),
    ]);
    expect(dates.has("2026-11-16")).toBe(true);
    expect(dates.has("2026-11-17")).toBe(true);
    expect(dates.has("2026-11-18")).toBe(true);
    expect(dates.has("2026-11-19")).toBe(true);
    expect(dates.has("2026-11-20")).toBe(true);
    expect(dates.has("2026-11-21")).toBe(true);
  });

  it("deduplicates cross-document meetings, classifies 3 tiers, maps KP3 officers, and suggests follow-up tasks", () => {
    const docParty = parseVietnameseWardScheduleText(
      SAMPLE_PARTY_WARD_SCHEDULE_45_LLV
    );
    const docUbnd = parseVietnameseWardScheduleText(
      SAMPLE_UBND_WARD_SCHEDULE_16_21_NOV
    );

    const analyzed = analyzeWardDocumentsForKp3(
      [docParty, docUbnd],
      INITIAL_ASSOCIATIONS,
      []
    );

    const mandatory = analyzed.filter(
      (c) => c.relevanceTier === "mandatory_kp3"
    );
    const coordination = analyzed.filter(
      (c) => c.relevanceTier === "coordination_kp3"
    );
    const wardRef = analyzed.filter(
      (c) => c.relevanceTier === "ward_reference"
    );

    expect(mandatory.length).toBeGreaterThanOrEqual(5);
    expect(coordination.length).toBeGreaterThanOrEqual(1);
    expect(wardRef.length).toBeGreaterThanOrEqual(5);

    // 1. Kiểm tra khử trùng lặp liên văn bản (Đảng ủy + UBND cùng tổ chức sáng 18/11, chiều 18/11, sáng 21/11)
    const mergedCrossDoc = analyzed.filter((c) => c.mergedFromBothDocs);
    expect(mergedCrossDoc.length).toBeGreaterThanOrEqual(3);

    const mttq18Nov = mandatory.find(
      (c) => c.date === "2026-11-18" && c.startTime === "14:00"
    );
    expect(mttq18Nov).toBeDefined();
    expect(mttq18Nov?.sourceLevel).toBe("merged_ward");
    expect(
      mttq18Nov?.suggestedTasks.some((t) =>
        t.title.toLowerCase().includes("đảng viên hưu trí")
      )
    ).toBe(true);

    // 2. Kiểm tra phát hiện đích danh Bà Trần Thị Mỹ Dung - Trưởng Ban CTMT Khu phố 3 (Sáng Thứ Ba 17/11)
    const tueMorningKp3 = mandatory.find(
      (c) =>
        c.date === "2026-11-17" &&
        c.startTime === "08:00" &&
        c.participantsRaw.toLowerCase().includes("khu phố 3")
    );
    expect(tueMorningKp3).toBeDefined();
    expect(
      tueMorningKp3?.assignedOfficers.some((o) =>
        o.name.includes("Trần Thị Mỹ Dung")
      )
    ).toBe(true);

    // 3. Kiểm tra tự động sinh Nhiệm vụ phát sinh từ câu "(Nhờ khu phố thông báo mời)" chiều 17/11
    const tueAfternoonGender = mandatory.find(
      (c) =>
        c.date === "2026-11-17" &&
        c.startTime === "14:00" &&
        c.title.toLowerCase().includes("bình đẳng giới")
    );
    expect(tueAfternoonGender).toBeDefined();
    expect(tueAfternoonGender?.suggestedTasks.length).toBeGreaterThanOrEqual(1);
    expect(tueAfternoonGender?.suggestedTasks[0].deadline).toBe("2026-11-16");

    // 4. Kiểm tra cuộc họp gặp gỡ Doanh nghiệp chiều 19/11 thuộc nhóm Phối hợp (coordination_kp3)
    const thuEnterprise = coordination.find((c) => c.date === "2026-11-19");
    expect(thuEnterprise).toBeDefined();
    expect(thuEnterprise?.selected).toBe(false);
  });

  it("handles rescheduling, postponement, officer delegation, conflict detection, and Zalo digest", () => {
    const baseSchedule: ScheduleEvent = {
      id: "SCH-TEST-01",
      title: "Họp triển khai công tác Chuyển đổi số Khu phố 3",
      type: "Họp Ban Điều hành KP3",
      date: "2026-11-18",
      time: "08:30 - 10:30",
      sessionPeriod: "Sáng",
      location: "Hội trường lầu 2 UBND Phường An Phú",
      host: "Chủ tịch UBND Phường",
      attendees: "Nguyễn Văn Hùng (Bí thư Chi bộ KP3); Lê Thị Mai (Trưởng BĐH KP3)",
      assignedOfficers: [
        {
          name: "Nguyễn Văn Hùng",
          role: "Bí thư Chi bộ KP3",
          associationId: "ASC_DANG",
          attendanceRole: "primary",
        },
        {
          name: "Lê Thị Mai",
          role: "Trưởng BĐH KP3",
          associationId: "ASC_BDH",
          attendanceRole: "primary",
        },
      ],
      status: "Sắp diễn ra",
    };

    const overlappingSchedule: ScheduleEvent = {
      id: "SCH-TEST-02",
      title: "Hội nghị tuyên truyền Pháp luật phòng, chống tham nhũng",
      type: "Hội nghị Cấp trên triệu tập",
      date: "2026-11-18",
      time: "09:00 - 11:00",
      sessionPeriod: "Sáng",
      location: "Hội trường lầu 6 - số 02 Lương Định Của",
      host: "Thường trực Đảng ủy",
      attendees: "Nguyễn Văn Hùng (Bí thư Chi bộ KP3)",
      assignedOfficers: [
        {
          name: "Nguyễn Văn Hùng",
          role: "Bí thư Chi bộ KP3",
          associationId: "ASC_DANG",
          attendanceRole: "primary",
        },
      ],
      status: "Sắp diễn ra",
    };

    // 1. Phát hiện trùng khung giờ 09:00 - 10:30 của Bí thư Nguyễn Văn Hùng
    const initialConflicts = detectScheduleConflicts([
      baseSchedule,
      overlappingSchedule,
    ]);
    expect(initialConflicts).toHaveLength(1);
    expect(initialConflicts[0].overlappingOfficers).toContain("Nguyễn Văn Hùng");
    expect(initialConflicts[0].overlapTimeWindow).toBe("09:00 - 10:30");

    // 2. Ủy quyền Phó Bí thư Phạm Ngọc Hà đi dự thay Bí thư Nguyễn Văn Hùng ở cuộc họp SCH-TEST-01 -> Hết trùng lịch!
    const delegated = delegateScheduleOfficer(baseSchedule, {
      fromOfficerName: "Nguyễn Văn Hùng",
      toOfficerName: "Phạm Ngọc Hà",
      toOfficerRole: "Phó Bí thư Chi bộ KP3",
      toAssociationId: "ASC_DANG",
      reason: "Bí thư dự Hội nghị Pháp luật lầu 6 cùng giờ",
      changedBy: "Bí thư Chi bộ KP3",
    });

    expect(delegated.attendees).toContain("Phạm Ngọc Hà");
    expect(delegated.attendees).toContain("dự thay Nguyễn Văn Hùng");
    expect(delegated.adjustmentLogs?.[0].actionType).toBe("delegate");
    expect(
      detectScheduleConflicts([delegated, overlappingSchedule])
    ).toHaveLength(0);

    // 3. Dời lịch sang buổi chiều (Lần 1) rồi sang ngày hôm sau (Lần 2) vẫn giữ nguyên originalDate & originalTime gốc
    const movedOnce = applyScheduleAdjustment(delegated, {
      actionType: "reschedule",
      newDate: "2026-11-18",
      newTime: "14:00 - 16:00",
      reason: "Theo thông báo dời sang buổi chiều của Văn phòng UBND Phường",
      changedBy: "Bí thư Chi bộ KP3",
    });
    expect(movedOnce.originalDate).toBe("2026-11-18");
    expect(movedOnce.originalTime).toBe("08:30 - 10:30");
    expect(movedOnce.sessionPeriod).toBe("Chiều");
    expect(movedOnce.rescheduleCount).toBe(1);

    const movedTwice = applyScheduleAdjustment(movedOnce, {
      actionType: "reschedule",
      newDate: "2026-11-19",
      newTime: "08:00 - 10:00",
      reason: "Chuyển sang sáng Thứ Năm",
      changedBy: "Bí thư Chi bộ KP3",
    });
    expect(movedTwice.originalDate).toBe("2026-11-18");
    expect(movedTwice.originalTime).toBe("08:30 - 10:30");
    expect(movedTwice.date).toBe("2026-11-19");
    expect(movedTwice.sessionPeriod).toBe("Sáng");
    expect(movedTwice.rescheduleCount).toBe(2);
    expect(movedTwice.adjustmentLogs).toHaveLength(3); // 1 delegate + 2 reschedules

    // 4. Tạm hoãn và mở lại lịch
    const postponed = applyScheduleAdjustment(movedTwice, {
      actionType: "postpone",
      reason: "Hoãn chờ lịch tuần sau",
      changedBy: "Bí thư Chi bộ KP3",
    });
    expect(postponed.status).toBe("Đã hoãn");

    // 5. Tạo bản tin Lịch tuần gửi nhóm Zalo KP3
    const zaloText = buildWeeklyZaloDigest(
      [movedTwice, overlappingSchedule],
      "2026-11-16",
      "2026-11-22"
    );
    expect(zaloText).toContain("THÔNG BÁO LỊCH CÔNG TÁC TUẦN — KHU PHỐ 3");
    expect(zaloText).toContain("Từ ngày 16/11/2026 đến ngày 22/11/2026");
    expect(zaloText).toContain("ĐÃ DỜI LỊCH");
  });
});
