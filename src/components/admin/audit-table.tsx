"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { DataTable, type AdminColumn, type AdminFeatures } from "./data-table";

export type AuditRow = { id: string; actorEmail: string; action: string; entityType: string; entityId: string; summary: string; changes: string | null; createdAt: string };

const col = createColumnHelper<AdminFeatures, AuditRow>();

type ChangeSet = { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null };

function parseChanges(json: string | null): ChangeSet | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ChangeSet;
  } catch {
    return null;
  }
}

function Changes({ json }: { json: string | null }) {
  const parsed = parseChanges(json);
  if (!parsed) return <span className="text-ink-2">—</span>;
  const keys = [...new Set([...Object.keys(parsed.before ?? {}), ...Object.keys(parsed.after ?? {})])];
  return (
    <ul className="space-y-0.5 font-mono text-[0.7rem]">
      {keys.slice(0, 6).map((k) => (
        <li key={k}>
          <span className="text-ink-2">{k}:</span> <span className="text-danger line-through">{JSON.stringify(parsed.before?.[k] ?? null)}</span>{" "}
          <span className="text-success">{JSON.stringify(parsed.after?.[k] ?? null)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const { dict, locale } = useI18n();
  const a = dict.admin.audit;
  const columns = useMemo(
    () =>
      [
        col.accessor("createdAt", { header: a.when, cell: (i) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(i.getValue(), locale)}</span> }),
        col.accessor("actorEmail", { header: a.actor }),
        col.accessor("action", { header: a.action, cell: (i) => <Badge tone="teal">{i.getValue()}</Badge> }),
        col.accessor("summary", {
          header: a.summary,
          cell: (i) => (
            <span>
              {i.getValue()}
              <span className="block text-xs text-ink-2">{i.row.original.entityType}</span>
            </span>
          ),
        }),
        col.accessor("changes", { header: a.changes, enableSorting: false, cell: (i) => <Changes json={i.getValue()} /> }),
      ] as AdminColumn<AuditRow>[],
    [a, locale],
  );
  return <DataTable columns={columns} data={rows} searchPlaceholder={dict.common.search} emptyText={dict.common.noResults} caption={a.title} initialSorting={[{ id: "createdAt", desc: true }]} />;
}
