import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getLoopFrameIndex } from "../src/shooter/maps/sharedSpriteClock.js";
import {
  LAYERED_SHOOTER_MAP_SKINS,
  getRandomShooterMapId,
  getShooterMapAssetSources,
  getShooterMapsForLayout,
} from "../src/shooter/maps/registry.js";
import {
  getShooterMapPerformanceFingerprint,
  getShooterMapPerformancePolicy,
} from "../src/shooter/maps/performancePolicy.js";
import {
  applyMapImageFallback,
  getMapImageFormat,
  markMapImageLoaded,
} from "../src/shooter/maps/mapImageFallback.js";
import { CELESTIAL_ECLIPSE_CLOCKTOWER_MAP_SKIN as MAP } from "../src/shooter/maps/skins/celestialEclipseClocktower.js";

const assetRoot = new URL("../public/assets/maps/celestial-eclipse-clocktower/", import.meta.url);
const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const rendererSourceUrl = new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url);
const runtimeSourceUrl = new URL("../src/shooter/maps/CelestialEclipseClocktowerField.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/shooter/maps/map-skins.css", import.meta.url);

function readPngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("Celestial Eclipse Clocktower is registered once for mobile and desktop portrait", () => {
  assert.equal(MAP.id, "celestial-eclipse-clocktower");
  assert.equal(MAP.mobileOnly, false);
  assert.equal(MAP.portraitOnly, true);
  assert.equal(LAYERED_SHOOTER_MAP_SKINS.filter((map) => map.id === MAP.id).length, 1);
  assert.equal(getShooterMapsForLayout(true, { isPortraitLayout: true }).includes(MAP), true);
  assert.equal(getShooterMapsForLayout(true, { isPortraitLayout: false }).includes(MAP), false);
  assert.equal(getShooterMapsForLayout(false, { isPortraitLayout: true }).includes(MAP), true);
  assert.equal(getShooterMapsForLayout(false, {
    includeMobileOnly: true,
    isPortraitLayout: true,
  }).includes(MAP), true);

  const randomResult = getRandomShooterMapId(
    "abyssalMoonCathedral",
    0.999999,
    getShooterMapsForLayout(true, { isPortraitLayout: true }),
  );
  assert.notEqual(randomResult, "abyssalMoonCathedral");
  assert.equal(
    getShooterMapsForLayout(true, { isPortraitLayout: true })
      .some((map) => map.id === randomResult),
    true,
  );
});

