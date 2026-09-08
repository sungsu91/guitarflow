import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1,
  FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_ID,
  FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_IDS,
} from "../src/shooter/instruments/fretivaPomeranianInstrumentPackV1.js";

const projectRoot = new URL("../", import.meta.url);

const EXPECTED = [
  ["acoustic_pom_cream_v1", "POM CREAM ACOUSTIC", "acoustic", 6, 6, "3_left_3_right"],
  ["electric_pom_blush_v1", "POM BLUSH ELECTRIC", "electric", 6, 6, "3_left_3_right"],
  ["bass_pom_cocoa_v1", "POM COCOA BASS", "bass", 4, 4, "2_left_2_right"],
];

test("Pomeranian collection registers one valid skin for each instrument category", () => {
  assert.equal(
    FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_ID,
    "fretiva_pomeranian_instrument_pack_v1",
  );
  assert.deepEqual(
    FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1.map((skin) => [
      skin.id,
      skin.title,
      skin.category,
      skin.stringCount,
      skin.tunerCount,
      skin.tunerLayout,
    ]),
    EXPECTED,
  );
  assert.deepEqual(FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_IDS, EXPECTED.map(([id]) => id));
});

test("Pomeranian collection assets are original-size RGBA PNG canvases", async () => {
  for (const skin of FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1) {
    const fileUrl = new URL(`../public${skin.assetSrc}`, import.meta.url);
    const buffer = await readFile(fileUrl);
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", skin.file);
    assert.equal(buffer.readUInt32BE(16), 1024, skin.file);
    assert.equal(buffer.readUInt32BE(20), 1536, skin.file);
    assert.equal(buffer[24], 8, `${skin.file} must remain 8-bit`);
    assert.equal(buffer[25], 6, `${skin.file} must remain RGBA`);
  }
});

test("shared skin state exposes the Pomeranian collection while both layouts contain it", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(new URL("src/App.jsx", projectRoot), "utf8"),
    readFile(new URL("src/style.css", projectRoot), "utf8"),
  ]);

  assert.match(appSource, /\.\.\.FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1\.map\(\(skin\) => \[/);
  assert.match(appSource, /\.\.\.FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_IDS,/);
  assert.match(appSource, /Object\.fromEntries\(FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1\.map\(\(skin\) => \[skin\.id, skin\.category\]\)\)/);
  assert.match(styleSource, /img\[data-instrument-skin-pack="fretiva_pomeranian_instrument_pack_v1"\][\s\S]*?object-fit: contain;/);
  assert.match(styleSource, /desktopLayout[\s\S]*?data-instrument-skin-pack="fretiva_pomeranian_instrument_pack_v1"[\s\S]*?object-fit: contain !important;/);
  assert.doesNotMatch(styleSource, /data-instrument-skin-pack="fretiva_pomeranian_instrument_pack_v1"[^}]*rotate\(/);
});
