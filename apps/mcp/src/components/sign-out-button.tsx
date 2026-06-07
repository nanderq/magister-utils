"use client";

import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  return <button className="button secondary" type="button" onClick={async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } });
  }}><LogOut aria-hidden="true" />Sign out</button>;
}
