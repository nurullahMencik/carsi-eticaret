import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Fresh SQLite file per run, migrated with the real migrations. */
export default function setup() {
  const file = path.resolve("data/test-integration.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (const suffix of ["", "-journal", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./data/test-integration.db" },
  });
}
