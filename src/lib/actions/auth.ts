"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { db, isUniqueViolation } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_ACCOUNTS, demoLoginEnabled, type DemoAccount } from "@/lib/env";
import { mergeGuestCart } from "@/lib/services/cart";
import { clearGuestCartCookie, guestCartToken } from "@/lib/services/cart-context";
import { loginSchema, registerSchema, safeCallbackUrl, type LoginInput, type RegisterInput } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/common";
import type { ActionResult } from "./result";

async function signInAndMerge(email: string, password: string): Promise<{ role: string } | null> {
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) return null;
  const token = await guestCartToken();
  if (token) {
    await mergeGuestCart(token, user.id);
    await clearGuestCartCookie();
  }
  return { role: user.role };
}

function landing(role: string, callbackUrl: string | undefined) {
  return safeCallbackUrl(callbackUrl, role === "CUSTOMER" ? "/hesabim" : "/admin");
}

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  const user = await signInAndMerge(parsed.data.email, parsed.data.password);
  if (!user) return { ok: false, error: "INVALID_CREDENTIALS" };
  redirect(landing(user.role, parsed.data.callbackUrl));
}

export async function demoLoginAction(account: DemoAccount, callbackUrl?: string): Promise<ActionResult> {
  if (!demoLoginEnabled() || !(account in DEMO_ACCOUNTS)) return { ok: false, error: "FORBIDDEN" };
  const { email, password } = DEMO_ACCOUNTS[account];
  const user = await signInAndMerge(email, password);
  if (!user) return { ok: false, error: "INVALID_CREDENTIALS" };
  redirect(landing(user.role, callbackUrl));
}

export async function registerAction(input: RegisterInput & { callbackUrl?: string }): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(parsed.error) };
  try {
    await db.user.create({
      data: { email: parsed.data.email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "CUSTOMER" },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "EMAIL_TAKEN", fieldErrors: { email: "emailTaken" } };
    throw error;
  }
  const user = await signInAndMerge(parsed.data.email, parsed.data.password);
  if (!user) return { ok: false, error: "UNKNOWN" };
  redirect(landing(user.role, input.callbackUrl));
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
