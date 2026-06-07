"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, ShieldCheck } from "lucide-react";

import {
  completeMagisterAction,
  startMagisterAction,
  type MagisterActionState,
} from "@/app/dashboard/magister/actions";

const initialState: MagisterActionState = {};

export function MagisterConnectionForm() {
  const router = useRouter();
  const [startState, startAction, starting] = useActionState(startMagisterAction, initialState);
  const [completeState, completeAction, completing] = useActionState(completeMagisterAction, initialState);

  useEffect(() => {
    if (completeState.connected) router.refresh();
  }, [completeState.connected, router]);

  return <div>
    <form action={startAction}>
      <div className="field"><label htmlFor="tenant">School URL (optional)</label><input className="input" id="tenant" name="tenant" placeholder="https://school.magister.net" type="url" /></div>
      <button className="button" disabled={starting} type="submit"><Link2 aria-hidden="true" />{starting ? "Preparing…" : "1. Create Magister login"}</button>
      {startState.error && <p className="error">{startState.error}</p>}
    </form>
    {startState.loginUrl && <div className="connection-step">
      <p className="notice">The login attempt expires in ten minutes. Keep this dashboard tab open.</p>
      <a className="button secondary" href={startState.loginUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />2. Open Magister login</a>
      <ol className="steps">
        <li>Finish signing in to Magister in the new tab.</li>
        <li>When the browser cannot open the final app link, open Developer Tools and select Console.</li>
        <li>Right-click the console, choose “Save as” or copy all console output, then paste it below.</li>
      </ol>
      <form action={completeAction}>
        <div className="field"><label htmlFor="consoleOutput">Browser console output</label><textarea className="textarea" id="consoleOutput" name="consoleOutput" required spellCheck={false} /></div>
        <button className="button" disabled={completing} type="submit"><ShieldCheck aria-hidden="true" />{completing ? "Verifying…" : "3. Verify and connect"}</button>
        {completeState.error && <p className="error">{completeState.error}</p>}
        {completeState.connected && <p className="notice">Magister is connected. The pasted console output was not stored.</p>}
      </form>
    </div>}
  </div>;
}
