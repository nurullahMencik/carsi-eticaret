import { z } from "zod";
import { parseLiraToKurus } from "@/lib/domain/money";

/**
 * Validation messages are i18n keys under `validation.*` in the dictionaries,
 * so the same schema produces Turkish or English messages in the UI.
 */
export const req = (max = 200) => z.string().trim().min(1, "required").max(max, "tooLong");

export const emailField = z.string().trim().toLowerCase().min(1, "required").max(254, "tooLong").email("email");

/** Turkish mobile/landline: 10 digits after an optional +90 / 0 prefix. */
export const phoneField = z
  .string()
  .trim()
  .min(1, "required")
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^(\+90|0)?[2-5]\d{9}$/.test(v), "phone");

export const postalCodeField = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{5}$/.test(v), "postalCode")
  .optional();

/** Lira amount from a form (number, "1234.5", "1.234,50") -> integer kuruş. */
export const liraToKurus = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const kurus = parseLiraToKurus(v);
  if (!Number.isFinite(kurus)) {
    ctx.addIssue({ code: "custom", message: "number" });
    return z.NEVER;
  }
  return kurus;
});

export const slugField = z
  .string()
  .trim()
  .min(2, "required")
  .max(80, "tooLong")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug");

export const idField = z.string().trim().min(1, "required").max(64, "tooLong");

export type FieldErrors = Record<string, string>;

/** Flattens a Zod error into { "variants.0.sku": "required" }. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
