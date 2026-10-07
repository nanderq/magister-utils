import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MagisterClient, TokenStore } from "../../src";

test("token-only client opens SDK tokens and logs out without credentials or network", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sdk-session-"));
  try {
    const store = new TokenStore({ path: join(dir, "tokens.json") });
    await store.store({ accessToken: "secret", refreshToken: "refresh", idToken: "id", expiresAt: Date.now() + 60000 }, { tenant: "school.magister.net", username: "student" });
    const client = await MagisterClient.fromTokensFile(store.path);
    expect(await client.hasSession()).toBe(true);
    await expect(client.login()).rejects.toThrow("requires credentials");
    await client.logout();
    expect(await Bun.file(store.path).exists()).toBe(false);
  } finally { await rm(dir, { recursive: true }); }
});

test("legacy token files receive actionable setup error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sdk-legacy-"));
  try {
    const path = join(dir, "tokens.json");
    await Bun.write(path, JSON.stringify({ access_token: "old" }));
    await expect(MagisterClient.fromTokensFile(path)).rejects.toThrow("Run mcli setup");
  } finally { await rm(dir, { recursive: true }); }
});

test("empty and truncated token files reject with the setup message", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sdk-bad-json-"));
  try {
    for (const [name, contents] of [["empty.json", ""], ["truncated.json", "{"]] as const) {
      const path = join(dir, name);
      await Bun.write(path, contents);
      const error = await MagisterClient.fromTokensFile(path).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(`Invalid token file at ${path}. Run mcli setup.`);
    }
    const missing = join(dir, "missing.json");
    const missingError = await MagisterClient.fromTokensFile(missing).catch((caught: unknown) => caught) as { code?: string };
    expect(missingError.code).toBe("ENOENT");
  } finally { await rm(dir, { recursive: true }); }
});
