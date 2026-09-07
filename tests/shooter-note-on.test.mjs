import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createShooterNoteOnState, observeShooterNoteOn } from "../src/shooter/noteOn.js";
import { commitShooterPitchHit, createShooterPitchJudgmentState, observeShooterPitchFrame } from "../src/shooter/pitchJudgment.js";
import { detectPitchYinDetailed, frequencyToChromaticPitch, midiToFrequency } from "../src/tuner/tunerMath.js";

const targetFor = (midi, id = midi) => ({ id, pitch: frequencyToChromaticPitch(midiToFrequency(midi)).pitch, frequency: midiToFrequency(midi) });
const frame = (state, target, now, extra = {}) => observeShooterPitchFrame(state, {
  target, now, frequency: target.frequency, confidence: 0.92, rms: 0.02, signalPresent: true, ...extra,
});

test("PCM-to-hit path accepts a single clear frame across all playable semitones", () => {
  for (const sampleRate of [44100, 48000]) {
    for (let midi = 40; midi <= 81; midi += 1) {
      const target = targetFor(midi);
      const samples = Float32Array.from({ length: 2048 }, (_, index) => {
        const phase = 2 * Math.PI * target.frequency * index / sampleRate;
        return 0.04 * (Math.sin(phase) + 0.3 * Math.sin(phase * 2) + 0.15 * Math.sin(phase * 3));
      });
      const detected = detectPitchYinDetailed(samples, sampleRate, 75, 900, 0.12);
      assert.ok(detected, `${target.pitch} at ${sampleRate}`);
      assert.equal(frame(createShooterPitchJudgmentState(), target, 0, detected).accepted, true, target.pitch);
    }
  }
});

test("every semitone in the shooter range accepts one confident attack with cents tolerance", () => {
  for (let midi = 40; midi <= 81; midi += 1) {
    for (const cents of [-40, 0, 40]) {
      const target = targetFor(midi);
      assert.equal(frame(createShooterPitchJudgmentState(), target, 0, {
        frequency: target.frequency * 2 ** (cents / 1200),
      }).accepted, true, `${target.pitch} ${cents} cents`);
    }
    for (const semitones of [-12, -1, 1, 12]) {
      assert.equal(frame(createShooterPitchJudgmentState(), targetFor(midi), 0, {
        frequency: midiToFrequency(midi + semitones),
      }).accepted, false);
    }
  }
});

test("E4 has identical judgment for string 1 fret 0, string 2 fret 5, and string 3 fret 9", () => {
  for (const [stringNumber, fretNumber] of [[1, 0], [2, 5], [3, 9]]) {
    const target = { ...targetFor(64), stringNumber, fretNumber };
    assert.equal(frame(createShooterPitchJudgmentState(), target, 0).accepted, true);
  }
});

test("a repeated note's noisy attack survives until its pitch is available without a second pick", () => {
  for (let midi = 40; midi <= 81; midi += 1) {
    const state = createShooterPitchJudgmentState();
    assert.equal(frame(state, targetFor(midi, "first"), 0).accepted, true);
    assert.equal(frame(state, targetFor(midi, "next"), 100, { rms: 0.04, confidence: 0.1, frequency: null }).accepted, false);
    assert.equal(frame(state, targetFor(midi, "next"), 134, { rms: 0.03 }).accepted, true);
    assert.equal(frame(state, targetFor(midi, "third"), 168, { rms: 0.029 }).accepted, false);
  }
});

test("note-on is captured between pitch analysis frames and retained through a target transition", () => {
  const state = createShooterPitchJudgmentState();
  const first = targetFor(64, 1);
  assert.equal(frame(state, first, 0).accepted, true);
  const id = observeShooterNoteOn(state.noteOn, { now: 100, rms: 0.05, signalPresent: true });
  observeShooterNoteOn(state.noteOn, { now: 116, rms: 0.04, signalPresent: true });
  frame(state, first, 120, { attackId: id, rms: 0.035 });
  assert.equal(frame(state, targetFor(64, 2), 134, { attackId: id, rms: 0.03 }).accepted, true);
});

test("hit deduplication commits only after the runtime has actually fired", () => {
  const state = createShooterPitchJudgmentState();
  const target = targetFor(64);
  assert.equal(frame(state, target, 0, { deferCommit: true }).accepted, true);
  const retry = frame(state, target, 34, { deferCommit: true });
  assert.equal(retry.accepted, true);
  commitShooterPitchHit(state, retry);
  assert.equal(frame(state, target, 68).accepted, false);
  assert.equal(frame(state, targetFor(64, "next"), 102).accepted, false);
});

test("moderate-confidence pitch uses two short frames while attack noise cannot accumulate", () => {
  const state = createShooterPitchJudgmentState();
  const target = targetFor(64);
  assert.equal(frame(state, target, 0, { confidence: 0.86 }).accepted, false);
  assert.equal(frame(state, target, 34, { confidence: 0.1 }).accepted, false);
  assert.equal(frame(state, target, 68, { confidence: 0.86 }).accepted, false);
  assert.equal(frame(state, target, 102, { confidence: 0.86 }).accepted, true);
});

test("enharmonic target names are compared by cents instead of spelling", () => {
  assert.equal(frame(createShooterPitchJudgmentState(), { id: 1, pitch: "Bb3", frequency: undefined }, 0, {
    frequency: midiToFrequency(58),
  }).accepted, true);
});

test("note-on debounce does not generate multiple events from an attack's rising envelope", () => {
  const state = createShooterNoteOnState();
  assert.equal(observeShooterNoteOn(state, { now: 0, rms: 0.02, signalPresent: true }), 1);
  assert.equal(observeShooterNoteOn(state, { now: 16, rms: 0.04, signalPresent: true }), 1);
  assert.equal(observeShooterNoteOn(state, { now: 32, rms: 0.08, signalPresent: true }), 1);
});

test("runtime preserves attacks across target changes and removes the legacy same-note cooldown", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const targetSwitch = source.slice(source.indexOf("const syncShooterActiveTarget"), source.indexOf("const completeShooterScenarioSegment"));
  assert.doesNotMatch(targetSwitch, /resetShooterPitchJudgmentState/);
  assert.doesNotMatch(source, /lastShotRef|shooterReleaseLockRef/);
  const mic = source.slice(source.indexOf("const readMicrophone"), source.indexOf("const runGameFrame"));
  assert.ok(mic.indexOf("observeShooterNoteOn") < mic.indexOf("MIC_ANALYSIS_INTERVAL_MS"));
  assert.match(mic, /if \(judgeShooterNote\(currentTargetPitch, currentTarget.id\)\)\s*\{\s*commitShooterPitchHit/);
});
