import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AUDIO_BUS_IDS,
  connectMediaElementToBus,
  getAudioBusGraph,
  getAudioBusInput,
  getSharedAudioContext,
  resetSharedAudioForTests,
} from "../src/audio/audioBus.js";
import { processLoopRecording } from "../src/audio/audioPostProcessing.js";
import {
  getBackingVolumeSnapshot,
  resetBackingVolumeForTests,
  setBackingVolume,
  toggleBackingMute,
} from "../src/backing-loop/backingVolumeStore.js";

class FakeParam {
  constructor(value = 0) { this.value = value; }
  cancelAndHoldAtTime() {}
  cancelScheduledValues() {}
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
}

class FakeNode {
  constructor() {
    this.connections = [];
    this.gain = new FakeParam(1);
  }
  connect(node) {
    this.connections.push(node);
    return node;
  }
}

class FakeCompressor extends FakeNode {
  constructor() {
    super();
    this.attack = new FakeParam();
    this.knee = new FakeParam();
    this.ratio = new FakeParam();
    this.release = new FakeParam();
    this.threshold = new FakeParam();
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 2;
    this.destination = new FakeNode();
    this.state = "running";
  }
  createDynamicsCompressor() { return new FakeCompressor(); }
  createGain() { return new FakeNode(); }
  createMediaElementSource(element) {
    const source = new FakeNode();
    source.element = element;
    return source;
  }
  decodeAudioData(_arrayBuffer, complete) {
    const channels = [new Float32Array([0, 0.25, -0.5, 0]), new Float32Array([0, 0.1, -0.2, 0])];
    const buffer = {
      duration: 4 / 48_000,
      getChannelData: (channel) => channels[channel],
      length: 4,
      numberOfChannels: 2,
      sampleRate: 48_000,
    };
    queueMicrotask(() => complete?.(buffer));
    return Promise.resolve(buffer);
  }
}

test("shared audio graph creates one context and routes independent buses through a safety limiter", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  resetSharedAudioForTests();
  try {
    const first = getSharedAudioContext();
    const second = getSharedAudioContext();
    const graph = getAudioBusGraph(first);
    assert.equal(first, second);
    assert.notEqual(getAudioBusInput(AUDIO_BUS_IDS.BACKING, first), getAudioBusInput(AUDIO_BUS_IDS.SFX, first));
    assert.equal(graph.master.connections[0], graph.limiter);
    assert.equal(graph.limiter.connections[0], first.destination);
    assert.equal(graph.limiter.threshold.value, -2);
    assert.equal(graph.limiter.ratio.value, 20);

    const element = { volume: 1 };
    const mediaGraph = connectMediaElementToBus(element, { level: 0.64 });
    assert.equal(mediaGraph.programGain.gain.value, 0.64);
    assert.equal(mediaGraph.programGain.connections[0], graph.buses.backing);
    mediaGraph.setLevel(0.25);
    assert.equal(mediaGraph.programGain.gain.value, 0.25);
  } finally {
    resetSharedAudioForTests();
    globalThis.window = previousWindow;
  }
});

test("backing volume mute restores the last audible shared value", () => {
  const previousWindow = globalThis.window;
  const writes = [];
  globalThis.window = {
    localStorage: {
      getItem: () => null,
      setItem: (key, value) => writes.push([key, value]),
    },
  };
  resetBackingVolumeForTests();
  try {
    setBackingVolume(0.42);
    toggleBackingMute();
    assert.equal(getBackingVolumeSnapshot().volume, 0);
    toggleBackingMute();
    assert.equal(getBackingVolumeSnapshot().volume, 0.42);
    assert.ok(writes.length >= 3);
  } finally {
    resetBackingVolumeForTests();
    globalThis.window = previousWindow;
  }
});

test("recording analysis preserves the original encoded blob until the user trims it", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  resetSharedAudioForTests();
  try {
    const original = new Blob(["original-media-recorder-bytes"], { type: "audio/webm" });
    const analyzed = await processLoopRecording(original, 1_000);
    assert.equal(analyzed.blob, original);
    assert.equal(analyzed.mimeType, "audio/webm");
    assert.equal(analyzed.processed, false);
    assert.equal(analyzed.audioData.channels.length, 2);
    assert.equal(analyzed.normalizationGain, 1);
  } finally {
    resetSharedAudioForTests();
    globalThis.window = previousWindow;
  }
});

test("mobile and desktop Backing Loop layouts keep volume between media and transport controls", async () => {
  const [componentSource, appSource, engineSource] = await Promise.all([
    readFile(new URL("../src/components/BackingLoop.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio/fretboardPreviewEngine.js", import.meta.url), "utf8"),
  ]);
  const mobile = componentSource.slice(componentSource.indexOf("function MobileBackingLoop({ controller })"), componentSource.indexOf("function DesktopBackingLoop"));
  const desktop = componentSource.slice(componentSource.indexOf("function DesktopBackingLoop"), componentSource.indexOf("export default function BackingLoop"));
  assert.ok(mobile.indexOf("MobileBackingLoopDisplay") < mobile.indexOf("BackingLoopVolume"));
  assert.ok(mobile.indexOf("BackingLoopVolume") < mobile.indexOf("BackingLoopMainControls"));
  assert.ok(desktop.indexOf("BackingLoopProgress") < desktop.indexOf("BackingLoopVolume"));
  assert.ok(desktop.indexOf("BackingLoopVolume") < desktop.indexOf("BackingLoopMainControls"));
  assert.match(appSource, /getAudioBusInput\(AUDIO_BUS_IDS\.SFX, audio\)/);
  assert.match(appSource, /groupLimit = \{ gameover: 1, hit: 6, "mimic-hit": 5, miss: 2, spawn: 3 \}/);
  assert.match(engineSource, /AUDIO_BUS_IDS\.INSTRUMENT/);
});

test("mobile Backing Loop volume is skinned as part of the recorder chassis", async () => {
  const polishCss = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");

  assert.match(polishCss, /--backing-recorder-volume-well:/);
  assert.match(polishCss, /grid-template-rows: 20px minmax\(54px, 1fr\) 30px 36px 32px !important/);
  assert.match(
    polishCss,
    /\.backingLoopPanel--mobile \.backingLoopVolumeMute \{[\s\S]*?min-height: 24px !important;[\s\S]*?radial-gradient\(/,
  );
  assert.match(
    polishCss,
    /\.backingLoopPanel--mobile \.backingLoopVolumeSlider input \{[\s\S]*?background: transparent !important;[\s\S]*?-webkit-appearance: none !important;/,
  );
  assert.match(
    polishCss,
    /\.backingLoopPanel--mobile \.backingLoopVolumeValue \{[\s\S]*?var\(--backing-recorder-volume-display\)/,
  );
});
