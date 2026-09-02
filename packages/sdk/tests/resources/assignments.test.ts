import { afterEach, describe, expect, test } from "bun:test";

import { getAssignment, getAssignments } from "../../src/resources/assignments";

describe("assignments", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("returns assignment items from either response casing", async () => {
        const requests: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            requests.push(input instanceof Request ? input.url : input.toString());
            return Response.json({ Items: [{ Id: 42, Titel: "Essay" }] });
        }) as unknown as typeof fetch;

        await expect(getAssignments("https://school.magister.net/api", "token", 123, {
            skip: 5,
            top: 10,
        })).resolves.toEqual([{ Id: 42, Titel: "Essay" }]);
        expect(requests[0]).toEndWith("/personen/123/opdrachten?skip=5&top=10");
    });

    test("returns assignment details", async () => {
        globalThis.fetch = (async () => Response.json({
            Id: 42,
            Titel: "Essay",
            Omschrijving: "Write it",
        })) as unknown as typeof fetch;

        await expect(getAssignment(
            "https://school.magister.net/api",
            "token",
            123,
            42,
        )).resolves.toMatchObject({ Id: 42, Omschrijving: "Write it" });
    });
});
