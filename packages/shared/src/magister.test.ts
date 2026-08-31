import { describe, expect, test } from "bun:test";

import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  generateLoginURL,
  getDefaultTokensFilePath,
  loginWithCredentials,
  MagisterClient,
  type Tokens,
  writeTokensFile,
} from "./magister";

describe("credential authentication", () => {
  test("runs the Magister challenge flow and exchanges its authorization code", async () => {
    const originalFetch = globalThis.fetch;
    const requests: { url: string; init?: RequestInit }[] = [];
    let expectedState = "";

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push({ url, init });

      if (url.startsWith("https://accounts.magister.net/connect/authorize?")) {
        expectedState = new URL(url).searchParams.get("state") ?? "";
        return new Response(null, {
          status: 302,
          headers: { Location: "/connect/authorize/callback" },
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
      if (url.endsWith("/challenges/username")) return new Response(null, { status: 200 });
      if (url.endsWith("/challenges/password")) {
        return new Response(null, {
          status: 200,
          headers: { "Set-Cookie": "MAGISTER-SESSION=authenticated; Path=/; Secure" },
        });
      }
      if (url === "https://accounts.magister.net/connect/authorize/complete?attempt=1") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `m6loapp://oauth2redirect/#code=authorization-code&state=${expectedState}`,
          },
        });
      }
      if (url === "https://accounts.magister.net/connect/token") {
        return Response.json({
          access_token: "access",
          refresh_token: "refresh",
          id_token: "id",
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;

    try {
      await expect(loginWithCredentials({
        tenant: "school.magister.net",
        username: "student@example.com",
        password: "secret",
      })).resolves.toEqual({
        access_token: "access",
        refresh_token: "refresh",
        id_token: "id",
      });

      const usernameRequest = requests.find(({ url }) => url.endsWith("/challenges/username"));
      expect(JSON.parse(String(usernameRequest?.init?.body))).toMatchObject({
        sessionId: "session-1",
        returnUrl: "/connect/authorize/complete?attempt=1",
        username: "student@example.com",
      });
      expect(new Headers(usernameRequest?.init?.headers).get("x-xsrf-token")).toBe("xsrf+token");

      const callbackRequest = requests.find(({ url }) => url.includes("/authorize/complete"));
      expect(new Headers(callbackRequest?.init?.headers).get("cookie")).toContain(
        "MAGISTER-SESSION=authenticated",
      );

      const tokenRequest = requests.at(-1);
      const tokenBody = new URLSearchParams(String(tokenRequest?.init?.body));
      expect(tokenBody.get("code")).toBe("authorization-code");
      expect(tokenBody.get("code_verifier")?.length).toBe(64);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("accepts a bare Magister tenant hostname in login URLs", async () => {
    const url = new URL(await generateLoginURL("verifier", { tenant: "school.magister.net" }));
    expect(url.searchParams.get("acr_values")).toBe("tenant:school.magister.net");
  });

  test("skips the passkey promotion before following a state-less app redirect", async () => {
    const originalFetch = globalThis.fetch;
    const originalDebug = process.env.MAGISTER_AUTH_DEBUG;
    const originalConsoleError = console.error;
    const debugLines: string[] = [];
    let requestNumber = 0;

    process.env.MAGISTER_AUTH_DEBUG = "1";
    console.error = (...values: unknown[]) => debugLines.push(values.map(String).join(" "));

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      requestNumber += 1;
      switch (requestNumber) {
        case 1:
          return new Response(null, {
            status: 302,
            headers: { Location: "/connect/authorize/callback" },
          });
        case 2:
          return new Response(null, {
            status: 302,
            headers: {
              Location: "/account/login?sessionId=session-1&returnUrl=%2Fconnect%2Fauthorize%2Fcomplete",
              "Set-Cookie": "XSRF-TOKEN=token; Path=/; Secure",
            },
          });
        case 3:
          return Response.json({ action: "password" });
        case 4:
          return Response.json({
            action: "pairfidopromo",
            fidoCreationOptions: {
              challenge: "webauthn-challenge",
              allowCredentials: [{ id: "credential-id" }],
              user: { id: "user-id", name: "user-name" },
            },
          });
        case 5:
          expect(url).toBe("https://accounts.magister.net/challenges/skip-pair-fido-promo");
          expect(JSON.parse(String(init?.body))).toMatchObject({
            reason: "browser-not-supported",
            userVerifyingPlatformAuthenticator: null,
          });
          return Response.json({ redirectURL: "/connect/authorize/complete" });
        case 6:
          return new Response(null, {
            status: 302,
            headers: { Location: "m6loapp://oauth2redirect/#code=authorization-code" },
          });
        case 7:
          return Response.json({
            access_token: "access",
            refresh_token: "refresh",
            id_token: "id",
          });
        default:
          throw new Error(`Unexpected request number: ${requestNumber}`);
      }
    }) as typeof fetch;

    try {
      await expect(loginWithCredentials({
        tenant: "school.magister.net",
        username: "student@example.com",
        password: "secret",
      })).resolves.toEqual({
        access_token: "access",
        refresh_token: "refresh",
        id_token: "id",
      });
      expect(debugLines).toHaveLength(7);
      expect(debugLines.join("\n")).toContain('"step":"skip-passkey-promotion"');
      expect(debugLines.join("\n")).toContain('"step":"authorization-callback"');
      expect(debugLines.join("\n")).toContain('"locationParameters":["code"]');
      expect(debugLines.join("\n")).not.toContain("authorization-code");
      expect(debugLines.join("\n")).not.toContain('"access_token":"access"');
      expect(debugLines.join("\n")).not.toContain("webauthn-challenge");
      expect(debugLines.join("\n")).not.toContain("credential-id");
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalConsoleError;
      if (originalDebug == null) delete process.env.MAGISTER_AUTH_DEBUG;
      else process.env.MAGISTER_AUTH_DEBUG = originalDebug;
    }
  });
});

describe("MagisterClient token persistence", () => {
  test("notifies non-file token stores when tokens change", async () => {
    const initial: Tokens = { access_token: "a", refresh_token: "r", id_token: "i" };
    const next: Tokens = { access_token: "a2", refresh_token: "r2", id_token: "i2" };
    let persisted: Tokens | undefined;
    const client = new MagisterClient({
      tokens: initial,
      autoPersistTokens: false,
      onTokensChanged: async (tokens) => { persisted = tokens; },
    });
    await client.setTokens(next);
    expect(persisted).toEqual(next);
  });

  test("writes token files with owner-only permissions", async () => {
    const root = mkdtempSync(join(tmpdir(), "magister-token-permissions-"));
    const path = join(root, "tokens.json");
    const tokens: Tokens = { access_token: "a", refresh_token: "r", id_token: "i" };

    try {
      writeFileSync(path, "{}", { mode: 0o644 });
      await writeTokensFile(path, tokens);
      expect(statSync(path).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("token file resolution", () => {
  test("prefers setup-managed global tokens over a local legacy file", () => {
    const originalHome = process.env.HOME;
    const originalOverride = process.env.MAGISTER_TOKENS_FILE;
    const originalCwd = process.cwd();
    const root = mkdtempSync(join(tmpdir(), "magister-token-resolution-"));
    const home = join(root, "home");
    const workspace = join(root, "workspace");
    const globalPath = join(home, ".config", "magister", "tokens.json");
    const localPath = join(workspace, "tokens.json");

    try {
      mkdirSync(join(home, ".config", "magister"), { recursive: true });
      mkdirSync(workspace, { recursive: true });
      writeFileSync(globalPath, "{}");
      writeFileSync(localPath, "{}");
      process.env.HOME = home;
      delete process.env.MAGISTER_TOKENS_FILE;
      process.chdir(workspace);

      expect(existsSync(globalPath)).toBe(true);
      expect(getDefaultTokensFilePath()).toBe(globalPath);
    } finally {
      process.chdir(originalCwd);
      if (originalHome == null) delete process.env.HOME;
      else process.env.HOME = originalHome;
      if (originalOverride == null) delete process.env.MAGISTER_TOKENS_FILE;
      else process.env.MAGISTER_TOKENS_FILE = originalOverride;
      rmSync(root, { recursive: true, force: true });
    }
  });
});
