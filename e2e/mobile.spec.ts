import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("mobile: menu navigation, product page and cart without horizontal scrolling", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalScroll(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Menüyü aç" }).click();
  const menu = page.getByRole("dialog", { name: "Menü" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Kilim & Halı" }).click();
  await expect(page).toHaveURL(/kategori=kilim/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kilim & Halı");
  await expectNoHorizontalScroll(page);

  await page.getByTestId("product-card").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/urun\//);
  await expectNoHorizontalScroll(page);
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByText("Sepete eklendi")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.goto("/sepet");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expectNoHorizontalScroll(page);
});

test("mobile: language switch to English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("From the artisan's hands to your favourite corner");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
