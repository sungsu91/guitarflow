import assert from "node:assert/strict";
import test from "node:test";

import {
  getCoastalChestFacingScaleX,
  getHermitCrabAnimationPhase,
  getHermitCrabFacingScaleX,
} from "../src/shooter/maps/animationPhase.js";

test("coastal chests face inward using the source direction on the right", () => {
  assert.equal(getCoastalChestFacingScaleX({
    eventType: "coastal-chest",
    scaleX: 1,
    x: 0.24,
  }), -1);
  assert.equal(getCoastalChestFacingScaleX({
    eventType: "coastal-chest",
    scaleX: -1,
    x: 0.76,
  }), 1);
  assert.equal(getCoastalChestFacingScaleX({
    eventType: "ambient-creature",
    scaleX: -1,
    x: 0.76,
  }), -1);
});

test("hermit crabs automatically face the opposite way on the right half of the map", () => {
  assert.equal(getHermitCrabFacingScaleX({
    animation: "hermit-crab-roam",
    scaleX: -1,
    x: 0.38,
  }), 1);
  assert.equal(getHermitCrabFacingScaleX({
    animation: "hermit-crab-roam",
    scaleX: 1,
    x: 0.62,
  }), -1);
  assert.equal(getHermitCrabFacingScaleX({
    animation: "shark-swim",
    scaleX: -1,
    x: 0.38,
  }), -1);
});

test("duplicated hermit crabs receive stable visibly different animation phases", () => {
  const firstPhase = getHermitCrabAnimationPhase({
    instanceId: "coastal-hermit-crab-01",
    x: 0.3869930639022436,
    y: 0.6193062768998749,
  });
  const secondPhase = getHermitCrabAnimationPhase({
    instanceId: "ambient-hermit-crab-mt1dzxyr-5q4ij",
    x: 0.6527622946714744,
    y: 0.8346828812041779,
  });

  assert.equal(firstPhase, getHermitCrabAnimationPhase({
    instanceId: "coastal-hermit-crab-01",
    x: 0.3869930639022436,
    y: 0.6193062768998749,
  }));
  assert.ok(firstPhase >= 0 && firstPhase < 1);
  assert.ok(secondPhase >= 0 && secondPhase < 1);
  assert.ok(Math.abs(firstPhase - secondPhase) > 0.3);
});
