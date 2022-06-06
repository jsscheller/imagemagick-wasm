const assert = require("assert");
const path = require("path");
const fs = require("fs/promises");
const Module = require("../dist/magick");

before(async function () {
  await fs.mkdir(path.join(__dirname, "out"), { recursive: true });
});

describe("colorspace", function () {
  it("gray", async function () {
    const code = await callMain(["assets/sample.jpg", "-colorspace", "Gray", "out/out.jpg"]);
    assert.equal(code, 0);
  });
});

describe("conversions", function () {
  it("png => jpeg", async function () {
    const code = await callMain(["assets/sample.png", "out/out.jpg"]);
    assert.equal(code, 0);
  });

  it("png => webp", async function () {
    const code = await callMain(["assets/sample.png", "out/out.webp"]);
    assert.equal(code, 0);
  });

  it("png => tiff", async function () {
    const code = await callMain(["assets/sample.png", "out/out.tiff"]);
    assert.equal(code, 0);
  });

  it("png => bmp", async function () {
    const code = await callMain(["assets/sample.png", "out/out.bmp"]);
    assert.equal(code, 0);
  });

  it("png => gif", async function () {
    const code = await callMain(["assets/sample.png", "out/out.gif"]);
    assert.equal(code, 0);
  });

  it("png => psd", async function () {
    const code = await callMain(["assets/sample.png", "out/out.psd"]);
    assert.equal(code, 0);
  });

  it("png => xcf", async function () {
    const code = await callMain(["assets/sample.png", "out/out.xcf"]);
    assert.equal(code, 0);
  });

  it("png => tga", async function () {
    const code = await callMain(["assets/sample.png", "out/out.tga"]);
    assert.equal(code, 0);
  });

  it("png => miff", async function () {
    const code = await callMain(["assets/sample.png", "out/out.miff"]);
    assert.equal(code, 0);
  });

  it("png => ico", async function () {
    const code = await callMain(["assets/sample.png", "-resize", "256x", "out/out.ico"]);
    assert.equal(code, 0);
  });

  it("png => dcm", async function () {
    const code = await callMain(["assets/sample.png", "out/out.dcm"]);
    assert.equal(code, 0);
  });

  it("png => xpm", async function () {
    const code = await callMain(["assets/sample.png", "out/out.xpm"]);
    assert.equal(code, 0);
  });

  it("png => pcx", async function () {
    const code = await callMain(["assets/sample.png", "out/out.pcx"]);
    assert.equal(code, 0);
  });

  it("png => fits", async function () {
    const code = await callMain(["assets/sample.png", "out/out.fits"]);
    assert.equal(code, 0);
  });

  it("png => ppm", async function () {
    const code = await callMain(["assets/sample.png", "out/out.ppm"]);
    assert.equal(code, 0);
  });

  it("png => pgm", async function () {
    const code = await callMain(["assets/sample.png", "out/out.pgm"]);
    assert.equal(code, 0);
  });

  it("png => pfm", async function () {
    const code = await callMain(["assets/sample.png", "out/out.pfm"]);
    assert.equal(code, 0);
  });

  it("png => mng", async function () {
    const code = await callMain(["assets/sample.png", "out/out.mng"]);
    assert.equal(code, 0);
  });

  it("png => hdr", async function () {
    const code = await callMain(["assets/sample.png", "out/out.hdr"]);
    assert.equal(code, 0);
  });

  it("png => dds", async function () {
    const code = await callMain(["assets/sample.png", "out/out.dds"]);
    assert.equal(code, 0);
  });

  it("png => otb", async function () {
    const code = await callMain(["assets/sample.png", "out/out.otb"]);
    assert.equal(code, 0);
  });

  it("png => psb", async function () {
    const code = await callMain(["assets/sample.png", "out/out.psb"]);
    assert.equal(code, 0);
  });

  it("jpeg => png", async function () {
    const code = await callMain(["assets/sample.jpg", "out/out.png"]);
    assert.equal(code, 0);
  });
});

let _cachedMod;
async function callMain(args) {
  if (!_cachedMod) {
    _cachedMod = await Module();
    const working = "/working";
    _cachedMod.FS.mkdir(working);
    _cachedMod.FS.mount(_cachedMod.NODEFS, { root: __dirname }, working);
    _cachedMod.FS.chdir(working);
  }

  return _cachedMod.callMain(args);
}
