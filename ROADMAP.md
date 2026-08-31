# Roadmap

## Phase 1 — skeleton (done)
Repo structure, schema + CI validation, Astro site with per-title pages
and Pagefind search, manifest generator, one example title, Cloudflare
Pages `_headers` (.mzf as attachment, long cache for images), README
with contribution guide + takedown contact.

## Phase 2 — content
Migrate MZF collection from Oracle Object Storage into `titles/`,
screenshots captured via mz800emu, MZ machine info pages.

## Phase 3 — tape audio
Client-side MZF→WAV: JS module synthesizing the Sharp PWM tape encoding
(short pulse = 0, long pulse = 1; header block + checksum + data block;
timing reference: mz800emu CMT source). Web Audio playback ("play into
the MZ tape jack from a phone") + WAV download. UI knobs: polarity
invert, pilot-tone length. Later: Czech turbo-loader variants.

## Phase 4 — emulator
Browser MZ-800 emulation, "Play online" per title. Preferred: Emscripten
port of mz800emu core (now SDL3 + ImGui, both Emscripten-friendly) —
coordinate with upstream author first. Fallback: MAME mz800 driver via
Emscripten.

## Infra notes
- Site + files: Cloudflare Pages, domain software.mzpico.org — never
  hardcode *.pages.dev anywhere.
- Legacy: Oracle micro VM currently serves the Pico API
  (`GET /list?path=…` → `{"path","folders":[],"files":[{"name","size"}]}`,
  `GET /download?path=…`); to be replaced by manifest.json + static GETs
  (optionally a CF Worker shim mimicking the old API during transition).
