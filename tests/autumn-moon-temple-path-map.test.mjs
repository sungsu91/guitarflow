import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getAutumnGroundGustDelay,
  getAutumnLoopFrame,
  getAutumnSpriteCell,
} from "../src/shooter/maps/autumnMoonTempleAnimation.js";
import {
  getShooterMapPerformanceFingerprint,
  getShooterMapPerformancePolicy,
} from "../src/shooter/maps/performancePolicy.js";
import {
  LAYERED_SHOOTER_MAP_SKINS,
  getRandomShooterMapId,
  getShooterMapAssetSources,
  getShooterMapsForLayout,
} from "../src/shooter/maps/registry.js";
import {
  AUTUMN_MOON_TEMPLE_PATH_MAP_SKIN as MAP,
  AUTUMN_MOON_TEMPLE_RUNTIME as RUNTIME,
} from "../src/shooter/maps/skins/autumnMoonTemplePath.js";

const ASSET_ROOT = new URL("../public/assets/maps/autumn-moon-temple-path/", import.meta.url);
const APP_SOURCE_URL = new URL("../src/App.jsx", import.meta.url);
const RENDERER_SOURCE_URL = new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url);
const RUNTIME_SOURCE_URL = new URL("../src/shooter/maps/AutumnMoonTemplePathField.jsx", import.meta.url);
const STYLE_SOURCE_URL = new URL("../src/shooter/maps/map-skins.css", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    colorType: buffer[25],
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function assetUrl(source) {
  return new URL(source.replace("/assets/maps/autumn-moon-temple-path/", ""), ASSET_ROOT);
}

test("Autumn Moon Temple Path is registered exactly once for mobile and desktop portrait", () => {
  assert.equal(MAP.id, "autumn_moon_temple_path");
  assert.equal(MAP.label, "월야 단풍 사찰길");
  assert.equal(MAP.nameKo, "월야 단풍 사찰길");
  assert.equal(MAP.mobileOnly, false);
  assert.equal(MAP.portraitOnly, true);
  assert.equal(MAP.background.fit, "cover");
  assert.equal(MAP.foregroundOccluder.fit, "cover");
  assert.equal(LAYERED_SHOOTER_MAP_SKINS.filter((map) => map.id === MAP.id).length, 1);
  assert.equal(getShooterMapsForLayout(true, { isPortraitLayout: true }).includes(MAP), true);
  assert.equal(getShooterMapsForLayout(false, { isPortraitLayout: true }).includes(MAP), true);
  assert.equal(getShooterMapsForLayout(true, { isPortraitLayout: false }).includes(MAP), false);

  const portraitMaps = getShooterMapsForLayout(true, { isPortraitLayout: true });
  assert.equal(getRandomShooterMapId("abyssalMoonCathedral", 0.999999, portraitMaps), MAP.id);
});

test("manifest retains all 240 authored frames and exact sheet geometry", () => {
  const sequences = [...RUNTIME.underlaySequences, ...RUNTIME.overlaySequences];
  const byId = new Map(sequences.map((sequence) => [sequence.id, sequence]));
  assert.equal(RUNTIME.totalFrameCount, 240);
  assert.equal(sequences.reduce((total, sequence) => total + sequence.frameCount, 0), 240);
  assert.equal(RUNTIME.frameOrder, "row-major");
  assert.equal(RUNTIME.playback, "forward");
  assert.equal(RUNTIME.columns, 4);
  assert.equal(RUNTIME.rows, 2);
  assert.equal(RUNTIME.framesPerSheet, 8);

  assert.deepEqual(
    sequences.map(({ id, frameCount, framesPerSecond, sheetSources }) => ({
      id,
      frameCount,
      framesPerSecond,
      sheetCount: sheetSources.length,
    })),
    [
      { id: "leaves-far", frameCount: 48, framesPerSecond: 12, sheetCount: 6 },
      { id: "tree-sway", frameCount: 48, framesPerSecond: 16, sheetCount: 6 },
      { id: "leaves-mid", frameCount: 64, framesPerSecond: 16, sheetCount: 8 },
      { id: "ground-gust", frameCount: 32, framesPerSecond: 16, sheetCount: 4 },
      { id: "leaves-near", frameCount: 48, framesPerSecond: 16, sheetCount: 6 },
    ],
  );
  assert.deepEqual(
    [byId.get("leaves-far").phaseOffsetFrames, byId.get("leaves-mid").phaseOffsetFrames, byId.get("leaves-near").phaseOffsetFrames],
    [0, 17, 31],
  );
  assert.deepEqual(byId.get("ground-gust").randomDelayMs, [7000, 12000]);
  assert.equal(byId.get("ground-gust").loop, false);
  assert.equal(byId.get("ground-gust").y, 1280);
});

test("all runtime files keep their authored dimensions and transparent PNG color type", async () => {
  const sequences = [...RUNTIME.underlaySequences, ...RUNTIME.overlaySequences];
  const expectedSheetSizes = new Map([
    ["leaves-far", { width: 1536, height: 1664 }],
    ["tree-sway", { width: 3072, height: 3328 }],
    ["leaves-mid", { width: 3072, height: 3328 }],
    ["ground-gust", { width: 3072, height: 768 }],
    ["leaves-near", { width: 3072, height: 3328 }],
  ]);

  for (const sequence of sequences) {
    for (const source of sequence.sheetSources) {
      const header = readPngHeader(await readFile(assetUrl(source)));
      assert.deepEqual(
        header,
        { colorType: 6, ...expectedSheetSizes.get(sequence.id) },
        source,
      );
    }
  }

  const foreground = readPngHeader(await readFile(assetUrl(MAP.foregroundOccluder.src)));
  assert.deepEqual(foreground, { colorType: 6, width: 768, height: 1664 });
  const backgroundPng = readPngHeader(await readFile(assetUrl(MAP.background.fallbackSrc)));
  assert.deepEqual(
    { width: backgroundPng.width, height: backgroundPng.height },
    { width: 768, height: 1664 },
  );
  const backgroundWebp = await readFile(assetUrl(MAP.background.src));
  assert.equal(backgroundWebp.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(backgroundWebp.subarray(8, 12).toString("ascii"), "WEBP");
});

test("compact runtime sheets retain every frame with one-quarter decoded pixel area", async () => {
  const sequences = [...RUNTIME.underlaySequences, ...RUNTIME.overlaySequences];
  const optimized = sequences.filter((sequence) => sequence.runtimeVariant);
  assert.deepEqual(optimized.map((sequence) => sequence.id), [
    "tree-sway",
    "leaves-mid",
    "ground-gust",
    "leaves-near",
  ]);

  for (const sequence of optimized) {
    const runtime = sequence.runtimeVariant;
    assert.equal(runtime.cellWidth, sequence.cellWidth / 2);
    assert.equal(runtime.cellHeight, sequence.cellHeight / 2);
    assert.equal(runtime.sheetSources.length, sequence.sheetSources.length);
    for (const source of runtime.sheetSources) {
      const header = readPngHeader(await readFile(assetUrl(source)));
      assert.deepEqual(header, {
        colorType: 6,
        width: runtime.cellWidth * sequence.columns,
        height: runtime.cellHeight * sequence.rows,
      });
    }
  }
});

test("runtime preloads only the current and next sheet for every layer", () => {
  const allSheets = [...RUNTIME.underlaySequences, ...RUNTIME.overlaySequences]
    .flatMap((sequence) => sequence.sheetSources);
  const allPlaybackSheets = [...RUNTIME.underlaySequences, ...RUNTIME.overlaySequences]
    .flatMap((sequence) => sequence.runtimeVariant?.sheetSources ?? sequence.sheetSources);
  assert.equal(allSheets.length, 30);
  assert.equal(RUNTIME.preloadSources.length, 10);
  assert.equal(new Set(RUNTIME.preloadSources).size, 10);
  assert.equal(RUNTIME.preloadSources.every((source) => allPlaybackSheets.includes(source)), true);

  const sources = getShooterMapAssetSources(MAP);
  assert.equal(sources.length, 13);
  assert.equal(sources.filter((source) => source.includes("/animation")).length, 10);
  assert.equal(sources.some((source) => /preview|sample|source|\.gif(?:$|\?)/i.test(source)), false);
});

test("frames advance row-major, loop forward, and gusts retrigger only after 7-12 seconds", () => {
  const tree = RUNTIME.underlaySequences.find((sequence) => sequence.id === "tree-sway");
  assert.deepEqual(getAutumnSpriteCell(0, tree), { frame: 0, sheetIndex: 0, column: 0, row: 0 });
  assert.deepEqual(getAutumnSpriteCell(7, tree), { frame: 7, sheetIndex: 0, column: 3, row: 1 });
  assert.deepEqual(getAutumnSpriteCell(8, tree), { frame: 8, sheetIndex: 1, column: 0, row: 0 });
  assert.deepEqual(getAutumnSpriteCell(47, tree), { frame: 47, sheetIndex: 5, column: 3, row: 1 });
  assert.equal(getAutumnLoopFrame(2999.99, tree), 47);
  assert.equal(getAutumnLoopFrame(3000, tree), 0);
  assert.equal(getAutumnGroundGustDelay([7000, 12000], 0), 7000);
  assert.ok(getAutumnGroundGustDelay([7000, 12000], 0.999999) < 12000);
  assert.ok(getAutumnGroundGustDelay([7000, 12000], 0.999999) > 11999);
});

test("renderer keeps authored environmental, combat, foreground, player, and HUD order", async () => {
  const [appSource, rendererSource, runtimeSource, styleSource] = await Promise.all([
    readFile(APP_SOURCE_URL, "utf8"),
    readFile(RENDERER_SOURCE_URL, "utf8"),
    readFile(RUNTIME_SOURCE_URL, "utf8"),
    readFile(STYLE_SOURCE_URL, "utf8"),
  ]);

  const backgroundIndex = rendererSource.indexOf('className="shooterMapSkinBackground"');
  const underlayIndex = rendererSource.indexOf('stage="underlay"', backgroundIndex);
  const overlayIndex = rendererSource.indexOf('stage="overlay"', underlayIndex);
  const foregroundIndex = rendererSource.indexOf('className="shooterMapForegroundOccluder"', overlayIndex);
  assert.ok(backgroundIndex >= 0 && underlayIndex > backgroundIndex);
  assert.ok(overlayIndex > underlayIndex && foregroundIndex > overlayIndex);

  const appUnderlayIndex = appSource.indexOf('stage="underlay"');
  const enemyIndex = appSource.indexOf("enemy shooterEnemy", appUnderlayIndex);
  const guitarIndex = appSource.indexOf("className={`guitarPlayer guitarPlayer--", enemyIndex);
  const appOverlayIndex = appSource.indexOf('stage="overlay"', guitarIndex);
  const hudIndex = appSource.indexOf("mobileShooterLives", appOverlayIndex);
  assert.ok(appUnderlayIndex >= 0 && enemyIndex > appUnderlayIndex);
  assert.ok(guitarIndex > enemyIndex && appOverlayIndex > guitarIndex && hudIndex > appOverlayIndex);

  assert.match(runtimeSource, /subscribeSharedMapAnimation\(root/);
  assert.match(runtimeSource, /context\.drawImage\(/);
  assert.match(runtimeSource, /MOBILE_DEVICE_PIXEL_RATIO = 1/);
  assert.match(runtimeSource, /runtime\.playbackSequence/);
  assert.match(runtimeSource, /runtime\.current/);
  assert.match(runtimeSource, /runtime\.next/);
  assert.match(runtimeSource, /image\.decode\(\)\.then\(markReady\)/);
  assert.match(runtimeSource, /releaseSheetRecord\(runtime\.current\)/);
  assert.doesNotMatch(runtimeSource, /setInterval|useState|ping-pong|pingpong|reverse/i);
  const autumnCanvasRule = styleSource.match(/\.shooterMapAutumnCanvas\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(autumnCanvasRule, /transform: translateZ\(0\)/);
  assert.match(styleSource, /shooterMapSkin--autumn_moon_temple_path[\s\S]*?enemy\.shooterEnemy[\s\S]*?z-index: 40 !important/);
  assert.match(styleSource, /shooterMapSkin--autumn_moon_temple_path[\s\S]*?guitarPlayer[\s\S]*?z-index: 70 !important/);
  assert.match(styleSource, /data-map-skin="autumn_moon_temple_path"[\s\S]*?shooterMapForegroundOccluder[\s\S]*?z-index: 3/);
});

test("mobile animation audit approves the two shared RAF subscriptions", () => {
  assert.equal(
    getShooterMapPerformanceFingerprint(MAP),
    MAP.performance.mobileGameplay.audit.contentFingerprint,
  );
  assert.equal(getShooterMapPerformancePolicy(MAP).mobileGameplayEffects, "full");
  assert.equal(MAP.performance.mobileGameplay.audit.sharedSpriteSubscribers, 2);
  assert.equal(MAP.performance.mobileGameplay.audit.activeCssAnimations, 0);
  assert.equal(MAP.performance.mobileGameplay.audit.particleElements, 0);
});
