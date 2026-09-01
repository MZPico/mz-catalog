# mz800emu — browser build

Prebuilt WebAssembly build of [mz800emu](https://github.com/michalhucik/mz800emu)
by Michal Hučík (GNU GPL). Files: `mz800emu.js`, `mz800emu.wasm`,
`mz800emu.data` (ImGui fonts/resources).

Built with Emscripten from upstream mz800emu plus a small patch series
(Emscripten main loop, GLES context, no curl, kiosk mode, bootstrap
fixes). Source: the `wasm` branch at https://github.com/MZPico/mz800emu
(also mirrored as `tools/wasm/patches/` in github.com/MZPico/mz-catalog,
with the build recipe in `tools/wasm/README.md`) — the complete
corresponding source, as the GPL requires.

Sharp MZ ROM images embedded in the emulator are © Sharp Corporation and
are included for preservation and interoperability purposes.
