// Export the built deck (dist/presentation/) to PDF.
//
// Serves dist/presentation/ with vite preview and prints it with DeckTape in the system
// Chrome. Set CHROME_PATH to use a different Chrome or Chromium binary.
//
// Usage: node scripts/export-pdf.js [--static | --all] [output.pdf]
//
// By default DeckTape prints one page per fragment step, so the
// click-by-click build of a slide is kept (slides.pdf). With --static, every
// fragment is shown at once, one page per slide (slides-static.pdf). With
// --all, both are written to their default names from one preview server.

import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { preview } from "vite";

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

function findChrome() {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }
    const candidates = [
        "google-chrome-stable",
        "google-chrome",
        "chromium",
        "chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    for (const name of candidates) {
        if (name.startsWith("/")) {
            if (existsSync(name)) return name;
            continue;
        }
        try {
            return execFileSync("which", [name], { encoding: "utf8" }).trim();
        } catch {
            // Not installed, try the next one.
        }
    }
    console.error("No Chrome or Chromium found. Set CHROME_PATH to its executable.");
    process.exit(1);
}

if (!existsSync(resolve(root, "dist/presentation/index.html"))) {
    console.error("dist/presentation/ has no build. Run `pnpm build` first (pnpm pdf does).");
    process.exit(1);
}

const chrome = findChrome();
const decktape = createRequire(import.meta.url).resolve("decktape/decktape.js");

const server = await preview({ root, preview: { port: 0, strictPort: false, open: false }, logLevel: "warn" });
const url = server.resolvedUrls.local[0];

// Run decktape asynchronously, since the preview server lives in this process.
function print({ animated, output }) {
    const run = spawn(
        process.execPath,
        [
            decktape,
            "reveal",
            "--size",
            "1280x720",
            "--pause",
            "300",
            ...(animated ? ["--fragments"] : []),
            "--chrome-path",
            chrome,
            // ?export shows animated drawings whole, since decktape takes
            // each page before an animation ends.
            `${url}?export`,
            resolve(root, output),
        ],
        { stdio: "inherit" },
    );
    return new Promise((done) => run.on("close", done));
}

let status = 0;
for (const job of jobs) {
    status = (await print(job)) ?? 1;
    if (status !== 0) break;
}

await server.close();
process.exit(status);
