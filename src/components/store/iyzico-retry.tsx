"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retryIyzicoAction } from "@/lib/actions/checkout";
import { errorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function IyzicoRetryButton({ orderNumber, label }: { orderNumber: string; label: string }) {
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await retryIyzicoAction(orderNumber);
            if (result && !result.ok) setError(errorMessage(dict, result.error));
          })
        }
      >
        {pending ? dict.checkout.redirecting : label}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
