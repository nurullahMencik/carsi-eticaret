import { evaluateCoupon, type CouponEvaluation, type CouponRule } from "./coupon";
import { calculateShipping, remainingForFreeShipping } from "./shipping";
import { SHIPPING_VAT_RATE, vatFromGross } from "./vat";

export type PricedLine = {
  /** VAT-inclusive unit price in kuruş. */
  unitPrice: number;
  quantity: number;
  vatRate: number;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  discount: number;
  coupon: CouponEvaluation | null;
  shippingFee: number;
  total: number;
  vatTotal: number;
  freeShippingRemaining: number;
};

export function lineTotal(line: PricedLine): number {
  return line.unitPrice * line.quantity;
}

/**
 * Splits a discount across lines proportionally to their totals. Rounding leftovers
 * go to the largest lines so the parts always add up exactly to `discount`.
 */
export function allocateDiscount(lineTotals: number[], discount: number): number[] {
  const sum = lineTotals.reduce((a, b) => a + b, 0);
  if (discount <= 0 || sum <= 0) return lineTotals.map(() => 0);
  const capped = Math.min(discount, sum);
  const shares = lineTotals.map((t) => Math.floor((t * capped) / sum));
  let leftover = capped - shares.reduce((a, b) => a + b, 0);
  const order = lineTotals.map((t, i) => [t, i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; leftover > 0; k = (k + 1) % order.length) {
    const idx = order[k]![1];
    if (shares[idx]! < lineTotals[idx]!) {
      shares[idx]! += 1;
      leftover -= 1;
    }
  }
  return shares;
}

/** Computes everything shown in the cart, checkout summary and stored on the order. */
export function calculateTotals(lines: PricedLine[], coupon: CouponRule | null, now: Date = new Date()): CartTotals {
  const totals = lines.map(lineTotal);
  const subtotal = totals.reduce((a, b) => a + b, 0);
  const itemCount = lines.reduce((a, l) => a + l.quantity, 0);

  const evaluation = coupon ? evaluateCoupon(coupon, subtotal, now) : null;
  const discount = evaluation?.ok ? evaluation.discount : 0;

  const merchandise = subtotal - discount;
  const shippingFee = calculateShipping(merchandise, itemCount);

  const shares = allocateDiscount(totals, discount);
  const merchandiseVat = lines.reduce((acc, line, i) => acc + vatFromGross(totals[i]! - shares[i]!, line.vatRate), 0);
  const vatTotal = merchandiseVat + vatFromGross(shippingFee, SHIPPING_VAT_RATE);

  return {
    itemCount,
    subtotal,
    discount,
    coupon: evaluation,
    shippingFee,
    total: merchandise + shippingFee,
    vatTotal,
    freeShippingRemaining: itemCount > 0 ? remainingForFreeShipping(merchandise) : 0,
  };
}
