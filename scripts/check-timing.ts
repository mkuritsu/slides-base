// Checks the pacing of the talk.
//
// Lists every slide with its data-timing, the words in its speaker notes, and
// how long those notes take to say at the pace in src/config.js. Then it
// compares the sum of the timings with the length of the talk. Exits with an
// error if they differ, so it can run in CI.
//
// Usage: node scripts/check-timing.ts

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import config from "../src/config.js";

const slidesDir = resolve(import.meta.dirname, "../src/slides");
const files = readdirSync(slidesDir)
    .filter((f) => f.endsWith(".html"))
    .sort();

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const words = (html: string) =>
    html
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z#0-9]+;/gi, " ")
        .split(/\s+/)
        .filter(Boolean).length;

const rows = [];
let timed = 0;
let untimed = 0;
for (const file of files) {
    const html = readFileSync(resolve(slidesDir, file), "utf8");
    const section = html.match(/<section\b[^>]*>/)?.[0] ?? "";
    const uncounted = /data-visibility="uncounted"/.test(section);
    const timing = section.match(/data-timing="(\d+(?:\.\d+)?)"/)?.[1];
    const notes = [...html.matchAll(/<aside\b[^>]*class="[^"]*\bnotes\b[^"]*"[^>]*>([\s\S]*?)<\/aside>/g)]
        .map((m) => m[1])
        .join(" ");
    const n = words(notes);
    const spoken = (n / config.wordsPerMinute) * 60;
    if (!uncounted) {
        if (timing === undefined) untimed++;
        else timed += Number(timing);
    }
    rows.push({
        file,
        timing: uncounted ? "backup" : timing === undefined ? "-" : fmt(Number(timing)),
        words: n,
        spoken: n ? fmt(spoken) : "-",
        // Flag notes that take much longer to say than the slide's share.
        flag: !uncounted && timing !== undefined && spoken > Number(timing) * 1.15 ? "  notes too long" : "",
    });
}

const width = Math.max(...rows.map((r) => r.file.length), 5);
console.log(`${"slide".padEnd(width)}  timing   words  notes at ${config.wordsPerMinute} wpm`);
for (const r of rows) {
    console.log(
        `${r.file.padEnd(width)}  ${r.timing.padStart(6)}  ${String(r.words).padStart(6)}  ${r.spoken.padStart(6)}${r.flag}`,
    );
}

const total = config.talkMinutes * 60;
console.log(`\nTimed slides add up to ${fmt(timed)} of a ${fmt(total)} talk (talkMinutes in src/config.js).`);
if (untimed) {
    // reveal.js splits the time left over evenly between slides without data-timing.
    const share = Math.max(total - timed, 0) / untimed;
    console.log(`${untimed} counted slide(s) have no data-timing and share the rest, ${fmt(share)} each.`);
}
if (timed > total || (!untimed && timed !== total)) {
    console.error(`The timings ${timed > total ? "exceed" : "do not add up to"} the length of the talk.`);
    process.exit(1);
}
