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

## Phase 4 — emulator (first pass done 2026-09-01)
Done: Emscripten port of mz800emu v2 (SDL3 + ImGui + GLib cross-built to
wasm) — every MZ-700/MZ-800 title page has a ▶ Play button that boots
the MZ-800 in the browser and autoloads the tape image
(`site/src/pages/play/[slug].astro`, assets in `site/public/play/emu/`,
COOP/COEP headers on `/play/*`). Kiosk mode (no emulator hotkeys, menus
or dialogs), instant autostart from the catalog, fullscreen and restart
buttons. Performance: emulation is paced by the SDL audio callback, so
SDL's Emscripten backend is patched to allow small buffers
(`tools/wasm/`), otherwise it caps at ~21 fps. The `--run-mzf` bootstrap
was brought to parity with what the monitor ROM leaves behind at program
entry (captured over the emulator's MCP debug API on the real ROM path):
8255 PC0 sound unmask, IM 1 + EI, entry registers, RST 38h vector and
work variables, cleared MZ-700 text screen (0x71 attributes) — fixes
silent MZ-700 games, frozen cursors and striped screens. Also fixed an
emulator bug where any 8255 PA7 pulse reset the 556 cursor timer
(1Z-016 BASIC cursor never blinked). The emulator source changes are
published on the `wasm` branch of https://github.com/MZPico/mz800emu
(pushed 2026-09-01) and mirrored as a patch series in
`tools/wasm/patches/` (the GPL "corresponding source").
Mobile: the SDL window is fixed-size (SDL's Emscripten backend otherwise
shrinks the GL buffer to the CSS size on every resize event) and the
screen is drawn by an attribute-less GL triangle instead of ImGui's quad
(a Samsung Xclipse/ANGLE-Vulkan driver rendered half the quad with
zeroed vertex attributes); `?debug=1` shows on-page diagnostics.
Touch: on-screen pad + buttons on phones, per-title layouts via the
optional `touch:` block in meta.yaml (`?touchspec=` previews one).
Remaining: upstream the patches (SDL hint fix, PA7 fix, bootstrap
parity), populate `touch:` for titles that need more than
cursor/Space/Enter, keyboard/virtual-keyboard UX and touch controls,
MZ-700 build variant for pure MZ-700 titles, residual audio crackle on
slow machines.
## Infra notes
- Site + files: Cloudflare Workers static assets (git-connected build),
  live at https://mzpico.com since 2026-09-01 — never hardcode
  *.workers.dev anywhere. HTTP→HTTPS redirect on for the site;
  api.mzpico.com exempted (devices speak plain HTTP).
- Legacy: Oracle micro VM currently serves the Pico API
  (`GET /list?path=…` → `{"path","folders":[],"files":[{"name","size"}]}`,
  `GET /download?path=…`). Replacement is ready: `workers/api-shim/`
  emulates it byte-compatibly from the static catalog (`legacy-api.json`).
  CUT OVER 2026-09-01 — api.mzpico.com is served by the Worker shim
  (note: the firmware parses /download bodies as HTTP chunked framing,
  which nginx always produced — the shim frames the file as one chunk
  itself; fixed 2026-09-01 after the card could browse but not load);
  rollback = flip the `api` record back to DNS-only. Oracle VM + bucket
  stay up as the safety net until a real card has loaded through the
  shim, then retire them.
