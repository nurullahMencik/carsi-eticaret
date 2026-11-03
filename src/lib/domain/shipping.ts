/** Shipping rule: free at or above the threshold (after discounts), flat fee below it. */

export const FREE_SHIPPING_THRESHOLD = 75_000; // 750,00 ₺
export const FLAT_SHIPPING_FEE = 7_990; // 79,90 ₺

export function calculateShipping(merchandiseAfterDiscount: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return merchandiseAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

/** How much more the customer needs to add to unlock free shipping (0 when already free). */
export function remainingForFreeShipping(merchandiseAfterDiscount: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - merchandiseAfterDiscount);
}
