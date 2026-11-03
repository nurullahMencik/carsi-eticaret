/**
 * Starts the production build against a freshly migrated + seeded SQLite database.
 * Used by Playwright's webServer (e2e tests and screenshots). Requires `next build` first.
 */
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";

const port = process.env.PORT ?? "5309";
const file = "data/e2e.db";
const env = {
  ...process.env,
  DATABASE_URL: `file:./${file}`,
  SITE_URL: `http://localhost:${port}`,
  IYZICO_API_KEY: "",
  IYZICO_SECRET_KEY: "",
  RESEND_API_KEY: "",
};

fs.mkdirSync("data", { recursive: true });
for (const suffix of ["", "-journal", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });

const server = spawn("npx", ["next", "start", "--port", port], { stdio: "inherit", env });
const stop = () => server.kill("SIGTERM");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
