// Builds everything that the Cloudflare Worker serves into dist/deployment/: the
// public deck, without speaker notes, and its two PDFs next to it, slides.pdf
// (one page per step) and slides-static.pdf (one page per slide).
//
// Usage: node scripts/build-deployment.js [--no-pdf] [--preview]
//
// The deck goes to the root of dist/deployment/. If wrangler.jsonc has a route with
// a path, it goes under that path instead, since Cloudflare looks assets up by
// the full path of the request: "example.com/talks/my-talk*" puts it in
// dist/deployment/talks/my-talk/.
//
// --no-pdf skips the PDF export (it needs Chrome). --preview serves dist/deployment/
// with vite preview afterwards, to check the public build before deploying.

import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse, printParseErrorCode } from "jsonc-parser";
import { preview } from "vite";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const withPdf = !args.includes("--no-pdf");

const run = (cmd, cmdArgs, env = {}) =>
    execFileSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

// --------------------------------------------------------------- deploy path

function deployPath() {
    const errors = [];
    const wrangler = parse(readFileSync(resolve(root, "wrangler.jsonc"), "utf8"), errors, {
        allowTrailingComma: true,
    });
    if (errors.length) {
        const list = errors.map((e) => `${printParseErrorCode(e.error)} at offset ${e.offset}`).join(", ");
        throw new Error(`wrangler.jsonc: ${list}`);
    }
    const first = wrangler.routes?.[0] ?? wrangler.route;
    if (!first) return "";
    const pattern = typeof first === "string" ? first : first.pattern;
    if (typeof first === "object" && first.custom_domain) return "";
    // "example.com/talks/my-talk*" -> "talks/my-talk"
    const slash = pattern.indexOf("/");
    if (slash < 0) return "";
    return pattern
        .slice(slash + 1)
        .replace(/\*+$/, "")
        .replace(/^\/+|\/+$/g, "");
}

const path = deployPath();
const outDir = join("dist/deployment", path);

// --------------------------------------------------------------- build

if (withPdf) {
    // The PDFs are printed from the normal build (dist/presentation/). DeckTape never
    // prints speaker notes, so the PDFs are safe to publish.
    run("pnpm", ["pdfs"]);
}

// Empty the whole of dist/deployment/ first, so nothing from an earlier path is deployed.
rmSync(resolve(root, "dist/deployment"), { recursive: true, force: true });
run("pnpm", ["exec", "vite", "build", "--mode", "deployment", "--outDir", outDir, "--emptyOutDir"]);

if (withPdf) {
    copyFileSync(resolve(root, "slides.pdf"), resolve(root, outDir, "slides.pdf"));
    copyFileSync(resolve(root, "slides-static.pdf"), resolve(root, outDir, "slides-static.pdf"));
}

// --------------------------------------------------------------- notes check

// Fail before anything is deployed if the public build still has notes.
function* files(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) yield* files(full);
        else yield full;
    }
}

const leaks = [];
for (const file of files(resolve(root, "dist/deployment"))) {
    if (!/\.(html|js|css|json|txt|md)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    if (/<aside\b[^>]*\bclass="[^"]*\bnotes\b/.test(text) || /\bdata-notes=/.test(text)) {
        leaks.push(file);
    }
}
if (leaks.length) {
    console.error(`\nSpeaker notes found in the public build:\n  ${leaks.join("\n  ")}`);
    process.exit(1);
}

console.log(`\nPublic deck (no speaker notes) in ${outDir}/, served at /${path ? `${path}/` : ""}`);

// --------------------------------------------------------------- preview

if (args.includes("--preview")) {
    const server = await preview({
        root,
        build: { outDir: "dist/deployment" },
        preview: { open: false },
    });
    const url = new URL(path ? `${path}/` : "", server.resolvedUrls.local[0]);
    console.log(`Public deck at ${url}`);
}
