import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  NOTE_ACCIDENTAL_PREFERENCES,
  getNoteDisplayName,
  getNoteSolfegeDisplayName,
} from "../src/music/noteNotation.js";
import {
  ALL_FRETBOARD_NOTES,
  createFretboardNoteViewerStore,
} from "../src/fretboard/noteViewerStore.js";

test("fretboard note names can switch between sharp and flat spellings", () => {
  assert.equal(getNoteDisplayName("C#", NOTE_ACCIDENTAL_PREFERENCES.SHARP), "C#");
  assert.equal(getNoteDisplayName("C#", NOTE_ACCIDENTAL_PREFERENCES.FLAT), "Db");
  assert.equal(getNoteDisplayName("A#4", NOTE_ACCIDENTAL_PREFERENCES.FLAT), "Bb4");
  assert.equal(getNoteSolfegeDisplayName("F#", NOTE_ACCIDENTAL_PREFERENCES.SHARP), "파#");
  assert.equal(getNoteSolfegeDisplayName("F#", NOTE_ACCIDENTAL_PREFERENCES.FLAT), "솔b");
});

test("fretboard note viewer store updates without requiring App state", () => {
  const store = createFretboardNoteViewerStore();
  let updates = 0;
  const unsubscribe = store.subscribe(() => {
    updates += 1;
  });

  assert.deepEqual(store.getSnapshot(), {
    accidentalPreference: NOTE_ACCIDENTAL_PREFERENCES.SHARP,
    noteFilter: ALL_FRETBOARD_NOTES,
  });

  store.selectNote("D#");
  store.selectAccidental(NOTE_ACCIDENTAL_PREFERENCES.FLAT);
  assert.deepEqual(store.getSnapshot(), {
    accidentalPreference: NOTE_ACCIDENTAL_PREFERENCES.FLAT,
    noteFilter: "D#",
  });
  assert.equal(updates, 2);

  store.selectNote("not-a-note");
  assert.equal(store.getSnapshot().noteFilter, ALL_FRETBOARD_NOTES);
  unsubscribe();
});

test("note button updates stay inside the fretboard note viewer subtree", async () => {
  const [appSource, noteViewerSource] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/FretboardNoteViewer.jsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(appSource, /viewerNoteFilter|setViewerNoteFilter/);
  assert.match(appSource, /createFretboardNoteViewerStore/);
  assert.match(noteViewerSource, /useSyncExternalStore/);
});

test("mobile note and scale viewers use the rounded chord finish and a whole-surface accidental segment", async () => {
  const [noteViewerSource, polishCss] = await Promise.all([
    readFile(new URL("../src/components/FretboardNoteViewer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/polish.css", import.meta.url), "utf8"),
  ]);

  assert.match(noteViewerSource, />\s*#\s*<\/span>/);
  assert.match(noteViewerSource, />\s*♭\s*<\/span>/);
  assert.match(noteViewerSource, /현재 \$\{isFlat \? "플랫" : "샵"\} 표기/);
  assert.match(noteViewerSource, /isFlat \? NOTE_ACCIDENTAL_PREFERENCES\.SHARP : NOTE_ACCIDENTAL_PREFERENCES\.FLAT/);
  assert.match(polishCss, /Mobile fretboard viewer finish/);
  assert.match(polishCss, /scrollbar-gutter: stable;/);
  assert.match(polishCss, /\.fretboardViewerPanel\.fretboardViewerPanel[\s\S]*?\.viewerModeTabs\.viewerModeTabs \{[\s\S]*?gap: 4px !important;[\s\S]*?width: auto !important;[\s\S]*?height: 47px !important;[\s\S]*?margin: 0 3px 1px !important;[\s\S]*?padding: 3px !important;/);
  assert.match(polishCss, /\.viewerModeTabs\.viewerModeTabs[\s\S]*?> button \{[\s\S]*?height: 39px !important;[\s\S]*?font-weight: 900 !important;/);
  assert.match(polishCss, /:is\(\.viewerMapCard--note, \.viewerMapCard--scale\)\.viewerMapCard \{[\s\S]*?border-radius: 15px !important;/);
  assert.match(polishCss, /\.viewerFretboardGestureSurface \{[\s\S]*?overflow: hidden !important;[\s\S]*?border-radius: 13px !important;/);
  assert.match(polishCss, /\.viewerSelectGrid\.viewerSelectGrid \{[\s\S]*?gap: 5px !important;/);
  assert.match(polishCss, /\.viewerNoteAccidentalControls \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;[\s\S]*?width: 120px !important;[\s\S]*?touch-action: manipulation;/);
  assert.match(polishCss, /\.viewerNoteAccidentalControls\.is-flat \{[\s\S]*?--accidental-knob-shift: 100%;/);
  assert.match(polishCss, /\.viewerNoteAccidentalControls::before \{[\s\S]*?box-sizing: border-box;[\s\S]*?width: calc\(\(100% - 6px\) \/ 2\);[\s\S]*?transform: translate3d\(var\(--accidental-knob-shift\), 0, 0\);[\s\S]*?220ms cubic-bezier/);
  assert.match(polishCss, /\.viewerNoteAccidentalOption \{[\s\S]*?background: transparent !important;[\s\S]*?pointer-events: none;/);
});
