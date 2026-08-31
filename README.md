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
   description: >
     Free-form text. Blank lines separate paragraphs on the site.
   controls: |
     Q/A/O/P  move
     SPACE    push
   source: https://example.org/where-the-dump-came-from
   ```

   | field | required | notes |
   |---|---|---|
   | `title` | yes | display name |
   | `year` | no | integer; omit if unknown |
   | `publisher` | no | publisher, author or group |
   | `genre` | yes | list; allowed values are in the schema (`game`, `arcade`, `adventure`, `puzzle`, `strategy`, `sports`, `simulation`, `rpg`, `text`, `demo`, `utility`, `language`, `education`, `music`, `graphics`, `system`, `other`) |
   | `machine` | yes | `mz-700`, `mz-800` or `mz-1500` |
   | `mode` | MZ-800 only | `native` or `mz-700` (compatibility mode); forbidden for other machines |
   | `language` | no | ISO 639 code of the software's UI language (`en`, `cs`, `de`, `ja`, …); omit if unknown |
   | `files[]` | yes | `path` (file name in the folder), `kind`, optional `note` |
   | `description` | no | free text, paragraphs separated by blank lines |
   | `controls` | no | key / joystick reference, shown verbatim |
   | `source` | no | provenance — URL or free text |

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
      "slug": "mzpico800",
      "title": "MZPico 800 Manager",
      "machine": "mz-800",
      "mode": "native",
      "year": 2025,
      "files": [
        {
          "path": "/files/mzpico800/mzpico800.mzf",
          "name": "MZPICO800",
          "kind": "standard",
          "size": 40986,
          "crc32": "1a2b3c4d"
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
be replaced by this file plus static GETs. During the transition,
`workers/api-shim/` (a small Cloudflare Worker on `api.mzpico.com`)
answers the old endpoints from `legacy-api.json` — a build-generated
folder map that is deliberately *not* part of the manifest contract.
Deploy: `npx wrangler deploy -c workers/api-shim/wrangler.jsonc`;
cutover = flip the `api` DNS record from the Oracle VM to proxied,
rollback = flip it back.

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
