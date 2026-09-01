#!/bin/bash
# Cross-build mz800emu's dependency chain for Emscripten into ~/src/wasm-sysroot
set -e
export PATH=$PATH:~/.local/bin
source ~/src/emsdk/emsdk_env.sh >/dev/null 2>&1
SYS=~/src/wasm-sysroot
SP="$(dirname "$0")"
export PKG_CONFIG_PATH=$SYS/lib/pkgconfig:$SYS/share/pkgconfig
export PKG_CONFIG_LIBDIR=$SYS/lib/pkgconfig

echo "=== zlib (emscripten port) ==="
embuilder build zlib

echo "=== SDL3 ==="
cd ~/src/SDL3-3.4.14
emcmake cmake -B build-wasm -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$SYS \
  -DSDL_SHARED=OFF -DSDL_STATIC=ON -DSDL_TEST_LIBRARY=OFF -DSDL_PTHREADS=ON > /dev/null
cmake --build build-wasm -j"$(nproc)" > $SP/sdl3-wasm.log 2>&1
cmake --install build-wasm > /dev/null
echo "sdl3 ok"

echo "=== SDL3_image ==="
cd ~/src/SDL3_image-3.4.4
emcmake cmake -B build-wasm -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$SYS \
  -DBUILD_SHARED_LIBS=OFF -DSDL3IMAGE_VENDORED=OFF -DSDL3IMAGE_AVIF=OFF -DSDL3IMAGE_WEBP=OFF \
  -DSDL3IMAGE_TIF=OFF -DSDL3IMAGE_JXL=OFF -DCMAKE_PREFIX_PATH=$SYS -DCMAKE_FIND_ROOT_PATH=$SYS -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_INCLUDE=BOTH > /dev/null
cmake --build build-wasm -j"$(nproc)" > $SP/sdlimg-wasm.log 2>&1
cmake --install build-wasm > /dev/null
echo "sdl3_image ok"

echo "=== minizip-ng ==="
cd ~/src/minizip-ng
emcmake cmake -B build-wasm -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$SYS \
  -DMZ_COMPAT=OFF -DMZ_ZSTD=OFF -DMZ_BZIP2=OFF -DMZ_LZMA=OFF -DMZ_PPMD=OFF \
  -DMZ_PKCRYPT=OFF -DMZ_WZAES=OFF -DMZ_OPENSSL=OFF -DMZ_LIBBSD=OFF -DBUILD_SHARED_LIBS=OFF -DCMAKE_FIND_ROOT_PATH=$SYS -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_INCLUDE=BOTH > /dev/null
cmake --build build-wasm -j"$(nproc)" > $SP/minizip-wasm.log 2>&1
cmake --install build-wasm > /dev/null
echo "minizip ok"

echo "=== glib ==="
cd ~/src/glib-2.82.5
meson setup build-wasm --cross-file $SP/emscripten-cross.ini --prefix=$SYS \
  -Dtests=false -Dglib_debug=disabled -Dintrospection=disabled -Ddocumentation=false \
  -Dxattr=false -Dselinux=disabled -Dlibmount=disabled -Dman-pages=disabled -Dnls=disabled \
  > $SP/glib-setup.log 2>&1 || { tail -30 $SP/glib-setup.log; exit 1; }
ninja -C build-wasm > $SP/glib-build.log 2>&1 || { tail -30 $SP/glib-build.log; exit 1; }
ninja -C build-wasm install > /dev/null
echo "glib ok"

echo "=== json-glib ==="
cd ~/src/json-glib-1.10.6
meson setup build-wasm --cross-file $SP/emscripten-cross.ini --prefix=$SYS \
  -Dintrospection=disabled -Dgtk_doc=disabled -Dtests=false -Dnls=disabled \
  > $SP/jsonglib-setup.log 2>&1 || { tail -30 $SP/jsonglib-setup.log; exit 1; }
ninja -C build-wasm > $SP/jsonglib-build.log 2>&1 || { tail -30 $SP/jsonglib-build.log; exit 1; }
ninja -C build-wasm install > /dev/null
echo "json-glib ok"
echo "=== ALL DEPS DONE ==="
ls $SYS/lib/pkgconfig/
