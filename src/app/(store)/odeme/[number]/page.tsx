import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { DemoPaymentForm, failureText } from "@/components/store/demo-payment-form";
import { IyzicoRetryButton } from "@/components/store/iyzico-retry";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { getI18n } from "@/lib/i18n/server";
import { activeProviderId } from "@/lib/payments";
import { DEMO_TEST_CARDS } from "@/lib/payments/demo";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.checkout.paymentTitle, robots: { index: false } };
}

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ hata?: string }> }) {
  const { number } = await params;
  const { hata } = await searchParams;
  const actor = await requireActor(`/odeme/${number}`);
  const { dict } = await getI18n();
  const order = await db.order.findUnique({ where: { number }, include: { user: { select: { name: true } } } });
  if (!order || order.userId !== actor.id) notFound();
  if (order.paymentStatus === "PAID" || ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status)) redirect(`/odeme/${number}/tamamlandi`);

  const useIyzico = activeProviderId() === "IYZICO" && order.paymentProvider === "IYZICO";
  return (
    <div className="container-page pt-10">
      <CheckoutSteps current="payment" dict={dict} />
      <div className="mt-6 mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl sm:text-5xl">{dict.checkout.paymentTitle}</h1>
        <dl className="text-right text-sm">
          <dt className="text-ink-2">{dict.checkout.orderNumber}</dt>
          <dd className="font-mono font-semibold" data-testid="order-number">
            {order.number}
          </dd>
          <dt className="mt-1 text-ink-2">{dict.checkout.amountToPay}</dt>
          <dd className="text-xl font-semibold num">{formatTRY(order.total)}</dd>
        </dl>
      </div>
      {order.status !== "PENDING" ? (
        <div className="space-y-4">
          <Alert tone="error" title={dict.checkout.orderNotPayable}>
            {hata ? failureText(dict, hata) : null}
          </Alert>
          <ButtonLink href={`/hesabim/siparisler/${order.number}`} variant="outline">
            {dict.checkout.viewOrder}
          </ButtonLink>
        </div>
      ) : useIyzico ? (
        <div className="max-w-xl space-y-4">
          {hata ? <Alert tone="error" title={dict.checkout.failedTitle}>{failureText(dict, hata)}</Alert> : null}
          <Alert tone="info">{dict.checkout.iyzicoNotice}</Alert>
          <IyzicoRetryButton orderNumber={order.number} label={dict.account.payNow} />
        </div>
      ) : (
        <>
          {hata ? (
            <Alert tone="error" title={dict.checkout.failedTitle} className="mb-6">
              {failureText(dict, hata)}
            </Alert>
          ) : null}
          <DemoPaymentForm orderNumber={order.number} amount={formatTRY(order.total)} testCards={DEMO_TEST_CARDS} holder={order.shipFullName.toLocaleUpperCase("tr-TR")} />
        </>
      )}
    </div>
  );
}
