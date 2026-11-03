import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** `npm run screenshots` — README images from the production build (docs/screenshots). */
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: /screenshots\.spec\.ts/,
  retries: 0,
  reporter: "list",
  projects: [{ name: "screenshots", use: { browserName: "chromium", locale: "tr-TR", timezoneId: "Europe/Istanbul" } }],
});
