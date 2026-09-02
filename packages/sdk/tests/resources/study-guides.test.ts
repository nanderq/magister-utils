import { afterEach, describe, expect, test } from "bun:test";

import {
    extractStudyGuideFiles,
    getStudyGuide,
    getStudyGuidePart,
    getStudyGuides,
} from "../../src/resources/study-guides";

const baseUrl = "https://school.magister.net/api";

describe("study guides", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("lists study guides for a date", async () => {
        const requests: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            requests.push(input instanceof Request ? input.url : input.toString());
            return Response.json({ Items: [{ Id: 1, Titel: "Biology" }] });
        }) as unknown as typeof fetch;

        await expect(getStudyGuides(baseUrl, "token", 123, new Date(2026, 8, 2)))
            .resolves.toEqual([{ Id: 1, Titel: "Biology" }]);
        expect(requests[0]).toEndWith("/leerlingen/123/studiewijzers?peildatum=2026-09-02");
    });

    test("gets guide and part details", async () => {
        const requests: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push(url);
            return Response.json(url.includes("/onderdelen/")
                ? { Id: 2, Bronnen: [] }
                : { Id: 1, Onderdelen: { Items: [{ Id: 2 }] } });
        }) as unknown as typeof fetch;

        await expect(getStudyGuide(baseUrl, "token", 123, 1)).resolves.toMatchObject({ Id: 1 });
        await expect(getStudyGuidePart(baseUrl, "token", 123, 1, 2, false))
            .resolves.toMatchObject({ Id: 2 });
        expect(requests[1]).toEndWith("/onderdelen/2?gebruikMappenStructuur=false");
    });

    test("extracts and deduplicates files from nested payloads", () => {
        const file = {
            Id: 7,
            Bestandsnaam: "notes.pdf",
            Grootte: 512,
            ContentType: "application/pdf",
            Links: [{ Rel: "download", Href: "/files/7" }],
        };
        const payload = { Bronnen: [{ Bestand: file }], Duplicate: file };

        expect(extractStudyGuideFiles(payload)).toEqual([{
            id: "7",
            fileId: 7,
            name: "notes.pdf",
            href: "/files/7",
            size: 512,
            contentType: "application/pdf",
        }]);
    });

    test("rejects malformed list responses", async () => {
        globalThis.fetch = (async () => Response.json({ Items: null })) as unknown as typeof fetch;
        await expect(getStudyGuides(baseUrl, "token", 123)).rejects.toThrow(
            "Study guides response did not contain an items array",
        );
    });
});
