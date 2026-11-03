"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelOwnOrderAction } from "@/lib/actions/account";
import { errorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(dict.account.cancelConfirm)) return;
          start(async () => {
            const result = await cancelOwnOrderAction(orderId);
            if (!result.ok) setError(errorMessage(dict, result.error));
          });
        }}
      >
        {dict.account.cancelOrder}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