test("runtime uses only the WebP/PNG background, foreground, and one 8x6 atlas", async () => {
  const files = {
    backgroundPng: new URL("background/celestial_eclipse_clocktower_bg_768x1664.png", assetRoot),
    backgroundWebp: new URL("background/celestial_eclipse_clocktower_bg_768x1664.webp", assetRoot),
    foregroundPng: new URL("foreground/clocktower_foreground_occluder_768x1664.png", assetRoot),
    foregroundWebp: new URL("foreground/clocktower_foreground_occluder_768x1664.webp", assetRoot),
    atlasPng: new URL("astrolabe/eclipse_astrolabe_48f_8x6.png", assetRoot),
    atlasWebp: new URL("astrolabe/eclipse_astrolabe_48f_8x6.webp", assetRoot),
  };
  const buffers = Object.fromEntries(await Promise.all(
    Object.entries(files).map(async ([key, url]) => [key, await readFile(url)]),
  ));

  assert.deepEqual(readPngSize(buffers.backgroundPng), { width: 768, height: 1664 });
  assert.deepEqual(readPngSize(buffers.foregroundPng), { width: 768, height: 1664 });
  assert.deepEqual(readPngSize(buffers.atlasPng), { width: 2560, height: 1920 });
  assert.equal(buffers.foregroundPng[25], 6, "foreground PNG must remain RGBA");
  for (const key of ["backgroundWebp", "foregroundWebp", "atlasWebp"]) {
    assert.equal(buffers[key].subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(buffers[key].subarray(8, 12).toString("ascii"), "WEBP");
  }

  const sources = getShooterMapAssetSources(MAP);
  assert.equal(sources.length, 6);
  assert.equal(sources.filter((src) => src.includes("48f_8x6")).length, 2);
  assert.equal(sources.some((src) => /\/frames\/|\.gif(?:$|\?)/i.test(src)), false);
});

test("astrolabe advances 0 through 47 at 12fps and wraps forward to zero", async () => {
  const frames = Array.from({ length: 48 }, (_, index) => (
    getLoopFrameIndex(index * (1000 / 12) + 0.01, 48, 12)
  ));
  assert.deepEqual(frames, Array.from({ length: 48 }, (_, index) => index));
  assert.equal(getLoopFrameIndex(4000, 48, 12), 0);
  assert.equal(MAP.animatedBackdrop.columns, 8);
  assert.equal(MAP.animatedBackdrop.rows, 6);
  assert.equal(MAP.animatedBackdrop.cellWidth, 320);
  assert.equal(MAP.animatedBackdrop.cellHeight, 320);

  const source = await readFile(runtimeSourceUrl, "utf8");
  assert.match(source, /dataset\.astrolabeCenterOffset = "0,0"/);
  assert.doesNotMatch(source, /destinationOffsetX|destinationOffsetY/);
  assert.match(source, /subscribeSharedMapAnimation\(root, render/);
  assert.match(source, /framesPerSecond: CELESTIAL_ECLIPSE_ASTROLABE_FPS/);
  assert.doesNotMatch(source, /setInterval|ping-pong|pingpong|reverse/i);
  assert.doesNotMatch(source, /useState/);
});

test("WebP image failure switches once to the PNG fallback", () => {
  const image = {
    currentSrc: "/map/atlas.webp",
    dataset: {},
    src: "/map/atlas.webp",
  };
  assert.equal(getMapImageFormat(image.currentSrc), "webp");
  assert.equal(markMapImageLoaded(image), "webp");
  assert.equal(image.dataset.mapAssetFormat, "webp");
  assert.equal(applyMapImageFallback(image, "/map/atlas.png"), true);
  assert.equal(image.src, "/map/atlas.png");
  assert.equal(image.dataset.mapAssetFormat, "png");
  assert.equal(applyMapImageFallback(image, "/map/atlas.png"), false);
});

test("renderer keeps background, astrolabe, combat, foreground, and HUD order", async () => {
  const [appSource, rendererSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(rendererSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);
  const backgroundIndex = rendererSource.indexOf('className="shooterMapSkinBackground"');
  const astrolabeIndex = rendererSource.indexOf("<CelestialEclipseClocktowerField");
  const foregroundIndex = rendererSource.indexOf('className="shooterMapForegroundOccluder"');
  assert.ok(backgroundIndex > 0 && astrolabeIndex > backgroundIndex);
  assert.ok(foregroundIndex > astrolabeIndex);

  const underlayIndex = appSource.indexOf('stage="underlay"');
  const guitarIndex = appSource.indexOf("className={`guitarPlayer guitarPlayer--", underlayIndex);
  const overlayIndex = appSource.indexOf('stage="overlay"', guitarIndex);
  const hudIndex = appSource.indexOf("mobileShooterLives", overlayIndex);
  assert.ok(underlayIndex > 0 && guitarIndex > underlayIndex);
  assert.ok(overlayIndex > guitarIndex && hudIndex > overlayIndex);
  assert.match(
    appSource,
    /const shooterPortraitLayout = !isMobileLayout \|\| !viewportProfile\.isLandscape/,
  );
  assert.match(styleSource, /\.shooterMapSkinStage--overlay\s*\{[\s\S]*?z-index: 35/);
  assert.match(styleSource, /\.shooterMapCelestialAstrolabe\s*\{[\s\S]*?width: 65%/);
  assert.doesNotMatch(
    styleSource,
    /data-map-skin="celestial-eclipse-clocktower"\][\s\S]*?\.shooterMapCoordinatePlane\s*\{[\s\S]*?width: auto/,
  );
  assert.equal(MAP.background.fit, "cover");
  assert.equal(MAP.foregroundOccluder.fit, "cover");
  assert.match(
    styleSource,
    /shooterMapSkin--celestial-eclipse-clocktower[\s\S]*?\.enemy\.shooterEnemy\s*\{[\s\S]*?z-index: 40 !important/,
  );
});

test("map assets preload before selection and the mobile audit stays within budget", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  assert.match(appSource, /function preloadShooterMapImages\(map\)/);
  assert.match(appSource, /void preloadShooterMapImages\(nextMap\)\.then/);
  assert.match(appSource, /isShooterMapAvailableForLayout/);
  assert.equal(getShooterMapPerformanceFingerprint(MAP), MAP.performance.mobileGameplay.audit.contentFingerprint);
  assert.equal(getShooterMapPerformancePolicy(MAP).mobileGameplayEffects, "full");
});
