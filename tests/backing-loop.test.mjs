import test from "node:test";
import assert from "node:assert/strict";
import {
  createBackingLoopId,
  formatBackingLoopTime,
  getBackingLoopStatus,
  getPreferredBackingLoopMimeType,
  normalizeBackingLoopTitle,
} from "../src/backing-loop/backingLoopUtils.js";
import {
  applyEdgeFades,
  buildWaveformPeaks,
  calculatePeakNormalizationGain,
  clampTrimRange,
  encodeMonoPcmWav,
  trimLoopAudioData,
} from "../src/audio/audioPostProcessing.js";
import {
  acquireMicInput,
  buildMicrophoneConstraints,
  releaseActiveMicInput,
} from "../src/audio/micInputEngine.js";
import { MIC_INPUT_PRESETS } from "../src/audio/micInputPresets.js";

test("backing loop timer keeps a stable minute and second shape", () => {
  assert.equal(formatBackingLoopTime(0), "00:00");
  assert.equal(formatBackingLoopTime(8_900), "00:08");
  assert.equal(formatBackingLoopTime(68_000), "01:08");
  assert.equal(formatBackingLoopTime(-1), "00:00");
});

test("backing loop title is compact, trimmed, and safe for one-line display", () => {
  assert.equal(normalizeBackingLoopTitle("  Am    Practice  "), "Am Practice");
  assert.equal(normalizeBackingLoopTitle(" "), "");
  assert.equal(normalizeBackingLoopTitle("x".repeat(60)).length, 40);
});

test("backing loop creates stable ids with the browser crypto API when available", () => {
  assert.equal(createBackingLoopId({ randomUUID: () => "loop-id" }), "loop-id");
});

test("backing loop chooses the first supported recording format", () => {
  const supported = new Set(["audio/mp4", "audio/webm"]);
  const MediaRecorderApi = { isTypeSupported: (mimeType) => supported.has(mimeType) };
  assert.equal(getPreferredBackingLoopMimeType(MediaRecorderApi), "audio/mp4");
  assert.equal(getPreferredBackingLoopMimeType(null), "");
});

test("backing loop status describes empty, recording, playback, pause, and ready states", () => {
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 0, hasRecording: false, phase: "idle" }),
    { label: "EMPTY", tone: "empty" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ phase: "armed" }),
    { label: "ARM", tone: "recording" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 8_000, phase: "recording" }),
    { label: "REC 00:08", tone: "recording" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 8_000, hasRecording: true, phase: "playing" }),
    { label: "PLAY 00:08", tone: "playing" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 8_000, hasRecording: true, phase: "paused" }),
    { label: "PAUSED 00:08", tone: "paused" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 0, hasRecording: true, phase: "idle" }),
    { label: "READY 00:00", tone: "ready" },
  );
});

test("microphone constraints disable voice-call processing only when supported", () => {
  const constraints = buildMicrophoneConstraints({
    getSupportedConstraints: () => ({
      autoGainControl: true,
      channelCount: true,
      echoCancellation: true,
      noiseSuppression: false,
    }),
  });
  assert.equal(constraints.audio.echoCancellation, false);
  assert.equal(constraints.audio.autoGainControl, false);
  assert.deepEqual(constraints.audio.channelCount, { ideal: 1 });
  assert.equal("noiseSuppression" in constraints.audio, false);
});

test("post processing raises quiet audio without boosting already loud audio", () => {
  const quietGain = calculatePeakNormalizationGain(0.1);
  assert.ok(quietGain > 1);
  assert.ok(quietGain <= 10 ** (12 / 20));
  assert.equal(calculatePeakNormalizationGain(0.95), 1);
});

test("post processing adds short edge fades and emits a valid wav blob", () => {
  const samples = new Float32Array(100).fill(0.5);
  applyEdgeFades(samples, 1_000, 6);
  assert.equal(samples[0], 0);
  assert.equal(samples.at(-1), 0);
  assert.equal(samples[20], 0.5);
  const wav = encodeMonoPcmWav(samples, 1_000);
  assert.equal(wav.type, "audio/wav");
  assert.equal(wav.size, 244);
});

test("trim ranges stay ordered and keep a touch-friendly minimum loop length", () => {
  assert.deepEqual(clampTrimRange(-50, 1_200, 1_000), {
    startMs: 0,
    endMs: 1_000,
    lengthMs: 1_000,
  });
  assert.deepEqual(clampTrimRange(850, 900, 1_000), {
    startMs: 600,
    endMs: 900,
    lengthMs: 300,
  });
});

