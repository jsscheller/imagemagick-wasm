import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import * as fss from "fs";
import { run } from "runish";

const OUT_DIR = path.resolve("./out");
const LIB_DIR = path.resolve("./lib");
const JS_DIR = path.resolve("./js");
const NPROC = Math.min(os.cpus().length, 5);
const { RELEASE } = process.env;

async function main() {
  const PKG_CONFIG_PATH = `${OUT_DIR}/lib/pkgconfig`;
  let CFLAGS = "-pthread -sUSE_PTHREADS -msimd128";
  if (RELEASE) {
    CFLAGS += " -Oz -flto";
  } else {
    CFLAGS += " -Os --profiling";
  }
  Object.assign(process.env, {
    CPPFLAGS: `-I${OUT_DIR}/include`,
    LDFLAGS: `-L${OUT_DIR}/lib --bind`,
    PKG_CONFIG_PATH,
    EM_PKG_CONFIG_PATH: PKG_CONFIG_PATH,
    CFLAGS,
    CXXFLAGS: CFLAGS,
    TOOLCHAIN_FILE: `${process.env.EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake`,
    STRIP: "llvm-strip",
  });

  await fs.mkdir(OUT_DIR, { recursive: true });

  const libs = [
    ["zlib", buildZlib],
    ["jpeg-turbo", buildJpegTurbo],
    ["png", buildPng],
    ["tiff", buildTiff],
    ["webp", buildWebp],
    ["fftw", buildFftw],
    ["lcms", buildLcms],
    ["freetype", buildFreetype],
    ["aom", buildAom],
    ["libheif", buildLibheif],
    ["highway", buildHighway],
    ["brotli", buildBrotli],
    ["libjxl", buildLibjxl],
    ["libxml2", buildLibXml2],
    ["ImageMagick", buildImageMagick],
  ];
  for (const [name, build] of libs) {
    console.log(`\n\n\nbuilding ${name}...\n\n\n`);
    process.chdir(path.join(LIB_DIR, name));
    await gitClean();
    if (fss.existsSync("configure")) {
      await run("chmod", ["+x", "configure"]);
    }
    await build();
  }

  process.chdir(path.join(LIB_DIR, "ImageMagick"));

  await run("/bin/bash", [
    "./libtool",
    "--silent",
    "--tag=CC",
    "--mode=link",
    "emcc",
    ...process.env.LDFLAGS.split(" "),
    ...process.env.CFLAGS.split(" "),
    ...(RELEASE
      ? ["--closure", "1"]
      : ["-sASSERTIONS=2", "-sSAFE_HEAP=1", "-sSTACK_OVERFLOW_CHECK=2"]),
    "--pre-js",
    path.join(JS_DIR, "pre.js"),
    "--post-js",
    path.join(JS_DIR, "post.js"),
    "-sALLOW_MEMORY_GROWTH=1",
    "-sEXPORTED_RUNTIME_METHODS=[callMain,FS,WORKERFS,ENV]",
    "-sINCOMING_MODULE_JS_API=[noInitialRun,noFSInit,locateFile,preRun,instantiateWasm,quit,noExitRuntime,onExit]",
    // Bug: https://github.com/emscripten-core/emscripten/issues/21844
    "-sEXPORTED_FUNCTIONS=_main,__emscripten_thread_crashed,__embind_initialize_bindings",
    "-sSTACK_SIZE=1MB",
    "-sNO_DISABLE_EXCEPTION_CATCHING=1",
    "-sMODULARIZE=1",
    "-sEXPORT_ES6=1",
    "-sEXPORT_NAME=init",
    "-sDYNAMIC_EXECUTION=0",
    "-sPTHREAD_POOL_SIZE=navigator.hardwareConcurrency",
    "-sENVIRONMENT=worker",
    // Use `locateFile` instead of `import.meta` (see `pre.js`)
    "-sUSE_ES6_IMPORT_META=0",
    "-sINITIAL_MEMORY=67108864",
    "-o",
    `${OUT_DIR}/magick.js`,
    "MagickCore/libMagickCore-7.Q16HDRI.la",
    "MagickWand/libMagickWand-7.Q16HDRI.la",
    "utilities/magick.o",
    "-lnodefs.js",
    "-lworkerfs.js",
    "-ltiff",
    "-lwebp",
    "-lwebpdemux",
    "-lwebpmux",
    "-lfftw3",
    "-lpng",
    "-ljpeg",
    "-lz",
    "-llcms2",
    "-lfreetype",
    "-lheif",
    "-laom",
    "-lembind",
    "-ljxl",
  ]);
}

