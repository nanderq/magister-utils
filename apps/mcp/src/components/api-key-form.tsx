"use client";

import { useActionState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";

import { rotateApiKeyAction, type ApiKeyActionState } from "@/app/dashboard/api-key/actions";

const initialState: ApiKeyActionState = {};

export function ApiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [state, action, pending] = useActionState(rotateApiKeyAction, initialState);
  return <form action={action}>
    {state.key && <div className="secret"><strong>Copy this key now. It will not be shown again.</strong><br />{state.key}</div>}
    {state.error && <p className="error">{state.error}</p>}
    {hasKey && !state.key && <p>Rotating the key immediately disconnects every client using the current key.</p>}
    <button className="button" disabled={pending} type="submit" onClick={(event) => {
      if (hasKey && !window.confirm("Rotate this key and invalidate the current one?")) event.preventDefault();
    }}>{hasKey ? <RefreshCw aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{pending ? "Rotating…" : hasKey ? "Rotate API key" : "Create API key"}</button>
  </form>;
}
