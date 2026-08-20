import assert from "node:assert/strict";
import test from "node:test";

import {
  COASTAL_CHEST_FRAME_SEQUENCE,
  COASTAL_MIMIC_DEFEAT_FRAME_COUNT,
  COASTAL_MIMIC_HIT_FRAME_COUNT,
  COASTAL_MIMIC_HITS_TO_DEFEAT,
  COASTAL_MIMIC_IDLE_FRAME_COUNT,
  assignRandomEventActorPlacements,
  canHitCoastalMimic,
  createCoastalChestState,
  reduceCoastalChestState,
} from "../src/shooter/maps/events/coastalChestState.js";

function advanceOpening(state) {
  const visitedFrames = [state.frameIndex];
  let current = state;
  for (let index = 0; index < COASTAL_CHEST_FRAME_SEQUENCE.length; index += 1) {
    current = reduceCoastalChestState(current, { type: "advance" });
    if (index < COASTAL_CHEST_FRAME_SEQUENCE.length - 1) {
      visitedFrames.push(current.frameIndex);
    }
  }
  return { state: current, visitedFrames };
}

test("treasure chest opens through the authored wobble sequence and never closes again", () => {
  const closed = createCoastalChestState("treasure");
  const opening = reduceCoastalChestState(closed, { type: "click" });
  assert.equal(opening.phase, "opening");
  assert.deepEqual(advanceOpening(opening).visitedFrames, COASTAL_CHEST_FRAME_SEQUENCE);

  const opened = advanceOpening(opening).state;
  assert.equal(opened.phase, "opened");
  assert.equal(opened.frameIndex, 4);
  assert.strictEqual(reduceCoastalChestState(opened, { type: "click" }), opened);
});

test("mimic loops while alive, queues hit reactions, and dies on five post-transform hits", () => {
  const closed = createCoastalChestState("mimic");
  const revealing = reduceCoastalChestState(closed, { type: "click" });
  assert.equal(revealing.phase, "revealing");
  assert.equal(revealing.hitCount, 0);
  assert.strictEqual(reduceCoastalChestState(revealing, { type: "click" }), revealing);

  let active = advanceOpening(revealing).state;
  assert.equal(active.phase, "active");
  assert.equal(active.hitCount, 0);
  assert.equal(canHitCoastalMimic(active), true);

  for (let frame = 1; frame < COASTAL_MIMIC_IDLE_FRAME_COUNT; frame += 1) {
    active = reduceCoastalChestState(active, { type: "idle-tick" });
    assert.equal(active.motionFrameIndex, frame);
  }
  active = reduceCoastalChestState(active, { type: "idle-tick" });
  assert.equal(active.motionFrameIndex, 0);

  let reacting = reduceCoastalChestState(active, { type: "click" });
  assert.equal(reacting.phase, "hit-reacting");
  assert.equal(reacting.hitCount, 1);
  reacting = reduceCoastalChestState(reacting, { type: "click" });
  assert.equal(reacting.hitCount, 2);
  assert.equal(reacting.pendingHitCount, 1);
  for (let frame = 0; frame < COASTAL_MIMIC_HIT_FRAME_COUNT; frame += 1) {
    reacting = reduceCoastalChestState(reacting, { type: "hit-advance" });
  }
  assert.equal(reacting.phase, "hit-reacting");
  assert.equal(reacting.pendingHitCount, 0);
  for (let frame = 0; frame < COASTAL_MIMIC_HIT_FRAME_COUNT; frame += 1) {
    reacting = reduceCoastalChestState(reacting, { type: "hit-advance" });
  }
  active = reacting;
  assert.equal(active.phase, "active");

  for (let hit = 3; hit < COASTAL_MIMIC_HITS_TO_DEFEAT; hit += 1) {
    active = reduceCoastalChestState(active, { type: "click" });
    assert.equal(active.hitCount, hit);
    assert.equal(active.phase, "hit-reacting");
    for (let frame = 0; frame < COASTAL_MIMIC_HIT_FRAME_COUNT; frame += 1) {
      active = reduceCoastalChestState(active, { type: "hit-advance" });
    }
    assert.equal(active.phase, "active");
  }
  let defeating = reduceCoastalChestState(active, { type: "click" });
  assert.equal(defeating.hitCount, COASTAL_MIMIC_HITS_TO_DEFEAT);
  assert.equal(defeating.phase, "hit-reacting");
  assert.equal(canHitCoastalMimic(defeating), false);
  for (let frame = 0; frame < COASTAL_MIMIC_HIT_FRAME_COUNT; frame += 1) {
    defeating = reduceCoastalChestState(defeating, { type: "hit-advance" });
  }
  assert.equal(defeating.phase, "defeating");

  const visitedDefeatFrames = [defeating.motionFrameIndex];
  for (let frame = 0; frame < COASTAL_MIMIC_DEFEAT_FRAME_COUNT; frame += 1) {
    defeating = reduceCoastalChestState(defeating, { type: "defeat-advance" });
    if (defeating.phase === "defeating") visitedDefeatFrames.push(defeating.motionFrameIndex);
  }
  assert.deepEqual(visitedDefeatFrames, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(defeating.phase, "removed");
});

test("interactive map actors choose distinct positions from a shared configurable pool", () => {
  const spawnPoints = [
    { x: 0.2, y: 0.7, scale: 0.6 },
    { x: 0.8, y: 0.75, scale: 0.7 },
  ];
  const layers = ["treasure", "mimic"].map((variant) => ({
    eventActor: {
      spawnGroup: "coastal-chests",
      spawnPoints,
      type: "coastal-chest",
      variant,
    },
    instanceId: variant,
    placement: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
  }));

  const assigned = assignRandomEventActorPlacements(layers, () => 0);
  assert.deepEqual(
    assigned.map((layer) => ({
      scale: layer.placement.scale,
      x: layer.placement.x,
      y: layer.placement.y,
    })),
    spawnPoints,
  );
  assert.deepEqual(layers.map((layer) => layer.placement), [
    { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
  ]);
});

test("five coastal chests stay unique while treasure and mimic both mix across map sides", () => {
  const spawnPoints = [
    { x: 0.14, y: 0.63 },
    { x: 0.2, y: 0.73 },
    { x: 0.27, y: 0.83 },
    { x: 0.86, y: 0.65 },
    { x: 0.8, y: 0.75 },
    { x: 0.73, y: 0.84 },
  ];
  const layers = Array.from({ length: 5 }, (_, index) => ({
    eventActor: {
      spawnGroup: "coastal-chests",
      spawnPoints,
      type: "coastal-chest",
      variant: index % 2 === 0 ? "treasure" : "mimic",
    },
    instanceId: `chest-${index + 1}`,
    placement: { x: 0.5, y: 0.5 },
  }));

  const assigned = assignRandomEventActorPlacements(layers, () => 0.999);
  const positions = assigned.map(({ placement }) => `${placement.x}:${placement.y}`);
  const sideCounts = [
    assigned.filter(({ placement }) => placement.x < 0.5).length,
    assigned.filter(({ placement }) => placement.x > 0.5).length,
  ].sort();
  assert.equal(new Set(positions).size, 5);
  assert.deepEqual(sideCounts, [2, 3]);
  ["treasure", "mimic"].forEach((variant) => {
    const sides = new Set(
      assigned
        .filter((layer) => layer.eventActor.variant === variant)
        .map(({ placement }) => (placement.x < 0.5 ? "left" : "right")),
    );
    assert.deepEqual([...sides].sort(), ["left", "right"]);
  });
});
