import { z } from "zod";
import { digitsOnly, expiryValid, luhnValid } from "@/lib/domain/card";

export const demoCardSchema = z.object({
  orderNumber: z.string().trim().min(1, "required"),
  cardHolder: z.string().trim().min(3, "required").max(60, "tooLong"),
  cardNumber: z
    .string()
    .transform(digitsOnly)
    .refine((v) => luhnValid(v), "cardNumber"),
  expiry: z.string().trim().refine((v) => expiryValid(v), "cardExpiry"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "cvc"),
});
export type DemoCardInput = z.input<typeof demoCardSchema>;
