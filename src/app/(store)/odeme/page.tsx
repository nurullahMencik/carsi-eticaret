import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/store/checkout-form";
import { OrderSummary } from "@/components/store/order-summary";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { FLAT_SHIPPING_FEE } from "@/lib/domain/shipping";
import { getI18n } from "@/lib/i18n/server";
import { getCartView } from "@/lib/services/cart";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.meta.checkoutTitle, robots: { index: false } };
}

export default async function CheckoutPage() {
  const actor = await requireActor("/odeme");
  const { dict, locale } = await getI18n();
  const [cart, addresses, user] = await Promise.all([
    getCartView({ userId: actor.id }, locale),
    db.address.findMany({ where: { userId: actor.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } }),
  ]);
  if (cart.lines.length === 0) {
    return (
      <div className="container-page max-w-xl pt-16 text-center">
        <h1 className="font-display text-4xl">{dict.checkout.title}</h1>
        <p className="mt-4 text-ink-2">{dict.checkout.emptyCart}</p>
        <ButtonLink href="/urunler" className="mt-8">
          {dict.cart.continueShopping}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="container-page pt-10">
      <CheckoutSteps current="address" dict={dict} />
      <h1 className="mt-6 mb-8 font-display text-4xl sm:text-5xl">{dict.checkout.title}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div>
          {cart.hasStockProblem ? (
            <Alert tone="warning" className="mb-6">
              {dict.cart.stockAdjusted}{" "}
              <Link href="/sepet" className="font-semibold underline">
                {dict.cart.title}
              </Link>
            </Alert>
          ) : null}
          <CheckoutForm
            addresses={addresses.map((a) => ({ id: a.id, title: a.title, fullName: a.fullName, phone: a.phone, city: a.city, district: a.district, line: a.line, isDefault: a.isDefault }))}
            shippingFee={formatTRY(FLAT_SHIPPING_FEE)}
            defaultName={user.name}
          />
        </div>
        <div className="lg:sticky lg:top-32 lg:self-start">
          <OrderSummary totals={cart.totals} dict={dict} couponCode={cart.totals.coupon?.ok ? cart.couponCode : null}>
            <ul className="space-y-2 border-t border-line pt-4 text-sm">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    {l.quantity} × {l.name}
                    {l.variantLabel ? ` (${l.variantLabel})` : ""}
                  </span>
                  <span className="shrink-0 num">{formatTRY(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
