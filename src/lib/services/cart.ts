import { db } from "@/lib/db";
import { normalizeCouponCode, type CouponRule } from "@/lib/domain/coupon";
import { DomainError, NotFoundError, OutOfStockError } from "@/lib/domain/errors";
import { calculateTotals, type CartTotals } from "@/lib/domain/pricing";
import { localized, type Locale } from "@/lib/i18n";
import { MAX_LINE_QUANTITY } from "@/lib/validation/cart";
import { variantLabel } from "./catalog";

/** Cart identity: a signed-in user's cart, or a guest cart identified by a cookie token. */
export type CartOwner = { userId: string } | { token: string };

function ownerWhere(owner: CartOwner) {
  return "userId" in owner ? { userId: owner.userId } : { token: owner.token };
}

export async function findCart(owner: CartOwner) {
  return db.cart.findUnique({ where: ownerWhere(owner) });
}

export async function getOrCreateCart(owner: CartOwner) {
  return db.cart.upsert({ where: ownerWhere(owner), update: {}, create: ownerWhere(owner) });
}

async function loadVariant(variantId: string) {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { isActive: true } } },
  });
  if (!variant || !variant.isActive || !variant.product.isActive) throw new NotFoundError("Variant");
  return variant;
}

/** Adds to the cart, capping the line at the available stock (and the per-line maximum). */
export async function addItem(owner: CartOwner, variantId: string, quantity: number) {
  const variant = await loadVariant(variantId);
  if (variant.stock <= 0) throw new OutOfStockError(variant.sku);
  const cart = await getOrCreateCart(owner);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const wanted = (existing?.quantity ?? 0) + quantity;
  const next = Math.min(wanted, variant.stock, MAX_LINE_QUANTITY);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: next },
    create: { cartId: cart.id, variantId, quantity: next },
  });
  return { cartId: cart.id, quantity: next, capped: next < wanted };
}

export async function setItemQuantity(owner: CartOwner, itemId: string, quantity: number) {
  const cart = await findCart(owner);
  const item = cart ? await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } }) : null;
  if (!cart || !item) throw new NotFoundError("Cart item");
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return { quantity: 0, capped: false };
  }
  const next = Math.min(quantity, Math.max(item.variant.stock, 0), MAX_LINE_QUANTITY);
  if (next <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return { quantity: 0, capped: true };
  }
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: next } });
  return { quantity: next, capped: next < quantity };
}

export async function removeItem(owner: CartOwner, itemId: string) {
  const cart = await findCart(owner);
  if (!cart) return;
  await db.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
}

export class CouponError extends DomainError {
  constructor(
    readonly reason: string,
    readonly details: { minSubtotal?: number; missing?: number } = {},
  ) {
    super("COUPON_" + reason, `Coupon rejected: ${reason}`);
  }
}

export async function findCoupon(code: string): Promise<CouponRule | null> {
  return db.coupon.findUnique({ where: { code: normalizeCouponCode(code) } });
}

/** Validates and stores a coupon on the cart. Throws CouponError with a reason. */
export async function applyCoupon(owner: CartOwner, rawCode: string, now = new Date()) {
  const code = normalizeCouponCode(rawCode);
  const coupon = await findCoupon(code);
  if (!coupon) throw new CouponError("NOT_FOUND");
  const cart = await getOrCreateCart(owner);
  const view = await loadCartLines(cart.id);
  const totals = calculateTotals(view.map((l) => l.priced), coupon, now);
  const evaluation = totals.coupon!;
  if (!evaluation.ok) {
    throw new CouponError(evaluation.reason, {
      minSubtotal: "minSubtotal" in evaluation ? evaluation.minSubtotal : undefined,
      missing: "missing" in evaluation ? evaluation.missing : undefined,
    });
  }
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  return { code, discount: evaluation.discount };
}

export async function removeCoupon(owner: CartOwner) {
  const cart = await findCart(owner);
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
}

async function loadCartLines(cartId: string) {
  const items = await db.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              category: { select: { slug: true, nameTr: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
  return items.map((item) => {
    const { variant } = item;
    const { product } = variant;
    const unitPrice = product.price + variant.priceDelta;
    const available = variant.isActive && product.isActive ? Math.max(variant.stock, 0) : 0;
    return {
      item,
      variant,
      product,
      unitPrice,
      available,
      priced: { unitPrice, quantity: item.quantity, vatRate: product.vatRate },
    };
  });
}

export type CartLineView = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  sku: string;
  categorySlug: string;
  categoryName: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
  vatRate: number;
};

export type CartView = {
  id: string | null;
  lines: CartLineView[];
  couponCode: string | null;
  totals: CartTotals;
  hasStockProblem: boolean;
};

const EMPTY_TOTALS = calculateTotals([], null);

export async function getCartView(owner: CartOwner | null, locale: Locale, now = new Date()): Promise<CartView> {
  const cart = owner ? await findCart(owner) : null;
  if (!cart) return { id: null, lines: [], couponCode: null, totals: EMPTY_TOTALS, hasStockProblem: false };
  const rows = await loadCartLines(cart.id);
  const coupon = cart.couponCode ? await findCoupon(cart.couponCode) : null;
  const totals = calculateTotals(
    rows.map((r) => r.priced),
    coupon,
    now,
  );
  const lines: CartLineView[] = rows.map((r) => ({
    id: r.item.id,
    variantId: r.variant.id,
    productId: r.product.id,
    slug: r.product.slug,
    name: localized(r.product, "name", locale),
    variantLabel: variantLabel(r.variant, locale),
    sku: r.variant.sku,
    categorySlug: r.product.category.slug,
    categoryName: localized(r.product.category, "name", locale),
    image: r.product.images[0]?.url ?? null,
    unitPrice: r.unitPrice,
    quantity: r.item.quantity,
    lineTotal: r.unitPrice * r.item.quantity,
    available: r.available,
    vatRate: r.product.vatRate,
  }));
  return {
    id: cart.id,
    lines,
    couponCode: cart.couponCode,
    totals,
    hasStockProblem: lines.some((l) => l.quantity > l.available),
  };
}

export async function cartItemCount(owner: CartOwner | null): Promise<number> {
  if (!owner) return 0;
  const result = await db.cartItem.aggregate({ where: { cart: ownerWhere(owner) }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

/**
 * Moves a guest cart into the user's cart after sign-in: quantities are summed and capped
 * at stock; the guest coupon is kept if the user's cart has none. The guest cart is deleted.
 */
export async function mergeGuestCart(token: string, userId: string) {
  const guest = await db.cart.findUnique({ where: { token }, include: { items: { include: { variant: true } } } });
  if (!guest) return { merged: 0 };
  await db.$transaction(async (tx) => {
    const userCart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    for (const item of guest.items) {
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
      });
      const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, Math.max(item.variant.stock, 0), MAX_LINE_QUANTITY);
      if (quantity <= 0) continue;
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        update: { quantity },
        create: { cartId: userCart.id, variantId: item.variantId, quantity },
      });
    }
    if (guest.couponCode && !userCart.couponCode) {
      await tx.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
  return { merged: guest.items.length };
}
