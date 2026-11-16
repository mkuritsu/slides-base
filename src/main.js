import Reveal from "reveal.js";
import "reveal.js/dist/reset.css";
import "reveal.js/dist/reveal.css";
import "./theme.css";
import config from "./config.js";

// Presenting on two screens: serve the deck (vp run present), press S to open
// the speaker view in a new window, move that window to your own screen, and
// press F in the main window to make it fullscreen on the projector.

// The public build (vp run build:deployment) has no speaker notes, so it leaves out the
// notes plugin and the S key does nothing there. Vite+ replaces
// import.meta.env.MODE at build time, so the plugin is not even bundled.
const withNotes = import.meta.env.MODE !== "deployment";
const plugins = [];
if (withNotes) {
    // The plugin source, not its prebuilt notes.esm.js, so that the speaker
    // view it opens comes from the patched speaker-view.html (patches/).
    const { default: RevealNotes } = await import("reveal.js/plugin/notes/plugin.js");
    plugins.push(RevealNotes);
}

// The speaker view shows the deck in small iframes with ?receiver in the URL.
// The footer is not scaled with the slide, so hide it there.
if (/receiver/.test(window.location.search)) {
    document.documentElement.classList.add("speaker-preview");
}

// The PDF export (scripts/export-pdf.js) opens the deck with ?export. Animated
// drawings (.sweep in theme.css) are then shown whole, without animation.
if (/export/.test(window.location.search)) {
    document.documentElement.classList.add("no-animation");
}

Reveal.initialize({
    // 16:9 canvas, scaled to fit the screen.
    width: 1280,
    height: 720,
    margin: 0.04,
    minScale: 0.2,
    maxScale: 2.0,

    // Slides are flex columns, laid out from the top.
    center: false,
    display: "flex",

    // Keep the slide in the URL so a reload or the speaker view stays in sync.
    hash: true,
    respondToHashChanges: true,

    controls: false,
    // The bar itself is drawn by updateProgress below.
    progress: true,
    // The title slide hides the number through its data-state (see theme.css).
    // Counted slides show "current/total". Backup slides are uncounted, so
    // they keep numbering on from the last counted slide and show no total.
    // This assumes the deck has no vertical slides.
    slideNumber: (slide) =>
        slide && slide.dataset.visibility === "uncounted"
            ? [Reveal.getIndices(slide).h + 1]
            : [Reveal.getSlidePastCount(slide) + 1, "/", Reveal.getTotalSlides()],
    showSlideNumber: "all",

    // Steps are reveal.js fragments (class="fragment"). Slides change without
    // a transition.
    fragments: true,
    transition: "none",
    backgroundTransition: "none",

    // The speaker view paces the talk with the data-timing of each slide (in
    // seconds), which should add up to this total (check with vp run timing).
    totalTime: config.talkMinutes * 60,

    pdfSeparateFragments: false,
    pdfMaxPagesPerSlide: 1,

    plugins,
});

// reveal.js counts the shown steps of the current slide in its progress bar,
// so slides with steps would move it unevenly. This bar moves one equal step
// per slide instead. Backup slides are uncounted and leave it full.
const progress = document.createElement("div");
progress.className = "deck-progress";
const progressFill = progress.appendChild(document.createElement("span"));
document.querySelector(".reveal").appendChild(progress);

function updateProgress() {
    const total = Reveal.getTotalSlides();
    const past = Reveal.getSlidePastCount();
    progress.style.display = Reveal.getConfig().progress ? "block" : "none";
    progressFill.style.transform = `scaleX(${total > 1 ? Math.min(past / (total - 1), 1) : 1})`;
}

// Animated drawings play only when a slide is reached going forward. Going
// back shows them whole.
Reveal.on("slidechanged", (event) => {
    const back = event.previousSlide && event.indexh < Reveal.getIndices(event.previousSlide).h;
    document.documentElement.classList.toggle("nav-back", Boolean(back));
});

Reveal.on("ready", updateProgress);
Reveal.on("slidechanged", updateProgress);

// In the print mode (?print-pdf, used by scripts/export-pdf.js), reveal.js
// lays every slide or step out as its own page, copying a slide once per step.
// Each page gets the footer, slide number, and progress bar that it has on
// screen, except title slides, which show none of them. reveal.js can no
// longer count the slides once they are moved into pages, so they are
// numbered here first, and the copies keep the number.
const deckSlides = [...document.querySelectorAll(".reveal .slides > section")];
deckSlides.forEach((slide, i) => {
    slide.dataset.deckIndex = String(i);
});

Reveal.on("pdf-ready", () => {
    const footer = document.querySelector(".deck-footer");
    const counted = deckSlides.filter((slide) => slide.dataset.visibility !== "uncounted");
    const total = counted.length;
    for (const page of document.querySelectorAll(".pdf-page")) {
        page.querySelector(".slide-number-pdf")?.remove();
        const slide = page.querySelector("section");
        if (!slide || (slide.dataset.state || "").split(" ").includes("is-title")) continue;

        if (footer) {
            page.appendChild(footer.cloneNode(true)).classList.add("pdf");
        }

        const index = Number(slide.dataset.deckIndex);
        const past = counted.indexOf(deckSlides[index]);
        const number = page.appendChild(document.createElement("div"));
        number.className = "slide-number";
        // Same format as slideNumber above: "current/total", or the position in
        // the deck with no total for an uncounted (backup) slide.
        number.innerHTML =
            past >= 0
                ? `<span class="slide-number-a">${past + 1}</span><span class="slide-number-delimiter">/</span><span class="slide-number-b">${total}</span>`
                : `<span class="slide-number-a">${index + 1}</span>`;

        const bar = page.appendChild(document.createElement("div"));
        bar.className = "deck-progress";
        const fill = past >= 0 && total > 1 ? Math.min(past / (total - 1), 1) : 1;
        bar.appendChild(document.createElement("span")).style.transform = `scaleX(${fill})`;
    }
});

// reveal.js as a global, so browser tools (Playwright, the console) can drive
// the deck, for example with Reveal.slide(h, 0, 99) to show every step.
window.Reveal = Reveal;
