import test from "node:test";
import assert from "node:assert/strict";
import {
  MINI_CHORD_MAX_BARS,
  getMiniChordPageIndexForBar,
  getMiniChordPageWindow,
  getMiniChordSwipePageDelta,
  normalizeMiniChordBarCount,
} from "../src/mini-chord/pagination.js";

test("mini chord bar count extends beyond 32 while keeping a practical upper bound", () => {
  assert.equal(normalizeMiniChordBarCount(33), 33);
  assert.equal(normalizeMiniChordBarCount(64), 64);
  assert.equal(normalizeMiniChordBarCount(MINI_CHORD_MAX_BARS + 20), MINI_CHORD_MAX_BARS);
});

test("mini chord pages expose 32 bars and clamp the requested page", () => {
  assert.deepEqual(getMiniChordPageWindow(33, 0), {
    pageCount: 2,
    pageIndex: 0,
    startBarIndex: 0,
    endBarIndex: 31,
    startBarNumber: 1,
    endBarNumber: 32,
  });
  assert.deepEqual(getMiniChordPageWindow(33, 1), {
    pageCount: 2,
    pageIndex: 1,
    startBarIndex: 32,
    endBarIndex: 32,
    startBarNumber: 33,
    endBarNumber: 33,
  });
  assert.equal(getMiniChordPageWindow(70, 99).pageIndex, 2);
});

test("mini chord bar indexes resolve to their 32-bar page", () => {
  assert.equal(getMiniChordPageIndexForBar(0), 0);
  assert.equal(getMiniChordPageIndexForBar(31), 0);
  assert.equal(getMiniChordPageIndexForBar(32), 1);
  assert.equal(getMiniChordPageIndexForBar(255), 7);
});

test("mini chord horizontal swipes change pages without stealing vertical scroll", () => {
  assert.equal(getMiniChordSwipePageDelta(-90, 8), 1);
  assert.equal(getMiniChordSwipePageDelta(90, 8), -1);
  assert.equal(getMiniChordSwipePageDelta(-35, 2), 0);
  assert.equal(getMiniChordSwipePageDelta(-80, 90), 0);
});
