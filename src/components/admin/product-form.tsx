"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ProductImage } from "@/components/store/product-image";
import { saveProductAction } from "@/lib/actions/admin";
import { errorMessage, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { slugify } from "@/lib/slugify";
import { productSchema, type ProductFormInput } from "@/lib/validation/catalog";

export type ProductFormValues = ProductFormInput;

export function ProductForm({
  productId,
  initial,
  categories,
  library,
}: {
  productId: string | null;
  initial: ProductFormValues;
  categories: { id: string; name: string; slug: string }[];
  library: { path: string; label: string }[];
}) {
  const { dict } = useI18n();
  const p = dict.admin.products;
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema, undefined, { raw: true }), defaultValues: initial });
  const variants = useFieldArray({ control: form.control, name: "variants" });
  const images = useWatch({ control: form.control, name: "images" }) ?? [];
  const errors = form.formState.errors;
  const err = (path: string) => {
    const parts = path.split(".");
    let node: unknown = errors;
    for (const part of parts) node = (node as Record<string, unknown> | undefined)?.[part];
    return validationMessage(dict, (node as { message?: string } | undefined)?.message);
  };
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const categorySlug = categories.find((c) => c.id === categoryId)?.slug ?? "seramik";
  const nameTr = useWatch({ control: form.control, name: "nameTr" });
  const slug = useWatch({ control: form.control, name: "slug" });

  const setImages = (next: string[]) => form.setValue("images", next, { shouldDirty: true, shouldValidate: true });

  return (
    <form
      noValidate
      className="grid gap-5 xl:grid-cols-[1fr_22rem]"
      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        const result = await saveProductAction(productId, values);
        if (result.ok) {
          setMessage({ tone: "success", text: productId ? p.saved : p.created });
          if (!productId) router.push(`/admin/urunler/${result.data.id}?yeni=1`);
          else router.refresh();
        } else {
          for (const [key, code] of Object.entries(result.fieldErrors ?? {})) form.setError(key as never, { message: code });
          setMessage({ tone: "error", text: errorMessage(dict, result.error) });
        }
      })}
    >
      <div className="space-y-5">
        <section className="space-y-4 rounded-xl border border-line bg-surface p-5" aria-labelledby="basics">
          <h2 id="basics" className="text-sm font-semibold">
            {p.basics}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="nameTr" label={p.nameTr} error={err("nameTr")}>
              <Input
                id="nameTr"
                aria-invalid={Boolean(err("nameTr"))}
                {...form.register("nameTr", {
                  onBlur: () => {
                    if (!form.getValues("slug")) form.setValue("slug", slugify(form.getValues("nameTr")), { shouldValidate: true });
                  },
                })}
              />
            </Field>
            <Field id="nameEn" label={p.nameEn} error={err("nameEn")}>
              <Input id="nameEn" aria-invalid={Boolean(err("nameEn"))} {...form.register("nameEn")} />
            </Field>
            <Field id="slug" label={p.slug} error={err("slug")} hint={`/urun/${slug || "…"}`}>
              <Input id="slug" className="font-mono text-sm" aria-invalid={Boolean(err("slug"))} {...form.register("slug")} />
            </Field>
            <Field id="categoryId" label={p.category} error={err("categoryId")}>
              <Select id="categoryId" {...form.register("categoryId")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="shortDescTr" label={p.shortDescTr} error={err("shortDescTr")}>
              <Input id="shortDescTr" aria-invalid={Boolean(err("shortDescTr"))} {...form.register("shortDescTr")} />
            </Field>
            <Field id="shortDescEn" label={p.shortDescEn} error={err("shortDescEn")}>
              <Input id="shortDescEn" aria-invalid={Boolean(err("shortDescEn"))} {...form.register("shortDescEn")} />
            </Field>
            <Field id="descriptionTr" label={p.descriptionTr} error={err("descriptionTr")}>
              <Textarea id="descriptionTr" rows={6} aria-invalid={Boolean(err("descriptionTr"))} {...form.register("descriptionTr")} />
            </Field>
            <Field id="descriptionEn" label={p.descriptionEn} error={err("descriptionEn")}>
              <Textarea id="descriptionEn" rows={6} aria-invalid={Boolean(err("descriptionEn"))} {...form.register("descriptionEn")} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-line bg-surface p-5" aria-labelledby="variants-title">
          <div className="flex items-center justify-between">
            <h2 id="variants-title" className="text-sm font-semibold">
              {p.variants}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                variants.append({ sku: "", colorTr: "", colorEn: "", colorHex: "", size: "", priceDelta: 0, stock: 0, isActive: true })
              }
            >
              <Plus aria-hidden className="size-4" />
              {p.addVariant}
            </Button>
          </div>
          {err("variants") ? <p className="text-sm text-danger">{err("variants")}</p> : null}
          <ul className="space-y-3">
            {variants.fields.map((field, i) => (
              <li key={field.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_6rem_1fr_1fr_1fr_auto]">
                <Field id={`v-${i}-sku`} label={p.sku} error={err(`variants.${i}.sku`)}>
                  <Input
                    id={`v-${i}-sku`}
                    className="font-mono text-sm uppercase"
                    aria-invalid={Boolean(err(`variants.${i}.sku`))}
                    {...form.register(`variants.${i}.sku`, { setValueAs: (v: string) => v.toUpperCase().trim() })}
                  />
                </Field>
                <Field id={`v-${i}-colorTr`} label={p.colorTr}>
                  <Input id={`v-${i}-colorTr`} {...form.register(`variants.${i}.colorTr`)} />
                </Field>
                <Field id={`v-${i}-colorEn`} label={p.colorEn}>
                  <Input id={`v-${i}-colorEn`} {...form.register(`variants.${i}.colorEn`)} />
                </Field>
                <Field id={`v-${i}-colorHex`} label={p.colorHex} error={err(`variants.${i}.colorHex`)}>
                  <Input id={`v-${i}-colorHex`} placeholder="#b4532a" className="font-mono text-sm" {...form.register(`variants.${i}.colorHex`)} />
                </Field>
                <Field id={`v-${i}-size`} label={p.size}>
                  <Input id={`v-${i}-size`} {...form.register(`variants.${i}.size`)} />
                </Field>
                <Field id={`v-${i}-priceDelta`} label={p.priceDelta} error={err(`variants.${i}.priceDelta`)}>
                  <Input id={`v-${i}-priceDelta`} type="number" step="0.01" {...form.register(`variants.${i}.priceDelta`)} />
                </Field>
                <Field id={`v-${i}-stock`} label={p.stock} error={err(`variants.${i}.stock`)}>
                  <Input id={`v-${i}-stock`} type="number" min={0} {...form.register(`variants.${i}.stock`)} />
                </Field>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => variants.remove(i)} disabled={variants.fields.length <= 1} aria-label={p.removeVariant}>
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="space-y-5">
        <section className="space-y-4 rounded-xl border border-line bg-surface p-5" aria-labelledby="pricing">
          <h2 id="pricing" className="text-sm font-semibold">
            {p.pricing}
          </h2>
          <Field id="price" label={p.priceLabel} error={err("price")}>
            <Input id="price" type="number" step="0.01" min={0} aria-invalid={Boolean(err("price"))} {...form.register("price")} />
          </Field>
          <Field id="compareAtPrice" label={`${p.compareAtLabel} (${dict.common.optional})`} error={err("compareAtPrice")}>
            <Input id="compareAtPrice" type="number" step="0.01" min={0} {...form.register("compareAtPrice")} />
          </Field>
          <Field id="vatRate" label={p.vatRate} error={err("vatRate")}>
            <Select id="vatRate" {...form.register("vatRate")}>
              <option value="20">%20</option>
              <option value="10">%10</option>
              <option value="1">%1</option>
            </Select>
          </Field>
          <Checkbox label={p.isActive} {...form.register("isActive")} />
          <Checkbox label={p.isFeatured} {...form.register("isFeatured")} />
        </section>

        <section className="space-y-3 rounded-xl border border-line bg-surface p-5" aria-labelledby="images-title">
          <h2 id="images-title" className="text-sm font-semibold">
            {p.images}
          </h2>
          {images.length === 0 ? (
            <div className="space-y-2">
              <div className="relative mx-auto aspect-[4/5] w-40 overflow-hidden rounded-lg">
                <ProductImage src={null} alt={nameTr || "Çarşı"} slug={slug || "yeni"} category={categorySlug} sizes="160px" />
              </div>
              <p className="text-xs text-ink-2">{p.noImages}</p>
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {images.map((url, i) => (
                <li key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                  <ProductImage src={url} alt="" slug={`img-${i}`} category={categorySlug} sizes="96px" showCoverName={false} />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label={p.removeImage}
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                  {err(`images.${i}`) ? <span className="absolute inset-x-0 bottom-0 bg-danger px-1 text-[0.65rem] text-white">{err(`images.${i}`)}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <label htmlFor="image-url" className="sr-only">
              {p.imageUrl}
            </label>
            <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/images/products/… veya https://…" className="text-sm" />
            <Button
              variant="outline"
              size="sm"
              className="h-auto"
              onClick={() => {
                if (imageUrl.trim()) setImages([...images, imageUrl.trim()]);
                setImageUrl("");
              }}
              aria-label={p.addImage}
            >
              <ImagePlus aria-hidden className="size-4" />
            </Button>
          </div>
          {library.length ? (
            <details open={libraryOpen} onToggle={(e) => setLibraryOpen(e.currentTarget.open)}>
              <summary className="cursor-pointer text-sm font-medium text-teal">{p.pickFromLibrary}</summary>
              <ul className="mt-3 grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto" aria-label={p.library}>
                {library.map((img) => (
                  <li key={img.path}>
                    <button
                      type="button"
                      title={img.label}
                      onClick={() => !images.includes(img.path) && setImages([...images, img.path])}
                      className={cn("relative block aspect-square w-full overflow-hidden rounded-md border-2", images.includes(img.path) ? "border-accent" : "border-transparent")}
                      aria-label={`${p.addImage}: ${img.label}`}
                    >
                      <ProductImage src={img.path} alt="" slug={img.path} category={categorySlug} sizes="72px" showCoverName={false} />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting} data-testid="save-product">
            {form.formState.isSubmitting ? dict.common.saving : dict.common.save}
          </Button>
          {productId ? (
            <Link href={`/urun/${initial.slug}`} className="inline-flex items-center gap-1 text-sm text-teal hover:underline" target="_blank">
              {p.viewInStore}
              <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
