import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LAYERED_SHOOTER_MAP_SKINS, getShooterMapAssetSources } from "../src/shooter/maps/registry.js";
import { getShooterMapPerformancePolicy } from "../src/shooter/maps/performancePolicy.js";
import { GACHA_ARCADE_MAP_SKIN } from "../src/shooter/maps/skins/gachaArcade.js";

const assetRoot = new URL("../public/assets/maps/gacha-arcade/", import.meta.url);

test("gacha arcade V2 uses the authored runtime background and fixed render order", () => {
  assert.equal(GACHA_ARCADE_MAP_SKIN.runtimeAnimation.version, "2.0.0");
  assert.deepEqual(getShooterMapPerformancePolicy(GACHA_ARCADE_MAP_SKIN), {
    mobileGameplayEffects: "full",
    mobileGameplayAuditPassed: true,
  });
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.referenceViewport, {
    width: 1536,
    height: 3328,
    deviceWidth: 390,
    deviceHeight: 844,
  });
  assert.equal(
    GACHA_ARCADE_MAP_SKIN.background.src,
    "/assets/maps/gacha-arcade/runtime/FRETIVA_GACHA_ARCADE_MAP_BASE_RUNTIME.png",
  );
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.runtimeAnimation.renderOrder, [
    "integrated_background",
    "three_claw_window_layers",
    "star_light_ring",
    "gameplay",
    "guitar",
    "HUD",
  ]);
  assert.equal(LAYERED_SHOOTER_MAP_SKINS.at(-1), GACHA_ARCADE_MAP_SKIN);
});

test("only three clipped claws and one fixed-size star ring animate", () => {
  const sprites = Object.fromEntries(
    GACHA_ARCADE_MAP_SKIN.runtimeAnimation.sprites.map((sprite) => [sprite.id, sprite]),
  );
  assert.deepEqual(Object.keys(sprites), [
    "claw_left_mid",
    "claw_right_upper",
    "claw_right_lower",
    "star_light_ring",
  ]);
  assert.deepEqual(sprites.claw_left_mid.placement, {
    x: 88, y: 1125, width: 300, height: 280,
  });
  assert.deepEqual(sprites.claw_right_upper.placement, {
    x: 1180, y: 690, width: 290, height: 250,
  });
  assert.deepEqual(sprites.claw_right_lower.placement, {
    x: 1165, y: 2160, width: 320, height: 310,
  });
  assert.deepEqual(sprites.star_light_ring.placement, {
    x: 388, y: 260, width: 760, height: 601,
  });
  assert.deepEqual([
    sprites.claw_left_mid.delayMs,
    sprites.claw_right_upper.delayMs,
    sprites.claw_right_lower.delayMs,
  ], [0, 1800, 3600]);
  for (const claw of [sprites.claw_left_mid, sprites.claw_right_upper, sprites.claw_right_lower]) {
    assert.equal(claw.columns, 6);
    assert.equal(claw.rows, 4);
    assert.equal(claw.frameCount, 24);
    assert.equal(claw.framesPerSecond, 4);
    assert.equal(claw.durationMs, 6000);
    assert.equal(claw.scaleChange, false);
    assert.equal(claw.placement.width, claw.clipRect.width);
    assert.equal(claw.placement.height, claw.clipRect.height);
    assert.equal(claw.glassClipPolygon.length, 4);
  }
  assert.deepEqual(sprites.claw_left_mid.glassClipPolygon, [
    { x: 62, y: 40 }, { x: 292, y: 8 }, { x: 300, y: 270 }, { x: 76, y: 270 },
  ]);
  assert.deepEqual(sprites.claw_right_upper.glassClipPolygon, [
    { x: 0, y: 21 }, { x: 215, y: 40 }, { x: 210, y: 210 }, { x: 0, y: 210 },
  ]);
  assert.deepEqual(sprites.claw_right_lower.glassClipPolygon, [
    { x: 0, y: 35 }, { x: 235, y: 60 }, { x: 225, y: 285 }, { x: 0, y: 260 },
  ]);
  assert.equal(sprites.star_light_ring.frameCount, 24);
  assert.equal(sprites.star_light_ring.framesPerSecond, 6);
  assert.equal(sprites.star_light_ring.durationMs, 4000);
  assert.equal(sprites.star_light_ring.scaleChange, false);
});

test("runtime loads one background and four sheets without individual frame duplication", async () => {
  const expected = [
    ["runtime/FRETIVA_GACHA_ARCADE_MAP_BASE_RUNTIME.png", 768, 1664],
    ["spritesheets/claw_left_mid_sheet_6x4.png", 1800, 1120],
    ["spritesheets/claw_right_upper_sheet_6x4.png", 1740, 1000],
    ["spritesheets/claw_right_lower_sheet_6x4.png", 1920, 1240],
    ["spritesheets/star_light_ring_sheet_6x4.png", 2760, 1456],
  ];
  for (const [file, width, height] of expected) {
    const png = await readFile(new URL(file, assetRoot));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.equal(png.readUInt32BE(16), width, file);
    assert.equal(png.readUInt32BE(20), height, file);
    assert.equal(png[24], 8, `${file} bit depth`);
    assert.equal(png[25], 6, `${file} RGBA color type`);
  }
  const runtimeSources = getShooterMapAssetSources(GACHA_ARCADE_MAP_SKIN);
  assert.equal(runtimeSources.length, 5);
  assert.equal(runtimeSources.some((source) => source.includes("/frames/")), false);
  assert.equal(runtimeSources.some((source) => source.includes("COMPOSITE")), false);
  assert.equal(GACHA_ARCADE_MAP_SKIN.previewImage, GACHA_ARCADE_MAP_SKIN.background.src);
  assert.equal(GACHA_ARCADE_MAP_SKIN.pickerPreviewImage, GACHA_ARCADE_MAP_SKIN.background.src);
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.layout, []);
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.layers, []);
});

test("renderer uses one visibility-aware 10Hz loop without React frame state or scale", async () => {
  const [renderer, field, styles, sharedClock, app, skinSource] = await Promise.all([
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/GachaArcadeField.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/sharedSpriteClock.js", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/skins/gachaArcade.js", import.meta.url), "utf8"),
  ]);
  assert.match(renderer, /stage === "underlay" && skin\.id === "gacha-arcade"/);
  assert.match(field, /subscribeSharedMapAnimation\(field/);
  assert.match(field, /runtimeAnimation\.clockFramesPerSecond/);
  assert.doesNotMatch(field, /useState/);
  assert.doesNotMatch(field, /transform.*scale|scale\(/i);
  assert.match(field, /clipPath: getGlassClipPath\(sprite\)/);
  assert.match(styles, /\.shooterMapGachaArcadeField[\s\S]*?overflow: hidden/);
  assert.match(styles, /\.shooterMapGachaArcadeSprite[\s\S]*?overflow: hidden/);
  assert.doesNotMatch(styles, /shooterMapGachaArcadeSprite[^{]*\{[^}]*transform\s*:/s);
  assert.match(sharedClock, /document\.visibilityState !== "hidden"/);
  assert.match(sharedClock, /subscriptions\.delete\(element\)/);
  assert.match(app, /const DEFAULT_SHOOTER_MAP_ID = "gacha-arcade"/);
  assert.match(app, /return DEFAULT_SHOOTER_MAP_ID;/);
  assert.doesNotMatch(skinSource, /import .*asset_manifest/);
});