async function buildZlib() {
  await run("emconfigure", ["./configure", `--prefix=${OUT_DIR}`, "--static"]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildJpegTurbo() {
  await run("emcmake", [
    "cmake",
    ".",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DENABLE_SHARED=off",
    "-DWITH_SIMD=1",
    "-DCMAKE_BUILD_TYPE=Release",
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildPng() {
  await run("autoreconf", ["-fiv"]);
  await run("emconfigure", [
    "./configure",
    `--prefix=${OUT_DIR}`,
    "--host=wasm32-unknown-emscripten",
    "--disable-mips-msa",
    "--disable-arm-neon",
    "--disable-powerpc-vsx",
    "--disable-shared",
    `CFLAGS=${process.env.CFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildTiff() {
  await run("autoreconf", ["-fiv"]);
  await run("emconfigure", [
    "./configure",
    `--prefix=${OUT_DIR}`,
    "--host=wasm32-unknown-emscripten",
    "--disable-shared",
    `CFLAGS=${process.env.CFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildWebp() {
  await run("autoreconf", ["-fiv"]);
  await run("emconfigure", [
    "./configure",
    `--prefix=${OUT_DIR}`,
    "--host=wasm32-unknown-emscripten",
    "--disable-shared",
    `CFLAGS=${process.env.CFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildFftw() {
  await run("emcmake", [
    "cmake",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DBUILD_SHARED_LIBS=0",
    "./fftw-src/fftw-3.3.8",
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
  await fs.cp(
    path.join(OUT_DIR, "lib/pkgconfig/fftw.pc"),
    path.join(OUT_DIR, "lib/pkgconfig/fftw3.pc"),
  );
}

async function buildLcms() {
  await run("autoreconf", ["-fiv"]);
  await run("emconfigure", [
    "./configure",
    `--prefix=${OUT_DIR}`,
    "--host=wasm32-unknown-emscripten",
    "--disable-shared",
    "--enable-static",
    "--disable-openmp",
    `CFLAGS=${process.env.CFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildFreetype() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "freetype", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    `-DZLIB_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DZLIB_LIBRARY=${path.join(OUT_DIR, "lib/libz.a")}`,
    "-DCMAKE_DISABLE_FIND_PACKAGE_BZip2=TRUE",
    "-DCMAKE_DISABLE_FIND_PACKAGE_PNG=TRUE",
    "-DBUILD_SHARED_LIBS=off",
    "-DCMAKE_BUILD_TYPE=Release",
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildAom() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "aom", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DCMAKE_BUILD_TYPE=Release",
    "-DENABLE_SHARED=OFF",
    "-DENABLE_STATIC=ON",
    "-DENABLE_NASM=OFF",
    "-DENABLE_DOCS=OFF",
    "-DENABLE_EXAMPLES=OFF",
    "-DENABLE_TESTDATA=OFF",
    "-DENABLE_TESTS=OFF",
    "-DENABLE_TOOLS=OFF",
    "-DCONFIG_RUNTIME_CPU_DETECT=0",
    "-DCONFIG_WEBM_IO=0",
    "-DCONFIG_PIC=0",
    "-DCONFIG_LIBYUV=0",
    "-DFORCE_HIGHBITDEPTH_DECODING=0",
    "-DCONFIG_AV1_DECODER=1",
    "-DCONFIG_AV1_ENCODER=1",
    "-DENABLE_CCACHE=OFF",
    "-DAOM_TARGET_CPU=generic",
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS} -DEMSCRIPTEN -D__EMSCRIPTEN__`,
    `-DCMAKE_CXX_FLAGS=${process.env.CXXFLAGS} -DEMSCRIPTEN -D__EMSCRIPTEN__`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildLibheif() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "libheif", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DCMAKE_BUILD_TYPE=Release",
    "-DBUILD_SHARED_LIBS=false",
    "-DWITH_EXAMPLES=false",
    "-DBUILD_TESTING=false",
    "-DENABLE_PLUGIN_LOADING=false",
    "-DWITH_JPEG_DECODER=false",
    "-DWITH_JPEG_ENCODER=false",
    "-DWITH_AOM_DECODER=ON",
    "-DWITH_AOM_ENCODER=ON",
    `-DAOM_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DAOM_LIBRARY=${path.join(OUT_DIR, "lib/libaom.a")}`,
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS}`,
    `-DCMAKE_CXX_FLAGS=${process.env.CXXFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildHighway() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "highway", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DBUILD_TESTING=off",
    "-DCMAKE_BUILD_TYPE=Release",
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS}`,
    `-DCMAKE_CXX_FLAGS=${process.env.CXXFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildBrotli() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "brotli", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DBROTLI_DISABLE_TESTS=true",
    "-DCMAKE_BUILD_TYPE=Release",
  ]);
  await run("emmake", [
    "cmake",
    "--build",
    ".",
    "--config",
    "Release",
    "--target",
    "install",
  ]);
}

async function buildLibjxl() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "libjxl", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DCMAKE_BUILD_TYPE=Release",
    "-DBUILD_SHARED_LIBS=false",
    "-DBUILD_TESTING=false",
    "-DJPEGXL_ENABLE_TOOLS=false",
    "-DJPEGXL_ENABLE_SKCMS=false",
    "-DJPEGXL_ENABLE_DOXYGEN=false",
    "-DJPEGXL_ENABLE_MANPAGES=false",
    "-DJPEGXL_ENABLE_SJPEG=false",
    "-DJPEGXL_ENABLE_EXAMPLES=false",
    "-DJPEGXL_ENABLE_BENCHMARK=false",
    "-DJPEGXL_ENABLE_FUZZERS=false",
    "-DJPEGXL_BUNDLE_LIBPNG=false",
    "-DJPEGXL_ENABLE_JPEGLI=false",
    "-DJPEGXL_ENABLE_JPEGLI_LIBJPEG=false",
    `-DHWY_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DHWY_LIBRARY=${path.join(OUT_DIR, "lib/libhwy.a")}`,
    `-DPNG_PNG_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DPNG_LIBRARY=${path.join(OUT_DIR, "lib/libpng.a")}`,
    `-DZLIB_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DZLIB_LIBRARY=${path.join(OUT_DIR, "lib/libz.a")}`,
    `-DLCMS2_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DLCMS2_LIBRARY=${path.join(OUT_DIR, "lib/liblcms2.a")}`,
    `-DBROTLI_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DBROTLICOMMON_LIBRARY=${path.join(OUT_DIR, "libbrotlicommon.a")}`,
    `-DBROTLIENC_LIBRARY=${path.join(OUT_DIR, "libbrotlienc.a")}`,
    `-DBROTLIDEC_LIBRARY=${path.join(OUT_DIR, "libbrotlidec.a")}`,
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS}`,
    `-DCMAKE_CXX_FLAGS=${process.env.CXXFLAGS}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildLibXml2() {
  await fs.mkdir("__build");
  process.chdir(path.join(LIB_DIR, "libxml2", "__build"));

  await run("emcmake", [
    "cmake",
    "..",
    `-DCMAKE_INSTALL_PREFIX=${OUT_DIR}`,
    "-DCMAKE_BUILD_TYPE=Release",
    "-DBUILD_SHARED_LIBS=off",
    `-DCMAKE_C_FLAGS=${process.env.CFLAGS}`,
    "-DLIBXML2_WITH_C14N=off",
    "-DLIBXML2_WITH_CATALOG=off",
    "-DLIBXML2_WITH_DEBUG=off",
    "-DLIBXML2_WITH_HTML=off",
    "-DLIBXML2_WITH_HTTP=off",
    "-DLIBXML2_WITH_ICONV=off",
    "-DLIBXML2_WITH_LZMA=off",
    "-DLIBXML2_WITH_OUTPUT=off",
    "-DLIBXML2_WITH_PATTERN=off",
    "-DLIBXML2_WITH_PYTHON=off",
    "-DLIBXML2_WITH_READER=off",
    "-DLIBXML2_WITH_REGEXPS=off",
    "-DLIBXML2_WITH_SCHEMAS=off",
    "-DLIBXML2_WITH_SCHEMATRON=off",
    "-DLIBXML2_WITH_TREE=off",
    "-DLIBXML2_WITH_VALID=off",
    "-DLIBXML2_WITH_WRITER=off",
    "-DLIBXML2_WITH_XINCLUDE=off",
    "-DLIBXML2_WITH_XPATH=off",
    "-DLIBXML2_WITH_XPTR=off",
    `-DZLIB_INCLUDE_DIR=${path.join(OUT_DIR, "include")}`,
    `-DZLIB_LIBRARY=${path.join(OUT_DIR, "lib/libz.a")}`,
  ]);
  await run("emmake", ["make", `-j${NPROC}`, "install"]);
}

async function buildImageMagick() {
  await run("autoreconf", ["-fiv"]);
  await run(
    "emconfigure",
    [
      "./configure",
      `--prefix=${OUT_DIR}`,
      "--host=wasm32-unknown-emscripten",
      "--disable-delegate-build",
      "--disable-shared",
      "--without-magick-plus-plus",
      "--without-perl",
      "--without-x",
      "--disable-largefile",
      "--disable-openmp",
      "--without-bzlib",
      "--without-dps",
      "--without-jbig",
      "--without-openjp2",
      "--with-lcms=yes",
      "--without-wmf",
      "--with-xml=yes",
      "--with-fftw=yes",
      "--without-flif",
      "--without-fpx",
      "--without-djvu",
      "--without-fontconfig",
      "--without-raqm",
      "--without-gslib",
      "--without-gvc",
      "--with-heic=yes",
      "--without-lqr",
      "--without-openexr",
      "--without-pango",
      "--without-raw",
      "--without-rsvg",
      "--with-jxl=yes",
      "--with-quantum-depth=16",
      "--disable-docs",
      "--enable-zero-configuration",
    ],
    {
      env: {
        ...process.env,
        // Unclear why these aren't included automatically.
        LDFLAGS: `${process.env.LDFLAGS} -lbrotlicommon -laom`,
      },
    },
  );
  await run("emmake", ["make", `-j${NPROC}`]);
}

async function gitClean() {
  await run("git", ["clean", "-xdf"]);
  await run("git", ["checkout", "."]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
