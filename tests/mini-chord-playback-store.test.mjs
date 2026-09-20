import assert from "node:assert/strict";
import test from "node:test";
import { createMiniChordPlaybackStore } from "../src/mini-chord/playbackStore.js";

test("playback publishes only slot changes and keeps seek, loop, and stop atomic", () => {
  const store = createMiniChordPlaybackStore();
  const updates = [];
  const unsubscribe = store.subscribe(() => updates.push(store.getSnapshot()));
  store.setPosition({ barIndex: 0, slotIndex: 0 });
  const first = store.getSnapshot();
  for (let frame = 0; frame < 60; frame++) store.setPosition({ barIndex: 0, slotIndex: 0 });
  assert.equal(store.getSnapshot(), first);
  assert.equal(updates.length, 1);
  store.setPosition({ barIndex: 7, slotIndex: 28 });
  store.setPosition({ barIndex: 0, slotIndex: 0 });
  store.setPosition();
  assert.deepEqual(updates, [first, { barIndex: 7, slotIndex: 28 }, first, { barIndex: null, slotIndex: null }]);
  unsubscribe();
  store.setPosition({ barIndex: 1, slotIndex: 4 });
  assert.equal(updates.length, 4);
});
