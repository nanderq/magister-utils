import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import MagisterClient from "../../src/client/MagisterClient";
import { TokenStore } from "../../src/auth/token-store";
import type { Tokens } from "../../src/types";

const storedTokens: Tokens = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    idToken: "id-token",
    expiresAt: Date.now() + 3_600_000,
};

function tempStore() {
    return new TokenStore({
        path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
    });
}

function mockFetch() {
    return (async (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : input.toString();

        if (url.startsWith("https://accounts.magister.net/connect/authorize?")) {
            return new Response(null, {
                status: 302,
                headers: {
                    Location: "/connect/authorize/callback",
                    "Set-Cookie": "auth-session=authorize; Path=/; Secure",
                },
            });
        }

        if (url === "https://accounts.magister.net/connect/authorize/callback") {
            const returnUrl = encodeURIComponent("/connect/authorize/complete?attempt=1");
            return new Response(null, {
                status: 302,
                headers: {
                    Location: `/account/login?sessionId=session-1&returnUrl=${returnUrl}`,
                    "Set-Cookie": "XSRF-TOKEN=xsrf%2Btoken; Path=/; Secure",
                },
            });
        }

        if (url.endsWith("/challenges/username") || url.endsWith("/challenges/password")) {
            return new Response(null, {
                status: 200,
                headers: { "Set-Cookie": "MAGISTER-SESSION=authenticated; Path=/; Secure" },
            });
        }

        if (url === "https://accounts.magister.net/connect/authorize/complete?attempt=1") {
            return new Response(null, {
                status: 302,
                headers: { Location: "m6loapp://oauth2redirect/#code=authorization-code&state=abc" },
            });
        }

        if (url === "https://accounts.magister.net/connect/token") {
            return Response.json({
                access_token: "fresh-access",
                refresh_token: "fresh-refresh",
                id_token: "fresh-id",
                expires_in: 3600,
            });
        }

        if (url === "https://magister.net/.well-known/host-meta.json?rel=magister-api") {
            return Response.json({
                links: [{ href: "https://school.magister.net/api/leerlingen/12345" }],
            });
        }

        throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;
}

describe("MagisterClient", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("can be constructed with tenant, username, and password", () => {
        const client = new MagisterClient("school.magister.net", "student@example.com", "secret");

        expect(client).toBeInstanceOf(MagisterClient);
        expect(client.login).toBeInstanceOf(Function);
        expect(client.session).toBeInstanceOf(Function);
        expect(client.hasSession).toBeInstanceOf(Function);
        expect(client.ensureSession).toBeInstanceOf(Function);
        expect(client.logout).toBeInstanceOf(Function);
        expect(client.account).toBeInstanceOf(Function);
        expect(client.schedule).toBeInstanceOf(Function);
        expect(client.appointment).toBeInstanceOf(Function);
    });

    test("session() restores a stored session", async () => {
        globalThis.fetch = mockFetch();
        const tokenStore = tempStore();
        await tokenStore.store(storedTokens);

        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tokenStore,
        );

        await expect(client.session()).resolves.toMatchObject({
            accessToken: "access-token",
            baseUrl: "https://school.magister.net/api",
        });
    });

    test("ensureSession() reuses a stored session instead of logging in", async () => {
        const requests: string[] = [];
        const fetchMock = mockFetch();
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push(url);
            return fetchMock(input, init);
        }) as typeof fetch;

        const tokenStore = tempStore();
        await tokenStore.store(storedTokens);

        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tokenStore,
        );

        await expect(client.ensureSession()).resolves.toMatchObject({
            accessToken: "access-token",
        });
        expect(requests.some((url) => url.includes("/connect/token"))).toBe(false);
    });

    test("ensureSession() logs in when no session exists", async () => {
        globalThis.fetch = mockFetch();
        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tempStore(),
        );

        await expect(client.ensureSession()).resolves.toMatchObject({
            accessToken: "fresh-access",
            baseUrl: "https://school.magister.net/api",
        });
    });

    test("login() creates a new session even when one is stored", async () => {
        globalThis.fetch = mockFetch();
        const tokenStore = tempStore();
        await tokenStore.store(storedTokens);

        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tokenStore,
        );

        await expect(client.login()).resolves.toMatchObject({
            accessToken: "fresh-access",
        });
    });

    test("logout() removes the session so it cannot be reused", async () => {
        globalThis.fetch = mockFetch();
        const tokenStore = tempStore();
        await tokenStore.store(storedTokens);

        const client = new MagisterClient(
            "school.magister.net",
            "student@example.com",
            "secret",
            tokenStore,
        );

        await client.session();
        await client.logout();
        await expect(client.session()).rejects.toThrow(`No token file at ${tokenStore.path}`);
    });
});
