import { afterEach, describe, expect, test } from "bun:test";

import { MagisterRequestError } from "../../src/errors";
import { createAppointment, deleteAppointment, getAppointment, getSchedule } from "../../src/resources/schedule";

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

    test("creates a personal appointment and returns the id from the location header", async () => {
        let request: { url: string; method?: string; headers: Headers; body: unknown } | undefined;
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            request = {
                url,
                method: init?.method,
                headers: new Headers(init?.headers),
                body: JSON.parse(String(init?.body)),
            };
            return new Response(null, {
                status: 201,
                headers: { Location: "/api/personen/123/afspraken/10650544" },
            });
        }) as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
                Inhoud: "een beschrijving",
                Lokatie: "een locatie",
            },
        )).resolves.toEqual({ id: 10650544 });

        expect(request?.url).toBe("https://school.magister.net/api/personen/123/afspraken");
        expect(request?.method).toBe("POST");
        expect(request?.headers.get("authorization")).toBe("Bearer token");
        expect(request?.headers.get("accept")).toBe("application/json");
        expect(request?.headers.get("content-type")).toBe("application/json");
        expect(request?.body).toEqual({
            Start: "2026-10-07T19:00:00.000Z",
            Einde: "2026-10-07T19:30:00.000Z",
            DuurtHeleDag: false,
            Omschrijving: "Test",
            Inhoud: "een beschrijving",
            Lokatie: "een locatie",
            Type: 1,
            InfoType: 6,
            Status: 2,
            WeergaveType: 0,
            Subtype: 1,
        });
    });

    test("keeps supplied appointment fields and serializes dates", async () => {
        let body: Record<string, unknown> = {};
        globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
            body = JSON.parse(String(init?.body));
            return new Response(null, {
                status: 201,
                headers: { Location: "https://school.magister.net/api/personen/123/afspraken/9" },
            });
        }) as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: new Date("2026-10-07T19:00:00.000Z"),
                Einde: new Date("2026-10-07T19:30:00.000Z"),
                Omschrijving: "Test",
                DuurtHeleDag: true,
                Type: 13,
            },
        )).resolves.toEqual({ id: 9 });
        expect(body).toMatchObject({
            Start: "2026-10-07T19:00:00.000Z",
            Einde: "2026-10-07T19:30:00.000Z",
            DuurtHeleDag: true,
            Inhoud: "",
            Lokatie: "",
            Type: 13,
            InfoType: 6,
        });
    });

    test("rejects invalid appointment times before making a request", async () => {
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            return new Response(null, { status: 201 });
        }) as unknown as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: new Date("invalid"),
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        )).rejects.toThrow("Create appointment requires a valid start time");
        expect(called).toBe(false);
    });

    test("uses the SDK request error when creating an appointment fails", async () => {
        globalThis.fetch = (async () => new Response("no", { status: 400 })) as unknown as typeof fetch;

        const error = await createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        ).catch((value) => value);
        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(400);
    });

    test("rejects a create response without an appointment id", async () => {
        globalThis.fetch = (async () => new Response(null, {
            status: 201,
            headers: { Location: "/api/personen/123/afspraken" },
        })) as unknown as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        )).rejects.toThrow("Create appointment response did not contain an appointment id");
    });

    test("prefers the location appointment id when the body also has one", async () => {
        globalThis.fetch = (async () => Response.json(
            { Id: 42 },
            {
                status: 201,
                headers: { Location: "/api/personen/123/afspraken/7/?ignored=1#fragment" },
            },
        )) as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        )).resolves.toEqual({ id: 7 });
    });

    test("returns a body Id when the location header has no appointment id", async () => {
        globalThis.fetch = (async () => Response.json(
            { Id: 42 },
            { status: 201 },
        )) as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        )).resolves.toEqual({ id: 42 });
    });

    test("returns a body id when the location header has no appointment id", async () => {
        globalThis.fetch = (async () => Response.json(
            { id: 42 },
            { status: 201 },
        )) as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        )).resolves.toEqual({ id: 42 });
    });

    test("returns the appointment id from the first body element", async () => {
        globalThis.fetch = (async () => Response.json(
            [{ id: 42 }, { Id: 99 }],
            {
                status: 201,
                headers: { Location: "/api/personen/123/afspraken" },
            },
        )) as typeof fetch;

        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        )).resolves.toEqual({ id: 42 });
    });

    test("rejects a successful create when neither location nor body has an appointment id", async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify({ Omschrijving: "Test" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        })) as unknown as typeof fetch;

        let createdId: number | undefined;
        await expect(createAppointment(
            "https://school.magister.net/api",
            "token",
            123,
            {
                Start: "2026-10-07T19:00:00.000Z",
                Einde: "2026-10-07T19:30:00.000Z",
                Omschrijving: "Test",
            },
        ).then((created) => {
            createdId = created.id;
            return created;
        })).rejects.toThrow("Create appointment response did not contain an appointment id");
        expect(createdId).toBeUndefined();
    });

    test("deletes an appointment", async () => {
        let request: { url: string; method?: string; headers: Headers } | undefined;
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            request = {
                url: input instanceof Request ? input.url : input.toString(),
                method: init?.method,
                headers: new Headers(init?.headers),
            };
            return new Response(null, { status: 204 });
        }) as typeof fetch;

        await expect(deleteAppointment(
            "https://school.magister.net/api",
            "token",
            57998,
            10650544,
        )).resolves.toBeUndefined();
        expect(request?.url).toBe("https://school.magister.net/api/personen/57998/afspraken/10650544");
        expect(request?.method).toBe("DELETE");
        expect(request?.headers.get("authorization")).toBe("Bearer token");
        expect(request?.headers.get("accept")).toBe("application/json");
    });

    test("uses the SDK request error when deleting an appointment fails", async () => {
        globalThis.fetch = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;

        const error = await deleteAppointment(
            "https://school.magister.net/api",
            "token",
            57998,
            10650544,
        ).catch((value) => value);
        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(403);
    });
});
