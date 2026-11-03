import { db, isUniqueViolation, type Db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/domain/order-number";
import { DomainError, ConflictError, ForbiddenError, NotFoundError, OutOfStockError } from "@/lib/domain/errors";
import { assertTransition, transitionEffects, type OrderStatus } from "@/lib/domain/order-status";
import { allocateDiscount, calculateTotals } from "@/lib/domain/pricing";
import { assertCan, type Actor, type ActorRole } from "@/lib/domain/roles";
import { localized, type Locale } from "@/lib/i18n";
import { getProvider } from "@/lib/payments";
import type { CheckoutLine, PaymentProviderId, PaymentVerification } from "@/lib/payments/types";
import type { Address } from "@/lib/validation/address";
import { recordAudit } from "./audit";
import { findCoupon } from "./cart";
import { variantLabel } from "./catalog";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "./notifications";

export type CreateOrderInput = {
  cartId: string;
  address: Address;
  saveAddress?: boolean;
  note?: string;
  locale: Locale;
  provider: PaymentProviderId;
};

/**
 * Turns the cart into a PENDING order (a price/stock snapshot). Stock is *not* taken here;
 * it is taken atomically when the payment is confirmed (see confirmPayment).
 */
export async function createOrderFromCart(actor: Actor, input: CreateOrderInput, now = new Date()) {
  const cart = await db.cart.findUnique({
    where: { id: input.cartId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { variant: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } },
      },
    },
  });
  if (!cart || cart.userId !== actor.id) throw new NotFoundError("Cart");
  if (cart.items.length === 0) throw new DomainError("EMPTY_CART");

  for (const item of cart.items) {
    const { variant } = item;
    if (!variant.isActive || !variant.product.isActive || variant.stock < item.quantity) throw new OutOfStockError(variant.sku);
  }

  const coupon = cart.couponCode ? await findCoupon(cart.couponCode) : null;
  const lines = cart.items.map((item) => ({
    unitPrice: item.variant.product.price + item.variant.priceDelta,
    quantity: item.quantity,
    vatRate: item.variant.product.vatRate,
  }));
  const totals = calculateTotals(lines, coupon, now);
  const appliedCoupon = totals.coupon?.ok ? totals.coupon.code : null;
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });

  if (input.saveAddress) {
    const count = await db.address.count({ where: { userId: actor.id } });
    await db.address.create({
      data: {
        userId: actor.id,
        title: input.address.title,
        fullName: input.address.fullName,
        phone: input.address.phone,
        city: input.address.city,
        district: input.address.district,
        line: input.address.line,
        postalCode: input.address.postalCode || null,
        isDefault: count === 0,
      },
    });
  }

  for (let attempt = 0; ; attempt++) {
    try {
      return await db.order.create({
        data: {
          number: generateOrderNumber(now),
          userId: actor.id,
          email: user.email,
          status: "PENDING",
          paymentStatus: "UNPAID",
          paymentProvider: input.provider,
          isDemoPayment: input.provider === "DEMO",
          shipFullName: input.address.fullName,
          shipPhone: input.address.phone,
          shipCity: input.address.city,
          shipDistrict: input.address.district,
          shipLine: input.address.line,
          shipPostalCode: input.address.postalCode || null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingFee: totals.shippingFee,
          total: totals.total,
          vatTotal: totals.vatTotal,
          couponCode: appliedCoupon,
          locale: input.locale,
          note: input.note || null,
          items: {
            create: cart.items.map((item) => {
              const unitPrice = item.variant.product.price + item.variant.priceDelta;
              return {
                productId: item.variant.productId,
                variantId: item.variantId,
                productNameTr: item.variant.product.nameTr,
                productNameEn: item.variant.product.nameEn,
                variantLabel: variantLabel(item.variant, "tr"),
                sku: item.variant.sku,
                imageUrl: item.variant.product.images[0]?.url ?? null,
                unitPrice,
                quantity: item.quantity,
                vatRate: item.variant.product.vatRate,
                lineTotal: unitPrice * item.quantity,
              };
            }),
          },
          events: { create: { fromStatus: null, toStatus: "PENDING", actorId: actor.id, actorRole: actor.role } },
        },
      });
    } catch (error) {
      // Order number collision (unique constraint): retry with a new random suffix.
      if (attempt < 3 && isUniqueViolation(error)) continue;
      throw error;
    }
  }
}

