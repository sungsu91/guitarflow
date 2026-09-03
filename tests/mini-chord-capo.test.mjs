import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMiniChordCapo,
  clampMiniChordTranspose,
  getMiniChordBackingRootPitch,
  getMiniChordSourceKey,
  getMiniChordTransposedKey,
  normalizeMiniChordAccidentalPreference,
  transposeMiniChordLabel,
} from "../src/mini-chord/capo.js";

test("mini chord capo clamps to the supported fret range", () => {
  assert.equal(clampMiniChordCapo(-4), 0);
  assert.equal(clampMiniChordCapo(5), 5);
  assert.equal(clampMiniChordCapo(18), 12);
});

test("mini chord whole-song transposition supports an octave in both directions", () => {
  assert.equal(clampMiniChordTranspose(-18), -12);
  assert.equal(clampMiniChordTranspose(-3), -3);
  assert.equal(clampMiniChordTranspose(18), 12);
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

test("mini chord slash roots transpose with the chord without mutating the source", () => {
  const source = ["G/B", "C/E", "F6/9"];
  assert.deepEqual(
    source.map((label) => transposeMiniChordLabel(label, 1, "sharp")),
    ["G#/C", "C#/F", "F#6/9"],
  );
  assert.deepEqual(source, ["G/B", "C/E", "F6/9"]);
});

test("mini chord key names choose readable enharmonics automatically", () => {
  const sourceKey = getMiniChordSourceKey(["G", "D", "Em", "C"], "G Major");
  assert.equal(sourceKey.root, "G");
  assert.deepEqual(getMiniChordTransposedKey(sourceKey.label, 1), {
    accidentalPreference: "flat",
    label: "Ab Major",
    mode: "Major",
    pitchIndex: 8,
    root: "Ab",
  });
  assert.equal(getMiniChordTransposedKey("G Major", -1).label, "F# Major");
  assert.equal(getMiniChordTransposedKey("Gb Major", 0).label, "Gb Major");
  assert.equal(getMiniChordSourceKey(["Am", "F", "C", "G"]).label, "A minor");
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
