import { describe, expect, test } from "bun:test";

import { localizeTimestamp, localizeTimestamps, resolveUserTimeZone } from "./timezone";

describe("MCP timezone handling", () => {
  test("converts UTC instants using daylight-saving rules", () => {
    expect(localizeTimestamp("2026-08-28T08:00:00.000Z", "Europe/Amsterdam"))
      .toBe("2026-08-28T10:00:00.000+02:00");
    expect(localizeTimestamp("2026-01-28T08:00:00.000Z", "Europe/Amsterdam"))
      .toBe("2026-01-28T09:00:00.000+01:00");
  });

  test("attaches the user's offset to timezone-naive Magister wall-clock values", () => {
    expect(localizeTimestamp("2026-08-28T08:00:00", "Europe/Amsterdam"))
      .toBe("2026-08-28T08:00:00.000+02:00");
  });

  test("localizes nested timestamps without changing date-only values", () => {
    expect(localizeTimestamps({
      from: "2026-08-28",
      item: { sentAt: "2026-08-28T22:30:00Z" },
    }, "Europe/Amsterdam")).toEqual({
      from: "2026-08-28",
      item: { sentAt: "2026-08-29T00:30:00.000+02:00" },
    });
  });

  test("prefers an explicit timezone and falls back to client metadata", () => {
    const context = {
      _meta: { "openai/userLocation": { timezone: "Europe/Amsterdam" } },
    };
    expect(resolveUserTimeZone(context, "America/New_York")).toBe("America/New_York");
    expect(resolveUserTimeZone(context, "not/a-zone")).toBe("Europe/Amsterdam");
  });
});
