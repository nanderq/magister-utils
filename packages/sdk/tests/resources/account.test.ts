import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import MagisterClient from "../../src/client/MagisterClient";
import { TokenStore } from "../../src/auth/token-store";
import { getEnrollments } from "../../src/resources/account";
import type { Account, Enrollment, Tokens } from "../../src/types";

const tokens: Tokens = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    idToken: "id-token",
    expiresAt: Date.now() + 3_600_000,
};

const accountPayload: Account = {
    UuId: "account-uuid",
    Persoon: {
        Id: 12345,
        Roepnaam: "Nander",
        OfficieleVoornamen: "Nander",
        Voorletters: "N.",
        Tussenvoegsel: "",
        Achternaam: "Student",
        OfficieleTussenvoegsels: "",
        OfficieleAchternaam: "Student",
        Geboortedatum: "2000-01-01",
        ExterneId: "12345",
    },
    Groep: [],
    Links: [],
};

function tempStore() {
    return new TokenStore({
        path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
    });
}

describe("MagisterClient.account", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("resolves the school API and returns account information", async () => {
        const requests: { url: string; headers: Headers }[] = [];

        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push({ url, headers: new Headers(init?.headers) });

            if (url === "https://magister.net/.well-known/host-meta.json?rel=magister-api") {
                return Response.json({
                    links: [{ href: "https://school.magister.net/api/leerlingen/12345" }],
                });
            }

            if (url === "https://school.magister.net/api/account?noCache=0") {
                return Response.json(accountPayload);
            }

            throw new Error(`Unexpected request: ${url}`);
        }) as typeof fetch;

        const tokenStore = tempStore();
        await tokenStore.store(tokens);

        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tokenStore,
        );

        await expect(client.account()).resolves.toEqual(accountPayload);
        await expect(client.account()).resolves.toEqual(accountPayload);

        expect(requests.filter(({ url }) => url.includes("host-meta.json"))).toHaveLength(1);
        expect(requests.filter(({ url }) => url.endsWith("/account?noCache=0"))).toHaveLength(2);
        expect(requests[0]?.headers.get("authorization")).toBe("Bearer access-token");
        expect(requests[1]?.headers.get("authorization")).toBe("Bearer access-token");
        expect(requests[1]?.headers.get("accept")).toBe("application/json");
    });

    test("throws when the account request fails", async () => {
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();

            if (url === "https://magister.net/.well-known/host-meta.json?rel=magister-api") {
                return Response.json({
                    links: [{ href: "https://school.magister.net/api/leerlingen/12345" }],
                });
            }

            return new Response("nope", { status: 500 });
        }) as typeof fetch;

        const tokenStore = tempStore();
        await tokenStore.store(tokens);

        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tokenStore,
        );

        await expect(client.account()).rejects.toThrow(
            "Account request failed (500) for https://school.magister.net/api/account?noCache=0",
        );
    });

    test("refreshes and retries once when the access token is unauthorized", async () => {
        const seenTokens: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            if (url === "https://magister.net/.well-known/host-meta.json?rel=magister-api") {
                return Response.json({ links: [{ href: "https://school.magister.net/api/leerlingen/12345" }] });
            }
            if (url === "https://accounts.magister.net/connect/token") {
                return Response.json({ access_token: "refreshed-access", expires_in: 3600 });
            }
            if (url.endsWith("/account?noCache=0")) {
                const token = new Headers(init?.headers).get("authorization") ?? "";
                seenTokens.push(token);
                return token === "Bearer refreshed-access"
                    ? Response.json(accountPayload)
                    : new Response(null, { status: 401 });
            }
            throw new Error(`Unexpected request: ${url}`);
        }) as typeof fetch;
        const tokenStore = tempStore();
        await tokenStore.store(tokens);
        const client = new MagisterClient("school.magister.net", "student@example.com", "secret", tokenStore);

        await expect(client.account()).resolves.toEqual(accountPayload);
        expect(seenTokens).toEqual(["Bearer access-token", "Bearer refreshed-access"]);
    });
});

describe("getEnrollments", () => {
    const originalFetch = globalThis.fetch;
    const baseUrl = "https://school.magister.net/api";
    const items = [
        { id: 100, einde: "2026-07-31" },
        { id: 174333, einde: "2027-07-31" },
        { id: 0, einde: "2028-07-31" },
    ] as Enrollment[];

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("returns all enrollments by default", async () => {
        globalThis.fetch = (async () => Response.json({ items })) as unknown as typeof fetch;

        await expect(getEnrollments(baseUrl, "access-token", 12345)).resolves.toEqual(items);
    });

    test("returns the enrollment with the latest end date when latest is true", async () => {
        globalThis.fetch = (async () => Response.json({ items })) as unknown as typeof fetch;

        await expect(
            getEnrollments(baseUrl, "access-token", 12345, { latest: true }),
        ).resolves.toEqual(items[1]);
    });
});
