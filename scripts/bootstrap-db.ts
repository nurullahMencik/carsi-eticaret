/**
 * Container start-up: seeds the demo data when the database is empty
 * (a fresh SQLite file after `prisma migrate deploy`). Run with `tsx`.
 */
import { createPrismaClient } from "../src/lib/db";
import { seed } from "../prisma/seed";

const db = createPrismaClient();

async function main() {
  const products = await db.product.count();
  if (products > 0 && process.env.FORCE_SEED !== "true") {
    console.log(`[bootstrap] database already has ${products} products, skipping seed`);
    return;
  }
  console.log("[bootstrap] empty database, seeding demo data…");
  await seed(db);
}

main()
  .catch((error) => {
    console.error("[bootstrap] failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
