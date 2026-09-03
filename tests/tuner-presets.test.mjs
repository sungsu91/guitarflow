import assert from "node:assert/strict";
import test from "node:test";

import { getTunerDisplayPitch } from "../src/tuner/tunerMath.js";
import {
  createTunerPresets,
  getTunerStringTarget,
} from "../src/tuner/tunerPresets.js";

test("guitar STANDARD maps every physical string number to the correct target", () => {
  const standard = createTunerPresets("guitar").find((preset) => preset.id === "standard");
  const expected = new Map([
    [6, ["E2", 40]],
    [5, ["A2", 45]],
    [4, ["D3", 50]],
    [3, ["G3", 55]],
    [2, ["B3", 59]],
    [1, ["E4", 64]],
  ]);

  for (const [stringNumber, [pitch, midi]] of expected) {
    const target = getTunerStringTarget(standard.strings, stringNumber);
    assert.equal(target.pitch, pitch);
    assert.equal(target.midi, midi);
  }
});

test("displayed note is always derived from filtered frequency, never stale note state", () => {
  const staleReading = {
    currentPitch: { pitch: "B3" },
    frequency: 195.9977,
    hasSignal: true,
  };
  assert.equal(getTunerDisplayPitch(staleReading).pitch, "G3");
  assert.equal(getTunerDisplayPitch({ ...staleReading, frequency: 246.9417 }).pitch, "B3");
  assert.equal(getTunerDisplayPitch({ ...staleReading, frequency: 329.6276 }).pitch, "E4");
});

test("bass and ukulele target lookup uses the same physical-string mapping", () => {
  const bass = createTunerPresets("bass")[0];
  assert.equal(getTunerStringTarget(bass.strings, 4).pitch, "E1");
  assert.equal(getTunerStringTarget(bass.strings, 1).pitch, "G2");

  const ukulele = createTunerPresets("ukulele")[0];
  assert.equal(getTunerStringTarget(ukulele.strings, 4).pitch, "G4");
  assert.equal(getTunerStringTarget(ukulele.strings, 1).pitch, "A4");
});
