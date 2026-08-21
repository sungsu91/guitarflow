import assert from "node:assert/strict";
import test from "node:test";

import {
  getTunerSwimmerFrame,
  getTunerSwimmerTarget,
} from "../src/tuner/tunerSwimmerMotion.js";

test("swimmer horizontal position preserves low, exact, and high tuning meaning", () => {
  const low = getTunerSwimmerTarget({ cents: -25, frequency: 80, hasSignal: true, previousFrequency: 80 });
  const exact = getTunerSwimmerTarget({ cents: 0, completed: true, frequency: 82.41, hasSignal: true, previousFrequency: 82.41 });
  const high = getTunerSwimmerTarget({ cents: 25, frequency: 84, hasSignal: true, previousFrequency: 84 });

  assert.ok(low.x < 50);
  assert.equal(exact.x, 50);
  assert.ok(high.x > 50);
  assert.equal(exact.y, 50);
  assert.ok(exact.intensity < low.intensity);
});

test("swimmer vertical position follows real pitch change instead of a fixed wave", () => {
  const rising = getTunerSwimmerTarget({ cents: -20, frequency: 82, hasSignal: true, previousFrequency: 80 });
  const falling = getTunerSwimmerTarget({ cents: -20, frequency: 78, hasSignal: true, previousFrequency: 80 });

  assert.ok(rising.frequencyDeltaCents > 0);
  assert.ok(rising.y < 50);
  assert.ok(falling.frequencyDeltaCents < 0);
  assert.ok(falling.y > 50);
  assert.ok(rising.y >= 44 && falling.y <= 56);
  assert.ok(Math.abs(rising.y - 50) <= 6);
  assert.ok(Math.abs(falling.y - 50) <= 6);
});

test("stable pitch input calms the swimmer even while the note is still off target", () => {
  const stable = getTunerSwimmerTarget({ cents: -30, frequency: 80, hasSignal: true, previousFrequency: 80 });
  const changing = getTunerSwimmerTarget({ cents: -30, frequency: 81, hasSignal: true, previousFrequency: 80 });

  assert.equal(stable.settled, true);
  assert.equal(changing.settled, false);
  assert.ok(stable.intensity < changing.intensity);
});

test("swimmer animation uses only upward-facing frames while position remains upright", () => {
  assert.deepEqual(getTunerSwimmerFrame(0, { settled: true }), { column: 0, row: 0 });
  assert.deepEqual(getTunerSwimmerFrame(4), { column: 4, row: 0 });
  assert.deepEqual(getTunerSwimmerFrame(5), { column: 3, row: 0 });

  for (let step = 0; step < 80; step += 1) {
    const frame = getTunerSwimmerFrame(step);
    assert.equal(frame.row, 0);
    assert.ok(frame.column >= 0 && frame.column <= 4);
  }
});
