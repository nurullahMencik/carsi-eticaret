import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { listCategories } from "@/lib/services/catalog";
import { Logo } from "./logo";

export async function Footer() {
  const { dict, locale } = await getI18n();
  const categories = await listCategories(locale);
  const linkClass = "text-ink-2 hover:text-ink hover:underline underline-offset-4";
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-ink-2">{dict.footer.about}</p>
          <p className="text-xs text-ink-2">{dict.footer.paymentNote}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{dict.footer.shop}</h2>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/urunler?kategori=${c.slug}`} className={linkClass}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{dict.footer.help}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/hesabim" className={linkClass}>
                {dict.common.account}
              </Link>
            </li>
            <li>
              <Link href="/sepet" className={linkClass}>
                {dict.common.cart}
              </Link>
            </li>
            <li>
              <Link href="/gorsel-kaynaklari" className={linkClass}>
                {dict.footer.credits}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Çarşı · {dict.footer.madeBy}
          </p>
          <p>{dict.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
