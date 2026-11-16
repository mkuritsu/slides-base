import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, lazyPlugins } from "vite-plus";

// Each slide lives in its own file in src/slides/, and the deck shows them in
// file name order. This plugin puts them in place of <!-- slides --> in
// index.html.
const slidesDir = resolve(import.meta.dirname, "src/slides");

// The public build (`vp build --mode deployment`, run by `vp run build:deployment`) must not
// ship the speaker notes. It drops every <aside class="notes">, every
// data-notes attribute, and every HTML comment of the page. The build then
// fails, before it writes anything, if a notes block or a data-notes
// attribute is left in any output file.
const NOTES = /<aside\b[^>]*\bclass="[^"]*\bnotes\b|\bdata-notes=/;

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
        generateBundle: {
            // After Vite has added index.html to the output.
            order: "post",
            handler(_options, bundle) {
                if (!strip) return;
                // The PDFs (vp run pdfs) go next to the public deck, when they exist.
                for (const name of ["slides.pdf", "slides-static.pdf"]) {
                    const file = resolve(import.meta.dirname, name);
                    if (existsSync(file)) {
                        this.emitFile({ type: "asset", fileName: name, source: readFileSync(file) });
                    }
                }
                const leaks = Object.values(bundle)
                    .filter((file) => {
                        const text =
                            file.type === "chunk"
                                ? file.code
                                : typeof file.source === "string"
                                  ? file.source
                                  : /\.(html|js|css|json|txt|md|svg)$/.test(file.fileName)
                                    ? new TextDecoder().decode(file.source)
                                    : "";
                        return NOTES.test(text);
                    })
                    .map((file) => file.fileName);
                if (leaks.length) {
                    this.error(`speaker notes left in the public build: ${leaks.join(", ")}`);
                }
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
    // vp fmt (oxfmt) and vp lint (oxlint), both run by vp check.
    fmt: { tabWidth: 4, printWidth: 120, ignorePatterns: ["pnpm-lock.yaml"] },
    lint: {
        jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
        rules: { "vite-plus/prefer-vite-plus-imports": "error" },
        options: { typeAware: true, typeCheck: true },
    },
    // Relative asset URLs, so the built deck can be served from any folder.
    base: "./",
    build: {
        // The public build (--mode deployment) and the build with notes go to their own
        // folders, so the Worker, which serves dist/deployment/, never gets the notes.
        outDir: mode === "deployment" ? "dist/deployment" : "dist/presentation",
        emptyOutDir: true,
    },
    plugins: lazyPlugins(() => [slides()]),
}));
