import { describe, expect, it } from "vitest";
import { evaluateCoupon, normalizeCouponCode, type CouponRule } from "@/lib/domain/coupon";
import { allocateDiscount, calculateTotals } from "@/lib/domain/pricing";
import { calculateShipping, FLAT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, remainingForFreeShipping } from "@/lib/domain/shipping";

const NOW = new Date("2026-11-03T12:00:00Z");
const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: "TEST",
  type: "PERCENT",
  value: 10,
  minSubtotal: 0,
  maxDiscount: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usedCount: 0,
  isActive: true,
  ...over,
});

describe("shipping rule: 750 ₺ and above is free", () => {
  it("charges the flat fee below the threshold", () => {
    expect(calculateShipping(FREE_SHIPPING_THRESHOLD - 1, 1)).toBe(FLAT_SHIPPING_FEE);
    expect(remainingForFreeShipping(70000)).toBe(5000);
  });
  it("is free at exactly the threshold and above", () => {
    expect(calculateShipping(75000, 1)).toBe(0);
    expect(calculateShipping(250000, 3)).toBe(0);
    expect(remainingForFreeShipping(80000)).toBe(0);
  });
  it("is zero for an empty cart", () => {
    expect(calculateShipping(0, 0)).toBe(0);
  });
  it("uses the merchandise total *after* discounts", () => {
    // 800 ₺ cart with 10% off = 720 ₺ -> shipping is charged again.
    const totals = calculateTotals([{ unitPrice: 80000, quantity: 1, vatRate: 20 }], coupon(), NOW);
    expect(totals.discount).toBe(8000);
    expect(totals.shippingFee).toBe(FLAT_SHIPPING_FEE);
    expect(totals.total).toBe(72000 + FLAT_SHIPPING_FEE);
  });
});

describe("coupons", () => {
  it("applies percentage discounts, floored to the kuruş", () => {
    expect(evaluateCoupon(coupon({ value: 15 }), 33333, NOW)).toEqual({ ok: true, discount: 4999, code: "TEST" });
  });
  it("caps percentage discounts at maxDiscount", () => {
    expect(evaluateCoupon(coupon({ value: 10, maxDiscount: 50000 }), 900000, NOW)).toMatchObject({ ok: true, discount: 50000 });
  });
  it("applies fixed discounts but never more than the subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 15000 }), 160000, NOW)).toMatchObject({ ok: true, discount: 15000 });
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 15000 }), 10000, NOW)).toMatchObject({ ok: true, discount: 10000 });
  });
  it("enforces the minimum subtotal and reports what is missing", () => {
    expect(evaluateCoupon(coupon({ minSubtotal: 25000 }), 20000, NOW)).toEqual({ ok: false, reason: "MIN_SUBTOTAL", minSubtotal: 25000, missing: 5000, code: "TEST" });
    expect(evaluateCoupon(coupon({ minSubtotal: 25000 }), 25000, NOW).ok).toBe(true);
  });
  it("enforces validity dates, active flag and usage limit", () => {
    expect(evaluateCoupon(coupon({ endsAt: new Date("2026-11-01T00:00:00Z") }), 50000, NOW)).toMatchObject({ ok: false, reason: "EXPIRED" });
    expect(evaluateCoupon(coupon({ startsAt: new Date("2026-12-01T00:00:00Z") }), 50000, NOW)).toMatchObject({ ok: false, reason: "NOT_STARTED" });
    expect(evaluateCoupon(coupon({ isActive: false }), 50000, NOW)).toMatchObject({ ok: false, reason: "INACTIVE" });
    expect(evaluateCoupon(coupon({ usageLimit: 3, usedCount: 3 }), 50000, NOW)).toMatchObject({ ok: false, reason: "USAGE_LIMIT" });
    expect(evaluateCoupon(coupon(), 0, NOW)).toMatchObject({ ok: false, reason: "EMPTY_CART" });
  });
  it("normalises codes (case, spaces, Turkish i)", () => {
    expect(normalizeCouponCode(" hosgeldin10 ")).toBe("HOSGELDIN10");
    expect(normalizeCouponCode("Hoşgeldin10")).toBe("HOSGELDIN10");
    expect(normalizeCouponCode("HOSGELDİN10")).toBe("HOSGELDIN10");
    expect(normalizeCouponCode("carsi 150")).toBe("CARSI150");
  });
});

describe("cart totals", () => {
  const lines = [
    { unitPrice: 45000, quantity: 2, vatRate: 20 }, // 900 ₺ ceramics
    { unitPrice: 39000, quantity: 1, vatRate: 10 }, // 390 ₺ textile
  ];

  it("sums lines, counts items and adds free shipping above the threshold", () => {
    const t = calculateTotals(lines, null, NOW);
    expect(t.subtotal).toBe(129000);
    expect(t.itemCount).toBe(3);
    expect(t.discount).toBe(0);
    expect(t.shippingFee).toBe(0);
    expect(t.total).toBe(129000);
    expect(t.vatTotal).toBe(15000 + 3545);
    expect(t.freeShippingRemaining).toBe(0);
  });

  it("applies a coupon, splits the discount for VAT and keeps totals consistent", () => {
    const t = calculateTotals(lines, coupon({ type: "FIXED", value: 12900 }), NOW);
    expect(t.discount).toBe(12900);
    expect(t.total).toBe(129000 - 12900);
    // Discount is shared 90000:39000 -> 9000 + 3900; VAT on 81000@20% + 35100@10%.
    expect(t.vatTotal).toBe(13500 + 3191);
  });

  it("adds VAT on the shipping fee to the VAT total", () => {
    const t = calculateTotals([{ unitPrice: 39000, quantity: 1, vatRate: 10 }], null, NOW);
    expect(t.shippingFee).toBe(FLAT_SHIPPING_FEE);
    expect(t.vatTotal).toBe(3545 + Math.round((FLAT_SHIPPING_FEE * 20) / 120));
    expect(t.freeShippingRemaining).toBe(75000 - 39000);
  });

  it("ignores an invalid coupon but reports why", () => {
    const t = calculateTotals(lines, coupon({ minSubtotal: 500000 }), NOW);
    expect(t.discount).toBe(0);
    expect(t.coupon).toMatchObject({ ok: false, reason: "MIN_SUBTOTAL" });
  });

  it("returns zeros for an empty cart", () => {
    expect(calculateTotals([], null, NOW)).toMatchObject({ subtotal: 0, total: 0, shippingFee: 0, vatTotal: 0, itemCount: 0, freeShippingRemaining: 0 });
  });
});

describe("allocateDiscount", () => {
  it("splits proportionally and always adds up exactly", () => {
    const shares = allocateDiscount([33333, 33333, 33334], 10001);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10001);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
  });
  it("never gives a line more than its own total", () => {
    const shares = allocateDiscount([100, 5], 105);
    expect(shares).toEqual([100, 5]);
  });
  it("returns zeros when there is nothing to allocate", () => {
    expect(allocateDiscount([100, 200], 0)).toEqual([0, 0]);
  });
});
