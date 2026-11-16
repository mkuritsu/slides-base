# AGENTS.md

Guidance for coding agents working on this slide deck. `README.md` has the full reference for people. This file gives the rules to follow when you edit the deck.

## What this is

A talk built with reveal.js 5.2.1 and Vite, managed with pnpm. Each slide is an HTML file in `src/slides/`, and a Vite plugin (`vite.config.js`) joins them into `index.html` at build time. Slides have speaker notes for the reveal.js speaker view, and a per-slide time budget that drives its pacing timer. A separate public build strips the notes and deploys to a Cloudflare Worker.

## Commands

```sh
pnpm install                           # once, or after package.json changes
pnpm dev                               # dev server with live reload, http://localhost:5173
pnpm build                             # build to dist/presentation/ (with notes, for presenting)
pnpm timing                            # check the per-slide timings against the talk length
pnpm exec vite build --mode deployment # public build only, fails if any notes are left
pnpm present                           # build and serve dist/presentation/ for the talk itself
pnpm pdfs                              # export slides.pdf and slides-static.pdf with puppeteer
pnpm build:deployment                  # both PDFs, then the public build with them in dist/deployment/
pnpm run deploy                        # pnpm build:deployment, then wrangler deploy
```

Never run `pnpm run deploy` or `wrangler deploy` unless the user asks. It publishes the deck.

## After every change

1. `pnpm build` must succeed.
2. `pnpm timing` must exit 0 whenever you add, remove, or retime slides, or change `talkMinutes`.
3. `pnpm exec vite build --mode deployment` must succeed whenever you touch notes, `vite.config.js`, or `src/main.js`. It checks that no notes reach the public build.
4. Look at the slides you changed when you can. Serve the deck (`pnpm present`) and take screenshots with Playwright at 1280×720. Use `Reveal.slide(h, 0, 99)` to show a slide with all of its steps. A slide must fit the 1280×720 canvas without overflow.

## Slide files

- One file per slide in `src/slides/`. The deck shows them in file name order, so the number prefix sets the order: `01-title.html`, `02-…`.
- To insert a slide between two others, give it a prefix that sorts between them, such as `05a-name.html` after `05-…`. Renumber files only if the user asks.
- Each file holds exactly one `<section>`, with its speaker notes in an `<aside class="notes">` as the last child. Do not nest sections, because the deck has no vertical slides.
- Keep `<pre>` blocks unindented in the file. Their whitespace is shown as is, and the plugin does not re-indent slides.
- Images go in `assets/` and are referenced as `assets/name.ext` (relative, no leading slash).
- Do not put `<script>` tags in slides. Put behaviour in `src/main.js` or in a module it imports.

A content slide looks like this:

```html
<section data-timing="60" data-section="Results">
    <h2>One clear claim as the title</h2>
    <ul>
        <li>First point</li>
        <li class="fragment">Second point, shown on the next click</li>
    </ul>
    <aside class="notes">
        <p>What to say when the slide appears.</p>
        <p>(Click) What to say when the second point appears.</p>
    </aside>
</section>
```

### Section attributes

| Attribute | Use |
| --- | --- |
| `data-timing="60"` | Seconds budgeted for the slide. Required on every counted slide. |
| `data-section="Label"` | Small uppercase label above the title. |
| `class="title-slide" data-state="is-title"` | Cover or closing slide. Hides the footer and the slide number. |
| `data-visibility="uncounted"` | Backup slide. No `data-timing`. |

### Steps (fragments)

- `class="fragment"` appears on a click.
- `class="fragment emph"` is always shown and gets highlighted on its click. Use it on table rows.
- `class="fragment dim-until"` is shown faded until its click.
- `data-fragment-index="n"` groups or orders steps when the document order is not the click order.

Every click must have a matching `(Click)` paragraph in the notes, in order. The number of `(Click)` marks equals the number of steps.

## Speaker notes and timing

- Write the notes as the words to say, in full sentences. Start a new `<p>` with `(Click)` at every step.
- The talk length is `talkMinutes` in `src/config.js`. The `data-timing` values of the counted slides must add up to exactly `talkMinutes × 60` seconds.
- When you add, remove, or lengthen a slide, rebalance the `data-timing` of the other slides so the total stays the same. Do not change `talkMinutes` unless the user asks.
- The notes of a slide should take no longer to read than its `data-timing`, at `wordsPerMinute` from `src/config.js` (130 by default). `pnpm timing` flags slides whose notes run more than 15% over.
- Never put content meant only for the speaker anywhere but `<aside class="notes">`. The public build also strips `data-notes` attributes and HTML comments, but visible text is published as is.

## Backup slides

