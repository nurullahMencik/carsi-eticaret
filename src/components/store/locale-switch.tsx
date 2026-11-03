"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/preferences";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/components/ui/cn";

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const [pending, start] = useTransition();
  const next = locale === "tr" ? "en" : "tr";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLocaleAction(next))}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold tracking-wide text-ink hover:bg-surface-2 disabled:opacity-60",
        className,
      )}
      aria-label={next === "en" ? dict.common.switchToEnglish : dict.common.switchToTurkish}
      lang={next}
    >
      {next.toUpperCase()}
    </button>
  );
}
