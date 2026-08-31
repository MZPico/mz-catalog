# Roadmap

## Phase 1 — skeleton (done)
Repo structure, schema + CI validation, Astro site with per-title pages
and Pagefind search, manifest generator, one example title, Cloudflare
Pages `_headers` (.mzf as attachment, long cache for images), README
with contribution guide + takedown contact.

## Phase 2 — content (in progress)
Done: migrated the full legacy cloud catalog (api.mzpico.com, backed by
Oracle Object Storage) into `titles/` — 378 files, byte-exact, with
bootstrap meta.yaml stubs marked `# TODO: verify/curate`; MZ machine
info pages (`/machines/`). Done: first-pass screenshots via mz800emu v2
headless MCP backend (`scripts/capture-screenshots.mjs`) — auto-captured
title + gameplay shots for 249 of 379 titles, every image visually
reviewed; generic screens (boot menu, blank, loader noise) removed.
Remaining: metadata curation (titles, years, publishers, languages,
descriptions); screenshots for the ~130 titles whose programs need
interactive/tape loading; replacing weak auto-shots with curated ones.

## Phase 3 — tape audio (done except turbo)
Done: client-side MZF→WAV (`site/src/lib/mzf2wav.js`) synthesizing the
Sharp PWM tape encoding — pulse widths, block layout and bit-count
checksums taken from mz800emu's mztape source; verified by decoding the
generated waveform back to byte-identical data. Web Audio playback and
WAV download on every title page, with polarity-invert and pilot/layout
knobs (fast short-pilot vs authentic with header/file retry copies).
Remaining: Czech turbo-loader variants (2400+ Bd second stage).

## Phase 4 — emulator
Browser MZ-800 emulation, "Play online" per title. Preferred: Emscripten
port of mz800emu core (now SDL3 + ImGui, both Emscripten-friendly) —
coordinate with upstream author first. Fallback: MAME mz800 driver via
Emscripten.

## Infra notes
- Site + files: Cloudflare Workers static assets (git-connected build),
  live at https://mzpico.com since 2026-09-01 — never hardcode
  *.workers.dev anywhere. HTTP→HTTPS redirect on for the site;
  api.mzpico.com exempted (devices speak plain HTTP).
- Legacy: Oracle micro VM currently serves the Pico API
  (`GET /list?path=…` → `{"path","folders":[],"files":[{"name","size"}]}`,
  `GET /download?path=…`); to be replaced by manifest.json + static GETs
  (optionally a CF Worker shim mimicking the old API during transition).
