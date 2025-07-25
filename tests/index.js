import { test } from "uvu";
import init from "/magick.js";
import * as assert from "uvu/assert";

let magick;

test("reads jpeg", async function () {
  await initMagick([await download("building_orig.jpg")]);
  magick.callMain(["input/building_orig.jpg", "output/test.png"]);
  assertExists("output/test.png");
});

test("reads png", async function () {
  await initMagick([await download("lena_orig.png")]);
  magick.callMain(["input/lena_orig.png", "output/test.jpg"]);
  assertExists("output/test.jpg");
});

test("reads webp", async function () {
  await initMagick([await download("1.webp")]);
  magick.callMain(["input/1.webp", "output/test.jpg"]);
  assertExists("output/test.jpg");
});

test("reads qoi", async function () {
  await initMagick([await download("dice.qoi")]);
  magick.callMain(["input/dice.qoi", "output/test.jpg"]);
  assertExists("output/test.jpg");
});

test("reads avif", async function () {
  await initMagick([await download("sample.avif")]);
  magick.callMain(["input/sample.avif", "output/test.jpg"]);
  assertExists("output/test.jpg");
});

test("reads jxl", async function () {
  await initMagick([await download("cafe.jxl")]);
  magick.callMain(["input/cafe.jxl", "output/test.jpg"]);
  assertExists("output/test.jpg");
});

test("reads tif", async function () {
  await initMagick([await download("bali.tif")]);
  magick.callMain(["input/bali.tif", "output/test.jpg"]);
  assertExists("output/test.jpg");
});

async function download(asset) {
  const blob = await fetch(`/assets/${asset}`).then((x) => x.blob());
  return new File([blob], asset, { type: blob.type });
}

async function initMagick(input) {
  magick = await init({
    locateFile: () => "/magick.wasm",
  });
  magick.FS.mkdir("/input");
  const mount = input[0] && input[0].data ? { blobs: input } : { files: input };
  magick.FS.mount(magick.WORKERFS, mount, "/input");
  magick.FS.mkdir("/output");
}

async function assertExists(path) {
  const buf = magick.FS.readFile(path);
  assert.ok(buf.length > 0);
}

test.run();
