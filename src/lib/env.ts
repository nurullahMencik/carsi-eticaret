import { randomBytes } from "node:crypto";

/** Used only outside production (local dev, tests, CI) when AUTH_SECRET is not set. */
const DEVELOPMENT_AUTH_SECRET = "carsi-development-secret-not-for-production-use";

let warned = false;

/**
 * Returns the Auth.js secret. In production a missing secret is replaced by a random one
 * (sessions then last until the next restart) and a warning is logged once.
 */
export function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return DEVELOPMENT_AUTH_SECRET;
  const generated = randomBytes(32).toString("base64url");
  process.env.AUTH_SECRET = generated;
  if (!warned) {
    warned = true;
    console.warn(
      "[carsi] AUTH_SECRET is not set; generated a random secret for this process. Sessions will not survive a restart.",
    );
  }
  return generated;
}

/** Public base URL without a trailing slash (sitemap, OpenGraph, payment callbacks, e-mails). */
export function siteUrl(): string {
  const url = process.env.SITE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim() || "http://localhost:5309";
  return url.replace(/\/+$/, "");
}

export function demoLoginEnabled(): boolean {
  return (process.env.DEMO_LOGIN_ENABLED ?? "true").toLowerCase() !== "false";
}

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@carsi.demo", password: "Demo123!" },
  staff: { email: "personel@carsi.demo", password: "Demo123!" },
  customer: { email: "musteri@carsi.demo", password: "Demo123!" },
} as const;
export type DemoAccount = keyof typeof DEMO_ACCOUNTS;
