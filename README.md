# mz-catalog

Software catalog and preservation library for Sharp MZ series computers
(MZ-700 / MZ-800 / MZ-1500). One repository feeds two consumers:

- the public website **https://mzpico.com** — a page per title
  with metadata, screenshots, and the original `.mzf` tape image;
- the **MZPico** storage card, which reads `manifest.json` to browse and
  load titles directly on the machine.

Everything is static: the site is built with Astro and deployed to
Cloudflare Pages; there is no server code.

## Repository layout

```
titles/<slug>/            source of truth — one folder per software title
  meta.yaml               metadata (schema: schema/meta.schema.json)
  <name>.mzf              one or more tape images (preserved, immutable)
  screenshots/*.png       optional
schema/meta.schema.json   JSON Schema for meta.yaml, enforced by CI
scripts/validate.mjs      validates titles/ (schema + file checks)
scripts/build-manifest.mjs  emits manifest.json for the device
scripts/lib/catalog.mjs   shared reader (YAML, MZF header, CRC-32)
site/                     Astro site; `npm run build` → site/dist
```

The structure is flat: machine type is metadata, not a directory level.

## Adding a title

1. Create `titles/<slug>/` — lowercase letters, digits and hyphens, e.g.
   `titles/flappy/`. The slug becomes the page URL (`/titles/flappy/`)
   and must never change once published.
2. Copy the `.mzf` file(s) in. Use lowercase `.mzf`, no spaces. Do not
   alter the binaries in any way (no header fixes, no re-saves).
3. Add screenshots as `screenshots/*.png` (or jpg/gif/webp), lowercase
   names. The first one in alphabetical order is the thumbnail — name
   them `01-title.png`, `02-game.png`, … Native MZ resolution, no
   scaling or filtering.
4. Write `meta.yaml`:

   ```yaml
   title: Flappy
   year: 1989
   publisher: dB-SOFT / Czech conversion
   genre: [game, puzzle]
   machine: mz-800
   mode: mz-700            # MZ-800 only: native | mz-700
   language: cs
   files:
     - path: flappy.mzf
       kind: standard      # standard | turbo | alt-dump
     - path: flappy-turbo.mzf
       kind: turbo
       note: Czech turbo loader, 2400 Bd
   description:            # or a plain string, which is taken as English
     en: |
       Free-form text. Blank lines separate paragraphs on the site.
     cs: |
       Translations are optional; a missing language falls back to en.
   controls: |
     Q/A/O/P  move
     SPACE    push
   source: https://example.org/where-the-dump-came-from
   ```

   | field | required | notes |
   |---|---|---|
   | `title` | yes | display name |
   | `year` | no | integer; omit if unknown |
   | `publisher` | no | publisher, author or group — of the Sharp version: for a conversion, the converter ("SHARP VERSION BY J.O. VSETIN 1988"), not the original house |
   | `original` | no | for conversions: `{title, publisher, year}` of the release it was converted from, all optional; `title` only when the name differs. Shown under the heading as "Original: …" and as `isBasedOn` in the JSON-LD |
   | `genre` | yes | list; allowed values are in the schema (`game`, `arcade`, `adventure`, `puzzle`, `strategy`, `sports`, `simulation`, `rpg`, `text`, `demo`, `utility`, `language`, `education`, `music`, `graphics`, `system`, `other`) |
   | `machine` | yes | `mz-700`, `mz-800` or `mz-1500` |
   | `mode` | MZ-800 only | `native` or `mz-700` (compatibility mode); forbidden for other machines |
   | `language` | no | ISO 639 code of the software's UI language (`en`, `cs`, `de`, `ja`, …); omit if unknown |
   | `files[]` | yes | `path` (file name in the folder), `kind`, optional `note` |
   | `description` | no | free text, paragraphs separated by blank lines. Either a string (English) or a per-language map (`en` required, the fallback; `cs`, `de`, `ja` optional). Keep Japanese paragraphs on one line — a hard wrap renders as a stray space. |
   | `controls` | no | key / joystick reference, shown verbatim |
   | `web` | no | `true` publishes the title on the web site; absent/false keeps it API-only (manifest.json + device API still serve every title) |
   | `touch` | no | touch-control layout for the browser emulator on phones: `pad` (`cursor` default, `wasd`, `none`, or `{up,down,left,right}`), `buttons` (right side, first = primary), `extra` (small buttons, left side); keys are MZ key names (`A`-`Z`, `0`-`9`, `Space`, `Enter`, `Up`…, `F1`…, see schema). Preview a layout without editing: `/play/<slug>/?touchspec={"pad":"wasd","buttons":[{"label":"JUMP","key":"Space"}],"extra":[{"label":"1","key":"1"}]}` |
   | `source` | no | where the dump came from — URL or free text. Not shown on the site; the legacy device-API folder is derived from a `folder <name>` mention here |

