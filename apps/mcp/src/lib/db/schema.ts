import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const magisterConnections = pgTable("magister_connections", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  encryptedIdToken: text("encrypted_id_token").notNull(),
  personId: text("person_id").notNull(),
  displayName: text("display_name"),
  tenantId: text("tenant_id"),
  tokenVersion: integer("token_version").notNull().default(1),
  connectedAt: timestamp("connected_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  lastVerifiedAt: timestamp("last_verified_at", { mode: "date" }).notNull().defaultNow(),
});

export const magisterAuthAttempts = pgTable(
  "magister_auth_attempts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    codeVerifier: text("code_verifier").notNull(),
    state: text("state").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (attempt) => [uniqueIndex("magister_auth_attempt_user_idx").on(attempt.userId)],
);

export const apiKeys = pgTable("api_keys", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  lastFour: text("last_four").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { mode: "date" }),
  revokedAt: timestamp("revoked_at", { mode: "date" }),
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
