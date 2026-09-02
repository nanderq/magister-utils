import { describe, expect, test } from "bun:test";

import { generateRandomHex, generateRandomString, sha256Base64Url } from "../../src/utils/generator";

describe("generateRandomString", () => {
  test("returns the requested length from the expected alphabet", () => {
    const value = generateRandomString(24);

    expect(value).toHaveLength(24);
    expect(value).toMatch(/^[0-9a-zA-Z]+$/);
  });
});

describe("generateRandomHex", () => {
  test("returns the requested length of hex characters", () => {
    const value = generateRandomHex(32);

    expect(value).toHaveLength(32);
    expect(value).toMatch(/^[0-9a-f]+$/);
  });
});

describe("sha256Base64Url", () => {
  test("returns a stable URL-safe digest", async () => {
    const digest = await sha256Base64Url("hello");

    expect(digest).toBe(await sha256Base64Url("hello"));
    expect(digest).not.toBe(await sha256Base64Url("world"));
    expect(digest).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(digest).not.toContain("=");
  });
});
