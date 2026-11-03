import { expect, type Page } from "@playwright/test";

export async function demoLogin(page: Page, account: "customer" | "admin" | "staff", callbackUrl?: string) {
  await page.goto(callbackUrl ? `/giris?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/giris");
  await page.getByTestId(`demo-login-${account}`).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/giris"));
}

export async function addToCart(page: Page, slug: string) {
  await page.goto(`/urun/${slug}`);
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByText("Sepete eklendi")).toBeVisible();
}

/** Checkout with the default saved address; returns the order number shown on the payment page. */
export async function startCheckout(page: Page) {
  await page.goto("/odeme");
  await page.getByTestId("place-order").click();
  await page.waitForURL(/\/odeme\/CRS-/);
  return (await page.getByTestId("order-number").innerText()).trim();
}

export async function payWithTestCard(page: Page, cardNumber: string) {
  await page.getByTestId(`use-card-${cardNumber}`).click();
  await page.getByTestId("pay-button").click();
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
