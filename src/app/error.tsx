"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-3xl">{dict.common.error}</h1>
      {error.digest ? <p className="mt-2 font-mono text-xs text-ink-2">{error.digest}</p> : null}
      <button type="button" onClick={reset} className="mt-8 rounded-full bg-accent px-6 py-3 text-accent-ink">
        {dict.checkout.tryAgain}
      </button>
    </main>
  );
}
