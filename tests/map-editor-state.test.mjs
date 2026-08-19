import assert from "node:assert/strict";
import test from "node:test";

import {
  createMapPlacement,
  deleteMapPlacement,
  duplicateMapPlacement,
  moveMapPlacementLayer,
  nudgeMapPlacement,
  normalizeMapPlacements,
  resizeMapPlacement,
  updateMapPlacement,
} from "../src/shooter/maps/editor/editorState.js";
import {
  DEFAULT_PERSPECTIVE_CORNERS,
  getPerspectiveMatrix3d,
  projectUnitPoint,
  solveUnitSquareHomography,
} from "../src/shooter/maps/freeTransform.js";
import { validateMapPlacements, validateRiverPlacements } from "../vite.config.js";

const assets = [
  { id: "rock-a" },
  { id: "rock-b" },
];

test("map editor stores viewport-independent normalized placement data", () => {
  const placements = normalizeMapPlacements([
    {
      instanceId: "rock-a-1",
      assetId: "rock-a",
      x: 0.25,
      y: 0.75,
      scale: 1.2,
      rotation: 15,
      layer: 4,
      animation: "none",
      animationSpeed: 1,
    },
  ], assets);

  assert.deepEqual(placements[0], {
    instanceId: "rock-a-1",
    assetId: "rock-a",
    x: 0.25,
    y: 0.75,
    scale: 1.2,
    rotation: 15,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    perspective: 900,
    tiltX: 0,
    tiltY: 0,
    perspectiveCorners: DEFAULT_PERSPECTIVE_CORNERS.map((corner) => ({ ...corner })),
    layer: 4,
    animation: "none",
    animationSpeed: 1,
  });
});

test("map editor can add, update, duplicate, and reorder instances without changing the asset", () => {
  const first = createMapPlacement("rock-a", [], () => "rock-a-1");
  const updated = updateMapPlacement([first], first.instanceId, { rotation: 45 });
  const duplicated = duplicateMapPlacement(updated, first.instanceId, () => "rock-a-2");
  const reordered = moveMapPlacementLayer(duplicated.placements, first.instanceId, "front");

  assert.equal(updated[0].assetId, "rock-a");
  assert.equal(updated[0].rotation, 45);
  assert.equal(duplicated.duplicate.assetId, "rock-a");
  assert.equal(duplicated.duplicate.instanceId, "rock-a-2");
  assert.ok(reordered[0].layer > reordered[1].layer);
  assert.deepEqual(deleteMapPlacement(reordered, "rock-a-2").map((placement) => placement.instanceId), ["rock-a-1"]);
});

test("map editor keeps single-instance event actors unique", () => {
  const eventAssets = [{ id: "flying-dragon", maxInstances: 1 }];
  const placements = normalizeMapPlacements([
    { instanceId: "flying-dragon-home", assetId: "flying-dragon", x: 0.18, y: 0.96 },
    { instanceId: "flying-dragon-duplicate", assetId: "flying-dragon", x: 0.5, y: 0.5 },
  ], eventAssets);

  assert.equal(placements.length, 1);
  assert.equal(placements[0].instanceId, "flying-dragon-home");
  assert.throws(
    () => validateMapPlacements([
      { ...placements[0] },
      { ...placements[0], instanceId: "flying-dragon-duplicate" },
    ], eventAssets),
    /Map asset instance limit exceeded/,
  );
});

