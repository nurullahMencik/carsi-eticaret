"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

export function MobileNav({ categories, isSignedIn, isStaff }: { categories: { slug: string; name: string }[]; isSignedIn: boolean; isStaff: boolean }) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close when navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const linkClass = "block rounded-xl px-3 py-3 text-base text-ink hover:bg-surface-2";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-2 xl:hidden"
        aria-label={dict.header.openMenu}
        aria-expanded={open}
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(22rem,88vw)] max-w-none bg-canvas p-0 text-ink backdrop:bg-black/40"
        aria-label={dict.common.menu}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-display text-xl">{dict.common.menu}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2"
            aria-label={dict.common.close}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <nav className="space-y-6 px-3 py-4" aria-label={dict.common.menu}>
          <form action="/urunler" role="search" className="px-1">
            <label htmlFor="mobile-search" className="sr-only">
              {dict.common.search}
            </label>
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder={dict.common.searchPlaceholder}
              className="w-full rounded-full border border-line-strong bg-surface px-4 py-2.5 text-sm"
            />
          </form>
          <div>
            <p className="px-3 pb-1 text-xs font-semibold tracking-[0.14em] text-ink-2 uppercase">{dict.common.categories}</p>
            <ul>
              <li>
                <Link href="/urunler" className={linkClass}>
                  {dict.catalog.title}
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/urunler?kategori=${c.slug}`} className={linkClass}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ul className="border-t border-line pt-4">
            <li>
              <Link href={isSignedIn ? "/hesabim" : "/giris"} className={linkClass}>
                {isSignedIn ? dict.common.account : dict.common.login}
              </Link>
            </li>
            {isStaff ? (
              <li>
                <Link href="/admin" className={linkClass}>
                  {dict.common.admin}
                </Link>
              </li>
            ) : null}
            <li>
              <Link href="/sepet" className={linkClass}>
                {dict.common.cart}
              </Link>
            </li>
          </ul>
        </nav>
      </dialog>
    </>
  );
}
