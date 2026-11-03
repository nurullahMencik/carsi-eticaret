import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileDown, Truck } from "lucide-react";
import { CancelOrderButton } from "@/components/store/cancel-order-button";
import { OrderTimeline } from "@/components/store/order-timeline";
import { StatusBadge } from "@/components/store/status-badge";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { canTransition, isOrderStatus } from "@/lib/domain/order-status";
import { fmt, formatDateTime } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getOrderForUser } from "@/lib/services/orders";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const { dict } = await getI18n();
  return { title: fmt(dict.account.orderDetail, { number }), robots: { index: false } };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const actor = await requireActor(`/hesabim/siparisler/${number}`);
  const { dict, locale } = await getI18n();
  const order = await getOrderForUser(actor, number);
  if (!order || order.userId !== actor.id) notFound();
  const cancellable = isOrderStatus(order.status) && canTransition(order.status, "CANCELLED", "CUSTOMER");
  const paid = order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-3xl">{fmt(dict.account.orderDetail, { number: order.number })}</h2>
          <StatusBadge status={order.status} dict={dict} />
        </div>
        <p className="-mt-6 text-sm text-ink-2">{formatDateTime(order.createdAt, locale)}</p>

        {order.carrier && order.trackingNumber ? (
          <p className="flex items-center gap-2 rounded-2xl bg-teal-soft px-4 py-3 text-sm" data-testid="tracking">
            <Truck aria-hidden className="size-4 text-teal" />
            {fmt(dict.account.trackingNumber, { carrier: order.carrier, number: order.trackingNumber })}
          </p>
        ) : null}

        <section aria-labelledby="items-title">
          <h3 id="items-title" className="sr-only">
            {dict.admin.orders.items_}
          </h3>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 px-5 py-4 text-sm">
                <span>
                  <span className="font-medium">{locale === "en" ? i.productNameEn : i.productNameTr}</span>
                  {i.variantLabel ? <span className="text-ink-2"> · {i.variantLabel}</span> : null}
                  <span className="block text-ink-2 num">
                    {i.quantity} × {formatTRY(i.unitPrice)}
                  </span>
                </span>
                <span className="font-semibold num">{formatTRY(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">{dict.cart.subtotal}</dt>
              <dd className="num">{formatTRY(order.subtotal)}</dd>
            </div>
            {order.discount ? (
              <div className="flex justify-between">
                <dt className="text-ink-2">
                  {dict.cart.discount} {order.couponCode ? `(${order.couponCode})` : ""}
                </dt>
                <dd className="text-success num">−{formatTRY(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-ink-2">{dict.cart.shipping}</dt>
              <dd className="num">{order.shippingFee ? formatTRY(order.shippingFee) : dict.cart.free}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <dt>{dict.cart.total}</dt>
              <dd className="num">{formatTRY(order.total)}</dd>
            </div>
            <p className="text-xs text-ink-2">{fmt(dict.cart.vatNote, { vat: formatTRY(order.vatTotal) })}</p>
          </dl>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h3 className="mb-2 font-semibold">{dict.account.shippingAddress}</h3>
            <p className="text-ink-2">
              {order.shipFullName} · {order.shipPhone}
              <br />
              {order.shipLine}
              <br />
              {order.shipDistrict}/{order.shipCity} {order.shipPostalCode ?? ""}
            </p>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h3 className="mb-2 font-semibold">{dict.account.payment}</h3>
            <p className="text-ink-2">{order.isDemoPayment ? dict.account.paymentDemo : dict.account.paymentIyzico}</p>
            <p className="mt-1 text-ink-2">{(dict.paymentStatus as Record<string, string>)[order.paymentStatus] ?? order.paymentStatus}</p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3">
          {order.status === "PENDING" ? <ButtonLink href={`/odeme/${order.number}`}>{dict.account.payNow}</ButtonLink> : null}
          {paid ? (
            <a href={`/api/orders/${order.number}/invoice`} className={buttonClass("outline", "sm")} download>
              <FileDown aria-hidden className="size-4" />
              {dict.account.downloadInvoice}
            </a>
          ) : null}
          {cancellable ? <CancelOrderButton orderId={order.id} /> : null}
        </div>
      </div>
      <aside aria-labelledby="timeline-title" className="lg:border-l lg:border-line lg:pl-8">
        <h3 id="timeline-title" className="mb-5 font-display text-2xl">
          {dict.account.timeline}
        </h3>
        <OrderTimeline status={order.status} events={order.events} dict={dict} locale={locale} />
      </aside>
    </div>
  );
}
