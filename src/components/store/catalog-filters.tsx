"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/client";
import { buildListUrl } from "@/lib/url";
import type { ProductSort } from "@/lib/validation/catalog";

export type ListState = {
  q?: string;
  kategori?: string;
  min?: number;
  max?: number;
  stok?: boolean;
  sirala?: ProductSort;
};

/**
 * Filters live in the URL. Works without JavaScript as a plain GET form; with JS,
 * category/stock changes apply immediately and keep scroll position.
 */
export function CatalogFilters({ state, categories }: { state: ListState; categories: { slug: string; name: string; productCount: number }[] }) {
  const { dict } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (overrides: Partial<Record<keyof ListState, string | number | boolean | undefined>>) =>
    start(() => router.push(buildListUrl("/urunler", state, overrides), { scroll: false }));

  return (
    <details className="group rounded-2xl border border-line bg-surface lg:border-0 lg:bg-transparent" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold lg:hidden">
        <SlidersHorizontal aria-hidden className="size-4" />
        {dict.catalog.showFilters}
      </summary>
      <form
        action="/urunler"
        method="get"
        className={cn("space-y-7 px-4 pb-5 lg:px-0 lg:pb-0", pending && "opacity-70")}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          go({ min: String(data.get("min") ?? "") || undefined, max: String(data.get("max") ?? "") || undefined });
        }}
        aria-label={dict.catalog.filters}
      >
        {state.q ? <input type="hidden" name="q" value={state.q} /> : null}
        {state.sirala ? <input type="hidden" name="sirala" value={state.sirala} /> : null}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-ink-2 uppercase">{dict.catalog.category}</legend>
          <ul className="space-y-0.5">
            {[{ slug: "", name: dict.catalog.allCategories, productCount: -1 }, ...categories].map((c) => (
              <li key={c.slug || "all"}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                  <input
                    type="radio"
                    name="kategori"
                    value={c.slug}
                    defaultChecked={(state.kategori ?? "") === c.slug}
                    onChange={() => go({ kategori: c.slug || undefined })}
                    className="accent-[var(--accent)]"
                  />
                  <span className="flex-1">{c.name}</span>
                  {c.productCount >= 0 ? <span className="text-xs text-ink-2 num">{c.productCount}</span> : null}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-ink-2 uppercase">{dict.catalog.price}</legend>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="f-min">
              {dict.catalog.minPrice}
            </label>
            <input
              id="f-min"
              name="min"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={dict.catalog.minPrice}
              defaultValue={state.min ?? ""}
              className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm"
            />
            <span aria-hidden className="text-ink-2">
              –
            </span>
            <label className="sr-only" htmlFor="f-max">
              {dict.catalog.maxPrice}
            </label>
            <input
              id="f-max"
              name="max"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={dict.catalog.maxPrice}
              defaultValue={state.max ?? ""}
              className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="mt-3 w-full">
            {dict.catalog.apply}
          </Button>
        </fieldset>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="stok"
            value="1"
            defaultChecked={state.stok}
            onChange={(e) => go({ stok: e.currentTarget.checked })}
            className="size-4 accent-[var(--accent)]"
          />
          {dict.catalog.inStockOnly}
        </label>
        {state.kategori || state.min !== undefined || state.max !== undefined || state.stok || state.q ? (
          <a href="/urunler" className="block text-sm font-medium text-teal underline underline-offset-4">
            {dict.catalog.clear}
          </a>
        ) : null}
      </form>
    </details>
  );
}

export function SortSelect({ state }: { state: ListState }) {
  const { dict } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  const options = Object.entries(dict.catalog.sorts) as [ProductSort, string][];
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-ink-2">
        {dict.catalog.sort}
      </label>
      <select
        id="sort"
        value={state.sirala ?? "onerilen"}
        onChange={(e) => {
          const value = e.currentTarget.value as ProductSort;
          start(() => router.push(buildListUrl("/urunler", state, { sirala: value === "onerilen" ? undefined : value }), { scroll: false }));
        }}
        className="h-10 rounded-full border border-line-strong bg-surface px-3 text-sm"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
