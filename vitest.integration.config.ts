import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Integration tests run against a real SQLite database file migrated with `prisma migrate deploy`. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: { DATABASE_URL: "file:./data/test-integration.db", RESEND_API_KEY: "", IYZICO_API_KEY: "", IYZICO_SECRET_KEY: "" },
  },
});
