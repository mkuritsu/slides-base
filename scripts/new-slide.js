// Creates a new slide file in src/slides/.
//
// Usage: pnpm new <name> [--after <prefix>] [--section "Label"]
//
// The file is numbered after the last counted slide (before the 90- backup
// slides), or after the slide whose file starts with <prefix> when --after is
// given (05 -> 05a, 05a -> 05b).

import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const slidesDir = resolve(import.meta.dirname, "../src/slides");
const args = process.argv.slice(2);
const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const after = opt("--after");
const section = opt("--section");
const name = args[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

if (!name) {
    console.error('Usage: pnpm new <name> [--after <prefix>] [--section "Label"]');
    process.exit(1);
}

const files = readdirSync(slidesDir).filter((f) => f.endsWith(".html"));
const prefixes = files.map((f) => f.split("-")[0]);

let prefix;
if (after) {
    // 05 -> 05a, 05a -> 05b, skipping prefixes in use.
    const base = after.replace(/[a-z]$/, "");
    let letter = after.match(/[a-z]$/)?.[0] ?? "`";
    do {
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
        prefix = `${base}${letter}`;
    } while (prefixes.includes(prefix));
} else {
    const counted = prefixes.map((p) => parseInt(p, 10)).filter((n) => n < 90);
    prefix = String((counted.length ? Math.max(...counted) : 0) + 1).padStart(2, "0");
}

const file = resolve(slidesDir, `${prefix}-${name}.html`);
if (existsSync(file)) {
    console.error(`${file} already exists.`);
    process.exit(1);
}

const title = name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
writeFileSync(
    file,
    `<section data-timing="60"${section ? ` data-section="${section}"` : ""}>
    <h2>${title}</h2>
    <ul>
        <li>First point</li>
        <li class="fragment">Second point, shown on the next click</li>
    </ul>
    <aside class="notes">
        <p>What to say on this slide.</p>
        <p>(Click) What to say when the second point appears.</p>
    </aside>
</section>
`,
);
console.log(`Created src/slides/${prefix}-${name}.html. Remember to rebalance data-timing (pnpm timing).`);
