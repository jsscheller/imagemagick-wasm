import * as path from "path";
import * as fs from "fs/promises";
import { run } from "runish";

const LIB_DIR = path.resolve("./lib");
const ASSETS_DIR = path.resolve("./assets");

async function main() {
  await fs.mkdir(LIB_DIR, { recursive: true });

  const libs = [
    [
      "ImageMagick",
      "https://github.com/ImageMagick/ImageMagick",
      "82572afc879b439cbf8c9c6f3a9ac7626adf98fb",
    ],
    [
      "fftw",
      "https://github.com/rust-math/fftw",
      "fdd5c3b6c45c0ca26d71e52dd783c845b76a4c6a",
    ],
    [
      "freetype",
      "https://github.com/freetype/freetype",
      "42608f77f20749dd6ddc9e0536788eaad70ea4b5",
    ],
    [
      "jpeg-turbo",
      "https://github.com/libjpeg-turbo/libjpeg-turbo",
      "7723f50f3f66b9da74376e6d8badb6162464212c",
    ],
    [
      "png",
      "https://github.com/pnggroup/libpng",
      "640204280f8109d7165f95d2b177f89baf20b253",
    ],
    [
      "lcms",
      "https://github.com/mm2/Little-CMS",
      "5176347635785e53ee5cee92328f76fda766ecc6",
    ],
    [
      "tiff",
      "https://gitlab.com/libtiff/libtiff.git",
      "9dff73bebc5661f2dace6f16e14cf9e857172f4e",
    ],
    [
      "webp",
      "https://github.com/webmproject/libwebp",
      "a4d7a715337ded4451fec90ff8ce79728e04126c",
    ],
    [
      "zlib",
      "https://github.com/madler/zlib",
      "51b7f2abdade71cd9bb0e7a373ef2610ec6f9daf",
    ],
    [
      "aom",
      "https://aomedia.googlesource.com/aom/",
      "10aece4157eb79315da205f39e19bf6ab3ee30d0",
    ],
    [
      "libheif",
      "https://github.com/strukturag/libheif",
      "5e9deb19fe6b3768af0bb8e9e5e8438b15171bf3",
    ],
    [
      "highway",
      "https://github.com/google/highway",
      "457c891775a7397bdb0376bb1031e6e027af1c48",
    ],
    [
      "brotli",
      "https://github.com/google/brotli",
      "ed738e842d2fbdf2d6459e39267a633c4a9b2f5d",
    ],
    [
      "libjxl",
      "https://github.com/libjxl/libjxl",
      "794a5dcf0d54f9f0b20d288a12e87afb91d20dfc",
    ],
    [
      "libxml2",
      "https://github.com/GNOME/libxml2",
      "8d509f483dd5ce268b2fded9c738132c47d820d8",
    ],
  ];
  for (const [name, repo, hash] of libs) {
    process.chdir(LIB_DIR);
    await gitClone(name, repo, hash);
  }

  await fs.mkdir(ASSETS_DIR, { recursive: true });

  // https://usage.imagemagick.org/img_photos/INDEX.html
  const assets = [
    ["lena_orig.png", "https://usage.imagemagick.org/img_photos/lena_orig.png"],
    [
      "building_orig.jpg",
      "https://usage.imagemagick.org/img_photos/building_orig.jpg",
    ],
    ["1.webp", "https://www.gstatic.com/webp/gallery/1.webp"],
    [
      "dice.qoi",
      "https://github.com/keijiro/UnityRustQoi/raw/5a59410d9b949ab0ff8f87867d494cfd46b93166/Assets/TestImages/dice.qoi.bytes",
    ],
    [
      "sample.avif",
      "https://github.com/AOMediaCodec/libavif/raw/c1003e864ce4ec0511143c3bca06c5ee1634e98e/tests/data/io/kodim03_yuv420_8bpc.avif",
    ],
    [
      "cafe.jxl",
      "https://github.com/libjxl/conformance/raw/d00bbf209552bbbb569a79d49d33de196708dae1/testcases/cafe/input.jxl",
    ],
    [
      "bali.tif",
      "https://github.com/tlnagy/exampletiffs/raw/0b1a860c9c4789786c47351b1707ca33554d9323/bali.tif",
    ],
  ];
  for (const [name, url] of assets) {
    await download(name, url);
  }
}

async function gitClone(name, repo, hash) {
  const exists = await fs
    .access(name)
    .then(() => true)
    .catch(() => false);
  if (exists) return;

  console.log(`git cloning ${name} - ${repo} - ${hash}`);
  await run("git", ["init", name]);
  process.chdir(path.join(LIB_DIR, name));
  await run("git", ["fetch", "--depth", "1", repo, hash]);
  await run("git", ["checkout", "FETCH_HEAD"]);
}

async function download(name, url) {
  console.log(`downloading ${name} - ${url}`);
  const buf = await fetch(url).then((x) => x.arrayBuffer());
  const filePath = path.join(ASSETS_DIR, name);
  await fs.writeFile(filePath, Buffer.from(buf));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
