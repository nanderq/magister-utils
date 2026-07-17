"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, ShieldCheck } from "lucide-react";

import {
  completeMagisterAction,
  startMagisterAction,
  type MagisterActionState,
} from "@/app/dashboard/magister/actions";
import { button, secondaryButton } from "@/lib/ui";

const initialState: MagisterActionState = {};

export function MagisterConnectionForm() {
  const router = useRouter();
  const [startState, startAction, starting] = useActionState(startMagisterAction, initialState);
  const [completeState, completeAction, completing] = useActionState(completeMagisterAction, initialState);

  useEffect(() => {
    if (completeState.connected) router.refresh();
  }, [completeState.connected, router]);

  return <div className="mt-7">
    <form action={startAction}>
      <div className="mb-6 grid gap-3"><label className="font-mono text-[10px] leading-none tracking-[0.1em] text-[#a4aa9f] uppercase" htmlFor="tenant">School URL (optional)</label><input aria-label="School URL" className="w-full rounded-[14px] border border-white/15 bg-white/[0.035] px-4 py-4 text-[#f2f4ed] outline-none transition-[border-color,box-shadow,background] placeholder:text-[#555c52] focus:border-[#c8ff4a]/70 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(200,255,74,0.06)]" id="tenant" name="tenant" placeholder="https://school.magister.net" type="url" /></div>
      <button className={button} disabled={starting} type="submit"><Link2 aria-hidden="true" />{starting ? "Preparing…" : "1. Create Magister login"}</button>
      {startState.error && <p className="text-sm font-semibold text-[#f0968c]">{startState.error}</p>}
    </form>
    {startState.loginUrl && <div className="mt-10 border-t border-white/15 pt-10">
      <p className="border-y border-white/10 bg-white/[0.025] px-4 py-4 leading-[1.6] text-[#aeb4aa]">The login attempt expires in ten minutes. Keep this dashboard tab open.</p>
      <a className={secondaryButton} href={startState.loginUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />2. Open Magister login</a>
      <ol className="my-7 list-none p-0">
        <li className="grid grid-cols-[42px_1fr] gap-4 border-b border-white/10 py-4 text-[#aeb4aa] before:font-mono before:text-[10px] before:leading-[1.7] before:text-[#697066] before:content-['01']">Finish signing in to Magister in the new tab.</li>
        <li className="grid grid-cols-[42px_1fr] gap-4 border-b border-white/10 py-4 text-[#aeb4aa] before:font-mono before:text-[10px] before:leading-[1.7] before:text-[#697066] before:content-['02']">When the browser cannot open the final app link, open Developer Tools and select Console.</li>
        <li className="grid grid-cols-[42px_1fr] gap-4 border-b border-white/10 py-4 text-[#aeb4aa] before:font-mono before:text-[10px] before:leading-[1.7] before:text-[#697066] before:content-['03']">Right-click the console, choose “Save as” or copy all console output, then paste it below.</li>
      </ol>
      <form action={completeAction}>
        <div className="mb-6 grid gap-3"><label className="font-mono text-[10px] leading-none tracking-[0.1em] text-[#a4aa9f] uppercase" htmlFor="consoleOutput">Browser console output</label><textarea aria-label="Browser console output" className="min-h-[220px] w-full resize-y rounded-[14px] border border-white/15 bg-white/[0.035] px-4 py-4 font-mono text-[13px] leading-[1.55] text-[#f2f4ed] outline-none transition-[border-color,box-shadow,background] focus:border-[#c8ff4a]/70 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(200,255,74,0.06)]" id="consoleOutput" name="consoleOutput" required spellCheck={false} /></div>
        <button className={button} disabled={completing} type="submit"><ShieldCheck aria-hidden="true" />{completing ? "Verifying…" : "3. Verify and connect"}</button>
        {completeState.error && <p className="text-sm font-semibold text-[#f0968c]">{completeState.error}</p>}
        {completeState.connected && <p className="border-y border-[#c8ff4a]/20 bg-[#c8ff4a]/[0.04] px-4 py-4 leading-[1.6] text-[#c6d0bc]">Magister is connected. The pasted console output was not stored.</p>}
      </form>
    </div>}
  </div>;
}
