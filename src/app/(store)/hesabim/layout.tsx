import Link from "next/link";
import { LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor("/hesabim");
  const { dict } = await getI18n();
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } });
  const tab = "rounded-full px-4 py-2 text-sm hover:bg-surface-2";
  return (
    <div className="container-page pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm text-ink-2">{dict.account.title}</p>
          <h1 className="font-display text-4xl">{fmt(dict.account.welcome, { name: user.name.split(" ")[0]! })}</h1>
        </div>
        <nav aria-label={dict.account.title} className="flex flex-wrap items-center gap-1">
          <Link href="/hesabim" className={tab}>
            {dict.account.orders}
          </Link>
          <Link href="/hesabim/adresler" className={tab}>
            {dict.account.addresses}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={`${tab} inline-flex items-center gap-1.5 text-ink-2`}>
              <LogOut aria-hidden className="size-4" />
              {dict.common.logout}
            </button>
          </form>
        </nav>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
