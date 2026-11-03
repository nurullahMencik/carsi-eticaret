import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requirePermission } from "@/lib/auth/session";
import { getImageCredits } from "@/lib/content/credits";
import { db } from "@/lib/db";
import { localized } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.products.new };
}

export default async function NewProductPage() {
  await requirePermission("product:write", "/admin/urunler/yeni");
  const { dict, locale } = await getI18n();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title={dict.admin.products.new} />
      <ProductForm
        productId={null}
        categories={categories.map((c) => ({ id: c.id, name: localized(c, "name", locale), slug: c.slug }))}
        library={getImageCredits().filter((c) => c.kind === "product").map((c) => ({ path: c.path, label: c.title }))}
        initial={{
          slug: "",
          categoryId: categories[0]?.id ?? "",
          nameTr: "",
          nameEn: "",
          shortDescTr: "",
          shortDescEn: "",
          descriptionTr: "",
          descriptionEn: "",
          price: "",
          compareAtPrice: "",
          vatRate: 20,
          isActive: true,
          isFeatured: false,
          images: [],
          variants: [{ sku: "", colorTr: "", colorEn: "", colorHex: "", size: "", priceDelta: 0, stock: 10, isActive: true }],
        }}
      />
    </>
  );
}
