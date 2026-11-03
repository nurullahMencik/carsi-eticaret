import type { Metadata } from "next";
import Image from "next/image";
import { getImageCredits } from "@/lib/content/credits";
import { db } from "@/lib/db";
import { localized } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.meta.creditsTitle, description: dict.credits.intro, alternates: { canonical: "/gorsel-kaynaklari" } };
}

export default async function CreditsPage() {
  const { dict, locale } = await getI18n();
  const credits = getImageCredits();
  const [products, categories] = await Promise.all([
    db.product.findMany({ select: { slug: true, nameTr: true, nameEn: true } }),
    db.category.findMany({ select: { slug: true, nameTr: true, nameEn: true } }),
  ]);
  const usedFor = (kind: string, slug: string) => {
    if (kind === "product") {
      const p = products.find((x) => x.slug === slug);
      return p ? localized(p, "name", locale) : slug;
    }
    if (kind === "category") {
      const c = categories.find((x) => x.slug === slug);
      return c ? localized(c, "name", locale) : slug;
    }
    return dict.common.home;
  };
  return (
    <div className="container-page pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">{dict.credits.title}</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink-2">{dict.credits.intro}</p>
      {credits.length === 0 ? (
        <p className="mt-8 text-ink-2">{dict.credits.none}</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {credits.map((c) => (
            <li key={c.path} className="flex gap-4 rounded-2xl border border-line bg-surface p-3">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                <Image src={c.path} alt="" fill sizes="96px" quality={70} className="object-cover" />
              </div>
              <dl className="min-w-0 text-xs leading-relaxed">
                <dt className="sr-only">{dict.credits.usedFor}</dt>
                <dd className="font-semibold text-ink">{usedFor(c.kind, c.slug)}</dd>
                <dt className="sr-only">{dict.credits.image}</dt>
                <dd className="truncate text-ink-2" title={c.title}>
                  {c.title}
                </dd>
                <dt className="inline text-ink-2">{dict.credits.author}: </dt>
                <dd className="inline">{c.author || "—"}</dd>
                <br />
                <dt className="inline text-ink-2">{dict.credits.license}: </dt>
                <dd className="inline">
                  {c.licenseUrl ? (
                    <a href={c.licenseUrl} className="text-teal underline underline-offset-2" rel="noopener noreferrer license" target="_blank">
                      {c.license}
                    </a>
                  ) : (
                    c.license
                  )}
                </dd>
                <br />
                <dd>
                  <a href={c.sourceUrl} className="text-teal underline underline-offset-2" rel="noopener noreferrer" target="_blank">
                    {dict.credits.source}: Wikimedia Commons
                  </a>
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-xs text-ink-2">{dict.credits.changes}</p>
    </div>
  );
}
