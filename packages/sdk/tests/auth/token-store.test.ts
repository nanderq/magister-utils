import { describe, expect, test } from "bun:test";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TokenStore } from "../../src/auth/token-store";
import type { Tokens } from "../../src/types";

const tokens: Tokens = {
    accessToken: "access",
    refreshToken: "refresh",
    idToken: "id",
    expiresAt: 1_700_000_000,
};

const account = {
    tenant: "school.magister.net",
    username: "student@example.com",
};

function tempStore() {
    return new TokenStore({
        path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
    });
}

describe("TokenStore", () => {
    test("stores, reads, and deletes tokens at the configured path", async () => {
        const store = tempStore();

        await store.store(tokens, account);
        await expect(store.read(account)).resolves.toEqual(tokens);

        await store.delete();
        await expect(store.read()).rejects.toThrow(`No token file at ${store.path}`);
    });

    test("delete is a no-op when the file is missing", async () => {
        const store = tempStore();
        await expect(store.delete()).resolves.toBeUndefined();
    });

    test("rejects malformed token data", async () => {
        const store = tempStore();
        await Bun.write(store.path, JSON.stringify({ accessToken: "access" }));

        await expect(store.read()).rejects.toThrow(`Invalid token file at ${store.path}`);
    });

    test("stores token files with owner-only permissions", async () => {
        const store = tempStore();
        writeFileSync(store.path, "{}", { mode: 0o644 });

        await store.store(tokens, account);

        expect(statSync(store.path).mode & 0o777).toBe(0o600);
    });

    test("rejects tokens stored for another account", async () => {
        const store = tempStore();
        await store.store(tokens, account);

        await expect(store.read({
            tenant: "other.magister.net",
            username: "other@example.com",
        })).rejects.toThrow("Token file belongs to another Magister account");
    });
});