/** Builds provider basket lines whose amounts add up exactly to the order total. */
export async function checkoutLinesForOrder(orderId: string, locale: Locale): Promise<CheckoutLine[]> {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { product: { include: { category: true } } } } },
  });
  const shares = allocateDiscount(
    order.items.map((i) => i.lineTotal),
    order.discount,
  );
  const lines: CheckoutLine[] = order.items.map((item, i) => ({
    id: item.sku,
    name: localized({ nameTr: item.productNameTr, nameEn: item.productNameEn }, "name", locale),
    category: localized(item.product.category, "name", locale),
    amount: item.lineTotal - shares[i]!,
  }));
  if (order.shippingFee > 0) lines.push({ id: "SHIPPING", name: locale === "en" ? "Shipping" : "Kargo", category: "Kargo", amount: order.shippingFee });
  return lines;
}

export type ConfirmResult =
  | { status: "paid"; orderId: string; alreadyProcessed: boolean }
  | { status: "rejected"; orderId: string; code: "OUT_OF_STOCK" | "AMOUNT_MISMATCH" | "NOT_PAYABLE"; sku?: string };

/**
 * Marks an order as paid and takes the stock — all in one transaction.
 *
 * Race safety: the first statement *claims* the order (PENDING -> PAID, so a duplicate callback
 * cannot process it twice) and every stock change is a conditional atomic update
 * (`UPDATE ... SET stock = stock - :qty WHERE id = :id AND stock >= :qty`). If any line cannot be
 * fulfilled the whole transaction rolls back. With two buyers racing for the last unit, exactly one
 * update matches; the other sees 0 affected rows and is rejected. This holds on SQLite (writers are
 * serialised; the first statement is a write so it takes the write lock up front) and on PostgreSQL
 * (row locks; the second UPDATE re-checks `stock >= qty` after the first commits).
 */
export async function confirmPayment(
  orderId: string,
  payment: Extract<PaymentVerification, { status: "success" }> & { provider: PaymentProviderId },
  now = new Date(),
  client: Db = db,
): Promise<ConfirmResult> {
  try {
    const result = await client.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          paymentProvider: payment.provider,
          paymentRef: payment.providerRef,
          isDemoPayment: payment.isDemo,
          paidAt: now,
        },
      });
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundError("Order");
      if (claimed.count === 0) {
        // Idempotency: the same payment delivered twice (e.g. callback retried).
        if (order.paymentRef === payment.providerRef) return { status: "paid", orderId, alreadyProcessed: true } as const;
        throw new DomainError("NOT_PAYABLE");
      }
      if (payment.amount !== order.total) throw new DomainError("AMOUNT_MISMATCH");

      for (const item of order.items) {
        const taken = await tx.productVariant.updateMany({
          where: { id: item.variantId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (taken.count !== 1) throw new OutOfStockError(item.sku);
        await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
      }
      if (order.couponCode) {
        await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
      }
      await tx.orderStatusEvent.create({
        data: { orderId, fromStatus: "PENDING", toStatus: "PAID", actorRole: "SYSTEM", note: payment.isDemo ? "DEMO" : payment.provider },
      });
      await tx.paymentAttempt.create({
        data: { orderId, provider: payment.provider, status: "SUCCEEDED", amount: payment.amount, providerRef: payment.providerRef },
      });
      // The purchased cart is done; the coupon has been consumed.
      await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
      await tx.cart.updateMany({ where: { userId: order.userId }, data: { couponCode: null } });
      return { status: "paid", orderId, alreadyProcessed: false } as const;
    });
    if (!result.alreadyProcessed) await sendOrderConfirmationEmail(orderId).catch(logEmailError);
    return result;
  } catch (error) {
    if (error instanceof OutOfStockError) return { status: "rejected", orderId, code: "OUT_OF_STOCK", sku: error.sku };
    if (error instanceof DomainError && (error.code === "AMOUNT_MISMATCH" || error.code === "NOT_PAYABLE")) {
      return { status: "rejected", orderId, code: error.code };
    }
    throw error;
  }
}

/**
 * A payment was captured but the order could not be fulfilled (stock ran out while paying):
 * void/refund it at the provider and cancel the order.
 */
export async function rejectCapturedPayment(
  orderId: string,
  payment: { provider: PaymentProviderId; providerRef: string; amount: number },
  reason: string,
  ip = "127.0.0.1",
) {
  const refund = await getProvider(payment.provider).refund({ orderId, providerRef: payment.providerRef, amount: payment.amount, ip });
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED", paymentStatus: refund.ok ? "REFUNDED" : "FAILED", cancelledAt: new Date() },
    });
    await tx.paymentAttempt.create({
      data: {
        orderId,
        provider: payment.provider,
        status: refund.ok ? "REFUNDED" : "FAILED",
        amount: payment.amount,
        providerRef: payment.providerRef,
        errorCode: reason,
        errorMessage: refund.ok ? "Captured payment voided" : `Refund failed: ${refund.code}`,
      },
    });
    if (updated.count === 1) {
      await tx.orderStatusEvent.create({
        data: { orderId, fromStatus: "PENDING", toStatus: "CANCELLED", actorRole: "SYSTEM", note: reason },
      });
    }
  });
  return refund;
}

