import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapAssetSources,
  isEditableShooterMap,
  isLayeredShooterMap,
  resolveLayeredShooterMap,
} from "../src/shooter/maps/registry.js";
import { LAVA_CANYON_MAP_SKIN } from "../src/shooter/maps/skins/lavaCanyon.js";
import { createMapPlacement } from "../src/shooter/maps/editor/editorState.js";
import { MAP_EDIT_SKINS, validateMapPlacements } from "../vite.config.js";

function readPngHeader(buffer) {
  return {
    signature: buffer.subarray(0, 8).toString("hex"),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("Lava Canyon combines editable lava scenery, torch flames, dragons, and an animated tattered banner", async () => {
  assert.equal(isLayeredShooterMap(LAVA_CANYON_MAP_SKIN), true);
  assert.equal(isEditableShooterMap(LAVA_CANYON_MAP_SKIN), true);
  assert.equal(LAVA_CANYON_MAP_SKIN.background.fit, "cover");
  assert.equal(LAVA_CANYON_MAP_SKIN.background.position, "center center");
  assert.equal(LAVA_CANYON_MAP_SKIN.background.animation, undefined);
  assert.equal(LAVA_CANYON_MAP_SKIN.background.locked, true);
  assert.equal(LAVA_CANYON_MAP_SKIN.background.glow, undefined);
  assert.equal(LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.enabled, true);
  assert.deepEqual(LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.viewBox, [0, 0, 852, 1846]);
  assert.equal(LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.preserveAspectRatio, "xMidYMid slice");
  assert.equal(LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.paths.length, 2);
  assert.deepEqual(
    LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.paths.map((path) => path.id),
    ["lava-bank-left", "lava-bank-right"],
  );
  assert.equal(
    LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.paths.every((path) => (
      path.d.startsWith("M") && path.d.includes(" L") && path.d.split(" L").length > 40
    )),
    true,
  );
  assert.deepEqual(LAVA_CANYON_MAP_SKIN.boundaryGlowOverlay.colors, {
    outer: "#ff2a00",
    middle: "#ff8a00",
    core: "#fff4a8",
  });
  assert.equal(
    LAVA_CANYON_MAP_SKIN.background.src,
    "/assets/maps/lava-canyon/lava-canyon-background.png",
  );
  assert.equal(LAVA_CANYON_MAP_SKIN.previewImage, LAVA_CANYON_MAP_SKIN.background.src);
  assert.deepEqual(LAVA_CANYON_MAP_SKIN.referenceViewport, {
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  });
  assert.equal(LAVA_CANYON_MAP_SKIN.assetCatalog.length, 7);
  assert.equal(LAVA_CANYON_MAP_SKIN.ambientEvents.length, 1);
  const crossingEvent = LAVA_CANYON_MAP_SKIN.ambientEvents[0];
  assert.equal(crossingEvent.type, "flying-dragon-crossing");
  assert.equal(crossingEvent.actorAssetId, "ambient-flying-baby-dragon");
  assert.equal(crossingEvent.actorInstanceId, "lava-flying-baby-dragon-01");
  assert.equal(crossingEvent.homeInstanceId, undefined);
  assert.deepEqual(
    [crossingEvent.flightSheet.columns, crossingEvent.flightSheet.rows, crossingEvent.flightSheet.frameCount],
    [3, 2, 6],
  );
  assert.deepEqual(
    [crossingEvent.breathSheet.columns, crossingEvent.breathSheet.rows, crossingEvent.breathSheet.frameCount],
    [3, 2, 6],
  );
  assert.ok(crossingEvent.settings.homeIntervalSeconds.min >= 2);
  assert.ok(crossingEvent.settings.homeIntervalSeconds.max > crossingEvent.settings.homeIntervalSeconds.min);
  assert.deepEqual(crossingEvent.settings.firstDelaySeconds, { min: 2, max: 3 });
  assert.deepEqual(crossingEvent.settings.homeIntervalSeconds, { min: 2, max: 3 });
  assert.deepEqual(crossingEvent.settings.awayDelaySeconds, { min: 2, max: 3 });
  assert.ok(crossingEvent.settings.returnDurationSeconds.min > 5);
  assert.ok(crossingEvent.settings.breathProgress.min > 0.35);
  assert.ok(crossingEvent.settings.breathProgress.max < 0.7);
  assert.ok(LAVA_CANYON_MAP_SKIN.layout.length >= 8);
  assert.deepEqual(LAVA_CANYON_MAP_SKIN.layers, []);
  const resolved = resolveLayeredShooterMap(LAVA_CANYON_MAP_SKIN);
  assert.equal(resolved.layers.length, LAVA_CANYON_MAP_SKIN.layout.length);
  assert.equal(resolved.layers[0].assetId, "lava-guitar-platform");
  assert.equal(resolved.layers[0].slot, "midground-environment");
  assert.equal(resolved.layers[0].placement.x, 0.5);
  assert.ok(resolved.layers[0].placement.y > 0.8);
  assert.equal(resolved.layers[0].placement.rotation, 0);
  assert.equal(resolved.layers[0].animation, undefined);
  const effectLayers = resolved.layers.filter((layer) => (
    layer.assetId === "lava-geyser" || layer.assetId === "lava-boiling-pool"
  ));
  assert.equal(effectLayers.every((layer) => layer.slot === "animated-environment"), true);
  assert.deepEqual(
    [...new Set(effectLayers.map((layer) => layer.animation?.type))].sort(),
    ["lava-boil", "lava-geyser"],
  );
  assert.equal(effectLayers.every((layer) => layer.placement.x >= 0 && layer.placement.x <= 1), true);
  const torchLayers = resolved.layers.filter((layer) => layer.assetId === "lava-torch-flame");
  assert.ok(torchLayers.length >= 1);
  assert.equal(torchLayers.every((layer) => layer.slot === "animated-environment"), true);
  assert.equal(torchLayers.every((layer) => layer.animation?.type === "torch-flame"), true);
  assert.ok(new Set(torchLayers.map((layer) => layer.animationSpeed)).size >= 1);
  assert.equal(torchLayers.every((layer) => (
    layer.placement.x >= 0 && layer.placement.x <= 1
    && layer.placement.y >= 0 && layer.placement.y <= 1
  )), true);
  const dragonLayer = resolved.layers.find((layer) => layer.assetId === "ambient-baby-dragon");
  assert.equal(dragonLayer.instanceId, "lava-baby-dragon-01");
  assert.equal(dragonLayer.slot, "animated-environment");
  assert.equal(dragonLayer.animation, undefined);
  assert.equal(dragonLayer.creature.type, "baby-dragon");
  assert.deepEqual(Object.keys(dragonLayer.creature.frames), [
    "idle",
    "blink",
    "rest",
    "sleep",
    "inhale",
    "openMouth",
    "breath",
    "smoke",
  ]);
  assert.equal(dragonLayer.creature.settings.enabled, true);
  assert.equal(dragonLayer.creature.settings.anchors.length, 0);
  assert.ok(dragonLayer.creature.settings.breathChance > 0);
  assert.ok(dragonLayer.creature.settings.breathChance <= 1);
  assert.deepEqual(validateMapPlacements([], LAVA_CANYON_MAP_SKIN.assetCatalog), []);
  const validatedLayout = validateMapPlacements(
    LAVA_CANYON_MAP_SKIN.layout,
    LAVA_CANYON_MAP_SKIN.assetCatalog,
  );
  assert.equal(validatedLayout.length, LAVA_CANYON_MAP_SKIN.layout.length);
  assert.equal(validatedLayout[0].animation, "none");
  assert.equal(validatedLayout.slice(1, 5).every((placement) => placement.animation.startsWith("lava-")), true);
  assert.equal(validatedLayout[5].assetId, "ambient-baby-dragon");
  assert.equal(validatedLayout[5].animation, "none");
  assert.equal(validatedLayout[5].creature.anchors.length, 0);
  assert.equal(validatedLayout[6].assetId, "ambient-flying-baby-dragon");
  assert.equal(validatedLayout[6].instanceId, crossingEvent.actorInstanceId);
  assert.equal(validatedLayout[6].animation, "none");
  assert.ok(validatedLayout[6].x >= 0 && validatedLayout[6].x <= 1);
  assert.ok(validatedLayout[6].y >= 0 && validatedLayout[6].y <= 1);
  assert.ok(validatedLayout[6].scale >= 0.1);
  assert.equal(validatedLayout[6].scaleX, 1);
  assert.equal(
    validatedLayout.filter((placement) => placement.assetId === "ambient-flying-baby-dragon").length,
    1,
  );
  const bannerPlacement = validatedLayout.find((placement) => placement.assetId === "tattered-dragon-banner");
  assert.ok(bannerPlacement);
  assert.equal(bannerPlacement.instanceId, "lava-tattered-dragon-banner-right-01");
  assert.ok(Number.isInteger(bannerPlacement.layer));
  assert.equal(bannerPlacement.animationSpeed, 1);
  const flyingDragonLayer = resolved.layers.find((layer) => layer.assetId === "ambient-flying-baby-dragon");
  const flyingDragonAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-flying-baby-dragon");
  assert.ok(flyingDragonLayer);
  assert.equal(flyingDragonAsset.maxInstances, 1);
  assert.equal(flyingDragonAsset.eventActor.readySrc, undefined);
  assert.equal(flyingDragonLayer.label, "비행하는 용");
  assert.equal(flyingDragonLayer.eventActor.type, "flying-dragon-crossing");
  assert.deepEqual(flyingDragonLayer.spriteSheet, {
    columns: 3,
    rows: 2,
    frameCount: 6,
    previewFrame: 0,
  });
  const bannerLayer = resolved.layers.find((layer) => layer.assetId === "tattered-dragon-banner");
  const bannerAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "tattered-dragon-banner");
  assert.ok(bannerLayer);
  assert.equal(bannerLayer.slot, "animated-environment");
  assert.equal(bannerAsset.label, "펄럭이는 찢어진 용 깃발");
  assert.equal(bannerAsset.spriteSheet.columns, 1);
  assert.equal(bannerAsset.spriteSheet.rows, 1);
  assert.equal(bannerAsset.spriteSheet.frameCount, 3);
  assert.equal(bannerAsset.spriteSheet.previewFrame, 0);
  assert.equal(bannerAsset.spriteSheet.animation, "wind-flag");
  assert.equal(bannerAsset.spriteSheet.framesPerSecond, 4);
  assert.equal(bannerAsset.spriteSheet.frames.length, 3);
  assert.equal(bannerAsset.spriteSheet.staticSrc.endsWith("tattered-dragon-banner-pole.png"), true);
  assert.equal(bannerLayer.animationSpeed, bannerPlacement.animationSpeed);
  const torchAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "lava-torch-flame");
  assert.ok(torchAsset);
  assert.equal(torchAsset.label, "횃불 타오르는 불꽃");
  assert.equal(torchAsset.defaultAnimation, "torch-flame");
  const newTorchPlacement = createMapPlacement(
    torchAsset.id,
    validatedLayout,
    () => "lava-torch-flame-added-in-editor",
    torchAsset,
  );
  assert.equal(newTorchPlacement.animation, "torch-flame");
  assert.equal(newTorchPlacement.animationSpeed, torchAsset.defaultAnimationSpeed);
  assert.throws(
    () => validateMapPlacements([{ instanceId: "unknown-01", assetId: "unknown" }], LAVA_CANYON_MAP_SKIN.assetCatalog),
    /Invalid map asset identity/,
  );
  assert.deepEqual(getShooterMapAssetSources(LAVA_CANYON_MAP_SKIN), [
    "/assets/maps/lava-canyon/lava-canyon-background.png",
    "/assets/maps/lava-canyon/platforms/lava-guitar-platform.png",
    "/assets/maps/lava-canyon/effects/lava-geyser.png",
    "/assets/maps/lava-canyon/effects/lava-boiling-pool.png",
    "/assets/maps/lava-canyon/effects/torch-flame.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-idle.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-blink.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-rest.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-sleep.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-inhale.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-open-mouth.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-breath.png",
    "/assets/maps/lava-canyon/creatures/baby-dragon/dragon-smoke.png",
    "/assets/maps/lava-canyon/events/baby-dragon-flight-sheet.png",
    "/assets/maps/lava-canyon/decorations/tattered-dragon-banner-cloth-01.png",
    "/assets/maps/lava-canyon/decorations/tattered-dragon-banner-pole.png",
    "/assets/maps/lava-canyon/decorations/tattered-dragon-banner-cloth-02.png",
    "/assets/maps/lava-canyon/decorations/tattered-dragon-banner-cloth-03.png",
    "/assets/maps/lava-canyon/events/baby-dragon-breath-sheet.png",
  ]);
  assert.ok(LAYERED_SHOOTER_MAP_SKINS.includes(LAVA_CANYON_MAP_SKIN));
  assert.deepEqual(
    [...MAP_EDIT_SKINS.keys()].sort(),
    LAYERED_SHOOTER_MAP_SKINS.map((skin) => skin.id).sort(),
  );
  assert.equal(
    LAYERED_SHOOTER_MAP_SKINS.every((skin) => (
      isEditableShooterMap(skin) && skin.background?.locked === true
    )),
    true,
  );

  const background = readPngHeader(await readFile(new URL(
    `../public${LAVA_CANYON_MAP_SKIN.background.src}`,
    import.meta.url,
  )));
  assert.equal(background.signature, "89504e470d0a1a0a");
  assert.deepEqual([background.width, background.height], [852, 1846]);
  assert.ok(background.height > background.width * 2);

  const platformAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "lava-guitar-platform");
  const platform = readPngHeader(await readFile(new URL(
    `../public${platformAsset.src}`,
    import.meta.url,
  )));
  assert.equal(platform.signature, "89504e470d0a1a0a");
  assert.equal(platform.colorType, 6);
  assert.ok(platform.width >= 2048);
  assert.ok(platform.height >= 400);
  assert.ok(platform.width > platform.height * 4);

  const geyserAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "lava-geyser");
  const geyser = readPngHeader(await readFile(new URL(`../public${geyserAsset.src}`, import.meta.url)));
  assert.equal(geyser.signature, "89504e470d0a1a0a");
  assert.equal(geyser.colorType, 6);
  assert.ok(geyser.height > geyser.width);

  const poolAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "lava-boiling-pool");
  const pool = readPngHeader(await readFile(new URL(`../public${poolAsset.src}`, import.meta.url)));
  assert.equal(pool.signature, "89504e470d0a1a0a");
  assert.equal(pool.colorType, 6);
  assert.ok(pool.width > pool.height * 2);

  const torch = readPngHeader(await readFile(new URL(`../public${torchAsset.src}`, import.meta.url)));
  assert.equal(torch.signature, "89504e470d0a1a0a");
  assert.equal(torch.colorType, 6);
  assert.deepEqual([torch.width, torch.height], [755, 1024]);
  assert.ok(torch.height > torch.width);

  const dragonAsset = LAVA_CANYON_MAP_SKIN.assetCatalog.find((asset) => asset.id === "ambient-baby-dragon");
  for (const frameSrc of Object.values(dragonAsset.creature.frames)) {
    const frame = readPngHeader(await readFile(new URL(`../public${frameSrc}`, import.meta.url)));
    assert.equal(frame.signature, "89504e470d0a1a0a");
    assert.equal(frame.colorType, 6);
    assert.deepEqual([frame.width, frame.height], [444, 444]);
  }

  for (const sheet of [crossingEvent.flightSheet, crossingEvent.breathSheet]) {
    const spriteSheet = readPngHeader(await readFile(new URL(`../public${sheet.src}`, import.meta.url)));
    assert.equal(spriteSheet.signature, "89504e470d0a1a0a");
    assert.equal(spriteSheet.colorType, 6);
    assert.deepEqual([spriteSheet.width, spriteSheet.height], [1536, 1024]);
    assert.equal(spriteSheet.width / sheet.columns, spriteSheet.height / sheet.rows);
  }

  const bannerSources = [
    bannerAsset.src,
    bannerAsset.spriteSheet.staticSrc,
    ...bannerAsset.spriteSheet.frames.map((frame) => frame.src),
  ];
  for (const bannerSrc of new Set(bannerSources)) {
    const bannerFrame = readPngHeader(await readFile(new URL(`../public${bannerSrc}`, import.meta.url)));
    assert.equal(bannerFrame.signature, "89504e470d0a1a0a");
    assert.equal(bannerFrame.colorType, 6);
    assert.deepEqual([bannerFrame.width, bannerFrame.height], [1254, 1254]);
  }

  const [rendererSource, ambientCreatureSource, crossingSource, mapSkinStyles, appSource, editorPanelSource] = await Promise.all([
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/AmbientCreature.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/FlyingDragonCrossing.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/editor/MapEditPanel.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(rendererSource, /function MapBoundaryGlowOverlay/);
  assert.match(rendererSource, /data-map-overlay=\{overlay\.id\}/);
  assert.match(rendererSource, /<MapBoundaryGlowOverlay overlay=\{skin\.boundaryGlowOverlay\}/);
  assert.doesNotMatch(rendererSource, /luminanceToAlpha/);
  assert.doesNotMatch(rendererSource, /href=\{background\.src\}/);
  assert.match(mapSkinStyles, /@keyframes shooterMapBoundaryOuterPulse/);
  assert.match(mapSkinStyles, /@keyframes shooterMapBoundaryMiddlePulse/);
  assert.match(mapSkinStyles, /@keyframes shooterMapBoundaryCorePulse/);
  assert.match(mapSkinStyles, /@keyframes shooterMapLavaGeyser/);
  assert.match(rendererSource, /animationType === "torch-flame"/);
  assert.match(rendererSource, /shooterMapTorchFlameGlow/);
  assert.match(mapSkinStyles, /@keyframes shooterMapTorchFlameBrightness/);
  assert.match(mapSkinStyles, /@keyframes shooterMapTorchLightPulse/);
  assert.match(rendererSource, /function LavaEnvironmentAsset/);
  assert.match(rendererSource, /LAVA_GEYSER_PARTICLES/);
  assert.match(rendererSource, /LAVA_POOL_BUBBLES/);
  assert.match(mapSkinStyles, /@keyframes shooterMapLavaGeyserParticle/);
  assert.match(mapSkinStyles, /@keyframes shooterMapLavaPoolBubble/);
  assert.match(mapSkinStyles, /@keyframes shooterMapLavaBubbleRipple/);
  assert.match(mapSkinStyles, /clip-path: inset\(98% 10% 0 10% round 50%\)/);
  assert.match(mapSkinStyles, /@keyframes shooterBabyDragonIdle/);
  assert.match(mapSkinStyles, /@keyframes shooterBabyDragonBreath/);
  assert.match(ambientCreatureSource, /function BabyDragonCreature/);
  assert.match(ambientCreatureSource, /setPose\("inhale"\)/);
  assert.match(ambientCreatureSource, /setPose\("openMouth"\)/);
  assert.match(ambientCreatureSource, /setPose\("breath"\)/);
  assert.match(ambientCreatureSource, /setPose\("smoke"\)/);
  assert.match(rendererSource, /<MapAmbientEvents/);
  assert.match(crossingSource, /function getFrameStyle/);
  assert.match(crossingSource, /backgroundPosition/);
  assert.match(crossingSource, /setSequence\("breath"\)/);
  assert.match(crossingSource, /setSequence\("flight"\)/);
  assert.match(crossingSource, /right-to-left/);
  assert.match(crossingSource, /scheduleDeparture/);
  assert.match(crossingSource, /startDeparture/);
  assert.match(crossingSource, /startOutbound/);
  assert.match(crossingSource, /waitOffscreen/);
  assert.match(crossingSource, /startReturn/);
  assert.match(crossingSource, /startLanding/);
  assert.match(crossingSource, /onOriginHiddenChange/);
  assert.match(crossingSource, /instanceId: actorLayer\.instanceId/);
  assert.doesNotMatch(crossingSource, /getHomeLayer/);
  assert.match(crossingSource, /prefers-reduced-motion/);
  assert.match(rendererSource, /shooterMapSkinAsset--event-hidden/);
  assert.match(rendererSource, /shooterMapSkinAsset--event-actor/);
  assert.match(rendererSource, /function SpriteSheetMapAsset/);
  assert.match(rendererSource, /shooterMapEventActorReady/);
  assert.match(rendererSource, /shooterMapSpriteSheetAsset--wind-flag/);
  assert.match(rendererSource, /framesPerSecond/);
  assert.match(editorPanelSource, /function AssetPreview/);
  assert.match(editorPanelSource, /eventActor\?\.readySrc/);
  assert.match(editorPanelSource, /mapEditSpriteSheetThumbnail/);
  assert.match(mapSkinStyles, /@keyframes shooterMapFlyingDragonTakeoff/);
  assert.match(mapSkinStyles, /@keyframes shooterMapFlyingDragonOutbound/);
  assert.match(mapSkinStyles, /@keyframes shooterMapFlyingDragonReturn/);
  assert.match(mapSkinStyles, /@keyframes shooterMapFlyingDragonLanding/);
  assert.match(mapSkinStyles, /@keyframes shooterMapFlyingDragonBob/);
  assert.match(mapSkinStyles, /@keyframes shooterMapWindFlagFrames/);
  assert.doesNotMatch(mapSkinStyles, /shooterMapSkinStage:not\(\.shooterMapSkinStage--editing\) \.shooterMapSkinAsset--event-actor/);
  assert.match(mapSkinStyles, /\.shooterMapFlyingDragonRun\[data-sequence="breath"\]/);
  assert.match(mapSkinStyles, /pointer-events: none/);
  assert.match(
    appSource,
    /ambientEventsActive=\{gameState !== GAME_STATES\.PAUSED && gameState !== GAME_STATES\.GAMEOVER\}/,
  );
  assert.match(mapSkinStyles, /\.shooterArena\.paused \.shooterMapBoundaryGlowPath/);
  assert.doesNotMatch(mapSkinStyles, /@keyframes shooterMapLavaBoil/);
});
