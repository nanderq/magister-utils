import { afterEach, describe, expect, test } from "bun:test";

import { getAppointment, getSchedule } from "../../src/resources/schedule";

describe("schedule", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("fetches schedule items for a date range", async () => {
        const requests: { url: string; headers: Headers }[] = [];
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push({ url, headers: new Headers(init?.headers) });
            return Response.json({ Items: [{ Id: 42, Omschrijving: "Math" }] });
        }) as typeof fetch;

        await expect(getSchedule(
            "https://school.magister.net/api",
            "token",
            123,
            new Date(2026, 8, 1),
            "2026-09-07",
        )).resolves.toEqual([{ Id: 42, Omschrijving: "Math" }]);

        expect(requests[0]?.url).toBe(
            "https://school.magister.net/api/personen/123/afspraken?van=2026-09-01&tot=2026-09-07",
        );
        expect(requests[0]?.headers.get("authorization")).toBe("Bearer token");
        expect(requests[0]?.headers.get("accept")).toBe("application/json");
    });

    test("accepts lower-case items response casing", async () => {
        globalThis.fetch = (async () => Response.json({ items: [] })) as unknown as typeof fetch;

        await expect(getSchedule(
            "https://school.magister.net/api",
            "token",
            123,
            "2026-09-01",
            "2026-09-07",
        )).resolves.toEqual([]);
    });

    test("rejects invalid dates before making a request", async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return Response.json({ Items: [] });
        }) as unknown as typeof fetch;

        await expect(getSchedule(
            "https://school.magister.net/api",
            "token",
            123,
            new Date("invalid"),
            "2026-09-07",
        )).rejects.toThrow("Schedule requires a valid from date");
        expect(called).toBe(false);
    });

    test("rejects responses without an items array", async () => {
        globalThis.fetch = (async () => Response.json({})) as unknown as typeof fetch;

        await expect(getSchedule(
            "https://school.magister.net/api",
            "token",
            123,
            "2026-09-01",
            "2026-09-07",
        )).rejects.toThrow("Schedule response did not contain an items array");
    });

    test("fetches appointment detail", async () => {
        const requests: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            requests.push(input instanceof Request ? input.url : input.toString());
            return Response.json({ Id: 42, Omschrijving: "Math" });
        }) as typeof fetch;

        await expect(getAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            42,
        )).resolves.toEqual({ Id: 42, Omschrijving: "Math" });
        expect(requests[0]).toBe(
            "https://school.magister.net/api/personen/123/afspraken/42",
        );
    });
});
