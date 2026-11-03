import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/store/auth-forms";
import { getActor } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { safeCallbackUrl } from "@/lib/validation/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.meta.loginTitle, robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { dict } = await getI18n();
  const { callbackUrl } = await searchParams;
  const safe = callbackUrl ? safeCallbackUrl(callbackUrl) : undefined;
  const actor = await getActor();
  if (actor) redirect(safe ?? (actor.role === "CUSTOMER" ? "/hesabim" : "/admin"));
  return (
    <div className="container-page max-w-lg pt-12">
      <h1 className="font-display text-4xl">{dict.auth.loginTitle}</h1>
      <p className="mt-2 mb-8 text-ink-2">{dict.auth.loginText}</p>
      <LoginForm callbackUrl={safe} demoEnabled={demoLoginEnabled()} />
    </div>
  );
}