test("waveform peaks are compact and normalized without changing source samples", () => {
  const samples = new Float32Array([0, 0.1, -0.4, 0.2, 0.8, -0.2, 0.1, 0]);
  const before = Array.from(samples);
  const peaks = buildWaveformPeaks({ channels: [samples], length: samples.length, sampleRate: 4_000 }, 4);
  assert.equal(peaks.length, 4);
  assert.equal(Math.max(...peaks), 1);
  assert.deepEqual(Array.from(samples), before);
});

test("trim processing copies the selected samples, preserves the source, and fades loop edges", () => {
  const samples = new Float32Array(2_000).fill(0.25);
  const before = Array.from(samples);
  const trimmed = trimLoopAudioData({
    channels: [samples],
    durationMs: 2_000,
    length: samples.length,
    sampleRate: 1_000,
  }, 500, 1_500);
  assert.equal(trimmed.startSample, 500);
  assert.equal(trimmed.endSample, 1_500);
  assert.equal(trimmed.durationMs, 1_000);
  assert.equal(trimmed.audioData.channels[0][0], 0);
  assert.equal(trimmed.audioData.channels[0].at(-1), 0);
  assert.equal(trimmed.blob.type, "audio/wav");
  assert.equal(trimmed.blob.size, 2_044);
  assert.deepEqual(Array.from(samples), before);
});

test("shared mic engine builds separate recording and detection graphs and releases devices", async () => {
  class FakeNode {
    constructor() {
      this.connections = [];
      this.gain = { value: 1 };
    }
    connect(node) {
      this.connections.push(node);
      return node;
    }
    disconnect() {
      this.connections = [];
    }
  }
  class FakeAnalyser extends FakeNode {
    constructor() {
      super();
      this.fftSize = 2048;
      this.frequencyBinCount = 1024;
      this.smoothingTimeConstant = 0;
    }
    getFloatTimeDomainData(buffer) {
      buffer.fill(0.01);
    }
    getFloatFrequencyData(buffer) {
      buffer.fill(-80);
    }
  }
  const stopped = [];
  const makeStream = (name) => ({
    getAudioTracks: () => [{ getSettings: () => ({ deviceId: name, sampleRate: 48_000 }) }],
    getTracks: () => [{ stop: () => stopped.push(name) }],
  });
  const createdContexts = [];
  class FakeAudioContext {
    constructor() {
      this.destination = new FakeNode();
      this.sampleRate = 48_000;
      this.state = "running";
      createdContexts.push(this);
    }
    createAnalyser() { return new FakeAnalyser(); }
    createBiquadFilter() {
      const node = new FakeNode();
      node.frequency = { value: 0 };
      node.Q = { value: 0 };
      return node;
    }
    createDynamicsCompressor() {
      const node = new FakeNode();
      node.attack = { value: 0 };
      node.knee = { value: 0 };
      node.ratio = { value: 0 };
      node.release = { value: 0 };
      node.threshold = { value: 0 };
      return node;
    }
    createGain() { return new FakeNode(); }
    createMediaStreamDestination() {
      const node = new FakeNode();
      node.stream = makeStream("processed");
      return node;
    }
    createMediaStreamSource() { return new FakeNode(); }
    async close() { this.state = "closed"; }
    async resume() { this.state = "running"; }
  }
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  let requestCount = 0;
  const mediaDevices = {
    getSupportedConstraints: () => ({
      autoGainControl: true,
      channelCount: true,
      echoCancellation: true,
      noiseSuppression: true,
    }),
    getUserMedia: async () => makeStream(`raw-${++requestCount}`),
  };

  try {
    const recorder = await acquireMicInput({
      consumerId: "test-recorder",
      mediaDevices,
      preset: MIC_INPUT_PRESETS.GUITAR_RECORDING,
    });
    assert.equal(recorder.preset, MIC_INPUT_PRESETS.GUITAR_RECORDING);
    assert.equal(recorder.trackSettings.sampleRate, 48_000);
    assert.notEqual(recorder.recordingStream, recorder.rawStream);
    assert.ok(recorder.analyser);

    const detector = await acquireMicInput({
      consumerId: "test-detector",
      mediaDevices,
      preset: MIC_INPUT_PRESETS.GUITAR_DETECTION,
    });
    assert.equal(detector.recordingStream, detector.rawStream);
    assert.ok(stopped.includes("raw-1"));
    assert.ok(stopped.includes("processed"));
    assert.equal(createdContexts[0].state, "closed");
    await detector.release();
    assert.ok(stopped.includes("raw-2"));
  } finally {
    await releaseActiveMicInput();
    globalThis.window = previousWindow;
  }
});
