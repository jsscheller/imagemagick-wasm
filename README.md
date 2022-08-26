# imagemagick-wasm

`imagemagick` compiled to WASM via Emscripten. This doesn't expose the `imagemagick` library - just the CLI.

```sh
npm install --save @jspawn/imagemagick-wasm
```

Notable supported features:

- JPEG image format (via jpeg-turbo)
- PNG image format
- TIFF image format
- WEBP image format
- Colorspace management (via lcms)
- Fourier Transforms (via fftw)
- Text

Notable missing features:

- Liquid rescaling
- SVG
- Probably other image formats for which the delegate library is missing

## Examples

### Node

**index.mjs**

```javascript
// Or `const createModule = require("@jspawn/imagemagick-wasm");`
import createModule from "@jspawn/imagemagick-wasm";

// Returns an Emscripten "Module": https://emscripten.org/docs/api_reference/module.html
// NOTE: only parts of the Module object are exposed due to minification - see `build.sh`.
const magick = await createModule();
magick.FS.mkdir("/working");
magick.FS.mount(magick.NODEFS, { root: "." }, "/working");
magick.FS.chdir("/working");

// Writes a blank image to `blue.png`.
magick.callMain(["-size", "100x100", "xc:blue", "blue.png"]);
```

Run with:

```sh
# Depending on your version of node, you may not need the experimental flag.
node --experimental-wasm-bigint index.mjs
```

### Browser

Note: you probably don't want to run this on the main thread as it will block. See the `examples` directory for an example using a worker.

```javascript
import createModule from "https://unpkg.com/@jspawn/imagemagick-wasm/magick.mjs";

// Returns an Emscripten "Module": https://emscripten.org/docs/api_reference/module.html
// NOTE: only parts of the Module object are exposed due to minification - see `build.sh`.
const magick = await createModule({
  // Tell Emscripten where the WASM file is located.
  locateFile: () => "https://unpkg.com/@jspawn/imagemagick-wasm/magick.wasm",
});

// Writes a blank image to `blank.png` (via Emscripten's in-memory filesystem).
magick.callMain(["-size", "100x100", "xc:blue", "blue.png"]);

// Read the file to a blob.
const pngBuf = magick.FS.readFile("blue.png");
const pngBlob = new Blob([pngBuf], { type: "image/png" });
```

