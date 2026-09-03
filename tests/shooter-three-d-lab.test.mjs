import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  DEFAULT_THREE_D_LAB_SETTINGS,
  createThreeDLabViewProjection,
  normalizeThreeDLabSettings,
  projectGameplayPointToThreeDLab,
} from "../src/shooter/threed/threeDLabProjection.js";
import {
  createThreeDLabHorizontalViewProjection,
  gameplayPointToThreeDLabHorizontalWorld,
  projectGameplayPointToThreeDLabHorizontal,
} from "../src/shooter/threed/threeDLabHorizontalProjection.js";
import {
  THREE_D_LAB_BILLBOARD_MODES,
  THREE_D_LAB_HORIZONTAL_LAYOUT,
} from "../src/shooter/threed/threeDLabHorizontalLayout.js";
import { THREE_D_LAB_MAP_SKIN } from "../src/shooter/maps/skins/threeDLab.js";

const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const registrySource = fs.readFileSync(new URL("../src/shooter/maps/registry.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/shooter/threed/ThreeDLabRenderer.jsx", import.meta.url), "utf8");
const horizontalRendererSource = fs.readFileSync(new URL("../src/shooter/threed/ThreeDLabHorizontalRenderer.jsx", import.meta.url), "utf8");
const canalArtSource = fs.readFileSync(new URL("../src/shooter/threed/moonlitLotusCanalArt.js", import.meta.url), "utf8");
const mapRendererSource = fs.readFileSync(new URL("../src/shooter/maps/ShootingMapRenderer.jsx", import.meta.url), "utf8");
const horizontalAttackSource = fs.readFileSync(new URL("../src/shooter/desktopHorizontal/desktopHorizontalAttack.js", import.meta.url), "utf8");

test("3D LAB uses a real perspective projection for approaching billboard enemies", () => {
  const viewport = { width: 390, height: 756 };
  const far = projectGameplayPointToThreeDLab({ x: 68, y: 8 }, DEFAULT_THREE_D_LAB_SETTINGS, viewport);
  const near = projectGameplayPointToThreeDLab({ x: 68, y: 84 }, DEFAULT_THREE_D_LAB_SETTINGS, viewport);

  assert.ok(near.screenY > far.screenY, "approaching enemies should move down from the horizon");
  assert.ok(near.scale > far.scale * 3, "Perspective Camera distance should make near enemies much larger");
  assert.ok(Math.abs(near.screenX - viewport.width / 2) > Math.abs(far.screenX - viewport.width / 2));
  assert.equal(createThreeDLabViewProjection(DEFAULT_THREE_D_LAB_SETTINGS, viewport).length, 16);
});

test("3D LAB tuning clamps every live developer control to mobile-safe ranges", () => {
  const normalized = normalizeThreeDLabSettings({
    cameraFov: 999,
    railWidth: 999,
    groundWidth: 18,
    enemySpawnZ: -10,
    enemyHitZ: 11,
    guitarDashDuration: 2,
    guitarSlashDuration: 900,
    guitarReturnDuration: 4,
    afterimageStrength: 12,
  });

  assert.equal(normalized.cameraFov, 82);
  assert.ok(normalized.railWidth <= normalized.groundWidth * 0.72);
  assert.ok(normalized.enemySpawnZ >= normalized.enemyHitZ + 18);
  assert.equal(normalized.guitarDashDuration, 40);
  assert.equal(normalized.guitarSlashDuration, 120);
  assert.equal(normalized.guitarReturnDuration, 100);
  assert.equal(normalized.afterimageStrength, 1);
});

test("3D LAB is a developer-only map isolated from MODE7 LAB and formal map cycling", () => {
  assert.equal(THREE_D_LAB_MAP_SKIN.id, "dev-three-d-lab");
  assert.equal(THREE_D_LAB_MAP_SKIN.renderer, "perspective3d");
  assert.equal(THREE_D_LAB_MAP_SKIN.devOnly, true);
  assert.equal(THREE_D_LAB_MAP_SKIN.label, "3D LAB");
  assert.match(registrySource, /PSEUDO3D_TEST_MAP_SKIN,\s*THREE_D_LAB_MAP_SKIN/);
  assert.match(appSource, /\.\.\.\(import\.meta\.env\.DEV \? DEVELOPER_SHOOTER_MAP_SKINS : \[\]\)/);
  assert.match(appSource, /developerShooterMapOptions/);
  assert.match(mapRendererSource, /skin\?\.renderer === "perspective3d"/);
});

