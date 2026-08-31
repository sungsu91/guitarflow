import assert from "node:assert/strict";
import test from "node:test";

import {
  centsBetween,
  detectPitchYinDetailed,
  midiToFrequency,
} from "../src/tuner/tunerMath.js";
import {
  TUNER_COMPLETION_EXIT_CENTS,
  createTunerCompletionState,
  createTunerFrequencyState,
  resolveManualTunerOctave,
  updateTunerCompletionState,
  updateTunerFrequencyState,
} from "../src/tuner/tunerStability.js";

const SAMPLE_RATE = 48_000;
const BUFFER_SIZE = 2_048;

function createSineWave(frequency, harmonics = [{ amplitude: 1, multiple: 1 }]) {
  return Float32Array.from({ length: BUFFER_SIZE }, (_, index) => (
    harmonics.reduce((sample, harmonic) => (
      sample + harmonic.amplitude * Math.sin(
        (2 * Math.PI * frequency * harmonic.multiple * index) / SAMPLE_RATE,
      )
    ), 0)
  ));
}

function centsFrequency(frequency, cents) {
  return frequency * 2 ** (cents / 1200);
}

test("YIN resolves all six standard guitar strings at exact decimal frequencies", () => {
  const strings = [82.4069, 110, 146.8324, 195.9977, 246.9417, 329.6276];
  for (const expected of strings) {
    const result = detectPitchYinDetailed(createSineWave(expected), SAMPLE_RATE, 50, 1_200, 0.16);
    assert.ok(result, `missing ${expected} Hz`);
    assert.ok(Math.abs(centsBetween(result.frequency, expected)) < 0.35, `${expected} Hz was ${result.frequency}`);
    assert.ok(result.confidence >= 0.82);
  }
});

test("YIN preserves ±2, ±3, ±5, and ±10 cent offsets", () => {
  const target = 82.4069;
  for (const cents of [-10, -5, -3, -2, 0, 2, 3, 5, 10]) {
    const frequency = centsFrequency(target, cents);
    const result = detectPitchYinDetailed(createSineWave(frequency), SAMPLE_RATE, 50, 1_200, 0.16);
    assert.ok(result);
    assert.ok(Math.abs(centsBetween(result.frequency, target) - cents) < 0.4);
  }
});

test("YIN checks a harmonic-dominant E2 buffer for its measurable fundamental", () => {
  const e2 = 82.4069;
  const result = detectPitchYinDetailed(createSineWave(e2, [
    { amplitude: 0.1, multiple: 1 },
    { amplitude: 1, multiple: 2 },
  ]), SAMPLE_RATE, 50, 1_200, 0.16);

  assert.equal(result.harmonicDivisor, 2);
  assert.ok(Math.abs(centsBetween(result.rawFrequency, e2)) > 1_000);
  assert.ok(Math.abs(centsBetween(result.frequency, e2)) < 0.5);
});

test("a pure E3 remains E3 in AUTO-style detection", () => {
  const e3 = midiToFrequency(52);
  const result = detectPitchYinDetailed(createSineWave(e3), SAMPLE_RATE, 50, 1_200, 0.16);

  assert.equal(result.harmonicDivisor, 1);
  assert.ok(Math.abs(centsBetween(result.frequency, e3)) < 0.35);
});

test("attack guard and median suppress the first unstable frames", () => {
  const target = midiToFrequency(40);
  const state = createTunerFrequencyState();
  assert.equal(updateTunerFrequencyState(state, { now: 0, rawFrequency: centsFrequency(target, 24) }).frequency, null);
  assert.equal(updateTunerFrequencyState(state, { now: 52, rawFrequency: centsFrequency(target, -18) }).frequency, null);
  const settled = updateTunerFrequencyState(state, { now: 104, rawFrequency: target });

  assert.equal(settled.accepted, true);
  assert.ok(Math.abs(centsBetween(settled.frequency, target)) < 0.01);
});

test("one large outlier is held while three consistent frames confirm a real change", () => {
  const e2 = midiToFrequency(40);
  const a2 = midiToFrequency(45);
  const state = createTunerFrequencyState();
  [0, 52, 104].forEach((now) => updateTunerFrequencyState(state, { now, rawFrequency: e2 }));

  const outlier = updateTunerFrequencyState(state, { now: 156, rawFrequency: a2 });
  assert.equal(outlier.accepted, false);
  assert.ok(Math.abs(centsBetween(outlier.frequency, e2)) < 0.01);
  updateTunerFrequencyState(state, { now: 208, rawFrequency: a2 });
  const confirmed = updateTunerFrequencyState(state, { now: 260, rawFrequency: a2 });
  assert.equal(confirmed.accepted, true);
  assert.ok(Math.abs(centsBetween(confirmed.frequency, a2)) < 0.01);
});

test("AUTO continuity rejects a one-frame octave jump but confirms a sustained octave change", () => {
  const e2 = midiToFrequency(40);
  const e3 = midiToFrequency(52);
  const state = createTunerFrequencyState();
  [0, 52, 104].forEach((now) => updateTunerFrequencyState(state, { now, rawFrequency: e2 }));

  const harmonic = updateTunerFrequencyState(state, { now: 156, rawFrequency: e3 });
  assert.equal(harmonic.accepted, false);
  assert.ok(Math.abs(centsBetween(harmonic.frequency, e2)) < 0.01);
  updateTunerFrequencyState(state, { now: 208, rawFrequency: e3 });
  const changed = updateTunerFrequencyState(state, { now: 260, rawFrequency: e3 });
  assert.equal(changed.accepted, true);
  assert.ok(Math.abs(centsBetween(changed.frequency, e3)) < 0.01);
});

test("steady near-center jitter remains inside the requested visual stability band", () => {
  const e2 = midiToFrequency(40);
  const state = createTunerFrequencyState();
  const inputCents = [1, -2, 2, -3, 1, 3, -1, 2, -2, 0, 1, -1];
  const outputCents = inputCents.map((cents, index) => {
    const result = updateTunerFrequencyState(state, {
      now: index * 52,
      rawFrequency: centsFrequency(e2, cents),
    });
    return Number.isFinite(result.frequency) ? centsBetween(result.frequency, e2) : null;
  }).filter(Number.isFinite);

  assert.ok(outputCents.length > 5);
  assert.ok(Math.max(...outputCents.map(Math.abs)) <= 2.5);
});

test("manual low-string tracking folds a detected octave harmonic toward its target", () => {
  const e2 = midiToFrequency(40);
  assert.ok(Math.abs(centsBetween(resolveManualTunerOctave(e2 * 2, e2), e2)) < 0.01);
  assert.equal(resolveManualTunerOctave(midiToFrequency(45), e2), midiToFrequency(45));
});

test("completion requires stable entry and uses a 4.5-cent exit hysteresis", () => {
  const state = createTunerCompletionState();
  for (const now of [0, 52, 104, 156]) {
    assert.equal(updateTunerCompletionState(state, { cents: 2.5, now, pitchKey: "E2" }), false);
  }
  assert.equal(updateTunerCompletionState(state, { cents: 2.5, now: 208, pitchKey: "E2" }), true);
  assert.equal(updateTunerCompletionState(state, {
    cents: TUNER_COMPLETION_EXIT_CENTS,
    now: 260,
    pitchKey: "E2",
  }), true);
  assert.equal(updateTunerCompletionState(state, { cents: 5, now: 312, pitchKey: "E2" }), false);
});
