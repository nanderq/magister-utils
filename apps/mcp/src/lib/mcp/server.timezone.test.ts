import { expect, mock, test } from "bun:test";

mock.module("@/lib/magister/repository", () => ({
  createMagisterClient: async () => ({
    getPersonId: async () => "42",
    getSchedule: async () => [{
      Id: 1,
      Start: "2026-08-28T08:00:00.000Z",
      Einde: "2026-08-28T09:00:00.000Z",
      Omschrijving: "Mathematics",
    }],
  }),
}));

const { registerMagisterTools } = await import("./server");

test("returns schedule timestamps in the user's timezone", async () => {
  const callbacks = new Map<string, (...args: any[]) => Promise<any>>();
  registerMagisterTools({
    registerTool(name: unknown, ...args: unknown[]) {
      callbacks.set(String(name), args.at(-1) as (...args: any[]) => Promise<any>);
    },
  });

  const result = await callbacks.get("get_schedule")?.(
    { from: "2026-08-28", to: "2026-08-28" },
    {
      authInfo: { extra: { userId: "user-1" } },
      _meta: { "openai/userLocation": { timezone: "Europe/Amsterdam" } },
    },
  );

  expect(result.structuredContent.timeZone).toBe("Europe/Amsterdam");
  expect(result.structuredContent.items[0].start).toBe("2026-08-28T10:00:00.000+02:00");
  expect(result.structuredContent.items[0].end).toBe("2026-08-28T11:00:00.000+02:00");
});
