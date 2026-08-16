import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMiniChordCommandEdit,
  validateMiniChordEndingEdit,
  validateMiniChordMarkerEdit,
  validateMiniChordRepeatEdit,
} from "../src/mini-chord/notationValidation.js";

test("repeat end is blocked until a repeat start exists", () => {
  assert.equal(validateMiniChordRepeatEdit({ barIndex: 2, enabled: true, marks: {}, type: "end" }).valid, false);
  assert.equal(validateMiniChordRepeatEdit({ barIndex: 2, enabled: true, marks: { 0: { repeatStart: true } }, type: "end" }).valid, true);
});

test("repeat boundaries cannot be removed while their ending depends on them", () => {
  const marks = { 0: { repeatStart: true }, 2: { repeatEnd: true } };
  const endingRanges = [{ endingNumber: 1, startBar: 1, endBar: 1 }];
  assert.equal(validateMiniChordRepeatEdit({ barIndex: 2, enabled: false, endingRanges, marks, type: "end" }).valid, false);
});

test("endings require a repeat and stay sequential while allowing marker coexistence", () => {
  const marks = { 0: { repeatStart: true }, 1: { marker: "toCoda", markerIndex: 1 }, 2: { repeatEnd: true }, 3: { marker: "coda", markerIndex: 1 } };
  assert.equal(validateMiniChordEndingEdit({ barCount: 4, barIndex: 1, endingNumber: 1, marks }).valid, true);
  assert.equal(validateMiniChordEndingEdit({ barCount: 4, barIndex: 3, endingNumber: 2, marks, endingRanges: [] }).valid, false);
  assert.equal(validateMiniChordEndingEdit({ barCount: 4, barIndex: 3, endingNumber: 2, marks, endingRanges: [{ endingNumber: 1, startBar: 1, endBar: 2 }] }).valid, true);
});

test("navigation markers and commands require resolvable targets in score order", () => {
  assert.equal(validateMiniChordMarkerEdit({ barCount: 4, barIndex: 1, marker: "toCoda", marks: {} }).valid, false);
  const codaMarks = { 0: { marker: "segno", markerIndex: 1 }, 1: { marker: "toCoda", markerIndex: 1 }, 3: { marker: "coda", markerIndex: 1 } };
  assert.equal(validateMiniChordCommandEdit({ barCount: 4, barIndex: 2, command: "dsAlCoda", marks: codaMarks, targetIndex: 1 }).valid, true);
  assert.equal(validateMiniChordCommandEdit({ barCount: 4, barIndex: 2, command: "ds", marks: {}, targetIndex: 1 }).valid, false);
});

test("referenced targets cannot be removed before their command", () => {
  const marks = { 0: { marker: "segno", markerIndex: 1 }, 3: { command: "ds", targetIndex: 1 } };
  assert.equal(validateMiniChordMarkerEdit({ barCount: 4, barIndex: 0, marker: "", marks }).valid, false);
  const codaMarks = { 1: { marker: "toCoda", markerIndex: 1 }, 3: { marker: "coda", markerIndex: 1 } };
  assert.equal(validateMiniChordMarkerEdit({ barCount: 4, barIndex: 3, marker: "", marks: codaMarks }).valid, false);
});
