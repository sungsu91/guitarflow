import assert from "node:assert/strict";
import test from "node:test";

import {
  deactivateBackingLoopsExcept,
  registerBackingLoopActivity,
  resetBackingLoopActivityForTests,
} from "../src/backing-loop/activityRegistry.js";

test("mode changes deactivate every backing loop outside the destination mode", () => {
  const calls = [];
  const unregisterMetronome = registerBackingLoopActivity(
    "metronome",
    () => calls.push("metronome-off"),
    () => calls.push("metronome-on"),
  );
  registerBackingLoopActivity("practice", () => calls.push("practice"));

  calls.length = 0;
  deactivateBackingLoopsExcept("metronome");
  assert.deepEqual(calls, ["metronome-on", "practice"]);

  unregisterMetronome();
  calls.length = 0;
  deactivateBackingLoopsExcept("shooter");
  assert.deepEqual(calls, ["practice"]);
  resetBackingLoopActivityForTests();
});
