import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
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

function tempStore() {
    return new TokenStore({
        path: join(mkdtempSync(join(tmpdir(), "magister-sdk-")), "tokens.json"),
    });
}

describe("TokenStore", () => {
    test("stores, reads, and deletes tokens at the configured path", async () => {
        const store = tempStore();

        await store.store(tokens);
        await expect(store.read()).resolves.toEqual(tokens);

        await store.delete();
        await expect(store.read()).rejects.toThrow(`No token file at ${store.path}`);
    });

    test("delete is a no-op when the file is missing", async () => {
        const store = tempStore();
        await expect(store.delete()).resolves.toBeUndefined();
    });
});
