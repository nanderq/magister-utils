import { afterEach, describe, expect, test } from "bun:test";

import { getGrades } from "../../src/resources/grades";
import type { Enrollment, GradeItem } from "../../src/types";

const baseUrl = "https://school.magister.net/api";
const accessToken = "access-token";
const personId = 12345;

function enrollment(id: number, einde: string): Enrollment {
    return {
        id,
        studie: { id: 1, code: "G HAVO 5", links: { self: { href: "/api/studies/1" } } },
        groep: {
            id: 1,
            code: "GH5D",
            omschrijving: "GH5D",
            links: { self: { href: "/api/groepen/1" } },
        },
        lesperiode: { code: "2627", links: { self: { href: "/api/lesperioden/1" } } },
        profielen: [],
        persoonlijkeMentor: {
            voorletters: "R.T.",
            tussenvoegsel: "van",
            achternaam: "Rooijen",
            links: { self: { href: "/api/medewerkers/1" } },
        },
        begin: "2025-08-01",
        einde,
        isHoofdAanmelding: true,
        links: {
            self: { href: `/api/aanmeldingen/${id}` },
            vakken: { href: `/api/aanmeldingen/${id}/vakken` },
            perioden: { href: `/api/aanmeldingen/${id}/cijfers/perioden` },
            cijfers: { href: `/api/aanmeldingen/${id}/cijfers` },
            mentoren: { href: `/api/aanmeldingen/${id}/mentoren` },
        },
    };
}

const gradeItem = {
    CijferId: 1,
    CijferStr: "8.5",
    DatumIngevoerd: "2026-09-01",
    IsVoldoende: true,
} as GradeItem;

describe("getGrades", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("fetches grades for the enrollment with the latest end date", async () => {
        const requests: { url: string; headers: Headers }[] = [];

        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push({ url, headers: new Headers(init?.headers) });

            if (url.startsWith(`${baseUrl}/leerlingen/${personId}/aanmeldingen?`)) {
                return Response.json({
                    items: [
                        enrollment(100, "2026-07-31"),
                        enrollment(174333, "2027-07-31"),
                        enrollment(0, "2028-07-31"),
                    ],
                });
            }

            if (url.includes("/aanmeldingen/174333/cijfers/cijferoverzichtvooraanmelding")) {
                return Response.json({ Items: [gradeItem] });
            }

            throw new Error(`Unexpected request: ${url}`);
        }) as typeof fetch;

        await expect(getGrades(baseUrl, accessToken, personId)).resolves.toEqual([gradeItem]);

        expect(requests).toHaveLength(2);
        expect(requests[0]?.url).toBe(
            `${baseUrl}/leerlingen/${personId}/aanmeldingen?begin=1970-01-01`,
        );
        expect(requests[0]?.headers.get("authorization")).toBe(`Bearer ${accessToken}`);
        expect(requests[1]?.url).toContain(
            `${baseUrl}/personen/${personId}/aanmeldingen/174333/cijfers/cijferoverzichtvooraanmelding?`,
        );
        expect(requests[1]?.url).toContain("peildatum=2027-07-31T00%3A00%3A00.000Z");
        expect(requests[1]?.url).toContain("actievePerioden=false");
        expect(requests[1]?.url).toContain("alleenBerekendeKolommen=false");
        expect(requests[1]?.url).toContain("alleenPTAKolommen=false");
        expect(requests[1]?.headers.get("accept")).toBe("application/json");
    });

    test("throws when no valid enrollments exist", async () => {
        globalThis.fetch = (async () => Response.json({ items: [] })) as unknown as typeof fetch;

        await expect(getGrades(baseUrl, accessToken, personId)).rejects.toThrow(
            "No school years found",
        );
    });

    test("rejects an invalid enrollment end date", async () => {
        globalThis.fetch = (async () => Response.json({
            items: [enrollment(174333, "not-a-date")],
        })) as unknown as typeof fetch;

        await expect(getGrades(baseUrl, accessToken, personId)).rejects.toThrow(
            "Grades request requires a valid peildatum or enrollment end date",
        );
    });

    test("throws when the grades request fails", async () => {
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();

            if (url.startsWith(`${baseUrl}/leerlingen/${personId}/aanmeldingen?`)) {
                return Response.json({ items: [enrollment(174333, "2027-07-31")] });
            }

            return new Response("nope", { status: 500 });
        }) as typeof fetch;

        await expect(getGrades(baseUrl, accessToken, personId)).rejects.toThrow(
            "Grades request failed (500)",
        );
    });
});
