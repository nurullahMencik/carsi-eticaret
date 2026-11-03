export const COUPON_TYPES = ["PERCENT", "FIXED"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export type CouponRule = {
  code: string;
  type: CouponType | string;
  /** Percent (1-100) for PERCENT, kuruş for FIXED. */
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
};

export type CouponRejection =
  | { reason: "INACTIVE" }
  | { reason: "NOT_STARTED"; startsAt: Date }
  | { reason: "EXPIRED"; endsAt: Date }
  | { reason: "USAGE_LIMIT" }
  | { reason: "MIN_SUBTOTAL"; minSubtotal: number; missing: number }
  | { reason: "EMPTY_CART" };

export type CouponEvaluation = ({ ok: true; discount: number } | ({ ok: false } & CouponRejection)) & {
  code: string;
};

const TR_TO_ASCII: Record<string, string> = { ç: "C", Ç: "C", ğ: "G", Ğ: "G", ı: "I", İ: "I", ö: "O", Ö: "O", ş: "S", Ş: "S", ü: "U", Ü: "U" };

/**
 * Codes are stored as ASCII upper case. Turkish letters are folded first, so "hoşgeldin10",
 * "HOSGELDİN10" and "hosgeldin10" all match "HOSGELDIN10" (a tr-TR upper-casing would turn
 * "i" into "İ" and never match).
 */
export function normalizeCouponCode(code: string): string {
  return code
    .trim()
    .replace(/\s+/g, "")
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_TO_ASCII[ch] ?? ch)
    .toUpperCase();
}

/** Validates a coupon against a VAT-inclusive merchandise subtotal and computes the discount. */
export function evaluateCoupon(coupon: CouponRule, subtotal: number, now: Date = new Date()): CouponEvaluation {
  const code = coupon.code;
  if (!coupon.isActive) return { ok: false, reason: "INACTIVE", code };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "NOT_STARTED", startsAt: coupon.startsAt, code };
  if (coupon.endsAt && now > coupon.endsAt) return { ok: false, reason: "EXPIRED", endsAt: coupon.endsAt, code };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: "USAGE_LIMIT", code };
  if (subtotal <= 0) return { ok: false, reason: "EMPTY_CART", code };
  if (subtotal < coupon.minSubtotal) {
    return { ok: false, reason: "MIN_SUBTOTAL", minSubtotal: coupon.minSubtotal, missing: coupon.minSubtotal - subtotal, code };
  }

  let discount: number;
  if (coupon.type === "PERCENT") {
    const pct = Math.min(Math.max(coupon.value, 0), 100);
    discount = Math.floor((subtotal * pct) / 100);
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }
  discount = Math.max(0, Math.min(discount, subtotal));
  return { ok: true, discount, code };
}
