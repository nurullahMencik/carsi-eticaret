"use client";

import { useState, useTransition } from "react";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyCouponAction, removeCouponAction } from "@/lib/actions/cart";
import { formatTRY } from "@/lib/domain/money";
import { fmt, validationMessage, type Dictionary } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function couponErrorText(dict: Dictionary, code: string, details?: Record<string, string | number>) {
  const reason = code.replace(/^COUPON_/, "") as keyof Dictionary["cart"]["couponErrors"];
  const template = dict.cart.couponErrors[reason];
  if (!template) return dict.errors.UNKNOWN;
  return fmt(template, {
    min: details?.minSubtotal !== undefined ? formatTRY(Number(details.minSubtotal)) : "",
    missing: details?.missing !== undefined ? formatTRY(Number(details.missing)) : "",
  });
}

export function CouponForm({ appliedCode, invalidReason }: { appliedCode: string | null; invalidReason?: string | null }) {
  const { dict } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (appliedCode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <Tag aria-hidden className="size-4 text-success" />
            {fmt(dict.cart.couponApplied, { code: appliedCode })}
          </span>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full hover:bg-surface"
            aria-label={dict.cart.couponRemove}
            onClick={() => start(async () => void (await removeCouponAction()))}
            disabled={pending}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        {invalidReason ? (
          <p className="text-sm text-danger" role="alert">
            {invalidReason}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await applyCouponAction({ code });
          if (result.ok) setCode("");
          else if (result.error === "VALIDATION") setError(validationMessage(dict, result.fieldErrors?.code) ?? dict.errors.VALIDATION);
          else setError(couponErrorText(dict, result.error, result.details));
        });
      }}
    >
      <label htmlFor="coupon" className="text-sm font-medium">
        {dict.cart.couponLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={dict.cart.couponPlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm uppercase placeholder:normal-case"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "coupon-error" : undefined}
        />
        <Button type="submit" variant="outline" disabled={pending || code.trim().length < 3}>
          {dict.cart.couponApply}
        </Button>
      </div>
      {error ? (
        <p id="coupon-error" className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
