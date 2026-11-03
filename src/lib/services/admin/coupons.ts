import { db, isUniqueViolation } from "@/lib/db";
import { DomainError, NotFoundError } from "@/lib/domain/errors";
import { assertCan, type Actor } from "@/lib/domain/roles";
import { couponSchema, type CouponFormInput } from "@/lib/validation/coupon";
import { recordAudit } from "../audit";

export async function listCouponsForAdmin(actor: Actor) {
  assertCan(actor, "coupon:write");
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function saveCoupon(actor: Actor, id: string | null, raw: CouponFormInput) {
  assertCan(actor, "coupon:write");
  const input = couponSchema.parse(raw);
  try {
    return await db.$transaction(async (tx) => {
      const before = id ? await tx.coupon.findUnique({ where: { id } }) : null;
      if (id && !before) throw new NotFoundError("Coupon");
      const coupon = id ? await tx.coupon.update({ where: { id }, data: input }) : await tx.coupon.create({ data: input });
      const snapshot = (c: typeof input) => ({
        code: c.code,
        type: c.type,
        value: c.value,
        minSubtotal: c.minSubtotal,
        maxDiscount: c.maxDiscount,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        usageLimit: c.usageLimit,
        isActive: c.isActive,
      });
      await recordAudit(tx, actor, {
        action: id ? "coupon.update" : "coupon.create",
        entityType: "Coupon",
        entityId: coupon.id,
        summary: input.code,
        before: before ? snapshot(before as typeof input) : undefined,
        after: snapshot(input),
      });
      return coupon;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("CODE_TAKEN");
    throw error;
  }
}

export async function deleteCoupon(actor: Actor, id: string) {
  assertCan(actor, "coupon:write");
  const coupon = await db.coupon.findUnique({ where: { id } });
  if (!coupon) throw new NotFoundError("Coupon");
  await db.$transaction(async (tx) => {
    await tx.coupon.delete({ where: { id } });
    await recordAudit(tx, actor, { action: "coupon.delete", entityType: "Coupon", entityId: id, summary: coupon.code, before: { code: coupon.code } });
  });
}
