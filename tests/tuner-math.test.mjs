import assert from "node:assert/strict";
import test from "node:test";

import {
  centsBetween,
  frequencyToChromaticPitch,
  getTunerGaugePosition,
  getTunerDisplayCents,
  getHorizontalTuningState,
  getTunerGuidance,
  getTunerOrbPosition,
  getTunerTrackingState,
  isTrustedTunerPitch,
  midiToFrequency,
} from "../src/tuner/tunerMath.js";

test("A4 uses the 440 Hz reference and resolves note, octave, and cents", () => {
  const pitch = frequencyToChromaticPitch(440);

  assert.equal(pitch.pitch, "A4");
  assert.equal(pitch.octave, 4);
  assert.equal(pitch.cents, 0);
  assert.equal(midiToFrequency(69), 440);
});

test("auto tracking follows every chromatic pitch while manual tracking keeps the selected string target", () => {
  const strings = [
    { frequency: midiToFrequency(40), pitch: "E2", stringNumber: 6 },
    { frequency: midiToFrequency(45), pitch: "A2", stringNumber: 5 },
  ];

  const autoSequence = [40, 39, 38, 37].map((midi) => (
    getTunerTrackingState(midiToFrequency(midi), strings).currentPitch.pitch
  ));
  assert.deepEqual(autoSequence, ["E2", "D#2", "D2", "C#2"]);
  assert.equal(getTunerTrackingState(midiToFrequency(38), strings).target, null);

  const manualD2 = getTunerTrackingState(midiToFrequency(38), strings, 6);
  assert.equal(manualD2.currentPitch.pitch, "D2");
  assert.equal(manualD2.target.pitch, "E2");
  assert.equal(manualD2.cents, -200);
});

test("auto tracking changes its cents reference when the nearest semitone boundary is crossed", () => {
  const e2 = midiToFrequency(40);
  const belowBoundary = getTunerTrackingState(e2 * 2 ** (49 / 1200), []);
  const aboveBoundary = getTunerTrackingState(e2 * 2 ** (51 / 1200), []);

  assert.equal(belowBoundary.currentPitch.pitch, "E2");
  assert.equal(belowBoundary.cents, 49);
  assert.equal(aboveBoundary.currentPitch.pitch, "F2");
  assert.equal(aboveBoundary.cents, -49);
});

test("quiet sustain accepts only confident pitch near the last valid reading", () => {
  const e2 = midiToFrequency(40);
  assert.equal(isTrustedTunerPitch({ candidateFrequency: e2, confidence: 0.7, inputPresent: true }), true);
  assert.equal(isTrustedTunerPitch({
    candidateFrequency: e2 * 2 ** (18 / 1200),
    confidence: 0.86,
    inputPresent: false,
    lastFrequency: e2,
    recentPitch: true,
  }), true);
  assert.equal(isTrustedTunerPitch({
    candidateFrequency: e2 * 2,
    confidence: 0.92,
    inputPresent: false,
    lastFrequency: e2,
    recentPitch: true,
  }), false);
});

test("the current-note orb uses fine cents in auto and the fixed target distance in manual", () => {
  assert.equal(getTunerOrbPosition(-50, false), -1);
  assert.equal(getTunerOrbPosition(25, false), 0.5);
  assert.equal(getTunerOrbPosition(50, false), 1);
  assert.ok(getTunerOrbPosition(-400, true) < -0.7);
  assert.ok(getTunerOrbPosition(400, true) > 0.7);
});

test("visual cents stay centered for tiny noise and immediately follow a clear detune", () => {
  assert.equal(getTunerDisplayCents(2, 0), 0);
  assert.equal(getTunerDisplayCents(-3, 0), 0);
  assert.equal(getTunerDisplayCents(4, 0), 4);
  assert.equal(getTunerDisplayCents(-5, 0), -5);
  assert.equal(getTunerDisplayCents(1, 18, { elapsedMs: 52 }) < 18, true);
  assert.equal(getTunerDisplayCents(1, null, { pitchChanged: true }), 0);
});

test("coarse tuning remains directional beyond the fine cents range", () => {
  assert.ok(getTunerGaugePosition(-400) < -0.7);
  assert.ok(getTunerGaugePosition(400) > 0.7);
  assert.equal(getTunerGaugePosition(0), 0);
  assert.ok(getTunerGaugePosition(20) < getTunerGaugePosition(200));
});

test("manual targets warn only after an abnormally high pitch", () => {
  assert.equal(getTunerGuidance({ cents: 320, hasSignal: true, manual: true }).key, "danger");
  assert.equal(getTunerGuidance({ cents: 320, hasSignal: true, manual: false }).key, "tracking");
  assert.equal(getTunerGuidance({ cents: 0, hasSignal: true, stableExact: true }).key, "exact");
});

test("coarse C2 to E2 distance is preserved instead of clamping to fifty cents", () => {
  const c2 = midiToFrequency(36);
  const e2 = midiToFrequency(40);

  assert.equal(Math.round(centsBetween(c2, e2)), -400);
});

test("horizontal tuner labels express distance from the center without vertical high-low bands", () => {
  assert.equal(getHorizontalTuningState({ cents: -180, hasSignal: true }), "많이 낮음");
  assert.equal(getHorizontalTuningState({ cents: -18, hasSignal: true }), "조금 낮음");
  assert.equal(getHorizontalTuningState({ cents: 0.8, hasSignal: true }), "거의 정확");
  assert.equal(getHorizontalTuningState({ cents: 0.8, completed: true, hasSignal: true }), "정확");
  assert.equal(getHorizontalTuningState({ cents: 22, hasSignal: true }), "조금 높음");
  assert.equal(getHorizontalTuningState({ cents: 140, hasSignal: true }), "많이 높음");
});
