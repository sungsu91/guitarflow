import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  addChordFretboardBarre,
  addChordFretboardNote,
  createChordFretboardSnapshot,
  getChordFretboardMidiVoicing,
  getChordFretboardSignature,
  removeChordFretboardBarre,
  removeChordFretboardNote,
} from "../src/rhythm/chordFretboardState.js";

test("legacy chord positions reconstruct open strings without mutating the source", () => {
  const legacyPosition = {
    notes: [{ stringNumber: 5, fretNumber: 3, pitch: "wrong" }],
    stringStates: { 6: "x", 1: "o" },
    visibleFrets: [0, 3],
  };
  const snapshot = createChordFretboardSnapshot(legacyPosition, "C");

  assert.deepEqual(
    snapshot.notes.map(({ stringNumber, fretNumber, pitch }) => ({ stringNumber, fretNumber, pitch })),
    [
      { stringNumber: 5, fretNumber: 3, pitch: "C3" },
      { stringNumber: 1, fretNumber: 0, pitch: "E4" },
    ],
  );
  assert.deepEqual(snapshot.stringStates, { 2: "x", 3: "x", 4: "x", 6: "x" });
  assert.equal(legacyPosition.notes[0].pitch, "wrong");
  assert.equal(legacyPosition.notes.length, 1);
});

test("adding and deleting a position calculates pitch from string and fret", () => {
  const base = createChordFretboardSnapshot({ notes: [], visibleFrets: [0, 3] }, "F");
  const added = addChordFretboardNote(base, 2, 1, "F");
  const withOpen = addChordFretboardNote(added, 6, 0, "F");

  assert.equal(added.notes[0].pitch, "C4");
  assert.equal(withOpen.notes.find((note) => note.stringNumber === 6)?.pitch, "E2");
  assert.notEqual(withOpen, base);
  assert.equal(base.notes.length, 0);

  const deleted = removeChordFretboardNote(withOpen, 2, 1, "F");
  assert.equal(deleted.notes.some((note) => note.stringNumber === 2 && note.fretNumber === 1), false);
  assert.equal(deleted.stringStates[2], "x");

  const deletedOpen = removeChordFretboardNote(deleted, 6, 0, "F");
  assert.equal(deletedOpen.notes.some((note) => note.stringNumber === 6 && note.fretNumber === 0), false);
  assert.equal(deletedOpen.stringStates[6], "x");
});

test("saved fingering signature and playback voicing follow edited physical positions", () => {
  const first = createChordFretboardSnapshot({
    notes: [
      { stringNumber: 6, fretNumber: 1 },
      { stringNumber: 5, fretNumber: 3 },
      { stringNumber: 1, fretNumber: 1 },
    ],
  }, "F");
  const second = removeChordFretboardNote(first, 1, 1, "F");

  assert.notEqual(getChordFretboardSignature(first), getChordFretboardSignature(second));
  assert.deepEqual(getChordFretboardMidiVoicing(first), [41, 48, 65]);
  assert.deepEqual(getChordFretboardMidiVoicing(second), [41, 48]);
});

test("adding and deleting notes keeps the current fret window fixed", () => {
  const base = createChordFretboardSnapshot({
    notes: [{ stringNumber: 2, fretNumber: 8 }],
    visibleFrets: [7, 13],
  }, "F");
  const added = addChordFretboardNote(base, 3, 9, "F");
  const removed = removeChordFretboardNote(added, 2, 8, "F");

  assert.deepEqual(base.visibleFrets, [7, 13]);
  assert.deepEqual(added.visibleFrets, [7, 13]);
  assert.deepEqual(removed.visibleFrets, [7, 13]);
});

test("barres can be added and removed without mutating notes or the fret window", () => {
  const base = createChordFretboardSnapshot({
    notes: [
      { stringNumber: 1, fretNumber: 8 },
      { stringNumber: 3, fretNumber: 8 },
    ],
    visibleFrets: [7, 13],
  }, "C");
  const added = addChordFretboardBarre(base, 8, 1, 3, "C");
  const duplicateReverse = addChordFretboardBarre(added, 8, 3, 1, "C");
  const singleString = addChordFretboardBarre(added, 8, 2, 2, "C");

  assert.equal(base.barres.length, 0);
  assert.deepEqual(added.barres, [{ fret: 8, fromString: 1, toString: 3, label: "1" }]);
  assert.equal(duplicateReverse.barres.length, 1);
  assert.equal(singleString.barres.length, 1);
  assert.deepEqual(added.notes, base.notes);
  assert.deepEqual(added.visibleFrets, [7, 13]);

  const removed = removeChordFretboardBarre(added, 8, 3, 1, "C");
  assert.equal(removed.barres.length, 0);
  assert.deepEqual(removed.notes, base.notes);
  assert.deepEqual(removed.visibleFrets, [7, 13]);
});

test("rhythm storage binds its local editor snapshot to save, load and playback", async () => {
  const [appSource, fretboardSource, editorSource] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/Fretboard.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/EditableChordFretboard.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /fretboard: stage3StorageFretboardEditorRef\.current\?\.getSnapshot/);
  assert.match(appSource, /entry\?\.fretboard \? entry\.fretboard : fallbackFretboard/);
  assert.match(appSource, /fretboardSignature: getChordFretboardSignature\(fretboard\)/);
  assert.match(appSource, /applyStage3StorageChordSelection\("F", "natural", "major", "none"\)/);
  assert.match(appSource, /setStage3StorageChordIds\(\[\]\)/);
  assert.match(appSource, /getStage3StorageChordIdsWithActiveDraft/);
  assert.match(appSource, /getChordFretboardMidiVoicing\(chord\.fretboard\)/);
  assert.match(appSource, /beatLength: normalizeRhythmChordBeatLength\(beatLength\)/);
  assert.match(appSource, /rhythmChordTimeline: rhythmChordPlayback\.timeline/);
  assert.match(fretboardSource, /data-fretboard-delete-target/);
  assert.match(fretboardSource, /onEmptyPositionPress/);
  assert.match(fretboardSource, /onBarreCreate/);
  assert.match(fretboardSource, /fretboardBarre--preview/);
  assert.match(fretboardSource, /setPointerCapture/);
  assert.match(fretboardSource, /BARRE_LONG_PRESS_MS/);
  assert.match(fretboardSource, /document\.removeEventListener\("pointerdown", closeDeleteMenu\)/);
  assert.ok(
    fretboardSource.lastIndexOf('className="fretboardBarreDeleteButton"')
      > fretboardSource.indexOf('!isTabMode && renderNotes.map'),
    "the barre delete control must render above the note layer instead of inside the behind-notes barre",
  );
  assert.match(editorSource, /useImperativeHandle/);
  assert.match(editorSource, /setDraft\(\(current\) => addChordFretboardNote/);
  assert.match(editorSource, /setDraft\(\(current\) => addChordFretboardBarre/);
  assert.match(editorSource, /setDraft\(\(current\) => removeChordFretboardBarre/);
});
