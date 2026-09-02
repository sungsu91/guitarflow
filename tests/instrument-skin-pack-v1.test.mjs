import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  FRETIVA_INSTRUMENT_SKIN_IDS,
  FRETIVA_INSTRUMENT_SKIN_PACK_V1,
  FRETIVA_INSTRUMENT_SKIN_PACK_V1_ID,
} from "../src/shooter/instruments/fretivaInstrumentSkinPackV1.js";

const projectRoot = new URL("../", import.meta.url);
const assetRoot = new URL("../public/assets/shooter/instruments/fretiva-instrument-skins-v1/", import.meta.url);

const EXPECTED = [
  ["cedar-classic", "CEDAR CLASSIC", "guitars/CEDAR_CLASSIC.png", "acoustic"],
  ["aurora-12", "AURORA 12", "guitars/AURORA_12.png", "acoustic"],
  ["nova-headless", "NOVA HEADLESS", "guitars/NOVA_HEADLESS.png", "electric"],
  ["eclipse-twin", "ECLIPSE TWIN", "guitars/ECLIPSE_TWIN.png", "electric"],
  ["obsidian-tide", "OBSIDIAN TIDE", "guitars/OBSIDIAN_TIDE.png", "electric"],
  ["midnight-5", "MIDNIGHT 5", "basses/MIDNIGHT_5.png", "bass"],
  ["burl-6", "BURL 6", "basses/BURL_6.png", "bass"],
  ["tidal-fretless", "TIDAL FRETLESS", "basses/TIDAL_FRETLESS.png", "bass"],
  ["frostline", "FROSTLINE", "basses/FROSTLINE.png", "bass"],
  ["amber-echo", "AMBER ECHO", "basses/AMBER_ECHO.png", "bass"],
  ["coral-pop", "CORAL POP", "basses/CORAL_POP.png", "bass"],
  ["violet-thunder", "VIOLET THUNDER", "basses/VIOLET_THUNDER.png", "bass"],
  ["celestial-clockwork", "CELESTIAL CLOCKWORK", "basses/CELESTIAL_CLOCKWORK.png", "bass"],
];

test("instrument manifest keeps exact IDs, titles, files, and requested categories", () => {
  assert.equal(FRETIVA_INSTRUMENT_SKIN_PACK_V1_ID, "fretiva-instrument-skins-v1");
  assert.deepEqual(
    FRETIVA_INSTRUMENT_SKIN_PACK_V1.map(({ id, title, file, category }) => [id, title, file, category]),
    EXPECTED,
  );
  assert.deepEqual(FRETIVA_INSTRUMENT_SKIN_IDS, EXPECTED.map(([id]) => id));
  assert.equal(new Set(FRETIVA_INSTRUMENT_SKIN_IDS).size, 13);
  assert.deepEqual(
    Object.fromEntries(["acoustic", "electric", "bass"].map((category) => [
      category,
      FRETIVA_INSTRUMENT_SKIN_PACK_V1.filter((skin) => skin.category === category).map((skin) => skin.title),
    ])),
    {
      acoustic: ["CEDAR CLASSIC", "AURORA 12"],
      electric: ["NOVA HEADLESS", "ECLIPSE TWIN", "OBSIDIAN TIDE"],
      bass: ["MIDNIGHT 5", "BURL 6", "TIDAL FRETLESS", "FROSTLINE", "AMBER ECHO", "CORAL POP", "VIOLET THUNDER", "CELESTIAL CLOCKWORK"],
    },
  );
});

test("every registered runtime skin has a 512x768 RGBA PNG asset", async () => {
  const relativeFiles = (await Promise.all(
    ["guitars", "basses"].map(async (folder) => (
      (await readdir(new URL(`${folder}/`, assetRoot))).map((name) => `${folder}/${name}`)
    )),
  )).flat().sort();
  assert.equal(relativeFiles.some((file) => /preview/i.test(file)), false);
  assert.equal(FRETIVA_INSTRUMENT_SKIN_IDS.includes("luna-harp"), false);

  await Promise.all(EXPECTED.map(async ([, , file]) => {
    const buffer = await readFile(new URL(file, assetRoot));
    assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", file);
    assert.equal(buffer.readUInt32BE(16), 512, file);
    assert.equal(buffer.readUInt32BE(20), 768, file);
    assert.equal(buffer[24], 8, `${file} must remain 8-bit`);
    assert.equal(buffer[25], 6, `${file} must remain RGBA`);
  }));
});

test("shared guitar data appends the pack and connects categories, gameplay, and persistence", async () => {
  const appSource = await readFile(new URL("src/App.jsx", projectRoot), "utf8");
  assert.match(appSource, /\.\.\.FRETIVA_INSTRUMENT_SKIN_PACK_V1\.map\(\(skin\) => \[/);
  assert.match(appSource, /\.\.\.FRETIVA_INSTRUMENT_SKIN_IDS,/);
  assert.match(appSource, /Object\.fromEntries\(FRETIVA_INSTRUMENT_SKIN_PACK_V1\.map\(\(skin\) => \[skin\.id, skin\.category\]\)\)/);
  assert.match(appSource, /data-instrument-skin-pack=\{variant\.instrumentSkinPack\}/);
  assert.match(appSource, /data-instrument-skin-pack=\{selectedGuitar\.instrumentSkinPack\}/);
  assert.match(appSource, /window\.localStorage\.setItem\(SHOOTER_GUITAR_STORAGE_KEY, variantId\)/);
  assert.match(appSource, /GUITAR_LAB_VARIANT_IDS\.has\(stored\) \? stored/);
});

test("picker and gameplay CSS preserve contain rendering and transparent canvas", async () => {
  const styleSource = await readFile(new URL("src/style.css", projectRoot), "utf8");
  assert.match(styleSource, /img\[data-instrument-skin-pack="fretiva-instrument-skins-v1"\][\s\S]*?object-fit: contain;[\s\S]*?background: transparent;/);
  assert.match(styleSource, /\.shooterGuitarPickerAsset\[data-instrument-skin-pack="fretiva-instrument-skins-v1"\][\s\S]*?object-fit: contain !important;/);
  assert.match(styleSource, /\.guitarPlayer\[data-instrument-skin-pack="fretiva-instrument-skins-v1"\][\s\S]*?\.guitarPlayerAsset\.guitarAssetImage[\s\S]*?object-fit: contain !important;/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva-instrument-skins-v1"[^}]*object-fit:\s*cover/);
});
