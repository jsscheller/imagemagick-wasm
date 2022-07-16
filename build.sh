#!/bin/bash
set -euo pipefail

fn_git_clean() {
  git clean -xdf
  git checkout .
}

OUT_DIR="$PWD/out"
ROOT="$PWD"
EMCC_FLAGS_DEBUG="-Os -g3"
EMCC_FLAGS_RELEASE="-Oz -flto"

export CPPFLAGS="-I$OUT_DIR/include"
export LDFLAGS="-L$OUT_DIR/lib"
export PKG_CONFIG_PATH="$OUT_DIR/lib/pkgconfig"
export EM_PKG_CONFIG_PATH="$PKG_CONFIG_PATH"
export CFLAGS="$EMCC_FLAGS_RELEASE"
export CXXFLAGS="$CFLAGS"

mkdir -p "$OUT_DIR"

cd "$ROOT/lib/zlib"
fn_git_clean
chmod +x ./configure
emconfigure ./configure --prefix="$OUT_DIR" --static
emmake make -j install

cd "$ROOT/lib/jpeg-turbo"
fn_git_clean
patch -p1 < ../../patches/jpeg-turbo.patch
emcmake cmake . \
  -DCMAKE_INSTALL_PREFIX="$OUT_DIR" \
  -DENABLE_SHARED=off \
  -DWITH_SIMD=0 \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS="$CFLAGS"
emmake make -j install

cd "$ROOT/lib/png"
fn_git_clean
autoreconf -fiv
chmod +x ./configure
emconfigure ./configure \
  --prefix="$OUT_DIR" \
  --disable-mips-msa \
  --disable-arm-neon \
  --disable-powerpc-vsx \
  --disable-shared \
  CFLAGS="$CFLAGS"
emmake make -j install

cd "$ROOT/lib/tiff"
fn_git_clean
patch -p1 < ../../patches/tiff.patch
autoreconf -fiv
chmod +x ./configure
emconfigure ./configure \
  --prefix="$OUT_DIR" \
  --disable-shared \
  CFLAGS="$CFLAGS"
emmake make -j install

cd "$ROOT/lib/webp"
fn_git_clean
autoreconf -fiv
chmod +x ./configure
emconfigure ./configure \
  --prefix="$OUT_DIR" \
  --disable-shared \
  CFLAGS="$CFLAGS"
emmake make -j install

cd "$ROOT/lib/fftw"
fn_git_clean
emcmake cmake \
  -DCMAKE_INSTALL_PREFIX="$OUT_DIR" \
  -DBUILD_SHARED_LIBS=0 \
  -j \
  --target fftw3 \
  ./fftw-src/fftw-3.3.8
emmake make -j install
cp "$OUT_DIR/lib/pkgconfig/fftw.pc" "$OUT_DIR/lib/pkgconfig/fftw3.pc"

cd "$ROOT/lib/lcms"
fn_git_clean
autoreconf -fiv
chmod +x ./configure
emconfigure ./configure \
  --prefix="$OUT_DIR" \
  --disable-shared \
  --enable-static \
  --without-threads \
  --disable-openmp \
  CFLAGS="$CFLAGS"
emmake make -j install

# TODO: compile glib - https://github.com/emscripten-core/emscripten/issues/11066
# glib requires threads
: '
cd "$ROOT/lib/lqr"
fn_git_clean
autoreconf -fiv
chmod +x ./configure
emconfigure ./configure \
  --prefix="$OUT_DIR" \
  --disable-shared \
  --enable-static \
  CFLAGS="$CFLAGS"
emmake make -j install
'

cd "$ROOT/lib/ImageMagick"
fn_git_clean
autoreconf -fiv
chmod +x ./configure
emconfigure ./configure \
  --prefix="$OUT_DIR" \
  --disable-delegate-build \
  --disable-shared \
  --without-threads \
  --without-magick-plus-plus \
  --without-perl \
  --without-x \
  --disable-largefile \
  --disable-openmp \
  --without-bzlib \
  --without-dps \
  --without-freetype \
  --without-jbig \
  --without-openjp2 \
  --with-lcms=yes \
  --without-wmf \
  --without-xml \
  --with-fftw=yes \
  --without-flif \
  --without-fpx \
  --without-djvu \
  --without-fontconfig \
  --without-raqm \
  --without-gslib \
  --without-gvc \
  --without-heic \
  --without-lqr \
  --without-openexr \
  --without-pango \
  --without-raw \
  --without-rsvg \
  --with-quantum-depth=16 \
  --disable-docs \
  --enable-zero-configuration
emmake make -j install

mkdir -p "$ROOT/dist"
cd "$ROOT/lib/ImageMagick"
/bin/bash ./libtool \
  --silent \
  --tag=CC \
  --mode=link \
  emcc \
  $LDFLAGS \
  $CFLAGS \
  --closure 1 \
  --pre-js "$ROOT/js/pre.js" \
  --post-js "$ROOT/js/post.js" \
  -s WASM_BIGINT=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='["callMain","FS","NODEFS","WORKERFS","ENV"]' \
  -s INCOMING_MODULE_JS_API='["noInitialRun","noFSInit","locateFile","preRun"]' \
  -s NO_DISABLE_EXCEPTION_CATCHING=1 \
  -s MODULARIZE=1 \
  -o "$ROOT/dist/magick.js" \
  "$OUT_DIR/lib/libMagickCore-7.Q16HDRI.a" \
  "$OUT_DIR/lib/libMagickWand-7.Q16HDRI.a" \
  "utilities/magick.o" \
  -lnodefs.js \
  -lworkerfs.js \
  -ltiff \
  -lwebp \
  -lwebpdemux \
  -lwebpmux \
  -lfftw3 \
  -lpng \
  -ljpeg \
  -lz \
  -llcms2

# fix for Emscripten bug which minifies the `spawnSync` command
sed -i 's/require("child_process").Kd/require("child_process").spawnSync/g' "$ROOT/dist/magick.js"
