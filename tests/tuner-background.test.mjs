import assert from "node:assert/strict";
import test from "node:test";
import { getTunerBackgroundSwipeOffset } from "../src/tuner/tunerBackground.js";

test("tuner background follows deliberate horizontal swipes across open space", () => {
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "center", deltaX: -90, deltaY: 8 }), 1);
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "center", deltaX: 90, deltaY: -5 }), -1);
});

test("tuner edge swipes change maps only when dragged inward", () => {
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "left", deltaX: 64, deltaY: 4 }), -1);
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "left", deltaX: -64, deltaY: 4 }), 0);
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "right", deltaX: -64, deltaY: 4 }), 1);
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "right", deltaX: 64, deltaY: 4 }), 0);
});

test("short or mostly vertical gestures do not change the tuner background", () => {
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "center", deltaX: 60, deltaY: 2 }), 0);
  assert.equal(getTunerBackgroundSwipeOffset({ edge: "right", deltaX: -80, deltaY: 70 }), 0);
});
