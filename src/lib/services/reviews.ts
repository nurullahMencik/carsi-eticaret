import { db } from "@/lib/db";
import { DomainError } from "@/lib/domain/errors";
import type { Actor } from "@/lib/domain/roles";
import { reviewSchema, type ReviewInput } from "@/lib/validation/review";

/** Only customers with a delivered order containing the product may review it. */
export async function reviewEligibility(userId: string | null | undefined, productId: string) {
  if (!userId) return { canReview: false, reason: "UNAUTHENTICATED" as const };
  const existing = await db.review.findUnique({ where: { productId_userId: { productId, userId } } });
  if (existing) return { canReview: false, reason: "REVIEW_EXISTS" as const };
  const purchased = await db.orderItem.count({ where: { productId, order: { userId, status: "DELIVERED" } } });
  if (purchased === 0) return { canReview: false, reason: "REVIEW_NOT_ALLOWED" as const };
  return { canReview: true, reason: null };
}

export async function createReview(actor: Actor, raw: ReviewInput) {
  const input = reviewSchema.parse(raw);
  const eligibility = await reviewEligibility(actor.id, input.productId);
  if (!eligibility.canReview) throw new DomainError(eligibility.reason!);
  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: { productId: input.productId, userId: actor.id, rating: input.rating, title: input.title || null, body: input.body },
    });
    const agg = await tx.review.aggregate({ where: { productId: input.productId }, _avg: { rating: true }, _count: { _all: true } });
    await tx.product.update({
      where: { id: input.productId },
      data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
    });
  });
}

/** Purchased (delivered) products still waiting for the user's review. */
export async function productsAwaitingReview(userId: string) {
  const items = await db.orderItem.findMany({
    where: { order: { userId, status: "DELIVERED" }, product: { reviews: { none: { userId } } } },
    select: { productId: true },
    distinct: ["productId"],
  });
  return items.map((i) => i.productId);
}
