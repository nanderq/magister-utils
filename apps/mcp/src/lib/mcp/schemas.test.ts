import { describe, expect, test } from "bun:test";

import { dateString, validateScheduleRange } from "./schemas";

describe("MCP input schemas", () => {
  test("accepts ISO dates", () => expect(dateString.parse("2026-06-07")).toBe("2026-06-07"));
  test("rejects invalid date formats", () => expect(() => dateString.parse("07-06-2026")).toThrow());
  test("rejects reversed ranges", () => expect(() => validateScheduleRange("2026-06-08", "2026-06-07")).toThrow());
  test("rejects ranges over 31 days", () => expect(() => validateScheduleRange("2026-06-01", "2026-07-03")).toThrow());
});
