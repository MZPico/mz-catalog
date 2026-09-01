# mz-catalog

Software catalog and preservation library for Sharp MZ series computers
(MZ-700/800/1500). Feeds both a public website and the MZPico hardware
card (RP2040-based storage card for the MZ-800).

## Layout
- `titles/<slug>/` — source of truth. One folder per software title:
  `meta.yaml`, one or more `.mzf` files, `screenshots/`.
  Flat structure; machine type is metadata, not hierarchy.
- `site/` — Astro static site. Reads `titles/` via content collections.
  Client-side search with Pagefind. `npm run build` must produce the
  complete deployable output in `site/dist` (pages + copied MZF files
  + screenshots + manifest.json).
- `scripts/build-manifest.mjs` — emits `manifest.json` (path, size,
  CRC32 per file). This is the machine API consumed by MZPico firmware.
- `scripts/validate.mjs` — validates every `titles/*/meta.yaml` against
  the schema plus file-level checks. Runs in CI and before every build.
- `schema/meta.schema.json` — JSON Schema for meta.yaml, enforced by
  CI on every PR.

## meta.yaml fields
title, year, publisher, genre[], machine (mz-700|mz-800|mz-1500),
mode (for MZ-800: native|mz-700), language, files[] {path, kind:
standard|turbo|alt-dump, note}, description, controls, source,
touch (optional: pad/buttons/extra for the phone overlay, see schema),
web (optional: true = shown on the site; absent = API-only).

## Rules
- Never modify or delete files under `titles/` unless explicitly asked.
- MZF files are preserved binaries — treat as immutable, never "fix" them.
- Keep dependencies minimal. Node 22, npm, no framework beyond Astro.
- Static-only output — no server runtime; deploys as a Cloudflare Worker
  with static assets (wrangler.jsonc, git-connected build).
- manifest.json format changes are breaking (device firmware consumes
  it) — flag them, don't just do them. `MANIFEST_FORMAT` in
  `scripts/build-manifest.mjs` must be bumped for any shape change.
- Site + files: Cloudflare Workers static assets, domain mzpico.com —
  never hardcode *.workers.dev anywhere. api.mzpico.com stays plain
  HTTP (DNS-only to Oracle today; a config rule exempts it from the
  zone's Always Use HTTPS for the future shim).

See ROADMAP.md for phases.
