import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/domain/errors";
import { InvalidTransitionError } from "@/lib/domain/order-status";
import { listAuditLog } from "@/lib/services/admin/audit";
import { saveCategory } from "@/lib/services/admin/categories";
import { saveCoupon } from "@/lib/services/admin/coupons";
import { listCustomers } from "@/lib/services/admin/customers";
import { getDashboard } from "@/lib/services/admin/dashboard";
import { listOrdersForAdmin } from "@/lib/services/admin/orders";
import { createProduct, updateProduct } from "@/lib/services/admin/products";
import { confirmPayment, transitionOrder } from "@/lib/services/orders";
import { demoPayment, makePendingOrder, makeProduct, makeUser } from "./helpers";

const productInput = (categoryId: string, slug: string) => ({
  slug,
  categoryId,
  nameTr: "Yetki Testi",
  nameEn: "Authz Test",
  shortDescTr: "Kısa",
  shortDescEn: "Short",
  descriptionTr: "Yirmi karakterden uzun bir açıklama.",
  descriptionEn: "A description longer than twenty chars.",
  price: 100,
  vatRate: 20,
  variants: [{ sku: `AUTHZ-${slug.toUpperCase()}`, stock: 5 }],
});

async function paidOrder(stock = 5) {
  const product = await makeProduct([stock]);
  const buyer = await makeUser("CUSTOMER");
  const v = product.variants[0]!;
  const order = await makePendingOrder(buyer.id, [{ productId: product.id, variantId: v.id, sku: v.sku, quantity: 2, unitPrice: product.price }]);
  await confirmPayment(order.id, demoPayment(order.total));
  return { product, buyer, order, variantId: v.id };
}

describe("a customer cannot perform admin operations", () => {
  it("is rejected by every admin service with ForbiddenError", async () => {
    const customer = await makeUser("CUSTOMER");
    const category = await db.category.create({ data: { slug: "authz-cat", nameTr: "A", nameEn: "A" } });
    const { product } = await paidOrder();

    await expect(createProduct(customer, productInput(category.id, "authz-1"))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateProduct(customer, product.id, productInput(category.id, product.slug))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveCategory(customer, null, { slug: "hack", nameTr: "H", nameEn: "H" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveCoupon(customer, null, { code: "FREE100", type: "PERCENT", value: 100 })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listOrdersForAdmin(customer, { q: undefined })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listCustomers(customer)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getDashboard(customer)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAuditLog(customer)).rejects.toBeInstanceOf(ForbiddenError);

    expect(await db.product.count({ where: { slug: "authz-1" } })).toBe(0);
    expect(await db.coupon.count({ where: { code: "FREE100" } })).toBe(0);
  });

  it("cannot move an order through fulfilment, even their own", async () => {
    const { buyer, order } = await paidOrder();
    const err = await transitionOrder(buyer, { orderId: order.id, toStatus: "PREPARING" }).catch((e) => e);
    expect(err).toBeInstanceOf(InvalidTransitionError);
    expect(err.code).toBe("FORBIDDEN_TRANSITION");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });

  it("cannot see or cancel another customer's order", async () => {
    const { order } = await paidOrder();
    const stranger = await makeUser("CUSTOMER");
    await expect(transitionOrder(stranger, { orderId: order.id, toStatus: "CANCELLED" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("can cancel their own paid order, which refunds and restocks", async () => {
    const { buyer, order, variantId } = await paidOrder(5);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(3);
    await transitionOrder(buyer, { orderId: order.id, toStatus: "CANCELLED" });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(5);
  });
});

describe("staff and admin", () => {
  it("staff can fulfil an order; every step is logged and audited", async () => {
    const staff = await makeUser("STAFF");
    const { order } = await paidOrder();
    await transitionOrder(staff, { orderId: order.id, toStatus: "PREPARING" });
    await expect(transitionOrder(staff, { orderId: order.id, toStatus: "SHIPPED" })).rejects.toMatchObject({ code: "VALIDATION" });
    await transitionOrder(staff, { orderId: order.id, toStatus: "SHIPPED", carrier: "Aras Kargo", trackingNumber: "ARS1234567" });
    await transitionOrder(staff, { orderId: order.id, toStatus: "DELIVERED" });

    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: { orderBy: { createdAt: "asc" } } } });
    expect(saved).toMatchObject({ status: "DELIVERED", carrier: "Aras Kargo", trackingNumber: "ARS1234567" });
    expect(saved.events.map((e) => e.toStatus)).toEqual(["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED"]);
    expect(saved.events.slice(2).every((e) => e.actorId === staff.id && e.actorRole === "STAFF")).toBe(true);
    const audits = await db.auditLog.findMany({ where: { entityId: order.id, action: "order.status" } });
    expect(audits).toHaveLength(3);
    expect(audits.every((a) => a.actorEmail === staff.email)).toBe(true);
  });

  it("staff cannot refund or manage coupons; admin can refund a delivered order", async () => {
    const staff = await makeUser("STAFF");
    const admin = await makeUser("ADMIN");
    const { order, variantId } = await paidOrder(6);
    await transitionOrder(staff, { orderId: order.id, toStatus: "PREPARING" });
    await transitionOrder(staff, { orderId: order.id, toStatus: "SHIPPED", carrier: "PTT Kargo", trackingNumber: "PTT9988776" });
    await transitionOrder(staff, { orderId: order.id, toStatus: "DELIVERED" });

    await expect(transitionOrder(staff, { orderId: order.id, toStatus: "REFUNDED" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveCoupon(staff, null, { code: "STAFF10", type: "PERCENT", value: 10 })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAuditLog(staff)).rejects.toBeInstanceOf(ForbiddenError);

    await transitionOrder(admin, { orderId: order.id, toStatus: "REFUNDED", note: "Ürün iade edildi" });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(saved).toMatchObject({ status: "REFUNDED", paymentStatus: "REFUNDED" });
    expect(saved.payments.map((p) => p.status)).toEqual(["SUCCEEDED", "REFUNDED"]);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(6);
  });

  it("rejects transitions the state machine does not allow", async () => {
    const admin = await makeUser("ADMIN");
    const product = await makeProduct([3]);
    const buyer = await makeUser();
    const v = product.variants[0]!;
    const order = await makePendingOrder(buyer.id, [{ productId: product.id, variantId: v.id, sku: v.sku, quantity: 1, unitPrice: product.price }]);
    await expect(transitionOrder(admin, { orderId: order.id, toStatus: "SHIPPED", carrier: "x", trackingNumber: "ABC123456" })).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await expect(transitionOrder(admin, { orderId: order.id, toStatus: "PAID" })).rejects.toMatchObject({ code: "FORBIDDEN_TRANSITION" });
  });

  it("admin product changes are written to the audit log", async () => {
    const admin = await makeUser("ADMIN");
    const category = await db.category.create({ data: { slug: "audit-cat", nameTr: "A", nameEn: "A" } });
    const product = await createProduct(admin, productInput(category.id, "audit-urun"));
    await updateProduct(admin, product.id, { ...productInput(category.id, "audit-urun"), price: 150 });
    const logs = await db.auditLog.findMany({ where: { entityId: product.id }, orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.action)).toEqual(["product.create", "product.update"]);
    expect(JSON.parse(logs[1]!.changes!)).toEqual({ before: { price: 10000 }, after: { price: 15000 } });
  });
});
