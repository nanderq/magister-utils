"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { secondaryButton } from "@/lib/ui";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className={secondaryButton} type="button" onClick={copyValue}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}
