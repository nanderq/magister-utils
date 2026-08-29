import { z } from "zod";

import { isValidTimeZone } from "./timezone";

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine(
  (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
  "Invalid calendar date",
);

export const timeZoneInput = z.string().max(100)
  .refine(isValidTimeZone, "Use a valid IANA timezone, such as Europe/Amsterdam")
  .optional()
  .describe("User's IANA timezone. Pass this when the MCP client does not provide location metadata.");

export const scheduleInput = {
  from: dateString,
  to: dateString,
  timeZone: timeZoneInput,
};

export function validateScheduleRange(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (end < start) throw new Error("to must be on or after from");
  if ((end - start) / 86_400_000 > 31) throw new Error("Schedule ranges cannot exceed 31 days");
}

export const paginationInput = {
  limit: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
  timeZone: timeZoneInput,
};
