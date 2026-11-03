"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/components/ui/cn";

/** Shared feature set for admin tables: client-side sorting + a global text filter. */
export const adminTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
  filterFns: { includesString: filterFn_includesString },
});
export type AdminFeatures = typeof adminTableFeatures;
export type AdminColumn<T extends RowData> = ColumnDef<AdminFeatures, T>;

export function DataTable<T extends RowData>({
  columns,
  data,
  searchPlaceholder,
  emptyText,
  initialSorting = [],
  toolbar,
  caption,
  rowTestId,
}: {
  columns: AdminColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  emptyText: string;
  initialSorting?: SortingState;
  toolbar?: ReactNode;
  caption: string;
  rowTestId?: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useTable({
    features: adminTableFeatures,
    columns,
    data,
    initialState: { sorting: initialSorting },
    state: { globalFilter },
    onGlobalFilterChange: (updater) => setGlobalFilter((prev) => (typeof updater === "function" ? updater(prev) : updater) ?? ""),
    globalFilterFn: "includesString",
  });
  const rows = table.getRowModel().rows;

  return (
    <div className="rounded-xl border border-line bg-surface">
      {searchPlaceholder || toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          {searchPlaceholder ? (
            <div className="relative w-full max-w-xs">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
              <input
                type="search"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-line-strong bg-canvas pr-3 pl-9 text-sm"
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-left text-xs text-ink-2">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-line">
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cn("px-4 py-2.5 font-medium whitespace-nowrap", align === "right" && "text-right")}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn("inline-flex items-center gap-1 hover:text-ink", align === "right" && "flex-row-reverse")}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUp aria-hidden className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown aria-hidden className="size-3.5" />
                          ) : (
                            <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-2">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-surface-2/50" data-testid={rowTestId}>
                  {row.getAllCells().map((cell) => {
                    const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                    return (
                      <td key={cell.id} className={cn("px-4 py-2.5 align-middle", align === "right" && "text-right num")}>
                        <table.FlexRender cell={cell} />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
