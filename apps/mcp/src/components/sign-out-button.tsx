"use client";

import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { secondaryButton } from "@/lib/ui";

export function SignOutButton() {
  return <button className={secondaryButton} type="button" onClick={async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } });
  }}><LogOut aria-hidden="true" />Sign out</button>;
}
