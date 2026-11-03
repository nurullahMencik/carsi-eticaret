import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import { addToCart, demoLogin } from "./helpers";

const DIR = "docs/screenshots";
const DESKTOP = { width: 1600, height: 1000 };

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

test.describe.configure({ mode: "serial" });

test("storefront", async ({ browser }) => {
  const context = await browser.newContext({ viewport: DESKTOP, colorScheme: "light", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.goto("/");
  await settle(page);
  await page.screenshot({ path: `${DIR}/01-hero.png` });

  await page.goto("/urun/iznik-desenli-cini-tabak");
  await settle(page);
  await page.screenshot({ path: `${DIR}/02-product.png` });

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto("/");
  await settle(page);
  // OpenGraph previews: a compact JPEG.
  await sharp(await page.screenshot()).jpeg({ quality: 82, mozjpeg: true }).toFile("public/og.jpg");
  await context.close();
});

test("checkout payment step", async ({ browser }) => {
  const context = await browser.newContext({ viewport: DESKTOP, colorScheme: "light", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await demoLogin(page, "customer");
  await addToCart(page, "mozaik-cam-masa-lambasi");
  await addToCart(page, "pamuklu-pestemal");
  await page.goto("/odeme");
  await page.getByTestId("place-order").click();
  await page.waitForURL(/\/odeme\/CRS-/);
  await page.getByTestId("use-card-5528790000000008").click();
  await settle(page);
  await page.screenshot({ path: `${DIR}/03-checkout.png` });
  await context.close();
});

test("admin", async ({ browser }) => {
  const context = await browser.newContext({ viewport: DESKTOP, colorScheme: "light", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await demoLogin(page, "admin");
  await page.goto("/admin");
  await expect(page.locator(".recharts-surface")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${DIR}/04-admin-dashboard.png` });

  await page.goto("/admin/siparisler");
  await settle(page);
  await page.screenshot({ path: `${DIR}/05-admin-orders.png` });

  await page.goto("/admin/siparisler?durum=SHIPPED");
  await page.getByTestId("admin-order-link").first().click();
  await settle(page);
  await page.screenshot({ path: `${DIR}/06-admin-order-detail.png` });
  await context.close();
});

test("mobile", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.goto("/urun/dovme-bakir-cezve");
  await settle(page);
  await page.screenshot({ path: `${DIR}/07-mobile.png` });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/urunler?kategori=aydinlatma");
  await settle(page);
  await page.screenshot({ path: `${DIR}/08-mobile-dark.png` });
  await context.close();
});
