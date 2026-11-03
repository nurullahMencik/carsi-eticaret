"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { addToCartAction } from "@/lib/actions/cart";
import { formatTRY } from "@/lib/domain/money";
import { errorMessage, fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export type PanelVariant = {
  id: string;
  sku: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  price: number;
  stock: number;
};

const LOW = 3;

export function PurchasePanel({ variants, compareAtPrice }: { variants: PanelVariant[]; compareAtPrice: number | null }) {
  const { dict } = useI18n();
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0]!;
  const [selectedId, setSelectedId] = useState(firstAvailable.id);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;

  const colors = [...new Map(variants.filter((v) => v.color).map((v) => [v.color!, v])).values()];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];
  const hasColor = colors.length > 0;
  const hasSize = sizes.length > 0;
  // With both axes, a variant is the (color, size) pair.
  const pickVariant = (color: string | null, size: string | null) =>
    variants.find((v) => (!hasColor || v.color === color) && (!hasSize || v.size === size)) ??
    variants.find((v) => (hasColor ? v.color === color : v.size === size));

  const maxQty = Math.max(1, Math.min(selected.stock, 20));
  const soldOut = selected.stock <= 0;

  function add() {
    setMessage(null);
    start(async () => {
      const result = await addToCartAction({ variantId: selected.id, quantity });
      if (result.ok) setMessage({ tone: "success", text: dict.product.added });
      else setMessage({ tone: "error", text: errorMessage(dict, result.error) });
    });
  }

  return (
    <div className="space-y-6">
      <p className="flex items-baseline gap-3 num">
        <span className="text-3xl font-semibold" data-testid="product-price">
          {formatTRY(selected.price)}
        </span>
        {compareAtPrice && compareAtPrice > selected.price ? <s className="text-lg text-ink-2">{formatTRY(compareAtPrice)}</s> : null}
        <span className="text-sm text-ink-2">{dict.common.vatIncluded}</span>
      </p>

      {hasColor ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {dict.product.color}: <span className="text-ink-2">{selected.color}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((v) => {
              const variant = pickVariant(v.color, selected.size) ?? v;
              const active = selected.color === v.color;
              const out = variants.filter((x) => x.color === v.color).every((x) => x.stock <= 0);
              return (
                <button
                  key={v.color}
                  type="button"
                  onClick={() => {
                    setSelectedId(variant.id);
                    setQuantity(1);
                    setMessage(null);
                  }}
                  aria-pressed={active}
                  aria-label={`${v.color}${out ? ` (${dict.product.soldOut})` : ""}`}
                  title={v.color ?? undefined}
                  className={cn(
                    "relative size-10 rounded-full border-2 p-0.5 transition",
                    active ? "border-ink" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="block size-full rounded-full border border-black/10" style={{ background: v.colorHex ?? "#ccc" }} />
                  {out ? <span aria-hidden className="absolute inset-x-1 top-1/2 h-0.5 -rotate-45 bg-ink/70" /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {hasSize ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{dict.product.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const variant = pickVariant(selected.color, size);
              const active = selected.size === size;
              const out = !variant || variant.stock <= 0;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!variant}
                  onClick={() => {
                    if (variant) setSelectedId(variant.id);
                    setQuantity(1);
                    setMessage(null);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition num",
                    active ? "border-ink bg-ink text-canvas" : "border-line-strong hover:border-ink",
                    out && !active && "text-ink-2 line-through",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <p className={cn("text-sm", soldOut ? "text-danger" : selected.stock <= LOW ? "text-warning" : "text-success")} data-testid="stock-status">
        {soldOut ? dict.product.outOfStock : selected.stock <= LOW ? fmt(dict.product.stockLeft, { count: selected.stock }) : dict.product.inStock}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex h-12 items-center rounded-full border border-line-strong" role="group" aria-label={dict.product.quantity}>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || soldOut}
            className="inline-flex size-12 items-center justify-center rounded-full disabled:opacity-40"
            aria-label={dict.product.decrease}
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <output className="w-8 text-center font-semibold num" aria-live="polite" aria-label={dict.product.quantity}>
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty || soldOut}
            className="inline-flex size-12 items-center justify-center rounded-full disabled:opacity-40"
            aria-label={dict.product.increase}
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        <Button size="lg" className="flex-1 sm:flex-none" onClick={add} disabled={pending || soldOut} data-testid="add-to-cart">
          {pending ? null : <ShoppingBag aria-hidden className="size-4" />}
          {soldOut ? dict.product.soldOut : pending ? dict.product.adding : dict.product.addToCart}
        </Button>
      </div>

      {message ? (
        <Alert tone={message.tone}>
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            {message.tone === "success" ? <Check aria-hidden className="size-4 text-success" /> : null}
            {message.text}
            {message.tone === "success" ? (
              <Link href="/sepet" className="font-semibold text-teal underline underline-offset-4">
                {dict.product.goToCart}
              </Link>
            ) : null}
          </span>
        </Alert>
      ) : null}
      <p className="text-xs text-ink-2">
        {dict.product.sku}: <span className="num">{selected.sku}</span>
      </p>
    </div>
  );
}
