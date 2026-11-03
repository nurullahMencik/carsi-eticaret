import { defineConfig, devices } from "@playwright/test";

const PORT = 5309;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E tests run against the production build (`npm run build` first) with a freshly
 * seeded SQLite database and the demo payment provider. Tests share one database,
 * so they run serially.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /screenshots\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: [/mobile\.spec\.ts/, /screenshots\.spec\.ts/] },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
  },
});
