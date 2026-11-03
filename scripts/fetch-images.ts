/**
 * Fetches the curated Wikimedia Commons photos listed in scripts/image-manifest.json,
 * converts them to WebP under public/images/ and writes src/data/image-credits.json.
 *
 *   npx tsx scripts/fetch-images.ts            # fetch new / changed entries only
 *   npx tsx scripts/fetch-images.ts --force    # re-download everything
 *
 * Idempotent: an image is skipped when its WebP already exists and the previous
 * credits file records the same source file for that path. WebP files that this
 * script created earlier but that are no longer in the manifest are deleted.
 * Fails loudly (non-zero exit) on a missing file or a license outside the allowed set.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "carsi-eticaret-image-fetch/1.0 (nurullahmencik42@gmail.com)";
const THUMB_WIDTH = 1600;
const WEBP_QUALITY = 78;
const DELAY_MS = 400;
const CHANGES = "Resized and converted to WebP";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "scripts", "image-manifest.json");
const CREDITS_PATH = path.join(ROOT, "src", "data", "image-credits.json");
const PUBLIC_DIR = path.join(ROOT, "public");

type Kind = "product" | "category" | "hero";

type ManifestEntry = { file: string; kind: Kind; slug: string; index: number };

type Credit = {
  path: string;
  kind: Kind;
  slug: string;
  width: number;
  height: number;
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  changes: string;
};

type CreditsFile = { generatedAt: string; images: Credit[] };

type ExtValue = { value?: unknown };

type ImageInfo = {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, ExtValue | undefined>;
};

type ApiResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; invalid?: boolean; imageinfo?: ImageInfo[] }[];
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const BOX: Record<Kind, { width: number; height: number }> = {
  product: { width: 1200, height: 1200 },
  category: { width: 1200, height: 1200 },
  hero: { width: 1920, height: 1080 },
};

function publicPath(entry: ManifestEntry): string {
  switch (entry.kind) {
    case "product":
      return `/images/products/${entry.slug}-${entry.index}.webp`;
    case "category":
      return `/images/categories/${entry.slug}.webp`;
    case "hero":
      return `/images/hero/${entry.slug}.webp`;
  }
}

function toDiskPath(webPath: string): string {
  return path.join(PUBLIC_DIR, ...webPath.split("/").filter(Boolean));
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return named[code.toLowerCase()] ?? match;
  });
}

function plainText(html: unknown, max = 120): string {
  if (typeof html !== "string") return "";
  const withoutHidden = html.replace(/<(\w+)[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, "");
  const text = decodeEntities(
    withoutHidden.replace(/<(br|\/p|\/div|\/li|\/td|\/tr)\b[^>]*>/gi, " ").replace(/<[^>]*>/g, ""),
  )
    .replace(/\[\d+\]/g, "")
    .replace(/\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function meta(info: ImageInfo, key: string): string {
  const value = info.extmetadata?.[key]?.value;
  return typeof value === "string" ? value : "";
}

/** Museums whose Commons uploads carry no Artist field, only a link in Credit. */
const INSTITUTIONS: Record<string, string> = {
  "metmuseum.org": "The Metropolitan Museum of Art",
  "clevelandart.org": "Cleveland Museum of Art",
  "aucklandmuseum.com": "Auckland War Memorial Museum",
  "thewalters.org": "Walters Art Museum",
};

function authorOf(info: ImageInfo): string {
  const artist = plainText(meta(info, "Artist"));
  if (artist) return artist;
  const credit = meta(info, "Credit");
  for (const match of credit.matchAll(/href="([^"]+)"/g)) {
    try {
      const host = new URL(match[1] ?? "", "https://commons.wikimedia.org").hostname.replace(/^(www|api)\./, "");
      const name = INSTITUTIONS[host];
      if (name) return name;
    } catch {
      // ignore malformed links
    }
  }
  const text = plainText(credit);
  if (/^https?:\/\/\S+$/.test(text)) return new URL(text).hostname.replace(/^www\./, "");
  return text || "Unknown author";
}

/** CC0, public domain, CC BY and CC BY-SA (any version or port). NC/ND and everything else is rejected. */
function isAllowedLicense(shortName: string): boolean {
  const name = shortName.trim();
  if (!name || /\b(NC|ND)\b/i.test(name)) return false;
  return /^(CC0|CC[ -]BY(-SA)?( \d|$)|Public domain|PD\b|PD-)/i.test(name);
}

function validateManifest(raw: unknown): ManifestEntry[] {
  if (!Array.isArray(raw)) throw new Error("image-manifest.json must be an array");
  const seenFiles = new Set<string>();
  const seenPaths = new Set<string>();
  return raw.map((item: unknown, i) => {
    const e = item as Partial<ManifestEntry>;
    const where = `manifest[${i}]`;
    if (typeof e.file !== "string" || !e.file.startsWith("File:")) throw new Error(`${where}: "file" must start with "File:"`);
    if (e.kind !== "product" && e.kind !== "category" && e.kind !== "hero") throw new Error(`${where}: bad kind ${String(e.kind)}`);
    if (typeof e.slug !== "string" || !/^[a-z0-9-]+$/.test(e.slug)) throw new Error(`${where}: bad slug ${String(e.slug)}`);
    if (typeof e.index !== "number" || !Number.isInteger(e.index) || e.index < 1) throw new Error(`${where}: bad index`);
    const entry: ManifestEntry = { file: e.file, kind: e.kind, slug: e.slug, index: e.index };
    const webPath = publicPath(entry);
    if (seenFiles.has(entry.file)) throw new Error(`${where}: ${entry.file} is used twice`);
    if (seenPaths.has(webPath)) throw new Error(`${where}: output ${webPath} is produced twice`);
    seenFiles.add(entry.file);
    seenPaths.add(webPath);
    return entry;
  });
}

