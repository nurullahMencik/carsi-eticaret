import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { listCategoriesForAdmin } from "@/lib/services/admin/categories";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.categories.title };
}

export default async function AdminCategoriesPage() {
  const actor = await requirePermission("category:write", "/admin/kategoriler");
  const { dict } = await getI18n();
  const rows = await listCategoriesForAdmin(actor);
  return (
    <>
      <PageHeader title={dict.admin.categories.title} />
      <CategoryManager
        rows={rows.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameTr: c.nameTr,
          nameEn: c.nameEn,
          descriptionTr: c.descriptionTr,
          descriptionEn: c.descriptionEn,
          sortOrder: c.sortOrder,
          products: c._count.products,
        }))}
      />
    </>
  );
}
