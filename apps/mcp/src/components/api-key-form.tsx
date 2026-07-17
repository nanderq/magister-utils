"use client";

import { useActionState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";

import {
  rotateApiKeyAction,
  type ApiKeyActionState,
} from "@/app/dashboard/api-key/actions";
import { button } from "@/lib/ui";

const initialState: ApiKeyActionState = {};

export function ApiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [state, action, pending] = useActionState(
    rotateApiKeyAction,
    initialState,
  );
  return (
    <form action={action} className="mt-7">
      {state.key && (
        <div className="mb-6 [overflow-wrap:anywhere] border-y border-[#c8ff4a]/25 bg-[#c8ff4a]/[0.04] p-5 font-mono text-[13px] leading-[1.65] text-[#dce5d2]">
          <strong className="text-[#c8ff4a]">Copy this key now. It will not be shown again.</strong>
          <br />
          {state.key}
        </div>
      )}
      {state.error && <p className="text-sm font-semibold text-[#f0968c]">{state.error}</p>}
      {hasKey && !state.key && (
        <p className="mb-6 max-w-[560px] leading-[1.7] text-[#92998e]">
          Rotating the key immediately disconnects every client using the
          current key.
        </p>
      )}
      <button
        className={button}
        disabled={pending}
        type="submit"
        onClick={(event) => {
          if (
            hasKey &&
            !window.confirm("Rotate this key and invalidate the current one?")
          )
            event.preventDefault();
        }}
      >
        {hasKey ? (
          <RefreshCw aria-hidden="true" />
        ) : (
          <KeyRound aria-hidden="true" />
        )}
        {pending ? "Rotating…" : hasKey ? "Rotate API key" : "Create API key"}
      </button>
    </form>
  );
}
