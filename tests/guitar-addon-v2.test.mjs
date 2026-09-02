import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  FRETIVA_GUITAR_ADDON_V2,
  FRETIVA_GUITAR_ADDON_V2_ID,
  FRETIVA_GUITAR_ADDON_V2_IDS,
} from "../src/shooter/instruments/fretivaGuitarAddonV2.js";

const projectRoot = new URL("../", import.meta.url);
const assetRoot = new URL(
  "../public/assets/shooter/instruments/fretiva-guitar-addon-v2/",
  import.meta.url,
);

const EXPECTED = [
  ["moonlit-parlor", "MOONLIT PARLOR", "acoustic/MOONLIT_PARLOR.png", "acoustic"],
  ["autumn-copper", "AUTUMN COPPER", "acoustic/AUTUMN_COPPER.png", "acoustic"],
  ["glacier-comet", "GLACIER COMET", "electric/GLACIER_COMET.png", "electric"],
  ["neon-serpent", "NEON SERPENT", "electric/NEON_SERPENT.png", "electric"],
];

test("guitar addon V2 keeps the manifest IDs, titles, paths, and category order", () => {
  assert.equal(FRETIVA_GUITAR_ADDON_V2_ID, "fretiva-guitar-addon-v2");
  assert.deepEqual(
    FRETIVA_GUITAR_ADDON_V2.map(({ id, title, file, category }) => [id, title, file, category]),
    EXPECTED,
  );
  assert.deepEqual(FRETIVA_GUITAR_ADDON_V2_IDS, EXPECTED.map(([id]) => id));
  assert.equal(new Set(FRETIVA_GUITAR_ADDON_V2_IDS).size, 4);
  FRETIVA_GUITAR_ADDON_V2.forEach((skin) => {
    assert.equal(skin.title, skin.file.split("/").at(-1).replace(/\.png$/i, "").replaceAll("_", " "));
  });
});

test("runtime contains only the four supplied 512x768 RGBA PNG skins", async () => {
  const files = (await Promise.all(
    ["acoustic", "electric"].map(async (folder) => (
      (await readdir(new URL(`${folder}/`, assetRoot))).map((name) => `${folder}/${name}`)
    )),
  )).flat().sort();
  assert.deepEqual(files, EXPECTED.map(([, , file]) => file).sort());
  assert.equal(files.some((file) => /preview/i.test(file)), false);

  await Promise.all(files.map(async (file) => {
    const buffer = await readFile(new URL(file, assetRoot));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.equal(buffer.readUInt32BE(16), 512, file);
    assert.equal(buffer.readUInt32BE(20), 768, file);
    assert.equal(buffer[24], 8, `${file} must remain 8-bit`);
    assert.equal(buffer[25], 6, `${file} must remain RGBA`);
  }));
});

test("shared guitar registry connects V2 to categories, gameplay geometry, and persistence", async () => {
  const appSource = await readFile(new URL("src/App.jsx", projectRoot), "utf8");
  assert.match(appSource, /\.\.\.FRETIVA_GUITAR_ADDON_V2\.map\(\(skin\) => \[/);
  assert.match(appSource, /\.\.\.FRETIVA_GUITAR_ADDON_V2_IDS,/);
  assert.match(appSource, /Object\.fromEntries\(FRETIVA_GUITAR_ADDON_V2\.map\(\(skin\) => \[skin\.id, skin\.category\]\)\)/);
  assert.match(appSource, /collisionAspectRatio: skin\.collisionAspectRatio/);
  assert.match(appSource, /GUITAR_LAB_VARIANT_IDS\.has\(stored\) \? stored/);
});

test("picker and gameplay preserve the V2 transparent canvas with contain rendering", async () => {
  const styleSource = await readFile(new URL("src/style.css", projectRoot), "utf8");
  assert.match(styleSource, /img\[data-instrument-skin-pack="fretiva-guitar-addon-v2"\][\s\S]*?object-fit: contain;[\s\S]*?background: transparent;/);
  assert.match(styleSource, /shooterGuitarPickerAsset\[data-instrument-skin-pack="fretiva-guitar-addon-v2"\][\s\S]*?object-fit: contain !important;/);
  assert.match(styleSource, /guitarPlayer\[data-instrument-skin-pack="fretiva-guitar-addon-v2"\][\s\S]*?guitarPlayerAsset\.guitarAssetImage[\s\S]*?object-fit: contain !important;/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva-guitar-addon-v2"[^}]*object-fit:\s*cover/);
});
