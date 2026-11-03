import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
import { formatTRY } from "@/lib/domain/money";
import { fmt, type Dictionary } from "@/lib/i18n";
import { LOW_STOCK_THRESHOLD, type ProductCardData } from "@/lib/services/catalog";
import { ProductImage } from "./product-image";

export function ProductCard({ product, dict, priority = false }: { product: ProductCardData; dict: Dictionary; priority?: boolean }) {
  const soldOut = product.totalStock <= 0;
  const low = !soldOut && product.totalStock <= LOW_STOCK_THRESHOLD;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  return (
    <article className="group relative flex flex-col" data-testid="product-card">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
        <ProductImage
          src={product.image?.url}
          alt={product.image?.alt ?? product.name}
          slug={product.slug}
          category={product.categorySlug}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 50vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {soldOut ? <Badge tone="ink">{dict.catalog.outOfStock}</Badge> : null}
          {onSale && !soldOut ? <Badge tone="accent">{dict.catalog.sale}</Badge> : null}
          {low ? <Badge tone="warning">{fmt(dict.catalog.lowStock, { count: product.totalStock })}</Badge> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <p className="text-xs tracking-[0.12em] text-ink-2 uppercase">{product.categoryName}</p>
        <h3 className="font-display text-[1.08rem] leading-snug text-ink">
          <Link href={`/urun/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {product.ratingCount > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-ink-2">
            <Stars value={product.ratingAvg} label={fmt(dict.catalog.rating, { rating: product.ratingAvg.toLocaleString("tr-TR") })} size={12} />
            <span className="num">({product.ratingCount})</span>
          </div>
        ) : null}
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1 num">
          <span className="font-semibold">
            {product.hasPriceRange ? fmt(dict.catalog.fromPrice, { price: formatTRY(product.minPrice) }) : formatTRY(product.minPrice)}
          </span>
          {onSale ? <s className="text-sm text-ink-2">{formatTRY(product.compareAtPrice!)}</s> : null}
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({ products, dict, priorityCount = 0 }: { products: ProductCardData[]; dict: Dictionary; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="w-full">
            <ProductCard product={p} dict={dict} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}
