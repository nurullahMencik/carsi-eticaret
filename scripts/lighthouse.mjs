/**
 * Lighthouse (mobile preset) against a running server.
 *   node scripts/lighthouse.mjs [baseUrl] [path ...]
 * Defaults: http://localhost:5309, "/" and a product page. Reports go to .lighthouse/ (git-ignored).
 * Chrome: CHROME_PATH, or Playwright's Chromium. The DevTools port is LH_PORT (default 55432).
 * Chrome is started directly (not via chrome-launcher, which mangles profile paths on WSL).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const [base = "http://localhost:5309", ...paths] = process.argv.slice(2);
const targets = paths.length ? paths : ["/", "/urun/iznik-desenli-cini-tabak"];
const port = Number(process.env.LH_PORT ?? 55432);
const outDir = path.resolve(".lighthouse");
fs.mkdirSync(outDir, { recursive: true });

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "carsi-lh-"));
const chrome = spawn(
  process.env.CHROME_PATH || chromium.executablePath(),
  ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, "--no-first-run", "about:blank"],
  { stdio: "ignore" },
);

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Chrome did not start");
}

const rows = [];
try {
  await waitForDevtools();
  for (const target of targets) {
    const url = new URL(target, base).toString();
    const result = await lighthouse(url, {
      port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const lhr = result.lhr;
    if (lhr.runtimeError) throw new Error(`${url}: ${lhr.runtimeError.message}`);
    const name = target === "/" ? "home" : target.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    fs.writeFileSync(path.join(outDir, `${name}.json`), result.report);
    const score = (id) => Math.round(lhr.categories[id].score * 100);
    rows.push({
      page: target,
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      lcp: lhr.audits["largest-contentful-paint"].displayValue,
      tbt: lhr.audits["total-blocking-time"].displayValue,
      cls: lhr.audits["cumulative-layout-shift"].displayValue,
    });
  }
} finally {
  chrome.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
  fs.rmSync(userDataDir, { recursive: true, force: true });
}
console.table(rows);
