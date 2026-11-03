import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Truck } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { ReviewForm } from "@/components/store/review-form";
import { Alert } from "@/components/ui/alert";
import { Stars } from "@/components/ui/stars";
import { getActor } from "@/lib/auth/session";
import { kurusToDecimalString } from "@/lib/domain/money";
import { siteUrl } from "@/lib/env";
import { fmt, formatDate, localized } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getProductBySlug, getRatingDistribution, getRelatedProducts } from "@/lib/services/catalog";
import { reviewEligibility } from "@/lib/services/reviews";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n();
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = localized(product, "name", locale);
  const description = localized(product, "shortDesc", locale);
  const image = product.images[0]?.url;
  return {
    title: name,
    description,
    alternates: { canonical: `/urun/${product.slug}` },
    openGraph: { type: "website", title: name, description, images: image ? [{ url: image, alt: name }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { dict, locale } = await getI18n();
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const actor = await getActor();
  const [related, distribution, eligibility] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId, locale),
    getRatingDistribution(product.id),
    reviewEligibility(actor?.id, product.id),
  ]);
  const name = localized(product, "name", locale);
  const categoryName = localized(product.category, "name", locale);
  const description = localized(product, "description", locale);
  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    color: (locale === "en" ? v.colorEn || v.colorTr : v.colorTr) ?? null,
    colorHex: v.colorHex,
    size: v.size,
    price: product.price + v.priceDelta,
    stock: v.stock,
  }));
  const prices = variants.map((v) => v.price);
  const inStock = variants.some((v) => v.stock > 0);
  const base = siteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: localized(product, "shortDesc", locale),
    sku: variants[0]?.sku,
    category: categoryName,
    brand: { "@type": "Brand", name: "Çarşı" },
    image: product.images.map((i) => `${base}${i.url.startsWith("/") ? i.url : `/${i.url}`}`),
    url: `${base}/urun/${product.slug}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "TRY",
      lowPrice: kurusToDecimalString(Math.min(...prices)),
      highPrice: kurusToDecimalString(Math.max(...prices)),
      offerCount: variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount, bestRating: 5, worstRating: 1 },
          review: product.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.user.name.split(" ")[0] },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewBody: r.body,
          })),
        }
      : {}),
  };

  return (
    <div className="container-page pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label={dict.product.breadcrumb} className="mb-6 text-sm text-ink-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-ink hover:underline">
              {dict.common.home}
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li>
            <Link href={`/urunler?kategori=${product.category.slug}`} className="hover:text-ink hover:underline">
              {categoryName}
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li aria-current="page" className="text-ink">
            {name}
          </li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery
          images={product.images.map((i) => ({ url: i.url, alt: (locale === "en" ? i.altEn : i.altTr) || name }))}
          name={name}
          slug={product.slug}
          category={product.category.slug}
        />
        <div className="lg:pt-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{categoryName}</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{name}</h1>
          <p className="mt-3 text-lg text-ink-2">{localized(product, "shortDesc", locale)}</p>
          {product.ratingCount > 0 ? (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
              <Stars value={product.ratingAvg} label={fmt(dict.catalog.rating, { rating: product.ratingAvg })} />
              <span className="num">
                {product.ratingAvg.toFixed(1)} · {fmt(dict.catalog.reviewsCount, { count: product.ratingCount })}
              </span>
            </a>
          ) : null}
          <div className="mt-8">
            <PurchasePanel variants={variants} compareAtPrice={product.compareAtPrice} />
          </div>
          <div className="mt-8 space-y-2 rounded-2xl border border-line bg-surface p-5 text-sm text-ink-2">
            <p className="flex items-start gap-2.5">
              <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
              {dict.product.shippingInfo}
            </p>
            <p>{dict.product.handmadeNote}</p>
            <p>{fmt(dict.product.vatRate, { rate: product.vatRate })}</p>
          </div>
        </div>
      </div>

      <section aria-labelledby="desc-title" className="mt-16 max-w-3xl">
        <h2 id="desc-title" className="font-display text-3xl">
          {dict.product.description}
        </h2>
        <div className="mt-4 space-y-4 leading-relaxed text-ink/90">
          {description.split(/\n\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section id="reviews" aria-labelledby="reviews-title" className="mt-16 scroll-mt-28">
        <h2 id="reviews-title" className="font-display text-3xl">
          {dict.product.reviews}
        </h2>
        <div className="mt-6 grid gap-10 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-5">
            {product.ratingCount > 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="text-sm text-ink-2">{dict.product.averageRating}</p>
                <p className="mt-1 flex items-center gap-3">
                  <span className="font-display text-4xl num">{product.ratingAvg.toFixed(1)}</span>
                  <Stars value={product.ratingAvg} label={fmt(dict.catalog.rating, { rating: product.ratingAvg })} size={18} />
                </p>
                <ul className="mt-4 space-y-1.5">
                  {distribution.map((d) => (
                    <li key={d.rating} className="flex items-center gap-2 text-xs text-ink-2">
                      <span className="w-14 num">{fmt(dict.product.stars, { n: d.rating })}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <span className="block h-full rounded-full bg-[#c98a1b]" style={{ width: `${(d.count / product.ratingCount) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right num">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {eligibility.canReview ? (
              <ReviewForm productId={product.id} slug={product.slug} />
            ) : (
              <Alert tone="info">
                {eligibility.reason === "REVIEW_EXISTS" ? (
                  dict.product.reviewAlreadyWritten
                ) : eligibility.reason === "UNAUTHENTICATED" ? (
                  <>
                    {dict.product.reviewOnlyBuyers}{" "}
                    <Link href={`/giris?callbackUrl=/urun/${product.slug}`} className="font-semibold text-teal underline underline-offset-4">
                      {dict.common.login}
                    </Link>
                  </>
                ) : (
                  dict.product.reviewOnlyBuyers
                )}
              </Alert>
            )}
          </div>
          {product.reviews.length === 0 ? (
            <p className="text-ink-2">{dict.product.noReviews}</p>
          ) : (
            <ul className="divide-y divide-line">
              {product.reviews.map((r) => (
                <li key={r.id} className="py-5 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={r.rating} label={fmt(dict.catalog.rating, { rating: r.rating })} />
                    {r.title ? <p className="font-semibold">{r.title}</p> : null}
                  </div>
                  <p className="mt-2 leading-relaxed text-ink/90">{r.body}</p>
                  <p className="mt-2 text-xs text-ink-2">
                    {r.user.name.split(" ")[0]} {r.user.name.split(" ").slice(1).map((s) => `${s[0]}.`).join(" ")} · {dict.product.verifiedBuyer} ·{" "}
                    {formatDate(r.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {related.length ? (
        <section aria-labelledby="related-title" className="mt-20">
          <h2 id="related-title" className="mb-7 font-display text-3xl">
            {dict.product.related}
          </h2>
          <ProductGrid products={related} dict={dict} />
        </section>
      ) : null}
    </div>
  );
}
