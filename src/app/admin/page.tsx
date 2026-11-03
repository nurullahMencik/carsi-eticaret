import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RevenuePanel } from "@/components/admin/revenue-panel";
import { requirePermission } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { fmt, localized } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getDashboard } from "@/lib/services/admin/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.dashboard.title };
}

function Change({ value, label, locale }: { value: number | null; label: string; locale: string }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  // tr-TR writes the percent sign first: "+%33,8".
  const pct = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 1 }).format(value);
  return (
    <p className={`mt-2 inline-flex items-center gap-1 text-xs ${up ? "text-success" : "text-danger"}`}>
      <Icon aria-hidden className="size-3.5" />
      {label.replace("{change}", pct)}
    </p>
  );
}

export default async function DashboardPage() {
  const actor = await requirePermission("dashboard:read");
  const { dict, locale } = await getI18n();
  const data = await getDashboard(actor);
  const d = dict.admin.dashboard;
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count));
  const kpis = [
    { label: d.revenue30, value: formatTRY(data.revenue30), change: data.revenueChange },
    { label: d.orders30, value: data.orders30.toLocaleString("tr-TR"), change: data.ordersChange },
    { label: d.avgBasket, value: formatTRY(data.avgBasket), change: data.avgBasketChange },
    { label: d.today, value: formatTRY(data.today.revenue), sub: `${data.today.orders} ${d.ordersCount.toLocaleLowerCase(locale === "en" ? "en" : "tr-TR")}` },
  ];
  return (
    <>
      <PageHeader title={d.title} subtitle={d.subtitle} />
      {data.awaitingPreparation > 0 ? (
        <Link
          href="/admin/siparisler?durum=PAID"
          className="mb-5 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm hover:underline"
        >
          <AlertTriangle aria-hidden className="size-4 text-warning" />
          {fmt(d.pendingAction, { count: data.awaitingPreparation })}
        </Link>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <li key={k.label} className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-medium text-ink-2">{k.label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight num" data-testid="kpi-value">
              {k.value}
            </p>
            {"change" in k ? <Change value={k.change ?? null} label={d.vsPrevious} locale={locale} /> : <p className="mt-2 text-xs text-ink-2">{k.sub}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <RevenuePanel data={data.daily} />
        <Panel title={d.ordersByStatus}>
          <ul className="space-y-3">
            {data.byStatus.map((s) => (
              <li key={s.status}>
                <Link href={`/admin/siparisler?durum=${s.status}`} className="group block">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="group-hover:underline">{(dict.orderStatus as Record<string, string>)[s.status]}</span>
                    <span className="font-semibold num">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2" aria-hidden>
                    <div className="h-2 rounded-full bg-[var(--chart-1)]" style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title={d.bestSellers} description={d.revenue30}>
          <ol className="divide-y divide-line">
            {data.bestSellers.map((b, i) => (
              <li key={b.product.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-5 text-ink-2 num">{i + 1}</span>
                <Link href={`/admin/urunler/${b.product.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  {localized(b.product, "name", locale)}
                </Link>
                <span className="text-ink-2 num">{fmt(d.unitsSold, { count: b.quantity })}</span>
                <span className="w-28 text-right font-semibold num">{formatTRY(b.revenue)}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title={d.lowStock}>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-ink-2">{d.lowStockEmpty}</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="low-stock">
              {data.lowStock.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <AlertTriangle aria-hidden className={`size-4 shrink-0 ${v.stock === 0 ? "text-danger" : "text-warning"}`} />
                  <Link href={`/admin/urunler/${v.product.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {localized(v.product, "name", locale)}
                    {v.colorTr || v.size ? <span className="text-ink-2"> · {[locale === "en" ? v.colorEn : v.colorTr, v.size].filter(Boolean).join(" · ")}</span> : null}
                  </Link>
                  <span className="font-mono text-xs text-ink-2">{v.sku}</span>
                  <span className={`w-20 text-right font-semibold num ${v.stock === 0 ? "text-danger" : "text-warning"}`}>{fmt(d.left, { count: v.stock })}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
