"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTRY } from "@/lib/domain/money";
import { useI18n } from "@/lib/i18n/client";
import type { DailyPoint } from "@/lib/services/admin/dashboard";

/** Single-series area chart: one hue, 2px line, recessive grid, crosshair tooltip. */
export default function RevenueChart({ data }: { data: DailyPoint[] }) {
  const { dict, locale } = useI18n();
  const compact = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", { notation: "compact", maximumFractionDigits: 1 });
  const dayFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (day: string) => dayFmt.format(new Date(`${day}T00:00:00Z`));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="day"
            tickFormatter={label}
            tick={{ fill: "var(--ink-2)", fontSize: 11 }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => `₺${compact.format(v / 100)}`}
            tick={{ fill: "var(--ink-2)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: "var(--ink-2)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const point = active && payload?.[0] ? (payload[0].payload as DailyPoint) : null;
              if (!point) return null;
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-ink">{label(point.day)}</p>
                  <p className="text-ink-2">
                    {dict.admin.dashboard.revenue}: <span className="font-semibold text-ink num">{formatTRY(point.revenue)}</span>
                  </p>
                  <p className="text-ink-2">
                    {dict.admin.dashboard.ordersCount}: <span className="font-semibold text-ink num">{point.orders}</span>
                  </p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#revFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
