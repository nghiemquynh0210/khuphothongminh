import { describe, expect, it } from "vitest";
import { Association, ScheduleEvent, TaskItem } from "../../types";
import {
  reconcileSchedulesWithAssociations,
  reconcileTasksWithAssociations,
} from "../taskScheduleRoleSync";

const SAMPLE_LIVE_ASSOCIATIONS: Association[] = [
  {
    id: "ASC_DANG",
    name: "Chi bộ",
    category: "Chính trị - Xã hội",
    description: "Chi bộ KP3",
    leaderName: "Nghiêm Xuân Quỳnh",
    leaderCccd: "079068001234",
    members: [
      {
        id: "M1",
        fullName: "Nghiêm Xuân Quỳnh",
        role: "Bí thư Chi bộ",
        cccd: "079068001234",
        phone: "0903829112",
      },
      {
        id: "M2",
        fullName: "PHẠM NGỌC HÀ",
        role: "Phó Bí thư Chi bộ",
        cccd: "074088001074",
        phone: "0908579479",
      },
      {
        id: "M3",
        fullName: "Nguyễn Trung Huy",
        role: "Chi ủy viên",
        cccd: "079080009988",
        phone: "0909123888",
      },
    ],
  },
  {
    id: "ASC_BDH",
    name: "Ban điều hành khu phố",
    category: "Chính quyền cơ sở",
    description: "Ban điều hành KP3",
    leaderName: "Nguyễn Trung Huy",
    leaderCccd: "079080009988",
    members: [
      {
        id: "M4",
        fullName: "Nguyễn Trung Huy",
        role: "Trưởng Ban điều hành",
        cccd: "079080009988",
        phone: "0909123888",
      },
      {
        id: "M5",
        fullName: "Nguyễn Thu Phương",
        role: "Phó Trưởng Khu phố",
        cccd: "079182003112",
        phone: "0908112233",
      },
    ],
  },
  {
    id: "ASC_MT",
    name: "Ban Công tác Mặt trận",
    category: "Đoàn thể nhân dân",
    description: "Ban CTMT KP3",
    leaderName: "TRẦN THỊ MỸ DUNG",
    leaderCccd: "074161001234",
    members: [
      {
        id: "M6",
        fullName: "TRẦN THỊ MỸ DUNG",
        role: "Trưởng Ban CTMT",
        cccd: "074161001234",
      },
      {
        id: "M7",
        fullName: "Nguyễn Văn Hùng",
        role: "Ủy viên Ban CTMT",
        cccd: "079068001234",
      },
    ],
  },
];

describe("taskScheduleRoleSync — Đồng bộ liên thông chức vụ Chi hội <-> Lịch & Nhiệm vụ", () => {
  it("replaces stale Trưởng Ban CTMT (Nguyễn Văn Hùng) with live incumbent (TRẦN THỊ MỸ DUNG) while preserving delegations", () => {
    const staleSchedules: ScheduleEvent[] = [
      {
        id: "SCH-WARD-20261118-11-Z5Y",
        title: "Hội nghị triển khai Luật Phát triển đô thị và các Nghị quyết của HĐND Thành phố.",
        type: "Hội nghị Khu phố",
        date: "2026-11-18",
        time: "14:00 - 16:30",
        location: "Hội trường A- UBND phường",
        host: "Thường trực Đảng uỷ",
        attendees:
          "Nghiêm Xuân Quỳnh (Bí thư Chi bộ KP3); Nguyễn Trung Huy (Trưởng Ban Điều hành KP3); Nguyễn Văn Hùng (Trưởng Ban CTMT KP3)",
        status: "Sắp diễn ra",
        assignedOfficers: [
          {
            name: "Nghiêm Xuân Quỳnh",
            role: "Bí thư Chi bộ KP3",
            associationId: "ASC_DANG",
            attendanceRole: "primary",
          },
          {
            name: "Nguyễn Trung Huy",
            role: "Trưởng Ban Điều hành KP3",
            associationId: "ASC_BDH",
            attendanceRole: "primary",
          },
          {
            name: "Nguyễn Văn Hùng",
            role: "Trưởng Ban CTMT KP3",
            associationId: "ASC_MT",
            attendanceRole: "primary",
          },
        ],
      },
      {
        id: "SCH-DELEGATED-01",
        title: "Hội nghị kê khai tài sản",
        type: "Lịch UBND Phường",
        date: "2026-11-18",
        time: "09:00 - 11:00",
        location: "Hội trường A",
        host: "Thường trực Đảng uỷ",
        attendees: "Lê Văn Sơn (Phó Ban điều hành (Ban điều hành khu phố) — dự thay Nguyễn Trung Huy)",
        lastRescheduleReason: "Cử Lê Văn Sơn dự thay Nguyễn Trung Huy",
        status: "Sắp diễn ra",
        assignedOfficers: [
          {
            name: "Lê Văn Sơn",
            role: "Phó Ban điều hành (Ban điều hành khu phố)",
            associationId: "ASC_BDH",
            attendanceRole: "deputy_substitute",
            delegatedFrom: "Nguyễn Trung Huy",
          },
        ],
      },
    ];

    const { schedules, changed } = reconcileSchedulesWithAssociations(
      staleSchedules,
      SAMPLE_LIVE_ASSOCIATIONS
    );

    expect(changed).toBe(true);
    expect(schedules[0].attendees).toBe(
      "Nghiêm Xuân Quỳnh (Bí thư Chi bộ KP3); Nguyễn Trung Huy (Trưởng Ban Điều hành KP3); TRẦN THỊ MỸ DUNG (Trưởng Ban CTMT KP3)"
    );
    expect(schedules[0].assignedOfficers?.[2].name).toBe("TRẦN THỊ MỸ DUNG");
    // Nhân sự dự thay cũ (Lê Văn Sơn) không còn trong Ban điều hành -> tự động cập nhật sang Phó Trưởng Khu phố đương nhiệm (Nguyễn Thu Phương) và khử lặp tên đơn vị
    expect(schedules[1].attendees).toBe(
      "Nguyễn Thu Phương (Phó Trưởng Khu phố — dự thay Nguyễn Trung Huy)"
    );
    expect(schedules[1].lastRescheduleReason).toBe(
      "Cử Nguyễn Thu Phương dự thay Nguyễn Trung Huy"
    );
  });

  it("reconciles stale task assignees (Phó Bí thư, Trưởng Khu phố) to live association incumbents", () => {
    const staleTasks: TaskItem[] = [
      {
        id: "TASK-OCR-006",
        title: "Triệu tập TV Ban CTMT & Đảng viên hưu trí KP3",
        description: "Thông báo mời các thành viên tham dự hội nghị",
        unit: "Chi bộ",
        associationId: "ASC_DANG",
        assignee: {
          name: "Lê Văn Sơn",
          role: "Phó Bí thư Chi bộ",
          unit: "Chi bộ",
        },
        creator: "Bí thư Nguyễn Văn Hùng (Từ AI OCR Số 45-LLV/ĐU)",
        priority: "Cao",
        status: "Chờ xử lý",
        progressPercent: 0,
        startDate: "2026-11-16",
        deadline: "2026-11-17",
      },
    ];

    const { tasks, changed } = reconcileTasksWithAssociations(
      staleTasks,
      SAMPLE_LIVE_ASSOCIATIONS
    );

    expect(changed).toBe(true);
    expect(tasks[0].assignee.name).toBe("PHẠM NGỌC HÀ");
    expect(tasks[0].creator).toContain("Bí thư Nghiêm Xuân Quỳnh");
  });
});
