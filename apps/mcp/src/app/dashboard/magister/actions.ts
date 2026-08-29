"use server";

import { requireUser } from "@/lib/auth/session";
import { MagisterConnectionError } from "@/lib/magister/errors";
import {
  connectMagister,
  disconnectMagister,
} from "@/lib/magister/repository";
import { redirect } from "next/navigation";

export interface MagisterActionState {
  connected?: boolean;
  error?: string;
}

export async function connectMagisterAction(
  _state: MagisterActionState,
  formData: FormData,
): Promise<MagisterActionState> {
  try {
    const user = await requireUser();
    await connectMagister(user.id, {
      tenant: String(formData.get("tenant") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
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
  redirect("/dashboard/magister");
}
