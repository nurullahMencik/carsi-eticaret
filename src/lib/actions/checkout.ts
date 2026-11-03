"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth/session";
import { siteUrl } from "@/lib/env";
import { getLocale } from "@/lib/i18n/server";
import { activeProviderId, demoProvider, getIyzicoProvider } from "@/lib/payments";
import {
  checkoutLinesForOrder,
  confirmPayment,
  createOrderFromCart,
  recordPaymentFailure,
  rejectCapturedPayment,
} from "@/lib/services/orders";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/address";
import { fieldErrors } from "@/lib/validation/common";
import { demoCardSchema, type DemoCardInput } from "@/lib/validation/payment";
import { toActionError, type ActionResult } from "./result";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "127.0.0.1";
}

/** Sends the customer to iyzico's hosted Checkout Form for an existing PENDING order. */
async function startIyzicoCheckout(orderId: string): Promise<ActionResult> {
  const iyzico = getIyzicoProvider();
  if (!iyzico) return { ok: false, error: "PAYMENT_FAILED" };
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { user: true } });
  const locale = order.locale === "en" ? "en" : "tr";
  const result = await iyzico.startCheckout({
    orderId: order.id,
    orderNumber: order.number,
    total: order.total,
    locale,
    buyer: { id: order.userId, name: order.user.name, email: order.email, phone: order.shipPhone, ip: await clientIp() },
    address: { fullName: order.shipFullName, city: order.shipCity, district: order.shipDistrict, line: order.shipLine, postalCode: order.shipPostalCode },
    lines: await checkoutLinesForOrder(order.id, locale),
    callbackUrl: `${siteUrl()}/api/payments/iyzico/callback`,
  });
  if (result.kind === "error") {
    await recordPaymentFailure(order.id, "IYZICO", order.total, result.code, result.message);
    return { ok: false, error: "PAYMENT_FAILED" };
  }
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { paymentToken: result.token ?? null } }),
    db.paymentAttempt.create({ data: { orderId: order.id, provider: "IYZICO", status: "INITIATED", amount: order.total, providerRef: result.token ?? null } }),
  ]);
  redirect(result.url);
}

export async function placeOrderAction(input: CheckoutInput): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  let orderId: string;
  let orderNumber: string;
  const provider = activeProviderId();
  try {
    let address = parsed.data.newAddress;
    if (parsed.data.addressId) {
      const saved = await db.address.findFirst({ where: { id: parsed.data.addressId, userId: actor.id } });
      if (!saved) return { ok: false, error: "NOT_FOUND" };
      address = { ...saved, postalCode: saved.postalCode ?? undefined, isDefault: saved.isDefault };
    }
    const cart = await db.cart.findUnique({ where: { userId: actor.id } });
    if (!cart || !address) return { ok: false, error: "EMPTY_CART" };
    const order = await createOrderFromCart(actor, {
      cartId: cart.id,
      address,
      saveAddress: Boolean(parsed.data.saveAddress && !parsed.data.addressId),
      note: parsed.data.note,
      locale: await getLocale(),
      provider,
    });
    orderId = order.id;
    orderNumber = order.number;
  } catch (error) {
    return toActionError(error);
  }
  if (provider === "IYZICO") return startIyzicoCheckout(orderId);
  redirect(`/odeme/${orderNumber}`);
}

export async function retryIyzicoAction(orderNumber: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const order = await db.order.findUnique({ where: { number: String(orderNumber) } });
  if (!order || order.userId !== actor.id) return { ok: false, error: "NOT_FOUND" };
  if (order.status !== "PENDING") return { ok: false, error: "NOT_PAYABLE" };
  return startIyzicoCheckout(order.id);
}

/**
 * Demo provider: "charges" a test card. The amount is always the server-side order total;
 * nothing the browser sends can change it.
 */
export async function payWithDemoCardAction(input: DemoCardInput): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  // Test cards are only accepted while the demo provider is active; with iyzico configured
  // this action must not be usable to mark orders as paid.
  if (activeProviderId() !== "DEMO") return { ok: false, error: "FORBIDDEN" };
  const parsed = demoCardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  const order = await db.order.findUnique({ where: { number: parsed.data.orderNumber } });
  if (!order || order.userId !== actor.id) return { ok: false, error: "NOT_FOUND" };
  if (order.status !== "PENDING") {
    if (order.paymentStatus === "PAID") redirect(`/odeme/${order.number}/tamamlandi`);
    return { ok: false, error: "NOT_PAYABLE" };
  }
  if (order.paymentProvider !== "DEMO") {
    await db.order.update({ where: { id: order.id }, data: { paymentProvider: "DEMO", isDemoPayment: true } });
  }

  const verification = demoProvider.charge(parsed.data.cardNumber, order.total);
  if (verification.status === "failure") {
    await recordPaymentFailure(order.id, "DEMO", order.total, verification.code, verification.message);
    revalidatePath(`/odeme/${order.number}`);
    return { ok: false, error: verification.code };
  }
  const result = await confirmPayment(order.id, { ...verification, provider: "DEMO" });
  if (result.status === "rejected") {
    if (result.code === "OUT_OF_STOCK") {
      await rejectCapturedPayment(order.id, { provider: "DEMO", providerRef: verification.providerRef, amount: verification.amount }, "OUT_OF_STOCK", await clientIp());
    }
    revalidatePath("/", "layout");
    return { ok: false, error: result.code };
  }
  revalidatePath("/", "layout");
  redirect(`/odeme/${order.number}/tamamlandi`);
}
