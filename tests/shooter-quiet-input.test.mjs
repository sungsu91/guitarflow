import assert from "node:assert/strict";
import test from "node:test";
import { getMicDetectionThresholds } from "../src/audio/micInputPresets.js";
import { isShooterPitchSignalPresent, readShooterSignalFrame } from "../src/shooter/microphoneSignal.js";
import { detectPitchYinDetailed, getRms, midiToFrequency } from "../src/tuner/tunerMath.js";
import { createShooterPitchJudgmentState, observeShooterPitchFrame } from "../src/shooter/pitchJudgment.js";
import { createShooterTargetNote } from "../src/shooter/gameplayRules.js";

function signalFor(rms, noiseFloor = 0.0006, overrides = {}) {
  const thresholds = getMicDetectionThresholds(noiseFloor);
  return readShooterSignalFrame({ readDetectionFrame: () => ({
    rms, isAttackPresent: rms >= thresholds.attackThresholdRms,
    isReleasePresent: rms >= thresholds.releaseThresholdRms,
    isCalibrating: false, abruptImpact: false, ...overrides,
  }) }, 0, false, rms, thresholds.attackThresholdRms);
}

test("quiet first attacks reach YIN across the entire playable range and hit without a louder pick", () => {
  for (const sampleRate of [44100, 48000]) {
    for (let midi = 40; midi <= 81; midi += 1) {
      const frequency = midiToFrequency(midi);
      const samples = Float32Array.from({ length: 2048 }, (_, i) => (
        0.0025 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * i / sampleRate)
      ));
      const signal = signalFor(getRms(samples));
      assert.equal(signal.signalPresent, false, "below the existing loud-attack gate");
      assert.equal(signal.canAnalyzePitch, true);
      const pitch = detectPitchYinDetailed(samples, sampleRate, 75, 900, 0.12);
      const signalPresent = isShooterPitchSignalPresent(signal, pitch?.confidence);
      assert.equal(signalPresent, true);
      const note = createShooterTargetNote({ stringNumber: 6, fretNumber: midi - 40 });
      assert.equal(observeShooterPitchFrame(createShooterPitchJudgmentState(), {
        ...pitch, now: 0, rms: signal.rms, signalPresent,
        target: { id: midi, pitch: note.label, frequency },
      }).accepted, true, `MIDI ${midi} at ${sampleRate}`);
    }
  }
});

test("quiet input requires high pitch confidence, calibration, and adaptive noise gates", () => {
  const quiet = signalFor(0.0025);
  assert.equal(isShooterPitchSignalPresent(quiet, 0.93), false);
  assert.equal(isShooterPitchSignalPresent(quiet, 0.95), true);
  for (const signal of [signalFor(0.0008), signalFor(0.0025, 0.002),
    signalFor(0.0025, 0.0006, { isCalibrating: true }),
    signalFor(0.0025, 0.0006, { abruptImpact: true })]) {
    assert.equal(isShooterPitchSignalPresent(signal, 0.999), false);
  }
});

test("noise above the analysis floor does not become a quiet note-on accepted by the game", () => {
  let seed = 9001;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const samples = Float32Array.from({ length: 2048 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed / 4294967296 * 2 - 1) * 0.0025 * Math.sqrt(3);
    });
    const result = detectPitchYinDetailed(samples, 48000, 75, 900, 0.12);
    assert.equal(isShooterPitchSignalPresent(signalFor(getRms(samples)), result?.confidence), false);
  }
});
