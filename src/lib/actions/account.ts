"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/domain/errors";
import { createReview } from "@/lib/services/reviews";
import { transitionOrder } from "@/lib/services/orders";
import { addressSchema, type AddressInput } from "@/lib/validation/address";
import { fieldErrors } from "@/lib/validation/common";
import type { ReviewInput } from "@/lib/validation/review";
import { reviewSchema } from "@/lib/validation/review";
import { toActionError, type ActionResult } from "./result";

export async function createReviewAction(input: ReviewInput, slug: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    await createReview(actor, parsed.data);
    revalidatePath(`/urun/${slug}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveAddressAction(input: AddressInput): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  const count = await db.address.count({ where: { userId: actor.id } });
  const makeDefault = count === 0 || Boolean(parsed.data.isDefault);
  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: actor.id }, data: { isDefault: false } });
    await tx.address.create({
      data: { ...parsed.data, postalCode: parsed.data.postalCode || null, isDefault: makeDefault, userId: actor.id },
    });
  });
  revalidatePath("/hesabim/adresler");
  return { ok: true };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  await db.address.deleteMany({ where: { id: String(id), userId: actor.id } });
  revalidatePath("/hesabim/adresler");
  return { ok: true };
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  const address = await db.address.findFirst({ where: { id: String(id), userId: actor.id } });
  if (!address) return toActionError(new NotFoundError("Address"));
  await db.$transaction([
    db.address.updateMany({ where: { userId: actor.id }, data: { isDefault: false } }),
    db.address.update({ where: { id: address.id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/hesabim/adresler");
  return { ok: true };
}

export async function cancelOwnOrderAction(orderId: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "UNAUTHENTICATED" };
  try {
    // Customers act with the CUSTOMER role on their own orders, whatever their account role.
    await transitionOrder({ ...actor, role: "CUSTOMER" }, { orderId: String(orderId), toStatus: "CANCELLED" });
    revalidatePath("/hesabim", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
