import assert from "node:assert/strict";
import test from "node:test";

import {
  deactivateBackingLoopsExcept,
  registerBackingLoopActivity,
  resetBackingLoopActivityForTests,
} from "../src/backing-loop/activityRegistry.js";

test("shared backing playback survives room changes while navigation cleanup still runs", () => {
  resetBackingLoopActivityForTests();
  const calls = [];
  const unregister = registerBackingLoopActivity('shared', () => calls.push('stop'), null, mode => calls.push(mode));
  for (const mode of ['metronome', 'etudes', 'rhythm-trainer', 'practice']) deactivateBackingLoopsExcept(mode);
  assert.deepEqual(calls, ['metronome', 'etudes', 'rhythm-trainer', 'practice']);
  unregister();
  deactivateBackingLoopsExcept('tuner');
  assert.equal(calls.length, 4);
  resetBackingLoopActivityForTests();
});

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
