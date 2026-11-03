"use client";

import Link from "next/link";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/store/status-badge";
import { formatTRY } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { DataTable, type AdminColumn, type AdminFeatures } from "./data-table";

export type AdminOrderRow = {
  id: string;
  number: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  status: string;
  provider: string;
  isDemo: boolean;
  createdAt: string;
};

const col = createColumnHelper<AdminFeatures, AdminOrderRow>();

export function OrdersTable({ rows }: { rows: AdminOrderRow[] }) {
  const { dict, locale } = useI18n();
  const o = dict.admin.orders;
  const columns = useMemo(
    () =>
      [
        col.accessor("number", {
          header: o.number,
          cell: (info) => (
            <Link href={`/admin/siparisler/${info.row.original.id}`} className="font-mono text-[0.8rem] font-semibold text-teal hover:underline" data-testid="admin-order-link">
              {info.getValue()}
            </Link>
          ),
        }),
        col.accessor("customer", {
          header: o.customer,
          cell: (info) => (
            <span>
              <span className="block">{info.getValue()}</span>
              <span className="text-xs text-ink-2">{info.row.original.email}</span>
            </span>
          ),
        }),
        col.accessor("createdAt", { header: o.created, sortFn: "datetime", cell: (info) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(info.getValue(), locale)}</span> }),
        col.accessor("items", { header: o.items, meta: { align: "right" } }),
        col.accessor("total", { header: o.total, meta: { align: "right" }, cell: (info) => formatTRY(info.getValue()) }),
        col.accessor("provider", {
          header: o.payment,
          cell: (info) => (info.row.original.isDemo ? <Badge tone="neutral">{o.demo}</Badge> : <Badge tone="teal">iyzico</Badge>),
        }),
        col.accessor("status", { header: o.filterStatus, cell: (info) => <StatusBadge status={info.getValue()} dict={dict} /> }),
      ] as AdminColumn<AdminOrderRow>[],
    [dict, locale, o],
  );
  return <DataTable columns={columns} data={rows} emptyText={dict.common.noResults} caption={o.title} rowTestId="admin-order-row" />;
}
