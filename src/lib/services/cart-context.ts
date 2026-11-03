import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getActor } from "@/lib/auth/session";
import type { CartOwner } from "./cart";

export const CART_COOKIE = "carsi_cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Read-only: the owner of the current cart, or null for a guest without a cart cookie. */
export async function currentCartOwner(): Promise<CartOwner | null> {
  const actor = await getActor();
  if (actor) return { userId: actor.id };
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{20,64}$/.test(token) ? { token } : null;
}

/** For server actions: creates the guest cart cookie when needed. */
export async function ensureCartOwner(): Promise<CartOwner> {
  const existing = await currentCartOwner();
  if (existing) return existing;
  const token = randomBytes(24).toString("base64url");
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return { token };
}

export async function guestCartToken(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function clearGuestCartCookie() {
  (await cookies()).delete(CART_COOKIE);
}
