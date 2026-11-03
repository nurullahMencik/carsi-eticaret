import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/domain/order-status";
import { assertCan, type Actor } from "@/lib/domain/roles";
import { LOW_STOCK_THRESHOLD } from "../catalog";

const REVENUE_STATUSES = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];
const DAY = 86_400_000;
const ISTANBUL_OFFSET = 3 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of the Istanbul calendar day containing `date`. */
export function istanbulDayKey(date: Date): string {
  return new Date(date.getTime() + ISTANBUL_OFFSET).toISOString().slice(0, 10);
}

export type DailyPoint = { day: string; revenue: number; orders: number };

/** Buckets paid orders into Istanbul calendar days (portable: no SQL date functions). */
export function bucketByDay(orders: Array<{ paidAt: Date | null; total: number }>, days: number, now: Date): DailyPoint[] {
  const todayKey = istanbulDayKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00+03:00`).getTime();
  const points: DailyPoint[] = [];
  const index = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = istanbulDayKey(new Date(todayStart - i * DAY + 12 * 3600 * 1000));
    const point = { day: key, revenue: 0, orders: 0 };
    points.push(point);
    index.set(key, point);
  }
  for (const o of orders) {
    if (!o.paidAt) continue;
    const point = index.get(istanbulDayKey(o.paidAt));
    if (point) {
      point.revenue += o.total;
      point.orders += 1;
    }
  }
  return points;
}

export async function getDashboard(actor: Actor, now = new Date()) {
  assertCan(actor, "dashboard:read");
  const since = new Date(now.getTime() - 60 * DAY);
  const paid = await db.order.findMany({
    where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: since } },
    select: { paidAt: true, total: true },
  });
  const daily = bucketByDay(paid, 60, now);
  const last30 = daily.slice(30);
  const prev30 = daily.slice(0, 30);
  const sum = (pts: DailyPoint[], k: "revenue" | "orders") => pts.reduce((a, p) => a + p[k], 0);
  const revenue30 = sum(last30, "revenue");
  const orders30 = sum(last30, "orders");
  const revenuePrev = sum(prev30, "revenue");
  const ordersPrev = sum(prev30, "orders");
  const today = daily.at(-1)!;

  const statusGroups = await db.order.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } });
  const byStatus = ORDER_STATUSES.map((status) => ({ status, count: statusGroups.find((g) => g.status === status)?._count._all ?? 0 }));

  const best = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { in: REVENUE_STATUSES }, paidAt: { gte: new Date(now.getTime() - 30 * DAY) } } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const bestProducts = await db.product.findMany({
    where: { id: { in: best.map((b) => b.productId) } },
    select: { id: true, nameTr: true, nameEn: true, slug: true },
  });
  const bestSellers = best.map((b) => ({
    product: bestProducts.find((p) => p.id === b.productId)!,
    quantity: b._sum.quantity ?? 0,
    revenue: b._sum.lineTotal ?? 0,
  }));

  const lowStock = await db.productVariant.findMany({
    where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } },
    orderBy: [{ stock: "asc" }, { sku: "asc" }],
    take: 8,
    include: { product: { select: { id: true, nameTr: true, nameEn: true } } },
  });

  const awaitingPreparation = await db.order.count({ where: { status: "PAID" } });

  const change = (cur: number, prev: number) => (prev === 0 ? null : (cur - prev) / prev);
  return {
    daily,
    revenue30,
    orders30,
    avgBasket: orders30 ? Math.round(revenue30 / orders30) : 0,
    revenueChange: change(revenue30, revenuePrev),
    ordersChange: change(orders30, ordersPrev),
    avgBasketChange: change(orders30 ? revenue30 / orders30 : 0, ordersPrev ? revenuePrev / ordersPrev : 0),
    today,
    byStatus,
    bestSellers,
    lowStock,
    awaitingPreparation,
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
