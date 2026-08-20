import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapAssetSources,
  isEditableShooterMap,
  isLayeredShooterMap,
  resolveLayeredShooterMap,
} from "../src/shooter/maps/registry.js";
import { PARK_MAP_SKIN } from "../src/shooter/maps/skins/park.js";
import { MAP_EDIT_SKINS, validateMapPlacements } from "../vite.config.js";

function readPngHeader(buffer) {
  return {
    signature: buffer.subarray(0, 8).toString("hex"),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("park fountain hides its fixed top finial while the connected jet is active", async () => {
  const [preparationScript, staticBody, idleWaterFrame, highPressureWaterFrame] = await Promise.all([
    readFile(new URL("../scripts/prepare-park-fountain-frames.py", import.meta.url), "utf8"),
    readFile(new URL(
      "../public/assets/maps/park/decor/fountain-flow/park-fountain-base.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/park/decor/fountain-flow/park-fountain-water-01.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/park/decor/fountain-flow/park-fountain-water-17.png",
      import.meta.url,
    )),
  ]);

  assert.match(preparationScript, /remove_floating_top_components/);
  assert.match(preparationScript, /split_static_finial/);
  assert.match(preparationScript, /add_idle_finial/);
  assert.doesNotMatch(preparationScript, /in_top_jewel/);
  assert.doesNotMatch(preparationScript, /cover_top_finial|top_finial_mask/);
  assert.equal(
    createHash("sha256").update(staticBody).digest("hex"),
    "3aa0f71225a15dad8b2d200ca73a4510a0b1998ea8dc5c27e4eb091ad2057eac",
  );
  assert.equal(
    createHash("sha256").update(idleWaterFrame).digest("hex"),
    "7a0637f4e4990aa774d5dfa7b34de36a3c7e71eba84a5b3d3c63e67a23fa02ac",
  );
  assert.equal(
    createHash("sha256").update(highPressureWaterFrame).digest("hex"),
    "92c1f41976459aa757925f3992dad439aedf92e8d5e468bb475aa7bbfae93012",
  );
});

test("park uses the supplied background in the shared layered map system", async () => {
  assert.equal(isLayeredShooterMap(PARK_MAP_SKIN), true);
  assert.equal(isEditableShooterMap(PARK_MAP_SKIN), true);
  assert.equal(PARK_MAP_SKIN.id, "park");
  assert.equal(PARK_MAP_SKIN.label, "PARK");
  assert.equal(PARK_MAP_SKIN.background.fit, "cover");
  assert.equal(PARK_MAP_SKIN.background.position, "center center");
  assert.equal(PARK_MAP_SKIN.background.locked, true);
  assert.equal(PARK_MAP_SKIN.background.src, "/assets/maps/park/park-background.png");
  assert.equal(PARK_MAP_SKIN.previewImage, PARK_MAP_SKIN.background.src);
  assert.deepEqual(PARK_MAP_SKIN.referenceViewport, {
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  });
  assert.equal(PARK_MAP_SKIN.assetCatalog.length, 13);
  assert.equal(PARK_MAP_SKIN.layout.length, 12);
  assert.deepEqual(PARK_MAP_SKIN.layers, []);
  const miniPoodleAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-mini-poodle");
  const borderCollieAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-border-collie-acrobat");
  const britishShorthairAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-british-shorthair-play");
  const munchkinAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-munchkin-play");
  const fountainAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-park-fountain-flow");
  const gardenSwingAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-garden-swing");
  const fountainFenceBackAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "park-fountain-fence-back");
  const fountainFenceFrontAsset = PARK_MAP_SKIN.assetCatalog.find((asset) => asset.id === "park-fountain-fence-front");
  const woodPlankAssets = PARK_MAP_SKIN.assetCatalog.filter((asset) => (
    asset.id.startsWith("park-wood-plank-floor-")
  ));
  assert.equal(miniPoodleAsset.id, "ambient-mini-poodle");
  assert.equal(miniPoodleAsset.slot, "animated-environment");
  assert.equal(miniPoodleAsset.spriteSheet.columns, 1);
  assert.equal(miniPoodleAsset.spriteSheet.rows, 1);
  assert.equal(miniPoodleAsset.spriteSheet.frameCount, 15);
  assert.equal(miniPoodleAsset.spriteSheet.frames.length, 15);
  assert.equal(miniPoodleAsset.spriteSheet.framesPerSecond, 8);
  assert.equal(miniPoodleAsset.spriteSheet.animation, "mini-poodle-tilt");
  assert.deepEqual(
    miniPoodleAsset.spriteSheet.frames,
    Array.from(
      { length: 15 },
      (_, index) => `/assets/maps/park/creatures/mini-poodle/tilt/mini-poodle-tilt-${String(index + 1).padStart(2, "0")}.png`,
    ),
  );
  assert.equal(borderCollieAsset.slot, "animated-environment");
  assert.equal(borderCollieAsset.spriteSheet.frameCount, 22);
  assert.equal(borderCollieAsset.spriteSheet.frames.length, 22);
  assert.equal(borderCollieAsset.spriteSheet.framesPerSecond, 10);
  assert.equal(borderCollieAsset.spriteSheet.animation, "border-collie-acrobat");
  assert.equal(
    borderCollieAsset.spriteSheet.frames.reduce((total, frame) => total + frame.hold, 0),
    22,
  );
  assert.equal(borderCollieAsset.spriteSheet.sequence.length, 32);
  assert.deepEqual(borderCollieAsset.spriteSheet.sequence.slice(0, 8), [0, 1, 2, 3, 0, 1, 2, 3]);
  assert.deepEqual(borderCollieAsset.spriteSheet.sequence.slice(8, 17), [4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(borderCollieAsset.spriteSheet.sequence.slice(-8), [18, 19, 20, 21, 18, 19, 20, 21]);
  assert.deepEqual(
    borderCollieAsset.spriteSheet.frames.map((frame) => frame.src),
    Array.from(
      { length: 22 },
      (_, index) => `/assets/maps/park/creatures/border-collie/grounded-roll/border-collie-grounded-roll-${String(index + 1).padStart(2, "0")}.png`,
    ),
  );
  assert.equal(britishShorthairAsset.slot, "animated-environment");
  assert.equal(britishShorthairAsset.spriteSheet.frameCount, 61);
  assert.equal(britishShorthairAsset.spriteSheet.frames.length, 61);
  assert.equal(britishShorthairAsset.spriteSheet.framesPerSecond, 5);
  assert.equal(britishShorthairAsset.spriteSheet.animation, "british-shorthair-play");
  assert.equal(britishShorthairAsset.spriteSheet.sequence.length, 80);
  assert.deepEqual(britishShorthairAsset.spriteSheet.sequence.slice(0, 8), Array.from({ length: 8 }, () => 0));
  assert.deepEqual(britishShorthairAsset.spriteSheet.sequence.slice(8, 15), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(britishShorthairAsset.spriteSheet.sequence.slice(-12), [4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(
    britishShorthairAsset.spriteSheet.frames,
    Array.from(
      { length: 61 },
      (_, index) => `/assets/maps/park/creatures/british-shorthair/play/british-shorthair-play-${String(index + 1).padStart(2, "0")}.png`,
    ),
  );
  assert.equal(munchkinAsset.slot, "animated-environment");
  assert.equal(munchkinAsset.spriteSheet.frameCount, 49);
  assert.equal(munchkinAsset.spriteSheet.frames.length, 49);
  assert.equal(munchkinAsset.spriteSheet.framesPerSecond, 6);
  assert.equal(munchkinAsset.spriteSheet.animation, "munchkin-play");
  assert.equal(munchkinAsset.spriteSheet.sequence.length, 112);
  assert.deepEqual(munchkinAsset.spriteSheet.sequence.slice(0, 12), Array.from({ length: 12 }, () => 0));
  assert.deepEqual(munchkinAsset.spriteSheet.sequence.slice(12, 20), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(munchkinAsset.spriteSheet.sequence.slice(-15), [47, 46, 45, 44, 42, 39, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(
    munchkinAsset.spriteSheet.frames,
    Array.from(
      { length: 49 },
      (_, index) => `/assets/maps/park/creatures/munchkin/play/munchkin-play-${String(index + 1).padStart(2, "0")}.png`,
    ),
  );
  assert.equal(fountainAsset.slot, "animated-environment");
  assert.equal(fountainAsset.src, "/assets/maps/park/decor/fountain-flow/park-fountain-base.png");
  assert.equal(fountainAsset.spriteSheet.staticSrc, fountainAsset.src);
  assert.equal(fountainAsset.spriteSheet.frameCount, 32);
  assert.equal(fountainAsset.spriteSheet.frames.length, 32);
  assert.equal(fountainAsset.spriteSheet.framesPerSecond, 12);
  assert.equal(fountainAsset.spriteSheet.animation, "park-fountain-flow");
  assert.deepEqual(
    fountainAsset.spriteSheet.frames,
    Array.from(
      { length: 32 },
      (_, index) => `/assets/maps/park/decor/fountain-flow/park-fountain-water-${String(index + 1).padStart(2, "0")}.png`,
    ),
  );
  assert.equal(gardenSwingAsset.slot, "animated-environment");
  assert.equal(gardenSwingAsset.baseWidth, 0.48);
  assert.equal(gardenSwingAsset.anchorX, 50);
  assert.equal(gardenSwingAsset.anchorY, 96);
  assert.equal(gardenSwingAsset.maxInstances, 1);
  assert.equal(gardenSwingAsset.spriteSheet.frameCount, 10);
  assert.equal(gardenSwingAsset.spriteSheet.frames.length, 10);
  assert.equal(gardenSwingAsset.spriteSheet.framesPerSecond, 4);
  assert.equal(gardenSwingAsset.spriteSheet.animation, "garden-swing");
  assert.deepEqual(gardenSwingAsset.spriteSheet.sequence, [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9]);
  assert.deepEqual(
    gardenSwingAsset.spriteSheet.frames,
    Array.from(
      { length: 10 },
      (_, index) => `/assets/maps/park/decor/garden-swing/garden-swing-${String(index + 1).padStart(2, "0")}.png`,
    ),
  );
  assert.equal(fountainFenceBackAsset.src, "/assets/maps/park/decor/fountain-fence/park-fountain-fence-back.png");
  assert.equal(fountainFenceFrontAsset.src, "/assets/maps/park/decor/fountain-fence/park-fountain-fence-front.png");
  [fountainFenceBackAsset, fountainFenceFrontAsset].forEach((asset) => {
    assert.equal(asset.slot, "midground-environment");
    assert.equal(asset.baseWidth, 0.72);
    assert.equal(asset.anchorX, 50);
    assert.equal(asset.anchorY, 50);
    assert.equal(asset.maxInstances, 1);
  });
  assert.equal(woodPlankAssets.length, 5);
  woodPlankAssets.forEach((asset, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    assert.equal(asset.id, `park-wood-plank-floor-${suffix}`);
    assert.equal(asset.src, `/assets/maps/park/decor/wood-plank-floor/park-wood-plank-${suffix}.png`);
    assert.equal(asset.slot, "background-environment");
    assert.equal(asset.baseWidth, 0.38);
    assert.equal(asset.anchorX, 50);
    assert.equal(asset.anchorY, 50);
    assert.equal(asset.maxInstances, 4);
  });

  const resolved = resolveLayeredShooterMap(PARK_MAP_SKIN);
  assert.equal(resolved.layers.length, 12);
  const resolvedMiniPoodle = resolved.layers.find((layer) => layer.assetId === "ambient-mini-poodle");
  const resolvedBorderCollie = resolved.layers.find((layer) => layer.assetId === "ambient-border-collie-acrobat");
  const resolvedBritishShorthair = resolved.layers.find((layer) => layer.assetId === "ambient-british-shorthair-play");
  const resolvedMunchkin = resolved.layers.find((layer) => layer.assetId === "ambient-munchkin-play");
  const resolvedFountain = resolved.layers.find((layer) => layer.assetId === "ambient-park-fountain-flow");
  const resolvedGardenSwing = resolved.layers.find((layer) => layer.assetId === "ambient-garden-swing");
  const resolvedFountainFenceBack = resolved.layers.find((layer) => layer.assetId === "park-fountain-fence-back");
  const resolvedFountainFenceFront = resolved.layers.find((layer) => layer.assetId === "park-fountain-fence-front");
  const resolvedWoodPlanks = resolved.layers.filter((layer) => (
    layer.assetId.startsWith("park-wood-plank-floor-")
  ));
  assert.equal(resolvedMiniPoodle.spriteSheet.animation, "mini-poodle-tilt");
  assert.equal(resolvedMiniPoodle.placement.scaleX, 1.12);
  assert.equal(resolvedMiniPoodle.placement.perspective, 320);
  assert.equal(resolvedMiniPoodle.placement.tiltY, -34);
  assert.equal(resolvedBorderCollie.spriteSheet.animation, "border-collie-acrobat");
  const borderCollieLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-border-collie-acrobat-01"
  ));
  assert.equal(resolvedBorderCollie.placement.x, borderCollieLayoutPlacement.x);
  assert.equal(resolvedBorderCollie.placement.y, borderCollieLayoutPlacement.y);
  assert.equal(resolvedBritishShorthair.spriteSheet.animation, "british-shorthair-play");
  const britishShorthairLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-british-shorthair-play-01"
  ));
  assert.equal(resolvedBritishShorthair.placement.x, britishShorthairLayoutPlacement.x);
  assert.equal(resolvedBritishShorthair.placement.y, britishShorthairLayoutPlacement.y);
  assert.equal(resolvedMunchkin.spriteSheet.animation, "munchkin-play");
  const munchkinLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-munchkin-play-01"
  ));
  assert.deepEqual(resolvedMunchkin.placement, {
    x: munchkinLayoutPlacement.x,
    y: munchkinLayoutPlacement.y,
    width: munchkinAsset.baseWidth,
    scale: munchkinLayoutPlacement.scale,
    rotation: munchkinLayoutPlacement.rotation,
    scaleX: munchkinLayoutPlacement.scaleX,
    scaleY: munchkinLayoutPlacement.scaleY,
    skewX: munchkinLayoutPlacement.skewX,
    skewY: munchkinLayoutPlacement.skewY,
    perspective: munchkinLayoutPlacement.perspective,
    tiltX: munchkinLayoutPlacement.tiltX,
    tiltY: munchkinLayoutPlacement.tiltY,
    perspectiveCorners: munchkinLayoutPlacement.perspectiveCorners,
    anchorX: munchkinAsset.anchorX,
    anchorY: munchkinAsset.anchorY,
  });
  assert.equal(resolvedMunchkin.placement.x, munchkinLayoutPlacement.x);
  assert.equal(resolvedMunchkin.placement.y, munchkinLayoutPlacement.y);
  assert.equal(resolvedMunchkin.placement.scale, munchkinLayoutPlacement.scale);
  assert.equal(resolvedFountain.spriteSheet.animation, "park-fountain-flow");
  const fountainLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-fountain-flow-01"
  ));
  assert.deepEqual(resolvedFountain.placement, {
    x: fountainLayoutPlacement.x,
    y: fountainLayoutPlacement.y,
    width: fountainAsset.baseWidth,
    scale: fountainLayoutPlacement.scale,
    rotation: fountainLayoutPlacement.rotation,
    scaleX: fountainLayoutPlacement.scaleX,
    scaleY: fountainLayoutPlacement.scaleY,
    skewX: fountainLayoutPlacement.skewX,
    skewY: fountainLayoutPlacement.skewY,
    perspective: fountainLayoutPlacement.perspective,
    tiltX: fountainLayoutPlacement.tiltX,
    tiltY: fountainLayoutPlacement.tiltY,
    perspectiveCorners: fountainLayoutPlacement.perspectiveCorners,
    anchorX: fountainAsset.anchorX,
    anchorY: fountainAsset.anchorY,
  });
  assert.equal(resolvedFountain.placement.x, fountainLayoutPlacement.x);
  assert.equal(resolvedFountain.placement.y, fountainLayoutPlacement.y);
  assert.equal(resolvedFountain.placement.scale, fountainLayoutPlacement.scale);
  const gardenSwingLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-garden-swing-01"
  ));
  assert.equal(resolvedGardenSwing.spriteSheet.animation, "garden-swing");
  assert.equal(resolvedGardenSwing.placement.x, gardenSwingLayoutPlacement.x);
  assert.equal(resolvedGardenSwing.placement.y, gardenSwingLayoutPlacement.y);
  assert.equal(resolvedGardenSwing.placement.width, gardenSwingAsset.baseWidth);
  assert.equal(resolvedGardenSwing.placement.scale, 0.62);
  assert.equal(resolvedGardenSwing.placement.scaleX, 0.94);
  assert.equal(resolvedGardenSwing.placement.perspective, 650);
  assert.equal(resolvedGardenSwing.placement.tiltX, -7);
  assert.equal(resolvedGardenSwing.placement.tiltY, 18);
  assert.equal(resolvedGardenSwing.zIndex, 21);
  const fountainFenceBackLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-fountain-fence-back-01"
  ));
  const fountainFenceFrontLayoutPlacement = PARK_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === "park-fountain-fence-front-01"
  ));
  assert.equal(resolvedFountainFenceBack.placement.x, fountainFenceBackLayoutPlacement.x);
  assert.equal(resolvedFountainFenceBack.placement.y, fountainFenceBackLayoutPlacement.y);
  assert.equal(resolvedFountainFenceBack.placement.width, 0.72);
  assert.equal(resolvedFountainFenceBack.placement.scale, fountainFenceBackLayoutPlacement.scale);
  assert.equal(resolvedFountainFenceFront.placement.x, fountainFenceFrontLayoutPlacement.x);
  assert.equal(resolvedFountainFenceFront.placement.y, fountainFenceFrontLayoutPlacement.y);
  assert.equal(resolvedFountainFenceFront.placement.width, 0.72);
  assert.equal(resolvedFountainFenceFront.placement.scale, fountainFenceFrontLayoutPlacement.scale);
  assert.equal(resolvedFountainFenceBack.zIndex, 21);
  assert.equal(resolvedFountainFenceFront.zIndex, 24);
  assert.equal(resolvedWoodPlanks.length, 4);
  resolvedWoodPlanks.forEach((layer, index) => {
    const placement = PARK_MAP_SKIN.layout.find((candidate) => (
      candidate.instanceId === `park-wood-plank-floor-${String(index + 1).padStart(2, "0")}`
    ));
    assert.equal(layer.placement.x, placement.x);
    assert.equal(layer.placement.y, placement.y);
    assert.equal(layer.placement.width, woodPlankAssets[index].baseWidth);
    assert.equal(layer.placement.scale, 0.52);
    assert.equal(layer.placement.anchorX, 50);
    assert.equal(layer.placement.anchorY, 50);
    assert.equal(layer.zIndex, 22);
  });
  assert.deepEqual(getShooterMapAssetSources(PARK_MAP_SKIN), [
    "/assets/maps/park/park-background.png",
    ...miniPoodleAsset.spriteSheet.frames,
    ...borderCollieAsset.spriteSheet.frames.map((frame) => frame.src),
    ...britishShorthairAsset.spriteSheet.frames,
    ...munchkinAsset.spriteSheet.frames,
    fountainAsset.src,
    ...fountainAsset.spriteSheet.frames,
    ...gardenSwingAsset.spriteSheet.frames,
    fountainFenceBackAsset.src,
    fountainFenceFrontAsset.src,
    ...woodPlankAssets.map((asset) => asset.src),
  ]);
  assert.ok(LAYERED_SHOOTER_MAP_SKINS.includes(PARK_MAP_SKIN));
  assert.deepEqual(
    validateMapPlacements(PARK_MAP_SKIN.layout, MAP_EDIT_SKINS.get("park").assetCatalog),
    PARK_MAP_SKIN.layout,
  );

  const [background, backgroundSource] = await Promise.all([
    readFile(new URL(`../public${PARK_MAP_SKIN.background.src}`, import.meta.url)),
    readFile(new URL("../assets-source/maps/park/park-background-source.png", import.meta.url)),
  ]);
  assert.equal(
    createHash("sha256").update(backgroundSource).digest("hex"),
    "df4413c7596d5c95791e4f1a57b9bbedcc0291da53a301df645e6d4be306959d",
  );
  assert.deepEqual(background, backgroundSource);
  assert.deepEqual(readPngHeader(background), {
    signature: "89504e470d0a1a0a",
    width: 852,
    height: 1846,
    colorType: 2,
  });

  const [
    source,
    borderCollieSource,
    cleanedBorderCollieSource,
    britishShorthairSource,
    cleanedBritishShorthairSource,
    munchkinSource,
    cleanedMunchkinSource,
    fountainSource,
    cleanedFountainSource,
    fountainBase,
    woodPlankSource,
    cleanedWoodPlankSource,
    gardenSwingSource,
    cleanedGardenSwingSource,
    fountainFenceSource,
    cleanedFountainFenceSource,
    fountainFenceBack,
    fountainFenceFront,
    rendererSource,
    mapStyles,
    ...spriteFrames
  ] = await Promise.all([
    readFile(new URL(
      "../assets-source/maps/park/mini-poodle-sprite-sheet-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/border-collie-grounded-roll-sprite-sheet-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/border-collie-grounded-roll-sprite-sheet-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/british-shorthair-play-sprite-sheet-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/british-shorthair-play-sprite-sheet-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/munchkin-play-sprite-sheet-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/munchkin-play-sprite-sheet-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/fountain-flow-sprite-sheet-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/fountain-flow-sprite-sheet-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(`../public${fountainAsset.src}`, import.meta.url)),
    readFile(new URL(
      "../assets-source/maps/park/wood-plank-floor-tiles-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/wood-plank-floor-tiles-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/garden-swing-sprite-sheet-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/garden-swing-sprite-sheet-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/fountain-fence-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets-source/maps/park/fountain-fence-cleaned.png",
      import.meta.url,
    )),
    readFile(new URL(`../public${fountainFenceBackAsset.src}`, import.meta.url)),
    readFile(new URL(`../public${fountainFenceFrontAsset.src}`, import.meta.url)),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    ...miniPoodleAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
    ...borderCollieAsset.spriteSheet.frames.map((frame) => (
      readFile(new URL(`../public${frame.src}`, import.meta.url))
    )),
    ...britishShorthairAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
    ...munchkinAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
    ...fountainAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
    ...woodPlankAssets.map((asset) => (
      readFile(new URL(`../public${asset.src}`, import.meta.url))
    )),
    ...gardenSwingAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
  ]);
  const tiltFrames = spriteFrames.slice(0, 15);
  const borderCollieFrames = spriteFrames.slice(15, 37);
  const britishShorthairFrames = spriteFrames.slice(37, 98);
  const munchkinFrames = spriteFrames.slice(98, 147);
  const fountainWaterFrames = spriteFrames.slice(147, 179);
  const woodPlankTiles = spriteFrames.slice(179, 184);
  const gardenSwingFrames = spriteFrames.slice(184, 194);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "b27d8a30dd5571535769d377074a61b414e056c5bdf4550cb5099f0d4d0d8b03",
  );
  assert.deepEqual(readPngHeader(source), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(borderCollieSource).digest("hex"),
    "2537b1f4c35c50f3bfdcc5904eb8398962bfbd9d214890d6a179b74e01b42266",
  );
  assert.deepEqual(readPngHeader(borderCollieSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(cleanedBorderCollieSource).digest("hex"),
    "c4ac18c01651b26b8e9c231b8240a220de4de52c8097174aade0cc3b3c3822a0",
  );
  assert.deepEqual(readPngHeader(cleanedBorderCollieSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 2,
  });
  assert.equal(
    createHash("sha256").update(britishShorthairSource).digest("hex"),
    "eb95c05985c51638331cb92a7da31404d89470fd22167ba6c02a06683fa4ff7a",
  );
  assert.deepEqual(readPngHeader(britishShorthairSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(cleanedBritishShorthairSource).digest("hex"),
    "f8a9df7af18cc7f8b810af5c70b5262820061610108eb9678d83a085291dd5da",
  );
  assert.deepEqual(readPngHeader(cleanedBritishShorthairSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 2,
  });
  assert.equal(
    createHash("sha256").update(munchkinSource).digest("hex"),
    "0b100a3b6dbeba775cecb65714475e7df83c41cc1ff22ae105f9d1e6b3e124a4",
  );
  assert.deepEqual(readPngHeader(munchkinSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(cleanedMunchkinSource).digest("hex"),
    "359885686f24951a695e87a3c696501d2f22555ecbb013a421bb385b80caaba4",
  );
  assert.deepEqual(readPngHeader(cleanedMunchkinSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 2,
  });
  assert.equal(
    createHash("sha256").update(fountainSource).digest("hex"),
    "b373578c2c86f0b61055856e70525f32065660273273fc72d71072ea4d8a0513",
  );
  assert.deepEqual(readPngHeader(fountainSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(cleanedFountainSource).digest("hex"),
    "382863ee3a889781ec1e2105517b2159a7d18c5df7a3ea91aa94c00340d3e7a3",
  );
  assert.deepEqual(readPngHeader(cleanedFountainSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 2,
  });
  assert.equal(
    createHash("sha256").update(fountainBase).digest("hex"),
    "3aa0f71225a15dad8b2d200ca73a4510a0b1998ea8dc5c27e4eb091ad2057eac",
  );
  assert.deepEqual(readPngHeader(fountainBase), {
    signature: "89504e470d0a1a0a",
    width: 400,
    height: 576,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(woodPlankSource).digest("hex"),
    "ab7f167eda2ae1617905f0e7d9b611d1fe509462cb53215cd0ea567ea7c6ac1f",
  );
  assert.deepEqual(readPngHeader(woodPlankSource), {
    signature: "89504e470d0a1a0a",
    width: 853,
    height: 1844,
    colorType: 2,
  });
  assert.equal(
    createHash("sha256").update(cleanedWoodPlankSource).digest("hex"),
    "41543f14eea40afc9358775225cfc28621debdd822dbe526e01949b72fd80bf2",
  );
  assert.deepEqual(readPngHeader(cleanedWoodPlankSource), {
    signature: "89504e470d0a1a0a",
    width: 935,
    height: 1683,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(gardenSwingSource).digest("hex"),
    "16037af534ddfd989237ae6a0b8c797c6212bdfa9f848d18fa62627ebb0bcd88",
  );
  assert.deepEqual(readPngHeader(gardenSwingSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(cleanedGardenSwingSource).digest("hex"),
    "066fcff070b67d907894c37c64f0a338736c6722b165fd19a3af3c8cb99db93d",
  );
  assert.deepEqual(readPngHeader(cleanedGardenSwingSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 2,
  });
  assert.equal(
    createHash("sha256").update(fountainFenceSource).digest("hex"),
    "0e74719d1f00b4220ff5b248114be7bafa215ba5b5175592e102d59bd38da48e",
  );
  assert.deepEqual(readPngHeader(fountainFenceSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(cleanedFountainFenceSource).digest("hex"),
    "fe78c85aa481b4b71b3f6163cd176b30f40b9321dee1af813ab1c562bfba16a5",
  );
  assert.deepEqual(readPngHeader(cleanedFountainFenceSource), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 2,
  });
  assert.deepEqual(readPngHeader(fountainFenceBack), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.deepEqual(readPngHeader(fountainFenceFront), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(
    createHash("sha256").update(fountainFenceBack).digest("hex"),
    "39aa4127d1761ca9febc02774358281b67d939130383d2665ff20d3ae07b916a",
  );
  assert.equal(
    createHash("sha256").update(fountainFenceFront).digest("hex"),
    "240d7268f7aa98781e4fdf2877f938b10bc2de3012be59592494600c73e22750",
  );
  assert.equal(tiltFrames.length, 15);
  tiltFrames.forEach((tiltFrame) => {
    assert.deepEqual(readPngHeader(tiltFrame), {
      signature: "89504e470d0a1a0a",
      width: 352,
      height: 352,
      colorType: 6,
    });
  });
  assert.equal(borderCollieFrames.length, 22);
  borderCollieFrames.forEach((borderCollieFrame) => {
    assert.deepEqual(readPngHeader(borderCollieFrame), {
      signature: "89504e470d0a1a0a",
      width: 384,
      height: 256,
      colorType: 6,
    });
  });
  assert.equal(britishShorthairFrames.length, 61);
  britishShorthairFrames.forEach((britishShorthairFrame) => {
    assert.deepEqual(readPngHeader(britishShorthairFrame), {
      signature: "89504e470d0a1a0a",
      width: 384,
      height: 256,
      colorType: 6,
    });
  });
  assert.equal(munchkinFrames.length, 49);
  munchkinFrames.forEach((munchkinFrame) => {
    assert.deepEqual(readPngHeader(munchkinFrame), {
      signature: "89504e470d0a1a0a",
      width: 384,
      height: 256,
      colorType: 6,
    });
  });
  assert.equal(fountainWaterFrames.length, 32);
  fountainWaterFrames.forEach((fountainWaterFrame) => {
    assert.deepEqual(readPngHeader(fountainWaterFrame), {
      signature: "89504e470d0a1a0a",
      width: 400,
      height: 576,
      colorType: 6,
    });
  });
  assert.equal(woodPlankTiles.length, 5);
  assert.deepEqual(
    woodPlankTiles.map((tile) => createHash("sha256").update(tile).digest("hex")),
    [
      "f7a2fbc522be49e162785ac1e2bc10cb88f805cdca18fcfe12204ed11d3f886b",
      "88e527ba0e69e7b3f9a801dc3cc96ad8912d6d771bce65279e7c51421b1a4010",
      "f561998f84beaf50e9fa1af90fc0edcb7d8d0f19b081a1ea94613bdf988e17fb",
      "903e16380271d010f1cbf1cb9f6f29771392a5f562b8ef17fbfded4b6382e767",
      "289c4f43fea7e0d0675d6999e878778caf99c78f55d2461f054a1ea8a439d14a",
    ],
  );
  woodPlankTiles.forEach((tile) => {
    assert.deepEqual(readPngHeader(tile), {
      signature: "89504e470d0a1a0a",
      width: 768,
      height: 360,
      colorType: 6,
    });
  });
  assert.equal(gardenSwingFrames.length, 10);
  gardenSwingFrames.forEach((frame) => {
    assert.deepEqual(readPngHeader(frame), {
      signature: "89504e470d0a1a0a",
      width: 384,
      height: 512,
      colorType: 6,
    });
  });
  assert.match(rendererSource, /isMiniPoodleTilt/);
  assert.match(rendererSource, /isBorderCollieAcrobat/);
  assert.match(rendererSource, /isBritishShorthairPlay/);
  assert.match(rendererSource, /isMunchkinPlay/);
  assert.match(rendererSource, /isParkFountainFlow/);
  assert.match(rendererSource, /isGardenSwing/);
  assert.match(rendererSource, /shooterMapParkFountainBody/);
  assert.match(rendererSource, /shooterMapParkFountainWaterFrame/);
  assert.match(mapStyles, /@keyframes shooterMapMiniPoodleFrame/);
  assert.match(mapStyles, /@keyframes shooterMapBorderCollieAcrobatFrame/);
  assert.match(mapStyles, /@keyframes shooterMapBorderCollieRoam/);
  assert.match(mapStyles, /@keyframes shooterMapBritishShorthairFrame/);
  assert.match(mapStyles, /@keyframes shooterMapBritishShorthairRoam/);
  assert.match(mapStyles, /@keyframes shooterMapMunchkinFrame/);
  assert.match(mapStyles, /@keyframes shooterMapMunchkinRoam/);
  assert.match(mapStyles, /@keyframes shooterMapParkFountainWaterFrame/);
  assert.match(mapStyles, /@keyframes shooterMapGardenSwingFrame/);
  const fountainBodyRule = mapStyles.match(/\.shooterMapSkinAsset \.shooterMapParkFountainBody\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(fountainBodyRule, /animation|transform/);
  assert.doesNotMatch(mapStyles, /shooterMapBorderCollieRoam[\s\S]*?translate3d\(-360%/);
  const borderCollieRoamKeyframes = mapStyles.match(/@keyframes shooterMapBorderCollieRoam\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(borderCollieRoamKeyframes, /scaleX\(-1\)/);
  assert.doesNotMatch(borderCollieRoamKeyframes, /opacity/);
  const britishShorthairRoamKeyframes = mapStyles.match(/@keyframes shooterMapBritishShorthairRoam\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(britishShorthairRoamKeyframes, /translate3d\(-32%/);
  assert.match(britishShorthairRoamKeyframes, /translate3d\(32%/);
  assert.match(britishShorthairRoamKeyframes, /scaleX\(-1\)/);
  assert.doesNotMatch(britishShorthairRoamKeyframes, /opacity/);
  const munchkinRoamKeyframes = mapStyles.match(/@keyframes shooterMapMunchkinRoam\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(munchkinRoamKeyframes, /translate3d\(-32%/);
  assert.match(munchkinRoamKeyframes, /translate3d\(32%/);
  assert.match(munchkinRoamKeyframes, /scaleX\(-1\)/);
  assert.doesNotMatch(munchkinRoamKeyframes, /opacity/);
});
