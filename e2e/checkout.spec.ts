import { expect, test } from "@playwright/test";
import { addToCart, demoLogin, payWithTestCard, startCheckout } from "./helpers";

test("guest cart → sign in → coupon → successful payment → order is visible", async ({ page }) => {
  // Guest adds a product; the cart lives in a cookie.
  await addToCart(page, "sirli-el-yapimi-kupa");
  await page.goto("/sepet");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  // Checking out as a guest asks for sign-in; the guest cart is merged into the account.
  await page.getByTestId("checkout-button").click();
  await expect(page).toHaveURL(/\/giris\?callbackUrl=(%2F|\/)odeme$/);
  await page.getByTestId("demo-login-customer").click();
  await page.waitForURL((url) => url.pathname === "/odeme");

  await page.goto("/sepet");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("cart-line").getByText("Sırlı El Yapımı Kupa")).toBeVisible();

  // Coupon (typed in lower case on purpose: HOSGELDIN10 → 10% off).
  await page.getByLabel("İndirim kodu").fill("hosgeldin10");
  await page.getByRole("button", { name: "Uygula" }).click();
  await expect(page.getByText("HOSGELDIN10 kodu uygulandı")).toBeVisible();
  await expect(page.getByTestId("summary-discount")).toHaveText("−₺45,00");
  await expect(page.getByTestId("summary-shipping")).toHaveText("₺79,90");
  await expect(page.getByTestId("summary-total")).toHaveText("₺484,90");

  // Address (saved default) → payment with a successful test card.
  await page.getByTestId("checkout-button").click();
  const orderNumber = await startCheckout(page);
  await expect(page.getByText("₺484,90").first()).toBeVisible();
  await payWithTestCard(page, "5528790000000008");
  await page.waitForURL(`**/odeme/${orderNumber}/tamamlandi`);
  await expect(page.getByTestId("success-title")).toHaveText("Siparişiniz alındı");
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  // The order shows up in the account with its timeline.
  await page.getByRole("link", { name: "Siparişi görüntüle" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Ödendi");
  await expect(page.getByTestId("order-timeline")).toContainText("Ödendi");
  await page.goto("/hesabim");
  await expect(page.getByTestId("order-row").filter({ hasText: orderNumber })).toContainText("Ödendi");
});

test("a declined card keeps the order unpaid and can be retried", async ({ page }) => {
  await demoLogin(page, "customer");
  await addToCart(page, "pamuklu-pestemal");
  const orderNumber = await startCheckout(page);

  await payWithTestCard(page, "4111111111111129");
  await expect(page.getByTestId("payment-error")).toHaveText("Yetersiz bakiye");
  await expect(page).toHaveURL(new RegExp(`/odeme/${orderNumber}$`));

  await page.goto(`/hesabim/siparisler/${orderNumber}`);
  await expect(page.getByTestId("order-status")).toHaveText("Ödeme bekleniyor");

  // Retry with a working card.
  await page.getByRole("link", { name: "Ödemeyi tamamla" }).click();
  await payWithTestCard(page, "4766620000000001");
  await page.waitForURL(`**/odeme/${orderNumber}/tamamlandi`);
});
