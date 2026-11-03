import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { LocaleSwitch } from "@/components/store/locale-switch";
import { Logo } from "@/components/store/logo";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { getActor } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";
import { getI18n } from "@/lib/i18n/server";
import { isTheme, THEME_COOKIE } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: { default: dict.meta.adminTitle, template: `%s · ${dict.admin.title}` }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { dict } = await getI18n();
  const actor = await getActor();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const roleLabel = actor ? (dict.actorRole as Record<string, string>)[actor.role] : "";
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <div className="flex items-center gap-2">
            <Logo href="/admin" />
            <span className="rounded bg-teal-soft px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-teal uppercase">{dict.admin.title}</span>
          </div>
          <div className="flex items-center lg:mt-4">
            <LocaleSwitch />
            <ThemeToggle initial={isTheme(themeCookie) ? themeCookie : "system"} />
          </div>
        </div>
        {actor && actor.role !== "CUSTOMER" ? (
          <nav aria-label={dict.admin.title} className="px-3 pb-3 lg:px-4">
            <AdminNav isAdmin={actor.role === "ADMIN"} />
          </nav>
        ) : null}
        <div className="hidden space-y-2 border-t border-line px-5 py-4 text-xs text-ink-2 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          {actor ? <p className="truncate">{`${actor.email} (${roleLabel})`}</p> : null}
          <Link href="/" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft aria-hidden className="size-3.5" />
            {dict.admin.backToStore}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-1.5 hover:text-ink">
              <LogOut aria-hidden className="size-3.5" />
              {dict.common.logout}
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
