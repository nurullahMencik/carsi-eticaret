"use server";

import { revalidatePath } from "next/cache";
import { ensureCartOwner, currentCartOwner } from "@/lib/services/cart-context";
import { addItem, applyCoupon, CouponError, removeCoupon, removeItem, setItemQuantity } from "@/lib/services/cart";
import { addToCartSchema, couponCodeSchema, updateCartItemSchema } from "@/lib/validation/cart";
import { fieldErrors } from "@/lib/validation/common";
import { toActionError, type ActionResult } from "./result";

export async function addToCartAction(input: { variantId: string; quantity: number }): Promise<ActionResult<{ quantity: number; capped: boolean }>> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    const owner = await ensureCartOwner();
    const result = await addItem(owner, parsed.data.variantId, parsed.data.quantity);
    revalidatePath("/", "layout");
    return { ok: true, data: { quantity: result.quantity, capped: result.capped } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCartItemAction(input: { itemId: string; quantity: number }): Promise<ActionResult> {
  const parsed = updateCartItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    const owner = await currentCartOwner();
    if (!owner) return { ok: false, error: "NOT_FOUND" };
    await setItemQuantity(owner, parsed.data.itemId, parsed.data.quantity);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  try {
    const owner = await currentCartOwner();
    if (owner) await removeItem(owner, String(itemId));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function applyCouponAction(input: { code: string }): Promise<ActionResult<{ code: string }>> {
  const parsed = couponCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    const owner = await ensureCartOwner();
    const result = await applyCoupon(owner, parsed.data.code);
    revalidatePath("/", "layout");
    return { ok: true, data: { code: result.code } };
  } catch (error) {
    if (error instanceof CouponError) {
      const details: Record<string, number> = {};
      if (error.details.minSubtotal !== undefined) details.minSubtotal = error.details.minSubtotal;
      if (error.details.missing !== undefined) details.missing = error.details.missing;
      return { ok: false, error: `COUPON_${error.reason}`, details };
    }
    return toActionError(error);
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  const owner = await currentCartOwner();
  if (owner) await removeCoupon(owner);
  revalidatePath("/", "layout");
  return { ok: true };
}
