import { describe, expect, test } from "bun:test";

import { apiKeyHashMatches, generateApiKey, hashApiKey } from "./api-keys";

describe("API keys", () => {
  test("generates recognizable high-entropy keys", () => {
    const key = generateApiKey();
    expect(key.plaintext.startsWith("mag_mcp_")).toBe(true);
    expect(key.plaintext.length).toBeGreaterThan(50);
    expect(key.hash).toBe(hashApiKey(key.plaintext));
    expect(apiKeyHashMatches(key.plaintext, key.hash)).toBe(true);
  });

  test("rejects a different key", () => {
    const key = generateApiKey();
    expect(apiKeyHashMatches(`${key.plaintext}x`, key.hash)).toBe(false);
  });
});
