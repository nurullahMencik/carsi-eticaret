import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/store/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { isOrderStatus, nextStatuses } from "@/lib/domain/order-status";
import { can } from "@/lib/domain/roles";
import { fmt, formatDateTime } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getOrderForAdmin } from "@/lib/services/admin/orders";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.orders.detail };
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission("order:read-all", `/admin/siparisler/${id}`);
  const { dict, locale } = await getI18n();
  const order = await getOrderForAdmin(actor, id);
  if (!order) notFound();
  const o = dict.admin.orders;
  const options = isOrderStatus(order.status)
    ? nextStatuses(order.status, actor.role).filter((s) => s !== "REFUNDED" || can(actor.role, "order:refund"))
    : [];
  return (
    <>
      <Link href="/admin/siparisler" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {o.title}
      </Link>
      <PageHeader
        title={`${o.detail} · ${order.number}`}
        subtitle={`${formatDateTime(order.createdAt, locale)} · ${order.user.name} <${order.email}>`}
        actions={
          <>
            <StatusBadge status={order.status} dict={dict} />
            {order.paidAt ? (
              <a href={`/api/orders/${order.number}/invoice`} className={buttonClass("outline", "sm")} download>
                <FileDown aria-hidden className="size-4" />
                {o.invoice}
              </a>
            ) : null}
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Panel title={o.items_}>
            <table className="w-full text-sm">
              <caption className="sr-only">{o.items_}</caption>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0">
                    <td className="py-2">
                      {locale === "en" ? i.productNameEn : i.productNameTr}
                      {i.variantLabel ? <span className="text-ink-2"> · {i.variantLabel}</span> : null}
                      <span className="block font-mono text-xs text-ink-2">{i.sku}</span>
                    </td>
                    <td className="py-2 text-right text-ink-2 num">
                      {i.quantity} × {formatTRY(i.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-semibold num">{formatTRY(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-2">{dict.cart.subtotal}</dt>
                <dd className="num">{formatTRY(order.subtotal)}</dd>
              </div>
              {order.discount ? (
                <div className="flex justify-between">
                  <dt className="text-ink-2">
                    {dict.cart.discount} ({order.couponCode})
                  </dt>
                  <dd className="num">−{formatTRY(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-2">{dict.cart.shipping}</dt>
                <dd className="num">{formatTRY(order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">{dict.invoice.vatTotal}</dt>
                <dd className="num">{formatTRY(order.vatTotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
                <dt>{dict.cart.total}</dt>
                <dd className="num">{formatTRY(order.total)}</dd>
              </div>
            </dl>
          </Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel title={dict.account.shippingAddress}>
              <p className="text-sm text-ink-2">
                {order.shipFullName} · {order.shipPhone}
                <br />
                {order.shipLine}
                <br />
                {order.shipDistrict}/{order.shipCity} {order.shipPostalCode ?? ""}
              </p>
              {order.note ? <p className="mt-3 rounded-lg bg-surface-2 p-2 text-sm">“{order.note}”</p> : null}
              {order.carrier ? <p className="mt-3 text-sm">{fmt(dict.account.trackingNumber, { carrier: order.carrier, number: order.trackingNumber ?? "" })}</p> : null}
            </Panel>
            <Panel title={o.payments}>
              <ul className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <Badge tone={p.status === "SUCCEEDED" ? "success" : p.status === "FAILED" ? "danger" : p.status === "REFUNDED" ? "warning" : "neutral"}>{p.status}</Badge>
                    <span className="num">{formatTRY(p.amount)}</span>
                    <span className="text-xs text-ink-2">{p.provider === "DEMO" ? o.demo : "iyzico"}</span>
                    {p.errorCode ? <span className="text-xs text-danger">{p.errorCode}</span> : null}
                    <span className="w-full text-xs text-ink-2">{formatDateTime(p.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
        <div className="space-y-5">
          <Panel title={o.updateStatus}>
            <OrderStatusForm key={order.status} orderId={order.id} options={options} />
          </Panel>
          <Panel title={o.history}>
            <ol className="space-y-3 text-sm" data-testid="status-history">
              {order.events.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <p className="font-medium">
                    {e.fromStatus ? `${(dict.orderStatus as Record<string, string>)[e.fromStatus]} → ` : ""}
                    {(dict.orderStatus as Record<string, string>)[e.toStatus]}
                  </p>
                  <p className="text-xs text-ink-2">
                    {formatDateTime(e.createdAt, locale)} · {(dict.actorRole as Record<string, string>)[e.actorRole]}
                    {e.actor ? ` (${e.actor.email})` : ""}
                  </p>
                  {e.note && e.note !== "DEMO" ? <p className="text-xs">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
