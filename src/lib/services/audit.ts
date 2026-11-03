import type { Actor } from "@/lib/domain/roles";
import type { Db, TxClient } from "@/lib/db";

export type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
};

/** Writes an audit log row. Pass the transaction client to make it atomic with the change. */
export async function recordAudit(client: TxClient | Db, actor: Actor | null, input: AuditInput) {
  const changes =
    input.before !== undefined || input.after !== undefined
      ? JSON.stringify({ before: input.before ?? null, after: input.after ?? null })
      : null;
  await client.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? "system",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary.slice(0, 500),
      changes,
    },
  });
}

/** Shallow diff of two flat records, for compact audit entries. */
export function diffRecords<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    const prev = before[key];
    const next = after[key];
    const same =
      prev instanceof Date && next instanceof Date ? prev.getTime() === next.getTime() : JSON.stringify(prev) === JSON.stringify(next);
    if (!same) {
      b[key] = prev;
      a[key] = next;
    }
  }
  return { before: b, after: a, changed: Object.keys(a) };
}
