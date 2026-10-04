import assert from "node:assert/strict";
import test from "node:test";
import {
  SHOOTER_VOICE_NOTES, SHOOTER_VOICE_STABLE_MS, SHOOTER_VOICE_TOLERANCE_CENTS,
  pickShooterVoiceNote, getShooterVoiceNoteLabel, getShooterInputSource,
  createShooterVoiceJudgmentState, observeShooterVoiceFrame, commitShooterVoiceHit,
  resetShooterVoiceJudgmentState, detectShooterVoicePitch,
} from "../src/shooter/voiceMode.js";
import { centsBetween, getRms, midiToFrequency } from "../src/tuner/tunerMath.js";
import { acquireMicInput } from "../src/audio/micInputEngine.js";
import { readShooterSignalFrame, isShooterPitchSignalPresent } from "../src/shooter/microphoneSignal.js";

function tone(frequency, sampleRate, now, amplitude = 0.08, harmonics = false) {
  return Float32Array.from({ length: 2048 }, (_, index) => {
    const phase = 2 * Math.PI * frequency * (index / sampleRate + now / 1000);
    return amplitude * (Math.sin(phase) + (harmonics ? 0.6 * Math.sin(2 * phase) + 0.3 * Math.sin(3 * phase) : 0));
  });
}

function series(target, { frequency = target.frequency, cents = () => 0, times = [0, 34, 68, 102, 136, 170, 204, 238], state = createShooterVoiceJudgmentState(), sampleRate = 48000, amplitude = 0.08, harmonics = false } = {}) {
  return times.map(now => {
    const detected = detectShooterVoicePitch(tone(frequency * 2 ** (cents(now) / 1200), sampleRate, now, amplitude, harmonics), sampleRate);
    return observeShooterVoiceFrame(state, { ...detected, now, target });
  });
}

test("voice contains exactly eight natural absolute pitches and samples all eight uniformly without stages", () => {
  assert.deepEqual(SHOOTER_VOICE_NOTES.map(note => note.pitch), ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]);
  assert.deepEqual(SHOOTER_VOICE_NOTES.map(note => note.midi), [60, 62, 64, 65, 67, 69, 71, 72]);
  SHOOTER_VOICE_NOTES.forEach((note, index) => {
    assert.equal(pickShooterVoiceNote(() => (index + 0.5) / 8), note);
    assert.equal(note.frequency, midiToFrequency(note.midi));
    assert.equal(note.stringNumber, undefined);
    assert.equal(note.fretNumber, undefined);
  });
  assert.equal(getShooterVoiceNoteLabel("C4", true), "도");
  assert.equal(getShooterVoiceNoteLabel("C5", true), "높은 도");
  assert.equal(getShooterVoiceNoteLabel("C5", false), "C5");
  const selection = { shooterSource: "midi" };
  assert.equal(getShooterInputSource("voice", selection), "audio");
  assert.equal(getShooterInputSource("easy", selection), "midi");
  assert.equal(selection.shooterSource, "midi");
});

test("real C4–C5 PCM test tones pass YIN and hit only after sustained stabilization", () => {
  for (const sampleRate of [44100, 48000]) for (const target of SHOOTER_VOICE_NOTES) {
    for (const amplitude of [0.008, 0.08, 0.3]) for (const harmonics of [false, true]) {
      const results = series(target, { sampleRate, amplitude, harmonics });
      assert.ok(results.slice(0, 6).every(result => !result.accepted), `${target.pitch} must not hit instantly`);
      const hits = results.filter(result => result.accepted);
      assert.equal(hits.length, 1, `${target.pitch} @ ${sampleRate}/${amplitude}/${harmonics}`);
      assert.ok(hits[0].stableMs >= SHOOTER_VOICE_STABLE_MS);
      assert.ok(Math.abs(hits[0].cents) < 3);
    }
  }
});

