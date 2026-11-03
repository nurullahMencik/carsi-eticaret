"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export function CopyCode({ code }: { code: string }) {
  const { dict } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-accent px-4 py-2 font-mono text-sm font-semibold tracking-wider text-accent hover:bg-accent-soft"
    >
      {code}
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      <span className="sr-only" aria-live="polite">
        {copied ? dict.common.copied : ""}
      </span>
    </button>
  );
}
