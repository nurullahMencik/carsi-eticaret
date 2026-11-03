"use server";

import { revalidatePath } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import { getActor } from "@/lib/auth/session";
import { deleteCategory, saveCategory } from "@/lib/services/admin/categories";
import { deleteCoupon, saveCoupon } from "@/lib/services/admin/coupons";
import { createProduct, updateProduct } from "@/lib/services/admin/products";
import { transitionOrder } from "@/lib/services/orders";
import { categorySchema, productSchema, type CategoryFormInput, type ProductFormInput } from "@/lib/validation/catalog";
import { fieldErrors } from "@/lib/validation/common";
import { couponSchema, type CouponFormInput } from "@/lib/validation/coupon";
import { orderStatusUpdateSchema, type OrderStatusUpdateInput } from "@/lib/validation/order";
import { toActionError, type ActionResult } from "./result";

async function actorOrError() {
  const actor = await getActor();
  return actor;
}

/** Local image paths must point at a real file, so the store never shows a broken image. */
function missingLocalImages(images: string[] | undefined): Record<string, string> {
  const errors: Record<string, string> = {};
  (images ?? []).forEach((url, i) => {
    if (url.startsWith("/") && !fs.existsSync(path.join(process.cwd(), "public", url))) errors[`images.${i}`] = "imageUrl";
  });
  return errors;
}

export async function saveProductAction(id: string | null, input: ProductFormInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const actor = await actorOrError();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  const imageErrors = missingLocalImages(parsed.data.images);
  if (Object.keys(imageErrors).length) return { ok: false, error: "VALIDATION", fieldErrors: imageErrors };
  try {
    const product = id ? await updateProduct(actor, id, input) : await createProduct(actor, input);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: product.id, slug: product.slug } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveCategoryAction(id: string | null, input: CategoryFormInput): Promise<ActionResult> {
  const actor = await actorOrError();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    await saveCategory(actor, id, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const actor = await actorOrError();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  try {
    await deleteCategory(actor, String(id));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveCouponAction(id: string | null, input: CouponFormInput): Promise<ActionResult> {
  const actor = await actorOrError();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    await saveCoupon(actor, id, input);
    revalidatePath("/admin/kuponlar");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  const actor = await actorOrError();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  try {
    await deleteCoupon(actor, String(id));
    revalidatePath("/admin/kuponlar");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOrderStatusAction(input: OrderStatusUpdateInput): Promise<ActionResult> {
  const actor = await actorOrError();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = orderStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    // Staff act with their own role; a customer account reaching this action is rejected by the service.
    if (actor.role === "CUSTOMER") return { ok: false, error: "FORBIDDEN" };
    await transitionOrder(actor, parsed.data);
    revalidatePath("/admin", "layout");
    revalidatePath("/hesabim", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