test("all off-target notes, sharps/flats and adjacent octaves are rejected through YIN", () => {
  for (const target of SHOOTER_VOICE_NOTES) {
    for (const midi of [target.midi - 12, target.midi + 12, target.midi - 1, target.midi + 1]) {
      for (const sampleRate of [44100, 48000]) {
        assert.ok(series(target, { frequency: midiToFrequency(midi), sampleRate }).every(result => !result.accepted), `${target.pitch} must reject MIDI ${midi}`);
      }
    }
    for (const other of SHOOTER_VOICE_NOTES.filter(note => note !== target)) {
      assert.ok(series(target, { frequency: other.frequency }).every(result => !result.accepted), `${target.pitch} must reject ${other.pitch}`);
    }
  }
});

test("vibrato and moderate detuning are accepted; the cents boundary is enforced", () => {
  for (const target of SHOOTER_VOICE_NOTES) {
    assert.ok(series(target, { cents: now => 30 * Math.sin(2 * Math.PI * 5 * now / 1000), harmonics: true }).some(result => result.accepted));
    for (const cents of [-40, 40]) assert.ok(series(target, { cents: () => cents }).some(result => result.accepted));
    for (const cents of [-55, 55]) assert.ok(series(target, { cents: () => cents }).every(result => !result.accepted));
    for (const offset of [-SHOOTER_VOICE_TOLERANCE_CENTS - 0.01, SHOOTER_VOICE_TOLERANCE_CENTS + 0.01]) {
      assert.equal(observeShooterVoiceFrame(createShooterVoiceJudgmentState(), { target, now: 0, confidence: 1, frequency: target.frequency * 2 ** (offset / 1200) }).reason, "wrong-pitch");
    }
  }
});

test("short attacks, gaps, low confidence and pitch excursions cannot accumulate a hit", () => {
  const target = SHOOTER_VOICE_NOTES[0];
  const base = { target, frequency: target.frequency, confidence: 1 };
  for (const interruption of [{ signalPresent: false }, { confidence: 0.5 }, { frequency: null }, { frequency: target.frequency * 2 }, { target: null }]) {
    const state = createShooterVoiceJudgmentState();
    for (const now of [0, 34, 68, 102, 136]) assert.equal(observeShooterVoiceFrame(state, { ...base, now }).accepted, false);
    assert.equal(observeShooterVoiceFrame(state, { ...base, now: 170, ...interruption }).accepted, false);
    assert.equal(observeShooterVoiceFrame(state, { ...base, now: 204 }).accepted, false);
  }
  assert.ok(series(target, { times: [0, 300, 600, 900, 1200] }).every(result => !result.accepted));
  assert.equal(series(target, { times: [0, 132, 264, 396] }).filter(result => result.accepted).length, 1, "slow frames still require four consecutive matching observations");
  const state = createShooterVoiceJudgmentState();
  for (let index = 0; index < 20; index++) assert.equal(observeShooterVoiceFrame(state, { ...base, now: 0 }).accepted, false);
});

test("each target stabilizes independently, commit deduplicates hits, and reset clears locks", () => {
  const state = createShooterVoiceJudgmentState();
  const target = { ...SHOOTER_VOICE_NOTES[0], id: 1 };
  const base = { target, frequency: target.frequency, confidence: 1, deferCommit: true };
  let result;
  for (const now of [0, 34, 68, 102, 136, 170, 204]) result = observeShooterVoiceFrame(state, { ...base, now });
  assert.equal(result.accepted, true);
  assert.equal(observeShooterVoiceFrame(state, { ...base, now: 238 }).accepted, true, "failed projectile may retry");
  commitShooterVoiceHit(state, result);
  assert.equal(observeShooterVoiceFrame(state, { ...base, now: 272 }).reason, "target-lock");
  assert.equal(observeShooterVoiceFrame(state, { ...base, target: { ...target, id: 2 }, now: 306 }).accepted, false);
  resetShooterVoiceJudgmentState(state);
  assert.deepEqual(state, createShooterVoiceJudgmentState());
  assert.equal(series(target, { state }).filter(result => result.accepted).length, 1);
});

