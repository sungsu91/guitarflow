import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FRETIVA_INDEPENDENT_AURA_V2_ITEMS,
  FRETIVA_INDEPENDENT_FLOOR_AURA_PACK_V2,
  FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS,
} from "../src/shooter/effects/fretivaIndependentFloorAuraPackV2.js";
import {
  SHOOTER_EFFECT_ANCHOR_PRESET_IDS,
  getShooterEffectAnchorPreset,
  resolveShooterEffectAnchorOffset,
} from "../src/shooter/effects/effectAnchors.js";
import {
  getForwardSpriteSheetFrameIndex,
  getSpriteSheetFrameRect,
} from "../src/shooter/effects/spriteSheetFrames.js";

const packRoot = new URL(
  "../public/assets/effects/fretiva_independent_floor_aura_pack_v2/",
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

test("independent V2 catalog mirrors the final manifest order, ids, titles, and defaults", async () => {
  const manifest = JSON.parse(await readFile(new URL("skin_manifest.json", packRoot), "utf8"));
  const manifestFloors = manifest.items.map((item) => item.floor);
  const manifestAuras = manifest.items.map((item) => item.aura);

  assert.equal(FRETIVA_INDEPENDENT_FLOOR_AURA_PACK_V2.automaticPairSelection, false);
  assert.equal(FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS.length, 10);
  assert.equal(FRETIVA_INDEPENDENT_AURA_V2_ITEMS.length, 10);
  assert.deepEqual(manifest.items.map((item) => item.sort_order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(
    FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS.map((item) => item.id),
    manifestFloors.map((item) => item.id),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_AURA_V2_ITEMS.map((item) => item.id),
    manifestAuras.map((item) => item.id),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS.map((item) => item.displayTitle),
    manifestFloors.map((item) => item.display_title),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_AURA_V2_ITEMS.map((item) => item.displayTitle),
    manifestAuras.map((item) => item.display_title),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS.map((item) => item.sortOrder),
    manifest.items.map((item) => item.sort_order),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_AURA_V2_ITEMS.map((item) => item.sortOrder),
    manifest.items.map((item) => item.sort_order),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS.map((item) => item.asset.split(`${FRETIVA_INDEPENDENT_FLOOR_AURA_PACK_V2.id}/`)[1]),
    manifestFloors.map((item) => item.path),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_AURA_V2_ITEMS.map((item) => item.asset.split(`${FRETIVA_INDEPENDENT_FLOOR_AURA_PACK_V2.id}/`)[1]),
    manifestAuras.map((item) => item.sheet_path),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS.map((item) => item.defaultScale),
    manifestFloors.map((item) => item.default_scale),
  );
  assert.deepEqual(
    FRETIVA_INDEPENDENT_AURA_V2_ITEMS.map((item) => [
      item.frameDurationMs,
      item.defaultScale,
      item.defaultOpacity,
    ]),
    manifestAuras.map((item) => [
      item.frame_duration_ms,
      item.default_scale,
      item.default_opacity,
    ]),
  );
});

test("all independent floor and aura files retain the supplied RGBA dimensions", async () => {
  const manifest = JSON.parse(await readFile(new URL("skin_manifest.json", packRoot), "utf8"));
  for (const item of manifest.items) {
    const floor = readPngHeader(await readFile(new URL(item.floor.path, packRoot)));
    const aura = readPngHeader(await readFile(new URL(item.aura.sheet_path, packRoot)));
    assert.deepEqual(floor, { width: 1536, height: 1024, colorType: 6 });
    assert.deepEqual(aura, { width: 1536, height: 1024, colorType: 6 });
  }
});

test("aura frame math advances 0 through 7 and crops the 4 by 2 sheet", () => {
  const sheet = FRETIVA_INDEPENDENT_AURA_V2_ITEMS[0].spriteSheet;
  assert.deepEqual(
    Array.from({ length: 9 }, (_, index) => getForwardSpriteSheetFrameIndex(index * 120, 120, 8)),
    [0, 1, 2, 3, 4, 5, 6, 7, 0],
  );
  assert.deepEqual(getSpriteSheetFrameRect(0, sheet), {
    frameIndex: 0, column: 0, row: 0, sx: 0, sy: 0, sw: 384, sh: 512,
  });
  assert.deepEqual(getSpriteSheetFrameRect(7, sheet), {
    frameIndex: 7, column: 3, row: 1, sx: 1152, sy: 512, sw: 384, sh: 512,
  });
});

test("measured V2 artwork anchors every floor canvas center to the legacy bottom axis", () => {
  const preset = getShooterEffectAnchorPreset(
    SHOOTER_EFFECT_ANCHOR_PRESET_IDS.FLOOR_CENTER_BOTTOM,
  );
  for (const floor of FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS) {
    const baseOffsetY = (132 / 2) + 132 * (
      floor.contentAnchor.bottomY - preset.contentAnchor.bottomY
    );
    const offset = resolveShooterEffectAnchorOffset({
      baseOffsetX: 0,
      baseOffsetY,
      contentAnchor: floor.contentAnchor,
      height: 132,
      preset,
      width: 198,
    });
    assert.ok(Math.abs(offset.offsetY - 66) < 0.001, floor.id);
    assert.ok(Math.abs(offset.offsetX) < 1, floor.id);
  }
});

test("runtime keeps independent storage, stable animation dependencies, and one frontmost aura layer", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const auraOptionsStart = app.indexOf("const SHOOTER_INDEPENDENT_AURA_V2_OPTIONS");
  const floorOptionsStart = app.indexOf("const SHOOTER_INDEPENDENT_FLOOR_V2_OPTIONS", auraOptionsStart);
  const auraOptionsSource = app.slice(auraOptionsStart, floorOptionsStart);

  assert.match(app, /SHOOTER_AURA_EFFECT_STORAGE_KEY = "selectedAuraSkinId"/);
  assert.match(app, /SHOOTER_FLOOR_EFFECT_STORAGE_KEY = "selectedFloorSkinId"/);
  assert.match(app, /setSelectedShooterAuraEffectId\(nextEffect\.id\)/);
  assert.match(app, /setSelectedShooterFloorEffectId\(nextEffect\.id\)/);
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(
    app,
    /\}, \[animateSprite, frameCount, frameDurationMs, layer\?\.asset, spriteSheet\]\);/,
  );
  assert.match(auraOptionsSource, /zIndex: 4/);
  assert.match(auraOptionsSource, /height: SHOOTER_INDEPENDENT_AURA_V2_HEIGHT/);
  assert.match(auraOptionsSource, /contentAnchor: aura\.contentAnchor/);
  assert.match(auraOptionsSource, /layer: SHOOTER_EFFECT_LAYER_SLOTS\.BACK/);
  assert.doesNotMatch(auraOptionsSource, /SHOOTER_EFFECT_LAYER_SLOTS\.FRONT/);
  assert.match(app, /FRETIVA_INDEPENDENT_FLOOR_AURA_PACK_V2\.items\.map/);
  assert.match(app, /SET · 독립 선택/);
  assert.doesNotMatch(app, />AURA 10</);
  assert.doesNotMatch(app, />FLOOR 10</);
});
