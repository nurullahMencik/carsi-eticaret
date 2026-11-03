import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/store/auth-forms";
import { getActor } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { safeCallbackUrl } from "@/lib/validation/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.meta.registerTitle, robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { dict } = await getI18n();
  const { callbackUrl } = await searchParams;
  if (await getActor()) redirect("/hesabim");
  return (
    <div className="container-page max-w-lg pt-12">
      <h1 className="font-display text-4xl">{dict.auth.registerTitle}</h1>
      <p className="mt-2 mb-8 text-ink-2">{dict.auth.registerText}</p>
      <RegisterForm callbackUrl={callbackUrl ? safeCallbackUrl(callbackUrl) : undefined} />
    </div>
  );
}
