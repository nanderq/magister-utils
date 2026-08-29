"use client";

import { type FormEvent, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";

import {
  connectMagisterAction,
  type MagisterActionState,
} from "@/app/dashboard/magister/actions";
import {
  normalizeSchoolHost,
  schoolUrlError,
} from "@/lib/magister/tenant";
import { button, secondaryButton } from "@/lib/ui";

const initialState: MagisterActionState = {};
const easeOut = [0.16, 1, 0.3, 1] as const;
const SUCCESS_REFRESH_MS = 1400;
const CONNECTING_STATUS = [
  "Checking school",
  "Signing in",
  "Verifying account",
] as const;

const fieldClass =
  "w-full rounded-[14px] border border-white/15 bg-white/[0.035] px-4 py-4 text-[#f2f4ed] outline-none transition-[border-color,box-shadow,background] placeholder:text-[#555c52] focus:border-[#c8ff4a]/70 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(200,255,74,0.06)]";
const labelClass =
  "font-mono text-[10px] leading-none tracking-[0.1em] text-[#a4aa9f] uppercase";

type Phase = "school" | "credentials" | "connecting" | "success" | "error";

export function MagisterConnectionForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    connectMagisterAction,
    initialState,
  );
  const [step, setStep] = useState<0 | 1>(0);
  const [direction, setDirection] = useState(1);
  const [dismissedError, setDismissedError] = useState(false);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [tenant, setTenant] = useState("");
  const [schoolHost, setSchoolHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const phase: Phase = pending
    ? "connecting"
    : state.connected
      ? "success"
      : state.error && !dismissedError
        ? "error"
        : step === 0
          ? "school"
          : "credentials";
  const progressLocked = phase === "connecting" || phase === "success";

  useEffect(() => {
    if (!state.connected) return;
    const timeout = window.setTimeout(
      () => router.refresh(),
      SUCCESS_REFRESH_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [state.connected, router]);

  function goTo(next: 0 | 1) {
    setDirection(next >= step ? 1 : -1);
    setStep(next);
    setSchoolError(null);
    setDismissedError(true);
  }

  function advanceFromSchool() {
    const error = schoolUrlError(tenant);
    if (error) {
      setSchoolError(error);
      return;
    }
    const host = normalizeSchoolHost(tenant);
    setSchoolHost(host);
    setTenant(`https://${host}`);
    goTo(1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (phase === "school") {
      event.preventDefault();
      advanceFromSchool();
      return;
    }
    if (phase !== "credentials") {
      event.preventDefault();
      return;
    }
    setDismissedError(false);
  }

  return (
    <form
      action={action}
      aria-busy={pending}
      className="mt-7"
      onSubmit={handleSubmit}
    >
      <input name="tenant" type="hidden" value={tenant} />
      <input name="username" type="hidden" value={username} />
      <input name="password" type="hidden" value={password} />

      <StepProgress
        current={phase === "school" ? 0 : 1}
        locked={progressLocked}
        onSelect={goTo}
      />

      <div className="relative min-h-[220px] overflow-hidden">
        <AnimatePresence custom={direction} initial={false} mode="wait">
          <motion.div
            animate="center"
            custom={direction}
            exit="exit"
            initial="enter"
            key={phase}
            transition={{ duration: 0.45, ease: easeOut }}
            variants={{
              enter: (dir: number) => ({
                x: dir > 0 ? 48 : -48,
                opacity: 0,
                filter: "blur(6px)",
              }),
              center: { x: 0, opacity: 1, filter: "blur(0px)" },
              exit: (dir: number) => ({
                x: dir > 0 ? -48 : 48,
                opacity: 0,
                filter: "blur(6px)",
              }),
            }}
          >
            {phase === "school" && (
              <Field
                autoComplete="url"
                autoFocus
                error={schoolError}
                hint="Use your school's Magister address, like school.magister.net."
                id="tenant"
                inputMode="url"
                label="School URL"
                onChange={setTenant}
                placeholder="https://school.magister.net"
                required
                value={tenant}
              />
            )}

            {phase === "credentials" && (
              <div>
                <p className="mb-6 border-y border-white/10 bg-white/[0.025] px-4 py-4 leading-[1.6] text-[#aeb4aa]">
                  Signing in to{" "}
                  <span className="text-[#f2f4ed]">{schoolHost || tenant}</span>.
                  Your password is used only to sign in to Magister and is never
                  stored.
                </p>
                <Field
                  autoComplete="username"
                  autoFocus
                  id="username"
                  label="Username"
                  onChange={setUsername}
                  required
                  value={username}
                />
                <Field
                  autoComplete="current-password"
                  id="password"
                  label="Password"
                  onChange={setPassword}
                  required
                  type="password"
                  value={password}
                />
              </div>
            )}

            {phase === "connecting" && <ConnectingPanel />}

            {phase === "success" && (
              <ResultPanel
                ok
                message="Magister is connected. Loading your account…"
                title="Connected"
              />
            )}

            {phase === "error" && (
              <ResultPanel
                message={
                  state.error ?? "The Magister account could not be connected."
                }
                title="Could not connect"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-2 flex min-h-[56px] flex-wrap items-end gap-3"
           style={{ flexGrow: 1, alignItems: "flex-end" }}>
        {phase === "school" && (
          <button className={button} type="submit">
            Continue
            <ArrowRight aria-hidden="true" />
          </button>
        )}

        {phase === "credentials" && (
          <>
            <button
              className={secondaryButton}
              onClick={() => goTo(0)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </button>
            <button className={button} disabled={pending} type="submit">
              Connect Magister
            </button>
          </>
        )}

        {phase === "error" && (
          <>
            <button className={button} onClick={() => goTo(1)} type="button">
              Try again
            </button>
            <button
              className={secondaryButton}
              onClick={() => goTo(0)}
              type="button"
            >
              Change school
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function StepProgress({
  current,
  locked,
  onSelect,
}: {
  current: 0 | 1;
  locked: boolean;
  onSelect: (step: 0 | 1) => void;
}) {
  return (
    <ol className="mb-7 grid grid-cols-2 gap-4">
      {(
        [
          { index: 0 as const, label: "School" },
          { index: 1 as const, label: "Sign in" },
        ]
      ).map(({ index, label }) => {
        const active = current === index;
        const complete = current > index;
        const enabled = !locked && current >= index;
        return (
          <li key={label}>
            <button
              aria-current={active ? "step" : undefined}
              className={`flex w-full flex-col gap-2.5 border-none bg-transparent p-0 text-left ${
                enabled ? "cursor-pointer" : "cursor-default"
              }`}
              disabled={!enabled}
              onClick={() => onSelect(index)}
              type="button"
            >
              <span
                className={`h-px w-full ${
                  active || complete ? "bg-[#c8ff4a]" : "bg-white/12"
                }`}
              />
              <span
                className={`font-mono text-[10px] leading-none tracking-[0.12em] uppercase ${
                  active
                    ? "text-[#c8ff4a]"
                    : complete
                      ? "text-[#b7c1ad]"
                      : "text-[#73786f]"
                }`}
              >
                {String(index + 1).padStart(2, "0")} {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  autoComplete,
  autoFocus,
  error,
  hint,
  id,
  inputMode,
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  autoComplete?: string;
  autoFocus?: boolean;
  error?: string | null;
  hint?: string;
  id: string;
  inputMode?: "url";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "password";
  value: string;
}) {
  return (
    <div className="mb-6 grid gap-3">
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={fieldClass}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {hint && !error && (
        <p
          className="m-0 text-[13px] leading-[1.6] text-[#858b81]"
          id={`${id}-hint`}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          className="m-0 text-sm font-semibold text-[#f0968c]"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ConnectingPanel() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % CONNECTING_STATUS.length);
    }, 900);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      aria-live="polite"
      className="flex flex-col items-center py-10 text-center"
      role="status"
    >
      <div className="relative mb-8 size-[4.5rem]">
        <motion.span
          animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.08, 0.35] }}
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-[#c8ff4a]/25"
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.span
          animate={{ rotate: 360 }}
          aria-hidden="true"
          className="absolute inset-2 rounded-full border border-transparent border-t-[#c8ff4a] border-r-[#c8ff4a]/30"
          transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center"
        >
          <span className="size-2.5 rounded-full bg-[#c8ff4a] shadow-[0_0_18px_rgba(200,255,74,0.7)]" />
        </span>
      </div>
      <p className="m-0 text-[15px] font-medium tracking-[-0.02em] text-[#f2f4ed]">
        Connecting to Magister
      </p>
      <p className="mt-3 font-mono text-[10px] tracking-[0.12em] text-[#858b81] uppercase">
        {CONNECTING_STATUS[statusIndex]}
      </p>
    </div>
  );
}

function ResultPanel({
  message,
  ok,
  title,
}: {
  message: string;
  ok?: boolean;
  title: string;
}) {
  return (
    <div
      aria-live="polite"
      className={`border-y px-4 py-5 ${
        ok
          ? "border-[#c8ff4a]/20 bg-[#c8ff4a]/[0.04]"
          : "border-[#f0968c]/20 bg-[#f0968c]/[0.05]"
      }`}
      role="status"
    >
      <div
        className={`mb-3 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] uppercase ${
          ok ? "text-[#c8ff4a]" : "text-[#f0968c]"
        }`}
      >
        {ok ? (
          <ShieldCheck aria-hidden="true" className="size-3.5 stroke-[1.6]" />
        ) : (
          <CircleAlert aria-hidden="true" className="size-3.5 stroke-[1.6]" />
        )}
        {title}
      </div>
      <p className="m-0 leading-[1.6] text-[#c6d0bc]">{message}</p>
    </div>
  );
}
