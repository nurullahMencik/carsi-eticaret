"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Table2, LineChart } from "lucide-react";
import { formatTRY } from "@/lib/domain/money";
import { useI18n } from "@/lib/i18n/client";
import type { DailyPoint } from "@/lib/services/admin/dashboard";

// Recharts is only downloaded when the dashboard is opened.
const RevenueChart = dynamic(() => import("./revenue-chart"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-surface-2" aria-hidden />,
});

export function RevenuePanel({ data }: { data: DailyPoint[] }) {
  const { dict, locale } = useI18n();
  const [table, setTable] = useState(false);
  const d = dict.admin.dashboard;
  const dayFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section className="rounded-xl border border-line bg-surface" aria-labelledby="revenue-title">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <h2 id="revenue-title" className="text-sm font-semibold">
            {d.dailyRevenue}
          </h2>
          <p className="text-xs text-ink-2">{d.dailyRevenueText}</p>
        </div>
        <button
          type="button"
          onClick={() => setTable((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-surface-2"
        >
          {table ? <LineChart aria-hidden className="size-3.5" /> : <Table2 aria-hidden className="size-3.5" />}
          {table ? d.showChart : d.showTable}
        </button>
      </div>
      <div className="p-5">
        {table ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-ink-2">
                <tr>
                  <th className="py-1.5 font-medium">{d.day}</th>
                  <th className="py-1.5 text-right font-medium">{d.ordersCount}</th>
                  <th className="py-1.5 text-right font-medium">{d.revenue}</th>
                </tr>
              </thead>
              <tbody className="num">
                {[...data].reverse().map((p) => (
                  <tr key={p.day} className="border-t border-line">
                    <td className="py-1.5">{dayFmt.format(new Date(`${p.day}T00:00:00Z`))}</td>
                    <td className="py-1.5 text-right">{p.orders}</td>
                    <td className="py-1.5 text-right">{formatTRY(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RevenueChart data={data} />
        )}
      </div>
    </section>
  );
}
