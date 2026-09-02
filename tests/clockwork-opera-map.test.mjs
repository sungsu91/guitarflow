import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getShooterMapPerformanceFingerprint, getShooterMapPerformancePolicy } from "../src/shooter/maps/performancePolicy.js";
import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapAssetSources,
  getShooterMapsForLayout,
  resolveLayeredShooterMap,
} from "../src/shooter/maps/registry.js";
import { CLOCKWORK_OPERA_CITADEL_MAP_SKIN } from "../src/shooter/maps/skins/clockworkOperaCitadel.js";
import { MAP_EDIT_SKINS, validateMapPlacements } from "../vite.config.js";

const MAP = CLOCKWORK_OPERA_CITADEL_MAP_SKIN;
const ASSET_ROOT = new URL("../public/assets/maps/clockwork-opera-citadel/", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    colorType: buffer[25],
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

test("Clockwork Opera Citadel is available on desktop and mobile with the clean RGB background", async () => {
  assert.equal(MAP.id, "clockwork-opera-citadel");
  assert.equal(MAP.nameKo, "태엽 오페라 성채");
  assert.equal(MAP.nameEn, "Clockwork Opera Citadel");
  assert.equal(MAP.mobileOnly, false);
  assert.equal(MAP.background.src.endsWith("clockwork_opera_clean_background.png"), true);
  assert.equal(MAP.previewImage.endsWith("clockwork_opera_master.png"), true);
  assert.equal(MAP.background.fit, "cover");
  assert.deepEqual(
    { width: MAP.referenceViewport.width, height: MAP.referenceViewport.height },
    { width: 841, height: 1870 },
  );
  assert.equal(MAP.background.locked, true);
  assert.ok(LAYERED_SHOOTER_MAP_SKINS.includes(MAP));
  assert.ok(getShooterMapsForLayout(true).includes(MAP));
  assert.ok(getShooterMapsForLayout(false).includes(MAP));
  assert.ok(getShooterMapsForLayout(false, { includeMobileOnly: true }).includes(MAP));

  const [master, clean] = await Promise.all([
    readFile(new URL("clockwork_opera_master.png", ASSET_ROOT)),
    readFile(new URL("clockwork_opera_clean_background.png", ASSET_ROOT)),
  ]);
  assert.deepEqual(readPngHeader(master), { colorType: 2, height: 1870, width: 841 });
  assert.deepEqual(readPngHeader(clean), { colorType: 2, height: 1870, width: 841 });

  const sources = getShooterMapAssetSources(MAP);
  assert.equal(sources.length, 6);
  assert.equal(sources.some((src) => src.includes("clockwork_opera_master")), false);
  assert.equal(sources.some((src) => src.includes("gears_pendulum_rgba_atlas")), false);
  assert.equal(sources[0], MAP.background.src);
});

test("atlas derivatives preserve transparent RGBA crops for three gears and the pendulum", async () => {
  const expected = new Map([
    ["gear_large_rgba.png", { colorType: 6, height: 738, width: 727 }],
    ["gear_small_rgba.png", { colorType: 6, height: 401, width: 401 }],
    ["gear_medium_rgba.png", { colorType: 6, height: 512, width: 502 }],
    ["pendulum_rgba.png", { colorType: 6, height: 987, width: 272 }],
    ["gatekeeper_rgba.png", { colorType: 6, height: 1536, width: 1024 }],
    ["gears_pendulum_rgba_atlas.png", { colorType: 6, height: 1024, width: 1536 }],
  ]);

  for (const [fileName, expectedHeader] of expected) {
    const png = await readFile(new URL(fileName, ASSET_ROOT));
    assert.deepEqual(readPngHeader(png), expectedHeader, fileName);
  }
});

test("master-aligned placements keep the combat corridor and guitar stage clear", () => {
  const assets = new Map(MAP.assetCatalog.map((asset) => [asset.id, asset]));
  const counts = new Map();

  MAP.layout.forEach((placement) => {
    const asset = assets.get(placement.assetId);
    assert.ok(asset, placement.assetId);
    counts.set(placement.assetId, (counts.get(placement.assetId) ?? 0) + 1);
    const width = asset.baseWidth * (placement.scale ?? 1);
    const left = placement.x - width * ((asset.anchorX ?? 50) / 100);
    const right = left + width;
    assert.ok(right <= 0.36 || left >= 0.63, `${placement.instanceId} must stay outside the combat corridor`);
    assert.ok(placement.y < 0.55, `${placement.instanceId} must stay above the guitar stage`);
  });

  assert.deepEqual(Object.fromEntries(counts), {
    "clockwork-gear-large": 1,
    "clockwork-gear-small": 2,
    "clockwork-gear-medium": 1,
    "clockwork-pendulum": 1,
    "clockwork-gatekeeper": 1,
  });
  const gatekeeper = MAP.layout.find((placement) => placement.assetId === "clockwork-gatekeeper");
  assert.ok(gatekeeper?.x > 0.1 && gatekeeper.x < 0.3);
  assert.ok(gatekeeper?.y > 0.35 && gatekeeper.y < 0.55);
  assert.equal(gatekeeper?.animation, "clockwork-gatekeeper-idle");
});

test("clockwork rotations, pendulum pivot, gatekeeper idle, and editor save path remain independent", () => {
  const resolved = resolveLayeredShooterMap(MAP);
  assert.equal(resolved.layers.length, 6);
  const animationTypes = resolved.layers.map((layer) => layer.animation?.type).sort();
  assert.deepEqual(animationTypes, [
    "clockwork-gatekeeper-idle",
    "clockwork-pendulum",
    "rotate",
    "rotate",
    "rotate-reverse",
    "rotate-reverse",
  ]);
  const pendulumAsset = MAP.assetCatalog.find((asset) => asset.id === "clockwork-pendulum");
  assert.equal(pendulumAsset.anchorX, 48);
  assert.equal(pendulumAsset.anchorY, 7.7);

  const editorSkin = MAP_EDIT_SKINS.get(MAP.id);
  assert.ok(editorSkin);
  assert.equal(editorSkin.layoutPath.endsWith("clockwork-opera-citadel-layout.json"), true);
  const validated = validateMapPlacements(MAP.layout, editorSkin.assetCatalog);
  assert.equal(validated.length, 6);
  assert.equal(validated.find((placement) => placement.assetId === "clockwork-pendulum")?.animation, "clockwork-pendulum");
  assert.equal(validated.find((placement) => placement.assetId === "clockwork-gatekeeper")?.animation, "clockwork-gatekeeper-idle");
});

test("clockwork editor can place an already-used decoration again", () => {
  const editorSkin = MAP_EDIT_SKINS.get(MAP.id);
  const source = MAP.layout.find((placement) => placement.assetId === "clockwork-gear-large");
  const repeated = {
    ...source,
    instanceId: "clockwork-gear-large-extra",
    x: 0.82,
    y: 0.24,
  };
  const validated = validateMapPlacements([...MAP.layout, repeated], editorSkin.assetCatalog);

  assert.equal(
    validated.filter((placement) => placement.assetId === "clockwork-gear-large").length,
    2,
  );
  assert.ok(MAP.assetCatalog.every((asset) => !Number.isFinite(asset.maxInstances)));
});

test("clockwork ambience uses one shared clock without per-frame React state", async () => {
  const [ambientSource, rendererSource, cssSource] = await Promise.all([
    readFile(new URL("../src/shooter/maps/ClockworkAmbientField.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
  ]);

  assert.match(ambientSource, /subscribeSharedMapAnimation/);
  assert.match(ambientSource, /framesPerSecond: 20/);
  assert.match(ambientSource, /Array\.from\(\{ length: 6 \}/);
  assert.match(ambientSource, /prefers-reduced-motion/);
  assert.doesNotMatch(ambientSource, /useState|setInterval|setTimeout/);
  assert.match(rendererSource, /ClockworkAmbientField active=\{animationsActive && !editMode\}/);
  assert.match(cssSource, /transform-origin: 48% 7\.7%/);
  assert.match(cssSource, /\.shooterMapSkinAsset\[data-animation="rotate-reverse"\] img/);
  assert.match(cssSource, /rotate\(-7deg\)/);
  assert.match(cssSource, /rotate\(7deg\)/);

  assert.equal(getShooterMapPerformanceFingerprint(MAP).length, 8);
  assert.deepEqual(getShooterMapPerformancePolicy(MAP), {
    mobileGameplayAuditPassed: true,
    mobileGameplayEffects: "full",
  });
});
