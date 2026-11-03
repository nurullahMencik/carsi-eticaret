import type { Metadata } from "next";
import { AuditTable } from "@/components/admin/audit-table";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { listAuditLog } from "@/lib/services/admin/audit";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.audit.title };
}

export default async function AuditPage() {
  const actor = await requirePermission("audit:read", "/admin/denetim");
  const { dict } = await getI18n();
  const rows = await listAuditLog(actor);
  return (
    <>
      <PageHeader title={dict.admin.audit.title} subtitle={dict.admin.audit.subtitle} />
      <AuditTable
        rows={rows.map((r) => ({
          id: r.id,
          actorEmail: r.actorEmail,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          summary: r.summary,
          changes: r.changes,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
