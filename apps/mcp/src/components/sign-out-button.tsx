"use client";

import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  return (
    <button
      className="group inline-flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-[12px] font-medium text-[#858c81] transition-colors duration-300 hover:text-[#f2f4ed] [&_svg]:size-3.5 [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-0.5"
      type="button"
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: { onSuccess: () => window.location.assign("/") },
        });
      }}
    >
      <LogOut aria-hidden="true" />
      Sign out
    </button>
  );
}
