import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { midiToFrequency } from "../src/tuner/tunerMath.js";
import {
  SHOOTER_HIT_TOLERANCE_CENTS,
  SHOOTER_REFERENCE_FREQUENCY,
  createShooterPitchJudgmentState,
  observeShooterPitchFrame,
} from "../src/shooter/pitchJudgment.js";

const OPEN_STRINGS = [
  ["E2", 40],
  ["A2", 45],
  ["D3", 50],
  ["G3", 55],
  ["B3", 59],
  ["E4", 64],
];

function playStableFrameSeries(state, { id, midi, now, pitch, rms = 0.05 }) {
  const target = { frequency: midiToFrequency(midi), id, pitch };
  const frames = [0, 34, 68].map((offset) => observeShooterPitchFrame(state, {
    confidence: 0.9,
    frequency: target.frequency,
    now: now + offset,
    rms,
    signalPresent: true,
    target,
  }));
  return frames;
}

test("all six standard-tuned open strings hit reliably ten times after a real release", () => {
  assert.equal(SHOOTER_REFERENCE_FREQUENCY, 440);
  for (const [pitch, midi] of OPEN_STRINGS) {
    const state = createShooterPitchJudgmentState();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const now = attempt * 300;
      observeShooterPitchFrame(state, { now: now - 20, signalPresent: false });
      const frames = playStableFrameSeries(state, { id: `${pitch}-${attempt}`, midi, now, pitch });
      assert.deepEqual(frames.map(({ accepted }) => accepted), [false, false, true], `${pitch} attempt ${attempt + 1}`);
    }
  }
});

test("adjacent semitones never hit F or C targets", () => {
  for (const [targetPitch, targetMidi] of [["F2", 41], ["C4", 60]]) {
    for (const wrongMidi of [targetMidi - 1, targetMidi + 1]) {
      const state = createShooterPitchJudgmentState();
      const target = { frequency: midiToFrequency(targetMidi), id: targetPitch, pitch: targetPitch };
      const results = [0, 34, 68, 102].map((now) => observeShooterPitchFrame(state, {
        confidence: 0.99,
        frequency: midiToFrequency(wrongMidi),
        now,
        rms: 0.08,
        signalPresent: true,
        target,
      }));
      assert.ok(results.every(({ accepted }) => !accepted), `${targetPitch} accepted adjacent MIDI ${wrongMidi}`);
      assert.ok(results.every(({ reason }) => reason === "wrong-pitch"));
    }
  }
});

test("weak, normal, and strong target attacks use the same pitch gate", () => {
  for (const rms of [0.006, 0.05, 0.4]) {
    const state = createShooterPitchJudgmentState();
    const frames = playStableFrameSeries(state, { id: `g3-${rms}`, midi: 55, now: 0, pitch: "G3", rms });
    assert.equal(frames.at(-1).accepted, true, `RMS ${rms}`);
  }
});

test("low confidence attack noise and cents outside the shared hit window are rejected", () => {
  const targetFrequency = midiToFrequency(64);
  const target = { frequency: targetFrequency, id: "e4", pitch: "E4" };
  const noisy = createShooterPitchJudgmentState();
  for (const now of [0, 34, 68, 102]) {
    assert.equal(observeShooterPitchFrame(noisy, {
      confidence: 0.6,
      frequency: targetFrequency,
      now,
      rms: 0.2,
      signalPresent: true,
      target,
    }).accepted, false);
  }

  const detuned = createShooterPitchJudgmentState();
  const outsideFrequency = targetFrequency * 2 ** ((SHOOTER_HIT_TOLERANCE_CENTS + 1) / 1200);
  for (const now of [0, 34, 68, 102]) {
    assert.equal(observeShooterPitchFrame(detuned, {
      confidence: 0.99,
      frequency: outsideFrequency,
      now,
      rms: 0.2,
      signalPresent: true,
      target,
    }).accepted, false);
  }
});

test("one pick hits once, same-pitch sustain stays locked, and a release enables the next target", () => {
  const state = createShooterPitchJudgmentState();
  assert.equal(playStableFrameSeries(state, { id: "first", midi: 64, now: 0, pitch: "E4" }).at(-1).accepted, true);
  const sustained = playStableFrameSeries(state, { id: "second", midi: 64, now: 110, pitch: "E4" });
  assert.ok(sustained.every(({ accepted }) => !accepted));
  assert.ok(sustained.some(({ reason }) => reason === "sustain-lock"));

  observeShooterPitchFrame(state, { now: 240, signalPresent: false });
  assert.equal(playStableFrameSeries(state, { id: "second", midi: 64, now: 270, pitch: "E4" }).at(-1).accepted, true);
});

test("a fast, stable move to a different current target is accepted without matching future notes", () => {
  const state = createShooterPitchJudgmentState();
  assert.equal(playStableFrameSeries(state, { id: "a2", midi: 45, now: 0, pitch: "A2" }).at(-1).accepted, true);
  const next = playStableFrameSeries(state, { id: "b2", midi: 47, now: 100, pitch: "B2" });
  assert.equal(next.at(-1).accepted, true);

  const futureTargetAttempt = createShooterPitchJudgmentState();
  const currentTarget = { frequency: midiToFrequency(45), id: "current-a2", pitch: "A2" };
  for (const now of [0, 34, 68]) {
    assert.equal(observeShooterPitchFrame(futureTargetAttempt, {
      confidence: 0.99,
      frequency: midiToFrequency(47),
      now,
      rms: 0.05,
      signalPresent: true,
      target: currentTarget,
    }).accepted, false);
  }
});

test("shooter runtime uses detailed YIN confidence and current-target stabilization", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const microphoneSource = source.slice(source.indexOf("const readMicrophone"), source.indexOf("const runGameFrame"));
  assert.match(microphoneSource, /detectPitchYinDetailed/);
  assert.match(microphoneSource, /candidate\.id === shooterActiveTargetIdRef\.current/);
  assert.match(microphoneSource, /observeShooterPitchFrame\(shooterPitchJudgmentRef\.current/);
  assert.match(microphoneSource, /judgment\.accepted/);
  assert.doesNotMatch(microphoneSource, /stableGameNoteRef\.current\.count >= 1/);
});
