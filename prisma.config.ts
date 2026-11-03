import "dotenv/config";
import { defineConfig } from "prisma/config";

// Local, CI and the Docker image all default to a SQLite file under ./data.
const url = process.env.DATABASE_URL ?? "file:./data/carsi.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