test("3D LAB renders lightweight WebGL planes and exposes the complete live tuning panel", () => {
  assert.match(rendererSource, /getContext\?\.\("webgl"/);
  assert.match(rendererSource, /createThreeDLabViewProjection/);
  assert.match(rendererSource, /gl\.drawArrays\(gl\.TRIANGLES/);
  assert.match(rendererSource, /gl\.deleteBuffer/);
  assert.match(rendererSource, /window\.cancelAnimationFrame/);

  [
    "Camera FOV",
    "Camera Height",
    "Camera Pitch",
    "Horizon Position",
    "Ground Width",
    "Rail Width",
    "Rail Length",
    "Enemy Spawn Z",
    "Enemy Hit Z",
    "Enemy Approach Speed",
    "Enemy Far Visibility",
    "Enemy Near Size",
    "Guitar Idle X",
    "Guitar Idle Y",
    "Guitar Idle Scale",
    "Guitar Dash Speed",
    "Guitar Slash Duration",
    "Guitar Return Duration",
    "Slash Rotation",
    "Slash Arc Size",
    "Afterimage Strength",
    "Hit Particle Strength",
    "Camera Shake Strength",
    "RESET 3D LAB",
  ].forEach((label) => assert.match(rendererSource, new RegExp(label)));
});

test("3D LAB shares current-target pitch judgment but replaces projectiles with an automatic slash", () => {
  assert.match(appSource, /candidate\.id === shooterActiveTargetIdRef\.current/);
  assert.match(appSource, /targetPitchName === detectedPitchName/);
  assert.match(appSource, /if \(desktopHorizontalShooterActive \|\| selectedMapIsThreeDLab\) \{\s*if \(!resolveShooterSlashHit\(target\)\) return;/);
  assert.match(appSource, /playThreeDLabGuitarSlash/);
  assert.match(appSource, /threeDLabAfterimage/);
  assert.match(appSource, /threeDLabSlashArc/);
  assert.match(appSource, /target\.hitboxActive !== false/);
  assert.doesNotMatch(appSource, /handleShooterArenaClick[\s\S]{0,500}resolveShooterSlashHit/);
});

test("desktop 3D LAB projects combat along world X while Z only varies depth", () => {
  const viewport = { width: 1180, height: 560 };
  const far = projectGameplayPointToThreeDLabHorizontal({ progress: 0, x: 18 }, viewport);
  const middle = projectGameplayPointToThreeDLabHorizontal({ progress: 0.5, x: 50 }, viewport);
  const near = projectGameplayPointToThreeDLabHorizontal({ progress: 1, x: 82 }, viewport);
  const upperLane = gameplayPointToThreeDLabHorizontalWorld({ progress: 0.5, x: 18 });
  const lowerLane = gameplayPointToThreeDLabHorizontalWorld({ progress: 0.5, x: 82 });

  assert.ok(far.screenX > middle.screenX && middle.screenX > near.screenX, "enemies must travel right to left");
  assert.equal(upperLane.worldX, lowerLane.worldX, "lane variation must not change combat progress");
  assert.ok(upperLane.worldZ < lowerLane.worldZ, "Z is reserved for back/front lane depth");
  assert.ok(Math.abs(far.scale - near.scale) < 0.5, "side camera must avoid a strong forward vanishing point");
  assert.equal(createThreeDLabHorizontalViewProjection(viewport).length, 16);
});

test("desktop 3D LAB layout exposes replaceable scene layers and role-specific billboard modes", () => {
  assert.deepEqual(
    THREE_D_LAB_HORIZONTAL_LAYOUT.layers.map((layer) => layer.id),
    ["skyHorizon", "farBackground", "farShoreline", "midgroundProps", "waterMesh", "waterDecor", "combatEntities", "foregroundProps", "effects", "hud"],
  );
  assert.equal(THREE_D_LAB_HORIZONTAL_LAYOUT.water.flowDirection, "right-to-left");
  assert.equal(THREE_D_LAB_HORIZONTAL_LAYOUT.water.waves.length, 3);
  assert.equal(THREE_D_LAB_HORIZONTAL_LAYOUT.billboardRoles.combatEntities, THREE_D_LAB_BILLBOARD_MODES.SCREEN_ALIGNED);
  assert.equal(THREE_D_LAB_HORIZONTAL_LAYOUT.billboardRoles.standingProps, THREE_D_LAB_BILLBOARD_MODES.Y_AXIS);
  assert.equal(THREE_D_LAB_HORIZONTAL_LAYOUT.billboardRoles.waterDecor, THREE_D_LAB_BILLBOARD_MODES.HORIZONTAL_PLANE);
  assert.deepEqual(Object.keys(THREE_D_LAB_HORIZONTAL_LAYOUT.assetSlots).sort(), ["effectTextures", "farBackground", "foregroundProps", "midgroundProps", "skyHorizon", "waterTexture"]);
  assert.equal(THREE_D_LAB_HORIZONTAL_LAYOUT.endless.chunkCount, 6);
  assert.equal(new Set(THREE_D_LAB_HORIZONTAL_LAYOUT.endless.chunkVariants.map((chunk) => chunk.landmark)).size, 6);
  assert.ok(new Set(THREE_D_LAB_HORIZONTAL_LAYOUT.layers.map((layer) => layer.scrollRate)).size >= 5);
});

test("desktop 3D LAB uses one Canvas loop with cached six-scene diorama chunks", () => {
  assert.match(horizontalRendererSource, /data-renderer="canvas-diorama"/);
  assert.match(horizontalRendererSource, /data-water-system="seamless-mirrored-uv-multirate"/);
  assert.match(horizontalRendererSource, /getContext\?\.\("2d"/);
  assert.match(horizontalRendererSource, /createMoonlitLotusCanalChunks/);
  assert.match(horizontalRendererSource, /window\.requestAnimationFrame\(render\)/);
  assert.match(horizontalRendererSource, /window\.cancelAnimationFrame\(animationFrameId\)/);
  assert.match(horizontalRendererSource, /scrollSpeed \+= \(targetSpeed - scrollSpeed\) \* ease/);
  assert.match(horizontalRendererSource, /targetSpeed > scrollSpeed \? 3\.4 : 5\.4/);
  assert.match(canalArtSource, /Object\.freeze\(\{ assets, chunks: Object\.freeze\(chunks\) \}\)/);
  ["midground", "foreground"].forEach((layer) => {
    assert.match(canalArtSource, new RegExp(`const ${layer} = createCanvas`));
  });
  assert.match(canalArtSource, /drawCachedLayer\(ctx, cache\.chunks/);
});

test("map renderer selects the horizontal Canvas scene only through the dedicated flag", () => {
  assert.match(mapRendererSource, /if \(threeDLabHorizontalBattle\)/);
  assert.match(mapRendererSource, /<ThreeDLabHorizontalRenderer/);
  assert.match(mapRendererSource, /<ThreeDLabRenderer/);
  assert.match(appSource, /devMapActive: selectedMapIsThreeDLab/);
  assert.match(appSource, /threeDLabHorizontalBattle=\{desktopHorizontalShooterActive\}/);
  assert.match(appSource, /threeDLabBattleState=\{gameState\}/);
  assert.match(appSource, /projectGameplayPointToThreeDLabHorizontal/);
});

test("Moonlit Lotus Canal uses the River Garden production pack and keeps old environment mockups out of normal play", () => {
  [
    "panorama_sky_01_rgb.png",
    "environment_room_garden_rgba.png",
    "environment_room_bridge_rgba.png",
    "environment_room_close_rgba.png",
    "water_floor_river_rgb.png",
    "foreground_riverbank_rgba.png",
    "waterwheel_rotor_rgba.png",
    "waterwheel_12f_rgba.png",
    "waterfall_8f_rgba.png",
  ].forEach((asset) => assert.match(canalArtSource, new RegExp(asset.replace(".", "\\."))));
  ["willow_foreground_rgba.png"].forEach((asset) => {
    assert.doesNotMatch(canalArtSource, new RegExp(asset.replace(".", "\\.")));
  });
  ["panorama.png", "pavilion-willow.png", "waterwheel-waterfall.png", "lotus-rock-01.png"].forEach((asset) => {
    assert.doesNotMatch(canalArtSource, new RegExp(asset.replace(".", "\\.")));
  });
  ["drawWaterWheelDynamic", "drawWaterfallDynamic", "drawPavilion", "drawRidge", "drawLotus", "drawWillow", "drawRock"].forEach((builder) => {
    assert.doesNotMatch(canalArtSource, new RegExp(`function ${builder}`));
  });
  assert.match(canalArtSource, /function drawWaterwheel\(/);
  assert.match(canalArtSource, /function drawWaterfall\(/);
  assert.match(canalArtSource, /WATERWHEEL_FRAME = Object\.freeze\(\{ count: 12/);
  assert.match(canalArtSource, /WATERFALL_FRAME = Object\.freeze\(\{ count: 8/);
  assert.doesNotMatch(horizontalRendererSource, /threeDLabCanalAtmosphere/);
  assert.doesNotMatch(`${horizontalRendererSource}\n${canalArtSource}\n${horizontalAttackSource}`, /MONSTER FLOW|RIVER FLOW|SIDE CAMERA|X \/ Z|threeDLabCombatWake|threeDLabHitRipple/);
});

test("Moonlit Lotus Canal scrolls a seamless river, foam, debris, and sparse foreground at separate rates", () => {
  assert.match(canalArtSource, /function drawTiledPanorama\(/);
  assert.match(canalArtSource, /function drawWaterFloor\(/);
  assert.match(canalArtSource, /function drawMidgroundLayer\(/);
  assert.match(canalArtSource, /function drawForegroundLayer\(/);
  assert.match(canalArtSource, /createChromaCleanCutout/);
  assert.match(canalArtSource, /createSeamlessWaterLoop/);
  assert.match(canalArtSource, /createWaterFloorPlate/);
  assert.match(canalArtSource, /createForegroundClusterSprite/);
  assert.match(canalArtSource, /drawCrossfadedWaterBase/);
  assert.match(canalArtSource, /drawWrappedWaterLoop/);
  assert.match(canalArtSource, /drawFloatingDebris/);
  assert.match(canalArtSource, /createRadialGradient/);
  assert.ok((canalArtSource.match(/drawCachedLayer\(/g) ?? []).length >= 3);
  ["panorama: 7.5", "midground: 86", "baseWater: 132", "highlight: 196", "foam: 215", "debris: 230", "foreground: 274"].forEach((rate) => {
    assert.match(canalArtSource, new RegExp(rate.replace(".", "\\.")));
  });
  assert.match(canalArtSource, /ROOM_SEQUENCE = Object\.freeze\(\["garden", "close", "garden", "garden", "bridge", "close"\]\)/);
  assert.match(canalArtSource, /FOREGROUND_CLUSTER_LAYOUTS = Object\.freeze/);
  assert.match(horizontalRendererSource, /data-parallax-levels="7"/);
  assert.match(horizontalRendererSource, /data-parallax-rates="0\.40,0\.61,0\.91,1\.00,1\.07,1\.27"/);
  assert.match(horizontalRendererSource, /data-concept="river-garden-v2-close"/);
  assert.match(horizontalRendererSource, /data-water-floor="water-floor-river-rgb"/);
  assert.match(horizontalRendererSource, /data-foreground-height="15\.8-percent"/);
  assert.match(horizontalRendererSource, /data-layer-order="sky,close-environment,river-floor,combat,riverbank-foreground,hud"/);
  assert.match(horizontalRendererSource, /data-animated-landmarks="waterwheel-12f,waterfall-8f"/);
  assert.match(canalArtSource, /horizontalDrift = Math\.cos\(time/);
  assert.doesNotMatch(canalArtSource, /verticalBobbing|drawForegroundBank/);
});

test("desktop 3D LAB keeps the guitar fixed and plays exact eight-frame slash and impact sheets", () => {
  assert.match(horizontalAttackSource, /impactDelay: 188/);
  assert.match(horizontalAttackSource, /totalDuration: 410/);
  assert.match(horizontalAttackSource, /frameCount: 8/);
  assert.match(horizontalAttackSource, /gold-slash-8x\.png/);
  assert.match(horizontalAttackSource, /water-impact-8x\.png/);
  assert.match(horizontalAttackSource, /Math\.hypot\(deltaX, deltaY\)/);
  assert.match(horizontalAttackSource, /rotate\(17deg\) scale\(1\.045\)/);
  assert.doesNotMatch(horizontalAttackSource, /translate3d\(|dashX|dashY|GuitarAfterimage|ReturnGlow/);
  assert.match(appSource, /threeDLabEnemySpawnAura/);
  assert.match(appSource, /threeDLabEnemyReflection/);
});

test("River Garden V2 layer assets and production animation sheets retain their exact formats", () => {
  const assetRoot = new URL("../public/assets/maps/three-d-lab/river-garden-v1/", import.meta.url);
  const alphaAssets = [
    "waterwheel_rotor_rgba.png",
    "waterwheel_12f_rgba.png",
    "waterfall_8f_rgba.png",
  ];
  alphaAssets.forEach((name) => {
    const png = fs.readFileSync(new URL(name, assetRoot));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png[25], 6, `${name} must be RGBA`);
  });
  const sky = fs.readFileSync(new URL("panorama_sky_01_rgb.png", assetRoot));
  assert.equal(sky[25], 2, "the panorama must remain RGB");
  const glowMask = fs.readFileSync(new URL("lantern_glow_mask.png", assetRoot));
  assert.equal(glowMask[25], 0, "the lantern emission mask must remain grayscale");
  const glow = fs.readFileSync(new URL("lantern_glow_rgba.png", assetRoot));
  assert.equal(glow[25], 3, "the supplied lantern glow is an indexed PNG");
  assert.notEqual(glow.indexOf(Buffer.from("tRNS")), -1, "the indexed lantern glow must retain transparency");
  const wheel = fs.readFileSync(new URL("waterwheel_12f_rgba.png", assetRoot));
  assert.equal(wheel.readUInt32BE(16), 3072);
  assert.equal(wheel.readUInt32BE(20), 256);
  assert.equal(wheel.readUInt32BE(16) / 12, 256);
  const waterfall = fs.readFileSync(new URL("waterfall_8f_rgba.png", assetRoot));
  assert.equal(waterfall.readUInt32BE(16), 2048);
  assert.equal(waterfall.readUInt32BE(20), 682);
  assert.equal(waterfall.readUInt32BE(16) / 8, 256);

  const v2Root = new URL("../public/assets/maps/three-d-lab/river-garden-v2/", import.meta.url);
  const closeEnvironment = fs.readFileSync(new URL("environment_room_close_rgba.png", v2Root));
  assert.equal(closeEnvironment[25], 6, "the close environment shell must remain RGBA");
  assert.equal(closeEnvironment.readUInt32BE(16), 1672);
  assert.equal(closeEnvironment.readUInt32BE(20), 941);
  const riverbank = fs.readFileSync(new URL("foreground_riverbank_rgba.png", v2Root));
  assert.equal(riverbank[25], 6, "the riverbank foreground must remain RGBA");
  assert.equal(riverbank.readUInt32BE(16), 1907);
  assert.equal(riverbank.readUInt32BE(20), 825);
  const waterFloor = fs.readFileSync(new URL("water_floor_river_rgb.png", v2Root));
  assert.equal(waterFloor[25], 2, "the water floor must remain RGB");
  assert.equal(waterFloor.readUInt32BE(16), 1672);
  assert.equal(waterFloor.readUInt32BE(20), 941);

  const effectRoot = new URL("../public/assets/maps/three-d-lab/moonlit-canal/", import.meta.url);
  ["gold-slash-8x.png", "water-impact-8x.png"].forEach((name) => {
    const png = fs.readFileSync(new URL(name, effectRoot));
    assert.equal(png[25], 6, `${name} must use real alpha`);
    assert.equal(png.readUInt32BE(16) % 8, 0, `${name} must split into eight equal cells`);
  });
});
