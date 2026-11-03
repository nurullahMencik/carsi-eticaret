import type { Metadata } from "next";
import { CatalogFilters, SortSelect, type ListState } from "@/components/store/catalog-filters";
import { ProductGrid } from "@/components/store/product-card";
import { Pagination } from "@/components/ui/pagination";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { listCategories, listProducts } from "@/lib/services/catalog";
import { buildListUrl } from "@/lib/url";
import { parseProductListQuery } from "@/lib/validation/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { dict, locale } = await getI18n();
  const query = parseProductListQuery(await searchParams);
  const category = query.kategori ? (await listCategories(locale)).find((c) => c.slug === query.kategori) : undefined;
  const title = category?.name ?? dict.meta.productsTitle;
  return {
    title,
    description: category?.description || dict.meta.description,
    alternates: { canonical: category ? `/urunler?kategori=${category.slug}` : "/urunler" },
    robots: query.q || query.min !== undefined || query.max !== undefined ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductListPage({ searchParams }: Props) {
  const { dict, locale } = await getI18n();
  const query = parseProductListQuery(await searchParams);
  const [categories, result] = await Promise.all([listCategories(locale), listProducts(query, locale)]);
  const category = categories.find((c) => c.slug === query.kategori);
  const state: ListState = { q: query.q, kategori: query.kategori, min: query.min, max: query.max, stok: query.stok, sirala: query.sirala };
  const heading = query.q ? fmt(dict.catalog.searchResultsFor, { q: query.q }) : (category?.name ?? dict.catalog.title);

  return (
    <div className="container-page pt-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl">{heading}</h1>
        {category?.description && !query.q ? <p className="mt-3 text-ink-2">{category.description}</p> : null}
      </div>
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <aside>
          <CatalogFilters key={JSON.stringify(state)} state={state} categories={categories} />
        </aside>
        <section aria-labelledby="results-count">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p id="results-count" className="text-sm text-ink-2" aria-live="polite" data-testid="result-count">
              {fmt(dict.catalog.resultCount, { count: result.total })}
            </p>
            <SortSelect state={state} />
          </div>
          {result.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
              <p className="font-display text-2xl">{dict.catalog.emptyTitle}</p>
              <p className="mt-2 text-sm text-ink-2">{dict.catalog.emptyText}</p>
            </div>
          ) : (
            <ProductGrid products={result.items} dict={dict} priorityCount={2} />
          )}
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            href={(page) => buildListUrl("/urunler", state, { sayfa: page })}
            labels={{ nav: dict.catalog.pagination, previous: dict.common.previous, next: dict.common.next, page: fmt(dict.common.page, { page: "{page}", total: result.pageCount }) }}
          />
        </section>
      </div>
    </div>
  );
}
