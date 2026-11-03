import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addItem, applyCoupon, CouponError, getCartView, mergeGuestCart } from "@/lib/services/cart";
import { createOrderFromCart } from "@/lib/services/orders";
import { makeProduct, makeUser } from "./helpers";

const address = { title: "Ev", fullName: "Ayşe Yılmaz", phone: "05321234567", city: "İstanbul", district: "Kadıköy", line: "Moda Cad. No: 42 D: 5" };

describe("cart", () => {
  it("caps quantities at stock and merges a guest cart into the user's cart on sign-in", async () => {
    const product = await makeProduct([3, 10], 20_000);
    const [low, plenty] = product.variants;
    const user = await makeUser();
    const guest = { token: randomUUID().replace(/-/g, "") };

    await addItem({ userId: user.id }, plenty!.id, 2);
    await addItem(guest, low!.id, 5); // capped to 3
    await addItem(guest, plenty!.id, 4);
    await mergeGuestCart(guest.token, user.id);

    const view = await getCartView({ userId: user.id }, "tr");
    expect(view.lines.map((l) => [l.sku, l.quantity])).toEqual([
      [plenty!.sku, 6],
      [low!.sku, 3],
    ]);
    expect(await db.cart.findUnique({ where: { token: guest.token } })).toBeNull();
  });

  it("validates coupons against the cart and snapshots totals into the order", async () => {
    const code = `T${randomUUID().slice(0, 6).toUpperCase()}`;
    await db.coupon.create({ data: { code, type: "PERCENT", value: 10, minSubtotal: 50_000 } });
    const product = await makeProduct([10], 30_000);
    const user = await makeUser();
    const owner = { userId: user.id };
    await addItem(owner, product.variants[0]!.id, 1);

    await expect(applyCoupon(owner, code.toLowerCase())).rejects.toMatchObject({ reason: "MIN_SUBTOTAL", details: { missing: 20_000 } });
    await expect(applyCoupon(owner, "YOKBOYLEKOD")).rejects.toBeInstanceOf(CouponError);

    await addItem(owner, product.variants[0]!.id, 2); // 900 ₺
    expect(await applyCoupon(owner, code.toLowerCase())).toEqual({ code, discount: 9_000 });

    const cart = await db.cart.findUniqueOrThrow({ where: { userId: user.id } });
    const order = await createOrderFromCart(user, { cartId: cart.id, address, locale: "tr", provider: "DEMO" });
    expect(order).toMatchObject({ status: "PENDING", subtotal: 90_000, discount: 9_000, shippingFee: 0, total: 81_000, couponCode: code });
    // Stock is untouched until the payment is confirmed.
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0]!.id } })).stock).toBe(10);
  });
});
