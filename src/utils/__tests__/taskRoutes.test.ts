import { describe, expect, it } from "vitest";
import {
  ROUTES,
  getTabFromDashboardPath,
  getTaskCreatePath,
  getTaskDetailPath,
  getTaskEditPath,
  parseTaskFormRoute,
} from "../../routes";

describe("taskRoutes", () => {
  it("resolves dashboard tab for all task subpaths", () => {
    expect(getTabFromDashboardPath(ROUTES.DASHBOARD_TASKS)).toBe("tasks");
    expect(getTabFromDashboardPath(getTaskCreatePath())).toBe("tasks");
    expect(getTabFromDashboardPath(getTaskEditPath("TASK-001"))).toBe("tasks");
    expect(getTabFromDashboardPath(getTaskDetailPath("TASK-001"))).toBe("tasks");
  });

  it("builds parameterized task paths cleanly", () => {
    expect(getTaskCreatePath()).toBe("/dashboard/tasks/new");
    expect(getTaskEditPath("TASK-001")).toBe("/dashboard/tasks/edit/TASK-001");
    expect(getTaskDetailPath("TASK-001")).toBe("/dashboard/tasks/detail/TASK-001");
    expect(getTaskDetailPath("TĐ/01")).toBe("/dashboard/tasks/detail/T%C4%90%2F01");
  });

  it("parses create, edit, and detail routes from path params and query params", () => {
    expect(parseTaskFormRoute("/dashboard/tasks/new")).toEqual({
      mode: "create",
    });
    expect(parseTaskFormRoute("/tasks/new")).toEqual({
      mode: "create",
    });

    expect(parseTaskFormRoute("/dashboard/tasks/edit/TASK-002")).toEqual({
      mode: "edit",
      taskId: "TASK-002",
    });
    expect(parseTaskFormRoute("/dashboard/tasks/edit", "?id=TASK-003")).toEqual({
      mode: "edit",
      taskId: "TASK-003",
    });

    expect(parseTaskFormRoute("/dashboard/tasks/detail/TASK-004")).toEqual({
      mode: "detail",
      taskId: "TASK-004",
    });
    expect(parseTaskFormRoute("/dashboard/tasks/detail", "?id=TASK-005")).toEqual({
      mode: "detail",
      taskId: "TASK-005",
    });
    expect(parseTaskFormRoute("/dashboard/tasks/detail/T%C4%90%2F01")).toEqual({
      mode: "detail",
      taskId: "TĐ/01",
    });

    expect(parseTaskFormRoute("/dashboard/tasks")).toBeNull();
  });
});

