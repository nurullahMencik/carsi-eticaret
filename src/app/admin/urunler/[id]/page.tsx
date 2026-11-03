import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Alert } from "@/components/ui/alert";
import { requirePermission } from "@/lib/auth/session";
import { getImageCredits } from "@/lib/content/credits";
import { db } from "@/lib/db";
import { localized } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getProductForAdmin } from "@/lib/services/admin/products";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.products.edit };
}

const lira = (kurus: number) => kurus / 100;

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ yeni?: string }> }) {
  const { id } = await params;
  const { yeni } = await searchParams;
  const actor = await requirePermission("product:write", `/admin/urunler/${id}`);
  const { dict, locale } = await getI18n();
  const [product, categories] = await Promise.all([getProductForAdmin(actor, id), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  if (!product) notFound();
  return (
    <>
      <Link href="/admin/urunler" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {dict.admin.products.title}
      </Link>
      <PageHeader title={localized(product, "name", locale)} subtitle={dict.admin.products.edit} />
      {yeni ? (
        <Alert tone="success" className="mb-4">
          {dict.admin.products.created}{" "}
          <Link href={`/urun/${product.slug}`} className="font-semibold underline">
            {dict.admin.products.viewInStore}
          </Link>
        </Alert>
      ) : null}
      <ProductForm
        productId={product.id}
        categories={categories.map((c) => ({ id: c.id, name: localized(c, "name", locale), slug: c.slug }))}
        library={getImageCredits().filter((c) => c.kind === "product").map((c) => ({ path: c.path, label: c.title }))}
        initial={{
          slug: product.slug,
          categoryId: product.categoryId,
          nameTr: product.nameTr,
          nameEn: product.nameEn,
          shortDescTr: product.shortDescTr,
          shortDescEn: product.shortDescEn,
          descriptionTr: product.descriptionTr,
          descriptionEn: product.descriptionEn,
          price: lira(product.price),
          compareAtPrice: product.compareAtPrice ? lira(product.compareAtPrice) : "",
          vatRate: product.vatRate,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          images: product.images.map((i) => i.url),
          variants: product.variants
            .filter((v) => v.isActive)
            .map((v) => ({
              id: v.id,
              sku: v.sku,
              colorTr: v.colorTr ?? "",
              colorEn: v.colorEn ?? "",
              colorHex: v.colorHex ?? "",
              size: v.size ?? "",
              priceDelta: lira(v.priceDelta),
              stock: v.stock,
              isActive: true,
            })),
        }}
      />
    </>
  );
}
