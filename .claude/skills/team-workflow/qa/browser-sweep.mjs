// Responsive + motion sweep for the portfolio.
// Usage: node browser-sweep.mjs <url> <screenshot-dir>
// Needs playwright-core resolvable from this file's directory and a local Chrome
// (override with CHROME_PATH). Exits non-zero if any viewport fails a check.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const [url = "http://localhost:4173/", outDir = "./shots"] = process.argv.slice(2);
const executablePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "mobile", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "small", viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  { name: "tablet", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  { name: "laptop", viewport: { width: 1280, height: 720 } },
  { name: "short", viewport: { width: 1100, height: 640 } },
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "reduced", viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
  // Night theme: light is the default, so night is set the way a visitor's
  // saved toggle choice would set it.
  { name: "dark", viewport: { width: 1440, height: 900 }, theme: "dark" },
  { name: "dark-mobile", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, theme: "dark" },
];

// Elements allowed to extend past the viewport (marquees, pinned tracks, and
// fixed decorative layers that are oversized on purpose, e.g. the film grain).
const OVERFLOW_ALLOWED = ".marquee, .work__track, .work__curve, .loader, .sky, .grain, .nav__menu, .cursor, .avatar-stage";

const browser = await chromium.launch({ executablePath });
let failed = false;

for (const config of viewports) {
  const { name, theme, ...contextOptions } = config;
  const context = await browser.newContext(contextOptions);
  if (theme) await context.addInitScript((t) => localStorage.setItem("kp-theme", t), theme);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto(url, { waitUntil: "networkidle" });
  const start = Date.now();
  await page.waitForSelector(".loader", { state: "detached", timeout: 10_000 }).catch(() => {
    errors.push("loader never finished");
  });
  const loaderMs = Date.now() - start;
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/${name}-00-top.png` });

  // Top-level page sections only (nested <section>s, e.g. accordion panels, are skipped).
  const sectionIds = await page.$$eval("main > section[id]", (els) => els.map((el) => el.id));
  for (const [index, id] of sectionIds.entries()) {
    await page.evaluate((target) => {
      const el = document.getElementById(target);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
    }, id);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${outDir}/${name}-${String(index + 1).padStart(2, "0")}-${id}.png` });
  }

  // Step through the whole page so every ScrollTrigger fires, then inspect.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1500);

  const overflow = await page.evaluate((allowed) => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => !el.closest(allowed))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.right > width + 1 || rect.left < -1);
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);
    return { pageScrolls: document.documentElement.scrollWidth > width, offenders };
  }, OVERFLOW_ALLOWED);

  // Anything near the bottom that should have revealed but is still hidden.
  const stuckHidden = await page.evaluate(() => {
    const last = [...document.querySelectorAll("main > section[id]")].at(-1);
    if (!last) return 0;
    return [...last.querySelectorAll("[data-reveal], .section-title")].filter((el) => {
      const style = getComputedStyle(el);
      return style.visibility === "hidden" || Number(style.opacity) < 0.9;
    }).length;
  });

  const ok = errors.length === 0 && !overflow.pageScrolls && overflow.offenders.length === 0 && stuckHidden === 0;
  if (!ok) failed = true;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name.padEnd(8)}`,
    JSON.stringify({ loaderMs, overflow, stuckHidden, errors }),
  );
  await context.close();
}

await browser.close();
console.log(`Screenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
