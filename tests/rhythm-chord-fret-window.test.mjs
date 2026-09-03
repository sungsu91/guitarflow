import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  HIGH_CHORD_FRET_MARGIN,
  getChordFretWindow,
} from "../src/fretboard/chordFretWindow.js";

function makeNotes(frets) {
  return frets.map((fretNumber, index) => ({
    fretNumber,
    stringNumber: 6 - index,
  }));
}

test("high chords keep exactly one empty fret before and after the played range", () => {
  assert.equal(HIGH_CHORD_FRET_MARGIN, 1);
  assert.deepEqual(getChordFretWindow({ notes: makeNotes([7, 9, 7, 7, 7, 7]) }).displayFrets, [6, 7, 8, 9, 10]);
  assert.deepEqual(getChordFretWindow({ notes: makeNotes([5, 7, 5, 5, 5, 5]) }).displayFrets, [4, 5, 6, 7, 8]);
  assert.deepEqual(getChordFretWindow({ notes: makeNotes([3, 5, 3, 4, 3, 3]) }).displayFrets, [2, 3, 4, 5, 6]);
  assert.deepEqual(getChordFretWindow({ notes: makeNotes([7, 10, 8]) }).displayFrets, [6, 7, 8, 9, 10, 11]);
});

test("muted and open strings do not become the high-chord start fret", () => {
  const rootOnFifth = getChordFretWindow({
    notes: makeNotes([7, 9, 7, 8, 7]),
    stringStates: { 6: "x" },
  });
  assert.deepEqual(rootOnFifth.fretRange, [6, 10]);

  const openChord = getChordFretWindow({
    notes: makeNotes([0, 2, 2, 1, 0]),
    stringStates: { 1: "o", 6: "x" },
  });
  assert.equal(openChord.isHighChord, false);
  assert.deepEqual(openChord.fretRange, [0, 3]);
  assert.deepEqual(openChord.displayFrets, [1, 2, 3]);
});

test("only a real open string keeps the nut view", () => {
  const closedLowPosition = getChordFretWindow({
    notes: makeNotes([1, 3, 3, 2, 1, 1]),
  });
  assert.equal(closedLowPosition.isHighChord, true);
  assert.deepEqual(closedLowPosition.fretRange, [1, 4]);
  assert.deepEqual(closedLowPosition.displayFrets, [1, 2, 3, 4]);
});

test("the same start fret reuses a stable memoized window", () => {
  const bm7 = getChordFretWindow({ notes: makeNotes([7, 9, 7, 7, 7, 7]) });
  const em7 = getChordFretWindow({ notes: makeNotes([7, 9, 7, 8, 7]), stringStates: { 6: "x" } });
  const am7 = getChordFretWindow({ notes: makeNotes([5, 7, 5, 5, 5, 5]) });

  assert.strictEqual(bm7, em7);
  assert.strictEqual(bm7.fretRange, em7.fretRange);
  assert.notStrictEqual(bm7, am7);
});

test("rhythm transition uses the pure window helper without coupling to the viewer route", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const viewStart = appSource.indexOf("const chordPracticeFretboardView = useMemo");
  const viewEnd = appSource.indexOf("const getPlayableCategory", viewStart);
  const viewSource = appSource.slice(viewStart, viewEnd);

  assert.match(viewSource, /getChordFretWindow\(\{/);
  assert.match(viewSource, /isStage3VoicingMovementItem\(loadedStage3LibraryItem\)[\s\S]*\? \[0, 3\][\s\S]*: chordPracticeCurrent\.visibleFrets/);
  assert.doesNotMatch(viewSource, /FRETBOARD_VIEWER|setAppMode|navigate|route/i);
});
