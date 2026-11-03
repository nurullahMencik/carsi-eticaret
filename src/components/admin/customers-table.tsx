"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatTRY } from "@/lib/domain/money";
import { formatDate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { DataTable, type AdminColumn, type AdminFeatures } from "./data-table";

export type CustomerRow = { id: string; name: string; email: string; role: string; orderCount: number; totalSpent: number; createdAt: string; lastOrderAt: string | null };

const col = createColumnHelper<AdminFeatures, CustomerRow>();

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const { dict, locale } = useI18n();
  const c = dict.admin.customers;
  const columns = useMemo(
    () =>
      [
        col.accessor("name", { header: c.name, cell: (i) => <span className="font-medium">{i.getValue()}</span> }),
        col.accessor("email", { header: c.email, cell: (i) => <span className="text-ink-2">{i.getValue()}</span> }),
        col.accessor("role", {
          header: c.role,
          cell: (i) => <Badge tone={i.getValue() === "CUSTOMER" ? "neutral" : "teal"}>{(dict.actorRole as Record<string, string>)[i.getValue()]}</Badge>,
        }),
        col.accessor("orderCount", { header: c.orders, meta: { align: "right" } }),
        col.accessor("totalSpent", { header: c.spent, meta: { align: "right" }, cell: (i) => formatTRY(i.getValue()) }),
        col.accessor("lastOrderAt", { header: c.lastOrder, cell: (i) => (i.getValue() ? formatDate(i.getValue()!, locale) : "—") }),
        col.accessor("createdAt", { header: c.joined, cell: (i) => formatDate(i.getValue(), locale) }),
      ] as AdminColumn<CustomerRow>[],
    [c, dict, locale],
  );
  return <DataTable columns={columns} data={rows} searchPlaceholder={c.searchPlaceholder} emptyText={dict.common.noResults} caption={c.title} initialSorting={[{ id: "totalSpent", desc: true }]} />;
}
