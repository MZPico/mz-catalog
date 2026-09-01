#!/bin/bash
# Configure + build mz800emu for the browser (Emscripten), using ~/src/wasm-sysroot deps.
set -e
source ~/src/emsdk/emsdk_env.sh >/dev/null 2>&1
SYS=~/src/wasm-sysroot
export PKG_CONFIG_PATH=$SYS/lib/pkgconfig:$SYS/share/pkgconfig
export PKG_CONFIG_LIBDIR=$SYS/lib/pkgconfig
cd ~/src/mz800emu
LINK="-O3 -L$SYS/lib -lmzwasmstubs -lresolv -sUSE_ZLIB=1 -pthread --preload-file $HOME/src/mz800emu/ui_resources/imgui/fonts/DroidSans.ttf@/ui_resources/imgui/fonts/DroidSans.ttf --preload-file $HOME/src/mz800emu/ui_resources/imgui/fonts/Cousine-Regular.ttf@/ui_resources/imgui/fonts/Cousine-Regular.ttf --preload-file $HOME/src/mz800emu/ui_resources/imgui/symbols@/ui_resources/imgui/symbols --preload-file $HOME/src/mz800emu/ui_resources/imgui/images@/ui_resources/imgui/images -sINITIAL_MEMORY=256MB -sPTHREAD_POOL_SIZE=8 -sUSE_WEBGL2=1 -sFULL_ES3=1 -sMIN_WEBGL_VERSION=2 -sEXIT_RUNTIME=0 -sSTACK_SIZE=1MB -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,addFunction,removeFunction -sALLOW_TABLE_GROWTH=1"
emcmake cmake -B build-wasm-release -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DMZ_BUILD_MZ800=ON -DMZ_BUILD_MZ1500=OFF -DMZ_BUILD_MZ700_PAL=OFF -DMZ_BUILD_MZ700_NTSC=OFF \
  -DBUILD_TESTING=OFF -DMZ_NO_DEBUGGER=ON -DMZ_NO_MCP=ON -DMZ_NO_MCP_TCP=ON \
  -DCMAKE_EXECUTABLE_SUFFIX=".html" -DCMAKE_PREFIX_PATH=$SYS -DCMAKE_FIND_ROOT_PATH=$SYS -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_INCLUDE=BOTH \
  -DCMAKE_C_FLAGS="-pthread -O2 -sUSE_ZLIB=1 -Wno-incompatible-function-pointer-types -Wno-incompatible-pointer-types -Wno-int-conversion" -DCMAKE_CXX_FLAGS="-pthread -O2 -sUSE_ZLIB=1 -Wno-incompatible-function-pointer-types" \
  -DCMAKE_EXE_LINKER_FLAGS="$LINK" "$@"
cmake --build build-wasm-release --target mz800emu -j"$(nproc)"
ls -la build-wasm-release/build-mz800emu/ | head
