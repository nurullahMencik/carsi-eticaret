import { z } from "zod";
import { COUPON_TYPES, normalizeCouponCode } from "@/lib/domain/coupon";
import { liraToKurus } from "./common";

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "date" });
      return z.NEVER;
    }
    return d;
  });

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform(normalizeCouponCode)
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,24}$/, "couponFormat")),
    type: z.enum(COUPON_TYPES),
    /** Percent for PERCENT, lira for FIXED (converted to kuruş below). */
    value: z.coerce.number().positive("positive"),
    minSubtotal: liraToKurus.default(0),
    maxDiscount: z
      .union([liraToKurus, z.literal(""), z.null()])
      .optional()
      .transform((v) => (typeof v === "number" && v > 0 ? v : null)),
    startsAt: optionalDate,
    endsAt: optionalDate,
    usageLimit: z
      .union([z.literal(""), z.null(), z.coerce.number().int("integer").positive("positive")])
      .optional()
      .transform((v) => (typeof v === "number" ? v : null)),
    isActive: z.boolean().default(true),
    descriptionTr: z.string().trim().max(200, "tooLong").default(""),
    descriptionEn: z.string().trim().max(200, "tooLong").default(""),
  })
  .superRefine((v, ctx) => {
    if (v.type === "PERCENT" && (v.value < 1 || v.value > 100 || !Number.isInteger(v.value))) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "percentRange" });
    }
    if (v.minSubtotal < 0) ctx.addIssue({ code: "custom", path: ["minSubtotal"], message: "nonNegative" });
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "dateRange" });
    }
  })
  .transform((v) => ({ ...v, value: v.type === "FIXED" ? Math.round(v.value * 100) : v.value }));
export type CouponFormInput = z.input<typeof couponSchema>;
