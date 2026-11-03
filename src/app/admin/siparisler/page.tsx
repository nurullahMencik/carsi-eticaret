import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/session";
import { ORDER_STATUSES } from "@/lib/domain/order-status";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { listOrdersForAdmin } from "@/lib/services/admin/orders";
import { buildListUrl } from "@/lib/url";
import { adminOrderFilterSchema } from "@/lib/validation/order";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.orders.title };
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("order:read-all", "/admin/siparisler");
  const { dict } = await getI18n();
  const filter = adminOrderFilterSchema.parse(await searchParams);
  const result = await listOrdersForAdmin(actor, filter);
  const o = dict.admin.orders;
  const field = "h-9 rounded-lg border border-line-strong bg-canvas px-2.5 text-sm";
  const state = { durum: filter.durum, q: filter.q, odeme: filter.odeme, baslangic: filter.baslangic, bitis: filter.bitis };
  return (
    <>
      <PageHeader title={o.title} subtitle={fmt(o.count, { count: result.total })} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4" aria-label={o.filter}>
        <label className="grid gap-1 text-xs text-ink-2">
          {dict.common.search}
          <input name="q" type="search" defaultValue={filter.q} placeholder={o.searchPlaceholder} className={`${field} w-60`} />
        </label>
        <label className="grid gap-1 text-xs text-ink-2">
          {o.filterStatus}
          <select name="durum" defaultValue={filter.durum ?? ""} className={field} data-testid="status-filter">
            <option value="">{dict.common.all}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.orderStatus[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-2">
          {o.filterPayment}
          <select name="odeme" defaultValue={filter.odeme ?? ""} className={field}>
            <option value="">{dict.common.all}</option>
            <option value="DEMO">{o.demo}</option>
            <option value="IYZICO">iyzico</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-2">
          {o.from}
          <input name="baslangic" type="date" defaultValue={filter.baslangic} className={field} />
        </label>
        <label className="grid gap-1 text-xs text-ink-2">
          {o.to}
          <input name="bitis" type="date" defaultValue={filter.bitis} className={field} />
        </label>
        <Button type="submit" size="sm">
          {o.filter}
        </Button>
        <Link href="/admin/siparisler" className="pb-2 text-sm text-teal hover:underline">
          {o.reset}
        </Link>
      </form>
      <OrdersTable
        rows={result.rows.map((r) => ({
          id: r.id,
          number: r.number,
          customer: r.user.name,
          email: r.email,
          items: r._count.items,
          total: r.total,
          status: r.status,
          provider: r.paymentProvider,
          isDemo: r.isDemoPayment,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        href={(page) => buildListUrl("/admin/siparisler", state, { sayfa: page })}
        labels={{ nav: o.title, previous: dict.common.previous, next: dict.common.next, page: fmt(dict.common.page, { page: "{page}", total: result.pageCount }) }}
      />
    </>
  );
}
