import assert from "node:assert/strict";
import test from "node:test";
import {
  METRONOME_SUBDIVISION_OPTIONS,
  getMetronomeSubdivisionOption,
  getMetronomeSubdivisionTickMs,
} from "../src/metronome/subdivision.js";

test("metronome exposes quarter, eighth, triplet, sixteenth, and sextuplet subdivisions", () => {
  assert.deepEqual(
    METRONOME_SUBDIVISION_OPTIONS.map(({ id, label, clicksPerBeat }) => ({ id, label, clicksPerBeat })),
    [
      { id: "quarter", label: "♩", clicksPerBeat: 1 },
      { id: "eighth", label: "♪♪", clicksPerBeat: 2 },
      { id: "eighth-triplet", label: "8분 셋잇단음표", clicksPerBeat: 3 },
      { id: "sixteenth", label: "♬♬", clicksPerBeat: 4 },
      { id: "sixteenth-triplet", label: "16분 셋잇단음표", clicksPerBeat: 6 },
    ],
  );
});

test("subdivision timing divides each beat from the absolute BPM duration", () => {
  for (const bpm of [30, 80, 120, 240]) {
    const beatMs = 60000 / bpm;
    for (const subdivision of METRONOME_SUBDIVISION_OPTIONS) {
      const tickMs = getMetronomeSubdivisionTickMs(bpm, subdivision);
      assert.ok(Math.abs((tickMs * subdivision.clicksPerBeat) - beatMs) < 1e-9);
      assert.ok(Math.abs((tickMs * subdivision.clicksPerBeat * 1000) - (beatMs * 1000)) < 1e-6);
    }
  }
});

test("unknown subdivision ids retain the quarter-note fallback", () => {
  assert.equal(getMetronomeSubdivisionOption("missing").id, "quarter");
});
