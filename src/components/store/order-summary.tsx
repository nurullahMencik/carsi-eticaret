import type { ReactNode } from "react";
import { formatTRY } from "@/lib/domain/money";
import type { CartTotals } from "@/lib/domain/pricing";
import { fmt, type Dictionary } from "@/lib/i18n";

export function OrderSummary({ totals, dict, children, couponCode }: { totals: CartTotals; dict: Dictionary; children?: ReactNode; couponCode?: string | null }) {
  const row = "flex items-center justify-between gap-4";
  return (
    <div className="space-y-4 rounded-[1.5rem] border border-line bg-surface p-6" data-testid="order-summary">
      <h2 className="font-display text-2xl">{dict.cart.summary}</h2>
      <dl className="space-y-2.5 text-sm">
        <div className={row}>
          <dt className="text-ink-2">{dict.cart.subtotal}</dt>
          <dd className="num">{formatTRY(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 ? (
          <div className={row}>
            <dt className="text-ink-2">
              {dict.cart.discount}
              {couponCode ? ` (${couponCode})` : ""}
            </dt>
            <dd className="text-success num" data-testid="summary-discount">
              −{formatTRY(totals.discount)}
            </dd>
          </div>
        ) : null}
        <div className={row}>
          <dt className="text-ink-2">{dict.cart.shipping}</dt>
          <dd className="num" data-testid="summary-shipping">
            {totals.itemCount === 0 ? "—" : totals.shippingFee === 0 ? dict.cart.free : formatTRY(totals.shippingFee)}
          </dd>
        </div>
        <div className={`${row} border-t border-line pt-3 text-base font-semibold`}>
          <dt>{dict.cart.total}</dt>
          <dd className="num" data-testid="summary-total">
            {formatTRY(totals.total)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-ink-2">{fmt(dict.cart.vatNote, { vat: formatTRY(totals.vatTotal) })}</p>
      {totals.itemCount > 0 ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink">
          {totals.freeShippingRemaining > 0
            ? fmt(dict.cart.freeShippingRemaining, { amount: formatTRY(totals.freeShippingRemaining) })
            : dict.cart.freeShippingReached}
        </p>
      ) : null}
      {children}
    </div>
  );
}