Backup slides come after the talk, for questions. Name them from `90-` (`90-backup-cover.html` is the cover), and mark each `data-visibility="uncounted"` with no `data-timing`. When you add one, also add its slide number and topic to the notes of the backup cover. The number is its position in the whole deck, counting from 1.

## Components

`src/theme.css` styles these classes. Prefer them to inline styles, and see `src/slides/` for an example of each.

| Class | What it is |
| --- | --- |
| `.lead` | Intro sentence under the title |
| `ul`, `ol`, `li > .sub` | Bullets (accent squares), numbered lists (accent circles), detail line under a point |
| `.row` > `.col` | Side-by-side columns |
| `.middle`, `.grow`, `.stack` | Centre a block in the space left, let a block fill it, vertical stack |
| `.bottom-note`, `.takeaway` with `.badge` | Note or takeaway at the bottom of the slide |
| `.card`, `.card.accent`, `.card.warn`, `.card.old` | Boxes. Use `accent` for the new thing or the focus, and `warn` for a caveat |
| `.tag`, `.tag.accent` | Small uppercase pill |
| `.flow` > `.step` / `.arrow`, `.step.focus` | Horizontal pipeline of steps |
| `table.data`, `td.num`, `tr.hl`, `.pill`, `.good`, `.bad` | Data tables |
| `.stats` (`.big-stats`) > `.stat` > `.label` / `.value` (`.unit`) / `.note`, `.meter > span` | Number tiles |
| `pre.code` (`.small-code`) with `.k .s .c .f .n .y` spans | Code coloured by hand: keywords, strings, comments, functions, numbers, types |
| `.how-to-read` with `.label` | Grey note on how to read a chart or table |
| `.balloon` (`.static`, `.left-arrow`, `.up-arrow`, `.danger`) | Callout with an arrow. Absolute unless `.static` |
| `svg.diagram` (`.big`) with `.box`, `.edge`, `.lbl`, `.sub`, `.note` (`.accent` variants) | Inline SVG diagrams and charts |
| `.sweep`, `.after-sweep` | Left-to-right reveal of an SVG drawing, labels fading in after it (see `07-chart.html`) |
| `img.figure` | Image scaled to fit the space left |
| `.accent-text`, `.muted`, `.small`, `.tiny`, `.ref` | Text helpers |

In SVG, set colours with `style="fill: var(--accent-ink)"` or a class. CSS variables do not work in presentation attributes such as `fill="…"`.

## Theme and layout

- The canvas is 1280×720, scaled to the screen. Slides are flex columns laid out from the top with a 22px gap. Use `.middle` to centre content vertically.
- Change colours and fonts through the tokens in `:root` in `src/theme.css` (`--accent`, `--accent-ink`, `--accent-wash`, `--accent-line`, greys, fonts). Do not hard-code colours that a token already covers.
- Put styles for one talk at the end of `src/theme.css`, under a comment that names the slide they belong to.

## Other files

- `index.html`: page title, description, footer text (`.deck-footer`), and the `<!-- slides -->` placeholder. Keep the placeholder on its own line.
- `src/main.js`: reveal.js settings, progress bar, slide numbers. The notes plugin is loaded only outside the `deployment` mode. The `pdf-ready` handler adds the footer, slide number, and progress bar to each PDF page, so keep it in step when you change those on screen.
- `patches/reveal.js@5.2.1.patch`: fixes to the speaker view of the reveal.js notes plugin, applied by pnpm on install (`patchedDependencies` in `pnpm-workspace.yaml`). `src/main.js` loads the plugin source, `reveal.js/plugin/notes/plugin.js`, so the patched page is used. Edit the patch with `pnpm patch` and `pnpm patch-commit`, never by hand, and keep the comments in `pnpm-workspace.yaml`, since pnpm rewrites that file. Do not upgrade reveal.js unless the user asks. If you do, redo the patch for the new version, then open the speaker view (press S) and check each fix.
- `vite.config.js`: the slides plugin, `stripNotes`, which removes notes from the public build, and the check that fails that build if any are left.
- `scripts/`: PDF export with puppeteer and the print mode of reveal.js (`export-pdf.js`), and the timing check (`check-timing.ts`).
- `wrangler.jsonc`: the Cloudflare Worker. It has no `name` or routes on purpose. Pass `--name` on deploy, or add them only when the user asks. URLs drop the trailing slash, so the deck must be served from the root of a host, never under a path.
- `dist/`, `.wrangler/`, and the PDFs are build outputs and are gitignored. Never edit or commit them.

## Writing style

- Do not use semicolons in slide text or notes. Split the sentence, or join the clauses with a conjunction.
- Do not use italics (`<em>`, `<i>`) for emphasis. Let the wording carry it, or use `<strong>` sparingly.
- Keep slide text short. Put the full explanation in the notes.
