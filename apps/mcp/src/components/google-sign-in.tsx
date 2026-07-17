"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { button } from "@/lib/ui";

export function GoogleSignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return <div className="grid gap-4 [&_button]:w-full [&_button>svg]:size-[22px] [&_button>svg]:basis-[22px]">
    <button className={button} disabled={pending} type="button" onClick={async () => {
      setPending(true);
      setError(null);
      try {
        const result = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
        if (result.error) {
          setError(result.error.message ?? "Google sign-in could not be started.");
          setPending(false);
        }
      } catch {
        setError("Google sign-in could not be started. Check your connection and try again.");
        setPending(false);
      }
    }}><svg aria-hidden="true" viewBox="0 0 18 18"><path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"/><path fill="#34a853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.94v2.33A9 9 0 0 0 9 18Z"/><path fill="#fbbc05" d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.94a9 9 0 0 0 0 8.08l3.01-2.33Z"/><path fill="#ea4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .94 4.96l3.01 2.33C4.66 5.16 6.65 3.58 9 3.58Z"/></svg>{pending ? "Opening Google…" : "Continue with Google"}</button>
    {error && <p className="text-sm font-semibold text-[#f0968c]">{error}</p>}
  </div>;
}
