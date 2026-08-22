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
  disconnect() {
    this.connections = [];
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
    mediaGraph.disconnect();
    assert.equal(mediaGraph.connected, false);
    assert.equal(mediaGraph.programGain.connections.length, 0);
    const reconnectedGraph = connectMediaElementToBus(element, { level: 0.5 });
    assert.equal(reconnectedGraph, mediaGraph);
    assert.equal(reconnectedGraph.connected, true);
    assert.equal(reconnectedGraph.programGain.gain.value, 0.5);
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

test("mobile and desktop Backing Loop layouts place one mini player above recording controls", async () => {
  const [componentSource, appSource, engineSource] = await Promise.all([
    readFile(new URL("../src/components/BackingLoop.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/audio/fretboardPreviewEngine.js", import.meta.url), "utf8"),
  ]);
  const mobile = componentSource.slice(componentSource.indexOf("function MobileBackingLoop({ controller })"), componentSource.indexOf("function DesktopBackingLoop({ controller })"));
  const desktop = componentSource.slice(componentSource.indexOf("function DesktopBackingLoop({ controller })"), componentSource.indexOf("export default function BackingLoop"));
  assert.ok(mobile.indexOf("MobileBackingLoopPlayer") < mobile.indexOf("BackingLoopMainControls"));
  assert.ok(desktop.indexOf("DesktopBackingLoopPlayer") < desktop.indexOf("BackingLoopMainControls"));
  assert.doesNotMatch(mobile, /BackingLoopHeader/);
  assert.doesNotMatch(desktop, /BackingLoopHeader/);
  assert.match(componentSource, /function MobileBackingLoopPlayer[\s\S]*?BackingLoopTrackInfo[\s\S]*?BackingLoopProgress[\s\S]*?BackingLoopPlayerBar/);
  assert.match(componentSource, /backingLoopMainControls--mobile[\s\S]*?REC[\s\S]*?EDIT[\s\S]*?DEL[\s\S]*?SAVE/);
  assert.doesNotMatch(componentSource, /BackingLoopStorageControls/);
  assert.doesNotMatch(mobile, />LOAD</);
  assert.doesNotMatch(mobile, />IMPORT</);
  assert.doesNotMatch(componentSource, /backingLoopScrew/);
  assert.match(appSource, /getAudioBusInput\(AUDIO_BUS_IDS\.SFX, audio\)/);
  assert.match(appSource, /groupLimit = \{ gameover: 1, hit: 6, "mimic-hit": 5, miss: 2, spawn: 3 \}/);
  assert.match(engineSource, /AUDIO_BUS_IDS\.INSTRUMENT/);
});

test("mobile Backing Loop volume opens as a vertical overlay above its icon", async () => {
  const polishCss = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");

  assert.match(polishCss, /grid-template-rows: 94px 45px !important/);
  assert.match(polishCss, /height: 157px !important/);
  assert.match(
    polishCss,
    /\.backingLoopPanel--mobile \.backingLoopVolumePopover \{[\s\S]*?bottom: calc\(100% \+ 9px\) !important;[\s\S]*?height: 108px !important;/,
  );
  assert.match(
    polishCss,
    /\.backingLoopPanel--mobile \.backingLoopVolumeSlider input \{[\s\S]*?height: 72px !important;[\s\S]*?writing-mode: vertical-lr !important;/,
  );
  assert.match(
    polishCss,
    /\.backingLoopVolumeMenu\[data-open="true"\] \.backingLoopVolumePopover/,
  );
});
