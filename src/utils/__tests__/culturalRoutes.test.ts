import { describe, expect, it } from "vitest";
import {
  ROUTES,
  getEventCreatePath,
  getEventDetailPath,
  getEventEditPath,
  getNewsCreatePath,
  getNewsDetailPath,
  getNewsEditPath,
  getTabFromDashboardPath,
  parseCulturalRoute,
} from "../../routes";

describe("culturalRoutes", () => {
  it("resolves dashboard tab for cultural routes", () => {
    expect(getTabFromDashboardPath(ROUTES.DASHBOARD_CULTURAL)).toBe("cultural");
    expect(getTabFromDashboardPath(getNewsCreatePath())).toBe("cultural");
    expect(getTabFromDashboardPath(getNewsEditPath("NEWS001"))).toBe("cultural");
    expect(getTabFromDashboardPath(getNewsDetailPath("NEWS001"))).toBe("cultural");
    expect(getTabFromDashboardPath(getEventCreatePath())).toBe("cultural");
    expect(getTabFromDashboardPath(getEventEditPath("EV001"))).toBe("cultural");
    expect(getTabFromDashboardPath(getEventDetailPath("EV001"))).toBe("cultural");
  });

  it("builds parameterized news and event paths with default or custom basePath", () => {
    // News paths (default basePath: /dashboard/cultural)
    expect(getNewsCreatePath()).toBe("/dashboard/cultural/news/new");
    expect(getNewsEditPath("NEWS001")).toBe("/dashboard/cultural/news/edit/NEWS001");
    expect(getNewsDetailPath("NEWS001")).toBe("/dashboard/cultural/news/detail/NEWS001");
    expect(getNewsDetailPath("TIN/01")).toBe("/dashboard/cultural/news/detail/TIN%2F01");

    // News paths with custom citizen basePath
    expect(getNewsCreatePath("/citizen/cultural")).toBe("/citizen/cultural/news/new");
    expect(getNewsDetailPath("NEWS002", "/citizen/cultural")).toBe(
      "/citizen/cultural/news/detail/NEWS002"
    );

    // Event paths (default basePath: /dashboard/cultural)
    expect(getEventCreatePath()).toBe("/dashboard/cultural/events/new");
    expect(getEventEditPath("EV001")).toBe("/dashboard/cultural/events/edit/EV001");
    expect(getEventDetailPath("EV001")).toBe("/dashboard/cultural/events/detail/EV001");
    expect(getEventDetailPath("SK/02")).toBe("/dashboard/cultural/events/detail/SK%2F02");

    // Event paths with custom citizen basePath
    expect(getEventCreatePath("/citizen/cultural")).toBe("/citizen/cultural/events/new");
    expect(getEventDetailPath("EV002", "/citizen/cultural")).toBe(
      "/citizen/cultural/events/detail/EV002"
    );
  });

  it("parses news routes from path params and query params", () => {
    // Create mode
    expect(parseCulturalRoute("/dashboard/cultural/news/new")).toEqual({
      type: "news",
      mode: "create",
    });
    expect(parseCulturalRoute("/dashboard/news/new")).toEqual({
      type: "news",
      mode: "create",
    });
    expect(parseCulturalRoute("/news/new")).toEqual({
      type: "news",
      mode: "create",
    });

    // Edit mode (path param & query param)
    expect(parseCulturalRoute("/dashboard/cultural/news/edit/NEWS101")).toEqual({
      type: "news",
      mode: "edit",
      newsId: "NEWS101",
    });
    expect(
      parseCulturalRoute("/dashboard/cultural/news/edit", "?id=NEWS102")
    ).toEqual({
      type: "news",
      mode: "edit",
      newsId: "NEWS102",
    });

    // Detail mode (path param & query param)
    expect(parseCulturalRoute("/dashboard/cultural/news/detail/NEWS103")).toEqual({
      type: "news",
      mode: "detail",
      newsId: "NEWS103",
    });
    expect(parseCulturalRoute("/dashboard/news/detail/TIN%2F09")).toEqual({
      type: "news",
      mode: "detail",
      newsId: "TIN/09",
    });
    expect(
      parseCulturalRoute("/dashboard/cultural/news/detail", "?id=NEWS104")
    ).toEqual({
      type: "news",
      mode: "detail",
      newsId: "NEWS104",
    });
  });

  it("parses event routes from path params and query params", () => {
    // Create mode
    expect(parseCulturalRoute("/dashboard/cultural/events/new")).toEqual({
      type: "event",
      mode: "create",
    });
    expect(parseCulturalRoute("/dashboard/events/new")).toEqual({
      type: "event",
      mode: "create",
    });
    expect(parseCulturalRoute("/schedule/new")).toEqual({
      type: "event",
      mode: "create",
    });

    // Edit mode (path param & query param)
    expect(parseCulturalRoute("/dashboard/cultural/events/edit/EV201")).toEqual({
      type: "event",
      mode: "edit",
      eventId: "EV201",
    });
    expect(
      parseCulturalRoute("/dashboard/cultural/events/edit", "?id=EV202")
    ).toEqual({
      type: "event",
      mode: "edit",
      eventId: "EV202",
    });

    // Detail mode (path param & query param)
    expect(
      parseCulturalRoute("/dashboard/cultural/events/detail/EV203")
    ).toEqual({
      type: "event",
      mode: "detail",
      eventId: "EV203",
    });
    expect(parseCulturalRoute("/dashboard/events/detail/SK%2F99")).toEqual({
      type: "event",
      mode: "detail",
      eventId: "SK/99",
    });
    expect(
      parseCulturalRoute("/dashboard/cultural/events/detail", "?id=EV204")
    ).toEqual({
      type: "event",
      mode: "detail",
      eventId: "EV204",
    });
  });

  it("returns null for non-subpath cultural URLs", () => {
    expect(parseCulturalRoute("/dashboard/cultural")).toBeNull();
    expect(parseCulturalRoute("/cultural")).toBeNull();
    expect(parseCulturalRoute("/")).toBeNull();
  });
});

