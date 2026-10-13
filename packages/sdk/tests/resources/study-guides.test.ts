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

    test("prefers Contents links and ignores part Self links", () => {
        const payload = {
            Id: 2,
            Titel: "Planning",
            Links: [{ Rel: "Self", Href: "/onderdelen/2" }],
            Bronnen: [{
                Id: 9,
                Naam: "PTA.pdf",
                Grootte: 100,
                ContentType: "application/pdf",
                Links: [
                    { Rel: "Self", Href: "/bronnen/9" },
                    { Rel: "Contents", Href: "/bijlagen/9" },
                ],
            }],
        };

        expect(extractStudyGuideFiles(payload)).toEqual([{
            id: "9",
            fileId: 9,
            name: "PTA.pdf",
            href: "/bijlagen/9",
            size: 100,
            contentType: "application/pdf",
        }]);
    });

    test("does not use a Self link as the file download", () => {
        expect(extractStudyGuideFiles({
            Bronnen: [{
                Id: 9,
                Naam: "PTA.pdf",
                Grootte: 100,
                Links: [{ Rel: "Self", Href: "/bronnen/9" }],
            }],
        })).toEqual([{
            id: "9",
            fileId: 9,
            name: "PTA.pdf",
            href: undefined,
            size: 100,
            contentType: undefined,
        }]);
    });

    test("rejects malformed list responses", async () => {
        globalThis.fetch = (async () => Response.json({ Items: null })) as unknown as typeof fetch;
        await expect(getStudyGuides(baseUrl, "token", 123)).rejects.toThrow(
            "Study guides response did not contain an items array",
        );
    });
});