5. Run `npm run validate`. It checks the schema, that every listed file
   exists, that no `.mzf` in the folder is unlisted, and that MZF headers
   look sane (a header/size mismatch is a warning, not an error — some
   tapes carry several blocks).
6. Open a pull request. CI runs the same validation plus a full site
   build.

Sizes, CRC-32 checksums and MZF header fields (tape name, type, load and
execution address) are derived from the binaries at build time — never
enter them by hand.

## Development

Requires Node 22 and npm (see `.nvmrc`).

```
npm ci             # installs root tooling + site (npm workspaces)
npm run validate   # schema + file checks for titles/
npm run dev        # Astro dev server; serves /files, /screenshots, /manifest.json from titles/
npm run build      # validate → astro build → pagefind index; output in site/dist
npm run preview    # serve site/dist
npm run manifest   # print manifest.json to stdout (or --out <file>)
```

`scripts/capture-screenshots.mjs` batch-captures a first-pass screenshot
for every title that has none, by driving a headless
[mz800emu v2](https://github.com/michalhucik/mz800emu) over its JSONL
(MCP) pipe — see the script header for usage. Auto-captures are named
`01-auto.png`; replace them with curated shots when available.

`site/src/lib/mzf2wav.js` synthesizes Sharp tape audio from an MZF
entirely in the browser (timing per mz800emu's mztape sources); every
title page has a "Tape audio" player and WAV download for loading
software into a real MZ through its tape-in jack.

`site/dist` after a build is the complete deployable: HTML, `/files/<slug>/*.mzf`,
`/screenshots/<slug>/*`, `/manifest.json`, `/pagefind/` search index and
`_headers` for Cloudflare Pages. Search is client-side (Pagefind), so it
is only available in the built site, not in `npm run dev`.

## Play online (browser emulator)

Every MZ-700/MZ-800 title page has a **▶ Play** button that runs the tape
image in the browser using a WebAssembly build of
[mz800emu](https://github.com/michalhucik/mz800emu) (GNU GPL, by Michal
Hučík). The prebuilt files live in `site/public/play/emu/`
(`mz800emu.js`, `.wasm`, `.data`); `/play/*` is served with
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` (see `site/public/_headers`)
because the emulator uses pthreads (SharedArrayBuffer).

The page fetches the MZF from `/files/<slug>/<file>`, stages it into the
emulator's in-memory filesystem and starts it with `--run-mzf --kiosk`
(no emulator hotkeys or menus — the MZ keyboard gets every key). It
auto-starts when reached from a catalog page (browsers allow audio after
an interaction with the origin) and otherwise shows a start button; a
fullscreen button and a `?buf=` audio-buffer override are available.

### Rebuilding the emulator

Done offline (not in CI): Emscripten SDK ≥ 6.0, meson + ninja, and a
wasm sysroot with SDL3, SDL3_image, minizip-ng, libffi ≥ 3.8, glib 2.82
and json-glib built via `emcmake` / a meson cross file (`-pthread`,
`-sALLOW_TABLE_GROWTH=1`, `-Wno-incompatible-function-pointer-types`;
stub `libresolv`/`posix_spawn` archives satisfy GIO's link checks). The emulator is configured with `emcmake cmake -DMZ_NO_DEBUGGER=ON
-DMZ_NO_MCP=ON -DBUILD_TESTING=OFF` and linked with `-O3 -pthread
-sPTHREAD_POOL_SIZE=8 -sINITIAL_MEMORY=256MB -sUSE_WEBGL2=1 -sFULL_ES3=1
-sUSE_ZLIB=1 --preload-file ui_resources/imgui/{fonts,symbols,images}`
(no `ALLOW_MEMORY_GROWTH` — it slows every JS-side memory access under
pthreads). SDL3's Emscripten audio backend is patched to honor
`SDL_AUDIO_DEVICE_SAMPLE_FRAMES` (`tools/wasm/sdl3-emscripten-audio-buffer.patch`):
mz800emu paces emulation on the audio callback, and SDL's hard-coded
2048-frame ScriptProcessor buffer would cap it at ~21 fps; the play page
requests 512-frame buffers via `Module.ENV`. Scripts, cross file and
stub libraries: `tools/wasm/`.
The emulator source changes (Emscripten main loop, GLES 3.0 context, no
curl/version check, audio callback that fills the whole device buffer,
palette-LUT screen upload into a persistent texture, ImGui backend
without per-frame GL state queries, `--kiosk`, and the `--run-mzf`
bootstrap fixes that make it start programs the way the monitor ROM
does) are published on the `wasm` branch of the MZPico fork,
<https://github.com/MZPico/mz800emu/tree/wasm>, and mirrored as a patch
series against upstream in `tools/wasm/patches/` (base commit named in
`tools/wasm/README.md`) — the complete corresponding source for the
shipped binaries.

## Staging

`https://staging.mzpico.com` is a second Workers deployment of the same
build, for reviewing changes before they go live (and for testing on a
phone — the browser emulator needs cross-origin isolation, so it cannot
run from a plain local server).

```
npm run deploy:staging     # builds with MZ_STAGING=1 and deploys wrangler.staging.jsonc
```

Staging builds carry a `STAGING` badge in the header, a `noindex` meta tag,
an `X-Robots-Tag: noindex, nofollow` response header and a `Disallow: /`
`robots.txt`, so they never reach search results. Production is untouched by this: it keeps deploying
from `main` through the git-connected build, without `MZ_STAGING`.
Devices are unaffected too — the api.mzpico.com shim reads from
`https://mzpico.com`.

(The `MZ_STAGING=1` prefix in `build:staging` is POSIX shell syntax; on
Windows use `set MZ_STAGING=1` or run it from WSL.)

## Site structure

The front page is the curated pick — the titles carrying `web: true`, with
written pages in four languages. Everything else is published too, in
`/archive/`: one filterable list of every title in `titles/`, each with its
own page showing the screenshot, the tape header facts, play and download.
Promoting an entry from archive to front page is `web: true` plus prose.

Display names for entries nobody has written up come from the tape header,
which is almost always better than the eight-character file name the legacy
catalog was keyed by:

```
node tools/catalog/derive-titles.mjs            # print the proposal
node tools/catalog/derive-titles.mjs --write    # apply it to meta.yaml
```

It only touches entries still marked `Bootstrap-imported` that are not
curated, so a hand-written title is never overwritten.

## Screenshots

`titles/<slug>/screenshots/01-auto.png` is the title screen, `02-auto.png` a
moment of play; lists and preview cards use 02 when there is one. Missing ones
are captured with the native emulator, headless:

```
python3 tools/screenshots/auto-capture.py --missing --workers 4 --out /tmp/shots
python3 tools/screenshots/install-shots.py --from /tmp/shots            # dry run
python3 tools/screenshots/install-shots.py --from /tmp/shots --apply
python3 tools/og/build-og.py                                          # cards for them
```

`--missing` takes every title without a gameplay shot. The headless build runs
about 18x real time, so frames are grabbed in bursts — through the attract
loop, then after each of the usual start keys — and chosen afterwards: the
first stable screen as the title, the richest different one as play, text
pages ranked last. Add `--relaxed` for games that draw in two colours or show
a nearly empty screen (BASIC banners); it also lets flat colour fields
through, so look at what it picks.

Nothing lands in `titles/` until `install-shots.py` copies it, and that only
fills empty slots. It also drops any picture that turns up for three or more
different titles — a boot screen, a monitor prompt or a shared loader is not
a game. Look at the candidates before `--apply`; a handful of titles always
come out as a colour field or loading noise.

The emulator is started in an empty working directory on purpose: it reads
`mz800emu.ini` from there, and a local ini with a disk in the drive makes a
crashing game boot that disk instead.

While it runs, the capture also reads the MZ-700 screen straight out of VRAM
and scans the program for copyright and credit lines, into
`<out>/<slug>/hints.json`. `tools/screenshots/metadata-hints.py <out>` turns
those into year / publisher suggestions with the evidence beside them — for a
human to confirm, since the year on a title screen may be the port's rather
than the original's. The convention: `year`/`publisher` get the Sharp
version, the original release goes to `original`.

## The logotype

`site/public/mz-badge.svg` stacks SHARP over MZ-700 over MZ-800. The letter
shapes are the Sharp wordmark, drawn as outlines the way the machines' own
badges are. The 7 was traced from a photo of the real logotype
(`tools/mzfont/mz-7.png`) rather than drawn by eye:

```
python3 tools/mzfont/trace-glyph.py tools/mzfont/mz-7.png --height 573
```

The tracer walks the pixel contours and simplifies them, so straight edges
stay straight; the 573-unit height matches the other glyphs in the badge.

## Play counts and ratings

`workers/site/index.js` is the only server-side code the site has. Every
request except `/api/*` goes straight to the static assets; the API keeps two
community numbers in D1 (`workers/site/schema.sql`):

- `POST /api/play` — one play per visitor per title per day.
- `POST /api/rate` — one 1..5 rating per visitor per title, changeable.
- `GET /api/stats` — aggregate for the archive list; `?slug=` for one title,
  plus an `X-MZ-Voter` header to get that visitor's own rating back.

There are no accounts and no cookies: a visitor who rates is a random id in
their own `localStorage`, created on the first vote (not on page view — see
Privacy below). The Worker salts it together with the request IP and stores
only the hash, so neither the id nor the address is in the database. The salt
is a Worker secret (`STATS_SALT`), set per environment. A daily cron
(`17 3 * * *`, `scheduled()` in the Worker) deletes `play_log` rows from
earlier days and `throttle` rows from past hours.

Staging writes to its own database, so test votes never reach the real
numbers. Schema changes go to both:

```
npx wrangler d1 execute mz-catalog-stats-staging --remote --file=workers/site/schema.sql -c wrangler.staging.jsonc
npx wrangler d1 execute mz-catalog-stats --remote --file=workers/site/schema.sql -c wrangler.jsonc
```

## Game controllers

The play page reads game controllers through the Gamepad API and maps them
from the title's `touch` spec, so nothing extra goes into `meta.yaml`: d-pad
and left stick = the pad keys, A/B/X/Y = `buttons` in order, Start = the extra
labelled START (else the first extra, else Enter), Select, LB, RB, LT, RT = the
remaining extras. The controller is polled on an 8 ms timer rather than per
animation frame, because the emulator's rendering can hold a slow device to a
few frames a second. First use hides the touch overlay and shows the mapping
under the screen.

## Saved positions

The play page can save the whole emulated machine and resume it later
("continue where I left off"). The wasm build exports
`mz_wasm_snapshot_request(1 = save, 2 = load)` / `mz_wasm_snapshot_status()`;
the emulation thread serves the request between two instructions and passes
the `.mzs` (mz800emu's own snapshot format, a ZIP) through MEMFS. The page
(`site/src/lib/saves.ts`) keeps one slot per title and tape file in
IndexedDB (`mzpico` / `saves`), with the screen picture from inside the
`.mzs` as thumbnail; the title page shows a Continue button when a slot
exists. Saving happens only on the player's action — Save, the
automatic-saving checkbox (every 2 minutes and on leaving the page), or
opening a `.mzs` — which keeps it inside ePrivacy's "strictly necessary for a
service the user asked for". `.mzs` files move both ways between the browser
and the desktop mz800emu.

## Privacy

`/privacy/` (EN/CS/DE/JA, `site/src/i18n/*.ts` → `privacy`) lists everything
the site stores: in the browser `mz-touch-swap`, `mz-voter`, `mz-autosave` and
the saved positions; on the server the hashed ballots, the one-day play log
and the one-hour throttle. Anything new that is stored in the browser or on
the server needs a line there (and must be something the visitor asked for,
or it needs consent). Contact: privacy@mzpico.com.

## Discoverability

The build emits everything crawlers and LLM clients need, from the rendered
output — new pages and new languages need no edit here:

- `sitemap.xml` — every page, with `xhtml:link` alternates cross-linking the
  four languages, referenced from `robots.txt`.
- `llms.txt` — a plain-text entry point: what the catalog is, the curated
  titles, and pointers to `manifest.json` and the repository.
- JSON-LD — `VideoGame` + `BreadcrumbList` per title, `WebSite` (with a
  `SearchAction` that the homepage honours as `/?q=…`) and `ItemList` on the
  homepage, `Product` on the card page.
- Open Graph / Twitter cards — 1200x630 preview images per curated title.

The preview images are generated offline, like the MZ font:

```
python3 tools/og/build-og.py     # site/public/og/<slug>.png from the 02-* screenshot
```

Re-run it after adding or replacing screenshots, and commit the result.
`site/public/og-default.png` is the site-wide fallback card.

After a production deploy, `npm run indexnow` pings IndexNow (Bing, Seznam,
Yandex) with the URLs from the live sitemap, instead of waiting for a crawl.
It authenticates with the key file in `site/public/` — keep that file where
it is, or the submissions are rejected.

## manifest.json (device API)

`manifest.json` at the site root is the machine-readable index consumed
by MZPico firmware. **Its shape is a contract** — firmware in the field
parses it. Do not change the format casually: any change to key names,
types or semantics must bump `format` (`MANIFEST_FORMAT` in
`scripts/build-manifest.mjs`, which also self-checks the key set) and be
called out explicitly in the pull request.

Format 1:

```json
{
  "format": 1,
  "generated": "2026-08-31T12:00:00.000Z",
  "titleCount": 1,
  "fileCount": 1,
  "titles": [
    {
      "slug": "snakesn",
      "title": "Snake & Snake",
      "machine": "mz-700",
      "year": 1983,
      "files": [
        {
          "path": "/files/snakesn/snakesn.mzf",
          "name": "SNAKE&SNAKE EXP1",
          "kind": "standard",
          "size": 29056,
          "crc32": "e1d7fc1a"
        }
      ]
    }
  ]
}
```

- `path` is absolute on the catalog origin (resolve against the host the
  manifest was fetched from); `mode` and `year` are present only when
  known.
- `name` is the file name stored in the MZF header; `size` is the whole
  file including the 128-byte header; `crc32` is the standard CRC-32
  (IEEE / zlib) of the whole file as 8 lowercase hex digits.
- Titles are sorted by slug; files keep the order of `meta.yaml`.
- Served with `Access-Control-Allow-Origin: *` and a 5-minute cache.

The legacy Pico API (`GET /list?path=…`, `GET /download?path=…`) is to
be replaced by this file plus static GETs. Until then,
`workers/api-shim/` (a small Cloudflare Worker on `api.mzpico.com`)
answers it from `legacy-api.json`, the build-generated tree the card
browses as `cloud:/` — deliberately *not* part of the manifest contract.

The tree is built by `scripts/lib/device-tree.mjs` from the metadata, not
from the legacy `folder …` note in `source`:

| folder | what goes there |
|---|---|
| `featured/` | `web: true` — the same picks as the front page (also listed in their machine folder) |
| `mz-800/` | MZ-800 titles without `port` |
| `mz-800-zx/` | MZ-800 titles with `port: zx-spectrum` |
| `mz-700/` | MZ-700 titles |
| `languages/` | `genre` includes `language` |
| `tools/` | only non-game genres (`utility`, `system`, …) |

File names are the titles, made safe for the card: `Alien_Highway.mzf`,
`3D_Noughts_and_Crosses.mzf`, `Hlipa.mzf`. The firmware sets hard limits
and the build fails rather than ship a tree that crosses one:

- the path goes into the request URL unescaped — names use only
  `A–Z a–z 0–9 . _ -`
- a name of 32 characters or more is silently dropped
- a folder holds at most 256 entries, `..` included
- a listing's JSON must fit a 16 KB buffer
- a file over 49 024 bytes never finishes loading (such files are left out
  of the tree, with a warning)

The card sorts listings itself (folders first, then case-insensitive), so
the order in the JSON does not matter.

The shim only serves what the tree holds, so layout changes need a site
deploy and nothing else. If the shim itself changes, deploy it with
`npx wrangler deploy -c workers/api-shim/wrangler.jsonc` (it reads the tree
from production) and try it locally against staging first:
`npx wrangler dev -c workers/api-shim/wrangler.jsonc --var CATALOG_ORIGIN:https://staging.mzpico.com`.

## Deployment

Cloudflare Workers (static assets) via the git-connected build:

| setting | value |
|---|---|
| build command | `npm run build` |
| deploy command | `npx wrangler deploy` (uses `wrangler.jsonc` → `site/dist`) |
| Node version | `22` (from `.nvmrc`; set env `NODE_VERSION=22` if needed) |
| custom domain | `mzpico.com` (Worker → Settings → Domains & Routes) |

Response headers (download disposition for `.mzf`, long cache for hashed
assets and screenshots, CORS for `manifest.json` and files) come from
`site/public/_headers`. Never reference the `*.pages.dev` host anywhere —
links, config and the manifest use the custom domain or relative paths.

## Legal and takedown

The files here are preserved for archival, educational and emulation
purposes; most are decades old and their original distributors no
longer exist. If you hold rights to a title and want it removed,
credited differently, or documented more accurately, open an issue at
https://github.com/MZPico/mz-catalog/issues (or contact the maintainers
via the repository). Verified requests are handled promptly.

<!-- TODO(maintainer): add a direct takedown e-mail address here if you
     want one published in addition to GitHub issues. -->

## License

Repository code and metadata are licensed under Apache-2.0 (see
`LICENSE`). The preserved binaries under `titles/` remain the property
of their respective rights holders.
