import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Each slide lives in its own file in src/slides/, and the deck shows them in
// file name order. This plugin puts them in place of <!-- slides --> in
// index.html.
const slidesDir = resolve(import.meta.dirname, "src/slides");

// The public build (`vite build --mode deployment`, run by `pnpm build:deployment`) must not
// ship the speaker notes. It drops every <aside class="notes">, every
// data-notes attribute, and every HTML comment of the page, and
// scripts/build-deployment.js checks the output for leftovers.
export function stripNotes(html) {
    return html
        .replace(/[ \t]*<aside\b[^>]*\bclass="[^"]*\bnotes\b[^"]*"[^>]*>[\s\S]*?<\/aside>[ \t]*\n?/g, "")
        .replace(/\s+data-notes=("[^"]*"|'[^']*')/g, "")
        .replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, "");
}

function slides() {
    let strip = false;
    return {
        name: "slides",
        configResolved(config) {
            strip = config.mode === "deployment";
        },
        transformIndexHtml: {
            // Before Vite processes the HTML, so asset URLs in slides resolve.
            order: "pre",
            handler(html) {
                const files = readdirSync(slidesDir)
                    .filter((f) => f.endsWith(".html"))
                    .sort();
                const body = files
                    // Not re-indented, since that would shift the lines of <pre> blocks.
                    .map((f) => readFileSync(resolve(slidesDir, f), "utf8").trimEnd())
                    .join("\n\n");
                const out = html.replace(/^\s*<!-- slides -->$/m, () => body);
                return strip ? stripNotes(out) : out;
            },
        },
        // Reload the page in the dev server when a slide is added, changed, or removed.
        configureServer(server) {
            server.watcher.add(slidesDir);
            server.watcher.on("all", (_event, path) => {
                if (path.startsWith(slidesDir)) {
                    server.ws.send({ type: "full-reload" });
                }
            });
        },
    };
}

export default defineConfig(({ mode }) => ({
        // Relative asset URLs, so the built deck can be served from any folder.
        base: "./",
        build: {
            // The public build (--mode deployment) and the build with notes go to their own
            // folders, so the Worker, which serves dist/deployment/, never gets the notes.
            outDir: mode === "deployment" ? "dist/deployment" : "dist/presentation",
            emptyOutDir: true,
        },
        plugins: [slides()],
}));
