"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { removeCartItemAction, updateCartItemAction } from "@/lib/actions/cart";
import { formatTRY } from "@/lib/domain/money";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import type { CartLineView } from "@/lib/services/cart";
import { ProductImage } from "./product-image";

export function CartLines({ lines }: { lines: CartLineView[] }) {
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(lines, (state, update: { id: string; quantity: number }) =>
    state
      .map((l) => (l.id === update.id ? { ...l, quantity: update.quantity, lineTotal: l.unitPrice * update.quantity } : l))
      .filter((l) => l.quantity > 0),
  );

  const change = (line: CartLineView, quantity: number) =>
    start(async () => {
      setOptimistic({ id: line.id, quantity });
      if (quantity <= 0) await removeCartItemAction(line.id);
      else await updateCartItemAction({ itemId: line.id, quantity });
    });

  return (
    <ul className={cn("divide-y divide-line border-y border-line", pending && "opacity-80")} data-testid="cart-lines">
      {optimistic.map((line) => {
        const problem = line.quantity > line.available;
        return (
          <li key={line.id} className="flex gap-4 py-5" data-testid="cart-line">
            <Link href={`/urun/${line.slug}`} className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-28">
              <ProductImage src={line.image} alt={line.name} slug={line.slug} category={line.categorySlug} sizes="112px" showCoverName={false} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/urun/${line.slug}`} className="font-display text-lg leading-snug hover:underline">
                    {line.name}
                  </Link>
                  {line.variantLabel ? <p className="text-sm text-ink-2">{line.variantLabel}</p> : null}
                  <p className="text-sm text-ink-2 num">{formatTRY(line.unitPrice)}</p>
                </div>
                <p className="shrink-0 font-semibold num" data-testid="line-total">
                  {formatTRY(line.lineTotal)}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex h-10 items-center rounded-full border border-line-strong" role="group" aria-label={fmt(dict.cart.quantityFor, { name: line.name })}>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-full disabled:opacity-40"
                    onClick={() => change(line, line.quantity - 1)}
                    aria-label={dict.product.decrease}
                    disabled={pending}
                  >
                    <Minus aria-hidden className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold num" data-testid="line-qty">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-full disabled:opacity-40"
                    onClick={() => change(line, line.quantity + 1)}
                    aria-label={dict.product.increase}
                    disabled={pending || line.quantity >= Math.min(line.available, 20)}
                  >
                    <Plus aria-hidden className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => change(line, 0)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-2 hover:text-danger"
                  aria-label={fmt(dict.cart.removeItem, { name: line.name })}
                  disabled={pending}
                >
                  <Trash2 aria-hidden className="size-4" />
                  {dict.cart.remove}
                </button>
              </div>
              {problem ? (
                <p className="text-sm text-danger" role="alert">
                  {line.available <= 0 ? dict.cart.unavailable : fmt(dict.cart.onlyLeft, { count: line.available })}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
