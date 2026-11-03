import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { ButtonLink } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { fmt, localized } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { listProductsForAdmin } from "@/lib/services/admin/products";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.products.title };
}

export default async function AdminProductsPage() {
  const actor = await requirePermission("product:write", "/admin/urunler");
  const { dict, locale } = await getI18n();
  const products = await listProductsForAdmin(actor);
  return (
    <>
      <PageHeader
        title={dict.admin.products.title}
        subtitle={fmt(dict.admin.products.count, { count: products.length })}
        actions={
          <ButtonLink href="/admin/urunler/yeni" size="sm" data-testid="new-product">
            <Plus aria-hidden className="size-4" />
            {dict.admin.products.new}
          </ButtonLink>
        }
      />
      <ProductsTable
        rows={products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: localized(p, "name", locale),
          skus: p.variants.map((v) => v.sku).join(", "),
          category: localized(p.category, "name", locale),
          categorySlug: p.category.slug,
          image: p.images[0]?.url ?? null,
          price: p.price,
          stock: p.variants.filter((v) => v.isActive).reduce((a, v) => a + v.stock, 0),
          variants: p.variants.filter((v) => v.isActive).length,
          isActive: p.isActive,
          isFeatured: p.isFeatured,
        }))}
      />
    </>
  );
}
