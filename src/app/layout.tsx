import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { siteUrl } from "@/lib/env";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { isTheme, THEME_COOKIE } from "@/lib/theme";

const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const instrument = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-instrument", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { dict, locale } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${dict.meta.siteName} · ${dict.meta.tagline}`, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.description,
    applicationName: "Çarşı",
    openGraph: {
      type: "website",
      siteName: "Çarşı",
      locale: locale === "en" ? "en_GB" : "tr_TR",
      title: `${dict.meta.siteName} · ${dict.meta.tagline}`,
      description: dict.meta.description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: dict.meta.siteName }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#14110e" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dict } = await getI18n();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "system";
  return (
    <html lang={locale} data-theme={theme} className={`${fraunces.variable} ${instrument.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas"
        >
          {dict.common.skipToContent}
        </a>
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
