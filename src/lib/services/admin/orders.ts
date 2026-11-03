import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertCan, type Actor } from "@/lib/domain/roles";
import { foldSearchText } from "@/lib/domain/search";
import type { AdminOrderFilter } from "@/lib/validation/order";

export const ADMIN_PAGE_SIZE = 20;

/** Istanbul is UTC+3 all year. "2026-11-02" -> start of that day in Istanbul as a UTC Date. */
export function istanbulDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+03:00`);
}

export function buildAdminOrderWhere(filter: AdminOrderFilter): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (filter.durum) where.status = filter.durum;
  if (filter.odeme) where.paymentProvider = filter.odeme;
  if (filter.baslangic || filter.bitis) {
    where.createdAt = {
      ...(filter.baslangic ? { gte: istanbulDayStart(filter.baslangic) } : {}),
      ...(filter.bitis ? { lt: new Date(istanbulDayStart(filter.bitis).getTime() + 86_400_000) } : {}),
    };
  }
  if (filter.q) {
    const q = filter.q.trim();
    const upper = q.toUpperCase();
    where.OR = [
      { number: { contains: upper } },
      { email: { contains: q.toLowerCase() } },
      { shipFullName: { contains: q } },
      { user: { name: { contains: q } } },
      { shipFullName: { contains: foldSearchText(q) } },
    ];
  }
  return where;
}

export async function listOrdersForAdmin(actor: Actor, filter: AdminOrderFilter) {
  assertCan(actor, "order:read-all");
  const where = buildAdminOrderWhere(filter);
  const total = await db.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(filter.sayfa ?? 1, pageCount);
  const rows = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
    include: { user: { select: { name: true } }, _count: { select: { items: true } } },
  });
  return { rows, total, page, pageCount };
}

export async function getOrderForAdmin(actor: Actor, id: string) {
  assertCan(actor, "order:read-all");
  return db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: true,
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, email: true } } } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
}
