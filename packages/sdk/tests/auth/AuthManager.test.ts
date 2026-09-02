import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AuthManager } from "../../src/auth/AuthManager";
import { TokenStore } from "../../src/auth/token-store";

const account = {
    tenant: "school.magister.net",
    username: "student@example.com",
};

function mockLoginFetch() {
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
                access_token: "access",
                refresh_token: "refresh",
                id_token: "id",
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

describe("AuthManager", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("logs in, exchanges the code, and stores tokens", async () => {
        const requests: { url: string; init?: RequestInit }[] = [];
        const fetchMock = mockLoginFetch();
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push({ url, init });
            return fetchMock(input, init);
        }) as typeof fetch;

        const tokenStore = new TokenStore({
            path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
        });
        const auth = new AuthManager({
            tenant: "https://school.magister.net",
            username: "student@example.com",
            password: "secret",
            tokenStore,
        });

        const session = await auth.login();
        expect(session).toMatchObject({
            accessToken: "access",
            refreshToken: "refresh",
            idToken: "id",
            baseUrl: "https://school.magister.net/api",
        });
        expect(session.expiresAt).toBeGreaterThan(Date.now());
        await expect(auth.readTokens()).resolves.toMatchObject({
            accessToken: "access",
            refreshToken: "refresh",
            idToken: "id",
        });
        await expect(auth.session()).resolves.toEqual(session);

        const usernameRequest = requests.find(({ url }) => url.endsWith("/challenges/username"));
        const headers = new Headers(usernameRequest?.init?.headers);
        expect(headers.get("cookie")).toBe("auth-session=authorize; XSRF-TOKEN=xsrf%2Btoken");
        expect(headers.get("x-xsrf-token")).toBe("xsrf+token");
        expect(JSON.parse(String(usernameRequest?.init?.body))).toMatchObject({
            username: "student@example.com",
            sessionId: "session-1",
        });

        const tokenRequest = requests.find(({ url }) => url.endsWith("/connect/token"));
        expect(String(tokenRequest?.init?.body)).toContain("code=authorization-code");
        expect(String(tokenRequest?.init?.body)).toContain("code_verifier=");
        expect(requests.filter(({ url }) => url.includes("host-meta.json"))).toHaveLength(1);
    });

    test("session() reuses stored tokens without logging in again", async () => {
        const requests: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();
            requests.push(url);

            if (url === "https://magister.net/.well-known/host-meta.json?rel=magister-api") {
                return Response.json({
                    links: [{ href: "https://school.magister.net/api/leerlingen/12345" }],
                });
            }

            throw new Error(`Unexpected request: ${url}`);
        }) as typeof fetch;

        const tokenStore = new TokenStore({
            path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
        });
        await tokenStore.store({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            idToken: "id-token",
            expiresAt: Date.now() + 3_600_000,
        }, account);

        const auth = new AuthManager({
            tenant: "school.magister.net",
            username: "student@example.com",
            password: "secret",
            tokenStore,
        });

        const session = await auth.session();
        expect(session).toMatchObject({
            accessToken: "access-token",
            baseUrl: "https://school.magister.net/api",
        });
        await expect(auth.session()).resolves.toEqual(session);
        expect(requests).toEqual([
            "https://magister.net/.well-known/host-meta.json?rel=magister-api",
        ]);
    });

    test("session() refreshes expired tokens", async () => {
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();
            if (url === "https://accounts.magister.net/connect/token") {
                return Response.json({ access_token: "refreshed-access", expires_in: 3600 });
            }
            if (url === "https://magister.net/.well-known/host-meta.json?rel=magister-api") {
                return Response.json({
                    links: [{ href: "https://school.magister.net/api/leerlingen/12345" }],
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        }) as typeof fetch;
        const tokenStore = new TokenStore({
            path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
        });
        await tokenStore.store({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            idToken: "id-token",
            expiresAt: Date.now() - 1,
        }, account);

        const auth = new AuthManager({
            tenant: "school.magister.net",
            username: "student@example.com",
            password: "secret",
            tokenStore,
        });

        await expect(auth.session()).resolves.toMatchObject({
            accessToken: "refreshed-access",
            refreshToken: "refresh-token",
            idToken: "id-token",
        });
        await expect(tokenStore.read()).resolves.toMatchObject({ accessToken: "refreshed-access" });
    });

    test("hasSession() recognizes refreshable expired tokens", async () => {
        const tokenStore = new TokenStore({
            path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
        });
        const auth = new AuthManager({
            tenant: "school.magister.net",
            username: "student@example.com",
            password: "secret",
            tokenStore,
        });

        await expect(auth.hasSession()).resolves.toBe(false);

        await tokenStore.store({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            idToken: "id-token",
            expiresAt: Date.now() - 1,
        }, account);

        await expect(auth.hasSession()).resolves.toBe(true);
    });

    test("does not accept stored tokens belonging to another account", async () => {
        const tokenStore = new TokenStore({
            path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
        });
        await tokenStore.store({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            idToken: "id-token",
            expiresAt: Date.now() + 3_600_000,
        }, {
            tenant: "other.magister.net",
            username: "other@example.com",
        });
        const auth = new AuthManager({
            tenant: account.tenant,
            username: account.username,
            password: "secret",
            tokenStore,
        });

        await expect(auth.hasSession()).resolves.toBe(false);
        await expect(auth.session()).rejects.toThrow("Token file belongs to another Magister account");
    });

    test("deduplicates concurrent login calls", async () => {
        const requests: string[] = [];
        const fetchMock = mockLoginFetch();
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            requests.push(input instanceof Request ? input.url : input.toString());
            return fetchMock(input, init);
        }) as typeof fetch;
        const auth = new AuthManager({
            tenant: "school.magister.net",
            username: "student@example.com",
            password: "secret",
            tokenStore: new TokenStore({
                path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
            }),
        });

        const [first, second] = await Promise.all([auth.login(), auth.login()]);

        expect(first).toEqual(second);
        expect(requests.filter((url) => url.includes("/connect/token"))).toHaveLength(1);
    });

    test("logout() clears the stored session", async () => {
        globalThis.fetch = mockLoginFetch();

        const tokenStore = new TokenStore({
            path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
        });
        const auth = new AuthManager({
            tenant: "school.magister.net",
            username: "student@example.com",
            password: "secret",
            tokenStore,
        });

        await auth.login();
        await expect(auth.hasSession()).resolves.toBe(true);

        await auth.logout();
        await expect(auth.hasSession()).resolves.toBe(false);
        await expect(auth.session()).rejects.toThrow(`No token file at ${tokenStore.path}`);
    });
});
