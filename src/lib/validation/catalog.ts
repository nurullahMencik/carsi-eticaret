import { z } from "zod";
import { VAT_RATES } from "@/lib/domain/vat";
import { foldSearchText } from "@/lib/domain/search";
import { idField, liraToKurus, req, slugField } from "./common";

export const PRODUCT_SORTS = ["onerilen", "yeni", "fiyat-artan", "fiyat-azalan", "puan", "cok-satan"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];
export const PAGE_SIZE = 12;

const optionalInt = z
  .union([z.string(), z.number(), z.undefined(), z.null()])
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  });

/**
 * Product list URL state, e.g. /urunler?q=kupa&kategori=seramik&min=100&max=900&stok=1&sirala=fiyat-artan&sayfa=2
 * Invalid values fall back to defaults instead of erroring, so hand-edited URLs never break the page.
 */
export const productListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().slice(0, 80) : undefined))
    .catch(undefined),
  kategori: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  min: optionalInt.catch(undefined),
  max: optionalInt.catch(undefined),
  stok: z
    .string()
    .optional()
    .transform((v) => v === "1")
    .catch(false),
  sirala: z.enum(PRODUCT_SORTS).optional().catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});
export type ProductListQuery = z.output<typeof productListQuerySchema>;

export function parseProductListQuery(raw: Record<string, string | string[] | undefined>): ProductListQuery {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  const parsed = productListQuerySchema.parse(flat);
  if (parsed.min !== undefined && parsed.max !== undefined && parsed.min > parsed.max) {
    return { ...parsed, min: parsed.max, max: parsed.min };
  }
  return parsed;
}

export function foldedQuery(q: string | undefined): string | undefined {
  const folded = q ? foldSearchText(q) : "";
  return folded.length > 0 ? folded : undefined;
}

const imageUrl = z
  .string()
  .trim()
  .max(500, "tooLong")
  .refine((v) => /^\/images\/[\w./-]+\.(webp|png|jpe?g|avif|svg)$/i.test(v) || /^https:\/\/[^\s]+$/i.test(v), "imageUrl");

export const variantSchema = z.object({
  id: z.string().optional(),
  sku: z
    .string()
    .trim()
    .min(2, "required")
    .max(40, "tooLong")
    .regex(/^[A-Z0-9-]+$/, "sku"),
  colorTr: z.string().trim().max(40, "tooLong").optional(),
  colorEn: z.string().trim().max(40, "tooLong").optional(),
  colorHex: z
    .string()
    .trim()
    .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "colorHex")
    .optional(),
  size: z.string().trim().max(40, "tooLong").optional(),
  priceDelta: liraToKurus.default(0),
  stock: z.coerce.number().int("integer").min(0, "nonNegative").max(100000, "tooLarge"),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    slug: slugField,
    categoryId: idField,
    nameTr: req(120),
    nameEn: req(120),
    shortDescTr: req(200),
    shortDescEn: req(200),
    descriptionTr: z.string().trim().min(20, "descriptionTooShort").max(5000, "tooLong"),
    descriptionEn: z.string().trim().min(20, "descriptionTooShort").max(5000, "tooLong"),
    price: liraToKurus.refine((v) => v > 0, "positive"),
    compareAtPrice: z
      .union([z.literal(""), z.null(), liraToKurus])
      .optional()
      .transform((v) => (typeof v === "number" && v > 0 ? v : null)),
    vatRate: z.coerce.number().refine((v) => (VAT_RATES as readonly number[]).includes(v), "vatRate"),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    images: z.array(imageUrl).max(8, "tooMany").default([]),
    variants: z.array(variantSchema).min(1, "variantRequired").max(30, "tooMany"),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "compareAtPrice" });
    }
    const seen = new Set<string>();
    v.variants.forEach((variant, i) => {
      if (seen.has(variant.sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "skuDuplicate" });
      seen.add(variant.sku);
      if (v.price + variant.priceDelta <= 0) {
        ctx.addIssue({ code: "custom", path: ["variants", i, "priceDelta"], message: "positive" });
      }
    });
  });
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormOutput = z.output<typeof productSchema>;

export const categorySchema = z.object({
  slug: slugField,
  nameTr: req(60),
  nameEn: req(60),
  descriptionTr: z.string().trim().max(300, "tooLong").default(""),
  descriptionEn: z.string().trim().max(300, "tooLong").default(""),
  sortOrder: z.coerce.number().int("integer").min(0, "nonNegative").max(999, "tooLarge").default(0),
});
export type CategoryFormInput = z.input<typeof categorySchema>;
