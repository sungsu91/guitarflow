import assert from "node:assert/strict";
import test from "node:test";

import {
  centsBetween,
  detectPitchYinDetailed,
  frequencyToChromaticPitch,
  midiToFrequency,
} from "../src/tuner/tunerMath.js";
import { getMicDetectionThresholds } from "../src/audio/micInputPresets.js";
import {
  TUNER_COMPLETION_HOLD_MS,
  TUNER_COMPLETION_EXIT_CENTS,
  TUNER_NO_SIGNAL_TIMEOUT_MS,
  TUNER_MANUAL_DECAY_OUTLIER_CENTS,
  TUNER_SIGNAL_PHASES,
  createTunerCompletionState,
  createTunerFrequencyState,
  createTunerSignalState,
  resolveManualTunerOctave,
  updateTunerCompletionState,
  updateTunerFrequencyState,
  updateTunerSignalState,
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

test("weak, normal, and strong six-string sine inputs remain valid detector candidates", () => {
  const strings = [82.4069, 110, 146.8324, 195.9977, 246.9417, 329.6276];
  const amplitudes = [0.006, 0.05, 0.4];
  for (const expected of strings) {
    for (const amplitude of amplitudes) {
      const result = detectPitchYinDetailed(
        createSineWave(expected, [{ amplitude, multiple: 1 }]),
        SAMPLE_RATE,
        50,
        1_200,
        0.16,
      );
      assert.ok(result, `missing ${expected} Hz at amplitude ${amplitude}`);
      assert.ok(Math.abs(centsBetween(result.frequency, expected)) < 0.35);
      assert.ok(result.confidence >= 0.82);
    }
  }
});

test("YIN and note mapping distinguish G3 from C4 and cover all twelve semitones", () => {
  const cases = [
    [195.9977, "G3"],
    [196, "G3"],
    [261.6256, "C4"],
    [98, "G2"],
    [391.9954, "G4"],
  ];
  for (const [frequency, expectedPitch] of cases) {
    const result = detectPitchYinDetailed(createSineWave(frequency), SAMPLE_RATE, 50, 1_200, 0.16);
    assert.ok(result);
    assert.equal(frequencyToChromaticPitch(result.frequency).pitch, expectedPitch);
  }

  for (let midi = 48; midi < 60; midi += 1) {
    const expected = frequencyToChromaticPitch(midiToFrequency(midi));
    const result = detectPitchYinDetailed(createSineWave(expected.frequency), SAMPLE_RATE, 50, 1_200, 0.16);
    const detected = frequencyToChromaticPitch(result.frequency);
    assert.equal(detected.noteIndex, expected.noteIndex);
    assert.equal(detected.noteName, expected.noteName);
    assert.equal(detected.solfegeName, expected.solfegeName);
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

test("weak one-third-frequency resonance cannot turn G3, B3, and E4 into C2, E2, and A2", () => {
  const highStrings = [
    [195.9977, "G3"],
    [246.9417, "B3"],
    [329.6276, "E4"],
  ];

  for (const [frequency, expectedPitch] of highStrings) {
    const result = detectPitchYinDetailed(createSineWave(frequency, [
      { amplitude: 1, multiple: 1 },
      { amplitude: 0.06, multiple: 1 / 3 },
    ]), SAMPLE_RATE, 50, 1_200, 0.16);

    assert.ok(result, `missing ${expectedPitch}`);
    assert.equal(result.harmonicDivisor, 1);
    assert.equal(frequencyToChromaticPitch(result.frequency).pitch, expectedPitch);
    assert.ok(Math.abs(centsBetween(result.frequency, frequency)) < 4);
  }
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

test("one C4 attack frame cannot initialize a G3 pluck as C", () => {
  const g3 = 195.9977;
  const c4 = 261.6256;
  const state = createTunerFrequencyState();
  assert.equal(updateTunerFrequencyState(state, { now: 0, rawFrequency: c4 }).accepted, false);
  assert.equal(updateTunerFrequencyState(state, { now: 40, rawFrequency: g3 }).accepted, false);
  assert.equal(updateTunerFrequencyState(state, { now: 80, rawFrequency: g3 }).accepted, false);
  const acquired = updateTunerFrequencyState(state, { now: 120, rawFrequency: g3 });
  assert.equal(acquired.accepted, true);
  assert.equal(frequencyToChromaticPitch(acquired.frequency).pitch, "G3");
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

test("G3 stays on screen through one C4 candidate and changes only after three matching frames", () => {
  const g3 = 195.9977;
  const c4 = 261.6256;
  const state = createTunerFrequencyState();
  [0, 40, 80].forEach((now) => updateTunerFrequencyState(state, { now, rawFrequency: g3 }));

  const firstC = updateTunerFrequencyState(state, { now: 120, rawFrequency: c4 });
  assert.equal(firstC.accepted, false);
  assert.equal(firstC.stage, "confirming");
  assert.equal(frequencyToChromaticPitch(firstC.frequency).pitch, "G3");

  const secondC = updateTunerFrequencyState(state, { now: 160, rawFrequency: c4 });
  assert.equal(secondC.accepted, false);
  assert.equal(frequencyToChromaticPitch(secondC.frequency).pitch, "G3");

  const thirdC = updateTunerFrequencyState(state, { now: 200, rawFrequency: c4 });
  assert.equal(thirdC.accepted, true);
  assert.equal(frequencyToChromaticPitch(thirdC.frequency).pitch, "C4");
});

test("manual decay rejects a repeated one-third-frequency jump but a new attack can replace it", () => {
  const target = 195.9977;
  const falseDecayFrequency = target / 3;
  const state = createTunerFrequencyState();

  updateTunerFrequencyState(state, { manualTargetFrequency: target, now: 0, rawFrequency: target });
  updateTunerFrequencyState(state, { manualTargetFrequency: target, now: 40, rawFrequency: target });
  const acquired = updateTunerFrequencyState(state, {
    manualTargetFrequency: target,
    now: 80,
    rawFrequency: target,
  });
  assert.equal(acquired.accepted, true);

  for (const now of [120, 160, 200, 240]) {
    const decaying = updateTunerFrequencyState(state, {
      allowLargeJump: false,
      manualTargetFrequency: target,
      now,
      rawFrequency: falseDecayFrequency,
    });
    assert.equal(decaying.accepted, false);
    assert.equal(decaying.stage, "decay-outlier");
    assert.ok(Math.abs(centsBetween(decaying.frequency, target)) < 0.01);
  }

  assert.ok(Math.abs(centsBetween(falseDecayFrequency, target)) > TUNER_MANUAL_DECAY_OUTLIER_CENTS);
  const newPitch = midiToFrequency(60);
  const firstAttack = updateTunerFrequencyState(state, {
    allowLargeJump: true,
    manualTargetFrequency: target,
    now: 280,
    rawFrequency: newPitch,
  });
  const secondAttack = updateTunerFrequencyState(state, {
    allowLargeJump: true,
    manualTargetFrequency: target,
    now: 320,
    rawFrequency: newPitch,
  });
  const thirdAttack = updateTunerFrequencyState(state, {
    allowLargeJump: true,
    manualTargetFrequency: target,
    now: 360,
    rawFrequency: newPitch,
  });
  assert.equal(firstAttack.stage, "confirming");
  assert.equal(secondAttack.stage, "confirming");
  assert.equal(thirdAttack.accepted, true);
  assert.equal(frequencyToChromaticPitch(thirdAttack.frequency).pitch, "C4");
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

test("completion requires a 320ms stable entry and uses a 4.5-cent exit hysteresis", () => {
  const state = createTunerCompletionState();
  for (let now = 0; now < TUNER_COMPLETION_HOLD_MS; now += 40) {
    assert.equal(updateTunerCompletionState(state, { cents: 2.5, now, pitchKey: "E2" }), false);
  }
  assert.equal(updateTunerCompletionState(state, {
    cents: 2.5,
    now: TUNER_COMPLETION_HOLD_MS,
    pitchKey: "E2",
  }), true);
  assert.equal(updateTunerCompletionState(state, {
    cents: TUNER_COMPLETION_EXIT_CENTS,
    now: TUNER_COMPLETION_HOLD_MS + 40,
    pitchKey: "E2",
  }), true);
  assert.equal(updateTunerCompletionState(state, {
    cents: 5,
    now: TUNER_COMPLETION_HOLD_MS + 80,
    pitchKey: "E2",
  }), false);
});

test("signal lifecycle always passes through DECAYING before NO_SIGNAL", () => {
  const state = createTunerSignalState();
  assert.equal(state.phase, TUNER_SIGNAL_PHASES.LISTENING);
  assert.deepEqual(updateTunerSignalState(state, {
    now: 0,
    pitchPresent: true,
    releasePresent: true,
  }), { hasSignal: true, phase: TUNER_SIGNAL_PHASES.ACQUIRED, shouldClear: false });

  const oneMiss = updateTunerSignalState(state, {
    now: 40,
    pitchPresent: false,
    releasePresent: false,
  });
  assert.equal(oneMiss.phase, TUNER_SIGNAL_PHASES.DECAYING);
  assert.equal(oneMiss.hasSignal, true);

  const stillDecaying = updateTunerSignalState(state, {
    now: TUNER_NO_SIGNAL_TIMEOUT_MS,
    pitchPresent: false,
    releasePresent: false,
  });
  assert.equal(stillDecaying.phase, TUNER_SIGNAL_PHASES.DECAYING);
  assert.equal(stillDecaying.shouldClear, false);

  const ended = updateTunerSignalState(state, {
    now: TUNER_NO_SIGNAL_TIMEOUT_MS + 40,
    pitchPresent: false,
    releasePresent: false,
  });
  assert.equal(ended.phase, TUNER_SIGNAL_PHASES.NO_SIGNAL);
  assert.equal(ended.hasSignal, false);
  assert.equal(ended.shouldClear, true);
});

test("release-level residual energy can keep a real pitch alive for three seconds", () => {
  const { attackThresholdRms, releaseThresholdRms } = getMicDetectionThresholds(0.0006);
  assert.equal(attackThresholdRms, 0.0038);
  assert.equal(releaseThresholdRms, 0.0012);

  const state = createTunerSignalState();
  updateTunerSignalState(state, { now: 0, pitchPresent: true, releasePresent: true });
  for (let now = 40; now <= 3_000; now += 40) {
    const rms = 0.02 * Math.exp(-now / 1_600);
    const releasePresent = rms >= releaseThresholdRms;
    const transition = updateTunerSignalState(state, {
      now,
      pitchPresent: releasePresent,
      releasePresent,
      stable: now >= TUNER_COMPLETION_HOLD_MS,
    });
    assert.equal(transition.hasSignal, true, `released at ${now}ms, RMS ${rms}`);
  }
  assert.ok(0.02 * Math.exp(-3_000 / 1_600) < attackThresholdRms);
  assert.ok(0.02 * Math.exp(-3_000 / 1_600) > releaseThresholdRms);
  assert.equal(state.phase, TUNER_SIGNAL_PHASES.STABLE);
});