test("free transform maps every unit-square corner to the saved four-corner perspective", () => {
  const corners = [
    { x: 0.08, y: 0.14 },
    { x: 0.92, y: -0.04 },
    { x: 1.08, y: 0.92 },
    { x: -0.06, y: 1.08 },
  ];
  const homography = solveUnitSquareHomography(corners);
  const sourceCorners = DEFAULT_PERSPECTIVE_CORNERS;

  sourceCorners.forEach((source, index) => {
    const projected = projectUnitPoint(homography, source);
    assert.ok(Math.abs(projected.x - corners[index].x) < 1e-9);
    assert.ok(Math.abs(projected.y - corners[index].y) < 1e-9);
  });
  assert.match(getPerspectiveMatrix3d(corners, 240, 120), /^matrix3d\(/);
});

test("map editor and save validation preserve plane and perspective transform data", () => {
  const corners = [
    { x: 0.1, y: 0.2 },
    { x: 0.9, y: 0.05 },
    { x: 1.1, y: 0.85 },
    { x: -0.1, y: 1.05 },
  ];
  const [normalized] = normalizeMapPlacements([{
    instanceId: "lily-pad-transform",
    assetId: "lily-pad-large-round",
    x: 0.5,
    y: 0.5,
    scale: 0.7,
    rotation: 24,
    scaleX: -1.15,
    scaleY: 0.68,
    skewX: 12,
    skewY: -7,
    perspective: 640,
    tiltX: 52,
    tiltY: -18,
    perspectiveCorners: corners,
    layer: 20,
    animation: "none",
    animationSpeed: 1,
  }], [{ id: "lily-pad-large-round" }]);
  const [saved] = validateRiverPlacements([normalized]);

  assert.equal(saved.scaleX, -1.15);
  assert.equal(saved.scaleY, 0.68);
  assert.equal(saved.skewX, 12);
  assert.equal(saved.skewY, -7);
  assert.equal(saved.perspective, 640);
  assert.equal(saved.tiltX, 52);
  assert.equal(saved.tiltY, -18);
  assert.deepEqual(saved.perspectiveCorners, corners);
});

test("map editor allows near-flat tilts while keeping perspective transforms numerically safe", () => {
  const [placement] = normalizeMapPlacements([{
    instanceId: "rock-a-flat",
    assetId: "rock-a",
    perspective: 40,
    tiltX: 95,
    tiltY: -96,
  }], assets);

  assert.equal(placement.perspective, 80);
  assert.equal(placement.tiltX, 88);
  assert.equal(placement.tiltY, -88);
});

test("map editor nudges by actual preview pixels and resizes in predictable increments", () => {
  const placement = normalizeMapPlacements([{
    instanceId: "rock-a-1",
    assetId: "rock-a",
    x: 0.5,
    y: 0.5,
    scale: 1,
  }], assets);
  const nudged = nudgeMapPlacement(placement, "rock-a-1", { x: 1, y: -5 }, {
    width: 390,
    height: 756,
  });
  const resized = resizeMapPlacement(nudged, "rock-a-1", 0.05);

  assert.equal(nudged[0].x, 0.5 + (1 / 390));
  assert.equal(nudged[0].y, 0.5 - (5 / 756));
  assert.equal(resized[0].scale, 1.05);
  assert.equal(resized[0].assetId, "rock-a");
});

test("map editor save validation accepts newly registered lily-pad assets", () => {
  const placements = validateRiverPlacements([
    {
      instanceId: "lily-pad-1",
      assetId: "lily-pad-large-round",
      x: 0.5,
      y: 0.5,
      scale: 0.7,
      rotation: 0,
      layer: 20,
      animation: "none",
      animationSpeed: 1,
    },
  ]);

  assert.equal(placements[0].assetId, "lily-pad-large-round");
});

test("frog editor preserves anchor points and validates ambient movement settings", () => {
  const frogAsset = {
    id: "ambient-frog",
    creature: {
      defaults: {
        enabled: true,
        mode: "random",
        jumpInterval: 4.8,
        jumpDistance: 0.42,
        jumpHeight: 0.11,
        animationSpeed: 1,
      },
    },
  };
  const lily = {
    instanceId: "lily-1",
    assetId: "lily-pad-large-round",
    x: 0.3,
    y: 0.4,
    scale: 0.7,
    rotation: 0,
    layer: 20,
    animation: "none",
    animationSpeed: 1,
  };
  const normalized = normalizeMapPlacements([lily, {
    instanceId: "frog-1",
    assetId: "ambient-frog",
    x: 0.3,
    y: 0.4,
    scale: 0.7,
    creature: {
      enabled: true,
      mode: "sequence",
      jumpInterval: 5,
      jumpDistance: 0.4,
      jumpHeight: 0.12,
      animationSpeed: 1.2,
      anchors: [
        { id: "a", surfaceInstanceId: "lily-1", offsetX: 0, offsetY: -0.01, x: 0.3, y: 0.39 },
        { id: "b", surfaceInstanceId: "lily-1", offsetX: 0.04, offsetY: -0.01, x: 0.34, y: 0.39 },
      ],
    },
  }], [{ id: "lily-pad-large-round" }, frogAsset]);
  const frog = normalized.find((placement) => placement.assetId === "ambient-frog");
  assert.equal(frog.creature.mode, "sequence");
  assert.equal(frog.creature.anchors.length, 2);

  const saved = validateRiverPlacements(normalized).find((placement) => placement.assetId === "ambient-frog");
  assert.deepEqual(
    saved.creature.anchors.map(({ id, surfaceInstanceId, offsetX, offsetY }) => ({ id, surfaceInstanceId, offsetX, offsetY })),
    frog.creature.anchors.map(({ id, surfaceInstanceId, offsetX, offsetY }) => ({ id, surfaceInstanceId, offsetX, offsetY })),
  );
  assert.ok(Math.abs(saved.creature.anchors[1].x - 0.34) < 1e-9);
  assert.equal(saved.creature.animationSpeed, 1.2);
});

test("deleting a frog landing object repairs its anchor before saving", () => {
  const frogAsset = {
    id: "ambient-frog",
    creature: { defaults: { enabled: true, mode: "random" } },
  };
  const catalog = [
    { id: "lily-pad-large-round" },
    { id: "rock-bank-large-left" },
    frogAsset,
  ];
  const placements = normalizeMapPlacements([
    { instanceId: "lily-1", assetId: "lily-pad-large-round", x: 0.3, y: 0.4 },
    { instanceId: "rock-1", assetId: "rock-bank-large-left", x: 0.72, y: 0.5 },
    {
      instanceId: "frog-1",
      assetId: "ambient-frog",
      x: 0.3,
      y: 0.4,
      creature: {
        enabled: true,
        mode: "random",
        jumpInterval: 4.8,
        jumpDistance: 0.42,
        jumpHeight: 0.11,
        animationSpeed: 1,
        anchors: [{
          id: "frog-point-a",
          kind: "surface",
          surfaceInstanceId: "lily-1",
          offsetX: 0,
          offsetY: -0.01,
          x: 0.3,
          y: 0.39,
        }],
      },
    },
  ], catalog);

  const repaired = normalizeMapPlacements(deleteMapPlacement(placements, "lily-1"), catalog);
  const frog = repaired.find((placement) => placement.instanceId === "frog-1");
  assert.equal(frog.creature.anchors[0].surfaceInstanceId, "rock-1");
  assert.doesNotThrow(() => validateRiverPlacements(repaired));
});

test("diving frog save validation preserves a free water entry point", () => {
  const saved = validateRiverPlacements([
    {
      instanceId: "rock-start",
      assetId: "rock-bank-large-left",
      x: 0.1,
      y: 0.16,
      scale: 0.48,
      rotation: 0,
      layer: 10,
      animation: "none",
      animationSpeed: 1,
    },
    {
      instanceId: "dive-frog",
      assetId: "ambient-diving-frog",
      x: 0.19,
      y: 0.16,
      scale: 0.6,
      rotation: 0,
      layer: 29,
      animation: "none",
      animationSpeed: 1,
      creature: {
        enabled: true,
        mode: "sequence",
        jumpInterval: 7.2,
        jumpDistance: 0.32,
        jumpHeight: 0.075,
        animationSpeed: 1.1,
        anchors: [
          { id: "start", kind: "surface", surfaceInstanceId: "rock-start", offsetX: 0.09, offsetY: 0, x: 0.19, y: 0.16 },
          { id: "water", kind: "water", surfaceInstanceId: "", offsetX: 0, offsetY: 0, x: 0.3, y: 0.23 },
        ],
      },
    },
  ]).find((placement) => placement.instanceId === "dive-frog");

  assert.equal(saved.creature.anchors[1].kind, "water");
  assert.equal(saved.creature.anchors[1].surfaceInstanceId, "");
  assert.equal(saved.creature.anchors[1].x, 0.3);
  assert.equal(saved.creature.anchors[1].y, 0.23);
});

test("sleeping frog editor supports the bottom dock and clamps color tuning with one sleeping spot", () => {
  const catalog = [
    { id: "lily-pad-large-round" },
    { id: "guitar-dock-platform" },
    {
      id: "ambient-sleeping-frog",
      creature: {
        type: "sleeping-frog",
        defaults: {
          enabled: true,
          sleepInterval: 7.8,
          fallChance: 0.22,
          flatDuration: 8.5,
          openMouthDuration: 1.8,
          animationSpeed: 1,
          bubbleEnabled: true,
          bubbleBaseScale: 0.82,
          bubbleMaxScale: 2.45,
          bubbleSpeed: 1,
          bubbleOpacity: 0.78,
          bodyColor: "#86c92a",
          bodySaturation: 1,
          bodyBrightness: 1,
          bubbleColor: "#8fe7ee",
        },
      },
    },
  ];
  const normalized = normalizeMapPlacements([
    { instanceId: "lily-1", assetId: "lily-pad-large-round", x: 0.4, y: 0.5 },
    { instanceId: "dock-1", assetId: "guitar-dock-platform", x: 0.5, y: 0.91 },
    {
      instanceId: "sleeping-frog-1",
      assetId: "ambient-sleeping-frog",
      x: 0.4,
      y: 0.49,
      creature: {
        enabled: true,
        sleepInterval: 60,
        fallChance: 1,
        flatDuration: 0.2,
        openMouthDuration: 20,
        animationSpeed: 8,
        bubbleEnabled: false,
        bubbleBaseScale: 9,
        bubbleMaxScale: 9,
        bubbleSpeed: 9,
        bubbleOpacity: 0.02,
        bodyColor: "#7f50ff",
        bodySaturation: 9,
        bodyBrightness: 0.1,
        bubbleColor: "#ff88cc",
        anchors: [
          { id: "sleep-a", kind: "surface", surfaceInstanceId: "dock-1", offsetX: 0.2, offsetY: 0.025, x: 0.7, y: 0.935 },
          { id: "sleep-b", kind: "surface", surfaceInstanceId: "lily-1", offsetX: 0.03, offsetY: 0, x: 0.43, y: 0.5 },
        ],
      },
    },
  ], catalog);
  const frog = normalized.find((placement) => placement.assetId === "ambient-sleeping-frog");

  assert.equal(frog.creature.anchors.length, 1);
  assert.equal(frog.creature.sleepInterval, 30);
  assert.equal(frog.creature.fallChance, 0.75);
  assert.equal(frog.creature.flatDuration, 2);
  assert.equal(frog.creature.openMouthDuration, 8);
  assert.equal(frog.creature.animationSpeed, 2.5);
  assert.equal(frog.creature.bubbleEnabled, false);
  assert.equal(frog.creature.bubbleBaseScale, 1.5);
  assert.equal(frog.creature.bubbleMaxScale, 3);
  assert.equal(frog.creature.bubbleSpeed, 2);
  assert.equal(frog.creature.bubbleOpacity, 0.2);
  assert.equal(frog.creature.bodyColor, "#7f50ff");
  assert.equal(frog.creature.bodySaturation, 1.8);
  assert.equal(frog.creature.bodyBrightness, 0.55);
  assert.equal(frog.creature.bubbleColor, "#ff88cc");
  assert.equal(frog.creature.anchors[0].surfaceInstanceId, "dock-1");
  const saved = validateRiverPlacements(normalized).find((placement) => (
    placement.instanceId === "sleeping-frog-1"
  ));
  assert.equal(saved.creature.sleepInterval, 30);
  assert.equal(saved.creature.fallChance, 0.75);
  assert.equal(saved.creature.openMouthDuration, 8);
  assert.equal(saved.creature.bubbleEnabled, false);
  assert.equal(saved.creature.anchors.length, 1);
  assert.equal(saved.creature.anchors[0].surfaceInstanceId, "dock-1");
  assert.equal(saved.creature.bodyColor, "#7f50ff");
  assert.equal(saved.creature.bubbleColor, "#ff88cc");
});

test("baby dragon stays freely placeable while preserving ambient action tuning", () => {
  const dragonAsset = {
    id: "ambient-baby-dragon",
    creature: {
      type: "baby-dragon",
      defaults: {
        enabled: true,
        idleInterval: 5.8,
        breathChance: 0.14,
        sleepChance: 0.3,
        sleepDuration: 7.2,
        animationSpeed: 1,
      },
    },
  };
  const created = createMapPlacement(
    dragonAsset.id,
    [],
    () => "dragon-1",
    dragonAsset,
  );
  assert.deepEqual(created.creature.anchors, []);

  const [normalized] = normalizeMapPlacements([{
    ...created,
    x: 0.82,
    y: 0.57,
    creature: {
      ...created.creature,
      idleInterval: 99,
      breathChance: 0.01,
      sleepChance: 0.9,
      sleepDuration: 1,
      animationSpeed: 4,
    },
  }], [dragonAsset]);
  assert.equal(normalized.creature.idleInterval, 20);
  assert.equal(normalized.creature.breathChance, 0.03);
  assert.equal(normalized.creature.sleepChance, 0.75);
  assert.equal(normalized.creature.sleepDuration, 2);
  assert.equal(normalized.creature.animationSpeed, 2.5);
  assert.deepEqual(normalized.creature.anchors, []);

  const [nudged] = nudgeMapPlacement([normalized], normalized.instanceId, { x: 5, y: -5 }, { width: 390, height: 756 });
  assert.ok(nudged.x > normalized.x);
  assert.ok(nudged.y < normalized.y);
  assert.deepEqual(nudged.creature.anchors, []);

  const [saved] = validateMapPlacements([normalized], [dragonAsset]);
  assert.equal(saved.creature.breathChance, 0.03);
  assert.deepEqual(saved.creature.anchors, []);
});