export async function recordPaymentFailure(orderId: string, provider: PaymentProviderId, amount: number, code: string, message: string) {
  await db.$transaction([
    db.paymentAttempt.create({ data: { orderId, provider, status: "FAILED", amount, errorCode: code, errorMessage: message.slice(0, 300) } }),
    db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { paymentStatus: "FAILED" } }),
  ]);
}

export type TransitionInput = {
  orderId: string;
  toStatus: OrderStatus;
  note?: string;
  carrier?: string;
  trackingNumber?: string;
};

/**
 * The only way an order's status changes after payment. Enforces the state machine and roles,
 * refunds and restocks where needed, and logs a status event (+ audit entry for staff).
 */
export async function transitionOrder(actor: Actor | { id: null; email: "system"; role: "SYSTEM" }, input: TransitionInput) {
  const order = await db.order.findUnique({ where: { id: input.orderId }, include: { items: true } });
  if (!order) throw new NotFoundError("Order");
  const role: ActorRole = actor.role;
  if (role === "CUSTOMER") {
    // Customers may only touch their own orders; hide other orders' existence.
    if (order.userId !== actor.id) throw new NotFoundError("Order");
  } else if (role !== "SYSTEM") {
    assertCan(actor as Actor, "order:update-status");
    if (input.toStatus === "REFUNDED") assertCan(actor as Actor, "order:refund");
  }
  const from = order.status;
  assertTransition(from, input.toStatus, role);
  const to = input.toStatus;
  const effects = transitionEffects(from, to);
  if (effects.requiresTracking && (!input.carrier || !input.trackingNumber)) throw new DomainError("VALIDATION");

  let refundRef: string | undefined;
  if (effects.refundPayment && order.paymentStatus === "PAID" && order.paymentRef) {
    const refund = await getProvider(order.paymentProvider as PaymentProviderId).refund({
      orderId: order.id,
      providerRef: order.paymentRef,
      amount: order.total,
      ip: "127.0.0.1",
    });
    if (!refund.ok) throw new DomainError("REFUND_FAILED", refund.message);
    refundRef = refund.reference;
  }

  const now = new Date();
  const actorId = actor.id;
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: from },
      data: {
        status: to,
        ...(effects.refundPayment && order.paymentStatus === "PAID" ? { paymentStatus: "REFUNDED" } : {}),
        ...(to === "SHIPPED" ? { shippedAt: now, carrier: input.carrier, trackingNumber: input.trackingNumber } : {}),
        ...(to === "DELIVERED" ? { deliveredAt: now } : {}),
        ...(to === "CANCELLED" ? { cancelledAt: now } : {}),
      },
    });
    if (updated.count !== 1) throw new ConflictError();
    if (effects.restock) {
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: item.quantity } } });
      }
    }
    await tx.orderStatusEvent.create({
      data: { orderId: order.id, fromStatus: from, toStatus: to, actorId, actorRole: role, note: input.note || null },
    });
    if (refundRef !== undefined || (effects.refundPayment && order.paymentStatus === "PAID")) {
      await tx.paymentAttempt.create({
        data: { orderId: order.id, provider: order.paymentProvider, status: "REFUNDED", amount: order.total, providerRef: refundRef ?? null },
      });
    }
    if (role === "STAFF" || role === "ADMIN") {
      await recordAudit(tx, actor as Actor, {
        action: "order.status",
        entityType: "Order",
        entityId: order.id,
        summary: `${order.number}: ${from} → ${to}`,
        before: { status: from },
        after: { status: to, ...(input.carrier ? { carrier: input.carrier, trackingNumber: input.trackingNumber } : {}), ...(input.note ? { note: input.note } : {}) },
      });
    }
  });

  await sendOrderStatusEmail(order.id, to).catch(logEmailError);
  return { from, to };
}

export async function getOrderForUser(actor: Actor, number: string) {
  const order = await db.order.findUnique({
    where: { number },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;
  if (order.userId !== actor.id) {
    // Staff may look at any order; customers only at their own.
    if (actor.role === "CUSTOMER") return null;
  }
  return order;
}

export async function listOrdersForUser(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { quantity: true, imageUrl: true, productNameTr: true, productNameEn: true, productId: true } } },
  });
}

export function assertOrderOwner(actor: Actor, order: { userId: string }) {
  if (order.userId !== actor.id) throw new ForbiddenError();
}

function logEmailError(error: unknown) {
  console.error("[carsi] e-mail notification failed", error);
}
