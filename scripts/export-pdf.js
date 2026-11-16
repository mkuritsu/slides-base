// Export the built deck (dist/presentation/) to PDF.
//
// Serves dist/presentation/ with the Vite+ preview server, opens it in Chrome with puppeteer in the
// print mode of reveal.js (?print-pdf), and prints it to a PDF with one
// 1280×720 page per slide or per step. Puppeteer downloads its own Chrome on
// install. Set PUPPETEER_EXECUTABLE_PATH to use another Chrome or Chromium.
//
// Usage: vp run pdf [output.pdf], vp run pdf:static, or vp run pdfs, which build
// dist/presentation/ first and run node scripts/export-pdf.js [--static | --all] [output.pdf].
//
// By default every fragment step gets its own page, so the click-by-click
// build of a slide is kept (slides.pdf). With --static, every fragment is
// shown at once, one page per slide (slides-static.pdf). With --all, both are
// written to their default names from one browser.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer";
import { preview } from "vite-plus";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const named = args.find((a) => !a.startsWith("--"));

const jobs = args.includes("--all")
    ? [
          { animated: true, output: "slides.pdf" },
          { animated: false, output: "slides-static.pdf" },
      ]
    : args.includes("--static")
      ? [{ animated: false, output: named ?? "slides-static.pdf" }]
      : [{ animated: true, output: named ?? "slides.pdf" }];

if (!existsSync(resolve(root, "dist/presentation/index.html"))) {
    console.error("dist/presentation/ has no build. Run `vp build` first (vp run pdf does).");
    process.exit(1);
}

const server = await preview({ root, preview: { port: 0, strictPort: false, open: false }, logLevel: "warn" });
const url = server.resolvedUrls.local[0];
// Puppeteer downloads Chrome when it is installed, into ~/.cache/puppeteer.
// That download can be missing, for example when the package manager restored
// puppeteer from its cache without running its install step, or the Chrome
// cache was cleared. Download it then, once, with puppeteer's own CLI.
async function ensureChrome() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) return;
    if (existsSync(await puppeteer.executablePath())) return;
    console.log("Chrome for the PDF export is missing, so puppeteer downloads it now.");
    const cli = resolve(root, "node_modules/puppeteer/lib/puppeteer/node/cli.js");
    execFileSync(process.execPath, [cli, "browsers", "install", "chrome"], { cwd: root, stdio: "inherit" });
}

// Ubuntu 23.10 and later (AppArmor) stop the Chrome that puppeteer downloads
// from starting its sandbox. The page is this deck, served from localhost, so
// on Linux the export falls back to running Chrome without the sandbox.
async function launch() {
    try {
        return await puppeteer.launch();
    } catch (error) {
        if (process.platform !== "linux" || !/sandbox/i.test(String(error))) throw error;
        console.warn("Chrome could not start its sandbox, so it runs without it for this export.");
        return puppeteer.launch({ args: ["--no-sandbox"] });
    }
}

await ensureChrome();
const browser = await launch();

async function print({ animated, output }) {
    const page = await browser.newPage();
    // reveal.js signals with a pdf-ready event once it has laid out the pages.
    await page.evaluateOnNewDocument(() => {
        document.addEventListener("pdf-ready", () => {
            window.__pdfReady = true;
        });
    });
    // reveal.js reads its settings from the query string as well:
    // pdfSeparateFragments picks one page per step or per slide, and margin=0
    // makes each page exactly 1280×720. ?export shows animated drawings whole.
    await page.goto(`${url}?print-pdf&pdfSeparateFragments=${animated}&margin=0&export`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__pdfReady === true, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    const pages = await page.$$eval(".pdf-page", (all) => all.length);
    await page.pdf({
        path: resolve(root, output),
        width: "1280px",
        height: "720px",
        printBackground: true,
        preferCSSPageSize: true,
    });
    await page.close();
    console.log(`Printed ${pages} pages to ${output}`);
}

let status = 0;
try {
    for (const job of jobs) {
        await print(job);
    }
} catch (error) {
    console.error(error);
    status = 1;
} finally {
    await browser.close();
    await server.close();
}
process.exit(status);
