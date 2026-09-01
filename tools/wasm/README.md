# Building the browser emulator (mz800emu → WebAssembly)

Offline, one-time recipe (not part of the site build). Requires Emscripten
≥ 6.0 (`~/src/emsdk`), meson, ninja, cmake, and source trees under `~/src/`:
`SDL3-3.4.14`, `SDL3_image-3.4.4`, `minizip-ng`, `libffi-3.8.0`,
`glib-2.82.5`, `json-glib-1.10.6`, and the `wasm` branch of mz800emu.

1. Apply `sdl3-emscripten-audio-buffer.patch` to the SDL3 tree.
2. Compile the stub archives once into the sysroot:
   `emcc -pthread -O2 -c stubs/resolv_stub.c && emar rcs $SYS/lib/libresolv.a resolv_stub.o`
   (same for `spawn_stub.c` → `libmzwasmstubs.a`).
3. `./build-wasm-deps.sh` — zlib, SDL3, SDL3_image, minizip-ng, glib, json-glib
   (libffi first: `emconfigure ./configure --host=wasm32-unknown-emscripten`).
4. `./build-mz800emu-wasm.sh` — emits `mz800emu.{js,wasm,data}`; copy them to
   `site/public/play/emu/`.

Testing: `coop-server.py <dir> <port>` serves with the COOP/COEP headers the
pthread build needs; drive a headful Chromium (`--remote-debugging-port=9222
--autoplay-policy=no-user-gesture-required`) with `cdp-play.mjs` /
`cdp-probe.mjs`. Headless Chromium does not deliver animation frames to the
emulator — it only looks hung. `cdp-worker-profile.mjs` CPU-profiles the
pthread workers (build with `--profiling-funcs` for symbol names).

## Emulator patch series (`patches/`)

The shipped `mz800emu.{js,wasm,data}` are built from upstream
[mz800emu](https://github.com/michalhucik/mz800emu) at commit `cfe2bb3acd19`
(2026-08-24) plus the patches in `patches/`, in order (`git am patches/*.patch`
on a checkout of that commit reproduces the `wasm` branch, which is also
published at https://github.com/MZPico/mz800emu/tree/wasm). They contain the
Emscripten port (main loop, GLES 3.0 context, no curl/version check, audio
callback and screen-upload changes, ImGui backend tweaks), `--kiosk`,
`--cmthack-autofile`, the 8255 PA7/556 cursor-timer fix and the `--run-mzf`
bootstrap fixes that reproduce the monitor ROM's program-entry state, a
fixed-size SDL window (the Emscripten backend would follow browser resize
events and shrink the GL buffer to the CSS size) and an attribute-less GL
screen blit (`MZ_WASM_IMGUI_QUAD=1` restores ImGui's quad, which a Samsung
Xclipse 940 / ANGLE-Vulkan driver renders half-corrupted).

Native debugging recipe used for the bootstrap work: build natively
(`cmake --build build --target mz800emu`), run the GUI under WSLg with
`--kiosk --mcp-tcp-port 23800` (kiosk avoids modal dialogs that block the
MCP channel; delete `mz800-breakpoints.bpt` between runs — breakpoints
persist), load through the real ROM with `--cmthack-autofile <mzf>` + key
`C`, `bp_add` at the exec address, then compare `get_periph_*`,
`get_cpu_interrupt_bus`, `mem_read` and the VRAM snapshot written by
`trace_start cputrack` + `trace_save` against a `--run-mzf` run.
