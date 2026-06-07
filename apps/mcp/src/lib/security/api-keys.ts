import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_PREFIX = "mag_mcp_";

export interface GeneratedApiKey {
  plaintext: string;
  hash: string;
  prefix: string;
  lastFour: string;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, KEY_PREFIX.length + 6),
    lastFour: plaintext.slice(-4),
  };
}

export function apiKeyHashMatches(key: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashApiKey(key), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
