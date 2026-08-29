import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CHORD_TONE_INTERVALS,
  getChordToneDescriptors,
  getChordToneNames,
} from "../src/chords/chordTheory.js";

test("add9, dominant 9, and maj9 keep distinct chord-tone formulas", () => {
  assert.deepEqual(CHORD_TONE_INTERVALS.major.add9, [0, 4, 7, 14]);
  assert.deepEqual(CHORD_TONE_INTERVALS.major["9"], [0, 4, 7, 10, 14]);
  assert.deepEqual(CHORD_TONE_INTERVALS.major.maj9, [0, 4, 7, 11, 14]);

  assert.deepEqual(getChordToneNames("A", "major", "add9"), ["A", "C#", "E", "B"]);
  assert.deepEqual(getChordToneNames("A", "major", "9"), ["A", "C#", "E", "G", "B"]);
  assert.deepEqual(getChordToneNames("A", "major", "maj9"), ["A", "C#", "E", "G#", "B"]);
  assert.deepEqual(
    getChordToneDescriptors("A", "major", "9").map((tone) => tone.degreeOffset),
    [0, 2, 4, 6, 1],
  );
});

test("dominant 9 is available to every shared chord selection and persistence path", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const extensionOptions = appSource.slice(
    appSource.indexOf("const CHORD_EXTENSION_OPTIONS"),
    appSource.indexOf("function isChordExtensionAvailableForQuality"),
  );
  const shapeTemplates = appSource.slice(
    appSource.indexOf("const CHORD_SHAPE_TEMPLATES"),
    appSource.indexOf("const CHORD_BUILDER_POSITION_TEMPLATES"),
  );

  assert.match(extensionOptions, /\{ id: "add9", label: "add9", quality: \["major", "minor"\] \}[\s\S]*?\{ id: "9", label: "9", quality: "major" \}[\s\S]*?\{ id: "m9"/);
  assert.match(appSource, /suffix === "9"[\s\S]*?extension: "9"[\s\S]*?displayName: `\$\{root\}9`/);
  assert.match(appSource, /extension === "9"[\s\S]*?return `\$\{root\}9`/);
  assert.match(shapeTemplates, /"9": \[[\s\S]*?id: "e9"[\s\S]*?id: "a9"/);
  assert.match(appSource, /extension: stage3StorageSelectedChord\.extension/);
  assert.match(appSource, /CHORD_EXTENSION_OPTIONS\.some\(\(option\) => option\.id === entry\.extension\)/);
  assert.match(appSource, /stage3StorageAvailableExtensionOptions\.map/);
  assert.match(appSource, /availableChordExtensionOptions\.map/);
});
