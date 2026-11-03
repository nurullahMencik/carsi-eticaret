import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { localized, type Locale } from "@/lib/i18n";
import { foldedQuery, PAGE_SIZE, type ProductListQuery } from "@/lib/validation/catalog";

export const LOW_STOCK_THRESHOLD = 3;

const cardInclude = {
  category: { select: { slug: true, nameTr: true, nameEn: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: { where: { isActive: true }, select: { stock: true, priceDelta: true } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  price: number;
  minPrice: number;
  hasPriceRange: boolean;
  compareAtPrice: number | null;
  image: { url: string; alt: string } | null;
  categorySlug: string;
  categoryName: string;
  ratingAvg: number;
  ratingCount: number;
  totalStock: number;
};

export function toCard(p: CardRow, locale: Locale): ProductCardData {
  const prices = p.variants.map((v) => p.price + v.priceDelta);
  const minPrice = prices.length ? Math.min(...prices) : p.price;
  const maxPrice = prices.length ? Math.max(...prices) : p.price;
  const image = p.images[0];
  return {
    id: p.id,
    slug: p.slug,
    name: localized(p, "name", locale),
    shortDesc: localized(p, "shortDesc", locale),
    price: p.price,
    minPrice,
    hasPriceRange: maxPrice !== minPrice,
    compareAtPrice: p.compareAtPrice,
    image: image ? { url: image.url, alt: (locale === "en" ? image.altEn : image.altTr) || localized(p, "name", locale) } : null,
    categorySlug: p.category.slug,
    categoryName: localized(p.category, "name", locale),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    totalStock: p.variants.reduce((a, v) => a + v.stock, 0),
  };
}

export async function listCategories(locale: Locale) {
  const rows = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: localized(c, "name", locale),
    description: localized(c, "description", locale),
    imageUrl: c.imageUrl,
    productCount: c._count.products,
  }));
}

function sortOrder(sort: ProductListQuery["sirala"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "yeni":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "fiyat-artan":
      return [{ price: "asc" }, { id: "asc" }];
    case "fiyat-azalan":
      return [{ price: "desc" }, { id: "asc" }];
    case "puan":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "asc" }];
    case "cok-satan":
      return [{ soldCount: "desc" }, { id: "asc" }];
    default:
      return [{ isFeatured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  }
}

export function buildProductWhere(query: ProductListQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (query.kategori) where.category = { slug: query.kategori };
  if (query.min !== undefined || query.max !== undefined) {
    where.price = {
      ...(query.min !== undefined ? { gte: query.min * 100 } : {}),
      ...(query.max !== undefined ? { lte: query.max * 100 } : {}),
    };
  }
  const q = foldedQuery(query.q);
  if (q) where.AND = q.split(" ").map((term) => ({ searchText: { contains: term } }));
  if (query.stok) where.variants = { some: { isActive: true, stock: { gt: 0 } } };
  return where;
}

export async function listProducts(query: ProductListQuery, locale: Locale) {
  const where = buildProductWhere(query);
  const total = await db.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.sayfa ?? 1, pageCount);
  const rows = await db.product.findMany({
    where,
    include: cardInclude,
    orderBy: sortOrder(query.sirala),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return { items: rows.map((r) => toCard(r, locale)), total, page, pageCount };
}

export async function getFeaturedProducts(locale: Locale, take = 8) {
  const rows = await db.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: cardInclude,
    orderBy: [{ soldCount: "desc" }, { id: "asc" }],
    take,
  });
  return rows.map((r) => toCard(r, locale));
}

export async function getNewArrivals(locale: Locale, take = 4) {
  const rows = await db.product.findMany({
    where: { isActive: true },
    include: cardInclude,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
  });
  return rows.map((r) => toCard(r, locale));
}

export async function getRelatedProducts(productId: string, categoryId: string, locale: Locale, take = 4) {
  const rows = await db.product.findMany({
    where: { isActive: true, categoryId, id: { not: productId } },
    include: cardInclude,
    orderBy: [{ soldCount: "desc" }, { id: "asc" }],
    take,
  });
  return rows.map((r) => toCard(r, locale));
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/** Rating distribution for the review summary (5 -> 1). */
export async function getRatingDistribution(productId: string) {
  const groups = await db.review.groupBy({ by: ["rating"], where: { productId }, _count: { _all: true } });
  return [5, 4, 3, 2, 1].map((rating) => ({ rating, count: groups.find((g) => g.rating === rating)?._count._all ?? 0 }));
}

export function variantLabel(
  v: { colorTr: string | null; colorEn: string | null; size: string | null },
  locale: Locale,
): string {
  const color = locale === "en" ? v.colorEn || v.colorTr : v.colorTr;
  return [color, v.size].filter(Boolean).join(" · ");
}
