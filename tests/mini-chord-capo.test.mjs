import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMiniChordCapo,
  getMiniChordBackingRootPitch,
  normalizeMiniChordAccidentalPreference,
  transposeMiniChordLabel,
} from "../src/mini-chord/capo.js";

test("mini chord capo clamps to the supported fret range", () => {
  assert.equal(clampMiniChordCapo(-4), 0);
  assert.equal(clampMiniChordCapo(5), 5);
  assert.equal(clampMiniChordCapo(18), 12);
});

test("mini chord sounding labels transpose without changing quality or extension", () => {
  const source = ["C", "Am", "F", "G7"];
  assert.deepEqual(
    source.map((label) => transposeMiniChordLabel(label, 2, "sharp")),
    ["D", "Bm", "G", "A7"],
  );
  assert.deepEqual(source, ["C", "Am", "F", "G7"]);
});

test("mini chord sounding labels honor sharp and flat preferences", () => {
  assert.equal(transposeMiniChordLabel("C", 1, "sharp"), "C#");
  assert.equal(transposeMiniChordLabel("C", 1, "flat"), "Db");
  assert.equal(transposeMiniChordLabel("F#m7", 0, "flat"), "Gbm7");
  assert.equal(normalizeMiniChordAccidentalPreference("flat"), "flat");
  assert.equal(normalizeMiniChordAccidentalPreference("unknown"), "sharp");
});

test("mini chord rests and unknown labels are not transposed", () => {
  assert.equal(transposeMiniChordLabel("N.C.", 7, "flat"), "N.C.");
  assert.equal(transposeMiniChordLabel("-", 7, "sharp"), "-");
  assert.equal(transposeMiniChordLabel("???", 7, "sharp"), "???");
});

test("pitched backing parts keep accidental semitone offsets while drums remain independent", () => {
  assert.deepEqual(
    getMiniChordBackingRootPitch("C#"),
    {
      pitchClass: "C#",
      pitchIndex: 1,
      playbackRate: 2 ** (1 / 12),
      rootLetter: "C",
      sampleRoot: "c",
      semitoneOffset: 1,
    },
  );
  assert.equal(getMiniChordBackingRootPitch("Db").pitchClass, "C#");
  assert.equal(getMiniChordBackingRootPitch("D").playbackRate, 1);
});
