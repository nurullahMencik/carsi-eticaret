import { expect, test } from "@playwright/test";
import { addToCart, demoLogin, payWithTestCard, startCheckout } from "./helpers";

test("admin marks an order as shipped and the customer sees it", async ({ browser }) => {
  const customer = await (await browser.newContext()).newPage();
  await demoLogin(customer, "customer");
  await addToCart(customer, "dovme-bakir-cezve");
  const orderNumber = await startCheckout(customer);
  await payWithTestCard(customer, "5528790000000008");
  await customer.waitForURL("**/tamamlandi");

  const admin = await (await browser.newContext()).newPage();
  await demoLogin(admin, "admin");
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.goto(`/admin/siparisler?q=${orderNumber}`);
  await admin.getByTestId("admin-order-link").filter({ hasText: orderNumber }).click();

  await admin.getByTestId("status-select").selectOption("PREPARING");
  await admin.getByTestId("status-submit").click();
  await expect(admin.getByTestId("order-status")).toHaveText("Hazırlanıyor");

  await admin.getByTestId("status-select").selectOption("SHIPPED");
  await admin.getByLabel("Kargo firması").selectOption("Aras Kargo");
  await admin.getByLabel("Takip numarası").fill("ARS20261103");
  await admin.getByTestId("status-submit").click();
  await expect(admin.getByTestId("order-status")).toHaveText("Kargoda");
  await expect(admin.getByTestId("status-history")).toContainText("Hazırlanıyor → Kargoda");

  await customer.goto(`/hesabim/siparisler/${orderNumber}`);
  await expect(customer.getByTestId("order-status")).toHaveText("Kargoda");
  await expect(customer.getByTestId("tracking")).toContainText("Aras Kargo · Takip no ARS20261103");
});

test("admin adds a product and it appears in the store", async ({ page }) => {
  const name = `Test Kase ${Date.now().toString(36)}`;
  await demoLogin(page, "admin");
  await page.goto("/admin/urunler");
  await page.getByTestId("new-product").click();

  await page.getByLabel("Ad (Türkçe)", { exact: true }).fill(name);
  await page.getByLabel("Ad (İngilizce)", { exact: true }).fill("Test Bowl");
  await page.getByLabel("Ad (Türkçe)", { exact: true }).blur();
  await page.getByLabel("Kategori", { exact: true }).selectOption({ label: "Seramik Sofra" });
  await page.getByLabel("Kısa açıklama (Türkçe)", { exact: true }).fill("El yapımı test kasesi.");
  await page.getByLabel("Kısa açıklama (İngilizce)", { exact: true }).fill("Handmade test bowl.");
  await page.getByLabel("Açıklama (Türkçe)", { exact: true }).fill("Uçtan uca testte yönetim panelinden eklenen örnek ürün.");
  await page.getByLabel("Açıklama (İngilizce)", { exact: true }).fill("A sample product added from the admin panel in an e2e test.");
  await page.getByLabel("Satış fiyatı (₺, KDV dahil)", { exact: true }).fill("275.50");
  await page.getByLabel("Stok kodu", { exact: true }).fill("E2E-KASE-1");
  await page.getByLabel("Stok", { exact: true }).fill("7");
  await page.getByText("Kütüphaneden seç").click();
  await page.getByRole("button", { name: /^Görsel ekle: / }).first().click();
  await page.getByTestId("save-product").click();

  await expect(page.getByText("Ürün oluşturuldu.")).toBeVisible();
  const slug = (await page.getByLabel("Kısa ad (URL)", { exact: true }).inputValue()).trim();
  expect(slug).toMatch(/^test-kase-/);

  await page.goto(`/urun/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByTestId("product-price")).toHaveText("₺275,50");
  await page.goto(`/urunler?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("product-card").filter({ hasText: name })).toHaveCount(1);

  // The change is in the audit log.
  await page.goto("/admin/denetim");
  await expect(page.getByRole("row").filter({ hasText: name }).first()).toContainText("product.create");
});

test("a customer cannot open the admin panel", async ({ page }) => {
  await demoLogin(page, "customer");
  await page.goto("/admin/siparisler");
  await expect(page.getByTestId("forbidden")).toBeVisible();
  await expect(page.getByText("Bu işlem için yetkiniz yok.")).toBeVisible();
});
