import { getDb } from "./index";
import { auditEvents } from "./schema";

export type AuditAction = "api_key_rotated" | "magister_connected" | "magister_disconnected";

export async function recordAuditEvent(userId: string, action: AuditAction) {
  await getDb().insert(auditEvents).values({ userId, action });
}
