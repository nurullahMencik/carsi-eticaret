import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true, images: { select: { url: true }, take: 3 } } }),
    db.category.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/urunler`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/urunler?kategori=${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: `${base}/urun/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images.map((i) => `${base}${i.url}`),
    })),
    { url: `${base}/gorsel-kaynaklari`, changeFrequency: "monthly", priority: 0.2 },
  ];
}
