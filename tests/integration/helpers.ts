import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Actor, Role } from "@/lib/domain/roles";

export async function makeUser(role: Role = "CUSTOMER"): Promise<Actor> {
  const user = await db.user.create({
    data: { email: `${role.toLowerCase()}-${randomUUID().slice(0, 8)}@test.demo`, name: `Test ${role}`, role, passwordHash: "x" },
  });
  return { id: user.id, email: user.email, role };
}

export async function makeProduct(stocks: number[], price = 10_000) {
  const suffix = randomUUID().slice(0, 8);
  const category = await db.category.create({ data: { slug: `cat-${suffix}`, nameTr: "Kategori", nameEn: "Category" } });
  return db.product.create({
    data: {
      slug: `urun-${suffix}`,
      categoryId: category.id,
      nameTr: "Test Ürünü",
      nameEn: "Test Product",
      shortDescTr: "Kısa",
      shortDescEn: "Short",
      descriptionTr: "Açıklama",
      descriptionEn: "Description",
      price,
      variants: { create: stocks.map((stock, i) => ({ sku: `T-${suffix}-${i}`.toUpperCase(), stock })) },
    },
    include: { variants: { orderBy: { sku: "asc" } } },
  });
}

/** A PENDING order (as created at checkout) for the given lines. */
export async function makePendingOrder(userId: string, lines: Array<{ productId: string; variantId: string; sku: string; quantity: number; unitPrice: number }>) {
  const total = lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  return db.order.create({
    data: {
      number: `CRS-T-${randomUUID().slice(0, 8)}`,
      userId,
      email: "buyer@test.demo",
      paymentProvider: "DEMO",
      shipFullName: "Test Alıcı",
      shipPhone: "05320000000",
      shipCity: "İstanbul",
      shipDistrict: "Kadıköy",
      shipLine: "Test Sok. No: 1",
      subtotal: total,
      total,
      vatTotal: Math.round((total * 20) / 120),
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productNameTr: "Test Ürünü",
          productNameEn: "Test Product",
          sku: l.sku,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          vatRate: 20,
          lineTotal: l.unitPrice * l.quantity,
        })),
      },
      events: { create: { toStatus: "PENDING", actorRole: "CUSTOMER", actorId: userId } },
    },
  });
}

export function demoPayment(amount: number, ref = `demo_${randomUUID().slice(0, 8)}`) {
  return { status: "success" as const, providerRef: ref, amount, isDemo: true, provider: "DEMO" as const };
}
