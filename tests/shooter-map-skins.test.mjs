import assert from "node:assert/strict";
import test from "node:test";

import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapAssetSources,
  isLayeredShooterMap,
  resolveLayeredShooterMap,
} from "../src/shooter/maps/registry.js";
import { RIVER_MAP_SKIN } from "../src/shooter/maps/skins/river.js";

test("river skin keeps a static background and resolves normalized environment instances", () => {
  assert.equal(isLayeredShooterMap(RIVER_MAP_SKIN), true);
  assert.equal(RIVER_MAP_SKIN.background.fit, "cover");
  assert.equal(RIVER_MAP_SKIN.background.animation, undefined);
  assert.equal(RIVER_MAP_SKIN.background.src, "/assets/maps/river/river-background.png");
  assert.equal(RIVER_MAP_SKIN.previewImage, "/assets/maps/river/exports/river-garden-full-map.png");
  assert.deepEqual(RIVER_MAP_SKIN.layers, []);
  assert.equal(RIVER_MAP_SKIN.assetCatalog.length, 24);
  assert.equal(RIVER_MAP_SKIN.layout.length, 24);

  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  assert.equal(resolved.layers.length, 24);
  assert.equal(resolved.layers.every((layer) => layer.coordinateSpace === "normalized"), true);
  assert.equal(
    resolved.layers.filter((layer) => !layer.assetId.startsWith("lotus-flower-")).every((layer) => (
      layer.animation === undefined
    )),
    true,
  );
  assert.equal(getShooterMapAssetSources(resolved).length, 34);
  assert.equal(getShooterMapAssetSources(resolved)[0], "/assets/maps/river/river-background.png");
  assert.ok(LAYERED_SHOOTER_MAP_SKINS.includes(RIVER_MAP_SKIN));
});

test("lily pads resolve as independently editable midground objects", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const lilyPads = resolved.layers.filter((layer) => layer.assetId.startsWith("lily-pad-"));

  assert.equal(lilyPads.length, 6);
  assert.equal(lilyPads.every((layer) => layer.slot === "midground-environment"), true);
  assert.equal(lilyPads.every((layer) => layer.animation === undefined), true);
  assert.equal(new Set(lilyPads.map((layer) => layer.instanceId)).size, 6);
});

test("lotus flowers resolve as independent, subtly animated River Garden decorations", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const lotusFlowers = resolved.layers.filter((layer) => layer.assetId.startsWith("lotus-flower-"));

  assert.equal(lotusFlowers.length, 3);
  assert.equal(lotusFlowers.every((layer) => layer.slot === "animated-environment"), true);
  assert.equal(lotusFlowers.every((layer) => ["float", "pulse"].includes(layer.animation?.type)), true);
  assert.equal(lotusFlowers.every((layer) => layer.coordinateSpace === "normalized"), true);
  assert.equal(new Set(lotusFlowers.map((layer) => layer.instanceId)).size, 3);
});

test("stone bridge resolves as one centered editable crossing", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const bridge = resolved.layers.find((layer) => layer.assetId === "stone-bridge-crossing");

  assert.ok(bridge);
  assert.equal(bridge.slot, "midground-environment");
  assert.ok(Math.abs(bridge.placement.x - 0.5) <= 0.08);
  assert.ok(bridge.placement.y > 0.45 && bridge.placement.y < 0.55);
  assert.equal(bridge.placement.width, 1.12);
  assert.equal(bridge.placement.rotation, 0);
  assert.equal(bridge.animation, undefined);
});

test("guitar dock resolves as one fixed bottom environment object", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const dock = resolved.layers.find((layer) => layer.assetId === "guitar-dock-platform");

  assert.ok(dock);
  assert.equal(dock.slot, "midground-environment");
  assert.ok(Math.abs(dock.placement.x - 0.5) <= (8 / 390));
  assert.ok(dock.placement.y > 0.8 && dock.placement.y <= 1);
  assert.equal(dock.placement.width, 1.16);
  assert.equal(dock.placement.rotation, 0);
  assert.equal(dock.animation, undefined);
});

