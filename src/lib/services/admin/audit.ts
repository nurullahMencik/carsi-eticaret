import { db } from "@/lib/db";
import { assertCan, type Actor } from "@/lib/domain/roles";

export async function listAuditLog(actor: Actor, entityType?: string, take = 200) {
  assertCan(actor, "audit:read");
  return db.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });
}
