import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);
const floorAssetUrl = new URL("../public/assets/effects/moonlight-floor.png", import.meta.url);
const auraAssetUrl = new URL("../public/assets/effects/moonlight-aura.png", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("moonlight floor and aura keep the supplied high-resolution RGBA artwork", async () => {
  const [floorHeader, auraHeader] = await Promise.all([
    readFile(floorAssetUrl).then(readPngHeader),
    readFile(auraAssetUrl).then(readPngHeader),
  ]);

  assert.deepEqual(floorHeader, { width: 1536, height: 1024, colorType: 6 });
  assert.deepEqual(auraHeader, { width: 1024, height: 1536, colorType: 6 });
});

test("moonlight artwork is registered in independent floor and aura slots", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /id: "moonlight-floor"/);
  assert.match(appSource, /label: "달빛 플로어"/);
  assert.match(appSource, /asset: "\/assets\/effects\/moonlight-floor\.png"/);
  assert.match(appSource, /className: "effect-floor-moonlight"/);
  assert.match(appSource, /id: "moonlight-aura"/);
  assert.match(appSource, /label: "달빛 아우라"/);
  assert.match(appSource, /asset: "\/assets\/effects\/moonlight-aura\.png"/);
  assert.match(appSource, /className: "effect-moonlight-aura"/);
  assert.match(styleSource, /\.effect-floor-moonlight/);
  assert.match(styleSource, /\.effect-moonlight-aura-front/);
});
