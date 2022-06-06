import createModule from "https://unpkg.com/@jspawn/imagemagick-wasm/magick.mjs";

(async () => {
  const magick = await createModule({
    // Tell Emscripten where the WASM file is located.
    locateFile: () => "https://unpkg.com/@jspawn/imagemagick-wasm/magick.wasm",
  });

  // Use `FS.createLazyFile` to create a file which reads from a URL.
  magick.FS.createLazyFile("/", "sample.jpg", "sample.jpg", true, false);

  magick.callMain(["sample.jpg", "out.png"]);

  const pngBuf = magick.FS.readFile("out.png");
  const pngBlob = new Blob([pngBuf], { type: "image/png" });

  // Send to main for a preview.
  postMessage(pngBlob);

  // Use `FS.mount` to create a file which reads from a blob.
  // `FS.mount` doesn't work at the root so we need to create a new directory.
  magick.FS.mkdir("/working");
  magick.FS.mount(
    magick.WORKERFS,
    {
      blobs: [{ name: "sample.png", data: pngBlob }],
    },
    "/working"
  );

  magick.callMain(["working/sample.png", "out.webp"]);

  const webpBuf = magick.FS.readFile("out.webp");
  const webpBlob = new Blob([webpBuf], { type: "image/webp" });

  // Send to main for a preview.
  // Note: some browsers don't support webp.
  postMessage(webpBlob);
})();
