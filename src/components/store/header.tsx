import Link from "next/link";
import { cookies } from "next/headers";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { getActor } from "@/lib/auth/session";
import { can } from "@/lib/domain/roles";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { cartItemCount } from "@/lib/services/cart";
import { currentCartOwner } from "@/lib/services/cart-context";
import { listCategories } from "@/lib/services/catalog";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import { LocaleSwitch } from "./locale-switch";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const { dict, locale } = await getI18n();
  const [actor, owner, categories] = await Promise.all([getActor(), currentCartOwner(), listCategories(locale)]);
  const count = await cartItemCount(owner);
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const iconLink = "relative inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-2";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/92 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <p className="bg-ink px-4 py-2 text-center text-xs text-canvas sm:text-[0.8rem] dark:bg-surface-2 dark:text-ink">{dict.header.announcement}</p>
      <div className="container-page flex h-16 items-center gap-3">
        <MobileNav
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          isSignedIn={Boolean(actor)}
          isStaff={can(actor?.role, "admin:access")}
        />
        <Logo />
        <nav aria-label={dict.common.categories} className="ml-4 hidden xl:block">
          <ul className="flex items-center text-[0.9rem]">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/urunler?kategori=${c.slug}`} className="rounded-full px-2.5 py-2 whitespace-nowrap text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <form action="/urunler" role="search" className="relative mr-1 hidden md:block">
            <label htmlFor="header-search" className="sr-only">
              {dict.common.search}
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder={dict.common.searchPlaceholder}
              className="h-10 w-56 rounded-full border border-line bg-surface pr-3 pl-9 text-sm placeholder:text-ink-2 focus:border-teal focus:outline-none xl:w-44 2xl:w-56"
            />
          </form>
          <LocaleSwitch />
          <ThemeToggle initial={isTheme(themeCookie) ? themeCookie : "system"} />
          {can(actor?.role, "admin:access") ? (
            <Link href="/admin" className="hidden rounded-full px-3 py-2 text-sm font-medium text-teal hover:bg-teal-soft sm:inline-flex">
              {dict.common.admin}
            </Link>
          ) : null}
          <Link href={actor ? "/hesabim" : "/giris"} className={iconLink} aria-label={actor ? dict.common.account : dict.common.login}>
            <UserRound aria-hidden className="size-[1.2rem]" />
          </Link>
          <Link href="/sepet" className={iconLink} aria-label={fmt(dict.header.cartWithCount, { count })} data-testid="cart-link">
            <ShoppingBag aria-hidden className="size-[1.2rem]" />
            {count > 0 ? (
              <span
                className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.7rem] leading-5 font-bold text-accent-ink num"
                data-testid="cart-count"
              >
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
