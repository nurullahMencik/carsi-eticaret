import { z } from "zod";
import { emailField, req } from "./common";

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "required").max(200, "tooLong"),
  callbackUrl: z.string().optional(),
});
export type LoginInput = z.input<typeof loginSchema>;

export const passwordField = z
  .string()
  .min(8, "passwordWeak")
  .max(128, "tooLong")
  .refine((v) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(v) && /\d/.test(v), "passwordWeak");

export const registerSchema = z
  .object({
    name: req(80),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "passwordMismatch", path: ["confirmPassword"] });
export type RegisterInput = z.input<typeof registerSchema>;

/** Only same-site relative paths are accepted as post-login redirects. */
export function safeCallbackUrl(value: string | null | undefined, fallback = "/hesabim"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
