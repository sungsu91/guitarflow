import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const sourceSheetUrl = new URL("../assets-source/shooter-picks-no-logo-source.png", import.meta.url);
const pickIds = [
  "leather-black",
  "tortoise-shell",
  "walnut-wood",
  "pearl-ivory",
  "brushed-gold",
  "brushed-silver",
  "sapphire-gem",
  "amethyst-gem",
  "carbon-fiber",
  "neon-pink",
  "neon-cyan",
  "lava-rock",
  "ice-crystal",
  "leaf-green",
  "galaxy",
  "antique-bronze",
  "rose-gold",
  "black-obsidian",
  "prism-opal",
  "aqua-wave",
];

function readPngHeader(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("logo-free shooter pick source keeps the supplied transparent 5 by 4 sheet", async () => {
  const header = readPngHeader(await readFile(sourceSheetUrl));
  assert.deepEqual(header, { width: 1400, height: 1120, colorType: 6 });
});

test("all twenty supplied pick cells become trimmed transparent game assets", async () => {
  const headers = await Promise.all(
    pickIds.map(async (pickId) => {
      const assetUrl = new URL(`../public/images/shooter-pick-${pickId}.png`, import.meta.url);
      return readPngHeader(await readFile(assetUrl));
    }),
  );

  for (const header of headers) {
    assert.equal(header.colorType, 6);
    assert.ok(header.width >= 180 && header.width <= 210);
    assert.ok(header.height >= 220 && header.height <= 245);
  }
});

test("the pick catalog keeps the original ids and registers all eight additions", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  for (const pickId of pickIds) {
    assert.match(appSource, new RegExp(`id: "${pickId}"[\\s\\S]*?assetSrc: "\\/images\\/shooter-pick-${pickId}\\.png"`));
  }
});
