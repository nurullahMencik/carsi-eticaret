"use client";

import Link from "next/link";
import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/store/product-image";
import { formatTRY } from "@/lib/domain/money";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { DataTable, type AdminColumn, type AdminFeatures } from "./data-table";

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  skus: string;
  category: string;
  categorySlug: string;
  image: string | null;
  price: number;
  stock: number;
  variants: number;
  isActive: boolean;
  isFeatured: boolean;
};

const col = createColumnHelper<AdminFeatures, AdminProductRow>();

export function ProductsTable({ rows }: { rows: AdminProductRow[] }) {
  const { dict } = useI18n();
  const p = dict.admin.products;
  const columns = useMemo(
    () =>
      [
        col.accessor("name", {
          header: p.name,
          cell: (info) => {
            const r = info.row.original;
            return (
              <span className="flex items-center gap-3">
                <span className="relative block size-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <ProductImage src={r.image} alt="" slug={r.slug} category={r.categorySlug} sizes="40px" showCoverName={false} />
                </span>
                <span className="min-w-0">
                  <Link href={`/admin/urunler/${r.id}`} className="font-medium hover:underline">
                    {info.getValue()}
                  </Link>
                  <span className="block truncate font-mono text-[0.7rem] text-ink-2">{r.skus}</span>
                </span>
              </span>
            );
          },
        }),
        col.accessor("category", { header: p.category }),
        col.accessor("price", { header: p.price, meta: { align: "right" }, cell: (info) => formatTRY(info.getValue()) }),
        col.accessor("stock", {
          header: p.stock,
          meta: { align: "right" },
          cell: (info) => {
            const v = info.getValue();
            return <span className={v === 0 ? "font-semibold text-danger" : v <= 3 ? "font-semibold text-warning" : ""}>{fmt(p.totalStock, { count: v })}</span>;
          },
        }),
        col.accessor("variants", { header: p.variants, meta: { align: "right" } }),
        col.accessor("isActive", {
          header: p.status,
          cell: (info) => (
            <span className="flex flex-wrap gap-1">
              {info.getValue() ? <Badge tone="success">{p.active}</Badge> : <Badge tone="neutral">{p.inactive}</Badge>}
              {info.row.original.isFeatured ? <Badge tone="accent">{p.featured}</Badge> : null}
            </span>
          ),
        }),
      ] as AdminColumn<AdminProductRow>[],
    [p],
  );
  return <DataTable columns={columns} data={rows} searchPlaceholder={p.searchPlaceholder} emptyText={dict.common.noResults} caption={p.title} />;
}
