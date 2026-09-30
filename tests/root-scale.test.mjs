import assert from "node:assert/strict";
import test from "node:test";
import { buildRootScalePositions, buildRootScaleRoute, rootScaleOctaves } from "../src/fretboard/rootScale.js";

const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const tuning = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
const scales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
};

test("C major connects the four requested root positions in order", () => {
  const segments = buildRootScaleRoute("C", scales.major);
  assert.deepEqual(segments.map(notes => [notes[0].stringNumber, notes[0].fretNumber,
    notes.at(-1).stringNumber, notes.at(-1).fretNumber]),
  [[5, 3, 3, 5], [3, 5, 1, 8], [6, 8, 4, 10], [4, 10, 2, 13]]);
  assert.deepEqual(segments[1][2], { stringNumber: 2, fretNumber: 5, pitch: "E4" });
});

test("every key and scale has four playable octave segments connected in pairs", () => {
  for (const root of names) for (const intervals of Object.values(scales)) {
    const segments = buildRootScaleRoute(root, intervals);
    assert.equal(segments.length, 4);
    assert.deepEqual(segments[0].at(-1), segments[1][0]);
    assert.deepEqual(segments[2].at(-1), segments[3][0]);
    assert.ok(segments[0][0].fretNumber <= segments[2][0].fretNumber);
    for (const notes of segments) {
      const start = tuning[notes[0].stringNumber] + notes[0].fretNumber;
      assert.equal(start % 12, names.indexOf(root));
      assert.deepEqual(notes.map(note => tuning[note.stringNumber] + note.fretNumber - start), [...intervals, 12]);
      assert.ok(notes.every(note => note.fretNumber >= 0 && note.fretNumber <= 18));
    }
  }
});

test("all 96 root scales have complete pitches, playable frets, and exact octave endpoints", () => {
  for (const root of names) for (const intervals of Object.values(scales)) for (const octaves of [1, 2]) {
    const notes = buildRootScalePositions(root, intervals, octaves);
    const pitches = notes.map(({ stringNumber, fretNumber }) => tuning[stringNumber] + fretNumber);
    assert.equal(notes.length, intervals.length * octaves + 1);
    assert.equal(pitches[0] % 12, names.indexOf(root));
    assert.equal(pitches.at(-1) - pitches[0], 12 * octaves);
    const expected = Array.from({ length: octaves }, (_, octave) => intervals.map(n => pitches[0] + octave * 12 + n)).flat();
    expected.push(pitches[0] + octaves * 12);
    assert.deepEqual(pitches, expected);
    assert.equal(new Set(notes.map(n => `${n.stringNumber}:${n.fretNumber}`)).size, notes.length);
    notes.forEach((note, index) => {
      assert.ok(note.fretNumber >= 0 && note.fretNumber <= 18);
      assert.equal(note.pitch, `${names[pitches[index] % 12]}${Math.floor(pitches[index] / 12) - 1}`);
    });
    const descending = [...pitches].reverse();
    assert.equal(descending[0] - descending.at(-1), 12 * octaves);
  }
});

test("G major follows the supplied three-string pattern and corrects the B string", () => {
  const notes = buildRootScalePositions("G", scales.major, 2);
  assert.deepEqual(notes.slice(0, 8).map(n => [n.stringNumber, n.fretNumber]),
    [[6, 3], [6, 5], [5, 2], [5, 3], [5, 5], [4, 2], [4, 4], [4, 5]]);
  assert.deepEqual(notes.slice(-3).map(n => [n.stringNumber, n.fretNumber, n.pitch]),
    [[2, 5, "E4"], [2, 7, "F#4"], [2, 8, "G4"]]);
});

test("low E and F minor use a playable fifth-string root instead of negative frets", () => {
  for (const root of ["E", "F"]) {
    assert.equal(buildRootScalePositions(root, scales.minor, 2)[0].stringNumber, 5);
  }
});

test("root selectors stay distinct from the five existing boxes", () => {
  assert.equal(rootScaleOctaves("root-1"), 1);
  assert.equal(rootScaleOctaves("root-2"), 2);
  for (const value of [1, 2, 3, 4, 5, "1", "box-set", undefined]) assert.equal(rootScaleOctaves(value), 0);
});
