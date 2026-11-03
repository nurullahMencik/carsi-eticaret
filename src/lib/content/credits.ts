import "server-only";
import fs from "node:fs";
import path from "node:path";

export type ImageCredit = {
  path: string;
  kind: "product" | "category" | "hero" | string;
  slug: string;
  width: number;
  height: number;
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  changes?: string;
};

let cache: ImageCredit[] | null = null;

/** Attribution data written by scripts/fetch-images.ts (src/data/image-credits.json). */
export function getImageCredits(): ImageCredit[] {
  if (cache) return cache;
  try {
    const file = path.join(process.cwd(), "src/data/image-credits.json");
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as { images?: ImageCredit[] };
    cache = (json.images ?? []).filter((c) => fs.existsSync(path.join(process.cwd(), "public", c.path)));
  } catch {
    cache = [];
  }
  return cache;
}

export function heroImage(index = 1): ImageCredit | null {
  return getImageCredits().find((c) => c.kind === "hero" && c.slug === `hero-${index}`) ?? null;
}
