"use server";

import { requireUser } from "@/lib/auth/session";
import { rotateApiKey } from "@/lib/security/api-key-repository";

export interface ApiKeyActionState { key?: string; error?: string; }

export async function rotateApiKeyAction(): Promise<ApiKeyActionState> {
  try {
    const user = await requireUser();
    return { key: await rotateApiKey(user.id) };
  } catch {
    return { error: "The API key could not be rotated." };
  }
}