async function fetchWithRetry(url: string, attempts = 5): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= attempts) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt;
    console.warn(`  HTTP ${res.status}, retrying in ${wait} ms`);
    await res.body?.cancel();
    await sleep(wait);
  }
}

/** Looks up imageinfo + extmetadata for all titles (batched, sequential). */
async function fetchInfo(titles: string[]): Promise<Map<string, ImageInfo>> {
  const result = new Map<string, ImageInfo>();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|UsageTerms|Restrictions",
      titles: batch.join("|"),
    });
    const res = await fetchWithRetry(`${API}?${params}`);
    const data = (await res.json()) as ApiResponse;
    const pages = new Map((data.query?.pages ?? []).map((p) => [p.title, p]));
    const alias = new Map<string, string>();
    for (const n of data.query?.normalized ?? []) alias.set(n.from, n.to);
    for (const r of data.query?.redirects ?? []) alias.set(r.from, r.to);
    for (const title of batch) {
      let resolved = title;
      for (let hops = 0; alias.has(resolved) && hops < 3; hops++) resolved = alias.get(resolved) ?? resolved;
      const info = pages.get(resolved)?.imageinfo?.[0];
      if (info) result.set(title, info);
    }
    await sleep(DELAY_MS);
  }
  return result;
}

async function readPreviousCredits(): Promise<CreditsFile | null> {
  if (!existsSync(CREDITS_PATH)) return null;
  try {
    return JSON.parse(await readFile(CREDITS_PATH, "utf8")) as CreditsFile;
  } catch {
    return null;
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const manifest = validateManifest(JSON.parse(await readFile(MANIFEST_PATH, "utf8")));
  const previous = await readPreviousCredits();
  const previousByPath = new Map((previous?.images ?? []).map((c) => [c.path, c]));

  console.log(`Manifest: ${manifest.length} images. Fetching metadata…`);
  const infos = await fetchInfo(manifest.map((e) => e.file));

  // Validate every entry before touching any output.
  const problems: string[] = [];
  for (const entry of manifest) {
    const info = infos.get(entry.file);
    if (!info) {
      problems.push(`${entry.file}: not found on Commons`);
      continue;
    }
    const license = plainText(meta(info, "LicenseShortName"));
    if (!isAllowedLicense(license)) problems.push(`${entry.file}: disallowed license "${license || "unknown"}"`);
    const restrictions = plainText(meta(info, "Restrictions"));
    if (/personality/i.test(restrictions)) problems.push(`${entry.file}: has personality-rights restriction`);
    if (!info.thumburl && !info.url) problems.push(`${entry.file}: no download URL`);
  }
  if (problems.length > 0) {
    throw new Error(`Refusing to continue:\n  - ${problems.join("\n  - ")}`);
  }

  const credits: Credit[] = [];
  let downloaded = 0;
  for (const [i, entry] of manifest.entries()) {
    const info = infos.get(entry.file) as ImageInfo;
    const webPath = publicPath(entry);
    const diskPath = toDiskPath(webPath);
    const title = entry.file.replace(/^File:/, "");
    const prev = previousByPath.get(webPath);
    const label = `[${i + 1}/${manifest.length}] ${webPath}`;

    let width: number;
    let height: number;
    if (!force && prev && prev.title === title && existsSync(diskPath)) {
      const m = await sharp(diskPath).metadata();
      width = m.width ?? prev.width;
      height = m.height ?? prev.height;
      console.log(`${label} up to date`);
    } else {
      const sourceUrl = info.thumburl ?? info.url ?? "";
      const res = await fetchWithRetry(sourceUrl);
      const input = Buffer.from(await res.arrayBuffer());
      const box = BOX[entry.kind];
      await mkdir(path.dirname(diskPath), { recursive: true });
      const out = await sharp(input)
        .rotate()
        .resize({ width: box.width, height: box.height, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
      await writeFile(diskPath, out.data);
      width = out.info.width;
      height = out.info.height;
      downloaded++;
      console.log(`${label} ${width}x${height} ${(out.data.length / 1024).toFixed(0)} KB`);
      await sleep(DELAY_MS);
    }

    const licenseUrl = meta(info, "LicenseUrl").trim();
    const author = authorOf(info);
    credits.push({
      path: webPath,
      kind: entry.kind,
      slug: entry.slug,
      width,
      height,
      title,
      author,
      license: plainText(meta(info, "LicenseShortName")),
      licenseUrl: licenseUrl ? licenseUrl.replace(/^http:\/\//, "https://") : null,
      sourceUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(entry.file.replace(/ /g, "_"))}`,
      changes: CHANGES,
    });
  }

  // Remove outputs this script produced earlier that are no longer in the manifest.
  const current = new Set(credits.map((c) => c.path));
  for (const old of previous?.images ?? []) {
    if (current.has(old.path)) continue;
    const disk = toDiskPath(old.path);
    if (existsSync(disk)) {
      await unlink(disk);
      console.log(`removed stale ${old.path}`);
    }
  }

  const unchanged = previous !== null && downloaded === 0 && JSON.stringify(previous.images) === JSON.stringify(credits);
  const file: CreditsFile = {
    generatedAt: unchanged ? previous.generatedAt : new Date().toISOString(),
    images: credits,
  };
  await mkdir(path.dirname(CREDITS_PATH), { recursive: true });
  await writeFile(CREDITS_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`Done: ${credits.length} images (${downloaded} downloaded). Credits: ${path.relative(ROOT, CREDITS_PATH)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
