"use server";

import { requireUser } from "@/lib/auth/session";
import { MagisterConnectionError } from "@/lib/magister/errors";
import {
  completeMagisterConnection,
  disconnectMagister,
  startMagisterConnection,
} from "@/lib/magister/repository";

export interface MagisterActionState {
  loginUrl?: string;
  connected?: boolean;
  error?: string;
}

export async function startMagisterAction(
  _state: MagisterActionState,
  formData: FormData,
): Promise<MagisterActionState> {
  try {
    const user = await requireUser();
    const tenant = String(formData.get("tenant") ?? "");
    return { loginUrl: await startMagisterConnection(user.id, tenant) };
  } catch {
    return { error: "The Magister login could not be started." };
  }
}

export async function completeMagisterAction(
  _state: MagisterActionState,
  formData: FormData,
): Promise<MagisterActionState> {
  try {
    const user = await requireUser();
    await completeMagisterConnection(user.id, String(formData.get("consoleOutput") ?? ""));
    return { connected: true };
  } catch (error) {
    return {
      error: error instanceof MagisterConnectionError
        ? error.message
        : "The Magister account could not be connected.",
    };
  }
}

export async function disconnectMagisterAction() {
  const user = await requireUser();
  await disconnectMagister(user.id);
}
