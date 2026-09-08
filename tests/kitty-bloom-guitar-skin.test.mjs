import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FRETIVA_PINK_INSTRUMENT_SKIN_PACK_V1,
} from "../src/shooter/instruments/fretivaPinkInstrumentSkinPackV1.js";

const assetUrl = new URL(
  "../public/assets/shooter/instruments/fretiva_pink_instrument_skin_pack_v1/acoustic/KITTY BLOOM.png",
  import.meta.url,
);

test("Kitty Bloom is registered as a centered transparent acoustic skin", async () => {
  const skin = FRETIVA_PINK_INSTRUMENT_SKIN_PACK_V1.find(
    (candidate) => candidate.id === "acoustic_kitty_bloom_v1",
  );
  const png = await readFile(assetUrl);

  assert.ok(skin);
  assert.equal(skin.title, "KITTY BLOOM");
  assert.equal(skin.category, "acoustic");
  assert.equal(skin.stringCount, 6);
  assert.equal(skin.tunerCount, 6);
  assert.equal(skin.assetSrc.endsWith("/acoustic/KITTY%20BLOOM.png"), false);
  assert.equal(skin.assetSrc.endsWith("/acoustic/KITTY BLOOM.png"), true);
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1536);
  assert.equal(png[25], 6, "PNG must use RGBA color type");
  assert.equal(skin.visibleWidth, 655);
  assert.equal(skin.visibleHeight, 1492);
  assert.equal(skin.visibleTop, 7);
});
