import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { CartLines } from "@/components/store/cart-lines";
import { CouponForm, couponErrorText } from "@/components/store/coupon-form";
import { OrderSummary } from "@/components/store/order-summary";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { getActor } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { getCartView } from "@/lib/services/cart";
import { currentCartOwner } from "@/lib/services/cart-context";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.meta.cartTitle, robots: { index: false } };
}

export default async function CartPage() {
  const { dict, locale } = await getI18n();
  const [owner, actor] = await Promise.all([currentCartOwner(), getActor()]);
  const cart = await getCartView(owner, locale);

  if (cart.lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center pt-20 text-center">
        <ShoppingBag aria-hidden className="size-12 text-ink-2" strokeWidth={1.3} />
        <h1 className="mt-4 font-display text-4xl">{dict.cart.empty}</h1>
        <p className="mt-2 max-w-md text-ink-2">{dict.cart.emptyText}</p>
        <ButtonLink href="/urunler" className="mt-8">
          {dict.cart.continueShopping}
        </ButtonLink>
      </div>
    );
  }

  const coupon = cart.totals.coupon;
  const invalidReason = cart.couponCode && coupon && !coupon.ok ? couponErrorText(dict, coupon.reason, "minSubtotal" in coupon ? { minSubtotal: coupon.minSubtotal, missing: coupon.missing } : undefined) : null;

  return (
    <div className="container-page pt-10">
      <h1 className="mb-8 font-display text-4xl sm:text-5xl">{dict.cart.title}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          {cart.hasStockProblem ? <Alert tone="warning">{dict.cart.stockAdjusted}</Alert> : null}
          <CartLines lines={cart.lines} />
          {!actor ? <p className="text-sm text-ink-2">{dict.cart.guestNote}</p> : null}
        </div>
        <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <OrderSummary totals={cart.totals} dict={dict} couponCode={coupon?.ok ? cart.couponCode : null}>
            <CouponForm appliedCode={cart.couponCode} invalidReason={invalidReason} />
            {actor ? (
              <ButtonLink href="/odeme" size="lg" className="w-full" aria-disabled={cart.hasStockProblem} data-testid="checkout-button">
                {dict.cart.checkout}
              </ButtonLink>
            ) : (
              <ButtonLink href="/giris?callbackUrl=/odeme" size="lg" className="w-full" data-testid="checkout-button">
                {dict.cart.loginToCheckout}
              </ButtonLink>
            )}
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
