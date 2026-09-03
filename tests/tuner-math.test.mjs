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

const CHROMATIC_EXPECTATIONS = [
  ["C", "도"],
  ["C#", "도#"],
  ["D", "레"],
  ["D#", "레#"],
  ["E", "미"],
  ["F", "파"],
  ["F#", "파#"],
  ["G", "솔"],
  ["G#", "솔#"],
  ["A", "라"],
  ["A#", "라#"],
  ["B", "시"],
];

test("A4 uses the 440 Hz reference and resolves note, octave, and cents", () => {
  const pitch = frequencyToChromaticPitch(440);

  assert.equal(pitch.pitch, "A4");
  assert.equal(pitch.octave, 4);
  assert.equal(pitch.cents, 0);
  assert.equal(midiToFrequency(69), 440);
});

test("G and C reference frequencies keep raw MIDI, note index, solfege, and octave aligned", () => {
  const cases = [
    [195.9977, "G3", 55, 7, "솔", 3],
    [196, "G3", 55, 7, "솔", 3],
    [261.6256, "C4", 60, 0, "도", 4],
    [98, "G2", 43, 7, "솔", 2],
    [391.9954, "G4", 67, 7, "솔", 4],
  ];

  for (const [frequency, pitchName, midi, noteIndex, solfegeName, octave] of cases) {
    const pitch = frequencyToChromaticPitch(frequency);
    assert.equal(pitch.pitch, pitchName);
    assert.equal(pitch.midi, midi);
    assert.equal(pitch.noteIndex, noteIndex);
    assert.equal(pitch.solfegeName, solfegeName);
    assert.equal(pitch.octave, octave);
    assert.ok(Math.abs(pitch.cents) <= 1);
  }
});

test("all twelve semitones share the same English and Korean pitch-class index", () => {
  CHROMATIC_EXPECTATIONS.forEach(([noteName, solfegeName], noteIndex) => {
    const midi = 60 + noteIndex;
    const pitch = frequencyToChromaticPitch(midiToFrequency(midi));
    assert.equal(pitch.noteIndex, noteIndex);
    assert.equal(pitch.noteName, noteName);
    assert.equal(pitch.solfegeName, solfegeName);
    assert.equal(pitch.pitch, `${noteName}4`);
  });
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
  assert.equal(isTrustedTunerPitch({ candidateFrequency: e2, confidence: 0.7, inputPresent: true }), false);
  assert.equal(isTrustedTunerPitch({ candidateFrequency: e2, confidence: 0.82, inputPresent: true }), true);
  assert.equal(isTrustedTunerPitch({
    candidateFrequency: e2 * 2 ** (18 / 1200),
    confidence: 0.72,
    attackPresent: false,
    lastFrequency: e2,
    recentPitch: true,
    sustainPresent: true,
  }), true);
  assert.equal(isTrustedTunerPitch({
    candidateFrequency: e2 * 2,
    confidence: 0.78,
    attackPresent: false,
    lastFrequency: e2,
    recentPitch: true,
    sustainPresent: true,
  }), false);
  assert.equal(isTrustedTunerPitch({
    attackPresent: false,
    candidateFrequency: e2 * 2 ** (12 / 1200),
    confidence: 0.9,
    lastFrequency: e2,
    recentPitch: true,
    sustainPresent: false,
  }), true);
});

test("a release-level new-note candidate is eligible for multi-frame confirmation", () => {
  const g3 = 195.9977;
  const c4 = 261.6256;
  assert.equal(isTrustedTunerPitch({
    attackPresent: false,
    candidateFrequency: c4,
    confidence: 0.99,
    lastFrequency: g3,
    recentPitch: true,
    sustainPresent: true,
  }), true);
});

test("the current-note orb uses fine cents in auto and the fixed target distance in manual", () => {
  assert.equal(getTunerOrbPosition(-50, false), -1);
  assert.equal(getTunerOrbPosition(25, false), 0.5);
  assert.equal(getTunerOrbPosition(50, false), 1);
  assert.ok(getTunerOrbPosition(-400, true) < -0.7);
  assert.ok(getTunerOrbPosition(400, true) > 0.7);
});

test("visual cents stay centered for tiny noise and follow a clear detune without overshoot", () => {
  assert.equal(getTunerDisplayCents(2, 0), 0);
  const low = getTunerDisplayCents(-3, 0);
  const high = getTunerDisplayCents(5, 0);
  assert.ok(low < 0 && low > -3);
  assert.ok(high > 0 && high < 5);
  assert.equal(getTunerDisplayCents(1, 18, { elapsedMs: 52 }) < 18, true);
  assert.equal(getTunerDisplayCents(1, null, { pitchChanged: true }), 0);
});

test("visual interpolation stays between its previous and next detector positions", () => {
  let visual = 0;
  for (let frame = 0; frame < 8; frame += 1) {
    const next = getTunerDisplayCents(30, visual, { elapsedMs: 52 });
    assert.ok(next >= visual && next <= 30);
    visual = next;
  }
  for (let frame = 0; frame < 8; frame += 1) {
    const previous = visual;
    visual = getTunerDisplayCents(-20, visual, { elapsedMs: 52 });
    assert.ok(visual <= previous && visual >= -20);
  }
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
