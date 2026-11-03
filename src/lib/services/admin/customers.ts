import { db } from "@/lib/db";
import { assertCan, type Actor } from "@/lib/domain/roles";

const PAID_STATUSES = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];

export async function listCustomers(actor: Actor) {
  assertCan(actor, "customer:read");
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  const stats = await db.order.groupBy({
    by: ["userId"],
    where: { status: { in: PAID_STATUSES } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
  });
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  return users.map((u) => {
    const s = byUser.get(u.id);
    return { ...u, orderCount: s?._count._all ?? 0, totalSpent: s?._sum.total ?? 0, lastOrderAt: s?._max.createdAt ?? null };
  });
}
