import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);
const standAssetUrl = new URL(
  "../public/assets/effects/jp-tropical-guitar-stand-v2.png",
  import.meta.url,
);

function readPngHeader(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("tropical guitar stand keeps the supplied high-resolution RGBA artwork", async () => {
  const header = readPngHeader(await readFile(standAssetUrl));

  assert.deepEqual(header, {
    width: 1536,
    height: 1024,
    colorType: 6,
  });
});

test("tropical guitar stand is registered as an independent floor skin", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /id: "jp-tropical-stand"/);
  assert.match(appSource, /label: "트로피컬 기타 받침"/);
  assert.match(appSource, /asset: "\/assets\/effects\/jp-tropical-guitar-stand-v2\.png"/);
  assert.match(appSource, /className: "effect-floor-jp-tropical-stand"/);
  assert.match(styleSource, /\.effect-floor-jp-tropical-stand/);
});
