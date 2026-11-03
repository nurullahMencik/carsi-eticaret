/**
 * Warms the next/image cache after start-up so the first visitors after a (cold) restart
 * get already-resized LCP images. Reads the sitemap, fetches each page and requests the
 * mobile-sized candidates of its preloaded (priority) images. Sequential and best-effort.
 *   node scripts/warm-cache.mjs [baseUrl]
 */
const base = (process.argv[2] ?? `http://127.0.0.1:${process.env.PORT ?? 10000}`).replace(/\/$/, "");
const MAX_WIDTH = 1080;

async function waitForHealth() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function preloadImageUrls(html) {
  const urls = new Set();
  for (const tag of html.match(/<link[^>]+rel="preload"[^>]+as="image"[^>]*>/g) ?? []) {
    const srcset = /imageSrcSet="([^"]+)"|imagesrcset="([^"]+)"/i.exec(tag);
    const list = (srcset?.[1] ?? srcset?.[2] ?? "").replace(/&amp;/g, "&");
    for (const candidate of list.split(",")) {
      const [url, width] = candidate.trim().split(/\s+/);
      if (url && Number.parseInt(width ?? "0", 10) <= MAX_WIDTH) urls.add(url);
    }
  }
  return [...urls];
}

async function main() {
  if (!(await waitForHealth())) return console.warn("[warm] server did not become healthy");
  const started = Date.now();
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1].replace(/&amp;/g, "&")).pathname)
    .filter((p, i, all) => all.indexOf(p) === i && (p === "/" || p.startsWith("/urun/")));
  let images = 0;
  for (const page of pages) {
    const html = await (await fetch(base + page)).text();
    for (const url of preloadImageUrls(html)) {
      const res = await fetch(new URL(url, base));
      await res.arrayBuffer();
      images++;
    }
  }
  console.log(`[warm] ${pages.length} pages, ${images} images in ${Math.round((Date.now() - started) / 1000)} s`);
}

main().catch((error) => console.warn("[warm] skipped:", error.message));
