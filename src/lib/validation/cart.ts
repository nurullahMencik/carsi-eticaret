import { z } from "zod";
import { idField } from "./common";

export const MAX_LINE_QUANTITY = 20;

export const addToCartSchema = z.object({
  variantId: idField,
  quantity: z.coerce.number().int("integer").min(1, "quantityMin").max(MAX_LINE_QUANTITY, "quantityMax"),
});

export const updateCartItemSchema = z.object({
  itemId: idField,
  quantity: z.coerce.number().int("integer").min(0, "quantityMin").max(MAX_LINE_QUANTITY, "quantityMax"),
});

export const couponCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "couponFormat")
    .max(24, "couponFormat")
    .regex(/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]+$/, "couponFormat"),
});
