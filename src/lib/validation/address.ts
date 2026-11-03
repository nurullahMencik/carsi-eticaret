import { z } from "zod";
import { phoneField, postalCodeField, req } from "./common";

export const addressSchema = z.object({
  title: req(40),
  fullName: req(80),
  phone: phoneField,
  city: req(40),
  district: req(60),
  line: z.string().trim().min(10, "addressTooShort").max(250, "tooLong"),
  postalCode: postalCodeField,
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

export const checkoutSchema = z
  .object({
    addressId: z.string().optional(),
    newAddress: addressSchema.optional(),
    saveAddress: z.boolean().optional(),
    note: z.string().trim().max(300, "tooLong").optional(),
  })
  .refine((v) => Boolean(v.addressId) || Boolean(v.newAddress), { message: "addressRequired", path: ["addressId"] });
export type CheckoutInput = z.input<typeof checkoutSchema>;
