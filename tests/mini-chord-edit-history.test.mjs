import assert from "node:assert/strict";
import test from "node:test";

import {
  createMiniChordEditHistory,
  recordMiniChordEdit,
  redoMiniChordEdit,
  undoMiniChordEdit,
} from "../src/mini-chord/editHistory.js";

test("new edits clear redo history and preserve sequential undo", () => {
  let history = createMiniChordEditHistory({ slots: ["C"] });
  history = recordMiniChordEdit(history, { slots: ["Am"] });
  history = recordMiniChordEdit(history, { slots: ["F"] });
  const undone = undoMiniChordEdit(history);
  assert.deepEqual(undone.snapshot, { slots: ["Am"] });
  const branched = recordMiniChordEdit(undone.history, { slots: ["G"] });
  assert.equal(branched.future.length, 0);
  assert.deepEqual(undoMiniChordEdit(branched).snapshot, { slots: ["Am"] });
});

test("redo restores the exact full edit snapshot", () => {
  const initial = { capo: 0, endingRanges: [], marks: {}, slots: ["C", "Am"] };
  const changed = { capo: 2, endingRanges: [{ endingNumber: 1, startBar: 2, endBar: 3 }], marks: { 0: { repeatStart: true } }, slots: ["F", "G"] };
  const history = recordMiniChordEdit(createMiniChordEditHistory(initial), changed);
  const undone = undoMiniChordEdit(history);
  const redone = redoMiniChordEdit(undone.history);
  assert.deepEqual(redone.snapshot, changed);
});

