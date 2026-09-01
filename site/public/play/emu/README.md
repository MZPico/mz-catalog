# mz800emu — browser build

Prebuilt WebAssembly build of [mz800emu](https://github.com/michalhucik/mz800emu)
by Michal Hučík (GNU GPL). Files: `mz800emu.js`, `mz800emu.wasm`,
`mz800emu.data` (ImGui fonts/resources).

Built with Emscripten from upstream mz800emu plus a small patch series
(Emscripten main loop, GLES context, no curl, kiosk mode, bootstrap
fixes). The patches and the exact upstream commit are published in the
catalog repository (github.com/MZPico/mz-catalog, `tools/wasm/patches/`
and `tools/wasm/README.md`) together with the build recipe — the complete
corresponding source, as the GPL requires.

Sharp MZ ROM images embedded in the emulator are © Sharp Corporation and
are included for preservation and interoperability purposes.
