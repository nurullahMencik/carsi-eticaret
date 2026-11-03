import { z } from "zod";
import { idField } from "./common";

export const reviewSchema = z.object({
  productId: idField,
  rating: z.coerce.number().int("integer").min(1, "rating").max(5, "rating"),
  title: z.string().trim().max(80, "tooLong").optional(),
  body: z.string().trim().min(10, "reviewTooShort").max(1000, "tooLong"),
});
export type ReviewInput = z.input<typeof reviewSchema>;
