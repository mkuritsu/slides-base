# slides-base

A starting point for talks: HTML slides with [reveal.js](https://revealjs.com) 5.2.1, built with [Vite](https://vite.dev), with speaker notes, a pacing timer, PDF export, and a deploy to a Cloudflare Worker that strips the notes. The deck loads nothing from the network, so the built folder works offline on the day.

## Starting a new talk

1. Copy this repo, either with **Use this template** on GitHub (turn on Template repository in the repo settings first) or with `git clone` and a new remote.
2. Install the packages once. You need Node.js 22.18 or later and [pnpm](https://pnpm.io).

   ```sh
   pnpm install
   ```

3. Set the talk up:
   - `index.html`: the page `<title>`, the description, and the footer text (`.deck-footer`).
   - `src/config.js`: the length of the talk (`talkMinutes`) and the reading pace of your notes.
   - `wrangler.jsonc`: the Cloudflare Worker that serves the public deck (add a `name`, or pass `--name` on deploy).
   - `src/slides/`: replace the example slides with your own.
   - `src/theme.css`: the colours and fonts, from the tokens in `:root`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with live reload at http://localhost:5173 (`pnpm dev --port 9000` picks the port) |
| `pnpm build` | Writes the deck to `dist/presentation/` |
| `pnpm present` | Builds the deck and serves it with `vite preview`. Use this for the talk itself (`pnpm present --port 9000` picks the port) |
| `pnpm pdf` | Builds the deck and exports `slides.pdf`, one page per fragment step, with the click-by-click builds (`pnpm pdf other.pdf` picks the name) |
| `pnpm pdf:static` | Builds the deck and exports `slides-static.pdf`, one page per slide, with every step shown |
| `pnpm pdfs` | Builds the deck and exports both PDFs |
| `pnpm timing` | Lists the timing and the length of the notes of every slide, and checks that the timings add up to the talk |
| `pnpm build:deployment` | Builds the public deck, without speaker notes, and both PDFs into `dist/deployment/` (`--no-pdf` skips the PDFs) |
| `pnpm run deploy` | `pnpm build:deployment`, then `wrangler deploy` |

The built deck is a set of modules, so browsers refuse to run it from a `file://` URL. Serve `dist/presentation/` with `pnpm present` or any static file server, and it needs no network.

## Presenting on two screens

1. Run `pnpm present` and open http://localhost:4173 in the browser window that goes on the projector. It serves the final build, so nothing reloads during the talk.
2. Press **S**. The speaker view opens in a new window, so allow pop-ups if the browser asks. Drag that window to your own screen.
3. Click back on the deck window and press **F** for fullscreen.

The speaker view shows the current slide, the next slide, your notes, a timer, and the clock. Either window can drive the talk. Keys pressed in the speaker view move the main window at once, and the speaker view follows every step of the main window. Click the timer to restart it at 00:00 before you start.

| Key | Action |
| --- | --- |
| Right, Space, Page Down | Next step or slide |
| Left, Page Up | Previous step or slide |
| S | Speaker view |
| F | Fullscreen |
| Esc or O | Overview of all slides, useful to jump to a backup slide during questions |
| G | Jump to a slide: type its number and press Enter |
| B or . | Black screen |
| ? | All shortcuts |

Most clickers send Page Up and Page Down, which work.

## Timing

The talk length is `talkMinutes` in `src/config.js`. Give each slide a `data-timing` attribute with its share of the talk in seconds. The pacing indicator in the speaker view then shows whether you are ahead or behind. reveal.js splits the time left over evenly between slides without `data-timing`.

`pnpm timing` prints each slide's timing next to how long its notes take to read at `wordsPerMinute`, and flags notes that are much longer than their slide's share. It exits with an error when the timings exceed the talk, or when every slide is timed and they do not add up to it, so it can run in CI.

Mark every click in the notes with `(Click)`, so you know when to press the key.

## Writing slides

- `src/slides/` holds one file per slide, each a single `<section>` with its speaker notes in an `<aside class="notes">` at the end. The deck shows them in file name order, so the number prefix sets the order. To add a slide between two others, give it a name that sorts between them, such as `05a-name.html`.
- `data-section="Label"` on a `<section>` shows the small label above the title.
- `class="title-slide" data-state="is-title"` makes a cover slide, and hides the footer and the slide number on it.
- Steps are reveal.js fragments: `class="fragment"` appears on a click, `class="fragment emph"` is always shown and highlighted on its click (table rows), and `class="fragment dim-until"` is shown faded until its click.
- `index.html` is the Vite entry. A small plugin in `vite.config.js` puts the slides in place of its `<!-- slides -->` comment, and the dev server reloads when a slide file changes.
- Images go in `assets/`, referenced as `assets/name.png`. Vite copies and hashes them on build.
- Keep `<pre>` blocks unindented, since their spaces are shown as is.

The example slides show the components of the theme:

| Slide | Shows |
| --- | --- |
| `01-title.html` | Cover slide, with a commented logo |
| `02-bullets.html` | Lead text, bullets with `.sub` lines, fragments, `.bottom-note` |
| `03-cards.html` | `.row` of `.card`s (plain, `accent`, `warn`), `.tag`s, and a `.flow` of steps |
| `04-code.html` | `pre.code` coloured with spans, a numbered list with `dim-until` steps, `.how-to-read` |
| `05-table.html` | `table.data` with `num` cells and a highlighted row, a `.balloon`, a `.takeaway` with a `.badge` |
| `06-stats.html` | `.stats` tiles with `.meter` bars |
| `07-chart.html` | An inline SVG chart (`svg.diagram`) that grows from left to right (`.sweep`, `.after-sweep`) |
| `08-closing.html` | Closing slide |
| `90-backup-cover.html`, `91-backup-example.html` | Backup slides |

### Backup slides

Backup slides come after the last slide of the talk, for the questions. Name their files from `90-` and mark each `data-visibility="uncounted"`, so they do not change the slide count, the progress bar, or the pacing. They keep numbering on from the last slide, with no total. List their numbers in the notes of the backup cover, so you can jump to one with G during questions.

### Animated drawings

An SVG chart or timeline can grow from left to right when its slide or step is shown. Put a `<rect class="sweep">` in a `clipPath` over the drawing, and give labels that should appear at the end the class `after-sweep`. Going back to the slide, printing, and the PDF export (which opens the deck with `?export`) show the drawing whole. See `src/slides/07-chart.html`.

## Theme

`src/theme.css` is the theme. Change the look of the whole deck from the tokens in `:root`: the accent colour (`--accent`, `--accent-ink` for text, `--accent-wash` and `--accent-line` for backgrounds and borders), the greys, and the fonts. Add styles for one talk at the end of the file, or in another CSS file imported from `src/main.js`.

The deck is a 1280 by 720 canvas, scaled to fit the screen. Slides are flex columns laid out from the top: `.row` and `.col` lay out side by side, `.middle` centres a block in the space left, and `.grow` lets a block take it.

## Speaker notes and the public build

Speaker notes are only for you. The public build (`pnpm build:deployment`, run by `pnpm run deploy`) builds the deck with `vite build --mode deployment`, which:

- drops every `<aside class="notes">`, every `data-notes` attribute, and every HTML comment from the page (`stripNotes` in `vite.config.js`), and
- leaves the notes plugin out of the bundle (`src/main.js`), so S does nothing on the public deck.

`scripts/build-deployment.js` then scans everything in `dist/deployment/` and fails before anything is deployed if a notes block or a `data-notes` attribute is left. The PDFs are printed from the normal build, but DeckTape never prints notes, so they are safe to publish.

The normal build (`pnpm build`, `pnpm present`) keeps the notes for the speaker view, in `dist/presentation/`. The Worker only serves `dist/deployment/`, so it never gets them.

## Speaker view fixes

`patches/reveal.js@5.2.1.patch` fixes the speaker view of the reveal.js notes plugin. pnpm applies it to `reveal.js` on install (`patchedDependencies` in `pnpm-workspace.yaml`). It changes the page of the speaker view, `plugin/notes/speaker-view.html`, and makes `plugin/notes/plugin.js` import that page with `?raw`, so Vite bundles the patched page. `src/main.js` loads that plugin source instead of the prebuilt `notes.esm.js`, which has the original page built in, and `marked`, which renders Markdown notes, is a dependency for it.

- Keys pressed in the speaker view go straight to the main window. reveal.js sends them to the preview of the current slide, and the main window follows that preview at most every 500 ms, so quick presses lagged.
- The previews and notes follow the main window without the 200 ms wait of reveal.js, and never move it back.
- The previews take no clicks, so the keyboard stays with the speaker view.
- A click on the timer restarts it at 00:00. reveal.js restarts it at the time planned for the slides before the current one.

The patch is for reveal.js 5.2.1 only. To move reveal.js to a new version, run `pnpm patch reveal.js@<version>`, apply the fixes again in the folder it prints, and run `pnpm patch-commit <folder>`. pnpm then writes the new patch file and updates `pnpm-workspace.yaml`. Keep the comments in that file when it does. Check the speaker view afterwards.

## PDF export

`pnpm pdf` builds the deck, serves `dist/presentation/` on a free port, and prints every fragment step to `slides.pdf` with [DeckTape](https://github.com/astefanutti/decktape), backup slides included. `pnpm pdf:static` prints one page per slide to `slides-static.pdf`, and `pnpm pdfs` does both. The script is `scripts/export-pdf.js`.

DeckTape drives the Chrome or Chromium installed on the system, so the install skips the browser that puppeteer would otherwise download (`allowBuilds` in `pnpm-workspace.yaml`). Set `CHROME_PATH` if the browser is not on the `PATH` under a usual name (the usual macOS install paths are also tried).

## Deployment

The public deck is served by a Cloudflare Worker that only serves static assets. `wrangler.jsonc` holds its configuration. `pnpm build:deployment` writes the public deck to `dist/deployment/`, the assets folder, with the two PDFs next to it as `slides.pdf` and `slides-static.pdf`. A request to a folder without its trailing slash is redirected to it, so the relative asset URLs of the deck resolve.

The configuration has no `name`, no routes, and keeps the Wrangler defaults for `workers.dev` and preview URLs, so a deploy is served at `https://<name>.<your-subdomain>.workers.dev/`. To publish on your own domain, add a route or a custom domain in `wrangler.jsonc` or in the Cloudflare dashboard. If you add a route with a path, such as `example.com/talks/my-talk*`, `pnpm build:deployment` writes the deck under that path (`dist/deployment/talks/my-talk/`), since Cloudflare looks assets up by the full path of the request.

To deploy:

1. Log wrangler in once: `pnpm exec wrangler login`.
2. Run `pnpm run deploy --name my-talk`, or add `"name": "my-talk"` to `wrangler.jsonc` and run `pnpm run deploy`.

`pnpm exec wrangler deploy --dry-run` checks the configuration without deploying. Wrangler is a dev dependency, and `pnpm-workspace.yaml` allows the build scripts of `esbuild` and `workerd` that it needs.

## Files

| Path | What it holds |
| --- | --- |
| `index.html` | Page shell: title, footer, and the `<!-- slides -->` placeholder |
| `src/slides/` | One file per slide |
| `src/main.js` | reveal.js settings, the progress bar, and the slide numbers |
| `src/config.js` | Talk length and reading pace |
| `src/theme.css` | Theme |
| `patches/` | Speaker view fixes, applied to reveal.js on install |
| `assets/` | Images and the favicon |
| `vite.config.js` | Build settings, the slides plugin, and the notes stripping |
| `scripts/export-pdf.js` | PDF export |
| `scripts/build-deployment.js` | Public build and the notes check |
| `scripts/check-timing.ts` | Timing check |
| `wrangler.jsonc` | Cloudflare Worker |
| `AGENTS.md` | Instructions for coding agents that edit the deck |
