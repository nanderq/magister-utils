import { timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";
import {
  exchangeCodeForTokens,
  generateLoginURL,
  generateRandomString,
  MagisterClient,
  NATIVE_REDIRECT_URI,
  type Tokens,
} from "@magister/shared/magister";

import { recordAuditEvent } from "@/lib/db/audit";
import { getDb } from "@/lib/db";
import { magisterAuthAttempts, magisterConnections } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

import { MagisterConnectionError } from "./errors";
import { extractMagisterRedirectUrl, getRedirectParameter } from "./redirect";

const ATTEMPT_TTL_MS = 10 * 60 * 1000;

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

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
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

export async function startMagisterConnection(userId: string, tenant?: string) {
  const codeVerifier = generateRandomString(64);
  const state = generateRandomString(64);
  const nonce = generateRandomString(48);
  const db = getDb();

  await db.delete(magisterAuthAttempts).where(eq(magisterAuthAttempts.userId, userId));
  await db.insert(magisterAuthAttempts).values({
    userId,
    codeVerifier,
    state,
    expiresAt: new Date(Date.now() + ATTEMPT_TTL_MS),
  });

  return generateLoginURL(codeVerifier, {
    tenant: tenant?.trim() || undefined,
    redirectUri: NATIVE_REDIRECT_URI,
    state,
    nonce,
  });
}

export async function completeMagisterConnection(userId: string, consoleOutput: string) {
  const redirectUrl = extractMagisterRedirectUrl(consoleOutput);
  if (!redirectUrl) {
    throw new MagisterConnectionError("INVALID_ARGUMENT", "No Magister redirect URL was found in the pasted console output.");
  }

  const [attempt] = await getDb()
    .select()
    .from(magisterAuthAttempts)
    .where(eq(magisterAuthAttempts.userId, userId))
    .limit(1);

  if (!attempt || attempt.expiresAt.getTime() <= Date.now()) {
    throw new MagisterConnectionError("MAGISTER_AUTH_EXPIRED", "The Magister login attempt expired. Start the connection flow again.");
  }

  const returnedState = getRedirectParameter(redirectUrl, "state");
  if (!returnedState || !safeEqual(returnedState, attempt.state)) {
    throw new MagisterConnectionError("INVALID_ARGUMENT", "The Magister login state did not match this browser session.");
  }

  const oauthError = getRedirectParameter(redirectUrl, "error");
  if (oauthError) {
    throw new MagisterConnectionError("MAGISTER_AUTH_EXPIRED", getRedirectParameter(redirectUrl, "error_description") ?? oauthError);
  }

  const code = getRedirectParameter(redirectUrl, "code");
  if (!code) throw new MagisterConnectionError("INVALID_ARGUMENT", "The Magister redirect did not contain an authorization code.");

  let tokens: Tokens;
  try {
    tokens = await exchangeCodeForTokens(code, attempt.codeVerifier, NATIVE_REDIRECT_URI);
  } catch {
    throw new MagisterConnectionError("MAGISTER_AUTH_EXPIRED", "Magister rejected the authorization code. Start a fresh login and try again.");
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
