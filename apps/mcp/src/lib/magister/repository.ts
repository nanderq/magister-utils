import { and, eq } from "drizzle-orm";
import {
  loginWithCredentials,
  MagisterClient,
  type MagisterCredentials,
  type Tokens,
} from "@magister/shared/magister";

import { recordAuditEvent } from "@/lib/db/audit";
import { getDb } from "@/lib/db";
import { magisterAuthAttempts, magisterConnections } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

import { MagisterConnectionError } from "./errors";

function sealTokens(tokens: Tokens, userId: string) {
  return {
    encryptedAccessToken: encryptSecret(tokens.access_token, userId),
    encryptedRefreshToken: encryptSecret(tokens.refresh_token, userId),
    encryptedIdToken: encryptSecret(tokens.id_token, userId),
  };
}

function openTokens(
  connection: Pick<
    typeof magisterConnections.$inferSelect,
    "encryptedAccessToken" | "encryptedRefreshToken" | "encryptedIdToken"
  >,
  userId: string,
): Tokens {
  return {
    access_token: decryptSecret(connection.encryptedAccessToken, userId),
    refresh_token: decryptSecret(connection.encryptedRefreshToken, userId),
    id_token: decryptSecret(connection.encryptedIdToken, userId),
  };
}

export async function getMagisterConnection(userId: string) {
  const [connection] = await getDb()
    .select({
      personId: magisterConnections.personId,
      displayName: magisterConnections.displayName,
      tenantId: magisterConnections.tenantId,
      connectedAt: magisterConnections.connectedAt,
      lastVerifiedAt: magisterConnections.lastVerifiedAt,
    })
    .from(magisterConnections)
    .where(eq(magisterConnections.userId, userId))
    .limit(1);
  return connection ?? null;
}

export async function connectMagister(
  userId: string,
  credentials: MagisterCredentials,
) {
  let tokens: Tokens;
  try {
    tokens = await loginWithCredentials(credentials);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Magister rejected the credentials.";
    throw new MagisterConnectionError("MAGISTER_AUTH_EXPIRED", message);
  }

  let state;
  try {
    state = await new MagisterClient({ tokens, autoPersistTokens: false }).getAuthState();
  } catch {
    throw new MagisterConnectionError("MAGISTER_AUTH_EXPIRED", "The Magister account could not be verified.");
  }

  const personId = state.magisterAccount.Persoon?.Id?.toString();
  if (!personId) throw new MagisterConnectionError("INTERNAL_ERROR", "The Magister account has no student person ID.");

  const sealed = sealTokens(tokens, userId);
  await getDb()
    .insert(magisterConnections)
    .values({
      userId,
      ...sealed,
      personId,
      displayName: state.name,
      tenantId: state.accountInfo.tid ?? null,
    })
    .onConflictDoUpdate({
      target: magisterConnections.userId,
      set: {
        ...sealed,
        personId,
        displayName: state.name,
        tenantId: state.accountInfo.tid ?? null,
        tokenVersion: 1,
        connectedAt: new Date(),
        updatedAt: new Date(),
        lastVerifiedAt: new Date(),
      },
    });
  await getDb().delete(magisterAuthAttempts).where(eq(magisterAuthAttempts.userId, userId));
  await recordAuditEvent(userId, "magister_connected");
}

export async function disconnectMagister(userId: string) {
  await getDb().delete(magisterConnections).where(eq(magisterConnections.userId, userId));
  await getDb().delete(magisterAuthAttempts).where(eq(magisterAuthAttempts.userId, userId));
  await recordAuditEvent(userId, "magister_disconnected");
}

export async function createMagisterClient(userId: string): Promise<MagisterClient> {
  const [connection] = await getDb()
    .select()
    .from(magisterConnections)
    .where(eq(magisterConnections.userId, userId))
    .limit(1);
  if (!connection) throw new MagisterConnectionError("MAGISTER_NOT_CONNECTED", "Connect a Magister account in the dashboard first.");

  const loadedVersion = connection.tokenVersion;
  const tokens = openTokens(connection, userId);
  return new MagisterClient({
    tokens,
    autoPersistTokens: false,
    onTokensChanged: async (nextTokens) => {
      await getDb()
        .update(magisterConnections)
        .set({
          ...sealTokens(nextTokens, userId),
          tokenVersion: loadedVersion + 1,
          updatedAt: new Date(),
          lastVerifiedAt: new Date(),
        })
        .where(and(
          eq(magisterConnections.userId, userId),
          eq(magisterConnections.tokenVersion, loadedVersion),
        ));
    },
  });
}