test("a sustained wrong note remains acoustic signal without building a hit candidate", () => {
  const state = createShooterVoiceJudgmentState();
  const target = SHOOTER_VOICE_NOTES[0];
  for (const now of [0, 34, 68, 102, 136, 170, 204]) {
    const result = observeShooterVoiceFrame(state, { now, target, frequency: target.frequency * 2, confidence: 0.99 });
    assert.equal(result.reason, "wrong-pitch");
    assert.equal(state.signalPresent, true, "keep adaptive noise-floor learning frozen for a sung tone");
    assert.equal(state.frames, 0);
  }
  observeShooterVoiceFrame(state, { now: 238, signalPresent: false });
  assert.equal(state.signalPresent, false);
});

test("shared microphone calibration, gates and release work for voice PCM on both sample rates", async () => {
  const previousWindow = globalThis.window;
  for (const sampleRate of [44100, 48000]) {
    let samples = new Float32Array(2048).fill(0.0001);
    let stopped = 0, disconnected = 0;
    const node = () => ({ connect() {}, disconnect() { disconnected++; }, gain: { value: 0 }, frequency: { value: 0 }, Q: { value: 0 } });
    globalThis.window = { AudioContext: class {
      sampleRate = sampleRate; state = "running"; destination = node();
      createMediaStreamSource() { return node(); }
      createBiquadFilter() { return node(); }
      createGain() { return node(); }
      createAnalyser() { return { ...node(), frequencyBinCount: 1024, getFloatTimeDomainData(buffer) { buffer.set(samples); } }; }
      async close() { this.state = "closed"; }
    } };
    let session;
    try {
      session = await acquireMicInput({ mediaDevices: { async getUserMedia() { return { getTracks: () => [{ stop() { stopped++; } }] }; } } });
      const start = performance.now();
      for (let elapsed = 0; elapsed <= 750; elapsed += 34) session.readDetectionFrame(start + elapsed);
      const state = createShooterVoiceJudgmentState();
      // Quiet singing on the wrong octave must not be learned as background noise.
      for (let frame = 0; frame < 160; frame++) {
        const now = start + 800 + frame * 34;
        samples = tone(SHOOTER_VOICE_NOTES[0].frequency / 2, sampleRate, now, 0.01);
        const signal = readShooterSignalFrame(session, now, state.signalPresent, getRms(samples), 0.0038);
        const detected = signal.canAnalyzePitch ? detectShooterVoicePitch(samples, sampleRate) : null;
        const result = observeShooterVoiceFrame(state, { ...detected, now, target: SHOOTER_VOICE_NOTES[0], signalPresent: isShooterPitchSignalPresent(signal, detected?.confidence) });
        assert.equal(result.accepted, false);
        assert.equal(state.signalPresent, true);
      }
      for (const [index, note] of SHOOTER_VOICE_NOTES.entries()) {
        const results = [];
        for (let frame = 0; frame < 10; frame++) {
          const now = start + 800 + (160 + index * 10 + frame) * 34;
          samples = tone(note.frequency, sampleRate, now, 0.04, true);
          const signal = readShooterSignalFrame(session, now, state.signalPresent, getRms(samples), 0.0038);
          const detected = signal.canAnalyzePitch ? detectShooterVoicePitch(samples, sampleRate) : null;
          if (detected) assert.ok(Math.abs(centsBetween(detected.frequency, note.frequency)) < 3);
          results.push(observeShooterVoiceFrame(state, { ...detected, now, target: { ...note, id: index }, signalPresent: isShooterPitchSignalPresent(signal, detected?.confidence) }));
        }
        assert.equal(results.filter(result => result.accepted).length, 1, note.pitch);
      }
      const context = session.audioContext;
      await session.release();
      assert.equal(stopped, 1);
      assert.equal(context.state, "closed");
      assert.ok(disconnected > 0);
      await session.release();
      assert.equal(stopped, 1);
    } finally {
      await session?.release();
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  }
});
