import assert from "node:assert/strict";
import test from "node:test";
import { acquireMicInput } from "../src/audio/micInputEngine.js";
import { readShooterSignalFrame } from "../src/shooter/microphoneSignal.js";
import { createShooterPitchJudgmentState, observeShooterPitchFrame } from "../src/shooter/pitchJudgment.js";
import { detectPitchYinDetailed, getRms, midiToFrequency } from "../src/tuner/tunerMath.js";
import { SHOOTER_EASY_SCENARIO } from "../src/shooter/easyDifficultyScenario.js";

test("real microphone gates and YIN accept 654321 when upper strings are quieter", async () => {
  const previousWindow = globalThis.window;
  let samples = new Float32Array(2048).fill(0.001);
  const node = () => ({ connect() {}, disconnect() {}, gain: { value: 0 }, frequency: { value: 0 }, Q: { value: 0 } });
  globalThis.window = { AudioContext: class {
    sampleRate = 48000;
    state = "running";
    destination = node();
    createMediaStreamSource() { return node(); }
    createBiquadFilter() { return node(); }
    createGain() { return node(); }
    createAnalyser() { return { ...node(), frequencyBinCount: 1024, getFloatTimeDomainData(buffer) { buffer.set(samples); } }; }
    async close() { this.state = "closed"; }
  } };
  let session;
  async function play(useReleaseTracking) {
    samples.fill(0.001);
    session = await acquireMicInput({ mediaDevices: { async getUserMedia() {
      return { getTracks: () => [{ stop() {} }] };
    } } });
    const start = performance.now();
    for (let elapsed = 0; elapsed < 750; elapsed += 34) session.readDetectionFrame(start + elapsed);
    const state = createShooterPitchJudgmentState();
    const hits = [];
    const amplitudes = [0.08, 0.07, 0.06, 0.009, 0.008, 0.007];
    for (const [index, step] of SHOOTER_EASY_SCENARIO.slice(0, 6).entries()) {
      const frequency = midiToFrequency(step.midi);
      const target = { id: index, pitch: step.label, frequency };
      let hit = false;
      for (let frame = 0; frame < 40; frame += 1) {
        const now = start + 800 + (index * 40 + frame) * 34;
        samples = Float32Array.from({ length: 2048 }, (_, i) => (
          amplitudes[index] * Math.sin(2 * Math.PI * frequency * (i / 48000 + frame * 0.034))
        ));
        const signal = useReleaseTracking
          ? readShooterSignalFrame(session, now, state.signalPresent, getRms(samples), 0.0038)
          : (() => { const frame = session.readDetectionFrame(now); return { rms: frame.rms, signalPresent: frame.isSignalPresent }; })();
        const result = signal.signalPresent ? detectPitchYinDetailed(samples, 48000, 75, 900, 0.12) : null;
        const judgment = observeShooterPitchFrame(state, { ...result, ...signal, now, target });
        hit ||= judgment.accepted;
      }
      hits.push(hit);
    }
    await session.release();
    return hits;
  }
  try {
    const before = await play(false);
    assert.deepEqual(before.slice(0, 3), [true, true, true]);
    assert.deepEqual(before.slice(3), [false, false, false], "reproduce the old high-string gate failure");
    assert.deepEqual(await play(true), [true, true, true, true, true, true]);
  } finally {
    await session?.release();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("a quiet tail can finish confirmation but room noise and calibration cannot acquire a note", () => {
  const frame = { rms: 0.003, isAttackPresent: false, isReleasePresent: true };
  const session = { readDetectionFrame: () => frame };
  assert.equal(readShooterSignalFrame(session, 0, false).signalPresent, false);
  assert.equal(readShooterSignalFrame(session, 0, true).signalPresent, true);
  frame.isCalibrating = true;
  assert.equal(readShooterSignalFrame(session, 0, true).signalPresent, false);
});

test("a pitch that settles after the old 210ms window can still hit once", () => {
  const state = createShooterPitchJudgmentState();
  const target = { id: "g", pitch: "G3", frequency: midiToFrequency(55) };
  observeShooterPitchFrame(state, { now: 0, rms: 0.08, target, confidence: 0, frequency: null });
  const results = [300, 334, 368, 402].map((now) => observeShooterPitchFrame(state, {
    now, rms: 0.01, target, confidence: 0.99, frequency: target.frequency,
  }));
  assert.deepEqual(results.map(({ accepted }) => accepted), [false, false, true, false]);
});

test("re-picking a repeated note without silence unlocks confirmation across subsequent frames", () => {
  const state = createShooterPitchJudgmentState();
  const target = { id: 1, pitch: "E4", frequency: midiToFrequency(64) };
  const frame = (now, rms, id) => observeShooterPitchFrame(state, {
    now, rms, target: { ...target, id }, confidence: 0.99, frequency: target.frequency,
  });
  assert.equal([0, 34, 68].map((now) => frame(now, 0.01, 1)).at(-1).accepted, true);
  assert.equal(frame(300, 0.02, 2).accepted, false);
  assert.equal(frame(334, 0.019, 2).accepted, false);
  assert.equal(frame(368, 0.018, 2).accepted, true);
});
