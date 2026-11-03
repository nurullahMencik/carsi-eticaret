import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { StatusBadge } from "@/components/store/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { fmt, formatDate } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { listOrdersForUser } from "@/lib/services/orders";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.meta.accountTitle, robots: { index: false } };
}

export default async function AccountPage() {
  const actor = await requireActor("/hesabim");
  const { dict, locale } = await getI18n();
  const orders = await listOrdersForUser(actor.id);
  return (
    <section aria-labelledby="orders-title">
      <h2 id="orders-title" className="mb-5 font-display text-2xl">
        {dict.account.orders}
      </h2>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <Package aria-hidden className="mx-auto size-10 text-ink-2" strokeWidth={1.4} />
          <p className="mt-3 text-ink-2">{dict.account.noOrders}</p>
          <ButtonLink href="/urunler" className="mt-6">
            {dict.cart.continueShopping}
          </ButtonLink>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface" data-testid="order-list">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/hesabim/siparisler/${o.number}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-surface-2/60" data-testid="order-row">
                <span className="min-w-36">
                  <span className="block font-mono text-sm font-semibold">{o.number}</span>
                  <span className="text-xs text-ink-2">{formatDate(o.createdAt, locale)}</span>
                </span>
                <span className="text-sm text-ink-2">{fmt(dict.account.items, { count: o.items.reduce((a, i) => a + i.quantity, 0) })}</span>
                <StatusBadge status={o.status} dict={dict} />
                <span className="ml-auto font-semibold num">{formatTRY(o.total)}</span>
                <ChevronRight aria-hidden className="size-4 text-ink-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
