import { db, isUniqueViolation } from "@/lib/db";
import { DomainError, NotFoundError } from "@/lib/domain/errors";
import { assertCan, type Actor } from "@/lib/domain/roles";
import { buildSearchText } from "@/lib/domain/search";
import { productSchema, type ProductFormInput, type ProductFormOutput } from "@/lib/validation/catalog";
import { recordAudit } from "../audit";

export async function listProductsForAdmin(actor: Actor) {
  assertCan(actor, "product:write");
  return db.product.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: {
      category: { select: { nameTr: true, nameEn: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { stock: true, sku: true, isActive: true } },
    },
  });
}

export async function getProductForAdmin(actor: Actor, id: string) {
  assertCan(actor, "product:write");
  return db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } } },
  });
}

function productData(input: ProductFormOutput) {
  return {
    slug: input.slug,
    categoryId: input.categoryId,
    nameTr: input.nameTr,
    nameEn: input.nameEn,
    shortDescTr: input.shortDescTr,
    shortDescEn: input.shortDescEn,
    descriptionTr: input.descriptionTr,
    descriptionEn: input.descriptionEn,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    vatRate: input.vatRate,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
    searchText: buildSearchText([input.nameTr, input.nameEn, input.shortDescTr, input.shortDescEn, ...input.variants.flatMap((v) => [v.colorTr, v.colorEn, v.size, v.sku])]),
  };
}

function variantData(v: ProductFormOutput["variants"][number], index: number) {
  return {
    sku: v.sku,
    colorTr: v.colorTr || null,
    colorEn: v.colorEn || null,
    colorHex: v.colorHex || null,
    size: v.size || null,
    priceDelta: v.priceDelta,
    stock: v.stock,
    isActive: v.isActive,
    sortOrder: index,
  };
}

function mapUniqueError(error: unknown): never {
  if (isUniqueViolation(error)) {
    const msg = String((error as Error).message ?? "");
    throw new DomainError(/sku/i.test(msg) ? "SKU_TAKEN" : "SLUG_TAKEN");
  }
  throw error;
}

export async function createProduct(actor: Actor, raw: ProductFormInput) {
  assertCan(actor, "product:write");
  const input = productSchema.parse(raw);
  try {
    return await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData(input),
          images: { create: input.images.map((url, i) => ({ url, altTr: input.nameTr, altEn: input.nameEn, sortOrder: i })) },
          variants: { create: input.variants.map(variantData) },
        },
      });
      await recordAudit(tx, actor, {
        action: "product.create",
        entityType: "Product",
        entityId: product.id,
        summary: `${input.nameTr} (${input.slug})`,
        after: { slug: input.slug, price: input.price, variants: input.variants.map((v) => ({ sku: v.sku, stock: v.stock })) },
      });
      return product;
    });
  } catch (error) {
    mapUniqueError(error);
  }
}

export async function updateProduct(actor: Actor, id: string, raw: ProductFormInput) {
  assertCan(actor, "product:write");
  const input = productSchema.parse(raw);
  const before = await db.product.findUnique({ where: { id }, include: { images: true, variants: true } });
  if (!before) throw new NotFoundError("Product");
  try {
    return await db.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id }, data: productData(input) });
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (input.images.length) {
        await tx.productImage.createMany({
          data: input.images.map((url, i) => ({ productId: id, url, altTr: input.nameTr, altEn: input.nameEn, sortOrder: i })),
        });
      }
      // Variants: update by id, create new ones, deactivate removed ones (they may be referenced by orders).
      const keepIds = new Set<string>();
      for (const [i, v] of input.variants.entries()) {
        // Match by id, or by SKU when the form sends a variant without an id.
        const existing = before.variants.find((b) => (v.id ? b.id === v.id : b.sku === v.sku) && !keepIds.has(b.id));
        if (existing) {
          await tx.productVariant.update({ where: { id: existing.id }, data: variantData(v, i) });
          keepIds.add(existing.id);
        } else {
          const created = await tx.productVariant.create({ data: { ...variantData(v, i), productId: id } });
          keepIds.add(created.id);
        }
      }
      const removed = before.variants.filter((v) => !keepIds.has(v.id));
      if (removed.length) {
        await tx.productVariant.updateMany({ where: { id: { in: removed.map((v) => v.id) } }, data: { isActive: false } });
        await tx.cartItem.deleteMany({ where: { variantId: { in: removed.map((v) => v.id) } } });
      }
      const changed: Record<string, [unknown, unknown]> = {};
      for (const key of ["slug", "nameTr", "nameEn", "price", "compareAtPrice", "vatRate", "isActive", "isFeatured", "categoryId"] as const) {
        if (JSON.stringify(before[key]) !== JSON.stringify(product[key])) changed[key] = [before[key], product[key]];
      }
      const stockChanges = input.variants
        .map((v) => {
          const prev = before.variants.find((b) => b.id === v.id);
          return prev && prev.stock !== v.stock ? { sku: v.sku, from: prev.stock, to: v.stock } : null;
        })
        .filter(Boolean);
      await recordAudit(tx, actor, {
        action: "product.update",
        entityType: "Product",
        entityId: id,
        summary: `${input.nameTr}: ${[...Object.keys(changed), ...(stockChanges.length ? ["stock"] : []), ...(removed.length ? ["variants"] : [])].join(", ") || "—"}`,
        before: Object.fromEntries(Object.entries(changed).map(([k, [b]]) => [k, b])),
        after: { ...Object.fromEntries(Object.entries(changed).map(([k, [, a]]) => [k, a])), ...(stockChanges.length ? { stock: stockChanges } : {}) },
      });
      return product;
    });
  } catch (error) {
    mapUniqueError(error);
  }
}
