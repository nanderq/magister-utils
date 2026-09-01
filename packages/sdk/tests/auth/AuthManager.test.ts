import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AuthManager } from "../../src/auth/AuthManager";
import { TokenStore } from "../../src/auth/token-store";

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

        const tokens = await auth.login();
        expect(tokens).toMatchObject({
            accessToken: "access",
            refreshToken: "refresh",
            idToken: "id",
        });
        expect(tokens.expiresAt).toBeGreaterThan(Date.now());
        await expect(auth.readTokens()).resolves.toEqual(tokens);

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
    });
});
