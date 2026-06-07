import { and, eq, isNull } from "drizzle-orm";

import { recordAuditEvent } from "@/lib/db/audit";
import { getDb } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

import { apiKeyHashMatches, generateApiKey } from "./api-keys";

export async function getApiKeyStatus(userId: string) {
  const [key] = await getDb()
    .select({
      prefix: apiKeys.prefix,
      lastFour: apiKeys.lastFour,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .limit(1);
  return key ?? null;
}

export async function rotateApiKey(userId: string) {
  const key = generateApiKey();
  await getDb()
    .insert(apiKeys)
    .values({ userId, keyHash: key.hash, prefix: key.prefix, lastFour: key.lastFour })
    .onConflictDoUpdate({
      target: apiKeys.userId,
      set: {
        keyHash: key.hash,
        prefix: key.prefix,
        lastFour: key.lastFour,
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      },
    });
  await recordAuditEvent(userId, "api_key_rotated");
  return key.plaintext;
}

export async function authenticateApiKey(plaintext: string) {
  if (!plaintext.startsWith("mag_mcp_")) return null;
  const prefix = plaintext.slice(0, "mag_mcp_".length + 6);
  const candidates = await getDb()
    .select({ userId: apiKeys.userId, keyHash: apiKeys.keyHash, prefix: apiKeys.prefix })
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)));
  const match = candidates.find((candidate) => apiKeyHashMatches(plaintext, candidate.keyHash));
  if (!match) return null;
  await getDb().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.userId, match.userId));
  return { userId: match.userId, prefix: match.prefix };
}
