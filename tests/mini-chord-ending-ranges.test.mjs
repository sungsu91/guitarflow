import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMiniChordEndingRangesToBarMarks,
  getMiniChordEndingRangesFromBarMarks,
  normalizeMiniChordEndingRanges,
  stripMiniChordEndingsFromBarMarks,
  toggleMiniChordEndingRange,
} from "../src/mini-chord/endingRanges.js";

test("legacy per-bar ending numbers migrate to connected ranges", () => {
  const ranges = getMiniChordEndingRangesFromBarMarks({
    0: { endings: [1] },
    1: { endings: [1] },
    2: { endings: [2] },
    3: { endings: [2] },
  }, 4);

  assert.deepEqual(ranges, [
    { endingNumber: 1, startBar: 0, endBar: 1 },
    { endingNumber: 2, startBar: 2, endBar: 3 },
  ]);
});

test("adjacent selections extend one ending range without duplicate numbers", () => {
  let ranges = toggleMiniChordEndingRange([], 0, 1, 8);
  ranges = toggleMiniChordEndingRange(ranges, 1, 1, 8);
  ranges = toggleMiniChordEndingRange(ranges, 2, 1, 8);

  assert.deepEqual(ranges, [{ endingNumber: 1, startBar: 0, endBar: 2 }]);

  ranges = toggleMiniChordEndingRange(ranges, 6, 1, 8);
  assert.deepEqual(ranges, [{ endingNumber: 1, startBar: 6, endBar: 6 }]);
});

test("different endings remain independent and one bar cannot belong to both", () => {
  const ranges = normalizeMiniChordEndingRanges([
    { endingNumber: 1, startBar: 0, endBar: 2 },
    { endingNumber: 2, startBar: 2, endBar: 3 },
  ], 4);

  assert.deepEqual(ranges, [
    { endingNumber: 1, startBar: 0, endBar: 1 },
    { endingNumber: 2, startBar: 2, endBar: 3 },
  ]);
});

test("playback marks are derived without polluting canonical navigation marks", () => {
  const canonicalMarks = stripMiniChordEndingsFromBarMarks({
    0: { repeatStart: true, endings: [1] },
    2: { marker: "fine" },
    3: { repeatEnd: true },
  });
  const playbackMarks = applyMiniChordEndingRangesToBarMarks(canonicalMarks, [
    { endingNumber: 1, startBar: 1, endBar: 2 },
  ], 4);

  assert.deepEqual(canonicalMarks, {
    0: { repeatStart: true },
    2: { marker: "fine" },
    3: { repeatEnd: true },
  });
  assert.deepEqual(playbackMarks, {
    0: { repeatStart: true },
    1: { endings: [1] },
    2: { marker: "fine", endings: [1] },
    3: { repeatEnd: true },
  });
});
