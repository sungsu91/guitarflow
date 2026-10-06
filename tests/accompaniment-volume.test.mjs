import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOMPANIMENT_VOLUME_STORAGE_KEY,
  DEFAULT_ACCOMPANIMENT_VOLUME,
  getAccompanimentVolumeSnapshot,
  resetAccompanimentVolumeForTests,
  setAccompanimentVolume,
  subscribeAccompanimentVolume,
} from "../src/audio/accompanimentVolumeStore.js";
import { getGrooveVolumeSnapshot } from "../src/audio/grooveVolumeStore.js";
import { getMetronomeVolumeSnapshot } from "../src/audio/metronomeVolumeStore.js";

function withStorage(storage, run) {
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: storage };
  resetAccompanimentVolumeForTests();
  try { run(); } finally {
    resetAccompanimentVolumeForTests();
    globalThis.window = previousWindow;
  }
}

test("accompaniment master defaults to unity and restores saved boost or mute", () => {
  for (const [stored, expected] of [[null, 1], ["1.65", 1.65], ["0", 0], ["99", 2], ["-1", 0], ["invalid", 1], ["", 1], ["Infinity", 1]]) {
    withStorage({ getItem: () => stored }, () => {
      assert.equal(DEFAULT_ACCOMPANIMENT_VOLUME, 1);
      assert.equal(getAccompanimentVolumeSnapshot().volume, expected);
      assert.equal(getAccompanimentVolumeSnapshot(), getAccompanimentVolumeSnapshot());
    });
  }
});

test("master clamps, persists across initialization and notifies only changed values", () => {
  const storage = new Map();
  withStorage({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, () => {
    let notifications = 0;
    const unsubscribe = subscribeAccompanimentVolume(() => notifications++);
    for (const value of [1.5, 1.5, 4, -2]) setAccompanimentVolume(value);
    assert.equal(notifications, 3);
    assert.equal(storage.get(ACCOMPANIMENT_VOLUME_STORAGE_KEY), "0");
    assert.equal(getAccompanimentVolumeSnapshot().volume, 0);
    unsubscribe();
    setAccompanimentVolume(1.72);
    assert.equal(notifications, 3);
    resetAccompanimentVolumeForTests();
    assert.equal(getAccompanimentVolumeSnapshot().volume, 1.72);
    setAccompanimentVolume(DEFAULT_ACCOMPANIMENT_VOLUME);
    assert.equal(storage.get(ACCOMPANIMENT_VOLUME_STORAGE_KEY), "1");
  });
});

test("blocked browser storage still permits live changes without changing rhythm guide volumes", () => {
  const groove = getGrooveVolumeSnapshot();
  const metronome = getMetronomeVolumeSnapshot();
  withStorage({ getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } }, () => {
    let notifications = 0;
    const unsubscribe = subscribeAccompanimentVolume(() => notifications++);
    assert.equal(getAccompanimentVolumeSnapshot().volume, 1);
    setAccompanimentVolume(1.8);
    assert.equal(getAccompanimentVolumeSnapshot().volume, 1.8);
    assert.equal(notifications, 1);
    assert.equal(getGrooveVolumeSnapshot(), groove);
    assert.equal(getMetronomeVolumeSnapshot(), metronome);
    unsubscribe();
  });
});
