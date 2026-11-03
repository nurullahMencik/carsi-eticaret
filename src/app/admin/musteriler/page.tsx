import type { Metadata } from "next";
import { CustomersTable } from "@/components/admin/customers-table";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { listCustomers } from "@/lib/services/admin/customers";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.customers.title };
}

export default async function AdminCustomersPage() {
  const actor = await requirePermission("customer:read", "/admin/musteriler");
  const { dict } = await getI18n();
  const customers = await listCustomers(actor);
  return (
    <>
      <PageHeader title={dict.admin.customers.title} />
      <CustomersTable
        rows={customers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          orderCount: u.orderCount,
          totalSpent: u.totalSpent,
          createdAt: u.createdAt.toISOString(),
          lastOrderAt: u.lastOrderAt ? u.lastOrderAt.toISOString() : null,
        }))}
      />
    </>
  );
}
