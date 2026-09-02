import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  FRETIVA_LOW_PROFILE_GUITAR_STAND_PACK_V1,
  FRETIVA_LOW_PROFILE_GUITAR_STAND_V1_ITEMS,
  FRETIVA_LOW_PROFILE_STAND_VARIANT,
} from "../src/shooter/effects/fretivaLowProfileGuitarStandPackV1.js";

const packRoot = new URL(
  "../public/assets/effects/fretiva_low_profile_guitar_stand_pack_v1/",
  import.meta.url,
);

function readPngHeader(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("low-profile stand catalog mirrors the final manifest order and identity", async () => {
  const manifest = JSON.parse(await readFile(new URL("skin_manifest.json", packRoot), "utf8"));
  assert.equal(FRETIVA_LOW_PROFILE_GUITAR_STAND_PACK_V1.id, manifest.pack_id);
  assert.equal(FRETIVA_LOW_PROFILE_GUITAR_STAND_PACK_V1.automaticAuraSelection, false);
  assert.equal(FRETIVA_LOW_PROFILE_GUITAR_STAND_PACK_V1.requiresCollisionOrMountingLogic, false);
  assert.deepEqual(
    FRETIVA_LOW_PROFILE_GUITAR_STAND_V1_ITEMS.map((item) => [
      item.sortOrder,
      item.id,
      item.displayTitle,
      item.asset.split(`${manifest.pack_id}/`)[1],
    ]),
    manifest.items.map((item) => [
      item.sort_order,
      item.id,
      item.display_title,
      item.path,
    ]),
  );
});

test("all ten supplied stands remain 1536 by 1024 RGBA PNG files", async () => {
  const filenames = (await readdir(new URL("stands/", packRoot)))
    .filter((name) => name.endsWith(".png"));
  assert.equal(filenames.length, 10);
  for (const item of FRETIVA_LOW_PROFILE_GUITAR_STAND_V1_ITEMS) {
    const filename = item.asset.split("/").at(-1);
    const header = readPngHeader(await readFile(new URL(`stands/${filename}`, packRoot)));
    assert.deepEqual(header, { width: 1536, height: 1024, colorType: 6 });
    assert.ok(Math.abs(item.contentAnchor.centerX - 0.5) < 0.003);
    assert.ok(item.contentAnchor.bottomY > 0.93 && item.contentAnchor.bottomY < 0.98);
  }
});

test("runtime appends stands to the independent floor list outside guitar motion", async () => {
  const [app, style] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
  ]);
  const optionsStart = app.indexOf("const SHOOTER_LOW_PROFILE_STAND_OPTIONS");
  const optionsEnd = app.indexOf("const SHOOTER_AURA_EFFECT_OPTIONS", optionsStart);
  const optionsSource = app.slice(optionsStart, optionsEnd);
  const gameplayStart = app.indexOf("data-instrument-skin-pack={selectedGuitar.instrumentSkinPack}");
  const fixedStandRender = app.indexOf("selectedFixedStandFloorLayers.map", gameplayStart);
  const motionRender = app.indexOf("className={`shooterGuitarMotion", gameplayStart);

  assert.equal(FRETIVA_LOW_PROFILE_STAND_VARIANT, "fixed-low-profile-stand");
  assert.match(app, /\.\.\.SHOOTER_LOW_PROFILE_STAND_OPTIONS/);
  assert.match(app, /SHOOTER_STANDALONE_FLOOR_EFFECT_OPTIONS\.length/);
  assert.match(optionsSource, /width: SHOOTER_LOW_PROFILE_STAND_WIDTH/);
  assert.match(optionsSource, /height: SHOOTER_LOW_PROFILE_STAND_HEIGHT/);
  assert.match(optionsSource, /zIndex: 2/);
  assert.match(optionsSource, /blendMode: "normal"/);
  assert.doesNotMatch(optionsSource, /animation:/);
  assert.ok(fixedStandRender > gameplayStart);
  assert.ok(motionRender > fixedStandRender);
  assert.match(app, /data-fixed-to-guitar-base="true"/);
  assert.match(app, /selectedGuitarMotionFloorLayers\.map/);
  assert.match(style, /\.guitarPlayerFixedStandLayer[\s\S]*animation: none !important/);
  assert.match(app, /SHOOTER_FLOOR_EFFECT_STORAGE_KEY = "selectedFloorSkinId"/);
});
