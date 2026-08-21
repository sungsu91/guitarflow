import assert from "node:assert/strict";
import test from "node:test";

import { getLoopFrameIndex } from "../src/shooter/maps/sharedSpriteClock.js";

test("shared shooter sprite clock wraps frames with playback speed", () => {
  assert.equal(getLoopFrameIndex(0, 4, 10), 0);
  assert.equal(getLoopFrameIndex(100, 4, 10), 1);
  assert.equal(getLoopFrameIndex(400, 4, 10), 0);
  assert.equal(getLoopFrameIndex(100, 4, 10, 2), 2);
});

test("shared shooter sprite clock applies stable per-object phase", () => {
  assert.equal(getLoopFrameIndex(0, 8, 8, 1, 0.25), 2);
  assert.equal(getLoopFrameIndex(750, 8, 8, 1, 0.25), 0);
  assert.equal(getLoopFrameIndex(0, 8, 8, 1, -0.25), 6);
});
