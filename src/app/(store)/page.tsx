import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Hand, PackageCheck, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CopyCode } from "@/components/store/copy-code";
import { ProductCover } from "@/components/store/product-cover";
import { ProductGrid } from "@/components/store/product-card";
import { heroImage } from "@/lib/content/credits";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getFeaturedProducts, getNewArrivals, listCategories } from "@/lib/services/catalog";

export default async function HomePage() {
  const { dict, locale } = await getI18n();
  const [categories, featured, newest] = await Promise.all([
    listCategories(locale),
    getFeaturedProducts(locale, 8),
    getNewArrivals(locale, 4),
  ]);
  const hero = heroImage(1);
  return (
    <>
      <section className="container-page grid items-center gap-10 pt-10 pb-16 md:grid-cols-[1.05fr_1fr] md:pt-16 lg:gap-16">
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-accent uppercase">{dict.home.heroEyebrow}</p>
          <h1 className="font-display text-[2.6rem] leading-[1.04] font-medium text-ink sm:text-6xl">{dict.home.heroTitle}</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">{dict.home.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/urunler" size="lg">
              {dict.home.heroCta}
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink href="/urunler?kategori=cini" variant="outline" size="lg">
              {dict.home.heroSecondary}
            </ButtonLink>
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] bg-surface-2 md:aspect-[4/5] lg:aspect-[5/5]">
            {hero ? (
              <Image
                src={hero.path}
                alt=""
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 48vw, 100vw"
                quality={70}
                className="object-cover"
              />
            ) : (
              <ProductCover slug="hero" name="Çarşı" category="cini" showName={false} />
            )}
          </div>
          <div className="absolute -bottom-6 left-4 max-w-[15rem] rounded-2xl border border-line bg-surface/95 p-4 shadow-lg shadow-black/5 backdrop-blur sm:left-6">
            <p className="font-display text-lg leading-snug">{dict.home.value1Title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{dict.home.value1Text}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="campaign-title" className="container-page">
        <div className="flex flex-col gap-5 rounded-[1.75rem] bg-accent-soft px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="flex items-start gap-4">
            <span className="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Gift aria-hidden className="size-5" />
            </span>
            <div>
              <h2 id="campaign-title" className="font-display text-2xl text-ink">
                {dict.home.campaignTitle}
              </h2>
              <p className="mt-1 text-sm text-ink-2">{dict.home.campaignText}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CopyCode code="HOSGELDIN10" />
            <ButtonLink href="/urunler" variant="secondary">
              {dict.home.campaignCta}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-title" className="container-page mt-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <h2 id="categories-title" className="font-display text-3xl sm:text-4xl">
            {dict.home.categoriesTitle}
          </h2>
          <Link href="/urunler" className="text-sm font-medium text-teal underline-offset-4 hover:underline">
            {dict.common.viewAll}
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/urunler?kategori=${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
                {c.imageUrl ? (
                  <Image
                    src={c.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 400px, 50vw"
                    quality={70}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <ProductCover slug={`cat-${c.slug}`} name={c.name} category={c.slug} showName={false} />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
                <span className="absolute right-4 bottom-4 left-4 text-white">
                  <span className="block font-display text-xl leading-tight sm:text-2xl">{c.name}</span>
                  <span className="text-xs text-white/85">{fmt(dict.home.productCount, { count: c.productCount })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured-title" className="container-page mt-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 id="featured-title" className="font-display text-3xl sm:text-4xl">
              {dict.home.featuredTitle}
            </h2>
            <p className="mt-2 text-sm text-ink-2">{dict.home.featuredText}</p>
          </div>
          <Link href="/urunler?sirala=cok-satan" className="shrink-0 text-sm font-medium text-teal underline-offset-4 hover:underline">
            {dict.common.viewAll}
          </Link>
        </div>
        <ProductGrid products={featured} dict={dict} />
      </section>

      <section aria-labelledby="values-title" className="container-page mt-20">
        <h2 id="values-title" className="sr-only">
          {dict.home.valuesTitle}
        </h2>
        <ul className="grid gap-4 rounded-[1.75rem] border border-line bg-surface p-6 sm:p-10 md:grid-cols-3 md:gap-10">
          {[
            { icon: Hand, title: dict.home.value1Title, text: dict.home.value1Text },
            { icon: ShieldCheck, title: dict.home.value2Title, text: dict.home.value2Text },
            { icon: PackageCheck, title: dict.home.value3Title, text: dict.home.value3Text },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <Icon aria-hidden className="mt-1 size-6 shrink-0 text-teal" strokeWidth={1.6} />
              <div>
                <h3 className="font-display text-lg">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="new-title" className="container-page mt-20">
        <div className="mb-7 flex items-end justify-between gap-4">
          <h2 id="new-title" className="font-display text-3xl sm:text-4xl">
            {dict.home.newTitle}
          </h2>
          <Link href="/urunler?sirala=yeni" className="text-sm font-medium text-teal underline-offset-4 hover:underline">
            {dict.common.viewAll}
          </Link>
        </div>
        <ProductGrid products={newest} dict={dict} />
      </section>
    </>
  );
}