test("ambient frog resolves with six frames and normalized operator anchor points", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const frog = resolved.layers.find((layer) => layer.assetId === "ambient-frog");

  assert.ok(frog);
  assert.equal(frog.slot, "animated-environment");
  assert.deepEqual(Object.keys(frog.creature.frames), ["idle", "blink", "crouch", "takeoff", "air", "land"]);
  assert.equal(frog.creature.settings.enabled, true);
  assert.equal(frog.creature.settings.mode, "random");
  assert.equal(frog.creature.settings.anchors.length, 4);
  assert.equal(frog.creature.settings.anchors.every((anchor) => anchor.surfaceInstanceId), true);
  assert.equal(frog.creature.settings.anchors.every((anchor) => (
    anchor.surfaceInstanceId.includes("rock")
      || anchor.surfaceInstanceId.includes("lily-pad")
      || anchor.surfaceInstanceId.includes("stone-bridge")
  )), true);
  assert.equal(frog.placement.anchorY, 100);
  assert.equal(frog.animation, undefined);
});

test("diving frog keeps a surface start and an independently editable water entry point", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const frog = resolved.layers.find((layer) => layer.assetId === "ambient-diving-frog");

  assert.ok(frog);
  assert.equal(frog.creature.type, "diving-frog");
  assert.equal(frog.creature.settings.mode, "sequence");
  assert.equal(frog.creature.settings.anchors.length, 2);
  assert.equal(frog.creature.settings.anchors[0].kind, "surface");
  assert.equal(frog.creature.settings.anchors[0].surfaceInstanceId, "river-stone-bridge-01");
  assert.equal(frog.creature.settings.anchors[1].kind, "water");
  assert.equal(frog.creature.settings.anchors[1].surfaceInstanceId, "");
  assert.notEqual(frog.creature.settings.anchors[1].x, frog.creature.settings.anchors[0].x);
  assert.notEqual(frog.creature.settings.anchors[1].y, frog.creature.settings.anchors[0].y);
  assert.ok(frog.creature.settings.anchors[1].x >= 0 && frog.creature.settings.anchors[1].x <= 1);
  assert.ok(frog.creature.settings.anchors[1].y >= 0 && frog.creature.settings.anchors[1].y <= 1);
});

test("sleeping frog stays on one surface and exposes an independent nose bubble", () => {
  const resolved = resolveLayeredShooterMap(RIVER_MAP_SKIN);
  const frog = resolved.layers.find((layer) => layer.assetId === "ambient-sleeping-frog");

  assert.ok(frog);
  assert.equal(frog.creature.type, "sleeping-frog");
  assert.deepEqual(
    Object.keys(frog.creature.frames),
    ["idle", "nod", "fall", "flat", "flatBreathe", "wakeup"],
  );
  assert.equal(frog.creature.settings.anchors.length, 1);
  assert.equal(frog.creature.settings.anchors[0].kind, "surface");
  const sleepingSurface = RIVER_MAP_SKIN.layout.find((placement) => (
    placement.instanceId === frog.creature.settings.anchors[0].surfaceInstanceId
  ));
  assert.ok(sleepingSurface);
  assert.ok(
    sleepingSurface.assetId.startsWith("rock-")
      || sleepingSurface.assetId.startsWith("lily-pad-")
      || sleepingSurface.assetId === "stone-bridge-crossing"
      || sleepingSurface.assetId === "guitar-dock-platform",
  );
  assert.equal(frog.creature.settings.bubbleEnabled, true);
  assert.ok(frog.creature.settings.bubbleMaxScale >= 1.2 && frog.creature.settings.bubbleMaxScale <= 3);
  assert.equal(frog.creature.settings.openMouthDuration, 3.2);
  assert.match(frog.creature.settings.bodyColor, /^#[0-9a-f]{6}$/i);
  assert.match(frog.creature.settings.bubbleColor, /^#[0-9a-f]{6}$/i);
  assert.deepEqual(frog.creature.bubbleAnchors.flat, { x: 50, y: 76 });
  assert.equal(frog.placement.anchorY, 94.12);
});
