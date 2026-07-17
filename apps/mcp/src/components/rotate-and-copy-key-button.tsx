"use client";

import { useActionState, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  rotateApiKeyAction,
  type ApiKeyActionState,
} from "@/app/dashboard/api-key/actions";
import { CopyButton } from "@/components/copy-button";
import { secondaryButton } from "@/lib/ui";

const initialState: ApiKeyActionState = {};

export function RotateAndCopyKeyButton() {
  const [state, action, pending] = useActionState(
    rotateApiKeyAction,
    initialState,
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  useEffect(() => {
    if (!state.key) return;

    setCopyStatus("idle");
    navigator.clipboard.writeText(state.key).then(
      () => setCopyStatus("copied"),
      () => setCopyStatus("failed"),
    );
  }, [state.key]);

  return (
    <>
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Rotate this key, invalidate the current one, and copy the replacement?",
            )
          )
            event.preventDefault();
        }}
      >
        <button className={secondaryButton} disabled={pending} type="submit">
          <RefreshCw aria-hidden="true" />
          {pending ? "Rotating…" : "Rotate & copy new key"}
        </button>
      </form>

      {state.key && (
        <div className="mt-3 basis-full border-y border-[#c8ff4a]/25 bg-[#c8ff4a]/[0.04] p-5">
          <strong className="text-[13px] text-[#c8ff4a]">
            {copyStatus === "copied"
              ? "New key copied. It will not be shown again."
              : copyStatus === "failed"
                ? "Automatic copy was blocked. Copy this key now."
                : "New key created. Copying…"}
          </strong>
          <div className="mt-4 flex items-center gap-3 max-[760px]:flex-col max-[760px]:items-start">
            <code className="min-w-0 flex-1 [overflow-wrap:anywhere] font-mono text-[13px] leading-[1.65] text-[#dce5d2]">
              {state.key}
            </code>
            <CopyButton label="Copy key" value={state.key} />
          </div>
        </div>
      )}

      {state.error && (
        <p className="basis-full text-sm font-semibold text-[#f0968c]">
          {state.error}
        </p>
      )}
    </>
  );
}
